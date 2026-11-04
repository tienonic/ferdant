"""Manually project public Census ZIP-area points. Builds never fetch data."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    '2025_Gaz_zcta_national.zip': ('2025 Census ZIP Code Tabulation Area Gazetteer', 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip', '2025-09-10'),
    'zcta-county-2020.txt': ('2020 Census ZCTA-to-county relationships', 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt', '2021-12-09'),
}


def project(folder):
    places = json.loads((ROOT / 'content/california-cities.json').read_text(encoding='utf-8'))
    counties = {name + ' County': key for key, name in places['counties'].items()}
    relations = {}
    with (folder / 'zcta-county-2020.txt').open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream, delimiter='|'):
            code = row['GEOID_ZCTA5_20']
            if not code or not row['GEOID_COUNTY_20'].startswith('06'):
                continue
            area = int(row['AREALAND_PART'])
            if area > 0:
                relations.setdefault(code, []).append((counties[row['NAMELSAD_COUNTY_20']], area))
    with zipfile.ZipFile(folder / '2025_Gaz_zcta_national.zip') as archive:
        rows = csv.DictReader(io.StringIO(archive.read('2025_Gaz_zcta_national.txt').decode('utf-8-sig')), delimiter='|')
        areas = {}
        for row in rows:
            code = row['GEOID']
            if code not in relations:
                continue
            lat, lng = round(float(row['INTPTLAT']), 6), round(float(row['INTPTLONG']), 6)
            # Cross-state areas whose reference point is outside CA retain their
            # Census point; no invented point or postal boundary is substituted.
            related = sorted(relations[code], key=lambda item: (-item[1], item[0]))
            areas[code] = [lat, lng, related[0][0], [item[0] for item in related]]
    assert len(areas) > 1700
    sources = [dict(title=title, url=url, published=published, checked='2026-11-03',
                    bytes=(folder / name).stat().st_size, sha256=hashlib.sha256((folder / name).read_bytes()).hexdigest())
               for name, (title, url, published) in SOURCES.items()]
    data = dict(schema=1, checked='2026-11-03', fields=['latitude', 'longitude', 'primaryCounty', 'counties'],
                note='Census ZIP-area reference points, not addresses or USPS delivery boundaries. Some PO-box, unique and newly assigned ZIP codes have no Census area. Primary county is the largest California land overlap in the 2020 relationship file; ZIP areas can cross counties and states.',
                sources=sources, areas=dict(sorted(areas.items())))
    target = ROOT / 'content/california-zip-areas.json'
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(areas)} California-associated ZIP areas; {target.stat().st_size} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path, required=True)
    project(parser.parse_args().input_dir)
