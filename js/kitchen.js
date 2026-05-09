import { game, toast } from './main.js';

function ensureBuffs(){
  if(!game.buffs){
    game.buffs = { harvestBoost:0, chopBoost:0, mineBoost:0, sellBoost:0 };
  }
}
function setBuff(key, value){
  ensureBuffs();
  game.buffs[key] = Math.max(game.buffs[key]||0, value);
}

export function renderKitchen(){
  ensureBuffs();
  const el = document.getElementById('cocina');
  const recipes = [
    { key:'pan',   icon:'🍞', name:'Pan',   desc:'(+20% cosecha hoy)',  cost:[['milk',1],['trigo',2]], effect:()=>setBuff('harvestBoost',0.20) },
    { key:'guiso', icon:'🍲', name:'Guiso', desc:'(+20% talar y mina)', cost:[['meat',1],['maiz',2]],  effect:()=>{ setBuff('chopBoost',0.20); setBuff('mineBoost',0.20);} },
    { key:'tarta', icon:'🥧', name:'Tarta', desc:'(+10% venta hoy)',    cost:[['milk',1],['eggs',1],['trigo',2]], effect:()=>setBuff('sellBoost',0.10) }
  ];
  const makeRow = r => {
    const haveAll = r.cost.every(([k,n]) => (game.inv[k]||0) >= n);
    const costStr = r.cost.map(([k,n])=>`${label(k)} x${n}`).join(' · ');
    return `<div class="card">
      <div class="row space">
        <h3>${r.icon} ${r.name}</h3>
        <span class="badge">${r.desc}</span>
      </div>
      <p class="kv">${costStr}</p>
      <div class="row" style="gap:8px">
        <button class="btn small" data-cook="${r.key}" ${haveAll?'':'disabled'}>Cocinar</button>
      </div>
    </div>`;
  };
  el.innerHTML = `<div class="row space">
    <h3>Cocina</h3>
    <div class="kv">Buffs activos: ${activeBuffsText()}</div>
  </div>
  <div class="grid cols-3">
    ${recipes.map(makeRow).join('')}
    <div class="card">
      <h3>Notas</h3>
      <p class="kv">Los buffs duran hasta final del día. Se usa el mayor valor activo por tipo.</p>
    </div>
  </div>`;
  el.querySelectorAll('[data-cook]').forEach(b=> b.onclick=()=>{
    const recipe = recipes.find(x=>x.key===b.dataset.cook); if(!recipe) return;
    if(!recipe.cost.every(([k,n])=> (game.inv[k]||0)>=n)) return toast('Faltan ingredientes');
    recipe.cost.forEach(([k,n])=> game.inv[k]-=n);
    recipe.effect();
    toast('¡Listo! Buff aplicado para hoy');
    renderKitchen();
  });
}

function activeBuffsText(){
  ensureBuffs();
  const b = game.buffs;
  const parts = [];
  if(b.harvestBoost) parts.push(`🌾 +${Math.round(b.harvestBoost*100)}%`);
  if(b.chopBoost)    parts.push(`🪵 +${Math.round(b.chopBoost*100)}%`);
  if(b.mineBoost)    parts.push(`⛏️ +${Math.round(b.mineBoost*100)}%`);
  if(b.sellBoost)    parts.push(`💰 +${Math.round(b.sellBoost*100)}%`);
  return parts.length? parts.join(' · ') : '—';
}

function label(k){
  return ({
    trigo:'Trigo', maiz:'Maíz', madera:'Madera', hierro:'Hierro',
    milk:'Leche', meat:'Carne', eggs:'Huevos'
  })[k] || k;
}
