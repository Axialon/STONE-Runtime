import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createModelPackage,inspectModelPackage} from '../packages/learned-rover/package-data.mjs';
import {MAX_PACKAGE_BYTES} from '../packages/contract/stone-package.mjs';
const source=readFileSync(new URL('../apps/shared/stone-file-picker.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
const raw=JSON.stringify(await createModelPackage(readFileSync(new URL('../experiments/learned-flow/model/model.json',import.meta.url),'utf8')));
const bytes=new TextEncoder().encode(raw);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
// Only DOM plumbing is substituted; package decoding, hashing and admission are real.
function setup(callbacks={}){
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,files:[]});return nodes.get(id);};
 const document={body:{dataset:{}}},element={innerHTML:'',querySelector:id=>$(id.replace(/^#/,''))};
 const create=runInNewContext(source+'\ncreateStoneFilePicker',{document,inspectModelPackage,MAX_PACKAGE_BYTES,TextDecoder,ArrayBuffer,Number});
 Object.defineProperty($('package-file'),'value',{set(value){assert.equal(value,'');this.files=[];},get(){return this.files.length?'selected':'';}});
 const calls=[],picker=create(element,{activate:async x=>{calls.push(x);},builtin:async()=>{},exportFile:async()=>{},...callbacks});
 picker.setContext({busy:false,phase:'paused',modelMode:false,hasState:true,routeActive:false,source:null});
 const select=async file=>{$('package-file').files=file?[file]:[];await $('package-file').onchange();};
 return {picker,$,document,calls,select,valid:()=>select({name:'FLOW.json',size:bytes.length,arrayBuffer:async()=>bytes.buffer})};
}
test('inspection is data only and activation receives the exact inspected source receipt',async()=>{
 const h=setup();await h.valid();assert.equal(h.calls.length,0);await h.$('package-activate').onclick();assert.equal(h.calls[0].text,raw);assert.deepEqual(h.calls[0].receipt,(await inspectModelPackage(raw)).source);
});
test('new selection clears the prior successful draft status while its bytes are pending',async()=>{
 const h=setup();await h.valid();const slow=deferred(),pending=h.select({name:'next.json',size:2,arrayBuffer:()=>slow.promise});
 const status=h.$('package-status').textContent;slow.resolve(new TextEncoder().encode('{}').buffer);await pending;
 assert.doesNotMatch(status,/Matches the reviewed model/);assert.match(status,/Reading/);assert.equal(h.$('package-activate').disabled,true);
});
for(const size of [-1,NaN,1.5,MAX_PACKAGE_BYTES+1])test('invalid native size '+size+' is rejected before read',async()=>{
 const h=setup();let reads=0;await h.select({name:'bad.json',size,arrayBuffer:async()=>{reads++;return bytes.buffer;}});assert.equal(reads,0);assert.equal(h.$('package-activate').disabled,true);
});
test('native byte count must agree with declared file size',async()=>{const h=setup();await h.select({name:'short.json',size:1,arrayBuffer:async()=>bytes.buffer});assert.equal(h.$('package-activate').disabled,true);assert.match(h.$('package-status').textContent,/rejected/);});
test('a later invalid file wins over an older successful read',async()=>{
 const h=setup(),slow=deferred(),pending=h.select({name:'old.json',size:bytes.length,arrayBuffer:()=>slow.promise});await h.select(new File(['{}'],'bad.json'));const status=h.$('package-status').textContent;slow.resolve(bytes.buffer);await pending;assert.equal(h.$('package-status').textContent,status);assert.equal(h.$('package-activate').disabled,true);
});
test('dispose disables callbacks and clears busy even during an unfinished native read',async()=>{
 const h=setup(),slow=deferred(),pending=h.select({name:'old.json',size:bytes.length,arrayBuffer:()=>slow.promise});const change=h.$('package-file').onchange;h.picker.dispose();const busy=h.document.body.dataset.packageBusy;slow.resolve(bytes.buffer);await pending;
 h.$('package-file').files=[{name:'valid.json',size:bytes.length,arrayBuffer:async()=>bytes.buffer}];await change();
 assert.equal(busy,'false');assert.equal(h.$('package-activate').disabled,true);assert.equal(h.$('package-file').onchange,null);assert.equal(h.$('package-activate').onclick,null);
});
test('activation is serialized while its callback is pending',async()=>{
 const slow=deferred();let calls=0;const h=setup({activate:()=>{calls++;return slow.promise;}});await h.valid();const first=h.$('package-activate').onclick();const second=h.$('package-activate').onclick();slow.resolve();await Promise.all([first,second]);assert.equal(calls,1);
});
test('failed activation is explicit and cannot overwrite a newer inspected draft',async()=>{
 const slow=deferred(),h=setup({activate:()=>slow.promise});await h.valid();const activation=h.$('package-activate').onclick();await h.select(new File(['{}'],'bad.json'));const status=h.$('package-status').textContent;slow.reject(Error('start failed'));await activation;assert.equal(h.$('package-status').textContent,status);
});
test('disposed pending builtin failures do not update the detached picker',async()=>{
 const slow=deferred(),h=setup({builtin:()=>slow.promise});const pending=h.$('package-builtin').onclick();h.picker.dispose();const status=h.$('package-status').textContent;slow.reject(Error('missing weights'));await pending;assert.equal(h.$('package-status').textContent,status);
});

for(const pendingRead of [false,true])test('cancel event with retained selection clears only the draft'+(pendingRead?' during a read':''),async()=>{
 const h=setup();await h.valid();const receipt=(await inspectModelPackage(raw)).source;
 h.picker.setContext({busy:false,phase:'paused',modelMode:true,hasState:true,routeActive:false,source:receipt});const active=h.$('package-source').textContent;
 const slow=deferred(),pending=pendingRead?h.select({name:'pending.json',size:bytes.length,arrayBuffer:()=>slow.promise}):null;
 assert.equal(h.$('package-file').files.length,1);await h.$('package-file').oncancel?.({type:'cancel'});
 const status=h.$('package-status').textContent;slow.resolve(bytes.buffer);await pending;
 assert.equal(h.$('package-file').files.length,0);assert.equal(h.$('package-activate').disabled,true);assert.equal(h.document.body.dataset.packageBusy,'false');assert.match(status,/No file selected/);assert.equal(h.$('package-status').textContent,status);assert.equal(h.$('package-source').textContent,active);assert.equal(h.calls.length,0);
});
test('dispose removes the cancel handler and retained callbacks cannot clear later selections',async()=>{
 const h=setup(),cancel=h.$('package-file').oncancel;assert.equal(typeof cancel,'function');h.picker.dispose();h.$('package-file').files=[new File(['{}'],'later.json')];await cancel();assert.equal(h.$('package-file').oncancel,null);assert.equal(h.$('package-file').files.length,1);
});
