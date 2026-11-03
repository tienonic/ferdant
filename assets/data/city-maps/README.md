# City outlines and tsunami planning areas

These are compact public map projections, checked November 2, 2026. A result page
requests one county file and reuses it for all three map tabs. All 483 city IDs in
the existing California index have a boundary; 20 counties have tsunami geometry.
The 58 JSON files total less than 4 MB. No street tiles are stored here.

`content/map-data-manifest.json` records the exact source queries, response hashes,
file hashes, coverage and byte counts. `content/resource-map.json` holds the dated
facility projection and source descriptions. `scripts/refresh-map-data.py` is a
manual import, separate from the offline build. It is not a collector or scheduler.

- City geometry: California Department of Tax and Fee Administration,
  [BOE CityCounty](https://publish.data.ca.gov/dataset/boe-citycounty), service edited
  October 29, 2026. Geometry is generalized by 0.00035 degrees, about 30–40 metres.
  These taxing jurisdictions are approximate; they are not legal or evacuation boundaries.
- Tsunami geometry: [California Geological Survey / Cal OES](https://www.conservation.ca.gov/cgs/tsunami/maps),
  using the feature service linked by that official page. Service data edited
  October 7, 2022; individual county publication dates differ. Geometry is
  generalized by 0.00005 degrees, about 4–6 metres. These planning areas do not
  predict a particular event, designate safe land or replace posted evacuation routes.
- County overviews come from the existing generalized Census BAS 2026 geometry
  in `content/california-cities.json`, with its retained provenance.
- Resource building outlines: © Microsoft, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/),
  [original dataset](https://github.com/microsoft/USBuildingFootprints), hosted by Esri.
  The `buildings` values in these JSON files are an extracted geometry database
  available under ODbL 1.0, with original feature IDs. The service was edited April
  13, 2022; its imagery capture dates are not supplied. These are computer-generated
  estimates. Exactly 277 of 362 directory points have one containing outline;
  overlaps and missing matches remain pins. This geometric relationship does not
  verify a facility's building, entrance, current use, accessibility or safety.
  See [license notice](BUILDINGS-LICENSE.txt). The application code and other
  separately sourced geometries are not represented as Microsoft data.

The map focuses San Francisco's initial viewport on its mainland. Its full taxing
boundary, including water and offshore pieces, is still drawn. The chosen view
does not alter jurisdiction geometry. No entrance, evacuation destination, route
or high-ground safety classification is inferred from points.

The facility projection contains 332 hospitals with emergency services and open
licensed status in CDPH's October 1, 2026 listing; 28 food-bank addresses matched
to CDSS on November 2, 2026, with approximate Cal OES points from January 2019;
and two first-party Davis community services. Food-bank offices are referral
locations, not confirmed walk-up distributions. Dated licensed hospital status
does not establish current capacity, access or operation after a disaster.
The Davis address points use Census street-range interpolation; they are not
building centroids or confirmed entrances. Provider publication dates are missing.

FEMA's open-shelter feed is queried online only when the earthquake tab is chosen.
It covers all incidents. The map reports query time separately from provider report
time and preserves missing report dates, errors and empty results. Live shelter
records and street tiles never enter the downloaded HTML. That file embeds only
the public county projection and original facility directory, plus contacts/tools.

`scripts/project-building-outlines.py --fetch` performs four bounded read-only
geometry queries against the Esri-hosted public Microsoft layer, for our facility
points only. Run it after any manual base-map import; it is never run by the builder.
Its query/response receipts and resulting county file hashes are in the manifest.
