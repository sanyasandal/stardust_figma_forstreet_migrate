/**
 * breadcrumbs — M4 Breadcrumb (oneAZ v3.2): Home ▸ section ▸ current page, inline trail.
 * Decode tier: template-slotted (one fixed slot: the trail list).
 * Schema: stardust/eds-conversion-log.md § Locked decisions, row "M4 Breadcrumb".
 *
 * Authoring shape (content/**): one row, one cell:
 *   [ul > li > a …, li current-page text (no href)]
 * The authored <ul> is MOVED into a <nav aria-label="Breadcrumb"> (EW1; a list is one
 * editable unit, EW5). The last item gets aria-current="page"; when it is plain text,
 * its text nodes are moved (never copied) into an href-less <a> — the source's DOM for
 * the current page — so the list's textContent is unchanged. Separators are CSS
 * (li + li::before), so the trail's innerText stays tight-joined ("HomeAbout us").
 * Anything else authored in the cell is appended after the list (nothing dropped).
 */

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const nodes = cells.flatMap((cell) => [...cell.children]);
  const list = nodes.find((n) => n.matches('ul, ol'));

  const nav = document.createElement('nav');
  nav.className = 'breadcrumbs-trail';
  nav.setAttribute('aria-label', 'Breadcrumb');

  if (list) {
    const items = list.querySelectorAll(':scope > li');
    // The delivered list (DA → markdown → HTML) carries newline text nodes between and around
    // the items; in this inline trail they would render as spaces the source never had
    // ("Home About us" vs "HomeAbout us"). They are markup whitespace, not authored text.
    const dropWhitespace = (el) => [...el.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()) n.remove();
    });
    dropWhitespace(list);
    items.forEach(dropWhitespace);
    const current = items[items.length - 1];
    if (current) {
      let link = current.querySelector('a');
      if (!link && current.textContent.trim()) {
        // the current page is authored as plain text: MOVE its nodes into an href-less
        // placeholder <a> (same DOM as the source's current-page link; text unchanged)
        link = document.createElement('a');
        link.append(...current.childNodes);
        current.append(link);
      }
      (link || current).setAttribute('aria-current', 'page');
    }
  }
  nav.append(...nodes);
  block.replaceChildren(nav);
}
