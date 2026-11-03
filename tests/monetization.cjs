// Verify commercial demos remain readable, disclosed and inert across every page.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {stubPublicMap, isPublicMapRequest} = require('./map-network.cjs');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const urls = [...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname).concat('/404.html');
function executable() {
 if(process.env.CHROME_PATH) return process.env.CHROME_PATH;
 if(process.platform !== 'win32') return undefined;
 const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');
 return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);
}
(async()=>{
 fs.mkdirSync('screenshots/monetization',{recursive:true});
 const browser=await chromium.launch({executablePath:executable()});
 const checks=[];
 try {
  for(const width of [320,390,768,1440]) {
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   await stubPublicMap(context);
   const page=await context.newPage(),unexpected=[],errors=[];
   page.on('request',r=>{if(/^https?:/.test(r.url()) && new URL(r.url()).origin!==new URL(base).origin && !isPublicMapRequest(r.url()))unexpected.push(r.url());});
   page.on('pageerror',e=>errors.push(e.message));
   for(const url of urls) {
    await page.goto(base+url);
    for(const type of ['ad','affiliate','sponsor']) {
     const box=page.locator(`[data-monetization="${type}"]`);
     assert.equal(await box.count(),1,`${type} on ${url}`);
     assert(await box.isVisible());
     assert((await box.locator('.demo-label').innerText()).includes('DEMO'));
     const link=box.locator('[data-monetization-open]');
     await link.focus();await page.keyboard.press('Enter');
     assert(await page.locator('#monetization-demo-dialog').isVisible());
     assert((await page.locator('#monetization-demo-title').innerText()).toLowerCase().includes(type==='ad'?'advertisement':type==='sponsor'?'sponsorship':type));
     assert.equal(await page.locator('#monetization-demo-dialog :focus').getAttribute('aria-label'),'Close placement demo');
     await page.keyboard.press('Escape');
     assert.equal(await page.locator(':focus').getAttribute('data-monetization-open'),type);
    }
    assert((await page.locator('[data-monetization-open="affiliate"]').getAttribute('rel')).includes('sponsored'));
    assert.equal(await page.locator('h1').count(),1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${url} ${width} overflow`);
    assert(await page.locator('[id]').evaluateAll(els=>new Set(els.map(e=>e.id)).size===els.length));
    assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
    assert.equal((await context.cookies()).length,0);
   }
   await page.goto(base+'/');
   await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:`screenshots/monetization/home-${width}.png`,fullPage:true});
   await page.locator('.demo-partners').screenshot({path:`screenshots/monetization/partners-${width}.png`});
   const requests=[];page.on('request',r=>requests.push(r.url()));
   for(const type of ['ad','affiliate','sponsor']) {
    await page.locator(`[data-monetization-open="${type}"]`).click();
    await page.locator('.demo-close').click();
   }
   assert.deepEqual(requests,[],'Demo clicks must not make network requests');
   await page.emulateMedia({media:'print'});
   assert.equal(await page.locator('.demo-ad').isVisible(),false);
   assert.equal(await page.locator('.demo-partners').isVisible(),false);
   assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
   checks.push({width,pages:urls.length,disclosures:true,keyboardDialogFocus:true,clickRequests:0,storage:0,cookies:0,printPlacements:false});
   await context.close();
   console.log(`${width}px: ${urls.length} pages; all three demo types, keyboard, focus, privacy and print passed`);
  }
  const nojs=await browser.newContext({javaScriptEnabled:false});
  const p=await nojs.newPage();await p.goto(base+'/');
  await p.locator('[data-monetization-open="affiliate"]').click();
  assert(p.url().endsWith('#monetization-demo-details'));
  assert(await p.locator('#monetization-demo-details').isVisible());
  await nojs.close();
  const offline=fs.readFileSync('downloads/ferdant-california-2026-11-02.html','utf8');
  assert(!/data-monetization|monetization-demo|monetization\.(?:css|js)/.test(offline),'Offline resource file must exclude commercial placements and assets');
  fs.writeFileSync('screenshots/monetization/verification.json',JSON.stringify({checks,noJavaScriptFallback:true,offlinePlacements:false,liveCommercialServices:false},null,2)+'\n');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
