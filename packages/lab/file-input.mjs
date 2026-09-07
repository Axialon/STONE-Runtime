import {MAX_EVIDENCE_BYTES} from './inspection.mjs';
/** Native File ingress only. No upload, pathname access, normalization or persistence. */
export async function readStoneFile(file){
 if(!file||!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_EVIDENCE_BYTES||typeof file.arrayBuffer!=='function')throw new TypeError('Choose a UTF-8 JSON file no larger than two MiB.');
 const bytes=await file.arrayBuffer();
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength!==file.size||bytes.byteLength>MAX_EVIDENCE_BYTES)throw new TypeError('File size changed or exceeded its limit.');
 try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new TypeError('The file is not valid UTF-8.');}
}
