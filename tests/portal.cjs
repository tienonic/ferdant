const assert = require('node:assert/strict');

module.exports = async function checkPortal(page) {
 await page.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
 const requests = [];
 const listener = request => requests.push(request.url());
 page.on('request', listener);
 try {
  assert.equal(await page.locator('#portal-query, .portal-search').count(),0,'The separate resource/tool search is removed');
  assert.equal(await page.locator('#location-start #map-city-form').count(),1);
  assert.equal(await page.locator('#location-start #city-map').count(),1);
  assert.equal(await page.locator('.portal-count').count(), 0);
  assert.equal(await page.locator('.service-directory > details').count(),6);
  assert.equal(await page.locator('.service-directory > details[open]').count(),0);
  const tiles=await page.locator('.service-directory > details > summary').evaluateAll(items=>items.map(el=>{
   const box=el.getBoundingClientRect(),icon=el.querySelector('.ui-icon').getBoundingClientRect(),label=el.querySelector('span').getBoundingClientRect();
   return {id:el.parentElement.id,top:box.top,bottom:box.bottom,iconBottom:icon.bottom,labelTop:label.top,iconWidth:icon.width};
  }));
  assert.equal(tiles[0].id,'local-essentials','Phone numbers must lead the first row');
  assert.equal(tiles[1].id,'keep-us-connected');
  assert(await page.locator('#location-start [data-city-download]').isVisible());
  const firstRow=tiles.filter(tile=>Math.abs(tile.top-tiles[0].top)<2);
  assert.equal(firstRow.length,page.viewportSize().width>900?4:2);
  assert(tiles.every(tile=>tile.iconBottom<=tile.labelTop && tile.iconWidth>=44),'Closed tiles need a clear icon above their label');
  await page.locator('#who-can-fix-this > summary').focus();await page.keyboard.press('Enter');
  const expansion=await page.locator('#who-can-fix-this').evaluate(el=>({panel:el.getBoundingClientRect().width,directory:el.parentElement.getBoundingClientRect().width}));
  assert(Math.abs(expansion.panel-expansion.directory)<2,'Expanded information should use the directory width');
  await page.keyboard.press('Space');

  assert.equal(await page.locator('[data-portal-card]:visible').count(), 5);
  assert.equal(await page.locator('[data-portal-entry]:visible').count(), 0);
  const favicons = page.locator('.site-favicon');
  assert.equal(await favicons.count(), 19);
  await favicons.evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  assert(await favicons.evaluateAll(images=>images.every(img=>img.naturalWidth>0 && img.getAttribute('alt')==='' && img.getAttribute('aria-hidden')==='true' && img.getAttribute('src').startsWith('/assets/favicons/'))));
  assert.equal(await page.locator('.portal-destination[href^="https:"] .ui-icon:not(small .ui-icon)').count(), 0);
  assert.equal(await page.locator('.service-directory > details[open]').count(),0);
  assert(await page.evaluate(()=>localStorage.length===0 && sessionStorage.length===0));
  assert.deepEqual(requests, [], 'Directory controls must not send requests');
 } finally {page.off('request', listener);}
};
