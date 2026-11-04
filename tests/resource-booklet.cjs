const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
function browserPath(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return r.hidden||!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});await p.waitForFunction(()=>document.querySelector('#infographic-preview').naturalWidth>0);}
async function capture(p,key){return p.evaluate(async key=>{const r=await window.FerdantBooklet.build(key);return {bytes:Array.from(new Uint8Array(await r.blob.arrayBuffer())),pages:r.pages,filename:r.filename,sourcesFilename:r.sourcesFilename,sourcesText:r.sourcesText,events:r.events,sources:r.model.sources,appendix:r.model.appendix,layout:r.layout,links:r.links,mapAudit:r.mapAudit,photoLayout:r.photoLayout,regionalAvailable:r.model.regionalAvailable};},key);}
(async()=>{
 const manifest=JSON.parse(fs.readFileSync('content/booklet-road-manifest.json','utf8'));
 assert.equal(Object.keys(manifest.counties).length,58);let roadCities=0;
 for(const ref of [manifest.state,...Object.values(manifest.counties)]){const raw=fs.readFileSync(ref.path.slice(1));assert.equal(raw.length,ref.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),ref.sha256);const data=JSON.parse(raw);assert(data.roads.length>0);roadCities+=Object.keys(data.cities||{}).length;}
 assert.equal(roadCities,483);
 fs.mkdirSync('screenshots/booklet',{recursive:true});
 const browser=await chromium.launch({executablePath:browserPath()}),findings=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:960},acceptDownloads:true});await stubPublicMap(context);const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/local/?place=57026');await ready(p);
  // Selection uses the same public boundaries/services as the map, for every
  // indexed city and county. No current hazard, phone filter or private input is read.
  const choices=[...places.cities.map(c=>c[0]),...Object.keys(places.counties).map(c=>'county:'+c),''];
  const summaries=await p.evaluate(async keys=>{const out=[];for(const key of keys){const m=await window.FerdantBooklet.model(key);out.push({key,events:m.events.length,eventIds:m.events.map(p=>p.id),omitted:m.omittedEvents.map(p=>p.id),care:m.events[0].cards.filter(c=>['hospital','clinic'].includes(c.kind)).length,phoneCharts:m.events.filter(p=>p.phones.length).length,roads:m.streetMap.roads.length,bounds:m.streetMap.bounds,detailed:m.streetMap.detailed});}return out;},choices);
  for(const s of summaries){assert(s.events>0&&s.events<=14);assert.equal(s.phoneCharts,s.events);assert(!s.eventIds.includes('drought'));assert(s.omitted.every(id=>!s.eventIds.includes(id)));assert(s.roads>0,s.key);assert(s.detailed,s.key);assert(s.bounds.every(Number.isFinite));if(s.key&&!s.key.startsWith('county:'))assert.equal(s.care,2,s.key);}
  const byKey=key=>summaries.find(s=>s.key===key);
  assert(!byKey('19050').eventIds.includes('avalanche'));assert(!byKey('19050').eventIds.includes('volcano'));assert(byKey('19050').eventIds.includes('cold'));
  assert(byKey('county:19').eventIds.includes('avalanche'));assert(byKey('09092').eventIds.includes('avalanche'));assert(byKey('26001').eventIds.includes('avalanche'));
  for(const id of ['tsunami','coastal','avalanche'])assert(!byKey('57026').eventIds.includes(id));
  for(const id of ['earthquake','wildfire','cold','dam','levee','subsidence'])assert(byKey('57026').eventIds.includes(id));
  assert.equal(byKey('').events,14);assert.equal(byKey('').omitted.length,0);
  const laPreview=await p.evaluate(()=>FerdantBooklet.preview('19050'));assert(!laPreview.includes('Avalanche'));assert(!laPreview.includes('Drought'));
  assert(await p.evaluate(()=>!window.jspdf));const sourceOnly=p.waitForEvent('download');await p.locator('#download-booklet-sources').click();const sourceOnlyFile=await sourceOnly;assert(sourceOnlyFile.suggestedFilename().endsWith('-sources.txt'));assert(await p.evaluate(()=>!window.jspdf),'TXT export must not load the PDF writer');
  const longest=[...places.cities].sort((a,b)=>b[1].length-a[1].length)[0][0];
  const vallejo=places.cities.find(c=>c[1]==='Vallejo')[0];
  const cases=[vallejo,'57026','38001','19050','county:57','25071','19039','county:02','',longest];
  let original,originalSources;
  for(const key of cases){
   await p.goto(base+'/local/'+(key?'?place='+encodeURIComponent(key):''));await ready(p);
   const r=await capture(p,key),bytes=Buffer.from(r.bytes);delete r.bytes;
   assert(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));assert.equal(r.events.length,summaries.find(s=>s.key===key).events);assert(r.pages>r.events.length+2&&r.pages<60);assert(!r.layout.some(l=>l.text==='Drought'));assert(r.sourcesText.includes('LOCAL BOOKLET SELECTION'));
   assert.equal(r.photoLayout.page,1);assert(r.photoLayout.x>=390&&r.photoLayout.y<100);assert.equal(r.photoLayout.width/r.photoLayout.height,1.5);assert(r.sourcesText.includes('RDNE Stock project'));assert(r.layout.some(l=>l.page===1&&l.text==='Local resource guide'));assert(!r.layout.some(l=>l.page===1&&l.text==='field notes.'));const heading=r.layout.find(l=>l.page===1&&l.top===103);assert(heading&&heading.x+heading.width<r.photoLayout.x&&heading.height<=43);assert(r.layout.some(l=>l.page===1&&l.text==='Street map on page 2'));assert(r.sourcesText.includes('https://www.pexels.com/license/'));
   assert.equal(r.mapAudit.page,2);assert(r.mapAudit.roadsDrawn>0);assert(r.mapAudit.streetLabels.length>0,key);assert(r.mapAudit.northArrow);assert(r.mapAudit.scaleKm>0&&r.mapAudit.scalePoints>0&&r.mapAudit.scalePoints<=101);assert(Math.abs(r.mapAudit.scaleKm*1000-r.mapAudit.scalePoints*r.mapAudit.groundMetersPerPoint)<.001);
   assert(r.layout.filter(l=>l.page===2&&r.mapAudit.streetLabels.includes(l.text)).every(l=>l.height<=12),'Street labels must fit on one line');assert(r.layout.some(l=>l.page===2&&l.text==='Local street map'));assert(r.layout.some(l=>l.page===2&&l.text==='N'));assert(r.layout.some(l=>l.page===2&&l.text==='Scale at map center'));
   for(const e of r.events){assert(e.start<=e.end);assert(e.cards.length>=3);assert(e.phoneIds.length>=2);for(const card of e.cards){assert(card.issue&&card.title&&card.source);assert(!card.title.includes('PRIVATE-'));if(['cooling','warming','shelter'].includes(card.kind))assert(card.referral);}}
   assert(r.layout.every(l=>l.top+l.height<=(l.top>=750?776:744)));assert(!r.layout.some(l=>/undefined|NaN/.test(l.text)));assert(!r.layout.some(l=>/Sources & edition|Sources p\./.test(l.text)));
   assert.equal(r.sourcesFilename,r.filename.replace('.pdf','-sources.txt'));for(const source of r.sources){assert(r.sourcesText.includes('[S'+source.id+'] '+source.title));assert(r.sourcesText.includes(source.url));if(source.published)assert(r.sourcesText.includes(source.published));}
   assert(r.sourcesText.includes('Contacts checked:'));assert(!r.sourcesText.includes('PRIVATE-NOTE'));
   assert.deepEqual(r.links,[],'Printed booklets must not contain hyperlinks');
   assert(!bytes.includes(Buffer.from('/Subtype /Link')),'No PDF link annotations, including phone or page links');
   assert(!r.layout.some(l=>/https?:\/\/|www\.|check online|tap here|open a directory|referral link/i.test(l.text)),'Printed instructions must work without web links');
   assert(r.layout.some(l=>l.text==='Everyday help without internet'));
   assert(r.layout.some(l=>l.text==='Referral phone chart'));
   assert(r.layout.some(l=>l.text==='Source names and dates'));
   for(const source of r.sources)assert(r.layout.some(l=>l.text.startsWith('[S'+source.id+'] ')),'Every printed source reference must resolve within the booklet');
   const filename=key==='57026'?'ferdant-davis-resource-book.pdf':key==='38001'?'ferdant-san-francisco-resource-book.pdf':key==='19039'?'ferdant-vernon-resource-book.pdf':'case-'+(key||'california').replace(':','-')+'.pdf';
   fs.writeFileSync('screenshots/booklet/'+filename,bytes);fs.writeFileSync('screenshots/booklet/'+filename.replace('.pdf','-sources.txt'),r.sourcesText);fs.writeFileSync('screenshots/booklet/'+filename.replace('.pdf','.json'),JSON.stringify(r,null,2));
   findings.push({key,pages:r.pages,bytes:bytes.length,events:r.events.map(e=>({id:e.id,start:e.start,end:e.end,phoneIds:e.phoneIds})),filename});
   if(key==='19050'){
    const wait=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const file=path.resolve('screenshots/booklet/la-offline.html');await(await wait).saveAs(file);
    const off=await browser.newContext({offline:true}),o=await off.newPage(),requests=[];o.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await o.goto(pathToFileURL(file).href);await ready(o);
    const saved=await capture(o,key);assert.deepEqual(saved.events.map(e=>e.id),r.events.map(e=>e.id));assert(!saved.events.some(e=>['drought','avalanche'].includes(e.id)));assert.deepEqual(Buffer.from(saved.bytes),bytes);assert.deepEqual(requests,[]);await off.close();
   }
   if(key==='57026'){
    original=bytes;originalSources=r.sourcesText;
    await p.locator('#what-am-i-paying-for > summary').click();await p.getByRole('navigation',{name:'Quick tools'}).getByRole('link',{name:'Draft a billing message'}).click();await p.getByLabel('What needs explaining?').fill('PRIVATE-NOTE-EXCLUDED-FROM-BOOKLET');await p.getByRole('button',{name:'Close tool',exact:true}).click();
    await p.locator('[data-disaster="flood"]').click();await ready(p);
    const second=await capture(p,key);assert.equal(second.sourcesText,originalSources);assert.deepEqual(Buffer.from(second.bytes),original,'Private notes and map choice must not change an all-event public booklet');
    const wait=p.waitForEvent('download');await p.locator('#download-booklet').click();const dl=await wait;assert(dl.suggestedFilename().endsWith('.pdf'));await dl.saveAs('screenshots/booklet/button-download.pdf');
    assert.deepEqual(fs.readFileSync('screenshots/booklet/button-download.pdf'),original);
    const txtWait=p.waitForEvent('download');await p.locator('#download-booklet-sources').click();const txtDownload=await txtWait;assert.equal(txtDownload.suggestedFilename(),r.sourcesFilename);await txtDownload.saveAs('screenshots/booklet/button-sources.txt');assert.equal(fs.readFileSync('screenshots/booklet/button-sources.txt','utf8'),originalSources);
    const offlineWait=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const saved=await offlineWait,file=path.resolve('screenshots/booklet/davis-offline.html');await saved.saveAs(file);
    const off=await browser.newContext({offline:true,acceptDownloads:true}),o=await off.newPage(),requests=[],offErrors=[];o.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});o.on('pageerror',e=>offErrors.push(e.message));await o.goto(pathToFileURL(file).href);await ready(o);
    const offResult=await capture(o,'57026');assert.equal(offResult.sourcesText,originalSources);assert.deepEqual(Buffer.from(offResult.bytes),original,'The saved county must reproduce the same booklet without internet');
    const offWait=o.waitForEvent('download');await o.locator('#download-booklet').click();const offDownload=await offWait;assert(offDownload.suggestedFilename().endsWith('.pdf'));const offTxtWait=o.waitForEvent('download');await o.locator('#download-booklet-sources').click();const offTxt=await offTxtWait;assert.equal(offTxt.suggestedFilename(),r.sourcesFilename);assert.deepEqual(requests,[]);assert.deepEqual(offErrors,[]);const unsaved=await o.evaluate(()=>FerdantBookletMap.map('38001'));assert.equal(unsaved.detailed,false);assert(unsaved.roads.length>0);await off.close();
   }
  }
  for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:960});await p.goto(base+'/local/?place=38001');await ready(p);assert(await p.locator('#download-booklet').isVisible());assert(await p.locator('#download-booklet-sources').isVisible());const mapDownload=p.locator('.atlas-offline-link');assert.equal((await mapDownload.innerText()).trim(),'Download offline');assert(await mapDownload.evaluate(el=>el.getBoundingClientRect().height>=58));if(width<=600)assert(await mapDownload.evaluate(el=>el.getBoundingClientRect().width>=el.parentElement.clientWidth-34));await mapDownload.click();await p.waitForFunction(()=>document.querySelector('#offline-download').getBoundingClientRect().top<innerHeight);assert(p.url().endsWith('#offline-download'));assert(await p.locator('#download-booklet').evaluate(el=>el.getBoundingClientRect().height>=44));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#offline-download').screenshot({path:'screenshots/booklet/download-panel-'+width+'.png'});}
  // An additional directory failure stays a gap in the file. A retry can recover.
  const failure=await browser.newContext();await stubPublicMap(failure);await failure.route('**/assets/data/service-maps/34.json',r=>r.abort());const f=await failure.newPage();await f.goto(base+'/local/?place=34060');await ready(f);const missing=await f.evaluate(()=>window.FerdantBooklet.model('34060'));assert.equal(missing.regionalAvailable,false);assert(!missing.events.some(e=>e.cards.some(c=>c.physicalId?.startsWith('imls-')||c.physicalId?.startsWith('hrsa-'))));await failure.close();
  const roadFailure=await browser.newContext();await stubPublicMap(roadFailure);await roadFailure.route('**/assets/data/booklet-roads/38.json',r=>r.abort());const rf=await roadFailure.newPage();await rf.goto(base+'/local/?place=38001');await ready(rf);const fallback=await capture(rf,'38001');assert(fallback.mapAudit.roadsDrawn>0);assert(fallback.layout.some(l=>l.page===2&&l.text.startsWith('California main-road overview.')));await roadFailure.close();
  assert.deepEqual(errors,[]);assert(await p.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
  fs.writeFileSync('screenshots/resource-booklet-verification.json',JSON.stringify({checkedUTC:new Date().toISOString(),fixtures:'External GIS/tiles/shelters simulated; public county directory files are real',modelChoices:summaries.length,mapCoverage:{cities:roadCities,counties:58,state:true,roadSource:manifest.source,roadDataDate:manifest.published,mapPage:2,compass:true,scale:true,roadFailure:'explicit statewide fallback'},findings,offlineHTTP:0,privateNotesAndMapChoice:'PDF bytes identical',widths:[320,390,768,1440],sourceFailure:'explicit gap',sourceAppendix:'printed names/dates and separate URL-bearing TXT; no PDF links',mapDownloadMinimumHeight:58,errors},null,2));
  console.log('Resource books: 542 location models with page-two roads; ten real PDFs, location-specific event sections/phone charts, printed source references and zero links, private-input exclusion, disconnected export and four-width controls passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
