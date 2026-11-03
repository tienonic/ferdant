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

const sectionLinks = [...document.querySelectorAll('.portal-nav nav a')];
function markSection() {
 for (const link of sectionLinks) {
  if (link.getAttribute('href') === location.hash) link.setAttribute('aria-current', 'location');
  else link.removeAttribute('aria-current');
 }
}
window.addEventListener('hashchange', markSection);
markSection();

const portalQuery = document.querySelector('#portal-query');
if (portalQuery) {
 const entries = [...document.querySelectorAll('[data-portal-entry]')];
 const categories = [...document.querySelectorAll('[data-portal-card]')];
 function filterPortal() {
  const words = portalQuery.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  let links = 0;
  for (const entry of entries) {
   entry.hidden = !words.every(word => entry.dataset.search.toLocaleLowerCase().includes(word));
   if (!entry.hidden) links++;
  }
  for (const card of categories) {
   const count = [...card.querySelectorAll('[data-portal-entry]')].filter(entry => !entry.hidden).length;
   card.hidden = count === 0;
  }
  document.querySelector('#portal-status').textContent = words.length ? `${links} matching ${links === 1 ? 'link' : 'links'}` : 'Choose a category or open a tool.';
  document.querySelector('#portal-empty').hidden = links !== 0;
 }
 function clearPortal() {portalQuery.value = ''; filterPortal();}
 portalQuery.addEventListener('input', filterPortal);
 for (const button of document.querySelectorAll('[data-clear-portal]')) button.addEventListener('click', () => {clearPortal(); portalQuery.focus();});
 for (const link of sectionLinks) link.addEventListener('click', clearPortal);
 filterPortal();
}

const monthlyCost = document.querySelector('#monthly-cost');
if (monthlyCost) {
 const months = document.querySelector('#cost-months');
 const total = document.querySelector('#cost-total'), caption = document.querySelector('#cost-caption');
 const tiles = [...document.querySelectorAll('.cost-month-strip > span')];
 const format = cents => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(cents / 100);
 let example = false;
 function updateCost() {
  const count = Number(months.value), cents = Math.round(Number(monthlyCost.value) * 100);
  const valid = monthlyCost.value !== '' && monthlyCost.validity.valid && Number.isSafeInteger(cents);
  const period = `${count} ${count === 1 ? 'month' : 'months'}`;
  document.querySelector('#cost-month-label').textContent = period;
  months.setAttribute('aria-valuetext', period);
  tiles.forEach((tile, index) => {tile.classList.toggle('is-included', valid && index < count);});
  total.textContent = valid ? format(cents * count) : '—';
  caption.textContent = valid ? `${example ? 'Example: ' : ''}${format(cents)} × ${period}` : monthlyCost.value === '' ? 'Enter an amount to see the total.' : 'Use a non-negative amount with up to two decimal places.';
 }
 monthlyCost.addEventListener('input', () => {example = false; updateCost();});
 months.addEventListener('input', updateCost);
 document.querySelector('#cost-example').addEventListener('click', () => {monthlyCost.value = '12'; example = true; updateCost();});
 document.querySelector('#cost-reset').addEventListener('click', () => {monthlyCost.value = ''; months.value = '12'; example = false; updateCost(); monthlyCost.focus();});
 updateCost();
}

const toolDialog = document.querySelector('#tool-dialog');
if (toolDialog && typeof toolDialog.showModal === 'function') {
 let returnTo = null;
 for (const link of document.querySelectorAll('[data-open-tool]')) link.addEventListener('click', event => {
  const panel = document.getElementById(link.dataset.openTool);
  if (!panel) return;
  event.preventDefault();
  returnTo = link;
  for (const tool of toolDialog.querySelectorAll('[data-dialog-tool]')) tool.hidden = tool !== panel;
  document.querySelector('#tool-dialog-title').textContent = panel.dataset.toolTitle;
  toolDialog.dataset.activeTool = panel.id;
  const sourceIcon = [...document.querySelectorAll('.portal-tools [data-open-tool]')].find(entry => entry.dataset.openTool === panel.id)?.querySelector('.destination-label .ui-icon');
  if (sourceIcon) document.querySelector('#tool-dialog-icon').replaceChildren(sourceIcon.cloneNode(true));
  toolDialog.showModal();
  document.documentElement.classList.add('tool-open');
  toolDialog.querySelector('.tool-dialog-body').scrollTop = 0;
  toolDialog.querySelector('.tool-dialog-close').focus({preventScroll:true});
 });
 for (const button of toolDialog.querySelectorAll('[data-close-tool]')) button.addEventListener('click', () => toolDialog.close());
 toolDialog.addEventListener('close', () => {
  if (toolDialog.open) return;
  document.documentElement.classList.remove('tool-open');
  if (document.activeElement === document.body || toolDialog.contains(document.activeElement)) returnTo?.focus({preventScroll:true});
 });
 toolDialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...toolDialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]')].filter(element => element.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
  else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
 });
 toolDialog.addEventListener('click', event => {
  const rect = toolDialog.getBoundingClientRect();
  if (event.target === toolDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) toolDialog.close();
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
 form.querySelector('[type=submit]').disabled = false;
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
  builder.parentElement.querySelector('[data-copy]').removeAttribute('data-copied');
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
  try {
   const target = document.getElementById(button.dataset.copy), text = target.innerText;
   await navigator.clipboard.writeText(text);
   const unchanged = target.innerText === text;
   button.dataset.copied = String(unchanged);
   status.textContent = unchanged ? 'Copied. Adapt the details in your own private notes.' : 'Copied the earlier draft. Copy again to include your changes.';
  }
  catch { button.removeAttribute('data-copied'); status.textContent = 'Copy is unavailable here. Select and copy the text above.'; }
 });
}
