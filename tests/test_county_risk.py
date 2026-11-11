"""Check the county statistic's scope, receipt and raw-value contract."""
import hashlib
import importlib.util
import os
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
RECEIPTS = Path(os.environ.get('FERDANT_RISK_INPUT', str(ROOT.parent / 'sources/county-risk-20261110')))
spec = importlib.util.spec_from_file_location('county_risk_import', ROOT / 'scripts/import-county-risk.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class CountyRiskTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'content/county-risk-scores.json').read_text())
        cls.manifest = json.loads((ROOT / 'content/county-risk-scores-manifest.json').read_text())
        cls.places = json.loads((ROOT / 'content/california-cities.json').read_text())
        cls.existing = json.loads((ROOT / 'content/hazard-risk.json').read_text())

    def test_county_ids_match_existing_index_not_fips_suffix(self):
        self.assertEqual(len(self.data['counties']), 58)
        self.assertEqual(set(self.data['counties']), set(self.places['counties']))
        self.assertEqual(len({r['fips'] for r in self.data['counties'].values()}), 58)
        for key, record in self.data['counties'].items():
            self.assertEqual(record['county'], self.places['counties'][key])
            self.assertTrue(record['fips'].startswith('06'))
            self.assertEqual(record['NRI_VER'], 'December 2025')
        self.assertEqual(self.data['counties']['57']['fips'], '06113')
        self.assertEqual(self.data['counties']['19']['fips'], '06037')

    def test_receipt_covers_every_used_field(self):
        data_bytes = (ROOT / 'content/county-risk-scores.json').read_bytes()
        self.assertEqual(hashlib.sha256(data_bytes).hexdigest(), self.manifest['outputSha256'])
        self.assertEqual(self.manifest['query']['params']['where'], "STATEABBRV='CA'")
        self.assertEqual(self.manifest['countyService'], json.loads((ROOT / 'content/hazard-risk-manifest.json').read_text())['countyService'])
        prefixes = set(self.data['componentLabels'])
        self.assertNotIn('DRGT', prefixes)
        self.assertEqual(self.data['components'], {k: v for k, v in self.existing['components'].items() if k != 'drought'})
        for record in self.data['counties'].values():
            for prefix in prefixes:
                score, loss = record[prefix + '_RISKS'], record[prefix + '_EALT']
                self.assertIn(prefix + '_RISKS', self.manifest['fields'])
                self.assertIn(prefix + '_EALT', self.manifest['fields'])
                if score is not None and score != -9999:
                    self.assertGreaterEqual(score, 0)
                    self.assertLessEqual(score, 100)
                if loss is not None and loss != -9999:
                    self.assertGreaterEqual(loss, 0)

    def test_strict_comparison_excludes_ties_and_missing_scores(self):
        self.assertEqual(importer.strict_comparison([0, 25, 25, 25, 100], 25), {'below': 1, 'assessed': 5})
        self.assertEqual(importer.strict_comparison([0, 25, 25, 25, 100], 100), {'below': 4, 'assessed': 5})
        self.assertEqual(importer.strict_comparison([0, 25, 25, 25, 100], 0), {'below': 0, 'assessed': 5})
        self.assertIsNone(importer.strict_comparison([0, 25, 100], None))
        self.assertIsNone(importer.strict_comparison([0, 25, 100], -9999))

    def test_strict_worked_percentages_do_not_round_raw_percentile(self):
        for key, prefix, below, assessed, percentage in [('57', 'ERQK', 3062, 3144, 97), ('19', 'ERQK', 3143, 3144, 99), ('08', 'TSUN', 63, 65, 96), ('02', 'AVLN', 622, 684, 90)]:
            row = self.data['counties'][key]
            self.assertEqual(row['comparison'][prefix], {'below': below, 'assessed': assessed})
            self.assertEqual(100 * below // assessed, percentage)
        self.assertEqual(self.data['counties']['19']['ERQK_RISKS'], 100)
        self.assertGreater(self.data['counties']['08']['TSUN_RISKS'], 98)

    @unittest.skipUnless((RECEIPTS / 'national-query.json').exists(), 'Raw manual-import receipts are outside git; set FERDANT_RISK_INPUT to verify them')
    def test_every_strict_count_against_national_source_receipts(self):
        query = json.loads((RECEIPTS / 'national-query.json').read_text())
        rows = [feature['attributes'] for page in query['pages'] for feature in json.loads((RECEIPTS / page['file']).read_text())['features']]
        self.assertEqual(len(rows), query['count'])
        self.assertEqual(len({row['STCOFIPS'] for row in rows}), len(rows))
        self.assertEqual({row['NRI_VER'] for row in rows}, {'December 2025'})
        for name, expected in self.manifest['inputReceipts'].items():
            raw = (RECEIPTS / name).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), expected['sha256'], name)
            self.assertEqual(len(raw), expected['bytes'], name)
        by_fips = {row['STCOFIPS']: row for row in rows}
        for prefix in self.data['componentLabels']:
            values = [row[prefix + '_RISKS'] for row in rows if row[prefix + '_RISKS'] is not None and row[prefix + '_RISKS'] >= 0]
            self.assertEqual(len(values), self.manifest['nationalAssessedCounts'][prefix])
            for county in self.data['counties'].values():
                score = county[prefix + '_RISKS']
                self.assertEqual(score, by_fips[county['fips']][prefix + '_RISKS'])
                if score is None or score == -9999:
                    self.assertIsNone(county['comparison'][prefix])
                    continue
                below = sum(value < score for value in values)
                self.assertEqual(county['comparison'][prefix], {'below': below, 'assessed': len(values)})
                percentage = 100 * below // len(values)
                self.assertLessEqual(percentage, 100 * below / len(values))
                self.assertGreater(percentage + 1, 100 * below / len(values))

    def test_raw_worked_examples_and_extreme_percentile_survive(self):
        yolo, la = self.data['counties']['57'], self.data['counties']['19']
        self.assertEqual(yolo['ERQK_RISKS'], 97.42366412213741)
        self.assertEqual(yolo['ERQK_EALT'], 42002870.753190205)
        self.assertEqual(la['ERQK_RISKS'], 100)
        self.assertEqual(la['ERQK_EALT'], 4565736367.017469)
        self.assertEqual(self.data['components']['dam'], [])
        self.assertEqual(self.data['components']['levee'], [])
        self.assertEqual(self.data['components']['subsidence'], [])


if __name__ == '__main__':
    unittest.main()
