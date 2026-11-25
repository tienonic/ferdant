// The "Who are you?" chooser. Without this script the page shows the same choices as a list of links.
for (const form of document.querySelectorAll('[data-chooser]')) {
  const select = form.querySelector('select');
  const line = form.querySelector('.chooser-line');
  const button = form.querySelector('.button');
  const show = () => {
    const o = select.selectedOptions[0];
    line.textContent = o.dataset.line;
    button.textContent = o.dataset.button;
    button.href = o.dataset.href;
  };
  select.addEventListener('change', show);
  form.addEventListener('submit', (event) => event.preventDefault());
  show();
  form.hidden = false;
  form.parentElement.querySelector('[data-chooser-list]').hidden = true;
}
