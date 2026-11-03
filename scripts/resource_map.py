"""The single city-result map and its public, dated facility projection."""
import json
import html
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def resource_map():
    data = json.loads((ROOT / 'content/resource-map.json').read_text(encoding='utf-8'))
    spec = importlib.util.spec_from_file_location('disaster_content', ROOT / 'content/disasters.py')
    disasters = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(disasters)
    data['disasters'] = disasters.DATA
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    choices = ''.join('<option value="'+html.escape(p['id'])+'">'+html.escape(p['label'])+'</option>' for p in disasters.PLANS)
    return '''<section class="resource-atlas" id="resource-atlas" aria-labelledby="resource-map-title" hidden>
 <header class="atlas-heading"><div><p class="atlas-eyebrow">Explore your area</p><h2 id="resource-map-title">Your city, at a glance</h2></div><a class="atlas-offline-link" href="#offline-download">Save offline <span aria-hidden="true">↓</span></a></header>
 <div class="atlas-controls"><button type="button" id="atlas-everyday" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>Everyday resources</button><div><label for="atlas-disaster">Disaster plan & map</label><select id="atlas-disaster"><option value="">Choose a disaster</option>''' + choices + '''</select></div></div>
 <div id="resource-map-panel" role="region" aria-labelledby="resource-map-title" tabindex="0">
  <div class="atlas-guidance" id="atlas-guidance"></div>
  <div class="atlas-layout"><div class="atlas-map-column"><div class="atlas-map-frame"><div id="resource-map" role="region" aria-label="City resource map"></div><button class="atlas-reset" type="button" id="atlas-reset" aria-label="Return to the full city map">City view</button></div><div class="atlas-legend" id="atlas-legend"></div><div class="atlas-legend" id="atlas-hazard-legend"></div><p class="atlas-map-status" id="atlas-layer-status" role="status"></p><p class="atlas-map-status" id="atlas-map-status" role="status"></p><p id="atlas-layer-credit"></p></div>
   <div class="atlas-places"><section class="atlas-action-plan" id="atlas-action-plan" aria-label="Short disaster plan" hidden></section><h3 id="atlas-list-title">Places on this map</h3><p id="atlas-list-note"></p><ul id="atlas-place-list" aria-labelledby="atlas-list-title"></ul><button type="button" id="atlas-more" class="atlas-more" hidden>Show more places</button><p id="atlas-feed-status" role="status"></p></div></div>
 </div>
 <details class="atlas-sources"><summary>Map sources & coverage</summary><p>Selected public resources, not a complete directory. Pins mark approximate facility locations, not verified entrances. A shaded building is a Microsoft estimated outline containing the directory point; its current use, accuracy and structural safety are not verified. Unmatched locations keep a pin. Normal food-bank offices are not confirmed walk-up pickup sites. Calls and provider links help confirm eligibility, access and hours.</p><ul id="atlas-source-list"></ul><div id="atlas-hazard-sources"></div><p>City lines are generalized CDTFA taxing boundaries, not legal or evacuation boundaries. Tsunami shading is a CGS planning area, not a current warning or a guarantee of safety outside it. No evacuation route, high-ground destination or shelter capacity is inferred. Follow posted routes and local officials.</p><p>Street maps use OpenStreetMap online. Offline copies keep the chosen county outline, tsunami areas, the short plans and any eligible planning overlays loaded for the chosen city before download. Street tiles, live shelter/alert/forecast data and CGS seismic extracts are not saved. City choices made offline outside the saved county show the existing county overview until you download a new city copy online.</p><p>Sources checked November 2, 2026. Publisher and observation dates are shown separately. Reference: <a href="https://www.fema.gov/locations/california">FEMA California</a>. <a href="https://www.openstreetmap.org/fixthemap">Report a street-map issue</a>. Extracted building geometry: © Microsoft, <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>; <a href="/assets/data/city-maps/README.md">data & license details</a>.</p></details>
 <noscript><style>.resource-atlas .atlas-map-column,.resource-atlas .atlas-controls,.resource-atlas .atlas-heading,.resource-atlas .atlas-guidance{display:none}.resource-atlas .atlas-places{max-height:none;overflow:visible}</style><p>The interactive map needs JavaScript and an online street map. The checked contact list, sources and offline download remain below. Check <a href="https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html">Red Cross open shelters</a> or <a href="https://www.conservation.ca.gov/cgs/tsunami/maps">official California tsunami maps</a>.</p></noscript>
</section><script type="application/json" id="resource-map-data">''' + payload + '''</script><script type="application/json" id="city-map-snapshot">{}</script><script type="application/json" id="disaster-map-snapshot">{}</script><script src="/disaster-layers.js" defer></script><script src="/resource-map.js" defer></script>'''
