'use strict';
(() => {
 const root=document.querySelector('#resource-atlas'),node=document.querySelector('#resource-map-data');
 if(!root||!node)return;
 const config=JSON.parse(node.textContent),places=JSON.parse(document.querySelector('#phone-data').textContent).places;
 const select=document.querySelector('#phone-city'),offline=location.protocol==='file:';
 const disasters=window.FerdantDisasters,services=window.FerdantServices,everyday=root.querySelector('#atlas-everyday'),choices=[...root.querySelectorAll('[data-disaster]')],controls=[everyday,...choices],list=root.querySelector('#atlas-place-list');
 const status=root.querySelector('#atlas-map-status'),feedStatus=root.querySelector('#atlas-feed-status');
 const shards=new Map(),requests=new Map(),snapshots=JSON.parse(document.querySelector('#city-map-snapshot').textContent);
 if(snapshots.county)shards.set(snapshots.county,snapshots);
 const types=config.serviceTypes,colors=Object.fromEntries(Object.entries(types).map(([id,t])=>[id,t.color]));
 const requested=offline?document.querySelector('meta[name="ferdant-disaster"]')?.content:new URL(location.href).searchParams.get('hazard');
 let map,initPromise,boundary,layerGroup,hazardGroup,highlight,hazardAttribution,active=disasters?.plans.has(requested)?requested:'everyday',version=0,selected,shard,cityBounds,limit=8,current=[],regionalServices=[],serviceUnavailable=false,shelterItems=[],resourceFilter='all',controller,hazardController;
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
 function label(kind){return types[kind].label;}
 function policy(){return config.resourcePlans[active];}
 function resourceViews(){return active==='everyday'?Object.entries(config.resourceGroups).map(([id,label])=>({id,label})):policy().views;}
 function matchesResource(f,id=resourceFilter){return active==='everyday'?id==='all'||(f.categories||[f.kind]).some(kind=>types[kind].group===id):resourceViews().find(v=>v.id===id)?.kinds.some(kind=>(f.categories||[f.kind]).includes(kind));}
 function hasShelters(){return Boolean(policy()?.liveShelters);}
 function staticPlaces(){
  const items=[...config.facilities,...regionalServices];
  const kinds=active==='everyday'?null:new Set(policy().views.flatMap(v=>v.kinds));
  return nearby(kinds?items.filter(f=>(f.categories||[f.kind]).some(kind=>kinds.has(kind))):items);
 }
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
   map.attributionControl.addAttribution('Boundaries: CDTFA / U.S. Census');
   map.attributionControl.addAttribution('Buildings: © Microsoft, <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>');
   if(!offline){const tiles=L.tileLayer(config.tileUrl,{maxZoom:19,keepBuffer:1,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);tiles.on('tileerror',()=>{root.querySelector('#resource-map').dataset.tiles='unavailable';status.textContent='Street tiles unavailable. The city outline, resource pins and list still work.';});}
   boundary=L.layerGroup().addTo(map);layerGroup=L.layerGroup().addTo(map);hazardGroup=L.layerGroup().addTo(map);highlight=L.layerGroup().addTo(map);
   map.createPane('disaster-planning');map.getPane('disaster-planning').style.zIndex=390;
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
  const shown=current.filter(f=>matchesResource(f)).slice(0,limit);
  if(selected?.city&&shown.length&&shown.every(f=>!f.within))for(const f of shown)view.extend([f.lat,f.lng]);
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
  if(services)return services.nearby(items,selected,f=>contains(geoms,f.lng,f.lat),{regional:!serviceUnavailable});
  return items.filter(f=>f.county===selected.county).map(f=>({...f,within:contains(geoms,f.lng,f.lat),km:selected.city?distance(f,selected):null}));
 }
 function info(f){
  const box=document.createElement('div');box.className='atlas-popup';
  const title=document.createElement('strong');title.textContent=f.name;box.append(title);
  const addr=document.createElement('p');addr.textContent=f.address+', '+f.city;box.append(addr);
  const note=document.createElement('p');note.textContent=f.detail;box.append(note);
  const visit=document.createElement('dl');visit.className='atlas-visit-details';
  const unknown=[];
  for(const [key,name] of Object.entries({hours:'Regular hours',eligibility:'Intake / eligibility',cost:'Cost',accessibility:'Accessibility',activation:'Emergency activation',capacity:'Available space / supplies'})){
   if(!f.visit?.[key]){unknown.push(name);continue;}
   const term=document.createElement('dt'),value=document.createElement('dd');term.textContent=name;value.textContent=f.visit[key];visit.append(term,value);
  }
  box.append(visit);
  if(unknown.length){const p=document.createElement('p');p.textContent='Not confirmed: '+unknown.join('; ')+'. Check with the provider.';box.append(p);}
  if(f.aliases?.length){const p=document.createElement('p');p.textContent='Also listed at this service address: '+f.aliases.join('; ');box.append(p);}
  const source=config.sources[f.source],a=document.createElement('a');a.href=f.url||source.url;a.textContent=f.url?'Check current provider details':'Check source & service';box.append(a);
  const date=document.createElement('p');date.className='atlas-source-date';date.textContent='Source checked '+source.checked+(source.published?' · Publisher/data date '+source.published:' · Publisher date not supplied')+'. Approximate location; confirm the entrance.';box.append(date);return box;
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
  const filtered=current.filter(f=>matchesResource(f));
  let visible=filtered.slice(0,limit);
  const filters=root.querySelector('#atlas-resource-filters'),options=root.querySelector('#atlas-resource-options');filters.hidden=false;options.replaceChildren();
  const views=resourceViews(),view=views.find(v=>v.id===resourceFilter);
  filters.querySelector('summary').textContent=(active==='everyday'?'Everyday type: ':'Resources: ')+view.label;
  {
   const available=new Set(current.flatMap(f=>(f.categories||[f.kind]).map(id=>types[id].group)));
   for(const {id,label,note} of views)if(active!=='everyday'||id==='all'||available.has(id)){
    const b=document.createElement('button');b.type='button';b.textContent=label;if(note)b.title=note;b.dataset.resourceGroup=id;b.setAttribute('aria-pressed',String(id===resourceFilter));
    b.addEventListener('click',()=>{resourceFilter=id;limit=active==='everyday'?8:4;filters.open=false;drawPlaces();fit();filters.querySelector('summary').focus({preventScroll:true});});options.append(b);
   }
  }
  const coverage=root.querySelector('#atlas-service-coverage');coverage.hidden=false;coverage.textContent=active==='everyday'?(serviceUnavailable?'Additional regional directory data is unavailable or not saved. The original directory remains; missing data does not mean no services.':'Statewide library, clinic and hospital directories; other service types remain partial. Confirm current services, intake and hours.'):(policy().phase+(serviceUnavailable?' Additional regional records are unavailable here.':''));
  if(active==='tsunami'){
   const hazard=shard?.tsunami||[];
   if(map&&hazard.length)L.geoJSON(collection(hazard),{style:{color:'#a04d20',weight:1,fillColor:'#e6a650',fillOpacity:.38,interactive:false}}).addTo(layerGroup);
  }
  for(const f of visible){
   const outline=shard?.buildings?.[f.id]?.geometry;
   if(map&&outline)L.geoJSON(collection([outline]),{style:{color:colors[f.kind],weight:1.5,fillOpacity:.15,interactive:false}}).addTo(layerGroup);
   let marker;
   if(map){marker=L.marker([f.lat,f.lng],{icon:L.divIcon({className:'atlas-pin '+f.kind,html:services?services.marker(f.kind):'<span class="atlas-marker-face" aria-hidden="true">'+types[f.kind].icon+'</span>',iconSize:[44,48],iconAnchor:[22,48],popupAnchor:[0,-40]}),keyboard:true,title:f.name,alt:f.name}).addTo(layerGroup);marker.bindPopup(info(f),{maxWidth:270,maxHeight:260});marker.on('click',()=>focus(f,marker));marker.getElement().dataset.resourceId=f.id;}
   const li=document.createElement('li');li.dataset.resourceId=f.id;
   const button=document.createElement('button');button.type='button';button.className='atlas-place-button';
   const locationNote=f.servesCounty&&!f.within?'Serves '+places.counties[selected.county]+' County · outside this city':selected.city&&!f.within?'Outside city · '+(places.counties[f.county]?places.counties[f.county]+' County · ':'')+(f.km<10?f.km.toFixed(1):Math.round(f.km))+' km straight-line from approximate city center':'';
   button.innerHTML='<span class="atlas-place-type '+f.kind+'" style="color:'+colors[f.kind]+'">'+escape(f.typeLabel||label(f.kind))+'</span><strong>'+escape(f.name)+'</strong><span>'+escape(f.address+', '+f.city)+'</span>'+(locationNote?'<span class="atlas-county-service">'+escape(locationNote)+'</span>':'');
   button.addEventListener('click',()=>focus(f,marker));li.append(button);
   const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Service details';detail.append(summary,info(f));li.append(detail);list.append(li);
  }
  const more=root.querySelector('#atlas-more');more.hidden=limit>=filtered.length;more.textContent=`Show ${Math.min(8,filtered.length-limit)} more places`;
  const note=root.querySelector('#atlas-list-note');
  if(active==='tsunami')note.textContent=shard?((shard.tsunami||[]).length?'Orange areas are the official county tsunami planning zones. Zoom in on the coast. Follow posted evacuation signs inland or uphill.':'This county has no polygons in this CGS tsunami dataset. This is not an all-hazards safety assessment.'):'The saved hazard layer is unavailable for this area. Open the official map below when online.';
  if(active!=='tsunami')note.textContent=filtered.length?`${visible.length} of ${filtered.length} directory places in this resource view.${selected.city&&filtered.some(f=>!f.within)?' Includes nearby/county locations, labelled below.':''} Confirm services before travel.`:view.note||'No checked physical locations in this category for this view. Use the separate referral and phone resources below.';
  const plan=disasters?.plans.get(active),showPlaces=true;
  list.hidden=!showPlaces;note.hidden=!showPlaces;root.querySelector('#atlas-list-title').hidden=!showPlaces;
  if(hasShelters()&&view.kinds.includes('shelter')){
   const li=document.createElement('li');li.className='atlas-shelter-link';li.innerHTML='<a href="https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html">Red Cross open-shelter map</a>';list.append(li);
  }
  if(!filtered.length&&view.url){const li=document.createElement('li'),a=document.createElement('a');li.className='atlas-shelter-link';a.href=view.url;a.textContent=view.linkLabel;li.append(a);list.append(li);}
  root.querySelector('#atlas-list-title').textContent=active==='everyday'?'Places on this map':'Resources for this plan';
  feedStatus.hidden=!(hasShelters()&&view.kinds.includes('shelter'));
  const legend=(active==='tsunami'?'<span class="legend-tsunami">Tsunami hazard area</span>':'')+[...new Set(visible.map(f=>f.kind))].map(kind=>services?services.legend(kind):'<span>'+types[kind].icon+escape(label(kind))+'</span>').join('');
  root.querySelector('#atlas-legend').innerHTML='<span class="legend-boundary">Approximate boundary</span>'+legend+(visible.some(f=>shard?.buildings?.[f.id])?'<span>Shaded building = estimated outline</span>':'');
  root.dataset.layer=active;
 }
 function guidance(){
  const plan=disasters?.plans.get(active),panel=root.querySelector('#atlas-action-plan');
  root.querySelector('#atlas-guidance').innerHTML=plan?'<strong>'+escape(plan.headline)+'</strong><span>'+escape(plan.note)+'</span>':'<strong>Find a useful place.</strong><span>Select a pin or a name for its address and service details.</span>';
  panel.hidden=!plan;panel.innerHTML=disasters?.planHTML(active)||'';
  const sources=root.querySelector('#atlas-hazard-sources');sources.replaceChildren();
  if(plan){for(const id of plan.layers){const s=disasters.registry.layers[id],p=document.createElement('p'),a=document.createElement('a');a.href=s.source;a.textContent=s.title;p.append(a,document.createTextNode(' · '+(s.published?s.published+' ('+s.dateMeaning+')':'Publisher date varies or is not supplied')+' · Checked '+s.checked+'. '+s.note));sources.append(p);}}
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
   if(run!==version||!hasShelters())return;
   let missing=0;
   const items=data.features.flatMap(f=>{const p=f.properties||{},xy=f.geometry?.coordinates;if(String(p.shelter_status_code).toUpperCase()!=='OPEN')return [];
    const lat=Number(xy?.[1]??p.latitude),lng=Number(xy?.[0]??p.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!b.contains([lat,lng])){missing++;return [];}
    const reported=p.reporting_period?(typeof p.reporting_period==='number'?new Date(p.reporting_period).toISOString():String(p.reporting_period)):'not supplied';
    return [{id:'fema-'+p.shelter_id,name:p.shelter_name||'FEMA-listed open shelter',address:p.address_1||'Address not provided',city:p.city||'City not supplied',lat,lng,county:null,within:contains(geometries(),lng,lat),km:selected.city?distance({lat,lng},selected):null,kind:'shelter',source:'shelters',detail:`Status listed OPEN; incident: ${p.incident_name||'not supplied'}. Provider report: ${reported}. Availability, access and capacity must be confirmed with local officials. This is an all-incident feed.`}];});
   const unique=[...new Map(items.map(f=>[f.id,f])).values()];
   shelterItems=unique;current=[...shelterItems,...staticPlaces()];drawPlaces();
   feedStatus.textContent=`FEMA checked ${new Date().toLocaleString()}. ${unique.length?unique.length+' listed open shelter(s) in the map area.':'No open shelters returned for this map area; this does not establish that none exist.'}${missing?' '+missing+' location(s) could not be mapped.':''} All incidents; confirm with local officials.`;
  }catch(error){if(run!==version||!hasShelters())return;feedStatus.textContent='FEMA shelter data is unavailable. Shelter locations are unknown here; check local officials or the Red Cross open-shelter map.';}
  finally{clearTimeout(timer);}
 }
 function renderLayer(){
  controller?.abort();hazardController?.abort();hazardGroup?.clearLayers();const run=++version;limit=active==='everyday'?8:4;resourceFilter=active==='everyday'?'all':policy().default;shelterItems=[];feedStatus.textContent='';root.querySelector('#atlas-resource-filters').open=false;
  everyday.setAttribute('aria-pressed',String(active==='everyday'));choices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.disaster===active)));
  root.querySelector('#atlas-hazard-legend').replaceChildren();root.querySelector('#atlas-layer-status').textContent='';root.querySelector('#atlas-layer-credit').textContent='';root.dataset.hazardLoading='false';
  const plan=disasters?.plans.get(active);guidance();
  if(map){
   if(hazardAttribution)map.attributionControl.removeAttribution(hazardAttribution);
   const publishers=active==='tsunami'?['CGS / Cal OES']:plan?plan.layers.map(id=>disasters.registry.layers[id].publisher):[];
   if(hasShelters())publishers.push('FEMA');
   hazardAttribution=publishers.length?'Selected layer: '+[...new Set(publishers)].join(', '):null;
   if(hazardAttribution)map.attributionControl.addAttribution(hazardAttribution);
  }
  current=staticPlaces();drawPlaces();fit();
  if(active==='tsunami')root.querySelector('#atlas-layer-status').textContent=shard?((shard.tsunami||[]).length?'CGS saved tsunami planning areas. Follow posted evacuation signs; unshaded land is not certified safe.':'No tsunami polygons in this county dataset. This is not an all-hazards safety assessment.'):'The detailed tsunami layer is not saved or available for this area. Use the official source.';
  else if(plan)riskLayer(run,plan);
  if(hasShelters())shelters(run);
  if(!offline&&document.querySelector('[data-location-page]')&&selected){const url=new URL(location.href);if(plan)url.searchParams.set('hazard',active);else url.searchParams.delete('hazard');history.replaceState(null,'',url);}
 }
 async function riskLayer(run,plan){
  const message=root.querySelector('#atlas-layer-status'),legend=root.querySelector('#atlas-hazard-legend');
  if(!map||!cityBounds){message.textContent='The interactive overlay could not load. The plan and official guidance remain available.';return;}
  root.dataset.hazardLoading='true';message.textContent=plan.layers.length?'Loading the official map layer…':'This plan has guidance; a verified overlay is not included yet.';
  hazardController=new AbortController();const requestController=hazardController,timer=setTimeout(()=>requestController.abort(new DOMException('GIS request timed out','TimeoutError')),18000),key=selected.key,id=active;
  try{
   const b=cityBounds,entry=await disasters.load(id,key,[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],requestController.signal);
   if(run!==version||id!==active||key!==selected?.key)return;
   const showStatus=(tileNote='')=>{if(run===version&&id===active&&key===selected?.key)message.textContent=disasters.description(entry)+(tileNote?' '+tileNote:'');};
   const drawn=disasters.draw(entry,map,hazardGroup,showStatus);
   for(const item of drawn.legend){const span=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=item.color;swatch.setAttribute('aria-hidden','true');span.append(swatch,document.createTextNode(item.label));legend.append(span);}
   showStatus();
   root.querySelector('#atlas-layer-credit').textContent=[...new Set(entry.parts.map(p=>disasters.registry.layers[p.id]?.credit).filter(Boolean))].join(' · ');
  }catch(error){if(run===version)message.textContent='The GIS layer is unavailable or timed out. Use the short plan and official map; missing data does not establish safety.';}
  finally{clearTimeout(timer);if(run===version)root.dataset.hazardLoading='false';}
 }
 async function update(){
  const run=++version;controller?.abort();hazardController?.abort();selected=point(select.value);root.hidden=!selected;if(!selected)return;
  controls.forEach(control=>{control.disabled=true;});root.setAttribute('aria-busy','true');
  shard=null;regionalServices=[];current=[];boundary?.clearLayers();layerGroup?.clearLayers();hazardGroup?.clearLayers();highlight?.clearLayers();list.replaceChildren();root.querySelector('#atlas-resource-options').replaceChildren();root.querySelector('#atlas-resource-filters').open=false;feedStatus.textContent='';
  root.querySelector('#resource-map-title').textContent=selected.name+' on the map';status.textContent='Loading the city outline…';
  const county=selected.county;
  const results=await Promise.allSettled([init(),loadCounty(county),services?services.load(county):Promise.reject(Error('Service reader unavailable'))]);if(run!==version)return;
  controls.forEach(control=>{control.disabled=false;});choices.forEach(button=>{button.disabled=!disasters;});root.removeAttribute('aria-busy');
  shard=results[1].status==='fulfilled'?results[1].value:null;
  regionalServices=results[2].status==='fulfilled'?results[2].value:[];serviceUnavailable=results[2].status!=='fulfilled';
  if(!map){renderLayer();return;}
  drawBoundary();status.textContent=!shard?(offline?'Offline overview. This area’s detailed outline and hazard layer were not saved.':'Area data unavailable. The approximate location, resources and source links remain available.'):(offline?'Saved outline and planning zones. Street tiles and shelter status are unavailable offline.':'Choose a pin or a place. City view restores the full area.');
  renderLayer();
 }
 everyday.addEventListener('click',()=>{active='everyday';renderLayer();});
 choices.forEach(button=>button.addEventListener('click',()=>{active=button.dataset.disaster;renderLayer();}));
 root.querySelector('#atlas-reset').addEventListener('click',()=>{highlight?.clearLayers();map?.closePopup();fit();});
 root.querySelector('#atlas-more').addEventListener('click',()=>{limit+=8;drawPlaces();fit();});
 const sourceList=root.querySelector('#atlas-source-list');
 for(const source of Object.values(config.sources)){const li=document.createElement('li'),a=document.createElement('a');a.href=source.url;a.textContent=source.title;li.append(a,document.createTextNode(' — '+(source.published?'Publisher/data date: '+source.published+'. ':'Publisher date not supplied. ')+source.note));sourceList.append(li);}
 // Export only public county geometry. Never copy map popups, private inputs or a live shelter status.
 window.FerdantResourceMap={get active(){return active;},async directory(key){
  const p=point(key);if(!p)throw Error('Choose a California city or county');
  const results=await Promise.allSettled([loadCounty(p.county),services?services.load(p.county):Promise.reject(Error('Service reader unavailable'))]);
  const area=results[0].status==='fulfilled'?results[0].value:null,extra=results[1].status==='fulfilled'?results[1].value:[],geoms=p.city?(area?.cities[p.key]||[]):[countyGeometry(p.county)].filter(Boolean);
  const items=[...config.facilities,...extra];
  return {place:p,items:services?services.nearby(items,p,f=>contains(geoms,f.lng,f.lat),{regional:results[1].status==='fulfilled'}):items.filter(f=>f.county===p.county),regionalAvailable:results[1].status==='fulfilled',geometryAvailable:Boolean(area)};
 },async embed(doc,key){const p=point(key),saved=p&&await loadCounty(p.county);const target=doc.querySelector('#city-map-snapshot');if(target)target.textContent=JSON.stringify(saved||{}).replace(/</g,'\\u003c');if(p)await services?.embed(doc,p.county);await disasters?.embed(doc,key,active);}};
 document.addEventListener('ferdant:location',update);update();
})();
