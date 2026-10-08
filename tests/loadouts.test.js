import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanBuilds, defaultBuild, sanitizeBuild, assignAttachment, updateBuildDetail, slotsFor, MAX_ATTACHMENTS } from '../js/loadouts.js';
import { freshState, cleanState, cleanProfile } from '../js/storage.js';

test('all nine weapon categories support inspection; firearms have editable build slots',()=>{
 const cats=['ar','smg','lmg','sniper','marksman','shotgun','pistol','melee','launcher'];
 for(const category of cats){
  const slots=slotsFor(category);
  assert.ok(Array.isArray(slots));
  assert.equal(new Set(slots).size,slots.length);
 }
 assert.equal(slotsFor('melee').length,0);
 assert.equal(slotsFor('launcher').length,0);
 assert.ok(slotsFor('smg').includes('underbarrel'));
});
test('three independent builds retain labels, attachments, notes and stats',()=>{
 const a=assignAttachment(defaultBuild(),'smg','optic','Red Dot Sight');
 const b=updateBuildDetail(a,'smg','Accuracy',75);
 const c=updateBuildDetail(b,'smg','notes','My close-range build');
 c.active=1;
 const d=assignAttachment(c,'smg','muzzle','Suppressor');
 assert.equal(d.presets[0].slots.optic,'Red Dot Sight');
 assert.equal(d.presets[0].stats.Accuracy,75);
 assert.equal(d.presets[0].notes,'My close-range build');
 assert.equal(d.presets[1].slots.muzzle,'Suppressor');
 assert.equal(d.presets[2].name,'Build 3');
});
test('five attachments maximum while existing ones can be replaced or removed',()=>{
 let p=defaultBuild();
 for(const s of ['muzzle','barrel','optic','stock','perk'])p=assignAttachment(p,'ar',s,s);
 assert.equal(Object.keys(p.presets[0].slots).length,MAX_ATTACHMENTS);
 assert.throws(()=>assignAttachment(p,'ar','laser','Laser'),/Five attachments/);
 p=assignAttachment(p,'ar','optic','4x Scope');
 assert.equal(p.presets[0].slots.optic,'4x Scope');
 p=assignAttachment(p,'ar','optic','');
 assert.equal(p.presets[0].slots.optic,undefined);
 p=assignAttachment(p,'ar','laser','Tactical Laser');
 assert.equal(Object.keys(p.presets[0].slots).length,5);
});
test('unsupported melee and launcher attachments are rejected',()=>{
 assert.throws(()=>assignAttachment(defaultBuild(),'melee','optic','Sight'),/no optic slot/);
 assert.throws(()=>assignAttachment(defaultBuild(),'launcher','muzzle','Test'),/no muzzle slot/);
});
test('sanitization removes malformed slots and untrusted profile entries',()=>{
 const payload={'smg:qq9':{active:9,presets:[{name:'Test',slots:{optic:'Optic',muzzle:'Muzzle',barrel:'Barrel',laser:'Laser',perk:'Perk',reargrip:'Extra',unknown:'bad'},stats:{Damage:150,'bad':'value'},notes:'note'}]},'tactical:flashbang':{}};
 const b=cleanBuilds(payload);
 assert.deepEqual(Object.keys(b),['smg:qq9']);
 assert.equal(b['smg:qq9'].active,2);
 assert.equal(Object.keys(b['smg:qq9'].presets[0].slots).length,5);
 assert.equal(b['smg:qq9'].presets[0].stats.Damage,100);
});
test('legacy camo profiles and new builds both survive full JSON backup normalization',()=>{
 const state=freshState();
 state.profiles[0].progress['smg:qq9']={gold:true,zombies:{aetherCrystal:true,matches:6}};
 state.profiles[0].builds['smg:qq9']=assignAttachment(defaultBuild(),'smg','optic','Red Dot');
 const clean=cleanState(JSON.parse(JSON.stringify(state)));
 assert.equal(clean.profiles[0].progress['smg:qq9'].gold,true);
 assert.equal(clean.profiles[0].progress['smg:qq9'].zombies.aetherCrystal,true);
 assert.equal(clean.profiles[0].builds['smg:qq9'].presets[0].slots.optic,'Red Dot');
 const legacy=cleanProfile({id:'profile123',name:'Old',progress:{'ar:m4':{gold:true}}});
 assert.deepEqual(legacy.builds,{});
});
