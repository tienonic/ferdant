# City resource books

The city download combines all fifteen disaster sections in one small, vector PDF.
A visual event index and PDF bookmarks jump to the relevant section. Each section
has an expressive title, the plain disaster name, the existing short official plan,
issue-labelled resource cards and a related phone chart at its end. A complete
phone appendix and source/edition pages follow. Page breaks preserve complete
cards and keep a related phone chart together when it fits on a fresh page.

## Content and selection

`resource-booklet.js` reads only the embedded public guidance/phone editions and
`FerdantResourceMap.directory(key)`. That reader uses the same city boundaries,
physical-directory rules and real nearby/county fallback as the map, independent
of the selected disaster or resource filter. It fetches only the selected county
files from this site when they are not already cached. It performs no external
GIS, live shelter, street-tile or provider lookup for the export.

Cards begin with the issue to solve, then the actual provider/address or clearly
labelled referral, the resource icon, known regular hours and a source-linked next step. Unknown
hours remain explicit. Cooling/warming referrals lead heat/cold; information
resources lead slower coastal, drought and subsidence planning. Hospitals,
clinics, food/basic needs, housing/day services and information/application help
stay distinct. Cooling/warming and disaster shelter cards are online referrals,
never saved activation claims. A warehouse is not substituted for pickup, and an
ordinary library is not substituted for a relief center. Missing medical records
retain an HRSA referral rather than an invented local point.

The book is a curated set of starting points, not every local provider. The
complete offline website retains additional mapped locations and service details.
Outside-city labels retain the actual county and approximate straight-line
distance. Check hours, entrance, eligibility, cost, accessibility and capacity with
the provider. The book does not supply a safe route or evacuation destination.

Per-event phone policies reuse the existing dated contacts. County referrals,
relevant saved municipal non-emergency/utility lines, road information,
poison advice where relevant and disaster-distress support stay purpose-labelled.
PG&E remains restricted to PG&E customers. After-hours/outside-city notes,
24/7 labels and call/text distinctions survive. No clinic/facility number is
guessed or collected. Every original contact remains in the full phone appendix;
the per-event chart is its related subset. Immediate danger still needs 911.

## Rendering and offline use

The PDF writer is the pinned MIT-licensed jsPDF 4.2.1 browser UMD build under
`assets/vendor/jspdf/`, with its official source URL and SHA-256. It loads locally
on an explicit PDF download, without a third-party CDN. It uses native PDF text,
clickable provider/source/phone links and small original SVG icons rasterized
locally. The PDF has a real page index and bookmarks; it is not one long image.
Text remains selectable. Some viewers handle call/text links differently.

The complete offline HTML embeds the writer, resource-book module and its license.
A chosen county saved in that HTML can regenerate its PDF without HTTP requests.
Unsaved county data stays a gap. Private notes, phone filters, current map choice,
clipboard contents, accounts and live status do not enter the PDF. Source check
dates, publisher dates and FY2024 library data remain separate. Referral links
need internet and phone calls/texts need phone service.

The existing PNG contact sheet remains available as a simpler phone image.
The main download panel previews the new resource book. Without JavaScript, the
checked phone directory and standard complete offline HTML remain readable;
browser PDF generation requires scripts.

## Checks

`npm run verify:booklet` audits all 541 location models, writes nine actual city,
county, coverage-gap and statewide PDFs, verifies every event/phone section,
bounds/source links and four-width download controls, and compares PDF bytes
before/after private notes and a map change. It reopens actual saved HTML offline,
regenerates the same PDF and tests a corrupt/missing additional county source.
Separate PDF text/link checks and rendered-page inspection accompany the handoff.
The existing site, PNG, maps and disaster/offline suites remain applicable.
These are local software/layout checks, not a live-provider or safety audit,
a complete service census or full PDF accessibility certification.
