/**
 * playservices.js — Estrutura preparada para Google Play Games (Etapa 15).
 *
 * Cobre 3 recursos que o pedido menciona: Cloud Save, Leaderboards e
 * Achievements. Nenhum está conectado ao SDK de verdade — cada função hoje
 * usa o armazenamento local (GameStorage) como um "cloud save" provisório,
 * então o jogo já funciona exatamente como vai funcionar depois, só que
 * salvando no aparelho em vez de na nuvem da Google.
 *
 * Quando for integrar de verdade:
 *   1. Plugin @capacitor-community/games-services (ou equivalente)
 *   2. Trocar o corpo de cada função abaixo pela chamada real do plugin
 *   3. O resto do jogo não muda — todo mundo já fala com este módulo
 */
const GamePlayServices = (function () {
  const ENABLED = false; // vira true quando o plugin real estiver instalado

  let signedIn = false;

  /** "Login" no Google Play Games. Hoje só simula sucesso local. */
  async function signIn() {
    if (!ENABLED) { signedIn = false; return false; }
    // TODO (integração real): await GamesServicesPlugin.signIn();
    return signedIn;
  }

  function isSignedIn() { return signedIn; }

  /**
   * Cloud Save: hoje só espelha pro armazenamento local (GameStorage), que já
   * é a mesma base usada por estatísticas/conquistas/loja/ranking. Assim,
   * quando isso virar de verdade "salvar na nuvem", nada mais no jogo precisa
   * mudar — é só trocar o que tem dentro dessas duas funções.
   */
  async function cloudSave(key, value) {
    if (!ENABLED) return GameStorage.setValue('cloudsave:' + key, value);
    // TODO (integração real): await GamesServicesPlugin.saveSnapshot(key, value);
  }

  async function cloudLoad(key) {
    if (!ENABLED) return GameStorage.getValue('cloudsave:' + key);
    // TODO (integração real): await GamesServicesPlugin.loadSnapshot(key);
  }

  /** Leaderboards: reservado pra futuramente espelhar o GameRanking local pro Google. */
  async function submitScore(leaderboardId, score) {
    if (!ENABLED) return false;
    // TODO (integração real): await GamesServicesPlugin.submitScore(leaderboardId, score);
    return false;
  }

  /** Achievements do Google (diferente das conquistas internas do jogo, mas reaproveita os mesmos gatilhos). */
  async function unlockAchievement(achievementId) {
    if (!ENABLED) return false;
    // TODO (integração real): await GamesServicesPlugin.unlock(achievementId);
    return false;
  }

  return {
    signIn, isSignedIn, cloudSave, cloudLoad, submitScore, unlockAchievement,
    get isEnabled() { return ENABLED; },
  };
})();
