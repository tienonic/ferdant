"""Project dated public basic-needs directories into county files; no build-time fetch.

Usage: python scripts/project-everyday-services.py --input-dir <local receipts>
Raw OSM author metadata stays outside the repository. Only a public point projection
is written. The OSM-derived projection is also supplied separately under ODbL.
"""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CHECKED = '2026-11-03'
EDITION = 'ca-everyday-20261103'
FIELDS = ['id', 'name', 'kind', 'address', 'city', 'county', 'lat', 'lng', 'source', 'url', 'detail', 'visit']
SF_URL = 'https://data.sf.gov/City-Infrastructure/San-Francisco-Public-Bathrooms-and-Water-Fountains/wfq4-upmv'
LA_URL = 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Food_Distribution_chp/FeatureServer/0'
OSM_URL = 'https://www.openstreetmap.org/copyright'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def polygons(g):
    return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']


def in_ring(x, y, ring):
    inside = False
    for a, b in zip(ring, ring[-1:] + ring[:-1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            inside = not inside
    return inside


def contains(g, x, y):
    return any(in_ring(x, y, p[0]) and not any(in_ring(x, y, h) for h in p[1:]) for p in polygons(g))


def bounds(g):
    coords = [v for p in polygons(g) for v in p[0]]
    return min(v[0] for v in coords), min(v[1] for v in coords), max(v[0] for v in coords), max(v[1] for v in coords)


def distance(a, b):
    return 111320 * math.hypot((a['lng']-b['lng'])*math.cos(math.radians(a['lat'])), a['lat']-b['lat'])


def project(folder):
    places = read(ROOT/'content/california-cities.json')
    shapes = [(f['properties']['county'], f['geometry'], bounds(f['geometry'])) for f in places['map']['geometry']['features']]
    cities = {row[0]: row[1] for row in places['cities']}
    city_shapes = {county: read(ROOT/f'assets/data/city-maps/{county}.json')['cities'] for county in places['counties']}
    excluded = Counter()
    selected = []

    def locate(lng, lat):
        for county, g, (w, s, e, n) in shapes:
            if w <= lng <= e and s <= lat <= n and contains(g, lng, lat):
                city = next((cities[key] for key, gs in city_shapes[county].items() if any(contains(g, lng, lat) for g in gs)), '')
                return county, city or places['counties'][county] + ' County'
        return None

    def add(item):
        if not (-125 < item['lng'] < -114 and 32 < item['lat'] < 42.1):
            excluded['outside_california_bounds'] += 1
            return
        location = locate(item['lng'], item['lat'])
        if not location:
            excluded['outside_generalized_county_boundary'] += 1
            return
        item['county'], item['city'] = location
        if item['source'] == 'sf-basic-needs' and item['county'] != '38':
            excluded['sf_outside_county'] += 1
            return
        if item['source'] == 'la-food-distribution' and item['county'] != '19':
            excluded['la_outside_county'] += 1
            return
        item['lat'], item['lng'] = round(item['lat'], 6), round(item['lng'], 6)
        selected.append(item)

    for f in read(folder/'sf-water-restrooms.json'):
        if f.get('access') != 'publicly_accessible':
            excluded['sf_restricted_or_unknown_access'] += 1
            continue
        kind = {'drinking_water': 'water', 'restroom': 'restroom'}.get(f.get('resource_type'))
        if not kind or (kind == 'water' and not any(f.get(k) == '1' for k in ('water_fountain', 'bottle_filler', 'jug_filler'))):
            excluded['sf_no_human_water_or_supported_service'] += 1
            continue
        if re.search(r'\b(closed|out of service|not operational|broken)\b', f.get('notes', ''), re.I):
            excluded['sf_closure_note'] += 1
            continue
        hours = ' '.join(f.get(k, '') for k in ('public_access_days', 'public_access_hours_open', 'public_access_hours_close')).strip()
        add(dict(id='sf-basic-'+f['uid'], name=f['name'], kind=kind, address=f.get('address') or 'Mapped point; street address not supplied',
                 lat=float(f['latitude']), lng=float(f['longitude']), source='sf-basic-needs', url=SF_URL,
                 detail='SF public-access directory. Record as of '+f.get('data_as_of', 'not supplied')[:10]+'. Loaded '+f.get('data_loaded_at', 'not supplied')[:10]+'. '+('Drinking fountain or refill point; not an emergency water supply. ' if kind == 'water' else '')+'Current operation is not confirmed.',
                 visit=dict(hours=(hours+' (directory schedule; confirm)') if hours else None, eligibility='Listed publicly accessible. Check onsite access and posted notices.', cost=None, accessibility=None, activation='Everyday facility; no emergency designation.', capacity=None)))

    for f in read(folder/'la-food.json')['features']:
        p = f['properties']; lng, lat = f['geometry']['coordinates']
        # A university distribution can require student enrollment; no general-public pin.
        if re.search(r'\b(college|university|student|school|administration|warehouse)\b', p['food_distrib_name'], re.I):
            excluded['la_restricted_or_warehouse_name'] += 1
            continue
        add(dict(id='la-food-'+str(p['OBJECTID']), name=p['food_distrib_name'], kind='food', address=p['food_distrib_address'], lat=lat, lng=lng,
                 source='la-food-distribution', url=LA_URL,
                 detail='Food distribution/pantry listed by LA County DPH using 211LA data from May 2023. This older listing has not been confirmed with the provider. Check current location, distribution schedule and eligibility before traveling.',
                 visit=dict(hours=None, eligibility='Distribution and enrollment rules need provider confirmation.', cost='Directory covers free or low-cost groceries; confirm with provider.', accessibility=None, activation='Routine food assistance; no disaster activation confirmed.', capacity=None)))

    official = list(selected)
    osm = read(folder/'osm-everyday.json')
    assert not osm.get('remark'), 'Overpass returned a partial result'
    for f in osm['elements']:
        t = f['tags']; amenity = t.get('amenity')
        kind = {'drinking_water': 'water', 'toilets': 'restroom', 'shower': 'shower'}.get(amenity)
        if not kind:
            # Generic food-bank tags may identify warehouses; meal eligibility
            # needs a provider review. Do not turn either into a public pickup pin.
            excluded['osm_food_requires_provider_review'] += 1
            continue
        if t.get('access') not in ('yes', 'permissive') or t.get('fee') == 'yes':
            excluded['osm_access_unconfirmed_restricted_or_paid'] += 1
            continue
        if any(t.get(k) in ('yes', 'no') for k in ('disused', 'abandoned', 'construction')) or t.get('drinking_water') == 'no' or t.get('drinking_water:conditional') or t.get('access:conditional'):
            excluded['osm_inactive_or_conditional'] += 1
            continue
        if any(k.startswith(('disused:', 'abandoned:', 'construction:')) for k in t) or re.search(r'\b(closed|broken|non.?potable|dog water)\b', ' '.join(t.get(k, '') for k in ('name', 'description', 'note')), re.I):
            excluded['osm_inactive_or_unsuitable_note'] += 1
            continue
        c = f.get('center', f)
        item = dict(id='osm-'+f['type']+'-'+str(f['id']), name=t.get('name') or {'water':'Public drinking-water point', 'restroom':'Public restroom', 'shower':'Public shower'}[kind],
                    kind=kind, lat=c['lat'], lng=c['lon'], source='osm-basic-needs', url='https://www.openstreetmap.org/'+f['type']+'/'+str(f['id']))
        if any(x['kind'] == kind and distance(x, item) < 50 for x in official):
            excluded['osm_near_official_same_service'] += 1
            continue
        address=' '.join(t.get(k, '') for k in ('addr:housenumber', 'addr:street')).strip()
        item.update(address=address or 'Mapped point; street address not supplied',
                    detail='Community-mapped '+{'water':'drinking water', 'restroom':'restroom', 'shower':'shower'}[kind]+'. OpenStreetMap edit '+f['timestamp'][:10]+'; edit date is not a service inspection. '+('Not an emergency water supply; follow local water advisories. ' if kind == 'water' else '')+'Location and current operation need confirmation.',
                    visit=dict(hours=(t['opening_hours']+' (OSM schedule notation; confirm)') if t.get('opening_hours') else None, eligibility='Mapped public access'+('; permission can be withdrawn' if t['access'] == 'permissive' else '')+'. Check posted rules.',
                               cost='Mapped without a fee; confirm onsite.' if t.get('fee') == 'no' else None, accessibility=('Wheelchair access mapped: '+t['wheelchair']+'; not independently checked.') if t.get('wheelchair') else None,
                               activation='Everyday facility; no emergency designation.', capacity=None))
        add(item)

    # Duplicate identical provider addresses are collapsed, not nearby distinct facilities.
    unique = {}; duplicates = 0
    for f in selected:
        key = (f['source'], f['kind'], f['name'].casefold(), f['address'].casefold(), f['lat'], f['lng'])
        if key in unique:
            duplicates += 1
        else:
            unique[key] = f
    selected = sorted(unique.values(), key=lambda f: f['id'])
    excluded['identical_duplicate'] = duplicates
    out = ROOT/'assets/data/everyday-maps'; out.mkdir(exist_ok=True)
    def write(path, value):
        data = (json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n').encode('utf-8'); path.write_bytes(data)
        return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    def rows(items):
        return [[f[k] for k in FIELDS] for f in items]
    counties = {}
    for county in places['counties']:
        items = [f for f in selected if f['county'] == county]
        receipt = write(out/(county+'.json'), dict(schema=1, edition=EDITION, county=county, records=rows(items)))
        counties[county] = dict(path='/assets/data/everyday-maps/'+county+'.json', count=len(items), byKind=dict(Counter(f['kind'] for f in items)), **receipt)
    osm_projection = [f for f in selected if f['source'] == 'osm-basic-needs']
    osm_receipt = write(out/'openstreetmap-projection.json', dict(license='https://opendatacommons.org/licenses/odbl/1-0/', attribution='© OpenStreetMap contributors', checked=CHECKED, fields=FIELDS, records=rows(osm_projection)))
    sources = {
        'sf-basic-needs': dict(title='SF public drinking-water and restroom directory', url=SF_URL, checked=CHECKED, note='Publicly accessible human water points and restrooms only. Record dates are separate from November 1, 2026 ingestion; no live operational guarantee.', license='PDDL', evidence='https://www.sfpuc.gov/learning/how-you-can-help/free-drinktap-drinking-water-and-restroom-map'),
        'la-food-distribution': dict(title='LA County DPH food distribution sites (May 2023 data)', url=LA_URL, checked=CHECKED, published='2023-05', note='211LA food-distribution data published in Community Health Profiles. Older directory, not current provider verification. School/university/warehouse-name records excluded.', evidence='https://www.arcgis.com/sharing/rest/content/items/dd4d0483c6104a19ba3217d054848ace?f=json'),
        'osm-basic-needs': dict(title='© OpenStreetMap contributors — everyday public facilities', url=OSM_URL, checked=CHECKED, license='https://opendatacommons.org/licenses/odbl/1-0/', note='ODbL 1.0. Community-mapped, explicitly public/permissive access. No confirmed paid, conditional, private or inactive listings. Edit dates do not verify present operation. Separate downloadable derived database: /assets/data/everyday-maps/openstreetmap-projection.json', evidence='https://wiki.openstreetmap.org/wiki/Tag:amenity=drinking_water')}
    receipts = {name: dict(bytes=(folder/name).stat().st_size, sha256=hashlib.sha256((folder/name).read_bytes()).hexdigest()) for name in ('sf-water-restrooms.json', 'sf-metadata.json', 'la-food.json', 'osm-everyday.json', 'osm-query.txt')}
    for name, url in {
        'sf-water-restrooms.json': 'https://data.sf.gov/resource/wfq4-upmv.json?$limit=5000',
        'sf-metadata.json': 'https://data.sf.gov/api/views/wfq4-upmv.json',
        'la-food.json': LA_URL+'/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultRecordCount=2000',
        'osm-everyday.json': 'https://overpass-api.de/api/interpreter',
    }.items():
        receipts[name]['url'] = url
        receipts[name]['retrieved'] = CHECKED
    receipts['osm-everyday.json']['method'] = 'POST; query preserved in manifest'
    receipts['osm-everyday.json']['dataTimestamp'] = osm.get('osm3s', {}).get('timestamp_osm_base')
    manifest = dict(schema=1, edition=EDITION, checked=CHECKED, fields=FIELDS, defaults={}, sources=sources, counties=counties, count=len(selected), byKind=dict(Counter(f['kind'] for f in selected)), bySource=dict(Counter(f['source'] for f in selected)), excluded=dict(excluded), inputReceipts=receipts, osmProjection= {'path':'/assets/data/everyday-maps/openstreetmap-projection.json', **osm_receipt}, query=(folder/'osm-query.txt').read_text(encoding='utf-8'), coverage='Partial directory coverage, not all providers or current opening. Only actual mapped places; no referral offices inferred as pickup points.')
    (ROOT/'content/everyday-service-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ('count','byKind','bySource','excluded')}, indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--input-dir', type=Path, required=True)
    project(p.parse_args().input_dir)
