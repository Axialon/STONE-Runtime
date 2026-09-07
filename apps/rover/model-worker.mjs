import R from '/vendor/rapier.mjs';
import {fetchPolicy,createModelSession,replayModelRecording,compareModelStones} from '/vendor/learned.mjs';
import {getModelStone} from '/packages/learned-rover/identity.mjs';
import {getCourse} from '/rover/contract.mjs';
const ready=R.init();let policy=null,session=null,courseId='flat-lane',busy=false;
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(i=>Object.hasOwn(x,i));
async function loaded(){await ready;if(R.version()!=='0.20.0')throw new Error('Wrong engine.');policy??=await fetchPolicy();return policy;}
self.onmessage=async({data:m})=>{
 if(!keys(m,['id','type','payload'])||!Number.isSafeInteger(m.id)||m.id<1)return;
 if(busy){self.postMessage({id:m.id,ok:false});return;}busy=true;
 try{const p=m.payload;let result;
  if(m.type==='start'&&keys(p,['courseId','stoneId'])){
   getCourse(p.courseId);getModelStone(p.stoneId);const model=await loaded(),next=createModelSession(R,p.courseId,p.stoneId,model);session?.dispose();session=next;courseId=p.courseId;result=session.read();
  }else if(m.type==='replay'&&keys(p,['recording'])){
   if(typeof p.recording!=='string'||p.recording.length>2000000)throw new Error('Invalid recording.');result=replayModelRecording(R,p.recording,await loaded());
  }else if(m.type==='compare'&&keys(p,['courseId'])){getCourse(p.courseId);result=compareModelStones(R,p.courseId,await loaded());}
  else{
   if(!session)throw new Error('No session.');
   if(m.type==='advance'&&keys(p,['steps']))result=session.advance(p.steps);
   else if(m.type==='select'&&keys(p,['stoneId']))result=session.select(p.stoneId);
   else if(m.type==='read'&&keys(p,[]))result=session.read();
   else if(m.type==='export'&&keys(p,[]))result=session.export();else throw new Error('Unsupported operation.');
  }
  self.postMessage({id:m.id,ok:true,result});
 }catch{self.postMessage({id:m.id,ok:false});}finally{busy=false;}
};
