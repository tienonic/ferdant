# City resource books

The city download combines the selected disaster sections in one small, vector PDF.
The cover and chapters are ordered High, Moderate, Low, then Not assessed using
the source-linked [long-term risk method](hazard-risk-ranking-20261103.md).
Page 2 contains the street map with any available evacuation planning roads;
page 3 explains ratings and geographic scope.
The PNG download also includes the risk groups before the existing contact chart.
A printed event index gives page numbers, and PDF bookmarks provide optional
navigation on a screen. The printed PDF contains no web addresses or link
annotations, including phone and page links. Everyday help follows the risk
overview: eight categories of questions to ask, followed by a printed referral
phone chart. The source TXT retains the underlying directory URLs, review limits,
coverage and publisher-evidence links for later research. The cover preview and
phone-chart footer point readers to this expanded resource content. Each section
has an expressive title, the plain disaster name, the existing short official plan,
issue-labelled resource cards and a related phone chart at its end. A complete
phone appendix follows. Source names and check/publication dates are printed at
the back, with matching numbered references throughout the book. Full URLs and
edition notes remain available separately with Sources (TXT). Page breaks preserve complete
cards and keep a related phone chart together when it fits on a fresh page.

## Content and selection

`resource-booklet.js` reads only the embedded public guidance/phone editions and
`FerdantResourceMap.directory(key)`. That reader uses the same city boundaries,
physical-directory rules and real nearby/county fallback as the map, independent
of the selected disaster or resource filter. It fetches only the selected county
files from this site when they are not already cached. It performs no external
GIS, live shelter, street-tile or provider lookup for the export.

Cards begin with the issue to solve, then the actual provider/address or clearly
labelled referral, the resource icon, known regular hours and a printed next step. Unknown
hours remain explicit. Cooling/warming referrals lead heat/cold; information
resources lead slower coastal and subsidence planning. Hospitals,
clinics, food/basic needs, housing/day services and information/application help
stay distinct. Cooling/warming and disaster shelter cards direct readers to the
printed referral phone chart and explain what to ask,
never saved activation claims. A warehouse is not substituted for pickup, and an
ordinary library is not substituted for a relief center. Missing medical records
retain an instruction to ask about a clinic, rather than an invented local point.
Evacuation pages include space to write the household's zone, meeting place and
transport contact. They retain official safety instructions and printed references
without asking readers to open a website or use an online zone map.

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

## Companion source file

Numbered [S] references stay on the PDF cards and phone chart. Sources (TXT)
generates the matching UTF-8 file with every title, URL, checked date, publisher
date and edition/coverage note. The PDF footer identifies the printed source-note
page; readers can resolve every numbered reference without opening another file.
The source-only download does
not need the PDF writer. Both formats regenerate locally from the saved county
without network requests, with identical numbering. Browsers receive one file
per explicit button press; no multi-download permission is needed.

## Rendering and offline use

The PDF writer is the pinned MIT-licensed jsPDF 4.2.1 browser UMD build under
`assets/vendor/jspdf/`, with its official source URL and SHA-256. It loads locally
on an explicit PDF download, without a third-party CDN. It uses native PDF text,
readable phone numbers, source notes and small original SVG icons rasterized
locally. The PDF has a real page index and bookmarks; it is not one long image.
Text remains selectable. Numbers retain call/text labels without link actions.

The complete offline HTML embeds the writer, resource-book module and its license.
A chosen county saved in that HTML can regenerate its PDF without HTTP requests.
Unsaved county data stays a gap. Private notes, phone filters, current map choice,
clipboard contents, accounts and live status do not enter the PDF. Source check
dates, publisher dates and FY2024 library data remain separate. The printed book
needs no web connection to read; phone calls/texts still need phone service.

The existing PNG contact sheet remains available as a simpler phone image.
The main download panel previews the new resource book. Without JavaScript, the
checked phone directory and standard complete offline HTML remain readable;
browser PDF generation requires scripts.

## Checks

`npm run verify:booklet` audits all 542 location models, writes ten actual city,
county, coverage-gap and statewide PDFs, verifies every event/phone section,
bounds, printed source references, absence of URLs/link annotations and four-width download controls, and compares PDF bytes
before/after private notes and a map change. It reopens actual saved HTML offline,
regenerates the same PDF and tests a corrupt/missing additional county source.
Separate PDF text/link checks and rendered-page inspection accompany the handoff.
The existing site, PNG, maps and disaster/offline suites remain applicable.
These are local software/layout checks, not a live-provider or safety audit,
a complete service census or full PDF accessibility certification.
