"""Manually import FEMA county percentiles and expected annual loss.

Ordinary builds read checked-in JSON only. Use --fetch explicitly to save a new
service receipt outside the repository; rerun without it to project that receipt.
Review the release's FEMA documentation before importing another release.
"""
import argparse
from bisect import bisect_left
from datetime import date
import hashlib
import json
import math
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTATION = 'https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf'
FEDERAL_NOTICE = 'https://www.govinfo.gov/content/pkg/FR-2023-05-26/pdf/2023-11268.pdf'
LABELS = {
    'ERQK': 'Earthquake', 'TSUN': 'Tsunami', 'IFLD': 'Inland flooding',
    'WFIR': 'Wildfire', 'HWAV': 'Heat wave', 'CWAV': 'Cold wave',
    'ISTM': 'Ice storm', 'WNTW': 'Winter weather', 'SWND': 'Strong wind',
    'HAIL': 'Hail', 'LTNG': 'Lightning', 'TRND': 'Tornado', 'HRCN': 'Hurricane',
    'CFLD': 'Coastal flooding', 'LNDS': 'Landslide', 'AVLN': 'Avalanche',
    'VLCN': 'Volcanic activity',
}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def strict_comparison(values, score):
    if score is None or score == -9999:
        return None
    return {'below': bisect_left(values, score), 'assessed': len(values)}


def project(folder, checked, fetch=False):
    date.fromisoformat(checked)
    if folder.resolve().is_relative_to(ROOT):
        raise ValueError("Raw import receipts must stay outside the repository")
    legacy = read(ROOT / 'content/hazard-risk-manifest.json')
    risk = read(ROOT / 'content/hazard-risk.json')
    places = read(ROOT / 'content/california-cities.json')
    components = {key: value for key, value in risk['components'].items() if key != 'drought'}
    prefixes = sorted({item for group in components.values() for item in group})
    fields = ['COUNTY', 'STCOFIPS', 'NRI_VER'] + [p + suffix for p in prefixes for suffix in ['_RISKS', '_EALT']]
    service = legacy['countyService']
    params = {'f': 'json', 'where': "STATEABBRV='CA'", 'outFields': ','.join(fields),
              'returnGeometry': 'false', 'orderByFields': 'STCOFIPS', 'resultRecordCount': 100}
    query = service + '/query?' + urlencode(params)
    national_fields = ['COUNTY', 'STCOFIPS', 'NRI_VER'] + [p + '_RISKS' for p in prefixes]
    national_params = {'f': 'json', 'where': '1=1', 'outFields': ','.join(national_fields),
                       'returnGeometry': 'false', 'orderByFields': 'OBJECTID', 'resultRecordCount': 1000}
    count_params = {'f': 'json', 'where': '1=1', 'returnCountOnly': 'true'}
    if fetch:
        folder.mkdir(parents=True, exist_ok=True)
        for name, url in [('county-query.json', query), ('county-metadata.json', service + '?f=pjson')]:
            with urlopen(url, timeout=60) as response:
                (folder / name).write_bytes(response.read())
        with urlopen(service + '/query?' + urlencode(count_params), timeout=60) as response:
            (folder / 'national-count.json').write_bytes(response.read())
        count = read(folder / 'national-count.json').get('count')
        if not isinstance(count, int) or count < 3000:
            raise ValueError('The national county count query failed')
        pages = []
        for offset in range(0, count, 1000):
            page_params = {**national_params, 'resultOffset': offset}
            url = service + '/query?' + urlencode(page_params)
            name = f'national-query-{offset:04d}.json'
            with urlopen(url, timeout=60) as response:
                (folder / name).write_bytes(response.read())
            pages.append({'file': name, 'url': url, 'params': page_params})
        (folder / 'national-query.json').write_text(json.dumps({'count': count, 'pages': pages}, indent=2) + '\n', encoding='utf-8')
    response = read(folder / 'county-query.json')
    metadata = read(folder / 'county-metadata.json')
    if response.get('error') or response.get('exceededTransferLimit'):
        raise ValueError('The county query failed or was truncated')
    rows = [feature['attributes'] for feature in response.get('features', [])]
    if len(rows) != 58 or len({row['STCOFIPS'] for row in rows}) != 58:
        raise ValueError('Expected exactly 58 distinct California counties')
    expected_release = legacy['release'].split(' / ')[0]
    if {row['NRI_VER'] for row in rows} != {expected_release}:
        raise ValueError('The service release differs from the existing risk data; review it before importing')
    national_query = read(folder / 'national-query.json')
    national_rows = []
    for page in national_query['pages']:
        national_response = read(folder / page['file'])
        if national_response.get('error'):
            raise ValueError('A national county page failed')
        national_rows.extend(feature['attributes'] for feature in national_response.get('features', []))
    national_by_fips = {row['STCOFIPS']: row for row in national_rows}
    if len(national_rows) != national_query['count'] or len(national_by_fips) != national_query['count']:
        raise ValueError('National county pagination is incomplete or contains duplicates')
    if read(folder / 'national-count.json').get('count') != len(national_rows):
        raise ValueError('The national record count does not match the service count receipt')
    if {row['NRI_VER'] for row in national_rows} != {expected_release}:
        raise ValueError('National county data use a different release')
    national_values = {}
    for prefix in prefixes:
        values = [row[prefix + '_RISKS'] for row in national_rows]
        if any(value is not None and value != -9999 and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 100) for value in values):
            raise ValueError('A national hazard score is invalid: ' + prefix)
        national_values[prefix] = sorted(value for value in values if value is not None and value != -9999)
    for row in rows:
        other = national_by_fips.get(row['STCOFIPS'])
        if not other or other['COUNTY'] != row['COUNTY'] or any(row[p + '_RISKS'] != other[p + '_RISKS'] for p in prefixes):
            raise ValueError('California and national score receipts disagree')
    by_name = {row['COUNTY']: row for row in rows}
    if set(by_name) != set(places['counties'].values()):
        raise ValueError('Official county names do not match the existing place index')
    aliases = {field['name']: field['alias'] for field in metadata['fields']}
    for prefix in prefixes:
        if 'Risk Index Score' not in aliases[prefix + '_RISKS'] or 'Expected Annual Loss - Total' not in aliases[prefix + '_EALT']:
            raise ValueError('An imported field has changed meaning')
    counties = {}
    for key, name in places['counties'].items():
        row = by_name[name]
        if not row['STCOFIPS'].startswith('06'):
            raise ValueError('A non-California county was returned')
        for field in fields[3:]:
            value = row[field]
            if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value)):
                raise ValueError('An imported value is not finite: ' + field)
            if field.endswith('_RISKS') and value is not None and value != -9999 and not 0 <= value <= 100:
                raise ValueError('A percentile is outside its documented range')
            if field.endswith('_EALT') and value is not None and value != -9999 and value < 0:
                raise ValueError('An expected annual loss is negative')
        counties[key] = {'county': name, 'fips': row['STCOFIPS'], 'NRI_VER': row['NRI_VER'],
                         **{field: row[field] for field in fields[3:]},
                         'comparison': {prefix: strict_comparison(national_values[prefix], row[prefix + '_RISKS']) for prefix in prefixes}}
    source = {'title': 'FEMA National Risk Index county scores — December 2025 / v1.20',
              'url': legacy['source']['url'], 'checked': checked, 'published': '2025-12'}
    data = {'schema': 1, 'checked': checked, 'release': legacy['release'], 'source': source,
            'components': components, 'componentLabels': {p: LABELS[p] for p in prefixes},
            'counties': counties}
    target = ROOT / 'content/county-risk-scores.json'
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    manifest = {
        'schema': 1, 'checked': checked, 'release': data['release'], 'source': source,
        'countyCount': len(counties), 'countyService': service,
        'query': {'url': service + '/query', 'params': params, 'requestURL': query},
        'fields': {field: aliases[field] for field in fields},
        'inputReceipts': {name: digest(folder / name) for name in ['county-query.json', 'county-metadata.json', 'documentation-review.json', 'fema-notice-20230526.pdf', 'national-score-scope.json', 'national-count.json', 'national-query.json', *[page['file'] for page in national_query['pages']]] if (folder / name).exists()},
        'outputSha256': digest(target)['sha256'],
        'nationalQuery': {'url': service + '/query', 'params': national_params, 'countQuery': count_params,
                          'recordCount': len(national_rows), 'pages': national_query['pages']},
        'nationalAssessedCounts': {prefix: len(values) for prefix, values in national_values.items()},
        'comparisonMethod': 'For each official hazard component, count national county records with a finite nonnegative numeric RISKS score strictly below the selected county score. Exclude equal scores from below; include the selected county and ties in assessed. Exclude missing/null and -9999 scores. Display floor(100 * below / assessed) for a conservative strictly-lower percentage. Keep the original FEMA percentile unchanged and separate.',
        'documentation': [
            {'title': 'FEMA National Risk Index Technical Documentation — December 2025 / v1.20',
             'url': DOCUMENTATION, 'sections': ['3.2, pages 3-2 to 3-3', '5.3.2, page 5-10'],
             'checked': checked, 'published': '2025-12',
             'supports': 'Hazard scores are national percentiles within the same geography level. EAL is average annual economic loss, including population equivalence; dollar values use 2024 prices.',
             'retrieval': 'FEMA PDF download returned HTTP 403. Readable indexed text from this exact official URL confirmed sections 3.2 and 5.3.2; the full PDF was not downloaded.',
             'shortExcerpts': ['Scores represent the national percentile ranking', 'are in units of dollars', 'Population loss is monetized into a population equivalence value']},
            {'title': 'FEMA notice: Community Disaster Resilience Zones and the National Risk Index',
             'url': FEDERAL_NOTICE, 'checked': checked, 'published': '2023-05-26',
             'sections': ['Federal Register page 34172'],
             'supports': 'EAL includes buildings, monetized fatalities and injuries, and agriculture. Hazard-specific and composite risk scores are distinct.',
             'retrieval': 'Official FEMA notice PDF opened and read on govinfo.gov.'},
        ],
        'fieldMeanings': {
            '*_RISKS': 'Official hazard-specific county Risk Index Score: national percentile among counties and county equivalents FEMA scored for that hazard, not every US county, a city score or event probability.',
            '*_EALT': 'Official hazard-specific total Expected Annual Loss: dollars per year on average, including monetized population consequences, not just property or county-budget spending.',
            'NRI_VER': 'Release label returned by every county record; confirmed as December 2025.',
        },
        'method': 'Match official COUNTY names to the existing California county index. Site county keys are not FIPS codes. Preserve raw scores and losses without averaging or city allocation.',
        'combinedPlans': 'For cold or storms, show a named official component and its unchanged score/loss, selected from available component scores. Never present the maximum as a FEMA composite for the combined plan.',
        'limits': [
            'County comparison remains county-level on city and ZIP pages; the existing city hazard bands are a separate tract screening.',
            'Percentiles are relative risk, not a forecast, likelihood, individual loss estimate or an address assessment.',
            'Risk includes vulnerability and resilience; EAL does not apply that adjustment.',
            'Expected annual loss includes monetized fatalities and injuries as well as buildings and agriculture; it is not an annual bill or actual spending.',
            'Missing/null and -9999 values are unavailable, never zero. Dam failure, levee failure and subsidence have no NRI component.',
            'The 100th percentile must not be described as strictly greater than every county; use a percentile label or a conservative lower rounded percentage.',
            'Hazard-specific percentiles compare counties FEMA scored for that hazard; counties with no numeric hazard score are outside that scored comparison. Say assessed US counties, not all US counties.',
            'The scored comparison universe differs by hazard; nationalAssessedCounts records each observed count. Strictly-lower percentages are derived from raw national scores, not from rounding the FEMA percentile. Original FEMA scores are never changed.',
            'Hazard-specific percentiles compare communities for that hazard; they do not rank absolute losses across hazards.',
        ],
    }
    (ROOT / 'content/county-risk-scores-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Imported', len(counties), 'counties;', len(prefixes), 'hazard components;', target.stat().st_size, 'bytes')
    for key in ['57', '19', '08']:
        row = counties[key]
        prefix = 'TSUN' if key == '08' else 'ERQK'
        counts = row['comparison'][prefix]
        print(row['county'], row['fips'], prefix + '_RISKS=', row[prefix + '_RISKS'], 'strict comparison=', counts, 'floor=', 100 * counts['below'] // counts['assessed'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input-dir', type=Path, required=True, help='Raw receipt folder, outside the repository')
    parser.add_argument('--checked', required=True, help='Date this manual review was performed, YYYY-MM-DD')
    parser.add_argument('--fetch', action='store_true', help='Explicitly fetch and save official service inputs')
    args = parser.parse_args()
    project(args.input_dir, args.checked, args.fetch)
