import {validObservation,MACHINE,ENGINE,getCourse,readAction} from '../../experiments/rover3d/contract.mjs';
import {identityFor,matchesIdentity,MODEL_IDENTITY,MODEL_SHA256,MODEL_STONES} from './identity.mjs';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),counts=['modelCalls','ruleDecisions','guardDecisions'];
const keys=(v,k)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
export function validateModelSample(s){
 if(!keys(s,['frame','visual','stoneId','appliedStoneId','execution']))throw new TypeError('Malformed model sample.');
 const f=s.frame,e=s.execution,o=f?.observation;
 if(!keys(f,['engine','machineVersion','courseId','courseVersion','observation','timeSeconds','status','chassisContactStarts'])||!validObservation(o)||f.machineVersion!==MACHINE.version||!equal(f.engine,ENGINE)||getCourse(f.courseId).version!==f.courseVersion||f.timeSeconds!==o.tick*MACHINE.dt||!['running','stopped','succeeded','timed-out','out-of-bounds'].includes(f.status))throw new TypeError('Invalid model host state.');
 if(!keys(e,['selected','applied','source','guard',...counts])||!matchesIdentity(e.selected)||e.selected.id!==s.stoneId)throw new TypeError('Selected implementation identity mismatch.');
 if(s.appliedStoneId===null){if(o.tick!==0||e.applied!==null||e.source!=='none'||e.guard!==null)throw new TypeError('Invalid initial execution.');}
 else{
  if(!matchesIdentity(e.applied)||e.applied.id!==s.appliedStoneId||o.tick===0)throw new TypeError('Applied implementation identity mismatch.');
  if(e.applied.id===MODEL_IDENTITY.id){if(!['model','guard'].includes(e.source)||e.source==='model'&&e.guard!==null||e.source==='guard'&&!['airborne','goal','out-of-domain'].includes(e.guard))throw new TypeError('Incorrect learned/guard attribution.');}
  else if(e.source!=='rule'||e.guard!==null)throw new TypeError('Incorrect rule attribution.');
 }
 if(!counts.every(k=>Number.isSafeInteger(e[k])&&e[k]>=0&&e[k]<=MACHINE.maxSteps)||counts.reduce((n,k)=>n+e[k],0)!==o.tick)throw new TypeError('Execution counters disagree with physics.');
 if(!s.visual||!Array.isArray(s.visual.wheels)||s.visual.wheels.length!==4||!s.visual.wheels.every((w,i)=>equal(w.connection,MACHINE.wheels[i])&&[w.suspensionLength,w.rotation,w.steering].every(Number.isFinite)&&typeof w.contact==='boolean'))throw new TypeError('Invalid visual state.');
 return s;
}
export function validateModelBatch(r,before,n){
 validateModelSample(before);
 if(before.frame.status!=='running'||!Number.isSafeInteger(n)||n<1||n>120)throw new TypeError('Advancement requires a running session and1–120 steps.');
 if(!r||!Array.isArray(r.frames)||!Array.isArray(r.actions)||r.frames.length!==r.actions.length||Object.keys(r.frames).length!==r.frames.length||Object.keys(r.actions).length!==r.actions.length||r.frames.length>n)throw new TypeError('Invalid model batch size.');
 let prev=before;
 r.frames.forEach((s,i)=>{
  validateModelSample(s);readAction(r.actions[i]);
  if(s.frame.observation.tick!==prev.frame.observation.tick+1||s.stoneId!==before.stoneId||s.appliedStoneId!==before.stoneId||s.frame.courseId!==before.frame.courseId)throw new TypeError('Nonsequential model batch.');
  const count=s.execution.source==='model'?'modelCalls':s.execution.source==='rule'?'ruleDecisions':'guardDecisions';
  if(!counts.every(k=>s.execution[k]===prev.execution[k]+(k===count?1:0)))throw new TypeError('Incorrect per-step counters.');prev=s;
 });
 validateModelSample(r.snapshot);
 if(!r.frames.length||r.frames.length!==n&&r.snapshot.frame.status==='running')throw new TypeError('A running batch must acknowledge every requested tick.');
 if(!equal(r.snapshot,prev)||!r.metrics||!['pathMetres','throttleImpulseNs','peakSpeed','peakHeight','chassisContacts','goalDistance'].every(k=>Number.isFinite(r.metrics[k])&&r.metrics[k]>=0)||r.metrics.seconds!==prev.frame.timeSeconds||r.metrics.status!==prev.frame.status||!counts.every(k=>r.metrics[k]===prev.execution[k]))throw new TypeError('Model batch summary mismatch.');
 return r;
}

export function validateModelComparison(r,courseId){
 const course=getCourse(courseId);
 if(!keys(r,['scope','courseId','courseVersion','machineVersion','engine','modelSha256','results'])||r.scope!=='fixed-model-reference'||r.courseId!==course.id||r.courseVersion!==course.version||r.machineVersion!==MACHINE.version||!equal(r.engine,ENGINE)||r.modelSha256!==MODEL_SHA256||!Array.isArray(r.results)||r.results.length!==MODEL_STONES.length||Object.keys(r.results).length!==r.results.length)throw new TypeError('Invalid model comparison envelope.');
 const numeric=['pathMetres','throttleImpulseNs','peakSpeed','peakHeight','chassisContacts','goalDistance'];
 r.results.forEach((row,i)=>{
  const stone=MODEL_STONES[i];
  if(!keys(row,['id','name','version','machineVersion','implementation','seconds','status',...numeric,...counts,'path'])||row.id!==stone.id||row.name!==stone.name||row.version!==stone.version||row.machineVersion!==MACHINE.version||!matchesIdentity(row.implementation)||row.implementation.id!==row.id||!['succeeded','timed-out','out-of-bounds'].includes(row.status))throw new TypeError('Comparison Stone identity or status mismatch.');
  const ticks=Math.round(row.seconds/MACHINE.dt);
  if(!Number.isSafeInteger(ticks)||ticks<1||ticks>MACHINE.maxSteps||row.seconds!==ticks*MACHINE.dt||!numeric.every(k=>Number.isFinite(row[k])&&row[k]>=0)||!counts.every(k=>Number.isSafeInteger(row[k])&&row[k]>=0)||counts.reduce((n,k)=>n+row[k],0)!==ticks)throw new TypeError('Invalid comparison accounting.');
  if(row.id===MODEL_IDENTITY.id?row.ruleDecisions!==0:row.modelCalls!==0||row.guardDecisions!==0)throw new TypeError('Comparison model/rule attribution mismatch.');
  if(!Array.isArray(row.path)||row.path.length<2||row.path.length>MACHINE.maxSteps+1||Object.keys(row.path).length!==row.path.length||!row.path.every(p=>keys(p,['x','y','z'])&&[p.x,p.y,p.z].every(Number.isFinite)))throw new TypeError('Invalid measured path.');
 });
 return r;
}
