import test from 'node:test';
import assert from 'node:assert/strict';
import {createDataPackage,readDataPackage,CHECKS,PRESETS,inspectDataPackage} from '../package.mjs';
import {executeData,parseTable,LIMITS} from '../adapter.mjs';
import {packageHash} from '../../contract/stone-package.mjs';
const bytes=s=>new TextEncoder().encode(s);
const pack=async(config=PRESETS.LENS)=>JSON.stringify(await createDataPackage('LENS',config));
test('CSV preserves quoting, duplicate headers, leading zero IDs and embedded newlines',()=>{
 const t=parseTable(bytes('id,name,name\r\n001,"A,B","two\nlines"'),'csv');
 assert.deepEqual(t,{headers:['id','name','name'],rows:[['001','A,B','two\nlines']]});
});
test('quality totals include ragged rows, missing cells, headers, whitespace, duplicate rows and dangerous text',async()=>{
 const r=await executeData(bytes('id,,id\n001, a ,=SUM(A1)\n001, a ,=SUM(A1)\n002\ntext,,<img src=x>'),'csv',await pack());
 assert.deepEqual(r.report.counts,{rows:4,columns:3,missingCells:3,raggedRows:1,blankHeaders:1,duplicateHeaders:1,whitespaceCells:2,duplicateRows:1,mixedColumns:1,formulaCells:2});
 assert.equal(r.preview.rows[3][2],'<img src=x>');assert.equal(r.proposal,null);
});
test('TIDY preserves original, types, IDs, headers and duplicates; complete reversible change counts',async()=>{
 const input=bytes(JSON.stringify({format:'stone.data-grid/0.1',headers:['id','id'],rows:[['001',' a '],['001',' a '],['',' '],[7,true]]})),before=input.slice();
 const r=await executeData(input,'json',await pack(PRESETS.TIDY));
 assert.deepEqual(input,before);assert.deepEqual(r.proposal.grid.rows,[['001','a'],['001','a'],[7,true]]);
 assert.deepEqual(r.proposal.grid.headers,['id','id']);assert.equal(r.report.changes.trimmedCells,3);assert.equal(r.report.changes.omittedRows,1);
 assert.equal(r.proposal.undo.length,4);assert.deepEqual(r.proposal.undo[2],{kind:'trim',row:2,column:1,before:' ',after:''});
});
test('one adapter executes both presets and a third declarative policy',async()=>{
 for(const config of [PRESETS.LENS,PRESETS.TIDY,{...PRESETS.TIDY,checks:['missing','formula'],omitEmptyRows:false}]){
  const p=await pack(config),admitted=await readDataPackage(p);assert.equal(admitted.compatibility.compatible,true);
  const r=await executeData(bytes('id,x\n001, a \n,'),'csv',p);assert.deepEqual(r.report.checks,config.checks);
  assert.equal(r.proposal?.grid.rows.length,config.trimStrings?(config.omitEmptyRows?1:2):undefined);
 }
});
test('exact deterministic receipt binds source bytes, package and config with no model or time',async()=>{
 const input=bytes('id\r\n001'),p=await pack(),r=await executeData(input,'csv',p);
 assert.deepEqual(r,await executeData(input,'csv',p));assert.deepEqual(r.report.receipt.dataset,{bytes:input.length,sha256:await packageHash(input),format:'csv'});
 assert.equal(r.report.receipt.package.sha256,await packageHash(bytes(p)));assert.equal(r.report.receipt.artifact.sha256,JSON.parse(p).artifacts[0].sha256);
 assert.equal(r.report.receipt.model,null);assert.equal(r.report.receipt.actualExecution,'local');assert.ok(!JSON.stringify(r).includes('timestamp'));
});
for(const [label,input,format] of [
 ['malformed UTF8',new Uint8Array([0xc3,0x28]),'csv'],['malformed JSON',bytes('[{]'),'json'],['nested values',bytes('[{"x":{"y":2}}]'),'json'],
 ['unsafe integers',bytes('[{"id":9007199254740993}]'),'json'],['nonfinite',bytes('[1e400]'),'json'],['unknown format',bytes('a'),'xml'],
 ['long cell',bytes('a\n'+'x'.repeat(8193)),'csv'],['too many columns',bytes(Array(65).fill('a').join(',')),'csv'],
 ['too many rows',bytes('a\n'+Array(5001).fill('1').join('\n')),'csv'],['too many bytes',new Uint8Array(1048577),'csv'],['bad quoting',bytes('a\n"unterminated'),'csv']
])test('rejects '+label,()=>assert.throws(()=>parseTable(input,format)));
test('JSON records retain absent cells, primitive values and safe property names',()=>{
 const r=parseTable(bytes('[{"__proto__":"001","value":null},{"value":true}]'),'json');assert.deepEqual(r.headers,['__proto__','value']);assert.deepEqual(r.rows,[['001',null],[null,true]]);
 assert.deepEqual(parseTable(bytes('[1,"001",false,null]'),'json').rows,[[1],['001'],[false],[null]]);
});
test('bounds are inclusive and no input silently truncates',()=>{
 assert.equal(parseTable(bytes('a\n'+Array(5000).fill('x').join('\n')),'csv').rows.length,LIMITS.rows);
 assert.equal(parseTable(bytes('a\n'+'x'.repeat(8192)),'csv').rows[0][0].length,LIMITS.cell);
});
test('details and previews cap display only and expose total versus shown',async()=>{
 const r=await executeData(bytes('a\n'+Array(200).fill(' x ').join('\n')),'csv',await pack());assert.equal(r.report.counts.whitespaceCells,200);
 assert.equal(r.report.findings.total,399);assert.equal(r.report.findings.shown,100);assert.equal(r.preview.totalRows,200);assert.equal(r.preview.rows.length,20);
});
for(const [label,mutate] of [
 ['checksum',p=>p.artifacts[0].sha256='0'.repeat(64)],['runtime',p=>p.runtime.adapter='stone.other/0.1'],['privileges',p=>p.manifest.permissions.tools.push('execute-code')],
 ['model',p=>{p.manifest.implementation={kind:'learned-policy',modelRef:'other@0.1.0'};}],['engine',p=>p.manifest.compatibility.engineVersion='rapier3d-compat/0.20.0']
])test('blocks '+label,async()=>{
 const p=JSON.parse(await pack());mutate(p);await assert.rejects(()=>executeData(bytes('a\nx'),'csv',JSON.stringify(p)));
});
test('unknown config options and checks cannot add code, regex, URLs or transforms',async()=>{
 for(const c of [{...PRESETS.LENS,regex:'.*'},{...PRESETS.LENS,checks:['eval']},{...PRESETS.LENS,trimStrings:'yes'},{...PRESETS.LENS,omitEmptyRows:true}])await assert.rejects(()=>createDataPackage('variant',c));
 assert.ok(CHECKS.length>1);
});
test('inspection only validates data; declarations vary and remain unauthenticated',async()=>{
 const p=JSON.parse(await pack());p.manifest.name='<img src=x>';p.manifest.publisher='Someone else';
 const r=await inspectDataPackage(JSON.stringify(p));assert.equal(r.compatibility.compatible,true);assert.equal(r.authenticity,'not-verified');assert.equal(r.model,null);assert.equal(r.installation,'not-performed');
 assert.equal((await inspectDataPackage(JSON.stringify(p),'rover')).compatibility.compatible,false);
});
