/**
 * search — oneAZ M13 Search Bar (new block): a search field over the site's query index, results in
 * the kit's expanded panel (accent border, 54px rows with a hairline), "Show more" for the rest.
 *
 * Authoring: one optional row — [placeholder text] [index path]. The index defaults to
 * /query-index.json, the EDS index (built from published pages once an index is configured); its
 * rows need path and title, description is searched too. Until the index answers, the block says
 * search is not available yet instead of failing silently.
 *
 * EW1–EW10: the placeholder and path cells are configuration; nothing authored is displayed, so
 * nothing is rebuilt.
 */

const PAGE = 5;
const text = (el) => (el ? el.textContent.trim() : '');
let indexCache = null;

async function loadIndex(path) {
  if (!indexCache) {
    indexCache = fetch(path).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then((j) => j.data || []);
  }
  return indexCache;
}

function match(rows, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    const hay = `${row.title || ''} ${row.description || ''}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const placeholder = text(cells[0]) || 'Search by keyword...';
  const indexPath = text(cells[1]) || '/query-index.json';

  const form = document.createElement('form');
  form.className = 'search-box';
  form.setAttribute('role', 'search');
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  input.autocomplete = 'off';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'search-clear';
  clear.setAttribute('aria-label', 'Clear search');
  clear.hidden = true;
  form.append(input, clear);

  const panel = document.createElement('div');
  panel.className = 'search-results';
  panel.hidden = true;
  const list = document.createElement('ul');
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'button secondary search-more';
  more.textContent = 'Show more';
  const note = document.createElement('p');
  note.className = 'search-note';
  note.setAttribute('role', 'status');
  panel.append(list, more, note);

  let found = [];
  let shown = 0;
  const render = (reset) => {
    if (reset) { list.replaceChildren(); shown = 0; }
    found.slice(shown, shown + PAGE).forEach((row) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = row.path;
      a.textContent = row.title || row.path; // index data, not authored content
      li.append(a);
      list.append(li);
    });
    shown = Math.min(found.length, shown + PAGE);
    more.hidden = shown >= found.length;
  };

  let timer = null;
  const run = async () => {
    const q = input.value.trim();
    clear.hidden = !q;
    if (q.length < 2) { panel.hidden = true; return; }
    try {
      found = match(await loadIndex(indexPath), q);
      note.textContent = found.length ? '' : `No results for "${q}"`;
    } catch (e) {
      found = [];
      note.textContent = 'Search is not available yet.';
    }
    render(true);
    panel.hidden = false;
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 200); });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; panel.hidden = true; input.focus(); });
  more.addEventListener('click', () => render(false));
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') panel.hidden = true; });

  block.replaceChildren(form, panel);
}
