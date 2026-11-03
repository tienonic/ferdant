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
The current version follows the user's Bored.com structure reference: a compact, browse-first category portal.
Five topic panels and a tool panel expose short destination lists in a three-column grid, two on tablets and one on phones.
Search filters the directory in the browser. Omit corner count badges; numbers need a direct task meaning, such as a bill amount, checked record or active search result.
Category links use native anchors. Tool entries open the chosen tool in an on-page dialog, with source/scope notes inside it.
Do not append all tool forms below the directory. Closing returns focus and preserves the directory position. Without scripts, tool links lead to the existing guide.
Full guide URLs remain optional detailed reading. Primary use must not require a hub page, library visit or hidden panel.

## Tokens

| Role | Value |
| --- | --- |
| Porcelain surface | `#FBFCFA` |
| Main text | `#1D2D3E` |
| Cobalt controls and wordmark | `#244B84` |
| Secondary text | `#526170` |
| Dividers | `#CCD5DC` |
| Worksheet surface | `#EEF2F5` |

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
  Examples are opt-in and explicitly labeled. A full checklist never claims that a company canceled or refunded anything.
  Keep notes in the open page; no storage, network request, background scheduling or automatic submission.
- Use cobalt panel headers and restrained borders to distinguish groups. Do not add the reference site's branding, trivia ticker, ads or fake activity.
- The five-topic directory pairs familiar labels with the exact community names and a concise full-scope description.
- Guide pages show actions and tools first. Longer explanations and sources use native expandable details.
- Use sentence case. Skip decorative eyebrows, meaningless serial numbers and arrows appended to every action.
- State exactly what buttons do. Keep calculator wording and behavior consistent across pages.
- Use the original inline SVG set in `scripts/icons.py` for category, destination and action cues.
  Keep the 24-unit grid and rounded 1.7-unit strokes. Icons sit beside labels rather than in decorative tiles.
  Outbound links use the external marker; same-page tools use an expand cue. Labels carry the accessible names;
  SVGs are hidden from assistive technology and cannot receive focus. The search magnifier focuses its field.
  Copy changes to a checkmark only after successful copying and resets when a draft changes or clears.
  Do not add an icon font, fetched favicons, tracking or third-party logo requests.
- No gradients, stock feature icons, nested cards, promotional closing blocks or scroll reveal animations.
- Keep visible keyboard focus, native mobile navigation and reduced-motion support. Core reading works without JavaScript.

## Verification

Review actual desktop and phone screenshots after layout changes, including narrow 320px screens.
Check links, focus, forms, empty search, copy behavior, no-JavaScript reading, source dates and metadata.
Check the demo, negative changes, credits, decimal arithmetic, invalid amounts, native section-link focus,
all cancellation routes, progress, safe text rendering, copying and clearing notes on the homepage and guide pages.
Shopify remains disabled, absent from the interface and unrequested during page use.
Do not treat a design audit, screenshots or passing code checks as audience approval, demand or a public release.

## References and boundaries

- User-supplied process reference: [Professor Glitch's guide](https://www.askglitch.com/guides/how-to-make-ai-websites-not-look-ai), read November 2, 2026.
- Linked [Anthropic frontend-design guidance](https://github.com/anthropics/skills/tree/main/skills/frontend-design), read the same day.
- User-supplied structure reference: [Bored.com](https://www.bored.com/), desktop and phone inspected November 2, 2026.
- Existing project direction: Nicholas/matcha_plug's clean, refined porcelain preference, already recorded in T36.

These informed the choices above. Their copy, brand and page layout are not reproduced.
No third-party skill installer, hook or scanner is required by this project.
