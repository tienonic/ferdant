'use strict';
(() => {
 const phoneNode=document.querySelector('#phone-data'),mapNode=document.querySelector('#resource-map-data');
 if(!phoneNode||!mapNode)return;
 const {directory:phones,places}=JSON.parse(phoneNode.textContent),config=JSON.parse(mapNode.textContent);
 const titles={earthquake:'When the ground moves',tsunami:'Leave the water behind',flood:'When water rises',wildfire:'Through fire & smoke',heat:'A cooler next step',cold:'Warmth within reach',storms:'Weather the interruption',coastal:'A changing shoreline',landslide:'When slopes shift',dam:'Downstream decisions',levee:'Beyond the embankment',avalanche:'When snow gives way',subsidence:'A slower shift',volcano:'When the mountain stirs'};
 const ink='#203748',blue='#24568d',muted='#506472',rule='#cdd8de',paper='#fbfcfa';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const plain=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,'...').replace(/\u2022/g,'/').replace(/[^\x20-\x7e\u00a0-\u00ff\n]/g,'');
 const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const printSource=s=>s.title.replace('FindTreatment.gov','SAMHSA treatment directory').replace('DisasterAssistance.gov','FEMA disaster assistance');
 function printCard(c){
  if(!c.referral)return c;
  const details={clinic:'Ask about a community clinic. Confirm services, appointments, enrollment and fees. This is not an emergency department.',cooling:'Ask whether a cooling space is currently open and where to go. No current opening is saved; an ordinary library is not a confirmed cooling center.',warming:'Ask whether a warming space is currently open and where to go. No current opening is saved; an ordinary library is not a confirmed warming center.',food:'Ask for a food distribution address, hours and eligibility. A warehouse is not necessarily a pickup site.',housing:'Ask about housing intake and day services. Confirm eligibility and available space.',library:'Ask about local service and application referrals. Saved physical records are incomplete.',shelter:'Ask about current disaster shelter instructions. No opening, safe access or available bed is saved in this book.'};
  return {...c,title:'Ask the local referral service',detail:details[c.kind]||'Ask about the service you need and confirm arrangements before visiting.',access:'Use the printed phone chart at the end of this event section.'};
 }
 function location(key){const row=places.cities.find(r=>r[0]===key);if(row)return {key,name:row[1],county:row[2],city:true};const county=key?.startsWith('county:')?key.slice(7):null;return places.counties[county]?{key,name:places.counties[county]+' County',county,city:false}:null;}
 function coverScope(place){return place?.city?(places.counties[place.county]+' County / California').toUpperCase():place?'CALIFORNIA / COUNTY EDITION':'CALIFORNIA / STATEWIDE EDITION';}
 function selectedPlans(key){
  const omitted=[];
  const plans=window.FerdantRisk.ordered(key).filter(p=>{
   const reason=config.disasters.bookletOmissions?.[key]?.[p.id]||(p.risk.sourceRating==='Not Applicable'?'FEMA marks this hazard Not Applicable in the saved local screening. This is booklet selection, not a current safety assessment.':'');
   if(reason)omitted.push({id:p.id,label:p.label,reason});
   return !reason;
  });
  return {plans,omitted};
 }
 function preview(key){
  const place=location(key),name=place?.name||'California';
  const measure=document.createElement('canvas').getContext('2d');measure.font='34px Georgia';const label=Math.min(34,310*34/measure.measureText(name).width);
  const ranked=selectedPlans(key).plans,profile=window.FerdantRisk.profile(key);
  const cells=ranked.map((p,i)=>{const x=40+(i%3)*181,y=282+Math.floor(i/3)*54;const icon=document.querySelector('[data-disaster="'+p.id+'"] .atlas-choice-symbol svg')?.outerHTML||'';return '<g transform="translate('+x+','+y+')"><rect x="-2" y="-3" width="174" height="49" fill="'+p.risk.fill+'"/><g color="'+p.risk.color+'">'+icon.replace(/\s(?:width|height)="[^"]*"/g,'').replace('<svg ','<svg x="0" y="0" width="23" height="23" ')+'</g><text x="30" y="10" font-size="9" fill="'+ink+'">'+esc(p.id==='coastal'?'Coastal flooding':p.label)+'</text><text x="30" y="36" font-size="8" font-weight="700" fill="'+p.risk.color+'">'+esc(p.risk.label)+'</text></g>';}).join('');
  const scope=!profile.record?'Choose a location for a risk ranking.':profile.record.scope==='county'?'FEMA county ratings / December 2025':'City tract screening / highest overlapping-tract risk / '+profile.record.coverage+'% area coverage';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792"><rect width="612" height="792" fill="'+paper+'"/><path d="M40 51H572M40 232H572M40 566H572M40 749H572" stroke="'+rule+'"/><g font-family="Arial, sans-serif"><text x="40" y="37" fill="'+blue+'" font-size="13" font-weight="700">ferdant.</text><text x="572" y="36" text-anchor="end" fill="'+muted+'" font-size="8">RESOURCE BOOK / '+config.serviceChecked.slice(0,4)+'</text><text x="40" y="89" font-size="8.5" fill="'+blue+'" font-weight="700">'+esc(coverScope(place))+'</text><image x="390" y="78" width="182" height="121.333" preserveAspectRatio="xMidYMid meet" href="'+config.bookletCover.dataURL+'"/><text x="40" y="137" font-family="Georgia, serif" font-size="'+label+'" fill="'+ink+'">'+esc(name)+'</text><text x="40" y="165" font-size="12" fill="'+ink+'" font-weight="700">Local resource guide</text><text x="40" y="187" font-size="10" fill="'+muted+'">Local services and emergency resources.</text><text x="40" y="208" font-size="9" fill="'+blue+'">Street map on page 2</text><text x="40" y="264" font-family="Georgia, serif" font-size="18" fill="'+ink+'">Long-term hazard risk</text><text x="390" y="260" font-size="8" fill="'+muted+'">Highest first / FEMA NRI</text>'+cells+'<text x="40" y="591" font-size="10" fill="'+blue+'">Everyday help and related event phone charts follow.</text><text x="40" y="618" font-size="9" fill="'+muted+'">'+esc(scope)+'</text><text x="40" y="636" font-size="9" fill="'+muted+'">Not event probability. Low is not safe; gray means unassessed.</text><text x="40" y="691" font-size="7" fill="'+muted+'">'+esc('Photo: '+config.bookletCover.photographer+' / '+config.bookletCover.publisher)+'</text><text x="40" y="766" font-size="8" fill="'+blue+'">FEMA NRI / December 2025. Follow current local instructions.</text></g></svg>';
 }
 function contactIds(place,event){
  const local=place?[...(phones.countyContacts[place.county]||[]),...(phones.cityContacts[place.key]||[])]:[];
  const referrals=local.filter(id=>/referral/i.test(phones.contacts[id].kind));
  const ids=[...(referrals.length?referrals:['211-routing'])];
  const fast=!['coastal','subsidence'].includes(event);
  for(const id of local){
   if(fast&&id.endsWith('nonemergency'))ids.push(id);
   if(id==='pge-outage'&&fast)ids.push(id);
   if(['davis-water','sf-water'].includes(id)&&['earthquake','flood','cold','storms','coastal','landslide','dam','levee','subsidence'].includes(event))ids.push(id);
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
  const coverPhoto=config.bookletCover,coverSource=source({...coverPhoto,dataURL:undefined,title:coverPhoto.title+' / '+coverPhoto.photographer+' / '+coverPhoto.publisher});
  const riskProfile=window.FerdantRisk.profile(key),riskSource=source(config.hazardRisk.source),riskTractSource=source(config.hazardRisk.tractSource);
  function physical(f,issue){const s=config.sources[f.source],outside=place?.city&&!f.within?(f.servesCounty?'Serves '+places.counties[place.county]+' County; office outside city.':'Outside city / '+(places.counties[f.county]||'nearby')+' County / '+(f.km<10?f.km.toFixed(1):Math.round(f.km))+' km straight-line.') : '';
   return {issue,title:f.name,detail:f.address+', '+f.city+'. '+outside,access:f.visit?.hours?'Regular hours: '+f.visit.hours:'Hours and intake not confirmed; check with the provider.',kind:f.kind,url:f.url||s.url,source:source(s),physicalId:f.id};}
  function referral(issue,title,detail,url,kind='support'){return {issue,title,detail,access:'Referral link; confirm a visit first.',kind,url,source:source({title,url,checked:null,published:url==='https://www.news.caloes.ca.gov/cooling-centers-and-resources-3/'?'2026-03':null}),referral:true};}
  const evacuation=evacuationPlan(place,source);
  const streetMap=await window.FerdantBookletMap.map(key);
  streetMap.sourceRef=source({title:'U.S. Census Bureau / primary, secondary and selected local roads',url:streetMap.source,checked:streetMap.checked,published:streetMap.published});
  const evacuationMap=await window.FerdantResourceMap.routeMap?.(key)||null;
  if(evacuationMap)evacuationMap.sourceRef=source({title:evacuationMap.publisher+' evacuation planning roads',url:evacuationMap.source,checked:evacuationMap.checked,published:null});
  const selection=selectedPlans(key);
  const events=selection.plans.map(p=>{
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
  return {place,events,omittedEvents:selection.omitted,sources,appendix,evacuation,evacuationMap,streetMap,coverSource,searches,riskProfile,riskSource,riskTractSource,regionalAvailable:directory?.regionalAvailable??false,geometryAvailable:directory?.geometryAvailable??false};
 }
 function sourceDocument(m){
  const name=m.place?.name||'California',stem='ferdant-'+slug(name)+'-resource-book-'+config.serviceChecked;
  const text=['FERDANT / '+name+' local resource guide','SOURCES & EDITION','',
   'Companion PDF: '+stem+'.pdf','Location: '+name+', California',
   'Contacts checked: '+phones.checked,'Resource directory checked: '+config.serviceChecked,'Additional resource searches reviewed: '+config.resourceSearch.checked,'',
   'The numbered references [S1], [S2], etc. match this city and edition of the PDF. Guidance check dates and publisher dates appear with each source below.',
   'Check dates are not publication dates. Library outlets are from IMLS FY2024, published June 2026. Clinics are the checked HRSA permanent-site directory.',
   'Hours, admission and emergency use need confirmation. Specialty service coverage is incomplete. Distances are straight-line from an approximate city center, not route lengths. Official online referrals were not verified as local pickup sites.',
   'No private notes, current map filter, live alerts or shelter status enter these files. Links need internet; calls and texts need phone service.','Evacuation sources checked: '+(m.evacuation?.checked||'not available')+'. Published planning and zone maps are not incident-assigned routes. No current safe route, order, closure or evacuation destination is saved.','',
   'PAGE 2 STREET MAP: '+m.streetMap.note+' Data date: '+m.streetMap.published+'; checked: '+m.streetMap.checked+'. '+(m.streetMap.detailed?'Selected location roads.':'Detailed location roads unavailable; statewide overview shown.'),'',
   'Additional directory searches need internet. Their results are not imported locations, confirmed openings or available beds.',
   '','LONG-TERM RELATIVE HAZARD RISK',m.riskProfile.scope,'Release: '+m.riskProfile.release,m.riskProfile.method,
   'High combines FEMA Very High and Relatively High. Moderate is Relatively Moderate. Low combines Relatively Low and Very Low. Missing, insufficient and unsupported hazards stay Not assessed. Sections marked Not Applicable are omitted from local editions. These are relative national ratings for each hazard, not probabilities or absolute loss comparisons.',
   ...m.events.map(p=>p.label+': '+p.risk.label+'; highest source rating: '+p.risk.sourceRating+'; rated components '+p.risk.ratedComponents+'/'+p.risk.totalComponents+'. Scope: '+p.risk.scopeNote),
   '','LOCAL BOOKLET SELECTION','Drought is excluded from the emergency choices. Low-risk, unrated and insufficient-data hazards are retained; they are not treated as inapplicable.',
   ...m.omittedEvents.map(p=>'Omitted section: '+p.label+'. '+p.reason),
   ...(m.riskProfile.record?.tracts?['Intersecting census tracts: '+m.riskProfile.record.tracts.join(', ')]:[]),'',
   ...(m.evacuation?['EVACUATION SOURCE REVIEW',...[...m.evacuation.links,m.evacuation.general,m.evacuation.flood,m.evacuation.tsunami,m.evacuation.tsunamiMap].flatMap(s=>['[S'+s.sourceRef+'] '+s.title,'Type: '+s.kind,'Review: '+s.review,...(s.corroborationURL?['Corroborating source: '+s.corroborationURL]:[]),''])]:[]),
   ...m.sources.flatMap(s=>['[S'+s.id+'] '+s.title,s.url,'Checked: '+(s.checked||'referral link; current service not verified'),'Publisher/data date: '+(s.published||'not supplied'),...(s.photographer?['Photographer: '+s.photographer]:[]),...(s.licenseURL?['License: '+s.license,'License URL: '+s.licenseURL]:[]),...(s.evidenceURL?['Publisher evidence: '+s.evidenceURL,'Evidence date: '+(s.evidencePublished||'not supplied'),'Coverage: '+s.coverage,'Review limits: '+s.verification]:[]),''])].join('\r\n');
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
 let coverImage;
 function coverPhoto(){
  if(!coverImage)coverImage=(async()=>{
   const image=new Image();image.src=config.bookletCover.dataURL;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=480;canvas.getContext('2d').drawImage(image,0,0,720,480);
   return canvas.toDataURL('image/jpeg',.9);
  })();
  return coverImage;
 }
 async function build(key){
  const [m,PDF,photo]=await Promise.all([model(key),library(),coverPhoto()]),pdf=new PDF({unit:'pt',format:'letter',compress:true,putOnlyUsedFonts:true}),name=m.place?.name||'California',layout=[],links=[];
  pdf.setProperties({title:name+' local resource guide - resources and disaster phone charts',author:'Ferdant',subject:'Dated California resources; no live dispatch or shelter status'});pdf.setCreationDate(new Date(config.serviceChecked+'T12:00:00Z'));pdf.setFileId(('46455244414e54'+[...String(key||'CA')].map(c=>c.charCodeAt(0).toString(16)).join('')).padEnd(32,'0').slice(0,32));pdf.setLanguage('en-US');
  const icons=Object.fromEntries(await Promise.all(Object.entries(config.serviceTypes).map(async([id,t])=>[id,await iconImage(t.icon,t.color)])));
  const hazardIcons=Object.fromEntries(await Promise.all(m.events.map(async p=>{const svg=document.querySelector('[data-disaster="'+p.id+'"] .atlas-choice-symbol svg')?.outerHTML;return [p.id,svg?await iconImage(svg,blue):null];})));
  const companion=sourceDocument(m);let y=0,currentEvent=null;
  const page=()=>pdf.internal.getCurrentPageInfo().pageNumber;
  function text(value,x,top,width,size=10,color=ink,font='helvetica',style='normal'){
   pdf.setFont(font,style);pdf.setFontSize(size);pdf.setTextColor(color);const lines=pdf.splitTextToSize(plain(value),width),height=lines.length*size*1.26;pdf.text(lines,x,top+size,{lineHeightFactor:1.26});layout.push({page:page(),x,top,width,height,text:plain(value)});return height;
  }
  function line(top){pdf.setDrawColor(rule);pdf.setLineWidth(.6);pdf.line(40,top,572,top);}
  function header(label,cover=false){pdf.setFillColor(paper);pdf.rect(0,0,612,792,'F');text('ferdant.',40,24,180,13,blue,'helvetica','bold');text(cover?'RESOURCE BOOK / '+config.serviceChecked.slice(0,4):m.place?name+' / California':'California / Statewide',cover?390:260,27,cover?182:312,cover?8:9,muted);line(51);y=68;if(label)y+=text(label,40,y,532,12,blue)+10;}
  function next(label){pdf.addPage();header(label);}
  function space(height,label){if(y+height>728)next(label||(currentEvent?.label||'Everyday phone desk')+' / continued');}
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
    for(const {ref,number}of methods){if(ref.note){text(ref.note,376,ry,188,8,muted);ry+=12;}text(number.label,376,ry,188,12,blue);ry+=16;if(ref.text){text('Call or text',376,ry,188,8,blue);ry+=12;}}
    y+=height;line(y-1);
   }
   space(43,(currentEvent?.label||'Everyday phone desk')+' / phone chart continued');y+=9;y+=text('Immediate danger: call 911. Calls/texts need phone service. Referrals are not dispatch or confirmation of an available place.',40,y,532,9,muted)+12;
  }
  header(undefined,true);
  text(coverScope(m.place),40,80,318,8.5,blue,'helvetica','bold');
  const photoLayout={page:1,x:390,y:78,width:182,height:182*2/3};
  pdf.addImage(photo,'JPEG',photoLayout.x,photoLayout.y,photoLayout.width,photoLayout.height);
  pdf.setFont('times','normal');pdf.setFontSize(34);const titleSize=Math.min(34,310*34/pdf.getTextWidth(plain(name)));
  text(name,40,103,318,titleSize,ink,'times');
  text('Local resource guide',40,153,318,12,ink,'helvetica','bold');
  text('Local services and emergency resources.',40,177,318,10,muted);
  text('Street map on page 2',40,199,318,9,blue);
  line(232);text('Long-term hazard risk',40,246,330,18,ink,'times');text('Highest first / FEMA NRI',390,252,182,8,muted);
  y=282;
  const tocTop=y,toc=[];
  for(let i=0;i<m.events.length;i++){const p=m.events[i],x=40+(i%3)*181,top=tocTop+Math.floor(i/3)*54;pdf.setFillColor(p.risk.fill);pdf.rect(x-2,top-3,174,49,'F');if(hazardIcons[p.id])pdf.addImage(hazardIcons[p.id],'PNG',x,top,23,23);text(p.label,x+30,top,140,10);text(p.risk.label,x+30,top+28,108,8,p.risk.color,'helvetica','bold');toc.push({event:p,x,top});}
  y=tocTop+5*54+14;line(y);y+=14;
  y+=text('Risk summary: page 3. Everyday help follows it. Use the event page numbers above. Related phone charts follow each event.',40,y,532,10,blue)+12;
  y+=text('Selected directory locations, not every local program. Ordinary sites may close or restrict intake. No current shelter, cooling/warming activation, capacity, safe route or evacuation destination is saved.',40,y,532,9,muted)+10;
  const coverage=!m.place?'No city selected: statewide referrals only.':!m.regionalAvailable?'Additional county service records are not available in this copy; baseline records and referrals remain.':'Local or clearly labelled nearby directory records. Confirm the current entrance, service and eligibility before travel.';
  const riskScope=m.place?.city?'City tract screening, not an official city rating. Mapped-area coverage: '+m.riskProfile.record.coverage+'% (includes water where present).':m.place?'FEMA county-level risk ratings.':'No location selected: risk remains unassessed.';
  y+=text(riskScope+' FEMA NRI December 2025. Low does not mean safe; see page 3 for scope.',40,y,532,9,muted)+8;
  y+=text('Source names and dates are printed at the back. Calls and texts need phone service.',40,y,532,8,muted)+8;
  text('Photo: '+config.bookletCover.photographer+' / '+config.bookletCover.publisher+' [S'+m.coverSource+']',40,y,532,7,muted);
  next('Local street map');
  y+=text(name+' at a glance',40,y,532,25,ink,'times')+8;
  y+=text(m.streetMap.detailed?'Main roads and selected named streets. Use this page to get oriented.':'California main-road overview. Detailed local roads are not saved in this copy. This overview cannot provide local street directions.',40,y,532,10,muted)+14;
  const mapBox={x:40,y,w:532,h:410};
  const mapAudit=window.FerdantBookletMap.draw(pdf,m.streetMap,m.streetMap.detailed?m.evacuationMap:null,mapBox,text);
  y=mapBox.y+mapBox.h+13;
  y+=text('Gold: major highways / blue-gray: other main roads and selected streets. Dashed gray: approximate boundaries. North is up; scale is approximate at map center.',40,y,532,9,muted)+10;
  if(m.evacuationMap?.features.length&&m.streetMap.detailed){
   pdf.setDrawColor('#a52b77');pdf.setLineWidth(1.9);pdf.setLineDashPattern([5,3],0);pdf.line(40,y+6,72,y+6);pdf.setLineDashPattern([],0);
   y+=text('Purple dashed: evacuation planning roads [S'+m.evacuationMap.sourceRef+'].',82,y,490,9,ink,'helvetica','bold')+8;
   y+=text('Planning designation only. Follow current local instructions; no open road, assigned route or safe destination is confirmed.',40,y,532,9,muted)+10;
  }else{
   y+=text('No reviewed evacuation-road geometry is available for '+name+' in this copy. This street map remains available for orientation. Follow current local evacuation instructions.',40,y,532,9,muted)+10;
  }
  y+=text('Roads: U.S. Census Bureau / January 2026 [S'+m.streetMap.sourceRef+']. Checked '+m.streetMap.checked+'. Generalized selection, not turn-by-turn directions. Source notes are at the back.',40,y,532,8,muted);
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
  next('Everyday help without internet');
  const searchStartPage=page();
  y+=text('Ask for the help you need',40,y,532,25,ink,'times')+12;
  y+=text('Use the referral phone chart following these questions. Give your city or county and explain what you need. Ask for the exact address, current hours, eligibility and intake steps before traveling. Phone service is required; a referral does not guarantee availability.',40,y,532,10)+14;
  function searchHeight(value,width,size,style='normal'){
   pdf.setFont('helvetica',style);pdf.setFontSize(size);return pdf.splitTextToSize(plain(value),width).length*size*1.26;
  }
  const questions={broad:['Start with a referral','Say: I am in '+name+' and need help with ____. Which service should I contact, and what should I bring?'],food:['Food and everyday supplies','Ask where food is distributed, when the next pickup is, and whether you need identification or an appointment.'],water:['Water and hygiene','Ask where public drinking water, toilets or showers are available, and about current access restrictions or water advisories.'],housing:['Shelter and housing','Ask about intake, eligibility and available space. Confirm the destination before traveling.'],health:['Healthcare and treatment','Ask about clinic services, appointments and fees. For immediate danger, call 911.'],internet:['Libraries and internet','Ask about public internet access, charging and phone or internet assistance. Confirm the facility is open and the service is available.'],support:['Bills, legal aid and practical support','Ask about the kind of assistance you need, eligibility, deadlines and documents to bring.'],emergency:['Disaster preparation and recovery','Ask about local assistance and recovery offices. A recovery office is not an overnight shelter. Follow current instructions from officials.']};
  for(const group of m.searches){
   const [title,detail]=questions[group.id],refs=[...new Set(group.resources.map(s=>'S'+s.sourceRef))].join(', ');
   const height=searchHeight(title,508,12,'bold')+searchHeight(detail,508,10)+searchHeight('Background sources: '+refs,508,8)+26;
   space(height,'Everyday help / continued');
   y+=text(title,40,y,532,12,ink,'helvetica','bold')+5;
   y+=text(detail,40,y,532,10,muted)+5;
   y+=text('Background sources: '+refs,40,y,532,8,muted)+12;
  }
  phoneRows(m.appendix.filter(c=>/referral/i.test(c.kind)||c.id==='211-routing'),'Referral phone chart');
  let evacuationStartPage=null;
  if(m.evacuation){
   next('Evacuation routes & updates');evacuationStartPage=page();
   y+=text('Know where to check before you leave',40,y,532,24,ink,'times')+12;
   y+=text('Follow the route and destination given by local officials. A saved planning map or zone boundary does not tell you which streets are open now. This printed book cannot supply live orders, closures or a safe route. Listen to official radio announcements and instructions from local officials.',40,y,532,10)+12;
   y+=text('Prepare transport, medicines, assistive equipment and pet supplies in advance. If you need extra time, plan early. Never delay an official evacuation instruction to check this book. [S'+m.evacuation.general.sourceRef+']',40,y,532,9,muted)+10;
   y+=text('Flood, coastal flood, dam or levee failure: never drive or walk through floodwater or pass road barriers. [S'+m.evacuation.flood.sourceRef+']',40,y,532,9,muted)+12;
   if(!m.evacuation.localAvailable)y+=text('No local route-planning resource has been verified for '+name+' in this edition. Follow county emergency instructions; statewide planning sources do not fill that gap.',40,y,532,10,blue)+12;
   y+=text('Write down your plan before an emergency',40,y,532,14,ink,'helvetica','bold')+12;
   for(const label of ['My evacuation zone (if assigned):','Household meeting place:','Transport and assistance contact:']){y+=text(label,40,y,532,10)+18;line(y);y+=12;}
   y+=text('Planning references reviewed for this edition',40,y,532,12,ink,'helvetica','bold')+8;
   for(const s of m.evacuation.links){
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);
    const height=pdf.splitTextToSize(plain(s.title),532).length*11.34+22;
    space(height,'Evacuation routes & updates / continued');
    y+=text(s.title+' [S'+s.sourceRef+']',40,y,532,9,muted)+8;
   }
   space(48,'Evacuation routes & updates / continued');y+=text('Sources checked '+m.evacuation.checked+'. For state highway conditions, use the Caltrans number in the event phone charts. It does not assign an evacuation route or cover every local street. Printed information does not update.',40,y,532,9,muted)+12;
  }
  for(const p of m.events){
   currentEvent=p;next();p.startPage=page();if(hazardIcons[p.id])pdf.addImage(hazardIcons[p.id],'PNG',537,67,30,30);
   y+=text(p.artTitle,40,y,480,25,ink,'times')+7;y+=text(p.label+' / '+name,40,y,532,11,blue,'helvetica','bold')+12;
   y+=text(p.risk.label+' / '+(m.place?.city?'city tract screening':'county context')+' / not a forecast',40,y,532,9,p.risk.color,'helvetica','bold')+9;
   pdf.setFillColor('#edf3f7');const headHeight=(()=>{pdf.setFont('helvetica','bold');pdf.setFontSize(11);return pdf.splitTextToSize(plain(p.headline),508).length*13.86+20;})();pdf.rect(40,y,532,headHeight,'F');text(p.headline,52,y+9,508,11,ink,'helvetica','bold');y+=headHeight+12;
   for(const s of p.steps)y+=text(s.label+': '+s.text,40,y,532,9.5,ink)+4;
   y+=text('Guidance source: '+printSource(m.sources[p.guidanceRef-1])+' [S'+p.guidanceRef+']',40,y,532,9,muted)+10;
   if(p.evacuation&&evacuationStartPage){
    y+=text('Evacuation routes & updates / page '+evacuationStartPage,40,y,532,10,blue,'helvetica','bold')+8;
    if(p.evacuation==='tsunami'){
     y+=text('Plan and practice a route to your local tsunami assembly area or a safe place inland or uphill, outside the hazard zone. Plan to go on foot if you can; roads may be damaged or congested. [S'+m.evacuation.tsunami.sourceRef+']',40,y,532,9,muted)+6;
     y+=text('Coastal planning source: '+m.evacuation.tsunamiMap.title+' [S'+m.evacuation.tsunamiMap.sourceRef+']. No current route is saved.',40,y,532,9,muted)+10;
    }
   }
   y+=text('Choose the help you need',40,y,532,18,ink,'times')+8;
   y+=text(p.phase,40,y,532,9,muted)+9;
   for(let i=0;i<p.cards.length;i+=2){
    const row=p.cards.slice(i,i+2).map(printCard),width=258;
    const heights=row.map(c=>{pdf.setFont('helvetica','bold');pdf.setFontSize(10);const a=pdf.splitTextToSize(plain(c.issue),211).length*12.6;pdf.setFontSize(11);const b=pdf.splitTextToSize(plain(c.title),234).length*13.86;pdf.setFont('helvetica','normal');pdf.setFontSize(9);const d=pdf.splitTextToSize(plain(c.detail),234).length*11.34;return 18+a+8+b+7+d+8+pdf.splitTextToSize(plain(c.access),234).length*11.34+29;});
    const height=Math.max(...heights);space(height+13,p.label+' / resource choices');
    for(let k=0;k<row.length;k++){const c=row[k],x=40+k*274,top=y;pdf.setFillColor('#ffffff');pdf.setDrawColor(rule);pdf.rect(x,top,width,height,'FD');pdf.setFillColor(config.serviceTypes[c.kind].color);pdf.rect(x,top,3,height,'F');let cy=top+12;
     pdf.addImage(icons[c.kind],'PNG',x+12,cy,17,17);cy+=text(c.issue,x+35,cy,211,10,blue,'helvetica','bold')+9;
     cy+=text(c.title,x+12,cy,234,11,ink,'helvetica','bold')+6;
     cy+=text(c.detail,x+12,cy,234,9,muted)+7;
     cy+=text(c.access,x+12,cy,234,9,muted)+7;
     text('Source [S'+c.source+'] / notes at the back',x+12,cy,234,9,muted);
    }y+=height+13;
   }
   phoneRows(p.phones,'Phone chart / '+p.label);
   p.endPage=page();
  }
  currentEvent=null;next('Everyday phone desk');
  y+=text('The complete saved phone chart',40,y,532,24,ink,'times')+12;
  y+=text('All saved contacts for this location, including everyday billing and personal support. Event sections above contain the related subset. Scope, after-hours notes and call/text options are retained.',40,y,532,10)+18;
  phoneRows(m.appendix,'Local and California-wide help');
  next('Source names and dates');const sourceStartPage=page();
  y+=text('The sources behind this edition',40,y,532,24,ink,'times')+10;
  y+=text('Match each [S] reference to its source below. Check dates are not publication dates or confirmation that a service is open. Complete web addresses are kept in the separate Sources TXT file for later research.',40,y,532,9,muted)+14;
  for(const s of m.sources){
   const title='[S'+s.id+'] '+printSource(s),dates='Checked: '+(s.checked||'current service not verified')+' / Published or data date: '+(s.published||'not supplied');
   const height=searchHeight(title,532,10,'bold')+searchHeight(dates,532,8)+15;
   space(height,'Source names and dates / continued');
   y+=text(title,40,y,532,10,ink,'helvetica','bold')+3;
   y+=text(dates,40,y,532,8,muted)+12;
  }
  const total=pdf.getNumberOfPages();
  pdf.setPage(1);
  pdf.outline.add(null,'Local street map',{pageNumber:2});
  if(evacuationStartPage)pdf.outline.add(null,'Evacuation routes & updates',{pageNumber:evacuationStartPage});
  pdf.outline.add(null,'Everyday help without internet',{pageNumber:searchStartPage});
  pdf.outline.add(null,'Long-term relative hazard risk',{pageNumber:riskStartPage});
  for(const {event:p,x,top}of toc){pdf.outline.add(null,p.risk.label+' / '+p.label,{pageNumber:p.startPage});text('p. '+p.startPage,x+139,top+28,30,8,blue);}
  pdf.outline.add(null,'Everyday phone desk',{pageNumber:m.events.at(-1).endPage+1});
  pdf.outline.add(null,'Source names and dates',{pageNumber:sourceStartPage});
  for(let n=1;n<=total;n++){pdf.setPage(n);line(749);text('FERDANT / '+name,40,758,260,8,blue);text('Source notes p. '+sourceStartPage+' / '+n+' of '+total,351,758,221,8,muted);}
  for(const item of layout)if(item.top+item.height>(item.top>=750?776:744)||item.x+item.width>573)throw Error('Booklet layout overflow: '+JSON.stringify(item));
  return {blob:pdf.output('blob'),filename:companion.pdfFilename,sourcesFilename:companion.filename,sourcesText:companion.text,pages:total,events:m.events.map(p=>({id:p.id,start:p.startPage,end:p.endPage,cards:p.cards,phoneIds:p.phones.map(c=>c.id)})),layout,links,mapAudit,photoLayout,model:m};
 }
 window.FerdantBooklet={preview,model,build,contactIds,async sources(key){return sourceDocument(await model(key));}};
 function save(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const button=document.querySelector('#download-booklet');
 button?.addEventListener('click',async()=>{
  const key=document.querySelector('#phone-city').value,status=document.querySelector('#booklet-status');button.disabled=true;status.textContent='Combining your local resources and event phone charts...';
  try{const result=await build(key);save(result.blob,result.filename);status.textContent=result.pages+'-page print-ready resource book ready. Phone numbers and source notes are included; calls need phone service. Sources (TXT) keeps web addresses separately.';}
  catch{status.textContent='The resource book could not be prepared. Try again, or use the contact sheet or complete offline website below.';}finally{button.disabled=false;}
 });
 const sourcesButton=document.querySelector('#download-booklet-sources');
 sourcesButton?.addEventListener('click',async()=>{
  const key=document.querySelector('#phone-city').value,status=document.querySelector('#booklet-sources-status');sourcesButton.disabled=true;status.textContent='Preparing the matching source list...';
  try{const result=await window.FerdantBooklet.sources(key);save(new Blob([result.text],{type:'text/plain;charset=utf-8'}),result.filename);status.textContent='Source file ready. Its [S] references match this city and edition of the PDF.';}
  catch{status.textContent='The source file could not be prepared. Try again.';}finally{sourcesButton.disabled=false;}
 });
})();
