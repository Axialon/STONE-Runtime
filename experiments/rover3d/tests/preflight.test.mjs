import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,copyFileSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

// Loader-failure fixtures, not simulated physics and not substitutes for engine tests.
function probe(metadata, source='throw new Error("PRIVATE_SENTINEL");', bounded=false, overrideArgs=null) {
  const root=mkdtempSync(join(tmpdir(),'stone-rover-preflight-'));
  try {
    for(const file of ['preflight.mjs','engine.mjs','contract.mjs'])
      copyFileSync(new URL(`../${file}`,import.meta.url),join(root,file));
    if (existsSync(new URL('../engine-check.mjs',import.meta.url))) copyFileSync(new URL('../engine-check.mjs',import.meta.url),join(root,'engine-check.mjs'));
    if(metadata){
      const dir=join(root,'node_modules/@dimforge/rapier3d-compat');mkdirSync(dir,{recursive:true});
      writeFileSync(join(dir,'package.json'),JSON.stringify({main:'index.mjs',type:'module',...metadata}));
      const entry=join(dir,metadata.main??'index.mjs');
      mkdirSync(dirname(entry),{recursive:true});writeFileSync(entry,source);
    }
    const args = [join(root,'preflight.mjs'), ...(overrideArgs ?? (bounded ? ['--timeout-ms=300'] : []))];
    return spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:1500,env:{...process.env,NODE_PATH:''}});
  }finally{rmSync(root,{recursive:true,force:true});}
}
for(const [name,metadata,source,code] of [
  ['missing package',null,undefined,'ENGINE_UNAVAILABLE'],
  ['wrong version',{name:'@dimforge/rapier3d-compat',version:'0.0.0'},undefined,'ENGINE_VERSION_MISMATCH'],
  ['wrong identity',{name:'other',version:'0.20.0'},undefined,'ENGINE_VERSION_MISMATCH'],
  ['broken initialisation',{name:'@dimforge/rapier3d-compat',version:'0.20.0'},
    'export default {async init(){throw new Error("PRIVATE_SENTINEL")}};','ENGINE_INITIALISATION_FAILED']
])test(`preflight fails closed: ${name}`,()=>{
  const r=probe(metadata,source);assert.equal(r.status,2,r.stderr);assert.equal(r.stdout,'');
  const result=JSON.parse(r.stderr);assert.equal(result.status,'blocked');assert.equal(result.code,code);
  assert.equal(r.stderr.includes('PRIVATE_SENTINEL'),false);assert.equal(r.stderr.includes('at file:'),false);
});

// Deliberately broken synthetic packages exercise the probe's supervision only.
// They never satisfy the real physics acceptance tests.
const identity = {name:'@dimforge/rapier3d-compat',version:'0.20.0'};
for (const [name, source, code] of [
  ['blocked initialisation', 'export default { init(){while(true){}} };', 'ENGINE_STARTUP_TIMEOUT'],
  ['early clean process exit', 'process.exit(0);', 'ENGINE_PROBE_INVALID'],
  ['unbounded diagnostic output', 'while(true){process.stdout.write("PRIVATE_SENTINEL".repeat(1024));}', 'ENGINE_PROBE_OUTPUT_LIMIT'],
  ['nonzero child exit', 'process.exit(17);', 'ENGINE_PROBE_FAILED']
]) test(`supervised preflight: ${name}`,()=>{
  const r=probe(identity,source,true);assert.equal(r.status,2,r.stderr);
  const data=JSON.parse(r.stderr);assert.equal(data.status,'blocked');assert.equal(data.code,code);
  assert.equal(r.stderr.includes('PRIVATE_SENTINEL'),false);assert.equal(r.stderr.includes('at file:'),false);
});

for(const args of [['--timeout-ms=0'],['--timeout-ms=Infinity'],['--timeout-ms=30001'],['--timeout-ms=100','--load=other'],['--load=other']])
  test(`preflight rejects arguments ${args.join(' ')}`,()=>{
    const r=probe(identity,'process.exit(77);',false,args);assert.equal(r.status,2,r.stderr);
    assert.equal(JSON.parse(r.stderr).code,'INVALID_PREFLIGHT_ARGUMENT');
  });
test('synthetic engine smoke success cannot claim verified vehicle physics',()=>{
  const source=`export default {async init(){},World:class{step(){}free(){}},ColliderDesc:{cuboid(){}}};`;
  const r=probe(identity,source);assert.equal(r.status,0,r.stderr);
  const data=JSON.parse(r.stdout);assert.equal(data.status,'engine-initialised');
  assert.match(data.note,/Initialisation only/);assert.equal(r.stderr,'');
});
test('unexpected output is rejected, not echoed or treated as successful initialisation',()=>{
  const r=probe(identity,'console.log("PRIVATE_SENTINEL");process.exit(0);');
  assert.equal(r.status,2,r.stderr);assert.equal(JSON.parse(r.stderr).code,'ENGINE_PROBE_INVALID');
  assert.equal(r.stderr.includes('PRIVATE_SENTINEL'),false);
});
test('child-supplied arbitrary error code is replaced by a fixed diagnostic',()=>{
  const r=probe(identity,`export default {async init(){throw Object.assign(new Error('PRIVATE_SENTINEL'),{code:'PRIVATE_SENTINEL'});}};`);
  assert.equal(r.status,2,r.stderr);assert.equal(JSON.parse(r.stderr).code,'ENGINE_PROBE_INVALID');
  assert.equal(r.stderr.includes('PRIVATE_SENTINEL'),false);
});
test('normal verification gates actual engine tests behind supervised preflight',async()=>{
  const {readFile}=await import('node:fs/promises');
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(pkg.scripts.verify,'npm run test:contract && npm run preflight && npm run test:engine');
});

// Reproduces the published 0.20.0 package layout, not its physics implementation.
test('preflight resolves package metadata above a dist entry point',()=>{
  const source='export default {async init(){},World:class{step(){}free(){}},ColliderDesc:{cuboid(){}}};';
  const r=probe({...identity,main:'dist/index.mjs',exports:{'.':{import:'./dist/index.mjs',require:'./dist/index.mjs'}}},source);
  assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(r.stdout).status,'engine-initialised');
});
