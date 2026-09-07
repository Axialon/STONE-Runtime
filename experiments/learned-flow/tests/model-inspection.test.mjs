import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {loadRapier} from '../../rover3d/engine.mjs';import {loadPolicy,MODEL_SHA256} from '../browser-runtime.mjs';import {createModelSession} from '../../../packages/learned-rover/session.mjs';import {inspectPolicyRecording} from '../../../packages/learned-rover/inspection.mjs';
const R=await loadRapier(),policy=await loadPolicy(readFileSync(new URL('../model/model.json',import.meta.url),'utf8'));
function recording(id='rover.flow-learned'){const s=createModelSession(R,'flat-lane',id,policy);try{s.advance(100);s.stop();return JSON.stringify(s.export());}finally{s.dispose();}}
test('model AUDIT reports actual local replay/model calls and exact file bytes, not publisher authenticity',async()=>{
 const text=recording(),r=await inspectPolicyRecording(R,text,'rover',policy);assert.equal(r.source.sha256,createHash('sha256').update(text).digest('hex'));assert.equal(r.verification,'policy-and-engine-reexecution');assert.equal(r.authenticity,'not-verified');assert.equal(r.installation,'not-performed');assert.equal(r.summary.steps,100);assert.equal(r.summary.status,'stopped');assert.ok(r.verificationModel.inferenceCalls>0);assert.equal(r.verificationModel.modelSha256,MODEL_SHA256);assert.equal(r.results.length,1);
});
test('a rule-only policy recording does not pretend the verifier needed model inference',async()=>{const r=await inspectPolicyRecording(R,recording('rover.flow'),'auto',policy);assert.equal(r.verificationModel.inferenceCalls,0);assert.equal(r.summary.ruleDecisions,100);});
test('wrong hosts, malformed files and changed policy claims are rejected',async()=>{
 await assert.rejects(inspectPolicyRecording(R,recording(),'drone',policy));await assert.rejects(inspectPolicyRecording(R,'{}','auto',policy));const d=JSON.parse(recording());d.finalStatus='succeeded';await assert.rejects(inspectPolicyRecording(R,JSON.stringify(d),'auto',policy));
});
