/**
 * teaser — M31b Teaser / Text + Image (oneAZ v3.2): two equal columns in the 1180 container,
 * an image column (574x324 cover) and a text column (h3-role title, body-large paragraphs,
 * button at the column foot). Image left or right follows the authored cell order.
 *
 * Decode tier: template-slotted (stardust/eds-conversion-log.md, Locked decisions, M31b).
 * Visual spec: stardust/reskin/renderers/oneaz.mjs `/* M31b *\/`.
 *
 * Authoring rows: one row, two cells in source order —
 *   [picture] [h2|h3, p…, p>strong>a]   or   [h2|h3, p…, p>strong>a] [picture]
 * A cell holding only a picture is the media column; any other cell is a text column.
 * Every cell is optional; extra rows render as further two-column panels.
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

function isMediaCell(cell) {
  const pic = cell.querySelector('picture, img');
  if (!pic) return false;
  return !cell.textContent.trim() && !cell.querySelector('h1, h2, h3, h4, h5, h6, ul, ol, table');
}

function buildMedia(cell) {
  const media = document.createElement('div');
  media.className = 'teaser-media';
  const pic = cell.querySelector('picture') || cell.querySelector('img');
  media.append(pic);
  return media;
}

function buildBody(cell) {
  const body = document.createElement('div');
  body.className = 'teaser-body';
  // capture the authored nodes BEFORE moving anything (EW1)
  const nodes = [...cell.children];
  let actions = null;
  nodes.forEach((node) => {
    if (isCta(node)) {
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'teaser-actions';
        body.append(actions);
      }
      actions.append(node);
      return;
    }
    actions = null;
    body.append(node);
  });
  return body;
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const panels = rows.map((row) => {
    const panel = document.createElement('div');
    panel.className = 'teaser-panel';
    [...row.children].forEach((cell) => {
      if (isMediaCell(cell)) panel.append(buildMedia(cell));
      else if (cell.children.length) panel.append(buildBody(cell));
    });
    if (!panel.querySelector('.teaser-media')) panel.classList.add('teaser-no-media');
    return panel;
  });

  block.replaceChildren(...panels);
}
