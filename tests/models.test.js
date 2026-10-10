import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/models/manifest.json',import.meta.url),'utf8'));
const groups=['ar','smg','lmg','sniper','marksman','shotgun','pistol','melee','launcher'];

test('every supported weapon class has an imported local GLB file',()=>{
 assert.deepEqual(Object.keys(manifest.models).sort(),[...groups].sort());
 for(const category of groups){
  const entry=manifest.models[category];
  assert.equal(entry.file,'assets/models/'+category+'.glb');
  const model=fs.readFileSync(new URL('../'+entry.file,import.meta.url));
  assert.ok(model.byteLength>=15000,category+' has plausible 3D asset size');
  assert.equal(model.subarray(0,4).toString('ascii'),'glTF');
  assert.equal(model.readUInt32LE(4),2);
  assert.equal(model.readUInt32LE(8),model.byteLength);
  assert.equal(entry.license,'CC0-1.0');
  assert.match(entry.sourceCommit,/^[a-f0-9]{40}$/);
 }
});

test('model viewer runtime is self-hosted and licensed',()=>{
 const engine=fs.readFileSync(new URL('../assets/vendor/model-viewer.min.js',import.meta.url));
 assert.ok(engine.byteLength>100000);
 const license=fs.readFileSync(new URL('../assets/vendor/MODEL-VIEWER-LICENSE.txt',import.meta.url),'utf8');
 assert.match(license,/Apache License/);
});

test('service worker keeps core app available without eager-downloading any 3D assets',()=>{
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/camovault-assets-v\d+\.\d+\.\d+/);
 assert.ok(sw.includes("'./js/mastery.js'"));
 assert.ok(sw.includes("'./js/mastery-ui.js'"));
 assert.ok(sw.includes("'./js/app.js'"));
 assert.ok(sw.includes("'./js/catalog.js'"));
 assert.ok(sw.includes('Promise.allSettled(CORE.map'));
 assert.ok(sw.includes("url.pathname.endsWith('.glb')"));
 assert.doesNotMatch(sw,/cache\.addAll\(FILES\)/);
 assert.doesNotMatch(sw,/\.\/assets\/models\/ar\.glb'\s*,/);
});
