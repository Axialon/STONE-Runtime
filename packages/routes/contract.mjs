/** Data-only local simulation routes. No executable files, hardware commands or network. */
export const ROUTE_FORMAT='stone.route/0.1';
export const MAX_ROUTE_BYTES=8192,MAX_CHECKPOINTS=8;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const keys=(v,wanted)=>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))return false;
 const d=Object.getOwnPropertyDescriptors(v),actual=Reflect.ownKeys(d);
 return actual.length===wanted.length&&wanted.every(k=>Object.hasOwn(d,k))&&actual.every(k=>typeof k==='string'&&wanted.includes(k)&&Object.hasOwn(d[k],'value')&&d[k].enumerable);
};
export const ROUTE_LIMITS=freeze({
 drone:{horizontal:[-2.5,2.5],vertical:[-2.5,2.5],axes:['x','z'],altitude:1.8},
 rover:{horizontal:[-3.5,3.5],vertical:[-7,9],axes:['x','z'],altitude:.5},
 humanoid:{horizontal:[.15,.6],vertical:[.95,1.85],axes:['z','y'],altitude:.32}
});
function point(p,host){
 if(!keys(p,['x','y','z'])||![p.x,p.y,p.z].every(Number.isFinite))throw new TypeError('A checkpoint must contain finite x, y and z only.');
 if(host==='drone'&&(Math.abs(p.x)>2.5||Math.abs(p.z)>2.5||p.y<.6||p.y>4))throw new TypeError('Drone checkpoints need X/Z ±2.5m and altitude0.6–4m.');
 if(host==='rover'&&(Math.abs(p.x)>3.5||p.z< -7||p.z>9||p.y!==.5))throw new TypeError('Rover checkpoints need X ±3.5m, Z -7–9m and Y0.5m.');
 if(host==='humanoid'){
  const down=1.5-p.y,r=Math.hypot(down,p.z);
  if(p.x!==.32||p.y<.95||p.y>1.85||p.z<.15||p.z>.6||r>=.65||r<=.03)throw new TypeError('Target is outside the arm working plane or reach.');
  const bend=Math.acos((r*r-.34*.34-.31*.31)/(2*.34*.31));
  const shoulder=-(Math.atan2(p.z,down)-Math.atan2(.31*Math.sin(bend),.34+.31*Math.cos(bend)));
  if(!Number.isFinite(bend)||bend>2.7||shoulder< -2.7||shoulder>.4)throw new TypeError('Target requires a joint angle outside the arm limits.');
 }
 return {x:p.x,y:p.y,z:p.z};
}
export function readRoute(value,host){
 if(!Object.hasOwn(ROUTE_LIMITS,host)||!keys(value,['format','host','name','points'])||value.format!==ROUTE_FORMAT||value.host!==host)throw new TypeError('Incompatible route format or host.');
 if(typeof value.name!=='string'||value.name.length>60||!value.name.trim()||/[\u0000-\u001f\u007f]/.test(value.name))throw new TypeError('Use a route name of1–60 characters without control characters.');
 const a=value.points;
 if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length<1||a.length>MAX_CHECKPOINTS)throw new TypeError('A route needs1–8 checkpoints.');
 const d=Object.getOwnPropertyDescriptors(a);
 if(Reflect.ownKeys(d).length!==a.length+1||!Array.from({length:a.length},(_,i)=>d[i]).every(v=>v&&Object.hasOwn(v,'value')&&v.enumerable))throw new TypeError('Checkpoints must be plain dense data.');
 const points=a.map(p=>point(p,host));
 for(let i=1;i<points.length;i++){const p=points[i],q=points[i-1];if(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<(host==='humanoid'?.015:.1))throw new TypeError('Consecutive checkpoints are too close.');}
 return freeze({format:ROUTE_FORMAT,host,name:value.name,points});
}
export function parseRoute(text,host){
 if(typeof text!=='string'||text.length>MAX_ROUTE_BYTES||new TextEncoder().encode(text).length>MAX_ROUTE_BYTES)throw new TypeError('Route JSON exceeds8KiB.');
 return readRoute(JSON.parse(text),host);
}
export function defaultRoute(host){
 const points=host==='drone'?[[0,1.8,0],[1,2.2,1],[0,1.8,0]]:host==='rover'?[[0,.5,-3],[.6,.5,2],[0,.5,7]]:[[.32,1.15,.45],[.32,1.45,.5],[.32,1.65,.35]];
 return readRoute({format:ROUTE_FORMAT,host,name:host+' / custom route',points:points.map(([x,y,z])=>({x,y,z}))},host);
}
