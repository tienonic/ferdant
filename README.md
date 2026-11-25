# ferdant.com

The public site of Ferdant, an industrial holding company in Davis, California. GitHub Pages serves the repository root of `main`; `CNAME` and `.nojekyll` keep it on ferdant.com.

The earlier California guides and map site is kept under the tag `guides-site-20261110`.

## Layout

- `content/site.json`: the company name, descriptor, tagline, place, contact, pay, navigation, photo captions and the redirects from old addresses. Every page, title, meta tag, the footer and the link-preview image read these values.
- `content/*.md`: one file per page. A few header lines (title, description, hero text, photo), then `---`, then the body. `## Heading` starts a section and `### Heading` a subheading. `{{name}}` and the other keys in `site.json` are filled in at build time.
- `scripts/build.py`: writes the HTML pages, `sitemap.xml` and `robots.txt` into the repository root, then renders `assets/img/social.png` and the favicons with `scripts/social.mjs`.
- `scripts/check-site.py`: checks that every page exists, has its head tags, links only to files that exist, and contains no banned words or phone numbers.
- `styles.css`: the only stylesheet. There is no JavaScript; the phone menu is a `details` element.
- `assets/img/SOURCES.md`: where each photograph came from and its licence.

## Rename or change the contact

1. Edit `content/site.json` (for a rename, `name`; the wordmark is the name in lower case).
2. Rebuild and check:

```bash
npm ci
python3 scripts/build.py --mode production
python3 scripts/check-site.py
```

`npm ci` installs Playwright, which renders the link-preview image and the favicons. Without it the pages still build and those images keep their last version.

## Preview

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open http://127.0.0.1:4173/.
