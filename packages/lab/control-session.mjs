import {getPackage} from './registry.mjs';
import {readRoute,ROUTE_FORMAT} from '../routes/contract.mjs';
import {freeze,fields} from './common.mjs';
// Built-in adapters only; this is not a loader for untrusted package code.
function engine(R){if(!R||typeof R.version!=='function'||R.version()!=='0.20.0')throw new TypeError('Engine version mismatch.');}
function admit(spec,id){const p=getPackage(id);if(p.host!==spec.host||p.profile!==spec.profile||p.execution!=='local'||p.availability!=='available'||p.version!=='0.1.0')throw new TypeError('Incompatible Stone.');}
export function createControlSession(R,spec,task,stoneId,routeInput=null){
 const route=routeInput===null?null:readRoute(routeInput,spec.host);
 engine(R);admit(spec,stoneId);if(route?task!=='custom-route':!spec.tasks.includes(task))throw new TypeError('Unsupported task.');
 const host=spec.create(R,task,route),initialStoneId=stoneId,actions=[],assignments=[];
 let selected=stoneId,disposed=false;
 const alive=()=>{if(disposed)throw new Error('Session is disposed.');};
 const read=()=>{alive();return freeze({frame:host.read(),stoneId:selected});};
 return Object.freeze({read,
  select(id){alive();admit(spec,id);selected=id;return read();},
  advance(n=1){
   alive();if(!Number.isInteger(n)||n<1||n>24)throw new TypeError('Batch must contain 1..24 steps.');
   const frames=[],delta=[];
   for(let i=0;i<n&&host.read().status==='running';i++){
    const before=host.read(),action=spec.decide(selected,before),frame=host.step(action);
    if(frame.tick!==before.tick+1)throw new Error('Physics did not advance one tick.');
    actions.push(action);assignments.push(selected);delta.push(action);frames.push(read());
   }
   return freeze({state:read(),frames,actions:delta});
  },
  export(){alive();return freeze({format:route?'stone.'+spec.host+'.route-session/0.1':spec.format,profile:spec.profile,machineVersion:spec.version,engineVersion:'0.20.0',taskVersion:route?ROUTE_FORMAT:'0.1.0',task,...(route?{route}:{}),initialStoneId,finalStoneId:selected,finalStatus:host.read().status,actions:actions.slice(),assignments:assignments.slice()});},
  stop(){alive();host.stop();return read();},
  dispose(){if(!disposed){disposed=true;host.dispose();}}
 });
}
export function replayControlSession(R,spec,text){
 engine(R);if(typeof text!=='string'||text.length>800000)throw new TypeError('Invalid recording size.');
 const d=JSON.parse(text);
 const custom=d?.format==='stone.'+spec.host+'.route-session/0.1';
 const route=custom?readRoute(d.route,spec.host):null;
 if(!fields(d,['format','profile','machineVersion','engineVersion','taskVersion','task','initialStoneId','finalStoneId','finalStatus','actions','assignments',...(custom?['route']:[])])||d.format!==(custom?'stone.'+spec.host+'.route-session/0.1':spec.format)||d.profile!==spec.profile||d.machineVersion!==spec.version||d.engineVersion!=='0.20.0'||d.taskVersion!==(custom?ROUTE_FORMAT:'0.1.0')||(custom?d.task!=='custom-route':!spec.tasks.includes(d.task))||!Array.isArray(d.actions)||d.actions.length>spec.maxSteps||!Array.isArray(d.assignments)||d.assignments.length!==d.actions.length||!['running','stopped','succeeded','timed-out','out-of-bounds','engine-fault'].includes(d.finalStatus))throw new TypeError('Incompatible recording.');
 admit(spec,d.initialStoneId);admit(spec,d.finalStoneId);d.assignments.forEach(id=>admit(spec,id));
 if(!d.actions.every(spec.validAction))throw new TypeError('Invalid recorded action.');
 const host=spec.create(R,d.task,route);
 try{
  const frames=[freeze({frame:host.read(),stoneId:d.initialStoneId})];
  for(let i=0;i<d.actions.length;i++){
   if(host.read().status!=='running')throw new TypeError('Recording extends past terminal state.');
   const frame=host.step(d.actions[i]);if(frame.tick!==i+1)throw new Error('Replay did not advance.');
   frames.push(freeze({frame,stoneId:d.assignments[i]}));
  }
  // Stop is a recorded lifecycle event, not an extra simulated actuator action.
  if(d.finalStatus==='stopped'&&host.read().status==='running')host.stop();
  if(host.read().status!==d.finalStatus)throw new TypeError('Terminal status disagrees with simulation.');
  frames[frames.length-1]=freeze({...frames.at(-1),frame:host.read()});
  return freeze({reexecuted:true,frames,state:{frame:host.read(),stoneId:d.finalStoneId}});
 }finally{host.dispose();}
}
