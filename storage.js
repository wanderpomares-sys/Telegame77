/**
 * storage.js — Camada única de persistência do jogo.
 *
 * Usa window.storage quando disponível (preview do Claude), e cai pra
 * localStorage quando o jogo roda direto num navegador (Safari, Chrome
 * Android, Samsung Internet, etc). Todo o resto do jogo (troféus,
 * estatísticas, conquistas, futuramente moedas/loja/ranking) passa por aqui,
 * então só existe UM lugar que sabe como salvar/ler dados.
 *
 * Uso:
 *   await GameStorage.getValue('minha-chave')
 *   await GameStorage.setValue('minha-chave', 'valor em string')
 */
const GameStorage = (function () {
  async function getValue(key) {
    if (window.storage) {
      try {
        const result = await window.storage.get(key);
        return result ? result.value : null;
      } catch (e) {
        return null; // cai pro fallback abaixo só se o window.storage falhar
      }
    }
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  async function setValue(key, value) {
    if (window.storage) {
      try {
        await window.storage.set(key, value);
        return;
      } catch (e) {
        // segue pro fallback abaixo
      }
    }
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Erro ao salvar em', key, e);
    }
  }

  /** Atalho pra ler e já converter de JSON, com um valor padrão se não existir. */
  async function getJSON(key, defaultValue) {
    const raw = await getValue(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue; // dado corrompido/antigo: melhor recomeçar do que quebrar o jogo
    }
  }

  /** Atalho pra salvar um objeto já convertendo pra JSON. */
  async function setJSON(key, value) {
    await setValue(key, JSON.stringify(value));
  }

  return { getValue, setValue, getJSON, setJSON };
})();
