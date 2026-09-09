import test from 'node:test';import assert from 'node:assert/strict';import {Readable,Writable} from 'node:stream';import {generateKeyPairSync} from 'node:crypto';import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {parseArguments,readBoundedStream,signFromPem,main} from '../scripts/stone-signature.mjs';
import {verifyPackageSignature} from '../packages/contract/package-signature.mjs';
test('strict CLI arguments accept only documented flags',()=>{assert.deepEqual(parseArguments(['verify','--package','p','--signature','s','--expected-key','']),{command:'verify',package:'p',signature:'s',expectedKey:''});assert.deepEqual(parseArguments(['sign','--package','p']),{command:'sign',package:'p'});for(const args of [[],['sign'],['sign','--package','p','--key','secret'],['sign','--package','p','--package','q'],['sign','--package','p','--signature','s'],['verify','--package','p'],['verify','--package','p','--signature','s','extra'],['sign','--package']])assert.throws(()=>parseArguments(args));});
test('stdin bounded before assembling private material',async()=>{assert.equal((await readBoundedStream(Readable.from([Buffer.from('abc')]),8)).toString(),'abc');await assert.rejects(readBoundedStream(Readable.from([Buffer.alloc(9)]),8));await assert.rejects(readBoundedStream(Readable.from([]),8));const stalled=new Readable({read(){}});await assert.rejects(readBoundedStream(stalled,8,10));assert.equal(stalled.destroyed,true);});
test('ephemeral PKCS8 signs through shared boundary with public-only output',async()=>{const {privateKey}=generateKeyPairSync('ed25519'),pem=Buffer.from(privateKey.export({type:'pkcs8',format:'pem'})),raw=await readFile(new URL('../examples/FLOW-Learned.stone.json',import.meta.url));const e=await signFromPem(raw,pem);assert.equal((await verifyPackageSignature(raw,Buffer.from(JSON.stringify(e)))).signatureValid,true);assert.doesNotMatch(JSON.stringify(e),/PRIVATE KEY|privateKey/);assert.equal(pem.every(x=>x===0),true);});
test('invalid and alternate keys return sanitized errors and clear stdin buffer',async()=>{for(const material of ['PRIVATE SECRET SENTINEL',generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({type:'pkcs8',format:'pem'})]){const pem=Buffer.from(material);await assert.rejects(signFromPem(new Uint8Array([1]),pem),e=>e.message==='Signing failed. Check package, Ed25519 PKCS8 stdin and platform support.');assert.equal(pem.every(x=>x===0),true);}});

const turn=()=>new Promise(resolve=>setImmediate(resolve));
const signingInput=()=>Readable.from([generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'})]);
const signArgs=['sign','--package','examples/FLOW-Learned.stone.json'];
function capture(){let text='';return {stream:new Writable({write(chunk,encoding,callback){text+=chunk.toString();callback();}}),text:()=>text};}
test('main waits for the output write callback before reporting success',async()=>{
 let release,started;const ready=new Promise(r=>started=r),stdout=new Writable({write(chunk,encoding,callback){release=callback;started();}}),stderr=capture();let settled=false;
 const pending=main(signArgs,{stdin:signingInput(),stdout,stderr:stderr.stream}).then(code=>{settled=true;return code;});
 await ready;await turn();try{assert.equal(settled,false);}finally{release();}assert.equal(await pending,0);assert.equal(stderr.text(),'');
});
test('verify callback failure yields sanitized exit 2 and retains an error guard',async()=>{
 const dir=await mkdtemp(new URL('../.stone-signature-output-',import.meta.url).pathname);try{
  const raw=await readFile(new URL('../examples/FLOW-Learned.stone.json',import.meta.url)),pem=Buffer.from(generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}));
  const envelope=await signFromPem(raw,pem),path=dir+'/signature.json';await writeFile(path,JSON.stringify(envelope));
  const stderr=capture(),stdout=new Writable({write(chunk,encoding,callback){setImmediate(()=>callback(new Error('SECRET_OUTPUT_SENTINEL')));}}),observed=[];
  const observer=e=>observed.push(e);stdout.on('error',observer);
  const code=await main(['verify','--package','examples/FLOW-Learned.stone.json','--signature',path],{stdout,stderr:stderr.stream});await turn();
  assert.equal(code,2);assert.equal(observed.length,1);assert.match(stderr.text(),/^Signature command failed\./);assert.doesNotMatch(stderr.text(),/SECRET_OUTPUT_SENTINEL|ENOSPC|Error:/);
  stdout.off('error',observer);assert.ok(stdout.listenerCount('error')>=1);stdout.emit('error',new Error('LATER_SECRET_SENTINEL'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('output error event before delayed callback fails safely without echoing errors',async()=>{
 const stderr=capture(),stdout=new Writable({write(chunk,encoding,callback){setImmediate(()=>{this.emit('error',new Error('SECRET_EVENT_SENTINEL'));setImmediate(()=>callback(new Error('SECRET_CALLBACK_SENTINEL')));});}});
 const observer=()=>{};stdout.on('error',observer);assert.equal(await main(signArgs,{stdin:signingInput(),stdout,stderr:stderr.stream}),2);await turn();await turn();stdout.off('error',observer);assert.ok(stdout.listenerCount('error')>=1);assert.match(stderr.text(),/^Signature command failed\./);assert.doesNotMatch(stderr.text(),/SENTINEL/);
});
test('failed stderr is handled once without leaking secret stdin or recursive output',async()=>{
 const stdout=capture();let writes=0,diagnostic='';const stderr=new Writable({write(chunk,encoding,callback){writes++;diagnostic+=chunk;setImmediate(()=>callback(new Error('SECRET_STDERR_SENTINEL')));}}),observer=()=>{};stderr.on('error',observer);
 assert.equal(await main(signArgs,{stdin:Readable.from(['SECRET_STDIN_SENTINEL']),stdout:stdout.stream,stderr}),2);await turn();stderr.off('error',observer);assert.ok(stderr.listenerCount('error')>=1);stderr.emit('error',new Error('LATER_SECRET_STDERR_SENTINEL'));assert.equal(writes,1);assert.equal(stdout.text(),'');assert.doesNotMatch(diagnostic,/SENTINEL|PRIVATE KEY/);
});
