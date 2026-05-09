import { game, TIER, getToolState, toolMult } from './main.js';
import { getToolDurabilityBonusPct } from './achievements.js';

export function renderTools(){
  const el = document.getElementById('herramientas');
  if (!el) return;

  const bonus = getToolDurabilityBonusPct();

  const tools = [
    { key:'axe',  icon:'🪓', name:'Hacha',   role:'Especialista en madera y leña.' },
    { key:'pick', icon:'⛏️', name:'Pico',    role:'Ideal para piedra, hierro y gemas.' },
    { key:'hoe',  icon:'🚜', name:'Azadón',  role:'Optimiza la siembra y las cosechas.' }
  ];

  const cards = tools.map(t => {
    const data = game.tools[t.key];
    if (!data) return '';

    const tier    = data.tier;
    const baseMax = TIER[tier].max;
    const max     = Math.round(baseMax * (1 + bonus));
    const dur     = data.dur;
    const pct     = Math.max(0, Math.min(100, (dur / max) * 100));

    const state = getToolState(t.key);
    const uses  = data.uses || 0;
    const sharpUses = data.sharpUsesLeft || 0;

    const stateLabel =
      state === 'sharp'  ? 'Afilada (+rendimiento)' :
      state === 'dull'   ? 'Desafilada (-rendimiento)' :
      state === 'broken' ? 'Rota (no se puede usar)' :
      'Normal';

    // Maestría por usos
    let affinityLabel = '';
    let nextTargetText = '';
    if (uses >= 300) {
      affinityLabel   = 'Maestría alta';
      nextTargetText  = 'Ya alcanzaste la maestría máxima con esta herramienta.';
    } else if (uses >= 150) {
      affinityLabel   = 'Maestría media';
      nextTargetText  = `Nueva maestría alta en ${300 - uses} usos más.`;
    } else if (uses >= 50) {
      affinityLabel   = 'Maestría básica';
      nextTargetText  = `Maestría media en ${150 - uses} usos más.`;
    } else {
      affinityLabel   = 'Sin maestría todavía';
      nextTargetText  = `Maestría básica en ${Math.max(0, 50 - uses)} usos más.`;
    }

    const mult = toolMult(t.key) || 1;

    const sharpLine = sharpUses > 0
      ? `<p class="kv">Filo especial: <strong>${sharpUses}</strong> usos restantes.</p>`
      : '';

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

        <p class="kv">
          Estado: <strong>${stateLabel}</strong><br>
          Usos totales: <strong>${uses}</strong>
        </p>
        ${sharpLine}

        <p class="kv">
          Maestría: <strong>${affinityLabel}</strong><br>
          <span style="font-size:.85rem;opacity:.85">${nextTargetText}</span>
        </p>

        <p class="kv">
          Rol principal: ${t.role}
        </p>

        <p class="kv">
          Rendimiento actual: <strong>${mult.toFixed(2)}×</strong>
        </p>

        <p class="kv" style="font-size:.85rem;opacity:.9">
          Durabilidad mejorada por logros: ${Math.round(bonus*100)}%
        </p>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="row space">
      <h3>Herramientas</h3>
      <span class="kv">
        Repara y afila en el <strong>Pueblo → Carpintero</strong>,<br>
        mejora a Maestro con el <strong>Herrero</strong>.
      </span>
    </div>

    <p class="kv">
      Tus herramientas suben de nivel contigo: mientras más las uses,
      más rinden. El estado (afilada / desafilada) y la maestría afectan
      directamente el multiplicador de recursos.
    </p>

    ${cards}
  `;
}
