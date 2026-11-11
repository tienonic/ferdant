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


def landing_welcome():
    return '<div class="home-flow" data-location-routing>'


def landing_followup():
    return '</div>'



def landing_resources(branches, phones):
    resources = ''.join(f'''<a class="state-resource" href="{escape(url, quote=True)}">
      <span><strong>{title}</strong><span>{description}</span><small><span class="resource-scope-badge scope-state">Statewide</span> {publisher} {icon('external')}</small></span>
    </a>''' for title, description, publisher, url, symbol in CALIFORNIA)
    communities = ''.join(f'''<a class="community-resource" href="https://www.reddit.com/r/{branch['name']}/">
      <span><strong>{branch['name']}</strong><span>{branch['description']}</span></span></a>''' for branch in branches)
    return f'''<section class="landing-library" aria-labelledby="library-title">
      <header class="library-heading"><h2 id="library-title">Useful across California</h2>
      <p>Start here for statewide help. Choose a location above for local places and contacts.</p></header>
      <nav class="resource-tabs" aria-label="Browse resources">
        <a id="tab-california" href="#california-resources" >California resources</a>
        <a id="tab-communities" href="#communities" >Communities</a>
      </nav>
      <section class="resource-panel" id="california-resources" aria-labelledby="tab-california" tabindex="-1" data-resource-panel>
        <h3 class="panel-heading">Statewide starting points</h3><div class="state-resources">{resources}</div>
        <p class="resource-source-note">Eligibility and service areas vary.</p>
      </section>
      <section class="resource-panel" id="communities" aria-labelledby="tab-communities" tabindex="-1" data-resource-panel>
        <h3 class="panel-heading">Talk with a community</h3><p class="panel-intro">Five spaces for practical questions and shared experience. You can use Ferdant without joining.</p>
        <div class="community-resources">{communities}</div><p class="resource-source-note">Peer discussion; replies and outcomes are not guaranteed.</p>
      </section>
      {phones}
    </section>'''
