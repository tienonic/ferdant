const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const {stubPublicMap,isPublicMapRequest}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return r&&!r.hidden&&!r.hasAttribute('aria-busy');});}
(async()=>{
 const browser=await chromium.launch({executablePath:executable()}),findings=[];fs.mkdirSync('screenshots/resource-scopes',{recursive:true});
 try{
  for(const width of [320,390,768,1440]){
   const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true});await stubPublicMap(c);
   const p=await c.newPage(),errors=[],unexpected=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin&&!isPublicMapRequest(r.url()))unexpected.push(r.url());});
   await p.goto(base+'/');await p.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
   assert.equal(await p.locator('#city-map [data-city-id]').count(),483);
   await p.locator('[data-location-kind="county"]').click();
   assert.equal(await p.locator('#city-map [data-city-id]').count(),0);assert.equal(await p.locator('#city-map [data-county-id]').count(),58);
   const input=p.getByRole('combobox',{name:'Search California cities or counties'});await input.fill('Yo');
   assert(await p.locator('#location-suggestions [role="option"]').evaluateAll(els=>els.length>0&&els.every(e=>e.dataset.placeKey.startsWith('county:'))));
   await input.press('ArrowDown');await input.press('Enter');await p.waitForURL('**/local/?place=county%3A57');await ready(p);
   assert.equal(await p.locator('#local-resource-levels [data-resource-level="city"]').count(),0);
   assert.equal(await p.locator('#local-resource-levels dd').count(),2);
   assert.equal(await p.locator('#location-links [data-resource-level="city"]').count(),0);
   await p.locator('.change-location > summary').click();await p.locator('[data-location-kind="city"]').click();
   await p.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');assert.equal(await p.locator('#city-map [data-city-id]').count(),483);
   await input.fill('Da');assert(await p.locator('#location-suggestions [role="option"]').evaluateAll(els=>els.every(e=>!e.dataset.placeKey.startsWith('county:'))));
   await p.getByRole('option',{name:'Davis, Yolo County, California',exact:true}).click();await p.waitForURL('**/local/?place=57026');await ready(p);
   assert.deepEqual(await p.locator('#local-resource-levels dd').allTextContents(),['Davis','Yolo County','California']);
   assert.equal(await p.locator('[data-local-contact="davis-nonemergency"]').getAttribute('data-resource-level'),'city');
   assert.equal(await p.locator('[data-local-contact="yolo-211"]').getAttribute('data-resource-level'),'county');
   assert.equal(await p.locator('[data-local-contact="pge-outage"]').getAttribute('data-resource-level'),'provider');
   assert(await p.locator('#phone-rows tr').evaluateAll(els=>els.every(e=>e.dataset.resourceLevel==='state')));
   assert.equal(await p.locator('#atlas-place-list > li:not([data-resource-level])').count(),0);
   await p.locator('#local-resource-levels').screenshot({path:`screenshots/resource-scopes/levels-${width}.png`});
   await p.locator('#location-links').screenshot({path:`screenshots/resource-scopes/contacts-${width}.png`});
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(width===390){
    const wait=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const download=await wait,file=path.resolve('screenshots/resource-scopes/davis-offline.html');await download.saveAs(file);
    const offline=await browser.newContext({offline:true,viewport:{width:390,height:1000}}),f=await offline.newPage(),network=[];f.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});await f.goto(pathToFileURL(file).href);await ready(f);
    assert.deepEqual(await f.locator('#local-resource-levels dd').allTextContents(),['Davis','Yolo County','California']);
    assert.equal(await f.locator('[data-local-contact="pge-outage"]').getAttribute('data-resource-level'),'provider');
    await f.locator('.change-location > summary').click();await f.locator('[data-location-kind="county"]').click();await f.getByRole('combobox',{name:'Search California cities or counties'}).fill('Yolo');await f.getByRole('button',{name:'Search',exact:true}).click();await ready(f);
    assert.equal(await f.locator('#phone-city').inputValue(),'county:57');assert.equal(await f.locator('#local-resource-levels dd').count(),2);assert.deepEqual(network,[]);await offline.close();
   }
   await p.goto(base+'/');await p.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');await p.locator('[data-location-kind="county"]').click();
   await p.locator('#city-map [data-county-id="57"]').click();await p.waitForURL('**/local/?place=county%3A57');await ready(p);
   assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);findings.push({width,cityAndCountySearch:true,countyMapClick:true,cityMarkers:483,countyAreas:58,hierarchy:true,providerLimit:true,offline:width===390?'actual download checked':'covered at 390'});await c.close();
  }
  const c=await browser.newContext();await stubPublicMap(c);const p=await c.newPage();await p.goto(base+'/local/?place=57026');await ready(p);
  const coverage=await p.evaluate(()=>{
   const select=document.querySelector('#phone-city'),{directory:d,places}=JSON.parse(document.querySelector('#phone-data').textContent),failed=[];
   for(const option of [...select.options].slice(1)){
    select.value=option.value;select.dispatchEvent(new Event('change'));
    const city=places.cities.find(row=>row[0]===option.value),county=city?city[2]:option.value.slice(7);
    for(const el of document.querySelectorAll('#location-links > li')){
     const id=el.dataset.localContact,level=el.dataset.resourceLevel,record=d.contacts[id];
     const valid=level==='provider'?record.scope==='PG&E customers only':level==='city'?Boolean(city)&&record.scope===city[1]:level==='county'?(d.countyContacts[county]||[]).includes(id):level==='state'?d.statewide.includes(id):false;
     if(!valid||!el.querySelector('.resource-scope-badge'))failed.push({place:option.value,id,level});
    }
   }return {choices:select.options.length-1,failed};
  });assert.equal(coverage.choices,541);assert.deepEqual(coverage.failed,[]);await c.close();
  assert(!fs.readFileSync('index.html','utf8').includes('data-monetization'));
  fs.writeFileSync('screenshots/resource-scopes/verification.json',JSON.stringify({findings,coverage,ads:false,newSources:false},null,2)+'\n');
  console.log('Resource scopes and city/county map selection passed at four widths, all 541 choices and a real offline download.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
