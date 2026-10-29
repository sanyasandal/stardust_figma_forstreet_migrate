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
 * EW1–EW10: authored elements are MOVED into generated wrappers; no text is rebuilt.
 */

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
  block.replaceChildren(nav);
}
