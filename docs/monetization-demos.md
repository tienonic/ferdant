# Monetization layout experiment

The exact clean site before this experiment is saved as the annotated Git tag
**before-monetization**, at commit `5ace99717fe9912665c410aae2cab58a322adc71`.
The tag was pushed before any demo edits. Browse the
[saved site source](https://github.com/tienonic/ferdant/tree/before-monetization)
or [download that version](https://github.com/tienonic/ferdant/archive/refs/tags/before-monetization.zip).
This snapshot includes the local FEMA risk ranking, the latest landing copy,
all mapped Everyday resources and the existing photos/data/assets.

To inspect it separately without changing ongoing work:

```powershell
git worktree add ..\ferdant-before-monetization before-monetization
```

The preview experiment adds three shared placements to every website page,
including branch hubs, guides, sources, privacy, offline-download page and 404:

- An advertisement box between the navigation and the main content.
- An affiliate product card after the page content, with a `sponsored nofollow` link.
- A distinct community sponsor card beside the affiliate card.

All placements say Demo. Each link opens a keyboard-accessible explanation;
without JavaScript it leads to the visible demo disclosure. The finished creative
uses a fictional Alder Supply document-pouch campaign, a $24 illustrative price,
generated product photography and a fictional Morrow Hardware sponsorship.
Brand typography and storefront artwork are local HTML/SVG. The photograph's
origin and checksum are in `assets/ads/provenance.json`. The demo links open
sample product or shop details, with no purchase flow. They represent no real seller,
advertiser, sponsor, paid agreement or commission. There is no checkout, network
ad request, tracking, cookie, analytics or stored visitor input in this feature.
The existing dormant Shopify integration stays dormant.

The placements use their own styles, never enter resource results or rankings,
and are hidden when printing. The complete offline HTML and city PDF/TXT/PNG
exports contain no commercial placements. Resources remain available without
following a demo link. Family photos and existing map/contact tools are retained.

`config/monetization.json` controls visibility: set `enabled` to `false` and
rebuild to remove every placement and its asset references. Only `mode: demo`
is implemented; another mode fails rather than enabling live monetization.
Rendering is in `scripts/monetization.py`, with `monetization.css` and
`monetization.js`. Shared placement blocks have explicit boundaries so the
offline builder removes their markup and assets before creating downloads.

Run `npm.cmd run verify:monetization` for all-page, four-width demo interaction,
focus, disclosure, no-network/no-storage, print and no-script checks. Run the
existing responsive suite for resource, location, contact and offline behavior.
This is a preview-branch experiment. It does not publish the full site to main,
establish a paid relationship or demonstrate that a placement earns revenue.

Verified November 3, 2026: all 16 pages at 320, 390, 768 and 1440 pixels;
keyboard opening, Escape/close and focus return; clear demo disclosures;
zero click requests, cookies or local/session storage; no-script disclosure
fallback; print hiding; unchanged offline resource contents; preview and
production builds; content checks; all 11 dormant Shopify tests; and the full
existing responsive/navigation/tool/no-script/privacy/offline/PNG suite.
Map services were stubbed in repeatable UI checks; this work makes no new
live provider, location coverage or revenue claim.

The later November 3 creative revision replaces all placeholder headlines and
icons with finished ad/affiliate/sponsor designs. All-page four-width checks now
also verify loaded product photos and sample offer details. Original family
photos and the before-monetization tag remain unchanged.
