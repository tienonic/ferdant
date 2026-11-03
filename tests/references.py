"""Verify the compiled catalog against the site's authoritative source registries."""
import hashlib
import json
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from references import compile_references, module


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])
        if 'id' in attrs:
            self.ids.append(attrs['id'])


class References(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / 'sources-and-corrections/references.json').read_text(encoding='utf-8'))
        cls.urls = {r['url'] for r in cls.catalog['references']}
        cls.page = Links()
        cls.page.feed((ROOT / 'sources-and-corrections/index.html').read_text(encoding='utf-8'))

    def test_catalog_is_current_and_deterministic(self):
        self.assertEqual(self.catalog, compile_references())

    def test_every_disaster_guidance_and_service_is_referenced(self):
        data = module('disasters')
        self.assertEqual(len(data.PLANS), 15)
        for plan in data.PLANS:
            self.assertIn(plan['guidance']['url'], self.urls)
        for layer in data.LAYERS.values():
            self.assertIn(layer['service'], self.urls)
            self.assertIn(layer['source'], self.urls)
        self.assertIn(data.TAXONOMY['url'], self.urls)

    def test_all_facility_contact_and_guide_sources_are_referenced(self):
        for name in ('regions', 'resource-map', 'physical-services', 'statewide-service-manifest', 'everyday-service-manifest'):
            data = json.loads((ROOT / 'content' / (name + '.json')).read_text(encoding='utf-8'))
            for source in data['sources'].values():
                self.assertIn(source['url'], self.urls)
        for guide in module('site').GUIDES:
            for _, url, _ in guide['sources']:
                self.assertIn(url, self.urls)

    def test_licenses_downloads_and_versions_are_referenced(self):
        for path in ('assets/fonts/provenance.json', 'assets/favicons/sources.json',
                     'assets/vendor/leaflet/provenance.json'):
            data = json.loads((ROOT / path).read_text())
            for item in data if isinstance(data, list) else data['files']:
                self.assertIn(item.get('url', item.get('source')), self.urls)
        self.assertTrue(any(r['category'] == 'development' and '@playwright/test' in r['url']
                            for r in self.catalog['references']))

    def test_page_links_and_provenance(self):
        self.assertEqual(len(self.page.ids), len(set(self.page.ids)))
        for entry in self.catalog['references']:
            if not any(token in entry['url'] for token in ('{', '}', '$')):
                self.assertIn(entry['url'], self.page.links)
            for path in entry['recordedIn']:
                self.assertTrue((ROOT / path).is_file(), path)
        for link in self.page.links:
            if link.startswith('#'):
                self.assertIn(link[1:], self.page.ids)
        self.assertIn('references.json', self.page.links)
        for path, expected in self.catalog['inputSha256'].items():
            self.assertEqual(hashlib.sha256((ROOT / path).read_bytes()).hexdigest(), expected, path)
        self.assertFalse(any('127.0.0.1' in u or 'example.com' in u or '{b[' in u for u in self.urls))


if __name__ == '__main__':
    unittest.main()
