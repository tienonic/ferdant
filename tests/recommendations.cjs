const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
function browserPath(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function ready(p){await p.waitForFunction(()=>!document.querySelector('#recommendation-form fieldset').disabled);await p.waitForFunction(()=>{const r=document.querySelector('#resource-atlas');return !r||r.hidden||!r.hasAttribute('aria-busy');});}
async function publicBook(p){return p.evaluate(async()=>{const r=await window.FerdantBooklet.build('57026'),hash=await crypto.subtle.digest('SHA-256',await r.blob.arrayBuffer());return {hash:Array.from(new Uint8Array(hash)).join(','),sources:r.sourcesText};});}
(async()=>{
 fs.mkdirSync('screenshots/recommendations',{recursive:true});
 const browser=await chromium.launch({executablePath:browserPath()}),findings=[];
 try{
  for(const width of [320,390,768,1440]){
   const c=await browser.newContext({viewport:{width,height:960},acceptDownloads:true,reducedMotion:'reduce'});await stubPublicMap(c);
   await c.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedRecommendation=text;}}}));
   const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/local/?place=57026&private=QUERY-MUST-NOT-ENTER-DRAFT');await ready(p);await p.waitForLoadState('networkidle');
   if(width<=700){await p.locator('.mobile-menu > summary').focus();await p.keyboard.press('Enter');}
   const entry=p.getByRole('link',{name:'Suggest a resource',exact:true});assert(await entry.isVisible());assert(await entry.evaluate(el=>el.getBoundingClientRect().height>=44));
   await p.locator('.site-header').screenshot({path:'screenshots/recommendations/header-'+width+'.png'});
   await entry.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('#recommend-a-resource').open);assert.equal(await p.locator('#recommendation-area').inputValue(),'Davis, Yolo County');
   let downloads=0;p.on('download',()=>downloads++);await p.getByRole('button',{name:'Download draft (TXT)',exact:true}).click();assert.equal(downloads,0);assert(!(await p.locator('#recommendation-title').evaluate(el=>el.validity.valid)));
   const publicBefore=width===390?await publicBook(p):null;
   const marker='PRIVATE-RECOMMENDATION-DO-NOT-EXPORT';
   await p.locator('#recommendation-type').selectOption('correction');await p.locator('#recommendation-title').fill('Update the branch hours');await p.locator('#recommendation-detail').fill(marker+' — the posted hours differ from the provider page.');
   await p.locator('#recommendation-link').fill('javascript:alert(1)');await p.getByRole('button',{name:'Download draft (TXT)',exact:true}).click();assert.equal(downloads,0);assert(!(await p.locator('#recommendation-link').evaluate(el=>el.validity.valid)));
   await p.locator('#recommendation-link').fill('https://example.org/public-hours');
   const requests=[];p.on('request',r=>requests.push(r.url()));
   const wait=p.waitForEvent('download');await p.getByRole('button',{name:'Download draft (TXT)',exact:true}).click();const dl=await wait,file=path.resolve('screenshots/recommendations','draft-'+width+'.txt');await dl.saveAs(file);const text=fs.readFileSync(file,'utf8');
   assert(text.includes('NOT SUBMITTED')&&text.includes(marker)&&text.includes('Davis, Yolo County')&&text.includes('Correct a listing'));assert(!text.includes('QUERY-MUST-NOT-ENTER-DRAFT'));assert(!text.includes('file:///'));assert((await p.locator('#recommendation-status').innerText()).includes('has not been sent'));
   await p.getByRole('button',{name:'Copy draft',exact:true}).click();assert.equal(await p.evaluate(()=>window.copiedRecommendation),text);assert.deepEqual(requests,[],'Draft input/copy/download must not make requests');
   assert(await p.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
   await p.locator('#recommend-a-resource').screenshot({path:'screenshots/recommendations/form-'+width+'.png'});
   if(width===390){
    assert.deepEqual(await publicBook(p),publicBefore,'Recommendation notes must not enter the resource PDF or source TXT');
    const saved=p.waitForEvent('download');await p.locator('#offline-download [data-city-download]').click();const offlineDownload=await saved,offlineFile=path.resolve('screenshots/recommendations/davis-offline.html');await offlineDownload.saveAs(offlineFile);assert(!fs.readFileSync(offlineFile,'utf8').includes(marker));
    const off=await browser.newContext({offline:true,viewport:{width,height:960},acceptDownloads:true}),o=await off.newPage(),offRequests=[];o.on('request',r=>{if(/^https?:/.test(r.url()))offRequests.push(r.url());});await o.goto(pathToFileURL(offlineFile).href);await ready(o);await o.locator('.mobile-menu > summary').click();await o.getByRole('link',{name:'Suggest a resource',exact:true}).click();assert.equal(await o.locator('#recommendation-title').inputValue(),'');await o.locator('#recommendation-title').fill('Add a public pantry');await o.locator('#recommendation-detail').fill('Include the official pickup page.');const offWait=o.waitForEvent('download');await o.getByRole('button',{name:'Download draft (TXT)',exact:true}).click();const offDl=await offWait;assert.equal(offDl.suggestedFilename(),'ferdant-recommendation-draft.txt');assert.deepEqual(offRequests,[]);await off.close();
   }
   await p.getByRole('button',{name:'Clear',exact:true}).click();assert.equal(await p.locator('#recommendation-title').inputValue(),'');
   await p.locator('#phone-city').selectOption('38001',{force:true});await ready(p);assert.equal(await p.locator('#recommendation-area').inputValue(),'San Francisco, San Francisco County');
   await p.locator('#recommendation-area').fill('All California');await p.locator('#phone-city').selectOption('57026',{force:true});await ready(p);assert.equal(await p.locator('#recommendation-area').inputValue(),'All California');
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);findings.push({width,headerEntryVisible:true,keyboardOpen:true,downloadAndCopy:'local, not submitted',inputNetworkRequests:0,storage:0,invalidInput:'blocked',locationContext:'prefilled; edits preserved',errors});await c.close();
  }
  const nojs=await browser.newContext({javaScriptEnabled:false}),p=await nojs.newPage();await p.goto(base+'/');assert(await p.getByRole('link',{name:'Suggest a resource',exact:true}).isVisible());await p.locator('#recommend-a-resource > summary').click();assert(await p.locator('#recommendation-title').isDisabled());assert(await p.locator('#recommendation-form fieldset').evaluate(el=>el.disabled));assert(await p.locator('#recommend-a-resource noscript').isVisible());await nojs.close();
  fs.writeFileSync('screenshots/recommendation-verification.json',JSON.stringify({checkedUTC:new Date().toISOString(),fixtures:'External map feeds/tiles simulated; recommendations have no endpoint',findings,offlineDraftDownload:'passed, zero HTTP',privateDraftExportExclusion:'PDF hash and source TXT unchanged; HTML blank',noScript:'visible entry, explanatory note, disabled form'},null,2));
  console.log('Recommendations: visible header and keyboard entry at four widths; draft copy/download, invalid input, location context, no requests/storage, private-export exclusion, offline and no-JS states passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
