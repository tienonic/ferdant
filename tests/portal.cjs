const assert = require('node:assert/strict');

module.exports = async function checkPortal(page) {
 await page.waitForFunction(()=>document.querySelector('#city-map').dataset.ready==='true');
 assert.equal(await page.locator('#location-start #city-map').count(),1);
 assert.equal(await page.locator('#location-start [data-city-download]').count(),0);
 const links=page.locator('.resource-tabs a');
 assert.equal(await links.count(),2);
 assert.equal(await page.locator('[data-resource-panel]:visible').count(),2);
 assert.equal(await page.locator('#tools, #tab-guides, a[href="/#tools"]').count(),0);
 assert(!(await page.locator('body').innerText()).includes('Work through an everyday problem'));
 assert(await page.locator('#california-resources').isVisible());
 assert.equal(await page.locator('.state-resource').count(),4);
 assert.equal(await page.locator('.phone-directory[open]').count(),0);
 await page.locator('.phone-toggle').click();
 assert(await page.locator('.phone-table').isVisible());
 await page.locator('.phone-toggle').click();
 await links.last().focus();await page.keyboard.press('Enter');
 assert(await page.locator('#communities').isVisible());
 assert.equal(await page.locator('.community-resource').count(),5);
 await links.first().focus();await page.keyboard.press('Enter');
 assert(await page.locator('#california-resources').isVisible());
 await page.goBack();assert(await page.locator('#communities').isVisible());
 await page.goto(new URL('/#communities',page.url()).href);
 assert(await page.locator('#communities').isVisible());
 await page.locator('.community-resource').first().focus();
 assert(await page.locator(':focus').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3));
 await page.goto(new URL('/',page.url()).href);

 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`screenshots/landing-flow-${page.viewportSize().width}.png`,fullPage:true});
 assert(await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
};
