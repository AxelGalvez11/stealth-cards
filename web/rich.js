// Card text formatting, shared by the card editor, the cards in review, the deck lists, and search.
// design/build.mjs copies makeRich() into the canvas boards, so the canvas shows the same thing.
//
// A card keeps its text as short markdown, so AI apps can read and write it:
//   **bold**  *italic*  <u>underline</u>  ~~strikethrough~~  ==highlight==  $math$ or \(math\)
//   [[blank]] on fill-in-the-blank cards; a line can start with "# " (heading, also ## and ###),
//   "- " (bullet), or "1. " (numbered).
// (<b>, <i>, <s> and <mark> read too; they're written when a style starts or ends on a space.)
// While editing, text is lines of runs: [{ kind, runs: [{ t, m }] }]. kind is '' (text), h1, h2, h3, li, or ol.
// m is the run's marks, in this order: k blank, h highlight, s strikethrough, u underline, i italic, b bold, m math.
export function makeRich() {
  const ORDER = 'khsuibm', WS = /\s/, WORD = /[\p{L}\p{N}_]/u, PUNCT = /[!-/:-@[-`{-~]/;
  const norm = m => [...new Set(m)].filter(c => ORDER.includes(c)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('');
  const tidy = runs => {
    const out = [];
    for (const r of runs) { if (!r.t) continue; const p = out[out.length - 1]; if (p && p.m === r.m) p.t += r.t; else out.push({ t: r.t, m: r.m }); }
    return out;
  };

  // ---------- reading ----------
  const TAGS = [['b', /^<(?:b|strong)>/i, /^<\/(?:b|strong)>/i], ['i', /^<(?:i|em)>/i, /^<\/(?:i|em)>/i], ['u', /^<u>/i, /^<\/u>/i],
    ['s', /^<(?:s|del|strike)>/i, /^<\/(?:s|del|strike)>/i], ['h', /^<mark>/i, /^<\/mark>/i]];
  // $x$ is math when the $ hugs the formula: "$5 and $6" stays money.
  function mathEnd(s, i) {
    if (!s[i + 1] || WS.test(s[i + 1]) || s[i + 1] === '$') return -1;
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === '$' && !WS.test(s[j - 1]) && !/\d/.test(s[j + 1] || '')) return j;
    }
    return -1;
  }
  function inline(s, cloze) {
    const toks = [];
    let buf = '';
    const flush = () => { if (buf) toks.push({ k: 'x', v: buf }); buf = ''; };
    for (let i = 0; i < s.length;) {
      const c = s[i], two = s.substr(i, 2);
      if (two === '\\(') { const j = s.indexOf('\\)', i + 2); if (j > i + 2) { flush(); toks.push({ k: 'm', v: s.slice(i + 2, j) }); i = j + 2; continue; } }
      if (c === '\\' && i + 1 < s.length && PUNCT.test(s[i + 1])) { buf += s[i + 1]; i += 2; continue; }
      if (c === '$') { const j = mathEnd(s, i); if (j > 0) { flush(); toks.push({ k: 'm', v: s.slice(i + 1, j).replace(/\\\$/g, '$') }); i = j + 1; continue; } }
      if (c === '<') {
        const rest = s.slice(i);
        let hit = null;
        for (const [m, o, cl] of TAGS) { const r = rest.match(o) || rest.match(cl); if (r) { hit = { m, role: o.test(r[0]) ? 'open' : 'close', raw: r[0] }; break; } }
        if (hit) { flush(); toks.push({ k: 'd', ...hit }); i += hit.raw.length; continue; }
      }
      if (cloze && (two === '[[' || two === ']]')) { flush(); toks.push({ k: 'd', m: 'k', role: two === '[[' ? 'open' : 'close', raw: two }); i += 2; continue; }
      const d = two === '**' ? 'b' : two === '~~' ? 's' : two === '==' ? 'h' : c === '*' ? 'i' : '';
      if (d) { const n = d === 'i' ? 1 : 2; flush(); toks.push({ k: 'd', m: d, role: 'tog', raw: s.substr(i, n), pre: s[i - 1] || '', post: s[i + n] || '' }); i += n; continue; }
      buf += c; i++;
    }
    flush();
    // Pair each style's start with its end. A start with no end is just text ("5 * 3").
    const open = {};
    toks.forEach((t, n) => {
      if (t.k !== 'd') return;
      const o = open[t.m];
      if (t.role === 'open') { if (o == null) open[t.m] = n; return; }
      if (t.role === 'close') { if (o != null) { t.on = toks[o].on = true; open[t.m] = null; } return; }
      if (o == null) { if (t.post && !WS.test(t.post)) open[t.m] = n; }
      else if (t.pre && !WS.test(t.pre)) { t.on = toks[o].on = true; open[t.m] = null; }
    });
    const runs = [], on = new Set();
    for (const t of toks) {
      const m = [...on].join('');
      if (t.k === 'x') runs.push({ t: t.v, m: norm(m) });
      else if (t.k === 'm') runs.push({ t: t.v, m: norm(m + 'm') });
      else if (!t.on) runs.push({ t: t.raw, m: norm(m) });
      else if (on.has(t.m)) on.delete(t.m);
      else on.add(t.m);
    }
    return tidy(runs);
  }
  const LEAD = [[/^#\s+/, 'h1'], [/^##\s+/, 'h2'], [/^###\s+/, 'h3'], [/^\s*[-*+]\s+/, 'li'], [/^\s*\d{1,3}[.)]\s+/, 'ol']];
  function parse(md, cloze) {
    return String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n').map(line => {
      for (const [re, kind] of LEAD) { const b = re.exec(line); if (b) return { kind, runs: inline(line.slice(b[0].length), !!cloze) }; }
      return { kind: '', runs: inline(line, !!cloze) };
    });
  }

  // ---------- writing ----------
  const MD = { b: ['**', '**'], i: ['*', '*'], s: ['~~', '~~'], h: ['==', '=='], u: ['<u>', '</u>'], k: ['[[', ']]'] };
  const TAG = { b: ['<b>', '</b>'], i: ['<i>', '</i>'], s: ['<s>', '</s>'], h: ['<mark>', '</mark>'], u: ['<u>', '</u>'], k: ['[[', ']]'] };
  const escText = (t, safe) => {
    const s = t.replace(/[\\*$]/g, '\\$&');
    return safe ? s.replace(/[~=<[\]]/g, '\\$&') : s.replace(/~~/g, '\\~\\~').replace(/==/g, '\\=\\=').replace(/<(?=\/?(?:b|strong|i|em|u|s|del|strike|mark)>)/gi, '\\<');
  };
  const mathOut = (t, safe) => (!safe && /^[^\s$](?:[^$]*[^\s$])?$/.test(t) ? '$' + t + '$' : '\\(' + t + '\\)');
  function writeLine(l, safe) {
    // Open and close styles around the runs, closing only what has to close. A blank is always
    // outermost, so a style changing inside it never splits it in two.
    const ev = [];
    let stack = [];
    for (const r of l.runs) {
      const has = [...r.m.replace('m', '')];
      const want = [...has.filter(m => m === 'k'), ...stack.filter(m => m !== 'k' && has.includes(m)), ...has.filter(m => m !== 'k' && !stack.includes(m))];
      let p = 0;
      while (p < stack.length && p < want.length && stack[p] === want[p]) p++;
      for (let q = stack.length - 1; q >= p; q--) ev.push({ close: stack[q] });
      stack = stack.slice(0, p);
      for (const m of want.slice(p)) { ev.push({ open: m }); stack.push(m); }
      ev.push({ run: r });
    }
    for (let q = stack.length - 1; q >= 0; q--) ev.push({ close: stack[q] });
    // A style that starts or ends on a space is written as a tag: "**x **" wouldn't read back.
    const form = [], opens = [];
    ev.forEach((e, n) => {
      if (e.open) opens.push(n);
      else if (e.close) {
        const o = opens.pop(), txt = ev.slice(o + 1, n).filter(x => x.run).map(x => x.run.t).join('');
        form[o] = form[n] = safe || /^\s|\s$/.test(txt) ? TAG : MD;
      }
    });
    return ev.map((e, n) => (e.open ? form[n][e.open][0] : e.close ? form[n][e.close][1] : e.run.m.includes('m') ? mathOut(e.run.t, safe) : escText(e.run.t, safe))).join('');
  }
  const same = (a, b) => a.length === b.length && a.every((l, i) => (l.kind || '') === (b[i].kind || '') && JSON.stringify(tidy(l.runs)) === JSON.stringify(tidy(b[i].runs)));
  // Text that only looks like a heading or a list ("# 1" or "1. ") gets a backslash so it stays text.
  const plainStart = s => s.replace(/^(\s*)([-+]|#{1,3})(?=\s)/, (m, sp, x) => sp + '\\' + x).replace(/^(\s*\d{1,3})([.)])(?=\s)/, (m, d, x) => d + '\\' + x);
  function write(lines, cloze) {
    const go = safe => { let n = 0; return lines.map(l => { n = l.kind === 'ol' ? n + 1 : 0; const body = writeLine(l, safe); return l.kind ? prefix(l.kind, n) + body : plainStart(body); }).join('\n'); };
    const md = go(false);
    return same(parse(md, cloze), lines) ? md : go(true);
  }
  const prefix = (kind, n) => ({ h1: '# ', h2: '## ', h3: '### ', li: '- ', ol: n + '. ' })[kind] || '';

  // ---------- plain text ----------
  // Runs grouped into blanks and the text between them.
  function groups(runs) {
    const out = [];
    for (const r of runs) {
      const k = r.m.includes('k'), p = out[out.length - 1];
      if (p && p.blank === k) { p.runs.push(r); p.text += r.t; } else out.push({ blank: k, runs: [r], text: r.t });
    }
    return out;
  }
  // o.blank replaces each blank (like "____"); o.join joins the lines (default a line break);
  // o.math: 'show' writes formulas as they look (π r²) instead of as typed (\pi r^2).
  const runText = (r, o) => (o.math === 'show' && r.m.includes('m') ? mathText(r.t) : r.t);
  const plain = (md, o = {}) => parse(md, !!o.cloze).map(l => groups(l.runs).map(g => (g.blank && o.blank != null ? o.blank : g.runs.map(r => runText(r, o)).join(''))).join('')).join(o.join == null ? '\n' : o.join);
  const blanks = (md, o = {}) => parse(md, true).flatMap(l => groups(l.runs).filter(g => g.blank).map(g => g.runs.map(r => runText(r, o)).join('')));
  const plainLines = lines => { let n = 0; return lines.map(l => { n = l.kind === 'ol' ? n + 1 : 0; return prefix(l.kind, n) + l.runs.map(r => r.t).join(''); }).join('\n'); };

  // ---------- showing ----------
  // How each kind of line looks. Headings are sized from the text around them.
  const LINE = { li: 'display: list-item; list-style: disc outside; margin-left: 1.15em;',
    h1: 'font-size: 1.35em; font-weight: 700; line-height: 1.25; letter-spacing: -.02em;', h2: 'font-size: 1.18em; font-weight: 700; line-height: 1.3; letter-spacing: -.015em;',
    h3: 'font-size: 1.05em; font-weight: 600; line-height: 1.35;' };
  const lineCss = (kind, n) => (kind === 'ol' ? "display: list-item; list-style-type: '" + n + ". '; margin-left: 1.5em;" : LINE[kind] || '');
  const numbered = lines => { let n = 0; return lines.map(l => (n = l.kind === 'ol' ? n + 1 : 0)); };
  const MATH_FONT = "font-family: Georgia, 'Times New Roman', serif;";
  const hl = o => (o.dark ? '#2F3D9A' : '#DCE0FD');
  function css(m, o, edit) {
    let s = '';
    if (m.includes('b')) s += 'font-weight: 700; ';
    if (m.includes('i')) s += 'font-style: italic; ';
    const d = [m.includes('u') && 'underline', m.includes('s') && 'line-through'].filter(Boolean).join(' ');
    if (d) s += 'text-decoration: ' + d + '; text-underline-offset: .15em; ';
    if (m.includes('h')) s += 'background: ' + hl(o) + '; ';
    if (m.includes('m') && edit) s += MATH_FONT + ' background: ' + (o.t ? o.t.surf2 : '#E8E8E8') + '; border-radius: 6px; padding: 0 4px; ';
    return s.trim();
  }
  // Math reads like a formula on the card: x^2 → x², \frac{a}{b} → a⁄b, \alpha → α, <= → ≤.
  const SYM = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ',
    Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠',
    neq: '≠', approx: '≈', equiv: '≡', sim: '∼', propto: '∝', infty: '∞', partial: '∂', nabla: '∇', sum: '∑', prod: '∏', int: '∫', oint: '∮', to: '→', rightarrow: '→', leftarrow: '←',
    gets: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔', Leftrightarrow: '⇔', implies: '⇒', iff: '⇔', in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆',
    supset: '⊃', supseteq: '⊇', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', wedge: '∧', lor: '∨', vee: '∨', angle: '∠',
    circ: '∘', degree: '°', perp: '⊥', parallel: '∥', ldots: '…', cdots: '⋯', dots: '…', prime: '′', hbar: 'ℏ', ell: 'ℓ', aleph: 'ℵ', langle: '⟨', rangle: '⟩', mid: '∣',
    star: '⋆', oplus: '⊕', otimes: '⊗', quad: '\u2003', qquad: '\u2003\u2003', ',': '\u2009', ';': '\u2005', ':': '\u2005', ' ': ' ', '!': '', '{': '{', '}': '}', '%': '%',
    $: '$', '#': '#', '&': '&', _: '_', '\\': '\\' };
  const WORDS = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'min', 'max', 'det', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'gcd', 'mod'];
  const ASCII = { '<=': '≤', '>=': '≥', '!=': '≠', '->': '→', '<-': '←', '=>': '⇒', '+-': '±' };
  function mathBits(s, pos, over, out) {
    for (let i = 0; i < s.length;) {
      const arg = () => {
        while (s[i] === ' ') i++;
        if (s[i] === '{') { let d = 1, j = i + 1; for (; j < s.length && d; j++) d += s[j] === '{' ? 1 : s[j] === '}' ? -1 : 0; const r = s.slice(i + 1, d ? j : j - 1); i = j; return r; }
        if (s[i] === '\\') { const m = /^\\([A-Za-z]+|.)/.exec(s.slice(i)); i += m ? m[0].length : 1; return m ? m[0] : ''; }
        return s[i++] || '';
      };
      const c = s[i];
      if (c === '^' || c === '_') { i++; mathBits(arg(), pos || (c === '^' ? 'sup' : 'sub'), over, out); continue; }
      if (c === '{' || c === '}') { i++; continue; }
      if (c === '\\') {
        const m = /^\\([A-Za-z]+|.)/.exec(s.slice(i)) || ['\\', ''];
        i += m[0].length;
        const n = m[1];
        if (n === 'sqrt') { out.push({ t: '√', pos, over }); mathBits(arg(), pos, true, out); continue; }
        if (n === 'frac') { const a = arg(), b = arg(); mathBits(a, pos || 'sup', over, out); out.push({ t: '⁄', pos, over }); mathBits(b, pos || 'sub', over, out); continue; }
        if (/^(text|mathrm|textrm|operatorname)$/.test(n)) { out.push({ t: arg(), pos, over }); continue; }
        if (/^(mathbf|textbf|boldsymbol)$/.test(n)) { const from = out.length; mathBits(arg(), pos, over, out); for (let q = from; q < out.length; q++) out[q].bold = true; continue; }
        if (/^(left|right|displaystyle|big|Big)$/.test(n)) continue;
        if (n in SYM) { out.push({ t: SYM[n], pos, over }); continue; }
        if (WORDS.includes(n)) { out.push({ t: n, pos, over }); continue; }
        out.push({ t: '\\' + n, pos, over });
        continue;
      }
      const two = s.substr(i, 2);
      if (ASCII[two]) { out.push({ t: ASCII[two], pos, over }); i += 2; continue; }
      if (c === '*') { out.push({ t: '×', pos, over }); i++; continue; }
      if (c === '-') { out.push({ t: '−', pos, over }); i++; continue; }
      out.push({ t: c, pos, over, it: /[A-Za-z]/.test(c) });
      i++;
    }
    return out;
  }
  // A formula as plain text, with ² and ₂ where there are such letters.
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ' };
  const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '−': '₋', '=': '₌', '(': '₍', ')': '₎' };
  function mathText(src) {
    const parts = [];
    for (const x of mathBits(src, '', false, [])) { const p = parts[parts.length - 1]; if (p && p.pos === x.pos) p.t += x.t; else parts.push({ pos: x.pos, t: x.t }); }
    return parts.map(x => {
      if (!x.pos) return x.t;
      const map = x.pos === 'sup' ? SUP : SUB;
      if ([...x.t].every(c => map[c])) return [...x.t].map(c => map[c]).join('');
      return (x.pos === 'sup' ? '^' : '_') + (x.t.length > 1 ? '(' + x.t + ')' : x.t);
    }).join('');
  }
  function mathItems(src, base) {
    const items = [];
    for (const x of mathBits(src, '', false, [])) {
      if (!x.t) continue;
      const c = [base, MATH_FONT, x.it ? 'font-style: italic;' : '', x.bold ? 'font-weight: 700;' : '',
        x.pos === 'sup' ? 'font-size: .7em; vertical-align: super; line-height: 0;' : x.pos === 'sub' ? 'font-size: .7em; vertical-align: sub; line-height: 0;' : '',
        x.over ? 'text-decoration: overline;' : ''].filter(Boolean).join(' ');
      const p = items[items.length - 1];
      if (p && p.css === c) p.t += x.t; else items.push({ plain: true, blank: false, t: x.t, css: c, runs: [] });
    }
    return items;
  }
  const showRun = (r, o) => (r.m.includes('m') ? mathItems(r.t, css(r.m.replace('m', ''), o)) : [{ plain: true, blank: false, t: r.t, css: css(r.m, o), runs: [] }]);
  // Lines for a card. Fill-in-the-blank: o.ask is the blank being asked (-1 for all of them) and
  // o.hide hides it; the other blanks read as normal text.
  function view(md, o = {}) {
    let n = -1;
    const lines = parse(md, !!o.cloze), nums = numbered(lines);
    return lines.map((l, li) => {
      const items = [];
      for (const g of groups(l.runs)) {
        const inner = g.runs.flatMap(r => showRun({ t: r.t, m: r.m.replace('k', '') }, o));
        if (!g.blank) { items.push(...inner); continue; }
        n++;
        if (o.ask != null && o.ask >= 0 && o.ask !== n) { items.push(...inner); continue; }
        items.push({ plain: false, blank: true, t: '', css: '', runs: o.hide ? [{ plain: true, blank: false, t: '\u2003\u2003\u2003\u2003', css: '', runs: [] }] : inner });
      }
      if (!items.length) items.push({ plain: true, blank: false, t: '\u200b', css: '', runs: [] });
      return { css: lineCss(l.kind, nums[li]), items };
    });
  }
  // Lines for the editor: blanks as pills and math as its formula, so every letter can be edited.
  const editView = (md, o = {}) => { const lines = parse(md, !!o.cloze), nums = numbered(lines); return lines.map((l, li) => {
    const items = groups(l.runs).flatMap(g => (g.blank
      ? [{ plain: false, blank: true, t: '', css: '', edge: '1', runs: g.runs.map(r => ({ t: r.t, css: css(r.m.replace('k', ''), o, true) })) }]
      : g.runs.map(r => ({ plain: true, blank: false, t: r.t, css: css(r.m, o, true), edge: r.m.includes('m') ? '1' : '', runs: [] }))));
    return { css: lineCss(l.kind, nums[li]), items, empty: !items.length };
  }); };

  // ---------- editing ----------
  // A position counts characters, with one for each line break.
  const lineLen = l => l.runs.reduce((n, r) => n + r.t.length, 0);
  const size = lines => lines.reduce((n, l) => n + lineLen(l), 0) + lines.length - 1;
  const text = lines => lines.map(l => l.runs.map(r => r.t).join('')).join('\n');
  function at(lines, pos) {
    let i = 0;
    while (i < lines.length - 1 && pos > lineLen(lines[i])) { pos -= lineLen(lines[i]) + 1; i++; }
    return [i, Math.max(0, Math.min(pos, lineLen(lines[i])))];
  }
  const posOf = (lines, i, col) => lines.slice(0, i).reduce((n, l) => n + lineLen(l) + 1, 0) + col;
  const lineAt = (lines, pos) => lines[at(lines, pos)[0]];
  function cut(runs, col) {
    const a = [], b = [];
    let n = 0;
    for (const r of runs) {
      const L = r.t.length;
      if (n + L <= col) a.push(r);
      else if (n >= col) b.push(r);
      else { a.push({ t: r.t.slice(0, col - n), m: r.m }); b.push({ t: r.t.slice(col - n), m: r.m }); }
      n += L;
    }
    return [a, b];
  }
  function markAt(l, col) {
    let n = 0;
    for (const r of l.runs) { if (col < n + r.t.length) return r.m; n += r.t.length; }
    return null;
  }
  // Text to put in: one line per line break, all with the marks m. New lines take kind (bullets and numbers carry on; headings don't).
  const carry = kind => (kind === 'li' || kind === 'ol' ? kind : '');
  const frag = (t, m, kind) => String(t).split('\n').map((x, n) => ({ kind: n ? carry(kind) : undefined, runs: x ? [{ t: x, m: norm(m || '') }] : [] }));
  function replace(lines, a, b, part) {
    const [i, c] = at(lines, a), [j, d] = at(lines, b);
    const head = cut(lines[i].runs, c)[0], tail = cut(lines[j].runs, d)[1];
    const out = part.map((l, n) => ({ kind: n ? l.kind || '' : lines[i].kind, runs: n ? l.runs.slice() : [...head, ...l.runs] }));
    const last = out[out.length - 1];
    last.runs = [...last.runs, ...tail];
    out.forEach(l => { l.runs = tidy(l.runs); });
    return [...lines.slice(0, i), ...out, ...lines.slice(j + 1)];
  }
  function slice(lines, a, b) {
    const [i, c] = at(lines, a), [j, d] = at(lines, b);
    return lines.slice(i, j + 1).map((l, n) => {
      let runs = l.runs;
      if (n + i === j) runs = cut(runs, d)[0];
      if (n === 0) runs = cut(runs, c)[1];
      return { kind: l.kind, runs: tidy(runs) };
    });
  }
  function eachIn(lines, a, b, fn) {
    const [i, c] = at(lines, a), [j, d] = at(lines, b);
    return lines.map((l, n) => {
      if (n < i || n > j) return l;
      const s = n === i ? c : 0, e = n === j ? d : lineLen(l), [x, rest] = cut(l.runs, s), [y, z] = cut(rest, e - s);
      return { kind: l.kind, runs: tidy([...x, ...y.map(fn), ...z]) };
    });
  }
  const setMark = (lines, a, b, mark, on) => eachIn(lines, a, b, r => ({ t: r.t, m: norm(on ? r.m + mark : r.m.replace(mark, '')) }));
  // The marks every character in the range has.
  function marksIn(lines, a, b) {
    let common = null;
    eachIn(lines, a, b, r => { common = common == null ? r.m : [...common].filter(c => r.m.includes(c)).join(''); return r; });
    return common || '';
  }
  // The marks new letters get: the letter before's (blanks and math only carry on inside them).
  function typingMarks(lines, a, b) {
    const [i, c] = at(lines, a), l = lines[i];
    if (a !== b) return markAt(l, c) || '';
    const before = c > 0 ? markAt(l, c - 1) : null, after = markAt(l, c), base = before != null ? before : after || '';
    return [...base].filter(ch => !'km'.includes(ch) || ((before || '').includes(ch) && (after || '').includes(ch))).join('');
  }
  function wordAt(lines, pos) {
    const [i, c] = at(lines, pos), t = lines[i].runs.map(r => r.t).join('');
    if (!(c > 0 && c < t.length && WORD.test(t[c - 1]) && WORD.test(t[c]))) return null;
    let s = c, e = c;
    while (s > 0 && WORD.test(t[s - 1])) s--;
    while (e < t.length && WORD.test(t[e])) e++;
    const base = posOf(lines, i, 0);
    return [base + s, base + e];
  }
  const allKind = (lines, a, b, kind) => { const [i] = at(lines, a), [j] = at(lines, b); return lines.slice(i, j + 1).every(l => l.kind === kind); };
  const setKind = (lines, a, b, kind) => { const [i] = at(lines, a), [j] = at(lines, b); return lines.map((l, n) => (n >= i && n <= j ? { kind, runs: l.runs } : l)); };
  // Shortcuts like a notes app. At the start of a line: "# " heading (## and ### smaller), "- " bullet, "1. " numbers.
  const LINE_KEYS = [[/^#$/, 'h1'], [/^##$/, 'h2'], [/^###$/, 'h3'], [/^[-*+]$/, 'li'], [/^\d{1,3}[.)]$/, 'ol']];
  function lineRule(lines, caret) {
    const [i, c] = at(lines, caret), l = lines[i], t = l.runs.map(r => r.t).join('');
    if (t[c - 1] !== ' ') return { lines, caret };
    const hit = LINE_KEYS.find(([re]) => re.test(t.slice(0, c - 1)));
    if (!hit) return { lines, caret };
    const base = posOf(lines, i, 0), out = replace(lines, base, base + c, [{ runs: [] }]);
    out[i] = { kind: hit[1], runs: out[i].runs };
    return { lines: out, caret: caret - c };
  }
  // And as you type: **bold**, *italic* or _italic_, ~~strikethrough~~ or ~strikethrough~, ==highlight==, $math$.
  const INLINE_KEYS = [[/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, 'b', 2], [/(?:^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*$/, 'i', 1], [/(?:^|[^_\w])_([^_\s](?:[^_]*[^_\s])?)_$/, 'i', 1],
    [/~~([^~\s](?:[^~]*[^~\s])?)~~$/, 's', 2], [/(?:^|[^~])~([^~\s](?:[^~]*[^~\s])?)~$/, 's', 1], [/==([^=\s](?:[^=]*[^=\s])?)==$/, 'h', 2], [/(?:^|[^$\w\\])\$([^$\s](?:[^$]*[^$\s])?)\$$/, 'm', 1]];
  function inlineRule(lines, caret) {
    const [i, c] = at(lines, caret), l = lines[i], t = l.runs.map(r => r.t).join('').slice(0, c);
    for (const [re, mark, n] of INLINE_KEYS) {
      const hit = re.exec(t);
      if (!hit) continue;
      const w = hit[1].length, s = c - 2 * n - w;
      if ((markAt(l, s) || '').includes('m') || (markAt(l, c - 1) || '').includes('m')) continue;
      const base = posOf(lines, i, 0);
      let out = replace(lines, base + c - n, base + c, [{ runs: [] }]);
      out = replace(out, base + s, base + s + n, [{ runs: [] }]);
      return { lines: setMark(out, base + s, base + s + w, mark, true), caret: caret - 2 * n, done: mark };
    }
    return { lines, caret };
  }
  // On fill-in-the-blank cards, typing [[words]] makes a blank.
  function autoBlank(lines, caret) {
    for (let i = 0; i < lines.length; i++) {
      for (let guard = 0; guard < 20; guard++) {
        const l = lines[i], t = l.runs.map(r => r.t).join(''), m = /\[\[([^[\]]+?)\]\]/.exec(t);
        if (!m || (markAt(l, m.index) || '').includes('k')) break;
        const s = posOf(lines, i, m.index), e = s + m[0].length;
        lines = replace(lines, e - 2, e, [{ runs: [] }]);
        lines = replace(lines, s, s + 2, [{ runs: [] }]);
        lines = setMark(lines, s, e - 4, 'k', true);
        caret = caret >= e ? caret - 4 : caret > s ? Math.max(s, caret - 2) : caret;
      }
    }
    return { lines, caret };
  }
  // One letter before or after a position (whole emoji and accents), or the word next to it.
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter() : null;
  function prevChar(t, pos) {
    if (pos <= 0) return 0;
    if (seg) { let last = 0; for (const x of seg.segment(t.slice(0, pos))) last = x.index; return last; }
    const lo = t.charCodeAt(pos - 1);
    return pos - (lo >= 0xdc00 && lo <= 0xdfff && pos > 1 ? 2 : 1);
  }
  function nextChar(t, pos) {
    if (pos >= t.length) return t.length;
    if (seg) { const it = seg.segment(t.slice(pos))[Symbol.iterator]().next(); return pos + (it.done ? 1 : it.value.segment.length); }
    const hi = t.charCodeAt(pos);
    return pos + (hi >= 0xd800 && hi <= 0xdbff ? 2 : 1);
  }
  function wordStart(t, pos) {
    let p = pos;
    while (p > 0 && t[p - 1] !== '\n' && WS.test(t[p - 1])) p--;
    if (p > 0 && WORD.test(t[p - 1])) { while (p > 0 && WORD.test(t[p - 1])) p--; } else if (p > 0) p--;
    return p;
  }
  function wordEnd(t, pos) {
    let p = pos;
    while (p < t.length && t[p] !== '\n' && WS.test(t[p])) p++;
    if (p < t.length && WORD.test(t[p])) { while (p < t.length && WORD.test(t[p])) p++; } else if (p < t.length) p++;
    return p;
  }

  // ---------- copy and paste ----------
  const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function toHtml(lines) {
    const WRAP = { b: 'b', i: 'i', u: 'u', s: 's', h: 'mark' };
    const run = r => {
      let h = escHtml(r.t);
      for (const m of [...r.m].reverse()) h = m === 'm' ? '<span data-sc="m">' + h + '</span>' : m === 'k' ? '<span data-sc="k">' + h + '</span>' : '<' + WRAP[m] + '>' + h + '</' + WRAP[m] + '>';
      return h;
    };
    let out = '', list = '';
    for (const l of lines) {
      const body = l.runs.map(run).join('') || '<br>', want = l.kind === 'li' ? 'ul' : l.kind === 'ol' ? 'ol' : '';
      if (list !== want) { out += (list ? '</' + list + '>' : '') + (want ? '<' + want + '>' : ''); list = want; }
      out += want ? '<li>' + body + '</li>' : /^h[123]$/.test(l.kind) ? '<' + l.kind + '>' + body + '</' + l.kind + '>' : '<div>' + body + '</div>';
    }
    return out + (list ? '</' + list + '>' : '');
  }
  // A background that marks words: not white, and not see-through (rgba with alpha 0).
  const isHl = c => !!c && !/transparent|inherit|initial|none/.test(c) && !/^(#fff(fff)?|white)$/i.test(c.trim()) && !/^rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(c)
    && !/^rgba\([^,]+,[^,]+,[^,]+,\s*0(\.0+)?\s*\)$/.test(c.trim());
  // Pasted or imported HTML (web pages, Google Docs, Anki) turned into card text. Keeps the styles cards have.
  function fromHtml(html, cloze) {
    if (typeof DOMParser === 'undefined') return String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const lines = [{ kind: '', runs: [] }];
    const cur = () => lines[lines.length - 1];
    const next = kind => { if (cur().runs.length) lines.push({ kind, runs: [] }); else cur().kind = kind; };
    const BLOCK = /^(P|DIV|H[1-6]|LI|UL|OL|BLOCKQUOTE|PRE|TR|TABLE|SECTION|ARTICLE|HEADER|FOOTER)$/;
    const kindOf = node => (node.tagName === 'LI' ? (node.parentElement && node.parentElement.tagName === 'OL' ? 'ol' : 'li') : /^H[123]$/.test(node.tagName) ? node.tagName.toLowerCase() : '');
    const walk = (node, m) => {
      if (node.nodeType === 3) { const t = node.nodeValue.replace(/\s+/g, ' '); if (t) cur().runs.push({ t, m: norm(m) }); return; }
      if (node.nodeType !== 1 || /^(SCRIPT|STYLE|HEAD|TITLE|META|TEMPLATE)$/.test(node.tagName)) return;
      const tag = node.tagName, st = node.style || {}, fw = st.fontWeight || '';
      if (tag === 'BR') { lines.push({ kind: '', runs: [] }); return; }
      let mm = m;
      if (fw) mm = fw === 'bold' || fw === 'bolder' || +fw >= 600 ? mm + 'b' : mm.replace('b', '');
      else if (/^(B|STRONG)$/.test(tag)) mm += 'b';
      if (st.fontStyle) mm = st.fontStyle === 'italic' || st.fontStyle === 'oblique' ? mm + 'i' : mm.replace('i', '');
      else if (/^(I|EM)$/.test(tag)) mm += 'i';
      const dec = (st.textDecoration || '') + ' ' + (st.textDecorationLine || '');
      if (tag === 'U' || /underline/.test(dec)) mm += 'u';
      if (/^(S|DEL|STRIKE)$/.test(tag) || /line-through/.test(dec)) mm += 's';
      if (tag === 'MARK' || (tag !== 'BODY' && !BLOCK.test(tag) && isHl(st.backgroundColor))) mm += 'h';
      const sc = node.getAttribute('data-sc');
      if (sc === 'm') mm += 'm';
      if (sc === 'k' && cloze) mm += 'k';
      const block = BLOCK.test(tag);
      if (block) next(kindOf(node));
      node.childNodes.forEach(ch => walk(ch, mm));
      if (block) next('');
    };
    walk(doc.body, '');
    // Spaces at the edges of lines go, and so do empty lines at the start and end.
    for (const l of lines) {
      l.runs = tidy(l.runs);
      if (l.runs[0]) l.runs[0].t = l.runs[0].t.replace(/^\s+/, '');
      const z = l.runs[l.runs.length - 1];
      if (z) z.t = z.t.replace(/\s+$/, '');
      l.runs = tidy(l.runs);
    }
    while (lines.length > 1 && !lines[0].runs.length) lines.shift();
    while (lines.length > 1 && !lines[lines.length - 1].runs.length) lines.pop();
    return write(lines, cloze);
  }
  const looksHtml = s => /<\/?(b|strong|i|em|u|s|del|strike|mark|br|div|p|span|ul|ol|li|sub|sup|font)\b[^>]*>|&(nbsp|amp|lt|gt|quot|#\d+);/i.test(String(s || ''));

  // ---------- the editor's DOM ----------
  // The editor draws each line as a <div> of spans (an empty line holds a <br>). Pills and math are marked data-edge="1".
  function domPos(root, node, off) {
    const lines = [...root.children];
    if (node === root) {
      let n = 0;
      for (let i = 0; i < Math.min(off, lines.length); i++) n += lines[i].textContent.length + 1;
      return Math.max(0, off >= lines.length ? n - 1 : n);
    }
    let ln = node;
    while (ln && ln.parentNode !== root) ln = ln.parentNode;
    if (!ln) return 0;
    let n = 0;
    for (const l of lines) { if (l === ln) break; n += l.textContent.length + 1; }
    const r = document.createRange();
    try { r.setStart(ln, 0); r.setEnd(node, off); } catch (e) { return n; }
    return n + r.toString().length;
  }
  function inLine(ln, col) {
    const ts = [], w = document.createTreeWalker(ln, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) ts.push(t);
    if (!ts.length) return [ln, 0];
    const edge = t => t.parentElement && t.parentElement.closest('[data-edge="1"]');
    const spot = (e, d) => [e.parentNode, [...e.parentNode.childNodes].indexOf(e) + d];
    for (let n = 0; n < ts.length; n++) {
      const t = ts[n], L = t.nodeValue.length, e = edge(t);
      if (n === 0 && col === 0 && e) return spot(e, 0);
      if (col < L) return [t, col];
      if (col === L) return !e || (ts[n + 1] && edge(ts[n + 1]) === e) ? [t, L] : spot(e, 1);
      col -= L;
    }
    const t = ts[ts.length - 1];
    return [t, t.nodeValue.length];
  }
  function point(root, pos) {
    const lines = [...root.children];
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i].textContent.length;
      if (pos <= L || i === lines.length - 1) return inLine(lines[i], Math.max(0, Math.min(pos, L)));
      pos -= L + 1;
    }
    return [root, 0];
  }
  function setSel(root, a, b) {
    const s = document.getSelection(), [n1, o1] = point(root, a), [n2, o2] = point(root, b == null ? a : b);
    try { s.setBaseAndExtent(n1, o1, n2, o2); } catch (e) { /* the field was redrawn meanwhile */ }
  }

  return { parse, write, plain, mathText, blanks, plainLines, view, editView, groups, lineLen, size, text, at, posOf, lineAt, frag, carry, replace, slice, setMark, marksIn,
    typingMarks, wordAt, allKind, setKind, lineRule, inlineRule, autoBlank, prevChar, nextChar, wordStart, wordEnd, toHtml, fromHtml, looksHtml, domPos, pointAt: point, setSel };
}
export default makeRich();
