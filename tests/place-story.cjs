const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const scores=JSON.parse(fs.readFileSync('content/county-risk-scores.json','utf8'));
const cases=[['57026','Davis','57'],['19050','Los Angeles','19'],['county:57','Yolo County','57']];
const labels=['The place','What affects this area','How it compares','What to do first','What is near you','Keep it'];
function watchErrors(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});return errors;}
async function ready(page){await page.waitForSelector('.story-live');await page.waitForFunction(()=>document.querySelector('#resource-map')?.dataset.ready==='true'&&!document.querySelector('#resource-atlas').hasAttribute('aria-busy'));}
async function jump(page,step){await page.locator(`[data-story-jump="${step}"]`).focus();await page.keyboard.press('Enter');await page.waitForFunction(n=>document.querySelector('#resource-atlas').dataset.currentStep===String(n),step);}
async function foundation(page,width){
 await page.goto(base+'/');await page.waitForSelector('#city-map[data-ready]');await page.evaluate(()=>document.fonts.ready);
 const text=await page.locator('body').innerText();assert(!text.includes('Local resources. Emergency plans.'));assert(!text.includes('Links checked November 3, 2026.'));assert(text.includes('Eligibility and service areas vary.'));
 assert.equal(await page.locator('img[src*="photos"],.welcome-photos,.home-instructions').count(),0);
 assert.equal(await page.locator('h1').innerText(),'Where are you?');assert((await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Geist'));assert((await page.locator('#location-title').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Newsreader'));
 assert.equal(await page.locator('#city-map').evaluate(el=>getComputedStyle(el).viewTransitionName),'none');
 for(const mode of ['city','county','zip','state'])assert.equal(await page.locator(`[data-location-kind="${mode}"]`).count(),1);
 await page.locator('#map-city-search').focus();await page.keyboard.type('Davis');await page.keyboard.press('Enter');await page.waitForURL('**/local/?place=57026');await ready(page);
}
async function placeChecks(page,key,name,county,width){
 await page.goto(base+'/local/?place='+encodeURIComponent(key));await ready(page);
 assert.equal(await page.locator('h1').innerText(),name);
 assert.deepEqual(await page.locator('[data-story-step]').evaluateAll(els=>els.map(el=>Number(el.dataset.storyStep))),[1,2,3,4,5,6]);
 for(let n=1;n<=6;n++)assert((await page.locator(`[data-story-step="${n}"]`).getAttribute('aria-label'))===labels[n-1]||n===2);
 const expected=await page.evaluate(key=>window.FerdantRisk.ordered(key).filter(p=>p.risk.order<=1).slice(0,3).map(p=>p.id),key);
 assert.deepEqual(await page.locator('.story-hazard').evaluateAll(els=>els.map(el=>el.dataset.hazard)),expected);
 assert(await page.locator('.story-meter').evaluateAll(els=>els.every(el=>el.children.length===5)));
 const counter=page.locator('#story-comparison [data-source-field]'),field=await counter.getAttribute('data-source-field');
 assert.equal(Number(await counter.getAttribute('data-raw-value')),scores.counties[county][field]);const compare=scores.counties[county].comparison[field.replace('_RISKS','')];assert.equal(Number(await counter.getAttribute('data-below')),compare.below);assert.equal(Number(await counter.getAttribute('data-assessed')),compare.assessed);assert.equal(Number(await counter.innerText()),Math.floor(100*compare.below/compare.assessed));
 assert((await page.locator('#story-comparison').innerText()).includes(scores.counties[county].county+' County'));
 if(name==='Los Angeles')assert((await page.locator('#story-comparison').innerText()).includes('99% of assessed U.S. counties'));assert((await page.locator('#story-comparison').innerText()).includes('assessed U.S. counties'));
 const loss=page.locator('#story-loss'),lossField=await loss.getAttribute('data-source-field');assert.equal(Number(await loss.getAttribute('data-raw-value')),scores.counties[county][lossField]);
 if(county==='57')assert((await loss.innerText()).includes('$42 million'));
 assert((await page.locator('#story-stat-source').innerText()).includes('Relative risk, not a forecast'));assert((await page.locator('#story-stat-source').innerText()).includes('2024 dollars'));
 await jump(page,4);
 const top=await page.evaluate(key=>window.FerdantRisk.ordered(key).find(p=>p.risk.order<3),key);
 assert.equal(await page.locator('#story-plan-title').innerText(),top.headline);assert.deepEqual(await page.locator('#story-plan-steps li').allTextContents(),top.steps.map(s=>s.text));
 assert.equal(await page.locator('[data-disaster]').count(),14);assert(await page.locator('.atlas-choice').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height>=44)));
 const plan=page.locator('[data-disaster="flood"]');await plan.focus();await page.keyboard.press('Space');assert.equal(await plan.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#resource-atlas').getAttribute('data-layer'),'flood');assert(await plan.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));
 await jump(page,5);
 const facts=await page.evaluate(()=>window.FerdantResourceMap.storyFacts.items.map(f=>({id:f.id,kind:f.kind})));
 assert.equal(Number(await page.locator('#story-places-title').getAttribute('data-count')),facts.length);
 const categories=await page.locator('[data-story-kind]').evaluateAll(els=>els.map(el=>({kind:el.dataset.storyKind,count:Number(el.dataset.count)})));
 for(const category of categories)assert.equal(category.count,facts.filter(f=>f.kind===category.kind).length);
 assert.equal(categories.reduce((n,c)=>n+c.count,0),facts.length);
 if(categories.length){await page.locator('[data-story-kind]').first().click();assert(await page.locator('.atlas-category').first().evaluate(el=>el.open));assert.equal(await page.locator('#resource-atlas').getAttribute('data-layer'),'everyday');}
 await jump(page,6);
 for(const selector of ['#download-booklet','#download-infographic','#offline-download [data-city-download]']){const el=page.locator(selector);assert(await el.isVisible());await el.focus();assert(await el.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));}
 const contrast=await page.locator('.place-story').evaluate(root=>{const rgb=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number);const lum=c=>rgb(c).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);let minimum=100;for(const el of root.querySelectorAll('p,a,span,h1,h2,h3,li,button,summary,small')){if(!el.getClientRects().length||!el.childNodes.length||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;let parent=el,bg;while(parent){bg=getComputedStyle(parent).backgroundColor;if(!bg.includes('rgba')&&bg!=='transparent')break;parent=parent.parentElement;}bg=parent?bg:'rgb(251,252,250)';const a=lum(getComputedStyle(el).color),b=lum(bg);minimum=Math.min(minimum,(Math.max(a,b)+.05)/(Math.min(a,b)+.05));}return minimum;});assert(contrast>=4.5,'Story text contrast '+contrast);
 await jump(page,3);
 const map=await page.locator('#resource-map').boundingBox();assert(map.y>=-.1&&map.y<=1);
 if(width<=700)assert(Math.abs(map.height-900*.46)<1);else assert(Math.abs(map.width-await page.evaluate(()=>document.querySelector('#resource-atlas').getBoundingClientRect().width*.6))<2);
 assert.notEqual(await page.locator('#resource-atlas').getAttribute('data-playing'),'true');assert(await page.locator('.story-hazard').evaluateAll(els=>els.every(el=>getComputedStyle(el).opacity==='1'&&getComputedStyle(el).animationName==='none')));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${key} at ${width}`);
}
async function offlineCheck(browser,page){
 await page.goto(base+'/local/?place=57026');await ready(page);await jump(page,6);
 const pending=page.waitForEvent('download');await page.locator('#offline-download [data-city-download]').click();const download=await pending;
 const file=path.resolve('../shots/stage3/immersive-offline.html');await download.saveAs(file);
 const context=await browser.newContext({offline:true,reducedMotion:'reduce',viewport:{width:390,height:900}}),saved=await context.newPage(),requests=[],errors=watchErrors(saved);saved.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await saved.goto(pathToFileURL(file).href);await saved.waitForSelector('.story-static');assert.equal(await saved.locator('[data-story-step]').count(),6);assert((await saved.locator('#story-comparison').innerText()).includes('97%'));
 assert.notEqual(await saved.locator('#resource-atlas').getAttribute('data-playing'),'true');assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);assert(await saved.locator('#story-risk-scope a').evaluate(el=>el.href.startsWith('https://ferdant.com/')));await context.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,offline:true,viewport:{width:390,height:900}}),staticPage=await nojs.newPage();await staticPage.goto(pathToFileURL(file).href);assert.equal(await staticPage.locator('[data-story-step]:visible').count(),6);assert((await staticPage.locator('h1').innerText()).includes('Davis'));assert.equal(await staticPage.locator('.story-fallback-plans > details').count(),14);await nojs.close();
}
async function motionChecks(browser,width){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'});await stubPublicMap(context);const page=await context.newPage(),errors=watchErrors(page);
 await page.goto(base+'/');await page.waitForSelector('#city-map[data-ready]');assert.equal(await page.locator('#city-map').evaluate(el=>getComputedStyle(el).viewTransitionName),'place-map');
 await page.locator('#map-city-search').fill('Davis');await page.getByRole('option',{name:'Davis, Yolo County, California',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#city-map')?.dataset.travelling==='true');assert.equal(new URL(page.url()).pathname,'/');await page.waitForURL('**/local/?place=57026');await ready(page);assert.equal(await page.locator('#resource-atlas').getAttribute('data-playing'),'true');assert(await page.evaluate(()=>sessionStorage.length===0));
 await page.waitForFunction(()=>document.querySelector('#resource-atlas').dataset.currentStep==='3'&&document.querySelector('#resource-atlas').dataset.playing==='false',{timeout:12000});
 await page.waitForFunction(phone=>Math.abs(document.querySelector('#story-3').getBoundingClientRect().top-(phone?innerHeight*.46:0))<3,width<=700,{timeout:3000});assert(await page.locator('#story-scroll').isVisible());
 await page.goto(base+'/local/?place=57026');await ready(page);assert.notEqual(await page.locator('#resource-atlas').getAttribute('data-playing'),'true');
 for(const type of ['wheel','touchstart','keydown','pointerdown']){
  await page.evaluate(()=>sessionStorage.setItem('ferdant-just-chosen','57026'));await page.goto(base+'/local/?place=57026');await ready(page);assert.equal(await page.locator('#resource-atlas').getAttribute('data-playing'),'true');
  await page.evaluate(type=>document.body.dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Shift',bubbles:true}):type==='wheel'?new WheelEvent(type,{bubbles:true}):new Event(type,{bubbles:true})),type);
  assert.equal(await page.locator('#resource-atlas').getAttribute('data-playing'),'false');await page.waitForTimeout(1600);assert.equal(await page.locator('#resource-atlas').getAttribute('data-current-step'),'1');
 }
 assert.deepEqual(errors,[]);await context.close();
}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});try{
 for(const width of [320,390,768,1440]){const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});await stubPublicMap(context);const page=await context.newPage(),errors=watchErrors(page);await foundation(page,width);for(const args of cases)await placeChecks(page,...args,width);if(width===320){await page.goto(base+'/local/?place=57026');await ready(page);await page.locator('#phone-city').selectOption('',{force:true});assert(await page.locator('h1').isVisible());assert(await page.locator('.change-location > summary').isVisible());}if(width===390)await offlineCheck(browser,page);await page.goto(base+'/guides/');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();console.log(width+'px: six steps, data, maps, keyboard, downloads, reduced motion and overflow passed');}
 for(const width of [390,1440])await motionChecks(browser,width);
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),page=await context.newPage();await page.goto(base+'/local/');assert.equal(await page.locator('[data-story-step]:visible').count(),6);assert.equal(await page.locator('.story-fallback-plans > details').count(),14);await context.close();
 console.log('Place story: actual county fields, offline/no-JS reading, timed play, every input cancellation and direct visits passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
