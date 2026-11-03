# Long-term hazard risk ordering

All 483 city choices and 58 county choices have a deterministic risk grouping for
each of the site's 15 disaster plans. This implements the selected **Low /
Moderate / High risk** framing, rather than unsupported event-likelihood labels.
Gray **Not assessed** is separate from Low.

The resource-book cover, preview, PDF chapter order and PNG summary all use one
shared reader (`hazard-risk.js`). Page 2 remains the evacuation planning map;
page 3 explains risk groups and geographic scope. Sources (TXT) preserves the
original highest FEMA rating, rated-component counts, city tract IDs, edition,
method and source references. The saved website reproduces the same rankings
without network access. City changes use the selected city's record, not a
county rating relabeled as a city assessment.

## Data and meaning

Source: FEMA National Risk Index **December 2025, v1.20**:

- [FEMA county dataset](https://www.arcgis.com/home/item.html?id=39485e8035d446a5bff03259508ae355)
  and its [query service](https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0).
- [FEMA census-tract dataset](https://www.arcgis.com/home/item.html?id=9da4eeb936544335a6db0cd7a8448a51)
  and its [query service](https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Census_Tracts/FeatureServer/0).

The public items are owned by `FEMA_NationalRiskIndex`. The import checked the
release field, all 58 California counties, and all 9,106 California tract IDs.
The published hazard-specific `*_RISKR` ratings incorporate expected losses,
social vulnerability and resilience. They are relative national risk ratings for
each hazard, not event probabilities, forecasts, address-level safety, or directly
comparable absolute loss amounts between hazards. Annualized frequency was not
used to manufacture a probability or translate risk into likelihood.

| Display band | FEMA source ratings | Text / background |
| --- | --- | --- |
| High risk | Relatively High, Very High | `#a63136` / `#fbecee` |
| Moderate risk | Relatively Moderate | `#855b0c` / `#fff3d6` |
| Low risk | Relatively Low, Very Low | `#285e85` / `#eaf3fa` |
| Not assessed | Missing, insufficient, No Rating, Not Applicable, unsupported hazard | `#526170` / `#eef1f4` |

Red emphasizes higher planning concern; amber marks the middle band; blue is a
calmer lower-risk cue without a green safety signal. Neutral gray denotes an
information gap. Text labels accompany every color; the glyph still identifies
the hazard. All four label/background pairs pass a 4.5:1 contrast calculation.
This follows W3C guidance on [not relying on color alone](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
and [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
This is not a claim of a complete accessibility audit.

## City screening and uncertainty

FEMA does not publish municipal ratings in this dataset. County views use its
county records directly. City views use the **highest available rating among
meaningfully overlapping census tracts**, with these rules:

1. Use the existing generalized city boundaries and the FEMA tract polygons in
   that city's actual county. Match county names to the published state/county
   FIPS; the site's county IDs are not FIPS codes.
2. The source query generalizes tract geometry to 0.0001 degrees. Remove collapsed
   zero-area rings and repair invalid polygon topology before intersection.
3. Include an overlap covering at least 1% of either the city's area or the
   tract's area. This reduces tiny boundary-sliver matches while retaining small
   cities in large tracts and small urban tracts in large cities.
4. Keep the selected tract IDs and compute their combined intersection as a
   percentage of the mapped municipal area. This denominator includes water
   where the city's boundary includes it; it is not population coverage.
5. Select the highest original FEMA category per plan, then combine it into the
   three display bands. Within a band, retain the original disaster sequence;
   do not imply a probability ranking or finer statistical precision.

Every city matches at least one tract. Forty-six cities have less than 95% mapped
area coverage and show a partial-coverage notice. Coverage can be low for coastal
municipalities with large water areas. A tract can extend outside city limits;
the screening can therefore reflect risk outside the city. The highest tract
does not describe every neighborhood. It is a conservative prioritization aid,
not an official FEMA city rating. The 1% overlap rule is a documented site choice,
not a FEMA methodology or a validated municipal risk model.

## Hazard mapping

Earthquake, tsunami, inland flood, wildfire, heat wave, landslide, drought,
avalanche and volcanic activity use their matching FEMA fields. Cold/freeze uses
the highest available cold-wave, ice-storm or winter-weather rating. Wind/severe
weather uses the highest available strong-wind, hail, lightning, tornado or
hurricane rating. These combined plans retain rated/total component counts; a
missing component is not assumed low.

The coastal plan uses **coastal flooding only**; it does not rate future sea-level
rise. **Dam failure, levee failure and subsidence are not included in FEMA NRI**
and remain unassessed everywhere. A source Not Applicable or No Rating is also
unassessed, not a conclusion of safety. All 15 plans remain available regardless
of rank. Local warnings and evacuation instructions take precedence.

## Reproduction and verification

`scripts/project-hazard-risk.py --input-dir <local raw receipts>` produces
`content/hazard-risk.json` and `content/hazard-risk-manifest.json`. The manifest
preserves input hashes, query parameters, release, boundary hashes and output
hash. It requires Shapely for this manual projection; builds do not collect data
or require Shapely. Raw downloads remain outside the repository.

Checks cover all 541 location records, all 15 plans, county/city separation,
unassessed hazards, stable ordering, color contrast, PDF pages and links, PNG
contents, and offline parity. Rendering checks inspect the cover and risk page.
They verify the implementation and provenance, not the predictive validity of
the underlying hazard models.
