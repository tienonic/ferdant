# Ferdant website

Ferdant starts with a California location map. Choose a place to read its hazards, a county comparison,
short plans, nearby directory places and downloads while the resource atlas stays in view.
The static Python build also serves five practical-help communities, three bills-and-paperwork guides,
a searchable guide library, four local financial tools, About, Sources, Privacy and a custom 404.
The guides are pilot content, not a record of resolved community cases. Dormant commerce stays disabled.

The current design and data changes are in [Location first, November 10](docs/immersive-20261110.md).

This ad-free revision adds City / County / State views and visible city, county,
provider and statewide resource labels. See [resource levels and saved versions](docs/resource-levels.md).

Search a ZIP code to focus the map on nearby resources, with distances from the ZIP-area center and a matching offline map. [ZIP coverage, sources and checks](docs/zip-map-20261103.md).

Every resource booklet includes a named street map, north needle and scale on page 2, independently of evacuation coverage. [Map sources, coverage and offline behavior](assets/data/booklet-roads/README.md).

Resource cards and printed physical listings share five visit facts: location, hours, services, costs and amenities. [Open-map sources, matching rules and offline coverage](assets/data/visit-facts/README.md).

Booklet emergency sections follow the selected location. Drought is excluded; locally inapplicable sections are omitted while low-risk and unknown hazards remain. [Selection rules and checks](docs/local-booklet-selection-20261103.md).

## Preview locally

From the repository directory:

```powershell
python scripts/build.py
python -m http.server 4173 --bind 127.0.0.1
```

Open **http://127.0.0.1:4173/**. Stop the server with Ctrl+C.
Preview is the default: all pages have `noindex,follow` and a visible preview notice.
GitHub Pages serves the production build from `main` at https://ferdant.com.

## Edit and check

- `content/site.py`: branch descriptions, original guide text, source links and dates.
- `content/regions.json`: shared numbers, contact/source records and city/county references; dates never advance automatically.
- `content/emergency-alerts.json`, `content/emergency-alert-overrides.json`: county signup links and reviewed city routes, selected automatically from the existing location. See [alert signup maintenance and verification](docs/emergency-alerts.md). Enrollment stays on the provider's site.
- `content/california-cities.json`: official city/county index, approximate points, generalized local map and source hashes.
- `content/resource-map.json`, `content/map-data-manifest.json`: dated public facilities, map source limits and exact geometry receipts.
- `assets/data/city-maps/`: 58 compact county files, covering all 483 indexed city boundaries and 20 counties with official tsunami planning areas.
- `scripts/resource_map.py`, `resource-map.js`: result-page map, everyday resources and 14 directly accessible, labelled disaster symbols. Changing a plan replaces the previous GIS overlay and resource pins. FEMA shelters are queried for applicable response plans; street tiles are online only.
- `content/physical-services.json`, `scripts/physical_services.py`: public service categories, reviewed local visits, county-service areas and explicit unknown hours/access/capacity. Referral-only, confidential and unlocated records never become pins. Provider-checked visit details remain a Yolo subset; statewide IMLS library and HRSA clinic files augment all California city/county choices.
- `assets/data/service-maps/`, `content/statewide-service-manifest.json`: 58 compact county files with 1,110 FY2024 library and 2,054 permanent community-clinic points, source hashes and explicit regional fallbacks. Only the selected county file loads; exports retain that county.
- `assets/data/everyday-maps/`, `content/everyday-service-manifest.json`: 3,932 additional food, drinking-water, restroom and shower points across 55 counties, with distinct icons, source dates and public-access filters. LA food listings use May 2023 data; OSM facilities are community mapped. See [scope, sources and checks](docs/everyday-map-expansion-20261103.md) and [data licenses](assets/data/everyday-maps/README.md).
- `service-resources.js`, `content/resource_plans.py`: local/nearby resource selection, unique SVG map symbols and resource roles for every one of the 14 disasters. Ordinary services remain distinct from current activation.
- `scripts/recommendations.py`, `recommendations.js`: visible recommendation entry and local draft form; explicit copy/TXT download only, without collection, validation service or publication.
- `resource-booklet.js`, `docs/resource-booklet.md`: city-specific PDF field notes, issue-based resource cards, a related phone chart at each disaster section's end and a matching source TXT. The pinned local PDF writer is embedded in complete offline HTML.
- `scripts/project-statewide-services.py`: manual projection from local official raw inputs; never runs in builds or on a schedule.
- `content/physical-service-manifest.json`: source and coordinate receipts, with unmatched and pending categories preserved.
- `content/disasters.py`, `disaster-layers.js`: three-step plans, primary-source GIS registry, bounded on-demand queries, valid-time checks and eligible offline planning snapshots. Weather and shelter status are never frozen as current in an offline copy.
- `content/disaster-source-manifest.json`, `scripts/audit-disaster-sources.py`: manual metadata receipt for the 13 official service endpoints. The builder runs no importer, audit or scheduler.
- `scripts/project-building-outlines.py`: manual extraction of estimated Microsoft building outlines containing directory points; source geometry is ODbL, with receipts and license retained.
- `assets/vendor/leaflet/`: pinned Leaflet 1.9.4 release files, BSD license and download hashes.
- `scripts/phone_chart.py`, `phone.js`: shared city phone chart, local filtering and city-only offline export.
- `scripts/offline.py`: self-contained regional downloads, including fonts, icons, tools and contacts.
- `content/directory.py`: directory link labels, publishers and separate source/check dates.
- `scripts/build.py`: shared page templates, metadata, breadcrumb schema and generated URLs.
- `scripts/graphics.py`: original static category drawings for the directory summaries.
- `scripts/cost_tool.py`: monthly-cost worksheet opened from the directory in a native expandable workspace.
- `scripts/icons.py`: original category/tool/action SVGs and local destination-favicon mapping.
- `assets/favicons/`: destination icons with download provenance and cached-source limits.
- `scripts/immersive.py`, `immersive.js`: six readable story steps, atlas scenes, cancellable arrival play and static saved-file rendering.
- `scripts/import-county-risk.py`, `content/county-risk-scores.json`, `content/county-risk-scores-manifest.json`: manually imported FEMA county scores, annual losses, strict national comparisons and receipts. Builds never fetch them.
- `styles.css`, `site.js`, `assets/`: appearance and small browser-only tools.
- Generated HTML is checked in for the existing GitHub Pages deployment. Rebuild after editing sources.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run build
npm.cmd run verify:responsive
npm.cmd run verify:scopes
node tests/resource-map.cjs
npm.cmd run verify:disasters
npm.cmd run verify:services
npm.cmd run verify:statewide
npm.cmd run verify:risk
npm.cmd run verify:everyday
npm.cmd run verify:booklet
npm.cmd run verify:recommendations
npm.cmd run verify:cleanup
npm.cmd run verify:immersive
python tests/references.py
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
npm.cmd run verify:scopes
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

Read [DESIGN.md](DESIGN.md) before changing the interface. Its dated November 10 section replaces the older type, photo and homepage guidance. Newsreader supplies the wordmark and large story voice; Geist supplies interface and reading text. Both are self-hosted under the SIL Open Font License. The surface uses paper `#FBFCFA`, ink `#14202B` and cobalt `#244B84`, with quiet lists and hairlines. Map pins retain category colors and distinct icons; official hazard layers retain registry colors.

Home has location search and four modes, a large map, two resource lists and support numbers. There is no home headline, stock photography, How it works section or resource tab switcher. The local page keeps one atlas beside six steps: place, hazards, comparison, plan, nearby places and downloads. Source/detail disclosures keep dates and scope. Every plan, layer, legend, planning road, place detail, phone chart and export remains reachable.

A place choice uses about 700ms of map travel before its public URL opens. Supported browsers share the map through a view transition; others navigate normally. One public-place arrival flag is stored in sessionStorage and consumed immediately by the local page. Direct visits do not play. Any wheel, touch, key or pointer input cancels the short arrival sequence. Reduced motion and saved HTML do not play or animate. No other input is stored.

Guide and financial-tool behavior is unchanged. Examples are opt-in, closing a dialog returns focus, and tools never verify a refund, cancellation or entitlement. Notes, bill totals, service filters and recommendation drafts stay in the open page. They are not sent, stored or copied into resource books or offline exports. Clipboard access follows an explicit copy action. Recommendation drafts can be copied or downloaded; nothing is submitted or published.

Keep 44px primary targets, visible cobalt focus, wrapping text and support for forced colors and increased text spacing. Core reading works without JavaScript. The tests exercise focus, source access, actual exports, source failures, private-input exclusion and zero offline HTTP. These checks are not a full accessibility certification.

Font notices and exact download provenance are in `assets/fonts/`. There are no external font-service or decorative-image requests. No account, tracker, geolocation prompt or new frontend library is added.

## California phone chart and offline copy

The homepage support-number disclosure starts closed below the resource lists. The location map is already visible above it; `/offline/` opens the standalone chooser. The official CDTFA attribute snapshot supplies
483 incorporated cities and 58 county choices for unlisted/unincorporated communities. Listing a city is distinct
from checking its agencies: this edition has municipal contacts for 11 cities and alternate referral numbers for
41 counties. Other selections retain California-wide hotlines and any checked county information, with explicit gaps.
The chart excludes 911 rows; crisis, referral, non-emergency and utility contacts retain their different purposes.

The registry stores 59 distinct numbers once and references them from 58 contact records. Counties and cities
reference contact IDs; shared hotlines are not copied per city. The shared place index is about 54 KB, including 483 approximate city points and a generalized 58-county map.
It contains no addresses or street tiles. The build minifies the contact data embedded on chart pages. Service filtering makes no request. Online place navigation and maps can load public pages, regional data and existing map services; no location is detected or private input stored. The sole public-place arrival flag is described above. Publisher dates, check dates and
primary-page versus indexed-excerpt review limits are preserved. Missing numbers are never inferred.

One generated HTML file under `downloads/` replaces per-region exports. With a city selected, an explicit download
fetches that clean shared template once per page, adds only the selected city and readable chart rows, and saves a
local file. Subsequent city downloads reuse the template in memory. Tool notes and service filters are not copied.
The saved file retains the city even with JavaScript disabled; with scripts enabled, its full city selector works
without a connection. The vector map, pinned Leaflet 1.9.4 library, styles, fonts, favicon assets, four tools and
contact details are embedded, with the required software/font licenses.

Open the file in a browser; no server, install or service worker is required. Phone file previews may require a
browser for interactive tools. Calls/texts need phone service; website links and alert registration need internet.
There are no live dispatch, outage, road-status or shelter feeds. Tool inputs do not persist after closing.
The tests cover every city/county mapping, jurisdiction changes, filtering, actual personalized/standard downloads,
disconnected local-file reading/tools, no-JavaScript selected-city rows, private-note exclusion and failure handling.
Leaflet is served locally. The homepage loads its visible location map immediately; the separate offline chooser loads its map when its disclosure opens. The location chooser uses no external tile or
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

## Location flow and preserved versions

The homepage has California-only autocomplete and a large map; downloads follow on the local page. Suggestions appear after one
letter, with keyboard and touch selection. The previous top city/county dropdown is removed. Choosing a
suggestion or submitting an exact/unique name opens the separate shared `/local/?place=<public ID>` page.
Its checked resources retain scope, provider, hours and source limits; general guides stay distinct.

Keep it, the sixth local story step, offers the resource-book PDF, source TXT, risk-summary PNG and complete offline website. `infographic.js`
builds the SVG preview and high-resolution PNG locally from the canonical public contacts. The PNG contains
local and statewide numbers, practical notes, source dates and coverage limits, with no private tool inputs.
The complete HTML file adds the map, four tools and full sources. PNG generation needs scripts;
selected contact charts in saved HTML remain readable without scripts. The offline template is built from the
shared resource page, rather than a separate database or copy per city.

Quiet rows retain the five Reddit communities and phone chart. Optional Change location on the result
page contains the search/map. In saved files it changes location in place; online page URLs contain the public
place ID and may be logged by the host, as described in Privacy. Suggestions, image generation and private
tool inputs stay local. The separate resource/tool search remains removed.

The version before this structure is preserved by annotated tag `preview-before-service-buttons-20261102`
at `5c93d5e435a8ab59635d81ea97e32099109d6614`. To inspect it without altering current work:

```powershell
git worktree add --detach ../ferdant-preserved-20261102 preview-before-service-buttons-20261102
```

Serve that directory separately for comparison. The commercial demo stays on `website-preview-20261102`. See `DESIGN.md` for the current direction and historical references.

The service-list edition immediately before the icon tiles is also preserved at
`preview-before-icon-tiles-20261102` (`20096f939af6f17a99f7e295739f6680d0d61883`). All saved versions retain their original built files.

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

The current offline copy omits Saved guides, the Local essentials shortcut and the Saved to your device banner.
Guide links lead to the online pages and need internet. Download actions are consolidated: the PDF/TXT/PNG/HTML actions in Keep it and the separate offline chooser. The home no-JavaScript fallback also links the standard HTML file.
Change location stays on the atlas, with the existing detailed chooser in the first step; tool dialogs use their one Close control. Checked
local contacts appear once above the shared statewide support chart, with actual service distinctions preserved.
