const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  fs.mkdirSync('screenshots', { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.SITE_URL || pathToFileURL(path.resolve('index.html')).href);
      assert(await page.getByRole('heading', { name: 'Coming soon.', exact: true }).isVisible());
      assert(await page.getByText('Our website is undergoing maintenance.', { exact: false }).isVisible());
      const links = page.getByRole('navigation', { name: 'Our Reddit communities' }).getByRole('link');
      assert.equal(await links.count(), 5);
      for (const name of ['KeepUsConnected','WhoCanFixThis','KeepTheBasicsOn','WhatAmIPayingFor','PlanForDisruption']) {
        assert.equal(await links.filter({hasText:name}).getAttribute('href'), `https://www.reddit.com/r/${name}/`);
      }
      await page.keyboard.press('Tab');
      assert.equal(await page.locator(':focus').innerText(), 'Skip to content');
      await page.keyboard.press('Enter');
      await page.getByRole('link', { name: 'Find our communities' }).click();
      assert(page.url().endsWith('#communities'));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      await page.goto(process.env.SITE_URL || pathToFileURL(path.resolve('index.html')).href);
      await page.screenshot({ path: `screenshots/${width}.png`, fullPage: true });
      console.log(`${width}px: passed`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exit(1)});
