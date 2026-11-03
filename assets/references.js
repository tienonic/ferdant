'use strict';
(() => {
  const search = document.querySelector('#reference-search');
  if (!search) return;
  const form = document.querySelector('#reference-search-form');
  const list = document.querySelector('#reference-suggestions');
  const status = document.querySelector('#reference-search-status');
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const aliases = {
    'references-maps': 'food pantry hospital shelter city county boundaries geography census',
    'references-providers': 'library libraries clinic clinics healthcare health center providers',
    'references-disasters': 'earthquake flood wildfire fire heat cold storms tsunami drought avalanche volcano FEMA NOAA',
    'references-contacts': 'phone telephone hotline referral 211 utilities emergency alerts',
    'references-guides': 'bills money repairs consumer utilities preparedness everyday help',
    'references-assets': 'fonts icons images photos photography family stock Pexels graphics software licenses copyright leaflet jspdf PDF',
    'references-development': 'code programming tests tools shopify commerce',
    'references-corrections': 'report error wrong mistake feedback contact',
    'references-download': 'download export json all references file'
  };
  const categories = [...document.querySelectorAll('.reference-section, .reference-category, .reference-topic')].map(target => {
    const title = target.querySelector(':scope > summary').textContent.trim();
    const parent = target.parentElement.closest('.reference-section');
    return { target, title, name: normalize(title), keywords: normalize(aliases[target.id] || ''),
      contents: normalize(target.textContent), parent: parent?.querySelector(':scope > summary').textContent.trim() || '' };
  });
  let matches = [], active = -1, closeTimer;

  function close() {
    list.hidden = true;
    search.setAttribute('aria-expanded', 'false');
    search.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function activate(index) {
    active = index;
    [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
    if (active >= 0) {
      search.setAttribute('aria-activedescendant', list.children[active].id);
      list.children[active].scrollIntoView({ block: 'nearest' });
    }
  }
  function choose(item) {
    clearTimeout(closeTimer);
    close();
    search.value = item.title;
    const section = item.target.closest('.reference-section');
    document.querySelectorAll('.reference-section').forEach(node => { node.open = node === section; });
    for (let node = item.target; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
    status.textContent = `Opened ${item.title}.`;
    item.target.querySelector(':scope > summary').focus({ preventScroll: true });
    item.target.scrollIntoView({ block: 'start' });
  }
  function suggest() {
    clearTimeout(closeTimer);
    const query = normalize(search.value);
    list.replaceChildren();
    matches = [];
    close();
    if (query.length < 2) {
      status.textContent = query ? 'Type at least two letters to find a category.' : '';
      return;
    }
    const terms = query.split(/\s+/);
    const rank = item => item.name.startsWith(query) ? 0 : item.name.includes(query) ? 1 :
      terms.every(term => (item.name + ' ' + item.keywords).includes(term)) ? 2 :
      terms.every(term => item.contents.includes(term)) ? 3 : 4;
    matches = categories.map(item => ({ item, rank: rank(item) })).filter(match => match.rank < 4)
      .sort((a, b) => a.rank - b.rank || Number(!a.item.parent) - Number(!b.item.parent) || a.item.title.localeCompare(b.item.title))
      .slice(0, 8).map(match => match.item);
    for (const [index, item] of matches.entries()) {
      const option = document.createElement('li');
      option.id = `reference-suggestion-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      const title = document.createElement('span');
      title.textContent = item.title;
      option.append(title);
      if (item.parent) {
        const trail = document.createElement('small');
        trail.textContent = item.parent;
        option.append(trail);
      }
      option.addEventListener('pointerdown', event => event.preventDefault());
      option.addEventListener('click', () => choose(item));
      list.append(option);
    }
    list.hidden = matches.length === 0;
    search.setAttribute('aria-expanded', String(matches.length > 0));
    status.textContent = matches.length ? `${matches.length} category suggestions. Use arrow keys and Enter, or choose a result.` :
      'No matching category. Try maps, clinics, disasters or corrections.';
  }
  search.addEventListener('input', suggest);
  search.addEventListener('focus', () => { if (search.value) suggest(); });
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
      event.preventDefault();
      if (list.hidden) suggest();
      activate(active < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) :
        (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
    }
  });
  search.addEventListener('blur', () => { closeTimer = setTimeout(close, 150); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!list.hidden && active >= 0) { choose(matches[active]); return; }
    const query = normalize(search.value);
    const exact = categories.find(item => item.name === query);
    if (query.length >= 2 && exact) { choose(exact); return; }
    suggest();
    if (matches.length === 1) choose(matches[0]);
  });
  document.querySelector('.reference-search').hidden = false;
  function openLinkedCategory() {
    const item = categories.find(category => '#' + category.target.id === location.hash);
    if (item) choose(item);
  }
  window.addEventListener('hashchange', openLinkedCategory);
  openLinkedCategory();
})();
