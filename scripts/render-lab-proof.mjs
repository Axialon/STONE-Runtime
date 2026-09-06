import {chromium} from '../apps/rover/node_modules/playwright-core/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {startServer} from '../apps/rover/server.mjs';
import {loadRapier} from '../experiments/rover3d/engine.mjs';
import {benchmark} from '../packages/lab/benchmark.mjs';
const out='evidence/lab-proof';await mkdir(out,{recursive:true});
const data=benchmark(await loadRapier(),'humanoid','high-reach'),record=data.recordings[0];
const sample=record.samples[Math.floor(record.samples.length*.64)];
await writeFile(out+'/pose.json',JSON.stringify({kind:'recorded-physics-visualisation-not-live-ui',sample,result:data.results[0]},null,2));
const server=await startServer(0),browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});
try{const page=await browser.newPage({viewport:{width:1000,height:760}});await page.goto(server.url);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const proof=await page.evaluate(async sample=>{
  const T=await import('/vendor/three.module.js'),scene=new T.Scene();scene.background=new T.Color('#18282d');
  const camera=new T.PerspectiveCamera(36,1000/760,.05,30);camera.position.set(2.8,2.15,3.7);camera.lookAt(0,1.15,.18);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1000,760);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.toneMapping=T.ACESFilmicToneMapping;
  document.body.replaceChildren(renderer.domElement);
  scene.add(new T.HemisphereLight('#e0f2ee','#152424',2.7));const light=new T.DirectionalLight('#fff5e6',4);light.position.set(2,5,2);light.castShadow=true;scene.add(light);
  const mat=color=>new T.MeshStandardMaterial({color,metalness:.35,roughness:.38});
  const box=(size,position,color)=>{const m=new T.Mesh(new T.BoxGeometry(...size),mat(color));m.position.set(...position);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;};
  const ball=(r,position,color)=>{const m=new T.Mesh(new T.SphereGeometry(r,24,16),mat(color));m.position.set(...position);m.castShadow=true;scene.add(m);return m;};
  box([4,.04,4],[0,-.02,0],'#30494c');const grid=new T.GridHelper(4,24,'#5a8077','#47635e');grid.position.y=.006;scene.add(grid);
  box([.85,.12,.65],[0,.07,0],'#172226');box([.42,.22,.23],[0,.99,0],'#afbdb8');
  for(const x of [-.13,.13]){box([.15,.70,.17],[x,.55,0],'#9cabaa');box([.19,.12,.34],[x,.18,.07],'#253638');}
  box([.46,.44,.24],[0,1.32,0],'#cad3cc');box([.30,.19,.09],[0,1.33,.155],'#233638');
  box([.12,.12,.12],[0,1.61,0],'#687c76');box([.28,.28,.24],[0,1.78,0],'#ced5ce');box([.23,.065,.025],[0,1.81,.13],'#273f40');
  box([.09,.34,.09],[-.32,1.33,0],'#91a5a1');box([.075,.31,.075],[-.32,1.005,0],'#91a5a1');
  sample.segments.forEach((p,i)=>{const m=box([i?.07:.09,i?.31:.34,i?.07:.09],[p.position.x,p.position.y,p.position.z],i?'#83b9ab':'#bbd0c5');m.quaternion.set(p.rotation.x,p.rotation.y,p.rotation.z,p.rotation.w);});
  ball(.065,[.32,1.5,0],'#476c63');ball(.055,[sample.tip.x,sample.tip.y,sample.tip.z],'#dce8cc');
  sample.targets.forEach((p,i)=>{const m=ball(.045,[p.x,p.y,p.z],i===sample.completed?'#e2b478':'#45665e');m.material.transparent=true;m.material.opacity=i===sample.completed?.85:.30;});
  renderer.render(scene,camera);return {calls:renderer.info.render.calls,engineTick:sample.tick};
 },sample);
 if(proof.calls<10)throw new Error('Rendering did not complete.');
 await page.screenshot({path:out+'/humanoid.png'});
 console.log(JSON.stringify({kind:'recorded-physics-visualisation-not-live-ui',...proof,path:out+'/humanoid.png'}));
}finally{await browser.close();await server.close();}
