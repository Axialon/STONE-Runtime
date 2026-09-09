import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const here=new URL('./',import.meta.url), root=new URL('../../',here);
const map=JSON.stringify({imports:{three:'/vendor/three.module.js'}});
const digest=createHash('sha256').update(map).digest('base64');
const CSP=`default-src 'none'; script-src 'self' 'sha256-${digest}' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
const assets=new Map();
for(const f of ['app.mjs','session.mjs','worker.mjs','style.css'])assets.set('/data-lab/'+f,new URL('apps/data-lab/'+f,root));
for(const f of ['package.mjs','dispatch.mjs'])assets.set('/packages/data-quality/'+f,new URL('packages/data-quality/'+f,root));
assets.set('/vendor/data-quality.mjs',new URL('packages/data-quality/dist/data-quality.mjs',root));
for(const f of ['navigation.mjs','route-editor.mjs','workbench.css','signature-panel.mjs','signature-session.mjs','signature-worker.mjs'])assets.set('/shared/'+f,new URL('apps/shared/'+f,root));
for(const f of ['contract.mjs','rover-session.mjs','runtime.mjs'])assets.set('/packages/routes/'+f,new URL('packages/routes/'+f,root));
for(const f of ['index.html','style.css','boot.mjs','app.mjs','scene.mjs','worker.mjs'])assets.set('/'+f,new URL(f,here));
assets.set('/client.mjs',new URL('apps/rover/client.mjs',root));
for(const f of ['manifest.mjs','compatibility.mjs','reference.mjs','stone-package.mjs','package-signature.mjs'])assets.set('/packages/contract/'+f,new URL('packages/contract/'+f,root));
for(const f of ['common.mjs','registry.mjs','humanoid.mjs','humanoid-session.mjs','drone.mjs','drone-session.mjs','control-session.mjs','benchmark.mjs','inspection.mjs','file-input.mjs'])assets.set('/packages/lab/'+f,new URL('packages/lab/'+f,root));
for(const f of ['contract.mjs','world.mjs','stones.mjs','session.mjs'])assets.set('/experiments/rover3d/'+f,new URL('experiments/rover3d/'+f,root));
for(const [route,path] of [
 ['rapier.mjs','experiments/rover3d/node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs'],
 ['three.module.js','apps/rover/node_modules/three/build/three.module.js'],
 ['three.core.js','apps/rover/node_modules/three/build/three.core.js'],
 ['OrbitControls.js','apps/rover/node_modules/three/examples/jsm/controls/OrbitControls.js']
])assets.set('/vendor/'+route,new URL(path,root));
for(const f of ['identity.mjs','manifest.mjs','package-data.mjs'])assets.set('/packages/learned-rover/'+f,new URL('packages/learned-rover/'+f,root));
assets.set('/vendor/learned.mjs',new URL('tools/model-bundle/dist/learned.mjs',root));
assets.set('/models/flow-v0.1.json',new URL('experiments/learned-flow/model/model.json',root));
export async function startFieldServer(port=4174){
 if(!Number.isInteger(port)||port<0||port>65535)throw new TypeError('Invalid port.');
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',CSP);res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  const hosts=['127.0.0.1:'+server.address().port,'localhost:'+server.address().port];
  if(!hosts.includes(req.headers.host)||(req.headers.origin&&!hosts.some(h=>req.headers.origin==='http://'+h))){res.writeHead(403);res.end('Forbidden');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Read-only server');return;}
  let pathname;try{pathname=new URL(req.url,'http://'+req.headers.host).pathname;}catch{res.writeHead(400);res.end();return;}
  const file=assets.get(pathname==='/'?'/index.html':pathname);
  if(!file){res.writeHead(404);res.end('Not found');return;}
  try{
   let data=await readFile(file);
   const html=pathname==='/'||pathname==='/index.html';
   if(html)data=Buffer.from(data.toString().replace('<!-- IMPORTMAP -->',`<script type="importmap">${map}</script>`));
   res.setHeader('Content-Type',html?'text/html; charset=utf-8':pathname.endsWith('.json')?'application/json; charset=utf-8':pathname.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');
   res.setHeader('Content-Length',data.length);res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Local asset unavailable; check the pinned installation.');}
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});
 return {url:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise((ok,no)=>{server.close(e=>e?no(e):ok());server.closeAllConnections();})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const s=await startFieldServer(Number(process.env.PORT??4174));
 console.log('STONE Field Lab — '+s.url+' (local only)');
 for(const sig of ['SIGINT','SIGTERM'])process.once(sig,async()=>{await s.close();process.exit(0);});
}
