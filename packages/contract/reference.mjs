import {TASK_PROFILES,validateManifest} from './manifest.mjs';
import {LOCAL_ARENA_HOST} from './compatibility.mjs';
import {getPackage} from '../lab/registry.mjs';
import {freeze} from '../lab/common.mjs';
import {DRONE} from '../lab/drone.mjs';
import {HUMANOID} from '../lab/humanoid.mjs';
import {MACHINE} from '../../experiments/rover3d/contract.mjs';
const specs=freeze({
 rover:{task:'rover-navigation',machineVersion:MACHINE.version,inputs:['position','rotation','linearVelocity','angularVelocity','wheelContacts','goal'],outputs:['throttle','steering','brake'],tools:['observe-rover','command-rover'],budget:20},
 drone:{task:'drone-waypoints',machineVersion:DRONE.version,inputs:['position','rotation','velocity','angularVelocity','goal','tick'],outputs:['rotorForces'],tools:['observe-drone','command-drone'],budget:20},
 humanoid:{task:'humanoid-reaching',machineVersion:HUMANOID.version,inputs:['goal','command','jointAngles','velocity'],outputs:['jointTargets'],tools:['observe-humanoid','command-humanoid'],budget:20},
 digital:{task:'digital-benchmark',machineVersion:'stone.digital.benchmark/0.1.0',inputs:['host','task'],outputs:['benchmark','summary'],tools:['simulate-reference-task','compare-completion','format-report'],budget:5000},
 audit:{task:'digital-evidence-audit',machineVersion:'stone.digital.evidence/0.1.0',inputs:['jsonText','targetHost'],outputs:['inspection'],tools:['validate-manifest','replay-reviewed-session'],budget:5000}
});
/** Trusted prototype admission declarations, not measurements or runtime quotas. */
export function hostFor(family){
 if(family==='arena')return LOCAL_ARENA_HOST;
 if(!Object.hasOwn(specs,family))throw new TypeError('Unknown reference host.');
 const s=specs[family];return freeze({profile:TASK_PROFILES[s.task],machineVersion:s.machineVersion,engineVersion:'rapier3d-compat/0.20.0',inputs:s.inputs,outputs:s.outputs,forms:['digital'],modes:['local'],networkOrigins:[],tools:s.tools,storage:['none','session'],states:['ephemeral'],costKinds:['none'],maxMemoryMiB:256,maxDecisionBudgetMs:s.budget});
}
export function hostForProfile(profile){
 if(profile===LOCAL_ARENA_HOST.profile)return hostFor('arena');
 const family=Object.keys(specs).find(k=>TASK_PROFILES[specs[k].task]===profile);
 if(!family)throw new TypeError('Unknown reference profile.');return hostFor(family);
}
/** Export the actual reviewed local reference declaration; never invent a configured model. */
export function manifestFor(id){
 const p=getPackage(id);
 if(p.execution!=='local'||p.availability!=='available')throw new Error('Provider/model configuration is required before exporting a complete remote manifest.');
 const family=id==='digital.audit'?'audit':p.host,s=specs[family],h=hostFor(family);
 const m={schemaVersion:'0.2.0',id:p.id,name:p.name,version:p.version,publisher:'Axialon',license:'UNLICENSED',task:s.task,style:p.description,form:p.form,
  implementation:{kind:'rule-based',modelRef:null},compatibility:{profile:h.profile,machineVersion:h.machineVersion,engineVersion:h.engineVersion,inputs:h.inputs,outputs:h.outputs},
  resources:{memoryMiB:64,decisionBudgetMs:s.budget},
  execution:{mode:'local',offlineBehavior:'full',offlineDetails:'After the pinned runtime is installed, this reference needs no network. Budgets are requested prototype admission limits, not measured or enforced resource use.',localCapabilities:[s.task],remoteCapabilities:[],dataEgress:[]},
  permissions:{networkOrigins:[],tools:s.tools,storage:'session'},cost:{kind:'none',payer:'none',details:'No inference service charge for this built-in local reference; local hardware costs are not evaluated.'},
  lifecycle:{state:'ephemeral',updates:'pinned'},evidence:{status:'prototype',summary:p.limits,references:['docs/CORE_MANIFEST.md']}};
 const r=validateManifest(m);if(!r.valid)throw new Error('Built-in declaration failed validation.');return freeze(m);
}
