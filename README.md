# Ferdant website

A porcelain-white and cobalt resource library for the five existing practical-help communities.
This branch contains an editorial preview: a one-page directory with five topic sections and four interactive tools, five optional branch hubs, three complete
money-and-paperwork guides, a searchable library, about/source/privacy pages and a custom 404. Guides lead with a short answer,
four actions and a useful tool or template; longer explanations and sources expand only when needed.
The three guides are proposed pilot content, not a record of resolved community cases.
Dormant Shopify infrastructure is included in the source, with no commerce UI or page-load requests.

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
- `content/regions.json`: shared numbers, contact/source records and city/county references; dates never advance automatically.
- `content/california-cities.json`: official city/county index, approximate points, generalized local map and source hashes.
- `assets/vendor/leaflet/`: pinned Leaflet 1.9.4 release files, BSD license and download hashes.
- `scripts/phone_chart.py`, `phone.js`: shared city phone chart, local filtering and city-only offline export.
- `scripts/offline.py`: self-contained regional downloads, including fonts, icons, tools and saved guides.
- `content/directory.py`: directory link labels, publishers and separate source/check dates.
- `scripts/build.py`: shared page templates, metadata, breadcrumb schema and generated URLs.
- `scripts/graphics.py`: original static category drawings for the directory summaries.
- `scripts/cost_tool.py`: monthly-cost worksheet opened from the directory in a native expandable workspace.
- `scripts/icons.py`: original category/tool/action SVGs and local destination-favicon mapping.
- `assets/favicons/`: destination icons with download provenance and cached-source limits.
- `styles.css`, `site.js`, `assets/`: appearance and small browser-only tools.
- Generated HTML is checked in for the existing GitHub Pages deployment. Rebuild after editing sources.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run build
npm.cmd run verify:responsive
```

Keep the local server running for browser checks. They test all 16 pages at 320, 390, 768 and
1440 pixels, internal links, unique metadata, canonical URLs, structured data, keyboard/mobile
navigation, search, calculator cases, clipboard behavior, native detail expansion without JavaScript,
and zero Shopify requests or shop UI.
Screenshots and the check receipt go to the ignored `screenshots/` directory.
Use `CHROME_PATH` to choose an installed Chromium executable if needed. On Windows the test
can reuse an existing Playwright headless browser; otherwise install the browser matching Playwright.

## SEO and release

Each answer has its own HTML URL, title, description, canonical URL and source/scope section.
All primary content and navigation work without JavaScript. The sitemap includes 14 content URLs;
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

Read [DESIGN.md](DESIGN.md) before changing the interface. It records the audience, palette, layout,
type scale and the decisions made using the user's Professor Glitch reference.
Porcelain white `#fbfcfa`, cobalt `#244b84`, Newsreader headings and Public Sans reading text.
Category icons use consistent blue, rust, teal, violet, green and indigo accents alongside labels and distinct shapes.
Primary directory links and shortcuts have 44px-high targets; phone shortcuts wrap, and keyboard focus has a strong outline.
The browser suite checks rendered contrast, text spacing, primary targets and one forced-colors view, saving `screenshots/accessibility.json`.
This is focused verification, not a full accessibility certification.
The homepage follows the user's Bored.com structure reference: five category panels and one tool panel, with short direct-link rows.
There are 14 public resources, five communities and four tools. Category corners have no count badges; active search shows actual matching results.
Search filters the directory locally and clears when a section link is chosen. The layout uses three columns on desktop,
two on tablets and one on phones. The white/cobalt identity is retained; no reference-site assets or copy are reproduced.
Category links move within the directory. The three detailed tool entries open the selected tool in a bounded on-page dialog,
with its scope and sources, instead of scrolling to a stack of forms. Close or Escape returns focus to the launcher.
The background directory retains its position. Without JavaScript, the same entries lead to the appropriate guide and working instructions.
Separate guide URLs remain available for optional detail and search discovery.

The four tools are:

- Cost over time: a monthly USD amount and draggable 1–12 month timeline, opened from its directory row.
- Bill comparison with an opt-in example and a breakdown of the amount still to explain.
- Cancellation route choices and a record checklist with progress and a next step.
- A live billing-message builder with safe text output, copying and a clear-notes control.

The three detailed tools are shared with their guide pages. The inline cost worksheet is hidden when JavaScript is unavailable. They use no AI service, account or external request.
The checklist tracks the reader's notes; it cannot verify cancellation, access or a refund.
Fonts are served locally (about 84 KB total); notices and download provenance are in `assets/fonts/`.
There are no external font-service or decorative image requests.

Search, bill breakdowns, cancellation selections and message notes run in the browser without sending or storing input.
Template copy uses the clipboard only after a click. No analytics, account system, document upload,
polling process or scheduler is included. Private plans, conversations and credentials stay outside this repository.

## California phone chart and offline copy

The homepage phone-icon disclosure starts closed. Open it for a city-selectable phone chart and local Leaflet map; `/offline/` opens the chooser directly. The official CDTFA attribute snapshot supplies
483 incorporated cities and 58 county choices for unlisted/unincorporated communities. Listing a city is distinct
from checking its agencies: this edition has municipal contacts for 11 cities and alternate referral numbers for
41 counties. Other selections retain California-wide hotlines and any checked county information, with explicit gaps.
The chart excludes 911 rows; crisis, referral, non-emergency and utility contacts retain their different purposes.

The registry stores 59 distinct numbers once and references them from 58 contact records. Counties and cities
reference contact IDs; shared hotlines are not copied per city. The shared place index is about 54 KB, including 483 approximate city points and a generalized 58-county map.
It contains no addresses or street tiles. The build minifies the data embedded on chart pages; changing a city or service filter
makes no request, detects no location and saves nothing to browser storage. Publisher dates, check dates and
primary-page versus indexed-excerpt review limits are preserved. Missing numbers are never inferred.

One generated HTML file under `downloads/` replaces per-region exports. With a city selected, an explicit download
fetches that clean shared template once per page, adds only the selected city and readable chart rows, and saves a
local file. Subsequent city downloads reuse the template in memory. Tool notes and service filters are not copied.
The saved file retains the city even with JavaScript disabled; with scripts enabled, its full city selector works
without a connection. The vector map, pinned Leaflet 1.9.4 library, styles, fonts, favicon assets, four tools and
three full guides are embedded, with the required software/font licenses.

Open the file in a browser; no server, install or service worker is required. Phone file previews may require a
browser for interactive tools. Calls/texts need phone service; website links and alert registration need internet.
There are no live dispatch, outage, road-status or shelter feeds. Tool inputs do not persist after closing.
The tests cover every city/county mapping, jurisdiction changes, filtering, actual personalized/standard downloads,
disconnected local-file reading/tools, no-JavaScript selected-city rows, private-note exclusion and failure handling.
Leaflet is served locally. The homepage loads its visible location map immediately; the separate offline chooser loads its map when its disclosure opens. The map uses no external tile or
geocoding service, account, API key or location permission. Type a city, click its marker, or click a county for
county-level contacts. The native selector stays available as a keyboard/failure fallback. Points come from
the largest CDTFA city boundary-piece centroid; county geometry is generalized Census BAS 2026 data. Both are
approximate selection aids, not address, route or exact-jurisdiction maps. Provenance is in the place index
and `assets/vendor/leaflet/`. Tests include typed search, real marker clicks, repeated opening, offline maps
and a failed-library fallback. Builds never refresh factual review dates or restart collection. Add municipal numbers only after checking sources.

## Background infrastructure and low-maintenance updates

- `config/commerce.json` and `integrations/shopify.mjs` prepare product lookup, carts and a hosted-checkout handoff.
  The integration is disabled and is not imported by the site. It adds no shop menu, product cards, cart, SDK or network request.
  See [integration setup and activation requirements](integrations/README.md). Tests use mocked responses; no real store or checkout is verified.
- Edit the shared content once and rebuild; HTML pages, navigation, metadata and the sitemap are generated together.
- `npm run check:content` validates concise quick answers, source dates and disabled commerce, and writes an advisory source-age report.
  A 90-day age flag requests review; it never rewrites content or changes dates to appear fresh.
- The GitHub check workflow runs on source pushes, pull requests or an explicit manual run. It builds the preview, checks generated files,
  tests the commerce adapter and tests the site at four screen widths, then saves screenshots and reports as an Actions artifact.
  It has read-only repository permissions, no scheduled trigger and no deployment, payment or content-writing step.

```powershell
npm.cmd run check:content
npm.cmd run test:commerce
```

For future commerce, hosting and merchant-readiness flags require owner review, not just a config edit.
Keep private/Admin credentials out of browser files and Git. The current GitHub Pages deployment is not approved for e-commerce.

## Service-button preview and preserved version

The homepage has a California-only autocomplete, offline button and map. Suggestions appear after one
letter, with keyboard and touch selection. The previous top city/county dropdown is removed. Choosing a
suggestion or submitting an exact/unique name opens the separate shared `/local/?place=<public ID>` page.
Its checked resources retain scope, provider, hours and source limits; general guides stay distinct.

A prominent result-page section offers a contact-sheet PNG and the complete offline website. `infographic.js`
builds the SVG preview and high-resolution PNG locally from the canonical public contacts. The PNG contains
local and statewide numbers, practical notes, source dates and coverage limits, with no private tool inputs.
The complete HTML file adds the map, four tools, three guides and full sources. PNG generation needs scripts;
selected contact charts in saved HTML remain readable without scripts. The offline template is built from the
shared resource page, rather than a separate database or copy per city.

Six icon tiles retain the five Reddit communities and phone chart. Optional Change location on the result
page contains the search/map. In saved files it changes location in place; online page URLs contain the public
place ID and may be logged by the host, as described in Privacy. Suggestions, image generation and private
tool inputs stay local. The separate resource/tool search remains removed.

The version before this structure is preserved by annotated tag `preview-before-service-buttons-20261102`
at `5c93d5e435a8ab59635d81ea97e32099109d6614`. To inspect it without altering current work:

```powershell
git worktree add --detach ../ferdant-preserved-20261102 preview-before-service-buttons-20261102
```

Serve that directory separately for comparison. The current preview stays on `website-preview-20261102`;
public main remains the maintenance page. See `DESIGN.md` for the color evidence and its limits.

The service-list edition immediately before the icon tiles is also preserved at
`preview-before-icon-tiles-20261102` (`20096f939af6f17a99f7e295739f6680d0d61883`). All saved versions
retain their original built files; the latest preview is on `website-preview-20261102`.

The icon-grid edition before the location-first flow is preserved at `preview-before-location-flow-20261102`
(`01b0d9a7b3e07bd307b3a22c7d657f6ca3e643ab`). The top selector is hidden without scripts; statewide numbers
and the standard download remain available. Personalized saved copies include the selected local summary even without scripts.

The version before consolidating location search and map is preserved at `preview-before-unified-location-20261102`
(`8fce3ccdfa55941013962a9a39bbf69e214f454f`). The map remains usable without opening Phone numbers; a map-library
failure retains working city search and the native picker. Guide-library search and the phone service filter remain available.

The preceding unified-location preview is preserved at `preview-before-city-results-20261102`
(`ffe4e403278ab89fe6cbd70a16b289faa24083ce`). New checks cover one-letter suggestions, arrows/Enter/Escape,
touch selection, separate/invalid resource URLs, actual PNG bytes and dimensions, canonical contact coverage,
private-input exclusion, and map loading that preserves text already being typed.
