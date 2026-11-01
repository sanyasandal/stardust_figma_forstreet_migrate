/**
 * accordion — oneAZ M1 Accordion (Block Collection accordion, reconstructive decode).
 *
 * Authoring shape (stardust/eds-conversion-log.md, M1): default-content intro before the
 * block; one row per item:
 *   [title cell: <p>Title keyboard_arrow_down</p>] [panel cell: any default content]
 * The trailing icon-font word (keyboard_arrow_down, D-EDS-2) is a content byte: it stays in
 * the authored paragraph (wrapped in a hidden span, textContent unchanged) and the visual
 * chevron is drawn by CSS on the toggle button.
 * A table inside a panel is authored as a paragraph holding only a link to
 * /fragments/<slug>-table-<n> (D2); the block loads it with loadFragment() and puts the
 * fragment's decorated table in the panel in place of the link paragraph.
 *
 * Experience Workspace (EW1/EW7): the title paragraph MOVES into div.accordion-title (a
 * <button> cannot host the editor); the button is a chevron-only toggle with an aria-label;
 * the whole title row toggles. Panels start CLOSED like the source, hidden="until-found"
 * (find-in-page / text fragments open them via beforematch).
 *
 * @ew-exempt <p> fragment link paragraph (/fragments/…) — a D2 reference replaced by the
 *   fragment's own (separately authored) table
 */

const GLYPH_WORDS = /\s*\b(keyboard_arrow_(?:down|up|right|left)|expand_(?:more|less))\b\s*$/;

/** Read-only text for DECISIONS / aria-labels — never displayed (EW1). */
const text = (el) => (el ? el.textContent.trim() : '');

/**
 * Wraps a trailing icon-font ligature word in a hidden span. Splits the text node, so the
 * paragraph's textContent (the editor's cursor math) is byte-identical.
 * @param {Element} el authored title element
 */
function hideGlyphWord(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let last = null;
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) last = walker.currentNode;
  if (!last) return;
  const m = last.textContent.match(GLYPH_WORDS);
  if (!m) return;
  const tail = last.splitText(m.index);
  const span = document.createElement('span');
  span.className = 'accordion-glyph';
  span.setAttribute('aria-hidden', 'true');
  tail.before(span);
  span.append(tail);
}

/**
 * Replaces each fragment-link paragraph in a panel with the fragment's decorated content.
 * @param {Element} panel accordion panel
 */
async function loadPanelFragments(panel) {
  const links = [...panel.querySelectorAll('a[href*="/fragments/"]')].filter((a) => {
    const p = a.closest('p');
    return p && panel.contains(p) && text(p) === text(a);
  });
  if (!links.length) return;
  let loadFragment;
  try {
    const base = (window.hlx && window.hlx.codeBasePath) || '';
    ({ loadFragment } = await import(`${base}/blocks/fragment/fragment.js`));
  } catch (e) {
    return; // fragment module unavailable (e.g. an offline harness): keep the link
  }
  await Promise.all(links.map(async (a) => {
    const p = a.closest('p');
    let fragment = null;
    try {
      fragment = await loadFragment(new URL(a.href, window.location).pathname);
    } catch (e) {
      fragment = null;
    }
    // the runtime's fragment auto-block may have replaced the paragraph already
    if (!fragment || !p.isConnected) return;
    const nodes = [];
    fragment.querySelectorAll(':scope > .section').forEach((section) => {
      section.querySelectorAll(':scope > .metadata-wrapper').forEach((m) => m.remove());
      nodes.push(...section.children);
    });
    if (nodes.length) p.replaceWith(...nodes);
  }));
}

// Accordion (tabs): oneAZ M17 Tabs over the same rows. The DOM stays the accordion's (titles and
// panels are not moved again, EW1); CSS lays the titles out as a tab row and the toggles become
// tabs: one panel open at a time, the first by default, arrow keys move between tabs.
function makeTabs(block, items) {
  const toggles = items.map((item) => item.querySelector('.accordion-toggle'));
  const panels = items.map((item) => item.querySelector('.accordion-panel'));
  block.setAttribute('role', 'tablist');
  // explicit grid columns: each title takes the next column of the tab row, panels span them all
  block.style.setProperty('--tabs-count', items.length);
  items.forEach((item, k) => { item.querySelector('.accordion-title').style.gridColumn = k + 1; });
  const select = (k, focus) => {
    items.forEach((item, j) => {
      const on = j === k;
      item.classList.toggle('is-open', on);
      toggles[j].setAttribute('aria-selected', String(on));
      toggles[j].setAttribute('aria-expanded', String(on));
      toggles[j].tabIndex = on ? 0 : -1;
      if (on) panels[j].removeAttribute('hidden');
      else panels[j].setAttribute('hidden', 'until-found');
    });
    if (focus) toggles[k].focus();
  };
  items.forEach((item, k) => {
    toggles[k].setAttribute('role', 'tab');
    panels[k].setAttribute('role', 'tabpanel');
    // capture phase: the accordion's own toggle handlers never see a tab click
    const pick = (e) => { e.stopImmediatePropagation(); select(k, false); };
    item.querySelector('.accordion-title').addEventListener('click', pick, true);
    toggles[k].addEventListener('click', pick, true);
    toggles[k].addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      select((k + step + items.length) % items.length, true);
    });
    panels[k].addEventListener('beforematch', () => select(k, false));
  });
  select(0, false);
}

export default async function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;
  const blockIdx = [...document.querySelectorAll('.accordion')].indexOf(block);
  const items = [];
  const fragmentLoads = [];

  rows.forEach((row, i) => {
    const cells = [...row.children];
    const titleCell = cells[0];
    const panelCell = cells[1];
    if (!titleCell || (!text(titleCell) && !panelCell)) return;

    const item = document.createElement('div');
    item.className = 'accordion-item';
    const panelId = `accordion-${blockIdx < 0 ? 0 : blockIdx}-${i}`;

    // title: MOVE the authored element(s) into the generated title wrapper (EW1/EW7)
    const title = document.createElement('div');
    title.className = 'accordion-title';
    const titleEls = [...titleCell.children];
    if (titleEls.length) title.append(...titleEls);
    else if (text(titleCell)) {
      // HARNESS-ONLY fallback (EW5): bare text in the cell — move the text nodes into a <p>
      const p = document.createElement('p');
      p.append(...titleCell.childNodes);
      title.append(p);
    }
    title.querySelectorAll('p, h2, h3, h4, h5, h6').forEach(hideGlyphWord);
    const label = text(title).replace(GLYPH_WORDS, '');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'accordion-toggle';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('aria-label', label);

    const panel = document.createElement('div');
    panel.className = 'accordion-panel';
    panel.id = panelId;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', label);
    if (panelCell) panel.append(...panelCell.childNodes);
    panel.setAttribute('hidden', 'until-found');

    const setOpen = (open) => {
      button.setAttribute('aria-expanded', String(open));
      item.classList.toggle('is-open', open);
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', 'until-found');
    };
    const toggle = () => setOpen(button.getAttribute('aria-expanded') !== 'true');
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    title.addEventListener('click', toggle);
    panel.addEventListener('beforematch', () => setOpen(true));

    item.append(title, button, panel);
    items.push(item);
    fragmentLoads.push(loadPanelFragments(panel));
  });

  block.replaceChildren(...items);
  if (block.classList.contains('tabs')) makeTabs(block, items);
  await Promise.all(fragmentLoads);
}
