import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../js/catalog.js';
import {cleanAttachmentLibrary,weaponLibrary,rememberAttachment,forgetAttachment,attachmentListFor,BUILD_FOCUS,buildTip} from '../js/attachment-library.js';
import {attachmentChoices} from '../js/attachments.js';
import {cleanState,freshState} from '../js/storage.js';

test('all listed firearm weapons support a separate personal attachment catalog',()=>{
 const firearm=WEAPONS.filter(w=>!['melee','launcher'].includes(w.category));
 assert.ok(firearm.length>100,'should cover full firearm roster');
 for(const w of firearm){
  const s=rememberAttachment({},w.id,'optic','My '+w.name+' optic');
  assert.deepEqual(weaponLibrary(s,w.id).optic,['My '+w.name+' optic']);
  assert.equal(Object.keys(s).length,1);
 }
});
test('part names never bleed between guns, even within the same class',()=>{
 let s=rememberAttachment({},'smg:qq9','ammunition','10mm 30 Round Reload');
 s=rememberAttachment(s,'smg:fennec','ammunition','Extended Mag A');
 assert.deepEqual(weaponLibrary(s,'smg:qq9').ammunition,['10mm 30 Round Reload']);
 assert.deepEqual(weaponLibrary(s,'smg:fennec').ammunition,['Extended Mag A']);
 assert.deepEqual(weaponLibrary(s,'smg:rus-79u'),{});
 assert.deepEqual(attachmentListFor(s,'smg:qq9','ammunition',attachmentChoices('smg:qq9','ammunition').choices),[]);
 assert.deepEqual(attachmentListFor(s,'smg:fennec','ammunition',[]),['Extended Mag A']);
});
test('remove suggestion without changing equipped build or other gun',()=>{
 let s=rememberAttachment({},'ar:m4','optic','My Scope');
 s=rememberAttachment(s,'ar:ak-47','optic','My Scope');
 const updated=forgetAttachment(s,'ar:m4','optic','My Scope');
 assert.equal(weaponLibrary(updated,'ar:m4').optic,undefined);
 assert.deepEqual(weaponLibrary(updated,'ar:ak-47').optic,['My Scope']);
});
test('reject unsuitable weapon classes, slot spoofing and dangerous values',()=>{
 assert.throws(()=>rememberAttachment({},'melee:knife','optic','Laser'),/no confirmed/);
 assert.throws(()=>rememberAttachment({},'smg:qq9','unknown','Barrel'),/Invalid attachment/);
 assert.throws(()=>rememberAttachment({},'smg:qq9','optic','<img>'),/valid attachment/);
 assert.deepEqual(cleanAttachmentLibrary({'__proto__':{optic:['hack']},'smg:qq9':{optic:['Red Dot Sight','red dot sight','',10]}})['smg:qq9'].optic,['Red Dot Sight']);
});
test('personal attachments survive JSON serialization, profile switching and backup cleanup',()=>{
 const state=freshState(),id='sniper:rytec-amr';
 state.profiles[0].attachmentLibrary=rememberAttachment({},id,'ammunition','25x59mm Thermite Mag');
 state.profiles[0].builds={};
 state.profiles[0].progress={'smg:qq9':{gold:true}};
 const saved=cleanState(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(saved.profiles[0].attachmentLibrary[id].ammunition,['25x59mm Thermite Mag']);
 assert.equal(saved.profiles[0].progress['smg:qq9'].gold,true);
 assert.deepEqual(cleanState({version:1,profiles:[{id:'legacy-profile',name:'Legacy',progress:{},builds:{}}],activeProfileId:'legacy-profile'}).profiles[0].attachmentLibrary,{});
});
test('all six build goals provide guidance without inventing numeric weapon bonuses',()=>{
 for(const focus of Object.keys(BUILD_FOCUS)){
  const tip=buildTip(focus,'smg');
  assert.ok(tip.length>35);
  assert.doesNotMatch(tip,/guaranteed|100%|\\+\\d+%/i);
 }
});
