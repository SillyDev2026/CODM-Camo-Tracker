import { GROUPS, WEAPONS, BY_ID, GROUP_BY_ID, BASIC_CAMOS, COMPLETIONIST, STARTER_GOLD, goldTotal, completedCount, progressFor, weaponCompletion, loadSeasonalWeapons, AETHER_KILLS, AETHER_MATCHES } from './catalog.js?v=1.8.0';
import { loadState, saveState, cleanState, cleanProfile, createProfile } from './storage.js?v=1.8.0';
import { readCloudProfile, writeCloudProfile } from './github.js?v=1.8.0';
import { hasSavedToken, saveTokenVault, unlockTokenVault, forgetTokenVault } from './token-vault.js?v=1.8.0';
import { seasonView, focusView, decorateWeaponCards } from './enhancements.js?v=1.8.0';
import { CAMO_STEPS, camoObjective, camoFamilyProgress, applyCamoChange, confirmCamoFamily, totalCamoStages } from './camo-challenges.js?v=1.8.0';
// Optional 3D/Gunsmith code is loaded only when a user opens a build.

const $ = id => document.getElementById(id);
const symbols = { smg: '⌁', ar: '╱', lmg: '≡', sniper: '⌖', marksman: '⊹', shotgun: '⋈', pistol: '⟐', melee: '╳', launcher: '✳' };
const tileSymbols = { gold: '✦', platinum: '⬡', damascus: '✧', diamond: '◇' };
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const pct = (current, total) => total ? clamp(current / total * 100, 0, 100) : 0;
const lastUpdated = entry => Number(entry.updatedAt) || 0;
let state;
let currentView = 'weapons';
let activeCategory = null;
let currentMode = 'mp';
let seasonStatus = {added:0,upcoming:[]};
let seasonOffline = false;
let currentFilter = 'all';
let seasonLoading = false;
let lastSeasonRefresh = 0;
let selectedId = null;
let saveTimer;
let toastTimer;
let activeDialog = null;
let gunsmith = null;
let gunsmithPromise = null;
let buildRequest = 0;
let cloudBusy = false;
let activeCamoFamily = 'Sand';

function saveViewPreference(){try{localStorage.setItem('camovault-view-v1',JSON.stringify({mode:currentMode,category:activeCategory}));}catch{}}
function restoreViewPreference(){try{const v=JSON.parse(localStorage.getItem('camovault-view-v1')||'null');if(v?.mode==='zombies')currentMode='zombies';if(v?.category && GROUP_BY_ID.has(v.category)){activeCategory=v.category;currentView='category';}}catch{}}
async function refreshSeasonCatalog(notify=false){
 if(seasonLoading)return;
 seasonLoading=true;seasonView(seasonStatus,seasonOffline,true);
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const fresh=await loadSeasonalWeapons((url,options)=>fetch(url,{...options,signal:controller.signal}));
  seasonStatus=fresh;lastSeasonRefresh=Date.now();seasonOffline=false;renderDashboard();
  if(notify)toast('Verified season roster checked');
 }
 catch(error){seasonOffline=true;console.warn('Season refresh failed',error);if(notify)toast('Offline: your saved camos are still available');}
 finally{clearTimeout(timer);seasonLoading=false;seasonView(seasonStatus,seasonOffline,false);}
}
function profile() { return state.profiles.find(item => item.id === state.activeProfileId) || state.profiles[0]; }
function progress() { return profile().progress; }
function entry(id) { return progressFor(progress(), id); }
function toast(message, duration = 2600) {
  const node = $('toast'); node.textContent = message;
  node.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), duration);
}
function setSaveBadge(text, hasError = false) {
  const node = $('saveStatus'); node.innerHTML = `<span class="live-dot"></span> ${safe(text)}`;
  node.classList.toggle('error', hasError);
}
function persist(debounce = false) {
  setSaveBadge('Saving…');
  clearTimeout(saveTimer);
  saveTimer = null;
  const write = async () => {
    try { const provider = await saveState(state); setSaveBadge(provider === 'indexeddb' ? 'Saved locally' : 'Saved (fallback)'); }
    catch { setSaveBadge('Save failed — export now', true); toast('Saving failed. Export a backup immediately.', 5200); }
  };
  if (debounce) saveTimer = setTimeout(() => { saveTimer = null; void write(); }, 350);
  else void write();
}
function mutate(id, apply, repaintDrawer = false, debounce = false) {
  if (!BY_ID.has(id)) return;
  const draft = { ...entry(id), base: { ...(entry(id).base || {}) }, camoChallenges: { ...(entry(id).camoChallenges || {}) }, zombies: { ...(entry(id).zombies || {}) } };
  apply(draft);
  draft.updatedAt = Date.now();
  profile().progress[id] = draft;
  persist(debounce); renderDashboard();
  if (repaintDrawer && selectedId === id) renderDrawer();
}
function renderNavigation() {
  $('categoryNav').innerHTML = GROUPS.map(group => `<button type="button" class="side-link ${currentView === 'category' && activeCategory === group.id ? 'active' : ''}" data-category="${group.id}"><span class="side-ico">${symbols[group.id]}</span><span>${safe(group.name)}</span><span class="count">${group.weapons.split('|').length}</span></button>`).join('');
  $('categoryChips').innerHTML = `<button type="button" class="category-chip ${activeCategory === null ? 'active' : ''}" data-nav="weapons"><span>All weapons</span><strong>${WEAPONS.length}</strong></button>` + GROUPS.map(group => `<button type="button" class="category-chip ${activeCategory === group.id ? 'active' : ''}" data-category="${group.id}"><span>${safe(group.short)}</span><strong>${currentMode === 'zombies' ? WEAPONS.filter(w=>w.category===group.id && aetherEligible(w) && aether(w).aetherCrystal).length : goldTotal(progress(),group.id)}/${currentMode === 'zombies' ? WEAPONS.filter(w=>w.category===group.id && aetherEligible(w)).length : group.weapons.split('|').length}</strong></button>`).join('');
  document.querySelectorAll('[data-nav]').forEach(button => { if (!button.classList.contains('category-chip')) button.classList.toggle('active', button.dataset.nav === currentView); });
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===currentMode);b.setAttribute('aria-pressed',String(b.dataset.mode===currentMode));});
  $('breadcrumb').textContent = currentMode==='zombies'?'ZOMBIES':currentView==='category'?GROUP_BY_ID.get(activeCategory).short:'WEAPONS';
}
function statCard(label, count, caption, css, icon, target = WEAPONS.length) {
  return `<div class="stat-card"><div class="stat-label">${label} <span class="stat-miniicon">${icon}</span></div><div class="stat-big ${css}">${count}<span style="font-size:16px;color:#708580">/${target}</span></div><div class="stat-desc">${caption}</div><div class="stat-progress"><span style="width:${pct(count, target)}%"></span></div></div>`;
}
function aetherEligible(w){return Object.prototype.hasOwnProperty.call(AETHER_KILLS,w.category);}
function aether(w){return entry(w.id).zombies||{};}
function renderStats(){
  if(currentMode==='zombies'){
    const pool=WEAPONS.filter(aetherEligible),n=pool.length,done=pool.filter(w=>aether(w).aetherCrystal).length;
    const started=pool.filter(w=>Number(aether(w).matches)>0&&!aether(w).aetherCrystal).length,wins=pool.reduce((sum,w)=>sum+clamp(Number(aether(w).matches)||0,0,AETHER_MATCHES),0);
    $('statsGrid').innerHTML=[
      statCard('AETHER CRYSTAL',done,'Confirmed Zombies unlocks','diamond','✧',n),
      statCard('IN PROGRESS',started,'Weapons with qualified wins','gold','◈',n),
      statCard('ELIGIBLE WEAPONS',n,'Known Aether weapon classes','platinum','⌖',WEAPONS.length),
      statCard('QUALIFIED MATCHES',wins,'Total weapon-match credits','damascus','↗',Math.max(wins,n*AETHER_MATCHES))
    ].join('');return;
  }
  const p=progress();
  $('statsGrid').innerHTML=[
    statCard('GOLD UNLOCKED',completedCount(p,'gold'),'Gold on individual weapons','gold','✦'),
    statCard('PLATINUM UNLOCKED',completedCount(p,'platinum'),'Personally confirmed unlocks','platinum','⬡'),
    statCard('DIAMOND UNLOCKED',completedCount(p,'diamond'),'Individual weapon mastery','diamond','◇'),
    statCard('DAMASCUS UNLOCKED',completedCount(p,'damascus'),'Personally confirmed unlocks','damascus','✧')
  ].join('');
}
function renderSeasonBanner(){
  const node=$('seasonBanner'),incoming=seasonStatus.upcoming||[];
  if(incoming.length){
    const w=incoming[0],day=new Date(w.releaseAt).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/Los_Angeles'});
    node.innerHTML=`<strong>UPCOMING:</strong> ${safe(w.name)} (${safe(GROUP_BY_ID.get(w.category).short)}) joins the tracker ${safe(day)}. <a href="${safe(w.source)}" target="_blank" rel="noopener noreferrer">Official news ↗</a>`;
  }else if(seasonStatus.added)node.textContent=`Seasonal catalog loaded: ${seasonStatus.added} new weapon(s).`;
  else if(seasonOffline)node.textContent='Offline roster active. Reconnect to check for seasonal weapons.';
  else{node.hidden=true;return;}
  node.hidden=false;
}
function matchesFilter(w){
  const e=entry(w.id);
  if(currentMode==='zombies'){
    if(!aetherEligible(w))return false;
    const z=aether(w),started=Boolean(z.aetherCrystal||Number(z.matches)>0);
    if(currentFilter==='gold')return Boolean(z.aetherCrystal);
    if(currentFilter==='inprogress')return started&&!z.aetherCrystal;
    if(currentFilter==='unstarted')return !started;
    if(currentFilter==='favorites')return Boolean(e.favorite);
  if(currentFilter==='season')return Boolean(w.season);
  if(currentFilter==='recent')return Number(e.updatedAt||0)>0;
    return true;
  }
  const started=Boolean(e.gold||e.platinum||e.damascus||e.diamond||(e.level>0)||(e.diamondCount>0)||Object.values(e.base||{}).some(Boolean));
  if(currentFilter==='gold')return Boolean(e.gold);
  if(currentFilter==='inprogress')return started&&!e.gold;
  if(currentFilter==='unstarted')return !started;
  if(currentFilter==='favorites')return Boolean(e.favorite);
  if(currentFilter==='season')return Boolean(w.season);
  if(currentFilter==='recent')return Number(e.updatedAt||0)>0;
  return true;
}
function getVisibleWeapons() {
  const search = $('weaponSearch').value.trim().toLocaleLowerCase();
  const sort = $('sortBy').value;
  let visible = WEAPONS.filter(weapon => (!activeCategory || weapon.category === activeCategory) && weapon.name.toLocaleLowerCase().includes(search) && matchesFilter(weapon));
  if (sort === 'az') visible = visible.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'progress') visible = visible.sort((a, b) => currentMode==='zombies'?clamp(Number(aether(b).matches)||0,0,AETHER_MATCHES)-clamp(Number(aether(a).matches)||0,0,AETHER_MATCHES):weaponCompletion(entry(b.id))-weaponCompletion(entry(a.id)));
  if (sort === 'recent') visible = visible.sort((a, b) => lastUpdated(entry(b.id)) - lastUpdated(entry(a.id)));
  if (sort === 'level') visible = visible.sort((a, b) => (entry(b.id).level || 0) - (entry(a.id).level || 0));
  if (sort === 'newest') visible = visible.sort((a,b)=>Number(Boolean(b.season))-Number(Boolean(a.season)) || a.name.localeCompare(b.name));
  if (currentFilter === 'recent') visible = visible.sort((a,b)=>lastUpdated(entry(b.id))-lastUpdated(entry(a.id)));
  return visible;
}
function renderWeaponGrid() {
  const visible = getVisibleWeapons();
  const title = activeCategory ? GROUP_BY_ID.get(activeCategory).name : currentMode==='zombies'?'Zombies weapons':'All weapons';
  $('completedFilter').textContent=currentMode==='zombies'?'Aether ✓':'Gold ✓';
  $('weaponsTitle').childNodes[0].textContent = `${title} `;
  $('weaponCount').textContent = visible.length.toString().padStart(2, '0');
  $('weaponGrid').innerHTML = visible.map(weapon => {
    const e = entry(weapon.id);
    const tags = currentMode==='zombies'?(aether(weapon).aetherCrystal?'<span class="weapon-pill aether">AETHER CRYSTAL</span>':''):COMPLETIONIST.filter(key=>e[key]).map(key=>`<span class="weapon-pill ${key}">${safe(key.toUpperCase())}</span>`).join('');
    const rank=currentMode==='zombies'?clamp(Number(aether(weapon).matches)||0,0,AETHER_MATCHES):weaponCompletion(e);
    const max=currentMode==='zombies'?AETHER_MATCHES:10;
    const level = Number(e.level) > 0 ? `LVL ${e.level}${e.maxLevel ? `/${e.maxLevel}` : ''}` : 'LEVEL NOT SET';
    return `<button class="weapon-card" type="button" data-weapon="${weapon.id}" aria-label="Edit ${safe(weapon.name)} camo progress"><div class="weapon-card-top"><span class="weapon-class-label">${GROUP_BY_ID.get(weapon.category).short}</span><span class="favorite-symbol ${e.favorite ? 'on' : ''}">${e.favorite ? '★' : '☆'}</span></div><div class="weapon-title" title="${safe(weapon.name)}">${safe(weapon.name)}</div><div class="weapon-tags">${tags || '<span class="weapon-pill">NOT COMPLETED</span>'}</div><div class="weapon-level">${safe(level)}</div><div class="progress-track weapon-meter"><div class="progress-fill" style="width:${pct(rank,max)}%"></div></div><div class="weapon-card-footer"><span>${rank}/${max} ${currentMode==='zombies'?'QUALIFYING WINS':'CAMO MILESTONES'}</span><span class="arrow">↗</span></div></button>`;
  }).join('');
  $('emptyState').hidden = visible.length > 0;
  $('emptyState').querySelector('p').textContent=currentMode==='zombies'&&activeCategory&&!aetherEligible({category:activeCategory})?'No verified Aether Crystal challenge for this class.' :currentFilter==='season'?'No new released weapons in this category yet. New releases appear after review.':'Try a different search or camo filter.';
  document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === currentFilter));
  decorateWeaponCards(currentMode, progress());
}
function renderDashboard() {
  $('profileName').textContent = profile().name;
  $('avatar').textContent = profile().name.charAt(0).toUpperCase() || 'P';
  $('pageTitle').innerHTML=activeCategory?`${safe(GROUP_BY_ID.get(activeCategory).name)}<span class="period">.</span>`:currentMode==='zombies'?'Your Zombies grind<span class="period">.</span>':'Your weapon armory<span class="period">.</span>';
  $('pageSubtitle').textContent=currentMode==='zombies'?'Track Undead Siege Aether Crystal separately from Multiplayer.':activeCategory?'Check off Gold, Platinum, Damascus, Diamond, and basic weapon camos.':'Every weapon class in one place. No equipment, perks, or scorestreaks.';
  renderNavigation(); renderSeasonBanner(); renderStats(); renderWeaponGrid();
  seasonView(seasonStatus, seasonOffline, seasonLoading);
  focusView(WEAPONS, progress(), currentMode);
}
function go(view, category = null) {
  currentView = view === 'category' && GROUP_BY_ID.has(category) ? 'category' : 'weapons';
  activeCategory = currentView === 'category' ? category : null;
  $('weaponSearch').value = ''; currentFilter = 'all';
  renderDashboard(); closeMenu(); saveViewPreference();
  const top = Math.max(0, $('weaponSection').getBoundingClientRect().top + window.scrollY - 84);
  window.scrollTo({ top, behavior: 'smooth' });
}
function renderZombiesDrawer(w,e,group,oldScroll) {
  const z=e.zombies||{},eligible=aetherEligible(w),count=clamp(Number(z.matches)||0,0,AETHER_MATCHES);
  const start='<div class="drawer-header zombies-header"><div class="drawer-topline"><span class="drawer-kicker">'+safe(group.name.toUpperCase())+' / ZOMBIES</span><button class="icon-button" type="button" data-action="close-drawer" aria-label="Close weapon editor">✕</button><button class="drawer-build-shortcut" data-action="open-build" type="button">GUNSMITH / 3D ↗</button></div><h2 class="drawer-title">'+safe(w.name)+'</h2><div class="drawer-subtitle">UNDEAD SIEGE · AETHER CRYSTAL</div><button type="button" class="drawer-fav '+(e.favorite?'on':'')+'" data-action="toggle-favorite">'+(e.favorite?'★ Saved':'☆ Save weapon')+'</button></div><div class="drawer-body">';
  const challenge=eligible?`
    <section class="drawer-section">
      <div class="drawer-section-head">Hard / Nightmare wins <small>${count}/${AETHER_MATCHES}</small></div>
      <p class="drawer-explainer">Win ${AETHER_MATCHES} completed Undead Siege Hard or Nightmare matches with at least ${AETHER_KILLS[w.category]} zombie kills using this weapon in each match. Only count successful qualifying matches.</p>
      <div class="diamond-meter">
        <button class="btn-soft" type="button" data-action="zombie-minus" aria-label="Remove one qualifying win" ${count===0?'disabled':''}>−</button>
        <label>Completed wins<input type="number" inputmode="numeric" min="0" max="${AETHER_MATCHES}" data-zombie-number="matches" value="${count}"></label>
        <span class="slash">/ ${AETHER_MATCHES}</span>
        <button class="btn-soft" type="button" data-action="zombie-plus" aria-label="Add one qualifying win" ${count>=AETHER_MATCHES?'disabled':''}>+</button>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct(count,AETHER_MATCHES)}%"></div></div>
      ${count===AETHER_MATCHES?'<p class="drawer-explainer">6/6 complete — check your camo in-game and confirm the unlock below.</p>':''}
    </section>
    <section class="drawer-section">
      <div class="drawer-section-head">Aether Crystal <small>Manual confirmation</small></div>
      <label class="camo-item ${z.aetherCrystal?'complete':''}"><input type="checkbox" data-zombie-check="aetherCrystal" ${z.aetherCrystal?'checked':''}><span class="camo-icon">✧</span><span class="textcol">Aether Crystal</span><small>${z.aetherCrystal?'UNLOCKED':'NOT YET'}</small></label>
      <p class="drawer-explainer">Mark unlocked only after confirming Aether Crystal in COD Mobile.</p>
    </section>`:'<section class="drawer-section"><p class="drawer-explainer">This weapon class does not use an individual six-win Aether challenge in the tracked reference rules. Some melee and launcher camos unlock through completing other weapon classes.</p></section>';
  const fields='<section class="drawer-section"><div class="drawer-section-head">Weapon level</div><div class="level-fields"><label>Current<input type="number" min="0" max="200" data-number="level" value="'+(e.level||0)+'"></label><label>Max<input type="number" min="0" max="200" data-number="maxLevel" value="'+(e.maxLevel||0)+'"></label></div></section><section class="drawer-section"><div class="drawer-section-head">Notes</div><textarea id="weaponNotes" maxlength="800" placeholder="Zombies grind notes…">'+safe(e.notes||'')+'</textarea></section><div class="drawer-bottom-note">✓ Zombies progress is independent of Multiplayer camos.</div></div>';
  $('drawerInner').innerHTML=start+challenge+fields;
  $('weaponDrawer').scrollTop=oldScroll;
}
function refreshCamoIndicators(){
 if(!selectedId||currentMode!=='mp')return;
 const progress=camoFamilyProgress(entry(selectedId),activeCamoFamily);
 const objective=camoObjective(BY_ID.get(selectedId).category,activeCamoFamily).toLowerCase();
 for(let i=0;i<CAMO_STEPS;i++){
  const row=$('drawerInner').querySelector('[data-camo-stage-row="'+i+'"]');
  if(!row)continue;
  const target=progress.targets[i],done=progress.unlocked[i],ready=target!==null&&progress.count>=target;
  row.classList.toggle('ready',ready&&!done);
  row.classList.toggle('unlocked',done);
  const line=row.querySelector('[data-camo-stage-status]');
  if(line)line.textContent=done?'Confirmed unlocked':target===null?'Enter the in-game requirement':ready?'Target reached · confirm in CODM':progress.count+' / '+target+' '+objective;
 }
 const counter=$('drawerInner').querySelector('[data-camo-total]');
 if(counter)counter.textContent=totalCamoStages(entry(selectedId))+'/60';
}
function renderDrawer() {
  if (!selectedId) return;
  const oldScroll = $('weaponDrawer').scrollTop;
  const weapon = BY_ID.get(selectedId), e = entry(selectedId), group = GROUP_BY_ID.get(weapon.category);
  if(currentMode==='zombies'){renderZombiesDrawer(weapon,e,group,oldScroll);return;}
  const basicDone = BASIC_CAMOS.filter(family => camoFamilyProgress(e,family).unlocked.every(Boolean)).length;
  const challengeTotal=totalCamoStages(e);
  const target = Number(e.diamondTarget) > 0 ? Number(e.diamondTarget) : group.target;
  const label = group.targetUnit === 'matches' ? 'Qualified matches (usually 10 weapon kills each)' : group.targetUnit === 'kills' ? 'Total weapon kills' : 'Required objectives (check in-game)';
  if(!BASIC_CAMOS.includes(activeCamoFamily))activeCamoFamily='Sand';
  const chosen=activeCamoFamily;
  const chosenProgress=camoFamilyProgress(e,chosen);
  const objective=camoObjective(weapon.category,chosen);
  const familyButtons=BASIC_CAMOS.map(family=>{
    const state=camoFamilyProgress(e,family),done=state.unlocked.filter(Boolean).length;
    return '<button type="button" class="camo-family-tab '+(chosen===family?'selected':'')+'" data-camo-family="'+family+'" aria-pressed="'+(chosen===family)+'"><span class="camo-family-icon family-'+family.toLowerCase()+'"></span><span>'+family+'</span><strong data-family-badge="'+family+'">'+done+'/10</strong></button>';
  }).join('');
  const detailRows=Array.from({length:CAMO_STEPS},(_,i)=>{
    const done=chosenProgress.unlocked[i],goal=chosenProgress.targets[i],ready=goal!==null&&chosenProgress.count>=goal;
    return '<div class="camo-stage '+(done?'unlocked':ready?'ready':'')+'" data-camo-stage-row="'+i+'">'+
     '<div class="camo-stage-pattern family-'+chosen.toLowerCase()+'">'+String(i+1).padStart(2,'0')+'</div>'+
     '<div class="camo-stage-main"><strong>'+chosen+' '+String(i+1).padStart(2,'0')+'</strong>'+
     '<small data-camo-stage-status="'+i+'">'+(done?'Confirmed unlocked':goal===null?'Enter the in-game requirement':ready?'Target reached · confirm in CODM':chosenProgress.count+' / '+goal+' '+objective.toLowerCase())+'</small>'+
     '<label class="camo-stage-goal">Required <input type="number" inputmode="numeric" min="1" max="1000000" placeholder="e.g. 10" data-camo-target="'+chosen+'" data-camo-stage="'+i+'" value="'+(goal??'')+'" aria-label="'+chosen+' camo '+(i+1)+' required '+objective+'"></label></div>'+
     '<label class="camo-stage-check"><input type="checkbox" data-camo-unlock="'+chosen+'" data-camo-stage="'+i+'" '+(done?'checked':'')+'><span>Unlocked</span></label>'+
     '</div>';
  }).join('');
  const bases='<div class="camo-family-tabs" role="group" aria-label="Grindable camo categories">'+familyButtons+'</div>'+
    '<div class="camo-challenge-detail"><div class="camo-family-heading"><div><h3>'+chosen+' camo challenges</h3><p>'+safe(objective)+' · '+chosenProgress.unlocked.filter(Boolean).length+' of 10 unlocked</p></div><span class="camo-family-total" data-camo-total>'+challengeTotal+'/60</span></div>'+
    '<p class="drawer-explainer">Enter the requirement shown for each in-game camo. Targets vary by weapon and tier; example: 10 headshots. Progress is manual, and weapon level may also be required.</p>'+
    '<div class="camo-count-bar"><label>Total '+safe(objective.toLowerCase())+'<input type="number" inputmode="numeric" min="0" max="1000000" data-camo-count="'+chosen+'" value="'+chosenProgress.count+'"></label><button type="button" data-camo-adjust="-1">−1</button><button type="button" data-camo-adjust="1">+1</button><button type="button" data-camo-adjust="10">+10</button></div>'+
    '<div class="camo-stage-list">'+detailRows+'</div>'+
    '<button type="button" class="camo-mark-family" data-camo-mark-all="'+chosen+'">Mark '+chosen+' all 10 as '+(chosenProgress.unlocked.every(Boolean)?'not unlocked':'unlocked')+'</button>'+
    '</div>';
  const tiers = COMPLETIONIST.map(camo => `<label class="complete-tile ${camo} ${e[camo] ? 'complete' : ''}"><input type="checkbox" data-tier="${camo}" ${e[camo] ? 'checked' : ''}><span class="tile-icon">${tileSymbols[camo]}</span><span class="tile-title">${camo}</span><span class="tile-sub">${e[camo] ? 'UNLOCKED' : 'NOT YET UNLOCKED'}</span></label>`).join('');
  $('drawerInner').innerHTML = `<div class="drawer-header"><div class="drawer-topline"><span class="drawer-kicker">${safe(group.name.toUpperCase())} / WEAPON DETAIL</span><button class="icon-button" type="button" data-action="close-drawer" aria-label="Close weapon editor">✕</button><button class="drawer-build-shortcut" data-action="open-build" type="button">GUNSMITH / 3D ↗</button></div><h2 class="drawer-title">${safe(weapon.name)}</h2><div class="drawer-subtitle">TRACK YOUR CAMO PROGRESS & GRIND MILESTONES</div><button type="button" class="drawer-fav ${e.favorite ? 'on' : ''}" data-action="toggle-favorite">${e.favorite ? '★ Saved' : '☆ Save weapon'}</button></div><div class="drawer-body"><section class="drawer-section"><div class="drawer-section-head">Grindable camos <small>${challengeTotal}/60 · ${basicDone}/6 families</small></div><div class="camo-challenge-panel">${bases}</div></section><section class="drawer-section"><div class="drawer-section-head">Completionist <small>Manual unlock checklist</small></div><div class="complete-list">${tiers}</div></section><section class="drawer-section"><div class="drawer-section-head">Diamond grind <small>${safe(group.targetUnit)}</small></div><p class="drawer-explainer">${label}. The default target is an estimate; change it to match the in-game requirement.</p><div class="diamond-meter"><label>Completed<input inputmode="numeric" type="number" min="0" max="100000" data-number="diamondCount" value="${clamp(Number(e.diamondCount) || 0,0,100000)}"></label><span class="slash">/</span><label>Target<input inputmode="numeric" type="number" min="1" max="100000" data-number="diamondTarget" value="${target}"></label></div><div class="progress-track"><div class="progress-fill" style="width:${pct(Number(e.diamondCount) || 0,target)}%"></div></div></section><section class="drawer-section"><div class="drawer-section-head">Weapon level <small>Optional manual input</small></div><div class="level-fields"><label>Current level<input inputmode="numeric" type="number" min="0" max="200" data-number="level" value="${e.level || 0}"></label><label>Max level<input inputmode="numeric" type="number" min="0" max="200" data-number="maxLevel" value="${e.maxLevel || 0}"></label></div></section><section class="drawer-section"><div class="drawer-section-head">My notes</div><textarea id="weaponNotes" maxlength="800" placeholder="Add grind tips, build notes, or challenges to finish…">${safe(e.notes || '')}</textarea></section><div class="drawer-bottom-note">✓ Changes are automatically saved on this device. They are your own checklist, not verified Activision game data.</div></div>`;
  $('weaponDrawer').scrollTop = oldScroll;
}
async function openBuild(id, trigger) {
  const weapon = BY_ID.get(id);
  if (!weapon) return;
  const request = ++buildRequest;
  const playerId = profile().id;
  try {
    if (!gunsmithPromise) gunsmithPromise = Promise.all([
      import('./gunsmith.js?v=1.8.0'),
      import('./attachment-library.js?v=1.8.0')
    ]).then(([{createGunsmith},{rememberAttachment,forgetAttachment}]) =>
      createGunsmith({
        getBuild:id=>profile().builds?.[id],
        getLibrary:()=>profile().attachmentLibrary||{},
        onSave:(id,build)=>{if(!profile().builds)profile().builds={};profile().builds[id]=build;persist();},
        onRememberAttachment:(id,slot,name)=>{
          profile().attachmentLibrary=rememberAttachment(profile().attachmentLibrary,id,slot,name);
          persist();
        },
        onForgetAttachment:(id,slot,name)=>{
          profile().attachmentLibrary=forgetAttachment(profile().attachmentLibrary,id,slot,name);
          persist();
        },
        onClose:()=>{activeDialog=null;},
        notify:message=>toast(message)
      })
    ).catch(error => {gunsmithPromise=null;throw error;});
    gunsmith=await gunsmithPromise;
    // Ignore obsolete opens (rapid taps, profile change, or a closed drawer).
    if(request!==buildRequest || profile().id!==playerId || (activeDialog==='settings'))return;
    if (activeDialog === 'drawer') closeDrawer();
    if (activeDialog === 'settings') closeSettings();
    closeMenu();
    gunsmith.open(weapon,trigger);
    activeDialog='build';
  } catch(error) {
    console.error('Optional Gunsmith failed to load',error);
    toast('3D builder could not load. Weapon tracking still works.',5200);
  }
}
function openDrawer(id) {
  if (!BY_ID.has(id)) return;
  selectedId = id;
  activeCamoFamily='Sand';
  $('drawerBackdrop').hidden = false; $('weaponDrawer').hidden = false;
  $('weaponDrawer').scrollTop = 0;
  renderDrawer();
  activeDialog = 'drawer';
  document.body.style.overflow = 'hidden';
  $('weaponDrawer').querySelector('[data-action="close-drawer"]').focus();
}
function closeDrawer() {
  ++buildRequest;
  if (saveTimer !== null && saveTimer !== undefined) persist();
  selectedId = null;
  $('drawerBackdrop').hidden = true; $('weaponDrawer').hidden = true;
  activeDialog = null;
  document.body.style.overflow = '';
}
function openSettings() {
  ++buildRequest;
  if(activeDialog==='build')gunsmith?.close();
  if (activeDialog === 'drawer') closeDrawer();
  const selected = profile().id;
  $('profileSelect').innerHTML = state.profiles.map(p => `<option value="${safe(p.id)}" ${p.id === selected ? 'selected' : ''}>${safe(p.name)}</option>`).join('');
  vaultStatus();
  $('settingsModal').hidden = false; $('modalBackdrop').hidden = false;
  activeDialog = 'settings'; document.body.style.overflow = 'hidden';
  $('settingsModal').querySelector('[data-action="close-settings"]').focus();
}
function closeSettings() {
  $('cloudToken').value = '';
  $('vaultPassphrase').value = '';
  $('settingsModal').hidden = true; $('modalBackdrop').hidden = true;
  activeDialog = null; document.body.style.overflow = '';
}
function closeMenu() { $('sidebar').classList.remove('open'); $('mobileShade').hidden = true; }
function exportBackup() {
  const backup = JSON.stringify({ ...state, exportedAt: new Date().toISOString(), app: 'CamoVault' }, null, 2);
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url;
  anchor.download = `camovault-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Backup downloaded');
}
async function importBackup(file) {
  if (!file || file.size > 2_000_000) throw new Error('Select a JSON backup smaller than 2 MB');
  const content = JSON.parse(await file.text());
  if (Array.isArray(content.profiles)) {
    const incoming = cleanState(content);
    if (!confirm(`Replace all local profiles with ${incoming.profiles.length} imported profile(s)? Export your current data first if needed.`)) return;
    state = incoming;
  } else if (content.id && content.progress && typeof content.progress === 'object') {
    const incoming = cleanProfile(content);
    const index = state.profiles.findIndex(item => item.id === incoming.id);
    if (index >= 0) {
      if (!confirm(`Replace your local profile "${state.profiles[index].name}" with this backup?`)) return;
      state.profiles[index] = incoming;
    } else {
      if(state.profiles.length>=30)throw new Error('30 profile limit reached. Delete a profile only after exporting a backup.');
      state.profiles.push(incoming);
    }
    state.activeProfileId = incoming.id;
  } else throw new Error('This file is not a CamoVault backup');
  persist(); renderDashboard(); openSettings(); toast('Backup imported successfully');
}
function vaultStatus(message = '', error = false) {
  const node = $('vaultStatus');
  node.textContent = message || (hasSavedToken() ? 'Encrypted token saved on this device. Enter your vault password to unlock it.' : 'No encrypted GitHub token saved on this device.');
  node.classList.toggle('error', error);
}
async function rememberGitHubToken() {
  const { owner, repo, token } = formCloud();
  const passphrase = $('vaultPassphrase').value;
  try {
    await saveTokenVault({ owner, repo, token }, passphrase);
    $('vaultPassphrase').value = '';
    vaultStatus('✓ Token encrypted and stored on this device. You can unlock it next time.');
    toast('GitHub token saved securely');
  } catch (error) { vaultStatus(error.message, true); }
}
async function restoreGitHubToken() {
  const passphrase = $('vaultPassphrase').value;
  try {
    const { token, owner, repo } = await unlockTokenVault(passphrase);
    $('cloudOwner').value = owner;
    $('cloudRepo').value = repo;
    $('cloudToken').value = token;
    $('vaultPassphrase').value = '';
    vaultStatus('✓ Token unlocked for this session. GitHub backup is ready.');
    toast('GitHub token unlocked');
  } catch (error) { vaultStatus(error.message, true); }
}
function removeGitHubToken() {
  if (!hasSavedToken()) { vaultStatus('There is no saved token to forget.'); return; }
  if (!confirm('Remove the encrypted GitHub token from this device? You will need to enter it again to save a new copy.')) return;
  try {
    forgetTokenVault();
    $('cloudToken').value = '';
    $('vaultPassphrase').value = '';
    vaultStatus('Encrypted token removed from this device.');
    toast('Stored GitHub token forgotten');
  } catch (error) { vaultStatus('Could not remove token: ' + error.message, true); }
}
function formCloud() {
  return { owner: $('cloudOwner').value.trim(), repo: $('cloudRepo').value.trim(), token: $('cloudToken').value.trim() };
}
async function uploadCloud() {
  if(cloudBusy){toast('A GitHub backup operation is already running');return;}
  cloudBusy=true;
  const {owner,repo,token}=formCloud();
  const selected=cleanProfile(profile());
  const id=selected.id;
  const before=JSON.stringify({name:selected.name,progress:selected.progress,builds:selected.builds,attachmentLibrary:selected.attachmentLibrary});
  const message=$('cloudMessage');message.textContent='Uploading to your GitHub repository…';
  try{
    const result=await writeCloudProfile(token,owner,repo,selected);
    const target=state.profiles.find(p=>p.id===id);
    if(target){
      target.cloudSyncAt=result.savedAt;
      persist();
    }
    const now=target?cleanProfile(target):null;
    const unchanged=now&&JSON.stringify({name:now.name,progress:now.progress,builds:now.builds,attachmentLibrary:now.attachmentLibrary})===before;
    message.textContent=unchanged?'✓ GitHub backup saved successfully.':'✓ Uploaded. You changed local data during the upload; upload again to include the latest changes.';
    toast(unchanged?'GitHub backup complete':'Backup complete — new changes still need syncing',4600);
  }catch(error){message.textContent='Could not back up: '+error.message;}
  finally{cloudBusy=false;}
}
async function downloadCloud() {
  if(cloudBusy){toast('A GitHub backup operation is already running');return;}
  cloudBusy=true;
  const {owner,repo,token}=formCloud();
  const selected=cleanProfile(profile());
  const message=$('cloudMessage');message.textContent='Checking GitHub for this profile…';
  try{
    const {profile:remote}=await readCloudProfile(token,owner,repo,selected);
    if(!remote)throw new Error('No backup for this profile ID. Import the original backup first to restore its ID.');
    const normalized=cleanProfile(remote);
    if(normalized.id!==selected.id)throw new Error('Backup profile ID does not match the selected profile');
    const index=state.profiles.findIndex(p=>p.id===selected.id);
    if(index<0)throw new Error('That profile no longer exists locally');
    if(!confirm('Restore "'+normalized.name+'" from GitHub? This replaces only its local progress, builds, and custom attachments.')){message.textContent='Restore canceled.';return;}
    normalized.cloudSyncAt=Number(remote.savedAt)||0;
    state.profiles[index]=normalized;
    persist();renderDashboard();
    message.textContent='✓ GitHub profile restored successfully.';toast('Profile restored');
  }catch(error){message.textContent='Could not restore: '+error.message;}
  finally{cloudBusy=false;}
}

function handleAction(action) {
  if (action === 'open-settings') openSettings();
  else if (action === 'close-settings') closeSettings();
  else if (action === 'season-refresh') refreshSeasonCatalog(true);
  else if (action === 'season-new') { go('weapons'); currentFilter='season'; renderDashboard(); }
  else if (action === 'resume') {const id=$('focusResume').dataset.weaponTarget;if(id)openDrawer(id);}
  else if (action === 'view-weapons') go('weapons');
  else if (action === 'clear-filters') { $('weaponSearch').value = ''; currentFilter = 'all'; renderWeaponGrid(); }
  else if (action === 'close-drawer') closeDrawer();
  else if (action === 'open-build' && selectedId) openBuild(selectedId);
   else if ((action === 'zombie-plus' || action === 'zombie-minus') && selectedId && currentMode === 'zombies' && aetherEligible(BY_ID.get(selectedId))) {
     mutate(selectedId, e => { e.zombies.matches = clamp((Number(e.zombies.matches)||0) + (action === 'zombie-plus' ? 1 : -1), 0, AETHER_MATCHES); }, true);
   }
  else if (action === 'export') exportBackup();
  else if (action === 'import') $('importFile').click();
  else if (action === 'toggle-favorite' && selectedId) mutate(selectedId, e => { e.favorite = !e.favorite; }, true);
  else if (action === 'new-profile') {
    const name = prompt('Choose a name for your new profile (up to 40 characters):', `Player ${state.profiles.length + 1}`);
    if (!name?.trim()) return;
    if (state.profiles.length >= 30) { toast('30 profile limit reached'); return; }
    const added = createProfile(name.trim().slice(0, 40)); state.profiles.push(added); state.activeProfileId = added.id;
    persist(); renderDashboard(); openSettings(); toast('New player profile created');
  } else if (action === 'delete-profile') {
    if (state.profiles.length === 1) { toast('Keep at least one profile'); return; }
    if (!confirm(`Permanently delete local profile "${profile().name}"? Export a backup first if you need it.`)) return;
    state.profiles = state.profiles.filter(p => p.id !== state.activeProfileId);
    state.activeProfileId = state.profiles[0].id;
    persist(); renderDashboard(); openSettings(); toast('Profile deleted');
  } else if (action === 'starter') {
    const count = STARTER_GOLD.filter(id => !entry(id).gold).length;
    if (!count) { toast('All six starter SMGs are already Gold'); return; }
    if (!confirm(`Add Gold for the six SMGs from your earlier progress? (${count} still need updating)`)) return;
    const now = Date.now();
    for (const id of STARTER_GOLD) {
      const draft={...entry(id),gold:true,updatedAt:now};
      for(const family of BASIC_CAMOS){
        const updated=confirmCamoFamily(draft,family,true);
        draft.base=updated.base;draft.camoChallenges=updated.camoChallenges;
      }
      profile().progress[id]=draft;
    }
    persist(); renderDashboard(); toast('Six Gold SMGs imported');
  } else if (action === 'vault-save') rememberGitHubToken();
  else if (action === 'vault-unlock') restoreGitHubToken();
  else if (action === 'vault-forget') removeGitHubToken();
  else if (action === 'cloud-upload') uploadCloud();
  else if (action === 'cloud-download') downloadCloud();
}
function bindEvents() {
  document.addEventListener('click', event => {
    const familyButton=event.target.closest('[data-camo-family]');
    if(familyButton&&selectedId&&currentMode==='mp'){
      if(BASIC_CAMOS.includes(familyButton.dataset.camoFamily)){
        activeCamoFamily=familyButton.dataset.camoFamily;
        renderDrawer();
      }
      return;
    }
    const adjust=event.target.closest('[data-camo-adjust]');
    if(adjust&&selectedId&&currentMode==='mp'){
      const family=activeCamoFamily;
      const amount=Number(adjust.dataset.camoAdjust);
      if([-1,1,10].includes(amount))mutate(selectedId,e=>{
        const before=camoFamilyProgress(e,family);
        const updated=applyCamoChange(e,family,'count',before.count+amount);
        e.camoChallenges=updated.camoChallenges;e.base=updated.base;
      },true);
      return;
    }
    const bulk=event.target.closest('[data-camo-mark-all]');
    if(bulk&&selectedId&&currentMode==='mp'&&BASIC_CAMOS.includes(bulk.dataset.camoMarkAll)){
      const family=bulk.dataset.camoMarkAll;
      const done=camoFamilyProgress(entry(selectedId),family).unlocked.every(Boolean);
      if(!done&&!confirm('Mark all 10 '+family+' camos unlocked for this weapon? Only do this if CODM shows them unlocked.'))return;
      mutate(selectedId,e=>{
        const updated=confirmCamoFamily(e,family,!done);
        e.camoChallenges=updated.camoChallenges;e.base=updated.base;
      },true);
      return;
    }
    const action = event.target.closest('[data-action]');
    if (action) { handleAction(action.dataset.action); return; }
    const quick=event.target.closest('[data-quick]');
    if(quick){const id=quick.dataset.quick;if(BY_ID.has(id))mutate(id,e=>{if(currentMode==='zombies'){e.zombies.aetherCrystal=!e.zombies.aetherCrystal;}else{e.gold=!e.gold;if(e.gold)for(const family of BASIC_CAMOS){const updated=confirmCamoFamily(e,family,true);e.base=updated.base;e.camoChallenges=updated.camoChallenges;}}});return;}
    const favorite=event.target.closest('[data-fav]');
    if(favorite){const id=favorite.dataset.fav;if(BY_ID.has(id))mutate(id,e=>{e.favorite=!e.favorite;});return;}
    const mode=event.target.closest('[data-mode]');
    if(mode){currentMode=mode.dataset.mode==='zombies'?'zombies':'mp';currentFilter='all';renderDashboard();closeMenu();saveViewPreference();return;}
    const buildButton = event.target.closest('[data-build]');
    if (buildButton) { openBuild(buildButton.dataset.build, buildButton); return; }
    const weapon = event.target.closest('[data-weapon]');
    if (weapon) { openDrawer(weapon.dataset.weapon); return; }
    const category = event.target.closest('[data-category]');
    if (category) { go('category', category.dataset.category); return; }
    const nav = event.target.closest('[data-nav]');
    if (nav) { go(nav.dataset.nav); return; }
    const filter = event.target.closest('[data-filter]');
    if (filter) { currentFilter = filter.dataset.filter; renderWeaponGrid(); }
  });
  $('drawerInner').addEventListener('change', event => {
    if (!selectedId) return;
    const input = event.target;
    if(input.dataset.zombieCheck==='aetherCrystal'&&aetherEligible(BY_ID.get(selectedId)))mutate(selectedId,e=>{e.zombies.aetherCrystal=input.checked;},true);
    if(input.dataset.zombieNumber==='matches'&&aetherEligible(BY_ID.get(selectedId)))mutate(selectedId,e=>{e.zombies.matches=clamp(Number(input.value)||0,0,AETHER_MATCHES);},true);
    if(input.dataset.camoUnlock&&currentMode==='mp'){
      const family=input.dataset.camoUnlock,stage=Number(input.dataset.camoStage);
      if(BASIC_CAMOS.includes(family)&&Number.isInteger(stage)&&stage>=0&&stage<CAMO_STEPS){
        mutate(selectedId,e=>{
          const updated=applyCamoChange(e,family,'unlocked',input.checked,stage);
          e.camoChallenges=updated.camoChallenges;e.base=updated.base;
        },true);
      }
      return;
    }
    if(input.dataset.camoTarget&&currentMode==='mp'){
      const family=input.dataset.camoTarget,stage=Number(input.dataset.camoStage);
      if(BASIC_CAMOS.includes(family)&&Number.isInteger(stage)&&stage>=0&&stage<CAMO_STEPS){
        mutate(selectedId,e=>{
          const updated=applyCamoChange(e,family,'target',input.value,stage);
          e.camoChallenges=updated.camoChallenges;e.base=updated.base;
        },false);
        refreshCamoIndicators();
      }
      return;
    }
    if(input.dataset.camoCount&&currentMode==='mp'){
      const family=input.dataset.camoCount;
      if(BASIC_CAMOS.includes(family)){
        mutate(selectedId,e=>{
          const updated=applyCamoChange(e,family,'count',input.value);
          e.camoChallenges=updated.camoChallenges;e.base=updated.base;
        },false);
        refreshCamoIndicators();
      }
      return;
    }
    if (input.dataset.basic) mutate(selectedId, e => {
      const updated=confirmCamoFamily(e,input.dataset.basic,input.checked);
      e.camoChallenges=updated.camoChallenges;e.base=updated.base;
    }, true);
    if (input.dataset.tier) mutate(selectedId, e => {
      e[input.dataset.tier] = input.checked;
      if (input.dataset.tier === 'gold' && input.checked) for (const family of BASIC_CAMOS) { const detail=confirmCamoFamily(e,family,true);e.base=detail.base;e.camoChallenges=detail.camoChallenges; }
    }, true);
    if (input.dataset.number) mutate(selectedId, e => {
      const field=input.dataset.number;
      if(field==='diamondTarget' && input.value.trim()===''){delete e.diamondTarget;return;}
      const min=field==='diamondTarget'?1:0;
      const max=field==='level'||field==='maxLevel'?200:100000;
      e[field]=clamp(Number(input.value),min,max);
    }, true);
  });
  $('drawerInner').addEventListener('input', event => {
    if (event.target.id === 'weaponNotes' && selectedId) mutate(selectedId, e => { e.notes = event.target.value.slice(0, 800); }, false, true);
  });
  $('drawerInner').addEventListener('focusout', event => {
    if (event.target.id === 'weaponNotes' && saveTimer != null) persist();
  });
  $('weaponSearch').addEventListener('input', renderWeaponGrid);
  $('sortBy').addEventListener('change', renderWeaponGrid);
  $('profileSelect').addEventListener('change', event => {
    if (!state.profiles.some(p => p.id === event.target.value)) return;
    ++buildRequest;
    if(activeDialog==='build')gunsmith?.close();
    state.activeProfileId = event.target.value;
    persist(); renderDashboard(); toast('Profile switched');
  });
  $('importFile').addEventListener('change', async event => {
    try { if (event.target.files[0]) await importBackup(event.target.files[0]); }
    catch (error) { toast(`Import failed: ${error.message}`, 4600); }
    event.target.value = '';
  });
  $('topBackup').addEventListener('click', openSettings);
  $('profileButton').addEventListener('click', openSettings);
  $('drawerBackdrop').addEventListener('click', closeDrawer);
  $('modalBackdrop').addEventListener('click', closeSettings);
  $('menuToggle').addEventListener('click', () => { $('sidebar').classList.add('open'); $('mobileShade').hidden = false; });
  $('mobileShade').addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (activeDialog === 'build') gunsmith?.close(); else if (activeDialog === 'settings') closeSettings(); else if (activeDialog === 'drawer') closeDrawer(); else closeMenu(); }
    if (event.key === '/' && !activeDialog && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('weaponSearch').focus(); }
  });
  window.addEventListener('pagehide', () => { if (state) saveState(state).catch(() => {}); });
}

async function boot() {
  // Display existing weapon data immediately. Seasonal HTTP requests must not block startup.
  state = await loadState();
  restoreViewPreference();
  const mandatory = ['categoryNav','categoryChips','statsGrid','weaponGrid','completedFilter','seasonBanner','weaponSearch','weaponsTitle'];
  const missing = mandatory.filter(id => !$(id));
  if (missing.length) throw new Error('The website files are out of sync: ' + missing.join(', '));
  $('dateBadge').textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase();
  bindEvents();
  renderDashboard();
  document.documentElement.dataset.cvReady = 'true';
  // Existing profiles are always read first. Never wipe IndexedDB to recover from UI errors.
  await saveState(state).then(() => setSaveBadge('Saved locally')).catch(() => setSaveBadge('Storage unavailable — export a backup', true));
  refreshSeasonCatalog();
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && saveTimer != null) persist();
    if(!document.hidden && Date.now()-lastSeasonRefresh>10*60*1000)refreshSeasonCatalog();
  });
  setInterval(()=>{if(!document.hidden)refreshSeasonCatalog();},30*60*1000);
}
boot().catch(error => {
  console.error('CamoVault initialization failed', error);
  document.documentElement.dataset.cvBootError = String(error?.message || error);
  const notice = document.createElement('section');
  notice.setAttribute('role', 'alert');
  notice.style.cssText = 'margin:18px;padding:20px;background:#231c19;border:1px solid #9c6355;color:#fff;border-radius:12px;font:14px system-ui';
  const heading = document.createElement('h2');
  heading.textContent = 'CamoVault could not finish loading';
  const detail = document.createElement('p');
  detail.textContent = (error && error.message ? error.message : 'An unexpected startup error occurred.') + ' Your saved progress has not been cleared.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Reload website';
  retry.style.cssText = 'padding:10px 14px;background:#c9fb55;border:0;border-radius:7px;color:#172111;font-weight:bold;cursor:pointer';
  retry.addEventListener('click', () => window.location.reload());
  notice.append(heading, detail, retry);
  document.body.prepend(notice);
});
