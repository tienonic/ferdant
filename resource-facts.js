/* Five dated visit facts shared by map cards and printed resource books. */
'use strict';
(() => {
 const node=document.querySelector('#resource-map-data');if(!node)return;
 const config=JSON.parse(node.textContent),manifest=config.visitFacts,providers=config.providerVisitDetails?.records||{};
 const saved=JSON.parse(document.querySelector('#visit-facts-snapshot')?.textContent||'{}'),cache=new Map(),pending=new Map();
 const offline=location.protocol==='file:';
 const labels={location:'Location',hours:'Hours',services:'Services',cost:'Costs',amenities:'Amenities'};
 const days={Mo:'Mon',Tu:'Tue',We:'Wed',Th:'Thu',Fr:'Fri',Sa:'Sat',Su:'Sun',PH:'Public holidays',SH:'School holidays'};
 function clock(value){const [h,m]=value.split(':').map(Number);if(h===24&&m===0)return 'midnight';return (h%12||12)+(m?':'+String(m).padStart(2,'0'):'')+(h>=12?'pm':'am');}
 function hours(value){
  if(!value)return '';
  const raw=value.replace(/ \(OSM schedule notation; confirm\)$/,'').trim();
  if(raw==='24/7')return 'Daily, 24 hours (listed schedule)';
  const day='(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)',dayRange=day+'(?:-'+day+')?',dayList=dayRange+'(?:,\\s*'+dayRange+')*';
  const time='(?:(?:[01]\\d|2[0-3]):[0-5]\\d|24:00)',interval=time+'-'+time;
  const grammar=new RegExp('^(?:'+dayList+'\\s+)?(?:'+interval+'(?:,\\s*'+interval+')*|off|open|unknown)$');
  // Complex seasonal/appointment/holiday conditions remain verbatim, never guessed.
  if(!raw.split(';').every(part=>grammar.test(part.trim())))return value;
  return raw.replace(/\b(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)\b/g,d=>days[d]).replace(/(?:[01]\d|2[0-3]):[0-5]\d|24:00/g,clock).replace(/-/g,'\u2013').replace(/;\s*/g,'; ').replace(/,\s*/g,', ').replace(/\boff\b/g,'closed').replace(/\bunknown\b/g,'hours not listed');
 }
 function valid(data,county){
  if(data?.schema!==1||data.edition!==manifest.edition||data.county!==county||!data.records||Array.isArray(data.records)||Object.keys(data.records).length!==manifest.counties[county]?.count)throw Error('Wrong visit-fact edition');
  for(const [id,entry]of Object.entries(data.records)){
   if(!id||!entry.values||!entry.evidence||typeof entry.evidence.url!=='string'||!entry.evidence.url.startsWith('https://www.openstreetmap.org/'))throw Error('Invalid visit-fact source');
   for(const [key,value]of Object.entries(entry.values))if(!['hours','cost','services','amenities'].includes(key)||(key==='amenities'? !Array.isArray(value)||value.some(v=>typeof v!=='string'||v.length>1200):typeof value!=='string'||value.length>1200))throw Error('Invalid visit-fact value');
  }
  return data;
 }
 if(manifest&&saved.edition===manifest.edition)for(const [county,data]of Object.entries(saved.counties||{})){try{cache.set(county,valid(data,county));}catch{/* An invalid saved supplement is omitted. */}}
 async function load(county){
  if(!manifest)return;
  if(cache.has(county))return cache.get(county);
  if(offline||!manifest.counties[county])return;
  if(!pending.has(county))pending.set(county,(async()=>{
   const ref=manifest.counties[county],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch(ref.path,{credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('Visit details unavailable');
    const raw=await response.text();if(raw.length>2000000)throw Error('Visit details size limit');
    if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==ref.sha256)throw Error('Visit details hash mismatch');}
    const data=valid(JSON.parse(raw),county);cache.set(county,data);return data;
   }finally{clearTimeout(timer);}
  })().finally(()=>pending.delete(county)));
  return pending.get(county);
 }
 function rows(f){
  const extra=cache.get(f.county)?.records[f.id],provider=providers[f.id],visit=f.visit||{};
  const baseEvidence=config.sources?.[f.source];
  const value=(key,fallback)=>{
   if(provider?.values[key])return {value:provider.values[key],evidence:provider.evidence};
   if(visit[key])return {value:visit[key],evidence:baseEvidence};
   if(extra?.values[key])return {value:extra.values[key],evidence:extra.evidence};
   return {value:fallback};
  };
  const sourceLocation=[f.address,f.city].filter(Boolean).join(', ');
  const h=value('hours','Not listed; check before visiting.'),service=value('services',(f.categories||[f.kind]).map(k=>config.serviceTypes?.[k]?.label||k).join(', '));
  const cost=value('cost','Not listed; ask the provider.'),amenity=value('amenities',[]);
  let amenities=Array.isArray(amenity.value)?[...amenity.value]:[amenity.value];
  if(visit.accessibility){amenities=amenities.filter(s=>!/wheelchair/i.test(s));amenities.push(visit.accessibility.replace(/^Wheelchair access mapped: (yes|limited|no); not independently checked\.$/,(_,v)=>({yes:'Wheelchair access (mapped)',limited:'Limited wheelchair access (mapped)',no:'Wheelchair access not provided (mapped)'})[v]));}
  amenities=[...new Set(amenities.filter(Boolean))];
  return [{key:'location',label:labels.location,value:sourceLocation||'Street address not listed.'},
   {key:'hours',label:labels.hours,value:hours(h.value),evidence:h.evidence},
   {key:'services',label:labels.services,value:service.value,evidence:service.evidence},
   {key:'cost',label:labels.cost,value:cost.value,evidence:cost.evidence},
   {key:'amenities',label:labels.amenities,value:amenities.join('; ')||'Not listed.',evidence:amenity.evidence||baseEvidence}];
 }
 async function embed(doc,county){
  const counties={};for(const code of Array.isArray(county)?county:[county]){try{const data=await load(code);if(data)counties[code]=data;}catch{/* Unavailable fields retain their explicit missing labels. */}}
  const node=doc.querySelector('#visit-facts-snapshot');if(node)node.textContent=JSON.stringify({schema:1,edition:manifest?.edition,counties}).replace(/</g,'\\u003c');
 }
 window.FerdantResourceFacts={rows,hours,load,embed};
})();
