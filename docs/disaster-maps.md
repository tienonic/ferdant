# Disaster plans and city GIS

The city page has 15 labelled disaster-symbol buttons, an everyday-resource button and a three-step
plan beside the map. Each symbol opens its plan directly, without a dropdown. A checkmark and pressed
state identify the selected view; text and shape carry the meaning alongside muted
icon colors. Native buttons retain keyboard focus and work with Space or Enter.
The grid wraps at phone widths without horizontal scrolling. Selecting another plan removes the preceding hazard geometry,
images, highlights and resource pins. City boundaries stay visible. The URL can
retain `hazard=flood` or another registered plan ID alongside `place`.

`content/disasters.py` is the reviewed source registry. It retains all 15 Cal OES
natural-hazard categories separately from the short public labels. It includes
guidance URLs, publisher/check dates, date meanings, GIS endpoints, map meanings,
attribution and offline rules. The builder embeds this registry without networking.

| Plan | GIS shown |
| --- | --- |
| Earthquake | CGS mapped fault lines plus liquefaction and earthquake-landslide investigation zones |
| Tsunami | Existing saved CGS/Cal OES county planning areas |
| Flood | FEMA effective Special Flood Hazard Areas, 1% annual-chance planning zones |
| Wildfire | CAL FIRE SRA severity effective April 2024 and recommended LRA severity from the 2025 rollout |
| Heat | Experimental NWS HeatRisk image with forecast valid time and issuance |
| Cold/freeze | Issued NWS cold and winter alert areas |
| Wind/storms | Issued NWS wind, dust and severe-storm alert areas |
| Sea-level rise/coastal flooding | NOAA 3-foot sea-level scenario above local Mean Higher High Water; connected inundation depth layer only |
| Landslide/debris flow | CGS earthquake-induced investigation zones; explicitly incomplete for rainfall landslides and post-fire debris flow |
| Drought | NOAA CPC monthly outlook with target month and issuance; not observed USDM conditions |
| Dam failure | Cal OES MyPlan state-jurisdiction inundation scenarios |
| Levee failure | Cal OES MyPlan deep flood-protection zones |
| Snow avalanche | Issued NWS avalanche alert areas, not terrain or route classification |
| Subsidence | DWR/TRE ALTAMIRA measured annual vertical displacement, feet, water year 2025 |
| Volcano | Cal OES/USGS selected volcanic planning areas |

`content/resource_plans.py` separately defines resource roles for every plan.
Sudden-event views start with medical directories and all-incident FEMA shelter
checks; slower planning views start with information and application support.
Medical care, food/basic supplies, housing/day services and information each have
a distinct filter. Heat and cold have separate cooling/warming filters: ordinary
libraries or clinics are never substituted for an activated relief site. Empty
roles retain their coverage gap and an official referral link where available.
Each physical resource type has a labelled SVG map symbol and matching legend.
See [physical-service coverage](physical-services.md) for all-city data, source
editions and limits. Switching a resource role replaces its pins while retaining
the selected hazard layer; changing disaster replaces both.

These layers do not certify buildings, entrances, routes or safe land. FEMA shelters
are an all-incident source and do not become earthquake-, fire- or flood-specific
by appearing under a plan. Local evacuation instructions, access and availability
must be confirmed. Empty, partial, missing, timed-out and expired data remain
distinct from an absence of hazard.

## Source and display rules

- Queries use the selected city/county's public map bounds, not GPS or private tool
  inputs. A source change clears old layers before querying the new one.
- Vector responses are reduced to geometry and a small public display projection.
  Queries page by the actual returned count, stop at four pages and enforce size
  limits. Partial data is labelled. No infrastructure inventory is copied.
- Weather alert timestamps support both ISO strings returned by ArcGIS GeoJSON
  and epoch milliseconds. Expired or invalid records are excluded. HeatRisk and
  monthly-outlook dates are checked; their valid periods are displayed.
- There is no polling, browser storage, service worker, account or scheduler.
  Re-selection reuses successful planning data or sufficiently fresh weather data.
  Failed/partial sources can recover on re-selection. Expired cached alerts are
  queried again. In-memory results are bounded to 18 entries and 20 MB.
- Images use the provider's actual projected extent, with Web Mercator converted
  back to Leaflet bounds. Coastal images avoid downloading enormous coastal
  polygon geometries. No street tiles are prefetched or exported.
- The map identifies the selected providers. CGS modified map figures retain its
  specified credit: “Modified from California Geological Survey, Webservice of
  Official Map of Seismic Hazard Zones (2025)”. New CGS extracts are excluded from
  offline files. Existing tsunami projection provenance stays unchanged.

## Fault lines and performance

The earthquake view uses the California Geological Survey's cached
[Quaternary fault tiles](https://tiles.arcgis.com/tiles/zr3KAIbsRSUyARHG/arcgis/rest/services/QuatFaults_Tiles/MapServer)
from the [2010 Fault Activity Map](https://maps.conservation.ca.gov/cgs/fam/).
The map edition is 2010; the service and legend were checked November 3, 2026.
Black traces and colored activity-age bands retain the provider's symbology:
red Historic, orange Holocene, green Late Quaternary and purple Quaternary.
The public key now translates those classes into recent recorded movement,
movement within about 12,000 years, movement within about 700,000 years, and past
movement with less specific timing. The colors retain the source meaning;
they are not reassigned to the separate FEMA High/Moderate/Low risk scheme.
The bands are not current warning levels or hazard-zone widths. Locations are
approximate planning references, not parcel boundaries or earthquake predictions.

### Plain-language key, November 3, 2026

Audience: residents scanning their city or county earthquake map on a phone or
desktop, without a geology background. The bounded change covers the fault key
and its household explanation, using the existing 2010 tiles and source colors.
It does not change fault geometry, risk rankings or map navigation. The input
`content/disasters.py` SHA-256 was
`201ad289d68def790f7ad83b086a51dbec35bf36766034696bcf6f6eaf7a1433`.

The collapsed “What fault colors mean for your home” section explains effects
and practical preparation. Original terms are in a nested disclosure; both are
keyboard accessible. Switching hazards hides and closes the explanation. It
remains available when online fault imagery fails or is absent from an offline
copy. Completion requires rebuilding the preview and checking the key,
disclosures, hazard switching and mobile/desktop layout.

Sources checked November 3, 2026:

- [CGS historical-earthquake map key](https://maps.conservation.ca.gov/cgs/historicearthquakes/)
  supplies Historic, 11,700-year Holocene and 700,000-year Late Quaternary
  explanations. The public label rounds 11,700 to about 12,000. The historical
  category belongs to the 2010 source edition; it is not updated as a live feed.
- [CGS 2010 explanatory pamphlet, pages 1–2](https://www.conservation.ca.gov/cgs/documents/publications/geologic-data-maps/GDM_006-FAM-Pamphlet-2010.pdf)
  distinguishes latest known displacement from claims that faults are active or
  inactive. Purple remains a broad, undivided age category; no precise movement
  date or recurrence interval is inferred.
- [USGS earthquake effects](https://www.usgs.gov/programs/earthquake-hazards/what-are-effects-earthquakes)
  supports the shaking, surface rupture and building/ground-condition context.
- [CDC earthquake safety](https://www.cdc.gov/earthquakes/safety/stay-safe-during-an-earthquake.html)
  supports securing furniture, lowering heavy items and Drop, Cover, Hold On.

These source URLs also appear in the map disclosure and generated reference
catalog. Wording and layout checks do not establish user comprehension through
a usability study.

Verification: preview build and content checks passed; the existing fault-map
suite passed all 541 city/county selections, keyboard disclosure, mobile width,
hazard switching and tile failure recovery. Live San Francisco views were
visually checked at 390 and 1440 pixels with no horizontal overflow.

Fault tiles follow the visible map across California, including when the user
pans away from the selected city or zooms out. This replaces the first version's
fixed city-area image, which stopped at its original bounds. The initial live
image checks found traces around Los Angeles, San Diego, San Francisco, San Jose,
Eureka and Palm Springs. Small Davis and Sacramento extracts were blank; this
does not establish that the wider region has no faults or no earthquake risk.

Only selecting Earthquake (or opening an earthquake deep link) adds this layer.
The browser requests pre-rendered 256 by 256 pixel PNG tiles for the visible area;
it performs no fault-geometry query, export rendering request or statewide data
processing. Tiles update after movement ends, with no off-screen retention
buffer or retina multiplier. Off-screen tiles are pruned. HTTP caching can reuse
previous tiles; no browser database, polling or bulk prefetch is added.

The highest source tile level is 13. Closer zooms enlarge that existing level
rather than requesting unavailable detail. Requests stay within the source's
California extent and do not wrap around the world. Switching away removes the
layer; subsequent map movement cannot request new fault tiles. Loading failures
are reported without hiding other successful hazard layers, and late errors from
a removed layer cannot overwrite the next plan's status.

The source metadata and legend hashes are in `content/disaster-source-manifest.json`.
Earlier city-image receipts remain as superseded history. The tile service
disallows bulk tile export; fault tiles are online only and are excluded from
saved offline files, consistent with the existing CGS extract rule.

## Offline copies

All 15 short plans are embedded. The chosen county outline, existing tsunami
geometry, original facility/contact directory and the chosen county's loaded
public library/clinic file remain available. Other county service files are
explicitly unavailable in that saved copy. Eligible recent
planning snapshots loaded for the chosen city can also be embedded, including
the coastal image and its georeferenced bounds. Forecasts, issued alerts, live
shelters, street tiles and new CGS seismic extracts are excluded. The saved copy
reports when a detailed layer was not saved. It makes no HTTP requests.

The selected plan remains readable with JavaScript disabled in a city-specific
export and prints as a short plan. Other plans can be selected offline with
JavaScript. Private tool notes and service filters do not enter the export.

## Maintenance and checks

`scripts/audit-disaster-sources.py` is a manual metadata receipt tool. It records
the exact responses' hashes and service data-edit fields without advancing
editorial dates or importing geometry. It does not run during a build or on a
schedule. `content/disaster-source-manifest.json` holds its latest reviewed receipt.

Run the normal build/content/responsive checks, `npm run verify:maps` and
`npm run verify:disasters` and `node tests/fault-lines.cjs`. The fault checks cover
all 483 city and 58 county selections, lazy loading, viewport coverage, bounded
tile retention, native zoom limits, removal, failure recovery and late errors.
Repeatable browser checks simulate external GIS
responses; separate live-browser checks are necessary to establish provider
availability. Tests are not agency approval, a safety audit or complete local
service coverage. Keep the public-release and maintenance-owner review boundaries.
