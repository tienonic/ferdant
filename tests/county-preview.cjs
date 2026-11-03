const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const {stubPublicMap}=require('./map-network.cjs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
function executable(){if(process.env.CHROME_PATH)return process.env.CHROME_PATH;if(process.platform!=='win32')return;const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');return fs.readdirSync(root).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(root,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(fs.existsSync);}
async function mapReady(p){await p.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');}
async function blue(county){assert.equal(await county.getAttribute('fill'),'#4289d6');}
(async()=>{
 fs.mkdirSync('screenshots/county-preview',{recursive:true});const b=await chromium.launch({executablePath:executable()});
 try{
  const desktop=await b.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await stubPublicMap(desktop);const p=await desktop.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/');await mapReady(p);await p.locator('[data-location-kind="county"]').click();const county=p.locator('[data-county-id="57"]');
  await p.locator('#location-start').scrollIntoViewIfNeeded();await county.hover();await blue(county);await p.screenshot({path:'screenshots/county-preview/desktop-hover.png',clip:await p.locator('#location-start').boundingBox()});
  await p.mouse.move(1,1);assert.equal(await county.getAttribute('fill'),'#ffffff');
  // Every polygon is wired; actual pointer entry/exit is checked above.
  const coverage=await p.locator('[data-county-id]').evaluateAll(els=>els.map(el=>{el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));const blue=el.getAttribute('fill')==='#4289d6';el.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));return {county:el.dataset.countyId,blue,reset:el.getAttribute('fill')==='#ffffff'};}));assert.equal(coverage.length,58);assert(coverage.every(row=>row.blue&&row.reset));
  await county.click();await p.waitForURL('**/local/?place=county%3A57');await p.locator('.change-location > summary').click();await mapReady(p);
  const selected=p.locator('[data-county-id="57"]');await selected.hover();await blue(selected);await p.mouse.move(1,1);assert.equal(await selected.getAttribute('fill'),'#dcebe7');assert.deepEqual(errors,[]);await desktop.close();
  const mobile=await b.newContext({viewport:{width:390,height:1000},isMobile:true,hasTouch:true,acceptDownloads:true,reducedMotion:'reduce'});await stubPublicMap(mobile);const m=await mobile.newPage(),mobileErrors=[];m.on('pageerror',e=>mobileErrors.push(e.message));
  await m.goto(base+'/');await mapReady(m);await m.locator('[data-location-kind="county"]').tap();const yolo=m.locator('[data-county-id="57"]'),kern=m.locator('[data-county-id="15"]');
  const initialCountyWidth=(await kern.boundingBox()).width;
  await yolo.tap();await blue(yolo);assert.equal(new URL(m.url()).pathname,'/');assert(await m.locator('#county-preview').isVisible());assert((await m.locator('#county-preview strong').innerText()).includes('Yolo'));
  await kern.tap();await blue(kern);assert.equal(await yolo.getAttribute('fill'),'#ffffff');assert((await m.locator('#county-preview strong').innerText()).includes('Kern'));assert.equal(await m.locator('[data-county-id][fill="#4289d6"]').count(),1);
  assert(Math.abs((await kern.boundingBox()).width-initialCountyWidth)<2,'Quick county previews must not trigger double-tap zoom');
  await m.locator('#location-start').screenshot({path:'screenshots/county-preview/phone-tap.png'});
  // A touch pan clears the preview and keeps the user on the map.
  const bounds=await m.locator('#city-map').boundingBox(),session=await mobile.newCDPSession(m);const x=bounds.x+20,y=bounds.y+bounds.height/2;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*10,y:y+10}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(!await m.locator('#county-preview').isVisible());assert.equal(new URL(m.url()).pathname,'/');
  await m.locator('[data-location-kind="city"]').tap();assert.equal(await m.locator('[data-city-id]').count(),483);await m.locator('[data-location-kind="county"]').tap();await m.locator('[data-county-id="57"]').tap();await m.locator('#county-preview button').tap();await m.waitForURL('**/local/?place=county%3A57');
  // The feature also ships in the actual offline HTML, with touch selection local.
  const download=m.waitForEvent('download');await m.locator('#offline-download [data-city-download]').click();const file=path.resolve('screenshots/county-preview/yolo-offline.html');await (await download).saveAs(file);
  const offline=await b.newContext({viewport:{width:390,height:1000},isMobile:true,hasTouch:true,offline:true}),f=await offline.newPage(),network=[];f.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});await f.goto(pathToFileURL(file).href);await f.locator('.change-location > summary').tap();await mapReady(f);const offCounty=f.locator('[data-county-id="57"]');await offCounty.tap();await blue(offCounty);assert(await f.locator('#county-preview').isVisible());await f.locator('#county-preview button').tap();assert.equal(await f.locator('#phone-city').inputValue(),'county:57');assert(!await f.locator('#county-preview').isVisible());assert.deepEqual(network,[]);await offline.close();assert.deepEqual(mobileErrors,[]);await mobile.close();
  fs.writeFileSync('screenshots/county-preview/verification.json',JSON.stringify({desktopHover:true,polygons:coverage,leaveRestoresSelection:true,mobileTouchPreview:true,confirmNavigates:true,panClearsPreview:true,cityModeRestoresMarkers:483,actualOfflineTouch:true,offlineHTTP:0},null,2)+'\n');console.log('County blue hover, all 58 resets, mobile preview/confirm/pan and actual offline touch passed.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
