/** One disposable worker per request. Termination is independent of worker responsiveness. */
export class WorkerClient {
 constructor({WorkerClass=globalThis.Worker,deadline=10000}={}){this.WorkerClass=WorkerClass;this.deadline=deadline;this.serial=0;this.pending=null;}
 request(type,payload){
  this.cancel();const id=++this.serial;
  return new Promise((resolve,reject)=>{
   let worker;try{worker=new this.WorkerClass(new URL('./worker.mjs',import.meta.url),{type:'module'});}catch(e){reject(e);return;}
   const finish=(error,result)=>{if(this.pending?.id!==id)return;clearTimeout(this.pending.timer);this.pending=null;worker.terminate();error?reject(error):resolve(result);};
   this.pending={id,worker,finish,timer:setTimeout(()=>finish(new Error('Worker deadline exceeded. Press Run to recover.')),this.deadline)};
   worker.onmessage=({data})=>{if(data?.id!==id)return;finish(data.ok===true?null:new Error(typeof data.error==='string'?data.error.slice(0,300):'Data worker rejected request.'),data.result);};
   worker.onerror=()=>finish(new Error('Data worker unavailable. Check build:data, then retry.'));
   worker.onmessageerror=()=>finish(new Error('Invalid data worker reply.'));
   try{worker.postMessage({id,type,payload});}catch(e){finish(e);}
  });
 }
 cancel(){this.pending?.finish(new Error('Cancelled / worker terminated.'));}
}
export async function readLocalFile(file,maxBytes=1048576,text=false){
 if(!file||!Number.isSafeInteger(file.size)||file.size<1||file.size>maxBytes)throw new TypeError('File must be nonempty and no larger than '+maxBytes+' bytes.');
 const buffer=await file.arrayBuffer();if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==file.size||buffer.byteLength>maxBytes)throw new TypeError('File byte size changed or exceeds the limit.');
 const bytes=new Uint8Array(buffer);return text?new TextDecoder('utf-8',{fatal:true}).decode(bytes):bytes;
}
export class DataSession {
 constructor(client=new WorkerClient(),onChange=()=>{}){this.client=client;this.onChange=onChange;this.generation=0;this.state={bytes:null,active:null,pending:null,inspection:null,result:null,busy:false,status:'Choose a dataset. Original preserved; local deterministic execution.'};}
 emit(){this.onChange(this.state);}
 clear(status){this.generation++;this.client.cancel();this.state.result=null;this.state.busy=false;this.state.status=status;this.emit();return this.generation;}
 cancel(){this.clear('Cancelled / worker terminated. Press Run to recover.');}
 select(text){this.state.active=text;this.state.pending=null;this.state.inspection=null;this.clear('Policy active. Choose data or press Run; no automatic processing.');}
 async loadData(file){
  this.state.bytes=null;const g=this.clear(file?'Reading original bytes…':'No dataset selected.');if(!file)return;this.state.busy=true;this.emit();
  try{const bytes=await readLocalFile(file);if(g!==this.generation)return;this.state.bytes=bytes;this.state.status='Original ready: '+bytes.length+' bytes in this tab. Press Run.';}catch(e){if(g===this.generation)this.state.status='Rejected: '+e.message;}finally{if(g===this.generation){this.state.busy=false;this.emit();}}
 }
 async importPackage(file){
  this.state.active=null;this.state.pending=null;this.state.inspection=null;const g=this.clear(file?'Inspecting policy metadata…':'No imported policy selected.');if(!file)return;this.state.busy=true;this.emit();
  try{const text=await readLocalFile(file,262144,true);if(g!==this.generation)return;const inspection=await this.client.request('inspect',{text,target:'auto'});if(g!==this.generation)return;this.state.inspection=inspection;this.state.pending=inspection.compatibility.compatible?text:null;this.state.status=inspection.compatibility.compatible?'Policy inspected. Activate explicitly before running.':'Policy rejected: '+inspection.compatibility.errors?.map(e=>e.message).join(' ');}catch(e){if(g===this.generation)this.state.status='Rejected: '+e.message;}finally{if(g===this.generation){this.state.busy=false;this.emit();}}
 }
 activate(){if(!this.state.pending)throw new Error('No admitted policy waiting for activation.');const text=this.state.pending;this.select(text);}
 async run(format){
  const g=this.clear('Running in a dedicated local worker…');if(!this.state.bytes||!this.state.active){this.state.status='Select a dataset and activate a policy first.';this.emit();return;}
  this.state.busy=true;this.emit();
  try{const result=await this.client.request('run',{bytes:this.state.bytes,format,text:this.state.active});if(g!==this.generation)return;this.state.result=result;this.state.status='Completed / local deterministic execution / no model. Original preserved.';}catch(e){if(g===this.generation)this.state.status='Failed: '+e.message;}finally{if(g===this.generation){this.state.busy=false;this.emit();}}
 }
}
/** Preparation never owns dataset/result state. Host entry alone never starts work. */
export class Preparation {
 constructor(client=new WorkerClient(),onChange=()=>{}){this.client=client;this.onChange=onChange;this.generation=0;this.onHost=true;this.disposed=false;this.state={value:null,busy:false,status:'Not prepared. Use Prepare / retry.'};}
 emit(){this.onChange(this.state);}
 cancel(){this.generation++;this.client.cancel();this.state.busy=false;this.state.status='Cancelled / preparation worker terminated. Retry explicitly if needed.';this.emit();}
 invalidate(){this.state.value=null;this.cancel();}
 setHost(value){this.onHost=value;if(!value)this.cancel();}
 dispose(){this.disposed=true;this.cancel();}
 async prepare(type,payload){
  if(!this.onHost||this.disposed)return;
  this.cancel();const g=this.generation;this.state.value=null;this.state.busy=true;this.state.status='Preparing / metadata inspection only…';this.emit();
  try{const value=await this.client.request(type,payload);if(g!==this.generation||!this.onHost||this.disposed)return;this.state.value=value;this.state.status='Prepared and inspected. Activation is a separate action.';}
  catch(e){if(g===this.generation)this.state.status='Preparation failed: '+e.message+' Retry explicitly.';}
  finally{if(g===this.generation){this.state.busy=false;this.emit();}}
 }
}
