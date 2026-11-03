const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = async function checkLocationFlow(page,width) {
 await page.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
 const data=JSON.parse(fs.readFileSync('content/regions.json','utf8'));
 const places=JSON.parse(fs.readFileSync('content/california-cities.json','utf8'));
 const city=page.getByLabel('City or county in California',{exact:true});
 const requests=[],listener=request=>requests.push(request.url());
 const unknown=places.cities.find(row=>!data.cityContacts[row[0]] && !data.countyContacts[row[2]].length);
 assert(unknown,'A coverage-gap case is needed');
 const cases=['57026','38001','19050','county:57',unknown[0]];
 assert(await city.isVisible());
 assert.equal(await city.locator('option').count(),542);
 assert(!await page.locator('#location-resources').isVisible());
 const order=await page.evaluate(()=>({location:document.querySelector('#location-start').getBoundingClientRect().bottom,resources:document.querySelector('.resource-heading').getBoundingClientRect().top}));
 assert(order.location<order.resources,'Location must come before resource browsing');
 await page.locator('#location-start').scrollIntoViewIfNeeded();
 assert(await page.locator('#location-start [data-city-download]').isVisible());
 page.on('request',listener);
 try {
  for(const key of cases) {
   await city.selectOption(key);
   const row=places.cities.find(row=>row[0]===key),county=row?row[2]:key.slice(7);
   const countyIds=data.countyContacts[county];
   const expected=[...new Set([...(countyIds.length?countyIds:['211-routing']),...(data.cityContacts[key]||[])])];
   assert.equal(await page.locator('#phone-city').inputValue(),key);
   assert(await page.locator('#location-resources').isVisible());
   assert.deepEqual(await page.locator('#location-links > li').evaluateAll(items=>items.map(item=>item.dataset.localContact)),expected);
   for(const id of expected) {
    const item=page.locator(`[data-local-contact="${id}"]`);
    assert.equal(await item.locator('h3 a').getAttribute('href'),data.sources[data.contacts[id].source].url);
    assert.deepEqual(await item.locator('a[href^="tel:"]').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),data.contacts[id].phones.map(ref=>'tel:'+data.numbers[ref.number].tel));
   }
   assert.equal(await page.locator('.phone-directory[open]').count(),0);
   assert.equal(await page.locator('#city-map .leaflet-control-zoom').count(),1,'Selections must reuse the location map');
   assert((await page.locator('#location-start [data-city-download]').innerText()).includes('offline'));
   if(!data.cityContacts[key] && row)assert((await page.locator('#location-coverage').innerText()).includes('not been checked'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Local contacts overflow at ${width}`);
  }
  await page.getByLabel('Search for your city',{exact:true}).fill('Davis');
  await page.getByRole('button',{name:'Find city',exact:true}).click();
  assert.equal(await city.inputValue(),'57026');
  await page.getByLabel('Search for your city',{exact:true}).fill('San');
  await page.getByLabel('Search for your city',{exact:true}).press('Enter');
  assert.equal(await city.inputValue(),'57026','Ambiguous search must not change the selection');
  assert((await page.locator('#city-map-status').innerText()).includes('No city changed'));
  await city.selectOption('county:57');
  await page.locator('#city-map [data-city-id="57026"]').click();
  assert.equal(await city.inputValue(),'57026');
  assert.equal(await page.getByLabel('Search for your city',{exact:true}).inputValue(),'Davis');

  assert((await page.locator('[data-local-contact="davis-water"]').innerText()).includes('After hours'));
  assert((await page.locator('[data-local-contact="pge-outage"]').innerText()).includes('PG&E customers only'));
  await page.locator('.location-notes > summary').click();
  const notes=await page.locator('#location-notes').innerText();
  assert(notes.includes(data.contacts['davis-bill'].detail));
  assert(notes.includes('Publisher date:'));
  await page.locator('.location-notes > summary').click();
  await page.locator('#location-start').screenshot({path:`screenshots/location-controls-${width}.png`});
  await page.locator('#location-resources').screenshot({path:`screenshots/location-results-${width}.png`});
  await city.selectOption('');
  assert(!await page.locator('#location-resources').isVisible());
  assert.equal(await page.locator('#location-links > li').count(),0,'Clearing must remove stale local contacts');
  assert.equal(await page.locator('#phone-rows tr').count(),data.statewide.length);
  assert.deepEqual(requests,[],'Location choices and local summaries must not request or send data');
  assert(await page.evaluate(()=>localStorage.length===0 && sessionStorage.length===0));
 } finally {page.off('request',listener);}
 const file='screenshots/location-flow.json';
 const receipt=width===320?[]:JSON.parse(fs.readFileSync(file,'utf8'));
 receipt.push({width,locationFirst:true,checkedCases:cases,localContacts:'exact saved city/county projection',coverageGaps:'visible',phoneSynchronization:'passed',requests:requests.length,storage:'none'});
 fs.writeFileSync(file,JSON.stringify(receipt,null,2));
};
