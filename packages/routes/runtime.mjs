import {readRoute,ROUTE_FORMAT} from './contract.mjs';
import {createRoverRouteSession,replayRoverRoute} from './rover-session.mjs';
import {createDroneSession,replayDroneSession} from '../lab/drone-session.mjs';
import {createHumanoidSession,replayHumanoidSession} from '../lab/humanoid-session.mjs';
import {packagesFor} from '../lab/registry.mjs';
import {STONES} from '../../experiments/rover3d/stones.mjs';
import {freeze} from '../lab/common.mjs';
export function createRouteSession(R,input,id){
 const route=readRoute(input,input?.host);
 if(route.host==='rover')return createRoverRouteSession(R,route,id);
 return (route.host==='drone'?createDroneSession:createHumanoidSession)(R,'custom-route',id,route);
}
export function replayRoute(R,text,host){
 if(typeof text!=='string'||text.length>1500000)throw new TypeError('Invalid route recording size.');
 const d=JSON.parse(text);readRoute(d.route,host);
 return host==='rover'?replayRoverRoute(R,text):(host==='drone'?replayDroneSession:replayHumanoidSession)(R,text);
}
export function compareRoute(R,input){
 const route=readRoute(input,input?.host),packages=route.host==='rover'?STONES:packagesFor(route.host),results=[];
 for(const p of packages){const s=createRouteSession(R,route,p.id),path=[];const position=f=>f.observation?.position??f.tip??f.position;try{
  path.push(position(s.read().frame));
  while(s.read().frame.status==='running'){const batch=s.advance(24);for(const sample of batch.frames)if((sample.frame.tick??sample.frame.observation.tick)%6===0)path.push(position(sample.frame));}
  path.push(position(s.read().frame));
  const f=s.read().frame,m=route.host==='rover'?s.metrics():{seconds:f.seconds,status:f.status,pathMetres:f.travelMetres,completed:f.completed};
  results.push({id:p.id,stone:p.id,name:p.name,version:p.version,...m,machineVersion:f.machineVersion,path});
 }finally{s.dispose();}}
 return freeze({scope:'custom-route',host:route.host,task:'custom-route',taskVersion:ROUTE_FORMAT,route,engineVersion:'0.20.0',results});
}
