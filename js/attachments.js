// Curated community attachment *names*. This is NOT a live Activision database.
// "verified examples" means reported for the specific weapon, not an exhaustive
// current Gunsmith inventory. All dropdowns are strictly keyed to the specific weapon ID.
const SOURCES = Object.freeze({
 gunsmith:'https://blog.activision.com/call-of-duty/2020-08/Call-of-Duty-Mobile-Gunsmith',
 common:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/cod-mobile-gunsmith-weapons-setup/',
 qq9:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-qq9-gunsmith-loadout-attachments-in-cod-mobile',
 mx9:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/mx9-gunsmith-attachments-list',
 m4:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-m4-gunsmith-loadout-attachments-in-cod-mobile',
 mow:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-man-o-war-gunsmith-loadout-attachments-in-cod-mobile',
 type25:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-type-25-gunsmith-loadout-attachments-in-cod-mobile',
 ak47:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-AK-47-gunsmith-loadout-attachments-in-cod-mobile',
 cordite:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/cordite-stats-attachment-skin/',
 cbr4:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/CBR4-stats-attachment-skin',
 dlq:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/dl-q33-stats-attachment-skin/',
 newer:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-guns-cod-mobile-season-6-2025',
 staticHV:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/static-hv-cod-mobile-loadout',
 fennec:'https://mobilematters.gg/cod-mobile/fennec-loadout-best',
 uss9:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-guns-cod-mobile-season-10-2024',
 switchblade:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-guns-cod-mobile-season-11-2024',
 cx9:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-guns-cod-mobile-season-4-2025',
 sks:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/sks-stats-attachment-skin',
 type63:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-cod-mobile-type-63-loadout',
 bp50:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-cod-mobile-bp50-loadout',
 seasonal:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-guns-cod-mobile-season-6-2025',
 raal:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-cod-mobile-raal-mg-loadout',
 rytec:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/rytec-amr-gunsmith-attachments-list',
 rus:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-rus-79u-gunsmith-loadout-attachments-in-cod-mobile',
 ak117:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-ak117-gunsmith-loadout-attachments-in-cod-mobile/',
 drh:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-dr-h-gunsmith-loadout-attachments-in-cod-mobile',
 mac10:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/mac-10-stats-attachment-skin',
 gks:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/gks-stats-attachment-skin/',
 krm:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/krm-262-stats-attachment-skin',
 rytec:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/rytec-amr-gunsmith-attachments-list'
});
// Each per-weapon item lists documented example choices, not every option.
// Coverage is intentionally partial; never infer a complete set from loadout articles.
const SPECIFIC = Object.freeze({
 'sniper:rytec-amr':{source:SOURCES.rytec,slots:{
  muzzle:['Tactical Suppressor','OWC Light Suppressor','Monolithic Suppressor','RTC Compensator','MIP Light Flash Guard','RTC Light Muzzle Brake'],
  barrel:['MIP Light Barrel (Short)','MIP Extended Light Barrel','OWC Marksman'],
  optic:['3X Tactical Scope 1','3X Tactical Scope 2','3X Tactical Scope 3','4X Tactical Scope','6X Tactical Scope 2','6X Tactical Scope 3'],
  stock:['YKM Light Stock','OWC Skeleton Stock','RTC Steady Stock'],
  laser:['OWC Laser - Tactical'],
  underbarrel:['Bipod'],
  ammunition:['25x59mm Thermite Mag','25x29mm Explosive Mag'],
  reargrip:['Granulated Grip Tape','Rubberized Grip Tape','Stippled Grip Tape']
 }},

 'smg:rus-79u':{source:SOURCES.rus,slots:{
  muzzle:['OWC Light Compensator'],barrel:['YKM Integral Suppressor Light','OWC Marksman'],
  stock:['No Stock','MIP Strike Stock','YKM Combat Stock'],
  laser:['OWC Laser - Tactical'],underbarrel:['Ranger Foregrip','Strike Foregrip'],
  ammunition:['38 Round Fast Reload','50 Round Extended Mag'],
  reargrip:['Granulated Grip Tape','Stippled Grip Tape']
 }},
 'ar:ak117':{source:SOURCES.ak117,slots:{
  muzzle:['RTC Light Muzzle Brake','Tactical Suppressor','RTC Muzzle Brake','OWC Light Compensator'],
  barrel:['MIP Extended Light Barrel','OWC Marksman'],stock:['OWC Skeleton Stock','No Stock'],
  laser:['OWC Laser - Tactical'],underbarrel:['Strike Foregrip'],
  ammunition:['40 Round Extended Mag'],reargrip:['Stippled Grip Tape']
 }},
 'ar:dr-h':{source:SOURCES.drh,slots:{
  muzzle:['OWC Light Compensator','Monolithic Suppressor'],
  barrel:['OWC Ranger'],stock:['No Stock','MIP Strike Stock'],
  laser:['OWC Laser - Tactical'],underbarrel:['Operator Foregrip','Strike Foregrip'],
  ammunition:['25 Round OTM Mag'],reargrip:['Stippled Grip Tape']
 }},
 'smg:mac-10':{source:SOURCES.mac10,slots:{
  muzzle:['Agency Suppressor'],barrel:['Taskforce Barrel'],stock:['Steel Stock'],
  underbarrel:['Striker Foregrip'],ammunition:['STANAG 53 Round Extended Reload']
 }},
 'smg:gks':{source:SOURCES.gks,slots:{
  barrel:['YKM Integral Suppressor'],stock:['YKM Combat Stock'],
  laser:['OWC Laser - Tactical'],ammunition:['32 Round Fast Reload'],
  reargrip:['Granulated Grip Tape']
 }},
 'shotgun:krm-262':{source:SOURCES.krm,slots:{
  muzzle:['Marauder Suppressor'],barrel:['Extended Barrel (+2)'],
  stock:['RTC Steady Stock'],laser:['MIP Laser 5mW'],
  reargrip:['Stippled Grip Tape']
 }},
 'sniper:rytec-amr':{source:SOURCES.rytec,slots:{
  muzzle:['Tactical Suppressor','OWC Light Suppressor','Monolithic Suppressor','RTC Compensator','MIP Light Flash Guard','RTC Light Muzzle Brake'],
  barrel:['MIP Light Barrel (Short)','MIP Extended Light Barrel','OWC Marksman'],
  optic:['3X Tactical Scope 1','3X Tactical Scope 2','3X Tactical Scope 3','4X Tactical Scope','6X Tactical Scope 2','6x Tactical Scope 3'],
  stock:['YKM Light Stock','OWC Skeleton Stock','RTC Steady Stock'],
  laser:['OWC Laser - Tactical'],underbarrel:['Bipod'],
  ammunition:['25x59mm Thermite Mag','25x29mm Explosive Mag'],
  reargrip:['Granulated Grip Tape','Rubberized Grip Tape','Stippled Grip Tape']
 }},

 // Weapon-specific examples are individual documented configurations,
 // NEVER an exhaustive list or compatibility guarantees for a future season.
 'smg:fennec':{source:SOURCES.fennec,slots:{
  muzzle:['Monolithic Suppressor'],stock:['RTC Steady Stock'],
  laser:['OWC Laser - Tactical'],ammunition:['Extended Mag A'],
  reargrip:['Granulated Grip Tape']
 }},
 'smg:uss-9':{source:SOURCES.uss9,slots:{
  muzzle:['Monolithic Suppressor'],barrel:['13.1" First Responder'],
  stock:['Standard-Issue Wood Stock'],ammunition:['.41 AE 32-Round Mags'],
  reargrip:['Granulated Grip Tape']
 }},
 'smg:switchblade-x9':{source:SOURCES.switchblade,slots:{
  muzzle:['Tactical Suppressor'],barrel:['MIP Extended Light Barrel'],
  stock:['YKM Light Stock'],ammunition:['Extended Mag A'],
  reargrip:['Granulated Grip Tape']
 }},
 'smg:cx-9':{source:SOURCES.cx9,slots:{
  muzzle:['CX-23S'],stock:['CX-FR'],underbarrel:['Tactical Foregrip A'],
  ammunition:['50 Round Drums'],reargrip:['CX-9 Ace Grip']
 }},
 'marksman:sks':{source:SOURCES.sks,slots:{
  muzzle:['Tactical Suppressor'],barrel:['MIP Extended Light Barrel'],
  stock:['MIP Stalker Stock'],perk:['Disable'],reargrip:['Granulated Grip Tape']
 }},
 'marksman:type-63':{source:SOURCES.type63,slots:{
  muzzle:['GRU Silencer'],barrel:['16.4" Titanium'],stock:['KGB Pad'],
  ammunition:['GRU Mag Clamp'],reargrip:['Field Tape']
 }},
 'ar:bp50':{source:SOURCES.bp50,slots:{
  muzzle:['Maxim Silencer'],barrel:['LEROY 438mm Rapid'],stock:['Removed Stock'],
  ammunition:['7.62x54MMR 30 Round Mags'],reargrip:['Stippled Grip']
 }},
 'ar:vargo-s':{source:SOURCES.seasonal,slots:{
  muzzle:['Maxim Silencer'],barrel:['NAZARYAN 336MM AG'],
  stock:['GABRIELYAN LP 33'],underbarrel:['M1941 Handstop'],
  reargrip:['Polymer Grip']
 }},
 'ar:hvk-30':{source:SOURCES.seasonal,slots:{
  muzzle:['Tactical Suppressor'],barrel:['OWC Marksman'],
  ammunition:['Large Caliber Ammo'],perk:['Sleight of Hand'],
  reargrip:['Rubberized Grip Tape']
 }},
 'ar:kilo-141':{source:SOURCES.seasonal,slots:{
  muzzle:['Tactical Suppressor'],barrel:['MIP Extended Light Barrel'],
  underbarrel:['Ranger Foregrip'],reargrip:['Granulated Grip Tape'],
  ammunition:['Large Extended Mag B']
 }},
 'lmg:mg42':{source:SOURCES.seasonal,slots:{
  muzzle:['Scythe Compensator'],stock:['Krausnick S91mg'],
  underbarrel:['MK6 PARA'],ammunition:['8MM Jaeger 100 Round Fast Mags'],
  reargrip:['Leather Grip']
 }},
 'lmg:raal-mg':{source:SOURCES.raal,slots:{
  muzzle:['RAAL Monocore','Tactical Suppressor'],
  barrel:['26.0" RAAL ArcForge','32.0" RAAL Line Breaker'],
  stock:['Folded Stock','FSS Resistor'],
  underbarrel:['Snatch Foregrip'],
  reargrip:['Stippled Grip Tape','Granulated Grip Tape']
 }},

 'smg:static-hv':{source:SOURCES.staticHV,slots:{
  barrel:['Supe-SIL Suppressed Barrel'],stock:['SL Tac Hive V.4 Stock'],
  laser:['Kimura RYL33 Laser Sight'],underbarrel:['Paracord Grip'],
  reargrip:['Thar-V1.2 Grip']
 }},
 'smg:qq9': {source:SOURCES.qq9,slots:{
  muzzle:['OWC Light Compensator','Tactical Suppressor'],
  barrel:['Monolithic Integral Suppressor'],
  stock:['No Stock','MIP Strike Stock','YKM Light Stock'],
  laser:['OWC Laser - Tactical'],
  underbarrel:['Merc Foregrip','Operator Foregrip','Strike Foregrip'],
  ammunition:['10mm 30 Round Reload','45 Round Extended Mag'],
  reargrip:['Stippled Grip Tape','Granulated Grip Tape']
 }},
 'smg:mx9':{source:SOURCES.mx9,slots:{
  muzzle:['OWC Light Suppressor','Agency Suppressor','Infantry Compensator','MIP Flashguard','OWC Eliminator','RTC Muzzle Brake'],
  barrel:['MIP Extended Light Barrel','Built-In Silence Barrel'],
  optic:['Red Dot Sight','Holographic Sight','Tactical Scope','3X Tactical Scope 1','3X Tactical Scope 2','3X Tactical Scope 3','4X Tactical Scope'],
  stock:['No Stock','Light Weight Stock','Marathon Stock','Agile Stock'],
  laser:['1mW Steady Aim Laser','5mW Combat Laser','Aim Assist Laser'],
  underbarrel:['RTC Speed Foregrip','Infiltrator Foregrip','Foregrip','Patrol Foregrip','Field Agent Foregrip'],
  ammunition:['38 Round Fast Reload','Large Caliber Ammo'],
  reargrip:['Rustle Grip Tape','Sturdy Grip Tape','Firm Grip Tape']
 }},
 'ar:m4':{source:SOURCES.m4,slots:{
  barrel:['MIP Light','YKM Integral Suppressor Light','OWC Marksman'],
  stock:['No Stock','MIP Strike Stock','YKM Combat Stock'],
  laser:['OWC Laser - Tactical'],
  underbarrel:['Merc Foregrip','Ranger Foregrip','Strike Foregrip'],
  ammunition:['40 Round Extended Mag','50 Round Extended Mag'],
  reargrip:['Rubberized Grip Tape','Stippled Grip Tape']
 }},
 'ar:man-o-war':{source:SOURCES.mow,slots:{
  barrel:['MIP Light Barrel (Short)'],
  stock:['MIP Strike Stock'],
  laser:['OWC Laser - Tactical'],
  underbarrel:['Strike Foregrip'],
  reargrip:['Granulated Grip Tape']
 }},
 'ar:ak-47':{source:SOURCES.ak47,slots:{
  muzzle:['OWC Light Compensator','Monolithic Suppressor'],
  barrel:['MIP Light Barrel (Short)','OWC Ranger','MIP Extended Light Barrel'],
  stock:['No Stock','MIP Strike Stock'],
  laser:['OWC Laser - Tactical'],
  underbarrel:['Strike Foregrip','Tactical Foregrip A'],
  ammunition:['Extended Mag A'],
  reargrip:['Granulated Grip Tape','Stippled Grip Tape']
 }},
 'smg:cordite':{source:SOURCES.cordite,slots:{
  muzzle:['Monolithic Suppressor'],barrel:['MIP Extended Light Barrel'],
  stock:['YKM Light Stock'],ammunition:['80 Round Extended Mag'],
  reargrip:['Granulated Grip Tape']
 }},
 'smg:cbr4':{source:SOURCES.cbr4,slots:{
  muzzle:['Tactical Suppressor'],barrel:['OWC Marksman'],
  stock:['YKM Combat Stock'],reargrip:['Granulated Grip Tape']
 }},
 'sniper:dl-q33':{source:SOURCES.dlq,slots:{
  barrel:['MIP Light'],stock:['YKM Combat Stock'],
  laser:['OWC Laser - Tactical'],perk:['Sleight of Hand'],
  ammunition:['Extended Mag A']
 }},
 'sniper:lw3-tundra':{source:SOURCES.newer,slots:{
  muzzle:['Tactical Suppressor'],barrel:['28.2" Tiger Team'],
  stock:['Bandit Steady Stock'],ammunition:['7 Rnd'],
  reargrip:['Airborne Elastic Wrap']
 }},
 'smg:vmp':{source:SOURCES.newer,slots:{
  muzzle:['Phoenix Suppressor'],barrel:['Tactical Lightweight Barrel'],
  stock:['Bandit Adjustable Pad'],underbarrel:['VX Pineapple Grip'],
  reargrip:['Phoenix Grip Set']
 }},
 'ar:type-25':{source:SOURCES.type25,slots:{
  stock:['RTC Steady Stock'],
  laser:['OWC Laser - Tactical'],
  underbarrel:['Strike Foregrip'],
  reargrip:['Granulated Grip Tape'],
  ammunition:['Stopping Power Reload']
 }}
});
export const GUNSMITH_SOURCES = SOURCES;
export const COVERED_WEAPON_IDS = Object.freeze(Object.keys(SPECIFIC));

// Deliberately no shared/class-wide options. All displayed choices originate
// from SPECIFIC[weaponId][slot] and must have a weapon-specific source.
export function attachmentChoices(weaponId, slot) {
 const found=Object.hasOwn(SPECIFIC,weaponId)?SPECIFIC[weaponId]:null;
 const known=found?.slots?.[slot]||[];
 return {choices:[...new Set(known)],specific:!!found,verifiedSlot:known.length>0,
  source:found?.source||null,complete:false};
}
export function attachmentCoverage(weaponId) {
 const found=Object.hasOwn(SPECIFIC,weaponId)?SPECIFIC[weaponId]:null;
 return found
  ?{label:'WEAPON-SPECIFIC EXAMPLES · PARTIAL LIST',source:found.source,knownSlots:Object.keys(found.slots).length,verified:true}
  :{label:'NO VERIFIED ATTACHMENT LIST FOR THIS WEAPON',source:null,knownSlots:0,verified:false};
}
export function isListedAttachment(weaponId,slot,value) {
 return attachmentChoices(weaponId,slot).choices.includes(value);
}

const PRESETS = Object.freeze({
 'smg:rus-79u':[
  {name:'Balanced · source build',source:SOURCES.rus,slots:{muzzle:'OWC Light Compensator',stock:'No Stock',laser:'OWC Laser - Tactical',underbarrel:'Ranger Foregrip',reargrip:'Granulated Grip Tape'}},
  {name:'Stealth · source build',source:SOURCES.rus,slots:{barrel:'YKM Integral Suppressor Light',stock:'MIP Strike Stock',underbarrel:'Ranger Foregrip',reargrip:'Stippled Grip Tape',ammunition:'38 Round Fast Reload'}}
 ],
 'ar:ak117':[
  {name:'Aggressive · source build',source:SOURCES.ak117,slots:{muzzle:'RTC Light Muzzle Brake',stock:'OWC Skeleton Stock',laser:'OWC Laser - Tactical',ammunition:'40 Round Extended Mag',reargrip:'Stippled Grip Tape'}},
  {name:'All rounder · source build',source:SOURCES.ak117,slots:{muzzle:'RTC Muzzle Brake',barrel:'MIP Extended Light Barrel',laser:'OWC Laser - Tactical',underbarrel:'Strike Foregrip',reargrip:'Stippled Grip Tape'}}
 ],
 'ar:dr-h':[
  {name:'Aggressive · source build',source:SOURCES.drh,slots:{muzzle:'OWC Light Compensator',stock:'No Stock',laser:'OWC Laser - Tactical',ammunition:'25 Round OTM Mag',reargrip:'Stippled Grip Tape'}},
  {name:'All rounder · source build',source:SOURCES.drh,slots:{muzzle:'OWC Light Compensator',barrel:'OWC Ranger',laser:'OWC Laser - Tactical',ammunition:'25 Round OTM Mag',reargrip:'Stippled Grip Tape'}}
 ],
 'smg:mac-10':[{name:'Run and gun · source build',source:SOURCES.mac10,slots:{muzzle:'Agency Suppressor',barrel:'Taskforce Barrel',stock:'Steel Stock',underbarrel:'Striker Foregrip',ammunition:'STANAG 53 Round Extended Reload'}}],
 'smg:gks':[{name:'Silenced · source build',source:SOURCES.gks,slots:{barrel:'YKM Integral Suppressor',stock:'YKM Combat Stock',laser:'OWC Laser - Tactical',ammunition:'32 Round Fast Reload',reargrip:'Granulated Grip Tape'}}],
 'shotgun:krm-262':[{name:'Range · source build',source:SOURCES.krm,slots:{muzzle:'Marauder Suppressor',barrel:'Extended Barrel (+2)',stock:'RTC Steady Stock',laser:'MIP Laser 5mW',reargrip:'Stippled Grip Tape'}}]
});
export function recommendedBuilds(weaponId){
 return (PRESETS[weaponId]||[]).map(p=>({name:p.name,source:p.source,slots:{...p.slots}}));
}
