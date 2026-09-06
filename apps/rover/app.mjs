import {createView} from './scene.mjs';
import {createClient} from './client.mjs';
import {STONES,getStone} from '/rover/stones.mjs';
import {makeReplay,MACHINE,ENGINE} from '/rover/contract.mjs';
const $=id=>document.getElementById(id),text=(id,value)=>{if($(id).textContent!==String(value))$(id).textContent=String(value);};
const view=createView($('viewport'),$('plan'));
text('renderer-state',view.supported?'Three.js / WebGL 2':'Plan / WebGL unavailable');
let client=null,generation=0,busy=false,phase='loading',selected='rover.flow',desired=selected,course='ramp-lane',current=null,history=[],actions=[],measurements=null,comparison=[],replayIndex=0,replayPrior='paused',lastTime=0,accumulator=0,raf;
const cards=[...document.querySelectorAll('[data-stone]')];
const labels={loading:'Initialising engine',ready:'Ready / '+selected,paused:'Paused / state retained',running:'Live / '+selected,stopped:'Stopped / worker terminated',complete:'Goal reached / stopped',error:'Execution stopped',replay:'Verified engine replay'};
function controls(){
 document.body.dataset.phase=phase;document.body.dataset.busy=String(busy);
 $('start').disabled=busy||!['ready','paused'].includes(phase);$('pause').disabled=phase!=='running';$('step').disabled=busy||!['ready','paused'].includes(phase);$('stop').disabled=['stopped','loading','error'].includes(phase)&&!busy;
 $('reset').disabled=false;$('course').disabled=busy;$('compare').disabled=busy||['loading','running','replay'].includes(phase);$('replay').disabled=busy||history.length<2||['running','replay','loading'].includes(phase);$('scrub').disabled=history.length<2||busy||['running','loading'].includes(phase);
 $('export').disabled=actions.length===0;$('export-results').disabled=!comparison.length;$('live').disabled=!current||busy||phase==='running';
 $('scrub').max=String(Math.max(0,history.length-1));text('record-state',actions.length?actions.length+' decisions':'No frames yet');
 text('run-state',phase==='running'?'Live / '+getStone(selected).name:phase==='ready'?'Ready / '+getStone(selected).name:labels[phase]??phase);
 cards.forEach(c=>{const active=c.dataset.stone===selected;c.setAttribute('aria-pressed',String(active));c.disabled=phase==='loading'||phase==='replay';c.querySelector('.stone-state').textContent=active?'Installed':c.dataset.stone===desired?'Queued':'Available';});
 const s=getStone(selected);text('passport-name',s.name);text('passport-description',s.description);
}
function show(sample,index=history.length-1){if(!sample)return;const f=sample.frame,o=f.observation;view.update(sample,history,index);text('time',f.timeSeconds.toFixed(2));text('speed',Math.hypot(o.linearVelocity.x,o.linearVelocity.y,o.linearVelocity.z).toFixed(2));text('height',o.position.y.toFixed(2));text('contacts',o.wheelContacts.filter(Boolean).length+' / 4');text('tick',o.tick);$('scrub').value=String(index);}
function fail(message){phase='error';busy=false;client?.close();client=null;$('error').hidden=false;$('error').textContent=message;controls();}
function recording(){return {format:'stone.rover.session/0.1',tape:makeReplay(course,actions.slice()),assignments:history.slice(1).map(x=>x.appliedStoneId),metrics:measurements};}
async function restart(){
 const g=++generation;client?.close();client=createClient();phase='loading';busy=true;history=[];actions=[];comparison=[];measurements=null;current=null;selected=desired;course=$('course').value;$('error').hidden=true;$('results').replaceChildren();const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='Run a comparison to see measured results.';tr.append(td);$('results').append(tr);view.compare([]);view.setCourse(course);controls();
 try{const s=await client.request('start',{courseId:course,stoneId:selected});if(g!==generation)return;current=s;history=[s];phase='ready';busy=false;document.body.dataset.ready='true';show(s);controls();}catch{if(g===generation)fail('Engine startup failed. Verify the pinned Rapier installation, then Reset.');}
}
async function advance(n){const g=generation;busy=true;controls();try{const r=await client.request('advance',{steps:n});if(g!==generation)return;current=r.snapshot;history.push(...r.frames);actions.push(...r.actions);measurements=r.metrics;selected=current.stoneId;if(current.frame.status!=='running')phase=current.frame.status==='succeeded'?'complete':'error';show(current);if(phase==='error'){$('error').hidden=false;$('error').textContent='Simulation ended: '+current.frame.status;}}catch{if(g===generation)fail('Decision execution failed or exceeded its deadline. The last acknowledged recording is retained.');}finally{if(g===generation){busy=false;controls();}}}
async function install(id){getStone(id);desired=id;if(busy||phase==='loading'){controls();return;}if(!client||['stopped','error'].includes(phase)){controls();text('run-state','Stone queued / Reset to install');return;}if(phase==='replay')return;
 const g=generation;busy=true;controls();try{const next=await client.request('select',{stoneId:id});if(g!==generation)return;current=next;selected=current.stoneId;show(current);}catch{if(g===generation)fail('The requested Stone could not be installed.');}finally{if(g===generation){busy=false;controls();}}
}
function stop(){generation++;client?.close();client=null;busy=false;phase='stopped';controls();}
async function replay(){const g=generation;replayPrior=phase;busy=true;controls();try{
 if(!client)client=createClient();const r=await client.request('replay',{recording:JSON.stringify(recording())});if(g!==generation)return;
 if(r.frames.length!==history.length||r.frames.some((f,i)=>JSON.stringify(f.frame)!==JSON.stringify(history[i].frame)||JSON.stringify(f.visual)!==JSON.stringify(history[i].visual)))throw new Error('Replay mismatch');
 phase='replay';replayIndex=0;show(history[0],0);text('record-state','Verified replay / '+actions.length+' decisions');
 }catch{if(g===generation){$('error').hidden=false;$('error').textContent='Replay could not be verified. No successful replay is claimed.';}}finally{if(g===generation){busy=false;controls();}}
}
async function compare(){const g=generation;busy=true;controls();text('run-state','Comparing / identical machine');try{
 if(!client)client=createClient();
 const measured=await client.request('compare',{courseId:course});if(g!==generation)return;comparison=measured;$('results').replaceChildren();
 for(const r of comparison){const tr=document.createElement('tr');const fields=[r.name,r.status==='succeeded'?'Goal reached':r.status,r.seconds.toFixed(2),r.peakSpeed.toFixed(2),r.throttleImpulseNs.toFixed(1),String(r.chassisContacts)];fields.forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===0)td.dataset.style=r.id.split('.')[1];tr.append(td);});$('results').append(tr);}view.compare(comparison);
 }catch{if(g===generation){$('error').hidden=false;$('error').textContent='Comparison failed. Only completed measurements are displayed.';}}finally{if(g===generation){busy=false;controls();}}
}
function download(name,data){try{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{$('error').hidden=false;$('error').textContent='Download could not be created. Your recording is retained.';}}
function animate(now){raf=requestAnimationFrame(animate);const delta=Math.min((now-lastTime)/1000,.1);lastTime=now;
 if(phase==='replay'){accumulator+=delta;if(accumulator>=MACHINE.dt){const n=Math.max(1,Math.floor(accumulator/MACHINE.dt));accumulator=0;replayIndex=Math.min(history.length-1,replayIndex+n);show(history[replayIndex],replayIndex);if(replayIndex===history.length-1){phase=replayPrior;controls();text('run-state','Verified replay complete');}}return;}
 if(phase==='running'){accumulator=Math.min(accumulator+delta,.1);if(!busy){if(desired!==selected){install(desired);return;}if(accumulator>=MACHINE.dt){const n=Math.min(6,Math.floor(accumulator/MACHINE.dt));accumulator-=n*MACHINE.dt;advance(n);}}}
 else if(!busy&&desired!==selected&&['ready','paused'].includes(phase))install(desired);
}
$('start').onclick=()=>{if(!busy&&['ready','paused'].includes(phase)){phase='running';accumulator=0;show(current);controls();}};
$('pause').onclick=()=>{if(phase==='running'){phase='paused';controls();}};
$('step').onclick=()=>{if(!busy&&['ready','paused'].includes(phase)){phase='paused';advance(1);}};
$('stop').onclick=stop;$('reset').onclick=restart;$('course').onchange=restart;$('replay').onclick=replay;$('compare').onclick=compare;
$('live').onclick=()=>{if(phase==='replay')phase=replayPrior;show(current);controls();};
$('scrub').oninput=()=>{if(phase==='replay')phase=replayPrior;const i=Number($('scrub').value);show(history[i],i);controls();};
$('export').onclick=()=>download('stone-rover-session.json',recording());$('export-results').onclick=()=>download('stone-rover-comparison.json',{engine:ENGINE,course,machineVersion:MACHINE.version,results:comparison});$('passport-export').onclick=()=>download(selected+'-passport.json',getStone(selected));
for(const c of cards)c.onclick=()=>install(c.dataset.stone);
function mode(value){const result=view.setMode(value);$('view3d').setAttribute('aria-pressed',String(result==='3d'));$('viewplan').setAttribute('aria-pressed',String(result==='plan'));}
$('view3d').onclick=()=>mode('3d');$('viewplan').onclick=()=>mode('plan');$('home').onclick=()=>view.home();$('focus').onclick=()=>{mode('3d');view.focus();};$('viewport').addEventListener('rendererchange',()=>mode('plan'));
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'&&!['BUTTON','A'].includes(e.target.tagName)){e.preventDefault();if(phase==='running')$('pause').click();else $('start').click();}if(['Digit1','Digit2','Digit3'].includes(e.code)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();cards[Number(e.code.at(-1))-1].click();}if(e.code==='Escape'){e.preventDefault();stop();}if(e.code==='Home'&&e.target.closest('#viewport')){e.preventDefault();view.home();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='running'){phase='paused';controls();}});
window.addEventListener('pagehide',()=>{generation++;client?.close();cancelAnimationFrame(raf);view.dispose();});
mode(view.supported?'3d':'plan');await restart();raf=requestAnimationFrame(animate);
