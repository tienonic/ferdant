const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
async function ready(p){await p.waitForFunction(()=>document.querySelector('#resource-map')?.dataset.ready==='true'&&!document.querySelector('#resource-atlas').hasAttribute('aria-busy'));}
async function credits(p){
 const credit=p.locator('#resource-map .leaflet-control-attribution');
 assert((await credit.innerText()).replace(/\s+/g,' ').includes('OpenStreetMap'));
 assert(await credit.isVisible());assert(!/Leaflet/.test(await p.locator('body').innerText()));
 assert(await credit.evaluate(el=>{const r=el.getBoundingClientRect(),m=document.querySelector('#resource-map').getBoundingClientRect();return r.left>=m.left&&r.right<=m.right&&getComputedStyle(el).whiteSpace==='nowrap';}));
 const sources=p.getByRole('button',{name:'Sources',exact:true});await sources.focus();await p.keyboard.press('Enter');
 assert(await p.locator('#atlas-sources').evaluate(el=>el.open));
 assert(await p.locator('#atlas-sources > summary').evaluate(el=>el===document.activeElement&&parseFloat(getComputedStyle(el).outlineWidth)>=3));
 const text=await p.locator('#atlas-sources').innerText();
 for(const name of ['OpenStreetMap contributors','ODbL','Microsoft','CDTFA','U.S. Census','Yolo County GIS'])assert(text.includes(name),name+' credit');
}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH}),findings=[];fs.mkdirSync('screenshots/cleanup',{recursive:true});try{
 for(const width of [320,390,768,1440]){
  const c=await b.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});await stubPublicMap(c);
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/');await p.waitForSelector('#city-map[data-ready]');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const mode=p.locator('[data-location-kind]');assert.equal(await mode.count(),4);
  assert(await mode.evaluateAll(els=>{const rs=els.map(e=>e.getBoundingClientRect());return rs.every(r=>r.height>=44&&Math.abs(r.width-rs[0].width)<1&&r.top===rs[0].top);}));
  assert.equal(await p.locator('[data-location-kind="zip"]').textContent(),'ZIP');
  assert.equal(await p.locator('[data-location-kind="zip"]').getAttribute('aria-label'),'ZIP code');
  for(const kind of ['county','zip','state','city']){const button=p.locator('[data-location-kind="'+kind+'"]');await button.focus();await p.keyboard.press('Space');assert.equal(await button.getAttribute('aria-pressed'),'true');assert(await button.evaluate(el=>el===document.activeElement&&parseFloat(getComputedStyle(el).outlineWidth)>=2));}
  assert(!/Leaflet/.test(await p.locator('body').innerText()));
  if(width<=700){assert(await p.locator('#city-map').evaluate(el=>el.offsetHeight>=360));assert(!await p.locator('.home-instructions').evaluate(el=>el.open));assert(await p.evaluate(()=>document.querySelector('.home-instructions').getBoundingClientRect().top>document.querySelector('#city-map').getBoundingClientRect().bottom&&document.querySelector('.welcome-photos').getBoundingClientRect().top>document.querySelector('.home-instructions').getBoundingClientRect().bottom));}
  await p.goto(base+'/local/?place=57026');await ready(p);
  const mapRect=await p.locator('#resource-map').boundingBox();assert(mapRect.y<500);assert(mapRect.height>=(width<=700?340:520));
  assert(await p.locator('.atlas-controls').evaluate(el=>el.getBoundingClientRect().top>document.querySelector('#resource-map').getBoundingClientRect().bottom));
  const planIDs=await p.locator('[data-disaster]').evaluateAll(els=>els.map(el=>el.dataset.disaster));const data=JSON.parse(await p.locator('#resource-map-data').textContent());assert.deepEqual(planIDs,data.disasters.plans.map(p=>p.id));
  assert(await p.locator('.atlas-choice').evaluateAll(els=>els.every(el=>el.offsetHeight>=44&&el.offsetWidth>=44)));
  assert.equal(await p.locator('.atlas-legend-disclosure').evaluate(el=>el.open),width>700);
  const earthquake=p.locator('[data-disaster="earthquake"]');await earthquake.focus();await p.keyboard.press('Space');assert.equal(await earthquake.getAttribute('aria-pressed'),'true');
  assert(await earthquake.evaluate(el=>getComputedStyle(el.querySelector('.atlas-choice-check')).display!=='none'&&parseFloat(getComputedStyle(el).outlineWidth)>=3));
  assert(await p.locator('#resource-map').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.top<innerHeight;}));
  await credits(p);assert((await p.locator('#atlas-sources').innerText()).includes('CGS'));
  if(width<=700){await p.locator('.mobile-menu > summary').focus();await p.keyboard.press('Enter');assert(await p.locator('.mobile-menu .recommendation-entry').isVisible());await p.keyboard.press('Enter');}
  await p.locator('#atlas-everyday').click();
  const waiting=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const dl=await waiting,file=path.resolve('screenshots/cleanup/offline-'+width+'.html');await dl.saveAs(file);
  const off=await b.newContext({offline:true,viewport:{width,height:900},reducedMotion:'reduce'}),o=await off.newPage(),requests=[];o.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});o.on('pageerror',e=>errors.push(e.message));
  await o.goto(pathToFileURL(file).href);await ready(o);await credits(o);await o.locator('.font-licenses > summary').click();assert(!/Leaflet/.test(await o.locator('body').innerText()));assert.deepEqual(requests,[]);await off.close();
  await p.goto(base+'/offline/');await p.waitForSelector('#city-map[data-ready]');assert(!/Leaflet/.test(await p.locator('body').innerText()));
  assert.deepEqual(errors,[]);findings.push({width,mapTop:mapRect.y,mapHeight:mapRect.height,plans:planIDs.length,offlineHTTP:0,credits:'full list and short corner credit',keyboard:'plans, modes, menu and Sources'});await c.close();
 }
 fs.writeFileSync('screenshots/cleanup/verification.json',JSON.stringify(findings,null,2));console.log('Cleanup layout, credits, keyboard and disconnected saved files passed at four widths.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
