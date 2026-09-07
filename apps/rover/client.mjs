/** One bounded request at a time. This is lifecycle control, not hostile-code sandboxing. */
const TYPES=new Set(['start','advance','select','read','replay','compare','export','inspect']);
export function createClient(factory=()=>new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'}),deadline=8000){
  const worker=factory();let serial=0,pending=null,closed=false;
  function close(reason='Execution cancelled.'){if(closed)return;closed=true;worker.terminate();if(pending){clearTimeout(pending.timer);pending.reject(new Error(reason));pending=null;}}
  worker.onmessage=({data:m})=>{if(closed||!pending||m?.id!==pending.id)return;const p=pending;pending=null;clearTimeout(p.timer);if(m.ok===true&&Object.hasOwn(m,'result'))p.resolve(m.result);else p.reject(new Error('Worker rejected the request.'));};
  worker.onerror=e=>{e.preventDefault?.();close('Worker execution failed.');};
  return Object.freeze({request(type,payload={}){return new Promise((resolve,reject)=>{
    if(closed)return reject(new Error('Execution channel is closed.'));if(pending)return reject(new Error('A request is already pending.'));if(!TYPES.has(type))return reject(new Error('Unsupported operation.'));
    const id=++serial,timer=setTimeout(()=>close('Worker exceeded its execution deadline.'),deadline);pending={id,resolve,reject,timer};
    try{worker.postMessage({id,type,payload});}catch{close('Worker request failed.');}
  });},close});
}
