const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const registry=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/id="resource-map-data">(.*?)<\/script>/s)[1]).disasters;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const feature={type:'FeatureCollection',features:[{type:'Feature',properties:{OBJECTID:1},geometry:{type:'Polygon',coordinates:[[[-121.76,38.54],[-121.73,38.54],[-121.73,38.56],[-121.76,38.56],[-121.76,38.54]]]}}]};
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64/chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r.hidden&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});}
async function delayed(route,ms,data){await new Promise(r=>setTimeout(r,ms));try{await route.fulfill(data);}catch{}}
(async()=>{
 const browser=await chromium.launch({executablePath:executable()}),results=[],errors=[];fs.mkdirSync('screenshots/layer-performance',{recursive:true});
 try{
  async function progressive(width,before=false){
   const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await stubPublicMap(c);
   if(before)for(const name of ['disaster-layers.js','resource-map.js'])await c.route('**/'+name,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(process.env.LAYER_BASELINE_DIR,name))}));
   let queries=0;
   await c.route(u=>['liquefaction','seismic-landslide'].some(id=>u.href.startsWith(registry.layers[id].service+'/query?')),r=>{queries++;return delayed(r,1600,{json:feature});});
   await c.route(u=>u.href.startsWith(registry.layers.faults.service+'/tile/'),r=>delayed(r,100,{contentType:'image/png',body:png}));
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.stack||e.message));await p.goto(base+'/local/?place=57026');await ready(p);
   const start=Date.now();await p.locator('[data-disaster="earthquake"]').click();await p.waitForSelector('.disaster-faults .leaflet-tile-loaded');const firstPaintMs=Date.now()-start;
   if(!before){assert(firstPaintMs<1100,'Fault imagery must appear before the 1.6-second investigation query');assert.equal(await p.locator('#resource-atlas').getAttribute('data-hazard-loading'),'true');await p.locator('.atlas-layer-loading').waitFor({state:'visible'});assert(await p.locator('.atlas-layer-loading').evaluate(e=>e.classList.contains('has-map-data')));assert.equal(await p.locator('#resource-map').getAttribute('aria-busy'),'true');assert.equal(await p.locator('.atlas-loading-spinner').evaluate(e=>getComputedStyle(e).animationName),'none');await p.locator('.atlas-map-frame').screenshot({path:'screenshots/layer-performance/partial-'+width+'.png'});}
   await ready(p);const completeMs=Date.now()-start;assert.equal(queries,2);
   const again=Date.now();await p.locator('[data-disaster="landslide"]').click();await ready(p);const sharedSourceMs=Date.now()-again;
   if(!before){assert.equal(queries,2,'The shared source must not be fetched again for Landslide');assert(!(await p.locator('.atlas-layer-loading').isVisible()));assert.equal(await p.locator('#resource-map').getAttribute('aria-busy'),'false');}
   const repeated=Date.now();await p.locator('[data-disaster="earthquake"]').click();await ready(p);const repeatMs=Date.now()-repeated;
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({version:before?'before':'after',width,firstPaintMs,completeMs,sharedSourceMs,repeatMs,queries});await c.close();
  }
  if(process.env.LAYER_BASELINE_DIR)await progressive(390,true);
  await progressive(390);await progressive(1440);
  const c=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});await stubPublicMap(c);let floodRequests=0;
  await c.route(u=>u.href.startsWith(registry.layers.flood.service+'/query?'),r=>{floodRequests++;return delayed(r,1000,{json:feature});});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.stack||e.message));await p.goto(base+'/local/?place=57026');await ready(p);
  await p.locator('[data-disaster="flood"]').click();await p.locator('.atlas-layer-loading').waitFor({state:'visible'});assert((await p.locator('.atlas-layer-loading').innerText()).includes('Loading Flood map'));assert.equal(await p.locator('.atlas-layer-loading').evaluate(e=>getComputedStyle(e).pointerEvents),'none');await p.locator('.atlas-map-frame').screenshot({path:'screenshots/layer-performance/loading-390.png'});
  await p.locator('#atlas-everyday').click();assert(!(await p.locator('.atlas-layer-loading').isVisible()));await p.waitForTimeout(1150);assert.equal(await p.locator('.disaster-flood').count(),0);assert.equal(await p.locator('#resource-atlas').getAttribute('data-hazard-loading'),'false');
  await p.locator('[data-disaster="flood"]').click();await ready(p);assert.equal(floodRequests,2,'Cancelled results must not be reused');assert.equal(await p.locator('.disaster-flood').count(),1);assert(!(await p.locator('.atlas-layer-loading').isVisible()));
  // A failed source must end the loading screen and remain retryable.
  await c.route(u=>u.href.startsWith(registry.layers.volcano.service+'/query?'),r=>delayed(r,300,{status:503,body:'Unavailable'}));await p.locator('[data-disaster="volcano"]').click();await ready(p);assert((await p.locator('#atlas-layer-status').innerText()).includes('unavailable'));assert(!(await p.locator('.atlas-layer-loading').isVisible()));await c.close();
  // Tile loading continues after metadata; failures cannot leave a permanent screen.
  const tiles=await browser.newContext();await stubPublicMap(tiles);await tiles.route(u=>u.href.startsWith(registry.layers.faults.service+'/tile/'),r=>delayed(r,800,{status:503,body:'Unavailable'}));const t=await tiles.newPage();t.on('pageerror',e=>errors.push(e.message));await t.goto(base+'/local/?place=57026');await ready(t);await t.locator('[data-disaster="earthquake"]').click();await t.locator('.atlas-layer-loading').waitFor({state:'visible'});assert.equal(await t.locator('#resource-atlas').getAttribute('data-hazard-loading'),'true');await ready(t);assert((await t.locator('#atlas-layer-status').innerText()).includes('fault tiles could not load'));assert(!(await t.locator('.atlas-layer-loading').isVisible()));await tiles.close();
  // Reusing an alert in another plan must not renew its original five-minute age.
  const live=await browser.newContext();await stubPublicMap(live);let alerts=0;await live.route(u=>u.href.startsWith(registry.layers['cold-alerts'].service+'/query?'),r=>{alerts++;return r.fulfill({json:{...feature,features:feature.features.map(f=>({...f,properties:{OBJECTID:1,expiration:Date.now()+3600000,issuance:Date.now(),prod_type:'Test'}}))}});});
  const l=await live.newPage();await l.goto(base+'/local/?place=57026');await ready(l);
  await l.evaluate(async()=>{const api=FerdantDisasters,bounds=[-121.8,38.5,-121.6,38.7],signal=new AbortController().signal;window.testNow=Date.now;window.testOffset=0;Date.now=()=>testNow()+testOffset;api.plans.get('storms').layers=['cold-alerts'];await api.load('cold','57026',bounds,signal);testOffset=240000;await api.load('storms','57026',bounds,signal);});assert.equal(alerts,1);
  await l.evaluate(async()=>{testOffset=360000;await FerdantDisasters.load('storms','57026',[-121.8,38.5,-121.6,38.7],new AbortController().signal);});assert.equal(alerts,2);
  await l.evaluate(async()=>{await FerdantDisasters.load('storms','57026',[-122,38.5,-121.6,38.7],new AbortController().signal);});assert.equal(alerts,3,'Different map bounds need a new query');await live.close();
  assert.deepEqual(errors,[]);fs.writeFileSync('screenshots/layer-performance/verification.json',JSON.stringify({fixture:'Same 1.6-second GIS responses and 100ms tiles; not live-provider timing',results,progressiveDisplay:true,sourceReuse:true,cancellation:true,tileFailure:true,liveCacheExpiry:true,boundsIsolation:true,reducedMotion:true,errors},null,2));console.log(JSON.stringify(results));console.log('Layer loading passed: progressive paint, shared-source reuse, real tile completion, cancellation, failure, live expiry, bounds and mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
