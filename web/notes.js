// A deck's Notes (its Guide and the Guide's extra pages) as one page that is always formatted, where you click and type, like Apple Notes or Notion:
// no Markdown marks to see and nothing to switch between. design/build.mjs pastes this function into the boards that show a page of notes (WebGuide and
// PhoneGuide, the deck pages' Notes tabs, a shared deck's page, Make cards' review), so the canvas runs what the app runs; like guide.js it is one
// self-contained function with no imports.
//
// WHAT IT EDITS. What is kept is Markdown (web/guide.js reads it into blocks and writes them back: blocks(md), markdown(blocks)). Here the page is those
// blocks, one row each: text, Heading and Subheading (levels 1 and 2; Markdown's other levels stay as they are), bulleted and numbered items, to-dos, toggles,
// quotes, dividers, code, pictures and tables. What a list item, toggle or quote holds follows it one level in.
//   - A heading starts a section: its ▸ (on hover on a computer, always on a phone) folds what is under it until the next heading of the same or a higher level.
//   - A toggle's line is its title; its ▸ opens what it holds.
//   - Which toggles are open and which sections are folded is how this device shows the page, not part of the note: it is remembered in localStorage
//     (lucida.notes.view, by deck and page, and by the toggle's or heading's words). A reader of a shared deck can open and close them too.
//
// EDITING. Every key goes through the blocks (beforeinput is always cancelled; the browser never edits the page itself), so what shows is what is saved:
//   Enter starts a line of the same kind (an empty item turns back into text; at the end of an open toggle, a line inside it), Shift+Enter a line break,
//   Backspace at the start of a line turns it into text, then out one level, then joins it to the line above, Tab and Shift+Tab nest and un-nest.
//   Typed at the start of a line, "# " "## " "### " "- " "1. " "[] " "> " (a toggle, as in Notion) "```" and "---" make that kind of line, and their marks go.
//   **bold** *italic* ~~strike~~ `code` finish as they are typed. ⌘B ⌘I ⌘⇧X ⌘E ⌘K (bold, italic, strikethrough, code, link), ⌘Z and ⌘⇧Z.
//   The + on an empty line and "/" open the block menu (Toggle list and Heading first); words selected show the format bar (Bold, Italic, Strikethrough,
//   Code, Link). On a phone, a bar above the keyboard has Aa (Heading, Subheading, Text), To-do, Bullets, Toggle, Picture and Done, and Bold, Italic,
//   Strikethrough, Code and Link while words are selected. All of it is Lucida's own (nothing from the browser).
// Pasting reads Markdown (and this page's own copies), a web page's or a document's formatting, or plain lines; copying gives Markdown and safe HTML.
//
// THE OUTLINE (Notion's page outline; the owner, 2026-10-02: "add that thing notion has where it shows a rail tree of sections"). With `outline` on and two
// headings or more, a quiet rail of short lines sits at the right of the note and stays in view as it scrolls: a line for each heading, a subheading's
// shorter and further in, the section being read in the words' color. On a computer the pointer on it (or the keyboard's focus) opens a small card with
// the headings' names as a tree, the one being read in bold; a press scrolls to that heading (at once with Reduce Motion), and the card closes when the
// pointer leaves. On a phone a tap opens the same tree in Lucida's own sheet: a heading scrolls there and closes it, and the rail is hidden while the
// keyboard is up. A heading in a folded section or a closed toggle is in it too: going to it opens what it is in, as its ▸ does. It follows the page as
// it is written. (Where it sits: --nb-ol-x, how far right of the note, and --nb-ol-top, where it stays when the page scrolls, on the element.)
//
// SAFE. Words are put in as text nodes; a link is an <a> only when reading, with an address guide.js allows (http, https, mailto, #) and
// rel="nofollow ugc noopener"; a picture only from where `image(src)` says it may come. The few icons are this file's own SVG.
//
// USE. makeNotes(guide).mount(element, options) draws a page into the element (and keeps it as long as the element stays): options are
//   md            the page's Markdown (when it changes from outside, like an older version brought back, the page is read again)
//   key           where it is (deck and page): what the device remembers is under it, and a new key is a new page
//   editable      it can be written in (otherwise it is the page to read)
//   onChange(md)  every change, as Markdown          onOpen({ i, off })  reading: a press on the words (the owner's page then opens to write in)
//   onPicture()   a Promise of a picture's address (null when none was picked); without it there is no Picture
//   image(src)    the address a picture may show from, or '' (the app's own /media/ files by default)
//   phone         the phone's look: the ▸ of headings always shows, the bar above the keyboard instead of the format bar
//   focusAt       { i, off } (or 'end') where the caret goes the first time         onEscape()  Escape with nothing open
//   outline       the rail of the headings at the page's right (above)               sheetHost   on the canvas, where a phone's outline sheet is drawn
//   demo          the canvas's states: { open: 'all' | 'none' | 'first', fold: [heading indexes], emptyAt: i, menu: true, bar: { i, a, b }, keys: true,
//                 outline: true (the outline's card open; on a phone, its sheet) }
// and returns { focus(at), flush(), selectedText(), blocks() }.
export function makeNotes(G) {
  const TEXT = { p: 1, h: 1, ul: 1, ol: 1, todo: 1, toggle: 1, quote: 1 }, HOLDS = { ul: 1, ol: 1, todo: 1, toggle: 1, quote: 1 }, ONE_LINE = { h: 1, toggle: 1 };
  const ATOM = { hr: 1, img: 1, table: 1 }, MAX_DEPTH = 8, MEM = 'lucida.notes.view';
  const ownImage = src => (/^\/media\/[\w-]+\.(?:png|jpe?g|gif|webp)$/i.test(src) ? src : '');

  // ---------- runs: a line's words and what they are ----------
  const MK = ['b', 'i', 's', 'c'];
  const sameM = (x, y) => !!x.b === !!y.b && !!x.i === !!y.i && !!x.s === !!y.s && !!x.c === !!y.c && (x.a || '') === (y.a || '') && (x.lt || '') === (y.lt || '');
  function mk(t, m) { const r = { t }; for (const k of MK) if (m && m[k]) r[k] = true; if (m && m.a) { r.a = m.a; if (m.lt) r.lt = m.lt; } return r; }
  function tidy(rs) { const out = []; for (const x of rs) { if (!x || !x.t) continue; const p = out[out.length - 1]; if (p && sameM(p, x)) p.t += x.t; else out.push(mk(x.t, x)); } return out; }
  const rlen = rs => { let n = 0; for (const x of rs) n += x.t.length; return n; };
  const rtext = rs => rs.map(x => x.t).join('');
  function rcut(rs, a, b) {
    const out = []; let at = 0;
    for (const x of rs) { const s = at, e = at + x.t.length; at = e; const f = Math.max(a, s), t = Math.min(b, e); if (f < t) out.push(mk(x.t.slice(f - s, t - s), x)); }
    return out;
  }
  const rsplice = (rs, a, b, ins) => tidy([...rcut(rs, 0, a), ...(ins || []), ...rcut(rs, b, rlen(rs))]);
  const rmap = (rs, a, b, fn) => tidy([...rcut(rs, 0, a), ...rcut(rs, a, b).map(x => mk(x.t, fn({ ...x }))), ...rcut(rs, b, rlen(rs))]);
  function markAt(rs, i) { let at = 0; for (const x of rs) { if (i < at + x.t.length) return x; at += x.t.length; } return null; }
  // What typing at i is written with: bold, italic and strikethrough of the letter before (or of the one after, at the start); code and a link only inside them.
  function typing(rs, i) {
    const before = i > 0 ? markAt(rs, i - 1) : null, after = markAt(rs, i), m = {}, from = before || after;
    if (from) for (const k of ['b', 'i', 's']) if (from[k]) m[k] = true;
    if (before && after && before.c && after.c) m.c = true;
    if (before && after && before.a && after.a === before.a) { m.a = before.a; if (before.lt) m.lt = before.lt; }
    return m;
  }
  const oneLine = rs => tidy(rs.map(x => mk(x.t.replace(/\n/g, ' '), x)));

  // ---------- blocks ----------
  let uid = 0;
  const withId = b => ({ ...b, id: 'n' + (++uid) });
  const wordsOf = b => (TEXT[b.k] ? b.r : b.k === 'code' ? (b.text ? [{ t: b.text }] : []) : []);
  const isEmpty = b => (TEXT[b.k] ? !rlen(b.r) : b.k === 'code' ? !b.text : false);
  // Depths as Markdown can hold them: never more than one level further in than the block before can hold.
  function settle(list) {
    let prev = null;
    return list.map(b => { const most = prev ? prev.d + (HOLDS[prev.k] ? 1 : 0) : 0, d = Math.max(0, Math.min(b.d, most, MAX_DEPTH)), out = d === b.d ? b : { ...b, d }; prev = out; return out; });
  }
  // The index after block i and what it holds.
  const endOf = (list, i) => { let j = i + 1; while (j < list.length && list[j].d > list[i].d) j++; return j; };
  // What is saved: no empty lines at the end, and nothing at all when every line is empty.
  function saved(list) {
    let n = list.length;
    while (n > 0 && list[n - 1].k === 'p' && !list[n - 1].d && isEmpty(list[n - 1])) n--;
    const keep = list.slice(0, n);
    return keep.every(b => TEXT[b.k] && isEmpty(b)) ? '' : G.markdown(keep);
  }

  // ---------- what this device remembers: toggles open, sections folded ----------
  function memRead() { try { const v = JSON.parse(localStorage.getItem(MEM) || 'null'); return v && typeof v === 'object' && v.pages && typeof v.pages === 'object' ? v : { pages: {} }; } catch (e) { return { pages: {} }; } }
  function memWrite(v) { try { localStorage.setItem(MEM, JSON.stringify(v)); } catch (e) { /* no storage (a private window): it is kept while the page is open */ } }
  // A toggle's or a heading's name on this device: its words, and which of the ones with the same words it is.
  function viewKeys(list) {
    const seen = new Map(), out = new Map();
    for (const b of list) if (b.k === 'toggle' || b.k === 'h') { const w = b.k + ':' + rtext(b.r).trim().slice(0, 160), n = seen.get(w) || 0; seen.set(w, n + 1); out.set(b.id, w + '#' + n); }
    return out;
  }

  // ---------- drawing ----------
  const SVG = {
    chev: '<path d="M9 6l6 6-6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
    todo: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>', toggle: '<path d="M8 6l8 6-8 6z" fill="currentColor" stroke="none"/>',
    quote: '<path d="M6 7v10M11 9h8M11 15h6"/>', hr: '<path d="M4 12h16"/>', code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3L15 13l4 4"/>', table: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 10h17M10 10v9"/>',
    down: '<path d="M6 9l6 6 6-6"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', num: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5.5l1.5-1V9M3.8 14.2a1.4 1.4 0 1 1 2.2 1.4L4 18h2.4" stroke-width="1.5"/>'
  };
  const svg = (k, s = 16, w = 2) => '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SVG[k] + '</svg>';
  function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v === false || v == null) continue; if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : String(v)); }
    return e;
  }
  // The block menu: what a line can be. Toggle list and Heading come first.
  const MENU = [
    { id: 'toggle', label: 'Toggle list', icon: 'toggle', keys: 'toggle list collapse fold' }, { id: 'h1', label: 'Heading', glyph: 'H', keys: 'heading title h1' },
    { id: 'h2', label: 'Subheading', glyph: 'H', small: true, keys: 'subheading heading h2' }, { id: 'p', label: 'Text', glyph: 'Aa', keys: 'text plain paragraph' },
    { id: 'ul', label: 'Bulleted list', icon: 'list', keys: 'bulleted list bullets unordered' }, { id: 'ol', label: 'Numbered list', icon: 'num', keys: 'numbered list numbers ordered' },
    { id: 'todo', label: 'To-do', icon: 'todo', keys: 'to-do todo task checkbox check' }, { id: 'quote', label: 'Quote', icon: 'quote', keys: 'quote' },
    { id: 'hr', label: 'Divider', icon: 'hr', keys: 'divider line rule separator' }, { id: 'code', label: 'Code', icon: 'code', keys: 'code' },
    { id: 'img', label: 'Picture', icon: 'image', keys: 'picture image photo' }, { id: 'table', label: 'Table', icon: 'table', keys: 'table grid' }
  ];
  const PH = { h1: 'Heading', h2: 'Subheading', h3: 'Heading', ul: 'List', ol: 'List', todo: 'To-do', toggle: 'Toggle', quote: 'Quote' };

  // ---------- a page ----------
  function Page(host, opts) {
    let o = opts || {};
    const st = { blocks: [], idx: new Map(), open: new Map(), fold: new Map(), sel: null, restore: false, bsel: '', pend: null, past: [], future: [], last: '', lastAt: 0,
      md: null, sent: null, key: '', comp: null, menu: null, bar: false, link: null, focused: false, rows: new Map(), easing: '', focusedOnce: false, aa: false };
    host.textContent = '';
    const root = el('div', 'nb'), docEl = el('div', 'nb-doc', { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Notes', spellcheck: 'true', autocapitalize: 'sentences' });
    const plusEl = el('button', 'nb-plus', { type: 'button', 'aria-label': 'Add a block', 'data-tip': 'Add a block', html: svg('plus', 16, 2.2), tabindex: '-1' });
    const menuEl = el('div', 'nb-menu', { role: 'listbox', 'aria-label': 'Add a block' }), barEl = el('div', 'nb-bar', { role: 'toolbar', 'aria-label': 'Format' });
    const keysEl = el('div', 'nb-keys', { role: 'toolbar', 'aria-label': 'Format' });
    // the outline: a box that stays in view at the top of the note (it goes in first, only with `outline`), the rail in it, and the card of headings
    const olId = 'nb-ol' + Math.random().toString(36).slice(2, 9), olWrap = el('div', 'nb-olw'), olEl = el('div', 'nb-ol');
    const railEl = el('button', 'nb-ol-rail', { type: 'button', 'aria-label': 'Outline', 'aria-expanded': 'false', 'aria-haspopup': 'menu', 'aria-controls': olId });
    const panelEl = el('div', 'nb-ol-panel', { id: olId, role: 'menu', 'aria-label': 'Outline' });
    olEl.append(railEl, panelEl); olWrap.appendChild(olEl);
    root.append(docEl, plusEl, menuEl, barEl);
    host.appendChild(root);
    const by = id => st.idx.get(id);
    const reindex = () => { st.idx = new Map(st.blocks.map((b, i) => [b.id, i])); };

    // ---------- reading Markdown into the page ----------
    function load(md, key) {
      st.key = key; st.md = md; st.sent = md;
      let list = G.blocks(md).map(withId);
      if (!list.length && (o.editable || o.blank)) list = [withId({ k: 'h', d: 0, level: 1, r: [] }), withId({ k: 'p', d: 0, r: [] })];
      if (o.demo && o.demo.emptyAt != null) list.splice(Math.min(o.demo.emptyAt, list.length), 0, withId({ k: 'p', d: 0, r: [] }));
      st.blocks = settle(list); reindex();
      // (what the page writes before anything is changed: while it still writes that, the words stay exactly as they came)
      st.base = saved(st.blocks);
      st.past = []; st.future = []; st.sel = null; st.bsel = ''; st.pend = null; st.menu = null; st.link = null; st.aa = !!(o.demo && o.demo.aa);
      const mem = (memRead().pages[key] || {}), keys = viewKeys(st.blocks), O = new Set(mem.o || []), F = new Set(mem.f || []);
      st.open = new Map(); st.fold = new Map();
      let tn = 0, hn = 0;
      for (const b of st.blocks) {
        const k = keys.get(b.id), D = o.demo || {};
        if (b.k === 'toggle') { st.open.set(b.id, D.open === 'all' ? true : D.open === 'none' ? false : D.open === 'first' ? tn === 0 : O.has(k)); tn++; }
        if (b.k === 'h') { st.fold.set(b.id, D.fold ? D.fold.includes(hn) : F.has(k)); hn++; }
      }
      for (const [, r] of st.rows) r.el.remove();
      st.rows = new Map();
      OL.pin = ''; OL.cur = ''; closeSheet(true);
      render();
      if (o.demo) demoUi();
    }
    function remember() {
      if (!st.key || o.demo) return;
      const keys = viewKeys(st.blocks), m = memRead(), oo = [], ff = [];
      for (const b of st.blocks) { const k = keys.get(b.id); if (b.k === 'toggle' && st.open.get(b.id)) oo.push(k); if (b.k === 'h' && st.fold.get(b.id)) ff.push(k); }
      if (oo.length || ff.length) m.pages[st.key] = { o: oo.slice(0, 400), f: ff.slice(0, 400), t: Date.now() }; else delete m.pages[st.key];
      const names = Object.keys(m.pages);
      if (names.length > 80) names.sort((a, b) => (m.pages[a].t || 0) - (m.pages[b].t || 0)).slice(0, names.length - 80).forEach(n => delete m.pages[n]);
      memWrite(m);
    }
    let rememberT = 0;
    // (a page that has gone, like the Notes page left for the deck, writes nothing late over what the deck's Notes since opened and folded)
    const rememberSoon = () => { clearTimeout(rememberT); rememberT = setTimeout(() => { if (root.isConnected) remember(); }, 800); };

    // ---------- what shows: hidden in closed toggles and folded sections, numbers, sections ----------
    function view() {
      const out = [], list = st.blocks, cnt = [];
      let hide = null;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        cnt.length = b.d + 1;
        if (b.k === 'ol') cnt[b.d] = cnt[b.d] != null ? cnt[b.d] + 1 : b.start != null ? b.start : 1; else cnt[b.d] = null;
        const n = b.k === 'ol' ? cnt[b.d] : 0;
        if (hide) { const ends = hide.k === 't' ? b.d <= hide.d : b.d < hide.d || (b.d === hide.d && b.k === 'h' && b.level <= hide.level); if (!ends) continue; hide = null; }
        const next = list[i + 1], kids = !!next && next.d > b.d;
        const section = b.k === 'h' && !!next && !(next.d < b.d || (next.d === b.d && next.k === 'h' && next.level <= b.level));
        const open = b.k === 'toggle' && !!st.open.get(b.id), folded = section && !!st.fold.get(b.id);
        out.push({ b, i, n, kids, section, open, folded });
        if (b.k === 'toggle' && !open && kids) hide = { k: 't', d: b.d };
        else if (folded) hide = { k: 'h', d: b.d, level: b.level };
        // an open toggle with nothing in it: a quiet line to write in
        if (b.k === 'toggle' && open && !kids && o.editable) out.push({ virtual: b.id, d: b.d + 1, i });
      }
      return out;
    }
    const caretBlock = () => (st.sel && st.sel.a.id === st.sel.b.id && st.sel.a.off === st.sel.b.off && !st.sel.a.cell ? st.sel.a.id : '');
    // A quiet word on an empty line: a blank note's "Title" and "Start writing", and on the line being written in, what kind of line it is.
    function placeholder(v) {
      const b = v.b, list = st.blocks;
      if (!TEXT[b.k] || !isEmpty(b)) return '';
      const blank = list.length <= 2 && list.every(x => TEXT[x.k] && isEmpty(x));
      if (blank && v.i === 0 && b.k === 'h') return 'Title';
      if (blank && v.i === 1 && b.k === 'p' && list[0].k === 'h') return 'Start writing';
      if (!o.editable || (caretBlock() !== b.id && !(o.demo && o.demo.caret === v.i))) return '';
      return b.k === 'h' ? PH['h' + Math.min(b.level, 3)] : PH[b.k] || '';
    }
    function sigOf(v) {
      if (v.virtual) return 'v' + v.d + (o.editable ? 1 : 0);
      const b = v.b;
      return JSON.stringify([b.k, b.d, b.level, b.on, v.n, b.r, b.text, b.lang, b.src, b.alt, b.title, b.rows, b.align, v.open, v.folded, v.section, v.kids, placeholder(v), !!o.editable, !!o.phone, st.bsel === b.id,
        o.demo && o.demo.bar && o.demo.bar.i === v.i ? o.demo.bar : 0]);
    }
    // Words as text nodes (a link is an <a> only when reading), a line break as <br>, and a last <br> that holds an empty line open (it counts for nothing).
    function fillText(tx, rs, hl) {
      tx.textContent = '';
      const put = (r, t) => {
        const parts = r.c ? [t] : t.split('\n');
        parts.forEach((p, k) => {
          if (k > 0) tx.appendChild(document.createElement('br'));
          if (!p) return;
          let node = document.createTextNode(p);
          const cls = [r.b && 'nb-b', r.i && 'nb-i', r.s && 'nb-s', r.c && 'nb-c', r.a && 'nb-a', r.hl && 'nb-hl'].filter(Boolean).join(' ');
          if (cls) {
            const link = r.a && !o.editable, span = document.createElement(link ? 'a' : 'span');
            span.className = cls;
            if (r.a) { span.setAttribute('data-href', r.a); if (link) { span.setAttribute('href', r.a); span.setAttribute('rel', 'nofollow ugc noopener'); if (r.a[0] !== '#') span.setAttribute('target', '_blank'); } if (r.lt) span.setAttribute('data-tip', r.lt); }
            span.appendChild(node); node = span;
          }
          tx.appendChild(node);
        });
      };
      // (the canvas's format bar state draws the words it is over as selected)
      const list = hl ? [...rcut(rs, 0, hl.a), ...rcut(rs, hl.a, hl.b).map(x => ({ ...x, hl: true })), ...rcut(rs, hl.b, rlen(rs))] : rs;
      for (const r of list) put(r, r.t);
      const t = rtext(rs);
      if (!t || t.endsWith('\n')) tx.appendChild(el('br', '', { 'data-s': '' }));
    }
    function rowEl(v) {
      if (v.virtual) {
        const row = el('div', 'nb-row nb-p nb-virtual', { 'data-for': v.virtual, contenteditable: 'false' });
        row.style.setProperty('--d', v.d);
        row.appendChild(el('div', 'nb-tx', { text: 'Empty' }));
        return row;
      }
      const b = v.b, ed = !!o.editable;
      const row = el('div', 'nb-row nb-' + b.k + (b.k === 'h' ? ' nb-h' + Math.min(b.level, 4) : '') + (b.k === 'todo' && b.on ? ' nb-on' : '') + (v.open ? ' nb-open' : '') + (v.folded ? ' nb-folded' : '') + (st.bsel === b.id ? ' nb-picked' : ''), { 'data-id': b.id });
      row.style.setProperty('--d', b.d);
      if (b.k === 'ol') row.setAttribute('data-n', v.n + '.');
      if (ATOM[b.k] && ed) row.setAttribute('contenteditable', 'false');
      if (b.k === 'h' && v.section && (v.folded || rtext(b.r).trim())) row.appendChild(el('span', 'nb-fold', { contenteditable: 'false', role: 'button', 'aria-expanded': v.folded ? 'false' : 'true', 'aria-label': v.folded ? 'Show this section' : 'Fold this section', html: svg('chev', 14, 2.4) }));
      if (b.k === 'toggle') row.appendChild(el('span', 'nb-mk nb-tg', { contenteditable: 'false', role: 'button', 'aria-expanded': v.open ? 'true' : 'false', 'aria-label': v.open ? 'Close' : 'Open', html: svg('toggle', 14, 2) }));
      if (b.k === 'todo') row.appendChild(el('span', 'nb-mk nb-box', { contenteditable: 'false', role: 'checkbox', 'aria-checked': b.on ? 'true' : 'false', 'aria-label': b.on ? 'Done' : 'Not done', html: svg('check', 12, 2.6) }));
      if (TEXT[b.k]) {
        const ph = placeholder(v), tx = el('div', 'nb-tx', ph ? { 'data-ph': ph } : null);
        if (ph) row.classList.add('nb-ph');
        fillText(tx, b.r, o.demo && o.demo.bar && o.demo.bar.i === v.i ? o.demo.bar : null);
        row.appendChild(tx);
      } else if (b.k === 'code') {
        const tx = el('div', 'nb-tx nb-codetx', { spellcheck: 'false' });
        tx.appendChild(document.createTextNode(b.text));
        if (!b.text || b.text.endsWith('\n')) tx.appendChild(el('br', '', { 'data-s': '' }));
        row.appendChild(tx);
      } else if (b.k === 'hr') row.appendChild(el('div', 'nb-line'));
      else if (b.k === 'img') {
        const src = (o.image || ownImage)(b.src);
        if (src) { const im = el('img', '', { src, alt: b.alt || '', loading: 'lazy', decoding: 'async', draggable: 'false' }); if (b.title) im.setAttribute('data-tip', b.title); row.appendChild(im); }
        else row.appendChild(el('div', 'nb-alt', { text: b.alt || 'Picture' }));
      } else if (b.k === 'table') {
        const wrap = el('div', 'nb-tablewrap'), table = el('table');
        b.rows.forEach((r, ri) => {
          const tr = el('tr');
          r.forEach((cell, ci) => {
            const td = el(ri ? 'td' : 'th', '', b.align[ci] ? { style: 'text-align: ' + b.align[ci] } : null), tx = el('div', 'nb-tx nb-cell', { 'data-r': ri, 'data-c': ci });
            if (ed) tx.setAttribute('contenteditable', 'true');
            fillText(tx, cell);
            td.appendChild(tx); tr.appendChild(td);
          });
          table.appendChild(tr);
        });
        wrap.appendChild(table); row.appendChild(wrap);
        if (ed) {
          const more = el('div', 'nb-tablemore');
          more.append(el('button', 'nb-tbtn', { type: 'button', 'data-act': 'row', text: 'Add a row', tabindex: '-1' }), el('button', 'nb-tbtn', { type: 'button', 'data-act': 'col', text: 'Add a column', tabindex: '-1' }));
          row.appendChild(more);
        }
      }
      return row;
    }
    function render() {
      docEl.setAttribute('contenteditable', o.editable ? 'true' : 'false');
      docEl.classList.toggle('nb-read', !o.editable);
      root.classList.toggle('nb-phone', !!o.phone);
      root.classList.toggle('nb-owner', !o.editable && !!o.onOpen);
      const vis = view(), keep = new Set();
      let prev = null;
      const easing = st.easing; st.easing = '';
      for (const v of vis) {
        const id = v.virtual ? 'v' + v.virtual : v.b.id, sig = sigOf(v);
        let r = st.rows.get(id), fresh = false;
        if (!r || r.sig !== sig) { const e = rowEl(v); if (r && r.el.parentNode === docEl) docEl.replaceChild(e, r.el); r = { el: e, sig }; st.rows.set(id, r); fresh = true; }
        const want = prev ? prev.nextSibling : docEl.firstChild;
        if (r.el !== want) { docEl.insertBefore(r.el, want); fresh = true; }
        // (what a toggle or a section opens eases in)
        if (fresh && easing && v.b && isInside(v.i, easing)) { r.el.classList.remove('nb-in'); void r.el.offsetWidth; r.el.classList.add('nb-in'); }
        prev = r.el; keep.add(id);
      }
      for (const [id, r] of st.rows) if (!keep.has(id)) { r.el.remove(); st.rows.delete(id); }
      while (prev ? prev.nextSibling : docEl.firstChild) (prev ? prev.nextSibling : docEl.firstChild).remove();
      if (st.restore) { st.restore = false; putSel(st.sel); }
      placeUi();
      drawOutline();
    }
    // Is block i inside block id (a toggle) or in its section (a heading)?
    function isInside(i, id) {
      const j = by(id); if (j == null || i <= j) return false;
      const b = st.blocks[j];
      if (b.k === 'toggle') return i < endOf(st.blocks, j);
      for (let k = j + 1; k <= i; k++) { const x = st.blocks[k]; if (x.d < b.d || (x.d === b.d && x.k === 'h' && x.level <= b.level)) return false; }
      return true;
    }

    // ---------- where the caret is: the page's blocks and the browser's selection ----------
    // A place on the page: { id, off } (off counts UTF-16 units of a line's words, or of code), with cell: [row, column] in a table.
    function charsTo(tx, node, offset) {
      let n = 0, done = false;
      const walk = cur => {
        if (done) return;
        if (cur === node && cur.nodeType === 3) { n += Math.min(offset, cur.length); done = true; return; }
        if (cur.nodeType === 3) { n += cur.length; return; }
        if (cur.nodeName === 'BR') { if (!cur.hasAttribute('data-s')) n += 1; return; }
        const kids = cur.childNodes;
        for (let i = 0; i < kids.length; i++) { if (cur === node && i === offset) { done = true; return; } walk(kids[i]); if (done) return; }
        if (cur === node) done = true;
      };
      walk(tx);
      return n;
    }
    function posOf(node, offset) {
      if (!node || !docEl.contains(node)) return null;
      if (node === docEl) {
        // between rows: the start of the row after, or the end of the last one
        const kids = [...docEl.children];
        let row = kids.slice(offset).find(x => x.hasAttribute('data-id')), end = false;
        if (!row) { row = kids.reverse().find(x => x.hasAttribute('data-id')); end = true; }
        const b = row && st.blocks[by(row.getAttribute('data-id'))];
        return b ? { id: b.id, off: end ? rlen(wordsOf(b)) : 0 } : null;
      }
      const e = node.nodeType === 1 ? node : node.parentNode, tx = e.closest('.nb-tx'), row = e.closest('.nb-row');
      if (!row || !row.hasAttribute('data-id')) return null;
      const id = row.getAttribute('data-id'), b = st.blocks[by(id)];
      if (!b) return null;
      if (tx && tx.hasAttribute('data-r')) return { id, off: charsTo(tx, node, offset), cell: [+tx.getAttribute('data-r'), +tx.getAttribute('data-c')] };
      if (tx && row.contains(tx) && (tx.contains(node) || tx === node)) return { id, off: charsTo(tx, node, offset) };
      // (on the row around its words: before the marker is the start, after the words the end)
      const t = row.querySelector(':scope > .nb-tx');
      return { id, off: t && node === row && offset > [...row.childNodes].indexOf(t) ? rlen(wordsOf(b)) : 0 };
    }
    function readSel() {
      const s = document.getSelection();
      if (!s || !s.rangeCount || !docEl.contains(s.anchorNode)) return null;
      const a = posOf(s.anchorNode, s.anchorOffset), b = posOf(s.focusNode, s.focusOffset);
      return a && b ? { a, b } : null;
    }
    // The text box and place in it for a place on the page.
    function domAt(tx, off) {
      let left = off, last = null;
      const walk = cur => {
        for (let i = 0; i < cur.childNodes.length; i++) {
          const k = cur.childNodes[i];
          if (k.nodeType === 3) { if (left <= k.length) return [k, left]; left -= k.length; last = [k, k.length]; }
          else if (k.nodeName === 'BR') { if (k.hasAttribute('data-s')) continue; if (left === 0) return [cur, i]; left -= 1; last = [cur, i + 1]; }
          else { const r = walk(k); if (r) return r; }
        }
        return null;
      };
      return walk(tx) || last || [tx, 0];
    }
    function txOf(p) {
      const r = st.rows.get(p.id);
      if (!r) return null;
      return p.cell ? r.el.querySelector('.nb-cell[data-r="' + p.cell[0] + '"][data-c="' + p.cell[1] + '"]') : r.el.querySelector(':scope > .nb-tx');
    }
    function putSel(sel) {
      if (!sel || !o.editable) return;
      const ta = txOf(sel.a), tb = txOf(sel.b);
      if (!ta || !tb) return;
      const [an, ao] = domAt(ta, sel.a.off), [bn, bo] = domAt(tb, sel.b.off);
      const target = sel.a.cell ? ta : docEl;
      if (document.activeElement !== target && !target.contains(document.activeElement)) target.focus({ preventScroll: true });
      const s = document.getSelection();
      try { s.setBaseAndExtent(an, ao, bn, bo); } catch (e) { return; }
      const row = st.rows.get(sel.b.id);
      if (row) visible(row.el);
    }
    // Keeps a row in view inside what scrolls the page (only when it is out of it). On a phone, what the bar and the keyboard under it cover is out of view.
    function visible(rowE) {
      let p = root.parentElement;
      while (p && p !== document.body) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight) break; p = p.parentElement; }
      if (!p || p === document.body) return;
      const r = rowE.getBoundingClientRect(), q = p.getBoundingClientRect();
      const k = o.phone && keysEl.classList.contains('nb-show') ? keysEl.getBoundingClientRect() : null, bottom = k && k.height ? Math.min(q.bottom, k.top) : q.bottom;
      if (r.bottom > bottom - 24) p.scrollTop += r.bottom - bottom + 24;
      else if (r.top < q.top + 8) p.scrollTop -= q.top + 8 - r.top;
    }
    // Two places in page order: { s, e } with their block indexes.
    function ordered(sel) {
      const ia = by(sel.a.id), ib = by(sel.b.id);
      const aFirst = ia < ib || (ia === ib && (sel.a.cell && sel.b.cell ? (sel.a.cell[0] - sel.b.cell[0] || sel.a.cell[1] - sel.b.cell[1] || sel.a.off - sel.b.off) <= 0 : sel.a.off <= sel.b.off));
      const s = aFirst ? sel.a : sel.b, e = aFirst ? sel.b : sel.a;
      return { s: { ...s, i: by(s.id) }, e: { ...e, i: by(e.id) } };
    }
    const collapsed = sel => sel.a.id === sel.b.id && sel.a.off === sel.b.off && (!sel.a.cell) === (!sel.b.cell) && (!sel.a.cell || (sel.a.cell[0] === sel.b.cell[0] && sel.a.cell[1] === sel.b.cell[1]));
    const sameCell = sel => !!sel.a.cell && !!sel.b.cell && sel.a.id === sel.b.id && sel.a.cell[0] === sel.b.cell[0] && sel.a.cell[1] === sel.b.cell[1];
    const caret = (id, off, cell) => { const p = cell ? { id, off, cell } : { id, off }; return { a: p, b: p }; };

    // ---------- changes ----------
    // Every change goes through here: Undo steps back through them (typing in a row is one step), and the page says it changed.
    function commit(list, sel, kind) {
      const now = Date.now(), again = kind && /^type|^del/.test(kind) && kind === st.last && now - st.lastAt < 1000;
      if (!again) { st.past.push({ blocks: st.blocks, sel: st.sel }); if (st.past.length > 200) st.past.shift(); st.future = []; }
      st.last = kind || ''; st.lastAt = now;
      st.blocks = settle(list); reindex();
      st.sel = sel; st.restore = !!sel; st.bsel = '';
      if (sel) reveal(by(sel.b.id));
      render();
      changed();
      rememberSoon();
    }
    // The line at i shows: the toggles it is in open, the sections it is in unfold.
    function reveal(i) {
      if (i == null) return;
      for (let j = i - 1; j >= 0; j--) {
        const x = st.blocks[j];
        if (x.k === 'toggle' && !st.open.get(x.id) && i < endOf(st.blocks, j)) st.open.set(x.id, true);
        if (x.k === 'h' && st.fold.get(x.id) && isInside(i, x.id)) st.fold.set(x.id, false);
      }
    }
    function changed() {
      let md = saved(st.blocks);
      // nothing changed (or it was changed back): the words as they were written, so a page opened and left is never saved again in other words
      if (md === st.base) md = st.md;
      if (md === st.sent) return;
      st.sent = md;
      if (o.onChange) o.onChange(md);
    }
    function step(from, to) {
      if (!from.length) return;
      to.push({ blocks: st.blocks, sel: st.sel });
      const p = from.pop();
      st.blocks = p.blocks; reindex(); st.sel = p.sel; st.restore = !!p.sel; st.last = ''; st.bsel = ''; st.pend = null;
      render(); changed();
    }
    const undo = () => step(st.past, st.future), redo = () => step(st.future, st.past);
    const put = (list, i, b) => { const out = list.slice(); out[i] = b; return out; };
    // The words between two places, taken out: the first block keeps what comes before, the last gives what comes after, everything between goes.
    function cut(list, s, e) {
      if (s.i === e.i) {
        const b = list[s.i];
        if (s.cell) return put(list, s.i, { ...b, rows: b.rows.map((r, ri) => r.map((c, ci) => (ri === s.cell[0] && ci === s.cell[1] ? rsplice(c, s.off, e.off, []) : c))) });
        if (TEXT[b.k]) return put(list, s.i, { ...b, r: rsplice(b.r, s.off, e.off, []) });
        if (b.k === 'code') return put(list, s.i, { ...b, text: b.text.slice(0, s.off) + b.text.slice(e.off) });
        return list;
      }
      const first = list[s.i], last = list[e.i];
      const tail = last.k === 'code' ? (last.text.slice(e.off) ? [{ t: last.text.slice(e.off) }] : []) : TEXT[last.k] && !e.cell ? rcut(last.r, e.off, rlen(last.r)) : [];
      let head;
      if (ATOM[first.k] || s.cell) head = tail.length ? { ...withId({ k: 'p', d: first.d, r: tail }) } : null;
      else if (first.k === 'code') head = { ...first, text: first.text.slice(0, s.off) + rtext(tail) };
      else head = { ...first, r: tidy([...rcut(first.r, 0, s.off), ...(ONE_LINE[first.k] ? oneLine(tail) : tail)]) };
      return [...list.slice(0, s.i), ...(head ? [head] : []), ...list.slice(e.i + 1)];
    }
    // The selection's words taken out; the caret where they were.
    function cutSel(sel) {
      const { s, e } = ordered(sel);
      if (collapsed(sel)) return { list: st.blocks, at: s };
      const list = cut(st.blocks, s, e), first = st.blocks[s.i];
      if (ATOM[first.k] || (s.cell && !sameCell(sel))) { const b = list[s.i]; return { list, at: b ? { id: b.id, off: 0, i: s.i } : null }; }
      return { list, at: s };
    }

    // Typing.
    function typeText(sel, text) {
      if (!text) return;
      if (st.bsel) { const i = by(st.bsel); if (i != null) return insertAfter(i, withId({ k: 'p', d: st.blocks[i].d, r: [{ t: text }] }), text.length); }
      const { list, at } = cutSel(sel);
      if (!at) return;
      const i = at.i != null ? at.i : by(at.id), b = list[i];
      if (!b) return;
      if (at.cell) {
        const cell = b.rows[at.cell[0]][at.cell[1]], m = st.pend && st.pend.id === b.id ? st.pend.m : typing(cell, at.off);
        const nb = { ...b, rows: b.rows.map((r, ri) => r.map((c, ci) => (ri === at.cell[0] && ci === at.cell[1] ? rsplice(c, at.off, at.off, [mk(text.replace(/\n/g, ' '), m)]) : c))) };
        st.pend = null;
        return commit(put(list, i, nb), caret(b.id, at.off + text.length, at.cell), 'type');
      }
      if (b.k === 'code') return commit(put(list, i, { ...b, text: b.text.slice(0, at.off) + text + b.text.slice(at.off) }), caret(b.id, at.off + text.length), 'type');
      if (!TEXT[b.k]) return;
      const m = st.pend && st.pend.id === b.id && st.pend.off === at.off ? st.pend.m : typing(b.r, at.off);
      st.pend = null;
      let nb = { ...b, r: rsplice(b.r, at.off, at.off, [mk(ONE_LINE[b.k] ? text.replace(/\n/g, ' ') : text, m)]) }, off = at.off + text.length, out = put(list, i, nb);
      // "# " and the rest at the start of a line of text
      const sc = text.length <= 3 ? shortcut(nb, off) : null;
      if (sc) {
        if (sc.k === 'hr') { const p = withId({ k: 'p', d: nb.d, r: [] }); out = [...out.slice(0, i), { k: 'hr', d: nb.d, id: nb.id }, p, ...out.slice(i + 1)]; return commit(out, caret(p.id, 0), 'shortcut'); }
        nb = { ...nb, ...sc, r: rsplice(nb.r, 0, sc.cut, []) }; delete nb.cut;
        if (sc.k === 'code') { nb = { k: 'code', d: nb.d, id: nb.id, lang: '', text: rtext(nb.r) }; }
        if (sc.k === 'toggle') st.open.set(nb.id, true);
        return commit(put(out, i, nb), caret(nb.id, off - sc.cut), 'shortcut');
      }
      // **bold**, *italic*, ~~strike~~ and `code` finish as their last mark is typed
      if (/^[*_~`]$/.test(text)) {
        const fin = finish(nb, off);
        if (fin) { st.pend = { id: nb.id, off: fin.off, m: fin.m }; return commit(put(out, i, fin.b), caret(nb.id, fin.off), 'fmt'); }
      }
      commit(out, caret(nb.id, off), 'type');
      // A / at the start of a line or after a space opens the block menu (keep typing to narrow it).
      if (text === '/' && b.k !== 'code') { const before = rtext(nb.r).slice(0, off - 1); if (!before || /\s$/.test(before)) openMenu({ id: nb.id, from: off - 1, slash: true }); }
    }
    function shortcut(b, off) {
      if (b.k !== 'p') return null;
      const t = rtext(b.r).slice(0, off);
      if (/^#{1,3} $/.test(t)) return { k: 'h', level: t.length - 1, cut: t.length };
      if (/^[-*+] $/.test(t)) return { k: 'ul', cut: 2 };
      const n = /^(\d{1,9})[.)] $/.exec(t);
      if (n) { const x = { k: 'ol', cut: t.length }; if (+n[1] !== 1) x.start = +n[1]; return x; }
      if (/^\[ ?\] $/.test(t)) return { k: 'todo', on: false, cut: t.length };
      if (/^\[[xX]\] $/.test(t)) return { k: 'todo', on: true, cut: t.length };
      if (t === '> ') return { k: 'toggle', cut: 2 };
      if (t === '```') return { k: 'code', cut: 3 };
      if (t === '---' && rtext(b.r) === '---') return { k: 'hr', cut: 3 };
      return null;
    }
    function finish(b, off) {
      const t = rtext(b.r);
      for (const [mark, m] of [['**', 'b'], ['__', 'b'], ['~~', 's'], ['*', 'i'], ['_', 'i'], ['`', 'c']]) {
        if (t.slice(off - mark.length, off) !== mark) continue;
        const end = off - mark.length, start = t.lastIndexOf(mark, end - 1);
        if (start < 0 || start + mark.length >= end) continue;
        const inner = t.slice(start + mark.length, end);
        if (/^\s|\s$/.test(inner) || inner.includes('\n')) continue;
        if (mark.length === 1 && (t[start - 1] === mark || t[start + 1] === mark || t[end - 1] === mark)) continue;
        if (mark[0] === '_' && /[\p{L}\p{N}]/u.test(t[start - 1] || '')) continue;
        const mm = markAt(b.r, start + mark.length);
        if (mm && mm.c && m !== 'c') continue;
        let r = rsplice(b.r, end, off, []);
        r = rmap(r, start + mark.length, end, x => { x[m] = true; return x; });
        r = rsplice(r, start, start + mark.length, []);
        const after = typing(r, end - mark.length); delete after[m];
        return { b: { ...b, r }, off: end - mark.length, m: after };
      }
      return null;
    }
    function insertAfter(i, nb, off) {
      const list = st.blocks, j = endOf(list, i);
      commit([...list.slice(0, j), nb, ...list.slice(j)], caret(nb.id, off || 0), 'line');
    }

    // Enter: a line of the same kind; an empty item becomes text, empty text goes out a level; in code, a line break.
    function enter(sel) {
      if (st.bsel) { const i = by(st.bsel); if (i != null) return insertAfter(i, withId({ k: 'p', d: st.blocks[i].d, r: [] })); }
      if (sel.a.cell || sel.b.cell) return tableEnter(sel);
      const { list, at } = cutSel(sel);
      if (!at) return;
      const i = at.i != null ? at.i : by(at.id), b = list[i];
      if (b.k === 'code') return commit(put(list, i, { ...b, text: b.text.slice(0, at.off) + '\n' + b.text.slice(at.off) }), caret(b.id, at.off + 1), 'type');
      if (!TEXT[b.k]) return;
      if (isEmpty(b) && b.k !== 'p' && b.k !== 'h') return commit(put(list, i, { k: 'p', d: b.d, id: b.id, r: [] }), caret(b.id, 0), 'line');
      if (isEmpty(b) && b.k === 'p' && b.d > 0) return commit(outdentAt(list, i), caret(b.id, 0), 'line');
      const len = rlen(b.r);
      // at the end of an open toggle's line: the first line inside it; a closed one: the next toggle after what it holds
      if (b.k === 'toggle' && at.off === len) {
        if (st.open.get(b.id)) { const p = withId({ k: 'p', d: b.d + 1, r: [] }); return commit([...list.slice(0, i + 1), p, ...list.slice(i + 1)], caret(p.id, 0), 'line'); }
        const t = withId({ k: 'toggle', d: b.d, r: [] }), j = endOf(list, i); st.open.set(t.id, true);
        return commit([...list.slice(0, j), t, ...list.slice(j)], caret(t.id, 0), 'line');
      }
      // at the end of a heading with an empty line under it (a blank note's second line): the caret goes there
      const nx = list[i + 1];
      if (b.k === 'h' && at.off === len && nx && nx.k === 'p' && nx.d === b.d && isEmpty(nx)) return commit(list, caret(nx.id, 0), 'line');
      const kind = b.k === 'h' ? 'p' : b.k, left = rcut(b.r, 0, at.off), right = rcut(b.r, at.off, len);
      // at the very start of a line with words: an empty line goes above it, of its kind (text above a heading)
      if (at.off === 0 && len) {
        const above = withId({ k: b.k === 'h' ? 'p' : b.k, d: b.d, r: [] }); if (above.k === 'todo') above.on = false;
        return commit([...list.slice(0, i), above, ...list.slice(i)], caret(b.id, 0), 'line');
      }
      const nb = withId({ k: kind, d: b.d, r: right });
      if (kind === 'todo') nb.on = false;
      if (kind === 'toggle') st.open.set(nb.id, true);
      return commit([...list.slice(0, i), { ...b, r: left }, nb, ...list.slice(i + 1)], caret(nb.id, 0), 'line');
    }
    function softBreak(sel) {
      if (sel.a.cell || sel.b.cell) return;
      const i = by(ordered(sel).s.id), b = st.blocks[i];
      if (!b || ONE_LINE[b.k]) return enter(sel);
      typeText(sel, '\n');
    }

    // Deleting.
    function del(sel, back, word, line, exact) {
      if (st.bsel) return removeBlock(st.bsel);
      if (exact || !collapsed(sel)) {
        if (sel.a.cell && sel.b.cell && !sameCell(sel)) return;
        const { list, at } = cutSel(sel);
        return at ? commit(list, caret(at.id, at.off, at.cell), 'del') : commit(list, null, 'del');
      }
      const p = sel.a, i = by(p.id), b = st.blocks[i];
      if (p.cell) return cellDelete(i, p, back, word);
      const words = rtext(wordsOf(b)), len = words.length;
      if (back && p.off === 0) return startBackspace(i);
      if (!back && p.off === len) return endDelete(i);
      let a = p.off, z = p.off;
      if (back) a = line ? 0 : word ? wordStart(words, p.off) : prevChar(words, p.off);
      else z = line ? len : word ? wordEnd(words, p.off) : nextChar(words, p.off);
      const list = cut(st.blocks, { ...p, i, off: a }, { ...p, i, off: z });
      commit(list, caret(b.id, a), 'del');
    }
    const prevChar = (t, i) => { const c = t.charCodeAt(i - 1); return i - (c >= 0xdc00 && c <= 0xdfff && i >= 2 ? 2 : 1); };
    const nextChar = (t, i) => { const c = t.charCodeAt(i); return i + (c >= 0xd800 && c <= 0xdbff && i + 1 < t.length ? 2 : 1); };
    const wordStart = (t, i) => { let j = i; while (j > 0 && /\s/.test(t[j - 1])) j--; while (j > 0 && !/\s/.test(t[j - 1])) j--; return j; };
    const wordEnd = (t, i) => { let j = i; while (j < t.length && /\s/.test(t[j])) j++; while (j < t.length && !/\s/.test(t[j])) j++; return j; };
    // Backspace at the start of a line: it becomes text, then goes out a level, then joins the line above (a picture, divider or table above is picked first).
    function startBackspace(i) {
      const list = st.blocks, b = list[i];
      if (b.k === 'code') return commit(put(list, i, { k: 'p', d: b.d, id: b.id, r: b.text ? [{ t: b.text }] : [] }), caret(b.id, 0), 'line');
      if (b.k !== 'p') { const nb = { k: 'p', d: b.d, id: b.id, r: b.r }; return commit(put(list, i, nb), caret(b.id, 0), 'line'); }
      if (b.d > 0) return commit(outdentAt(list, i), caret(b.id, 0), 'line');
      const vis = view().filter(v => v.b), at = vis.findIndex(v => v.b.id === b.id), pv = at > 0 ? vis[at - 1].b : null;
      if (!pv) return;
      const j = by(pv.id);
      if (ATOM[pv.k]) { if (isEmpty(b)) commit(list.filter((_, k) => k !== i), null, 'line'); return pick(pv.id); }
      if (pv.k === 'code') { const nb = { ...pv, text: pv.text + rtext(b.r) }; return commit(put(list, j, nb).filter((_, k) => k !== i), caret(pv.id, pv.text.length), 'line'); }
      const off = rlen(pv.r), nb = { ...pv, r: tidy([...pv.r, ...(ONE_LINE[pv.k] ? oneLine(b.r) : b.r)]) };
      commit(put(list, j, nb).filter((_, k) => k !== i), caret(pv.id, off), 'line');
    }
    // Delete at the end of a line: the line below joins it.
    function endDelete(i) {
      const list = st.blocks, b = list[i], vis = view().filter(v => v.b), at = vis.findIndex(v => v.b.id === b.id), nx = at >= 0 && at + 1 < vis.length ? vis[at + 1].b : null;
      if (!nx) return;
      const j = by(nx.id);
      if (ATOM[nx.k]) return pick(nx.id);
      if (b.k === 'code') return commit(put(list, i, { ...b, text: b.text + rtext(wordsOf(nx)) }).filter((_, k) => k !== j), caret(b.id, b.text.length), 'line');
      const off = rlen(b.r), add = wordsOf(nx), nb = { ...b, r: tidy([...b.r, ...(ONE_LINE[b.k] ? oneLine(add) : add)]) };
      commit(put(list, i, nb).filter((_, k) => k !== j), caret(b.id, off), 'line');
    }
    // A picture, a divider or a table picked: a ring shows it, and Backspace or Delete takes it away.
    function pick(id) { st.bsel = id; st.sel = null; render(); const s = document.getSelection(); if (s) s.removeAllRanges(); docEl.focus({ preventScroll: true }); }
    function removeBlock(id) {
      const i = by(id); if (i == null) return;
      const list = st.blocks.filter((_, k) => k !== i), nb = list[i] || list[i - 1];
      if (!list.length) { const p = withId({ k: 'p', d: 0, r: [] }); return commit([p], caret(p.id, 0), 'line'); }
      const target = TEXT[nb.k] || nb.k === 'code' ? nb : null;
      commit(list, target ? caret(target.id, list[i] === nb ? 0 : rlen(wordsOf(target))) : null, 'line');
    }
    // Out one level: the block and what it holds.
    function outdentAt(list, i) {
      const j = endOf(list, i), out = list.slice();
      for (let k = i; k < j; k++) out[k] = { ...out[k], d: Math.max(0, out[k].d - 1) };
      return out;
    }

    // Tab and Shift+Tab: in and out a level (with what the lines hold). In code, two spaces; in a table, the next cell.
    function nest(sel, out) {
      if (sel.a.cell) return tableTab(sel, out);
      const { s, e } = ordered(sel), list = st.blocks.slice(), b = list[s.i];
      if (b.k === 'code' && !out) return typeText(sel, '  ');
      const vis = view().filter(v => v.b), ids = new Set();
      for (let k = s.i; k <= e.i; k++) ids.add(list[k].id);
      let done = false;
      for (let k = s.i; k <= e.i; k++) {
        const x = list[k], parentPicked = (() => { for (let q = k - 1; q >= s.i; q--) if (list[q].d < x.d) return ids.has(list[q].id); return false; })();
        if (parentPicked) continue;
        const end = endOf(list, k);
        if (out) { if (x.d === 0) continue; for (let q = k; q < end; q++) list[q] = { ...list[q], d: list[q].d - 1 }; done = true; continue; }
        const at = vis.findIndex(v => v.b.id === x.id), pv = at > 0 ? vis[at - 1].b : null;
        if (!pv || x.d + 1 > pv.d + (HOLDS[pv.k] ? 1 : 0) || x.d + 1 > MAX_DEPTH) continue;
        for (let q = k; q < end; q++) list[q] = { ...list[q], d: list[q].d + 1 };
        // (nested into a closed toggle: it opens, so the line stays in view)
        let up = by(pv.id); while (up != null && list[up].d >= x.d + 1) up--;
        if (up != null && up >= 0 && list[up].k === 'toggle') st.open.set(list[up].id, true);
        done = true;
      }
      if (done) commit(list, st.sel, 'nest');
    }

    // Marks: bold, italic, strikethrough, code, a link. With nothing selected, the word at the caret, or what is typed next.
    function rangesOf(sel) {
      const { s, e } = ordered(sel), out = [];
      for (let k = s.i; k <= e.i; k++) {
        const b = st.blocks[k];
        if (s.cell && k === s.i) { if (sameCell(sel)) out.push({ k, cell: s.cell, a: s.off, z: e.off }); continue; }
        if (!TEXT[b.k]) continue;
        out.push({ k, a: k === s.i ? s.off : 0, z: k === e.i && !e.cell ? e.off : rlen(b.r) });
      }
      return out.filter(x => x.z > x.a);
    }
    const runsIn = (b, x) => (x.cell ? b.rows[x.cell[0]][x.cell[1]] : b.r);
    function withRuns(b, x, rs) { return x.cell ? { ...b, rows: b.rows.map((r, ri) => r.map((c, ci) => (ri === x.cell[0] && ci === x.cell[1] ? rs : c))) } : { ...b, r: rs }; }
    function has(sel, m) { const rs = rangesOf(sel); return rs.length > 0 && rs.every(x => rcut(runsIn(st.blocks[x.k], x), x.a, x.z).every(r => (m === 'a' ? !!r.a : !!r[m]))); }
    function toggleMark(m) {
      let sel = st.sel || readSel(); if (!sel) return;
      if (collapsed(sel)) {
        const p = sel.a, b = st.blocks[by(p.id)]; if (!b || (!TEXT[b.k] && !p.cell)) return;
        const rs = p.cell ? b.rows[p.cell[0]][p.cell[1]] : b.r, t = rtext(rs), a = wordStart(t, p.off), z = wordEnd(t, p.off);
        if (a < p.off && p.off < z) sel = { a: { ...p, off: a }, b: { ...p, off: z } };
        else { const cur = st.pend && st.pend.id === b.id ? st.pend.m : typing(rs, p.off); const next = { ...cur }; if (next[m]) delete next[m]; else next[m] = true; st.pend = { id: b.id, off: p.off, m: next }; return; }
      }
      const on = !has(sel, m), list = st.blocks.slice();
      for (const x of rangesOf(sel)) list[x.k] = withRuns(list[x.k], x, rmap(runsIn(list[x.k], x), x.a, x.z, r => { if (on) r[m] = true; else delete r[m]; return r; }));
      commit(list, sel, 'fmt');
    }
    function setLink(sel, href) {
      const list = st.blocks.slice();
      for (const x of rangesOf(sel)) list[x.k] = withRuns(list[x.k], x, rmap(runsIn(list[x.k], x), x.a, x.z, r => { if (href) { r.a = href; delete r.lt; } else { delete r.a; delete r.lt; } return r; }));
      commit(list, sel, 'fmt');
    }
    // What a line becomes (the block menu, the phone's bar, ⌘⌥ keys): its words stay.
    function setKind(sel, id) {
      const { s, e } = ordered(sel), list = st.blocks.slice(), first = list[s.i];
      if (id === 'hr' || id === 'table' || id === 'img') {
        const empty = TEXT[first.k] && isEmpty(first) && s.i === e.i;
        const make = src => {
          const nb = id === 'hr' ? withId({ k: 'hr', d: first.d }) : id === 'img' ? withId({ k: 'img', d: first.d, src, alt: '', title: '' }) : withId({ k: 'table', d: first.d, align: ['', ''], rows: [[[], []], [[], []], [[], []]] });
          const p = withId({ k: 'p', d: first.d, r: [] }), cur = st.blocks, at = by(first.id);
          if (at == null) return;
          const j = empty ? at : endOf(cur, at), rest = empty ? cur.slice(at + 1) : cur.slice(j), next = rest[0], keepLine = next && TEXT[next.k] && isEmpty(next) && next.d === first.d;
          const out = [...cur.slice(0, j), nb, ...(keepLine ? [] : [p]), ...rest];
          commit(out, id === 'table' ? caret(nb.id, 0, [0, 0]) : caret(keepLine ? next.id : p.id, 0), 'kind');
        };
        if (id === 'img') { if (o.onPicture) Promise.resolve(o.onPicture()).then(src => { if (src) make(src); }, () => {}); return; }
        return make();
      }
      const to = id === 'h1' || id === 'h2' || id === 'h3' ? 'h' : id;
      for (let k = s.i; k <= e.i; k++) {
        const b = list[k];
        if (!TEXT[b.k] && b.k !== 'code') continue;
        const r = b.k === 'code' ? (b.text ? [{ t: b.text }] : []) : b.r, nb = { id: b.id, k: to, d: b.d };
        if (to === 'code') { nb.lang = ''; nb.text = rtext(r); }
        else nb.r = ONE_LINE[to] ? oneLine(r) : r;
        if (to === 'h') nb.level = +id.slice(1);
        if (to === 'todo') nb.on = b.k === 'todo' ? !!b.on : false;
        if (to === 'ol' && b.k === 'ol' && b.start != null) nb.start = b.start;
        if (to === 'toggle') st.open.set(b.id, true);
        list[k] = nb;
      }
      const at = list[s.i], len = rlen(wordsOf(at));
      commit(list, caret(at.id, Math.min(s.off, len)), 'kind');
    }

    // Tables: Enter and Tab go to the next cell (a new row after the last), Backspace in an empty row takes the row away.
    function tableEnter(sel) { return tableTab(sel, false); }
    function tableTab(sel, back) {
      const p = sel.b.cell ? sel.b : sel.a, i = by(p.id), b = st.blocks[i], R = b.rows.length, C = b.rows[0].length;
      let r = p.cell[0], c = p.cell[1] + (back ? -1 : 1);
      if (c >= C) { c = 0; r++; } if (c < 0) { c = C - 1; r--; }
      if (r < 0) return;
      if (r >= R) { const nb = { ...b, rows: [...b.rows, Array.from({ length: C }, () => [])] }; return commit(put(st.blocks, i, nb), caret(b.id, 0, [r, 0]), 'line'); }
      st.sel = caret(b.id, rlen(b.rows[r][c]), [r, c]); st.restore = true; putSel(st.sel); st.restore = false;
    }
    function cellDelete(i, p, back, word) {
      const b = st.blocks[i], rs = b.rows[p.cell[0]][p.cell[1]], t = rtext(rs);
      if (back && p.off === 0) {
        const row = b.rows[p.cell[0]];
        if (p.cell[0] > 0 && row.every(c => !rlen(c)) && b.rows.length > 2) { const nb = { ...b, rows: b.rows.filter((_, k) => k !== p.cell[0]) }; const r = p.cell[0] - 1; return commit(put(st.blocks, i, nb), caret(b.id, rlen(nb.rows[r][0]), [r, 0]), 'line'); }
        return;
      }
      if (!back && p.off === t.length) return;
      const a = back ? (word ? wordStart(t, p.off) : prevChar(t, p.off)) : p.off, z = back ? p.off : word ? wordEnd(t, p.off) : nextChar(t, p.off);
      commit(cut(st.blocks, { ...p, i, off: a }, { ...p, i, off: z }), caret(b.id, a, p.cell), 'del');
    }
    function tableMore(id, what) {
      const i = by(id), b = st.blocks[i];
      if (!b) return;
      const nb = what === 'row' ? { ...b, rows: [...b.rows, b.rows[0].map(() => [])] } : { ...b, rows: b.rows.map(r => [...r, []]), align: [...b.align, ''] };
      commit(put(st.blocks, i, nb), what === 'row' ? caret(b.id, 0, [nb.rows.length - 1, 0]) : caret(b.id, 0, [0, nb.rows[0].length - 1]), 'line');
    }

    // ---------- copy, cut and paste ----------
    function selectionBlocks(sel) {
      const { s, e } = ordered(sel), out = [];
      for (let k = s.i; k <= e.i; k++) {
        const b = st.blocks[k];
        if (s.cell && sameCell(sel)) { out.push({ k: 'p', d: 0, r: rcut(b.rows[s.cell[0]][s.cell[1]], s.off, e.off) }); break; }
        if (TEXT[b.k]) out.push({ ...b, r: rcut(b.r, k === s.i ? s.off : 0, k === e.i && !e.cell ? e.off : rlen(b.r)) });
        else if (b.k === 'code') out.push(s.i === e.i ? { k: 'p', d: 0, r: [{ t: b.text.slice(s.off, e.off) }] } : b);
        else out.push(b);
      }
      const base = out.length ? Math.min(...out.map(b => b.d)) : 0;
      return out.map(b => ({ ...b, d: b.d - base }));
    }
    function onCopy(ev, isCut) {
      const sel = readSel();
      if (!sel || collapsed(sel) || !ev.clipboardData) return;
      ev.preventDefault();
      const list = selectionBlocks(sel), md = G.markdown(list);
      ev.clipboardData.setData('text/plain', list.length === 1 && TEXT[list[0].k] ? rtext(list[0].r) : md);
      ev.clipboardData.setData('text/html', G.render(md));
      ev.clipboardData.setData('text/x-lucida-notes', md);
      if (isCut && o.editable) del(sel, true, false, false, true);
    }
    function onPaste(ev) {
      ev.preventDefault();
      if (!o.editable) return;
      const dt = ev.clipboardData, sel = readSel() || st.sel;
      if (!dt || !sel) return;
      const own = dt.getData('text/x-lucida-notes'), html = dt.getData('text/html'), plain = dt.getData('text/plain');
      let list = own ? G.blocks(own) : html ? fromHtml(html) : fromPlain(plain || '');
      if (!list.length && plain) list = fromPlain(plain);
      if (!list.length) return;
      insertBlocks(sel, list);
    }
    // Plain text: Markdown when it looks like it, else a line of text for each line.
    function fromPlain(t) {
      const s = String(t).replace(/\r\n?/g, '\n').slice(0, 200000);
      if (/^(?: {0,3}(?:#{1,6} |[-*+] |\d{1,9}[.)] |> |```|~~~|:::toggle|\|)|.*(?:\*\*|__|~~|`|\]\())/m.test(s)) return G.blocks(s);
      return s.split('\n').filter(l => l.trim()).map(l => ({ k: 'p', d: 0, r: [{ t: l }] }));
    }
    // A web page's or a document's HTML (read without running anything: a document of its own, never on the page), as blocks.
    function fromHtml(html) {
      let doc;
      try { doc = new DOMParser().parseFromString(String(html).slice(0, 400000), 'text/html'); } catch (e) { return []; }
      const out = [], BLOCK = /^(P|DIV|H[1-6]|UL|OL|LI|BLOCKQUOTE|PRE|HR|TABLE|DETAILS|SUMMARY|SECTION|ARTICLE|HEADER|FOOTER|MAIN|FIGURE|TR|TD|TH|THEAD|TBODY)$/;
      const inline = (node, m, acc) => {
        for (const k of node.childNodes) {
          if (k.nodeType === 3) { acc.push(mk(m.pre ? k.data : k.data.replace(/\s+/g, ' '), m)); continue; }
          if (k.nodeType !== 1 || /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IFRAME|OBJECT|SVG|HEAD|META|LINK)$/.test(k.tagName)) continue;
          const t = k.tagName, css = (k.getAttribute('style') || '').toLowerCase(), x = { ...m };
          if (t === 'BR') { acc.push(mk('\n', m)); continue; }
          if (t === 'IMG' || t === 'INPUT') continue;
          if (t === 'B' || t === 'STRONG' || /font-weight:\s*(bold|[6-9]00)/.test(css)) x.b = true;
          if (/font-weight:\s*(normal|[1-5]00)/.test(css)) delete x.b;
          if (t === 'I' || t === 'EM' || /font-style:\s*italic/.test(css)) x.i = true;
          if (t === 'S' || t === 'DEL' || t === 'STRIKE' || /line-through/.test(css)) x.s = true;
          if (t === 'CODE' || t === 'KBD' || t === 'SAMP') x.c = true;
          if (t === 'A') { const h = G.href(k.getAttribute('href') || ''); if (h) x.a = h; }
          if (BLOCK.test(t)) acc.push(mk('\n', m));
          inline(k, x, acc);
        }
        return acc;
      };
      const line = (node, blk) => { const r = tidy(inline(node, {}, [])); const t = rtext(r); if (!t.trim() && blk.k === 'p') return; out.push({ ...blk, r: ONE_LINE[blk.k] ? oneLine(r) : r }); };
      const walk = (node, d) => {
        for (const k of node.childNodes) {
          if (out.length > 4000) return;
          if (k.nodeType === 3) { if (k.data.trim()) out.push({ k: 'p', d, r: [{ t: k.data.replace(/\s+/g, ' ').trim() }] }); continue; }
          if (k.nodeType !== 1 || /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IFRAME|OBJECT|SVG|HEAD|META|LINK|TITLE)$/.test(k.tagName)) continue;
          const t = k.tagName;
          if (/^H[1-6]$/.test(t)) line(k, { k: 'h', d, level: +t[1] });
          else if (t === 'UL' || t === 'OL') {
            for (const li of k.children) {
              if (li.tagName !== 'LI') continue;
              const box = li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]'), nested = [...li.children].filter(c => c.tagName === 'UL' || c.tagName === 'OL');
              const own = li.cloneNode(true); for (const c of [...own.children]) if (c.tagName === 'UL' || c.tagName === 'OL') c.remove();
              const r = tidy(inline(own, {}, [])), blk = { k: box ? 'todo' : t === 'OL' ? 'ol' : 'ul', d, r: trimRuns(r) };
              if (box) blk.on = box.hasAttribute('checked');
              out.push(blk);
              for (const n of nested) walk({ childNodes: [n] }, d + 1);
            }
          } else if (t === 'BLOCKQUOTE') line(k, { k: 'quote', d });
          else if (t === 'PRE') out.push({ k: 'code', d, lang: '', text: k.textContent.replace(/\n$/, '') });
          else if (t === 'HR') out.push({ k: 'hr', d });
          else if (t === 'TABLE') {
            const rows = [...k.querySelectorAll('tr')].slice(0, 200).map(tr => [...tr.children].filter(c => c.tagName === 'TD' || c.tagName === 'TH').slice(0, 20).map(c => oneLine(trimRuns(tidy(inline(c, {}, []))))));
            const n = Math.max(1, ...rows.map(r => r.length));
            if (rows.length) out.push({ k: 'table', d, align: Array(n).fill(''), rows: rows.map(r => Array.from({ length: n }, (_, i) => r[i] || [])) });
          } else if (t === 'DETAILS') {
            const sum = k.querySelector(':scope > summary'), body = k.cloneNode(true); const s2 = body.querySelector(':scope > summary'); if (s2) s2.remove();
            out.push({ k: 'toggle', d, r: sum ? oneLine(trimRuns(tidy(inline(sum, {}, [])))) : [] });
            walk(body, d + 1);
          } else if (t === 'IMG') { const src = (o.image || ownImage)(k.getAttribute('src') || ''); if (src) out.push({ k: 'img', d, src, alt: k.getAttribute('alt') || '', title: '' }); }
          else if ([...k.children].some(c => BLOCK.test(c.tagName))) walk(k, d);
          else line(k, { k: 'p', d });
        }
      };
      walk(doc.body, 0);
      return out.map(b => (b.r ? { ...b, r: trimRuns(b.r) } : b)).filter(b => !b.r || rlen(b.r) || b.k !== 'p');
    }
    function trimRuns(rs) {
      let r = tidy(rs);
      while (r.length && !r[0].c && /^\s/.test(r[0].t)) { const t = r[0].t.replace(/^\s+/, ''); r = t ? [mk(t, r[0]), ...r.slice(1)] : r.slice(1); }
      while (r.length && !r[r.length - 1].c && /\s$/.test(r[r.length - 1].t)) { const x = r[r.length - 1], t = x.t.replace(/\s+$/, ''); r = t ? [...r.slice(0, -1), mk(t, x)] : r.slice(0, -1); }
      return r;
    }
    // Blocks put in at the caret: one line of words goes in among the words; more lines split the line and go between.
    function insertBlocks(sel, pasted) {
      const { list, at } = cutSel(sel);
      if (!at) return;
      const i = at.i != null ? at.i : by(at.id), b = list[i];
      const words = pasted.length === 1 && TEXT[pasted[0].k] ? pasted[0].r : null;
      if (at.cell) { const r = oneLine(words || pasted.flatMap(x => wordsOf(x).concat([{ t: ' ' }]))); const nb = { ...b, rows: b.rows.map((rr, ri) => rr.map((c, ci) => (ri === at.cell[0] && ci === at.cell[1] ? rsplice(c, at.off, at.off, r) : c))) }; return commit(put(list, i, nb), caret(b.id, at.off + rlen(r), at.cell), 'paste'); }
      if (b.k === 'code') { const t = words ? rtext(words) : G.plain(G.markdown(pasted)); return commit(put(list, i, { ...b, text: b.text.slice(0, at.off) + t + b.text.slice(at.off) }), caret(b.id, at.off + t.length), 'paste'); }
      if (words && TEXT[b.k]) { const r = ONE_LINE[b.k] ? oneLine(words) : words; return commit(put(list, i, { ...b, r: rsplice(b.r, at.off, at.off, r) }), caret(b.id, at.off + rlen(r)), 'paste'); }
      const add = pasted.map(x => withId({ ...x, d: Math.min(MAX_DEPTH, x.d + (TEXT[b.k] || b.k === 'code' ? b.d : b.d)) }));
      if (!TEXT[b.k]) { const j = endOf(list, i); const last = add[add.length - 1]; return commit([...list.slice(0, j), ...add, ...list.slice(j)], TEXT[last.k] ? caret(last.id, rlen(last.r)) : null, 'paste'); }
      // more lines: an empty line is used up; plain text joins the words before the caret; what comes after the caret follows the last line pasted
      const left = rcut(b.r, 0, at.off), right = rcut(b.r, at.off, rlen(b.r)), first = add[0], out = list.slice(0, i);
      if (!left.length && right.length) { const last = add[add.length - 1]; return commit([...out, ...add, b, ...list.slice(i + 1)], TEXT[last.k] ? caret(last.id, rlen(last.r)) : caret(b.id, 0), 'paste'); }
      if (left.length && first.k === 'p') { out.push({ ...b, r: tidy([...left, ...first.r]) }); add.shift(); }
      else if (left.length) out.push({ ...b, r: left });
      out.push(...add);
      let caretAt = null;
      const tail = out[out.length - 1];
      if (right.length) { if (add.length && tail.k === 'p') { out[out.length - 1] = { ...tail, r: tidy([...tail.r, ...right]) }; caretAt = caret(tail.id, rlen(tail.r)); } else { const p = withId({ k: b.k === 'h' ? 'p' : b.k, d: b.d, r: right }); out.push(p); caretAt = caret(p.id, 0); } }
      else caretAt = TEXT[tail.k] ? caret(tail.id, rlen(tail.r)) : tail.k === 'code' ? caret(tail.id, tail.text.length) : null;
      commit([...out, ...list.slice(i + 1)], caretAt, 'paste');
    }

    // ---------- the keys and the mouse ----------
    function onBeforeInput(ev) {
      const ty = ev.inputType || '';
      if (ev.isComposing || ty === 'insertCompositionText') return;
      ev.preventDefault();
      if (!o.editable) return;
      if (ty === 'historyUndo') return undo();
      if (ty === 'historyRedo') return redo();
      const F = { formatBold: 'b', formatItalic: 'i', formatStrikeThrough: 's' }[ty];
      if (F) return toggleMark(F);
      if (/ByDrag$|ByCut$|ByComposition$/.test(ty)) return;
      const live = readSel(), sel = live || st.sel;
      if (!sel && !st.bsel) return;
      if (live) st.sel = live;
      const tr = ev.getTargetRanges ? ev.getTargetRanges() : [];
      let exact = null;
      if (tr.length && (ty === 'insertReplacementText' || (ty.startsWith('delete') && !(live && collapsed(live) && ((/Backward/.test(ty) && live.a.off === 0) || /Forward/.test(ty)))))) {
        const a = posOf(tr[0].startContainer, tr[0].startOffset), b = posOf(tr[0].endContainer, tr[0].endOffset);
        if (a && b && !(a.id === b.id && a.off === b.off && !a.cell === !b.cell)) exact = { a, b };
      }
      if (ty === 'insertText' || ty === 'insertReplacementText') return typeText(exact || sel, ev.data != null ? ev.data : ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '');
      if (ty === 'insertParagraph') return closeMenu(), enter(sel);
      if (ty === 'insertLineBreak') return softBreak(sel);
      if (ty.startsWith('insertFrom')) { const dt = ev.dataTransfer; if (dt) insertBlocks(sel, fromPlain(dt.getData('text/plain'))); return; }
      if (ty.startsWith('delete')) return del(exact || sel, /Backward/.test(ty), /Word/.test(ty), /Line|Soft|Hard/.test(ty), !!exact);
    }
    function onKey(ev) {
      if (!o.editable) return;
      const mod = ev.metaKey || ev.ctrlKey, key = ev.key || '', low = key.toLowerCase();
      if (st.menu && !ev.isComposing) {
        const items = menuItems();
        if (/^(ArrowDown|ArrowUp|Enter|Tab|Escape)$/.test(key)) {
          ev.preventDefault();
          if (key === 'Escape') return closeMenu();
          if (key === 'Enter' || key === 'Tab') { if (items[st.menu.on]) choose(items[st.menu.on].id); return; }
          st.menu.on = (st.menu.on + (key === 'ArrowDown' ? 1 : items.length - 1)) % Math.max(1, items.length);
          return drawMenu();
        }
      }
      if (st.bsel) {
        if (key === 'Backspace' || key === 'Delete') { ev.preventDefault(); return removeBlock(st.bsel); }
        if (key === 'Escape') { ev.preventDefault(); st.bsel = ''; return render(); }
        if (key === 'Enter') { ev.preventDefault(); return enter(st.sel || caret(st.bsel, 0)); }
        if (/^Arrow/.test(key)) {
          ev.preventDefault();
          const vis = view().filter(v => v.b), at = vis.findIndex(v => v.b.id === st.bsel), dir = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
          for (let k = at + dir; k >= 0 && k < vis.length; k += dir) { const b = vis[k].b; if (TEXT[b.k] || b.k === 'code') { st.bsel = ''; st.sel = caret(b.id, dir < 0 ? rlen(wordsOf(b)) : 0); st.restore = true; return render(); } if (ATOM[b.k]) return pick(b.id); }
          return;
        }
        if (key.length === 1 && !mod) { ev.preventDefault(); return typeText(null, key); }
      }
      if (key === 'Tab' && !mod && !ev.altKey) { ev.preventDefault(); const sel = readSel() || st.sel; if (sel) nest(sel, ev.shiftKey); return; }
      if (key === 'Escape') { if (st.link) return closeLink(); if (st.bar && readSel() && !collapsed(readSel())) { const s = readSel(); st.sel = caret(s.b.id, s.b.off, s.b.cell); st.restore = true; return render(); } if (o.onEscape) { ev.preventDefault(); o.onEscape(); } return; }
      if (!mod) return;
      const sel = readSel() || st.sel;
      if (low === 'z' && !ev.altKey) { ev.preventDefault(); return ev.shiftKey ? redo() : undo(); }
      if (low === 'y' && !ev.shiftKey) { ev.preventDefault(); return redo(); }
      if (!sel) return;
      if (ev.altKey) {
        const k = { Digit1: 'h1', Digit2: 'h2', Digit3: 'h3', Digit0: 'p', Digit5: 'ul', Digit6: 'ol', Digit7: 'todo', Digit8: 'toggle' }[ev.code];
        if (k) { ev.preventDefault(); return setKind(sel, k); }
        return;
      }
      const m = ev.shiftKey ? { x: 's', s: 's' }[low] : { b: 'b', i: 'i', e: 'c' }[low];
      if (m) { ev.preventDefault(); st.sel = sel; return toggleMark(m); }
      if (low === 'k' && !ev.shiftKey) { ev.preventDefault(); st.sel = sel; if (!collapsed(sel)) openLink(); return; }
      if (key === 'Enter' && !ev.shiftKey) { const b = st.blocks[by(sel.a.id)]; if (b && b.k === 'todo') { ev.preventDefault(); return commit(put(st.blocks, by(b.id), { ...b, on: !b.on }), sel, 'check'); } }
    }
    function onDown(ev) {
      const t = ev.target, row = t.closest && t.closest('.nb-row');
      const tg = t.closest && t.closest('.nb-tg'), box = t.closest && t.closest('.nb-box'), fold = t.closest && t.closest('.nb-fold'), more = t.closest && t.closest('.nb-tbtn');
      if (tg || fold) { ev.preventDefault(); const id = row.getAttribute('data-id'); return tg ? flipOpen(id) : flipFold(id); }
      if (!o.editable) return;
      if (box) { ev.preventDefault(); const i = by(row.getAttribute('data-id')), b = st.blocks[i]; return commit(put(st.blocks, i, { ...b, on: !b.on }), st.sel, 'check'); }
      if (more) { ev.preventDefault(); return tableMore(row.getAttribute('data-id'), more.getAttribute('data-act')); }
      if (row && row.classList.contains('nb-virtual')) { ev.preventDefault(); const i = by(row.getAttribute('data-for')), b = st.blocks[i]; if (!b) return; const p = withId({ k: 'p', d: b.d + 1, r: [] }); return commit([...st.blocks.slice(0, i + 1), p, ...st.blocks.slice(i + 1)], caret(p.id, 0), 'line'); }
      if (row && ATOM[(st.blocks[by(row.getAttribute('data-id'))] || {}).k] && !(t.closest && t.closest('.nb-cell'))) { ev.preventDefault(); return pick(row.getAttribute('data-id')); }
      // a press below the last line: write at the end (a new line when the last one isn't empty text)
      if (t === docEl) {
        const lastRow = docEl.lastElementChild;
        if (lastRow && ev.clientY > lastRow.getBoundingClientRect().bottom) {
          ev.preventDefault();
          const last = st.blocks[st.blocks.length - 1];
          if (last && last.k === 'p' && !last.d && isEmpty(last)) { st.sel = caret(last.id, 0); st.restore = true; return render(); }
          const p = withId({ k: 'p', d: 0, r: [] }); return commit([...st.blocks, p], caret(p.id, 0), 'line');
        }
      }
      if (st.bsel) { st.bsel = ''; render(); }
      // ⌘ or Ctrl and a press on a link opens it
      const a = t.closest && t.closest('.nb-a');
      if (a && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); const h = a.getAttribute('data-href'); if (h && h[0] !== '#') window.open(h, '_blank', 'noopener'); }
    }
    // Reading: a link to one of the page's headings goes there (opening what it is folded in); on the owner's page a press on its words opens it to write in, at that place.
    function onClick(ev) {
      const t = ev.target, ln = !o.editable && t.closest ? t.closest('a.nb-a') : null;
      if (ln && (ln.getAttribute('href') || '')[0] === '#') { ev.preventDefault(); return jump(ln.getAttribute('href')); }
      if (o.editable || !o.onOpen) return;
      if (t.closest && (t.closest('a') || t.closest('.nb-tg') || t.closest('.nb-fold'))) return;
      const s = document.getSelection();
      if (s && !s.isCollapsed && docEl.contains(s.anchorNode)) return;
      const p = s && s.rangeCount && docEl.contains(s.anchorNode) ? posOf(s.anchorNode, s.anchorOffset) : null, row = t.closest && t.closest('.nb-row');
      const id = p ? p.id : row ? row.getAttribute('data-id') : '', i = id ? by(id) : st.blocks.length - 1;
      o.onOpen({ i: i == null ? 0 : i, off: p && !p.cell ? p.off : 0 });
    }
    // A link "#some-heading" (as guide.js names headings: lower case, - for spaces): that heading, brought to the top.
    function jump(href) {
      let f = href.slice(1);
      try { f = decodeURIComponent(f); } catch (e) { /* as written */ }
      f = f.toLowerCase();
      const ids = G.headings(st.md || '').map(x => x.id), heads = st.blocks.filter(b => b.k === 'h'), k = ids.findIndex(id => id === f || id === 'g-' + f), b = k >= 0 ? heads[k] : null;
      if (b) goTo(b.id);
    }
    // To a heading (a link to it, or the outline): what it is folded or closed in opens (and this device remembers that), and the page brings it near its top.
    function goTo(id) {
      const i = by(id); if (i == null) return;
      reveal(i); render(); remember();
      const row = st.rows.get(id); if (!row) return;
      OL.pin = id; OL.pinUntil = Date.now() + 700; olMark(id);
      scrollToRow(row.el);
    }
    // What scrolls the page: the nearest box around it that scrolls up and down (null: the window, or nothing).
    function scroller() {
      for (let p = root.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
      }
      return null;
    }
    // Scrolls so the row sits a little below the top of what scrolls the page (smoothly, at once with Reduce Motion; only that box: not the window around it).
    function scrollToRow(rowE) {
      const sc = scroller(), behavior = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', r = rowE.getBoundingClientRect(), room = o.phone ? 16 : 24;
      if (sc) { const q = sc.getBoundingClientRect(), z = q.height / (sc.offsetHeight || q.height) || 1; sc.scrollTo({ top: Math.max(0, sc.scrollTop + (r.top - q.top) / z - room), behavior }); return; }
      const de = document.scrollingElement || document.documentElement;
      if (de && de.scrollHeight > innerHeight + 1) window.scrollTo({ top: Math.max(0, scrollY + r.top - room), behavior });
    }
    function flipOpen(id) {
      const was = !!st.open.get(id); st.open.set(id, !was);
      if (!was) st.easing = id;
      render(); remember();
    }
    function flipFold(id) {
      const was = !!st.fold.get(id); st.fold.set(id, !was);
      if (was) st.easing = id;
      // the caret was in what folds away: it goes to the heading
      if (!was && st.sel) { const i = by(st.sel.b.id); if (i != null && isInside(i, id)) { const b = st.blocks[by(id)]; st.sel = caret(id, rlen(b.r)); st.restore = true; } }
      render(); remember();
    }

    // ---------- typing in another script (Japanese, Chinese, accents): the browser writes, then the page reads what it wrote ----------
    function onComposeStart() { st.comp = readSel() || st.sel; root.setAttribute('data-composing', '1'); }
    function onComposeEnd(ev) {
      root.removeAttribute('data-composing');
      const at = st.comp; st.comp = null;
      // the browser changed the row itself: draw it again from the page's blocks, then put in what was written
      if (at) { const r = st.rows.get(at.a.id); if (r) r.sig = ''; }
      st.sel = at; st.restore = true; render();
      if (at && ev.data) typeText(at, ev.data);
    }

    // ---------- the + on an empty line, the block menu, the format bar, the phone's bar ----------
    function menuItems() {
      const q = st.menu && st.menu.slash ? st.menu.q || '' : '', w = q.trim().toLowerCase();
      return MENU.filter(it => (it.id !== 'img' || o.onPicture) && (!w || it.label.toLowerCase().includes(w) || it.keys.split(' ').some(k => k.startsWith(w))));
    }
    function openMenu(m) { st.menu = { on: 0, q: '', ...m }; drawMenu(); }
    function closeMenu() { if (!st.menu) return; st.menu = null; drawMenu(); }
    // A choice from the menu: "/" and what was typed after it go, then the line becomes that kind.
    function choose(id) {
      const m = st.menu; closeMenu();
      if (!m) return;
      const i = by(m.id), b = st.blocks[i];
      if (!b) return;
      let list = st.blocks, sel = caret(b.id, m.from || 0);
      if (m.slash) { const end = m.from + 1 + (m.q || '').length; list = put(list, i, { ...b, r: rsplice(b.r, m.from, end, []) }); st.blocks = settle(list); reindex(); }
      setKind(sel, id);
    }
    function drawMenu() {
      menuEl.textContent = '';
      if (!st.menu) { menuEl.classList.remove('nb-show'); return; }
      const items = menuItems();
      if (!items.length) { st.menu = null; menuEl.classList.remove('nb-show'); return; }
      st.menu.on = Math.min(st.menu.on, items.length - 1);
      items.forEach((it, k) => {
        const b = el('button', 'nb-item' + (k === st.menu.on ? ' nb-on' : ''), { type: 'button', role: 'option', 'aria-selected': k === st.menu.on ? 'true' : 'false', tabindex: '-1', 'data-id': it.id });
        const chip = el('span', 'nb-chip' + (it.small ? ' nb-small' : ''), it.icon ? { html: svg(it.icon, 15, 2) } : { text: it.glyph });
        b.append(chip, el('span', 'nb-label', { text: it.label }));
        menuEl.appendChild(b);
      });
      menuEl.classList.add('nb-show');
      placeMenu();
      const on = menuEl.querySelector('.nb-on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
    }
    // Where the root's own pieces go: in the root's box (the page may be scaled on the canvas).
    function local(rect) { const rr = root.getBoundingClientRect(), z = rr.width / (root.offsetWidth || rr.width) || 1; return { x: (rect.left - rr.left) / z, y: (rect.top - rr.top) / z, b: (rect.bottom - rr.top) / z, r: (rect.right - rr.left) / z, w: rect.width / z, h: rect.height / z, z }; }
    function placeMenu() {
      if (!st.menu) return;
      const row = st.rows.get(st.menu.id);
      if (!row) return;
      const tx = row.el.querySelector(':scope > .nb-tx') || row.el, r = local(tx.getBoundingClientRect()), w = 248, h = menuEl.offsetHeight || 300;
      const room = scrollBox(), below = room ? (room.bottom - tx.getBoundingClientRect().bottom) / r.z : 9999;
      const y = below < h + 16 && r.y > h + 16 ? r.y - h - 8 : r.b + 6;
      menuEl.style.left = Math.max(0, Math.min(r.x - 4, root.offsetWidth - w)) + 'px';
      menuEl.style.top = y + 'px';
    }
    function scrollBox() {
      let p = root.parentElement;
      while (p && p !== document.body) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowY)) return p.getBoundingClientRect(); p = p.parentElement; }
      return { top: 0, bottom: innerHeight };
    }
    function drawBar(sel) {
      barEl.textContent = '';
      if (st.link) {
        const f = el('input', 'nb-linkfield', { type: 'text', 'aria-label': 'Link', placeholder: 'Paste a link', value: st.link.value || '', autocomplete: 'off', spellcheck: 'false' });
        const ok = el('button', 'nb-bb', { type: 'button', 'aria-label': 'Add the link', 'data-tip': 'Add the link', html: svg('check', 15, 2.4), tabindex: '-1' });
        barEl.append(f, ok);
        if (st.link.had) barEl.appendChild(el('button', 'nb-bb', { type: 'button', 'aria-label': 'Take the link off', 'data-tip': 'Take the link off', 'data-act': 'unlink', html: svg('close', 14, 2.2), tabindex: '-1' }));
        setTimeout(() => { if (st.link && document.activeElement !== f) { f.focus(); f.select(); } }, 0);
        return;
      }
      const btn = (act, label, inner, on) => el('button', 'nb-bb' + (on ? ' nb-on' : ''), { type: 'button', 'aria-label': label, 'data-tip': label, 'aria-pressed': on ? 'true' : 'false', 'data-act': act, html: inner, tabindex: '-1' });
      barEl.append(btn('b', 'Bold', '<b>B</b>', has(sel, 'b')), btn('i', 'Italic', '<i>I</i>', has(sel, 'i')), btn('s', 'Strikethrough', '<s>S</s>', has(sel, 's')), btn('c', 'Code', svg('code', 16, 2), has(sel, 'c')), btn('link', 'Link', svg('link', 16, 2), has(sel, 'a')));
    }
    function openLink() {
      const sel = st.sel; if (!sel) return;
      const rs = rangesOf(sel), first = rs[0], cur = first ? rcut(runsIn(st.blocks[first.k], first), first.a, first.z).find(r => r.a) : null;
      st.link = { sel, value: cur ? cur.a : '', had: !!cur };
      st.bar = true; drawBar(sel); placeBar(sel);
    }
    function closeLink(apply) {
      const l = st.link; st.link = null;
      if (apply !== undefined && l) setLink(l.sel, apply);
      else if (l) { st.sel = l.sel; st.restore = true; render(); }
    }
    function placeBar(sel) {
      const s = document.getSelection();
      let rect = null;
      if (o.demo && o.demo.bar) { const e = root.querySelector('.nb-hl'); if (e) rect = e.getBoundingClientRect(); }
      else if (s && s.rangeCount && docEl.contains(s.anchorNode)) rect = s.getRangeAt(0).getBoundingClientRect();
      else if (st.link) { const row = st.rows.get(st.link.sel.a.id); if (row) rect = row.el.getBoundingClientRect(); }
      if (!rect || (!rect.width && !rect.height)) return;
      const r = local(rect), w = barEl.offsetWidth || 190, h = barEl.offsetHeight || 40;
      barEl.style.left = Math.max(0, Math.min(r.x + r.w / 2 - w / 2, root.offsetWidth - w)) + 'px';
      barEl.style.top = (r.y - h - 8 < 0 ? r.b + 8 : r.y - h - 8) + 'px';
      void sel;
    }
    function placeUi() {
      const live = st.comp ? null : (o.demo ? demoSel() : readSel()), sel = live || (st.link ? st.link.sel : null);
      // the + on an empty line of text with the caret
      const one = live && collapsed(live) && !live.a.cell ? st.blocks[by(live.a.id)] : null;
      const showPlus = !!(o.editable && !o.phone && one && one.k === 'p' && isEmpty(one) && !st.menu && (st.focused || o.demo));
      plusEl.classList.toggle('nb-show', showPlus);
      if (showPlus) { const row = st.rows.get(one.id); if (row) { const r = local((row.el.querySelector(':scope > .nb-tx') || row.el).getBoundingClientRect()); plusEl.style.left = (r.x - 30) + 'px'; plusEl.style.top = (r.y + (r.h - 24) / 2) + 'px'; plusEl.setAttribute('data-for', one.id); } }
      // the format bar over words that are selected (on a phone, the bar above the keyboard does it)
      const words = !!(o.editable && sel && !collapsed(sel) && rangesOf(sel).length && (!sel.a.cell || sameCell(sel)));
      st.bar = words && !o.phone || !!st.link;
      barEl.classList.toggle('nb-show', st.bar);
      if (st.bar) { if (!st.link) drawBar(sel); placeBar(sel); }
      if (st.menu) {
        // the / menu follows what is typed after the "/", and closes when the caret leaves it
        if (st.menu.slash) {
          const b = st.blocks[by(st.menu.id)], t = b && TEXT[b.k] ? rtext(b.r) : '', c = live && collapsed(live) && live.a.id === st.menu.id ? live.a.off : -1;
          if (!b || t[st.menu.from] !== '/' || c <= st.menu.from || c - st.menu.from > 25 || /\s/.test(t.slice(st.menu.from + 1, c))) { if (!o.demo) closeMenu(); }
          else if (st.menu.q !== t.slice(st.menu.from + 1, c)) { st.menu.q = t.slice(st.menu.from + 1, c); st.menu.on = 0; drawMenu(); }
          else placeMenu();
        } else placeMenu();
      }
      if (o.phone) drawKeys(live);
      olShow();
    }
    // The phone's bar above the keyboard: Aa, To-do, Bullets, Toggle, Picture and Done; while words are selected, Bold, Italic, Strikethrough, Code and Link.
    function drawKeys(sel) {
      const show = !!(o.editable && (st.focused || (o.demo && o.demo.keys))), host = o.keysHost || root;
      keysEl.classList.toggle('nb-show', show);
      if (keysEl.parentNode !== host) host.appendChild(keysEl);
      if (!show) return placeKeys();
      keysEl.textContent = '';
      const b = sel ? st.blocks[by(ordered(sel).s.id)] : null, words = sel && !collapsed(sel) && rangesOf(sel).length;
      const btn = (act, label, inner, on) => el('button', 'nb-kb' + (on ? ' nb-on' : ''), { type: 'button', 'aria-label': label, 'aria-pressed': on ? 'true' : 'false', 'data-act': act, html: inner, tabindex: '-1' });
      if (st.aa && !words) {
        keysEl.append(btn('h1', 'Heading', '<span class="nb-kt">Heading</span>', b && b.k === 'h' && b.level === 1), btn('h2', 'Subheading', '<span class="nb-kt">Subheading</span>', b && b.k === 'h' && b.level === 2), btn('p', 'Text', '<span class="nb-kt">Text</span>', b && b.k === 'p'), btn('aa', 'Close', svg('close', 15, 2.2)));
      } else if (words) {
        keysEl.append(btn('b', 'Bold', '<b>B</b>', has(sel, 'b')), btn('i', 'Italic', '<i>I</i>', has(sel, 'i')), btn('s', 'Strikethrough', '<s>S</s>', has(sel, 's')), btn('c', 'Code', svg('code', 17, 2), has(sel, 'c')), btn('link', 'Link', svg('link', 17, 2), has(sel, 'a')));
      } else {
        keysEl.append(btn('aa', 'Text style', '<span class="nb-kt nb-aa">Aa</span>', false), btn('todo', 'To-do', svg('todo', 18, 1.9), b && b.k === 'todo'), btn('ul', 'Bullets', svg('list', 18, 1.9), b && b.k === 'ul'), btn('toggle', 'Toggle', svg('toggle', 13, 2), b && b.k === 'toggle'));
        if (o.onPicture) keysEl.appendChild(btn('img', 'Picture', svg('image', 18, 1.9)));
        keysEl.appendChild(el('span', 'nb-kgap'));
        keysEl.appendChild(btn('done', 'Hide the keyboard', svg('down', 18, 2.2)));
      }
      placeKeys();
    }
    // Where the bar goes on a phone's web page: right above the phone's keyboard while a line is written, and at the bottom of the screen with no keyboard on
    // it (a hardware one), as in the iPhone app. The keyboard covers the bottom of the page without making it shorter; the browser says what is still seen
    // (visualViewport: how tall it is and how far down, which change as the keyboard comes and goes and as the phone moves the view), so the bar follows
    // that, with no motion of its own. While the bar shows, the page has room at its end for the keyboard, so its last line can be written above the bar.
    // (On the canvas the board gives the bar a box of its own, over its drawn keyboard: `keysHost`.)
    function placeKeys() {
      if (o.keysHost || !o.phone || !keysEl.classList.contains('nb-show')) { keysEl.style.position = keysEl.style.top = keysEl.style.bottom = ''; root.style.removeProperty('--nb-kb'); return; }
      const vv = window.visualViewport, low = vv ? vv.offsetTop + vv.height : innerHeight, h = keysEl.offsetHeight || 50;
      keysEl.style.position = 'fixed'; keysEl.style.bottom = 'auto'; keysEl.style.top = Math.round(low - h) + 'px';
      root.style.setProperty('--nb-kb', Math.max(0, Math.round(innerHeight - low)) + 'px');
    }
    // (the keyboard came or went: the line being written stays in view above the bar)
    function onViewport(ev) {
      placeKeys();
      if (ev && ev.type === 'resize' && st.focused && st.sel && keysEl.classList.contains('nb-show')) { const row = st.rows.get(st.sel.b.id); if (row) visible(row.el); }
    }
    // ---------- the outline: the rail of the page's headings at its right, and their tree ----------
    // heads: the headings with words, in page order (id, words, how far in: 0 for the page's highest level, then 1 and 2); cur: the one being read;
    // pin: the one just gone to (it stays the one being read while the page scrolls there); open: the card is open (hover, focus or a tap);
    // sheet: a phone's sheet while it is open.
    const OL = { heads: [], sig: '', cur: '', pin: '', pinUntil: 0, raf: 0, hover: false, focus: false, tap: false, esc: false, open: false, touch: false, sheet: null };
    function outlineHeads() {
      const out = [];
      for (const b of st.blocks) if (b.k === 'h') { const w = rtext(b.r).replace(/\s+/g, ' ').trim(); if (w) out.push({ id: b.id, w: w.slice(0, 200), lv: Math.min(Math.max(b.level || 1, 1), 3) }); }
      const top = out.reduce((m, x) => Math.min(m, x.lv), 3);
      for (const x of out) x.ind = Math.min(2, x.lv - top);
      return out;
    }
    // Drawn again with the page (a heading written, renamed or taken away shows at once), its lines and names only when the headings changed.
    function drawOutline() {
      if (!o.outline) { if (olWrap.parentNode) olWrap.remove(); closeSheet(true); OL.heads = []; OL.sig = ''; return; }
      if (olWrap.parentNode !== root) root.insertBefore(olWrap, root.firstChild);
      const heads = outlineHeads(), sig = JSON.stringify(heads.map(x => [x.id, x.w, x.ind])) + (o.phone ? '|phone' : '');
      OL.heads = heads;
      if (sig !== OL.sig) {
        OL.sig = sig;
        railEl.textContent = ''; panelEl.textContent = '';
        railEl.setAttribute('aria-haspopup', o.phone ? 'dialog' : 'menu');
        for (const x of heads) {
          railEl.appendChild(el('span', 'nb-ol-line nb-i' + x.ind, { 'data-for': x.id, 'aria-hidden': 'true' }));
          const it = el('button', 'nb-ol-item nb-i' + x.ind, { type: 'button', role: 'menuitem', tabindex: '-1', 'data-for': x.id, text: x.w });
          panelEl.appendChild(it);
        }
        if (OL.sheet) drawSheet();
        if (OL.cur && !heads.some(x => x.id === OL.cur)) OL.cur = '';
        olMark(OL.cur);
      }
      olShow();
      olSoon();
    }
    // Shown with two headings or more, and on a phone not while the keyboard is up (a line is being written). The card is open while the pointer is on it,
    // the keyboard's focus is in it, or a touch opened it (the canvas's state: always).
    function olShow() {
      if (!o.outline) return;
      const typing = !!(o.phone && o.editable && (st.focused || (o.demo && o.demo.keys))), show = OL.heads.length >= 2 && !typing, D = o.demo && o.demo.outline;
      olWrap.classList.toggle('nb-ol-off', !show);
      if (!show) { OL.tap = false; closeSheet(true); }
      olOpen(show && !o.phone && !!(OL.hover || (OL.focus && !OL.esc) || OL.tap || D));
      if (show && o.phone && D && !OL.sheet) openSheet();
    }
    function olOpen(v) {
      if (OL.open === v) return;
      OL.open = v;
      olEl.classList.toggle('nb-open', v);
      railEl.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) { olSoon(); const it = panelEl.querySelector('.nb-cur'); if (it) olEnsure(it, true); }
      if (v && OL.tap) document.addEventListener('pointerdown', olAway, true); else document.removeEventListener('pointerdown', olAway, true);
    }
    // (a touch opened it: a touch anywhere else closes it)
    function olAway(ev) { if (olEl.contains(ev.target)) return; OL.tap = false; olShow(); }
    // The heading being read: the last one whose row has come up to a line just under the top of what scrolls the page (where going to a heading puts
    // it; the first one before any has).
    function olSoon() { if (OL.raf || !OL.heads.length) return; OL.raf = requestAnimationFrame(() => { OL.raf = 0; olFind(); }); }
    function olFind() {
      if (!OL.heads.length || !root.isConnected) return;
      let cur = OL.pin && OL.heads.some(x => x.id === OL.pin) ? OL.pin : '';
      if (!cur) {
        const sc = scroller(), q = sc ? sc.getBoundingClientRect() : { top: 0, height: innerHeight }, z = sc ? q.height / (sc.offsetHeight || q.height) || 1 : 1, line = q.top + 48 * z;
        let first = '';
        for (const x of OL.heads) {
          const r = st.rows.get(x.id); if (!r || !r.el.isConnected) continue;
          if (!first) first = x.id;
          if (r.el.getBoundingClientRect().top <= line) cur = x.id; else break;
        }
        cur = cur || first || OL.heads[0].id;
      }
      if (cur !== OL.cur) olMark(cur);
    }
    function olMark(id) {
      OL.cur = id || '';
      for (const e of railEl.children) e.classList.toggle('nb-cur', e.getAttribute('data-for') === OL.cur);
      for (const e of panelEl.children) { const on = e.getAttribute('data-for') === OL.cur; e.classList.toggle('nb-cur', on); if (on) e.setAttribute('aria-current', 'location'); else e.removeAttribute('aria-current'); }
      if (OL.sheet) for (const e of OL.sheet.list.children) { const on = e.getAttribute('data-for') === OL.cur; e.classList.toggle('nb-cur', on); if (on) e.setAttribute('aria-current', 'location'); else e.removeAttribute('aria-current'); }
    }
    // A name in the card stays in sight inside it (the card scrolls when there are many; the page around it never moves).
    function olEnsure(it, middle) {
      const p = it.parentElement; if (!p || p.scrollHeight <= p.clientHeight) return;
      if (middle) p.scrollTop = it.offsetTop - (p.clientHeight - it.offsetHeight) / 2;
      else if (it.offsetTop < p.scrollTop) p.scrollTop = it.offsetTop - 6;
      else if (it.offsetTop + it.offsetHeight > p.scrollTop + p.clientHeight) p.scrollTop = it.offsetTop + it.offsetHeight - p.clientHeight + 6;
    }
    // A phone: the tree in Lucida's own sheet from the bottom (its name, Close, a row for each heading), over the dimmed page; a heading scrolls there and
    // closes it, and so do a tap on the page behind, Close and Escape. (On the canvas it is drawn in the board's own box: sheetHost.)
    function openSheet() {
      if (OL.sheet || OL.heads.length < 2) return;
      const host = o.sheetHost || root, wrap = el('div', 'nb-ol-sheetw' + (o.sheetHost ? '' : ' nb-fixed')), scrim = el('div', 'nb-ol-scrim');
      // (not aria-modal: the app's own dialogs, web/ui.js, would set the page aside until its next paint; this sheet keeps the keyboard's focus in itself)
      const sheet = el('div', 'nb-ol-sheet', { role: 'dialog', 'aria-label': 'Outline' }), head = el('div', 'nb-ol-shead');
      const close = el('button', 'nb-ol-x', { type: 'button', 'aria-label': 'Close', html: svg('close', 14, 2.2) }), list = el('div', 'nb-ol-list');
      head.append(el('span', 'nb-ol-stitle', { text: 'Outline' }), close);
      sheet.append(head, list); wrap.append(scrim, sheet); host.appendChild(wrap);
      OL.sheet = { wrap, list, close };
      drawSheet();
      scrim.addEventListener('click', () => closeSheet());
      close.addEventListener('click', () => closeSheet());
      list.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('.nb-ol-row'); if (!b) return; const id = b.getAttribute('data-for'); closeSheet(); goTo(id); });
      wrap.addEventListener('keydown', ev => {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); return closeSheet(); }
        // (the keyboard's focus stays in the sheet while it is open)
        if (ev.key === 'Tab') { const f = [close, ...list.children], at = f.indexOf(document.activeElement); ev.preventDefault(); f[(at + (ev.shiftKey ? f.length - 1 : 1) + f.length) % f.length].focus(); }
      });
      railEl.setAttribute('aria-expanded', 'true');
      if (!o.demo) setTimeout(() => { if (OL.sheet && OL.sheet.wrap === wrap) (list.querySelector('.nb-cur') || close).focus({ preventScroll: true }); }, 0);
    }
    function drawSheet() {
      const l = OL.sheet.list; l.textContent = '';
      for (const x of OL.heads) l.appendChild(el('button', 'nb-ol-row nb-i' + x.ind, { type: 'button', 'data-for': x.id, text: x.w }));
      olMark(OL.cur);
    }
    // (it goes the way Lucida's sheets go, at once with Reduce Motion; the keyboard's focus goes back to the rail)
    function closeSheet(now) {
      const s = OL.sheet; if (!s) return;
      OL.sheet = null; railEl.setAttribute('aria-expanded', 'false');
      const back = s.wrap.contains(document.activeElement);
      if (now || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) s.wrap.remove();
      else { s.wrap.classList.add('nb-gone'); s.wrap.style.pointerEvents = 'none'; setTimeout(() => s.wrap.remove(), 200); }
      if (back && railEl.isConnected) railEl.focus({ preventScroll: true });
    }
    // The keys: on the rail, Down, Return or Space go into the card (on the current heading); in it, Up, Down, Home and End move, Return or Space goes to the
    // heading, and Escape closes it, back on the rail. (Tab leaves it, and it closes.)
    function onOlKey(ev) {
      if (o.phone) return;
      const items = [...panelEl.children], at = items.indexOf(document.activeElement), k = ev.key;
      if (k === 'Escape') { if (!OL.open) return; ev.preventDefault(); ev.stopPropagation(); OL.esc = true; OL.hover = false; OL.tap = false; if (at >= 0) railEl.focus({ preventScroll: true }); return olShow(); }
      if (ev.target === railEl && /^(ArrowDown|Enter| )$/.test(k)) {
        ev.preventDefault(); OL.esc = false; OL.focus = true; olShow();
        const it = panelEl.querySelector('.nb-cur') || items[0]; if (it) { it.focus({ preventScroll: true }); olEnsure(it); }
        return;
      }
      if (at < 0) return;
      let to = -1;
      if (k === 'ArrowDown') to = (at + 1) % items.length; else if (k === 'ArrowUp') to = (at + items.length - 1) % items.length; else if (k === 'Home') to = 0; else if (k === 'End') to = items.length - 1;
      if (to >= 0) { ev.preventDefault(); items[to].focus({ preventScroll: true }); olEnsure(items[to]); }
    }
    // (a press on the rail or a name never takes the caret out of the page: what was being written stays where it was)
    railEl.addEventListener('mousedown', ev => ev.preventDefault());
    panelEl.addEventListener('mousedown', ev => ev.preventDefault());
    olEl.addEventListener('pointerdown', ev => { OL.touch = ev.pointerType === 'touch'; });
    olEl.addEventListener('pointerenter', ev => { if (ev.pointerType === 'touch' || o.phone) return; OL.hover = true; olShow(); });
    olEl.addEventListener('pointerleave', ev => { if (ev.pointerType === 'touch') return; OL.hover = false; OL.esc = false; olShow(); });
    olEl.addEventListener('focusin', () => { OL.focus = true; olShow(); });
    olEl.addEventListener('focusout', () => setTimeout(() => { if (olEl.contains(document.activeElement)) return; OL.focus = false; OL.esc = false; olShow(); }, 0));
    olEl.addEventListener('keydown', onOlKey);
    railEl.addEventListener('click', () => { if (o.phone) return openSheet(); if (OL.touch) { OL.tap = !OL.open; olShow(); } });
    panelEl.addEventListener('click', ev => {
      const b = ev.target.closest && ev.target.closest('.nb-ol-item'); if (!b) return;
      goTo(b.getAttribute('data-for'));
      if (OL.touch) { OL.tap = false; olShow(); }
    });
    // As the page scrolls (only what scrolls it), the heading being read follows; a scroll that isn't the one going to a heading lets that heading go.
    function onScroll(ev) {
      if (!root.isConnected) { document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', olSoon); return; }
      const t = ev.target;
      if (!(t === document || t === document.documentElement || (t && t.contains && t.contains(root)))) return;
      if (OL.pin) { if (Date.now() <= OL.pinUntil) OL.pinUntil = Date.now() + 250; else OL.pin = ''; }
      olSoon();
    }
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', olSoon);

    // The canvas's selection: none (its states show the menu and the bar as drawn).
    function demoSel() {
      const D = o.demo;
      if (D.bar) { const b = st.blocks[D.bar.i]; return b ? { a: { id: b.id, off: D.bar.a }, b: { id: b.id, off: D.bar.b } } : null; }
      if (D.caret != null) { const b = st.blocks[D.caret]; return b ? caret(b.id, rlen(wordsOf(b))) : null; }
      return null;
    }
    function demoUi() {
      const D = o.demo;
      if (D.menu && D.caret != null) { const b = st.blocks[D.caret]; if (b) { st.menu = { id: b.id, from: 0, on: 0, q: '', slash: false }; drawMenu(); } }
      placeUi();
    }

    plusEl.addEventListener('mousedown', ev => { ev.preventDefault(); const id = plusEl.getAttribute('data-for'); if (id) openMenu({ id, from: 0, slash: false }); });
    menuEl.addEventListener('mousedown', ev => { ev.preventDefault(); const b = ev.target.closest && ev.target.closest('.nb-item'); if (b) choose(b.getAttribute('data-id')); });
    barEl.addEventListener('mousedown', ev => {
      const b = ev.target.closest && ev.target.closest('button');
      if (ev.target.closest && ev.target.closest('.nb-linkfield')) return;
      ev.preventDefault();
      if (!b) return;
      if (st.link) { const f = barEl.querySelector('.nb-linkfield'); return b.getAttribute('data-act') === 'unlink' ? closeLink('') : closeLink(G.href(f ? f.value : '')); }
      const act = b.getAttribute('data-act'), sel = readSel() || st.sel;
      if (!sel) return;
      st.sel = sel;
      if (act === 'link') return openLink();
      toggleMark(act);
    });
    barEl.addEventListener('keydown', ev => {
      if (!st.link) return;
      if (ev.key === 'Enter') { ev.preventDefault(); const f = barEl.querySelector('.nb-linkfield'), h = G.href(f ? f.value : ''); if (h || !f.value.trim()) closeLink(h); else f.classList.add('nb-bad'); }
      if (ev.key === 'Escape') { ev.preventDefault(); closeLink(); }
    });
    keysEl.addEventListener('mousedown', ev => { if (ev.target.closest && ev.target.closest('button')) ev.preventDefault(); });
    keysEl.addEventListener('click', ev => {
      const b = ev.target.closest && ev.target.closest('button'); if (!b) return;
      const act = b.getAttribute('data-act'), sel = readSel() || st.sel;
      if (act === 'done') { const s = document.getSelection(); if (s) s.removeAllRanges(); docEl.blur(); st.focused = false; st.aa = false; return placeUi(); }
      if (act === 'aa') { st.aa = !st.aa; return drawKeys(sel); }
      if (!sel) return;
      st.sel = sel;
      if (act === 'b' || act === 'i' || act === 's' || act === 'c') return toggleMark(act);
      if (act === 'link') return openLink();
      if (act === 'img') return setKind(sel, 'img');
      const cur = st.blocks[by(ordered(sel).s.id)], same = cur && (act === cur.k || (cur.k === 'h' && act === 'h' + cur.level));
      st.aa = false;
      setKind(sel, same && act !== 'p' ? 'p' : act);
    });

    docEl.addEventListener('beforeinput', onBeforeInput);
    docEl.addEventListener('keydown', onKey);
    docEl.addEventListener('mousedown', onDown);
    docEl.addEventListener('click', onClick);
    docEl.addEventListener('compositionstart', onComposeStart);
    docEl.addEventListener('compositionend', onComposeEnd);
    docEl.addEventListener('copy', ev => onCopy(ev, false));
    docEl.addEventListener('cut', ev => onCopy(ev, true));
    docEl.addEventListener('paste', onPaste);
    docEl.addEventListener('dragstart', ev => ev.preventDefault());
    docEl.addEventListener('drop', ev => ev.preventDefault());
    docEl.addEventListener('focusin', () => { st.focused = true; placeUi(); });
    docEl.addEventListener('focusout', () => { setTimeout(() => { if (root.contains(document.activeElement) && !olEl.contains(document.activeElement)) return; st.focused = false; st.aa = false; closeMenu(); placeUi(); if (o.phone) drawKeys(null); }, 0); });
    const onSel = () => {
      if (!root.isConnected) { document.removeEventListener('selectionchange', onSel); if (window.visualViewport) { window.visualViewport.removeEventListener('resize', onViewport); window.visualViewport.removeEventListener('scroll', onViewport); } return; }
      if (st.comp) return;
      const s = readSel();
      if (s) { st.sel = s; if (st.pend && !(collapsed(s) && s.a.id === st.pend.id && s.a.off === st.pend.off)) st.pend = null; }
      placeUi();
    };
    document.addEventListener('selectionchange', onSel);
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', onViewport); window.visualViewport.addEventListener('scroll', onViewport); }

    const api = {
      focus(at) { if (!o.editable) return; let b, off = 0; if (at === 'end' || at == null) { b = st.blocks[st.blocks.length - 1]; off = b ? rlen(wordsOf(b)) : 0; } else { b = st.blocks[Math.max(0, Math.min(at.i | 0, st.blocks.length - 1))]; off = at.off | 0; } if (!b) return; reveal(by(b.id)); if (!TEXT[b.k] && b.k !== 'code') return pick(b.id); off = Math.min(off, rlen(wordsOf(b))); st.sel = caret(b.id, off); st.restore = true; render(); },
      flush() { clearTimeout(rememberT); changed(); remember(); },
      selectedText() { const s = readSel(); return s && !collapsed(s) ? G.plain(G.markdown(selectionBlocks(s))) : ''; },
      blocks: () => st.blocks
    };
    function update(next) {
      const was = o; o = { ...(next || {}) };
      const key = String(o.key || ''), md = String(o.md == null ? '' : o.md);
      if (key !== st.key || (md !== st.sent && md !== st.md) || JSON.stringify(was.demo || null) !== JSON.stringify(o.demo || null)) load(md, key);
      else if (!!was.editable !== !!o.editable || !!was.phone !== !!o.phone) { st.rows.forEach(r => { r.sig = ''; }); render(); }
      else if (!!was.outline !== !!o.outline) drawOutline();
      if (o.focusAt != null && !st.focusedOnce && o.editable) { st.focusedOnce = true; setTimeout(() => api.focus(o.focusAt), 0); }
    }
    return { root, api, update };
  }

  function mount(host, opts) {
    if (!host || typeof document === 'undefined') return null;
    let p = host.__nb;
    if (!p || !host.contains(p.root)) p = host.__nb = Page(host, opts);
    p.update(opts);
    return p.api;
  }
  return { mount };
}
export default makeNotes;
