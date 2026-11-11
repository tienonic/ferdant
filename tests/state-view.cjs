const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
(async()=>{const browser=await chromium.launch({executablePath:executable()}),findings=[];fs.mkdirSync('screenshots/state-view',{recursive:true});try{
 for(const width of [320,390,768,1440]){
  const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',...(width===390?{isMobile:true,hasTouch:true}:{})});await stubPublicMap(c);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/#communities');await p.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
  assert.equal(await p.locator('[data-location-kind]').count(),4);assert(await p.locator('#communities').isVisible());
  await p.locator('#phone-city').evaluate(el=>el.dataset.moveCheck='same');
  const requests=[];p.on('request',r=>requests.push(r.url()));
  await p.locator('[data-location-kind="state"]').focus();await p.keyboard.press('Space');
  assert.equal(await p.locator(':focus').getAttribute('data-location-kind'),'state');
  assert(!await p.locator('#city-map').isVisible());assert(!await p.locator('#map-city-form').isVisible());
  assert(await p.locator('#location-start #california-resources').isVisible());assert(await p.locator('#communities').isVisible());
  assert.equal(await p.locator('#location-start .state-resource').count(),4);
  assert.equal(await p.locator('.landing-library').count(),1);assert.equal(await p.locator('#phone-data').count(),1);
  assert(await p.locator('[id]').evaluateAll(els=>new Set(els.map(e=>e.id)).size===els.length));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('.phone-toggle').click();assert(await p.locator('.phone-table').isVisible());await p.locator('.phone-toggle').click();
  await p.evaluate(()=>document.fonts.ready);await p.locator('#location-start').screenshot({path:`screenshots/state-view/state-${width}.png`});
  for(const mode of ['county','city','county','city']){
   await p.locator(`[data-location-kind="${mode}"]`).click();assert(await p.locator('#city-map').isVisible());assert(await p.locator('#map-city-form').isVisible());
   assert.equal(await p.locator('#location-start .landing-library').count(),0);assert(await p.locator('#california-resources').isVisible());
   assert.equal(await p.locator('#city-map [data-city-id]').count(),mode==='city'?483:0);
   assert(await p.locator('[data-county-id]').evaluateAll((els,mode)=>els.every(e=>getComputedStyle(e).pointerEvents===(mode==='county'?'auto':'none')),mode));
   await p.locator('[data-location-kind="state"]').click();assert(await p.locator('#location-start #california-resources').isVisible());assert(!await p.locator('#city-map').isVisible());
  }
  assert.equal(await p.locator('#phone-city option').count(),542);assert.equal(await p.locator('#phone-city').getAttribute('data-move-check'),'same');
  assert.deepEqual(requests,[],'Moving resources and changing scope must not fetch or reload controls');assert.deepEqual(errors,[]);
  findings.push({width,stateReplacesMap:true,resources:4,keyboard:true,singleResourceSection:true,mapAndSearchRestored:true,cityAndCountyIsolation:true,phoneControlsPreserved:true,requests:0});await c.close();
 }
 const c=await browser.newContext({javaScriptEnabled:false}),p=await c.newPage();await p.goto(base+'/');assert(await p.locator('#california-resources').isVisible());assert.equal(await p.locator('.state-resource').count(),4);await c.close();
 fs.writeFileSync('screenshots/state-view/verification.json',JSON.stringify({findings,noJavaScriptResources:true,newSources:false},null,2)+'\n');console.log('State view passed at four widths: map/search hidden, same resources moved in, keyboard, phone controls, repeated City/County restoration and no requests.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
