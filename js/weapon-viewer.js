// Self-hosted GLB model viewer with software 3D fallback. Rotates projected three-dimensional
// meshes (not CODM assets or a claim of exact weapon geometry).
export function startWeaponViewer(canvas,weapon,getSlots){
 const ctx=canvas.getContext('2d'),pointers=new Map();
 let yaw=-.35,pitch=.1,zoom=1.05,turning=false,lastTime=0,raf=0,alive=true;
 let realModel=null,modelReady=false;
 const color=(hex,shade)=>{const c=parseInt(hex.slice(1),16);return 'rgb('+[c>>16,(c>>8)&255,c&255].map(v=>Math.max(0,Math.min(255,Math.round(v*shade)))).join(',')+')';};
 const faces=[
  {v:[0,3,2,1],s:1},{v:[4,5,6,7],s:.58},{v:[0,1,5,4],s:.81},{v:[3,7,6,2],s:1.14},{v:[0,4,7,3],s:.68},{v:[1,2,6,5],s:.97}
 ];
 function box(mesh,x,y,z,w,h,d,paint){
  const v=[
   [x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2],
   [x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2]
  ];
  for(const f of faces)mesh.push({v:f.v.map(i=>v[i]),paint,shade:f.s});
 }
 function geometry(){
  const mesh=[],category=weapon.category,slots=getSlots?.()||{};
  const dark='#324347',steel='#748789',grip='#1e2e32',accent='#9baa9d';
  if(category==='melee'){
   box(mesh,-.48,0,0,1.1,.17,.22,dark);box(mesh,.45,0,0,.85,.12,.2,steel);
   box(mesh,.9,.015,0,.15,.21,.27,accent);return mesh;
  }
  if(category==='launcher'){
   box(mesh,0,.15,0,2.65,.45,.53,steel);box(mesh,.9,.14,0,.45,.52,.6,dark);
   box(mesh,-.45,-.36,0,.25,.72,.29,grip);box(mesh,-.15,.48,0,.35,.23,.32,accent);return mesh;
  }
  const pistol=category==='pistol',sniper=category==='sniper'||category==='marksman',
        lmg=category==='lmg',shotgun=category==='shotgun',smg=category==='smg';
  const body=pistol?1.15:smg?1.3:lmg?2.0:sniper?1.9:1.65,barrel=pistol?.58:sniper?1.35:shotgun?1.2:1.02;
  box(mesh,-.12,.13,0,body,.45,.4,steel); // receiver
  box(mesh,body/2+barrel/2-.12,.21,0,barrel,.2,.2,dark); // barrel
  box(mesh,-body/2-.4,.06,0,pistol?.13:.85,pistol?.35:.26,.31,grip); // stock
  box(mesh,-.22,-.45,.05,.28,.87,.30,grip); // angled grip concept
  box(mesh,.23,-.38,0,lmg?.38:.28,lmg?.8:.49,.30,accent); // ammo well
  box(mesh,-.1,.44,0,body*.85,.13,.44,dark); // top rail
  if(shotgun)box(mesh,.55,-.13,0,.8,.12,.17,grip);
  if(smg)box(mesh,-.4,-.06,0,.62,.18,.42,dark);
  if(Object.keys(slots).length){
   if(slots.optic)box(mesh,-.08,.7,0,.4,.32,.3,accent);
   if(slots.muzzle)box(mesh,body/2+barrel-.07,.2,0,.33,.28,.28,accent);
   if(slots.barrel)box(mesh,body/2+barrel/2-.12,.20,0,barrel,.29,.27,accent);
   if(slots.underbarrel)box(mesh,.47,-.25,0,.32,.39,.28,grip);
   if(slots.laser)box(mesh,.36,.36,-.29,.43,.12,.13,accent);
   if(slots.stock)box(mesh,-body/2-.65,.05,0,.3,.40,.38,accent);
   if(slots.ammunition)box(mesh,.24,-.48,0,.42,.70,.35,steel);
  }
  return mesh;
 }
 function resize(){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return [w,h];
 }
 function project(v,w,h){
  const [x,y,z]=v,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const rx=x*cy-z*sy,rz=x*sy+z*cy,ry=y*cp-rz*sp,dz=y*sp+rz*cp;
  const scale=Math.min(w/5.3,h/3.9)*zoom*4.5/(4.5+dz*.27);
  return [w/2+rx*scale,h/2-ry*scale,dz];
 }
 function frame(t){
  if(!alive)return;
  const [w,h]=resize();
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#172b33');bg.addColorStop(1,'#0a161d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // faint floor grid
  ctx.strokeStyle='rgba(150,201,183,.1)';ctx.lineWidth=Math.max(1,w/550);
  for(let i=0;i<13;i++){const u=i/12*w;ctx.beginPath();ctx.moveTo(u,0);ctx.lineTo(u,h);ctx.stroke();}
  for(let i=0;i<9;i++){const u=i/8*h;ctx.beginPath();ctx.moveTo(0,u);ctx.lineTo(w,u);ctx.stroke();}
  if(turning&&document.visibilityState!=='hidden'){yaw+=(t-lastTime)*.00018;}
  lastTime=t;
  const polygons=geometry().map(face=>{
   const p=face.v.map(v=>project(v,w,h));
   return {...face,p,depth:p.reduce((s,v)=>s+v[2],0)/p.length};
  }).sort((a,b)=>b.depth-a.depth);
  for(const face of polygons){
   ctx.beginPath();ctx.moveTo(face.p[0][0],face.p[0][1]);for(let i=1;i<face.p.length;i++)ctx.lineTo(face.p[i][0],face.p[i][1]);ctx.closePath();
   ctx.fillStyle=color(face.paint,face.shade);ctx.fill();ctx.strokeStyle='rgba(9,21,26,.52)';ctx.lineWidth=Math.max(1,w/600);ctx.stroke();
  }
  ctx.fillStyle='#b1c5bf';ctx.font=Math.max(11,Math.floor(w/45))+'px system-ui';
  ctx.fillText(weapon.name.toUpperCase()+'  /  '+weapon.category.toUpperCase(),16,25);
  ctx.font=Math.max(10,Math.floor(w/60))+'px system-ui';ctx.fillStyle='#90a7a0';
  ctx.fillText('CLASS-BASED 3D CONCEPT · NOT IN-GAME MODEL',16,h-16);
  raf=requestAnimationFrame(frame);
 }
 const down=e=>{canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);turning=false;};
 const move=e=>{
  if(!pointers.has(e.pointerId))return;
  const before=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size===1){yaw+=(e.clientX-before[0])*.009;pitch=Math.max(-.75,Math.min(.75,pitch+(e.clientY-before[1])*.006));}
  else if(pointers.size===2){const now=[...pointers.values()],dist=Math.hypot(now[0][0]-now[1][0],now[0][1]-now[1][1]);zoom=Math.max(.65,Math.min(1.8,zoom+((dist-(canvas.__lastDist||dist))*.003)));canvas.__lastDist=dist;}
 };
 const up=e=>{pointers.delete(e.pointerId);canvas.__lastDist=0;};
 const wheel=e=>{e.preventDefault();zoom=Math.min(1.8,Math.max(.65,zoom-e.deltaY*.0009));};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('wheel',wheel,{passive:false});canvas.style.touchAction='none';
 raf=requestAnimationFrame(frame);
 // Load self-hosted GLB from the repository using the locally vendored
 // model-viewer. The procedural preview is retained until the GLB loads.
 if(['ar','smg','lmg','sniper','marksman','shotgun','pistol','melee','launcher'].includes(weapon.category)){
  const model=document.createElement('model-viewer');
  model.className='gs-real-model';
  model.hidden=true;
  model.setAttribute('src',new URL('../assets/models/'+weapon.category+'.glb',import.meta.url).href);
  model.setAttribute('alt','Representative three-dimensional '+weapon.category+' model (not the exact '+weapon.name+' model)');
  for(const attr of ['camera-controls','interaction-prompt'])model.setAttribute(attr,attr==='interaction-prompt'?'none':'');
  model.setAttribute('touch-action','none');
  model.setAttribute('environment-image','neutral');
  model.setAttribute('shadow-intensity','1.1');
  model.setAttribute('exposure','1.25');
  model.setAttribute('field-of-view','30deg');
  model.setAttribute('camera-orbit','-35deg 75deg auto');
  model.setAttribute('loading','eager');
  model.addEventListener('load',()=>{
   if(!alive)return;
   modelReady=true;realModel=model;
   cancelAnimationFrame(raf);raf=0;canvas.hidden=true;model.hidden=false;
   const label=document.getElementById('gunModelLabel');
   if(label)label.textContent='IMPORTED CC0 GLB · REAL MESH';
  });
  model.addEventListener('error',()=>{
   if(!alive)return;
   modelReady=false;realModel=null;canvas.hidden=false;model.remove();
   const label=document.getElementById('gunModelLabel');
   if(label)label.textContent='OFFLINE CONCEPT FALLBACK';
  });
  canvas.parentElement.append(model);
 }
 return {
  zoom(delta){
   if(modelReady&&realModel?.getCameraOrbit){
    const orbit=realModel.getCameraOrbit();
    const r=Math.max(.2,Math.min(150,orbit.radius*(delta>0?.84:1.19)));
    realModel.setAttribute('camera-orbit',orbit.theta+'rad '+orbit.phi+'rad '+r+'m');
   }else zoom=Math.max(.65,Math.min(1.8,zoom+delta));
  },
  reset(){
   yaw=-.35;pitch=.1;zoom=1.05;turning=false;
   if(realModel){realModel.removeAttribute('auto-rotate');realModel.setAttribute('camera-orbit','-35deg 75deg auto');realModel.jumpCameraToGoal?.();}
  },
  spin(){
   turning=!turning;
   if(modelReady&&realModel){
    if(turning)realModel.setAttribute('auto-rotate','');
    else realModel.removeAttribute('auto-rotate');
   }
   return turning;
  },
  destroy(){
   alive=false;cancelAnimationFrame(raf);canvas.hidden=false;
   (realModel||canvas.parentElement.querySelector('model-viewer'))?.remove();
   canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);
  }
 };
}
