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
// Reveal enhancements only after the script has loaded. The guides remain plain HTML.
for (const element of document.querySelectorAll('[data-enhancement]')) element.hidden = false;

const tabs = [...document.querySelectorAll('[role=tab]')];
function selectTab(tab) {
 for (const item of tabs) {
  const selected = item === tab;
  item.setAttribute('aria-selected', String(selected));
  item.tabIndex = selected ? 0 : -1;
  document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
 }
}
for (const tab of tabs) {
 tab.addEventListener('click', () => selectTab(tab));
 tab.addEventListener('keydown', event => {
  const current = tabs.indexOf(tab);
  const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
  if (next === null) return;
  event.preventDefault(); selectTab(tabs[next]); tabs[next].focus();
 });
}

const money = cents => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(Math.abs(cents) / 100);
const readCents = input => {
 const cents = Math.round(Number(input.value) * 100);
 return input.validity.valid && Number.isSafeInteger(cents) ? cents : null;
};
const form = document.querySelector('#bill-comparison');
if (form) {
 const output = document.querySelector('#bill-result');
 const changes = [...document.querySelectorAll('.change-inputs input')];
 const label = document.querySelector('#gap-label'), detail = document.querySelector('#gap-detail'), fill = document.querySelector('#gap-fill');
 const example = document.querySelector('#example-note');
 function compare() {
  const previous = readCents(form.elements.previous), current = readCents(form.elements.current);
  if (!form.checkValidity() || previous === null || current === null) {
   output.textContent = 'Enter two valid, non-negative totals to compare.';
   label.textContent = 'Compare two totals first.'; detail.textContent = 'Then add the changes you have found.'; fill.style.width = '0%'; return;
  }
  const diff = current - previous;
  const percentage = previous > 0 ? ` (${(Math.abs(diff) / previous * 100).toFixed(1)}%)` : '';
  const summary = document.createElement('strong'), explanation = document.createElement('span');
  summary.textContent = diff === 0 ? 'The totals are the same.' : `${money(diff)}${percentage} ${diff > 0 ? 'higher' : 'lower'}`;
  explanation.textContent = 'This compares the totals. Check individual charges to find the reason.';
  output.replaceChildren(summary, explanation);
  const values = changes.map(readCents);
  if (values.some(value => value === null)) {
   label.textContent = 'Check the change amounts.'; detail.textContent = 'Use valid amounts with no more than two decimal places.'; fill.style.width = '0%'; return;
  }
  const known = values.reduce((sum, value) => sum + value, 0), remaining = diff - known;
  const fraction = diff === 0 ? (known === 0 ? 1 : 0) : Math.max(0, Math.min(1, 1 - Math.abs(remaining) / Math.abs(diff)));
  fill.style.width = `${fraction * 100}%`;
  label.textContent = remaining === 0 ? 'Your entries match the total difference.' : `${money(remaining)} still to check`;
  detail.textContent = `Total change: ${diff < 0 ? '−' : '+'}${money(diff)}. Your entries: ${known < 0 ? '−' : '+'}${money(known)}. Remaining: ${remaining < 0 ? '−' : '+'}${money(remaining)}. ` + (remaining === 0 ? 'Matching the arithmetic does not verify the charges.' : remaining * diff < 0 || (diff === 0 && known !== 0) ? 'Your entries go beyond the total change. Recheck the signs, dates and any offsetting credits.' : 'Check this remaining amount against the bill. The bar shows how closely your entries match the total difference.');
 }
 form.addEventListener('submit', event => {event.preventDefault(); if (form.reportValidity()) compare();});
 form.addEventListener('reset', event => {
  event.preventDefault();
  for (const input of [...form.querySelectorAll('input'), ...changes]) input.value = '';
  if (example) example.hidden = true;
  output.textContent = 'Enter two totals to compare.';
  label.textContent = 'Compare two totals first.';
  detail.textContent = 'Then see how much of the difference your entries account for.';
  fill.style.width = '0%';
 });
 for (const input of [...form.querySelectorAll('input'), ...changes]) input.addEventListener('input', () => {if (example) example.hidden = true; compare();});
 document.querySelector('#bill-example')?.addEventListener('click', () => {
  form.elements.previous.value = '60'; form.elements.current.value = '75';
  changes.forEach((input, index) => {input.value = ['10', '2', '0', '0'][index];});
  document.querySelector('.bill-breakdown').open = true; example.hidden = false; compare();
 });
}

const route = document.querySelector('#cancel-route');
if (route) {
 const routes = {
  company: 'Open the company’s verified account or billing page and follow its published cancellation instructions. Save the request and ask for the effective end date.',
  platform: 'Check the platform named on your receipt or statement. Use its official subscription settings and terms; the service’s own website may not control the charge.',
  unknown: 'Start with your receipt or statement. Identify the business that charges you before choosing a cancellation route.'
 };
 for (const radio of document.querySelectorAll('[name=billing-route]')) radio.addEventListener('change', () => {route.textContent = routes[radio.value];});
 const checks = [...document.querySelectorAll('#cancel-record input')];
 const nextSteps = ['identify the billing business or platform.', 'save the request and any confirmation, or record the attempt.', 'record the stated end or renewal date.', 'check the next statement for another charge.'];
 for (const check of checks) check.addEventListener('change', () => {
  const count = checks.filter(input => input.checked).length;
  document.querySelector('#cancel-count').textContent = `${count} of 4 records checked`;
  document.querySelector('#cancel-progress').value = count;
  const next = checks.findIndex(input => !input.checked);
  document.querySelector('#cancel-next').textContent = next === -1 ? 'Your checklist is filled in. Keep the records; these checks do not confirm cancellation or a refund.' : `Next: ${nextSteps[next]}`;
 });
}

const builder = document.querySelector('#message-builder');
if (builder) {
 const goals = {explain:'Please explain the charge and the rate or term behind it.', correct:'Please review this charge and correct it if it was applied in error.', confirm:'Please confirm whether renewal is canceled, when access ends and whether another charge is scheduled.'};
 function buildMessage() {
  const issue = document.querySelector('#message-issue').value.trim() || '[the charge or issue]';
  const dates = document.querySelector('#message-dates').value.trim();
  document.querySelector('#built-message').textContent = `My billing question: ${issue}` + (dates ? `\n\nRelevant dates and contact: ${dates}` : '') + `\n\n${goals[document.querySelector('#message-goal').value]}\n\nI can provide supporting records through your verified secure channel.`;
  builder.parentElement.querySelector('.copy-status').textContent = '';
 }
 builder.addEventListener('submit', event => event.preventDefault());
 builder.addEventListener('input', buildMessage);
 builder.addEventListener('reset', event => {
  event.preventDefault();
  for (const input of builder.querySelectorAll('input, textarea')) input.value = input.defaultValue;
  document.querySelector('#message-goal').value = 'explain';
  buildMessage();
 });
 buildMessage();
}
if (navigator.clipboard?.writeText) for (const button of document.querySelectorAll('[data-copy]')) {
 button.hidden = false;
 button.addEventListener('click', async () => {
  const status = button.parentElement.querySelector('.copy-status');
  try { await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).innerText); status.textContent = 'Copied. Adapt the details in your own private notes.'; }
  catch { status.textContent = 'Copy is unavailable here. Select and copy the text above.'; }
 });
}
