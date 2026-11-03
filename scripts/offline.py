"""Build dated, self-contained offline editions. Never fetch or infer a location."""
import base64
import html
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
from phone_chart import DATA, DOWNLOAD
e = lambda value: html.escape(str(value), quote=True)


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
    leaflet_css=(ROOT / 'assets/vendor/leaflet/leaflet.css').read_text(encoding='utf-8')
    leaflet_css=leaflet_css.replace('url(images/', 'url(/assets/vendor/leaflet/images/')
    css = leaflet_css + '\n' + (ROOT / 'styles.css').read_text(encoding='utf-8')
    css = re.sub(r"url\(['\"]?(/assets/[^)'\"]+)['\"]?\)", lambda m: f'url("{data_url(m[1])}")', css)
    js = (ROOT / 'site.js').read_text(encoding='utf-8')
    output = output / 'downloads'
    output.mkdir(parents=True, exist_ok=True)
    guide_links = {f'/what-am-i-paying-for/guides/{g["slug"]}/': '#saved-' + g['slug'] for g in guides}
    doc = home.replace('<title>Practical guides for everyday problems | Ferdant</title>', f'<title>California — Ferdant offline</title>')
    doc = doc.replace('<link rel="stylesheet" href="/styles.css">', f'<style>{css}</style>')
    doc = doc.replace('<script src="/site.js" defer></script>', '')
    doc = doc.replace('<script src="/phone.js" defer></script>', '')
    doc = doc.replace('<details class="phone-directory" id="local-essentials">', '<details class="phone-directory" id="local-essentials" open>')
    doc = re.sub(r'<div class="phone-actions">.*?</div>', '', doc, flags=re.S)
    doc = doc.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,follow">')
    csp = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"
    doc = doc.replace('<head>', f'<head><meta name="ferdant-city" content=""><meta http-equiv="Content-Security-Policy" content="{e(csp)}">', 1)
    doc = re.sub(r'<div class="preview-note">.*?</div>', '<div class="preview-note">Editorial preview · saved offline copy</div>', doc, count=1)
    doc = doc.replace('<h1>Resources & tools</h1>', f'<h1>California<br>Offline edition</h1>')
    doc = doc.replace('Find a useful place to start.</p>', f'Saved copy · Regional sources checked {DATA["checked"]}.</p>')
    notice = '<div class="offline-notice"><strong>Saved to your device</strong><p>The directory, tools and saved guides work without internet. Website links and alert signup need a connection; calls need phone service. This file has no live alerts, outages or shelter availability.</p><nav aria-label="Offline sections"><a href="#local-essentials">Local essentials</a><a href="#communities">Directory</a><a href="#saved-guides">Saved guides</a></nav></div>'
    doc = doc.replace('<main id="main" tabindex="-1">', '<main id="main" tabindex="-1">' + notice)
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
    leaflet_license=e((ROOT / 'assets/vendor/leaflet/LICENSE').read_text(encoding='utf-8'))
    licenses += f'<h3>Leaflet 1.9.4 — BSD-2-Clause</h3><pre>{leaflet_license}</pre>'
    doc = doc.replace('</main>', f'<details class="offline-detail font-licenses"><summary>Embedded software & font licenses</summary>{licenses}</details></main>')
    print_js = '''
let detailsBeforePrint = [];
window.addEventListener('beforeprint', () => {
 detailsBeforePrint = [...document.querySelectorAll('.offline-detail:not(.font-licenses), .phone-source-details, .phone-directory')].filter(el => !el.open);
 detailsBeforePrint.forEach(el => {el.open = true;});
});
window.addEventListener('afterprint', () => {
 detailsBeforePrint.forEach(el => {el.open = false;}); detailsBeforePrint = [];
});'''
    leaflet_js=(ROOT / 'assets/vendor/leaflet/leaflet.js').read_text(encoding='utf-8')
    phone_js = leaflet_js + '\n' + (ROOT / 'phone.js').read_text(encoding='utf-8')
    doc = doc.replace('</body>', f'<script>{js}\n{phone_js}\n{print_js}</script></body>')
    (output / Path(DOWNLOAD).name).write_text(doc, encoding='utf-8')
    # Superseded preview exports; one shared edition replaces per-region copies.
    for legacy in ['ferdant-davis-yolo-2026-11-02.html', 'ferdant-san-francisco-2026-11-02.html']:
        (output / legacy).unlink(missing_ok=True)
