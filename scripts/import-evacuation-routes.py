"""Manually refresh reviewed Yolo planning roads. Never runs in a site build."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://gis.yolocounty.gov/ext/rest/services/Public/Evacuation_Planning/MapServer/2'
WHERE = "Evac_Route='Yes'"


def read(url):
    with urlopen(url, timeout=40) as response:
        raw = response.read()
    value = json.loads(raw)
    if value.get('error') or value.get('exceededTransferLimit'):
        raise ValueError('Incomplete county response: ' + str(value.get('error')))
    return value, hashlib.sha256(raw).hexdigest()


def main():
    metadata, metadata_hash = read(SOURCE + '?f=json')
    assert metadata['name'] == 'Evacuation Routes'
    assert metadata['geometryType'] == 'esriGeometryPolyline'
    ids, _ = read(SOURCE + '/query?' + urlencode(dict(f='json', where=WHERE, returnIdsOnly='true')))
    query = SOURCE + '/query?' + urlencode(dict(f='geojson', where=WHERE, outFields='OBJECTID,FULLSTREET,Road_Type,Evac_Route', outSR=4326, returnGeometry='true', orderByFields='OBJECTID', resultRecordCount=2000))
    data, raw_hash = read(query)
    assert data['type'] == 'FeatureCollection'
    assert {f['properties']['OBJECTID'] for f in data['features']} == set(ids['objectIds'])
    missing_geometry = [f['properties']['OBJECTID'] for f in data['features'] if not f.get('geometry')]
    data['features'] = [f for f in data['features'] if f.get('geometry')]
    for feature in data['features']:
        assert feature['properties']['Evac_Route'] == 'Yes'
        assert feature['geometry']['type'] in ('LineString', 'MultiLineString')
        assert set(feature['properties']) <= {'OBJECTID', 'FULLSTREET', 'Road_Type', 'Evac_Route'}
    checked = datetime.now(timezone.utc).date().isoformat()
    data.update(schema=1, county='57', checked=checked, source=SOURCE, kind='planning')
    folder = ROOT / 'assets/data/evacuation-routes'
    folder.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    (folder / '57.json').write_bytes(payload)
    receipt = dict(checked=checked, publisher='Yolo County GIS Cooperative', source=SOURCE, query=query,
                   retrievedUTC=datetime.now(timezone.utc).isoformat(), publisherDate=None,
                   features=len(data['features']), sourceCount=len(ids['objectIds']), missingGeometryIds=missing_geometry, filter=WHERE, metadataSHA256=metadata_hash,
                   responseSHA256=raw_hash, projectionSHA256=hashlib.sha256(payload).hexdigest(),
                   credit=metadata['copyrightText'],
                   limits='County-designated planning roads only. Excludes No and null route flags. No live Status field, closures, direction, address assignment or destination is imported. Publisher edit date was not supplied. Geometry is retained without simplification.')
    (folder / 'manifest.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(features=receipt['features'], bytes=len(payload), checked=checked, sha256=receipt['projectionSHA256'])))


if __name__ == '__main__':
    main()
