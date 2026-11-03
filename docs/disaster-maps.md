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

The earthquake view adds the California Geological Survey's Quaternary fault
traces from layer 21 of the [2010 Fault Activity Map](https://maps.conservation.ca.gov/cgs/fam/).
The map edition is 2010; the service was checked November 3, 2026. Faults appear
as red lines above the investigation-zone shading. Styling is simplified and
does not encode age or location certainty. These are approximate planning
locations, not parcel boundaries, a complete inventory or earthquake predictions.

The CGS server renders one transparent 800 by 600 pixel PNG for the selected
city/county area, with a minimum 0.2-degree context box for small places. This
avoids the service's street-scale display cutoff; returned image bounds retain
the actual georeferencing. The browser receives that image, never the statewide line
geometry. Only selecting Earthquake requests it (or opening an earthquake deep
link); other views do not preload it. There is one export-metadata request and
one image request. Switching away removes it, and successful repeat selections
reuse the existing bounded in-memory cache. Pan and zoom reuse the image without
queries or geometry calculations; zooming therefore does not add mapping detail.

Images have a 512,000-byte limit enforced while streaming, before decoding.
The final live Berkeley browser check returned a roughly 9 KB image, with no
page errors; broader Bay Area and Los Angeles probes were about 17 and 19 KB.
Those are sample results, not a guarantee for every view. Existing request
cancellation, timeout and partial-source handling remain in effect. A failed
fault layer does not erase successful investigation-zone layers, and missing
lines never establish safety. The source metadata hashes are in
`content/disaster-source-manifest.json`. Like the existing CGS investigation-zone
extracts, the fault image is online only and excluded from saved offline files.

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
lazy loading, bounded image requests, cache reuse, pan/zoom, removal, failure
recovery and size rejection. Repeatable browser checks simulate external GIS
responses; separate live-browser checks are necessary to establish provider
availability. Tests are not agency approval, a safety audit or complete local
service coverage. Keep the public-release and maintenance-owner review boundaries.
