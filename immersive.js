'use strict';
(() => {
 const dataNode=document.querySelector('#resource-map-data');if(!dataNode)return;
 const config=JSON.parse(dataNode.textContent),payload=JSON.parse(document.querySelector('#phone-data').textContent),places=payload.places;
 const root=document.querySelector('#resource-atlas'),offline=location.protocol==='file:',reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const requestedPlan=offline?null:new URL(location.href).searchParams.get('hazard');
 const select=document.querySelector('#phone-city'),api=()=>window.FerdantResourceMap;
 const create=(doc,tag,text,cls)=>{const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 let currentStep=0,arranged=false,playing=false,manualPlan=null,topPlan=null,timers=[],numberFrame=0,scrollFrame=0,revealed=false,pendingReset=false,interactionScene=null;
 function area(key){const row=places.cities.find(row=>row[0]===key);if(row)return {key,name:row[1],county:row[2],city:true};const county=key?.startsWith('county:')?key.slice(7):null;return places.counties[county]?{key,name:places.counties[county]+' County',county,city:false}:null;}
 function ranking(key){return window.FerdantRisk?.ordered(key)||[];}
 function statistic(key){
  const place=area(key),top=ranking(key).find(p=>p.risk.order<3),data=config.countyRiskScores;
  if(!place||!top)return null;
  const row=data?.counties[place.county],components=data?.components[top.id]||[];
  const code=components.filter(code=>Number.isFinite(row?.[code+'_RISKS'])).sort((a,b)=>row[b+'_RISKS']-row[a+'_RISKS'])[0];
  if(!code)return {top,place,fallback:true,count:Object.keys(window.FerdantRisk.data.locations).filter(id=>id.startsWith('county:')===!place.city&&window.FerdantRisk.rating(id,top.id).order<=top.risk.order).length,total:place.city?places.cities.length:Object.keys(places.counties).length};
  const comparison=row.comparison?.[code];if(!comparison?.assessed||comparison.below<0)return null;
  return {top,place,code,score:row[code+'_RISKS'],below:comparison.below,assessed:comparison.assessed,percentBelow:100*comparison.below/comparison.assessed,loss:row[code+'_EALT'],label:data.componentLabels[code].toLowerCase(),release:data.release,source:data.source};
 }
 function render(doc,key){
  if(!doc.querySelector('.place-story'))return;
  const place=area(key);if(!place){if(doc===document&&arranged){const title=root.querySelector('[data-location-page]'),chooser=root.querySelector('.change-location');if(title)root.before(title);if(chooser)root.before(chooser);root.classList.remove('story-live','story-static');root.querySelector('.story-rail').hidden=true;arranged=false;currentStep=0;pendingReset=false;interactionScene=null;manualPlan=null;}return;}
  const zip=doc===document?window.FerdantZIP?.current?.code:doc.querySelector('meta[name="ferdant-zip"]')?.content;
  const heading=doc.querySelector('#local-page-title');if(heading)heading.textContent=zip?'ZIP '+zip:place.name;
  const intro=doc.querySelector('#local-page-intro');if(intro)intro.textContent='';
  doc.querySelector('#story-county').textContent=places.counties[place.county]+' County, California';
  const zipInfo=zip?window.FerdantZIP?.lookup(zip):null;
  doc.querySelector('#story-place-note').textContent=zip?'Nearby resources around the ZIP area center. Phone numbers and the PDF booklet cover '+place.name+'.'+(zipInfo?.counties.length>1?' This ZIP area also overlaps '+zipInfo.counties.slice(1).map(c=>places.counties[c]+' County').join(', ')+'.':''):'Approximate boundaries. Service areas vary.';
  const ordered=ranking(key),hazards=ordered.filter(p=>p.risk.order<=1).slice(0,3),host=doc.querySelector('#story-hazards');host.replaceChildren();
  if(!hazards.length)host.append(create(doc,'p','No assessed hazard here is rated moderate or higher.','story-voice'));
  for(const plan of hazards){
   const row=create(doc,'div',null,'story-hazard');row.dataset.hazard=plan.id;
   row.append(create(doc,'h3',plan.label,'story-voice'),create(doc,'span',plan.risk.sourceRating,'story-rating'));
   const level=Math.max(0,window.FerdantRisk.data.ratingLabels.indexOf(plan.risk.sourceRating)-3),meter=create(doc,'span',null,'story-meter');meter.setAttribute('role','img');meter.setAttribute('aria-label',plan.risk.sourceRating+' — '+level+' of 5 rating levels');
   for(let n=1;n<=5;n++){const tick=create(doc,'i');tick.dataset.filled=String(n<=level);tick.setAttribute('aria-hidden','true');meter.append(tick);}row.append(meter);host.append(row);
  }
  const profile=window.FerdantRisk.profile(key),scope=doc.querySelector('#story-risk-scope');scope.replaceChildren(doc.createTextNode(place.city?'City screening across overlapping tracts; not an official city rating. ':'FEMA county ratings. '));
  const method=create(doc,'a','Method and limits');method.href=(offline||doc!==document?'https://ferdant.com':'')+'/sources-and-corrections/#references-disasters';if(profile.record?.coverage<95)scope.append(doc.createTextNode('Mapped coverage '+profile.record.coverage+'%; other areas unassessed. '));scope.append(method);scope.title=profile.scope;
  const stat=statistic(key),comparison=doc.querySelector('#story-comparison'),loss=doc.querySelector('#story-loss'),source=doc.querySelector('#story-stat-source');comparison.replaceChildren();loss.textContent='';source.replaceChildren();
  if(stat?.fallback){comparison.textContent=stat.count+' of '+stat.total+' California '+(place.city?'city screens':'counties')+' share or exceed this '+stat.top.label.toLowerCase()+' rating.';source.textContent='Ferdant’s saved FEMA ratings · '+profile.release+'. Relative risk, not a forecast.';}
  else if(stat){
   const value=Math.floor(stat.percentBelow),counter=create(doc,'span',String(value));counter.dataset.finalNumber=String(value);counter.dataset.sourceField=stat.code+'_RISKS';counter.dataset.rawValue=String(stat.score);counter.dataset.below=String(stat.below);counter.dataset.assessed=String(stat.assessed);
   comparison.append(doc.createTextNode(places.counties[place.county]+" County’s "+stat.label+' risk '));
   if(stat.percentBelow===0)comparison.append(doc.createTextNode('has no assessed U.S. county below it in FEMA’s scoring.'));
   else comparison.append(doc.createTextNode('is higher than '),counter,doc.createTextNode('% of assessed U.S. counties.'));
   if(Number.isFinite(stat.loss)&&stat.loss>0){const amount=stat.loss>=1e9?'$'+(stat.loss/1e9).toLocaleString('en-US',{maximumFractionDigits:1})+' billion':stat.loss>=1e6?'$'+(stat.loss/1e6).toLocaleString('en-US',{maximumFractionDigits:0})+' million':'$'+stat.loss.toLocaleString('en-US',{maximumSignificantDigits:2});loss.textContent='FEMA estimates '+stat.label+' costs the county about '+amount+' a year on average.';loss.dataset.sourceField=stat.code+'_EALT';loss.dataset.rawValue=String(stat.loss);}
   const link=create(doc,'a','FEMA National Risk Index');link.href=stat.source.url;source.append(link,doc.createTextNode(' · '+stat.release+'. Compared with counties FEMA scored for this hazard. Relative risk, not a forecast. Loss includes buildings, agriculture and monetized deaths and injuries, in 2024 dollars.'));
  }else comparison.textContent='No assessed hazard has a county comparison in this edition.';
  if(doc===document){const priorManual=arranged?manualPlan:null;topPlan=ordered.find(p=>p.risk.order<3)||ordered[0];manualPlan=config.disasters.plans.some(p=>p.id===requestedPlan)?requestedPlan:priorManual;interactionScene=null;revealed=false;currentStep=0;pendingReset=true;}
  updatePlan(doc,topPlan?.id||ordered[0]?.id);
 }
 function updatePlan(doc,id){
  const plan=config.disasters.plans.find(p=>p.id===id);if(!plan)return;
  doc.querySelector('#story-plan-title').textContent=plan.headline;
  const list=doc.querySelector('#story-plan-steps');list.replaceChildren(...plan.steps.map(step=>create(doc,'li',step.text)));
 }
 function countPlaces(doc,facts){
  if(!facts?.place)return;
  const items=facts.items,host=doc.querySelector('#story-categories');host.replaceChildren();
  doc.querySelector('#story-places-title').textContent=items.length?items.length+' directory places in this view.':'No directory places are saved for this view.';
  doc.querySelector('#story-places-title').dataset.count=String(items.length);
  const counts=new Map();items.forEach(item=>counts.set(item.kind,(counts.get(item.kind)||0)+1));
  for(const [kind,count] of counts){
   const button=create(doc,'button',facts.types[kind].label+' · '+count);button.type='button';button.disabled=doc!==document;button.dataset.storyKind=kind;button.dataset.count=String(count);button.setAttribute('aria-pressed','false');
   if(doc===document)button.addEventListener('click',()=>{stopPlay();interactionScene=5;activate(5);api().filterStoryKind(kind);doc.querySelectorAll('[data-story-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.storyKind===kind)));});host.append(button);
  }
  if(!facts.available)host.append(create(doc,'p','Some regional directory data is unavailable. Missing data does not mean no services.','story-note'));
 }
 function move(doc,selector,target){const el=doc.querySelector(selector),host=doc.querySelector(target);if(el&&host)host.append(el);}
 function arrange(doc,live){
  const atlas=doc.querySelector('#resource-atlas');if(!atlas)return;
  move(doc,'[data-location-page]','[data-story-title]');move(doc,'.change-location','#story-1');
  move(doc,'.atlas-controls','[data-story-plan-choices]');move(doc,'#atlas-action-plan','[data-story-plan-detail]');move(doc,'.atlas-places','[data-story-places]');
  move(doc,'#offline-download','[data-story-downloads]');move(doc,'#location-resources','[data-story-contacts]');
  if(!doc.querySelector('.story-map-controls')){
   const controls=create(doc,'details',null,'story-map-controls');controls.append(create(doc,'summary','Map controls and sources'));
   const content=create(doc,'div',null,'story-map-control-content');controls.append(content);doc.querySelector('.atlas-map-column').append(controls);
   for(const selector of ['.atlas-route-controls','.atlas-map-summary','#atlas-guidance','.atlas-legend-disclosure','#atlas-layer-status','#atlas-fault-help','#atlas-map-status','#atlas-layer-credit','#atlas-sources'])move(doc,selector,'.story-map-control-content');
   const change=create(doc,'a','Change location','story-change');change.href=live?'/#location-start':'#location-start';doc.querySelector('.atlas-map-frame').append(change);
  }
  atlas.classList.add(live?'story-live':'story-static');
 }
 function later(fn,delay){const timer=setTimeout(()=>{timers=timers.filter(t=>t!==timer);fn();},delay);timers.push(timer);}
 function stopPlay(event){
  if(event&&(event.type==='wheel'||event.type==='touchstart'||event.type==='keydown'&&['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(event.key)&&!event.target.closest('button,input,select,textarea,summary,a')))interactionScene=null;
  playing=false;timers.forEach(clearTimeout);timers=[];root.dataset.playing='false';root.querySelectorAll('.story-hazard').forEach(row=>row.classList.remove('is-pending'));
  cancelAnimationFrame(numberFrame);const counter=root.querySelector('[data-final-number]');if(counter)counter.textContent=counter.dataset.finalNumber;
  // Stop an automatic smooth scroll at its present position.
  if(root.classList.contains('story-playing')){window.scrollTo({top:scrollY,behavior:'instant'});root.classList.remove('story-playing');}
 }
 function revealRows(){
  if(revealed)return;revealed=true;
  const rows=[...root.querySelectorAll('.story-hazard')];
  rows.forEach((row,index)=>{
   if(reduce.matches){row.classList.remove('is-pending');return;}
   row.classList.add('is-pending');
   later(()=>{row.classList.remove('is-pending');row.classList.add('is-revealed');const plan=config.disasters.plans.find(p=>p.id===row.dataset.hazard);if(plan?.layers.length)api()?.setStoryScene(2,plan.id);},index*600);
  });
 }
 function countUp(){
  const el=root.querySelector('[data-final-number]');if(!el||el.dataset.counted)return;el.dataset.counted='true';
  if(reduce.matches)return;const target=Number(el.dataset.finalNumber),start=performance.now();
  function frame(now){const t=Math.min(1,(now-start)/600);el.textContent=String(Math.round(target*(1-Math.pow(1-t,3))));if(t<1)numberFrame=requestAnimationFrame(frame);}numberFrame=requestAnimationFrame(frame);
 }
 function activate(step){
  if(step===currentStep||!arranged||offline||pendingReset||root.hasAttribute('aria-busy'))return;currentStep=step;root.dataset.currentStep=String(step);
  root.querySelectorAll('[data-story-jump]').forEach(link=>{if(Number(link.dataset.storyJump)===step)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  if(step===1)api()?.setStoryScene(1,'everyday');
  if(step===2){api()?.setStoryScene(2,reduce.matches?topPlan?.id:undefined);revealRows();}
  if(step===3){api()?.setStoryScene(3,topPlan?.id);countUp();}
  if(step===4)api()?.setStoryScene(4,manualPlan||topPlan?.id);
  if(step===5){api()?.setStoryScene(5,'everyday');root.querySelectorAll('.atlas-pin,.atlas-cluster').forEach((pin,index)=>{pin.style.setProperty('--arrival-delay',Math.min(index,12)*60+'ms');pin.classList.add('story-pin-arrival');});}
  if(step===6)api()?.setStoryScene(6,'everyday');
 }
 function jump(step,automatic=false){
  const target=root.querySelector('[data-story-step="'+step+'"]');if(!target)return;
  if(!automatic)stopPlay();interactionScene=step;activate(step);window.scrollTo({top:target.getBoundingClientRect().top+scrollY-(innerWidth<=700?innerHeight*.46:0),behavior:reduce.matches?'instant':'smooth'});
 }
 function watchScroll(){
  if(scrollFrame||offline)return;scrollFrame=requestAnimationFrame(()=>{
   scrollFrame=0;const phone=innerWidth<=700,line=phone?innerHeight*.46+Math.min(160,innerHeight*.2):innerHeight*.45;
   const steps=[...root.querySelectorAll('[data-story-step]')];let best=1;
   steps.forEach(step=>{if(step.getBoundingClientRect().top<=line)best=Number(step.dataset.storyStep);});
   activate(interactionScene||best);const rect=root.getBoundingClientRect();root.querySelector('.story-rail').hidden=rect.bottom<100||rect.top>innerHeight;
  });
 }
 function play(){
  if(!window.FerdantJustChosen||reduce.matches||offline)return;window.FerdantJustChosen=false;playing=true;root.dataset.playing='true';root.classList.add('story-playing');
  later(()=>{if(!playing)return;jump(2,true);later(()=>{if(!playing)return;jump(3,true);playing=false;root.dataset.playing='false';root.classList.remove('story-playing');root.querySelector('#story-scroll').hidden=false;},3700);},1500);
 }
 function onDraw(){
  if(!select.value||root.hasAttribute('aria-busy'))return;
  if(!arranged){arrange(document,!offline);arranged=true;api()?.resize();}
  countPlaces(document,api()?.storyFacts);updatePlan(document,api()?.active==='everyday'?topPlan?.id:api()?.active);
  if(pendingReset){pendingReset=false;if(manualPlan&&!window.FerdantJustChosen&&!offline){interactionScene=4;activate(4);root.querySelector('#story-4').scrollIntoView({block:'start',behavior:'instant'});}else activate(1);if(!offline){root.querySelector('.story-rail').hidden=false;play();}}
 }
 window.FerdantStory={render,statistic,async embed(doc,key){render(doc,key);arrange(doc,false);const facts=api()?.storyFacts;if(facts?.place?.key===key)countPlaces(doc,facts);doc.querySelector('.story-rail').hidden=true;}};
 document.addEventListener('DOMContentLoaded',()=>{
  document.body.classList.add('story-script-ready');render(document,select.value);onDraw();
  document.addEventListener('ferdant:map-drawn',onDraw);
  document.addEventListener('ferdant:location',stopPlay);
  if(offline)return;
  for(const type of ['wheel','touchstart','keydown','pointerdown'])window.addEventListener(type,stopPlay,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay();});
  reduce.addEventListener('change',()=>{if(reduce.matches){stopPlay();root.querySelectorAll('.story-hazard').forEach(row=>row.classList.remove('is-pending'));}});
  root.querySelectorAll('[data-story-jump]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();jump(Number(link.dataset.storyJump));}));
  root.querySelector('#story-full-plan').addEventListener('click',event=>{event.preventDefault();const detail=root.querySelector('.atlas-plan-details');if(detail){detail.open=true;detail.querySelector('summary').focus();}});
  root.querySelector('.atlas-controls').addEventListener('click',event=>{const button=event.target.closest('[data-disaster],#atlas-everyday');if(button){if(button.id==='atlas-everyday'){manualPlan=null;interactionScene=5;activate(5);}else{manualPlan=button.dataset.disaster;interactionScene=4;activate(4);}}});
  window.addEventListener('scroll',watchScroll,{passive:true});window.addEventListener('resize',watchScroll);
 });
})();
