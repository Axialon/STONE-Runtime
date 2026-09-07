import test from 'node:test';import assert from 'node:assert/strict';
import {loadRapier} from '../experiments/rover3d/engine.mjs';import {defaultRoute} from '../packages/routes/contract.mjs';
import {createRouteSession,replayRoute,compareRoute} from '../packages/routes/runtime.mjs';
const R=await loadRapier(),styles={rover:['rover.flow','rover.dart','rover.anchor'],drone:['drone.cinema','drone.survey','drone.agile'],humanoid:['humanoid.fluid','humanoid.precise','humanoid.brisk']};
for(const host of Object.keys(styles)){
 test(host+' custom session preserves route, swaps and explicit Stop on replay',()=>{
  const route=defaultRoute(host),s=createRouteSession(R,route,styles[host][0]);try{
   s.advance(20);const before=s.read().frame;s.select(styles[host][1]);assert.deepEqual(s.read().frame,before);s.advance(20);s.stop();s.select(styles[host][2]);
   const d=s.export();assert.deepEqual(d.route,route);assert.match(d.format,/route-session/);assert.equal(d.finalStatus,'stopped');assert.equal(d.finalStoneId,styles[host][2]);
   const r=replayRoute(R,JSON.stringify(d),host);assert.deepEqual(r.state,s.read());assert.equal(r.frames.length,41);
  }finally{s.dispose();}
 });
 test(host+' zero-action Stop and terminal completion are not artificial movement',()=>{
  const s=createRouteSession(R,defaultRoute(host),styles[host][0]);try{s.stop();const r=replayRoute(R,JSON.stringify(s.export()),host);assert.equal(r.frames.length,1);assert.equal(r.state.frame.status,'stopped');}finally{s.dispose();}
 });
 test(host+' compare is real per-route physics with all three same-task packages',()=>{
  const route=defaultRoute(host),r=compareRoute(R,route);assert.equal(r.scope,'custom-route');assert.deepEqual(r.route,route);assert.equal(r.results.length,3);
  assert.ok(r.results.every(x=>x.status==='succeeded'&&x.completed===route.points.length&&x.seconds>0));
 });
 test(host+' rejects cross-host selection and claimed completion before finishing',()=>{
  const s=createRouteSession(R,defaultRoute(host),styles[host][0]);try{assert.throws(()=>s.select('digital.brief'));s.advance(1);const d=structuredClone(s.export());d.finalStatus='succeeded';assert.throws(()=>replayRoute(R,JSON.stringify(d),host));}finally{s.dispose();}
 });
}
test('route comparison and replay require a valid compatible bounded route',()=>{
 const s=createRouteSession(R,defaultRoute('drone'),'drone.cinema');try{const d=s.export();assert.throws(()=>replayRoute(R,JSON.stringify(d),'rover'));assert.throws(()=>compareRoute(R,{...defaultRoute('drone'),points:[]}));}finally{s.dispose();}
});
