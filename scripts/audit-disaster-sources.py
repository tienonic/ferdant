"""Manual source-metadata receipt. Does not query facility inventories, import
geometry, advance editorial dates, run during builds, or install a scheduler.
"""
import concurrent.futures
import datetime
import hashlib
import gzip
import importlib.util
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = importlib.util.spec_from_file_location('disasters', ROOT/'content/disasters.py')
    content = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(content)
    urls = sorted({x['service'] for x in content.LAYERS.values()})

    def inspect(url):
        request = urllib.request.Request(url+'?f=json', headers={
            'User-Agent':'Ferdant-public-map-review/1.0 (+https://github.com/tienonic/ferdant)'})
        raw = urllib.request.urlopen(request, timeout=30).read()
        data = json.loads(gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw)
        if data.get('error'):
            raise ValueError(str(data['error']))
        edited = (data.get('editingInfo') or {}).get('dataLastEditDate')
        return {'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
            'name':data.get('name'),'serviceItemId':data.get('serviceItemId'),
            'dataLastEditUTC':datetime.datetime.fromtimestamp(edited/1000,datetime.timezone.utc).isoformat() if edited else None,
            'timeInfo':data.get('timeInfo'),'fields':[f['name'] for f in data.get('fields',[])],
            'capabilities':data.get('capabilities')}

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        receipts = list(pool.map(inspect, urls))
    data = {'schema':1,'checkedLocalDate':content.CHECKED,'timezone':'America/Los_Angeles',
        'retrievedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'planCount':len(content.PLANS),'layerCount':len(content.LAYERS),
        'taxonomy':content.TAXONOMY,'metadata':receipts,
        'notes':['Metadata only; no raw statewide GIS or infrastructure database is published.',
                 'Dates below are service data edit dates, not necessarily publication, effective, observation or forecast dates.',
                 'CGS modified report figures retain the specified credit. New CGS extracts are excluded from offline exports.',
                 'Live forecast and warning validity are checked in the browser; this receipt is not a current warning.']}
    path = ROOT/'content/disaster-source-manifest.json'
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Inspected',len(receipts),'public service metadata endpoints for',len(content.PLANS),'plans.')


if __name__=='__main__':
    main()
