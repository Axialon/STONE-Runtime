import {replayModelRecording} from './session.mjs';import {MODEL_IDENTITY} from './identity.mjs';
import {freeze} from '../../experiments/rover3d/contract.mjs';
/** Fixed first-party replay verifier, not an installer for a model named by the input file. */
export async function inspectPolicyRecording(R,text,target,policy){
 if(!['auto','rover'].includes(target))throw new TypeError('Policy recording requires the Rover host.');
 const replay=replayModelRecording(R,text,policy),f=replay.state.frame,m=replay.metrics,bytes=new TextEncoder().encode(text);
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 const identity=replay.state.execution,verificationModel={...MODEL_IDENTITY,loaded:true,inferenceCalls:m.modelCalls};
 return freeze({format:'stone.inspection/0.1',stone:'digital.audit',version:'0.1.0',execution:'local',actualExecution:'local',model:m.modelCalls?MODEL_IDENTITY:null,verificationModel,
  source:{bytes:bytes.length,sha256:digest},authenticity:'not-verified',installation:'not-performed',kind:'recording',valid:true,verification:'policy-and-engine-reexecution',compatibility:null,errors:[],
  summary:{host:'rover',profile:f.observation.profile,machineVersion:f.machineVersion,engineVersion:f.engine.version,task:f.courseId,taskVersion:f.courseVersion,steps:f.observation.tick,seconds:f.timeSeconds,status:f.status,finalStoneId:replay.state.stoneId,position:f.observation.position,modelCalls:m.modelCalls,ruleDecisions:m.ruleDecisions,guardDecisions:m.guardDecisions,selectedImplementation:identity.selected},
  results:[{stone:'Saved Rover policy recording',status:f.status,seconds:f.timeSeconds,pathMetres:m.pathMetres}],
  text:'Verified identified policy commands and actual engine replay: '+f.observation.tick+' steps, '+m.modelCalls+' local model calls. Terminal status '+f.status+'. The fixed pinned verifier model was loaded; no input file selected executable code or a remote service. This is reproducibility, not proof of publisher, authorship or an original event.'});
}
