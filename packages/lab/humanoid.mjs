import {DT,LIMIT,freeze,v,add,sub,rotate,length,clamp,pose,boundedArray,finitePose,vector} from './common.mjs';
import {getPackage} from './registry.mjs';
export const HUMANOID=freeze({profile:'stone.humanoid.reach/0.1',version:'stone.humanoid.arm/0.1.0',dt:DT,upper:.34,forearm:.31,shoulder:v(.32,1.5,0),maxSteps:LIMIT});
const H=HUMANOID,angle=b=>2*Math.atan2(b.rotation().x,b.rotation().w);
export function createHumanoid(R,task='reach'){
 if(!['reach','high-reach'].includes(task))throw new TypeError('Unknown humanoid task.');
 const targets=freeze(task==='reach'?[v(.32,1.15,.45),v(.32,1.45,.5),v(.32,1.65,.35)]:[v(.32,1.4,.35),v(.32,1.7,.35),v(.32,1.6,.5)]);
 const world=new R.World(v(0,-9.81,0));world.timestep=DT;
 const fixed=world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(H.shoulder.x,H.shoulder.y,H.shoulder.z));
 const upper=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.32,1.5-H.upper/2,0).setCanSleep(false).setAdditionalSolverIterations(4));
 const lower=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.32,1.5-H.upper-H.forearm/2,0).setCanSleep(false).setAdditionalSolverIterations(4));
 world.createCollider(R.ColliderDesc.cuboid(.045,H.upper/2,.045).setMass(1.2),upper);
 world.createCollider(R.ColliderDesc.cuboid(.035,H.forearm/2,.035).setMass(.8),lower);
 const shoulder=world.createImpulseJoint(R.JointData.revolute(v(),v(0,H.upper/2,0),v(1,0,0)),fixed,upper,true);
 const elbow=world.createImpulseJoint(R.JointData.revolute(v(0,-H.upper/2,0),v(0,H.forearm/2,0),v(1,0,0)),upper,lower,true);
 shoulder.configureMotorModel(R.MotorModel.ForceBased);elbow.configureMotorModel(R.MotorModel.ForceBased);
 shoulder.setLimits(-2.7,.4);elbow.setLimits(-2.8,.05);shoulder.setContactsEnabled(false);elbow.setContactsEnabled(false);
 let tick=0,status='running',completed=0,hold=0,disposed=false,command=[0,0],travel=0,lastTip=v(.32,1.5-H.upper-H.forearm,0);
 const observe=()=>{const tip=add(lower.translation(),rotate(lower.rotation(),v(0,-H.forearm/2,0)));return freeze({host:'humanoid',profile:H.profile,machineVersion:H.version,task,taskVersion:'0.1.0',anchored:true,tick,seconds:tick*DT,status,segments:[pose(upper),pose(lower)],tip,velocity:{...lower.velocityAtPoint(tip)},jointAngles:[angle(upper),angle(lower)-angle(upper)],command:command.slice(),goal:targets[Math.min(completed,targets.length-1)],targets,completed,hold,travelMetres:travel});};
 let last=observe();const end=reason=>{status=reason;last=freeze({...last,status});return last;};
 function step(a){if(disposed)throw new Error('Humanoid is disposed.');if(status!=='running')return last;
 if(!boundedArray(a,2,-2.7,.4)||a[1]>0)return end('invalid-action');
 command=a.map((n,i)=>command[i]+clamp(n-command[i],-4*DT,4*DT));
 shoulder.configureMotorPosition(command[0],200,20);elbow.configureMotorPosition(command[1],200,20);
 world.step();tick++;let s=observe();if(!s.segments.every(finitePose)||!vector(s.tip)||!vector(s.velocity))return end('engine-fault');
 travel+=length(sub(s.tip,lastTip));lastTip=s.tip;
 if(length(sub(s.tip,targets[completed]))<.04&&length(s.velocity)<.12)hold++;else hold=0;
 if(hold>=48){completed++;hold=0;if(completed===targets.length)status='succeeded';}
 if(tick>=LIMIT&&status==='running')status='timed-out';last=observe();return last;
 }
 return Object.freeze({read:()=>last,step,stop:()=>status==='running'?end('stopped'):last,dispose(){if(!disposed){disposed=true;world.free();}}});
}

const rates={'humanoid.fluid':1.2,'humanoid.precise':.65,'humanoid.brisk':2.5};
export function humanoidDecision(id,o){
 const p=getPackage(id),rate=rates[id];if(p.host!=='humanoid'||!rate||!o||o.profile!==H.profile||o.machineVersion!==H.version||!vector(o.goal)||!boundedArray(o.command,2,-2.7,.4))throw new TypeError('Incompatible humanoid observation or Stone.');
 if(Math.abs(o.goal.x-H.shoulder.x)>1e-6)throw new TypeError('Target is outside the supported plane.');
 const down=H.shoulder.y-o.goal.y,z=o.goal.z-H.shoulder.z,r=Math.hypot(down,z);
 if(r>H.upper+H.forearm||r<Math.abs(H.upper-H.forearm))throw new TypeError('Unreachable target.');
 const bend=Math.acos(clamp((r*r-H.upper*H.upper-H.forearm*H.forearm)/(2*H.upper*H.forearm),-1,1));
 const a=-(Math.atan2(z,down)-Math.atan2(H.forearm*Math.sin(bend),H.upper+H.forearm*Math.cos(bend)));
 return freeze([clamp(a,-2.7,.4),-bend].map((target,i)=>o.command[i]+clamp(target-o.command[i],-rate*DT,rate*DT)));
}
