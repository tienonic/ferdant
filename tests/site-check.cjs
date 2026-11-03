const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const checkWidgets = require('./widgets.cjs');
const checkFormPrivacy = require('./form-privacy.cjs');
const checkPortal = require('./portal.cjs');
const checkAccessibility = require('./accessibility.cjs');
const checkCostPreview = require('./cost-preview.cjs');
const checkOffline = require('./offline.cjs');
const checkPhoneDirectory = require('./phone-directory.cjs');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const production = process.env.SITE_MODE === 'production';
const urls = [...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname).concat('/404.html');
const branches = ['KeepUsConnected','WhoCanFixThis','KeepTheBasicsOn','WhatAmIPayingFor','PlanForDisruption'];
function browserPath() {
 if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
 if (process.platform !== 'win32') return undefined;
 const root = path.join(process.env.LOCALAPPDATA,'ms-playwright');
 if (!fs.existsSync(root)) return undefined;
 return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(p=>fs.existsSync(p));
}
(async()=>{
 fs.mkdirSync('screenshots',{recursive:true});
 const browser=await chromium.launch({executablePath:browserPath()});
 const findings=[];
 try {
  const titles=new Set(),descriptions=new Set();
  for(const width of [320,390,768,1440]) {
   const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
   const page=await context.newPage();const errors=[],commerceRequests=[],externalRequests=[];page.on('request',r=>{if(/^https?:/.test(r.url()) && new URL(r.url()).origin!==new URL(base).origin)externalRequests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/shopify|commerce\.json/i.test(r.url()))commerceRequests.push(r.url());});
   for(const url of urls) {
    const response=await page.goto(base+url);assert.equal(response.status(),200,url);
    assert.equal(await page.locator('h1').count(),1,url);
    assert(await page.locator('h1').isVisible(),url);
    assert(await page.locator('[id]').evaluateAll(els=>new Set(els.map(el=>el.id)).size===els.length),`Duplicate IDs on ${url}`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${url} overflows at ${width}`);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://ferdant.com'+url);
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),production && url!='/404.html'?'index,follow':'noindex,follow');
    assert((await page.locator('meta[name=description]').getAttribute('content')).length>40);
    assert(await page.locator('script[type="application/ld+json"]').evaluate(el=>Array.isArray(JSON.parse(el.textContent))));
    if(width===1440){const title=await page.title(),description=await page.locator('meta[name=description]').getAttribute('content');assert(!titles.has(title),'Duplicate title');assert(!descriptions.has(description),'Duplicate description');titles.add(title);descriptions.add(description);}
    const links=await page.locator('a[href^="/"], a[href^="#"]').evaluateAll(els=>els.map(el=>el.getAttribute('href')));
    for(const link of links){const u=new URL(link,base+url);const target=path.join(process.cwd(),u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);assert(fs.existsSync(target),`Broken internal URL ${link} on ${url}`);if(u.hash){const text=fs.readFileSync(target,'utf8');assert(text.includes(`id="${u.hash.slice(1)}"`),`Broken fragment ${link}`);}}
   }
   await page.goto(base+'/');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').innerText(),'Skip to content');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main');
   await page.evaluate(()=>document.fonts.ready);const loadedFonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family));assert(loadedFonts.includes('Newsreader'));assert(loadedFonts.includes('Public Sans'));
   await checkPortal(page);
   await checkPhoneDirectory(page,width);
   await checkCostPreview(page,width);
   await checkAccessibility(page,width);
   await page.getByRole('navigation',{name:'Quick tools'}).getByRole('link',{name:'Compare a bill'}).click();
   await page.getByLabel('Previous bill ($)').fill('60');await page.getByLabel('Current bill ($)').fill('75');await page.getByRole('button',{name:'Compare the totals'}).click();assert((await page.locator('#bill-result').innerText()).includes('$15.00 (25.0%) higher'));
   await page.getByLabel('Previous bill ($)').fill('0');await page.getByRole('button',{name:'Compare the totals'}).click();assert((await page.locator('#bill-result').innerText()).includes('$75.00 higher'));assert(!(await page.locator('#bill-result').innerText()).includes('%'));
   await page.getByRole('button',{name:'Close tool',exact:true}).click();
   await checkWidgets(page, width, base);
   assert.equal(await page.locator('[data-portal-card] > summary').count(),5);
   if(width<700){await page.getByText('Menu',{exact:true}).click();assert(await page.getByRole('navigation',{name:'Mobile navigation'}).isVisible());await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Tools',exact:true}).click();}else{await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Tools',exact:true}).click();}
   assert.equal(new URL(page.url()).pathname,'/');assert(page.url().endsWith('#tools'));await page.goto(base+'/guides/');
   await page.getByLabel('Find a guide').fill('cancel');assert.equal(await page.locator('.guide-card:visible').count(),1);assert.equal(await page.locator('#search-status').innerText(),'1 guide');
   await page.getByLabel('Find a guide').fill('zzzz');assert(await page.locator('#no-results').isVisible());await page.getByLabel('Find a guide').fill('');assert.equal(await page.locator('.guide-card:visible').count(),3);
   await page.goto(base+'/what-am-i-paying-for/guides/why-did-my-bill-go-up/');assert(await page.locator('.quick-answer').isVisible());assert.equal(await page.locator('.quick-answer li').count(),4);assert.equal(await page.locator('.guide-step[open]').count(),0);await page.locator('.guide-step summary').first().click();assert(await page.locator('.guide-step .step-detail').first().isVisible());await page.locator('.guide-step summary').first().click();await page.getByRole('link',{name:'Compare your bills',exact:false}).click();assert(page.url().endsWith('#quick-tool'));
   for(const [previous,current,expected] of [['60','75','$15.00 (25.0%) higher'],['100','75','$25.00 (25.0%) lower'],['0','15','$15.00 higher'],['15','15','totals are the same']]){await page.getByLabel('Previous bill ($)').fill(previous);await page.getByLabel('Current bill ($)').fill(current);await page.getByRole('button',{name:'Compare the totals'}).click();assert((await page.locator('#bill-result').innerText()).includes(expected));}
   await page.getByRole('button',{name:'Copy the starting point'}).click();await page.waitForFunction(()=>document.querySelector('.copy-status').textContent.length>0);assert((await page.locator('.copy-status').innerText()).startsWith('Copied.'),await page.locator('.copy-status').innerText());assert((await page.evaluate(()=>navigator.clipboard.readText())).includes('[service]'));
   for(const url of ['/', '/guides/','/what-am-i-paying-for/guides/why-did-my-bill-go-up/']) {await page.goto(base+url);const name=url==='/'?'home':url==='/guides/'?'library':'guide';await page.screenshot({path:`screenshots/${name}-${width}.png`,fullPage:true});}
   await page.goto(base+'/');await page.screenshot({path:`screenshots/directory-top-${width}.png`});
   assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[],'Pages must not fetch external fonts, favicons or services');assert.deepEqual(commerceRequests,[],'Commerce must make no background requests');assert.equal(await page.locator('shopify-store,shopify-context,shopify-cart,[data-commerce]').count(),0);findings.push({width,pages:urls.length,result:'passed'});await context.close();console.log(`${width}px: ${urls.length} pages, navigation, search, calculator and clipboard passed`);
  }
  const offline=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce',viewport:{width:390,height:844}});const p=await offline.newPage();await p.goto(base+'/');assert.equal(await p.locator('.directory-topic:visible').count(),5);assert.equal(await p.locator('.directory-tool:visible').count(),0);assert.equal(await p.locator('[data-portal-card][open]').count(),0);await p.locator('#who-can-fix-this > summary').click();assert(await p.locator('#who-can-fix-this .portal-list').isVisible());await p.locator('#what-am-i-paying-for > summary').click();await p.getByRole('navigation',{name:'Quick tools'}).getByRole('link',{name:'Draft a billing message'}).click();assert(p.url().includes('/guides/write-a-billing-question/'));assert(await p.locator('#message-template').isVisible());await p.goto(base+'/what-am-i-paying-for/guides/why-did-my-bill-go-up/');assert(await p.locator('#quick-tool noscript p').isVisible());await p.goto(base+'/guides/');assert.equal(await p.locator('.guide-card').count(),3);assert(!await p.locator('[data-search-controls]').isVisible());await p.locator('.guide-card').first().click();await p.locator('#sources summary').click();assert(await p.locator('#sources a').first().isVisible());await p.locator('.guide-step summary').first().click();assert(await p.locator('.guide-step .step-detail').first().isVisible());await offline.close();
  for(const branch of branches){const slug=branch.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase();const slugMap={keepusconnected:'keep-us-connected',whocanfixthis:'who-can-fix-this',keepthebasicson:'keep-the-basics-on',whatamipayingfor:'what-am-i-paying-for',planfordisruption:'plan-for-disruption'};const key=branch.toLowerCase();const text=fs.readFileSync(path.join(slugMap[key],'index.html'),'utf8');assert(text.includes(`https://www.reddit.com/r/${branch}/`));}
  fs.writeFileSync('screenshots/verification.json',JSON.stringify({checkedAt:new Date().toISOString(),findings,noJavaScript:'passed',homeCalculator:'passed',inlineCostTool:'passed',singlePageDirectory:'passed',categoryPortal:'passed',directoryToolDialogs:'passed',directoryAccessibility:'passed',cornerBadges:'removed',directorySearch:'passed',destinationFavicons:'19 locally served images decoded',externalPageRequests:0,sectionNavigation:'passed',interactiveWidgets:'passed',widgetInteractionRequests:0,widgetStorage:'none',selfHostedFonts:'passed',commerceRequests:0,commerceUI:false,quickAnswers:'passed',mode:production?'production':'preview',published:false},null,2));
  await checkFormPrivacy(browser, base);
  await checkOffline(browser, base);
  console.log('No-JavaScript reading, source access and form privacy passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
