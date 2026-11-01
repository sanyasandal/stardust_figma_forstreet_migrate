/**
 * links — M10 Links (oneAZ v3.2): vertical in-page section navigation with a gold rule.
 * Decode tier: reconstructive (authors add / remove / nest items).
 * Schema: stardust/eds-conversion-log.md § Locked decisions, row "M10 Links (in-page nav)".
 *
 * Authoring shape (content/**): one row, one cell:
 *   [h2 "Section navigation", p>a? (top-level parent link), ul > li > a (+ nested ul)]
 *   - the heading      → .links-heading (visually hidden, still the nav's label source)
 *   - a link paragraph → .links-parent (ink item with the rule)
 *   - the list         → .links-list (accent items; an item with children is ink and its
 *                        children are prefixed with an em dash via CSS)
 *   - anything else    → appended in order (nothing dropped)
 * Variants (block options, oneAZ full vocabulary): "Links (tab-nav)" a horizontal tab
 * navigation (M16), "Links (chips)" a row of chips (M7), "Links (pagination)" previous / page /
 * next links (M12). Same authoring shape; the link to the current page is marked
 * aria-current="page" (the active tab, chip or page); "Previous" / "Next" links are tagged for
 * the pagination arrows.
 * EW1–EW10: authored elements are MOVED into generated wrappers; no text is rebuilt.
 */

const PREV = /^(previous|prev|back)$/i;
const NEXT = /^(next|more)$/i;

// The current page, and pagination direction, as attributes / classes: never rewritten text.
function markLinks(nav) {
  const here = window.location.pathname.replace(/\/$/, '') || '/';
  nav.querySelectorAll('a[href]').forEach((a) => {
    let path;
    try { path = new URL(a.href, window.location.href).pathname.replace(/\/$/, '') || '/'; } catch { return; }
    if (path === here && !a.hash) a.setAttribute('aria-current', 'page');
    const label = a.textContent.trim();
    if (PREV.test(label)) a.classList.add('links-prev');
    else if (NEXT.test(label)) a.classList.add('links-next');
  });
}

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const nodes = cells.flatMap((cell) => [...cell.children]);
  if (!nodes.length) return;

  const nav = document.createElement('nav');
  nav.className = 'links-nav';
  let labelled = false;

  nodes.forEach((node) => {
    if (!labelled && /^H[1-6]$/.test(node.tagName)) {
      labelled = true;
      if (!node.id) {
        const n = [...document.querySelectorAll('.links.block')].indexOf(block);
        node.id = `links-heading-${Math.max(n, 0) + 1}`;
      }
      nav.setAttribute('aria-labelledby', node.id);
      nav.append(wrapNode(node, 'links-heading'));
    } else if (node.matches('ul, ol')) {
      nav.append(wrapNode(node, 'links-list'));
    } else if (node.tagName === 'P' && node.querySelector('a[href]')) {
      nav.append(wrapNode(node, 'links-parent'));
    } else {
      nav.append(node);
    }
  });
  if (!labelled) nav.setAttribute('aria-label', 'Section navigation');
  markLinks(nav);
  block.replaceChildren(nav);
}
