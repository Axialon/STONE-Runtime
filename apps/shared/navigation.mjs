const hosts=[['rover','Rover','Ground routes'],['drone','Drone','Flight routes'],['humanoid','Humanoid','Reach targets'],['digital','Digital','Local / cloud']];
/** Clear reciprocal navigation; fixed local apps, never a user-selected remote endpoint. */
export function createNavigation(element,{app,current,onChoose}={}){
 const urls=workbenchUrls(),field=new URL(urls.field),rover=new URL(urls.rover);
 element.replaceChildren();
 for(const [id,name,detail] of hosts){
  const local=app==='field'&&id!=='rover',node=document.createElement(local?'button':'a');
  if(local){node.type='button';node.dataset.host=id;node.onclick=()=>onChoose?.(id);}
  else{const url=id==='rover'?new URL(rover):new URL(field);if(id!=='rover')url.hash=id;node.href=url.href;if(id==='rover')node.id='rover-link';}
  node.dataset.destination=id;const number=document.createElement('span'),label=document.createElement('strong'),small=document.createElement('small');
  number.textContent=String(hosts.findIndex(x=>x[0]===id)+1).padStart(2,'0');label.textContent=name;small.textContent=detail;node.append(number,label,small);element.append(node);
 }
 function select(id){for(const n of element.children){const active=n.dataset.destination===id;n.classList.toggle('active',active);if(n.tagName==='BUTTON')n.setAttribute('aria-pressed',String(active));if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}}
 select(current);
 return Object.freeze({select,fieldUrl:field.href,roverUrl:rover.href});
}
export function hostFromHash(hash){return ['drone','humanoid','digital'].includes(hash.slice(1))?hash.slice(1):'humanoid';}

export function workbenchUrls(){return Object.freeze({field:'http://127.0.0.1:4174/',rover:'http://127.0.0.1:4173/'});}
