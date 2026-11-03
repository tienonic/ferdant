"""Validate editable content and report advisory source-review ages; never rewrite facts."""
import datetime
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('site_content', root / 'content/site.py')
content = importlib.util.module_from_spec(spec)
spec.loader.exec_module(content)
expected = ['KeepUsConnected', 'WhoCanFixThis', 'KeepTheBasicsOn', 'WhatAmIPayingFor', 'PlanForDisruption']
assert [b['name'] for b in content.BRANCHES] == expected, 'The five branch identities must be preserved.'
assert len({g['slug'] for g in content.GUIDES}) == len(content.GUIDES), 'Duplicate guide URL.'
today = datetime.datetime.now(datetime.timezone.utc).date()
report = {'checkedAt': today.isoformat(), 'guides': [], 'sourceReviewNeeded': []}
directory_spec = importlib.util.spec_from_file_location('directory_content', root / 'content/directory.py')
directory = importlib.util.module_from_spec(directory_spec)
directory_spec.loader.exec_module(directory)
assert set(directory.LINKS) == {b['slug'] for b in content.BRANCHES}
directory_checked = datetime.date.fromisoformat(directory.CHECKED)
assert directory_checked <= today
directory_urls = []
for slug, entries in directory.LINKS.items():
    assert slug in directory.NOTES and entries
    for title, url, publisher, published in entries:
        assert title and publisher and urlsplit(url).scheme == 'https'
        assert not urlsplit(url).username and not urlsplit(url).password
        if published:
            normalized = published + '-01' if len(published) == 7 else published
            assert datetime.date.fromisoformat(normalized) <= today
        directory_urls.append(url)
assert len(set(directory_urls)) == len(directory_urls), 'Duplicate directory resource.'
report['directory'] = {'resources': len(directory_urls), 'communities': 5, 'tools': 4, 'sourceChecked': directory.CHECKED}
regional = json.loads((root / 'content/regions.json').read_text(encoding='utf-8'))
regional_date = datetime.date.fromisoformat(regional['checked'])
assert regional_date <= today
assert len({region['slug'] for region in regional['regions']}) == len(regional['regions'])
for region in regional['regions']:
    assert region['name'] and region['scope'] and region['contacts']
    for entry in [*region['contacts'], region['alert']]:
        source = regional['sources'][entry['source']]
        assert urlsplit(source['url']).scheme == 'https' and source['review']
    for contact in region['contacts']:
        assert contact['detail'] and all(phone['label'] and phone['value'].lstrip('+').isdigit() for phone in contact['phones'])
report['offlineRegions'] = {'regions': [region['slug'] for region in regional['regions']], 'sourceChecked': regional['checked']}
if (today - regional_date).days > 90:
    report['sourceReviewNeeded'].append('regional-offline-information')
if (today - directory_checked).days > 90:
    report['sourceReviewNeeded'].append('directory-resources')
for guide in content.GUIDES:
    assert len(guide['quick']) == 4, f"Four concise actions required: {guide['slug']}"
    assert len(guide['intro'].split()) <= 40, 'Lead with a short answer.'
    assert all(len(item.split()) <= 24 for item in guide['quick']), 'Quick actions must stay concise.'
    assert len(guide['sections']) == 4 and len(guide['sources']) >= 1
    checked = datetime.date.fromisoformat(guide['sourceChecked'])
    assert checked <= today, 'A source check cannot be dated in the future.'
    for name, url, date in guide['sources']:
        assert name and date and urlsplit(url).scheme == 'https', 'Sources require a label, HTTPS URL and date note.'
    age = (today - checked).days
    needs_review = age > guide['reviewAfterDays']
    report['guides'].append({'slug': guide['slug'], 'sourceChecked': checked.isoformat(), 'ageDays': age, 'reviewNeeded': needs_review})
    if needs_review:
        report['sourceReviewNeeded'].append(guide['slug'])

commerce = json.loads((root / 'config/commerce.json').read_text(encoding='utf-8'))
assert commerce['enabled'] is False and commerce['checkoutEnabled'] is False, 'Current website release must keep commerce dormant.'
assert not commerce['publicAccessToken'], 'Do not commit a real Storefront token in the template.'
out = root / 'screenshots/content-review.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f"Content checks passed: {len(content.GUIDES)} guides; {len(report['sourceReviewNeeded'])} advisory source reviews due.")
if report['sourceReviewNeeded']:
    print('Review the dated source report before release. No source date or content was changed automatically.')
