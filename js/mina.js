// mina.js
import { game, toast, useTool, toolMult, missionEvent, getBuff } from './main.js';

/* =========================
   📊 Stats para trofeos
   ========================= */

function ensureStats() {
  if (!game.stats) game.stats = {};
  const s = game.stats;

  // acumulados
  if (s.treesCut == null)             s.treesCut = 0;
  if (s.rocksMined == null)           s.rocksMined = 0;
  if (s.animalsSold == null)          s.animalsSold = 0;
  if (s.totalGoldEarned == null)      s.totalGoldEarned = 0;
  if (s.forestBeastsDefeated == null) s.forestBeastsDefeated = 0;
  if (s.rareGemsFound == null)        s.rareGemsFound = 0;
  if (s.fatAnimalsSold == null)       s.fatAnimalsSold = 0;
  if (s.tradeDealsDone == null)       s.tradeDealsDone = 0;
  if (s.maxSingleDaySales == null)    s.maxSingleDaySales = 0;

  // contadores diarios (para récords)
  if (s.goldToday == null)            s.goldToday = 0;
  if (s.treesToday == null)           s.treesToday = 0;
  if (s.rocksToday == null)           s.rocksToday = 0;
  if (s.bestTreesCutInDay == null)    s.bestTreesCutInDay = 0;
  if (s.bestRocksMinedInDay == null)  s.bestRocksMinedInDay = 0;
}

/* =========================
   ⛏️ Estado base de la mina
   ========================= */

function ensureMineState() {
  if (!game.mineLevel) game.mineLevel = 1;

  // Fatiga por día
  if (game.lastMiningDay == null) game.lastMiningDay = game.day || 1;
  if (game.day !== game.lastMiningDay) {
    game.lastMiningDay = game.day;
    game.miningFatigue = 0;
    game.mineCollapsedUsedDay = false;
  }
  if (game.miningFatigue == null) game.miningFatigue = 0;

  // XP / Nivel de minero
  if (game.miningXP == null) game.miningXP = 0;
  if (game.miningLevel == null) game.miningLevel = 1;

  // Equipo minero
  if (!game.miningGear) {
    game.miningGear = {
      helmet: false,   // Casco
      lantern: false,  // Linterna
      gloves: false,   // Guantes
      cart: false      // Carretilla
    };
  }

  // Mejoras internas de la mina
  if (!game.mineUpgrades) {
    game.mineUpgrades = {
      beams: 0,        // Refuerzo vigas
      ventilation: 0,  // Ventilación
      signage: 0       // Señalización
    };
  }

  // Zona de minería
  if (!game.mineZone) game.mineZone = 'balanced'; // balanced, stone, coal, gems

  // Modo de minería (fuerte, preciso, rápido, normal)
  if (!game.miningMode) game.miningMode = 'normal';

  // Cueva colapsada por día
  if (game.mineCollapsedUsedDay == null) game.mineCollapsedUsedDay = false;

  // Contrato minero
  if (!game.miningContract) {
    createNewMiningContract();
  }
}

/* =========================
   ⛏️ NIVELES DE LA MINA
   ========================= */
// Misma estructura base extendida con piedra/carbón/eventos
const MINE_LEVELS = {
  1: {
    name: 'Galería superficial',
    desc: 'Hierro sencillo, algo de piedra y casi nada de carbón o gemas.',
    timeCost: 90,
    ironMult: 1.0,
    gemChance: 0.00,
    goodEventChance: 0.06,
    badEventChance: 0.03,
    stoneMin: 1,
    stoneMax: 2,
    coalChance: 0.00,
    coalMin: 0,
    coalMax: 0,
    cost: null
  },
  2: {
    name: 'Túneles intermedios',
    desc: 'Más hierro, buena piedra y algo de carbón, gemas ocasionales.',
    timeCost: 110,
    ironMult: 1.3,
    gemChance: 0.03,
    goodEventChance: 0.10,
    badEventChance: 0.06,
    stoneMin: 2,
    stoneMax: 3,
    coalChance: 0.10,
    coalMin: 1,
    coalMax: 2,
    cost: { coins: 80, madera: 10, hierro: 8 }
  },
  3: {
    name: 'Caverna profunda',
    desc: 'Buenos filones de hierro, mucha piedra, carbón frecuente y más gemas.',
    timeCost: 130,
    ironMult: 1.6,
    gemChance: 0.07,
    goodEventChance: 0.14,
    badEventChance: 0.09,
    stoneMin: 3,
    stoneMax: 4,
    coalChance: 0.20,
    coalMin: 1,
    coalMax: 2,
    cost: { coins: 140, madera: 20, hierro: 16, low_gem: 1 }
  },
  4: {
    name: 'Abismo antiguo',
    desc: 'Mucho hierro, piedra dura, carbón abundante y buenas gemas.',
    timeCost: 150,
    ironMult: 2.0,
    gemChance: 0.12,
    goodEventChance: 0.18,
    badEventChance: 0.14,
    stoneMin: 3,
    stoneMax: 5,
    coalChance: 0.35,
    coalMin: 1,
    coalMax: 3,
    cost: { coins: 220, madera: 30, hierro: 25, low_gem: 2 }
  }
};

function getMineLevel() {
  ensureMineState();
  return game.mineLevel || 1;
}
function setMineLevel(lvl) {
  game.mineLevel = lvl;
}
function getMineInfo() {
  const lvl = getMineLevel();
  return MINE_LEVELS[lvl] || MINE_LEVELS[1];
}
function getNextMineInfo() {
  const lvl = getMineLevel();
  return MINE_LEVELS[lvl + 1] || null;
}

/* =========================
   💰 Helpers de coste
   ========================= */

function canPayCost(cost) {
  if (!cost) return false;
  if (cost.coins   && game.coins < cost.coins) return false;
  if (cost.madera  && (game.inv.madera  || 0) < cost.madera) return false;
  if (cost.hierro  && (game.inv.hierro  || 0) < cost.hierro) return false;
  if (cost.low_gem && (game.inv.low_gem || 0) < cost.low_gem) return false;
  return true;
}

function payCost(cost) {
  if (!cost) return;
  if (cost.coins)   game.coins       -= cost.coins;
  if (cost.madera)  game.inv.madera  = (game.inv.madera  || 0) - cost.madera;
  if (cost.hierro)  game.inv.hierro  = (game.inv.hierro  || 0) - cost.hierro;
  if (cost.low_gem) game.inv.low_gem = (game.inv.low_gem || 0) - cost.low_gem;
}

function renderCost(cost) {
  if (!cost) return '—';
  const parts = [];
  if (cost.coins)   parts.push(`💰 ${cost.coins} ₥`);
  if (cost.madera)  parts.push(`🪵 ${cost.madera} madera`);
  if (cost.hierro)  parts.push(`⛏️ ${cost.hierro} hierro`);
  if (cost.low_gem) parts.push(`💠 ${cost.low_gem} gemas pequeñas`);
  return parts.join(' · ');
}

/* =========================
   📈 XP y Nivel de minero
   ========================= */

function addMiningXP(xp) {
  if (xp <= 0) return;
  game.miningXP += xp;
  // Curva simple: cada nivel requiere 40 + 20 * (nivel-1)
  const maxLevel = 10;
  while (game.miningLevel < maxLevel) {
    const needed = 40 + 20 * (game.miningLevel - 1);
    if (game.miningXP >= needed) {
      game.miningXP -= needed;
      game.miningLevel += 1;
      toast(`Has subido a nivel de minero ${game.miningLevel}.`);
    } else break;
  }
}

function miningLevelBonus() {
  const lvl = game.miningLevel || 1;
  // Bonus simple: +2% hierro por nivel, +1% carbón por nivel, -1% tiempo cada 3 niveles
  const ironBonus = 0.02 * (lvl - 1);
  const coalBonus = 0.01 * (lvl - 1);
  const timeMult  = 1 - 0.01 * Math.floor((lvl - 1) / 3);
  return { ironBonus, coalBonus, timeMult: Math.max(0.85, timeMult) };
}

/* =========================
   😓 Fatiga del minero
   ========================= */

function getFatigueMult() {
  const a = game.miningFatigue || 0;
  if (a >= 7) return 0.6;
  if (a >= 5) return 0.8;
  if (a >= 3) return 0.9;
  return 1.0;
}
function getFatigueEventBonusBad() {
  const a = game.miningFatigue || 0;
  if (a >= 7) return 0.10;
  if (a >= 5) return 0.05;
  if (a >= 3) return 0.02;
  return 0;
}

/* =========================
   🛠️ Equipo minero
   ========================= */
/*
  Casco: menos eventos malos
  Linterna: -15% tiempo y +10% carbón
  Guantes: +20% piedra
  Carretilla: +40% hierro extra en filones buenos
*/

const GEAR_COST = {
  helmet:   { coins: 40, hierro: 8 },
  lantern:  { coins: 35, hierro: 4 },
  gloves:   { coins: 30, hierro: 4 },
  cart:     { coins: 60, madera: 10, hierro: 8 }
};

function buyGear(key) {
  ensureMineState();
  if (game.miningGear[key]) {
    toast('Ya tienes este equipo.');
    return;
  }
  const cost = GEAR_COST[key];
  if (!canPayCost(cost)) {
    toast('No tienes recursos suficientes para este equipo.');
    return;
  }
  payCost(cost);
  game.miningGear[key] = true;
  toast('Has adquirido nuevo equipo minero.');
  renderMina();
}

/* =========================
   🔧 Mejoras internas
   ========================= */
/*
  beams: -10% eventos malos por nivel
  ventilation: -5% tiempo por nivel
  signage: +5% eventos buenos por nivel
*/

const UPGRADE_COST = {
  beams:      { coins: 60, madera: 12, hierro: 8 },
  ventilation:{ coins: 50, madera: 8, hierro: 6 },
  signage:    { coins: 40, madera: 6, hierro: 4 }
};

function upgradeMineInternal(key) {
  ensureMineState();
  const lvl = game.mineUpgrades[key] || 0;
  const max = 3;
  if (lvl >= max) {
    toast('Esta mejora ya está al máximo nivel.');
    return;
  }
  const cost = UPGRADE_COST[key];
  if (!canPayCost(cost)) {
    toast('No tienes recursos suficientes para esta mejora.');
    return;
  }
  payCost(cost);
  game.mineUpgrades[key] = lvl + 1;
  toast('Has mejorado la infraestructura de la mina.');
  renderMina();
}

/* =========================
   🪨 Zonas & modos de minería
   ========================= */

function setMineZone(zone) {
  game.mineZone = zone;
  toast(`Zona de minería: ${zoneLabel(zone)}.`);
  renderMina();
}

function setMiningMode(mode) {
  game.miningMode = mode;
  toast(`Modo de minería: ${modeLabel(mode)}.`);
  renderMina();
}

function zoneLabel(z) {
  return ({
    balanced: 'Equilibrada',
    stone:    'Roca (más piedra)',
    coal:     'Carbón (más carbón)',
    gems:     'Gemas (más gemas)'
  })[z] || z;
}

function modeLabel(m) {
  return ({
    normal: 'Normal',
    strong: 'Fuerte',
    precise:'Preciso',
    fast:   'Rápido'
  })[m] || m;
}

/* =========================
   🍂 Estaciones (si existen)
   ========================= */

function getSeasonEffects() {
  const season = game.season || 'primavera';
  // No rompemos nada si no usas estaciones: primavera = neutro
  switch (season) {
    case 'verano':
      return { timeMult: 1.10, ironMult: 1.0, stoneMult: 1.0, coalMult: 1.0, gemMult: 1.0 };
    case 'invierno':
      return { timeMult: 1.0, ironMult: 1.0, stoneMult: 1.20, coalMult: 1.05, gemMult: 1.10 };
    case 'otoño':
      return { timeMult: 1.0, ironMult: 1.0, stoneMult: 1.05, coalMult: 1.0, gemMult: 1.0 };
    case 'primavera':
    default:
      return { timeMult: 1.0, ironMult: 1.0, stoneMult: 1.0, coalMult: 1.10, gemMult: 1.05 };
  }
}

/* =========================
   🎲 Eventos aleatorios
   ========================= */

function rollMineEvent(baseGain, levelInfo) {
  ensureMineState();
  const lvl = getMineLevel();
  const fatBad   = getFatigueEventBonusBad();
  const upgBeams = game.mineUpgrades.beams || 0;
  const upgSign  = game.mineUpgrades.signage || 0;

  // Ajustamos por mejoras y fatiga
  let goodChance = (levelInfo.goodEventChance || 0) + 0.05 * upgSign;
  let badChance  = (levelInfo.badEventChance  || 0) + fatBad - 0.10 * upgBeams;
  goodChance = Math.max(0, goodChance);
  badChance  = Math.max(0, badChance);

  const total = goodChance + badChance;
  if (total <= 0) {
    return { extraIron: 0, extraGems: 0, extraMinutes: 0, flavor: '' };
  }

  const r = Math.random() * total;
  const isGood = r < goodChance;

  if (isGood) {
    const pick = Math.random();
    if (pick < 0.5) {
      // Filón rico de hierro (carretilla mejora aún más)
      const baseMult = 1.0 + 0.5 * lvl;
      const cartBonus = game.miningGear.cart ? 1.4 : 1.0;
      const extraIron = Math.max(1, Math.floor(baseGain * baseMult * cartBonus));
      return {
        extraIron,
        extraGems: 0,
        extraMinutes: 0,
        flavor: `Además descubres un filón rico y extraes +${extraIron} hierro extra.`
      };
    } else {
      // Bolsillo de gemas pequeñas
      const gems = 1 + Math.floor(Math.random() * (1 + lvl));
      return {
        extraIron: 0,
        extraGems: gems,
        extraMinutes: 0,
        flavor: `Entre las rocas encuentras un pequeño bolsillo de gemas 💠 (+${gems}).`
      };
    }
  } else {
    const pick = Math.random();
    if (pick < 0.6) {
      // Derrumbe leve → tiempo extra (casco reduce impacto)
      let extraMinutes = 20 + 10 * lvl;
      if (game.miningGear.helmet) extraMinutes = Math.floor(extraMinutes * 0.7);
      return {
        extraIron: 0,
        extraGems: 0,
        extraMinutes,
        flavor: `Ocurre un pequeño derrumbe y te toma ${extraMinutes} minutos despejar el camino...`
      };
    } else {
      // Roca muy dura → pierdes parte del hierro
      const lost = Math.max(1, Math.floor(baseGain * 0.4));
      return {
        extraIron: -lost,
        extraGems: 0,
        extraMinutes: 0,
        flavor: `La roca está muy dura y pierdes parte del mineral (-${lost} hierro).`
      };
    }
  }
}

/* =========================
   📜 Contrato minero
   ========================= */

function createNewMiningContract() {
  const options = [
    { key: 'hierro',  label: 'hierro',  icon: '⛏️' },
    { key: 'piedra',  label: 'piedra',  icon: '🪨' },
    { key: 'carbon',  label: 'carbón',  icon: '🪵' },
    { key: 'low_gem', label: 'gemas',   icon: '💠' }
  ];
  const pick = options[Math.floor(Math.random() * options.length)];
  const base = 15 + (game.miningLevel || 1) * 5;
  const qty = randomInt(base, base + 10);

  game.miningContract = {
    resource: pick.key,
    label: pick.label,
    icon: pick.icon,
    goal: qty,
    progress: 0,
    rewardCoins: 40 + 8 * (game.miningLevel || 1),
    rewardGems: pick.key === 'low_gem' ? 1 : 0,
    done: false,
    claimed: false
  };
}

function updateMiningContractFromGain(gains) {
  const c = game.miningContract;
  if (!c || c.done) return;
  const add = gains[c.resource] || 0;
  if (!add) return;
  c.progress = Math.min(c.goal, c.progress + add);
  if (c.progress >= c.goal) {
    c.done = true;
    toast('Has completado el contrato minero. Ve a reclamar tu recompensa.');
  }
}

function claimMiningContract() {
  const c = game.miningContract;
  if (!c || !c.done || c.claimed) return;
  ensureStats();
  game.coins += c.rewardCoins;
  if (c.rewardGems) {
    game.inv.low_gem = (game.inv.low_gem || 0) + c.rewardGems;
  }
  c.claimed = true;

  // (opcional) podrías sumar a totalGoldEarned/goldToday aquí si quieres
  toast(
    `Recompensa del contrato: +${c.rewardCoins} ₥` +
    (c.rewardGems ? ` y +${c.rewardGems} gemas 💠.` : '.')
  );
}

/* =========================
   🕳️ Cueva colapsada diaria
   ========================= */

function handleCollapsedCave() {
  ensureMineState();
  ensureStats();
  const info = getMineInfo();
  const baseTime = info.timeCost || 120;
  const addedTime = baseTime * 2;

  if (game.mineCollapsedUsedDay) {
    toast('Ya exploraste la cueva colapsada hoy.');
    return;
  }
  if (game.minutes >= 24 * 60 - addedTime) {
    toast('No queda suficiente día para explorar la cueva colapsada.');
    return;
  }

  // Recompensa fija y fuerte, normalita
  const hierro = randomInt(15, 25);
  const piedra = randomInt(10, 18);
  const carbon = randomInt(6, 10);
  const gemas  = randomInt(1, 3);

  if (!game.inv.hierro)  game.inv.hierro  = 0;
  if (!game.inv.piedra)  game.inv.piedra  = 0;
  if (!game.inv.carbon)  game.inv.carbon  = 0;
  if (!game.inv.low_gem) game.inv.low_gem = 0;

  game.inv.hierro  += hierro;
  game.inv.piedra  += piedra;
  game.inv.carbon  += carbon;
  game.inv.low_gem += gemas;

  // Stats trofeos: rocas minadas + gemas raras (global + diario)
  const rocksGain = hierro + piedra + carbon;
  game.stats.rocksMined  = (game.stats.rocksMined  || 0) + rocksGain;
  game.stats.rocksToday  = (game.stats.rocksToday  || 0) + rocksGain;
  game.stats.rareGemsFound = (game.stats.rareGemsFound || 0) + gemas;

  game.minutes += addedTime;
  game.mineCollapsedUsedDay = true;

  toast(
    `Exploras la cueva colapsada: +${hierro} hierro, +${piedra} piedra, ` +
    `+${carbon} carbón y +${gemas} gemas 💠.`
  );
}

/* =========================
   ⛏️ Acción de minar
   ========================= */

function handleMineAction() {
  ensureMineState();
  ensureStats();
  const info = getMineInfo();
  const lvl  = getMineLevel();

  // Tiempo base
  let timeCost = info.timeCost || 120;

  // Efecto de ventilación
  const vent = game.mineUpgrades.ventilation || 0;
  timeCost = Math.floor(timeCost * (1 - 0.05 * vent));

  // Efecto de equipo (linterna)
  if (game.miningGear.lantern) {
    timeCost = Math.max(30, Math.floor(timeCost * 0.85)); // -15% aprox
  }

  // Efecto de nivel de minero
  const lvlBonus = miningLevelBonus();
  timeCost = Math.floor(timeCost * lvlBonus.timeMult);

  // Efecto de estación
  const season = getSeasonEffects();
  timeCost = Math.floor(timeCost * season.timeMult);

  if (game.minutes >= 24 * 60 - timeCost) {
    toast('Ya es muy tarde para bajar a este nivel de la mina...');
    return;
  }

  if (!useTool('pick')) return;

  // ===== HIERRO =====
  let baseIron = 1 + Math.floor(Math.random() * 3); // 1–3
  let ironGain = Math.max(0, Math.floor(baseIron * toolMult('pick')));

  // Nivel de mina
  ironGain = Math.max(1, Math.floor(ironGain * (info.ironMult || 1)));

  // Buff de minería
  const mineB = getBuff('mineBoost') || 0;
  if (mineB > 0) {
    ironGain = Math.max(1, Math.floor(ironGain * (1 + mineB)));
  }

  // Bonus por nivel de minero
  ironGain = Math.max(1, Math.floor(ironGain * (1 + lvlBonus.ironBonus)));

  // Modo y zona
  let ironMultZone = 1.0, stoneMultZone = 1.0, coalMultZone = 1.0, gemMultZone = 1.0;
  switch (game.mineZone) {
    case 'stone': stoneMultZone = 1.3; ironMultZone = 0.9; break;
    case 'coal':  coalMultZone  = 1.4; ironMultZone = 0.9; break;
    case 'gems':  gemMultZone   = 1.6; ironMultZone = 0.9; break;
    default: break;
  }

  switch (game.miningMode) {
    case 'strong':
      ironMultZone  *= 0.9;
      stoneMultZone *= 1.3;
      break;
    case 'precise':
      ironMultZone  *= 0.85;
      gemMultZone   *= 1.8;
      break;
    case 'fast':
      ironMultZone  *= 0.8;
      stoneMultZone *= 0.8;
      coalMultZone  *= 0.8;
      gemMultZone   *= 0.8;
      timeCost = Math.max(20, Math.floor(timeCost * 0.75));
      break;
    case 'normal':
    default:
      break;
  }

  // Fatiga
  const fatMult = getFatigueMult();
  ironGain = Math.max(1, Math.floor(ironGain * ironMultZone * fatMult));

  // Estación afecta recursos
  ironGain = Math.max(1, Math.floor(ironGain * season.ironMult));

  // ===== PIEDRA =====
  const sMin = info.stoneMin ?? 0;
  const sMax = info.stoneMax ?? 0;
  let stoneGain = 0;
  if (sMax > 0 && sMax >= sMin) {
    stoneGain = randomInt(sMin, sMax);
  }
  // Guantes refuerzan piedra
  if (game.miningGear.gloves) {
    stoneGain = Math.floor(stoneGain * 1.2);
  }
  stoneGain = Math.floor(stoneGain * stoneMultZone * season.stoneMult);

  // ===== CARBÓN =====
  let coalGain = 0;
  let coalChance = info.coalChance || 0;
  coalChance += lvlBonus.coalBonus;
  if (game.miningGear.lantern) coalChance += 0.10;
  coalChance *= coalMultZone;
  coalChance = Math.min(0.8, coalChance);

  if (Math.random() < coalChance) {
    const cMin = info.coalMin ?? 1;
    const cMax = info.coalMax ?? cMin;
    coalGain = randomInt(cMin, cMax);
  }
  coalGain = Math.floor(coalGain * season.coalMult);

  // ===== GEMAS base =====
  let gemGain = 0;
  let gemChance = info.gemChance || 0;
  gemChance *= gemMultZone;
  gemChance *= season.gemMult;
  if (Math.random() < gemChance) {
    gemGain += 1;
  }

  // ===== Evento aleatorio =====
  const evt = rollMineEvent(ironGain, info);
  ironGain += evt.extraIron;
  if (ironGain < 0) ironGain = 0;
  gemGain += evt.extraGems;
  const extraMinutes = evt.extraMinutes || 0;

  // ===== Aplicar inventario =====
  if (!game.inv.hierro)  game.inv.hierro  = 0;
  if (!game.inv.piedra)  game.inv.piedra  = 0;
  if (!game.inv.carbon)  game.inv.carbon  = 0;
  if (!game.inv.low_gem) game.inv.low_gem = 0;

  game.inv.hierro  += ironGain;
  game.inv.piedra  += stoneGain;
  game.inv.carbon  += coalGain;
  if (gemGain > 0) {
    game.inv.low_gem += gemGain;
  }

  game.minutes += timeCost + extraMinutes;

  // Fatiga sube
  game.miningFatigue = (game.miningFatigue || 0) + 1;

  // Stats trofeos: rocas minadas + gemas raras (global + diario)
  const rocksGain = ironGain + stoneGain + coalGain;
  game.stats.rocksMined = (game.stats.rocksMined || 0) + rocksGain;
  game.stats.rocksToday = (game.stats.rocksToday || 0) + rocksGain;
  if (gemGain > 0) {
    game.stats.rareGemsFound = (game.stats.rareGemsFound || 0) + gemGain;
  }

  // Mensaje
  const parts = [];
  parts.push(`+${ironGain} hierro ⛏️`);
  if (stoneGain > 0) parts.push(`+${stoneGain} piedra 🪨`);
  if (coalGain > 0)  parts.push(`+${coalGain} carbón 🪵`);
  if (gemGain > 0)   parts.push(`+${gemGain} gemas 💠`);

  let msg = parts.join(' · ');
  msg += ` (nivel ${lvl})`;
  if (evt.flavor) msg += ` ${evt.flavor}`;

  toast(msg);

  // Misiones: hierros cuentan como minería
  missionEvent('mine', ironGain);

  // XP minera y contrato
  const xpGain = ironGain + Math.floor(stoneGain * 0.5) + coalGain + gemGain * 2;
  addMiningXP(xpGain);

  updateMiningContractFromGain({
    hierro:  ironGain,
    piedra:  stoneGain,
    carbon:  coalGain,
    low_gem: gemGain
  });
}

/* =========================
   ⛏️ Mejorar nivel de mina
   ========================= */

function handleUpgradeMine() {
  ensureMineState();
  const current = getMineLevel();
  const nextInfo = getNextMineInfo();
  if (!nextInfo) {
    toast('La mina ya está al nivel máximo.');
    return;
  }
  if (!canPayCost(nextInfo.cost)) {
    toast('No tienes suficientes recursos para mejorar la mina.');
    return;
  }
  payCost(nextInfo.cost);
  setMineLevel(current + 1);
  toast(`Has mejorado la mina a: ${nextInfo.name}.`);
  renderMina();
}

/* =========================
   🪛 Render Mina
   ========================= */

export function renderMina() {
  ensureMineState();
  const el = document.getElementById('mina');
  if (!el) return;

  const lvl  = getMineLevel();
  const info = getMineInfo();
  const next = getNextMineInfo();

  const contract = game.miningContract;
  const season   = game.season || 'primavera';

  const fatigue = game.miningFatigue || 0;
  const fatigueText =
    fatigue >= 7 ? 'Muy cansado (-40% recursos, más riesgo).'
  : fatigue >= 5 ? 'Cansado (-20% recursos, algo más de riesgo).'
  : fatigue >= 3 ? 'Empieza a notarse el cansancio (-10% recursos).'
                 : 'Descansado.';

  el.innerHTML = `
    <h2 class="title">Mina</h2>

    <div class="grid cols-3">

      <!-- Acción principal -->
      <div class="card">
        <h3>⛏️ Picar mineral</h3>
        <p class="kv">
          Nivel actual: <strong>${lvl} · ${info.name}</strong>
        </p>
        <p class="kv">
          Estación: <strong>${season}</strong> · Nivel de minero: <strong>${game.miningLevel}</strong>
        </p>
        <p class="kv" style="font-size:.85rem">
          Modo: <strong>${modeLabel(game.miningMode)}</strong> · Zona: <strong>${zoneLabel(game.mineZone)}</strong>
        </p>
        <p class="kv" style="font-size:.8rem">
          Fatiga: ${fatigue} acciones hoy. ${fatigueText}
        </p>
        <p class="kv" style="font-size:.85rem">
          Recursos posibles: hierro, piedra, carbón y gemas.
        </p>
        <button class="btn" id="btn-mine">Picar en este nivel</button>
        <button class="btn ghost small" id="btn-collapsed" ${game.mineCollapsedUsedDay ? 'disabled' : ''}>
          Explorar cueva colapsada (1 vez/día)
        </button>
      </div>

      <!-- Info de profundidad & probabilidades -->
      <div class="card">
        <h3>📉 Profundidad de la mina</h3>
        <p class="kv">${info.desc}</p>
        <ul style="margin:6px 0 0 18px;font-size:.9rem;color:var(--muted)">
          <li>Hierro base x<strong>${info.ironMult.toFixed(1)}</strong> (antes de buffs).</li>
          <li>Piedra por golpe aprox: <strong>${info.stoneMin ?? 0}–${info.stoneMax ?? 0}</strong>.</li>
          <li>Prob. de carbón: <strong>${Math.round((info.coalChance || 0)*100)}%</strong> (antes de mejoras).</li>
          <li>Prob. de gemas 💠: <strong>${Math.round((info.gemChance || 0)*100)}%</strong> (antes de mejoras).</li>
          <li>Eventos buenos/malos dependen de profundidad, fatiga y mejoras.</li>
        </ul>
      </div>

      <!-- Mejora de nivel -->
      <div class="card">
        <h3>📈 Mejorar la mina</h3>
        ${
          next
            ? `
              <p class="kv">
                Próximo nivel: <strong>${currentLevelLabel(lvl + 1)}</strong>
              </p>
              <p class="kv">
                Nombre: <strong>${next.name}</strong>
              </p>
              <p class="kv">
                Coste: ${renderCost(next.cost)}
              </p>
              <p class="kv" style="font-size:.85rem">
                Más hierro, más piedra, más carbón y más probabilidad de gemas.
              </p>
              <button class="btn small" id="btn-upgrade-mine" ${!canPayCost(next.cost) ? 'disabled' : ''}>
                Mejorar a nivel ${lvl + 1}
              </button>
            `
            : `
              <p class="kv">
                Tu mina ya está al <strong>nivel máximo</strong>.
              </p>
            `
        }
      </div>

    </div>

    <!-- Segunda fila: modos, equipo, mejoras internas y contrato -->
    <div class="grid cols-4" style="margin-top:16px">

      <!-- Modos y zonas -->
      <div class="card">
        <h3>🧭 Modo y zona</h3>
        <p class="kv">Elige cómo prefieres trabajar hoy:</p>
        <p class="kv"><strong>Modo de minería:</strong></p>
        <div class="row" style="flex-wrap:wrap;gap:6px">
          <button class="btn small ${game.miningMode==='normal'?'':'ghost'}"  data-mode="normal">Normal</button>
          <button class="btn small ${game.miningMode==='strong'?'':'ghost'}"  data-mode="strong">Fuerte</button>
          <button class="btn small ${game.miningMode==='precise'?'':'ghost'}" data-mode="precise">Preciso</button>
          <button class="btn small ${game.miningMode==='fast'?'':'ghost'}"    data-mode="fast">Rápido</button>
        </div>

        <p class="kv" style="margin-top:8px"><strong>Zona actual:</strong></p>
        <div class="row" style="flex-wrap:wrap;gap:6px">
          <button class="btn small ${game.mineZone==='balanced'?'':'ghost'}" data-zone="balanced">Equilibrada</button>
          <button class="btn small ${game.mineZone==='stone'?'':'ghost'}"    data-zone="stone">Roca</button>
          <button class="btn small ${game.mineZone==='coal'?'':'ghost'}"     data-zone="coal">Carbón</button>
          <button class="btn small ${game.mineZone==='gems'?'':'ghost'}"     data-zone="gems">Gemas</button>
        </div>
      </div>

      <!-- Equipo minero -->
      <div class="card">
        <h3>🛠️ Equipo minero</h3>
        <p class="kv">Compra equipo permanente que mejora la minería.</p>
        <ul class="kv" style="font-size:.85rem;list-style:none;padding-left:0">
          <li>⛑️ Casco: menos daño por derrumbes.</li>
          <li>🕯️ Linterna: -15% tiempo, +10% carbón.</li>
          <li>🧤 Guantes: +20% piedra.</li>
          <li>🛒 Carretilla: filones de hierro mucho mejores.</li>
        </ul>
        <div style="margin-top:8px">
          ${renderGearRow('helmet',  '⛑️ Casco',      GEAR_COST.helmet)}
          ${renderGearRow('lantern', '🕯️ Linterna',  GEAR_COST.lantern)}
          ${renderGearRow('gloves',  '🧤 Guantes',    GEAR_COST.gloves)}
          ${renderGearRow('cart',    '🛒 Carretilla', GEAR_COST.cart)}
        </div>
      </div>

      <!-- Mejoras internas -->
      <div class="card">
        <h3>🏗️ Mejoras internas</h3>
        <p class="kv">Pequeñas obras en la mina que reducen riesgos y tiempos.</p>
        <div style="margin-top:6px">
          ${renderUpgradeRow('beams', 'Refuerzo de vigas', 'Menos derrumbes y eventos malos.', game.mineUpgrades.beams)}
          ${renderUpgradeRow('ventilation', 'Mejor ventilación', 'Reduce el tiempo por acción.', game.mineUpgrades.ventilation)}
          ${renderUpgradeRow('signage', 'Señalización de túneles', 'Más eventos buenos.', game.mineUpgrades.signage)}
        </div>
      </div>

      <!-- Contrato minero -->
      <div class="card">
        <h3>📜 Contrato minero</h3>
        <p class="kv">Encargo actual del supervisor:</p>
        ${
          contract
            ? `
              <p class="kv">
                Objetivo: ${contract.icon} Entregar <strong>${contract.goal}</strong> ${contract.label}.<br/>
                Progreso: <strong>${contract.progress}/${contract.goal}</strong>
              </p>
              <p class="kv">
                Recompensa: <strong>${contract.rewardCoins} ₥${contract.rewardGems ? ' + ' + contract.rewardGems + ' gemas 💠' : ''}</strong>
              </p>
              <button class="btn small" id="btn-claim-contract" ${contract.done && !contract.claimed ? '' : 'disabled'}>
                ${contract.claimed ? 'Contrato ya cobrado' : 'Cobrar recompensa'}
              </button>
              <button class="btn ghost small" id="btn-new-contract" ${contract.done && contract.claimed ? '' : 'disabled'}>
                Nuevo contrato
              </button>
            `
            : `
              <p class="kv">No hay contrato activo.</p>
              <button class="btn small" id="btn-new-contract">Pedir contrato</button>
            `
        }
      </div>

    </div>
  `;

  // Handlers
  const btnMine = document.getElementById('btn-mine');
  if (btnMine) btnMine.onclick = handleMineAction;

  const btnUp = document.getElementById('btn-upgrade-mine');
  if (btnUp) btnUp.onclick = handleUpgradeMine;

  const btnCollapsed = document.getElementById('btn-collapsed');
  if (btnCollapsed) btnCollapsed.onclick = handleCollapsedCave;

  el.querySelectorAll('[data-mode]').forEach(b=>{
    b.onclick = ()=> setMiningMode(b.dataset.mode);
  });
  el.querySelectorAll('[data-zone]').forEach(b=>{
    b.onclick = ()=> setMineZone(b.dataset.zone);
  });

  el.querySelectorAll('[data-gear]').forEach(b=>{
    b.onclick = ()=> buyGear(b.dataset.gear);
  });

  el.querySelectorAll('[data-upgrade]').forEach(b=>{
    b.onclick = ()=> upgradeMineInternal(b.dataset.upgrade);
  });

  const btnClaim = document.getElementById('btn-claim-contract');
  if (btnClaim) btnClaim.onclick = ()=>{
    claimMiningContract();
    renderMina();
  };

  const btnNewContract = document.getElementById('btn-new-contract');
  if (btnNewContract) btnNewContract.onclick = ()=>{
    createNewMiningContract();
    toast('Nuevo contrato minero asignado.');
    renderMina();
  };
}

/* =========================
   Helpers de UI
   ========================= */

function currentLevelLabel(lvl) {
  const info = MINE_LEVELS[lvl];
  if (!info) return `Nivel ${lvl}`;
  return `Nivel ${lvl} · ${info.name}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random()*(max-min+1))+min;
}

function renderGearRow(key, label, cost) {
  const has = game.miningGear[key];
  return `
    <div class="row space kv" style="margin-top:4px">
      <span>${label}</span>
      <div class="row" style="gap:6px;align-items:center">
        <span style="font-size:.8rem">${renderCost(cost)}</span>
        <button class="btn xsmall ${has?'ghost':''}" data-gear="${key}" ${has?'disabled':''}>
          ${has?'Comprado':'Comprar'}
        </button>
      </div>
    </div>
  `;
}

function renderUpgradeRow(key, label, desc, lvl) {
  const max = 3;
  const cost = UPGRADE_COST[key];
  const levelValue = lvl || 0;
  const dots = '●'.repeat(levelValue) + '○'.repeat(max - levelValue);
  return `
    <div class="kv" style="margin-top:6px">
      <div>
        <strong>${label}</strong>
        <span style="font-size:.8rem;color:var(--muted)">(${desc})</span>
      </div>
      <div style="font-size:.85rem;margin:2px 0">Nivel: ${dots}</div>
      <div class="row space" style="gap:6px">
        <span style="font-size:.8rem">${renderCost(cost)}</span>
        <button class="btn xsmall" data-upgrade="${key}" ${levelValue>=max?'disabled':''}>
          Mejorar
        </button>
      </div>
    </div>
  `;
}
