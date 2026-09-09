import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createPrivateKey,createPublicKey} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {signPackage,verifyPackageSignature,MAX_ENVELOPE_BYTES} from '../packages/contract/package-signature.mjs';
import {MAX_PACKAGE_BYTES} from '../packages/contract/stone-package.mjs';
const MAX_KEY_BYTES=16384;
export function parseArguments(args){
 const [command,...rest]=args;if(!['sign','verify'].includes(command)||rest.length%2)throw new Error();
 const out={command},allowed=command==='sign'?['package']:['package','signature','expected-key'];
 for(let i=0;i<rest.length;i+=2){const flag=rest[i].startsWith('--')?rest[i].slice(2):'',key=flag==='expected-key'?'expectedKey':flag,value=rest[i+1];if(!allowed.includes(flag)||Object.hasOwn(out,key)||value===undefined||value.startsWith('--')||(!value&&flag!=='expected-key'))throw new Error();out[key]=value;}
 if(!out.package||(command==='verify'&&!out.signature))throw new Error();return out;
}
export async function readBoundedFile(path,max){
 const handle=await open(path,constants.O_RDONLY|constants.O_NONBLOCK);
 try{
  const stat=await handle.stat();if(!stat.isFile()||stat.size<1||stat.size>max)throw new Error();
  const buffer=Buffer.alloc(max+1);let size=0;
  while(size<buffer.length){const {bytesRead}=await handle.read(buffer,size,buffer.length-size,size);if(!bytesRead)break;size+=bytesRead;}
  if(size!==stat.size||size>max)throw new Error();return buffer.subarray(0,size);
 }finally{await handle.close();}
}
export async function readBoundedStream(stream,max=MAX_KEY_BYTES,deadline=10000){
 const chunks=[];let size=0;
 const timer=setTimeout(()=>stream.destroy(new Error('Stdin deadline exceeded.')),deadline);
 try{for await(const chunk of stream){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>max){bytes.fill(0);throw new Error();}chunks.push(bytes);}if(!size)throw new Error();return Buffer.concat(chunks,size);}
 finally{clearTimeout(timer);for(const chunk of chunks)chunk.fill(0);}
}
export async function signFromPem(packageBytes,pem){
 let der;
 try{
  if(!Buffer.isBuffer(pem)||pem.length<1||pem.length>MAX_KEY_BYTES)throw new Error();
  const text=new TextDecoder('utf-8',{fatal:true}).decode(pem);
  if(!/^-----BEGIN PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PRIVATE KEY-----\s*$/.test(text))throw new Error();
  const key=createPrivateKey({key:pem,format:'pem',type:'pkcs8'});if(key.asymmetricKeyType!=='ed25519')throw new Error();
  const publicJwk=createPublicKey(key).export({format:'jwk'}),raw=Buffer.from(publicJwk.x,'base64url');
  der=key.export({format:'der',type:'pkcs8'});
  const privateKey=await globalThis.crypto.subtle.importKey('pkcs8',der,'Ed25519',false,['sign']);
  return await signPackage(packageBytes,privateKey,raw);
 }catch{throw new Error('Signing failed. Check package, Ed25519 PKCS8 stdin and platform support.');}
 finally{if(Buffer.isBuffer(pem))pem.fill(0);der?.fill(0);}
}
// Keep one guard for each CLI output stream's lifetime. A failed write callback
// can precede its error event; removing the listener on callback would be unsafe.
// The guard retains no output bytes or underlying error messages.
const outputStates=new WeakMap();
async function writeOutput(stream,text){
 let state=outputStates.get(stream);
 if(!state){
  state={failed:false,pending:new Set()};outputStates.set(stream,state);
  stream.on('error',()=>{state.failed=true;for(const fail of [...state.pending])fail();});
 }
 if(state.failed)throw new Error('Output failed.');
 await new Promise((resolve,reject)=>{
  const fail=()=>{state.failed=true;state.pending.delete(fail);reject(new Error('Output failed.'));};
  state.pending.add(fail);
  try{stream.write(text,error=>{if(error){fail();return;}state.pending.delete(fail);state.failed?reject(new Error('Output failed.')):resolve();});}
  catch{fail();}
 });
}
export async function main(args=process.argv.slice(2),{stdin=process.stdin,stdout=process.stdout,stderr=process.stderr}={}){
 try{
  const options=parseArguments(args),raw=await readBoundedFile(options.package,MAX_PACKAGE_BYTES);
  if(options.command==='sign'){
   if(stdin.isTTY)throw new Error();
   const pem=await readBoundedStream(stdin),receipt=await signFromPem(raw,pem);await writeOutput(stdout,JSON.stringify(receipt,null,2)+'\n');return 0;
  }
  const envelope=await readBoundedFile(options.signature,MAX_ENVELOPE_BYTES),report=await verifyPackageSignature(raw,envelope,options.expectedKey??'');
  await writeOutput(stdout,JSON.stringify(report,null,2)+'\n');return report.status==='verified'?0:report.status==='crypto-unavailable'?3:1;
 }catch{try{await writeOutput(stderr,'Signature command failed. Check arguments, bounded input files, Ed25519 PKCS8 stdin (sign only), output destination and platform support.\n');}catch{/* A broken diagnostic stream must not trigger another write. */}return 2;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)process.exitCode=await main();
