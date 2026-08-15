/**
 * analytics.js — Camada de abstração pra medir o jogo.
 *
 * IMPORTANTE: isso NÃO envia dados pra nenhum servidor ainda. Não existe
 * nenhuma plataforma de analytics (Firebase, GA4, etc.) configurada neste
 * projeto — conectar uma é "CONFIGURAÇÃO EXTERNA NECESSÁRIA" (ver README).
 *
 * O que esse módulo faz hoje: guarda os eventos localmente (só os últimos
 * 200, pra não crescer sem limite) e imprime no console — assim, quando uma
 * plataforma de verdade for conectada, é só trocar o corpo de `sendEvent()`
 * por uma chamada real (ex: `firebase.analytics().logEvent(name, params)`),
 * sem precisar mexer em nenhum outro lugar do jogo — todo mundo já chama
 * através de `GameAnalytics.track()`, não direto numa plataforma.
 */
const GameAnalytics = (function () {
  const ENABLED = false; // vira true quando uma plataforma real estiver conectada
  const LOG_LIMIT = 200;
  const STORAGE_KEY = 'telegamevintage-analytics-log';

  let queue = [];
  let loaded = false;

  async function ensureLoaded() {
    if (loaded) return;
    queue = await GameStorage.getJSON(STORAGE_KEY, []);
    if (!Array.isArray(queue)) queue = [];
    loaded = true;
  }

  /**
   * Envia (hoje: só registra localmente) um evento nomeado.
   * @param {string} name - ex: "game_start", "new_record", "share_clicked"
   * @param {Object} [params] - dados extra do evento (ex: { mode: 'paredao' })
   */
  async function track(name, params) {
    await ensureLoaded();
    const event = { name, params: params || {}, at: new Date().toISOString() };
    queue.push(event);
    if (queue.length > LOG_LIMIT) queue.shift();
    await GameStorage.setJSON(STORAGE_KEY, queue);

    if (ENABLED) {
      // TODO (configuração externa necessária): trocar por uma chamada real,
      // ex: firebase.analytics().logEvent(name, params);
    }
  }

  /** Só pra depuração/inspeção — não é uma tela do jogo, é uso interno. */
  async function getRecentEvents() {
    await ensureLoaded();
    return queue.slice();
  }

  return { track, getRecentEvents, get isEnabled() { return ENABLED; } };
})();
