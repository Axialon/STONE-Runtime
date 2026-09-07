import {freeze,MACHINE,makeReplay,parseReplay} from '../../experiments/rover3d/contract.mjs';
import {getModelStone,identityFor,matchesIdentity} from './identity.mjs';
export const POLICY_FORMAT='stone.rover.policy-session/0.1';
const keys=(v,k)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
export function makePolicyRecording(courseId,initialStoneId,finalStoneId,finalStatus,actions,assignments,counters){
 getModelStone(initialStoneId);getModelStone(finalStoneId);
 const tape=makeReplay(courseId,actions);
 if(!['running','stopped','succeeded','timed-out','out-of-bounds'].includes(finalStatus)||!Array.isArray(assignments)||assignments.length!==actions.length||Object.keys(assignments).length!==assignments.length)throw new TypeError('Invalid policy recording status or attribution.');
 assignments.forEach(getModelStone);
 const ids=[...new Set([initialStoneId,...assignments,finalStoneId])].sort();
 const ck=['modelCalls','ruleDecisions','guardDecisions'];
 if(!keys(counters,ck)||!ck.every(k=>Number.isSafeInteger(counters[k])&&counters[k]>=0&&counters[k]<=MACHINE.maxSteps)||ck.reduce((sum,k)=>sum+counters[k],0)!==actions.length)throw new TypeError('Invalid inference counters.');
 return freeze({format:POLICY_FORMAT,tape,initialStoneId,finalStoneId,finalStatus,assignments:assignments.slice(),implementations:Object.fromEntries(ids.map(id=>[id,identityFor(id)])),counters:{...counters}});
}
export function parsePolicyRecording(text){
 if(typeof text!=='string'||text.length>2000000||new TextEncoder().encode(text).length>2000000)throw new TypeError('Invalid recording size.');
 const d=JSON.parse(text);
 if(!keys(d,['format','tape','initialStoneId','finalStoneId','finalStatus','assignments','implementations','counters'])||d.format!==POLICY_FORMAT)throw new TypeError('Unsupported policy recording format.');
 const t=parseReplay(JSON.stringify(d.tape)),expected=makePolicyRecording(t.courseId,d.initialStoneId,d.finalStoneId,d.finalStatus,t.actions,d.assignments,d.counters);
 if(!keys(d.implementations,Object.keys(expected.implementations))||!Object.entries(d.implementations).every(([id,x])=>matchesIdentity(x)&&x.id===id))throw new TypeError('Recorded model or implementation identity differs.');
 return expected;
}
