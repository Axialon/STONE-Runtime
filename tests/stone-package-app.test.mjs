import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {MODEL_IDENTITY,MODEL_SHA256} from '../packages/learned-rover/identity.mjs';
const source=readFileSync(new URL('../apps/rover/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../apps/rover/app.mjs',import.meta.url).href)).replace("mode(view.supported?'3d':'plan');await restart();raf=requestAnimationFrame(animate);",'');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function setup(inspect){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{value:'flat-lane',textContent:'',dataset:{},replaceChildren(){},append(){},setAttribute(){},addEventListener(){},querySelector(){return node('child');}});return nodes.get(id);};
 let callbacks,downloads=0;
 const document={body:node('body'),getElementById:node,querySelector:node,querySelectorAll:()=>[],createElement:()=>node('created'),addEventListener(){}};
 const noop=()=>{},view={supported:false,update:noop,compare:noop,setCourse:noop,dispose:noop};
 const context={document,window:{addEventListener:noop},createView:()=>view,createNavigation:()=>({fieldUrl:'/'}),createRouteEditor:()=>({setHost:noop,setLocked:noop}),createStoneFilePicker:(_e,c)=>{callbacks=c;return {setContext:noop};},createClient:()=>({close:noop,request:async type=>{if(type==='start')throw Error('startup unavailable');return {};}}),MODEL_IDENTITY,MODEL_SHA256,getStone:id=>({id,name:id}),inspectModelPackage:inspect??(async()=>({compatibility:{compatible:true}})),URL,Worker:class{},MACHINE:{dt:1/120}};
 const api=runInNewContext(source+'\ndownload=()=>{recordDownload();}; ({restart,stop,exportStoneFile});',{...context,recordDownload:()=>downloads++});
 return {api,callbacks,node,downloads:()=>downloads};
}
test('failed supplied and builtin startup rejects the picker activation callback',async()=>{
 const h=setup();await assert.rejects(h.callbacks.activate({text:'{}',receipt:{sha256:'a'.repeat(64)}}));assert.equal(h.node('body').dataset.phase,'error');assert.match(h.node('error').textContent,/No rule fallback/);await assert.rejects(h.callbacks.builtin());
});
test('a stopped generation cannot finish a pending export integrity check',async()=>{
 const slow=deferred(),h=setup(()=>slow.promise),pending=h.api.exportStoneFile();await new Promise(r=>setImmediate(r));h.api.stop();slow.resolve({compatibility:{compatible:true}});await pending;assert.equal(h.downloads(),0);
});
