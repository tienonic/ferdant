const assert=require('node:assert/strict');
const fs=require('node:fs');
module.exports=async function checkLocationFlow(page,width){
 const base=new URL(page.url()).origin;
 const data=JSON.parse(fs.readFileSync('content/regions.json','utf8'));
 const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
 const valid=new Set([...places.cities.map(row=>row[0]),...Object.keys(places.counties).map(id=>'county:'+id)]);
 const input=page.getByRole('combobox',{name:'Search California cities or counties'});
 assert.equal(await page.locator('#location-city, #location-start select').count(),0,'The top location dropdown is removed');
 await input.fill('D');
 assert(await page.getByRole('listbox',{name:'California locations'}).isVisible());
 assert((await page.locator('#location-suggestions [role=option]').count())>0);
 for(const item of await page.locator('#location-suggestions [role=option]').all()){assert((await item.innerText()).includes('California'));assert(valid.has(await item.getAttribute('data-place-key')));}
 await input.fill('Da');assert(await page.getByRole('option',{name:'Davis, Yolo County, California',exact:true}).isVisible());
 await page.screenshot({path:`screenshots/california-autocomplete-${width}.png`});
 await input.press('ArrowDown');assert(await input.getAttribute('aria-activedescendant'));
 await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');
 await input.fill('New York');assert.equal(await page.locator('#location-suggestions [role=option]').count(),0);assert.equal(new URL(page.url()).pathname,'/');
 await input.fill('Davis');await page.getByRole('button',{name:'Search',exact:true}).click();await page.waitForURL('**/local/?place=57026');
 assert((await page.locator('h1').innerText()).includes('Davis'));
 assert(await page.locator('#offline-download').isVisible());assert(await page.locator('#download-infographic').isVisible());
 await page.waitForFunction(()=>document.querySelector('#infographic-preview').naturalWidth>0);
 const cases=['57026','38001','19050','county:57','25071'];
 for(const key of cases){
  await page.goto(base+'/local/?place='+encodeURIComponent(key));
  const row=places.cities.find(row=>row[0]===key),county=row?row[2]:key.slice(7),countyIds=data.countyContacts[county];
  const expected=[...new Set([...(countyIds.length?countyIds:['211-routing']),...(data.cityContacts[key]||[])])];
  assert.deepEqual(await page.locator('#location-links > li').evaluateAll(items=>items.map(item=>item.dataset.localContact)),expected);
  assert.equal(await page.locator('#phone-city').inputValue(),key);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.goto(base+'/local/?place=57026');await page.locator('.change-location > summary').click();
 const localInput=page.getByRole('combobox',{name:'Search California cities or counties'});
 await localInput.fill('San');await page.getByRole('button',{name:'Search',exact:true}).click();assert(new URL(page.url()).searchParams.get('place')==='57026');
 assert((await page.locator('#city-search-status').innerText()).includes('Several'));
 await localInput.fill('Yolo');await localInput.press('ArrowDown');await localInput.press('Enter');await page.waitForURL('**/local/?place=county%3A57');
 assert((await page.locator('h1').innerText()).includes('Yolo'));
 await page.goto(base+'/local/?place=not-a-place');assert((await page.locator('#local-page-intro').innerText()).includes('not found'));
 assert.equal(await page.locator('#phone-city').inputValue(),'');
 assert(await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
 const receiptPath='screenshots/location-flow.json',receipt=width===320?[]:JSON.parse(fs.readFileSync(receiptPath,'utf8'));
 receipt.push({width,californiaSuggestionsAfterOneLetter:true,dropdownRemoved:true,keyboardNavigation:'passed',resourcePage:'passed',checkedCases:cases,invalidLocation:'explicit fallback',storage:'none'});
 fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));
};
