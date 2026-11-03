# Evacuation information in the resource book

Added November 3, 2026 for the user's request to include evacuation information in relevant disaster infographic sections without repeating the same routes. This is a bounded T36 website change; existing ownership and the RM-Q18 public-release decision remain unchanged.

## Reader flow

One **Evacuation routes & updates** section contains the selected place's reviewed official links, the California county alert directory and Caltrans highway conditions. Nine disaster chapters link back to that section: earthquake, tsunami, flood, wildfire, coastal flooding, landslide, dam failure, levee failure and volcano. Flood travel guidance appears once for the four related flooding hazards. Tsunami adds its distinct evacuation-planning guidance and the CGS coastal map index. The other six chapters receive no repetitive route block. This classification does not claim evacuation is impossible during those hazards.

The shared section is bookmarked in the PDF. Chapter page references are clickable. The companion source TXT retains source types, check dates, unknown publication dates, review limits and corroborating links. Offline HTML embeds the same catalog and generates the same PDF without network access. Its external information links still require internet.

## Sources and limits

The reviewed catalog is [content/evacuation.json](../content/evacuation.json). November 3 is the link/content review date, not a publication date or confirmation of an active route. No evacuation order, closure, address-to-zone assignment or route geometry is saved or inferred.

| Scope | Official source | Meaning |
| --- | --- | --- |
| California | [Cal OES county directory](https://calalerts.org/signup.html) | Alert enrollment links; not current orders |
| California highways | [Caltrans](https://roads.dot.ca.gov/) | Current restrictions lookup; not all local streets or an assigned route |
| Yolo County | [Evacuation guidance](https://www.yolocounty.gov/government/general-government-departments/office-of-emergency-services/emergency-preparedness-resources/evacuation), corroborated by [West Sacramento](https://www.cityofwestsacramento.org/residents/evacuation-routes) | Zone lookup and incident instructions; indexed official text read, direct Yolo retrieval returned 403 |
| Los Angeles County | [Emergency information](https://lacounty.gov/emergency/) | Official Genasys status entry point; inactive template text on the page means no status is copied |
| San Diego County | [Emergency maps](https://www.alertsandiego.org/en-us/preparedness/maps.html) | Agency-published incident routes when supplied; boundaries and reporting can lag |
| San Mateo County | [Genasys guidance](https://www.smcgov.org/dem/genasys-zonehaven) | Zone status complements alerts; not street routing |
| Humboldt County | [Evacuation mapping](https://www.humboldtgov.org/3219/Evacuation-Mapping) | Official zone map and alert instructions |
| Santa Cruz County | [Evacuation information](https://www.santacruzcountyca.gov/OR3/Response/Evacuations.aspx) | County planning and incident entry points |
| City of Santa Cruz only | [Emergency management](https://www.santacruzca.gov/Services/Public-and-Environmental-Safety/Emergency-Management) | Directory of 31 advance route sheets; linked sample PDF returned 403, so geometry was not reviewed |
| Tsunami planning | [CGS coastal maps](https://www.conservation.ca.gov/cgs/tsunami/maps), [NWS preparation](https://www.weather.gov/safety/tsunami-before) | Hazard/planning maps and local evacuation planning, not current safe roads |
| Shared preparation | [CAL FIRE](https://www.fire.ca.gov/prepare/get-ready-to-go), [NWS flood guidance](https://www.weather.gov/safety/flood-during) | Household preparation and flood travel precautions |

Local coverage is six counties plus City of Santa Cruz. Remaining places explicitly state that no local route-planning resource has been verified in this edition and retain the statewide official links. City of Santa Cruz sheets are not assigned to Capitola or to a county-wide selection. A city/county choice alone cannot establish a household's evacuation zone.

The Yolo 2024 evacuation annex was also inspected. Its narrative refers to appendix evacuation maps, but the retrieved Appendix A contains fuel-station tables; it is not used as a verified route-sheet inventory. Some official pages have no publisher date. No date is fabricated, and CGS county map dates remain separate from the statewide index review.

## Implementation and verification

Owned changes: new catalog and focused test; evacuation config injection in `scripts/resource_map.py`; model, PDF section and chapter links in `resource-booklet.js`; generated preview and offline HTML. Map rendering and route calculation are outside this change.

`node tests/evacuation-booklet.cjs` checks all 542 city/county/statewide models, eight real PDFs, local scope, nine chapter references, one occurrence of each shared link, explicit coverage gaps, layout bounds, source text, and byte-identical Davis offline export with zero HTTP requests. GIS and street tiles are test fixtures, not a live evacuation-status audit. PDF pages are additionally rendered for visual review. Runtime artifacts are under the ignored `screenshots/evacuation/` directory.

Stop condition: reviewed public-source catalog integrated in the existing preview, focused tests and PDF layout review pass, and only this task's changes are committed to the preview branch. This does not authorize launching the public main site.
