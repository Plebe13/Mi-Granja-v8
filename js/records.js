// records.js
// Panel de Records / Tops personales
import { game } from './main.js';

function fmtNumber(n) {
  return (n || 0).toLocaleString('es-MX');
}

export function renderRecords() {
  const el = document.getElementById('records');
  if (!el) return;

  const stats  = game.stats || {};
  const streak = (game.missions && game.missions.streak) || { current: 0, best: 0 };
  const day    = game.day || 1;

  const cards = [
    {
      icon: '🔥',
      title: 'Mejor racha diaria',
      value: streak.best || 0,
      extra: `Racha actual: ${streak.current || 0} días`
    },
    {
      icon: '💰',
      title: 'Oro total generado en ventas',
      value: fmtNumber(stats.totalGoldEarned || 0) + ' ₥',
      extra: `Mejor día de ventas: ${fmtNumber(stats.maxSingleDaySales || 0)} ₥`
    },
    {
      icon: '🌲',
      title: 'Árboles cortados',
      value: fmtNumber(stats.treesCut || 0),
      extra: 'Suma todo lo talado en el bosque.'
    },
    {
      icon: '⛏️',
      title: 'Rocas picadas',
      value: fmtNumber(stats.rocksMined || 0),
      extra: `Gemas raras encontradas: ${fmtNumber(stats.rareGemsFound || 0)}`
    },
    {
      icon: '🐄',
      title: 'Animales vendidos',
      value: fmtNumber(stats.animalsSold || 0),
      extra: `Animales gorditos vendidos: ${fmtNumber(stats.fatAnimalsSold || 0)}`
    },
    {
      icon: '📆',
      title: 'Día más avanzado',
      value: fmtNumber(day),
      extra: 'Tu día actual es tu mejor marca.'
    }
  ];

  const header = `
    <header class="records-header">
      <h2>📊 Records & Tops</h2>
      <p class="small-text">
        Tus mejores marcas personales en esta partida. Se actualizan automáticamente mientras juegas.
      </p>
    </header>
  `;

  const cardsHtml = cards.map(c => `
    <article class="card record-card">
      <div class="row space">
        <h3>${c.icon} ${c.title}</h3>
      </div>
      <p class="record-value">${c.value}</p>
      <p class="small-text record-extra">${c.extra}</p>
    </article>
  `).join('');

  el.innerHTML = `
    ${header}
    <section class="records-grid grid cols-3">
      ${cardsHtml}
    </section>
  `;
}
