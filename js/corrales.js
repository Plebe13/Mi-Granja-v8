// corrales.js
import { game, toast, getCoopLevel, COOP_LEVELS } from './main.js';
import { applyMissionEvent } from "./missions.js";


// --- precios para comprar animales ---
const BUY_PRICES = {
  vaca:    { coins: 40 },
  gallina: { coins: 12 },
  puerco:  { coins: 25 }
};

// --- límites de peso ---
const MAX_COW_WEIGHT  = 12; // para que no revienten 😅
const MAX_PIG_WEIGHT  = 15;
// --- genética básica + enfermedades (por ahora sólo gallinas) ---

const HEN_TRAITS = {
  robusta: {
    key: 'robusta',
    icon: '💪',
    label: 'Robusta',
    eggBonus: 0,
    diseaseMult: 0.6, // se enferma menos
    desc: 'Más resistente a enfermedades.'
  },
  ponedora: {
    key: 'ponedora',
    icon: '🥚',
    label: 'Ponedora',
    eggBonus: 0.4,    // +40% huevos
    diseaseMult: 1.0,
    desc: 'Produce más huevos al día.'
  },
  delicada: {
    key: 'delicada',
    icon: '🤒',
    label: 'Delicada',
    eggBonus: 0.1,
    diseaseMult: 1.6, // se enferma más fácil
    desc: 'Buena ponedora pero se enferma con facilidad.'
  },
  veloz: {
    key: 'veloz',
    icon: '💨',
    label: 'Veloz',
    eggBonus: 0.2,
    diseaseMult: 1.0,
    desc: 'Crece más rápido en edad útil.'
  }
};

const HEN_TRAIT_POOL = [
  'robusta', 'robusta',
  'ponedora', 'ponedora', 'ponedora',
  'veloz',
  'delicada'
];

const HEN_DISEASES = {
  parasites: {
    key: 'parasites',
    icon: '🪱',
    label: 'Parásitos',
    eggMult: 0.5,  // -50% huevos
    healthLoss: 4  // vida que pierde por día estando enferma
  },
  flu: {
    key: 'flu',
    icon: '🤧',
    label: 'Resfriado',
    eggMult: 0.7,
    healthLoss: 2
  }
};

function randomHenTraitKey() {
  return HEN_TRAIT_POOL[Math.floor(Math.random() * HEN_TRAIT_POOL.length)];
}

function getHenTrait(hen) {
  if (!hen || !hen.traitKey) return null;
  return HEN_TRAITS[hen.traitKey] || null;
}

function getHenDisease(hen) {
  if (!hen || !hen.sick || !hen.diseaseKey) return null;
  return HEN_DISEASES[hen.diseaseKey] || null;
}


// --- niveles del establo de vacas ---
const STABLE_LEVELS = {
  1: {
    name: 'Corral pequeño',
    capacity: 3,
    bonusMilk: 0,
    cost: null
  },
  2: {
    name: 'Establo simple',
    capacity: 5,
    bonusMilk: 0.1,
    cost: { coins: 80, madera: 20 }
  },
  3: {
    name: 'Establo cómodo',
    capacity: 7,
    bonusMilk: 0.2,
    cost: { coins: 140, madera: 35, hierro: 4 }
  },
  4: {
    name: 'Establo avanzado',
    capacity: 12, // 4 filas de 3 vacas
    bonusMilk: 0.3,
    cost: { coins: 220, madera: 50, piedra: 40, hierro: 8, low_gem: 1 }
  }
};

// --- niveles del corral de puercos ---
const PIG_PEN_LEVELS = {
  1: {
    name: 'Corral básico',
    capacity: 3,
    weightMult: 1.0,
    filthControl: 0,
    autoClean: false,
    cost: null
  },
  2: {
    name: 'Corral reforzado',
    capacity: 5,
    weightMult: 1.1,
    filthControl: 1,
    autoClean: false,
    cost: { coins: 70, madera: 20 }
  },
  3: {
    name: 'Engorda intensiva',
    capacity: 7,
    weightMult: 1.2,
    filthControl: 2,
    autoClean: false,
    cost: { coins: 120, madera: 35, hierro: 4 }
  },
  4: {
    name: 'Engorda premium',
    capacity: 10,
    weightMult: 1.3,
    filthControl: 3,
    autoClean: true, // se auto-limpia un poco cada día
    cost: { coins: 200, madera: 50, piedra: 40, hierro: 8, low_gem: 1 }
  }
};

// --- helpers establo vacas ---
function getStableLevel() {
  return game.stableLevel || 1;
}
function getStableInfo() {
  const lvl = getStableLevel();
  return STABLE_LEVELS[lvl] || STABLE_LEVELS[1];
}
function getNextStableInfo() {
  const lvl = getStableLevel();
  return STABLE_LEVELS[lvl + 1] || null;
}

// --- helpers corral puercos ---
function getPigPenLevel() {
  return game.pigPenLevel || 1;
}
function getPigPenInfo() {
  const lvl = getPigPenLevel();
  return PIG_PEN_LEVELS[lvl] || PIG_PEN_LEVELS[1];
}
function getNextPigPenInfo() {
  const lvl = getPigPenLevel();
  return PIG_PEN_LEVELS[lvl + 1] || null;
}

// --- helpers de coste genéricos ---
function canPayCost(cost) {
  if (!cost) return false;
  if (cost.coins   && game.coins < cost.coins)                return false;
  if (cost.madera  && (game.inv.madera   || 0) < cost.madera) return false;
  if (cost.piedra  && (game.inv.piedra   || 0) < cost.piedra) return false;
  if (cost.hierro  && (game.inv.hierro   || 0) < cost.hierro) return false;
  if (cost.low_gem && (game.inv.low_gem  || 0) < cost.low_gem) return false;
  return true;
}
function payCost(cost) {
  if (!cost) return;
  if (cost.coins)   game.coins       -= cost.coins;
  if (cost.madera)  game.inv.madera  = (game.inv.madera  || 0) - cost.madera;
  if (cost.piedra)  game.inv.piedra  = (game.inv.piedra  || 0) - cost.piedra;
  if (cost.hierro)  game.inv.hierro  = (game.inv.hierro  || 0) - cost.hierro;
  if (cost.low_gem) game.inv.low_gem = (game.inv.low_gem || 0) - cost.low_gem;
}
function renderCost(cost) {
  if (!cost) return '—';
  const parts = [];
  if (cost.coins)   parts.push(`💰 ${cost.coins} ₥`);
  if (cost.madera)  parts.push(`🪵 ${cost.madera} madera`);
  if (cost.piedra)  parts.push(`🧱 ${cost.piedra} piedra`);
  if (cost.hierro)  parts.push(`⛏️ ${cost.hierro} hierro`);
  if (cost.low_gem) parts.push(`💠 ${cost.low_gem} gema pequeña`);
  return parts.join(' · ');
}

// --- helpers de forma de datos (por si vienen saves viejos) ---
function ensureCorralesShape() {
  if (!game.corrales) game.corrales = { vacas: [], gallinas: [], puercos: [] };
  if (!Array.isArray(game.corrales.vacas))    game.corrales.vacas    = [];
  if (!Array.isArray(game.corrales.gallinas)) game.corrales.gallinas = [];
  if (!Array.isArray(game.corrales.puercos))  game.corrales.puercos  = [];

  // vacas
  game.corrales.vacas.forEach(c => {
    if (c.age == null)        c.age = 0;
    if (!c.stage)             c.stage = 'adulto';
    if (c.milkReady == null)  c.milkReady = false;
    if (!c.sex)               c.sex = Math.random() < 0.5 ? 'H' : 'M'; // Hembra / Macho
    if (c.weight == null)     c.weight = 3;
    if (c.weight > MAX_COW_WEIGHT) c.weight = MAX_COW_WEIGHT;
    if (c.fedToday == null)   c.fedToday = false;
    if (c.pregnant == null)   c.pregnant = false;
    if (c.pregnantDays == null) c.pregnantDays = 0;
    if (c.health == null)     c.health = 100;
  });

  // gallinas
game.corrales.gallinas.forEach(g => {
  if (g.age == null)        g.age = 0;
  if (!g.stage)             g.stage = 'adulto';
  if (g.eggs == null)       g.eggs = 0;
  if (g.alive == null)      g.alive = true;
  if (g.fedToday == null)   g.fedToday = false;
  if (g.hunger == null)     g.hunger = 100;
  if (g.health == null)     g.health = 100;

  // genética nueva
  if (!g.traitKey)          g.traitKey = randomHenTraitKey();
  if (g.sick == null)       g.sick = false;
  if (g.diseaseKey === undefined) g.diseaseKey = null;

  // 🐓 Si no tiene sexo, se lo damos (20% gallo, 80% gallina)
  if (!g.sex)               g.sex = Math.random() < 0.2 ? 'M' : 'H';
});



  // puercos
  game.corrales.puercos.forEach(p => {
    if (p.age == null)          p.age = 0;
    if (!p.stage)               p.stage = 'flaco';
    if (p.weight == null)       p.weight = 1;
    if (p.weight > MAX_PIG_WEIGHT) p.weight = MAX_PIG_WEIGHT;
    if (p.health == null)       p.health = 100;
    if (!p.sex)                 p.sex = Math.random() < 0.5 ? 'H' : 'M';
    if (p.fedToday == null)     p.fedToday = false;
    if (p.pregnant == null)     p.pregnant = false;
    if (p.pregnantDays == null) p.pregnantDays = 0;
  });

  // casa / gallinero
  if (!game.house) game.house = { level:1, chest:{}, capacity:20, coopLevel:1, coopEggs:0 };
  if (game.house.coopEggs == null)        game.house.coopEggs = 0;
  if (game.house.coopLevel == null)       game.house.coopLevel = 1;
  if (game.house.coopAutoFeed == null)    game.house.coopAutoFeed = false;
  if (game.house.coopAutoCollect == null) game.house.coopAutoCollect = false;
  if (game.house.coopAutoCull == null)    game.house.coopAutoCull = false;

  // niveles de establo y corral de puercos
  if (game.stableLevel == null)  game.stableLevel  = 1;
  if (game.pigPenLevel == null)  game.pigPenLevel  = 1;
  if (game.pigPenFilth == null)  game.pigPenFilth  = 0; // 0–100 suciedad
}

// --- helpers de etapas ---
function stageLabelCow(c) {
  if (c.age < 20) return 'Joven';
  if (c.age < 80) return 'Adulta';
  return 'Vieja';
}
function stageLabelHen(g) {
  if (!g.alive) return 'Muerta';
  if (g.age < 8)  return 'Joven';
  if (g.age < 30) return 'Adulta';
  return 'Vieja';
}
function stageLabelPig(p) {
  if (p.age < 15) return 'Lechón';
  if (p.age < 45) return 'En engorda';
  if (p.age < 90) return 'Listo';
  return 'Viejo';
}
function pigFatnessLabel(p) {
  const w = p.weight || 1;
  if (w < 3)  return 'Flaco';
  if (w < 6)  return 'Normal';
  if (w < 9)  return 'Gordo';
  return 'Súper gordo';
}

// Calidad de la leche por vaca, según etapa + nivel de establo
function rollMilkQualityForCow(cow) {
  const stage = stageLabelCow(cow);
  const stable = getStableInfo();
  const bonus  = stable.bonusMilk || 0;

  let pGold, pExc, pGood;

  if (stage === 'Adulta') {
    pGold = 0.03 + bonus * 0.4;
    pExc  = 0.15 + bonus * 0.6;
    pGood = 0.35 + bonus * 0.6;
  } else if (stage === 'Vieja') {
    pGold = 0.02 + bonus * 0.3;
    pExc  = 0.10 + bonus * 0.5;
    pGood = 0.30 + bonus * 0.6;
  } else { // Joven
    pGold = 0.01 + bonus * 0.2;
    pExc  = 0.08 + bonus * 0.4;
    pGood = 0.25 + bonus * 0.5;
  }

  const clamp = v => Math.max(0, Math.min(1, v));
  pGold = clamp(pGold);
  pExc  = clamp(pExc);
  pGood = clamp(pGood);

  const r = Math.random();
  if (r < pGold) {
    return { tier:'gold', label:'Dorada', emoji:'🟡' };
  } else if (r < pGold + pExc) {
    return { tier:'excellent', label:'Excelente', emoji:'🟢' };
  } else if (r < pGold + pExc + pGood) {
    return { tier:'good', label:'Buena', emoji:'🔵' };
  } else {
    return { tier:'common', label:'Común', emoji:'⚪' };
  }
}

/* =========================
   🎴 Render Corrales (con subpestañas)
   ========================= */
export function renderCorrales() {
  ensureCorralesShape();

  const el = document.getElementById('corrales');
  if (!el) return;

  const vacas    = game.corrales.vacas;
  const gallinas = game.corrales.gallinas.filter(g => g.alive !== false);
  const puercos  = game.corrales.puercos;

  const coopLevel = getCoopLevel();
  const coopCfg   = COOP_LEVELS[coopLevel];
  const house     = game.house || {};

  const autoFeedFlag    = !!house.coopAutoFeed;
  const autoCollectFlag = !!house.coopAutoCollect;
  const autoCullFlag    = !!house.coopAutoCull;

  // “activos de verdad” sólo si se cumple el nivel mínimo
  const autoFeedActive    = autoFeedFlag    && coopLevel >= 2;
  const autoCollectActive = autoCollectFlag && coopLevel >= 3;
  const autoCullActive    = autoCullFlag    && coopLevel >= 5;

  const view = game.corralesView || 'vacas';

  // info de establo y corral de puercos
  const stableInfo   = getStableInfo();
  const nextStable   = getNextStableInfo();
  const stableLevel  = getStableLevel();

  const pigPenInfo   = getPigPenInfo();
  const nextPigPen   = getNextPigPenInfo();
  const pigPenLevel  = getPigPenLevel();
  const pigFilth     = game.pigPenFilth || 0;

  // info de gallinero (próxima mejora)
  const nextCoop = COOP_LEVELS[coopLevel + 1] || null;

  // Tarjetas de vacas (compactas)
  let vacasHtml = '';
  if (!vacas.length) {
    vacasHtml = `<p class="kv">No tienes vacas todavía.</p>`;
  } else {
    vacasHtml = `
      <div class="grid cols-3" style="gap:6px">
        ${vacas.map((c, idx) => {
          const stage  = stageLabelCow(c);
          const age    = c.age || 0;
          const milk   = c.milkReady ? '✅' : '❌';
          const sex    = c.sex === 'M' ? 'Macho' : 'Hembra';
          const weightVal = (c.weight != null ? c.weight : 3);
          const weight = weightVal.toFixed ? weightVal.toFixed(1) : weightVal;
          const meatPreview = Math.max(1, Math.round(weightVal * 1.5));

          let pregLabelShort;
          if (c.sex === 'H') {
            if (c.pregnant) {
              const d = c.pregnantDays || 0;
              pregLabelShort = `Sí (${d}d)`;
            } else {
              pregLabelShort = 'No';
            }
          } else {
            pregLabelShort = 'N/A';
          }

          return `
            <div class="card" style="padding:4px 6px;font-size:.78rem;line-height:1.25">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
                <strong style="font-size:.8rem">Vaca #${idx + 1}</strong>
                <span style="font-size:.7rem">${stage}</span>
              </div>

              <div style="display:flex;justify-content:space-between;font-size:.75rem">
                <span>Edad: <strong>${age}d</strong></span>
                <span>Sexo: <strong>${sex}</strong></span>
              </div>

              <div style="display:flex;justify-content:space-between;font-size:.75rem">
                <span>Peso: <strong>${weight}</strong></span>
                <span>Carne: <strong>~${meatPreview}</strong></span>
              </div>

              <div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:2px">
                <span>Preñada: <strong>${pregLabelShort}</strong></span>
                <span>Leche: <strong>${milk}</strong></span>
              </div>

              <div style="text-align:right;margin-top:2px">
                <button
                  class="btn xsmall btn-slaughter-cow"
                  data-cow-index="${idx}"
                  style="font-size:.7rem;padding:2px 6px"
                >
                  ⚔️ Sacrificar
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Tarjetas de puercos
  let pigsHtml = '';
  if (!puercos.length) {
    pigsHtml = `<p class="kv">No tienes puercos todavía.</p>`;
  } else {
    pigsHtml = `
      <div class="grid cols-3" style="gap:6px">
        ${puercos.map((p, idx) => {
          const stage   = stageLabelPig(p);
          const age     = p.age || 0;
          const weightV = (p.weight != null ? p.weight : 1);
          const weight  = weightV.toFixed ? weightV.toFixed(1) : weightV;
          const fatness = pigFatnessLabel(p);
          const health  = p.health != null ? p.health : 100;
          const sex     = p.sex === 'M' ? 'Macho' : 'Hembra';

          let pregLabelShort = 'N/A';
          if (p.sex === 'H') {
            if (p.pregnant) {
              const d = p.pregnantDays || 0;
              pregLabelShort = `Sí (${d}d)`;
            } else {
              pregLabelShort = 'No';
            }
          }

          return `
            <div class="card" style="padding:4px 6px;font-size:.78rem;line-height:1.25">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
                <strong style="font-size:.8rem">Puerco #${idx + 1}</strong>
                <span style="font-size:.7rem">${stage}</span>
              </div>

              <div style="display:flex;justify-content:space-between;font-size:.75rem">
                <span>Edad: <strong>${age}d</strong></span>
                <span>Sexo: <strong>${sex}</strong></span>
              </div>

              <div style="display:flex;justify-content:space-between;font-size:.75rem">
                <span>Peso: <strong>${weight}</strong></span>
                <span>Gordura: <strong>${fatness}</strong></span>
              </div>

              <div style="display:flex;justify-content:space-between;font-size:.75rem">
                <span>Salud: <strong>${health}</strong></span>
                <span>Preñada: <strong>${pregLabelShort}</strong></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- vista específica según pestaña ---
  let bodyHtml = '';

    // 🐄 VACAS
  if (view === 'vacas') {
    bodyHtml = `
      <div class="card" style="margin-bottom:8px;padding:6px 8px;font-size:.85rem;line-height:1.25">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:600">🏠 Establo de vacas</span>
          <span style="font-size:.8rem">
            ${stableInfo.name} · nivel ${stableLevel}
          </span>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:2px;font-size:.8rem">
          <span>Capacidad: <strong>${vacas.length}</strong> / ${stableInfo.capacity} vacas</span>
          <span>Bono leche: <strong>${Math.round(stableInfo.bonusMilk * 100)}%</strong></span>
        </div>

        <div style="font-size:.75rem;color:#ccc;margin-bottom:2px">
          Vacas muy viejas (120+ días) pueden morir de vejez cada día.
        </div>

        ${
          nextStable
            ? `
              <div style="border-top:1px solid rgba(255,255,255,.08);margin-top:4px;padding-top:4px;font-size:.78rem;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
                <div>
                  <div><strong>Próxima mejora:</strong> ${nextStable.name}</div>
                  <div style="font-size:.75rem">Capacidad: ${nextStable.capacity} vacas</div>
                  <div style="font-size:.75rem">Coste: ${renderCost(nextStable.cost)}</div>
                </div>
                <button class="btn xsmall" id="btn-upgrade-stable"
                  ${!canPayCost(nextStable.cost) ? 'disabled' : ''}>
                  Mejorar establo
                </button>
              </div>
            `
            : `
              <div style="margin-top:2px;font-size:.75rem">
                Tu establo ya está al máximo nivel.
              </div>
            `
        }
      </div>

      <div class="card">
        ${vacasHtml}
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small" id="btn-milk-cows">Ordeñar vacas listas</button>
          <button class="btn small" id="btn-feed-cows">Alimentar vacas (trigo)</button>
          <button class="btn small" id="btn-buy-cow-1">Comprar 1 vaca (${BUY_PRICES.vaca.coins} ₥)</button>
        </div>
      </div>
    `;
  }

  // 🐔 GALLINAS / GALLINERO
  else if (view === 'gallinas') {
    const hensCount = gallinas.length;
    const hensCap   = coopCfg.capacity || 4;

    // Tarjetas 2 columnas, compactas
    let gallinasHtml = '';
    if (!hensCount) {
      gallinasHtml = '<p class="kv">No tienes gallinas todavía.</p>';
    } else {
      gallinasHtml =
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">';

      gallinas.forEach((h, idx) => {
        const age    = h.age || 0;
        const hungry = (h.hunger || 0) < 50;
        const eggs   = h.eggs || 0;

        const isHen   = h.sex !== 'M';
        const isAdult = age >= 8; // 0–7 pollito, 8+ adulta/vieja

        // Huevos solo si es gallina adulta/vieja
        let eggsLine = '';
        if (isHen && isAdult) {
          const eggsText = eggs > 0 ? 'Huevos: x' + eggs : 'Huevos: —';
          eggsLine = '<p class="small-text">' + eggsText + '</p>';
        }

        const sexLabel =
          h.sex === 'M'
            ? (age < 8 ? '🐣 Pollito (Gallo)'   : '🐓 Gallo')
            : (age < 8 ? '🐣 Pollito (Gallina)' : '🐔 Gallina');

        let stageLabel = 'Pollito';
        if (age >= 8 && age < 30) stageLabel = 'Adulta';
        if (age >= 30)           stageLabel = 'Vieja';

        const hungerText = hungry
          ? '<span class="bad">Sí</span>'
          : '<span class="good">No</span>';

        const healthVal = h.health != null ? h.health : 100;
        const healthClass =
          healthVal >= 80 ? 'good' :
          healthVal >= 50 ? 'warn' : 'bad';

        const trait = getHenTrait(h);
        const traitText = trait
          ? (trait.icon + ' ' + trait.label)
          : '—';

        let diseaseLine = '';
        if (h.sick && h.diseaseKey) {
          const dis = getHenDisease(h);
          const label = dis
            ? (dis.icon + ' ' + dis.label)
            : 'Enferma';
          diseaseLine =
            '<p class="small-text">Estado: <span class="bad">' + label + '</span></p>';
        } else {
          diseaseLine =
            '<p class="small-text">Estado: <span class="good">Sana</span></p>';
        }

        gallinasHtml +=
          '<div class="animal-card hen-card" data-hen-index="' + idx + '">' +
            '<div style="text-align:center;margin-bottom:2px;font-weight:700;font-size:.8rem">' +
              sexLabel +
            '</div>' +
            '<p class="small-text">Edad: <strong>' + stageLabel + '</strong> (' + age + ' d)</p>' +
            '<p class="small-text">Hambre: ' + hungerText +
              ' · Salud: <span class="' + healthClass + '">' + healthVal + '%</span></p>' +
            '<p class="small-text">Rasgo: ' + traitText + '</p>' +
            diseaseLine +
            eggsLine +
            '<div style="text-align:center;margin-top:4px">' +
              '<button class="btn xsmall btn-hen-cull" data-hen-index="' + idx + '">Matar</button>' +
            '</div>' +
          '</div>';
      });

      gallinasHtml += '</div>';
    }

    const autoFeedFlagLoc    = house.coopAutoFeed    === true;
    const autoCollectFlagLoc = house.coopAutoCollect === true;
    const autoCullFlagLoc    = house.coopAutoCull    === true;

    const autoFeedActiveLoc    = autoFeedFlagLoc    && coopLevel >= 2;
    const autoCollectActiveLoc = autoCollectFlagLoc && coopLevel >= 3;
    const autoCullActiveLoc    = autoCullFlagLoc    && coopLevel >= 5;

    const nextCoopLoc = COOP_LEVELS[coopLevel + 1] || null;

    bodyHtml = `
      <h3>🐔 Gallinero</h3>

      <div class="row" style="margin-bottom:8px;gap:4px">
        <button class="btn small" id="btn-feed-hens" style="flex:1">Alimentar</button>
        <div class="card" style="flex:1;text-align:center;font-weight:700">
          GALLINERO
        </div>
        <button class="btn small" id="btn-collect-eggs-manual" style="flex:1">
          Recoger huevos
        </button>
      </div>

      <p class="kv small-text">
        Cantidad: <strong>${hensCount}</strong> / <strong>${hensCap}</strong> gallinas
      </p>

      <div class="grid cols-3" style="gap:12px;margin-top:8px">
        <!-- IZQUIERDA: gallinas -->
        <div>
          ${gallinasHtml}
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
            <button class="btn small" id="btn-buy-hen-1">
              Comprar 1 gallina (${BUY_PRICES.gallina.coins} ₥)
            </button>
            <button class="btn small" id="btn-buy-hen-3">
              Comprar 3 gallinas (${BUY_PRICES.gallina.coins * 3} ₥)
            </button>
          </div>
        </div>

        <!-- CENTRO: automatización -->
        <div>
          <div class="card" style="margin-bottom:8px">
            <h4 class="small-text">Automatización del gallinero</h4>
            <p class="small-text">
              Nivel actual del gallinero: <strong>${coopLevel}</strong>.
            </p>
            <ul class="small-text">
              <li>Lv.2: auto-alimentar.</li>
              <li>Lv.3: auto-recolectar huevos.</li>
              <li>Lv.5: auto-sacrificar gallinas viejas.</li>
            </ul>

            <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">
              <button class="btn xsmall" id="btn-toggle-autoFeed">
                Toggle auto-alimentar (lvl 2+)
              </button>
              <button class="btn xsmall" id="btn-toggle-autoCollect">
                Toggle auto-recolectar (lvl 3+)
              </button>
              <button class="btn xsmall" id="btn-toggle-autoCull">
                Toggle auto-sacrificar (lvl 5+)
              </button>
            </div>
          </div>

          <div class="card">
            <h4 class="small-text">Depósito de huevos</h4>
            <p class="small-text">
              Huevos en el depósito: <strong>${house.coopEggs || 0}</strong>
            </p>
            <button class="btn small" id="btn-move-coop-eggs">
              Recoger huevos al inventario
            </button>
          </div>
        </div>

        <!-- DERECHA: mejora gallinero -->
        <div>
          <div class="card">
            <h4 class="small-text">Mejorar gallinero</h4>
            ${
              nextCoopLoc
                ? `
                  <p class="small-text">
                    Próxima mejora: nivel ${coopLevel + 1}
                  </p>
                  <p class="small-text">
                    Capacidad: <strong>${hensCap}</strong> → <strong>${nextCoopLoc.capacity}</strong> gallinas
                  </p>
                  <p class="small-text">
                    Coste: ${renderCost(nextCoopLoc.cost)}
                  </p>
                  <button class="btn small" id="btn-upgrade-coop">
                    Mejorar gallinero
                  </button>
                `
                : `
                  <p class="small-text">
                    El gallinero ya está al nivel máximo planificado.
                  </p>
                `
            }
          </div>
        </div>
      </div>
    `;
  }

  // 🐷 PUERCOS
  else if (view === 'puercos') {
    bodyHtml = `
      <div class="card" style="margin-bottom:8px;padding:6px 8px;font-size:.85rem;line-height:1.25">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:600">🏚️ Corral de puercos</span>
          <span style="font-size:.8rem">
            ${pigPenInfo.name} · nivel ${pigPenLevel}
          </span>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:2px;font-size:.8rem">
          <span>Capacidad: <strong>${puercos.length}</strong> / ${pigPenInfo.capacity} puercos</span>
          <span>Engorda: <strong>+${Math.round((pigPenInfo.weightMult - 1) * 100)}%</strong></span>
        </div>

        <div style="font-size:.78rem;margin-bottom:2px">
          Suciedad del corral: <strong>${pigFilth}</strong> / 100
        </div>
        <div style="font-size:.75rem;color:#ccc;margin-bottom:4px">
          Mucha suciedad reduce la salud y puede matar puercos.
          ${pigPenInfo.autoClean ? 'Este corral se auto-limpia un poco cada día.' : ''}
        </div>

        ${
          nextPigPen
            ? `
              <div style="border-top:1px solid rgba(255,255,255,.08);margin-top:4px;padding-top:4px;font-size:.78rem;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
                <div>
                  <div><strong>Próxima mejora:</strong> ${nextPigPen.name}</div>
                  <div style="font-size:.75rem">Capacidad: ${nextPigPen.capacity} puercos</div>
                  <div style="font-size:.75rem">Coste: ${renderCost(nextPigPen.cost)}</div>
                </div>
                <button class="btn xsmall" id="btn-upgrade-pigpen"
                  ${!canPayCost(nextPigPen.cost) ? 'disabled' : ''}>
                  Mejorar corral
                </button>
              </div>
            `
            : `
              <div style="margin-top:2px;font-size:.75rem">
                Tu corral de puercos ya está al máximo nivel.
              </div>
            `
        }
      </div>

      <div class="card">
        ${pigsHtml}
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small" id="btn-feed-pigs">Alimentar puercos (maíz)</button>
          <button class="btn small" id="btn-slaughter-pig">Sacrificar mejor puerco</button>
          <button class="btn small" id="btn-clean-pigpen">Limpiar corral</button>
          <button class="btn small" id="btn-buy-pig-1">Comprar 1 puerco (${BUY_PRICES.puerco.coins} ₥)</button>
        </div>
      </div>
    `;
  }


  // Layout general con subpestañas
  el.innerHTML = `
    <h2>Corrales</h2>

    <div class="tabs corrales-tabs">
      <button class="tab ${view === 'vacas' ? 'on' : ''}" data-corral-view="vacas">🐄 Vacas</button>
      <button class="tab ${view === 'gallinas' ? 'on' : ''}" data-corral-view="gallinas">🐔 Gallinas</button>
      <button class="tab ${view === 'puercos' ? 'on' : ''}" data-corral-view="puercos">🐷 Puercos</button>
    </div>

    <div class="corral-panel" style="margin-top:12px">
      ${bodyHtml}
    </div>
  `;

  // Cambio de subpestaña
  el.querySelectorAll('[data-corral-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      game.corralesView = btn.dataset.corralView;
      renderCorrales();
    });
  });

  // Botón de mejora de establo
  const btnStable = el.querySelector('#btn-upgrade-stable');
  if (btnStable && nextStable) {
    btnStable.addEventListener('click', () => {
      const next = getNextStableInfo();
      if (!next) return;
      if (!canPayCost(next.cost)) {
        toast('No tienes suficientes recursos para mejorar el establo.');
        return;
      }
      payCost(next.cost);
      game.stableLevel = getStableLevel() + 1;
      toast(`Has mejorado el establo a: ${next.name}.`);
      renderCorrales();
    });
  }

  // Botón de mejora de corral de puercos
  const btnPigPen = el.querySelector('#btn-upgrade-pigpen');
  if (btnPigPen && nextPigPen) {
    btnPigPen.addEventListener('click', () => {
      const next = getNextPigPenInfo();
      if (!next) return;
      if (!canPayCost(next.cost)) {
        toast('No tienes suficientes recursos para mejorar el corral de puercos.');
        return;
      }
      payCost(next.cost);
      game.pigPenLevel = getPigPenLevel() + 1;
      toast(`Has mejorado el corral a: ${next.name}.`);
      renderCorrales();
    });
  }

  // Botón limpiar corral de puercos
  const btnCleanPigpen = el.querySelector('#btn-clean-pigpen');
  if (btnCleanPigpen) {
    btnCleanPigpen.addEventListener('click', () => {
      ensureCorralesShape();
      const filth = game.pigPenFilth || 0;
      if (filth <= 5) {
        toast('El corral ya está bastante limpio.');
        return;
      }
      game.pigPenFilth = Math.max(0, filth - 70); // limpieza fuerte
      toast('Has limpiado el corral de puercos.');
      renderCorrales();
    });
  }

  // Enlazar botones internos (ordeñar, alimentar, sacrificar, etc.)
  bindCorralesEvents();
}

/* =========================
   💰 Comprar animales
   ========================= */
function buyAnimals(kind, qty) {
  ensureCorralesShape();
  const cfg = BUY_PRICES[kind];
  if (!cfg) return;

  // límite de vacas por nivel de establo
  if (kind === 'vaca') {
    const lvl     = getStableLevel();
    const cap     = STABLE_LEVELS[lvl]?.capacity || 3;
    const current = game.corrales.vacas.length;
    if (current + qty > cap) {
      toast(`Tu establo sólo admite ${cap} vacas (nivel ${lvl}).`);
      return;
    }
  }

  // límite de gallinas por nivel de gallinero
  if (kind === 'gallina') {
    const lvl       = getCoopLevel();
    const cap       = COOP_LEVELS[lvl]?.capacity || 4;
    const current   = game.corrales.gallinas.filter(g => g.alive !== false).length;
    if (current + qty > cap) {
      toast(`Tu gallinero sólo admite ${cap} gallinas (nivel ${lvl}).`);
      return;
    }
  }

  // límite de puercos por nivel de corral
  if (kind === 'puerco') {
    const lvl     = getPigPenLevel();
    const cap     = PIG_PEN_LEVELS[lvl]?.capacity || 3;
    const current = game.corrales.puercos.length;
    if (current + qty > cap) {
      toast(`Tu corral sólo admite ${cap} puercos (nivel ${lvl}).`);
      return;
    }
  }

  const totalCost = cfg.coins * qty;
  if (game.coins < totalCost) {
    toast('No tienes suficientes monedas.');
    return;
  }

  game.coins -= totalCost;

    if (kind === 'vaca') {
    for (let i = 0; i < qty; i++) {
      game.corrales.vacas.push({
        age: 0,
        stage: 'joven',
        milkReady: false,
        sex: Math.random() < 0.5 ? 'H' : 'M',
        weight: 3,
        fedToday: false,
        pregnant: false,
        pregnantDays: 0,
        health: 100
      });
    }
  } else if (kind === 'gallina') {
    for (let i = 0; i < qty; i++) {
      game.corrales.gallinas.push({
        age: 0,
        stage: 'joven',
        eggs: 0,
        alive: true,
        fedToday: false,
        hunger: 100,
        health: 100,
        traitKey: randomHenTraitKey(),
        sick: false,
        diseaseKey: null,
        // 🐓 Aquí sale gallo/gallina al comprar
        sex: Math.random() < 0.2 ? 'M' : 'H'  // 20% gallo, 80% gallina
      });
    }
  } else if (kind === 'puerco') {
    for (let i = 0; i < qty; i++) {
      game.corrales.puercos.push({
        age: 0,
        stage: 'lechon',
        weight: 1,
        health: 100,
        sex: Math.random() < 0.5 ? 'H' : 'M',
        fedToday: false,
        pregnant: false,
        pregnantDays: 0
      });
    }
  }


  toast(`Compraste ${qty} ${kind === 'vaca' ? 'vaca(s)' : kind === 'gallina' ? 'gallina(s)' : 'puerco(s)'}.`);
  renderCorrales();
}


/* =========================
   🎛️ Acciones manuales
   ========================= */
function bindCorralesEvents() {
  const root = document.getElementById('corrales');
  if (!root) return;

  // Ordeñar vacas
  root.querySelector('#btn-milk-cows')?.addEventListener('click', () => {
    ensureCorralesShape();

    const vacas = game.corrales.vacas;
    if (!vacas.length) {
      toast('No tienes vacas que ordeñar.');
      return;
    }

    const stable = getStableInfo();

    let totalMilk = 0;
    let cowsMilked = 0;

    let countCommon = 0;
    let countGood = 0;
    let countExcellent = 0;
    let countGold = 0;

    for (const c of vacas) {
      // sólo hembras adultas/viejas con leche lista
      if (!c.milkReady || c.sex !== 'H') continue;

      c.milkReady = false;
      cowsMilked++;

      let amount = 1;

      const stage = stageLabelCow(c);
      let baseChance = 0;
      if (stage === 'Adulta') baseChance = 0.20;
      else if (stage === 'Vieja') baseChance = 0.10;

      let chanceDouble = baseChance + (stable.bonusMilk || 0);
      if (Math.random() < chanceDouble) {
        amount += 1;
      }

      totalMilk += amount;

      const q = rollMilkQualityForCow(c);
      if (q.tier === 'gold')           countGold++;
      else if (q.tier === 'excellent') countExcellent++;
      else if (q.tier === 'good')      countGood++;
      else                             countCommon++;
    }

    if (!totalMilk) {
      toast('No hay leche lista para ordeñar.');
      return;
    }

    game.inv.milk = (game.inv.milk || 0) + totalMilk;
	// ✅ Misiones: recolectar leche
  applyMissionEvent('collect_milk', totalMilk);

    const parts = [];
    if (countGold)      parts.push(`${countGold} dorada(s)`);
    if (countExcellent) parts.push(`${countExcellent} excelente(s)`);
    if (countGood)      parts.push(`${countGood} buena(s)`);
    if (!parts.length && countCommon) {
      parts.push(`${countCommon} común(es)`);
    }

    const qualityText = parts.length ? ` Calidad: ${parts.join(' · ')}.` : '';
    toast(`Ordeñaste ${cowsMilked} vaca(s) y obtuviste ${totalMilk} de leche.${qualityText}`);

    renderCorrales();
  });

  // Alimentar vacas (limite de peso)
  root.querySelector('#btn-feed-cows')?.addEventListener('click', () => {
    ensureCorralesShape();
    const vacas = game.corrales.vacas;
    if (!vacas.length) {
      toast('No tienes vacas que alimentar.');
      return;
    }
    let fed = 0;
    for (const c of vacas) {
      if ((game.inv.trigo || 0) <= 0) break;
      const currentWeight = c.weight != null ? c.weight : 3;
      if (currentWeight >= MAX_COW_WEIGHT) continue;

      game.inv.trigo -= 1;
      let newW = currentWeight + 0.8;
      if (newW > MAX_COW_WEIGHT) newW = MAX_COW_WEIGHT;
      c.weight = newW;
      c.fedToday = true;
      fed++;
	  applyMissionEvent("feed", 1);

    }
    if (!fed) {
      toast('No tienes trigo suficiente o tus vacas ya están en el peso máximo.');
      return;
    }
    toast(`Alimentaste ${fed} vaca(s). Algunas han ganado peso.`);
    renderCorrales();
  });

  // Sacrificar vaca (por tarjeta)
  root.querySelectorAll('.btn-slaughter-cow').forEach(btn => {
    btn.addEventListener('click', () => {
      ensureCorralesShape();
      const idx = Number(btn.dataset.cowIndex);
      const vacas = game.corrales.vacas;
      if (!vacas.length || isNaN(idx) || idx < 0 || idx >= vacas.length) {
        toast('No se encontró esa vaca.');
        return;
      }

      const cow = vacas[idx];
      const w = cow.weight || 3;
      const meatGain = Math.max(1, Math.round(w * 1.5));

      vacas.splice(idx, 1);

      game.inv.meat = (game.inv.meat || 0) + meatGain;
      toast(`Sacrificaste una vaca (peso ~${w.toFixed(1)}) y obtuviste ${meatGain} carne.`);
      renderCorrales();
    });
  });

  // Gallinas: alimentar (sólo si autoFeed NO está activo)
  root.querySelector('#btn-feed-hens')?.addEventListener('click', () => {
    ensureCorralesShape();

    const lvl   = getCoopLevel();
    const house = game.house || {};
    const autoFeedFlag = !!house.coopAutoFeed;
    const autoFeedActive = autoFeedFlag && lvl >= 2;

    if (autoFeedActive) {
      toast('La alimentación automática está activa. Desactívala en el panel del gallinero.');
      return;
    }

    const hens = game.corrales.gallinas.filter(g => g.alive !== false);
    if (!hens.length) {
      toast('No tienes gallinas que alimentar.');
      return;
    }
    let fed = 0;
    hens.forEach(h => {
      if (game.inv.maiz > 0 && !h.fedToday) {
        game.inv.maiz -= 1;
        h.fedToday = true;
        fed++;
		applyMissionEvent("feed", 1);

      }
    });
    if (!fed) {
      toast('No tienes maíz suficiente o ya alimentaste a todas las gallinas.');
      return;
    }
    toast(`Alimentaste ${fed} gallinas.`);
    renderCorrales();
  });

  // Gallinas: recoger huevos manuales
  root.querySelector('#btn-collect-eggs-manual')?.addEventListener('click', () => {
    ensureCorralesShape();
    let total = 0;
    game.corrales.gallinas.forEach(h => {
      if (h.eggs && h.eggs > 0) {
        total += h.eggs;
        h.eggs = 0;
      }
    });

    if (!total) {
      toast('No hay huevos en los nidos.');
      return;
    }
    game.inv.eggs = (game.inv.eggs || 0) + total;
	// ✅ Misiones: recolectar huevos
  applyMissionEvent('collect_egg', total);
    toast(`Recogiste ${total} huevos.`);
    renderCorrales();
  });

  // Gallinas: sacrificar individual
  root.querySelectorAll('.btn-hen-cull').forEach(btn => {
    btn.addEventListener('click', () => {
      ensureCorralesShape();

      const idx = Number(btn.dataset.henIndex);
      const hensAlive = game.corrales.gallinas.filter(g => g.alive !== false);

      if (isNaN(idx) || idx < 0 || idx >= hensAlive.length) {
        toast('No se encontró esa gallina.');
        return;
      }

      const hen = hensAlive[idx];

      // Ubicarla en el array real y removerla
      const realIndex = game.corrales.gallinas.indexOf(hen);
      if (realIndex >= 0) {
        game.corrales.gallinas.splice(realIndex, 1);
      }

      const meatGain = 1;
      game.inv.meat = (game.inv.meat || 0) + meatGain;

      toast(`Sacrificaste una gallina (${hen.age || 0} d) y obtuviste ${meatGain} carne.`);
      renderCorrales();
    });
  });

  // Gallinas: pasar huevos de gallinero al inventario
  root.querySelector('#btn-move-coop-eggs')?.addEventListener('click', () => {
    ensureCorralesShape();
    const coopEggs = game.house.coopEggs || 0;
    if (!coopEggs) {
      toast('El gallinero no tiene huevos almacenados.');
      return;
    }
    game.house.coopEggs = 0;
    game.inv.eggs = (game.inv.eggs || 0) + coopEggs;
	// ✅ Misiones: recolectar huevos desde el depósito
  applyMissionEvent('collect_egg', coopEggs);
    toast(`Trasladaste ${coopEggs} huevos del gallinero al inventario.`);
    renderCorrales();
  });

  // Gallinero: toggle auto-alimentar
  root.querySelector('#btn-toggle-autoFeed')?.addEventListener('click', () => {
    ensureCorralesShape();
    const lvl = getCoopLevel();
    if (lvl < 2) {
      toast('Necesitas gallinero nivel 2 para auto-alimentar.');
      return;
    }
    game.house.coopAutoFeed = !game.house.coopAutoFeed;
    toast(`Auto-alimentar gallinas: ${game.house.coopAutoFeed ? 'ON' : 'OFF'}.`);
    renderCorrales();
  });

  // Gallinero: toggle auto-recolectar huevos
  root.querySelector('#btn-toggle-autoCollect')?.addEventListener('click', () => {
    ensureCorralesShape();
    const lvl = getCoopLevel();
    if (lvl < 3) {
      toast('Necesitas gallinero nivel 3 para auto-recolectar huevos.');
      return;
    }
    game.house.coopAutoCollect = !game.house.coopAutoCollect;
    toast(`Auto-recolección de huevos: ${game.house.coopAutoCollect ? 'ON' : 'OFF'}.`);
    renderCorrales();
  });

  // Gallinero: toggle auto-sacrificar gallinas viejas
  root.querySelector('#btn-toggle-autoCull')?.addEventListener('click', () => {
    ensureCorralesShape();
    const lvl = getCoopLevel();
    if (lvl < 5) {
      toast('Necesitas gallinero nivel 5 para auto-sacrificar gallinas viejas.');
      return;
    }
    game.house.coopAutoCull = !game.house.coopAutoCull;
    toast(`Auto-sacrificio de gallinas viejas: ${game.house.coopAutoCull ? 'ON' : 'OFF'}.`);
    renderCorrales();
  });

  // Gallinero: mejorar nivel
  root.querySelector('#btn-upgrade-coop')?.addEventListener('click', () => {
    ensureCorralesShape();
    const lvl     = getCoopLevel();
    const nextCfg = COOP_LEVELS[lvl + 1];
    if (!nextCfg) {
      toast('El gallinero ya está al máximo nivel.');
      return;
    }
    if (!canPayCost(nextCfg.cost)) {
      toast('No tienes recursos suficientes para mejorar el gallinero.');
      return;
    }
    payCost(nextCfg.cost);
    game.house.coopLevel = lvl + 1;
    toast(`Has mejorado el gallinero a nivel ${lvl + 1}.`);
    renderCorrales();
  });

  // Puercos: alimentar
  root.querySelector('#btn-feed-pigs')?.addEventListener('click', () => {
    ensureCorralesShape();
    const pigs = game.corrales.puercos;
    if (!pigs.length) {
      toast('No tienes puercos que alimentar.');
      return;
    }
    const penInfo = getPigPenInfo();
    const mult = penInfo.weightMult || 1;
    let fed = 0;

    for (const p of pigs) {
      if (game.inv.maiz <= 0) break;
      const currentWeight = p.weight != null ? p.weight : 1;
      if (currentWeight >= MAX_PIG_WEIGHT) continue;

      game.inv.maiz -= 1;
      let delta = 0.9 * mult;
      let newW = currentWeight + delta;
      if (newW > MAX_PIG_WEIGHT) newW = MAX_PIG_WEIGHT;
      p.weight = newW;
      p.fedToday = true;
      fed++;
	  applyMissionEvent("feed", 1);

    }

    if (!fed) {
      toast('No tienes maíz suficiente o tus puercos ya están en el peso máximo.');
      return;
    }
    toast(`Alimentaste ${fed} puerco(s). Están engordando.`);
    renderCorrales();
  });

  // Puercos: sacrificar mejor puerco (el más pesado y sano)
  root.querySelector('#btn-slaughter-pig')?.addEventListener('click', () => {
    ensureCorralesShape();
    if (!game.corrales.puercos.length) {
      toast('No tienes puercos para sacrificar.');
      return;
    }
    const pigs = game.corrales.puercos;
    pigs.sort((a,b)=> (b.weight||0)-(a.weight||0));
    const pig = pigs.shift();
    const weight = pig.weight || 1;
    const health = pig.health != null ? pig.health : 100;
    const filth  = game.pigPenFilth || 0;

    let meatGain = Math.max(1, Math.round(weight * 1.2));
    let prime = 0;

    // carne premium si está gordo, sano y el corral limpio
    if (weight >= 6 && health >= 80 && filth <= 40) {
      prime = 1;
    }

    game.inv.meat = (game.inv.meat || 0) + meatGain;
    if (prime) {
      game.inv.pork_prime = (game.inv.pork_prime || 0) + prime;
    }

    const extra = prime ? ` y ${prime} corte premium 🥓` : '';
    toast(`Sacrificaste un puerco (peso ~${weight.toFixed(1)}) y obtuviste ${meatGain} carne${extra}.`);
    renderCorrales();
  });

  // Comprar animales desde UI
  root.querySelector('#btn-buy-cow-1')?.addEventListener('click', () => buyAnimals('vaca',1));
  root.querySelector('#btn-buy-hen-1')?.addEventListener('click', () => buyAnimals('gallina',1));
  root.querySelector('#btn-buy-hen-3')?.addEventListener('click', () => buyAnimals('gallina',3));
  root.querySelector('#btn-buy-pig-1')?.addEventListener('click', () => buyAnimals('puerco',1));
}

/* =========================
   ⏰ Tick diario de corrales
   ========================= */
export function tickCorrales() {
  ensureCorralesShape();

  const hens   = game.corrales.gallinas.filter(g => g.alive !== false);
  const cows   = game.corrales.vacas;
  const pigs   = game.corrales.puercos;

  const level = getCoopLevel();
  const house = game.house || {};

  const autoFeedFlag    = !!house.coopAutoFeed;
  const autoCollectFlag = !!house.coopAutoCollect;
  const autoCullFlag    = !!house.coopAutoCull;

  const autoFeedActive    = autoFeedFlag    && level >= 2;
  const autoCollectActive = autoCollectFlag && level >= 3;
  const autoCullActive    = autoCullFlag    && level >= 5;

  // 👨‍🌾 Trabajador de corrales (contrato desde la casa)
  const workerDays     = house.ranchWorkerDays || 0;
  const hasRanchWorker = workerDays > 0;
  let pigsFedByWorker  = 0;

  // El trabajador alimenta hasta 4 puercos usando maíz del inventario
  if (hasRanchWorker && pigs.length > 0 && (game.inv.maiz || 0) > 0) {
    for (const p of pigs) {
      if (pigsFedByWorker >= 4) break;
      if (p.fedToday) continue;
      if ((game.inv.maiz || 0) <= 0) break;

      p.fedToday = true;
      p.health = Math.min(100, (p.health || 100) + 5);
      game.inv.maiz -= 1;
      pigsFedByWorker++;
    }
  }

  /* 🐄 VACAS: envejecen, leche, vejez, reproducción */
  let cowsDiedOldAge = 0;
  const newCows = [];

  for (const c of cows) {
    c.age = (c.age || 0) + 1;

    const stageNow = stageLabelCow(c);
    c.stage = stageNow.toLowerCase();

    // sólo hembras adultas/viejas generan leche lista
    const canGiveMilk = (c.sex === 'H') && (stageNow === 'Adulta' || stageNow === 'Vieja');
    c.milkReady = canGiveMilk;

    c.fedToday = false;

    let died = false;
    if (c.age >= 120) {
      let chance = 0.4;
      if (c.age >= 140 && c.age < 160) chance = 0.6;
      else if (c.age >= 160)          chance = 0.8;
      if (Math.random() < chance) {
        died = true;
      }
    }

    if (died) {
      cowsDiedOldAge++;
      const w = c.weight || 3;
      const meatGain = Math.max(1, Math.round(w * 0.5));
      game.inv.meat = (game.inv.meat || 0) + meatGain;
    } else {
      newCows.push(c);
    }
  }

  // Reproducción vacas
  const stableInfo = getStableInfo();
  const cowCap     = stableInfo.capacity;
  let calvesBorn   = 0;

  const hasAdultMale = newCows.some(c =>
    c.sex === 'M' && stageLabelCow(c) === 'Adulta'
  );

  if (hasAdultMale) {
    for (const c of newCows) {
      if (c.sex === 'H' && stageLabelCow(c) === 'Adulta' && !c.pregnant) {
        const chancePreg = 0.05;
        if (Math.random() < chancePreg) {
          c.pregnant = true;
          c.pregnantDays = 0;
        }
      }
    }
  }

  const GESTATION_COW_DAYS = 15;
  for (const c of newCows) {
    if (!c.pregnant) continue;
    c.pregnantDays = (c.pregnantDays || 0) + 1;

    if (c.pregnantDays >= GESTATION_COW_DAYS) {
      if (newCows.length < cowCap) {
        newCows.push({
          age: 0,
          stage: 'joven',
          milkReady: false,
          sex: Math.random() < 0.5 ? 'H' : 'M',
          weight: 3,
          fedToday: false,
          pregnant: false,
          pregnantDays: 0,
          health: 100
        });
        calvesBorn++;
      }
      c.pregnant = false;
      c.pregnantDays = 0;
    }
  }

  game.corrales.vacas = newCows;

    /* 🐔 GALLINAS */

  // ¿Hay al menos un gallo vivo en el gallinero?
  const hasRooster = hens.some(h => h.alive !== false && h.sex === 'M');

    // Ajustar hambre según si comieron o no
  hens.forEach(h => {
    const prev = h.hunger != null ? h.hunger : 100;
    if (!h.fedToday) {
      h.hunger = Math.max(0, prev - 20);
    }
  });

  // 📉 Enfermedades según hambre + rasgos
  hens.forEach(h => {
    if (h.alive === false) return;

    if (h.health == null) h.health = 100;

    const trait = getHenTrait(h);

    // probabilidad base de enfermarse si tiene hambre
    if (!h.sick) {
      let baseChance = 0;
      if (h.hunger < 50) baseChance += 0.04;
      if (h.hunger < 30) baseChance += 0.05;
      if (h.hunger < 15) baseChance += 0.08;

      if (trait && trait.diseaseMult != null) {
        baseChance *= trait.diseaseMult;
      }

      if (baseChance > 0 && Math.random() < baseChance) {
        // se enferma: aleatorio entre parásitos / resfriado
        h.sick = true;
        h.diseaseKey = Math.random() < 0.6 ? 'parasites' : 'flu';
      }
    } else {
      // ya está enferma: pierde vida cada día
      const dis = getHenDisease(h);
      const loss = dis?.healthLoss ?? 3;
      h.health = Math.max(0, (h.health || 100) - loss);

      // si está bien alimentada, tiene chance de curarse sola
      if (h.hunger >= 80 && Math.random() < 0.2) {
        h.sick = false;
        h.diseaseKey = null;
        h.health = Math.min(100, (h.health || 0) + 10);
      }

      // muere si la salud llega a 0
      if (h.health <= 0 && h.alive !== false) {
        h.alive = false;
        game.inv.meat = (game.inv.meat || 0) + 1;
      }
    }
  });


  // Auto-alimentar al amanecer (nivel 2+ y opción activada)
  if (autoFeedActive && hens.length) {
    for (const h of hens) {
      if ((game.inv.maiz || 0) <= 0) break;
      if (h.hunger < 80) {
        game.inv.maiz -= 1;
        h.hunger = 100;
        h.fedToday = true;
      }
    }
  }

    // Envejecer, producir huevos y auto-sacrificio
  for (const h of hens) {
    h.age   = (h.age || 0) + 1;
    h.stage = stageLabelHen(h).toLowerCase();

    const ageVal  = h.age || 0;
    const isHen   = h.sex !== 'M';   // true = hembra
    const isAdult = ageVal >= 8;     // 0–7 = pollito, 8+ = adulta / vieja

        // Huevos: sólo gallinas adultas/viejas, bien alimentadas
    if (h.alive !== false && h.hunger >= 50 && isHen && isAdult) {
      // base: 1 huevo
      let eggsToday = 1;

      // si hay gallo, gallinas adultas ponen 2
      if (hasRooster) {
        eggsToday = 2;
      }

      // genética: rasgo ponedora / delicada / etc.
      const trait = getHenTrait(h);
      if (trait && trait.eggBonus) {
        eggsToday = Math.round(eggsToday * (1 + trait.eggBonus));
      }

      // enfermedad reduce producción
      const dis = getHenDisease(h);
      if (dis && dis.eggMult != null) {
        eggsToday = Math.floor(eggsToday * dis.eggMult);
      }

      if (eggsToday < 0) eggsToday = 0;

      if (autoCollectActive) {
        game.house.coopEggs = (game.house.coopEggs || 0) + eggsToday;
      } else {
        h.eggs = (h.eggs || 0) + eggsToday;
      }
    }


    // Sacrificio auto por vejez
    if (autoCullActive && h.alive !== false && ageVal >= 30) {
      h.alive = false;
      game.inv.meat = (game.inv.meat || 0) + 2;
    }

    // Reset de marca de alimentación para el siguiente día
    h.fedToday = false;
  }


  game.corrales.gallinas = game.corrales.gallinas.filter(g => g.alive !== false);



  /* 🐷 PUERCOS: salud, suciedad, reproducción */
  const penInfo   = getPigPenInfo();
  const pigCap    = penInfo.capacity;

  // suciedad del corral
  let filth = game.pigPenFilth || 0;
  const baseInc = pigs.length ? (5 + pigs.length * 2) : 0;
  filth += Math.max(0, baseInc - (penInfo.filthControl || 0) * 2);

  // limpieza automática del corral (mejoras del corral)
  if (penInfo.autoClean) filth -= 3;

  // el trabajador de corrales también ayuda a limpiar un poco
  if (hasRanchWorker) filth -= 4;

  if (filth < 0) filth = 0;
  if (filth > 100) filth = 100;
  game.pigPenFilth = filth;

  const newPigs = [];
  let pigsDied = 0;

  for (const p of pigs) {
    p.age = (p.age || 0) + 1;
    p.stage = stageLabelPig(p).toLowerCase();

    let health = p.health != null ? p.health : 100;
    const fed = !!p.fedToday;

    if (!fed) health -= 2;          // hambre
    if (filth > 70) health -= 4;    // corral sucio
    if (filth > 90) {
      if (Math.random() < 0.15) {   // infección fuerte
        health = 0;
      }
    }
    if (fed && filth < 40) {
      health += 2; // bien cuidado
    }

    if (health > 100) health = 100;
    if (health < 0)   health = 0;
    p.health = health;
    p.fedToday = false;

    if (health <= 0) {
      pigsDied++;
      const meatGain = 1; // poca carne por muerte triste
      game.inv.meat = (game.inv.meat || 0) + meatGain;
    } else {
      newPigs.push(p);
    }
  }

  // Reproducción de puercos
  let pigletsBorn = 0;
  const hasBoar = newPigs.some(p =>
    p.sex === 'M' && stageLabelPig(p) === 'Listo'
  );

  if (hasBoar) {
    for (const p of newPigs) {
      if (p.sex === 'H' && stageLabelPig(p) === 'Listo' && !p.pregnant) {
        const chancePreg = 0.04; // 4% diario
        if (Math.random() < chancePreg) {
          p.pregnant = true;
          p.pregnantDays = 0;
        }
      }
    }
  }

  const GESTATION_PIG_DAYS = 10;
  for (const p of newPigs) {
    if (!p.pregnant) continue;
    p.pregnantDays = (p.pregnantDays || 0) + 1;

    if (p.pregnantDays >= GESTATION_PIG_DAYS) {
      // camada de 2–4 lechones
      const litterSize = 2 + Math.floor(Math.random() * 3); // 2–4
      for (let i = 0; i < litterSize && newPigs.length < pigCap; i++) {
        newPigs.push({
          age: 0,
          stage: 'lechon',
          weight: 1,
          health: 100,
          sex: Math.random() < 0.5 ? 'H' : 'M',
          fedToday: false,
          pregnant: false,
          pregnantDays: 0
        });
        pigletsBorn++;
      }
      p.pregnant = false;
      p.pregnantDays = 0;
    }
  }

  game.corrales.puercos = newPigs;

  // ⏳ Consumir 1 día de contrato del trabajador de corrales
  if (hasRanchWorker) {
    house.ranchWorkerDays = Math.max(0, workerDays - 1);

    if (pigsFedByWorker > 0) {
      toast(`👨‍🌾 Tu trabajador de corrales alimentó a ${pigsFedByWorker} puerco(s) hoy.`);
    } else {
      toast('👨‍🌾 Tu trabajador de corrales revisó y limpió el corral.');
    }
  }

  // Mensajes de eventos
  if (cowsDiedOldAge > 0) {
    toast(`🐄 ${cowsDiedOldAge} vaca(s) murieron de viejas hoy.`);
  }
  if (calvesBorn > 0) {
    toast(`🐄 Nació ${calvesBorn} ternero(s) en tu establo.`);
  }
  if (pigsDied > 0) {
    toast(`🐷 ${pigsDied} puerco(s) murieron por enfermedad o descuido.`);
  }
  if (pigletsBorn > 0) {
    toast(`🐷 Nacieron ${pigletsBorn} lechones en tu corral.`);
  }
}
