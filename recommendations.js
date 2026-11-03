'use strict';
(() => {
 const form=document.querySelector('#recommendation-form');if(!form)return;
 const fields=form.querySelector('fieldset'),title=form.querySelector('#recommendation-title'),link=form.querySelector('#recommendation-link'),detail=form.querySelector('#recommendation-detail'),area=form.querySelector('#recommendation-area'),kind=form.querySelector('#recommendation-type'),status=form.querySelector('#recommendation-status');
 let areaEdited=false;
 function selectedArea(){
  const node=document.querySelector('#phone-data');if(!node)return '';
  const places=JSON.parse(node.textContent).places,key=document.querySelector('#phone-city')?.value||document.querySelector('meta[name="ferdant-city"]')?.content||'';
  const city=places.cities.find(c=>c[0]===key);return city?city[1]+', '+places.counties[city[2]]+' County':key.startsWith('county:')&&places.counties[key.slice(7)]?places.counties[key.slice(7)]+' County':'';
 }
 function updateArea(){if(!areaEdited)area.value=selectedArea();}
 function validate(){
  title.setCustomValidity(title.value.trim()?'':'Add a resource name, correction or idea.');
  detail.setCustomValidity(detail.value.trim()?'':'Explain why it helps or what should change.');
  link.setCustomValidity('');
  if(link.value.trim()){try{const url=new URL(link.value.trim());if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();}catch{link.setCustomValidity('Use a public http or https link without sign-in details.');}}
  return form.reportValidity();
 }
 function draft(){
  return ['FERDANT RECOMMENDATION DRAFT - NOT SUBMITTED','',
   'Type: '+kind.selectedOptions[0].textContent,'Recommendation: '+title.value.trim(),
   'City or area: '+(area.value.trim()||'Not specified'),'Public source: '+(link.value.trim()||'Not provided'),'',
   'Why it helps / what needs changing:',detail.value.trim(),'',
   'Prepared from: '+(document.querySelector('link[rel="canonical"]')?.getAttribute('href')||'Ferdant resource page'),
   'Viewed location: '+(selectedArea()||'California / no city selected'),'',
   'This is a local draft. It has not been received, verified or added to the website.'].join('\r\n');
 }
 area.addEventListener('input',()=>{areaEdited=true;});
 for(const input of [title,link,detail])input.addEventListener('input',()=>{input.setCustomValidity('');status.textContent='';});
 form.addEventListener('input',()=>{status.textContent='';});form.addEventListener('change',()=>{status.textContent='';});
 document.addEventListener('ferdant:location',()=>{updateArea();status.textContent='';});updateArea();
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!validate())return;
  const blob=new Blob([draft()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ferdant-recommendation-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent='Draft downloaded. It has not been sent.';
 });
 form.querySelector('#copy-recommendation').addEventListener('click',async()=>{
  if(!validate())return;
  try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(draft());status.textContent='Draft copied. It has not been sent.';}
  catch{status.textContent='Copy is unavailable in this browser. Use Download draft (TXT).';}
 });
 form.addEventListener('reset',()=>{areaEdited=false;for(const input of [title,link,detail])input.setCustomValidity('');status.textContent='';setTimeout(updateArea,0);});
 fields.disabled=false;
})();
