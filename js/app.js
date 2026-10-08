import { GROUPS, WEAPONS, BY_ID, GROUP_BY_ID, BASIC_CAMOS, COMPLETIONIST, STARTER_GOLD, goldTotal, completedCount, progressFor, weaponCompletion, loadSeasonalWeapons, AETHER_KILLS, AETHER_MATCHES } from './catalog.js?v=1.5.0';
import { loadState, saveState, cleanState, cleanProfile, createProfile } from './storage.js?v=1.5.0';
import { readCloudProfile, writeCloudProfile } from './github.js?v=1.5.0';
import { hasSavedToken, saveTokenVault, unlockTokenVault, forgetTokenVault } from './token-vault.js?v=1.5.0';
import { seasonView, focusView, decorateWeaponCards } from './enhancements.js?v=1.5.0';
import { createGunsmith } from './gunsmith.js?v=1.6.0';

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

function saveViewPreference(){try{localStorage.setItem('camovault-view-v1',JSON.stringify({mode:currentMode,category:activeCategory}));}catch{}}
function restoreViewPreference(){try{const v=JSON.parse(localStorage.getItem('camovault-view-v1')||'null');if(v?.mode==='zombies')currentMode='zombies';if(v?.category && GROUP_BY_ID.has(v.category)){activeCategory=v.category;currentView='category';}}catch{}}
async function refreshSeasonCatalog(notify=false){
 if(seasonLoading)return;
 seasonLoading=true;seasonView(seasonStatus,seasonOffline,true);
 try{const fresh=await loadSeasonalWeapons();seasonStatus=fresh;lastSeasonRefresh=Date.now();seasonOffline=false;renderDashboard();if(notify)toast('Verified season roster checked');}
 catch(error){seasonOffline=true;console.warn('Season refresh failed',error);if(notify)toast('Offline: your saved camos are still available');}
 finally{seasonLoading=false;seasonView(seasonStatus,seasonOffline,false);}
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
  const draft = { ...entry(id), base: { ...(entry(id).base || {}) }, zombies: { ...(entry(id).zombies || {}) } };
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
    const started=pool.filter(w=>Number(aether(w).matches)>0).length,wins=pool.reduce((sum,w)=>sum+Number(aether(w).matches||0),0);
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
  if (sort === 'progress') visible = visible.sort((a, b) => currentMode==='zombies'?Number(aether(b).matches||0)-Number(aether(a).matches||0):weaponCompletion(entry(b.id))-weaponCompletion(entry(a.id)));
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
    const rank=currentMode==='zombies'?Number(aether(weapon).matches||0):weaponCompletion(e);
    const max=currentMode==='zombies'?Number(aether(weapon).target||AETHER_MATCHES):10;
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
  const z=e.zombies||{},target=Number(z.target)||AETHER_MATCHES,eligible=aetherEligible(w);
  const kills=Number(z.killsPerMatch)||AETHER_KILLS[w.category],count=Number(z.matches)||0;
  const start='<div class="drawer-header zombies-header"><div class="drawer-topline"><span class="drawer-kicker">'+safe(group.name.toUpperCase())+' / ZOMBIES</span><button class="icon-button" type="button" data-action="close-drawer" aria-label="Close weapon editor">✕</button><button class="drawer-build-shortcut" data-action="open-build" type="button">GUNSMITH / 3D ↗</button></div><h2 class="drawer-title">'+safe(w.name)+'</h2><div class="drawer-subtitle">UNDEAD SIEGE · AETHER CRYSTAL</div><button type="button" class="drawer-fav '+(e.favorite?'on':'')+'" data-action="toggle-favorite">'+(e.favorite?'★ Saved':'☆ Save weapon')+'</button></div><div class="drawer-body">';
  const checklist=eligible?'<section class="drawer-section"><div class="drawer-section-head">Aether Crystal <small>Manual unlock</small></div><p class="drawer-explainer">A qualified match must meet the zombie-kill target in completed Hard/Nightmare Undead Siege. Verify your camo in-game before marking unlocked.</p><label class="camo-item '+(z.aetherCrystal?'complete':'')+'"><input type="checkbox" data-zombie-check="aetherCrystal" '+(z.aetherCrystal?'checked':'')+'><span class="camo-icon">✧</span><span class="textcol">Aether Crystal</span><small>'+(z.aetherCrystal?'UNLOCKED':'NOT YET')+'</small></label></section><section class="drawer-section"><div class="drawer-section-head">Qualified matches <small>'+count+'/'+target+'</small></div><div class="diamond-meter"><label>Wins<input type="number" inputmode="numeric" min="0" max="100000" data-zombie-number="matches" value="'+count+'"></label><span class="slash">/</span><label>Target<input type="number" inputmode="numeric" min="1" max="100000" data-zombie-number="target" value="'+target+'"></label></div><div class="progress-track"><div class="progress-fill" style="width:'+pct(count,target)+'%"></div></div><div class="level-fields"><label>Required zombie kills per match<input type="number" inputmode="numeric" min="1" max="100000" data-zombie-number="killsPerMatch" value="'+kills+'"></label></div><p class="drawer-explainer">Default: '+AETHER_KILLS[w.category]+' kills across '+AETHER_MATCHES+' qualifying wins. Requirements may change; verify in-game.</p></section>':'<section class="drawer-section"><p class="drawer-explainer">Aether Crystal requirements for this weapon class are not verified. Multiplayer tracking is available.</p></section>';
  const fields='<section class="drawer-section"><div class="drawer-section-head">Weapon level</div><div class="level-fields"><label>Current<input type="number" min="0" max="200" data-number="level" value="'+(e.level||0)+'"></label><label>Max<input type="number" min="0" max="200" data-number="maxLevel" value="'+(e.maxLevel||0)+'"></label></div></section><section class="drawer-section"><div class="drawer-section-head">Notes</div><textarea id="weaponNotes" maxlength="800" placeholder="Zombies grind notes…">'+safe(e.notes||'')+'</textarea></section><div class="drawer-bottom-note">✓ Zombies progress is independent of Multiplayer camos.</div></div>';
  $('drawerInner').innerHTML=start+checklist+fields;
  $('weaponDrawer').scrollTop=oldScroll;
}
function renderDrawer() {
  if (!selectedId) return;
  const oldScroll = $('weaponDrawer').scrollTop;
  const weapon = BY_ID.get(selectedId), e = entry(selectedId), group = GROUP_BY_ID.get(weapon.category);
  if(currentMode==='zombies'){renderZombiesDrawer(weapon,e,group,oldScroll);return;}
  const basicDone = BASIC_CAMOS.filter(camo => e.base?.[camo] || e.gold).length;
  const target = Number(e.diamondTarget) > 0 ? Number(e.diamondTarget) : group.target;
  const label = group.targetUnit === 'matches' ? 'Qualified matches (usually 10 weapon kills each)' : group.targetUnit === 'kills' ? 'Total weapon kills' : 'Required objectives (check in-game)';
  const bases = BASIC_CAMOS.map(camo => `<label class="camo-item ${e.base?.[camo] || e.gold ? 'complete' : ''}"><input type="checkbox" data-basic="${camo}" ${e.base?.[camo] || e.gold ? 'checked' : ''}><span class="camo-icon">◈</span><span class="textcol">${camo}</span><small>${e.base?.[camo] || e.gold ? 'COMPLETE' : 'NOT YET'}</small></label>`).join('');
  const tiers = COMPLETIONIST.map(camo => `<label class="complete-tile ${camo} ${e[camo] ? 'complete' : ''}"><input type="checkbox" data-tier="${camo}" ${e[camo] ? 'checked' : ''}><span class="tile-icon">${tileSymbols[camo]}</span><span class="tile-title">${camo}</span><span class="tile-sub">${e[camo] ? 'UNLOCKED' : 'NOT YET UNLOCKED'}</span></label>`).join('');
  $('drawerInner').innerHTML = `<div class="drawer-header"><div class="drawer-topline"><span class="drawer-kicker">${safe(group.name.toUpperCase())} / WEAPON DETAIL</span><button class="icon-button" type="button" data-action="close-drawer" aria-label="Close weapon editor">✕</button><button class="drawer-build-shortcut" data-action="open-build" type="button">GUNSMITH / 3D ↗</button></div><h2 class="drawer-title">${safe(weapon.name)}</h2><div class="drawer-subtitle">TRACK YOUR CAMO PROGRESS & GRIND MILESTONES</div><button type="button" class="drawer-fav ${e.favorite ? 'on' : ''}" data-action="toggle-favorite">${e.favorite ? '★ Saved' : '☆ Save weapon'}</button></div><div class="drawer-body"><section class="drawer-section"><div class="drawer-section-head">Basic camo series <small>${basicDone}/6 tracked</small></div><p class="drawer-explainer">Mark each camo family after you finish its challenges. Requirements vary by weapon—check Gunsmith in-game. Gold automatically checks all six families here.</p><div class="camo-list">${bases}</div></section><section class="drawer-section"><div class="drawer-section-head">Completionist <small>Manual unlock checklist</small></div><div class="complete-list">${tiers}</div></section><section class="drawer-section"><div class="drawer-section-head">Diamond grind <small>${safe(group.targetUnit)}</small></div><p class="drawer-explainer">${label}. The default target is an estimate; change it to match the in-game requirement.</p><div class="diamond-meter"><label>Completed<input inputmode="numeric" type="number" min="0" max="100000" data-number="diamondCount" value="${clamp(Number(e.diamondCount) || 0,0,100000)}"></label><span class="slash">/</span><label>Target<input inputmode="numeric" type="number" min="1" max="100000" data-number="diamondTarget" value="${target}"></label></div><div class="progress-track"><div class="progress-fill" style="width:${pct(Number(e.diamondCount) || 0,target)}%"></div></div></section><section class="drawer-section"><div class="drawer-section-head">Weapon level <small>Optional manual input</small></div><div class="level-fields"><label>Current level<input inputmode="numeric" type="number" min="0" max="200" data-number="level" value="${e.level || 0}"></label><label>Max level<input inputmode="numeric" type="number" min="0" max="200" data-number="maxLevel" value="${e.maxLevel || 0}"></label></div></section><section class="drawer-section"><div class="drawer-section-head">My notes</div><textarea id="weaponNotes" maxlength="800" placeholder="Add grind tips, build notes, or challenges to finish…">${safe(e.notes || '')}</textarea></section><div class="drawer-bottom-note">✓ Changes are automatically saved on this device. They are your own checklist, not verified Activision game data.</div></div>`;
  $('weaponDrawer').scrollTop = oldScroll;
}
function openBuild(id, trigger) {
  const weapon = BY_ID.get(id);
  if (!weapon || !gunsmith) return;
  if (activeDialog === 'drawer') closeDrawer();
  if (activeDialog === 'settings') closeSettings();
  closeMenu();
  gunsmith.open(weapon, trigger);
  activeDialog = 'build';
}
function openDrawer(id) {
  if (!BY_ID.has(id)) return;
  selectedId = id;
  $('drawerBackdrop').hidden = false; $('weaponDrawer').hidden = false;
  $('weaponDrawer').scrollTop = 0;
  renderDrawer();
  activeDialog = 'drawer';
  document.body.style.overflow = 'hidden';
  $('weaponDrawer').querySelector('[data-action="close-drawer"]').focus();
}
function closeDrawer() {
  if (saveTimer !== null && saveTimer !== undefined) persist();
  selectedId = null;
  $('drawerBackdrop').hidden = true; $('weaponDrawer').hidden = true;
  activeDialog = null;
  document.body.style.overflow = '';
}
function openSettings() {
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
    } else state.profiles.push(incoming);
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
  const { owner, repo, token } = formCloud();
  const message = $('cloudMessage'); message.textContent = 'Uploading to your GitHub repository…';
  try {
    // Flush any pending local saves. Cloud only receives the current profile.
    const result = await writeCloudProfile(token, owner, repo, profile());
    profile().cloudSyncAt = result.savedAt;
    persist(); message.textContent = '✓ GitHub backup saved successfully.'; toast('GitHub backup complete');
  } catch (error) { message.textContent = `Could not back up: ${error.message}`; }
}
async function downloadCloud() {
  const { owner, repo, token } = formCloud();
  const message = $('cloudMessage'); message.textContent = 'Checking GitHub for this profile…';
  try {
    const { profile: remote } = await readCloudProfile(token, owner, repo, profile());
    if (!remote) throw new Error('No backup for this profile ID. Import the original backup first to restore its ID.');
    if (!confirm(`Restore "${remote.name || profile().name}" from GitHub? This will replace this profile's local camo progress.`)) { message.textContent = 'Restore canceled.'; return; }
    const normalized = cleanProfile(remote);
    normalized.cloudSyncAt = Number(remote.savedAt) || 0;
    const index = state.profiles.findIndex(p => p.id === profile().id);
    if (index < 0 || normalized.id !== profile().id) throw new Error('Backup profile ID does not match the selected profile');
    state.profiles[index] = normalized;
    persist(); renderDashboard(); message.textContent = '✓ GitHub profile restored successfully.'; toast('Profile restored');
  } catch (error) { message.textContent = `Could not restore: ${error.message}`; }
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
    for (const id of STARTER_GOLD) profile().progress[id] = { ...entry(id), gold: true, base: Object.fromEntries(BASIC_CAMOS.map(camo => [camo, true])), updatedAt: now };
    persist(); renderDashboard(); toast('Six Gold SMGs imported');
  } else if (action === 'vault-save') rememberGitHubToken();
  else if (action === 'vault-unlock') restoreGitHubToken();
  else if (action === 'vault-forget') removeGitHubToken();
  else if (action === 'cloud-upload') uploadCloud();
  else if (action === 'cloud-download') downloadCloud();
}
function bindEvents() {
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]');
    if (action) { handleAction(action.dataset.action); return; }
    const quick=event.target.closest('[data-quick]');
    if(quick){const id=quick.dataset.quick;if(BY_ID.has(id))mutate(id,e=>{if(currentMode==='zombies'){e.zombies.aetherCrystal=!e.zombies.aetherCrystal;}else{e.gold=!e.gold;if(e.gold)for(const camo of BASIC_CAMOS)e.base[camo]=true;}});return;}
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
    if(input.dataset.zombieNumber&&aetherEligible(BY_ID.get(selectedId)))mutate(selectedId,e=>{e.zombies[input.dataset.zombieNumber]=clamp(Number(input.value),input.dataset.zombieNumber==='matches'?0:1,100000);},true);
    if (input.dataset.basic) mutate(selectedId, e => { e.base[input.dataset.basic] = input.checked; }, true);
    if (input.dataset.tier) mutate(selectedId, e => {
      e[input.dataset.tier] = input.checked;
      if (input.dataset.tier === 'gold' && input.checked) for (const camo of BASIC_CAMOS) e.base[camo] = true;
    }, true);
    if (input.dataset.number) mutate(selectedId, e => {
      const min = input.dataset.number === 'diamondTarget' ? 1 : 0;
      e[input.dataset.number] = clamp(Number(input.value), min, 100000);
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
  gunsmith = createGunsmith({
    getBuild:id=>profile().builds?.[id],
    onSave:(id,build)=>{if(!profile().builds)profile().builds={};profile().builds[id]=build;persist();},
    onClose:()=>{activeDialog=null;},
    notify:message=>toast(message)
  });
  bindEvents();
  renderDashboard();
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
