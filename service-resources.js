'use strict';
(() => {
 const node=document.querySelector('#resource-map-data');if(!node)return;
 const config=JSON.parse(node.textContent),directory=config.serviceDirectory;
 if(!directory)return;
 const offline=location.protocol==='file:',cache=new Map(),pending=new Map();
 const saved=JSON.parse(document.querySelector('#service-map-snapshot')?.textContent||'{}');
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const distance=(a,b)=>{const r=Math.PI/180;return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lng-b.lng)*r/2)**2)));};
 function unpack(data,county){
  if(data.schema!==1||data.edition!==directory.edition||data.county!==county||!Array.isArray(data.records)||data.records.length!==directory.counties[county].count)throw Error('Wrong service edition');
  const ids=new Set();
  return data.records.map(row=>{
   if(!Array.isArray(row)||row.length!==directory.fields.length)throw Error('Invalid service record');
   const f=Object.fromEntries(directory.fields.map((key,i)=>[key,row[i]]));
   if(!['library','clinic'].includes(f.kind)||!['imls-library','hrsa-clinic'].includes(f.source)||typeof f.id!=='string'||ids.has(f.id)||!Number.isFinite(f.lat)||!Number.isFinite(f.lng)||f.lat<32||f.lat>42.1||f.lng< -125||f.lng> -114||!directory.counties[f.county])throw Error('Invalid public service point');
   ids.add(f.id);
   if(f.url){try{const url=new URL(f.url);if(!['http:','https:'].includes(url.protocol)||url.username)f.url='';}catch{f.url='';}}
   return {...directory.defaults[f.kind],...f,categories:[f.kind],situations:['everyday'],publicVisit:true,locationType:'service',confidential:false,servesCounties:[]};
  });
 }
 if(saved.schema===1&&saved.edition===directory.edition)for(const [county,data] of Object.entries(saved.counties||{}))if(directory.counties[county]){try{cache.set(county,{data,records:unpack(data,county)});}catch{/* Invalid saved regions remain unavailable. */}}
 async function load(county){
  if(cache.has(county))return cache.get(county).records;
  if(!directory.counties[county]||offline)throw Error('Regional service data is not saved');
  if(!pending.has(county))pending.set(county,(async()=>{
   const ref=directory.counties[county],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{
    const response=await fetch(ref.path,{credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('Service directory unavailable');
    const raw=await response.text();if(raw.length>1500000)throw Error('Service data limit exceeded');
    if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==ref.sha256)throw Error('Service data hash mismatch');}
    const data=JSON.parse(raw),records=unpack(data,county);cache.set(county,{data,records});
    while(cache.size>12)cache.delete(cache.keys().next().value);
    return records;
   }finally{clearTimeout(timer);pending.delete(county);}
  })());
  return pending.get(county);
 }
 function nearby(items,place,within,{regional=true}={}){
  const candidates=items.map(f=>({...f,within:within(f),servesCounty:(f.servesCounties||[]).includes(place.county),km:place.city?distance(f,place):null}));
  if(!place.city)return candidates.filter(f=>f.county===place.county||f.servesCounty).sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));
  const buckets=new Map(),priority=['food','support','housing','homeless-shelter','hospital','clinic','library','legal','senior-disability','transport','utility','supplies'];
  for(const kind of new Set(candidates.map(f=>f.kind))){
   const all=candidates.filter(f=>f.kind===kind).sort((a,b)=>Number(b.within)-Number(a.within)||a.km-b.km||a.id.localeCompare(b.id));
   const local=all.filter(f=>f.within),county=all.filter(f=>f.county===place.county),close=all.filter(f=>f.km<=25),serving=all.filter(f=>f.servesCounty);
   const chosen=local.length?local:close.length?close.slice(0,6):county.length?county.slice(0,3):['hospital',...(regional?['clinic','library']:[])].includes(kind)?all.slice(0,3):[];
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
  let data=null;try{await load(county);data=cache.get(county)?.data;}catch{/* A failed source must not silently become saved coverage. */}
  doc.querySelector('#service-map-snapshot').textContent=JSON.stringify({schema:1,edition:directory.edition,counties:data?{[county]:data}:{}}).replace(/</g,'\\u003c');
 }
 window.FerdantServices={load,nearby,marker,legend,embed,distance,directory};
})();
