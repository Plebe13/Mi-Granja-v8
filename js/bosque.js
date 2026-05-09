import { game, toast, useTool, toolMult, missionEvent, getBuff } from './main.js';

/* =========================
   📊 Stats globales (trofeos)
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
   🌲 Estado del bosque
   ========================= */

function ensureForestState() {
  if (!game.forestLevel) game.forestLevel = 1;
  if (game.forestXP == null) game.forestXP = 0;

  // fatiga diaria
  if (game.lastForestDay == null) game.lastForestDay = game.day || 1;
  if (game.day !== game.lastForestDay) {
    game.lastForestDay = game.day;
    game.forestFatigue = 0;
    game.forestCampfireUsedDay = false;
  }
  if (game.forestFatigue == null) game.forestFatigue = 0;

  // salud del bosque (0-100)
  if (game.forestHealth == null) game.forestHealth = 80;
  // pequeño ajuste pasivo hacia 80 cada día
  if (game.lastForestHealthDay == null) game.lastForestHealthDay = game.day || 1;
  if (game.day !== game.lastForestHealthDay) {
    game.lastForestHealthDay = game.day;
    if (game.forestHealth < 80) game.forestHealth = Math.min(80, game.forestHealth + 2);
    if (game.forestHealth > 80) game.forestHealth = Math.max(80, game.forestHealth - 2);
  }

  // zona de exploración
  if (!game.forestZone) game.forestZone = 'orilla'; // orilla, interior, ribera

  // ruta (camino vs atajo)
  if (!game.forestRoute) game.forestRoute = 'seguro'; // seguro, peligroso

  // equipo forestal
  if (!game.forestGear) {
    game.forestGear = {
      gloves: false,   // guantes de recolección
      backpack: false, // mochila
      boots: false,    // botas resistentes
      cloak: false     // capa gruesa contra el clima
    };
  }

  // clima local del bosque
  if (game.forestWeather == null) game.forestWeather = 'soleado';
  if (game.lastForestWeatherDay == null) game.lastForestWeatherDay = game.day || 1;
  if (game.day !== game.lastForestWeatherDay) {
    game.lastForestWeatherDay = game.day;
    game.forestWeather = rollForestWeather();
  }

  // contrato forestal (lo creamos solo cuando se pida en la UI)
  if (game.forestContract == null) {
    game.forestContract = null;
  }
}

function rollForestWeather() {
  // distribución simple: más días normales que extremos
  const r = Math.random();
  if (r < 0.45) return 'soleado';
  if (r < 0.70) return 'nublado';
  if (r < 0.88) return 'lluvia';
  return 'niebla';
}

function forestWeatherLabel(w) {
  switch (w) {
    case 'soleado': return 'Soleado ☀️';
    case 'lluvia':  return 'Lluvioso 🌧️';
    case 'niebla':  return 'Niebla 🌫️';
    case 'nublado': return 'Nublado ☁️';
    default: return w;
  }
}

function getForestWeatherEffects() {
  const w = game.forestWeather || 'soleado';
  // multiplicadores suaves
  switch (w) {
    case 'soleado':
      return {
        woodMult: 1.10,
        mushroomMult: 0.8,
        herbMult: 0.9,
        findMult: 1.0,
        wolfMult: 1.0,
        slipChance: 0
      };
    case 'lluvia':
      return {
        woodMult: 0.90,
        mushroomMult: 1.4,
        herbMult: 1.3,
        findMult: 1.0,
        wolfMult: 1.1,
        slipChance: 0.08
      };
    case 'niebla':
      return {
        woodMult: 0.95,
        mushroomMult: 1.1,
        herbMult: 1.0,
        findMult: 0.9,
        wolfMult: 0.7,
        slipChance: 0.03
      };
    case 'nublado':
    default:
      return {
        woodMult: 1.0,
        mushroomMult: 1.0,
        herbMult: 1.0,
        findMult: 1.0,
        wolfMult: 1.0,
        slipChance: 0
      };
  }
}

/* =========================
   🎓 Nivel de forestal
   ========================= */

function forestLevelBonus() {
  const lvl = game.forestLevel || 1;
  // +2% madera por nivel, +1% prob. de hallazgos
  const woodBonus = 0.02 * (lvl - 1);
  const findBonus = 0.01 * (lvl - 1);
  return { woodBonus, findBonus };
}

function addForestXP(xp) {
  if (xp <= 0) return;
  game.forestXP += xp;
  const maxLevel = 10;
  while (game.forestLevel < maxLevel) {
    const need = 30 + 15 * (game.forestLevel - 1);
    if (game.forestXP >= need) {
      game.forestXP -= need;
      game.forestLevel += 1;
      toast(`Tu experiencia en el bosque aumenta a nivel ${game.forestLevel}.`);
    } else break;
  }
}

/* =========================
   😓 Fatiga del bosque
   ========================= */

function forestFatigueMult() {
  const a = game.forestFatigue || 0;
  if (a >= 7) return 0.6;
  if (a >= 5) return 0.8;
  if (a >= 3) return 0.9;
  return 1.0;
}

function forestFatigueText() {
  const a = game.forestFatigue || 0;
  if (a >= 7) return 'Muy cansado: consigues bastante menos y te expones más a peligros.';
  if (a >= 5) return 'Cansado: rinde menos el bosque y los accidentes son más probables.';
  if (a >= 3) return 'Empiezas a cansarte: algo menos de rendimiento.';
  return 'Estás fresco para seguir trabajando entre los árboles.';
}

/* =========================
   💚 Salud del bosque
   ========================= */

function forestHealthText() {
  const h = game.forestHealth || 0;
  if (h >= 90) return 'El bosque está exuberante y lleno de vida.';
  if (h >= 70) return 'El bosque está sano, responde bien a tu trabajo.';
  if (h >= 50) return 'El bosque se mantiene, pero conviene plantar algo de vez en cuando.';
  if (h >= 30) return 'El bosque empieza a resentirse, deberías reforestar.';
  return 'El bosque está muy castigado. La madera rinde poco y los peligros aumentan.';
}

/* =========================
   🌲 Zonas y rutas
   ========================= */

function zoneLabel(z) {
  return ({
    orilla:  'Orilla del bosque',
    interior:'Interior denso',
    ribera:  'Ribera del río'
  })[z] || z;
}

function routeLabel(r) {
  return ({
    seguro:    'Camino seguro',
    peligroso: 'Atajo peligroso'
  })[r] || r;
}

/* =========================
   🎒 Equipo forestal
   ========================= */

const FOREST_GEAR_COST = {
  gloves:   { coins: 25, madera: 8 },
  backpack: { coins: 35, madera: 10, low_gem: 1 },
  boots:    { coins: 30, madera: 6, cuero: 2 },
  cloak:    { coins: 28, lana: 4 }
};

function canPayCost(cost) {
  if (!cost) return false;
  if (cost.coins && game.coins < cost.coins) return false;
  if (cost.madera && (game.inv.madera || 0) < cost.madera) return false;
  if (cost.low_gem && (game.inv.low_gem || 0) < cost.low_gem) return false;
  if (cost.cuero && (game.inv.cuero || 0) < cost.cuero) return false;
  if (cost.lana && (game.inv.lana || 0) < cost.lana) return false;
  return true;
}

function payCost(cost) {
  if (!cost) return;
  if (cost.coins)   game.coins        -= cost.coins;
  if (cost.madera)  game.inv.madera   = (game.inv.madera || 0) - cost.madera;
  if (cost.low_gem) game.inv.low_gem  = (game.inv.low_gem || 0) - cost.low_gem;
  if (cost.cuero)   game.inv.cuero    = (game.inv.cuero || 0) - cost.cuero;
  if (cost.lana)    game.inv.lana     = (game.inv.lana || 0) - cost.lana;
}

function renderCost(cost) {
  if (!cost) return '—';
  const parts = [];
  if (cost.coins)   parts.push(`💰 ${cost.coins} ₥`);
  if (cost.madera)  parts.push(`🪵 ${cost.madera} madera`);
  if (cost.low_gem) parts.push(`💠 ${cost.low_gem} gemas pequeñas`);
  if (cost.cuero)   parts.push(`👞 ${cost.cuero} cuero`);
  if (cost.lana)    parts.push(`🧶 ${cost.lana} lana`);
  return parts.join(' · ');
}

function buyForestGear(key) {
  ensureForestState();
  if (game.forestGear[key]) {
    toast('Ya tienes este equipo forestal.');
    return;
  }
  const cost = FOREST_GEAR_COST[key];
  if (!canPayCost(cost)) {
    toast('No tienes recursos suficientes para este equipo.');
    return;
  }
  payCost(cost);
  game.forestGear[key] = true;
  toast('Has adquirido nuevo equipo para el bosque.');
  renderBosque();
}

/* =========================
   📜 Contrato forestal
   ========================= */

function createForestContract() {
  const lvl = game.forestLevel || 1;
  const options = [
    { key: 'madera',     label: 'madera',        icon: '🪵' },
    { key: 'mushroom',   label: 'hongos',        icon: '🍄' },
    { key: 'herb_lunar', label: 'hierba lunar',  icon: '🌿' },
    { key: 'wolf_pelt',  label: 'pieles de lobo',icon: '🐺' }
  ];
  const pick = options[Math.floor(Math.random() * options.length)];
  const base = 10 + lvl * 4;
  const goal = base + Math.floor(Math.random() * 6);

  game.forestContract = {
    resource: pick.key,
    label: pick.label,
    icon: pick.icon,
    goal,
    progress: 0,
    rewardCoins: 30 + lvl * 6,
    rewardGems: (pick.key === 'herb_lunar' || pick.key === 'wolf_pelt') ? 1 : 0,
    done: false,
    claimed: false
  };
}

function updateForestContractFromGain(gains) {
  const c = game.forestContract;
  if (!c || c.done) return;
  const add = gains[c.resource] || 0;
  if (!add) return;
  c.progress = Math.min(c.goal, c.progress + add);
  if (c.progress >= c.goal) {
    c.done = true;
    toast('Has completado el contrato del guardabosques. Ve a cobrar tu recompensa.');
  }
}

function claimForestContract() {
  const c = game.forestContract;
  if (!c || !c.done || c.claimed) return;
  game.coins += c.rewardCoins;
  if (c.rewardGems) {
    game.inv.low_gem = (game.inv.low_gem || 0) + c.rewardGems;
  }
  c.claimed = true;
  toast(`Cobras el contrato forestal: +${c.rewardCoins} ₥${c.rewardGems ? ' y +'+c.rewardGems+' gemas 💠' : ''}.`);
}

/* =========================
   Export principal
   ========================= */

export function renderBosque() {
  ensureForestState();
  const el = document.getElementById('bosque');
  if (!el) return;

  const lvl   = game.forestLevel || 1;
  const xp    = game.forestXP || 0;
  const zone  = game.forestZone || 'orilla';
  const route = game.forestRoute || 'seguro';
  const fat   = game.forestFatigue || 0;
  const health= game.forestHealth || 0;
  const weather = game.forestWeather || 'soleado';
  const contract = game.forestContract;

  el.innerHTML = `
    <h2 class="title">Bosque</h2>

    <div class="grid cols-3">
      <div class="card">
        <h3>🪓 Talar árboles</h3>
        <p class="kv">Rendimiento según tu hacha, tu experiencia y los buffs activos.</p>
        <p class="kv" style="font-size:.85rem">Zona actual: <strong>${zoneLabel(zone)}</strong></p>
        <button class="btn" id="btn-chop">Talar</button>
      </div>

      <div class="card">
        <h3>🌲 Explorar el bosque</h3>
        <p class="kv">Consume 10 minutos. Puedes encontrar recursos, animales o incluso gente.</p>
        <p class="kv" style="font-size:.85rem">Ruta actual: <strong>${routeLabel(route)}</strong></p>
        <button class="btn" id="btn-explore">Explorar</button>
      </div>

      <div class="card">
        <h3>📒 Diario del guardabosques</h3>
        <p class="kv">
          Nivel de forestal: <strong>${lvl}</strong><br>
          XP acumulada: <strong>${xp}</strong><br>
          Acciones hoy: <strong>${fat}</strong><br>
          Estado: ${forestFatigueText()}
        </p>
        <p class="kv">
          Salud del bosque: <strong>${health}</strong>/100<br>
          <span style="font-size:.85rem">${forestHealthText()}</span>
        </p>
        <p class="kv">
          Clima: <strong>${forestWeatherLabel(weather)}</strong>
        </p>
        <hr class="sep"/>
        <p class="kv"><strong>Zona de trabajo:</strong></p>
        <div class="row" style="flex-wrap:wrap;gap:6px">
          <button class="btn xsmall ${zone==='orilla'?'':'ghost'}"  data-zone="orilla">Orilla</button>
          <button class="btn xsmall ${zone==='interior'?'':'ghost'}" data-zone="interior">Interior</button>
          <button class="btn xsmall ${zone==='ribera'?'':'ghost'}"   data-zone="ribera">Ribera</button>
        </div>
        <p class="kv" style="margin-top:6px"><strong>Ruta:</strong></p>
        <div class="row" style="flex-wrap:wrap;gap:6px">
          <button class="btn xsmall ${route==='seguro'?'':'ghost'}"    data-route="seguro">Camino seguro</button>
          <button class="btn xsmall ${route==='peligroso'?'':'ghost'}" data-route="peligroso">Atajo peligroso</button>
        </div>
        <hr class="sep"/>
        <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:4px">
          <button class="btn xsmall" id="btn-plant">Plantar arbolitos</button>
          <button class="btn xsmall" id="btn-campfire" ${game.forestCampfireUsedDay ? 'disabled' : ''}>Encender fogata</button>
        </div>
        <p class="kv" style="font-size:.8rem;margin-top:4px">
          Plantar mejora la salud del bosque.<br>
          La fogata reduce algo la fatiga y mejora el ánimo.
        </p>
      </div>
    </div>

    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h3>🎒 Equipo forestal</h3>
        <p class="kv">Compra equipo permanente que mejora tus salidas al bosque.</p>
        ${renderForestGearRows()}
      </div>

      <div class="card">
        <h3>📜 Contrato forestal</h3>
        ${renderForestContractBlock(contract)}
      </div>
    </div>
  `;

  // botones principales
  document.getElementById('btn-chop').onclick = onChop;
  document.getElementById('btn-explore').onclick = onExplore;

  const btnPlant = document.getElementById('btn-plant');
  if (btnPlant) btnPlant.onclick = onPlantTrees;

  const btnCamp = document.getElementById('btn-campfire');
  if (btnCamp) btnCamp.onclick = onCampfire;

  el.querySelectorAll('[data-zone]').forEach(btn => {
    btn.onclick = () => {
      game.forestZone = btn.dataset.zone;
      toast(`Ahora trabajarás en la zona: ${zoneLabel(game.forestZone)}.`);
      renderBosque();
    };
  });

  el.querySelectorAll('[data-route]').forEach(btn => {
    btn.onclick = () => {
      game.forestRoute = btn.dataset.route;
      toast(`Elegiste la ruta: ${routeLabel(game.forestRoute)}.`);
      renderBosque();
    };
  });

  el.querySelectorAll('[data-gear]').forEach(btn => {
    btn.onclick = () => buyForestGear(btn.dataset.gear);
  });

  const btnClaim = document.getElementById('btn-forest-claim');
  if (btnClaim) {
    btnClaim.onclick = () => {
      claimForestContract();
      renderBosque();
    };
  }

  const btnNew = document.getElementById('btn-forest-new');
  if (btnNew) {
    btnNew.onclick = () => {
      createForestContract();
      toast('El guardabosques te asigna un nuevo contrato.');
      renderBosque();
    };
  }
}

/* =========================
   Render helpers de UI
   ========================= */

function renderForestGearRows() {
  const g = game.forestGear || {};
  const rows = [
    { key:'gloves',   label:'🧤 Guantes de recolección', desc:'+30% hongos y hierbas encontradas.', cost:FOREST_GEAR_COST.gloves },
    { key:'backpack', label:'🎒 Mochila amplia',         desc:'Obtienes un poco más en hallazgos.', cost:FOREST_GEAR_COST.backpack },
    { key:'boots',    label:'🥾 Botas resistentes',      desc:'Menos golpes al hacha en encuentros peligrosos.', cost:FOREST_GEAR_COST.boots },
    { key:'cloak',    label:'🧥 Capa gruesa',            desc:'Reduce los efectos negativos del clima.', cost:FOREST_GEAR_COST.cloak }
  ];
  return rows.map(r => `
    <div class="kv" style="margin-top:6px">
      <div><strong>${r.label}</strong></div>
      <div style="font-size:.8rem;color:var(--muted)">${r.desc}</div>
      <div class="row space" style="gap:6px;margin-top:2px">
        <span style="font-size:.8rem">${renderCost(r.cost)}</span>
        <button class="btn xsmall ${g[r.key]?'ghost':''}" data-gear="${r.key}" ${g[r.key]?'disabled':''}>
          ${g[r.key]?'Comprado':'Comprar'}
        </button>
      </div>
    </div>
  `).join('');
}

function renderForestContractBlock(contract) {
  if (!contract) {
    return `
      <p class="kv">No tienes contrato activo.</p>
      <button class="btn small" id="btn-forest-new">Pedir contrato al guardabosques</button>
    `;
  }
  return `
    <p class="kv">
      Objetivo: ${contract.icon || '🪵'} entregar <strong>${contract.goal}</strong> ${contract.label || contract.resource}.<br>
      Progreso: <strong>${contract.progress || 0}/${contract.goal}</strong><br>
      Recompensa: <strong>${contract.rewardCoins || 0} ₥${contract.rewardGems ? ' + ' + contract.rewardGems + ' gemas 💠' : ''}</strong><br>
      Estado: <strong>${contract.done ? (contract.claimed ? 'Cobrado' : 'Listo para cobrar') : 'En progreso'}</strong>
    </p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:4px">
      <button class="btn small" id="btn-forest-claim" ${contract.done && !contract.claimed ? '' : 'disabled'}>
        Cobrar recompensa
      </button>
      <button class="btn ghost small" id="btn-forest-new" ${contract.done && contract.claimed ? '' : 'disabled'}>
        Nuevo contrato
      </button>
    </div>
  `;
}

/* =========================
   Utilidades básicas
   ========================= */

function ensureInvKey(key) {
  if (!game.inv) game.inv = {};
  if (game.inv[key] == null) game.inv[key] = 0;
}

/* =========================
   Acciones: plantar y fogata
   ========================= */

function onPlantTrees() {
  ensureForestState();
  const costWood = 2;
  if ((game.inv.madera || 0) < costWood) {
    toast('Necesitas al menos 2 de madera para plantar algunos arbolitos.');
    return;
  }
  if (game.minutes >= 24*60 - 20) {
    toast('Ya es muy tarde para ponerse a plantar.');
    return;
  }
  game.inv.madera -= costWood;
  game.minutes += 20;
  game.forestHealth = Math.min(100, (game.forestHealth || 0) + 5);
  // plantar también cuenta un poco como forrajeo
  missionEvent('forage', 1);
  addForestXP(6);
  toast('Dedicas un rato a plantar arbolitos 🌱. El bosque te lo agradecerá.');
}

function onCampfire() {
  ensureForestState();
  if (game.forestCampfireUsedDay) {
    toast('Ya encendiste una fogata hoy.');
    return;
  }
  const costWood = 3;
  if ((game.inv.madera || 0) < costWood) {
    toast('Necesitas al menos 3 de madera para encender una buena fogata.');
    return;
  }
  if (game.minutes >= 24*60 - 30) {
    toast('Es demasiado tarde para montar un campamento en condiciones.');
    return;
  }
  game.inv.madera -= costWood;
  game.minutes += 30;
  game.forestCampfireUsedDay = true;
  // la fogata reduce algo la fatiga y mejora un poco la salud
  game.forestFatigue = Math.max(0, (game.forestFatigue || 0) - 2);
  game.forestHealth = Math.min(100, (game.forestHealth || 0) + 3);
  addForestXP(4);
  toast('Montas una pequeña fogata 🔥. Descansas un momento y el bosque se siente algo más tranquilo.');
}

/* =========================
   Acción: talar
   ========================= */

function onChop() {
  ensureForestState();
  const effects = getForestWeatherEffects();

  if (game.minutes >= 24*60 - 60) {
    toast('Ya es muy tarde para internarse a talar árboles...');
    return;
  }

  if (!useTool('axe')) return;

  const axeMult = toolMult('axe');
  const chopB   = getBuff('chopBoost') || 0;
  const harvestB= getBuff('harvestBoost') || 0;
  const { woodBonus } = forestLevelBonus();
  const zone    = game.forestZone || 'orilla';
  const health  = game.forestHealth || 0;
  const route   = game.forestRoute || 'seguro';

  // base 2–4 troncos
  let gain = 2 + Math.floor(Math.random() * 3);

  // multiplicadores
  gain = Math.floor(gain * axeMult);

  if (chopB > 0 || harvestB > 0) {
    const multBuff = 1 + chopB + harvestB * 0.4;
    gain = Math.max(1, Math.floor(gain * multBuff));
  }

  // experiencia forestal
  gain = Math.floor(gain * (1 + woodBonus));

  // zona
  if (zone === 'interior') {
    gain = Math.floor(gain * 1.25);
  } else if (zone === 'ribera') {
    gain = Math.floor(gain * 0.9);
  }

  // salud del bosque
  const healthMult = 0.7 + 0.3 * (health / 100);
  gain = Math.max(1, Math.floor(gain * healthMult));

  // clima
  gain = Math.max(1, Math.floor(gain * effects.woodMult));

  // fatiga
  const fatMult = forestFatigueMult();
  gain = Math.max(1, Math.floor(gain * fatMult));

  // guardamos madera total y un desglose simple de calidades
  // orilla: más blanda; interior: más dura; ribera: casi todo blanda
  let soft = 0, hard = 0;
  for (let i = 0; i < gain; i++) {
    let pHard = 0.2;
    if (zone === 'interior') pHard = 0.6;
    if (zone === 'ribera') pHard = 0.1;
    if (Math.random() < pHard) hard++; else soft++;
  }

  ensureInvKey('madera');
  ensureInvKey('madera_blanda');
  ensureInvKey('madera_dura');

  game.inv.madera += gain;
  game.inv.madera_blanda += soft;
  game.inv.madera_dura += hard;

  // 📊 stats: árboles talados (global + diario)
  ensureStats();
  game.stats.treesCut   = (game.stats.treesCut   || 0) + gain;
  game.stats.treesToday = (game.stats.treesToday || 0) + gain;

  // tiempo y fatiga
  game.minutes += 60;
  game.forestFatigue = (game.forestFatigue || 0) + 1;

  // la tala constante baja un poco la salud
  let healthDrop = 1;
  if (zone === 'interior') healthDrop = 2;
  if (route === 'peligroso') healthDrop += 1;
  game.forestHealth = Math.max(0, (game.forestHealth || 0) - healthDrop);

  toast(`Talas varios árboles y obtienes +${gain} madera 🪵 (${hard} dura, ${soft} blanda).`);
  missionEvent('chop', gain);

  // XP
  addForestXP(gain);

  // contrato forestal
  updateForestContractFromGain({ madera: gain });
}

/* =========================
   Acción: explorar
   ========================= */

function onExplore() {
  ensureForestState();
  const effects = getForestWeatherEffects();

  if (game.minutes >= 24*60 - 10) {
    toast('Ya es muy tarde para internarse en el bosque...');
    return;
  }

  // tiempo base
  let timeCost = 10;
  game.forestFatigue = (game.forestFatigue || 0) + 1;

  const chopB    = getBuff('chopBoost') || 0;
  const mineB    = getBuff('mineBoost') || 0;
  const harvestB = getBuff('harvestBoost') || 0;
  const { findBonus } = forestLevelBonus();
  const zone = game.forestZone || 'orilla';
  const route = game.forestRoute || 'seguro';
  const fatMult = forestFatigueMult();
  const gear = game.forestGear || {};

  // prob base
  let pLog   = 0.30; // tronco caído
  let pMush  = 0.20; // hongos
  let pHerb  = 0.18; // hierba lunar
  let pGem   = 0.10; // gemas pequeñas
  let pWolf  = 0.08; // lobo
  let pDeer  = 0.05; // ciervo
  let pBoar  = 0.05; // jabalí
  let pCoins = 0.06; // monedas
  let pHuman = 0.05; // encuentro humano

  // ajustes por zona
  if (zone === 'interior') {
    pLog += 0.05;
    pMush += 0.05;
    pHerb += 0.03;
    pWolf += 0.05;
    pBoar += 0.03;
  } else if (zone === 'ribera') {
    pMush += 0.12;
    pHerb += 0.06;
    pWolf -= 0.02;
    pBoar -= 0.02;
  } else if (zone === 'orilla') {
    pWolf -= 0.03;
    pBoar -= 0.01;
  }

  // ruta
  if (route === 'peligroso') {
    pWolf += 0.05;
    pBoar += 0.04;
    pGem  += 0.03;
    pCoins+= 0.03;
  } else {
    // seguro
    pWolf -= 0.03;
    pBoar -= 0.02;
    pGem  -= 0.01;
  }

  // buffs
  pMush += harvestB * 0.2;
  pHerb += harvestB * 0.15;
  pGem  += mineB * 0.15;

  // experiencia forestal
  pLog  += findBonus * 0.4;
  pMush += findBonus * 0.3;
  pHerb += findBonus * 0.3;
  pHuman+= findBonus * 0.1;

  // clima
  pMush *= effects.mushroomMult;
  pHerb *= effects.herbMult;
  const wolfWeatherMult = effects.wolfMult;

  // clamp
  const clamp = x => Math.max(0, x);
  pLog = clamp(pLog);
  pMush = clamp(pMush);
  pHerb = clamp(pHerb);
  pGem = clamp(pGem);
  pWolf = clamp(pWolf * wolfWeatherMult);
  pDeer = clamp(pDeer);
  pBoar = clamp(pBoar);
  pCoins = clamp(pCoins);
  pHuman = clamp(pHuman);

  // normalizar suave
  let total = pLog + pMush + pHerb + pGem + pWolf + pDeer + pBoar + pCoins + pHuman;
  if (total > 0.95) {
    const f = 0.95 / total;
    pLog*=f; pMush*=f; pHerb*=f; pGem*=f; pWolf*=f; pDeer*=f; pBoar*=f; pCoins*=f; pHuman*=f;
    total = pLog + pMush + pHerb + pGem + pWolf + pDeer + pBoar + pCoins + pHuman;
  }

  // posible resbalón por lluvia
  const slipChance = effects.slipChance || 0;
  if (!gear.boots && Math.random() < slipChance) {
    timeCost += 10;
    game.minutes += timeCost;
    addForestXP(2);
    toast('La lluvia deja el suelo resbaladizo. Te toma un rato volver a orientarte entre el barro.');
    return;
  }

  // ejecutar evento
  let r = Math.random();
  let remaining = r;

  const applyBackpackBonus = (type, baseAmount) => {
    if (!gear.backpack) return baseAmount;
    switch (type) {
      case 'wood': return baseAmount + 1;
      case 'mush': return baseAmount + 1;
      case 'herb': return baseAmount + 0; // hierba suele ir de una en una
      case 'gem':  return baseAmount;     // gemas son raras
      case 'coins':return baseAmount + 2;
      default: return baseAmount;
    }
  };

  if (remaining < pLog) {
    // tronco caído — madera
    let wood = 1 + Math.floor(Math.random() * 3);
    const extraMult = 1 + chopB + harvestB * 0.4;
    wood = Math.max(1, Math.floor(wood * extraMult));
    wood = Math.max(1, Math.floor(wood * fatMult));
    wood = applyBackpackBonus('wood', wood);

    ensureInvKey('madera');
    game.inv.madera += wood;

    // 📊 stats: también cuenta como árboles/ troncos recolectados (global + diario)
    ensureStats();
    game.stats.treesCut   = (game.stats.treesCut   || 0) + wood;
    game.stats.treesToday = (game.stats.treesToday || 0) + wood;

    missionEvent('chop', wood);
    addForestXP(wood);
    game.minutes += timeCost;
    toast(`Encuentras un tronco caído y recoges +${wood} madera 🪵.`);
    updateForestContractFromGain({ madera: wood });
    return;
  }
  remaining -= pLog;

  if (remaining < pMush) {
    // hongos
    let mush = 1 + Math.floor(Math.random() * 2);
    mush = Math.max(1, Math.floor(mush * (1 + harvestB * 0.5)));
    mush = Math.max(1, Math.floor(mush * fatMult));
    mush = applyBackpackBonus('mush', mush);

    ensureInvKey('mushroom');
    game.inv.mushroom += mush;
    addForestXP(2 * mush);
    game.minutes += timeCost;
    toast(`En un claro húmedo encuentras +${mush} hongos 🍄.`);
    updateForestContractFromGain({ mushroom: mush });
    return;
  }
  remaining -= pMush;

  if (remaining < pHerb) {
    // hierba lunar
    ensureInvKey('herb_lunar');
    game.inv.herb_lunar += 1;
    missionEvent('forage', 1);
    addForestXP(8);
    game.minutes += timeCost;
    toast('Recolectas 1 hierba lunar 🌿 entre la maleza.');
    updateForestContractFromGain({ herb_lunar: 1 });
    return;
  }
  remaining -= pHerb;

  if (remaining < pGem) {
    // gema baja
    ensureInvKey('low_gem');
    game.inv.low_gem += 1;
    missionEvent('mine', 1);
    addForestXP(10);

    // 📊 stats: gemas raras encontradas en el bosque
    ensureStats();
    game.stats.rareGemsFound = (game.stats.rareGemsFound || 0) + 1;

    game.minutes += timeCost;
    toast('Entre las raíces ves brillar una pequeña gema 💠.');
    return;
  }
  remaining -= pGem;

  if (remaining < pWolf) {
    // lobo salvaje
    ensureInvKey('wolf_pelt');
    game.inv.wolf_pelt += 1;

    // 📊 stats: bestias del bosque derrotadas
    ensureStats();
    game.stats.forestBeastsDefeated = (game.stats.forestBeastsDefeated || 0) + 1;

    const axe = game.tools?.axe;
    if (axe) {
      let dmg = zone === 'interior' ? 7 : 5;
      if (gear.boots) dmg = Math.max(2, dmg - 2);
      axe.dur = Math.max(0, axe.dur - dmg);
    }
    addForestXP(12);
    game.minutes += timeCost;
    toast('Un lobo te sorprende. Logras espantarlo, tu hacha se resiente y obtienes 1 piel de lobo 🐺.');
    updateForestContractFromGain({ wolf_pelt: 1 });
    return;
  }
  remaining -= pWolf;

  if (remaining < pDeer) {
    // ciervo — más bien avistamiento
    addForestXP(10);
    game.minutes += timeCost;
    toast('Ves un ciervo cruzando entre los árboles. No obtienes recursos, pero aprendes a moverte más sigiloso.');
    return;
  }
  remaining -= pDeer;

  if (remaining < pBoar) {
    // jabalí — pierdes algo de tiempo, quizá daño pequeño a hacha
    const axe = game.tools?.axe;
    if (axe) {
      let dmg = 4;
      if (gear.boots) dmg = 2;
      axe.dur = Math.max(0, axe.dur - dmg);
    }
    timeCost += 10;
    addForestXP(6);
    game.minutes += timeCost;
    toast('Un jabalí sale de repente entre los matorrales. Lo esquivas, pero te obliga a retroceder y reorganizarte.');
    return;
  }
  remaining -= pBoar;

  if (remaining < pCoins) {
    // monedas / campamento
    let coins = 3 + Math.floor(Math.random() * 6);
    coins = applyBackpackBonus('coins', coins);
    game.coins += coins;
    addForestXP(5);
    game.minutes += timeCost;
    toast(`Encuentras un pequeño campamento abandonado y recuperas ${coins} ₥ entre las sobras.`);
    return;
  }
  remaining -= pCoins;

  if (remaining < pHuman) {
    // encuentro humano: campesino o viajero
    const kind = Math.random();
    if (kind < 0.5) {
      // campesino
      ensureInvKey('trigo');
      ensureInvKey('maiz');
      const trigo = 1 + Math.floor(Math.random() * 2);
      const maiz = Math.floor(Math.random() * 2);
      game.inv.trigo += trigo;
      game.inv.maiz += maiz;
      addForestXP(8);
      game.minutes += timeCost;
      toast(`Te cruzas con un campesino que se había perdido. Le ayudas a orientarse y te agradece con ${trigo} trigo 🌾${maiz>0 ? ' y '+maiz+' maíz 🌽':''}.`);
    } else {
      // viajero
      const coins = 4 + Math.floor(Math.random() * 5);
      game.coins += coins;
      addForestXP(8);
      game.minutes += timeCost;
      toast(`Un viajero te cuenta historias del bosque y te paga ${coins} ₥ por indicarle el camino correcto.`);
    }
    return;
  }
  remaining -= pHuman;

  // nada especial
  game.minutes += timeCost;
  addForestXP(2);
  toast('Exploras un rato, pero hoy el bosque está tranquilo…');
}
