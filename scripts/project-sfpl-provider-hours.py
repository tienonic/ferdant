"""Import a manually reviewed SFPL navigation extract; no fetching or build hook."""
import argparse
from collections import OrderedDict
import hashlib
import json
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
CHECKED='2026-11-03'

def read(p):return json.loads(p.read_text(encoding='utf-8'))
def norm(s):
    aliases={'street':'st','avenue':'ave','boulevard':'blvd','court':'ct','lane':'ln','drive':'dr','road':'rd','third':'3rd'}
    return ' '.join(aliases.get(x,x) for x in re.sub('[^a-z0-9 ]',' ',s.lower()).split())

def project(args):
    rows=read(args.extract)
    match={norm(r['address']):r for r in rows if r.get('address') and r.get('url') and len(r['hours'])==7}
    data=read(ROOT/'content/provider-visit-details.json');manifest=read(ROOT/'content/statewide-service-manifest.json')
    original=read(ROOT/'assets/data/service-maps/38.json')
    # Reviewed spelling alias only; provider name, house number and branch identity agree.
    alias={'imls-CA0114-006':'1 Jose Sarria Court'}
    order=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];result=[]
    for raw in original['records']:
        f=dict(zip(manifest['fields'],raw))
        if f['kind']!='library':continue
        r=match.get(norm(alias.get(f['id'],f['address'])))
        if not r:continue
        days={}
        for day,slot,comment in r['hours']:
            assert day in order and not comment
            parts=re.fullmatch(r'(\d{1,2})\s*-\s*(\d{1,2})',slot);assert parts,(r['name'],slot)
            a,b=map(int,parts.groups())
            # Reviewed provider display uses daytime 12-hour times; reject new patterns.
            assert a in [9,10,11,12,1] and b in [5,6,7,8],(r['name'],slot)
            days[day]=str(a)+('am' if a in [9,10,11] else 'pm')+'-'+str(b)+'pm'
        groups=OrderedDict()
        for day in order:groups.setdefault(days[day],[]).append(day)
        hours='; '.join(', '.join(ds)+' '+time for time,ds in groups.items())
        evidence={'title':'SFPL / '+r['name']+' regular branch hours','url':'https://sfpl.org'+r['url'],'checked':CHECKED,'published':None,'observed':None,
                  'note':'Regular weekly hours from an address-matched provider location. No live open/closed badge or emergency activation imported.',
                  'inputSha256':hashlib.sha256(args.html.read_bytes()).hexdigest(),'inputURL':'https://sfpl.org/locations/western-addition'}
        previous=data['records'].get(f['id'],{})
        previous['values']={**previous.get('values',{}),'hours':hours}
        if any(k!='hours' for k in previous['values']):
            previous.setdefault('evidenceByField',{})['hours']=evidence
        else:previous['evidence']=evidence
        data['records'][f['id']]=previous
        result.append({'id':f['id'],'name':f['name'],'providerName':r['name'],'providerAddress':r['address'],'hours':hours,'source':evidence['url'],'match':'reviewed spelling alias' if f['id'] in alias else 'exact normalized address'})
    assert len(result)==28,len(result)
    policy={'id':'sfpl-print-scan-20260914','ids':[r['id'] for r in result],
            'values':{'cost':'Library card: $2/day print/copy credit; then B&W $0.10/page, color $0.40/page. Scans and U.S. faxes free.','amenities':['Printing and copying','Scanning','U.S. faxing']},
            'evidence':{'title':'SFPL / print, copy, scan and fax policy','url':'https://sfpl.libanswers.com/faq/341987','checked':CHECKED,'published':'2026-09-14','observed':None,'note':'Explicit stationary SFPL branch IDs only. Library card required for daily credit; no bookmobile or emergency operation inferred.'}}
    previous_policy=next((p for p in data.get('policies',[]) if p['id']==policy['id']),{})
    policy['evidence']={**previous_policy.get('evidence',{}),**policy['evidence']}
    data['policies']=[p for p in data.get('policies',[]) if p['id']!=policy['id']]+[policy]
    (ROOT/'content/provider-visit-details.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    args.receipt.write_text(json.dumps({'checked':CHECKED,'matched':result,'inputSha256':hashlib.sha256(args.html.read_bytes()).hexdigest(),'extractSha256':hashlib.sha256(args.extract.read_bytes()).hexdigest(),'source':'https://sfpl.org/locations/western-addition','policySource':policy['evidence']['url']},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Imported',len(result),'exact/reviewed existing SFPL branch schedules; one shared printing/scan/fax policy.')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--extract',type=Path,required=True);p.add_argument('--html',type=Path,required=True);p.add_argument('--receipt',type=Path,required=True);project(p.parse_args())
