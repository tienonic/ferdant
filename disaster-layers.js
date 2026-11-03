'use strict';
(() => {
 const node=document.querySelector('#resource-map-data');if(!node)return;
 const registry=JSON.parse(node.textContent).disasters;if(!registry)return;
 const plans=new Map(registry.plans.map(p=>[p.id,p])),cache=new Map(),offline=location.protocol==='file:';
 const saved=JSON.parse(document.querySelector('#disaster-map-snapshot')?.textContent||'{}');
 if(saved.schema===1)for(const entry of saved.entries||[])if(plans.has(entry.plan)&&typeof entry.key==='string')cache.set(entry.key+':'+entry.plan,entry);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // ArcGIS GeoJSON dates can be ISO strings; JSON catalog dates use epoch ms.
 function timestamp(value){if(typeof value==='number')return Number.isFinite(value)?value:NaN;if(typeof value!=='string'||!value.trim())return NaN;const n=Number(value);return Number.isFinite(n)?n:Date.parse(value);}
 function planHTML(id){
  const p=plans.get(id);if(!p)return '';
  return '<h3>'+escape(p.label)+' plan</h3><ol class="disaster-steps">'+p.steps.map(s=>'<li><strong>'+escape(s.label)+'</strong><p>'+escape(s.text)+'</p></li>').join('')+'</ol><a class="disaster-guidance-link" href="'+escape(p.guidance.url)+'">Read official guidance</a><p class="disaster-plan-date">Guidance checked '+escape(p.guidance.checked)+(p.guidance.published?' · Publisher: '+escape(p.guidance.published):' · Publisher date not supplied')+'.</p>';
 }
 async function json(url,signal){
  const response=await fetch(url,{credentials:'omit',signal});if(!response.ok)throw Error('Source unavailable');
  const text=await response.text();if(text.length>6500000)throw Error('Area exceeds the map data limit');
  const data=JSON.parse(text);if(data.error)throw Error('Source returned an error');return data;
 }
 function validGeometry(g){
  if(!g||!['Polygon','MultiPolygon','LineString','MultiLineString','Point','MultiPoint'].includes(g.type))return false;
  let count=0;function coordinates(a){if(!Array.isArray(a)||!a.length)return false;if(typeof a[0]==='number'){count++;return a.length>=2&&Number.isFinite(a[0])&&Number.isFinite(a[1])&&Math.abs(a[0])<=180&&Math.abs(a[1])<=90;}return a.every(coordinates);}
  return coordinates(g.coordinates)&&count<=150000;
 }
 async function vectors(id,source,bounds,signal){
  const [west,south,east,north]=bounds,features=[],seen=new Set();let truncated=false,discarded=0,forecast=null,bytes=0,offset=0;
  if(source.monthly){
   const params=new URLSearchParams({f:'json',where:'1=1',outFields:'fcst_date,target,idp_filedate',returnGeometry:'false',resultRecordCount:'1'});
   const result=await json(source.service+'/query?'+params,signal),record=result.features?.[0]?.attributes,target=record?.target;
   const match=String(target||'').match(/^([A-Za-z]{3}) (\d{4})$/),month=match?'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(match[1])/3:-1;
   const issued=Number(record?.idp_filedate),start=match?Date.UTC(Number(match[2]),month,1):NaN;
   if(!match||!Number.isInteger(month)||month<0||Date.UTC(Number(match[2]),month+1,1)<=Date.now()||start>Date.now()+35*86400000||!Number.isFinite(issued)||issued>Date.now()+3600000||Date.now()-issued>60*86400000)throw Error('Monthly outlook is missing or expired');
   forecast={target,issued:new Date(Number(record.idp_filedate)).toISOString()};
  }
  for(let page=0;page<4;page++){
   const params=new URLSearchParams({f:'geojson',where:source.where,outFields:source.fields,geometry:[west,south,east,north].join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',returnGeometry:'true',maxAllowableOffset:'0.0001',geometryPrecision:'5',resultRecordCount:'500',resultOffset:String(offset)});
   const data=await json(source.service+'/query?'+params,signal);if(!Array.isArray(data.features))throw Error('Invalid GIS response');
   bytes+=JSON.stringify(data).length;if(bytes>10000000)throw Error('Area exceeds the map data limit');
   for(const f of data.features){
    if(!validGeometry(f.geometry)){discarded++;continue;}
    const props=f.properties||{},expires=timestamp(props.expiration);
    const featureId=f.id??props.OBJECTID??props.objectid;if(featureId!==undefined){if(seen.has(featureId))continue;seen.add(featureId);}
    if(source.live&&!source.monthly&&(!Number.isFinite(expires)||expires<=Date.now())){discarded++;continue;}
    // Retain a small, public display projection. No infrastructure inventory,
    // participant information or arbitrary publisher links enter saved files.
    const properties={};
    if(source.classes?.field)properties.category=String(props[source.classes.field]??'Unclassified');
    if(source.live&&!source.monthly){properties.label=String(props.prod_type||'NWS issued alert');properties.expires=expires;properties.issued=timestamp(props.issuance)||null;}
    features.push({type:'Feature',properties,geometry:f.geometry});
   }
   if(!data.exceededTransferLimit)break;
   if(page===3){truncated=true;break;}
   if(!data.features.length)throw Error('Incomplete GIS pagination');
   offset+=data.features.length;
  }
  return {id,type:'geojson',data:{type:'FeatureCollection',features},truncated,discarded,forecast};
 }
 async function heat(id,source,bounds,signal){
  const select=new URLSearchParams({f:'json',where:'1=1',outFields:'objectid,idp_filedate,idp_validtime',returnGeometry:'false',orderByFields:'idp_validtime ASC',resultRecordCount:'1'});
  const catalog=await json(source.service+'/query?'+select,signal),record=catalog.features?.[0]?.attributes;
  const valid=Number(record?.idp_validtime),issued=Number(record?.idp_filedate),objectid=Number(record?.objectid);
  if(!Number.isFinite(valid)||!Number.isFinite(issued)||!Number.isFinite(objectid)||valid+86400000<Date.now()||issued>Date.now()+3600000||Date.now()-issued>172800000)throw Error('Heat forecast is missing or stale');
  return image(id,source,bounds,signal,{mosaicRule:JSON.stringify({mosaicMethod:'esriMosaicLockRaster',lockRasterIds:[objectid],mosaicOperation:'MT_FIRST'}),renderingRule:JSON.stringify({rasterFunction:'heatrisk.rft'})},{valid:new Date(valid).toISOString(),issued:new Date(issued).toISOString()});
 }
 async function image(id,source,bounds,signal,extra={},dates={}){
  const params=new URLSearchParams({f:'json',bbox:bounds.join(','),bboxSR:'4326',imageSR:'3857',size:'800,600',format:'png32',transparent:'true',...extra});
  if(source.mapLayers)params.set('layers',source.mapLayers);
  const exported=await json(source.service+(source.kind==='map-image'?'/export?':'/exportImage?')+params,signal),url=new URL(exported.href||'',source.service),extent=exported.extent;
  if(url.origin!==new URL(source.service).origin||!url.pathname.startsWith('/'))throw Error('Unexpected image provider');
  if(!extent||![3857,102100].includes(extent.spatialReference?.latestWkid||extent.spatialReference?.wkid)||![extent.xmin,extent.ymin,extent.xmax,extent.ymax].every(Number.isFinite))throw Error('Invalid forecast extent');
  const response=await fetch(url.href,{credentials:'omit',signal});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error('Heat image unavailable');
  const blob=await response.blob();if(blob.size>3500000)throw Error('Heat image too large');
  const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
  return {id,type:'image',dataUrl,extent,...dates};
 }
 async function load(id,key,bounds,signal){
  const plan=plans.get(id);if(!plan)return {parts:[],issues:[],unavailable:true};
  const cacheKey=key+':'+id,prior=cache.get(cacheKey),live=plan.layers.some(k=>registry.layers[k].live);
  if(offline)return prior||{key,plan:id,parts:[],issues:['This layer was not saved for this city. Open the official source when online.'],unavailable:true};
  const validCached=prior?.parts.every(p=>{
   const s=registry.layers[p.id];if(!s?.live)return true;
   if(p.valid)return Date.parse(p.valid)+86400000>Date.now()&&Date.now()-Date.parse(p.issued)<172800000;
   if(p.forecast){const match=p.forecast.target.match(/^([A-Za-z]{3}) (\d{4})$/),month=match?'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(match[1])/3:-1;return match&&month>=0&&Date.UTC(Number(match[2]),month+1,1)>Date.now();}
   return p.data.features.every(f=>f.properties.expires>Date.now());
  });
  if(prior&&!prior.unavailable&&!prior.issues.length&&validCached&&(!live||Date.now()-Date.parse(prior.retrieved)<300000))return prior;
  const results=await Promise.allSettled(plan.layers.map(async layer=>{
   const source=registry.layers[layer];return source.kind==='heat-image'?heat(layer,source,bounds,signal):source.kind==='map-image'?image(layer,source,bounds,signal):vectors(layer,source,bounds,signal);
  }));
  if(signal.aborted&&signal.reason?.name!=='TimeoutError')throw new DOMException('Layer changed','AbortError');
  const parts=[],issues=[];
  results.forEach((result,i)=>{const source=registry.layers[plan.layers[i]];if(result.status==='fulfilled')parts.push(result.value);else issues.push(source.title+': unavailable.');});
  const entry={key,plan:id,retrieved:new Date().toISOString(),parts,issues,live,unavailable:Boolean(plan.layers.length&&!parts.length)};
  if(JSON.stringify(entry).length<=10000000)cache.set(cacheKey,entry);
  while(cache.size>18||[...cache.values()].reduce((n,e)=>n+JSON.stringify(e).length,0)>20000000)cache.delete(cache.keys().next().value);return entry;
 }
 function draw(entry,map,group){
  const legend=[];let polygons=0;
  for(const part of entry.parts){
   const source=registry.layers[part.id];if(!source)continue;
   if(part.type==='image'){
    const e=part.extent,sw=L.CRS.EPSG3857.unproject(L.point(e.xmin,e.ymin)),ne=L.CRS.EPSG3857.unproject(L.point(e.xmax,e.ymax));
    L.imageOverlay(part.dataUrl,L.latLngBounds(sw,ne),{pane:'disaster-planning',opacity:.5,interactive:false,alt:source.title+'; see the source description and key below.'}).addTo(group);
    legend.push({label:source.kind==='heat-image'?'HeatRisk: 0 Minimal · 1 Minor · 2 Moderate · 3 Major · 4 Extreme':source.title,color:source.color});
   }else{
    polygons+=part.data.features.length;
    L.geoJSON(part.data,{pane:'disaster-planning',interactive:false,style:f=>({className:'disaster-geometry disaster-'+part.id,color:source.classes?.colors?.[f.properties.category]||source.color,weight:1,fillOpacity:.25,interactive:false}),pointToLayer:(f,latlng)=>L.circleMarker(latlng,{pane:'disaster-planning',className:'disaster-geometry disaster-'+part.id,radius:4,color:source.color,interactive:false})}).addTo(group);
    if(source.classes?.field)for(const [label,color]of Object.entries(source.classes.colors))legend.push({label,color});
    else legend.push({label:source.title,color:source.color});
   }
  }
  return {legend:[...new Map(legend.map(x=>[x.label,x])).values()],polygons};
 }
 function description(entry){
  if(entry.unavailable)return offline?'Detailed GIS is not saved for this city and plan. The short plan and official source links remain available.':'GIS is unavailable for this area right now. Use the plan and official maps; missing data does not establish safety.';
  if(!plans.get(entry.plan).layers.length)return 'A verified GIS overlay is not included for this plan. Use the official guidance below; unshaded land is not a safe-area designation.';
  const count=entry.parts.reduce((n,p)=>n+(p.data?.features.length||0),0),image=entry.parts.find(p=>p.type==='image'),forecast=entry.parts.find(p=>p.forecast)?.forecast;
  const time=value=>new Date(value).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  const partial=entry.issues.length||entry.parts.some(p=>p.truncated);
  return (offline?'Saved planning overlay · '+time(entry.retrieved)+' · ':'Map checked '+time(entry.retrieved)+' · ')+(image?(image.valid?'Forecast valid time: '+time(image.valid)+'; issued '+time(image.issued)+'.':'NOAA planning image for this city area. Blank areas may be outside mapped coverage.'):count?'Mapped areas are shown for this city view.':entry.live?'No current alert or forecast areas could be mapped; this does not establish safe conditions.':'No mapped areas returned for this view; coverage may be incomplete.')+(forecast?' Monthly outlook: '+forecast.target+'; issued '+time(forecast.issued)+'.':'')+(partial?' Partial coverage: one or more layers are missing or incomplete.':'')+(entry.live?' Issued/forecast data at the check time; not continuous monitoring.':' Planning information, not a current warning.');
 }
 async function embed(doc,key,active){
  const entries=[];
  for(const entry of cache.values())if(entry.key===key){
   const parts=entry.parts.filter(p=>registry.layers[p.id]?.offline&&!registry.layers[p.id]?.live);
   if(parts.length)entries.push({...entry,parts,live:false,issues:entry.parts.length===parts.length?entry.issues:['Some online-only layers were excluded from this saved copy.']});
  }
  doc.querySelector('#disaster-map-snapshot').textContent=JSON.stringify({schema:1,entries}).replace(/</g,'\\u003c');
  let meta=doc.querySelector('meta[name="ferdant-disaster"]');if(!meta){meta=doc.createElement('meta');meta.name='ferdant-disaster';doc.head.append(meta);}meta.content=plans.has(active)?active:'everyday';
  const panel=doc.querySelector('#atlas-action-plan');if(panel){panel.innerHTML=planHTML(active);panel.hidden=!plans.has(active);}
  if(plans.has(active))doc.querySelector('#resource-atlas').hidden=false;
 }
 window.FerdantDisasters={registry,plans,load,draw,description,planHTML,embed};
})();
