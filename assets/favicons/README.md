# Destination favicons

Small, unmodified favicon files identify external destinations in the directory. They are served locally;
the browser does not contact a favicon service or destination website to render them.
Visible resource and publisher labels carry the meaning; these redundant images have empty alt text.
Category and tool/action graphics remain original inline SVGs.

`sources.json` records each domain, download URL, date, file hash and verification limit.
Five destination icons came directly from their sites or linked asset CDN. The two FCC subdomains,
FTC Consumer Advice and Ready.gov blocked or failed direct retrieval from this client; those four
use DuckDuckGo's domain favicon cache. The two FCC files are identical. Cached copies can lag a site's
current favicon and have not been verified against the live blocked page. No generic cache placeholder
is knowingly used. Future replacements should be reviewed locally, not fetched at runtime.

These are the destinations' existing marks, used beside links for identification. Their presence does
not imply affiliation or endorsement. Do not recolor, redraw or describe them as original Ferdant artwork.
