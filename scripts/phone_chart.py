"""A shared, source-dated California phone directory. Builds without network access."""
import html
import json
from pathlib import Path
from icons import icon

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'content/regions.json').read_text(encoding='utf-8'))
CITIES = json.loads((ROOT / 'content/california-cities.json').read_text(encoding='utf-8'))
ZIP_AREAS = json.loads((ROOT / 'content/california-zip-areas.json').read_text(encoding='utf-8'))
ALERTS = json.loads((ROOT / 'content/emergency-alerts.json').read_text(encoding='utf-8'))
DOWNLOAD = '/downloads/ferdant-california-' + DATA['checked'] + '.html'
e = lambda value: html.escape(str(value), quote=True)


def phone_row(key):
    contact = DATA['contacts'][key]
    phones = ''
    for ref in contact['phones']:
        number = DATA['numbers'][ref['number']]
        note = f'<small>{e(ref["note"])}</small>' if ref.get('note') else ''
        phones += f'<span class="phone-method">{note}<a href="tel:{e(number["tel"])}" aria-label="Call {e(contact["title"])} at {e(number["label"])}">{e(number["label"])}</a>'
        if ref.get('text'):
            phones += f'<a class="phone-text" href="sms:{e(number["tel"])}">Text {e(number["label"])}</a>'
        phones += '</span>'
    scope = contact['kind'] + ' · ' + contact['scope'] + ((' · ' + contact['hours']) if contact.get('hours') else '')
    return f'<tr data-contact-id="{key}" data-resource-level="state"><th scope="row">{e(contact["title"])}<span class="resource-scope-badge scope-state">Statewide · California</span><small>{e(scope)}</small></th><td>{phones}</td></tr>'


def city_search(include_state=False):
    state_button = '<button type="button" data-location-kind="state" aria-pressed="false">State</button>' if include_state else ''
    switch_class = 'location-kind-switch location-kind-switch--state' if include_state else 'location-kind-switch'
    switch_label = 'Choose city, county, ZIP code or state' if include_state else 'Choose city, county or ZIP code'
    return f'''<div class="city-search" data-enhancement hidden><div class="{switch_class}" role="group" aria-label="{switch_label}"><button type="button" data-location-kind="city" aria-pressed="true">City</button><button type="button" data-location-kind="county" aria-pressed="false">County</button><button type="button" data-location-kind="zip" aria-pressed="false">ZIP code</button>{state_button}</div><form id="map-city-form" role="search"><label for="map-city-search">City, county or ZIP code</label><div class="city-search-row"><div class="suggestion-anchor"><input id="map-city-search" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="location-suggestions" placeholder="City, e.g. Davis" autocomplete="off"><ul id="location-suggestions" role="listbox" aria-label="California locations" hidden></ul></div><button type="submit" class="button">Search</button></div><p id="city-search-status" role="status"></p></form></div>'''


def city_map(include_search=True):
    return f'''<div class="city-map-workspace" data-enhancement hidden>{city_search() if include_search else ''}<p id="city-map-status" role="status">City mode. Click a city marker or search its name.</p><div id="city-map" role="region" aria-label="California city or county selection map"></div><p class="city-map-credit">Map data: <a href="https://publish.data.ca.gov/dataset/boe-citycounty">CDTFA</a> · <a href="https://tigerweb.geo.census.gov/">U.S. Census Bureau</a></p><p class="city-map-note">City markers and county areas are approximate. Choose a city or county, or search a ZIP code for nearby resources. ZIP search uses an area center, not a street address.</p></div>'''


def phone_chart(expanded=False, include_map=True, show_download=True, show_picker=True, shared_only=False):
    payload = json.dumps({'directory': DATA, 'places': CITIES, 'alerts': ALERTS, 'zipAreas': ZIP_AREAS, 'download': DOWNLOAD}, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    rows = ''.join(phone_row(key) for key in DATA['statewide'])
    actions=f'<div class="phone-actions"><a class="button" href="{DOWNLOAD}" data-city-download download>Download California offline copy</a><p id="phone-download-status" role="status"></p></div>' if show_download else ''
    return f'''<details class="phone-directory" id="local-essentials"{' open' if expanded else ''}{' data-shared-only' if shared_only else ''}>
      <summary class="phone-toggle">{icon('phone')}<span><strong>{"California support numbers" if shared_only else "Phone numbers"}</strong><small>{"Shared statewide contacts" if shared_only else "Emergency & local contacts"}</small></span>{icon('chevron')}</summary><div class="phone-panel">
      <div class="phone-heading"><div><h2 id="phone-title">{"California-wide support" if shared_only else "Emergency & support numbers"}</h2><p>California · Choose your city for local contacts.</p></div><div class="phone-controls" data-enhancement hidden><div class="phone-city-control"{" hidden" if not show_picker else ""}><label for="phone-city">Your city in California</label><select id="phone-city" aria-describedby="phone-coverage"><option value="">California-wide numbers</option></select></div><div class="phone-query-control"><label for="phone-query">Find a service</label><input id="phone-query" type="search" placeholder="Poison, police, water…" autocomplete="off"></div></div></div>
{city_map() if include_map else ''}
      <p class="phone-coverage" id="phone-coverage" role="status">Showing California-wide support. City and county coverage is added when you choose a location.</p>
      <noscript><p>California-wide numbers are below. Enable JavaScript to choose a city; the downloaded file still includes these numbers without JavaScript.</p></noscript>
{actions}
      <table class="phone-table"><caption class="visually-hidden" id="phone-caption">California emergency and support phone numbers other than 911</caption><thead><tr><th scope="col">Help with</th><th scope="col">Phone number</th></tr></thead><tbody id="phone-rows">{rows}</tbody></table>
      <p id="phone-no-matches" class="phone-coverage" hidden>No saved contacts match that search. Clear “Find a service” to see all saved numbers for this location.</p>
      <p class="phone-footnote">Contacts checked {DATA['checked']}. Phone service is needed to call or text. This is a saved directory, with no live dispatch, outage or shelter feed. Immediate danger still needs 911.</p>
      <div id="phone-local-alert"></div><noscript><p><a href="https://calalerts.org/signup.html">Find emergency alert signup for your county</a> (online).</p></noscript>
      <details class="phone-source-details"><summary>When to use these numbers & sources</summary><p>Contacts checked {DATA['checked']}. Availability and eligibility can change; this is not every possible local resource.</p><div id="phone-sources"></div><noscript><ul>{''.join(f'<li>{e(DATA["contacts"][key]["title"])}: {e(DATA["contacts"][key]["detail"])} <a href="{e(DATA["sources"][DATA["contacts"][key]["source"]]["url"])}">Publisher source (online)</a></li>' for key in DATA['statewide'])}</ul></noscript></details>
      </div><script type="application/json" id="phone-data">{payload}</script><script src="/phone.js" defer></script><script src="/resource-booklet.js" defer></script><script src="/infographic.js" defer></script>
    </details>'''
