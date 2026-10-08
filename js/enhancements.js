const el=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=x=>new Date(x).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
export function seasonView(status={},offline=false,checking=false){
 const current=status.currentSeason,next=status.nextSeason,previous=(status.pastSeasons||[]).at(-1);
 el('seasonTitle').textContent=current?.title||'Season schedule';
 el('seasonSubtitle').textContent='New seasons never erase your previous weapon unlocks.';
 const slots=[['PREVIOUS',previous?.title||'No earlier season listed',previous?'Your progress stays saved':'Archive grows each season'],['CURRENT',current?.title||'Checking official schedule',current?'Started '+date(current.startsAt):'Awaiting verified news'],['NEXT',next?.title||'Not announced yet',next?'Starts '+date(next.startsAt):'Future announcements are reviewed']];
 el('seasonTimeline').innerHTML=slots.map(([label,name,meta],i)=>'<div class="season-step'+(i===1?' current':'')+'"><span class="name">'+label+'</span><strong>'+safe(name)+'</strong><small>'+safe(meta)+'</small></div>').join('');
 el('seasonHealth').textContent=checking?'Checking verified season records…':offline?'Offline: using your existing weapon data. Retry later.':status.checkedAt?'Catalog checked '+new Date(status.checkedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})+' · New announcements are reviewed before importing.':'Checking for updates…';
 el('seasonHealth').classList.toggle('warning',offline);
 el('seasonRefresh').disabled=checking;
}
export function focusView(weapons,progress,mode){
 const eligible=weapons.filter(w=>mode!=='zombies'||!['melee','launcher'].includes(w.category));
 eligible.sort((a,b)=>(progress[b.id]?.updatedAt||0)-(progress[a.id]?.updatedAt||0));
 const w=eligible[0];if(!w)return;
 const entry=progress[w.id]||{},z=entry.zombies||{};
 const count=mode==='zombies'?Number(z.matches)||0:['Sand','Dragon','Splinter','Tiger','Jungle','Reptile'].filter(k=>entry.gold||entry.base?.[k]).length+['gold','platinum','damascus','diamond'].filter(k=>entry[k]).length;
 const goal=mode==='zombies'?Number(z.target)||6:10;
 const pct=Math.round(Math.min(100,Math.max(0,count/goal*100)));
 el('focusTitle').textContent=w.name;
 el('focusSubtitle').textContent=mode==='zombies'?(z.aetherCrystal?'Aether Crystal unlocked':'Aether Crystal · '+count+'/'+goal+' qualified matches'):(entry.gold?'Gold achieved · ':'Camo grind · ')+count+'/10 milestones';
 el('focusPercent').textContent=pct+'%';el('focusTrack').style.width=pct+'%';
 el('focusResume').dataset.weaponTarget=w.id;
}
export function decorateWeaponCards(mode,progress){
 for(const card of [...document.querySelectorAll('#weaponGrid > .weapon-card')]){
  const id=card.dataset.weapon,e=progress[id]||{},done=mode==='zombies'?Boolean(e.zombies?.aetherCrystal):Boolean(e.gold);
  const wrap=document.createElement('article');wrap.className='weapon-card-shell';
  card.replaceWith(wrap);wrap.append(card);card.classList.add('weapon-card-inner');
  const actions=document.createElement('div');actions.className='weapon-actions';
  const quick=document.createElement('button');quick.type='button';quick.className='quick-action '+(done?'active ':'')+(mode==='zombies'?'zombies':'');quick.dataset.quick=id;quick.setAttribute('aria-pressed',String(done));quick.textContent=mode==='zombies'?(done?'✓ Aether':'Mark Aether'):(done?'✓ Gold':'Mark Gold');
  const favorite=document.createElement('button');favorite.type='button';favorite.className='favorite-button '+(e.favorite?'active':'');favorite.dataset.fav=id;favorite.setAttribute('aria-label',(e.favorite?'Remove favorite: ':'Favorite: ')+card.querySelector('.weapon-title')?.textContent);favorite.textContent=e.favorite?'★':'☆';
  const build=document.createElement('button');build.type='button';build.className='quick-action weapon-build-button';build.dataset.build=id;build.textContent='Build / 3D';build.setAttribute('aria-label','Open Gunsmith builder and 3D preview for '+(card.querySelector('.weapon-title')?.textContent||id));
  actions.append(quick,build,favorite);wrap.append(actions);
 }
}
