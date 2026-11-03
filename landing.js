'use strict';
// Progressive enhancement: without JavaScript all three resource sections are readable.
(() => {
 const tabs = [...document.querySelectorAll('[data-resource-tab]')];
 const panels = [...document.querySelectorAll('[data-resource-panel]')];
 if (!tabs.length) return;
 tabs[0].parentElement.setAttribute('role', 'tablist');
 tabs.forEach((tab, i) => {
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panels[i].id);
  panels[i].setAttribute('role', 'tabpanel');
 });
 function activate(index) {
  tabs.forEach((tab, i) => {
   tab.setAttribute('aria-selected', String(i === index));
   tab.tabIndex = i === index ? 0 : -1;
   panels[i].hidden = i !== index;
  });
 }
 function hashPanel() {
  let target;
  try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return -1; }
  return panels.findIndex(panel => panel === target || panel.contains(target));
 }
 function syncHash() {
  const index = hashPanel();
  if (index >= 0) activate(index);
 }
 activate(Math.max(0, hashPanel()));
 tabs.forEach((tab, index) => {
  tab.addEventListener('click', event => {
   if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
   event.preventDefault();
   activate(index);
   history.pushState(null, '', tab.getAttribute('href'));
  });
  tab.addEventListener('keydown', event => {
   const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
    : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
    : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
   if (next < 0) return;
   event.preventDefault();
   activate(next);
   tabs[next].focus();
   history.replaceState(null, '', tabs[next].getAttribute('href'));
  });
 });
 window.addEventListener('hashchange', syncHash);
 window.addEventListener('popstate', () => activate(Math.max(0, hashPanel())));
 // Header links and old topic links reveal their panel before fragment navigation.
 document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || link.hasAttribute('data-resource-tab')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
  let target;
  try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
  const index = panels.findIndex(panel => panel === target || panel.contains(target));
  if (index >= 0) activate(index);
 });
})();
