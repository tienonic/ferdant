"""Build dated, self-contained offline editions. Never fetch or infer a location."""
import base64
import html
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
from phone_chart import DATA, DOWNLOAD
e = lambda value: html.escape(str(value), quote=True)


def data_url(url):
    path = ROOT / url.lstrip('/')
    assert path.resolve().is_relative_to((ROOT / 'assets').resolve()), 'Only reviewed assets may be embedded.'
    mime = {'woff2': 'font/woff2', 'ico': 'image/x-icon', 'svg': 'image/svg+xml'}.get(path.suffix[1:], mimetypes.guess_type(path.name)[0])
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def build_editions(home, output):
    leaflet_css=(ROOT / 'assets/vendor/leaflet/leaflet.css').read_text(encoding='utf-8')
    leaflet_css=leaflet_css.replace('url(images/', 'url(/assets/vendor/leaflet/images/')
    css = leaflet_css + '\n' + (ROOT / 'styles.css').read_text(encoding='utf-8')
    css = re.sub(r"url\(['\"]?(/assets/[^)'\"]+)['\"]?\)", lambda m: f'url("{data_url(m[1])}")', css)
    js = (ROOT / 'site.js').read_text(encoding='utf-8')
    output = output / 'downloads'
    output.mkdir(parents=True, exist_ok=True)
    doc = re.sub(r'<title>.*?</title>', '<title>California — Ferdant offline</title>', home, count=1)
    doc = doc.replace('<link rel="stylesheet" href="/styles.css">', f'<style>{css}</style>')
    doc = doc.replace('<script src="/site.js" defer></script>', '').replace('<script src="/recommendations.js" defer></script>', '')
    doc = doc.replace('<script src="/phone.js" defer></script>', '').replace('<script src="/infographic.js" defer></script>', '')
    doc = doc.replace('<script src="/resource-map.js" defer></script>', '')
    doc = doc.replace('<script src="/disaster-layers.js" defer></script>', '').replace('<script src="/hazard-risk.js" defer></script>', '')
    doc = doc.replace('<script src="/service-resources.js" defer></script>', '').replace('<script src="/resource-booklet.js" defer></script>', '')
    doc = re.sub(r'(<details class="phone-directory" id="local-essentials")([^>]*)(>)', lambda m: m[1]+m[2]+('' if re.search(r'\bopen\b',m[2]) else ' open')+m[3], doc)
    doc = re.sub(r'<div class="phone-actions">.*?</div>', '', doc, flags=re.S)
    doc = doc.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,follow">')
    csp = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"
    doc = doc.replace('<head>', f'<head><meta name="ferdant-city" content=""><meta http-equiv="Content-Security-Policy" content="{e(csp)}">', 1)
    doc = re.sub(r'<div class="preview-note">.*?</div>', '<div class="preview-note">Editorial preview · saved offline copy</div>', doc, count=1)
    doc = doc.replace('<h2 id="location-title">Start with your location</h2>', '<h2 id="location-title">Your saved location</h2>')
    doc = re.sub(r'<h1[^>]*>.*?</h1>', '<h1 id="local-page-title">California offline edition</h1>', doc, count=1)
    doc = doc.replace('Choose your location. Find your next step.</p>', f'Saved copy · Regional sources checked {DATA["checked"]}.</p>')
    doc = re.sub(r'(src|href)="(/assets/[^"\s]+)"', lambda m: f'{m[1]}="{data_url(m[2])}"', doc)
    def local_link(match):
        url = match[1]
        if url == '/': return 'href="#main"'
        if url.startswith('/#'): return f'href="{e(url[1:])}"'
        return 'href="https://ferdant.com' + e(url) + '"'
    doc = re.sub(r'href="(/[^"\s]*)"', local_link, doc)
    doc = re.sub(r'(<a class="widget-guide-link"[^>]*>)(.*?)(</a>)', lambda m:m[1]+m[2]+' (online)'+m[3], doc)
    # All fonts, icons and tools are embedded; there are no network subresources or service workers.
    licenses = ''.join(f'<h3>{e(p.name)}</h3><pre>{e(p.read_text(encoding="utf-8"))}</pre>' for p in sorted((ROOT / 'assets/fonts').glob('*OFL*')))
    leaflet_license=e((ROOT / 'assets/vendor/leaflet/LICENSE').read_text(encoding='utf-8'))
    pdf_license=e((ROOT / 'assets/vendor/jspdf/LICENSE').read_text(encoding='utf-8'))
    licenses += f'<h3>jsPDF 4.2.1 - MIT</h3><pre>{pdf_license}</pre>'
    licenses += f'<h3>Leaflet 1.9.4 — BSD-2-Clause</h3><pre>{leaflet_license}</pre>'
    buildings_license=e((ROOT / 'assets/data/city-maps/BUILDINGS-LICENSE.txt').read_text(encoding='utf-8'))
    licenses += f'<h3>Microsoft extracted building geometry — ODbL 1.0</h3><pre>{buildings_license}</pre>'
    doc = doc.replace('</main>', f'<details class="offline-detail font-licenses"><summary>Embedded software & font licenses</summary>{licenses}</details></main>')
    recommendations_js=(ROOT / 'recommendations.js').read_text(encoding='utf-8')
    print_js = '''
let detailsBeforePrint = [];
window.addEventListener('beforeprint', () => {
 detailsBeforePrint = [...document.querySelectorAll('.offline-detail:not(.font-licenses), .phone-source-details, .phone-directory, .service-row')].filter(el => !el.open);
 detailsBeforePrint.forEach(el => {el.open = true;});
});
window.addEventListener('afterprint', () => {
 detailsBeforePrint.forEach(el => {el.open = false;}); detailsBeforePrint = [];
});'''
    leaflet_js=(ROOT / 'assets/vendor/leaflet/leaflet.js').read_text(encoding='utf-8')
    phone_js = leaflet_js + '\n' + (ROOT / 'phone.js').read_text(encoding='utf-8')
    infographic_js=(ROOT / 'infographic.js').read_text(encoding='utf-8')
    map_js=(ROOT / 'resource-map.js').read_text(encoding='utf-8')
    disaster_js=(ROOT / 'disaster-layers.js').read_text(encoding='utf-8')
    services_js=(ROOT / 'service-resources.js').read_text(encoding='utf-8')
    risk_js=(ROOT / 'hazard-risk.js').read_text(encoding='utf-8')
    booklet_js=(ROOT / 'resource-booklet.js').read_text(encoding='utf-8')
    pdf_js=(ROOT / 'assets/vendor/jspdf/jspdf.umd.min.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
    pdf_js='\n'.join(line.rstrip() for line in pdf_js.splitlines())
    doc = doc.replace('</body>', f'<script>{js}\n{phone_js}\n{risk_js}\n{disaster_js}\n{services_js}\n{pdf_js}\n{booklet_js}\n{infographic_js}\n{map_js}\n{recommendations_js}\n{print_js}</script></body>')
    doc = re.sub(r'(?m)^[ \t]+$', '', doc)
    (output / Path(DOWNLOAD).name).write_text(doc, encoding='utf-8')
    # Superseded preview exports; one shared edition replaces per-region copies.
    for legacy in ['ferdant-davis-yolo-2026-11-02.html', 'ferdant-san-francisco-2026-11-02.html']:
        (output / legacy).unlink(missing_ok=True)
