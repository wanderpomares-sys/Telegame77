/**
 * i18n.js — Sistema de tradução (Português / Inglês / Espanhol).
 *
 * Como funciona: cada string do jogo tem uma "chave" (ex: "menu.jogar"), e
 * pra cada chave existe uma tradução nos 3 idiomas. A função `t(chave)`
 * devolve a tradução no idioma atual. Strings com partes variáveis (tipo
 * "Você venceu por 5 a 3") usam `{{variavel}}` no texto e um segundo
 * argumento com os valores — ver exemplos no dicionário abaixo.
 *
 * Cobertura: menu, telas principais, botões comuns, manual e créditos estão
 * traduzidos. Conquistas, itens da loja e missões (o conteúdo mais extenso
 * do jogo) ainda estão só em português — ver README para o que falta.
 */
const GameI18n = (function () {
  let currentLang = 'pt';

  const STRINGS = {
    // =========================================================================
    // PORTUGUÊS (idioma original do jogo)
    // =========================================================================
    pt: {
      'lang.name': 'Português',

      // --- Menu principal ---
      'menu.jogar': '▶ Jogar',
      'menu.campeonato': '🏆 Campeonato',
      'menu.estatisticas': '📊 Estatísticas',
      'menu.conquistas': '🎖️ Conquistas',
      'menu.ranking': '📈 Ranking',
      'menu.loja': '🛒 Loja',
      'menu.configuracoes': '⚙️ Configurações',
      'menu.ajuda': '❓ Como Jogar',
      'menu.creditos': 'ℹ️ Créditos',
      'menu.loginHint': 'Digite seu nome acima pra entrar',
      'menu.namePlaceholder': 'Seu nome de jogador',
      'menu.entrar': 'Entrar',
      'menu.trocarJogador': 'Trocar jogador',

      // --- Botões comuns (aparecem em várias telas) ---
      'common.voltarMenu': 'Voltar ao Menu',
      'common.jogarDeNovo': 'Jogar de novo',
      'common.continuar': 'Continuar',
      'common.fechar': 'Fechar',
      'common.comprar': 'Comprar',
      'common.equipar': 'Equipar',
      'common.equipado': 'Equipado',
      'common.jogar': 'Jogar',
      'common.tentarDeNovo': 'Tentar de novo',
      'common.sairCampeonato': 'Sair do campeonato',
      'common.proximaFase': 'Próxima fase',
      'common.modoLivre': 'Modo livre',

      // --- Modos de jogo ---
      'mode.paredao': 'Paredão',
      'mode.tenis': 'Tênis',
      'mode.futebol': 'Futebol',
      'mode.barreira': 'Barreira',

      // --- Dificuldade ---
      'difficulty.facil': 'Fácil',
      'difficulty.medio': 'Médio',
      'difficulty.dificil': 'Difícil',
      'difficulty.impossivel': 'Impossível',

      // --- Configurações ---
      'settings.title': '⚙️ Configurações',
      'settings.somLigado': 'Som: <b>Ligado 🔊</b>',
      'settings.somDesligado': 'Som: <b>Desligado 🔇</b>',
      'settings.musicaLigada': 'Música de fundo: <b>Ligada 🎵</b>',
      'settings.musicaDesligada': 'Música de fundo: <b>Desligada</b>',
      'settings.jogadorAtual': 'Jogador atual',
      'settings.nenhum': 'Nenhum — entre com um nome no jogo',
      'settings.desligarSom': 'Desligar som',
      'settings.ligarSom': 'Ligar som',
      'settings.desligarMusica': 'Desligar música',
      'settings.ligarMusica': 'Ligar música',
      'settings.idioma': 'Idioma',

      // --- Créditos ---
      'credits.title': 'ℹ️ Créditos',
      'credits.body': 'Em 1977, a Philco-Ford lançou o Telejogo — o primeiro videogame doméstico fabricado no Brasil. Bolinha, duas raquetes, e uma TV de tubo. Esse jogo tenta reviver aquela sensação no seu celular, quase 50 anos depois.',
      'credits.criadoPor': 'Criado por',
      'credits.feitoCom': 'Feito com HTML5 Canvas, CSS e JavaScript puro.',

      // --- Manual ---
      'help.title': '❓ Como Jogar',
    },

    // =========================================================================
    // ENGLISH
    // =========================================================================
    en: {
      'lang.name': 'English',

      'menu.jogar': '▶ Play',
      'menu.campeonato': '🏆 Championship',
      'menu.estatisticas': '📊 Stats',
      'menu.conquistas': '🎖️ Achievements',
      'menu.ranking': '📈 Ranking',
      'menu.loja': '🛒 Shop',
      'menu.configuracoes': '⚙️ Settings',
      'menu.ajuda': '❓ How to Play',
      'menu.creditos': 'ℹ️ Credits',
      'menu.loginHint': 'Type your name above to start',
      'menu.namePlaceholder': 'Your player name',
      'menu.entrar': 'Enter',
      'menu.trocarJogador': 'Switch player',

      'common.voltarMenu': 'Back to Menu',
      'common.jogarDeNovo': 'Play again',
      'common.continuar': 'Continue',
      'common.fechar': 'Close',
      'common.comprar': 'Buy',
      'common.equipar': 'Equip',
      'common.equipado': 'Equipped',
      'common.jogar': 'Play',
      'common.tentarDeNovo': 'Try again',
      'common.sairCampeonato': 'Leave championship',
      'common.proximaFase': 'Next stage',
      'common.modoLivre': 'Free mode',

      'mode.paredao': 'Wall',
      'mode.tenis': 'Tennis',
      'mode.futebol': 'Soccer',
      'mode.barreira': 'Barrier',

      'difficulty.facil': 'Easy',
      'difficulty.medio': 'Medium',
      'difficulty.dificil': 'Hard',
      'difficulty.impossivel': 'Impossible',

      'settings.title': '⚙️ Settings',
      'settings.somLigado': 'Sound: <b>On 🔊</b>',
      'settings.somDesligado': 'Sound: <b>Off 🔇</b>',
      'settings.musicaLigada': 'Background music: <b>On 🎵</b>',
      'settings.musicaDesligada': 'Background music: <b>Off</b>',
      'settings.jogadorAtual': 'Current player',
      'settings.nenhum': 'None — enter a name in the game',
      'settings.desligarSom': 'Turn off sound',
      'settings.ligarSom': 'Turn on sound',
      'settings.desligarMusica': 'Turn off music',
      'settings.ligarMusica': 'Turn on music',
      'settings.idioma': 'Language',

      'credits.title': 'ℹ️ Credits',
      'credits.body': 'In 1977, Philco-Ford launched the Telejogo — the first home video game made in Brazil. A ball, two paddles, and a tube TV. This game tries to revive that feeling on your phone, almost 50 years later.',
      'credits.criadoPor': 'Created by',
      'credits.feitoCom': 'Made with pure HTML5 Canvas, CSS and JavaScript.',

      'help.title': '❓ How to Play',
    },

    // =========================================================================
    // ESPAÑOL
    // =========================================================================
    es: {
      'lang.name': 'Español',

      'menu.jogar': '▶ Jugar',
      'menu.campeonato': '🏆 Campeonato',
      'menu.estatisticas': '📊 Estadísticas',
      'menu.conquistas': '🎖️ Logros',
      'menu.ranking': '📈 Clasificación',
      'menu.loja': '🛒 Tienda',
      'menu.configuracoes': '⚙️ Ajustes',
      'menu.ajuda': '❓ Cómo Jugar',
      'menu.creditos': 'ℹ️ Créditos',
      'menu.loginHint': 'Escribe tu nombre arriba para entrar',
      'menu.namePlaceholder': 'Tu nombre de jugador',
      'menu.entrar': 'Entrar',
      'menu.trocarJogador': 'Cambiar jugador',

      'common.voltarMenu': 'Volver al Menú',
      'common.jogarDeNovo': 'Jugar de nuevo',
      'common.continuar': 'Continuar',
      'common.fechar': 'Cerrar',
      'common.comprar': 'Comprar',
      'common.equipar': 'Equipar',
      'common.equipado': 'Equipado',
      'common.jogar': 'Jugar',
      'common.tentarDeNovo': 'Intentar de nuevo',
      'common.sairCampeonato': 'Salir del campeonato',
      'common.proximaFase': 'Siguiente fase',
      'common.modoLivre': 'Modo libre',

      'mode.paredao': 'Muro',
      'mode.tenis': 'Tenis',
      'mode.futebol': 'Fútbol',
      'mode.barreira': 'Barrera',

      'difficulty.facil': 'Fácil',
      'difficulty.medio': 'Medio',
      'difficulty.dificil': 'Difícil',
      'difficulty.impossivel': 'Imposible',

      'settings.title': '⚙️ Ajustes',
      'settings.somLigado': 'Sonido: <b>Activado 🔊</b>',
      'settings.somDesligado': 'Sonido: <b>Desactivado 🔇</b>',
      'settings.musicaLigada': 'Música de fondo: <b>Activada 🎵</b>',
      'settings.musicaDesligada': 'Música de fondo: <b>Desactivada</b>',
      'settings.jogadorAtual': 'Jugador actual',
      'settings.nenhum': 'Ninguno — escribe un nombre en el juego',
      'settings.desligarSom': 'Desactivar sonido',
      'settings.ligarSom': 'Activar sonido',
      'settings.desligarMusica': 'Desactivar música',
      'settings.ligarMusica': 'Activar música',
      'settings.idioma': 'Idioma',

      'credits.title': 'ℹ️ Créditos',
      'credits.body': 'En 1977, Philco-Ford lanzó el Telejogo — la primera videoconsola doméstica fabricada en Brasil. Una pelota, dos raquetas y un televisor de tubo. Este juego intenta revivir esa sensación en tu celular, casi 50 años después.',
      'credits.criadoPor': 'Creado por',
      'credits.feitoCom': 'Hecho con HTML5 Canvas, CSS y JavaScript puro.',

      'help.title': '❓ Cómo Jugar',
    },
  };

  function storageKey() { return 'telegamevintage-lang'; }

  async function load() {
    const saved = await GameStorage.getValue(storageKey());
    if (saved && STRINGS[saved]) currentLang = saved;
    return currentLang;
  }

  async function setLang(lang) {
    if (!STRINGS[lang]) return;
    currentLang = lang;
    await GameStorage.setValue(storageKey(), lang);
  }

  function getLang() { return currentLang; }

  function availableLanguages() { return Object.keys(STRINGS); }

  /**
   * Traduz uma chave pro idioma atual. Se a chave não existir no idioma
   * atual, cai pro português (nunca mostra a chave crua tipo "menu.jogar"
   * na tela). Aceita variáveis: t('vitoria.msg', {a: 5, b: 3}).
   */
  function t(key, vars) {
    const dict = STRINGS[currentLang] || STRINGS.pt;
    let str = dict[key];
    if (str === undefined) str = STRINGS.pt[key];
    if (str === undefined) return key; // último recurso: mostra a chave, nunca quebra

    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), vars[k]);
      });
    }
    return str;
  }

  return { load, setLang, getLang, availableLanguages, t };
})();
