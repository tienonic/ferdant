"""A compact, local-only monthly-cost sandbox for the homepage."""


def cost_preview():
    months = ''.join('<span></span>' for _ in range(12))
    return f'''<section class="cost-preview" id="cost-preview" tabindex="-1" aria-labelledby="cost-preview-title" data-enhancement hidden>
      <div class="cost-preview-heading"><h2 id="cost-preview-title">Cost over time</h2><p>See what a monthly charge adds up to.</p></div>
      <div class="cost-preview-controls"><label for="monthly-cost">Monthly cost (USD)</label><div class="cost-amount"><span aria-hidden="true">$</span><input id="monthly-cost" type="number" inputmode="decimal" min="0" max="999999999.99" step="0.01" placeholder="0.00" aria-describedby="cost-scope"><button type="button" class="quiet-button" id="cost-example">Try $12</button></div></div>
      <div class="cost-horizon"><div class="cost-period"><label for="cost-months">Months to include</label><output id="cost-month-label" for="cost-months">12 months</output></div><div class="cost-month-strip" aria-hidden="true">{months}</div><input id="cost-months" type="range" min="1" max="12" step="1" value="12"><div class="cost-scale" aria-hidden="true"><span>1 month</span><span>1 year</span></div></div>
      <div class="cost-total" role="status" aria-live="polite" aria-atomic="true"><strong id="cost-total">—</strong><span id="cost-caption">Enter an amount to see the total.</span></div>
      <p id="cost-scope" class="cost-scope">Same charge each month; excludes changes, extra fees and interest. Nothing is saved.</p><button class="quiet-button" type="button" id="cost-reset">Clear</button>
    </section>'''
