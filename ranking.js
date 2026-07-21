/**
 * ranking.js — Ranking de pontuações.
 *
 * Hoje funciona 100% local (sem servidor). A estrutura já separa "onde os
 * dados ficam" de "como o jogo usa o ranking", então no futuro dá pra trocar
 * `LocalRankingProvider` por um `RemoteRankingProvider` (API de verdade) sem
 * mexer no resto do jogo — só trocar a implementação por trás de `GameRanking`.
 *
 * Cada entrada tem: nome, pontuação, modo, dificuldade, tempo (segundos),
 * data e país (estimado pelo idioma do navegador — não é geolocalização real).
 */
const GameRanking = (function () {
  const STORAGE_KEY = 'telegamevintage-ranking';
  const MAX_ENTRIES = 100;

  // --- Provedor local (implementação atual) -----------------------------------
  const LocalRankingProvider = {
    async load() {
      return GameStorage.getJSON(STORAGE_KEY, []);
    },
    async save(entries) {
      await GameStorage.setJSON(STORAGE_KEY, entries);
    },
  };

  // --- Provedor remoto (reservado pra integração futura) ----------------------
  // Quando houver um back-end de verdade, essa é a única peça que precisa ser
  // escrita: implementar load()/save() batendo numa API, mantendo o mesmo
  // formato de dados. Por enquanto não é usado (offline = local, como pedido).
  const RemoteRankingProvider = {
    async load() { throw new Error('RemoteRankingProvider ainda não implementado'); },
    async save() { throw new Error('RemoteRankingProvider ainda não implementado'); },
  };

  let provider = LocalRankingProvider; // troque aqui quando existir um back-end
  let entries = [];

  /** Estimativa de país a partir do idioma do navegador (ex: "pt-BR" -> "BR").
   * NÃO é geolocalização real — é só um palpite razoável, deixado explícito
   * pra não passar a impressão de ser mais preciso do que é. */
  function guessCountry() {
    try {
      const locale = navigator.language || navigator.userLanguage || '';
      const parts = locale.split('-');
      return parts.length > 1 ? parts[1].toUpperCase() : '—';
    } catch (e) {
      return '—';
    }
  }

  async function load() {
    try {
      entries = await provider.load();
      if (!Array.isArray(entries)) entries = [];
    } catch (e) {
      entries = []; // offline ou provedor remoto indisponível: começa vazio, não quebra o jogo
    }
  }

  async function save() {
    try {
      await provider.save(entries);
    } catch (e) {
      // Falha ao salvar (ex: provedor remoto fora do ar) nunca deve travar o jogo
    }
  }

  /**
   * Registra uma pontuação no ranking.
   * @param {Object} info
   * @param {string} info.name
   * @param {number} info.score
   * @param {string} info.mode - paredao/tenis/futebol/barreira
   * @param {string} [info.difficulty] - facil/medio/dificil
   * @param {number} [info.timeSeconds] - duração da partida, em segundos
   */
  function addEntry(info) {
    if (!info || !info.name) return;
    entries.push({
      name: String(info.name).slice(0, 20),
      score: info.score || 0,
      mode: info.mode || '—',
      difficulty: info.difficulty || '—',
      time: info.timeSeconds || 0,
      date: new Date().toISOString(),
      country: guessCountry(),
    });
    // Maior pontuação primeiro; empate resolvido por quem foi mais rápido
    entries.sort((a, b) => b.score - a.score || a.time - b.time);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    save();
  }

  function getTop(n) {
    return entries.slice(0, n);
  }

  /** Posição (1-based) da MELHOR pontuação de um jogador, ou null se não tiver entrado ainda. */
  function getMyBestRank(name) {
    const idx = entries.findIndex(e => e.name === name);
    return idx === -1 ? null : idx + 1;
  }

  function getTotalEntries() {
    return entries.length;
  }

  return { load, save, addEntry, getTop, getMyBestRank, getTotalEntries };
})();
