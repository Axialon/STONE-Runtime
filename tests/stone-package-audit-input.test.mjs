import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
import {readStoneFile} from '../packages/lab/file-input.mjs';
const app=readFileSync(new URL('../apps/field-lab/app.mjs',import.meta.url),'utf8'),source=app.slice(app.indexOf('async function loadInspectionFile()'),app.indexOf('\nfunction chooseHost('));
function setup(){
 const nodes=new Map([['audit-source',{textContent:'Old successful file receipt'}],['inspection-file',{files:[]}],['digital-state',{textContent:'Completed / local'}]]),$=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
 Object.defineProperty($('inspection-file'),'value',{set(value){assert.equal(value,'');this.files=[];},get(){return this.files.length?'selected':'';}});
 const wiring=app.match(/\$\('inspection-file'\)\.on(?:change|cancel)=[^;]+;/g).join('');
 const api=runInNewContext("let generation=0,auditText='old',busy=false,result={valid:true};const terminate=()=>{generation++;busy=false;},clearResult=()=>{result=null;};"+source+';'+wiring+';({loadInspectionFile,terminate,state:()=>({auditText,result,busy})});',{$,text:(id,v)=>$(id).textContent=v,readStoneFile,controls(){},hideError(){},error(){}});
 return {$,...api};
}
test('cancelled native AUDIT selection clears both the successful result and its displayed source',async()=>{const h=setup();await h.loadInspectionFile();assert.equal(h.state().auditText,null);assert.equal(h.state().result,null);assert.doesNotMatch(h.$('audit-source').textContent,/Old successful/);assert.doesNotMatch(h.$('digital-state').textContent,/Completed/);});
test('pending native AUDIT input cannot display the prior successful source',async()=>{
 const h=setup();let release;h.$('inspection-file').files=[{name:'new.json',size:2,arrayBuffer:()=>new Promise(r=>release=r)}];const pending=h.loadInspectionFile(),status=h.$('audit-source').textContent;release(new TextEncoder().encode('{}').buffer);await pending;assert.doesNotMatch(status,/Old successful/);assert.match(h.$('audit-source').textContent,/new.json/);
});
test('cancelled AUDIT read cannot restore file data or a receipt',async()=>{
 const h=setup();let release;h.$('inspection-file').files=[{name:'old.json',size:2,arrayBuffer:()=>new Promise(r=>release=r)}];const pending=h.loadInspectionFile();h.$('inspection-file').files=[];await h.loadInspectionFile();const status=h.$('audit-source').textContent;release(new TextEncoder().encode('{}').buffer);await pending;assert.equal(h.state().auditText,null);assert.equal(h.$('audit-source').textContent,status);
});

for(const pendingRead of [false,true])test('AUDIT cancel event clears a retained selection'+(pendingRead?' and invalidates its pending read':''),async()=>{
 const h=setup();let release;h.$('inspection-file').files=[new File(['{}'],'loaded.json')];await h.loadInspectionFile();
 if(pendingRead)h.$('inspection-file').files=[{name:'pending.json',size:2,arrayBuffer:()=>new Promise(r=>release=r)}];
 const pending=pendingRead?h.loadInspectionFile():null;assert.equal(h.$('inspection-file').files.length,1);await h.$('inspection-file').oncancel?.({type:'cancel'});
 const status=h.$('audit-source').textContent;release?.(new TextEncoder().encode('{}').buffer);await pending;
 assert.equal(h.$('inspection-file').files.length,0);assert.equal(h.state().auditText,null);assert.equal(h.state().result,null);assert.equal(h.state().busy,false);assert.match(status,/No file selected/);assert.equal(h.$('audit-source').textContent,status);assert.doesNotMatch(h.$('digital-state').textContent,/Completed|File ready/);
});
