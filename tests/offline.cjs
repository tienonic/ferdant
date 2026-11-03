const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

module.exports = async function checkOffline(browser, base) {
 const regional = JSON.parse(fs.readFileSync('content/regions.json','utf8'));
 const findings = [];
 for (const region of regional.regions) {
  const context = await browser.newContext({acceptDownloads:true});
  const page = await context.newPage();
  await page.goto(base+'/offline/');
  const download = page.waitForEvent('download');
  await page.locator(`a[download][href*="${region.slug}"]`).click();
  const file = await download;
  const saved = path.resolve('screenshots','downloaded-'+file.suggestedFilename());
  await file.saveAs(saved);
  const source = fs.readFileSync(saved,'utf8');
  assert(!/<(?:script|link)[^>]+(?:src|href)="\//.test(source), 'Saved file must embed scripts and styles');
  assert(!/src="(?:https?:|\/assets\/)/.test(source), 'Saved file must embed its images');
  assert(source.includes('form-action &#x27;none&#x27;'));
  await context.close();
  for (const width of [320,390,1440]) {
   const offline = await browser.newContext({offline:true,viewport:{width,height:960},reducedMotion:'reduce'});
   const p = await offline.newPage();const network=[],errors=[];
   p.on('request', r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
   p.on('pageerror', error=>errors.push(error.message));
   await p.goto(pathToFileURL(saved).href);
   await p.evaluate(()=>document.fonts.ready);
   assert((await p.locator('h1').innerText()).includes(region.name));
   assert.equal(await p.locator('.local-contact').count(), region.contacts.length);
   assert.equal(await p.locator('[id]').evaluateAll(els=>new Set(els.map(el=>el.id)).size===els.length),true);
   assert(await p.locator('.offline-notice').innerText().then(t=>t.includes('no live alerts')));
   assert(await p.locator('.site-favicon').evaluateAll(images=>images.every(img=>img.complete && img.naturalWidth>0)));
   assert(await p.evaluate(()=>[...document.fonts].some(f=>f.status==='loaded')));
   assert.equal(await p.locator('meta[name=robots]').getAttribute('content'),'noindex,follow');
   await p.getByLabel('Monthly cost (USD)',{exact:true}).fill('10');
   assert.equal(await p.locator('#cost-total').innerText(),'$120.00');
   const tools=p.getByRole('navigation',{name:'Quick tools'});
   await tools.getByRole('link',{name:'Compare a bill'}).click();
   await p.getByLabel('Previous bill ($)').fill('60');await p.getByLabel('Current bill ($)').fill('75');
   await p.getByRole('button',{name:'Compare the totals'}).click();
   assert((await p.locator('#bill-result').innerText()).includes('$15.00 (25.0%) higher'));
   await p.keyboard.press('Escape');
   await tools.getByRole('link',{name:'Cancel subscription'}).click();
   await p.getByLabel('Another platform',{exact:true}).check();
   await p.locator('#cancel-record input').first().check();
   assert.equal(await p.locator('#cancel-count').innerText(),'1 of 4 records checked');
   await p.keyboard.press('Escape');
   await tools.getByRole('link',{name:'Draft a message'}).click();
   await p.getByLabel('What needs explaining?').fill('Offline test charge');
   assert((await p.locator('#built-message').innerText()).includes('Offline test charge'));
   await p.keyboard.press('Escape');
   const savedGuide=p.locator('.offline-guides details').first();await savedGuide.locator('summary').click();
   assert(await savedGuide.locator('ol').isVisible());
   assert.equal(await p.locator('.offline-guides details').count(),3);
   await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
   assert.equal(await p.locator('.offline-guides details[open]').count(),3);
   await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
   assert.equal(await p.locator('.offline-guides details[open]').count(),1);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Offline overflow at ${width}`);
   assert.deepEqual(network,[],'Reopened file must make no network requests');assert.deepEqual(errors,[]);
   if(width!==320) {
    await p.evaluate(()=>scrollTo(0,0));
    await p.screenshot({path:`screenshots/offline-${region.slug}-${width}.png`});
    await p.locator('.offline-local').screenshot({path:`screenshots/offline-contacts-${region.slug}-${width}.png`});
   }
   findings.push({region:region.slug,width,fileScheme:true,networkRequests:network.length,tools:4,savedGuides:3,result:'passed'});
   await offline.close();
  }
  const noJs=await browser.newContext({offline:true,javaScriptEnabled:false,viewport:{width:390,height:960}});
  const p=await noJs.newPage();await p.goto(pathToFileURL(saved).href);
  assert.equal(await p.locator('.local-contact:visible').count(),region.contacts.length);
  await p.locator('.offline-guides details').first().locator('summary').click();
  assert(await p.locator('.offline-guides details').first().locator('ol').isVisible());
  assert(!await p.locator('.cost-preview').isVisible());
  await noJs.close();
 }
 fs.writeFileSync('screenshots/offline-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),findings,noJavaScript:'contacts and saved guides passed',downloads:'saved through actual download links',liveAlerts:false},null,2));
};
