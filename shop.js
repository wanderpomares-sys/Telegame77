/**
 * shop.js — Loja de itens cosméticos.
 *
 * Cada item pertence a uma categoria (madeira, console, cor da tela, bola,
 * raquete, som, efeitos, moldura) e tem um efeito visual/sonoro associado.
 * O item "_default" de cada categoria é sempre gratuito e já vem liberado.
 *
 * Este módulo só cuida de CATÁLOGO + COMPRAS + O QUE ESTÁ EQUIPADO. Ele não
 * sabe desenhar nada nem tocar som — quem faz isso é o script.js, lendo
 * `GameShop.getEquippedConfig()` e aplicando os valores.
 */
const GameShop = (function () {
  const CATEGORIES = [
    { id: 'wood', label: 'Madeira' },
    { id: 'console', label: 'Console' },
    { id: 'screen', label: 'Cor da Tela' },
    { id: 'ball', label: 'Bola' },
    { id: 'paddle', label: 'Raquete' },
    { id: 'sound', label: 'Sons' },
    { id: 'effects', label: 'Efeitos' },
    { id: 'frame', label: 'Moldura' },
    { id: 'font', label: 'Fonte' },
    { id: 'arena', label: 'Arena' },
  ];

  const ITEMS = [
    // --- Madeira (faixa de madeira do console) ---
    { id: 'wood_default', category: 'wood', name: 'Padrão', price: 0,
      vars: { '--wood-dark': '#4a3324', '--wood-mid': '#6b4a30', '--wood-light': '#8a6440' } },
    { id: 'wood_mahogany', category: 'wood', name: 'Mogno Escuro', price: 80,
      vars: { '--wood-dark': '#2e1710', '--wood-mid': '#5c2e1c', '--wood-light': '#7a4228' } },
    { id: 'wood_oak', category: 'wood', name: 'Carvalho Claro', price: 80,
      vars: { '--wood-dark': '#8a6b3d', '--wood-mid': '#b6905a', '--wood-light': '#d9b87e' } },
    { id: 'wood_ebony', category: 'wood', name: 'Ébano', price: 120,
      vars: { '--wood-dark': '#0d0d0d', '--wood-mid': '#232323', '--wood-light': '#3a3a3a' } },

    // --- Console (corpo do aparelho) ---
    { id: 'console_default', category: 'console', name: 'Padrão', price: 0,
      vars: { '--panel-black': '#1a1a1a' } },
    { id: 'console_graphite', category: 'console', name: 'Grafite', price: 100,
      vars: { '--panel-black': '#26282b' } },
    { id: 'console_military', category: 'console', name: 'Verde Militar', price: 100,
      vars: { '--panel-black': '#1c2418' } },
    { id: 'console_wine', category: 'console', name: 'Vinho', price: 120,
      vars: { '--panel-black': '#2a1418' } },

    // --- Cor da tela (fundo do "vidro") ---
    { id: 'screen_default', category: 'screen', name: 'Verde Escuro', price: 0, screenBg: '#0c0e0a' },
    { id: 'screen_blue', category: 'screen', name: 'Azul CRT', price: 90, screenBg: '#0a0e14' },
    { id: 'screen_amber', category: 'screen', name: 'Âmbar Escuro', price: 90, screenBg: '#140f08' },
    { id: 'screen_purple', category: 'screen', name: 'Roxo Retrô', price: 110, screenBg: '#100a14' },

    // --- Bola ---
    { id: 'ball_default', category: 'ball', name: 'Verde Fósforo', price: 0, color: '#c8e6c0' },
    { id: 'ball_white', category: 'ball', name: 'Branca Clássica', price: 60, color: '#f2f2f2' },
    { id: 'ball_gold', category: 'ball', name: 'Dourada', price: 150, color: '#e8c33d' },
    { id: 'ball_pink', category: 'ball', name: 'Rosa Neon', price: 150, color: '#ff5fa3' },

    // --- Raquete ---
    { id: 'paddle_default', category: 'paddle', name: 'Verde Fósforo', price: 0, color: '#c8e6c0' },
    { id: 'paddle_amber', category: 'paddle', name: 'Âmbar', price: 70, color: '#e8a33d' },
    { id: 'paddle_blue', category: 'paddle', name: 'Azul Elétrico', price: 70, color: '#5fc9ff' },
    { id: 'paddle_red', category: 'paddle', name: 'Vermelho Arcade', price: 70, color: '#ff5050' },

    // --- Sons (paleta de timbres) ---
    { id: 'sound_default', category: 'sound', name: 'Clássico', price: 0, pack: 'classico' },
    { id: 'sound_soft', category: 'sound', name: 'Suave', price: 80, pack: 'suave' },
    { id: 'sound_arcade', category: 'sound', name: 'Arcade', price: 80, pack: 'arcade' },

    // --- Efeitos visuais (intensidade do rastro/partículas/brilho) ---
    { id: 'effects_default', category: 'effects', name: 'Padrão', price: 0, level: 'padrao' },
    { id: 'effects_min', category: 'effects', name: 'Minimalista', price: 50, level: 'minimo' },
    { id: 'effects_max', category: 'effects', name: 'Intenso', price: 100, level: 'maximo' },

    // --- Moldura da tela ---
    { id: 'frame_default', category: 'frame', name: 'Padrão', price: 0, frameColor: '#222222' },
    { id: 'frame_metal', category: 'frame', name: 'Metálica', price: 90, frameColor: '#8a8a8a' },
    { id: 'frame_neon', category: 'frame', name: 'Néon', price: 130, frameColor: '#5fc9ff' },

    // --- Fonte (tipografia da interface) — todas gratuitas, é só estética ---
    { id: 'font_default', category: 'font', name: 'Courier Clássica', price: 0, font: "'Courier New', monospace" },
    { id: 'font_terminal', category: 'font', name: 'Terminal', price: 0, font: "Consolas, Menlo, 'Lucida Console', monospace" },
    { id: 'font_digital', category: 'font', name: 'Digital Retrô', price: 0, font: "'Courier New', monospace", letterSpacing: '2px' },

    // --- Arena (padrão visual de fundo da quadra) ---
    { id: 'arena_default', category: 'arena', name: 'Lisa', price: 0, pattern: 'lisa' },
    { id: 'arena_grid', category: 'arena', name: 'Grade', price: 70, pattern: 'grade' },
    { id: 'arena_dots', category: 'arena', name: 'Pontilhada', price: 70, pattern: 'pontos' },
    { id: 'arena_stripes', category: 'arena', name: 'Diagonais', price: 90, pattern: 'diagonais' },
  ];

  let playerName = null;
  let purchased = {};
  let equipped = {};

  function defaultItemOf(category) {
    return ITEMS.find(i => i.category === category && i.price === 0);
  }

  function itemsInCategory(category) {
    return ITEMS.filter(i => i.category === category);
  }

  function getItem(id) {
    return ITEMS.find(i => i.id === id) || null;
  }

  function ensureDefaults() {
    CATEGORIES.forEach(cat => {
      const def = defaultItemOf(cat.id);
      if (def && !purchased[def.id]) purchased[def.id] = true;
      if (!equipped[cat.id]) equipped[cat.id] = def ? def.id : null;
    });
  }

  function purchasedKey(name) { return 'telegamevintage-shop-purchased:' + name; }
  function equippedKey(name) { return 'telegamevintage-shop-equipped:' + name; }

  async function load(name) {
    playerName = name;
    purchased = await GameStorage.getJSON(purchasedKey(name), {});
    equipped = await GameStorage.getJSON(equippedKey(name), {});
    ensureDefaults();
    save();
  }

  function save() {
    if (!playerName) return;
    GameStorage.setJSON(purchasedKey(playerName), purchased);
    GameStorage.setJSON(equippedKey(playerName), equipped);
  }

  function isPurchased(id) {
    return !!purchased[id];
  }

  function isEquipped(id) {
    const item = getItem(id);
    return !!item && equipped[item.category] === id;
  }

  /**
   * Compra um item, se tiver moedas suficientes (checa/gasta via GameCoins).
   * @returns {{success:boolean, reason?:string}}
   */
  function purchase(id) {
    const item = getItem(id);
    if (!item) return { success: false, reason: 'item-invalido' };
    if (isPurchased(id)) return { success: false, reason: 'ja-possui' };
    // Itens grátis (preço 0) são liberados direto — GameCoins.spend() existe
    // pra gastar moedas de verdade, então não faz sentido chamá-lo com 0.
    if (item.price > 0 && !GameCoins.spend(item.price)) {
      return { success: false, reason: 'moedas-insuficientes' };
    }
    purchased[id] = true;
    save();
    return { success: true };
  }

  /** Equipa um item já comprado. Retorna false se ele ainda não foi comprado. */
  function equip(id) {
    const item = getItem(id);
    if (!item || !isPurchased(id)) return false;
    equipped[item.category] = id;
    save();
    return true;
  }

  /** Lista de uma categoria já com o status (comprado/equipado) pronto pra exibir. */
  function getCategoryView(category) {
    return itemsInCategory(category).map(item => ({
      ...item,
      purchased: isPurchased(item.id),
      equipped: isEquipped(item.id),
    }));
  }

  /**
   * Junta o efeito de TODOS os itens equipados num único objeto de configuração,
   * pronto pro script.js aplicar (CSS vars + cores do canvas + som + efeitos).
   */
  function getEquippedConfig() {
    const cfg = { cssVars: {}, ballColor: null, paddleColor: null, screenBg: null, frameColor: null, soundPack: 'classico', effectsLevel: 'padrao', font: null, letterSpacing: null, arenaPattern: 'lisa' };
    Object.keys(equipped).forEach(category => {
      const item = getItem(equipped[category]);
      if (!item) return;
      if (item.vars) Object.assign(cfg.cssVars, item.vars);
      if (item.color && category === 'ball') cfg.ballColor = item.color;
      if (item.color && category === 'paddle') cfg.paddleColor = item.color;
      if (item.screenBg) cfg.screenBg = item.screenBg;
      if (item.frameColor) cfg.frameColor = item.frameColor;
      if (item.pack) cfg.soundPack = item.pack;
      if (item.level) cfg.effectsLevel = item.level;
      if (item.font) cfg.font = item.font;
      if (item.letterSpacing) cfg.letterSpacing = item.letterSpacing;
      if (item.pattern) cfg.arenaPattern = item.pattern;
    });
    return cfg;
  }

  return {
    CATEGORIES, getItem, getCategoryView, getEquippedConfig,
    purchase, equip, isPurchased, isEquipped, load,
  };
})();
