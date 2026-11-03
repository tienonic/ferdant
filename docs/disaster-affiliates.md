# Disaster-specific affiliate examples

Every one of the 15 disaster plans has a distinct fictional sample offer. The single affiliate card moves below the city map and follows the selected disaster. Everyday restores the generic document pouch. The card is kept in the footer when no valid city is selected or JavaScript is unavailable. It never enters a map resource list or changes resource order.

| Disaster | Example product | Sample price |
| --- | --- | --- |
| Earthquake | Earthquake Go Bag | $68.00 |
| Tsunami | Coastal Evacuation Pack | $58.00 |
| Flood | Household Document Pouch | $24.00 |
| Wildfire | Portable Weather Radio | $39.00 |
| Extreme heat | Everyday Water Bottle | $26.00 |
| Extreme cold / freeze | Warm Fleece Blanket | $28.00 |
| Wind / severe weather | Outage Weather Radio | $42.00 |
| Coastal flooding | Coastal Paperwork Pouch | $24.00 |
| Landslide / debris flow | Ready-to-Carry Daypack | $62.00 |
| Drought | Home Water Storage Container | $32.00 |
| Dam failure | Grab-and-Go Radio | $39.00 |
| Levee failure | Evacuation Papers Organizer | $24.00 |
| Snow avalanche | Winter Travel Blanket | $34.00 |
| Land subsidence | Home Records Pouch | $24.00 |
| Volcano | Compact LED Flashlight | $19.00 |

The catalogue is `content/disaster-affiliates.json`. It is embedded only in the city page, with six new generated product images plus the existing pouch photo. Assets are shared across relevant concepts, and the browser loads the selected card image rather than preloading every product. Original PNGs and source hashes are retained in `assets/ads/provenance.json`. Prices, product variants and brands are illustrative. No purchase, affiliate account, commission or safety certification is represented. The winter blanket is explicitly not avalanche rescue equipment.

Each sample link includes a distinct `demo-product` identifier plus the current city and hazard. An ordinary click opens that offer's local detail dialog; opening its URL separately retains the corresponding city/plan. Selection is observed from the existing map state without changing the map reader, hazard feeds or contact selection code. City changes, direct hazard links and returning to Everyday update the card. Disclosures and a free public go-bag checklist remain visible beside the offer.

General kit types were informed by [FEMA's kit checklist](https://www.fema.gov/sites/default/files/documents/fema_hm-emergency-supply-kit-checklist_english.pdf) and [Philadelphia emergency management's go-bag list](https://www.phila.gov/departments/oem/ready-or-not/how-to-get-ready/prepare-for-an-emergency/make-a-go-bag/), checked November 3, 2026. FEMA/Ready.gov direct pages returned 403; FEMA's public search-index excerpt supplied the basic kit types, while the municipal page was directly read. Publication dates are not inferred. Disaster-to-product matches are editorial demo choices, not FEMA/municipal product endorsements or complete preparedness instructions.

The complete offline HTML strips the entire catalog/placement/script, and print hides the moved card. PDF, TXT and PNG resource exports receive no commercial data. The before-monetization tag and original family photos are unchanged. Existing `config/monetization.json` still turns the entire experiment off.

`npm.cmd run verify:monetization` runs both the shared all-page placement checks and `tests/disaster-affiliates.cjs`. The latter checks all 15 selections at four widths, loaded images, unique links, matching offer details, city changes, all 15 direct hazard links, Everyday reset, single-card placement, unchanged resource steps, print hiding and ad-free offline content. Public map responses are fixtures for repeatable UI checks; this is not a new live source audit.

Verified November 3: an actual Davis earthquake HTML download also excludes the
affiliate catalog, commercial markup and all ad image references while retaining
the selected resource plan. Existing offline contents and the family-photo hero
match the before-monetization baseline after Git line-ending normalization.
