import test from 'node:test';import assert from 'node:assert/strict';
import {loadRapier} from '../experiments/rover3d/engine.mjs';import {createRoverWorld} from '../experiments/rover3d/world.mjs';import {decide} from '../experiments/rover3d/stones.mjs';
import {createDrone,droneDecision} from '../packages/lab/drone.mjs';import {createHumanoid,humanoidDecision} from '../packages/lab/humanoid.mjs';import {defaultRoute} from '../packages/routes/contract.mjs';
const R=await loadRapier();
for(const host of ['drone','humanoid'])test(host+' uses exact user targets and completes them through real physics',()=>{
 const route=defaultRoute(host),create=host==='drone'?createDrone:createHumanoid,decision=host==='drone'?droneDecision:humanoidDecision,id=host==='drone'?'drone.cinema':'humanoid.fluid';
 const h=create(R,'custom-route',route);try{assert.deepEqual(h.read().targets,route.points);assert.equal(h.read().task,'custom-route');let previous=0;
 while(h.read().status==='running'){const s=h.step(decision(id,h.read()));assert.ok(s.completed===previous||s.completed===previous+1);previous=s.completed;}
 assert.equal(h.read().status,'succeeded');assert.equal(h.read().completed,route.points.length);assert.ok(h.read().travelMetres>0);}finally{h.dispose();}
});
test('rover changes only the goal after a checkpoint, keeping physical momentum and engine ticks',()=>{
 const route=defaultRoute('rover'),h=createRoverWorld(R,'flat-lane',route);try{
 assert.deepEqual(h.snapshot().route,route);assert.deepEqual(h.snapshot().observation.goal,route.points[0]);let prior=h.snapshot(),crossings=0;
 while(h.snapshot().status==='running'){const s=h.step(decide('rover.flow',h.snapshot().observation));assert.equal(s.observation.tick,prior.observation.tick+1);
 if(s.completed!==prior.completed){crossings++;assert.ok(Math.hypot(s.observation.position.x-prior.observation.position.x,s.observation.position.z-prior.observation.position.z)<.2);}prior=s;}
 assert.equal(h.snapshot().status,'succeeded');assert.equal(crossings,route.points.length);}finally{h.dispose();}
});
test('custom route is detached from caller data and bad routes never create a host',()=>{
 const r=structuredClone(defaultRoute('drone')),h=createDrone(R,'custom-route',r);r.points[0].y=99;try{assert.equal(h.read().targets[0].y,1.8);}finally{h.dispose();}
 assert.throws(()=>createDrone(R,'custom-route',defaultRoute('rover')));assert.throws(()=>createRoverWorld(R,'ramp-lane',defaultRoute('rover')));
});
