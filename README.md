# Ferdant website

A porcelain-white and cobalt resource library for the five existing practical-help communities.
This branch contains an editorial preview: a landing page, five branch hubs, three complete
money-and-paperwork guides, a searchable library, about/source/privacy pages and a custom 404.
The three guides are proposed pilot content, not a record of resolved community cases.

## Preview locally

From the repository directory:

```powershell
python scripts/build.py
python -m http.server 4173 --bind 127.0.0.1
```

Open **http://127.0.0.1:4173/**. Stop the server with Ctrl+C.
Preview is the default: all pages have `noindex,follow` and a visible preview notice.
The deployed main branch remains the maintenance page until a fuller release is approved.

## Edit and check

- `content/site.py`: branch descriptions, original guide text, source links and dates.
- `scripts/build.py`: shared page templates, metadata, breadcrumb schema and generated URLs.
- `styles.css`, `site.js`, `assets/`: appearance and small browser-only tools.
- Generated HTML is checked in for the existing GitHub Pages deployment. Rebuild after editing sources.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run build
npm.cmd run verify:responsive
```

Keep the local server running for browser checks. They test all 14 pages at 320, 390, 768 and
1440 pixels, internal links, unique metadata, canonical URLs, structured data, keyboard/mobile
navigation, search, calculator cases, clipboard behavior and reading without JavaScript.
Screenshots and the check receipt go to the ignored `screenshots/` directory.
Use `CHROME_PATH` to choose an installed Chromium executable if needed. On Windows the test
can reuse an existing Playwright headless browser; otherwise install the browser matching Playwright.

## SEO and release

Each answer has its own HTML URL, title, description, canonical URL and source/scope section.
All primary content and navigation work without JavaScript. The sitemap includes 13 content URLs;
the error page remains `noindex` in production. No ranking, traffic or conversion improvement is claimed.

Before publication, the existing website owner confirms pilot content and rights, factual review,
correction/maintenance responsibility and measurement limits. Then create the production files:

```powershell
python scripts/build.py --mode production
$env:SITE_MODE = 'production'
npm.cmd run verify:responsive
```

Production mode removes the preview notice and enables indexing for content pages. It does not
publish anything by itself. Only pushing the approved release to `main` deploys through the existing
GitHub Pages setup. Keep `CNAME` and `.nojekyll`. A separate output folder can be generated with
`--output PATH`; it includes the public CSS, JavaScript, assets and hosting markers.

Search Console verification and post-launch indexing/outcome checks require the existing domain
owner. Do not add a speculative verification code, analytics account or tracking script.
Storefront/checkout work still needs an actual merchant, offer, fulfillment/refund owner, suitable
hosting and fee/test decisions; this preview does not create a shop or accept payments.

## Design and privacy

Porcelain `#f8f9f6`, cobalt `#254b85`, blue-grey rules, serif display type, native sans-serif text,
generous space and an original geometric roundel. It is not a reproduction of a museum object
or a claim of an authentic historical motif. No external fonts or decorative image requests.

Search, bill comparison and checklists run in the browser without sending or storing input.
Template copy uses the clipboard only after a click. No analytics, account system, document upload,
polling process or scheduler is included. Private plans, conversations and credentials stay outside this repository.
