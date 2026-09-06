import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRapier} from '../engine.mjs';
import {createSession,compareStones} from '../session.mjs';
import {MACHINE} from '../contract.mjs';
async function session(fn){const s=createSession(await loadRapier(),'ramp-lane','rover.flow');try{await fn(s);}finally{s.dispose();}}
test('session uses actual engine state and bounded advance batches',()=>session(s=>{assert.equal(s.read().frame.observation.tick,0);const r=s.advance(10);assert.equal(r.frames.length,10);assert.equal(r.snapshot.frame.observation.tick,10);assert.ok(r.snapshot.visual.wheels.length===4);}));
for(const n of [0,-1,121,1.5,NaN])test(`invalid batch ${n} cannot advance world`,()=>session(s=>{const b=s.read();assert.throws(()=>s.advance(n));assert.deepEqual(s.read(),b);}));
test('installing another compatible Stone changes no physical state',()=>session(s=>{s.advance(120);const b=s.read();s.select('rover.dart');assert.deepEqual(s.read().frame,b.frame);assert.equal(s.read().stoneId,'rover.dart');const f=s.advance(1).snapshot;assert.equal(f.appliedStoneId,'rover.dart');assert.equal(f.frame.observation.tick,b.frame.observation.tick+1);}));
test('unknown Stone leaves installed state intact',()=>session(s=>{const b=s.read();assert.throws(()=>s.select('flow'));assert.deepEqual(s.read(),b);}));
test('replay recomputes actual recorded commands and retains style attribution',()=>session(s=>{s.advance(120);s.select('rover.dart');s.advance(120);const b=s.read();const r=s.replay();assert.equal(r.verified,true);assert.equal(r.frames.length,241);assert.deepEqual(r.frames.at(-1).frame,b.frame);assert.equal(r.frames[80].appliedStoneId,'rover.flow');assert.equal(r.frames[180].appliedStoneId,'rover.dart');assert.deepEqual(s.read(),b);}));
test('export is data-only, versioned and detached',()=>session(s=>{s.advance(3);const r=s.export();assert.equal(r.tape.actions.length,3);assert.equal(r.format,'stone.rover.session/0.1');assert.equal(r.assignments.length,3);assert.ok(Object.isFrozen(r));}));
test('Stop is terminal and idempotent; dispose releases the host',()=>session(s=>{s.advance(5);const b=s.stop();assert.equal(b.frame.status,'stopped');assert.equal(s.advance(10).frames.length,0);assert.deepEqual(s.stop(),b);s.dispose();assert.throws(()=>s.advance(1));}));
test('comparison has identical machine/profile, real goal outcomes and repeatable metrics',async()=>{const R=await loadRapier(),a=compareStones(R,'ramp-lane'),b=compareStones(R,'ramp-lane');assert.deepEqual(a,b);assert.equal(a.length,3);for(const r of a){assert.equal(r.status,'succeeded');assert.equal(r.machineVersion,MACHINE.version);assert.ok(r.seconds>0);assert.ok(r.path.length>2);}assert.ok(a[1].seconds<a[0].seconds);assert.ok(a[0].seconds<a[2].seconds);});
