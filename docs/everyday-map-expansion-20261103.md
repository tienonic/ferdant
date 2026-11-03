# Everyday map expansion — November 3, 2026

The map gains 3,932 public-directory points across 55 counties: 215 food
distribution sites, 1,227 drinking-water points, 2,436 restrooms and 54 showers.
The existing hospital, clinic, library and reviewed Yolo service directories stay
in place. These are partial directory listings, not a claim that every city has
every service or that a location is open now.

The related-site review in `resource-directory-research-20261103.md` favored
established directories over scraping individual city websites. This pass uses
those directories' underlying public-source approach. Findhelp, 211, One Degree,
Feeding America and other provider locators remain available for services without
importable, suitably scoped records. No proprietary directory is bulk copied.

## Point sources and limits

- [SFPUC's public water/restroom map](https://www.sfpuc.gov/learning/how-you-can-help/free-drinktap-drinking-water-and-restroom-map)
  links the [DataSF dataset](https://data.sf.gov/City-Infrastructure/San-Francisco-Public-Bathrooms-and-Water-Fountains/wfq4-upmv).
  419 selected points have explicit public access. Human water fixtures only;
  staff/school access restrictions and Camp Mather records outside SF are excluded.
  Record observations and November 2026 ingestion are separate dates.
- [LA County DPH food distribution](https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Food_Distribution_chp/FeatureServer/0)
  supplies 215 selected public distribution listings. The
  [publisher metadata](https://www.arcgis.com/sharing/rest/content/items/dd4d0483c6104a19ba3217d054848ace?f=json)
  identifies **211LA data from May 2023**. Every imported entry states that date
  and asks visitors to confirm current service. School/university and warehouse
  names are excluded; these are distribution records, not inferred regional
  food-bank headquarters.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) supplies 3,298 selected
  community-mapped water/hygiene points with explicit public/permissive access.
  Its [drinking-water tag](https://wiki.openstreetmap.org/wiki/Tag:amenity=drinking_water)
  describes potable-water points, but mapping is not a current water-quality test.
  Known paid, restricted, conditional, inactive and unsuitable points are excluded;
  unspecified fees stay unknown. OSM food-bank and soup-kitchen tags were excluded
  pending provider review. Some are warehouses or eligibility-limited services.

Raw inputs remain outside the repo. `content/everyday-service-manifest.json`
records hashes, query, exclusions, source dates and per-county output hashes.
`assets/data/everyday-maps/README.md` explains licensing and links a separate
downloadable OSM-derived database under ODbL. Author/account metadata and telephone
fields are excluded from the public projection. Existing generalized boundaries
assign actual cities/counties; boundary-edge omissions remain possible.

## Presentation and verification

Food uses the existing utensils icon. Drinking water uses a droplet; restrooms use
a toilet; showers use a showerhead. Cards, pins and legends share one icon registry.
The new **Water & hygiene** filter sits inside the existing Everyday dropdown.
Category-balanced selection prevents dense water/restroom coverage from displacing
all food, healthcare or practical support. Water/hygiene points more than 25 km
away are not used as a city's fallback. County views retain the county's points.

Water/hygiene kinds stay out of disaster plans; a routine fixture is not an
activated water distribution, shelter or cooling location. No live network lookup
to the directories occurs during browsing. Local county shards are hash checked
and preserved in city-specific offline copies. Reference search includes the new
sources; the resource book's directory section inherits Water & hygiene links.

Verification: `node tests/everyday-services.cjs`, `node tests/statewide-services.cjs`,
`node tests/physical-services.cjs`, `node tests/resource-booklet.cjs`,
`python tests/references.py`, and the physical-service Python tests. UI checks use
stubbed external hazard/tile responses; source downloads and local point records
are real. These checks do not verify individual service operation.
