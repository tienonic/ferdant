"""Local-only recommendation drafts. No submission or publication service."""
import html


def recommendation_link(href):
    return '<a class="recommendation-entry" href="'+html.escape(href, quote=True)+'" aria-label="Suggest a resource"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg><span class="recommendation-full">Suggest a resource</span><span class="recommendation-short" aria-hidden="true">Suggest</span></a>'


def recommendation_panel():
    return '''<details class="recommendation-panel" id="recommend-a-resource">
 <summary><span>Make a recommendation</span><span aria-hidden="true">+</span></summary>
 <div class="recommendation-body"><h2>What should we add or improve?</h2>
 <p>Recommend a useful resource, flag a correction or share an idea for the website.</p>
 <p class="recommendation-stage">Recommendations aren't being collected yet. Copy or download a draft to keep it for later.</p>
 <form id="recommendation-form" autocomplete="off"><fieldset disabled>
 <legend class="visually-hidden">Recommendation draft</legend>
 <div class="recommendation-pair"><label for="recommendation-type">Recommendation type<select id="recommendation-type"><option value="resource">Add a resource</option><option value="correction">Correct a listing</option><option value="website">Improve the website</option></select></label>
 <label for="recommendation-area">City or area<input id="recommendation-area" maxlength="80" placeholder="City, county or all California"></label></div>
 <label for="recommendation-title">What do you recommend?<input id="recommendation-title" required maxlength="120" placeholder="Resource name, correction or idea"></label>
 <label for="recommendation-link">Public source link <span>(optional)</span><input id="recommendation-link" type="url" maxlength="600" placeholder="https://" aria-describedby="recommendation-link-note"></label>
 <p id="recommendation-link-note" class="recommendation-hint">A provider or official source helps explain the recommendation.</p>
 <label for="recommendation-detail">Why it helps or what needs changing<textarea id="recommendation-detail" rows="4" required maxlength="1200"></textarea></label>
 <p class="recommendation-hint">Keep personal details out. Your draft stays in this open page unless you choose to copy or download it.</p>
 <div class="recommendation-actions"><button class="button" type="submit">Download draft (TXT)</button><button class="quiet-button" type="button" id="copy-recommendation">Copy draft</button><button class="quiet-button" type="reset">Clear</button></div>
 <p id="recommendation-status" role="status" aria-live="polite"></p>
 </fieldset></form><noscript><p>Enable JavaScript to prepare a recommendation draft. Nothing can be submitted from this page.</p></noscript>
 </div></details><script src="/recommendations.js" defer></script>'''
