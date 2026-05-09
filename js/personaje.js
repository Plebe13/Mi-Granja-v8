// personaje.js
import { game, toast, refreshHud } from './main.js';


/* =========================
   Utilidades básicas
   ========================= */

function pct(val, max) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((val / max) * 100)));
}

function safe(val, def = 0) {
  return val == null ? def : val;
}

/* =========================
   💎 Definición de GEMAS
   ========================= */

const GEM_DEFS = {
  gem_farm_small: {
    key: 'gem_farm_small',
    label: 'Gema agrícola pequeña',
    icon: '🌾💎',
    bonus: {
      agricultura: 2
    }
  },
  gem_mine_small: {
    key: 'gem_mine_small',
    label: 'Gema minera pequeña',
    icon: '⛏️💎',
    bonus: {
      mineria: 2
    }
  },
  gem_trade_small: {
    key: 'gem_trade_small',
    label: 'Gema mercader pequeña',
    icon: '💰💎',
    bonus: {
      comercio: 2
    }
  }
};

/* =========================
   🧿 Tabla de BONOS por pieza de equipo
   ========================= */

const EQUIP_STAT_TABLE = {
  weapon: {
    knife_rustic: { fuerza: 1 }
  },
  armor: {
    armor_leather: { defensa: 2 }
  },
  helmet: {
    // futuro
  },
  boots: {
    // futuro
  },
  gloves: {
    // futuro
  },
     cape: {
     // 🆕 capa con bono mixto
     cloak_traveler: { defensa: 1, comercio: 1 }
   },
   ring: {
     ring_farmer: { agricultura: 2 }
   },
   amulet: {
     // 🆕 amuleto de comercio
     amulet_luck: { comercio: 2 }
   },
  backpack: {
    backpack_simple: { comercio: 1 }
  },
  axe: {
    axe_basic: { ranchero: 1 }
  },
  pick: {
    pick_basic: { mineria: 1 }
  },
  hoe: {
    hoe_basic: { agricultura: 1 }
  }
};

/* mapping slot → id base del item (para el mini equip/quitar) */
const SLOT_ITEM_ID = {
  weapon:   'knife_rustic',
  armor:    'armor_leather',
  helmet:   null,
  boots:    null,
  gloves:   null,

  // 🆕 ahora estos slots sí tienen pieza asociada
  cape:     'cloak_traveler',
  ring:     'ring_farmer',
  amulet:   'amulet_luck',

  backpack: 'backpack_simple',
  axe:      'axe_basic',
  pick:     'pick_basic',
  hoe:      'hoe_basic'
};

/* =========================
   🎯 Estado de la forja de gemas
   ========================= */

let forgeTarget = 'ring';              // ring | amulet | cloak
let forgeGem    = 'gem_farm_small';    // gem_farm_small | gem_mine_small | gem_trade_small

/* =========================
   🔢 Bonos de stats (equipo + gemas)
   ========================= */

function getEquipStatBonus() {
  const eqEquip   = game.equipment || {};
  const eqSockets = game.equip || {};
  const bonus = {
    fuerza: 0,
    defensa: 0,
    agricultura: 0,
    ranchero: 0,
    mineria: 0,
    comercio: 0
  };

  // 1️⃣ Bonos por pieza equipada (armas, armadura, etc.)
  for (const slot in EQUIP_STAT_TABLE) {
    const itemId = eqEquip[slot];
    if (!itemId) continue;
    const byItem = EQUIP_STAT_TABLE[slot];
    const cfg = byItem[itemId];
    if (!cfg) continue;

    for (const stat in cfg) {
      bonus[stat] += cfg[stat];
    }
  }

    // 2️⃣ Bonos por GEMAS en sockets (ring / amulet / cloak)
  ['ring', 'amulet', 'cloak'].forEach(slotName => {
    // 👇 solo cuenta si tienes algo equipado en ese slot
    const equippedItemId = eqEquip[slotName];
    if (!equippedItemId) return;

    const slotObj = eqSockets[slotName];
    if (!slotObj || !Array.isArray(slotObj.sockets)) return;

    slotObj.sockets.forEach(sock => {
      if (!sock || sock.state !== 'ok' || !sock.gemId) return;
      const g = GEM_DEFS[sock.gemId];
      if (!g || !g.bonus) return;
      for (const stat in g.bonus) {
        bonus[stat] += g.bonus[stat];
      }
    });
  });

  return bonus;
}

// Pequeño cálculo de “nivel global” RPG basado en progreso real
function getGlobalLevel() {
  const s = game.stats || {};
  const rep = game.missions?.rep || 0;
  const trees = s.treesCut || 0;
  const rocks = s.rocksMined || 0;
  const animals = s.animalsSold || 0;
  const base = rep * 2 + trees / 10 + rocks / 10 + animals / 5;
  return Math.max(1, Math.floor(1 + base / 10));
}

// Stats “RPG” derivados del progreso real + equipo + gemas
function getRpgStats() {
  const s = game.stats || {};
  const corr = game.corrales || {};
  const vacas = (corr.vacas || []).length;
  const gallinas = (corr.gallinas || []).length;
  const puercos = (corr.puercos || []).length;
  const campos = (game.campos || []).length;
  const rep = game.missions?.rep || 0;
  const tools = game.tools || {};
  const axeTier = tools.axe?.tier || 1;
  const pickTier = tools.pick?.tier || 1;
  const hoeTier = tools.hoe?.tier || 1;

  // base por progreso del mundo
  const base_fuerza   = 5 + axeTier + pickTier;
  const base_defensa  = 4 + (game.house?.level || 1);
  const base_agri     = 4 + campos + Math.floor((s.treesCut || 0) / 30);
  const base_ranch    = 3 + vacas + Math.floor((gallinas + puercos) / 2);
  const base_mineria  = 3 + safe(game.miningLevel, 1) + Math.floor((s.rocksMined || 0) / 25);
  const base_comercio = 2 + Math.floor((s.totalGoldEarned || 0) / 150) + Math.floor(rep / 4);

  // sumamos equipo + gemas
  const eqBonus = getEquipStatBonus();

  return {
    fuerza:      base_fuerza   + eqBonus.fuerza,
    defensa:     base_defensa  + eqBonus.defensa,
    agricultura: base_agri     + eqBonus.agricultura,
    ranchero:    base_ranch    + eqBonus.ranchero,
    mineria:     base_mineria  + eqBonus.mineria,
    comercio:    base_comercio + eqBonus.comercio,
    _equipBonus: eqBonus
  };
}

/* =========================
   Render principal
   ========================= */

export function renderPersonaje() {
  const el = document.getElementById('personaje');
  if (!el) return;

  const name = game.playerName || 'Aldeano';
  const rep = game.missions?.rep || 0;
  const streak = game.missions?.streak?.current || 0;
  const bestStreak = game.missions?.streak?.best || 0;
  const totalAch = (game.achievements || []).length;

  const lvlGlobal = getGlobalLevel();
  const rpg = getRpgStats();
  const equipBonus = rpg._equipBonus || {
    fuerza: 0, defensa: 0, agricultura: 0, ranchero: 0, mineria: 0, comercio: 0
  };

  // barras de HP/energía con valores por defecto si no existen
  const hp        = game.hp ?? 80;
  const hpMax     = game.hpMax ?? 80;
  const energy    = game.energy ?? 12;
  const energyMax = game.energyMax ?? 12;

  const xpCur = rep * 10 + totalAch * 5;
  const xpMax = (lvlGlobal + 1) * 60;

  // hora / día / estación
  const day = game.day ?? 1;
  const mins = game.minutes ?? 0;
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  const seasonText = game.season || '—';

  // Texto dinámico “Bonos del equipo” (equipo + gemas)
  const bonusLines = [];
  if (equipBonus.fuerza)      bonusLines.push(`💪 Fuerza +${equipBonus.fuerza}`);
  if (equipBonus.defensa)     bonusLines.push(`🛡️ Defensa +${equipBonus.defensa}`);
  if (equipBonus.agricultura) bonusLines.push(`🌾 Agricultura +${equipBonus.agricultura}`);
  if (equipBonus.ranchero)    bonusLines.push(`🐄 Ranchero +${equipBonus.ranchero}`);
  if (equipBonus.mineria)     bonusLines.push(`⛏️ Minería +${equipBonus.mineria}`);
  if (equipBonus.comercio)    bonusLines.push(`💰 Comercio +${equipBonus.comercio}`);

  const equipBonusHtml = bonusLines.length
    ? `<ul class="char-bonus-list">
        ${bonusLines.map(line => `<li>${line}</li>`).join('')}
       </ul>
       <p class="small-text" style="margin-top:4px;">
         Incluye <strong>equipo</strong> y <strong>gemas en sockets</strong> (si las tienes).
       </p>`
    : `<p class="small-text" style="margin:4px 0 0;">
         Aún no tienes equipo especial ni gemas que modifiquen tus stats.
       </p>`;

  const socketsText = getSocketsInfoString(forgeTarget);

  el.innerHTML = `
    <div class="char-page-header">
      <h2 class="title">Personaje</h2>
      <p class="subtitle">
        Resumen RPG del aldeano + slots de equipo para armas, armadura, accesorios y gemas.
      </p>
    </div>

    <div class="char-grid">
      <!-- COLUMNA IZQUIERDA: RESUMEN + BONOS + RESUMEN RPG -->
      <div class="char-left">
        <!-- RESUMEN -->
        <div class="card char-summary">
          <div class="char-header">
            <div class="char-avatar">👨‍🌾</div>
            <div class="char-header-main">
              <div class="char-name">${name}</div>
              <div class="char-role">Aldeano de Renaissance Town</div>
              <div class="char-meta">
                <span>⚔️ Nivel ${lvlGlobal}</span>
                <span>🏅 Reputación ${rep}</span>
                <span>🔥 Racha ${streak}/${bestStreak}</span>
                <span>🎖️ Logros ${totalAch}</span>
              </div>
            </div>
          </div>

          <!-- barras HP / energía / EXP -->
          <div class="char-bars">
            <div class="char-bar-row">
              <span>Salud</span>
              <div class="char-bar">
                <div class="char-bar-fill char-bar-health" style="width:${pct(hp, hpMax)}%;"></div>
              </div>
              <span class="char-bar-val">${hp} / ${hpMax}</span>
            </div>
            <div class="char-bar-row">
              <span>Energía</span>
              <div class="char-bar">
                <div class="char-bar-fill char-bar-energy" style="width:${pct(energy, energyMax)}%;"></div>
              </div>
              <span class="char-bar-val">${energy} / ${energyMax}</span>
            </div>
            <div class="char-exp-row">
              <span>Experiencia global</span>
              <div class="char-bar char-bar-exp">
                <div class="char-bar-fill char-bar-exp-fill" style="width:${pct(xpCur, xpMax)}%;"></div>
              </div>
              <span class="char-bar-val">${xpCur} / ${xpMax}</span>
            </div>
          </div>

          <!-- stats principales -->
          <div class="char-stats">
            <div class="char-stat">
              <span>💪 Fuerza</span>
              <strong>${rpg.fuerza}</strong>
            </div>
            <div class="char-stat">
              <span>🛡️ Defensa</span>
              <strong>${rpg.defensa}</strong>
            </div>
            <div class="char-stat">
              <span>🌾 Agricultura</span>
              <strong>${rpg.agricultura}</strong>
            </div>
            <div class="char-stat">
              <span>🐄 Ranchero</span>
              <strong>${rpg.ranchero}</strong>
            </div>
            <div class="char-stat">
              <span>⛏️ Minería</span>
              <strong>${rpg.mineria}</strong>
            </div>
            <div class="char-stat">
              <span>💰 Comercio</span>
              <strong>${rpg.comercio}</strong>
            </div>
          </div>

          <!-- día / hora / estación abajo del resumen -->
          <div class="kv" style="margin-top:6px;font-size:.78rem;justify-content:space-between;">
            <span>📅 Día <strong>${day}</strong> · ⏰ <strong>${hh}:${mm}</strong></span>
            <span>☁️ Estación: <strong>${seasonText}</strong></span>
          </div>
        </div>

        <!-- FILA INFERIOR IZQUIERDA: BONOS DEL EQUIPO + RESUMEN RPG -->
        <div class="grid char-bottom-grid">
          <!-- BONOS DEL EQUIPO -->
          <div class="card char-bonuses">
            <div class="row space">
              <h3>Bonos del equipo</h3>
              <span class="char-equip-sum small-text">
                Impacto directo de tu equipamiento y gemas
              </span>
            </div>
            ${equipBonusHtml}
          </div>

          <!-- RESUMEN RPG -->
          <div class="card char-rpg">
            <h3>Resumen RPG</h3>
            <p class="small-text">
              Este panel se conectará con:
            </p>
            <ul class="char-rpg-list">
              <li>Misiones diarias / épicas</li>
              <li>Logros y trofeos</li>
              <li>Herrero / Carpintero</li>
              <li>Comercio y ventas</li>
            </ul>

            <p class="small-text" style="margin-top:6px">
              La idea es que aquí veas de un vistazo:
              <strong>quién eres, qué llevas puesto y qué bonos tienes activos.</strong>
            </p>

            <div class="char-rpg-tags">
              <button class="btn small ghost">Vista general</button>
              <button class="btn small ghost">+Reputación</button>
              <button class="btn small ghost">Buffs pasivos</button>
              <button class="btn small ghost">Mejor equipo</button>
              <button class="btn small ghost">+Ventas</button>
            </div>
          </div>
        </div>
      </div>

      <!-- COLUMNA DERECHA: EQUIPAMIENTO / SLOTS + FORJA -->
      <div class="card char-equip-card">
        <div class="char-equip-header">
          <h3>Equipamiento</h3>
          <span class="char-equip-sub">
            Haz clic en un slot para equipar/quitar (usa piezas que tengas en el inventario).
          </span>
        </div>

        <!-- COMBATE / ARMADURA -->
        <div class="char-equip-section">
          <div class="char-equip-section-title">COMBATE / ARMADURA</div>
          <div class="slot-grid">
            ${renderSlot('weapon','Arma','🗡️','Cuchillo rústico','Daño +1')}
            ${renderSlot('armor','Armadura','🧥','Chaleco de cuero','Defensa +2')}
            ${renderSlot('helmet','Casco',null,null,'Protege la cabeza')}
            ${renderSlot('boots','Botas',null,null,'Velocidad / bosque')}
            ${renderSlot('gloves','Guantes',null,null,'Mejor trabajo fino')}
            ${renderSlot('cape','Capa',null,null,'Clima / resistencia')}
          </div>
        </div>

        <hr class="sep" />

        <!-- ACCESORIOS / HERRAMIENTAS -->
        <div class="char-equip-section">
          <div class="char-equip-section-title">ACCESORIOS / HERRAMIENTAS</div>
          <div class="slot-grid">
            ${renderSlot('ring','Anillo','💍','Anillo del granjero','Bonos de cosecha')}
            ${renderSlot('amulet','Amuleto','🔮',null,'Bonos especiales')}
            ${renderSlot('backpack','Mochila','🎒','Mochila simple','+espacio inventario')}
            ${renderSlot('axe','Hacha','🪓','Hacha básica','Tala x1.0')}
            ${renderSlot('pick','Pico','⛏️','Pico básico','Mina x1.0')}
            ${renderSlot('hoe','Azadón','🚜','Azadón básico','Campo x1.0')}
          </div>
        </div>

        <!-- Bolsillos rápidos -->
        <div class="char-quickbar">
          <div class="char-quickbar-title">Bolsillos rápidos / accesos directos</div>
          <div class="char-quickbar-row">
            <div class="quick-slot">1 · 🥖 Pan (+vida)</div>
            <div class="quick-slot">2 · 🧪 Poción energía</div>
            <div class="quick-slot">3 · 🍄 Hongos</div>
            <div class="quick-slot quick-slot-empty">4 · Vacío</div>
          </div>
        </div>

        <!-- ⚒️ Mesa del herrero – Engarce de gemas -->
        <div class="char-forge" style="margin-top:10px;border-top:1px dashed rgba(255,255,255,0.1);padding-top:8px;">
          <div class="row space">
            <h3>⚒️ Mesa del herrero — Gemas</h3>
            <span class="small-text">
              💠 low_gem: ${game.inv?.low_gem || 0} · 💰 ${game.coins} ₥ · ⛏️ hierro: ${game.inv?.hierro || 0}
            </span>
          </div>
          <p class="small-text">
            Usa <strong>gemas pequeñas</strong> del bosque para mejorar tu anillo, amuleto o capa.
            Cada intento puede <strong>éxito</strong> (socket con gema) o <strong>fallo</strong> (socket roto).
          </p>

          <div class="row" style="gap:12px;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:220px;">
              <div class="small-text" style="margin-bottom:4px;">Pieza objetivo</div>
              <div class="char-rpg-tags forge-targets">
                <button class="btn small ghost forge-target-btn" data-target="ring">Anillo</button>
                <button class="btn small ghost forge-target-btn" data-target="amulet">Amuleto</button>
                <button class="btn small ghost forge-target-btn" data-target="cloak">Capa</button>
              </div>
              <div class="small-text" id="forge-sockets-state" style="margin-top:6px;">
                ${socketsText}
              </div>
            </div>

            <div style="flex:1;min-width:220px;">
              <div class="small-text" style="margin-bottom:4px;">Tipo de gema</div>
              <div class="char-rpg-tags forge-gems">
                <button class="btn small ghost forge-gem-btn" data-gem="gem_farm_small">🌾 Agricultura</button>
                <button class="btn small ghost forge-gem-btn" data-gem="gem_mine_small">⛏️ Minería</button>
                <button class="btn small ghost forge-gem-btn" data-gem="gem_trade_small">💰 Comercio</button>
              </div>

              <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap;">
                <button class="btn small" id="btn-forge-socket">Engarzar 1 gema</button>
                <button class="btn small ghost" id="btn-clean-socket">Limpiar socket roto</button>
              </div>

              <p class="small-text" style="margin-top:4px;">
                Coste engarce: <strong>1x 💠 low_gem + 1x ⛏️ hierro + 12 ₥</strong> · 
                Éxito: ~70%. Fallo: socket <strong>roto</strong>.
              </p>
              <p class="small-text" style="margin-top:2px;">
                Limpiar socket roto: <strong>1x 🌿 hierba lunar + 8 ₥</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="char-footer-note small-text">
      Pestaña <strong>Personaje</strong> conectada al equipo real del juego.
      Las piezas equipadas y las gemas en sockets modifican tus stats.
      La mesa del herrero usa recursos reales (<em>low_gem, hierro, hierba lunar</em>) para engarzar gemas.
    </p>
  `;

  setupEquipEvents(el);
  setupForgeEvents(el);
}

/* =========================
   Slots visuales
   ========================= */

function renderSlot(slotKey, label, icon, defaultName, desc) {
  const eq = game.equipment || {};
  const itemId = eq[slotKey] || null;
  const filled = !!itemId;

  const iconHtml = filled && icon ? icon : '—';
  const nameHtml = filled && defaultName ? defaultName : 'Vacío';
  const emptyClass = filled ? '' : ' slot-empty';

  return `
    <div class="slot" data-slot="${slotKey}">
      <div class="slot-label">${label}</div>
      <div class="slot-icon${emptyClass}">${iconHtml}</div>
      <div class="slot-name${emptyClass}">${nameHtml || 'Vacío'}</div>
      <div class="slot-desc">${desc || ''}</div>
    </div>
  `;
}

/* =========================
   🎯 Mini sistema equipar/quitar
   ========================= */

function setupEquipEvents(root) {
  const eq = game.equipment || (game.equipment = {});
  if (!game.inv) game.inv = {};

  root.querySelectorAll('.slot[data-slot]').forEach(slotEl => {
    const slotKey = slotEl.dataset.slot;
    const itemId = SLOT_ITEM_ID[slotKey];

    // Slots que aún no tienen pieza asociada (casco, botas, etc.)
    if (!itemId) return;

    slotEl.onclick = () => {
      const currentlyEquipped = eq[slotKey];

      if (currentlyEquipped) {
        // 🔄 Quitar → la pieza vuelve al inventario
        game.inv[itemId] = (game.inv[itemId] || 0) + 1;
        eq[slotKey] = null;
        toast('Guardas esa pieza en el inventario.');
      } else {
        // 🧩 Equipar → solo si tienes al menos 1 en el inventario
        if ((game.inv[itemId] || 0) <= 0) {
          toast('No tienes esa pieza en el inventario.');
          return;
        }
        game.inv[itemId] -= 1;
        if (game.inv[itemId] < 0) game.inv[itemId] = 0;
        eq[slotKey] = itemId;
        toast('Equipas esa pieza.');
      }

      // Redibujamos la hoja de personaje
      renderPersonaje();
	  // 🔁 y actualizamos el HUD superior (hacha/pico/azada)
      refreshHud();
    };
  });
}



/* =========================
   ⚒️ Forja de gemas: helpers
   ========================= */

function getSocketsFor(target) {
  if (!game.equip) game.equip = {};
  if (!game.equip[target]) {
    game.equip[target] = {
      id: null,
      sockets: [
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null },
        { state: 'empty', gemId: null }
      ]
    };
  }
  const slot = game.equip[target];
  if (!Array.isArray(slot.sockets)) {
    slot.sockets = [
      { state: 'empty', gemId: null },
      { state: 'empty', gemId: null },
      { state: 'empty', gemId: null }
    ];
  } else if (slot.sockets.length < 3) {
    while (slot.sockets.length < 3) {
      slot.sockets.push({ state: 'empty', gemId: null });
    }
  }
  return slot.sockets;
}

function getSocketsInfoString(target) {
  const sockets = getSocketsFor(target);
  // ○ vacío, ● ok, ✖ roto
  const mapIcon = s => {
    if (s.state === 'ok') return '●';
    if (s.state === 'broken') return '✖';
    return '○';
  };
  const icons = sockets.map(mapIcon).join(' ');
  return `Sockets ${target}: ${icons}`;
}

/* =========================
   ⚒️ Forja de gemas: UI + lógica
   ========================= */

function setupForgeEvents(root) {
  // activar el botón del target actual
  root.querySelectorAll('.forge-target-btn').forEach(btn => {
    const target = btn.dataset.target;
    if (target === forgeTarget) {
      btn.classList.add('on');
    } else {
      btn.classList.remove('on');
    }
    btn.onclick = () => {
      forgeTarget = target;
      renderPersonaje();
    };
  });

  // activar el botón de la gema actual
  root.querySelectorAll('.forge-gem-btn').forEach(btn => {
    const g = btn.dataset.gem;
    if (g === forgeGem) {
      btn.classList.add('on');
    } else {
      btn.classList.remove('on');
    }
    btn.onclick = () => {
      forgeGem = g;
      renderPersonaje();
    };
  });

  // botón engarzar
  const btnForge = root.querySelector('#btn-forge-socket');
  if (btnForge) {
    btnForge.onclick = () => {
      doForgeAttempt();
    };
  }

  // botón limpiar
  const btnClean = root.querySelector('#btn-clean-socket');
  if (btnClean) {
    btnClean.onclick = () => {
      doCleanBrokenSocket();
    };
  }
}

function doForgeAttempt() {
  if (!game.inv) game.inv = {};

  // 🆕 asegurarnos de que la pieza objetivo está equipada
  const eqEquip = game.equipment || {};
  if (!eqEquip[forgeTarget]) {
    toast('Primero equipa la pieza antes de engarzar gemas.');
    return;
  }

  const lowGem = game.inv.low_gem || 0;
  const hierro = game.inv.hierro || 0;
  const coins  = game.coins || 0;


  const costGem   = 1;
  const costIron  = 1;
  const costCoins = 12;

  if (lowGem < costGem)  return toast('Te falta 💠 low_gem para engarzar.');
  if (hierro < costIron) return toast('Te falta ⛏️ hierro para el engarce.');
  if (coins < costCoins) return toast('Te faltan monedas para pagar al herrero.');

  const sockets = getSocketsFor(forgeTarget);
  const idx = sockets.findIndex(s => s.state === 'empty');
  if (idx === -1) {
    return toast('No hay sockets libres en esa pieza.');
  }

  // pagar coste
  game.inv.low_gem -= costGem;
  game.inv.hierro  -= costIron;
  game.coins       -= costCoins;

  const successChance = 0.7;
  const ok = Math.random() < successChance;

  if (ok) {
    sockets[idx] = { state: 'ok', gemId: forgeGem };
    const gemDef = GEM_DEFS[forgeGem];
    toast(`La gema ha quedado engarzada con éxito. ${gemDef ? gemDef.label : ''}`);
  } else {
    sockets[idx] = { state: 'broken', gemId: null };
    toast('El engarce ha fallado y el socket ha quedado roto.');
  }

  renderPersonaje();
}

function doCleanBrokenSocket() {
  if (!game.inv) game.inv = {};
  const herb  = game.inv.herb_lunar || 0;
  const coins = game.coins || 0;

  const costHerb  = 1;
  const costCoins = 8;

  if (herb < costHerb)  return toast('Te falta 🌿 hierba lunar para limpiar la gema.');
  if (coins < costCoins) return toast('Te faltan monedas para la limpieza.');

  const sockets = getSocketsFor(forgeTarget);
  const idx = sockets.findIndex(s => s.state === 'broken');
  if (idx === -1) {
    return toast('No hay sockets rotos en esa pieza.');
  }

  // pagar
  game.inv.herb_lunar -= costHerb;
  game.coins          -= costCoins;

  sockets[idx] = { state: 'empty', gemId: null };
  toast('El socket roto ha sido limpiado y vuelve a estar disponible.');

  renderPersonaje();
}
