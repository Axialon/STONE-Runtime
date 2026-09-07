import R from '/vendor/rapier.mjs';
import {createRouteSession,replayRoute,compareRoute} from '/packages/routes/runtime.mjs';
import {readRoute} from '/packages/routes/contract.mjs';
import {createSession,compareStones,replayRecording} from '/rover/session.mjs';
import {getCourse} from '/rover/contract.mjs';
import {getStone} from '/rover/stones.mjs';
const ready=R.init();let session=null,course='flat-lane',busy=false,activeRoute=null;
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===list.length&&list.every(k=>Object.hasOwn(v,k));
self.onmessage=async({data:m})=>{
  if(!keys(m,['id','type','payload'])||!Number.isSafeInteger(m.id)||m.id<1)return;
  if(busy){self.postMessage({id:m.id,ok:false});return;}busy=true;
  try{await ready;const p=m.payload;let result;
    if(m.type==='replay'&&keys(p,['recording']))result=JSON.parse(p.recording)?.format==='stone.rover.route-session/0.1'?replayRoute(R,p.recording,'rover'):replayRecording(R,p.recording);
    else if(m.type==='compare'&&keys(p,['courseId','route'])){if(p.courseId!=='flat-lane')throw 0;readRoute(p.route,'rover');result=compareRoute(R,p.route);}
    else if(m.type==='compare'&&keys(p,['courseId'])){getCourse(p.courseId);result=compareStones(R,p.courseId);}
    else if(m.type==='start'){const custom=keys(p,['courseId','stoneId','route']);if(!custom&&!keys(p,['courseId','stoneId']))throw 0;getCourse(p.courseId);getStone(p.stoneId);if(custom){if(p.courseId!=='flat-lane')throw 0;readRoute(p.route,'rover');}const next=custom?createRouteSession(R,p.route,p.stoneId):createSession(R,p.courseId,p.stoneId);session?.dispose();session=next;course=p.courseId;activeRoute=custom?readRoute(p.route,'rover'):null;result=session.read();}
    else{if(!session)throw 0;
      if(m.type==='advance'&&keys(p,['steps']))result=session.advance(p.steps);
      else if(m.type==='select'&&keys(p,['stoneId']))result=session.select(p.stoneId);
      else if(keys(p,[])){
        if(m.type==='read')result=session.read();else if(m.type==='replay')result=session.replay();else if(m.type==='compare')result=activeRoute?compareRoute(R,activeRoute):compareStones(R,course);else if(m.type==='export')result=session.export();else throw 0;
      }else throw 0;
    }self.postMessage({id:m.id,ok:true,result});
  }catch{self.postMessage({id:m.id,ok:false});}finally{busy=false;}
};
