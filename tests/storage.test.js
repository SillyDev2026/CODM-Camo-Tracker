import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSavedState, loadState, saveState, cleanState, freshState } from '../js/storage.js';

function aSave(name, savedAt, progress = {}) {
  const state = freshState();
  state.savedAt = savedAt;
  state.profiles[0].name = name;
  state.profiles[0].progress = progress;
  return state;
}
function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}
test('newest validated copy is recovered and Zombies/MP progress is preserved', () => {
  const progress = { 'smg:qq9': { gold:true, zombies:{aetherCrystal:true,matches:3} } };
  const older = aSave('Old IDB', 1000);
  const newer = aSave('New fallback', 2000, progress);
  const selected = chooseSavedState(older,newer);
  assert.equal(selected.profiles[0].name, 'New fallback');
  assert.equal(selected.profiles[0].progress['smg:qq9'].gold, true);
  assert.equal(selected.profiles[0].progress['smg:qq9'].zombies.matches, 3);
});
test('a valid database copy survives damaged fallback data', () => {
  const saved = aSave('Existing profile',1000);
  assert.equal(chooseSavedState(saved,{profiles:[]}).profiles[0].name,'Existing profile');
});
test('legacy data without savedAt stays compatible', () => {
  const legacy = aSave('Legacy profile',0);
  delete legacy.savedAt;
  assert.equal(chooseSavedState(legacy,null).profiles[0].name,'Legacy profile');
});
test('corrupted copies are not silently replaced with empty progress', () => {
  assert.throws(() => chooseSavedState({profiles:[]},{progress:{}}), /cannot be read/);
});
test('fallback saves and restores all camos without IndexedDB', async () => {
  globalThis.localStorage = memoryStorage();
  const state = aSave('Player',0,{'ar:m4':{gold:true,diamond:true,zombies:{aetherCrystal:true,matches:6}}});
  assert.equal(await saveState(state),'localStorage');
  const restored = await loadState();
  assert.equal(restored.profiles[0].progress['ar:m4'].gold,true);
  assert.equal(restored.profiles[0].progress['ar:m4'].zombies.aetherCrystal,true);
  assert.ok(restored.savedAt > 0);
});
test('corrupted fallback JSON does not get erased during startup', async () => {
  globalThis.localStorage = memoryStorage();
  globalThis.localStorage.setItem('camovault-state-v1','{not json');
  await assert.rejects(loadState(),/cannot be read/);
  assert.equal(globalThis.localStorage.getItem('camovault-state-v1'),'{not json');
});
