import test from 'node:test';import assert from 'node:assert/strict';
import {readRoute,parseRoute,defaultRoute,ROUTE_FORMAT,MAX_ROUTE_BYTES} from '../packages/routes/contract.mjs';
const fixture=()=>({format:ROUTE_FORMAT,host:'drone',name:'My inspection route',points:[{x:0,y:1.8,z:0},{x:1,y:2,z:1}]});
for(const host of ['rover','drone','humanoid'])test('valid default route for '+host,()=>{const r=defaultRoute(host);assert.equal(r.host,host);assert.deepEqual(readRoute(r,host),r);assert.ok(Object.isFrozen(r.points[0]));});
test('valid input is detached immutable data and exact parse round-trip',()=>{const input=fixture(),copy=readRoute(input,'drone');input.points[0].x=2;assert.equal(copy.points[0].x,0);assert.deepEqual(parseRoute(JSON.stringify(copy),'drone'),copy);assert.ok(Object.isFrozen(copy));});
for(const [name,edit] of [
 ['wrong format',r=>r.format='other'],['unknown host',r=>r.host='airplane'],['empty name',r=>r.name=' '],['control text',r=>r.name='bad\ntext'],
 ['unknown field',r=>r.script='not code'],['no points',r=>r.points=[]],['too many points',r=>r.points=Array(9).fill({x:0,y:2,z:0})],
 ['nonfinite coordinate',r=>r.points[0].x=NaN],['unknown point field',r=>r.points[0].power=99],['excess altitude',r=>r.points[0].y=6],
 ['below flight area',r=>r.points[0].y=.1],['outside floor',r=>r.points[0].x=5],['duplicates',r=>r.points[1]={...r.points[0]}]
])test('route rejects '+name,()=>{const r=fixture();edit(r);assert.throws(()=>readRoute(r,'drone'));});
test('route rejects cross-host use instead of translating coordinates',()=>assert.throws(()=>readRoute(fixture(),'rover')));
test('route rejects accessors without invoking their code',()=>{let calls=0;const r=fixture();Object.defineProperty(r.points[0],'x',{get(){calls++;return 0;}});assert.throws(()=>readRoute(r,'drone'));assert.equal(calls,0);});
test('bounded parser rejects non-string oversized text and malformed JSON',()=>{for(const text of [{},' '.repeat(MAX_ROUTE_BYTES+1),'é'.repeat(MAX_ROUTE_BYTES),'{' ])assert.throws(()=>parseRoute(text,'drone'));});
test('humanoid target must fit the real plane and unclamped joint solution',()=>{const r=defaultRoute('humanoid');for(const p of [{x:.4,y:1.3,z:.4},{x:.32,y:2.2,z:.5},{x:.32,y:1.5,z:0}])assert.throws(()=>readRoute({...r,points:[p]},'humanoid'));});
test('rover routes stay on the flat-lane working floor with a fixed vertical target',()=>{const r=defaultRoute('rover');for(const p of [{x:4.8,y:.5,z:0},{x:0,y:4,z:0},{x:0,y:.5,z:20}])assert.throws(()=>readRoute({...r,points:[p]},'rover'));});
