# Ferdant design direction

Read this before changing the interface. The November 10 brief governs the current site.

## Location first, November 10

The map is the main object. A visitor chooses a California place, sees what the saved data says about that area, finds a plan and nearby resources, then saves what they need. The map stays in view while the story moves from the place to its hazards, county comparison, plan, directory places and downloads.

This replaces earlier guidance for Public Sans, stock photographs, a home headline, How it works, colored service tiles, hidden resource tabs and controls placed below a freestanding city map. Earlier versions remain in Git and their existing tags. They are history, not instructions for the current interface.

### Type and color

Keep the Newsreader wordmark in cobalt. Use Newsreader regular for the question “Where are you?”, the place name and the story's large sentences. Use its italic for at most one emphasized word per sentence. Large voice text is 40–56px on desktop and 30–36px on phones. Other headings use Geist at a smaller size.

Use self-hosted Geist variable Latin for interface and reading text, with tabular figures. Interface text is 13–15px and ordinary reading text is 16px. Keep the Newsreader and Geist SIL Open Font License notices and download receipts beside the font files. Public Sans and its old notice are removed, including from generated offline HTML. No external font request is permitted.

| Role | Value |
| --- | --- |
| Paper | `#FBFCFA` |
| Ink | `#14202B` |
| Muted ink | `#646C72` |
| Hairline | Ink at 14% opacity |
| Interface accent | `#244B84` |

Cobalt is the only interface accent. The map retains its category pin colors, distinct icons and registered hazard-layer colors. Preserve the required map credits. Do not display a map-library name.

Use space and occasional hairlines. No card grids, badge pills, gradients, shadows, stock pictures or nested section panels. Corners are square or 2px. Buttons are underlined text or one hairline outline, with at most one filled button per screen. Native disclosures retain sources, details and controls without filling the opening screen.

### Home

The header has the wordmark at left and Find local help, California resources, Community and Suggest a resource at right. Phones have the wordmark and Menu. There is no header rule.

Start with the question “Where are you?”, one input labelled “City, county or ZIP code” and its suggestions, followed by City, County, ZIP and State as quiet text toggles. Keep arrows, Enter, Escape, pointer and touch selection. Ambiguous input must not choose a place. Suggestions must not cover the mode controls. State retains its statewide view.

Draw California on paper with faint county boundaries. On arrival the map is quiet: no city dots, no zoom buttons and no tooltip. As the visitor types, draw only the matching places, as cobalt dots, and ease the map toward them: debounce by 120ms, ease for 400ms, and go no closer than a regional view. Each keystroke retargets the movement, and clearing the input returns the map to its quiet state. The status line announces the number of matching places. Reduced motion changes the view at once.

A pointer press, a wheel or pinch, keyboard focus on the map, or a switch to County, ZIP or State reveals every dot and the zoom buttons, so every earlier way of choosing a place still works. State keeps the map visible with the statewide lists in the location area. The California outline is at least 70% of the viewport height on desktop; on phones the map fills the rest of the first screen. Keep map attribution and approximation notes in the closed Map data & limits disclosure.

Below the map, show statewide starting points and communities as two readable lists with scope and publisher text and with the site's icons: the icon beside each statewide starting point, the category icon and arrow on each community, the external-link mark and the Statewide label. Icons keep their category colors. Support numbers, the suggestion draft and footer follow. Keep Eligibility and service areas vary. Put check dates in source/detail disclosures; never refresh or remove dates from data to make it look current. About carries the practical instructions formerly shown as How it works.

### Entering a place

A suggestion, unique Enter match or map choice travels to its destination over about 700ms with an ease-in/ease-out curve, then opens the public local URL. Draw the selected city or county outline. ZIP choices travel to the saved area center without inventing a postal boundary.

Use a shared map name for cross-document view transitions. Unsupported browsers navigate normally. Reduced motion skips travel and the transition. One sessionStorage flag, containing only the public chosen-place ID, marks this arrival; the local page consumes it immediately. No other input is stored. Saved files change location in place and never use that flag.

### A place's six steps

Use the existing atlas instance. On desktop it occupies the right 60% of the available viewport and stays full height; the left column scrolls. On phones it stays at the top at 46vh and the story follows below. Desktop steps are at least one viewport high, with proximity scroll snapping. Phone steps can grow with their contents. Never force mandatory snapping or trap a reader in the sequence.

1. The place name, county and approximate outline.
2. Up to three High or Moderate hazards from the existing FEMA screening, highest first, with the exact FEMA rating words and a five-level ordinal meter. It is not a probability or percentile meter. Preserve city-screening and partial-coverage limits, with the full method reachable.
3. One county comparison for the top hazard, followed by the confirmed county annual-loss estimate when available. Always name the county, including on city and ZIP pages. Compare only counties FEMA scored for that hazard. Count strictly lower scores, exclude ties from that count and round the resulting share down. Do not turn a raw percentile of 100 into a claim that a county exceeds every county.
4. The top hazard's existing headline and three steps, a full-plan disclosure, and every other plan plus Everyday. Keep choices in a quiet list without a sideways strip. A manual plan choice must survive incidental scrolling, location updates and source inspection.
5. Actual directory counts by category. Compact map groups may use a count alone on narrow maps, but retain full accessible names, category icons and every represented resource ID. A category filters the same atlas and opens the existing list. Confirm access and service limits rather than implying current operation.
6. Save the resource book, source TXT, risk summary PNG or complete offline HTML, followed by local contacts. Keep the PDF's contents and page order; its cover is now plain type with the place name.

The six-tick rail shows the current step and supports keyboard jumps. Change location stays reachable. Map controls and sources holds legends, planning roads, layer details and source disclosures. Its controls remain real, reachable controls, including when a source fails. The © OpenStreetMap link and Sources control remain visible.

An arrival plays only the first three steps: hold the place about 1.5 seconds, reveal the hazard rows, hold, then move to the comparison and stop with Scroll. Any wheel, touch, key or pointer input cancels play immediately. Direct visits do not play; explicit hazard links retain their plan. Do not make implicit story changes into hazard deep links. The number counts once in 600ms, rows rise 8px over 300ms, layers fade over 400ms and pin groups arrive about 60ms apart. No parallax or looping motion. Reduced motion shows all content without animation. Saved HTML is a static sequence with working tools and no network requests.

### Sources, tools and scope

Keep all existing contact data, original ratings, 14 plans plus Everyday, source dates, coverage gaps and provider limits. A city screening is not an official city rating or an address assessment. County relative risk is not a forecast. Expected annual loss includes buildings, agriculture and monetized deaths and injuries; this release uses 2024 dollars. Do not imply a county bill, property-only loss, an individual's loss or a probability.

The new manual import and its limits are recorded in [the November 10 implementation note](docs/immersive-20261110.md). Builds use checked-in data and never run an importer. Combined plans must name one official component in their county comparison rather than invent a combined FEMA percentile.

Keep the four financial tools, guide-library search, phone filter, native details, focus return from dialogs and reading without JavaScript. Tool examples stay opt-in. Private notes and filters never enter exports. Source absence remains unknown, not zero or safe. Referral-only places, ordinary services and activated disaster shelters remain distinct. Planning roads are not live closures or assigned safe routes.

The suggestion form creates local drafts only. Preserve its privacy rules, the absence of accounts, trackers, geolocation prompts and page-load commerce. No new frontend library or external service is part of this revision. Preserve both build modes, hosting markers, existing tags and dormant commerce.

### Verification

Build twice and confirm identical generated files. Run content, commerce, every verify script and the Sources-registry tests. Test actual downloads, disconnected files, direct and chosen visits, input cancellation, no-JavaScript reading, sources, failure recovery, keyboard focus and text contrast of at least 4.5:1. Check 320, 390, 768 and 1440px widths. Inspect first-screen and full-page screenshots, plus all six local steps on phone and desktop. Fixtures prove repeatable UI behavior; they do not establish current real-world service or hazard conditions.

## Earlier references and preserved versions

The following references were recorded in the earlier design work on November 2, 2026. Their historical dates and links remain; they do not override Location first above.

- [Professor Glitch's guide](https://www.askglitch.com/guides/how-to-make-ai-websites-not-look-ai) and its linked [frontend design guidance](https://github.com/anthropics/skills/tree/main/skills/frontend-design).
- [MyBikeDavis](https://mybikedavis.com/) and [Bored.com](https://www.bored.com/), inspected for the earlier icon-grid and directory versions. Their branding, copy and assets are not reused.
- [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) and [use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Passing focused checks is not a full accessibility certification.
- [Jonauskaite et al., 2016](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0152194), retained as historical color research. It did not test this site and establishes no outcome or universal preference here.

Preserve every existing tag, including `preview-before-service-buttons-20261102`, `preview-before-icon-tiles-20261102`, `preview-before-location-flow-20261102`, `preview-before-unified-location-20261102` and `preview-before-city-results-20261102`. The published starting point for this redesign is `d226739`. Do not rewrite those versions or publish without the existing release owner.
