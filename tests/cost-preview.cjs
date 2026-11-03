const assert = require('node:assert/strict');

module.exports = async function checkCostPreview(page, width) {
 const requests = [];
 const listener = request => requests.push(request.url());
 page.on('request', listener);
 try {
  if(!await page.locator('#what-am-i-paying-for').evaluate(el=>el.open))await page.locator('#what-am-i-paying-for > summary').click();
  await page.getByRole('link', {name:'Cost over time On this page',exact:false}).click();
  assert(page.url().endsWith('#cost-preview'));
  assert.equal(await page.locator(':focus').getAttribute('id'),'cost-preview');
  const amount = page.getByLabel('Monthly cost (USD)', {exact:true});
  const months = page.getByLabel('Months to include', {exact:true});
  const total = page.locator('#cost-total');
  assert(await amount.isVisible());
  assert.equal(await total.innerText(), '—');
  await page.getByRole('button', {name:'Try $12',exact:true}).click();
  assert.equal(await total.innerText(), '$144.00');
  assert.equal(await page.locator('#cost-caption').innerText(), 'Example: $12.00 × 12 months');
  await months.focus(); await page.keyboard.press('ArrowLeft');
  assert.equal(await total.innerText(), '$132.00');
  assert.equal(await months.getAttribute('aria-valuetext'), '11 months');
  assert.equal(await page.locator('.cost-month-strip .is-included').count(), 11);
  await amount.fill('0.10');
  assert.equal(await total.innerText(), '$1.10');
  assert.equal(await page.locator('#cost-caption').innerText(), '$0.10 × 11 months');
  await months.press('Home');
  assert.equal(await total.innerText(), '$0.10');
  assert.equal(await months.getAttribute('aria-valuetext'), '1 month');
  await amount.fill('0'); assert.equal(await total.innerText(), '$0.00');
  for (const invalid of ['-1','0.001','1000000000']) {
   await amount.fill(invalid); assert.equal(await total.innerText(), '—');
   assert.equal(await page.locator('.cost-month-strip .is-included').count(), 0);
  }
  await amount.fill('999999999.99'); await months.press('End');
  assert.equal(await total.innerText(), '$11,999,999,999.88');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#cost-reset').click();
  assert.equal(await amount.inputValue(), ''); assert.equal(await months.inputValue(), '12');
  assert.equal(await total.innerText(), '—');
  assert(await amount.evaluate(el=>el===document.activeElement));
  await amount.fill('9.99'); await amount.press('Enter');
  assert.equal(await total.innerText(), '$119.88');
  assert(await amount.evaluate(el=>{const style=getComputedStyle(el),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;return el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)>=ctx.measureText('9.99').width;}), 'A typical amount must fit visibly in the field');
  await page.locator('.cost-preview').screenshot({path:`screenshots/cost-preview-${width}.png`});
  await page.locator('#cost-reset').click();
  assert(await page.evaluate(()=>localStorage.length===0 && sessionStorage.length===0));
  assert.deepEqual(requests, [], 'The inline cost tool must not send requests');
 } finally {page.off('request', listener);}
};
