// Supervisor-only subprocess checks. All private keys are fresh and remain in memory/stdin.
import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {generateKeyPairSync} from 'node:crypto';import {mkdtemp,writeFile,rm,readFile,open} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const script=new URL('./stone-signature.mjs',import.meta.url).pathname;
function run(args,input='',stdoutDescriptor='pipe'){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[script,...args],{env:{},stdio:['pipe',stdoutDescriptor,'pipe']}),out=[],err=[];const timer=setTimeout(()=>{child.kill();reject(new Error('CLI deadline'));},15000);child.on('error',e=>{clearTimeout(timer);reject(e);});child.stdin.on('error',()=>{});child.stdout?.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x));child.on('close',code=>{clearTimeout(timer);resolve({code,out:Buffer.concat(out).toString(),err:Buffer.concat(err).toString()});});child.stdin.end(input);});}
test('CLI stdin sign, verify, expected-key mismatch, tamper and public-only output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stone-signature-test-'));try{
  const packagePath=join(dir,'package.json'),signaturePath=join(dir,'signature.json'),raw=await readFile(new URL('../examples/FLOW-Learned.stone.json',import.meta.url));await writeFile(packagePath,raw);
  const pem=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}),signed=await run(['sign','--package',packagePath],pem);assert.equal(signed.code,0);assert.equal(signed.err,'');assert.doesNotMatch(signed.out,/PRIVATE KEY/);assert.ok(!signed.out.includes(pem.trim()));const e=JSON.parse(signed.out);assert.deepEqual(Object.keys(e).sort(),['algorithm','format','packageSha256','publicKey','signature']);await writeFile(signaturePath,signed.out);
  const args=['verify','--package',packagePath,'--signature',signaturePath],verified=await run(args);assert.equal(verified.code,0);const report=JSON.parse(verified.out);assert.equal(report.signatureValid,true);assert.equal(report.expectedKeyMatch,null);
  assert.equal((await run([...args,'--expected-key',report.publicKeyFingerprint])).code,0);const mismatch=await run([...args,'--expected-key','0'.repeat(64)]);assert.equal(mismatch.code,1);assert.equal(JSON.parse(mismatch.out).expectedKeyMatch,false);
  await writeFile(packagePath,Buffer.concat([raw,Buffer.from('\n')]));assert.equal((await run(args)).code,1);await writeFile(signaturePath,'{}');assert.equal((await run(args)).code,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('CLI rejects unknown flags, oversized inputs and invalid stdin with generic errors',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stone-signature-test-'));try{const path=join(dir,'large.json');await writeFile(path,Buffer.alloc(262145));for(const [args,input] of [[['sign','--package',path],'SECRET_SENTINEL'],[['sign','--package','examples/FLOW-Learned.stone.json'],'SECRET_SENTINEL'],[['sign','--package','examples/FLOW-Learned.stone.json','--key','SECRET_SENTINEL'],''],[['sign','--package','examples/FLOW-Learned.stone.json'],Buffer.alloc(16385,65)]]){const r=await run(args,input);assert.equal(r.code,2);assert.equal(r.out,'');assert.doesNotMatch(r.err,/SECRET_SENTINEL|BEGIN|AAAA/);assert.match(r.err,/Signature command failed/);}}finally{await rm(dir,{recursive:true,force:true});}
});

test('valid CLI verification with stdout on /dev/full returns sanitized exit 2',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stone-signature-output-test-'));let full;
 try{
  const packagePath=join(dir,'package.json'),signaturePath=join(dir,'signature.json');await writeFile(packagePath,await readFile(new URL('../examples/FLOW-Learned.stone.json',import.meta.url)));
  const pem=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}),signed=await run(['sign','--package',packagePath],pem);assert.equal(signed.code,0);await writeFile(signaturePath,signed.out);
  full=await open('/dev/full','w');const result=await run(['verify','--package',packagePath,'--signature',signaturePath],'',full.fd);
  assert.equal(result.code,2);assert.equal(result.out,'');assert.match(result.err,/^Signature command failed\.[^\n]*\n$/);assert.doesNotMatch(result.err,/ENOSPC|Unhandled|Error:|PRIVATE KEY/);assert.ok(!result.err.includes(pem.trim()));
 }finally{await full?.close();await rm(dir,{recursive:true,force:true});}
});
