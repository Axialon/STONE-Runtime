import Papa from 'papaparse';
import {readDataPackage,RUNTIME} from './package.mjs';
import {packageHash} from '../contract/stone-package.mjs';
export const LIMITS=Object.freeze({bytes:1048576,rows:5000,columns:64,cell:8192,details:100,preview:20});
export const ACTUAL_ADAPTER=Object.freeze({...RUNTIME,parser:'papaparse/5.5.3',sourceSha256:typeof __DATA_SOURCE_SHA256__==='string'?__DATA_SOURCE_SHA256__:null});
const missing=v=>v===null||v===undefined||v==='';
const empty=v=>missing(v)||typeof v==='string'&&v.trim()==='';
const scalar=v=>v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)&&(!Number.isInteger(v)||Number.isSafeInteger(v));
function bounded(table){
 if(!Array.isArray(table.headers)||table.headers.length<1||table.headers.length>LIMITS.columns||table.headers.some(x=>typeof x!=='string'||x.length>LIMITS.cell)||!Array.isArray(table.rows)||table.rows.length>LIMITS.rows)throw new TypeError('Table bounds: 1–64 columns, at most 5000 data rows and 8192 characters per cell.');
 for(const row of table.rows){if(!Array.isArray(row)||row.length>LIMITS.columns)throw new TypeError('Rows must be scalar arrays of at most 64 columns.');for(const cell of row)if(!scalar(cell)||typeof cell==='string'&&cell.length>LIMITS.cell)throw new TypeError('Nested, nonfinite, unsafe integer or oversized cell rejected.');}
 return table;
}
export function parseTable(input,format){
 if(!(input instanceof Uint8Array)||!input.byteLength||input.byteLength>LIMITS.bytes)throw new TypeError('Choose nonempty UTF-8 data no larger than 1 MiB.');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(input);
 if(format==='csv'){
  const parsed=Papa.parse(text,{header:false,dynamicTyping:false,skipEmptyLines:false,delimiter:',',comments:false});
  if(parsed.errors.length)throw new TypeError('Malformed CSV: '+parsed.errors[0].message);
  // A final record separator terminates the previous row; it is not an extra data row.
  if(/(?:\r\n|\n|\r)$/.test(text)&&parsed.data.at(-1)?.length===1&&parsed.data.at(-1)[0]==='')parsed.data.pop();
  return bounded({headers:parsed.data[0]??[],rows:parsed.data.slice(1)});
 }
 if(format!=='json')throw new TypeError('Select CSV or JSON explicitly.');
 const data=JSON.parse(text);
 if(data&&typeof data==='object'&&!Array.isArray(data)){
  if(Object.keys(data).length!==3||data.format!=='stone.data-grid/0.1'||!Object.hasOwn(data,'headers')||!Object.hasOwn(data,'rows'))throw new TypeError('JSON object must be a stone.data-grid/0.1 grid.');
  return bounded({headers:data.headers,rows:data.rows});
 }
 if(!Array.isArray(data)||data.length>LIMITS.rows)throw new TypeError('JSON must be a bounded array of flat records, scalar rows, or a documented grid.');
 if(!data.length)return bounded({headers:['value'],rows:[]});
 if(data.every(v=>v&&typeof v==='object'&&!Array.isArray(v))){
  const names=new Set();for(const record of data)for(const [key,value] of Object.entries(record)){if(!scalar(value))throw new TypeError('JSON records must be flat; nested, nonfinite and unsafe integer values rejected.');names.add(key);if(names.size>LIMITS.columns)throw new TypeError('Too many columns.');}
  const headers=[...names];return bounded({headers,rows:data.map(r=>headers.map(k=>Object.hasOwn(r,k)?r[k]:null))});
 }
 if(data.every(Array.isArray)){const width=Math.max(1,...data.map(r=>r.length));return bounded({headers:Array.from({length:Math.min(width,65)},(_,i)=>'column'+(i+1)),rows:data});}
 if(data.every(scalar))return bounded({headers:['value'],rows:data.map(v=>[v])});
 throw new TypeError('JSON table mixes row kinds or includes nested, nonfinite or unsafe integer values.');
}
function shape(v){
 if(missing(v))return null;if(typeof v!=='string')return typeof v;
 if(/^[+-]?\d+(?:\.\d+)?$/.test(v))return 'numeric-looking string';
 if(/^\d{4}-\d{2}-\d{2}$/.test(v))return 'date-looking string';
 return 'text';
}
const snippet=v=>typeof v==='string'&&v.length>160?v.slice(0,160)+'…':v;
const LIMITATIONS=Object.freeze(['Value shapes are conservative syntax observations, not semantic truth or validated dates.','No ID, date, number or text coercion; duplicate rows and header names are preserved.','JSON numeric lexical formatting and duplicate object keys are not preserved by JSON.parse.','Preview cells over 160 characters and displayed findings/examples are abbreviated; totals cover the full admitted table.','Original bytes remain in this tab only. Undo records in a proposal restore the parsed grid, not original file encoding.','Formula-like strings remain inert text in JSON; no CSV formula safety is claimed.','Declared resource budgets are metadata; worker termination and fixed input bounds are the runtime controls.']);
export async function executeData(input,format,packageText){
 const admitted=await readDataPackage(packageText);if(!admitted.compatibility.compatible)throw new TypeError('Data package not admitted: '+admitted.compatibility.errors.map(e=>e.message).join(' '));
 const table=parseTable(input,format),config=admitted.config,enabled=new Set(config.checks),width=Math.max(table.headers.length,...table.rows.map(r=>r.length));
 const counts={rows:table.rows.length,columns:width,missingCells:0,raggedRows:0,blankHeaders:0,duplicateHeaders:0,whitespaceCells:0,duplicateRows:0,mixedColumns:0,formulaCells:0};
 const details=[];let total=0;const add=(check,row,column,value)=>{if(!enabled.has(check))return;total++;if(details.length<LIMITS.details)details.push({check,row,column,value:snippet(value)});};
 const headers=new Set();table.headers.forEach((v,i)=>{if(!v.trim()){counts.blankHeaders++;add('headers',null,i,'blank header');}if(headers.has(v)){counts.duplicateHeaders++;add('headers',null,i,'duplicate header: '+v);}headers.add(v);});
 const seen=new Set(),shapes=Array.from({length:width},()=>new Set()),undo=[],examples=[],normalized=[];let trimmedCells=0,omittedRows=0,changeTotal=0;
 const example=x=>{changeTotal++;if(examples.length<LIMITS.details)examples.push({...x,...('column'in x?{before:snippet(x.before),after:snippet(x.after)}:{before:x.before.slice(0,8).map(snippet)})});};
 table.rows.forEach((row,r)=>{
  if(row.length!==table.headers.length){counts.raggedRows++;add('ragged',r,null,row.length+' cells; '+table.headers.length+' headers');}
  const key=JSON.stringify(row);if(seen.has(key)){counts.duplicateRows++;add('duplicates',r,null,'exact duplicate row');}seen.add(key);
  const next=row.slice();
  for(let c=0;c<width;c++){
   const value=row[c];if(missing(value)){counts.missingCells++;add('missing',r,c,value??null);}const s=shape(value);if(s)shapes[c].add(s);
   if(typeof value==='string'){
    if(value!==value.trim()){counts.whitespaceCells++;add('whitespace',r,c,value);if(config.trimStrings){next[c]=value.trim();trimmedCells++;const change={kind:'trim',row:r,column:c,before:value,after:next[c]};undo.push(change);example(change);}}
    if(/^[\s]*[=+\-@]/.test(value)){counts.formulaCells++;add('formula',r,c,value);}
   }
  }
  if(config.omitEmptyRows&&next.every(empty)){omittedRows++;const change={kind:'omit-row',row:r,before:next};undo.push(change);example(change);}else normalized.push(next);
 });
 shapes.forEach((s,c)=>{if(s.size>1){counts.mixedColumns++;add('mixed',null,c,[...s].join(' / '));}});
 const receipt={dataset:{bytes:input.byteLength,sha256:await packageHash(input),format},package:admitted.source,artifact:admitted.artifacts[0],adapter:ACTUAL_ADAPTER,model:null,actualExecution:'local'};
 const changes={trimmedCells,omittedRows,total:changeTotal,shown:examples.length,examples};
 const report={format:'stone.data-report/0.1',receipt,checks:config.checks,counts,findings:{total,shown:details.length,details},changes,limitations:LIMITATIONS};
 const proposal=config.trimStrings?{format:'stone.data-proposal/0.1',receipt,grid:{format:'stone.data-grid/0.1',headers:table.headers.slice(),rows:normalized},undo,changes,limitations:LIMITATIONS}:null;
 // Serialize once in the worker; this exact compact UTF-8 payload is the UI download.
 let gridExport=null;
 if(proposal){
  const text=JSON.stringify(proposal.grid),size=new TextEncoder().encode(text).byteLength,available=size<=LIMITS.bytes;
  const metadata={available,bytes:size,limitBytes:LIMITS.bytes,reason:available?'Compact JSON grid is ready to reimport. Receipt and undo are in the separate evidence download.':`Normalized grid export withheld: ${size} UTF-8 bytes exceeds the 1 MiB reimport limit. Original data, complete report and proposal evidence remain available. No data was truncated.`};
  gridExport={...metadata,text:available?text:null};report.normalizedExport=metadata;
 }
 return {report,proposal,gridExport,preview:{headers:table.headers.slice(0,8).map(snippet),rows:table.rows.slice(0,LIMITS.preview).map(r=>r.slice(0,8).map(snippet)),totalRows:table.rows.length,totalColumns:width,shownRows:Math.min(table.rows.length,LIMITS.preview),shownColumns:Math.min(width,8)}};
}
