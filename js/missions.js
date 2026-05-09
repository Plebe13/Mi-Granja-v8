// missions.js
import { game, toast } from './main.js';


const POOL = [
  { key: 'chop',         icon: '🪵', label: 'Talar madera',         unit: 'madera' },
  { key: 'mine',         icon: '⛏️', label: 'Picar hierro',         unit: 'hierro' },
  { key: 'harvest',      icon: '🌾', label: 'Cosechar cultivos',    unit: 'unid.' },
  { key: 'plant',        icon: '🌱', label: 'Plantar semillas',     unit: 'parc.' },
  { key: 'feed',         icon: '🍽️', label: 'Alimentar animales',  unit: 'anim.' },
  { key: 'collect_milk', icon: '🥛', label: 'Recolectar leche',     unit: 'u' },
  { key: 'collect_egg',  icon: '🥚', label: 'Recolectar huevos',    unit: 'u' },
  { key: 'sell',         icon: '💰', label: 'Vender en el mercado', unit: '₥' }
];

function pick(n) {
  const c = [...POOL], out = [];
  while (out.length < n && c.length) {
    out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  }
  return out;
}

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ⚙️ Misiones épicas (para partidas viejas también)
function ensureEpics() {
  if (!game.missions) game.missions = {};
  if (!Array.isArray(game.missions.epics) || !game.missions.epics.length) {
    game.missions.epics = [
      {
        key: 'epic_harvest',
        icon: '🌾',
        label: 'Cosecha magistral',
        desc: 'Cosecha 120 cultivos',
        goal: 120,
        progress: 0,
        reward: { coins: 80, rep: 5 }
      },
      {
        key: 'epic_miner',
        icon: '⛏️',
        label: 'Minero experto',
        desc: 'Consigue 80 de hierro',
        goal: 80,
        progress: 0,
        reward: { coins: 70, rep: 4 }
      },
      {
        key: 'epic_rancher',
        icon: '🐄',
        label: 'Gran ranchero',
        desc: 'Recolecta 30 leche y 30 huevos',
        goal: 60,
        progress: 0,
        reward: { coins: 90, rep: 6 }
      },
      {
        key: 'epic_trader',
        icon: '💰',
        label: 'Comerciante hábil',
        desc: 'Genera 500 ₥ en ventas',
        goal: 500,
        progress: 0,
        reward: { coins: 120, rep: 8 }
      }
    ];
  }
}

export function generateDailyMissions(reset = false) {
  const day = game.day || 1;
  const softUp = Math.floor(day / 7);
  const baseResMin = Math.min(4 + softUp, 9);
  const baseResMax = Math.min(8 + softUp, 12);
  const baseSellMin = Math.min(30 + 10 * softUp, 100);
  const baseSellMax = Math.min(80 + 10 * softUp, 120);

  game.missions.daily = pick(3).map(m => {
    const isSell = m.key === 'sell';
    const goal = isSell
      ? rng(baseSellMin, baseSellMax)
      : rng(baseResMin, baseResMax);

    return {
      key: m.key,
      icon: m.icon,
      label: m.label,
      unit: m.unit,
      goal,
      progress: 0,
      reward: { coins: rng(10, 16) + 2 * softUp, rep: 1 },
      claimed: false
    };
  });

  if (!game.missions.streak) {
    game.missions.streak = { current: 0, best: 0, weeklyRewardReady: false };
  }
  game.missions.streak.todayCompleted = false;
}

// 🔁 Eventos de misiones (diarias + épicas)
export function applyMissionEvent(type, val = 1) {
  // Diarias
  for (const m of (game.missions.daily || [])) {
    if (m.key === type && !m.claimed) {
      m.progress = Math.min(m.goal, m.progress + val);
    }
  }

  // Épicas
  ensureEpics();
  const epics = game.missions.epics || [];

  for (const e of epics) {
    if (e.claimed) continue;

    if (e.key === 'epic_harvest' && type === 'harvest') {
      e.progress = Math.min(e.goal, (e.progress || 0) + val);
    }

    if (e.key === 'epic_miner' && type === 'mine') {
      e.progress = Math.min(e.goal, (e.progress || 0) + val);
    }

    if (
      e.key === 'epic_rancher' &&
      (type === 'collect_milk' || type === 'collect_egg')
    ) {
      e.progress = Math.min(e.goal, (e.progress || 0) + 1);
    }

    // 💰 para cuando conectemos missionEvent('sell', totalVentas)
    if (e.key === 'epic_trader' && type === 'sell') {
      e.progress = Math.min(e.goal, (e.progress || 0) + val);
    }
  }
}

function allDailyClaimed() {
  const d = game.missions.daily || [];
  return d.length > 0 && d.every(m => m.progress >= m.goal && m.claimed);
}

export function endOfDayDailyCheck() {
  const st = game.missions.streak || (game.missions.streak = {
    current: 0,
    best: 0,
    weeklyRewardReady: false
  });

  const ok = allDailyClaimed();
  if (ok) {
    st.current = (st.current || 0) + 1;
    st.best = Math.max(st.best || 0, st.current);
    if (st.current > 0 && st.current % 7 === 0) st.weeklyRewardReady = true;
  } else {
    st.current = 0;
  }
  st.todayCompleted = false;
}

export function renderMissions() {
  const el = document.getElementById('misiones');
  if (!el) return;

  if (!game.missions) game.missions = {};
  if (!game.missions.daily || !game.missions.daily.length) {
    generateDailyMissions(true);
  }
  ensureEpics();

  const daily = game.missions.daily || [];
  const epics = game.missions.epics || [];
  const st = game.missions.streak || { current: 0, best: 0, weeklyRewardReady: false };
  const rep = game.missions.rep || 0;

  // ---- Tarjetas diarias (compactas, 2 columnas) ----
  const dailyCards = daily
    .map((m, i) => {
      const pct = Math.floor((m.progress / m.goal) * 100);
      return `
        <div class="card mission-small">
          <div class="row space">
            <h3>${m.icon} ${m.label}</h3>
            <span class="badge">${m.progress}/${m.goal} ${m.unit}</span>
          </div>
          <p class="kv small-text">
            Recompensa: ${m.reward.coins} ₥ · 🏅 +${m.reward.rep}
          </p>
          <div class="progress"><div style="width:${pct}%"></div></div>
          <button
            class="btn small"
            data-claim="${i}"
            ${m.progress >= m.goal && !m.claimed ? '' : 'disabled'}
          >
            ${m.claimed ? 'Reclamada' : 'Reclamar'}
          </button>
        </div>
      `;
    })
    .join('');

  // ---- Tarjetas épicas (compactas, 2 columnas) ----
  const epicCards = epics
    .map(e => {
      const goal = e.goal || 1;
      const prog = Math.min(goal, e.progress || 0);
      const pct = Math.max(0, Math.min(100, Math.floor((prog / goal) * 100)));
      const done = prog >= goal;
      const claimed = !!e.claimed;
      const disabled = !done || claimed;

      return `
        <div class="card mission-epic">
          <h3>${e.icon} ${e.label}</h3>
          <p class="kv small-text">${e.desc}</p>
          <div class="progress"><div style="width:${pct}%"></div></div>
          <p class="kv small-text">
            Recompensa: ${e.reward.coins} ₥ · 🏅 +${e.reward.rep}
          </p>
          <button
            class="btn small"
            data-epic-claim="${e.key}"
            ${disabled ? 'disabled' : ''}
          >
            ${claimed ? 'Reclamada' : 'Reclamar'}
          </button>
        </div>
      `;
    })
    .join('');

  // ---- Layout general ----
  el.innerHTML = `
    <h2 class="title">Misiones</h2>

    <div class="row space" style="margin-bottom:10px">
      <span class="badge">🏅 Rep: ${rep}</span>
      <span class="badge">🔥 Racha: ${st.current} (Mejor ${st.best || 0})</span>

      <button class="btn gold small" id="btn-weekly" ${
        st.weeklyRewardReady ? '' : 'disabled'
      }>
        Cofre semanal 🎁
      </button>
      <button class="btn ghost small" id="btn-reroll" ${
        game.missions.rerollsLeft > 0 ? '' : 'disabled'
      }>
        ↻ Reroll (1/día)
      </button>
    </div>

    <h3 class="subtitle" style="margin-top:10px">📅 Misiones diarias</h3>
    <div class="grid cols-2" style="gap:12px">
      ${dailyCards}
    </div>

    <h3 class="subtitle" style="margin-top:24px">🌟 Misiones épicas</h3>
    <p class="kv small-text" style="margin-bottom:4px">
      Retos pensados para varios días. Dan buenas recompensas y reputación extra.
    </p>
    <div class="grid cols-2" style="gap:12px">
      ${epicCards}
    </div>
  `;

  // --- Eventos: reroll diario ---
  const btnReroll = document.getElementById('btn-reroll');
  if (btnReroll) {
    btnReroll.onclick = () => {
      if (game.missions.rerollsLeft <= 0) return;
      game.missions.rerollsLeft -= 1;
      generateDailyMissions(true);
      toast('Misiones rerolleadas');
      renderMissions();
    };
  }

  // --- Eventos: cofre semanal ---
  const btnWeekly = document.getElementById('btn-weekly');
  if (btnWeekly) {
    btnWeekly.onclick = () => {
      if (!st.weeklyRewardReady) return;

      const coins = 120 + 10 * (Math.floor(st.current / 7) - 1);
      const repGain = 3;
      const wood = 10;
      const iron = 6;
      const seeds = 4;

      game.coins += coins;
      game.missions.rep = (game.missions.rep || 0) + repGain;
      game.inv.madera = (game.inv.madera || 0) + wood;
      game.inv.hierro = (game.inv.hierro || 0) + iron;
      game.inv.seeds_trigo =
        (game.inv.seeds_trigo || 0) + Math.ceil(seeds / 2);
      game.inv.seeds_maiz =
        (game.inv.seeds_maiz || 0) + Math.floor(seeds / 2);

      st.weeklyRewardReady = false;
      toast(
        `Cofre semanal: +${coins} ₥, +${repGain} rep, ` +
        `🪵+${wood}, ⛏️+${iron}, 🌾+${Math.ceil(seeds / 2)}, 🌽+${Math.floor(
          seeds / 2
        )}`
      );
      renderMissions();
    };
  }

  // --- Reclamación de misiones diarias ---
  el.querySelectorAll('[data-claim]').forEach(btn => {
    btn.onclick = () => {
      const i = +btn.dataset.claim;
      const m = game.missions.daily[i];
      if (!m || m.progress < m.goal || m.claimed) return;

      game.coins += m.reward.coins;
      game.missions.rep = (game.missions.rep || 0) + m.reward.rep;
      m.claimed = true;
      toast('Recompensa recibida');
      renderMissions();
    };
  });

  // --- Reclamación de misiones épicas ---
  el.querySelectorAll('[data-epic-claim]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.epicClaim;
      ensureEpics();
      const e = (game.missions.epics || []).find(x => x.key === key);
      if (!e) return;

      const goal = e.goal || 1;
      const prog = e.progress || 0;
      if (prog < goal) return;
      if (e.claimed) return;

      const coins = e.reward?.coins || 0;
      const repGain = e.reward?.rep || 0;

      game.coins += coins;
      game.missions.rep = (game.missions.rep || 0) + repGain;
      e.claimed = true;

      toast(
        `Has reclamado la misión épica "${e.label}": ` +
        `+${coins} ₥, +${repGain} rep.`
      );
      renderMissions();
    };
  });
}

// Descuentos por reputación (igual que antes)
export function repBuyDiscount() {
  return Math.floor((game.missions.rep || 0) / 5);
}
export function repSellBonus() {
  return Math.floor((game.missions.rep || 0) / 5);
}
