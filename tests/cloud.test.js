import test from 'node:test';
import assert from 'node:assert/strict';
import {readCloudProfile,writeCloudProfile} from '../js/github.js';

const owner='Tester',repo='private-backups';
const base={id:'profile123',name:'Player',createdAt:123,cloudSyncAt:0,
 progress:{'smg:qq9':{gold:true,zombies:{aetherCrystal:true,matches:6}}},
 builds:{'smg:qq9':{presets:[{name:'Close range',slots:{muzzle:'Monolithic Suppressor'}}]}},
 attachmentLibrary:{'smg:qq9':{optic:['Custom QQ9 red dot']}}};
function mockResponse(status,data={}){
 return {ok:status>=200&&status<300,status,async json(){return data;}};
}
test('GitHub uploads only the selected profile and retains builds, custom gun parts and camos',async()=>{
 const orig=globalThis.fetch;
 let sent;
 globalThis.fetch=async(url,options={})=>{
  assert.ok(url.includes('/repos/Tester/private-backups/contents/camovault/profiles/profile123.json'));
  if(!options.method||options.method==='GET')return mockResponse(404);
  assert.equal(options.method,'PUT');
  const body=JSON.parse(options.body);
  const decoded=Buffer.from(body.content,'base64').toString('utf8');
  sent=JSON.parse(decoded);
  return mockResponse(201,{commit:{sha:'commit123'}});
 };
 try{
  const done=await writeCloudProfile('github_pat_fake_1234567890',owner,repo,base);
  assert.equal(done.commit,'commit123');
  assert.ok(done.savedAt>0);
  assert.equal(sent.id,base.id);
  assert.equal(sent.progress['smg:qq9'].zombies.aetherCrystal,true);
  assert.equal(sent.builds['smg:qq9'].presets[0].name,'Close range');
  assert.deepEqual(sent.attachmentLibrary['smg:qq9'].optic,['Custom QQ9 red dot']);
  assert.equal(sent.token,undefined);
 }finally{globalThis.fetch=orig;}
});
test('GitHub failed upload 404 never counts as success and gives actionable error',async()=>{
 const orig=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_url,opts={})=>{
  calls++;
  return mockResponse(404,{message:'Not Found'});
 };
 try{
  await assert.rejects(writeCloudProfile('github_pat_fake_1234567890',owner,repo,base),/Repository not found or write access/);
  assert.equal(calls,2);
 }finally{globalThis.fetch=orig;}
});
test('an older remote copy is readable without transmitting profile secrets',async()=>{
 const orig=globalThis.fetch;let hit=0;
 globalThis.fetch=async(url,opts={})=>{
  hit++;assert.equal(opts.cache,'no-store');
  const profile={...base,savedAt:3333};
  return mockResponse(200,{type:'file',size:50,sha:'sha123',content:Buffer.from(JSON.stringify(profile)).toString('base64')});
 };
 try{
  const result=await readCloudProfile('github_pat_fake_1234567890',owner,repo,base);
  assert.equal(result.profile.savedAt,3333);
  assert.equal(result.sha,'sha123');
  assert.equal(hit,1);
 }finally{globalThis.fetch=orig;}
});
test('remote changes newer than the local sync cursor are never overwritten',async()=>{
 const orig=globalThis.fetch;let put=0;
 globalThis.fetch=async(_url,opts={})=>{
  if(opts.method==='PUT'){put++;return mockResponse(201,{commit:{sha:'unsafe'}});}
  const remote={...base,savedAt:10000};
  return mockResponse(200,{type:'file',size:50,sha:'sha_remote',content:Buffer.from(JSON.stringify(remote)).toString('base64')});
 };
 try{
  await assert.rejects(writeCloudProfile('github_pat_fake_1234567890',owner,repo,{...base,cloudSyncAt:9999}),/newer backup/);
  assert.equal(put,0);
 }finally{globalThis.fetch=orig;}
});
