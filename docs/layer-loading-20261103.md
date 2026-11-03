# Map layer loading — November 3, 2026

T36 bounded task: reduce the delay when selecting a disaster layer, test it, and show a loading screen for the remaining wait. Inputs are the ad-free preview at `f13b296`, the existing disaster registry, and the existing map loader. This changes loading behavior; it does not add or revise hazard data. The preview branch remains separate from publication on main.

## Changes

- Display each source as it arrives. Earthquake fault imagery no longer waits for the liquefaction and seismic-landslide queries.
- Reuse a source already fetched for the same place and bounds when another plan needs it. Preserve live-source expiry, the five-minute cache limit, original retrieval age, cancellation, and bounded cache size.
- Show a map loading screen after 180 ms. Shrink it to a status panel once detail arrives, and clear it after image/tile completion, failure, timeout, or a changed selection. Layer controls remain usable. Reduced-motion preferences disable the spinner animation.
- Include the new regression checks in `npm run verify:disasters`.

## Repeatable performance evidence

`tests/layer-loading.cjs` uses identical 1.6-second GIS responses and 100 ms fault tiles. These are controlled fixtures, not a claim about provider speed. Setting `LAYER_BASELINE_DIR` to a directory containing the prior `resource-map.js` and `disaster-layers.js` runs the comparison as well as the current checks.

| Measurement | Before, 390 px | After, 390 px | After, 1440 px |
| --- | ---: | ---: | ---: |
| First visible fault tile | 1,975 ms | 309 ms | 318 ms |
| Complete earthquake layer | 1,976 ms | 1,689 ms | 1,698 ms |
| Switch to shared landslide source | 1,643 ms | 72 ms | 72 ms |
| Repeat earthquake selection | 72 ms | 175 ms | 172 ms |

The old completion flag stopped at metadata, before image loading. The new completion flag includes image loading, so the repeated-selection completion timings do not measure the same endpoint. The source reuse check confirms that the landslide switch makes no additional GIS query.

Live-provider spot checks also showed early fault imagery, but varied substantially: a post-change earthquake selection displayed tiles after 515 ms while its remaining queries took 6.5 seconds. One flood request failed. Provider response time and availability remain outside this change's control; the loading screen covers that remaining wait.

## Verification and limits

The new tests cover progressive rendering, shared-source reuse, mobile and desktop layout, cancellation without stale geometry, retry after cancellation, source and tile failures, reduced motion, live-cache expiry without renewed age, and separate queries for different bounds. Screenshots and machine-readable timings are written to the ignored `screenshots/layer-performance/` directory. Test data is synthetic; these checks do not establish current hazard conditions or evacuation safety.

The existing disaster suite passed all 15 plans at four widths, including saved offline HTML, print/no-JavaScript reading, source failures, pagination, and stale data. The fault suite passed all 541 city/county choices, viewport coverage, bounded tiles, native zoom, lazy loading, failure recovery, and late errors. Content validation and JavaScript syntax checks passed. An old fault-description assertion was aligned with the existing registry wording; the concurrent cluster owner updated a separate assertion to count support resources inside groups.

Source ownership: loading logic in `disaster-layers.js`, the loading UI and `riskLayer` portions of `resource-map.js`, `.atlas-layer-loading` styles, the new loading test, its package command, and this record. Concurrent Everyday cluster changes have separate ownership. Stop after the regression checks and preview-branch delivery; no live publication or data-collection process is authorized by this task.
