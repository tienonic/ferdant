"""Central resource searches, separate from physical map records."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def resource_search():
    catalog = json.loads((ROOT / 'content/resource-search.json').read_text(encoding='utf-8'))
    groups = []
    for group in catalog['groups']:
        links = []
        for key in group['sources']:
            source = catalog['sources'][key]
            links.append(f'<li><a href="{escape(source["url"], quote=True)}">{escape(source["title"])}</a>'
                         f'<p>{escape(source["description"])}</p></li>')
        groups.append(f'<details class="resource-search-group" id="resource-search-{group["id"]}">'
                      f'<summary>{escape(group["title"])}</summary><ul>{"".join(links)}</ul></details>')
    return ('<details class="atlas-referrals" id="resource-search"><summary>More services &amp; referrals</summary>'
            '<p id="resource-search-location">Choose a directory below, then enter your city, county or ZIP code on that website.</p>'
            '<p>These searches cover services beyond the places on this map. Confirm hours, eligibility and intake before visiting. '
            'Phone resources stay in the separate phone section. Online searches need an internet connection.</p>'
            + ''.join(groups) + '<p class="resource-search-credit">Directory links reviewed November 3, 2026; '
            'individual results are not checked here. <a href="/sources-and-corrections/#references-maps">Sources &amp; coverage</a>.</p></details>')
