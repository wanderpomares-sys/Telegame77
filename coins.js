/**
 * coins.js — Moedas virtuais.
 *
 * Ganhas com vitórias, campeonatos, conquistas, sequências de vitória e um
 * desafio diário. Gastas na loja (shop.js). Depende de storage.js.
 *
 * "Assistir anúncios" pra ganhar moedas (mencionado no pedido como algo pra
 * fazer no futuro) ainda não está aqui de propósito — quando isso existir de
 * verdade, é só chamar GameCoins.earn(valor, 'anuncio') depois do anúncio
 * rodar (mesma função usada por todo o resto).
 */
const GameCoins = (function () {
  let playerName = null;
  let balance = 0;
  let daily = defaultDaily();

  const DAILY_TARGET = 3;   // vitórias necessárias pra completar o desafio do dia
  const DAILY_REWARD = 50;  // moedas pagas ao completar

  function defaultDaily() {
    return { date: '', winsToday: 0, claimed: false };
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10); // "AAAA-MM-DD"
  }

  function balanceKey(name) { return 'telegamevintage-coins:' + name; }
  function dailyKey(name) { return 'telegamevintage-daily:' + name; }

  async function load(name) {
    playerName = name;
    const savedBalance = await GameStorage.getJSON(balanceKey(name), 0);
    balance = typeof savedBalance === 'number' ? savedBalance : 0;

    const savedDaily = await GameStorage.getJSON(dailyKey(name), null);
    daily = savedDaily ? Object.assign(defaultDaily(), savedDaily) : defaultDaily();
    if (daily.date !== todayKey()) {
      // Virou o dia: zera o progresso do desafio (o saldo de moedas não mexe)
      daily = defaultDaily();
      daily.date = todayKey();
      saveDaily();
    }
  }

  async function saveBalance() {
    if (!playerName) return;
    await GameStorage.setJSON(balanceKey(playerName), balance);
  }

  async function saveDaily() {
    if (!playerName) return;
    await GameStorage.setJSON(dailyKey(playerName), daily);
  }

  /** Ganha moedas. `reason` é só pra depuração/logs futuros, não afeta nada. */
  function earn(amount) {
    if (!playerName || !amount || amount <= 0) return balance;
    balance += Math.round(amount);
    saveBalance();
    return balance;
  }

  /** Tenta gastar moedas. Retorna true se tinha saldo suficiente. */
  function spend(amount) {
    if (!playerName || amount <= 0) return false;
    if (balance < amount) return false;
    balance -= amount;
    saveBalance();
    return true;
  }

  function getBalance() {
    return balance;
  }

  /**
   * Chame isso toda vez que o jogador vencer uma partida. Conta pro desafio
   * diário e paga a recompensa uma única vez, na hora em que a meta é batida.
   * @returns {boolean} true se o desafio acabou de ser completado agora
   */
  function recordDailyWin() {
    if (!playerName) return false;
    if (daily.date !== todayKey()) {
      daily = defaultDaily();
      daily.date = todayKey();
    }
    if (daily.claimed) { saveDaily(); return false; }

    daily.winsToday++;
    let justCompleted = false;
    if (daily.winsToday >= DAILY_TARGET) {
      daily.claimed = true;
      earn(DAILY_REWARD);
      justCompleted = true;
    }
    saveDaily();
    return justCompleted;
  }

  function getDailyStatus() {
    return {
      winsToday: daily.winsToday,
      target: DAILY_TARGET,
      claimed: daily.claimed,
      reward: DAILY_REWARD,
    };
  }

  return { load, earn, spend, getBalance, recordDailyWin, getDailyStatus };
})();
