import {readStonePackage,packageHash,PACKAGE_FORMAT} from '../contract/stone-package.mjs';
export const RUNTIME=Object.freeze({adapter:'stone.data-quality/0.1',harnessVersion:'stone.data-quality/0.1.0',artifactId:'config'});
export const PROFILE='stone.digital.data-quality/0.1';
export const CHECKS=Object.freeze(['missing','ragged','headers','whitespace','duplicates','mixed','formula']);
export const PRESETS=Object.freeze({LENS:Object.freeze({version:'0.1.0',checks:CHECKS,trimStrings:false,omitEmptyRows:false}),TIDY:Object.freeze({version:'0.1.0',checks:CHECKS,trimStrings:true,omitEmptyRows:true})});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===list.length&&list.every(k=>Object.hasOwn(v,k));
export function validateConfig(c){
 if(!keys(c,['version','checks','trimStrings','omitEmptyRows'])||c.version!=='0.1.0'||!Array.isArray(c.checks)||!c.checks.length||c.checks.length>CHECKS.length||new Set(c.checks).size!==c.checks.length||c.checks.some(x=>!CHECKS.includes(x))||typeof c.trimStrings!=='boolean'||typeof c.omitEmptyRows!=='boolean'||c.omitEmptyRows&&!c.trimStrings)throw new TypeError('Unsupported declarative data configuration. Only listed checks, trimStrings and omitEmptyRows are available; omission requires trimming.');
 return c;
}
export function dataManifest(name){return {
 schemaVersion:'0.2.0',id:name==='LENS'?'digital.data-lens':name==='TIDY'?'digital.data-tidy':'digital.data-quality',name,version:'0.1.0',publisher:'Axialon',license:'UNLICENSED',task:'digital-data-quality',style:'Inspect a local table; optionally propose reversible normalization.',form:'digital',
 implementation:{kind:'rule-based',modelRef:null},compatibility:{profile:PROFILE,machineVersion:'stone.data-table/0.1.0',engineVersion:'papaparse/5.5.3',inputs:['utf8-table','data-config'],outputs:['quality-report','normalization-proposal']},
 resources:{memoryMiB:64,decisionBudgetMs:10000},execution:{mode:'local',offlineBehavior:'full',offlineDetails:'Preinstalled deterministic adapter. Declared budgets are metadata, not sandbox certification.',localCapabilities:['digital-data-quality'],remoteCapabilities:[],dataEgress:[]},
 permissions:{networkOrigins:[],tools:['inspect-table','propose-normalization'],storage:'none'},cost:{kind:'none',payer:'none',details:'No model or service call.'},lifecycle:{state:'ephemeral',updates:'pinned'},evidence:{status:'prototype',summary:'Declarations are unverified. Shape checks are not semantic truth judgments.',references:['docs/DATA_STONES.md']}
};}
export async function createDataPackage(name,config=PRESETS[name],declarations=null){
 if(declarations!==null&&(!keys(declarations,['id','publisher'])||typeof declarations.id!=='string'||typeof declarations.publisher!=='string'))throw new TypeError('Only declared ID and publisher may be authored.');
 validateConfig(config);const text=JSON.stringify(config),bytes=new TextEncoder().encode(text);
 const p={format:PACKAGE_FORMAT,manifest:{...dataManifest(name),...(declarations??{})},runtime:RUNTIME,artifacts:[{id:'config',mediaType:'application/json',bytes:bytes.length,sha256:await packageHash(bytes),text}]};
 const r=await readDataPackage(JSON.stringify(p));if(!r.compatibility.compatible)throw new TypeError('Invalid built-in data package.');return p;
}
/** This is admission to one preinstalled adapter, never a code installer. */
export async function readDataPackage(text,target='auto'){
 const parsed=await readStonePackage(text),p=parsed.package,m=p.manifest,expected=dataManifest('reference'),errors=[];
 const fail=(path,message)=>errors.push({path,code:'unavailable',message});
 if(!['auto','data','digital'].includes(target))fail('$target','Selected target does not admit data tables.');
 if(!keys(p.runtime,Object.keys(RUNTIME))||Object.keys(RUNTIME).some(k=>p.runtime[k]!==RUNTIME[k]))fail('$.runtime','Unknown adapter or harness.');
 for(const k of ['schemaVersion','version','task','form','implementation','compatibility','execution','permissions','cost','lifecycle']){
  // Object member order is irrelevant; compare JSON data structurally.
  const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  if(!equal(stable(m[k]),stable(expected[k])))fail('$.manifest.'+k,'Operating requirements differ from this preinstalled adapter.');
 }
 if(m.resources.memoryMiB>64||m.resources.decisionBudgetMs>10000)fail('$.manifest.resources','Declared resource budget exceeds admission bounds.');
 let config=null;
 if(p.artifacts.length!==1||p.artifacts[0].id!=='config')fail('$.artifacts','Exactly one config artifact is admitted.');
 else try{config=validateConfig(JSON.parse(p.artifacts[0].text));}catch(e){fail('$.artifacts',e.message);}
 return {...parsed,config,compatibility:{compatible:errors.length===0,errors}};
}
export async function inspectDataPackage(text,target='auto'){
 const r=await readDataPackage(text,target),m=r.package.manifest;
 return {format:'stone.inspection/0.1',stone:'digital.audit',version:'0.1.0',execution:'local',actualExecution:'local',model:null,source:r.source,authenticity:'not-verified',installation:'not-performed',kind:'package',valid:true,verification:'package-artifact-integrity',compatibility:r.compatibility,errors:r.compatibility.errors,results:[],
 summary:{id:m.id,declaredName:m.name,declaredPublisher:m.publisher,declaredLicense:m.license,declaredEvidence:m.evidence,requirements:{runtime:r.package.runtime,compatibility:m.compatibility,resources:m.resources,permissions:m.permissions},artifactSha256:r.artifacts[0].sha256,config:r.config},
 text:'Data Stone artifact integrity checked. '+(r.compatibility.compatible?'Admitted by the preinstalled data adapter.':'Not admitted by this runtime.')+' No dataset parsed, model loaded or simulation run. Publisher and evidence remain unverified declarations; resource budgets are metadata.'};
}
