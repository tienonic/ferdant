# Location first — November 10, 2026

Ferdant now begins with a place and one map. The home page has no headline, stock pictures or How it works section. A chosen location travels into the existing atlas, which stays in view through six steps: place, hazards, county comparison, plan, nearby directory places and downloads.

## What changed

Stage 1 (`da5d928`) removes the home heading and photos, photo credits and the PDF cover photograph. The resource book has a plain place-name cover; its contents and page order remain. Geist variable Latin replaces Public Sans, with its SIL Open Font License notice and provenance. Newsreader remains the wordmark and large voice, with an italic face for the save sentence. Shared pages and the offline edition use paper, ink, muted ink, cobalt, space and hairlines. Home resource sections are two visible lists. Check dates move into source/detail disclosures; original data dates remain.

Stage 2 (`17ed452`) adds about 700ms of eased map travel and a shared map view transition before navigation. Reduced motion skips both. The public chosen-place ID is the sole sessionStorage arrival flag; the local page consumes it immediately. A missing storage API does not prevent navigation. City, County, ZIP, State, keyboard suggestions and saved-file location changes remain available.

Stage 3 (`b698297`) puts the story beside the same resource atlas. Desktop maps occupy the right 60% of the available viewport at full height; phone maps stay at the top at 46vh. Desktop steps use proximity snapping. The rail jumps to all six steps. An arrival holds the place, reveals the hazards and stops at the comparison; wheel, touch, key and pointer input cancel play. Direct visits do not play, and explicit hazard links retain their plan. Reduced motion and saved HTML show static content. Implicit scene changes do not write hazard links into the URL.

Plan choices and the full plan are in step 4. Directory counts, filters and the existing place list are in step 5. PDF, TXT, PNG, offline HTML and local contacts are in step 6. Legends, layer status, planning roads, source notes and the Sources disclosure remain in Map controls and sources. The © OpenStreetMap link and Sources button stay visible. Narrow maps use smaller counted groups while preserving every resource ID, category icon and accessible name.

About carries the useful instructions formerly shown on home. The no-JavaScript home fallback links to readable plans and the standard offline file. Source-date language and the privacy page explain the new arrival flag without changing the handling of private inputs.

## What stayed

Original locations, contacts, ratings, hazard coverage, service facts, source dates, phone charts and the 14 plans plus Everyday remain. The new statistics are separate data; they do not replace city tract screening or county rating bands. All four location modes, financial tools, provider links, evacuation planning roads, legends, shelter distinctions, source disclosures and downloads remain reachable.

Exports still exclude private notes, drafts and service filters. Offline files embed their data, styles, fonts, icons and tools, make no network requests and retain no live shelter or forecast claim. Reading without JavaScript remains available, including the selected offline chart and all short fallback plans. Dormant commerce, preview/production modes, hosting markers and every existing Git tag remain. No frontend library, external provider, tracker, account or geolocation prompt was added.

## County statistic and source limits

The manual importer is `scripts/import-county-risk.py`. Its checked-in outputs are `content/county-risk-scores.json` and `content/county-risk-scores-manifest.json`. The build reads those files and never runs a network import. The source is the county service already named in `content/hazard-risk-manifest.json`, from FEMA National Risk Index December 2025 / v1.20.

| Field | Meaning and use |
| --- | --- |
| `COUNTY` | Official county name, matched to the existing California county index. |
| `STCOFIPS` | Official FIPS identifier. Site keys are a different index: Yolo is site `57`, FIPS `06113`; Los Angeles is site `19`, FIPS `06037`. |
| `NRI_VER` | Release label, checked against December 2025 for all imported records. |
| `<hazard>_RISKS` | FEMA's official hazard-specific national percentile at county level, within the counties with a numeric score for that hazard. It is not a probability, city score or forecast. |
| `<hazard>_EALT` | Total expected annual economic loss, in dollars per year on average. This release uses 2024 dollars and includes buildings, agriculture and monetized deaths and injuries. It is not a property-only loss or county budget. |
| `comparison.<hazard>.below` | Derived count of national counties with a strictly lower numeric score. Ties are excluded. |
| `comparison.<hazard>.assessed` | Count of national counties with a usable numeric score for this hazard. |

[FEMA's technical documentation](https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf), sections 3.2 and 5.3.2, supplies the score, annual-loss and monetary definitions. The PDF download returned HTTP 403 on this host; the relevant indexed text at that exact official URL was read. This limitation is recorded in the manifest. The downloaded [FEMA Federal Register notice](https://www.govinfo.gov/content/pkg/FR-2023-05-26/pdf/2023-11268.pdf), page 34172, also confirms the buildings, agriculture and monetized-population components.

The [official county feature service](https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0) supplied all 58 California rows and four national score pages containing 3,232 county and county-equivalent records. Queries, release checks, field aliases, input hashes and the output hash are recorded. Only numeric, nonnegative scores enter a hazard's assessed set; unavailable values remain unavailable. Assessed counts differ: earthquake, inland flooding and wildfire have 3,144; tsunami has 65; avalanche has 684; heat wave has 3,114.

The page says **assessed U.S. counties**, qualifying the brief's unqualified wording. It displays `floor(100 × below / assessed)`. Rounding a raw percentile is insufficient for a strict “higher than” comparison, particularly with ties or a small assessed set. The original score remains unchanged in the data.

| Worked example | Raw score | Strictly below / assessed | Display |
| --- | --- | --- | --- |
| Yolo earthquake | `97.42366412213741` | `3062 / 3144` | Higher than 97% |
| Los Angeles earthquake | `100` | `3143 / 3144` | Higher than 99% |
| Del Norte tsunami | `98.46153846153847` | `63 / 65` | Higher than 96% |
| Alpine avalanche | `91.08187134502924` | `622 / 684` | Higher than 90% |

For Davis, the comparison explicitly names **Yolo County**. `ERQK_EALT = 42002870.753190205` becomes about **$42 million a year**. It is a county-level long-term estimate, not a Davis loss, an individual loss or next year's bill. Los Angeles's `4565736367.017469` becomes about **$4.6 billion**. The on-page line retains the release, price year, monetized-population limit and relative-risk caveat.

Cold and storms combine several existing planning topics. Their statistic names a single official component selected from the county component scores; it never invents a FEMA composite. Unsupported statistics fall back to counts of saved California screens sharing or exceeding the existing rating. Dam failure, levee failure and subsidence remain unassessed by this NRI source. Rating levels are ordinal categories, not equal percentile ranges or event chances.

To repeat the existing import without network access:

```bash
python3 scripts/import-county-risk.py --input-dir ../sources/county-risk-20261110 --checked 2026-11-10
```

Use `--fetch` only for an explicit new source review. Raw receipts stay outside Git. The county tests always check the committed fields, hashes and worked examples; the full raw-receipt audit additionally runs when that receipt folder exists, or when `FERDANT_RISK_INPUT` points to it. All six tests ran without skips on this host. Receipt-only reprojection is byte-identical.

## Changed assertions and setup

These changes reflect intentional labels, layout, order or behavior. Exact data, source, privacy and offline assertions remain. No source failure, missing-data, stale-data, live-feed, private-input or disconnected-file check was weakened.

| Test | Changed assertion or setup, and reason |
| --- | --- |
| `site-check.cjs` | Loaded reading font changes from Public Sans to Geist; additionally reject loaded Public Sans. Rename the output-only receipt field from resource tabs to resource lists. |
| `portal.cjs` | Two visible sections and keyboard Enter on anchor links replace tab/tabpanel counts and arrow/Home tab navigation. Keep link counts, history, deep links, focus, overflow and empty storage. Remove obsolete photo-decode setup. |
| `accessibility.cjs` | One service-header icon color replaces five because cobalt is the only interface accent. Keep the 4.5:1 text, 3:1 icon, target, focus, text-spacing and forced-color checks. |
| `state-view.cjs` | Communities remains visible beside the California list. Keep the shared data instance, mode identity, keyboard focus, return to City/County and request assertions. |
| `county-preview.cjs` | Hover blue, selected green and white fills become cobalt and paper. Keep 58 polygons, hover, touch, selection, reset and offline behavior. |
| `cleanup-layout.cjs`, home | Replace How it works/photo order with their absence and map heights of at least 55vh/70vh. Use a 0.01px floating-point tolerance; the size threshold is unchanged. |
| `cleanup-layout.cjs`, local | Retain the old minimum-height and map-in-view checks; the new immersive test additionally measures 46vh on phones and 100vh on desktop. Controls belong to step 4 instead of sitting below the map. Map controls starts closed rather than relying on an exposed inner desktop legend. Keep plans, pressed/check state, focus, credits, Sources, offline HTTP and empty errors. |
| `resource-booklet.cjs`, cover | Replace photo position/aspect checks with no SVG image or Photo credit; photo layout audit data is removed with the photo. Source TXT must omit the removed photography publisher/license. Cover title width becomes all 532 printable points from x=40, retaining its 43pt height limit. |
| `resource-booklet.cjs`, downloads | Use the keyboard Keep it rail tick instead of the hidden duplicate map-header shortcut. Assert its accessible label, 44px dimensions, current step and download placement. Keep PDF bytes, contents, page order, source, scope, privacy and offline checks. |
| `location-flow.cjs` | Add local county-map navigation to the canonical Yolo URL, matching selection and cleared arrival storage. Existing suggestion, keyboard, invalid-place and scope checks stay. |
| `phone-directory.cjs` | Put the deliberately navigating local map choice after the in-place chart/filter request capture; assert canonical URL, Davis heading, selected value and empty storage, then wait for new-page initialization. Keep exact request assertions for in-place/private interactions. Preload the known local italic face before that capture. Keep the post-clear chooser test that found a hidden chooser bug. |
| `story-helpers.cjs` | Enter What is near you before Everyday inventory checks, since the opening scene deliberately shows only a boundary. Open Map controls before inspecting its nested controls or rendered status text. This is setup, not a changed inventory expectation. |
| `resource-map.cjs`, `disaster-plans.cjs`, `layer-loading.cjs`, `physical-services.cjs`, `statewide-services.cjs`, `everyday-services.cjs`, `everyday-visibility.cjs`, `resource-facts.cjs`, `resource-scopes.cjs`, `zip-search.cjs` | Their existing ready helpers use the shared scene/disclosure setup. Preserve exact records, counts, source hashes, failures, errors, cache/expiry behavior, privacy and offline equality. |
| `resource-map.cjs` | Measure the step 6 offline action instead of the hidden map-header duplicate, retaining the 44px target check. |
| `disaster-plans.cjs` | Open the new Map controls parent before the inner legend. Preserve exact fault-layer and legend contents, exclusive layers and nested sideways-clipping checks. |
| `everyday-visibility.cjs` | Open Map controls before Show all resources. Compact narrow-map count labels may omit “places”; require the exact integer and full accessible “N nearby places … Open the list” name. Keep all represented IDs, uniqueness, members, co-located services, independent-list counts and offline equality. |
| `resource-scopes.cjs` | Exact place headings become Davis and Yolo County, including saved files, without the old resources suffix. All scope/selection checks stay. |
| `zip-search.cjs` | Move the unchanged “PDF booklet cover Yolo County” assertion from `local-page-intro` to `story-place-note`. Keep distances, overlapping-county notes, snapshots, distinct ZIP inventories, offline equality and county PDF scope. |
| `statewide-services.cjs` | Explicitly select Everyday for the source-recovery pin assertion after reload. Restored scroll can select a hazard view, which correctly omits library pins; the recovered dataset and exact pin expectation are unchanged. |
| `immersive-flow.cjs` | New checks cover home removals, actual fonts, first-map size, Davis selection/travel, six ordered steps with actual Davis/LA/Yolo values, strict comparison fields/counts, annual loss, every plan, categories, focus, contrast, reduced motion, cleared-location recovery, actual offline/no-JS reading, zero offline HTTP, play ending at step 3, every input cancellation, direct visits and zero console errors/overflow at four widths. The comparison assertion checks strict lower-score counts rather than rounding the raw FEMA score; LA therefore expects 99%. |
| `test_county_risk.py` | Six new tests cover county/FIPS identity, release, fields and output hash, tied/missing scores, strict worked examples and all imported comparisons against the national raw receipts. |
| `package.json` | Add `verify:immersive`. Add county tests to `verify:risk`; keep npm Python commands on `python` for Windows. |

## Defects caught and fixed

Suggestions initially covered the mode row after it moved below the input; suggestions now occupy normal flow. Removing tabs exposed a synthetic State-link click that moved keyboard focus; it is removed. Travel initially magnified vector dots; eased camera updates now keep them crisp.

The story initially overwrote a manual plan on incidental scroll, hid marker DOM before its attributes existed, hid the chooser when a location cleared, and could change a scene during a pending county update. Explicit interaction state, mounted marker groups, chooser restoration and busy guards fix those cases. A parent click handler initially caused duplicate official queries; its event order now preserves the original two-query shared-source check. Narrow plan rows no longer clip, alert signup text retains contrast, and phone counted groups clear the controls and map credit.

The count/denominator audit found a data wording defect before publication: raw rank is not the strict percentage below, and not every county is scored for every hazard. The importer now derives the exact comparison from the same official national dataset. Original source data and rating bands are untouched.

## Verification and screenshots

Run the production build twice, content and commerce tests, every `verify:*` script in `package.json`, and `python3 tests/references.py`. `verify:risk` includes the county tests. On Yuzu, build with `python3` directly; the external test runner supplies a temporary `python` shim and explicit `SITE_URL` without changing Windows npm commands. The supplied existing Chromium executable was used; no browser was downloaded.

Stage 1 and 2 each passed all 14 then-existing commands. Stage 3 passed all 15, including the new immersive flow, plus six county tests and five source-registry tests. Stage 4 also passed all 15 commands, including the six county tests in verify:risk, and the five Sources-registry tests. Second builds were byte-identical. A separate preview build retained all 16 noindex notices and the new script. These checks do not establish current provider operation or live hazard conditions.

Screenshots remain outside the repository in `../shots/stage1/`, `stage2/` and `stage3/`: first screen and full page at 320, 390, 768 and 1440px for home, Davis, Los Angeles, Yolo County and guides. Stage 3 also has all six steps for each local example at 390 and 1440px. Every final image was inspected. Stage 4 repeats the page captures after the documentation build.

The existing public-map fixtures isolate browser tests from network availability. Design captures use a paper street tile and transparent raster fixture; vector hazard fixtures are layout evidence, not agency coverage. OpenStreetMap tiles denied this host during the live check. Live tiles and every current hazard feed are not certified by these captures. The county statistic import did query the real official service and preserves its dated raw receipts and hashes.
