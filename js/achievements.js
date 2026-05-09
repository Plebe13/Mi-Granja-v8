import { game, toast } from './main.js';
const ACH_LIST=[
  { key:'ach_wood_300', icon:'🪵', label:'Leñador veterano', desc:'Tala 300 de madera', type:'chop', goal:300, reward:{coins:40, rep:2}, perk:{sellPct:0.02} },
  { key:'ach_iron_200', icon:'⛏️', label:'Minero legendario', desc:'Pica 200 de hierro', type:'mine', goal:200, reward:{coins:50, rep:2}, perk:{sellPct:0.03} },
  { key:'ach_harv_300', icon:'🌾', label:'Maestro agricultor', desc:'Cosecha 300 cultivos', type:'harvest', goal:300, reward:{coins:60, rep:3}, perk:{sellPct:0.03} },
  { key:'ach_ranch_200', icon:'🐄', label:'Gran criador', desc:'Recolecta 200 (leche+huevos)', type:'ranch', goal:200, reward:{coins:70, rep:3}, perk:{toolDurPct:0.10} },
  { key:'ach_trader_2000', icon:'💰', label:'Comerciante de oro', desc:'Gana 2000 ₥ vendiendo', type:'sell', goal:2000, reward:{coins:80, rep:4}, perk:{sellPct:0.05} },
  { key:'ach_streak_21', icon:'🔥', label:'Racha inquebrantable', desc:'Completa 21 días seguidos', type:'streak', goal:21, reward:{coins:120, rep:5}, perk:{toolDurPct:0.10} }
];
export function migrateAchievements(g){
  if(!g.achievements||!Array.isArray(g.achievements)||g.achievements.length===0){
    g.achievements=ACH_LIST.map(a=>({key:a.key,progress:0,done:false}));
  }else{
    const have=new Set(g.achievements.map(x=>x.key));
    for(const a of ACH_LIST){
      if(!have.has(a.key)) g.achievements.push({key:a.key,progress:0,done:false});
    }
  }
}
function findAch(key){ return ACH_LIST.find(a=>a.key===key); }
function stateAch(key){ return game.achievements.find(a=>a.key===key); }
export function applyAchievementEvent(type,val=1){
  if(!game.achievements||!game.achievements.length) migrateAchievements(game);
  for(const a of ACH_LIST){
    const st=stateAch(a.key); if(st.done) continue;
    if(a.type==='ranch' && (type==='collect_milk'||type==='collect_egg')){
      st.progress=Math.min(a.goal, st.progress+1);
    }else if(a.type===type){
      st.progress=Math.min(a.goal, st.progress+val);
    }
  }
}
export function renderAchievements(){
  if(!game.achievements||!game.achievements.length) migrateAchievements(game);
  const el=document.getElementById('logros');
  const s21=stateAch('ach_streak_21');
  if(s21 && !s21.done){
    s21.progress=Math.min(findAch('ach_streak_21').goal, game.missions?.streak?.best||0);
  }
  const cards=game.achievements.map(st=>{
    const def=findAch(st.key);
    const pct=Math.floor(100*st.progress/def.goal);
    const done=st.progress>=def.goal || st.done;
    const perkTxt=perkToText(def.perk);
    return `<div class="card">
      <div class="row space">
        <h3>${def.icon} ${def.label}</h3>
        <span class="badge">${st.progress}/${def.goal}</span>
      </div>
      <p class="kv">${def.desc}</p>
      <div class="progress"><div style="width:${pct}%"></div></div>
      <div class="row space" style="margin-top:8px">
        <div class="kv">Recompensa: <strong>${def.reward.coins} ₥</strong> · 🏅 +${def.reward.rep} · Bonus: ${perkTxt}</div>
        <button class="btn small" data-claim-ach="${def.key}" ${done&&!st.done?'':'disabled'}>${st.done?'Reclamado':'Reclamar'}</button>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="row space">
    <h3>Logros</h3>
    <div class="kv">Recompensas y <strong>bonos permanentes</strong>.</div>
  </div>
  <div class="grid cols-3">${cards}</div>`;
  el.querySelectorAll('[data-claim-ach]').forEach(b=> b.onclick=()=>{
    const key=b.dataset.claimAch;
    const def=findAch(key); const st=stateAch(key);
    if(!def||!st||st.done||st.progress<def.goal) return;
    st.done=true;
    game.coins+=def.reward.coins;
    game.missions.rep=(game.missions.rep||0)+def.reward.rep;
    if(key==='ach_wood_300') unlockTheme('forest');
    if(key==='ach_iron_200') unlockTheme('forge');
    if(key==='ach_trader_2000') unlockTheme('dawn');
    toast('¡Logro reclamado!');
    renderAchievements();
  });
}
function perkToText(perk){
  const parts=[];
  if(perk.sellPct) parts.push(`+${Math.round(perk.sellPct*100)}% venta`);
  if(perk.toolDurPct) parts.push(`+${Math.round(perk.toolDurPct*100)}% durabilidad`);
  return parts.join(' · ')||'—';
}
function unlockTheme(name){
  if(!game.appearance?.unlocked) game.appearance={theme:'default',unlocked:['default']};
  if(!game.appearance.unlocked.includes(name)) game.appearance.unlocked.push(name);
}
export function getSellBonusPct(){
  if(!game.achievements||!game.achievements.length) return 0;
  let pct=0;
  for(const st of game.achievements){
    if(!st.done) continue;
    const def=findAch(st.key);
    if(def?.perk?.sellPct) pct+=def.perk.sellPct;
  }
  return pct;
}
export function getToolDurabilityBonusPct(){
  if(!game.achievements||!game.achievements.length) return 0;
  let pct=0;
  for(const st of game.achievements){
    if(!st.done) continue;
    const def=findAch(st.key);
    if(def?.perk?.toolDurPct) pct+=def.perk.toolDurPct;
  }
  return pct;
}
