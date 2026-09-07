import test from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';import {createHash} from 'node:crypto';
import {proveLoadedModules,environmentIdentity} from '../dependency-proof.mjs';
import {LIBRARY_ENTRY} from '../experiment.mjs';
const here=dirname(fileURLToPath(new URL('../package.json',import.meta.url)));
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const cache=createRequire(import.meta.url).cache;
test('actual CJS entries are covered by installed dependency file inventories',()=>{
 const files=Object.keys(cache),inventories={};
 for(const f of files){const rel=f.slice(here.length+1),parts=rel.split('/'),end=parts.lastIndexOf('node_modules')+2;
 const pack=parts.slice(0,end).join('/'),file=parts.slice(end).join('/');inventories[pack]??={files:{}};inventories[pack].files[file]=hash(f);}
 const r=proveLoadedModules(here,inventories,files);assert.ok(r.length>2);assert.ok(r.some(x=>x.path.endsWith('ml-cart/cart.js')));
 assert.ok(r.every(x=>x.sha256.length===64));
});
test('an inventoried filename with changed bytes is rejected',()=>assert.throws(()=>proveLoadedModules(here,{'node_modules/ml-cart':{files:{'cart.js':'0'.repeat(64)}}},[LIBRARY_ENTRY])));
test('an unlisted or ancestor-resolved module is not declared covered',()=>{
 assert.throws(()=>proveLoadedModules(here,{},[LIBRARY_ENTRY]));
 assert.throws(()=>proveLoadedModules(here,{},['/outside/unlisted.js']));
});
test('environment identity names actual Node/V8 and the exact rover profile',()=>{
 const e=environmentIdentity();assert.equal(e.node,process.version);assert.equal(e.v8,process.versions.v8);
 assert.equal(e.arch,process.arch);assert.equal(e.platform,process.platform);assert.equal(e.profile,'stone.rover.control/0.1');assert.ok(e.osRelease);
});
