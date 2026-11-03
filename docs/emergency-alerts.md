# Location-based emergency alert signup

T36 bounded task, November 3, 2026. Input: Ferdant preview `b4cb7abe1b2afbc98c821ec7163b83f15a75a033`, its current local edits, the existing city/county index, 211 California's county alert links and Cal OES's official signup directory. Ronnie retains website ownership; RM-Q18 retains public release review.

The audience is California residents looking for a quick next step on a phone, with neighbors and local resource maintainers sharing the page or saved copy. Existing Ferdant wording and the user's 211 example guide this small interaction. No new audience-response experiment or effectiveness claim is made.

Scope: a dated county alert-link registry, automatic selection using the existing city/county mapping, a short signup card, saved HTML support and focused verification. Existing source dates and human edits stay intact. Stop after all indexed cities/counties resolve to the correct county entry and desktop, phone, invalid-location and offline checks pass. This automates link selection, not enrollment. No personal information, account creation, form submission, scheduler or public deployment is involved.

The state directory supplies county destinations. A city selection shows its county's listed system; it does not assert that every city participates or that every alert applies to that address. Readers enter their address and choose notification methods on the provider's site. Existing separately sourced city instructions remain supplementary.

Run `python scripts/import-alert-links.py` only for an intentional source refresh. Review its diff before accepting it. Ordinary builds use the saved registry without fetching sources or advancing review dates. Directory-link verification and target HTTP accessibility are separate from a completed registration or delivery test.

`content/emergency-alert-overrides.json` preserves reviewed local corrections and city-specific routes across imports. Los Angeles and Long Beach use their separately listed city systems, with LA County available under the expanded details. Other cities use their county's destination; the card labels that county scope. Existing Davis and San Francisco instructions remain in the details. Provider fields and enrollment steps differ; Ferdant never guesses a shared form or SMS keyword.

The Cal OES Yuba entry contained a generated authentication URL. The import omits it and all authentication parameters, uses a checked county page instead, and retains only the source-page hash and reason for replacement. Link-check responses are not saved as raw pages; only status, safe destination and page title are recorded. The 211 link remains dated provenance even when its older domain no longer resolves correctly.

Run `node tests/emergency-alerts.cjs` with the existing local preview server for the focused UI and offline checks. County registry coverage is 58/58; the place index has 483 city choices and 58 county choices. These are routing counts, not counts of verified registrations or city participation.

Verification November 3: all 541 selections, city/county distinction, four screen widths, keyboard details, invalid-location fallback, actual personalized download, zero-request offline reading and no-script saved links passed. The phone card was visually inspected. `npm run verify:responsive` passed all 16 pages at four widths plus navigation, tools, downloads, no-JavaScript reading, source access and form privacy. Five source-catalog tests and content checks passed. Receipts and images are in the ignored `screenshots/alerts/` folder.

The final basic target check received 54 successful HTTP responses. Butte, Glenn and Marin blocked it; Los Angeles failed the fetch. Official provider content or indexed excerpts were separately inspected, with limits retained in the registry. No registration or notification delivery was tested. Changes remain in the local preview alongside other ongoing work; no public release or mixed commit was made.
