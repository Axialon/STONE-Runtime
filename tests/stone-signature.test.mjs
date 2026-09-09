import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {signPackage,verifyPackageSignature,SIGNATURE_DOMAIN,MAX_ENVELOPE_BYTES} from '../packages/contract/package-signature.mjs';
import {createDataPackage,PRESETS,readDataPackage} from '../packages/data-quality/package.mjs';
import {readModelPackage} from '../packages/learned-rover/package-data.mjs';
const enc=new TextEncoder(),bytes=x=>enc.encode(x),hash=x=>createHash('sha256').update(x).digest('hex');
const flow=await readFile(new URL('../examples/FLOW-Learned.stone.json',import.meta.url));
const data=bytes(JSON.stringify(await createDataPackage('Authored Unicode Żółw',PRESETS.TIDY,{id:'digital.authored',publisher:'Unverified declaration'}))+'\n');
const keys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
const publicKey=new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey));
const envelope=await signPackage(flow,keys.privateKey,publicKey),encoded=e=>bytes(JSON.stringify(e));
const verify=(p=flow,e=envelope,k='')=>verifyPackageSignature(p,encoded(e),k);
test('RFC8032 test1 exercises standard Ed25519 (not the Stone domain)',async()=>{
 const key=await crypto.subtle.importKey('raw',Buffer.from('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex'),'Ed25519',false,['verify']);
 assert.equal(await crypto.subtle.verify('Ed25519',key,Buffer.from('e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b','hex'),new Uint8Array()),true);
});
for(const [name,p] of [['FLOW',flow],['authored Data',data]])test(name+' roundtrip returns exact public receipts with no identity or admission claim',async()=>{
 const e=await signPackage(p,keys.privateKey,publicKey),r=await verify(p,e);
 assert.equal(r.status,'verified');assert.equal(r.signatureValid,true);assert.equal(r.expectedKeyMatch,null);
 assert.deepEqual(r.package,{bytes:p.length,sha256:hash(p)});assert.deepEqual(r.envelope,{bytes:encoded(e).length,sha256:hash(encoded(e))});
 assert.equal(r.publicKeyFingerprint,hash(publicKey));assert.equal(r.publisherIdentity,'not-established');assert.equal(r.installation,'not-performed');assert.equal(r.executionAdmission,'unchanged');
 assert.deepEqual(Object.keys(e).sort(),['algorithm','format','packageSha256','publicKey','signature']);assert.doesNotMatch(JSON.stringify(r),/PRIVATE KEY|privateKey|"d":/);
});
for(const [name,k,match,status] of [['none','',null,'verified'],['correct',hash(publicKey),true,'verified'],['normalized','  '+hash(publicKey).toUpperCase()+'  ',true,'verified'],['wrong','0'.repeat(64),false,'expected-key-mismatch'],['invalid','oops',null,'invalid-expected-key']])test('expected key '+name,async()=>{const r=await verify(flow,envelope,k);assert.equal(r.expectedKeyMatch,match);assert.equal(r.status,status);if(name==='wrong')assert.equal(r.signatureValid,true);});
for(const [name,change] of [['newline',x=>Buffer.concat([x,Buffer.from('\n')])],['Unicode',x=>bytes(new TextDecoder().decode(x).replace('FLOW','ŻÓŁW'))],['whitespace',x=>bytes(' '+new TextDecoder().decode(x))]])test('changed exact package '+name+' and digest retag require resigning',async()=>{const p=change(flow);assert.equal((await verify(p)).signatureValid,false);const r=await verify(p,{...envelope,packageSha256:hash(p)});assert.equal(r.status,'signature-invalid');});
for(const [name,edit] of [['algorithm',e=>e.algorithm='RSA'],['version',e=>e.format='stone.package-signature/9'],['unknown field',e=>e.secret='never echo this'],['unpadded base64',e=>e.publicKey=e.publicKey.replace(/=+$/,'')],['base64 whitespace',e=>e.signature+='\n'],['noncanonical base64',e=>e.publicKey=e.publicKey.slice(0,-2)+'B='],['uppercase digest',e=>e.packageSha256=e.packageSha256.toUpperCase()],['key length',e=>e.publicKey=Buffer.alloc(31).toString('base64')],['signature length',e=>e.signature=Buffer.alloc(63).toString('base64')]])test('malformed envelope '+name,async()=>{const e={...envelope};edit(e);const r=await verify(flow,e);assert.equal(r.status,'malformed-envelope');assert.equal(r.signatureValid,false);assert.doesNotMatch(JSON.stringify(r),/never echo this/);});
test('wrong key and wrong domain fail cryptographically',async()=>{
 const other=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);assert.equal((await verify(flow,{...envelope,publicKey:Buffer.from(await crypto.subtle.exportKey('raw',other.publicKey)).toString('base64')})).status,'signature-invalid');
 for(const message of [flow,bytes('WRONG\n'+new TextDecoder().decode(flow))]){const signature=Buffer.from(await crypto.subtle.sign('Ed25519',keys.privateKey,message)).toString('base64');assert.equal((await verify(flow,{...envelope,signature})).status,'signature-invalid');}
 assert.equal(SIGNATURE_DOMAIN,'STONE-PACKAGE-SIGNATURE/0.1\n');
});
for(const [name,p] of [['invalid UTF8',new Uint8Array([0xff])],['oversize',new Uint8Array(262145)],['invalid JSON',bytes('{')],['invalid package',bytes('{}')],['executable reference',bytes(JSON.stringify({...JSON.parse(flow),runtime:{...JSON.parse(flow).runtime,url:'https://invalid/'}}))]])test('reject package '+name,async()=>{assert.equal((await verify(p)).status,'malformed-package');await assert.rejects(signPackage(p,keys.privateKey,publicKey));});
for(const [name,e] of [['invalid UTF8',new Uint8Array([0xff])],['oversize',new Uint8Array(MAX_ENVELOPE_BYTES+1)],['empty',new Uint8Array()],['duplicate key',bytes(JSON.stringify(envelope).replace('{','{"algorithm":"Ed25519",'))]])test('reject envelope '+name,async()=>{assert.equal((await verifyPackageSignature(flow,e)).status,'malformed-envelope');});
test('signed unknown runtime stays unavailable in existing adapters',async()=>{for(const [p,admit] of [[flow,readModelPackage],[data,readDataPackage]]){const obj=JSON.parse(new TextDecoder().decode(p));obj.runtime.adapter='stone.unknown/0.1';const raw=bytes(JSON.stringify(obj)),e=await signPackage(raw,keys.privateKey,publicKey);assert.equal((await verify(raw,e)).signatureValid,true);assert.equal((await admit(new TextDecoder().decode(raw))).compatibility.compatible,false);}});
test('missing WebCrypto gives explicit unsupported-platform report',async()=>{const saved=Object.getOwnPropertyDescriptor(globalThis,'crypto');try{Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});assert.equal((await verify()).status,'crypto-unavailable');}finally{Object.defineProperty(globalThis,'crypto',saved);}});
