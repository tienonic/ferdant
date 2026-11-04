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
 const routeCache=new Map(),routeSnapshot=JSON.parse(document.querySelector('#evacuation-route-snapshot')?.textContent||'{}');
 if(routeSnapshot.county)routeCache.set(routeSnapshot.county,routeSnapshot);
 let routeData=null,routeGroup,routeAttribution;
 const routeControl=document.createElement('div');routeControl.className='atlas-route-controls';
 routeControl.innerHTML='<label><input type="checkbox" id="atlas-routes-toggle" checked><span class="atlas-route-swatch" aria-hidden="true"></span>Evacuation routes</label><p id="atlas-route-status" role="status"></p>';
 root.querySelector('.atlas-map-frame').before(routeControl);
 const routeToggle=routeControl.querySelector('input'),routeStatus=routeControl.querySelector('p');
 const layerLoading=document.createElement('div');layerLoading.className='atlas-layer-loading';layerLoading.hidden=true;layerLoading.setAttribute('role','status');layerLoading.setAttribute('aria-live','polite');
 layerLoading.innerHTML='<span class="atlas-loading-spinner" aria-hidden="true"></span><strong></strong><span>You can choose another layer while this loads.</span>';
 root.querySelector('.atlas-map-frame').append(layerLoading);
 let loadingDelay;
 function stopLayerLoading(){clearTimeout(loadingDelay);layerLoading.hidden=true;root.querySelector('#resource-map').setAttribute('aria-busy','false');}
 function startLayerLoading(label,run){
  stopLayerLoading();layerLoading.classList.remove('has-map-data');layerLoading.querySelector('strong').textContent='Loading '+label+' map…';root.querySelector('#resource-map').setAttribute('aria-busy','true');
  loadingDelay=setTimeout(()=>{if(run===version)layerLoading.hidden=false;},180);
 }
 let everydayItems=[],everydayCategories=new Map();
 const mapSummary=document.createElement('div');mapSummary.className='atlas-map-summary';mapSummary.hidden=true;
 mapSummary.innerHTML='<p id="atlas-map-count" role="status"></p><button type="button" id="atlas-fit-resources">Show all resources</button>';
 root.querySelector('.atlas-map-frame').after(mapSummary);
 mapSummary.querySelector('button').addEventListener('click',()=>{if(map&&everydayItems.length)map.fitBounds(L.latLngBounds(everydayItems.map(f=>[f.lat,f.lng])),{padding:[35,35],maxZoom:15,animate:false});});
 function everydayCount(){
  mapSummary.hidden=active!=='everyday'||!selected;
  const inView=map?everydayItems.filter(f=>map.getBounds().contains([f.lat,f.lng])).length:0;
  mapSummary.querySelector('p').textContent=map?everydayItems.length+' listed resources mapped / '+inView+' in this view. Select a places label to see the names.':'The interactive map is unavailable. Use the resource list below.';
  mapSummary.querySelector('button').disabled=!map||!everydayItems.length;
 }
 function drawEverydayPins(){
  if(!map||active!=='everyday'){everydayCount();return;}
  layerGroup.clearLayers();const groups=new Map(),zoom=map.getZoom();
  for(const f of everydayItems){const p=map.project([f.lat,f.lng],zoom),key=Math.floor(p.x/88)+':'+Math.floor(p.y/88);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
  for(const items of groups.values()){
   let marker;
   if(items.length===1){
    const f=items[0],outline=shard?.buildings?.[f.id]?.geometry;
    if(outline)L.geoJSON(collection([outline]),{style:{color:colors[f.kind],weight:1.5,fillOpacity:.15,interactive:false}}).addTo(layerGroup);
    marker=L.marker([f.lat,f.lng],{icon:L.divIcon({className:'atlas-pin '+f.kind,html:services?services.marker(f.kind):'<span class="atlas-marker-face" aria-hidden="true">'+types[f.kind].icon+'</span>',iconSize:[44,48],iconAnchor:[22,48],popupAnchor:[0,-40]}),keyboard:true,title:f.name,alt:f.name}).addTo(layerGroup);
    marker.on('click',()=>focus(f));marker.getElement().dataset.resourceId=f.id;
   }else{
    const lat=items.reduce((sum,f)=>sum+f.lat,0)/items.length,lng=items.reduce((sum,f)=>sum+f.lng,0)/items.length;
    const kinds=[...new Set(items.map(f=>f.kind))],name=items.length+' nearby places: '+kinds.map(label).join(', ')+'. Open the list.';
    const icons=kinds.slice(0,3).map(kind=>'<span style="color:'+colors[kind]+'">'+types[kind].icon+'</span>').join('')+(kinds.length>3?'<span>+</span>':'');
    marker=L.marker([lat,lng],{icon:L.divIcon({className:'atlas-cluster',html:'<span class="atlas-cluster-count">'+items.length+' places</span><span class="atlas-cluster-icons" aria-hidden="true">'+icons+'</span>',iconSize:[78,52],iconAnchor:[39,26],popupAnchor:[0,-22]}),keyboard:true,title:name,alt:name}).addTo(layerGroup);
    marker.getElement().setAttribute('aria-label',name);
    marker.getElement().addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();marker.fire('click',{originalEvent:event});}});
    marker.on('click',event=>{
     event.originalEvent?.preventDefault();
     const bounds=L.latLngBounds(items.map(f=>[f.lat,f.lng]));
     const popup=document.createElement('div');popup.className='atlas-cluster-popup';const heading=document.createElement('strong');heading.textContent=items.length+' places in this group';popup.append(heading);
     const box=document.createElement('div');box.className='atlas-cluster-places';
     for(const f of items){const button=document.createElement('button');button.type='button';button.innerHTML='<span class="atlas-cluster-place-icon" aria-hidden="true" style="color:'+colors[f.kind]+'">'+types[f.kind].icon+'</span><span>'+escape(f.name)+' / '+escape(label(f.kind))+'</span>';button.addEventListener('click',()=>focus(f));box.append(button);}
     popup.append(box);
     if(zoom<map.getMaxZoom()&&map.distance(bounds.getSouthWest(),bounds.getNorthEast())>35){const closer=document.createElement('button');closer.type='button';closer.className='atlas-cluster-zoom';closer.textContent='Zoom to these places';closer.addEventListener('click',()=>{map.closePopup();map.fitBounds(bounds,{padding:[45,45],maxZoom:Math.min(zoom+3,map.getMaxZoom()),animate:false});});popup.append(closer);}
     const size=map.getSize();
     L.popup({maxWidth:Math.min(290,Math.max(140,size.x-100)),maxHeight:Math.min(260,Math.max(100,size.y-160)),autoPanPaddingTopLeft:[50,60],autoPanPaddingBottomRight:[12,24]}).setLatLng([lat,lng]).setContent(popup).openOn(map);
     box.querySelector('button')?.focus({preventScroll:true});
    });
   }
   marker.getElement().dataset.resourceCount=String(items.length);marker.getElement().dataset.resourceIds=JSON.stringify(items.map(f=>f.id));
  }
  everydayCount();
 }
 routeToggle.addEventListener('change',()=>drawRoutes());
 async function loadRoutes(county){
  const entry=config.evacuation?.routeLayers?.[county];if(!entry)return null;
  if(routeCache.has(county))return routeCache.get(county);
  if(offline)return null;
  const response=await fetch(entry.path,{credentials:'omit'});if(!response.ok)throw Error('Route data unavailable');
  const data=await response.json();
  if(data.schema!==1||data.county!==county||data.checked!==entry.checked||data.source!==entry.source||data.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.every(f=>f.properties?.Evac_Route==='Yes'&&['LineString','MultiLineString'].includes(f.geometry?.type)))throw Error('Wrong route source or edition');
  routeCache.set(county,data);return data;
 }
 function drawRoutes(){
  routeGroup?.clearLayers();if(routeAttribution&&map)map.attributionControl.removeAttribution(routeAttribution);routeAttribution=null;
  const relevant=active==='everyday'||Boolean(config.evacuation?.events[active]);routeControl.hidden=!selected||!relevant;
  if(!selected||!relevant)return;
  const entry=config.evacuation?.routeLayers?.[selected.county];routeToggle.disabled=!routeData;
  if(!entry){routeStatus.textContent='No reviewed evacuation-road geometry for this location yet. See official maps in the disaster plan.';return;}
  if(!routeData||!map||!cityBounds){routeStatus.textContent=offline?'Evacuation roads were not saved in this copy.':'Evacuation-road data unavailable. Use the official county map.';return;}
  if(!routeToggle.checked){routeStatus.textContent='County evacuation planning routes hidden. Turn on to show them.';return;}
  const area=cityBounds.pad(.2),features=routeData.features.filter(f=>{
   const points=f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat();
   return area.intersects(L.latLngBounds(points.map(p=>[p[1],p[0]])));
  }),geo={type:'FeatureCollection',features};
  L.geoJSON(geo,{pane:'evacuation-routes',interactive:false,style:{color:'#fff',weight:8,opacity:.95}}).addTo(routeGroup);
  L.geoJSON(geo,{pane:'evacuation-routes',style:{className:'evacuation-route',color:'#a52b77',weight:4.5,dashArray:'10 6',opacity:1},onEachFeature:(f,layer)=>{
   layer.bindPopup('<strong>'+escape(f.properties.FULLSTREET||'County evacuation road')+'</strong><p>County-designated evacuation planning route. Follow current official instructions; this does not confirm the road is open.</p><a href="'+escape(entry.source)+'">Yolo County route source</a><p>Checked '+escape(entry.checked)+'</p>');
  }}).addTo(routeGroup);
  routeAttribution='Evacuation planning roads: <a href="'+escape(entry.source)+'">'+escape(entry.publisher)+'</a>';map.attributionControl.addAttribution(routeAttribution);
  routeStatus.textContent=features.length?'Purple dashed lines: county-designated planning roads. Not live closures or an assigned safe route. Checked '+entry.checked+'.':'The county layer has no route segments in this view. Follow current local instructions.';
 }
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
 function resourceScope(f){
  if(f.servesCounty)return {level:'county',label:'County service · '+places.counties[selected.county]};
  if(selected?.city&&f.within)return {level:'city',label:'City location · '+selected.name};
  if(f.county===selected?.county)return {level:'county',label:'County location · '+places.counties[f.county]};
  return {level:'nearby',label:'Nearby · '+(places.counties[f.county]?places.counties[f.county]+' County':'service area unconfirmed')};
 }
 function scopeBadge(f){const scope=resourceScope(f),badge=document.createElement('span');badge.className='resource-scope-badge scope-'+scope.level;badge.textContent=scope.label;return badge;}
 function policy(){return config.resourcePlans[active];}
 function searchGroup(){
  if(active==='everyday')return resourceFilter==='all'?'broad':resourceFilter==='temperature'?'emergency':resourceFilter;
  return ({basics:'food',housing:'housing',care:'health',information:'support',recovery:'support'})[resourceFilter]||'emergency';
 }
 document.querySelector('#atlas-search-more')?.addEventListener('click',event=>{
  const panel=document.querySelector('#resource-search'),group=document.querySelector('#resource-search-'+searchGroup());
  if(!panel||!group)return;
  event.preventDefault();panel.open=true;group.open=true;
  group.querySelector('summary').focus({preventScroll:true});group.scrollIntoView({block:'nearest'});
 });
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
   map.attributionControl.addAttribution('Everyday points: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &middot; <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>');
   map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
   map.attributionControl.addAttribution('Boundaries: CDTFA / U.S. Census');
   map.attributionControl.addAttribution('Buildings: © Microsoft, <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>');
   if(!offline){const tiles=L.tileLayer(config.tileUrl,{maxZoom:19,keepBuffer:1,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);tiles.on('tileerror',()=>{root.querySelector('#resource-map').dataset.tiles='unavailable';status.textContent='Street tiles unavailable. The city outline, resource pins and list still work.';});}
   boundary=L.layerGroup().addTo(map);layerGroup=L.layerGroup().addTo(map);hazardGroup=L.layerGroup().addTo(map);highlight=L.layerGroup().addTo(map);
   map.createPane('disaster-planning');map.getPane('disaster-planning').style.zIndex=390;
   map.createPane('evacuation-routes');map.getPane('evacuation-routes').style.zIndex=450;routeGroup=L.layerGroup().addTo(map);
   map.on('zoomend',()=>{if(active==='everyday')drawEverydayPins();});map.on('moveend',everydayCount);
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
  const matching=current.filter(f=>matchesResource(f)),shown=active==='everyday'?matching:matching.slice(0,limit);
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
  box.append(scopeBadge(f));
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
  const source=config.sources[f.source],a=document.createElement('a');a.href=f.url||source.url;a.textContent=f.source==='osm-basic-needs'?'View community-mapped location':f.source==='sf-basic-needs'||f.source==='la-food-distribution'?'Check source & service':f.url?'Check current provider details':'Check source & service';box.append(a);
  const date=document.createElement('p');date.className='atlas-source-date';date.textContent='Source checked '+source.checked+(source.published?' · Publisher/data date '+source.published:' · Publisher date not supplied')+'. Approximate location; confirm the entrance.';box.append(date);return box;
 }
 function focus(f,marker){
  highlight?.clearLayers();
  if(!map)return;
  const outline=shard?.buildings?.[f.id]?.geometry;
  if(outline)L.geoJSON(collection([outline]),{style:{color:colors[f.kind],weight:3,fillOpacity:.3,interactive:false}}).addTo(highlight);
  else L.circle([f.lat,f.lng],{radius:35,color:colors[f.kind],weight:3,fillOpacity:.14,interactive:false}).addTo(highlight);
  status.textContent=outline?'Estimated building outline containing this directory point. Confirm the entrance and service; this is not a structural-safety assessment.':'Approximate directory location. No uniquely matching building outline is available; confirm the address and entrance.';
  map.setView([f.lat,f.lng],17,{animate:false});if(marker)marker.openPopup();else L.popup({maxWidth:270,maxHeight:260}).setLatLng([f.lat,f.lng]).setContent(info(f)).openOn(map);
  if(active==='everyday')everydayCategories.get(f.kind)?.reveal(f);
  for(const li of list.querySelectorAll('li[data-resource-id]')){const selected=li.dataset.resourceId===f.id;li.classList.toggle('is-selected',selected);const detail=li.querySelector('.atlas-place-card');if(detail)detail.open=selected;}
 }
 function placeCard(f,marker){
  const li=document.createElement('li');li.dataset.resourceId=f.id;
  const detail=document.createElement('details');detail.className='atlas-place-card';
  const summary=document.createElement('summary');summary.className='atlas-place-summary';
  const locationNote=f.servesCounty&&!f.within?'Serves '+places.counties[selected.county]+' County · outside this city':selected.city&&!f.within?'Outside city · '+(places.counties[f.county]?places.counties[f.county]+' County · ':'')+(f.km<10?f.km.toFixed(1):Math.round(f.km))+' km straight-line from approximate city center':'';
  summary.innerHTML='<span class="atlas-place-symbol" style="color:'+colors[f.kind]+'">'+types[f.kind].icon+'</span><span class="atlas-place-heading"><strong>'+escape(f.name)+'</strong><span class="atlas-place-type">'+escape(f.typeLabel||label(f.kind))+'</span>'+(locationNote?'<span class="atlas-county-service">Outside city'+(f.km!==null?' / '+Math.round(f.km)+' km':'')+'</span>':'')+'</span>';
  li.dataset.resourceLevel=resourceScope(f).level;summary.querySelector('.atlas-place-heading').append(scopeBadge(f));
  const body=info(f);if(locationNote){const p=document.createElement('p');p.className='atlas-county-service';p.textContent=locationNote;body.prepend(p);}
  detail.append(summary,body);detail.addEventListener('toggle',()=>{if(detail.open)focus(f,marker);});li.append(detail);return li;
 }
 function everydayCategoryList(items){
  const names={food:'Food & meals',water:'Drinking water',restroom:'Bathrooms',shower:'Showers',housing:'Day centers & housing help','homeless-shelter':'Shelters',hospital:'Hospitals',clinic:'Clinics',library:'Libraries & internet',legal:'Legal help',support:'Community support',supplies:'Clothing & supplies'};
  const groups=new Map();for(const f of items){if(!groups.has(f.kind))groups.set(f.kind,[]);groups.get(f.kind).push(f);}
  for(const [kind,resources] of groups){
   const row=document.createElement('li'),detail=document.createElement('details'),summary=document.createElement('summary');detail.className='atlas-category';detail.dataset.resourceKind=kind;detail.dataset.resourceCount=String(resources.length);summary.className='atlas-category-summary';
   summary.innerHTML='<span class="atlas-place-symbol" style="color:'+colors[kind]+'">'+types[kind].icon+'</span><span>'+escape(names[kind]||label(kind))+' <span class="atlas-category-count">('+resources.length+')</span></span>';
   const cards=document.createElement('ul');cards.className='atlas-category-places';const more=document.createElement('button');more.type='button';more.className='atlas-more';more.hidden=true;
   let next=0;const rendered=new Set();
   const append=f=>{if(!rendered.has(f.id)){cards.append(placeCard(f));rendered.add(f.id);}};
   const addPage=()=>{resources.slice(next,next+8).forEach(append);next=Math.min(next+8,resources.length);more.hidden=next>=resources.length;more.textContent='Show more '+(names[kind]||label(kind)).toLowerCase();};
   detail.addEventListener('toggle',()=>{if(detail.open&&next===0)addPage();});more.addEventListener('click',addPage);
   detail.append(summary,cards,more);row.append(detail);list.append(row);
   everydayCategories.set(kind,{reveal:f=>{if(next===0)addPage();append(f);detail.open=true;}});
  }
 }
 function drawPlaces(){
  layerGroup?.clearLayers();highlight?.clearLayers();list.replaceChildren();everydayCategories=new Map();
  root.querySelector('#resource-map').dataset.layer=active;
  const filtered=current.filter(f=>matchesResource(f));
  everydayItems=active==='everyday'?filtered:[];
  let visible=active==='everyday'?[]:filtered.slice(0,limit);
  const filters=root.querySelector('#atlas-resource-filters'),options=root.querySelector('#atlas-resource-options');filters.hidden=false;options.replaceChildren();
  const views=resourceViews(),view=views.find(v=>v.id===resourceFilter);
  const searchContext=document.querySelector('#resource-search-location');
  if(searchContext&&selected)searchContext.textContent='Looking around '+selected.name+', California? Choose a directory below and enter your city, county or ZIP code there.';
  filters.querySelector('summary').textContent=(active==='everyday'?'Filter map: ':'Resources: ')+view.label;
  {
   const available=new Set(current.flatMap(f=>(f.categories||[f.kind]).map(id=>types[id].group)));
   for(const {id,label,note} of views)if(active!=='everyday'||id==='all'||available.has(id)){
    const b=document.createElement('button');b.type='button';b.textContent=label+(active==='everyday'?' ('+current.filter(f=>matchesResource(f,id)).length+')':'');if(note)b.title=note;b.dataset.resourceGroup=id;b.setAttribute('aria-pressed',String(id===resourceFilter));
    b.addEventListener('click',()=>{resourceFilter=id;limit=active==='everyday'?8:4;filters.open=false;drawPlaces();fit();filters.querySelector('summary').focus({preventScroll:true});});options.append(b);
   }
  }
  const coverage=root.querySelector('#atlas-service-coverage');coverage.hidden=false;coverage.textContent=active==='everyday'?(serviceUnavailable?'Additional regional directory data is unavailable or not saved. The original directory remains; missing data does not mean no services.':'Food, water, hygiene, healthcare, libraries and practical support. Coverage varies by area; community-mapped and older listings are labeled. Confirm access, hours and current service.'):(policy().phase+(serviceUnavailable?' Additional regional records are unavailable here.':''));
  if(active==='tsunami'){
   const hazard=shard?.tsunami||[];
   if(map&&hazard.length)L.geoJSON(collection(hazard),{style:{color:'#a04d20',weight:1,fillColor:'#e6a650',fillOpacity:.38,interactive:false}}).addTo(layerGroup);
  }
  if(active==='everyday'){drawEverydayPins();everydayCategoryList(filtered);}else everydayCount();
  for(const f of visible){
   const outline=shard?.buildings?.[f.id]?.geometry;
   if(map&&outline&&active!=='everyday')L.geoJSON(collection([outline]),{style:{color:colors[f.kind],weight:1.5,fillOpacity:.15,interactive:false}}).addTo(layerGroup);
   let marker;
   if(map&&active!=='everyday'){marker=L.marker([f.lat,f.lng],{icon:L.divIcon({className:'atlas-pin '+f.kind,html:services?services.marker(f.kind):'<span class="atlas-marker-face" aria-hidden="true">'+types[f.kind].icon+'</span>',iconSize:[44,48],iconAnchor:[22,48],popupAnchor:[0,-40]}),keyboard:true,title:f.name,alt:f.name}).addTo(layerGroup);marker.bindPopup(info(f),{maxWidth:270,maxHeight:260});marker.on('click',()=>focus(f,marker));marker.getElement().dataset.resourceId=f.id;}
   list.append(placeCard(f,marker));
  }
  const more=root.querySelector('#atlas-more');more.hidden=active==='everyday'||limit>=filtered.length;more.textContent=`Show ${Math.min(8,filtered.length-limit)} more places`;
  const note=root.querySelector('#atlas-list-note');
  if(active==='tsunami')note.textContent=shard?((shard.tsunami||[]).length?'Orange areas are the official county tsunami planning zones. Zoom in on the coast. Follow posted evacuation signs inland or uphill.':'This county has no polygons in this CGS tsunami dataset. This is not an all-hazards safety assessment.'):'The saved hazard layer is unavailable for this area. Open the official map below when online.';
  if(active!=='tsunami')note.textContent=filtered.length?`${active==='everyday'?filtered.length:visible.length+' of '+filtered.length} directory places in this resource view.${selected.city&&filtered.some(f=>!f.within)?' Includes nearby/county locations, labelled below.':''} Confirm services before travel.`:view.note||'No checked physical locations in this category for this view. Use the separate referral and phone resources below.';
  root.querySelector('#atlas-result-count').textContent=filtered.length?(active==='everyday'?`${filtered.length} places. Open a category to see names and details.`:`${visible.length} of ${filtered.length} places. Confirm before visiting.`):view.note||'No listed places here. Open Coverage & more help for other options.';
  root.querySelector('#atlas-panel-notes').open=serviceUnavailable;
  const plan=disasters?.plans.get(active),showPlaces=true;
  list.hidden=!showPlaces;note.hidden=!showPlaces;root.querySelector('#atlas-list-title').hidden=!showPlaces;
  if(hasShelters()&&view.kinds.includes('shelter')){
   const li=document.createElement('li');li.className='atlas-shelter-link';li.innerHTML='<a href="https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html">Red Cross open-shelter map</a>';list.append(li);
  }
  if(!filtered.length&&view.url){const li=document.createElement('li'),a=document.createElement('a');li.className='atlas-shelter-link';a.href=view.url;a.textContent=view.linkLabel;li.append(a);list.append(li);}
  root.querySelector('#atlas-list-title').textContent=active==='everyday'?'Places on this map':'Resources for this plan';
  feedStatus.hidden=!(hasShelters()&&view.kinds.includes('shelter'));root.querySelector('#atlas-shelter-note').hidden=feedStatus.hidden;
  const legend=(active==='tsunami'?'<span class="legend-tsunami">Tsunami hazard area</span>':'')+[...new Set((active==='everyday'?filtered:visible).map(f=>f.kind))].map(kind=>services?services.legend(kind):'<span>'+types[kind].icon+escape(label(kind))+'</span>').join('');
  root.querySelector('#atlas-legend').innerHTML='<span class="legend-boundary">Approximate boundary</span>'+legend+((active==='everyday'?filtered:visible).some(f=>shard?.buildings?.[f.id])?'<span>Shaded building = estimated outline</span>':'');
  root.dataset.layer=active;
 }
 function evacuationHTML(){
  const data=config.evacuation;if(!selected||!data?.events[active])return '';
  const ids=[...new Set([...(data.cities[selected.key]||[]),...(data.counties[selected.county]||[])])];
  const sources=ids.map(id=>data.sources[id]);
  if(!sources.length)sources.push(data.sources.calalerts);
  if(active==='tsunami')sources.push(data.sources['tsunami-maps']);
  sources.push(data.sources.caltrans);
  const links=[...new Map(sources.map(s=>[s.mapURL||s.url,s])).values()].map(s=>'<a href="'+escape(s.mapURL||s.url)+'">'+escape(s.mapLabel||s.title)+'</a>').join('');
  const note=ids.length?'Look up your address for local zones and instructions. Follow the route officials give for the incident.':'No local route map has been verified for '+selected.name+' in this edition. Use your county emergency instructions.';
  return '<section class="atlas-evacuation" aria-labelledby="atlas-evacuation-title"><h4 id="atlas-evacuation-title">Evacuation routes &amp; maps</h4><nav aria-label="Official evacuation maps">'+links+'</nav><p>'+escape(note)+(active==='tsunami'?' Tsunami shading is a planning area; follow posted evacuation signs.':'')+'</p><small>Official links · Internet required · Reviewed '+escape(data.checked)+'</small></section>';
 }
 function guidance(){
  const plan=disasters?.plans.get(active),panel=root.querySelector('#atlas-action-plan');
  root.querySelector('#atlas-guidance').innerHTML=plan?'<strong>'+escape(plan.headline)+'</strong><span>'+escape(plan.note)+'</span>':'<strong>Find food, water and other help.</strong><span>Icons show the type of help. A label like “3 places” groups nearby locations — select it to see the names.</span>';
  panel.hidden=!plan;panel.innerHTML=plan?'<details class="atlas-plan-details"><summary>Safety steps &amp; evacuation</summary><div>'+disasters.planHTML(active)+'</div></details>':'';
  panel.querySelector('.disaster-steps')?.insertAdjacentHTML('beforebegin',evacuationHTML());
  const sources=root.querySelector('#atlas-hazard-sources');sources.replaceChildren();
  if(plan){for(const id of plan.layers){const s=disasters.registry.layers[id],p=document.createElement('p'),a=document.createElement('a');a.href=s.source;a.textContent=s.title;p.append(a,document.createTextNode(' · '+(s.published?s.published+' ('+s.dateMeaning+')':'Publisher date varies or is not supplied')+' · Checked '+s.checked+'. '+s.note));sources.append(p);}}
 }
 // Print the complete selected safety plan; restore the reader's compact view.
 let printDetails=[];
 window.addEventListener('beforeprint',()=>{printDetails=[...root.querySelectorAll('.atlas-plan-details:not([open])')];printDetails.forEach(d=>{d.open=true;});});
 window.addEventListener('afterprint',()=>{printDetails.forEach(d=>{d.open=false;});printDetails=[];});
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
  stopLayerLoading();
  controller?.abort();hazardController?.abort();hazardGroup?.clearLayers();const run=++version;limit=active==='everyday'?8:4;resourceFilter=active==='everyday'?'all':policy().default;shelterItems=[];feedStatus.textContent='';root.querySelector('#atlas-resource-filters').open=false;
  everyday.setAttribute('aria-pressed',String(active==='everyday'));choices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.disaster===active)));
  root.querySelector('#atlas-hazard-legend').replaceChildren();root.querySelector('#atlas-layer-status').textContent='';root.querySelector('#atlas-layer-credit').textContent='';root.dataset.hazardLoading='false';
  const faultHelp=root.querySelector('#atlas-fault-help');if(faultHelp){faultHelp.hidden=active!=='earthquake';if(faultHelp.hidden){faultHelp.open=false;faultHelp.querySelectorAll('details').forEach(detail=>detail.open=false);}}
  const plan=disasters?.plans.get(active);guidance();
  if(map){
   if(hazardAttribution)map.attributionControl.removeAttribution(hazardAttribution);
   const publishers=active==='tsunami'?['CGS / Cal OES']:plan?plan.layers.map(id=>disasters.registry.layers[id].publisher):[];
   if(hasShelters())publishers.push('FEMA');
   hazardAttribution=publishers.length?'Selected layer: '+[...new Set(publishers)].join(', '):null;
   if(hazardAttribution)map.attributionControl.addAttribution(hazardAttribution);
  }
  current=staticPlaces();drawPlaces();fit();drawRoutes();
  if(active==='tsunami')root.querySelector('#atlas-layer-status').textContent=shard?((shard.tsunami||[]).length?'CGS saved tsunami planning areas. Follow posted evacuation signs; unshaded land is not certified safe.':'No tsunami polygons in this county dataset. This is not an all-hazards safety assessment.'):'The detailed tsunami layer is not saved or available for this area. Use the official source.';
  else if(plan)riskLayer(run,plan);
  if(hasShelters())shelters(run);
  if(!offline&&document.querySelector('[data-location-page]')&&selected){const url=new URL(location.href);if(plan)url.searchParams.set('hazard',active);else url.searchParams.delete('hazard');history.replaceState(null,'',url);}
 }
 async function riskLayer(run,plan){
  const message=root.querySelector('#atlas-layer-status'),legend=root.querySelector('#atlas-hazard-legend');
  if(!map||!cityBounds){message.textContent='The interactive overlay could not load. The plan and official guidance remain available.';return;}
  root.dataset.hazardLoading='true';message.textContent=plan.layers.length?'Loading the official map layer…':'This plan has guidance; a verified overlay is not included yet.';
  if(plan.layers.length)startLayerLoading(plan.label,run);
  hazardController=new AbortController();const requestController=hazardController,timer=setTimeout(()=>requestController.abort(new DOMException('GIS request timed out','TimeoutError')),18000),key=selected.key,id=active;
  const drawnParts=new Set(),legendLabels=new Set(),paints=[],tileNotes=new Map();let completeEntry;
  const isCurrent=()=>run===version&&id===active&&key===selected?.key;
  const showStatus=()=>{if(isCurrent()&&completeEntry)message.textContent=disasters.description(completeEntry)+[...tileNotes.values()].filter(Boolean).map(note=>' '+note).join('');};
  const paint=part=>{
   if(!isCurrent()||drawnParts.has(part.id))return;drawnParts.add(part.id);
   const drawn=disasters.draw({parts:[part]},map,hazardGroup,note=>{tileNotes.set(part.id,note);showStatus();},requestController.signal);
   for(const item of drawn.legend)if(!legendLabels.has(item.label)){legendLabels.add(item.label);const span=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=item.color;swatch.setAttribute('aria-hidden','true');span.append(swatch,document.createTextNode(item.label));legend.append(span);}
   paints.push(drawn.ready.then(()=>{if(isCurrent()&&(part.type!=='geojson'||part.data.features.length)){layerLoading.classList.add('has-map-data');layerLoading.querySelector('strong').textContent='Loading remaining '+plan.label.toLowerCase()+' detail…';}}));
  };
  try{
   const b=cityBounds,entry=await disasters.load(id,key,[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],requestController.signal,paint);
   if(run!==version||id!==active||key!==selected?.key)return;
   completeEntry=entry;entry.parts.forEach(paint);
   showStatus();
   root.querySelector('#atlas-layer-credit').textContent=[...new Set(entry.parts.map(p=>disasters.registry.layers[p.id]?.credit).filter(Boolean))].join(' · ');
   await Promise.all(paints);
  }catch(error){if(run===version)message.textContent='The GIS layer is unavailable or timed out. Use the short plan and official map; missing data does not establish safety.';}
  finally{clearTimeout(timer);if(run===version){root.dataset.hazardLoading='false';stopLayerLoading();}}
 }
 async function update(){
  stopLayerLoading();
  const run=++version;controller?.abort();hazardController?.abort();selected=point(select.value);everydayItems=[];routeData=null;routeGroup?.clearLayers();root.hidden=!selected;if(!selected)return;
  controls.forEach(control=>{control.disabled=true;});root.setAttribute('aria-busy','true');
  shard=null;regionalServices=[];current=[];boundary?.clearLayers();layerGroup?.clearLayers();hazardGroup?.clearLayers();highlight?.clearLayers();list.replaceChildren();root.querySelector('#atlas-resource-options').replaceChildren();root.querySelector('#atlas-resource-filters').open=false;feedStatus.textContent='';
  root.querySelector('#resource-map-title').textContent='Resource map';status.textContent='Loading the city outline…';
  const county=selected.county;
  const results=await Promise.allSettled([init(),loadCounty(county),services?services.load(county):Promise.reject(Error('Service reader unavailable')),loadRoutes(county)]);if(run!==version)return;
  controls.forEach(control=>{control.disabled=false;});choices.forEach(button=>{button.disabled=!disasters;});root.removeAttribute('aria-busy');
  shard=results[1].status==='fulfilled'?results[1].value:null;
  regionalServices=results[2].status==='fulfilled'?results[2].value:[];serviceUnavailable=results[2].status!=='fulfilled';
  routeData=results[3].status==='fulfilled'?results[3].value:null;
  if(!map){renderLayer();return;}
  drawBoundary();status.textContent=!shard?(offline?'Offline overview. This area’s detailed outline and hazard layer were not saved.':'Area data unavailable. The approximate location, resources and source links remain available.'):(offline?'Saved outline and planning zones. Street tiles and shelter status are unavailable offline.':'Choose a pin or a place. City view restores the full area.');
  renderLayer();
 }
 everyday.addEventListener('click',()=>{active='everyday';renderLayer();});
 choices.forEach(button=>button.addEventListener('click',()=>{active=button.dataset.disaster;renderLayer();}));
 root.querySelector('#atlas-reset').addEventListener('click',()=>{highlight?.clearLayers();map?.closePopup();fit();});
 root.querySelector('#atlas-more').addEventListener('click',()=>{limit+=8;drawPlaces();if(active!=='everyday')fit();});
 const sourceList=root.querySelector('#atlas-source-list');
 for(const source of Object.values(config.sources)){const li=document.createElement('li'),a=document.createElement('a');a.href=source.url;a.textContent=source.title;li.append(a,document.createTextNode(' — '+(source.published?'Publisher/data date: '+source.published+'. ':'Publisher date not supplied. ')+source.note));sourceList.append(li);}
 // Export only public county geometry. Never copy map popups, private inputs or a live shelter status.
 window.FerdantResourceMap={get active(){return active;},async bookletGeometry(key){
  const p=point(key||'');
  if(!p)return {place:null,boundary:places.map.geometry.features.map(f=>f.geometry),bounds:[-124.6,32.3,-114,42.2]};
  const area=await loadCounty(p.county).catch(()=>null);
  const boundary=p.city?(area?.cities[p.key]||[]):[countyGeometry(p.county)].filter(Boolean);
  const points=boundary.flatMap(g=>rings(g).flat(2)),xs=points.map(c=>c[0]),ys=points.map(c=>c[1]);
  const bounds=points.length?[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]:[p.lng-.05,p.lat-.035,p.lng+.05,p.lat+.035];
  return {place:p,boundary,bounds};
 },async routeMap(key){
  const p=point(key||'');if(!p)return null;
  const [data,area]=await Promise.all([loadRoutes(p.county).catch(()=>null),loadCounty(p.county).catch(()=>null)]);if(!data)return null;
  const boundary=p.city?(area?.cities[p.key]||[]):[countyGeometry(p.county)].filter(Boolean);if(!boundary.length)return null;
  const points=boundary.flatMap(g=>rings(g).flat(2)),xs=points.map(c=>c[0]),ys=points.map(c=>c[1]);
  const west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys),dx=(east-west)*.2,dy=(north-south)*.2;
  const bounds=[west-dx,south-dy,east+dx,north+dy];
  const features=data.features.filter(f=>{const points=f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat();return Math.min(...points.map(p=>p[0]))<=bounds[2]&&Math.max(...points.map(p=>p[0]))>=bounds[0]&&Math.min(...points.map(p=>p[1]))<=bounds[3]&&Math.max(...points.map(p=>p[1]))>=bounds[1];});
  return {features,boundary,bounds,checked:data.checked,source:data.source,publisher:config.evacuation.routeLayers[p.county].publisher};
 },async directory(key){
  const p=point(key);if(!p)throw Error('Choose a California city or county');
  const results=await Promise.allSettled([loadCounty(p.county),services?services.load(p.county):Promise.reject(Error('Service reader unavailable'))]);
  const area=results[0].status==='fulfilled'?results[0].value:null,extra=results[1].status==='fulfilled'?results[1].value:[],geoms=p.city?(area?.cities[p.key]||[]):[countyGeometry(p.county)].filter(Boolean);
  const items=[...config.facilities,...extra];
  return {place:p,items:services?services.nearby(items,p,f=>contains(geoms,f.lng,f.lat),{regional:results[1].status==='fulfilled'}):items.filter(f=>f.county===p.county),regionalAvailable:results[1].status==='fulfilled',geometryAvailable:Boolean(area)};
 },async embed(doc,key){const p=point(key),saved=p&&await loadCounty(p.county);const target=doc.querySelector('#city-map-snapshot');if(target)target.textContent=JSON.stringify(saved||{}).replace(/</g,'\\u003c');if(p){await services?.embed(doc,p.county);const routes=await loadRoutes(p.county).catch(()=>null);let node=doc.querySelector('#evacuation-route-snapshot');if(!node){node=doc.createElement('script');node.type='application/json';node.id='evacuation-route-snapshot';doc.body.prepend(node);}node.textContent=JSON.stringify(routes||{}).replace(/</g,'\\u003c');}await disasters?.embed(doc,key,active);await window.FerdantBookletMap?.embed(doc,key);}};
 document.addEventListener('ferdant:location',update);update();
})();
