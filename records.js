/**
 * records.js — Recordes pessoais do jogador.
 *
 * NÃO duplica dados que já existem: "melhor pontuação" e "partidas jogadas"
 * são lidos direto de GameRanking/GameStats. A única coisa nova de verdade é
 * o "melhor tempo sobrevivido no Paredão" — hoje o jogo só sabia se você
 * venceu ou perdeu, não quanto tempo você aguentou até errar.
 */
const GameRecords = (function () {
  let playerName = null;
  let paredaoBestSeconds = 0;

  function storageKey(name) { return 'telegamevintage-paredao-best:' + name; }

  async function load(name) {
    playerName = name;
    paredaoBestSeconds = await GameStorage.getJSON(storageKey(name), 0);
  }

  /**
   * Chamado toda vez que uma partida de Paredão termina (vitória OU derrota),
   * com quanto tempo (em segundos) o jogador aguentou até esse momento.
   * @returns {boolean} true se bateu um novo recorde agora
   */
  async function recordParedaoSurvival(seconds) {
    if (!playerName) return false;
    const isNewRecord = seconds > paredaoBestSeconds;
    if (isNewRecord) {
      paredaoBestSeconds = seconds;
      await GameStorage.setJSON(storageKey(playerName), paredaoBestSeconds);
    }
    return isNewRecord;
  }

  function getParedaoBestSeconds() {
    return paredaoBestSeconds;
  }

  /**
   * Resumo dos recordes pra exibir na tela "Meus Recordes". Lê de
   * GameRanking/GameStats — não guarda nada por conta própria além do
   * tempo de Paredão (ver acima).
   */
  function getSummary() {
    let bestScore = 0;
    if (playerName && typeof GameRanking !== 'undefined') {
      GameRanking.getTop(100).forEach((e) => {
        if (e.name === playerName && e.score > bestScore) bestScore = e.score;
      });
    }
    const stats = (typeof GameStats !== 'undefined' && GameStats.raw) ? GameStats.raw : {};
    return {
      bestScore,
      paredaoBestSeconds,
      matchesPlayed: stats.matchesPlayed || 0,
      bestWinStreak: stats.bestWinStreak || 0,
    };
  }

  return { load, recordParedaoSurvival, getParedaoBestSeconds, getSummary };
})();
