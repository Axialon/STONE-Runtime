export const DT=1/120, LIMIT=7200;
export const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const v=(x=0,y=0,z=0)=>({x,y,z});
export const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
export const mul=(a,k)=>v(a.x*k,a.y*k,a.z*k);
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const cross=(a,b)=>v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const length=a=>Math.hypot(a.x,a.y,a.z);
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const limit=(a,n)=>mul(a,Math.min(1,n/(length(a)||1)));
export const rotate=(q,a)=>add(a,add(mul(cross(v(q.x,q.y,q.z),a),2*q.w),mul(cross(v(q.x,q.y,q.z),cross(v(q.x,q.y,q.z),a)),2)));
export const qmul=(a,b)=>({x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z});
export const identity=()=>({x:0,y:0,z:0,w:1});
export const pose=b=>({position:{...b.translation()},rotation:{...b.rotation()}});
export function fields(o,keys){if(!o||typeof o!=='object'||![null,Object.prototype].includes(Object.getPrototypeOf(o)))return false;const d=Object.getOwnPropertyDescriptors(o);return Reflect.ownKeys(d).length===keys.length&&keys.every(k=>Object.hasOwn(d,k)&&Object.hasOwn(d[k],'value')&&d[k].enumerable);}
export function vector(o){return fields(o,['x','y','z'])&&Object.values(o).every(Number.isFinite);}
export function finitePose(p){return vector(p.position)&&fields(p.rotation,['x','y','z','w'])&&Object.values(p.rotation).every(Number.isFinite);}
export function boundedArray(a,n,min,max){return Array.isArray(a)&&Object.getPrototypeOf(a)===Array.prototype&&a.length===n&&Reflect.ownKeys(a).length===n+1&&Array.from({length:n},(_,i)=>Object.getOwnPropertyDescriptor(a,String(i))).every(d=>d&&Object.hasOwn(d,'value')&&Number.isFinite(d.value)&&d.value>=min&&d.value<=max);}
