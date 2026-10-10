import { SLOT_NAMES, STAT_NAMES, MAX_ATTACHMENTS, defaultBuild, sanitizeBuild, assignAttachment, updateBuildDetail, slotsFor, roleFor } from './loadouts.js';
import { attachmentChoices, attachmentCoverage, isListedAttachment, recommendedBuilds } from './attachments.js';
import { exportBuildCode, importBuildCode } from './build-share.js';
import { startWeaponViewer } from './weapon-viewer.js';
import { attachmentListFor, weaponLibrary, BUILD_FOCUS, buildTip } from './attachment-library.js';
// Native CODM codes and CamoVault CV1 codes are intentionally separate.
// CODM attachment IDs are not publicly documented; never fake game codes.
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function createGunsmith({getBuild,onSave,getLibrary,onRememberAttachment,onForgetAttachment,onClose,notify}){
 const modal=$('gunsmithModal'),backdrop=$('gunsmithBackdrop');
 let weapon=null,build=null,viewer=null,origin=null,notesTimer=null,notesPending=null;
 const current=()=>build.presets[build.active];
 function report(message){$('gunsmithStatus').textContent=message;notify?.(message);}
 function refreshShare(){if(weapon&&$('gunsmithShareCode'))$('gunsmithShareCode').value=exportBuildCode(weapon.id,build);}
 function refreshCapacity(){if(weapon)$('gunsmithCapacity').textContent=Object.keys(current().slots).length+' / '+MAX_ATTACHMENTS+' ATTACHMENTS';}
 function save(next,repaint=true){
  build=sanitizeBuild(next,weapon.category);
  onSave(weapon.id,build);
  if(repaint)redraw();
  else {refreshShare();refreshCapacity();}
 }
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
  const data=attachmentChoices(weapon.id,slot);
  const personal=attachmentListFor(getLibrary?.(),weapon.id,slot,data.choices);
  const options=['<option value="">— Empty slot —</option>'];
  if(data.choices.length)options.push('<optgroup label="Researched examples for this gun">'+data.choices.map(name=>'<option value="'+safe(name)+'"'+(name===selected?' selected':'')+'>'+safe(name)+'</option>').join('')+'</optgroup>');
  if(personal.length)options.push('<optgroup label="My saved '+safe(weapon.name)+' attachments">'+personal.map(name=>'<option value="'+safe(name)+'"'+(name===selected?' selected':'')+'>'+safe(name)+'</option>').join('')+'</optgroup>');
  const custom=!!(selected&&!data.choices.includes(selected)&&!personal.includes(selected));
  options.push('<option value="__custom__"'+(custom?' selected':'')+'>＋ Add an attachment for '+safe(weapon.name)+'…</option>');
  const note=data.verifiedSlot?'Researched choices · '+personal.length+' personal':personal.length?'Your saved names · not game-verified':data.specific?'No researched choices here':'Build your gun-specific list';
  return '<label class="gs-slot"><span>'+safe(SLOT_NAMES[slot])+'</span><select data-gs-slot="'+slot+'" aria-label="'+safe(weapon.name)+' '+safe(SLOT_NAMES[slot])+' attachment">'+options.join('')+'</select><input type="text" data-gs-custom="'+slot+'" maxlength="64" autocomplete="off" placeholder="Exact name from your CODM Gunsmith" value="'+(custom?safe(selected):'')+'"'+(custom?'':' hidden')+'><small>'+safe(note)+'</small></label>';
 }
 function myAttachmentMarkup(){
  const saved=weaponLibrary(getLibrary?.(),weapon.id);
  const parts=Object.entries(saved).flatMap(([slot,items])=>items.map(name=>
   '<span class="gs-library-chip"><span>'+safe(SLOT_NAMES[slot])+' · '+safe(name)+'</span><button type="button" data-gs-forget="'+safe(slot)+'" data-gs-name="'+safe(name)+'" aria-label="Remove '+safe(name)+' from saved '+safe(weapon.name)+' choices">×</button></span>'
  ));
  return parts.length?parts.join(''):'<span class="gs-hint">No personal attachments saved for this weapon yet. Pick Custom in any slot to add one.</span>';
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
  const examples=recommendedBuilds(weapon.id);
  $('gunsmithExamples').innerHTML=examples.length?
   examples.map((item,i)=>'<button type="button" class="gs-example" data-gs-example="'+i+'" title="A documented example, not live game data">'+safe(item.name)+'</button>').join(''):
   '<span class="gs-hint">No researched build available yet for this gun. Create a personal build from its attachment menus.</span>';

  $('gunsmithSlots').innerHTML=slots.length?slots.map(slot=>choicesMarkup(slot,p.slots[slot]||'')).join(''):'<div class="gs-no-slots">No standard five-slot Gunsmith system verified for this category. Notes and build codes remain available.</div>';
  $('gunsmithMyParts').innerHTML=myAttachmentMarkup();
  $('gunsmithFocus').value=p.focus||'balanced';
  $('gunsmithFocusTip').textContent=buildTip(p.focus,weapon.category);
  $('gunsmithBuildName').value=p.name;
  $('gunsmithNotes').value=p.notes;
  $('gunsmithGameCode').value=p.gameCode||'';
  $('gunsmithGameMode').value=p.gameMode||'MULTIPLAYER';
  refreshShare();
  $('gunsmithStats').innerHTML=STAT_NAMES.map(name=>{
   const v=p.stats[name],valid=typeof v==='number';
   return '<label class="gs-stat"><span>'+safe(name)+'</span><div class="gs-stat-track"><div style="width:'+(valid?Math.min(100,v):0)+'%"></div></div><input data-gs-stat="'+safe(name)+'" type="number" inputmode="decimal" min="0" max="999" step="1" placeholder="—" value="'+(valid?v:'')+'" aria-label="'+safe(name)+' in-game stat"></label>';
  }).join('');
  $('gunsmithCoverage').textContent=coverage.label;
  $('gunsmithCoverage').classList.toggle('is-specific',coverage.verified);
  $('gunsmithSource').hidden=!coverage.source;
  if(coverage.source)$('gunsmithSource').href=coverage.source;
  $('gunsmithSource').textContent='Weapon attachment source ↗';
  $('gunsmithInfo').textContent=coverage.verified?
   'Only researched '+weapon.name+' examples and your '+weapon.name+' personal library appear. These are not a complete live CODM inventory.' :
   'No published '+weapon.name+' attachment entries verified yet. Save exact names from your game: they will appear ONLY on this weapon in every preset.';
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
  if(b.dataset.gsForget!==undefined){
   onForgetAttachment?.(weapon.id,b.dataset.gsForget,b.dataset.gsName);
   redraw();report('Removed from '+weapon.name+' personal choices; equipped presets were not changed.');return;
  }
  if(b.dataset.gsPreset!==undefined){
   flushNotes();const next=sanitizeBuild(build,weapon.category);next.active=Number(b.dataset.gsPreset);save(next);return;
  }
  if(b.dataset.gsExample!==undefined){
   const example=recommendedBuilds(weapon.id)[Number(b.dataset.gsExample)];
   if(!example)return;
   flushNotes();
   if(!confirm('Apply '+example.name+' to this preset? This changes only its five attachments and name; other presets, camos, notes and codes remain unchanged.'))return;
   const next=sanitizeBuild(build,weapon.category);
   next.presets[next.active].slots={...example.slots};
   next.presets[next.active].name=example.name.slice(0,32);
   save(next);report('Researched example applied; check attachment availability in CODM.');
   return;
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
    }else if(el.value && !isListedAttachment(weapon.id,slot,el.value) && !attachmentListFor(getLibrary?.(),weapon.id,slot).includes(el.value)){
     throw Error('This attachment is not listed for '+weapon.name+'. Use Custom to record an attachment you verified in-game.');
    }else save(assignAttachment(build,weapon.category,slot,el.value),false);
   }else if(el.dataset.gsCustom!==undefined){
    const slot=el.dataset.gsCustom;
    const name=el.value.trim();
    if(!name)return;
    const next=assignAttachment(build,weapon.category,slot,name);
    // Validate capacity first. Never remount the focused input during blur,
    // otherwise a nearby preset/copy tap can be lost on Android.
    if(name)onRememberAttachment?.(weapon.id,slot,name);
    save(next,false);
    $('gunsmithMyParts').innerHTML=myAttachmentMarkup();
    const select=modal.querySelector('select[data-gs-slot="'+slot+'"]');
    if(select){
     if(!Array.from(select.options).some(option=>option.value===name)){
      const option=document.createElement('option');option.value=name;option.textContent=name;
      select.add(option,select.options.length-1);
     }
     select.value=name;
    }
   }else if(el.dataset.gsStat!==undefined){
    save(updateBuildDetail(build,weapon.category,el.dataset.gsStat,el.value),false);
    const bar=el.closest('.gs-stat')?.querySelector('.gs-stat-track>div');
    if(bar)bar.style.width=Math.min(100,Math.max(0,Number(el.value)||0))+'%';
   }else if(el.id==='gunsmithFocus'){
    save(updateBuildDetail(build,weapon.category,'focus',el.value),false);
    $('gunsmithFocusTip').textContent=buildTip(el.value,weapon.category);
   }else if(el.id==='gunsmithBuildName'){
    flushNotes();save(updateBuildDetail(build,weapon.category,'name',el.value),false);
    const currentButton=modal.querySelector('.gs-preset[aria-pressed="true"]');
    if(currentButton)currentButton.textContent=current().name;
   }else if(el.id==='gunsmithGameMode'){
    if(el.dataset.modeApplied!==el.value){
      flushNotes();save(updateBuildDetail(build,weapon.category,'gameMode',el.value),false);
    }
   }else if(el.id==='gunsmithGameCode'){
    flushNotes();save(updateBuildDetail(build,weapon.category,'gameCode',el.value),false);
    report('Original CODM code saved; CamoVault cannot decode it into attachments.');
   }else if(el.id==='gunsmithNotes'){
    notesPending={id:weapon.id,index:build.active,value:el.value};flushNotes();
   }
  }catch(error){report(error.message);redraw();}
 });
 modal.addEventListener('input',e=>{
  if(e.target.id==='gunsmithGameMode'&&weapon){
   const el=e.target;
   el.dataset.modeApplied=el.value;
   const next=updateBuildDetail(build,weapon.category,'gameMode',el.value);
   save(next,false);
   return;
  }
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
