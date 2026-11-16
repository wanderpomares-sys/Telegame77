/**
 * analytics.js — Camada de abstração pra medir o jogo.
 *
 * NOTA: no site telegame77.com.br os eventos também são enviados ao Google
 * Analytics 4 (medição anônima, sem dados pessoais).
 *
 * O que esse módulo faz hoje: guarda os eventos localmente (só os últimos
 * 200, pra não crescer sem limite) e imprime no console — assim, quando uma
 * plataforma de verdade for conectada, é só trocar o corpo de `sendEvent()`
 * por uma chamada real (ex: `firebase.analytics().logEvent(name, params)`),
 * sem precisar mexer em nenhum outro lugar do jogo — todo mundo já chama
 * através de `GameAnalytics.track()`, não direto numa plataforma.
 */
const GameAnalytics = (function () {
  const GA_ID = 'G-JMCS7PB32Z';
  // Google Analytics 4: só no site oficial (não em localhost nem em app empacotado)
  const ENABLED = typeof location !== 'undefined' && location.hostname === 'telegame77.com.br';

  function loadGA() {
    if (!ENABLED || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: ''
    });
  }
  if (document.readyState === 'complete') loadGA();
  else window.addEventListener('load', loadGA);
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

    if (ENABLED && window.gtag) {
      try { gtag('event', String(name).slice(0, 40), params || {}); } catch (e) {}
    }
  }

  /** Só pra depuração/inspeção — não é uma tela do jogo, é uso interno. */
  async function getRecentEvents() {
    await ensureLoaded();
    return queue.slice();
  }

  return { track, getRecentEvents, get isEnabled() { return ENABLED; } };
})();
