import * as T from 'three';
import {OrbitControls} from '/vendor/OrbitControls.js';
import {HUMANOID as H} from '/packages/lab/humanoid.mjs';
const colors={'humanoid.fluid':'#70b3a6','humanoid.precise':'#b2a2d5','humanoid.brisk':'#d4a66d','drone.cinema':'#70b3a6','drone.survey':'#b2a2d5','drone.agile':'#d4a66d'};
/** Presentation consumes detached simulation state; it cannot command the host. */
export function createView(element,plan){
 let current=null,history=[],cursor=0,mode='3d',renderer=null,controls=null,healthy=true;
 const scene=new T.Scene();scene.background=new T.Color('#16272c');
 const camera=new T.PerspectiveCamera(37,1,.05,50);
 const fixed=new T.Group(),active=new T.Group(),targets=new T.Group();scene.add(fixed,active,targets);
 const material=color=>new T.MeshStandardMaterial({color,roughness:.42,metalness:.38});
 const box=(size,position,color,parent=fixed)=>{const m=new T.Mesh(new T.BoxGeometry(...size),material(color));m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const sphere=(radius,color,parent)=>{const m=new T.Mesh(new T.SphereGeometry(radius,24,16),material(color));parent.add(m);return m;};
 scene.add(new T.HemisphereLight('#e4eee6','#17282e',2.6));
 const light=new T.DirectionalLight('#fff0dc',3.5);light.position.set(-3,5,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
 const fill=new T.DirectionalLight('#7ab9c9',1.3);fill.position.set(3,2,-2);scene.add(fill);
 box([4,.05,4],[0,-.03,0],'#294347');const grid=new T.GridHelper(4,32,'#537b71','#36585a');grid.position.y=.005;fixed.add(grid);
 box([.85,.12,.65],[0,.065,0],'#172125');box([.42,.22,.23],[0,.99,0],'#abb9b6');
 for(const x of [-.13,.13]){box([.15,.7,.17],[x,.55,0],'#9fadaa');box([.19,.12,.34],[x,.18,.07],'#263638');}
 box([.46,.44,.24],[0,1.32,0],'#c3cdc7');box([.32,.22,.03],[0,1.34,.14],'#1d3339');
 box([.12,.12,.12],[0,1.6,0],'#536967');box([.28,.28,.24],[0,1.78,0],'#cbd1c8');box([.23,.065,.025],[0,1.81,.13],'#172d34');
 box([.09,.34,.09],[-.32,1.33,0],'#869b97');box([.075,.31,.075],[-.32,1.005,0],'#8fa29c');
 const links=[box([.09,H.upper,.09],[0,0,0],'#b8ccc3',active),box([.07,H.forearm,.07],[0,0,0],'#85b4aa',active)];
 const hand=sphere(.052,'#d6e5cb',active),shoulder=sphere(.066,'#517b70',fixed);shoulder.position.set(H.shoulder.x,H.shoulder.y,H.shoulder.z);
 const jewel=new T.Mesh(new T.OctahedronGeometry(.048),material(colors['humanoid.fluid']));jewel.position.set(0,1.39,.166);fixed.add(jewel);
 const airfield=new T.Group(),airframe=new T.Group();scene.add(airfield,airframe);airfield.visible=false;airframe.visible=false;
 box([12,.06,12],[0,-.05,0],'#294347',airfield);airfield.add(new T.GridHelper(12,48,'#698578','#37585a'));
 box([.32,.12,.36],[0,0,0],'#c2d0c7',airframe);box([.40,.035,.065],[0,0,0],'#688c88',airframe);box([.065,.035,.40],[0,0,0],'#688c88',airframe);
 for(const x of [-.23,.23])for(const z of [-.23,.23]){const motor=new T.Mesh(new T.CylinderGeometry(.048,.048,.075,16),material('#405d5c'));motor.position.set(x,.02,z);airframe.add(motor);const guard=new T.Mesh(new T.TorusGeometry(.125,.009,8,32),material('#96b3a8'));guard.rotation.x=Math.PI/2;guard.position.set(x,.066,z);airframe.add(guard);box([.21,.009,.018],[x,.067,z],'#bacac4',airframe);const arm=box([Math.hypot(x,z),.03,.04],[x/2,0,z/2],'#718f86',airframe);arm.rotation.y=-Math.atan2(z,x);}
 const droneJewel=new T.Mesh(new T.OctahedronGeometry(.055),material('#70b3a6'));droneJewel.position.y=.1;airframe.add(droneJewel);
 const pos=f=>f.tip??f.position;
 const capacity=H.maxSteps*2,positions=new Float32Array(capacity*3),tints=new Float32Array(capacity*3);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(tints,3).setUsage(T.DynamicDrawUsage));geometry.setDrawRange(0,0);
 const trail=new T.LineSegments(geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.85}));trail.frustumCulled=false;scene.add(trail);
 function clear(group){for(const child of [...group.children]){child.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});group.remove(child);}}
 function drawPlan(){
  const r=element.parentElement.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);plan.width=Math.round(r.width*dpr);plan.height=Math.round(r.height*dpr);
  const c=plan.getContext('2d');if(!c)return;c.scale(dpr,dpr);c.fillStyle='#16272c';c.fillRect(0,0,r.width,r.height);
  const scale=Math.min(r.height/2.3,r.width/1.8),point=p=>({x:r.width*.36+p.z*scale,y:r.height*.87-p.y*scale});
  if(current?.frame.host==='drone'){
   const s=current.frame,map=p=>({x:r.width/2+p.x*Math.min(r.width,r.height)/5,y:r.height*.64-p.z*Math.min(r.width,r.height)/5});
   c.strokeStyle='#44635e';for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(map({x:i,z:-2}).x,map({x:i,z:-2}).y);c.lineTo(map({x:i,z:2}).x,map({x:i,z:2}).y);c.stroke();}
   for(const p of s.targets){const a=map(p);c.strokeStyle='#ddbc85';c.beginPath();c.arc(a.x,a.y,8,0,Math.PI*2);c.stroke();}
   for(let i=1;i<=cursor&&i<history.length;i++){const a=map(history[i-1].frame.position),b=map(history[i].frame.position);c.strokeStyle=colors[history[i].stoneId];c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
   const a=map(s.position);c.fillStyle=colors[current.stoneId];c.fillRect(a.x-7,a.y-7,14,14);return;
  }
  const origin=point(H.shoulder);c.strokeStyle='#7f9b92';c.lineWidth=2;c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(origin.x,r.height*.87);c.stroke();
  if(current){const s=current.frame;for(const p of s.targets){const q=point(p);c.strokeStyle='#dcbb8b';c.beginPath();c.arc(q.x,q.y,.04*scale,0,Math.PI*2);c.stroke();}
   const p=s.segments[0],q=p.rotation,elbow={y:p.position.y-H.upper*.5*(1-2*(q.x*q.x+q.z*q.z)),z:p.position.z-H.upper*(q.y*q.z+q.w*q.x)};
   const e=point(elbow),h=point(s.tip);c.strokeStyle=colors[current.stoneId]??'#c9d9d0';c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(e.x,e.y);c.lineTo(h.x,h.y);c.stroke();}
  for(let i=1;i<=cursor&&i<history.length;i++){const a=point(history[i-1].frame.tip),b=point(history[i].frame.tip);c.strokeStyle=colors[history[i].stoneId]??'#bbb';c.lineWidth=1.5;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
 }
 function paint(){if(mode==='plan')drawPlan();else if(renderer&&healthy)renderer.render(scene,camera);}
 function setMode(value){mode=value==='3d'&&renderer&&healthy?'3d':'plan';element.hidden=mode==='plan';plan.hidden=mode!=='plan';paint();return mode;}
 function home(){const drone=current?.frame.host==='drone';camera.position.set(...(drone?[4.5,4.5,6.5]:[2.8,2.1,3.7]));const t=drone?[.35,1.25,.35]:[0,1.15,.18];camera.lookAt(...t);controls?.target.set(...t);controls?.update();paint();}
 try{
  renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;element.append(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.target.set(0,1.15,.18);controls.minDistance=1.2;controls.maxDistance=9;controls.maxPolarAngle=Math.PI*.49;controls.listenToKeyEvents(element);controls.addEventListener('change',paint);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();healthy=false;setMode('plan');element.dispatchEvent(new Event('rendererchange'));});
 }catch{healthy=false;mode='plan';}
 function resize(){const r=element.parentElement.getBoundingClientRect();if(renderer){renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}paint();}
 const observer=new ResizeObserver(resize);observer.observe(element.parentElement);
 let targetKey='';
 function update(sample,frames=[],index=frames.length-1){
  current=sample;history=frames;cursor=Math.max(0,index);
  if(sample){const s=sample.frame;
   const drone=s.host==='drone';fixed.visible=!drone;active.visible=!drone;airfield.visible=drone;airframe.visible=drone;
   if(drone){airframe.position.set(s.position.x,s.position.y,s.position.z);airframe.quaternion.set(s.rotation.x,s.rotation.y,s.rotation.z,s.rotation.w);droneJewel.material.color.set(colors[sample.stoneId]);}
   (s.segments??[]).forEach((p,i)=>{links[i].position.set(p.position.x,p.position.y,p.position.z);links[i].quaternion.set(p.rotation.x,p.rotation.y,p.rotation.z,p.rotation.w);});
   if(s.tip)hand.position.set(s.tip.x,s.tip.y,s.tip.z);jewel.material.color.set(colors[sample.stoneId]??'#bfcfc6');
   const key=JSON.stringify([s.host,s.targets,s.completed]);if(key!==targetKey){targetKey=key;clear(targets);s.targets.forEach((p,i)=>{const m=sphere(s.host==='drone'?.08:.039,i===s.completed?'#e2b375':'#4f776f',targets);m.position.set(p.x,p.y,p.z);m.material.transparent=true;m.material.opacity=i<s.completed?.22:i===s.completed?.9:.45;});}
  }
  let count=0;for(let i=1;i<=cursor&&i<frames.length&&count+2<=capacity;i++){const c=new T.Color(colors[frames[i].stoneId]??'#b5c8bd');for(const f of [frames[i-1],frames[i]]){const p=pos(f.frame);positions.set([p.x,p.y,p.z],count*3);tints.set([c.r,c.g,c.b],count*3);count++;}}
  geometry.setDrawRange(0,count);geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;paint();
 }
 home();setMode(mode);resize();
 return Object.freeze({get supported(){return !!renderer&&healthy;},update,home,setMode,
  dispose(){observer.disconnect();controls?.dispose();clear(fixed);clear(active);clear(targets);clear(airfield);clear(airframe);geometry.dispose();trail.material.dispose();renderer?.dispose();}});
}
