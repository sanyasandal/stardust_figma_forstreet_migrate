/**
 * calculator — oneAZ M24 Calculator (new block). Authors define the inputs and the formulas; the
 * kit's three calculators (weight conversion, dosing, risk) are instances of this one block.
 *
 * Authoring: one row per input or result —
 *   input   [label] [unit] [default value]                 e.g.  Weight | kg | 70
 *   result  [label] [= formula] [unit] [decimals]
 *           e.g.  Weight in pounds | = {Weight} * 2.20462 | lb | 1
 * A formula names inputs by label in braces ({Weight}); it may use numbers, + - * / ^, brackets and
 * min max round abs sqrt pow floor ceil. It is parsed by the small evaluator below, never eval'd:
 * an authored formula cannot run code. A formula that does not parse shows "—" and says why in the
 * console. Results update as the inputs change (an aria-live region announces them).
 *
 * EW1–EW10: the authored label paragraphs are MOVED into the slots and label the generated
 * controls (aria-labelledby); units, formulas and decimals are configuration and are not rendered
 * as content except the unit, which stays the authored paragraph.
 */

const text = (el) => (el ? el.textContent.trim() : '');
const norm = (s) => s.replace(/\*$/, '').trim().toLowerCase();
let uid = 0;

// ---- a small, safe arithmetic evaluator (shunting-yard) ----------------------------------
const FUNCS = {
  min: Math.min,
  max: Math.max,
  round: Math.round,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: (a, b) => a ** b,
  floor: Math.floor,
  ceil: Math.ceil,
};
// unary minus binds tighter than * and / but looser than ^ (so -2 ^ 2 is -4)
const PREC = {
  '+': 1, '-': 1, '*': 2, '/': 2, neg: 2.5, '^': 3,
};

function tokenize(src) {
  const tokens = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|\{([^}]+)\}|([a-z]+)|([-+*/^(),]))/gy;
  let m;
  let at = 0;
  while (at < src.length) {
    re.lastIndex = at;
    m = re.exec(src);
    if (!m || m[0].length === 0) {
      if (/^\s*$/.test(src.slice(at))) break;
      throw new Error(`unexpected "${src.slice(at).trim()[0]}"`);
    }
    at = re.lastIndex;
    if (m[1]) tokens.push({ t: 'num', v: Number(m[1]) });
    else if (m[2]) tokens.push({ t: 'ref', v: norm(m[2]) });
    else if (m[3]) {
      if (!FUNCS[m[3]]) throw new Error(`unknown function "${m[3]}"`);
      tokens.push({ t: 'fn', v: m[3] });
    } else tokens.push({ t: 'op', v: m[4] });
  }
  return tokens;
}

function toRpn(tokens) {
  const out = [];
  const ops = [];
  const args = [];
  let prev = null;
  tokens.forEach((tk) => {
    if (tk.t === 'num' || tk.t === 'ref') out.push(tk);
    else if (tk.t === 'fn') { ops.push(tk); args.push(1); } else if (tk.v === '(') ops.push(tk);
    else if (tk.v === ',') {
      while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop());
      args[args.length - 1] += 1;
    } else if (tk.v === ')') {
      while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop());
      if (!ops.length) throw new Error('unbalanced ")"');
      ops.pop();
      if (ops.length && ops[ops.length - 1].t === 'fn') out.push({ ...ops.pop(), n: args.pop() });
    } else {
      const unary = tk.v === '-' && (!prev || (prev.t === 'op' && prev.v !== ')'));
      const op = unary ? { t: 'op', v: 'neg' } : tk;
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.t !== 'op' || top.v === '(') break;
        const right = op.v === '^' || op.v === 'neg';
        if (PREC[top.v] > PREC[op.v] || (PREC[top.v] === PREC[op.v] && !right)) out.push(ops.pop());
        else break;
      }
      ops.push(op);
    }
    prev = tk;
  });
  while (ops.length) {
    const op = ops.pop();
    if (op.v === '(') throw new Error('unbalanced "("');
    out.push(op);
  }
  return out;
}

export function evaluate(formula, values) {
  const rpn = toRpn(tokenize(formula.replace(/^\s*=/, '')));
  const st = [];
  rpn.forEach((tk) => {
    if (tk.t === 'num') st.push(tk.v);
    else if (tk.t === 'ref') {
      if (!(tk.v in values)) throw new Error(`no input labelled "${tk.v}"`);
      st.push(values[tk.v]);
    } else if (tk.t === 'fn') st.push(FUNCS[tk.v](...st.splice(st.length - tk.n, tk.n)));
    else if (tk.v === 'neg') st.push(-st.pop());
    else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new Error('missing operand');
      st.push({
        '+': a + b, '-': a - b, '*': a * b, '/': a / b, '^': a ** b,
      }[tk.v]);
    }
  });
  if (st.length !== 1) throw new Error('incomplete formula');
  return st[0];
}

// ---- the block ----------------------------------------------------------------------------
function slot(labelEl, unitEl, control) {
  const wrap = document.createElement('div');
  wrap.className = 'calculator-slot';
  const head = document.createElement('div');
  head.className = 'calculator-label';
  if (labelEl) head.append(labelEl);
  const field = document.createElement('div');
  field.className = 'calculator-field';
  field.append(control);
  if (unitEl) {
    unitEl.classList.add('calculator-unit');
    field.append(unitEl);
  }
  wrap.append(head, field);
  return wrap;
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;
  const inputs = [];
  const results = [];
  const inputGrid = document.createElement('div');
  inputGrid.className = 'calculator-inputs';
  const resultGrid = document.createElement('div');
  resultGrid.className = 'calculator-results';
  resultGrid.setAttribute('aria-live', 'polite');

  rows.forEach((row) => {
    const cells = [...row.children];
    const labelEl = cells[0]?.querySelector('p, h2, h3, h4') || null;
    const second = text(cells[1]);
    uid += 1;
    if (labelEl) labelEl.id = `calculator-label-${uid}`;
    if (second.startsWith('=')) {
      const out = document.createElement('output');
      out.className = 'calculator-output';
      if (labelEl) out.setAttribute('aria-labelledby', labelEl.id);
      const unitEl = cells[2]?.querySelector('p') || null;
      results.push({ out, formula: second, decimals: Number.parseInt(text(cells[3]), 10) });
      resultGrid.append(slot(labelEl, unitEl, out));
      return;
    }
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.inputMode = 'decimal';
    if (text(cells[2]) !== '') input.value = text(cells[2]);
    if (labelEl) input.setAttribute('aria-labelledby', labelEl.id);
    inputs.push({ input, key: norm(text(labelEl)) });
    inputGrid.append(slot(labelEl, cells[1]?.querySelector('p') || null, input));
  });

  const update = () => {
    const values = Object.fromEntries(inputs
      .map(({ input, key }) => [key, Number.parseFloat(input.value)]));
    results.forEach(({ out, formula, decimals }) => {
      try {
        const v = evaluate(formula, values);
        out.value = Number.isFinite(v) ? v.toFixed(Number.isNaN(decimals) ? 2 : decimals) : '—';
      } catch (e) {
        out.value = '—';
        // eslint-disable-next-line no-console
        console.warn(`calculator: ${formula}: ${e.message}`);
      }
    });
  };
  inputs.forEach(({ input }) => input.addEventListener('input', update));
  block.replaceChildren(inputGrid, resultGrid);
  update();
}
