import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKAGES,getPackage,compatible} from '../packages/lab/registry.mjs';
test('catalogue separates rover, drone, humanoid and digital',()=>{
 assert.deepEqual([...new Set(PACKAGES.map(p=>p.host))].sort(),['digital','drone','humanoid','rover']);
 assert.equal(new Set(PACKAGES.map(p=>p.id)).size,PACKAGES.length);
});
test('packages declare version, implementation, model, harness and tools',()=>{
 assert.ok(PACKAGES.length>=12);
 for(const p of PACKAGES){assert.equal(p.form,'digital');assert.equal(p.version,'0.1.0');assert.ok(p.profile&&p.harness&&p.limits);assert.ok(Array.isArray(p.tools));assert.ok(Object.isFrozen(p));}
});
for(const host of ['rover','drone','humanoid'])test(host+' rejects another host package',()=>{
 const p=PACKAGES.find(p=>p.host===host);assert.ok(p);assert.equal(compatible(p.id,host,'local'),true);
 for(const other of ['rover','drone','humanoid','digital'].filter(h=>h!==host))assert.equal(compatible(p.id,other,'local'),false);
});
test('cloud/hybrid are explicit, never silently local',()=>{
 assert.equal(getPackage('digital.analyst').execution,'cloud');assert.equal(getPackage('digital.hybrid').execution,'hybrid');
 assert.equal(compatible('digital.analyst','digital','local'),false);assert.equal(compatible('digital.analyst','digital','cloud'),true);
 assert.equal(getPackage('digital.compare').model.kind,'none');
});
test('unknown IDs fail',()=>{for(const id of ['__proto__','unknown',null]){assert.throws(()=>getPackage(id));assert.equal(compatible(id,'drone','local'),false);}});

test('drone passports describe the verified simulation as available rules',()=>{for(const p of PACKAGES.filter(p=>p.host==='drone')){assert.equal(p.availability,'available');assert.equal(p.implementation,'rule-based');assert.match(p.limits,/simulated/);}});

test('no planned package claims offline implementation',()=>{for(const p of PACKAGES.filter(p=>p.availability==='planned'))assert.equal(p.offline,'not-implemented');});
