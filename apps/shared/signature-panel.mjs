import {SignatureSession} from './signature-session.mjs';
const labels={verified:'Signature valid for these exact package bytes.', 'signature-invalid':'Signature invalid.', 'package-hash-mismatch':'Package hash mismatch.', 'expected-key-mismatch':'Signature valid; expected key does not match.', 'malformed-package':'Malformed package or invalid artifact receipt.', 'malformed-envelope':'Malformed detached signature.', 'invalid-expected-key':'Invalid expected fingerprint: enter 64 hexadecimal characters or leave blank.', 'crypto-unavailable':'Ed25519 verification unavailable on this platform.'};
export function mountSignaturePanel(root){
 // Fixed markup only. All imported data is rendered through textContent.
 root.innerHTML=`<summary>Package signature check</summary>
 <p>Check exact package bytes against an included public key. Publisher identity is not established; installation is not performed; execution admission is unchanged.</p>
 <label for="signature-package-file">Stone package (maximum 256 KiB)</label><input id="signature-package-file" type="file" accept=".json,application/json">
 <label for="signature-file">Detached signature (maximum 8 KiB)</label><input id="signature-file" type="file" accept=".json,application/json">
 <label for="signature-expected-key">Expected public-key SHA-256 fingerprint (optional)</label><input id="signature-expected-key" type="text" maxlength="128" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="signature-key-help">
 <p id="signature-key-help">Obtain the fingerprint independently. A match proves key equality only, never identity or authority. Whitespace at the ends and hexadecimal letter case are ignored. Blank means no expectation.</p>
 <div class="run-controls"><button id="signature-verify" type="button" disabled>Verify</button><button id="signature-cancel" type="button">Stop / clear</button><button id="signature-export" type="button" disabled>Export result</button></div>
 <p id="signature-status" role="status" aria-live="polite"></p><p id="signature-key-state"></p>
 <details id="signature-details"><summary>Public receipt details</summary><pre id="signature-report"></pre></details>`;
 const $=id=>root.querySelector('#'+id);
 const session=new SignatureSession(undefined,state=>{
  $('signature-status').textContent=labels[state.status]??state.status;
  const r=state.report;
  $('signature-key-state').textContent=r?`Expected key: ${r.expectedKeyMatch===null?(state.expectedKey.trim()?'not evaluated':'not provided'):r.expectedKeyMatch?'matches (key equality only)':'does not match'}. Public-key fingerprint: ${r.publicKeyFingerprint??'not available'}. Publisher identity: not established.`:'';
  $('signature-report').textContent=r?JSON.stringify(r,null,2):'';
  $('signature-export').disabled=!r||state.busy;
  $('signature-verify').disabled=!state.package||!state.signature||state.busy||!session.onHost||session.disposed;
  if(!state.package)$('signature-package-file').value='';if(!state.signature)$('signature-file').value='';
  $('signature-expected-key').value=state.expectedKey;
 });
 for(const [id,kind] of [['signature-package-file','package'],['signature-file','signature']]){
  $(id).onchange=()=>session.select(kind,$(id).files?.[0]??null);
  $(id).oncancel=()=>{$(id).value='';session.select(kind,null);};
 }
 $('signature-expected-key').oninput=()=>session.expect($('signature-expected-key').value);
 $('signature-verify').onclick=()=>session.verify();$('signature-cancel').onclick=()=>session.cancel();
 $('signature-export').onclick=()=>{
  if(!session.state.report||session.state.busy||!session.onHost||session.disposed)return;
  let url;
  try{url=URL.createObjectURL(new Blob([JSON.stringify(session.state.report,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='STONE-package-signature-report.json';document.body.append(a);a.click();a.remove();}
  catch{$('signature-status').textContent='Result export failed.';}
  finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),0);}
 };
 session.emit();return {setHost:value=>session.setHost(value),dispose:()=>session.dispose()};
}
