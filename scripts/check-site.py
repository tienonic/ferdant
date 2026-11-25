"""Check the built site: required pages, head tags, internal links, apply links and words that must not appear."""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'content/site.json').read_text(encoding='utf-8'))
BANNED = re.compile(r'philip|\bphil\b|gary|china|project 42|investor|ucdavis|fieldworks|aggiebillhelp|community|communities', re.I)
PHONE = re.compile(r'\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b|tel:')
REQUIRED = ['index.html', 'what-we-do/index.html', 'owners/index.html', 'careers/index.html',
            'careers/business-development/index.html', 'careers/acquisitions-analyst/index.html', 'careers/engineering-intern/index.html',
            'careers/ai-automation/index.html', 'careers/operating-partner/index.html', 'careers/technical-advisor/index.html',
            'contact/index.html', 'privacy/index.html', '404.html']
ANCHORS = {'careers/index.html': ['students', 'trade']}
HEAD = ['title', 'description', 'canonical', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image']


class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.links, self.head, self.text, self._in = [], {}, [], None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self._in = 'title'
        if tag == 'meta' and a.get('content'):
            self.head[a.get('name') or a.get('property')] = a['content']
        if tag == 'link' and a.get('rel') == 'canonical':
            self.head['canonical'] = a['href']; return
        for key in ('href', 'src'):
            if a.get(key): self.links.append(a[key])
        if a.get('srcset'):
            self.links += [part.split()[0] for part in a['srcset'].split(',')]

    def handle_endtag(self, tag):
        self._in = None

    def handle_data(self, data):
        if self._in == 'title': self.head['title'] = data
        self.text.append(data)


def resolves(url):
    path = unquote(urlsplit(url).path)
    target = ROOT / path.lstrip('/')
    return target.is_file() or (target / 'index.html').is_file()


def main():
    problems = []
    for rel in REQUIRED:
        if not (ROOT / rel).is_file(): problems.append(f'missing page {rel}')
    built = [p for p in ROOT.rglob('*.html') if 'node_modules' not in p.parts]
    for path in built:
        rel = path.relative_to(ROOT).as_posix()
        source = path.read_text(encoding='utf-8')
        page = Page(); page.feed(source)
        for key in HEAD:
            if not page.head.get(key): problems.append(f'{rel}: no {key}')
        if not page.head.get('canonical', '').startswith(CONFIG['url'] + '/'): problems.append(f'{rel}: canonical not on {CONFIG["url"]}')
        for url in page.links:
            parts = urlsplit(url)
            if parts.scheme == 'mailto':
                if parts.path != CONFIG['contact_email']: problems.append(f'{rel}: mailto to {parts.path}')
            elif parts.scheme or url.startswith('//'):
                problems.append(f'{rel}: external resource {url}')
            elif url.startswith('/') and not resolves(url):
                problems.append(f'{rel}: broken link {url}')
        for anchor in ANCHORS.get(rel, []):
            if f'id="{anchor}"' not in source: problems.append(f'{rel}: no #{anchor}')
        if BANNED.search(source): problems.append(f'{rel}: contains "{BANNED.search(source).group(0)}"')
        if PHONE.search(' '.join(page.text)) or 'tel:' in source: problems.append(f'{rel}: looks like a phone number')
        if rel.startswith('careers/') and rel.count('/') == 2:
            role = re.search(r'<h1>(.*?)</h1>', source).group(1).replace('&amp;', '&')
            subjects = [parse_qs(urlsplit(u).query).get('subject', [''])[0] for u in page.links if u.startswith('mailto:') and 'subject=' in u]
            if subjects != [f'{role} - Your name']: problems.append(f'{rel}: apply subject {subjects}, expected "{role} - Your name"')
    for p in problems: print(p)
    print(f'Checked {len(built)} pages: {"OK" if not problems else f"{len(problems)} problems"}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
