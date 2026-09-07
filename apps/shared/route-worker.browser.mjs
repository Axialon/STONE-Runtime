import {chromium} from '../rover/node_modules/playwright-core/index.mjs';import {startServer} from '../rover/server.mjs';import assert from 'node:assert/strict';import {defaultRoute} from '../../packages/routes/contract.mjs';
const server=await startServer(0),browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});const page=await browser.newPage();const route=defaultRoute('rover');
try{await page.goto(server.url);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const r=await page.evaluate(async route=>{
 const w=new Worker('/worker.mjs',{type:'module'});let id=0;
 const request=(type,payload={})=>new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>reject(new Error('worker timeout')),10000);w.onmessage=e=>{if(e.data.id===n){clearTimeout(t);e.data.ok?resolve(e.data.result):reject(new Error('worker rejected'));}};w.postMessage({id:n,type,payload});});
 try{await request('start',{courseId:'flat-lane',stoneId:'rover.flow',route});const implicit=await request('compare'),explicit=await request('compare',{courseId:'flat-lane',route});return {implicit,explicit};}finally{w.terminate();}
 },route);
 assert.equal(r.implicit.scope,'custom-route');assert.deepEqual(r.implicit.route,route);assert.deepEqual(r.explicit,r.implicit);console.log('PASS custom worker comparisons retain the full route and cannot silently select a fixed benchmark');
}finally{await browser.close();await server.close();}
