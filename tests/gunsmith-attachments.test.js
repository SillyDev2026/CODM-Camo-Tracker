import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from '../js/catalog.js';
import { attachmentChoices, attachmentCoverage, COVERED_WEAPON_IDS, isListedAttachment } from '../js/attachments.js';
import { exportBuildCode, importBuildCode } from '../js/build-share.js';
import { assignAttachment, defaultBuild, sanitizeBuild, updateBuildDetail, slotsFor } from '../js/loadouts.js';
import { cleanState, freshState } from '../js/storage.js';

test('every firearm uses only its own weapon-specific attachment choices',()=>{
 const weapons=WEAPONS.filter(w=>slotsFor(w.category).length>0);
 assert.ok(weapons.length>100);
 for(const w of weapons){
  for(const slot of slotsFor(w.category)){
   const info=attachmentChoices(w.id,slot);
   assert.ok(Array.isArray(info.choices));
   if(info.specific)assert.match(info.source,/^https:\/\//);
   else {assert.equal(info.source,null);assert.deepEqual(info.choices,[]);}
   assert.equal(new Set(info.choices).size,info.choices.length);
  }
 }
});
test('researched lists are weapon-specific and never imply full coverage',()=>{
 assert.ok(COVERED_WEAPON_IDS.length>=31);
 const rytec=attachmentChoices('sniper:rytec-amr','ammunition');
 assert.deepEqual(rytec.choices,['25x59mm Thermite Mag','25x29mm Explosive Mag']);
 assert.equal(rytec.complete,false);
 const qq9=attachmentChoices('smg:qq9','ammunition');
 assert.equal(qq9.verifiedSlot,true);
 assert.ok(qq9.choices.includes('10mm 30 Round Reload'));
 assert.ok(!qq9.choices.includes('80 Round Extended Mag'));
 const cordite=attachmentChoices('smg:cordite','ammunition');
 assert.ok(cordite.choices.includes('80 Round Extended Mag'));
 assert.equal(attachmentChoices('smg:static-hv','barrel').choices.includes('Supe-SIL Suppressed Barrel'),true);
 assert.equal(attachmentChoices('smg:rus-79u','ammunition').specific,true);
 assert.ok(attachmentChoices('smg:rus-79u','ammunition').choices.includes('50 Round Extended Mag'));
 assert.deepEqual(attachmentChoices('smg:rus-79u','optic').choices,[]);
 assert.equal(attachmentCoverage('smg:qq9').verified,true);
 assert.equal(attachmentCoverage('smg:static-hv').verified,true);
 assert.equal(attachmentCoverage('smg:rus-79u').verified,true);
 assert.equal(qq9.complete,false);
 assert.equal(isListedAttachment('smg:qq9','ammunition','10mm 30 Round Reload'),true);
 assert.equal(isListedAttachment('smg:fennec','ammunition','10mm 30 Round Reload'),false);
 assert.equal(isListedAttachment('smg:fennec','ammunition','Extended Mag A'),true);
 assert.equal(attachmentChoices('smg:fennec','ammunition').choices.includes('80 Round Extended Mag'),false);
 assert.equal(attachmentChoices('smg:uss-9','barrel').choices.includes('13.1" First Responder'),true);
 assert.equal(attachmentChoices('marksman:type-63','ammunition').choices.includes('GRU Mag Clamp'),true);
 assert.equal(attachmentChoices('ar:bp50','muzzle').choices.includes('Maxim Silencer'),true);
});
test('CamoVault share code round trips five attachments and stats only',()=>{
 let p=defaultBuild();
 for(const [slot,value] of Object.entries({muzzle:'OWC Light Compensator',stock:'No Stock',ammunition:'10mm 30 Round Reload',underbarrel:'Merc Foregrip',reargrip:'Stippled Grip Tape'}))p=assignAttachment(p,'smg',slot,value);
 p=updateBuildDetail(p,'smg','Damage',49);
 p=updateBuildDetail(p,'smg','name','Aggressive QQ9');
 p=updateBuildDetail(p,'smg','notes','Private notes must not be shared');
 p=updateBuildDetail(p,'smg','gameCode','QQ9-ABC1DEF');
 p=updateBuildDetail(p,'smg','gameMode','BATTLE ROYALE');
 p=updateBuildDetail(p,'smg','focus','control');
 const code=exportBuildCode('smg:qq9',p);
 assert.match(code,/^CV1\.[\w-]+\.[0-9a-f]{8}$/);
 const restored=importBuildCode(code,'smg:qq9');
 assert.deepEqual(restored.slots,p.presets[0].slots);
 assert.equal(restored.name,'Aggressive QQ9');
 assert.equal(restored.stats.Damage,49);
 assert.equal(restored.notes,'');
 assert.equal(restored.gameCode,'');
 assert.equal(restored.gameMode,'BATTLE ROYALE');
 assert.equal(restored.focus,'control');
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

test('dropdowns never inherit unrelated weapon choices from the same class',()=>{
 const examples=[
  ['smg:qq9','smg:fennec','ammunition','10mm 30 Round Reload'],
  ['smg:cordite','smg:uss-9','ammunition','80 Round Extended Mag'],
  ['marksman:type-63','marksman:sks','ammunition','GRU Mag Clamp'],
  ['ar:bp50','ar:m4','barrel','LEROY 438mm Rapid'],
  ['lmg:raal-mg','lmg:mg42','muzzle','RAAL Monocore']
 ];
 for(const [source,other,slot,value] of examples){
  assert.ok(attachmentChoices(source,slot).choices.includes(value));
  assert.ok(!attachmentChoices(other,slot).choices.includes(value));
 }
 assert.match(attachmentCoverage('smg:rus-79u').source,/rus-79u/);
});
test('partial weapon-specific catalog never deletes older user-entered names',()=>{
 let p=assignAttachment(defaultBuild(),'smg','ammunition','Uncatalogued CODM Mag');
 p=assignAttachment(p,'smg','muzzle','Custom Muzzle');
 const restored=sanitizeBuild(JSON.parse(JSON.stringify(p)),'smg');
 assert.equal(restored.presets[0].slots.ammunition,'Uncatalogued CODM Mag');
 assert.equal(restored.presets[0].slots.muzzle,'Custom Muzzle');
});

test('new researched weapon-specific choices are safe and isolated',()=>{
 const examples=[
  ['smg:rus-79u','ammunition','50 Round Extended Mag','smg:qq9'],
  ['ar:ak117','ammunition','40 Round Extended Mag','ar:dr-h'],
  ['ar:dr-h','ammunition','25 Round OTM Mag','ar:ak117'],
  ['smg:mac-10','ammunition','STANAG 53 Round Extended Reload','smg:gks'],
  ['smg:gks','ammunition','32 Round Fast Reload','smg:mac-10'],
  ['shotgun:krm-262','muzzle','Marauder Suppressor','smg:gks'],
  ['sniper:rytec-amr','ammunition','25x59mm Thermite Mag','sniper:dl-q33']
 ];
 for(const [id,slot,value,other] of examples){
  assert.ok(attachmentChoices(id,slot).choices.includes(value),id+' missing own attachment');
  assert.ok(!attachmentChoices(other,slot).choices.includes(value),id+' attachment leaked into '+other);
 }
});
