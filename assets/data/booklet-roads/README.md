# Booklet street maps

Page 2 of each city, county and statewide resource book uses these vector roads,
independently of evacuation-plan coverage. The web map continues to use its existing
street tiles; these files are a separate printable, offline orientation layer.

Source: [U.S. Census Bureau TIGERweb Transportation](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer).
The Primary Roads (2), Secondary Roads (6) and Local Roads (8) layer descriptions
identify geography as January 1, 2026. Manual capture: November 3, 2026. These dates
are separate; no road-opening or incident status is supplied.

`content/booklet-road-manifest.json` records the edition, source, query fingerprints,
counts, file sizes and SHA-256 hashes. County shards cover all 483 indexed cities and
58 counties. California has a separate highway overview. Runtime requests only the
chosen county; saved HTML embeds that county and the statewide fallback.

City frames use the existing approximate boundaries, with the inhabited/main component
and the existing San Francisco view override. They contain primary/secondary roads
and up to 30 longest clipped named local street groups. County frames contain primary
and secondary roads; the state overview contains primary roads clipped to the existing California boundary. Adjacent areas may
appear as orientation context. This is a sparse selection, not a complete street atlas.
Names and disconnected source segments are retained, without invented connecting lines.
Coordinates are simplified and rounded. Dashed gray outlines are approximate geography;
purple dashed Yolo planning roads are an independent, optional evacuation overlay.
Neither layer provides directions, safe destinations, passability or current instructions.

The page uses a north-up Mercator projection with a north needle and a scale calculated
at map center (kilometers/meters and miles). Distortion increases away from the center,
especially in the statewide overview. Street labels are selected to avoid collisions.

Only the public projection `[name, kind, paths]`, bounding frames and edition identifiers
are stored here. Raw query responses are kept outside the repository under the operator's
local application-data directory. No personal, account, participant or private input is
included. These files do not contain tiles, live shelter status or private notes.

Manual regeneration requires Python with Shapely 2 and the existing city-map shards:

```powershell
python scripts/project-booklet-roads.py
# Explicitly collect missing public source inputs only when authorized:
python scripts/project-booklet-roads.py --fetch
```

This is a manual script, never a build hook or schedule. The normal build only reads
these saved files. New captures need a new edition and dates; do not silently refresh
the current edition. Verify with `npm run verify:booklet` and `node tests/evacuation-map.cjs`.
