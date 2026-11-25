"""Build the static site from content/site.json and content/**/*.md.

Preview mode (the default) marks every page noindex; production mode is the published site.
The company name, contact and pay come only from content/site.json, so a rename is one edit and one build.
"""
import argparse, html, json, re, shutil, subprocess, tempfile
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content'
IMG = ROOT / 'assets/img'
e = lambda s: html.escape(str(s), quote=True)
ARROW = '<svg class="arrow" viewBox="0 0 16 10" aria-hidden="true" focusable="false"><path d="M0 5h14M10 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>'


def site_values():
    c = json.loads((CONTENT / 'site.json').read_text(encoding='utf-8'))
    c['contact_role_lower'] = c['contact_role'].lower()
    c['intern_hours_cap'] = c['intern_hours'][:1].upper() + c['intern_hours'][1:]
    c['city'] = c['place'].split(',')[0]
    c['wordmark'] = c['name'].lower()
    return c


C = site_values()


def fill(text, page):
    def value(m):
        key = m.group(1)
        if key in page.get('vars', {}):
            return page['vars'][key]
        if key in C and isinstance(C[key], str):
            return C[key]
        raise KeyError(f'{page["source"]}: unknown value {{{{{key}}}}}')
    return re.sub(r'\{\{(\w+)\}\}', value, text)


def load(path):
    head, body = path.read_text(encoding='utf-8').split('---\n', 1)
    page = dict(line.split(': ', 1) for line in head.strip().splitlines())
    rel = path.relative_to(CONTENT).with_suffix('').as_posix()
    page['url'] = '/404.html' if rel == '404' else '/' if rel == 'index' else '/' + rel.removesuffix('/index').removesuffix('index') + '/'
    page['source'], page['body'] = rel, body
    if 'role' in page:
        page['vars'] = {'role': page['role'], 'pay': C[page.get('pay', 'intern_pay')]}
    for key in ('title', 'description', 'hero_title', 'hero_text'):
        if key in page:
            page[key] = fill(page[key], page)
    return page


def inline(text):
    out = e(text)
    out = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', out)
    return re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', out)


def picture(name, cls, sizes='100vw', eager=False):
    """Art-directed <picture> from the files present in assets/img: name-<w>.<fmt> and name-p-<w>.<fmt> for phones."""
    def srcset(prefix, fmt):
        files = sorted(IMG.glob(f'{prefix}-[0-9]*.{fmt}'), key=lambda p: int(p.stem.rsplit('-', 1)[1]))
        return ', '.join(f'/assets/img/{p.name} {p.stem.rsplit("-", 1)[1]}w' for p in files)
    sources = ''
    for fmt in ('avif', 'webp'):
        if srcset(f'{name}-p', fmt):
            sources += f'<source media="(max-width: 699px)" type="image/{fmt}" srcset="{srcset(f"{name}-p", fmt)}" sizes="100vw">'
    for fmt in ('avif', 'webp'):
        if srcset(name, fmt):
            sources += f'<source type="image/{fmt}" srcset="{srcset(name, fmt)}" sizes="{sizes}">'
    jpgs = sorted(IMG.glob(f'{name}-[0-9]*.jpg'), key=lambda p: int(p.stem.rsplit('-', 1)[1]))
    if not jpgs:
        return f'<div class="{cls}"></div>'
    fallback = jpgs[len(jpgs) // 2].name
    load_attrs = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return f'<picture class="{cls}">{sources}<img src="/assets/img/{fallback}" srcset="{srcset(name, "jpg")}" sizes="{sizes}" alt="" {load_attrs} decoding="async"></picture>'


def california():
    return (ROOT / 'assets/california.svg').read_text(encoding='utf-8').strip().replace('{{city}}', e(C['city']))


def roles(group, pages):
    rows = ''.join(
        f'<li><a href="{p["url"]}"><span class="role-name">{e(p["role"])}</span><span class="role-line">{e(p["description"])}</span>{ARROW}</a></li>'
        for p in sorted(pages, key=lambda p: int(p.get('order', 0))) if p.get('group') == group)
    return f'<ul class="roles">{rows}</ul>'


def chooser(label, items, pages):
    """'I am [select]' with a line and a button per choice. Without JavaScript the choices show as a list of links."""
    choices = []
    for item in items:
        fields = [f.strip() for f in item.removeprefix('- ').split('|')]
        if len(fields) == 2:
            target = next(p for p in pages if p['url'] == f'/careers/{fields[1].lstrip("@")}/')
            fields = [fields[0], f'{target["role"]}: {target["description"]}', 'See the role', target['url']]
        choices.append(fields)
    options = ''.join(f'<option value="{i}" data-line="{e(line)}" data-button="{e(button)}" data-href="{e(href)}">{e(text)}</option>' for i, (text, line, button, href) in enumerate(choices))
    first = choices[0]
    links = ''.join(f'<li><span>I am {e(text)}.</span> {e(line)} <a href="{e(href)}">{e(button)}</a></li>' for text, line, button, href in choices)
    return (f'<div class="chooser"><form class="chooser-form" data-chooser hidden><label class="chooser-label" for="chooser">{e(label)}</label>'
            f'<p class="chooser-sentence"><span>I am</span> <select id="chooser" name="who">{options}</select></p>'
            f'<div class="chooser-result" aria-live="polite"><p class="chooser-line">{e(first[1])}</p><a class="button" href="{e(first[3])}">{e(first[2])}</a></div></form>'
            f'<div class="chooser-list" data-chooser-list><p class="chooser-label">{e(label)}</p><ul>{links}</ul></div></div>')


def apply_button(page):
    subject = quote(f'{page["role"]} - Your name')
    email = e(C['contact_email'])
    return f'<p class="apply"><a class="button" href="mailto:{email}?subject={subject}">Apply by email</a><span>{email}</span></p>'


def render(body, page, pages):
    """Turn a page body into sections. ## starts a section; !close starts one without a heading."""
    sections, band = [], None

    def open_section(heading=None):
        sections.append({'heading': heading, 'body': [], 'aside': [], 'band': band, 'id': None, 'kind': ''})

    for block in re.split(r'\n\s*\n', fill(body, page).strip()):
        block = block.strip()
        if not block:
            continue
        if block.startswith('## '):
            heading, _, anchor = block[3:].strip().partition(' {#')
            open_section(heading.strip()); band = None
            sections[-1]['id'] = anchor.rstrip('}') or None
            continue
        if block.startswith('!'):
            word, _, arg = block[1:].partition(' ')
            if word == 'include':
                sections.extend(render((CONTENT / f'{arg}.md').read_text(encoding='utf-8'), page, pages))
                continue
            if word == 'band':
                band = arg; continue
            if word == 'close':
                open_section(); continue
            if word == 'chooser':
                open_section(); sections[-1]['kind'] = 'sec-chooser'
                label, *items = arg.splitlines()
                sections[-1]['body'].append(chooser(label, items, pages))
                continue
            if not sections:
                open_section()
            if word == 'map':
                sections[-1]['aside'].append(f'<figure class="map">{california()}</figure>')
            elif word == 'roles':
                sections[-1]['body'].append(roles(arg, pages))
            elif word == 'apply':
                sections[-1]['body'].append(apply_button(page))
            else:
                raise ValueError(f'{page["source"]}: unknown directive !{word}')
            continue
        if not sections:
            open_section()
        lines = block.splitlines()
        if all(l.startswith('- ') for l in lines):
            html_block = '<ul>' + ''.join(f'<li>{inline(l[2:])}</li>' for l in lines) + '</ul>'
        elif all(re.match(r'\d+\. ', l) for l in lines):
            html_block = '<ol>' + ''.join(f'<li>{inline(l.split(". ", 1)[1])}</li>' for l in lines) + '</ol>'
        elif block.startswith('→ '):
            m = re.match(r'→ \[(.+?)\]\((.+?)\)$', block)
            html_block = f'<p class="more"><a href="{e(m.group(2))}">{e(m.group(1))}{ARROW}</a></p>'
        else:
            html_block = '<p>' + '<br>'.join(inline(l) for l in lines) + '</p>'
        sections[-1]['body'].append(html_block)
    return sections


def section_html(s):
    band = f'<div class="band">{picture(s["band"], "band-photo")}</div>' if s['band'] else ''
    heading = f'<h2>{e(s["heading"])}</h2>' if s['heading'] else ''
    aside = f'<div class="sec-aside">{"".join(s["aside"])}</div>' if s['aside'] else ''
    cls = ' '.join(filter(None, ['sec', 'sec-plain' if not s['heading'] else '', 'sec-with-aside' if s['aside'] else '', s['kind']]))
    anchor = f' id="{s["id"]}"' if s['id'] else ''
    return f'{band}<section class="{cls}"{anchor}><div class="wrap sec-grid">{heading}<div class="sec-body">{"".join(s["body"])}</div>{aside}</div></section>'


def nav_links(current):
    return ''.join(f'<a href="{u}"{" aria-current=page" if current.startswith(u) else ""}>{e(label)}</a>' for label, u in C['nav'])


def wordmark():
    return f'<a class="wordmark" href="/" aria-label="{e(C["name"])} home">{e(C["wordmark"])}<span>.</span></a>'


MENU_ICON = '<span class="menu-lines" aria-hidden="true"></span><span class="visually-hidden">Menu</span>'


def page(p, body):
    """The shared shell: head, photographic hero with header, the page body and the footer."""
    path, title, description = p['url'], p['title'], p['description']
    full_title = title if path == '/' else f'{title} · {C["name"]}'
    robots = 'noindex,follow' if args.mode == 'preview' or path == '/404.html' else 'index,follow'
    canonical = C['url'] + path
    image = C['url'] + '/assets/img/social.png'
    schema = [{'@context': 'https://schema.org', '@type': 'WebSite', 'name': C['name'], 'url': C['url'] + '/'},
              {'@context': 'https://schema.org', '@type': 'WebPage', 'name': full_title, 'description': description, 'url': canonical, 'inLanguage': 'en'}]
    eyebrow = '<p class="eyebrow"><a href="/careers/">Careers</a></p>' if 'role' in p else ''
    hero_text = f'<p class="hero-text">{inline(p["hero_text"])}</p>' if p.get('hero_text') else ''
    preview = '<div class="preview-note">Preview · not yet published</div>' if args.mode == 'preview' else ''
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>{e(full_title)}</title><meta name="description" content="{e(description)}"><meta name="robots" content="{robots}"><meta name="theme-color" content="#1f4a33"><link rel="canonical" href="{canonical}"><link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><link rel="preload" href="/assets/fonts/newsreader-400-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/geist-variable-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/styles.css">
<meta property="og:type" content="website"><meta property="og:site_name" content="{e(C["name"])}"><meta property="og:title" content="{e(full_title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{e(C["name"])}: {e(C["tagline"])}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(full_title)}"><meta name="twitter:description" content="{e(description)}"><meta name="twitter:image" content="{image}">
{'<script src="/site.js" defer></script>' if 'data-chooser' in body else ''}<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script></head>
<body><a class="skip" href="#main">Skip to content</a>{preview}
<header class="hero hero-{p.get("hero", "page")}">{picture(p.get("image", "hero"), "hero-photo", eager=True)}<div class="wrap site-header">{wordmark()}<nav class="desktop-nav" aria-label="Main">{nav_links(path)}</nav><details class="menu"><summary>{MENU_ICON}</summary><nav class="menu-panel" aria-label="Main">{nav_links(path)}</nav></details></div><div class="wrap hero-copy">{eyebrow}<h1>{inline(p["hero_title"])}</h1>{hero_text}</div></header>
<main id="main" tabindex="-1">{body}</main>
<footer class="site-footer"><div class="wrap footer-inner">{wordmark()}<p>© {e(C["year"])} {e(C["name"])} · {e(C["place"])} · <a href="/contact/">Contact</a> · <a href="/privacy/">Privacy</a></p></div></footer>
</body></html>
'''


def info(p, pages):
    return page(p, ''.join(section_html(s) for s in render(p['body'], p, pages)))


def social_card():
    """HTML for the 1200x630 link-preview image, rendered by scripts/social.mjs."""
    photo = next(IMG.glob('hero-1600.jpg'), None)
    bg = f"url('{photo.as_uri()}')" if photo else 'none'
    fonts = (ROOT / 'assets/fonts').as_uri()
    return f'''<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:Newsreader;src:url('{fonts}/newsreader-400-latin.woff2') format('woff2')}}
@font-face{{font-family:Geist;src:url('{fonts}/geist-variable-latin.woff2') format('woff2');font-weight:100 900}}
html,body{{margin:0}}
.card{{position:relative;width:1200px;height:630px;overflow:hidden;background:#1f4a33;color:#fff;font-family:Newsreader,Georgia,serif}}
.card .photo{{position:absolute;inset:0;background:{bg} center/cover;filter:grayscale(1) contrast(1.1)}}
.card .tint{{position:absolute;inset:0;background:#2a5a3f;mix-blend-mode:multiply}}
.card .shade{{position:absolute;inset:0;background:rgba(12,34,22,.38)}}
.card .copy{{position:absolute;left:72px;right:72px;top:64px;bottom:64px;display:flex;flex-direction:column;justify-content:space-between}}
.wordmark{{font-size:52px;letter-spacing:-.01em}}
.line{{font-size:70px;line-height:1.04;letter-spacing:-.015em;max-width:960px}}
.meta{{font:500 22px Geist,sans-serif;letter-spacing:.01em;opacity:.9}}
</style><div class="card"><div class="photo"></div><div class="tint"></div><div class="shade"></div><div class="copy"><div class="wordmark">{e(C["wordmark"])}.</div><div><div class="line">{e(C["tagline"])}</div><p class="meta">{e(C["descriptor"])} · {e(C["place"])}</p></div></div></div>
<div class="icon" style="width:180px;height:180px;background:#1f4a33;color:#fff;display:flex;align-items:center;justify-content:center;font:400 150px/1 Newsreader,serif;padding-bottom:14px;box-sizing:border-box">{e(C["wordmark"][:1])}</div>'''


def render_images():
    if not (ROOT / 'node_modules/playwright').exists() or not shutil.which('node'):
        print('Skipped the social image and favicons: run npm ci to install Playwright, then build again.')
        return
    with tempfile.TemporaryDirectory() as tmp:
        card = Path(tmp) / 'card.html'
        card.write_text(social_card(), encoding='utf-8')
        subprocess.run(['node', str(ROOT / 'scripts/social.mjs'), str(card), str(ROOT / 'assets')], check=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['preview', 'production'], default='preview')
    ap.add_argument('--no-images', action='store_true', help='skip rendering the social image and favicons')
    args = ap.parse_args()
    sources = sorted(p for p in CONTENT.rglob('*.md') if not p.name.startswith('_'))
    pages = [load(p) for p in sources]
    for p in pages:
        target = ROOT / (p['url'].lstrip('/') if p['url'].endswith('.html') else p['url'].lstrip('/') + 'index.html')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(info(p, pages), encoding='utf-8')
    urls = sorted(p['url'] for p in pages if p['url'] != '/404.html')
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{C["url"]}{u}</loc></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\n' + (f'Sitemap: {C["url"]}/sitemap.xml\n' if args.mode == 'production' else '# Preview pages carry noindex.\n'), encoding='utf-8')
    if not args.no_images:
        render_images()
    print(f'Built {len(pages)} pages in {args.mode} mode.')
