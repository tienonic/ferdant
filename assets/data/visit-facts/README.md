# Listed hours, fees and amenities

These are supplemental facts for existing directory locations, with no new map pins.
All resource cards use the same five fields: Location, Hours, Services, Costs and
Amenities. Regular schedules do not establish current opening, beds, supplies,
emergency activation, eligibility or safe access. Missing values stay explicit.

The manual projection matched 2,800 existing records and saved 666 OSM schedules,
including 556 schedules missing from the prior directory, 1,539 fee descriptions
and 1,770 amenity lists. Ten ambiguous nearby matches were omitted. Coverage is
partial; a missing supplement does not mean the place lacks a service or amenity.

Sources are OpenStreetMap's existing November 3, 2026 basic-needs snapshot plus a
new bounded library/healthcare query. The new OSM base timestamp is
2026-11-04T01:04:35Z (November 3 in California). Individual object edit dates are
preserved; they do not verify service operation. Publisher dates remain unknown.
The projection manifest records both original hashes, the query/hash, counts and
all county file hashes. Ordinary builds and page loads do not query Overpass.

Exact existing OSM object IDs match directly. Other matches require the same
service type, at most 150 meters separation, and name/address agreement; close
competing matches are rejected. This does not certify a building entrance or
current service. Whitelisted public values exclude OSM users, account metadata,
contact tags, rosters and unrelated records. Raw source responses stay outside Git.
No existing clinic, food, shelter, eligibility or emergency designation is expanded.

**OpenStreetMap-derived facts:** copyright OpenStreetMap contributors, ODbL 1.0.
The complete matching derived projection is [available separately](openstreetmap-projection.json).
[Attribution](https://www.openstreetmap.org/copyright) and
[license](https://opendatacommons.org/licenses/odbl/1-0/). Source object links are
preserved per fact. The county files contain only that same OSM component.

Reviewed provider additions are separate in `content/provider-visit-details.json`.
They include two Vallejo branches' published services/fees/amenities and structured
facts from the existing reviewed Davis records. Existing provider schedules and
service details take priority over map tags. Missing provider hours are not filled
from annual survey-hour totals. The JFK page contains inconsistent black-and-white
printing prices, so an exact current rate is not selected. Provider updates do not
relicense or replace the OSM projection.

One selected county shard is loaded from this site, checked against its saved
hash, and embedded in a selected offline HTML download. Unavailable or unsaved
county supplements retain baseline provider facts and explicit missing fields.
The website and PDF use the same print-ready strings. Complex OSM hour expressions
remain verbatim; simple days/times become readable schedules without calculating
an Open now status. Full URLs remain in the matching source TXT; printed facts
contain no web-link actions.

Manual regeneration reads saved receipts:

```powershell
python scripts/project-visit-facts.py --osm <library-medical-osm.json> --existing-osm <osm-everyday.json> --query <query.txt>
```

Verify with `node tests/resource-facts.test.cjs`, `node tests/resource-facts.cjs`,
`npm run verify:services`, `npm run verify:everyday` and `npm run verify:booklet`.


## Later provider gap review

The provider supplement also contains regular schedules for 28 existing SFPL
locations, matched to current provider addresses. SFPL's September 14, 2026 print,
copy, scan and fax policy is stored once against those explicit IDs; it cannot
apply to another library system or bookmobile. Field-specific evidence separates
that dated policy from branch schedules with no supplied publication date. Map
amenities remain visible alongside the provider's confirmed services, with both
source records retained. A separate policy for those same 28 IDs records SFPL's
confirmed Wi-Fi and public computers; it does not infer card eligibility,
computer time limits or current availability.

Exact-address Vallejo clinic reviews separate primary clinic, urgent-care and phone
hours, preserve lunch/meeting closures, and cite billing policies independently.
The old Great Beginnings URL redirects to Georgia Street; records at 190/210
Hospital Drive do not inherit that schedule. Unreadable or ambiguous provider
information remains a gap. No optometry opening is inferred from a clinic's hours.

`project-sfpl-provider-hours.py` reads a saved, reviewed navigation extract and the
original HTML hash; it never fetches or runs during a build. The extract keeps only
location names, addresses, canonical links and day/slot/comment fields, selected
from each `.location` element. A seven-day complete schedule and matching address
are required. The reviewed third/3rd street abbreviation and one Saria/Sarria street
spelling are recorded during matching; no geocode or entrance is moved.
