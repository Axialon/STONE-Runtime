import {PACKAGE_FORMAT,readStonePackage,packageHash,MAX_ARTIFACT_BYTES} from '../contract/stone-package.mjs';
import {checkCompatibility} from '../contract/compatibility.mjs';import {hostFor} from '../contract/reference.mjs';
import {MODEL_SHA256,MODEL_IDENTITY} from './identity.mjs';import {learnedManifest} from './manifest.mjs';
import {freeze} from '../../experiments/rover3d/contract.mjs';
export const PACKAGE_RUNTIME=freeze({adapter:'stone.rover.cart/0.1',harnessVersion:MODEL_IDENTITY.harnessVersion,artifactId:'policy'});
const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
const equal=(a,b)=>stable(a)===stable(b);
export async function createModelPackage(modelText){
 if(typeof modelText!=='string'||modelText.length>MAX_ARTIFACT_BYTES)throw new TypeError('Expected bounded model text.');
 const bytes=new TextEncoder().encode(modelText),sha256=await packageHash(bytes);
 if(sha256!==MODEL_SHA256)throw new TypeError('Only the reviewed model can be packaged by this runtime.');
 const p={format:PACKAGE_FORMAT,manifest:learnedManifest,runtime:PACKAGE_RUNTIME,artifacts:[{id:'policy',mediaType:'application/json',bytes:bytes.length,sha256,text:modelText}]};
 await readStonePackage(JSON.stringify(p));return freeze(p);
}
/** Admission matches reviewed operating metadata and model bytes, not the claimed publisher. */
export async function readModelPackage(text,target='rover'){
 const parsed=await readStonePackage(text),p=parsed.package,m=p.manifest;
 const policy=hostFor(target==='auto'?'rover':target),base=checkCompatibility(m,policy),errors=[...base.errors];
 const fail=message=>errors.push({path:'$package',code:'unavailable',message});
 if(!equal(p.runtime,PACKAGE_RUNTIME))fail('This runtime adapter or harness is not admitted.');
 const operational=['schemaVersion','id','version','publisher','license','task','form','implementation','compatibility','resources','execution','permissions','cost','lifecycle'];
 if(!operational.every(k=>equal(m[k],learnedManifest[k])))fail('Package operating metadata differs from the reviewed local reference.');
 const a=p.artifacts.find(x=>x.id===p.runtime.artifactId),knownArtifact=p.artifacts.length===1&&a?.sha256===MODEL_SHA256;
 if(!knownArtifact)fail('Model bytes are not an admitted artifact.');
 return freeze({...parsed,compatibility:{compatible:errors.length===0,errors},knownArtifact,modelText:knownArtifact?a.text:null});
}
export async function inspectModelPackage(text,target='auto'){
 const r=await readModelPackage(text,target),m=r.package.manifest;
 return freeze({format:'stone.inspection/0.1',stone:'digital.audit',version:'0.1.0',execution:'local',actualExecution:'local',model:null,
  source:r.source,authenticity:'not-verified',installation:'not-performed',kind:'package',valid:true,verification:'package-artifact-integrity',compatibility:r.compatibility,errors:[],results:[],
  summary:{id:m.id,declaredName:m.name,declaredPublisher:m.publisher,declaredLicense:m.license,declaredEvidence:m.evidence,requirements:{runtime:r.package.runtime,compatibility:m.compatibility,resources:m.resources,execution:m.execution,permissions:m.permissions,lifecycle:m.lifecycle},requestedAdapter:r.package.runtime.adapter,artifactCount:r.artifacts.length,artifactSha256:r.artifacts.find(x=>x.id===r.package.runtime.artifactId)?.sha256,knownArtifact:r.knownArtifact,checkedHost:target},
  text:'Stone file data and artifact checksums are consistent. '+(r.compatibility.compatible?'Matches the reviewed local model and operating requirements.':'Not admitted by this selected runtime.')+' No model was invoked or installed. Publisher, licence and evidence statements in the file are declarations, not authenticated claims.'});
}
