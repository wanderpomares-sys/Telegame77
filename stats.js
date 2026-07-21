/**
 * stats.js — Estatísticas do jogador (partidas, vitórias, tempo jogado, etc).
 *
 * Depende de storage.js (GameStorage). Cada jogador tem seu próprio registro,
 * igual já acontece com os troféus.
 */
const GameStats = (function () {
  let playerName = null;
  let data = defaultStats();

  function defaultStats() {
    return {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      secondsPlayed: 0,
      modeCounts: { paredao: 0, tenis: 0, futebol: 0, barreira: 0 },
      difficultyCounts: { facil: 0, medio: 0, dificil: 0 },
      championshipsWon: 0,
      trophiesWon: 0,
      hadShutoutWin: false, // venceu alguma partida sem sofrer ponto (usado na conquista "Invencível")
    };
  }

  function storageKey(name) {
    return 'telegamevintage-stats:' + name;
  }

  async function load(name) {
    playerName = name;
    const loaded = await GameStorage.getJSON(storageKey(name), null);
    // Mescla com o padrão pra garantir que campos novos (de futuras versões)
    // não fiquem undefined em dados salvos por uma versão antiga do jogo.
    data = loaded ? Object.assign(defaultStats(), loaded) : defaultStats();
  }

  async function save() {
    if (!playerName) return;
    await GameStorage.setJSON(storageKey(playerName), data);
  }

  function reset() {
    data = defaultStats();
    save();
  }

  /** Chamado uma vez por segundo enquanto uma partida está rodando. */
  function addPlaytimeSecond() {
    if (!playerName) return;
    data.secondsPlayed++;
  }

  /**
   * Registra o resultado de UMA partida (uma disputa de Praticar, ou uma
   * fase do Campeonato — cada fase conta como uma partida).
   * @param {Object} info
   * @param {'win'|'loss'} info.result
   * @param {string} info.mode - paredao/tenis/futebol/barreira
   * @param {string} [info.difficulty] - facil/medio/dificil
   * @param {number} info.pointsFor
   * @param {number} info.pointsAgainst
   */
  function recordMatch(info) {
    if (!playerName) return;
    data.matchesPlayed++;
    data.pointsFor += info.pointsFor || 0;
    data.pointsAgainst += info.pointsAgainst || 0;

    if (info.mode && data.modeCounts[info.mode] !== undefined) {
      data.modeCounts[info.mode]++;
    }
    if (info.difficulty && data.difficultyCounts[info.difficulty] !== undefined) {
      data.difficultyCounts[info.difficulty]++;
    }

    if (info.result === 'win') {
      data.wins++;
      data.currentWinStreak++;
      data.bestWinStreak = Math.max(data.bestWinStreak, data.currentWinStreak);
      if (info.pointsAgainst === 0) data.hadShutoutWin = true;
    } else {
      data.losses++;
      data.currentWinStreak = 0;
    }

    save();
    return data;
  }

  function recordChampionshipWin() {
    if (!playerName) return;
    data.championshipsWon++;
    save();
  }

  function recordTrophyWin() {
    if (!playerName) return;
    data.trophiesWon++;
    save();
  }

  function getWinRate() {
    if (data.matchesPlayed === 0) return 0;
    return Math.round((data.wins / data.matchesPlayed) * 100);
  }

  function getFavorite(counts) {
    let best = null, bestCount = 0;
    Object.keys(counts).forEach(key => {
      if (counts[key] > bestCount) { best = key; bestCount = counts[key]; }
    });
    return best;
  }

  function formatPlaytime() {
    const totalMinutes = Math.floor(data.secondsPlayed / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  }

  /** Retorno pronto pra exibir numa tela de estatísticas. */
  function getSummary() {
    return {
      ...data,
      winRate: getWinRate(),
      favoriteMode: getFavorite(data.modeCounts),
      favoriteDifficulty: getFavorite(data.difficultyCounts),
      playtimeLabel: formatPlaytime(),
    };
  }

  return {
    load, save, reset, addPlaytimeSecond,
    recordMatch, recordChampionshipWin, recordTrophyWin,
    getSummary,
    get raw() { return data; }, // acesso direto pras conquistas checarem as condições
  };
})();
