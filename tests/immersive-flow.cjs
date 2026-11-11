const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const shots=path.resolve(__dirname,'../../shots');
async function drawn(page){
 await page.waitForSelector('#city-map[data-ready]');
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>document.querySelector('#city-map').dataset.moving!=='true');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function capture(page,width,state,fullPage=false){
 if(![390,1440].includes(width))return;
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(shots,`${state}-${width}.png`),fullPage});
}
async function quiet(page){
 assert.equal(await page.locator('#city-map [data-city-id]:visible').count(),0);
 assert.equal(await page.locator('#city-map .leaflet-control-zoom:visible').count(),0);
 assert.equal(await page.locator('#city-map .leaflet-tooltip:visible').count(),0);
 assert.equal(await page.locator('#city-map').getAttribute('data-home-state'),'quiet');
}
async function typeAndCheck(page,query){
 const input=page.locator('#map-city-search');
 await input.fill(query);
 assert.equal(await input.getAttribute('aria-expanded'),'true','Suggestions appear without waiting for map movement');
 const expected=await page.locator('#phone-data').evaluate((el,query)=>{
  const cities=JSON.parse(el.textContent).places.cities;
  return cities.filter(row=>row[1].toLowerCase().startsWith(query.toLowerCase())).map(row=>row[0]).sort();
 },query);
 await page.waitForFunction(expected=>{
  const ids=[...document.querySelectorAll('#city-map [data-city-id]')].map(el=>el.dataset.cityId).sort();
  return JSON.stringify(ids)===JSON.stringify(expected)&&document.querySelector('#city-map').dataset.moving==='false';
 },expected);
 assert.equal(await page.locator('#city-search-status').innerText(),`${expected.length} matching ${expected.length===1?'place':'places'}`);
 assert(await page.locator('#city-map [data-city-id]').evaluateAll(els=>els.every(el=>el.getAttribute('fill')==='#244b84')));
 assert.equal(await page.locator('#city-map .leaflet-control-zoom:visible').count(),0);
 await drawn(page);
}
async function contrast(page){
 const minimum=await page.evaluate(()=>{
  const luminance=color=>{
   const values=color.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
   return values.reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  };
  const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
  const selectors='h1, #map-city-search, .location-kind-switch button, .state-resource strong, .state-resource small, .state-resource > span > span, .community-resource strong, .community-resource span span, .library-heading p, .city-map-credit summary';
  const elements=[...document.querySelectorAll(selectors)].filter(el=>el.getClientRects().length);
  return Math.min(...elements.map(el=>ratio(getComputedStyle(el).color,'rgb(251,252,250)')),ratio(getComputedStyle(document.querySelector('#map-city-search'),'::placeholder').color,'rgb(251,252,250)'));
 });
 assert(minimum>=4.5,`Home text contrast is ${minimum}`);
}
(async()=>{
 fs.mkdirSync(shots,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
 try{
  for(const width of [320,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await stubPublicMap(context);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.goto(base+'/');await drawn(page);
   const text=await page.locator('body').innerText();
   assert(!text.includes('Local resources. Emergency plans.'));assert(!text.includes('Links checked November 3, 2026.'));assert(text.includes('Eligibility and service areas vary.'));
   assert.equal(await page.locator('img[src*="photos"], .welcome-photos, .home-instructions').count(),0);
   assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('h1').innerText(),'Where are you?');
   assert.equal(await page.locator('#map-city-search').getAttribute('placeholder'),'City, county or ZIP code');
   assert.equal(await page.locator('#city-map').evaluate(el=>getComputedStyle(el).viewTransitionName),'none');
   assert((await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Geist'));
   assert((await page.locator('h1').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Newsreader'));
   const mapBox=await page.locator('#city-map').boundingBox();
   assert(mapBox.height>=900-mapBox.y-10,'Map fills the rest of the first screen');
   if(width===1440){
    const extent=await page.locator('[data-county-id]').evaluateAll(els=>Math.max(...els.map(el=>el.getBoundingClientRect().bottom))-Math.min(...els.map(el=>el.getBoundingClientRect().top)));
    assert(extent>=900*.7,'California itself occupies at least 70% of desktop viewport height');
   }
   for(const mode of ['city','county','zip','state'])assert.equal(await page.locator(`[data-location-kind="${mode}"]`).count(),1);
   await quiet(page);await contrast(page);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Arrival overflow at ${width}`);
   assert.equal(await page.locator('.state-resource-icon svg:visible').count(),4);
   assert.equal(await page.locator('.state-resource small svg:visible').count(),4);
   assert.equal(await page.locator('.state-resource small .scope-state:visible').count(),4);
   assert.equal(await page.locator('.community-resource > svg:first-child:visible').count(),5);
   assert.equal(await page.locator('.community-resource > svg:last-child:visible').count(),5);
   assert.equal(await page.locator('.community-resource > svg:first-child').evaluateAll(els=>new Set(els.map(el=>getComputedStyle(el).color)).size),5);
   await capture(page,width,'arrival');await capture(page,width,'full-home',true);
   await page.locator('[data-location-kind="state"]').click();
   assert(await page.locator('#city-map').isVisible());assert(await page.locator('#city-map .leaflet-control-zoom').isVisible());
   assert.equal(await page.locator('#city-map [data-city-id]').count(),483);assert.equal(await page.locator('#location-start .state-resource').count(),4);
   for(const [mode,query,key] of [['county','Yolo','county:57'],['zip','95616','zip:95616']]){
    await page.locator(`[data-location-kind="${mode}"]`).click();assert.equal(await page.locator('#city-map [data-city-id]').count(),483);
    await page.locator('#map-city-search').fill(query);
    await page.waitForSelector(`#city-map [data-place-key="${key}"]`);await drawn(page);
    assert.equal(await page.locator('#city-map [data-city-id]').count(),0);
    assert.equal(await page.locator('#city-map [data-place-key]').count(),1);
    await page.locator('#map-city-search').fill('');await drawn(page);await quiet(page);
   }
   await page.locator('[data-location-kind="city"]').click();
   await page.locator('#map-city-search').fill('D');await page.locator('#map-city-search').fill('');await drawn(page);await quiet(page);
   await page.evaluate(()=>{
    window.homeMotion=[];
    new MutationObserver(()=>{if(document.querySelector('#city-map').dataset.moving==='true')window.homeMotion.push(true);}).observe(document.querySelector('#city-map'),{attributes:true,attributeFilter:['data-moving']});
   });
   const before=await page.locator('[data-county-id="57"]').boundingBox();
   await typeAndCheck(page,'Dav');
   const after=await page.locator('[data-county-id="57"]').boundingBox();assert(after.width>before.width*1.5,'Typing zooms to the matching region');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Typing overflow at ${width}`);
   await capture(page,width,'typing-Dav');
   await typeAndCheck(page,'San');
   if(width<=700){const list=await page.locator('#location-suggestions').boundingBox();assert(await page.locator('#city-map [data-city-id]').evaluateAll((els,bottom)=>els.every(el=>el.getBoundingClientRect().top>=bottom),list.y+list.height),'Matching dots stay below the phone suggestions');}
   await capture(page,width,'typing-San');
   await page.locator('#map-city-search').fill('No such place');
   await page.waitForFunction(()=>document.querySelector('#city-map').dataset.homeState==='matching'&&!document.querySelector('#city-map [data-city-id]'));
   assert.equal(await page.locator('#city-search-status').innerText(),'0 matching places');
   await page.locator('#map-city-search').fill('');await drawn(page);await quiet(page);
   assert.deepEqual(await page.evaluate(()=>window.homeMotion),[],'Reduced motion never eases the home map');
   const restored=await page.locator('[data-county-id="57"]').boundingBox();assert(Math.abs(restored.width-before.width)<2);
   await page.locator('#map-city-search').focus();assert(await page.locator('#map-city-search').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));
   await page.keyboard.press('Tab');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('data-location-kind'),'city');
   await page.keyboard.press('Tab');await page.keyboard.press('Space');assert.equal(await page.locator('[data-location-kind="county"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#city-map [data-city-id]').count(),483);
   assert.equal(await page.locator('#city-map .leaflet-control-zoom:visible').count(),1);
   await page.locator('[data-location-kind="city"]').click();await page.locator('#map-city-search').fill('D');await page.locator('#map-city-search').fill('');await drawn(page);await quiet(page);
   await page.locator('#city-map').click({position:{x:mapBox.width-8,y:40}});
   assert.equal(await page.locator('#city-map [data-city-id]').count(),483,'Pointer press reveals every dot');
   assert.equal(await page.locator('#city-map .leaflet-control-zoom:visible').count(),1);
   await page.locator('#map-city-search').fill('D');await page.locator('#map-city-search').fill('');await drawn(page);await page.locator('#city-map').focus();
   assert.equal(await page.locator('#city-map [data-city-id]').count(),483,'Keyboard map focus reveals every dot');
   assert(await page.locator('#city-map').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));
   await page.keyboard.press('+');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#map-city-search').fill('Davis');await page.locator('#map-city-search').press('ArrowDown');
   assert(await page.locator('#map-city-search').getAttribute('aria-activedescendant'));
   await page.locator('#map-city-search').press('Enter');await page.waitForURL('**/local/?place=57026');
   await page.waitForFunction(()=>document.querySelector('#resource-map')?.dataset.ready==='true'&&!document.querySelector('#resource-atlas').hasAttribute('aria-busy'));
   assert((await page.locator('h1').innerText()).includes('Davis'));await capture(page,width,'chosen-Davis');
   for(const key of ['57026','19050','county:57']){
    await page.goto(base+'/local/?place='+encodeURIComponent(key));await page.waitForFunction(()=>document.querySelector('#resource-map')?.dataset.ready==='true'&&!document.querySelector('#resource-atlas').hasAttribute('aria-busy'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Local overflow ${key} at ${width}`);
   }
   await page.goto(base+'/guides/');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
  }
  const motion=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});await stubPublicMap(motion);
  const moving=await motion.newPage(),motionErrors=[];moving.on('pageerror',e=>motionErrors.push(e.message));moving.on('console',m=>{if(m.type()==='error')motionErrors.push(m.text());});
  await moving.goto(base+'/');await drawn(moving);
  assert.equal(await moving.locator('#city-map').evaluate(el=>getComputedStyle(el).viewTransitionName),'place-map');
  const wheelBox=await moving.locator('#city-map').boundingBox();await moving.mouse.move(wheelBox.x+wheelBox.width-10,wheelBox.y+40);await moving.mouse.wheel(0,-100);
  await moving.waitForFunction(()=>document.querySelectorAll('#city-map [data-city-id]').length===483);
  assert.equal(await moving.locator('#city-map [data-city-id]').count(),483,'Wheel use reveals every dot');
  await moving.locator('#map-city-search').fill('San');await moving.waitForFunction(()=>document.querySelector('#city-map').dataset.moving==='true');
  await typeAndCheck(moving,'Dav');
  await moving.locator('#map-city-search').fill('Davis');await moving.getByRole('option',{name:'Davis, Yolo County, California',exact:true}).click();
  await moving.waitForFunction(()=>document.querySelector('#city-map')?.dataset.travelling==='true');assert.equal(new URL(moving.url()).pathname,'/');
  assert(await moving.locator('#city-map path[fill="#244b84"]').count()>0,'Chosen place is outlined before navigation');
  await moving.waitForURL('**/local/?place=57026');assert(await moving.evaluate(()=>window.FerdantJustChosen));assert(await moving.evaluate(()=>sessionStorage.length===0));
  await moving.goto(base+'/local/?place=57026');assert(!await moving.evaluate(()=>window.FerdantJustChosen));assert.deepEqual(motionErrors,[]);await motion.close();
  const touch=await browser.newContext({viewport:{width:390,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await stubPublicMap(touch);const pinching=await touch.newPage();await pinching.goto(base+'/');await drawn(pinching);await quiet(pinching);
  const touchBox=await pinching.locator('#city-map').boundingBox(),cdp=await touch.newCDPSession(pinching),x=touchBox.x+touchBox.width/2,y=touchBox.y+200;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y},{x:x+25,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-60,y},{x:x+60,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await pinching.locator('#city-map [data-city-id]').count(),483,'Pinching reveals every dot');assert.equal(await pinching.locator('#city-map .leaflet-control-zoom:visible').count(),1);await touch.close();
  const direct=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await stubPublicMap(direct);const clicking=await direct.newPage();
  for(const [mode,query,selector,key,zip] of [
   ['city','Davis','[data-city-id="57026"]','57026',null],
   ['county','Yolo','[data-place-key="county:57"]','county:57',null],
   ['zip','95616','[data-place-key="zip:95616"]','county:57','95616']
  ]){
   await clicking.goto(base+'/');await drawn(clicking);
   if(mode!=='city')await clicking.locator(`[data-location-kind="${mode}"]`).click();
   await clicking.locator('#map-city-search').fill(query);await clicking.locator('#city-map '+selector).waitFor();await drawn(clicking);
   await clicking.locator('#city-map '+selector).click();
   await clicking.waitForURL(url=>url.pathname==='/local/'&&url.searchParams.get('place')===key&&url.searchParams.get('zip')===zip);
   await clicking.waitForFunction(()=>document.querySelector('#resource-map')?.dataset.ready==='true'&&!document.querySelector('#resource-atlas').hasAttribute('aria-busy'));
  }
  await direct.close();
  const noScripts=await browser.newContext({javaScriptEnabled:false});const plain=await noScripts.newPage();await plain.goto(base+'/');
  assert.equal(await plain.locator('h1').innerText(),'Where are you?');assert(await plain.locator('#map-city-search').isVisible());assert.equal(await plain.locator('.state-resource:visible').count(),4);assert.equal(await plain.locator('.community-resource:visible').count(),5);await noScripts.close();
  console.log('Immersive flow passed: quiet arrival, matching dots and retargeting, clear, map exploration, keyboard choice, reduced motion, restored icons, contrast, no-script reading and four-width overflow.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
