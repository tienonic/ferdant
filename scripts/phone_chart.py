"""A shared, source-dated California phone directory. Builds without network access."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'content/regions.json').read_text(encoding='utf-8'))
CITIES = json.loads((ROOT / 'content/california-cities.json').read_text(encoding='utf-8'))
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
    return f'<tr data-contact-id="{key}"><th scope="row">{e(contact["title"])}<small>{e(scope)}</small></th><td>{phones}</td></tr>'


def phone_chart():
    payload = json.dumps({'directory': DATA, 'places': CITIES, 'download': DOWNLOAD}, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    rows = ''.join(phone_row(key) for key in DATA['statewide'])
    return f'''<section class="phone-directory" id="local-essentials" tabindex="-1" aria-labelledby="phone-title">
      <div class="phone-heading"><div><h2 id="phone-title">Emergency & support numbers</h2><p>California · Choose your city for local contacts.</p></div><div class="phone-controls" data-enhancement hidden><div class="phone-city-control"><label for="phone-city">Your city in California</label><select id="phone-city" aria-describedby="phone-coverage"><option value="">California-wide numbers</option></select></div><div class="phone-query-control"><label for="phone-query">Find a service</label><input id="phone-query" type="search" placeholder="Poison, police, water…" autocomplete="off"></div></div></div>
      <p class="phone-coverage" id="phone-coverage" role="status">Showing California-wide support. City and county coverage is added when you choose a location.</p>
      <noscript><p>California-wide numbers are below. Enable JavaScript to choose a city; the downloaded file still includes these numbers and the saved guides without JavaScript.</p></noscript>
      <div class="phone-actions"><a class="button" href="{DOWNLOAD}" data-city-download download>Download California offline copy</a><a href="/offline/">About the offline version</a><p id="phone-download-status" role="status"></p></div>
      <table class="phone-table"><caption class="visually-hidden" id="phone-caption">California emergency and support phone numbers other than 911</caption><thead><tr><th scope="col">Help with</th><th scope="col">Phone number</th></tr></thead><tbody id="phone-rows">{rows}</tbody></table>
      <p id="phone-no-matches" class="phone-coverage" hidden>No saved contacts match that search. Clear “Find a service” to see all saved numbers for this location.</p>
      <p class="phone-footnote">Contacts checked {DATA['checked']}. Phone service is needed to call or text. This is a saved directory, with no live dispatch, outage or shelter feed. Immediate danger still needs 911.</p>
      <details class="phone-source-details"><summary>When to use these numbers & sources</summary><p>Contacts checked {DATA['checked']}. Availability and eligibility can change; this is not every possible local resource.</p><div id="phone-local-alert"></div><div id="phone-sources"></div><noscript><ul>{''.join(f'<li>{e(DATA["contacts"][key]["title"])}: {e(DATA["contacts"][key]["detail"])} <a href="{e(DATA["sources"][DATA["contacts"][key]["source"]]["url"])}">Publisher source (online)</a></li>' for key in DATA['statewide'])}</ul></noscript></details>
      <script type="application/json" id="phone-data">{payload}</script><script src="/phone.js" defer></script>
    </section>'''
