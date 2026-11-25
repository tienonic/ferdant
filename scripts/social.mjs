// Render the link-preview image and favicons from the card HTML that build.py writes.
// Usage: node scripts/social.mjs <card.html> <assets dir>
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const [card, assets] = process.argv.slice(2);
const browser = await chromium.launch();
const shots = [
  { selector: '.card', scale: 1, out: `${assets}/img/social.png` },
  { selector: '.icon', scale: 1, out: `${assets}/apple-touch-icon.png` },
  { selector: '.icon', scale: 32 / 180, out: `${assets}/favicon-32.png` },
];
mkdirSync(`${assets}/img`, { recursive: true });
for (const { selector, scale, out } of shots) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: scale });
  await page.goto(pathToFileURL(card).href);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(selector).screenshot({ path: out });
  await page.close();
}
await browser.close();
console.log('Rendered the social image and favicons.');
