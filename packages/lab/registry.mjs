import {freeze} from './common.mjs';
const profiles={rover:'stone.rover.control/0.1',drone:'stone.drone.rotors/0.1',humanoid:'stone.humanoid.reach/0.1',digital:'stone.digital.benchmark/0.1'};
const entry=(host,id,name,description,execution='local')=>({
 schema:'stone.lab.passport/0.1',id:host+'.'+id,host,name,description,version:'0.1.0',profile:profiles[host],form:'digital',execution,
 availability:execution==='local'?'available':'configuration-required',implementation:execution==='local'?'rule-based':'provider-model-with-harness',model:{kind:execution==='local'?'none':'server-configured'},
 harness:host==='digital'?'Run a fixed reference benchmark; return measured results and a bounded summary.':'Validate observations; decide bounded actions; retain host authority.',
 tools:host==='digital'?['simulate-reference-task','compare-completion','format-report']:['observe-'+host,'command-'+host],
 offline:execution==='local'?'full-task':execution==='hybrid'?'local-comparison-only':'unavailable',
 limits:host==='drone'?'Simplified simulated rigid-body quadrotor and fixed waypoints. No aerodynamic calibration, obstacle avoidance or hardware connection.':host==='humanoid'?'Anchored torso and two-joint arm only; no walking, balance or grasping.':host==='rover'?'Two reference lanes; not general navigation.':'Read-only benchmark reference. Cloud adapters are fixture-tested; live provider validation is still required.'
});
export const PACKAGES=freeze([
 entry('rover','flow','FLOW / Rover','Measured acceleration and approach.'),entry('rover','dart','DART / Rover','Faster lane handling.'),entry('rover','anchor','ANCHOR / Rover','Low-speed lane handling.'),
 entry('drone','cinema','CINEMA','Moderate acceleration between fixed waypoints.'),entry('drone','survey','SURVEY','Slower waypoint approach and settling.'),entry('drone','agile','AGILE','Faster waypoint transitions.'),
 entry('humanoid','fluid','FLUID','Gradual reaching movements.'),entry('humanoid','precise','PRECISE','Slow, deliberate reaching.'),entry('humanoid','brisk','BRISK','Quicker target transitions.'),
 entry('digital','compare','BENCH','Run fixed rover, drone or humanoid reference benchmarks.'),entry('digital','brief','BRIEF','Produce an evidence-first local digest.'),
 entry('digital','analyst','ANALYST','Configured-provider report; no live provider is connected by default.','cloud'),entry('digital','hybrid','HYBRID','Local benchmark plus optional cloud report; explicit local-only fallback.','hybrid'),
 {...entry('digital','audit','AUDIT','Inspect a core manifest or verify a saved simulation.'),profile:'stone.digital.evidence/0.1',harness:'Validate bounded JSON metadata or reexecute an admitted recording in an isolated simulation.',tools:['validate-manifest','replay-reviewed-session'],limits:'Data-only inspection. Compatibility and command reexecution do not verify publisher identity, model weights or hardware safety.'}
]);
export function getPackage(id){const p=PACKAGES.find(p=>p.id===id);if(!p)throw new TypeError('Unknown Stone package.');return p;}
export function compatible(id,host,execution){try{const p=getPackage(id);return p.host===host&&p.execution===execution;}catch{return false;}}
export const packagesFor=host=>PACKAGES.filter(p=>p.host===host);
