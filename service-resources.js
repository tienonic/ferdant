'use strict';
(() => {
 const node=document.querySelector('#resource-map-data');if(!node)return;
 const config=JSON.parse(node.textContent),directory=config.serviceDirectory,extra=config.everydayDirectory;
 if(!directory)return;
 const offline=location.protocol==='file:',cache=new Map(),pending=new Map();
 const saved=JSON.parse(document.querySelector('#service-map-snapshot')?.textContent||'{}');
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const distance=(a,b)=>{const r=Math.PI/180;return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lng-b.lng)*r/2)**2)));};
 function unpack(data,county,directory){
  if(data.schema!==1||data.edition!==directory.edition||data.county!==county||!Array.isArray(data.records)||data.records.length!==directory.counties[county].count)throw Error('Wrong service edition');
  const ids=new Set();
  return data.records.map(row=>{
   if(!Array.isArray(row)||row.length!==directory.fields.length)throw Error('Invalid service record');
   const f=Object.fromEntries(directory.fields.map((key,i)=>[key,row[i]]));
   const kinds=directory===extra?['food','water','restroom','shower']:['library','clinic'],sources=directory===extra?['sf-basic-needs','la-food-distribution','osm-basic-needs']:['imls-library','hrsa-clinic'];
   if(!kinds.includes(f.kind)||!sources.includes(f.source)||typeof f.id!=='string'||ids.has(f.id)||!Number.isFinite(f.lat)||!Number.isFinite(f.lng)||f.lat<32||f.lat>42.1||f.lng< -125||f.lng> -114||!directory.counties[f.county]||(directory===extra&&f.county!==county))throw Error('Invalid public service point');
   ids.add(f.id);
   if(f.url){try{const url=new URL(f.url);if(!['http:','https:'].includes(url.protocol)||url.username)f.url='';}catch{f.url='';}}
   const typeLabel=config.serviceTypes[f.kind].label+(f.source==='osm-basic-needs'?' / community mapped':f.source==='la-food-distribution'?' / 2023 directory':'');
   return {...directory.defaults[f.kind],...f,typeLabel,categories:[f.kind],situations:['everyday'],publicVisit:true,locationType:'service',confidential:false,servesCounties:[]};
  });
 }
 function restore(snapshot,dir){if(snapshot?.schema===1&&snapshot.edition===dir.edition)for(const [county,data] of Object.entries(snapshot.counties||{}))if(dir.counties[county]){try{cache.set(dir.edition+county,{data,records:unpack(data,county,dir)});}catch{/* Invalid saved regions remain unavailable. */}}}
 restore(saved,directory);if(extra)restore(saved.everyday,extra);
 async function loadDataset(county,directory){
  const key=directory.edition+county;
  if(cache.has(key))return cache.get(key).records;
  if(!directory.counties[county]||offline)throw Error('Regional service data is not saved');
  if(!pending.has(key))pending.set(key,(async()=>{
   const ref=directory.counties[county],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{
    const response=await fetch(ref.path,{credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('Service directory unavailable');
    const raw=await response.text();if(raw.length>1500000)throw Error('Service data limit exceeded');
    if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==ref.sha256)throw Error('Service data hash mismatch');}
    const data=JSON.parse(raw),records=unpack(data,county,directory);cache.set(key,{data,records});
    while(cache.size>24)cache.delete(cache.keys().next().value);
    return records;
   }finally{clearTimeout(timer);pending.delete(key);}
  })());
  return pending.get(key);
 }
 async function load(county){
  const details=window.FerdantResourceFacts?window.FerdantResourceFacts.load(county).catch(()=>null):Promise.resolve();
  const [records]=await Promise.all([Promise.all([loadDataset(county,directory),...(extra?[loadDataset(county,extra)]:[])]),details]);return records.flat();
 }
 function nearby(items,place,within,{regional=true}={}){
  const candidates=items.map(f=>({...f,within:within(f),servesCounty:(f.servesCounties||[]).includes(place.county),km:place.city?distance(f,place):null}));
  if(!place.city)return candidates.filter(f=>f.county===place.county||f.servesCounty).sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));
  const buckets=new Map(),priority=['food','water','restroom','shower','support','housing','homeless-shelter','hospital','clinic','library','legal','senior-disability','transport','utility','supplies'];
  for(const kind of new Set(candidates.map(f=>f.kind))){
   const all=candidates.filter(f=>f.kind===kind).sort((a,b)=>Number(b.within)-Number(a.within)||a.km-b.km||a.id.localeCompare(b.id));
   const local=all.filter(f=>f.within),county=all.filter(f=>f.county===place.county),close=all.filter(f=>f.km<=25),serving=all.filter(f=>f.servesCounty);
   const chosen=local.length?local:close.length?close.slice(0,6):county.length&&!['water','restroom','shower'].includes(kind)?county.slice(0,3):['hospital',...(regional?['clinic','library']:[])].includes(kind)?all.slice(0,3):[];
   const unique=[...new Map([...chosen,...serving].map(f=>[f.id,f])).values()];if(unique.length)buckets.set(kind,unique);
  }
  const result=[],kinds=[...buckets.keys()].sort((a,b)=>{const x=priority.indexOf(a),y=priority.indexOf(b);return (x<0?99:x)-(y<0?99:y);});
  for(let i=0;[...buckets.values()].some(b=>b.length>i);i++)for(const kind of kinds)if(buckets.get(kind)[i])result.push(buckets.get(kind)[i]);
  // An explicitly county-serving office should not vanish beneath a long list
  // of nearby clinics. Its real address/county and eligibility stay attached.
  for(const f of result.filter(f=>f.servesCounty&&!f.within).reverse()){result.splice(result.findIndex(x=>x.id===f.id),1);result.splice(Math.min(3,result.length),0,f);}
  return result;
 }
 function marker(kind){const type=config.serviceTypes[kind];return '<span class="atlas-marker-face" aria-hidden="true" style="--pin-color:'+type.color+'">'+type.icon+'</span>';}
 function legend(kind){const type=config.serviceTypes[kind];return '<span class="atlas-resource-key" style="color:'+type.color+'">'+type.icon+escape(type.label)+'</span>';}
 async function embed(doc,county){
  const counties=Array.isArray(county)?county:[county];
  const snapshot=async dir=>{const records={};for(const code of counties){try{await loadDataset(code,dir);const data=cache.get(dir.edition+code)?.data;if(data)records[code]=data;}catch{/* Failed data must not become saved coverage. */}}return {schema:1,edition:dir.edition,counties:records};};
  const saved=await snapshot(directory);if(extra)saved.everyday=await snapshot(extra);
  doc.querySelector('#service-map-snapshot').textContent=JSON.stringify(saved).replace(/</g,'\\u003c');
  await window.FerdantResourceFacts?.embed(doc,county);
 }
 window.FerdantServices={load,nearby,marker,legend,embed,distance,directory};
})();
