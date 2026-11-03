"""Project FEMA NRI v1.20 risk ratings for the site's cities and counties.

Manual import only: raw inputs live outside the repo. Requires shapely; ordinary
site builds only read the resulting JSON and need no geospatial dependency.
City bands are a conservative tract screening, never an official city score.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from shapely.geometry import shape, Polygon
from shapely import make_valid
from shapely.ops import unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
CHECKED = '2026-11-03'
RATINGS = ['Not included', 'Not Applicable', 'No Rating', 'Insufficient Data', 'Very Low', 'Relatively Low', 'Relatively Moderate', 'Relatively High', 'Very High']
HAZARDS = {
    'earthquake': (['ERQK'], 'Earthquake'), 'tsunami': (['TSUN'], 'Tsunami'),
    'flood': (['IFLD'], 'Inland flooding'), 'wildfire': (['WFIR'], 'Wildfire'),
    'heat': (['HWAV'], 'Heat wave'), 'cold': (['CWAV', 'ISTM', 'WNTW'], 'Cold wave, ice storm and winter weather'),
    'storms': (['SWND', 'HAIL', 'LTNG', 'TRND', 'HRCN'], 'Strong wind, hail, lightning, tornado and hurricane'),
    'coastal': (['CFLD'], 'Coastal flooding only; future sea-level rise is not rated'),
    'landslide': (['LNDS'], 'Landslide'), 'drought': (['DRGT'], 'Drought'),
    'dam': ([], 'Dam failure is not included in FEMA NRI'),
    'levee': ([], 'Levee failure is not included in FEMA NRI'),
    'avalanche': (['AVLN'], 'Avalanche'),
    'subsidence': ([], 'Subsidence is not included in FEMA NRI'),
    'volcano': (['VLCN'], 'Volcanic activity'),
}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def clean_geometry(data):
    # Generalization can collapse tiny island rings to one repeated point.
    # They have zero area and must not enter GEOS overlay operations.
    polygons = [data['coordinates']] if data['type']=='Polygon' else data['coordinates']
    parts = []
    for rings in polygons:
        if not rings or len(set(map(tuple,rings[0]))) < 3 or Polygon(rings[0]).area == 0:
            continue
        holes = [r for r in rings[1:] if len(set(map(tuple,r))) >= 3 and Polygon(r).area > 0]
        parts.append(make_valid(Polygon(rings[0],holes),method='linework'))
    return unary_union(parts)


def values(records):
    result = []
    for components, _ in HAZARDS.values():
        ratings = [r.get(c+'_RISKR') for r in records for c in components]
        known = [RATINGS.index(r) for r in ratings if r in RATINGS[4:]]
        if known:
            rating = max(known)
            band = 0 if rating >= 7 else 1 if rating == 6 else 2
        else:
            rating = 0 if not components else 1 if ratings and all(r == 'Not Applicable' for r in ratings) else 3 if any(r == 'Insufficient Data' for r in ratings) else 2
            band = 3
        # Count rated hazard components separately from geographic coverage.
        result.append([band, rating, len(known), len(ratings)])
    return result


def project(folder):
    places = read(ROOT/'content/california-cities.json')
    county_raw = read(folder/'ca-counties.json')
    assert len(county_raw['features']) == 58 and not county_raw.get('exceededTransferLimit')
    counties = {f['attributes']['COUNTY']: f['attributes'] for f in county_raw['features']}
    tracts = [f for p in sorted(folder.glob('ca-tracts-*.json')) for f in read(p)['features']]
    assert len(tracts) == read(folder/'tract-query.json')['count'] == 9106
    assert len({f['properties']['TRACTFIPS'] for f in tracts}) == len(tracts)
    assert {r['NRI_VER'] for r in counties.values()} == {'December 2025'}
    assert {f['properties']['NRI_VER'] for f in tracts} == {'December 2025'}
    groups = {}
    for f in tracts:
        if f.get('geometry'):
            groups.setdefault(f['properties']['STCOFIPS'], []).append((clean_geometry(f['geometry']), f['properties']))
    locations = {}
    for county, name in places['counties'].items():
        record = counties[name]
        locations['county:'+county] = dict(county=county, fips=record['STCOFIPS'], scope='county', values=values([record]))
        rows = groups[record['STCOFIPS']]
        geometries = [r[0] for r in rows]
        tree = STRtree(geometries)
        city_shapes = read(ROOT/f'assets/data/city-maps/{county}.json')['cities']
        for key, gs in city_shapes.items():
            city = unary_union([clean_geometry(g) for g in gs])
            selected = []
            for i in tree.query(city, predicate='intersects'):
                geom, attrs = rows[i]
                area = geom.intersection(city).area
                # Drop tiny slivers caused by generalized, differently sourced
                # boundaries. Either place's 1% threshold includes small cities
                # within a large tract and small urban tracts in a large city.
                if area > 0 and (area >= city.area*.01 or area >= geom.area*.01):
                    selected.append((geom, attrs))
            selected.sort(key=lambda r: r[1]['TRACTFIPS'])
            covered = unary_union([g for g, _ in selected]).intersection(city).area/city.area if selected else 0
            locations[key] = dict(county=county, scope='city-tract-screen', coverage=round(100*covered, 1), tracts=[r['TRACTFIPS'] for _, r in selected], values=values([r for _, r in selected]))
    assert set(locations) == {r[0] for r in places['cities']} | {'county:'+c for c in places['counties']}
    source = dict(title='FEMA National Risk Index v1.20 — December 2025', url='https://www.arcgis.com/home/item.html?id=39485e8035d446a5bff03259508ae355', checked=CHECKED, published='2025-12', note='Relative risk includes expected losses, social vulnerability and community resilience. It is not event probability or a forecast.')
    data = dict(schema=1, checked=CHECKED, release='December 2025 / v1.20', source=source,
                tractSource=dict(title='FEMA National Risk Index Census Tracts', url='https://www.arcgis.com/home/item.html?id=9da4eeb936544335a6db0cd7a8448a51', checked=CHECKED, published='2025-12'),
                bands=[dict(id='high',label='High risk',color='#a63136',fill='#fbecee'),dict(id='moderate',label='Moderate risk',color='#855b0c',fill='#fff3d6'),dict(id='low',label='Low risk',color='#285e85',fill='#eaf3fa'),dict(id='unassessed',label='Not assessed',color='#526170',fill='#eef1f4')],
                hazardIds=list(HAZARDS), components={k:v[0] for k,v in HAZARDS.items()}, scopeNotes={k:v[1] for k,v in HAZARDS.items()},
                ratingLabels=RATINGS, valueFields=['bandIndex','highestSourceRatingIndex','ratedComponents','totalComponents'],
                method='County views use FEMA county ratings. City views use the highest rated overlapping census tract for each hazard component; these are derived screening bands, not official city ratings. Overlap must cover at least 1% of either the city or the tract. Boundaries are generalized. Combined weather plans use the highest available component; unrated components remain unknown. Low is not safe or zero risk; missing and not-applicable ratings are not Low.',
                locations=locations)
    target = ROOT/'content/hazard-risk.json'
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')
    inputs = {p.name:dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(folder.glob('*.json'))}
    manifest = dict(schema=1, checked=CHECKED, release=data['release'], source=source, tractSource=data['tractSource'], countyCount=58, cityCount=483, tractCount=len(tracts), inputReceipts=inputs,
                    geometrySimplificationDegrees=0.0001, tractQuery=read(folder/'tract-query.json'),
                    countyService='https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0',
                    boundaryInputs={str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'content/california-cities.json',*sorted((ROOT/'assets/data/city-maps').glob('*.json'))]},
                    outputSha256=hashlib.sha256(target.read_bytes()).hexdigest(), method=data['method'],
                    limits=['Not a likelihood estimate, current warning or address assessment.','Risk ratings are relative to other US communities for each hazard, not a comparison of absolute losses between hazards.','City screening can include risk in the part of a tract outside the city. A highest-tract band does not describe every neighborhood.','Coastal flooding does not rate future sea-level rise. Dam failure, levee failure and subsidence are not assessed.'])
    (ROOT/'content/hazard-risk-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Locations:',len(locations),'bytes:',target.stat().st_size,'Cities with no matched tract:',sum(not r.get('tracts') for r in locations.values() if r['scope']!='county'))
    print('City tract coverage minimum:',min(r['coverage'] for r in locations.values() if r['scope']!='county'))
    for key in ['57026','38001','19050','county:57']:
        r=locations[key];print(key,dict(zip(HAZARDS,[data['bands'][v[0]]['label'] for v in r['values']])))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--input-dir',type=Path,required=True);project(p.parse_args().input_dir)
