// Fixed-size fault imagery must add no statewide geometry or background work.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const data=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/<script type="application\/json" id="resource-map-data">(.*?)<\/script>/s)[1]).disasters;
const source=data.layers.faults;
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(x=>x.startsWith('chromium_headless_shell-')).sort().reverse().map(x=>path.join(root,x,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r.hidden&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});}
async function choose(p,id){await p.locator('[data-disaster="'+id+'"]').click();await ready(p);}
(async()=>{
 assert.equal(source.kind,'map-image');assert.equal(source.offline,false);
 assert.deepEqual(data.plans.filter(p=>p.layers.includes('faults')).map(p=>p.id),['earthquake']);
 const browser=await chromium.launch({executablePath:executable()});
 try{
  const c=await browser.newContext({viewport:{width:390,height:900}});await stubPublicMap(c);
  const p=await c.newPage(),requests=[],errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(new URL(r.url()).host==='gis.conservation.ca.gov')requests.push(r.url());});
  await p.goto(base+'/local/?place=01060');await ready(p);assert.equal(requests.length,0,'No fault requests in everyday view');
  await choose(p,'earthquake');assert.equal(requests.length,2);
  const query=new URL(requests[0]).searchParams;
  assert.equal(query.get('size'),'800,600');assert.equal(query.get('format'),'png32');
  assert.equal(query.get('transparent'),'true');assert.equal(query.get('bboxSR'),'4326');
  assert.equal(JSON.parse(query.get('dynamicLayers'))[0].source.mapLayerId,21);
  assert.equal(JSON.parse(query.get('dynamicLayers'))[0].drawingInfo.scaleSymbols,false,'Provider reference scale must not inflate the line width');
  assert.equal(query.get('returnGeometry'),null);
  const bounds=query.get('bbox').split(',').map(Number);assert(bounds.every(Number.isFinite));assert(bounds[2]-bounds[0]<1,'City-sized bounds, not statewide');
  assert(bounds[2]-bounds[0]>=.199&&bounds[3]-bounds[1]>=.199,'Small cities include enough context to avoid the provider scale cutoff');
  assert.equal(await p.locator('.disaster-faults').count(),1);assert.equal(await p.locator('path.disaster-faults').count(),0);
  assert.equal(await p.locator('.disaster-faults').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await p.locator('.disaster-faults').evaluate(e=>getComputedStyle(e).zIndex),'201','Fault lines stay above polygon shading');
  assert((await p.locator('#atlas-layer-credit').innerText()).includes('2010 Fault Activity Map'));
  await p.locator('#resource-map .leaflet-control-zoom-in').click();
  const box=await p.locator('#resource-map').boundingBox();
  await p.mouse.move(box.x+box.width*.45,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.6,{steps:8});await p.mouse.up();
  await p.waitForTimeout(200);assert.equal(requests.length,2,'Pan and zoom reuse the image');
  await choose(p,'flood');assert.equal(await p.locator('.disaster-faults').count(),0);
  await choose(p,'earthquake');assert.equal(requests.length,2,'Repeat selection uses cache');
  await p.locator('#phone-city').selectOption('19050',{force:true});await ready(p);assert.equal(requests.length,4,'New location requests its own image');
  assert.notEqual(new URL(requests[2]).searchParams.get('bbox'),query.get('bbox'));
  await p.locator('#atlas-everyday').click();assert.equal(await p.locator('.disaster-faults').count(),0);
  assert.deepEqual(errors,[]);await c.close();

  const failure=await browser.newContext();await stubPublicMap(failure);const f=await failure.newPage();let fail=true;
  await f.route(url=>url.href.startsWith(source.service+'/export?'),r=>fail?r.fulfill({status:503,body:'Unavailable'}):r.fallback());
  await f.goto(base+'/local/?place=01060&hazard=earthquake');await ready(f);
  assert((await f.locator('#atlas-layer-status').innerText()).includes('Partial coverage'));
  assert.equal(await f.locator('.disaster-faults').count(),0);assert(await f.locator('.disaster-liquefaction').count()>0);
  fail=false;await choose(f,'earthquake');assert.equal(await f.locator('.disaster-faults').count(),1,'Reselection recovers after a failure');
  await f.route(url=>url.host==='gis.conservation.ca.gov'&&url.pathname.endsWith('.png'),r=>r.fulfill({contentType:'image/png',body:Buffer.alloc(source.maxImageBytes+1)}));
  await f.reload();await ready(f);assert.equal(await f.locator('.disaster-faults').count(),0);
  assert((await f.locator('#atlas-layer-status').innerText()).includes('Partial coverage'),'Oversize image is rejected without hiding other layers');
  await failure.close();

  const late=await browser.newContext();await stubPublicMap(late);const l=await late.newPage();
  await l.route(url=>url.href.startsWith(source.service+'/export?'),async r=>{await new Promise(resolve=>setTimeout(resolve,300));try{await r.fallback();}catch{}});
  await l.goto(base+'/local/?place=01060');await ready(l);await l.locator('[data-disaster="earthquake"]').click();await choose(l,'flood');await l.waitForTimeout(400);
  assert.equal(await l.locator('.disaster-faults').count(),0,'A late earthquake response cannot restore the removed overlay');
  await late.close();
  console.log('Fault overlay: lazy two-request image, fixed bounds/resolution, no vector paths, cache reuse, no pan/zoom requests, city changes, removal, failure recovery, size limit and late-response cancellation passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
