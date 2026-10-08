// CamoVault portable Gunsmith codes. NOT native CODM codes.
// Does not include profile IDs, passwords, personal notes, or GitHub secrets.
import { sanitizeBuild } from './loadouts.js';
const MAGIC='CV1';
function checksum(text){
 let h=2166136261;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,'0');
}
function encodeText(s){
 let bytes=new TextEncoder().encode(s),out='';
 for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(out).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeText(s){
 if(!/^[\w-]+$/.test(s))throw Error('Invalid build code characters');
 const binary=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
 return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
}
export function exportBuildCode(weaponId,build){
 if(!/^(?:ar|smg|lmg|sniper|marksman|shotgun|pistol|melee|launcher):[a-z0-9-]{1,90}$/.test(weaponId))throw Error('Unknown weapon ID');
 const category=weaponId.slice(0,weaponId.indexOf(':'));
 const p=sanitizeBuild(build,category).presets[sanitizeBuild(build,category).active];
 // Preserve no private notes and no player identity.
 const payload=JSON.stringify({v:1,w:weaponId,n:p.name,s:p.slots,t:p.stats});
 const raw=encodeText(payload);
 const code=MAGIC+'.'+raw+'.'+checksum(payload);
 if(code.length>3000)throw Error('Build is too large to share');
 return code;
}
export function importBuildCode(code,expectedWeaponId){
 const input=String(code||'').trim();
 if(input.length>3000)throw Error('Share code is too long');
 const parts=input.split('.');
 if(parts.length!==3||parts[0]!==MAGIC||! /^[a-f0-9]{8}$/.test(parts[2]))throw Error('Not a CamoVault CV1 build code. CODM game codes cannot be decoded here.');
 let json;
 try{json=decodeText(parts[1]);}
 catch{throw Error('Build code could not be decoded');}
 if(checksum(json)!==parts[2])throw Error('Build code checksum does not match');
 let data;
 try{data=JSON.parse(json);}
 catch{throw Error('Build code is not valid JSON');}
 if(!data||data.v!==1||typeof data.w!=='string'||data.w!==expectedWeaponId)throw Error('This build code belongs to another weapon');
 if(!data.s||typeof data.s!=='object'||Array.isArray(data.s)||typeof data.n!=='string')throw Error('Share code is missing attachments');
 const category=expectedWeaponId.split(':')[0];
 const preset=sanitizeBuild({active:0,presets:[{name:data.n,slots:data.s,stats:data.t||{},notes:'',gameCode:''}]},category).presets[0];
 return preset;
}
