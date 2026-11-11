"""The single city-result map and its public, dated facility projection."""
import json
import html
import base64
import hashlib
import importlib.util
from pathlib import Path
from icons import icon
from physical_services import add_physical_services
from resource_search import resource_search

ROOT = Path(__file__).resolve().parents[1]


def resource_map():
    data = add_physical_services(json.loads((ROOT / 'content/resource-map.json').read_text(encoding='utf-8')))
    spec = importlib.util.spec_from_file_location('disaster_content', ROOT / 'content/disasters.py')
    disasters = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(disasters)
    data['disasters'] = disasters.DATA
    data['evacuation'] = json.loads((ROOT / 'content/evacuation.json').read_text(encoding='utf-8'))
    data['resourceSearch'] = json.loads((ROOT / 'content/resource-search.json').read_text(encoding='utf-8'))
    data['visitFacts'] = json.loads((ROOT / 'content/visit-fact-manifest.json').read_text(encoding='utf-8'))
    data['providerVisitDetails'] = json.loads((ROOT / 'content/provider-visit-details.json').read_text(encoding='utf-8'))
    data['sources']['osm-visit-facts'] = data['visitFacts']['source']
    cover = next(photo for photo in json.loads((ROOT / 'assets/photos/provenance.json').read_text(encoding='utf-8'))['photos']
                 if photo['file'] == 'assets/photos/family-picnic.webp')
    cover_bytes = (ROOT / cover['file']).read_bytes()
    if hashlib.sha256(cover_bytes).hexdigest() != cover['sha256']:
        raise ValueError('Booklet cover photo differs from its recorded source')
    data['bookletCover'] = {**cover, 'dataURL': 'data:image/webp;base64,' + base64.b64encode(cover_bytes).decode('ascii')}
    data['bookletRoads'] = json.loads((ROOT / 'content/booklet-road-manifest.json').read_text(encoding='utf-8'))
    road_state = json.loads((ROOT / data['bookletRoads']['state']['path'].lstrip('/')).read_text(encoding='utf-8'))
    road_snapshot = json.dumps({'schema': 1, 'edition': data['bookletRoads']['edition'], 'state': road_state, 'counties': {}}, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    data['hazardRisk'] = json.loads((ROOT / 'content/hazard-risk.json').read_text(encoding='utf-8'))
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    short_labels = {'heat':'Heat', 'cold':'Cold / freeze', 'storms':'Wind / storms',
                    'coastal':'Coastal flooding', 'landslide':'Landslide',
                    'avalanche':'Avalanche', 'subsidence':'Subsidence'}
    # Symbols supplement text; they are not warning signs or standalone labels.
    accents = {'earthquake':'#735597', 'tsunami':'#28697e', 'flood':'#286690',
               'wildfire':'#a34832', 'heat':'#9b5128', 'cold':'#346e89',
               'storms':'#59628c', 'coastal':'#286e76', 'landslide':'#88633c',
               'drought':'#896632', 'dam':'#3b638a', 'levee':'#3f7167',
               'avalanche':'#486d8b', 'subsidence':'#805a70', 'volcano':'#965348'}
    choices = ''.join('<button type="button" class="atlas-choice" data-disaster="'+p['id']+'" aria-pressed="false" aria-controls="resource-map-panel" aria-label="'+html.escape('Wind / storms: severe weather' if p['id']=='storms' else p['label'])+'" style="--hazard-accent:'+accents[p['id']]+'"><span class="atlas-choice-symbol">'+icon(p['id'])+'</span><span class="atlas-choice-label">'+html.escape(short_labels.get(p['id'],p['label']))+'</span><span class="atlas-choice-check" aria-hidden="true">'+icon('check')+'</span></button>' for p in disasters.PLANS)
    faults = disasters.LAYERS['faults']
    fault_help = '''<details class="atlas-sources" id="atlas-fault-help" hidden><summary>What fault colors mean for your home</summary>
<p>Earthquake shaking can knock over furniture and damage buildings, roads and utility lines, even away from a mapped fault. Ground can also break along a fault. These lines cannot tell you whether an individual building is safe.</p>
<p><strong>What you can do:</strong> secure heavy furniture, keep heavy items on low shelves and practice Drop, Cover and Hold On. Prepare even if your home is outside the colored lines.</p>
<details><summary>Color meanings &amp; original map terms</summary><ul>
<li><strong>Red — movement recorded in recent history:</strong> the source calls this Historic, roughly the 200 years covered by its historical category. The map edition is 2010, not a live record.</li>
<li><strong>Orange — moved within about 12,000 years:</strong> the source calls this Holocene (about 11,700 years). Evidence of past movement matters even without a written earthquake record.</li>
<li><strong>Green — moved within about 700,000 years:</strong> the source calls this Late Quaternary. Green does not mean safe.</li>
<li><strong>Purple — past movement; timing less certain:</strong> the source calls this undivided Quaternary, a broad age category. It does not establish that a fault is inactive.</li>
</ul><p>The age ranges describe evidence of past movement, not how often earthquakes repeat or when the next one will happen. Colored bands are not damage-zone boundaries.</p></details>
<p>Sources: <a href="''' + html.escape(faults['ageExplanationSource']) + '''">CGS color key</a> · <a href="''' + html.escape(faults['classificationSource']) + '''">2010 map explanation</a> · <a href="''' + html.escape(faults['impactSource']) + '''">USGS earthquake effects</a> · <a href="''' + html.escape(faults['preparednessSource']) + '''">CDC household safety</a>.</p></details>'''
    return '''<section class="resource-atlas" id="resource-atlas" aria-labelledby="resource-map-title" hidden>
 <header class="atlas-heading"><div><p class="atlas-eyebrow">Explore your area</p><h2 id="resource-map-title">Your city, at a glance</h2></div><a class="atlas-offline-link" href="#offline-download">''' + icon('download') + '''<span>Download offline</span></a></header>
 <div class="atlas-controls" role="group" aria-label="Resources and disaster plans"><button type="button" id="atlas-everyday" class="atlas-choice" aria-pressed="true" aria-controls="resource-map-panel" aria-label="Everyday resources" style="--hazard-accent:#365d7a"><span class="atlas-choice-symbol">''' + icon('map') + '''</span><span class="atlas-choice-label">Everyday</span><span class="atlas-choice-check" aria-hidden="true">''' + icon('check') + '''</span></button>''' + choices + '''</div>
 <div id="resource-map-panel" role="region" aria-labelledby="resource-map-title" tabindex="0">
  <div class="atlas-guidance" id="atlas-guidance"></div>
  <div class="atlas-layout"><div class="atlas-map-column"><div class="atlas-map-frame"><div id="resource-map" role="region" aria-label="City resource map"></div><button class="atlas-reset" type="button" id="atlas-reset" aria-label="Return to the full city map">City view</button></div><div class="atlas-legend" id="atlas-legend"></div><div class="atlas-legend" id="atlas-hazard-legend"></div><p class="atlas-map-status" id="atlas-layer-status" role="status"></p>''' + fault_help + '''<p class="atlas-map-status" id="atlas-map-status" role="status"></p><p id="atlas-layer-credit"></p></div>
   <div class="atlas-places"><h3 id="atlas-list-title">Places on this map</h3><details class="atlas-resource-filters" id="atlas-resource-filters" hidden><summary>Everyday type: All places</summary><div id="atlas-resource-options" role="group" aria-label="Resource types for this map"></div></details><section class="atlas-action-plan" id="atlas-action-plan" aria-label="Short disaster plan" hidden></section><p id="atlas-result-count" aria-live="polite"></p><details class="atlas-panel-notes" id="atlas-shelter-note" hidden><summary>Shelter status &amp; availability</summary><p id="atlas-feed-status" role="status"></p></details><details class="atlas-panel-notes" id="atlas-panel-notes"><summary>Coverage &amp; more help</summary><p id="atlas-list-note"></p><p id="atlas-service-coverage" class="atlas-coverage-note"></p><p class="atlas-search-more"><a href="#resource-search" id="atlas-search-more">Search more local directories</a></p></details><ul id="atlas-place-list" aria-labelledby="atlas-list-title"></ul><button type="button" id="atlas-more" class="atlas-more" hidden>Show more places</button></div></div>
 </div>
 <details class="atlas-sources" id="atlas-sources"><summary>Map sources & coverage</summary><p>Boundaries: CDTFA and U.S. Census Bureau. Evacuation planning roads: Yolo County GIS Cooperative. County-designated planning roads are not live closures or an assigned safe route; follow current official instructions. Routes, dates and source links appear below.</p><p>Selected public resources, not a complete directory. Pins mark approximate facility locations, not verified entrances. A shaded building is a Microsoft estimated outline containing the directory point; its current use, accuracy and structural safety are not verified. Unmatched locations keep a pin. Referral-only food-bank offices are excluded from map pins. Ordinary housing and day shelters are separate from activated disaster shelters. Libraries are not automatically cooling, warming or charging centers. Service hours, intake, accessibility and capacity remain separate fields, with unknowns stated. Calls and provider links help confirm eligibility, access and hours.</p><ul id="atlas-source-list"></ul><div id="atlas-hazard-sources"></div><p>City lines are generalized CDTFA taxing boundaries, not legal or evacuation boundaries. Tsunami shading is a CGS planning area, not a current warning or a guarantee of safety outside it. No evacuation route, high-ground destination or shelter capacity is inferred. Follow posted routes and local officials.</p><p>Visit details include listed hours, fees and amenities from reviewed provider records and matched OpenStreetMap data. Missing fields are not guessed. <a href="/assets/data/visit-facts/README.md">Details and limits</a>; <a href="/assets/data/visit-facts/openstreetmap-projection.json">download the separate OSM-derived facts</a>, ODbL 1.0. Street maps use OpenStreetMap online. Booklet page 2 uses separate saved Census road geometry, with a north needle and scale, even without evacuation routes. Offline copies keep the chosen county outline, tsunami areas, the short plans and any eligible planning overlays loaded for the chosen city before download. Street tiles, live shelter/alert/forecast data and CGS seismic extracts are not saved. City choices made offline outside the saved county show the existing county overview until you download a new city copy online.</p><p>Everyday water and hygiene points include community mapping: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>. <a href="/assets/data/everyday-maps/openstreetmap-projection.json">Download the OSM point database</a>; <a href="/assets/data/everyday-maps/README.md">sources, dates &amp; limits</a>. Food distribution from LA County uses May 2023 data; confirm before traveling. Water pins are ordinary refill points, not emergency supplies.</p><p>Boundary/original directory checked November 2, 2026; new local-service details checked November 3. Publisher and observation dates are shown separately. Reference: <a href="https://www.fema.gov/locations/california">FEMA California</a>. <a href="https://www.openstreetmap.org/fixthemap">Report a street-map issue</a>. Extracted building geometry: © Microsoft, <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>; <a href="/assets/data/city-maps/README.md">data & license details</a>.</p></details>
 <noscript><style>.resource-atlas .atlas-map-column,.resource-atlas .atlas-controls,.resource-atlas .atlas-heading,.resource-atlas .atlas-guidance{display:none}.resource-atlas .atlas-places{max-height:none;overflow:visible}</style><p>The interactive map needs JavaScript and an online street map. The checked contact list, sources and offline download remain below. Check <a href="https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html">Red Cross open shelters</a> or <a href="https://www.conservation.ca.gov/cgs/tsunami/maps">official California tsunami maps</a>.</p></noscript>
</section>''' + resource_search() + '''<script type="application/json" id="resource-map-data">''' + payload + '''</script><script type="application/json" id="city-map-snapshot">{}</script><script type="application/json" id="disaster-map-snapshot">{}</script><script src="/hazard-risk.js" defer></script><script src="/disaster-layers.js" defer></script><script type="application/json" id="service-map-snapshot">{}</script><script type="application/json" id="visit-facts-snapshot">{}</script><script src="/resource-facts.js" defer></script><script src="/service-resources.js" defer></script><script type="application/json" id="booklet-road-snapshot">''' + road_snapshot + '''</script><script src="/booklet-map.js" defer></script><script src="/resource-map.js" defer></script>'''
