# Physical resources by need and situation

The city map separates physical service visits from phone/referral directories.
Everyday places can be filtered by need. Disaster symbols replace those places
with the selected hazard layer and its existing response locations. A county
office can remain listed outside the selected city only when its checked service
area explicitly includes that county; proximity alone does not establish eligibility.

## Categories

| Need | Physical visit type | Situation rule |
| --- | --- | --- |
| Food & basics | Actual pantry/distribution or prepared-meal site | Use the service address and distribution hours, not a regional warehouse or referral office. |
| Food & basics | Clothing, hygiene and basic supplies | Preserve restrictions, intake and supply uncertainty. A donation drop-off is not a pickup site. |
| Shelter & housing | Housing intake or daytime resource center | State daytime services; do not imply overnight accommodation. |
| Shelter & housing | Routine overnight homeless shelter | Separate regular intake from disaster activation and available beds. Never map confidential locations. |
| Shelter & housing | Activated disaster shelter | Current FEMA-listed OPEN feed only, with report/check times and access/capacity unknowns. It covers all incidents. |
| Healthcare | Community clinic | Appointments, departments and fees differ from emergency departments. |
| Healthcare | Emergency hospital | Existing dated CDPH directory; current emergency operation and capacity are not confirmed. Also used for earthquake response. |
| Libraries & internet | Public library branch | List only checked local services. A library does not imply charging, cooling, warming or overnight shelter. |
| Practical support | Senior/disability service center | Verify the service site, target group, accommodation information and intake. |
| Practical support | Public/accessible transportation pickup | Pin an actual public stop or pickup site; headquarters and phone-only booking services do not qualify. Never infer an evacuation service. |
| Practical support | Utility-assistance office | Verify public intake, service area, appointments and eligibility. Public funding is not universal access. |
| Practical support | Legal aid intake | Preserve case/financial eligibility and new-client versus existing-client hours. County-serving offices can be outside the city. |
| Heat / cold relief | Confirmed cooling space | Requires a reviewed current activation source or explicit regular-hours cooling service. Ordinary library labels do not qualify. |
| Heat / cold relief | Confirmed warming space | Same rule; neither regular hours nor a building address establishes emergency opening. |

`support` is the retained resource-center type for the original public day center.
Multi-service places carry several categories but produce one pin. Filtering food
can therefore include a public resource center with verified distribution services.

## Current coverage

Every one of the 483 indexed California cities and 58 county choices has actual
physical directory points. There are 3,502 unique static records: the prior 338
plus 1,110 IMLS public library outlets and 2,054 HRSA permanent community-clinic
locations. The city audit finds in-boundary points for 456 cities; 27 use clearly
labelled real nearby/county locations. A nearby address does not establish program
eligibility. No facility is assigned an invented city-center coordinate.

This is statewide coverage of selected directory types, not every program in each
city. Food pickup, routine housing, legal, senior/disability, transport and utility
visit details remain partial. The Yolo provider-checked records retain their own
hours and sources. Every disaster has relevant resource roles and empty-category
referral links. Ordinary libraries are not mapped as activated relief centers.

Twenty-eight legacy food-bank referral-office points remain excluded. Two unlocated
Yolo candidates remain unpinned. Confidential addresses, seasonal/mobile or
school-only clinics, administrative-only sites, bookmobiles/mail-only libraries,
nonrespondent/future/temporarily closed survey records and imprecise street-name/
postal geocodes do not become public pins. The historical Palisades permanent
building record is withheld; its temporary service needs a separately checked point.

## Per-disaster organization and icons

`content/resource_plans.py` defines all fifteen policies. Sudden disasters begin
with dated care locations and all-incident FEMA shelter checks; the notes distinguish
post-danger support from evacuation destinations. Heat/cold include separate
cooling/warming roles with an explicit unavailable-current-feed state. Coastal
planning, drought and subsidence begin with ordinary information/application
resources. Each plan also groups relevant care, food/basics, housing and recovery
support. Selecting a role replaces the other pins without removing its hazard GIS.

All 15 resource types have original SVG pictograms in `scripts/icons.py`, used
inside the Leaflet marker and beside the legend text. Distinct shapes and labels
supplement colour; markers retain their full accessible provider names and 44px
hit areas. These are directory symbols, not official warning signs.

## Efficient regional data

The new records occupy 550,974 bytes across all 58 county files. A compact tuple
schema shares descriptions, unknown access fields, icons and source metadata.
`service-resources.js` loads only the selected county, checks its edition/schema
and SHA-256 where browser crypto is available, and reuses a bounded 12-county
in-memory cache. Failed or corrupted files remain explicit source gaps and can
recover on retry. No polling, account, location permission or persistent storage
was added.

The selected county is embedded in the downloaded HTML. Other saved-city choices
in that county can reuse it. Outside that county, unsaved additional data is
reported as unavailable; the existing directory/geometry fallback remains. Street
tiles and current weather/shelter status remain online only. There are no HTTP
requests from the reopened file.

The city selector uses local points where available, then actual nearby or county
records by type. It retains verified county-serving offices and diversifies the
initial marker set. Outside-city labels give the real county and straight-line
distance from an approximate city center; these are not driving distance, safety
or closest-provider guarantees. A provider in another state may be closer.

## Source and maintenance rules

`content/physical-services.json` holds categories, public sources, checked visits
and updates to the two original Davis records. `content/physical-service-manifest.json`
records exact public page hashes and successful/unsuccessful coordinate queries.
Raw source HTML remains in a local temporary review folder, outside the repository.
No contact roster, phone field, account state or arbitrary provider record is imported.

`scripts/physical_services.py` selects only public service addresses with unique
verified coordinates. It strips unrelated fields, excludes legacy referral points,
and rejects invalid coordinates and static emergency-activation assertions.
Activation-dependent categories need a reviewed current feed before they can be
added as map records; this edition does not treat a static schedule as activation.
The existing online FEMA shelter loader remains separate. Builds make no network
requests and never advance source dates or start an importer/scheduler.

The original new Yolo location points use Census street-address interpolation, except the clinic,
whose provider address uniquely matches an HRSA public service point. They are
approximate locations, not surveyed entrances. No new building outlines were inferred.
Provider pages have no supplied publication date; November 3 is the check date.
Regular hours, eligibility, cost, accessibility, activation and available space are
separate fields. Unknowns remain explicit; there is no Open now or Accepting people
inference. Provider links should be checked before travel.

Saved HTML carries the same public resource data, filters, sources and uncertainty.
Changing a filter does not export private tool notes or a live status. Current
weather/shelter data and street tiles retain their online-only rules. Reopened
files make no HTTP requests.

Run `npm run verify:services` with the existing map/disaster and responsive checks.
The service suite covers exclusions, invalid points, current-activation safeguards,
county service matching, every resource filter, local coverage gaps and actual
offline exports. These checks do not certify local service completeness, safety,
rights to use a resource or current admission.


## Statewide source editions

- [IMLS public-use library survey](https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls): FY2024 outlets, CSV published June2026. The guide's outlet codes were reviewed; annual service-hour totals are not interpreted as weekly opening hours. System websites are retained for current details. The public-use data are unrestricted, unlike restricted-use respondent files.
- [HRSA public service layer](https://gisportal.hrsa.gov/server/rest/services/HealthCareFacilities/PrimaryHealthCareFacilities_FS/MapServer/0): listed Active, permanent, non-school/non-hospital service-delivery sites. Name exclusions remove restricted/institutional or mobile/admin sites missed by those fields. Current admission, department suitability and operating capacity remain unknown. California Census odd county FIPS001..115 are explicitly converted to the existing CDTFA county IDs01..58; their last two digits are not interchangeable.
- Source check dates, source publication/fiscal year and unspecified edit dates remain distinct. Aliases at a shared service address are retained; a newer checked provider record takes precedence over its duplicated statewide directory record. Raw IMLS archives and HRSA responses stay local, outside the repository.
- Broader food and relief sources were considered without substituting warehouses or generic libraries. HUD search and the Hunger Free America directory returned403 during direct retrieval. EPA's combined excess-food recipient layer is not treated as verified walk-up food pickup, and its purpose-specific terms are retained in the handoff. The mapped core is complete for the selected edition; specialty program and current activation coverage remain incomplete.

`npm run verify:statewide` verifies every county file/hash, each city's actual
local/nearby care and library points, all 15 default policies, all 541 browser
location choices, each hazard's resource roles at four widths, SVG markers and
source-failure recovery. Other suites verify actual offline/no-script/print files.
