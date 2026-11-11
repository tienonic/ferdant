// Fault imagery follows the viewport for every indexed place, without geometry queries.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs');
const {showEveryday,openMapControls,closeMapControls}=require('./story-helpers.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const data=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/<script type="application\/json" id="resource-map-data">(.*?)<\/script>/s)[1]).disasters;
const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8')),source=data.layers.faults;
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(x=>x.startsWith('chromium_headless_shell-')).sort().reverse().map(x=>path.join(root,x,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r.hidden&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});await showEveryday(p);await openMapControls(p);}
async function tiles(p){await p.waitForFunction(()=>{const imgs=[...document.querySelectorAll('.disaster-faults img')];return imgs.length>0&&imgs.every(i=>i.complete);});}
async function choose(p,id){await p.locator('[data-disaster="'+id+'"]').click();await ready(p);}
const tileRequests=url=>url.startsWith(source.service+'/tile/');
(async()=>{
 assert.equal(source.kind,'tiles');assert.equal(source.offline,false);assert.equal(source.maxNativeZoom,13);
 assert.deepEqual(data.plans.filter(p=>p.layers.includes('faults')).map(p=>p.id),['earthquake']);
 const browser=await chromium.launch({executablePath:executable()});
 try{
  const c=await browser.newContext({viewport:{width:390,height:900}});await stubPublicMap(c);
  const p=await c.newPage(),requests=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(r.url().startsWith(source.service))requests.push(r.url());});
  await p.goto(base+'/local/?place=01060');await ready(p);assert.equal(requests.length,0,'No fault requests in everyday view');
  await choose(p,'earthquake');await tiles(p);assert(requests.length>0&&requests.length<=20);
  assert.equal(await p.locator('.disaster-faults').count(),1);assert.equal(await p.locator('path.disaster-faults,.disaster-faults.leaflet-image-layer').count(),0);
  assert(!await p.locator('.atlas-legend-disclosure').evaluate(el=>el.open));await p.locator('.atlas-legend-disclosure > summary').click();
  const key=await p.locator('#atlas-hazard-legend').innerText();
  assert(key.includes('Moved within about 12,000 years'));assert(!/Holocene|Quaternary/.test(key));
  assert(await p.locator('#atlas-fault-help').isVisible());assert.equal(await p.locator('#atlas-fault-help').evaluate(el=>el.open),false);
  await p.locator('#atlas-fault-help > summary').focus();await p.keyboard.press('Enter');
  assert(await p.locator('#atlas-fault-help').evaluate(el=>el.open));
  assert((await p.locator('#atlas-fault-help').innerText()).includes('secure heavy furniture'));
  await p.locator('#atlas-fault-help > details > summary').click();assert((await p.locator('#atlas-fault-help').innerText()).includes('Holocene'));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Expanded key fits mobile');
  await closeMapControls(p);await p.locator('#resource-map').scrollIntoViewIfNeeded();
  const first=new Set(requests),box=await p.locator('#resource-map').boundingBox();
  const moved=p.waitForRequest(r=>tileRequests(r.url())&&!first.has(r.url()),{timeout:5000});
  for(let i=0;i<3;i++){await p.mouse.move(box.x+box.width*.85,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.15,box.y+box.height*.5,{steps:6});await p.mouse.up();}
  await moved;await tiles(p);assert(requests.some(url=>!first.has(url)),'Panning beyond the initial city must fetch surrounding fault tiles');
  assert(await p.locator('.disaster-faults img').count()<=30,'Old off-screen tiles are pruned');
  for(let i=0;i<8;i++)await p.locator('#resource-map .leaflet-control-zoom-in').click({force:true});
  await tiles(p);assert(requests.every(url=>Number(url.split('/tile/')[1].split('/')[0])<=13),'Overzoom must reuse the highest published tile level');
  await openMapControls(p);await choose(p,'flood');assert.equal(await p.locator('.disaster-faults').count(),0);assert(await p.locator('#atlas-fault-help').isHidden());
  const stopped=requests.length;await p.locator('#resource-map .leaflet-control-zoom-out').click();await p.waitForTimeout(100);assert.equal(requests.length,stopped,'No fault requests after leaving Earthquake');
  await choose(p,'earthquake');await tiles(p);
  const keys=[...places.cities.map(row=>row[0]),...Object.keys(places.counties).map(k=>'county:'+k)];
  for(let i=0;i<keys.length;i++){
   await p.locator('#phone-city').selectOption(keys[i],{force:true});await ready(p);await tiles(p);
   assert.equal(await p.locator('.disaster-faults').count(),1,keys[i]);
   assert.equal(await p.locator('[data-disaster="earthquake"]').getAttribute('aria-pressed'),'true');
   assert(await p.locator('.disaster-faults img').count()<=30,keys[i]+' tile count');
   if((i+1)%100===0)console.log('Fault selector coverage:',i+1,'/',keys.length);
  }
  assert(requests.every(tileRequests),'Faults use cached image tiles only: no geometry, export or metadata calls');
  assert.deepEqual(errors,[]);await c.close();
  const fctx=await browser.newContext();await stubPublicMap(fctx);const f=await fctx.newPage();let fail=true;
  await f.route(url=>tileRequests(url.href),r=>fail?r.fulfill({status:503,body:'Unavailable'}):r.fallback());
  await f.goto(base+'/local/?place=01060&hazard=earthquake');await ready(f);await tiles(f);
  await f.waitForFunction(()=>document.querySelector('#atlas-layer-status').textContent.includes('could not load'));
  assert(await f.locator('.disaster-liquefaction').count()>0,'Failed fault tiles do not hide other layers');
  fail=false;await choose(f,'earthquake');await tiles(f);
  await f.waitForFunction(()=>!document.querySelector('#atlas-layer-status').textContent.includes('could not load'));
  await f.route(url=>tileRequests(url.href),async r=>{await new Promise(resolve=>setTimeout(resolve,300));try{await r.fulfill({status:503,body:'Late failure'});}catch{}});
  await choose(f,'earthquake');await choose(f,'flood');await f.waitForTimeout(400);
  assert.equal(await f.locator('.disaster-faults').count(),0);assert(!(await f.locator('#atlas-layer-status').innerText()).includes('fault tiles'),'Late tile errors cannot overwrite the next plan');
  await fctx.close();
  fs.writeFileSync('screenshots/fault-lines-verification.json',JSON.stringify({places:keys.length,fixtureBased:true,allPlaces:'passed',viewportFollowing:'passed',nativeZoomLimit:13,geometryRequests:0,lazyLoading:'passed',tilePruning:'passed',failureRecovery:'passed',lateErrors:'ignored'},null,2));
  console.log('Fault tiles: all '+keys.length+' city/county choices, viewport coverage, bounded tiles, native zoom, lazy loading, failure recovery and late errors passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
