"""Manual public Microsoft footprint projection: only buildings containing one
of our 362 public facility points. No nearest-building guess or state-wide dump.
The extracted geometry retains its ODbL source and license. Not run by builds.
"""
import argparse
import hashlib
import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICE = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/MSBFP2/FeatureServer/0'


def in_ring(x, y, ring):
    inside = False
    for a, b in zip(ring, ring[-1:] + ring[:-1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            inside = not inside
    return inside


def contains(g, x, y):
    polygons = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    return any(in_ring(x, y, p[0]) and not any(in_ring(x, y, h) for h in p[1:]) for p in polygons)


def write(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--fetch', action='store_true', required=True)
    p.parse_args()
    config = json.loads((ROOT/'content/resource-map.json').read_text(encoding='utf-8'))
    manifest = json.loads((ROOT/'content/map-data-manifest.json').read_text(encoding='utf-8'))
    facilities = config['facilities']
    geometries, receipts = {}, []
    for offset in range(0, len(facilities), 90):
        points = [[f['lng'], f['lat']] for f in facilities[offset:offset+90]]
        params = {'f':'geojson', 'where':"StateAbbrev='CA'", 'outFields':'OBJECTID',
            'geometry':json.dumps({'points':points,'spatialReference':{'wkid':4326}},separators=(',',':')),
            'geometryType':'esriGeometryMultipoint', 'inSR':4326,'outSR':4326,
            'spatialRel':'esriSpatialRelIntersects','geometryPrecision':7,'resultRecordCount':2000}
        url = SERVICE+'/query'
        req = urllib.request.Request(url, data=urllib.parse.urlencode(params).encode('utf-8'), headers={'User-Agent':'Ferdant-public-map-review/1.0 (+https://github.com/tienonic/ferdant)'})
        raw = urllib.request.urlopen(req,timeout=40).read()
        data = json.loads(raw)
        if data.get('error') or data.get('exceededTransferLimit'):
            raise ValueError(data.get('error','Incomplete footprint response'))
        receipts.append({'url':url,'method':'POST query (read only)','params':params,'sha256':hashlib.sha256(raw).hexdigest(),'features':len(data['features'])})
        for f in data['features']:
            geometries[str(f['properties']['OBJECTID'])] = f['geometry']
    matches = {}
    for facility in facilities:
        candidates = [(key,g) for key,g in geometries.items() if contains(g,facility['lng'],facility['lat'])]
        # Ambiguous overlapping matches remain pins; never select a nearby house.
        if len(candidates) == 1:
            key,g = candidates[0]
            matches[facility['id']] = {'sourceId':key,'geometry':g}
    source = {'title':'Microsoft estimated building footprints, hosted by Esri',
        'url':'https://github.com/microsoft/USBuildingFootprints', 'published':None,
        'checked':'2026-11-02','service':SERVICE,'serviceEdited':'2022-04-13',
        'license':'https://opendatacommons.org/licenses/odbl/1-0/',
        'note':'Computer-generated outlines; source imagery dates are not supplied by this layer. The service data edit date is April 13, 2022. A highlight means the outline contains a directory point; it does not verify the building, entrance, accessibility, structural safety or current service. Unmatched and ambiguous locations keep pins. Extracted geometry is © Microsoft, ODbL 1.0.'}
    config['sources']['buildings'] = source
    write(ROOT/'content/resource-map.json',config)
    matched = 0
    for county,m in manifest['files'].items():
        path = ROOT/'assets/data/city-maps'/(county+'.json')
        shard = json.loads(path.read_text(encoding='utf-8'))
        ids = {f['id'] for f in facilities if f['county']==county}
        shard['buildings'] = {key:value for key,value in matches.items() if key in ids}
        matched += len(shard['buildings'])
        write(path,shard)
        m['bytes']=path.stat().st_size
        m['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
        m['buildingMatches']=len(shard['buildings'])
    manifest['buildings']={'checked':'2026-11-02','queries':receipts,'source':source,
        'matches':matched,'method':'Unique polygon containing a facility point; no nearest-building guess.'}
    write(ROOT/'content/map-data-manifest.json',manifest)
    print('Unique matched outlines:',matched,'of',len(facilities),'public locations')


if __name__=='__main__':
    main()
