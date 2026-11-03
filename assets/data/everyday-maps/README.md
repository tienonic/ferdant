# Everyday public-service points

This is a dated, partial directory of actual food-distribution, drinking-water,
restroom and shower locations. It is not a live opening-hours or emergency feed.
County files are loaded only for the selected county and included in that city's
offline download. Missing points do not mean services are absent.

## Sources and reuse

- **© OpenStreetMap contributors**, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
  The complete OSM-derived database is separately available in
  [openstreetmap-projection.json](openstreetmap-projection.json), under ODbL 1.0.
  That file includes column names, attribution and its license. It contains no
  author usernames or other account metadata. OSM edit dates are not inspection
  dates. Only explicit public/permissive access is selected; confirmed paid,
  conditional, inactive and restricted points are excluded. Unspecified fees
  remain unknown. Food-bank and soup-kitchen tags need separate provider review
  and are not imported. Generic food-bank tags can identify warehouses.
- [San Francisco public bathrooms and water fountains](https://data.sf.gov/City-Infrastructure/San-Francisco-Public-Bathrooms-and-Water-Fountains/wfq4-upmv),
  PDDL per the publisher's metadata. Only publicly accessible human drinking-water
  points and restrooms inside the mapped SF county boundary are included.
  Individual observation dates and ingestion dates are kept distinct. SFPUC's
  [public map](https://www.sfpuc.gov/learning/how-you-can-help/free-drinktap-drinking-water-and-restroom-map)
  explains the dataset's purpose. Nearby OSM points of the same kind within 50 m
  are suppressed in favor of this directory; this can omit distinct nearby fixtures.
- [LA County DPH food-distribution layer](https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Food_Distribution_chp/FeatureServer/0),
  using 211LA data from **May 2023**, as stated by the
  [publisher](https://www.arcgis.com/sharing/rest/content/items/dd4d0483c6104a19ba3217d054848ace?f=json).
  These older site listings need provider confirmation. Schools, universities and
  warehouse-name records are excluded. [County terms](https://egis-lacounty.hub.arcgis.com/pages/terms-of-use)
  apply to the county source. These facts are a separate directory component,
  not represented as OSM data.

County files form a collection of these separately attributed sources. The OSM
component remains under ODbL; no claim is made to relicense another publisher's
data. All source links, dates, input hashes, exclusions, column names, counts and
file hashes are in `content/everyday-service-manifest.json` in the repository.

Rebuild with `python scripts/project-everyday-services.py --input-dir <receipts>`.
Keep raw downloads outside the repository. This imports reviewed snapshots;
ordinary website builds do not query directories. County and city assignment uses
the site's existing generalized boundaries, so edge/coastal points can be omitted.
An unincorporated location is labeled by its county rather than a guessed city.
New drinking-water and hygiene kinds appear only in Everyday, never as activated
disaster water, cooling, warming or shelter resources. No telephone data is added
to the map.
