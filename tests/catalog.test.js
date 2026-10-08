import test from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, WEAPONS, STARTER_GOLD, BASIC_CAMOS, weaponCompletion, completedCount, goldTotal } from '../js/catalog.js';
import { freshState, cleanState, cleanProfile, cleanProgress } from '../js/storage.js';
import { cloudPath } from '../js/github.js';

test('all weapons have unique IDs and known classes', () => {
  assert.equal(WEAPONS.length, new Set(WEAPONS.map(w => w.id)).size);
  assert.equal(GROUPS.length, 9);
  assert.equal(WEAPONS.filter(w => w.category === 'smg').length, 32);
  for (const weapon of WEAPONS) assert(GROUPS.some(group => group.id === weapon.category));
});
test('six player Gold weapons are all present in SMG roster', () => {
  assert.equal(STARTER_GOLD.length, 6);
  assert.equal(new Set(STARTER_GOLD).size, 6);
  assert(STARTER_GOLD.every(id => WEAPONS.some(w => w.id === id && w.category === 'smg')));
});
test('profile backup safely roundtrips and rejects invalid data', () => {
  const state = freshState();
  state.profiles[0].progress[STARTER_GOLD[0]] = { gold: true, notes: 'done' };
  const copy = cleanState(JSON.parse(JSON.stringify(state)));
  assert.equal(copy.activeProfileId, state.activeProfileId);
  assert.equal(copy.profiles[0].progress[STARTER_GOLD[0]].gold, true);
  assert.equal(goldTotal(copy.profiles[0].progress, 'smg'), 1);
  assert.throws(() => cleanState({ profiles: [] }));
  assert.throws(() => cleanProfile(null));
});
test('malformed progress is sanitized and completion consistent', () => {
  const output = cleanProgress({ 'smg:qq9': { gold: true, notes: 'X'.repeat(1000), diamondCount: -5, base: { Sand: false } } });
  assert.equal(output['smg:qq9'].base.Sand, true);
  assert.equal(output['smg:qq9'].notes.length, 800);
  assert.equal(output['smg:qq9'].diamondCount, 0);
  assert.equal(weaponCompletion(output['smg:qq9']), BASIC_CAMOS.length + 1);
  assert.equal(completedCount(output, 'gold'), 1);
});
test('cloud path isolates distinct player IDs', () => {
  const one = cloudPath({ id: 'profile-a123456' });
  const two = cloudPath({ id: 'profile-b123456' });
  assert.notEqual(one, two);
  assert.throws(() => cloudPath({ id: '../../bad' }));
});

test('roster only contains weapons, not tactical, lethal or scorestreak equipment', () => {
  const forbidden = /flashbang|smoke grenade|thermite|molotov|concussion|trophy system|uav|cluster strike|hunter killer|sentry gun|operator skill|perk/i;
  for (const weapon of WEAPONS) assert.doesNotMatch(weapon.name, forbidden);
  assert.deepEqual(GROUPS.map(group => group.id), ['smg', 'ar', 'lmg', 'sniper', 'marksman', 'shotgun', 'pistol', 'melee', 'launcher']);
});
