import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from physical_services import add_physical_services


class PhysicalServicesTest(unittest.TestCase):
    def setUp(self):
        self.base = json.loads((ROOT / 'content/resource-map.json').read_text(encoding='utf-8'))
        self.catalog = json.loads((ROOT / 'content/physical-services.json').read_text(encoding='utf-8'))

    def test_only_public_service_visits_are_projected(self):
        point = next(f for f in self.catalog['facilities'] if f.get('lat'))
        for i, changed in enumerate([{'publicVisit':False}, {'confidential':True},
                                     {'locationType':'referral'}, {'mapEligible':False}]):
            record = dict(copy.deepcopy(point), id='must-not-map-'+str(i), **changed)
            self.catalog['facilities'].append(record)
        point['privateNote'] = 'PRIVATE-INPUT-MUST-NOT-SURVIVE'
        result = add_physical_services(self.base, self.catalog)
        self.assertEqual(len(result['facilities']), 338)
        self.assertFalse(any(f['id'].startswith(('food-', 'must-not-map-')) for f in result['facilities']))
        self.assertNotIn('PRIVATE-INPUT-MUST-NOT-SURVIVE', json.dumps(result))

    def test_missing_or_invalid_point_is_rejected(self):
        for coordinates in [{'lat':None}, {'lat':float('nan')}, {'lng':12}]:
            catalog = copy.deepcopy(self.catalog)
            point = next(f for f in catalog['facilities'] if f.get('lat'))
            point.update(coordinates)
            with self.assertRaises(AssertionError):
                add_physical_services(copy.deepcopy(self.base), catalog)

    def test_static_directory_cannot_declare_emergency_activation(self):
        for category in ['cooling','warming','shelter']:
            catalog = copy.deepcopy(self.catalog)
            point = next(f for f in catalog['facilities'] if f.get('lat'))
            point['categories'] = [category]
            with self.assertRaises(AssertionError):
                add_physical_services(copy.deepcopy(self.base), catalog)


if __name__ == '__main__':
    unittest.main()
