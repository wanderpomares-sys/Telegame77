const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let mode = 'paredao';
let running = false;

const paddleW = 8;
let paddleH = 50;
let goalHalf = 45; // metade da altura do gol, usado no modo Futebol

// Barreira: parede central com abertura que se move
const barrierThickness = 6;
const barrierGapHeight = 70;
const barrierGapAmplitude = 55;
let barrierPhase = 0;

let p1 = { y: H/2 - paddleH/2, score: 0 };
let p2 = { y: H/2 - paddleH/2, score: 0 };
let ball = { x: W/2, y: H/2, vx: 3.2, vy: 2.1, r: 5 };

// --- Física baseada em tempo (dt): garante movimento suave e consistente
// independente da taxa de atualização da tela (60Hz, 90Hz, 120Hz, etc.) ---
const REFERENCE_FRAME_MS = 1000 / 60; // todos os valores de velocidade foram calibrados pensando em 60fps
let lastFrameTime = 0;

// --- Rastro luminoso da bola (só visual, não afeta a física) ---
const BALL_TRAIL_LENGTH = 7;
let ballTrail = [];

// --- Partículas leves de colisão (rebatida/parede) ---
let hitParticles = [];

// --- Visibilidade da página: pausa o cálculo físico quando a aba está em segundo
// plano, pra economizar bateria e evitar "pulos" de física ao voltar ---
let pageVisible = true;
document.addEventListener('visibilitychange', () => {
  pageVisible = document.visibilityState === 'visible';
  if (pageVisible) lastFrameTime = 0; // evita um dt gigante no primeiro frame ao voltar
});

/** Inicia (ou retoma) o loop do jogo de forma consistente, sempre zerando a
 * referência de tempo pra não gerar um "pulo" de física logo no primeiro frame. */
function startLoop() {
  running = true;
  lastFrameTime = 0;
  document.getElementById('startBtn').textContent = 'Pausar';
  requestAnimationFrame(loop);
}

/** Pausa o loop do jogo (não reseta placar nem posição, só para a física). */
function pauseLoop() {
  running = false;
  document.getElementById('startBtn').textContent = 'Iniciar';
}

// --- Campeonato: uma trilha por jogo, com dificuldade crescente ---
const TRACKS = {
  paredao: {
    label: 'Paredão', trophy: '🧱',
    rounds: [
      { name: 'CPU Iniciante', target: 3, cpuSpeed: 2.0, cpuMargin: 14, ballSpeed: 2.5 },
      { name: 'CPU Amador',    target: 3, cpuSpeed: 2.6, cpuMargin: 10, ballSpeed: 2.9 },
      { name: 'CPU Estadual',  target: 4, cpuSpeed: 3.4, cpuMargin: 7,  ballSpeed: 3.5 },
      { name: 'CPU Lenda',     target: 5, cpuSpeed: 4.4, cpuMargin: 3,  ballSpeed: 4.3 },
    ],
  },
  tenis: {
    label: 'Tênis', trophy: '🎾',
    rounds: [
      { name: 'CPU Iniciante', target: 3, cpuSpeed: 2.2, cpuMargin: 13, ballSpeed: 2.7 },
      { name: 'CPU Amador',    target: 3, cpuSpeed: 2.9, cpuMargin: 9,  ballSpeed: 3.1 },
      { name: 'CPU Estadual',  target: 4, cpuSpeed: 3.7, cpuMargin: 6,  ballSpeed: 3.8 },
      { name: 'CPU Lenda',     target: 5, cpuSpeed: 4.6, cpuMargin: 3,  ballSpeed: 4.6 },
    ],
  },
  futebol: {
    label: 'Futebol', trophy: '⚽',
    rounds: [
      { name: 'CPU Iniciante', target: 3, cpuSpeed: 2.4, cpuMargin: 11, ballSpeed: 2.9 },
      { name: 'CPU Amador',    target: 4, cpuSpeed: 3.1, cpuMargin: 8,  ballSpeed: 3.4 },
      { name: 'CPU Estadual',  target: 4, cpuSpeed: 3.9, cpuMargin: 5,  ballSpeed: 4.0 },
      { name: 'CPU Lenda',     target: 5, cpuSpeed: 4.8, cpuMargin: 2,  ballSpeed: 4.8 },
    ],
  },
  barreira: {
    label: 'Barreira', trophy: '🚧',
    rounds: [
      { name: 'CPU Iniciante', target: 3, cpuSpeed: 2.5, cpuMargin: 12, ballSpeed: 3.0 },
      { name: 'CPU Amador',    target: 4, cpuSpeed: 3.3, cpuMargin: 8,  ballSpeed: 3.6 },
      { name: 'CPU Estadual',  target: 4, cpuSpeed: 4.1, cpuMargin: 5,  ballSpeed: 4.3 },
      { name: 'CPU Lenda',     target: 5, cpuSpeed: 5.0, cpuMargin: 2,  ballSpeed: 5.0 },
    ],
  },
};

// Multiplicadores aplicados sobre as fases de cada trilha, dando pelo menos
// 3 níveis gerais de dificuldade além da escalada natural das 4 fases.
const DIFFICULTY_MULTIPLIERS = {
  facil:   { speed: 0.65, margin: 1.6, ball: 0.82 },
  medio:   { speed: 1,    margin: 1,   ball: 1 },
  dificil: { speed: 1.3,  margin: 0.6, ball: 1.18 },
};
let champDifficulty = 'medio';

document.querySelectorAll('#difficultyRow .target-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    ensureAudio();
    GameAudio.playMenuNavigate();
    document.querySelectorAll('#difficultyRow .target-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    champDifficulty = btn.dataset.difficulty;
  });
});

// --- Dificuldade da CPU no modo Praticar (independente do Campeonato) ---
const PRACTICE_DIFFICULTY_PRESETS = {
  facil:     { cpuSpeed: 1.6, cpuMargin: 18, ballBaseSpeed: 2.4 },
  medio:     { cpuSpeed: 2.4, cpuMargin: 10, ballBaseSpeed: 2.8 },
  dificil:   { cpuSpeed: 3.4, cpuMargin: 5,  ballBaseSpeed: 3.3 },
  impossivel:{ cpuSpeed: 4.8, cpuMargin: 2,  ballBaseSpeed: 4.2 }, // usado só pelo Modo Impossível
};
let practiceDifficulty = 'medio';

document.querySelectorAll('#practiceDifficultyRow .target-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    ensureAudio();
    GameAudio.playMenuNavigate();
    document.querySelectorAll('#practiceDifficultyRow .target-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    practiceDifficulty = btn.dataset.practiceDifficulty;
    applyPracticeDifficulty();
  });
});

function applyPracticeDifficulty() {
  if (championshipActive) return; // no campeonato, quem manda é a dificuldade da fase
  const preset = PRACTICE_DIFFICULTY_PRESETS[practiceDifficulty];
  cpuSpeed = preset.cpuSpeed;
  cpuMargin = preset.cpuMargin;
  ballBaseSpeed = preset.ballBaseSpeed;
}

// Vibração agora mora em audio.js (GameAudio.vibrate) — junto dos outros
// efeitos de resposta ao jogador, pra tudo de "feedback sensorial" ficar num
// lugar só.

let championshipActive = false;
let currentTrack = null;
let roundIndex = 0;
let cpuSpeed = 2.4;   // modo Praticar: valor inicial (dificuldade Médio); ajustado por applyPracticeDifficulty()
let cpuMargin = 10;
let ballBaseSpeed = 2.8;

// --- Sistema de vidas do campeonato ---
const STARTING_LIVES = 3;
let lives = STARTING_LIVES;

// --- Perfil do jogador e troféus (persistidos entre sessões) ---
let playerName = null;
let trophies = { paredao: false, tenis: false, futebol: false, barreira: false };

function updatePaddleSize() {
  if (mode === 'tenis') paddleH = 65;         // quadra cheia, raquete maior
  else if (mode === 'futebol') paddleH = 34;  // goleiro, raquete menor
  else if (mode === 'barreira') paddleH = 55; // quadra cheia, com obstáculo central
  else paddleH = 50;                          // paredão
}

// --- Sons e vibração agora moram em audio.js (módulo GameAudio) ---
// Mantemos aqui só "atalhos" com o mesmo nome de antes, delegando pro módulo.
// Assim nenhuma chamada existente no resto do arquivo precisa mudar.
function ensureAudio() { return GameAudio.ensureAudio(); }
function beep(freq, duration, volume, delay, type) { GameAudio.beep(freq, duration, volume, delay, type); }
function playPaddleHit() { GameAudio.playPaddleHit(); }
function playWallBounce() { GameAudio.playWallBounce(); }
function playScorePoint() { GameAudio.playScorePoint(); }
function playStartSound() { GameAudio.playStartSound(); }
function playRoundWin() { GameAudio.playRoundWin(); }
function playRoundLose() { GameAudio.playRoundLose(); }
function playTrophyFanfare() { GameAudio.playTrophyFanfare(); }
function vibrate(pattern) { GameAudio.vibrate(pattern); }

document.getElementById('soundBtn').addEventListener('click', () => {
  const enabled = GameAudio.toggleSound();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
  GameAudio.ensureAudio();
  if (enabled) GameAudio.playToggleOn();
  else GameAudio.playToggleOff();
});


const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault(); // evita rolar a página com as setas/espaço
  }
  if (e.code === 'Space') {
    ensureAudio();
    if (running) {
      pauseLoop();
    } else {
      playStartSound();
      startLoop();
    }
  }
});
window.addEventListener('keyup', e => keys[e.key] = false);

// --- Controles por toque: usamos Pointer Events (unifica mouse/toque/caneta e
// já suporta multitoque de forma nativa, cada ponteiro com seu próprio ID) ---
function bindHoldPointer(el, keyName) {
  const press = e => {
    e.preventDefault();
    ensureAudio();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* alguns navegadores antigos não suportam */ }
    keys[keyName] = true;
  };
  const release = e => {
    e.preventDefault();
    keys[keyName] = false;
  };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
}

bindHoldPointer(document.getElementById('p1up'), 'touchP1Up');
bindHoldPointer(document.getElementById('p1down'), 'touchP1Down');

// --- Arrastar o dedo direto na tela do jogo também move a raquete (sem atraso,
// posição 1:1 com o dedo). Funciona junto com os botões ▲/▼, sem conflitar,
// porque cada ponteiro (dedo) tem seu próprio ID. ---
let isDraggingPaddle = false;
let dragPointerId = null;

function setP1FromClientY(clientY) {
  const rect = canvas.getBoundingClientRect();
  const relativeY = (clientY - rect.top) / rect.height; // 0..1
  const targetCenterY = relativeY * H;
  p1.y = Math.max(0, Math.min(H - paddleH, targetCenterY - paddleH / 2));
}

canvas.addEventListener('pointerdown', e => {
  ensureAudio();
  isDraggingPaddle = true;
  dragPointerId = e.pointerId;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignora se não suportado */ }
  setP1FromClientY(e.clientY);
});
canvas.addEventListener('pointermove', e => {
  if (isDraggingPaddle && e.pointerId === dragPointerId) {
    setP1FromClientY(e.clientY);
  }
});
function endPaddleDrag(e) {
  if (e.pointerId === dragPointerId) {
    isDraggingPaddle = false;
    dragPointerId = null;
  }
}
canvas.addEventListener('pointerup', endPaddleDrag);
canvas.addEventListener('pointercancel', endPaddleDrag);

document.querySelectorAll('.dial-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (championshipActive) return; // modo definido pela fase do campeonato
    ensureAudio();
    GameAudio.playMenuNavigate();
    document.querySelectorAll('.dial-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    resetRound();
    draw();
  });
});

document.getElementById('startBtn').addEventListener('click', () => {
  ensureAudio();
  if (running) {
    pauseLoop();
  } else {
    playStartSound();
    startLoop();
  }
});

document.getElementById('practiceBtn').addEventListener('click', () => {
  ensureAudio();
  flashButton(document.getElementById('practiceBtn'));
  hideOverlay();
  if (championshipActive) endChampionship();
  if (specialMode) {
    exitSpecialMode(); // já reseta placar, dificuldade e desenha a tela
  } else {
    p1.score = 0; p2.score = 0;
    resetRound();
    draw();
  }
  updateModeButtons();
  resetMatchTimer();
});

document.getElementById('champBtn').addEventListener('click', () => {
  ensureAudio();
  flashButton(document.getElementById('champBtn'));
  if (championshipActive) return;
  if (!playerName) {
    showOverlay(
      'Entre com seu nome primeiro',
      'Pra disputar um campeonato e guardar seu troféu, digite um nome de jogador no campo acima e toque em Entrar.',
      [{ label: 'Entendi', action: () => {} }]
    );
    return;
  }
  if (specialMode) { specialMode = null; updateSpecialModeBanner(); }
  running = false;
  document.getElementById('startBtn').textContent = 'Iniciar';
  showTrackInfo(mode);
});

document.getElementById('specialModesBtn').addEventListener('click', () => {
  ensureAudio();
  flashButton(document.getElementById('specialModesBtn'));
  if (championshipActive) return;
  if (!playerName) {
    showOverlay(
      'Entre com seu nome primeiro',
      'Os modos especiais guardam pontuação no ranking e pagam moedas — entre com um nome de jogador antes.',
      [{ label: 'Entendi', action: () => {} }]
    );
    return;
  }
  pauseLoop();
  showSpecialModesOverlay();
});

document.getElementById('loginBtn').addEventListener('click', () => login(document.getElementById('playerNameInput').value));
document.getElementById('playerNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') login(document.getElementById('playerNameInput').value);
});
document.getElementById('menuLoginBtn').addEventListener('click', () => login(document.getElementById('menuPlayerNameInput').value));
document.getElementById('menuPlayerNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') login(document.getElementById('menuPlayerNameInput').value);
});
document.getElementById('logoutBtn').addEventListener('click', logout);

// --- Armazenamento agora mora em storage.js (módulo GameStorage) ---
// Atalho com o mesmo nome de antes, delegando pro módulo.
async function storageSetValue(key, value) { return GameStorage.setValue(key, value); }

/** Login: funciona igual não importa de qual dos dois campos (jogo ou menu) o nome veio. */
async function login(rawName) {
  const name = (rawName || '').trim();
  if (!name) return;
  playerName = name;
  // Usa getJSON (com fallback seguro) em vez de JSON.parse direto: um save
  // corrompido/antigo não pode travar o login e trancar o jogador pra fora.
  trophies = await GameStorage.getJSON('telegamevintage-trophies:' + playerName,
    { paredao: false, tenis: false, futebol: false, barreira: false });
  await GameStats.load(playerName);
  await GameAchievements.load(playerName);
  await GameCoins.load(playerName);
  await GameShop.load(playerName);
  await GameLevels.load(playerName);
  await GameMissions.load(playerName);
  applyCosmetics(GameShop.getEquippedConfig());
  await GamePlayServices.signIn(); // sem efeito hoje (ver playservices.js) — pronto pra quando existir de verdade
  updateProfileUI();
  updateCoinDisplay();
  updateMenuGate();
}

/** Libera ou esconde os botões do menu conforme o jogador está identificado ou não. */
function updateMenuGate() {
  document.getElementById('mainMenuButtons').style.display = playerName ? 'flex' : 'none';
  document.getElementById('menuLoginHint').style.display = playerName ? 'none' : 'block';
}

function logout() {
  if (championshipActive) endChampionship();
  if (specialMode) { specialMode = null; updateSpecialModeBanner(); }
  playerName = null;
  trophies = { paredao: false, tenis: false, futebol: false, barreira: false };
  updateTrophyBadges();
  document.getElementById('profileLogin').style.display = 'flex';
  document.getElementById('profileInfo').style.display = 'none';
  document.getElementById('playerNameInput').value = '';
  document.getElementById('menuProfileLogin').style.display = 'flex';
  document.getElementById('menuProfileInfo').style.display = 'none';
  document.getElementById('menuPlayerNameInput').value = '';
  updateMenuGate();
  applyCosmetics({
    ballColor: '#c8e6c0', paddleColor: '#c8e6c0', screenBg: '#0c0e0a', effectsLevel: 'padrao', soundPack: 'classico',
    font: "'Courier New', monospace", letterSpacing: 'normal',
    cssVars: { '--wood-dark': '#4a3324', '--wood-mid': '#6b4a30', '--wood-light': '#8a6440', '--panel-black': '#1a1a1a', '--frame-color': '#222222' },
  });
}

/** Atualiza o número de moedas mostrado no cabeçalho do perfil. */
function updateCoinDisplay() {
  const el = document.getElementById('coinDisplay');
  if (!el) return;
  el.textContent = playerName ? `🪙 ${GameCoins.getBalance()}` : '';
}

function updateProfileUI() {
  if (!playerName) return;
  const info = GameLevels.getInfo();
  const nameLabel = `${playerName} · Nv.${info.level}`;

  document.getElementById('profileLogin').style.display = 'none';
  document.getElementById('profileInfo').style.display = 'flex';
  document.getElementById('profileName').textContent = nameLabel;

  document.getElementById('menuProfileLogin').style.display = 'none';
  document.getElementById('menuProfileInfo').style.display = 'flex';
  document.getElementById('menuProfileName').textContent = nameLabel;

  [document.getElementById('trophyCase'), document.getElementById('menuTrophyCase')].forEach(caseEl => {
    caseEl.innerHTML = '';
    Object.keys(TRACKS).forEach(key => {
      const span = document.createElement('span');
      span.className = 'trophy-icon' + (trophies[key] ? ' won' : '');
      span.textContent = TRACKS[key].trophy;
      span.title = TRACKS[key].label + (trophies[key] ? ' — Campeão!' : ' — ainda não conquistado');
      caseEl.appendChild(span);
    });
  });
  updateTrophyBadges();
}

function updateTrophyBadges() {
  document.querySelectorAll('.mini-trophy').forEach(el => {
    el.classList.toggle('won', !!trophies[el.dataset.trophy]);
  });
}

async function saveTrophies() {
  if (!playerName) return;
  await storageSetValue('telegamevintage-trophies:' + playerName, JSON.stringify(trophies));
}

function showTrackInfo(track) {
  const t = TRACKS[track];
  const already = trophies[track];
  const difficultyLabel = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }[champDifficulty];
  showOverlay(
    `Campeonato ${t.label} ${t.trophy}`,
    `${t.rounds.length} fases com dificuldade crescente, do ${t.rounds[0].name} ao ${t.rounds[t.rounds.length - 1].name}. Dificuldade geral: ${difficultyLabel}.` +
    (already ? ' Você já tem esse troféu — pode jogar de novo se quiser.' : ` Vença todas pra ganhar o troféu de ${t.label}.`),
    [
      { label: 'Iniciar', action: () => startChampionship(track) },
      { label: 'Cancelar', action: () => {} },
    ]
  );
}

function startChampionship(track) {
  championshipActive = true;
  currentTrack = track;
  roundIndex = 0;
  lives = STARTING_LIVES;
  updateChampButtons();
  document.getElementById('targetRow').style.display = 'none';
  document.getElementById('difficultyRow').style.display = 'none';
  document.getElementById('practiceDifficultyRow').style.display = 'none';
  loadRound();
  GameAudio.playChampionshipStart();
  startLoop();
}

function endChampionship() {
  championshipActive = false;
  currentTrack = null;
  applyPracticeDifficulty();
  hideOverlay();
  updateChampButtons();
  document.getElementById('champPanel').style.display = 'none';
  document.getElementById('targetRow').style.display = 'flex';
  document.getElementById('difficultyRow').style.display = 'flex';
  document.getElementById('practiceDifficultyRow').style.display = 'flex';
  pauseLoop();
  resetMatchTimer();
}

function updateChampButtons() {
  const champBtn = document.getElementById('champBtn');
  champBtn.classList.toggle('active', championshipActive);
  champBtn.disabled = championshipActive;
  updateModeButtons();
}

function flashButton(el) {
  el.classList.remove('flash');
  void el.offsetWidth; // força o navegador a reiniciar a animação
  el.classList.add('flash');
}

function updateModeButtons() {
  document.getElementById('practiceBtn').classList.toggle('active', !championshipActive);
  document.getElementById('champBtn').classList.toggle('active', championshipActive);
}

function loadRound() {
  const track = TRACKS[currentTrack];
  const r = track.rounds[roundIndex];
  const mult = DIFFICULTY_MULTIPLIERS[champDifficulty];
  mode = currentTrack;
  cpuSpeed = r.cpuSpeed * mult.speed;
  cpuMargin = r.cpuMargin * mult.margin;
  ballBaseSpeed = r.ballSpeed * mult.ball;
  p1.score = 0;
  p2.score = 0;
  document.querySelectorAll('.dial-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  updateChampionshipPanel();
  resetRound();
  draw();
  resetMatchTimer();
}

function updateChampionshipPanel() {
  const panel = document.getElementById('champPanel');
  if (!championshipActive) { panel.style.display = 'none'; return; }
  const track = TRACKS[currentTrack];
  const r = track.rounds[roundIndex];
  const heartsRow = '❤️'.repeat(Math.max(lives, 0)) + '🖤'.repeat(Math.max(STARTING_LIVES - lives, 0));
  panel.style.display = 'block';
  panel.textContent = `${track.label} ${track.trophy} · Fase ${roundIndex + 1}/${track.rounds.length} · Adversário: ${r.name} · Vitória com ${r.target} pontos · Vidas: ${heartsRow}`;
}

function showOverlay(title, msg, actions) {
  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayMsg').textContent = msg;
  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';
  actions.forEach((a, i) => {
    const btn = document.createElement('button');
    btn.className = 'overlay-btn' + (i > 0 ? ' secondary' : '');
    btn.textContent = a.label;
    btn.onclick = () => { hideOverlay(); a.action(); };
    actionsEl.appendChild(btn);
  });
  document.getElementById('overlay').style.display = 'flex';
}

function showVictoryOverlay(title, msg, actions) {
  showOverlay(title, msg, actions);
  document.getElementById('overlayTrophy').style.display = 'block';
  startFireworks();
}

function hideOverlay() {
  document.getElementById('overlay').style.display = 'none';
  stopFireworks();
}

// --- Fase 2: Estatísticas e Conquistas ---------------------------------------

/**
 * Reavalia todas as conquistas contra o estado atual do jogador.
 * Chame isso sempre que uma partida terminar (vitória, derrota, troféu).
 */
/** Melhor pontuação pessoal registrada no ranking pra uma trilha específica ('sobrevivencia'/'contra_tempo'). */
function getPersonalBestFor(marker) {
  if (!playerName) return 0;
  let best = 0;
  GameRanking.getTop(100).forEach((e) => {
    if (e.name === playerName && e.difficulty === marker && e.score > best) best = e.score;
  });
  return best;
}

async function checkAchievements() {
  if (!playerName) return;
  const enrichedStats = Object.assign({}, GameStats.raw, {
    level: GameLevels.getInfo().level,
    survivalBest: getPersonalBestFor('sobrevivencia'),
    timeAttackBest: getPersonalBestFor('contra_tempo'),
    dailyStreak: await getDailyChallengeStreak(),
    shopCategoriesOwned: GameShop.CATEGORIES.every(cat =>
      GameShop.getCategoryView(cat.id).some(item => item.price > 0 && item.purchased)
    ),
  });
  GameAchievements.checkAll(enrichedStats, trophies, (def) => {
    if (def.coins) {
      GameCoins.earn(def.coins);
      GameLevels.addXp(Math.round(def.coins / 2));
      updateCoinDisplay();
    }
    showAchievementToast(def);
  });
}

let achievementToastTimer = null;
let achievementToastHideTimer = null;

/** Mostra o toast de "conquista desbloqueada", com som e animação de entrada/saída. */
function showAchievementToast(def) {
  GameAudio.playAchievementUnlock();
  vibrate([20, 40, 20]);
  const toast = document.getElementById('achievementToast');
  clearTimeout(achievementToastTimer);
  clearTimeout(achievementToastHideTimer);
  toast.style.visibility = 'visible';
  document.getElementById('achievementToastIcon').textContent = def.icon;
  document.getElementById('achievementToastName').textContent = def.coins ? `${def.name} · +${def.coins} 🪙` : def.name;
  toast.classList.add('show');
  achievementToastTimer = setTimeout(() => {
    toast.classList.remove('show');
    // Depois que a animação de saída termina (0.45s), esconde de vez —
    // evita qualquer resquício visual durante rolagem em alguns navegadores móveis.
    achievementToastHideTimer = setTimeout(() => { toast.style.visibility = 'hidden'; }, 500);
  }, 3200);
}

/** Overlay simples com o resumo das estatísticas (tela dedicada vem na Etapa 1). */
function showStatsOverlay(returnToMenu) {
  if (!playerName) return;
  const s = GameStats.getSummary();
  const modeNames = { paredao: 'Paredão', tenis: 'Tênis', futebol: 'Futebol', barreira: 'Barreira' };
  const diffNames = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
  const lvl = GameLevels.getInfo();
  const xpPct = Math.round((lvl.xpIntoLevel / lvl.xpForNextLevel) * 100);
  const missions = GameMissions.getProgressView();

  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = `📊 Estatísticas de ${playerName}`;
  document.getElementById('overlayMsg').innerHTML = `
    <div class="level-block">
      <div class="level-label">Nível <b>${lvl.level}</b> — ${lvl.xpIntoLevel}/${lvl.xpForNextLevel} XP</div>
      <div class="level-bar"><div class="level-bar-fill" style="width:${xpPct}%;"></div></div>
    </div>
    <div class="stats-grid">
      <div>Partidas jogadas: <b>${s.matchesPlayed}</b></div>
      <div>Aproveitamento: <b>${s.winRate}%</b></div>
      <div>Vitórias: <b>${s.wins}</b></div>
      <div>Derrotas: <b>${s.losses}</b></div>
      <div>Maior sequência: <b>${s.bestWinStreak}</b></div>
      <div>Tempo jogado: <b>${s.playtimeLabel}</b></div>
      <div>Pontos marcados: <b>${s.pointsFor}</b></div>
      <div>Pontos sofridos: <b>${s.pointsAgainst}</b></div>
      <div>Modo favorito: <b>${s.favoriteMode ? modeNames[s.favoriteMode] : '—'}</b></div>
      <div>Dificuldade favorita: <b>${s.favoriteDifficulty ? diffNames[s.favoriteDifficulty] : '—'}</b></div>
      <div>Campeonatos vencidos: <b>${s.championshipsWon}</b></div>
      <div>Troféus conquistados: <b>${s.trophiesWon}</b></div>
    </div>
    <div class="missions-title">🎯 Missões de hoje</div>
    <div class="missions-list">
      ${missions.map(m => `
        <div class="mission-row${m.done ? ' done' : ''}">
          <span class="icon">${m.icon}</span>
          <div class="info">
            <div class="name">${m.label}</div>
            <div class="progress">${m.done ? 'Concluída · +' + m.reward + ' 🪙' : `${m.current}/${m.target}`}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'overlay-btn';
  btn.textContent = returnToMenu ? 'Voltar ao Menu' : 'Fechar';
  btn.onclick = () => { hideOverlay(); if (returnToMenu) showMainMenu(); };
  actionsEl.appendChild(btn);
  document.getElementById('overlay').style.display = 'flex';
}

/** Overlay simples com a lista de conquistas (tela dedicada vem na Etapa 1). */
function showAchievementsOverlay(returnToMenu) {
  if (!playerName) return;
  const list = GameAchievements.getAll();
  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = `🏆 Conquistas (${GameAchievements.getUnlockedCount()}/${list.length})`;
  document.getElementById('overlayMsg').innerHTML = `
    <div class="achievements-list">
      ${list.map(a => `
        <div class="achievement-row${a.unlocked ? ' unlocked' : ''}">
          <span class="icon">${a.icon}</span>
          <div class="info">
            <div class="name">${a.name}</div>
            <div class="desc">${a.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'overlay-btn';
  btn.textContent = returnToMenu ? 'Voltar ao Menu' : 'Fechar';
  btn.onclick = () => { hideOverlay(); if (returnToMenu) showMainMenu(); };
  actionsEl.appendChild(btn);
  document.getElementById('overlay').style.display = 'flex';
}

/** Escapa texto que veio do jogador (nome) antes de jogar em innerHTML. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// --- Fase 2, Parte 2: Menu Principal -----------------------------------------

function showMainMenu() {
  pauseLoop();
  // Fecha qualquer telinha que estivesse aberta por cima (aviso de login,
  // vitória, estatísticas, etc.) — senão as duas ficam visíveis ao mesmo tempo.
  document.getElementById('overlay').style.display = 'none';
  stopFireworks();
  document.getElementById('mainMenuOverlay').classList.remove('hidden');
  // Sem identificação ainda: coloca o cursor pronto no campo de nome,
  // já que é a primeira coisa que faz sentido o jogador fazer.
  if (!playerName) {
    setTimeout(() => document.getElementById('menuPlayerNameInput').focus(), 200);
  }
}

function hideMainMenu() {
  document.getElementById('mainMenuOverlay').classList.add('hidden');
}

function revealGameplayControls() {
  document.getElementById('gamePlayControls').style.display = 'block';
}

/** Overlay com a lista local de melhores pontuações (Top 10 / Top 100). */
function showRankingOverlay(expanded) {
  const list = GameRanking.getTop(expanded ? 100 : 10);
  const modeNames = { paredao: 'Paredão', tenis: 'Tênis', futebol: 'Futebol', barreira: 'Barreira' };
  const myRank = playerName ? GameRanking.getMyBestRank(playerName) : null;

  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = expanded ? '📈 Ranking (Top 100 local)' : '📈 Ranking (Top 10 local)';

  const posLine = myRank
    ? `<div class="ranking-my-position">Sua melhor posição: <b>${myRank}º</b> de ${GameRanking.getTotalEntries()}</div>`
    : '';
  const rows = list.map((e, i) => `
    <div class="ranking-row">
      <span class="rank">${i + 1}º</span>
      <span class="rname">${escapeHtml(e.name)}</span>
      <span class="rscore">${e.score}</span>
      <span class="rmode">${modeNames[e.mode] || e.mode}</span>
    </div>`).join('');

  document.getElementById('overlayMsg').innerHTML = posLine + `
    <div class="ranking-list">
      ${rows || '<div class="ranking-empty">Ainda não há pontuações registradas.<br>Jogue uma partida (logado) pra entrar no ranking!</div>'}
    </div>`;

  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';
  if (!expanded && GameRanking.getTotalEntries() > 10) {
    const moreBtn = document.createElement('button');
    moreBtn.className = 'overlay-btn secondary';
    moreBtn.textContent = 'Ver Top 100';
    moreBtn.onclick = () => showRankingOverlay(true);
    actionsEl.appendChild(moreBtn);
  }
  const closeBtn = document.createElement('button');
  closeBtn.className = 'overlay-btn';
  closeBtn.textContent = 'Voltar ao Menu';
  closeBtn.onclick = () => { hideOverlay(); showMainMenu(); };
  actionsEl.appendChild(closeBtn);
  document.getElementById('overlay').style.display = 'flex';
}

let shopActiveCategory = 'wood';

/** Tela da loja: abas de categoria + grade de itens da categoria escolhida. */
const AD_COINS_REWARD = 30;
const AD_WATCH_DAILY_LIMIT = 5;

/** Quantos anúncios de moedas o jogador já assistiu hoje (zera à meia-noite). */
async function getAdWatchCountToday() {
  if (!playerName) return 0;
  const raw = await GameStorage.getJSON('telegamevintage-adwatch:' + playerName, null);
  if (!raw || raw.date !== todayDateKey()) return 0;
  return raw.count || 0;
}

async function incrementAdWatchCount() {
  if (!playerName) return;
  const count = (await getAdWatchCountToday()) + 1;
  await GameStorage.setJSON('telegamevintage-adwatch:' + playerName, { date: todayDateKey(), count });
}

/** Assistir um anúncio recompensado pra ganhar moedas — limitado por dia, pra não virar spam de vídeo. */
async function watchAdForCoins() {
  const watched = await getAdWatchCountToday();
  if (watched >= AD_WATCH_DAILY_LIMIT) {
    GameAudio.playToggleOff();
    return;
  }
  GameAds.showRewarded(async () => {
    GameCoins.earn(AD_COINS_REWARD);
    GameAudio.playCoin();
    vibrate(20);
    updateCoinDisplay();
    await incrementAdWatchCount();
    showShopOverlay(shopActiveCategory);
  }, `ganhar +${AD_COINS_REWARD} moedas`);
}

async function showShopOverlay(category) {
  if (category) shopActiveCategory = category;

  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = `🛒 Loja · 🪙 ${GameCoins.getBalance()}`;

  const tabsHtml = GameShop.CATEGORIES.map(cat => `
    <button class="shop-tab${cat.id === shopActiveCategory ? ' active' : ''}" data-shop-category="${cat.id}">${cat.label}</button>
  `).join('');

  const items = GameShop.getCategoryView(shopActiveCategory);
  const itemsHtml = items.map(item => {
    let statusHtml;
    if (item.equipped) statusHtml = `<span class="shop-status equipped">Equipado</span>`;
    else if (item.purchased) statusHtml = `<button class="overlay-btn shop-action" data-shop-equip="${item.id}">Equipar</button>`;
    else statusHtml = `<button class="overlay-btn shop-action" data-shop-buy="${item.id}">Comprar · 🪙 ${item.price}</button>`;
    return `
      <div class="shop-item${item.equipped ? ' equipped' : ''}">
        <span class="shop-item-swatch" style="background:${item.color || item.screenBg || item.frameColor || (item.vars && item.vars['--wood-mid']) || '#666'};"></span>
        <span class="shop-item-name">${item.name}</span>
        ${statusHtml}
      </div>`;
  }).join('');

  const adsWatchedToday = await getAdWatchCountToday();
  const adLimitReached = adsWatchedToday >= AD_WATCH_DAILY_LIMIT;
  const adRowHtml = `
    <div class="shop-ad-row${adLimitReached ? ' disabled' : ''}">
      <span>🎬 Assistir anúncio curto · +${AD_COINS_REWARD} 🪙</span>
      <button class="overlay-btn shop-action" id="watchAdCoinsBtn" ${adLimitReached ? 'disabled' : ''}>
        ${adLimitReached ? `Volte amanhã` : `Assistir (${adsWatchedToday}/${AD_WATCH_DAILY_LIMIT} hoje)`}
      </button>
    </div>`;

  document.getElementById('overlayMsg').innerHTML = `
    ${adRowHtml}
    <div class="shop-tabs">${tabsHtml}</div>
    <div class="shop-items">${itemsHtml}</div>
  `;

  const watchAdBtn = document.getElementById('watchAdCoinsBtn');
  if (watchAdBtn && !adLimitReached) {
    watchAdBtn.addEventListener('click', () => { ensureAudio(); watchAdForCoins(); });
  }

  // Abas de categoria
  document.querySelectorAll('[data-shop-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      GameAudio.playMenuNavigate();
      showShopOverlay(btn.dataset.shopCategory);
    });
  });

  // Comprar
  document.querySelectorAll('[data-shop-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const result = GameShop.purchase(btn.dataset.shopBuy);
      if (result.success) {
        GameAudio.playCoin();
        vibrate(20);
        updateCoinDisplay();
      } else if (result.reason === 'moedas-insuficientes') {
        GameAudio.playToggleOff();
      }
      showShopOverlay(shopActiveCategory);
    });
  });

  // Equipar
  document.querySelectorAll('[data-shop-equip]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (GameShop.equip(btn.dataset.shopEquip)) {
        GameAudio.playMenuConfirm();
        applyCosmetics(GameShop.getEquippedConfig());
      }
      showShopOverlay(shopActiveCategory);
    });
  });

  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'overlay-btn secondary';
  closeBtn.textContent = 'Voltar ao Menu';
  closeBtn.onclick = () => { hideOverlay(); showMainMenu(); };
  actionsEl.appendChild(closeBtn);

  document.getElementById('overlay').style.display = 'flex';
}

function renderSettingsBody() {
  const enabled = GameAudio.isSoundEnabled();
  const musicOn = GameAudio.isMusicEnabled();
  return `
    <div class="settings-body">
      <div>Som: <b>${enabled ? 'Ligado 🔊' : 'Desligado 🔇'}</b></div>
      <div>Música de fundo: <b>${musicOn ? 'Ligada 🎵' : 'Desligada'}</b></div>
      <div>Jogador atual: <b>${playerName || 'Nenhum — entre com um nome no jogo'}</b></div>
    </div>`;
}

function showSettingsOverlay() {
  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = '⚙️ Configurações';
  document.getElementById('overlayMsg').innerHTML = renderSettingsBody();

  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';

  const soundBtnEl = document.createElement('button');
  soundBtnEl.className = 'overlay-btn';
  soundBtnEl.textContent = GameAudio.isSoundEnabled() ? 'Desligar som' : 'Ligar som';
  soundBtnEl.onclick = () => { document.getElementById('soundBtn').click(); showSettingsOverlay(); };
  actionsEl.appendChild(soundBtnEl);

  const musicBtnEl = document.createElement('button');
  musicBtnEl.className = 'overlay-btn secondary';
  musicBtnEl.textContent = GameAudio.isMusicEnabled() ? 'Desligar música' : 'Ligar música';
  musicBtnEl.onclick = () => { ensureAudio(); GameAudio.toggleMusic(); showSettingsOverlay(); };
  actionsEl.appendChild(musicBtnEl);

  if (playerName) {
    const testCoinsBtn = document.createElement('button');
    testCoinsBtn.className = 'overlay-btn secondary';
    testCoinsBtn.textContent = '🧪 +500 moedas (teste)';
    testCoinsBtn.onclick = () => {
      GameCoins.earn(500);
      GameAudio.playCoin();
      updateCoinDisplay();
      showSettingsOverlay();
    };
    actionsEl.appendChild(testCoinsBtn);

    const logoutBtnEl = document.createElement('button');
    logoutBtnEl.className = 'overlay-btn secondary';
    logoutBtnEl.textContent = 'Trocar jogador';
    logoutBtnEl.onclick = () => { hideOverlay(); logout(); showMainMenu(); };
    actionsEl.appendChild(logoutBtnEl);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'overlay-btn secondary';
  closeBtn.textContent = 'Voltar ao Menu';
  closeBtn.onclick = () => { hideOverlay(); showMainMenu(); };
  actionsEl.appendChild(closeBtn);

  document.getElementById('overlay').style.display = 'flex';
}

/** Manual do jogo: controles, modos, campeonato e os sistemas (moedas/XP/loja/etc). */
function showHelpOverlay() {
  showOverlay('❓ Como Jogar', '', [{ label: 'Voltar ao Menu', action: () => showMainMenu() }]);
  document.getElementById('overlayMsg').innerHTML = `
    <div class="help-body">
      <div class="help-section">
        <div class="help-title">🕹️ Controles</div>
        <div>Teclado: <b>W/S</b> ou <b>setas ↑/↓</b>. Barra de espaço inicia/pausa.</div>
        <div>Toque: arraste o dedo na tela, ou use os botões ▲/▼.</div>
      </div>
      <div class="help-section">
        <div class="help-title">🎮 Os 4 jogos clássicos</div>
        <div><b>Paredão:</b> não tem raquete adversária — é você contra a parede sólida da direita, que sempre rebate. Só a CPU marca ponto quando você erra — sobreviva até o cronômetro zerar pra vencer.</div>
        <div><b>Tênis:</b> quadra cheia, vale ponto pra qualquer lado.</div>
        <div><b>Futebol:</b> só marca gol acertando a faixa central da trave.</div>
        <div><b>Barreira:</b> passe a bola pela abertura que se move no meio.</div>
      </div>
      <div class="help-section">
        <div class="help-title">🏆 Campeonato</div>
        <div>Escolha um jogo e uma dificuldade geral. São 4 fases contra
        adversários cada vez mais difíceis. Você tem 3 vidas — perde uma a
        cada fase perdida. Vença as 4 fases pra ganhar o troféu daquele jogo.</div>
      </div>
      <div class="help-section">
        <div class="help-title">🎯 Modos especiais</div>
        <div><b>Sobrevivência:</b> a CPU acelera a cada ponto seu.</div>
        <div><b>Contra o Tempo:</b> 60s pra marcar o máximo possível.</div>
        <div><b>Treino Infinito:</b> bola nunca marca ponto, só pra treinar.</div>
        <div><b>Impossível:</b> CPU no limite, recompensa maior.</div>
        <div><b>Desafio Diário:</b> mesmo desafio pra todo mundo, todo dia.</div>
      </div>
      <div class="help-section">
        <div class="help-title">🪙 Moedas, Nível e Loja</div>
        <div>Ganhe moedas vencendo partidas, campeonatos, conquistas, sequências
        de vitória e missões diárias. Gaste na Loja pra trocar a cor da bola,
        raquete, tela, console, madeira, moldura, som, fonte e arena. Vitórias
        também dão XP, que sobe seu nível.</div>
      </div>
      <div class="help-section">
        <div class="help-title">📅 Missões e 🏅 Conquistas</div>
        <div>3 missões diferentes por dia (marque pontos, vença partidas, jogue
        modos variados). 18 conquistas pra desbloquear, cada uma com sua
        recompensa em moedas.</div>
      </div>
      <div class="help-section">
        <div>Tudo é salvo automaticamente com o nome que você usar pra entrar —
        use o mesmo nome sempre pra manter seu progresso.</div>
      </div>
    </div>`;
}

function showCreditsOverlay() {
  showOverlay('ℹ️ Créditos', '', [{ label: 'Voltar ao Menu', action: () => showMainMenu() }]);
  document.getElementById('overlayMsg').innerHTML = `
    <div class="credits-body">
      <div><b>Tele Game Vintage</b></div>
      <div>Inspirado nos clássicos de vídeo game de 1977.</div>
      <div>Criado por <b>Wander Pomares</b>.</div>
      <div>Feito com HTML5 Canvas, CSS e JavaScript puro.</div>
    </div>`;
}

/** Encaminha o pedido de "Entrar com um nome primeiro" a partir do menu. */
function requireLoginFromMenu(onReady) {
  if (playerName) { onReady(); return; }
  showOverlay(
    'Entre com seu nome primeiro',
    'Pra ver isso, volte ao jogo e digite um nome de jogador no campo "Entrar".',
    [{ label: 'Voltar ao Menu', action: () => showMainMenu() }]
  );
}

document.querySelectorAll('.menu-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    ensureAudio();
    GameAudio.playMenuConfirm();
    const action = btn.dataset.menuAction;
    hideMainMenu();
    switch (action) {
      case 'jogar':
        revealGameplayControls();
        break;
      case 'campeonato':
        revealGameplayControls();
        document.getElementById('champBtn').click();
        break;
      case 'estatisticas':
        requireLoginFromMenu(() => showStatsOverlay(true));
        break;
      case 'conquistas':
        requireLoginFromMenu(() => showAchievementsOverlay(true));
        break;
      case 'ranking':
        showRankingOverlay(false);
        break;
      case 'loja':
        requireLoginFromMenu(() => showShopOverlay());
        break;
      case 'configuracoes':
        showSettingsOverlay();
        break;
      case 'ajuda':
        showHelpOverlay();
        break;
      case 'creditos':
        showCreditsOverlay();
        break;
    }
  });
});

document.getElementById('menuBtn').addEventListener('click', () => {
  ensureAudio();
  GameAudio.playMenuNavigate();
  showMainMenu();
});

document.getElementById('statsBtn').addEventListener('click', () => showStatsOverlay(false));
document.getElementById('achievementsBtn').addEventListener('click', () => showAchievementsOverlay(false));

// --- Simulação de anúncio de vídeo com recompensa ---
// Isto é só uma simulação (contagem regressiva sem opção de pular), pra testar
// o fluxo do jogo. Pra rodar um anúncio de verdade, é preciso integrar um SDK
// de anúncios (ex: Google AdMob) num app publicado — veja o README do projeto
// Capacitor pra saber como conectar isso de verdade.
function showAdOverlay(onComplete, rewardLabel) {
  const label = rewardLabel || 'ganhar +1 vida';
  let remaining = 6;
  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = '📺 Anúncio (simulado)';
  document.getElementById('overlayMsg').textContent = `Assista até o fim pra ${label}... ${remaining}s`;
  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';
  document.getElementById('overlay').style.display = 'flex';

  const interval = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      document.getElementById('overlayMsg').textContent = `Assista até o fim pra ${label}... ${remaining}s`;
    } else {
      clearInterval(interval);
      document.getElementById('overlayMsg').textContent = 'Vídeo concluído! Recompensa liberada.';
      const btn = document.createElement('button');
      btn.className = 'overlay-btn';
      btn.textContent = 'Continuar';
      btn.onclick = () => { hideOverlay(); onComplete(); };
      actionsEl.appendChild(btn);
    }
  }, 1000);
}

// --- Fogos de artifício: partículas simples desenhadas em canvas ---
let fireworksAnim = null;
function startFireworks() {
  const canvas = document.getElementById('fireworksCanvas');
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const colors = ['#e8a33d', '#c8e6c0', '#d8d4c8', '#c94f3d', '#6fb3d2'];
  let particles = [];

  function burst(x, y) {
    const count = 26;
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 1.5 + Math.random() * 2.2;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }

  let elapsed = 0;
  let nextBurst = 0;

  function frame(dt) {
    elapsed += dt;
    if (elapsed >= nextBurst) {
      burst(canvas.width * (0.25 + Math.random() * 0.5), canvas.height * (0.25 + Math.random() * 0.35));
      nextBurst = elapsed + 350 + Math.random() * 350;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // gravidade leve
      p.life -= 0.018;
    });
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  let lastTime = performance.now();
  function loopFrame(now) {
    const dt = now - lastTime;
    lastTime = now;
    frame(dt);
    fireworksAnim = requestAnimationFrame(loopFrame);
  }
  if (fireworksAnim) cancelAnimationFrame(fireworksAnim);
  fireworksAnim = requestAnimationFrame(loopFrame);
}

function stopFireworks() {
  if (fireworksAnim) {
    cancelAnimationFrame(fireworksAnim);
    fireworksAnim = null;
  }
  const canvas = document.getElementById('fireworksCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Recompensa em moedas por vencer UMA partida (fase do campeonato ou partida
 * do Praticar com meta). Cuida também do bônus de sequência e do desafio
 * diário — tudo num só lugar pra não duplicar essa lógica nos dois modos.
 * @param {number} baseCoins - moedas garantidas só por vencer
 */
function awardWinRewards(baseCoins) {
  if (!playerName) return;
  GameCoins.earn(baseCoins);
  GameAudio.playCoin();

  const streak = GameStats.raw.currentWinStreak;
  if (streak === 5) GameCoins.earn(30);
  else if (streak === 10) GameCoins.earn(80);
  else if (streak === 20) GameCoins.earn(200);

  const dailyDone = GameCoins.recordDailyWin();
  updateCoinDisplay();
  if (dailyDone) {
    const status = GameCoins.getDailyStatus();
    GameAudio.playCoin();
    showAchievementToast({ icon: '🎯', name: `Desafio diário completo! +${status.reward} 🪙`, coins: 0 });
  }

  // XP e nível: sobe junto com as moedas, na mesma proporção da vitória.
  const levelsGained = GameLevels.addXp(Math.round(baseCoins * 1.5));
  if (levelsGained > 0) {
    const info = GameLevels.getInfo();
    const bonus = info.level * 10;
    GameCoins.earn(bonus);
    updateCoinDisplay();
    updateProfileUI();
    GameAudio.playAchievementUnlock();
    vibrate([20, 40, 20]);
    showAchievementToast({ icon: '⭐', name: `Subiu pro nível ${info.level}! +${bonus} 🪙`, coins: 0 });
  }
}

function checkChampionshipEnd() {
  if (!championshipActive) return;
  const track = TRACKS[currentTrack];
  const r = track.rounds[roundIndex];

  if (p1.score >= r.target) {
    pauseLoop();
    GameStats.recordMatch({ result: 'win', mode: currentTrack, difficulty: champDifficulty, pointsFor: p1.score, pointsAgainst: p2.score });
    if (playerName) GameRanking.addEntry({ name: playerName, score: p1.score, mode: currentTrack, difficulty: champDifficulty, timeSeconds: matchSeconds });
    awardWinRewards(20);
    if (playerName) GameMissions.recordMatchResult(true, currentTrack, p2.score === 0);
    checkAndAwardMissions();
    if (roundIndex === track.rounds.length - 1) {
      trophies[currentTrack] = true;
      saveTrophies();
      updateProfileUI();
      GameStats.recordChampionshipWin();
      GameStats.recordTrophyWin();
      GameCoins.earn(100); // bônus extra por conquistar o troféu, além dos 20 da última fase
      updateCoinDisplay();
      checkAchievements();
      GamePlayServices.submitScore('campeonato_' + currentTrack, p1.score); // sem efeito hoje
      GameAds.showInterstitial(); // sem efeito hoje (ADS_ENABLED=false) — ponto certo pra quando ligar de verdade
      playTrophyFanfare();
      vibrate([40, 30, 40, 30, 90]); // vitória: padrão mais longo, mas ainda um pulso finito
      showVictoryOverlay(
        `🏆 Campeão de ${track.label}!`,
        `Você venceu todas as ${track.rounds.length} fases e ganhou o troféu ${track.trophy} de ${track.label}, ${playerName}!`,
        [
          { label: 'Jogar de novo', action: () => startChampionship(currentTrack) },
          { label: 'Modo livre', action: () => endChampionship() },
        ]
      );
    } else {
      checkAchievements();
      const next = track.rounds[roundIndex + 1];
      playRoundWin();
      vibrate([30, 20, 30]);
      showVictoryOverlay('Fase concluída!', `Você venceu o ${r.name} por ${p1.score} a ${p2.score}. Próximo adversário: ${next.name}.`, [
        { label: 'Próxima fase', action: () => { roundIndex++; loadRound(); startLoop(); } },
      ]);
    }
  } else if (p2.score >= r.target) {
    pauseLoop();
    playRoundLose();
    lives--;
    updateChampionshipPanel();
    GameStats.recordMatch({ result: 'loss', mode: currentTrack, difficulty: champDifficulty, pointsFor: p1.score, pointsAgainst: p2.score });
    if (playerName) GameMissions.recordMatchResult(false, currentTrack, false);
    checkAndAwardMissions();
    checkAchievements();
    if (lives > 0) {
      showOverlay('Você perdeu essa fase', `O ${r.name} venceu por ${p2.score} a ${p1.score}. Vidas restantes: ${lives}. Quer tentar de novo?`, [
        { label: 'Tentar de novo', action: () => { loadRound(); startLoop(); } },
        { label: 'Sair do campeonato', action: () => endChampionship() },
      ]);
    } else {
      showOverlay('Suas vidas acabaram!', `O ${r.name} venceu por ${p2.score} a ${p1.score}, e você usou todas as vidas. Assista um vídeo pra ganhar +1 vida e continuar de onde parou.`, [
        {
          label: '📺 Assistir vídeo (+1 vida)',
          action: () => showAdOverlay(() => {
            lives = 1;
            updateChampionshipPanel();
            loadRound();
            startLoop();
          }),
        },
        { label: 'Sair do campeonato', action: () => endChampionship() },
      ]);
    }
  }
}

function resetRound() {
  updatePaddleSize();
  ball.x = W/2; ball.y = H/2;
  ball.vx = (Math.random() > 0.5 ? 1 : -1) * ballBaseSpeed;
  ball.vy = (Math.random() * 4 - 2) || 2.1;
  p1.y = H/2 - paddleH/2;
  p2.y = H/2 - paddleH/2;
  // Reseta o "aprendizado" e a estratégia da CPU: cada partida começa do zero.
  playerHitBias = 0;
  rallyHits = 0;
  cpuStrategy = 'equilibrado';
  cpuStrategyTimer = 360;
  updateScore();
}

let practiceTarget = 5; // meta de pontos no modo livre; 0 = sem limite

// ==============================================================================
// Fase 2, Parte 5 — Etapa 10: Modos Especiais
// (Sobrevivência, Contra o Tempo, Treino Infinito, Modo Impossível, Desafio Diário)
// ==============================================================================

let specialMode = null; // null | 'sobrevivencia' | 'contra_tempo' | 'treino_infinito' | 'impossivel' | 'desafio_diario'

// --- Sobrevivência ---
const SURVIVAL_STARTING_LIVES = 5;
let survivalLives = SURVIVAL_STARTING_LIVES;

// --- Contra o Tempo ---
const TIME_ATTACK_SECONDS = 60;
let timeAttackSecondsLeft = TIME_ATTACK_SECONDS;

// --- Desafio Diário: mesmo desafio pra todo mundo no mesmo dia, calculado por data ---
let dailyChallengeConfig = null;

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Hash simples e determinístico (mesma string sempre dá o mesmo número). */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Monta o desafio do dia: mesmo modo/dificuldade/meta pra todo mundo, na mesma data. */
function getDailyChallengeConfig() {
  const date = todayDateKey();
  const seed = simpleHash(date);
  const modes = ['paredao', 'tenis', 'futebol', 'barreira'];
  const diffs = ['facil', 'medio', 'dificil'];
  return {
    date,
    mode: modes[seed % modes.length],
    difficulty: diffs[Math.floor(seed / 7) % diffs.length],
    target: 3 + (seed % 4), // 3 a 6 pontos
  };
}

async function isDailyChallengeCompletedToday() {
  if (!playerName) return false;
  const raw = await GameStorage.getJSON('telegamevintage-dailychallenge:' + playerName, null);
  return !!(raw && raw.date === todayDateKey() && raw.completed);
}

/** Um dia antes de `dateStr` (formato AAAA-MM-DD), pra checar sequência de dias seguidos. */
function previousDateKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function markDailyChallengeCompleted() {
  if (!playerName) return;
  const raw = await GameStorage.getJSON('telegamevintage-dailychallenge:' + playerName, null);
  const today = todayDateKey();
  // Sequência continua se a última vez completada foi ONTEM; senão recomeça em 1.
  const streak = (raw && raw.date === previousDateKey(today)) ? (raw.streak || 1) + 1 : 1;
  await GameStorage.setJSON('telegamevintage-dailychallenge:' + playerName, { date: today, completed: true, streak });
}

async function getDailyChallengeStreak() {
  if (!playerName) return 0;
  const raw = await GameStorage.getJSON('telegamevintage-dailychallenge:' + playerName, null);
  if (!raw) return 0;
  // Sequência só "conta" se foi completada hoje ou ontem (senão já quebrou e ainda não foi renovada).
  if (raw.date === todayDateKey() || raw.date === previousDateKey(todayDateKey())) return raw.streak || 0;
  return 0;
}

/** Painel pequeno mostrado durante um modo especial (vidas, tempo, etc). */
function updateSpecialModeBanner() {
  const panel = document.getElementById('specialModePanel');
  if (!specialMode) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  if (specialMode === 'sobrevivencia') {
    const hearts = '❤️'.repeat(Math.max(survivalLives, 0)) + '🖤'.repeat(Math.max(SURVIVAL_STARTING_LIVES - survivalLives, 0));
    panel.textContent = `🧟 Sobrevivência · Pontos: ${p1.score} · Vidas: ${hearts}`;
  } else if (specialMode === 'contra_tempo') {
    panel.textContent = `⏱ Contra o Tempo · ${timeAttackSecondsLeft}s restantes · Pontos: ${p1.score}`;
  } else if (specialMode === 'treino_infinito') {
    panel.textContent = `♾️ Treino Infinito · sem placar, só pra pegar o jeito`;
  } else if (specialMode === 'impossivel') {
    panel.textContent = `💀 Modo Impossível · até ${practiceTarget} pontos`;
  } else if (specialMode === 'desafio_diario' && dailyChallengeConfig) {
    const modeNames = { paredao: 'Paredão', tenis: 'Tênis', futebol: 'Futebol', barreira: 'Barreira' };
    panel.textContent = `🎯 Desafio Diário · ${modeNames[dailyChallengeConfig.mode]} · até ${dailyChallengeConfig.target} pontos`;
  }
}

/** Sai de qualquer modo especial e volta pro Praticar comum. */
function exitSpecialMode() {
  specialMode = null;
  practiceDifficulty = practiceDifficulty === 'impossivel' ? 'medio' : practiceDifficulty;
  practiceTarget = 5;
  applyPracticeDifficulty();
  document.getElementById('targetRow').style.display = 'flex';
  document.getElementById('practiceDifficultyRow').style.display = 'flex';
  updateSpecialModeBanner();
  p1.score = 0; p2.score = 0;
  resetRound();
  draw();
}

function hideNormalPracticeControls() {
  document.getElementById('targetRow').style.display = 'none';
  document.getElementById('practiceDifficultyRow').style.display = 'none';
}

function startInfiniteTraining() {
  specialMode = 'treino_infinito';
  practiceTarget = 0;
  hideNormalPracticeControls();
  p1.score = 0; p2.score = 0;
  resetRound();
  updateSpecialModeBanner();
  draw();
}

function startSurvivalMode() {
  specialMode = 'sobrevivencia';
  survivalLives = SURVIVAL_STARTING_LIVES;
  practiceTarget = 0; // sem meta fixa: o fim é quando as vidas acabam
  practiceDifficulty = 'facil';
  applyPracticeDifficulty(); // começa fácil, escala a cada ponto (ver checkSurvivalPoint)
  hideNormalPracticeControls();
  p1.score = 0; p2.score = 0;
  resetRound();
  updateSpecialModeBanner();
  draw();
}

function checkSurvivalPoint(scorer) {
  if (scorer === 'p2') {
    survivalLives--;
    updateSpecialModeBanner();
    if (survivalLives <= 0) {
      pauseLoop();
      playRoundLose();
      const finalScore = p1.score;
      if (playerName) {
        GameRanking.addEntry({ name: playerName, score: finalScore, mode, difficulty: 'sobrevivencia', timeSeconds: matchSeconds });
        GameStats.recordMatch({ result: 'loss', mode, difficulty: 'sobrevivencia', pointsFor: finalScore, pointsAgainst: SURVIVAL_STARTING_LIVES });
        checkAchievements();
      }
      showOverlay('🧟 Fim da Sobrevivência', `Você aguentou até marcar ${finalScore} ponto(s) antes de perder todas as vidas!`, [
        { label: 'Jogar de novo', action: () => startSurvivalMode() },
        { label: 'Sair', action: () => exitSpecialMode() },
      ]);
    }
  } else {
    // Ponto do jogador: a CPU fica um pouco mais rápida a cada ponto sobrevivido
    cpuSpeed = Math.min(cpuSpeed * 1.05, 6.5);
    ballBaseSpeed = Math.min(ballBaseSpeed * 1.035, 6);
    updateSpecialModeBanner();
  }
}

function startTimeAttackMode() {
  specialMode = 'contra_tempo';
  timeAttackSecondsLeft = TIME_ATTACK_SECONDS;
  practiceTarget = 0; // esse modo só termina pelo cronômetro, não por placar
  hideNormalPracticeControls();
  p1.score = 0; p2.score = 0;
  resetRound();
  updateSpecialModeBanner();
  draw();
}

/** Chamado uma vez por segundo (mesmo laço que já contava o tempo total jogado). */
function tickTimeAttack() {
  if (specialMode !== 'contra_tempo' || !running) return;
  timeAttackSecondsLeft--;
  updateSpecialModeBanner();
  if (timeAttackSecondsLeft <= 0) {
    pauseLoop();
    const finalScore = p1.score;
    if (playerName) {
      GameRanking.addEntry({ name: playerName, score: finalScore, mode, difficulty: 'contra_tempo', timeSeconds: TIME_ATTACK_SECONDS });
      GameStats.recordMatch({ result: finalScore > 0 ? 'win' : 'loss', mode, difficulty: practiceDifficulty, pointsFor: finalScore, pointsAgainst: p2.score });
      checkAchievements();
    }
    playRoundWin();
    showVictoryOverlay('⏱ Tempo esgotado!', `Você marcou ${finalScore} ponto(s) em ${TIME_ATTACK_SECONDS} segundos.`, [
      { label: 'Jogar de novo', action: () => startTimeAttackMode() },
      { label: 'Sair', action: () => exitSpecialMode() },
    ]);
  }
}

function startImpossibleMode() {
  specialMode = 'impossivel';
  practiceDifficulty = 'impossivel';
  applyPracticeDifficulty();
  practiceTarget = 5;
  hideNormalPracticeControls();
  p1.score = 0; p2.score = 0;
  resetRound();
  updateSpecialModeBanner();
  draw();
}

async function startDailyChallengeMode() {
  const cfg = getDailyChallengeConfig();
  dailyChallengeConfig = cfg;
  specialMode = 'desafio_diario';
  mode = cfg.mode;
  updatePaddleSize();
  const preset = PRACTICE_DIFFICULTY_PRESETS[cfg.difficulty];
  cpuSpeed = preset.cpuSpeed;
  cpuMargin = preset.cpuMargin;
  ballBaseSpeed = preset.ballBaseSpeed;
  practiceTarget = cfg.target;
  hideNormalPracticeControls();
  document.querySelectorAll('.dial-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  p1.score = 0; p2.score = 0;
  resetRound();
  updateSpecialModeBanner();
  draw();
}

/** Chamado de dentro de checkPracticeEnd() quando o jogador vence, pra dar o bônus especial. */
async function handleSpecialModeWin() {
  if (specialMode === 'impossivel') {
    GameCoins.earn(150);
    GameAudio.playCoin();
    updateCoinDisplay();
    showAchievementToast({ icon: '💀', name: 'Modo Impossível vencido! +150 🪙', coins: 0 });
  } else if (specialMode === 'desafio_diario') {
    const already = await isDailyChallengeCompletedToday();
    if (!already) {
      await markDailyChallengeCompleted();
      GameCoins.earn(80);
      GameAudio.playCoin();
      updateCoinDisplay();
      showAchievementToast({ icon: '🎯', name: 'Desafio Diário concluído! +80 🪙', coins: 0 });
    }
  }
}

// --- Tela de seleção dos modos especiais (aberta pelo botão no menu do Praticar) ---
function showSpecialModesOverlay() {
  document.getElementById('overlayTrophy').style.display = 'none';
  stopFireworks();
  document.getElementById('overlayTitle').textContent = '🎮 Modos Especiais';

  const rows = [
    { icon: '🧟', name: 'Sobrevivência', desc: `${SURVIVAL_STARTING_LIVES} vidas, dificuldade cresce a cada ponto seu. Até onde você chega?`, action: startSurvivalMode },
    { icon: '⏱', name: 'Contra o Tempo', desc: `${TIME_ATTACK_SECONDS} segundos pra marcar o máximo de pontos possível.`, action: startTimeAttackMode },
    { icon: '♾️', name: 'Treino Infinito', desc: 'Sem placar, sem fim — só pra pegar o jeito da raquete.', action: startInfiniteTraining },
    { icon: '💀', name: 'Modo Impossível', desc: 'CPU no limite absoluto. Vencer aqui paga bônus de 150 moedas.', action: startImpossibleMode },
    { icon: '🎯', name: 'Desafio Diário', desc: 'O mesmo desafio pra todo mundo hoje. Só paga bônus na primeira vez do dia.', action: startDailyChallengeMode },
  ];

  document.getElementById('overlayMsg').innerHTML = `
    <div class="achievements-list">
      ${rows.map((r, i) => `
        <div class="achievement-row unlocked">
          <span class="icon">${r.icon}</span>
          <div class="info">
            <div class="name">${r.name}</div>
            <div class="desc">${r.desc}</div>
          </div>
          <button class="overlay-btn shop-action" data-special-mode="${i}">Jogar</button>
        </div>
      `).join('')}
    </div>`;

  document.querySelectorAll('[data-special-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = rows[Number(btn.dataset.specialMode)];
      hideOverlay();
      revealGameplayControls();
      GameAudio.playMenuConfirm();
      row.action();
    });
  });

  const actionsEl = document.getElementById('overlayActions');
  actionsEl.innerHTML = '';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'overlay-btn secondary';
  closeBtn.textContent = 'Fechar';
  closeBtn.onclick = hideOverlay;
  actionsEl.appendChild(closeBtn);

  document.getElementById('overlay').style.display = 'flex';
}

// --- Cronômetro da partida ---
let matchSeconds = 0;

function shouldShowTimer() {
  return championshipActive || practiceTarget !== 0;
}

/**
 * No Paredão o jogador nunca marca ponto (só rebate contra a parede) — quem
 * marca é só a CPU, quando a bola passa pela raquete do jogador. Por isso, a
 * única forma do jogador "vencer" é sobreviver até o cronômetro zerar.
 * Retorna null quando isso não se aplica (outros modos).
 */
function getParedaoTimeLimit() {
  if (specialMode) return null; // modos especiais (Sobrevivência, Contra o Tempo, etc.) têm sua própria lógica
  if (championshipActive && currentTrack === 'paredao') {
    const r = TRACKS.paredao.rounds[roundIndex];
    return r.target * 12; // fases mais difíceis (meta maior de erros) pedem mais tempo de sobrevivência
  }
  if (!championshipActive && mode === 'paredao' && practiceTarget) {
    return 45;
  }
  return null;
}

/** Roda a cada segundo: se o tempo de sobrevivência do Paredão acabou, força a vitória. */
function tickParedaoSurvival() {
  if (!running) return;
  const limit = getParedaoTimeLimit();
  if (limit === null || matchSeconds < limit) return;
  if (championshipActive) {
    p1.score = TRACKS.paredao.rounds[roundIndex].target; // dispara o mesmo caminho de vitória já existente
    checkChampionshipEnd();
  } else {
    p1.score = practiceTarget;
    checkPracticeEnd();
  }
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  const limit = getParedaoTimeLimit();
  if (limit !== null) {
    const remaining = Math.max(0, limit - matchSeconds);
    document.getElementById('timerDisplay').textContent = `⏱ ${formatTime(remaining)} pra sobreviver`;
  } else {
    document.getElementById('timerDisplay').textContent = `⏱ ${formatTime(matchSeconds)}`;
  }
}

function updateTimerVisibility() {
  document.getElementById('timerDisplay').style.display = shouldShowTimer() ? 'inline' : 'none';
}

function resetMatchTimer() {
  matchSeconds = 0;
  updateTimerDisplay();
  updateTimerVisibility();
}

setInterval(() => {
  if (running && shouldShowTimer()) {
    matchSeconds++;
    updateTimerDisplay();
    tickParedaoSurvival();
  }
}, 1000);

// Tempo total jogado (estatísticas): conta enquanto o jogo está rodando,
// em QUALQUER modo — inclusive Praticar "Livre", que não mostra o cronômetro
// da partida mas ainda conta pro total de horas jogadas.
setInterval(() => {
  if (running) GameStats.addPlaytimeSecond();
  tickTimeAttack();
}, 1000);

document.querySelectorAll('#targetRow .target-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    ensureAudio();
    GameAudio.playMenuNavigate();
    document.querySelectorAll('#targetRow .target-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    practiceTarget = parseInt(btn.dataset.target, 10);
    p1.score = 0; p2.score = 0;
    updateScore();
    updateTimerVisibility();
    resetMatchTimer();
  });
});

/** Reavalia as missões diárias e paga a recompensa de qualquer uma recém-concluída. */
function checkAndAwardMissions() {
  if (!playerName) return;
  GameMissions.checkMissions((m) => {
    GameCoins.earn(m.reward);
    GameAudio.playCoin();
    updateCoinDisplay();
    showAchievementToast({ icon: m.icon, name: `Missão concluída: ${m.label} +${m.reward} 🪙`, coins: 0 });
  });
}

function checkPracticeEnd() {
  if (championshipActive || !practiceTarget) return;
  if (p1.score >= practiceTarget) {
    pauseLoop();
    playRoundWin();
    vibrate([40, 30, 40, 30, 90]); // vitória de partida
    GameStats.recordMatch({ result: 'win', mode, difficulty: practiceDifficulty, pointsFor: p1.score, pointsAgainst: p2.score });
    if (playerName) GameRanking.addEntry({ name: playerName, score: p1.score, mode, difficulty: practiceDifficulty, timeSeconds: matchSeconds });
    awardWinRewards(10);
    if (playerName) GameMissions.recordMatchResult(true, mode, p2.score === 0);
    checkAndAwardMissions();
    checkAchievements();
    handleSpecialModeWin();
    showVictoryOverlay('Você venceu! 🏆', `Jogador 1 venceu por ${p1.score} a ${p2.score}.`, [
      { label: 'Jogar de novo', action: () => { p1.score = 0; p2.score = 0; resetRound(); draw(); } },
    ]);
  } else if (p2.score >= practiceTarget) {
    pauseLoop();
    playRoundLose();
    GameStats.recordMatch({ result: 'loss', mode, difficulty: practiceDifficulty, pointsFor: p1.score, pointsAgainst: p2.score });
    if (playerName) GameMissions.recordMatchResult(false, mode, false);
    checkAndAwardMissions();
    checkAchievements();
    showOverlay('Fim de jogo', `A CPU venceu por ${p2.score} a ${p1.score}.`, [
      { label: 'Jogar de novo', action: () => { p1.score = 0; p2.score = 0; resetRound(); draw(); } },
    ]);
  }
}

function updateScore() {
  const pad = n => n.toString().padStart(2, '0');
  let goal = '';
  if (!championshipActive && practiceTarget) {
    goal = mode === 'paredao' ? ' (sobreviva ao tempo!)' : ` (até ${practiceTarget})`;
  }
  document.getElementById('score').textContent = `${pad(p1.score)} : ${pad(p2.score)}${goal}`;
}

// ============================================================================
// NÚCLEO DO JOGO: física, IA e renderização
// Toda a física é calculada em "fatores de dt" — 1.0 equivale a um frame de
// 60fps. Assim o jogo roda na mesma velocidade em telas de 60Hz, 90Hz ou 120Hz.
// ============================================================================

/** Limita um valor entre min e max (usado o tempo todo, vale ter à mão). */
function clamp(value, min, max) {
  return value < min ? min : (value > max ? max : value);
}

// --- IA da CPU ---------------------------------------------------------------
// A CPU não "cola" mais na bola: ela PREVÊ onde a bola vai chegar no lado dela,
// simulando a trajetória (inclusive as batidas no teto/chão). A dificuldade
// entra como erro de previsão + tempo de reação, não como velocidade impossível.

let cpuTargetY = H / 2;        // para onde a CPU está mirando agora
let cpuReactionTimer = 0;      // conta quanto falta pra CPU reavaliar a jogada
let cpuHasCommitted = false;   // já "leu" a jogada nesta aproximação?
let cpuWasBallComing = false;  // usado pra detectar o início de uma nova aproximação

// --- Aprendizado durante a partida ---
// A CPU observa em que ponto da raquete o jogador costuma bater, e usa isso
// pra se posicionar melhor entre uma troca e outra. É "memória de curto prazo":
// zera a cada partida nova (não persiste — ver resetRound()).
let playerHitBias = 0; // -1 (jogador bate mais no topo) a +1 (mais na base)

// --- Progressão dentro do rally ---
// Quanto mais trocas de bola sem ninguém pontuar, mais "focada" a CPU fica
// (até um limite) — como se ela entrasse no ritmo da jogada.
let rallyHits = 0;

// --- Mudança de estratégia ---
// A CPU alterna entre posturas a cada alguns segundos, pra não ter um padrão
// único e fixo o jogo inteiro.
let cpuStrategy = 'equilibrado'; // 'equilibrado' | 'agressivo' | 'cauteloso'
let cpuStrategyTimer = 360; // ~6s a 60fps; primeira troca já no começo da partida

const CPU_STRATEGIES = {
  equilibrado: { marginMult: 1.0,  urgencyMult: 1.0,  lapseMult: 1.0 },
  agressivo:   { marginMult: 0.72, urgencyMult: 1.25, lapseMult: 1.35 }, // mais preciso e rápido, mas erra mais feio quando erra
  cauteloso:   { marginMult: 1.35, urgencyMult: 0.8,  lapseMult: 0.6  }, // mais lento, mas raramente falha feio
};

/**
 * Prevê em que altura (Y) a bola vai cruzar uma certa posição X, levando em
 * conta os rebotes no teto/chão E, no modo Barreira, se a bola vai conseguir
 * passar pela abertura móvel ou vai bater na parte sólida da barreira antes
 * de chegar lá (nesse caso ela nunca chega no lado da CPU por esse caminho).
 */
function predictBallYAt(targetX) {
  // Se a bola está indo para o outro lado, não há o que prever.
  if (ball.vx === 0) return ball.y;

  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  let vy = ball.vy;
  let elapsedSteps = 0; // "passos" já simulados, usado pra prever a fase futura da barreira
  let guard = 0; // trava de segurança contra laços infinitos

  const barrierActive = mode === 'barreira';
  const barrierLeft = W / 2 - barrierThickness / 2;
  const barrierRight = W / 2 + barrierThickness / 2;
  let crossedBarrier = !barrierActive; // fora do modo Barreira, "já passou" (não se aplica)

  while (((vx > 0 && x < targetX) || (vx < 0 && x > targetX)) && guard++ < 500) {
    const stepsToTarget = (targetX - x) / vx;

    // Quantos passos até bater no teto ou no chão?
    let stepsToWall = Infinity;
    if (vy > 0) stepsToWall = ((H - ball.r) - y) / vy;
    else if (vy < 0) stepsToWall = (ball.r - y) / vy;

    // Quantos passos até cruzar a posição X da barreira (só conta uma vez por chamada)
    let stepsToBarrier = Infinity;
    if (barrierActive && !crossedBarrier) {
      const barrierX = vx > 0 ? barrierLeft - ball.r : barrierRight + ball.r;
      if ((vx > 0 && barrierX > x) || (vx < 0 && barrierX < x)) {
        stepsToBarrier = (barrierX - x) / vx;
      }
    }

    if (stepsToBarrier < stepsToWall && stepsToBarrier < stepsToTarget) {
      // Chega na barreira antes de bater na parede ou no alvo
      x += vx * stepsToBarrier;
      y += vy * stepsToBarrier;
      elapsedSteps += stepsToBarrier;
      crossedBarrier = true;

      // A abertura se move com o tempo — calcula onde ela vai estar quando a
      // bola realmente chegar (não onde está agora).
      const futurePhase = barrierPhase + 0.02 * elapsedSteps;
      const gapCenter = H / 2 + barrierGapAmplitude * Math.sin(futurePhase);
      const gapTop = gapCenter - barrierGapHeight / 2;
      const gapBottom = gapCenter + barrierGapHeight / 2;

      if (y < gapTop || y > gapBottom) {
        // Bate na parte sólida: rebate de volta e nunca chega no lado da CPU
        // por essa trajetória. Não há o que perseguir agora — volta ao centro.
        return H / 2;
      }
      // Passou pela abertura: a simulação continua normalmente a partir daqui
    } else if (stepsToWall < stepsToTarget) {
      // Bate na parede antes de chegar: avança até lá e inverte o Y
      x += vx * stepsToWall;
      y += vy * stepsToWall;
      elapsedSteps += stepsToWall;
      vy = -vy;
    } else {
      // Chega ao destino sem bater em nada
      x = targetX;
      y += vy * stepsToTarget;
      break;
    }
  }
  return clamp(y, ball.r, H - ball.r);
}

/**
 * Move a raquete da CPU. Estratégia:
 *  - Bola vindo em direção à CPU  -> mira na previsão (com erro proporcional à dificuldade)
 *  - Bola indo para o jogador     -> volta pra uma posição levemente influenciada
 *    pelo padrão de tacadas do jogador nesta partida (aprendizado)
 * `cpuMargin` funciona como "imprecisão": quanto maior, mais fácil.
 */
function updateCPU(dtFactor) {
  const cpuX = W - paddleW - 6;
  const ballComing = ball.vx > 0;

  // Troca de estratégia de tempos em tempos, pra CPU não ter um padrão único.
  cpuStrategyTimer -= dtFactor;
  if (cpuStrategyTimer <= 0) {
    const options = ['equilibrado', 'agressivo', 'cauteloso'];
    cpuStrategy = options[Math.floor(Math.random() * options.length)];
    cpuStrategyTimer = 300 + Math.random() * 300; // troca de novo em 5-10s
  }
  const strategy = CPU_STRATEGIES[cpuStrategy];
  const effectiveMargin = cpuMargin * strategy.marginMult * rallyFocusFactor();

  // Na Barreira, cada vez que a bola bate na parte sólida ela volta pro
  // jogador rebater de novo — e cada rebatida acelera a bola, igual em
  // qualquer troca. Isso significa que uma partida de Barreira acumula MUITO
  // mais velocidade antes do ponto ser decidido do que em Tênis/Futebol, e a
  // CPU fica sem tempo de reação suficiente pra chegar no alvo. Compensamos
  // dando um reforço de velocidade só nesse modo, sem mexer nos outros.
  const barreiraBoost = mode === 'barreira' ? 1.35 : 1;
  const effectiveCpuSpeed = cpuSpeed * barreiraBoost;

  // Detecta o início de uma nova aproximação (a bola acabou de vir na direção
  // da CPU). É nesse momento que ela "lê" a jogada e se compromete com o alvo.
  if (ballComing !== cpuWasBallComing) {
    cpuWasBallComing = ballComing;
    cpuHasCommitted = false;
  }

  if (ballComing && !cpuHasCommitted) {
    cpuHasCommitted = true;
    const predicted = predictBallYAt(cpuX);

    // O erro cresce com a dificuldade escolhida E com a velocidade da bola:
    // bolas rápidas são mais difíceis de ler, como para um jogador de verdade.
    const speedFactor = 1 + Math.hypot(ball.vx, ball.vy) / 7;
    let error = (Math.random() * 2 - 1) * effectiveMargin * 1.7 * speedFactor;

    // Lapso: de vez em quando a CPU lê a jogada errado. Como a leitura vale
    // para a aproximação inteira, o lapso realmente custa o ponto — é isso que
    // mantém até o nível difícil batível. A estratégia "agressiva" arrisca mais.
    const lapseChance = clamp((0.10 + cpuMargin * 0.012) * strategy.lapseMult, 0.05, 0.42);
    if (Math.random() < lapseChance) {
      error += (Math.random() < 0.5 ? -1 : 1) * (26 + Math.random() * 30);
    }

    cpuTargetY = clamp(predicted + error, ball.r, H - ball.r);
    cpuReactionTimer = clamp(effectiveMargin * 0.55, 1.2, 12);
  }

  cpuReactionTimer -= dtFactor;
  if (cpuReactionTimer <= 0) {
    cpuReactionTimer = clamp(effectiveMargin * 0.55, 1.2, 12); // em frames de 60fps

    if (!ballComing) {
      // Descansa numa posição levemente puxada pra onde o jogador costuma
      // bater nesta partida (aprendizado), com uma variação pra não ficar robótico.
      cpuTargetY = H / 2 + playerHitBias * 42 + (Math.random() * 2 - 1) * 18;
      cpuTargetY = clamp(cpuTargetY, ball.r, H - ball.r);
    } else if (ball.x > W * 0.72) {
      // Só bem perto do fim é que a CPU corrige a leitura — e quanto mais fácil
      // o nível, menos ela consegue corrigir.
      const refineStrength = clamp(1 - effectiveMargin / 20, 0.15, 0.9);
      const predicted = predictBallYAt(cpuX);
      cpuTargetY += (predicted - cpuTargetY) * refineStrength;
      cpuTargetY = clamp(cpuTargetY, ball.r, H - ball.r);
    }
  }

  // Move suavemente na direção do alvo, sem tremer quando já está alinhada
  const center = p2.y + paddleH / 2;
  const diff = cpuTargetY - center;
  const deadZone = 2.5;

  if (Math.abs(diff) > deadZone) {
    // Quando a bola está longe, a CPU não corre em velocidade máxima:
    // isso a deixa forte, mas ainda batível no nível difícil.
    const urgency = (ballComing ? 1 : 0.45) * strategy.urgencyMult;
    const move = clamp(diff, -effectiveCpuSpeed * urgency, effectiveCpuSpeed * urgency);
    p2.y += move * dtFactor;
  }
  p2.y = clamp(p2.y, 0, H - paddleH);
}

/**
 * Quanto mais a bola troca de lado sem ninguém pontuar, mais "focada" a CPU
 * fica — até um limite (nunca chega a ficar perfeita). Isso faz o jogo
 * escalar dentro de um rally longo, em vez de ficar sempre no mesmo nível.
 */
function rallyFocusFactor() {
  return clamp(1 - rallyHits * 0.025, 0.55, 1);
}

/** Move a raquete do jogador conforme teclado e botões de toque. */
function movePlayer(dtFactor) {
  // O arraste na tela já define p1.y diretamente (posição 1:1 com o dedo),
  // então aqui tratamos só teclado e os botões ▲/▼.
  if (isDraggingPaddle) {
    p1.y = clamp(p1.y, 0, H - paddleH);
    return;
  }

  const kbSpeed = 6;
  const touchSpeed = 4.6;

  let delta = 0;
  if (keys['w'] || keys['W'] || keys['ArrowUp']) delta -= kbSpeed;
  if (keys['s'] || keys['S'] || keys['ArrowDown']) delta += kbSpeed;
  if (keys['touchP1Up']) delta -= touchSpeed;
  if (keys['touchP1Down']) delta += touchSpeed;

  p1.y = clamp(p1.y + delta * dtFactor, 0, H - paddleH);
}

function movePaddles(dtFactor) {
  movePlayer(dtFactor);
  updateCPU(dtFactor);
}

// --- Partículas de colisão ---------------------------------------------------
// Bem leves: poucas partículas, vida curta, sem sombra/blur (custo quase zero).

const MAX_PARTICLES = 60; // teto de segurança pra nunca pesar no celular

function spawnHitParticles(x, y, count, color) {
  if (hitParticles.length > MAX_PARTICLES) return; // já tem partícula demais, ignora
  const scaledCount = effectsLevel === 'minimo' ? Math.ceil(count * 0.4)
                     : effectsLevel === 'maximo' ? Math.ceil(count * 1.6)
                     : count;
  for (let i = 0; i < scaledCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.6 + Math.random() * 1.4;
    hitParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: color || paddleColor,
    });
  }
}

function updateParticles(dtFactor) {
  if (hitParticles.length === 0) return;
  for (let i = hitParticles.length - 1; i >= 0; i--) {
    const p = hitParticles[i];
    p.x += p.vx * dtFactor;
    p.y += p.vy * dtFactor;
    p.life -= 0.045 * dtFactor;
    if (p.life <= 0) hitParticles.splice(i, 1);
  }
}

// --- Pontuação ---------------------------------------------------------------

/**
 * Marca um ponto e reinicia a bola no centro. Antes essa lógica estava repetida
 * em 5 lugares diferentes dentro do step(); agora é uma função só.
 * @param {'p1'|'p2'} scorer - quem marcou
 */
function awardPoint(scorer) {
  // Treino Infinito: a bola só volta pro centro, sem contar ponto nem checar fim de jogo.
  if (specialMode === 'treino_infinito') {
    playScorePoint();
    resetBallToCenter(scorer);
    return;
  }

  if (scorer === 'p1') {
    p1.score++;
    if (playerName) GameMissions.recordPointsScored(1);
  } else {
    p2.score++;
  }

  rallyHits = 0; // novo rally começa "fresco"

  updateScore();
  pulseScore();
  playScorePoint();
  vibrate(60); // pulso único e curto ao marcar/levar ponto
  resetBallToCenter(scorer);

  if (specialMode === 'sobrevivencia') { checkSurvivalPoint(scorer); return; }
  if (specialMode === 'contra_tempo') { return; } // esse modo só termina pelo cronômetro

  checkChampionshipEnd();
  checkPracticeEnd();
}

/** Animação rápida de destaque no placar quando alguém pontua. */
function pulseScore() {
  const el = document.getElementById('score');
  el.classList.remove('pulse');
  void el.offsetWidth; // reinicia a animação CSS
  el.classList.add('pulse');
}

/** Bola volta ao centro, saindo na direção de quem sofreu o ponto. */
function resetBallToCenter(scorer) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = (scorer === 'p1' ? -1 : 1) * ballBaseSpeed;
  ball.vy = (Math.random() * 2 - 1) * 2 || 1.5;
  ballTrail.length = 0; // limpa o rastro pra bola não "esticar" pelo meio da tela
}

// --- Colisões ----------------------------------------------------------------

const MAX_BALL_SPEED = 9;    // teto de velocidade (evita a bola ficar incontrolável)
const RALLY_SPEEDUP = 1.065; // a cada troca a bola fica um pouco mais rápida:
                             // é o que faz o rally escalar até alguém não alcançar

/**
 * Trata a rebatida numa raquete: inverte a direção, acelera um pouco e calcula
 * o ângulo de saída pelo PONTO DE CONTATO (bater na ponta manda a bola mais
 * aberta; bater no meio manda mais reta) — igual aos Pong clássicos.
 */
function bounceOffPaddle(paddle, paddleX, isLeftPaddle) {
  const relativeHit = (ball.y - (paddle.y + paddleH / 2)) / (paddleH / 2); // -1 (topo) a +1 (base)
  const clampedHit = clamp(relativeHit, -1, 1);

  // Aprendizado: só quando é o JOGADOR (raquete esquerda) batendo, a CPU vai
  // memorizando aos poucos pra onde ele costuma mandar a bola nesta partida.
  if (isLeftPaddle) {
    playerHitBias = playerHitBias * 0.85 + clampedHit * 0.15;
  }
  rallyHits++; // rally fica mais disputado a cada troca (ver rallyFocusFactor)

  // Ângulo de saída: até ~55° a partir da horizontal
  const maxAngle = Math.PI * 0.31;
  const angle = clampedHit * maxAngle;

  // Velocidade total atual, com um leve ganho por troca de bola
  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const newSpeed = Math.min(currentSpeed * RALLY_SPEEDUP, MAX_BALL_SPEED);

  const direction = isLeftPaddle ? 1 : -1;
  ball.vx = direction * newSpeed * Math.cos(angle);
  ball.vy = newSpeed * Math.sin(angle);

  // Pequena variação aleatória: impede que a bola caia sempre no mesmo padrão
  ball.vy += (Math.random() * 2 - 1) * 0.25;

  // Nunca deixa a bola 100% horizontal (senão vira um pingue-pongue infinito)
  if (Math.abs(ball.vy) < 0.55) ball.vy = ball.vy < 0 ? -0.55 : 0.55;

  // Reposiciona a bola encostada na raquete, evitando colidir de novo no mesmo frame
  ball.x = isLeftPaddle ? paddleX + ball.r : paddleX - ball.r;

  playPaddleHit();
  vibrate(15); // toque bem curtinho na rebatida
  spawnHitParticles(ball.x, ball.y, 5);
}

/** Rebote no teto/chão. */
function bounceOffWall(atTop) {
  ball.y = atTop ? ball.r : H - ball.r;
  ball.vy *= -1;
  playWallBounce();
  vibrate(10);
  spawnHitParticles(ball.x, ball.y, 3, '#9fd39a');
}

// --- Passo de simulação ------------------------------------------------------

/**
 * Avança a física em UM sub-passo. É chamado várias vezes por frame quando a
 * bola está rápida, pra ela nunca "atravessar" uma raquete entre dois frames.
 */
function simulate(dtFactor) {
  movePaddles(dtFactor);

  if (mode === 'barreira') barrierPhase += 0.02 * dtFactor;

  ball.x += ball.vx * dtFactor;
  ball.y += ball.vy * dtFactor;

  // --- Teto e chão ---
  if (ball.y - ball.r < 0) bounceOffWall(true);
  else if (ball.y + ball.r > H) bounceOffWall(false);

  // --- Barreira central (modo Barreira) ---
  if (mode === 'barreira') {
    const gapCenter = H / 2 + barrierGapAmplitude * Math.sin(barrierPhase);
    const gapTop = gapCenter - barrierGapHeight / 2;
    const gapBottom = gapCenter + barrierGapHeight / 2;
    const barrierLeft = W / 2 - barrierThickness / 2;
    const barrierRight = W / 2 + barrierThickness / 2;

    if (ball.x + ball.r > barrierLeft && ball.x - ball.r < barrierRight) {
      if (ball.y < gapTop || ball.y > gapBottom) {
        ball.vx *= -1;
        ball.x = ball.vx < 0 ? barrierLeft - ball.r : barrierRight + ball.r;
        playWallBounce();
        vibrate(12);
        spawnHitParticles(ball.x, ball.y, 4);
      }
      // dentro da abertura, a bola passa livremente
    }
  }

  // --- Raquetes ---
  const p1Face = paddleW + 6; // borda direita da raquete do jogador
  if (ball.vx < 0 && ball.x - ball.r < p1Face &&
      ball.y > p1.y && ball.y < p1.y + paddleH) {
    bounceOffPaddle(p1, p1Face, true);
  }

  // No Paredão, a raquete da CPU não participa da colisão — é você contra a
  // parede. Sem isso, a raquete da CPU quase sempre intercepta a bola antes
  // dela chegar na parede, e o jogador nunca conseguiria pontuar de verdade.
  if (mode !== 'paredao') {
    const p2Face = W - paddleW - 6; // borda esquerda da raquete da CPU
    if (ball.vx > 0 && ball.x + ball.r > p2Face &&
        ball.y > p2.y && ball.y < p2.y + paddleH) {
      bounceOffPaddle(p2, p2Face, false);
    }
  }

  // --- Laterais: ponto, parede ou trave, conforme o modo ---
  if (mode === 'paredao') {
    // Direita é uma parede sólida: a bola sempre volta, sem marcar ponto pra
    // ninguém — é só o jogador rebatendo contra o tempo. O ÚNICO jeito de
    // pontuar nesse modo é a CPU, quando a bola passa pela raquete do jogador.
    if (ball.x + ball.r > W) {
      ball.x = W - ball.r;
      ball.vx *= -1;
      playWallBounce();
      spawnHitParticles(ball.x, ball.y, 3);
    }
    if (ball.x - ball.r < 0) awardPoint('p2');

  } else if (mode === 'futebol') {
    // Só é gol dentro da faixa central; fora dela a bola bate na "trave"
    const goalTop = H / 2 - goalHalf;
    const goalBottom = H / 2 + goalHalf;

    if (ball.x - ball.r < 0) {
      if (ball.y > goalTop && ball.y < goalBottom) awardPoint('p2');
      else {
        ball.x = ball.r;
        ball.vx *= -1;
        playWallBounce();
        spawnHitParticles(ball.x, ball.y, 3);
      }
    } else if (ball.x + ball.r > W) {
      if (ball.y > goalTop && ball.y < goalBottom) awardPoint('p1');
      else {
        ball.x = W - ball.r;
        ball.vx *= -1;
        playWallBounce();
        spawnHitParticles(ball.x, ball.y, 3);
      }
    }

  } else {
    // Tênis e Barreira: quadra aberta, saiu pela lateral é ponto
    if (ball.x < -ball.r) awardPoint('p2');
    else if (ball.x > W + ball.r) awardPoint('p1');
  }

  // Teto de velocidade, por segurança
  ball.vx = clamp(ball.vx, -MAX_BALL_SPEED, MAX_BALL_SPEED);
  ball.vy = clamp(ball.vy, -MAX_BALL_SPEED, MAX_BALL_SPEED);
}

/**
 * Executa a física de um frame inteiro, dividindo em sub-passos se necessário.
 * Isso mantém as colisões precisas mesmo com a bola bem rápida.
 */
function step(dtFactor) {
  const travel = Math.hypot(ball.vx, ball.vy) * dtFactor;
  // Cada sub-passo move no máximo ~metade do raio da bola
  const subSteps = clamp(Math.ceil(travel / (ball.r * 0.5)), 1, 6);
  const subDt = dtFactor / subSteps;

  for (let i = 0; i < subSteps; i++) simulate(subDt);

  updateParticles(dtFactor);
  updateBallTrail();
}

/** Guarda as últimas posições da bola pra desenhar o rastro luminoso. */
function updateBallTrail() {
  ballTrail.push({ x: ball.x, y: ball.y });
  if (ballTrail.length > BALL_TRAIL_LENGTH) ballTrail.shift();
}

// --- Renderização ------------------------------------------------------------
// Cores/efeitos padrão (podem ser trocados pela Loja — ver applyCosmetics()).
let paddleColor = '#c8e6c0';      // cor das raquetes e elementos de cada modo
let ballColor = '#c8e6c0';        // cor da bola e do rastro
const PHOSPHOR_DIM = '#3a4a3a';   // verde apagado (linha central) — não é item da loja
let screenBgColor = '#0c0e0a';    // fundo do "vidro" da tela
let effectsLevel = 'padrao';      // 'minimo' | 'padrao' | 'maximo' — intensidade do rastro/partículas/brilho
let arenaPattern = 'lisa';        // 'lisa' | 'grade' | 'pontos' | 'diagonais' — fundo da quadra (Loja)

/**
 * Aplica a configuração de cosméticos equipados (vinda de GameShop.getEquippedConfig()).
 * É a ÚNICA função que sabe transformar "o que está equipado" em cores de
 * verdade na tela/CSS — a loja (shop.js) não mexe em nada disso diretamente.
 */
function applyCosmetics(cfg) {
  if (!cfg) return;
  if (cfg.ballColor) ballColor = cfg.ballColor;
  if (cfg.paddleColor) paddleColor = cfg.paddleColor;
  if (cfg.screenBg) screenBgColor = cfg.screenBg;
  if (cfg.effectsLevel) effectsLevel = cfg.effectsLevel;
  if (cfg.arenaPattern) arenaPattern = cfg.arenaPattern;
  if (cfg.soundPack) GameAudio.setSoundPack(cfg.soundPack);

  const cssVars = Object.assign({}, cfg.cssVars);
  if (cfg.frameColor) cssVars['--frame-color'] = cfg.frameColor;
  if (cfg.font) cssVars['--game-font'] = cfg.font;
  cssVars['--game-letter-spacing'] = cfg.letterSpacing || 'normal';
  Object.keys(cssVars).forEach(key => {
    document.documentElement.style.setProperty(key, cssVars[key]);
  });

  draw(); // redesenha na hora, sem esperar o próximo frame do loop
}

function draw() {
  // Fundo
  ctx.fillStyle = screenBgColor;
  ctx.fillRect(0, 0, W, H);

  // Arena: padrão visual sutil por cima do fundo (Loja)
  drawArenaPattern();

  // Linha central pontilhada
  ctx.strokeStyle = PHOSPHOR_DIM;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sombra suave da bola projetada no "chão" da tela
  drawBallShadow();

  // Raquetes e elementos de cada modo usam a cor de raquete + bloom
  ctx.fillStyle = paddleColor;
  ctx.shadowColor = paddleColor;
  ctx.shadowBlur = effectsBloom();

  // Raquetes
  ctx.fillRect(6, p1.y, paddleW, paddleH);
  // No Paredão a raquete da CPU não participa da física (é você contra a
  // parede sólida) — por isso ela não é desenhada aqui, senão pareceria que
  // a bola está "atravessando" a raquete por erro.
  if (mode !== 'paredao') {
    ctx.fillRect(W - paddleW - 6, p2.y, paddleW, paddleH);
  }

  // Elementos específicos de cada modo
  if (mode === 'paredao') {
    ctx.fillRect(W - 4, 0, 4, H);
  } else if (mode === 'futebol') {
    const goalTop = H / 2 - goalHalf;
    const goalBottom = H / 2 + goalHalf;
    ctx.fillRect(0, goalTop - 3, 4, 3);
    ctx.fillRect(0, goalBottom, 4, 3);
    ctx.fillRect(W - 4, goalTop - 3, 4, 3);
    ctx.fillRect(W - 4, goalBottom, 4, 3);
  } else if (mode === 'barreira') {
    const gapCenter = H / 2 + barrierGapAmplitude * Math.sin(barrierPhase);
    const gapTop = gapCenter - barrierGapHeight / 2;
    const gapBottom = gapCenter + barrierGapHeight / 2;
    ctx.fillRect(W / 2 - barrierThickness / 2, 0, barrierThickness, gapTop);
    ctx.fillRect(W / 2 - barrierThickness / 2, gapBottom, barrierThickness, H - gapBottom);
  }

  drawBallTrail();

  // Bola: cor própria (pode ser diferente da raquete), bloom mais forte
  ctx.fillStyle = ballColor;
  ctx.shadowColor = ballColor;
  ctx.shadowBlur = effectsBloom() + 6;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  drawParticles();
}

/** Nível de brilho (bloom) conforme a intensidade de efeitos escolhida na loja. */
function effectsBloom() {
  if (effectsLevel === 'minimo') return 4;
  if (effectsLevel === 'maximo') return 13;
  return 8;
}

/** Quantas posições do rastro desenhar, conforme a intensidade de efeitos. */
function effectsTrailLength() {
  if (effectsLevel === 'minimo') return 3;
  if (effectsLevel === 'maximo') return 12;
  return BALL_TRAIL_LENGTH;
}

/** Rastro luminoso: círculos cada vez menores e mais apagados atrás da bola. */
function drawBallTrail() {
  if (ballTrail.length < 2) return;
  const total = ballTrail.length;
  const maxLen = effectsTrailLength();
  const visible = ballTrail.slice(Math.max(0, total - maxLen));
  const visTotal = visible.length;
  ctx.fillStyle = ballColor;
  for (let i = 0; i < visTotal - 1; i++) {
    const t = (i + 1) / visTotal;          // 0 = mais antigo, 1 = mais recente
    const point = visible[i];
    ctx.globalAlpha = t * 0.32;
    ctx.beginPath();
    ctx.arc(point.x, point.y, ball.r * t * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Sombra sutil da bola, dando uma leve sensação de profundidade. */
function drawBallShadow() {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(ball.x + 2.5, ball.y + 3.5, ball.r * 1.05, ball.r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Desenha o padrão de fundo da arena (item cosmético da Loja). É sempre bem
 * sutil (baixo contraste), pra nunca atrapalhar a visibilidade da bola.
 */
function drawArenaPattern() {
  if (arenaPattern === 'lisa') return; // padrão: sem desenho extra
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;

  if (arenaPattern === 'grade') {
    const step = 30;
    for (let x = step; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = step; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  } else if (arenaPattern === 'pontos') {
    const step = 24;
    for (let x = step / 2; x < W; x += step) {
      for (let y = step / 2; y < H; y += step) {
        ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (arenaPattern === 'diagonais') {
    const step = 26;
    ctx.beginPath();
    for (let x = -H; x < W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Partículas de colisão (sem blur, pra manter o custo baixo). */
function drawParticles() {
  if (hitParticles.length === 0) return;
  for (let i = 0; i < hitParticles.length; i++) {
    const p = hitParticles[i];
    ctx.globalAlpha = p.life * 0.75;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2); // quadradinho é mais barato que arco
  }
  ctx.globalAlpha = 1;
}

// --- Laço principal ----------------------------------------------------------

/**
 * Loop do jogo. Calcula o dt real entre frames e converte em "fator de 60fps",
 * garantindo velocidade idêntica em qualquer taxa de atualização de tela.
 */
function loop(now) {
  if (!running) return;

  // Aba em segundo plano: não gasta CPU/bateria calculando física
  if (!pageVisible) {
    requestAnimationFrame(loop);
    return;
  }

  if (!lastFrameTime) lastFrameTime = now;
  const elapsed = now - lastFrameTime;
  lastFrameTime = now;

  // Limita o dt: se o app ficou travado/minimizado, não dá um salto gigante
  const dtFactor = clamp(elapsed / REFERENCE_FRAME_MS, 0, 3);

  if (dtFactor > 0) {
    step(dtFactor);
    draw();
  }

  requestAnimationFrame(loop);
}

// --- Inicialização -----------------------------------------------------------

// Segurança: se o navegador restaurar a página de um "voltar" (bfcache) bem no
// instante em que um aviso de conquista/moeda estava deslizando na tela, ele
// pode ficar "congelado" visível. Isso garante que sempre volta escondido.
window.addEventListener('pageshow', () => {
  const toast = document.getElementById('achievementToast');
  if (toast) toast.classList.remove('show');
});

applyPracticeDifficulty();
resetRound();
draw();
resetMatchTimer();
GameRanking.load(); // ranking é global (não depende de login pra ser exibido)

// Esconde a splash screen assim que o jogo estiver pronto pra usar.
// Um pequeno atraso mínimo evita um "pisca" caso tudo carregue rápido demais.
setTimeout(() => {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 600); // some de vez depois do fade
  }
}, 400);

// Primeira visita de sempre (não depende de login): mostra o manual uma
// única vez, pra quem está chegando agora não ficar perdido no meio de tudo.
(async () => {
  const alreadyVisited = await GameStorage.getValue('telegamevintage-visited');
  if (!alreadyVisited) {
    await GameStorage.setValue('telegamevintage-visited', 'true');
    setTimeout(() => showHelpOverlay(), 1100); // depois da splash sumir
  }
})();

// Atalhos do ícone do app instalado (ver manifest.json "shortcuts"): abrem o
// jogo direto em "?atalho=campeonato" ou "?atalho=praticar". Reaproveita
// exatamente os mesmos botões que já existem, sem nenhum caminho novo.
(function handleAppShortcut() {
  try {
    const params = new URLSearchParams(window.location.search);
    const atalho = params.get('atalho');
    if (atalho === 'campeonato' || atalho === 'praticar') {
      setTimeout(() => {
        if (!playerName) return; // atalho precisa de login, igual o botão do menu já exige
        hideMainMenu();
        revealGameplayControls();
        if (atalho === 'campeonato') document.getElementById('champBtn').click();
      }, 500);
    }
  } catch (e) {
    // URL sem suporte a query params (muito improvável): ignora, jogo abre normal.
  }
})();
