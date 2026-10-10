// COD Mobile camo grind tracker: 10 individually confirmed stages per family.
// Thresholds and weapon-level unlocks vary; NEVER fabricate current numbers.
// Progress is manual (unofficial fan tracker), cumulative within a family.
import { BASIC_CAMOS } from './catalog.js';
export const CAMO_STEPS=10;
const MAX_COUNT=1000000;
const OBJECTIVES=Object.freeze({
 ar:['Weapon kills','Hip-fire kills','Longshot kills','Kills with five attachments','Headshots','Kills with zero attachments'],
 smg:['Weapon kills','Hip-fire kills','Double kills','Kills with five attachments','Headshots','Kills with zero attachments'],
 lmg:['Weapon kills','Hip-fire kills','Longshot kills','Kills with five attachments','Headshots','Kills with zero attachments'],
 sniper:['Weapon kills','Crouched kills','Longshot kills','Kills with five attachments','Headshots','Kills with zero attachments'],
 marksman:['Weapon kills','Crouched kills','Longshot kills','Kills with five attachments','Headshots','Kills with zero attachments'],
 shotgun:['Weapon kills','Hip-fire kills','Double kills','Kills with five attachments','Headshots','Kills with zero attachments'],
 pistol:['Weapon kills','Hip-fire kills','Longshot kills','Kills with five attachments','Headshots','Kills with zero attachments'],
 melee:['Weapon kills','Kills from behind','Crouched kills','Two-kill streaks','Kills with Dead Silence','Three-kill streaks'],
 launcher:['Launcher objectives','Weapon-specific challenge','Weapon-specific challenge','Weapon-specific challenge','Weapon-specific challenge','Weapon-specific challenge']
});
export const isCamoFamily=family=>BASIC_CAMOS.includes(family);
export function camoObjective(category,family){
 const i=BASIC_CAMOS.indexOf(family);
 return i<0?null:(OBJECTIVES[category]||OBJECTIVES.launcher)[i];
}
const isRecord=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(value,max=MAX_COUNT)=>Number.isFinite(Number(value))?Math.min(max,Math.max(0,Math.floor(Number(value)))):0;
export function camoFamilyProgress(entry,family){
 if(!isCamoFamily(family))throw Error('Unknown camo family');
 const source=entry?.camoChallenges?.[family];
 const raw=isRecord(source)?source:null;
 // Existing family checkmarks and Gold are migrated when first opened.
 // Once detailed challenges exist, that explicitly saved state wins.
 const legacy=!raw&&(entry?.base?.[family]===true||entry?.gold===true);
 const unlocked=Array.from({length:CAMO_STEPS},(_,i)=>raw?raw.unlocked?.[i]===true:legacy);
 const targets=Array.from({length:CAMO_STEPS},(_,i)=>{
  const v=raw?.targets?.[i];
  return Number.isInteger(v)&&v>=1&&v<=MAX_COUNT?v:null;
 });
 return {count:integer(raw?.count),targets,unlocked};
}
export function cleanCamoChallenges(raw){
 if(!isRecord(raw))return {};
 const out={};
 for(const family of BASIC_CAMOS){
  if(!isRecord(raw[family]))continue;
  out[family]=camoFamilyProgress({camoChallenges:{[family]:raw[family]}},family);
 }
 return out;
}
export function applyCamoChange(entry,family,field,value,stage=-1){
 if(!isCamoFamily(family))throw Error('Unknown camo family');
 if(field==='target'||field==='unlocked'){
  if(!Number.isInteger(stage)||stage<0||stage>=CAMO_STEPS)throw Error('Invalid camo stage');
 }else if(field!=='count')throw Error('Unknown camo edit');
 const next={...entry,camoChallenges:{...(entry.camoChallenges||{})},base:{...(entry.base||{})}};
 const progress=camoFamilyProgress(entry,family);
 if(field==='count')progress.count=integer(value);
 else if(field==='target')progress.targets[stage]=value===''||value==null?null:Math.max(1,integer(value));
 else progress.unlocked[stage]=value===true;
 next.camoChallenges[family]=progress;
 next.base[family]=progress.unlocked.every(Boolean);
 return next;
}
export function confirmCamoFamily(entry,family,completed){
 if(!isCamoFamily(family))throw Error('Unknown camo family');
 const next={...entry,camoChallenges:{...(entry.camoChallenges||{})},base:{...(entry.base||{})}};
 const progress=camoFamilyProgress(entry,family);
 progress.unlocked=Array(CAMO_STEPS).fill(completed===true);
 next.camoChallenges[family]=progress;
 next.base[family]=completed===true;
 return next;
}
export function totalCamoStages(entry){
 return BASIC_CAMOS.reduce((total,family)=>total+camoFamilyProgress(entry,family).unlocked.filter(Boolean).length,0);
}
export function camoStageStatus(entry,family,stage){
 const state=camoFamilyProgress(entry,family);
 const target=state.targets[stage];
 return {unlocked:state.unlocked[stage],target,count:state.count,ready:target!==null&&state.count>=target};
}
