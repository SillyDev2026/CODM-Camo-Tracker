// Editable, community-curated roster. Confirm new releases against your in-game Gunsmith list.
export const GROUPS = [
  { id: 'smg', name: 'SMGs', short: 'SMG', target: 120, targetUnit: 'matches', weapons: `Static HV|FSS Hurricane|LC10|Sten|VMP|ISO|USS 9|TEC-9|CX-9|Striker 45|OTs 9|LAPA|Switchblade X9|KSP 45|MAC-10|PPSh-41|CBR4|MX9|PP19 Bizon|QXR|AGR 556|QQ9|Fennec|GKS|Cordite|HG 40|Pharo|Razorback|MSMC|Chicom|PDW-57|RUS-79U` },
  { id: 'ar', name: 'Assault Rifles', short: 'AR', target: 150, targetUnit: 'matches', weapons: `Cronen Squall|ISO Hemlock|BAL-27|RAM-7|Lachmann-556|XM4|LAG 53|Vargo-S|Type 19|BP50|Grau 5.56|Groza|Maddox|FFAR 1|Krig 6|EM2|Kilo 141|Oden|M13|Swordfish|AS VAL|CR-56 AMAX|Peacekeeper MK2|FR.556|HVK-30|DR-H|KN-44|HBRa3|ICR-1|Man-O-War|BK57|LK24|ASM10|M4|AK117|AK-47|Type 25|M16` },
  { id: 'lmg', name: 'LMGs', short: 'LMG', target: 120, targetUnit: 'matches', weapons: `DP27|RAAL MG|MG42|Bruen MK9|Dingo|PKM|Hades|Holger 26|Chopper|M4LMG|RPD|UL736|S36` },
  { id: 'sniper', name: 'Snipers', short: 'SNIPER', target: 120, targetUnit: 'matches', weapons: `LW3-Tundra|ZRG 20mm|HDR|Koshka|SVD|Rytec AMR|NA-45|Outlaw|Locus|DL Q33|XPR-50|M21 EBR|Arctic .50` },
  { id: 'marksman', name: 'Marksman Rifles', short: 'DMR', target: 120, targetUnit: 'matches', weapons: `Kilo Bolt-Action|SKS|SP-R 208|MK2|Type 63|M1 Garand|SO-14` },
  { id: 'shotgun', name: 'Shotguns', short: 'SHOTGUN', target: 120, targetUnit: 'matches', weapons: `BY15|Striker|HS2126|HS0405|KRM-262|Echo|R9-0|JAK-12|Argus|VLK Rogue|Einhorn Revolving|MX Guardian` },
  { id: 'pistol', name: 'Pistols', short: 'PISTOL', target: 80, targetUnit: 'matches', weapons: `MW11|J358|.50 GS|Renetti|Shorty|Crossbow|L-CAR 9|Dobvra|Nail Gun|Machine Pistol` },
  { id: 'melee', name: 'Melee', short: 'MELEE', target: 500, targetUnit: 'kills', weapons: `Base Melee|Knife|Axe|Baseball Bat|Katana|Shovel|Sickle|Wrench|Machete|Prizefighters|Nunchucks|Kali Sticks|Butterfly Knife|Sai|Ballistic Knife|Spear` },
  { id: 'launcher', name: 'Launchers', short: 'LAUNCHER', target: 100, targetUnit: 'objectives', weapons: `SMRS|FHJ-18|Thumper|D13 Sector` }
];
export const BASIC_CAMOS = ['Sand', 'Dragon', 'Splinter', 'Tiger', 'Jungle', 'Reptile'];
export const COMPLETIONIST = ['gold', 'platinum', 'damascus', 'diamond'];
export const WEAPONS = GROUPS.flatMap(group => group.weapons.split('|').map(name => ({
  id: `${group.id}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  category: group.id, name
})));
export const BY_ID = new Map(WEAPONS.map(weapon => [weapon.id, weapon]));
export const GROUP_BY_ID = new Map(GROUPS.map(group => [group.id, group]));
export const STARTER_GOLD = ['Cordite', 'QQ9', 'CBR4', 'Switchblade X9', 'OTs 9', 'TEC-9'].map(name => WEAPONS.find(weapon => weapon.category === 'smg' && weapon.name.toLowerCase() === name.toLowerCase()).id);

export function progressFor(progress, weaponId) {
  return progress?.[weaponId] || {};
}
export function goldTotal(progress, category) {
  return WEAPONS.filter(weapon => (!category || weapon.category === category) && progressFor(progress, weapon.id).gold).length;
}
export function completedCount(progress, field, category) {
  return WEAPONS.filter(weapon => (!category || weapon.category === category) && Boolean(progressFor(progress, weapon.id)[field])).length;
}
export function weaponCompletion(entry) {
  const basics = BASIC_CAMOS.filter(camo => entry?.base?.[camo]).length;
  // Marking Gold implies all basic challenge families have been completed.
  return (entry?.gold ? 6 : basics) + COMPLETIONIST.filter(key => entry?.[key]).length;
}
