// tienda.js
import { game, toast, missionEvent, getBuff } from './main.js';
import { getSellBonusPct } from './achievements.js';

/*
  Sistema de tienda simplificado:
  - dailyMarket() calcula precios del día (compra / venta)
  - renderTienda() dibuja:
    · Panel de resumen mercado
    · Panel de compra
    · Panel de venta
    · Packs básicos
*/

// =============================
// Utilidades de precios
// =============================

function ensureMarketStruct() {
  if (!game.market) {
    game.market = { prices: { buy:{}, sell:{} }, base:{ buy:{}, sell:{} } };
  }
  if (!game.market.base) {
    game.market.base = { buy:{}, sell:{} };
  }
  if (!game.market.prices) {
    game.market.prices = { buy:{}, sell:{} };
  }
  // aseguramos base mínima por si el save es viejo
  const b = game.market.base;
  if (!b.buy)  b.buy = {};
  if (!b.sell) b.sell = {};

  // semillas y medicina
  if (b.buy.seeds_trigo == null) b.buy.seeds_trigo = 2;
  if (b.buy.seeds_maiz  == null) b.buy.seeds_maiz  = 3;
  if (b.buy.vet_med     == null) b.buy.vet_med     = 18;

  // ventas básicas
  if (b.sell.trigo   == null) b.sell.trigo   = 2;
  if (b.sell.maiz    == null) b.sell.maiz    = 3;
  if (b.sell.madera  == null) b.sell.madera  = 1;
  if (b.sell.hierro  == null) b.sell.hierro  = 4;
  if (b.sell.milk    == null) b.sell.milk    = 4;
  if (b.sell.meat    == null) b.sell.meat    = 6;
  if (b.sell.eggs    == null) b.sell.eggs    = 2;

  // bosque / herbalista
  if (b.sell.mushroom   == null) b.sell.mushroom   = 3;
  if (b.sell.herb_lunar == null) b.sell.herb_lunar = 6;
  if (b.sell.wolf_pelt  == null) b.sell.wolf_pelt  = 8;
  if (b.sell.low_gem    == null) b.sell.low_gem    = 10;
}

function weatherSellMult() {
  // pequeño efecto según clima general del juego
  const w = game.weather?.type || 'soleado';
  switch (w) {
    case 'lluvia':   return 1.05;
    case 'tormenta': return 1.10;
    case 'nublado':  return 0.98;
    default:         return 1.0;
  }
}

// =============================
// Cálculo diario de mercado
// =============================

export function dailyMarket() {
  ensureMarketStruct();

  const baseBuy  = game.market.base.buy;
  const baseSell = game.market.base.sell;

  const sellBuff   = getBuff('sellBoost') || 0;
  const repBonus   = (typeof getSellBonusPct === 'function') ? getSellBonusPct() : 0;
  const weatherMul = weatherSellMult();

  const prices = { buy:{}, sell:{} };

  // precios de compra (lo que el jugador paga)
  Object.keys(baseBuy).forEach(k => {
    const base = baseBuy[k];
    // fluctuación 90%–120%
    const randMult = 0.9 + Math.random() * 0.3;
    prices.buy[k] = Math.max(1, Math.round(base * randMult));
  });

  // precios de venta (lo que el jugador cobra)
  Object.keys(baseSell).forEach(k => {
    const base = baseSell[k];
    let mult = 0.9 + Math.random() * 0.25; // variación ligera
    mult *= (1 + sellBuff + repBonus);
    mult *= weatherMul;
    prices.sell[k] = Math.max(1, Math.round(base * mult));
  });

  game.market.prices = prices;
}

// =============================
// Helpers de UI
// =============================

const LABELS = {
  trigo:        'Trigo',
  maiz:         'Maíz',
  madera:       'Madera',
  hierro:       'Hierro',
  milk:         'Leche',
  meat:         'Carne',
  eggs:         'Huevos',
  seeds_trigo:  'Semillas de trigo',
  seeds_maiz:   'Semillas de maíz',
  vet_med:      'Medicina animal',
  mushroom:     'Hongos',
  herb_lunar:   'Hierba lunar',
  wolf_pelt:    'Piel de lobo',
  low_gem:      'Gema pequeña'
};

const ICONS = {
  trigo:        '🌾',
  maiz:         '🌽',
  madera:       '🪵',
  hierro:       '⛏️',
  milk:         '🥛',
  meat:         '🍖',
  eggs:         '🥚',
  seeds_trigo:  '🌱',
  seeds_maiz:   '🌱',
  vet_med:      '💊',
  mushroom:     '🍄',
  herb_lunar:   '🌿',
  wolf_pelt:    '🐺',
  low_gem:      '💠'
};

function label(key) {
  return LABELS[key] || key;
}
function icon(key) {
  return ICONS[key] || '📦';
}

function ensureInvKey(key) {
  if (!game.inv) game.inv = {};
  if (game.inv[key] == null) game.inv[key] = 0;
}

// =============================
// Packs básicos
// =============================

function getPacks(prices) {
  const buy = prices.buy || {};
  const seedsT = buy.seeds_trigo || 2;
  const seedsM = buy.seeds_maiz  || 3;

  const farmerBase = seedsT * 3 + seedsM * 2;

  return [
    {
      key: 'pack_farmer',
      icon: '🌾',
      name: 'Pack agricultor',
      desc: 'Un pequeño impulso para tus campos.',
      price: farmerBase * 4,
      gain: { seeds_trigo: 4, seeds_maiz: 3 }
    },
    {
      key: 'pack_rancher',
      icon: '🐄',
      name: 'Pack ranchero',
      desc: 'Medicina y algo de grano.',
      price: 40,
      gain: { vet_med: 2, maiz: 5 }
    }
  ];
}

function buyPack(pack) {
  if (!pack) return;
  if (game.coins < pack.price) {
    toast('No tienes monedas suficientes para este pack.');
    return;
  }
  game.coins -= pack.price;
  Object.entries(pack.gain).forEach(([k, v]) => {
    ensureInvKey(k);
    game.inv[k] += v;
  });
  toast(`Compras el ${pack.name}.`);
  missionEvent('buy', pack.price);
}

// =============================
// Render principal
// =============================

export function renderTienda() {
  ensureMarketStruct();
  const el = document.getElementById('tienda');
  if (!el) return;

  const prices = game.market.prices || { buy:{}, sell:{} };
  const packs  = getPacks(prices);

  // lista de compra
  const buyRows = Object.entries(prices.buy)
    .map(([k, p]) => {
      return `
        <div class="row space kv" style="margin-top:4px">
          <div>
            <strong>${icon(k)} ${label(k)}</strong>
          </div>
          <div class="row" style="gap:6px;align-items:center">
            <span style="font-size:.85rem">💰 ${p} ₥</span>
            <button class="btn xsmall" data-buy="${k}" data-qty="1">x1</button>
            <button class="btn xsmall ghost" data-buy="${k}" data-qty="5">x5</button>
          </div>
        </div>
      `;
    }).join('') || '<p class="kv">No hay nada a la venta hoy.</p>';

  // lista de venta (solo lo que tienes y tenga precio)
  const sellRows = Object.entries(prices.sell)
    .filter(([k]) => (game.inv?.[k] || 0) > 0)
    .map(([k, p]) => {
      const have = game.inv[k] || 0;
      return `
        <div class="row space kv" style="margin-top:4px">
          <div>
            <strong>${icon(k)} ${label(k)}</strong>
            <span style="font-size:.8rem;color:var(--muted)">x${have}</span>
          </div>
          <div class="row" style="gap:6px;align-items:center">
            <span style="font-size:.8rem">💰 ${p} ₥ c/u</span>
            <button class="btn xsmall" data-sell="${k}" data-qty="1">Vender 1</button>
            <button class="btn xsmall ghost" data-sell="${k}" data-qty="${have}">Vender todo</button>
          </div>
        </div>
      `;
    }).join('') || '<p class="kv">No tienes recursos que la tienda quiera comprar ahora mismo.</p>';

  // packs
  const packRows = packs.map(pk => `
    <div class="card" style="margin-top:6px">
      <div class="row space">
        <div><strong>${pk.icon} ${pk.name}</strong></div>
        <div>💰 ${pk.price} ₥</div>
      </div>
      <p class="kv" style="font-size:.85rem;margin-top:4px">${pk.desc}</p>
      <p class="kv" style="font-size:.8rem">
        Contiene:
        ${Object.entries(pk.gain).map(([k,v]) => `${v}× ${label(k)}`).join(', ')}
      </p>
      <button class="btn small" data-pack="${pk.key}">Comprar pack</button>
    </div>
  `).join('');

  el.innerHTML = `
    <h2 class="title">Tienda del pueblo</h2>

    <div class="grid cols-3">

      <div class="card">
        <h3>Resumen de mercado</h3>
        <p class="kv">
          Hoy los precios fluctúan un poco según el clima y tu reputación.<br>
          <span style="font-size:.85rem;color:var(--muted)">
            Revisa las cantidades antes de comprar o vender en grande.
          </span>
        </p>
        <p class="kv" style="margin-top:8px">
          Monedas actuales: <strong>${game.coins} ₥</strong>
        </p>
      </div>

      <div class="card">
        <h3>Comprar</h3>
        <p class="kv">Gastas monedas para conseguir recursos.</p>
        ${buyRows}
      </div>

      <div class="card">
        <h3>Vender</h3>
        <p class="kv">Convierte tus recursos en monedas.</p>
        ${sellRows}
      </div>

    </div>

    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h3>Packs especiales</h3>
        <p class="kv">Pequeños combos de recursos con descuento fijo.</p>
        ${packRows || '<p class="kv">No hay packs disponibles hoy.</p>'}
      </div>

      <div class="card">
        <h3>Notas del comerciante</h3>
        <p class="kv" style="font-size:.9rem">
          Más adelante podremos añadir contratos, encargos especiales y ofertas
          limitadas del mercado. Por ahora, céntrate en aprovechar bien los
          precios del día.
        </p>
      </div>
    </div>
  `;

  bindShopEvents(el, packs);
}

// =============================
// Eventos de compra / venta
// =============================

function bindShopEvents(root, packs) {
  // Comprar
  root.querySelectorAll('[data-buy]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.buy;
      const qty = parseInt(btn.dataset.qty || '1', 10);
      if (!key || !qty) return;

      const pricePer = game.market.prices.buy[key];
      if (!pricePer) {
        toast('Este artículo no tiene precio de compra fijo.');
        return;
      }

      const total = pricePer * qty;
      if (game.coins < total) {
        toast('No tienes suficientes monedas para esa compra.');
        return;
      }

      game.coins -= total;
      ensureInvKey(key);
      game.inv[key] += qty;

      toast(`Compras ${qty}× ${label(key)} por ${total} ₥.`);
      missionEvent('buy', total);
    };
  });

  // Vender
  root.querySelectorAll('[data-sell]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.sell;
      const qty = parseInt(btn.dataset.qty || '1', 10);
      if (!key || !qty) return;

      ensureInvKey(key);
      const have = game.inv[key] || 0;
      if (have <= 0) {
        toast('No tienes nada de ese recurso.');
        return;
      }

      const sellQty = Math.min(qty, have);
      const pricePer = game.market.prices.sell[key] || 0;
      if (!pricePer) {
        toast('Ahora mismo nadie quiere comprar ese recurso.');
        return;
      }

      const total = pricePer * sellQty;
      game.inv[key] -= sellQty;
      game.coins += total;

      toast(`Vendes ${sellQty}× ${label(key)} por ${total} ₥.`);
      missionEvent('sell', total);
    };
  });

  // Packs
  root.querySelectorAll('[data-pack]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.pack;
      const pack = packs.find(p => p.key === key);
      buyPack(pack);
      // refrescamos la tienda para actualizar monedas e inventario
      renderTienda();
    };
  });
}
