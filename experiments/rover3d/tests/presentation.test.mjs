import test from 'node:test';
import assert from 'node:assert/strict';
import {createRover} from '../host.mjs';
import {readFile} from 'node:fs/promises';
test('wheel display samples are detached finite engine data, not invented animation',async()=>{
 const h=await createRover();try{for(let i=0;i<100;i++)h.step({throttle:0.3,steering:0.2,brake:0});
 const before=h.snapshot(),v=h.visualState();assert.equal(v.wheels.length,4);for(const w of v.wheels){assert.equal(typeof w.contact,'boolean');assert.ok([w.suspensionLength,w.rotation,w.steering].every(Number.isFinite));}assert.ok(Object.isFrozen(v));assert.deepEqual(h.snapshot(),before);
 }finally{h.dispose();}
});
test('shared host constructor has no Node-only module or automatic engine import',async()=>{
 const text=await readFile(new URL('../world.mjs',import.meta.url),'utf8');assert.equal(/from ['"]node:/.test(text),false);assert.equal(text.includes('loadRapier'),false);
});
