'use strict';
(() => {
 const phoneNode=document.querySelector('#phone-data'),mapNode=document.querySelector('#resource-map-data');
 if(!phoneNode||!mapNode)return;
 const {directory:phones,places}=JSON.parse(phoneNode.textContent),config=JSON.parse(mapNode.textContent);
 const titles={earthquake:'When the ground moves',tsunami:'Leave the water behind',flood:'When water rises',wildfire:'Through fire & smoke',heat:'A cooler next step',cold:'Warmth within reach',storms:'Weather the interruption',coastal:'A changing shoreline',landslide:'When slopes shift',drought:'Make every drop count',dam:'Downstream decisions',levee:'Beyond the embankment',avalanche:'When snow gives way',subsidence:'A slower shift',volcano:'When the mountain stirs'};
 const ink='#203748',blue='#24568d',muted='#506472',rule='#cdd8de',paper='#fbfcfa';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const plain=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,'...').replace(/\u2022/g,'/').replace(/[^\x20-\x7e\u00a0-\u00ff\n]/g,'');
 const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 function location(key){const row=places.cities.find(r=>r[0]===key);if(row)return {key,name:row[1],county:row[2],city:true};const county=key?.startsWith('county:')?key.slice(7):null;return places.counties[county]?{key,name:places.counties[county]+' County',county,city:false}:null;}
 function preview(key){
  const place=location(key),name=place?.name||'California',label=name.length>28?34:name.length>19?42:52;
  const ranked=window.FerdantRisk.ordered(key),profile=window.FerdantRisk.profile(key);
  const cells=ranked.map((p,i)=>{const x=48+(i%3)*172,y=355+Math.floor(i/3)*64;const icon=document.querySelector('[data-disaster="'+p.id+'"] .atlas-choice-symbol svg')?.outerHTML||'';return '<g transform="translate('+x+','+y+')"><rect width="164" height="60" rx="4" fill="'+p.risk.fill+'"/><g color="'+p.risk.color+'">'+icon.replace(/\s(?:width|height)="[^"]*"/g,'').replace('<svg ','<svg x="7" y="5" width="22" height="22" ')+'</g><text x="35" y="19" font-size="10" font-weight="700" fill="'+p.risk.color+'">'+esc(p.risk.label)+'</text><text x="7" y="46" font-size="10" fill="'+ink+'">'+esc(p.id==='coastal'?'Coastal flooding':p.label)+'</text></g>';}).join('');
  const scope=!profile.record?'Choose a location for a risk ranking.':profile.record.scope==='county'?'FEMA county ratings / December 2025':'City tract screening / highest overlapping-tract risk / '+profile.record.coverage+'% area coverage';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792"><rect width="612" height="792" fill="'+paper+'"/><path d="M48 66H564M48 306H564M48 710H564" stroke="'+rule+'"/><g font-family="Arial, sans-serif"><text x="48" y="47" fill="'+blue+'" font-size="16" font-weight="700">ferdant.</text><text x="564" y="47" text-anchor="end" fill="'+muted+'" font-size="10">THE LOCAL RESOURCE BOOK</text><text x="48" y="115" font-size="12" fill="'+blue+'">'+esc(place?places.counties[place.county]+' County / California':'California / statewide edition')+'</text><g font-family="Georgia, serif" fill="'+ink+'"><text x="48" y="175" font-size="'+label+'">'+esc(name)+'</text><text x="48" y="229" font-size="42">field notes.</text></g><text x="48" y="274" font-size="14" fill="'+muted+'">Places to turn. Numbers to call. Steps to take.</text><text x="48" y="331" font-size="13" font-weight="700" fill="'+ink+'">Long-term relative risk / highest first</text>'+cells+'<text x="48" y="690" font-size="9" fill="'+muted+'">'+esc(scope)+'</text><text x="48" y="704" font-size="9" fill="'+muted+'">Not event probability. Low is not safe; gray means unassessed.</text><text x="48" y="744" font-size="12" fill="'+blue+'">Everyday searches / 15 events / phone charts</text><text x="48" y="766" font-size="10" fill="'+muted+'">FEMA NRI / December 2025. Follow current local instructions.</text></g></svg>';
 }
 function contactIds(place,event){
  const local=place?[...(phones.countyContacts[place.county]||[]),...(phones.cityContacts[place.key]||[])]:[];
  const referrals=local.filter(id=>/referral/i.test(phones.contacts[id].kind));
  const ids=[...(referrals.length?referrals:['211-routing'])];
  const fast=!['coastal','drought','subsidence'].includes(event);
  for(const id of local){
   if(fast&&id.endsWith('nonemergency'))ids.push(id);
   if(id==='pge-outage'&&fast)ids.push(id);
   if(['davis-water','sf-water'].includes(id)&&['earthquake','flood','cold','storms','coastal','landslide','drought','dam','levee','subsidence'].includes(event))ids.push(id);
   if(['davis-contact','sf-311'].includes(id)&&!['avalanche','tsunami'].includes(event))ids.push(id);
  }
  if(fast||event==='coastal')ids.push('highway');
  if(['flood','wildfire','heat','cold','storms','volcano'].includes(event))ids.push('poison');
  ids.push('disaster-distress');return [...new Set(ids)];
 }
 function evacuationPlan(place,source){
  const data=config.evacuation;
  if(!data)return null;
  const local=place?[...(data.cities[place.key]||[]),...(data.counties[place.county]||[])]:[];
  const get=id=>({...data.sources[id],id,sourceRef:source(data.sources[id])});
  return {checked:data.checked,localAvailable:local.length>0,links:[...new Set([...local,...data.shared])].map(get),
   general:get('general-guidance'),flood:get('flood-guidance'),tsunami:get('tsunami-guidance'),tsunamiMap:get('tsunami-maps')};
 }
 async function model(key){
  const place=location(key),directory=place&&await window.FerdantResourceMap.directory(key),items=directory?.items||[],sources=[],bySource=new Map();
  function source(s){const id=[s.url,s.title,s.checked,s.published].join('|');if(!bySource.has(id)){bySource.set(id,sources.length+1);sources.push({...s,id:sources.length+1});}return bySource.get(id);}
  const riskProfile=window.FerdantRisk.profile(key),riskSource=source(config.hazardRisk.source),riskTractSource=source(config.hazardRisk.tractSource);
  function physical(f,issue){const s=config.sources[f.source],outside=place?.city&&!f.within?(f.servesCounty?'Serves '+places.counties[place.county]+' County; office outside city.':'Outside city / '+(places.counties[f.county]||'nearby')+' County / '+(f.km<10?f.km.toFixed(1):Math.round(f.km))+' km straight-line.') : '';
   return {issue,title:f.name,detail:f.address+', '+f.city+'. '+outside,access:f.visit?.hours?'Regular hours: '+f.visit.hours:'Hours and intake not confirmed; check with the provider.',kind:f.kind,url:f.url||s.url,source:source(s),physicalId:f.id};}
  function referral(issue,title,detail,url,kind='support'){return {issue,title,detail,access:'Referral link; confirm a visit first.',kind,url,source:source({title,url,checked:null,published:url==='https://www.news.caloes.ca.gov/cooling-centers-and-resources-3/'?'2026-03':null}),referral:true};}
  const evacuation=evacuationPlan(place,source);
  const evacuationMap=await window.FerdantResourceMap.routeMap?.(key)||null;
  if(evacuationMap)evacuationMap.sourceRef=source({title:evacuationMap.publisher+' evacuation planning roads',url:evacuationMap.source,checked:evacuationMap.checked,published:null});
  const events=window.FerdantRisk.ordered(key).map(p=>{
   const policy=config.resourcePlans[p.id],cards=[],used=new Set();
   function pick(kinds,issue){const f=kinds.map(kind=>items.find(f=>!used.has(f.id)&&(f.categories||[f.kind]).includes(kind))).find(Boolean);if(f){used.add(f.id);cards.push(physical(f,issue));}return Boolean(f);}
   pick(['hospital'],'I need urgent medical care');if(!pick(['clinic'],'I need a clinic or follow-up care'))cards.push(referral('I need a clinic or follow-up care','Find a community health center','HRSA health-center locator. Confirm services, appointments, enrollment and fees. Not a hospital emergency department.','https://findahealthcenter.hrsa.gov/','clinic'));
   if(['heat','cold'].includes(p.id))cards.push(referral(p.id==='heat'?'I need a cooling space':'I need a warming space','Confirm an open relief space','No verified current '+(p.id==='heat'?'cooling':'warming')+'-space locations are saved. Ask the referral service in this section. '+(p.id==='heat'?'Cal OES links are dated March 2026; confirm current opening. ':'')+'Ordinary libraries are not substituted.',p.id==='heat'?'https://www.news.caloes.ca.gov/cooling-centers-and-resources-3/':'https://www.211ca.org/',p.id==='heat'?'cooling':'warming'));
   if(!pick(['food','supplies','support'],'I need food or basic supplies'))cards.push(referral('I need food or basic supplies','Find an actual pickup site','CDSS regional food-bank directory. Ask for the distribution address, hours and eligibility; a warehouse is not a pickup site.','https://www.cdss.ca.gov/food-banks','food'));
   if(!pick(['housing','homeless-shelter','support'],'I need housing or day services'))cards.push(referral('I need housing or day services','Find local intake and day help','HUD Find Shelter lists housing and other services. Confirm intake, eligibility and available space.','https://www.hud.gov/FindShelter','housing'));
   if(!pick(['library','legal','utility','senior-disability','transport'],'I need information or application help'))cards.push(referral('I need information or application help','Ask the local referral service','Use the related phone chart for service and application referrals. Local physical records are incomplete.','https://www.211ca.org/','library'));
   if(policy.liveShelters)cards.push(referral('I need a disaster shelter','Check current shelter listings','Red Cross open-shelter locator, all incidents. No current opening, safe access or available bed is saved in this file.','https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html','shelter'));
   if(['heat','cold'].includes(p.id))cards.sort((a,b)=>Number(['cooling','warming'].includes(b.kind))-Number(['cooling','warming'].includes(a.kind)));
   else if(policy.default==='information'){const order=['library','legal','utility','senior-disability','transport','food','supplies','housing','support','clinic','hospital'];cards.sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));}
   return {...p,evacuation:config.evacuation?.events[p.id]||null,artTitle:titles[p.id],phase:policy.phase,cards,phones:contactIds(place,p.id).map(id=>({id,...phones.contacts[id],sourceRef:source({...phones.sources[phones.contacts[id].source],checked:phones.checked})})),guidanceRef:source({title:p.label+' official guidance',...p.guidance})};
  });
  const ids=[...new Set([...phones.statewide,...(place?phones.countyContacts[place.county]||[]:[]),...(place?phones.cityContacts[place.key]||[]:[])])];
  const appendix=ids.map(id=>({id,...phones.contacts[id],sourceRef:source({...phones.sources[phones.contacts[id].source],checked:phones.checked})}));
  const searches=config.resourceSearch.groups.map(group=>({...group,resources:group.sources.map(id=>{const s=config.resourceSearch.sources[id];return {...s,sourceRef:source(s)};})}));
  return {place,events,sources,appendix,evacuation,evacuationMap,searches,riskProfile,riskSource,riskTractSource,regionalAvailable:directory?.regionalAvailable??false,geometryAvailable:directory?.geometryAvailable??false};
 }
 function sourceDocument(m){
  const name=m.place?.name||'California',stem='ferdant-'+slug(name)+'-resource-book-'+config.serviceChecked;
  const text=['FERDANT / '+name+' field notes','SOURCES & EDITION','',
   'Companion PDF: '+stem+'.pdf','Location: '+name+', California',
   'Contacts checked: '+phones.checked,'Resource directory checked: '+config.serviceChecked,'Additional resource searches reviewed: '+config.resourceSearch.checked,'',
   'The numbered references [S1], [S2], etc. match this city and edition of the PDF. Guidance check dates and publisher dates appear with each source below.',
   'Check dates are not publication dates. Library outlets are from IMLS FY2024, published June 2026. Clinics are the checked HRSA permanent-site directory.',
   'Hours, admission and emergency use need confirmation. Specialty service coverage is incomplete. Distances are straight-line from an approximate city center, not route lengths. Official online referrals were not verified as local pickup sites.',
   'No private notes, current map filter, live alerts or shelter status enter these files. Links need internet; calls and texts need phone service.','Evacuation sources checked: '+(m.evacuation?.checked||'not available')+'. Published planning and zone maps are not incident-assigned routes. No current safe route, order, closure or evacuation destination is saved.','',
   'Additional directory searches need internet. Their results are not imported locations, confirmed openings or available beds.',
   '','LONG-TERM RELATIVE HAZARD RISK',m.riskProfile.scope,'Release: '+m.riskProfile.release,m.riskProfile.method,
   'High combines FEMA Very High and Relatively High. Moderate is Relatively Moderate. Low combines Relatively Low and Very Low. Missing, insufficient, not-applicable and unsupported hazards stay Not assessed. These are relative national ratings for each hazard, not probabilities or absolute loss comparisons.',
   ...m.events.map(p=>p.label+': '+p.risk.label+'; highest source rating: '+p.risk.sourceRating+'; rated components '+p.risk.ratedComponents+'/'+p.risk.totalComponents+'. Scope: '+p.risk.scopeNote),
   ...(m.riskProfile.record?.tracts?['Intersecting census tracts: '+m.riskProfile.record.tracts.join(', ')]:[]),'',
   ...(m.evacuation?['EVACUATION SOURCE REVIEW',...[...m.evacuation.links,m.evacuation.general,m.evacuation.flood,m.evacuation.tsunami,m.evacuation.tsunamiMap].flatMap(s=>['[S'+s.sourceRef+'] '+s.title,'Type: '+s.kind,'Review: '+s.review,...(s.corroborationURL?['Corroborating source: '+s.corroborationURL]:[]),''])]:[]),
   ...m.sources.flatMap(s=>['[S'+s.id+'] '+s.title,s.url,'Checked: '+(s.checked||'referral link; current service not verified'),'Publisher/data date: '+(s.published||'not supplied'),...(s.evidenceURL?['Publisher evidence: '+s.evidenceURL,'Evidence date: '+(s.evidencePublished||'not supplied'),'Coverage: '+s.coverage,'Review limits: '+s.verification]:[]),''])].join('\r\n');
  return {filename:stem+'-sources.txt',pdfFilename:stem+'.pdf',text};
 }
 let pdfReady;
 async function library(){
  if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
  if(!pdfReady)pdfReady=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/assets/vendor/jspdf/jspdf.umd.min.js';s.onload=()=>resolve(window.jspdf.jsPDF);s.onerror=()=>{pdfReady=null;s.remove();reject(Error('PDF writer unavailable'));};document.head.append(s);});
  return pdfReady;
 }
 const iconCache=new Map();
 async function iconImage(svg,color){
  const key=svg+color;if(iconCache.has(key))return iconCache.get(key);
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace(/\s(?:width|height|xmlns|style)="[^"]*"/g,'').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" style="color:'+color+'" '));await image.decode();
  const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;canvas.getContext('2d').drawImage(image,0,0,80,80);const png=canvas.toDataURL('image/png');iconCache.set(key,png);return png;
 }
 async function build(key){
  const [m,PDF]=await Promise.all([model(key),library()]),pdf=new PDF({unit:'pt',format:'letter',compress:true,putOnlyUsedFonts:true}),name=m.place?.name||'California',layout=[],links=[];
  pdf.setProperties({title:name+' field notes - resources and disaster phone charts',author:'Ferdant',subject:'Dated California resources; no live dispatch or shelter status'});pdf.setCreationDate(new Date(config.serviceChecked+'T12:00:00Z'));pdf.setFileId(('46455244414e54'+[...String(key||'CA')].map(c=>c.charCodeAt(0).toString(16)).join('')).padEnd(32,'0').slice(0,32));pdf.setLanguage('en-US');
  const icons=Object.fromEntries(await Promise.all(Object.entries(config.serviceTypes).map(async([id,t])=>[id,await iconImage(t.icon,t.color)])));
  const hazardIcons=Object.fromEntries(await Promise.all(m.events.map(async p=>{const svg=document.querySelector('[data-disaster="'+p.id+'"] .atlas-choice-symbol svg')?.outerHTML;return [p.id,svg?await iconImage(svg,blue):null];})));
  const companion=sourceDocument(m);let y=0,currentEvent=null;
  const page=()=>pdf.internal.getCurrentPageInfo().pageNumber;
  function text(value,x,top,width,size=10,color=ink,font='helvetica',style='normal'){
   pdf.setFont(font,style);pdf.setFontSize(size);pdf.setTextColor(color);const lines=pdf.splitTextToSize(plain(value),width),height=lines.length*size*1.26;pdf.text(lines,x,top+size,{lineHeightFactor:1.26});layout.push({page:page(),x,top,width,height,text:plain(value)});return height;
  }
  function line(top){pdf.setDrawColor(rule);pdf.setLineWidth(.6);pdf.line(40,top,572,top);}
  function header(label){pdf.setFillColor(paper);pdf.rect(0,0,612,792,'F');text('ferdant.',40,24,180,13,blue,'helvetica','bold');text(name+' / California',260,27,312,9,muted);line(51);y=68;if(label)y+=text(label,40,y,532,12,blue)+10;}
  function next(label){pdf.addPage();header(label);}
  function space(height,label){if(y+height>728)next(label||(currentEvent?.label||'Everyday phone desk')+' / continued');}
  function urlLabel(label,url,x,top,width,size=9){const height=text(label,x,top,width,size,blue);pdf.link(x,top,width,height,{url});links.push(url);return height;}
  function phoneRows(rows,label){
   const heading=()=>{text(label,40,y,532,17,ink,'times');y+=29;text('HELP WITH / SCOPE',48,y,310,8,muted,'helvetica','bold');text('CALL / TEXT',376,y,188,8,muted,'helvetica','bold');y+=17;line(y-3);};
   pdf.setFont('helvetica','normal');pdf.setFontSize(10);
   const chartHeight=rows.reduce((sum,c)=>{const scope=c.scope==='Selected county'?places.counties[m.place.county]+' County':c.scope;const left=pdf.splitTextToSize(plain(c.title+' [S'+c.sourceRef+']'),308).length*12.6+pdf.splitTextToSize(plain([c.kind,scope,c.hours].filter(Boolean).join(' / ')),308).length*11.34;const right=c.phones.reduce((h,r)=>h+16+(r.note?12:0)+(r.text?12:0),0);return sum+Math.max(left,right)+20;},80);
   space(currentEvent?Math.min(chartHeight,620):105,(currentEvent?.label||'Everyday phone desk')+' / phone chart');heading();
   for(const c of rows){
    const scope=c.scope==='Selected county'?places.counties[m.place.county]+' County':c.scope;
    const methods=c.phones.map(r=>({ref:r,number:phones.numbers[r.number]}));
    pdf.setFont('helvetica','normal');pdf.setFontSize(10);
    const leftHeight=pdf.splitTextToSize(plain(c.title+' [S'+c.sourceRef+']'),308).length*12.6+pdf.splitTextToSize(plain([c.kind,scope,c.hours].filter(Boolean).join(' / ')),308).length*11.34+2;
    const rightHeight=methods.reduce((h,{ref})=>h+16+(ref.note?12:0)+(ref.text?12:0),0);
    const height=Math.max(leftHeight,rightHeight)+17;
    if(y+height>718){next(currentEvent?currentEvent.label+' / phone chart continued':'Everyday phone desk / continued');heading();}
    text(c.title+' [S'+c.sourceRef+']',48,y+7,308,10,ink,'helvetica','bold');
    const titleLines=pdf.splitTextToSize(plain(c.title+' [S'+c.sourceRef+']'),308).length;
    text([c.kind,scope,c.hours].filter(Boolean).join(' / '),48,y+9+titleLines*12.6,308,9,muted);
    let ry=y+6;
    for(const {ref,number}of methods){if(ref.note){text(ref.note,376,ry,188,8,muted);ry+=12;}urlLabel(number.label,'tel:'+number.tel,376,ry,188,12);ry+=16;if(ref.text){urlLabel('Call or text','sms:'+number.tel,376,ry,188,8);ry+=12;}}
    y+=height;line(y-1);
   }
   space(43,(currentEvent?.label||'Everyday phone desk')+' / phone chart continued');y+=9;y+=text('Immediate danger: call 911. Calls/texts need phone service. Referrals are not dispatch or confirmation of an available place.',40,y,532,9,muted)+12;
  }
  header();
  text(m.place?places.counties[m.place.county]+' COUNTY / CALIFORNIA':'CALIFORNIA / STATEWIDE EDITION',40,80,532,10,blue,'helvetica','bold');
  const nh=text(name,40,116,520,name.length>28?32:44,ink,'times');text('field notes.',40,124+nh,532,42,ink,'times');
  const introY=136+nh+53;const introHeight=text('Places to turn. Numbers to call. Steps to take.',40,introY,532,14,muted);
  text('Evacuation map / page 2',40,introY+introHeight+5,532,9,blue);pdf.link(40,introY+introHeight+3,532,18,{pageNumber:2});
  y=introY+introHeight+25;y+=text('Long-term risk / highest first',40,y,532,19,ink,'times')+19;
  const tocTop=y,toc=[];
  for(let i=0;i<m.events.length;i++){const p=m.events[i],x=40+(i%3)*181,top=tocTop+Math.floor(i/3)*54;pdf.setFillColor(p.risk.fill);pdf.rect(x-2,top-3,174,49,'F');if(hazardIcons[p.id])pdf.addImage(hazardIcons[p.id],'PNG',x,top,23,23);text(p.label,x+30,top,140,10);text(p.risk.label,x+30,top+28,108,8,p.risk.color,'helvetica','bold');toc.push({event:p,x,top});}
  y=tocTop+5*54+14;line(y);y+=14;
  const searchIndexY=y;
  y+=text('Risk summary: page 3. Everyday resource searches follow it. Tap here to browse resources, or choose an event above. Related phone charts follow each event.',40,y,532,10,blue)+12;
  y+=text('Selected directory locations, not every local program. Ordinary sites may close or restrict intake. No current shelter, cooling/warming activation, capacity, safe route or evacuation destination is saved.',40,y,532,9,muted)+10;
  const coverage=!m.place?'No city selected: statewide referrals only.':!m.regionalAvailable?'Additional county service records are not available in this copy; baseline records and referrals remain.':'Local or clearly labelled nearby directory records. Confirm the current entrance, service and eligibility before travel.';
  const riskScope=m.place?.city?'City tract screening, not an official city rating. Mapped-area coverage: '+m.riskProfile.record.coverage+'% (includes water where present).':m.place?'FEMA county-level risk ratings.':'No location selected: risk remains unassessed.';
  y+=text(riskScope+' FEMA NRI December 2025. Low does not mean safe; see page 3 for scope.',40,y,532,9,muted)+8;
  text('Companion sources: '+companion.filename,40,y,532,8,muted);
  next('Evacuation map');
  y+=text(name+' evacuation roads',40,y,532,25,ink,'times')+8;
  if(m.evacuationMap?.features.length){
   const em=m.evacuationMap;
   y+=text('County-designated planning roads. Follow current official route instructions; these lines do not confirm a road is open.',40,y,532,10,muted)+14;
   const box={x:40,y,w:532,h:360},[west,south,east,north]=em.bounds,cos=Math.cos((south+north)/2*Math.PI/180);
   const scale=Math.min((box.w-24)/((east-west)*cos),(box.h-24)/(north-south));
   const ox=box.x+(box.w-(east-west)*cos*scale)/2,oy=box.y+(box.h-(north-south)*scale)/2;
   const project=p=>[ox+(p[0]-west)*cos*scale,oy+(north-p[1])*scale];
   const stroke=points=>{const xy=points.map(project);if(xy.length>1)pdf.lines(xy.slice(1).map((p,i)=>[p[0]-xy[i][0],p[1]-xy[i][1]]),xy[0][0],xy[0][1],[1,1],'S',false);};
   pdf.setFillColor('#f2f6f7');pdf.rect(box.x,box.y,box.w,box.h,'F');pdf.saveGraphicsState();pdf.rect(box.x,box.y,box.w,box.h,null);pdf.clip();pdf.discardPath();
   pdf.setDrawColor('#718392');pdf.setLineWidth(.8);pdf.setLineDashPattern([3,3],0);
   for(const g of em.boundary)for(const polygon of g.type==='Polygon'?[g.coordinates]:g.coordinates)for(const ring of polygon)stroke(ring);
   pdf.setDrawColor('#a52b77');pdf.setLineWidth(1.7);pdf.setLineDashPattern([5,3],0);
   const labels=new Map();
   for(const f of em.features){for(const segment of f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates){stroke(segment);const name=String(f.properties.FULLSTREET||'').replace(/ (NB|SB|EB|WB)$/,'');if(!name||/\b(ON|OFF)\b/.test(name))continue;const xy=segment.map(project),length=xy.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-xy[i][0],p[1]-xy[i][1]),0);if(!labels.has(name)||labels.get(name).length<length)labels.set(name,{name,point:xy[Math.floor(xy.length/2)],length});}}
   pdf.setLineDashPattern([],0);pdf.restoreGraphicsState();
   const used=[];pdf.setFont('helvetica','bold');pdf.setFontSize(7);
   for(const label of [...labels.values()].sort((a,b)=>b.length-a.length)){
    if(used.length>=12)break;const w=pdf.getTextWidth(label.name)+10,x=label.point[0]-w/2,top=label.point[1]-5;
    if(x<box.x+5||x+w>box.x+box.w-5||top<box.y+20||top+12>box.y+box.h-24||used.some(r=>x<r.x+r.w+5&&x+w+5>r.x&&top<r.y+17&&top+17>r.y))continue;
    used.push({x,y:top,w});pdf.setFillColor('#ffffff');pdf.rect(x,top,w,12,'F');text(label.name,x+3,top+1,w-6,7,ink,'helvetica','bold');
   }
   text('N',box.x+box.w-22,box.y+9,15,9,ink,'helvetica','bold');
   const km=(east-west)*cos*111.32>40?10:2,bar=km/111.32*scale;
   pdf.setDrawColor(ink);pdf.setLineWidth(1);pdf.line(box.x+14,box.y+box.h-15,box.x+14+bar,box.y+box.h-15);text(km+' km',box.x+14,box.y+box.h-30,60,8,ink);
   y=box.y+box.h+14;pdf.setDrawColor('#a52b77');pdf.setLineWidth(2);pdf.setLineDashPattern([5,3],0);pdf.line(40,y+5,77,y+5);pdf.setLineDashPattern([],0);
   y+=text('Evacuation planning roads',86,y,486,10,ink,'helvetica','bold')+8;
   y+=text('Gray dashed line: approximate city/county boundary. Only designated roads are drawn; this is not a full street map. No travel direction or destination is assigned.',40,y,532,9,muted)+10;
   y+=urlLabel(em.publisher+' / route source [S'+em.sourceRef+']',em.source,40,y,532,9)+7;
   y+=text('Source checked '+em.checked+'. Publisher edit date not supplied. The same planning map remains available in your saved offline copy.',40,y,532,9,muted)+8;
  }else{
   y+=text('No reviewed evacuation-road geometry is available for '+name+' in this edition. A route has not been drawn or guessed. Use the official maps in Evacuation routes & updates and follow current local instructions.',40,y,532,12,muted)+18;
  }
  next('Long-term relative hazard risk');const riskStartPage=page();
  y+=text('Your planning priorities',40,y,532,25,ink,'times')+8;
  y+=text(m.riskProfile.scope,40,y,532,10,muted)+7;
  y+=text('FEMA NRI / '+m.riskProfile.release+'. Relative risk, not event probability or a current forecast. Low does not mean safe. [S'+m.riskSource+'; S'+m.riskTractSource+']',40,y,532,9,muted)+12;
  for(const band of config.hazardRisk.bands){
   const entries=m.events.filter(p=>p.risk.id===band.id);if(!entries.length)continue;
   space(55,'Long-term risk / continued');pdf.setFillColor(band.fill);pdf.rect(40,y,532,23,'F');text(band.label,49,y+5,510,11,band.color,'helvetica','bold');y+=30;
   for(const p of entries){
    const detail=p.risk.order===3?p.risk.sourceRating+(p.risk.sourceRating==='Not included'?' in FEMA NRI':''):p.risk.sourceRating+' / '+p.risk.scopeNote;
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);const height=Math.max(20,pdf.splitTextToSize(plain(detail),310).length*10.08+7);space(height,'Long-term risk / continued');
    text(p.label,48,y,195,9,ink);text(detail,250,y,310,8,muted);y+=height;
   }y+=7;
  }
  y+=text('High combines Relatively High and Very High; Low combines Relatively Low and Very Low. City bands screen the highest overlapping-tract rating and can include exposure outside city limits. Weather plans use the highest available component. Dam failure, levee failure and subsidence are unassessed; coastal flooding does not rate future sea-level rise. Gray never means low risk.',40,y,532,8,muted)+9;
  next('Everyday resources & directory searches');
  const searchStartPage=page();
  y+=text('More ways to find local help',40,y,532,25,ink,'times')+12;
  y+=text('For '+name+', California: open a directory below, then enter your city, county or your own ZIP code. These searches go beyond the saved map. Links need internet; confirm hours, eligibility and intake before visiting.',40,y,532,10)+14;
  function searchHeight(value,width,size,style='normal'){
   pdf.setFont('helvetica',style);pdf.setFontSize(size);return pdf.splitTextToSize(plain(value),width).length*size*1.26;
  }
  for(const group of m.searches){
   const rows=group.resources.map(s=>({...s,height:searchHeight(s.title+' [S'+s.sourceRef+']',508,11,'bold')+searchHeight(s.description,508,10)+searchHeight(s.url,508,8)+23}));
   space(35+rows[0].height,'Everyday resources / continued');
   y+=text(group.title,40,y,532,18,ink,'times')+12;
   for(const s of rows){
    space(s.height,'Everyday resources / '+group.title);
    y+=text(s.title+' [S'+s.sourceRef+']',52,y,508,11,ink,'helvetica','bold')+4;
    y+=text(s.description,52,y,508,10,muted)+5;
    y+=urlLabel(s.url,s.url,52,y,508,8)+14;
   }
   line(y-4);y+=12;
  }
  let evacuationStartPage=null;
  if(m.evacuation){
   next('Evacuation routes & updates');evacuationStartPage=page();
   y+=text('Know where to check before you leave',40,y,532,24,ink,'times')+12;
   y+=text('Follow the route and destination given by local officials. A saved planning map or zone boundary does not tell you which streets are open now. This book saves links, not live orders, closures or a safe route.',40,y,532,10)+12;
   y+=text('Prepare transport, medicines, assistive equipment and pet supplies in advance. If you need extra time, plan early. Never delay an official evacuation instruction to check this book. [S'+m.evacuation.general.sourceRef+']',40,y,532,9,muted)+10;
   y+=text('Flood, coastal flood, dam or levee failure: never drive or walk through floodwater or pass road barriers. [S'+m.evacuation.flood.sourceRef+']',40,y,532,9,muted)+12;
   if(!m.evacuation.localAvailable)y+=text('No local route-planning resource has been verified for '+name+' in this edition. Use your county emergency instructions; the statewide links below do not fill that gap.',40,y,532,10,blue)+12;
   for(const s of m.evacuation.links){
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);
    const height=pdf.splitTextToSize(plain(s.description+' '+s.url),508).length*11.34+65;
    space(height,'Evacuation routes & updates / continued');
    y+=text(s.title+' [S'+s.sourceRef+']',40,y,532,12,ink,'helvetica','bold')+4;
    y+=text(s.kind,40,y,532,8,blue)+5;
    y+=text(s.description,40,y,532,9,muted)+5;
    y+=urlLabel(s.url,s.url,40,y,532,8)+12;line(y-4);
   }
   space(28,'Evacuation routes & updates / continued');y+=text('Links checked '+m.evacuation.checked+'. Current instructions need internet, radio or local officials; saved files do not update.',40,y,532,8,muted)+12;
  }
  for(const p of m.events){
   currentEvent=p;next();p.startPage=page();if(hazardIcons[p.id])pdf.addImage(hazardIcons[p.id],'PNG',537,67,30,30);
   y+=text(p.artTitle,40,y,480,25,ink,'times')+7;y+=text(p.label+' / '+name,40,y,532,11,blue,'helvetica','bold')+12;
   y+=text(p.risk.label+' / '+(m.place?.city?'city tract screening':'county context')+' / not a forecast',40,y,532,9,p.risk.color,'helvetica','bold')+9;
   pdf.setFillColor('#edf3f7');const headHeight=(()=>{pdf.setFont('helvetica','bold');pdf.setFontSize(11);return pdf.splitTextToSize(plain(p.headline),508).length*13.86+20;})();pdf.rect(40,y,532,headHeight,'F');text(p.headline,52,y+9,508,11,ink,'helvetica','bold');y+=headHeight+12;
   for(const s of p.steps)y+=text(s.label+': '+s.text,40,y,532,9.5,ink)+4;
   y+=urlLabel('Official guidance [S'+p.guidanceRef+']',p.guidance.url,40,y,532,9)+10;
   if(p.evacuation&&evacuationStartPage){
    const top=y;
    y+=text('Evacuation routes & updates / page '+evacuationStartPage,40,y,532,10,blue,'helvetica','bold')+8;
    pdf.link(40,top,532,y-top,{pageNumber:evacuationStartPage});
    if(p.evacuation==='tsunami'){
     y+=text('Plan and practice a route to your local tsunami assembly area or a safe place inland or uphill, outside the hazard zone. Plan to go on foot if you can; roads may be damaged or congested. [S'+m.evacuation.tsunami.sourceRef+']',40,y,532,9,muted)+6;
     y+=urlLabel('Coastal hazard planning maps, not current routes [S'+m.evacuation.tsunamiMap.sourceRef+']',m.evacuation.tsunamiMap.url,40,y,532,9)+10;
    }
   }
   y+=text('Choose the help you need',40,y,532,18,ink,'times')+8;
   y+=text(p.phase,40,y,532,9,muted)+9;
   for(let i=0;i<p.cards.length;i+=2){
    const row=p.cards.slice(i,i+2),width=258;
    const heights=row.map(c=>{pdf.setFont('helvetica','bold');pdf.setFontSize(10);const a=pdf.splitTextToSize(plain(c.issue),211).length*12.6;pdf.setFontSize(11);const b=pdf.splitTextToSize(plain(c.title),234).length*13.86;pdf.setFont('helvetica','normal');pdf.setFontSize(9);const d=pdf.splitTextToSize(plain(c.detail),234).length*11.34;return 18+a+8+b+7+d+8+pdf.splitTextToSize(plain(c.access),234).length*11.34+29;});
    const height=Math.max(...heights);space(height+13,p.label+' / resource choices');
    for(let k=0;k<row.length;k++){const c=row[k],x=40+k*274,top=y;pdf.setFillColor('#ffffff');pdf.setDrawColor(rule);pdf.rect(x,top,width,height,'FD');pdf.setFillColor(config.serviceTypes[c.kind].color);pdf.rect(x,top,3,height,'F');let cy=top+12;
     pdf.addImage(icons[c.kind],'PNG',x+12,cy,17,17);cy+=text(c.issue,x+35,cy,211,10,blue,'helvetica','bold')+9;
     cy+=text(c.title,x+12,cy,234,11,ink,'helvetica','bold')+6;
     cy+=text(c.detail,x+12,cy,234,9,muted)+7;
     cy+=text(c.access,x+12,cy,234,9,muted)+7;
     urlLabel((c.referral?'Referral / check online':'Provider details')+' [S'+c.source+']',c.url,x+12,cy,234,9);
    }y+=height+13;
   }
   phoneRows(p.phones,'Phone chart / '+p.label);
   p.endPage=page();
  }
  currentEvent=null;next('Everyday phone desk');
  y+=text('The complete saved phone chart',40,y,532,24,ink,'times')+12;
  y+=text('All saved contacts for this location, including everyday billing and personal support. Event sections above contain the related subset. Scope, after-hours notes and call/text options are retained.',40,y,532,10)+18;
  phoneRows(m.appendix,'Local and California-wide help');
  const total=pdf.getNumberOfPages();
  pdf.setPage(1);
  pdf.outline.add(null,'Evacuation map',{pageNumber:2});
  if(evacuationStartPage)pdf.outline.add(null,'Evacuation routes & updates',{pageNumber:evacuationStartPage});
  pdf.link(40,searchIndexY,532,30,{pageNumber:searchStartPage});
  pdf.outline.add(null,'Everyday resources & searches',{pageNumber:searchStartPage});
  pdf.outline.add(null,'Long-term relative hazard risk',{pageNumber:riskStartPage});
  for(const {event:p,x,top}of toc){pdf.link(x,top,171,45,{pageNumber:p.startPage});pdf.outline.add(null,p.risk.label+' / '+p.label,{pageNumber:p.startPage});text('p. '+p.startPage,x+139,top+28,30,8,blue);}
  pdf.outline.add(null,'Everyday phone desk',{pageNumber:m.events.at(-1).endPage+1});
  for(let n=1;n<=total;n++){pdf.setPage(n);line(749);text('FERDANT / '+name,40,758,260,8,blue);text('Sources: companion TXT / '+n+' of '+total,351,758,221,8,muted);}
  for(const item of layout)if(item.top+item.height>(item.top>=750?776:744)||item.x+item.width>573)throw Error('Booklet layout overflow: '+JSON.stringify(item));
  return {blob:pdf.output('blob'),filename:companion.pdfFilename,sourcesFilename:companion.filename,sourcesText:companion.text,pages:total,events:m.events.map(p=>({id:p.id,start:p.startPage,end:p.endPage,cards:p.cards,phoneIds:p.phones.map(c=>c.id)})),layout,links,model:m};
 }
 window.FerdantBooklet={preview,model,build,contactIds,async sources(key){return sourceDocument(await model(key));}};
 function save(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const button=document.querySelector('#download-booklet');
 button?.addEventListener('click',async()=>{
  const key=document.querySelector('#phone-city').value,status=document.querySelector('#booklet-status');button.disabled=true;status.textContent='Combining your local resources and event phone charts...';
  try{const result=await build(key);save(result.blob,result.filename);status.textContent=result.pages+'-page resource book ready. Save the matching Sources (TXT) file alongside it. Links need internet; calls need phone service.';}
  catch{status.textContent='The resource book could not be prepared. Try again, or use the contact sheet or complete offline website below.';}finally{button.disabled=false;}
 });
 const sourcesButton=document.querySelector('#download-booklet-sources');
 sourcesButton?.addEventListener('click',async()=>{
  const key=document.querySelector('#phone-city').value,status=document.querySelector('#booklet-sources-status');sourcesButton.disabled=true;status.textContent='Preparing the matching source list...';
  try{const result=await window.FerdantBooklet.sources(key);save(new Blob([result.text],{type:'text/plain;charset=utf-8'}),result.filename);status.textContent='Source file ready. Its [S] references match this city and edition of the PDF.';}
  catch{status.textContent='The source file could not be prepared. Try again.';}finally{sourcesButton.disabled=false;}
 });
})();
