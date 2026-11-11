const {showEveryday,openMapControls}=require('./story-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs'),{mappedIds}=require('./map-inventory.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173',data=JSON.parse(fs.readFileSync('content/california-zip-areas.json','utf8'));
const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64/chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const root=document.querySelector('#resource-atlas');return root&&!root.hidden&&!root.hasAttribute('aria-busy')&&root.dataset.hazardLoading!=='true';});await showEveryday(p);await openMapControls(p);}
(async()=>{
 assert.equal(Object.keys(data.areas).length,1808);
 for(const [zip,[lat,lng,county,counties]]of Object.entries(data.areas)){assert(/^\d{5}$/.test(zip));assert(Number.isFinite(lat)&&Number.isFinite(lng));assert.equal(county,counties[0]);assert(counties.every(c=>places.counties[c]));}
 assert.equal(data.areas['95616'][2],'57');assert.equal(data.areas['90012'][2],'19');assert(!data.areas['10001']);assert(!data.areas['00000']);
 const browser=await chromium.launch({executablePath:executable()}),errors=[],findings=[];fs.mkdirSync('screenshots/zip',{recursive:true});
 try{
  const c=await browser.newContext({viewport:{width:390,height:1000},acceptDownloads:true});await stubPublicMap(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.stack));
  await p.goto(base+'/');const input=p.getByRole('combobox',{name:'City, county or ZIP code'});await input.fill('95616');await input.press('ArrowDown');await input.press('Enter');await p.waitForURL('**/local/?place=county%3A57&zip=95616');await ready(p);
  assert((await p.locator('h1').innerText()).includes('ZIP 95616'));assert.equal(await p.locator('[data-location-kind="zip"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#resource-atlas').getAttribute('data-zip'),'95616');assert((await p.locator('#atlas-map-status').innerText()).includes('5 km'));
  assert.equal(await p.locator('#phone-city').inputValue(),'county:57');assert((await p.locator('#story-place-note').innerText()).includes('PDF booklet cover Yolo County'));
  const inventories={};for(const code of ['95616','95618','90012','90045','94103','96150']){
   await p.goto(base+'/local/?zip='+code);await ready(p);assert.equal(await p.locator('#resource-atlas').getAttribute('data-zip'),code);const ids=(await mappedIds(p)).sort();assert(ids.length>0,code);inventories[code]=ids;findings.push({zip:code,mapped:ids.length});
   await p.locator('.atlas-category-summary').first().click();await p.locator('.atlas-place-card').first().waitFor({state:'visible'});const labels=await p.locator('#atlas-place-list').textContent();assert(/km.*area center/.test(labels),code+': '+labels.slice(0,1000));assert.equal((await p.evaluate(()=>FerdantZIP.current)).code,code);
  }
  assert.notDeepEqual(inventories['90012'],inventories['90045'],'Different ZIP areas in LA must change resources, not just the heading');assert.notDeepEqual(inventories['95616'],inventories['95618']);
  // ZIP+4 uses the five-digit area; invalid/out-of-state entries do not navigate.
  await p.goto(base+'/');await p.locator('[data-location-kind="zip"]').click();await input.fill('10001');await p.getByRole('button',{name:'Search',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/');assert((await p.locator('#city-search-status').innerText()).includes('mapped ZIP'));
  await input.fill('95616-1234');await input.press('Enter');await p.waitForURL('**zip=95616');await ready(p);
  // Cached hazard data belongs to the ZIP focus, not another ZIP in its county.
  await p.locator('[data-disaster="flood"]').click();await ready(p);
  const online=(await mappedIds(p)).sort();const wait=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const download=await wait;assert(download.suggestedFilename().includes('zip-95616'));const file=path.resolve('screenshots/zip/95616-offline.html');await download.saveAs(file);
  const text=fs.readFileSync(file,'utf8');
  const snapshots=id=>JSON.parse(text.match(new RegExp('id="'+id+'">(.*?)</script>','s'))[1]);
  assert.deepEqual(Object.keys(snapshots('service-map-snapshot').counties).sort(),['48','57']);assert.deepEqual(Object.keys(snapshots('visit-facts-snapshot').counties).sort(),['48','57']);assert(snapshots('disaster-map-snapshot').entries.every(e=>e.key==='zip:95616'));
  const off=await browser.newContext({offline:true,viewport:{width:390,height:1000}}),o=await off.newPage(),requests=[];o.on('pageerror',e=>errors.push(e.stack));o.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await o.goto(pathToFileURL(file).href);await ready(o);assert.equal(await o.locator('#resource-atlas').getAttribute('data-zip'),'95616');assert.deepEqual((await mappedIds(o)).sort(),online);
  await o.locator('#atlas-everyday').click();assert.deepEqual((await mappedIds(o)).sort(),inventories['95616']);
  // Another ZIP within saved counties can be searched offline; its flood overlay
  // must remain unavailable rather than inheriting the first ZIP's snapshot.
  const search=o.getByRole('combobox',{name:'City, county or ZIP code'});await o.locator('.change-location > summary').click();await search.fill('95618');await search.press('Enter');await ready(o);assert.equal(await o.locator('#resource-atlas').getAttribute('data-zip'),'95618');await o.locator('[data-disaster="flood"]').click();await ready(o);assert.equal(await o.locator('.disaster-flood').count(),0);assert((await o.locator('#atlas-layer-status').innerText()).includes('not saved'));
  assert.deepEqual(requests,[]);await off.close();
  for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:1000});await p.goto(base+'/local/?zip=90012');await ready(p);await p.locator('.change-location > summary').click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('[data-location-kind="zip"]').evaluate(e=>e.getBoundingClientRect().height>=44));await p.locator('#resource-atlas').screenshot({path:'screenshots/zip/map-'+width+'.png'});}
  // City selection clears ZIP focus and the URL; county PDFs keep county scope.
  const model=await p.evaluate(()=>FerdantBooklet.model(document.querySelector('#phone-city').value));assert.equal(model.place.key,'county:19');assert.equal(model.place.city,false);
  await p.locator('#phone-city').selectOption('57026',{force:true});await ready(p);assert.equal(await p.evaluate(()=>FerdantZIP.current),null);assert.equal(await p.locator('#resource-atlas').getAttribute('data-zip'),'');assert(!new URL(p.url()).searchParams.has('zip'));
  await p.goto(base+'/local/?zip=00000');assert((await p.locator('#local-page-intro').innerText()).includes('not in the saved California ZIP-area index'));assert(await p.locator('#resource-atlas').isHidden());
  assert(await p.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));assert.deepEqual(errors,[]);await c.close();
  fs.writeFileSync('screenshots/zip/verification.json',JSON.stringify({areas:1808,findings,widths:[320,390,768,1440],ZIP4:true,offlineCounties:['48','57'],offlineHTTP:0,distinctZIPResources:true,hazardIsolation:true,countyBookletScope:true,errors},null,2));console.log('ZIP lookup passed: 1,808 areas, keyboard/ZIP+4, six distinct local views, cross-county offline parity, hazard isolation, county PDF scope and four widths.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
