import {parseManifest} from '../contract/manifest.mjs';
import {checkCompatibility} from '../contract/compatibility.mjs';
import {hostFor,hostForProfile} from '../contract/reference.mjs';
import {replayDroneSession} from './drone-session.mjs';
import {replayHumanoidSession} from './humanoid-session.mjs';
import {freeze} from './common.mjs';
export const MAX_EVIDENCE_BYTES=2097152;
const targets=['auto','arena','rover','drone','humanoid','digital','audit'];
const replayers=Object.freeze({'stone.drone.session/0.2':{host:'drone',run:replayDroneSession},'stone.humanoid.session/0.2':{host:'humanoid',run:replayHumanoidSession}});
/** Data-only Digital Stone. Uploaded strings never select imports, providers or permissions. */
export async function inspectStoneData(R,text,target='auto'){
 if(!targets.includes(target))throw new TypeError('Unknown offline inspection target.');
 if(typeof text!=='string'||text.length>MAX_EVIDENCE_BYTES)throw new TypeError('Evidence must be bounded UTF-8 JSON.');
 const bytes=new TextEncoder().encode(text);
 if(bytes.length>MAX_EVIDENCE_BYTES)throw new TypeError('Evidence exceeds the two MiB input limit.');
 let data;try{data=JSON.parse(text);}catch{throw new TypeError('Evidence is not valid JSON.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new TypeError('Evidence must be a supported JSON object.');
 const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 const source={bytes:bytes.length,sha256:Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')};
 const base={format:'stone.inspection/0.1',stone:'digital.audit',version:'0.1.0',execution:'local',actualExecution:'local',model:null,source,authenticity:'not-verified',installation:'not-performed',results:[]};
 if(Object.hasOwn(data,'schemaVersion')){
  const validation=parseManifest(text);
  if(!validation.valid)return freeze({...base,kind:'manifest',valid:false,verification:'metadata-only',compatibility:null,errors:validation.errors.slice(0,16),text:'Manifest rejected. No package was installed or executed.'});
  const m=validation.manifest,host=target==='auto'?hostForProfile(m.compatibility.profile):hostFor(target),compatibility=checkCompatibility(m,host);
  return freeze({...base,kind:'manifest',valid:true,verification:'metadata-only',compatibility,errors:[],
   summary:{id:m.id,name:m.name,schemaVersion:m.schemaVersion,profile:m.compatibility.profile,machineVersion:m.compatibility.machineVersion??null,engineVersion:m.compatibility.engineVersion??null,declaredExecution:m.execution.mode,requestedModel:m.implementation.modelRef,checkedHost:host.profile},
   text:`Valid manifest for ${m.id}. ${compatibility.compatible?'Compatible with':'Not compatible with'} the selected offline reference policy. No installation, model loading or permission grant occurred.`});
 }
 if(typeof data.format!=='string'||!Object.hasOwn(replayers,data.format))throw new TypeError('Unsupported evidence format. Use a core manifest or versioned drone/arm recording.');
 const spec=replayers[data.format];
 if(target!=='auto'&&target!==spec.host)throw new TypeError('Selected host does not match the recording.');
 let replay;try{replay=spec.run(R,JSON.stringify(data));}catch{throw new TypeError('Recording failed version, action or terminal-state verification.');}
 const f=replay.state.frame;
 return freeze({...base,kind:'recording',valid:true,verification:'engine-reexecution',compatibility:null,errors:[],
  summary:{host:spec.host,profile:data.profile,machineVersion:data.machineVersion,engineVersion:data.engineVersion,task:data.task,taskVersion:data.taskVersion,steps:f.tick,seconds:f.seconds,status:f.status,finalStoneId:replay.state.stoneId,attributedStoneIds:[...new Set(data.assignments)],position:f.tip??f.position},
  results:[{stone:'Saved '+spec.host+' recording',status:f.status,seconds:f.seconds,pathMetres:f.travelMetres}],
  text:`Reexecuted ${f.tick} admitted ${spec.host} commands. Terminal status ${f.status} matches the recording. The digest identifies the supplied bytes; it does not authenticate the publisher, original run, claimed controller attribution or model weights.`});
}
