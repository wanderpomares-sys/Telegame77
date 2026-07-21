/**
 * sw.js — Service Worker do Tele Game Vintage.
 *
 * Objetivo (Etapa 13): permitir que o jogo abra e funcione mesmo sem internet,
 * depois da primeira visita. Estratégia "cache primeiro, rede como reserva":
 * tudo que já foi baixado uma vez continua funcionando offline; se algo novo
 * aparecer (nova versão), ele atualiza em segundo plano pra próxima vez.
 *
 * IMPORTANTE: sempre que os arquivos do jogo mudarem de verdade, troque o
 * número da versão em CACHE_NAME abaixo — é assim que o navegador sabe que
 * precisa baixar tudo de novo em vez de usar a cópia antiga guardada.
 */
const CACHE_VERSION = 'v9';
const CACHE_NAME = 'telegamevintage-' + CACHE_VERSION;

// Arquivos essenciais pro jogo abrir e rodar sem rede.
const APP_SHELL = [
  '.',
  'index.html',
  'style.css',
  'storage.js',
  'audio.js',
  'ads.js',
  'playservices.js',
  'coins.js',
  'shop.js',
  'stats.js',
  'achievements.js',
  'ranking.js',
  'levels.js',
  'missions.js',
  'script.js',
  'manifest.json',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // ativa a nova versão assim que possível
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('telegamevintage-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)) // limpa versões antigas do cache
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Só cuida de requisições GET normais (não mexe em POST, chamadas de API externas, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          // Atualiza o cache com a versão mais nova, silenciosamente, pra próxima vez
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // sem rede: cai pro que já estava salvo

      // Responde com o cache na hora (rápido), se existir; senão espera a rede
      return cached || networkFetch;
    })
  );
});
