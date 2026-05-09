// profesiones.js
// Sistema de oficios + recetas + crafteo con colas, rarezas y mejora/reparación de herramientas.

import { game, toast, missionEvent, TIER } from './main.js';
import { getToolDurabilityBonusPct } from './achievements.js';
import { ITEM_ICONS } from './item_icons.js';

/* =========================
   🧾 Definición de oficios
   ========================= */

const PROF_DEFS = {
  herrero: {
    key: 'herrero',
    icon: '⚒️',
    label: 'Herrero',
    desc: 'Trabaja el hierro y el metal. Produce piezas, cabezas de herramientas y cubetas.'
  },
  carpintero: {
    key: 'carpintero',
    icon: '🪚',
    label: 'Carpintero',
    desc: 'Convierte madera en tablones, mangos y estructuras para la granja.'
  },
  cocinero: {
    key: 'cocinero',
    icon: '🍳',
    label: 'Cocinero',
    desc: 'Transforma ingredientes en comidas con buen valor y posibles buffs.'
  },
  herbalista: {
    key: 'herbalista',
    icon: '🌿',
    label: 'Herbalista',
    desc: 'Crea tónicos, ungüentos y pequeñas pociones con hierbas y recursos raros.'
  }
};

const PROF_KEYS = Object.keys(PROF_DEFS);

/* =========================
   🎨 Helpers de iconos para oficios
   ========================= */

// Nombres bonitos para tooltips
const PROF_LABELS = {
  madera: 'Madera',
  piedra: 'Piedra',
  hierro: 'Hierro',
  carbon: 'Carbón',
  tablones: 'Tablones',
  clavos: 'Clavos de hierro',
  barra_hierro: 'Barra de hierro',
  acero_refinado: 'Acero refinado',
  crate_small: 'Caja pequeña',
  bucket_wood: 'Cubeta de madera',
  bucket_metal: 'Cubeta metálica',
  cart_frame: 'Estructura de carro',
  trigo: 'Trigo',
  maiz: 'Maíz',
  seeds_trigo: 'Semillas de trigo',
  seeds_maiz: 'Semillas de maíz',
  meat: 'Carne',
  milk: 'Leche',
  eggs: 'Huevos',
  low_gem: 'Gema pequeña',
  mushroom: 'Hongos',
  herb_lunar: 'Hierba lunar'
};

// Emojis de respaldo (por si falta PNG)
const PROF_EMOJI = {
  madera: '🪵',
  piedra: '🧱',
  hierro: '⛏️',
  carbon: '⚫',
  tablones: '🧱',
  clavos: '📎',
  barra_hierro: '➖',
  acero_refinado: '⚙️',
  crate_small: '📦',
  bucket_wood: '🪣',
  bucket_metal: '🪣',
  cart_frame: '🛒',
  trigo: '🌾',
  maiz: '🌽',
  seeds_trigo: '🌱',
  seeds_maiz: '🌱',
  meat: '🍖',
  milk: '🥛',
  eggs: '🥚',
  low_gem: '💠',
  mushroom: '🍄',
  herb_lunar: '🌿'
};

function renderItemIconQty(key, qty) {
  const iconPath = ITEM_ICONS[key];
  const label =
    PROF_LABELS[key] ||
    RESOURCE_LABELS[key]?.label ||
    key.replace(/_/g, ' ');

  const iconHtml = iconPath
    ? `<img src="${iconPath}" class="cost-icon" alt="${label}">`
    : `<span class="cost-emoji">${PROF_EMOJI[key] || '📦'}</span>`;

  return `
    <span class="cost-item" title="${label}">
      ${iconHtml}
      <span class="cost-qty">${qty}</span>
    </span>
  `;
}

/* =========================
   📈 Niveles y XP
   ========================= */

const LEVEL_XP = [0, 25, 70, 140, 230, 340, 480, 650, 850, 1100];
const MAX_LEVEL = 10;

function levelFromXP(xp) {
  let lvl = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) {
      lvl = i + 1;
      break;
    }
  }
  return Math.min(lvl, MAX_LEVEL);
}

function xpProgress(prof) {
  const lvl = prof.level || 1;
  const xp = prof.xp || 0;
  const idx = lvl - 1;
  const base = LEVEL_XP[idx] || 0;
  const next = LEVEL_XP[idx + 1];

  if (!next || lvl >= MAX_LEVEL) {
    return { pct: 100, current: xp - base, needed: 0, maxed: true };
  }

  const num = xp - base;
  const den = next - base;
  const pct = Math.max(0, Math.min(100, (num / den) * 100));
  return { pct, current: num, needed: den, maxed: false };
}

function ensureProfessionsShape() {
  if (!game.professions) game.professions = {};
  PROF_KEYS.forEach(k => {
    if (!game.professions[k]) {
      game.professions[k] = { xp: 0, level: 1 };
    } else {
      const p = game.professions[k];
      if (typeof p.xp !== 'number') p.xp = 0;
      if (typeof p.level !== 'number') p.level = 1;
    }
  });
}

function addProfessionXP(profKey, amount) {
  ensureProfessionsShape();
  const def = PROF_DEFS[profKey];
  if (!def) return;

  const p = game.professions[profKey];
  p.xp = (p.xp || 0) + Math.max(0, amount || 0);

  const oldLevel = p.level || 1;
  const newLevel = levelFromXP(p.xp);
  p.level = newLevel;

  if (newLevel > oldLevel) {
    toast(`🔼 Tu nivel de ${def.label} sube a ${newLevel}.`);
  }
}

/* =========================
   📦 Recursos (nombres bonitos)
   ========================= */

const RESOURCE_LABELS = {
  madera:       { icon: '🪵', label: 'Madera' },
  piedra:       { icon: '🧱', label: 'Piedra' },
  hierro:       { icon: '⛏️', label: 'Hierro' },
  trigo:        { icon: '🌾', label: 'Trigo' },
  maiz:         { icon: '🌽', label: 'Maíz' },
  seeds_trigo:  { icon: '🌱', label: 'Semillas trigo' },
  seeds_maiz:   { icon: '🌱', label: 'Semillas maíz' },
  milk:         { icon: '🥛', label: 'Leche' },
  eggs:         { icon: '🥚', label: 'Huevos' },
  meat:         { icon: '🍖', label: 'Carne' },
  vet_med:      { icon: '💊', label: 'Medicina animal' },
  mushroom:     { icon: '🍄', label: 'Hongos' },
  herb_lunar:   { icon: '🌿', label: 'Hierba lunar' },
  low_gem:      { icon: '💠', label: 'Gema pequeña' },
  wolf_pelt:    { icon: '🐺', label: 'Piel de lobo' },

  // materiales herrero/carpintero
  tablones:       { icon: '🧱', label: 'Tablones' },
  mango_madera:   { icon: '🪵', label: 'Mango de madera' },
  mango_pala:     { icon: '🪵', label: 'Mango de pala' },
  clavos:         { icon: '📎', label: 'Clavos de hierro' },
  barra_hierro:   { icon: '➖', label: 'Barra de hierro' },
  acero_refinado: { icon: '⚙️', label: 'Acero refinado' },
  head_hoe:       { icon: '⚒️', label: 'Cabeza de azadón' },
  head_axe:       { icon: '🪓', label: 'Cabeza de hacha' },
  head_pick:      { icon: '⛏️', label: 'Cabeza de pico' },
  bucket_metal:   { icon: '🪣', label: 'Cubeta metálica' },
  bucket_wood:    { icon: '🪣', label: 'Cubeta de madera' },
  knife_blade:    { icon: '🔪', label: 'Hoja de cuchillo' },
  sickle_blade:   { icon: '⚔️', label: 'Hoja de hoz' },
  fence:          { icon: '🚧', label: 'Sección de cerca' },
  trough:         { icon: '🪵', label: 'Comedero rústico' },
  crate_small:    { icon: '📦', label: 'Caja pequeña' },
  cart_frame:     { icon: '🛒', label: 'Estructura de carro' },

  // Comidas
  pan_simple:         { icon: '🍞', label: 'Pan simple' },
  pan_rico:           { icon: '🥖', label: 'Pan enriquecido' },
  sopa_verduras:      { icon: '🥣', label: 'Sopa de verduras' },
  estofado_campesino: { icon: '🍲', label: 'Estofado campesino' },
  desayuno_huevos:    { icon: '🍳', label: 'Desayuno de huevos' },
  carne_asada:        { icon: '🍖', label: 'Carne asada' },
  lunch_minero:       { icon: '🥡', label: 'Lonche del minero' },
  comida_ranchero:    { icon: '🍱', label: 'Plato del ranchero' },

  // Pociones
  potion_energy_small: { icon: '🧪', label: 'Tónico ligero' },
  potion_field:        { icon: '🧪', label: 'Tónico del campo' },
  potion_forest:       { icon: '🧪', label: 'Tónico del bosque' },
  potion_mine:         { icon: '🧪', label: 'Tónico del minero' },
  potion_sell:         { icon: '🧪', label: 'Tónico mercader' },
  unguento_animal:     { icon: '💊', label: 'Ungüento animal' },
  potion_growth:       { icon: '🧪', label: 'Tónico de crecimiento' },
  potion_detox:        { icon: '🧪', label: 'Tónico depurativo' }
};

function resLabel(key) {
  const cfg = RESOURCE_LABELS[key];
  if (!cfg) return { icon: '📦', label: key };
  return cfg;
}

function toolLabel(key) {
  if (key === 'axe')  return 'hacha';
  if (key === 'pick') return 'pico';
  if (key === 'hoe')  return 'azadón';
  return key;
}

/* =========================
   📜 Recetas
   ========================= */

const RECIPES = [
  /* --- HERRERO --- */
  {
    key: 'iron_nails',
    profession: 'herrero',
    level: 1,
    icon: '📎',
    name: 'Clavos de hierro',
    desc: 'Clavos básicos para construcciones y reparaciones.',
    inputs: { hierro: 1 },
    outputs: { clavos: 6 },
    timeSec: 20,
    xpGain: 6,
    rare: {
      chance: 0.15,
      extraOutputs: { clavos: 6 },
      label: '¡Tirada perfecta en la fragua! Duplicaste los clavos.'
    }
  },
  {
    key: 'iron_bar',
    profession: 'herrero',
    level: 1,
    icon: '➖',
    name: 'Barra de hierro',
    desc: 'Base para herramientas y refuerzos.',
    inputs: { hierro: 2 },
    outputs: { barra_hierro: 1 },
    timeSec: 25,
    xpGain: 7
  },
  {
    key: 'hoe_head',
    profession: 'herrero',
    level: 2,
    icon: '🚜',
    name: 'Cabeza de azadón',
    desc: 'La parte metálica de un azadón agrícola.',
    inputs: { hierro: 2, clavos: 2 },
    outputs: { head_hoe: 1 },
    timeSec: 35,
    xpGain: 10
  },
  {
    key: 'axe_head',
    profession: 'herrero',
    level: 2,
    icon: '🪓',
    name: 'Cabeza de hacha',
    desc: 'Listo para montar sobre un buen mango.',
    inputs: { hierro: 3, clavos: 2 },
    outputs: { head_axe: 1 },
    timeSec: 40,
    xpGain: 12
  },
  {
    key: 'pick_head',
    profession: 'herrero',
    level: 3,
    icon: '⛏️',
    name: 'Cabeza de pico',
    desc: 'Herramienta clave para la mina.',
    inputs: { hierro: 4 },
    outputs: { head_pick: 1 },
    timeSec: 45,
    xpGain: 14,
    rare: {
      chance: 0.12,
      extraOutputs: { low_gem: 1 },
      label: 'En las escorias apareció una pequeña gema 💠.'
    }
  },
  {
    key: 'bucket_metal',
    profession: 'herrero',
    level: 3,
    icon: '🪣',
    name: 'Cubeta metálica',
    desc: 'Ideal para riego y transporte de agua.',
    inputs: { hierro: 3, clavos: 2 },
    outputs: { bucket_metal: 1 },
    timeSec: 40,
    xpGain: 12
  },
  {
    key: 'knife_blade',
    profession: 'herrero',
    level: 4,
    icon: '🔪',
    name: 'Hoja de cuchillo',
    desc: 'Hoja afilada para trabajos de cocina y granja.',
    inputs: { hierro: 2 },
    outputs: { knife_blade: 1 },
    timeSec: 35,
    xpGain: 11
  },
  {
    key: 'sickle_blade',
    profession: 'herrero',
    level: 5,
    icon: '⚔️',
    name: 'Hoja de hoz',
    desc: 'Hoz para cortar hierbas y cosecha fina.',
    inputs: { hierro: 3, low_gem: 1 },
    outputs: { sickle_blade: 1 },
    timeSec: 55,
    xpGain: 18
  },
  {
    key: 'steel_refine',
    profession: 'herrero',
    level: 4,
    icon: '⚙️',
    name: 'Acero refinado',
    desc: 'Hierro trabajado a alta temperatura con una pequeña gema.',
    inputs: { barra_hierro: 2, low_gem: 1 },
    outputs: { acero_refinado: 1 },
    timeSec: 60,
    xpGain: 22,
    rare: {
      chance: 0.12,
      extraOutputs: { acero_refinado: 1 },
      label: 'La colada salió perfecta: obtienes una barra extra de acero.'
    }
  },

  // === Forjar herramientas de hierro ===
  {
    key: 'forge_axe_iron',
    profession: 'herrero',
    level: 3,
    icon: '🪓',
    name: 'Forjar hacha de hierro',
    desc: 'Monta una cabeza de hacha con un mango robusto. Mejora tu hacha de madera a hierro.',
    inputs: { head_axe: 1, mango_madera: 1, barra_hierro: 1 },
    outputs: {},
    timeSec: 50,
    xpGain: 20,
    toolUpgrade: {
      tool: 'axe',
      minTier: 1,
      maxTier: 1,
      toTier: 2,
      refill: true,
      disallowBroken: true
    }
  },
  {
    key: 'forge_pick_iron',
    profession: 'herrero',
    level: 3,
    icon: '⛏️',
    name: 'Forjar pico de hierro',
    desc: 'Combina cabeza de pico y mango para subir tu pico de madera a hierro.',
    inputs: { head_pick: 1, mango_madera: 1, barra_hierro: 2 },
    outputs: {},
    timeSec: 55,
    xpGain: 22,
    toolUpgrade: {
      tool: 'pick',
      minTier: 1,
      maxTier: 1,
      toTier: 2,
      refill: true,
      disallowBroken: true
    }
  },
  {
    key: 'forge_hoe_iron',
    profession: 'herrero',
    level: 3,
    icon: '🚜',
    name: 'Forjar azadón de hierro',
    desc: 'Ensamblas una cabeza de azadón con un mango largo para mejorar tu azadón.',
    inputs: { head_hoe: 1, mango_pala: 1, barra_hierro: 1 },
    outputs: {},
    timeSec: 50,
    xpGain: 20,
    toolUpgrade: {
      tool: 'hoe',
      minTier: 1,
      maxTier: 1,
      toTier: 2,
      refill: true,
      disallowBroken: true
    }
  },
  {
    key: 'forge_axe_steel',
    profession: 'herrero',
    level: 4,
    icon: '🪓',
    name: 'Forjar hacha de acero',
    desc: 'Convierte tu hacha de hierro en una hacha de acero muy resistente.',
    inputs: { acero_refinado: 1, head_axe: 1, mango_madera: 1, barra_hierro: 1 },
    outputs: {},
    timeSec: 70,
    xpGain: 26,
    toolUpgrade: {
      tool: 'axe',
      minTier: 2,
      maxTier: 2,
      toTier: 3,
      refill: true,
      disallowBroken: true
    }
  },
  {
    key: 'forge_pick_steel',
    profession: 'herrero',
    level: 4,
    icon: '⛏️',
    name: 'Forjar pico de acero',
    desc: 'Refuerza tu pico de hierro para labores duras en la mina.',
    inputs: { acero_refinado: 2, head_pick: 1, mango_madera: 1, barra_hierro: 1 },
    outputs: {},
    timeSec: 80,
    xpGain: 28,
    toolUpgrade: {
      tool: 'pick',
      minTier: 2,
      maxTier: 2,
      toTier: 3,
      refill: true,
      disallowBroken: true
    }
  },
  {
    key: 'forge_hoe_steel',
    profession: 'herrero',
    level: 4,
    icon: '🚜',
    name: 'Forjar azadón de acero',
    desc: 'Prepara un azadón de acero para grandes extensiones de cultivo.',
    inputs: { acero_refinado: 1, head_hoe: 1, mango_pala: 1, barra_hierro: 1 },
    outputs: {},
    timeSec: 70,
    xpGain: 26,
    toolUpgrade: {
      tool: 'hoe',
      minTier: 2,
      maxTier: 2,
      toTier: 3,
      refill: true,
      disallowBroken: true
    }
  },

  // === Reparaciones ===
  {
    key: 'repair_axe_steel',
    profession: 'herrero',
    level: 4,
    icon: '🛠️',
    name: 'Reparar hacha de acero',
    desc: 'Reconstruye un hacha de acero rota usando más acero y piezas nuevas.',
    inputs: { acero_refinado: 1, head_axe: 1, mango_madera: 1, barra_hierro: 2 },
    outputs: {},
    timeSec: 65,
    xpGain: 24,
    toolUpgrade: {
      tool: 'axe',
      minTier: 3,
      maxTier: 3,
      toTier: 3,
      refill: true,
      repairOnly: true,
      requireBroken: true
    }
  },
  {
    key: 'repair_pick_steel',
    profession: 'herrero',
    level: 4,
    icon: '🛠️',
    name: 'Reparar pico de acero',
    desc: 'Rearma un pico de acero roto con barras y acero extra.',
    inputs: { acero_refinado: 2, head_pick: 1, mango_madera: 1, barra_hierro: 2 },
    outputs: {},
    timeSec: 70,
    xpGain: 25,
    toolUpgrade: {
      tool: 'pick',
      minTier: 3,
      maxTier: 3,
      toTier: 3,
      refill: true,
      repairOnly: true,
      requireBroken: true
    }
  },
  {
    key: 'repair_hoe_steel',
    profession: 'herrero',
    level: 4,
    icon: '🛠️',
    name: 'Reparar azadón de acero',
    desc: 'Reforja un azadón de acero roto usando mango y acero adicional.',
    inputs: { acero_refinado: 1, head_hoe: 1, mango_pala: 1, barra_hierro: 2 },
    outputs: {},
    timeSec: 65,
    xpGain: 24,
    toolUpgrade: {
      tool: 'hoe',
      minTier: 3,
      maxTier: 3,
      toTier: 3,
      refill: true,
      repairOnly: true,
      requireBroken: true
    }
  },
  {
    key: 'repair_axe_iron',
    profession: 'herrero',
    level: 3,
    icon: '🛠️',
    name: 'Reparar hacha de hierro',
    desc: 'Reconstruye tu hacha de hierro rota usando piezas nuevas.',
    inputs: { head_axe: 1, mango_madera: 1, barra_hierro: 2 },
    outputs: {},
    timeSec: 45,
    xpGain: 18,
    toolUpgrade: {
      tool: 'axe',
      minTier: 2,
      maxTier: 2,
      toTier: 2,
      refill: true,
      repairOnly: true,
      requireBroken: true
    }
  },
  {
    key: 'repair_pick_iron',
    profession: 'herrero',
    level: 3,
    icon: '🛠️',
    name: 'Reparar pico de hierro',
    desc: 'Rearma tu pico de hierro roto con barras extra.',
    inputs: { head_pick: 1, mango_madera: 1, barra_hierro: 3 },
    outputs: {},
    timeSec: 50,
    xpGain: 19,
    toolUpgrade: {
      tool: 'pick',
      minTier: 2,
      maxTier: 2,
      toTier: 2,
      refill: true,
      repairOnly: true,
      requireBroken: true
    }
  },
  {
    key: 'repair_hoe_iron',
    profession: 'herrero',
    level: 3,
    icon: '🛠️',
    name: 'Reparar azadón de hierro',
    desc: 'Reforja el azadón de hierro roto usando nuevo mango y hierro extra.',
    inputs: { head_hoe: 1, mango_pala: 1, barra_hierro: 2 },
    outputs: {},
    timeSec: 45,
    xpGain: 18,
    toolUpgrade: {
      tool: 'hoe',
      minTier: 2,
      maxTier: 2,
      toTier: 2,
      refill: true,
      repairOnly: true,
      requireBroken: true
    }
  },

  /* --- CARPINTERO --- */
  {
    key: 'planks_basic',
    profession: 'carpintero',
    level: 1,
    icon: '🧱',
    name: 'Tablones básicos',
    desc: 'Convierte madera en tablones útiles.',
    inputs: { madera: 2 },
    outputs: { tablones: 3 },
    timeSec: 20,
    xpGain: 5,
    rare: {
      chance: 0.15,
      extraOutputs: { tablones: 3 },
      label: 'Aprovechaste muy bien la madera: +3 tablones extra.'
    }
  },
  {
    key: 'tool_handle',
    profession: 'carpintero',
    level: 1,
    icon: '🪵',
    name: 'Mango de herramienta',
    desc: 'Mango genérico para herramientas ligeras.',
    inputs: { tablones: 2 },
    outputs: { mango_madera: 2 },
    timeSec: 25,
    xpGain: 7
  },
  {
    key: 'shovel_handle',
    profession: 'carpintero',
    level: 2,
    icon: '🪵',
    name: 'Mango de pala',
    desc: 'Mango largo pensado para palas y similares.',
    inputs: { tablones: 3 },
    outputs: { mango_pala: 1 },
    timeSec: 30,
    xpGain: 8
  },
  {
    key: 'fence_section',
    profession: 'carpintero',
    level: 2,
    icon: '🚧',
    name: 'Sección de cerca',
    desc: 'Ayuda a organizar corrales y campos.',
    inputs: { tablones: 3, clavos: 2 },
    outputs: { fence: 1 },
    timeSec: 35,
    xpGain: 10
  },
  {
    key: 'trough_basic',
    profession: 'carpintero',
    level: 3,
    icon: '🪵',
    name: 'Comedero rústico',
    desc: 'Para que los animales coman más ordenados.',
    inputs: { tablones: 4, clavos: 2 },
    outputs: { trough: 1 },
    timeSec: 40,
    xpGain: 12
  },
  {
    key: 'crate_small',
    profession: 'carpintero',
    level: 3,
    icon: '📦',
    name: 'Caja pequeña',
    desc: 'Sirve como contenedor simple de recursos.',
    inputs: { tablones: 2, clavos: 2 },
    outputs: { crate_small: 1 },
    timeSec: 30,
    xpGain: 9
  },
  {
    key: 'bucket_wood',
    profession: 'carpintero',
    level: 4,
    icon: '🪣',
    name: 'Cubeta de madera',
    desc: 'Más barata que la metálica, pero menos resistente.',
    inputs: { tablones: 3, clavos: 1 },
    outputs: { bucket_wood: 1 },
    timeSec: 35,
    xpGain: 11
  },
  {
    key: 'cart_frame',
    profession: 'carpintero',
    level: 5,
    icon: '🛒',
    name: 'Estructura de carro',
    desc: 'Base de un pequeño carro para transporte.',
    inputs: { tablones: 6, clavos: 4, barra_hierro: 1 },
    outputs: { cart_frame: 1 },
    timeSec: 60,
    xpGain: 20
  },

  /* --- COCINERO --- */
  {
    key: 'bread_simple',
    profession: 'cocinero',
    level: 1,
    icon: '🍞',
    name: 'Pan simple',
    desc: 'Pan sencillo, base para otros platos.',
    inputs: { trigo: 2 },
    outputs: { pan_simple: 1 },
    timeSec: 25,
    xpGain: 6
  },
  {
    key: 'bread_rich',
    profession: 'cocinero',
    level: 2,
    icon: '🥖',
    name: 'Pan enriquecido',
    desc: 'Pan con leche y huevo, más nutritivo.',
    inputs: { trigo: 2, milk: 1, eggs: 1 },
    outputs: { pan_rico: 1 },
    timeSec: 35,
    xpGain: 10,
    rare: {
      chance: 0.12,
      extraOutputs: { pan_rico: 1 },
      label: 'La masa quedó perfecta: un pan enriquecido extra.'
    }
  },
  {
    key: 'soup_veggie',
    profession: 'cocinero',
    level: 2,
    icon: '🥣',
    name: 'Sopa de verduras',
    desc: 'Trigo, maíz y hongos en una sopa calientita.',
    inputs: { trigo: 1, maiz: 1, mushroom: 1 },
    outputs: { sopa_verduras: 1 },
    timeSec: 35,
    xpGain: 10
  },
  {
    key: 'stew_farmer',
    profession: 'cocinero',
    level: 3,
    icon: '🍲',
    name: 'Estofado campesino',
    desc: 'Carne, maíz y pan: comida completa.',
    inputs: { meat: 2, maiz: 1, pan_simple: 1 },
    outputs: { estofado_campesino: 1 },
    timeSec: 45,
    xpGain: 14
  },
  {
    key: 'breakfast_eggs',
    profession: 'cocinero',
    level: 2,
    icon: '🍳',
    name: 'Desayuno de huevos',
    desc: 'Huevos con un toque de leche.',
    inputs: { eggs: 2, milk: 1 },
    outputs: { desayuno_huevos: 1 },
    timeSec: 30,
    xpGain: 9
  },
  {
    key: 'grilled_meat',
    profession: 'cocinero',
    level: 1,
    icon: '🍖',
    name: 'Carne asada',
    desc: 'Carne preparada de forma sencilla.',
    inputs: { meat: 1 },
    outputs: { carne_asada: 1 },
    timeSec: 25,
    xpGain: 6
  },
  {
    key: 'miners_lunch',
    profession: 'cocinero',
    level: 4,
    icon: '🥡',
    name: 'Lonche del minero',
    desc: 'Pan enriquecido, carne y hierbas para aguantar la mina.',
    inputs: { pan_rico: 1, meat: 1, herb_lunar: 1 },
    outputs: { lunch_minero: 1 },
    timeSec: 50,
    xpGain: 18
  },
  {
    key: 'rancher_meal',
    profession: 'cocinero',
    level: 4,
    icon: '🍱',
    name: 'Plato del ranchero',
    desc: 'Proteico para días largos cuidando animales.',
    inputs: { milk: 1, eggs: 1, meat: 1 },
    outputs: { comida_ranchero: 1 },
    timeSec: 45,
    xpGain: 16
  },

  /* --- HERBALISTA --- */
  {
    key: 'tonic_small',
    profession: 'herbalista',
    level: 1,
    icon: '🧪',
    name: 'Tónico ligero',
    desc: 'Tónico simple a base de hierba lunar.',
    inputs: { herb_lunar: 1 },
    outputs: { potion_energy_small: 1 },
    timeSec: 25,
    xpGain: 7
  },
  {
    key: 'tonic_field',
    profession: 'herbalista',
    level: 2,
    icon: '🧪',
    name: 'Tónico del campo',
    desc: 'Mezcla pensada para agricultores.',
    inputs: { herb_lunar: 1, trigo: 1 },
    outputs: { potion_field: 1 },
    timeSec: 30,
    xpGain: 9
  },
  {
    key: 'tonic_forest',
    profession: 'herbalista',
    level: 2,
    icon: '🧪',
    name: 'Tónico del bosque',
    desc: 'Ayuda en tareas de tala y recolección forestal.',
    inputs: { herb_lunar: 1, mushroom: 1 },
    outputs: { potion_forest: 1 },
    timeSec: 35,
    xpGain: 10
  },
  {
    key: 'tonic_mine',
    profession: 'herbalista',
    level: 3,
    icon: '🧪',
    name: 'Tónico del minero',
    desc: 'Preparado para resistir jornadas en la mina.',
    inputs: { herb_lunar: 1, hierro: 1 },
    outputs: { potion_mine: 1 },
    timeSec: 40,
    xpGain: 12
  },
  {
    key: 'tonic_sell',
    profession: 'herbalista',
    level: 4,
    icon: '🧪',
    name: 'Tónico mercader',
    desc: 'Poción rara pensada para la venta (buff futuro).',
    inputs: { herb_lunar: 1, low_gem: 1 },
    outputs: { potion_sell: 1 },
    timeSec: 45,
    xpGain: 15
  },
  {
    key: 'animal_salve',
    profession: 'herbalista',
    level: 3,
    icon: '💊',
    name: 'Ungüento animal',
    desc: 'Refuerza la medicina para el ganado.',
    inputs: { herb_lunar: 1, vet_med: 1 },
    outputs: { unguento_animal: 1 },
    timeSec: 40,
    xpGain: 14
  },
  {
    key: 'growth_tonic',
    profession: 'herbalista',
    level: 4,
    icon: '🧪',
    name: 'Tónico de crecimiento',
    desc: 'Para experimentar con crecimiento acelerado de cultivos.',
    inputs: { herb_lunar: 1, seeds_trigo: 1, seeds_maiz: 1 },
    outputs: { potion_growth: 1 },
    timeSec: 45,
    xpGain: 16
  },
  {
    key: 'detox_tonic',
    profession: 'herbalista',
    level: 5,
    icon: '🧪',
    name: 'Tónico depurativo',
    desc: 'Mezcla compleja con hongos, leche y hierbas.',
    inputs: { herb_lunar: 1, mushroom: 1, milk: 1 },
    outputs: { potion_detox: 1 },
    timeSec: 50,
    xpGain: 18
  }
];

/* =========================
   ⏱️ Estado de crafteo / colas
   ========================= */

let craftJobIdSeq = 1;
let craftTicker = null;

function ensureCraftState() {
  if (!game.craftQueues) game.craftQueues = {};
  PROF_KEYS.forEach(k => {
    if (!game.craftQueues[k]) game.craftQueues[k] = [];
  });
}

function getCraftQueue(profKey) {
  ensureCraftState();
  return game.craftQueues[profKey] || [];
}

function formatSeconds(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function startCraftTicker() {
  if (craftTicker) return;
  craftTicker = setInterval(tickCraftQueues, 1000);
}

/* =========================
   💰 Costos y pago
   ========================= */

function hasResources(cost) {
  for (const k in cost) {
    const need = cost[k] || 0;
    if ((game.inv[k] || 0) < need) return false;
  }
  return true;
}

function payResources(cost) {
  for (const k in cost) {
    const need = cost[k] || 0;
    if (!need) continue;
    game.inv[k] = (game.inv[k] || 0) - need;
    if (game.inv[k] < 0) game.inv[k] = 0;
  }
}

function giveResources(out) {
  for (const k in out) {
    const qty = out[k] || 0;
    if (!qty) continue;
    game.inv[k] = (game.inv[k] || 0) + qty;
  }
}

function getRecipe(key) {
  return RECIPES.find(r => r.key === key) || null;
}

function recipesForProfession(profKey) {
  ensureProfessionsShape();
  const p = game.professions[profKey];
  if (!p) return [];
  const lvl = p.level || 1;
  return RECIPES.filter(r => r.profession === profKey && r.level <= lvl);
}

/* =========================
   🔧 Mejora / reparación de herramientas
   ========================= */

function applyToolUpgrade(toolCfg, recipeName) {
  if (!toolCfg || !game.tools) return false;

  const key = toolCfg.tool;
  const t = game.tools[key];
  if (!t) {
    toast(`No encuentro tu ${toolLabel(key)} para esta forja.`);
    return false;
  }

  const fromTier = t.tier || 1;
  const targetTier = toolCfg.toTier ?? fromTier;
  const minTier = toolCfg.minTier ?? 1;
  const maxTier = toolCfg.maxTier ?? null;
  const refill = toolCfg.refill !== false;
  const repairOnly = !!toolCfg.repairOnly;
  const requireBroken = !!toolCfg.requireBroken;
  const disallowBroken = !!toolCfg.disallowBroken;
  const dur = t.dur || 0;

  if (fromTier < minTier) {
    toast(`Tu ${toolLabel(key)} es demasiado básica para este trabajo.`);
    return false;
  }
  if (maxTier !== null && fromTier > maxTier) {
    toast(`Esta receta ya no aplica: tu ${toolLabel(key)} es demasiado avanzada.`);
    return false;
  }
  if (requireBroken && dur > 0) {
    toast(`Esta receta es solo para ${toolLabel(key)} rota. Agótala primero.`);
    return false;
  }
  if (disallowBroken && dur <= 0) {
    toast(`Esta receta requiere una ${toolLabel(key)} en uso, no rota.`);
    return false;
  }

  const finalTier = repairOnly ? fromTier : Math.max(fromTier, targetTier);
  t.tier = finalTier;

  if (refill) {
    const base = (TIER[finalTier] && TIER[finalTier].max) || 40;
    const bonus = getToolDurabilityBonusPct ? getToolDurabilityBonusPct() : 0;
    t.dur = Math.round(base * (1 + bonus));
  }

  const tierName = TIER[finalTier]?.name || `nivel ${finalTier}`;
  const actionTxt = repairOnly ? 'reparada' : 'mejorada';
  toast(`🔧 Tu ${toolLabel(key)} ha sido ${actionTxt}: ahora es ${tierName}.`);

  return true;
}

/* =========================
   🛠️ Craftear (cola + tiempo real)
   ========================= */

export function craftRecipe(recipeKey) {
  ensureProfessionsShape();
  ensureCraftState();

  const recipe = getRecipe(recipeKey);
  if (!recipe) {
    toast('Esta receta no existe.');
    return;
  }
  const def = PROF_DEFS[recipe.profession];
  if (!def) return;

  const prof = game.professions[recipe.profession];
  const lvl = prof.level || 1;

  if (lvl < recipe.level) {
    toast(`Necesitas nivel ${recipe.level} de ${def.label} para esta receta.`);
    return;
  }

  // Validaciones especiales si afecta herramienta
  if (recipe.toolUpgrade) {
    if (!game.tools) {
      toast('Aún no tienes herramientas registradas.');
      return;
    }
    const cfg = recipe.toolUpgrade;
    const t = game.tools[cfg.tool];
    if (!t) {
      toast(`No tienes ${toolLabel(cfg.tool)} para trabajar en ella.`);
      return;
    }
    const fromTier = t.tier || 1;
    const minTier = cfg.minTier ?? 1;
    const maxTier = cfg.maxTier ?? null;
    const dur = t.dur || 0;

    if (fromTier < minTier) {
      toast(`Tu ${toolLabel(cfg.tool)} aún no está al nivel requerido para esta forja.`);
      return;
    }
    if (maxTier !== null && fromTier > maxTier) {
      toast('Esta receta es para herramientas de nivel más bajo.');
      return;
    }
    if (cfg.requireBroken && dur > 0) {
      toast(`Esta receta es solo para ${toolLabel(cfg.tool)} rota.`);
      return;
    }
    if (cfg.disallowBroken && dur <= 0) {
      toast(`Tu ${toolLabel(cfg.tool)} está rota. Primero necesitas reconstruirla con otra receta.`);
      return;
    }
  }

  if (!hasResources(recipe.inputs)) {
    toast('No tienes recursos suficientes para craftear esto.');
    return;
  }

  // Consumimos recursos al iniciar la producción
  payResources(recipe.inputs);

  const q = game.craftQueues[recipe.profession];
  const now = Date.now();
  const lastJob = q.length ? q[q.length - 1] : null;
  const startAt = lastJob && lastJob.finishAt > now ? lastJob.finishAt : now;
  const finishAt = startAt + (recipe.timeSec || 20) * 1000;

  const job = {
    id: craftJobIdSeq++,
    recipeKey: recipe.key,
    profession: recipe.profession,
    startAt,
    finishAt,
    done: false
  };

  q.push(job);
  startCraftTicker();

  const etaSec = Math.max(0, (finishAt - now) / 1000);
  toast(`🛠️ Producción en cola: ${recipe.name}. Terminará en ~${formatSeconds(etaSec)}.`);

  updateCraftUI(true);
}

/* =========================
   ⏲️ Ticker de colas
   ========================= */

function tickCraftQueues() {
  ensureCraftState();
  const now = Date.now();
  let somethingFinished = false;

  PROF_KEYS.forEach(profKey => {
    const q = game.craftQueues[profKey];
    if (!q || !q.length) return;

    const job = q[0];
    if (!job) return;

    if (job.finishAt <= now && !job.done) {
      const recipe = getRecipe(job.recipeKey);

      if (recipe) {
        // 1) Efecto principal
        if (recipe.toolUpgrade) {
          applyToolUpgrade(recipe.toolUpgrade, recipe.name);
        } else {
          giveResources(recipe.outputs);

          // Rareza / producción excepcional
          if (recipe.rare && recipe.rare.extraOutputs && Math.random() < (recipe.rare.chance || 0)) {
            giveResources(recipe.rare.extraOutputs);
            const firstExtra = Object.keys(recipe.rare.extraOutputs)[0];
            const qtyExtra   = recipe.rare.extraOutputs[firstExtra];
            const infoExtra  = resLabel(firstExtra);
            toast(recipe.rare.label || `¡Producción excepcional! +${qtyExtra} ${infoExtra.label}`);
          } else {
            const firstOut = Object.keys(recipe.outputs || {})[0];
            if (firstOut) {
              const qty  = recipe.outputs[firstOut];
              const info = resLabel(firstOut);
              const def  = PROF_DEFS[recipe.profession];
              toast(`✅ ${qty} × ${info.label} listo en el ${def.label}.`);
            }
          }
        }

        // 2) XP y misiones
        addProfessionXP(recipe.profession, recipe.xpGain || 5);
        missionEvent('craft', 1);
      }

      job.done = true;
      q.shift();
      somethingFinished = true;
    }
  });

  updateCraftUI(somethingFinished);
}

/* =========================
   🖼️ UI – Panel de profesiones
   ========================= */

export function renderProfessionsPanel(containerId = 'pueblo') {
  ensureProfessionsShape();
  ensureCraftState();

  const el = document.getElementById(containerId);
  if (!el) return;

  const initial = 'herrero';
  el.innerHTML = buildProfessionsHtml(initial);
  bindProfessionsEvents(el);
  startCraftTicker();
}

function buildProfessionsHtml(activeKey) {
  ensureProfessionsShape();

  const profBtns = PROF_KEYS.map(k => {
    const def = PROF_DEFS[k];
    const on = k === activeKey ? 'on' : '';
    return `
      <button class="prof-btn ${on}" data-prof="${k}" type="button">
        <span class="icon">${def.icon}</span>
        <span>${def.label}</span>
      </button>
    `;
  }).join('');

  const detailHtml = buildProfessionDetailHtml(activeKey);

  return `
    <div class="prof-panel">
      <div class="prof-sidebar">
        ${profBtns}
      </div>
      <div class="prof-main" id="prof-main">
        ${detailHtml}
      </div>
    </div>
  `;
}

function buildProfessionDetailHtml(profKey) {
  ensureProfessionsShape();
  ensureCraftState();

  const def = PROF_DEFS[profKey];
  const p = game.professions[profKey];
  const lvl = p.level || 1;
  const xp = p.xp || 0;
  const prog = xpProgress(p);
  const recs = recipesForProfession(profKey);
  const queue = getCraftQueue(profKey);

  const recipesHtml = recs.length
    ? recs.map(r => buildRecipeCardHtml(r)).join('')
    : '<p class="kv">Aún no tienes recetas desbloqueadas para este oficio.</p>';

  let queueHtml = '';
  if (queue.length) {
    const now = Date.now();
    const rows = queue.map(job => {
      const recipe = getRecipe(job.recipeKey);
      if (!recipe) return '';
      const remaining = Math.max(0, (job.finishAt - now) / 1000);
      const outKey = Object.keys(recipe.outputs || {})[0];
      const info = outKey ? resLabel(outKey) : { label: 'Trabajo de forja' };
      return `
        <div class="craft-job" data-job-id="${job.id}" data-prof="${profKey}">
          <span>${recipe.icon || '🛠️'} ${recipe.name}</span>
          <span class="small-text">${info.label}</span>
          <span class="small-text craft-eta">${formatSeconds(remaining)}</span>
        </div>
      `;
    }).join('');
    queueHtml = `
      <h3 class="subtitle">⏱️ Producción en cola</h3>
      <div class="craft-queue">
        ${rows}
      </div>
      <hr class="sep"/>
    `;
  } else {
    queueHtml = `
      <h3 class="subtitle">⏱️ Producción en cola</h3>
      <p class="kv small-text">No hay nada en producción. Elige una receta para empezar.</p>
      <hr class="sep"/>
    `;
  }

  return `
    <div class="card prof-header">
      <h3>${def.icon} ${def.label} (Nivel ${lvl})</h3>
      <p class="kv small-text">
        ${def.desc}
      </p>
      <p class="kv small-text">
        XP total: <strong>${xp}</strong>
      </p>
      <div class="prof-level-bar" title="Progreso al siguiente nivel">
        <div style="width:${prog.pct}%;"></div>
      </div>
      <p class="kv small-text">
        ${
          prog.maxed
            ? 'Has alcanzado el nivel máximo de este oficio.'
            : `Progreso nivel ${lvl} → ${lvl + 1}: <strong>${prog.current} / ${prog.needed}</strong>`
        }
      </p>
    </div>

    ${queueHtml}

    <h3 class="subtitle">📜 Recetas disponibles</h3>
    <hr class="sep"/>

    <div class="prof-recipes">
      ${recipesHtml}
    </div>
  `;
}

/* =========================
   🧱 Tarjeta de receta (con imágenes)
   ========================= */

function buildRecipeCardHtml(r) {
  // Icono principal de la receta: intenta usar el icono de la salida principal
  const outKeys = Object.keys(r.outputs || {});
  const mainOut = outKeys[0];
  let titleIconHtml;

  if (mainOut && ITEM_ICONS[mainOut]) {
    const label =
      PROF_LABELS[mainOut] ||
      RESOURCE_LABELS[mainOut]?.label ||
      mainOut.replace(/_/g, ' ');
    titleIconHtml = `<img src="${ITEM_ICONS[mainOut]}" class="cost-icon" alt="${label}">`;
  } else {
    titleIconHtml = r.icon || '🛠️';
  }

  const inputs = Object.entries(r.inputs || {})
    .map(([k, qty]) => renderItemIconQty(k, qty))
    .join(' ');

  const outputs = Object.entries(r.outputs || {})
    .map(([k, qty]) => renderItemIconQty(k, qty))
    .join(' ');

  let rareHtml = '';
  if (r.rare && r.rare.extraOutputs) {
    const extras = Object.entries(r.rare.extraOutputs)
      .map(([k, qty]) => renderItemIconQty(k, qty))
      .join(' ');
    const chancePct = Math.round((r.rare.chance || 0) * 100);
    rareHtml = `
      <p class="prof-io small-text">
        <strong>Producción excepcional (${chancePct}%):</strong><br>
        ${extras}
      </p>
    `;
  }

  let toolTag = '';
  if (r.toolUpgrade) {
    const u = r.toolUpgrade;
    const name = toolLabel(u.tool);
    const levelStr =
      u.repairOnly
        ? `Reparación ${name} (tier ${u.minTier || ''})`
        : `Mejora ${name} → tier ${u.toTier || ''}`;
    toolTag = `<span class="prof-tag">${levelStr}</span>`;
  }

  return `
    <div class="card">
      <div class="prof-recipe-title">
        <span class="icon">${titleIconHtml}</span>
        <div>
          <strong>${r.name}</strong><br>
          <span class="prof-tag">Nivel ${r.level}</span>
          ${toolTag}
        </div>
      </div>
      <p class="kv small-text">
        ${r.desc}
      </p>
      <p class="prof-io">
        <strong>Coste:</strong><br>
        ${inputs || '—'}
      </p>
      ${
        outputs
          ? `<p class="prof-io"><strong>Resultado:</strong><br>${outputs || '—'}</p>`
          : ''
      }
      ${rareHtml}
      <div class="prof-foot">
        <button
          class="btn xsmall"
          type="button"
          data-craft="${r.key}"
        >
          Craftear
        </button>
        <span class="small-text">
          ⏱️ ${r.timeSec || 20}s · +${r.xpGain || 5} XP
        </span>
      </div>
    </div>
  `;
}

/* =========================
   🔁 Eventos de UI
   ========================= */

function bindProfessionsEvents(root) {
  if (!root) return;

  const getPanel = () => {
    if (root.classList && root.classList.contains('prof-panel')) return root;
    return root.querySelector('.prof-panel');
  };

  root.querySelectorAll('[data-prof]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.prof;
      const panel = getPanel();
      if (!panel) return;

      panel.innerHTML = buildProfessionsHtml(key);
      bindProfessionsEvents(panel);
    };
  });

  root.querySelectorAll('[data-craft]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.craft;
      craftRecipe(key);
    };
  });
}

/* =========================
   🔄 Refresco de UI
   ========================= */

function updateCraftUI(forceRebuild = false) {
  const root = document.getElementById('profesiones-panel');
  if (!root) return;

  const currentBtn = root.querySelector('.prof-btn.on') || root.querySelector('[data-prof]');
  const profKey = currentBtn?.dataset.prof || 'herrero';

  if (forceRebuild) {
    const main = root.querySelector('#prof-main');
    if (main) {
      main.innerHTML = buildProfessionDetailHtml(profKey);
      bindProfessionsEvents(root);
    }
    return;
  }

  const now = Date.now();
  root.querySelectorAll('.craft-job').forEach(el => {
    const prof = el.dataset.prof;
    const id = parseInt(el.dataset.jobId, 10);
    const q = game.craftQueues?.[prof] || [];
    const job = q.find(j => j.id === id);
    const span = el.querySelector('.craft-eta');
    if (!span) return;
    if (!job) {
      span.textContent = 'listo';
    } else {
      const remaining = Math.max(0, (job.finishAt - now) / 1000);
      span.textContent = formatSeconds(remaining);
    }
  });
}

/* =========================
   🔄 Inicialización ligera
   ========================= */

// el render se hace llamando a renderProfessionsPanel() desde fuera
