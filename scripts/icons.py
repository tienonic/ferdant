"""Original inline line icons. Text labels carry the accessible names."""

GLYPHS = {
 'wifi': '<path d="M3 8.5a14 14 0 0 1 18 0M6 12a9.5 9.5 0 0 1 12 0M9 15.5a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="19" r=".8"/>',
 'wrench': '<path d="M14 4a6 6 0 0 0-7.5 7.5L3 15a3 3 0 0 0 4 4l3.5-3.5A6 6 0 0 0 18 8l-4 4-3-3 4-4Z"/>',
 'bolt': '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
 'receipt': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 7h6M9 11h6M9 15h3"/>',
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
 'copy': '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 'check': '<path d="m4 12 5 5L20 6"/>',
 'reset': '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
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
 '#compare-bill': 'calculator', '#cancel-subscription': 'checklist', '#draft-message': 'pen',
}


def icon(name):
    return f'<svg class="ui-icon" data-icon="{name}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{GLYPHS[name]}</svg>'


def destination_icon(url):
    return icon('users' if url.startswith('https://www.reddit.com/r/') else DESTINATIONS.get(url, 'book'))


def copy_icons():
    return icon('copy') + icon('check')
