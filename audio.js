/**
 * audio.js — Sons (Web Audio API, sem nenhum arquivo .mp3) e vibração.
 *
 * Tudo fica atrás do namespace GameAudio pra não conflitar com o construtor
 * nativo `Audio` do navegador (new Audio('som.mp3')) — por isso NÃO chamamos
 * esse objeto de "Audio".
 *
 * Filosofia: nenhuma falha de áudio pode travar o jogo. Se o navegador não
 * suportar (ou bloquear) o AudioContext, o jogo simplesmente continua mudo.
 */
const GameAudio = (function () {
  let audioCtx = null;
  let soundEnabled = true;
  let audioUnavailable = false; // vira true se o navegador não suportar/bloquear áudio
  let soundPack = 'classico'; // trocado pela loja (shop.js) via setSoundPack()

  function setSoundPack(pack) {
    soundPack = pack || 'classico';
  }

  /**
   * Garante que o contexto de áudio existe e está ativo.
   * Retorna false se o áudio não estiver disponível.
   */
  function ensureAudio() {
    if (audioUnavailable) return false;
    try {
      if (!audioCtx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) { audioUnavailable = true; return false; }
        audioCtx = new AudioCtor();
      }
      // Navegadores móveis suspendem o áudio até o primeiro toque do usuário
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return true;
    } catch (e) {
      audioUnavailable = true;
      return false;
    }
  }

  /**
   * Toca um bipe sintetizado.
   * @param {number} freq - frequência em Hz
   * @param {number} duration - duração em segundos
   * @param {number} volume - volume (0 a 1)
   * @param {number} [delay] - atraso antes de iniciar, em segundos
   * @param {OscillatorType} [type] - timbre do oscilador (square/triangle/sawtooth/sine)
   */
  function beep(freq, duration, volume, delay, type) {
    if (!soundEnabled) return;
    if (!ensureAudio()) return; // sem áudio disponível: segue o jogo em silêncio
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const t = audioCtx.currentTime + (delay || 0);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch (e) {
      audioUnavailable = true; // não tenta de novo, pra não gastar CPU errando
    }
  }

  // --- Sons reais (Kenney "Interface Sounds", licença CC0) ---------------------
  // Carregados uma vez e tocados via Web Audio. Se algo falhar, cai no som sintetizado.
  const SAMPLE_FILES = {
    paddle: 'pluck_001', wall: 'tick_002', score: 'error_004', start: 'open_001',
    win: 'confirmation_002', lose: 'error_006', trophy: 'confirmation_004', champ: 'maximize_006',
    achieve: 'confirmation_003', nav: 'click_002', confirm: 'select_002', coin: 'glass_003',
    on: 'switch_003', off: 'switch_005',
  };
  const samples = {};
  let samplesRequested = false;
  function loadSamples() {
    if (samplesRequested || !audioCtx) return;
    samplesRequested = true;
    Object.keys(SAMPLE_FILES).forEach((key) => {
      fetch('sounds/' + SAMPLE_FILES[key] + '.mp3')
        .then((r) => r.arrayBuffer())
        .then((buf) => new Promise((ok, no) => audioCtx.decodeAudioData(buf, ok, no)))
        .then((decoded) => { samples[key] = decoded; })
        .catch(() => { /* sem o arquivo: usa o som sintetizado */ });
    });
  }
  /** Toca um som real; devolve false se ainda não estiver carregado (aí o chamador usa o sintetizado). */
  function play(key, volume, rate) {
    if (!soundEnabled) return true;
    if (!ensureAudio()) return true;
    loadSamples();
    const buf = samples[key];
    if (!buf) return false;
    try {
      const src = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      src.buffer = buf;
      let r = rate || 1, v = volume == null ? 0.7 : volume;
      if (soundPack === 'arcade') { r *= 1.25; v *= 1.1; }
      else if (soundPack === 'suave') { r *= 0.9; v *= 0.65; }
      src.playbackRate.value = r;
      gain.gain.value = Math.min(1, v);
      src.connect(gain); gain.connect(audioCtx.destination);
      src.start();
      return true;
    } catch (e) { return false; }
  }

  // --- Efeitos de jogo já existentes -----------------------------------------
  // Cada efeito varia um pouco conforme o "pacote de som" equipado na loja:
  // Clássico (padrão), Suave (mais discreto) e Arcade (mais agressivo).
  function playPaddleHit() {
    if (play('paddle', 0.8, 1 + (Math.random() * 0.12 - 0.06))) return;
    const jitter = 1 + (Math.random() * 0.08 - 0.04);
    if (soundPack === 'suave') beep(660 * jitter, 0.06, 0.08, 0, 'sine');
    else if (soundPack === 'arcade') beep(1100 * jitter, 0.04, 0.16, 0, 'sawtooth');
    else beep(880 * jitter, 0.05, 0.12, 0, 'square');
  }
  function playWallBounce() {
    if (play('wall', 0.6, 1)) return;
    if (soundPack === 'suave') beep(330, 0.06, 0.07, 0, 'sine');
    else if (soundPack === 'arcade') beep(520, 0.04, 0.14, 0, 'square');
    else beep(440, 0.045, 0.10, 0, 'triangle');
  }
  function playScorePoint() {
    if (play('score', 0.7, 1)) return;
    if (soundPack === 'suave') {
      beep(440, 0.12, 0.10, 0, 'sine');
      beep(260, 0.22, 0.09, 0.1, 'sine');
    } else if (soundPack === 'arcade') {
      beep(200, 0.14, 0.18, 0, 'square');
      beep(150, 0.22, 0.16, 0.06, 'square');
    } else {
      beep(330, 0.09, 0.16, 0, 'sawtooth');
      beep(180, 0.20, 0.14, 0.08, 'sawtooth');
    }
  }
  function playStartSound() {
    if (play('start', 0.6, 1)) return;
    beep(440, 0.05, 0.12, 0, 'sine');
    beep(660, 0.08, 0.12, 0.05, 'sine');
  }
  function playRoundWin() {
    if (play('win', 0.8, 1)) return;
    beep(523, 0.12, 0.15, 0, 'square');
    beep(659, 0.12, 0.15, 0.12, 'square');
    beep(784, 0.18, 0.15, 0.24, 'square');
  }
  function playRoundLose() {
    if (play('lose', 0.7, 1)) return;
    beep(392, 0.12, 0.15, 0, 'triangle');
    beep(330, 0.12, 0.15, 0.12, 'triangle');
    beep(262, 0.20, 0.15, 0.24, 'triangle');
  }
  function playTrophyFanfare() {
    if (play('trophy', 0.9, 1)) return;
    [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.14, 0.16, i * 0.14, 'square'));
  }
  /** Som de entrada no Campeonato — mais solene que o início comum de partida. */
  function playChampionshipStart() {
    if (play('champ', 0.8, 1)) return;
    beep(392, 0.10, 0.14, 0, 'square');
    beep(523, 0.10, 0.14, 0.10, 'square');
    beep(659, 0.20, 0.16, 0.20, 'square');
  }

  // --- Efeitos novos (Fase 2 — estatísticas/conquistas) ----------------------
  function playAchievementUnlock() {
    if (play('achieve', 0.8, 1)) return;
    beep(660, 0.09, 0.14, 0, 'sine');
    beep(880, 0.09, 0.14, 0.09, 'sine');
    beep(1175, 0.16, 0.15, 0.18, 'sine');
  }

  // Reservado pra próximas partes (menu, moedas, loja) — já com o nome certo
  // pra quando a UI de menu/loja chamar, sem precisar mexer aqui de novo.
  function playMenuNavigate() { if (play('nav', 0.5)) return; beep(520, 0.04, 0.08, 0, 'sine'); }
  function playMenuConfirm() { if (play('confirm', 0.6)) return; beep(660, 0.05, 0.10, 0, 'sine'); beep(880, 0.06, 0.10, 0.05, 'sine'); }
  function playCoin() { if (play('coin', 0.7)) return; beep(988, 0.05, 0.12, 0, 'square'); beep(1319, 0.10, 0.12, 0.05, 'square'); }
  function playToggleOn() { if (play('on', 0.6)) return; beep(660, 0.05, 0.10, 0, 'sine'); }
  function playToggleOff() { if (play('off', 0.6)) return; beep(330, 0.05, 0.10, 0, 'sine'); }

  function isSoundEnabled() { return soundEnabled; }
  function setSoundEnabled(value) { soundEnabled = value; }
  function toggleSound() { soundEnabled = !soundEnabled; return soundEnabled; }

  // --- Vibração (Android/Chrome — iOS Safari não suporta, então sempre
  // checamos antes). Nunca usada em vibração contínua: só pulsos/padrões finitos. ---
  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* ignora se o navegador recusar */ }
    }
  }

  // --- Música de fundo (procedural — sem arquivos de áudio) -------------------
  // Um loop curto e discreto, no estilo dos consoles antigos. Desligada por
  // padrão; o jogador liga no botão MÚSICA ou em Configurações.
  let musicEnabled = false;
  let musicTimer = null;
  const MUSIC_PATTERN = [220, 262, 294, 220, 330, 294, 262, 196]; // notas em Hz, um loop simples
  let musicStep = 0;

  function playMusicStep() {
    if (!musicEnabled) return;
    if (!ensureAudio()) return;
    const freq = MUSIC_PATTERN[musicStep % MUSIC_PATTERN.length];
    beep(freq, 0.22, 0.045, 0, 'triangle'); // bem baixinho, pra não brigar com os efeitos
    musicStep++;
  }

  let musicBuf = null, musicLoading = false, musicSrc = null, musicGain = null;
  function loadMusic(then) {
    if (musicBuf) { then(); return; }
    if (musicLoading || !audioCtx) return;
    musicLoading = true;
    fetch('sounds/music_loop.mp3').then((r) => r.arrayBuffer())
      .then((b) => new Promise((ok, no) => audioCtx.decodeAudioData(b, ok, no)))
      .then((d) => { musicBuf = d; musicLoading = false; if (musicEnabled) then(); })
      .catch(() => { musicLoading = false; });
  }
  function playMusicLoop() {
    if (!musicEnabled || musicSrc || !musicBuf || !audioCtx) return;
    musicSrc = audioCtx.createBufferSource(); musicGain = audioCtx.createGain();
    musicSrc.buffer = musicBuf; musicSrc.loop = true;
    musicGain.gain.setValueAtTime(0, audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 1.2);
    musicSrc.connect(musicGain); musicGain.connect(audioCtx.destination); musicSrc.start();
  }
  function saveMusicPref() { try { localStorage.setItem('tg-music', musicEnabled ? '1' : '0'); } catch (e) { /* ok */ } }

  function startMusic() {
    musicEnabled = true; saveMusicPref();
    if (!ensureAudio()) return;
    if (musicBuf) { playMusicLoop(); return; }
    loadMusic(playMusicLoop);
    // enquanto o arquivo carrega (ou se falhar), usa a trilha sintetizada
    if (!musicTimer) { playMusicStep(); musicTimer = setInterval(() => { if (musicBuf) { clearInterval(musicTimer); musicTimer = null; playMusicLoop(); } else playMusicStep(); }, 320); }
  }

  function stopMusic() {
    musicEnabled = false; saveMusicPref();
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (musicSrc) {
      try { musicGain.gain.cancelScheduledValues(0); musicSrc.stop(); } catch (e) { /* ok */ }
      musicSrc = null;
    }
  }

  function toggleMusic() {
    if (musicEnabled) stopMusic();
    else startMusic();
    return musicEnabled;
  }

  /** Se o jogador deixou a música ligada da última vez, religa no primeiro toque (o navegador exige um toque). */
  function restoreMusicPref() {
    let on = false;
    try { on = localStorage.getItem('tg-music') === '1'; } catch (e) { /* ok */ }
    if (!on) return;
    const go = () => { window.removeEventListener('pointerdown', go); if (!musicEnabled) startMusic(); };
    window.addEventListener('pointerdown', go);
  }
  restoreMusicPref();

  function isMusicEnabled() { return musicEnabled; }

  return {
    ensureAudio, beep,
    playPaddleHit, playWallBounce, playScorePoint, playStartSound,
    playRoundWin, playRoundLose, playTrophyFanfare, playAchievementUnlock, playChampionshipStart,
    playMenuNavigate, playMenuConfirm, playCoin, playToggleOn, playToggleOff,
    isSoundEnabled, setSoundEnabled, toggleSound, setSoundPack,
    startMusic, stopMusic, toggleMusic, isMusicEnabled,
    vibrate,
  };
})();
