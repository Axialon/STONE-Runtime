import test from 'node:test';import assert from 'node:assert/strict';
import {Preparation} from '../../../apps/data-lab/session.mjs';
import {createDataPackage,readDataPackage,PRESETS} from '../package.mjs';import {packageHash} from '../../contract/stone-package.mjs';
const declaration={id:'digital.custom-inventory',publisher:'Unverified example'};
function fixture(){const calls=[];let stops=0;const client={request:(type,payload)=>new Promise((resolve,reject)=>calls.push({type,payload,resolve,reject})),cancel:()=>{stops++;}};return {p:new Preparation(client),calls,get stops(){return stops;}};}
for(const action of ['cancel','leave','dispose'])test('preparation '+action+' terminates and rejects a late successful preparation',async()=>{
 const f=fixture(),pending=f.p.prepare('presets',{});if(action==='leave')f.p.setHost(false);else f.p[action]();const status=f.p.state.status;f.calls[0].resolve({LENS:'late'});await pending;assert.equal(f.p.state.value,null);assert.equal(f.p.state.busy,false);assert.equal(f.p.state.status,status);assert.ok(f.stops>0);
});
test('host reentry never restarts preparation; explicit retry recovers',async()=>{
 const f=fixture(),pending=f.p.prepare('presets',{});f.p.setHost(false);f.p.setHost(true);assert.equal(f.calls.length,1);f.calls[0].resolve({LENS:'late'});await pending;
 const retry=f.p.prepare('presets',{});f.calls[1].resolve({LENS:'fresh'});await retry;assert.deepEqual(f.p.state.value,{LENS:'fresh'});
});
test('off-host preparation is blocked and stopped preparation preserves accepted value',async()=>{
 const f=fixture(),pending=f.p.prepare('presets',{});f.calls[0].resolve({LENS:'accepted'});await pending;f.p.setHost(false);await f.p.prepare('presets',{});assert.equal(f.calls.length,1);assert.deepEqual(f.p.state.value,{LENS:'accepted'});
});
test('invalidated draft ignores old reply without replacing current preparation',async()=>{
 const f=fixture(),first=f.p.prepare('create',{});f.p.invalidate();const next=f.p.prepare('create',{});f.calls[0].resolve({text:'old'});await first;assert.equal(f.p.state.value,null);f.calls[1].resolve({text:'new'});await next;assert.equal(f.p.state.value.text,'new');
});
test('safe authored declarations and config roundtrip with exact package/artifact hashes',async()=>{
 const name='<img src=x onerror="bad()">',config={...PRESETS.TIDY,checks:['whitespace'],omitEmptyRows:false},p=await createDataPackage(name,config,declaration),text=JSON.stringify(p),r=await readDataPackage(text);
 assert.equal(p.manifest.id,declaration.id);assert.equal(p.manifest.publisher,declaration.publisher);assert.equal(p.manifest.name,name);assert.equal(r.compatibility.compatible,true);assert.deepEqual(r.config,config);assert.equal(r.source.sha256,await packageHash(new TextEncoder().encode(text)));assert.equal(r.artifacts[0].sha256,p.artifacts[0].sha256);
});
for(const [label,d] of [['unknown privilege',{...declaration,tools:['shell']}],['invalid ID',{...declaration,id:'<script>'}],['blank publisher',{...declaration,publisher:' '}],['oversized name',declaration]])test('authoring rejects '+label,async()=>{
 await assert.rejects(()=>createDataPackage(label==='oversized name'?'x'.repeat(2049):'draft',PRESETS.LENS,d));
});
test('authoring still rejects empty checks and omission without trimming',async()=>{
 for(const c of [{...PRESETS.LENS,checks:[]},{...PRESETS.LENS,omitEmptyRows:true}])await assert.rejects(()=>createDataPackage('draft',c,declaration));
});
test('readable result view preserves exact metrics, one-based locations and before/after edge spaces',async()=>{
 const {resultView}=await import('../../../apps/data-lab/app.mjs'),{executeData}=await import('../adapter.mjs');const input=new TextEncoder().encode('id,name\n001, Ada \n001, Ada '),copy=input.slice();
 const result=await executeData(input,'csv',JSON.stringify(await createDataPackage('TIDY'))),view=resultView(result.report);
 assert.equal(view.metrics.find(x=>x[0]==='rows')[2],2);assert.equal(view.metrics.find(x=>x[0]==='duplicates')[2],1);assert.equal(view.metrics.find(x=>x[0]==='findings')[2],result.report.findings.total);
 assert.deepEqual(view.changes[0],['Trim edges','Data row 1','Column 2','" Ada "','"Ada"']);assert.ok(view.findings.some(x=>x[0]==='Edge whitespace'&&x[1]==='Data row 1'));assert.deepEqual(input,copy);assert.equal(result.preview.rows[0][0],'001');assert.equal(result.preview.rows[0][1],' Ada ');
});
test('worker authoring inspects an admitted draft without any dataset execution',async()=>{
 const replies=[];globalThis.self={postMessage:m=>replies.push(m)};await import('../../../apps/data-lab/worker.mjs?product');
 try{await self.onmessage({data:{id:1,type:'create',payload:{name:'Created variant',...declaration,config:{...PRESETS.TIDY,checks:['whitespace']}}}});const r=replies[0];assert.equal(r.ok,true);assert.equal(r.result.inspection.compatibility.compatible,true);assert.equal(r.result.inspection.model,null);assert.equal(r.result.inspection.verification,'package-artifact-integrity');assert.equal(r.result.inspection.source.sha256,await packageHash(new TextEncoder().encode(r.result.text)));assert.equal(r.result.report,undefined);
 await self.onmessage({data:{id:2,type:'create',payload:{name:'bad',...declaration,config:{...PRESETS.LENS,omitEmptyRows:true}}}});assert.equal(replies[1].ok,false);
 }finally{delete globalThis.self;}
});
