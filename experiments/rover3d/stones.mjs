/** First-party rover rules. Pure decisions, no physics mutation or privileged inputs. */
import {PROFILE,MACHINE,freeze,validObservation,readAction} from './contract.mjs';
const definition=(id,name,description,cruise,drive,slowing)=>freeze({
  id,name,description,version:'0.1.0',implementation:'rule-based',execution:'local',
  compatibility:{profile:PROFILE,machineVersion:MACHINE.version,execution:'local',actions:['throttle','steering','brake']},
  requirements:{network:false,permissions:['observe-rover','command-rover']},
  limits:'Prototype lane handling; not obstacle avoidance, trained intelligence or hardware calibration.',
  tuning:{cruise,drive,slowing}
});
export const STONES=freeze([
  definition('rover.flow','FLOW / Rover','Measured acceleration. Smooth approach.',2.2,0.48,1.4),
  definition('rover.dart','DART / Rover','Decisive acceleration. Late, stronger braking.',3.6,0.9,2.2),
  definition('rover.anchor','ANCHOR / Rover','Low-speed composure. Early deceleration.',1.3,0.55,0.9)
]);
export function getStone(id){const s=STONES.find(x=>x.id===id);if(!s)throw new TypeError('Unknown rover Stone.');return s;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function decide(id,o){
  const s=getStone(id);if(!validObservation(o))throw new TypeError('Invalid rover observation.');
  const p=o.position,q=o.rotation,v=o.linearVelocity,g=o.goal;
  const dx=g.x-p.x,dz=g.z-p.z,distance=Math.hypot(dx,dz);
  const fx=2*(q.x*q.z+q.w*q.y),fz=1-2*(q.x*q.x+q.y*q.y),fy=2*(q.y*q.z-q.w*q.x);
  const heading=Math.atan2(fx,fz),bearing=Math.atan2(dx,dz);
  const error=Math.atan2(Math.sin(bearing-heading),Math.cos(bearing-heading));
  const speed=v.x*fx+v.y*fy+v.z*fz;
  const steering=clamp(error*1.6-o.angularVelocity.y*0.35,-1,1);
  if(o.wheelContacts.filter(Boolean).length<2)return readAction({throttle:0,steering:0,brake:0.4});
  if(distance<0.55)return readAction({throttle:0,steering:0,brake:1});
  const target=Math.min(s.tuning.cruise,Math.sqrt(2*s.tuning.slowing*Math.max(0,distance-0.45)))*Math.max(0.25,Math.cos(error));
  const demand=(target-speed)*0.7+fy*9.81/4;
  return readAction({throttle:clamp(demand,0,s.tuning.drive),steering,brake:clamp(-demand*0.55,0,1)});
}
