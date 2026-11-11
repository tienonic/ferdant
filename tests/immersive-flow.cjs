const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await stubPublicMap(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base+'/');await page.waitForSelector('#city-map[data-ready]');await page.evaluate(()=>document.fonts.ready);
  const text=await page.locator('body').innerText();assert(!text.includes('Local resources. Emergency plans.'));assert(!text.includes('Links checked November 3, 2026.'));assert(text.includes('Eligibility and service areas vary.'));
  assert.equal(await page.locator('img[src*="photos"], .welcome-photos, .home-instructions').count(),0);
  assert.equal(await page.locator('h1').innerText(),'Choose a location');
  assert.equal(await page.locator('#city-map').evaluate(el=>getComputedStyle(el).viewTransitionName),'none');
  assert((await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Geist'));
  assert((await page.locator('#location-title').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Newsreader'));
  assert((await page.locator('#city-map').boundingBox()).height>=900*(width<=700?.55:.70)-1);
  for(const mode of ['city','county','zip','state'])assert.equal(await page.locator(`[data-location-kind="${mode}"]`).count(),1);
  await page.locator('#map-city-search').focus();await page.keyboard.type('Davis');await page.keyboard.press('Enter');await page.waitForURL('**/local/?place=57026');
  for(const key of ['57026','19050','county:57']){
   await page.goto(base+'/local/?place='+encodeURIComponent(key));await page.waitForFunction(()=>document.querySelector('#resource-map')?.dataset.ready==='true'&&!document.querySelector('#resource-atlas').hasAttribute('aria-busy'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Local overflow ${key} at ${width}`);
  }
  await page.goto(base+'/guides/');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
 }
 const motion=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});await stubPublicMap(motion);const moving=await motion.newPage(),motionErrors=[];moving.on('pageerror',e=>motionErrors.push(e.message));moving.on('console',m=>{if(m.type()==='error')motionErrors.push(m.text());});await moving.goto(base+'/');await moving.waitForSelector('#city-map[data-ready]');assert.equal(await moving.locator('#city-map').evaluate(el=>getComputedStyle(el).viewTransitionName),'place-map');await moving.locator('#map-city-search').fill('Davis');await moving.getByRole('option',{name:'Davis, Yolo County, California',exact:true}).click();await moving.waitForFunction(()=>document.querySelector('#city-map')?.dataset.travelling==='true');assert.equal(new URL(moving.url()).pathname,'/');await moving.waitForURL('**/local/?place=57026');assert(await moving.evaluate(()=>window.FerdantJustChosen));assert(await moving.evaluate(()=>sessionStorage.length===0));await moving.goto(base+'/local/?place=57026');assert(!await moving.evaluate(()=>window.FerdantJustChosen));assert.deepEqual(motionErrors,[]);await motion.close();
 console.log('Immersive foundation: location, type, map sizes and four-width overflow passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
