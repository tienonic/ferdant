# Recommendation drafts

The persistent header entry opens Make a recommendation on the home/city page.
It stays visible outside the mobile menu. Other guide/info pages route to the
same home-page section. The section remains closed until opened; city context
is prefilled from the existing public location selection.

People can draft a resource, listing correction or website idea, with a title,
optional public URL, city/area and explanation. Required fields and URL syntax
are checked locally; resource truth, eligibility and publication are not verified.
The form states that recommendations are not being collected yet. Its actions
are Download draft (TXT), Copy draft and Clear. No submit/received/success receipt
is fabricated. Every exported draft says NOT SUBMITTED.

`recommendations.js` uses no endpoint, storage, account, automatic send or update.
Only an explicit copy/download action exports the entered text. Clipboard failure
retains the TXT option. Location context uses the site's canonical public page
and selected city, never private query parameters or a file-system path. Editing
the area preserves the visitor's choice when the map city changes. Reset restores
the current city. There are no personal-contact fields or attachments.

Recommendation fields are unnamed and disabled until the event handlers load,
so the form cannot leak text through a native GET. Without scripts, the entry,
explanation and disabled form remain readable. The complete offline HTML embeds
the recommendation code and a blank form; it can prepare new drafts without HTTP.
Existing offline HTML, resource PDFs and source TXT exports exclude form notes.
The site keeps no saved copy of the recommendation.

Future intake, moderation/source verification and website updates are deferred.
This UI does not authorize a new form service, collection database, maintainer
inbox, account, public posting or automatic publication. The current preview and
release/owner boundaries remain.

Run `npm run verify:recommendations`: four widths, visible/keyboard entry, native
field checks, copy/TXT content, chosen-city context, no requests/storage, no-script
state and actual offline drafts. Private notes must leave PDF hashes/source TXT
unchanged and never enter downloaded HTML. The normal site suite covers all 16
existing pages, text spacing, keyboard/tools, PNG exports and privacy.
