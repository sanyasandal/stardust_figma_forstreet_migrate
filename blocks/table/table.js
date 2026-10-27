/**
 * table — oneAZ M18 Tables (Block Collection table, reconstructive decode).
 *
 * Authoring shape (stardust/eds-conversion-log.md, M18): one row per table row, one cell per
 * column; the first row is the header row (th, label type on the mist band). Variant
 * `table (no-header)` renders every row as data cells.
 * Defensive decode: a row with no content at all (an empty spacer row) is skipped; a row
 * with fewer cells than the widest row spans its last cell across the remainder.
 *
 * Experience Workspace (EW1): every cell's authored nodes (the runtime's wrapTextNodes <p>)
 * MOVE into the generated <th>/<td>; nothing is copied or rebuilt.
 */

const hasContent = (cell) => !!(cell.textContent.trim() || cell.querySelector('picture, img'));

export default async function decorate(block) {
  const rows = [...block.children].filter((row) => [...row.children].some(hasContent));
  if (!rows.length) return;
  const noHeader = block.classList.contains('no-header');
  const cols = Math.max(...rows.map((row) => row.children.length));

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  rows.forEach((row, i) => {
    const header = !noHeader && i === 0;
    const tr = document.createElement('tr');
    const cells = [...row.children];
    cells.forEach((cell, c) => {
      const el = document.createElement(header ? 'th' : 'td');
      if (header) el.scope = 'col';
      if (c === cells.length - 1 && cells.length < cols) el.colSpan = cols - cells.length + 1;
      el.append(...cell.childNodes);
      tr.append(el);
    });
    (header ? thead : tbody).append(tr);
  });

  if (thead.children.length) table.append(thead);
  table.append(tbody);
  block.replaceChildren(table);
}
