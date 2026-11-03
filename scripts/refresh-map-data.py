"""Manual, bounded public map projection. Never runs during builds or on a schedule.

Inputs are locally downloaded public CDPH CSV, CDSS HTML and Cal OES food-bank
points. Only address-matched food-bank points survive; personal columns do not.
Geometry queries below use the two named government services, with pagination.
"""
import argparse
import csv
import hashlib
import html
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKED = '2026-11-02'
BOUNDARY = 'https://services6.arcgis.com/snwvZ3EmaoXJiugR/arcgis/rest/services/City_and_County_Boundary_Line_Changes/FeatureServer/0'
TSUNAMI = 'https://services2.arcgis.com/zr3KAIbsRSUyARHG/arcgis/rest/services/CA_Tsunami_Hazard_Area/FeatureServer/0'
HEALTH = 'https://data.chhs.ca.gov/dataset/licensed-healthcare-facility-listing'
FOOD = 'https://www.cdss.ca.gov/food-banks'


def digest(b):
    return hashlib.sha256(b).hexdigest()


def normalized(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    replacements = {'st': 'street', 'ave': 'avenue', 'dr': 'drive', 'rd': 'road', 'blvd': 'boulevard', 'n': 'north', 's': 'south', 'e': 'east', 'w': 'west'}
    return ' '.join(replacements.get(w, w) for w in s.split())


def features(base, params):
    result, receipts, offset = [], [], 0
    while True:
        query = {'f': 'geojson', 'outSR': 4326, 'geometryPrecision': 5,
                 'resultRecordCount': 1000, 'resultOffset': offset, **params}
        url = base + '/query?' + urllib.parse.urlencode(query)
        req = urllib.request.Request(url, headers={'User-Agent': 'Ferdant-public-map-review/1.0 (+https://github.com/tienonic/ferdant)'})
        raw = urllib.request.urlopen(req, timeout=50).read()
        data = json.loads(raw)
        if data.get('error'):
            raise ValueError(data['error'])
        receipts.append({'url': url, 'sha256': digest(raw), 'count': len(data['features'])})
        result.extend(data['features'])
        if not data.get('exceededTransferLimit'):
            break
        if not data['features']:
            raise ValueError('Pagination stopped before completion')
        offset += len(data['features'])
    return result, receipts


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--health-csv', type=Path, required=True)
    parser.add_argument('--food-html', type=Path, required=True)
    parser.add_argument('--food-points', type=Path, required=True)
    parser.add_argument('--fetch-geography', action='store_true', required=True)
    args = parser.parse_args()
    places = json.loads((ROOT / 'content/california-cities.json').read_text(encoding='utf-8'))
    county_ids = {v.lower(): k for k, v in places['counties'].items()}
    facilities = []
    raw = args.health_csv.read_bytes()
    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    for r in rows:
        if r['FACILITY_STATUS_DESC'] != 'Open' or not r['ER_SERVICE_LEVEL_DESC'].startswith('Emergency - '):
            continue
        if not r['LATITUDE'] or not r['LONGITUDE']:
            continue
        lat, lng = round(float(r['LATITUDE']), 6), round(float(r['LONGITUDE']), 6)
        if not (32 < lat < 43 and -125 < lng < -114):
            raise ValueError('Out-of-state facility point')
        facilities.append({'id': 'cdph-' + r['OSHPD_ID'], 'name': r['FACILITY_NAME'].title(),
            'kind': 'hospital', 'address': r['DBA_ADDRESS1'].title(), 'city': r['DBA_CITY'].title(),
            'county': r['COUNTY_CODE'].zfill(2), 'lat': lat, 'lng': lng, 'source': 'health',
            'detail': r['ER_SERVICE_LEVEL_DESC'] + '. Licensed status: open in the October 1, 2026 listing. Current capacity and access are not reported.'})
    page = args.food_html.read_text(encoding='utf-8')
    text = html.unescape(re.sub('<[^>]+>', ' ', page))
    text = normalized(text)
    foods = json.loads(args.food_points.read_text(encoding='utf-8'))['features']
    seen = set()
    for f in foods:
        r = f['properties']
        # Exact normalized address plus city must still appear in today's CDSS list.
        if normalized(r['Address']) + ' ' + normalized(r['City']) not in text:
            continue
        xy = tuple(round(x, 6) for x in f['geometry']['coordinates'])
        if xy in seen:
            continue
        seen.add(xy)
        facilities.append({'id': 'food-' + str(len(seen)), 'name': r['Name'], 'kind': 'food',
            'address': r['Address'], 'city': r['City'], 'county': county_ids.get(r['County'].lower()),
            'lat': xy[1], 'lng': xy[0], 'source': 'food',
            'detail': 'Regional food-bank address, not a confirmed walk-up distribution site. Use the CDSS provider link to check pickup locations and eligibility. Approximate point from Cal OES, January 2019; address matched to CDSS on November 2, 2026.'})
    sources = {
        'health': {'title': 'CDPH licensed hospitals with emergency services', 'url': HEALTH,
                   'published': '2026-10-01', 'checked': CHECKED, 'inputSha256': digest(raw),
                   'note': 'Open licensed status is a dated directory attribute, not current operating capacity, emergency entrance or disaster shelter designation.'},
        'food': {'title': 'CDSS food-bank addresses / Cal OES approximate points', 'url': FOOD,
                 'published': None, 'checked': CHECKED, 'addressPageSha256': digest(args.food_html.read_bytes()),
                 'pointSource': 'https://www.arcgis.com/home/item.html?id=89c97ca4f4f34ec1827b1fa6c1700c51',
                 'pointPublished': '2019-01', 'pointInputSha256': digest(args.food_points.read_bytes()),
                 'note': 'Address-matched subset only. CDSS does not publish an update date here. Food-bank offices are not necessarily food distribution sites.'},
        'boundary': {'title': 'CDTFA approximate city taxing boundaries', 'url': 'https://publish.data.ca.gov/dataset/boe-citycounty',
                     'published': '2026-10-29', 'checked': CHECKED,
                     'note': 'Generalized by 0.00035 degrees, about 30–40 metres. Not a legal boundary or evacuation line. County boundaries use the existing Census BAS 2026 projection.'},
        'tsunami': {'title': 'CGS / Cal OES tsunami hazard areas', 'url': 'https://www.conservation.ca.gov/cgs/tsunami/maps',
                    'published': '2022-10-07', 'checked': CHECKED, 'service': TSUNAMI,
                    'note': 'Service data edit date, not the publication date of every county map. Generalized by 0.00005 degrees, about 4–6 metres. Planning areas, not a current warning, route, safe-zone designation or predicted inundation for a particular event.'},
        'shelters': {'title': 'FEMA open shelters', 'url': 'https://gis.fema.gov/arcgis/rest/services/NSS/FEMA_NSS/FeatureServer/0',
                     'checked': CHECKED, 'published': None,
                     'note': 'Queried on demand for the chosen map area. All incidents, not necessarily earthquake-related. Missing or empty data cannot establish that no local shelters exist.'}}
    # Two first-party Davis services; Census points are street-range interpolation,
    # not entrances or building centroids. These addresses were checked separately.
    sources['dcmh-meals'] = {'title': 'Davis Community Meals: meals program', 'url': 'https://daviscommunitymeals.org/meals-program/', 'published': None, 'checked': CHECKED, 'note': 'Provider address and service checked. Publisher date not supplied. Approximate point: US Census Public_AR_Current geocoder, checked November 2, 2026.'}
    sources['dcmh-center'] = {'title': 'Davis Community Meals: resource center', 'url': 'https://daviscommunitymeals.org/resource-center/', 'published': None, 'checked': CHECKED, 'note': 'Provider address and service checked. Publisher date not supplied. Approximate point: US Census Public_AR_Current geocoder, checked November 2, 2026.'}
    facilities.extend([
        {'id':'dcmh-meals', 'name':'Davis Community Meals at St. Martin’s', 'kind':'support', 'address':'640 Hawthorn Lane', 'city':'Davis', 'county':'57', 'lat':38.548673, 'lng':-121.761736, 'source':'dcmh-meals', 'detail':'Free community meals on selected days. Check the provider for times, holiday exceptions and access. Approximate street address, not a verified entrance. Not a designated disaster shelter.'},
        {'id':'dcmh-center', 'name':'Paul’s Place resource center', 'kind':'support', 'address':'1111 H Street', 'city':'Davis', 'county':'57', 'lat':38.554446, 'lng':-121.741362, 'source':'dcmh-center', 'detail':'Daytime help with food, showers, laundry and referrals for unhoused and low-income people. Check current hours with the provider. Approximate street address, not a verified entrance. Not a designated disaster shelter.'}
    ])
    write(ROOT / 'content/resource-map.json', {'schema': 1, 'checked': CHECKED, 'sources': sources,
        'shelterService': sources['shelters']['url'], 'tileUrl': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'facilities': facilities, 'viewBounds': {'38001': [[37.70, -122.53], [37.83, -122.35]]}})
    print('Facilities:', len(facilities), 'hospitals:', sum(f['kind'] == 'hospital' for f in facilities), 'food banks:', len(seen))
    bounds, br = features(BOUNDARY, {'where': "CITY <> 'Unincorporated'", 'outFields': 'CDTFA_ID', 'maxAllowableOffset': 0.00035, 'orderByFields': 'OBJECTID'})
    hazards, tr = features(TSUNAMI, {'where': "Evacuate = 'Yes, Tsunami Hazard Area'", 'outFields': 'County,Label', 'maxAllowableOffset': 0.00005, 'orderByFields': 'OBJECTID'})
    shards = {k: {'schema': 1, 'county': k, 'checked': CHECKED, 'cities': {}, 'tsunami': []} for k in places['counties']}
    valid_cities = {r[0] for r in places['cities']}
    for f in bounds:
        key = f['properties']['CDTFA_ID']
        if key not in valid_cities:
            continue
        shards[key[:2]]['cities'].setdefault(key, []).append(f['geometry'])
    for f in hazards:
        name = f['properties']['County'].replace(' County', '').lower()
        if name not in county_ids:
            raise ValueError('Unknown hazard county: ' + name)
        shards[county_ids[name]]['tsunami'].append(f['geometry'])
    actual = {k for shard in shards.values() for k in shard['cities']}
    if actual != valid_cities:
        raise ValueError('Boundary coverage changed: ' + str(valid_cities ^ actual))
    manifest = {'checked': CHECKED, 'boundaries': br, 'tsunami': tr, 'cityCount': len(actual), 'files': {}}
    for county, shard in shards.items():
        p = ROOT / 'assets/data/city-maps' / (county + '.json')
        write(p, shard)
        manifest['files'][county] = {'bytes': p.stat().st_size, 'sha256': digest(p.read_bytes()), 'cities': len(shard['cities']), 'tsunamiPieces': len(shard['tsunami'])}
    write(ROOT / 'content/map-data-manifest.json', manifest)
    print('County shards:', len(shards), 'city IDs:', len(actual), 'hazard pieces:', len(hazards), 'bytes:', sum(v['bytes'] for v in manifest['files'].values()))


if __name__ == '__main__':
    main()
