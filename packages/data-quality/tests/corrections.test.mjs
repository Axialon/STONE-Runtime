import test from 'node:test';import assert from 'node:assert/strict';
import PapaNode from 'papaparse';import PapaBrowser from '../node_modules/papaparse/papaparse.min.js';
import {reviewInputs} from '../build.mjs';import {createDataPackage,PRESETS} from '../package.mjs';import {executeData,parseTable,LIMITS} from '../adapter.mjs';import {PARITY_CASES,wideCsv} from './parser-fixtures.mjs';
const bytes=s=>new TextEncoder().encode(s),tidy=async()=>JSON.stringify(await createDataPackage('TIDY'));
test('reviewed build closure selects the exact upstream browser entry',async()=>{
 const r=await reviewInputs();assert.equal(r.dependency.browserEntry,'papaparse.min.js');assert.equal(r.sources['packages/data-quality/node_modules/papaparse/papaparse.min.js'],'3553fb8bdf5b8004ce5531e6827e81c8b34e7b3992677967754544064e97b016');assert.equal(Object.hasOwn(r.sources,'packages/data-quality/node_modules/papaparse/papaparse.js'),false);
});
test('built-in IDs are distinct stable data identities; adapter and arbitrary allowed variants remain shared',async()=>{
 const lens=await createDataPackage('LENS'),t=await createDataPackage('TIDY'),v=await createDataPackage('custom',{...PRESETS.TIDY,omitEmptyRows:false});
 assert.equal(lens.manifest.id,'digital.data-lens');assert.equal(t.manifest.id,'digital.data-tidy');assert.deepEqual(lens.runtime,t.runtime);assert.deepEqual(t.runtime,v.runtime);
 assert.equal((await executeData(bytes('id\n001'),'csv',JSON.stringify(v))).proposal.grid.rows[0][0],'001');
});
test('640127-byte valid CSV keeps complete reports but withholds oversized normalized download bytes',async()=>{
 const input=bytes(wideCsv());assert.equal(input.length,640127);const before=input.slice(),r=await executeData(input,'csv',await tidy());
 assert.equal(r.proposal.grid.rows.length,5000);assert.equal(r.report.counts.columns,64);assert.equal(r.report.counts.duplicateRows,4999);assert.ok(bytes(JSON.stringify(r.proposal.grid)).length>1290000);
 assert.throws(()=>parseTable(bytes(JSON.stringify(r.proposal.grid)),'json'),/1 MiB/);
 assert.equal(r.gridExport.available,false);assert.equal(r.gridExport.text,null);assert.equal(r.gridExport.bytes,bytes(JSON.stringify(r.proposal.grid)).length);assert.match(r.gridExport.reason,/exceeds.*1 MiB/);assert.equal(r.report.normalizedExport.available,false);assert.deepEqual(input,before);
});
test('exact compact normalized download bytes reimport with no proposal envelope or extra formatting',async()=>{
 const r=await executeData(bytes('id,name\n001, Ada \n002," café "'),'csv',await tidy());
 assert.equal(r.gridExport.available,true);assert.equal(r.gridExport.text,JSON.stringify(r.proposal.grid));assert.equal(r.gridExport.bytes,bytes(r.gridExport.text).length);assert.deepEqual(parseTable(bytes(r.gridExport.text),'json'),{headers:r.proposal.grid.headers,rows:r.proposal.grid.rows});assert.equal(JSON.parse(r.gridExport.text).receipt,undefined);
});
test('normalized export bounds exact UTF-8 bytes rather than string length',async()=>{
 const input=bytes('h\n'+Array(5000).fill('é'.repeat(69)).join('\n')),r=await executeData(input,'csv',await tidy());
 assert.ok(input.length<=LIMITS.bytes);assert.equal(r.gridExport.bytes,bytes(r.gridExport.text).length);assert.ok(r.gridExport.bytes>r.gridExport.text.length);assert.equal(r.gridExport.available,true);
});
for(const c of PARITY_CASES.filter(c=>c.format==='csv'))test('installed Node/browser upstream parser parity: '+c.name,()=>{
 const options={header:false,dynamicTyping:false,skipEmptyLines:false,delimiter:',',comments:false};assert.deepEqual(PapaBrowser.parse(c.text,options),PapaNode.parse(c.text,options));
});
test('UTF-8 expansion withholds a grid whose character count is below the byte limit',async()=>{
 const input=bytes('h\n'+Array(5000).fill('é'.repeat(103)).join('\n'));assert.ok(input.length<LIMITS.bytes);
 const r=await executeData(input,'csv',await tidy()),text=JSON.stringify(r.proposal.grid);assert.ok(text.length<LIMITS.bytes);assert.ok(bytes(text).length>LIMITS.bytes);assert.equal(r.gridExport.bytes,bytes(text).length);assert.equal(r.gridExport.available,false);assert.equal(r.gridExport.text,null);
});
