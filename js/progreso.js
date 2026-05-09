// progreso.js
// Panel unificado: Misiones / Logros / Records / Trofeos
// Usa datos reales de `game` cuando existen y cae a DEMO si falta algo.

import { game } from './main.js';

/* ============================================================
   1. DATOS DEMO (solo si no hay info real)
   ============================================================ */
const MISSIONS_DEMO = [
  {
    id:'D001',
    nombre:'Primeros brotes de trigo',
    tipo:'diaria',
    dificultad:'facil',
    zona:'Campo',
    descripcion:'Cosecha 10 unidades de trigo en tus parcelas.',
    estado:'activa',
    objetivo:10,
    progreso:0
  },
  {
    id:'D002',
    nombre:'Leña para el herrero',
    tipo:'diaria',
    dificultad:'media',
    zona:'Bosque',
    descripcion:'Corta 8 árboles pequeños para el taller del herrero.',
    estado:'activa',
    objetivo:8,
    progreso:0
  },
  {
    id:'H003',
    nombre:'La vieja mina',
    tipo:'historia',
    dificultad:'media',
    zona:'Mina',
    descripcion:'Explora la entrada de la mina y limpia los escombros.',
    estado:'completada',
    objetivo:1,
    progreso:1
  }
];

const ACHIEVEMENTS_DEMO = [
  { id:'A001', nombre:'Granjero Novato',     desc:'Cosecha 50 unidades de cualquier cultivo.', progreso:50, objetivo:50, obtenido:true,  categoria:'granja' },
  { id:'A002', nombre:'Leñador Aprendiz',    desc:'Corta 30 árboles en el bosque.',            progreso:18, objetivo:30, obtenido:false, categoria:'bosque' },
  { id:'A003', nombre:'Minero Principiante', desc:'Extrae 40 rocas en la mina.',               progreso:10, objetivo:40, obtenido:false, categoria:'mina' }
];

const RECORDS_DEMO = [
  { icon:'💰', titulo:'Mejor día de ventas',       valor:'420 ₥',       extra:'Día 17 · Mercado de Stoneford' },
  { icon:'🌾', titulo:'Cosecha en un solo día',    valor:'64 cultivos', extra:'Trigo y maíz combinados' },
  { icon:'🔥', titulo:'Racha de misiones diarias', valor:'6 días',      extra:'Sin fallar ninguna' }
];

const TROPHIES_DEMO = [
  { icon:'🥉', nombre:'Festival de la Cosecha', desc:'Participaste en tu primer festival de la cosecha.', rareza:'común' },
  { icon:'🥈', nombre:'Protector del Rebaño',   desc:'Defendiste el corral del ataque de lobos.',        rareza:'raro' },
  { icon:'🥇', nombre:'Campeón del Mercado',    desc:'Vendiste más que nadie en la feria mensual.',      rareza:'épico' }
];

/* ============================================================
   2. ADAPTADORES: convertir game.* a formato visual
   ============================================================ */

// ---- Misiones (usa game.missions.daily de tu sistema) ----
function getMissionsFromGame() {
  const gm = game && game.missions;
  if (!gm) return MISSIONS_DEMO;

  let raw = [];

  // En tu juego lo importante son las diarias
  if (Array.isArray(gm.daily)) raw = raw.concat(gm.daily);

  // Si algún día tienes lista general, también se usa
  if (Array.isArray(gm.list)) raw = raw.concat(gm.list);

  if (!raw.length) return MISSIONS_DEMO;

  return raw.map((m, idx) => {
    const goal     = (typeof m.goal === 'number')     ? m.goal     : (typeof m.target === 'number' ? m.target : 0);
    const progress = (typeof m.progress === 'number') ? m.progress : (typeof m.value  === 'number' ? m.value  : 0);
    const doneFlag = !!(m.completed || m.done);
    const isDone   = doneFlag || (goal > 0 && progress >= goal);

    return {
      id:          m.id || m.code || m.key || ('M' + (idx + 1)),
      nombre:      m.name || m.title || m.label || ('Misión ' + (idx + 1)),
      tipo:        m.kind || m.type || m.category || 'diaria',
      dificultad:  m.diff || m.difficulty || 'media',
      zona:        m.zone || m.area || m.region || '—',
      descripcion: m.desc || m.description || m.text || '—',
      estado:      isDone ? 'completada' : 'activa',
      objetivo:    goal,
      progreso:    progress
    };
  });
}

// ---- Logros ----
function getAchievementsFromGame() {
  const ga = game && game.achievements;
  if (!ga) return ACHIEVEMENTS_DEMO;

  let raw = [];

  if (Array.isArray(ga.list))      raw = ga.list;
  else if (Array.isArray(ga))      raw = ga;
  else if (ga.byId)                raw = Object.values(ga.byId);

  if (!raw.length) return ACHIEVEMENTS_DEMO;

  return raw.map((a, idx) => ({
    id:        a.id || ('A' + (idx + 1)),
    nombre:    a.name || a.title || a.label || ('Logro ' + (idx + 1)),
    desc:      a.desc || a.description || '',
    progreso:  typeof a.progress === 'number' ? a.progress : (a.value || 0),
    objetivo:  typeof a.target   === 'number' ? a.target   : (a.goal  || 1),
    obtenido:  !!(a.completed || a.unlocked || a.done),
    categoria: a.category || a.group || 'general'
  }));
}

// ---- Records (usa game.stats si existe) ----
function getRecordsFromGame() {
  const stats = game && game.stats;
  if (!stats) return RECORDS_DEMO;

  const day           = game.day || stats.day || 1;
  const totalGold     = stats.totalGoldEarned   ?? 0;
  const bestDayGold   = stats.maxSingleDaySales ?? 0;
  const treesCut      = stats.treesCut          ?? 0;
  const rocksMined    = stats.rocksMined        ?? 0;
  const rareGems      = stats.rareGemsFound     ?? 0;
  const missionStreak = stats.missionStreak     ?? (game.missions?.streak?.best || 0);

  return [
    {
      icon:'💰',
      titulo:'Oro total generado',
      valor:`${totalGold.toLocaleString('es-MX')} ₥`,
      extra:`Mejor día de ventas: ${bestDayGold.toLocaleString('es-MX')} ₥`
    },
    {
      icon:'🌲',
      titulo:'Árboles talados',
      valor: treesCut.toLocaleString('es-MX'),
      extra:'Incluye todos los bosques'
    },
    {
      icon:'⛏️',
      titulo:'Rocas picadas',
      valor: rocksMined.toLocaleString('es-MX'),
      extra:`Gemas raras encontradas: ${rareGems.toLocaleString('es-MX')}`
    },
    {
      icon:'🔥',
      titulo:'Mejor racha de misiones',
      valor: `${missionStreak} días`,
      extra:'Misiones diarias completadas sin fallar'
    },
    {
      icon:'📆',
      titulo:'Día más avanzado',
      valor: `Día ${day}`,
      extra:'Tu progreso actual en la partida'
    }
  ];
}

// ---- Trofeos ----
function getTrophiesFromGame() {
  const gt = game && game.trophies;
  if (!gt) return TROPHIES_DEMO;

  let raw = [];
  if (Array.isArray(gt.list)) raw = gt.list;
  else if (Array.isArray(gt)) raw = gt;
  else if (gt.byId)          raw = Object.values(gt.byId);

  if (!raw.length) return TROPHIES_DEMO;

  return raw.map((t, idx) => ({
    icon:   t.icon || '🏆',
    nombre: t.name || t.title || ('Trofeo ' + (idx + 1)),
    desc:   t.desc || t.description || '',
    rareza: t.rarity || t.tier || 'raro'
  }));
}

/* ============================================================
   3. ESTADO INTERNO DEL PANEL
   ============================================================ */

let currentSub = 'misiones';
let missionDiffFilter = null;
let missionSearch = '';

/* ============================================================
   4. RENDER PRINCIPAL
   ============================================================ */

export function renderProgreso() {
  const root = document.getElementById('progreso');
  if (!root) return;

  // Construimos layout sólo una vez
  if (!root.dataset.init) {
    root.dataset.init = '1';
    root.innerHTML = `
      <div class="progreso-root">
        <aside class="progreso-sidebar">
          <h2>Panel de Progreso</h2>
          <p>
            Misiones, logros, records y trofeos en un solo lugar.
          </p>

          <div class="progreso-stat-row">
            <span class="label">Misiones activas</span>
            <span class="value" id="prog-stat-missions-active">0</span>
          </div>
          <div class="progreso-stat-row">
            <span class="label">Misiones completadas</span>
            <span class="value" id="prog-stat-missions-done">0</span>
          </div>
          <div class="progreso-stat-row">
            <span class="label">Logros obtenidos</span>
            <span class="value" id="prog-stat-achievements">0</span>
          </div>
          <div class="progreso-stat-row">
            <span class="label">Trofeos únicos</span>
            <span class="value" id="prog-stat-trophies">0</span>
          </div>

          <div style="margin-top:10px;">
            <span class="progreso-small">Progreso global (estimado):</span>
            <div class="progreso-progress-bar">
              <div class="progreso-progress-fill" id="prog-global-bar"></div>
            </div>
          </div>
        </aside>

        <section class="progreso-main">
          <div class="progreso-header">
            <div>
              <h2 id="prog-title">📜 Misiones</h2>
              <p class="progreso-small" id="prog-subtitle">
                Misiones activas, completadas y especiales (diarias, semanales, historia).
              </p>
            </div>
            <div class="progreso-subtabs">
              <button class="progreso-subtab on" data-sub="misiones">📜 Misiones</button>
              <button class="progreso-subtab" data-sub="logros">🏅 Logros</button>
              <button class="progreso-subtab" data-sub="records">📊 Records</button>
              <button class="progreso-subtab" data-sub="trofeos">🏆 Trofeos</button>
            </div>
          </div>

          <div id="prog-filters"></div>
          <div id="prog-content"></div>
        </section>
      </div>
    `;

    // listeners subtabs internas
    root.querySelectorAll('.progreso-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.progreso-subtab').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        currentSub = btn.dataset.sub || 'misiones';
        renderProgresoView();
      });
    });
  }

  refreshSidebarStats();
  renderProgresoView();
}

/* ============================================================
   5. SIDEBAR
   ============================================================ */

function refreshSidebarStats() {
  const missions     = getMissionsFromGame();
  const achievements = getAchievementsFromGame();
  const trophies     = getTrophiesFromGame();

  const active = missions.filter(m => m.estado === 'activa').length;
  const done   = missions.filter(m => m.estado === 'completada').length;
  const ach    = achievements.filter(a => a.obtenido).length;
  const tro    = trophies.length;

  const root = document.getElementById('progreso');
  if (!root) return;

  root.querySelector('#prog-stat-missions-active').textContent = active;
  root.querySelector('#prog-stat-missions-done').textContent   = done;
  root.querySelector('#prog-stat-achievements').textContent    = ach;
  root.querySelector('#prog-stat-trophies').textContent        = tro;

  const completionRatio = Math.min(
    100,
    Math.round(((ach + done) / (achievements.length + missions.length || 1)) * 100)
  );
  root.querySelector('#prog-global-bar').style.width = completionRatio + '%';
}

/* ============================================================
   6. ROUTER INTERNO
   ============================================================ */

function renderProgresoView() {
  if (currentSub === 'misiones') renderMisionesView();
  if (currentSub === 'logros')   renderLogrosView();
  if (currentSub === 'records')  renderRecordsView();
  if (currentSub === 'trofeos')  renderTrofeosView();
}

/* ============================================================
   7. VISTAS
   ============================================================ */

// --- Misiones ---
function renderMisionesView() {
  const root = document.getElementById('progreso');
  if (!root) return;

  const missions = getMissionsFromGame();

  const titleEl    = root.querySelector('#prog-title');
  const subtitleEl = root.querySelector('#prog-subtitle');
  const filtersEl  = root.querySelector('#prog-filters');
  const contentEl  = root.querySelector('#prog-content');

  titleEl.innerHTML      = '📜 Misiones';
  subtitleEl.textContent = 'Misiones activas, completadas y especiales (diarias, semanales, historia).';

  filtersEl.innerHTML = `
    <div class="progreso-row space">
      <div class="progreso-chips">
        <span class="progreso-chip ${!missionDiffFilter ? 'active':''}" data-diff="all">Todas</span>
        <span class="progreso-chip ${missionDiffFilter==='facil'?'active':''}" data-diff="facil">Fácil</span>
        <span class="progreso-chip ${missionDiffFilter==='media'?'active':''}" data-diff="media">Media</span>
        <span class="progreso-chip ${missionDiffFilter==='dificil'?'active':''}" data-diff="dificil">Difícil</span>
      </div>
      <div class="progreso-search-box">
        🔍
        <input id="prog-mission-search" type="text" placeholder="Buscar misión..." value="${missionSearch}">
      </div>
    </div>
  `;

  let filtered = missions.filter(m => {
    if (missionDiffFilter && missionDiffFilter !== 'all' && m.dificultad !== missionDiffFilter) return false;
    if (!missionSearch) return true;
    const txt = (m.nombre + ' ' + m.descripcion + ' ' + m.zona + ' ' + m.id).toLowerCase();
    return txt.includes(missionSearch.toLowerCase());
  });

  contentEl.innerHTML = `
    <div class="progreso-grid progreso-cols-2">
      ${filtered.map(m => {
        const tipoClass = 'progreso-tag ' + m.tipo;
        const diffClass = 'progreso-diff ' + m.dificultad;
        const estadoBadge = m.estado === 'completada'
          ? '<span class="progreso-badge done">Completada</span>'
          : '<span class="progreso-badge">Activa</span>';

        const goal     = typeof m.objetivo === 'number' ? m.objetivo : 0;
        const prog     = typeof m.progreso === 'number' ? m.progreso : 0;
        const ratio    = goal > 0 ? Math.min(100, Math.round((prog / goal) * 100)) : null;
        const progLine = goal > 0
          ? `<div class="progreso-small" style="margin-top:6px;">Progreso: ${prog}/${goal} (${ratio}%)</div>
             <div class="progreso-progress-bar">
               <div class="progreso-progress-fill" style="width:${ratio}%;"></div>
             </div>`
          : '';

        return `
          <article class="progreso-card">
            <div class="progreso-row space">
              <div>
                <strong>${m.nombre}</strong>
                <div class="progreso-small">#${m.id} · ${m.zona}</div>
              </div>
              <div class="progreso-row">
                <span class="${diffClass}">${m.dificultad}</span>
                ${estadoBadge}
              </div>
            </div>
            <div class="progreso-row" style="margin-top:4px;gap:6px;">
              <span class="${tipoClass}">${m.tipo}</span>
            </div>
            <p class="progreso-small" style="margin-top:4px;">${m.descripcion}</p>
            ${progLine}
          </article>
        `;
      }).join('')}
    </div>
  `;

  // eventos filtros
  const searchInput = root.querySelector('#prog-mission-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      missionSearch = e.target.value;
      renderMisionesView();
    });
  }
  filtersEl.querySelectorAll('.progreso-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const diff = chip.dataset.diff;
      missionDiffFilter = diff === 'all' ? null : diff;
      renderMisionesView();
    });
  });
}

// --- Logros ---
function renderLogrosView() {
  const root = document.getElementById('progreso');
  if (!root) return;

  const achievements = getAchievementsFromGame();

  const titleEl    = root.querySelector('#prog-title');
  const subtitleEl = root.querySelector('#prog-subtitle');
  const filtersEl  = root.querySelector('#prog-filters');
  const contentEl  = root.querySelector('#prog-content');

  titleEl.innerHTML      = '🏅 Logros';
  subtitleEl.textContent = 'Insignias permanentes que ganas al cumplir objetivos a largo plazo.';
  filtersEl.innerHTML    = '';

  contentEl.innerHTML = `
    <div class="progreso-grid progreso-cols-3">
      ${achievements.map(a => {
        const ratio = a.objetivo ? Math.min(100, Math.round((a.progreso / a.objetivo) * 100)) : 0;
        const badge = a.obtenido
          ? '<span class="progreso-badge done">Obtenido</span>'
          : '<span class="progreso-badge lock">En progreso</span>';
        return `
          <article class="progreso-card">
            <div class="progreso-row space">
              <div>
                <strong>${a.nombre}</strong>
                <div class="progreso-small">Objetivo: ${a.objetivo} · ${a.categoria}</div>
              </div>
              ${badge}
            </div>
            <p class="progreso-small" style="margin-top:4px;">${a.desc}</p>
            <div class="progreso-small" style="margin-top:6px;">Progreso: ${a.progreso}/${a.objetivo} (${ratio}%)</div>
            <div class="progreso-progress-bar">
              <div class="progreso-progress-fill" style="width:${ratio}%;"></div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

// --- Records ---
function renderRecordsView() {
  const root = document.getElementById('progreso');
  if (!root) return;

  const records = getRecordsFromGame();

  const titleEl    = root.querySelector('#prog-title');
  const subtitleEl = root.querySelector('#prog-subtitle');
  const filtersEl  = root.querySelector('#prog-filters');
  const contentEl  = root.querySelector('#prog-content');

  titleEl.innerHTML      = '📊 Records';
  subtitleEl.textContent = 'Tus mejores marcas personales en esta partida.';
  filtersEl.innerHTML    = '';

  contentEl.innerHTML = `
    <div class="progreso-grid progreso-cols-3">
      ${records.map(r => `
        <article class="progreso-card">
          <div class="progreso-row space">
            <h3>${r.icon} ${r.titulo}</h3>
          </div>
          <div class="progreso-record-value">${r.valor}</div>
          <p class="progreso-small">${r.extra}</p>
        </article>
      `).join('')}
    </div>
  `;
}

// --- Trofeos ---
function renderTrofeosView() {
  const root = document.getElementById('progreso');
  if (!root) return;

  const trophies = getTrophiesFromGame();

  const titleEl    = root.querySelector('#prog-title');
  const subtitleEl = root.querySelector('#prog-subtitle');
  const filtersEl  = root.querySelector('#prog-filters');
  const contentEl  = root.querySelector('#prog-content');

  titleEl.innerHTML      = '🏆 Trofeos';
  subtitleEl.textContent = 'Premios únicos que recuerdan momentos especiales o eventos limitados.';
  filtersEl.innerHTML    = '';

  contentEl.innerHTML = `
    <div class="progreso-grid progreso-cols-4">
      ${trophies.map(t => `
        <article class="progreso-card" style="text-align:center;">
          <div class="progreso-trophy-icon">${t.icon}</div>
          <div class="progreso-trophy-name">${t.nombre}</div>
          <p class="progreso-small" style="margin-top:4px;">${t.desc}</p>
          <span class="progreso-badge" style="margin-top:4px;">Rareza: ${t.rareza}</span>
        </article>
      `).join('')}
    </div>
  `;
}
