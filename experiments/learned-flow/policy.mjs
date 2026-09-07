import protocol from './protocol.json' with {type:'json'};
import {freeze,validObservation,readAction} from '../rover3d/contract.mjs';
export const PROTOCOL=freeze(protocol),protocolSha256='ee6f721ca0cd79788efb0023f89a322913181703b5ddb56ab33bbe56bbe978e1';
const P=PROTOCOL;
export const LIMIT=1048576,MAX_ROWS=20000,OPTIONS=Object.freeze({...P.modelOptions,kind:'regression'});
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const fail=message=>{throw new TypeError(message);};

/** Pure data validation; hashing and executable loading are caller responsibilities. */
export function decodeArtifact(text){
  if(typeof text!=='string'||text.length>LIMIT||new TextEncoder().encode(text).length>LIMIT)fail('Invalid artifact size.');
  const value=JSON.parse(text);
  if(!exactKeys(value,['format','protocolSha256','library','harnessVersion','engine','teacher','meta','tree'])||
    value.format!=='stone.learned-flow/0.1'||value.protocolSha256!==protocolSha256||value.library!==P.library||
    value.harnessVersion!==P.harnessVersion||value.engine!==P.engine||value.teacher!==P.teacher)fail('Incompatible artifact identity.');
  validateMetadata(value.meta);validateTree(value.tree);return value;
}
