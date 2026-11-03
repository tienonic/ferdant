"""Manually refresh public county alert pointers. Never called by builds or a scheduler."""
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
STATE = 'https://calalerts.org/signup.html'
DIRECTORY = 'https://211ca.org/find-your-local-211/'


def stable_url(url):
    # Public directories sometimes contain generated authentication redirects.
    # Never preserve their state, return URL, tokens or code challenges.
    decoded = unquote(unquote(url)).lower()
    return not any(word in decoded for word in ('returnurl=', 'state=', 'code_challenge=', 'token=', 'session='))


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.headings = [], []
        self.link = None
        self.heading = None
        self.county = None

    def handle_starttag(self, tag, attrs):
        if tag in ('h2', 'h3', 'h4'):
            self.heading = ''
        if tag == 'a':
            self.link = [dict(attrs).get('href', ''), '', self.county]

    def handle_data(self, data):
        if self.link is not None:
            self.link[1] += data
        if self.heading is not None:
            self.heading += data

    def handle_endtag(self, tag):
        if tag == 'a' and self.link is not None:
            self.links.append(self.link)
            self.link = None
        if tag in ('h2', 'h3', 'h4') and self.heading is not None:
            label = self.heading.strip()
            if tag == 'h4' and label.endswith(' County'):
                self.county = label[:-7]
            self.headings.append(label)
            self.heading = None


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'Ferdant source review (public links; no enrollment)'}), timeout=15) as response:
        return response.read(), response.url


def target_check(item):
    key, record = item
    try:
        with urlopen(Request(record['url'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=10) as response:
            # Read a bounded prefix only. No account state or response body is saved.
            prefix = response.read(131072).decode('utf-8', errors='replace')
            title = re.search(r'<title[^>]*>(.*?)</title>', prefix, re.I | re.S)
            return key, {'http': response.status, 'finalUrl': response.url if stable_url(response.url) else None,
                         'pageTitle': re.sub(r'\s+', ' ', title[1]).strip() if title else None,
                         'meaning': 'HTTP response only; registration and delivery not tested'}
    except HTTPError as error:
        return key, {'http': error.code, 'meaning': 'Target not accessible in automated check; association comes from the recorded directory or local source'}
    except Exception as error:
        return key, {'http': None, 'meaning': 'Target check unavailable: ' + type(error).__name__}


def main():
    checked = datetime.now(timezone.utc).date().isoformat()
    places = json.loads((ROOT / 'content/california-cities.json').read_text(encoding='utf-8'))
    sources, parsers = {}, {}
    for key, url in [('caloes', STATE), ('211ca', DIRECTORY)]:
        raw, final = fetch(url)
        parser = Links()
        parser.feed(raw.decode('utf-8', errors='replace'))
        parsers[key] = parser
        sources[key] = {'url': url, 'finalUrl': final, 'sha256': hashlib.sha256(raw).hexdigest(),
                        'checked': checked, 'published': None,
                        'review': 'County-to-alert link associations read from public directory; enrollment not tested'}
    official = {label.strip(): urljoin(STATE, url) for url, label, _ in parsers['caloes'].links
                if label.strip() in places['counties'].values()}
    referrals = {county: urljoin(DIRECTORY, url) for url, label, county in parsers['211ca'].links
                 if 'Emergency Alert Sign-up' in label and county}
    assert set(official) == set(places['counties'].values()), 'State directory coverage changed; inspect before importing'
    assert len(referrals) == 58, '211 directory coverage changed; inspect before importing'
    counties = {key: {'county': name, 'url': official[name] if stable_url(official[name]) else referrals[name], 'source': 'caloes' if stable_url(official[name]) else '211ca',
                      'directory211Url': referrals[name], 'checked': checked}
                for key, name in places['counties'].items()}
    overrides = json.loads((ROOT / 'content/emergency-alert-overrides.json').read_text(encoding='utf-8'))
    for key, override in overrides['counties'].items():
        record = counties[key]
        if stable_url(official[record['county']]):
            record['stateDirectoryUrl'] = official[record['county']]
        else:
            record['stateDirectoryNote'] = 'State directory authentication redirect omitted; stable county page used instead.'
        record.update(override)
    assert all(urlsplit(row['url']).scheme == 'https' for row in counties.values())
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        checks = dict(pool.map(target_check, counties.items()))
    for key, check in checks.items():
        counties[key]['targetCheck'] = check
    result = {'checked': checked, 'sources': sources, 'counties': counties, 'cities': overrides['cities'],
              'scope': 'County destinations listed by Cal OES. Cities inherit the county in the existing place index; city participation and address coverage must be confirmed with the provider.',
              'limits': 'No signup, account, notification delivery, accessibility certification or current operational availability is verified.'}
    (ROOT / 'content/emergency-alerts.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'counties': len(counties), 'checked': checked,
                      'http2xx': sum(200 <= (r['http'] or 0) < 300 for r in checks.values()),
                      'reviewOtherTargets': {counties[k]['county']: r for k, r in checks.items() if not 200 <= (r['http'] or 0) < 300}}, indent=2))


if __name__ == '__main__':
    main()
