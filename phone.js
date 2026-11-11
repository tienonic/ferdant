'use strict';
(() => {
 const dataNode = document.querySelector('#phone-data');
 if (!dataNode) return;
 const payload = JSON.parse(dataNode.textContent), data = payload.directory, places = payload.places;
 const zipIndex=payload.zipAreas?.areas||{};
 function zipArea(value){const code=String(value||'').trim().match(/^(\d{5})(?:-\d{4})?$/)?.[1],row=zipIndex[code];return row?{code,lat:row[0],lng:row[1],county:row[2],counties:row[3],key:'county:'+row[2]}:null;}
 const chosenKey='ferdant-just-chosen';
 if(location.protocol!=='file:'&&location.pathname==='/local/'){
  try{const chosen=sessionStorage.getItem(chosenKey);window.FerdantJustChosen=Boolean(chosen)&&chosen===new URL(location.href).searchParams.get('place');sessionStorage.removeItem(chosenKey);}catch{window.FerdantJustChosen=false;}
 }
 const requestedZip=location.protocol==='file:'?document.querySelector('meta[name="ferdant-zip"]')?.content:new URL(location.href).searchParams.get('zip');
 let selectedZip=zipArea(requestedZip);
 window.FerdantZIP={lookup:zipArea,get current(){return selectedZip;},sources:payload.zipAreas?.sources||[]};
 const cities = new Map(places.cities.map(([id,name,county,lat,lng])=>[id,{id,name,county,lat,lng}]));
 const mapRoot=document.querySelector('#city-map'),mapDisclosure=mapRoot?.closest('details');
 const landingOverview=Boolean(document.querySelector('[data-location-routing]'));
 const stateLibrary=landingOverview?document.querySelector('.landing-library'):null;
 const stateLibraryIntro=stateLibrary?.querySelector('.library-heading > p').textContent;
 const stateLibraryHome=document.createComment('Original statewide resource position');
 const stateResourceHost=document.createElement('div');stateResourceHost.className='state-location-resources';stateResourceHost.hidden=true;
 if(stateLibrary){stateLibrary.before(stateLibraryHome);document.querySelector('#location-start').append(stateResourceHost);}
 let cityMap, cityMarkers, mapPromise, mapBounds, selectedMarker, selectedCounty;
 const modeButtons=[...document.querySelectorAll('[data-location-kind]')];
 let selectionKind='city';
 let hoveredCounty=null,touchedCounty=null,lastTouchCounty=null,lastTouchTime=0;
 const countyPreview=document.createElement('div');countyPreview.id='county-preview';countyPreview.className='county-preview';countyPreview.hidden=true;countyPreview.setAttribute('aria-live','polite');
 const countyPreviewName=document.createElement('strong'),countyPreviewAction=document.createElement('button');countyPreviewAction.type='button';countyPreviewAction.className='button';countyPreviewAction.textContent='View county resources';
 countyPreview.append(countyPreviewName,countyPreviewAction);mapRoot?.after(countyPreview);
 countyPreviewAction.addEventListener('click',()=>{if(touchedCounty)chooseCounty(touchedCounty);});
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
  const option = document.createElement('option');option.value = `county:${id}`;option.textContent = `${name} County`;countyGroup.append(option);
 }
 options.append(countyGroup);select.append(options);
 const locationSelect=document.querySelector('[data-location-select]');
 if(locationSelect){locationSelect.replaceChildren(...[...select.children].map(child=>child.cloneNode(true)));locationSelect.addEventListener('change',()=>{select.value=locationSelect.value;select.dispatchEvent(new Event('change'));});}

 function place(key) {
  if (cities.has(key)) return cities.get(key);
  const county = key.startsWith('county:') ? key.slice(7) : null;
  return county && places.counties[county] ? {id:key,name:`${places.counties[county]} County`,county} : null;
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
  summary.textContent=`${location.name} selected. Your offline copy uses this location.`;
  title.textContent='Local contacts';
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
  const intro=doc.querySelector('#local-page-intro');
  if(intro)intro.textContent=location?.id.startsWith('county:')?'County services and emergency information. Choose a city for local resources.':'Local services and emergency information.';
  if(doc===document&&location)setSelectionKind(selectedZip?'zip':location.id.startsWith('county:')?'county':'city');
  const bookletHeading=doc.querySelector('#infographic-title');if(bookletHeading)bookletHeading.textContent=(location?.name||'Local')+' resource book';
  const heading=doc.querySelector('#local-page-title');if(heading)heading.textContent=location?`${location.name} resources`:'Local resources';
  if(selectedZip&&key===selectedZip.key){
   if(citySearch)citySearch.value=selectedZip.code;
   if(heading)heading.textContent='Resources near ZIP '+selectedZip.code;
   if(intro)intro.textContent='Nearby resources around the ZIP area center. Phone numbers and the PDF booklet cover '+location.name+'.'+(selectedZip.counties.length>1?' This ZIP area also overlaps '+selectedZip.counties.slice(1).map(c=>places.counties[c]+' County').join(', ')+'.':'');
   const summary=doc.querySelector('#location-summary');if(summary)summary.textContent='ZIP '+selectedZip.code+' selected. The offline website keeps this map focus.';
   for(const download of doc.querySelectorAll('[data-city-download]'))if(!download.closest('.infographic-download'))download.textContent='Download offline for ZIP '+selectedZip.code;
  }
  filter(doc);if(doc===document){syncMap(location);document.dispatchEvent(new CustomEvent('ferdant:location',{detail:{key}}));}return location;
 }
 function filter(doc) {
  const words=doc.querySelector('#phone-query').value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  let count=0;
  for(const row of doc.querySelectorAll('#phone-rows tr')){row.hidden=!words.every(word=>row.dataset.phoneSearch?.includes(word));if(!row.hidden)count++;}
  doc.querySelector('#phone-no-matches').hidden=count!==0;
 }
 const saved = document.querySelector('meta[name="ferdant-city"]')?.content || '';
 const requested=selectedZip?.key||(location.protocol==='file:'?saved:new URLSearchParams(location.search).get('place')||saved);
 select.value=place(requested) ? requested : '';render(document,select.value);
 if(requested && !place(requested)){const intro=document.querySelector('#local-page-intro');if(intro)intro.textContent='That California location was not found. Search again using Change location below.';}
 if(requestedZip&&!selectedZip){const intro=document.querySelector('#local-page-intro');if(intro)intro.textContent='That ZIP code is not in the saved California ZIP-area index. Choose a city or county, or try another ZIP code.';}
 select.addEventListener('change',()=>{
  selectedZip=null;
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
 let travelRun=0,travelBoundary;
 async function enterPlace(key,query){
  const run=++travelRun,area=place(key),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function navigate(){if(run!==travelRun)return;try{sessionStorage.setItem(chosenKey,key);}catch{}location.assign('/local/?'+query);}
  if(reduce||!cityMap||!area){navigate();return;}
  let bounds=countyLayers.get(area.county)?.getBounds();
  travelBoundary?.remove();
  if(cities.has(key)){
   try{
    const response=await fetch('/assets/data/city-maps/'+area.county+'.json',{credentials:'omit'});
    if(response.ok){const saved=await response.json();if(saved.schema===1&&saved.county===area.county&&saved.cities[key]){
     if(run!==travelRun)return;
     travelBoundary=L.geoJSON(saved.cities[key],{style:{color:'#244b84',weight:2,fillColor:'#244b84',fillOpacity:.08}}).addTo(cityMap);bounds=travelBoundary.getBounds();
    }}
   }catch{/* The overview and local page still work if a boundary is unavailable. */}
  }else{
   const layer=countyLayers.get(area.county);layer?.setStyle({color:'#244b84',weight:2,fillColor:'#244b84',fillOpacity:.08});
  }
  if(run!==travelRun)return;
  mapRoot.dataset.travelling='true';mapStatus.textContent='Opening '+area.name+'.';
  const from=cityMap.getCenter(),fromZoom=cityMap.getZoom(),postal=zipArea(query.get('zip'));
  const target=postal?L.latLng(postal.lat,postal.lng):bounds?.isValid()?bounds.getCenter():L.latLng(area.lat,area.lng),zoom=postal?12:bounds?.isValid()?Math.min(12,cityMap.getBoundsZoom(bounds,false,L.point(72,72))):9;
  selectedMarker?.closeTooltip();selectedMarker?.setStyle({fillColor:'#14202b',radius:2,fillOpacity:.65});selectedMarker=markers.get(key);selectedMarker?.setStyle({fillColor:'#244b84',radius:6,fillOpacity:1});selectedMarker?.openTooltip();
  const began=performance.now();
  function travel(now){
   if(run!==travelRun)return;
   const t=Math.min(1,(now-began)/700),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
   cityMap.setView([from.lat+(target.lat-from.lat)*ease,from.lng+(target.lng-from.lng)*ease],fromZoom+(zoom-fromZoom)*ease,{animate:false});
   if(t<1)requestAnimationFrame(travel);else{mapRoot.dataset.travelling='false';navigate();}
  }
  requestAnimationFrame(travel);
 }
 function commitPlace(key){if(key.startsWith('zip:')){commitZip(key.slice(4));return;}closeSuggestions();if(routing()){const query=new URLSearchParams({place:key}),hazard=window.FerdantResourceMap?.active;if(hazard&&hazard!=='everyday')query.set('hazard',hazard);enterPlace(key,query);return;}chooseCity(key);}
 function commitZip(code){
  const area=zipArea(code);if(!area)return;closeSuggestions();
  if(routing()){const query=new URLSearchParams({place:area.key,zip:area.code}),hazard=window.FerdantResourceMap?.active;if(hazard&&hazard!=='everyday')query.set('hazard',hazard);enterPlace(area.key,query);return;}
  selectedZip=area;select.value=area.key;render(document,area.key);
 }
 function eligibleLocations(query){
  if(selectionKind==='zip'||/^\d/.test(query))return Object.keys(zipIndex).map(code=>{const area=zipArea(code);return {id:'zip:'+code,name:code,label:code+' / '+places.counties[area.county]+' County, California'};});
  return locations.filter(item=>item.id.startsWith('county:')===(selectionKind==='county'));
 }
 function suggest(){
  if(selectionKind==='state'){closeSuggestions();return;}
  clearTimeout(closeTimer);const query=normalize(mapSearch.value);suggestions.replaceChildren();matches=[];active=-1;
  if(!query){closeSuggestions();searchStatus.textContent='';return;}
  const eligible=eligibleLocations(normalize(mapSearch.value));
  const prefixMatches=eligible.filter(item=>normalize(item.name).startsWith(query));
  matches=(prefixMatches.length?prefixMatches:eligible.filter(item=>normalize(item.name).includes(query))).sort((a,b)=>Number(!normalize(a.name).startsWith(query))-Number(!normalize(b.name).startsWith(query))||a.name.localeCompare(b.name)).slice(0,8);
  for(const [index,item] of matches.entries()){
   const option=node(document,'li',item.label);option.id=`location-suggestion-${index}`;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.dataset.placeKey=item.id;
   option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>commitPlace(item.id));suggestions.append(option);
  }
  suggestions.hidden=!matches.length;mapSearch.setAttribute('aria-expanded',String(Boolean(matches.length)));mapSearch.removeAttribute('aria-activedescendant');
  searchStatus.textContent=matches.length?`${matches.length} California suggestions. Use arrow keys and Enter, or choose a result.`:selectionKind==='zip'||/^\d/.test(query)?'No saved California ZIP area matches. Some postal-only ZIP codes are not mapped; try a city or county.':`No California ${selectionKind==='city'?'city':'county'} matches. Change the search type above.`;
 }
 mapSearch.addEventListener('input',suggest);mapSearch.addEventListener('focus',()=>{if(mapSearch.value)suggest();});
 mapSearch.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeSuggestions();return;}
  if((event.key==='ArrowDown'||event.key==='ArrowUp') && matches.length){event.preventDefault();if(suggestions.hidden)suggest();activate(active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length);}
 });
 mapSearch.addEventListener('blur',()=>{closeTimer=setTimeout(closeSuggestions,150);});
 document.querySelector('#map-city-form').addEventListener('submit',event=>{
  event.preventDefault();if(selectionKind==='state')return;if(!suggestions.hidden && active>=0){commitPlace(matches[active].id);return;}
  const zip=zipArea(mapSearch.value);if(zip){commitZip(zip.code);return;}
  const eligible=eligibleLocations(normalize(mapSearch.value));
  const query=normalize(mapSearch.value),exact=eligible.find(item=>normalize(item.name)===query),prefix=eligible.filter(item=>query && normalize(item.name).startsWith(query));
  const selected=exact||(prefix.length===1?prefix[0]:null);
  if(selected){commitPlace(selected.id);return;}
  suggest();searchStatus.textContent=matches.length?'Several locations match. Choose a suggestion; no location has changed.':'Choose a California city, county or mapped ZIP code. Postal-only ZIP codes may not be available.';
 });
 function chooseCity(key){select.value=key;select.dispatchEvent(new Event('change'));}
 function setSelectionKind(kind,reset=false){
  if(kind==='state'&&!stateLibrary)return;
  const changing=kind!==selectionKind;
  clearCountyPreview();
  selectionKind=kind;
  modeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.locationKind===kind)));
  if(mapRoot)mapRoot.dataset.selectionKind=kind;
  if(stateLibrary){
   const state=kind==='state';
   mapRoot.closest('.city-map-workspace').hidden=state;
   document.querySelector('#map-city-form').hidden=state;
   document.querySelector('#location-summary').hidden=state;
   stateResourceHost.hidden=!state;
   stateLibrary.querySelector('.library-heading > p').textContent=state?'California-wide services and support numbers.':stateLibraryIntro;
   if(state){
    if(stateLibrary.parentElement!==stateResourceHost)stateResourceHost.append(stateLibrary);
    if(reset||changing)closeSuggestions();
    return;
   }
   if(stateLibrary.parentElement===stateResourceHost)stateLibraryHome.after(stateLibrary);
  }
  countyLayers.forEach((layer,id)=>{
   const element=layer.getElement();if(element)element.style.pointerEvents=kind==='county'?'auto':'none';
   if(kind==='city')layer.unbindTooltip();else if(!layer.getTooltip())layer.bindTooltip(node(document,'span',places.counties[id]+' County'));
   paintCounty(id);
  });
  const field=document.querySelector('#map-city-search');if(field)field.placeholder=kind==='zip'?'ZIP code, e.g. 95616':kind==='county'?'County, e.g. Yolo':'City or ZIP code, e.g. Davis or 95616';
  if(cityMap){if(kind==='county')cityMap.doubleClickZoom.disable();else cityMap.doubleClickZoom.enable();}
  if(cityMap&&cityMarkers){if(kind==='county'){if(cityMap.hasLayer(cityMarkers))cityMap.removeLayer(cityMarkers);}else if(!cityMap.hasLayer(cityMarkers))cityMap.addLayer(cityMarkers);}
  if(reset){field.value='';closeSuggestions();searchStatus.textContent='';}
  if(cityMap)syncMap(place(select.value));
 }
 modeButtons.forEach(button=>button.addEventListener('click',()=>setSelectionKind(button.dataset.locationKind,true)));
 function paintCounty(id){
  const layer=countyLayers.get(id);if(!layer)return;
  const blue=selectionKind==='county'&&(id===hoveredCounty||id===touchedCounty);
  layer.setStyle(blue?{color:'#244b84',fillColor:'#244b84',fillOpacity:.16,weight:1.5}:selectionKind==='county'&&layer===selectedCounty?{color:'#244b84',fillColor:'#244b84',fillOpacity:.12,weight:1.5}:{color:'#14202b',fillColor:'#fbfcfa',fillOpacity:1,opacity:.22,weight:.7});
  if(blue)layer.bringToFront();
 }
 function clearCountyPreview(){
  const previous=[hoveredCounty,touchedCounty];hoveredCounty=null;touchedCounty=null;countyPreview.hidden=true;
  previous.forEach(paintCounty);
 }
 function previewCounty(id){
  if(selectionKind!=='county')return;
  const previous=[touchedCounty,hoveredCounty];touchedCounty=id;hoveredCounty=null;previous.forEach(paintCounty);paintCounty(id);
  countyPreviewName.textContent=places.counties[id]+' County';countyPreview.hidden=false;
  countyLayers.get(id)?.closeTooltip();
 }
 function chooseCounty(id){
  if(selectionKind!=='county')return;
  const key='county:'+id;clearCountyPreview();
  if(routing())commitPlace(key);else chooseCity(key);
 }
 function syncMap(location) {
  if(!cityMap)return;
  selectedMarker?.closeTooltip();selectedMarker?.setStyle({radius:2,color:'#14202b',fillColor:'#14202b',fillOpacity:.65,weight:0});
  const oldCounty=selectedCounty;
  selectedMarker=location?markers.get(location.id):undefined;
  selectedCounty=location?countyLayers.get(location.county):undefined;
  if(oldCounty)paintCounty(oldCounty.feature.properties.county);
  if(selectedCounty)paintCounty(selectedCounty.feature.properties.county);
  if(selectedMarker){selectedMarker.setStyle({radius:6,color:'#244b84',fillColor:'#244b84',fillOpacity:1,weight:2});selectedMarker.bringToFront();}
  mapStatus.textContent=location?`${location.name} selected. ${selectionKind==='county'?'Point to or tap a county to preview it, or search its name.':'Click a city marker or search a city to change it.'}`:selectionKind==='county'?'County mode. Point to or tap a county to preview it, or search its name.':'City mode. Click a city marker or search its name.';
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
   cityMap.attributionControl.setPrefix(false);

   const boundaries=L.geoJSON(places.map.geometry,{style:{color:'#14202b',fillColor:'#fbfcfa',fillOpacity:1,opacity:.22,weight:.7},onEachFeature:(feature,layer)=>{
    countyLayers.set(feature.properties.county,layer);
    const id=feature.properties.county;
    layer.on('add',()=>{const element=layer.getElement();if(element){element.dataset.countyId=id;element.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.pointerType==='pen'){lastTouchCounty=id;lastTouchTime=Date.now();}});}});
    layer.on('mouseover',()=>{if(selectionKind!=='county'||Date.now()-lastTouchTime<800)return;if(touchedCounty)clearCountyPreview();const old=hoveredCounty;hoveredCounty=id;if(old)paintCounty(old);paintCounty(id);});
    layer.on('mouseout',()=>{if(hoveredCounty===id){hoveredCounty=null;paintCounty(id);}});
    layer.on('click',event=>{
     if(selectionKind!=='county')return;
     const pointer=event.originalEvent?.pointerType;
     const touch=pointer?pointer==='touch'||pointer==='pen':event.originalEvent?.sourceCapabilities?.firesTouchEvents||lastTouchCounty===id&&Date.now()-lastTouchTime<800;
     if(touch)previewCounty(id);else chooseCounty(id);
    });
   }}).addTo(cityMap);mapBounds=boundaries.getBounds();
   cityMap.on('dragstart',clearCountyPreview);
   cityMap.on('click',event=>{if(event.originalEvent?.target===cityMap.getContainer())clearCountyPreview();});
   cityMarkers=L.layerGroup().addTo(cityMap);
   for(const city of cities.values()){
    const marker=L.circleMarker([city.lat,city.lng],{radius:2,color:'#14202b',fillColor:'#14202b',fillOpacity:.65,weight:0,bubblingMouseEvents:false}).addTo(cityMarkers);
    markers.set(city.id,marker);const label=document.createElement('span');label.textContent=city.name;marker.bindTooltip(label);
    marker.on('add',()=>{const element=marker.getElement();if(element)element.dataset.cityId=city.id;});
    marker.on('mouseover',()=>marker.setStyle({fillColor:'#244b84',fillOpacity:1,radius:5}));marker.on('mouseout',()=>{if(marker!==selectedMarker)marker.setStyle({fillColor:'#14202b',fillOpacity:.65,radius:2});});
    marker.on('click',()=>{if(routing())commitPlace(city.id);else chooseCity(city.id);});const element=marker.getElement();if(element)element.dataset.cityId=city.id;
   }
   cityMap.on('zoomend',()=>{for(const marker of markers.values())if(marker!==selectedMarker)marker.setStyle({radius:Math.min(5,2+Math.max(0,cityMap.getZoom()-6)*.65)});});
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
  const key=select.value,zipCode=selectedZip?.code||'',location=place(key),status=download.closest('.phone-actions').querySelector('[role="status"]');
  status.textContent='Preparing your offline copy…';
  try {
   if(!template)template=fetch(download.href,{credentials:'omit'}).then(response=>{if(!response.ok)throw Error('Download failed');return response.text();});
   const text=await template,doc=new DOMParser().parseFromString(text,'text/html');
   if(doc.querySelector('#phone-data')?.textContent!==dataNode.textContent)throw Error('Edition changed; reload');
   doc.querySelector('meta[name="ferdant-city"]').content=key;
   let zipMeta=doc.querySelector('meta[name="ferdant-zip"]');if(!zipMeta){zipMeta=doc.createElement('meta');zipMeta.name='ferdant-zip';doc.head.append(zipMeta);}zipMeta.content=selectedZip?.code||'';
   // The saved rows and meta value keep the chosen city readable even with JavaScript off.
   render(doc,key);window.FerdantInfographic?.embed(doc,key);
   if(window.FerdantResourceMap)await window.FerdantResourceMap.embed(doc,key);
   else if(doc.querySelector('#city-map-snapshot')){
    const response=await fetch('/assets/data/city-maps/'+location.county+'.json',{credentials:'omit'});
    if(!response.ok)throw Error('City map could not be saved');
    const area=await response.json();if(area.checked!==data.checked||area.county!==location.county)throw Error('Map edition changed');
    doc.querySelector('#city-map-snapshot').textContent=JSON.stringify(area).replace(/</g,'\\u003c');
   }
   if(select.value!==key||(selectedZip?.code||'')!==zipCode)throw Error('Location changed during export');
   doc.querySelector('h1').textContent=`${zipCode?'Near ZIP '+zipCode:location.name}, California \u2014 offline edition`;
   doc.title=`${zipCode?'ZIP '+zipCode:location.name} \u2014 Ferdant offline`;
   const blob=new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob);
   const name=zipCode?'ZIP '+zipCode:key.startsWith('county:')?places.counties[location.county]+' County':location.name;
   const slug=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   const link=document.createElement('a');link.href=url;link.download=`ferdant-${slug}-ca-${data.checked}.html`;link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   status.textContent=`Offline copy prepared for ${zipCode?'ZIP '+zipCode:location.name}.`;
  } catch {
   template=undefined;status.textContent='The offline copy could not be prepared. Reload this page and try again, or use the standard California download on the offline page.';
  }
 });
})();
