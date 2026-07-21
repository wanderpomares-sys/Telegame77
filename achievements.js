/**
 * achievements.js — Sistema de conquistas.
 *
 * Cada conquista tem uma condição (`check`) avaliada contra as estatísticas
 * atuais e os troféus do jogador. Quando desbloqueada pela primeira vez,
 * fica salva pra sempre (não desbloqueia de novo, não pode ser perdida).
 */
const GameAchievements = (function () {
  const DEFINITIONS = [
    { id: 'first_win',       name: 'Primeira Vitória', desc: 'Vença sua primeira partida',              icon: '🥇', coins: 20,  check: s => s.wins >= 1 },
    { id: 'wins_10',         name: '10 Vitórias',      desc: 'Vença 10 partidas',                        icon: '🏅', coins: 50,  check: s => s.wins >= 10 },
    { id: 'wins_50',         name: '50 Vitórias',      desc: 'Vença 50 partidas',                        icon: '🎖️', coins: 150, check: s => s.wins >= 50 },
    { id: 'wins_100',        name: '100 Vitórias',     desc: 'Vença 100 partidas',                       icon: '👑', coins: 300, check: s => s.wins >= 100 },
    { id: 'champion_paredao', name: 'Campeão do Paredão', desc: 'Vença o campeonato Paredão',             icon: '🧱', coins: 80,  check: (s, t) => !!(t && t.paredao) },
    { id: 'champion_tenis',   name: 'Campeão do Tênis',   desc: 'Vença o campeonato Tênis',               icon: '🎾', coins: 80,  check: (s, t) => !!(t && t.tenis) },
    { id: 'champion_futebol', name: 'Campeão do Futebol', desc: 'Vença o campeonato Futebol',             icon: '⚽', coins: 80,  check: (s, t) => !!(t && t.futebol) },
    { id: 'champion_barreira', name: 'Campeão da Barreira', desc: 'Vença o campeonato Barreira',          icon: '🚧', coins: 80,  check: (s, t) => !!(t && t.barreira) },
    { id: 'hours_10',        name: '10 Horas Jogadas', desc: 'Jogue por 10 horas no total',              icon: '⏳', coins: 100, check: s => s.secondsPlayed >= 10 * 3600 },
    { id: 'hours_50',        name: '50 Horas Jogadas', desc: 'Jogue por 50 horas no total',              icon: '⌛', coins: 250, check: s => s.secondsPlayed >= 50 * 3600 },
    { id: 'invincible',      name: 'Invencível',       desc: 'Vença uma partida sem sofrer nenhum ponto', icon: '🛡️', coins: 60,  check: s => s.hadShutoutWin === true },
    { id: 'vintage_master',  name: 'Mestre Vintage',   desc: 'Conquiste os 4 troféus de campeonato',      icon: '🏆', coins: 400, check: (s, t) => !!(t && t.paredao && t.tenis && t.futebol && t.barreira) },

    // --- Conquistas elaboradas (Fase 2, Parte 7) ---
    { id: 'level_10',   name: 'Nível 10',        desc: 'Alcance o nível 10 de experiência',        icon: '⭐', coins: 100, check: s => (s.level || 0) >= 10 },
    { id: 'level_25',   name: 'Nível 25',        desc: 'Alcance o nível 25 de experiência',        icon: '🌟', coins: 300, check: s => (s.level || 0) >= 25 },
    { id: 'survivor_20', name: 'Sobrevivente',   desc: 'Marque 20+ pontos no modo Sobrevivência',  icon: '🧟', coins: 120, check: s => (s.survivalBest || 0) >= 20 },
    { id: 'time_master', name: 'Contra o Relógio', desc: 'Marque 10+ pontos no modo Contra o Tempo', icon: '⏱️', coins: 90,  check: s => (s.timeAttackBest || 0) >= 10 },
    { id: 'daily_habit', name: 'Hábito Diário',  desc: 'Complete o Desafio Diário 7 dias seguidos', icon: '📅', coins: 150, check: s => (s.dailyStreak || 0) >= 7 },
    { id: 'collector',   name: 'Colecionador',   desc: 'Compre pelo menos 1 item de cada categoria da Loja', icon: '🛍️', coins: 200, check: s => s.shopCategoriesOwned === true },
  ];

  let playerName = null;
  let unlocked = {}; // { [id]: true }

  function storageKey(name) {
    return 'telegamevintage-achievements:' + name;
  }

  async function load(name) {
    playerName = name;
    unlocked = await GameStorage.getJSON(storageKey(name), {});
  }

  async function save() {
    if (!playerName) return;
    await GameStorage.setJSON(storageKey(playerName), unlocked);
  }

  function reset() {
    unlocked = {};
    save();
  }

  /**
   * Avalia todas as conquistas ainda não desbloqueadas contra o estado atual.
   * Chama onUnlock(definição) pra cada uma que acabou de ser conquistada
   * (só na primeira vez — chamadas seguintes não repetem).
   * @param {Object} stats - GameStats.raw (ou getSummary())
   * @param {Object} trophies - objeto de troféus do campeonato
   * @param {(def: Object) => void} [onUnlock]
   */
  function checkAll(stats, trophies, onUnlock) {
    DEFINITIONS.forEach(def => {
      if (unlocked[def.id]) return; // já conquistada, não reavalia
      let qualifies = false;
      try {
        qualifies = !!def.check(stats, trophies);
      } catch (e) {
        qualifies = false; // uma condição malformada nunca deve quebrar o jogo
      }
      if (qualifies) {
        unlocked[def.id] = true;
        if (onUnlock) onUnlock(def);
      }
    });
    save();
  }

  /** Lista completa, já marcando quais estão desbloqueadas — pronta pra exibir. */
  function getAll() {
    return DEFINITIONS.map(def => ({ ...def, unlocked: !!unlocked[def.id] }));
  }

  function getUnlockedCount() {
    return Object.keys(unlocked).length;
  }

  return { load, save, reset, checkAll, getAll, getUnlockedCount, DEFINITIONS };
})();
