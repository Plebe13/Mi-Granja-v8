import { game, TIER, repairTool, sharpenTool, getToolState, toast } from './main.js';
import { getToolDurabilityBonusPct } from './achievements.js';
import { renderProfessionsPanel } from './profesiones.js';

/* =========================
   🌆 Render Pueblo
   ========================= */

export function renderPueblo() {
  const el = document.getElementById('pueblo');

  // Ahora el pueblo muestra el panel de oficios
  el.innerHTML = `
    <h2 class="title">Pueblo — Oficios</h2>
    <div id="profesiones-panel"></div>
    <div id="npc-dialog"></div>
  `;

  // Dibujamos el sistema de profesiones (herrero, carpintero, cocinero, herbalista)
  renderProfessionsPanel('profesiones-panel');
}

/* =========================
   🧱 Carpintero: reparar + afilar
   ========================= */

function openCarpenterDialog() {
  const el = document.getElementById('npc-dialog');
  const bonus = getToolDurabilityBonusPct();

  const tools = [
    { key:'axe',  icon:'🪓', name:'Hacha'   },
    { key:'pick', icon:'⛏️', name:'Pico'    },
    { key:'hoe',  icon:'🚜', name:'Azadón'  }
  ];

  const cards = tools.map(t => {
    const data = game.tools[t.key];
    if (!data) return '';

    const tier    = data.tier;
    const baseMax = TIER[tier].max;
    const max     = Math.round(baseMax * (1 + bonus));
    const dur     = data.dur;
    const pct     = Math.max(0, Math.min(100, (dur / max) * 100));

    const coinCost  = 6 * tier;
    const needIron  = tier >= 2 ? 1 : 0;
    const needWood  = 1;

    const state = getToolState(t.key);
    const uses  = data.uses || 0;
    const stateLabel =
      state === 'sharp'  ? 'Afilada (+rendimiento)' :
      state === 'dull'   ? 'Desafilada (-rendimiento)' :
      state === 'broken' ? 'Rota' :
      'Normal';

    const sharpCoins = 4 * tier;
    const sharpIron  = tier >= 2 ? 1 : 0;

    return `
      <div class="card" style="margin-bottom:10px">
        <div class="row space">
          <div><strong>${t.icon} ${t.name}</strong> — ${TIER[tier].name}</div>
          <span class="badge">${dur}/${max}</span>
        </div>
        <div class="progress" style="margin-top:6px;margin-bottom:6px">
          <div style="width:${pct}%"></div>
        </div>
        <p class="kv">Estado: <strong>${stateLabel}</strong> · Usos: ${uses}</p>
        <div class="kv">
          <span>Reparación: ${coinCost} ₥ · ${needWood} madera${needIron ? ` · ${needIron} hierro` : ''}</span>
        </div>
        <div class="kv">
          <span>Afilado especial: ${sharpCoins} ₥${sharpIron ? ` · ${sharpIron} hierro` : ''}</span>
        </div>
        <div class="row space" style="margin-top:8px; gap:6px">
          <button class="btn small" data-repair-tool="${t.key}">Reparar</button>
          <button class="btn ghost small" data-sharpen-tool="${t.key}">Afilar</button>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="dialog card">
      <h3>🧱 Carpintero</h3>
      <p>Déjame ver tus herramientas... puedo dejarlas como nuevas o darles un filo especial.</p>
      <p class="kv">Uso madera, algo de hierro y unas monedas para repararlas o afilarlas.</p>
      <hr class="sep"/>
      ${cards || '<p class="kv">Aún no tienes herramientas registradas.</p>'}
      <div class="kv" style="margin-top:8px">
        <span>Recursos actuales: 💰 ${game.coins} · 🪵 ${game.inv.madera||0} · ⛏️ ${game.inv.hierro||0}</span>
      </div>
      <button class="btn ghost small" id="close-dialog">Cerrar</button>
    </div>
  `;

  document.getElementById('close-dialog').onclick = () => {
    el.innerHTML = "";
  };

  el.querySelectorAll('[data-repair-tool]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.repairTool;
      repairTool(key);
      openCarpenterDialog();
    };
  });

  el.querySelectorAll('[data-sharpen-tool]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.sharpenTool;
      sharpenTool(key);
      openCarpenterDialog();
    };
  });
}

/* =========================
   ⚒️ Herrero: Maestro (tier 4)
   ========================= */

function openBlacksmithDialog() {
  const el = document.getElementById('npc-dialog');
  const bonus = getToolDurabilityBonusPct();

  const upgradeCosts = {
    axe:  { coins: 90, iron: 6 },
    pick: { coins:110, iron: 8 },
    hoe:  { coins: 80, iron: 5 }
  };

  const tools = [
    { key:'axe',  icon:'🪓', name:'Hacha' },
    { key:'pick', icon:'⛏️', name:'Pico' },
    { key:'hoe',  icon:'🚜', name:'Azadón' }
  ];

  const cards = tools.map(t => {
    const data = game.tools[t.key];
    if (!data) return '';

    const tier = data.tier;
    const baseMax = TIER[tier].max;
    const max = Math.round(baseMax*(1+bonus));
    const dur = data.dur;
    const pct = Math.max(0, Math.min(100, (dur/max)*100));

    const cost = upgradeCosts[t.key];
    const canUpgrade = (tier === 3);

    let status = '';
    if (tier < 3) status = 'Necesita ser de Acero (nivel 3) antes de mejorar.';
    if (tier === 4) status = 'Ya es nivel Maestro. No hay más mejoras.';

    return `
      <div class="card" style="margin-bottom:10px">
        <div class="row space">
          <div>
            <strong>${t.icon} ${t.name}</strong>
            <span class="badge">${TIER[tier].name}</span>
          </div>
          <span class="badge">${dur}/${max}</span>
        </div>
        <div class="progress" style="margin-top:6px;margin-bottom:6px">
          <div style="width:${pct}%"></div>
        </div>
        ${canUpgrade ? `
          <p class="kv">Mejorar a <strong>Maestro</strong>: ${cost.coins} ₥ · ${cost.iron} hierro</p>
          <div class="row space" style="margin-top:8px">
            <button class="btn small" data-upgrade="${t.key}">Forjar nivel Maestro</button>
          </div>
        ` : `
          <p class="kv">${status}</p>
        `}
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="dialog card">
      <h3>⚒️ Herrero</h3>
      <p>Yo no remiendo, yo forjo. Si traes una herramienta de <strong>Acero</strong>, puedo subirla a <strong>Maestro</strong>.</p>
      <hr class="sep"/>
      ${cards || '<p class="kv">No veo herramientas que pueda mejorar.</p>'}
      <div class="kv" style="margin-top:8px">
        <span>Recursos actuales: 💰 ${game.coins} · ⛏️ Hierro: ${game.inv.hierro||0}</span>
      </div>
      <button class="btn ghost small" id="close-dialog">Cerrar</button>
    </div>
  `;

  document.getElementById('close-dialog').onclick = () => {
    el.innerHTML = "";
  };

  el.querySelectorAll('[data-upgrade]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.upgrade;
      const t = game.tools[key];
      if (!t) return;
      if (t.tier !== 3) {
        toast('Solo trabajo herramientas de Acero (nivel 3).');
        return;
      }

      const cost = upgradeCosts[key];
      if (game.coins < cost.coins) {
        toast('Te faltan monedas para esta mejora.');
        return;
      }
      if ((game.inv.hierro||0) < cost.iron) {
        toast('No tienes suficiente hierro refinado.');
        return;
      }

      game.coins -= cost.coins;
      game.inv.hierro -= cost.iron;

      t.tier = 4;
      const baseMax = TIER[4].max;
      const bonusDur = getToolDurabilityBonusPct();
      t.dur = Math.round(baseMax*(1+bonusDur));

      toast(`Tu ${key === 'axe'?'hacha':key==='pick'?'pico':'azadón'} ahora es de nivel Maestro.`);
      openBlacksmithDialog();
    };
  });
}

/* =========================
   🌿 Herbalista: medicina + pociones
   ========================= */

function buffsSummary(){
  const b = game.buffs || {};
  const parts = [];
  if(b.harvestBoost) parts.push(`🌾+${Math.round(b.harvestBoost*100)}%`);
  if(b.chopBoost)    parts.push(`🪵+${Math.round(b.chopBoost*100)}%`);
  if(b.mineBoost)    parts.push(`⛏️+${Math.round(b.mineBoost*100)}%`);
  if(b.sellBoost)    parts.push(`💰+${Math.round(b.sellBoost*100)}%`);
  return parts.join(' · ') || 'Sin pociones activas';
}

function openHerbalistDialog(){
  const el = document.getElementById('npc-dialog');

  const marketPrice = game.market?.prices?.buy?.vet_med;
  const medPrice = marketPrice || game.market?.base?.buy?.vet_med || 18;

  const potions = [
    {
      key:'harvest',
      icon:'🌾',
      name:'Fertilizante místico',
      desc:'+25% a cosechas por 1 día.',
      buffKey:'harvestBoost',
      amount:0.25,
      price:30
    },
    {
      key:'mine',
      icon:'⛏️',
      name:'Elixir del minero',
      desc:'+25% a hierro/minado por 1 día.',
      buffKey:'mineBoost',
      amount:0.25,
      price:30
    },
    {
      key:'sell',
      icon:'💰',
      name:'Tónico del comerciante',
      desc:'+25% a precios de venta por 1 día.',
      buffKey:'sellBoost',
      amount:0.25,
      price:35
    }
  ];

  const buyback = [
    { key:'mushroom',  icon:'🍄', name:'Hongos',        price:4 },
    { key:'herb_lunar',icon:'🌿', name:'Hierba lunar',  price:6 },
    { key:'low_gem',   icon:'💠', name:'Gema pequeña',  price:12 },
    { key:'wolf_pelt', icon:'🐺', name:'Piel de lobo',  price:9 }
  ];

  const potionCards = potions.map(p => `
    <div class="card herb-card">
      <div class="row space">
        <div><strong>${p.icon} ${p.name}</strong></div>
        <span class="badge">${p.price} ₥</span>
      </div>
      <p class="kv">${p.desc}</p>
      <button class="btn small" data-buy-potion="${p.buffKey}">Comprar y usar</button>
    </div>
  `).join('');

  const buybackCards = buyback.map(b => {
    const have = game.inv[b.key] || 0;
    return `
      <div class="card herb-card">
        <div class="row space">
          <div class="kv">
            <span>${b.icon}</span>
            <span>${b.name}</span>
          </div>
          <span class="badge">${b.price} ₥</span>
        </div>
        <div class="row space" style="margin-top:4px">
          <span class="kv">Tienes: ${have}</span>
          <div class="row" style="gap:6px">
            <button class="btn ghost small" data-sell-one="${b.key}" ${have<=0?'disabled':''}>Vender 1</button>
            <button class="btn small" data-sell-all="${b.key}" ${have<=0?'disabled':''}>Todo</button>
          </div>
        </div>
      </div>
    `;
  }).join('') || '<p class="kv">Todavía no traes ingredientes del bosque.</p>';

  el.innerHTML = `
    <div class="dialog card">
      <h3>🌿 Herbalista</h3>
      <p>La naturaleza ayuda a quien sabe pagarle bien...</p>

      <h4>🧪 Medicina animal</h4>
      <p class="kv">Dosis para tus animales. Hoy la tengo a <strong>${medPrice} ₥</strong> por frasco.</p>
      <div class="row space" style="margin-bottom:8px">
        <span class="kv">Tienes: ${game.inv.vet_med||0} frascos</span>
        <button class="btn small" id="buy-vetmed">Comprar 1 frasco</button>
      </div>

      <hr class="sep"/>

      <h4>✨ Pociones para un día</h4>
      <p class="kv">Efecto dura hasta el final del día actual.</p>
      <div class="herb-grid">
        ${potionCards}
      </div>

      <hr class="sep"/>

      <h4>🌿 Te compro ingredientes</h4>
      <p class="kv">Trae lo que encuentres en el bosque y lo pagaré bien.</p>
      <div class="herb-grid">
        ${buybackCards}
      </div>

      <hr class="sep"/>
      <p class="kv"><strong>Pociones activas:</strong> ${buffsSummary()}</p>
      <p class="kv">Monedas: 💰 ${game.coins}</p>

      <button class="btn ghost small" id="close-dialog">Cerrar</button>
    </div>
  `;

  document.getElementById('close-dialog').onclick = () => {
    el.innerHTML = "";
  };

  document.getElementById('buy-vetmed').onclick = () => {
    if (game.coins < medPrice) {
      toast('No tienes suficientes monedas para la medicina.');
      return;
    }
    game.coins -= medPrice;
    game.inv.vet_med = (game.inv.vet_med||0) + 1;
    toast('Compraste 1 frasco de medicina animal.');
    openHerbalistDialog();
  };

  el.querySelectorAll('[data-buy-potion]').forEach(btn => {
    btn.onclick = () => {
      const buffKey = btn.dataset.buyPotion;
      const potion = potions.find(p => p.buffKey === buffKey);
      if (!potion) return;

      if (game.coins < potion.price) {
        toast('No tienes suficientes monedas para esta poción.');
        return;
      }

      game.coins -= potion.price;
      if (!game.buffs) game.buffs = {};
      game.buffs[buffKey] = (game.buffs[buffKey]||0) + potion.amount;

      toast(`Has usado ${potion.name}. El efecto durará hasta el final del día.`);
      openHerbalistDialog();
    };
  });

  el.querySelectorAll('[data-sell-one]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.sellOne;
      const cfg = buyback.find(b => b.key === key);
      if (!cfg) return;
      if ((game.inv[key] || 0) <= 0) {
        toast('No tienes más de ese ingrediente.');
        return;
      }
      game.inv[key] -= 1;
      game.coins += cfg.price;
      toast(`Vendiste 1 ${cfg.name} por ${cfg.price} ₥.`);
      openHerbalistDialog();
    };
  });

  el.querySelectorAll('[data-sell-all]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.sellAll;
      const cfg = buyback.find(b => b.key === key);
      if (!cfg) return;
      const have = game.inv[key] || 0;
      if (have <= 0) {
        toast('No tienes nada para vender.');
        return;
      }
      const total = have * cfg.price;
      game.inv[key] = 0;
      game.coins += total;
      toast(`Vendiste ${have} ${cfg.name} por ${total} ₥.`);
      openHerbalistDialog();
    };
  });
}

/* =========================
   🍞 Panadero
   ========================= */

function openBakerDialog() {
  const el = document.getElementById('npc-dialog');

  const menus = [
    {
      key:'bread',
      icon:'🥖',
      name:'Pan rústico energético',
      desc:'+10% a cosechas durante 3 días.',
      ingredients:{ trigo:3 },
      price:10,
      buffKey:'harvestBoost',
      amount:0.10,
      days:3
    },
    {
      key:'corn_cake',
      icon:'🧁',
      name:'Pastel de maíz',
      desc:'+10% al corte de leña durante 3 días.',
      ingredients:{ maiz:2, eggs:1 },
      price:12,
      buffKey:'chopBoost',
      amount:0.10,
      days:3
    },
    {
      key:'meat_pie',
      icon:'🥧',
      name:'Empanada de carne',
      desc:'+10% a la minería durante 3 días.',
      ingredients:{ meat:1, milk:1 },
      price:15,
      buffKey:'mineBoost',
      amount:0.10,
      days:3
    }
  ];

  function formatIngredients(ing){
    return Object.entries(ing).map(([k,v])=>{
      const icon = k==='trigo'?'🌾':
                   k==='maiz'?'🌽':
                   k==='eggs'?'🥚':
                   k==='milk'?'🥛':
                   k==='meat'?'🍖':'📦';
      const label = k==='trigo'?'trigo':
                    k==='maiz'?'maíz':
                    k==='eggs'?'huevos':
                    k==='milk'?'leche':
                    k==='meat'?'carne':k;
      return `${icon} ${v} ${label}`;
    }).join(' · ');
  }

  const cards = menus.map(m => `
    <div class="card" style="margin-bottom:10px">
      <div class="row space">
        <div>
          <strong>${m.icon} ${m.name}</strong>
        </div>
        <span class="badge">${m.price} ₥</span>
      </div>
      <p class="kv">${m.desc}</p>
      <p class="kv">Ingredientes: ${formatIngredients(m.ingredients)}</p>
      <button class="btn small" data-buy-menu="${m.key}">Pedir y comer aquí</button>
    </div>
  `).join('');

  const b = game.buffs || {};
  const d = game.buffDays || {};
  const currentBuffs = [];
  if(b.harvestBoost) currentBuffs.push(`🌾+${Math.round(b.harvestBoost*100)}% (${d.harvestBoost||0}d)`);
  if(b.chopBoost)    currentBuffs.push(`🪵+${Math.round(b.chopBoost*100)}% (${d.chopBoost||0}d)`);
  if(b.mineBoost)    currentBuffs.push(`⛏️+${Math.round(b.mineBoost*100)}% (${d.mineBoost||0}d)`);
  if(b.sellBoost)    currentBuffs.push(`💰+${Math.round(b.sellBoost*100)}% (${d.sellBoost||0}d)`);

  el.innerHTML = `
    <div class="dialog card">
      <h3>🍞 Panadero</h3>
      <p>El pan caliente da fuerza. Si traes ingredientes y unas monedas, te preparo algo que te rinda mejor varios días.</p>

      <h4>Comidas del día</h4>
      ${cards}

      <hr class="sep"/>
      <p class="kv"><strong>Buffs actuales:</strong> ${currentBuffs.join(' · ') || 'Sin buffs activos'}</p>
      <p class="kv">Recursos: 🌾 ${game.inv.trigo||0} · 🌽 ${game.inv.maiz||0} · 🥚 ${game.inv.eggs||0} · 🥛 ${game.inv.milk||0} · 🍖 ${game.inv.meat||0}</p>
      <p class="kv">Monedas: 💰 ${game.coins}</p>

      <button class="btn ghost small" id="close-dialog">Cerrar</button>
    </div>
  `;

  document.getElementById('close-dialog').onclick = () => {
    el.innerHTML = "";
  };

  el.querySelectorAll('[data-buy-menu]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.buyMenu;
      const menu = menus.find(m => m.key === key);
      if (!menu) return;

      if (game.coins < menu.price) {
        toast('No te alcanza para pagar esta comida.');
        return;
      }

      for (const [res, qty] of Object.entries(menu.ingredients)) {
        if ((game.inv[res]||0) < qty) {
          toast('Te faltan ingredientes para este plato.');
          return;
        }
      }

      game.coins -= menu.price;
      for (const [res, qty] of Object.entries(menu.ingredients)) {
        game.inv[res] = (game.inv[res]||0) - qty;
      }

      if (!game.buffs) game.buffs = {};
      if (!game.buffDays) {
        game.buffDays = { harvestBoost:0, chopBoost:0, mineBoost:0, sellBoost:0 };
      }

      const bk = menu.buffKey;
      const currentAmount = game.buffs[bk] || 0;
      const currentDays   = game.buffDays[bk] || 0;

      const newAmount = Math.min(currentAmount + menu.amount, 0.5);
      game.buffs[bk] = newAmount;
      game.buffDays[bk] = Math.max(currentDays, menu.days);

      toast(`Disfrutas ${menu.name}. Te sentirás un poco más eficiente varios días.`);
      openBakerDialog();
    };
  });
}

/* =========================
   👷 Supervisor de la mina
   ========================= */

function openMineSupervisorDialog() {
  const mineLevel   = game.mineLevel || 1;
  const miningLevel = game.miningLevel || 1;
  const miningXP    = game.miningXP || 0;
  const fatigue     = game.miningFatigue || 0;
  const contract    = game.miningContract || null;
  const season      = game.season || '—';

  let fatigueText =
    fatigue >= 7 ? 'Muy cansado: rindes mucho menos y hay más riesgo.'
  : fatigue >= 5 ? 'Cansado: rindes menos y aumentan los eventos malos.'
  : fatigue >= 3 ? 'Empieza a notarse el cansancio: algo menos de recursos.'
                 : 'Estás bien descansado para seguir bajando.';

  let contractHtml = 'No tienes contrato minero activo todavía.';
  if (contract) {
    contractHtml = `
      Objetivo: ${contract.icon || '⛏️'} entregar <strong>${contract.goal}</strong> ${contract.label || contract.resource}.<br>
      Progreso: <strong>${contract.progress || 0}/${contract.goal}</strong><br>
      Recompensa: <strong>${contract.rewardCoins || 0} ₥${contract.rewardGems ? ' + ' + contract.rewardGems + ' gemas 💠' : ''}</strong><br>
      Estado: <strong>${contract.done ? (contract.claimed ? 'Cobrado' : 'Listo para cobrar') : 'En progreso'}</strong>
    `;
  }

  const gear = (game.miningGear || {});
  const upg  = (game.mineUpgrades || { beams:0, ventilation:0, signage:0 });

  showDialog(`
    <h3>👷 Supervisor de la mina</h3>
    <p class="kv">
      Bienvenido. Yo llevo el registro de tu trabajo bajo tierra.
    </p>

    <p class="kv">
      <strong>Nivel de la mina:</strong> ${mineLevel}<br>
      <strong>Nivel de minero:</strong> ${miningLevel}<br>
      <strong>XP minero actual:</strong> ${miningXP}<br>
      <strong>Acciones de minería hoy:</strong> ${fatigue}
    </p>

    <p class="kv">
      <strong>Fatiga:</strong> ${fatigueText}
    </p>

    <p class="kv">
      <strong>Estación actual:</strong> ${season}
    </p>

    <hr>

    <p class="kv">
      <strong>Equipo minero:</strong><br>
      🪖 Casco: ${gear.helmet ? 'Sí' : 'No'}<br>
      🕯️ Linterna: ${gear.lantern ? 'Sí' : 'No'}<br>
      🧤 Guantes: ${gear.gloves ? 'Sí' : 'No'}<br>
      🛒 Carretilla: ${gear.cart ? 'Sí' : 'No'}
    </p>

    <p class="kv">
      <strong>Mejoras internas de la mina:</strong><br>
      Refuerzo de vigas: nivel ${upg.beams || 0}<br>
      Ventilación: nivel ${upg.ventilation || 0}<br>
      Señalización: nivel ${upg.signage || 0}
    </p>

    <hr>

    <p class="kv">
      <strong>Contrato minero:</strong><br>
      ${contractHtml}
    </p>

    <p class="kv" style="font-size:.85rem">
      Consejo: si quieres cambiar modos, zonas, equipo o reclamar contrato,<br>
      entra directamente en la pestaña de <strong>Mina</strong>.
    </p>

    <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
      <button class="btn small" id="btn-goto-mine">Ir a la mina</button>
    </div>
  `);

  const btnMine = document.getElementById('btn-goto-mine');
  if (btnMine) {
    btnMine.onclick = () => {
      const tab = document.querySelector('.tab[data-tab="mina"]');
      if (tab) tab.click();
    };
  }
}

/* =========================
   🌲 Guardabosques
   ========================= */

function openForestRangerDialog() {
  const lvl   = game.forestLevel || 1;
  const xp    = game.forestXP || 0;
  const fat   = game.forestFatigue || 0;
  const health= game.forestHealth != null ? game.forestHealth : '—';
  const zone  = game.forestZone || 'orilla';
  const route = game.forestRoute || 'seguro';
  const weather = game.forestWeather || 'soleado';
  const contract = game.forestContract || null;
  const gear = game.forestGear || {};

  let fatigueText =
    fat >= 7 ? 'Muy cansado: el rendimiento es bajo.'
  : fat >= 5 ? 'Cansado: quizá convenga descansar pronto.'
  : fat >= 3 ? 'Empiezas a sentir las piernas.'
             : 'Estás con buena energía para seguir.';

  let contractHtml = 'No tienes contrato forestal activo ahora mismo.';
  if (contract) {
    contractHtml = `
      Objetivo: ${contract.icon || '🪵'} entregar <strong>${contract.goal}</strong> ${contract.label || contract.resource}.<br>
      Progreso: <strong>${contract.progress || 0}/${contract.goal}</strong><br>
      Recompensa: <strong>${contract.rewardCoins || 0} ₥${contract.rewardGems ? ' + ' + contract.rewardGems + ' gemas 💠' : ''}</strong><br>
      Estado: <strong>${contract.done ? (contract.claimed ? 'Cobrado' : 'Listo para cobrar') : 'En progreso'}</strong>
    `;
  }

  const forestWeatherLabel = (w) => {
    switch (w) {
      case 'soleado': return 'Soleado ☀️';
      case 'lluvia':  return 'Lluvioso 🌧️';
      case 'niebla':  return 'Niebla 🌫️';
      case 'nublado': return 'Nublado ☁️';
      default: return w;
    }
  };

  showDialog(`
    <h3>🌲 Guardabosques</h3>
    <p class="kv">
      Yo vigilo que el bosque siga vivo mucho después de que tú te vayas.
    </p>

    <p class="kv">
      <strong>Nivel de forestal:</strong> ${lvl}<br>
      <strong>XP acumulada:</strong> ${xp}<br>
      <strong>Acciones hoy:</strong> ${fat}<br>
      <strong>Estado físico:</strong> ${fatigueText}
    </p>

    <p class="kv">
      <strong>Salud del bosque:</strong> ${health === '—' ? '—' : health + '/100'}<br>
      <strong>Zona actual:</strong> ${zone === 'orilla' ? 'Orilla' : zone === 'interior' ? 'Interior denso' : 'Ribera del río'}<br>
      <strong>Ruta elegida:</strong> ${route === 'peligroso' ? 'Atajo peligroso' : 'Camino seguro'}<br>
      <strong>Clima en el bosque:</strong> ${forestWeatherLabel(weather)}
    </p>

    <hr>

    <p class="kv">
      <strong>Equipo forestal:</strong><br>
      🧤 Guantes: ${gear.gloves ? 'Sí' : 'No'}<br>
      🎒 Mochila: ${gear.backpack ? 'Sí' : 'No'}<br>
      🥾 Botas: ${gear.boots ? 'Sí' : 'No'}<br>
      🧥 Capa: ${gear.cloak ? 'Sí' : 'No'}
    </p>

    <p class="kv">
      <strong>Contrato forestal:</strong><br>
      ${contractHtml}
    </p>

    <p class="kv" style="font-size:.85rem">
      Consejo: no todo es talar. Plantar arbolitos y usar bien la fogata mantiene el bosque sano<br>
      y hace que rinda mejor a largo plazo.
    </p>

    <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
      <button class="btn small" id="btn-goto-forest">Ir al bosque</button>
    </div>
  `);

  const btnForest = document.getElementById('btn-goto-forest');
  if (btnForest) {
    btnForest.onclick = () => {
      const tab = document.querySelector('.tab[data-tab="bosque"]');
      if (tab) tab.click();
    };
  }
}

/* =========================
   Diálogo simple genérico
   ========================= */

function showDialog(html) {
  const el = document.getElementById('npc-dialog');
  el.innerHTML = `
    <div class="dialog card">
      ${html}
      <button class="btn ghost small" id="close-dialog">Cerrar</button>
    </div>
  `;
  document.getElementById('close-dialog').onclick = () => {
    el.innerHTML = "";
  };
}
