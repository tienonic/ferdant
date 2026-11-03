const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
const alerts=JSON.parse(fs.readFileSync('content/emergency-alerts.json','utf8'));
function browserPath(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
const choices=[...places.cities.map(([id,name,county])=>({id,name,county})),...Object.entries(places.counties).map(([county,name])=>({id:'county:'+county,name,county}))];
async function ready(page){await page.waitForFunction(()=>document.querySelector('#location-alert [data-alert-signup]'));}
(async()=>{
 assert.deepEqual(Object.keys(alerts.counties).sort(),Object.keys(places.counties).sort());
 assert(!/returnurl=|code_challenge=|state=|token=/i.test(decodeURIComponent(JSON.stringify(alerts))),'No generated authentication state');
 const browser=await chromium.launch({executablePath:browserPath()});fs.mkdirSync('screenshots/alerts',{recursive:true});
 try{
  const audit=await browser.newContext();
  // Audit all selection paths without starting unrelated map/export work 541 times.
  await audit.route(/\/(resource-map|infographic)\.js$/,r=>r.fulfill({contentType:'application/javascript',body:''}));
  const a=await audit.newPage();await a.goto(base+'/local/?place=57026');await ready(a);
  const results=await a.evaluate(choices=>choices.map(choice=>{
   const select=document.querySelector('#phone-city');select.value=choice.id;select.dispatchEvent(new Event('change'));
   const card=document.querySelector('#location-alert'),link=card.querySelector('[data-alert-signup]');
   return {id:choice.id,url:link.getAttribute('href'),label:link.getAttribute('aria-label'),text:card.textContent};
  }),choices);
  for(let i=0;i<choices.length;i++){
   const choice=choices[i],result=results[i],city=alerts.cities[choice.id],county=alerts.counties[choice.county];
   assert.equal(result.url,(city||county).url,choice.id);
   assert(result.label.includes(city?choice.name+' city':county.county+' County'),choice.id);
   assert(result.text.includes('Signup needs internet.'));
  }
  await audit.close();
  const context=await browser.newContext({viewport:{width:390,height:950},acceptDownloads:true});await stubPublicMap(context);
  const p=await context.newPage(),errors=[],registrationRequests=[];p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(/everbridge|smart911|genasys|onsolve|calalerts|211ca/.test(new URL(r.url()).hostname))registrationRequests.push(r.url());});
  for(const key of ['57026','19050','19060','county:19','county:58','county:02']){
   await p.goto(base+'/local/?place='+encodeURIComponent(key));await ready(p);
   assert.equal(await p.locator('#location-alert [data-alert-signup]').count(),1);
   assert.equal(await p.locator('#phone-local-alert').isVisible(),false);
   if(key==='19050')assert((await p.locator('#location-alert').innerText()).includes('Los Angeles city'));
  }
  for(const width of [320,390,768,1440]){
   await p.setViewportSize({width,height:950});await p.goto(base+'/local/?place=county:20');await ready(p);
   const card=p.locator('#location-alert');await card.scrollIntoViewIfNeeded();
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await card.locator('[data-alert-signup]').evaluate(e=>e.getBoundingClientRect().height>=44));
   await card.screenshot({path:'screenshots/alerts/signup-'+width+'.png'});
   await card.locator('summary').focus();await p.keyboard.press('Enter');assert(await card.locator('details').evaluate(e=>e.open));
  }
  await p.goto(base+'/local/?place=invalid');await p.waitForFunction(()=>document.querySelector('#phone-local-alert [data-alert-signup]'));
  assert(await p.locator('#location-resources').isHidden());assert.equal(await p.locator('#phone-local-alert [data-alert-signup]').getAttribute('href'),alerts.sources.caloes.url);
  await p.goto(base+'/local/?place=57026');await ready(p);
  await p.waitForFunction(()=>document.querySelector('#infographic-preview').naturalWidth>0);
  await p.waitForFunction(()=>!document.querySelector('#resource-atlas').hasAttribute('aria-busy'));
  const waiting=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const download=await waiting;
  const file=path.resolve('screenshots/alerts/davis-offline.html');await download.saveAs(file);
  for(const javaScriptEnabled of [true,false]){
   const offline=await browser.newContext({offline:true,javaScriptEnabled}),o=await offline.newPage(),requests=[];
   o.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await o.goto(pathToFileURL(file).href);
   assert.equal(await o.locator('#location-alert [data-alert-signup]').getAttribute('href'),alerts.counties['57'].url);
   assert(await o.locator('#location-alert').isVisible());
   if(javaScriptEnabled){await o.selectOption('#phone-city','county:58',{force:true});assert.equal(await o.locator('#location-alert [data-alert-signup]').getAttribute('href'),alerts.counties['58'].url);}
   assert.deepEqual(requests,[]);await offline.close();
  }
  const nojs=await browser.newContext({javaScriptEnabled:false});const n=await nojs.newPage();await n.goto(base+'/offline/');assert(await n.getByRole('link',{name:'Find emergency alert signup for your county'}).isVisible());await nojs.close();
  assert.deepEqual(errors,[]);assert.deepEqual(registrationRequests,[]);
  assert(await p.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
  fs.writeFileSync('screenshots/alerts/verification.json',JSON.stringify({checkedUTC:new Date().toISOString(),locations:choices.length,counties:58,citySpecificRoutes:Object.keys(alerts.cities).length,widths:[320,390,768,1440],offlineHTTP:0,offlineWithoutScripts:true,registrationRequests,errors,limits:'Map network fixtures; no registration submitted or delivery tested'},null,2));
  console.log('Alert signup: all 541 location routes, city/county distinction, four widths, keyboard details, invalid selection, actual offline download and no-script saved reading passed. No registration requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
