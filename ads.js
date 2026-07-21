/**
 * ads.js — Estrutura preparada para anúncios (Etapa 15).
 *
 * NADA aqui está conectado a um SDK de anúncios de verdade ainda — é só a
 * "tomada" pronta pra encaixar o Google AdMob quando o jogo virar um app
 * nativo (via Capacitor). Enquanto isso, os anúncios reservados (rewarded)
 * caem na simulação que já existe no jogo (ver showAdOverlay em script.js).
 *
 * Quando for integrar de verdade:
 *   1. Instalar o plugin @capacitor-community/admob no projeto Capacitor
 *   2. Trocar o corpo de showInterstitial()/showRewarded() abaixo pelas
 *      chamadas reais do plugin (AdMob.prepareInterstitial, AdMob.showRewardVideoAd, etc)
 *   3. Nada no resto do jogo precisa mudar — todo mundo já chama através
 *      deste módulo, não direto num SDK.
 */
const GameAds = (function () {
  // Interruptor geral: fica desligado até existir uma integração real.
  // Assim nenhum comportamento muda pro jogador até isso ser ligado de propósito.
  const ADS_ENABLED = false;

  let interstitialShownThisSession = 0;
  const MAX_INTERSTITIALS_PER_SESSION = 3; // trava de bom senso, mesmo quando ligar de verdade

  /**
   * Anúncio de tela cheia entre telas (ex: depois de fechar um campeonato).
   * Hoje não faz nada — só o ponto de entrada pronto.
   */
  async function showInterstitial() {
    if (!ADS_ENABLED) return false;
    if (interstitialShownThisSession >= MAX_INTERSTITIALS_PER_SESSION) return false;
    // TODO (integração real): await AdMobPlugin.showInterstitial();
    interstitialShownThisSession++;
    return true;
  }

  /**
   * Anúncio de recompensa (assistir até o fim pra ganhar algo).
   * @param {() => void} onReward - chamado só se o anúncio for concluído de verdade
   */
  async function showRewarded(onReward, rewardLabel) {
    if (!ADS_ENABLED) {
      // Sem integração real ainda: usa a simulação já existente no jogo,
      // que já tem UI própria (contagem regressiva, sem pular).
      if (typeof showAdOverlay === 'function') showAdOverlay(onReward, rewardLabel);
      return;
    }
    // TODO (integração real): AdMobPlugin.showRewardVideoAd() e só chamar
    // onReward() no callback de "usuário assistiu até o fim".
  }

  /** Remover anúncios via compra (Etapa 15) — hoje sempre "sem anúncios" já que ADS_ENABLED=false. */
  function isAdFree() {
    return !ADS_ENABLED || hasRemoveAdsPurchase();
  }

  let removeAdsPurchased = false; // viria de uma compra real (Google Play Billing)
  function hasRemoveAdsPurchase() { return removeAdsPurchased; }
  function markRemoveAdsPurchased() { removeAdsPurchased = true; } // chamado após compra real

  return {
    showInterstitial, showRewarded, isAdFree, markRemoveAdsPurchased,
    get isEnabled() { return ADS_ENABLED; },
  };
})();
