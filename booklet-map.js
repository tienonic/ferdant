/* Public, static road geometry for booklet page 2; no tiles or live GIS requests. */
'use strict';
(() => {
 const dataNode=document.querySelector('#resource-map-data');if(!dataNode)return;
 const config=JSON.parse(dataNode.textContent),manifest=config.bookletRoads;if(!manifest)return;
 const snapshot=JSON.parse(document.querySelector('#booklet-road-snapshot')?.textContent||'{}');
 const offline=location.protocol==='file:',cache=new Map(),pending=new Map();
 if(snapshot.edition===manifest.edition)for(const [county,data] of Object.entries(snapshot.counties||{}))cache.set(county,data);
 function valid(data,county){
  if(data?.schema!==1||data.edition!==manifest.edition||data.county!==county)throw Error('Wrong road edition');
  const rows=[data.roads,...Object.values(data.cities||{}).map(city=>city.roads)];
  if(!rows.every(roads=>Array.isArray(roads)&&roads.every(row=>Array.isArray(row)&&row.length===3&&typeof row[0]==='string'&&['primary','secondary','street'].includes(row[1])&&Array.isArray(row[2])&&row[2].every(line=>line.length>=2&&line.every(p=>p.length===2&&p.every(Number.isFinite)&&p[0]>-126&&p[0]<-112&&p[1]>31&&p[1]<44)))))throw Error('Invalid public road geometry');
  return data;
 }
 const state=valid(snapshot.state,null);
 async function load(county){
  if(cache.has(county))return valid(cache.get(county),county);
  if(offline||!manifest.counties[county])throw Error('Detailed roads not saved');
  if(!pending.has(county))pending.set(county,(async()=>{
   const ref=manifest.counties[county],response=await fetch(ref.path,{credentials:'omit'});if(!response.ok)throw Error('Road file unavailable');
   const raw=await response.text();if(raw.length>8000000)throw Error('Road file limit exceeded');
   if(crypto?.subtle){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==ref.sha256)throw Error('Road file hash mismatch');}
   const data=valid(JSON.parse(raw),county);cache.set(county,data);return data;
  })().finally(()=>pending.delete(county)));
  return pending.get(county);
 }
 async function map(key){
  const geometry=await window.FerdantResourceMap.bookletGeometry(key);
  let selection=state,detailed=!geometry.place;
  if(geometry.place){try{const county=await load(geometry.place.county);selection=geometry.place.city?county.cities[key]:county;detailed=Boolean(selection?.roads.length);}catch{/* Preserve the real statewide overview, never invent a street or route. */}}
  const boundary=!detailed&&geometry.place?(await window.FerdantResourceMap.bookletGeometry('')).boundary:geometry.boundary;
  return {...geometry,boundary,bounds:selection?.bounds||geometry.bounds,roads:selection?.roads||state.roads,detailed,
   source:manifest.source,publisher:manifest.publisher,checked:manifest.checked,published:manifest.published,
   note:manifest.note};
 }
 async function embed(doc,key){
  const geometry=await window.FerdantResourceMap.bookletGeometry(key),counties={};
  if(geometry.place){try{counties[geometry.place.county]=await load(geometry.place.county);}catch{/* Saved coverage stays explicit. */}}
  const node=doc.querySelector('#booklet-road-snapshot');if(node)node.textContent=JSON.stringify({schema:1,edition:manifest.edition,state,counties}).replace(/</g,'\\u003c');
 }
 function draw(pdf,map,evacuation,box,text){
  const R=6378137,rad=Math.PI/180;
  const mercator=p=>[R*p[0]*rad,R*Math.log(Math.tan(Math.PI/4+p[1]*rad/2))];
  const [west,south,east,north]=map.bounds,sw=mercator([west,south]),ne=mercator([east,north]);
  const scale=Math.min((box.w-28)/(ne[0]-sw[0]),(box.h-24)/(ne[1]-sw[1]));
  const ox=box.x+(box.w-(ne[0]-sw[0])*scale)/2,oy=box.y+(box.h-(ne[1]-sw[1])*scale)/2;
  const project=p=>{const xy=mercator(p);return [ox+(xy[0]-sw[0])*scale,oy+(ne[1]-xy[1])*scale];};
  const stroke=points=>{const xy=points.map(project);if(xy.length>1)pdf.lines(xy.slice(1).map((p,i)=>[p[0]-xy[i][0],p[1]-xy[i][1]]),xy[0][0],xy[0][1],[1,1],'S',false);return xy;};
  const compass={x:box.x+box.w-68,y:box.y+10,w:56,h:78},ruler={x:box.x+10,y:box.y+box.h-56,w:160,h:46};
  pdf.setFillColor('#f1f4f4');pdf.rect(box.x,box.y,box.w,box.h,'F');
  pdf.saveGraphicsState();pdf.rect(box.x,box.y,box.w,box.h,null);pdf.clip();pdf.discardPath();
  pdf.setDrawColor('#90a1ad');pdf.setLineWidth(.7);pdf.setLineDashPattern([3,3],0);
  for(const g of map.boundary)for(const polygon of g.type==='Polygon'?[g.coordinates]:g.coordinates)for(const ring of polygon)stroke(ring);
  pdf.setLineDashPattern([],0);
  const candidates=[];
  const roads=[...map.roads].sort((a,b)=>['street','secondary','primary'].indexOf(a[1])-['street','secondary','primary'].indexOf(b[1]));
  for(const [name,kind,paths]of roads){
   const width={primary:1.35,secondary:.95,street:.6}[kind],color={primary:'#9d7545',secondary:'#607d93',street:'#99aab6'}[kind];
   pdf.setDrawColor('#ffffff');pdf.setLineWidth(width+1.1);for(const path of paths)stroke(path);
   pdf.setDrawColor(color);pdf.setLineWidth(width);
   let best;
   for(const path of paths){const points=stroke(path),length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);if(!best||length>best.length)best={points,length};}
   if(best)candidates.push({name:String(name).trim().replace(/\s+/g,' ').replace(/^State Rte /,'SR ').replace(/^Interstate /,'I-').replace(/^I-\s+/,'I-'),kind,...best});
  }
  if(evacuation?.features.length){
   pdf.setDrawColor('#ffffff');pdf.setLineWidth(3.5);
   for(const f of evacuation.features)for(const path of f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates)stroke(path);
   pdf.setDrawColor('#a52b77');pdf.setLineWidth(1.9);pdf.setLineDashPattern([5,3],0);
   for(const f of evacuation.features)for(const path of f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates)stroke(path);
   pdf.setLineDashPattern([],0);
  }
  pdf.restoreGraphicsState();
  const used=[compass,ruler],named=[],maxLabels=map.place?.city?18:map.place?14:10;
  const buckets=['primary','street','secondary'].map(kind=>candidates.filter(c=>c.kind===kind).sort((a,b)=>b.length-a.length));
  const ordered=[];for(let i=0;buckets.some(b=>b.length>i);i++)for(const bucket of buckets)if(bucket[i])ordered.push(bucket[i]);
  function at(points,fraction){let remaining=points.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0)*fraction;for(let i=1;i<points.length;i++){const length=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);if(length>0&&remaining<=length)return [points[i-1][0]+(points[i][0]-points[i-1][0])*remaining/length,points[i-1][1]+(points[i][1]-points[i-1][1])*remaining/length];remaining-=length;}return points[points.length-1];}
  for(const label of ordered){
   if(named.length>=maxLabels)break;
   const name=label.name.replace(/[^\x20-\x7e\u00a0-\u00ff]/g,''),size=label.kind==='street'?7:7.5;
   pdf.setFont('helvetica',label.kind==='street'?'normal':'bold');pdf.setFontSize(size);
   const width=pdf.getTextWidth(name)+12;if(label.length<width*.65||named.includes(name))continue;
   for(const fraction of [.5,.3,.7,.15,.85]){
    const [cx,cy]=at(label.points,fraction),r={x:cx-width/2,y:cy-5,w:width,h:12};
    if(r.x<box.x+5||r.x+r.w>box.x+box.w-5||r.y<box.y+5||r.y+r.h>box.y+box.h-5||used.some(b=>r.x<b.x+b.w+4&&r.x+r.w+4>b.x&&r.y<b.y+b.h+4&&r.y+r.h+4>b.y))continue;
    used.push(r);named.push(name);pdf.setFillColor('#ffffff');pdf.rect(r.x,r.y,r.w,r.h,'F');text(name,r.x+4,r.y+1,r.w-8,size,'#294354','helvetica',label.kind==='street'?'normal':'bold');break;
   }
  }
  pdf.setFillColor('#ffffff');pdf.setDrawColor('#c9d3d9');pdf.setLineWidth(.5);pdf.rect(compass.x,compass.y,compass.w,compass.h,'FD');
  const cx=compass.x+compass.w/2,cy=compass.y+40;
  text('N',cx-4,compass.y+5,14,10,'#203748','helvetica','bold');text('S',cx-3,cy+19,12,7,'#506472');text('W',cx-21,cy-1,12,7,'#506472');text('E',cx+14,cy-1,12,7,'#506472');
  pdf.setFillColor('#24568d');pdf.setDrawColor('#24568d');pdf.triangle(cx,cy-16,cx-6,cy+10,cx,cy+3,'FD');pdf.setFillColor('#ffffff');pdf.triangle(cx,cy-16,cx,cy+3,cx+6,cy+10,'FD');
  const groundMetersPerPoint=Math.cos((south+north)/2*rad)/scale,targetKm=100*groundMetersPerPoint/1000,power=10**Math.floor(Math.log10(targetKm));
  const km=[5,2,1].map(n=>n*power).find(n=>n<=targetKm)||power/2,points=km*1000/groundMetersPerPoint;
  pdf.setFillColor('#ffffff');pdf.rect(ruler.x,ruler.y,ruler.w,ruler.h,'F');
  const bx=ruler.x+10,by=ruler.y+24;
  text('Scale at map center',bx,ruler.y+2,145,7,'#506472');pdf.setDrawColor('#203748');pdf.setLineWidth(.6);pdf.setFillColor('#203748');pdf.rect(bx,by,points/2,4,'FD');pdf.setFillColor('#ffffff');pdf.rect(bx+points/2,by,points/2,4,'FD');
  text('0',bx-1,by+6,12,7,'#203748');text(km<1?Math.round(km*1000)+' m':km+' km',bx+points-10,by+6,55,7,'#203748');text((km/1.609344).toFixed(km<1?2:1)+' mi',bx+points+28,by+6,55,7,'#506472');
  pdf.setDrawColor('#bbc9d1');pdf.setLineWidth(.7);pdf.rect(box.x,box.y,box.w,box.h,'S');
  return {page:2,roadsDrawn:roads.length,streetLabels:named,northArrow:true,scaleKm:km,scalePoints:points,groundMetersPerPoint,bounds:map.bounds,evacuationSegments:evacuation?.features.length||0};
 }
 window.FerdantBookletMap={map,embed,draw};
})();
