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

The map contains 338 physical service records: 332 existing dated emergency
hospitals, two newly reviewed original Davis service sites, and four additional
checked public visits. The new visits are the Davis library, Davis Community Clinic,
D Street Resource Center and LSNC's Woodland office serving low-income Yolo County
clients. This is a checked Yolo subset, not a statewide everyday-service census.
Other counties retain the dated hospital directory and explicit collection gaps.

Twenty-eight legacy regional food-bank referral-office points are excluded from
map pins; the CDSS locator is available in the separate More services & referrals
section. Their historical input records and original source dates remain unchanged.
Phone/referral resources stay in the existing phone chart and web directory.

Two additional public service addresses, Knights Landing Resource Center and the
East Beamer routine shelter, have no unique Census geocoder match in this check.
They are retained as unlocated candidates and produce no pin. Senior/disability,
transport, utility-assistance and temperature-specific sites still need local
source/coordinate checks. The direct senior-center source request returned 403;
cached hours are not passed off as freshly verified. Confidential shelters remain
outside the map, including when a public office handles intake.

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

New location points use Census street-address interpolation, except the clinic,
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
