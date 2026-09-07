import {freeze,MACHINE,ENGINE,getCourse,readAction} from '../../experiments/rover3d/contract.mjs';
import {createRoverWorld} from '../../experiments/rover3d/world.mjs';
import {decide} from '../../experiments/rover3d/stones.mjs';
import {isLoadedPolicy} from '../../experiments/learned-flow/browser-runtime.mjs';
import {MODEL_IDENTITY,MODEL_SHA256,MODEL_STONES,getModelStone,identityFor} from './identity.mjs';
import {makePolicyRecording,parsePolicyRecording} from './recording.mjs';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function admitted(R,course,policy){
 if(!R||R.version()!==ENGINE.version||!isLoadedPolicy(policy))throw new TypeError('A verified pinned model and matching engine are required.');
 getCourse(course);
}
/** First-party fixed-course context; model does not acquire authority over world state. */
export function createModelSession(R,courseId,stoneId,policy){
 admitted(R,courseId,policy);getModelStone(stoneId);
 const h=createRoverWorld(R,courseId),initialStoneId=stoneId,actions=[],assignments=[];
 const counters={modelCalls:0,ruleDecisions:0,guardDecisions:0};
 let selected=stoneId,applied=null,source='none',guard=null,disposed=false,travel=0,impulse=0,peakSpeed=0,peakHeight=h.snapshot().observation.position.y;
 const alive=()=>{if(disposed)throw new Error('Session disposed.');};
 const read=()=>{alive();return freeze({frame:h.snapshot(),visual:h.visualState(),stoneId:selected,appliedStoneId:applied,execution:{selected:identityFor(selected),applied:applied?identityFor(applied):null,source,guard,...counters}});};
 const metrics=()=>{alive();const f=h.snapshot(),o=f.observation;return freeze({seconds:f.timeSeconds,status:f.status,pathMetres:travel,throttleImpulseNs:impulse,peakSpeed,peakHeight,chassisContacts:f.chassisContactStarts,goalDistance:Math.hypot(o.position.x-o.goal.x,o.position.y-o.goal.y,o.position.z-o.goal.z),...counters});};
 function advance(n=1){alive();if(!Number.isSafeInteger(n)||n<1||n>120)throw new TypeError('Batch requires1–120 ticks.');const frames=[],delta=[];
  for(let i=0;i<n&&h.snapshot().status==='running';i++){
   const before=h.snapshot().observation,learned=selected===MODEL_IDENTITY.id;
   const result=learned?policy.decide(before):{action:decide(selected,before),guard:null,modelCalls:0};
   const a=readAction(result.action),next=h.step(a);
   if(next.observation.tick!==before.tick+1||!['running','succeeded','timed-out','out-of-bounds'].includes(next.status))throw new Error('Engine did not acknowledge a valid step.');
   source=learned?(result.modelCalls?'model':'guard'):'rule';guard=result.guard;
   if(source==='model')counters.modelCalls++;else if(source==='rule')counters.ruleDecisions++;else counters.guardDecisions++;
   applied=selected;actions.push(a);assignments.push(selected);delta.push(a);
   const o=next.observation;travel+=Math.hypot(o.position.x-before.position.x,o.position.y-before.position.y,o.position.z-before.position.z);impulse+=Math.abs(a.throttle)*MACHINE.maxEngineForcePerWheelN*4*MACHINE.dt;
   peakSpeed=Math.max(peakSpeed,Math.hypot(o.linearVelocity.x,o.linearVelocity.y,o.linearVelocity.z));peakHeight=Math.max(peakHeight,o.position.y);frames.push(read());
  }return freeze({snapshot:read(),frames,actions:delta,metrics:metrics()});
 }
 return Object.freeze({read,metrics,advance,
  select(id){alive();getModelStone(id);selected=id;return read();},
  stop(){alive();h.stop();return read();},
  export(){alive();return makePolicyRecording(courseId,initialStoneId,selected,h.snapshot().status,actions,assignments,counters);},
  dispose(){if(!disposed){disposed=true;h.dispose();}}
 });
}
export function replayModelRecording(R,text,policy){
 const d=parsePolicyRecording(text);admitted(R,d.tape.courseId,policy);
 const s=createModelSession(R,d.tape.courseId,d.initialStoneId,policy);
 try{
  const frames=[s.read()];
  for(let i=0;i<d.tape.actions.length;i++){
   if(s.read().frame.status!=='running')throw new TypeError('Recording extends beyond terminal state.');
   s.select(d.assignments[i]);const step=s.advance(1);
   if(!equal(step.actions[0],d.tape.actions[i]))throw new TypeError('Recorded action disagrees with the identified policy.');
   frames.push(step.frames[0]);
  }
  if(d.finalStatus==='stopped'&&s.read().frame.status==='running')s.stop();
  if(s.read().frame.status!==d.finalStatus)throw new TypeError('Claimed terminal state differs from reexecution.');
  frames[frames.length-1]=freeze({...frames.at(-1),frame:s.read().frame});
  s.select(d.finalStoneId);
  if(!equal(s.export().counters,d.counters))throw new TypeError('Claimed inference counts differ from reexecution.');
  return freeze({reexecuted:true,policyVerified:true,authenticity:'not-verified',frames,state:s.read(),metrics:s.metrics()});
 }finally{s.dispose();}
}
export function compareModelStones(R,courseId,policy){
 admitted(R,courseId,policy);
 const results=MODEL_STONES.map(stone=>{const s=createModelSession(R,courseId,stone.id,policy),path=[s.read().frame.observation.position];try{
  while(s.read().frame.status==='running'){const batch=s.advance(120);for(const f of batch.frames)if(f.frame.observation.tick%6===0)path.push(f.frame.observation.position);}
  path.push(s.read().frame.observation.position);return freeze({id:stone.id,name:stone.name,version:stone.version,machineVersion:MACHINE.version,implementation:identityFor(stone.id),...s.metrics(),path});
 }finally{s.dispose();}});
 return freeze({scope:'fixed-model-reference',courseId,courseVersion:getCourse(courseId).version,machineVersion:MACHINE.version,engine:ENGINE,modelSha256:MODEL_SHA256,results});
}
