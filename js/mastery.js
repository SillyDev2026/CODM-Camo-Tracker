// CamoVault manual weapon mastery and local rankings. This does not query CODM.
// Ranks are a screenshot-inspired reference, not official live Activision data.
import { WEAPONS, BASIC_CAMOS } from './catalog.js';
import { totalCamoStages } from './camo-challenges.js';
export const MASTER_TIERS=Object.freeze([
 {name:'Iron',min:0,color:'#92a2a5'},
 {name:'Gold',min:400,color:'#d8b65b'},
 {name:'Platinum',min:1000,color:'#5dd5d4'},
 {name:'Diamond',min:2000,color:'#d98dec'},
 {name:'Master',min:3500,color:'#e8a36b'},
 {name:'Master I',min:5000,color:'#f0bb54'},
 {name:'Master II',min:6500,color:'#c1d7eb'},
 {name:'Master III',min:8000,color:'#ab87f0'}
]);
const MAX=1000000;
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
export const bounded=(x,max=MAX)=>Number.isFinite(Number(x))?Math.min(max,Math.max(0,Math.floor(Number(x)))):0;
export function cleanWeaponMastery(input){
 const s=obj(input)?input:{};
 const kills=bounded(s.kills),deaths=bounded(s.deaths),headshots=Math.min(kills,bounded(s.headshots));
 const matches=bounded(s.matches),wins=Math.min(matches,bounded(s.wins));
 const history=Array.isArray(s.history)?s.history.slice(-12).filter(obj).map(h=>({
  id:typeof h.id==='string'&&/^[\w-]{1,65}$/.test(h.id)?h.id:'',
  at:Number.isFinite(h.at)&&h.at>0?h.at:0,
  kills:bounded(h.kills,500),deaths:bounded(h.deaths,500),headshots:bounded(h.headshots,500),
  win:h.win===true
 })).filter(h=>h.id):[];
 return {points:bounded(s.points),kills,deaths,headshots,matches,wins,history,updatedAt:Number.isFinite(s.updatedAt)?s.updatedAt:0};
}
export function cleanMasteryCollection(input){
 if(!obj(input))return {};
 const valid=new Set(WEAPONS.map(w=>w.id)),out={};
 for(const [id,raw] of Object.entries(input)){
  if(valid.has(id))out[id]=cleanWeaponMastery(raw);
 }
 return out;
}
export function masteryTier(points){
 const n=bounded(points);
 let i=0;
 for(let j=0;j<MASTER_TIERS.length;j++){if(n>=MASTER_TIERS[j].min)i=j;}
 const current=MASTER_TIERS[i],next=MASTER_TIERS[i+1]||null;
 return {...current,index:i,nextName:next?.name||null,nextAt:next?.min||null,
  spanPercent:next?Math.min(100,Math.max(0,Math.round((n-current.min)/(next.min-current.min)*100))):100,
  remaining:next?Math.max(0,next.min-n):0};
}
export function kdr(record){
 const s=cleanWeaponMastery(record);
 return s.kills===0?0:Number((s.kills/Math.max(1,s.deaths)).toFixed(2));
}
export function rate(a,b){return b>0?Number((a/b*100).toFixed(1)):0;}
export function addSession(existing,session,at=Date.now(),id=null){
 const current=cleanWeaponMastery(existing);
 const kills=bounded(session?.kills,500),deaths=bounded(session?.deaths,500),
  headshots=Math.min(kills,bounded(session?.headshots,500)),win=session?.win===true;
 if(kills===0&&deaths===0&&!win)throw Error('Record at least one kill, death, or a win');
 const key=id||globalThis.crypto?.randomUUID?.()||('match-'+at.toString(36)+'-'+Math.random().toString(36).slice(2));
 return cleanWeaponMastery({...current,
  kills:current.kills+kills,deaths:current.deaths+deaths,
  headshots:current.headshots+headshots,matches:current.matches+1,wins:current.wins+(win?1:0),
  history:[...current.history,{id:key,at,kills,deaths,headshots,win}].slice(-12),updatedAt:at});
}
export function undoSession(existing){
 const s=cleanWeaponMastery(existing);
 if(!s.history.length)throw Error('No recent match to undo');
 const last=s.history.at(-1);
 return cleanWeaponMastery({...s,kills:Math.max(0,s.kills-last.kills),
  deaths:Math.max(0,s.deaths-last.deaths),headshots:Math.max(0,s.headshots-last.headshots),
  matches:Math.max(0,s.matches-1),wins:Math.max(0,s.wins-(last.win?1:0)),
  history:s.history.slice(0,-1),updatedAt:Date.now()});
}
export function trackingScore(record,progress={}){
 const r=cleanWeaponMastery(record);
 // Purely a personal activity score, NOT CODM mastery points, MMR or skill.
 return Math.round(r.points+Math.min(r.kills,10000)*0.1+r.wins*4+
  totalCamoStages(progress)*3+(progress.gold?75:0)+(progress.platinum?100:0)+
  (progress.diamond?150:0)+(progress.damascus?150:0)+(progress.zombies?.aetherCrystal?75:0));
}
export function weaponRanking(profile,metric='score',category=null){
 const allowed=['score','points','kills','kd','headshots','wins','camos'];
 const key=allowed.includes(metric)?metric:'score';
 const all=WEAPONS.filter(w=>!category||w.category===category).map(w=>{
  const data=cleanWeaponMastery(profile?.mastery?.[w.id]),progress=profile?.progress?.[w.id]||{};
  const metrics={score:trackingScore(data,progress),points:data.points,kills:data.kills,
   kd:data.kills>=20?kdr(data):0,headshots:data.headshots,wins:data.wins,camos:totalCamoStages(progress)};
  return {id:w.id,name:w.name,category:w.category,record:data,progress,metrics,value:metrics[key]};
 });
 return all.sort((a,b)=>b.value-a.value||b.metrics.points-a.metrics.points||a.name.localeCompare(b.name));
}
export function profileRanking(profiles,metric='score'){
 const keys=['score','points','kills','wins','camos'],key=keys.includes(metric)?metric:'score';
 return (Array.isArray(profiles)?profiles:[]).map(p=>{
  const list=weaponRanking(p,'score'),totals={score:0,points:0,kills:0,wins:0,camos:0};
  for(const row of list)for(const field of keys)totals[field]+=row.metrics[field]||0;
  const best=list[0]?.value>0?list[0]:null;
  return {id:p.id,name:p.name,best,totals,value:totals[key]};
 }).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
}
export function weaponAwards(profile){
 const list=weaponRanking(profile,'score'),records=list.filter(w=>w.metrics.score>0);
 const any=w=>list.some(w);
 const conditions=[
  {id:'first-steps',name:'First Steps',hint:'Record any weapon mastery, kills or camo progress',earned:records.length>0},
  {id:'gold',name:'Gold Grinder',hint:'Confirm Gold on one weapon',earned:any(w=>w.progress.gold)},
  {id:'diamond',name:'Diamond Hunter',hint:'Confirm Diamond on one weapon',earned:any(w=>w.progress.diamond)},
  {id:'platinum',name:'Platinum Arsenal',hint:'Confirm Platinum on a weapon',earned:any(w=>w.progress.platinum)},
  {id:'damascus',name:'Damascus Collector',hint:'Confirm Damascus on a weapon',earned:any(w=>w.progress.damascus)},
  {id:'aether',name:'Undead Survivor',hint:'Confirm Aether Crystal on a weapon',earned:any(w=>w.progress.zombies?.aetherCrystal)},
  {id:'master',name:'Weapon Master',hint:'Enter at least 3,500 mastery points on a weapon',earned:any(w=>w.record.points>=3500)},
  {id:'headshots',name:'Sharpshooter',hint:'Record 100 headshots on one weapon',earned:any(w=>w.record.headshots>=100)},
  {id:'five',name:'Full Loadout',hint:'Unlock all 60 standard camo stages on one weapon',earned:any(w=>w.metrics.camos>=60)},
  {id:'ten',name:'Arsenal Veteran',hint:'Track progress on at least ten different weapons',earned:records.length>=10}
 ];
 return conditions;
}
