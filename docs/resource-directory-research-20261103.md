# Broader resource searches without a city-by-city crawl

November 3, 2026. The existing map and page hierarchy stay in place. The existing
“More services & referrals” disclosure now holds 17 distinct search destinations
in seven expandable categories. A link beside the map's coverage note opens the
category relevant to the selected everyday type or disaster resource role.

## Scope and evidence

Input: the existing [comparable website research](comparable-websites-20261103.md),
the physical-service and statewide-directory manifests, and the primary pages
linked below. This is an independent source review; the other research agent was
not contacted. Existing website and research owners retain their roles.

Owned output: `content/resource-search.json`, `scripts/resource_search.py`, this
note, and narrow integration changes to the existing resource map, styles and
reference compiler. Stop after a cited directory catalog and working preview,
with category navigation, source coverage and offline behavior checked. This is
not a completed statewide inventory or evidence of available services.

## What the comparable sites actually use

| Site | Publisher evidence | Application to Ferdant |
| --- | --- | --- |
| [ClearHelp](https://clearhelp.org/about/) | Names CMS, HRSA, SAMHSA, VA, OpenStreetMap, Overture, GeoNames, coalitions, 211 listings and reviewed submissions. | Begin with original national/statewide sources. Its source list is a lead, not proof that every named dataset is reusable or that every record is verified. |
| [Findhelp](https://company.findhelp.com/products/the-findhelp-network/) | Describes a curated nationwide program network and relationships with community organizations. | Offer its public search for broad needs. No bulk data license was established. Automated access to its public search returned 403, so no results were copied or claimed verified. |
| [One Degree verification](https://help.1degree.org/article/64-how-does-one-degree-validate-resources) | Describes provider review, regional partner lists and feedback; article dated March 30, 2022. Its [update policy](https://help.1degree.org/article/41-are-resources-updated-regularly), dated November 12, 2024, says popular resources are checked at least every six months. | Use region and review dates explicitly. Its [coverage guide](https://help.1degree.org/article/28-what-is-one-degree), dated November 13, 2024, lists the nine Bay Area counties and Los Angeles County in California. Do not label it statewide. |
| [211 public locator](https://211.org/about-us/your-local-211) | Routes by location to local online directories. Its [API signup policy](https://apiportal.211.org/signup) requires written authorization from the applicable 211 center for external subscriptions. | Public search links now; no API account, subscription, data extraction or implied permission. |
| [Watch Duty sources](https://support.watchduty.org/hc/en-us/articles/13864783235469-Where-Does-Watch-Duty-Get-Its-Information) | Combines reporter review, agency information, radio traffic, WildCAD and NIFC. Its [data-access policy](https://support.watchduty.org/hc/en-us/articles/49118841313549-API-Data-Access-and-Using-Watch-Duty-in-Other-Tools), updated September 30, 2026, says there is no public incident API. | Keep official hazard feeds. Use NIFC as an upstream candidate, rather than copying Watch Duty incidents or imitating its reporting operation. |
| [USA.gov](https://www.usa.gov/benefits) | Routes readers to program-specific government benefits. | Keep benefits/application searches separate from physical service locations. UK Citizens Advice and repair tutorials are not California facility inventories; no removed landing-page guide is restored. |

## Where to search by need

The [machine-readable catalog](../content/resource-search.json) retains each
destination, publisher-evidence URL, coverage, review date and verification limit.
The website's Sources & corrections compiler includes these records.

| Existing need | Central search routes |
| --- | --- |
| Broad everyday needs | Findhelp, local 211 online directories, region-labelled One Degree |
| Food and supplies | [Feeding America](https://www.feedingamerica.org/find-your-local-foodbank), [CDSS county food banks](https://www.cdss.ca.gov/food-banks), [HUD Find Shelter](https://www.hud.gov/findshelter) |
| Housing | HUD and Findhelp; confirm intake and vacancies with providers |
| Healthcare | [HRSA](https://findahealthcenter.hrsa.gov/), [FindTreatment.gov](https://findtreatment.gov/locator), [VA facilities](https://www.va.gov/find-locations/) |
| Libraries/internet | Existing IMLS branch pins and provider links; [official phone/internet assistance](https://www.usa.gov/help-with-utility-bills) and local directory searches |
| Practical support | [California CSD](https://www.csd.ca.gov/Pages/FindServicesInYourArea.aspx), [Eldercare Locator](https://eldercare.acl.gov/home), [legal-aid finders](https://www.usa.gov/legal-aid), USA.gov benefits |
| Disaster preparation/recovery | [Listos](https://www.listoscalifornia.org/disaster-readiness/), [FEMA recovery centers](https://egateway.fema.gov/ESF6/DRCLocator), [DisasterAssistance.gov](https://www.disasterassistance.gov/) |

A regional food-bank office is not necessarily a pantry. A recovery center is not
an overnight shelter. Referral or benefits links never become pins merely because
an organization has an address. Phone numbers remain in the separate phone section.
Searches open the publisher's website; they do not run a combined live query or
send the selected city automatically. A city may contain several ZIP codes, so
Ferdant does not invent one. No background directory requests are introduced.

## Data sources to prioritize for subsequent map expansion

1. Continue the existing HRSA, IMLS and CDPH projections with their source IDs,
   dates and exclusions. These already provide broad geographic coverage.
2. Evaluate [CMS Provider Data Catalog](https://data.cms.gov/provider-data/about)
   downloads/API for additional healthcare types. CMS documents CSV downloads and
   keyless API access. Compare against existing hospital/clinic records to avoid
   duplicate pins; a Medicare listing does not establish free care or intake.
3. Use regional food-network and HUD locators to discover actual service sites.
   Obtain documented public exports or a permitted feed before bulk integration;
   neither a search UI nor a third party's claim of openness establishes a license.
4. [SAMHSA's FAQ](https://findtreatment.gov/faqs) documents annual survey updates
   and API registration. [VA's API](https://developer.va.gov/explore/facilities/docs/facilities)
   requires a key and warns that mobile-site coordinates may be inaccurate. Keep
   public locator links until an authorized integration and eligibility/location
   checks are ready. No registration was attempted.
5. [FEMA's recovery-center service](https://gis.fema.gov/arcgis/rest/services/FEMA/DRC/MapServer)
   distinguishes open and archived closed centers and states hourly updates.
   Any future integration must use the open layer, timestamps and explicit
   recovery-office labels. It is not added to the current shelter layer.
6. Treat OSM/Overture locations as candidates requiring service confirmation.
   Preserve applicable attribution and database license obligations; a place
   category does not prove public intake, affordability or emergency activation.

[Open Referral HSDS](https://docs.openreferral.org/en/latest/hsds/hsds_faqs.html)
is a useful exchange format for organizations, services and locations, not a
ready-made dataset or permission to copy a directory. Later imports should keep
provider IDs, services-at-location relationships, service areas, access rules,
hours, evidence dates and duplicate-resolution records. Confidential, mobile,
administrative-only and unverified locations remain outside public pins.

## Limits

The public pages were reviewed on November 3, 2026; their publication dates are
separate and often absent. JavaScript-only locators were corroborated with
publisher documentation. Findhelp, DisasterAssistance.gov and some other pages
restricted automated access; that is recorded rather than treated as a successful
live search. Individual provider hours, program availability and completeness
were not audited. No new facility data, city crawls, accounts or scheduled
collectors were created. Public deployment remains separate from this preview.

## Verification and input fingerprints

Static build passed. All 17 destinations and their publisher-evidence URLs are
in the reference catalog. The five reference tests and three physical-service
unit checks passed. Existing physical-service browser checks passed at four
widths, including actual offline downloads. Focused checks passed at 320, 390
and 1440 pixels: collapsed initial display, city context, everyday/disaster
category handoffs, food searches where no food pins exist, keyboard focus, no
new third-party requests, no telephone links in the directory, no overflow or
JavaScript errors. Directory disclosures also worked with JavaScript disabled.
External searches were not submitted; these checks do not confirm live results.

- `docs/comparable-websites-20261103.md`: SHA-256 `9e29b7a9e190a788eaf91484370f3b6f15f42c96f56f6ca45e7c5dc995dc39c6`
- `content/physical-service-manifest.json`: SHA-256 `f02a5872ee5f41236e0b492297d9605f3ed7b619f6a002d3e0950718f4c4bafb`
- `content/statewide-service-manifest.json`: SHA-256 `d43358c9ddd96c7af7f36b60a4294d7cad56a98a15f60ea9d5151330282e524d`
