const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {stubPublicMap,isPublicMapRequest}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const catalog=JSON.parse(fs.readFileSync('content/disaster-affiliates.json','utf8'));
const plans=JSON.parse(fs.readFileSync('local/index.html','utf8').match(/<script type="application\/json" id="resource-map-data">(.*?)<\/script>/s)[1]).disasters.plans;
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r.hidden&&!r.hasAttribute('aria-busy')&&r.dataset.hazardLoading!=='true';});}
async function offerReady(p,id){await p.waitForFunction(h=>document.querySelector('[data-monetization="affiliate"]')?.dataset.affiliateHazard===h,id);}
(async()=>{
 assert.deepEqual(Object.keys(catalog.offers).sort(),plans.map(p=>p.id).sort());
 assert.equal(new Set(Object.values(catalog.offers).map(p=>p.sku)).size,15);
 assert(!fs.readFileSync('index.html','utf8').includes('id="disaster-affiliate-data"'),'Only the city page needs the offer catalog');
 const browser=await chromium.launch({executablePath:executable()}),findings=[];
 fs.mkdirSync('screenshots/disaster-affiliates',{recursive:true});
 try{
  for(const width of [320,390,768,1440]){
   const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await stubPublicMap(c);
   const p=await c.newPage(),errors=[],unexpected=[];
   p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin&&!isPublicMapRequest(r.url()))unexpected.push(r.url());});
   await p.goto(base+'/local/?place=57026');await ready(p);await offerReady(p,'everyday');
   const card=p.locator('[data-monetization="affiliate"]'),links=new Set();
   assert.equal(await card.count(),1);assert(await p.locator('.demo-disaster-slot > [data-monetization="affiliate"]').count());
   for(const plan of plans){
    await p.locator(`[data-disaster="${plan.id}"]`).click();await ready(p);await offerReady(p,plan.id);
    const offer=catalog.offers[plan.id];assert.equal(await card.locator('h3').innerText(),offer.title);
    assert.equal(await card.getAttribute('data-affiliate-sku'),offer.sku);
    assert.equal(await card.locator('img').getAttribute('src'),offer.image);
    await card.scrollIntoViewIfNeeded();await p.waitForFunction(()=>{const img=document.querySelector('[data-monetization="affiliate"] img');return img.complete&&img.naturalWidth>0;});
    assert((await card.locator('.demo-label').innerText()).includes('DEMO'));
    const link=card.locator('[data-monetization-open="affiliate"]'),destination=new URL(await link.getAttribute('href'),base);
    assert.equal(destination.searchParams.get('demo-product'),offer.sku);assert.equal(destination.searchParams.get('hazard'),plan.id);assert.equal(destination.searchParams.get('place'),'57026');links.add(destination.href);
    await link.click();assert(await p.locator('#monetization-demo-dialog').isVisible());
    assert((await p.locator('#monetization-demo-offer').innerText()).includes(offer.sku));
    assert((await p.locator('#monetization-demo-offer').innerText()).includes(offer.price));
    await p.keyboard.press('Escape');assert.equal(await p.locator(':focus').getAttribute('data-monetization-open'),'affiliate');
    assert.equal(await p.locator('[data-monetization="affiliate"]').count(),1);
    assert.equal(await p.locator('#atlas-place-list [data-monetization]').count(),0);
    assert.equal(await p.locator('.disaster-steps li').count(),3);
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(width===390&&['earthquake','heat','avalanche'].includes(plan.id)||width===1440&&plan.id==='earthquake')await card.screenshot({path:`screenshots/disaster-affiliates/${plan.id}-${width}.png`});
   }
   assert.equal(links.size,15);
   await p.locator('#phone-city').selectOption('38001',{force:true});await ready(p);
   assert.equal(new URL(await card.locator('[data-monetization-open]').getAttribute('href'),base).searchParams.get('place'),'38001');
   await p.locator('#atlas-everyday').click();await offerReady(p,'everyday');assert.equal(await card.locator('h3').innerText(),'The Everyday Pouch');
   await p.goto(base+'/local/?place=57026&hazard=earthquake');await ready(p);await offerReady(p,'earthquake');
   await p.emulateMedia({media:'print'});assert(!await p.locator('.demo-disaster-slot').isVisible());await p.emulateMedia({media:'screen'});
   assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);findings.push({width,offers:15,uniqueLinks:15,photosLoaded:true,detailsMatch:true,oneAffiliateCard:true,cityChange:true,deepLink:true,everydayReset:true,printHidden:true});await c.close();
  }
  const c=await browser.newContext();await stubPublicMap(c);const p=await c.newPage();
  for(const plan of plans){await p.goto(base+'/local/?place=57026&hazard='+plan.id);await ready(p);await offerReady(p,plan.id);}
  await c.close();
  const offline=fs.readFileSync('downloads/ferdant-california-2026-11-02.html','utf8');assert(!/disaster-affiliate-data|data-affiliate-sku|data-monetization/.test(offline));
  fs.writeFileSync('screenshots/disaster-affiliates/verification.json',JSON.stringify({findings,all15DirectLinks:true,offlineOffers:false,liveAffiliateServices:false,fixtures:'Official map feeds stubbed for UI tests'},null,2)+'\n');
  console.log('All 15 disaster affiliate examples passed at four widths, city changes, direct links, photos, details, Everyday reset and ad-free offline export.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
