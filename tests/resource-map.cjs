const {mappedIds,mappedCount}=require('./map-inventory.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {stubPublicMap,isPublicMapRequest}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
function browserPath(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return undefined;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function settled(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return r&&!r.hidden&&!r.hasAttribute('aria-busy')&&document.querySelector('#resource-map').dataset.ready==='true';});}
const fixture={type:'FeatureCollection',features:[
 {type:'Feature',geometry:{type:'Point',coordinates:[-121.75,38.55]},properties:{shelter_id:1,shelter_name:'<img src=x onerror="window.INJECTED=true"> Test shelter',address_1:'100 Test Street',city:'Davis',shelter_status_code:'OPEN',reporting_period:1793650000000,incident_name:'Test incident'}},
 {type:'Feature',geometry:{type:'Point',coordinates:[-121.75,38.55]},properties:{shelter_id:2,shelter_name:'Closed shelter must not appear',shelter_status_code:'CLOSED'}},
 {type:'Feature',geometry:null,properties:{shelter_id:3,shelter_name:'Unmapped shelter',shelter_status_code:'OPEN'}}
]};
(async()=>{
 const config=JSON.parse(fs.readFileSync('content/resource-map.json','utf8')),manifest=JSON.parse(fs.readFileSync('content/map-data-manifest.json','utf8')),places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
 assert.equal(config.facilities.filter(f=>f.kind==='hospital').length,332);assert.equal(config.facilities.filter(f=>f.kind==='food').length,28);assert.equal(new Set(config.facilities.map(f=>f.id)).size,config.facilities.length);
 assert(!/Director|org_poc|org_email|LICENSE_NUM/.test(JSON.stringify(config)),'Only the selected public projection is published');
 const mapped=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/<script type="application\/json" id="resource-map-data">(.*?)<\/script>/s)[1]);assert.equal(mapped.facilities.length,338);assert(!mapped.facilities.some(f=>f.id.startsWith('food-')));
 const ids=[];let hazardCount=0,buildingCount=0;
 for(const [county,item]of Object.entries(manifest.files)){
  const bytes=fs.readFileSync('assets/data/city-maps/'+county+'.json');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.equal(bytes.length,item.bytes);
  const area=JSON.parse(bytes);assert.equal(area.county,county);assert.equal(area.checked,config.checked);ids.push(...Object.keys(area.cities));hazardCount+=area.tsunami.length;buildingCount+=Object.keys(area.buildings||{}).length;
 }
 assert.deepEqual(ids.sort(),places.cities.map(c=>c[0]).sort());assert.equal(hazardCount,20);assert.equal(buildingCount,277);
 const browser=await chromium.launch({executablePath:browserPath()});const findings=[];
 try{
  for(const width of [320,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:960},acceptDownloads:true,reducedMotion:'reduce'});await stubPublicMap(context);
   const page=await context.newPage(),errors=[],unexpected=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin&&!isPublicMapRequest(r.url()))unexpected.push(r.url());});
   await page.route('https://gis.fema.gov/**',route=>{const u=new URL(route.request().url());assert.equal(u.searchParams.get('where'),"state='CA' AND shelter_status_code='OPEN'");assert.equal(u.searchParams.get('geometryType'),'esriGeometryEnvelope');return route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)});});
   await page.goto(base+'/local/?place=57026');await settled(page);
   assert.equal(await mappedCount(page,'support'),1);assert.equal(await mappedCount(page,'hospital'),1);assert.equal(await page.locator('#atlas-everyday').getAttribute('aria-pressed'),'true');
   await page.locator('#atlas-place-list > li > details > summary').first().click();await page.locator('#resource-map .leaflet-popup').waitFor({state:'visible'});assert(await page.locator('#resource-map .leaflet-popup').isVisible());assert.equal(await page.locator('#atlas-place-list li.is-selected').count(),1);
   await page.locator('#atlas-place-list li[data-resource-id="cdph-106574010"] > details > summary').click();await page.waitForFunction(()=>document.querySelector('#atlas-map-status').textContent.includes('Estimated building outline'));assert((await page.locator('#atlas-map-status').innerText()).includes('Estimated building outline'));assert((await page.locator('#resource-map path').count())>1);
   await page.locator('#atlas-reset').click();assert.equal(await page.locator('#resource-map .leaflet-popup').count(),0);
   await page.locator('[data-disaster="earthquake"]').focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('#atlas-feed-status').textContent.includes('listed open shelter(s)'));
   assert.equal(await page.locator('.atlas-pin.support, .atlas-pin.food').count(),0,'Everyday pins are replaced');assert.equal(await page.locator('.atlas-pin.shelter').count(),1);assert.equal(await page.locator('#atlas-place-list a[href*="redcross.org"]').count(),1);
   assert.equal(await page.locator('#resource-atlas img[src=x]').count(),0);assert.equal(await page.evaluate(()=>Boolean(window.INJECTED)),false);assert((await page.locator('#atlas-feed-status').textContent()).includes('1 location(s) could not be mapped'));
   await page.locator('[data-disaster="tsunami"]').click();assert((await page.locator('.atlas-pin.hospital,.atlas-pin.clinic').count())>0,'Tsunami view includes labelled post-evacuation medical directory points');assert((await page.locator('#atlas-layer-status').innerText()).includes('No tsunami polygons'));
   await page.locator('#phone-city').selectOption('38001',{force:true});await settled(page);assert((await page.locator('#atlas-layer-status').innerText()).includes('CGS saved tsunami'));assert((await page.locator('.atlas-pin.hospital,.atlas-pin.clinic').count())>0,'Tsunami view includes labelled post-evacuation medical directory points');assert((await page.locator('#resource-map path').count())>1);
   const textSpacing=await page.addStyleTag({content:'.resource-atlas * {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await textSpacing.evaluate(el=>el.remove());
   const targets=await page.locator('.atlas-controls button, #atlas-reset, .atlas-offline-link').evaluateAll(elements=>elements.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));assert(targets.every(r=>r.h>=44&&r.w>=44));
   assert(await page.locator('#resource-atlas,.atlas-controls,#resource-map-panel').evaluateAll(elements=>elements.every(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollLeft===0)),'Map choices and frame must not clip or scroll sideways');
   if(width===390){await page.emulateMedia({forcedColors:'active'});await page.locator('[data-disaster="flood"]').focus();assert(await page.locator('[data-disaster="flood"]').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));await page.emulateMedia({forcedColors:'none'});}
   await page.locator('#resource-atlas').screenshot({path:`screenshots/resource-map-tsunami-${width}.png`});
   await page.locator('#atlas-everyday').click();assert(((await mappedIds(page)).length)>0);assert.equal(await page.locator('#atlas-everyday').getAttribute('aria-pressed'),'true');
   // Real generated HTML, with the selected county geometry and no live feed or tiles.
   const waiting=page.waitForEvent('download');await page.locator('#offline-download [data-city-download]').click();const file=await waiting;
   const saved=path.resolve('screenshots','resource-map-offline-'+width+'.html');await file.saveAs(saved);const source=fs.readFileSync(saved,'utf8');assert(!source.includes('Test shelter'),'Live shelter status must not be frozen into an offline copy');
   const off=await browser.newContext({offline:true,viewport:{width,height:960}}),p=await off.newPage(),network=[];p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
   await p.goto(pathToFileURL(saved).href);await settled(p);assert((await p.locator('#atlas-map-status').innerText()).includes('Saved outline'));await p.locator('[data-disaster="tsunami"]').click();assert((await p.locator('#atlas-layer-status').innerText()).includes('CGS saved tsunami'));assert((await p.locator('#resource-map path').count())>1);await p.locator('[data-disaster="earthquake"]').click();assert((await p.locator('#atlas-feed-status').textContent()).includes('not live'));assert.deepEqual(network,[]);await off.close();
   assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert(await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));findings.push({width,layers:'replaced',keyboard:'passed',untrustedFeedText:'escaped',offlineHazardGeometry:'passed',offlineHTTP:0,textSpacing:'passed',targets:'44px minimum'});await context.close();
  }
  const context=await browser.newContext();await stubPublicMap(context);const p=await context.newPage();await p.goto(base+'/local/?place=57026');await settled(p);
  await p.route('https://gis.fema.gov/**',route=>route.fulfill({status:503,body:'Unavailable'}));await p.locator('[data-disaster="earthquake"]').click();await p.waitForFunction(()=>document.querySelector('#atlas-feed-status').textContent.includes('unavailable'));assert.equal(await p.locator('.atlas-pin.shelter').count(),0);
  await p.route('https://gis.fema.gov/**',async route=>{await new Promise(r=>setTimeout(r,400));try{await route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)});}catch{}});await p.locator('#atlas-everyday').click();await p.locator('[data-disaster="earthquake"]').click();await p.locator('#atlas-everyday').click();await p.waitForTimeout(650);assert.equal(await p.locator('.atlas-pin.shelter').count(),0,'A late request cannot replace the new layer');assert.equal(await mappedCount(p,'support'),1);
  await p.route('**/assets/data/city-maps/38.json',route=>route.fulfill({status:503,body:'Unavailable'}));await p.locator('#phone-city').selectOption('38001',{force:true});await settled(p);assert((await p.locator('#atlas-map-status').innerText()).includes('Area data unavailable'));await p.locator('[data-disaster="tsunami"]').click();assert((await p.locator('#atlas-layer-status').innerText()).includes('not saved or available'));await context.close();
  const failed=await browser.newContext();await stubPublicMap(failed);const f=await failed.newPage();await f.route('**/assets/vendor/leaflet/leaflet.js',route=>route.fulfill({status:503,body:'Unavailable'}));await f.goto(base+'/local/?place=57026');await f.waitForFunction(()=>document.querySelector('#atlas-map-status').textContent.includes('could not load'));assert((await f.locator('#atlas-place-list > li > details > summary').count())>0);await failed.close();
  fs.writeFileSync('screenshots/resource-map-verification.json',JSON.stringify({historicalFacilityInput:config.facilities.length,baseFacilities:mapped.facilities.length,statewideAdditionalPoints:mapped.serviceDirectory.count,totalStaticPoints:mapped.facilities.length+mapped.serviceDirectory.count,cityBoundaries:ids.length,countyShards:58,hazardCount,fixtures:'UI feed responses simulated; live-source checks reported separately',findings,failedFeed:'explicit unknown',staleFeed:'ignored',failedGeometry:'explicit fallback',failedLeaflet:'readable resource list'},null,2));console.log('Resource maps: 483 city boundaries, 3,502 static physical directory points, 20 hazard areas; four widths, layer replacement, keyboard, offline, feed safety and failures passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
