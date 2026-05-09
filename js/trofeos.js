// trofeos.js
import { game, toast } from './main.js';

/* =========================
   🏆 Estructura base
   ========================= */

function ensureTrophies() {
  if (!game.trophies) {
    game.trophies = [];
  }
  return game.trophies;
}

/**
 * Desbloquea un trofeo si aún no está conseguido.
 * key: id interno único
 * title: nombre visible
 * desc: descripción
 * rarity: 'común' | 'raro' | 'épico' | 'legendario'
 * icon: emoji o pequeño símbolo
 */
export function unlockTrophy(key, title, desc, rarity = 'común', icon = '🏅') {
  const trophies = ensureTrophies();

  if (trophies.some(t => t.key === key)) {
    // ya estaba desbloqueado
    return false;
  }

  trophies.push({
    key,
    title,
    desc,
    rarity,
    icon,
    dayUnlocked: game.day || 1
  });

  toast(`🏆 Nuevo trofeo: ${title}`);
  return true;
}

/* =========================
   🖼️ Render de la sala de trofeos
   ========================= */

function rarityLabel(r) {
  switch (r) {
    case 'raro':        return 'Raro';
    case 'épico':       return 'Épico';
    case 'legendario':  return 'Legendario';
    case 'común':
    default:            return 'Común';
  }
}

function rarityClass(r) {
  switch (r) {
    case 'raro':        return 'rarity-rare';
    case 'épico':       return 'rarity-epic';
    case 'legendario':  return 'rarity-legendary';
    case 'común':
    default:            return 'rarity-common';
  }
}

export function renderTrophies() {
  ensureTrophies();
  const el = document.getElementById('trofeos');
  if (!el) return;

  const trophies = [...game.trophies];

  // orden por rareza y luego por día
  const order = { 'legendario': 0, 'épico': 1, 'raro': 2, 'común': 3 };
  trophies.sort((a, b) => {
    const ra = order[a.rarity] ?? 3;
    const rb = order[b.rarity] ?? 3;
    if (ra !== rb) return ra - rb;
    return (a.dayUnlocked || 0) - (b.dayUnlocked || 0);
  });

  const cards = trophies.length
    ? trophies.map(t => `
        <div class="card trophy-card ${rarityClass(t.rarity)}">
          <div class="row space">
            <div>
              <span class="trophy-icon">${t.icon || '🏅'}</span>
              <strong>${t.title}</strong>
            </div>
            <span class="badge">${rarityLabel(t.rarity)}</span>
          </div>
          <p class="kv small-text">${t.desc}</p>
          <p class="kv tiny-text">
            Día conseguido: <strong>${t.dayUnlocked ?? '—'}</strong>
          </p>
        </div>
      `).join('')
    : `
      <p class="kv">
        Aún no has desbloqueado ningún trofeo.<br>
        Completa misiones, tala árboles, mina rocas y comercia para conseguirlos.
      </p>
    `;

  el.innerHTML = `
    <h2 class="title">Sala de trofeos</h2>
    <p class="kv small-text">
      Aquí se muestran logros especiales de tu granja: récords de ventas,
      producción extrema y hazañas en el bosque y la mina.
    </p>
    <hr class="sep"/>
    <div class="grid cols-3">
      ${cards}
    </div>
  `;
}
