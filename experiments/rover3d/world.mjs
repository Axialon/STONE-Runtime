/** Draft adapter: real Rapier acceptance tests must pass before integration. */
import {PROFILE, ENGINE, MACHINE as M, freeze, readAction, wheelCommands, getCourse, validObservation, parseReplay} from './contract.mjs';
import {readRoute} from '../../packages/routes/contract.mjs';
const vec = v => ({x:v.x, y:v.y, z:v.z});
const quat = q => ({x:q.x, y:q.y, z:q.z, w:q.w});

export function createRoverWorld(R, courseId = 'flat-lane', routeInput = null) {
  const route=routeInput===null?null:readRoute(routeInput,'rover');
  if(route&&courseId!=='flat-lane')throw new TypeError('Custom rover routes use the flat lane only.');
  let completed=0;
  const target=()=>route?route.points[Math.min(completed,route.points.length-1)]:course.goal;
  const course = getCourse(courseId);
  const world = new R.World(M.gravity);
  world.timestep = M.dt;
  let vehicle, events;
  try {
    for (const c of course.colliders) {
      const h=c.halfExtents, p=c.position;
      world.createCollider(R.ColliderDesc.cuboid(h.x,h.y,h.z)
        .setTranslation(p.x,p.y,p.z).setRotation(c.rotation).setFriction(c.friction).setRestitution(0));
    }
    const p=course.spawn.position;
    const chassis = world.createRigidBody(R.RigidBodyDesc.dynamic()
      .setTranslation(p.x,p.y,p.z).setRotation(course.spawn.rotation).setCanSleep(false).setCcdEnabled(true));
    const h=M.chassisHalfExtents;
    const collider=world.createCollider(R.ColliderDesc.cuboid(h.x,h.y,h.z)
      .setMass(M.massKg).setFriction(0.8).setRestitution(0).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),chassis);
    events = new R.EventQueue(true);
    vehicle = world.createVehicleController(chassis);
    vehicle.indexUpAxis = M.upAxis;
    // This is the setter's published name, not a method call.
    vehicle.setIndexForwardAxis = M.forwardAxis;
    M.wheels.forEach((connection,i)=>{
      vehicle.addWheel(connection,{x:0,y:-1,z:0},{x:-1,y:0,z:0},M.suspensionRestLength,M.wheelRadius);
      vehicle.setWheelSuspensionStiffness(i,M.suspensionStiffness);
      vehicle.setWheelSuspensionCompression(i,M.suspensionCompression);
      vehicle.setWheelSuspensionRelaxation(i,M.suspensionRelaxation);
      vehicle.setWheelMaxSuspensionForce(i,M.maxSuspensionForce);
      vehicle.setWheelFrictionSlip(i,M.frictionSlip);
      vehicle.setWheelSideFrictionStiffness(i,M.sideFrictionStiffness);
    });
    let tick=0, status='running', chassisContactStarts=0, disposed=false;
    const observe=()=>freeze({profile:PROFILE,tick,position:vec(chassis.translation()),rotation:quat(chassis.rotation()),
      linearVelocity:vec(chassis.linvel()),angularVelocity:vec(chassis.angvel()),
      wheelContacts:M.wheels.map((_,i)=>vehicle.wheelIsInContact(i)===true),goal:vec(target())});
    let last=freeze({engine:{...ENGINE},machineVersion:M.version,courseId,courseVersion:course.version,
      observation:observe(),timeSeconds:0,status,chassisContactStarts,...(route?{route,targets:route.points,completed}:{} )});
    const terminal=reason=>{status=reason;last=freeze({...last,status});return last;};
    function step(value) {
      if(disposed)throw new Error('Rover is disposed.');
      if(status!=='running')return last;
      let commands;
      try { commands=wheelCommands(readAction(value)); } catch {return terminal('invalid-action');}
      try {
        commands.forEach((c,i)=>{
          vehicle.setWheelEngineForce(i,c.engineForce);
          vehicle.setWheelSteering(i,c.steeringAngle);
          vehicle.setWheelBrake(i,c.brakeImpulse);
        });
        vehicle.updateVehicle(M.dt,R.QueryFilterFlags.EXCLUDE_DYNAMIC);
        world.step(events);tick++;
        events.drainCollisionEvents((a,b,started)=>{
          if(started&&(a===collider.handle||b===collider.handle))chassisContactStarts++;
        });
        const o=observe();
        if(!validObservation(o))return terminal('engine-fault');
        const p=o.position, v=o.linearVelocity;
        if(p.y<M.minHeight||p.y>M.maxHeight||Math.hypot(p.x,p.z)>M.maxHorizontalDistance)status='out-of-bounds';
        else if(Math.hypot(p.x-target().x,p.y-target().y,p.z-target().z)<=M.goalRadius&&
          Math.hypot(v.x,v.y,v.z)<=M.goalSpeed){
          if(!route)status='succeeded';
          else{completed++;if(completed===route.points.length)status='succeeded';}
        }
        else if(tick>=M.maxSteps)status='timed-out';
        if(route&&status==='running'&&tick>=M.maxSteps)status='timed-out';
        last=freeze({...last,observation:route?observe():o,timeSeconds:tick*M.dt,status,chassisContactStarts,...(route?{completed}:{})});
        return last;
      } catch {return terminal('engine-fault');}
    }
    function dispose() {
      if(disposed)return;
      disposed=true;
      try {world.removeVehicleController(vehicle);} finally {try{events.free();}finally{world.free();}}
    }
    const visualState=()=>{if(disposed)throw new Error('Rover is disposed.');return freeze({wheels:M.wheels.map((connection,i)=>({connection:{...connection},suspensionLength:vehicle.wheelSuspensionLength(i)??M.suspensionRestLength,rotation:vehicle.wheelRotation(i)??0,steering:vehicle.wheelSteering(i)??0,contact:vehicle.wheelIsInContact(i)===true}))});};
    // Stop freezes the simulation. It is not physical braking or worker preemption.
    return Object.freeze({snapshot:()=>last,visualState,step,stop:()=>status==='running'?terminal('stopped'):last,dispose});
  } catch(error) {
    try {if(vehicle)world.removeVehicleController(vehicle);}finally{try{events?.free();}finally{world.free();}}
    throw error;
  }
}
