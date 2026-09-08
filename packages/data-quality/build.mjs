import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),dir=new URL('./',import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function reviewInputs(){
 const lockBytes=await readFile(new URL('package-lock.json',dir)),lock=JSON.parse(lockBytes),pkg=JSON.parse(await readFile(new URL('package.json',dir))),installed=JSON.parse(await readFile(new URL('node_modules/papaparse/package.json',dir)));
 const dep=lock.packages?.['node_modules/papaparse'];
 if(hash(lockBytes)!=='b42fd99517d389aa88c7fc8c2153b7d18858fc0aeb9f3f5374a691c0837b3076'||lock.lockfileVersion!==3||Object.keys(lock.packages).length!==2||JSON.stringify(pkg.dependencies)!=='{"papaparse":"5.5.3"}'||dep?.version!=='5.5.3'||dep.integrity!=='sha512-5QvjGxYVjxO59MGU2lHVYpRWBBtKHnlIAcSe1uNFCkkptUh63NFRj0FJQm7nR67puEruUci/ZkjmEFrjCAyP4A=='||dep.license!=='MIT'||dep.hasInstallScript||installed.main!=='papaparse.js'||installed.browser!=='papaparse.min.js'||installed.version!=='5.5.3'||installed.license!=='MIT'||['preinstall','install','postinstall'].some(k=>installed.scripts?.[k]))throw new Error('Data dependency differs from the approved lock/runtime.');
 const files=['packages/contract/manifest.mjs','packages/contract/stone-package.mjs','packages/data-quality/adapter.mjs','packages/data-quality/package.mjs','packages/data-quality/node_modules/papaparse/papaparse.min.js'];
 const sources={};for(const f of files.sort()){const absolute=resolve(root,f);if(await realpath(absolute)!==absolute)throw new Error('Linked source rejected.');sources[f]=hash(await readFile(absolute));}
 const nodePath='packages/data-quality/node_modules/papaparse/papaparse.js',nodeAbsolute=resolve(root,nodePath);if(await realpath(nodeAbsolute)!==nodeAbsolute)throw new Error('Linked Node parser rejected.');
 const reviewedSources={...sources,[nodePath]:hash(await readFile(nodeAbsolute))};
 if(reviewedSources[nodePath]!=='10778b8bb3e20177c52febb99e18ec53fd97ce447f4716ca10e00bae18a98594'||sources['packages/data-quality/node_modules/papaparse/papaparse.min.js']!=='3553fb8bdf5b8004ce5531e6827e81c8b34e7b3992677967754544064e97b016')throw new Error('Installed Papa Parse source differs from reviewed bytes.');
 const builder=JSON.parse(await readFile(resolve(root,'tools/model-bundle/node_modules/esbuild-wasm/package.json'))),builderLock=await readFile(resolve(root,'tools/model-bundle/package-lock.json'));if(builder.version!=='0.28.2'||hash(builderLock)!=='f74bb93890a4221bae626305ed490ae6b52764bec0801358600e98face1e1327')throw new Error('Unreviewed build tool.');
 return {format:'stone.local-data-bundle/0.1',builder:'esbuild-wasm/0.28.2',dependency:{name:'papaparse',version:dep.version,license:dep.license,integrity:dep.integrity,browserEntry:installed.browser,nodeEntry:installed.main},reviewedSources,locks:{data:hash(lockBytes),builder:hash(builderLock)},sources,sourceSha256:hash(JSON.stringify(sources))};
}
export async function buildDataBundle(){
 const metadata=await reviewInputs(),esbuild=await import('../../tools/model-bundle/node_modules/esbuild-wasm/lib/main.js');let output;
 try{output=await esbuild.build({absWorkingDir:root,entryPoints:['packages/data-quality/adapter.mjs'],bundle:true,platform:'browser',format:'esm',target:'es2022',mainFields:['browser','module','main'],treeShaking:true,minify:false,legalComments:'inline',charset:'utf8',write:false,metafile:true,logLevel:'silent',define:{__DATA_SOURCE_SHA256__:JSON.stringify(metadata.sourceSha256)}});}finally{esbuild.stop();}
 const actual=Object.keys(output.metafile.inputs).sort();if(JSON.stringify(actual)!==JSON.stringify(Object.keys(metadata.sources).sort()))throw new Error('Bundle input closure changed; review required.');
 const code=output.outputFiles[0].text,notices='Original STONE code remains UNLICENSED.\n\nPapa Parse 5.5.3 (MIT)\n'+await readFile(new URL('node_modules/papaparse/LICENSE',dir),'utf8');
 return {'data-quality.mjs':code,'metadata.json':JSON.stringify({...metadata,bundleSha256:hash(code),noticesSha256:hash(notices)},null,2)+'\n','THIRD_PARTY_NOTICES.txt':notices};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{if(process.argv.length>3||process.argv[2]&&!['--check','--review'].includes(process.argv[2]))throw new Error('Usage: build.mjs [--check|--review]');
 if(process.argv[2]==='--review')console.log(JSON.stringify(await reviewInputs(),null,2));
 else{const files=await buildDataBundle(),dist=new URL('dist/',dir);if(process.argv[2]!=='--check')await mkdir(dist,{recursive:true});for(const [name,text] of Object.entries(files)){if(process.argv[2]==='--check'){if(await readFile(new URL(name,dist),'utf8')!==text)throw new Error('Generated data bundle differs: '+name);}else await writeFile(new URL(name,dist),text);}console.log('Data bundle '+(process.argv[2]==='--check'?'verified':'built')+' from pinned local sources.');}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
