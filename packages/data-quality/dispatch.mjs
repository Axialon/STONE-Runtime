/** Bounded metadata-only dispatch. FLOW continues through its existing admission path. */
export function usesDataAdapter(text){
 if(typeof text!=='string'||text.length>2097152)return false;
 let p;try{p=JSON.parse(text);}catch{return false;}
 return p?.format==='stone.package/0.1'&&(p.runtime?.adapter==='stone.data-quality/0.1'||p.manifest?.task==='digital-data-quality'||p.manifest?.compatibility?.profile==='stone.digital.data-quality/0.1');
}
