const assert = require('node:assert/strict');

module.exports = async function checkWidgets(page, width, base) {
 const requests = [];
 const recordRequest = request => requests.push(request.url());
 page.on('request', recordRequest);
 const gap = page.locator('#gap-label');
 const setChanges = async values => {
  for (const [id, value] of Object.entries(values)) await page.locator(`#change-${id}`).fill(value);
 };
 try {
  assert.equal(await page.locator('.widget-panel:visible').count(), 1);
  await page.getByRole('button', {name:'Try an example'}).click();
  assert(await page.locator('#example-note').isVisible());
  assert.equal(await gap.innerText(), '$3.00 still to check');
  assert.equal(await page.locator('#gap-fill').evaluate(el=>el.style.width), '80%');
  await page.locator('.workbench').screenshot({path:`screenshots/widgets-bill-${width}.png`});

  await setChanges({credits:'-5'});
  assert.equal(await gap.innerText(), '$8.00 still to check');
  assert(!await page.locator('#example-note').isVisible());
  await setChanges({service:'20',usage:'0',once:'0',credits:'0'});
  assert((await page.locator('#gap-detail').innerText()).includes('go beyond the total change'));
  assert((await page.locator('#gap-detail').innerText()).includes('Remaining: −$5.00'));

  await page.getByLabel('Previous bill ($)').fill('100');
  await setChanges({service:'-25'});
  assert.equal(await gap.innerText(), 'Your entries match the total difference.');
  await page.getByLabel('Previous bill ($)').fill('0.10');
  await page.getByLabel('Current bill ($)').fill('0.30');
  await setChanges({service:'0.20'});
  assert.equal(await gap.innerText(), 'Your entries match the total difference.');
  await setChanges({once:'1000000000000000'});
  assert.equal(await gap.innerText(), 'Check the change amounts.');
  assert.equal(await page.locator('#gap-fill').evaluate(el=>el.style.width), '0%');
  await page.getByRole('button', {name:'Clear figures'}).click();
  assert.equal(await page.getByLabel('Previous bill ($)').inputValue(), '');
  assert.equal(await page.locator('#change-service').inputValue(), '');
  assert.equal(await page.locator('#bill-result').innerText(), 'Enter two totals to compare.');

  await page.getByRole('tab', {name:'Compare a bill'}).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'tab-cancel');
  assert(await page.locator('#panel-cancel').isVisible());
  assert(!await page.locator('#panel-bill').isVisible());
  await page.getByLabel('Another platform', {exact:true}).check();
  assert((await page.locator('#cancel-route').innerText()).includes('platform named on your receipt'));
  await page.getByLabel('I’m not sure', {exact:true}).check();
  assert((await page.locator('#cancel-route').innerText()).startsWith('Start with your receipt'));
  await page.getByLabel('Another platform', {exact:true}).check();
  for (const input of await page.locator('#cancel-record input').all()) await input.check();
  assert.equal(await page.locator('#cancel-count').innerText(), '4 of 4 records checked');
  assert.equal(await page.locator('#cancel-progress').getAttribute('value'), '4');
  assert((await page.locator('#cancel-next').innerText()).includes('do not confirm cancellation'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `Cancellation tool overflows at ${width}`);
  await page.locator('.workbench').screenshot({path:`screenshots/widgets-cancel-${width}.png`});
  await page.locator('#cancel-record input').first().uncheck();
  assert.equal(await page.locator('#cancel-count').innerText(), '3 of 4 records checked');
  assert((await page.locator('#cancel-next').innerText()).includes('identify the billing business'));

  await page.getByRole('tab', {name:'Plan a cancellation'}).focus();
  await page.keyboard.press('End');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'tab-message');
  await page.getByLabel('What needs explaining?').fill('A new service fee');
  await page.getByLabel('Important dates or previous contact').fill('Charged November 1; contacted support November 2');
  await page.getByLabel('What would help?').selectOption('correct');
  assert((await page.locator('#built-message').innerText()).includes('correct it if it was applied in error'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `Message builder overflows at ${width}`);
  await page.locator('.workbench').screenshot({path:`screenshots/widgets-message-${width}.png`});
  const unsafeText = '<img src=x onerror=alert(1)>';
  await page.getByLabel('What needs explaining?').fill(unsafeText);
  assert.equal(await page.locator('#built-message img').count(), 0);
  await page.getByRole('button', {name:'Copy my draft'}).click();
  await page.waitForFunction(()=>document.querySelector('.message-preview .copy-status').textContent.startsWith('Copied.'));
  assert((await page.evaluate(()=>navigator.clipboard.readText())).includes(unsafeText));
  await page.getByLabel('Important dates or previous contact').press('Enter');
  assert((await page.locator('#built-message').innerText()).includes(unsafeText));
  await page.getByRole('button', {name:'Clear my notes'}).click();
  assert.equal(await page.getByLabel('What needs explaining?').inputValue(), '');
  assert.equal(await page.getByLabel('Important dates or previous contact').inputValue(), '');
  assert.equal(await page.getByLabel('What would help?').inputValue(), 'explain');
  assert((await page.locator('#built-message').innerText()).includes('[the charge or issue]'));
  assert.equal(await page.locator('.message-preview .copy-status').innerText(), '');
  assert(await page.evaluate(()=>localStorage.length===0 && sessionStorage.length===0));
  assert.deepEqual(requests, [], 'Widget interaction must not send any request');
  await page.getByRole('tab', {name:'Draft a message'}).focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'tab-bill');
  assert.equal(await page.locator('.widget-panel:visible').count(), 1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `Widgets overflow at ${width}`);
 } finally {
  page.off('request', recordRequest);
 }
 await page.goto(base+'/what-am-i-paying-for/guides/cancel-a-subscription/');
 await page.getByLabel('The company directly', {exact:true}).check();
 assert((await page.locator('#cancel-route').innerText()).includes('verified account or billing page'));
 await page.goto(base+'/what-am-i-paying-for/guides/write-a-billing-question/');
 await page.getByLabel('What needs explaining?').fill('A cancellation request');
 await page.getByLabel('What would help?').selectOption('confirm');
 assert((await page.locator('#built-message').innerText()).includes('whether another charge is scheduled'));
 await page.goto(base+'/');
};
