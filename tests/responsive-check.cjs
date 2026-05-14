const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const sitePath = path.resolve(__dirname, "..", "index.html");
const siteUrl = `file:///${sitePath.replace(/\\/g, "/")}`;
const screenshotDir = path.resolve(__dirname, "..", "screenshots");

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 960 },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browserPath =
    [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ].find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  const results = [];

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      });

      await page.goto(siteUrl);
      await page.waitForLoadState("networkidle");

      const headingVisible = await page.getByRole("heading", { name: "Ferdant", level: 1 }).isVisible();
      assert(headingVisible, `${viewport.name}: missing H1`);

      const ctaVisible = await page.getByRole("link", { name: "Explore services" }).isVisible();
      assert(ctaVisible, `${viewport.name}: missing primary CTA`);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      assert(
        overflow.scrollWidth <= overflow.clientWidth + 1,
        `${viewport.name}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`
      );

      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => !img.complete || img.naturalWidth === 0)
          .map((img) => img.getAttribute("src"))
      );
      assert(brokenImages.length === 0, `${viewport.name}: broken images ${brokenImages.join(", ")}`);

      if (viewport.name === "mobile" || viewport.name === "tablet") {
        const menuButton = page.getByRole("button", { name: "Menu" });
        assert(await menuButton.isVisible(), `${viewport.name}: menu button not visible`);
        await menuButton.click();
        const menuClass = await page.locator("#site-nav").getAttribute("class");
        assert(menuClass && menuClass.includes("is-open"), `${viewport.name}: menu did not open`);
      }

      await page.screenshot({
        path: path.join(screenshotDir, `${viewport.name}.png`),
        fullPage: true,
      });

      results.push(`${viewport.name}: pass`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(results.join("\n"));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
