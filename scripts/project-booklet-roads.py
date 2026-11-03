"""Manual Census road projection for printed maps. Never imported by the builder."""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request

from shapely.geometry import box, shape, MultiPolygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union, linemerge
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
SERVICE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer'
EDITION = '2026-11-03-census-2026-roads'
CACHE = Path(os.environ['LOCALAPPDATA']) / 'Coast' / 'FerdantBookletRoads' / EDITION
OUTPUT = ROOT / 'assets/data/booklet-roads'


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    path.write_bytes(raw)
    return {'path': '/' + path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def request(layer, params):
    payload = urllib.parse.urlencode(params).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(SERVICE + '/' + str(layer) + '/query', data=payload,
                                         headers={'User-Agent': 'Ferdant-public-booklet-map/1.0'})
            with urllib.request.urlopen(req, timeout=75) as response:
                result = json.load(response)
            if 'error' in result:
                raise RuntimeError(result['error'])
            return result
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def fetch(label, layer, geometry, geometry_type, allow_fetch):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (label + '.json')
    base = {'where': "NAME IS NOT NULL AND MTFCC='" + {2:'S1100', 6:'S1200', 8:'S1400'}[layer] + "'",
            'geometry': ','.join(map(str,geometry)) if isinstance(geometry,list) else json.dumps(geometry, separators=(',', ':')), 'geometryType': geometry_type,
            'inSR': 4326, 'spatialRel': 'esriSpatialRelIntersects'}
    fingerprint = hashlib.sha256(json.dumps(base, sort_keys=True).encode()).hexdigest()
    if path.exists():
        saved = json.loads(path.read_text())
        if saved.get('queryHash') == fingerprint:
            return saved
    if not allow_fetch:
        raise RuntimeError('Missing source cache; use --fetch for an explicit manual collection: ' + label)
    count = request(layer, {**base, 'returnCountOnly': 'true', 'f': 'json'})['count']
    features = []
    while len(features) < count:
        result = request(layer, {**base, 'outFields': 'OBJECTID,NAME,MTFCC', 'outSR': 4326,
                                  'geometryPrecision': 5, 'maxAllowableOffset': .00003,
                                  'returnGeometry': 'true', 'orderByFields': 'OBJECTID ASC',
                                  'resultOffset': len(features), 'resultRecordCount': 10000, 'f': 'geojson'})
        batch = result.get('features', [])
        if not batch:
            raise RuntimeError('Incomplete road query: ' + label)
        features.extend(batch)
    assert len(features) == count
    assert len({f['id'] for f in features}) == count
    saved = {'layer': layer, 'queryHash': fingerprint, 'count': count, 'features': features}
    path.write_bytes(json.dumps(saved, separators=(',', ':')).encode())
    print('Fetched', label, count, flush=True)
    return saved


def polygon_query(geometry):
    polygons = list(geometry.geoms) if isinstance(geometry, MultiPolygon) else [geometry]
    rings = []
    for p in polygons:
        p = orient(p, sign=-1)
        rings.append(list(p.exterior.coords))
        rings.extend(list(r.coords) for r in p.interiors)
    return {'rings': rings, 'spatialReference': {'wkid': 4326}}


def focus_bounds(geometries, lon=None, lat=None, override=None, padding=.12):
    if override:
        (south, west), (north, east) = override
    else:
        parts = [p for g in geometries for p in (list(g.geoms) if g.geom_type == 'MultiPolygon' else [g])]
        if lon is not None:
            containing = [p for p in parts if p.covers(shape({'type':'Point','coordinates':[lon,lat]}))]
            selected = containing or [max(parts, key=lambda p:p.area)]
        else:
            selected = parts
        west, south, east, north = unary_union(selected).bounds
    dx, dy = max((east-west)*padding, .004), max((north-south)*padding, .003)
    return [round(west-dx, 6), round(south-dy, 6), round(east+dx, 6), round(north+dy, 6)]


def index(features, kind):
    records = []
    for f in features:
        g = shape(f['geometry'])
        if not g.is_empty and g.geom_type in ('LineString', 'MultiLineString'):
            records.append((f['properties']['NAME'], kind, g))
    return records, STRtree([r[2] for r in records])


def project(records, tree, bounds, local_limit=None, tolerance=.00005, clip=None):
    extent = clip if clip is not None else box(*bounds)
    groups = {}
    for idx in tree.query(extent):
        name, kind, geom = records[int(idx)]
        clipped = geom.intersection(extent)
        lines = [clipped] if clipped.geom_type == 'LineString' else list(getattr(clipped, 'geoms', []))
        for line in lines:
            if line.geom_type == 'LineString' and line.length > .00005:
                groups.setdefault((name, kind), []).append(line)
    rows = []
    for (name, kind), parts in groups.items():
        geometry = unary_union(parts)
        if geometry.geom_type != 'LineString':
            geometry = linemerge(geometry)
        length = geometry.length
        geometry = geometry.simplify(tolerance, preserve_topology=False)
        lines = [geometry] if geometry.geom_type == 'LineString' else list(geometry.geoms)
        paths = [[[round(x, 5), round(y, 5)] for x, y in line.coords] for line in lines if len(line.coords) > 1]
        if paths:
            rows.append((length, [name, kind, paths]))
    rows.sort(key=lambda item: (-item[0], item[1][0]))
    if local_limit is not None:
        rows = rows[:local_limit]
    return [row for length, row in rows]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true', help='Explicitly fetch missing public Census inputs')
    args = parser.parse_args()
    places, config = read('content/california-cities.json'), read('content/resource-map.json')
    ca = unary_union([shape(f['geometry']) for f in places['map']['geometry']['features']])
    primary = fetch('california-primary', 2, [-124.6,32.3,-113.9,42.2], 'esriGeometryEnvelope', args.fetch)
    secondary = fetch('california-secondary', 6, [-124.6,32.3,-113.9,42.2], 'esriGeometryEnvelope', args.fetch)
    major_records, major_tree = index(primary['features'], 'primary')
    extra, unused = index(secondary['features'], 'secondary');major_records += extra
    major_tree = STRtree([r[2] for r in major_records])
    state_bounds = focus_bounds([ca], padding=.02)
    state_roads = project(*index(primary['features'], 'primary'), state_bounds, tolerance=.002, clip=ca)
    state_ref = write(OUTPUT / 'california.json', {'schema':1, 'edition':EDITION, 'county':None,
                      'bounds':state_bounds, 'roads':state_roads})

    def county_job(county):
        shard = read('assets/data/city-maps/' + county + '.json')
        rows = [r for r in places['cities'] if r[2] == county]
        selections = {}
        for key, name, code, lat, lon in rows:
            geoms = [shape(g) for g in shard['cities'][key]]
            selections[key] = {'bounds':focus_bounds(geoms, lon, lat, config.get('viewBounds', {}).get(key))}
        local = {'count':0,'features':[],'queryHash':None}
        if selections:
            query = unary_union([box(*entry['bounds']) for entry in selections.values()]).simplify(.0005)
            local = fetch('county-' + county + '-local', 8, polygon_query(query), 'esriGeometryPolygon', args.fetch)
        local_records, local_tree = index(local['features'], 'street')
        for key, entry in selections.items():
            major = project(major_records, major_tree, entry['bounds'])
            streets = project(local_records, local_tree, entry['bounds'], local_limit=30)
            entry['roads'] = major + streets
            assert entry['roads'], 'No actual roads for ' + key
        county_geom = shape(next(f['geometry'] for f in places['map']['geometry']['features'] if f['properties']['county'] == county))
        bounds = focus_bounds([county_geom], padding=.04)
        county_roads = project(major_records, major_tree, bounds, tolerance=.0004)
        assert county_roads, 'No county roads: ' + county
        ref = write(OUTPUT / (county + '.json'), {'schema':1,'edition':EDITION,'county':county,
                     'bounds':bounds,'roads':county_roads,'cities':selections})
        ref.update({'cities':len(rows),'cityRoadNames':sum(len(x['roads']) for x in selections.values()),
                    'countyRoadNames':len(county_roads),'sourceLocalRecords':local['count'],
                    'sourceQuerySHA256':local['queryHash']})
        print('Projected', county, len(rows), 'cities,', ref['bytes'], 'bytes', flush=True)
        return county, ref

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        counties = dict(pool.map(county_job, sorted(places['counties'])))
    manifest = {'schema':1,'edition':EDITION,'checked':'2026-11-03','published':'2026-01-01',
                'publisher':'U.S. Census Bureau','source':SERVICE,
                'note':'Primary/secondary roads plus selected longest named local streets. Layer descriptions date geography January 1, 2026. Generalized orientation map, not directions, road-open status or evacuation designation.',
                'fields':['name','kind','paths'], 'state':state_ref, 'counties':dict(sorted(counties.items())),
                'sourceRecords':{'primary':primary['count'],'secondary':secondary['count']},
                'geometrySource':'content/california-cities.json and existing city-map county shards',
                'citySelection':'All primary/secondary roads in the map frame and up to 30 longest clipped named local street groups; original road names retained. No invented line joins.'}
    assert sum(ref['cities'] for ref in counties.values()) == 483
    write(ROOT / 'content/booklet-road-manifest.json', manifest)
    print('Complete:', sum(ref['bytes'] for ref in counties.values()) + state_ref['bytes'], 'projected bytes', flush=True)


if __name__ == '__main__':
    main()
