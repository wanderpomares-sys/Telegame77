/**
 * render3d.js — Camada visual 3D (Three.js) do Tele Game Vintage.
 *
 * A física e as regras continuam 100% no script.js (2D, em "pixels de jogo").
 * Este módulo só LÊ o estado (raquetes, bola, barreira) e desenha uma arena 3D
 * por cima do canvas 2D. O canvas 2D continua existindo (invisível) porque
 * ele recebe o toque/arraste do jogador.
 *
 * Se o aparelho não suportar WebGL (ou o jogador escolher "Clássico 2D"),
 * o módulo fica inativo e o jogo desenha em 2D como sempre.
 *
 * Qualidades: 'alto' (materiais PBR, reflexos, partículas), 'leve'
 * (materiais simples, resolução menor) e 'classico' (2D). No modo 'auto'
 * o módulo mede o FPS e baixa de 'alto' para 'leve' sozinho se precisar.
 */
const Game3D = (function () {
  'use strict';

  const PREF_KEY = 'telegamevintage-gfx';
  const S = 0.1; // 1 pixel de jogo = 0,1 unidade 3D

  // Cores padrão da Loja (se o jogador não trocou nada, usamos a paleta 3D de cada modo)
  const DEFAULTS = { ball: '#c8e6c0', paddle: '#c8e6c0', bg: '#0c0e0a', frame: '#222222' };

  // Paleta de cada modo
  const PALETTE = {
    paredao:  { p1: '#35e0ff', p2: '#ff5c8a', ball: '#ffd23f', rim1: '#35c8ff', rim2: '#ff4fa3', fog: '#0a0f2e', sky: '#141a52' },
    tenis:    { p1: '#ffffff', p2: '#ffe14a', ball: '#d9ff3a', rim1: '#7fd0ff', rim2: '#ffe9a0', fog: '#0b1a33', sky: '#163a6e' },
    futebol:  { p1: '#ff5252', p2: '#3d8bff', ball: '#ffffff', rim1: '#fff2c4', rim2: '#9be7ff', fog: '#07170f', sky: '#0f3a22' },
    barreira: { p1: '#35e0ff', p2: '#ff5c8a', ball: '#7dffb0', rim1: '#ff3fb4', rim2: '#35e0ff', fog: '#0a0612', sky: '#1d0f33' },
  };

  let pref = 'auto';        // 'auto' | 'alto' | 'leve' | 'classico'
  let quality = 'alto';     // qualidade efetiva em uso: 'alto' | 'leve'
  let active = false;       // 3D ligado e funcionando
  let failed = false;       // WebGL indisponível

  let renderer = null, scene = null, camera = null;
  let glCanvas = null, frameEl = null, baseCanvas = null;
  let arena = null;         // grupo do cenário do modo atual
  let currentMode = null;
  let envTex = null;

  // objetos dinâmicos
  let p1Mesh = null, p2Mesh = null, ballMesh = null, ballLight = null;
  let ballShadow = null, ballGlow = null, p1Shadow = null, p2Shadow = null;
  let trailPts = null, partPts = null, rings = [], barrierTop = null, barrierBot = null, wallBlock = null;
  let fillLights = [];
  let lastPaddleH = -1;
  let scoreCtx = null, scoreTex = null, lastS1 = -1, lastS2 = -1;

  // câmera
  let camBase = null, camTarget = null; // criados em create() (THREE pode não existir)
  let shake = 0, introT = 0, kick = 0;
  let lastNow = 0, lastRender = 0, lastState = null, idleHandle = 0;

  // medição de FPS (para o modo auto)
  let fpsAcc = 0, fpsN = 0, fpsWarm = 0;

  // temas
  let theme = { ball: DEFAULTS.ball, paddle: DEFAULTS.paddle, bg: DEFAULTS.bg, frame: DEFAULTS.frame, pattern: 'lisa' };

  // partículas
  const MAX_P = 160;
  const pPos = new Float32Array(MAX_P * 3), pCol = new Float32Array(MAX_P * 3);
  const pVel = new Float32Array(MAX_P * 3), pLife = new Float32Array(MAX_P), pBase = new Float32Array(MAX_P * 3);
  let pCount = 0;
  const TRAIL_N = 16;
  const tPos = new Float32Array(TRAIL_N * 3), tCol = new Float32Array(TRAIL_N * 3);

  // ---------------------------------------------------------------- utilidades
  function C(hex) { return new THREE.Color(hex); }
  function mix(a, b, t) { return C(a).lerp(C(b), t); }
  function isDefault(v, d) { return String(v || '').toLowerCase() === String(d).toLowerCase(); }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(canvas, repeatX, repeatY) {
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = quality === 'alto' ? 4 : 1;
    if (repeatX) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY || repeatX); }
    return t;
  }
  function mat(opts) {
    if (quality === 'alto') {
      return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.45, metalness: 0.15, envMap: envTex, envMapIntensity: 0.7 }, opts));
    }
    const o = Object.assign({}, opts); delete o.roughness; delete o.metalness; delete o.envMapIntensity;
    return new THREE.MeshLambertMaterial(o);
  }
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }

  let softSprite = null;
  function getSoftSprite() {
    if (softSprite) return softSprite;
    const c = mk(64, 64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    softSprite = new THREE.CanvasTexture(c);
    return softSprite;
  }
  let blobTex = null;
  function getBlob() {
    if (blobTex) return blobTex;
    const c = mk(64, 64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
    return blobTex;
  }

  // ------------------------------------------------------ ambiente (reflexos)
  function makeEnv() {
    if (quality !== 'alto') return null;
    try {
      const pm = new THREE.PMREMGenerator(renderer);
      const es = new THREE.Scene();
      es.background = C('#1b2650');
      const panel = (x, y, z, w, h, col) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
      };
      panel(0, 9, 0, 14, 14, '#ffffff');
      panel(-9, 3, 4, 6, 6, '#6fd3ff');
      panel(9, 3, -4, 6, 6, '#ff7ab8');
      panel(0, 2, -10, 12, 5, '#b9c7ff');
      const rt = pm.fromScene(es, 0.04);
      pm.dispose();
      return rt.texture;
    } catch (e) { return null; }
  }

  // ----------------------------------------------------------- texturas
  function patternOverlay(g, w, h, kind, k) {
    g.save();
    g.globalAlpha = 0.07;
    g.strokeStyle = '#fff'; g.fillStyle = '#fff';
    if (kind === 'grade') {
      g.lineWidth = 1;
      for (let x = 0; x <= w; x += 20 * k) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 20 * k) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    } else if (kind === 'pontos') {
      for (let x = 10 * k; x < w; x += 20 * k) for (let y = 10 * k; y < h; y += 20 * k) { g.beginPath(); g.arc(x, y, 1.6 * k, 0, 7); g.fill(); }
    } else if (kind === 'diagonais') {
      g.lineWidth = 1;
      for (let d = -h; d < w; d += 18 * k) { g.beginPath(); g.moveTo(d, h); g.lineTo(d + h, 0); g.stroke(); }
    }
    g.restore();
  }
  function noise(g, w, h, amt) {
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amt;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }

  function makeFloorTexture(mode, W, H) {
    const w = quality === 'alto' ? 1024 : 640, h = Math.round(w * H / W), k = w / W;
    const c = mk(w, h), g = c.getContext('2d');
    const line = (x1, y1, x2, y2, col, lw, dash) => {
      g.strokeStyle = col; g.lineWidth = lw * k; g.setLineDash(dash ? dash.map((d) => d * k) : []);
      g.beginPath(); g.moveTo(x1 * k, y1 * k); g.lineTo(x2 * k, y2 * k); g.stroke(); g.setLineDash([]);
    };
    const rect = (x, y, rw, rh, col, lw) => { g.strokeStyle = col; g.lineWidth = lw * k; g.strokeRect(x * k, y * k, rw * k, rh * k); };

    if (mode === 'paredao') {
      const gr = g.createRadialGradient(w * 0.55, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.7);
      gr.addColorStop(0, '#2c3a9a'); gr.addColorStop(1, '#12184a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // faixa de perigo (lado do jogador)
      const dz = g.createLinearGradient(0, 0, 60 * k, 0);
      dz.addColorStop(0, 'rgba(255,60,90,0.55)'); dz.addColorStop(1, 'rgba(255,60,90,0)');
      g.fillStyle = dz; g.fillRect(0, 0, 60 * k, h);
      g.strokeStyle = 'rgba(80,220,255,0.28)'; g.lineWidth = 1.2 * k;
      for (let x = 0; x <= W; x += 25) { g.beginPath(); g.moveTo(x * k, 0); g.lineTo(x * k, h); g.stroke(); }
      for (let y = 0; y <= H; y += 25) { g.beginPath(); g.moveTo(0, y * k); g.lineTo(w, y * k); g.stroke(); }
      line(W / 2, 0, W / 2, H, 'rgba(255,255,255,0.35)', 2, [8, 8]);
      rect(4, 4, W - 8, H - 8, 'rgba(120,235,255,0.7)', 2);
    } else if (mode === 'tenis') {
      g.fillStyle = '#2b78d6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1f62b8';
      g.fillRect(0, 0, w, 14 * k); g.fillRect(0, h - 14 * k, w, 14 * k);
      g.fillRect(0, 0, 14 * k, h); g.fillRect(w - 14 * k, 0, 14 * k, h);
      const wl = '#f4f8ff';
      rect(14, 14, W - 28, H - 28, wl, 2.4);
      line(14, 38, W - 14, 38, wl, 2); line(14, H - 38, W - 14, H - 38, wl, 2);
      line(W / 2 - 78, 38, W / 2 - 78, H - 38, wl, 2); line(W / 2 + 78, 38, W / 2 + 78, H - 38, wl, 2);
      line(W / 2 - 78, H / 2, W / 2 + 78, H / 2, wl, 2);
      line(W / 2, 14, W / 2, H - 14, wl, 2.4);
    } else if (mode === 'futebol') {
      for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#2f9a44' : '#38ad4f'; g.fillRect(i * w / 10, 0, w / 10 + 1, h); }
      const wl = 'rgba(255,255,255,0.92)';
      rect(8, 8, W - 16, H - 16, wl, 2.2);
      line(W / 2, 8, W / 2, H - 8, wl, 2.2);
      g.strokeStyle = wl; g.lineWidth = 2.2 * k;
      g.beginPath(); g.arc(W / 2 * k, H / 2 * k, 36 * k, 0, 7); g.stroke();
      g.fillStyle = wl; g.beginPath(); g.arc(W / 2 * k, H / 2 * k, 2.6 * k, 0, 7); g.fill();
      rect(8, H / 2 - 62, 58, 124, wl, 2.2); rect(W - 66, H / 2 - 62, 58, 124, wl, 2.2);
      rect(8, H / 2 - 32, 26, 64, wl, 2.2); rect(W - 34, H / 2 - 32, 26, 64, wl, 2.2);
    } else { // barreira
      g.fillStyle = '#121a2c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1 * k;
      for (let x = -H; x < W; x += 14) { g.beginPath(); g.moveTo(x * k, H * k); g.lineTo((x + H) * k, 0); g.stroke(); }
      g.strokeStyle = 'rgba(255,63,180,0.6)'; g.lineWidth = 2.2 * k;
      g.strokeRect(4 * k, 4 * k, (W - 8) * k, (H - 8) * k);
      for (let i = 0; i < 4; i++) { // setas de direção
        const ax = (60 + i * 18) * k, ay = H / 2 * k; g.strokeStyle = 'rgba(53,224,255,' + (0.15 + i * 0.12) + ')'; g.lineWidth = 3 * k;
        g.beginPath(); g.moveTo(ax, ay - 12 * k); g.lineTo(ax + 10 * k, ay); g.lineTo(ax, ay + 12 * k); g.stroke();
        const bx = (W - 60 - i * 18) * k; g.beginPath(); g.moveTo(bx, ay - 12 * k); g.lineTo(bx - 10 * k, ay); g.lineTo(bx, ay + 12 * k); g.stroke();
      }
      line(W / 2, 0, W / 2, H, 'rgba(255,214,64,0.25)', 2, [10, 8]);
    }
    patternOverlay(g, w, h, theme.pattern, k);
    if (quality === 'alto') noise(g, w, h, 9);
    return tex(c);
  }

  function makeBrickTexture() {
    const c = mk(256, 128), g = c.getContext('2d');
    g.fillStyle = '#7a2e2a'; g.fillRect(0, 0, 256, 128);
    for (let r = 0; r < 8; r++) {
      const off = r % 2 ? 16 : 0;
      for (let x = -32; x < 288; x += 32) {
        const l = 38 + Math.random() * 14;
        g.fillStyle = 'hsl(10,55%,' + l + '%)';
        g.fillRect(x + off + 1, r * 16 + 1, 30, 14);
      }
    }
    return tex(c, 8, 1);
  }
  function makeHazardTexture() {
    const c = mk(128, 128), g = c.getContext('2d');
    g.fillStyle = '#ffcf2e'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#171a22';
    for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 32, 128); g.lineTo(i * 32 + 16, 128); g.lineTo(i * 32 + 16 + 128, 0); g.lineTo(i * 32 + 128, 0); g.fill(); }
    return tex(c, 1, 1);
  }
  function makeNetTexture(col) {
    const c = mk(128, 64), g = c.getContext('2d');
    g.clearRect(0, 0, 128, 64);
    g.strokeStyle = col; g.lineWidth = 2;
    for (let x = 0; x <= 128; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    for (let y = 0; y <= 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function makeBokehTexture(sky) {
    const c = mk(1024, 256), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#05060f'); gr.addColorStop(0.55, sky); gr.addColorStop(1, '#0a0d24');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
    const cols = ['#7fd7ff', '#ff7ab8', '#ffe27a', '#9bff9b', '#c6a8ff', '#ffffff'];
    for (let i = 0; i < 160; i++) {
      const x = Math.random() * 1024, y = 90 + Math.random() * 150, r = 3 + Math.random() * 9;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      const col = cols[(Math.random() * cols.length) | 0];
      rg.addColorStop(0, col); rg.addColorStop(0.4, col + 'aa'); rg.addColorStop(1, col + '00');
      g.globalAlpha = 0.35 + Math.random() * 0.5; g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    return tex(c);
  }
  function makeBallTexture(mode) {
    const c = mk(256, 128), g = c.getContext('2d');
    if (mode === 'futebol') {
      g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#161616';
      const spots = [[32, 32], [96, 70], [160, 30], [224, 70], [128, 108], [0, 90], [256, 90], [64, 120], [192, 120]];
      spots.forEach(([x, y]) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.5708; g.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); } g.closePath(); g.fill(); });
    } else if (mode === 'tenis') {
      g.fillStyle = '#d9ff3a'; g.fillRect(0, 0, 256, 128);
      g.strokeStyle = '#ffffff'; g.lineWidth = 6;
      g.beginPath(); g.arc(64, 64, 52, -1, 1); g.stroke(); g.beginPath(); g.arc(192, 64, 52, 2.14, 4.14); g.stroke();
    } else {
      g.fillStyle = (PALETTE[mode] || PALETTE.paredao).ball; g.fillRect(0, 0, 256, 128);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 56, 256, 16);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 20, 256, 6);
    }
    return tex(c);
  }

  // ----------------------------------------------------------- construção
  function lightRig(pal) {
    fillLights.forEach((l) => scene.remove(l));
    fillLights = [];
    const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x1a2036, quality === 'alto' ? 0.75 : 0.95);
    const key = new THREE.DirectionalLight(0xffffff, quality === 'alto' ? 0.7 : 0.55);
    key.position.set(-8, 26, 12);
    const r1 = new THREE.PointLight(C(pal.rim1), 1.1, 60, 2); r1.position.set(-24, 7, -9);
    const r2 = new THREE.PointLight(C(pal.rim2), 1.1, 60, 2); r2.position.set(24, 7, -9);
    fillLights.push(hemi, key);
    if (quality === 'alto') fillLights.push(r1, r2);
    fillLights.forEach((l) => scene.add(l));
  }

  function buildArena(mode, W, H) {
    if (arena) { scene.remove(arena); disposeGroup(arena); }
    arena = new THREE.Group();
    scene.add(arena);
    currentMode = mode;
    const pal = PALETTE[mode] || PALETTE.paredao;
    const cw = W * S, ch = H * S; // 40 x 30
    scene.fog = new THREE.Fog(C(pal.fog), 40, 95);
    scene.background = C(pal.fog);
    lightRig(pal);

    // base da arena (plataforma) e quadra
    const base = new THREE.Mesh(new THREE.BoxGeometry(cw + 6, 1.2, ch + 6), mat({ color: mix('#070a16', pal.sky, 0.18), roughness: 0.7, metalness: 0.2, envMapIntensity: 0.15 }));
    base.position.y = -0.62; arena.add(base);

    const floorMat = mat({ map: makeFloorTexture(mode, W, H), roughness: mode === 'futebol' ? 0.9 : 0.4, metalness: mode === 'futebol' ? 0 : 0.1, envMapIntensity: 0.3 });
    if (!isDefault(theme.bg, DEFAULTS.bg)) floorMat.color = C('#ffffff').lerp(C(theme.bg), 0.4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), floorMat);
    floor.rotation.x = -Math.PI / 2; arena.add(floor);

    const under = new THREE.Mesh(new THREE.PlaneGeometry(cw + 30, ch + 24), new THREE.MeshBasicMaterial({ map: getSoftSprite(), color: C(pal.rim1), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    under.rotation.x = -Math.PI / 2; under.position.y = -0.7; arena.add(under);

    // bordas (trilhos) superior e inferior
    const frameCol = isDefault(theme.frame, DEFAULTS.frame) ? mix('#2b3558', pal.rim1, 0.22) : C(theme.frame);
    const railMat = mat({ color: frameCol, roughness: 0.3, metalness: 0.55 });
    const glowMat = new THREE.MeshBasicMaterial({ color: C(pal.rim1) });
    [-1, 1].forEach((sgn) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(cw + 3.2, 0.9, 1.1), railMat);
      rail.position.set(0, 0.45, sgn * (ch / 2 + 0.55)); arena.add(rail);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(cw + 3.2, 0.12, 0.2), glowMat);
      strip.position.set(0, 0.93, sgn * (ch / 2 + 0.55)); arena.add(strip);
    });
    // postes de luz nos cantos
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 2.2, 12), railMat);
      post.position.set(sx * (cw / 2 + 1.1), 1.1, sz * (ch / 2 + 0.55)); arena.add(post);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshBasicMaterial({ color: C(sx < 0 ? pal.rim1 : pal.rim2) }));
      orb.position.set(post.position.x, 2.35, post.position.z); arena.add(orb);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: getSoftSprite(), color: C(sx < 0 ? pal.rim1 : pal.rim2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
      halo.scale.set(3.2, 3.2, 1); halo.position.copy(orb.position); arena.add(halo);
    });

    // fundo: arquibancada de luzes (bokeh)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), new THREE.MeshBasicMaterial({ map: makeBokehTexture(pal.sky), fog: false }));
    back.position.set(0, 9, -34); arena.add(back);
    const back2 = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), new THREE.MeshBasicMaterial({ map: back.material.map, fog: false }));
    back2.position.set(-50, 9, -8); back2.rotation.y = Math.PI / 2.6; arena.add(back2);
    const back3 = back2.clone(); back3.position.x = 50; back3.rotation.y = -Math.PI / 2.6; arena.add(back3);

    // placar holográfico (atrás da quadra)
    const sc = mk(512, 192); scoreCtx = sc.getContext('2d'); scoreTex = new THREE.CanvasTexture(sc);
    scoreTex.encoding = THREE.sRGBEncoding; lastS1 = lastS2 = -1;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(17, 6.4), new THREE.MeshBasicMaterial({ map: scoreTex, transparent: true, depthWrite: false, fog: false }));
    board.position.set(0, 6.6, -ch / 2 - 6); board.rotation.x = -0.28; arena.add(board);

    // ----- elementos específicos
    wallBlock = barrierTop = barrierBot = null;
    if (mode === 'paredao') {
      const brick = makeBrickTexture();
      const wm = mat({ map: brick, roughness: 0.8, metalness: 0 });
      wallBlock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, ch + 2.2), wm);
      wallBlock.position.set(cw / 2 + 0.8, 1.2, 0); arena.add(wallBlock);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, ch + 2.4), new THREE.MeshBasicMaterial({ color: C('#ffd23f') }));
      cap.position.set(cw / 2 + 0.1, 2.45, 0); arena.add(cap);
      const dz = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, ch), new THREE.MeshBasicMaterial({ color: C('#ff3c5a') }));
      dz.position.set(-cw / 2 - 0.15, 0.06, 0); arena.add(dz);
    } else if (mode === 'tenis') {
      const netMat = new THREE.MeshBasicMaterial({ map: makeNetTexture('#ffffff'), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
      netMat.map.repeat.set(ch / 1.0, 1);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(ch + 1, 1.15), netMat);
      net.rotation.y = Math.PI / 2; net.position.set(0, 0.58, 0); arena.add(net);
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, ch + 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      tape.position.set(0, 1.18, 0); arena.add(tape);
      [-1, 1].forEach((sg) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 10), railMat);
        pole.position.set(0, 0.65, sg * (ch / 2 + 0.55)); arena.add(pole);
      });
    } else if (mode === 'futebol') {
      const goalHalf = (lastState ? lastState.goalHalf : 45) * S;
      const postMat = mat({ color: 0xffffff, roughness: 0.25, metalness: 0.4 });
      [-1, 1].forEach((side) => {
        const x = side * (cw / 2);
        // traves
        [-1, 1].forEach((sg) => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.9, 12), postMat);
          post.position.set(x, 0.95, sg * goalHalf); arena.add(post);
        });
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, goalHalf * 2, 12), postMat);
        bar.rotation.x = Math.PI / 2; bar.position.set(x, 1.9, 0); arena.add(bar);
        // rede (fundo e laterais)
        const netM = new THREE.MeshBasicMaterial({ map: makeNetTexture('#ffffff'), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
        netM.map.repeat.set(goalHalf * 2 / 0.9, 2);
        const back = new THREE.Mesh(new THREE.PlaneGeometry(goalHalf * 2, 1.9), netM);
        back.rotation.y = Math.PI / 2; back.position.set(x + side * 2.4, 0.95, 0); arena.add(back);
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(2.4, goalHalf * 2), netM);
        roof.rotation.x = -Math.PI / 2; roof.position.set(x + side * 1.2, 1.9, 0); arena.add(roof);
        [-1, 1].forEach((sg) => {
          const sd = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.9), netM);
          sd.position.set(x + side * 1.2, 0.95, sg * goalHalf); arena.add(sd);
        });
        // muretas do fundo ao lado do gol (onde a bola bate "na trave")
        [-1, 1].forEach((sg) => {
          const len = ch / 2 - goalHalf;
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, len), railMat);
          wall.position.set(x + side * 0.35, 0.55, sg * (goalHalf + len / 2)); arena.add(wall);
        });
      });
    } else if (mode === 'barreira') {
      const hz = makeHazardTexture();
      const bm = mat({ map: hz, roughness: 0.5, metalness: 0.2, emissive: C('#2a1f00'), emissiveIntensity: 0.6 });
      barrierTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 1), bm);
      barrierBot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 1), bm);
      arena.add(barrierTop, barrierBot);
      const capM = new THREE.MeshBasicMaterial({ color: C('#ff3fb4') });
      barrierTop.userData.cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1), capM);
      barrierBot.userData.cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1), capM);
      arena.add(barrierTop.userData.cap, barrierBot.userData.cap);
    }
    introT = 0;
  }

  function buildActors() {
    // raquetes
    [p1Mesh, p2Mesh, ballMesh, ballShadow, ballGlow, p1Shadow, p2Shadow, trailPts, partPts].forEach((o) => { if (o) { scene.remove(o); disposeGroup(o); } });
    rings.forEach((r) => { scene.remove(r); disposeGroup(r); });
    rings = [];
    lastPaddleH = -1;

    const pal = PALETTE[currentMode] || PALETTE.paredao;
    const pc1 = isDefault(theme.paddle, DEFAULTS.paddle) ? pal.p1 : theme.paddle;
    const pc2 = isDefault(theme.paddle, DEFAULTS.paddle) ? pal.p2 : theme.paddle;
    const mk3 = (col) => new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2, 6, 14), mat({ color: C(col), emissive: C(col), emissiveIntensity: 0.28, roughness: 0.28, metalness: 0.5 }));
    p1Mesh = mk3(pc1); p2Mesh = mk3(pc2);
    [p1Mesh, p2Mesh].forEach((m) => { m.rotation.x = Math.PI / 2; m.scale.set(1, 1, 1); scene.add(m); });

    // bola
    const bc = isDefault(theme.ball, DEFAULTS.ball) ? pal.ball : theme.ball;
    const useTex = isDefault(theme.ball, DEFAULTS.ball);
    const segs = quality === 'alto' ? [32, 22] : [16, 12];
    ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, segs[0], segs[1]),
      mat({ color: useTex ? 0xffffff : C(bc), map: useTex ? makeBallTexture(currentMode) : null, emissive: C(bc), emissiveIntensity: useTex ? 0.18 : 0.5, roughness: 0.22, metalness: 0.1 })
    );
    scene.add(ballMesh);
    if (!ballLight) { ballLight = new THREE.PointLight(0xffffff, 1.2, 16, 2); scene.add(ballLight); }
    ballLight.color = C(bc);

    // sombras e brilhos no chão
    const sh = () => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: getBlob(), transparent: true, depthWrite: false, fog: false }));
    ballShadow = sh(); p1Shadow = sh(); p2Shadow = sh();
    [ballShadow, p1Shadow, p2Shadow].forEach((m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.03; scene.add(m); });
    ballGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: getSoftSprite(), color: C(bc), transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    ballGlow.rotation.x = -Math.PI / 2; ballGlow.position.y = 0.05; ballGlow.scale.set(4.4, 4.4, 1); scene.add(ballGlow);

    // rastro
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    trailPts = new THREE.Points(tg, new THREE.PointsMaterial({ size: 1.15, map: getSoftSprite(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    trailPts.frustumCulled = false; trailPts.userData.color = C(bc); scene.add(trailPts);

    // partículas
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    partPts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.55, map: getSoftSprite(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    partPts.frustumCulled = false; scene.add(partPts);
    pCount = 0;

    // anéis de impacto
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 36), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      r.rotation.x = -Math.PI / 2; r.position.y = 0.06; r.userData.t = 1; r.visible = false; scene.add(r); rings.push(r);
    }
  }

  // ------------------------------------------------------------- eventos
  function spawnParticles(x, z, y, count, color, power) {
    const col = C(color || '#ffffff');
    const max = quality === 'alto' ? MAX_P : 70;
    for (let i = 0; i < count && pCount < max; i++) {
      const j = pCount++;
      const a = Math.random() * 6.2832, sp = (0.4 + Math.random() * 0.9) * power;
      pPos[j * 3] = x; pPos[j * 3 + 1] = y; pPos[j * 3 + 2] = z;
      pVel[j * 3] = Math.cos(a) * sp; pVel[j * 3 + 1] = (0.5 + Math.random() * 1.2) * power; pVel[j * 3 + 2] = Math.sin(a) * sp;
      pLife[j] = 0.7 + Math.random() * 0.5;
      pBase[j * 3] = col.r; pBase[j * 3 + 1] = col.g; pBase[j * 3 + 2] = col.b;
    }
  }
  function ring(x, z, color, size) {
    const r = rings.find((q) => q.userData.t >= 1);
    if (!r) return;
    r.position.x = x; r.position.z = z; r.material.color = C(color || '#ffffff');
    r.userData.t = 0; r.userData.size = size; r.visible = true;
  }

  function burst(px, py, count, color) {
    if (!active) return;
    const x = (px - 200) * S, z = (py - 150) * S;
    const pal = PALETTE[currentMode] || PALETTE.paredao;
    const col = color || (isDefault(theme.ball, DEFAULTS.ball) ? pal.ball : theme.ball);
    spawnParticles(x, z, 0.8, Math.max(4, count * 3), col, 1.0);
    ring(x, z, col, 1 + count * 0.25);
    kick = Math.min(1, kick + 0.18 + count * 0.02);
  }
  function goal(scorer, px, py) {
    if (!active) return;
    const x = (px - 200) * S, z = (py - 150) * S;
    const pal = PALETTE[currentMode] || PALETTE.paredao;
    const col = scorer === 'p1' ? pal.p1 : pal.p2;
    spawnParticles(x, z, 1.0, 46, col, 2.2);
    spawnParticles(x, z, 1.0, 24, '#ffffff', 1.6);
    ring(x, z, col, 6);
    shake = 1;
  }

  // --------------------------------------------------------- placar 3D
  function drawScore(s1, s2) {
    if (!scoreCtx) return;
    const g = scoreCtx, w = 512, h = 192;
    const pal = PALETTE[currentMode] || PALETTE.paredao;
    g.clearRect(0, 0, w, h);
    const rr = (x, y, ww, hh, rad) => { g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + ww, y, x + ww, y + hh, rad); g.arcTo(x + ww, y + hh, x, y + hh, rad); g.arcTo(x, y + hh, x, y, rad); g.arcTo(x, y, x + ww, y, rad); g.closePath(); };
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(8,14,40,0.88)'); bg.addColorStop(1, 'rgba(2,5,18,0.92)');
    rr(10, 10, w - 20, h - 20, 26); g.fillStyle = bg; g.fill();
    g.lineWidth = 4; g.strokeStyle = 'rgba(255,201,77,0.9)'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 26px "Segoe UI", Roboto, sans-serif';
    g.fillStyle = pal.p1; g.fillText('VOCÊ', 128, 40);
    g.fillStyle = pal.p2; g.fillText('CPU', 384, 40);
    g.font = '900 100px "Segoe UI", Roboto, sans-serif';
    g.shadowBlur = 22;
    g.shadowColor = pal.p1; g.fillStyle = '#ffffff'; g.fillText(String(s1).padStart(2, '0'), 128, 112);
    g.shadowColor = pal.p2; g.fillText(String(s2).padStart(2, '0'), 384, 112);
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '900 70px "Segoe UI", Roboto, sans-serif'; g.fillText(':', 256, 108);
    if (scoreTex) scoreTex.needsUpdate = true;
  }

  // -------------------------------------------------------------- render
  function sizeTarget() {
    if (showcaseOn && consoleBody) return { w: consoleBody.clientWidth, h: consoleBody.clientHeight };
    return { w: baseCanvas.clientWidth, h: baseCanvas.clientHeight };
  }
  function resize() {
    if (!renderer || !baseCanvas || !frameEl) return;
    const sz = sizeTarget(), w = sz.w, h = sz.h;
    if (!w || !h) return;
    glCanvas.style.left = (showcaseOn ? 0 : baseCanvas.offsetLeft) + 'px';
    glCanvas.style.top = (showcaseOn ? 0 : baseCanvas.offsetTop) + 'px';
    glCanvas.style.width = w + 'px';
    glCanvas.style.height = h + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, quality === 'alto' ? 2 : 1.25);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function render(state) {
    if (!active) return;
    lastState = state;
    if (showcaseOn) { if (menuVisible()) return; exitShowcase(); }
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastNow || now)) / 1000));
    lastNow = now; lastRender = now;

    if (state.mode !== currentMode || !arena) {
      buildArena(state.mode, state.W, state.H);
      buildActors();
    }
    drawFrame(state, dt);
    adaptQuality(dt);
  }

  function drawFrame(st, dt) {
    const W = st.W, H = st.H;
    const bx = (st.ball.x - W / 2) * S, bz = (st.ball.y - H / 2) * S;
    if (st.s1 !== lastS1 || st.s2 !== lastS2) { lastS1 = st.s1; lastS2 = st.s2; drawScore(st.s1 || 0, st.s2 || 0); }

    // raquetes
    const ph = st.paddleH * S;
    if (ph !== lastPaddleH) {
      lastPaddleH = ph;
      [p1Mesh, p2Mesh].forEach((m) => { m.geometry.dispose(); m.geometry = new THREE.CapsuleGeometry(0.7, Math.max(0.1, ph - 1.4), 6, 14); });
      [p1Shadow, p2Shadow].forEach((m) => m.scale.set(2.4, ph + 1.8, 1));
    }
    const p1x = (6 + st.paddleW / 2 - W / 2) * S, p2x = (W - 6 - st.paddleW / 2 - W / 2) * S;
    p1Mesh.position.set(p1x + 0.1, 0.62, (st.p1y + st.paddleH / 2 - H / 2) * S);
    p1Shadow.position.set(p1x + 0.2, 0.03, p1Mesh.position.z);
    const showP2 = st.mode !== 'paredao';
    p2Mesh.visible = showP2; p2Shadow.visible = showP2;
    if (showP2) {
      p2Mesh.position.set(p2x - 0.1, 0.62, (st.p2y + st.paddleH / 2 - H / 2) * S);
      p2Shadow.position.set(p2x - 0.2, 0.03, p2Mesh.position.z);
    }

    // bola (no tênis ela "voa" em arco por cima da rede)
    let hop = 0;
    if (st.mode === 'tenis') hop = Math.sin(Math.PI * Math.min(1, Math.max(0, st.ball.x / W))) * 1.5;
    const by = 0.62 + hop;
    ballMesh.position.set(bx, by, bz);
    const spd = Math.hypot(st.ball.vx, st.ball.vy);
    ballMesh.rotation.z -= st.ball.vx * 0.02 * (dt * 60); ballMesh.rotation.x += st.ball.vy * 0.02 * (dt * 60);
    ballLight.position.set(bx, by + 1.4, bz);
    ballLight.intensity = quality === 'alto' ? 1.5 + spd * 0.08 : 0.9;
    const sh = 1.7 + hop * 0.5, shA = 1 - Math.min(0.5, hop * 0.25);
    ballShadow.position.set(bx + hop * 0.15, 0.03, bz + hop * 0.15); ballShadow.scale.set(sh, sh, 1); ballShadow.material.opacity = shA;
    ballGlow.position.set(bx, 0.05, bz);
    const gs = 4.0 + spd * 0.25; ballGlow.scale.set(gs, gs, 1);

    // rastro
    const tr = st.trail, n = Math.min(tr.length, TRAIL_N), tc = trailPts.userData.color;
    for (let i = 0; i < TRAIL_N; i++) {
      const src = tr[tr.length - 1 - i];
      if (i < n && src) {
        const f = 1 - i / n;
        const hy = st.mode === 'tenis' ? 0.62 + Math.sin(Math.PI * Math.min(1, Math.max(0, src.x / W))) * 1.5 : 0.62;
        tPos[i * 3] = (src.x - W / 2) * S; tPos[i * 3 + 1] = hy; tPos[i * 3 + 2] = (src.y - H / 2) * S;
        const a = f * f * 0.75;
        tCol[i * 3] = tc.r * a; tCol[i * 3 + 1] = tc.g * a; tCol[i * 3 + 2] = tc.b * a;
      } else { tCol[i * 3] = tCol[i * 3 + 1] = tCol[i * 3 + 2] = 0; }
    }
    trailPts.geometry.attributes.position.needsUpdate = true; trailPts.geometry.attributes.color.needsUpdate = true;

    // barreira
    if (barrierTop && st.barrier) {
      const gTop = st.barrier.gapTop, gBot = st.barrier.gapBottom;
      const tl = Math.max(0.01, gTop * S), bl = Math.max(0.01, (H - gBot) * S);
      barrierTop.scale.z = tl; barrierTop.position.set(0, 0.75, -H * S / 2 + tl / 2);
      barrierBot.scale.z = bl; barrierBot.position.set(0, 0.75, H * S / 2 - bl / 2);
      barrierTop.material.map.repeat.set(1, Math.max(1, tl / 1.5));
      barrierTop.userData.cap.scale.z = tl; barrierTop.userData.cap.position.set(0, 1.52, barrierTop.position.z);
      barrierBot.userData.cap.scale.z = bl; barrierBot.userData.cap.position.set(0, 1.52, barrierBot.position.z);
    }

    // partículas
    for (let i = 0; i < pCount; i++) {
      pLife[i] -= dt * 1.1;
      if (pLife[i] <= 0) { // troca com o último
        const l = --pCount;
        if (i < l) {
          for (let k = 0; k < 3; k++) { pPos[i * 3 + k] = pPos[l * 3 + k]; pVel[i * 3 + k] = pVel[l * 3 + k]; pBase[i * 3 + k] = pBase[l * 3 + k]; }
          pLife[i] = pLife[l];
        }
        i--; continue;
      }
      pVel[i * 3 + 1] -= 6.5 * dt;
      pPos[i * 3] += pVel[i * 3] * dt * 4; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt * 4; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt * 4;
      if (pPos[i * 3 + 1] < 0.05) { pPos[i * 3 + 1] = 0.05; pVel[i * 3 + 1] *= -0.35; }
      const a = Math.min(1, pLife[i]);
      pCol[i * 3] = pBase[i * 3] * a; pCol[i * 3 + 1] = pBase[i * 3 + 1] * a; pCol[i * 3 + 2] = pBase[i * 3 + 2] * a;
    }
    for (let i = pCount; i < MAX_P; i++) { pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; }
    partPts.geometry.attributes.position.needsUpdate = true; partPts.geometry.attributes.color.needsUpdate = true;
    partPts.geometry.setDrawRange(0, Math.max(pCount, 1));

    // anéis
    rings.forEach((r) => {
      if (r.userData.t >= 1) { r.visible = false; return; }
      r.userData.t += dt * 2.4;
      const t = Math.min(1, r.userData.t);
      const s = (0.6 + t * (r.userData.size || 2)) * 1.4;
      r.scale.set(s, s, 1); r.material.opacity = (1 - t) * 0.85;
    });

    // câmera
    introT = Math.min(1, introT + dt / 1.4);
    const ease = 1 - Math.pow(1 - introT, 3);
    shake = Math.max(0, shake - dt * 2.2); kick = Math.max(0, kick - dt * 3);
    const sx = (Math.random() - 0.5) * shake * 0.9, sz = (Math.random() - 0.5) * shake * 0.9;
    const tx = bx * 0.16, tz = 1.6 + bz * 0.1;
    camTarget.x += (tx - camTarget.x) * Math.min(1, dt * 3.2);
    camTarget.z += (tz - camTarget.z) * Math.min(1, dt * 3.2);
    const t = performance.now() / 1000;
    const dolly = (1 - ease) * 9;
    if (showcaseOn) {
      const a = Math.sin(t * 0.21) * 0.55, hh = 24 + Math.sin(t * 0.17) * 3;
      camera.fov = 56;
      camera.position.set(Math.sin(a) * 40, hh, Math.cos(a) * 44 + 12);
      camera.lookAt(0, 0, 9.5);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      return;
    }
    camera.position.set(
      camBase.x + camTarget.x * 0.35 + Math.sin(t * 0.35) * 0.35 + sx,
      camBase.y + dolly * 1.1 - kick * 0.35,
      camBase.z + dolly + camTarget.z * 0.1 + sz + Math.cos(t * 0.3) * 0.25
    );
    camera.lookAt(camTarget.x, 0, camTarget.z);
    camera.fov = 44 + (1 - ease) * 6; camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }

  function adaptQuality(dt) {
    if (pref !== 'auto' || quality !== 'alto') return;
    fpsWarm++;
    if (fpsWarm < 90) return; // ignora o aquecimento (shaders compilando)
    fpsAcc += dt; fpsN++;
    if (fpsN >= 120) {
      const avg = fpsAcc / fpsN;
      fpsAcc = 0; fpsN = 0;
      if (avg > 0.026) setQuality('leve'); // abaixo de ~38 fps: simplifica sozinho
    }
  }

  // ------------------------------------------- vitrine 3D atrás do menu
  let showcaseOn = false, consoleBody = null, scNextMode = 'paredao';
  const scState = { mode: 'paredao', W: 400, H: 300, p1y: 125, p2y: 125, paddleH: 50, paddleW: 8, goalHalf: 45,
    ball: { x: 120, y: 90, vx: 2.6, vy: 1.7, r: 5 }, trail: [], barrier: { gapTop: 0, gapBottom: 0 }, s1: 0, s2: 0 };
  let scPhase = 0, scLast = 0;

  function menuVisible() {
    const menu = document.getElementById('mainMenuOverlay');
    return !!(menu && !menu.classList.contains('hidden'));
  }
  function enterShowcase() {
    consoleBody = document.getElementById('consoleBody');
    if (!consoleBody || !glCanvas) return;
    showcaseOn = true;
    consoleBody.classList.add('showcase');
    consoleBody.appendChild(glCanvas);
    glCanvas.style.position = 'absolute'; glCanvas.style.zIndex = '3'; glCanvas.style.borderRadius = '20px';
    const modes = ['paredao', 'tenis', 'futebol', 'barreira'];
    scNextMode = modes[(Math.random() * modes.length) | 0];
    scState.mode = scNextMode;
    scState.paddleH = scNextMode === 'futebol' ? 34 : scNextMode === 'tenis' ? 65 : scNextMode === 'barreira' ? 55 : 50;
    scState.s1 = (Math.random() * 3) | 0; scState.s2 = (Math.random() * 3) | 0;
    scState.trail.length = 0;
    currentMode = null; introT = 0;
    resize();
  }
  function exitShowcase() {
    showcaseOn = false;
    if (consoleBody) consoleBody.classList.remove('showcase');
    if (frameEl && glCanvas) { frameEl.appendChild(glCanvas); glCanvas.style.zIndex = '1'; glCanvas.style.borderRadius = ''; }
    currentMode = null;
    resize();
  }
  function tickShowcase(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - (scLast || now)) / 1000)); scLast = now;
    const f = dt * 60, b = scState.ball, W = scState.W, H = scState.H;
    b.x += b.vx * f; b.y += b.vy * f;
    if (b.y < b.r || b.y > H - b.r) { b.vy *= -1; b.y = Math.max(b.r, Math.min(H - b.r, b.y)); burst(b.x, b.y, 2); }
    if (b.x < 24 || b.x > W - 24) { b.vx *= -1; b.x = Math.max(24, Math.min(W - 24, b.x)); burst(b.x, b.y, 4); }
    scState.p1y += (b.y - scState.paddleH / 2 - scState.p1y) * 0.09 * f;
    scState.p2y += (b.y - scState.paddleH / 2 - scState.p2y) * 0.07 * f;
    scPhase += 0.02 * f;
    const gc = H / 2 + 55 * Math.sin(scPhase);
    scState.barrier.gapTop = gc - 35; scState.barrier.gapBottom = gc + 35;
    scState.trail.push({ x: b.x, y: b.y }); if (scState.trail.length > 12) scState.trail.shift();
    if (scState.mode !== currentMode || !arena) { buildArena(scState.mode, W, H); buildActors(); }
    drawFrame(scState, dt);
  }

  // --------------------------------------------------- idle (jogo pausado)
  function idleLoop() {
    idleHandle = requestAnimationFrame(idleLoop);
    if (!active || document.hidden) return;
    const now = performance.now();
    const ov = document.getElementById('overlay');
    const covered = !!(ov && ov.style.display === 'flex');
    if (menuVisible()) {                      // menu aberto: vitrine 3D girando atrás dos botões (~30 fps)
      if (covered) return;
      if (now - lastIdle < 32) return;
      lastIdle = now;
      if (!showcaseOn) enterShowcase();
      if (showcaseOn) tickShowcase(now);
      return;
    }
    if (showcaseOn) exitShowcase();
    if (!lastState) return;
    if (now - lastRender < 110) return;       // o jogo está rodando e já desenha sozinho
    if (now - lastIdle < 60) return;          // ~16 fps parado (economiza bateria)
    lastIdle = now;
    if (covered) return;                      // tela coberta
    const dt = Math.min(0.05, (now - (lastNow || now)) / 1000); lastNow = now;
    drawFrame(lastState, Math.max(0.016, dt));
  }
  let lastIdle = 0;

  // ------------------------------------------------------------ setup
  function setQuality(q) {
    if (!renderer) return;
    quality = q;
    envTex = makeEnv();
    currentMode = null; // força reconstruir cenário com os materiais da nova qualidade
    resize();
  }

  function create() {
    if (failed || renderer) return !failed;
    try {
      baseCanvas = document.getElementById('game');
      frameEl = baseCanvas.parentElement;
      glCanvas = document.createElement('canvas');
      glCanvas.id = 'game3d';
      glCanvas.setAttribute('aria-hidden', 'true');
      frameEl.appendChild(glCanvas);
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: quality === 'alto', alpha: false, powerPreference: 'high-performance' });
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;
      camBase = new THREE.Vector3(0, 31, 36);
      camTarget = new THREE.Vector3(0, 0, 1.6);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(44, 4 / 3, 0.1, 220);
      envTex = makeEnv();
      glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); disable(); }, false);
      window.addEventListener('resize', resize);
      if (window.ResizeObserver) new ResizeObserver(resize).observe(baseCanvas);
      idleHandle = requestAnimationFrame(idleLoop);
      return true;
    } catch (err) {
      failed = true; renderer = null;
      if (glCanvas && glCanvas.parentNode) glCanvas.parentNode.removeChild(glCanvas);
      return false;
    }
  }

  function enable() {
    if (typeof THREE === 'undefined') { failed = true; return false; }
    if (!create()) return false;
    active = true;
    frameEl.classList.add('gfx3d');
    glCanvas.style.display = 'block';
    resize();
    return true;
  }
  function disable() {
    active = false;
    if (frameEl) frameEl.classList.remove('gfx3d');
    if (glCanvas) glCanvas.style.display = 'none';
  }

  /** Aplica a preferência: 'auto' | 'alto' | 'leve' | 'classico'. */
  function applyPref(p) {
    pref = p;
    if (p === 'classico') { disable(); return false; }
    quality = (p === 'leve') ? 'leve' : (p === 'alto' ? 'alto' : (looksLowEnd() ? 'leve' : 'alto'));
    if (renderer) { setQuality(quality); }
    const ok = enable();
    if (!ok) disable();
    return ok;
  }
  function looksLowEnd() {
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    return mem <= 2 || cores <= 3;
  }

  async function init() {
    try { const saved = await GameStorage.getJSON(PREF_KEY, 'auto'); if (['auto', 'alto', 'leve', 'classico'].indexOf(saved) >= 0) pref = saved; } catch (e) { /* usa auto */ }
    return applyPref(pref);
  }
  async function setPref(p) {
    try { await GameStorage.setJSON(PREF_KEY, p); } catch (e) { /* ignora */ }
    fpsAcc = 0; fpsN = 0; fpsWarm = 0;
    return applyPref(p);
  }

  function setTheme(t) {
    if (!t) return;
    const changed = ['ball', 'paddle', 'bg', 'frame', 'pattern'].some((k) => t[k] !== undefined && t[k] !== theme[k]);
    Object.assign(theme, t);
    if (changed) currentMode = null; // reconstrói na próxima renderização
  }

  return {
    init, setPref, setTheme, burst, goal, render,
    isActive: () => active,
    getPref: () => pref,
    getQuality: () => quality,
    isSupported: () => !failed,
  };
})();
