import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateManifest, parseManifest, MAX_MANIFEST_BYTES } from '../packages/contract/manifest.mjs';
import { checkCompatibility, LOCAL_ARENA_HOST } from '../packages/contract/compatibility.mjs';
const fixture = name => JSON.parse(readFileSync(new URL(`../packages/contract/fixtures/${name}.json`, import.meta.url), 'utf8'));
const change = edit => { const m=fixture('local'); edit(m); return m; };
const rejected = m => { const r=validateManifest(m); assert.equal(r.valid,false); assert.ok(r.errors.length); for(const e of r.errors) assert.ok(e.path && e.code && e.message); };
for (const mode of ['local','cloud','hybrid']) test(`accepts well-formed ${mode} declaration`, () => assert.deepEqual(validateManifest(fixture(mode)),{valid:true,errors:[]}));
for (const value of [null, [], 'text', 1, true]) test(`rejects non-object ${JSON.stringify(value)}`,()=>rejected(value));
for (const field of Object.keys(fixture('local'))) test(`requires ${field}`,()=>rejected(change(m=>delete m[field])));
for (const [name,edit] of [
 ['unknown field',m=>m.secretPower=100], ['unknown nested field',m=>m.permissions.shell=true],
 ['unsupported schema',m=>m.schemaVersion='9.0.0'], ['non-release version',m=>m.version='latest'],
 ['leading-zero version',m=>m.version='01.0.0'], ['empty publisher',m=>m.publisher='  '],
 ['bad identifier',m=>m.id='../x'], ['unknown profile',m=>m.compatibility.profile='unknown/1'],
 ['duplicate input',m=>m.compatibility.inputs.push('position')], ['no output',m=>m.compatibility.outputs=[]],
 ['negative memory',m=>m.resources.memoryMiB=-1], ['infinite budget',m=>m.resources.decisionBudgetMs=Infinity],
 ['missing nested permissions',m=>delete m.permissions.tools], ['permissions array',m=>m.permissions=[]],
 ['mutable update alias',m=>m.lifecycle.updates='latest'], ['fake evaluation',m=>m.evidence.status='evaluated'],
 ['rule pretending a model',m=>m.implementation.modelRef='model@1'],
 ['learned without model reference',m=>m.implementation.kind='learned-policy'],
 ['digital custom silicon',m=>{m.implementation.kind='custom-silicon';m.implementation.modelRef='model@1';}],
 ['local with remote function',m=>m.execution.remoteCapabilities=['coaching']],
 ['local with network',m=>m.permissions.networkOrigins=['https://service.example.invalid']],
 ['local leaking data',m=>m.execution.dataEgress=['telemetry']],
 ['local without offline capability',m=>m.execution.offlineBehavior='unavailable'],
 ['duplicate tool',m=>m.permissions.tools=['x','x']], ['wrong cost payer',m=>m.cost.payer='user'],
 ['blank explanation',m=>m.execution.offlineDetails=''], ['excessively long text',m=>m.name='x'.repeat(3000)]
]) test(`rejects ${name}`,()=>rejected(change(edit)));
for(const origin of ['http://x.invalid','https://u:p@x.invalid','https://x.invalid/path','https://x.invalid?token=x','https://x.invalid#key','javascript:alert(1)'])
 test(`rejects non-canonical network origin ${origin}`,()=>{const m=fixture('cloud');m.permissions.networkOrigins=[origin];rejected(m);});
for(const [name,edit] of [
 ['cloud claiming offline full',m=>m.execution.offlineBehavior='full'],
 ['cloud without origins',m=>m.permissions.networkOrigins=[]],
 ['cloud without data disclosure',m=>delete m.execution.dataEgress],
 ['cloud without payer',m=>m.cost.payer='none']
]) test(`rejects ${name}`,()=>{const m=fixture('cloud');edit(m);rejected(m);});
test('hybrid needs explicit local and remote capabilities',()=>{for(const k of ['localCapabilities','remoteCapabilities']){const m=fixture('hybrid');m.execution[k]=[];rejected(m);}});
test('validates learned-policy metadata without claiming training',()=>{const m=change(m=>{m.implementation.kind='learned-policy';m.implementation.modelRef='policy@0.1.0';});assert.equal(validateManifest(m).valid,true);});
test('permits all delivery forms as declarations',()=>{for(const form of ['digital','hardware','combined']) assert.equal(validateManifest(change(m=>m.form=form)).valid,true);});
test('does not mutate input',()=>{const m=fixture('hybrid'), before=JSON.stringify(m);validateManifest(m);assert.equal(JSON.stringify(m),before);});
test('parses bounded valid JSON',()=>{const m=fixture('local');assert.deepEqual(parseManifest(JSON.stringify(m)),{valid:true,errors:[],manifest:m});});
test('reports malformed JSON without exposing its contents',()=>{const r=parseManifest('{"secret":"DO_NOT_ECHO"');assert.equal(r.valid,false);assert.equal(r.manifest,null);assert.equal(JSON.stringify(r).includes('DO_NOT_ECHO'),false);});
test('rejects non-text parser input',()=>assert.equal(parseManifest({}).valid,false));
test('rejects oversized UTF-8 and ASCII payloads',()=>{for(const text of [' '.repeat(MAX_MANIFEST_BYTES+1),'é'.repeat(MAX_MANIFEST_BYTES)]) assert.equal(parseManifest(text).errors[0].code,'size');});
test('rejects prototype-shaped JSON as unknown fields',()=>{const m=JSON.stringify(fixture('local')).replace('{','{"__proto__":{"polluted":true},');assert.equal(parseManifest(m).valid,false);assert.equal({}.polluted,undefined);});
test('accepts local reference against local host declaration',()=>assert.deepEqual(checkCompatibility(fixture('local')),{compatible:true,errors:[]}));
test('valid cloud and hybrid declarations are not automatically executable locally',()=>{for(const n of ['cloud','hybrid']){const m=fixture(n);assert.equal(validateManifest(m).valid,true);assert.equal(checkCompatibility(m).compatible,false);}});
for(const [name,edit] of [
 ['too much memory',m=>m.resources.memoryMiB=1024], ['too much decision budget',m=>m.resources.decisionBudgetMs=100],
 ['missing sensor',m=>m.compatibility.inputs.push('thermal')], ['unsupported action',m=>m.compatibility.outputs=['torque']],
 ['ungranted tool',m=>m.permissions.tools=['shell']], ['ungranted storage',m=>m.permissions.storage='session'],
 ['hardware module',m=>m.form='hardware'], ['billable package',m=>{m.cost.kind='subscription';m.cost.payer='user';}],
 ['external state',m=>m.lifecycle.state='external']
]) test(`host rejects ${name}`,()=>{const m=change(edit);assert.equal(validateManifest(m).valid,true);assert.equal(checkCompatibility(m).compatible,false);});
test('malformed host fails closed',()=>{for(const h of [null,{},[],{...LOCAL_ARENA_HOST,maxMemoryMiB:-1},{...LOCAL_ARENA_HOST,inputs:'*'}]) assert.equal(checkCompatibility(fixture('local'),h).compatible,false);});
test('invalid manifest does not reach compatibility logic',()=>assert.equal(checkCompatibility(null).compatible,false));
test('caller-selected host profile must match',()=>assert.equal(checkCompatibility(fixture('local'),{...LOCAL_ARENA_HOST,profile:'different/1'}).compatible,false));
test('model references cannot float to latest',()=>{for(const ref of ['latest','policy@latest','policy@01.0.0']){const m=fixture('cloud');m.implementation.modelRef=ref;rejected(m);}});
test('model references can use an explicit content digest',()=>{const m=fixture('cloud');m.implementation.modelRef=`policy@sha256:${'a'.repeat(64)}`;assert.equal(validateManifest(m).valid,true);});
test('root accessors are rejected without executing them',()=>{let calls=0;const m=fixture('local');Object.defineProperty(m,'name',{get(){calls++;return 'x';}});rejected(m);assert.equal(calls,0);});
test('oversized list is rejected before element traversal',()=>{const m=fixture('local');m.permissions.tools=Array(33).fill('x');rejected(m);});
test('host policy is frozen, including nested arrays',()=>{assert.equal(Object.isFrozen(LOCAL_ARENA_HOST),true);assert.equal(Object.isFrozen(LOCAL_ARENA_HOST.modes),true);});