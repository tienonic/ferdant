# Show all Everyday resources on the map

The map previously drew the same first eight records as the short resource list. Overlapping pins and nearby services outside the city view made the visible selection look even smaller. The user asked to make the available Everyday resources apparent without overwhelming the map.

Everyday now maps every location returned by the existing city/county selection and category filter. The list still starts with eight entries. Expanding that list does not add pins or change the map framing. Nearby pins use numbered groups that split as the reader zooms in; services at the same coordinates remain individually selectable in a popup. A count distinguishes all mapped resources from those in the current view. **Show all resources** fits the existing results, including nearby services; **City view** restores the city frame. Category buttons include their resource counts.

No source records, geographic eligibility, nearby-service selection, disaster response filters or data dates change. The count describes saved directory records, not confirmed openings or complete local coverage. Evacuation overlays and booklet generation remain separate.

Bounded T36 scope: `resource-map.js`, related styles, focused map tests and generated offline/source-reference files. Baseline: `e4b28c8` on the existing preview branch. Stop condition: all filtered records represented exactly once, mobile/keyboard/offline behavior verified and scoped preview changes committed. Public main release remains a separate decision.

## Verification

`tests/everyday-visibility.cjs` checks full map inventory against the existing directory model, unique representation, category totals, list independence, fit-all, keyboard group activation, selection of co-located services, city and county choices, and offline parity without network requests. The checked edition contains 10 selected Davis resources, 640 for San Francisco, 578 for Los Angeles city and 1,524 for Los Angeles County; the test derives expected counts from the data rather than fixing these numbers in code.

The existing map, physical-service, statewide-service and Everyday suites now count resources inside both individual markers and numbered groups. SVG checks still verify the individual category icons. Hazard, offline, source integrity and missing-data checks remain in place. The focused test is included in `verify:everyday` and therefore runs in the existing CI workflow. Screenshots and receipts are in ignored `screenshots/everyday-visible/`; GIS/tiles are fixtures, while directory data is the real saved edition.
