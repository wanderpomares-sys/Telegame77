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

  // --- Efeitos de jogo já existentes -----------------------------------------
  // Cada efeito varia um pouco conforme o "pacote de som" equipado na loja:
  // Clássico (padrão), Suave (mais discreto) e Arcade (mais agressivo).
  function playPaddleHit() {
    const jitter = 1 + (Math.random() * 0.08 - 0.04);
    if (soundPack === 'suave') beep(660 * jitter, 0.06, 0.08, 0, 'sine');
    else if (soundPack === 'arcade') beep(1100 * jitter, 0.04, 0.16, 0, 'sawtooth');
    else beep(880 * jitter, 0.05, 0.12, 0, 'square');
  }
  function playWallBounce() {
    if (soundPack === 'suave') beep(330, 0.06, 0.07, 0, 'sine');
    else if (soundPack === 'arcade') beep(520, 0.04, 0.14, 0, 'square');
    else beep(440, 0.045, 0.10, 0, 'triangle');
  }
  function playScorePoint() {
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
    beep(440, 0.05, 0.12, 0, 'sine');
    beep(660, 0.08, 0.12, 0.05, 'sine');
  }
  function playRoundWin() {
    beep(523, 0.12, 0.15, 0, 'square');
    beep(659, 0.12, 0.15, 0.12, 'square');
    beep(784, 0.18, 0.15, 0.24, 'square');
  }
  function playRoundLose() {
    beep(392, 0.12, 0.15, 0, 'triangle');
    beep(330, 0.12, 0.15, 0.12, 'triangle');
    beep(262, 0.20, 0.15, 0.24, 'triangle');
  }
  function playTrophyFanfare() {
    [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.14, 0.16, i * 0.14, 'square'));
  }
  /** Som de entrada no Campeonato — mais solene que o início comum de partida. */
  function playChampionshipStart() {
    beep(392, 0.10, 0.14, 0, 'square');
    beep(523, 0.10, 0.14, 0.10, 'square');
    beep(659, 0.20, 0.16, 0.20, 'square');
  }

  // --- Efeitos novos (Fase 2 — estatísticas/conquistas) ----------------------
  function playAchievementUnlock() {
    beep(660, 0.09, 0.14, 0, 'sine');
    beep(880, 0.09, 0.14, 0.09, 'sine');
    beep(1175, 0.16, 0.15, 0.18, 'sine');
  }

  // Reservado pra próximas partes (menu, moedas, loja) — já com o nome certo
  // pra quando a UI de menu/loja chamar, sem precisar mexer aqui de novo.
  function playMenuNavigate() { beep(520, 0.04, 0.08, 0, 'sine'); }
  function playMenuConfirm() { beep(660, 0.05, 0.10, 0, 'sine'); beep(880, 0.06, 0.10, 0.05, 'sine'); }
  function playCoin() { beep(988, 0.05, 0.12, 0, 'square'); beep(1319, 0.10, 0.12, 0.05, 'square'); }
  function playToggleOn() { beep(660, 0.05, 0.10, 0, 'sine'); }
  function playToggleOff() { beep(330, 0.05, 0.10, 0, 'sine'); }

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
  // padrão (o jogador liga em Configurações, se quiser).
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

  function startMusic() {
    if (musicTimer) return; // já tocando
    musicEnabled = true;
    playMusicStep();
    musicTimer = setInterval(playMusicStep, 320);
  }

  function stopMusic() {
    musicEnabled = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  function toggleMusic() {
    if (musicEnabled) stopMusic();
    else startMusic();
    return musicEnabled;
  }

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
