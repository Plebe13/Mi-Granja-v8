import { game, TIER, repairTool } from './main.js';
import { getToolDurabilityBonusPct } from './achievements.js';
import { ITEM_ICONS } from "./item_icons.js";


/* =========================
   🧱 Orden de recursos
   ========================= */

const ORDER = [
  // Campos / semillas
  'trigo',
  'maiz',
  'seeds_trigo',
  'seeds_maiz',

  // Madera / carpintero
  'madera',
  'tablones',
  'mango_madera',
  'mango_pala',
  'fence',
  'trough',
  'crate_small',
  'cart_frame',

  // Piedra / carbón / metal
  'piedra',
  'carbon',
  'hierro',
  'barra_hierro',
  'acero_refinado',
  'clavos',
  'head_hoe',
  'head_axe',
  'head_pick',
  'bucket_wood',
  'bucket_metal',
  'knife_blade',
  'sickle_blade',

  // Ganado / animales / bosque
  'milk',
  'eggs',
  'meat',
  'mushroom',
  'herb_lunar',
  'low_gem',
  'wolf_pelt',
  'vet_med',

  // Comida cocinero
  'pan_simple',
  'pan_rico',
  'sopa_verduras',
  'estofado_campesino',
  'desayuno_huevos',
  'carne_asada',
  'lunch_minero',
  'comida_ranchero',

  // Pociones / tónicos
  'potion_energy_small',
  'potion_field',
  'potion_forest',
  'potion_mine',
  'potion_sell',
  'unguento_animal',
  'potion_growth',
  'potion_detox'
];

/* =========================
   ⚔️ Items de equipo (inventario RPG)
   ========================= */

const EQUIP_ITEMS = [
  'knife_rustic',
  'armor_leather',
  'ring_farmer',
  'amulet_luck',       // 🆕 amuleto
  'cloak_traveler',    // 🆕 capa
  'backpack_simple',
  'axe_basic',
  'pick_basic',
  'hoe_basic'
];

/* =========================
   🎨 Iconos y nombres
   ========================= */

const ICON = {
  // básicos campo
  trigo: '🌾',
  maiz: '🌽',
  seeds_trigo: '🌾',
  seeds_maiz: '🌽',

  // madera / carpintero
  madera: '🪵',
  tablones: '🧱',
  mango_madera: '🪵',
  mango_pala: '🪵',
  fence: '🚧',
  trough: '🪵',
  crate_small: '📦',
  cart_frame: '🛒',

  // piedra / carbón / metal
  piedra: '🪨',
  carbon: '⚫',
  hierro: '⛏️',
  barra_hierro: '➖',
  acero_refinado: '⚙️',
  clavos: '📎',
  head_hoe: '⚒️',
  head_axe: '🪓',
  head_pick: '⛏️',
  bucket_wood: '🪣',
  bucket_metal: '🪣',
  knife_blade: '🔪',
  sickle_blade: '⚔️',

  // ganado / bosque
  milk: '🥛',
  eggs: '🥚',
  meat: '🍖',
  mushroom: '🍄',
  herb_lunar: '🌿',
  low_gem: '💠',
  wolf_pelt: '🐺',
  vet_med: '💊',

  // comidas
  pan_simple: '🍞',
  pan_rico: '🥖',
  sopa_verduras: '🥣',
  estofado_campesino: '🍲',
  desayuno_huevos: '🍳',
  carne_asada: '🍖',
  lunch_minero: '🥡',
  comida_ranchero: '🍱',

  // pociones
  potion_energy_small: '🧪',
  potion_field: '🧪',
  potion_forest: '🧪',
  potion_mine: '🧪',
  potion_sell: '🧪',
  unguento_animal: '💊',
  potion_growth: '🧪',
  potion_detox: '🧪',

    // ⚔️ equipo RPG
  knife_rustic:    '🗡️',
  armor_leather:   '🧥',
  ring_farmer:     '💍',

  // 🆕 nuevos accesorios
  amulet_luck:     '🔮',
  cloak_traveler:  '🧥',

  backpack_simple: '🎒',
  axe_basic:       '🪓',
  pick_basic:      '⛏️',
  hoe_basic:       '🚜'
};

const LABEL = {
  // básicos campo
  trigo: 'Trigo',
  maiz: 'Maíz',
  seeds_trigo: 'Semillas de trigo',
  seeds_maiz: 'Semillas de maíz',

  // madera / carpintero
  madera: 'Madera',
  tablones: 'Tablones',
  mango_madera: 'Mango de herramienta',
  mango_pala: 'Mango de pala',
  fence: 'Sección de cerca',
  trough: 'Comedero rústico',
  crate_small: 'Caja pequeña',
  cart_frame: 'Estructura de carro',

  // piedra / carbón / metal
  piedra: 'Piedra',
  carbon: 'Carbón',
  hierro: 'Hierro',
  barra_hierro: 'Barra de hierro',
  acero_refinado: 'Acero refinado',
  clavos: 'Clavos de hierro',
  head_hoe: 'Cabeza de azadón',
  head_axe: 'Cabeza de hacha',
  head_pick: 'Cabeza de pico',
  bucket_wood: 'Cubeta de madera',
  bucket_metal: 'Cubeta metálica',
  knife_blade: 'Hoja de cuchillo',
  sickle_blade: 'Hoja de hoz',

  // ganado / bosque
  milk: 'Leche',
  eggs: 'Huevos',
  meat: 'Carne',
  mushroom: 'Hongos',
  herb_lunar: 'Hierba lunar',
  low_gem: 'Gema pequeña',
  wolf_pelt: 'Piel de lobo',
  vet_med: 'Medicina animal',

  // comida
  pan_simple: 'Pan simple',
  pan_rico: 'Pan enriquecido',
  sopa_verduras: 'Sopa de verduras',
  estofado_campesino: 'Estofado campesino',
  desayuno_huevos: 'Desayuno de huevos',
  carne_asada: 'Carne asada',
  lunch_minero: 'Lonche del minero',
  comida_ranchero: 'Plato del ranchero',

  // pociones
  potion_energy_small: 'Tónico ligero',
  potion_field: 'Tónico del campo',
  potion_forest: 'Tónico del bosque',
  potion_mine: 'Tónico del minero',
  potion_sell: 'Tónico mercader',
  unguento_animal: 'Ungüento animal',
  potion_growth: 'Tónico de crecimiento',
  potion_detox: 'Tónico depurativo',

    // ⚔️ equipo RPG
  knife_rustic:    'Cuchillo rústico',
  armor_leather:   'Chaleco de cuero',
  ring_farmer:     'Anillo del granjero',

  // 🆕 nuevos accesorios
  amulet_luck:     'Amuleto de la suerte',
  cloak_traveler:  'Capa del viajero',

  backpack_simple: 'Mochila simple',
  axe_basic:       'Hacha básica',
  pick_basic:      'Pico básico',
  hoe_basic:       'Azadón básico'
};

/* =========================
   🧺 Render del inventario
   ========================= */

export function renderInventario() {
  const el = document.getElementById('inventario');
  if (!el) return;

  if (!game.inv) game.inv = {};

  /* --- Recursos normales --- */
  const visibleResourceKeys = ORDER.filter(k => (game.inv[k] || 0) > 0);

  let resourcesHtml;
  if (!visibleResourceKeys.length) {
    resourcesHtml = `<p class="kv small-text">Todavía no tienes recursos en el inventario.</p>`;
  } else {
    const slots = visibleResourceKeys.map(k => renderInvSlot(k)).join('');
    resourcesHtml = `<div class="inv-grid">${slots}</div>`;
  }

  /* --- Equipo RPG que está en el inventario (no equipado) --- */
  const visibleEquipKeys = EQUIP_ITEMS.filter(k => (game.inv[k] || 0) > 0);

  let equipHtml;
  if (!visibleEquipKeys.length) {
    equipHtml = `<p class="kv small-text">No tienes piezas de equipo guardadas en el inventario.</p>`;
  } else {
    const slots = visibleEquipKeys.map(k => renderInvSlot(k)).join('');
    equipHtml = `<div class="inv-grid">${slots}</div>`;
  }

  /* --- Total de items (recursos + equipo) --- */
  const totalResources = ORDER.reduce((a, k) => a + (game.inv[k] || 0), 0);
  const totalEquip     = EQUIP_ITEMS.reduce((a, k) => a + (game.inv[k] || 0), 0);
  const totalItems     = totalResources + totalEquip;

  // Datos herramientas
  const A = game.tools?.axe;
  const P = game.tools?.pick;
  const H = game.tools?.hoe;

  let toolsHtml = '<p class="kv small-text">No hay herramientas registradas.</p>';

  if (A && P && H) {
    const b = getToolDurabilityBonusPct();
    const Amax = Math.round(TIER[A.tier].max * (1 + b));
    const Pmax = Math.round(TIER[P.tier].max * (1 + b));
    const Hmax = Math.round(TIER[H.tier].max * (1 + b));

    const A_pct = Math.max(0, Math.min(100, (A.dur / Amax) * 100));
    const P_pct = Math.max(0, Math.min(100, (P.dur / Pmax) * 100));
    const H_pct = Math.max(0, Math.min(100, (H.dur / Hmax) * 100));

    toolsHtml = `
      <div class="tool">
        <div class="name">🪓 Hacha — ${TIER[A.tier].name}</div>
        <div style="flex:1">
          <div class="progress"><div style="width:${A_pct}%"></div></div>
          <div class="kv">${A.dur}/${Amax}</div>
        </div>
        <button class="btn ghost small" data-repair="axe">Reparar</button>
      </div>

      <div class="tool">
        <div class="name">⛏️ Pico — ${TIER[P.tier].name}</div>
        <div style="flex:1">
          <div class="progress"><div style="width:${P_pct}%"></div></div>
          <div class="kv">${P.dur}/${Pmax}</div>
        </div>
        <button class="btn ghost small" data-repair="pick">Reparar</button>
      </div>

      <div class="tool">
        <div class="name">🚜 Azadón — ${TIER[H.tier].name}</div>
        <div style="flex:1">
          <div class="progress"><div style="width:${H_pct}%"></div></div>
          <div class="kv">${H.dur}/${Hmax}</div>
        </div>
        <button class="btn ghost small" data-repair="hoe">Reparar</button>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="row space">
      <h3>Inventario</h3>
      <div class="kv">Total: ${totalItems}</div>
    </div>

    <h4 style="margin-top:6px;margin-bottom:4px;">Recursos</h4>
    ${resourcesHtml}

    <hr class="sep"/>

    <h4 style="margin-top:6px;margin-bottom:4px;">Equipo en inventario</h4>
    <p class="small-text" style="margin:0 0 4px;">
      Aquí aparecen armas, armaduras, anillos, mochilas y herramientas que no están equipadas.
    </p>
    ${equipHtml}

    <hr class="sep"/>

    <h3>Herramientas</h3>
    ${toolsHtml}
  `;

  // Eventos de reparación
  el.querySelectorAll('[data-repair]').forEach(b => {
    b.onclick = () => repairTool(b.dataset.repair);
  });
}


/* =========================
   Helper para un slot
   ========================= */

function renderInvSlot(k) {
  const qty = game.inv[k] || 0;

  const iconPath = ITEM_ICONS[k];
  const iconHtml = iconPath
    ? `<img src="${iconPath}" class="inv-icon" alt="${LABEL[k] || k}">`
    : (ICON[k] || "❓");

  return `
    <div class="inv-slot" title="${LABEL[k] || k}">
      <div class="inv-icon-wrap">
        ${iconHtml}
      </div>
      <div class="qty">${qty}</div>
    </div>
  `;
}
