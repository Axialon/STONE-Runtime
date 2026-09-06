/** Draft adapter: real Rapier acceptance tests must pass before integration. */
import {PROFILE, ENGINE, MACHINE as M, freeze, readAction, wheelCommands, getCourse, validObservation, parseReplay} from './contract.mjs';
import {loadRapier} from './engine.mjs';
const vec = v => ({x:v.x, y:v.y, z:v.z});
const quat = q => ({x:q.x, y:q.y, z:q.z, w:q.w});

export async function createRover(courseId = 'flat-lane') {
  const course = getCourse(courseId), R = await loadRapier();
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
      wheelContacts:M.wheels.map((_,i)=>vehicle.wheelIsInContact(i)===true),goal:vec(course.goal)});
    let last=freeze({engine:{...ENGINE},machineVersion:M.version,courseId,courseVersion:course.version,
      observation:observe(),timeSeconds:0,status,chassisContactStarts});
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
        else if(Math.hypot(p.x-course.goal.x,p.y-course.goal.y,p.z-course.goal.z)<=M.goalRadius&&
          Math.hypot(v.x,v.y,v.z)<=M.goalSpeed)status='succeeded';
        else if(tick>=M.maxSteps)status='timed-out';
        last=freeze({...last,observation:o,timeSeconds:tick*M.dt,status,chassisContactStarts});
        return last;
      } catch {return terminal('engine-fault');}
    }
    function dispose() {
      if(disposed)return;
      disposed=true;
      try {world.removeVehicleController(vehicle);} finally {try{events.free();}finally{world.free();}}
    }
    // Stop freezes the simulation. It is not physical braking or worker preemption.
    return Object.freeze({snapshot:()=>last,step,stop:()=>status==='running'?terminal('stopped'):last,dispose});
  } catch(error) {
    try {if(vehicle)world.removeVehicleController(vehicle);}finally{try{events?.free();}finally{world.free();}}
    throw error;
  }
}

/** Actual engine replay only. A missing engine is an error, not a skipped verification. */
export async function replayRover(text) {
  const replay=parseReplay(text), host=await createRover(replay.courseId);
  try {
    const frames=[host.snapshot()];
    for(const action of replay.actions){
      if(host.snapshot().status!=='running')break;
      frames.push(host.step(action));
    }
    return freeze({frames,final:frames.at(-1)});
  } finally {host.dispose();}
}
