# Disaster plans and city GIS

The city page has one disaster selector, an everyday-resource view and a three-step
plan beside the map. Selecting another plan removes the preceding hazard geometry,
images, highlights and resource pins. City boundaries stay visible. The URL can
retain `hazard=flood` or another registered plan ID alongside `place`.

`content/disasters.py` is the reviewed source registry. It retains all 15 Cal OES
natural-hazard categories separately from the short public labels. It includes
guidance URLs, publisher/check dates, date meanings, GIS endpoints, map meanings,
attribution and offline rules. The builder embeds this registry without networking.

| Plan | GIS shown |
| --- | --- |
| Earthquake | CGS liquefaction and earthquake-landslide investigation zones; emergency hospitals and FEMA-listed shelters |
| Tsunami | Existing saved CGS/Cal OES county planning areas |
| Flood | FEMA effective Special Flood Hazard Areas, 1% annual-chance planning zones; FEMA-listed shelters |
| Wildfire | CAL FIRE SRA severity effective April 2024 and recommended LRA severity from the 2025 rollout; FEMA-listed shelters |
| Heat | Experimental NWS HeatRisk image with forecast valid time and issuance |
| Cold/freeze | Issued NWS cold and winter alert areas |
| Wind/storms | Issued NWS wind, dust and severe-storm alert areas |
| Sea-level rise/coastal flooding | NOAA 3-foot sea-level scenario above local Mean Higher High Water; connected inundation depth layer only |
| Landslide/debris flow | CGS earthquake-induced investigation zones; explicitly incomplete for rainfall landslides and post-fire debris flow |
| Drought | NOAA CPC monthly outlook with target month and issuance; not observed USDM conditions |
| Dam failure | Cal OES MyPlan state-jurisdiction inundation scenarios; FEMA-listed shelters |
| Levee failure | Cal OES MyPlan deep flood-protection zones; FEMA-listed shelters |
| Snow avalanche | Issued NWS avalanche alert areas, not terrain or route classification |
| Subsidence | DWR/TRE ALTAMIRA measured annual vertical displacement, feet, water year 2025 |
| Volcano | Cal OES/USGS selected volcanic planning areas |

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

## Offline copies

All 15 short plans are embedded. The chosen county outline, existing tsunami
geometry and original facility/contact directory remain available. Eligible recent
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
`npm run verify:disasters`. Repeatable browser checks simulate external GIS
responses; separate live-browser checks are necessary to establish provider
availability. Tests are not agency approval, a safety audit or complete local
service coverage. Keep the public-release and maintenance-owner review boundaries.
