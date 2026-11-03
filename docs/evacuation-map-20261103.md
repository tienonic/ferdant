# Davis evacuation roads on the map and booklet page 2

The user clarified that routes must be drawn on the map, identified Davis as the location, and required the evacuation map on the second page of the booklet. This extends the earlier link-only work. T36 and RM-Q18 ownership and public-release limits remain unchanged.

The Davis map now opens with a purple dashed evacuation-road overlay and a checked toggle. It uses the official Yolo County GIS Cooperative **Evacuation Routes** polyline layer, not inferred roads or zone boundaries. The overlay remains available across relevant disaster selections and clears for the other six plans. One shared control avoids duplicating the same roads for each hazard. Route popups identify the road and source. Existing resource pins, hazard layers and city framing remain in place.

The booklet places a vector evacuation map immediately after the cover, on page 2. It includes the same source roads, approximate city outline, selected street labels, north indicator, scale and source date. The map appears once; the later shared evacuation section retains official updates. Local route geometry is currently reviewed for Yolo County only. Other editions explicitly say that geometry is unavailable instead of inventing routes. The PDF is independent of the current map filter and toggle.

## Evidence

- Primary layer: [Yolo County Evacuation Routes](https://gis.yolocounty.gov/ext/rest/services/Public/Evacuation_Planning/MapServer/2), read November 3, 2026 directly from the county GIS server.
- Query only `Evac_Route='Yes'`. The county returned 1,310 matching records; 2 have null geometry and are recorded as omissions. The projection contains 1,308 lines. The source also has one `No` record and 21 null flags; these are excluded.
- [Projection receipt](../assets/data/evacuation-routes/manifest.json) retains the exact query, source and projection hashes, retrieval time, original attribution, counts and omitted object IDs. Geometry is not simplified. The publisher supplied no edit date; the check date is not a publication date.
- The source's live `Status` field is deliberately excluded. These are county-designated **planning** roads, not a declaration of current closures, an assigned safe route, a direction of travel or an evacuation destination.
- Direct official map entry points are also visible in relevant on-screen disaster plans. They distinguish Genasys zone status, San Diego's incident map, Santa Cruz's route-sheet directory and CGS tsunami planning areas. On recheck, Santa Cruz's SCZ-006 sheet is marked coming soon, so its directory has 30 linked sheets across 31 named zones.

## Maintenance and validation

`python scripts/import-evacuation-routes.py` is an explicit manual refresh. It checks layer identity, route flag, geometry type and complete object-ID coverage before writing the public projection. Builds do not run it. Review a new receipt and route changes before adopting an updated edition.

`node tests/evacuation-map.cjs` checks actual Davis line rendering, the toggle, all 15 disaster transitions, three viewport widths, county changes, missing data, page-2 placement and byte-identical offline PDF output with zero network requests. It also checks the stored source hash and omission counts. External hazard feeds and tiles are fixtures; route geometry is the real saved county projection. The PDF's second page is rendered and visually inspected separately, including visible route strokes and readable labels.

The saved city HTML embeds the reviewed county planning-road data. Live orders and closures are not saved. Existing public-source attribution is retained in map credits and the PDF/source TXT. This work does not launch the public main site.
