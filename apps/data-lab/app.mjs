import {CHECKS} from '../../packages/data-quality/package.mjs';
import {DataSession,WorkerClient,Preparation} from './session.mjs';
export const SAMPLE_CSV='id,name,email,stock\r\n001, Ada North ,ada@example.invalid,12\r\n002,"River, Lee",river@example.invalid,\r\n002,"River, Lee",river@example.invalid,\r\n003,Example,=INERT-TEXT,unknown\r\n,,,\r\n';
export const SAMPLE_JSON=JSON.stringify([{id:'001',name:' Ada North ',stock:12},{id:'002',name:'River, Lee',stock:null},{id:'002',name:'River, Lee',stock:null},{id:'003',name:'Example',stock:'unknown'}]);
export function mountDataLab(root){
 root.innerHTML=`<details open class="data-instrument"><summary>DATA LAB <span>Local tables / interchangeable Stones</span></summary>
 <p>Inspect a table with <strong>LENS</strong>, or use <strong>TIDY</strong> to propose reversible edge trimming and omission of empty rows. Your original is preserved. Local deterministic execution; no model, upload or refresh persistence.</p>
 <div class="data-inputs"><label>Dataset · UTF-8, maximum 1 MiB<input id="data-file" type="file" accept=".csv,.json,text/csv,application/json"></label><label>Explicit input format<select id="data-format"><option value="csv">CSV · first row is headers</option><option value="json">JSON · flat records or grid</option></select></label><label>Active Data Stone<select id="data-policy" disabled><option value="LENS">LENS · inspect</option><option value="TIDY">TIDY · normalization proposal</option><option value="imported" disabled>Imported policy</option></select></label></div>
 <div class="data-actions"><button id="data-sample">Use synthetic example</button><button id="data-run" class="primary" disabled>Run Data Stone ↗</button><button id="data-cancel">Stop / clear result</button></div>
 <button id="data-prepare-retry" type="button">Prepare / retry built-in packages</button><p id="data-setup-status" role="status">Not prepared.</p>
 <p id="data-status" role="status" aria-live="polite">Preparing preinstalled packages…</p>
 <details><summary>Inspect, activate or export a portable Data Stone</summary><label>Policy package · maximum 256 KiB<input id="data-package-file" type="file" accept=".json,application/json"></label><div class="data-actions"><button id="data-package-activate" disabled>Activate inspected policy</button><button id="data-package-export" disabled>Export active package</button></div><pre id="data-package-inspection">Import inspects metadata only. Activation is a separate action. Names, publishers and evidence are unverified declarations.</pre></details>
 <details id="data-author"><summary>Create a Data Stone</summary><p>These are unauthenticated declarations, not publisher verification. Only the existing local adapter and listed checks are available.</p>
 <form id="data-author-form"><div class="data-inputs"><label>Display name<input id="data-author-name" value="My Data Stone" required maxlength="2048"></label><label>Stable package ID<input id="data-author-id" value="digital.my-data-stone" required maxlength="2048"></label><label>Declared publisher · unauthenticated<input id="data-author-publisher" value="Unverified author" required maxlength="2048"></label></div>
 <fieldset id="data-author-checks"><legend>Enabled finding checks · choose at least one</legend>${CHECKS.map(check=>`<label class="data-check"><input id="data-author-check-${check}" type="checkbox" value="${check}" checked>${check}</label>`).join('')}</fieldset>
 <label class="data-check"><input id="data-author-trim" type="checkbox">Propose trimming string edges</label><label class="data-check"><input id="data-author-omit" type="checkbox" disabled>Also omit entirely empty rows · requires trimming</label>
 <div class="data-actions"><button id="data-author-prepare" type="submit">Create & inspect draft</button><button id="data-author-activate" type="button" disabled>Activate inspected draft</button><button id="data-author-export" type="button" disabled>Export prepared draft</button></div></form><p id="data-author-status" role="status">Creating a draft preserves the active package and current result. Activate and Run explicitly.</p><details><summary>Draft inspection / exact declarations</summary><pre id="data-author-inspection"></pre></details></details>
 <div class="data-actions"><button id="data-report-export" disabled>Export quality report JSON</button><button id="data-proposal-export" disabled>Export NEW normalized JSON grid</button><button id="data-evidence-export" disabled>Export proposal evidence · receipt + undo</button></div>
 <div id="data-preview" class="data-dark" tabindex="0" aria-label="Original data preview">Original preview appears after Run.</div><div id="data-findings" class="data-dark" aria-live="polite">Findings and reversible changes appear here.</div>
 <details><summary>Input contract and limits</summary><p>Maximum 5000 data rows, 64 columns, 8192 characters per cell. CSV preserves duplicate headers and quoted newlines. JSON accepts flat records, scalar arrays/rows, or {format: "stone.data-grid/0.1", headers: [strings], rows: [[scalars]]}. Nested values, nonfinite numbers and unsafe integers are rejected. JSON number spelling and duplicate object keys are not preserved. Formula-like strings stay text. No ID/date coercion or semantic truth claim. No CSV export.</p><p>All counts cover the complete admitted input. Preview shows at most 20 rows and 8 columns; finding and change examples show at most 100 details. Long displayed cells are abbreviated at 160 characters. The compact normalized grid can be reimported as JSON. Receipt and undo records have a separate evidence download. Grid export is withheld if its exact UTF-8 bytes exceed 1 MiB; the original and report remain available.</p></details></details>`;
 const $=id=>root.querySelector('#'+id);let presets=null,disposed=false,selectionTouched=false,onHost=false,visited=false;
 const download=(value,name)=>{if(!value)return;const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function render(s){
  $('data-setup-status').textContent=setup.state.status;$('data-prepare-retry').disabled=!onHost||setup.state.busy||!!presets;
  $('data-status').textContent=s.status+(s.result?.gridExport?.available===false?' '+s.result.gridExport.reason:'');$('data-run').disabled=s.busy||!s.bytes||!s.active;$('data-policy').disabled=!presets;
  $('data-package-activate').disabled=s.busy||!s.pending;$('data-package-export').disabled=!s.active;$('data-report-export').disabled=!s.result;$('data-proposal-export').disabled=!s.result?.gridExport?.available;$('data-evidence-export').disabled=!s.result?.proposal;
  $('data-package-inspection').textContent=s.inspection?JSON.stringify(s.inspection,null,2):'Import inspects metadata only. Explicit activation required. Declarations are unverified.';
  $('data-preview').replaceChildren();$('data-findings').replaceChildren();
  if(!s.result){$('data-preview').textContent='Original preview appears after Run.';$('data-findings').textContent='No current result. Exports require a completed run.';return;}
  const {preview:p,report:r}=s.result,caption=document.createElement('p');caption.textContent=`Original: showing ${p.shownRows} of ${p.totalRows} data rows; ${p.shownColumns} of ${p.totalColumns} columns. Long cells abbreviated.`;$('data-preview').append(caption);
  const table=document.createElement('table');table.setAttribute('aria-label','Original data, inert text');
  for(const [index,row] of [p.headers,...p.rows].entries()){const tr=document.createElement('tr');for(const value of row){const cell=document.createElement(index===0?'th':'td');cell.textContent=value===null?'null':String(value);if(index===0)cell.scope='col';tr.append(cell);}table.append(tr);}$('data-preview').append(table);
  renderFindings($('data-findings'),r);
 }
 const session=new DataSession(new WorkerClient(),render);
 const setup=new Preparation(new WorkerClient(),state=>{
  if(disposed)return;if(state.value){presets=state.value;if(!selectionTouched&&!session.state.active&&!session.state.pending&&!session.state.result)session.state.active=presets.LENS;}render(session.state);
 });
 const draft=new Preparation(new WorkerClient(),state=>{
  if(disposed)return;$('data-author-status').textContent=state.status;$('data-author-prepare').disabled=state.busy||!onHost;
  $('data-author-activate').disabled=!state.value?.inspection.compatibility.compatible||state.busy;$('data-author-export').disabled=!state.value||state.busy;
  $('data-author-inspection').textContent=state.value?JSON.stringify(state.value.inspection,null,2):'';
 });
 $('data-prepare-retry').onclick=()=>setup.prepare('presets',{});
 $('data-author-form').oninput=()=>{selectionTouched=true;draft.invalidate();$('data-author-omit').disabled=!$('data-author-trim').checked;if(!$('data-author-trim').checked)$('data-author-omit').checked=false;};
 $('data-author-form').onsubmit=e=>{e.preventDefault();selectionTouched=true;void draft.prepare('create',{name:$('data-author-name').value,id:$('data-author-id').value,publisher:$('data-author-publisher').value,config:{version:'0.1.0',checks:CHECKS.filter(check=>$('data-author-check-'+check).checked),trimStrings:$('data-author-trim').checked,omitEmptyRows:$('data-author-omit').checked}});};
 $('data-author-activate').onclick=()=>{const value=draft.state.value;if(value?.inspection.compatibility.compatible){selectionTouched=true;$('data-policy').value='imported';session.select(value.text);}};
 $('data-author-export').onclick=()=>download(draft.state.value?.text,'STONE-prepared-draft.json');
 $('data-file').onchange=()=>session.loadData($('data-file').files[0]??null);
 $('data-file').oncancel=()=>{$('data-file').value='';void session.loadData(null);};
 $('data-format').onchange=()=>session.clear('Format changed. Press Run to inspect with the selected format.');
 $('data-policy').onchange=()=>{selectionTouched=true;if(presets?.[$('data-policy').value])session.select(presets[$('data-policy').value]);};
 $('data-package-file').onchange=()=>{selectionTouched=true;$('data-policy').value='imported';void session.importPackage($('data-package-file').files[0]??null);};
 $('data-package-file').oncancel=()=>{selectionTouched=true;$('data-package-file').value='';$('data-policy').value='imported';void session.importPackage(null);};
 $('data-package-activate').onclick=()=>{try{session.activate();}catch(e){session.clear(e.message);}};
 $('data-package-export').onclick=()=>download(session.state.active,'STONE-data-policy.json');
 $('data-sample').onclick=()=>{const format=$('data-format').value;$('data-file').value='';void session.loadData(new File([format==='csv'?SAMPLE_CSV:SAMPLE_JSON],'synthetic.'+format,{type:format==='csv'?'text/csv':'application/json'}));};
 $('data-run').onclick=()=>session.run($('data-format').value);$('data-cancel').onclick=()=>stop();
 $('data-report-export').onclick=()=>download(session.state.result?.report,'STONE-data-quality-report.json');
 $('data-proposal-export').onclick=()=>{const grid=session.state.result?.gridExport;if(grid?.available)download(grid.text,'STONE-normalized-grid.json');};
 $('data-evidence-export').onclick=()=>{const r=session.state.result,p=r?.proposal;if(p)download({format:'stone.data-proposal-evidence/0.1',receipt:p.receipt,changes:p.changes,undo:p.undo,limitations:p.limitations,normalizedExport:r.report.normalizedExport},'STONE-proposal-evidence.json');};
 const stop=()=>{setup.cancel();draft.cancel();session.cancel();};root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();stop();}});
 return {stop,setHost(value){onHost=value;setup.setHost(value);draft.setHost(value);if(!value)session.cancel();else if(!visited){visited=true;void setup.prepare('presets',{});}render(session.state);draft.emit();},dispose(){disposed=true;setup.dispose();draft.dispose();session.cancel();}};
}
const CHECK_LABELS={missing:'Missing cell',ragged:'Uneven row width',headers:'Header issue',whitespace:'Edge whitespace',duplicates:'Exact duplicate row',mixed:'Mixed value shapes',formula:'Formula-like text'};
const displayValue=value=>JSON.stringify(value)??'absent';
export function resultView(report){
 return {
  metrics:[['rows','Data rows',report.counts.rows],['columns','Columns',report.counts.columns],['missing','Missing cells',report.counts.missingCells],['duplicates','Duplicate rows',report.counts.duplicateRows],['whitespace','Whitespace cells',report.counts.whitespaceCells],['findings','Selected findings',report.findings.total]],
  findings:report.findings.details.map(f=>[CHECK_LABELS[f.check],f.row===null?'Header / column summary':'Data row '+(f.row+1),f.column===null?'Whole row':'Column '+(f.column+1),displayValue(f.value)]),
  changes:report.changes.examples.map(c=>[c.kind==='trim'?'Trim edges':'Omit empty row','Data row '+(c.row+1),c.kind==='trim'?'Column '+(c.column+1):'Whole row',displayValue(c.before),c.kind==='trim'?displayValue(c.after):'Row omitted'])
 };
}
function renderFindings(root,report){
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;},view=resultView(report);
 const metrics=el('dl');metrics.id='data-metrics';for(const [id,label,value] of view.metrics){const item=el('div');item.append(el('dt',label));const count=el('dd',String(value));count.id='data-metric-'+id;item.append(count);metrics.append(item);}root.append(metrics);
 const table=(id,head,rows)=>{const wrap=el('div');wrap.className='data-table-scroll';const t=el('table');t.id=id;const tr=el('tr');head.forEach(v=>{const th=el('th',v);th.scope='col';tr.append(th);});const thead=el('thead');thead.append(tr);t.append(thead);const body=el('tbody');rows.forEach(row=>{const r=el('tr');row.forEach(v=>r.append(el('td',v)));body.append(r);});t.append(body);wrap.append(t);root.append(wrap);};
 root.append(el('h3','Findings for the selected checks'),el('p',`Showing ${report.findings.shown} of ${report.findings.total} findings. Data rows and columns start at 1; the CSV header is separate. These are syntax observations, not semantic judgments.`));
 table('data-findings-table',['Check','Row','Column','Observed value'],view.findings);if(!view.findings.length)root.append(el('p','No findings for the selected checks.'));
 root.append(el('h3','Proposed changes · original preserved'),el('p',`${report.changes.trimmedCells} cells trimmed; ${report.changes.omittedRows} empty rows omitted. Showing ${report.changes.shown} of ${report.changes.total} changes. Quoted values expose edge spaces.`));
 table('data-changes-table',['Change','Row','Column','Before','After'],view.changes);if(!view.changes.length)root.append(el('p','No normalization changes proposed.'));
 const details=el('details');details.id='data-result-details';details.append(el('summary','Exact receipt, limits and raw report JSON'),el('pre',JSON.stringify(report,null,2)));root.append(details);
}
