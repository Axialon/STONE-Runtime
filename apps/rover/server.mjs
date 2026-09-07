import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url), root=new URL('../../',here);
const map=JSON.stringify({imports:{three:'/vendor/three.module.js'}});
const assets=new Map();
for(const f of ['navigation.mjs','route-editor.mjs','workbench.css'])assets.set('/shared/'+f,new URL('apps/shared/'+f,root));
for(const f of ['contract.mjs','rover-session.mjs','runtime.mjs'])assets.set('/packages/routes/'+f,new URL('packages/routes/'+f,root));
for(const f of ['index.html','style.css','boot.mjs','app.mjs','scene.mjs','client.mjs','worker.mjs'])assets.set('/'+f,new URL(f,here));
for(const f of ['contract.mjs','world.mjs','stones.mjs','session.mjs'])assets.set('/rover/'+f,new URL('experiments/rover3d/'+f,root));
for(const [route,path] of [['rapier.mjs','../../experiments/rover3d/node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs'],['three.module.js','node_modules/three/build/three.module.js'],['three.core.js','node_modules/three/build/three.core.js'],['OrbitControls.js','node_modules/three/examples/jsm/controls/OrbitControls.js']])assets.set('/vendor/'+route,new URL(path,here));
for(const f of ['contract.mjs','world.mjs','stones.mjs','session.mjs'])assets.set('/experiments/rover3d/'+f,new URL('experiments/rover3d/'+f,root));
for(const f of ['common.mjs','registry.mjs','humanoid.mjs','drone.mjs','control-session.mjs','humanoid-session.mjs','drone-session.mjs'])assets.set('/packages/lab/'+f,new URL('packages/lab/'+f,root));
const hash=createHash('sha256').update(map).digest('base64');
export const CSP=`default-src 'none'; script-src 'self' 'sha256-${hash}' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
export async function startServer(port=4173){
  if(!Number.isInteger(port)||port<0||port>65535)throw new TypeError('Invalid port.');
  const server=createServer(async(req,res)=>{
    res.setHeader('Content-Security-Policy',CSP);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    const allowed=new Set(['127.0.0.1:'+server.address().port,'localhost:'+server.address().port]);
    if(!allowed.has(req.headers.host)||req.headers.origin&&![...allowed].some(host=>req.headers.origin==='http://'+host)){res.writeHead(403);res.end('Forbidden');return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
    let path;try{path=new URL(req.url,'http://'+req.headers.host).pathname;}catch{res.writeHead(400);res.end();return;}
    const file=assets.get(path==='/'?'/index.html':path);if(!file){res.writeHead(404);res.end('Not found');return;}
    try{let data=await readFile(file);if(path==='/'||path==='/index.html')data=Buffer.from(data.toString().replace('<!-- IMPORTMAP -->',`<script type="importmap">${map}</script>`));
      res.setHeader('Content-Type',path.endsWith('.css')?'text/css; charset=utf-8':path==='/'||path.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.setHeader('Content-Length',data.length);res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404);res.end('Asset unavailable. Check pinned dependencies.');}
  });
  await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});
  return {url:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise((ok,no)=>{server.close(e=>e?no(e):ok());server.closeAllConnections();})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const s=await startServer(Number(process.env.PORT??4173));console.log('STONE Rover Workbench — '+s.url);console.log('Local only. Stop with Ctrl+C.');
  for(const sig of ['SIGINT','SIGTERM'])process.once(sig,async()=>{await s.close();process.exit(0);});
}
