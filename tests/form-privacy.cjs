const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = async function checkFormPrivacy(browser, base) {
 for (const enabled of [false, true]) {
  const context = await browser.newContext({javaScriptEnabled:enabled,viewport:{width:390,height:844}});
  const page = await context.newPage();
  try {
   for (const url of ['/', '/what-am-i-paying-for/guides/why-did-my-bill-go-up/']) {
    await page.goto(base+url);
    await page.evaluate(()=>document.fonts.ready);
    const requests = [];
    const listener = request => requests.push(request.url());
    page.on('request', listener);
    await page.getByLabel('Previous bill ($)').fill('60');
    await page.getByLabel('Current bill ($)').fill('75');
    const submit = page.getByRole('button',{name:'Compare the totals'});
    if (enabled) {
     assert(await submit.isEnabled());
     await submit.click();
     assert((await page.locator('#bill-result').innerText()).includes('$15.00 (25.0%) higher'));
    } else {
     assert(await submit.isDisabled());
     await page.getByLabel('Current bill ($)').press('Enter');
     assert.equal(page.url(), base+url);
     assert(await page.locator('#quick-tool noscript p').isVisible());
    }
    assert.deepEqual(requests, [], 'Totals must not be submitted with JavaScript on or off');
    page.off('request', listener);
   }
  } finally {await context.close();}
 }
 const receiptPath = 'screenshots/verification.json';
 if (fs.existsSync(receiptPath)) {
  const receipt = JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  receipt.noJavaScriptFormPrivacy = 'passed';
  receipt.formPrivacyCheckedAt = new Date().toISOString();
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));
 }
};
