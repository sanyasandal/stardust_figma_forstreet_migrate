/**
 * form — oneAZ M26 Forms (new block), with variants "Form (login)" (M30 Login) and "Form (steps)"
 * (M32 Quiz with the M15 Stepper). The form controls (M9 Input, M8 Dropdown, M6 Checkbox / Radio,
 * M19 Toggle, M14 Slider, M20 Tooltip) are drawn by this block and styles.css § form fields.
 *
 * Authoring: one row per field — [label] [type] [options | placeholder | min-max] [help] [tooltip]
 *   label    the field's label paragraph; a trailing "*" marks it required
 *   type     text email password tel number date textarea select checkbox radio toggle range
 *            submit (label = button text); and the structure rows:
 *            step     starts a step (Form (steps)); label = the step title, cell 3 = its intro
 *            heading  a title inside the form (Form (login): the card title)
 *            link     a link line (label holds the link): a "right side" or footer link
 *            action   cell 3 = the URL submissions are POSTed to (JSON); without one the form is
 *                     front-end only and shows its success message
 *            success  the message shown after a successful submit
 *   options  a list (ul / ol) or comma-separated text; range takes "min-max" (and "step n")
 * Two consecutive single-line fields share a line on desktop (the kit's 570 + 570 rows).
 *
 * EW1–EW10: every authored paragraph (labels, help, intro, success, links) is MOVED into the
 * generated structure and kept as the element it is; inputs are generated controls labelled by
 * those paragraphs (aria-labelledby), so no authored text is rebuilt.
 */

const FIELD_TYPES = ['text', 'email', 'password', 'tel', 'number', 'date', 'textarea', 'select',
  'checkbox', 'radio', 'toggle', 'range', 'submit'];
const WIDE = ['textarea', 'checkbox', 'radio', 'toggle', 'range', 'submit'];

const text = (el) => (el ? el.textContent.trim() : '');
const slug = (s) => s.toLowerCase().replace(/\*$/, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'field';
let uid = 0;
const nextId = (base) => { uid += 1; return `form-${base}-${uid}`; };

// the cell's authored element (a paragraph or list), or the bare text wrapped once (harness-only)
function cellNodes(cell) {
  if (!cell) return [];
  if (cell.children.length) return [...cell.children];
  if (!text(cell)) return [];
  const p = document.createElement('p');
  p.append(...cell.childNodes);
  return [p];
}

function options(cell) {
  if (!cell) return [];
  const list = cell.querySelector('ul, ol');
  if (list) return [...list.children].map((li) => text(li)).filter(Boolean);
  return text(cell).split(',').map((s) => s.trim()).filter(Boolean);
}

function markRequired(labelEl) {
  // a trailing "*" in the authored label: keep the text, style the star (split the text node)
  const walker = document.createTreeWalker(labelEl, NodeFilter.SHOW_TEXT);
  let last = null;
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) last = walker.currentNode;
  if (!last || !/\*\s*$/.test(last.textContent)) return false;
  const at = last.textContent.lastIndexOf('*');
  const star = last.splitText(at);
  const span = document.createElement('span');
  span.className = 'form-required';
  star.after(span);
  span.append(star);
  return true;
}

function tooltip(cell) {
  const tip = cellNodes(cell)[0];
  if (!tip) return null;
  const wrap = document.createElement('span');
  wrap.className = 'form-tooltip';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'form-tooltip-toggle';
  button.setAttribute('aria-label', 'More information');
  tip.classList.add('form-tooltip-text');
  tip.id = nextId('tip');
  tip.setAttribute('role', 'tooltip');
  button.setAttribute('aria-describedby', tip.id);
  wrap.append(button, tip);
  return wrap;
}

function control(type, name, id, opts, extra, required) {
  if (type === 'textarea') {
    const t = document.createElement('textarea');
    Object.assign(t, {
      name, id, required, rows: 4,
    });
    if (extra) t.placeholder = extra;
    return t;
  }
  if (type === 'select') {
    const s = document.createElement('select');
    Object.assign(s, { name, id, required });
    const first = document.createElement('option');
    first.value = '';
    first.textContent = extra && !opts.length ? extra : 'Select an option';
    s.append(first, ...opts.map((o) => {
      const op = document.createElement('option');
      op.value = o;
      op.textContent = o;
      return op;
    }));
    return s;
  }
  if (type === 'range') {
    const r = document.createElement('input');
    const m = String(extra || '').match(/(-?[\d.]+)\s*-\s*(-?[\d.]+)(?:.*step\s*([\d.]+))?/i);
    Object.assign(r, {
      type: 'range', name, id, min: m ? m[1] : 0, max: m ? m[2] : 100, step: m && m[3] ? m[3] : 1,
    });
    return r;
  }
  const i = document.createElement('input');
  Object.assign(i, {
    type, name, id, required,
  });
  if (extra) i.placeholder = extra;
  return i;
}

// a checkbox / radio / toggle: the native input (visually hidden) + the drawn box, then its text
function choice(type, name, value, labelText, required) {
  const label = document.createElement('label');
  label.className = `form-choice form-choice-${type}`;
  const input = document.createElement('input');
  Object.assign(input, {
    type: type === 'toggle' ? 'checkbox' : type, name, value, required,
  });
  if (type === 'toggle') input.setAttribute('role', 'switch');
  const mark = document.createElement('span');
  mark.className = 'form-mark';
  mark.setAttribute('aria-hidden', 'true');
  label.append(input, mark);
  if (labelText) {
    const span = document.createElement('span');
    // an option value from the options cell (configuration), not an authored paragraph
    span.textContent = labelText;
    label.append(span);
  }
  return label;
}

function buildField(type, cells) {
  const [labelCell, , optCell, helpCell, tipCell] = cells;
  const field = document.createElement('div');
  field.className = `form-field form-field-${type}${WIDE.includes(type) ? ' form-wide' : ''}`;
  const labelEl = cellNodes(labelCell)[0] || null;
  const name = slug(text(labelEl));
  const id = nextId(name);
  const required = labelEl ? markRequired(labelEl) : false;
  if (type === 'submit') {
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'button primary';
    if (labelEl) button.append(...labelEl.childNodes);
    field.append(button);
    return field;
  }
  const head = document.createElement('div');
  head.className = 'form-label';
  if (labelEl) {
    labelEl.id = nextId('label');
    head.append(labelEl);
  }
  const tip = tooltip(tipCell);
  if (tip) head.append(tip);
  const help = cellNodes(helpCell)[0];
  if (help) {
    help.classList.add('form-help');
    help.id = nextId('help');
  }
  const opts = options(optCell);
  let body;
  if (['checkbox', 'radio', 'toggle'].includes(type) && (opts.length || type === 'radio')) {
    body = document.createElement('div');
    body.className = 'form-choices';
    body.setAttribute('role', type === 'radio' ? 'radiogroup' : 'group');
    if (labelEl) body.setAttribute('aria-labelledby', labelEl.id);
    body.append(...opts.map((o) => choice(type, name, o, o, required && type === 'radio')));
    field.append(head, ...(help ? [help] : []), body);
    return field;
  }
  if (['checkbox', 'toggle'].includes(type)) {
    // a single choice: the authored label paragraph is its text (moved inside the clickable row)
    const row = choice(type, name, 'on', '', required);
    if (labelEl) {
      row.querySelector('input').setAttribute('aria-labelledby', labelEl.id);
      row.append(labelEl);
    }
    field.append(row, ...(help ? [help] : []));
    if (tip) field.append(tip);
    return field;
  }
  // cell 3 is the options (select), the "min-max" (range) or the placeholder (text fields)
  const extra = opts.length && type === 'select' ? '' : text(optCell);
  body = control(type, name, id, type === 'select' ? opts : [], extra, required);
  if (labelEl) body.setAttribute('aria-labelledby', labelEl.id);
  if (help) body.setAttribute('aria-describedby', help.id);
  field.append(head, ...(help ? [help] : []), body);
  return field;
}

// Form (steps): one fieldset per step, the stepper bar, Back / Next; the last step submits
function makeSteps(form, steps, submitField) {
  const bar = document.createElement('div');
  bar.className = 'form-stepper';
  const fill = document.createElement('span');
  fill.className = 'form-stepper-fill';
  const count = document.createElement('span');
  count.className = 'form-stepper-count';
  fill.append(count);
  bar.append(fill);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '1');
  bar.setAttribute('aria-valuemax', String(steps.length));
  const nav = document.createElement('div');
  nav.className = 'form-step-nav';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'button secondary';
  back.textContent = 'Back';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'button primary';
  next.textContent = 'Next';
  nav.append(back, next);
  if (submitField) nav.append(submitField);
  let at = 0;
  const show = (k) => {
    at = k;
    steps.forEach((s, j) => { s.hidden = j !== k; });
    fill.style.width = `${((k + 1) / steps.length) * 100}%`;
    count.textContent = `${k + 1}/${steps.length}`;
    bar.setAttribute('aria-valuenow', String(k + 1));
    back.hidden = k === 0;
    next.hidden = k === steps.length - 1;
    if (submitField) submitField.hidden = k !== steps.length - 1;
  };
  back.addEventListener('click', () => show(Math.max(0, at - 1)));
  next.addEventListener('click', () => {
    const invalid = [...steps[at].querySelectorAll('input, select, textarea')]
      .find((el) => !el.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    show(Math.min(steps.length - 1, at + 1));
  });
  form.prepend(bar);
  form.append(nav);
  show(0);
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;
  const form = document.createElement('form');
  form.className = 'form-body';
  form.noValidate = false;
  const footer = document.createElement('div');
  footer.className = 'form-footer';
  let action = '';
  let success = null;
  let submitField = null;
  const steps = [];
  const titles = [];
  const kept = []; // the cells of a row whose type is not a field: authored content, kept as-is
  let target = document.createElement('div');
  target.className = 'form-fields';
  form.append(target);

  rows.forEach((row) => {
    const cells = [...row.children];
    const type = text(cells[1]).toLowerCase();
    if (type === 'action') { action = text(cells[2]) || text(cells[0]); return; }
    if (type === 'success') { success = cellNodes(cells[0])[0] || null; return; }
    if (type === 'step') {
      const fs = document.createElement('fieldset');
      fs.className = 'form-step';
      const legend = document.createElement('legend');
      legend.className = 'form-step-title';
      const title = cellNodes(cells[0])[0];
      if (title) legend.append(title);
      fs.append(legend, ...cellNodes(cells[2]).map((el) => { el.classList.add('form-step-intro'); return el; }));
      target = document.createElement('div');
      target.className = 'form-fields';
      fs.append(target);
      form.append(fs);
      steps.push(fs);
      return;
    }
    if (type === 'heading') {
      const h = cellNodes(cells[0])[0];
      if (h) { h.classList.add('form-title'); titles.push(h); }
      return;
    }
    if (type === 'link') {
      const line = document.createElement('div');
      line.className = 'form-link';
      line.append(...cellNodes(cells[0]));
      (block.classList.contains('login') ? footer : target).append(line);
      return;
    }
    if (!FIELD_TYPES.includes(type)) { kept.push(...cells.flatMap(cellNodes)); return; }
    const field = buildField(type, cells);
    if (type === 'submit' && block.classList.contains('steps')) { submitField = field; return; }
    target.append(field);
  });

  if (block.classList.contains('steps') && steps.length) {
    form.querySelector(':scope > .form-fields:empty')?.remove();
    makeSteps(form, steps, submitField);
  }

  const status = document.createElement('div');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  if (success) { success.hidden = true; status.append(success); }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form).entries());
    form.setAttribute('aria-busy', 'true');
    try {
      if (action) {
        const res = await fetch(action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      form.hidden = true;
      if (success) success.hidden = false;
    } catch (err) {
      status.dataset.error = 'true';
      status.textContent = 'Sorry, the form could not be sent. Please try again.';
    } finally {
      form.removeAttribute('aria-busy');
    }
  });

  const tail = footer.children.length ? [footer] : [];
  block.replaceChildren(...titles, form, status, ...tail, ...kept);
}
