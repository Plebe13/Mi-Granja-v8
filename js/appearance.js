import { game, toast } from './main.js';
const THEMES=[
  { key:'default', name:'Clásico', class:'theme-default', preview:'🎨' },
  { key:'forest',  name:'Templo verde', class:'theme-forest', preview:'🌿' },
  { key:'forge',   name:'Forja de hierro', class:'theme-forge', preview:'⚙️' },
  { key:'dawn',    name:'Amanecer dorado', class:'theme-dawn', preview:'🌅' }
];
export function applyThemeFromSave(){
  const body=document.body;
  body.classList.remove(...THEMES.map(t=>t.class));
  const t=(game.appearance?.theme)||'default';
  const def=THEMES.find(x=>x.key===t)||THEMES[0];
  body.classList.add(def.class);
}
export function renderAppearance(){
  if(!game.appearance) game.appearance={theme:'default',unlocked:['default']};
  const el=document.getElementById('apariencia');
  const items = THEMES.map(t=>{
    const locked=!(game.appearance.unlocked||[]).includes(t.key);
    const current=game.appearance.theme===t.key;
    return `<div class="card">
      <h3>${t.preview} ${t.name}</h3>
      <p class="kv">${locked? 'Bloqueado — completa ciertos logros' : 'Disponible'}</p>
      <div class="row space">
        <span class="badge">${t.key}</span>
        <button class="btn small" data-apply="${t.key}" ${locked||current?'disabled':''}>Aplicar</button>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="row space">
    <h3>Apariencia</h3>
    <div class="kv">Cambia el tema visual. Algunos se desbloquean con logros.</div>
  </div>
  <div class="grid cols-3">${items}</div>`;
  el.querySelectorAll('[data-apply]').forEach(b=> b.onclick=()=>{
    game.appearance.theme=b.dataset.apply;
    applyThemeFromSave();
    toast('Tema aplicado');
    renderAppearance();
  });
}
