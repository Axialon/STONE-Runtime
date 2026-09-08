import {parseManifest} from './manifest.mjs';
export const PACKAGE_FORMAT='stone.package/0.1',MAX_PACKAGE_BYTES=262144,MAX_ARTIFACT_BYTES=65536;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const keys=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
const token=v=>typeof v==='string'&&/^[a-z][a-z0-9.-]{0,63}$/.test(v);
const versioned=v=>typeof v==='string'&&v.length<=100&&/^[a-z][a-z0-9.-]*\/[0-9]+\.[0-9]+(?:\.[0-9]+)?$/.test(v);
export async function packageHash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
/** Bounded data only. Passing these checks never authorizes execution. */
export async function readStonePackage(text){
 if(typeof text!=='string'||text.length>MAX_PACKAGE_BYTES)throw new TypeError('Stone file exceeds256KiB or is not text.');
 const bytes=new TextEncoder().encode(text);if(bytes.length>MAX_PACKAGE_BYTES)throw new TypeError('Stone file exceeds256KiB.');
 const p=JSON.parse(text);
 if(!keys(p,['format','manifest','runtime','artifacts'])||p.format!==PACKAGE_FORMAT)throw new TypeError('Unsupported Stone file format.');
 const manifest=parseManifest(JSON.stringify(p.manifest));if(!manifest.valid)throw new TypeError('Stone file contains an invalid core manifest.');
 if(!keys(p.runtime,['adapter','harnessVersion','artifactId'])||!versioned(p.runtime.adapter)||!versioned(p.runtime.harnessVersion)||!token(p.runtime.artifactId))throw new TypeError('Runtime requirements must be identifiers, not URLs or code.');
 if(!Array.isArray(p.artifacts)||p.artifacts.length<1||p.artifacts.length>4)throw new TypeError('A Stone file needs1–4 data artifacts.');
 const ids=new Set(),receipts=[];
 for(const a of p.artifacts){
  if(!keys(a,['id','mediaType','bytes','sha256','text'])||!token(a.id)||ids.has(a.id)||a.mediaType!=='application/json'||typeof a.text!=='string'||a.text.length>MAX_ARTIFACT_BYTES||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>MAX_ARTIFACT_BYTES||typeof a.sha256!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256))throw new TypeError('Invalid, duplicate or oversized JSON artifact.');
  ids.add(a.id);const actual=new TextEncoder().encode(a.text);
  if(actual.length!==a.bytes||actual.length>MAX_ARTIFACT_BYTES||await packageHash(actual)!==a.sha256)throw new TypeError('Artifact bytes or checksum disagree.');
  JSON.parse(a.text);receipts.push({id:a.id,mediaType:a.mediaType,bytes:actual.length,sha256:a.sha256});
 }
 if(!ids.has(p.runtime.artifactId))throw new TypeError('Required artifact is absent.');
 return freeze({package:{...p,manifest:manifest.manifest},source:{bytes:bytes.length,sha256:await packageHash(bytes)},artifacts:receipts});
}
