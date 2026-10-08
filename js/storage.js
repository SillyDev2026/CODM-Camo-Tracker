const DB_NAME = 'camovault-v1';
const STORE = 'app';
const KEY = 'state';
const FALLBACK = 'camovault-state-v1';
const DB_VERSION = 1;
let databasePromise;

function createProfile(name = 'Player 1') {
  return { id: globalThis.crypto?.randomUUID?.() || `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, createdAt: Date.now(), cloudSyncAt: 0, progress: {} };
}
export { createProfile };

export function freshState() {
  const profile = createProfile();
  return { version: 1, profiles: [profile], activeProfileId: profile.id };
}

function openDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB is unavailable'));
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Please close other open tracker tabs and retry'));
    });
  }
  return databasePromise;
}

async function dbRead() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function dbWrite(state) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(state, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
  });
}

export function cleanProgress(progress) {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return {};
  const out = {};
  for (const [id, raw] of Object.entries(progress)) {
    if (typeof id !== 'string' || id.length > 120 || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const base = {};
    for (const camo of ['Sand', 'Dragon', 'Splinter', 'Tiger', 'Jungle', 'Reptile']) base[camo] = raw.base?.[camo] === true;
    out[id] = {
      base, gold: raw.gold === true, platinum: raw.platinum === true,
      damascus: raw.damascus === true, diamond: raw.diamond === true,
      favorite: raw.favorite === true,
      diamondCount: Math.min(100000, Math.max(0, Math.floor(Number(raw.diamondCount) || 0))),
      diamondTarget: Number.isFinite(Number(raw.diamondTarget)) && Number(raw.diamondTarget) > 0 ? Math.min(100000, Math.floor(Number(raw.diamondTarget))) : undefined,
      level: Math.min(200, Math.max(0, Math.floor(Number(raw.level) || 0))),
      maxLevel: Math.min(200, Math.max(0, Math.floor(Number(raw.maxLevel) || 0))),
      notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 800) : '',
      updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now()
    };
    if (out[id].gold) for (const key of Object.keys(base)) base[key] = true;
  }
  return out;
}

export function cleanProfile(value, fallbackName = 'Player') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid profile data');
  return {
    id: typeof value.id === 'string' && /^[\w-]{6,100}$/.test(value.id) ? value.id : createProfile().id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 40) : fallbackName,
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
    cloudSyncAt: Number.isFinite(value.cloudSyncAt) ? value.cloudSyncAt : 0,
    progress: cleanProgress(value.progress)
  };
}
export function cleanState(value) {
  if (!value || !Array.isArray(value.profiles) || !value.profiles.length) throw new Error('Invalid tracker backup');
  const profiles = value.profiles.slice(0, 30).map((profile, index) => cleanProfile(profile, `Player ${index + 1}`));
  const activeProfileId = profiles.some(profile => profile.id === value.activeProfileId) ? value.activeProfileId : profiles[0].id;
  return { version: 1, profiles, activeProfileId };
}

let latestSave = Promise.resolve();
export async function loadState() {
  let result = null;
  try { result = await dbRead(); }
  catch { try { result = JSON.parse(localStorage.getItem(FALLBACK) || 'null'); } catch { /* disabled storage */ } }
  try { return result ? cleanState(result) : freshState(); }
  catch { return freshState(); }
}
export function saveState(value) {
  const snapshot = structuredClone(cleanState(value));
  // Serialized saves prevent the slowest earlier transaction from overwriting the newest state.
  latestSave = latestSave.catch(() => {}).then(async () => {
    try { await dbWrite(snapshot); return 'indexeddb'; }
    catch { localStorage.setItem(FALLBACK, JSON.stringify(snapshot)); return 'localStorage'; }
  });
  return latestSave;
}
