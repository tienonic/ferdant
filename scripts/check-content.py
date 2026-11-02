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
