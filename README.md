# Tele Game Vintage — Código-fonte

Jogo estilo Pong inspirado no Telejogo (Philco-Ford, 1977), reconstruído com
HTML5 Canvas, CSS e JavaScript puro — sem frameworks, sem bibliotecas de jogo.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | Estrutura da página: menu, tela do jogo, controles, telas (loja, estatísticas, etc.) |
| `style.css` | Toda a aparência visual (console retrô, CRT, animações, temas da loja) |
| `storage.js` | Camada única de persistência (`window.storage` → `localStorage`) |
| `audio.js` | Todos os sons (Web Audio API, sem arquivos de áudio) + vibração |
| `ads.js` | Estrutura preparada pra anúncios (AdMob) — hoje desligada, ver comentários |
| `playservices.js` | Estrutura preparada pra Google Play Games (Cloud Save/Leaderboards) — hoje desligada |
| `coins.js` | Moedas virtuais: ganhos por vitória, sequência, conquista, desafio diário |
| `shop.js` | Loja: 10 categorias de itens cosméticos, compra e equipar |
| `stats.js` | Estatísticas do jogador (partidas, vitórias, tempo jogado, etc.) |
| `achievements.js` | 18 conquistas, com animação e som ao desbloquear |
| `ranking.js` | Ranking de pontuações (local hoje, preparado pra API remota depois) |
| `levels.js` | Nível e experiência (XP) do jogador |
| `missions.js` | Missões diárias (3 por dia, sorteadas pela data) |
| `script.js` | Física, IA, campeonato, modos especiais, menu — o "motor" do jogo |
| `sw.js` | Service Worker: cache offline (Etapa 13) |
| `manifest.json` | Configuração de app instalável (ícone, nome, atalhos) |
| `icon-*.png` | Ícones em diferentes tamanhos |

## Sobre o som

Nenhum arquivo de áudio (.mp3/.wav). Todo efeito sonoro é sintetizado na hora
com osciladores da **Web Audio API** — o mesmo princípio dos consoles
originais de Pong, que geravam bipes eletronicamente.

## Modo offline (Service Worker)

O `sw.js` guarda uma cópia de todos os arquivos do jogo na primeira visita, e
usa essa cópia quando não há internet. **Sempre que qualquer arquivo do jogo
mudar de verdade, aumente o número em `CACHE_VERSION` no topo do `sw.js`** —
é assim que o navegador sabe que precisa baixar tudo de novo.

## Estrutura pronta, mas não conectada (Etapa 15)

`ads.js` e `playservices.js` têm toda a "tomada" pronta pra anúncios (AdMob) e
Google Play Games (Cloud Save, Leaderboards, Achievements), mas **nada está
conectado a um SDK de verdade** — cada função tem um comentário `TODO` exato
de onde entraria a chamada real, quando isso existir. Enquanto isso, tudo
funciona 100% localmente, sem depender de internet ou de contas.

## Como testar localmente

Abra `index.html` num navegador — precisa que todos os arquivos estejam na
mesma pasta (são vários `<script src="...">`, não um arquivo só).

## Publicando como app Android (via Capacitor)

Este projeto de código-fonte é o que entra na pasta `www/` de um projeto
Capacitor. Passos gerais:

1. `npm init -y && npm install @capacitor/core @capacitor/cli`
2. `npx cap init "Tele Game Vintage" "com.wanderpomares.telegamevintage" --web-dir www`
3. Copie todos os arquivos desta pasta pra dentro de `www/`
4. `npx cap add android` (precisa do Android Studio instalado)
5. `npx cap sync` sempre que mudar algo em `www/`
6. `npx cap open android` — abre no Android Studio, onde dá pra rodar num
   emulador/celular e gerar o `.apk` (teste) ou `.aab` (pra publicar na Play Store)

Consulte o `README` do projeto Capacitor (gerado separadamente) pra mais
detalhes sobre ícone adaptativo, splash nativa e assinatura do app.
