"""Local commercial-placement examples, with no advertiser or affiliate requests."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def placements():
    config = json.loads((ROOT / 'config/monetization.json').read_text(encoding='utf-8'))
    if not config['enabled']:
        return '', '', ''
    if config['mode'] != 'demo':
        raise ValueError('Only demo monetization is implemented.')
    assets = '<!--monetization-demo:start--><link rel="stylesheet" href="/monetization.css"><script src="/monetization.js" defer></script><!--monetization-demo:end-->'
    banner = '''<!--monetization-demo:start--><aside class="demo-ad" aria-label="Advertisement demo" data-monetization="ad">
      <svg class="demo-store" viewBox="0 0 72 64" fill="none" aria-hidden="true"><path d="M10 27h52v31H10z" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="m8 27 7-17h42l7 17" fill="#dbe6ee" stroke="currentColor" stroke-width="2"/><path d="M8 27c0 9 14 9 14 0 0 9 14 9 14 0 0 9 14 9 14 0 0 9 14 9 14 0M23 11v16m13-16v16m13-16v16M19 40h15v10H19zm26-1h9v19M5 58h62" stroke="currentColor" stroke-width="2"/></svg>
      <div class="demo-ad-copy"><span class="demo-label">Advertisement <span>Demo</span></span><p>Local business ad</p><small>A reserved space for an advertiser. No live ad connected.</small></div>
      <a href="#monetization-demo-details" class="demo-text-link" data-monetization-open="ad">View ad demo <span aria-hidden="true">↗</span></a>
    </aside><!--monetization-demo:end-->'''
    cards = '''<!--monetization-demo:start--><aside class="demo-partners" aria-label="Affiliate and sponsorship demos">
      <div class="demo-partners-heading"><h2>Partner placements</h2><p>Examples for this preview. Resources remain free to read and download.</p></div>
      <div class="demo-partner-grid">
        <article class="demo-partner demo-affiliate" data-monetization="affiliate">
          <div class="demo-product-art" aria-hidden="true"><svg viewBox="0 0 160 144" fill="none"><rect x="49" y="15" width="68" height="90" rx="3" fill="#fff" stroke="#74879a" stroke-width="2" transform="rotate(8 49 15)"/><path d="m63 34 35 5m-37 9 35 5m-37 9 25 3" stroke="#acbac7" stroke-width="3"/><rect x="24" y="66" width="112" height="63" rx="7" fill="#d3e0eb" stroke="#56718a" stroke-width="2"/><path d="M28 79h101" stroke="#56718a" stroke-width="2"/><path d="M118 76v10" stroke="#244b84" stroke-width="4" stroke-linecap="round"/><rect x="60" y="97" width="38" height="16" rx="2" fill="#f9fbfd"/><path d="M70 105h18" stroke="#74879a" stroke-width="2"/></svg></div>
          <div class="demo-partner-copy"><span class="demo-label">Affiliate link <span>Demo</span></span><h3>A pouch for important papers</h3><p>An example product link alongside a guide to keeping printed contacts and documents together.</p><a href="#monetization-demo-details" class="demo-text-link" data-monetization-open="affiliate" rel="sponsored nofollow">See affiliate example <span aria-hidden="true">↗</span></a><small>Sample product only. No commission or purchase link.</small></div>
        </article>
        <article class="demo-partner demo-sponsor" data-monetization="sponsor">
          <div class="demo-sponsor-mark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="m12 28 20-16 20 16v24H12z" stroke="currentColor" stroke-width="2"/><path d="M25 52V36h14v16M7 52h50M24 25h16" stroke="currentColor" stroke-width="2"/></svg></div>
          <div class="demo-partner-copy"><span class="demo-label">Sponsorship <span>Demo</span></span><h3>Community sponsor space</h3><p>An example of how a local partner could support free access to Ferdant's maps and guides.</p><a href="#monetization-demo-details" class="demo-text-link" data-monetization-open="sponsor">View sponsorship demo <span aria-hidden="true">↗</span></a><small>Example placement. No sponsor or paid agreement.</small></div>
        </article>
      </div>
      <p class="demo-disclosure" id="monetization-demo-details">These are layout demos. There are no live ads, affiliate purchases, paid sponsors or tracking in these placements.</p>
    </aside>
    <dialog class="demo-dialog" id="monetization-demo-dialog" aria-labelledby="monetization-demo-title" aria-describedby="monetization-demo-description">
      <form method="dialog"><button class="demo-close" aria-label="Close placement demo" autofocus>Close <span aria-hidden="true">×</span></button></form>
      <span class="demo-label">Monetization preview</span><h2 id="monetization-demo-title">Example placement</h2><p id="monetization-demo-description"></p><p class="demo-dialog-note">Your selected city, resource results and downloads are unchanged. Nothing is purchased or submitted here.</p>
    </dialog><!--monetization-demo:end-->'''
    return assets, banner, cards
