import R from '/vendor/rapier.mjs';
import {createHumanoidSession,replayHumanoidSession} from '/packages/lab/humanoid-session.mjs';
import {createDroneSession,replayDroneSession} from '/packages/lab/drone-session.mjs';
import {benchmark,digitalBenchmark} from '/packages/lab/benchmark.mjs';
import {fields} from '/packages/lab/common.mjs';
const ready=R.init();let session=null,busy=false;
self.onmessage=async({data:m})=>{
 if(!fields(m,['id','type','payload'])||!Number.isSafeInteger(m.id)||m.id<1)return;
 if(busy){self.postMessage({id:m.id,ok:false});return;}busy=true;
 try{
  await ready;if(R.version()!=='0.20.0')throw new Error('Engine mismatch.');
  const p=m.payload;let result;
  if(m.type==='start'&&fields(p,['host','task','stoneId'])&&['humanoid','drone'].includes(p.host)){
   const create=p.host==='drone'?createDroneSession:createHumanoidSession,next=create(R,p.task,p.stoneId);session?.dispose();session=next;
   result={state:session.read(),recording:session.export()};
  }else if(m.type==='replay'&&fields(p,['host','recording'])&&['humanoid','drone'].includes(p.host))result=(p.host==='drone'?replayDroneSession:replayHumanoidSession)(R,p.recording);
  else if(m.type==='compare'&&fields(p,['kind','host','task','stoneId','allowLocalFallback'])){
   if(p.kind==='benchmark'&&['humanoid','drone'].includes(p.host)){const b=benchmark(R,p.host,p.task);result={results:b.results,engineVersion:b.engineVersion,machineVersion:b.machineVersion,taskVersion:b.taskVersion,host:b.host,task:b.task};}
   else if(p.kind==='digital')result=await digitalBenchmark(R,p.stoneId,p.host,p.task,{allowLocalFallback:p.allowLocalFallback===true});
   else throw new Error('Unsupported comparison.');
  }else{
   if(!session)throw new Error('No session.');
   if(m.type==='advance'&&fields(p,['steps']))result=session.advance(p.steps);
   else if(m.type==='select'&&fields(p,['stoneId']))result=session.select(p.stoneId);
   else if(m.type==='read'&&fields(p,[]))result=session.read();
   else if(m.type==='export'&&fields(p,[]))result=session.export();
   else throw new Error('Unsupported operation.');
  }
  self.postMessage({id:m.id,ok:true,result});
 }catch{self.postMessage({id:m.id,ok:false});}finally{busy=false;}
};
