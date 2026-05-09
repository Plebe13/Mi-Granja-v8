// main.js
import { renderPueblo } from './pueblo.js';
import { renderPersonaje } from './personaje.js';
import { renderCampos, tickCampos } from './campos.js';
import { renderBosque } from './bosque.js';
import { renderMina } from './mina.js';
import { renderCorrales, tickCorrales } from './corrales.js';
import { renderTienda, dailyMarket } from './tienda.js';
import { renderInventario } from './inventario.js';
import { renderCasa } from './mi_casa.js';
import { renderTools } from './tools.js';
import {
  renderMissions,
  generateDailyMissions,
  applyMissionEvent,
  endOfDayDailyCheck
} from './missions.js';
import {
  renderAchievements,
  applyAchievementEvent,
  getSellBonusPct,
  getToolDurabilityBonusPct,
  migrateAchievements
} from './achievements.js';
import { renderAppearance, applyThemeFromSave } from './appearance.js';
import { renderKitchen } from './kitchen.js';
import { renderTrophies, unlockTrophy } from './trofeos.js';
import { renderRecords } from './records.js';
import { renderProgreso } from './progreso.js';

export const TIER = {
  1: { name: 'Básica',  mult: 1.0, max: 40 },
  2: { name: 'Hierro',  mult: 1.4, max: 60 },
  3: { name: 'Acero',   mult: 1.9, max: 90 },
  4: { name: 'Maestro', mult: 2.4, max: 120 }   // 🔥 nuevo nivel Herrero
};

// 🧿 Diccionario de equipo RPG (para Personaje, forja, etc.)
export const EQUIP_ITEMS = {
  knife_rustic: {
    id: 'knife_rustic',
    slot: 'weapon',
    label: 'Cuchillo rústico',
    icon: '🗡️',
    desc: 'Daño +1',
    bonuses: { fuerza: 1 }
  },
  armor_leather: {
    id: 'armor_leather',
    slot: 'armor',
    label: 'Chaleco de cuero',
    icon: '🧥',
    desc: 'Defensa +2',
    bonuses: { defensa: 2 }
  },
  helmet_none: {
    id: 'helmet_none',
    slot: 'helmet',
    label: 'Casco simple',
    icon: '🪖',
    desc: 'Protege un poco la cabeza',
    bonuses: { defensa: 1 }
  },
  ring_farmer: {
    id: 'ring_farmer',
    slot: 'ring',
    label: 'Anillo del granjero',
    icon: '💍',
    desc: '+5% cosechas',
    bonuses: { agricultura_pct: 0.05 }
  },
  // 🆕 Amuleto de la suerte (accesorio de comercio)
  amulet_luck: {
    id: 'amulet_luck',
    slot: 'amulet',
    label: 'Amuleto de la suerte',
    icon: '🔮',
    desc: '+2 Comercio (RPG)',
    bonuses: { comercio_flat: 2 }
  },

  // 🆕 Capa del viajero (defensa + comercio)
  cloak_traveler: {
    id: 'cloak_traveler',
    slot: 'cape',
    label: 'Capa del viajero',
    icon: '🧥',
    desc: '+1 Defensa, +1 Comercio (RPG)',
    bonuses: { defensa_flat: 1, comercio_flat: 1 }
  },

  backpack_simple: {
    id: 'backpack_simple',
    slot: 'backpack',
    label: 'Mochila simple',
    icon: '🎒',
    desc: '+4 espacio inventario',
    bonuses: { inv_slots: 4 }
  },
  backpack_simple: {
    id: 'backpack_simple',
    slot: 'backpack',
    label: 'Mochila simple',
    icon: '🎒',
    desc: '+4 espacio inventario',
    bonuses: { inv_slots: 4 }
  },
  axe_basic: {
    id: 'axe_basic',
    slot: 'axe',
    label: 'Hacha básica',
    icon: '🪓',
    desc: 'Tala x1.0',
    bonuses: { tala_mult: 1.0 }
  },
  pick_basic: {
    id: 'pick_basic',
    slot: 'pick',
    label: 'Pico básico',
    icon: '⛏️',
    desc: 'Mina x1.0',
    bonuses: { mina_mult: 1.0 }
  },
  hoe_basic: {
    id: 'hoe_basic',
    slot: 'hoe',
    label: 'Azadón básico',
    icon: '🚜',
    desc: 'Campo x1.0',
    bonuses: { campo_mult: 1.0 }
  }
};

// equipo base para los slots del personaje
const BASE_EQUIPMENT = {
  weapon:   'knife_rustic',
  armor:    'armor_leather',
  helmet:   null,
  boots:    null,
  gloves:   null,
  cape:     null,
  ring:     'ring_farmer',
  amulet:   null,
  backpack: 'backpack_simple',
  axe:      'axe_basic',
  pick:     'pick_basic',
  hoe:      'hoe_basic'
};

// 🐔 Niveles del gallinero
export const COOP_LEVELS = {
  1: {
    name: 'Gallinero básico',
    capacity: 4,
    effects: ['Todo manual: alimentar, recoger huevos y sacrificar.'],
    cost: null
  },
  2: {
    name: 'Comedero automático',
    capacity: 6,
    effects: [
      'Alimenta automáticamente a las gallinas usando maíz de tu inventario.'
    ],
    cost: { coins: 40, madera: 12, hierro: 2 }
  },
  3: {
    name: 'Recolector de huevos',
    capacity: 8,
    effects: [
      'Al final del día los huevos se pasan automáticamente a tu inventario.'
    ],
    cost: { coins: 60, madera: 15, hierro: 3 }
  },
  4: {
    name: 'Clasificador de huevos',
    capacity: 10,
    effects: [
      'Separador interno: posibilidad de conseguir huevos grandes de mayor valor.'
    ],
    cost: { coins: 90, hierro: 5, low_gem: 1 } // usa las gemas pequeñas del bosque
  },
  5: {
    name: 'Gallinero avanzado',
    capacity: 10,
    effects: [
      'Las gallinas muy viejas se retiran solas y te dan carne automáticamente.'
    ],
    cost: { coins: 120, hierro: 8 }
  }
};

// helper por si lo necesitas en otros módulos
export function getCoopLevel() {
  return game.house?.coopLevel || 1;
}

export const game = {
  day: 1,
  minutes: 8 * 60,
  coins: 50,
  inv: {
    trigo: 2,
    maiz: 0,
    madera: 0,
    hierro: 0,
    milk: 0,
    meat: 0,
    eggs: 0,
    seeds_trigo: 2,
    seeds_maiz: 1,
    vet_med: 0,
    // Recursos del bosque / herbalista
    mushroom: 0,
    herb_lunar: 0,
    low_gem: 0,
    wolf_pelt: 0
  },
  campos: [],
  corrales: { vacas: [], gallinas: [], puercos: [] },
  weather: { type: 'soleado', emoji: '☀️' },
  market: {
    prices: {},
    base: {
      buy: {
        seeds_trigo: 2,
        seeds_maiz: 3,
        vet_med: 18   // precio base de medicina animal
      },
      sell: {
        trigo: 2,
        maiz: 3,
        madera: 1,
        hierro: 4,
        milk: 4,
        meat: 6,
        eggs: 2
      }
    }
  },
  house: {
    level: 1,
    chest: {},
    capacity: 20,
    coopLevel: 1,       // 🐔 nivel del gallinero
    coopEggs: 0,        // 🥚 huevos almacenados dentro del gallinero
    ranchWorkerDays: 0  // 👨‍🌾 días de contrato del trabajador de corrales
  },
  tools: {
    axe:  { tier: 1, dur: 40, uses: 0, sharpUsesLeft: 0 },
    pick: { tier: 1, dur: 40, uses: 0, sharpUsesLeft: 0 },
    hoe:  { tier: 1, dur: 40, uses: 0, sharpUsesLeft: 0 }
  },

  // 🧪 equipo RPG (slots de personaje)
  equipment: { ...BASE_EQUIPMENT },

  // 🧿 sockets de accesorios (anillo / amuleto / capa)
  equip: {
    ring: {
      id: null,
      sockets: [
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null }
      ]
    },
    amulet: {
      id: null,
      sockets: [
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null }
      ]
    },
    cloak: {
      id: null,
      sockets: [
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null }
      ]
    }
  },

  // 🔧 sockets de gemas para herramientas
  equipTools: {
    axe: {
      sockets: [
        { state: 'empty', gemId: null }
      ]
    },
    pick: {
      sockets: [
        { state: 'empty', gemId: null }
      ]
    },
    hoe: {
      sockets: [
        { state: 'empty', gemId: null }
      ]
    }
  },

  missions: {
    rep: 0,
    rerollsLeft: 1,
    daily: [],
    streak: {
      current: 0,
      best: 0,
      todayCompleted: false,
      weeklyRewardReady: false
    },
    epics: [
      {
        key: 'epic_harvest',
        icon: '🌾',
        label: 'Cosecha magistral',
        desc: 'Cosecha 120 cultivos',
        goal: 120,
        progress: 0,
        reward: { coins: 80, rep: 5 }
      },
      {
        key: 'epic_miner',
        icon: '⛏️',
        label: 'Minero experto',
        desc: 'Consigue 80 de hierro',
        goal: 80,
        progress: 0,
        reward: { coins: 70, rep: 4 }
      },
      {
        key: 'epic_rancher',
        icon: '🐄',
        label: 'Gran ranchero',
        desc: 'Recolecta 30 leche y 30 huevos',
        goal: 60,
        progress: 0,
        reward: { coins: 90, rep: 6 }
      },
      {
        key: 'epic_trader',
        icon: '💰',
        label: 'Comerciante hábil',
        desc: 'Genera 500 ₥ en ventas',
        goal: 500,
        progress: 0,
        reward: { coins: 120, rep: 8 }
      }
    ]
  },

  appearance: { theme: 'default', unlocked: ['default'] },
  achievements: [],
  buffs: { harvestBoost: 0, chopBoost: 0, mineBoost: 0, sellBoost: 0 },
  buffDays: { harvestBoost: 0, chopBoost: 0, mineBoost: 0, sellBoost: 0 },

  // 📊 stats globales para sala de trofeos / records / otros sistemas
  stats: {
    treesCut: 0,
    rocksMined: 0,
    animalsSold: 0,
    totalGoldEarned: 0,
    forestBeastsDefeated: 0,
    rareGemsFound: 0,
    fatAnimalsSold: 0,
    tradeDealsDone: 0,
    maxSingleDaySales: 0,
    bestTreesCutInDay: 0,
    bestRocksMinedInDay: 0,
    goldToday: 0,
    treesToday: 0,
    rocksToday: 0
  },

  version: 'v8'
};

const STORAGE_KEY = 'mi_granja_v8_cocina_buffs';

// 👇 recordamos qué pestaña se dibujó por última vez
let lastRenderedTab = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(game, JSON.parse(raw));

    // asegurar buffs aunque venga de saves antiguos
    if (!game.buffs) {
      game.buffs = { harvestBoost: 0, chopBoost: 0, mineBoost: 0, sellBoost: 0 };
    }

    // asegurar estructura de días de buffs
    if (!game.buffDays) {
      game.buffDays = { harvestBoost: 0, chopBoost: 0, mineBoost: 0, sellBoost: 0 };
    }

    // asegurar inventario
    if (!game.inv) game.inv = {};
    if (game.inv.vet_med == null)    game.inv.vet_med    = 0;
    if (game.inv.mushroom == null)   game.inv.mushroom   = 0;
    if (game.inv.herb_lunar == null) game.inv.herb_lunar = 0;
    if (game.inv.low_gem == null)    game.inv.low_gem    = 0;
    if (game.inv.wolf_pelt == null)  game.inv.wolf_pelt  = 0;

    // ✅ asegurar estructura de la casa y nivel del gallinero
    if (!game.house) {
      game.house = {
        level: 1,
        chest: {},
        capacity: 20,
        coopLevel: 1,
        coopEggs: 0,
        ranchWorkerDays: 0
      };
    } else {
      if (game.house.capacity == null)         game.house.capacity = 20;
      if (!game.house.chest)                  game.house.chest = {};
      if (game.house.coopLevel == null)       game.house.coopLevel = 1;
      if (game.house.coopEggs == null)        game.house.coopEggs = 0;
      if (game.house.ranchWorkerDays == null) game.house.ranchWorkerDays = 0;
    }

    // asegurar herramientas con nuevos campos (uso / estado / afilado)
    if (!game.tools) {
      game.tools = {
        axe:  { tier: 1, dur: 40, uses: 0, sharpUsesLeft: 0 },
        pick: { tier: 1, dur: 40, uses: 0, sharpUsesLeft: 0 },
        hoe:  { tier: 1, dur: 40, uses: 0, sharpUsesLeft: 0 }
      };
    } else {
      ['axe', 'pick', 'hoe'].forEach(k => {
        if (!game.tools[k]) {
          game.tools[k] = { tier: 1, dur: 40, uses: 0, sharpUsesLeft: 0 };
        } else {
          const t = game.tools[k];
          if (t.uses == null)          t.uses = 0;
          if (t.sharpUsesLeft == null) t.sharpUsesLeft = 0;
          if (t.dur == null)           t.dur = 40;
          if (t.tier == null)          t.tier = 1;
        }
      });
    }

    // ✅ asegurar equipo RPG aunque venga de saves viejos
    if (!game.equipment) {
      game.equipment = { ...BASE_EQUIPMENT };
    } else {
      for (const [k, v] of Object.entries(BASE_EQUIPMENT)) {
        if (!(k in game.equipment)) {
          game.equipment[k] = v;
        }
      }
    }

    // ✅ asegurar sockets de accesorios (ring / amulet / cloak)
    function defaultSocketBlock() {
      return {
        id: null,
        sockets: [
          { state: 'empty', gemId: null },
          { state: 'empty', gemId: null },
          { state: 'empty', gemId: null }
        ]
      };
    }

    if (!game.equip) {
      game.equip = {
        ring:   defaultSocketBlock(),
        amulet: defaultSocketBlock(),
        cloak:  defaultSocketBlock()
      };
    } else {
      ['ring', 'amulet', 'cloak'].forEach(key => {
        if (!game.equip[key]) {
          game.equip[key] = defaultSocketBlock();
        } else {
          const blk = game.equip[key];
          if (!Array.isArray(blk.sockets)) {
            blk.sockets = defaultSocketBlock().sockets;
          } else if (blk.sockets.length < 3) {
            while (blk.sockets.length < 3) {
              blk.sockets.push({ state: 'empty', gemId: null });
            }
          }
          if (!('id' in blk)) blk.id = null;
        }
      });
    }

    // ✅ asegurar sockets para herramientas
    const defaultEquipTools = {
      axe: { sockets: [ { state: 'empty', gemId: null } ] },
      pick: { sockets: [ { state: 'empty', gemId: null } ] },
      hoe: { sockets: [ { state: 'empty', gemId: null } ] }
    };

    if (!game.equipTools) {
      game.equipTools = { ...defaultEquipTools };
    } else {
      for (const [key, def] of Object.entries(defaultEquipTools)) {
        if (!game.equipTools[key]) {
          game.equipTools[key] = { ...def };
        } else if (!Array.isArray(game.equipTools[key].sockets)) {
          game.equipTools[key].sockets = [...def.sockets];
        }
      }
    }

    // ✅ asegurar stats aunque venga de saves viejos
    if (!game.stats) {
      game.stats = {
        treesCut: 0,
        rocksMined: 0,
        animalsSold: 0,
        totalGoldEarned: 0,
        forestBeastsDefeated: 0,
        rareGemsFound: 0,
        fatAnimalsSold: 0,
        tradeDealsDone: 0,
        maxSingleDaySales: 0,
        bestTreesCutInDay: 0,
        bestRocksMinedInDay: 0,
        goldToday: 0,
        treesToday: 0,
        rocksToday: 0
      };
    } else {
      const s = game.stats;
      if (s.treesCut == null)             s.treesCut = 0;
      if (s.rocksMined == null)           s.rocksMined = 0;
      if (s.animalsSold == null)          s.animalsSold = 0;
      if (s.totalGoldEarned == null)      s.totalGoldEarned = 0;
      if (s.forestBeastsDefeated == null) s.forestBeastsDefeated = 0;
      if (s.rareGemsFound == null)        s.rareGemsFound = 0;
      if (s.fatAnimalsSold == null)       s.fatAnimalsSold = 0;
      if (s.tradeDealsDone == null)       s.tradeDealsDone = 0;
      if (s.maxSingleDaySales == null)    s.maxSingleDaySales = 0;
      if (s.bestTreesCutInDay == null)    s.bestTreesCutInDay = 0;
      if (s.bestRocksMinedInDay == null)  s.bestRocksMinedInDay = 0;
      if (s.goldToday == null)            s.goldToday = 0;
      if (s.treesToday == null)           s.treesToday = 0;
      if (s.rocksToday == null)           s.rocksToday = 0;
    }

    migrateAchievements(game);
  } catch (e) { console.error('load error', e); }
}

function save(show = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    if (show) flashAutosave();
  } catch (e) { console.error('save error', e); }
}

function flashAutosave() {
  const box = document.getElementById('autosave-indicator');
  if (!box) return;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 900);
}

export function toast(msg) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function fmtTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = (min % 60).toString().padStart(2, '0');
  return `${h.toString().padStart(2, '0')}:${m}`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function getBuff(kind) {
  return game.buffs?.[kind] || 0;
}

function buffsText() {
  const b = game.buffs || {};
  const parts = [];
  if (b.harvestBoost) parts.push(`🌾+${Math.round(b.harvestBoost * 100)}%`);
  if (b.chopBoost)    parts.push(`🪵+${Math.round(b.chopBoost * 100)}%`);
  if (b.mineBoost)    parts.push(`⛏️+${Math.round(b.mineBoost * 100)}%`);
  if (b.sellBoost)    parts.push(`💰+${Math.round(b.sellBoost * 100)}%`);
  return parts.join(' · ') || '—';
}

function effectiveMaxDur(tier) {
  const base = TIER[tier].max;
  const bonus = getToolDurabilityBonusPct();
  return Math.round(base * (1 + bonus));
}

/* =========================
   🪓 Estados y afinidad
   ========================= */

// Estado de la herramienta en función de durabilidad y afilado
export function getToolState(key) {
  const t = game.tools[key];
  if (!t) return 'none';

  const max = effectiveMaxDur(t.tier);

  if (t.sharpUsesLeft && t.sharpUsesLeft > 0) return 'sharp';
  if (t.dur <= 0) return 'broken';
  if (t.dur <= max * 0.25) return 'dull';
  return 'normal';
}

// Bonus por afinidad (según usos totales)
function toolAffinityMult(t) {
  const uses = t.uses || 0;
  let m = 1;

  if (uses >= 50)  m += 0.05; // +5% base
  if (uses >= 150) m += 0.05; // +10% total
  if (uses >= 300) m += 0.05; // +15% total

  return m;
}

/* =========================
   Uso de herramienta
   ========================= */

export function useTool(key, cost = 1) {
  const t = game.tools[key];
  if (!t) return true;

  if (t.dur <= 0) {
    toast('Tu herramienta está rota');
    return false;
  }

  // desgaste por uso
  t.dur = Math.max(0, t.dur - cost);

  // registrar usos totales (afinidad)
  t.uses = (t.uses || 0) + 1;

  // gastar cargas de afilado especial
  if (t.sharpUsesLeft && t.sharpUsesLeft > 0) {
    t.sharpUsesLeft -= 1;
    if (t.sharpUsesLeft <= 0) {
      t.sharpUsesLeft = 0;
      toast('El filo especial de tu herramienta se ha desgastado.');
    }
  }

  return t.dur > 0;
}

/* =========================
   💎 Gemas para herramientas
   ========================= */

// Cada gema puede dar bonus específico por herramienta o genérico
const GEM_TOOL_BONUS = {
  // ejemplos: ids que podremos usar cuando crafeemos gemas
  gem_chop_small: {
    axeMult: 0.10   // +10% tala
  },
  gem_mine_small: {
    pickMult: 0.10  // +10% minería
  },
  gem_field_small: {
    hoeMult: 0.10   // +10% cosecha
  },
  // genérica
  gem_tool_universal_small: {
    allToolsMult: 0.05  // +5% en todas las herramientas
  }
};

/* =========================
   Multiplicador según tier,
   estado, afinidad y gemas
   ========================= */

export function toolMult(key) {
  const t = game.tools[key];
  if (!t) return 1;

  // base por tier
  let mult = TIER[t.tier].mult;

  // 1️⃣ especialización por herramienta (stats extra)
  if (key === 'axe') {
    mult *= 1 + 0.05 * (t.tier - 1); // 0%, 5%, 10%, 15%
  } else if (key === 'pick') {
    mult *= 1 + 0.08 * (t.tier - 1); // 0%, 8%, 16%, 24%
  } else if (key === 'hoe') {
    mult *= 1 + 0.04 * (t.tier - 1); // 0%, 4%, 8%, 12%
  }

  // 2️⃣ estado de la herramienta (afilada / desafilada)
  const state = getToolState(key);
  if (state === 'sharp') {
    mult *= 1.2;   // +20% mientras esté afilada
  } else if (state === 'dull') {
    mult *= 0.8;   // -20% cuando está muy gastada
  }

  // 3️⃣ afinidad por uso (maestría con esa herramienta)
  mult *= toolAffinityMult(t);

  // 4️⃣ BONUS DE GEMAS ENGARZADAS EN ESA HERRAMIENTA
  const toolEquip = game.equipTools?.[key];
  const sockets = toolEquip?.sockets || [];

  sockets.forEach(sock => {
    if (!sock || sock.state !== 'ok' || !sock.gemId) return;
    const g = GEM_TOOL_BONUS[sock.gemId];
    if (!g) return;

    if (key === 'axe'  && g.axeMult)        mult *= (1 + g.axeMult);
    if (key === 'pick' && g.pickMult)       mult *= (1 + g.pickMult);
    if (key === 'hoe'  && g.hoeMult)        mult *= (1 + g.hoeMult);
    if (g.allToolsMult)                     mult *= (1 + g.allToolsMult);
  });

  return mult;
}

function syncHud() {
  document.getElementById('hud-coins').textContent = game.coins;
  document.getElementById('hud-day').textContent = game.day;
  document.getElementById('hud-time').textContent = fmtTime(game.minutes);
  document.getElementById('hud-weather').textContent =
    `${game.weather.emoji} ${cap(game.weather.type)}`;

    const A = game.tools.axe, P = game.tools.pick, H = game.tools.hoe;
  const Amax = effectiveMaxDur(A.tier);
  const Pmax = effectiveMaxDur(P.tier);
  const Hmax = effectiveMaxDur(H.tier);

  // 🧿 Ahora el HUD respeta si la herramienta está equipada en Personaje
  const eq = game.equipment || {};

  let axePart, pickPart, hoePart;

  if (!eq.axe) {
    axePart = `🪓 <span class="muted">Sin hacha</span>`;
  } else {
    axePart = `🪓 ${TIER[A.tier].name} <span class="badge">${A.dur}/${Amax}</span>`;
  }

  if (!eq.pick) {
    pickPart = `⛏️ <span class="muted">Sin pico</span>`;
  } else {
    pickPart = `⛏️ ${TIER[P.tier].name} <span class="badge">${P.dur}/${Pmax}</span>`;
  }

  if (!eq.hoe) {
    hoePart = `🚜 <span class="muted">Sin azadón</span>`;
  } else {
    hoePart = `🚜 ${TIER[H.tier].name} <span class="badge">${H.dur}/${Hmax}</span>`;
  }

  document.getElementById('hud-tools').innerHTML =
    `${axePart} · ${pickPart} · ${hoePart}`;


  document.getElementById('hud-rep-val').textContent = game.missions.rep || 0;
  document.getElementById('hud-streak').textContent = game.missions.streak.current || 0;
  document.getElementById('hud-best-streak').textContent = game.missions.streak.best || 0;
  document.getElementById('hud-buffs').textContent = 'Buffs: ' + buffsText();
}
// Permitir que otros módulos refresquen el HUD cuando cambie el equipo
export function refreshHud() {
  syncHud();
}

export function repairTool(key) {
  const t = game.tools[key];
  const costCoins = 6 * t.tier;
  const needIron = t.tier >= 2 ? 1 : 0;
  const needWood = 1;
  if (game.coins < costCoins) return toast('Faltan monedas');
  if ((game.inv.hierro || 0) < needIron) return toast('Falta hierro');
  if ((game.inv.madera || 0) < needWood) return toast('Falta madera');
  game.coins -= costCoins;
  game.inv.hierro = (game.inv.hierro || 0) - needIron;
  game.inv.madera = (game.inv.madera || 0) - needWood;
  t.dur = effectiveMaxDur(t.tier);
  toast('Herramienta reparada');
}

// 🔪 afilado especial (cargas limitadas)
export function sharpenTool(key) {
  const t = game.tools[key];
  if (!t) return;

  const baseUses = 20;          // cuántos usos dura el filo
  const costCoins = 4 * t.tier;
  const needIron  = t.tier >= 2 ? 1 : 0;

  if (game.coins < costCoins) {
    return toast('Faltan monedas para afilar.');
  }
  if (needIron && ((game.inv.hierro || 0) < needIron)) {
    return toast('Falta hierro para el afilado.');
  }

  game.coins -= costCoins;
  if (needIron) {
    game.inv.hierro = (game.inv.hierro || 0) - needIron;
  }

  t.sharpUsesLeft = baseUses;
  toast('La herramienta queda afilada para las próximas tareas.');
}

export function missionEvent(type, value = 1) {
  applyMissionEvent(type, value);
  applyAchievementEvent(type, value);

  // 🔄 refrescar pestaña Progreso si está abierta
  const current = document.querySelector('.tab.on')?.dataset.tab;
  if (current === 'progreso') {
    renderProgreso();
  }
}

function allDailyCompleted() {
  return (game.missions.daily || []).every(m => m.progress >= m.goal);
}

// 👇 render con caché de pestaña
function render(force = false) {
  const current = document.querySelector('.tab.on')?.dataset.tab || 'pueblo';

  // Solo redibujamos el panel si cambió de pestaña o si forzamos
  if (force || current !== lastRenderedTab) {
    if (current === 'pueblo')       renderPueblo();
    if (current === 'personaje')    renderPersonaje();
    if (current === 'campos')       renderCampos();
    if (current === 'bosque')       renderBosque();
    if (current === 'mina')         renderMina();
    if (current === 'corrales')     renderCorrales();
    if (current === 'tienda')       renderTienda();
    if (current === 'casa')         renderCasa();
    if (current === 'cocina')       renderKitchen();
    if (current === 'progreso')     renderProgreso();
    if (current === 'apariencia')   renderAppearance();
    if (current === 'inventario')   renderInventario();
    if (current === 'herramientas') renderTools();

    lastRenderedTab = current;
  }

  game.missions.streak.todayCompleted = allDailyCompleted();
  syncHud();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('on'));
    t.classList.add('on');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    document.getElementById(t.dataset.tab).classList.add('on');
    render(true);   // 👈 forzamos redibujar al cambiar de pestaña
  }));
}

// 🔁 ahora los buffs duran varios días: aquí solo reducimos días o apagamos
function clearBuffsEndOfDay() {
  if (!game.buffs) {
    game.buffs = { harvestBoost: 0, chopBoost: 0, mineBoost: 0, sellBoost: 0 };
  }
  if (!game.buffDays) {
    game.buffDays = { harvestBoost: 0, chopBoost: 0, mineBoost: 0, sellBoost: 0 };
  }

  const KEYS = ['harvestBoost', 'chopBoost', 'mineBoost', 'sellBoost'];

  KEYS.forEach(key => {
    const days = game.buffDays[key] || 0;
    if (days > 1) {
      game.buffDays[key] = days - 1;
    } else {
      game.buffDays[key] = 0;
      game.buffs[key] = 0;
    }
  });
}

function nextDay() {
  endOfDayDailyCheck();
  clearBuffsEndOfDay();

  // 📊 actualizar récords diarios antes de resetear contadores del día
  const s = game.stats;
  if (s) {
    if (s.goldToday > (s.maxSingleDaySales || 0)) {
      s.maxSingleDaySales = s.goldToday;
    }
    if (s.treesToday > (s.bestTreesCutInDay || 0)) {
      s.bestTreesCutInDay = s.treesToday;
    }
    if (s.rocksToday > (s.bestRocksMinedInDay || 0)) {
      s.bestRocksMinedInDay = s.rocksToday;
    }

    if (s.maxSingleDaySales >= 200) {
      unlockTrophy(
        'trophy_big_sales',
        'Día de fortuna',
        'Has vendido 200 ₥ o más en un solo día.',
        'raro',
        '💰'
      );
    }
    if (s.treesCut >= 100) {
      unlockTrophy(
        'trophy_wood_master',
        'Leñador maestro',
        'Has talado al menos 100 árboles en total.',
        'épico',
        '🌲'
      );
    }
    if (s.rocksMined >= 100) {
      unlockTrophy(
        'trophy_mine_master',
        'Minero maestro',
        'Has picado al menos 100 rocas en total.',
        'épico',
        '⛏️'
      );
    }
    if (s.totalGoldEarned >= 2000) {
      unlockTrophy(
        'trophy_merchant_legend',
        'Comerciante legendario',
        'Has generado 2000 ₥ o más a lo largo de la partida.',
        'legendario',
        '👑'
      );
    }

    s.goldToday  = 0;
    s.treesToday = 0;
    s.rocksToday = 0;
  }

  game.minutes = 6 * 60;
  game.day += 1;
  newWeather();
  dailyMarket();
  tickCorrales();
  tickCampos();
  game.missions.rerollsLeft = 1;
  generateDailyMissions(true);
  toast('Nuevo día ☀️ Misiones actualizadas');
}

function newWeather() {
  const r = Math.random(); let type = 'soleado', emoji = '☀️';
  if (r < 0.15) { type = 'tormenta'; emoji = '⛈️'; }
  else if (r < 0.45) { type = 'lluvia'; emoji = '🌧️'; }
  else if (r < 0.65) { type = 'nublado'; emoji = '☁️'; }
  game.weather = { type, emoji };
}

function gameTick() {
  game.minutes += 10;
  if (game.minutes >= 24 * 60) nextDay();
  render();  // 👈 aquí NO forzamos, así no se borra el diálogo
  if ((game.day * 24 * 60 + game.minutes) % 60 === 0) save(false);
}

function bindTopButtons() {
  document.getElementById('btn-save').addEventListener('click', () => save(true));
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('¿Reiniciar partida?')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
}

load();
applyThemeFromSave();
dailyMarket();
if (!game.missions.daily || game.missions.daily.length === 0) generateDailyMissions(true);
setupTabs();
render(true);            // 👈 primer render forzado
bindTopButtons();
setInterval(gameTick, 1200);
