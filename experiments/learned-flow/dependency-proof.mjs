import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {release,endianness} from 'node:os';
import {PROFILE,MACHINE} from '../rover3d/contract.mjs';
/** Inventory coverage of actually loaded CJS files, not an authenticity or sandbox claim. */
export function proveLoadedModules(directory,inventories,paths,sourceFiles={}){
  const root=realpathSync(directory),keys=Object.keys(inventories).sort((a,b)=>b.length-a.length);
  return paths.slice().sort().map(file=>{
    const requested=relative(root,resolve(file));
    if(isAbsolute(requested)||requested==='..'||requested.startsWith('..'+sep))throw new Error('A loaded module is outside the inventoried experiment.');
    const real=realpathSync(file),r=relative(root,real).split(sep).join('/');
    if(r.startsWith('../')||real!==resolve(file))throw new Error('Uninventoried or linked module.');
    const owner=keys.find(k=>r.startsWith(k+'/')),name=owner&&r.slice(owner.length+1);
    const digest=createHash('sha256').update(readFileSync(real)).digest('hex');
    if(Object.hasOwn(sourceFiles,r)&&sourceFiles[r]===digest)return {path:r,package:'verified-source',sha256:digest};
    if(!owner||inventories[owner].files[name]!==digest)throw new Error('Loaded CJS bytes are not covered by the installed inventory.');
    return {path:r,package:owner,sha256:digest};
  });
}
export function environmentIdentity(){
  return {node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,
    osRelease:release(),endianness:endianness(),profile:PROFILE,machineVersion:MACHINE.version};
}
