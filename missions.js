/**
 * missions.js — Missões diárias (3 por dia, sorteadas pela data).
 *
 * Diferente do "Desafio Diário" (que é uma partida específica pra jogar),
 * as missões são objetivos que valem pro que você já for jogando no dia —
 * marcar pontos, vencer partidas, experimentar modos diferentes.
 *
 * Todo mundo recebe as MESMAS 3 missões no mesmo dia (sorteio determinístico
 * pela data), mas o progresso de cada um é individual e salvo à parte.
 */
const GameMissions = (function () {
  const POOL = [
    { type: 'score_points', label: (t) => `Marque ${t} pontos hoje`, icon: '🎯', targets: [10, 15, 20], reward: 40 },
    { type: 'win_matches', label: (t) => `Vença ${t} partida${t > 1 ? 's' : ''} hoje`, icon: '🏆', targets: [2, 3, 4], reward: 50 },
    { type: 'play_modes', label: (t) => `Jogue ${t} modos diferentes hoje`, icon: '🎮', targets: [2, 3, 4], reward: 35 },
    { type: 'win_shutout', label: () => 'Vença uma partida sem sofrer ponto', icon: '🛡️', targets: [1], reward: 60 },
  ];

  let playerName = null;
  let progress = defaultProgress();

  function todayKey() { return new Date().toISOString().slice(0, 10); }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return hash;
  }

  function defaultProgress() {
    return { date: todayKey(), scorePoints: 0, winMatches: 0, modesPlayed: [], shutoutWin: false, claimed: {} };
  }

  /** As 3 missões de hoje, sempre as mesmas pra todo mundo no mesmo dia. */
  function getTodayMissions() {
    const seed = simpleHash(todayKey());
    // Sempre inclui as 4 categorias, mas com metas (targets) variando pela data —
    // simplificado pra sempre mostrar as 4, cada uma com dificuldade do dia.
    return POOL.map((def, i) => ({
      id: def.type,
      icon: def.icon,
      target: def.targets[(seed + i * 7) % def.targets.length],
      reward: def.reward,
      label: def.label(def.targets[(seed + i * 7) % def.targets.length]),
    }));
  }

  function storageKey(name) { return 'telegamevintage-missions:' + name; }

  async function load(name) {
    playerName = name;
    const saved = await GameStorage.getJSON(storageKey(name), null);
    progress = saved ? Object.assign(defaultProgress(), saved) : defaultProgress();
    if (progress.date !== todayKey()) {
      progress = defaultProgress(); // virou o dia: progresso zera, mas moedas ganhas continuam
      save();
    }
  }

  async function save() {
    if (!playerName) return;
    await GameStorage.setJSON(storageKey(playerName), progress);
  }

  /**
   * Reavalia as missões de hoje contra o progresso atual, pagando a recompensa
   * na primeira vez que cada uma é completada.
   * @param {(mission: Object) => void} [onComplete] - chamado pra cada missão recém-concluída
   */
  function checkMissions(onComplete) {
    if (!playerName) return;
    getTodayMissions().forEach((m) => {
      if (progress.claimed[m.id]) return;
      let done = false;
      if (m.id === 'score_points') done = progress.scorePoints >= m.target;
      else if (m.id === 'win_matches') done = progress.winMatches >= m.target;
      else if (m.id === 'play_modes') done = progress.modesPlayed.length >= m.target;
      else if (m.id === 'win_shutout') done = progress.shutoutWin === true;

      if (done) {
        progress.claimed[m.id] = true;
        if (onComplete) onComplete(m);
      }
    });
    save();
  }

  function recordPointsScored(n) {
    if (!playerName) return;
    progress.scorePoints += n;
  }

  function recordMatchResult(won, modeName, shutout) {
    if (!playerName) return;
    if (won) {
      progress.winMatches++;
      if (shutout) progress.shutoutWin = true;
    }
    if (modeName && !progress.modesPlayed.includes(modeName)) {
      progress.modesPlayed.push(modeName);
    }
  }

  function getProgressView() {
    return getTodayMissions().map((m) => {
      let current = 0;
      if (m.id === 'score_points') current = progress.scorePoints;
      else if (m.id === 'win_matches') current = progress.winMatches;
      else if (m.id === 'play_modes') current = progress.modesPlayed.length;
      else if (m.id === 'win_shutout') current = progress.shutoutWin ? 1 : 0;
      return { ...m, current: Math.min(current, m.target), done: !!progress.claimed[m.id] };
    });
  }

  return { load, checkMissions, recordPointsScored, recordMatchResult, getProgressView };
})();
