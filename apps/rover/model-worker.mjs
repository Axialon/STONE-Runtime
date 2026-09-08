import R from '/vendor/rapier.mjs';
import {fetchPolicy,loadPackage,createModelPackage,createModelSession,replayModelRecording,compareModelStones} from '/vendor/learned.mjs';
import {getModelStone} from '/packages/learned-rover/identity.mjs';
import {getCourse} from '/rover/contract.mjs';
const ready=R.init();let policy=null,policySource=null,session=null,busy=false;
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(i=>Object.hasOwn(x,i));
function sourceFor(p,base){const supplied=keys(p,[...base,'packageText']);if(!supplied&&!keys(p,base))throw new Error('Unsupported payload.');if(supplied&&(typeof p.packageText!=='string'||p.packageText.length>262144))throw new Error('Invalid supplied Stone file.');return supplied?p.packageText:null;}
async function acquire(source){await ready;if(R.version()!=='0.20.0')throw new Error('Wrong engine.');if(policy&&source===policySource)return policy;return source===null?fetchPolicy():(await loadPackage(source)).policy;}
async function usingPolicy(source,fn){const model=await acquire(source);try{return await fn(model);}finally{if(model!==policy)model.dispose();}}
self.onmessage=async({data:m})=>{
 if(!keys(m,['id','type','payload'])||!Number.isSafeInteger(m.id)||m.id<1)return;
 if(busy){self.postMessage({id:m.id,ok:false});return;}busy=true;
 try{const p=m.payload;let result;
  if(m.type==='start'){
   const source=sourceFor(p,['courseId','stoneId']);getCourse(p.courseId);getModelStone(p.stoneId);const model=await acquire(source);let next;
   try{next=createModelSession(R,p.courseId,p.stoneId,model);}catch(e){if(model!==policy)model.dispose();throw e;}
   session?.dispose();if(policy&&policy!==model)policy.dispose();policy=model;policySource=source;session=next;result=session.read();
  }else if(m.type==='replay'){
   const source=sourceFor(p,['recording']);if(typeof p.recording!=='string'||p.recording.length>2000000)throw new Error('Invalid recording.');result=await usingPolicy(source,model=>replayModelRecording(R,p.recording,model));
  }else if(m.type==='compare'){
   const source=sourceFor(p,['courseId']);getCourse(p.courseId);result=await usingPolicy(source,model=>compareModelStones(R,p.courseId,model));
  }else if(m.type==='inspect'){
   const source=sourceFor(p,['kind']);if(p.kind!=='export-package')throw new Error('Unsupported export.');result=await usingPolicy(source,model=>createModelPackage(model.exportArtifact()));
  }else{
   if(!session)throw new Error('No session.');
   if(m.type==='advance'&&keys(p,['steps']))result=session.advance(p.steps);
   else if(m.type==='select'&&keys(p,['stoneId']))result=session.select(p.stoneId);
   else if(m.type==='read'&&keys(p,[]))result=session.read();
   else if(m.type==='export'&&keys(p,[]))result=session.export();else throw new Error('Unsupported operation.');
  }
  self.postMessage({id:m.id,ok:true,result});
 }catch{self.postMessage({id:m.id,ok:false});}finally{busy=false;}
};
