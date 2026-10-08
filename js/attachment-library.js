// Locally confirmed per-weapon attachment names. This is not a shared attachment
// catalog and does not claim an Activision integration or compatibility validation.
// One player's entries remain scoped to that player profile and exact weapon ID.
import { slotsFor } from './loadouts.js';
const MAX_WEAPONS=250,MAX_NAMES_PER_SLOT=48;
const isRecord = v => !!v && typeof v==='object' && !Array.isArray(v);
const validId = id => typeof id==='string' && /^(ar|smg|lmg|sniper|marksman|shotgun|pistol):[a-z0-9-]{1,90}$/.test(id);
const validName = name => typeof name==='string' && name.trim().length>0 && name.trim().length<=64 && !/[<>\x00-\x1f]/.test(name);
function uniqueNames(names){
 const out=[],seen=new Set();
 for(const value of names){
  if(!validName(value))continue;
  const valueTrimmed=value.trim(),key=valueTrimmed.toLocaleLowerCase('en-US');
  if(!seen.has(key)){out.push(valueTrimmed);seen.add(key);}
  if(out.length>=MAX_NAMES_PER_SLOT)break;
 }
 return out;
}
export function cleanAttachmentLibrary(raw){
 if(!isRecord(raw))return {};
 const result={};
 for(const [id,slots] of Object.entries(raw).slice(0,MAX_WEAPONS)){
  if(!validId(id)||!isRecord(slots))continue;
  const allowed=slotsFor(id.split(':')[0]),stored={};
  for(const slot of allowed){
   const arr=slots[slot];
   if(!Array.isArray(arr))continue;
   const names=uniqueNames(arr.slice(0,MAX_NAMES_PER_SLOT*3));
   if(names.length)stored[slot]=names;
  }
  if(Object.keys(stored).length)result[id]=stored;
 }
 return result;
}
export function weaponLibrary(library,weaponId){
 if(!validId(weaponId))return {};
 const raw=isRecord(library)?library[weaponId]:null;
 return cleanAttachmentLibrary({[weaponId]:raw})[weaponId]||{};
}
export function rememberAttachment(library,weaponId,slot,name){
 if(!validId(weaponId))throw Error('This weapon has no confirmed editable Gunsmith slot template');
 if(!slotsFor(weaponId.split(':')[0]).includes(slot))throw Error('Invalid attachment slot for this weapon');
 if(!validName(name))throw Error('Enter a valid attachment name (1–64 characters)');
 const all=cleanAttachmentLibrary(library),item=all[weaponId]||{},prior=item[slot]||[];
 if(prior.some(value=>value.toLocaleLowerCase('en-US')===name.trim().toLocaleLowerCase('en-US')))return all;
 if(prior.length>=MAX_NAMES_PER_SLOT)throw Error('48 attachment names per category limit');
 item[slot]=[...prior,name.trim()];all[weaponId]=item;
 return all;
}
export function forgetAttachment(library,weaponId,slot,name){
 const all=cleanAttachmentLibrary(library),entry=all[weaponId];
 if(!entry||!slotsFor(weaponId.split(':')[0]).includes(slot))return all;
 const remaining=(entry[slot]||[]).filter(item=>item!==name);
 if(remaining.length)entry[slot]=remaining;else delete entry[slot];
 if(!Object.keys(entry).length)delete all[weaponId];
 return all;
}
export function attachmentListFor(library,weaponId,slot,researched=[]){
 const official=new Set(researched.map(s=>s.toLocaleLowerCase('en-US')));
 return (weaponLibrary(library,weaponId)[slot]||[]).filter(item=>!official.has(item.toLocaleLowerCase('en-US')));
}
export const BUILD_FOCUS=Object.freeze({
 balanced:{name:'Balanced',tip:'Start with recoil control and ADS handling. Compare what changes in your in-game Gunsmith before saving.'},
 control:{name:'Low recoil',tip:'Compare muzzle, underbarrel and rear grip options for vertical and horizontal recoil. Monitor movement and ADS penalties.'},
 handling:{name:'Fast ADS',tip:'Prioritize ADS speed, sprint-to-fire time and movement. Check whether the setup increases recoil or spread.'},
 range:{name:'Long range',tip:'Look for effective damage-range improvements, accuracy and recoil stability, while checking handling penalties.'},
 hipfire:{name:'Hip-fire',tip:'Look at laser and grip effects on hip-fire spread, then verify magazine capacity and sprint-to-fire time.'},
 stealth:{name:'Stealth',tip:'Check silencers available on this gun, plus their effect on damage range and ADS speed.'}
});
export function buildTip(focus,category){
 if(category==='sniper'||category==='marksman'){
  if(focus==='hipfire')return 'For precision rifles, verify hip-fire behavior in-game; most builds prioritize sight picture, steadiness and ADS timing.';
 }
 return (BUILD_FOCUS[focus]||BUILD_FOCUS.balanced).tip;
}
