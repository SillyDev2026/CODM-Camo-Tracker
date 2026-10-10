import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../js/catalog.js';
import {freshState,cleanState,cleanProfile} from '../js/storage.js';
import {MASTER_TIERS,cleanWeaponMastery,cleanMasteryCollection,masteryTier,kdr,rate,addSession,undoSession,trackingScore,weaponRanking,profileRanking,weaponAwards} from '../js/mastery.js';
import {rankingCsv} from '../js/mastery-ui.js';

test('Weapon Master tiers use ascending visible score thresholds',()=>{
 assert.deepEqual(MASTER_TIERS.map(x=>x.min),[0,400,1000,2000,3500,5000,6500,8000]);
 assert.equal(masteryTier(0).name,'Iron');
 assert.equal(masteryTier(399).name,'Iron');
 assert.equal(masteryTier(400).name,'Gold');
 assert.equal(masteryTier(1000).name,'Platinum');
 assert.equal(masteryTier(2000).name,'Diamond');
 assert.equal(masteryTier(3500).name,'Master');
 assert.equal(masteryTier(8000).name,'Master III');
 assert.equal(masteryTier(9000).remaining,0);
 assert.equal(masteryTier(500).remaining,500);
});
test('manual kills, wins and headshots are sanitized and do not exceed their denominators',()=>{
 const clean=cleanWeaponMastery({points:Infinity,kills:30,deaths:-20,headshots:40,matches:3,wins:9});
 assert.deepEqual([clean.points,clean.kills,clean.deaths,clean.headshots,clean.matches,clean.wins],[0,30,0,30,3,3]);
 assert.equal(kdr(clean),30);
 assert.equal(rate(clean.headshots,clean.kills),100);
 assert.equal(kdr({kills:0,deaths:0}),0);
});
test('matching one match updates totals and undo removes exactly one logged entry',()=>{
 let record=addSession({}, {kills:20,deaths:6,headshots:8,win:true},1000,'match-1');
 assert.equal(record.kills,20);
 assert.equal(record.wins,1);
 assert.equal(record.matches,1);
 assert.equal(record.headshots,8);
 record=addSession(record,{kills:25,deaths:4,headshots:10,win:false},2000,'match-2');
 assert.equal(record.kills,45);
 assert.equal(record.deaths,10);
 assert.equal(record.wins,1);
 assert.equal(record.matches,2);
 const undone=undoSession(record);
 assert.equal(undone.kills,20);
 assert.equal(undone.deaths,6);
 assert.equal(undone.headshots,8);
 assert.equal(undone.matches,1);
 assert.equal(undone.history.length,1);
 assert.throws(()=>undoSession({}),/No recent match/);
 assert.throws(()=>addSession({},{kills:0,deaths:0,win:false}),/Record at least/);
});
test('only twelve recent sessions are retained while lifetime totals keep accumulating',()=>{
 let r={};for(let i=0;i<18;i++)r=addSession(r,{kills:3,deaths:1,headshots:1,win:i%2===0},i+1,'session-'+i);
 assert.equal(r.matches,18);
 assert.equal(r.kills,54);
 assert.equal(r.wins,9);
 assert.equal(r.history.length,12);
 assert.equal(r.history[0].id,'session-6');
});
test('leaderboard is local, transparent and sortable by kills, mastery and camo score',()=>{
 const state=freshState(),p=state.profiles[0];
 p.mastery={'smg:qq9':{points:4000,kills:180,deaths:60,headshots:50,matches:12,wins:7},'ar:m4':{points:500,kills:900,deaths:400,headshots:30,matches:8,wins:4}};
 p.progress={'smg:qq9':{gold:true},'ar:m4':{gold:false}};
 const mastery=weaponRanking(p,'points').filter(r=>r.value>0);
 assert.equal(mastery[0].id,'smg:qq9');
 const kills=weaponRanking(p,'kills').filter(r=>r.value>0);
 assert.equal(kills[0].id,'ar:m4');
 assert.ok(trackingScore(p.mastery['smg:qq9'],p.progress['smg:qq9'])>4000);
 const byClass=weaponRanking(p,'kills','smg').filter(r=>r.value>0);
 assert.deepEqual(byClass.map(x=>x.id),['smg:qq9']);
 const awards=weaponAwards(p);
 assert.equal(awards.find(x=>x.id==='master').earned,true);
 assert.equal(awards.find(x=>x.id==='gold').earned,true);
});
test('local player leaderboard compares saved profiles and does not imply public players',()=>{
 const p1={id:'alpha',name:'Player Alpha',mastery:{'ar:m4':{points:1500,kills:100}},progress:{}};
 const p2={id:'beta',name:'Player Beta',mastery:{'ar:m4':{points:5000,kills:1200}},progress:{}};
 assert.equal(profileRanking([p1,p2],'points')[0].id,'beta');
 assert.equal(profileRanking([p1,p2],'kills')[0].id,'beta');
 assert.equal(profileRanking([],'points').length,0);
});
test('mastery lives in all backups and future season weapons survive sanitation',()=>{
 const state=freshState();
 state.profiles[0].mastery['smg:qq9']=addSession({}, {kills:25,deaths:5,headshots:10,win:true},1111,'test-unique');
 state.profiles[0].mastery['ar:future-gun-2030']={points:8500,kills:1000};
 const back=cleanState(JSON.parse(JSON.stringify(state)));
 assert.equal(back.profiles[0].mastery['smg:qq9'].history[0].id,'test-unique');
 assert.equal(back.profiles[0].mastery['ar:future-gun-2030'].points,8500);
 assert.deepEqual(cleanMasteryCollection({'fake':{points:99}}),{});
 assert.equal(cleanProfile({id:'profile-99',mastery:{'smg:qq9':{points:1234}}}).mastery['smg:qq9'].points,1234);
});
test('CSV rankings escape formula injection and do not export untracked weapons',()=>{
 const p={name:'Tester',mastery:{'smg:qq9':{points:1200,kills:20}},progress:{}};
 const file=rankingCsv(p,'weapons','points','smg',[p]);
 assert.ok(file.startsWith('\uFEFF'));
 assert.ok(file.includes('QQ9'));
 assert.ok(!file.includes('AK117'));
 const suspect={id:'x',name:'=IMPORTXML("evil")',mastery:{'smg:qq9':{points:100}},progress:{}};
 const csv=rankingCsv(p,'profiles','score','all',[suspect]);
 assert.ok(csv.includes("'=IMPORTXML"));
 assert.ok(!csv.includes('"=IMPORTXML'));
});
test('empty players start with no invented leaderboard or mastery statistics',()=>{
 const p=freshState().profiles[0];
 assert.equal(weaponRanking(p).some(w=>w.value>0),false);
 assert.equal(profileRanking([p])[0].value,0);
 assert.equal(weaponAwards(p).some(a=>a.earned),false);
 assert.equal(WEAPONS.length>100,true);
});
