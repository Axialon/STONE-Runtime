import test from 'node:test';import assert from 'node:assert/strict';
import {ROUTE_LIMITS,defaultRoute} from '../packages/routes/contract.mjs';
test('plan bounds use the displayed axes rather than confusing drone altitude with Z',()=>{
 assert.deepEqual(ROUTE_LIMITS.drone.axes,['x','z']);assert.deepEqual(ROUTE_LIMITS.drone.vertical,[-2.5,2.5]);
 for(const host of ['rover','drone','humanoid']){const l=ROUTE_LIMITS[host];for(const p of defaultRoute(host).points){assert.ok(p[l.axes[0]]>=l.horizontal[0]&&p[l.axes[0]]<=l.horizontal[1]);assert.ok(p[l.axes[1]]>=l.vertical[0]&&p[l.axes[1]]<=l.vertical[1]);}}
});
