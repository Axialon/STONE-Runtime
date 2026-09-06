import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '../apps/rover/client.mjs';
class Fake { sent=[];terminated=false;postMessage(m){this.sent.push(m);}terminate(){this.terminated=true;}reply(m){this.onmessage?.({data:m});} }
test('worker client correlates replies and rejects overlapping requests',async()=>{const w=new Fake(),c=createClient(()=>w,100);const p=c.request('read');await assert.rejects(c.request('read'),/pending/);w.reply({id:999,ok:true,result:'stale'});w.reply({id:w.sent[0].id,ok:true,result:42});assert.equal(await p,42);c.close();});
test('Stop terminates execution and rejects pending work',async()=>{const w=new Fake(),c=createClient(()=>w);const p=c.request('advance',{steps:1});c.close();await assert.rejects(p,/cancelled/);assert.equal(w.terminated,true);await assert.rejects(c.request('read'),/closed/);});
test('deadline kills nonresponsive worker without a false success',async()=>{const w=new Fake(),c=createClient(()=>w,20);await assert.rejects(c.request('advance'),/deadline/);assert.equal(w.terminated,true);});
test('worker errors close the execution channel',async()=>{const w=new Fake(),c=createClient(()=>w);const p=c.request('read');w.onerror({preventDefault(){}});await assert.rejects(p,/failed/);assert.ok(w.terminated);});
test('wrong request payload is never posted',async()=>{const w=new Fake(),c=createClient(()=>w);await assert.rejects(c.request('eval'),/Unsupported/);assert.equal(w.sent.length,0);c.close();});
test('remote diagnostic cannot inject arbitrary text into the UI',async()=>{const w=new Fake(),c=createClient(()=>w);const p=c.request('read');w.reply({id:1,ok:false,error:'SECRET_SENTINEL'});await assert.rejects(p,e=>!e.message.includes('SECRET_SENTINEL'));c.close();});
