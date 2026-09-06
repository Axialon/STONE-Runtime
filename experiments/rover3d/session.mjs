/** Bounded first-party simulation session, shared by Node and the browser worker. */
import {MACHINE,freeze,makeReplay,parseReplay} from './contract.mjs';
import {createRoverWorld} from './world.mjs';
import {STONES,getStone,decide} from './stones.mjs';
export function createSession(R,courseId='flat-lane',stoneId='rover.flow'){
  getStone(stoneId);const host=createRoverWorld(R,courseId);
  let installed=stoneId,applied=null,disposed=false;
  const actions=[],assignments=[],frames=[];
  let travel=0,throttleImpulse=0,peakSpeed=0,peakHeight=host.snapshot().observation.position.y;
  const alive=()=>{if(disposed)throw new Error('Session is disposed.');};
  const read=()=>{alive();return freeze({frame:host.snapshot(),visual:host.visualState(),stoneId:installed,appliedStoneId:applied});};
  frames.push(read());
  const metrics=()=>freeze({seconds:host.snapshot().timeSeconds,status:host.snapshot().status,pathMetres:travel,throttleImpulseNs:throttleImpulse,peakSpeed,peakHeight,chassisContacts:host.snapshot().chassisContactStarts});
  function advance(n=1){alive();if(!Number.isInteger(n)||n<1||n>120)throw new TypeError('Batch must contain 1..120 steps.');const added=[],offset=actions.length;
    for(let i=0;i<n&&host.snapshot().status==='running';i++){
      const before=host.snapshot().observation,a=decide(installed,before),f=host.step(a);
      if(f.observation.tick===before.tick){break;}
      actions.push(a);assignments.push(installed);applied=installed;
      const p=f.observation.position,v=f.observation.linearVelocity;
      travel+=Math.hypot(p.x-before.position.x,p.y-before.position.y,p.z-before.position.z);
      throttleImpulse+=Math.abs(a.throttle)*MACHINE.maxEngineForcePerWheelN*4*MACHINE.dt;
      peakSpeed=Math.max(peakSpeed,Math.hypot(v.x,v.y,v.z));peakHeight=Math.max(peakHeight,p.y);
      const sample=read();frames.push(sample);added.push(sample);
    }return freeze({snapshot:read(),frames:added,actions:actions.slice(offset),metrics:metrics()});
  }
  const exportData=()=>{alive();return freeze({format:'stone.rover.session/0.1',tape:makeReplay(courseId,actions.slice()),assignments:assignments.slice(),metrics:metrics()});};
  function replay(){alive();const h=createRoverWorld(R,courseId);try{
    const result=[freeze({frame:h.snapshot(),visual:h.visualState(),stoneId:assignments[0]??installed,appliedStoneId:null})];
    for(let i=0;i<actions.length;i++){const frame=h.step(actions[i]);result.push(freeze({frame,visual:h.visualState(),stoneId:assignments[i],appliedStoneId:assignments[i]}));}
    const verified=result.every((f,i)=>JSON.stringify(f.frame)===JSON.stringify(frames[i].frame)&&JSON.stringify(f.visual)===JSON.stringify(frames[i].visual));
    if(!verified)throw new Error('Engine replay diverged.');return freeze({verified,frames:result});
  }finally{h.dispose();}}
  return Object.freeze({read,advance,metrics,export:exportData,replay,select(id){alive();getStone(id);installed=id;return read();},stop(){alive();host.stop();return read();},dispose(){if(!disposed){disposed=true;host.dispose();}}});
}
export function compareStones(R,courseId){return freeze(STONES.map(stone=>{
  const s=createSession(R,courseId,stone.id),path=[];
  try{path.push(s.read().frame.observation.position);while(s.read().frame.status==='running'){const r=s.advance(120);for(const f of r.frames)if(f.frame.observation.tick%6===0)path.push(f.frame.observation.position);}
    path.push(s.read().frame.observation.position);return freeze({id:stone.id,name:stone.name,version:stone.version,machineVersion:MACHINE.version,...s.metrics(),path});
  }finally{s.dispose();}
}));}

export function replayRecording(R,text){
  if(typeof text!=='string'||text.length>2000000)throw new TypeError('Invalid recording.');
  const d=JSON.parse(text);
  if(!d||d.format!=='stone.rover.session/0.1'||!Array.isArray(d.assignments))throw new TypeError('Invalid recording.');
  const tape=parseReplay(JSON.stringify(d.tape));
  if(d.assignments.length!==tape.actions.length)throw new TypeError('Invalid attribution.');d.assignments.forEach(getStone);
  const h=createRoverWorld(R,tape.courseId);try{
    const frames=[freeze({frame:h.snapshot(),visual:h.visualState(),stoneId:d.assignments[0]??'rover.flow',appliedStoneId:null})];
    tape.actions.forEach((a,i)=>frames.push(freeze({frame:h.step(a),visual:h.visualState(),stoneId:d.assignments[i],appliedStoneId:d.assignments[i]})));
    return freeze({reexecuted:true,frames});
  }finally{h.dispose();}
}
