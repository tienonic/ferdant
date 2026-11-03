"""Reviewed physical visits; referrals and unlocated records never become pins."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def add_physical_services(data, catalog=None):
    if catalog is None:
        catalog = json.loads((ROOT / 'content/physical-services.json').read_text(encoding='utf-8'))
    assert catalog['schema'] == 1
    for category in catalog['categories'].values():
        assert category['group'] in catalog['groups']
        assert len(category['color']) == 7 and category['color'].startswith('#')
        int(category['color'][1:], 16)
    selected = []
    for original in data['facilities']:
        # These legacy regional offices were never verified pickup locations.
        # Their provider locator remains in the separate referral directory.
        if original['kind'] == 'food':
            continue
        item = dict(original, publicVisit=True, locationType='service', confidential=False,
                    categories=[original['kind']], servesCounties=[],
                    situations=['everyday', 'earthquake'] if original['kind'] == 'hospital' else ['everyday'])
        item.update(catalog['overrides'].get(item['id'], {}))
        selected.append(item)
    for item in catalog['facilities']:
        if (item.get('publicVisit') is not True or item.get('confidential') is not False
                or item.get('locationType') != 'service' or item.get('mapEligible') is False):
            continue
        assert all(isinstance(item.get(k), (float, int)) and math.isfinite(item[k]) for k in ('lat', 'lng')), item['id']
        assert 32 <= item['lat'] <= 42.1 and -125 <= item['lng'] <= -114, item['id']
        assert item['source'] in catalog['sources'] and item.get('geocoding'), item['id']
        # Activation-dependent sites need a reviewed current feed, not a static
        # directory assertion. FEMA's online loader is separate from this file.
        assert not {'cooling', 'warming', 'shelter'}.intersection(item['categories']), item['id']
        selected.append(item)
    for item in selected:
        assert item['categories'] and all(c in catalog['categories'] for c in item['categories']), item['id']
    assert len({f['id'] for f in selected}) == len(selected)
    public = {'id','name','kind','address','city','county','lat','lng','source','detail',
              'categories','situations','publicVisit','locationType','confidential',
              'servesCounties','visit','geocoding','typeLabel'}
    data['facilities'] = [{k:v for k,v in item.items() if k in public} for item in selected]
    data['sources'].update(catalog['sources'])
    data['serviceTypes'] = catalog['categories']
    data['resourceGroups'] = catalog['groups']
    data['serviceCoverage'] = catalog['coverage']
    data['serviceChecked'] = catalog['checked']
    return data
