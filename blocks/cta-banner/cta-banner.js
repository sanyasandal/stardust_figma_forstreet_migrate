/**
 * cta-banner — M23 CTA Banner (oneAZ v3.2): a full-width white box with the 4px grey border,
 * radius 8 and 40px padding; h3-role mulberry title, body paragraphs and the CTA. An optional
 * leading image sits in a 120px column beside the text.
 *
 * Decode tier: template-slotted (stardust/eds-conversion-log.md, Locked decisions, M23).
 * Visual spec: stardust/reskin/renderers/oneaz.mjs `/* M23 *\/`.
 *
 * Authoring rows: one row, one cell — [picture?, h2, p…, p>strong>a]. Further cells/rows are
 * tolerated and flow into the same box in authored order.
 *
 * Editability (EW1–EW3): authored h*, p, lists and pictures are MOVED into generated
 * wrappers, CTAs move as their paragraph; nothing is cloned, rebuilt or retagged.
 */

function isCta(el) {
  if (el.tagName !== 'P') return false;
  if (el.classList.contains('button-wrapper')) return true;
  const links = el.querySelectorAll('a');
  return links.length === 1 && !!el.querySelector(':scope > :is(strong, em) > a, :scope > a.button')
    && el.textContent.trim() === links[0].textContent.trim();
}

function isPictureOnly(el) {
  if (el.tagName === 'PICTURE' || el.tagName === 'IMG') return true;
  return el.tagName === 'P' && !!el.querySelector('picture, img') && !el.textContent.trim();
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // capture the authored nodes BEFORE moving anything (EW1)
  const nodes = rows.flatMap((row) => [...row.children])
    .flatMap((cell) => [...cell.children]);

  const box = document.createElement('div');
  box.className = 'cta-banner-box';
  const body = document.createElement('div');
  body.className = 'cta-banner-body';

  const first = nodes[0];
  if (first && isPictureOnly(first)) {
    const media = document.createElement('div');
    media.className = 'cta-banner-media';
    media.append(first.tagName === 'P' ? first.querySelector('picture') || first.querySelector('img') : first);
    box.append(media);
    box.classList.add('cta-banner-has-media');
    nodes.shift();
  }

  let actions = null;
  nodes.forEach((node) => {
    if (isCta(node)) {
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'cta-banner-actions';
        body.append(actions);
      }
      actions.append(node);
      return;
    }
    actions = null;
    body.append(node);
  });

  box.append(body);
  block.replaceChildren(box);
}
