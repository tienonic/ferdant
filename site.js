'use strict';
const search = document.querySelector('#guide-search');
if (search) {
 document.querySelector('[data-search-controls]').hidden = false;
 const cards = [...document.querySelectorAll('[data-search]')];
 search.addEventListener('input', () => {
  const words = search.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const card of cards) {
   card.hidden = !words.every(word => card.dataset.search.toLocaleLowerCase().includes(word));
   if (!card.hidden) count++;
  }
  document.querySelector('#search-status').textContent = `${count} ${count === 1 ? 'guide' : 'guides'}`;
  document.querySelector('#no-results').hidden = count !== 0;
 });
}
const form = document.querySelector('#bill-comparison');
if (form) form.addEventListener('submit', event => {
 event.preventDefault();
 if (!form.reportValidity()) return;
 const previous = Number(form.elements.previous.value), current = Number(form.elements.current.value);
 const output = document.querySelector('#bill-result');
 if (!Number.isFinite(previous) || !Number.isFinite(current) || previous < 0 || current < 0) { output.textContent = 'Enter two non-negative totals.'; return; }
 const diff = Math.round((current - previous) * 100) / 100;
 const amount = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(Math.abs(diff));
 const percentage = previous > 0 ? ` (${(Math.abs(diff) / previous * 100).toFixed(1)}%)` : '';
 output.textContent = diff === 0 ? 'The totals are the same.' : `The current bill is ${amount}${percentage} ${diff > 0 ? 'higher' : 'lower'}. This does not explain which charge changed.`;
});
if (navigator.clipboard?.writeText) for (const button of document.querySelectorAll('[data-copy]')) {
 button.hidden = false;
 button.addEventListener('click', async () => {
  const status = button.parentElement.querySelector('.copy-status');
  try { await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).innerText); status.textContent = 'Copied. Adapt the details in your own private notes.'; }
  catch { status.textContent = 'Copy is unavailable here. Select and copy the text above.'; }
 });
}
