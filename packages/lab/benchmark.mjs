import {createHumanoid,humanoidDecision,HUMANOID} from './humanoid.mjs';
import {createDrone,droneDecision,DRONE} from './drone.mjs';
import {getPackage,packagesFor} from './registry.mjs';
import {freeze} from './common.mjs';
import {compareStones} from '../../experiments/rover3d/session.mjs';
import {MACHINE,getCourse} from '../../experiments/rover3d/contract.mjs';
/** Fixed reference evaluation; no external hardware or unreviewed package execution. */
export function benchmark(R,host,task){
 if(host==='rover'){
  const rows=compareStones(R,task).map(r=>({stone:r.id,version:r.version,seconds:r.seconds,status:r.status,pathMetres:r.pathMetres}));
  return freeze({host,task,engineVersion:'0.20.0',machineVersion:MACHINE.version,taskVersion:getCourse(task).version,results:rows,recordings:[]});
 }
 if(!['humanoid','drone'].includes(host))throw new TypeError('This host has no executable benchmark.');
 const create=host==='drone'?createDrone:createHumanoid,decide=host==='drone'?droneDecision:humanoidDecision;
 const machine=host==='drone'?DRONE:HUMANOID,recordings=[],results=[];
 for(const p of packagesFor(host)){
  const h=create(R,task),samples=[h.read()];
  try{
   while(h.read().status==='running'){h.step(decide(p.id,h.read()));if(h.read().tick%4===0)samples.push(h.read());}
   if(samples.at(-1).tick!==h.read().tick)samples.push(h.read());
   const s=h.read();results.push({stone:p.id,version:p.version,seconds:s.seconds,status:s.status,pathMetres:s.travelMetres,completed:s.completed});
   recordings.push({stone:p.id,kind:'sampled-physics-recording',sampleEveryTicks:4,samples});
  }finally{h.dispose();}
 }
 return freeze({host,task,engineVersion:'0.20.0',machineVersion:machine.version,taskVersion:'0.1.0',results,recordings});
}
export async function digitalBenchmark(R,id,host,task,{cloud=null,consent=false,allowLocalFallback=false}={}){
 const p=getPackage(id);if(p.host!=='digital')throw new TypeError('Digital package required.');
 const connected=cloud?.status().configured===true;
 if(p.execution!=='local'&&!connected&&!(p.execution==='hybrid'&&allowLocalFallback===true))throw new Error('Cloud service is not configured.');
 if(p.execution!=='local'&&connected&&consent!==true)throw new Error('Data-transfer consent is required.');
 const b=benchmark(R,host,task),results=b.results;
 const summary=results.map(r=>r.stone+': '+r.status+' in '+r.seconds.toFixed(2)+' simulated seconds.').join(' ');
 const text=id==='digital.brief'?results.filter(r=>r.status==='succeeded').length+'/'+results.length+' reference tasks completed. '+summary:'Fixed '+host+' / '+task+' benchmark. '+summary;
 const local={stone:id,version:p.version,execution:p.execution,actualExecution:'local',model:null,host,task,engineVersion:b.engineVersion,machineVersion:b.machineVersion,taskVersion:b.taskVersion,results,text};
 if(p.execution==='local')return freeze(local);
 if(!connected)return freeze({...local,actualExecution:'local-only',cloud:{status:'not-configured'},notice:'Explicit fallback: no cloud model was invoked.'});
 const remote=await cloud.run({format:'stone.benchmark/0.1',task:host+'-reference',summary},consent);
 return freeze({...local,actualExecution:p.execution,model:remote.model,cloud:remote});
}
