// User-authored loadouts. Attachment inventories differ by weapon in CODM;
// names are entered from the in-game Gunsmith rather than guessed by this site.
export const SLOT_NAMES={muzzle:'Muzzle',barrel:'Barrel',optic:'Optic',stock:'Stock',perk:'Perk',laser:'Laser',underbarrel:'Underbarrel',ammunition:'Ammunition',reargrip:'Rear Grip'};
export const STAT_NAMES=['Damage','Fire Rate','Accuracy','Mobility','Range','Control'];
export const MAX_ATTACHMENTS=5;
const ALL=Object.keys(SLOT_NAMES),PISTOL=['muzzle','barrel','optic','perk','laser','ammunition','reargrip'];
const ROLES={ar:'Balanced primary · adaptable for most engagements',smg:'Close range · mobility and aggressive handling',lmg:'Sustained fire · magazine capacity and stability',sniper:'Long range · precision and aiming',marksman:'Precision rifle · flexible long-range engagements',shotgun:'Short range · spread, range and mobility',pistol:'Secondary firearm · fast handling',melee:'Melee weapon · no standard five-slot Gunsmith',launcher:'Launcher · no standard five-slot Gunsmith'};
export const roleFor=category=>ROLES[category]||'Weapon';
export const slotsFor=category=>['melee','launcher'].includes(category)?[]:category==='pistol'?PISTOL:ALL;
export const defaultBuild=()=>({active:0,presets:[1,2,3].map(i=>({name:'Build '+i,slots:{},stats:{},notes:'',gameCode:'',gameMode:'MULTIPLAYER'}))});
const obj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
export function sanitizeBuild(raw,category){
 const value=obj(raw)?raw:{},presets=Array.isArray(value.presets)?value.presets:[];
 return {active:Number.isInteger(value.active)?Math.max(0,Math.min(2,value.active)):0,presets:[0,1,2].map(i=>{
  const p=obj(presets[i])?presets[i]:{},slots={},stats={},allowed=slotsFor(category);
  if(obj(p.slots))for(const slot of allowed) {
   const name=p.slots[slot];
   if(typeof name==='string'&&name.trim()&&Object.keys(slots).length<MAX_ATTACHMENTS)slots[slot]=name.trim().slice(0,64);
  }
  if(obj(p.stats))for(const key of STAT_NAMES)if(p.stats[key]!==''&&p.stats[key]!=null&&Number.isFinite(Number(p.stats[key])))stats[key]=Math.min(999,Math.max(0,Number(p.stats[key])));
  return {name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,32):'Build '+(i+1),slots,stats,notes:typeof p.notes==='string'?p.notes.slice(0,500):'',gameCode:typeof p.gameCode==='string'&&/^[A-Za-z0-9][A-Za-z0-9-_ .]{0,110}$/.test(p.gameCode.trim())?p.gameCode.trim():'',gameMode:p.gameMode==='BATTLE ROYALE'?'BATTLE ROYALE':'MULTIPLAYER'};
 })};
}
export function cleanBuilds(raw){
 if(!obj(raw))return {};
 const output={};
 for(const [id,build] of Object.entries(raw).slice(0,400)){
  if(!/^(ar|smg|lmg|sniper|marksman|shotgun|pistol|melee|launcher):[a-z0-9-]{1,90}$/.test(id))continue;
  output[id]=sanitizeBuild(build,id.split(':')[0]);
 }
 return output;
}
export function assignAttachment(build,category,slot,value){
 const next=sanitizeBuild(build,category),preset=next.presets[next.active];
 if(!slotsFor(category).includes(slot))throw Error('This weapon class has no '+slot+' slot in this template');
 const label=String(value??'').trim().slice(0,64);
 if(!label){delete preset.slots[slot];return next;}
 if(!preset.slots[slot]&&Object.keys(preset.slots).length>=MAX_ATTACHMENTS)throw Error('Five attachments maximum per loadout');
 preset.slots[slot]=label;return next;
}
export function updateBuildDetail(build,category,field,value){
 const next=sanitizeBuild(build,category),preset=next.presets[next.active];
 if(field==='name')preset.name=String(value).trim().slice(0,32)||'Build '+(next.active+1);
 else if(field==='notes')preset.notes=String(value).slice(0,500);
 else if(field==='gameMode')preset.gameMode=value==='BATTLE ROYALE'?'BATTLE ROYALE':'MULTIPLAYER';
 else if(field==='gameCode'){
  const code=String(value||'').trim().slice(0,110);
  if(code&&!/^[A-Za-z0-9][A-Za-z0-9-_ .]*$/.test(code))throw Error('CODM share code contains unsupported characters');
  preset.gameCode=code;
 }
 else if(STAT_NAMES.includes(field)){
  if(value===''||value==null)delete preset.stats[field];
  else if(Number.isFinite(Number(value)))preset.stats[field]=Math.min(999,Math.max(0,Number(value)));
 }else throw Error('Unknown field');
 return next;
}
