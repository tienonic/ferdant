'use strict';
(() => {
 const dataNode = document.querySelector('#phone-data');
 if (!dataNode) return;
 const payload = JSON.parse(dataNode.textContent), data = payload.directory, places = payload.places;
 const cities = new Map(places.cities.map(([id,name,county,lat,lng])=>[id,{id,name,county,lat,lng}]));
 const mapRoot=document.querySelector('#city-map'),mapDisclosure=mapRoot?.closest('details');
 const landingOverview=Boolean(document.querySelector('[data-location-routing]'));
 let cityMap, cityMarkers, mapPromise, mapBounds, selectedMarker, selectedCounty;
 const modeButtons=[...document.querySelectorAll('[data-location-kind]')];
 let selectionKind='city';
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
 const locationSelect=document.querySelector('[data-location-select]');
 if(locationSelect){locationSelect.replaceChildren(...[...select.children].map(child=>child.cloneNode(true)));locationSelect.addEventListener('change',()=>{select.value=locationSelect.value;select.dispatchEvent(new Event('change'));});}

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
 function contactLevel(id,location) {
  const contact=data.contacts[id];
  if(contact.scope==='PG&E customers only')return {level:'provider',label:'Provider · PG&E customers only'};
  if(data.statewide.includes(id))return {level:'state',label:'Statewide · California'};
  if(location&&(data.cityContacts[location.id]||[]).includes(id))return {level:'city',label:'City · '+location.name};
  if(location&&(data.countyContacts[location.county]||[]).includes(id))return {level:'county',label:'County · '+places.counties[location.county]};
  return {level:'provider',label:contact.scope};
 }
 function scopeBadge(doc,scope) {return node(doc,'span',scope.label,'resource-scope-badge scope-'+scope.level);}
 function renderLevels(doc,location) {
  const levels=doc.querySelector('#local-resource-levels');if(!levels)return;
  levels.replaceChildren();levels.hidden=!location;
  if(!location)return;
  const isCounty=location.id.startsWith('county:');
  const entries=isCounty?[['county','County',places.counties[location.county]+' County'],['state','State','California']]:[['city','City',location.name],['county','County',places.counties[location.county]+' County'],['state','State','California']];
  for(const [level,label,name] of entries){const group=node(doc,'div');group.dataset.resourceLevel=level;group.append(node(doc,'dt',label),node(doc,'dd',name));levels.append(group);}
 }
 function contactMethods(doc,contact) {
  const fragment=doc.createDocumentFragment();
  for(const ref of contact.phones) {
   const number=data.numbers[ref.number], method=node(doc,'span',null,'phone-method');
   if(ref.note)method.append(node(doc,'small',ref.note));
   const call=node(doc,'a',number.label);call.href=`tel:${number.tel}`;call.setAttribute('aria-label',`Call ${contact.title} at ${number.label}`);method.append(call);
   if(ref.text){const text=node(doc,'a',`Text ${number.label}`,'phone-text');text.href=`sms:${number.tel}`;method.append(text);}
   fragment.append(method);
  }
  return fragment;
 }
 function renderAlerts(doc,area,location) {
  if(!area)return;
  area.replaceChildren();area.classList.add('alert-signup');
  const registry=payload.alerts,county=registry?.counties[location?.county],city=registry?.cities[location?.id];
  const fallback=registry?.sources.caloes.url||'https://calalerts.org/signup.html';
  const selected=city||county;
  const label=city?`${location.name} city`:county?`${county.county} County`:'California';
  area.append(node(doc,'h3','Get emergency alerts'));
  area.append(node(doc,'p',selected?`${label} · Sign up on the provider’s website.`:'Choose your county on California’s official signup directory.'));
  const link=node(doc,'a',selected?'Sign up for alerts ↗':'Find my county’s signup ↗','button');
  link.href=selected?.url||fallback;link.dataset.alertSignup='';link.rel='noreferrer';
  link.setAttribute('aria-label',selected?`Sign up for ${label} emergency alerts`:'Find emergency alert signup by county');
  area.append(link);
  const details=node(doc,'details'),summary=node(doc,'summary','How to sign up & sources');details.append(summary);
  details.append(node(doc,'p','Follow the provider’s registration steps. Add the locations you care about, choose the contact options offered, and complete any confirmation.'));
  details.append(node(doc,'p','Signup needs internet. Ferdant does not collect your contact details or enroll you. Cities may have additional systems; confirm coverage for your address.'));
  if(city&&county){const extra=node(doc,'a',`${county.county} County alerts`);extra.href=county.url;extra.rel='noreferrer';details.append(extra);}
  const existing=data.alerts[location?.id];
  if(existing){const instructions=node(doc,'a',existing.name+' — local instructions');instructions.href=data.sources[existing.source].url;instructions.rel='noreferrer';details.append(node(doc,'p'),instructions);}
  const source=node(doc,'a','California county signup directory');source.href=fallback;
  const origin=node(doc,'a','211 California');origin.href=registry?.sources['211ca'].url||'https://211ca.org/find-your-local-211/';
  const sources=node(doc,'p');sources.append(source,doc.createTextNode(' · '),origin);details.append(sources);
  if(selected?.sourceUrl){const verified=node(doc,'a','Local source');verified.href=selected.sourceUrl;details.append(verified);}
  details.append(node(doc,'p',`Links checked ${selected?.checked||registry?.checked||'date unavailable'}. Registration and alert delivery have not been tested.`,'source-review'));
  const recovery=node(doc,'a','Link not working? Find your county in the state directory.');recovery.href=fallback;details.append(recovery);
  area.append(details);
 }
 function renderLocation(doc,location) {
  const panel=doc.querySelector('#location-resources');if(!panel)return;
  const summary=doc.querySelector('#location-summary'),list=doc.querySelector('#location-links'),alertArea=doc.querySelector('#location-alert'),notes=doc.querySelector('#location-notes');
  panel.hidden=!location;list.replaceChildren();alertArea.replaceChildren();notes.replaceChildren();
  const title=doc.querySelector('#location-results-title'),coverage=doc.querySelector('#location-coverage');
  if(!location){summary.textContent='Choose a city or county for checked local contacts. You can browse general resources below.';title.textContent='Local resources';coverage.textContent='';return;}
  const cityIds=data.cityContacts[location.id]||[],countyIds=data.countyContacts[location.county]||[];
  const ids=[...new Set([...(countyIds.length?countyIds:['211-routing']),...cityIds])];
  summary.textContent=`${location.name}, California selected. Your offline copy uses this location.`;
  title.textContent=`Resources for ${location.name}`;
  const countyOnly=location.id.startsWith('county:');
  coverage.textContent=countyOnly ? 'County-level contacts only. Choose a city for any checked city agencies.' : data.cityNotes[location.id] || 'City agency contacts have not been checked here. Any saved county contacts are below; statewide help stays available in Phone numbers.';
  if(!countyIds.length)coverage.textContent+=' No alternate county referral number was listed in the checked directory; the statewide ZIP-code routing line is shown below.';
  for(const id of ids) {
   const contact=data.contacts[id],item=node(doc,'li');item.dataset.localContact=id;
   const copy=node(doc,'div'),heading=node(doc,'h3'),website=node(doc,'a',contact.title);
   website.href=data.sources[contact.source].url;heading.append(website);
   const scope=contact.scope==='Selected county'?`${places.counties[location.county]} County`:contact.scope;
   const level=contactLevel(id,location);item.dataset.resourceLevel=level.level;
   copy.append(scopeBadge(doc,level),heading,node(doc,'small',[contact.kind,scope,contact.hours].filter(Boolean).join(' · ')));
   const sourceData=data.sources[contact.source],detail=node(doc,'div',null,'phone-source');
   detail.append(node(doc,'h3',contact.title),node(doc,'p',contact.detail));
   const source=node(doc,'a',sourceData.title+' (online source)');source.href=sourceData.url;detail.append(source);
   detail.append(node(doc,'p',`Publisher date: ${sourceData.published || 'not stated in reviewed material'}. Checked ${data.checked}. ${sourceData.review}`,'source-review'));notes.append(detail);
   const methods=node(doc,'div',null,'local-contact-methods');methods.append(contactMethods(doc,contact));
   item.append(copy,methods);list.append(item);
  }
  renderAlerts(doc,alertArea,location);
 }
 function render(doc,key) {
  const location=place(key),shared=doc.querySelector('.phone-directory').hasAttribute('data-shared-only');
  const localIds=location?[...new Set([...(data.countyContacts[location.county]?.length?data.countyContacts[location.county]:['211-routing']),...(data.cityContacts[location.id]||[])])]:[];
  const ids=shared?data.statewide.filter(id=>!doc.querySelector('#location-resources')||!localIds.includes(id)):contactIds(location),body=doc.querySelector('#phone-rows');
  const rows=doc.createDocumentFragment(), sources=doc.createDocumentFragment();
  for (const id of ids) {
   const contact=data.contacts[id], row=node(doc,'tr');row.dataset.contactId=id;
   const label=node(doc,'th',contact.title);label.scope='row';
   const scope=contact.scope==='Selected county' ? `${places.counties[location.county]} County` : contact.scope;
   const level=contactLevel(id,location);row.dataset.resourceLevel=level.level;
   label.append(scopeBadge(doc,level),node(doc,'small',[contact.kind,scope,contact.hours].filter(Boolean).join(' · ')));
   const cell=node(doc,'td');
   cell.append(contactMethods(doc,contact));
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
  doc.querySelector('#phone-coverage').textContent=shared?(location&&doc.querySelector('#location-resources')?'Shared California support lines. Checked local contacts appear in the location resources above.':'Shared California support lines. Search a location to open checked local resources.'):coverage;
  doc.querySelector('#phone-caption').textContent=shared?'California-wide support numbers':`${location ? location.name : 'California'} emergency and support phone numbers other than 911`;
  for(const download of doc.querySelectorAll('[data-city-download]')) download.textContent=download.closest('.infographic-download')?'Complete offline website (HTML)':location ? `Download offline for ${location.name}` : 'Download California offline copy';
  const alertArea=doc.querySelector('#phone-local-alert');
  if(alertArea){alertArea.hidden=!!location&&!!doc.querySelector('#location-alert');if(alertArea.hidden)alertArea.replaceChildren();else renderAlerts(doc,alertArea,location);}
  const locationCity=doc.querySelector('[data-location-select]');if(locationCity)locationCity.value=key;
  const citySearch=doc.querySelector('#map-city-search');if(citySearch)citySearch.value=location && !location.id.startsWith('county:')?location.name:'';
  renderLocation(doc,location);
  renderLevels(doc,location);
  const intro=doc.querySelector('#local-page-intro');
  if(intro&&location)intro.textContent=location.id.startsWith('county:')?`${places.counties[location.county]} County services and statewide help. Select a city for city-specific resources.`:`Resources in ${location.name}, ${places.counties[location.county]} County services and statewide help.`;
  if(doc===document&&location)setSelectionKind(location.id.startsWith('county:')?'county':'city');
  const heading=doc.querySelector('#local-page-title');if(heading)heading.textContent=location?`Resources for ${location.name}, California`:'California resources';
  filter(doc);if(doc===document){syncMap(location);document.dispatchEvent(new CustomEvent('ferdant:location',{detail:{key}}));}return location;
 }
 function filter(doc) {
  const words=doc.querySelector('#phone-query').value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  let count=0;
  for(const row of doc.querySelectorAll('#phone-rows tr')){row.hidden=!words.every(word=>row.dataset.phoneSearch?.includes(word));if(!row.hidden)count++;}
  doc.querySelector('#phone-no-matches').hidden=count!==0;
 }
 const saved = document.querySelector('meta[name="ferdant-city"]')?.content || '';
 const requested=location.protocol==='file:'?saved:new URLSearchParams(location.search).get('place')||saved;
 select.value=place(requested) ? requested : '';render(document,select.value);
 if(requested && !place(requested)){const intro=document.querySelector('#local-page-intro');if(intro)intro.textContent='That California location was not found. Search again using Change location below.';}
 select.addEventListener('change',()=>{
  render(document,select.value);
  if(location.protocol!=='file:' && document.querySelector('[data-location-page]'))history.replaceState(null,'','/local/'+(select.value?'?place='+encodeURIComponent(select.value):''));
  for(const status of document.querySelectorAll('.phone-actions [role="status"]'))status.textContent='';
 });
 document.querySelector('#phone-query').addEventListener('input',()=>filter(document));

 const mapStatus=document.querySelector('#city-map-status'), mapSearch=document.querySelector('#map-city-search');
 const searchStatus=document.querySelector('#city-search-status'),suggestions=document.querySelector('#location-suggestions');
 const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
 const locations=[...[...cities.values()].map(city=>({...city,label:`${city.name}, ${places.counties[city.county]} County, California`})),...Object.entries(places.counties).map(([id,name])=>({id:`county:${id}`,name:`${name} County`,county:id,label:`${name} County, California — county resources`}))];
 let matches=[],active=-1,closeTimer;
 const routing=()=>location.protocol!=='file:' && Boolean(document.querySelector('[data-location-routing], [data-location-page]'));
 function closeSuggestions(){suggestions.hidden=true;mapSearch.setAttribute('aria-expanded','false');mapSearch.removeAttribute('aria-activedescendant');active=-1;}
 function activate(index){active=index;[...suggestions.children].forEach((el,i)=>el.setAttribute('aria-selected',String(i===active)));if(active>=0){mapSearch.setAttribute('aria-activedescendant',suggestions.children[active].id);suggestions.children[active].scrollIntoView({block:'nearest'});}}
 function commitPlace(key){closeSuggestions();if(routing()){const query=new URLSearchParams({place:key}),hazard=window.FerdantResourceMap?.active;if(hazard&&hazard!=='everyday')query.set('hazard',hazard);location.assign('/local/?'+query);return;}chooseCity(key);}
 function suggest(){
  clearTimeout(closeTimer);const query=normalize(mapSearch.value);suggestions.replaceChildren();matches=[];active=-1;
  if(!query){closeSuggestions();searchStatus.textContent='';return;}
  const eligible=locations.filter(item=>item.id.startsWith('county:')===(selectionKind==='county'));
  const prefixMatches=eligible.filter(item=>normalize(item.name).startsWith(query));
  matches=(prefixMatches.length?prefixMatches:eligible.filter(item=>normalize(item.name).includes(query))).sort((a,b)=>Number(!normalize(a.name).startsWith(query))-Number(!normalize(b.name).startsWith(query))||a.name.localeCompare(b.name)).slice(0,8);
  for(const [index,item] of matches.entries()){
   const option=node(document,'li',item.label);option.id=`location-suggestion-${index}`;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.dataset.placeKey=item.id;
   option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>commitPlace(item.id));suggestions.append(option);
  }
  suggestions.hidden=!matches.length;mapSearch.setAttribute('aria-expanded',String(Boolean(matches.length)));mapSearch.removeAttribute('aria-activedescendant');
  searchStatus.textContent=matches.length?`${matches.length} California suggestions. Use arrow keys and Enter, or choose a result.`:`No California ${selectionKind==='city'?'city':'county'} matches. Use the City / County switch to change the search.`;
 }
 mapSearch.addEventListener('input',suggest);mapSearch.addEventListener('focus',()=>{if(mapSearch.value)suggest();});
 mapSearch.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeSuggestions();return;}
  if((event.key==='ArrowDown'||event.key==='ArrowUp') && matches.length){event.preventDefault();if(suggestions.hidden)suggest();activate(active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length);}
 });
 mapSearch.addEventListener('blur',()=>{closeTimer=setTimeout(closeSuggestions,150);});
 document.querySelector('#map-city-form').addEventListener('submit',event=>{
  event.preventDefault();if(!suggestions.hidden && active>=0){commitPlace(matches[active].id);return;}
  const eligible=locations.filter(item=>item.id.startsWith('county:')===(selectionKind==='county'));
  const query=normalize(mapSearch.value),exact=eligible.find(item=>normalize(item.name)===query),prefix=eligible.filter(item=>query && normalize(item.name).startsWith(query));
  const selected=exact||(prefix.length===1?prefix[0]:null);
  if(selected){commitPlace(selected.id);return;}
  suggest();searchStatus.textContent=matches.length?'Several locations match. Choose a suggestion; no location has changed.':'Choose a California city or county from the suggestions.';
 });
 function chooseCity(key){select.value=key;select.dispatchEvent(new Event('change'));}
 function setSelectionKind(kind,reset=false){
  selectionKind=kind;
  modeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.locationKind===kind)));
  if(mapRoot)mapRoot.dataset.selectionKind=kind;
  const field=document.querySelector('#map-city-search');if(field)field.placeholder=kind==='county'?'County, e.g. Yolo':'City, e.g. Davis';
  if(cityMap&&cityMarkers){if(kind==='county'){if(cityMap.hasLayer(cityMarkers))cityMap.removeLayer(cityMarkers);}else if(!cityMap.hasLayer(cityMarkers))cityMap.addLayer(cityMarkers);}
  if(reset){field.value='';closeSuggestions();searchStatus.textContent='';}
  if(cityMap)syncMap(place(select.value));
 }
 modeButtons.forEach(button=>button.addEventListener('click',()=>setSelectionKind(button.dataset.locationKind,true)));
 function syncMap(location) {
  if(!cityMap)return;
  selectedMarker?.closeTooltip();selectedMarker?.setStyle({radius:4,color:'#215aa0',fillColor:'#215aa0',fillOpacity:.7,weight:1});
  selectedCounty?.setStyle({color:'#718995',fillColor:'#ffffff',fillOpacity:.75,weight:1});
  selectedMarker=location?markers.get(location.id):undefined;
  selectedCounty=location?countyLayers.get(location.county):undefined;
  selectedCounty?.setStyle({color:'#126c68',fillColor:'#dcebe7',fillOpacity:.8,weight:2});
  if(selectedMarker){selectedMarker.setStyle({radius:8,color:'#126c68',fillColor:'#126c68',fillOpacity:1,weight:2});selectedMarker.bringToFront();}
  mapStatus.textContent=location?`${location.name} selected. ${selectionKind==='county'?'Click a county area or search a county to change it.':'Click a city marker or search a city to change it.'}`:selectionKind==='county'?'County mode. Click a county area or search its name.':'City mode. Click a city marker or search its name.';
  if(!mapDisclosure || mapDisclosure.open) {
   cityMap.invalidateSize(false);
   if(location && selectedMarker && selectionKind==='city')cityMap.setView([location.lat,location.lng],9,{animate:false});
   else if(selectedCounty)cityMap.fitBounds(selectedCounty.getBounds(),{padding:[15,15],animate:false});
   else cityMap.fitBounds(mapBounds,landingOverview?{paddingTopLeft:[15,15],paddingBottomRight:[15,Math.max(15,cityMap.attributionControl.getContainer().offsetHeight+8)],animate:false}:{padding:[15,15],animate:false});
   selectedMarker?.openTooltip();
  }
 }
 function loadLeaflet() {
  if(window.L)return Promise.resolve();
  if(window.ferdantLeaflet)return window.ferdantLeaflet;
  const css=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/vendor/leaflet/leaflet.css';link.onload=resolve;link.onerror=reject;document.head.append(link);});
  const js=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/assets/vendor/leaflet/leaflet.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
  window.ferdantLeaflet=Promise.all([css,js]).catch(error=>{window.ferdantLeaflet=undefined;throw error;});
  return window.ferdantLeaflet;
 }
 function ensureMap() {
  if(cityMap){syncMap(place(select.value));return Promise.resolve();}
  if(mapPromise)return mapPromise;
  mapPromise=loadLeaflet().then(()=>{
   cityMap=L.map('city-map',{scrollWheelZoom:false,minZoom:4,maxZoom:12,zoomSnap:landingOverview?0.1:1,zoomAnimation:false,fadeAnimation:false}).setView([37.2,-120],5);
   cityMap.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
   cityMap.attributionControl.addAttribution('Map data: <a href="https://publish.data.ca.gov/dataset/boe-citycounty">CDTFA</a> · <a href="https://tigerweb.geo.census.gov/">U.S. Census Bureau</a>');
   const boundaries=L.geoJSON(places.map.geometry,{style:{color:'#718995',fillColor:'#ffffff',fillOpacity:.75,weight:1},onEachFeature:(feature,layer)=>{
    countyLayers.set(feature.properties.county,layer);
    const label=document.createElement('span');label.textContent=feature.properties.name+' County';layer.bindTooltip(label);
    layer.on('add',()=>{const element=layer.getElement();if(element)element.dataset.countyId=feature.properties.county;});
    layer.on('click',()=>{if(selectionKind!=='county')return;const key='county:'+feature.properties.county;if(document.querySelector('[data-location-routing]')&&location.protocol!=='file:')commitPlace(key);else chooseCity(key);});
   }}).addTo(cityMap);mapBounds=boundaries.getBounds();
   cityMarkers=L.layerGroup().addTo(cityMap);
   for(const city of cities.values()){
    const marker=L.circleMarker([city.lat,city.lng],{radius:4,color:'#215aa0',fillColor:'#215aa0',fillOpacity:.7,weight:1,bubblingMouseEvents:false}).addTo(cityMarkers);
    markers.set(city.id,marker);const label=document.createElement('span');label.textContent=city.name;marker.bindTooltip(label);
    marker.on('add',()=>{const element=marker.getElement();if(element)element.dataset.cityId=city.id;});
    marker.on('click',()=>{if(document.querySelector('[data-location-routing]')&&location.protocol!=='file:')commitPlace(city.id);else chooseCity(city.id);});const element=marker.getElement();if(element)element.dataset.cityId=city.id;
   }
   if(landingOverview){cityMap.zoomControl.setPosition('topright');cityMap.on('resize',()=>{if(!select.value)syncMap(null);});}
   document.querySelector('#city-map').dataset.ready='true';setSelectionKind(selectionKind);
  }).catch(()=>{mapPromise=undefined;mapStatus.textContent='The map could not load. Location search and phone numbers still work.';});
  return mapPromise;
 }
 if(mapDisclosure)mapDisclosure.addEventListener('toggle',()=>{if(mapDisclosure.open)ensureMap();});
 if(mapRoot && (!mapDisclosure || mapDisclosure.open))ensureMap();
 let template;
 for(const download of document.querySelectorAll('[data-city-download]'))download.addEventListener('click',async event=>{
  if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !select.value)return;
  event.preventDefault();
  const key=select.value,location=place(key),status=download.closest('.phone-actions').querySelector('[role="status"]');
  status.textContent='Preparing your city copy…';
  try {
   if(!template)template=fetch(download.href,{credentials:'omit'}).then(response=>{if(!response.ok)throw Error('Download failed');return response.text();});
   const text=await template,doc=new DOMParser().parseFromString(text,'text/html');
   if(doc.querySelector('#phone-data')?.textContent!==dataNode.textContent)throw Error('Edition changed; reload');
   doc.querySelector('meta[name="ferdant-city"]').content=key;
   // The saved rows and meta value keep the chosen city readable even with JavaScript off.
   render(doc,key);window.FerdantInfographic?.embed(doc,key);
   if(window.FerdantResourceMap)await window.FerdantResourceMap.embed(doc,key);
   else if(doc.querySelector('#city-map-snapshot')){
    const response=await fetch('/assets/data/city-maps/'+location.county+'.json',{credentials:'omit'});
    if(!response.ok)throw Error('City map could not be saved');
    const area=await response.json();if(area.checked!==data.checked||area.county!==location.county)throw Error('Map edition changed');
    doc.querySelector('#city-map-snapshot').textContent=JSON.stringify(area).replace(/</g,'\\u003c');
   }
   doc.querySelector('h1').textContent=`${location.name}, California — offline edition`;
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
