import {createNavigation,hostFromHash} from '/shared/navigation.mjs';
import {createRouteEditor} from '/shared/route-editor.mjs';
import {manifestFor} from '/packages/contract/reference.mjs';
import {readStoneFile} from '/packages/lab/file-input.mjs';
import {createView} from './scene.mjs';
import {createClient} from './client.mjs';
import {getPackage,packagesFor} from '/packages/lab/registry.mjs';
const $=id=>document.getElementById(id),text=(id,value)=>{$(id).textContent=String(value);};
const view=createView($('viewport'),$('plan'));
let host='humanoid',selected='humanoid.fluid',desired=selected,phase='loading',busy=false,generation=0,client=null;
let current=null,history=[],actions=[],template=null,result=null,replayPrior='paused',replayIndex=0,lastTime=0,accumulator=0,raf;
let auditText=null,activeRoute=null;const fixedTasks=new Map();
const navigation=createNavigation($('host-navigation'),{app:'field',current:host,onChoose:chooseHost});
const routeEditor=createRouteEditor($('route-editor'),{onApply:async route=>{if(!activeRoute)fixedTasks.set(host,$('task').value);activeRoute=route;configureTask();await restart();}});
function configureTask(){const old=$('task').querySelector('[value="custom-route"]');old?.remove();if(activeRoute){$('task').add(new Option('Custom: '+activeRoute.name,'custom-route'));$('task').value='custom-route';}else if(fixedTasks.has(host))$('task').value=fixedTasks.get(host);}
const physical=()=>host==='humanoid'||host==='drone';
const error=message=>{$('error').hidden=false;text('error',message);};
const hideError=()=>{$('error').hidden=true;};
function terminate(){generation++;client?.close();client=null;busy=false;}
function getClient(){return client??=createClient();}
function validState(s){if(!s||s.frame?.host!==host||s.frame?.profile!==getPackage(s.stoneId).profile||!Number.isSafeInteger(s.frame.tick)||s.frame.tick<0||s.frame.tick>7200||!Number.isFinite(s.frame.seconds))throw new Error('Invalid worker state.');return s;}
function passport(){const p=getPackage(selected);$('export-manifest').disabled=p.execution!=='local'||p.availability!=='available';text('manifest-note',p.execution==='local'?'Core v0.2 includes compatibility, permissions, budgets and offline requirements.':'A complete remote manifest needs a configured model and provider. None is fabricated here.');text('passport-title',p.name);text('passport-limits',p.limits);$('passport').replaceChildren();
 for(const [key,value] of Object.entries({Host:p.host,Profile:p.profile,Version:p.version,Execution:p.execution,Availability:p.availability,Implementation:p.implementation,Model:p.model.kind,Tools:p.tools.join(', ')})){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;row.append(dt,dd);$('passport').append(row);}}
function cards(){
 $('cards').replaceChildren();const ps=packagesFor(host);text('package-count',ps.length+' STONES');
 ps.forEach((p,i)=>{const b=document.createElement('button');b.className='stone';b.dataset.package=p.id;b.dataset.identity=String(i+1);
 for(const [cls,value] of [['number',String(i+1).padStart(2,'0')],['shape',''],['name',p.name],['description',p.description],['state','Available']]){const s=document.createElement('span');s.className=cls;s.textContent=value;if(cls==='shape')s.setAttribute('aria-hidden','true');b.append(s);}b.onclick=()=>install(p.id);$('cards').append(b);});passport();}
function show(sample,index=history.length-1){if(!sample)return;const f=sample.frame,p=f.tip??f.position;
 view.update(sample,history,index);text('tick',f.tick);text('time',f.seconds.toFixed(2));text('speed',Math.hypot(f.velocity.x,f.velocity.y,f.velocity.z).toFixed(2));text('completed',f.completed+' / '+f.targets.length);text('hold',f.hold);
 text('coordinates',`${host==='drone'?'BODY':'TIP'} / X ${p.x.toFixed(3)} · Y ${p.y.toFixed(3)} · Z ${p.z.toFixed(3)} / ${sample.stoneId}`);$('scrub').value=String(index);}
function recording(){if(!template||!current)throw new Error('No recording.');return {...template,finalStoneId:current.stoneId,finalStatus:current.frame.status,actions:actions.slice(),assignments:history.slice(1).map(s=>s.stoneId)};}
function controls(){
 document.body.dataset.host=host;document.body.dataset.phase=phase;document.body.dataset.busy=String(busy);const live=physical(),p=getPackage(selected);$('compare').hidden=!live;
 for(const id of ['start','step'])$(id).disabled=!live||busy||!['ready','paused'].includes(phase);
 $('pause').disabled=!live||phase!=='running';$('stop').disabled=!live||(!busy&&['stopped','complete','error'].includes(phase));$('reset').disabled=!live;
 $('task').disabled=busy||phase==='running'||!!activeRoute;$('compare').disabled=!live||busy||['loading','running','replay'].includes(phase);
 $('replay').disabled=!live||busy||history.length<2||['loading','running','replay'].includes(phase);$('live').disabled=!live||busy||phase!=='replay';
 $('scrub').disabled=!live||busy||history.length<2||['loading','running'].includes(phase);$('scrub').max=String(Math.max(0,history.length-1));
 $('export-session').disabled=!live||!actions.length;$('export-results').disabled=!result;text('record-count',actions.length+' decisions');
 const labels={running:'Live / '+selected,ready:'Ready / '+selected,complete:'Sequence complete',replay:'Verified engine replay',stopped:'Stopped / worker terminated',loading:'Initialising engine',error:'Execution failed',paused:'Paused / state retained'};text('run-state',labels[phase]??phase);
 document.querySelectorAll('[data-package]').forEach(b=>{const q=getPackage(b.dataset.package),active=q.id===selected;b.setAttribute('aria-pressed',String(active));b.disabled=live&&['loading','replay'].includes(phase);b.querySelector('.state').textContent=q.availability==='configuration-required'?(active?'Selected / needs configuration':'Needs configuration'):q.id===desired&&!active?'Queued':active?(live?'Installed':'Selected'):'Available';});
 $('run-digital').disabled=host!=='digital'||busy||p.execution==='cloud'||(p.execution==='hybrid'&&!$('local-fallback').checked);$('stop-digital').disabled=host!=='digital'||!busy;$('inspection-file').disabled=busy;$('inspection-target').disabled=busy;if(selected==='digital.audit'&&!auditText)$('run-digital').disabled=true;
 routeEditor.setLocked(busy||['running','replay'].includes(phase));
 if(live){text('compare',activeRoute?'Compare custom route ↗':host==='drone'?'Compare flight styles ↗':'Compare reach styles ↗');text('comparison-scope',activeRoute?'CUSTOM ROUTE / '+activeRoute.name+' · All styles run the same applied checkpoints. Not the fixed benchmark.':'Only equivalent fixed tasks are compared. Simulation results are not hardware certification.');}
}
function renderRows(data){$('results').replaceChildren();for(const r of data.results){const tr=document.createElement('tr');for(const value of [r.stone,r.status,r.seconds.toFixed(2),r.pathMetres.toFixed(3)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('results').append(tr);}}
function clearResult(){result=null;$('results').replaceChildren();text('report','Choose a task, then run the Stone.');}
async function restart(){
 terminate();const g=generation;selected=desired;phase='loading';busy=true;history=[];actions=[];current=null;template=null;accumulator=0;clearResult();hideError();passport();controls();
 try{const r=await getClient().request('start',{host,task:activeRoute?'custom-route':$('task').value,stoneId:selected,...(activeRoute?{route:activeRoute}:{})});if(g!==generation)return;current=validState(r.state);template=r.recording;history=[current];phase='ready';show(current);view.home();document.body.dataset.ready='true';}
 catch{if(g===generation){phase='error';error('The simulator could not start. Check local pinned dependencies and use Reset.');client?.close();client=null;}}
 finally{if(g===generation){busy=false;controls();}}
}
async function advance(n){const g=generation;busy=true;controls();
 try{const r=await getClient().request('advance',{steps:n});if(g!==generation)return;
 if(!Array.isArray(r.frames)||!Array.isArray(r.actions)||r.frames.length!==r.actions.length||r.frames.length>n)throw new Error('Invalid batch.');
 r.frames.forEach((s,i)=>{validState(s);if(s.frame.tick!==current.frame.tick+i+1)throw new Error('Nonsequential frame.');});
 validState(r.state);if(r.state.frame.tick!==current.frame.tick+r.frames.length)throw new Error('Invalid final tick.');
 current=r.state;history.push(...r.frames);actions.push(...r.actions);selected=current.stoneId;if(current.frame.status!=='running')phase=current.frame.status==='succeeded'?'complete':'error';
 if(phase==='error')error('Simulation ended: '+current.frame.status);show(current);
 }catch{if(g===generation){phase='error';error('Execution failed or exceeded its deadline. The last acknowledged recording is retained.');client?.close();client=null;}}
 finally{if(g===generation){busy=false;controls();if(desired!==selected&&['ready','paused','running'].includes(phase))void install(desired);}}
}
function configureDigital(){const p=getPackage(selected),audit=p.id==='digital.audit';text('results-title',audit?'Inspection evidence.':'Measured tool results.');$('audit-panel').hidden=!audit;$('benchmark-task-picker').hidden=audit;text('run-digital',audit?'Inspect & verify file ↗':'Run selected Stone ↗');document.querySelectorAll('.pipeline em').forEach((e,i)=>{e.textContent=(audit?['Imported JSON','Validate / reexecute','Inspection report']:['Fixed task','Measured outcomes','Useful report'])[i];});text('digital-title',p.name);text('digital-description',p.description);text('digital-mode',p.execution.toUpperCase());$('fallback-row').hidden=p.execution!=='hybrid';$('cloud-note').hidden=p.execution==='local';
 text('digital-scope',p.execution==='local'?'Local deterministic tools. No model call.':p.execution==='hybrid'?'Provider unavailable. Explicit local-only fallback is available.':'Cloud adapter exists; browser provider execution is not configured.');text('digital-state',p.execution==='local'?'Ready / local execution':p.execution==='hybrid'?'Local fallback requires consent':'Unavailable / cloud not connected');}
async function install(id){const p=getPackage(id);if(p.host!==host)return;desired=id;
 if(!physical()){terminate();selected=id;phase='ready';clearResult();hideError();passport();configureDigital();controls();return;}
 if(busy){controls();return;}if(['stopped','error','complete'].includes(phase)){controls();text('run-state','Stone queued / Reset to install');return;}if(phase==='replay')return;
 const g=generation;busy=true;controls();try{const s=await getClient().request('select',{stoneId:id});if(g!==generation)return;current=validState(s);selected=id;passport();show(current);}
 catch{if(g===generation){phase='error';error('Stone installation failed. Reset to recover.');}}
 finally{if(g===generation){busy=false;controls();}}
}
function stop(){terminate();if(current?.frame.status==='running'){current={...current,frame:{...current.frame,status:'stopped'}};history[history.length-1]={...history.at(-1),frame:current.frame};}phase='stopped';if(current)show(current);controls();}
async function replay(){const g=generation;replayPrior=phase;busy=true;hideError();controls();
 try{const r=await getClient().request('replay',{host,recording:JSON.stringify(recording())});if(g!==generation)return;
 if(r.frames.length!==history.length||r.frames.some((s,i)=>JSON.stringify(s)!==JSON.stringify(history[i]))||JSON.stringify(r.state)!==JSON.stringify(current))throw new Error('Replay diverged.');
 phase='replay';replayIndex=0;accumulator=0;show(history[0],0);
 }catch{if(g===generation)error('Replay could not be verified. No successful replay is claimed.');}
 finally{if(g===generation){busy=false;controls();}}
}
async function compare(){const g=generation;busy=true;hideError();controls();try{const r=await getClient().request('compare',activeRoute?{kind:'route',route:activeRoute}:{kind:'benchmark',host,task:$('task').value,stoneId:selected,allowLocalFallback:false});if(g!==generation)return;result=r;renderRows(r);}catch{if(g===generation)error('Comparison failed. No new measurements are displayed.');}finally{if(g===generation){busy=false;controls();}}}
async function digital(){const audit=selected==='digital.audit',g=generation,[target,task]=$('digital-task').value.split(':');busy=true;clearResult();hideError();text('digital-state','Running local reference tools…');controls();
 try{const r=await getClient().request(audit?'inspect':'compare',audit?{text:auditText,target:$('inspection-target').value}:{kind:'digital',host:target,task,stoneId:selected,allowLocalFallback:$('local-fallback').checked});if(g!==generation)return;result=r;renderRows(r);text('report',r.text+(r.notice?' — '+r.notice:'')+(audit?'\n\n'+JSON.stringify({source:r.source,verification:r.verification,authenticity:r.authenticity,compatibility:r.compatibility,summary:r.summary,errors:r.errors},null,2):''));text('digital-state',(r.valid===false?'Rejected / invalid metadata':'Completed / '+r.actualExecution)+' / no model invoked');}
 catch{if(g===generation){error(audit?'File verification failed. Check the JSON format, versions, host and recorded terminal status. No package was installed.':'The selected Digital Stone could not complete. No cloud result is implied.');text('digital-state','Failed / no new result');client?.close();client=null;}}
 finally{if(g===generation){busy=false;controls();}}
}
async function loadInspectionFile(){terminate();const g=generation,file=$('inspection-file').files[0];auditText=null;clearResult();hideError();if(!file){controls();return;}busy=true;controls();try{const value=await readStoneFile(file);if(g!==generation)return;auditText=value;text('audit-source',file.name.slice(0,100)+' · '+file.size+' bytes · not uploaded');text('digital-state','File ready / local inspection');}catch{if(g===generation){error('Choose a valid UTF-8 JSON file no larger than 2 MiB.');text('audit-source','File rejected; no evidence loaded.');}}finally{if(g===generation){busy=false;controls();}}}
function chooseHost(next){if(!['humanoid','drone','digital'].includes(next))return;terminate();host=next;selected=desired=packagesFor(host)[0].id;phase='ready';current=null;history=[];actions=[];template=null;clearResult();hideError();
 navigation.select(host);activeRoute=routeEditor.setHost(host);if(location.hash!=='#'+host)window.history.pushState(null,'','#'+host);$('humanoid-panel').hidden=!physical();$('digital-panel').hidden=physical();
 text('bay-note',physical()?'Reference rules. No trained weights.':'Local tools; cloud and hybrid are explicitly labelled.');cards();if(physical()){
 const tasks=host==='drone'?[['hover','Hover and hold'],['inspection','Inspection sequence']]:[['reach','Reach sequence'],['high-reach','High reach']];$('task').replaceChildren(...tasks.map(([value,label])=>new Option(label,value)));
 text('mechanism-title',host==='drone'?'Control in three dimensions.':'Precision in motion.');text('mechanism-label',host==='drone'?'SIMULATED FLIGHT / Q–01':'ARTICULATED REACH / H–01');text('mechanism-scope',host==='drone'?'FOUR ROTORS / SIMULATION ONLY':'ANCHORED TORSO / TWO ACTIVE JOINTS');text('speed-label',host==='drone'?'BODY SPEED':'TIP SPEED');text('hold-label',host==='drone'?'/ 36':'/ 48');text('results-title','Same machine. Different approaches.');text('compare',host==='drone'?'Compare flight styles ↗':'Compare reach styles ↗');$('viewport').setAttribute('aria-label',host==='drone'?'Simulated drone view. Drag to orbit. Arrow keys pan. Home resets the camera.':'Articulated arm view. Drag to orbit. Arrow keys pan. Home resets the camera.');$('plan').setAttribute('aria-label',host==='drone'?'Top view of recorded drone motion and waypoints':'Side view of recorded arm joints and targets');$('scrub').setAttribute('aria-label','Recorded '+host+' frame');configureTask();void restart();
 }else{configureDigital();document.body.dataset.ready='true';controls();}
}
function exportData(value,name){try{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{error('Download failed; the live state is unchanged.');}}
function setView(mode){const actual=view.setMode(mode);$('view3d').setAttribute('aria-pressed',String(actual==='3d'));$('viewplan').setAttribute('aria-pressed',String(actual==='plan'));text('renderer-status',view.supported?'Three.js / WebGL 2':'Plan / graphics unavailable');}
$('start').onclick=()=>{phase='running';accumulator=0;controls();};$('pause').onclick=()=>{phase='paused';controls();};$('step').onclick=()=>advance(1);$('stop').onclick=stop;$('reset').onclick=restart;$('task').onchange=restart;$('compare').onclick=compare;$('replay').onclick=replay;
$('live').onclick=()=>{phase=replayPrior;show(current);controls();};$('scrub').oninput=()=>{if(history.length)show(history[Number($('scrub').value)],Number($('scrub').value));};
$('home').onclick=()=>view.home();$('focus-machine').onclick=()=>view.focus();$('view3d').onclick=()=>setView('3d');$('viewplan').onclick=()=>setView('plan');$('viewport').addEventListener('rendererchange',()=>setView('plan'));
$('inspection-file').onchange=loadInspectionFile;$('inspection-target').onchange=()=>{clearResult();controls();};$('export-manifest').onclick=()=>{try{exportData(manifestFor(selected),'STONE-'+selected+'-manifest.json');}catch{error('Complete model/provider configuration is required; no manifest was invented.');}};
$('run-digital').onclick=digital;$('stop-digital').onclick=()=>{terminate();text('digital-state','Cancelled / no new result');controls();};$('local-fallback').onchange=controls;$('digital-task').onchange=()=>{terminate();clearResult();configureDigital();controls();};
$('export-session').onclick=()=>exportData(recording(),'STONE-'+host+'-session.json');$('export-results').onclick=()=>exportData(result,'STONE-results.json');$('export-passport').onclick=()=>exportData(getPackage(selected),'STONE-passport.json');
window.addEventListener('hashchange',()=>{const next=hostFromHash(location.hash);if(next!==host)chooseHost(next);});
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea,button,a')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='Escape'){if(physical())stop();else $('stop-digital').click();}else if(physical()&&e.code==='Space'){e.preventDefault();if(phase==='running')$('pause').click();else if(!$('start').disabled)$('start').click();}else if(['1','2','3'].includes(e.key)&&!['loading','replay'].includes(phase)){const p=packagesFor(host)[Number(e.key)-1];if(p)void install(p.id);}});
function animate(t){const dt=Math.min(.1,(t-lastTime)/1000||0);lastTime=t;
 if(phase==='running'&&!busy){accumulator=Math.min(.2,accumulator+dt);const n=Math.min(24,Math.floor(accumulator*120));if(n>0){accumulator-=n/120;void advance(n);}}
 if(phase==='replay'&&!busy&&!matchMedia('(prefers-reduced-motion: reduce)').matches){accumulator+=dt;const n=Math.floor(accumulator*120);if(n>0){accumulator-=n/120;replayIndex=Math.min(history.length-1,replayIndex+n);show(history[replayIndex],replayIndex);if(replayIndex===history.length-1)text('run-state','Replay complete / verified');}}
 raf=requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='running'){phase='paused';controls();}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);terminate();view.dispose();});
const initialHost=hostFromHash(location.hash);window.history.replaceState(null,'','#'+initialHost);setView('3d');chooseHost(initialHost);raf=requestAnimationFrame(animate);
