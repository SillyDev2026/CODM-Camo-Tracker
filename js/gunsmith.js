import { SLOT_NAMES, STAT_NAMES, MAX_ATTACHMENTS, defaultBuild, sanitizeBuild, assignAttachment, updateBuildDetail, slotsFor, roleFor } from './loadouts.js';
import { startWeaponViewer } from './weapon-viewer.js';
// Gunsmith editor: attachments are player-entered, per weapon and per profile.
// CODM does not provide a public Gunsmith attachments API for this fan site.
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function createGunsmith({getBuild,onSave,onClose,notify}){
 const modal=$('gunsmithModal'),backdrop=$('gunsmithBackdrop');
 let weapon=null,build=null,viewer=null,origin=null;
 function current(){return build.presets[build.active];}
 function redraw(){
  if(!weapon)return;
  const preset=current(),slots=slotsFor(weapon.category),used=Object.keys(preset.slots).length;
  $('gunsmithName').textContent=weapon.name;
  $('gunsmithClass').textContent=weapon.category.toUpperCase();
  $('gunsmithRole').textContent=roleFor(weapon.category);
  $('gunsmithCapacity').textContent=used+' / '+MAX_ATTACHMENTS+' ATTACHMENTS';
  $('gunsmithPresets').innerHTML=build.presets.map((p,i)=>'<button type="button" class="gs-preset '+(i===build.active?'active':'')+'" data-gs-preset="'+i+'" aria-pressed="'+(i===build.active)+'">'+safe(p.name)+'</button>').join('');
  $('gunsmithSlots').innerHTML=slots.length
   ?slots.map(slot=>'<label class="gs-slot"><span>'+safe(SLOT_NAMES[slot])+'</span><input data-gs-slot="'+slot+'" type="text" maxlength="64" autocomplete="off" placeholder="Enter your in-game attachment" value="'+safe(preset.slots[slot]||'')+'"><small>'+(preset.slots[slot]?'EQUIPPED':'EMPTY')+'</small></label>').join('')
   :'<div class="gs-no-slots">This weapon class has no universal five-slot Gunsmith attachment system. The 3D concept viewer and saved notes are still available.</div>';
  $('gunsmithBuildName').value=preset.name;
  $('gunsmithNotes').value=preset.notes;
  $('gunsmithStats').innerHTML=STAT_NAMES.map(name=>{
   const value=preset.stats[name],valid=typeof value==='number';
   return '<label class="gs-stat"><span>'+safe(name)+'</span><div class="gs-stat-track"><div style="width:'+(valid?value:0)+'%"></div></div><input data-gs-stat="'+safe(name)+'" type="number" inputmode="decimal" min="0" max="100" step="1" placeholder="—" value="'+(valid?value:'')+'" aria-label="'+safe(name)+' in-game stat"></label>';
  }).join('');
  $('gunsmithInfo').textContent='Enter attachment names and numbers you see in CODM. Availability and stat values vary by weapon; no in-game values are auto-generated.';
 }
 function store(next) {build=sanitizeBuild(next,weapon.category);onSave(weapon.id,build);redraw();}
 function show(w,trigger=null){
  if(!w)return;
  if(weapon)hide();
  origin=trigger||document.activeElement;
  weapon=w;build=sanitizeBuild(getBuild(w.id)||defaultBuild(),w.category);
  modal.hidden=false;backdrop.hidden=false;document.body.classList.add('gunsmith-open');
  redraw();
  viewer=startWeaponViewer($('gunsmithCanvas'),w,()=>current().slots);
  $('gunsmithClose').focus();
 }
 function hide(){
  if(!weapon)return;
  viewer?.destroy();viewer=null;weapon=null;build=null;
  modal.hidden=true;backdrop.hidden=true;document.body.classList.remove('gunsmith-open');
  if(origin?.isConnected)origin.focus({preventScroll:true});
  origin=null;onClose?.();
 }
 function report(message){$('gunsmithStatus').textContent=message;notify?.(message);}
 modal.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='gunsmithClose'){hide();return;}
  if(!weapon)return;
  if(b.dataset.gsPreset!==undefined){const next=sanitizeBuild(build,weapon.category);next.active=Number(b.dataset.gsPreset);store(next);return;}
  if(b.dataset.gsViewer){const what=b.dataset.gsViewer;if(what==='reset')viewer?.reset();else if(what==='spin'){const active=viewer?.spin();b.setAttribute('aria-pressed',String(active));b.textContent=active?'Stop rotation':'Auto rotate';}else viewer?.zoom(what==='in'?.16:-.16);return;}
  if(b.dataset.gsCopy!==undefined){
   const p=current();
   const copy=weapon.name+' · '+p.name+'\n'+Object.entries(p.slots).map(([key,value])=>SLOT_NAMES[key]+': '+value).join('\n')+(p.notes?'\nNotes: '+p.notes:'');
   try{await navigator.clipboard.writeText(copy);report('Build copied to clipboard');}
   catch{report('Clipboard unavailable. Select and copy your attachment names manually.');}
   return;
  }
  if(b.dataset.gsClear!==undefined){if(confirm('Clear equipped attachments for this saved build?')){const next=sanitizeBuild(build,weapon.category);next.presets[next.active].slots={};store(next);report('Attachments cleared');}return;}
 });
 backdrop.addEventListener('click',hide);
 modal.addEventListener('change',e=>{
  if(!weapon)return;
  const el=e.target;
  try{
   if(el.dataset.gsSlot!==undefined)store(assignAttachment(build,weapon.category,el.dataset.gsSlot,el.value));
   else if(el.dataset.gsStat!==undefined)store(updateBuildDetail(build,weapon.category,el.dataset.gsStat,el.value));
   else if(el.id==='gunsmithBuildName')store(updateBuildDetail(build,weapon.category,'name',el.value));
   else if(el.id==='gunsmithNotes')store(updateBuildDetail(build,weapon.category,'notes',el.value));
  }catch(error){report(error.message);redraw();}
 });
 // Save notes as the user types, without re-creating a focused textarea.
 let notesTimer=null;
 modal.addEventListener('input',e=>{
  if(e.target.id!=='gunsmithNotes'||!weapon)return;
  clearTimeout(notesTimer);
  const currentId=weapon.id,idx=build.active,value=e.target.value;
  notesTimer=setTimeout(()=>{
   if(!weapon||weapon.id!==currentId||build.active!==idx)return;
   build=updateBuildDetail(build,weapon.category,'notes',value);
   onSave(currentId,build);
   notesTimer=null;
  },250);
 });
 modal.addEventListener('focusout',e=>{
  if(e.target.id!=='gunsmithNotes'||!weapon)return;
  if(notesTimer){clearTimeout(notesTimer);notesTimer=null;build=updateBuildDetail(build,weapon.category,'notes',e.target.value);onSave(weapon.id,build);}
 });
 return {open:show,close:hide,isOpen:()=>!!weapon};
}
