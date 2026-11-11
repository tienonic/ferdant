const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const {showEveryday,openMapControls}=require('./story-helpers.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const catalog=JSON.parse(fs.readFileSync('content/evacuation.json','utf8'));
const raw=fs.readFileSync('assets/data/evacuation-routes/57.json'),routes=JSON.parse(raw),receipt=JSON.parse(fs.readFileSync('assets/data/evacuation-routes/manifest.json','utf8'));
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const el=document.querySelector('#resource-atlas');return el&&!el.hidden&&!el.hasAttribute('aria-busy')&&el.dataset.hazardLoading!=='true';});await showEveryday(p);await openMapControls(p);}
(async()=>{
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),receipt.projectionSHA256);
 assert.equal(routes.features.length,receipt.features);assert.equal(receipt.sourceCount,receipt.features+receipt.missingGeometryIds.length);
 assert(routes.features.every(f=>f.properties.Evac_Route==='Yes'&&!('Status' in f.properties)&&['LineString','MultiLineString'].includes(f.geometry.type)));
 const output='screenshots/evacuation-map';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:executable()});
 try{
  const c=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});await stubPublicMap(c);
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/local/?place=57026');await ready(p);
  const count=await p.locator('.evacuation-route').count();assert(count>20,'Davis must have visible route lines on the initial map');
  assert(await p.locator('#atlas-routes-toggle').isChecked());await p.locator('#atlas-routes-toggle').uncheck();assert.equal(await p.locator('.evacuation-route').count(),0);await p.locator('#atlas-routes-toggle').check();assert.equal(await p.locator('.evacuation-route').count(),count);
  for(const [hazard,mode]of Object.entries(catalog.events)){
   await p.locator('[data-disaster="'+hazard+'"]').click();await ready(p);assert.equal((await p.locator('.evacuation-route').count())>0,Boolean(mode),hazard);
   assert.equal(await p.locator('.atlas-evacuation').count(),mode?1:0);assert.equal(await p.locator('.atlas-route-controls').isVisible(),Boolean(mode));
  }
  await p.locator('[data-disaster="wildfire"]').click();await ready(p);
  for(const width of [320,390,1440]){await p.setViewportSize({width,height:1100});await p.locator('.atlas-map-column').screenshot({path:output+'/davis-routes-'+width+'.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  const result=await p.evaluate(async()=>{const r=await FerdantBooklet.build('57026');return {bytes:Array.from(new Uint8Array(await r.blob.arrayBuffer())),layout:r.layout,pages:r.pages,map:r.model.evacuationMap,mapAudit:r.mapAudit};});
  assert(result.map.features.length>20);assert(result.mapAudit.evacuationSegments>20);assert(result.mapAudit.streetLabels.length>0);assert(result.layout.some(l=>l.page===2&&l.text==='Local street map'));assert(result.layout.some(l=>l.page===2&&l.text==='Davis at a glance'));
  fs.writeFileSync(output+'/davis-resource-book.pdf',Buffer.from(result.bytes));fs.writeFileSync(output+'/davis-resource-book.json',JSON.stringify({layout:result.layout,pages:result.pages,routeSegments:result.map.features.length},null,2));
  const wait=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const dl=await wait,saved=path.resolve(output,'davis-offline.html');await dl.saveAs(saved);
  const offline=await browser.newContext({offline:true}),o=await offline.newPage(),requests=[];o.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await o.goto(pathToFileURL(saved).href);await ready(o);
  assert.equal(await o.locator('.evacuation-route').count(),count);const bytes=await o.evaluate(async()=>Array.from(new Uint8Array(await (await FerdantBooklet.build('57026')).blob.arrayBuffer())));assert.deepEqual(Buffer.from(bytes),Buffer.from(result.bytes));assert.deepEqual(requests,[]);await offline.close();
  await p.locator('#phone-city').selectOption('38001',{force:true});await ready(p);assert.equal(await p.locator('.evacuation-route').count(),0);assert(await p.locator('#atlas-routes-toggle').isDisabled());assert((await p.locator('#atlas-route-status').innerText()).includes('No reviewed'));
  const gap=await p.evaluate(async()=>{const r=await FerdantBooklet.build('38001');return {map:r.model.evacuationMap,layout:r.layout,mapAudit:r.mapAudit};});assert.equal(gap.map,null);assert(gap.mapAudit.roadsDrawn>0);assert(gap.mapAudit.streetLabels.length>0);assert.equal(gap.mapAudit.evacuationSegments,0);assert(gap.layout.some(l=>l.page===2&&l.text.startsWith('No reviewed evacuation-road geometry')));
  const fail=await browser.newContext();await stubPublicMap(fail);await fail.route('**/assets/data/evacuation-routes/57.json',r=>r.abort());const f=await fail.newPage();await f.goto(base+'/local/?place=57026');await ready(f);assert.equal(await f.locator('.evacuation-route').count(),0);assert((await f.locator('#atlas-route-status').innerText()).includes('unavailable'));await fail.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/verification.json',JSON.stringify({davisSegments:count,pdfMapPage:2,sourceFeatures:routes.features.length,omittedNullGeometry:receipt.missingGeometryIds.length,widths:[320,390,1440],hazards:14,offlineHTTP:0,offlinePDFIdentical:true,missingAreaAndSource:true,errors},null,2));
  console.log('Evacuation map passed: real Davis route lines, 14 disaster switches, toggle, 3 widths, PDF page 2, offline equality, missing source and county gaps.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
