/* Demo links open explanations only. No network, storage, analytics or commerce. */
(() => {
 'use strict';
 const dialog = document.getElementById('monetization-demo-dialog');
 if (!dialog || typeof dialog.showModal !== 'function') return;
 const examples = {
  ad: ['Advertisement demo', 'This box shows where a clearly labeled local business advertisement could appear. No advertiser is connected, no ad is served and this example does not send you to a business.'],
  affiliate: ['Affiliate link demo', 'This sample product link shows how an affiliate placement could look. There is no seller, checkout, affiliate account or commission attached. A real affiliate link would disclose any commission before you follow it.'],
  sponsor: ['Sponsorship demo', 'This card shows a possible community sponsor acknowledgment. It represents no existing business or paid agreement. It does not change which resources appear on the map or their order.']
 };
 document.addEventListener('click', event => {
  const link = event.target.closest('a[data-monetization-open]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const example = examples[link.dataset.monetizationOpen];
  if (!example) return;
  event.preventDefault();
  dialog.querySelector('#monetization-demo-title').textContent = example[0];
  dialog.querySelector('#monetization-demo-description').textContent = example[1];
  dialog.showModal();
 });
})();
