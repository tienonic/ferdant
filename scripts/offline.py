"""Build dated, self-contained offline editions. Never fetch or infer a location."""
import base64
import html
import json
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'content/regions.json').read_text(encoding='utf-8'))
e = lambda value: html.escape(str(value), quote=True)


def filename(region):
    return f'ferdant-{region["slug"]}-{DATA["checked"]}.html'


def download_cards():
    return ''.join(f'''<article class="region-card"><h2>{e(r['name'])}</h2><p>{e(r['summary'])}</p>
      <a class="button" href="/downloads/{filename(r)}" download>Download {e(r['name'].split(',')[0])} <span class="visually-hidden">offline HTML</span></a>
      <a class="region-preview-link" href="/downloads/{filename(r)}">Preview this edition</a></article>''' for r in DATA['regions'])


def regional_contacts(region):
    contacts = ''
    for contact in region['contacts']:
        phones = ''.join(f'<a href="tel:{e(p["value"])}">{e(p["label"])}</a>' for p in contact['phones'])
        source = DATA['sources'][contact['source']]
        contacts += f'<article class="local-contact"><h3>{e(contact["title"])}</h3><div class="local-phones">{phones}</div><p>{e(contact["detail"])}</p><a class="local-source" href="{e(source["url"])}">{e(source["title"])} (online source)</a></article>'
    alert = region['alert']
    keys = dict.fromkeys([c['source'] for c in region['contacts']] + [alert['source']])
    sources = ''.join(f'<li><a href="{e(DATA["sources"][key]["url"])}">{e(DATA["sources"][key]["title"])}</a><p>Publisher date: {e(DATA["sources"][key]["published"] or "not stated in the reviewed material")}. Checked {DATA["checked"]}. {e(DATA["sources"][key]["review"])}</p></li>' for key in keys)
    return f'''<section class="offline-local" id="local-essentials" tabindex="-1" aria-labelledby="local-title">
      <h2 id="local-title">Local essentials</h2><p>{e(region['scope'])}</p><div class="local-contact-grid">{contacts}</div>
      <details class="offline-detail"><summary>{e(alert['name'])}: prepare before disconnecting</summary><p>{e(alert['instruction'])}</p><a href="{e(DATA['sources'][alert['source']]['url'])}">Official instructions (online)</a></details>
      <details class="offline-detail"><summary>Regional sources & check date</summary><p>Saved edition: {DATA['checked']}. Recheck details with the provider when you have a connection. This edition does not update itself.</p><ul>{sources}</ul></details></section>'''


def saved_guides(guides):
    result = '<section class="offline-guides" id="saved-guides" tabindex="-1"><h2>Saved guides</h2><p>Full text is included in this file. Open a guide without a connection.</p>'
    for guide in guides:
        actions = ''.join(f'<li>{e(action)}</li>' for action in guide['quick'])
        sections = ''.join(f'<h3>{e(title)}</h3><p>{e(body)}</p>' for title, body in guide['sections'])
        sources = ''.join(f'<li><a href="{e(url)}">{e(title)}</a> — {e(date)}</li>' for title, url, date in guide['sources'])
        result += f'<details class="offline-detail" id="saved-{guide["slug"]}"><summary>{e(guide["title"])}</summary><p>{e(guide["intro"])}</p><ol>{actions}</ol>{sections}<h3>Message template</h3><blockquote>{e(guide["template"])}</blockquote><p>{e(guide["scope"])}</p><p>Guide sources checked {e(guide["sourceChecked"])}. Links need internet.</p><ul>{sources}</ul></details>'
    return result + '</section>'


def data_url(url):
    path = ROOT / url.lstrip('/')
    assert path.resolve().is_relative_to((ROOT / 'assets').resolve()), 'Only reviewed assets may be embedded.'
    mime = {'woff2': 'font/woff2', 'ico': 'image/x-icon', 'svg': 'image/svg+xml'}.get(path.suffix[1:], mimetypes.guess_type(path.name)[0])
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def build_editions(home, guides, output):
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    css = re.sub(r"url\(['\"]?(/assets/[^)'\"]+)['\"]?\)", lambda m: f'url("{data_url(m[1])}")', css)
    js = (ROOT / 'site.js').read_text(encoding='utf-8')
    output = output / 'downloads'
    output.mkdir(parents=True, exist_ok=True)
    guide_links = {f'/what-am-i-paying-for/guides/{g["slug"]}/': '#saved-' + g['slug'] for g in guides}
    for region in DATA['regions']:
        doc = home.replace('<title>Practical guides for everyday problems | Ferdant</title>', f'<title>{e(region["name"])} — Ferdant offline</title>')
        doc = doc.replace('<link rel="stylesheet" href="/styles.css">', f'<style>{css}</style>')
        doc = doc.replace('<script src="/site.js" defer></script>', '')
        doc = re.sub(r'<a class="button offline-home-link".*?</a>', '', doc, flags=re.S)
        doc = doc.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,follow">')
        csp = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"
        doc = doc.replace('<head>', f'<head><meta http-equiv="Content-Security-Policy" content="{e(csp)}">', 1)
        doc = re.sub(r'<div class="preview-note">.*?</div>', '<div class="preview-note">Editorial preview · saved offline copy</div>', doc, count=1)
        doc = doc.replace('<h1>Resources & tools</h1>', f'<h1>{e(region["name"])}<br>Offline edition</h1>')
        doc = doc.replace('Find a useful place to start.</p>', f'Saved copy · Regional sources checked {DATA["checked"]}.</p>')
        notice = '<div class="offline-notice"><strong>Saved to your device</strong><p>The directory, tools and saved guides work without internet. Website links and alert signup need a connection; calls need phone service. This file has no live alerts, outages or shelter availability.</p><nav aria-label="Offline sections"><a href="#local-essentials">Local essentials</a><a href="#communities">Directory</a><a href="#saved-guides">Saved guides</a></nav></div>'
        doc = doc.replace('<main id="main" tabindex="-1">', '<main id="main" tabindex="-1">' + notice)
        doc = doc.replace('<div class="portal-grid">', regional_contacts(region) + '<div class="portal-grid">', 1)
        doc = doc.replace('<section id="about"', saved_guides(guides) + '<section id="about"', 1)
        doc = re.sub(r'(src|href)="(/assets/[^"\s]+)"', lambda m: f'{m[1]}="{data_url(m[2])}"', doc)
        def local_link(match):
            url = match[1]
            if url == '/': return 'href="#main"'
            if url.startswith('/#'): return f'href="{e(url[1:])}"'
            path = url.split('#')[0]
            return 'href="' + (guide_links[path] if path in guide_links else 'https://ferdant.com' + e(url)) + '"'
        doc = re.sub(r'href="(/[^"\s]*)"', local_link, doc)
        # All fonts, icons and tools are embedded; there are no network subresources or service workers.
        licenses = ''.join(f'<h3>{e(p.name)}</h3><pre>{e(p.read_text(encoding="utf-8"))}</pre>' for p in sorted((ROOT / 'assets/fonts').glob('*OFL*')))
        doc = doc.replace('</main>', f'<details class="offline-detail font-licenses"><summary>Embedded font licenses</summary>{licenses}</details></main>')
        print_js = '''
let detailsBeforePrint = [];
window.addEventListener('beforeprint', () => {
 detailsBeforePrint = [...document.querySelectorAll('.offline-detail:not(.font-licenses)')].filter(el => !el.open);
 detailsBeforePrint.forEach(el => {el.open = true;});
});
window.addEventListener('afterprint', () => {
 detailsBeforePrint.forEach(el => {el.open = false;}); detailsBeforePrint = [];
});'''
        doc = doc.replace('</body>', f'<script>{js}\n{print_js}</script></body>')
        (output / filename(region)).write_text(doc, encoding='utf-8')
