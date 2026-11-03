# Ferdant design direction

Read this before changing the interface. This is a project-specific design brief, not a downloaded theme.

## Job and audience

Help someone with limited time take a concrete household or administrative step.
They may arrive from search with a question about a bill, repair, provider, utility or disruption.
The first content pilot covers bills and paperwork; the five communities retain their distinct, full scopes.
People should reach a useful tool or sourced action without signing in or joining Reddit.

## Direction

Porcelain white with deliberate cobalt controls and calm typography. Express the requested porcelain quality
through clarity, proportions and the surface; a literal plate illustration is unnecessary.
The memorable element is a workspace with a bill-change breakdown, cancellation planner and live message builder. Its numbers come from the reader,
not invented savings, claims, testimonials or activity counters.

The previous proposal used a large question beside three numbered guide rows and a second numbered directory.
That arrangement was repetitive, made small labels do too much work and gave the introduction too much space.
The current version combines the user's Bored.com directory idea with MyBikeDavis's icon-above-label grid.
A visible California city/county selector and offline download begin the homepage. Changing location immediately
shows a short list of checked local agency links and call numbers, with service-area cues. Longer details and
sources expand together. General guides stay clearly labeled as general resources; selection does not imply local coverage.
Four service tiles share a desktop row and two share a phone/tablet row. Phone numbers stays first.
The five native, initially closed service dropdowns use short everyday labels and the exact Reddit community names.
Each opens its existing scope, public links and community link in place. Bills & paperwork also holds the four local tools.
Phone numbers is an initially closed tile; offline download is a direct button beside the location selector.
If a county has no saved alternate referral line, show the existing statewide ZIP-code routing contact with its statewide scope.
Each opened tile uses the full directory width for its information, with a compact horizontal summary.
The top location selector works without opening or loading the phone map. It shares one choice with the phone picker,
map and offline export. Clearing removes stale local results. General resources remain accessible before selection.
Without scripts, hide the inactive city selector and retain statewide numbers plus the standard offline download.
Search reveals matching links and opens their section; clearing restores the previous section states.
Omit corner count badges; numbers need a direct task meaning, such as a bill amount, checked record or active search result.
Tools open in a dialog or local worksheet. Closing returns focus and preserves directory position.
Without scripts, native service dropdowns work and tool links lead to the existing guides.
Full guide URLs remain optional detailed reading. Core use stays on the directory.

The previous grid is preserved at tag `preview-before-service-buttons-20261102` (commit
`5c93d5e435a8ab59635d81ea97e32099109d6614`). Preserve it as an inspectable version rather than overwriting history.

## Tokens

| Role | Value |
| --- | --- |
| Porcelain surface | `#FBFCFA` |
| Main text | `#1D2D3E` |
| Cobalt controls and wordmark | `#244B84` |
| Secondary text | `#526170` |
| Dividers | `#CCD5DC` |
| Worksheet surface | `#EEF2F5` |

Category icon accents: connectivity `#215AA0`, repairs `#A04A28`, utilities `#126C68`, money `#6543A0`,
preparedness `#3D6B3F`, tools `#4B51A3`. Match each category's icon, thin top rule and navigation dot.
Tool launchers and dialog headings share their task icon/color. Keep titles, visible labels and different shapes;
users must be able to find the same destination without distinguishing the hues.

Newsreader regular is for the wordmark and headings; Public Sans regular, medium and semibold are for reading,
labels and controls. Both are self-hosted with their SIL Open Font License notices. Use `font-display: swap`,
system fallbacks and optical sizing. Do not add an external font service or third typeface.
Body copy is at least 15px on phones. Essential labels and links are at least 13px.
Main reading measures stay below about 75 characters. Type shrinks only for secondary dates and notes.

## Layout and components

- Left aligned. Desktop content width is 1192px within 64px side gutters; phone gutters are 22px.
- The homepage starts with a small directory heading, search and compact category/section links.
- Group destinations in category panels with short link rows and publisher labels. Preserve exact community names in their links.
  Panels group real destinations; individual links are not nested cards. Keep the porcelain/cobalt visual identity.
- Show all five topics and direct tool entries in the directory. Category links jump to panels; tool entries open one selected tool in place.
  Use a viewport-bounded dialog with a visible close control, Escape support, focus containment and return focus.
  Keep money values, checklist progress and matching-search counts; omit decorative counters.
  Search may filter directory entries; choosing a section clears that filter so its destination is available.
  Share tool implementations with their guide pages. Static content, section links and cancellation records work without JavaScript.
  Explain that matching periods matter and that a difference does not establish the reason for a charge.
- Give each tool a useful response: an amount still to explain, a record to check next, or a copyable draft.
  The cost-over-time worksheet opens from its directory row in a native expandable workspace: a monthly USD amount, a 1–12 month
  slider, twelve visual month tiles and the calculated total. Start empty; its example is opt-in and labeled.
  Treat this as constant-charge arithmetic, with fees, rate changes and interest excluded. Keep it local and clearable.
  Examples are opt-in and explicitly labeled. A full checklist never claims that a company canceled or refunded anything.
  Keep notes in the open page; no storage, network request, background scheduling or automatic submission.
- Use category-colored icons and thin rules with restrained borders to distinguish groups. Keep cobalt for the brand and general controls.
  Do not add the reference site's branding, trivia ticker, ads or fake activity.
- Put a phone-icon disclosure near the homepage top, closed on first load. Open it for the California
  phone chart, a Leaflet city map, typed city search, native city selector and optional service filter
  and city download action. Keep numbers visible without opening a detail panel. Distinguish crisis, referral,
  non-emergency and utility contacts; keep 911 outside the chart. City listing does not imply local-agency coverage.
  Use a local vector map and approximate city points, with visible attribution and no repeating motion.
  Keep the native selector as an alternative; maps load on demand and work in the offline file.
  A single offline template carries the same shared city/contact dataset, map, tools and guides. A city download
  carries only the selected location and all its saved contacts; never carry private tool notes or the service filter.
  Preserve jurisdiction/provider limits and visible coverage gaps. Use explicit choice, with no inferred location.
- The five-topic directory pairs familiar labels with the exact community names and a concise full-scope description.
- Guide pages show actions and tools first. Longer explanations and sources use native expandable details.
- Use sentence case. Skip decorative eyebrows, meaningless serial numbers and arrows appended to every action.
- State exactly what buttons do. Keep calculator wording and behavior consistent across pages.
- Use the original inline SVG set in `scripts/icons.py` for category, tool and action cues.
- External destination rows use the actual site's locally saved favicon, with a visible publisher label.
  Keep original category/tool/action SVGs. Preserve favicon colors and proportions, empty alt text and
  download provenance, including cached-source/currentness limits. Do not fetch third-party icons at page load.
  Keep the 24-unit drawing grid and rounded 1.9-unit strokes. Homepage service tiles place a larger line icon
  above a short label, with a flat category wash behind the icon. Destination and tool icons sit beside their labels.
  Use simple geometric corners, flat fills and clear chevrons; omit illustrated mascots, gradients, glows and decorative shadows.
  Outbound links use the external marker; same-page tools use an expand cue. Labels carry the accessible names;
  SVGs are hidden from assistive technology and cannot receive focus. The search magnifier focuses its field.
  Copy changes to a checkmark only after successful copying and resets when a draft changes or clears.
  Do not add an icon font, fetched favicons, tracking or third-party logo requests.
- Original static field sketches in `scripts/graphics.py` pair with the category summaries.
  Keep them small, with sparse linework and a faint wash; no numeric data, new controls or continuous motion.
  Labels carry the meaning, so these redundant drawings are hidden from assistive technology.
- No gradients, stock feature icons, nested cards, promotional closing blocks or scroll reveal animations.
- Keep visible keyboard focus, native mobile navigation and reduced-motion support. Core reading works without JavaScript.
- Primary directory links and section controls have at least 44px-high hit areas. Wrap phone shortcuts instead of hiding them in a sideways strip.
  Use 15px destination text and clearer publisher labels. Keep focus outlines distinct from color cues.

## Verification

Review actual desktop and phone screenshots after layout changes, including narrow 320px screens.
Check links, focus, forms, empty search, copy behavior, no-JavaScript reading, source dates and metadata.
Check the demo, negative changes, credits, decimal arithmetic, invalid amounts, native section-link focus,
all cancellation routes, progress, safe text rendering, copying and clearing notes on the homepage and guide pages.
Shopify remains disabled, absent from the interface and unrequested during page use.
Check rendered text/icon contrast, primary target sizes, increased text spacing and forced-colors rendering.
These checks do not establish full WCAG conformance or replace assistive-technology and user testing.
Do not treat a design audit, screenshots or passing code checks as audience approval, demand or a public release.

## References and boundaries

- User-supplied process reference: [Professor Glitch's guide](https://www.askglitch.com/guides/how-to-make-ai-websites-not-look-ai), read November 2, 2026.
- Linked [Anthropic frontend-design guidance](https://github.com/anthropics/skills/tree/main/skills/frontend-design), read the same day.
- User-supplied icon-grid reference: [MyBikeDavis](https://mybikedavis.com/), desktop and phone visually inspected November 2, 2026. Its image-led cards inform structure; Ferdant uses its own flat line icons and text.
- User-supplied structure reference: [Bored.com](https://www.bored.com/), desktop and phone inspected November 2, 2026.
- Existing project direction: Nicholas/matcha_plug's clean, refined porcelain preference, already recorded in T36.

These informed the choices above. Their copy, brand and page layout are not reproduced.
No third-party skill installer, hook or scanner is required by this project.

## Color evidence for the service buttons — November 2, 2026

Use light category washes, dark text and the existing stronger icon/edge colors. Blue, rust, teal,
purple and green keep the branches distinct while the porcelain page stays quiet. These are design choices,
not a scientifically established ranking of button attractiveness. Repeated labels, icons and chevrons carry
meaning even when hues are indistinguishable. Do not promise conversion, emotion or demand from color alone.

- [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) supports
  normal-text contrast of at least 4.5:1. Focused rendered checks measured a minimum of 5.86:1 for sampled
  directory text and 5.36:1 for sampled icons at four widths. This is not a full accessibility certification.
- [W3C use-of-color guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) supports
  visible text/shape alternatives to category colors. Native disclosure state and focus outlines remain visible.
- [Jonauskaite et al., 2016](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0152194)
  studied 88 participants choosing colors in general, wall and T-shirt contexts. Individual and context variation
  limits transferring general favorites to this website. It did not test these buttons, visitors or task outcomes.

Attractiveness and ease of locating services still need feedback from the intended audience. The palette
is informed by readability standards and context-sensitive research, not a universal color formula.

The service-list edition immediately before the icon grid is preserved at tag
`preview-before-icon-tiles-20261102` (`20096f939af6f17a99f7e295739f6680d0d61883`). The earlier
`preview-before-service-buttons-20261102` tag and local ZIP remain preserved as well.

The icon-grid edition immediately before the location-first flow is preserved at tag
`preview-before-location-flow-20261102` (`01b0d9a7b3e07bd307b3a22c7d657f6ca3e643ab`).
