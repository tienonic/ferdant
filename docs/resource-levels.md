# City, county and statewide resources

This is an ad-free revision of the original `before-monetization` snapshot
at `5ace99717fe9912665c410aae2cab58a322adc71`. The original tag stays intact.
The revised source is on `website-preview-before-monetization`; the saved
revision tag is `before-monetization-resource-levels`. The separate
monetization experiment remains on its existing preview branch.

The starting map has City and County buttons. City mode shows 483 city markers
and searches city names. County mode removes those markers, shows 58 county
areas and searches county names. Clicking a county area selects its county
resources. Keyboard search remains available in both modes. Changing modes
changes the selection interface; a resource location changes only after a map
choice or a confirmed search. The same switch works in the Change location
control and in the complete offline HTML.

A selected city page names its city, county and state above the map. A county
page names its county and state without implying a city selection. Local
contacts and phone rows carry visible scope labels, derived from the existing
source records and city/county membership arrays. PG&E's customer-only contact
is labeled Provider, rather than implying a city or statewide public service.
A missing county number uses a Statewide referral label. Existing unknown city
coverage and provider eligibility notes remain visible.

Map cards and popups distinguish City location, County service, County
location and Nearby locations outside the selected county. County service is
used only when a record explicitly lists that county service area. A point in
a city is a geographic location, not a claim of municipal ownership or that
all city residents qualify. A library/clinic collected in a statewide dataset
is not labeled a statewide service. County-based file storage is not service
eligibility. Broader public links are labeled as statewide help and general
California-wide/national guides; statewide homepage links are visibly marked.

Inputs are the original `content/regions.json`, city/county index, existing
service-area fields and city-boundary calculations. Regions SHA256:
`1bec6513304e739e0bbddb5d00559b75528a6d01b3d7b14fc8303e065798364c`.
No new records, service boundaries, source dates or eligibility facts were
collected or inferred. Original family photos, guides, disaster plans and
resource selections remain. Offline HTML contains the hierarchy, scope badges
and selection switch; existing PDF/TXT/PNG exports keep their original source
and provider-limit fields.

Verification covers all 541 location choices, four screen widths, city and
county autocomplete/keyboard selection, county map clicks, marker hiding and
restoring, provider and statewide fallbacks, map card labels and an actual
offline download with offline county switching and no HTTP requests. The full
sixteen-page responsive/navigation/tool/phone/no-script/privacy/offline/PNG
suite and content/production checks also passed. Map services use repeatable
fixtures for UI tests; this is not a new live-provider audit.

Run `npm.cmd run verify:scopes` and `npm.cmd run verify:responsive` against a
local server. For a separate ad-free preview:

```powershell
python -m http.server 4177 --bind 127.0.0.1
```

Open http://127.0.0.1:4177/ . This remains an editorial preview. Public main
stays the maintenance page; Ronnie retains T36 review and RM-Q18 remains open.
