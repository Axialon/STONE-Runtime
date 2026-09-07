import {DT,LIMIT,freeze,v,add,sub,mul,dot,cross,length,limit,rotate,clamp,boundedArray,vector,fields} from './common.mjs';
import {getPackage} from './registry.mjs';
import {readRoute,ROUTE_FORMAT} from '../routes/contract.mjs';
/** Toy six-degree-of-freedom simulator only. No hardware, radio or network interface. */
export const DRONE=freeze({profile:'stone.drone.rotors/0.1',version:'stone.drone.machine/0.1.0',dt:DT,maxSteps:LIMIT,massKg:1.4,maxRotorForce:9,arm:.23,yawMomentPerNewton:.025,
 rotors:[{x:.23,y:0,z:.23,spin:1},{x:-.23,y:0,z:.23,spin:-1},{x:-.23,y:0,z:-.23,spin:1},{x:.23,y:0,z:-.23,spin:-1}]});
const D=DRONE;
export function createDrone(R,task='hover',routeInput=null){
 const route=routeInput===null?null:readRoute(routeInput,'drone');
 if(Boolean(route)!==(task==='custom-route'))throw new TypeError('Custom task and route must be supplied together.');
 if(!R||typeof R.version!=='function'||R.version()!=='0.20.0')throw new TypeError('Engine version mismatch.');
 if(!route&&!['hover','inspection'].includes(task))throw new TypeError('Unknown drone task.');
 const targets=route?route.points:freeze(task==='hover'?[v(0,2,0)]:[v(0,1.8,0),v(1.2,1.8,0),v(1.2,2.4,1),v(0,1.8,0)]);
 const world=new R.World(v(0,-9.81,0));world.timestep=DT;
 let body,disposed=false;
 try{
  world.createCollider(R.ColliderDesc.cuboid(6,.05,6).setTranslation(0,-.05,0).setFriction(.8));
  body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1.2,0).setCanSleep(false).setCcdEnabled(true).setLinearDamping(.15).setAngularDamping(.2));
  world.createCollider(R.ColliderDesc.cuboid(.22,.07,.22).setMass(D.massKg).setRestitution(0),body);
 }catch(e){world.free();throw e;}
 let tick=0,status='running',completed=0,hold=0,rotors=[0,0,0,0],travel=0,impulse=0,lastPosition=v(0,1.2,0);
 const observe=()=>freeze({host:'drone',profile:D.profile,machineVersion:D.version,engineVersion:'0.20.0',task,taskVersion:route?ROUTE_FORMAT:'0.1.0',...(route?{route}:{}),tick,seconds:tick*DT,status,position:{...body.translation()},rotation:{...body.rotation()},velocity:{...body.linvel()},angularVelocity:{...body.angvel()},rotors:rotors.slice(),targets,goal:targets[Math.min(completed,targets.length-1)],completed,hold,travelMetres:travel,thrustImpulseNs:impulse});
 let last=observe();
 const end=reason=>{status=reason;last=freeze({...last,status});return last;};
 function step(input){
  if(disposed)throw new Error('Drone is disposed.');if(status!=='running')return last;
  if(!boundedArray(input,4,0,1))return end('invalid-action');
  rotors=input.slice();body.resetForces(true);body.resetTorques(true);
  const q=body.rotation(),pos=body.translation(),up=rotate(q,v(0,1,0));
  try{
   D.rotors.forEach((p,i)=>{const force=rotors[i]*D.maxRotorForce;body.addForceAtPoint(mul(up,force),add(pos,rotate(q,v(p.x,p.y,p.z))),true);body.addTorque(mul(up,p.spin*force*D.yawMomentPerNewton),true);impulse+=force*DT;});
   world.step();tick++;
   const s=observe();if(!vector(s.position)||!vector(s.velocity)||!vector(s.angularVelocity)||!Object.values(s.rotation).every(Number.isFinite))return end('engine-fault');
   travel+=length(sub(s.position,lastPosition));lastPosition=s.position;
   if(s.position.y<.085||s.position.y>7||Math.hypot(s.position.x,s.position.z)>5)status='out-of-bounds';
   if(status==='running'){
    if(length(sub(s.position,targets[completed]))<.18&&length(s.velocity)<.24)hold++;else hold=0;
    if(hold>=36){hold=0;completed++;if(completed===targets.length)status='succeeded';}
    if(tick>=LIMIT&&status==='running')status='timed-out';
   }
   last=observe();return last;
  }catch{return end('engine-fault');}
 }
 return Object.freeze({read:()=>last,step,stop:()=>status==='running'?end('stopped'):last,dispose(){if(!disposed){disposed=true;world.free();}}});
}
const tuning=freeze({'drone.cinema':{speed:1.15,acceleration:1.5},'drone.survey':{speed:.65,acceleration:1},'drone.agile':{speed:1.9,acceleration:3}});
const unit=a=>mul(a,1/(length(a)||1));
export function droneDecision(id,o){
 const p=getPackage(id),style=tuning[id];
 if(p.host!=='drone'||!style||!o||o.profile!==D.profile||o.machineVersion!==D.version||!vector(o.position)||!vector(o.velocity)||!vector(o.angularVelocity)||!vector(o.goal)||!fields(o.rotation,['x','y','z','w'])||!Object.values(o.rotation).every(Number.isFinite))throw new TypeError('Incompatible drone observation.');
 if(!Number.isSafeInteger(o.tick)||o.tick<0||o.tick>D.maxSteps||length(o.position)>100||length(o.velocity)>1000||length(o.angularVelocity)>1000||length(o.goal)>10)throw new TypeError('Observation is outside this reference domain.');
 const q=o.rotation;if(Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)>.002)throw new TypeError('Invalid orientation.');
 const wantedVelocity=limit(mul(sub(o.goal,o.position),1.4),style.speed);
 const acceleration=limit(mul(sub(wantedVelocity,o.velocity),2.4),style.acceleration);
 const desiredForce=add(acceleration,v(0,9.81,0));
 const up=rotate(q,v(0,1,0)),right=rotate(q,v(1,0,0)),forward=rotate(q,v(0,0,1));
 const desiredUp=unit(desiredForce),desiredRight=unit(cross(desiredUp,v(0,0,1))),desiredForward=cross(desiredRight,desiredUp);
 const orientationError=mul(add(add(cross(right,desiredRight),cross(up,desiredUp)),cross(forward,desiredForward)),.5);
 const worldTorque=limit(sub(mul(orientationError,1.2),mul(o.angularVelocity,.22)),.8);
 const torque=rotate({x:-q.x,y:-q.y,z:-q.z,w:q.w},worldTorque);
 const total=clamp(D.massKg*dot(desiredForce,up),0,4*D.maxRotorForce);
 return freeze(D.rotors.map(p=>clamp((total/4-p.z*torque.x/(4*D.arm*D.arm)+p.x*torque.z/(4*D.arm*D.arm)+p.spin*torque.y/(4*D.yawMomentPerNewton))/D.maxRotorForce,0,1)));
}
