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


def site_values():
    c = json.loads((CONTENT / 'site.json').read_text(encoding='utf-8'))
    c['contact_role_lower'] = c['contact_role'].lower()
    c['city'] = c['place'].split(',')[0]
    c['wordmark'] = c['name'].lower()
    c['contact_first'] = c['contact_name'].split()[0]
    c['has_form'] = bool(c.get('form_access_key'))
    return c


C = site_values()


def fill(text, page):
    def value(m):
        key = m.group(1)
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


def links(items):
    rows = ''.join(f'<li><a href="{e(href)}">{e(label)}</a></li>' for label, href in (i.removeprefix('- ').split(' | ') for i in items))
    return f'<ul class="links">{rows}</ul>'


def apply_button(subject):
    email = e(C['contact_email'])
    return f'<p class="apply"><a class="button" href="mailto:{email}?subject={quote(subject)}">Email {email}</a><span>{email}</span></p>'


def form(button, lines):
    """A plain HTML form posted to Web3Forms. Lines: '= name | value' for hidden values, '- name | Label | type [| optional]' for fields.
    Types: text, email, tel, checkbox, textarea <rows>, radio: a; b, select: a; b (an option ending in '=' has an empty value)."""
    hidden = f'<input type="hidden" name="access_key" value="{e(C["form_access_key"])}">'
    hidden += '<input type="checkbox" name="botcheck" class="botcheck" style="display:none" tabindex="-1" autocomplete="off">'
    fields = ''
    for line in lines:
        kind, parts = line[:1], [x.strip() for x in line[2:].split('|')]
        if kind == '=':
            hidden += f'<input type="hidden" name="{e(parts[0])}" value="{e(parts[1])}">'
            continue
        name, label, ftype = parts[:3]
        required = '' if 'optional' in parts[3:] else ' required'
        if ftype.startswith('select:'):
            options = ''
            for o in (o.strip() for o in ftype[7:].split(';')):
                label_text, empty = o.removesuffix('=').strip(), o.endswith('=')
                options += f'<option value="{"" if empty else e(o)}">{e(label_text)}</option>'
            fields += f'<div class="field"><label for="f-{name}">{e(label)}</label><select id="f-{name}" name="{name}"{required}>{options}</select></div>'
        elif ftype.startswith('radio:'):
            options = [o.strip() for o in ftype[6:].split(';')]
            choices = ''.join(f'<label class="choice"><input type="radio" name="{name}" value="{e(o)}"{required}> {e(o)}</label>' for o in options)
            fields += f'<fieldset class="field"><legend>{e(label)}</legend>{choices}</fieldset>'
        elif ftype == 'checkbox':
            fields += f'<div class="field"><label class="choice"><input type="checkbox" name="{name}" value="Yes"{required}> {e(label)}</label></div>'
        elif ftype.startswith('textarea'):
            rows = ftype.split()[1]
            fields += f'<div class="field"><label for="f-{name}">{e(label)}</label><textarea id="f-{name}" name="{name}" rows="{rows}"{required}></textarea></div>'
        else:
            auto = {'name': ' autocomplete="name"', 'email': ' autocomplete="email"', 'tel': ' autocomplete="tel"'}.get(ftype if ftype != 'text' else name, '')
            fields += f'<div class="field"><label for="f-{name}">{e(label)}</label><input id="f-{name}" name="{name}" type="{ftype}"{auto}{required}></div>'
    return f'<form class="apply-form" method="POST" action="https://api.web3forms.com/submit">{hidden}{fields}<button class="button" type="submit">{e(button)}</button></form>'


def render(body, page):
    """Turn a page body into sections. ## starts a section, ### a subheading; !close starts a section without a heading."""
    sections, skipping = [], False

    def open_section(heading=None):
        sections.append({'heading': heading, 'body': [], 'aside': [], 'id': None, 'kind': ''})

    for block in re.split(r'\n\s*\n', fill(body, page).strip()):
        block = block.strip()
        # [form] and [no-form] keep a block, or a whole ## section, only when the application form is or is not configured.
        condition = re.match(r'\[(form|no-form)\] ', block)
        if condition:
            block = block[condition.end():]
            keep = C['has_form'] == (condition.group(1) == 'form')
        else:
            keep = True
        if block.startswith('## '):
            skipping = not keep
        if skipping or not keep or not block:
            continue
        if block.startswith('## '):
            heading, _, anchor = block[3:].strip().partition(' {#')
            open_section(heading.strip())
            sections[-1]['id'] = anchor.rstrip('}') or None
            continue
        if block.startswith('!'):
            first, _, rest = block[1:].partition('\n')
            word, _, arg = first.partition(' ')
            if word == 'close':
                open_section(); continue
            if word == 'lead':
                open_section(); sections[-1]['kind'] = 'sec-lead'
                sections[-1]['body'].append(f'<p class="lead">{inline(arg)}</p>')
                continue
            if word == 'links':
                open_section(); sections[-1]['kind'] = 'sec-links'
                sections[-1]['body'].append(links(rest.splitlines()))
                continue
            if not sections:
                open_section()
            if word == 'map':
                sections[-1]['aside'].append(f'<figure class="map">{california()}</figure>')
            elif word == 'small':
                sections[-1]['body'].append(f'<p class="small">{inline(arg)}</p>')
            elif word == 'apply':
                sections[-1]['body'].append(apply_button(arg))
            elif word == 'form':
                sections[-1]['body'].append(form(arg, rest.splitlines()))
            else:
                raise ValueError(f'{page["source"]}: unknown directive !{word}')
            continue
        if not sections:
            open_section()
        lines = block.splitlines()
        if block.startswith('### '):
            html_block = f'<h3>{inline(block[4:])}</h3>'
        elif all(l.startswith('- ') for l in lines):
            html_block = '<ul>' + ''.join(f'<li>{inline(l[2:])}</li>' for l in lines) + '</ul>'
        elif all(re.match(r'\d+\. ', l) for l in lines):
            html_block = '<ol>' + ''.join(f'<li>{inline(l.split(". ", 1)[1])}</li>' for l in lines) + '</ol>'
        elif re.fullmatch(r'\[[^\]]+\]\([^)]+\)', block):
            html_block = f'<p class="go">{inline(block)}</p>'
        else:
            html_block = '<p>' + '<br>'.join(inline(l) for l in lines) + '</p>'
        sections[-1]['body'].append(html_block)
    return sections


def section_html(s):
    heading = f'<h2>{e(s["heading"])}</h2>' if s['heading'] else ''
    aside = f'<div class="sec-aside">{"".join(s["aside"])}</div>' if s['aside'] else ''
    cls = ' '.join(filter(None, ['sec', 'sec-plain' if not s['heading'] else '', 'sec-with-aside' if s['aside'] else '', s['kind']]))
    anchor = f' id="{s["id"]}"' if s['id'] else ''
    return f'<section class="{cls}"{anchor}><div class="wrap sec-grid">{heading}<div class="sec-body">{"".join(s["body"])}</div>{aside}</div></section>'


def nav_links(current, with_sub=False):
    """Header links. A section is current on its own pages and its sub-pages; the phone menu also lists the sub-pages, indented."""
    out = ''
    for label, u in C['nav']:
        sub = C.get('subnav', {}).get(u, [])
        here = current.startswith(u) or any(current.startswith(s) for _, s in sub)
        out += f'<a href="{u}"{" aria-current=page" if here else ""}>{e(label)}</a>'
        if with_sub:
            out += ''.join(f'<a class="sub" href="{s}"{" aria-current=page" if current.startswith(s) else ""}>{e(l)}</a>' for l, s in sub)
    return out


def wordmark():
    return f'<a class="wordmark" href="/" aria-label="{e(C["name"])} home">{e(C["wordmark"])}<span>.</span></a>'


MENU_ICON = '<span class="menu-lines" aria-hidden="true"></span><span class="visually-hidden">Menu</span>'


def page(p, body):
    """The shared shell: head, photographic hero with header, the page body and the footer."""
    path, title, description = p['url'], p['title'], p['description']
    full_title = title if path == '/' else f'{title} · {C["name"]}'
    robots = 'noindex,follow' if args.mode == 'preview' or p.get('noindex') else 'index,follow'
    canonical = C['url'] + path
    social = C['url'] + '/assets/img/social.png'
    schema = [{'@context': 'https://schema.org', '@type': 'WebSite', 'name': C['name'], 'url': C['url'] + '/'},
              {'@context': 'https://schema.org', '@type': 'WebPage', 'name': full_title, 'description': description, 'url': canonical, 'inLanguage': 'en'}]
    image = p.get('image', 'power')
    caption = f'<p class="hero-caption">{e(C["photos"][image])}</p>'
    hero_text = f'<p class="hero-text">{inline(p["hero_text"])}</p>' if p.get('hero_text') else ''
    if p.get('hero_apply') and C['has_form']:
        label, href = p['hero_apply'].split(' | ')
        hero_text += f'<p class="hero-action"><a class="button" href="{href}">{e(label)}</a></p>'
    preview = '<div class="preview-note">Preview · not yet published</div>' if args.mode == 'preview' else ''
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>{e(full_title)}</title><meta name="description" content="{e(description)}"><meta name="robots" content="{robots}"><meta name="theme-color" content="#1f4a33"><link rel="canonical" href="{canonical}"><link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><link rel="preload" href="/assets/fonts/newsreader-400-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/geist-variable-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/styles.css">
<meta property="og:type" content="website"><meta property="og:site_name" content="{e(C["name"])}"><meta property="og:title" content="{e(full_title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{social}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{e(C["name"])}: {e(C["tagline"])}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(full_title)}"><meta name="twitter:description" content="{e(description)}"><meta name="twitter:image" content="{social}">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script></head>
<body><a class="skip" href="#main">Skip to content</a>{preview}
<header class="hero hero-{p.get("hero", "page")}">{picture(image, "hero-photo", eager=True)}<div class="wrap site-header">{wordmark()}<nav class="desktop-nav" aria-label="Main">{nav_links(path)}</nav><details class="menu"><summary>{MENU_ICON}</summary><nav class="menu-panel" aria-label="Main">{nav_links(path, with_sub=True)}</nav></details></div><div class="wrap hero-copy"><h1>{inline(p["hero_title"])}</h1>{hero_text}</div>{caption}</header>
<main id="main" tabindex="-1">{body}</main>
<footer class="site-footer"><div class="wrap footer-inner">{wordmark()}<p>© {e(C["year"])} {e(C["name"])} · {e(C["place"])} · <span class="footer-links">{" · ".join(f'<a href="{u}">{e(l)}</a>' for l, u in C["footer"])}</span></p></div></footer>
</body></html>
'''


def info(p):
    return page(p, ''.join(section_html(s) for s in render(p['body'], p)))


def redirect(to):
    """A small page for an old address: it moves the visitor on and names the new page for search engines."""
    canonical = C['url'] + to.split('#')[0]
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{e(C["name"])}</title><meta name="robots" content="noindex"><link rel="canonical" href="{canonical}"><meta http-equiv="refresh" content="0; url={to}"></head>
<body><p><a href="{to}">{e(C["name"])}</a></p></body></html>
'''


def social_card():
    """HTML for the 1200x630 link-preview image, rendered by scripts/social.mjs."""
    photo = next(IMG.glob(f'{C["social_photo"]}-1600.jpg'), None)
    bg = f"url('{photo.as_uri()}')" if photo else 'none'
    fonts = (ROOT / 'assets/fonts').as_uri()
    return f'''<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:Newsreader;src:url('{fonts}/newsreader-400-latin.woff2') format('woff2')}}
@font-face{{font-family:Geist;src:url('{fonts}/geist-variable-latin.woff2') format('woff2');font-weight:100 900}}
html,body{{margin:0}}
.card{{position:relative;width:1200px;height:630px;overflow:hidden;background:#1f4a33;color:#fff;font-family:Newsreader,Georgia,serif}}
.card .photo{{position:absolute;inset:0;background:{bg} center/cover;filter:grayscale(1) contrast(1.1)}}
.card .tint{{position:absolute;inset:0;background:#7aab8b;mix-blend-mode:multiply}}
.card .shade{{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,26,16,.72),rgba(8,26,16,.2) 70%)}}
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
    sources = sorted(CONTENT.rglob('*.md'))
    pages = [load(p) for p in sources]
    for p in pages:
        target = ROOT / (p['url'].lstrip('/') if p['url'].endswith('.html') else p['url'].lstrip('/') + 'index.html')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(info(p), encoding='utf-8')
    for old, new in C['redirects'].items():
        target = ROOT / old.lstrip('/') / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(redirect(new), encoding='utf-8')
    urls = sorted(p['url'] for p in pages if not p.get('noindex'))
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{C["url"]}{u}</loc></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\n' + (f'Sitemap: {C["url"]}/sitemap.xml\n' if args.mode == 'production' else '# Preview pages carry noindex.\n'), encoding='utf-8')
    if not args.no_images:
        render_images()
    print(f'Built {len(pages)} pages in {args.mode} mode.')
