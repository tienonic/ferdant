"""Compile the site's existing references without fetching or refreshing sources."""
import ast
import hashlib
import html
import importlib.util
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
COMPILED = '2026-11-03'
GROUPS = {
    'maps': 'Places, facilities and base maps',
    'providers': 'Library and clinic website links',
    'disasters': 'Disaster plans and hazard layers',
    'contacts': 'Phone numbers, referrals and local alerts',
    'guides': 'Practical guides and public resource links',
    'assets': 'Fonts, icons, map software and licenses',
    'design': 'Design and accessibility references',
    'development': 'Development tools and disabled integrations',
    'links': 'Community, policy and other supporting links',
}
URL = re.compile(r'https?://[^\s<>"\'`\\]+')


def module(name):
    spec = importlib.util.spec_from_file_location('reference_' + name, ROOT / 'content' / (name + '.py'))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def compile_references():
    entries = {}
    inputs = {}

    def read(path):
        data = (ROOT / path).read_bytes()
        inputs[path] = hashlib.sha256(data).hexdigest()
        return json.loads(data)

    def add(url, title, group, use, path, metadata=None):
        url = html.unescape(url).rstrip('.,;):')
        parsed = urlsplit(url)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname:
            return
        if parsed.hostname in ('localhost', '127.0.0.1', 'example.com'):
            return
        if '{b[' in url or url in ('https://www.reddit.com/r/', 'https://www.reddit.com/'):
            return  # Incomplete string fragments; complete community URLs are recorded above.
        # Runtime templates and query receipts remain visible, but are not
        # presented as a verified public landing page.
        key = (group, url)
        entry = entries.setdefault(key, {'title': title, 'url': url, 'category': group,
                                        'uses': [], 'recordedIn': [], 'records': []})
        if use not in entry['uses']:
            entry['uses'].append(use)
        if path not in entry['recordedIn']:
            entry['recordedIn'].append(path)
        if metadata and metadata not in entry['records']:
            entry['records'].append(metadata)

    def source(record, group, use, path, checked=None):
        title = record.get('title', use)
        metadata = {k: v for k, v in record.items() if k not in ('geometry', 'files')}
        if checked and 'checked' not in metadata:
            metadata['checked'] = checked
        for key, value in record.items():
            if isinstance(value, str) and value.startswith(('https://', 'http://')):
                label = title if key in ('url', 'source') else title + ' — ' + key
                add(value, label, group, use, path, metadata)

    regions = read('content/regions.json')
    for key, record in regions['sources'].items():
        source(record, 'contacts', 'Contact registry: ' + key, 'content/regions.json', regions['checked'])
    alerts = read('content/emergency-alerts.json')
    for key, record in alerts['sources'].items():
        source(record, 'contacts', 'Emergency alert directory: ' + key, 'content/emergency-alerts.json')
    for scope in ('counties', 'cities'):
        for key, record in alerts[scope].items():
            source(record, 'contacts', 'Emergency alert signup: ' + scope + '/' + key,
                   'content/emergency-alerts.json')
    resources = read('content/resource-map.json')
    searches = read('content/resource-search.json')
    for key, record in searches['sources'].items():
        source(record, 'maps', 'Additional resource search: ' + key,
               'content/resource-search.json', searches['checked'])
    for key, record in resources['sources'].items():
        source(record, 'maps', 'Resource map: ' + key, 'content/resource-map.json', resources['checked'])
    physical = read('content/physical-services.json')
    for key, record in physical['sources'].items():
        source(record, 'maps', 'Physical service: ' + key, 'content/physical-services.json', physical['checked'])
    statewide = read('content/statewide-service-manifest.json')
    everyday = read('content/everyday-service-manifest.json')
    risk = read('content/hazard-risk.json')
    for key in ('source', 'tractSource'):
        source(risk[key], 'disasters', 'Long-term hazard risk ranking: ' + key,
               'content/hazard-risk.json', risk['checked'])
    for key, record in everyday['sources'].items():
        source(record, 'maps', 'Everyday physical directory: ' + key,
               'content/everyday-service-manifest.json', everyday['checked'])
    for key, record in statewide['sources'].items():
        source(record, 'maps', 'Statewide service directory: ' + key,
               'content/statewide-service-manifest.json', statewide['checked'])
    for path in sorted((ROOT / 'assets/data/service-maps').glob('*.json')):
        relative = path.relative_to(ROOT).as_posix()
        for row in read(relative)['records']:
            record = dict(zip(statewide['fields'], row))
            if record.get('url'):
                add(record['url'], urlsplit(record['url']).netloc, 'providers',
                    record['name'] + ' (' + record['city'] + ')', relative,
                    {'directorySource': record['source'], 'checked': statewide['checked'],
                     'note': 'Website supplied by the source directory; individual provider sites were not all inspected. This is not a verified emergency destination.'})
    add(resources['tileUrl'], 'OpenStreetMap street tile URL template', 'maps',
        'Online street background; tiles are not included in offline downloads.', 'content/resource-map.json')
    places = read('content/california-cities.json')
    for record, use in [(places['source'], 'City and county selector'),
                        (places['locationSource'], 'Approximate city selection points'),
                        (places['map']['source'], 'County overview geometry')]:
        source(record, 'maps', use, 'content/california-cities.json', places['checked'])

    disaster = module('disasters')
    source(disaster.TAXONOMY, 'disasters', 'Taxonomy for all 15 natural-hazard plans', 'content/disasters.py', disaster.CHECKED)
    for plan in disaster.PLANS:
        source({'title': plan['label'] + ' guidance', **plan['guidance'], 'note': plan['note']},
               'disasters', plan['publisherCategory'], 'content/disasters.py')
    for key, layer in disaster.LAYERS.items():
        source(layer, 'disasters', 'Hazard overlay: ' + key, 'content/disasters.py')

    content = module('site')
    directory = module('directory')
    for guide in content.GUIDES:
        for title, url, date in guide['sources']:
            source({'title': title, 'url': url, 'published': date,
                    'checked': guide['sourceChecked'], 'note': guide['scope']},
                   'guides', guide['title'], 'content/site.py')
    for branch, links in directory.LINKS.items():
        for title, url, publisher, date in links:
            source({'title': title, 'url': url, 'publisher': publisher, 'published': date,
                    'checked': directory.CHECKED, 'note': directory.NOTES[branch]},
                   'guides', 'Directory: ' + branch, 'content/directory.py')
    for branch in content.BRANCHES:
        title, url, note = branch['resource']
        source({'title': title, 'url': url, 'note': note}, 'guides', branch['name'], 'content/site.py')
        add('https://www.reddit.com/r/' + branch['name'] + '/', branch['name'], 'links',
            'Community destination; not an authority for emergency guidance.', 'content/site.py')

    landing = ROOT / 'scripts/landing.py'
    if landing.exists():
        for statement in ast.parse(landing.read_text(encoding='utf-8')).body:
            if isinstance(statement, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'CALIFORNIA' for t in statement.targets):
                for title, description, publisher, url, _ in ast.literal_eval(statement.value):
                    source({'title': title, 'url': url, 'publisher': publisher,
                            'checked': '2026-11-03', 'published': None, 'note': description,
                            'dateMeaning': 'The source file records a Listos page timestamp of 2026-10-05T17:11:57+00:00; other publisher dates are not supplied.'
                            if publisher == 'Listos California' else 'Publisher date not supplied in the source file.'},
                           'guides', 'California homepage resource', 'scripts/landing.py')

    if (ROOT / 'assets/vendor/jspdf/README.md').exists():
        source({'title': 'jsPDF 4.2.1', 'url': 'https://github.com/parallax/jsPDF/tree/v4.2.1',
                'license': 'MIT; bundled notice retained in assets/vendor/jspdf/LICENSE',
                'checked': '2026-11-03', 'note': 'Browser PDF library. Attribution follows the bundled README; this catalog does not validate PDF functionality.'},
               'assets', 'Local PDF resource-book generation', 'assets/vendor/jspdf/README.md')

    # Preserve exact download URLs, license records, query receipts and hashes.
    def walk(value, path, group, context=''):
        if isinstance(value, dict):
            title = value.get('title') or value.get('family') or value.get('package') or value.get('host') or context
            metadata = {k: v for k, v in value.items() if not isinstance(v, (dict, list))}
            for key, item in value.items():
                if isinstance(item, str) and item.startswith(('https://', 'http://')):
                    add(item, str(title or Path(path).name) + ' — ' + key, group,
                        context or 'Recorded source or download receipt', path, metadata)
                elif isinstance(item, (dict, list)):
                    walk(item, path, group, context + ' / ' + key)
        elif isinstance(value, list):
            for item in value:
                walk(item, path, group, context)

    for path, group in [('content/map-data-manifest.json', 'maps'),
                        ('content/physical-service-manifest.json', 'maps'),
                        ('content/statewide-service-manifest.json', 'maps'),
                        ('content/everyday-service-manifest.json', 'maps'),
                        ('content/hazard-risk-manifest.json', 'disasters'),
                        ('content/disaster-source-manifest.json', 'disasters'),
                        ('assets/fonts/provenance.json', 'assets'),
                        ('assets/photos/provenance.json', 'assets'),
                        ('assets/favicons/sources.json', 'assets'),
                        ('assets/vendor/leaflet/provenance.json', 'assets'),
                        ('package-lock.json', 'development')]:
        walk(read(path), path, group, Path(path).parent.name)

    # A bounded audit of first-party source and documentation catches references
    # outside the registries. Exclude generated pages, test fixtures and vendored
    # code: those contain duplicate output, fictitious URLs or upstream examples.
    candidates = [ROOT / p for p in ('README.md', 'DESIGN.md', 'styles.css')]
    candidates.extend(ROOT.glob('*.js'))
    for folder in ('content', 'scripts', 'docs', 'integrations', 'config', '.github'):
        candidates.extend(p for p in (ROOT / folder).rglob('*')
                          if p.suffix in ('.py', '.js', '.mjs', '.md', '.json', '.yml'))
    candidates.extend((ROOT / 'assets').rglob('README.md'))
    candidates.extend((ROOT / 'assets').rglob('*LICENSE*'))
    candidates.extend((ROOT / 'assets').rglob('*OFL*'))
    for path in sorted(set(candidates)):
        if path.name == 'references.py' or not path.is_file():
            continue
        relative = path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        inputs[relative] = hashlib.sha256(data).hexdigest()
        group = ('design' if path.name == 'DESIGN.md' else 'assets' if relative.startswith('assets/') else
                 'development' if relative.startswith(('integrations/', '.github/')) else 'links')
        for found in URL.findall(data.decode('utf-8')):
            url = html.unescape(found).rstrip('.,;):')
            existing = [entry for (_, address), entry in entries.items() if address == url]
            if existing:
                for entry in existing:
                    if relative not in entry['recordedIn']:
                        entry['recordedIn'].append(relative)
            else:
                add(url, urlsplit(url).netloc + urlsplit(url).path, group,
                    'Supporting link recorded in ' + relative + '; role follows its original context.', relative)

    # Versioned CI actions are external dependencies even though YAML uses
    # owner/repository@version rather than an HTTPS URL.
    workflow = ROOT / '.github/workflows/check-site.yml'
    for action, version in re.findall(r'uses:\s*([\w-]+/[\w-]+)@([^\s]+)', workflow.read_text()):
        add('https://github.com/' + action + '/tree/' + version, action + ' @ ' + version,
            'development', 'Continuous-integration tooling; not loaded by website visitors.',
            '.github/workflows/check-site.yml')

    result = sorted(entries.values(), key=lambda x: (list(GROUPS).index(x['category']), x['title'], x['url']))
    inputs['scripts/references.py'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    for entry in result:
        entry['recordedIn'].sort()
    return {'schemaVersion': 1, 'compiled': COMPILED,
            'scope': 'References recorded in this Ferdant preview checkout. Compilation is not a new source verification.',
            'limitations': [
                'This catalog describes the website files at build time; separately edited or deployed versions may differ.',
                'Publisher dates, source-check dates, service edit dates and retrieval timestamps retain their original meanings.',
                'Missing provenance remains missing; documentation links are not evidence of current service availability.',
                'Source registries retain some legacy and excluded records. A citation does not mean a facility is shown on the current map.',
                'Test fixtures, generated duplicates and internal vendor examples are excluded from the supporting-link audit.',
                'Census geocoding receipts include unsuccessful candidates; a query is not proof that a point was accepted or mapped.',
            ], 'inputSha256': dict(sorted(inputs.items())), 'references': result}


def render_references(output, correction_links=''):
    catalog = compile_references()
    target = output / 'sources-and-corrections' / 'references.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    escape = lambda value: html.escape(str(value), quote=True)
    groups = {}
    for key, title in GROUPS.items():
        entries = []
        for entry in catalog['references']:
            if entry['category'] != key:
                continue
            template = any(token in entry['url'] for token in ('{', '}', '$'))
            label = escape(entry['title'])
            link = 'URL template; see the exact address below.' if template else f'<a href="{escape(entry["url"])}">Open source</a>'
            detail = ['<details class="reference-disclosure reference-entry"><summary><h4>' + label +
                      '</h4></summary><div class="reference-content"><p>' + link + '</p><p>' +
                      escape('; '.join(entry['uses'])) + '</p>']
            notes = []
            for record in entry['records']:
                for field, label in [('published', 'Publisher/source date'), ('publisherModified', 'Publisher modified'),
                                     ('dateMeaning', 'Date meaning'), ('checked', 'Recorded check'),
                                     ('retrieved', 'Retrieved'), ('downloaded', 'Downloaded'), ('vintage', 'Data vintage'),
                                     ('retrievedUTC', 'Retrieval time (UTC)'), ('matches', 'Geocoder match count'),
                                     ('status', 'Recorded HTTP status'),
                                     ('license', 'License'), ('credit', 'Attribution'), ('note', 'Scope'),
                                     ('review', 'Review limits'), ('verification', 'Verification limits'), ('method', 'Method')]:
                    if field in record:
                        line = label + ': ' + str(record[field] if record[field] is not None else 'not recorded')
                        if line not in notes:
                            notes.append(line)
            if notes:
                detail.append('<ul>' + ''.join('<li>' + escape(note) + '</li>' for note in notes) + '</ul>')
            detail.append('<details class="reference-record"><summary>Repository references and exact URL</summary><p><code>' +
                         escape(entry['url']) + '</code></p><ul>' +
                         ''.join('<li><code>' + escape(path) + '</code></li>' for path in entry['recordedIn']) +
                         '</ul></details></div></details>')
            entries.append((entry, ''.join(detail)))
        # Provider directories contain hundreds of links. Add an alphabetical
        # level so opening this category still presents a small set of choices.
        if key == 'providers':
            buckets = [('A–F', 'abcdef'), ('G–L', 'ghijkl'), ('M–R', 'mnopqr'), ('S–Z & other', '')]
            content = []
            for label, letters in buckets:
                selected = []
                for entry, markup in entries:
                    host = (urlsplit(entry['url']).hostname or '').removeprefix('www.')
                    initial = host[:1].lower()
                    if (initial in letters if letters else initial not in 'abcdefghijklmnopqr'):
                        selected.append(markup)
                if selected:
                    content.append('<details class="reference-disclosure reference-alphabet"><summary>' +
                                   escape(label) + '</summary><div class="reference-children">' +
                                   ''.join(selected) + '</div></details>')
            body = ''.join(content)
        else:
            body = ''.join(markup for _, markup in entries)
        groups[key] = (f'<details class="reference-disclosure reference-category" id="references-{key}">' +
                       f'<summary><h3>{escape(title)}</h3></summary><div class="reference-children">{body}</div></details>')

    parts = ['<link rel="stylesheet" href="/assets/references.css">',
             '<script src="/assets/references.js" defer></script>',
             '<div class="reference-catalog">',
             '<div class="reference-search" hidden><form id="reference-search-form" role="search">'
             '<label for="reference-search">Find a source category</label><div class="city-search-row">'
             '<div class="suggestion-anchor"><input id="reference-search" type="search" role="combobox" '
             'aria-autocomplete="list" aria-expanded="false" aria-controls="reference-suggestions" '
             'placeholder="Start typing, e.g. maps or clinics" autocomplete="off">'
             '<ul id="reference-suggestions" role="listbox" aria-label="Source categories" hidden></ul></div>'
             '<button type="submit" class="button">Search</button></div>'
             '<p id="reference-search-status" role="status"></p></form></div>']
    sections = [
        ('local', 'Local services & maps', ['maps', 'providers', 'contacts']),
        ('guidance', 'Disaster & everyday guidance', ['disasters', 'guides']),
        ('credits', 'Website credits & technology', ['assets', 'design', 'development', 'links']),
    ]
    for key, title, children in sections:
        parts.append(f'<details class="reference-disclosure reference-section" id="reference-section-{key}">' +
                     f'<summary><h2>{escape(title)}</h2></summary><div class="reference-children">' +
                     ''.join(groups[child] for child in children) + '</div></details>')

    parts.append('<details class="reference-disclosure reference-section" id="reference-section-about">'
                 '<summary><h2>About these sources & corrections</h2></summary><div class="reference-children">'
                 '<details class="reference-disclosure reference-topic" id="references-dates"><summary><h3>Dates & how to use sources</h3></summary>'
                 '<div class="reference-content"><p>Compiled November 3, 2026 from the website repository. '
                 'External sources were not rechecked during compilation.</p><p>Publisher dates, source-check dates '
                 'and retrieval dates have different meanings. A recent check does not make an older source newly '
                 'published or establish that a service is open. Missing dates remain explicit.</p>'
                 '<p>These pages provide original practical summaries and tools, not a republished archive of '
                 'community conversations. Calculations state their assumptions. Check the source, location and '
                 'service before relying on a page.</p></div></details>'
                 '<details class="reference-disclosure reference-topic" id="references-limits"><summary><h3>Coverage, licenses & limitations</h3></summary>'
                 '<div class="reference-content"><ul>' + ''.join('<li>' + escape(note) + '</li>'
                 for note in catalog['limitations']) + '</ul><p>Category drawings and tool icons are original site artwork. '
                 'Destination favicons retain their owners’ marks and do not imply endorsement. Leaflet uses BSD-2-Clause; '
                 'the bundled fonts retain their SIL Open Font License notices. Microsoft building extracts retain ODbL attribution. '
                 'Other sources keep their own terms; inclusion does not grant new reuse rights. '
                 'Commerce references describe a disabled integration, not a working store.</p></div></details>'
                 '<details class="reference-disclosure reference-topic" id="references-corrections"><summary><h3>Report a correction</h3></summary>'
                 '<div class="reference-content"><p>Send the page URL, exact statement, reason it may be wrong and a '
                 'supporting public source to the relevant community’s moderator mail. Do not include private '
                 'documents or account access. Reddit may require sign-in. Review timing is not promised.</p><ul>' +
                 correction_links + '</ul><p>Material corrections should record what changed and when.</p></div></details>'
                 '<details class="reference-disclosure reference-topic" id="references-download"><summary><h3>Download all references</h3></summary>'
                 '<div class="reference-content"><p><a href="references.json" download>Download the complete reference file (JSON)</a>.</p>'
                 '<p>Includes source records, exact query and download URLs, file references and recorded hashes.</p>'
                 '</div></details></div></details></div>')
    return ''.join(parts)
