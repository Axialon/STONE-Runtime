import {DecisionTreeRegression} from 'ml-cart';
import {decodeArtifact,predictAction,guardKind} from './policy.mjs';
import {MODEL_IDENTITY,MODEL_SHA256} from '../../packages/learned-rover/identity.mjs';
export {MODEL_SHA256};
const MAX_BYTES=65536;
const active=signal=>{if(signal?.aborted)throw new Error('Model loading cancelled.');};
/** Fixed first-party artifact only. No fitting, source evaluation or URL-selected implementation. */
export async function loadPolicy(text,{signal}={}){
 active(signal);
 if(typeof text!=='string'||text.length>MAX_BYTES)throw new TypeError('Invalid model size.');
 const bytes=new TextEncoder().encode(text);if(bytes.length>MAX_BYTES)throw new TypeError('Invalid model size.');
 const hash=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 active(signal);if(hash!==MODEL_SHA256)throw new Error('Model bytes do not match the trusted pinned artifact.');
 const data=decodeArtifact(text),model=DecisionTreeRegression.load(data.tree);let modelCalls=0,disposed=false;
 const counted={predict(rows){modelCalls++;return model.predict(rows);}};
 return Object.freeze({identity:MODEL_IDENTITY,
  decide(observation){if(disposed)throw new Error('Policy is disposed.');const before=modelCalls,guard=guardKind(observation),action=predictAction(counted,observation);return Object.freeze({action,guard,modelCalls:modelCalls-before});},
  stats(){return Object.freeze({modelCalls});},dispose(){disposed=true;}});
}
export async function fetchPolicy({fetcher=globalThis.fetch,signal}={}){
 active(signal);
 const response=await fetcher('/models/flow-v0.1.json',{credentials:'omit',redirect:'error',cache:'no-store',signal});
 if(!response?.ok||!response.body)throw new Error('Pinned model could not be loaded.');
 const length=response.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES)){await response.body.cancel();throw new Error('Model response exceeds the size limit.');}
 const reader=response.body.getReader(),parts=[];let total=0,done=false;
 try{while(true){active(signal);const r=await reader.read();if(r.done){done=true;break;}total+=r.value.byteLength;if(total>MAX_BYTES)throw new Error('Model stream exceeds the size limit.');parts.push(r.value);}}
 finally{if(!done)await reader.cancel();reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.byteLength;}
 active(signal);return loadPolicy(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),{signal});
}
