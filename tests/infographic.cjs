const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

module.exports=async function checkInfographic(browser,base){
 const context=await browser.newContext({acceptDownloads:true,hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const data=JSON.parse(fs.readFileSync('content/regions.json','utf8'));
 const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
 await page.route('**/assets/vendor/leaflet/leaflet.js',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.getByRole('combobox',{name:'Search California cities or counties'}).fill('Davis');
 await page.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
 assert.equal(await page.locator('#map-city-search').inputValue(),'Davis','Loading the map must preserve typed text');
 await page.unroute('**/assets/vendor/leaflet/leaflet.js');
 await page.getByRole('combobox',{name:'Search California cities or counties'}).fill('Da');
 await page.getByRole('option',{name:'Davis, Yolo County, California',exact:true}).tap();
 await page.waitForURL('**/local/?place=57026');
 const longest=[...places.cities].sort((a,b)=>b[1].length-a[1].length)[0];
 const cases=['57026','38001','county:57','25071','',longest[0]],findings=[];
 for(const key of cases){
  await page.goto(base+'/local/'+(key?'?place='+encodeURIComponent(key):''));
  await page.waitForFunction(()=>document.querySelector('#infographic-preview').naturalWidth>0);
  const texts=await page.evaluate(key=>{
   const {svg}=window.FerdantInfographic.build(key),doc=new DOMParser().parseFromString(svg,'image/svg+xml');
   if(doc.querySelector('parsererror'))throw Error('Malformed SVG');
   return [...doc.querySelectorAll('text')].map(el=>el.textContent).join(' ');
  },key);
  const row=places.cities.find(row=>row[0]===key),county=row?row[2]:key.startsWith('county:')?key.slice(7):null;
  const expected=[...new Set([...data.statewide,...(data.countyContacts[county]||[]),...(data.cityContacts[key]||[])])];
  for(const id of expected){assert(texts.includes(data.contacts[id].title),id);for(const ref of data.contacts[id].phones)assert(texts.includes(data.numbers[ref.number].label));}
  assert(texts.includes(data.checked));
  if(key==='57026'){assert(texts.includes('PG&E customers only'));assert(texts.includes('After hours'));}
  const requests=[],listener=r=>{if(/^https?:/.test(r.url()))requests.push(r.url());};page.on('request',listener);
  const waiting=page.waitForEvent('download');await page.locator('#download-infographic').click();const file=await waiting;
  const saved=path.resolve('screenshots',file.suggestedFilename());await file.saveAs(saved);page.off('request',listener);
  const image=fs.readFileSync(saved);assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(image.readUInt32BE(16),1800);assert(image.readUInt32BE(20)>1000&&image.readUInt32BE(20)<10000);
  assert.deepEqual(requests,[],'Image exports must not request or send data');
  if(key==='57026'){
   await page.locator('#what-am-i-paying-for > summary').click();
   await page.getByRole('navigation',{name:'Quick tools'}).getByRole('link',{name:'Draft a billing message'}).click();
   await page.getByLabel('What needs explaining?').fill('PRIVATE-NOTE-EXCLUDED-FROM-IMAGE');
   await page.getByRole('button',{name:'Close tool',exact:true}).click();
   const next=page.waitForEvent('download');await page.locator('#download-infographic').click();const second=await next;
   const comparison=path.resolve('screenshots','private-input-image.png');await second.saveAs(comparison);
   assert.deepEqual(fs.readFileSync(comparison),image,'Private notes must not alter the exported contact sheet');
   await page.locator('#offline-download').screenshot({path:'screenshots/infographic-download-mobile.png'});
  }
  findings.push({key,file:file.suggestedFilename(),width:image.readUInt32BE(16),height:image.readUInt32BE(20),bytes:image.length,contacts:expected.length,result:'passed'});
 }
 assert.deepEqual(errors,[]);assert(await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
 await context.close();
 fs.writeFileSync('screenshots/infographic-verification.json',JSON.stringify({touchSuggestion:'passed',publicDataOnly:true,privateInputs:'PNG bytes unchanged',findings},null,2));
};
