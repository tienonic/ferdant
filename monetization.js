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
 document.addEventListener('click', event => {
  const link = event.target.closest('a[data-monetization-open]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const example = examples[link.dataset.monetizationOpen];
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
