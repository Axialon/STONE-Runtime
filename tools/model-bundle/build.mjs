import * as esbuild from 'esbuild-wasm';
import {readFile,mkdir,writeFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';import {resolve,dirname,relative} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),dist=resolve(root,'tools/model-bundle/dist');
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function buildBundle(){
 const tool=JSON.parse(await readFile(new URL('./node_modules/esbuild-wasm/package.json',import.meta.url),'utf8'));
 if(tool.version!=='0.28.2'||esbuild.version!=='0.28.2')throw new Error('Unreviewed builder version.');
 const model=await readFile(resolve(root,'experiments/learned-flow/model/model.json'));
 const modelSha256=hash(model);if(modelSha256!=='d9a1ef32fa555b5f9d8fdd326a90b59f8c03228b3854564d99bed708d0a210c2')throw new Error('Frozen model changed.');
 let result;
 try{result=await esbuild.build({absWorkingDir:root,entryPoints:['experiments/learned-flow/live-entry.mjs'],bundle:true,platform:'browser',format:'esm',target:'es2022',mainFields:['main'],treeShaking:true,minify:false,legalComments:'inline',charset:'utf8',outfile:'tools/model-bundle/dist/learned.mjs',metafile:true,write:false,logLevel:'silent'});}finally{esbuild.stop();}
 const sources={},packages=new Map();
 for(const path of Object.keys(result.metafile.inputs).sort()){
  if(path.startsWith('/')||path.split('/').includes('..'))throw new Error('Build escaped reviewed source.');
  const absolute=resolve(root,path);if(await realpath(absolute)!==absolute)throw new Error('Linked build input rejected.');
  sources[path]=hash(await readFile(absolute));
  if(path.includes('/node_modules/')){
   let dir=dirname(absolute),pkg=null;
   while(dir.startsWith(root)){try{pkg=JSON.parse(await readFile(resolve(dir,'package.json'),'utf8'));break;}catch(e){if(e.code!=='ENOENT')throw e;dir=dirname(dir);}}
   if(!pkg||pkg.license!=='MIT')throw new Error('Unexpected bundled package licence.');
   packages.set(dir,pkg);
  }
 }
 let notices='Generated local STONE inference bundle. Original STONE code remains UNLICENSED.\n\n';
 const dependencyVersions=[];
 for(const [dir,pkg] of [...packages.entries()].sort()){
  let license;
  for(const name of ['LICENSE','LICENSE.md','LICENSE.txt','LICENSE-MIT','LICENSE-MIT.txt']){try{license=await readFile(resolve(dir,name),'utf8');break;}catch(e){if(e.code!=='ENOENT')throw e;}}
  if(!license)throw new Error('Missing upstream licence text for '+pkg.name);
  notices+='=== '+pkg.name+' '+pkg.version+' ===\n'+license+'\n';dependencyVersions.push({name:pkg.name,version:pkg.version,license:pkg.license});
 }
 const code=result.outputFiles.find(x=>x.path.endsWith('/learned.mjs')).text;
 const metadata={format:'stone.local-model-bundle/0.1',builder:'esbuild-wasm/0.28.2',modelSha256,bundleSha256:hash(code),noticesSha256:hash(notices),sources,dependencies:dependencyVersions,
  locks:{model:hash(await readFile(resolve(root,'experiments/learned-flow/package-lock.json'))),builder:hash(await readFile(new URL('./package-lock.json',import.meta.url)))}};
 return {code,notices,metadata};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length>3||process.argv[2]&&!['--check'].includes(process.argv[2]))throw new Error('Usage: node tools/model-bundle/build.mjs [--check]');
  const value=await buildBundle(),files={'learned.mjs':value.code,'THIRD_PARTY_NOTICES.txt':value.notices,'metadata.json':JSON.stringify(value.metadata,null,2)+'\n'};
  if(process.argv[2]==='--check'){for(const [name,text] of Object.entries(files))if(await readFile(resolve(dist,name),'utf8')!==text)throw new Error('Bundle differs: '+name);}
  else{await mkdir(dist,{recursive:true});for(const [name,text] of Object.entries(files))await writeFile(resolve(dist,name),text);}
  console.log(JSON.stringify({mode:process.argv[2]??'build',bytes:Buffer.byteLength(value.code),sha256:value.metadata.bundleSha256,sources:Object.keys(value.metadata.sources).length}));
 }catch(e){console.error('Model bundle: '+e.message);process.exitCode=1;}
}
