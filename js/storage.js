import { cleanBuilds } from './loadouts.js';
import { cleanAttachmentLibrary } from './attachment-library.js';
const DB_NAME = 'camovault-v1';
const STORE = 'app';
const KEY = 'state';
const FALLBACK = 'camovault-state-v1';
const DB_VERSION = 1;
let databasePromise;

function createProfile(name = 'Player 1') {
  return { id: globalThis.crypto?.randomUUID?.() || `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, createdAt: Date.now(), cloudSyncAt: 0, progress: {}, builds: {}, attachmentLibrary: {} };
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
      zombies: {
        aetherCrystal: raw.zombies?.aetherCrystal === true,
        matches: Math.min(100000, Math.max(0, Math.floor(Number(raw.zombies?.matches) || 0))),
        target: Math.min(100000, Math.max(1, Math.floor(Number(raw.zombies?.target) || 6))),
        killsPerMatch: Math.min(100000, Math.max(0, Math.floor(Number(raw.zombies?.killsPerMatch) || 0)))
      },
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
    progress: cleanProgress(value.progress),
    builds: cleanBuilds(value.builds),
    attachmentLibrary: cleanAttachmentLibrary(value.attachmentLibrary)
  };
}
export function cleanState(value) {
  if (!value || !Array.isArray(value.profiles) || !value.profiles.length) throw new Error('Invalid tracker backup');
  const profiles = value.profiles.slice(0, 30).map((profile, index) => cleanProfile(profile, `Player ${index + 1}`));
  const activeProfileId = profiles.some(profile => profile.id === value.activeProfileId) ? value.activeProfileId : profiles[0].id;
  return { version: 1, profiles, activeProfileId, savedAt: Number.isFinite(value.savedAt) && value.savedAt > 0 ? value.savedAt : 0 };
}

// Chooses the newest valid copy without discarding valid older data when one
// browser provider is damaged or temporarily unavailable.
export function chooseSavedState(primary, fallback) {
  const valid = [];
  for (const source of [primary, fallback]) {
    if (source == null) continue;
    try { valid.push(cleanState(source)); }
    catch { /* The alternate provider might still contain a valid save. */ }
  }
  if (!valid.length) {
    if (primary != null || fallback != null) throw new Error('Saved tracker data cannot be read. Nothing was overwritten. Try another browser or restore an exported backup.');
    return null;
  }
  return valid.sort((a, b) => b.savedAt - a.savedAt)[0];
}

let latestSave = Promise.resolve();
export async function loadState() {
  let primary = null, fallback = null, dbError = null, fallbackRaw = null;
  try { primary = await dbRead(); }
  catch (error) { dbError = error; }
  try {
    fallbackRaw = localStorage.getItem(FALLBACK);
    if (fallbackRaw) fallback = JSON.parse(fallbackRaw);
  } catch {
    // Only malformed *existing* JSON is treated as corrupted. Blocked access
    // does not mean the browser previously held an invalid save.
    if (fallbackRaw) fallback = { profiles: null };
  }
  const saved = chooseSavedState(primary, fallback);
  if (saved) return saved;
  // A blocked IndexedDB API might hide an existing database. Never overwrite
  // that potentially valuable save with an empty profile on startup.
  if (dbError && typeof indexedDB !== 'undefined') throw new Error('Browser storage is blocked. Your progress has not been reset. Enable site storage and reload.');
  return freshState();
}
export function saveState(value) {
  const snapshot = cleanState(value);
  snapshot.savedAt = Date.now();
  const serialized = JSON.stringify(snapshot);
  // Queue writes to avoid an older transaction overwriting a newer one.
  latestSave = latestSave.catch(() => {}).then(async () => {
    try {
      await dbWrite(snapshot);
      // Secondary recovery copy, used when IndexedDB is temporarily blocked.
      try { localStorage.setItem(FALLBACK, serialized); } catch { /* IndexedDB already succeeded. */ }
      return 'indexeddb';
    } catch {
      localStorage.setItem(FALLBACK, serialized);
      return 'localStorage';
    }
  });
  return latestSave;
}
