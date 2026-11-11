const {showEveryday,openMapControls}=require('./story-helpers.cjs');
const {mappedIds,mappedCount}=require('./map-inventory.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const manifest=JSON.parse(fs.readFileSync('content/everyday-service-manifest.json','utf8'));
const config=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/id="resource-map-data">(.*?)<\/script>/s)[1]);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function browserPath(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r.hidden&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});await showEveryday(p);await openMapControls(p);}
async function water(p){await p.locator('#atlas-resource-filters summary').click();await p.locator('[data-resource-group="water"]').click();}
(async()=>{
 const ids=new Set(),counts={},osm=[];
 for(const [county,ref] of Object.entries(manifest.counties)){
  const raw=fs.readFileSync('.'+ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
  const data=JSON.parse(raw);assert.equal(data.records.length,ref.count);assert.equal(data.county,county);
  for(const row of data.records){
   const f=Object.fromEntries(manifest.fields.map((key,i)=>[key,row[i]]));assert(!ids.has(f.id));ids.add(f.id);
   assert.equal(f.county,county);assert(manifest.sources[f.source]);assert(f.detail&&f.visit.eligibility&&f.visit.activation);assert(Number.isFinite(f.lat)&&Number.isFinite(f.lng));
   assert.equal(config.serviceTypes[f.kind].group,f.kind==='food'?'food':'water');assert(config.serviceTypes[f.kind].icon.includes('data-icon="resource-'+f.kind+'"'));
   assert(!/"(?:phone|email|user|uid|changeset)":/.test(JSON.stringify(f)));counts[f.kind]=(counts[f.kind]||0)+1;
   if(f.source==='osm-basic-needs'){osm.push(row);assert(f.detail.includes('Community-mapped'));assert(f.url.startsWith('https://www.openstreetmap.org/'));}
   if(f.source==='la-food-distribution'){assert.equal(county,'19');assert(f.detail.includes('May 2023'));assert(!/\b(college|university|student|school|warehouse)\b/i.test(f.name));}
   if(f.source==='sf-basic-needs')assert.equal(county,'38');
  }
 }
 assert.equal(ids.size,3932);assert.deepEqual(counts,manifest.byKind);assert.equal(Object.values(manifest.counties).filter(x=>x.count>0).length,55);
 const projection=fs.readFileSync('.'+manifest.osmProjection.path);assert.equal(hash(projection),manifest.osmProjection.sha256);assert.equal(JSON.parse(projection).records.length,osm.length);
 for(const plan of Object.values(config.resourcePlans))for(const view of plan.views)assert(!view.kinds.some(k=>['water','restroom','shower'].includes(k)),'Routine water/hygiene must not imply emergency supplies');
 // Tampered source files must be rejected, not silently shown or saved.
 const box={window:{},document:{querySelector:s=>s==='#resource-map-data'?{textContent:JSON.stringify(config)}:null},location:{protocol:'https:'},TextEncoder,URL,AbortController,setTimeout,clearTimeout,crypto:crypto.webcrypto,fetch:async url=>({ok:true,text:async()=>fs.readFileSync('.'+url,'utf8')+(url.includes('everyday-maps')?' ':'')})};
 vm.runInNewContext(fs.readFileSync('service-resources.js','utf8'),box);await assert.rejects(box.window.FerdantServices.load('38'),/hash mismatch/);
 fs.mkdirSync('screenshots/everyday',{recursive:true});const browser=await chromium.launch({executablePath:browserPath()});
 try{
  const c=await browser.newContext({viewport:{width:390,height:960},acceptDownloads:true});await stubPublicMap(c);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,768,1440]){
   await p.setViewportSize({width,height:960});await p.goto(base+'/local/?place=38001');await ready(p);await water(p);
   const pins=p.locator('.atlas-pin');assert((await mappedIds(p)).length>0);assert.equal(await p.locator('.atlas-pin svg[data-icon="resource-water"],.atlas-pin svg[data-icon="resource-restroom"],.atlas-pin svg[data-icon="resource-shower"]').count(),await pins.count());
   assert(await mappedCount(p,'water')>0);assert(await mappedCount(p,'restroom')>0);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await p.locator('.leaflet-control-attribution').innerText().then(t=>t.includes('©')&&t.includes('OpenStreetMap')&&!t.includes('Leaflet')));
   await p.getByRole('button',{name:'Sources',exact:true}).click();assert(await p.locator('#atlas-sources').evaluate(el=>el.open));assert((await p.locator('#atlas-sources').innerText()).includes('ODbL'));
   await p.locator('#atlas-panel-notes > summary').click();await p.locator('#atlas-search-more').click();assert(await p.locator('#resource-search-water').evaluate(e=>e.open));
   await p.locator('#resource-atlas').screenshot({path:'screenshots/everyday/sf-water-'+width+'.png'});
  }
  await p.goto(base+'/local/?place=19050');await ready(p);await p.locator('#atlas-resource-filters summary').click();await p.locator('[data-resource-group="food"]').click();assert(await mappedCount(p,'food')>0);
  await p.locator('.atlas-category-summary').first().click();await p.locator('.atlas-category[open] .atlas-place-summary').first().click();assert((await p.locator('#atlas-place-list').innerText()).includes('May 2023'));
  await p.goto(base+'/local/?place=38001');await ready(p);await water(p);const online=(await mappedIds(p)).sort();
  const download=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const file=path.resolve('screenshots/everyday/sf-offline.html');await(await download).saveAs(file);
  const off=await browser.newContext({offline:true}),o=await off.newPage(),network=[];o.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});o.on('pageerror',e=>errors.push(e.message));await o.goto(pathToFileURL(file).href);await ready(o);await water(o);
  assert.deepEqual((await mappedIds(o)).sort(),online);assert.deepEqual(network,[]);
  await o.locator('[data-disaster="cold"]').click();await ready(o);assert.equal(await o.locator('.atlas-pin.water,.atlas-pin.restroom,.atlas-pin.shower').count(),0);
  assert.deepEqual(errors,[]);await off.close();await c.close();
 }finally{await browser.close();}
 console.log('Everyday: 3,932 attributed points, 55 counties, matching icons at four widths, dated food listings, hash rejection, offline parity and emergency separation passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
