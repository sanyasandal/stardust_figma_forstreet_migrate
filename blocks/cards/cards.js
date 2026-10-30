/**
 * cards — M31c Teaser / Card (oneAZ v3.2): a 3-up (or 2-up) grid of mist cards.
 * Decode tier: reconstructive (authors add / remove cards).
 * Schema: stardust/eds-conversion-log.md § Locked decisions, row "M31c Teaser / Card".
 *
 * Authoring shape (content/**): the section head (h2) is default content BEFORE the block.
 * One row per card:  [picture?] [p>a title link, p body…, p "east" arrow glyph]
 *   - picture        → .card-media (full-bleed image at the card top)
 *   - first p>a      → .card-title when body text follows it (Lexia 26/34 accent);
 *                      when nothing but the glyph follows (social posts) it is the body
 *                      (.card-link-text, Inter body-large, ink)
 *   - h2–h4          → .card-title (heading-led cards)
 *   - p "east"       → .card-arrow: the icon-font ligature word stays in the DOM as
 *                      content bytes (D-EDS-2), rendered at font-size 0 + a CSS arrow
 *   - p.button-wrapper / a.button → .card-actions (moved as its paragraph, EW3)
 *   - anything else  → .card-text (leftovers pass — nothing authored is dropped)
 * Grid: 3 columns, 2 for an even card count ≤ 4 (mirrors the reskin renderer's choice).
 *
 * EW1–EW10: every authored element is MOVED into a generated wrapper; text is never
 * rebuilt. The " (opens in new window)" suffix of a title link is split into a
 * visually-hidden span (text node split — textContent unchanged) to match the source,
 * where that phrase is screen-reader-only.
 */

const GLYPHS = ['east', 'arrow_forward', 'keyboard_arrow_right', 'chevron_right'];
const NEW_WINDOW = /\s*\(opens in new window\)\s*$/;

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

// Read-only classification helper (decisions only, never displayed text).
const text = (el) => (el ? el.textContent.trim() : '');

// #62/#104 cell-level collector, scoped to one row: expands a media-led cell that the
// runtime's wrapTextNodes folded into a single <p>.
function collectNodes(row) {
  const out = [];
  [...row.children].forEach((cell) => {
    let kids = [...cell.children];
    if (kids.length === 1 && kids[0].tagName === 'P' && kids[0].children.length
      && kids[0].querySelector('picture, img')) {
      kids = [...kids[0].childNodes].map((n) => {
        if (n.nodeType === 1) return n;
        // HARNESS-ONLY fallback (EW5): move a bare text node into a <p>; never fires on DA.
        if (n.textContent.trim()) {
          const p = document.createElement('p');
          p.append(n);
          return p;
        }
        return null;
      }).filter(Boolean);
    }
    if (kids.length) out.push(...kids);
    else if (cell.textContent.trim()) {
      // HARNESS-ONLY fallback (EW5): wrap the existing text nodes, never copy them.
      const p = document.createElement('p');
      p.append(...cell.childNodes);
      out.push(p);
    }
  });
  return out;
}

const isMedia = (el) => el.matches('picture, img')
  || (el.tagName === 'P' && el.querySelector('picture, img') && !text(el));
const isGlyph = (el) => el.tagName === 'P' && !el.children.length
  && GLYPHS.includes(text(el).toLowerCase());
// a CTA is an author-formatted button (strong/em → a.button.primary|secondary|accent);
// a bare a.button (older runtimes buttonize every lone link) is still a title/link.
const isCta = (el) => el.matches('p.button-wrapper')
  || !!el.querySelector('a.button:is(.primary, .secondary, .accent), :scope > :is(strong, em) > a');
const isLinkPara = (el) => {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && text(links[0]) === text(el);
};

function hideNewWindowSuffix(link) {
  const last = link.lastChild;
  if (!last || last.nodeType !== 3) return;
  const m = last.textContent.match(NEW_WINDOW);
  if (!m || m.index === 0) return;
  const tail = last.splitText(m.index);
  const span = document.createElement('span');
  span.className = 'cards-sr-only';
  tail.before(span);
  span.append(tail);
}

function buildCard(nodes) {
  const card = document.createElement('div');
  card.className = 'card';
  let titled = false;
  nodes.forEach((node, i) => {
    if (isMedia(node) && !card.querySelector(':scope > .card-media')) {
      card.prepend(wrapNode(node, 'card-media'));
      return;
    }
    if (isGlyph(node)) {
      const arrow = wrapNode(node, 'card-arrow');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(arrow);
      return;
    }
    if (isCta(node)) {
      card.append(wrapNode(node, 'card-actions'));
      return;
    }
    if (!titled && /^H[2-6]$/.test(node.tagName)) {
      titled = true;
      card.append(wrapNode(node, 'card-title'));
      return;
    }
    if (!titled && isLinkPara(node)) {
      titled = true;
      const rest = nodes.slice(i + 1).filter((n) => !isGlyph(n) && !isCta(n) && !isMedia(n));
      if (rest.length) {
        hideNewWindowSuffix(node.querySelector('a[href]'));
        card.append(wrapNode(node, 'card-title'));
      } else {
        card.append(wrapNode(node, 'card-link-text'));
      }
      return;
    }
    card.append(wrapNode(node, 'card-text'));
  });
  return card;
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const cards = rows
    .map((row) => collectNodes(row))
    .filter((nodes) => nodes.length)
    .map((nodes) => buildCard(nodes));

  const grid = document.createElement('div');
  const n = cards.length;
  const cols = (n % 3 !== 0 && n <= 4 && n % 2 === 0) ? 2 : 3;
  grid.className = `cards-grid cards-cols-${cols}`;
  grid.append(...cards);
  block.replaceChildren(grid);
}
