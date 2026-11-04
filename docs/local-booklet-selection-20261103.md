# Local emergency booklet selection — November 3, 2026

Drought is removed from the active disaster choices, resource policies, infographic cover and booklet sections at the user's request. The 14 remaining interactive disaster choices remain available. Existing FEMA risk data and dated source-audit receipts are preserved as source history; removing a choice does not rewrite a source rating.

Local booklets now omit sections explicitly marked **Not Applicable** in the saved FEMA county or overlapping-tract screening. They keep low-risk, unrated, insufficient-data and unsupported hazards. The same selection drives the infographic cover, PDF risk summary, event sections, related phone charts and offline regeneration. California's statewide edition keeps all 14 selected plans.

Los Angeles city (`19050`) additionally omits snow avalanche as the user's requested household-booklet scope. This is an editorial omission, not a claim that its source rating is zero: the saved overlapping-tract rating is Moderate. Los Angeles County, South Lake Tahoe and Mammoth Lakes retain avalanche guidance. The companion source file records each omitted section and the reason.

Examples after removal: Los Angeles city has 12 sections (avalanche and source-Not-Applicable volcano omitted); Davis has 11 (source-Not-Applicable tsunami, coastal flooding and avalanche omitted). Ordinary cold-weather guidance remains in LA. A city booklet does not replace travel-specific or current local guidance.

Inputs: preview `411ec4b`, existing `content/hazard-risk.json` with its checked hash manifest, `content/disasters.py`, `content/resource_plans.py`, and the user's two instructions. FEMA distinguishes Not Applicable from missing data and nonzero ratings in its [December 2025 technical documentation](https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf), page 24. No new hazard feed, collection process or risk projection was introduced.

Verification: all 542 city/county/state models, ten representative PDF editions, retained mountain-area avalanche sections, omitted LA sections, no drought choice, risk-source hashes, generated source catalog, disaster navigation and saved offline PDF equality. Los Angeles and Davis offline editions are tested with zero HTTP requests. PDF page 2 retains the street map, north needle and scale. Historical test reports retain their original 15-plan counts; current assertions use 14 selectable plans and variable local-booklet counts.

Owned scope is active disaster content, booklet selection, related test expectations and generated outputs. Print layout and web resource-detail changes have separate owners. Stop after preview-branch delivery; main publication remains separate.
