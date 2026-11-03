"""Project locally downloaded official public directories; never runs in a build.

Raw IMLS/HRSA inputs stay outside this repository. Only public location fields
survive. This is an inspectable manual import, not a collector or scheduler.
"""
import argparse
import collections
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import re
import urllib.parse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CHECKED = '2026-11-03'
EDITION = 'ca-services-20261103'
IMLS = 'https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip'
HRSA = 'https://gisportal.hrsa.gov/server/rest/services/HealthCareFacilities/PrimaryHealthCareFacilities_FS/MapServer/0'
HRSA_WHERE = "SITE_STATE_ABBR='CA' AND HCC_STATUS_DESC='Active' AND HCC_LOC_DESC='Permanent' AND HCC_LOC_SETTING_DESC='All Other Clinic Types' AND HCC_TYP_DESC IN ('Service Delivery Site','Administrative/Service Delivery Site')"
FIELDS = ['id','name','kind','address','city','county','lat','lng','source','url','aliases']


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def norm(value):
    aliases = {'street':'st','road':'rd','avenue':'ave','boulevard':'blvd','east':'e',
               'west':'w','north':'n','south':'s','lane':'ln','drive':'dr'}
    return ' '.join(aliases.get(x, x) for x in re.sub(r'[^a-z0-9 ]', ' ', value.lower()).split())


def distance(a, b):
    rad = math.pi / 180
    return 12742 * math.asin(min(1, math.sqrt(math.sin((a['lat']-b['lat'])*rad/2)**2
        + math.cos(a['lat']*rad)*math.cos(b['lat']*rad)*math.sin((a['lng']-b['lng'])*rad/2)**2)))


def valid_url(value):
    value = value.strip()
    if value and '://' not in value:
        value = 'https://' + value
    p = urllib.parse.urlsplit(value)
    return value if p.scheme in ('http','https') and p.hostname and '.' in p.hostname and not p.username else ''


def project(input_dir, output):
    places = json.loads((ROOT/'content/california-cities.json').read_text(encoding='utf-8'))
    counties = {name.upper(): key for key,name in places['counties'].items()}
    catalog = json.loads((ROOT/'content/physical-services.json').read_text(encoding='utf-8'))
    manual = [f for f in catalog['facilities'] if f.get('lat') is not None and f.get('mapEligible') is not False]
    records, excluded, receipts, seen = [], collections.Counter(), {}, {}

    def add(record):
        if not (32 <= record['lat'] <= 42.1 and -125 <= record['lng'] <= -114):
            excluded['invalid_coordinate'] += 1
            return
        if record['county'] not in places['counties']:
            excluded['unknown_county'] += 1
            return
        key = (record['kind'], norm(record['address']), norm(record['city']))
        if any(m['kind']==record['kind'] and norm(m['address'])==norm(record['address'])
               and norm(m['city'])==norm(record['city']) for m in manual):
            excluded['newer_provider_record_preferred'] += 1
            return
        if key in seen:
            prior = seen[key]
            if record['name'] != prior['name']:
                prior['aliases'] = sorted(set(prior['aliases'] + [record['name']]))
            excluded['duplicate_service_address'] += 1
            return
        seen[key] = record
        records.append(record)

    raw = (input_dir/'imls-2024.zip').read_bytes()
    z = zipfile.ZipFile(io.BytesIO(raw))
    outlet_file = next(n for n in z.namelist() if 'outlet' in n.lower() and n.endswith('.csv'))
    ae_file = next(n for n in z.namelist() if '_AE_' in n and n.endswith('.csv'))
    systems = {r['FSCSKEY']: r for r in csv.DictReader(io.StringIO(z.read(ae_file).decode('cp1252')))}
    library_rows = list(csv.DictReader(io.StringIO(z.read(outlet_file).decode('cp1252'))))
    receipts['imls'] = {'url':IMLS,'bytes':len(raw),'sha256':digest(raw),'outletFile':outlet_file,
        'outletSha256':digest(z.read(outlet_file)),'fiscalYear':2024,'release':'2026-06',
        'documentation':'https://www.imls.gov/sites/default/files/2026-06/PublicLibrariesSurvey_FiscalYear2024_DataDocumentationandUsersGuide.pdf',
        'documentationPages':[8,59,101]}
    for r in library_rows:
        if r['STABR'] != 'CA':
            continue
        if r['C_OUT_TY'] not in ('BR','CE') or r['STATSTRU'] in ('10','22','23','25'):
            excluded['library_mobile_mail_closed_future_nonrespondent'] += 1
            continue
        if r['GEOMTYPE'] not in ('MANUAL','POINTADDRESS','STREETADDRESS','STREETADDRESSEXT','SUBADDRESS'):
            excluded['library_imprecise_geocode'] += 1
            continue
        # The old permanent branch was destroyed; do not assign its historical
        # building point to the replacement temporary service without a new point.
        if r['LIBNAME'].upper() == 'PALISADES BRANCH' and r['CNTY']=='LOS ANGELES':
            excluded['library_known_permanent_building_closure'] += 1
            continue
        system = systems.get(r['FSCSKEY'], {})
        add(dict(id='imls-'+r['FSCSKEY']+'-'+r['FSCS_SEQ'],name=r['LIBNAME'].title(),
                 kind='library',address=r['ADDRESS'].title(),city=r['CITY'].title(),
                 county=counties.get(r['CNTY'].upper(),''),lat=round(float(r['LATITUDE']),6),
                 lng=round(float(r['LONGITUD']),6),source='imls-library',
                 url=valid_url(system.get('WEB_ADDR','')),aliases=[]))

    receipts['hrsa'] = {'service':HRSA,'where':HRSA_WHERE,'dataEditDate':None,'queries':[],
        'countyNormalization':'Census California odd county FIPS 001..115 -> existing CDTFA alphabetical county IDs 01..58; not the final two FIPS digits.'}
    restricted = re.compile(r'\b(PRISON|JAIL|DETENTION|CORRECTIONAL|JUVENILE|SCHOOL|ELEMENTARY|MOBILE|CONFIDENTIAL|ADMINISTRATIVE|ADMINISTRATION|HEAD START)\b',re.I)
    for path in sorted(input_dir.glob('hrsa-*.json')):
        raw = path.read_bytes()
        page = json.loads(raw)
        offset = int(path.stem.split('-')[-1])
        params = {'f':'geojson','where':HRSA_WHERE,
                  'outFields':'OBJECTID,SITE_SOURCE_ID,SITE_NM,SITE_ADDRESS,SITE_CITY,SITE_STATE_ABBR,STATE_COUNTY_FIPS_CD,SITE_URL',
                  'returnGeometry':'true','outSR':'4326','geometryPrecision':6,
                  'resultOffset':offset,'resultRecordCount':2000}
        receipts['hrsa']['queries'].append({'url':HRSA+'/query?'+urllib.parse.urlencode(params),
            'sha256':digest(raw),'bytes':len(raw),'records':len(page['features'])})
        for f in page['features']:
            p = f['properties']
            if restricted.search(p['SITE_NM']) or not p.get('SITE_ADDRESS') or not f.get('geometry'):
                excluded['clinic_restricted_or_unlocated'] += 1
                continue
            x,y = f['geometry']['coordinates'][:2]
            fips = str(p.get('STATE_COUNTY_FIPS_CD') or '')
            if not re.fullmatch(r'06\d{3}',fips) or int(fips[2:]) not in range(1,116,2):
                excluded['clinic_invalid_county_fips'] += 1
                continue
            add(dict(id='hrsa-'+p['SITE_SOURCE_ID'],name=p['SITE_NM'],kind='clinic',
                     address=p['SITE_ADDRESS'],city=p['SITE_CITY'],county=f'{(int(fips[2:])+1)//2:02d}',
                     lat=round(y,6),lng=round(x,6),source='hrsa-clinic',
                     url=valid_url(p.get('SITE_URL') or ''),aliases=[]))

    sources = {
        'imls-library':{'title':'IMLS FY2024 public library outlets','url':'https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls',
            'published':'2026-06','checked':CHECKED,'note':'FY2024 directory; published June2026. Stationary branches/central libraries only. Annual survey hours are not a current schedule. Individual visitor rules, internet/charging, current operation and emergency use need confirmation.'},
        'hrsa-clinic':{'title':'HRSA permanent community health service sites','url':'https://findahealthcenter.hrsa.gov/',
            'published':None,'checked':CHECKED,'note':'Listed Active permanent service-delivery sites, excluding school/hospital settings, mobile/seasonal/admin-only and restricted-name sites. Active is a directory attribute, not current opening, accepting patients or disaster operation. Publisher-wide data edit date not supplied.'}}
    defaults = {
        'library':{'detail':'Public library directory location. Confirm current branch services and visitor rules; not a designated cooling, warming, charging or evacuation site.',
            'visit':{'hours':None,'eligibility':'Check current visitor, card and computer requirements with the library system.','cost':'Fees and available services vary.','accessibility':None,'activation':'Ordinary library listing; no emergency activation confirmed.','capacity':None}},
        'clinic':{'detail':'Community clinic directory location. Confirm appointments, services and enrollment; not a hospital emergency department or a disaster treatment designation.',
            'visit':{'hours':None,'eligibility':'Ask the provider about appointments, enrollment, department and patient requirements.','cost':'Confirm fees, insurance and assistance with the provider.','accessibility':None,'activation':'Ordinary clinic listing; no disaster operation confirmed.','capacity':None}}}
    output.mkdir(parents=True,exist_ok=True)
    manifest = {'schema':1,'edition':EDITION,'checked':CHECKED,'fields':FIELDS,'sources':sources,
                'defaults':defaults,'excluded':dict(excluded),'inputReceipts':receipts,
                'knownClosureSources':[{'url':'https://www.lapl.org/branches/palisades','checked':CHECKED,
                    'note':'Historical permanent building excluded; temporary service requires its own verified point.'}],
                'count':len(records),'byKind':dict(collections.Counter(r['kind'] for r in records)),
                'counties':{}}
    for county in places['counties']:
        local = [r for r in records if r['county']==county]
        # A county lacking this dataset type gets actual nearby California
        # records, with their original county retained. Never invent a local pin.
        extras = {}
        for kind in ('library','clinic'):
            if any(r['kind']==kind for r in local) or any(r['kind']==kind and r['county']==county for r in manual):
                continue
            nodes = [dict(lat=c[3],lng=c[4]) for c in places['cities'] if c[2]==county]
            if not nodes:
                geometry = next(f['geometry'] for f in places['map']['geometry']['features'] if f['properties']['county']==county)
                coordinates = geometry['coordinates']
                def flatten(a):
                    if isinstance(a[0],(int,float)):yield a
                    else:
                        for b in a:yield from flatten(b)
                points = list(flatten(coordinates));nodes=[dict(lng=sum(p[0] for p in points)/len(points),lat=sum(p[1] for p in points)/len(points))]
            for node in nodes:
                for record in sorted((r for r in records if r['kind']==kind),key=lambda r:distance(node,r))[:3]:
                    extras[record['id']] = record
        county_records = sorted(local+list(extras.values()),key=lambda r:r['id'])
        doc = {'schema':1,'edition':EDITION,'county':county,
               'records':[[r[k] for k in FIELDS] for r in county_records]}
        raw = (json.dumps(doc,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
        (output/(county+'.json')).write_bytes(raw)
        manifest['counties'][county] = {'path':'/assets/data/service-maps/'+county+'.json',
            'count':len(county_records),'localCount':len(local),'regionalFallbackCount':len(extras),
            'byKind':dict(collections.Counter(r['kind'] for r in local)),
            'bytes':len(raw),'sha256':digest(raw)}
    manifest['totalBytes'] = sum(x['bytes'] for x in manifest['counties'].values())
    (ROOT/'content/statewide-service-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ('count','byKind','excluded','totalBytes')},indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input-dir',type=Path,required=True)
    parser.add_argument('--output',type=Path,default=ROOT/'assets/data/service-maps')
    args = parser.parse_args()
    project(args.input_dir,args.output)
