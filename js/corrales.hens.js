// corrales.hens.js
// Módulo dedicado SOLO a gallinas: render, eventos y tick diario.

import { game, toast, getCoopLevel, COOP_LEVELS } from './main.js';

/* ========= Helpers locales solo para gallinas ========= */

function ensureHensShape() {
  if (!game.corrales) game.corrales = { vacas: [], gallinas: [], puercos: [] };
  if (!Array.isArray(game.corrales.gallinas)) game.corrales.gallinas = [];

  game.corrales.gallinas.forEach(g => {
    if (g.age == null)      g.age = 0;
    if (!g.stage)           g.stage = 'adulto';
    if (g.eggs == null)     g.eggs = 0;
    if (g.alive == null)    g.alive = true;
    if (g.fedToday == null) g.fedToday = false;
  });

  if (!game.house) game.house = { level: 1, chest: {}, capacity: 20, coopLevel: 1, coopEggs: 0 };
  if (game.house.coopLevel == null)       game.house.coopLevel = 1;
  if (game.house.coopEggs == null)        game.house.coopEggs = 0;
  if (game.house.coopAutoFeed == null)    game.house.coopAutoFeed = true;
  if (game.house.coopAutoCollect == null) game.house.coopAutoCollect = true;
  if (game.house.coopAutoCull == null)    game.house.coopAutoCull = true;
}

function stageLabelHen(g) {
  if (!g.alive) return 'Muerta';
  if ((g.age || 0) < 8)   return 'Joven';
  if ((g.age || 0) < 30)  return 'Adulta';
  return 'Vieja';
}

/* ========= Render gallinas ========= */

export function renderHensPanel() {
  ensureHensShape();

  const hens   = game.corrales.gallinas.filter(g => g.alive !== false);
  const coopLv = getCoopLevel();
  const coopCfg = COOP_LEVELS[coopLv];
  const h = game.house || {};
  const autoFeed    = !!h.coopAutoFeed;
  const autoCollect = !!h.coopAutoCollect;
  const autoCull    = !!h.coopAutoCull;

  const henList = hens.length
    ? `<ul style="margin-top:8px;line-height:1.5">
        ${hens.map((hen, idx) => {
          const fed    = !!hen.fedToday;
          const color  = fed ? '#bbf7d0' : '#fecaca';
          const status = fed ? '🍽️ alimentada hoy' : '⚠️ falta comida';
          const age    = hen.age || 0;
          const eggs   = hen.eggs || 0;

          return `
            <li style="display:flex;justify-content:space-between;align-items:center;gap:6px">
              <div>
                <span style="color:${color};font-weight:600">hen</span>
                · ${stageLabelHen(hen)} (${age} d)
                ${eggs ? `· 🥚 ${eggs} en nido` : ''}
                · <span style="font-size:.8rem">${status}</span>
              </div>
              <button class="btn small btn-hen-cull" data-hen-index="${idx}">
                Sacrificar
              </button>
            </li>
          `;
        }).join('')}
      </ul>`
    : `<p class="kv">No tienes gallinas.</p>`;

  const feedDisabledAttr = autoFeed ? 'disabled' : '';

  return `
    <div class="card">
      <h3>🐔 Gallinas</h3>
      <p>Huevos diarios. El gallinero se puede automatizar.</p>
      <p class="kv">Cantidad: <strong>${hens.length}</strong> / ${coopCfg.capacity}</p>
      ${henList}

      <div style="margin-top:8px;margin-bottom:4px">
        <button class="btn small" id="btn-feed-hens" ${feedDisabledAttr}>
          Alimentar gallinas (maíz)
        </button>
      </div>
      ${
        autoFeed
          ? `<p class="kv" style="font-size:.75rem">
               La alimentación automática está activa. Desactívala en
               <strong>Mi casa → Gallinero</strong> para usar este botón.
             </p>`
          : ''
      }
      <div style="margin-bottom:8px">
        <button class="btn small" id="btn-collect-eggs-manual">
          Recoger huevos (manual)
        </button>
      </div>

      <hr class="sep"/>

      <h4>Gallinero automático</h4>
      <p class="kv">
        Nivel actual: <strong>${coopLv}</strong> · Capacidad:
        <strong>${coopCfg.capacity}</strong> gallinas.
      </p>
      <p class="kv">
        Huevos en gallinero: <strong>${h.coopEggs || 0}</strong>
        <button class="btn xsmall" id="btn-move-coop-eggs">Pasar al inventario</button>
      </p>
      <p class="kv" style="font-size:.78rem">
        Alimentación auto: <strong>${autoFeed ? 'ON' : 'OFF'}</strong> ·
        Recolección auto: <strong>${autoCollect ? 'ON' : 'OFF'}</strong> ·
        Sacrificio auto: <strong>${autoCull ? 'ON' : 'OFF'}</strong>
      </p>
      <p class="kv" style="font-size:.78rem">
        (Configura estos ajustes en <strong>Mi casa → Gallinero</strong>)
      </p>

      <hr class="sep"/>

      <h4 class="kv">Comprar gallinas</h4>
      <p class="kv">Precio: 12 ₥ cada una.</p>
      <div class="row" style="gap:8px">
        <button class="btn small" id="btn-buy-hen-1">Comprar 1 gallina</button>
        <button class="btn small" id="btn-buy-hen-3">Comprar 3 gallinas</button>
      </div>
    </div>
  `;
}

/* ========= Eventos de gallinas ========= */

export function bindHenEvents(root) {
  if (!root) return;
  ensureHensShape();

  // Alimentar gallinas (sólo si autoFeed está OFF)
  const btnFeed = root.querySelector('#btn-feed-hens');
  if (btnFeed) {
    btnFeed.addEventListener('click', () => {
      ensureHensShape();

      const level = getCoopLevel();
      const house = game.house || {};
      const autoFeed = !!house.coopAutoFeed && level >= 2;

      if (autoFeed) {
        toast('La alimentación automática está activa. Desactívala en Mi casa → Gallinero.');
        return;
      }

      const hens = game.corrales.gallinas.filter(g => g.alive !== false);
      if (!hens.length) {
        toast('No tienes gallinas que alimentar.');
        return;
      }
      let fed = 0;
      hens.forEach(h => {
        if ((game.inv.maiz || 0) > 0 && !h.fedToday) {
          game.inv.maiz -= 1;
          h.fedToday = true;
          fed++;
        }
      });
      if (!fed) {
        toast('No tienes maíz suficiente o ya alimentaste a todas las gallinas.');
        return;
      }
      toast(`Alimentaste ${fed} gallinas.`);
    });
  }

  // Recoger huevos manuales
  const btnCollect = root.querySelector('#btn-collect-eggs-manual');
  if (btnCollect) {
    btnCollect.addEventListener('click', () => {
      ensureHensShape();
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
      toast(`Recogiste ${total} huevos.`);
    });
  }

  // Pasar huevos del gallinero al inventario
  const btnMove = root.querySelector('#btn-move-coop-eggs');
  if (btnMove) {
    btnMove.addEventListener('click', () => {
      ensureHensShape();
      const coopEggs = game.house.coopEggs || 0;
      if (!coopEggs) {
        toast('El gallinero no tiene huevos almacenados.');
        return;
      }
      game.house.coopEggs = 0;
      game.inv.eggs = (game.inv.eggs || 0) + coopEggs;
      toast(`Trasladaste ${coopEggs} huevos del gallinero al inventario.`);
    });
  }

  // Sacrificar gallina individual
  root.querySelectorAll('.btn-hen-cull').forEach(btn => {
    btn.addEventListener('click', () => {
      ensureHensShape();

      const idx = Number(btn.dataset.henIndex);
      const hensAlive = game.corrales.gallinas.filter(g => g.alive !== false);

      if (isNaN(idx) || idx < 0 || idx >= hensAlive.length) {
        toast('No se encontró esa gallina.');
        return;
      }

      const hen = hensAlive[idx];
      const realIndex = game.corrales.gallinas.indexOf(hen);
      if (realIndex >= 0) {
        game.corrales.gallinas.splice(realIndex, 1);
      }

      const meatGain = 1;
      game.inv.meat = (game.inv.meat || 0) + meatGain;

      toast(`Sacrificaste una gallina (${hen.age || 0} d) y obtuviste ${meatGain} carne.`);
    });
  });

  // Comprar gallinas — de momento solo dejamos los handlers,
  // luego los conectaremos con buyAnimals o un helper específico
  const btnBuy1 = root.querySelector('#btn-buy-hen-1');
  const btnBuy3 = root.querySelector('#btn-buy-hen-3');
  if (btnBuy1) {
    btnBuy1.addEventListener('click', () => {
      // Lo conectaremos desde corrales.js (buyAnimals)
      const evt = new CustomEvent('corrales:buy-hens', { detail: { qty: 1 } });
      window.dispatchEvent(evt);
    });
  }
  if (btnBuy3) {
    btnBuy3.addEventListener('click', () => {
      const evt = new CustomEvent('corrales:buy-hens', { detail: { qty: 3 } });
      window.dispatchEvent(evt);
    });
  }
}

/* ========= Tick diario SOLO para gallinas ========= */

export function tickHens() {
  ensureHensShape();

  const hens  = game.corrales.gallinas.filter(g => g.alive !== false);
  const level = getCoopLevel();
  const house = game.house || {};

  const autoFeed    = !!house.coopAutoFeed && level >= 2;
  const autoCollect = !!house.coopAutoCollect && level >= 3;
  const autoCull    = !!house.coopAutoCull && level >= 5;

  // Auto-alimentar al amanecer
  if (autoFeed && hens.length) {
    for (const h of hens) {
      if ((game.inv.maiz || 0) > 0) {
        game.inv.maiz -= 1;
        h.fedToday = true;
      }
    }
  }

  for (const h of hens) {
    h.age   = (h.age || 0) + 1;
    h.stage = stageLabelHen(h).toLowerCase();

    const fed = !!h.fedToday;

    // Producción de huevos
    if (fed && h.alive !== false) {
      if (autoCollect && level >= 3) {
        game.house.coopEggs = (game.house.coopEggs || 0) + 1;
      } else {
        h.eggs = (h.eggs || 0) + 1;
      }
    }

    // Sacrificio automático por vejez
    if (autoCull && h.alive !== false && (h.age || 0) >= 30) {
      h.alive = false;
      game.inv.meat = (game.inv.meat || 0) + 2;
    }
  }

  game.corrales.gallinas = game.corrales.gallinas.filter(g => g.alive !== false);
}
