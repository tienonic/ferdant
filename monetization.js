/* Demo links open explanations only. No network, storage, analytics or commerce. */
(() => {
 'use strict';
 const dialog = document.getElementById('monetization-demo-dialog');
 if (!dialog || typeof dialog.showModal !== 'function') return;
 const examples = {
  ad: ['Alder Supply — Advertisement demo', 'The Everyday Pouch keeps printed contacts and household paperwork together in a simple zip organizer. This is a finished sample advertisement for a fictional brand, with generated product photography.', [['Sample price', '$24.00'], ['Sample material', 'Indigo cotton canvas with a brass zipper'], ['Availability', 'Concept product; not for sale']]],
  affiliate: ['Alder Supply — Affiliate demo', 'A sample product detail view for The Everyday Pouch. The displayed price and product are illustrative. No seller, checkout or affiliate account is connected, and no commission is earned.', [['Sample price', '$24.00'], ['Intended use', 'Organizing printed contacts and document copies'], ['Affiliate status', 'Demonstration only; no purchase link']]],
  sponsor: ['Morrow Hardware — Sponsorship demo', 'An independent hardware-and-home shop concept, shown as a realistic sponsor creative. Morrow Hardware is a fictional advertiser in this preview, not an existing sponsor of Ferdant.', [['Sample shop range', 'Tools, housewares and garden supplies'], ['Sample hours', 'Mon–Sat 8–6 · Sun 9–5 (illustrative only)'], ['Partnership status', 'No paid agreement or real store represented']]]
 };
 const atlas = document.getElementById('resource-atlas');
 const catalogNode = document.getElementById('disaster-affiliate-data');
 const affiliate = document.querySelector('[data-monetization="affiliate"]');
 let activeOffer = null;
 if (atlas && catalogNode && affiliate) {
  const catalog = JSON.parse(catalogNode.textContent);
  const slot = document.createElement('aside');
  slot.className = 'demo-disaster-slot';
  slot.setAttribute('aria-label', 'Preparedness affiliate example');
  const grid = affiliate.parentElement;
  atlas.querySelector('#resource-map-panel').after(slot);
  const defaults = {
   title: affiliate.querySelector('h3').textContent,
   description: affiliate.querySelector('.demo-partner-copy > p').textContent,
   price: '$24.00', image: affiliate.querySelector('img').getAttribute('src'),
   imageAlt: affiliate.querySelector('img').alt, cta: 'View the pouch', sku: 'everyday-pouch'
  };
  const category = affiliate.querySelector('.demo-product-category');
  const source = document.createElement('a');
  source.className = 'demo-kit-checklist';
  source.href = catalog.sources[1].url;
  source.textContent = 'Free public go-bag checklist';
  affiliate.querySelector('.demo-partner-copy').append(source);
  let previous;
  function syncOffer() {
   const contextual = !atlas.hidden;
   if (affiliate.parentElement !== (contextual ? slot : grid)) (contextual ? slot : grid).prepend(affiliate);
   affiliate.classList.toggle('demo-context-affiliate', contextual);
   grid.classList.toggle('demo-partner-grid--sponsor-only', contextual);
   const hazard = contextual ? atlas.dataset.layer || new URL(location.href).searchParams.get('hazard') || 'everyday' : 'everyday';
   const context = hazard + '|' + (document.querySelector('#phone-city')?.value || '');
   if (context === previous) return;
   previous = context;
   const product = catalog.offers[hazard] || defaults;
   activeOffer = catalog.offers[hazard] || null;
   affiliate.dataset.affiliateHazard = activeOffer ? hazard : 'everyday';
   affiliate.dataset.affiliateSku = product.sku;
   affiliate.querySelector('h3').textContent = product.title;
   affiliate.querySelector('.demo-partner-copy > p').textContent = product.description;
   const img = affiliate.querySelector('img');
   img.src = product.image; img.alt = product.imageAlt;
   category.textContent = activeOffer ? product.hazardLabel + ' · Preparedness example' : 'Paperwork, in one place';
   affiliate.querySelector('.demo-product-price').replaceChildren(document.createTextNode(product.price + ' '));
   const priceNote = document.createElement('small');priceNote.textContent = 'illustrative price';
   affiliate.querySelector('.demo-product-price').append(priceNote);
   const link = affiliate.querySelector('[data-monetization-open="affiliate"]');
   link.textContent = product.cta + ' ↗';
   const destination = new URL(location.href);
   destination.searchParams.set('demo-product', product.sku);
   if (activeOffer) destination.searchParams.set('hazard', hazard);
   else destination.searchParams.delete('hazard');
   destination.hash = 'monetization-demo-details';
   link.href = destination.pathname + destination.search + destination.hash;
   affiliate.querySelector('.demo-partner-copy > small').textContent = activeOffer
    ? 'Fictional product · Affiliate demo. Not a complete emergency kit; no commission is earned.'
    : 'Fictional product. Affiliate demonstration; no commission is earned.';
  }
  new MutationObserver(syncOffer).observe(atlas, {attributes: true, attributeFilter: ['data-layer', 'hidden']});
  syncOffer();
 }
 document.addEventListener('click', event => {
  const link = event.target.closest('a[data-monetization-open]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const example = link.dataset.monetizationOpen === 'affiliate' && activeOffer
   ? [activeOffer.hazardLabel + ' — Affiliate demo', activeOffer.description + ' This is an illustrative product concept, not an evaluated product or a complete emergency kit.', [['Sample product', activeOffer.title], ['Illustrative price', activeOffer.price], ['Demo product ID', activeOffer.sku]]]
   : examples[link.dataset.monetizationOpen];
  if (!example) return;
  event.preventDefault();
  dialog.querySelector('#monetization-demo-title').textContent = example[0];
  dialog.querySelector('#monetization-demo-description').textContent = example[1];
  const offer = dialog.querySelector('#monetization-demo-offer');
  offer.replaceChildren();
  example[2].forEach(([label, value]) => {
   const term = document.createElement('dt'), detail = document.createElement('dd');
   term.textContent = label; detail.textContent = value;
   offer.append(term, detail);
  });
  dialog.showModal();
 });
})();
