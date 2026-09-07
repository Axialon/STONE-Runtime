import test from 'node:test';import assert from 'node:assert/strict';
import {workbenchUrls} from '../apps/shared/navigation.mjs';
test('workbench navigation destinations remain fixed loopback HTTP origins',()=>{assert.deepEqual(workbenchUrls(),{field:'http://127.0.0.1:4174/',rover:'http://127.0.0.1:4173/'});assert.ok(Object.isFrozen(workbenchUrls()));});
