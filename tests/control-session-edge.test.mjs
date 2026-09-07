import test from 'node:test';import assert from 'node:assert/strict';
import {loadRapier} from '../experiments/rover3d/engine.mjs';
import {createDroneSession,replayDroneSession} from '../packages/lab/drone-session.mjs';
import {createHumanoidSession,replayHumanoidSession} from '../packages/lab/humanoid-session.mjs';
const R=await loadRapier();
for(const [name,create,replay,other] of [['drone',createDroneSession,replayDroneSession,'drone.agile'],['humanoid',createHumanoidSession,replayHumanoidSession,'humanoid.brisk']]){
 const use=fn=>{const s=create(R);try{return fn(s);}finally{s.dispose();}};
 test(name+' zero-action stopped recording replays the explicit lifecycle event',()=>use(s=>{s.stop();const r=replay(R,JSON.stringify(s.export()));assert.equal(r.frames.length,1);assert.equal(r.state.frame.status,'stopped');assert.deepEqual(r.state,s.read());}));
 test(name+' final selection is independent of preceding action attribution',()=>use(s=>{s.advance(3);const previous=s.read().stoneId;s.select(other);const r=replay(R,JSON.stringify(s.export()));assert.equal(r.frames.at(-1).stoneId,previous);assert.equal(r.state.stoneId,other);assert.deepEqual(r.state,s.read());}));
 test(name+' false success, task and engine identities cannot forge a replay',()=>use(s=>{s.advance(2);for(const patch of [{finalStatus:'succeeded'},{taskVersion:'other'},{engineVersion:'other'},{finalStoneId:'digital.brief'},{format:'stone.humanoid.session/0.0'}])assert.throws(()=>replay(R,JSON.stringify({...s.export(),...patch})));}));
 test(name+' replay is bounded and rejects unmatched attribution',()=>use(s=>{const d=structuredClone(s.export());d.assignments=['bad'];assert.throws(()=>replay(R,JSON.stringify(d)));d.assignments=[];d.actions=Array(7201).fill([0,0]);assert.throws(()=>replay(R,JSON.stringify(d)));}));
 test(name+' full completion reproduces all fields',()=>use(s=>{while(s.read().frame.status==='running')s.advance(24);const d=s.export(),r=replay(R,JSON.stringify(d));assert.equal(d.finalStatus,'succeeded');assert.deepEqual(r.state,s.read());}));
}
