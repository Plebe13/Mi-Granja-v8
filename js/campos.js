// campos.js
import { game, toast, useTool, toolMult, missionEvent, getBuff } from './main.js';

/* =========================
   🧱 Niveles de campos
   ========================= */

const FIELD_LEVELS = {
  1: { 
    name: 'Huerto pequeño',
    plots: 6,
    cost: null
  },
  2: {
    name: 'Huerto ampliado',
    plots: 9,
    cost: { coins: 60, madera: 20 }
  },
  3: {
    name: 'Huerto grande',
    plots: 12,
    cost: { coins: 110, madera: 35, hierro: 5 }
  },
  4: {
    name: 'Huerto maestro',
    plots: 16,
    cost: { coins: 180, madera: 50, hierro: 10, low_gem: 1 }
  }
};

function maxPlotsTotal() {
  return Math.max(...Object.values(FIELD_LEVELS).map(l => l.plots));
}

/* =========================
   💧 Niveles de riego automático
   ========================= */

const IRRIGATION_LEVELS = {
  0: {
    name: 'Sin riego',
    desc: 'No hay automatización, solo riego manual.',
    moistureBonus: 0,
    cost: null
  },
  1: {
    name: 'Barril de agua',
    desc: 'Al amanecer, todas las parcelas ganan +6 humedad.',
    moistureBonus: 6,
    cost: { coins: 40, madera: 15 }
  },
  2: {
    name: 'Pozo simple',
    desc: 'Al amanecer, todas las parcelas ganan +12 humedad.',
    moistureBonus: 12,
    cost: { coins: 90, madera: 25, hierro: 5 }
  },
  3: {
    name: 'Riego por canaletas',
    desc: 'Al amanecer, todas las parcelas ganan +18 humedad (no pasan de 85 solo por riego).',
    moistureBonus: 18,
    cost: { coins: 150, madera: 40, hierro: 10, low_gem: 1 }
  }
};

/* =========================
   🚜 Mejora: Cosecha global
   ========================= */

const HARVEST_UPGRADE = {
  name: 'Carrito agrícola',
  desc: 'Permite cosechar todas las parcelas listas con un solo botón.',
  req: {
    fieldsLevel: 4,
    irrigationLevel: 3
  },
  cost: { coins: 150, madera: 30, hierro: 8, low_gem: 1 }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/* =========================
   🌱 Estado base y helpers
   ========================= */

function ensureFieldState() {
  // Nivel de campos por defecto
  if (!game.fieldsLevel || game.fieldsLevel < 1) {
    game.fieldsLevel = 1;
  }
  const max = maxPlotsTotal();

  if (!Array.isArray(game.campos)) {
    game.campos = [];
  }

  // Aseguramos tamaño máximo del array sin perder cultivos existentes
  if (game.campos.length < max) {
    while (game.campos.length < max) {
      game.campos.push(null);
    }
  } else if (game.campos.length > max) {
    game.campos = game.campos.slice(0, max);
  }

  // Nivel de riego automático por defecto
  if (game.fieldsIrrigationLevel == null || game.fieldsIrrigationLevel < 0) {
    game.fieldsIrrigationLevel = 0;
  }

  // Mejora de cosecha global (boolean)
  if (game.fieldsHarvestAllUnlocked == null) {
    game.fieldsHarvestAllUnlocked = false;
  }

  // Aseguramos forma de cada parcela plantada (fertilidad/humedad)
  for (let i = 0; i < game.campos.length; i++) {
    if (game.campos[i]) {
      ensurePlotShape(i);
    }
  }
}

function ensurePlotShape(idx) {
  const p = game.campos[idx];
  if (!p) return;
  if (p.fertility == null) {
    // Fertilidad base ~60 con pequeña variación
    p.fertility = clamp(60 + Math.floor(Math.random() * 21) - 10, 30, 90);
  }
  if (p.moisture == null) {
    // Humedad base ~50 con pequeña variación
    p.moisture = clamp(50 + Math.floor(Math.random() * 21) - 10, 20, 80);
  }
}

function currentFieldLevel() {
  return game.fieldsLevel || 1;
}

function currentFieldInfo() {
  const lvl = currentFieldLevel();
  return FIELD_LEVELS[lvl] || FIELD_LEVELS[1];
}

function unlockedPlots() {
  // parcelas base según nivel de campos (FIELD_LEVELS)
  const base = currentFieldInfo().plots;

  // bonus por nivel de casa
  const houseLevel = (game.house && game.house.level) ? game.house.level : 1;
  const bonusFromHouse = houseLevel >= 5 ? 3 : 0;  // +3 parcelas desde casa nivel 5

  return base + bonusFromHouse;
}


function nextFieldInfo() {
  const lvl = currentFieldLevel();
  return FIELD_LEVELS[lvl + 1] || null;
}

function currentIrrigationLevel() {
  return game.fieldsIrrigationLevel || 0;
}

function currentIrrigationInfo() {
  const lvl = currentIrrigationLevel();
  return IRRIGATION_LEVELS[lvl] || IRRIGATION_LEVELS[0];
}

function nextIrrigationInfo() {
  const lvl = currentIrrigationLevel();
  return IRRIGATION_LEVELS[lvl + 1] || null;
}

/* =========================
   💰 Helpers de coste
   ========================= */

function canPayCost(cost) {
  if (!cost) return false;
  if (cost.coins && game.coins < cost.coins) return false;
  if (cost.madera && (game.inv.madera || 0) < cost.madera) return false;
  if (cost.hierro && (game.inv.hierro || 0) < cost.hierro) return false;
  if (cost.low_gem && (game.inv.low_gem || 0) < cost.low_gem) return false;
  return true;
}

function payCost(cost) {
  if (!cost) return;
  if (cost.coins)   game.coins       -= cost.coins;
  if (cost.madera)  game.inv.madera  = (game.inv.madera || 0) - cost.madera;
  if (cost.hierro)  game.inv.hierro  = (game.inv.hierro || 0) - cost.hierro;
  if (cost.low_gem) game.inv.low_gem = (game.inv.low_gem || 0) - cost.low_gem;
}

function renderCost(cost) {
  if (!cost) return '—';
  const parts = [];
  if (cost.coins)   parts.push(`💰 ${cost.coins} ₥`);
  if (cost.madera)  parts.push(`🪵 ${cost.madera} madera`);
  if (cost.hierro)  parts.push(`⛏️ ${cost.hierro} hierro`);
  if (cost.low_gem) parts.push(`💠 ${cost.low_gem} gema pequeña`);
  return parts.join(' · ');
}

/* =========================
   ⭐ Calidad de cosecha
   ========================= */

function calcQualityInfo(p) {
  // p.fertility (0–100), p.moisture (0–100)
  const fert = clamp(p.fertility ?? 60, 0, 100);
  const moist = clamp(p.moisture ?? 50, 0, 100);

  // Score base combinando suelo + algo de humedad
  let score = fert * 0.6 + moist * 0.4;
  score += (Math.random() * 30 - 15); // pequeño RNG

  let tier = 'common';
  let label = 'Común';
  let emoji = '⚪';
  let mult = 1.0;

  if (score >= 85) {
    tier = 'gold';
    label = 'Dorada';
    emoji = '🟡';
    mult = 1.9;
  } else if (score >= 65) {
    tier = 'excellent';
    label = 'Excelente';
    emoji = '🟢';
    mult = 1.5;
  } else if (score >= 40) {
    tier = 'good';
    label = 'Buena';
    emoji = '🔵';
    mult = 1.2;
  }

  return { tier, label, emoji, mult, score: Math.round(score) };
}

/* =========================
   ⏰ Tick diario de campos
   ========================= */

export function tickCampos() {
  ensureFieldState();
  const limit = unlockedPlots();
  const irrig = currentIrrigationInfo();
  const irrigBonus = irrig.moistureBonus || 0;

  // 🌿 Riego automático por nivel de casa (perks de Casa)
  // Casa nivel 2: riega automáticamente 2 parcelas al amanecer.
  // Casa nivel 4: riega 3 parcelas.
  // Casa nivel 6+: riega 4 parcelas.
  const houseLevel = game.house?.level || 1;
  let autoWaterPlots = 0;
  if (houseLevel >= 6) {
    autoWaterPlots = 4;
  } else if (houseLevel >= 4) {
    autoWaterPlots = 3;
  } else if (houseLevel >= 2) {
    autoWaterPlots = 2;
  }

  if (autoWaterPlots > 0) {
    const candidates = [];
    for (let i = 0; i < limit; i++) {
      const p = game.campos[i];
      if (!p) continue;
      ensurePlotShape(i);
      candidates.push({ idx: i, moisture: p.moisture ?? 50 });
    }
    // Riega primero las parcelas más secas
    candidates.sort((a, b) => (a.moisture || 0) - (b.moisture || 0));
    for (let j = 0; j < autoWaterPlots && j < candidates.length; j++) {
      const plot = game.campos[candidates[j].idx];
      plot.moisture = clamp((plot.moisture || 0) + 18, 0, 100);
    }
  }

  for (let i = 0; i < limit; i++) {
    const p = game.campos[i];
    if (!p) continue;
    ensurePlotShape(i);

    // Humedad según clima
    if (game.weather.type === 'lluvia') {
      p.moisture = clamp(p.moisture + 18, 0, 100);
    } else if (game.weather.type === 'tormenta') {
      p.moisture = clamp(p.moisture + 10, 0, 100);
    } else {
      // Días normales/secado
      p.moisture = clamp(p.moisture - 8, 0, 100);
    }

    // 💧 Riego automático de infraestructura de campos
    if (irrigBonus > 0) {
      // El riego automático sube humedad pero sin pasar de 85 solo por riego
      const cap = irrigBonus >= 18 ? 85 : 100;
      p.moisture = clamp(p.moisture + irrigBonus, 0, cap);
    }

    // Crecimiento base
    let inc = 1;

    // Azadón mejor ayuda un poquito
    if (Math.random() < 0.25) {
      inc += (toolMult('hoe') - 1) * 0.5;
    }

    // Humedad afecta crecimiento
    if (p.moisture >= 40 && p.moisture <= 80) {
      inc += 1; // humedad ideal
    } else if (p.moisture < 25 || p.moisture > 90) {
      // muy seco o muy encharcado → a veces no crece
      if (Math.random() < 0.4) {
        inc = 0;
      }
    }

    // Lluvia acelera un poco más
    if (game.weather.type === 'lluvia') {
      inc += 0.5;
    }

    // Tormenta a veces frena
    if (game.weather.type === 'tormenta' && Math.random() < 0.15) {
      inc = 0;
    }

    p.stage = Math.min(3, p.stage + inc);
  }
}


/* =========================
   🌾 Sembrar todo (helper)
   ========================= */

function multiPlantAll(crop) {
  ensureFieldState();
  const unlocked = unlockedPlots();
  const max = maxPlotsTotal();
  const seedKey = crop === 'trigo' ? 'seeds_trigo' : 'seeds_maiz';

  let seeds = game.inv[seedKey] || 0;
  if (seeds <= 0) {
    toast('No tienes semillas suficientes.');
    return;
  }

  // Buscar parcelas vacías y desbloqueadas
  const targets = [];
  for (let idx = 0; idx < max; idx++) {
    if (idx >= unlocked) break;
    if (!game.campos[idx]) {
      targets.push(idx);
    }
  }

  if (targets.length === 0) {
    toast('No hay parcelas vacías para sembrar.');
    return;
  }

  const toPlant = Math.min(seeds, targets.length);
  if (toPlant <= 0) {
    toast('No tienes suficientes semillas para sembrar en varias parcelas.');
    return;
  }

  // Usar el azadón UNA sola vez para la acción masiva
  if (!useTool('hoe')) return;

  const baseFertRandom = () => clamp(60 + Math.floor(Math.random() * 21) - 10, 30, 90);
  const baseMoistRandom = () => clamp(50 + Math.floor(Math.random() * 21) - 10, 20, 80);

  for (let i = 0; i < toPlant; i++) {
    const idx = targets[i];
    game.campos[idx] = {
      crop,
      stage: 0,
      fertility: baseFertRandom(),
      moisture: baseMoistRandom()
    };
  }

  game.inv[seedKey] = (game.inv[seedKey] || 0) - toPlant;

  // Gasta tiempo del día por la acción masiva
  game.minutes += 60;

  missionEvent('plant', toPlant);
  toast(`Sembraste ${toPlant} parcelas de ${crop}.`);
  renderCampos();
}

/* =========================
   🚜 Cosechar todo (helper)
   ========================= */

function multiHarvestAll() {
  ensureFieldState();

  if (!game.fieldsHarvestAllUnlocked) {
    toast('Aún no has desbloqueado la mejora de cosecha global.');
    return;
  }

  const unlocked = unlockedPlots();
  const max = maxPlotsTotal();

  const targets = [];
  for (let idx = 0; idx < max; idx++) {
    if (idx >= unlocked) break;
    const p = game.campos[idx];
    if (p && p.stage >= 3) {
      targets.push(idx);
    }
  }

  if (targets.length === 0) {
    toast('No hay parcelas listas para cosechar.');
    return;
  }

  // Usar el azadón UNA sola vez
  if (!useTool('hoe')) return;

  let totalTrigo = 0;
  let totalMaiz = 0;
  let totalAmount = 0;

  let countGold = 0;
  let countExcellent = 0;
  let countGood = 0;
  let countCommon = 0;

  for (const idx of targets) {
    const p = game.campos[idx];
    if (!p || p.stage < 3) continue;

    const k = p.crop;

    // Cantidad base según herramienta
    let amount = Math.max(1, Math.floor(3 * toolMult('hoe')));

    // Buff de cosecha
    const hb = getBuff('harvestBoost') || 0;
    if (hb > 0) {
      amount = Math.max(1, Math.floor(amount * (1 + hb)));
    }

    // Calidad según suelo
    const q = calcQualityInfo(p);
    amount = Math.max(1, Math.floor(amount * q.mult));

    // Sumar por tipo
    if (k === 'trigo') totalTrigo += amount;
    if (k === 'maiz')  totalMaiz  += amount;
    totalAmount += amount;

    // Contadores de calidad
    if (q.tier === 'gold') countGold++;
    else if (q.tier === 'excellent') countExcellent++;
    else if (q.tier === 'good') countGood++;
    else countCommon++;

    // Limpiar parcela
    game.campos[idx] = null;
  }

  if (totalAmount <= 0) {
    toast('No se obtuvo cosecha.');
    renderCampos();
    return;
  }

  // Aplicar al inventario
  if (totalTrigo > 0) {
    game.inv.trigo = (game.inv.trigo || 0) + totalTrigo;
  }
  if (totalMaiz > 0) {
    game.inv.maiz = (game.inv.maiz || 0) + totalMaiz;
  }

  // Gasta tiempo del día
  game.minutes += 45;

  // Misiones
  missionEvent('harvest', totalAmount);

  // Mensaje resumen
  let cropsPart = [];
  if (totalTrigo > 0) cropsPart.push(`+${totalTrigo} trigo`);
  if (totalMaiz  > 0) cropsPart.push(`+${totalMaiz} maíz`);
  const cropsText = cropsPart.join(' · ');

  let qualityParts = [];
  if (countGold > 0)      qualityParts.push(`${countGold} doradas`);
  if (countExcellent > 0) qualityParts.push(`${countExcellent} excelentes`);
  if (countGood > 0)      qualityParts.push(`${countGood} buenas`);
  if (countCommon > 0 && qualityParts.length === 0) {
    qualityParts.push(`${countCommon} comunes`);
  }
  const qualityText = qualityParts.join(' • ');

  toast(`🚜 Recolectaste ${targets.length} parcelas: ${cropsText}. Calidad: ${qualityText}.`);

  renderCampos();
}

/* =========================
   🎨 Render de campos
   ========================= */

export function renderCampos() {
  ensureFieldState();

  const el = document.getElementById('campos');
  if (!el) return;

  const lvl  = currentFieldLevel();
  const info = currentFieldInfo();
  const next = nextFieldInfo();
  const unlocked = info.plots;
  const max = maxPlotsTotal();

  const irrLvl  = currentIrrigationLevel();
  const irrInfo = currentIrrigationInfo();
  const irrNext = nextIrrigationInfo();

  const colsClass = max > 9 ? 'grid cols-4' : 'grid cols-3';

  const seedsTrigo = game.inv.seeds_trigo || 0;
  const seedsMaiz  = game.inv.seeds_maiz  || 0;

  const harvestAllUnlocked = !!game.fieldsHarvestAllUnlocked;
  const harvestReqOk = (
    lvl >= HARVEST_UPGRADE.req.fieldsLevel &&
    irrLvl >= HARVEST_UPGRADE.req.irrigationLevel
  );
  const harvestCostOk = canPayCost(HARVEST_UPGRADE.cost);

  // 🧾 Card de resumen de campos + botón de mejora
  let header = `
    <h2 class="title">Campos de cultivo</h2>

    <div class="card" style="margin-bottom:14px">
      <div class="row space">
        <div>
          <h3 style="margin:0 0 4px 0">🌾 Estado del huerto</h3>
          <p class="kv">
            Nivel actual: <strong>${info.name}</strong> (nivel ${lvl})
          </p>
          <p class="kv">
            Parcelas desbloqueadas: <strong>${unlocked}</strong> / ${max}
          </p>
        </div>
        <div style="text-align:right">
  `;

  if (next) {
    header += `
          <p class="kv" style="justify-content:flex-end">
            Próxima mejora: <strong>${next.name}</strong>
          </p>
          <p class="kv" style="justify-content:flex-end;font-size:.9rem">
            Coste: ${renderCost(next.cost)}
          </p>
          <button class="btn small" id="btn-upgrade-fields" ${!canPayCost(next.cost) ? 'disabled' : ''}>
            Mejorar campos
          </button>
    `;
  } else {
    header += `
          <p class="kv" style="justify-content:flex-end">
            Tus campos ya están al máximo nivel.
          </p>
    `;
  }

  header += `
        </div>
      </div>

      <hr class="sep" style="margin:10px 0"/>

      <div class="row space">
        <div>
          <h3 style="margin:0 0 4px 0">💧 Riego automático</h3>
          <p class="kv">
            Estado: <strong>${irrInfo.name}</strong> (nivel ${irrLvl}) 
          </p>
          <p class="kv" style="font-size:.9rem">
            ${irrInfo.desc}
          </p>
        </div>
        <div style="text-align:right">
  `;

  if (irrNext) {
    header += `
          <p class="kv" style="justify-content:flex-end">
            Siguiente nivel: <strong>${irrNext.name}</strong>
          </p>
          <p class="kv" style="justify-content:flex-end;font-size:.9rem">
            Coste: ${renderCost(irrNext.cost)}
          </p>
          <button class="btn small" id="btn-upgrade-irrigation" ${!canPayCost(irrNext.cost) ? 'disabled' : ''}>
            Mejorar riego
          </button>
    `;
  } else {
    header += `
          <p class="kv" style="justify-content:flex-end">
            Tu sistema de riego ya está al máximo nivel.
          </p>
    `;
  }

  header += `
        </div>
      </div>

      <p class="kv" style="margin-top:6px;font-size:.85rem">
        Consejo: Mantén la <strong>humedad</strong> entre 40 y 80 regando las parcelas. 
        El riego automático ayuda a mantenerlas estables, pero puedes reforzar con riego manual.
      </p>
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3 style="margin:0 0 6px 0">⚙️ Mejora: ${HARVEST_UPGRADE.name}</h3>
      <p class="kv" style="font-size:.9rem">
        ${HARVEST_UPGRADE.desc}
      </p>
  `;

  if (harvestAllUnlocked) {
    header += `
      <p class="kv" style="font-size:.85rem;color:#6f6">
        ✅ Mejora activa: ya puedes usar "Cosechar todo".
      </p>
    `;
  } else {
    header += `
      <p class="kv" style="font-size:.85rem">
        Requisitos: Campos nivel ${HARVEST_UPGRADE.req.fieldsLevel}, 
        riego nivel ${HARVEST_UPGRADE.req.irrigationLevel}.
      </p>
      <p class="kv" style="font-size:.85rem">
        Coste: ${renderCost(HARVEST_UPGRADE.cost)}
      </p>
      <button class="btn small" id="btn-buy-harvest-upgrade"
        ${(!harvestReqOk || !harvestCostOk) ? 'disabled' : ''}>
        Comprar mejora
      </button>
    `;
  }

  header += `
    </div>

    <div class="card" style="margin-bottom:14px">
      <h3 style="margin:0 0 6px 0">⚙️ Acciones avanzadas</h3>
      <p class="kv" style="font-size:.9rem">
        Siembra rápida y cosecha masiva.
      </p>
      <div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap">
        <button class="btn small" data-plantall="trigo" ${seedsTrigo <= 0 ? 'disabled' : ''}>
          🌾 Sembrar todo trigo (${seedsTrigo})
        </button>
        <button class="btn small" data-plantall="maiz" ${seedsMaiz <= 0 ? 'disabled' : ''}>
          🌽 Sembrar todo maíz (${seedsMaiz})
        </button>
        <button class="btn small" data-harvestall
          ${!harvestAllUnlocked ? 'disabled' : ''}>
          🚜 Cosechar todo
        </button>
      </div>
      <p class="kv" style="margin-top:4px;font-size:.8rem">
        Estas acciones usan el azadón una sola vez y consumen tiempo del día.
      </p>
    </div>
  `;

  // 🧩 Grid de parcelas (activas + bloqueadas)
  let grid = `<div class="${colsClass}">`;

  for (let idx = 0; idx < max; idx++) {
    const p = game.campos[idx];
    const isUnlocked = idx < unlocked;

    if (!isUnlocked) {
      // 🔒 Parcela bloqueada
      grid += `
        <div class="card" style="opacity:.45;border-style:dashed;text-align:center">
          <h3>🔒 Parcela bloqueada</h3>
          <p class="kv" style="justify-content:center;font-size:.9rem">
            Mejora tus campos para usar más parcelas.
          </p>
        </div>
      `;
      continue;
    }

    if (!p) {
      // Parcela vacía → se puede plantar
      grid += `
        <div class="card">
          <h3>Parcela ${idx + 1}</h3>
          <div class="row space">
            <button class="btn small" data-plant="trigo" data-idx="${idx}">Plantar 🌾</button>
            <button class="btn small" data-plant="maiz"  data-idx="${idx}">Plantar 🌽</button>
          </div>
        </div>
      `;
    } else {
      ensurePlotShape(idx);
      const stages = ['Semilla', 'Brote', 'Creciendo', 'Listo'];
      const emoji = p.crop === 'trigo' ? '🌾' : '🌽';
      const stageLabel = stages[Math.floor(clamp(p.stage, 0, 3))];

      const fert = clamp(p.fertility, 0, 100);
      const moist = clamp(p.moisture, 0, 100);

      grid += `
        <div class="card">
          <h3>${emoji} ${p.crop.toUpperCase()}</h3>
          <p class="kv">Etapa: ${stageLabel}</p>

          <div class="row space" style="gap:6px;font-size:.8rem;margin-top:4px">
            <span>Fertilidad: <strong>${fert}</strong></span>
            <span>Humedad: <strong>${moist}</strong></span>
          </div>

          <div class="row space" style="margin-top:8px; gap:6px">
            <button class="btn small" data-harvest="${idx}" ${p.stage < 3 ? 'disabled' : ''}>Cosechar</button>
            <button class="btn ghost small" data-water="${idx}">Regar 💧</button>
            <button class="btn ghost small" data-clear="${idx}">Quitar</button>
          </div>
        </div>
      `;
    }
  }

  grid += '</div>';

  el.innerHTML = header + grid;

  /* =========================
     🌱 Eventos de UI
     ========================= */

  // Mejorar campos
  const btnUp = document.getElementById('btn-upgrade-fields');
  if (btnUp && next) {
    btnUp.onclick = () => {
      if (!canPayCost(next.cost)) {
        toast('No cumples el coste para mejorar los campos.');
        return;
      }
      payCost(next.cost);
      game.fieldsLevel = lvl + 1;
      toast(`Has mejorado tus campos a: ${next.name}.`);
      renderCampos();
    };
  }

  // Mejorar riego
  const btnIrr = document.getElementById('btn-upgrade-irrigation');
  if (btnIrr && irrNext) {
    btnIrr.onclick = () => {
      if (!canPayCost(irrNext.cost)) {
        toast('No cumples el coste para mejorar el riego.');
        return;
      }
      payCost(irrNext.cost);
      game.fieldsIrrigationLevel = irrLvl + 1;
      toast(`Has mejorado tu sistema de riego a: ${irrNext.name}.`);
      renderCampos();
    };
  }

  // Comprar mejora de cosecha global
  const btnHarvestUp = document.getElementById('btn-buy-harvest-upgrade');
  if (btnHarvestUp && !harvestAllUnlocked) {
    btnHarvestUp.onclick = () => {
      if (!harvestReqOk) {
        toast('No cumples los requisitos de nivel de campos y riego.');
        return;
      }
      if (!canPayCost(HARVEST_UPGRADE.cost)) {
        toast('No tienes recursos suficientes para la mejora.');
        return;
      }
      payCost(HARVEST_UPGRADE.cost);
      game.fieldsHarvestAllUnlocked = true;
      toast('Has desbloqueado el Carrito agrícola. ¡Ahora puedes usar "Cosechar todo"!');
      renderCampos();
    };
  }

  // Sembrar todo (acción avanzada)
  el.querySelectorAll('[data-plantall]').forEach(b => {
    b.onclick = () => {
      const crop = b.dataset.plantall;
      multiPlantAll(crop);
    };
  });

  // Cosechar todo (acción avanzada)
  const btnHarvestAll = el.querySelector('[data-harvestall]');
  if (btnHarvestAll) {
    btnHarvestAll.onclick = () => {
      multiHarvestAll();
    };
  }

  // Plantar individual
  el.querySelectorAll('[data-plant]').forEach(b => {
    b.onclick = () => {
      if (!useTool('hoe')) return;
      const crop = b.dataset.plant;
      const idx = +b.dataset.idx;

      if (idx >= unlockedPlots()) {
        toast('Esta parcela está bloqueada.');
        return;
      }

      const seedKey = crop === 'trigo' ? 'seeds_trigo' : 'seeds_maiz';
      if ((game.inv[seedKey] || 0) <= 0) {
        toast('No tienes semillas');
        return;
      }

      game.inv[seedKey] -= 1;

      // Nuevo suelo inicial para la parcela
      const baseFert = clamp(60 + Math.floor(Math.random() * 21) - 10, 30, 90);
      const baseMoist = clamp(50 + Math.floor(Math.random() * 21) - 10, 20, 80);

      game.campos[idx] = { crop, stage: 0, fertility: baseFert, moisture: baseMoist };
      toast(`Sembraste ${crop}`);
      missionEvent('plant', 1);
      renderCampos();
    };
  });

  // Cosechar individual
  el.querySelectorAll('[data-harvest]').forEach(b => {
    b.onclick = () => {
      if (!useTool('hoe')) return;
      const idx = +b.dataset.harvest;

      if (idx >= unlockedPlots()) {
        toast('Esta parcela está bloqueada.');
        return;
      }

      const p = game.campos[idx];
      if (p && p.stage >= 3) {
        const k = p.crop;

        // Cantidad base según herramienta
        let amount = Math.max(1, Math.floor(3 * toolMult('hoe')));

        // Buff de cosecha
        const hb = getBuff('harvestBoost') || 0;
        if (hb > 0) {
          amount = Math.max(1, Math.floor(amount * (1 + hb)));
        }

        // Calidad según suelo
        const q = calcQualityInfo(p);
        amount = Math.max(1, Math.floor(amount * q.mult));

        game.inv[k] = (game.inv[k] || 0) + amount;
        game.campos[idx] = null;

        toast(`Cosecha ${q.emoji} ${q.label}: +${amount} ${k}`);
        missionEvent('harvest', amount);
        renderCampos();
      }
    };
  });

  // Regar manual
  el.querySelectorAll('[data-water]').forEach(b => {
    b.onclick = () => {
      const idx = +b.dataset.water;

      if (idx >= unlockedPlots()) {
        toast('Esta parcela está bloqueada.');
        return;
      }

      const p = game.campos[idx];
      if (!p) {
        toast('No hay nada plantado aquí.');
        return;
      }

      ensurePlotShape(idx);

      // Regar sube bastante la humedad, pero no pasa de 100
      const before = p.moisture;
      p.moisture = clamp(p.moisture + 25, 0, 100);

      // Pequeño efecto en fertilidad a largo plazo (como cuidar el suelo)
      if (Math.random() < 0.4) {
        p.fertility = clamp(p.fertility + 1, 0, 100);
      }

      // Regar consume un poco de tiempo del día
      game.minutes += 30;

      const delta = p.moisture - before;
      toast(`Regaste la parcela. Humedad +${delta}.`);
      renderCampos();
    };
  });

  // Quitar cultivo
  el.querySelectorAll('[data-clear]').forEach(b => {
    b.onclick = () => {
      const idx = +b.dataset.clear;
      if (idx >= unlockedPlots()) {
        toast('Esta parcela está bloqueada.');
        return;
      }
      game.campos[idx] = null;
      renderCampos();
    };
  });
}
