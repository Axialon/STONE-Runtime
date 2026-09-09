import {readStonePackage,MAX_PACKAGE_BYTES} from './stone-package.mjs';
export const SIGNATURE_DOMAIN='STONE-PACKAGE-SIGNATURE/0.1\n';
export const SIGNATURE_FORMAT='stone.package-signature/0.1',MAX_ENVELOPE_BYTES=8192;
const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const subtle=()=>{if(!globalThis.crypto?.subtle)throw new Error('crypto-unavailable');return globalThis.crypto.subtle;};
const digest=async bytes=>hex(new Uint8Array(await subtle().digest('SHA-256',bytes)));
function snapshot(value,max){
 if(!(value instanceof Uint8Array)||value.length<1||value.length>max)throw new TypeError('Invalid byte size.');
 return new Uint8Array(value);
}
function decode(bytes){return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}
const base64=bytes=>btoa(String.fromCharCode(...bytes));
function unbase64(text,length){
 if(typeof text!=='string'||text.length!==4*Math.ceil(length/3)||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw new TypeError('Invalid base64.');
 const bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));
 if(bytes.length!==length||base64(bytes)!==text)throw new TypeError('Noncanonical base64.');return bytes;
}
function parseEnvelope(bytes){
 const text=decode(bytes),e=JSON.parse(text),fields=['format','algorithm','packageSha256','publicKey','signature'];
 if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).length!==5||!fields.every(k=>Object.hasOwn(e,k))||e.format!==SIGNATURE_FORMAT||e.algorithm!=='Ed25519'||typeof e.packageSha256!=='string'||!/^[a-f0-9]{64}$/.test(e.packageSha256))throw new TypeError('Invalid envelope.');
 const publicKey=unbase64(e.publicKey,32),signature=unbase64(e.signature,64);
 // All accepted values are restricted strings without colons. Count lexical member
 // names as well as parsed keys so duplicate JSON members cannot be hidden by parse.
 if((text.match(/"(?:[^"\\]|\\.)*"\s*:/g)??[]).length!==5)throw new TypeError('Duplicate envelope member.');
 return {receipt:e,publicKey,signature};
}
function message(bytes){const prefix=encoder.encode(SIGNATURE_DOMAIN),out=new Uint8Array(prefix.length+bytes.length);out.set(prefix);out.set(bytes,prefix.length);return out;}
export function normalizeExpectedKey(value=''){
 if(typeof value!=='string')throw new TypeError('Invalid expected key.');
 const normalized=value.trim().toLowerCase();if(normalized&&!/^[a-f0-9]{64}$/.test(normalized))throw new TypeError('Invalid expected key.');return normalized||null;
}
/** Public data only. No key enrollment or execution admission is performed. */
export async function verifyPackageSignature(packageBytes,envelopeBytes,expectedKey=''){
 const report={format:'stone.package-signature-report/0.1',status:null,package:null,envelope:null,signatureValid:false,publicKeyFingerprint:null,expectedKeyMatch:null,publisherIdentity:'not-established',installation:'not-performed',executionAdmission:'unchanged',receipt:null};
 const done=status=>({...report,status});let raw,envelope,parsed,expected;
 try{raw=snapshot(packageBytes,MAX_PACKAGE_BYTES);decode(raw);}catch{return done('malformed-package');}
 try{envelope=snapshot(envelopeBytes,MAX_ENVELOPE_BYTES);parsed=parseEnvelope(envelope);}catch{return done('malformed-envelope');}
 try{expected=normalizeExpectedKey(expectedKey);}catch{return done('invalid-expected-key');}
 if(!globalThis.crypto?.subtle)return done('crypto-unavailable');
 try{await readStonePackage(decode(raw));}catch(e){return done(e?.name==='NotSupportedError'?'crypto-unavailable':'malformed-package');}
 try{
  report.package={bytes:raw.length,sha256:await digest(raw)};
  report.envelope={bytes:envelope.length,sha256:await digest(envelope)};
  report.receipt=parsed.receipt;report.publicKeyFingerprint=await digest(parsed.publicKey);
  report.expectedKeyMatch=expected===null?null:expected===report.publicKeyFingerprint;
  if(report.package.sha256!==parsed.receipt.packageSha256)return done('package-hash-mismatch');
  const key=await subtle().importKey('raw',parsed.publicKey,'Ed25519',false,['verify']);
  report.signatureValid=await subtle().verify('Ed25519',key,parsed.signature,message(raw));
  return done(!report.signatureValid?'signature-invalid':report.expectedKeyMatch===false?'expected-key-mismatch':'verified');
 }catch(e){return done(e?.name==='NotSupportedError'||e?.message==='crypto-unavailable'?'crypto-unavailable':'signature-invalid');}
}
/** Caller owns the supplied private CryptoKey. It is never serialized or returned. */
export async function signPackage(packageBytes,privateKey,rawPublicKey){
 try{
  const raw=snapshot(packageBytes,MAX_PACKAGE_BYTES),publicKey=snapshot(rawPublicKey,32);
  if(publicKey.length!==32||privateKey?.algorithm?.name!=='Ed25519'||privateKey.type!=='private')throw new Error();
  await readStonePackage(decode(raw));
  const signature=new Uint8Array(await subtle().sign('Ed25519',privateKey,message(raw)));
  const verifier=await subtle().importKey('raw',publicKey,'Ed25519',false,['verify']);
  if(!await subtle().verify('Ed25519',verifier,signature,message(raw)))throw new Error();
  return {format:SIGNATURE_FORMAT,algorithm:'Ed25519',packageSha256:await digest(raw),publicKey:base64(publicKey),signature:base64(signature)};
 }catch{throw new Error('Package signing failed. Check package, Ed25519 key and platform support.');}
}
