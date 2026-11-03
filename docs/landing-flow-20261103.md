# Location-first landing page — November 3, 2026

The homepage leads to city resources through the existing location search and map.
Below it, California resources, Guides & tools and Communities are separate tabs.
The default view contains four statewide starting points and the existing expandable
California phone chart. Tools, topic guides and offline downloads are secondary;
the existing five branches remain available through Communities and their hubs.

## Bounded change

Input: preview commit `65a80e68b1d5eacea58e939259b71f8045b08ad3`, the current
`DESIGN.md`, the existing audience brief and Philip's November 3 request to reduce
landing-page clutter while preserving the map. Scope: landing resource templates,
scoped CSS and tab enhancement, shared navigation, and their regression checks.
Ronnie retains T36 and the existing release review remains under RM-Q18.
Stop after responsive, navigation, city handoff, keyboard, no-script and offline
checks pass. This is a preview implementation, not evidence of visitor demand.

Audience: California residents scanning for practical help, often on a phone;
neighbors and resource curators may relay links. The existing audience evidence
and user direction inform the structure. No new audience study or model judging
was run. Statewide entry points do not establish eligibility or complete local coverage.

## Flow

1. **Find local help:** choose a city/county using the unchanged search and map.
   The existing `/local/?place=…` page supplies local resources and downloads.
2. **California resources:** statewide publishers and shared phone numbers.
3. **Guides & tools:** four browser-local tools, the existing national/general
   topic links, full guides and the offline-copy page. General guidance is labelled
   separately from city services.
4. **Communities:** all five exact branch names and full scopes, with existing hubs.
   About lives in the footer and its existing page.

The tabs support arrow keys, Home/End, browser Back and direct fragment links.
Without JavaScript all three sections remain readable and tool links open guides.
Print includes all three sections. No account, storage or new tracking is added.
Map scripts, data, rendering and styling are outside this change.

## Source review

New links were inspected on November 3, 2026; this does not advance dates in the
existing phone, guide or map datasets.

| Publisher | Use | Publisher date observed |
| --- | --- | --- |
| [CPUC Consumer Support](https://www.cpuc.ca.gov/consumer-support) | Utility assistance and consumer support | Not stated |
| [CSLB license search](https://cslb.ca.gov/onlineservices/checklicenseii/CheckLicense.aspx) | California contractor license lookup | Not stated |
| [DHCS Medi-Cal applications](https://www.dhcs.ca.gov/medi-cal/apply/) | Official application routes | Not stated |
| [Listos disaster readiness](https://www.listoscalifornia.org/disaster-readiness/) | Preparedness and recovery guides | Page timestamp `2026-10-05T17:11:57+00:00`; not a claim that every linked guide was revised then |

Implementation: `scripts/landing.py`, `landing.css`, `landing.js` and the existing
builder. The map remains first on the page. The general download button was moved
out of the location entry; city downloads remain on the city result page.

Verification and limitations: the existing responsive suite covers all 16 pages at
four widths, internal URLs, keyboard use, tools, source access, no-script reading,
form privacy and saved offline files. The landing checks additionally exercise
tabs, hash/history restoration, tool focus return and city-map preservation.
Map-service fixtures make UI checks repeatable; this work is not a new live audit
of agencies, current resource access or disaster conditions. No public deployment
or completion of T36 is implied.
