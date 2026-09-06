import {PACKAGES} from '../packages/lab/registry.mjs';
import {benchmark,digitalBenchmark} from '../packages/lab/benchmark.mjs';
import {createCloudClient} from '../packages/lab/cloud.mjs';
import {loadRapier} from '../experiments/rover3d/engine.mjs';
const out=v=>console.log(JSON.stringify(v,null,2));
const config=()=>process.env.STONE_CLOUD_CONFIG?JSON.parse(process.env.STONE_CLOUD_CONFIG):null;
try{
 const [command,...args]=process.argv.slice(2);
 if(command==='list'&&args.length===0)out({schema:'stone.lab.catalogue/0.1',packages:PACKAGES});
 else if(command==='cloud-status'&&args.length===0)out(createCloudClient(config()).status());
 else if(command==='benchmark'&&args.length===2){
  const b=benchmark(await loadRapier(),args[0],args[1]);
  out({host:b.host,task:b.task,engine:'rapier3d-compat/0.20.0',results:b.results,recordings:b.recordings.length});
 }else if(command==='digital'&&args.length>=3){
  const [id,host,task,...flags]=args;
  if(flags.some(f=>!['--consent','--local-fallback'].includes(f))||new Set(flags).size!==flags.length)throw new Error('Invalid options.');
  const cloud=id==='digital.analyst'||id==='digital.hybrid'?createCloudClient(config()):null;
  out(await digitalBenchmark(await loadRapier(),id,host,task,{cloud,consent:flags.includes('--consent'),allowLocalFallback:flags.includes('--local-fallback')}));
 }else throw new Error('Unknown command or argument count.');
}catch{
 console.error('Command failed. Check the fixed host/task/package, dependency installation and any explicit cloud consent/configuration. No provider error body is echoed.');
 process.exitCode=2;
}
