import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GROUPS, WEAPONS, BY_ID, registerSeasonalWeapons, validateSeasonalCatalog, weaponId, AETHER_KILLS, AETHER_MATCHES } from '../js/catalog.js';
import { cleanProgress, cleanState, freshState } from '../js/storage.js';
const manifest = JSON.parse(fs.readFileSync(new URL('../data/seasonal-weapons.json', import.meta.url)));
test('official Season 9 Grav is hidden before release and appears on release without duplicates', () => {
  const before = WEAPONS.length;
  const early = registerSeasonalWeapons(manifest, Date.parse('2026-10-14T23:59:59Z'));
  assert.equal(early.added, 0);
  assert.equal(early.upcoming.length, 1);
  const live = registerSeasonalWeapons(manifest, Date.parse('2026-10-15T00:00:00Z'));
  assert.equal(live.added, 1);
  assert.equal(WEAPONS.length, before + 1);
  assert.equal(BY_ID.get('ar:grav').name, 'Grav');
  assert.equal(registerSeasonalWeapons(manifest, Date.parse('2026-10-16T00:00:00Z')).added, 0);
  assert.equal(GROUPS.find(group => group.id === 'ar').weapons.split('|').includes('Grav'), true);
});
test('seasonal roster rejects unknown equipment, malformed data and duplicate entries', () => {
  assert.throws(() => validateSeasonalCatalog({version:1,weapons:[{name:'Flashbang',category:'tactical',releaseAt:'2026-11-01T00:00:00Z',source:'https://www.callofduty.com/blog/mobile'}]}));
  assert.throws(() => validateSeasonalCatalog({version:1,weapons:[manifest.weapons[0],manifest.weapons[0]]}), /Duplicate/);
  assert.equal(weaponId('ar','Grav'),'ar:grav');
});
test('Zombies Aether Crystal save is independent of original Multiplayer Gold and Diamonds', () => {
  const previous = cleanProgress({'smg:qq9': {gold:true,diamondCount:38,zombies:{aetherCrystal:true,matches:6,target:6,killsPerMatch:25}}});
  const value = previous['smg:qq9'];
  assert.equal(value.gold, true);
  assert.equal(value.diamondCount, 38);
  assert.equal(value.zombies.aetherCrystal,true);
  assert.equal(value.zombies.matches,6);
  const oldSave = cleanProgress({'smg:qq9':{gold:true}});
  assert.equal(oldSave['smg:qq9'].zombies.aetherCrystal,false);
  assert.equal(AETHER_MATCHES,6);
  assert.equal(AETHER_KILLS.smg,25);
  assert.equal(AETHER_KILLS.sniper,8);
  const state = freshState(); state.profiles[0].progress['smg:qq9']=value;
  assert.equal(cleanState(JSON.parse(JSON.stringify(state))).profiles[0].progress['smg:qq9'].zombies.aetherCrystal,true);
});
