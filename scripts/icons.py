"""Original inline line icons. Text labels carry the accessible names."""

GLYPHS = {
 'wifi': '<path d="M3 8.5a14 14 0 0 1 18 0M6 12a9.5 9.5 0 0 1 12 0M9 15.5a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="19" r=".8"/>',
 'wrench': '<path d="M14 4a6 6 0 0 0-7.5 7.5L3 15a3 3 0 0 0 4 4l3.5-3.5A6 6 0 0 0 18 8l-4 4-3-3 4-4Z"/>',
 'bolt': '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
 'receipt': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
 'shield': '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z M8 12l3 3 5-6"/>',
 'tools': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v3h4v-3"/>',
 'map': '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/>',
 'chat': '<path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z M7 9h8M7 13h5"/>',
 'book': '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15"/>',
 'home': '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
 'drop': '<path d="M12 2c-3 5-7 9-7 13a7 7 0 0 0 14 0c0-4-4-8-7-13ZM8 15a4 4 0 0 0 4 4"/>',
 'repeat': '<path d="m17 2 4 4-4 4M21 6H7a4 4 0 0 0-4 4M7 22l-4-4 4-4M3 18h14a4 4 0 0 0 4-4"/>',
 'checklist': '<rect x="5" y="4" width="15" height="17" rx="2"/><path d="m3 9 2 2 3-4m-5 9 2 2 3-4M11 9h5M11 16h5M9 4V2h7v2"/>',
 'help': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m6 6 3 3m6 6 3 3M6 18l3-3m6-6 3-3"/>',
 'building': '<path d="m3 8 9-5 9 5H3ZM5 10v8m7-8v8m7-8v8M3 21h18"/>',
 'users': '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
 'calculator': '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h1m3 0h1m3 0h.1M8 14h1m3 0h1m3 0h.1M8 18h1m3 0h1m3 0h.1"/>',
 'pen': '<path d="m15 4 5 5-11 11-6 1 1-6L15 4Zm0 0 2-2 5 5-2 2M4 15l5 5"/>',
 'search': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 'close': '<path d="m6 6 12 12M6 18 18 6"/>',
 'external': '<path d="M14 3h7v7m0-7L10 14M10 5H4v15h15v-6"/>',
 'expand': '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
 'down': '<path d="M12 3v17m-6-6 6 6 6-6"/>',
 'download': '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 'phone': '<path d="m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3v3c-8 3-20-9-17-17h3Z"/>',
 'chevron': '<path d="m6 9 6 6 6-6"/>',
 'right': '<path d="M3 12h17m-6-6 6 6-6 6"/>',
 'copy': '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 'check': '<path d="m4 12 5 5L20 6"/>',
 'reset': '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
 'earthquake': '<path d="m3 10 9-7 9 7M5 9v10h5l-2-4 5-3-1 5 3 4h4V9M3 22h5m8 0h5"/>',
 'tsunami': '<path d="M3 19c3-2 4 2 7 0s4 2 7 0 3 0 4 1M3 15c7 1 5-10 12-10a6 6 0 0 1 6 6c-3-3-7-1-7 2 0 2 2 3 4 2"/>',
 'flood': '<path d="m5 10 7-6 7 6M7 9v6m10-6v6M3 16c3-2 3 2 6 0s3 2 6 0 3 2 6 0M3 21c3-2 3 2 6 0s3 2 6 0 3 2 6 0"/>',
 'wildfire': '<path d="M13 2c1 5-5 6-3 10 2 0 4-2 4-4 3 3 6 5 6 8a8 8 0 0 1-16 0c0-4 3-6 4-7-1 4 1 5 2 5"/><path d="M12 15c-2 2-3 3-3 4a3 3 0 0 0 6 0c0-1-1-2-3-4Z"/>',
 'heat': '<path d="M8 5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0V5ZM10 9v9M17 2v2m5 3-2 1m2 6-2-1"/><path d="M16 7a4 4 0 0 1 0 8"/>',
 'cold': '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m13 9-4 1 1 4M4 14l4 1-1 4m13-9-4-1 1-4"/>',
 'storms': '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>',
 'coastal': '<path d="M3 18c3-2 3 2 6 0s3 2 6 0 3 2 6 0M3 22c3-2 3 2 6 0s3 2 6 0 3 2 6 0M5 13V3m-3 3 3-3 3 3M11 13l4-4 6 4M15 9V5"/>',
 'landslide': '<path d="M3 3h5l4 9 9 9H3M5 7l2 4-2 3M15 3l3 1 1 3-3 1-2-2 1-3ZM18 12l3 1-1 3-3-1 1-3Z"/>',
 'drought': '<circle cx="18" cy="6" r="3"/><path d="M3 13h18M3 21h18M11 13l-2 4 4 1-1 3M9 17H5l-2 2m10-1 4-3 4 2M3 5h5m-3-2v4"/>',
 'dam': '<path d="M3 8c2-2 3 2 6 0M3 13c2-2 3 2 6 0M3 18c2-2 3 2 6 0M10 3h5l3 18H9l1-18ZM12 7h2m-2 4h3m-3 4h3M19 18l2 3"/>',
 'levee': '<path d="M3 10c2-2 3 2 6 0M3 15c2-2 3 2 6 0M3 21h18M9 21l4-16h4l4 16M13 5h4M14 10h3"/>',
 'avalanche': '<path d="m3 21 9-17 9 17H3ZM9 10l3 2 3-2M8 15l3 1 1 3-3 1-2-2 1-3Zm8-1 2 1M5 5l1-2m13 4 2-1"/>',
 'subsidence': '<path d="M3 8h5m8 0h5M8 8l2 5h4l2-5M3 21h18M4 16h3m10 0h3M12 2v6m-2-2 2 2 2-2"/>',
 'volcano': '<path d="m3 21 6-12h6l6 12H3ZM9 9l3 3 3-3M12 5V2M7 6 4 3m13 3 3-3M10 17l2-2 2 3"/>',
}

CATEGORY = dict(zip(
 ['keep-us-connected', 'who-can-fix-this', 'keep-the-basics-on', 'what-am-i-paying-for', 'plan-for-disruption'],
 ['wifi', 'wrench', 'bolt', 'receipt', 'shield'],
))

DESTINATIONS = {
 'https://broadbandmap.fcc.gov/': 'map',
 'https://consumercomplaints.fcc.gov/hc/en-us': 'chat',
 'https://www.ifixit.com/Guide': 'book',
 'https://consumer.ftc.gov/articles/how-avoid-home-improvement-scam': 'wrench',
 'https://www.usa.gov/repairing-home': 'home',
 'https://www.usa.gov/help-with-utility-bills': 'receipt',
 'https://www.epa.gov/watersense/start-saving': 'drop',
 'https://www.usa.gov/weatherization-energy-programs': 'bolt',
 'https://www.consumerfinance.gov/consumer-tools/': 'book',
 'https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions': 'repeat',
 'https://www.consumerfinance.gov/complaint/': 'chat',
 'https://www.ready.gov/plan': 'checklist',
 'https://www.usa.gov/disaster-financial-help': 'help',
 'https://www.usa.gov/state-emergency-management': 'building',
 '#compare-bill': 'calculator', '#cancel-subscription': 'checklist', '#draft-message': 'pen', '#cost-preview': 'calculator',
}


def icon(name):
    return f'<svg class="ui-icon" data-icon="{name}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{GLYPHS[name]}</svg>'


# Reviewed local copies; provenance and currentness limits live with the files.
FAVICONS = {
    'broadbandmap.fcc.gov': 'fcc-map.ico',
    'consumercomplaints.fcc.gov': 'fcc-complaints.ico',
    'www.ifixit.com': 'ifixit.png',
    'consumer.ftc.gov': 'ftc.ico',
    'www.usa.gov': 'usa.png',
    'www.epa.gov': 'epa.png',
    'www.consumerfinance.gov': 'cfpb.ico',
    'www.ready.gov': 'ready.ico',
    'www.reddit.com': 'reddit.png',
}


def destination_icon(url):
    from urllib.parse import urlsplit
    host = urlsplit(url).hostname
    if host in FAVICONS:
        return f'<img class="site-favicon" src="/assets/favicons/{FAVICONS[host]}" width="20" height="20" alt="" aria-hidden="true" decoding="async">'
    return icon(DESTINATIONS.get(url, 'book'))


def copy_icons():
    return icon('copy') + icon('check')
