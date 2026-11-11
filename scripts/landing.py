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
    return '''<div class="home-flow"><section class="home-welcome" data-location-routing aria-labelledby="welcome-title">
      <div class="welcome-copy">
        <h1 id="welcome-title">Local resources.<br> Emergency plans.</h1>
        <p>Find local services, emergency contacts and plans for your California city.</p>
      </div>
    </section>'''


def landing_followup():
    return '''    <details class="home-instructions"><summary>How it works</summary>
      <ol class="home-steps">
        <li><strong>Choose your location</strong><p>Enter a city, county or ZIP code and select a match to open its local resources.</p></li>
        <li><strong>Pick what you need</strong><p>Choose Everyday for food, water, bathrooms and more, or a disaster plan for emergency planning.</p></li>
        <li><strong>Explore the details</strong><p>Open a category or map pin to view places, and check the provider's information before visiting.</p></li>
        <li><strong>Keep it handy</strong><p>Find local phone numbers below the map, or download your resource book or complete website for offline use.</p></li>
      </ol>
    </details>
      <figure class="welcome-photos">
        <div class="welcome-photo-pair">
          <img class="welcome-family" src="/assets/photos/family-park.webp" width="960" height="640" alt="Parents and children playing with autumn leaves on a picnic blanket." fetchpriority="high" decoding="async">
          <img class="welcome-picnic" src="/assets/photos/family-picnic.webp" width="640" height="427" alt="A family sharing watermelon at a picnic table in a park." decoding="async">
        </div>
        <figcaption><a href="/sources-and-corrections/#references-assets">Stock photography &amp; credits</a></figcaption>
      </figure>
</div>'''


def landing_resources(branches, phones):
    resources = ''.join(f'''<a class="state-resource" href="{escape(url, quote=True)}">
      <span class="state-resource-icon" aria-hidden="true">{icon(symbol)}</span>
      <span><strong>{title}</strong><span>{description}</span><small><span class="resource-scope-badge scope-state">Statewide</span> {publisher} {icon('external')}</small></span>
    </a>''' for title, description, publisher, url, symbol in CALIFORNIA)
    communities = ''.join(f'''<a class="community-resource" href="https://www.reddit.com/r/{branch['name']}/">
      {icon(CATEGORY[branch['slug']])}<span><strong>{branch['name']}</strong><span>{branch['description']}</span></span>{icon('right')}</a>''' for branch in branches)
    return f'''<section class="landing-library" aria-labelledby="library-title">
      <header class="library-heading"><h2 id="library-title">Useful across California</h2>
      <p>Start here for statewide help. Choose a location above for local places and contacts.</p></header>
      <nav class="resource-tabs" aria-label="Browse resources">
        <a id="tab-california" href="#california-resources" data-resource-tab>California resources</a>
        <a id="tab-communities" href="#communities" data-resource-tab>Communities</a>
      </nav>
      <section class="resource-panel" id="california-resources" aria-labelledby="tab-california" tabindex="-1" data-resource-panel>
        <h3 class="panel-heading">Statewide starting points</h3><div class="state-resources">{resources}</div>
        <p class="resource-source-note">Links checked November 3, 2026. Eligibility and service areas vary.</p>
        {phones}
      </section>
      <section class="resource-panel" id="communities" aria-labelledby="tab-communities" tabindex="-1" data-resource-panel>
        <h3 class="panel-heading">Talk with a community</h3><p class="panel-intro">Five spaces for practical questions and shared experience. You can use Ferdant without joining.</p>
        <div class="community-resources">{communities}</div><p class="resource-source-note">Peer discussion; replies and outcomes are not guaranteed.</p>
      </section>
    </section>'''
