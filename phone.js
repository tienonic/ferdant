'use strict';
(() => {
 const dataNode = document.querySelector('#phone-data');
 if (!dataNode) return;
 const payload = JSON.parse(dataNode.textContent), data = payload.directory, places = payload.places;
 const cities = new Map(places.cities.map(([id,name,county,lat,lng])=>[id,{id,name,county,lat,lng}]));
 const mapRoot=document.querySelector('#city-map'),mapDisclosure=mapRoot?.closest('details');
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
   copy.append(heading,node(doc,'small',[contact.kind,scope,contact.hours].filter(Boolean).join(' · ')));
   const sourceData=data.sources[contact.source],detail=node(doc,'div',null,'phone-source');
   detail.append(node(doc,'h3',contact.title),node(doc,'p',contact.detail));
   const source=node(doc,'a',sourceData.title+' (online source)');source.href=sourceData.url;detail.append(source);
   detail.append(node(doc,'p',`Publisher date: ${sourceData.published || 'not stated in reviewed material'}. Checked ${data.checked}. ${sourceData.review}`,'source-review'));notes.append(detail);
   const methods=node(doc,'div',null,'local-contact-methods');methods.append(contactMethods(doc,contact));
   item.append(copy,methods);list.append(item);
  }
  const alert=data.alerts[location.id];
  if(alert){const link=node(doc,'a',alert.name+' — official instructions');link.href=data.sources[alert.source].url;alertArea.append(link);}
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
   label.append(node(doc,'small',[contact.kind,scope,contact.hours].filter(Boolean).join(' · ')));
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
  if(alertArea){alertArea.replaceChildren();const alert=data.alerts[location?.id];if(alert){const p=node(doc,'p',`${alert.name}: ${alert.instruction}`),link=node(doc,'a','Official alert instructions (online)');link.href=data.sources[alert.source].url;alertArea.append(p,link);}}
  const locationCity=doc.querySelector('[data-location-select]');if(locationCity)locationCity.value=key;
  const citySearch=doc.querySelector('#map-city-search');if(citySearch)citySearch.value=location && !location.id.startsWith('county:')?location.name:'';
  renderLocation(doc,location);
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
 function commitPlace(key){closeSuggestions();if(routing()){location.assign('/local/?place='+encodeURIComponent(key));return;}chooseCity(key);}
 function suggest(){
  clearTimeout(closeTimer);const query=normalize(mapSearch.value);suggestions.replaceChildren();matches=[];active=-1;
  if(!query){closeSuggestions();searchStatus.textContent='';return;}
  const prefixMatches=locations.filter(item=>normalize(item.name).startsWith(query));
  matches=(prefixMatches.length?prefixMatches:locations.filter(item=>normalize(item.name).includes(query))).sort((a,b)=>Number(!normalize(a.name).startsWith(query))-Number(!normalize(b.name).startsWith(query))||a.name.localeCompare(b.name)).slice(0,8);
  for(const [index,item] of matches.entries()){
   const option=node(document,'li',item.label);option.id=`location-suggestion-${index}`;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.dataset.placeKey=item.id;
   option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>commitPlace(item.id));suggestions.append(option);
  }
  suggestions.hidden=!matches.length;mapSearch.setAttribute('aria-expanded',String(Boolean(matches.length)));mapSearch.removeAttribute('aria-activedescendant');
  searchStatus.textContent=matches.length?`${matches.length} California suggestions. Use arrow keys and Enter, or choose a result.`:'No California city or county matches. Try its name.';
 }
 mapSearch.addEventListener('input',suggest);mapSearch.addEventListener('focus',()=>{if(mapSearch.value)suggest();});
 mapSearch.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeSuggestions();return;}
  if((event.key==='ArrowDown'||event.key==='ArrowUp') && matches.length){event.preventDefault();if(suggestions.hidden)suggest();activate(active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length);}
 });
 mapSearch.addEventListener('blur',()=>{closeTimer=setTimeout(closeSuggestions,150);});
 document.querySelector('#map-city-form').addEventListener('submit',event=>{
  event.preventDefault();if(!suggestions.hidden && active>=0){commitPlace(matches[active].id);return;}
  const query=normalize(mapSearch.value),exact=locations.find(item=>normalize(item.name)===query),prefix=locations.filter(item=>query && normalize(item.name).startsWith(query));
  const selected=exact||(prefix.length===1?prefix[0]:null);
  if(selected){commitPlace(selected.id);return;}
  suggest();searchStatus.textContent=matches.length?'Several locations match. Choose a suggestion; no location has changed.':'Choose a California city or county from the suggestions.';
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
  mapStatus.textContent=location?`${location.name} selected. The phone chart and offline download use this location.`:'Click a city marker or type a city name. Clicking a county selects county-level contacts.';
  if(!mapDisclosure || mapDisclosure.open) {
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
    layer.on('click',()=>{const key='county:'+feature.properties.county;if(document.querySelector('[data-location-routing]')&&location.protocol!=='file:')commitPlace(key);else chooseCity(key);});
   }}).addTo(cityMap);mapBounds=boundaries.getBounds();
   for(const city of cities.values()){
    const marker=L.circleMarker([city.lat,city.lng],{radius:4,color:'#215aa0',fillColor:'#215aa0',fillOpacity:.7,weight:1,bubblingMouseEvents:false}).addTo(cityMap);
    markers.set(city.id,marker);const label=document.createElement('span');label.textContent=city.name;marker.bindTooltip(label);
    marker.on('click',()=>{if(document.querySelector('[data-location-routing]')&&location.protocol!=='file:')commitPlace(city.id);else chooseCity(city.id);});const element=marker.getElement();if(element)element.dataset.cityId=city.id;
   }
   document.querySelector('#city-map').dataset.ready='true';syncMap(place(select.value));
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
   render(doc,key);window.FerdantInfographic?.embed(doc,key);doc.querySelector('h1').textContent=`${location.name}, California — offline edition`;
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
