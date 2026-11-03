# Leaflet 1.9.4

Release files from the distribution linked by the official Leaflet quick-start guide.
`provenance.json` records download URLs, original-download and vendored byte hashes, and retrieval date. Text release files are normalized to LF
line endings, with no algorithm changes, so vendored hashes are stable across platforms. Preserve `LICENSE` (BSD-2-Clause).

The online phone disclosure loads the local script and stylesheet when first opened. Offline editions embed
both, required image assets and the license. No runtime CDN, API key, geocoder or map tile service is used.
The local vector data comes from CDTFA city centroids and generalized Census county geometry; its separate
provenance is in `content/california-cities.json`. This map is an approximate selection aid, not a route map.
