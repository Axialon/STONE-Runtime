import {freeze,MACHINE,PROFILE} from '../../experiments/rover3d/contract.mjs';
import {STONES,getStone} from '../../experiments/rover3d/stones.mjs';
export const MODEL_SHA256='d9a1ef32fa555b5f9d8fdd326a90b59f8c03228b3854564d99bed708d0a210c2';
export const MODEL_IDENTITY=freeze({id:'rover.flow-learned',version:'0.1.0',implementation:'learned-policy',modelSha256:MODEL_SHA256,
 harnessVersion:'stone.flow-imitation.harness/0.1.0',protocolSha256:'ee6f721ca0cd79788efb0023f89a322913181703b5ddb56ab33bbe56bbe978e1',library:'ml-cart/2.1.1'});
export const LEARNED_STONE=freeze({id:MODEL_IDENTITY.id,name:'FLOW / Learned',version:'0.1.0',description:'Fitted longitudinal control. Explicit steering and guards.',implementation:'learned-policy',execution:'local',
 compatibility:{profile:PROFILE,machineVersion:MACHINE.version,execution:'local',actions:['throttle','steering','brake']},
 model:MODEL_IDENTITY,requirements:{network:false,permissions:['observe-rover','command-rover']},
 limits:'Local CART imitation on two lanes; steering and guards are deterministic. Not general navigation, model superiority or hardware calibration.'});
export const MODEL_STONES=freeze([...STONES,LEARNED_STONE]);
export function getModelStone(id){return id===MODEL_IDENTITY.id?LEARNED_STONE:getStone(id);}
export function identityFor(id){
 if(id===MODEL_IDENTITY.id)return MODEL_IDENTITY;
 const p=getStone(id);return freeze({id:p.id,version:p.version,implementation:'rule-based',modelSha256:null,harnessVersion:'stone.rover.rules/0.1.0',protocolSha256:null,library:null});
}
export function matchesIdentity(value){
 try{const expected=identityFor(value.id),keys=Object.keys(expected);return value&&Object.keys(value).length===keys.length&&keys.every(k=>value[k]===expected[k]);}catch{return false;}
}
