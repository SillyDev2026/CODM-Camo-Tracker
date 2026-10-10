import test from 'node:test';
import assert from 'node:assert/strict';
import { BASIC_CAMOS, WEAPONS } from '../js/catalog.js';
import { CAMO_STEPS,camoObjective,camoFamilyProgress,cleanCamoChallenges,applyCamoChange,confirmCamoFamily,totalCamoStages,camoStageStatus } from '../js/camo-challenges.js';
import { cleanState,freshState } from '../js/storage.js';

test('60 individual camo stages exist for every weapon without inventing target numbers',()=>{
 assert.equal(BASIC_CAMOS.length,6);
 assert.equal(CAMO_STEPS,10);
 for(const w of WEAPONS){
  for(const family of BASIC_CAMOS){
   const data=camoFamilyProgress({},family);
   assert.equal(data.unlocked.length,10);
   assert.equal(data.targets.length,10);
   assert.equal(data.count,0);
   assert.ok(data.targets.every(v=>v===null));
   assert.ok(camoObjective(w.category,family));
  }
 }
});
test('challenge descriptions vary for SMGs, rifles, snipers, shotguns and melee',()=>{
 assert.equal(camoObjective('smg','Jungle'),'Headshots');
 assert.equal(camoObjective('smg','Splinter'),'Double kills');
 assert.equal(camoObjective('ar','Splinter'),'Longshot kills');
 assert.equal(camoObjective('sniper','Dragon'),'Crouched kills');
 assert.equal(camoObjective('shotgun','Splinter'),'Double kills');
 assert.equal(camoObjective('melee','Tiger'),'Two-kill streaks');
 assert.equal(camoObjective('launcher','Jungle'),'Weapon-specific challenge');
});
test('example 10 headshots supports objective counts, independent target and manual unlock',()=>{
 let e={};
 e=applyCamoChange(e,'Jungle','target',10,0);
 e=applyCamoChange(e,'Jungle','count',9);
 let step=camoStageStatus(e,'Jungle',0);
 assert.deepEqual(step,{unlocked:false,target:10,count:9,ready:false});
 e=applyCamoChange(e,'Jungle','count',10);
 step=camoStageStatus(e,'Jungle',0);
 assert.equal(step.ready,true);
 assert.equal(step.unlocked,false,'reaching count does not invent a confirmed in-game unlock');
 e=applyCamoChange(e,'Jungle','unlocked',true,0);
 assert.equal(camoStageStatus(e,'Jungle',0).unlocked,true);
 assert.equal(totalCamoStages(e),1);
 assert.equal(e.base.Jungle,false);
 e=applyCamoChange(e,'Jungle','target','',0);
 assert.equal(camoStageStatus(e,'Jungle',0).target,null);
});
test('all stages and Gold migrate without resetting older profile data',()=>{
 const old={base:{Sand:true,Dragon:false},gold:true,diamond:true};
 assert.equal(totalCamoStages(old),60);
 let e=applyCamoChange(old,'Jungle','unlocked',false,2);
 assert.equal(camoFamilyProgress(e,'Jungle').unlocked[2],false);
 assert.equal(camoFamilyProgress(e,'Sand').unlocked.filter(Boolean).length,10);
 const state=freshState();
 state.profiles[0].progress['smg:sten']=e;
 const saved=cleanState(JSON.parse(JSON.stringify(state)));
 const entry=saved.profiles[0].progress['smg:sten'];
 assert.equal(entry.gold,true);
 assert.equal(entry.diamond,true);
 assert.equal(camoFamilyProgress(entry,'Jungle').unlocked[2],false);
 assert.equal(camoFamilyProgress(entry,'Sand').unlocked.filter(Boolean).length,10);
});
test('ten stages per family and completion status survive saved JSON roundtrips',()=>{
 let e={};
 e=applyCamoChange(e,'Sand','count',125);
 e=applyCamoChange(e,'Sand','target',25,0);
 e=applyCamoChange(e,'Sand','target',50,1);
 e=applyCamoChange(e,'Sand','unlocked',true,0);
 e=confirmCamoFamily(e,'Dragon',true);
 assert.equal(e.base.Dragon,true);
 assert.equal(e.base.Sand,false);
 const state=freshState();state.profiles[0].progress['ar:m4']=e;
 const restored=cleanState(JSON.parse(JSON.stringify(state))).profiles[0].progress['ar:m4'];
 assert.equal(camoFamilyProgress(restored,'Sand').count,125);
 assert.deepEqual(camoFamilyProgress(restored,'Sand').targets.slice(0,3),[25,50,null]);
 assert.equal(camoFamilyProgress(restored,'Dragon').unlocked.filter(Boolean).length,10);
 assert.equal(totalCamoStages(restored),11);
});
test('malformed saved targets and counts are bounded; no stage exceeds ten',()=>{
 const dirty={Jungle:{count:999999999,targets:[-4,0,NaN,10.5,12,999999999],unlocked:[true,'yes',false]}};
 const clean=cleanCamoChallenges(dirty);
 assert.equal(clean.Jungle.count,1000000);
 assert.deepEqual(clean.Jungle.targets.slice(0,6),[null,null,null,null,12,null]);
 assert.deepEqual(clean.Jungle.unlocked.slice(0,3),[true,false,false]);
 assert.throws(()=>applyCamoChange({},'Jungle','target',10,10),/Invalid camo stage/);
 assert.throws(()=>applyCamoChange({},'NotARealCamo','count',10),/Unknown camo family/);
});
test('manual all-ten bulk toggle leaves every other family independent',()=>{
 let e=confirmCamoFamily({},'Reptile',true);
 assert.equal(totalCamoStages(e),10);
 assert.equal(e.base.Reptile,true);
 e=confirmCamoFamily(e,'Reptile',false);
 assert.equal(totalCamoStages(e),0);
 assert.equal(e.base.Reptile,false);
});
