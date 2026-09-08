import {createDataPackage,inspectDataPackage} from '../../packages/data-quality/package.mjs';
const keys=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
let busy=false;
self.onmessage=async({data:m})=>{
 if(!keys(m,['id','type','payload'])||!Number.isSafeInteger(m.id)||m.id<1)return;
 if(busy){self.postMessage({id:m.id,ok:false,error:'Worker already busy.'});return;}busy=true;
 try{
  let result;const p=m.payload;
  if(m.type==='presets'&&keys(p,[]))result=Object.fromEntries(await Promise.all(['LENS','TIDY'].map(async name=>[name,JSON.stringify(await createDataPackage(name))])));
  else if(m.type==='create'&&keys(p,['name','id','publisher','config'])&&['name','id','publisher'].every(k=>typeof p[k]==='string'&&p[k].length<=2048)&&p.config&&JSON.stringify(p.config).length<=2048){
   const text=JSON.stringify(await createDataPackage(p.name,p.config,{id:p.id,publisher:p.publisher}));result={text,inspection:await inspectDataPackage(text,'auto')};
  }
  else if(m.type==='inspect'&&keys(p,['text','target'])&&typeof p.text==='string'&&p.text.length<=262144&&typeof p.target==='string'&&p.target.length<=32)result=await inspectDataPackage(p.text,p.target);
  else if(m.type==='run'&&keys(p,['bytes','format','text'])&&p.bytes instanceof Uint8Array&&p.bytes.byteLength>0&&p.bytes.byteLength<=1048576&&['csv','json'].includes(p.format)&&typeof p.text==='string'&&p.text.length<=262144){
   const {executeData}=await import('/vendor/data-quality.mjs');result=await executeData(p.bytes,p.format,p.text);
  }else throw new TypeError('Unknown or oversized data request.');
  self.postMessage({id:m.id,ok:true,result});
 }catch(e){self.postMessage({id:m.id,ok:false,error:String(e.message).slice(0,300)});}finally{busy=false;}
};
