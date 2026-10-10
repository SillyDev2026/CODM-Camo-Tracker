import { WEAPONS, GROUPS } from './catalog.js?v=2.0.0';
import { MASTER_TIERS,masteryTier,cleanWeaponMastery,kdr,rate,weaponRanking,profileRanking,weaponAwards,trackingScore } from './mastery.js';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0).toLocaleString('en-US');
export function masteryPanel(weapon,profile){
 const data=cleanWeaponMastery(profile?.mastery?.[weapon.id]),tier=masteryTier(data.points);
 const score=trackingScore(data,profile?.progress?.[weapon.id]);
 const fields=[['points','Mastery points'],['kills','Kills'],['deaths','Deaths'],['headshots','Headshots'],['matches','Matches'],['wins','Wins']];
 const history=data.history.slice().reverse().slice(0,6);
 return '<section class="drawer-section cv-mastery" aria-label="Weapon Master tracking">'+
  '<div class="drawer-section-head">Weapon Master <small>Manual tracker · not live game data</small></div>'+
  '<div class="wm-tier" style="--rank-color:'+tier.color+'"><div class="wm-tier-top"><strong id="wmRank">'+safe(tier.name)+'</strong><span id="wmPoints">'+num(data.points)+' points</span></div>'+
  '<div class="wm-meter"><span id="wmBar" style="width:'+tier.spanPercent+'%"></span></div><small id="wmNext">'+(tier.nextAt?num(tier.remaining)+' points to '+safe(tier.nextName):'Highest displayed rank')+'</small></div>'+
  '<div class="wm-tier-track" aria-label="Weapon Master rank thresholds">'+MASTER_TIERS.map(t=>'<span title="'+safe(t.name)+': '+num(t.min)+' points" style="--rank-color:'+t.color+'">'+safe(t.name)+'</span>').join('')+'</div>'+
  '<p class="drawer-explainer">Enter the mastery points shown by CODM. Ranks follow your reference screenshot, not a verified live official rank feed. Matches and weapon performance are manually recorded.</p>'+
  '<div class="wm-fields">'+fields.map(([id,title])=>'<label>'+title+'<input type="number" min="0" max="1000000" step="1" inputmode="numeric" data-mastery-field="'+id+'" value="'+data[id]+'" aria-label="'+safe(title)+' for '+safe(weapon.name)+'"></label>').join('')+'</div>'+
  '<div class="wm-metrics" id="wmMetrics"><span>K/D <b>'+kdr(data).toFixed(2)+'</b></span><span>Headshot rate <b>'+rate(data.headshots,data.kills)+'%</b></span><span>Win rate <b>'+rate(data.wins,data.matches)+'%</b></span><span>Tracking score <b>'+num(score)+'</b></span></div>'+
  '<div class="wm-match-form"><strong>Log a match</strong><p>Add one match to your totals. Up to 12 recent entries are kept for Undo; lifetime totals are retained.</p>'+
  '<div class="wm-match-fields"><label>Kills<input data-match-kills type="number" min="0" max="500" value="0" inputmode="numeric"></label>'+
  '<label>Deaths<input data-match-deaths type="number" min="0" max="500" value="0" inputmode="numeric"></label>'+
  '<label>Headshots<input data-match-headshots type="number" min="0" max="500" value="0" inputmode="numeric"></label>'+
  '<label class="wm-win"><input data-match-win type="checkbox"> Win</label></div>'+
  '<div class="wm-actions"><button type="button" data-action="mastery-log" class="btn-soft">+ Log match</button>'+
  '<button type="button" data-action="mastery-undo" class="btn-soft" '+(data.history.length?'':'disabled')+'>Undo latest</button></div></div>'+
  '<div class="wm-history"><strong>Recent manual match entries</strong>'+(history.length?history.map(h=>'<div><span>'+num(h.kills)+' K / '+num(h.deaths)+' D · '+num(h.headshots)+' HS'+(h.win?' · Win':'')+'</span><small>'+new Date(h.at||0).toLocaleDateString()+'</small></div>').join(''):'<p>No matches logged yet.</p>')+'</div>'+
  '</section>';
}
const metricLabel={score:'Tracking score',points:'Mastery points',kills:'Kills',kd:'K/D',headshots:'Headshots',wins:'Wins',camos:'Camo stages'};
export function updateLeaderboard(profile,allProfiles){
 const root=document.getElementById('leaderboardSection');
 if(!root)return;
 const scope=root.querySelector('#lbScope')?.value==='profiles'?'profiles':'weapons';
 const metricEl=root.querySelector('#lbMetric'),metric=metricEl?.value||'score';
 if(scope==='profiles'&&['kd','headshots'].includes(metric)){metricEl.value='score';}
 const activeMetric=metricEl.value,category=root.querySelector('#lbClass')?.value||'all';
 root.querySelector('#lbClass').disabled=scope==='profiles';
 root.querySelector('#lbCaption').textContent=scope==='profiles'?
  'Only player profiles saved in this browser. This is not an online or verified global leaderboard.':
  'Ranked from your manually recorded data and confirmed camos; zero-data weapons are hidden.';
 const top=weaponRanking(profile,'score').filter(w=>w.value>0).slice(0,3);
 const best=root.querySelector('#bestWeaponTiles');
 best.innerHTML=top.length?top.map((w,i)=>{
  const tier=masteryTier(w.record.points);
  return '<button type="button" data-lb-open="'+safe(w.id)+'" class="lb-best"><span class="lb-best-rank">#'+(i+1)+' · '+safe(w.category.toUpperCase())+'</span>'+
   '<strong>'+safe(w.name)+'</strong><span>'+num(w.metrics.score)+' tracking score</span><small>'+safe(tier.name)+' · '+num(w.record.points)+' mastery pts</small></button>';
 }).join(''):'<p class="lb-empty">Your best weapons will appear after you record mastery points, matches or camo progress.</p>';
 let list;
 if(scope==='profiles'){
  list=profileRanking(allProfiles,activeMetric).filter(row=>row.value>0);
 }else{
  list=weaponRanking(profile,activeMetric,category==='all'?null:category).filter(row=>row.value>0);
 }
 root.querySelector('#lbRows').innerHTML=list.length?list.slice(0,25).map((w,i)=>{
  const label=scope==='profiles'?w.name:w.name;
  const extra=scope==='profiles'?(w.best?'Best: '+w.best.name:'No tracked weapons'):(masteryTier(w.record.points).name+' · '+w.record.kills+' kills');
  return '<div class="lb-row"><span class="lb-place">'+(i+1)+'</span>'+
   (scope==='weapons'?'<button type="button" data-lb-open="'+safe(w.id)+'" class="lb-name">'+safe(label)+' <small>'+safe(extra)+'</small></button>':
    '<div class="lb-name">'+safe(label)+' <small>'+safe(extra)+'</small></div>')+
   '<strong class="lb-value">'+num(w.value)+(activeMetric==='kd'?' K/D':'')+'</strong></div>';
 }).join(''):'<p class="lb-empty">No recorded '+safe(metricLabel[activeMetric].toLowerCase())+' yet. Add weapon progress to populate this ranking.</p>';
 root.querySelector('#lbTitle').textContent=scope==='profiles'?'Local player leaderboard':'My weapon leaderboard';
 const awards=weaponAwards(profile);
 root.querySelector('#lbAwardCount').textContent=awards.filter(x=>x.earned).length+'/'+awards.length;
 root.querySelector('#lbAwards').innerHTML=awards.map(a=>'<div class="lb-award '+(a.earned?'earned':'')+'"><strong>'+(a.earned?'★ ':'☆ ')+safe(a.name)+'</strong><small>'+safe(a.hint)+'</small></div>').join('');
 root.querySelector('#lbScope').setAttribute('aria-label','Leaderboard scope');
}
export function rankingCsv(profile,scope,metric,category,allProfiles){
 const key=metricLabel[metric]?metric:'score';
 const rows=scope==='profiles'?profileRanking(allProfiles,key).filter(w=>w.value>0).map((w,i)=>[i+1,w.name,w.value,w.best?.name||'']):
  weaponRanking(profile,key,category==='all'?null:category).filter(w=>w.value>0).map((w,i)=>[i+1,w.name,w.value,w.category]);
 const all=[['Place',scope==='profiles'?'Player':'Weapon',metricLabel[key],scope==='profiles'?'Best weapon':'Weapon class'],...rows];
 // Prefix spreadsheet formula-looking cells, even if a user renames a profile.
 return '\uFEFF'+all.map(row=>row.map(value=>{
  let str=String(value??'');
  if(/^[\s]*[=+\-@]/.test(str))str="'"+str;
  return '"'+str.replace(/"/g,'""')+'"';
 }).join(',')).join('\r\n');
}
export const leaderboardMetricOptions=Object.freeze(metricLabel);
