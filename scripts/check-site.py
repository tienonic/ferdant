"""Check the built site: required pages, redirects, head tags, links, the apply link and words that must not appear."""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'content/site.json').read_text(encoding='utf-8'))
BANNED = re.compile(r'philip|\bphil\b|gary|china|project 42|investor|ucdavis|fieldworks|aggiebillhelp|community|communities|\bthis\b|\bdecades\b', re.I)
PHONE = re.compile(r'\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b')
REQUIRED = ['index.html', 'what-we-do/index.html', 'owners/index.html', 'interns/index.html', 'contact/index.html', 'privacy/index.html', '404.html']
ANCHORS = {'interns/index.html': ['business-development', 'acquisitions-analyst', 'engineering', 'ai-automation']}
APPLY = {'interns/index.html': 'Internship - Your name'}
HEAD = ['title', 'description', 'canonical', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image']


class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.links, self.head, self.text, self._in = [], {}, [], None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self._in = 'title'
        if tag == 'meta' and a.get('content'):
            self.head[a.get('name') or a.get('property') or a.get('http-equiv')] = a['content']
        if tag == 'link' and a.get('rel') == 'canonical':
            self.head['canonical'] = a['href']; return
        if tag == 'a' and a.get('href', '').startswith('https://'):
            return
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
    parts = urlsplit(url)
    target = ROOT / unquote(parts.path).lstrip('/')
    page = target if target.is_file() else target / 'index.html'
    if not page.is_file(): return False
    return not parts.fragment or f'id="{parts.fragment}"' in page.read_text(encoding='utf-8')


def main():
    problems = []
    for rel in REQUIRED:
        if not (ROOT / rel).is_file(): problems.append(f'missing page {rel}')
    redirects = {old.lstrip('/') + 'index.html': new for old, new in CONFIG['redirects'].items()}
    for text in (CONFIG['tagline'], CONFIG['descriptor'], CONFIG['place'], CONFIG['name']):
        if BANNED.search(text): problems.append(f'social image text contains "{BANNED.search(text).group(0)}"')
    built = [p for p in ROOT.rglob('*.html') if 'node_modules' not in p.parts]
    for path in built:
        rel = path.relative_to(ROOT).as_posix()
        source = path.read_text(encoding='utf-8')
        page = Page(); page.feed(source)
        if rel in redirects:
            refresh = page.head.get('refresh', '')
            if not refresh.endswith('url=' + redirects[rel]) or not resolves(redirects[rel]):
                problems.append(f'{rel}: redirect to {refresh!r} does not reach {redirects[rel]}')
        else:
            for key in HEAD:
                if not page.head.get(key): problems.append(f'{rel}: no {key}')
        if not page.head.get('canonical', '').startswith(CONFIG['url'] + '/'): problems.append(f'{rel}: canonical not on {CONFIG["url"]}')
        for url in page.links:
            parts = urlsplit(url)
            if parts.scheme == 'mailto':
                if parts.path != CONFIG['contact_email']: problems.append(f'{rel}: mailto to {parts.path}')
            elif parts.scheme or url.startswith('//'):
                problems.append(f'{rel}: external resource {url}')
            elif url.startswith(('/', '#')) and not resolves(url if url.startswith('/') else '/' + rel.removesuffix('index.html') + url):
                problems.append(f'{rel}: broken link {url}')
        for anchor in ANCHORS.get(rel, []):
            if f'id="{anchor}"' not in source: problems.append(f'{rel}: no #{anchor}')
        if rel in APPLY:
            subjects = [parse_qs(urlsplit(u).query).get('subject', [''])[0] for u in page.links if u.startswith('mailto:') and 'subject=' in u]
            if subjects != [APPLY[rel]]: problems.append(f'{rel}: apply subjects {subjects}, expected ["{APPLY[rel]}"]')
        if BANNED.search(source): problems.append(f'{rel}: contains "{BANNED.search(source).group(0)}"')
        if '<select' in source: problems.append(f'{rel}: has a select element')
        if PHONE.search(' '.join(page.text)) or 'tel:' in source: problems.append(f'{rel}: looks like a phone number')
    for p in problems: print(p)
    print(f'Checked {len(built)} pages: {"OK" if not problems else f"{len(problems)} problems"}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
