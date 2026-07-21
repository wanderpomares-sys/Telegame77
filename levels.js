/**
 * levels.js — Nível e experiência (XP) do jogador.
 *
 * Fórmula simples: cada nível pede um pouco mais de XP que o anterior
 * (progressão linear crescente), então subir de nível fica gradualmente
 * mais difícil, sem virar uma maratona. Depende de storage.js.
 */
const GameLevels = (function () {
  let playerName = null;
  let totalXp = 0;

  /** XP necessário para SUBIR do nível n para o n+1. */
  function xpNeededForLevel(n) {
    return 100 + (n - 1) * 40; // nível 1->2 pede 100, 2->3 pede 140, 3->4 pede 180...
  }

  /** Converte XP total acumulado em {level, xpIntoLevel, xpForNextLevel}. */
  function computeLevel(xp) {
    let level = 1;
    let remaining = xp;
    while (remaining >= xpNeededForLevel(level)) {
      remaining -= xpNeededForLevel(level);
      level++;
    }
    return { level, xpIntoLevel: remaining, xpForNextLevel: xpNeededForLevel(level) };
  }

  function storageKey(name) { return 'telegamevintage-xp:' + name; }

  async function load(name) {
    playerName = name;
    const saved = await GameStorage.getJSON(storageKey(name), 0);
    totalXp = typeof saved === 'number' ? saved : 0;
  }

  async function save() {
    if (!playerName) return;
    await GameStorage.setJSON(storageKey(playerName), totalXp);
  }

  /**
   * Adiciona XP e retorna quantos níveis foram ganhos nessa chamada (0 se nenhum).
   * @param {number} amount
   * @returns {number} níveis ganhos (pode ser mais de 1 de uma vez)
   */
  function addXp(amount) {
    if (!playerName || !amount || amount <= 0) return 0;
    const before = computeLevel(totalXp).level;
    totalXp += Math.round(amount);
    const after = computeLevel(totalXp).level;
    save();
    return after - before;
  }

  function getInfo() {
    return { totalXp, ...computeLevel(totalXp) };
  }

  return { load, save, addXp, getInfo };
})();
