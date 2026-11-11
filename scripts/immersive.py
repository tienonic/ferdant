"""A readable six-step story; the existing atlas supplies its interactive controls."""
from html import escape
import importlib.util
from pathlib import Path


def story():
    spec = importlib.util.spec_from_file_location('story_plans', Path(__file__).resolve().parents[1] / 'content/disasters.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    plans = ''.join('<details><summary>'+escape(p['label'])+'</summary><p>'+escape(p['headline'])+'</p><ol>'+''.join('<li>'+escape(s['text'])+'</li>' for s in p['steps'])+'</ol><a href="'+escape(p['guidance']['url'], quote=True)+'">Read official guidance</a></details>' for p in module.PLANS)
    labels = ['The place', 'What affects this area', 'How it compares', 'What to do first', 'What is near you', 'Keep it']
    rail = ''.join(f'<a href="#story-{n}" aria-label="{n}. {label}" data-story-jump="{n}"><span aria-hidden="true"></span></a>' for n, label in enumerate(labels, 1))
    return '''<noscript><style>#resource-atlas[hidden]{display:block!important}.resource-atlas .atlas-map-column,.resource-atlas .atlas-controls,.resource-atlas .atlas-heading{display:none}</style></noscript><div class="place-story" aria-label="Your place, in six steps">
 <section class="story-step" id="story-1" data-story-step="1" aria-label="The place"><div data-story-title></div><p id="story-county">California</p><p id="story-place-note">Choose a location to see its county, hazards and nearby places.</p></section>
 <section class="story-step" id="story-2" data-story-step="2" aria-labelledby="story-hazards-title"><h2 id="story-hazards-title" class="story-label">What affects this area</h2><div id="story-hazards"><p class="story-voice">Risk varies from place to place.</p></div><p id="story-risk-scope" class="story-note">FEMA compares long-term relative risk. <a href="/sources-and-corrections/#references-disasters">Method and limits</a>.</p></section>
 <section class="story-step" id="story-3" data-story-step="3" aria-label="How it compares"><p class="story-label">How it compares</p><h2 id="story-comparison" class="story-voice">County comparisons use FEMA’s long-term risk data.</h2><p id="story-loss"></p><p id="story-stat-source" class="story-note">Relative risk, not a forecast. <a href="/sources-and-corrections/#references-disasters">FEMA sources and method</a>.</p><span id="story-scroll" class="story-note" hidden>Scroll</span></section>
 <section class="story-step" id="story-4" data-story-step="4" aria-label="What to do first"><p class="story-label">What to do first</p><h2 id="story-plan-title" class="story-voice">Make a plan for what can happen here.</h2><ol id="story-plan-steps"></ol><a href="#atlas-action-plan" id="story-full-plan">Open the full plan</a><div data-story-plan-detail></div><p class="story-label story-other-label">All plans</p><div data-story-plan-choices></div><div class="story-fallback-plans">'''+plans+'''</div></section>
 <section class="story-step" id="story-5" data-story-step="5" aria-label="What is near you"><p class="story-label">What is near you</p><h2 id="story-places-title" class="story-voice">Find the places near you.</h2><div id="story-categories" role="group" aria-label="Nearby places by category"></div><p class="story-note">Directory locations, not live availability. Confirm access, hours and services before visiting.</p><div data-story-places></div></section>
 <section class="story-step" id="story-6" data-story-step="6" aria-label="Keep it"><p class="story-label">Keep it</p><h2 class="story-voice">Phone networks and power can fail when you need them, so <em>save</em> this now.</h2><div data-story-downloads></div><div data-story-contacts></div><noscript><p><a href="/downloads/ferdant-california-2026-11-02.html" download>Save the complete offline website</a>. California support numbers follow below.</p></noscript></section>
</div><nav class="story-rail" aria-label="Place story steps" hidden>'''+rail+'''</nav>'''
