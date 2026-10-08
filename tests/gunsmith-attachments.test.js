import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from '../js/catalog.js';
import { attachmentChoices, attachmentCoverage, COVERED_WEAPON_IDS } from '../js/attachments.js';
import { exportBuildCode, importBuildCode } from '../js/build-share.js';
import { assignAttachment, defaultBuild, sanitizeBuild, updateBuildDetail, slotsFor } from '../js/loadouts.js';
import { cleanState, freshState } from '../js/storage.js';

test('every firearm has dropdown candidates or custom fallback and source provenance',()=>{
 const weapons=WEAPONS.filter(w=>slotsFor(w.category).length>0);
 assert.ok(weapons.length>100);
 for(const w of weapons){
  for(const slot of slotsFor(w.category)){
   const info=attachmentChoices(w.id,slot);
   assert.ok(Array.isArray(info.choices));
   assert.match(info.source,/^https:\/\//);
   assert.equal(new Set(info.choices).size,info.choices.length);
  }
 }
});
test('researched lists are weapon-specific and never imply full coverage',()=>{
 assert.ok(COVERED_WEAPON_IDS.length>=11);
 const qq9=attachmentChoices('smg:qq9','ammunition');
 assert.equal(qq9.verifiedSlot,true);
 assert.ok(qq9.choices.includes('10mm 30 Round Reload'));
 assert.ok(!qq9.choices.includes('80 Round Extended Mag'));
 const cordite=attachmentChoices('smg:cordite','ammunition');
 assert.ok(cordite.choices.includes('80 Round Extended Mag'));
 assert.equal(attachmentChoices('smg:static-hv','ammunition').specific,false);
 assert.equal(attachmentCoverage('smg:qq9').verified,true);
 assert.equal(attachmentCoverage('smg:static-hv').verified,false);
 assert.equal(qq9.complete,false);
});
test('CamoVault share code round trips five attachments and stats only',()=>{
 let p=defaultBuild();
 for(const [slot,value] of Object.entries({muzzle:'OWC Light Compensator',stock:'No Stock',ammunition:'10mm 30 Round Reload',underbarrel:'Merc Foregrip',reargrip:'Stippled Grip Tape'}))p=assignAttachment(p,'smg',slot,value);
 p=updateBuildDetail(p,'smg','Damage',49);
 p=updateBuildDetail(p,'smg','name','Aggressive QQ9');
 p=updateBuildDetail(p,'smg','notes','Private notes must not be shared');
 p=updateBuildDetail(p,'smg','gameCode','QQ9-ABC1DEF');
 const code=exportBuildCode('smg:qq9',p);
 assert.match(code,/^CV1\.[\w-]+\.[0-9a-f]{8}$/);
 const restored=importBuildCode(code,'smg:qq9');
 assert.deepEqual(restored.slots,p.presets[0].slots);
 assert.equal(restored.name,'Aggressive QQ9');
 assert.equal(restored.stats.Damage,49);
 assert.equal(restored.notes,'');
 assert.equal(restored.gameCode,'');
 assert.doesNotMatch(code,/Private notes|QQ9-ABC1DEF/);
});
test('invalid, tampered, game-native and other weapon codes are rejected',()=>{
 const p=defaultBuild(),share=exportBuildCode('ar:m4',p);
 assert.throws(()=>importBuildCode(share,'ar:ak-47'),/another weapon/);
 assert.throws(()=>importBuildCode('Static-HV-1T3A5B6A7M','smg:static-hv'),/Not a CamoVault/);
 assert.throws(()=>importBuildCode(share.slice(0,-1)+'f','ar:m4'),/checksum/);
 assert.throws(()=>importBuildCode('CV1.'+'A'.repeat(3010)+'.abcdef12','ar:m4'),/too long/);
});
test('native CODM codes are stored but never interpreted as attachment IDs',()=>{
 let p=updateBuildDetail(defaultBuild(),'smg','gameCode','Static-HV-1T3A5B6A7M');
 assert.equal(p.presets[0].gameCode,'Static-HV-1T3A5B6A7M');
 const state=freshState();
 state.profiles[0].builds['smg:static-hv']=p;
 const roundtrip=cleanState(JSON.parse(JSON.stringify(state)));
 assert.equal(roundtrip.profiles[0].builds['smg:static-hv'].presets[0].gameCode,'Static-HV-1T3A5B6A7M');
 assert.throws(()=>updateBuildDetail(p,'smg','gameCode','invalid<script>'),/unsupported characters/);
});
test('existing custom attachment names and legacy presets survive upgrades',()=>{
 const p=assignAttachment(defaultBuild(),'smg','barrel','Some new seasonal barrel');
 const copy=sanitizeBuild(JSON.parse(JSON.stringify(p)),'smg');
 assert.equal(copy.presets[0].slots.barrel,'Some new seasonal barrel');
 assert.equal(sanitizeBuild({presets:[{slots:{optic:'Red Dot Sight'}}]},'smg').presets[0].slots.optic,'Red Dot Sight');
});
