import {inspectModelPackage} from '/packages/learned-rover/package-data.mjs';
import {MAX_PACKAGE_BYTES} from '/packages/contract/stone-package.mjs';
/** Local draft inspection. Only the explicit activation callback can reset execution. */
export function createStoneFilePicker(element,{activate,builtin,exportFile}){
 let sequence=0,reading=false,operating=false,disposed=false,draft=null,context={busy:false,phase:'loading',modelMode:false,hasState:false,routeActive:false,source:null};
 element.innerHTML='<details class="stone-file-panel"><summary><span>PORTABLE STONE</span><strong>Save, inspect and activate</strong><small id="package-source">No supplied model active</small></summary><div class="stone-file-content"><label class="stone-file-input">Stone data file<input id="package-file" type="file" accept=".json,application/json"></label><div class="stone-file-actions"><button type="button" id="package-activate" disabled>Activate inspected Stone & reset</button><button type="button" id="package-export" disabled>Save FLOW Stone file</button><button type="button" id="package-builtin" hidden>Use built-in model source</button></div><p id="package-status" role="status">A file is data, not permission to execute. Select a file to inspect it locally.</p><p class="fine">First version: the reviewed FLOW model only, with its preinstalled runtime. No code installer or publisher authentication. File selection does not move the machine. Export to keep a copy; this tab does not persist uploads across refresh.</p></div></details>';
 const $=id=>element.querySelector('#'+id),text=(id,v)=>{$(id).textContent=v;};
 function refresh(){if(disposed)return;document.body.dataset.packageBusy=String(reading);const blocked=reading||operating||context.busy||['running','replay','loading'].includes(context.phase);
  $('package-activate').disabled=blocked||context.routeActive||!draft?.inspection.compatibility.compatible;
  $('package-export').disabled=blocked||!context.modelMode||!context.hasState||context.phase==='error';
  $('package-builtin').hidden=!context.source;$('package-builtin').disabled=blocked;
  text('package-source',context.source?(context.modelMode&&context.hasState?'Supplied Stone / ':'Supplied source selected / ')+context.source.sha256.slice(0,12):context.modelMode&&context.hasState?'Built-in pinned model':'No supplied model active');
 }
 $('package-file').onchange=async()=>{if(disposed)return;const file=$('package-file').files[0],g=++sequence;draft=null;reading=true;text('package-status','Reading file / no inspected draft available.');element.querySelector('details').open=true;refresh();
  try{if(!file){text('package-status','No file selected.');return;}if(!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_PACKAGE_BYTES||typeof file.arrayBuffer!=='function')throw new Error('Choose a UTF-8 JSON Stone file no larger than 256 KiB.');
   const bytes=await file.arrayBuffer();if(g!==sequence)return;
   if(!(bytes instanceof ArrayBuffer)||bytes.byteLength!==file.size||bytes.byteLength>MAX_PACKAGE_BYTES)throw new Error('File size changed or exceeded its limit.');
   const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);const inspection=await inspectModelPackage(raw,'rover');if(g!==sequence)return;
   draft={text:raw,inspection};text('package-status',file.name.slice(0,90)+' · '+file.size+' bytes · '+(inspection.compatibility.compatible?'Matches the reviewed model; activate explicitly.':'Not admitted by this runtime.')+' Publisher not authenticated.');
  }catch(e){if(g===sequence){draft=null;text('package-status','File rejected: '+e.message);}}
  finally{if(g===sequence){reading=false;refresh();}}
 };
 $('package-file').oncancel=()=>{if(disposed)return;$('package-file').value='';return $('package-file').onchange();};
 async function operate(button,action,message){
  if(disposed||$(button).disabled)return;const g=sequence;operating=true;refresh();
  try{await action();}catch{if(!disposed&&g===sequence)text('package-status',message);}
  finally{operating=false;refresh();}
 }
 $('package-activate').onclick=()=>{if(!draft)return;const copy=draft;return operate('package-activate',()=>activate({text:copy.text,receipt:copy.inspection.source}),'Activation failed; no alternative model is implied.');};
 $('package-builtin').onclick=()=>operate('package-builtin',builtin,'Built-in source failed; the file is not used as a hidden fallback.');
 $('package-export').onclick=()=>operate('package-export',exportFile,'The Stone file could not be exported.');
 refresh();return Object.freeze({setContext(value){if(disposed)return;context=value;refresh();},dispose(){
  if(disposed)return;sequence++;reading=false;operating=false;draft=null;
  document.body.dataset.packageBusy='false';
  for(const id of ['package-file','package-activate','package-builtin','package-export']){$(id).disabled=true;$(id).onchange=null;$(id).oncancel=null;$(id).onclick=null;}
  disposed=true;
 }});
}
