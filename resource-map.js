'use strict';
(() => {
 const root=document.querySelector('#resource-atlas'),node=document.querySelector('#resource-map-data');
 if(!root||!node)return;
 const config=JSON.parse(node.textContent),places=JSON.parse(document.querySelector('#phone-data').textContent).places;
 const select=document.querySelector('#phone-city'),offline=location.protocol==='file:';
 const tabs=[...root.querySelectorAll('[data-map-layer]')],list=root.querySelector('#atlas-place-list');
 const status=root.querySelector('#atlas-map-status'),feedStatus=root.querySelector('#atlas-feed-status');
 const shards=new Map(),requests=new Map(),snapshots=JSON.parse(document.querySelector('#city-map-snapshot').textContent);
 if(snapshots.county)shards.set(snapshots.county,snapshots);
 const colors={hospital:'#23569a',food:'#28735b',support:'#735597',shelter:'#ac4b29'};
 let map,initPromise,boundary,layerGroup,highlight,active='everyday',version=0,selected,shard,cityBounds,limit=8,current=[],controller;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function point(key){
  const row=places.cities.find(c=>c[0]===key);
  if(row)return {key,name:row[1],county:row[2],lat:row[3],lng:row[4],city:true};
  if(key.startsWith('county:')&&places.counties[key.slice(7)])return {key,name:places.counties[key.slice(7)]+' County',county:key.slice(7),city:false};
  return null;
 }
 function collection(geometries=[]){return {type:'FeatureCollection',features:geometries.map(geometry=>({type:'Feature',properties:{},geometry}))};}
 function countyGeometry(county){return places.map.geometry.features.find(f=>f.properties.county===county)?.geometry;}
 function rings(geometry){return geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];}
 function inRing(x,y,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function contains(geometries,lng,lat){return geometries.some(g=>rings(g).some(p=>inRing(lng,lat,p[0])&&!p.slice(1).some(h=>inRing(lng,lat,h))));}
 function distance(a,b){const r=Math.PI/180,dlat=(a.lat-b.lat)*r,dlng=(a.lng-b.lng)*r;return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2)));}
 function label(kind){return {hospital:'Emergency hospital',food:'Food-bank referral',support:'Community help',shelter:'FEMA-listed shelter'}[kind];}
 async function loadLeaflet(){
  if(window.L)return;
  // Both city maps share this promise, including the delayed Change location map.
  if(!window.ferdantLeaflet)window.ferdantLeaflet=Promise.all([
   new Promise((resolve,reject)=>{const el=document.createElement('link');el.rel='stylesheet';el.href='/assets/vendor/leaflet/leaflet.css';el.onload=resolve;el.onerror=reject;document.head.append(el);}),
   new Promise((resolve,reject)=>{const el=document.createElement('script');el.src='/assets/vendor/leaflet/leaflet.js';el.onload=resolve;el.onerror=reject;document.head.append(el);})
  ]).catch(error=>{window.ferdantLeaflet=undefined;throw error;});
  await window.ferdantLeaflet;
 }
 async function init(){
  if(map)return;
  if(initPromise)return initPromise;
  initPromise=loadLeaflet().then(()=>{
   map=L.map('resource-map',{scrollWheelZoom:false,minZoom:5,maxZoom:19,zoomAnimation:false,fadeAnimation:false});
   map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
   map.attributionControl.addAttribution('Boundaries: CDTFA / U.S. Census · Hazard areas: CGS / Cal OES');
   map.attributionControl.addAttribution('Buildings: © Microsoft, <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>');
   if(!offline){const tiles=L.tileLayer(config.tileUrl,{maxZoom:19,keepBuffer:1,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);tiles.on('tileerror',()=>{root.querySelector('#resource-map').dataset.tiles='unavailable';status.textContent='Street tiles unavailable. The city outline, resource pins and list still work.';});}
   boundary=L.layerGroup().addTo(map);layerGroup=L.layerGroup().addTo(map);highlight=L.layerGroup().addTo(map);
   root.querySelector('#resource-map').dataset.ready='true';
  }).catch(error=>{initPromise=undefined;status.textContent='The map could not load. Use the resource list and official links here.';throw error;});
  return initPromise;
 }
 async function loadCounty(county){
  if(shards.has(county))return shards.get(county);
  if(offline)return null;
  if(!requests.has(county))requests.set(county,fetch('/assets/data/city-maps/'+county+'.json',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('Area data unavailable');return r.json();}).then(data=>{if(data.schema!==1||data.county!==county||data.checked!==config.checked)throw Error('Wrong county or map edition');shards.set(county,data);return data;}).catch(error=>{requests.delete(county);throw error;}));
  return requests.get(county);
 }
 function geometries(){return selected?.city?(shard?.cities[selected.key]||[]):[countyGeometry(selected?.county)].filter(Boolean);}
 function fit(){
  if(!map||!cityBounds)return;
  const view=L.latLngBounds(cityBounds.getSouthWest(),cityBounds.getNorthEast());
  if(selected?.city&&active!=='tsunami'&&current.length&&current.every(f=>!f.within))for(const f of current.slice(0,limit))view.extend([f.lat,f.lng]);
  map.fitBounds(view,{padding:[18,18],maxZoom:selected?.city?13:10,animate:false});
 }
 function drawBoundary(){
  boundary?.clearLayers();const geoms=geometries();
  if(!map)return;
  if(geoms.length){
   L.geoJSON(collection(geoms),{style:{color:'#41596d',weight:2,dashArray:'5 5',fillOpacity:.025,interactive:false}}).addTo(boundary);
   // Offshore islands do not zoom a mainland city out to the ocean. All pieces remain drawn.
   const parts=geoms.flatMap(g=>rings(g).map(p=>({type:'Polygon',coordinates:p})));
   const focus=selected.city?parts.filter(g=>contains([g],selected.lng,selected.lat)):parts;
   cityBounds=L.geoJSON(collection(focus.length?focus:parts)).getBounds();
  }else if(selected.city)cityBounds=L.latLngBounds([selected.lat-.035,selected.lng-.05],[selected.lat+.035,selected.lng+.05]);
  else cityBounds=L.geoJSON(collection([countyGeometry(selected.county)].filter(Boolean))).getBounds();
  if(config.viewBounds?.[selected.key])cityBounds=L.latLngBounds(config.viewBounds[selected.key]);
  fit();
 }
 function nearby(items){
  const geoms=geometries();
  const candidates=items.map(f=>({...f,within:contains(geoms,f.lng,f.lat),km:selected.city?distance(f,selected):null}))
   .filter(f=>selected.city?(f.within||f.km<=25):f.county===selected.county)
   .sort((a,b)=>Number(b.within)-Number(a.within)||(a.km??0)-(b.km??0)||a.name.localeCompare(b.name));
  const local=candidates.filter(f=>f.within);return selected.city&&local.length?local:candidates;
 }
 function info(f){
  const box=document.createElement('div');box.className='atlas-popup';
  const title=document.createElement('strong');title.textContent=f.name;box.append(title);
  const addr=document.createElement('p');addr.textContent=f.address+', '+f.city;box.append(addr);
  const note=document.createElement('p');note.textContent=f.detail;box.append(note);
  const a=document.createElement('a');a.href=config.sources[f.source].url;a.textContent='Check source & service';box.append(a);return box;
 }
 function focus(f,marker){
  highlight?.clearLayers();
  if(!map)return;
  const outline=shard?.buildings?.[f.id]?.geometry;
  if(outline)L.geoJSON(collection([outline]),{style:{color:colors[f.kind],weight:3,fillOpacity:.3,interactive:false}}).addTo(highlight);
  else L.circle([f.lat,f.lng],{radius:35,color:colors[f.kind],weight:3,fillOpacity:.14,interactive:false}).addTo(highlight);
  status.textContent=outline?'Estimated building outline containing this directory point. Confirm the entrance and service; this is not a structural-safety assessment.':'Approximate directory location. No uniquely matching building outline is available; confirm the address and entrance.';
  map.setView([f.lat,f.lng],17,{animate:false});marker.openPopup();
  for(const li of list.children)li.classList.toggle('is-selected',li.dataset.resourceId===f.id);
 }
 function drawPlaces(){
  layerGroup?.clearLayers();highlight?.clearLayers();list.replaceChildren();
  root.querySelector('#resource-map').dataset.layer=active;
  let visible=current.slice(0,limit);
  if(active==='tsunami'){
   const hazard=shard?.tsunami||[];
   if(map&&hazard.length)L.geoJSON(collection(hazard),{style:{color:'#a04d20',weight:1,fillColor:'#e6a650',fillOpacity:.38,interactive:false}}).addTo(layerGroup);
   visible=[];
  }
  for(const f of visible){
   const outline=shard?.buildings?.[f.id]?.geometry;
   if(map&&outline)L.geoJSON(collection([outline]),{style:{color:colors[f.kind],weight:1.5,fillOpacity:.15,interactive:false}}).addTo(layerGroup);
   let marker;
   if(map){marker=L.marker([f.lat,f.lng],{icon:L.divIcon({className:'atlas-pin '+f.kind,html:'<span aria-hidden="true">'+({hospital:'+',food:'F',support:'i',shelter:'S'}[f.kind])+'</span>',iconSize:[44,48],iconAnchor:[22,48],popupAnchor:[0,-40]}),keyboard:true,title:f.name,alt:f.name}).addTo(layerGroup);marker.bindPopup(info(f),{maxWidth:270});marker.on('click',()=>focus(f,marker));marker.getElement().dataset.resourceId=f.id;}
   const li=document.createElement('li');li.dataset.resourceId=f.id;
   const button=document.createElement('button');button.type='button';button.className='atlas-place-button';
   button.innerHTML='<span class="atlas-place-type '+f.kind+'">'+escape(label(f.kind))+'</span><strong>'+escape(f.name)+'</strong><span>'+escape(f.address+', '+f.city)+'</span>';
   button.addEventListener('click',()=>focus(f,marker));li.append(button);
   const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Service details';detail.append(summary,info(f));li.append(detail);list.append(li);
  }
  const more=root.querySelector('#atlas-more');more.hidden=active==='tsunami'||limit>=current.length;more.textContent=`Show ${Math.min(8,current.length-limit)} more places`;
  const note=root.querySelector('#atlas-list-note');
  if(active==='tsunami')note.textContent=shard?((shard.tsunami||[]).length?'Orange areas are the official county tsunami planning zones. Zoom in on the coast. Follow posted evacuation signs inland or uphill.':'This county has no polygons in this CGS tsunami dataset. This is not an all-hazards safety assessment.'):'The saved hazard layer is unavailable for this area. Open the official map below when online.';
  else note.textContent=current.length?`${visible.length} of ${current.length} mapped places ${selected.city?(current.every(f=>f.within)?'inside the approximate city boundary':'near the city, within 25 km of its approximate center'):'in this county'}. Check service details before travelling.`:'No matching physical locations in this saved directory. Use your local contact list below for referrals.';
  if(active==='tsunami'){
   const li=document.createElement('li');li.className='atlas-zone-note';li.innerHTML='<strong>Where to go</strong><p>Use your local evacuation plan and posted signs. High ground depends on the location; this map does not certify a safe destination.</p><a href="https://www.conservation.ca.gov/cgs/tsunami/maps">Open official county maps</a><a href="https://www.tsunami.gov/">Current tsunami warnings</a>';list.append(li);
  }
  if(active==='earthquake'){
   const li=document.createElement('li');li.className='atlas-shelter-link';li.innerHTML='<a href="https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html">Red Cross open-shelter map</a>';list.append(li);
  }
  root.querySelector('#atlas-list-title').textContent=active==='tsunami'?'Read the hazard area':'Places on this map';
  const keys={hospital:'+ Emergency hospital',food:'F Food-bank referral',support:'i Community help',shelter:'S FEMA-listed shelter'};
  const legend=active==='tsunami'?'<span class="legend-tsunami">Tsunami hazard area</span>':[...new Set(visible.map(f=>f.kind))].map(kind=>'<span class="legend-'+kind+'">'+keys[kind]+'</span>').join('');
  root.querySelector('#atlas-legend').innerHTML='<span class="legend-boundary">Approximate boundary</span>'+legend+(active!=='tsunami'&&visible.some(f=>shard?.buildings?.[f.id])?'<span>Shaded building = estimated outline</span>':'');
  root.dataset.layer=active;
 }
 function guidance(){
  const text={
   everyday:'<strong>Find a useful place.</strong><span>Select a pin or a name for its address and service details.</span>',
   earthquake:'<strong>During shaking: Drop. Cover. Hold on.</strong><span>Stay inside if inside. This layer is for finding help after shaking stops.</span><a href="https://www.ready.gov/earthquakes">FEMA / Ready.gov guidance</a>',
   tsunami:'<strong>At the coast: move inland or to higher ground.</strong><span>After strong or long shaking, do not wait for a warning. Follow posted evacuation signs.</span><a href="https://www.caloes.ca.gov/office-of-the-director/operations/planning-preparedness-prevention/seismic-hazards/tsunami-program/tsunami-alerts/">Cal OES evacuation guidance</a>'};
  root.querySelector('#atlas-guidance').innerHTML=text[active];
 }
 async function shelters(run){
  feedStatus.textContent=offline?'Offline copy: shelter status is not live. Use local alerts or the Red Cross map online.':'Checking FEMA-listed open shelters…';
  if(offline)return;
  const b=cityBounds?.pad(.1);if(!b){feedStatus.textContent='Shelter area unavailable. Check the Red Cross map.';return;}
  controller=new AbortController();const requestController=controller,timer=setTimeout(()=>requestController.abort(),12000);
  try{
   const geometry=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(',');
   const query=new URLSearchParams({f:'geojson',where:"state='CA' AND shelter_status_code='OPEN'",outFields:'shelter_id,shelter_name,address_1,city,shelter_status_code,reporting_period,incident_name,latitude,longitude',geometry,geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',resultRecordCount:'200',returnGeometry:'true'});
   const response=await fetch(config.shelterService+'/query?'+query,{credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('Shelter feed unavailable');
   const data=await response.json();if(data.error||!Array.isArray(data.features)||data.exceededTransferLimit)throw Error('Incomplete feed');
   if(run!==version||active!=='earthquake')return;
   let missing=0;
   const items=data.features.flatMap(f=>{const p=f.properties||{},xy=f.geometry?.coordinates;if(String(p.shelter_status_code).toUpperCase()!=='OPEN')return [];
    const lat=Number(xy?.[1]??p.latitude),lng=Number(xy?.[0]??p.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!b.contains([lat,lng])){missing++;return [];}
    const reported=p.reporting_period?(typeof p.reporting_period==='number'?new Date(p.reporting_period).toISOString():String(p.reporting_period)):'not supplied';
    return [{id:'fema-'+p.shelter_id,name:p.shelter_name||'FEMA-listed open shelter',address:p.address_1||'Address not provided',city:p.city||selected.name,lat,lng,county:selected.county,kind:'shelter',source:'shelters',detail:`Status listed OPEN; incident: ${p.incident_name||'not supplied'}. Provider report: ${reported}. Availability, access and capacity must be confirmed with local officials. This is an all-incident feed.`}];});
   const unique=[...new Map(items.map(f=>[f.id,f])).values()];
   current=[...unique,...nearby(config.facilities.filter(f=>f.kind==='hospital'))];drawPlaces();
   feedStatus.textContent=`FEMA checked ${new Date().toLocaleString()}. ${unique.length?unique.length+' listed open shelter(s) in the map area.':'No open shelters returned for this map area; this does not establish that none exist.'}${missing?' '+missing+' location(s) could not be mapped.':''} All incidents; confirm with local officials.`;
  }catch(error){if(run!==version||active!=='earthquake')return;feedStatus.textContent='FEMA shelter data is unavailable. Shelter locations are unknown here; check local officials or the Red Cross open-shelter map.';}
  finally{clearTimeout(timer);}
 }
 function renderLayer(){
  controller?.abort();const run=++version;limit=8;feedStatus.textContent='';
  tabs.forEach(t=>{const chosen=t.dataset.mapLayer===active;t.setAttribute('aria-selected',chosen);t.tabIndex=chosen?0:-1;});
  root.querySelector('#resource-map-panel').setAttribute('aria-labelledby','layer-'+active);
  guidance();current=active==='tsunami'?[]:nearby(config.facilities.filter(f=>active==='everyday'||f.kind==='hospital'));drawPlaces();fit();
  if(active==='earthquake')shelters(run);
 }
 async function update(){
  const run=++version;controller?.abort();selected=point(select.value);root.hidden=!selected;if(!selected)return;
  tabs.forEach(tab=>{tab.disabled=true;});root.setAttribute('aria-busy','true');
  shard=null;current=[];boundary?.clearLayers();layerGroup?.clearLayers();highlight?.clearLayers();list.replaceChildren();feedStatus.textContent='';
  root.querySelector('#resource-map-title').textContent=selected.name+' on the map';status.textContent='Loading the city outline…';
  const county=selected.county;
  const results=await Promise.allSettled([init(),loadCounty(county)]);if(run!==version)return;
  tabs.forEach(tab=>{tab.disabled=false;});root.removeAttribute('aria-busy');
  shard=results[1].status==='fulfilled'?results[1].value:null;
  if(!map){renderLayer();return;}
  drawBoundary();status.textContent=!shard?(offline?'Offline overview. This area’s detailed outline and hazard layer were not saved.':'Area data unavailable. The approximate location, resources and source links remain available.'):(offline?'Saved outline and planning zones. Street tiles and shelter status are unavailable offline.':'Choose a pin or a place. City view restores the full area.');
  renderLayer();
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>{active=tab.dataset.mapLayer;renderLayer();fit();});
  tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();tabs[next].focus();tabs[next].click();}});
 });
 root.querySelector('#atlas-reset').addEventListener('click',()=>{highlight?.clearLayers();map?.closePopup();fit();});
 root.querySelector('#atlas-more').addEventListener('click',()=>{limit+=8;drawPlaces();fit();});
 const sourceList=root.querySelector('#atlas-source-list');
 for(const source of Object.values(config.sources)){const li=document.createElement('li'),a=document.createElement('a');a.href=source.url;a.textContent=source.title;li.append(a,document.createTextNode(' — '+(source.published?'Publisher/data date: '+source.published+'. ':'Publisher date not supplied. ')+source.note));sourceList.append(li);}
 // Export only public county geometry. Never copy map popups, private inputs or a live shelter status.
 window.FerdantResourceMap={async embed(doc,key){const p=point(key),saved=p&&await loadCounty(p.county);const target=doc.querySelector('#city-map-snapshot');if(target)target.textContent=JSON.stringify(saved||{}).replace(/</g,'\\u003c');}};
 document.addEventListener('ferdant:location',update);update();
})();
