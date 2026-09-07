import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:net';
import {startWorkbenches} from '../scripts/start-workbenches.mjs';
const listen=s=>new Promise((ok,no)=>{s.once('error',no);s.listen(0,'127.0.0.1',ok);});
const close=s=>new Promise((ok,no)=>s.close(e=>e?no(e):ok()));
test('one launcher starts both local apps and closes them together',async()=>{const apps=await startWorkbenches({fieldPort:0,roverPort:0});try{for(const u of [apps.field.url,apps.rover.url]){assert.match(u,/^http:\/\/127\.0\.0\.1:/);assert.equal((await fetch(u)).status,200);}}finally{await apps.close();}await assert.rejects(fetch(apps.field.url));await assert.rejects(fetch(apps.rover.url));await apps.close();});
test('a conflicting second port releases its first server without touching the existing service',async()=>{
 const occupied=createServer();await listen(occupied);const probe=createServer();await listen(probe);const free=probe.address().port;await close(probe);
 try{await assert.rejects(startWorkbenches({fieldPort:occupied.address().port,roverPort:free}));assert.equal(occupied.listening,true);const check=createServer();await new Promise((ok,no)=>{check.once('error',no);check.listen(free,'127.0.0.1',ok);});await close(check);}finally{await close(occupied);}
});
test('invalid port values fail before creating either server',async()=>{for(const value of [-1,65536,'4173'])await assert.rejects(startWorkbenches({roverPort:value,fieldPort:0}));});
