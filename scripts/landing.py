"""Location-first homepage resources. Map and city results keep their own templates."""
from html import escape
from icons import icon, CATEGORY

# Primary publishers checked November 3, 2026. Listos displays a page timestamp
# 2026-10-05T17:11:57+00:00; other publication dates were not stated.
CALIFORNIA = [
    ('Power, water & phone bills', 'Find utility assistance and consumer support.', 'CPUC',
     'https://www.cpuc.ca.gov/consumer-support', 'bolt'),
    ('Hiring a contractor', 'Look up a California contractor’s license.', 'CSLB',
     'https://cslb.ca.gov/onlineservices/checklicenseii/CheckLicense.aspx', 'wrench'),
    ('Health coverage', 'Find ways to apply for Medi-Cal.', 'California DHCS',
     'https://www.dhcs.ca.gov/medi-cal/apply/', 'resource-clinic'),
    ('Prepare for a disaster', 'Read California preparedness and recovery guides.', 'Listos California',
     'https://www.listoscalifornia.org/disaster-readiness/', 'shield'),
]


def landing_resources(branches, directory, entry, phones, tools):
    resources = ''.join(f'''<a class="state-resource" href="{escape(url, quote=True)}">
      <span class="state-resource-icon" aria-hidden="true">{icon(symbol)}</span>
      <span><strong>{title}</strong><span>{description}</span><small>{publisher} {icon('external')}</small></span>
    </a>''' for title, description, publisher, url, symbol in CALIFORNIA)
    general = ''.join(f'''<details class="general-topic" id="{branch['slug']}">
      <summary>{branch['label']}</summary><p>{branch['description']}</p>
      <ul class="portal-list">{''.join(entry(title, url, publisher, branch['label']) for title, url, publisher, _ in directory.LINKS[branch['slug']])}</ul>
      <p class="portal-note">{directory.NOTES[branch['slug']]}</p></details>''' for branch in branches)
    communities = ''.join(f'''<a class="community-resource" href="/{branch['slug']}/">
      {icon(CATEGORY[branch['slug']])}<span><strong>{branch['name']}</strong><span>{branch['description']}</span></span>{icon('right')}</a>''' for branch in branches)
    return f'''<section class="landing-library" aria-labelledby="library-title">
      <header class="library-heading"><h2 id="library-title">Useful across California</h2>
      <p>Start here for statewide help. Choose a location above for local places and contacts.</p></header>
      <nav class="resource-tabs" aria-label="Browse resources">
        <a id="tab-california" href="#california-resources" data-resource-tab>California resources</a>
        <a id="tab-guides" href="#tools" data-resource-tab>Guides & tools</a>
        <a id="tab-communities" href="#communities" data-resource-tab>Communities</a>
      </nav>
      <section class="resource-panel" id="california-resources" aria-labelledby="tab-california" tabindex="-1" data-resource-panel>
        <h3 class="panel-heading">Statewide starting points</h3><div class="state-resources">{resources}</div>
        <p class="resource-source-note">Links checked November 3, 2026. Eligibility and service areas vary.</p>
        {phones}
      </section>
      <section class="resource-panel" id="tools" aria-labelledby="tab-guides" tabindex="-1" data-resource-panel>
        <h3 class="panel-heading">Work through an everyday problem</h3>
        <p class="panel-intro">General guides and tools you can use wherever you live. These are not city-specific services.</p>
        {tools}
        <div class="guide-library-heading"><h3>More guides by topic</h3><a href="/guides/">All Ferdant guides {icon('right')}</a></div>
        <div class="general-topics">{general}</div>
        <p class="library-download"><a href="/offline/">Save resources for offline use {icon('down')}</a><span>Choose your city for a local copy, or download the California edition.</span></p>
      </section>
      <section class="resource-panel" id="communities" aria-labelledby="tab-communities" tabindex="-1" data-resource-panel>
        <h3 class="panel-heading">Talk with a community</h3><p class="panel-intro">Five spaces for practical questions and shared experience. You can use Ferdant without joining.</p>
        <div class="community-resources">{communities}</div><p class="resource-source-note">Peer discussion; replies and outcomes are not guaranteed.</p>
      </section>
    </section>'''
