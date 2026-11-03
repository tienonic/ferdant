const assert = require('node:assert/strict');

module.exports = async function checkPortal(page) {
 const requests = [];
 const listener = request => requests.push(request.url());
 page.on('request', listener);
 try {
  const query = page.getByLabel('Find a resource or tool', {exact:true});
  await page.locator('.portal-search-glyph').click();
  assert(await query.evaluate(el=>el===document.activeElement));
  assert.equal(await page.locator('.portal-count').count(), 0);
  assert.equal(await page.locator('.service-directory > details').count(),7);
  assert.equal(await page.locator('.service-directory > details[open]').count(),0);
  assert.equal(await page.locator('[data-portal-card]:visible').count(), 5);
  assert.equal(await page.locator('[data-portal-entry]:visible').count(), 0);
  const favicons = page.locator('.site-favicon');
  assert.equal(await favicons.count(), 19);
  await favicons.evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  assert(await favicons.evaluateAll(images=>images.every(img=>img.naturalWidth>0 && img.getAttribute('alt')==='' && img.getAttribute('aria-hidden')==='true' && img.getAttribute('src').startsWith('/assets/favicons/'))));
  assert.equal(await page.locator('.portal-destination[href^="https:"] .ui-icon:not(small .ui-icon)').count(), 0);
  assert.equal(await page.locator('#portal-status').innerText(), 'Choose a service to see useful links.');
  await query.fill('contractor');
  assert.equal(await page.locator('[data-portal-entry]:visible').count(), 1);
  assert.equal(await page.locator('#portal-status').innerText(), '1 matching link');
  assert(await page.locator('#who-can-fix-this').isVisible());
  await query.fill('zzzz');
  assert(await page.locator('#portal-empty').isVisible());
  assert.equal(await page.locator('[data-portal-card]:visible').count(), 0);
  await page.getByRole('button', {name:'Clear search',exact:true}).click();
  assert.equal(await query.inputValue(), '');
  await page.locator('#keep-the-basics-on > summary').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('#keep-the-basics-on .portal-list').isVisible());
  await page.keyboard.press('Space');
  assert(!await page.locator('#keep-the-basics-on').evaluate(el=>el.open));
  await query.fill('message builder');
  assert.equal(await page.locator('[data-portal-entry]:visible').count(), 1);
  await page.getByRole('button', {name:'Clear search',exact:true}).click();
  assert.equal(await query.inputValue(), '');
  assert.equal(await page.locator('[data-portal-card]:visible').count(), 5);
  assert.equal(await page.locator('.service-directory > details[open]').count(),0);
  assert(await page.evaluate(()=>localStorage.length===0 && sessionStorage.length===0));
  assert.deepEqual(requests, [], 'Directory search and section links must not send requests');
 } finally {page.off('request', listener);}
};
