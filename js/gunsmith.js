import { SLOT_NAMES, STAT_NAMES, MAX_ATTACHMENTS, defaultBuild, sanitizeBuild, assignAttachment, updateBuildDetail, slotsFor, roleFor } from './loadouts.js';
import { attachmentChoices, attachmentCoverage } from './attachments.js';
import { exportBuildCode, importBuildCode } from './build-share.js';
import { startWeaponViewer } from './weapon-viewer.js';
// Native CODM codes and CamoVault CV1 codes are intentionally separate.
// CODM attachment IDs are not publicly documented; never fake game codes.
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function createGunsmith({getBuild,onSave,onClose,notify}){
 const modal=$('gunsmithModal'),backdrop=$('gunsmithBackdrop');
 let weapon=null,build=null,viewer=null,origin=null,notesTimer=null,notesPending=null;
 const current=()=>build.presets[build.active];
 function report(message){$('gunsmithStatus').textContent=message;notify?.(message);}
 function save(next,repaint=true){build=sanitizeBuild(next,weapon.category);onSave(weapon.id,build);if(repaint)redraw();}
 function flushNotes(){
  clearTimeout(notesTimer);notesTimer=null;
  if(!weapon||!notesPending)return;
  const {id,index,value}=notesPending;notesPending=null;
  if(weapon.id!==id)return;
  const draft=sanitizeBuild(build,weapon.category);
  draft.presets[index].notes=String(value).slice(0,500);
  save(draft,false);
 }
 function choicesMarkup(slot,selected){
  const data=attachmentChoices(weapon.id,slot),custom=Boolean(selected&&!data.choices.includes(selected));
  const options=['<option value="">— Empty slot —</option>',...data.choices.map(name=>'<option value="'+safe(name)+'"'+(name===selected?' selected':'')+'>'+safe(name)+'</option>'),'<option value="__custom__"'+(custom?' selected':'')+'>＋ Custom / unlisted attachment…</option>'];
  const note=data.verifiedSlot?'Weapon-specific examples':data.specific?'No verified choices for this slot':'Common suggestions · fit not verified';
  return '<label class="gs-slot"><span>'+safe(SLOT_NAMES[slot])+'</span><select data-gs-slot="'+slot+'" aria-label="'+safe(SLOT_NAMES[slot])+' attachment">'+options.join('')+'</select><input type="text" data-gs-custom="'+slot+'" maxlength="64" autocomplete="off" placeholder="Type actual in-game attachment" value="'+(custom?safe(selected):'')+'"'+(custom?'':' hidden')+'><small>'+safe(note)+'</small></label>';
 }
 function redraw(){
  if(!weapon)return;
  const p=current(),slots=slotsFor(weapon.category),used=Object.keys(p.slots).length;
  const coverage=attachmentCoverage(weapon.id);
  $('gunsmithName').textContent=weapon.name;
  $('gunsmithClass').textContent=weapon.category.toUpperCase();
  $('gunsmithRole').textContent=roleFor(weapon.category);
  $('gunsmithCapacity').textContent=used+' / '+MAX_ATTACHMENTS+' ATTACHMENTS';
  $('gunsmithPresets').innerHTML=build.presets.map((item,i)=>'<button type="button" class="gs-preset '+(i===build.active?'active':'')+'" data-gs-preset="'+i+'" aria-pressed="'+(i===build.active)+'">'+safe(item.name)+'</button>').join('');
  $('gunsmithSlots').innerHTML=slots.length?slots.map(slot=>choicesMarkup(slot,p.slots[slot]||'')).join(''):'<div class="gs-no-slots">No general five-slot Gunsmith attachment system is confirmed for this category. Your weapon notes and saved codes remain available.</div>';
  $('gunsmithBuildName').value=p.name;
  $('gunsmithNotes').value=p.notes;
  $('gunsmithGameCode').value=p.gameCode||'';
  $('gunsmithShareCode').value=exportBuildCode(weapon.id,build);
  $('gunsmithStats').innerHTML=STAT_NAMES.map(name=>{
   const v=p.stats[name],valid=typeof v==='number';
   return '<label class="gs-stat"><span>'+safe(name)+'</span><div class="gs-stat-track"><div style="width:'+(valid?v:0)+'%"></div></div><input data-gs-stat="'+safe(name)+'" type="number" inputmode="decimal" min="0" max="100" step="1" placeholder="—" value="'+(valid?v:'')+'" aria-label="'+safe(name)+' in-game stat"></label>';
  }).join('');
  $('gunsmithCoverage').textContent=coverage.label;
  $('gunsmithCoverage').classList.toggle('is-specific',coverage.verified);
  $('gunsmithSource').href=coverage.source;
  $('gunsmithSource').textContent=coverage.verified?'View weapon reference ↗':'View common attachment reference ↗';
  $('gunsmithInfo').textContent=coverage.verified?
   'Choices shown are researched examples, NOT a complete weapon inventory. Choose Custom for other actual in-game attachments.' :
   'The suggestions are not verified for this specific weapon. Check your in-game Gunsmith before using them, or choose Custom.';
 }
 function show(w,trigger=null){
  if(!w)return;
  if(weapon)hide();
  origin=trigger||document.activeElement;
  weapon=w;build=sanitizeBuild(getBuild(w.id)||defaultBuild(),w.category);
  $('gunsmithStatus').textContent='';
  $('gunsmithImportCode').value='';
  modal.hidden=false;backdrop.hidden=false;document.body.classList.add('gunsmith-open');
  redraw();
  viewer=startWeaponViewer($('gunsmithCanvas'),w,()=>current().slots);
  $('gunsmithClose').focus();
 }
 function hide(){
  if(!weapon)return;
  flushNotes();
  viewer?.destroy();viewer=null;weapon=null;build=null;notesPending=null;
  modal.hidden=true;backdrop.hidden=true;document.body.classList.remove('gunsmith-open');
  if(origin?.isConnected)origin.focus({preventScroll:true});
  origin=null;onClose?.();
 }
 async function copy(text,label){
  if(!text){report('Nothing to copy yet');return;}
  try{await navigator.clipboard.writeText(text);report(label);}
  catch{
   // Safe on older browsers where clipboard writes need a different permission.
   report('Clipboard unavailable; select the code field and copy it manually.');
  }
 }
 modal.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='gunsmithClose'){hide();return;}
  if(!weapon)return;
  if(b.dataset.gsPreset!==undefined){
   flushNotes();const next=sanitizeBuild(build,weapon.category);next.active=Number(b.dataset.gsPreset);save(next);return;
  }
  if(b.dataset.gsViewer){
   const which=b.dataset.gsViewer;
   if(which==='reset'){viewer?.reset();const spin=modal.querySelector('[data-gs-viewer="spin"]');spin?.setAttribute('aria-pressed','false');if(spin)spin.textContent='Auto rotate';}
   else if(which==='spin'){const active=viewer?.spin();b.setAttribute('aria-pressed',String(active));b.textContent=active?'Stop rotation':'Auto rotate';}
   else viewer?.zoom(which==='in'?.16:-.16);
   return;
  }
  if(b.dataset.gsCopy!==undefined){
   flushNotes();const p=current();
   await copy(weapon.name+' · '+p.name+'\n'+Object.entries(p.slots).map(([key,value])=>SLOT_NAMES[key]+': '+value).join('\n')+(p.notes?'\nNotes: '+p.notes:''),'Attachment list copied');
   return;
  }
  if(b.dataset.gsClear!==undefined){
   if(confirm('Clear all equipped attachments from this saved preset?')){flushNotes();const next=sanitizeBuild(build,weapon.category);next.presets[next.active].slots={};save(next);report('Attachments cleared');}return;
  }
  if(b.dataset.gsShare==='copy'){await copy($('gunsmithShareCode').value,'CamoVault build code copied');return;}
  if(b.dataset.gsShare==='game'){await copy($('gunsmithGameCode').value,'Saved CODM code copied');return;}
  if(b.dataset.gsShare==='import'){
   try {
    flushNotes();
    const preset=importBuildCode($('gunsmithImportCode').value,weapon.id);
    if(!confirm('Replace the current preset attachments, name and stats with this CamoVault build? Your camos and other presets remain unchanged.'))return;
    const next=sanitizeBuild(build,weapon.category);
    // Keep private notes and manually supplied native CODM code of the selected preset.
    preset.notes=next.presets[next.active].notes;preset.gameCode=next.presets[next.active].gameCode;
    next.presets[next.active]=preset;save(next);report('CamoVault code imported into this preset');
   }catch(error){report(error.message);}
   return;
  }
 });
 backdrop.addEventListener('click',hide);
 modal.addEventListener('change',e=>{
  if(!weapon)return;
  const el=e.target;
  try{
   if(el.dataset.gsSlot!==undefined){
    const slot=el.dataset.gsSlot;
    if(el.value==='__custom__'){
     const input=modal.querySelector('input[data-gs-custom="'+slot+'"]');
     if(input){input.hidden=false;input.focus();}
    }else save(assignAttachment(build,weapon.category,slot,el.value));
   }else if(el.dataset.gsCustom!==undefined){
    save(assignAttachment(build,weapon.category,el.dataset.gsCustom,el.value));
   }else if(el.dataset.gsStat!==undefined){
    save(updateBuildDetail(build,weapon.category,el.dataset.gsStat,el.value));
   }else if(el.id==='gunsmithBuildName'){
    flushNotes();save(updateBuildDetail(build,weapon.category,'name',el.value));
   }else if(el.id==='gunsmithGameCode'){
    flushNotes();save(updateBuildDetail(build,weapon.category,'gameCode',el.value));
    report('Original CODM code saved; CamoVault cannot decode it into attachments.');
   }else if(el.id==='gunsmithNotes'){
    notesPending={id:weapon.id,index:build.active,value:el.value};flushNotes();
   }
  }catch(error){report(error.message);redraw();}
 });
 modal.addEventListener('input',e=>{
  if(e.target.id==='gunsmithNotes'&&weapon){
   clearTimeout(notesTimer);notesPending={id:weapon.id,index:build.active,value:e.target.value};
   notesTimer=setTimeout(flushNotes,350);
  }
 });
 modal.addEventListener('focusout',e=>{
  if(e.target.id==='gunsmithNotes'&&weapon)flushNotes();
 });
 return {open:show,close:hide,isOpen:()=>!!weapon};
}
