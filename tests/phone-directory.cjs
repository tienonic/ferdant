const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = async function checkPhoneDirectory(page, width) {
 await page.goto(new URL('/local/',page.url()).href);
 await page.locator('.change-location > summary').click();
 await page.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
 const disclosure=page.locator('.phone-directory');
 assert.equal(await disclosure.getAttribute('open'),null,'Home phone dropdown starts closed');
 assert(!await page.locator('.phone-table').isVisible());
 assert.equal(await page.locator('#location-start #city-map').count(),1,'The map belongs to the location box');
 assert.equal(await page.locator('.phone-directory #city-map').count(),0);
 await page.locator('.phone-toggle').click();
 await page.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
 assert.equal(await page.evaluate(()=>L.version),'1.9.4');
 const network=[];const listener=r=>network.push(r.url());page.on('request',listener);
 try {
  const city=page.getByLabel('Your city in California',{exact:true});
  assert(await city.isVisible());
  assert.equal(await city.locator('option').count(),542);
  assert.equal(await page.locator('#phone-rows tr').count(),7);
  assert.equal(await page.locator('.phone-table a[href="tel:911"]').count(),0);
  assert(await page.locator('.phone-table a[href="tel:988"]').isVisible());
  assert(await page.locator('.phone-table a[href="tel:+18002221222"]').isVisible());
  await city.selectOption('57026');
  await city.selectOption('county:57');
  await page.locator('#city-map [data-city-id="57026"]').click();
  assert.equal(await city.inputValue(),'57026');
  await city.selectOption('57026');
  assert(await page.locator('[data-contact-id="davis-nonemergency"]').isVisible());
  assert(await page.locator('[data-contact-id="yolo-211"]').isVisible());
  await page.getByLabel('Find a service',{exact:true}).fill('water');
  assert.equal(await page.locator('#phone-rows tr:visible').count(),2);
  await page.getByLabel('Find a service',{exact:true}).fill('zzzz');
  assert(await page.locator('#phone-no-matches').isVisible());
  await page.getByLabel('Find a service',{exact:true}).fill('');
  await city.selectOption('38001');
  assert(await page.locator('[data-contact-id="sf-nonemergency"]').isVisible());
  assert.equal(await page.locator('[data-contact-id="davis-nonemergency"]').count(),0);
  await city.selectOption('county:57');
  assert(await page.locator('[data-contact-id="yolo-211"]').isVisible());
  assert.equal(await page.locator('[data-contact-id="davis-water"]').count(),0);
  await city.selectOption('36074'); // Adelanto has no checked municipal agency in this edition.
  assert((await page.locator('#phone-coverage').innerText()).includes('have not been checked'));
  assert.equal(await page.locator('[data-contact-id$="-nonemergency"]').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===1440) {
   const checks=await city.evaluate(select=>{
    const {directory:data,places}=JSON.parse(document.querySelector('#phone-data').textContent);
    const results=[];
    for(const option of [...select.options].slice(1)) {
     const row=places.cities.find(x=>x[0]===option.value), county=row?row[2]:option.value.slice(7);
     const expected=[...new Set([...data.statewide,...data.countyContacts[county],...(data.cityContacts[option.value]||[])])];
     select.value=option.value;select.dispatchEvent(new Event('change'));
     const actual=[...document.querySelectorAll('#phone-rows tr')].map(el=>el.dataset.contactId);
     const countyIds=data.countyContacts[county],expectedLocal=[...new Set([...(countyIds.length?countyIds:['211-routing']),...(data.cityContacts[option.value]||[])])];
     const local=[...document.querySelectorAll('#location-links > li')].map(el=>el.dataset.localContact);
     results.push({key:option.value,passed:JSON.stringify(actual)===JSON.stringify(expected) && new Set(actual).size===actual.length && JSON.stringify(local)===JSON.stringify(expectedLocal) && document.querySelector('#local-page-title').textContent.includes(row?row[1]:places.counties[county])});
    }
    return results;
   });
   assert.equal(checks.length,541);assert(checks.every(row=>row.passed),'City/county scope must match every selection');
   fs.writeFileSync('screenshots/phone-city-mapping.json',JSON.stringify({selectionCount:checks.length,failed:checks.filter(row=>!row.passed)},null,2));
  }
  await city.selectOption('57026');
  await page.locator('.phone-directory').screenshot({path:`screenshots/phone-directory-${width}.png`});
  await city.selectOption('');
  await page.locator('.phone-toggle').click();await page.locator('.phone-toggle').click();
  assert.equal(await page.locator('#city-map .leaflet-control-zoom').count(),1,'Reopening must reuse the same map');
  assert(await page.evaluate(()=>localStorage.length===0 && sessionStorage.length===0));
  assert.deepEqual(network,[],'Choosing a city must not request or send data');
 } finally {page.off('request',listener);}
};
