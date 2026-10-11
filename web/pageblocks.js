// A Note page as blocks: the JSON a typed Page keeps (the deck's Pages, the owner's approval of 2026-10-11), and the Markdown the Notes editor and the
// Guide write (web/guide.js). The server, the AI link (MCP), the web and the iPhone convert with this one file, so a page reads the same everywhere.
// It needs nothing but guide.js's own functions (blocks, markdown): the Markdown is read and written by guide.js, never by hand here, so what is safe
// there is safe here (no raw HTML; a link only http, https, mailto or #; a picture only http(s) or /path), and a page round-trips exactly.
// Like guide.js, the work is one function with no imports (makePageBlocks(guide)), so it runs in node, a browser and JavaScriptCore alike (JavaScriptCore:
// evaluate the function itself, from its first line to the line before "const PB =", and call it with guide.js's makeGuide()).
//
// THE BLOCKS (every one may carry an id: 1 to 40 letters, digits, - and _, unique in the page; one without is given 'b' and 8 random base-36 characters):
//   { type:'heading', level:1|2|3, text }                 { type:'text', text }                    { type:'quote', text }
//   { type:'list', style:'bullet'|'number'|'todo', items:[{ text, checked?, items? }] }   (checked: on every item of a to-do list, never on others;
//                                                                                          items: the ones nested under it, in the list's own style)
//   { type:'callout', style:'trap'|'pearl'|'mnemonic'|'note', title?, text }   (text is Markdown: paragraphs, lists, even toggles)
//   { type:'toggle', title, blocks:[...] }                 { type:'table', header:[str], rows:[[str]] }      { type:'chain', steps:[str] }
//   { type:'code', lang, text }    { type:'image', src, alt }    { type:'divider' }    { type:'card', cardId }    { type:'embed', pageId }
// text, title, a cell and a step are inline Markdown (**bold** *italic* ~~strike~~ `code` [links](https://...)), written the way guide.js writes them.
// A text block's text may be any Markdown: more than one block in it becomes those blocks.
//
// THE FUNCTIONS (none throws):
//   NOTE_BLOCK_TYPES                 the type names above
//   normalizeNote(input) -> { blocks, warnings? }   input: { blocks }, { markdown }, or a Markdown string. Unknown types and bad ids are dropped; strings
//                                    are trimmed and cut; at most 2,000 blocks (list items count) and 200,000 characters; toggles nest at most 6 deep;
//                                    everything is written the one way markdownToNote would read it back (so normalizing twice changes nothing).
//   noteToMarkdown(note) -> string   markdownToNote(md, previous?) -> { blocks }   (ids are new, except that a block whose content is the same as one
//                                    of the previous note's keeps that one's id, matched in order)
//   blockMarkdown(note, blockId) -> the Markdown of that one block (with what it holds), '' when there is none
// noteToMarkdown(markdownToNote(md)) is md as guide.js would write it, and markdownToNote(noteToMarkdown(n)) is normalizeNote(n) (ids aside).
// guide.js reads at most 60,000 characters of Markdown at once (guide.MAX): a longer page is read up to there, and a warning says so.
import guide from './guide.js';

export function makePageBlocks(G) {
  const TYPES = ['heading', 'text', 'quote', 'list', 'callout', 'toggle', 'table', 'chain', 'code', 'image', 'divider', 'card', 'embed'];
  const MAX_BLOCKS = 2000, MAX_CHARS = 200000, MAX_TOGGLE = 6, MAX_ITEM_DEPTH = 8, MAX_STEPS = 12, MAX_COLS = 64, MAX_ROWS = 1000;
  const CUT = { text: 20000, title: 500, cell: 2000, step: 300, code: 50000, src: 2000, alt: 500 };
  const STYLES = { trap: 1, pearl: 1, mnemonic: 1, note: 1 }, LIST = { bullet: 'ul', number: 'ol', todo: 'todo' }, LIST_OF = { ul: 'bullet', ol: 'number', todo: 'todo' };
  const ID = /^[A-Za-z0-9_-]{1,40}$/, LANG = /^[A-Za-z0-9_+#-]{1,20}$/, IMG = /^(?:https?:\/\/[^\/?#\s]|\/(?!\/))/i;
  const HOLDS = { ul: 1, ol: 1, todo: 1, toggle: 1, quote: 1, callout: 1 };
  const str = v => { try { return v == null ? '' : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''; } catch (e) { return ''; } };
  const cut = (v, n) => { let s = str(v).trim(); if (s.length > n) { s = s.slice(0, n); const c = s.charCodeAt(n - 1); if (c >= 0xd800 && c <= 0xdbff) s = s.slice(0, -1); } return s; };
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);

  // ---------- inline Markdown <-> guide.js's runs ----------
  // A string's runs: the words of whatever guide.js reads in it (a second paragraph joins the first with a space; `one` keeps it to one line).
  function runsOf(s, one) {
    const out = [];
    for (const b of G.blocks(str(s))) {
      if (!Array.isArray(b.r) || !b.r.length) continue;
      if (out.length) out.push({ t: one ? ' ' : '\n' });
      out.push(...b.r);
    }
    return one ? out.map(r => ({ ...r, t: r.t.replace(/\n/g, ' ') })) : out;
  }
  // Runs as inline Markdown, written the way guide.js writes a line ('' for none).
  function mdOf(r) {
    if (!r || !r.length) return '';
    const md = G.markdown([{ k: 'p', d: 0, r }]).replace(/\n$/, '');
    return md === '&nbsp;' ? '' : md;
  }
  const inline = (s, one) => mdOf(runsOf(s, one));
  // A chain's steps and its one line (" → " between steps), as guide.js keeps a chain.
  function joinSteps(steps) {
    const out = [];
    for (const st of steps) { if (!st.length) continue; if (out.length) out.push({ t: ' → ' }); out.push(...st); }
    return out;
  }
  function cutRuns(rs, a, b) {
    const out = []; let at = 0;
    for (const x of rs) { const s0 = at, e0 = at + x.t.length; at = e0; const f = Math.max(a, s0), t = Math.min(b, e0); if (f < t) out.push({ ...x, t: x.t.slice(f - s0, t - s0) }); }
    return out;
  }
  function splitSteps(rs) {
    const t = rs.map(x => x.t).join(''), out = [], re = /\s*→\s*/g;
    let from = 0, m;
    while ((m = re.exec(t))) { out.push(cutRuns(rs, from, m.index)); from = m.index + m[0].length; }
    out.push(cutRuns(rs, from, t.length));
    return out.map(mdOf).filter(Boolean);
  }

  // ---------- JSON blocks -> guide.js's blocks (one under the other, d how far in) ----------
  function toEditor(blocks, d, out) {
    for (const b of blocks) {
      switch (b.type) {
        case 'heading': out.push({ k: 'h', d, level: b.level, r: runsOf(b.text, true) }); break;
        case 'text': { const bs = G.blocks(b.text); if (!bs.length) out.push({ k: 'p', d, r: [] }); else for (const x of bs) out.push({ ...x, d: x.d + d }); break; }
        case 'quote': out.push({ k: 'quote', d, r: runsOf(b.text) }); break;
        case 'list': items(b.items, LIST[b.style], d, out); break;
        case 'callout': out.push({ k: 'callout', d, style: b.style, r: runsOf(b.title || '', true) }); for (const x of G.blocks(b.text)) out.push({ ...x, d: x.d + d + 1 }); break;
        case 'toggle': out.push({ k: 'toggle', d, r: runsOf(b.title, true) }); toEditor(b.blocks, d + 1, out); break;
        case 'table': out.push({ k: 'table', d, align: b.header.map(() => ''), rows: [b.header, ...b.rows].map(row => row.map(c => runsOf(c, true))) }); break;
        case 'chain': out.push({ k: 'chain', d, r: joinSteps(b.steps.map(s => runsOf(s, true))) }); break;
        case 'code': out.push({ k: 'code', d, lang: b.lang, text: b.text }); break;
        case 'image': out.push({ k: 'img', d, src: b.src, alt: b.alt, title: '' }); break;
        case 'divider': out.push({ k: 'hr', d }); break;
        case 'card': out.push({ k: 'card', d, ref: b.cardId }); break;
        case 'embed': out.push({ k: 'page', d, ref: b.pageId }); break;
        default: break;
      }
    }
    return out;
  }
  function items(list, k, d, out) {
    for (const it of list) {
      const e = { k, d, r: runsOf(it.text) };
      if (k === 'todo') e.on = !!it.checked;
      out.push(e);
      if (it.items) items(it.items, k, d + 1, out);
    }
  }

  // ---------- guide.js's blocks -> JSON blocks ----------
  // The blocks as a tree (each with what it holds), the way guide.js nests them.
  function tree(list) {
    const root = { kids: [] }, stack = [{ node: root, d: -1 }];
    let prev = null;
    for (const b of list) {
      const most = prev ? prev.d + (HOLDS[prev.k] ? 1 : 0) : 0, d = Math.max(0, Math.min(b.d, most));
      while (stack.length > 1 && stack[stack.length - 1].d >= d) stack.pop();
      const node = { b: { ...b, d }, kids: [] };
      stack[stack.length - 1].node.kids.push(node);
      if (HOLDS[b.k]) stack.push({ node, d });
      prev = node.b;
    }
    return root.kids;
  }
  // A node and what it holds as guide.js's blocks again, from depth 0.
  function flat(nodes, d, out) { for (const n of nodes) { out.push({ ...n.b, d }); flat(n.kids, d + 1, out); } return out; }
  const isList = k => k === 'ul' || k === 'ol' || k === 'todo';
  function fromNodes(nodes) {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i], b = n.b;
      switch (b.k) {
        case 'p': out.push({ type: 'text', text: mdOf(b.r) }); break;
        case 'h': out.push({ type: 'heading', level: Math.min(3, b.level), text: mdOf(b.r) }); break;
        case 'quote': out.push({ type: 'quote', text: mdOf(b.r) }, ...fromNodes(n.kids)); break;
        case 'ul': case 'ol': case 'todo': {
          // the items next to each other of one kind are one list; what an item holds that isn't an item comes after the list
          const style = LIST_OF[b.k], after = [], list = { type: 'list', style, items: [] };
          let j = i;
          for (; j < nodes.length && nodes[j].b.k === b.k; j++) list.items.push(item(nodes[j], style, after));
          i = j - 1;
          out.push(list, ...fromNodes(after));
          break;
        }
        case 'toggle': out.push({ type: 'toggle', title: mdOf(b.r), blocks: fromNodes(n.kids) }); break;
        case 'callout': {
          const c = { type: 'callout', style: STYLES[b.style] ? b.style : 'note' }, t = mdOf(b.r);
          if (t) c.title = t;
          c.text = n.kids.length ? G.markdown(flat(n.kids, 0, [])).replace(/\n$/, '') : '';
          out.push(c);
          break;
        }
        case 'table': out.push({ type: 'table', header: b.rows[0].map(mdOf), rows: b.rows.slice(1).map(r => r.map(mdOf)) }); break;
        case 'chain': out.push({ type: 'chain', steps: splitSteps(b.r) }); break;
        case 'code': out.push({ type: 'code', lang: b.lang || '', text: b.text }); break;
        case 'img': out.push({ type: 'image', src: b.src, alt: b.alt || '' }); break;
        case 'hr': out.push({ type: 'divider' }); break;
        case 'card': out.push({ type: 'card', cardId: b.ref }); break;
        case 'page': out.push({ type: 'embed', pageId: b.ref }); break;
        default: break;
      }
    }
    return out;
  }
  function item(n, style, after) {
    const it = { text: mdOf(n.b.r) };
    if (style === 'todo') it.checked = n.b.k === 'todo' ? !!n.b.on : false;
    const sub = [];
    for (const k of n.kids) { if (isList(k.b.k)) sub.push(item(k, style, after)); else after.push(k); }
    if (sub.length) it.items = sub;
    return it;
  }
  const fromMd = md => fromNodes(tree(G.blocks(md)));

  // ---------- normalizing ----------
  function normalize(input, warn) {
    let raw;
    if (typeof input === 'string') raw = fromMd(input);
    else if (obj(input) && Array.isArray(input.blocks)) raw = input.blocks;
    else if (obj(input) && typeof input.markdown === 'string') raw = fromMd(input.markdown);
    else { if (input != null) warn('not a note: give { blocks }, { markdown } or Markdown'); return []; }
    if (typeof input === 'string' || (obj(input) && !Array.isArray(input.blocks))) { const md = typeof input === 'string' ? input : input.markdown; if (md.length > G.MAX) warn('the Markdown is longer than ' + G.MAX + ' characters: only that much was read'); }
    const S = { blocks: 0, chars: 0, full: false, ids: new Set() };
    const out = blockList(raw, 0, S, warn);
    if (S.full) warn('the note is over ' + MAX_BLOCKS + ' blocks or ' + MAX_CHARS + ' characters: the rest was left out');
    ids(out, S.ids);
    return out;
  }
  // Room for one more block of n characters (once full, nothing more goes in).
  function room(S, n) {
    if (S.full) return false;
    if (S.blocks + 1 > MAX_BLOCKS || S.chars + n > MAX_CHARS) { S.full = true; return false; }
    S.blocks++; S.chars += n;
    return true;
  }
  function blockList(raw, depth, S, warn) {
    const out = [];
    for (const x of Array.isArray(raw) ? raw : []) {
      if (S.full) break;
      if (!obj(x)) { warn('a block that is not an object was left out'); continue; }
      const got = one(x, depth, S, warn);
      for (const b of got) {
        // lists of one style side by side are one list (Markdown can't tell them apart)
        const p = out[out.length - 1];
        if (b.type === 'list' && p && p.type === 'list' && p.style === b.style) { p.items.push(...b.items); continue; }
        out.push(b);
      }
    }
    return out;
  }
  const keep = (x, b) => { if (typeof x.id === 'string' && ID.test(x.id)) b.id = x.id; return b; };
  function one(x, depth, S, warn) {
    switch (x.type) {
      case 'heading': {
        const text = inline(cut(x.text, CUT.title), true), lv = Math.floor(+x.level);
        return room(S, text.length) ? [keep(x, { type: 'heading', level: lv >= 1 && lv <= 3 ? lv : lv > 3 ? 3 : 1, text })] : [];
      }
      case 'text': {
        const md = cut(x.text, CUT.text), bs = G.blocks(md);
        if (bs.length === 1 && bs[0].k === 'p' || !bs.length) { const text = bs.length ? mdOf(bs[0].r) : ''; return room(S, text.length) ? [keep(x, { type: 'text', text })] : []; }
        // more than one line of words, or another kind of block: those blocks (the first keeps the id)
        const got = blockList(fromNodes(tree(bs)), depth, S, warn);
        if (got.length && typeof x.id === 'string' && ID.test(x.id)) got[0].id = x.id;
        return got;
      }
      case 'quote': { const text = inline(cut(x.text, CUT.text)); return room(S, text.length) ? [keep(x, { type: 'quote', text })] : []; }
      case 'list': {
        const style = LIST[x.style] ? x.style : 'bullet';
        if (!LIST[x.style]) warn('a list of an unknown style is a bulleted list');
        if (!room(S, 0)) return [];
        const its = listItems(x.items, style, 0, S);
        return its.length ? [keep(x, { type: 'list', style, items: its })] : [];
      }
      case 'callout': {
        const style = STYLES[x.style] ? x.style : 'note', title = inline(cut(x.title, CUT.title), true), text = cut(x.text, CUT.text);
        if (!STYLES[x.style]) warn('a callout of an unknown style is a note');
        const md = text ? G.markdown(G.blocks(text)).replace(/\n$/, '') : '';
        if (!room(S, title.length + md.length)) return [];
        const b = { type: 'callout', style };
        if (title) b.title = title;
        b.text = md;
        return [keep(x, b)];
      }
      case 'toggle': {
        const title = inline(cut(x.title, CUT.title), true);
        if (depth >= MAX_TOGGLE) {
          // too deep: its title is a line of text and what it holds follows it
          warn('toggles nest at most ' + MAX_TOGGLE + ' deep: a deeper one is its title and what it holds');
          if (!room(S, title.length)) return [];
          return [keep(x, { type: 'text', text: title }), ...blockList(x.blocks, depth, S, warn)];
        }
        if (!room(S, title.length)) return [];
        return [keep(x, { type: 'toggle', title, blocks: blockList(x.blocks, depth + 1, S, warn) })];
      }
      case 'table': {
        const head = (Array.isArray(x.header) ? x.header : []).slice(0, MAX_COLS), rows = (Array.isArray(x.rows) ? x.rows : []).filter(Array.isArray).slice(0, MAX_ROWS);
        const n = Math.max(1, head.length || (rows[0] ? Math.min(MAX_COLS, rows[0].length) : 1));
        const cell = c => inline(cut(c, CUT.cell), true), row = r => Array.from({ length: n }, (_, i) => cell(r[i]));
        const b = { type: 'table', header: row(head), rows: rows.map(row) };
        const size = [b.header, ...b.rows].reduce((m, r) => m + r.reduce((k, c) => k + c.length, 0), 0);
        return room(S, size) ? [keep(x, b)] : [];
      }
      case 'chain': {
        const steps = [];
        for (const s of Array.isArray(x.steps) ? x.steps : []) for (const p of splitSteps(runsOf(cut(s, CUT.step), true))) if (steps.length < MAX_STEPS) steps.push(p);
        if (Array.isArray(x.steps) && x.steps.length > MAX_STEPS) warn('a chain has at most ' + MAX_STEPS + ' steps');
        return room(S, steps.join('').length) ? [keep(x, { type: 'chain', steps })] : [];
      }
      case 'code': {
        const lang = LANG.test(str(x.lang).trim()) ? str(x.lang).trim() : '';
        let text = str(x.text).replace(/\r\n?/g, '\n'); if (text.length > CUT.code) text = text.slice(0, CUT.code);
        text = text.replace(/\n+$/, '');
        return room(S, text.length) ? [keep(x, { type: 'code', lang, text })] : [];
      }
      case 'image': {
        const src = cut(x.src, CUT.src), alt = cut(x.alt, CUT.alt).replace(/\s+/g, ' ');
        // (only an address guide.js would show: http(s), or one of this app's own /paths)
        const back = src && IMG.test(src) ? fromMd('![' + alt.replace(/[!-\/:-@\[-`{-~]/g, '\\$&') + '](<' + src.replace(/[<>\s]/g, encodeURIComponent) + '>)') : [];
        const img = back.length === 1 && back[0].type === 'image' ? back[0] : null;
        if (!img) { warn('a picture with an address that is not http(s) or a /path was left out'); return []; }
        return room(S, img.src.length + img.alt.length) ? [keep(x, img)] : [];
      }
      case 'divider': return room(S, 0) ? [keep(x, { type: 'divider' })] : [];
      case 'card': { const id = str(x.cardId).trim(); if (!ID.test(id)) { warn('a card with a bad id was left out'); return []; } return room(S, id.length) ? [keep(x, { type: 'card', cardId: id })] : []; }
      case 'embed': { const id = str(x.pageId).trim(); if (!ID.test(id)) { warn('a page with a bad id was left out'); return []; } return room(S, id.length) ? [keep(x, { type: 'embed', pageId: id })] : []; }
      default: warn('a block of an unknown type (' + str(x.type).slice(0, 40) + ') was left out'); return [];
    }
  }
  function listItems(raw, style, depth, S) {
    const out = [];
    for (const it of Array.isArray(raw) ? raw : []) {
      if (!obj(it)) continue;
      const text = inline(cut(it.text, CUT.text));
      if (!room(S, text.length)) break;
      const o = { text };
      if (style === 'todo') o.checked = it.checked === true;
      if (Array.isArray(it.items) && it.items.length && depth + 1 < MAX_ITEM_DEPTH) { const sub = listItems(it.items, style, depth + 1, S); if (sub.length) o.items = sub; }
      out.push(o);
    }
    return out;
  }
  // Every block an id, unique in the page: its own when it has a good one not used before, else a new one.
  function newId(used) { let id; do { id = 'b'; for (let i = 0; i < 8; i++) id += '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]; } while (used.has(id)); used.add(id); return id; }
  function ids(blocks, used) {
    walk(blocks, b => { if (b.id && !used.has(b.id)) used.add(b.id); else if (b.id) delete b.id; });
    walk(blocks, b => { if (!b.id) b.id = newId(used); });
    // (the id first, then the rest, as it reads best)
    const order = b => { const o = { id: b.id }; for (const k in b) if (k !== 'id') o[k] = b[k]; return o; };
    const fix = list => list.map(b => { const o = order(b); if (o.type === 'toggle') o.blocks = fix(o.blocks); return o; });
    blocks.splice(0, blocks.length, ...fix(blocks));
  }
  function walk(blocks, fn) { for (const b of blocks) { fn(b); if (b.type === 'toggle') walk(b.blocks, fn); } }

  // ---------- the API ----------
  function normalizeNote(input) {
    const warnings = [];
    let blocks = [];
    try { blocks = normalize(input, w => { if (warnings.length < 50 && !warnings.includes(w)) warnings.push(w); }); }
    catch (e) { blocks = []; warnings.push('the note could not be read'); }
    return warnings.length ? { blocks, warnings } : { blocks };
  }
  function noteToMarkdown(note) {
    try {
      const n = normalizeNote(Array.isArray(note) ? { blocks: note } : note);
      return G.markdown(toEditor(n.blocks, 0, []));
    } catch (e) { return ''; }
  }
  // What a block says, without its id (the ids of what a toggle holds left out too): two blocks with the same key have the same content.
  const keyOf = b => JSON.stringify(b, (k, v) => (k === 'id' ? undefined : v));
  function markdownToNote(md, previous) {
    try {
      const n = normalizeNote(str(md));
      const prev = previous && typeof previous === 'object' ? previous : null;
      if (prev) {
        // a block whose content didn't change keeps its id: the previous note's blocks with that content, in order
        const old = normalizeNote(Array.isArray(prev) ? { blocks: prev } : prev).blocks, queue = new Map(), used = new Set();
        walk(old, b => { const k = keyOf(b); if (!queue.has(k)) queue.set(k, []); queue.get(k).push(b.id); });
        const fresh = [];
        walk(n.blocks, b => { const q = queue.get(keyOf(b)); const id = q && q.length ? q.shift() : ''; if (id && !used.has(id)) { b.id = id; used.add(id); } else fresh.push(b); });
        for (const b of fresh) if (used.has(b.id)) b.id = newId(used); else used.add(b.id);
      }
      return n;
    } catch (e) { return { blocks: [] }; }
  }
  function find(blocks, id) {
    for (const b of blocks) { if (b.id === id) return b; if (b.type === 'toggle') { const f = find(b.blocks, id); if (f) return f; } }
    return null;
  }
  function blockMarkdown(note, blockId) {
    try {
      const n = normalizeNote(Array.isArray(note) ? { blocks: note } : note), b = find(n.blocks, str(blockId));
      return b ? G.markdown(toEditor([b], 0, [])) : '';
    } catch (e) { return ''; }
  }
  return { NOTE_BLOCK_TYPES: TYPES.slice(), normalizeNote, noteToMarkdown, markdownToNote, blockMarkdown };
}

const PB = makePageBlocks(guide);
export const NOTE_BLOCK_TYPES = PB.NOTE_BLOCK_TYPES;
export const normalizeNote = PB.normalizeNote;
export const noteToMarkdown = PB.noteToMarkdown;
export const markdownToNote = PB.markdownToNote;
export const blockMarkdown = PB.blockMarkdown;
export default PB;
