'use strict';
(() => {
 const dataNode = document.querySelector('#phone-data');
 if (!dataNode) return;
 const payload = JSON.parse(dataNode.textContent), data = payload.directory, places = payload.places;
 const cities = new Map(places.cities.map(([id,name,county,lat,lng])=>[id,{id,name,county,lat,lng}]));
 const disclosure=document.querySelector('.phone-directory');
 let cityMap, mapPromise, mapBounds, selectedMarker, selectedCounty;
 const markers=new Map(), countyLayers=new Map();
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
  filter(doc);if(doc===document)syncMap(location);return location;
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

 const mapStatus=document.querySelector('#city-map-status'), mapSearch=document.querySelector('#map-city-search');
 const names=document.querySelector('#map-city-names');
 for(const city of cities.values()){const option=document.createElement('option');option.value=city.name;names.append(option);}
 const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
 document.querySelector('#map-city-form').addEventListener('submit',event=>{
  event.preventDefault();const query=normalize(mapSearch.value);
  const exact=[...cities.values()].find(city=>normalize(city.name)===query);
  const matches=exact?[exact]:query?[...cities.values()].filter(city=>normalize(city.name).startsWith(query)):[];
  if(matches.length!==1){mapStatus.textContent=matches.length?'Several cities match. Choose the full city name from the suggestions. No city changed.':'Choose a city name from the suggestions, or use the city selector. No city changed.';return;}
  chooseCity(matches[0].id);
 });
 function chooseCity(key){select.value=key;select.dispatchEvent(new Event('change'));}
 function syncMap(location) {
  if(!cityMap)return;
  selectedMarker?.closeTooltip();selectedMarker?.setStyle({radius:4,color:'#215aa0',fillColor:'#215aa0',fillOpacity:.7,weight:1});
  selectedCounty?.setStyle({color:'#718995',fillColor:'#ffffff',fillOpacity:.75,weight:1});
  selectedMarker=location?markers.get(location.id):undefined;
  selectedCounty=location?countyLayers.get(location.county):undefined;
  selectedCounty?.setStyle({color:'#126c68',fillColor:'#dcebe7',fillOpacity:.8,weight:2});
  if(selectedMarker){selectedMarker.setStyle({radius:8,color:'#126c68',fillColor:'#126c68',fillOpacity:1,weight:2});selectedMarker.bringToFront();}
  mapSearch.value=location && !location.id.startsWith('county:')?location.name:'';
  mapStatus.textContent=location?`${location.name} selected. The phone chart and offline download use this location.`:'Click a city marker or type a city name. Clicking a county selects county-level contacts.';
  if(disclosure.open) {
   cityMap.invalidateSize(false);
   if(location && selectedMarker)cityMap.setView([location.lat,location.lng],9,{animate:false});
   else if(selectedCounty)cityMap.fitBounds(selectedCounty.getBounds(),{padding:[15,15],animate:false});
   else cityMap.fitBounds(mapBounds,{padding:[15,15],animate:false});
   selectedMarker?.openTooltip();
  }
 }
 function loadLeaflet() {
  if(window.L)return Promise.resolve();
  const css=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/vendor/leaflet/leaflet.css';link.onload=resolve;link.onerror=reject;document.head.append(link);});
  const js=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/assets/vendor/leaflet/leaflet.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
  return Promise.all([css,js]);
 }
 function ensureMap() {
  if(cityMap){syncMap(place(select.value));return Promise.resolve();}
  if(mapPromise)return mapPromise;
  mapPromise=loadLeaflet().then(()=>{
   cityMap=L.map('city-map',{scrollWheelZoom:false,minZoom:4,maxZoom:12,zoomAnimation:false,fadeAnimation:false}).setView([37.2,-120],5);
   cityMap.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
   cityMap.attributionControl.addAttribution('Map data: <a href="https://publish.data.ca.gov/dataset/boe-citycounty">CDTFA</a> · <a href="https://tigerweb.geo.census.gov/">U.S. Census Bureau</a>');
   const boundaries=L.geoJSON(places.map.geometry,{style:{color:'#718995',fillColor:'#ffffff',fillOpacity:.75,weight:1},onEachFeature:(feature,layer)=>{
    countyLayers.set(feature.properties.county,layer);
    const label=document.createElement('span');label.textContent=feature.properties.name+' County';layer.bindTooltip(label);
    layer.on('click',()=>chooseCity('county:'+feature.properties.county));
   }}).addTo(cityMap);mapBounds=boundaries.getBounds();
   for(const city of cities.values()){
    const marker=L.circleMarker([city.lat,city.lng],{radius:4,color:'#215aa0',fillColor:'#215aa0',fillOpacity:.7,weight:1,bubblingMouseEvents:false}).addTo(cityMap);
    markers.set(city.id,marker);const label=document.createElement('span');label.textContent=city.name;marker.bindTooltip(label);
    marker.on('click',()=>chooseCity(city.id));const element=marker.getElement();if(element)element.dataset.cityId=city.id;
   }
   document.querySelector('#city-map').dataset.ready='true';syncMap(place(select.value));
  }).catch(()=>{mapPromise=undefined;mapStatus.textContent='The map could not load. The city selector and phone numbers still work.';});
  return mapPromise;
 }
 disclosure.addEventListener('toggle',()=>{if(disclosure.open)ensureMap();});
 if(disclosure.open)ensureMap();
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
