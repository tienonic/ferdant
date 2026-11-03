# Website reference catalog

The existing Sources & corrections footer link opens the compiled catalog at
`/sources-and-corrections/`. Its `references.json` download preserves the URLs,
uses, source dates, check dates, review limits, source-file locations and hashes.
The first view contains four collapsed categories. Open a category, a topic and
then an individual reference to read its source details. Provider website links
also have alphabetical groups. Dates, limitations, corrections and the download
are nested under About these sources & corrections. Native HTML details support
touch, mouse and keyboard use without JavaScript; sections open independently.
The search above the categories uses the city finder's input/listbox layout.
Two or more letters suggest matching categories, including matches to source
names and common topic terms. Selecting one opens its parent and subsection.
Arrow keys, Enter and Escape work; queries stay in memory and make no requests.
If JavaScript is unavailable, the search stays hidden and all disclosures work.

`scripts/references.py` compiles this during the normal build without networking.
It reads the map, disaster, physical-service, statewide-service and contact
registries, guide citations, source receipts, provider website fields, asset
provenance, licenses and first-party documentation. It resolves the composed
hazard-service URLs from the disaster registry. The 58 county service files
provide library and clinic website links; these links are directory attributes,
not claims that each provider website has received individual review.

Test fixtures, generated duplicate pages and examples inside upstream vendor
code are excluded from the supplemental link audit. Recorded unsuccessful
geocoding queries and legacy source records remain labeled as provenance, not
evidence of current mapped facilities. Unknown dates and reuse rights stay unknown.
Compilation does not refresh source-check dates, verify live services or publish
the website. The compilation date is an explicit editorial value.

Run `python scripts/build.py`, then `python tests/references.py`. The checks cover
all 15 guidance plans and GIS endpoints, facility/contact/guide source coverage,
asset download citations, source hashes, output consistency and page anchors.
`assets/references.css` affects this page only. Alternate-output builds include
the catalog and its stylesheet.
