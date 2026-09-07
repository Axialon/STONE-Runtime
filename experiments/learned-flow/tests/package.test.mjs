import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
import {parseManifest} from '../../../packages/contract/manifest.mjs';
import {checkCompatibility} from '../../../packages/contract/compatibility.mjs';
import {hostFor} from '../../../packages/contract/reference.mjs';
import {getStone} from '../../rover3d/stones.mjs';
test('learned package declares the actual model digest and does not silently register a live controller',()=>{
 const m=JSON.parse(readFileSync(new URL('../model/core-manifest.json',import.meta.url),'utf8'));
 assert.equal(parseManifest(JSON.stringify(m)).valid,true);assert.equal(checkCompatibility(m,hostFor('rover')).compatible,true);
 assert.equal(m.implementation.kind,'learned-policy');assert.match(m.implementation.modelRef,/sha256:d9a1ef32fa555b5f9d8fdd326a90b59f8c03228b3854564d99bed708d0a210c2$/);
 assert.equal(m.execution.mode,'local');assert.throws(()=>getStone(m.id));
});
test('runner rejects an occupied result directory without changing its contents',()=>{
 const dir=mkdtempSync(join(tmpdir(),'stone-learned-cli-')),f=join(dir,'keep.txt');writeFileSync(f,'unchanged');
 try{const r=spawnSync(process.execPath,[fileURLToPath(new URL('../run.mjs',import.meta.url)),'--out',dir],{encoding:'utf8',timeout:10000});
 assert.equal(r.status,1);assert.match(r.stderr,/empty real directory/);assert.equal(readFileSync(f,'utf8'),'unchanged');}finally{rmSync(dir,{recursive:true});}
});
test('runner rejects unknown command-line arguments rather than fitting a default experiment',()=>{
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('../run.mjs',import.meta.url)),'--unknown'],{encoding:'utf8',timeout:10000});assert.equal(r.status,1);assert.match(r.stderr,/Usage:/);
});
