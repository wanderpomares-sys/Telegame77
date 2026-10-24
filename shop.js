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
  // Categorias visíveis na loja. (Os itens antigos de madeira/console/fonte
  // continuam no catálogo só para não perder compras já feitas.)
  const CATEGORIES = [
    { id: 'ball', label: 'Bolas' },
    { id: 'paddle', label: 'Raquetes' },
    { id: 'screen', label: 'Ambientes' },
    { id: 'frame', label: 'Borda Neon' },
    { id: 'arena', label: 'Pisos' },
    { id: 'effects', label: 'Efeitos' },
    { id: 'sound', label: 'Sons' },
  ];

  const ITEMS = [
    // --- Bolas ---
    { id: 'ball_default', category: 'ball', name: 'Clássica', price: 0, color: '#c8e6c0' },
    { id: 'ball_white', category: 'ball', name: 'Pérola', price: 80, color: '#f2f2f2' },
    { id: 'ball_cyan', category: 'ball', name: 'Plasma Ciano', price: 200, color: '#3de8ff' },
    { id: 'ball_pink', category: 'ball', name: 'Rosa Neon', price: 200, color: '#ff5fa3' },
    { id: 'ball_lava', category: 'ball', name: 'Lava', price: 300, color: '#ff5a1f' },
    { id: 'ball_lime', category: 'ball', name: 'Ácido', price: 300, color: '#b6ff2a' },
    { id: 'ball_violet', category: 'ball', name: 'Galáxia', price: 400, color: '#a66bff' },
    { id: 'ball_gold', category: 'ball', name: 'Ouro Maciço', price: 600, color: '#ffc61a' },

    // --- Raquetes ---
    { id: 'paddle_default', category: 'paddle', name: 'Clássica', price: 0, color: '#c8e6c0' },
    { id: 'paddle_blue', category: 'paddle', name: 'Azul Elétrico', price: 100, color: '#4fc3ff' },
    { id: 'paddle_red', category: 'paddle', name: 'Vermelho Turbo', price: 100, color: '#ff4d4d' },
    { id: 'paddle_amber', category: 'paddle', name: 'Âmbar', price: 100, color: '#ffa726' },
    { id: 'paddle_green', category: 'paddle', name: 'Verde Radioativo', price: 200, color: '#39ff7a' },
    { id: 'paddle_purple', category: 'paddle', name: 'Ultravioleta', price: 250, color: '#9b6bff' },
    { id: 'paddle_chrome', category: 'paddle', name: 'Cromada', price: 400, color: '#dfe7f2' },
    { id: 'paddle_gold', category: 'paddle', name: 'Ouro Real', price: 600, color: '#ffc61a' },

    // --- Ambientes (cor do piso da arena) ---
    { id: 'screen_default', category: 'screen', name: 'Arena Padrão', price: 0, screenBg: '#0c0e0a' },
    { id: 'screen_ocean', category: 'screen', name: 'Oceano', price: 150, screenBg: '#0b3d66' },
    { id: 'screen_forest', category: 'screen', name: 'Floresta', price: 150, screenBg: '#0f4a2a' },
    { id: 'screen_lava', category: 'screen', name: 'Vulcão', price: 250, screenBg: '#5a1608' },
    { id: 'screen_galaxy', category: 'screen', name: 'Galáxia', price: 300, screenBg: '#2a1260' },
    { id: 'screen_ice', category: 'screen', name: 'Gelo Polar', price: 300, screenBg: '#2f6f8f' },
    { id: 'screen_sunset', category: 'screen', name: 'Pôr do Sol', price: 400, screenBg: '#7a2a52' },

    // --- Borda neon da arena ---
    { id: 'frame_default', category: 'frame', name: 'Padrão', price: 0, frameColor: '#222222' },
    { id: 'frame_cyan', category: 'frame', name: 'Ciano', price: 120, frameColor: '#3de8ff' },
    { id: 'frame_pink', category: 'frame', name: 'Rosa', price: 120, frameColor: '#ff4fb8' },
    { id: 'frame_green', category: 'frame', name: 'Verde', price: 120, frameColor: '#4dff8a' },
    { id: 'frame_gold', category: 'frame', name: 'Dourada', price: 250, frameColor: '#ffc61a' },
    { id: 'frame_white', category: 'frame', name: 'Branco Puro', price: 250, frameColor: '#ffffff' },

    // --- Pisos (desenho da quadra) ---
    { id: 'arena_default', category: 'arena', name: 'Liso', price: 0, pattern: 'lisa' },
    { id: 'arena_grid', category: 'arena', name: 'Grade', price: 100, pattern: 'grade' },
    { id: 'arena_dots', category: 'arena', name: 'Pontilhado', price: 100, pattern: 'pontos' },
    { id: 'arena_stripes', category: 'arena', name: 'Diagonais', price: 150, pattern: 'diagonais' },

    // --- Efeitos (rastro, partículas, brilho) ---
    { id: 'effects_default', category: 'effects', name: 'Padrão', price: 0, level: 'padrao' },
    { id: 'effects_min', category: 'effects', name: 'Discreto', price: 60, level: 'minimo' },
    { id: 'effects_max', category: 'effects', name: 'Explosivo', price: 300, level: 'maximo' },

    // --- Sons ---
    { id: 'sound_default', category: 'sound', name: 'Clássico', price: 0, pack: 'classico' },
    { id: 'sound_soft', category: 'sound', name: 'Suave', price: 100, pack: 'suave' },
    { id: 'sound_arcade', category: 'sound', name: 'Arcade', price: 150, pack: 'arcade' },

    // --- Itens antigos (fora da loja; mantidos para compras já feitas) ---
    { id: 'wood_default', category: 'wood', name: 'Padrão', price: 0, vars: { '--wood-dark': '#4a3324', '--wood-mid': '#6b4a30', '--wood-light': '#8a6440' } },
    { id: 'console_default', category: 'console', name: 'Padrão', price: 0, vars: { '--panel-black': '#1a1a1a' } },
    { id: 'font_default', category: 'font', name: 'Moderna', price: 0, font: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif" },
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
      if (!equipped[cat.id] || !getItem(equipped[cat.id])) equipped[cat.id] = def ? def.id : null;
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
