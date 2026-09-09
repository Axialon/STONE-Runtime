import {MAX_PACKAGE_BYTES} from '../../packages/contract/stone-package.mjs';
import {MAX_ENVELOPE_BYTES} from '../../packages/contract/package-signature.mjs';
/** A fresh owned worker for each explicit verification, terminated on every exit. */
export class SignatureWorkerClient {
 constructor({WorkerClass=globalThis.Worker,deadline=10000}={}){this.WorkerClass=WorkerClass;this.deadline=deadline;this.serial=0;this.pending=null;}
 request(payload){
  this.cancel();const id=++this.serial;
  return new Promise((resolve,reject)=>{
   let worker;try{worker=new this.WorkerClass(new URL('./signature-worker.mjs',import.meta.url),{type:'module'});}catch{reject(new Error('Signature worker unavailable.'));return;}
   const finish=(error,result)=>{if(this.pending?.id!==id)return;clearTimeout(this.pending.timer);this.pending=null;worker.terminate();error?reject(error):resolve(result);};
   this.pending={id,finish,timer:setTimeout(()=>finish(new Error('Signature worker deadline exceeded.')),this.deadline)};
   worker.onmessage=({data})=>{if(data?.id!==id)return;finish(data.ok===true&&data.result?.format==='stone.package-signature-report/0.1'?null:new Error('Signature worker failed.'),data.result);};
   worker.onerror=worker.onmessageerror=()=>finish(new Error('Signature worker unavailable.'));
   try{worker.postMessage({id,payload});}catch{finish(new Error('Signature worker failed.'));}
  });
 }
 cancel(){this.pending?.finish(new Error('Cancelled / worker terminated.'));}
}
export async function readSignatureFile(file,max){
 if(!file||!Number.isSafeInteger(file.size)||file.size<1||file.size>max)throw new Error('Invalid file size.');
 const size=file.size,buffer=await file.arrayBuffer();if(!(buffer instanceof ArrayBuffer)||file.size!==size||buffer.byteLength!==size||buffer.byteLength>max)throw new Error('Invalid file size.');return new Uint8Array(buffer);
}
export class SignatureSession {
 constructor(client=new SignatureWorkerClient(),onChange=()=>{}){this.client=client;this.onChange=onChange;this.generation=0;this.onHost=true;this.disposed=false;this.state={package:null,signature:null,expectedKey:'',report:null,busy:false,status:'Choose both files, then Verify.'};}
 emit(){this.onChange(this.state);}
 invalidate(status='Inputs changed. Press Verify.'){this.generation++;this.client.cancel();this.state.report=null;this.state.busy=false;this.state.status=status;this.emit();}
 select(kind,file){if(!['package','signature'].includes(kind))throw new TypeError('Unknown input.');this.state[kind]=file??null;this.invalidate();}
 expect(value){this.state.expectedKey=value;this.invalidate();}
 cancel(){this.state.package=null;this.state.signature=null;this.state.expectedKey='';this.invalidate('Stopped / cleared. No verification retained.');}
 setHost(value){this.onHost=value;if(!value)this.cancel();}
 dispose(){this.disposed=true;this.cancel();}
 async verify(){
  if(!this.onHost||this.disposed)return;
  this.invalidate('Reading files for local verification…');const g=this.generation;
  if(!this.state.package||!this.state.signature){this.state.status='Choose both files, then Verify.';this.emit();return;}
  const {package:p,signature:e,expectedKey}=this.state;this.state.busy=true;this.emit();
  try{
   const [packageBytes,envelopeBytes]=await Promise.all([readSignatureFile(p,MAX_PACKAGE_BYTES),readSignatureFile(e,MAX_ENVELOPE_BYTES)]);
   if(g!==this.generation)return;
   const report=await this.client.request({packageBytes,envelopeBytes,expectedKey});if(g!==this.generation)return;
   this.state.report=report;this.state.status=report.status;
  }catch(e){if(g===this.generation)this.state.status=e.message==='Invalid file size.'?'File rejected: package ≤256 KiB; signature ≤8 KiB; both nonempty.':e.message.startsWith('Signature worker')?e.message:'Verification failed.';}
  finally{if(g===this.generation){this.state.busy=false;this.emit();}}
 }
}
