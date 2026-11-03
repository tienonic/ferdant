const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const config=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/<script type="application\/json" id="resource-map-data">(.*?)<\/script>/s)[1]);
const extraManifest=JSON.parse(fs.readFileSync('content/everyday-service-manifest.json','utf8'));
const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('content/statewide-service-manifest.json','utf8'));
function browserPath(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r.hidden&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});}
function inRing(x,y,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function inside(geometries,f){return geometries.some(g=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(p=>inRing(f.lng,f.lat,p[0])&&!p.slice(1).some(h=>inRing(f.lng,f.lat,h))));}
(async()=>{
 assert.equal(Object.keys(manifest.counties).length,58);assert.equal(Object.keys(config.resourcePlans).length,15);
 assert.equal(manifest.byKind.library,1110);assert.equal(manifest.byKind.clinic,2054);
 assert.equal(new Set(Object.values(config.serviceTypes).map(t=>t.icon)).size,18);
 for(const [kind,type]of Object.entries(config.serviceTypes))assert(type.icon.includes('data-icon="resource-'+kind+'"'));
 const box={window:{},document:{querySelector:s=>s==='#resource-map-data'?{textContent:JSON.stringify(config)}:null},location:{protocol:'https:'},TextEncoder,URL,AbortController,setTimeout,clearTimeout,crypto:crypto.webcrypto,fetch:async url=>({ok:true,text:async()=>fs.readFileSync('.'+url,'utf8')})};
 vm.runInNewContext(fs.readFileSync('service-resources.js','utf8'),box);const services=box.window.FerdantServices,regions=new Map(),geometries=new Map();
 const unique=new Set(),countySummary=[];
 for(const [county,ref]of Object.entries(manifest.counties)){
  const bytes=fs.readFileSync('.'+ref.path);assert.equal(bytes.length,ref.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),ref.sha256);
  const data=await services.load(county);regions.set(county,data);geometries.set(county,JSON.parse(fs.readFileSync('assets/data/city-maps/'+county+'.json','utf8')));
  for(const f of data){unique.add(f.id);assert(f.publicVisit&&!f.confidential&&f.locationType==='service');assert(!('SITE_PHONE_NUM'in f));assert(['library','clinic','food','water','restroom','shower'].includes(f.kind));}
  assert(ref.byKind.library>0);countySummary.push({county,localRecords:ref.localCount,regionalFallback:ref.regionalFallbackCount});
 }
 assert.equal(unique.size,3164+extraManifest.count);
 const cityAudit=[];
 for(const row of places.cities){
  const [key,name,county,lat,lng]=row,place={key,name,county,lat,lng,city:true},geoms=geometries.get(county).cities[key];assert(geoms?.length);
  const selected=services.nearby([...config.facilities,...regions.get(county)],place,f=>inside(geoms,f));
  for(const kind of ['library','clinic','hospital'])assert(selected.some(f=>f.kind===kind),name+' needs an actual local/nearby '+kind);
  for(const f of selected){assert(Number.isFinite(f.lat)&&Number.isFinite(f.lng));if(f.within)assert(inside(geoms,f));}
  const plans={};
  for(const [id,policy]of Object.entries(config.resourcePlans)){
   const view=policy.views.find(v=>v.id===policy.default);assert(view);assert(policy.phase&&policy.views.length>=4);
   const matches=selected.filter(f=>(f.categories||[f.kind]).some(kind=>view.kinds.includes(kind)));assert(matches.length>0,name+' / '+id);
   plans[id]=matches.length;
  }
  cityAudit.push({key,name,county,directoryPlaces:selected.length,insideCity:selected.filter(f=>f.within).length,
   byKind:Object.fromEntries(['library','clinic','hospital'].map(k=>[k,selected.filter(f=>f.kind===k).length])),plans});
 }
 assert.equal(cityAudit.length,483);
 fs.writeFileSync('screenshots/statewide-city-data-audit.json',JSON.stringify({checkedUTC:new Date().toISOString(),edition:manifest.edition,scope:'Selected directory coverage, not every local program or current operation',uniqueNewPoints:unique.size,countySummary,cities:cityAudit},null,2));
 const browser=await chromium.launch({executablePath:browserPath()}),findings=[];
 try{
  const c=await browser.newContext({viewport:{width:390,height:960},reducedMotion:'reduce'});await stubPublicMap(c);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/local/?place=57026');await ready(p);
  const choices=[...places.cities.map(c=>({key:c[0],name:c[1]})),...Object.entries(places.counties).map(([id,name])=>({key:'county:'+id,name:name+' County'}))];
  for(let i=0;i<choices.length;i++){
   const choice=choices[i];await p.locator('#phone-city').selectOption(choice.key,{force:true});await ready(p);
   assert.equal(await p.locator('#resource-map-title').innerText(),choice.name+' on the map');assert((await p.locator('.atlas-pin').count())>0,choice.name);
   assert.equal(await p.locator('.atlas-pin svg[data-icon^="resource-"]').count(),await p.locator('.atlas-pin').count());
   assert(!(await p.locator('#atlas-service-coverage').textContent()).includes('unavailable'),choice.name);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(i%100===0)console.log('Statewide browser choices: '+i+'/'+choices.length);
  }
  assert.deepEqual(errors,[]);findings.push({width:390,cityChoices:483,countyChoices:58,icons:'all rendered pins',horizontalClipping:false,errors});
  // Every disaster has real resource roles; switching a role removes other types.
  for(const width of [320,390,768,1440]){
   await p.setViewportSize({width,height:960});await p.goto(base+'/local/?place=19050');await ready(p);
   for(const [id,policy]of Object.entries(config.resourcePlans)){
    await p.locator('[data-disaster="'+id+'"]').click();await ready(p);
    for(const view of policy.views){
     await p.locator('#atlas-resource-filters summary').click();await p.locator('[data-resource-group="'+view.id+'"]').click();
     const kinds=await p.locator('.atlas-pin').evaluateAll(els=>els.map(el=>[...el.classList].find(c=>!['atlas-pin','leaflet-marker-icon','leaflet-zoom-animated','leaflet-interactive','leaflet-marker-draggable'].includes(c))));
     // A multi-service primary kind may have a secondary food/housing tag; LA
     // contains statewide medical/library points only in this checked edition.
     for(const kind of kinds)assert(view.kinds.includes(kind),id+' / '+view.id+' leaked '+kind);
     if(view.id==='temperature'){assert.equal(kinds.length,0);assert((await p.locator('#atlas-list-note').textContent()).includes('No verified current'));}
     assert.equal(await p.locator('.atlas-pin svg').count(),kinds.length);
    }
   }
   findings.push({width,disasterCategories:15,resourceRoles:'each verified',ordinaryLibraryTemperaturePins:0});
  }
  // A real export must carry new county points, not only the original Yolo list.
  await p.setViewportSize({width:390,height:960});await p.locator('#atlas-everyday').click();await ready(p);
  const download=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const dl=await download,file=path.resolve('screenshots/statewide-services-los-angeles.html');await dl.saveAs(file);
  const offline=await browser.newContext({offline:true,viewport:{width:390,height:960}}),o=await offline.newPage(),offlineHTTP=[];o.on('request',r=>{if(/^https?:/.test(r.url()))offlineHTTP.push(r.url());});await o.goto(pathToFileURL(file).href);await ready(o);
  assert.deepEqual(await o.locator('#service-map-snapshot').evaluate(el=>Object.keys(JSON.parse(el.textContent).counties)),['19']);
  assert((await o.locator('.atlas-pin.library').count())>0);assert((await o.locator('.atlas-pin.clinic').count())>0);
  await o.locator('#phone-city').selectOption('19039',{force:true});await ready(o);assert((await o.locator('.atlas-pin.library').count())>0);assert((await o.locator('.atlas-pin.clinic').count())>0);
  await o.locator('#phone-city').selectOption('57026',{force:true});await ready(o);assert((await o.locator('#atlas-service-coverage').textContent()).includes('unavailable'));assert.deepEqual(offlineHTTP,[]);await offline.close();
  findings.push({offlineCounty:'19',newLibraryClinicPoints:'retained',sameCountyCitySwitch:'retained',otherCounty:'explicit additional-data gap',offlineHTTP:0});
  await c.close();
  const failure=await browser.newContext();await stubPublicMap(failure);const f=await failure.newPage();await f.route('**/assets/data/service-maps/34.json',r=>r.fulfill({contentType:'application/json',body:'{"schema":1,"county":"34","records":[]}'}));await f.goto(base+'/local/?place=34060');await ready(f);assert((await f.locator('#atlas-service-coverage').textContent()).includes('unavailable'));const baselineIds=new Set(config.facilities.map(x=>x.id));for(const id of await f.locator('.atlas-pin').evaluateAll(els=>els.map(el=>el.dataset.resourceId)))assert(baselineIds.has(id),'A failed statewide source may retain real baseline locations only');await f.unroute('**/assets/data/service-maps/34.json');await f.reload();await ready(f);assert((await f.locator('.atlas-pin.library').evaluateAll(els=>els.some(el=>el.dataset.resourceId.startsWith('imls-')))));await failure.close();
  fs.writeFileSync('screenshots/statewide-services-verification.json',JSON.stringify({checkedUTC:new Date().toISOString(),dataAuditCities:483,dataAuditCountyFiles:58,newDirectoryPoints:3164,fixtures:'External hazard/shelter/tile responses simulated; regional directory bytes are the real checked projection',findings,hashFailure:'explicit; recovered after retry'},null,2));
  console.log('Statewide services: all 483 cities and 58 counties, all 15 disaster resource policies at four widths, distinct SVG markers and source failure recovery passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
