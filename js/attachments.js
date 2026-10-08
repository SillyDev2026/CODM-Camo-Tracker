// Curated community attachment *names*. This is NOT a live Activision database.
// "verified examples" means reported for the specific weapon, not an exhaustive
// current Gunsmith inventory. "common" entries are suggestions, not confirmed fit.
const COMMON = Object.freeze({
 muzzle:['Monolithic Suppressor','Tactical Suppressor','OWC Light Suppressor','OWC Light Compensator','RTC Light Muzzle Brake','MIP Light Flash Guard','Choke','Marauder Suppressor'],
 barrel:['MIP Light','MIP Extended Light Barrel','MIP Light Barrel (Short)','OWC Marksman','RTC Recon Tac Long'],
 optic:['Red Dot Sight','Classic Red Dot Sight','Holographic Sight','Tactical Scope','3X Tactical Scope 1','4X Tactical Scope'],
 stock:['No Stock','YKM Light Stock','YKM Combat Stock','MIP Strike Stock','OWC Skeleton Stock','RTC Steady Stock'],
 perk:['Sleight of Hand','FMJ','Fast Reload','Full Ammo','Long Shot'],
 laser:['OWC Laser - Tactical','MIP Laser 5mW','RTC Laser 1mW'],
 underbarrel:['Merc Foregrip','Strike Foregrip','Ranger Foregrip','Operator Foregrip','Tactical Foregrip A','Bipod'],
 ammunition:['40 Round Extended Mag','45 Round Extended Mag','Extended Mag','Fast Reload'],
 reargrip:['Stippled Grip Tape','Granulated Grip Tape','Rubberized Grip Tape']
});
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
 newer:'https://zilliongamer.com/call-of-duty-mobile/c/weapon-guide/best-guns-cod-mobile-season-6-2025'
});
// Each per-weapon item lists documented example choices, not every option.
// Coverage is intentionally partial; never infer a complete set from loadout articles.
const SPECIFIC = Object.freeze({
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
export function attachmentChoices(weaponId,slot){
 const found=SPECIFIC[weaponId],known=found?.slots?.[slot]||[];
 const common=COMMON[slot]||[];
 // For covered weapons, prefer documented examples; no generic options that
 // could misrepresent fit. The custom field handles anything not yet listed.
 const choices=found?known:common;
 return {choices:[...new Set(choices)],specific:!!found,verifiedSlot:known.length>0,source:found?.source||SOURCES.common,complete:false};
}
export function attachmentCoverage(weaponId){
 const found=SPECIFIC[weaponId];
 return found?{label:'RESEARCHED EXAMPLES · NOT COMPLETE',source:found.source,knownSlots:Object.keys(found.slots).length,verified:true}:{label:'GENERAL SUGGESTIONS · WEAPON FIT UNVERIFIED',source:SOURCES.common,knownSlots:0,verified:false};
}
