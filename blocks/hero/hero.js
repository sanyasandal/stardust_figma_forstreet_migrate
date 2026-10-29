/**
 * hero — M31 Teaser / Home Hero (oneAZ v3.2): a full-bleed 480px image band under a dark
 * overlay, the heading, lede and CTA vertically centred in the 1180 container.
 *
 * Decode tier: template-slotted (stardust/eds-conversion-log.md, Locked decisions, M31).
 * Visual spec: stardust/reskin/renderers/oneaz.mjs `/* M31 *\/`.
 *
 * Authoring rows (positional, cells optional and tolerated in any order):
 *   1. <picture> — the band image (rendered as a cover layer behind the overlay)
 *   2. <h1> heading · <p> lede … · <p><strong><a>CTA</a></strong></p>
 *      (decorateButtons() has already made the CTA a.button.primary in p.button-wrapper)
 *
 * Editability (EW1–EW3): every authored h*, p and picture is MOVED into generated wrappers,
 * CTAs move as their paragraph; nothing is cloned, rebuilt or retagged.
 */

function isCta(el) {
  if (el.tagName !== 'P') return false;
  if (el.classList.contains('button-wrapper')) return true;
  const links = el.querySelectorAll('a');
  return links.length === 1 && !!el.querySelector(':scope > :is(strong, em) > a, :scope > a.button')
    && el.textContent.trim() === links[0].textContent.trim();
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const picture = block.querySelector('picture') || block.querySelector('img');

  const media = document.createElement('div');
  media.className = 'hero-media';
  const content = document.createElement('div');
  content.className = 'hero-content';
  const body = document.createElement('div');
  body.className = 'hero-body';
  content.append(body);

  if (picture) {
    media.append(picture);
    const img = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.setAttribute('fetchpriority', 'high');
    }
  }

  // capture the authored nodes BEFORE moving anything (EW1)
  const nodes = rows.flatMap((row) => [...row.children])
    .flatMap((cell) => [...cell.children]);

  let actions = null;
  nodes.forEach((node) => {
    // a paragraph left empty by the picture move carries no authored text
    if (node.tagName === 'P' && !node.textContent.trim() && !node.querySelector('picture, img')) return;
    if (node.tagName === 'PICTURE' || node.tagName === 'IMG') return;
    if (isCta(node)) {
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'hero-actions';
        body.append(actions);
      }
      actions.append(node);
      return;
    }
    actions = null;
    body.append(node);
  });

  block.replaceChildren(...(picture ? [media] : []), content);
}
