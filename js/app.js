import { GROUPS, WEAPONS, BY_ID, GROUP_BY_ID, BASIC_CAMOS, COMPLETIONIST, STARTER_GOLD, goldTotal, completedCount, progressFor, weaponCompletion } from './catalog.js';
import { loadState, saveState, cleanState, cleanProfile, createProfile } from './storage.js';
import { readCloudProfile, writeCloudProfile } from './github.js';

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
let currentFilter = 'all';
let selectedId = null;
let saveTimer;
let toastTimer;
let activeDialog = null;

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
function persist() {
  setSaveBadge('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { const provider = await saveState(state); setSaveBadge(provider === 'indexeddb' ? 'Saved locally' : 'Saved (fallback)'); }
    catch { setSaveBadge('Save failed — export now', true); toast('Saving failed. Export a backup immediately.', 5200); }
  }, 190);
}
function mutate(id, apply, repaintDrawer = false) {
  if (!BY_ID.has(id)) return;
  const draft = { ...entry(id), base: { ...(entry(id).base || {}) } };
  apply(draft);
  draft.updatedAt = Date.now();
  profile().progress[id] = draft;
  persist(); renderDashboard();
  if (repaintDrawer && selectedId === id) renderDrawer();
}
function renderNavigation() {
  $('categoryNav').innerHTML = GROUPS.map(group => `<button type="button" class="side-link ${currentView === 'category' && activeCategory === group.id ? 'active' : ''}" data-category="${group.id}"><span class="side-ico">${symbols[group.id]}</span><span>${safe(group.name)}</span><span class="count">${group.weapons.split('|').length}</span></button>`).join('');
  $('categoryChips').innerHTML = `<button type="button" class="category-chip ${activeCategory === null ? 'active' : ''}" data-nav="weapons"><span>All weapons</span><strong>${WEAPONS.length}</strong></button>` + GROUPS.map(group => `<button type="button" class="category-chip ${activeCategory === group.id ? 'active' : ''}" data-category="${group.id}"><span>${safe(group.short)}</span><strong>${goldTotal(progress(),group.id)}/${group.weapons.split('|').length}</strong></button>`).join('');
  document.querySelectorAll('[data-nav]').forEach(button => { if (!button.classList.contains('category-chip')) button.classList.toggle('active', button.dataset.nav === currentView); });
  $('breadcrumb').textContent = currentView === 'category' ? GROUP_BY_ID.get(activeCategory).short : 'WEAPONS';
}
function statCard(label, count, caption, css, icon, target = WEAPONS.length) {
  return `<div class="stat-card"><div class="stat-label">${label} <span class="stat-miniicon">${icon}</span></div><div class="stat-big ${css}">${count}<span style="font-size:16px;color:#708580">/${target}</span></div><div class="stat-desc">${caption}</div><div class="stat-progress"><span style="width:${pct(count, target)}%"></span></div></div>`;
}
function renderStats() {
  const p = progress();
  $('statsGrid').innerHTML = [
    statCard('GOLD UNLOCKED', completedCount(p, 'gold'), 'Gold on individual weapons', 'gold', '✦'),
    statCard('PLATINUM UNLOCKED', completedCount(p, 'platinum'), 'Personally confirmed unlocks', 'platinum', '⬡'),
    statCard('DIAMOND UNLOCKED', completedCount(p, 'diamond'), 'Individual weapon mastery', 'diamond', '◇'),
    statCard('DAMASCUS UNLOCKED', completedCount(p, 'damascus'), 'Personally confirmed unlocks', 'damascus', '✧')
  ].join('');
}
function matchesFilter(weapon) {
  const e = entry(weapon.id);
  const started = Boolean(e.gold || e.platinum || e.damascus || e.diamond || (e.level > 0) || (e.diamondCount > 0) || Object.values(e.base || {}).some(Boolean));
  if (currentFilter === 'gold') return Boolean(e.gold);
  if (currentFilter === 'unstarted') return !started;
  if (currentFilter === 'inprogress') return started && !e.gold;
  if (currentFilter === 'favorites') return Boolean(e.favorite);
  return true;
}
function getVisibleWeapons() {
  const search = $('weaponSearch').value.trim().toLocaleLowerCase();
  const sort = $('sortBy').value;
  let visible = WEAPONS.filter(weapon => (!activeCategory || weapon.category === activeCategory) && weapon.name.toLocaleLowerCase().includes(search) && matchesFilter(weapon));
  if (sort === 'az') visible = visible.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'progress') visible = visible.sort((a, b) => weaponCompletion(entry(b.id)) - weaponCompletion(entry(a.id)));
  if (sort === 'recent') visible = visible.sort((a, b) => lastUpdated(entry(b.id)) - lastUpdated(entry(a.id)));
  if (sort === 'level') visible = visible.sort((a, b) => (entry(b.id).level || 0) - (entry(a.id).level || 0));
  return visible;
}
function renderWeaponGrid() {
  const visible = getVisibleWeapons();
  const title = activeCategory ? GROUP_BY_ID.get(activeCategory).name : 'All weapons';
  $('weaponsTitle').childNodes[0].textContent = `${title} `;
  $('weaponCount').textContent = visible.length.toString().padStart(2, '0');
  $('weaponGrid').innerHTML = visible.map(weapon => {
    const e = entry(weapon.id);
    const tags = COMPLETIONIST.filter(key => e[key]).map(key => `<span class="weapon-pill ${key}">${safe(key.toUpperCase())}</span>`).join('');
    const rank = weaponCompletion(e);
    const level = Number(e.level) > 0 ? `LVL ${e.level}${e.maxLevel ? `/${e.maxLevel}` : ''}` : 'LEVEL NOT SET';
    return `<button class="weapon-card" type="button" data-weapon="${weapon.id}" aria-label="Edit ${safe(weapon.name)} camo progress"><div class="weapon-card-top"><span class="weapon-class-label">${GROUP_BY_ID.get(weapon.category).short}</span><span class="favorite-symbol ${e.favorite ? 'on' : ''}">${e.favorite ? '★' : '☆'}</span></div><div class="weapon-title" title="${safe(weapon.name)}">${safe(weapon.name)}</div><div class="weapon-tags">${tags || '<span class="weapon-pill">NOT COMPLETED</span>'}</div><div class="weapon-level">${safe(level)}</div><div class="progress-track weapon-meter"><div class="progress-fill" style="width:${pct(rank,10)}%"></div></div><div class="weapon-card-footer"><span>${rank}/10 CAMO MILESTONES</span><span class="arrow">↗</span></div></button>`;
  }).join('');
  $('emptyState').hidden = visible.length > 0;
  document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === currentFilter));
}
function renderDashboard() {
  $('profileName').textContent = profile().name;
  $('avatar').textContent = profile().name.charAt(0).toUpperCase() || 'P';
  $('pageTitle').innerHTML = activeCategory ? `${safe(GROUP_BY_ID.get(activeCategory).name)}<span class="period">.</span>` : 'Your weapon armory<span class="period">.</span>';
  $('pageSubtitle').textContent = activeCategory ? 'Check off Gold, Platinum, Damascus, Diamond, and basic weapon camos.' : 'Every weapon class in one place. No equipment, perks, or scorestreaks.';
  renderNavigation(); renderStats(); renderWeaponGrid();
}
function go(view, category = null) {
  currentView = view === 'category' && GROUP_BY_ID.has(category) ? 'category' : 'weapons';
  activeCategory = currentView === 'category' ? category : null;
  $('weaponSearch').value = ''; currentFilter = 'all';
  renderDashboard(); closeMenu();
  const top = Math.max(0, $('weaponSection').getBoundingClientRect().top + window.scrollY - 84);
  window.scrollTo({ top, behavior: 'smooth' });
}
function renderDrawer() {
  if (!selectedId) return;
  const oldScroll = $('weaponDrawer').scrollTop;
  const weapon = BY_ID.get(selectedId), e = entry(selectedId), group = GROUP_BY_ID.get(weapon.category);
  const basicDone = BASIC_CAMOS.filter(camo => e.base?.[camo] || e.gold).length;
  const target = Number(e.diamondTarget) > 0 ? Number(e.diamondTarget) : group.target;
  const label = group.targetUnit === 'matches' ? 'Qualified matches (usually 10 weapon kills each)' : group.targetUnit === 'kills' ? 'Total weapon kills' : 'Required objectives (check in-game)';
  const bases = BASIC_CAMOS.map(camo => `<label class="camo-item ${e.base?.[camo] || e.gold ? 'complete' : ''}"><input type="checkbox" data-basic="${camo}" ${e.base?.[camo] || e.gold ? 'checked' : ''}><span class="camo-icon">◈</span><span class="textcol">${camo}</span><small>${e.base?.[camo] || e.gold ? 'COMPLETE' : 'NOT YET'}</small></label>`).join('');
  const tiers = COMPLETIONIST.map(camo => `<label class="complete-tile ${camo} ${e[camo] ? 'complete' : ''}"><input type="checkbox" data-tier="${camo}" ${e[camo] ? 'checked' : ''}><span class="tile-icon">${tileSymbols[camo]}</span><span class="tile-title">${camo}</span><span class="tile-sub">${e[camo] ? 'UNLOCKED' : 'NOT YET UNLOCKED'}</span></label>`).join('');
  $('drawerInner').innerHTML = `<div class="drawer-header"><div class="drawer-topline"><span class="drawer-kicker">${safe(group.name.toUpperCase())} / WEAPON DETAIL</span><button class="icon-button" type="button" data-action="close-drawer" aria-label="Close weapon editor">✕</button></div><h2 class="drawer-title">${safe(weapon.name)}</h2><div class="drawer-subtitle">TRACK YOUR CAMO PROGRESS & GRIND MILESTONES</div><button type="button" class="drawer-fav ${e.favorite ? 'on' : ''}" data-action="toggle-favorite">${e.favorite ? '★ Saved' : '☆ Save weapon'}</button></div><div class="drawer-body"><section class="drawer-section"><div class="drawer-section-head">Basic camo series <small>${basicDone}/6 tracked</small></div><p class="drawer-explainer">Mark each camo family after you finish its challenges. Requirements vary by weapon—check Gunsmith in-game. Gold automatically checks all six families here.</p><div class="camo-list">${bases}</div></section><section class="drawer-section"><div class="drawer-section-head">Completionist <small>Manual unlock checklist</small></div><div class="complete-list">${tiers}</div></section><section class="drawer-section"><div class="drawer-section-head">Diamond grind <small>${safe(group.targetUnit)}</small></div><p class="drawer-explainer">${label}. The default target is an estimate; change it to match the in-game requirement.</p><div class="diamond-meter"><label>Completed<input inputmode="numeric" type="number" min="0" max="100000" data-number="diamondCount" value="${clamp(Number(e.diamondCount) || 0,0,100000)}"></label><span class="slash">/</span><label>Target<input inputmode="numeric" type="number" min="1" max="100000" data-number="diamondTarget" value="${target}"></label></div><div class="progress-track"><div class="progress-fill" style="width:${pct(Number(e.diamondCount) || 0,target)}%"></div></div></section><section class="drawer-section"><div class="drawer-section-head">Weapon level <small>Optional manual input</small></div><div class="level-fields"><label>Current level<input inputmode="numeric" type="number" min="0" max="200" data-number="level" value="${e.level || 0}"></label><label>Max level<input inputmode="numeric" type="number" min="0" max="200" data-number="maxLevel" value="${e.maxLevel || 0}"></label></div></section><section class="drawer-section"><div class="drawer-section-head">My notes</div><textarea id="weaponNotes" maxlength="800" placeholder="Add grind tips, build notes, or challenges to finish…">${safe(e.notes || '')}</textarea></section><div class="drawer-bottom-note">✓ Changes are automatically saved on this device. They are your own checklist, not verified Activision game data.</div></div>`;
  $('weaponDrawer').scrollTop = oldScroll;
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
  selectedId = null;
  $('drawerBackdrop').hidden = true; $('weaponDrawer').hidden = true;
  activeDialog = null;
  document.body.style.overflow = '';
}
function openSettings() {
  if (activeDialog === 'drawer') closeDrawer();
  const selected = profile().id;
  $('profileSelect').innerHTML = state.profiles.map(p => `<option value="${safe(p.id)}" ${p.id === selected ? 'selected' : ''}>${safe(p.name)}</option>`).join('');
  $('settingsModal').hidden = false; $('modalBackdrop').hidden = false;
  activeDialog = 'settings'; document.body.style.overflow = 'hidden';
  $('settingsModal').querySelector('[data-action="close-settings"]').focus();
}
function closeSettings() {
  $('cloudToken').value = '';
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
  else if (action === 'view-weapons') go('weapons');
  else if (action === 'clear-filters') { $('weaponSearch').value = ''; currentFilter = 'all'; renderWeaponGrid(); }
  else if (action === 'close-drawer') closeDrawer();
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
  } else if (action === 'cloud-upload') uploadCloud();
  else if (action === 'cloud-download') downloadCloud();
}
function bindEvents() {
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]');
    if (action) { handleAction(action.dataset.action); return; }
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
    if (event.target.id === 'weaponNotes' && selectedId) mutate(selectedId, e => { e.notes = event.target.value.slice(0, 800); });
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
    if (event.key === 'Escape') { if (activeDialog === 'settings') closeSettings(); else if (activeDialog === 'drawer') closeDrawer(); else closeMenu(); }
    if (event.key === '/' && !activeDialog && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('weaponSearch').focus(); }
  });
  window.addEventListener('pagehide', () => { if (state) saveState(state).catch(() => {}); });
}

async function boot() {
  state = await loadState();
  $('dateBadge').textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase();
  bindEvents(); renderDashboard();
  // Preserve the v1.0 IndexedDB schema and weapon IDs to retain existing progress.
  await saveState(state).then(() => setSaveBadge('Saved locally')).catch(() => setSaveBadge('Storage blocked — export backup', true));
}
boot().catch(error => {
  console.error('CamoVault could not start', error);
  document.body.textContent = 'Could not open tracker storage. Try updating your browser or disabling private browsing mode.';
});
