"""Manual public visit-fact projection. Reads saved receipts; never fetches in a build."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
EDITION = 'visit-facts-20261103'
CHECKED = '2026-11-03'
STOP = {'the','of','and','public','library','branch','clinic','hospital','medical','health','center','centre','community','county','inc','ca'}


def read(p):
    return json.loads(p.read_text(encoding='utf-8'))


def write(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n').encode()
    p.write_bytes(raw)
    return {'path':'/'+p.relative_to(ROOT).as_posix(), 'bytes':len(raw), 'sha256':hashlib.sha256(raw).hexdigest()}


def words(s):
    return set(re.findall(r'[a-z0-9]+', unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()))


def meter(a,b):
    return 111320*math.hypot((a['lng']-b['lng'])*math.cos(math.radians(a['lat'])),a['lat']-b['lat'])


def kind(t):
    a=t.get('amenity',t.get('healthcare'))
    return 'library' if a=='library' else 'hospital' if a=='hospital' else 'clinic' if a in ['clinic','doctors','doctor'] else None


def active(t):
    return t.get('access') not in ['no','private'] and not any(k.startswith(('disused:','abandoned:','construction:')) for k in t) and not any(t.get(k)=='yes' for k in ['disused','abandoned','construction'])


def facts(t):
    result={}
    if t.get('opening_hours'):result['hours']=t['opening_hours']
    if t.get('fee')=='no':result['cost']='No fee mapped; confirm onsite.'
    elif t.get('fee')=='yes':result['cost']='Fee applies; amount not listed.'
    if t.get('charge'):result['cost']='Mapped charge: '+t['charge']+'. Confirm before visiting.'
    amenities=[]
    wheelchair={'yes':'Wheelchair access','limited':'Limited wheelchair access','no':'Wheelchair access not provided'}
    if t.get('wheelchair') in wheelchair:amenities.append(wheelchair[t['wheelchair']])
    internet={'wlan':'Wi-Fi','yes':'Internet access','terminal':'Internet terminal','wired':'Wired internet'}
    if t.get('internet_access') in internet and t.get('internet_access:access') not in ['no','private']:
        amenities.append(internet[t['internet_access']]+(' (fee applies)' if t.get('internet_access:fee')=='yes' else ''))
    for key,label in [('toilets','Toilets'),('drinking_water','Drinking water'),('changing_table','Changing table'),('bottle','Bottle refill')]:
        if t.get(key)=='yes':amenities.append(label)
    if amenities:result['amenities']=amenities
    return result


def project(args):
    config=read(ROOT/'content/resource-map.json')
    # Build only the already-reviewed public baseline, not new OSM locations.
    from physical_services import add_physical_services
    baseline=add_physical_services(config)['facilities']
    for name in ['statewide-service-manifest','everyday-service-manifest']:
        manifest=read(ROOT/('content/'+name+'.json'))
        for ref in manifest['counties'].values():
            for row in read(ROOT/ref['path'].lstrip('/'))['records']:
                baseline.append(dict(zip(manifest['fields'],row)))
    baseline={f['id']:f for f in baseline}
    sources=[read(args.existing_osm),read(args.osm)]
    objects={}
    for source in sources:
        assert not source.get('remark'), 'Partial OSM response'
        for f in source['elements']:
            if active(f.get('tags',{})):objects['osm-'+f['type']+'-'+str(f['id'])]=f
    grid=defaultdict(list)
    for osm_id,f in objects.items():
        c=f.get('center',f);t=f.get('tags',{});k=kind(t)
        if k and t.get('name') and 'lat' in c:
            p={'lng':c['lon'],'lat':c['lat'],'kind':k,'name':t['name'],'address':' '.join(t.get(x,'') for x in ['addr:housenumber','addr:street'])}
            grid[(math.floor(p['lng']*1000),math.floor(p['lat']*1000))].append((osm_id,p))
    records={};counts=Counter();rejected=Counter()
    for target in baseline.values():
        match=None;method='exact OSM object ID'
        if target['id'] in objects:match=objects[target['id']]
        elif target['kind'] in ['library','clinic','hospital']:
            x,y=math.floor(target['lng']*1000),math.floor(target['lat']*1000);candidates=[]
            tw=words(target['name']);core=tw-STOP;address=words(target['address'])
            for dx in range(-2,3):
                for dy in range(-2,3):
                    for osm_id,p in grid[(x+dx,y+dy)]:
                        if p['kind']!=target['kind'] or meter(target,p)>150:continue
                        pw=words(p['name']);pcore=pw-STOP;overlap=len(core&pcore)/max(1,len(core|pcore))
                        exact=tw==pw
                        same_address=bool(address and words(p['address'])==address)
                        if not (exact or (overlap>=.65 and len(core&pcore)>=2) or (same_address and core&pcore)):continue
                        score=(2 if exact else overlap)+(1 if same_address else 0)-meter(target,p)/1000
                        candidates.append((score,osm_id))
            candidates.sort(reverse=True)
            if candidates and (len(candidates)==1 or candidates[0][0]-candidates[1][0]>.12):
                match=objects[candidates[0][1]];method='same service type; name/address agreement; within 150 m'
            elif candidates:rejected['ambiguous nearby matches']+=1
        if not match:continue
        values=facts(match.get('tags',{}))
        if not values:continue
        evidence={'title':'OpenStreetMap contributors (ODbL 1.0) / '+match.get('tags',{}).get('name',target['name']),
                  'url':'https://www.openstreetmap.org/'+match['type']+'/'+str(match['id']),
                  'checked':CHECKED,'published':None,'observed':match.get('timestamp'),
                  'license':'ODbL 1.0','licenseURL':'https://opendatacommons.org/licenses/odbl/1-0/','note':'Community-mapped schedule/details. Edit date is not a service inspection; regular hours are not live availability.'}
        records[target['id']]={'values':values,'evidence':evidence,'match':method}
        counts.update(values.keys());counts['records']+=1
    counts['additionalHours']=sum(1 for key,value in records.items() if value['values'].get('hours') and not baseline[key].get('visit',{}).get('hours'))
    counties={};places=read(ROOT/'content/california-cities.json')
    for county in places['counties']:
        subset={key:value for key,value in records.items() if baseline[key]['county']==county}
        ref=write(ROOT/('assets/data/visit-facts/'+county+'.json'),{'schema':1,'edition':EDITION,'county':county,'records':subset})
        counties[county]={**ref,'count':len(subset)}
    osm_ref=write(ROOT/'assets/data/visit-facts/openstreetmap-projection.json',{'schema':1,'edition':EDITION,'attribution':'\u00a9 OpenStreetMap contributors','license':'https://opendatacommons.org/licenses/odbl/1-0/','records':records})
    receipts=[]
    for path,source in zip([args.existing_osm,args.osm],sources):
        raw=path.read_bytes();receipts.append({'file':path.name,'records':len(source['elements']),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'dataTimestamp':source.get('osm3s',{}).get('timestamp_osm_base'),'url':'https://overpass-api.de/api/interpreter','method':'POST; public saved query; original capture manifest retained'})
    manifest={'schema':1,'edition':EDITION,'checked':CHECKED,'counties':counties,'count':len(records),'fields':dict(counts),'byKind':dict(Counter(baseline[key]['kind'] for key in records)),'rejected':dict(rejected),'inputReceipts':receipts,
              'source':{'title':'OpenStreetMap / listed hours, fees and amenities','url':'https://www.openstreetmap.org/copyright','checked':CHECKED,'published':None,'license':'https://opendatacommons.org/licenses/odbl/1-0/','note':'Matched existing directory locations only. Public derived facts; no live opening, vacancy or emergency activation. OSM source edit timestamps are preserved separately.'},
              'querySHA256':hashlib.sha256(args.query.read_bytes()).hexdigest(),'query':args.query.read_text(encoding='utf-8'),'osmProjection':osm_ref,'matching':'Exact OSM ID, or same service kind within 150m with name/address agreement; ambiguous matches omitted. Original provider facts take priority.'}
    write(ROOT/'content/visit-fact-manifest.json',manifest)
    print(json.dumps({'facts':dict(counts),'rejected':dict(rejected),'baseline':len(baseline)},indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--osm',type=Path,required=True);p.add_argument('--existing-osm',type=Path,required=True);p.add_argument('--query',type=Path,required=True);project(p.parse_args())
