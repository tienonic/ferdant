'use strict';
(() => {
 const dataNode = document.querySelector('#phone-data');
 if (!dataNode) return;
 const payload = JSON.parse(dataNode.textContent), data = payload.directory, places = payload.places;
 const cities = new Map(places.cities.map(([id,name,county])=>[id,{id,name,county}]));
 const select = document.querySelector('#phone-city');
 const options = document.createDocumentFragment();
 const cityGroup = document.createElement('optgroup');cityGroup.label = 'California cities';
 for (const city of cities.values()) {
  const option = document.createElement('option');option.value = city.id;
  option.textContent = `${city.name} — ${places.counties[city.county]} County`;cityGroup.append(option);
 }
 options.append(cityGroup);
 const countyGroup = document.createElement('optgroup');countyGroup.label = 'County lookup / community not listed';
 for (const [id,name] of Object.entries(places.counties).sort((a,b)=>a[1].localeCompare(b[1]))) {
  const option = document.createElement('option');option.value = `county:${id}`;option.textContent = `${name} County — county-level contacts`;countyGroup.append(option);
 }
 options.append(countyGroup);select.append(options);

 function place(key) {
  if (cities.has(key)) return cities.get(key);
  const county = key.startsWith('county:') ? key.slice(7) : null;
  return county && places.counties[county] ? {id:key,name:`${places.counties[county]} County (county-level)`,county} : null;
 }
 function contactIds(location) {
  return [...new Set([...data.statewide,...(location ? data.countyContacts[location.county] || [] : []),...(location ? data.cityContacts[location.id] || [] : [])])];
 }
 function node(doc,tag,text,className) {
  const el=doc.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;
 }
 function render(doc,key) {
  const location = place(key), ids=contactIds(location), body=doc.querySelector('#phone-rows');
  const rows=doc.createDocumentFragment(), sources=doc.createDocumentFragment();
  for (const id of ids) {
   const contact=data.contacts[id], row=node(doc,'tr');row.dataset.contactId=id;
   const label=node(doc,'th',contact.title);label.scope='row';
   const scope=contact.scope==='Selected county' ? `${places.counties[location.county]} County` : contact.scope;
   label.append(node(doc,'small',[contact.kind,scope,contact.hours].filter(Boolean).join(' · ')));
   const cell=node(doc,'td');
   for(const ref of contact.phones) {
    const number=data.numbers[ref.number], method=node(doc,'span',null,'phone-method');
    if(ref.note)method.append(node(doc,'small',ref.note));
    const call=node(doc,'a',number.label);call.href=`tel:${number.tel}`;call.setAttribute('aria-label',`Call ${contact.title} at ${number.label}`);method.append(call);
    if(ref.text){const text=node(doc,'a',`Text ${number.label}`,'phone-text');text.href=`sms:${number.tel}`;method.append(text);}
    cell.append(method);
   }
   row.dataset.phoneSearch=[contact.title,contact.detail,contact.kind,scope,...contact.phones.map(ref=>data.numbers[ref.number].label)].join(' ').toLocaleLowerCase();
   row.append(label,cell);rows.append(row);
   const source=data.sources[contact.source], detail=node(doc,'div',null,'phone-source');
   detail.append(node(doc,'h3',contact.title),node(doc,'p',contact.detail));
   const link=node(doc,'a',source.title+' (online source)');link.href=source.url;detail.append(link);
   detail.append(node(doc,'p',`Publisher date: ${source.published || 'not stated in reviewed material'}. Checked ${data.checked}. ${source.review}`,'source-review'));
   sources.append(detail);
  }
  body.replaceChildren(rows);doc.querySelector('#phone-sources').replaceChildren(sources);
  let coverage='Showing California-wide support. Choose a city to add county and checked city contacts.';
  if(location) {
   const county=places.counties[location.county];
   coverage=`${location.name}, California. `;
   coverage+=data.countyContacts[location.county]?.length ? `County referral number included. ` : `No alternate ${county} County referral number was listed in the checked directory; the California ZIP-code routing line remains available. `;
   coverage+=data.cityNotes[location.id] || 'City-specific police, utility and other agency contacts have not been checked here. Statewide and any listed county numbers are shown.';
  }
  doc.querySelector('#phone-coverage').textContent=coverage;
  doc.querySelector('#phone-caption').textContent=`${location ? location.name : 'California'} emergency and support phone numbers other than 911`;
  const download=doc.querySelector('[data-city-download]');
  if(download) download.textContent=location ? `Download for ${location.name}` : 'Download California offline copy';
  const alertArea=doc.querySelector('#phone-local-alert');
  if(alertArea){alertArea.replaceChildren();const alert=data.alerts[location?.id];if(alert){const p=node(doc,'p',`${alert.name}: ${alert.instruction}`),link=node(doc,'a','Official alert instructions (online)');link.href=data.sources[alert.source].url;alertArea.append(p,link);}}
  filter(doc);return location;
 }
 function filter(doc) {
  const words=doc.querySelector('#phone-query').value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  let count=0;
  for(const row of doc.querySelectorAll('#phone-rows tr')){row.hidden=!words.every(word=>row.dataset.phoneSearch?.includes(word));if(!row.hidden)count++;}
  doc.querySelector('#phone-no-matches').hidden=count!==0;
 }
 const saved = document.querySelector('meta[name="ferdant-city"]')?.content || '';
 select.value=place(saved) ? saved : '';render(document,select.value);
 select.addEventListener('change',()=>{
  render(document,select.value);
  const status=document.querySelector('#phone-download-status');if(status)status.textContent='';
 });
 document.querySelector('#phone-query').addEventListener('input',()=>filter(document));
 let template;
 const download=document.querySelector('[data-city-download]');
 if(download)download.addEventListener('click',async event=>{
  if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !select.value)return;
  event.preventDefault();
  const key=select.value,location=place(key),status=document.querySelector('#phone-download-status');
  status.textContent='Preparing your city copy…';
  try {
   if(!template)template=fetch(download.href,{credentials:'omit'}).then(response=>{if(!response.ok)throw Error('Download failed');return response.text();});
   const text=await template,doc=new DOMParser().parseFromString(text,'text/html');
   if(doc.querySelector('#phone-data')?.textContent!==dataNode.textContent)throw Error('Edition changed; reload');
   doc.querySelector('meta[name="ferdant-city"]').content=key;
   // The saved rows and meta value keep the chosen city readable even with JavaScript off.
   render(doc,key);doc.querySelector('h1').textContent=`${location.name}, California — offline edition`;
   doc.title=`${location.name} — Ferdant offline`;
   const blob=new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob);
   const name=key.startsWith('county:')?places.counties[location.county]+' County':location.name;
   const slug=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   const link=document.createElement('a');link.href=url;link.download=`ferdant-${slug}-ca-${data.checked}.html`;link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   status.textContent=`Offline copy prepared for ${location.name}.`;
  } catch {
   template=undefined;status.textContent='The city copy could not be prepared. Reload this page and try again, or use the standard California download on the offline page.';
  }
 });
})();
