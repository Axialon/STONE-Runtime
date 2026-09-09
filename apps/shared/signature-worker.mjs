import {verifyPackageSignature} from '../../packages/contract/package-signature.mjs';
self.onmessage=async({data})=>{
 const {id,payload}=data??{};
 try{const result=await verifyPackageSignature(payload.packageBytes,payload.envelopeBytes,payload.expectedKey);self.postMessage({id,ok:true,result});}
 catch{self.postMessage({id,ok:false});}
};
