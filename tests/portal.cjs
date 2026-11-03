const assert = require('node:assert/strict');

module.exports = async function checkPortal(page) {
 const requests = [];
 const listener = request => requests.push(request.url());
 page.on('request', listener);
 try {
  const query = page.getByLabel('Find a resource or tool', {exact:true});
  assert.equal(await page.locator('[data-portal-card]:visible').count(), 6);
  assert.equal(await page.locator('[data-portal-entry]:visible').count(), 22);
  assert.equal(await page.locator('#portal-status').innerText(), '22 links across 6 categories');
  await query.fill('contractor');
  assert.equal(await page.locator('[data-portal-entry]:visible').count(), 1);
  assert.equal(await page.locator('#portal-status').innerText(), '1 link across 1 category');
  assert(await page.locator('#who-can-fix-this').isVisible());
  await query.fill('zzzz');
  assert(await page.locator('#portal-empty').isVisible());
  assert.equal(await page.locator('[data-portal-card]:visible').count(), 0);
  await page.getByRole('navigation', {name:'The five communities'}).getByRole('link', {name:'Energy & water'}).click();
  assert.equal(await query.inputValue(), '');
  assert(page.url().endsWith('#keep-the-basics-on'));
  assert(await page.locator('#keep-the-basics-on').isVisible());
  await query.fill('message builder');
  assert.equal(await page.locator('[data-portal-entry]:visible').count(), 1);
  await page.getByRole('button', {name:'Clear',exact:true}).click();
  assert.equal(await query.inputValue(), '');
  assert.equal(await page.locator('[data-portal-card]:visible').count(), 6);
  assert(await page.evaluate(()=>localStorage.length===0 && sessionStorage.length===0));
  assert.deepEqual(requests, [], 'Directory search and section links must not send requests');
 } finally {page.off('request', listener);}
};
