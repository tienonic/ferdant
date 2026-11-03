const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {stubPublicMap,isPublicMapRequest}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const data=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/<script type="application\/json" id="resource-map-data">(.*?)<\/script>/s)[1]).disasters;
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(x=>x.startsWith('chromium_headless_shell-')).sort().reverse().map(x=>path.join(root,x,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r.hidden&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});}
async function choose(p,id){await p.locator('#atlas-disaster').selectOption(id);await ready(p);}
function collection(ids,extra={}){return {type:'FeatureCollection',features:ids.map(id=>({type:'Feature',geometry:{type:'Polygon',coordinates:[[[-121.75,38.55],[-121.74,38.55],[-121.74,38.56],[-121.75,38.56],[-121.75,38.55]]]},properties:{OBJECTID:id,...extra}}))};}
(async()=>{
 assert.equal(data.plans.length,15);assert.equal(new Set(data.plans.map(p=>p.id)).size,15);
 assert(data.plans.every(p=>p.steps.length===3&&p.guidance.url.startsWith('https://')&&(p.id==='tsunami'||p.layers.length)));
 assert(data.plans.every(p=>p.layers.every(id=>data.layers[id])));
 for(const s of Object.values(data.layers))assert(/^(https:\/\/)(hazards\.fema\.gov|services[12]?\.arcgis\.com|mapservices\.weather\.noaa\.gov|coast\.noaa\.gov)\//.test(s.service));
 const browser=await chromium.launch({executablePath:executable()}),findings=[];
 try{
  for(const width of [320,390,768,1440]){
   const c=await browser.newContext({acceptDownloads:true,viewport:{width,height:960},reducedMotion:'reduce'});await stubPublicMap(c);
   const p=await c.newPage(),errors=[],unexpected=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin&&!isPublicMapRequest(r.url()))unexpected.push(r.url());});
   await p.goto(base+'/local/?place=57026');await ready(p);assert.equal(await p.locator('#atlas-disaster option').count(),16);
   for(const plan of data.plans){
    await choose(p,plan.id);assert.equal(await p.locator('#resource-atlas').getAttribute('data-layer'),plan.id);assert.equal(await p.locator('.disaster-steps li').count(),3);assert((await p.locator('#atlas-action-plan h3').innerText()).includes(plan.label));
    assert.equal(await p.locator('.atlas-pin.food,.atlas-pin.support').count(),0,'Disaster plans replace everyday places');
    assert.equal(await p.locator('#atlas-everyday').getAttribute('aria-pressed'),'false');
    if(plan.id==='heat'){assert.equal(await p.locator('.leaflet-disaster-planning-pane .leaflet-image-layer').count(),1);assert((await p.locator('#atlas-layer-status').innerText()).includes('Forecast valid time'));}
    else if(plan.id==='coastal'){assert.equal(await p.locator('.leaflet-disaster-planning-pane .leaflet-image-layer').count(),1);assert((await p.locator('#atlas-layer-status').innerText()).includes('NOAA planning image'));}
    else if(plan.id!=='tsunami'){assert((await p.locator('.leaflet-disaster-planning-pane path').count())>0,plan.id);assert.equal(await p.locator('.leaflet-disaster-planning-pane .leaflet-image-layer').count(),0);}
    assert(await p.locator('#resource-atlas,.atlas-controls,#resource-map-panel').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollLeft===0)),plan.id+' must fit without sideways clipping');
   }
   await choose(p,'flood');assert.equal(new URL(p.url()).searchParams.get('hazard'),'flood');
   const style=await p.addStyleTag({content:'.resource-atlas *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await style.evaluate(el=>el.remove());
   assert(await p.locator('.atlas-controls button,.atlas-controls select,.disaster-guidance-link').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height>=44)));
   await p.locator('#atlas-disaster').focus();assert(await p.locator('#atlas-disaster').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));
   if(width===390){await p.emulateMedia({forcedColors:'active'});assert(await p.locator('#atlas-disaster').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));await p.emulateMedia({forcedColors:'none'});}
   await p.locator('#resource-atlas').screenshot({path:`screenshots/disaster-plan-flood-${width}.png`});
   // Actual export retains only public, permitted static geometry for this city.
   const wait=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const dl=await wait,file=path.resolve('screenshots','disaster-plans-'+width+'.html');await dl.saveAs(file);
   const source=fs.readFileSync(file,'utf8'),saved=JSON.parse(source.match(/<script type="application\/json" id="disaster-map-snapshot">(.*?)<\/script>/s)[1]);
   assert(saved.entries.some(e=>e.plan==='flood'));assert(saved.entries.every(e=>e.key==='57026'&&e.parts.every(part=>data.layers[part.id].offline&&!data.layers[part.id].live)));assert(!saved.entries.some(e=>['heat','cold','storms','drought','avalanche','earthquake'].includes(e.plan)));
   const off=await browser.newContext({offline:true,viewport:{width,height:960}}),f=await off.newPage(),network=[];f.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
   await f.goto(pathToFileURL(file).href);await ready(f);assert.equal(await f.locator('#atlas-disaster').inputValue(),'flood');assert((await f.locator('#atlas-layer-status').innerText()).includes('Saved planning overlay'));
   for(const plan of data.plans){await choose(f,plan.id);assert.equal(await f.locator('.disaster-steps li').count(),3);if(['heat','cold','storms','drought','avalanche','earthquake'].includes(plan.id))assert((await f.locator('#atlas-layer-status').innerText()).includes('not saved'));}
   await choose(f,'flood');await f.emulateMedia({media:'print'});assert(await f.locator('#atlas-action-plan').isVisible());assert(!await f.locator('#resource-map').isVisible());await f.emulateMedia({media:'screen'});
   assert.deepEqual(network,[]);await off.close();
   const noJS=await browser.newContext({offline:true,javaScriptEnabled:false}),n=await noJS.newPage();await n.goto(pathToFileURL(file).href);assert(await n.locator('#atlas-action-plan').isVisible());assert.equal(await n.locator('.disaster-steps li').count(),3);assert(!await n.locator('#resource-map').isVisible());await noJS.close();
   await p.locator('#atlas-everyday').click();assert.equal(await p.locator('.disaster-geometry').count(),0);assert.equal(await p.locator('.leaflet-image-layer').count(),0);assert.equal(await p.locator('.atlas-pin.support').count(),2);assert(!await p.locator('#atlas-action-plan').isVisible());assert(!new URL(p.url()).searchParams.has('hazard'));
   assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);findings.push({width,plans:15,exclusiveLayers:'passed',forecastValidity:'shown',offlinePlans:15,offlineHTTP:0,offlinePrint:'selected plan',noJavaScript:'selected plan readable',focus:'passed',textSpacing:'passed'});await c.close();
  }
  const c=await browser.newContext();await stubPublicMap(c);const p=await c.newPage();await p.goto(base+'/local/?place=57026');await ready(p);
  // Partial and failed sources must not be presented as no hazard.
  await p.route(url=>url.href.startsWith(data.layers['fire-lra'].service+'/query?'),r=>r.fulfill({status:503,body:'Unavailable'}));await choose(p,'wildfire');assert((await p.locator('#atlas-layer-status').innerText()).includes('Partial coverage'));assert((await p.locator('.disaster-fire-sra').count())>0);
  let failFlood=true;await p.route(url=>url.href.startsWith(data.layers.flood.service+'/query?'),r=>failFlood?r.fulfill({status:503,body:'Unavailable'}):r.fallback());await choose(p,'flood');assert((await p.locator('#atlas-layer-status').innerText()).includes('unavailable'));failFlood=false;await choose(p,'cold');await choose(p,'flood');assert((await p.locator('.disaster-flood').count())>0,'Selecting again must recover after a transient failure');
  // Pagination uses actual returned record counts; unrelated attributes are discarded.
  const offsets=[];await p.route(url=>url.href.startsWith(data.layers.flood.service+'/query?'),r=>{const offset=Number(new URL(r.request().url()).searchParams.get('resultOffset'));offsets.push(offset);return r.fulfill({contentType:'application/json',body:JSON.stringify({...collection(offset?[3]:[1,2],{Unused:'UNUSED-GIS-ATTRIBUTE-MUST-NOT-SAVE'}),exceededTransferLimit:!offset})});});
  await p.reload();await ready(p);await choose(p,'flood');assert.deepEqual(offsets,[0,2]);assert.equal(await p.locator('.disaster-flood').count(),3);
  // A delayed old response must not replace a newer plan.
  await p.goto(base+'/local/?place=57026');await ready(p);await p.route(url=>url.href.startsWith(data.layers.flood.service+'/query?'),async r=>{await new Promise(resolve=>setTimeout(resolve,350));try{await r.fulfill({contentType:'application/json',body:JSON.stringify(collection([1]))});}catch{}});
  await p.locator('#atlas-disaster').selectOption('flood');await choose(p,'heat');await p.waitForTimeout(500);assert.equal(await p.locator('.disaster-flood').count(),0);assert.equal(await p.locator('.leaflet-image-layer').count(),1);
  // Current weather rejects expired records, even when the server returns them.
  await p.route(url=>url.href.startsWith(data.layers['cold-alerts'].service+'/query?'),r=>r.fulfill({contentType:'application/json',body:JSON.stringify(collection([1],{expiration:Date.now()-3600000,prod_type:'Expired test alert'}))}));await choose(p,'cold');assert.equal(await p.locator('.disaster-cold-alerts').count(),0);assert((await p.locator('#atlas-layer-status').innerText()).includes('does not establish safe'));
  await p.goto(base+'/local/?place=57026');await ready(p);let coldRequests=0;
  await p.route(url=>url.href.startsWith(data.layers['cold-alerts'].service+'/query?'),r=>{coldRequests++;return r.fulfill({contentType:'application/json',body:JSON.stringify(collection([coldRequests],{expiration:Date.now()+(coldRequests===1?60000:3600000),prod_type:'Current test alert'}))});});
  await choose(p,'cold');await p.evaluate(()=>{const original=Date.now;Date.now=()=>original()+120000;});await p.locator('#atlas-everyday').click();await choose(p,'cold');assert.equal(coldRequests,2,'An expired cached alert must be queried again on selection');
  await c.close();
  const stale=await browser.newContext();await stubPublicMap(stale);const s=await stale.newPage();await s.route(url=>url.href.startsWith(data.layers.heat.service+'/query?'),r=>r.fulfill({contentType:'application/json',body:JSON.stringify({features:[{attributes:{objectid:1,idp_filedate:Date.now()-7*86400000,idp_validtime:Date.now()-6*86400000}}]})}));await s.goto(base+'/local/?place=57026&hazard=heat');await ready(s);assert((await s.locator('#atlas-layer-status').innerText()).includes('unavailable'));assert.equal(await s.locator('.leaflet-image-layer').count(),0);await stale.close();
  fs.writeFileSync('screenshots/disaster-plan-verification.json',JSON.stringify({fixtures:'Repeatable UI GIS responses; live provider checks recorded separately',findings,partialSources:'explicit',lateResponses:'ignored',pagination:'uses returned count',expiredAlerts:'excluded',staleHeatForecast:'not displayed'},null,2));console.log('Disaster plans: all 15 plans and exclusive GIS layers passed at four widths; real offline files, no-JS/print, partial sources, pagination, stale/late data passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
