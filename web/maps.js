// Mind map and Diagram pages (step 4, "Recall Maps", design/specs/step4-maps.md): what a map page holds, how it is cleaned, read
// from text and written back as text, laid out, merged when two writers changed it, compared, and drawn. The server (pages.mjs,
// mcp.mjs, social.mjs, diagrams.mjs, mapmove.mjs), the web app, the canvas boards and the iPhone (JavaScriptCore, Data/MapEngine.swift)
// all use this one file, so a map reads, saves and looks the same everywhere and no layout is ported to Swift.
// Like guide.js and pageblocks.js, the work is one function with no imports and no DOM (makeMaps), followed only by the default
// export of its result. To run it in JavaScriptCore, evaluate the function itself (from its own first line, the only place its
// name follows the word function, up to the file's last line, the export) and call it. Nothing else may sit between the two,
// and no comment may repeat that first line's words, or a slice would start there.
//
// THE MIND MAP (kind "mindmap"):   { root: Idea }
//   Idea = { id, label, note?, cardIds?: [id], folded?: true, children?: [Idea] }   (keys always in this order; empty ones left out)
//   id: 1 to 40 letters, digits, - and _, unique in the page.  label: one line, up to 80 code points (only the topic may be "").
//   note: up to 600 code points and 8 lines.  cardIds: up to 8.  folded: "starts folded".  Caps: 200 ideas, 6 levels under the
//   topic, 20 children under one idea. Colors, positions, zoom, sides and the learner's folds and test results are never stored.
// The Diagram (kind "diagram") comes in step 4b: its functions slot into KINDS below (normalize, text, layout, merge, diff).
//
// DETERMINISTIC. normalize, the text forms, merge, diff and the layouts give the same answer for the same input in V8 and
// JavaScriptCore, byte for byte: no Math.random, no Date, no trig or pow (only + - * /, min, max, abs, floor, ceil, round and sqrt),
// every sort breaks ties on data order, ids live in Map objects (never as object keys), and positions are rounded to 0.1.
// The app makes ids for ideas it adds ('n' and 7 random base-36 characters, in mapview.js or Swift), never this file.
//
// THE FUNCTIONS (each takes the kind first where both kinds will have one):
//   LIMITS, units(s), wrap(s, maxUnits), plain(s, max)                      text measuring and cleaning
//   normalize(kind, input, prev?, {ai, title}) -> {data, warnings}            the one cleaner every write goes through (throws a
//                                       refusal: an Error with code 'shape' (Note blocks sent to a map; e.app is the app's line),
//                                       'unreadable', or 'kind' (a kind this file can't read yet: notReady's words), and a message
//                                       to show as it is)
//   normalizeMindmap(input, prev?, opts), emptyOf(kind), fromLegacy(tree)
//   mindmapFromText(text, prev?, {title, ai}), fromText(kind, text, prev?, opts), textOf(kind, data)   the outline text form, with ids
//   pathsOf(data) -> [{id, path}], countOf(kind, data)
//   edit(kind, data, op) -> {data, summary}      add, set, remove, move, indent, outdent, link, unlink (place, tidy, reverse: diagrams)
//   merge(kind, base, mine, theirs, {prefer}) -> {data, clashes}              the app's 409 merge (§8.3); clashes [{id, what, yours,
//                                       theirs}], what: label, note, folded, deleted, move (parents), order (the ideas before it)
//                                       or cut (past a cap: its words on each side)
//   diff(kind, a, b), summaryOf(diff, {who})     what changed, as 'Claude added 4 ideas'
//   layoutMind(data, {side, folds, scale, title}), layout(kind, data, opts)  numbers to draw from
//   previewOf(kind, data, {w, h, side, tones, title})                         a small picture's model for a map shown in a Note
//   svgOf(kind, layout, colors, {title, tones, data})                         the picture as escaped SVG, with a screen-reader list
//   ideaTone(cardTones, mark), matchCards(label, cards), reviewIds(data, ids), testOrder(data, layout, hidden)   study helpers
export function makeMaps() {
  const LIMITS = { ideas: 200, depth: 6, children: 20, label: 80, note: 600, noteLines: 8, cards: 8, id: 40, slug: 32 };
  const ID = /^[A-Za-z0-9_-]{1,40}$/;
  // Words JavaScript keeps for its own objects: never an id, so no caller that keeps "by id" values in a plain object loses one.
  const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
  const okId = s => ID.test(s) && !RESERVED.has(s);
  const NAMES = { mindmap: 'Mind map', diagram: 'Diagram' };
  // A value of one of this file's own tables, never one an object inherits ('toString', '__proto__').
  const own = (o, k) => (typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
  // The mind map's sizes (§4.3): char and wrap are indexed by min(level, 2).
  const M = { lineH: 17, padX: 14, padY: 9, rootPad: 6, gapX: 48, gapY: 10, char: [8.6, 7.4, 6.9], wrap: [18, 22, 24], minW: 64, rootMinW: 96, maxW: 220, chip: 26, margin: 24 };
  // What is read at most: ideas, levels, characters of a note (or a plain() string) and of a label before it is cleaned (a
  // label keeps 80 code points, so 4,000 leaves room for long link addresses and marks).
  const MAX_READ = 5000, MAX_READ_DEPTH = 64, MAX_CHARS = 20000, LABEL_RAW = 4000;

  // ---------- small helpers ----------
  const str = v => (v == null ? '' : typeof v === 'string' ? v : (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean' ? String(v) : '');
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const r1 = v => Math.round(v * 10) / 10;
  const q = s => '“' + s + '”';
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  // Up to three names, quoted: “a”, “a” and “b”, “a”, “b” and “c”, “a”, “b”, “c” and 2 more.
  function names(list) {
    const l = list.slice(0, 3).map(q), more = list.length - l.length;
    if (more > 0) return l.join(', ') + ' and ' + more + ' more';
    return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1];
  }
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  // Code points, not UTF-16 units: an emoji counts once and is never cut in half.
  function cpLen(s) { let n = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) i++; n++; } return n; }
  function cpCut(s, n) {
    let i = 0, k = 0;
    while (i < s.length && k < n) { const c = s.charCodeAt(i); i += c >= 0xd800 && c <= 0xdbff && i + 1 < s.length ? 2 : 1; k++; }
    return s.slice(0, i);
  }
  // A lookup over what a caller passes for "by id" values: a Map, an array of ids (each true), an array of [id, value] pairs, or
  // a plain object read only through hasOwnProperty (its key order never matters here).
  function getter(x) {
    if (x instanceof Map) return id => x.get(id);
    if (Array.isArray(x)) {
      const m = new Map();
      for (const e of x) { if (Array.isArray(e)) m.set(str(e[0]), e[1]); else if (typeof e === 'string') m.set(e, true); }
      return id => m.get(id);
    }
    if (obj(x)) return id => (Object.prototype.hasOwnProperty.call(x, id) ? x[id] : undefined);
    return () => undefined;
  }
  function refuse(code, kind) {
    const known = own(NAMES, kind), name = known || 'Mind map';
    const msg = code === 'shape' ? 'This page is a ' + name + ': send its content as text or data (create_page shows both); blocks are a Note’s. Nothing was saved.'
      : code === 'kind' ? (known ? 'Lucida can’t show ' + known + ' pages yet; make a note, a mind map or a diagram.' : 'A page is a note, a mind map or a diagram.')
      : kind === 'diagram' ? 'That isn’t a diagram: send text (one arrow a line, "A -> B : words") or data ({"nodes": […], "edges": […]}). Nothing was saved.'
      : 'That isn’t a mind map: send text (an indented list, the topic first) or data ({"root": …}). Nothing was saved.';
    const e = new Error(msg);
    e.code = code;
    if (code === 'shape') e.app = 'This page is a ' + name + '. Update Lucida to change it here.';
    throw e;
  }

  // ---------- text measuring (§4.2: no font is ever measured) ----------
  function cpUnits(c) {
    if ((c >= 0x300 && c <= 0x36f) || (c >= 0x1ab0 && c <= 0x1aff) || (c >= 0x1dc0 && c <= 0x1dff) || (c >= 0x20d0 && c <= 0x20ff)
      || (c >= 0xfe00 && c <= 0xfe0f) || (c >= 0xfe20 && c <= 0xfe2f) || c === 0x200d || (c >= 0xe0100 && c <= 0xe01ef)) return 0;
    if (c >= 65 && c <= 90) return 1.15;
    if ((c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0x303e) || (c >= 0x3041 && c <= 0x33ff) || (c >= 0x3400 && c <= 0x4dbf)
      || (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xa000 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff)
      || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x20000 && c <= 0x3fffd)) return 1.8;
    if (c > 0xffff || (c >= 0x2600 && c <= 0x27bf)) return 2;
    return 1;
  }
  // How wide a string reads, in units of a lower-case Latin letter.
  function units(s) { let u = 0; for (const ch of str(s)) u += cpUnits(ch.codePointAt(0)); return u; }
  // Lines of at most maxUnits, broken at spaces; a word too long for a line (or a run of a script without spaces) breaks between
  // any two characters. Always at least one line ('' for no words).
  function wrap(s, maxUnits) {
    const max = maxUnits > 0 ? maxUnits : 18, lines = [];
    let line = '', lu = 0;
    for (const w of str(s).split(' ')) {
      if (!w) continue;
      const wu = units(w);
      if (wu <= max) {
        if (!line) { line = w; lu = wu; } else if (lu + 1 + wu <= max) { line += ' ' + w; lu += 1 + wu; } else { lines.push(line); line = w; lu = wu; }
        continue;
      }
      if (line) { lines.push(line); line = ''; lu = 0; }
      for (const ch of w) {
        const cu = cpUnits(ch.codePointAt(0));
        if (line && lu + cu > max) { lines.push(line); line = ''; lu = 0; }
        line += ch; lu += cu;
      }
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  }

  // ---------- cleaning labels and notes (diagrams.mjs plainText's rules) ----------
  const CTRL = /[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff]/g;
  // Every pattern here takes time in proportion to what it reads (bounded repeats, no nested ones), so no label, however long or
  // odd, can hold up the server or the iPhone, where JavaScriptCore runs without a JIT.
  // Markdown links and pictures, [words](address) and ![words](address), become their words, nested ones too, in one pass: each
  // "](" closes the nearest "[" still open, and the address runs to the next ")".
  function unlink(s) {
    if (s.indexOf('](') < 0) return s;
    const close = new Array(s.length + 1);
    close[s.length] = -1;
    for (let i = s.length - 1; i >= 0; i--) close[i] = s[i] === ')' ? i : close[i + 1];
    const out = [], open = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '[') { open.push(out.length); out.push(c); continue; }
      if (c === ']' && open.length && s[i + 1] === '(' && close[i + 2] >= 0) {
        const at = open.pop();
        out[at] = '';
        if (at > 0 && out[at - 1] === '!') out[at - 1] = '';
        i = close[i + 2];
        continue;
      }
      out.push(c);
    }
    return out.join('');
  }
  const once = s => unlink(s.replace(/<[^>\n]{0,200}>/g, '')).replace(/\b(?:https?:\/\/|www\.|mailto:)\S+/gi, '')
    .replace(CTRL, ' ').replace(/\*\*|__|`/g, '').replace(/~~(\S(?:[^~\n]{0,200}?\S)?)~~/g, '$1').replace(/==(\S(?:[^=\n]{0,200}?\S)?)==/g, '$1')
    .replace(/\s+/g, ' ').trim();
  // A bullet or a heading's # at the start, before a space, is a Markdown mark, not words (plainText's marks; ~~ and == go only
  // in pairs, so "a == b" keeps its words). A quote's ">", a "+" and a list number stay: "> 5 mm", "+ ve" and "1. Introduction"
  // mean something. Outline text reads those marks itself, and prints a topic that starts with one as "# " and the words.
  const LEAD = /^(?:[-*•]|#{1,6})\s+/;
  function line1(x, lead, most) {
    let s = str(x);
    const max = most > 0 ? most : MAX_CHARS;
    if (s.length > max) s = s.slice(0, max);
    for (let i = 0; i < 32; i++) {
      let t = once(s);
      if (lead) for (let j = 0; j < 64 && LEAD.test(t); j++) t = t.replace(LEAD, '');
      if (t === s) break;
      s = t;
    }
    return s;
  }
  // One line of plain words, at most `max` code points: tags, Markdown marks, links' addresses, control and bidi characters go;
  // spaces fold to one. plain(plain(s)) is plain(s).
  function plain(x, max) { return cutLine(line1(x, true), max > 0 ? Math.floor(max) : 200); }
  // Cut to `max` code points; a mark the cut leaves at the start goes too, so plain(plain(s)) is plain(s).
  function cutLine(s, max) {
    let t = cpCut(s, max).trim();
    for (let j = 0; j < 64 && LEAD.test(t); j++) t = t.replace(LEAD, '').trim();
    return t;
  }
  // A note: the same, line by line; empty lines go, at most 8 lines and 600 code points.
  function cleanNote(x) {
    let s = str(x);
    if (s.length > MAX_CHARS) s = s.slice(0, MAX_CHARS);
    const lines = s.replace(/\r\n?/g, '\n').split('\n').map(l => line1(l, false)).filter(Boolean);
    let note = lines.slice(0, LIMITS.noteLines).join('\n'), cut = lines.length > LIMITS.noteLines;
    if (cpLen(note) > LIMITS.note) { note = cpCut(note, LIMITS.note).trimEnd(); cut = true; }
    return { note, cut };
  }

  // ---------- ids ----------
  function fnv36(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('000000' + (h >>> 0).toString(36)).slice(-6);
  }
  // The server's id for a label: its words as a slug ("Krebs cycle in the matrix" -> krebs-cycle-in-the-matrix, at most 32), or
  // `pre` and 6 base-36 characters of its FNV-1a hash when it has no Latin letters.
  // Without the dashes at either end (a loop, not /-+$/, which takes time in the square of a long run of dashes).
  function dashless(s) {
    let a = 0, b = s.length;
    while (a < b && s[a] === '-') a++;
    while (b > a && s[b - 1] === '-') b--;
    return s.slice(a, b);
  }
  function slug(label, pre) {
    let s = dashless(str(label).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    if (s.length > LIMITS.slug) s = dashless(s.slice(0, LIMITS.slug));
    return /[a-z]/.test(s) ? s : pre + fnv36(str(label));
  }
  // A given id with characters an id can't have: slugged, case kept ('' when nothing is left).
  const idSlug = s => dashless(dashless(str(s).slice(0, 4000).replace(/[^A-Za-z0-9_-]+/g, '-')).slice(0, LIMITS.id));
  function unique(base, taken) {
    if (!taken(base)) return base;
    for (let n = 2; ; n++) { const t = '-' + n, c = base.slice(0, LIMITS.id - t.length) + t; if (!taken(c)) return c; }
  }
  const keyOf = label => label.toLowerCase().replace(/\s+/g, '');

  // ---------- reading what was sent ----------
  // A raw idea: { id, label, note (undefined: not sent; '' clears), cardIds (undefined: not sent), alias, folded, children }.
  function rawIdea(v) {
    if (!obj(v)) return { id: undefined, label: str(v), note: undefined, cardIds: undefined, alias: false, folded: false, children: [] };
    const cards = v.cardIds !== undefined ? v.cardIds : v.cards;
    return {
      id: v.id, label: v.label !== undefined ? v.label : v.text, note: v.note === undefined ? undefined : v.note === null ? '' : v.note,
      cardIds: cards === undefined ? undefined : cards === null ? [] : Array.isArray(cards) ? cards : typeof cards === 'string' ? [cards] : undefined,
      alias: v.cardIds === undefined && v.cards !== undefined, folded: v.folded === true, children: []
    };
  }
  // The whole tree, read without recursion (so no input can run the stack out), at most MAX_READ ideas and MAX_READ_DEPTH levels,
  // breadth first, so what goes unread is the end of breadth-first order, the same end the 200 cap cuts from. An idea left
  // unread is counted, not what is under it, so those counts are "more than" (R.more).
  function readTree(top, R) {
    const root = rawIdea(top), seen = new Set(), qu = [[top, root, 0]];
    let n = 1;
    for (let i = 0; i < qu.length; i++) {
      const [v, node, d] = qu[i];
      qu[i] = null;
      if (!obj(v) || !Array.isArray(v.children) || seen.has(v)) continue;
      seen.add(v);
      for (const c of v.children) {
        if (c == null || (typeof c !== 'string' && typeof c !== 'number' && !obj(c))) continue;
        if (n >= MAX_READ) { R.over++; R.more = true; continue; }
        if (d + 1 > MAX_READ_DEPTH) { R.tooDeep++; R.more = true; continue; }
        const k = rawIdea(c);
        node.children.push(k); n++;
        qu.push([c, k, d + 1]);
      }
    }
    return root;
  }
  const IDEA_KEYS = ['id', 'label', 'note', 'cardIds', 'cards', 'folded', 'children'];
  // A Note's content: {blocks: […]}, or a bare list of its blocks (each an object with a type).
  const noteShaped = v => (obj(v) && Array.isArray(v.blocks)) || (Array.isArray(v) && v.length > 0 && v.every(b => obj(b) && typeof b.type === 'string'));
  // What was sent, as a raw tree; refuses what isn't a mind map at all.
  function readMind(input, title, R, depth) {
    if (input == null) return rawIdea({ label: '' });
    if (typeof input === 'string') {
      const t = input.trim();
      if (!t) return rawIdea({ label: '' });
      if ((depth || 0) < 2 && /^[{["]/.test(t)) {
        let j; try { j = JSON.parse(t); } catch (e) { j = undefined; }
        if (j !== undefined) return readMind(j, title, R, (depth || 0) + 1);
      }
      return readOutline(input, title, R);
    }
    if (noteShaped(input)) refuse('shape', 'mindmap');
    if (!obj(input)) refuse('unreadable', 'mindmap');
    if (input.root !== undefined) {
      if (obj(input.root)) return readTree(input.root, R);
      if (typeof input.root === 'string') return rawIdea(input.root);
      refuse('unreadable', 'mindmap');
    }
    if (input.tree !== undefined) {
      if (obj(input.tree)) return readTree(input.tree, R);
      refuse('unreadable', 'mindmap');
    }
    if (typeof input.markdown === 'string' && input.label === undefined) return readOutline(input.markdown, title, R);
    if (typeof input.text === 'string' && input.label === undefined && !IDEA_KEYS.some(k => input[k] !== undefined)) return readOutline(input.text, title, R);
    if (input.label !== undefined || input.text !== undefined) return readTree(input, R);
    refuse('unreadable', 'mindmap');
  }

  // ---------- the outline text form (§2.1) ----------
  // Mermaid's node shapes around the words: root((x)), ((x)), (x), [x], {{x}}, ))x((, )x(.
  const SHAPES = [['((', '))'], ['([', '])'], ['{{', '}}'], ['))', '(('], ['[', ']'], ['(', ')'], [')', '(']];
  function unshape(s) {
    const pre = /^[A-Za-z0-9_-]*/.exec(s)[0], rest = s.slice(pre.length);
    for (const [a, b] of SHAPES) if (rest.length >= a.length + b.length && rest.startsWith(a) && rest.endsWith(b)) { s = rest.slice(a.length, rest.length - b.length); break; }
    const m = /^"([\s\S]*)"$/.exec(s.trim());
    return m ? m[1] : s;
  }
  // The {…} at a line's end: #id, folded and cards:id,id in any order, between spaces or commas, or null when it holds anything
  // else. The easy slips read too: a space after "#" or "cards:", commas between them, and id:x for #x.
  function attrsOf(t) {
    // Words, each with whether a comma came before it (read a character at a time: no pattern to take long).
    const toks = [];
    let cur = '', comma = false;
    const end = () => { if (cur) { toks.push([cur, comma]); cur = ''; comma = false; } };
    for (const ch of t) {
      if (ch === ',') { end(); comma = true; } else if (!ch.trim()) end(); else cur += ch;
    }
    end();
    if (!toks.length) return null;
    const a = { id: undefined, folded: false, cards: undefined };
    const keyword = k => k === 'folded' || k[0] === '#' || k.slice(0, 6) === 'cards:' || k.slice(0, 3) === 'id:';
    let mode = '';
    for (const [k, afterComma] of toks) {
      if (mode === 'id') { if (keyword(k)) return null; a.id = k; mode = ''; continue; }
      if (((mode === 'cards' && afterComma) || mode === 'cards:') && !keyword(k)) { a.cards.push(k); mode = 'cards'; continue; }
      mode = '';
      if (k === '#' || k === 'id:') mode = 'id';
      else if (k[0] === '#') a.id = k.slice(1);
      else if (k.slice(0, 3) === 'id:') a.id = k.slice(3);
      else if (k === 'folded') a.folded = true;
      else if (k.slice(0, 6) === 'cards:') { a.cards = k.length > 6 ? [k.slice(6)] : []; mode = a.cards.length ? 'cards' : 'cards:'; }
      else return null;
    }
    return mode === 'id' ? null : a;
  }
  // One idea a line; depth from indentation (any consistent step, judged against the nearest shallower line), # headings, an
  // optional bullet, "> " notes, {…} attributes, and Mermaid's mindmap lines.
  function readOutline(text, title, R) {
    const lines = str(text).replace(/\r\n?/g, '\n').split('\n'), tops = [], stack = [], skipped = [];
    let mermaid = false, first = true, last = null, unit = 0, topInd = 0, read = 0, heads = 0;
    const pop = () => { if (stack.pop().heading) heads--; };
    for (const raw of lines) {
      if (!raw.trim()) continue;
      let ind = 0, i = 0;
      for (; i < raw.length; i++) { const ch = raw[i]; if (ch === ' ') ind++; else if (ch === '\t') ind += 4; else break; }
      let s = raw.slice(i).trim();
      if (/^(```|~~~)/.test(s)) continue;
      if (first && /^mindmap$/i.test(s)) { mermaid = true; first = false; continue; }
      first = false;
      if (/^>(\s|$)/.test(s)) {
        if (!last) { skipped.push('>'); continue; }
        const c = s.slice(1).replace(/^ /, '');
        if (!c.trim()) last.lines = [];
        else (last.lines || (last.lines = [])).push(c);
        continue;
      }
      if (mermaid && /^::icon\(/.test(s)) { skipped.push('::icon'); continue; }
      if (mermaid && /^:::/.test(s)) { skipped.push(':::class'); continue; }
      if (mermaid) { const e = s.trimEnd(), k = e.lastIndexOf(':::'); if (k >= 0 && /^[\w-]+$/.test(e.slice(k + 3))) s = e.slice(0, k); }
      // Past MAX_READ ideas the rest are only counted (they'd be cut anyway).
      if (read >= MAX_READ) { R.over++; continue; }
      let hl = 0, bullet = false, m;
      if ((m = /^(#{1,6})(?:\s+([\s\S]*))?$/.exec(s))) { hl = m[1].length; s = m[2] || ''; }
      else if ((m = /^(?:[-*+•]|\d{1,3}[.)])(?:\s+([\s\S]*))?$/.exec(s))) { bullet = true; s = m[1] || ''; }
      // The {…} at the end, found by its last "{" (no pattern that backtracks over a long line).
      let attrs = null;
      const e = s.trimEnd();
      if (e.endsWith('}')) {
        const o = e.lastIndexOf('{'), inner = o >= 0 ? e.slice(o + 1, -1) : '';
        if (o >= 0 && inner.indexOf('}') < 0) {
          if ((attrs = attrsOf(inner))) s = e.slice(0, o);
          else if (/(?:^|[\s,])(?:#|cards:|id:)/.test(inner)) R.unread++;
        }
      }
      if (mermaid) s = unshape(s.trim());
      if (!s.trim() && !attrs) continue;
      read++;
      const node = { id: attrs ? attrs.id : undefined, label: s, note: undefined, cardIds: attrs ? attrs.cards : undefined, alias: false, folded: !!(attrs && attrs.folded), children: [], lines: undefined };
      let parent = null;
      if (hl) {
        while (stack.length && !(stack[stack.length - 1].floor && stack[stack.length - 1].hl < hl)) pop();
        parent = stack.length ? stack[stack.length - 1] : null;
        stack.push({ ind: -1, node, floor: true, heading: true, hl });
        heads++;
      } else {
        if (!bullet && !heads && (!tops.length || ind <= topInd)) {
          stack.length = 0;
          stack.push({ ind, node, floor: true, heading: false, hl: 1 });
          if (!tops.length) topInd = ind;
        } else {
          while (stack.length && !stack[stack.length - 1].floor && stack[stack.length - 1].ind >= ind) pop();
          parent = stack.length ? stack[stack.length - 1] : null;
          if (parent && !parent.heading && ind > parent.ind) {
            const diff = ind - parent.ind;
            if (!unit) unit = diff; else if (diff >= 2 * unit) R.jumps++;
          }
          stack.push({ ind, node, floor: false, heading: false, hl: 0 });
        }
      }
      if (parent) parent.node.children.push(node); else tops.push(node);
      last = node;
    }
    // Notes: "> " lines joined; a lone ">" clears.
    const st = tops.slice();
    while (st.length) { const n = st.pop(); if (n.lines) n.note = n.lines.join('\n'); delete n.lines; for (const c of n.children) st.push(c); }
    if (skipped.length) R.skipped.push(...skipped);
    if (tops.length === 1) return tops[0];
    const root = rawIdea({ label: str(title) });
    root.children = tops;
    if (tops.length > 1) R.warn.push('Made the page title the topic: the text had ' + tops.length + ' lines at the top level.');
    return root;
  }
  // A topic line the reader would take for something else: a note ("> "), a bullet or list number, a heading's "#", a code fence.
  const MISREAD = /^(?:>(?:\s|$)|[-*+•](?:\s|$)|\d{1,3}[.)](?:\s|$)|#{1,6}(?:\s|$)|```|~~~)/;
  // The outline, every idea with its {#id}: the topic with no bullet (or as a "# " heading when its words start with a mark),
  // items "- " and 2 spaces a level, notes as "> " lines at the children's indentation. Read back, it gives the same data, and
  // printed again the same text.
  function mindText(data) {
    const root = data && data.root;
    if (!obj(root)) return '';
    const out = [], st = [[root, 0]];
    while (st.length) {
      const [n, lv] = st.pop();
      const label = str(n.label), cards = Array.isArray(n.cardIds) && n.cardIds.length ? ' cards:' + n.cardIds.join(',') : '';
      const lead = lv ? '  '.repeat(lv - 1) + '- ' : MISREAD.test(label) ? '# ' : '';
      out.push(lead + (label ? label + ' ' : '') + '{#' + str(n.id) + (n.folded ? ' folded' : '') + cards + '}');
      if (n.note) for (const l of str(n.note).split('\n')) out.push('  '.repeat(lv) + '> ' + l);
      const k = Array.isArray(n.children) ? n.children : [];
      for (let i = k.length - 1; i >= 0; i--) st.push([k[i], lv + 1]);
    }
    return out.join('\n');
  }

  // ---------- normalize (§2.0, §2.1) ----------
  function flatPrev(prev) {
    const byId = new Map(), byKey = new Map();
    let root = null;
    const r = prev && obj(prev.root) ? prev.root : null;
    if (!r) return { byId, byKey, root, rootId: '' };
    root = r;
    const st = [[r, null]];
    while (st.length) {
      const [n, parent] = st.pop();
      const id = str(n.id);
      if (!id || byId.has(id)) continue;
      const e = { id, parent, key: keyOf(str(n.label)), note: str(n.note), cardIds: Array.isArray(n.cardIds) ? n.cardIds.map(str) : [] };
      byId.set(id, e);
      if (e.key) { if (!byKey.has(e.key)) byKey.set(e.key, []); byKey.get(e.key).push(e); }
      const k = Array.isArray(n.children) ? n.children : [];
      for (let i = k.length - 1; i >= 0; i--) if (obj(k[i])) st.push([k[i], id]);
    }
    const rid = str(r.id);
    return { byId, byKey, root, rootId: byId.has(rid) && byId.get(rid).parent === null ? rid : '' };
  }
  const subSize = n => { let c = 0; const st = [n]; while (st.length) { const x = st.pop(); c++; for (const k of x.children) st.push(k); } return c; };
  function normalizeMindmap(input, prev, opts) {
    const o = opts || {}, ai = !!o.ai, R = { warn: [], skipped: [], jumps: 0, over: 0, tooDeep: 0, more: false, unread: 0 };
    const root = readMind(input, o.title, R, 0);
    const W = R.warn.slice();
    if (R.skipped.length) {
      const kinds = []; for (const k of R.skipped) if (!kinds.includes(k)) kinds.push(k);
      W.push('Skipped ' + plural(R.skipped.length, 'line', 'lines') + ' Lucida doesn’t read (' + kinds.join(', ') + ').');
    }
    if (R.jumps) W.push('Read ' + plural(R.jumps, 'line', 'lines') + ' indented more than one level deeper as one level deeper.');
    if (R.unread) W.push('Couldn’t read the {…} at the end of ' + plural(R.unread, 'line', 'lines') + ' (#id, folded and cards:id,id only); it stayed in the words.');

    // Words: labels on one line (the long ones cut), notes cleaned, card ids checked.
    let aliases = 0;
    const all = [root];
    for (let i = 0; i < all.length; i++) {
      const n = all[i], full = line1(n.label, true, LABEL_RAW);
      n.label = cutLine(full, LIMITS.label);
      n.long = n.label !== full;
      if (n.alias) aliases++;
      for (const c of n.children) all.push(c);
    }
    if (aliases) W.push('Read “cards” as cardIds on ' + plural(aliases, 'idea', 'ideas') + '.');

    // An AI write's ideas with no words go; what was under them moves up to their place.
    let blank = 0;
    if (ai) {
      const qu = [root];
      for (let j = 0; j < qu.length; j++) {
        const n = qu[j];
        if (n.children.some(c => !c.label)) {
          const out = [], st = n.children.slice().reverse();
          while (st.length) { const c = st.pop(); if (c.label) out.push(c); else { blank++; for (let i = c.children.length - 1; i >= 0; i--) st.push(c.children[i]); } }
          n.children = out;
        }
        for (const c of n.children) qu.push(c);
      }
    }
    if (blank) W.push('Left out ' + plural(blank, 'idea', 'ideas') + ' with no words; what was under ' + (blank === 1 ? 'it' : 'them') + ' moved up.');

    // Caps: 6 levels under the topic, 20 children under an idea, then 200 ideas in breadth-first order, cut from the end.
    const nameOf = n => (n ? n.label || str(n.id) || 'the topic' : 'the topic');
    root.level = 0; root.parent = null; root.main = null;
    const order = [root], deepUnder = [], kidCuts = [];
    let deep = R.tooDeep, kidCut = 0;
    for (let i = 0; i < order.length; i++) {
      const n = order[i];
      if (n.level >= LIMITS.depth && n.children.length) {
        for (const c of n.children) deep += subSize(c);
        const nm = nameOf(n.main); if (!deepUnder.includes(nm)) deepUnder.push(nm);
        n.children = [];
      }
      if (n.children.length > LIMITS.children) {
        kidCuts.push([nameOf(n), n.children.length]);
        for (const c of n.children.slice(LIMITS.children)) kidCut += subSize(c);
        n.children = n.children.slice(0, LIMITS.children);
      }
      for (const c of n.children) { c.level = n.level + 1; c.parent = n; c.main = n.level === 0 ? c : n.main; order.push(c); }
    }
    const more = R.more ? 'more than ' : '';
    if (deep) W.push('Cut ' + (R.tooDeep ? more : '') + plural(deep, 'idea', 'ideas') + ' deeper than ' + LIMITS.depth + ' levels' + (deepUnder.length ? ' under ' + names(deepUnder) : '') + '.');
    if (kidCuts.length) W.push('Kept ' + LIMITS.children + ' of the ' + kidCuts[0][1] + ' ideas under ' + q(kidCuts[0][0])
      + kidCuts.slice(1, 3).map((k, i, l) => (i === l.length - 1 ? ' and ' : ', ') + LIMITS.children + ' of the ' + k[1] + ' under ' + q(k[0])).join('')
      + (kidCuts.length > 3 ? ' (and under ' + plural(kidCuts.length - 3, 'more idea', 'more ideas') + ')' : '') + '.');
    let past = R.over;
    const pastUnder = [];
    if (order.length > LIMITS.ideas) {
      const cut = order.splice(LIMITS.ideas), gone = new Set(cut);
      past += cut.length;
      for (let i = cut.length - 1; i >= 0 && pastUnder.length < 4; i--) { const nm = nameOf(cut[i].main); if (!pastUnder.includes(nm)) pastUnder.push(nm); }
      for (const n of order) if (n.children.some(c => gone.has(c))) n.children = n.children.filter(c => !gone.has(c));
    }
    if (past) W.push('Cut ' + (R.over ? more : '') + plural(past, 'idea', 'ideas') + ' past ' + LIMITS.ideas + (pastUnder.length ? ' (the deepest ones under ' + names(pastUnder) + ' first)' : '') + '.');

    // Ids (§2.1). Given ids first, in outline order: the first idea with an id keeps it; a later one with the same id, and an id
    // that isn't one (bad characters, too long, or a word kept for JavaScript), is matched like a missing id. Then, top down:
    // (1) the old idea with the same words under the same parent, for every idea whose parent is settled, before (2) the one old
    // idea with those words anywhere, so an idea that stayed where it was keeps its id, and (3) a new id: a bad id's characters
    // slugged, else a slug of the words, never an id this page or its last version has (a new idea never inherits a deleted
    // one's note, cards or Test me marks).
    const P = flatPrev(prev), given = new Map(), slugged = [], dups = [], renamed = [];
    const pre = [], ps = [root];
    while (ps.length) { const n = ps.pop(); pre.push(n); for (let i = n.children.length - 1; i >= 0; i--) ps.push(n.children[i]); }
    for (const n of pre) {
      n.rid = ''; n.dup = ''; n.bad = '';
      const id = typeof n.id === 'number' && isFinite(n.id) ? String(n.id) : n.id;
      if (typeof id !== 'string' || !id) continue;
      if (!okId(id)) n.bad = id;
      else if (!given.has(id)) { given.set(id, n); n.rid = id; }
      else n.dup = id;
    }
    const used = new Set(given.keys()), taken = id => used.has(id) || P.byId.has(id) || RESERVED.has(id);
    let matched = 0;
    const claim = (n, e) => { n.rid = e.id; used.add(e.id); };
    const sameParent = n => {
      const key = keyOf(n.label), pid = n.parent ? n.parent.rid : null;
      if (n.parent && !pid) return false;
      if (!key) {
        // Only the topic has no words: an empty topic is the old empty topic.
        if (!n.parent && P.rootId && !P.byId.get(P.rootId).key && !used.has(P.rootId)) { claim(n, P.byId.get(P.rootId)); return true; }
        return false;
      }
      for (const e of P.byKey.get(key) || []) if (e.parent === pid && !used.has(e.id)) { claim(n, e); matched++; return true; }
      return false;
    };
    for (const n of order) if (!n.rid) sameParent(n);
    // Ideas still waiting, by their words: an old idea one of them would take under its own parent isn't given to another.
    const waiting = new Map();
    for (const n of order) if (!n.rid) { const k = keyOf(n.label); if (k) { if (!waiting.has(k)) waiting.set(k, []); waiting.get(k).push(n); } }
    const wanted = (e, n) => (waiting.get(e.key) || []).some(y => y !== n && !y.rid && y.parent
      && (y.parent.rid ? y.parent.rid === e.parent : e.parent != null && P.byId.has(e.parent) && keyOf(y.parent.label) === P.byId.get(e.parent).key));
    for (const n of order) {
      if (!n.rid && !sameParent(n)) {
        const cand = P.byKey.get(keyOf(n.label));
        if (cand && cand.length === 1 && !used.has(cand[0].id) && !wanted(cand[0], n)) { claim(n, cand[0]); matched++; }
      }
      if (!n.rid) {
        const fixed = n.bad ? idSlug(n.bad) : '';
        n.rid = unique(fixed || n.dup || (n === root && !n.label ? 'root' : slug(n.label, 'i')), taken);
        used.add(n.rid);
        if (fixed) (RESERVED.has(n.bad) ? renamed : slugged).push([n.bad, n.rid]);
      }
      if (n.dup) dups.push([n.dup, n.rid]);
    }
    if (slugged.length) W.push((slugged.length === 1 ? 'An id had' : plural(slugged.length, 'id', 'ids') + ' had') + ' characters an id can’t have (letters, digits, - and _ only): '
      + slugged.slice(0, 3).map(([a, b]) => q(a) + ' is now ' + q(b)).join(', ') + (slugged.length > 3 ? ' and ' + (slugged.length - 3) + ' more' : '') + '.');
    if (renamed.length) W.push('Gave ' + names(renamed.map(r => r[0])) + ' a new id: Lucida keeps ' + (renamed.length === 1 ? 'that word' : 'those words') + ' for itself.');
    if (dups.length === 1) W.push('Two ideas had the id ' + q(dups[0][0]) + ': the second is now ' + q(dups[0][1]) + '.');
    else if (dups.length) W.push(dups.length + ' ideas had an id already used: ' + dups.slice(0, 3).map(([a, b]) => q(a) + ' is now ' + q(b)).join(', ') + (dups.length > 3 ? ' and ' + (dups.length - 3) + ' more' : '') + '.');
    if (matched) W.push(matched === 1 ? 'Matched 1 idea without an id to the old one by its words.' : 'Matched ' + matched + ' ideas without ids to the old ones by their words.');

    // Notes and cards; an AI write that keeps an idea but leaves them out keeps the saved ones.
    let long = 0, notesCut = 0, badCards = [], cardsCut = [];
    const out = new Map();
    for (const n of order) {
      const old = P.byId.get(n.rid);
      let note = n.note, cards = n.cardIds;
      if (ai && old) { if (note === undefined) note = old.note; if (cards === undefined) cards = old.cardIds; }
      let nt = '';
      if (note !== undefined && note !== '') { const c = cleanNote(note); nt = c.note; if (c.cut) notesCut++; }
      const ids = [];
      for (const c of Array.isArray(cards) ? cards : []) {
        const s = typeof c === 'number' && isFinite(c) ? String(c) : typeof c === 'string' ? c.trim() : '';
        if (!s) continue;
        if (!okId(s)) { if (badCards.length < 50) badCards.push(s); continue; }
        if (!ids.includes(s)) ids.push(s);
      }
      if (ids.length > LIMITS.cards) { cardsCut.push(nameOf(n)); ids.length = LIMITS.cards; }
      if (n.long) long++;
      const o2 = { id: n.rid, label: n.label };
      if (nt) o2.note = nt;
      if (ids.length) o2.cardIds = ids;
      if (n.folded) o2.folded = true;
      if (n.children.length) o2.children = [];
      out.set(n, o2);
      if (n.parent) out.get(n.parent).children.push(o2);
    }
    if (long) W.push('Shortened ' + plural(long, 'label', 'labels') + ' to ' + LIMITS.label + ' characters; put longer text in the note.');
    if (notesCut) W.push('Shortened ' + plural(notesCut, 'note', 'notes') + ' to ' + LIMITS.note + ' characters and ' + LIMITS.noteLines + ' lines.');
    if (cardsCut.length) W.push('Kept ' + LIMITS.cards + ' card ids on ' + names(cardsCut) + '.');
    if (badCards.length) W.push('Left out ' + plural(badCards.length, 'card id', 'card ids') + ' with characters an id can’t have: ' + badCards.slice(0, 3).map(q).join(', ') + (badCards.length > 3 ? ' and ' + (badCards.length - 3) + ' more' : '') + '.');
    return { data: { root: out.get(root) }, warnings: W };
  }
  const mindmapFromText = (text, prev, opts) => normalizeMindmap(str(text), prev, opts);
  const fromLegacy = tree => normalizeMindmap({ tree: obj(tree) ? tree : { text: '' } }).data;

  // ---------- the kinds ----------
  const EMPTY = { mindmap: () => ({ root: { id: 'root', label: '' } }), diagram: () => ({ direction: 'down', nodes: [], edges: [] }) };
  const emptyOf = kind => { const f = own(EMPTY, kind); return f ? f() : null; };
  function normalize(kind, input, prev, opts) {
    if (kind === 'mindmap') return normalizeMindmap(input, prev, opts);
    if (own(NAMES, kind) && noteShaped(input)) refuse('shape', kind);
    return refuse('kind', kind);
  }
  function fromText(kind, text, prev, opts) { return kind === 'mindmap' ? mindmapFromText(text, prev, opts) : refuse('kind', kind); }
  function textOf(kind, data) { return kind === 'mindmap' ? mindText(data) : ''; }
  // Every idea's path from the topic ("The cell › Mitochondria › Krebs cycle in the matrix"), in outline order.
  function pathsOf(a, b) {
    const data = typeof a === 'string' ? b : a, out = [];
    const root = data && obj(data.root) ? data.root : null;
    if (!root) return out;
    const st = [[root, '']];
    while (st.length) {
      const [n, pre] = st.pop(), path = pre ? pre + ' › ' + str(n.label) : str(n.label);
      out.push({ id: str(n.id), path });
      const k = Array.isArray(n.children) ? n.children : [];
      for (let i = k.length - 1; i >= 0; i--) st.push([k[i], path]);
    }
    return out;
  }
  // Ideas in outline order (depth first), with their level and parent id.
  function walk(data) {
    const out = [], root = data && obj(data.root) ? data.root : null;
    if (!root) return out;
    const st = [[root, 0, null]];
    while (st.length) {
      const [n, level, parent] = st.pop();
      out.push({ n, id: str(n.id), level, parent });
      const k = Array.isArray(n.children) ? n.children : [];
      for (let i = k.length - 1; i >= 0; i--) if (obj(k[i])) st.push([k[i], level + 1, str(n.id)]);
    }
    return out;
  }
  const countOf = (kind, data) => (kind === 'diagram' ? (data && Array.isArray(data.nodes) ? data.nodes.length : 0) : walk(data).length);

  // ---------- one version, flattened: id -> {label, note, cardIds, folded, parent, index} ----------
  function flat(data) {
    const map = new Map(), kids = new Map(), order = [];
    const w = walk(data);
    for (const { n, id, parent } of w) {
      if (map.has(id)) continue;
      const list = kids.get(parent) || [];
      map.set(id, { id, label: str(n.label), note: str(n.note), cardIds: Array.isArray(n.cardIds) ? n.cardIds.map(str) : [], folded: n.folded === true, parent, index: list.length });
      list.push(id); kids.set(parent, list);
      order.push(id);
    }
    return { map, kids, order, root: w.length ? w[0].id : null };
  }
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const FIELDS = ['label', 'note', 'folded'];
  const changed = (x, b) => !b || x.parent !== b.parent || FIELDS.some(f => x[f] !== b[f]) || !sameList(x.cardIds, b.cardIds);
  // A tree back from id -> fields and id -> ordered children.
  function build(rootId, fields, kids) {
    const make = id => { const f = fields.get(id), o = { id, label: f.label }; if (f.note) o.note = f.note; if (f.cardIds.length) o.cardIds = f.cardIds.slice(); if (f.folded) o.folded = true; return o; };
    const root = make(rootId), st = [[rootId, root]];
    while (st.length) {
      const [id, o] = st.pop(), k = kids.get(id) || [];
      if (k.length) { o.children = k.map(make); for (let i = k.length - 1; i >= 0; i--) st.push([k[i], o.children[i]]); }
    }
    return { root };
  }

  // ---------- merge (§8.3): base, mine (this app's unsaved change) and theirs (what was saved meanwhile) ----------
  function mergeMind(base, mine, theirs, prefer) {
    const B = flat(base), Mi = flat(mine), T = flat(theirs), clashes = [];
    const pm = prefer !== 'theirs';
    if (!T.root) return { data: normalizeMindmap(mine).data, clashes };
    const rootId = T.root;
    // Who survives: an edit beats a delete.
    const ids = T.order.slice();
    for (const id of Mi.order) if (!T.map.has(id)) ids.push(id);
    const keep = new Set();
    for (const id of ids) {
      const t = T.map.get(id), m = Mi.map.get(id), b = B.map.get(id);
      if (id === rootId) { keep.add(id); continue; }
      if (t && m) keep.add(id);
      else if (t) { if (!b) keep.add(id); else if (changed(t, b)) { keep.add(id); clashes.push({ id, what: 'deleted', yours: 'deleted', theirs: 'changed' }); } }
      else if (m) { if (!b || changed(m, b)) keep.add(id); }
    }
    // Words, notes, folded: three-way; cards as sets.
    const fields = new Map();
    for (const id of ids) {
      if (!keep.has(id)) continue;
      const t = T.map.get(id), m = Mi.map.get(id), b = B.map.get(id);
      if (!t || !m) { const x = t || m; fields.set(id, { label: x.label, note: x.note, folded: x.folded, cardIds: x.cardIds.slice() }); continue; }
      const f = {};
      for (const k of FIELDS) {
        const bv = b ? b[k] : undefined;
        if (m[k] === t[k] || m[k] === bv) f[k] = t[k];
        else if (t[k] === bv) f[k] = m[k];
        else { f[k] = pm ? m[k] : t[k]; clashes.push({ id, what: k, yours: m[k], theirs: t[k] }); }
      }
      const bc = b ? b.cardIds : [], add = m.cardIds.filter(c => !bc.includes(c)), drop = bc.filter(c => !m.cardIds.includes(c));
      if (sameList(m.cardIds, bc)) f.cardIds = t.cardIds.slice();
      else if (sameList(t.cardIds, bc)) f.cardIds = m.cardIds.slice();
      else {
        f.cardIds = t.cardIds.filter(c => !drop.includes(c));
        for (const c of add) if (!f.cardIds.includes(c)) f.cardIds.push(c);
      }
      fields.set(id, f);
    }
    // Parents: mine's when only mine moved it; a clash when both did; the nearest surviving ancestor when a parent is gone.
    const P = new Map(), mineParent = [];
    const up = (V, id) => { let p = V.map.has(id) ? V.map.get(id).parent : null; while (p != null && !keep.has(p)) p = V.map.has(p) ? V.map.get(p).parent : null; return p == null ? rootId : p; };
    for (const id of ids) {
      if (!keep.has(id) || id === rootId) continue;
      const t = T.map.get(id), m = Mi.map.get(id), b = B.map.get(id);
      let mineSide = false;
      if (t && m && b) {
        const mm = m.parent !== b.parent, tm = t.parent !== b.parent;
        if (mm && !tm) mineSide = true;
        else if (mm && tm && m.parent !== t.parent) { clashes.push({ id, what: 'move', yours: m.parent, theirs: t.parent }); mineSide = pm; }
      } else if (!t) mineSide = true;
      if (mineSide) mineParent.push(id); else P.set(id, up(T, id));
    }
    // Mine's moves in mine's outline order; one that would close a loop keeps theirs (a 'move' clash).
    const inMineOrder = Mi.order.filter(id => mineParent.includes(id));
    for (const id of inMineOrder) {
      const want = up(Mi, id);
      let x = want, loop = false;
      for (let g = 0; x != null && x !== rootId && g <= ids.length; g++) { if (x === id) { loop = true; break; } x = P.get(x); }
      if (want === id) loop = true;
      if (loop) { const t = T.map.get(id); P.set(id, t ? up(T, id) : rootId); clashes.push({ id, what: 'move', yours: want, theirs: t ? t.parent : null }); }
      else P.set(id, want);
    }
    // Places (§8.3 steps 1, 4 and 5). Under each parent, an idea neither side moved keeps its old place. One that only one side
    // added or moved goes right after the idea before it in that side's list (the nearest one that is in its old place or placed
    // by the same side; first when there is none), so each side's reorder survives the other's. One both sides moved goes where
    // the preferred side put it; when the two put it after different ideas, that is an 'order' clash (yours and theirs: the ideas
    // it came after, or null for first). An idea in neither side's list here (its parent there is gone) goes last.
    const members = new Map();
    for (const id of ids) if (keep.has(id) && id !== rootId) { const p = P.get(id); if (!members.has(p)) members.set(p, new Set()); members.get(p).add(id); }
    const seqOf = (V, p, set) => (V.kids.get(p) || []).filter(id => set.has(id));
    const V2 = [Mi, T], sides = pm ? [0, 1] : [1, 0];
    function placeKids(p, set) {
      const bs = seqOf(B, p, set), inB = new Set(bs), seqs = V2.map(V => seqOf(V, p, set)), has = seqs.map(l => new Set(l));
      // What each side left in its old order: as much as it can be (movedIn takes out the fewest ideas that explain the rest).
      const stay = seqs.map(l => {
        const common = l.filter(id => inB.has(id)), cs = new Set(common), moved = new Set(movedIn(bs.filter(id => cs.has(id)), common));
        return new Set(common.filter(id => !moved.has(id)));
      });
      // Who places each idea: 0 mine, 1 theirs, -1 its old place, -2 last.
      const side = new Map(), both = [];
      for (const id of set) {
        const by = [0, 1].filter(v => has[v].has(id) && !stay[v].has(id));
        if (by.length === 2) { side.set(id, sides[0]); both.push(id); }
        else side.set(id, by.length ? by[0] : inB.has(id) ? -1 : -2);
      }
      const anchor = (id, v) => {
        const l = V2[v].kids.get(p) || [];
        for (let i = l.indexOf(id) - 1; i >= 0; i--) { const s = side.get(l[i]); if (s === -1 || s === v) return l[i]; }
        return null;
      };
      for (const id of both) { const a = anchor(id, 0), b = anchor(id, 1); if (a !== b) clashes.push({ id, what: 'order', yours: a, theirs: b }); }
      // Each idea follows its anchor: the ideas a side placed come right after it (the preferred side's first), then the next
      // idea in its old place. Anchors point only back in one side's list or the old order, so they never go round in a loop.
      const follow = new Map(), after = (a, id) => { if (!follow.has(a)) follow.set(a, []); follow.get(a).push(id); };
      for (const v of sides) for (const id of seqs[v]) if (side.get(id) === v) after(anchor(id, v), id);
      const skel = bs.filter(id => side.get(id) === -1);
      skel.forEach((id, i) => after(i ? skel[i - 1] : null, id));
      const out = [], seen = new Set();
      const emit = from => {
        const st = (follow.get(from) || []).slice().reverse();
        while (st.length) {
          const id = st.pop();
          if (seen.has(id)) continue;
          seen.add(id); out.push(id);
          const f = follow.get(id) || [];
          for (let i = f.length - 1; i >= 0; i--) st.push(f[i]);
        }
      };
      emit(null);
      for (const id of set) if (!seen.has(id)) { seen.add(id); out.push(id); emit(id); }
      return out;
    }
    const kids = new Map();
    for (const id of [rootId, ...ids]) if (members.has(id) && !kids.has(id)) kids.set(id, placeKids(id, members.get(id)));
    // Two sides' moves together can go deeper than 6 levels: what would be cut moves up beside the idea at the last level instead
    // (a 'move' clash, yours and theirs: its parent on each side), so nothing either side made is lost to the cap.
    const lv = new Map([[rootId, 0]]), par = new Map(), qu = [rootId];
    const parentIn = (V, id) => (V.map.has(id) ? V.map.get(id).parent : null);
    for (let i = 0; i < qu.length; i++) {
      const id = qu[i], l = lv.get(id), k = kids.get(id) || [];
      if (l >= LIMITS.depth && k.length && par.has(id)) {
        const pk = kids.get(par.get(id));
        pk.splice(pk.indexOf(id) + 1, 0, ...k);
        kids.set(id, []);
        for (const c of k) { lv.set(c, l); par.set(c, par.get(id)); qu.push(c); clashes.push({ id: c, what: 'move', yours: parentIn(Mi, c), theirs: parentIn(T, c) }); }
      } else for (const c of k) { lv.set(c, l + 1); par.set(c, id); qu.push(c); }
    }
    // Caps (§2.1): two sides' additions together can pass 20 children under one idea, or 200 ideas. First an idea only mine moved
    // here goes back where theirs has it, when that fits (a 'move' clash: nothing is lost). Then what goes is what one side added,
    // the other side's first and the last in breadth-first order first; an idea the three versions all have goes only when
    // nothing else can. Every idea that goes is a 'cut' clash (yours and theirs: its words on each side, or null), so the banner
    // and Versions can say so.
    const words = (V, id) => (V.map.has(id) ? V.map.get(id).label : null);
    const branch = id => { const out = [], st = [id]; while (st.length) { const x = st.pop(); out.push(x); for (const c of kids.get(x) || []) st.push(c); } return out; };
    const levelAt = id => { let l = 0; for (let x = id; par.has(x); x = par.get(x)) l++; return l; };
    const heightOf = id => { let h = 0; const st = [[id, 0]]; while (st.length) { const [x, d] = st.pop(); h = Math.max(h, d); for (const c of kids.get(x) || []) st.push([c, d + 1]); } return h; };
    const otherAdded = id => !B.map.has(id) && (pm ? T.map.has(id) : Mi.map.has(id));
    const cut = id => {
      const l = kids.get(par.get(id));
      l.splice(l.indexOf(id), 1);
      for (const x of branch(id)) { clashes.push({ id: x, what: 'cut', yours: words(Mi, x), theirs: words(T, x) }); par.delete(x); kids.delete(x); }
    };
    const cq = [rootId];
    for (let i = 0; i < cq.length; i++) {
      const p = cq[i], l = kids.get(p) || [], theirsHere = new Set(T.kids.get(p) || []);
      while (l.length > LIMITS.children) {
        let back = -1, to = null;
        for (let j = l.length - 1; j >= 0 && back < 0; j--) {
          const id = l[j];
          if (!B.map.has(id) || theirsHere.has(id) || !T.map.has(id)) continue;
          const t = up(T, id), tk = kids.get(t) || [];
          if (t !== p && (t === rootId || par.has(t)) && !branch(id).includes(t) && tk.length < LIMITS.children && levelAt(t) + 1 + heightOf(id) <= LIMITS.depth) { back = j; to = t; }
        }
        if (back >= 0) {
          const id = l[back], tk = kids.get(to) || [];
          l.splice(back, 1); tk.push(id); kids.set(to, tk); par.set(id, to);
          clashes.push({ id, what: 'move', yours: p, theirs: to });
          continue;
        }
        // 0: the other side's new idea, 1: the preferred side's, 2: a new idea with older ones under it, 3: an old one.
        const rank = id => (!B.map.has(id) ? (branch(id).some(x => B.map.has(x)) ? 2 : otherAdded(id) ? 0 : 1) : theirsHere.has(id) ? 4 : 3);
        let at = -1, best = 9;
        for (let j = l.length - 1; j >= 0; j--) { const r = rank(l[j]); if (r < best) { best = r; at = j; } }
        cut(l[at]);
      }
      for (const c of l) cq.push(c);
    }
    let order = [rootId];
    for (let i = 0; i < order.length; i++) for (const c of kids.get(order[i]) || []) order.push(c);
    for (let over = order.length - LIMITS.ideas, moved = true; over > 0 && moved;) {
      moved = false;
      for (const other of [true, false]) {
        for (let i = order.length - 1; i > 0 && over > 0; i--) {
          const id = order[i];
          if (!par.has(id) || B.map.has(id) || (kids.get(id) || []).length || otherAdded(id) !== other) continue;
          cut(id); over--; moved = true;
        }
      }
    }
    const built = build(rootId, fields, kids), data = normalizeMindmap(built).data;
    // Anything normalize still had to cut is said too.
    const have = new Set(walk(data).map(x => x.id));
    for (const x of walk(built)) if (!have.has(x.id)) clashes.push({ id: x.id, what: 'cut', yours: words(Mi, x.id), theirs: words(T, x.id) });
    return { data, clashes };
  }
  function merge(kind, base, mine, theirs, opts) {
    if (typeof kind !== 'string') { opts = theirs; theirs = mine; mine = base; base = kind; kind = 'mindmap'; }
    const prefer = (opts && opts.prefer) || 'mine';
    if (kind === 'mindmap') return mergeMind(base, mine, theirs, prefer);
    return refuse('kind', kind);
  }

  // ---------- what changed between two versions ----------
  // The ideas of a sibling list that moved: the fewest whose moving explains the new order (the rest keep their order).
  function movedIn(a, b) {
    const pos = b.map(id => a.indexOf(id)), n = pos.length, len = new Array(n).fill(1), prevI = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (pos[j] < pos[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prevI[i] = j; }
    let best = -1; for (let i = 0; i < n; i++) if (best < 0 || len[i] > len[best]) best = i;
    const stay = new Set(); for (let i = best; i >= 0; i = prevI[i]) stay.add(b[i]);
    return b.filter(id => !stay.has(id));
  }
  function diffMind(a, b) {
    const A = flat(a), Bv = flat(b), lab = (V, id) => (V.map.has(id) ? V.map.get(id).label || (id === V.root ? 'the topic' : id) : id);
    const d = { added: [], removed: [], renamed: [], moved: [], noted: [], linked: [], unlinked: [], folded: [] };
    for (const id of Bv.order) if (!A.map.has(id)) { const x = Bv.map.get(id); d.added.push({ id, label: x.label, parent: x.parent, top: !x.parent || A.map.has(x.parent), under: x.parent ? lab(Bv, x.parent) : '' }); }
    for (const id of A.order) if (!Bv.map.has(id)) { const x = A.map.get(id); d.removed.push({ id, label: x.label, parent: x.parent, top: !x.parent || Bv.map.has(x.parent) }); }
    const parentMoved = new Set();
    for (const id of Bv.order) {
      const x = A.map.get(id), y = Bv.map.get(id);
      if (!x) continue;
      if (x.label !== y.label) d.renamed.push({ id, from: x.label, to: y.label });
      if (x.note !== y.note) d.noted.push({ id, label: y.label });
      const add = y.cardIds.filter(c => !x.cardIds.includes(c)), drop = x.cardIds.filter(c => !y.cardIds.includes(c));
      if (add.length) d.linked.push({ id, label: y.label, cards: add });
      if (drop.length) d.unlinked.push({ id, label: y.label, cards: drop });
      if (x.folded !== y.folded) d.folded.push({ id, label: y.label, folded: y.folded });
      if (x.parent !== y.parent && id !== Bv.root) { parentMoved.add(id); d.moved.push({ id, label: y.label }); }
    }
    for (const [p, list] of Bv.kids) {
      const common = list.filter(id => A.map.has(id) && !parentMoved.has(id) && A.map.get(id).parent === p);
      const before = (A.kids.get(p) || []).filter(id => common.includes(id));
      for (const id of movedIn(before, common)) d.moved.push({ id, label: Bv.map.get(id).label });
    }
    const at = new Map(Bv.order.map((id, i) => [id, i]));
    d.moved.sort((x, y) => at.get(x.id) - at.get(y.id));
    return d;
  }
  function diff(kind, a, b) {
    if (typeof kind !== 'string') { b = a; a = kind; kind = 'mindmap'; }
    return kind === 'mindmap' ? diffMind(a, b) : refuse('kind', kind);
  }
  // A one-line summary for Versions and the "Claude added 4 ideas" line: 'Added 3 ideas under Mitochondria', 'Renamed “ETC” to
  // “Electron transport”', 'Moved Cyanide', 'Linked a card to “Krebs cycle in the matrix”'. With `who`, it starts with the name.
  function summaryOf(d, opts) {
    const who = opts && opts.who ? str(opts.who) : '', parts = [];
    if (!d) return who ? who + ' changed nothing' : 'No changes';
    const tops = (d.added || []).filter(x => x.top), all = (d.added || []).length;
    if (all) {
      const unders = []; for (const x of tops) if (!unders.includes(x.under)) unders.push(x.under);
      const under = unders.length === 1 && unders[0] ? ' under ' + unders[0] : '';
      parts.push(all === 1 ? 'added ' + q(d.added[0].label) + under : 'added ' + all + ' ideas' + under);
    }
    const rm = d.removed || [], rmTop = rm.filter(x => x.top);
    if (rm.length) parts.push(rmTop.length === 1 ? 'deleted ' + q(rmTop[0].label) + (rm.length > 1 ? ' and ' + plural(rm.length - 1, 'idea', 'ideas') + ' under it' : '') : 'deleted ' + rm.length + ' ideas');
    if ((d.renamed || []).length) parts.push(d.renamed.length === 1 ? 'renamed ' + q(d.renamed[0].from) + ' to ' + q(d.renamed[0].to) : 'renamed ' + d.renamed.length + ' ideas');
    if ((d.moved || []).length) parts.push(d.moved.length === 1 ? 'moved ' + d.moved[0].label : 'moved ' + d.moved.length + ' ideas');
    if ((d.noted || []).length) parts.push(d.noted.length === 1 ? 'changed the note on ' + q(d.noted[0].label) : 'changed ' + d.noted.length + ' notes');
    const cards = (l, verb, to) => {
      if (!l || !l.length) return;
      const n = l.reduce((s, x) => s + x.cards.length, 0);
      parts.push(l.length === 1 ? verb + ' ' + (n === 1 ? 'a card' : n + ' cards') + ' ' + to + ' ' + q(l[0].label) : verb + ' ' + n + ' cards');
    };
    cards(d.linked, 'linked', 'to');
    cards(d.unlinked, 'unlinked', 'from');
    if ((d.folded || []).length) parts.push(d.folded.length === 1 ? 'set ' + q(d.folded[0].label) + ' to start ' + (d.folded[0].folded ? 'folded' : 'open') : 'changed how ' + d.folded.length + ' ideas start');
    if (!parts.length) return who ? who + ' changed nothing' : 'No changes';
    const s = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    return who ? who + ' ' + s : cap(s);
  }

  // ---------- edits (the web and iPhone editors both edit through these, so they behave the same) ----------
  function editMind(data, op) {
    const none = { data, summary: '' };
    if (!obj(op) || !data || !obj(data.root)) return none;
    const d = JSON.parse(JSON.stringify(data)), at = new Map(), st = [[d.root, null]];
    while (st.length) {
      const [n, p] = st.pop();
      if (!obj(n) || at.has(str(n.id))) continue;
      at.set(str(n.id), { n, p });
      for (const c of Array.isArray(n.children) ? n.children : []) st.push([c, n]);
    }
    const id = str(op.id), e = at.get(id), lab = n => (n.label ? q(n.label) : n === d.root ? 'the topic' : 'an idea');
    const kidsOf = n => (Array.isArray(n.children) ? n.children : (n.children = []));
    const tidy = n => { if (Array.isArray(n.children) && !n.children.length) delete n.children; };
    const sizeOf = n => walk({ root: n }).length;
    // The caps (§2.1) are checked before an edit, so an edit past one does nothing instead of cutting an idea that is there.
    // As a backstop, an edit after which normalize cuts anything more than it already cut is refused too.
    const done = summary => {
      const r = normalizeMindmap(d).data, lost = walk(d).length - walk(r).length;
      if (lost > 0 && lost > walk(data).length - walk(normalizeMindmap(data).data).length) return none;
      return { data: r, summary };
    };
    const levelOf = n => { let l = 0; for (let x = at.get(str(n.id)); x && x.p; x = at.get(str(x.p.id))) l++; return l; };
    const heightOf = n => { let h = 0; for (const x of walk({ root: n })) h = Math.max(h, x.level); return h; };
    const full = n => Array.isArray(n.children) && n.children.length >= LIMITS.children;
    switch (op.op) {
      case 'add': {
        const p = at.get(str(op.parent));
        if (!p || !okId(id) || at.has(id) || sizeOf(d.root) >= LIMITS.ideas || full(p.n) || levelOf(p.n) >= LIMITS.depth) return none;
        const n = { id, label: plain(op.label, LIMITS.label) }, k = kidsOf(p.n);
        let i = k.length;
        if (op.after != null) { const j = k.findIndex(c => str(c.id) === str(op.after)); i = j >= 0 ? j + 1 : 0; }
        else if (typeof op.index === 'number') i = Math.max(0, Math.min(k.length, Math.floor(op.index)));
        k.splice(i, 0, n);
        return done('Added ' + (n.label ? q(n.label) : 'an idea') + ' under ' + lab(p.n));
      }
      case 'set': {
        if (!e) return none;
        const n = e.n, said = [];
        if (op.label !== undefined) { const l = plain(op.label, LIMITS.label); if (l !== str(n.label)) { said.push(n.label && l ? 'Renamed ' + q(n.label) + ' to ' + q(l) : l ? 'Named ' + q(l) : 'Cleared ' + lab(n)); n.label = l; } }
        if (op.note !== undefined) { const t = op.note == null ? '' : cleanNote(op.note).note; if (t !== str(n.note)) { said.push('Changed the note on ' + lab(n)); if (t) n.note = t; else delete n.note; } }
        if (op.folded !== undefined && !!op.folded !== (n.folded === true)) { said.push('Set ' + lab(n) + ' to start ' + (op.folded ? 'folded' : 'open')); if (op.folded) n.folded = true; else delete n.folded; }
        return said.length ? done(said.join('; ')) : none;
      }
      case 'remove': {
        if (!e || !e.p) return none;
        const k = kidsOf(e.p), i = k.indexOf(e.n), under = sizeOf(e.n) - 1;
        k.splice(i, 1); tidy(e.p);
        return done('Deleted ' + lab(e.n) + (under ? ' and ' + plural(under, 'idea', 'ideas') + ' under it' : ''));
      }
      case 'move': case 'indent': case 'outdent': {
        if (!e || !e.p) return none;
        const k = kidsOf(e.p), i = k.indexOf(e.n);
        let to = e.p, j = i;
        if (op.op === 'indent') { if (i <= 0) return none; to = k[i - 1]; j = kidsOf(to).length; }
        else if (op.op === 'outdent') { const g = at.get(str(e.p.id)).p; if (!g) return none; to = g; j = kidsOf(g).indexOf(e.p) + 1; }
        else if (typeof op.by === 'number') { j = i + (op.by < 0 ? -1 : 1); if (j < 0 || j >= k.length) return none; }
        else {
          const p = op.parent != null ? at.get(str(op.parent)) : e.p && at.get(str(e.p.id));
          if (!p) return none;
          for (let x = p.n; x; x = at.get(str(x.id)).p) if (x === e.n) return none;
          to = p.n; j = typeof op.index === 'number' ? Math.floor(op.index) : kidsOf(to).length;
        }
        if (to !== e.p && (full(to) || levelOf(to) + 1 + heightOf(e.n) > LIMITS.depth)) return none;
        k.splice(i, 1);
        const tk = kidsOf(to);
        tk.splice(Math.max(0, Math.min(tk.length, j)), 0, e.n);
        tidy(e.p);
        return done('Moved ' + lab(e.n));
      }
      case 'link': case 'unlink': {
        const c = str(op.cardId);
        if (!e || !okId(c)) return none;
        const l = Array.isArray(e.n.cardIds) ? e.n.cardIds : [];
        if (op.op === 'link') { if (l.includes(c) || l.length >= LIMITS.cards) return none; e.n.cardIds = l.concat(c); return done('Linked a card to ' + lab(e.n)); }
        if (!l.includes(c)) return none;
        e.n.cardIds = l.filter(x => x !== c); if (!e.n.cardIds.length) delete e.n.cardIds;
        return done('Unlinked a card from ' + lab(e.n));
      }
      default: return none;
    }
  }
  function edit(kind, data, op) { return kind === 'mindmap' ? editMind(data, op) : { data, summary: '' }; }

  // ---------- layout: the mind map (§4.3) ----------
  // Boxes in columns, one per level: the topic in the middle with its main ideas split between the two sides ('both', the default,
  // from 3 main ideas), or at the left with everything to its right ('right': a stage under 700 pt wide). folds: the learner's folds on this device (id -> true or
  // false), over each idea's own `folded`. scale: the text scale (1 on the web). title: shown when the topic has no words.
  function layoutMind(data, opts) {
    const o = opts || {}, scale = o.scale > 0 ? +o.scale : 1, foldOf = getter(o.folds);
    const root = data && obj(data.root) ? data.root : { id: 'root', label: '' };
    // Every idea, in outline order, with its size.
    const all = [], st = [[root, 0, -1]];
    while (st.length && all.length < MAX_READ) {
      const [n, level, parent] = st.pop(), i = all.length;
      const k = Array.isArray(n.children) ? n.children.filter(obj) : [];
      const lv = Math.min(level, 2), text = level === 0 && !str(n.label) ? plain(o.title, LIMITS.label) : str(n.label);
      // Lines no wider than the widest box holds at this text scale, so a renderer never squeezes one by more than 8% (§4.2).
      const lines = wrap(text, Math.min(M.wrap[lv], (M.maxW - 2 * M.padX) / (M.char[lv] * scale)));
      let mu = 0; for (const l of lines) mu = Math.max(mu, units(l));
      const w0 = Math.min(M.maxW, Math.max(level === 0 ? M.rootMinW : M.minW, Math.ceil(mu * M.char[lv] * scale) + 2 * M.padX));
      // h = lines·17·scale + 18 (+6 on the topic): a line of bigger text needs a taller line.
      const h = r1(lines.length * M.lineH * scale + 2 * M.padY + (level === 0 ? M.rootPad : 0));
      const f = foldOf(str(n.id)), folded = k.length > 0 && (f === undefined || f === null ? n.folded === true : !!f);
      all.push({ id: str(n.id), level, parent, kids: [], nKids: k.length, lines, w0, w: w0, h, folded, hidden: 0, vis: false, side: 0, size: 1 });
      if (parent >= 0) all[parent].kids.push(i);
      for (let j = k.length - 1; j >= 0; j--) st.push([k[j], level + 1, i]);
    }
    // Sizes of the subtrees (for the "+N" of a folded idea), and the open spans (as if every branch were open: they pick the sides).
    for (let i = all.length - 1; i >= 0; i--) {
      const a = all[i];
      let s = 1, open = 0;
      for (const c of a.kids) { s += all[c].size; open += all[c].open; }
      a.size = s;
      a.open = Math.max(a.h, open + M.gapY * Math.max(0, a.kids.length - 1));
    }
    const R = all[0];
    R.vis = true;
    for (const a of all) {
      if (!a.vis) continue;
      if (a.folded) { a.hidden = a.size - 1; a.w = Math.min(M.maxW + M.chip, a.w0 + M.chip); continue; }
      for (const c of a.kids) all[c].vis = true;
    }
    // Sides: the first k main ideas on the right, the rest on the left, k making the two as even as possible (ties: more on the right).
    const mains = R.kids, both = o.side !== 'right' && mains.length >= 3;
    let k = mains.length;
    if (both) {
      let best = -1, bestD = 0;
      const sum = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += all[mains[i]].open; return s + M.gapY * Math.max(0, b - a - 1); };
      for (let j = 1; j < mains.length; j++) { const dd = Math.abs(sum(0, j) - sum(j, mains.length)); if (best < 0 || dd <= bestD) { best = j; bestD = dd; } }
      k = best;
    }
    for (let i = 1; i < all.length; i++) { const a = all[i]; a.side = a.level === 1 ? (mains.indexOf(i) < k ? 1 : -1) : all[a.parent].side; }
    // Visible spans, bottom up.
    for (let i = all.length - 1; i >= 0; i--) {
      const a = all[i];
      if (!a.vis) continue;
      let s = 0, n = 0;
      if (!a.folded) for (const c of a.kids) { s += all[c].span; n++; }
      a.span = Math.max(a.h, s + M.gapY * Math.max(0, n - 1));
    }
    const shown = i => !all[i].folded;
    // Tops, top down: a parent's children as a block centred in its span.
    const placeKids = (list, top) => { let y = top; for (const c of list) { all[c].top = y; y += all[c].span + M.gapY; } };
    const right = shown(0) ? mains.slice(0, k) : [], left = shown(0) ? mains.slice(k) : [];
    placeKids(right, 0); placeKids(left, 0);
    for (let i = 1; i < all.length; i++) {
      const a = all[i];
      if (!a.vis || a.folded || !a.kids.length) continue;
      let s = 0; for (const c of a.kids) s += all[c].span;
      s += M.gapY * (a.kids.length - 1);
      placeKids(a.kids, a.top + (a.span - s) / 2);
    }
    // y, bottom up: a leaf centred in its span, a parent between its first and last child (kept inside its own span, so boxes
    // of one column never meet).
    const mid = c => all[c].y + all[c].h / 2;
    for (let i = all.length - 1; i >= 1; i--) {
      const a = all[i];
      if (!a.vis) continue;
      if (a.folded || !a.kids.length) a.y = a.top + (a.span - a.h) / 2;
      else a.y = Math.max(a.top, Math.min(a.top + a.span - a.h, (mid(a.kids[0]) + mid(a.kids[a.kids.length - 1])) / 2 - a.h / 2));
    }
    // The topic: centred on the taller side, the other side moved to meet it.
    const block = l => { let s = 0; for (const c of l) s += all[c].span; return s + M.gapY * Math.max(0, l.length - 1); };
    const midOf = l => (mid(l[0]) + mid(l[l.length - 1])) / 2;
    const shift = (l, dy) => { const s2 = l.slice(); while (s2.length) { const c = s2.pop(); all[c].y += dy; if (!all[c].folded) for (const x of all[c].kids) if (all[x].vis) s2.push(x); } };
    if (!right.length && !left.length) R.y = 0;
    else {
      const tall = !left.length || (right.length && block(right) >= block(left)) ? right : left, other = tall === right ? left : right;
      const m = midOf(tall);
      if (other.length) shift(other, m - midOf(other));
      R.y = m - R.h / 2;
    }
    // x: one column per level and side, as wide as its widest box; the left side mirrors the right, its boxes right-aligned.
    R.x = 0;
    const colR = [], colL = [];
    for (const a of all) if (a.vis && a.level > 0) { const c = a.side > 0 ? colR : colL; c[a.level] = Math.max(c[a.level] || 0, a.w); }
    const xR = [0, R.w + M.gapX], eL = [0, -M.gapX];
    for (let l = 2; l < colR.length; l++) xR[l] = xR[l - 1] + (colR[l - 1] || 0) + M.gapX;
    for (let l = 2; l < colL.length; l++) eL[l] = eL[l - 1] - (colL[l - 1] || 0) - M.gapX;
    for (const a of all) if (a.vis && a.level > 0) a.x = a.side > 0 ? xR[a.level] : eL[a.level] - a.w;
    // Everything moved so the smallest x and y are the margin.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const a of all) if (a.vis) { minX = Math.min(minX, a.x); minY = Math.min(minY, a.y); maxX = Math.max(maxX, a.x + a.w); maxY = Math.max(maxY, a.y + a.h); }
    const dx = M.margin - minX, dy = M.margin - minY;
    const nodes = [], links = [];
    for (const a of all) {
      if (!a.vis) continue;
      a.x = r1(a.x + dx); a.y = r1(a.y + dy);
      nodes.push({ id: a.id, level: a.level, side: a.side, parent: a.parent >= 0 ? all[a.parent].id : null, x: a.x, y: a.y, w: r1(a.w), h: r1(a.h), lines: a.lines, folded: a.folded, hidden: a.hidden, kids: a.nKids });
    }
    for (const a of all) {
      if (!a.vis || a.parent < 0) continue;
      const p = all[a.parent], x1 = a.side > 0 ? p.x + p.w : p.x, y1 = p.y + p.h / 2, x2 = a.side > 0 ? a.x : a.x + a.w, y2 = a.y + a.h / 2, m = (x1 + x2) / 2;
      const c = [x1, y1, m, y1, m, y2, x2, y2].map(r1);
      links.push({ from: p.id, to: a.id, c, d: pathOf(c) });
    }
    return { nodes, links, width: r1(maxX - minX + 2 * M.margin), height: r1(maxY - minY + 2 * M.margin) };
  }
  const pathOf = c => 'M' + c[0] + ' ' + c[1] + ' C' + c[2] + ' ' + c[3] + ' ' + c[4] + ' ' + c[5] + ' ' + c[6] + ' ' + c[7];
  function layout(kind, data, opts) { return kind === 'mindmap' ? layoutMind(data, opts) : refuse('kind', kind); }

  const TONES = ['new', 'weak', 'getting', 'solid'];
  // ---------- a map shown inside a Note (§9.1): a layout model, never HTML ----------
  // A mind map folded to level 2 (plus whatever its own `folded` closes), two-sided at 480 wide or more, scaled to fit (never
  // above 100%) and centred. Each box keeps at most 2 lines of at most 40 characters; tone is its weak-spots tone (or null).
  function previewOf(kind, data, opts) {
    const o = opts || {}, w = o.w > 0 ? +o.w : 640, h = o.h > 0 ? +o.h : 150, toneOf = getter(o.tones);
    if (kind !== 'mindmap') return refuse('kind', kind);
    const folds = new Map();
    for (const x of walk(data)) if (x.level === 2 && Array.isArray(x.n.children) && x.n.children.length) folds.set(x.id, true);
    const L = layoutMind(data, { side: o.side || (w >= 480 ? 'both' : 'right'), folds, title: o.title });
    const s = Math.min(1, w / L.width, h / L.height), ox = (w - L.width * s) / 2, oy = (h - L.height * s) / 2;
    const X = v => r1(ox + v * s), Y = v => r1(oy + v * s), S = v => r1(v * s);
    const short = l => (cpLen(l) > 40 ? cpCut(l, 39).replace(/\s+$/, '') + '…' : l);
    const nodes = L.nodes.map(n => {
      const lines = n.lines.slice(0, 2).map(short);
      if (n.lines.length > 2) lines[1] = cpCut(lines[1], 39).replace(/[\s…]+$/, '') + '…';
      const t = toneOf(n.id);
      return { id: n.id, x: X(n.x), y: Y(n.y), w: S(n.w), h: S(n.h), lines, level: n.level, shape: 'box', tone: TONES.includes(t) ? t : null, folded: n.folded, hidden: n.hidden };
    });
    const links = L.links.map(l => pathOf(l.c.map((v, i) => (i % 2 ? Y(v) : X(v)))));
    return { w, h, scale: r1(s * 1000) / 1000, nodes, links };
  }

  // ---------- the picture as SVG (the public deck, studied decks, static boards) ----------
  // colors: the theme's tokens (text, muted, line, bg, surf, surf2, inv, invText, again, againTint, hardTint, goodTint), passed in:
  // nothing here is a color of its own. Every word and value is escaped; the picture is hidden from screen readers, which get the
  // same ideas as a list inside a list (.dg-sr).
  const esc = s => str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  function svgOf(kind, lay, colors, opts) {
    if (kind !== 'mindmap') return refuse('kind', kind);
    const o = opts || {}, c = obj(colors) ? colors : {}, col = k => esc(c[k] != null && c[k] !== '' ? c[k] : 'currentColor');
    const L = lay && Array.isArray(lay.nodes) ? lay : layoutMind(lay, {});
    const toneOf = getter(o.tones), cardsOf = new Map();
    if (o.data) for (const x of walk(o.data)) cardsOf.set(x.id, Array.isArray(x.n.cardIds) ? x.n.cardIds.length : 0);
    const SIZE = [15, 13.5, 12.5], WEIGHT = [600, 600, 500], TINT = { weak: 'againTint', getting: 'hardTint', solid: 'goodTint' };
    const links = L.links.map(l => '<path d="' + esc(l.d) + '"/>').join('');
    const nodes = L.nodes.map(n => {
      // A weak-spots tone tints any idea, the topic too (§4.8); the topic is otherwise drawn inverted.
      const lv = Math.min(n.level, 2), tone = toneOf(n.id), tint = own(TINT, tone), chipLeft = n.side < 0, inv = n.level === 0 && !tint;
      const fill = tint ? col(tint) : inv ? col('inv') : n.level === 1 ? col('surf2') : col('bg');
      const ink = inv ? col('invText') : col('text'), stroke = n.level >= 2 ? ' stroke="' + col('line') + '" stroke-width="1.5"' : '';
      const tw = n.folded ? n.w - M.chip : n.w, tx = n.folded && chipLeft ? M.chip + tw / 2 : tw / 2;
      const lh = (n.h - 2 * M.padY - (n.level === 0 ? M.rootPad : 0)) / Math.max(1, n.lines.length), top = n.h / 2 - ((n.lines.length - 1) * lh) / 2;
      const text = n.lines.map((s, i) => '<tspan x="' + r1(tx) + '" y="' + r1(top + i * lh + SIZE[lv] * 0.36) + '">' + esc(s) + '</tspan>').join('');
      let extra = '';
      if (n.folded) {
        const cx = chipLeft ? 4 : n.w - M.chip + 2;
        extra += '<rect x="' + r1(cx) + '" y="' + r1(n.h / 2 - 9) + '" width="' + (M.chip - 6) + '" height="18" rx="9" fill="' + col('surf') + '"/>'
          + '<text x="' + r1(cx + (M.chip - 6) / 2) + '" y="' + r1(n.h / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="600" fill="' + col('muted') + '">+' + n.hidden + '</text>';
      }
      if (tone === 'weak') extra += '<circle cx="' + r1(n.w - 9) + '" cy="9" r="3.5" fill="' + col('again') + '"/>';
      const nc = cardsOf.get(n.id) || 0;
      if (nc) extra += '<text x="' + r1(n.w - 6) + '" y="' + r1(n.h - 4) + '" text-anchor="end" font-size="9.5" font-weight="600" fill="' + col(inv ? 'invText' : 'muted') + '">' + nc + '</text>';
      return '<g transform="translate(' + n.x + ' ' + n.y + ')"><rect width="' + n.w + '" height="' + n.h + '" rx="' + (n.level === 0 ? Math.min(16, r1(n.h / 2)) : 10) + '" fill="' + fill + '"' + stroke + '/>'
        + '<text text-anchor="middle" fill="' + ink + '" font-size="' + SIZE[lv] + '" font-weight="' + WEIGHT[lv] + '">' + text + '</text>' + extra + '</g>';
    }).join('');
    // The screen-reader list: the whole map when its data is given, else what the picture shows.
    let sr = '';
    const items = o.data && obj(o.data.root) ? walk(o.data).map(x => [x.level, str(x.n.label)]) : L.nodes.map(n => [n.level, n.lines.join(' ')]);
    let prevLevel = 0;
    for (const [level, label] of items) {
      if (level === 0) { sr += '<p>' + esc(label || o.title || '') + '</p>'; continue; }
      if (level > prevLevel) sr += '<ul>'.repeat(level - prevLevel);
      else { sr += '</li>'; if (level < prevLevel) sr += '</ul></li>'.repeat(prevLevel - level); }
      sr += '<li>' + esc(label);
      prevLevel = level;
    }
    if (prevLevel) sr += '</li>' + '</ul></li>'.repeat(prevLevel - 1) + '</ul>';
    return '<div class="dgm-wrap" tabindex="0" role="region" aria-label="' + esc(o.title || 'Mind map') + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L.width + ' ' + L.height + '" width="' + L.width + '" height="' + L.height + '" aria-hidden="true" focusable="false" style="display:block;font-family:inherit;">'
      + '<g fill="none" stroke="' + col('line') + '" stroke-width="1.5" stroke-linecap="round">' + links + '</g>' + nodes + '</svg>'
      + '<div class="dg-sr">' + sr + '</div></div>';
  }

  // ---------- study helpers (§6.1) ----------
  const WORST = { weak: 3, getting: 2, solid: 1 };
  // An idea's tone for the weak-spots overlay, from its linked cards' tones (sched.toneOf: 'new', 'weak', 'getting', 'solid') and
  // its Test me mark ([knew, missed, last (1 knew, 0 missed), at], or {knew, missed, last}): missed last time is weak; otherwise the
  // worst tone of its studied cards; with none and knew it last time, solid; otherwise 'new' (not studied).
  function ideaTone(cardTones, mark) {
    const last = Array.isArray(mark) ? mark[2] : obj(mark) ? mark.last : undefined;
    if (mark && (last === 0 || last === false)) return 'weak';
    let worst = '';
    for (const t of Array.isArray(cardTones) ? cardTones : []) if (own(WORST, t) && (!worst || WORST[t] > WORST[worst])) worst = t;
    if (worst) return worst;
    if (mark && (last === 1 || last === true)) return 'solid';
    return 'new';
  }
  // The deck's cards best matching an idea's words, best first (Link a card; no AI): ids of cards ({id, front, back}) sharing a
  // word or a word's start with the label, the front counting more than the back; ties keep the deck's order.
  const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'onto', 'that', 'this', 'what', 'which', 'where', 'when', 'does', 'how', 'its', 'are', 'was', 'were', 'has', 'have', 'its', 'of', 'in', 'on', 'to', 'by', 'at', 'as', 'is', 'an', 'or', 'it', 'be', 'de', 'la', 'el', 'le', 'des', 'los', 'las', 'une', 'und', 'der', 'die', 'das']);
  const words = s => line1(s, false).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w && (w.length > 1 || /\p{N}/u.test(w)) && !STOP.has(w));
  function matchCards(label, cards) {
    const want = words(label);
    if (!want.length || !Array.isArray(cards)) return [];
    const scored = [];
    cards.forEach((c, i) => {
      if (!obj(c) || !ID.test(str(c.id))) return;
      const f = words(str(c.front) + ' ' + str(c.text)), b = words(c.back);
      let s = 0;
      for (const w of want) {
        const stem = w.length >= 5 ? w.slice(0, 5) : null;
        if (f.includes(w)) s += 3; else if (stem && f.some(x => x.startsWith(stem))) s += 2;
        if (b.includes(w)) s += 1.5; else if (stem && b.some(x => x.startsWith(stem))) s += 1;
      }
      if (s > 0) scored.push([s, i, str(c.id)]);
    });
    scored.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    const out = [];
    for (const x of scored) if (!out.includes(x[2])) out.push(x[2]);
    return out;
  }
  // The card ids linked anywhere in these ideas' branches (one id, a list, or none for the whole map), once each, in outline order.
  function reviewIds(data, ids) {
    const want = ids == null || ids === '' ? null : new Set((Array.isArray(ids) ? ids : [ids]).map(str)), out = [], seen = new Set();
    const root = data && obj(data.root) ? data.root : null;
    if (!root) return out;
    const st = [[root, !want]];
    while (st.length) {
      const [n, inside] = st.pop(), on = inside || want.has(str(n.id));
      if (on) for (const c of Array.isArray(n.cardIds) ? n.cardIds : []) { const s = str(c); if (s && !seen.has(s)) { seen.add(s); out.push(s); } }
      const k = Array.isArray(n.children) ? n.children : [];
      for (let i = k.length - 1; i >= 0; i--) if (obj(k[i])) st.push([k[i], on]);
    }
    return out;
  }
  // Test me's "one at a time": the hidden ideas (ids; none given: every idea but the topic) in outline order, which is also the
  // map's order on both sides; with a layout, only the ones it shows.
  function testOrder(data, lay, hidden) {
    const h = hidden == null ? null : hidden instanceof Set ? hidden : new Set((Array.isArray(hidden) ? hidden : [hidden]).map(str));
    const on = lay && Array.isArray(lay.nodes) ? new Set(lay.nodes.map(n => n.id)) : null;
    return walk(data).filter(x => x.level > 0 && (!h || h.has(x.id)) && (!on || on.has(x.id))).map(x => x.id);
  }

  return {
    LIMITS, M, units, wrap, plain, slug,
    normalize, normalizeMindmap, emptyOf, fromLegacy, mindmapFromText, fromText, textOf, pathsOf, countOf,
    edit, merge, diff, summaryOf, layoutMind, layout, previewOf, svgOf,
    ideaTone, matchCards, reviewIds, testOrder
  };
}
export default makeMaps();
