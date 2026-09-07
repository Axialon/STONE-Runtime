import {readRoute,ROUTE_FORMAT} from './contract.mjs';
import {createRoverWorld} from '../../experiments/rover3d/world.mjs';
import {MACHINE,PROFILE,freeze,readAction} from '../../experiments/rover3d/contract.mjs';
import {getStone,decide} from '../../experiments/rover3d/stones.mjs';
import {fields} from '../lab/common.mjs';
export const ROVER_ROUTE_FORMAT='stone.rover.route-session/0.1';
export function createRoverRouteSession(R,input,stoneId='rover.flow'){
 const route=readRoute(input,'rover');getStone(stoneId);
 if(R.version()!=='0.20.0')throw new TypeError('Engine mismatch.');
 const host=createRoverWorld(R,'flat-lane',route),initialStoneId=stoneId,actions=[],assignments=[];
 let selected=stoneId,applied=null,disposed=false,travel=0,impulse=0,peakSpeed=0,peakHeight=host.snapshot().observation.position.y;
 const alive=()=>{if(disposed)throw new Error('Session disposed.');};
 const read=()=>{alive();return freeze({frame:host.snapshot(),visual:host.visualState(),stoneId:selected,appliedStoneId:applied});};
 const metrics=()=>{alive();const s=host.snapshot();return freeze({seconds:s.timeSeconds,status:s.status,pathMetres:travel,throttleImpulseNs:impulse,peakSpeed,peakHeight,chassisContacts:s.chassisContactStarts,completed:s.completed});};
 function advance(n=1){alive();if(!Number.isInteger(n)||n<1||n>120)throw new TypeError('Batch must contain1–120 steps.');const frames=[],delta=[];
  for(let i=0;i<n&&host.snapshot().status==='running';i++){
   const before=host.snapshot().observation,a=decide(selected,before),f=host.step(a),o=f.observation;
   if(o.tick!==before.tick+1)throw new Error('Physics did not advance one tick.');
   actions.push(a);delta.push(a);assignments.push(selected);applied=selected;
   travel+=Math.hypot(o.position.x-before.position.x,o.position.y-before.position.y,o.position.z-before.position.z);
   impulse+=Math.abs(a.throttle)*MACHINE.maxEngineForcePerWheelN*4*MACHINE.dt;
   peakSpeed=Math.max(peakSpeed,Math.hypot(o.linearVelocity.x,o.linearVelocity.y,o.linearVelocity.z));peakHeight=Math.max(peakHeight,o.position.y);frames.push(read());
  }return freeze({state:read(),snapshot:read(),frames,actions:delta,metrics:metrics()});
 }
 return Object.freeze({read,advance,metrics,select(id){alive();getStone(id);selected=id;return read();},stop(){alive();host.stop();return read();},
  export(){alive();return freeze({format:ROVER_ROUTE_FORMAT,profile:PROFILE,machineVersion:MACHINE.version,engineVersion:'0.20.0',taskVersion:ROUTE_FORMAT,task:'custom-route',route,initialStoneId,finalStoneId:selected,finalStatus:host.snapshot().status,actions:actions.slice(),assignments:assignments.slice()});},
  dispose(){if(!disposed){disposed=true;host.dispose();}}});
}
export function replayRoverRoute(R,text){
 if(R.version()!=='0.20.0'||typeof text!=='string'||text.length>1500000||new TextEncoder().encode(text).length>1500000)throw new TypeError('Invalid route recording.');
 const d=JSON.parse(text);
 if(!fields(d,['format','profile','machineVersion','engineVersion','taskVersion','task','route','initialStoneId','finalStoneId','finalStatus','actions','assignments'])||d.format!==ROVER_ROUTE_FORMAT||d.profile!==PROFILE||d.machineVersion!==MACHINE.version||d.engineVersion!=='0.20.0'||d.taskVersion!==ROUTE_FORMAT||d.task!=='custom-route'||!Array.isArray(d.actions)||d.actions.length>MACHINE.maxSteps||!Array.isArray(d.assignments)||d.assignments.length!==d.actions.length)throw new TypeError('Incompatible rover route recording.');
 const route=readRoute(d.route,'rover');getStone(d.initialStoneId);getStone(d.finalStoneId);d.assignments.forEach(getStone);const actions=d.actions.map(readAction),h=createRoverWorld(R,'flat-lane',route);
 try{
  const frames=[freeze({frame:h.snapshot(),visual:h.visualState(),stoneId:d.initialStoneId,appliedStoneId:null})];
  for(let i=0;i<actions.length;i++){if(h.snapshot().status!=='running')throw new Error('Recording extends beyond terminal state.');const frame=h.step(actions[i]);if(frame.observation.tick!==i+1)throw new Error('Replay did not advance.');frames.push(freeze({frame,visual:h.visualState(),stoneId:d.assignments[i],appliedStoneId:d.assignments[i]}));}
  if(d.finalStatus==='stopped'&&h.snapshot().status==='running')h.stop();
  if(h.snapshot().status!==d.finalStatus)throw new TypeError('Recorded terminal status disagrees with physics.');
  frames[frames.length-1]=freeze({...frames.at(-1),frame:h.snapshot()});
  return freeze({reexecuted:true,frames,state:{...frames.at(-1),stoneId:d.finalStoneId}});
 }finally{h.dispose();}
}
