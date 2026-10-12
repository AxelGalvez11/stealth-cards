// The Mind map page in the web app (step 4a of "Recall Maps", design/specs/step4-maps.md §5 and §6): the map you look at, fold, select,
// write in, test yourself on and link to cards. The page around it is the approved board itself (design/pages.mjs WebPage and PhonePage,
// with the map's parts from design/maps.mjs mapPage): this file gives that markup its values (`mp`, the same names the canvas's sample
// states give it) and owns the stage, the one element the board leaves to it (data-sc-own), where the map is drawn and handled.
//   - Drawing: the numbers come from web/maps.js (layoutMind) and are drawn by the boards' own drawing (design/maps.mjs mapArt: draw),
//     so the app's map is the approved picture, in the theme's colors. Pan and zoom only move one <g>; a new layout glides boxes from
//     where they were (MOTION.reveal, ease .2,.8,.2,1) and the camera glides over MOTION.sheet; with Reduce Motion nothing moves.
//   - Editing: every change is a maps.edit operation (add, set, remove, move, indent, outdent, link, unlink), shown at once and handed to
//     `onEdit(data, summary)` (the board sends it to web/pagesclient.js, which saves a moment after the last change). A burst of typing
//     is one step of ⌘Z (50 steps on this screen); each undo is an ordinary edit. New ideas get ids 'n' + 7 random base-36 characters.
//   - Another writer (an AI app, another device, the merge after a 409): the page's new data comes in, the ideas it added or changed get
//     the "✦ New" tint for 4 seconds, and a line says what changed ('Claude added 4 ideas · v9').
//   - Studying: Test me (hide everything, the weak ones or a branch; on the map or one at a time), its marks handed to `onTest` (the
//     store's mapmarks.save; they never make a version), the weak-spots overlay (maps.ideaTone of the cards' sched.toneOf and the last
//     marks), the Cards popover (linked cards, Link a card ranked by maps.matchCards, Study them: the review set page:<page>:<idea>) and
//     + Card (a card prefilled from the idea, linked to it once it is added).
//   - What a device remembers (localStorage lucida.maps.view, by page): its folds, Map or Outline, the overlay, and the camera.
// Like web/notes.js, it is one function with no imports (makeMapView(maps, art)); design/build.mjs puts it in the boards that call
// this.mapview(), so the app runs it through the board. Words are put in as text: the drawing escapes every label (mapArt.draw) and
// the field over a box is a real <input>.
//
// USE. makeMapView(maps, art).model(o) gives the board its `mp` values (and keeps this page's state between paints). o:
//   key, data, version, by, title, editable, phone, t (the theme), cards [{id, front, back, tone}], marks (the page's S.mapMarks n:
//   {id: [knew, missed, last, at]}), deckName, conflict ({by, theirs, mine}) and clearConflict(), query ({idea, test}: ?idea= opens
//   centred on an idea, ?test=weak opens Test me on the weak ones), aiLeft, rerender(), onEdit(data, summary, own: a summary of its own,
//   like 'Made a card from “Krebs cycle” and linked it', for Versions), onMakeCard({front, back,
//   nodeId}), onStudy(set), onTest(results, ids), onToast(words), onVersions(), onFromCards(), onDone() (a menu of the page's closes).
// leave(key) forgets what was open (the page closed); link(key, ideaId, cardId, summary) links a new card; tones(data, cards, marks)
// gives every idea's weak-spots tone (for a map shown inside a Note).
export function makeMapView(maps, art) {
  const MEM = 'lucida.maps.view', SIZE = [15, 13.5, 12.5], WEIGHT = [600, 600, 500], PAD_X = 14, CHIP = 26, UNDO = 50;
  const GLIDE = 160, CAM = 250, POPW = 360, POPH = 476;
  const views = new Map();
  // (leaving the page with a field open: it closes first, as a click elsewhere would, so the save that goes out as the page goes
  // (web/pagesclient.js, on pagehide) has the label as typed and no empty new idea. A capturing listener runs before that one.)
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => { for (const S of views.values()) if (S.o) { if (S.editing) commitEdit(S); if (S.noting) { S.noting = false; release(S); } } }, true);
  const r1 = v => Math.round(v * 10) / 10;
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  const q = s => '“' + s + '”';
  const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const noop = () => {};
  // The ease every glide uses (.2,.8,.2,1), as a function of time.
  function ease(x) {
    const bx = s => 3 * 0.2 * s * (1 - s) * (1 - s) + 3 * 0.2 * s * s * (1 - s) + s * s * s, by = s => 3 * 0.8 * s * (1 - s) * (1 - s) + 3 * s * s * (1 - s) + s * s * s;
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (bx(m) < x) lo = m; else hi = m; }
    return by((lo + hi) / 2);
  }

  // ---------- what this device remembers about each map ----------
  function recall(key) {
    try { const all = JSON.parse(localStorage.getItem(MEM) || '{}'); return own(all, key) && all[key] && typeof all[key] === 'object' ? all[key] : null; } catch (e) { return null; }
  }
  function keep(S) {
    clearTimeout(S.keepT);
    S.keepT = setTimeout(() => {
      try {
        const all = JSON.parse(localStorage.getItem(MEM) || '{}') || {};
        delete all[S.key];
        const cam = S.cards && S.camBefore ? S.camBefore : S.cam;
        all[S.key] = { folds: S.folds || {}, outline: !!S.outline, weak: !!S.weak, cam: cam ? { z: r1(cam.z * 100) / 100, x: r1(cam.x), y: r1(cam.y) } : null };
        const ks = Object.keys(all);
        for (const k of ks.slice(0, Math.max(0, ks.length - 60))) delete all[k];
        localStorage.setItem(MEM, JSON.stringify(all));
      } catch (e) { /* no storage: it is kept until the page closes */ }
    }, 300);
  }

  // ---------- the map's ideas ----------
  // Every idea by id: the idea, its level, its parent's id, the labels on the way to it, and its children's ids; and the outline order.
  function index(data, title) {
    const by = new Map(), order = [], root = data && data.root;
    if (!root || typeof root !== 'object') return { by, order, root: '' };
    const st = [[root, 0, null, []]];
    while (st.length) {
      const [n, level, parent, path] = st.pop();
      if (!n || typeof n !== 'object' || by.has(n.id)) continue;
      const kids = Array.isArray(n.children) ? n.children : [];
      by.set(n.id, { n, level, parent, path, kids: kids.map(k => k.id) });
      order.push(n.id);
      for (let i = kids.length - 1; i >= 0; i--) st.push([kids[i], level + 1, n.id, path.concat(level === 0 ? n.label || title || 'Topic' : n.label || '')]);
    }
    return { by, order, root: root.id };
  }
  const under = (I, id, top) => { for (let p = I.by.has(id) ? I.by.get(id).parent : null; p; p = I.by.get(p).parent) if (p === top) return true; return false; };
  function newId(I) { let id = ''; while (!id || I.by.has(id)) { let s = ''; while (s.length < 7) s += Math.random().toString(36).slice(2); id = 'n' + s.slice(0, 7); } return id; }
  // The weak-spots tone of every idea: maps.ideaTone of its linked cards' tones (sched.toneOf) and its last Test me mark.
  function tones(data, cards, marks) {
    const tone = new Map((cards || []).map(c => [c.id, c.tone])), out = new Map();
    for (const [id, x] of index(data).by) {
      if (x.level === 0) continue;
      const m = marks instanceof Map ? marks.get(id) : own(marks, id) ? marks[id] : undefined;
      out.set(id, maps.ideaTone((x.n.cardIds || []).map(c => tone.get(c)).filter(Boolean), m));
    }
    return out;
  }

  // ---------- this page's state ----------
  function stateOf(key) {
    let S = views.get(key);
    if (!S) {
      const m = recall(key) || {};
      S = { key, data: null, version: 0, folds: m.folds && typeof m.folds === 'object' ? m.folds : null, outline: !!m.outline, weak: !!m.weak, cam: m.cam && m.cam.z > 0 ? m.cam : null,
        sel: '', editing: null, coalesce: false, cards: false, query: '', sheet: false, hide: 'all', show: '', more: false, note: false, test: null, done: null,
        undo: [], redo: [], changed: new Set(), live: null, el: null, wrap: null, svg: null, input: null, W: 0, H: 0, o: null, sig: '', pos: new Map(), fresh: true };
      views.set(key, S);
    }
    return S;
  }
  // The page as it is now: a change made here is already ours; anything else came from another writer.
  function adopt(S, o) {
    const d = o.data && o.data.root ? o.data : maps.emptyOf('mindmap');
    S.version = o.version;
    if (S.data === d) return;
    if (!S.data) { S.data = d; return; }
    const prev = S.data;
    S.data = d;
    if (JSON.stringify(prev) === JSON.stringify(d)) return;
    const df = maps.diff('mindmap', prev, d), I = index(d);
    const ids = [...df.added, ...df.renamed, ...df.moved, ...df.noted, ...df.linked].map(x => x.id).filter(id => I.by.has(id));
    S.changed = new Set(ids);
    clearTimeout(S.ringT);
    S.ringT = setTimeout(() => { S.changed = new Set(); redraw(S); }, 4000);
    const who = o.by && o.by !== 'You' && o.by !== 'you' ? o.by : '';
    S.live = { line: maps.summaryOf(df, who ? { who } : undefined) + ' · v' + o.version };
    // (what was undone or redone here was before their change: going back to it would take theirs away)
    S.undo = []; S.redo = [];
    if (S.editing && !I.by.has(S.editing.id)) { S.editing = null; S.coalesce = false; }
    if (S.sel && !I.by.has(S.sel)) S.sel = '';
    if (S.test) for (const id of [...S.test.ids]) if (!I.by.has(id)) { S.test.ids = S.test.ids.filter(x => x !== id); S.test.marks.delete(id); }
  }

  // ---------- changing the map ----------
  // One operation through maps.edit: shown at once and saved after. `quiet`: part of a burst of typing (one undo step for all of it).
  // While a field is open (a label or a note being typed, or `hold`), the change is handed on held: nothing is saved until the field
  // closes (release), so a burst of typing is one version, and an idea added and let go of with Esc is never saved at all.
  function apply(S, op, opts) {
    const x = opts || {}, r = maps.edit('mindmap', S.data, op);
    if (!r.summary) return null;
    if (!(x.quiet && S.coalesce)) { S.undo.push(S.data); if (S.undo.length > UNDO) S.undo.shift(); S.redo = []; }
    if (x.quiet) S.coalesce = true;
    S.data = r.data;
    const hold = x.hold != null ? !!x.hold : !!(S.editing || S.noting);
    S.held = hold;
    S.o.onEdit && S.o.onEdit(r.data, x.summary || r.summary, !!x.summary, { hold });
    return r;
  }
  // The field closed: what it held goes to be saved (with the page's title, when a new map's topic was just named).
  function release(S, title) {
    if (!S.held && !title) return;
    S.held = false;
    S.o.onEdit && S.o.onEdit(S.data, '', false, title ? { title } : {});
  }
  function restore(S, to, back) {
    const from = back ? S.undo : S.redo, into = back ? S.redo : S.undo;
    if (!from.length || !S.o.editable) return;
    into.push(S.data);
    S.data = from.pop();
    const I = index(S.data);
    if (S.sel && !I.by.has(S.sel)) S.sel = '';
    S.editing = null; S.coalesce = false;
    S.held = false; S.noting = false; S.toast = null;
    S.o.onEdit && S.o.onEdit(S.data, back ? 'Undid a change' : 'Redid a change', false, {});
    refresh(S);
  }
  const label = (I, id, title) => { const x = I.by.get(id); return x ? x.n.label || (x.level === 0 ? title || 'the topic' : 'an idea') : ''; };

  // Typing a label: in the field over its box (the map), in its row (the outline) or in the idea bar. A new idea left empty goes.
  function beginEdit(S, id, opts) {
    const x = opts || {}, I = index(S.data, S.o.title);
    if (!S.o.editable || S.test || !I.by.has(id)) return;
    if (S.editing && S.editing.id !== id) commitEdit(S);
    const n = I.by.get(id).n;
    S.sel = id; S.cards = false; S.more = false; S.note = false;
    S.editing = { id, text: x.text != null ? x.text : n.label || '', was: n.label || '', fresh: !!x.fresh, where: x.where || (S.outline ? 'outline' : 'map') };
    S.coalesce = !!x.fresh;
    if (x.text != null && x.text !== (n.label || '')) apply(S, { op: 'set', id, label: x.text }, { quiet: true });
    S.focusEdit = true;
    refresh(S);
  }
  function typed(S, text) {
    const ed = S.editing; if (!ed) return;
    ed.text = text;
    apply(S, { op: 'set', id: ed.id, label: text }, { quiet: true });
    refresh(S);
  }
  // how: 'enter' (a sibling next), 'tab' (a child next), or nothing (done).
  function commitEdit(S, how) {
    const ed = S.editing; if (!ed) return;
    S.editing = null;
    const I = index(S.data, S.o.title), x = I.by.get(ed.id);
    if (x && ed.fresh && !String(x.n.label || '').trim() && x.level > 0) {
      apply(S, { op: 'remove', id: ed.id }, { quiet: true });
      if (ed.undoAt && S.undo.length === ed.undoAt) S.undo.pop();
      S.sel = x.parent || '';
      S.coalesce = false;
      release(S);
      return refresh(S);
    }
    S.coalesce = false;
    // (a map with no title yet takes its topic's words as its title, in the same save)
    release(S, x && x.level === 0 && !String(S.o.title || '').trim() && String(x.n.label || '').trim() ? String(x.n.label).trim().slice(0, 200) : '');
    if (how === 'enter' && x) return addIdea(S, x.level === 0 ? ed.id : x.parent, x.level === 0 ? null : ed.id);
    if (how === 'tab' && x) return addIdea(S, ed.id, null);
    refresh(S);
  }
  function cancelEdit(S) {
    const ed = S.editing; if (!ed) return;
    S.editing = null;
    const I = index(S.data, S.o.title), x = I.by.get(ed.id);
    if (x && ed.fresh && x.level > 0) { apply(S, { op: 'remove', id: ed.id }, { quiet: true }); if (ed.undoAt && S.undo.length === ed.undoAt) S.undo.pop(); S.sel = x.parent || ''; }
    else if (x && (x.n.label || '') !== ed.was) apply(S, { op: 'set', id: ed.id, label: ed.was }, { quiet: true });
    S.coalesce = false;
    release(S);
    refresh(S);
  }
  // A new idea under `parent` (after `after`, or last), typed into at once.
  function addIdea(S, parent, after) {
    const I = index(S.data, S.o.title);
    if (!S.o.editable || !I.by.has(parent)) return;
    const id = newId(I), op = { op: 'add', id, parent, label: '' };
    if (after) op.after = after;
    if (S.folds && S.folds[parent]) { S.folds = { ...S.folds, [parent]: false }; keep(S); }
    else if (I.by.get(parent).n.folded) { S.folds = { ...(S.folds || {}), [parent]: false }; keep(S); }
    S.coalesce = false;
    if (!apply(S, op, { hold: true })) return S.o.onToast && S.o.onToast('There’s no room for another idea there (20 under one idea, 6 levels, 200 in a map).');
    S.coalesce = true;
    S.editing = { id, text: '', was: '', fresh: true, where: S.outline ? 'outline' : 'map', undoAt: S.undo.length };
    S.sel = id; S.focusEdit = true; S.cards = false; S.more = false; S.camTo = 'sel';
    refresh(S);
  }
  function remove(S, id) {
    const I = index(S.data, S.o.title), x = I.by.get(id);
    if (!S.o.editable || !x || x.level === 0) return;
    const sibs = I.by.get(x.parent).kids, i = sibs.indexOf(id);
    S.coalesce = false;
    const r = apply(S, { op: 'remove', id });
    if (!r) return;
    S.sel = sibs[i + 1] || sibs[i - 1] || x.parent;
    S.editing = null; S.cards = false; S.more = false;
    // (the map's own toast, with Undo, for a few seconds)
    S.toast = { line: r.summary };
    clearTimeout(S.toastT); S.toastT = setTimeout(() => { S.toast = null; redraw(S); }, 6000);
    refresh(S);
  }
  function move(S, id, op) {
    if (!S.o.editable || !id) return;
    S.coalesce = false;
    const was = S.editing && S.editing.id === id ? S.editing : null;
    if (apply(S, op)) { if (was) S.editing = was; refresh(S); }
  }
  // Folding is this device's (never saved): the "+N" chip, Fold in the idea bar, Space; Alt folds or opens everything under it too.
  function foldOf(S, I, id) { const x = I.by.get(id); if (!x) return false; const f = S.folds && own(S.folds, id) ? S.folds[id] : undefined; return x.kids.length > 0 && (f === undefined || f === null ? x.n.folded === true : !!f); }
  function toggleFold(S, id, deep) {
    const I = index(S.data, S.o.title), x = I.by.get(id);
    if (!x || !x.kids.length || S.test) return;
    const to = !foldOf(S, I, id), f = { ...(S.folds || {}) };
    f[id] = to;
    if (deep) for (const [k, y] of I.by) if (y.kids.length && under(I, k, id)) f[k] = to;
    holdStill(S, id, () => { S.folds = f; });
    keep(S);
    refresh(S);
  }
  function foldAll(S) {
    const I = index(S.data, S.o.title), L = S.L, any = L && L.nodes.some(n => n.folded), f = {};
    for (const [id, x] of I.by) if (x.kids.length) f[id] = any ? false : x.level === 1;
    holdStill(S, I.root, () => { S.folds = f; });
    keep(S);
    refresh(S);
  }
  // The idea pressed stays where it is on the screen while the map lays out again around it (the camera makes up the difference).
  function holdStill(S, id, change) {
    const a = S.L && S.L.nodes.find(n => n.id === id);
    change();
    if (!a || !S.cam || !S.W) return;
    const L = layoutFor(S), b = L.nodes.find(n => n.id === id);
    if (b) S.cam = { ...S.cam, x: S.cam.x + S.cam.z * (a.x - b.x), y: S.cam.y + S.cam.z * (a.y - b.y) };
  }

  // ---------- Test me ----------
  function startTest(S, hide, show) {
    const I = index(S.data, S.o.title), tn = tones(S.data, S.o.cards, S.o.marks);
    let ids = maps.testOrder(S.data, null);
    if (hide === 'weak') ids = ids.filter(id => tn.get(id) === 'weak');
    if (hide === 'branch' && S.sel && I.by.has(S.sel)) { const inside = ids.filter(id => under(I, id, S.sel)); ids = inside.length ? inside : I.by.get(S.sel).level ? [S.sel] : ids; }
    if (Array.isArray(hide)) ids = ids.filter(id => hide.includes(id));
    if (!ids.length) { S.sheet = false; S.o.onToast && S.o.onToast(hide === 'weak' ? 'No weak ideas right now.' : 'Nothing to test here yet: add some ideas first.'); return refresh(S); }
    if (S.editing) commitEdit(S);
    S.test = { ids, marks: new Map(), shown: false, mode: show || S.show || (S.o.phone ? 'one' : 'map'), hide };
    S.sheet = false; S.cards = false; S.more = false; S.done = null; S.outline = false; S.note = false;
    S.sel = ids[0];
    // (the whole map, opened, in view; the keys go to it: Space shows, 1 Missed, 2 Knew it)
    S.camTo = S.test.mode === 'one' ? 'test' : 'fit';
    refresh(S);
    setTimeout(() => S.wrap && S.wrap.focus({ preventScroll: true }), 0);
  }
  const current = T => (T ? T.ids.find(id => !T.marks.has(id)) || '' : '');
  function reveal(S) { if (!S.test || S.test.shown) return; S.test.shown = true; refresh(S); }
  function mark(S, ok) {
    const T = S.test; if (!T) return;
    const id = current(T); if (!id) return;
    if (!T.shown) { T.shown = true; }
    T.marks.set(id, ok ? 'knew' : 'missed');
    T.shown = false;
    const next = current(T);
    if (!next) return endTest(S);
    S.sel = next; S.camTo = 'test';
    refresh(S);
  }
  // The end of a test (every idea marked, or End): the marks so far are kept (onTest), and the Done sheet says how it went.
  function endTest(S) {
    const T = S.test; if (!T) return;
    S.test = null;
    const results = T.ids.filter(id => T.marks.has(id)).map(id => ({ id, ok: T.marks.get(id) === 'knew' }));
    if (results.length && S.o.onTest) S.o.onTest(results, index(S.data).order);
    S.sel = ''; S.camTo = 'fit';
    if (results.length) S.done = { n: results.length, missed: results.filter(r => !r.ok).map(r => r.id), marks: new Map(T.marks) };
    refresh(S);
  }

  // ---------- the stage: drawing, the camera, the pointer and the keys ----------
  function sideOf(S) { return (S.W || (S.o && S.o.phone ? 390 : 1200)) >= 700 ? 'both' : 'right'; }
  function foldsFor(S) {
    if (!S.test) return S.folds || {};
    const f = {}; for (const [id, x] of index(S.data).by) if (x.kids.length) f[id] = false; return f;
  }
  function layoutFor(S) {
    const folds = foldsFor(S), k = JSON.stringify(folds) + '|' + sideOf(S) + '|' + (S.o.title || '');
    if (S.L && S.Ld === S.data && S.Lk === k) return S.L;
    S.L = maps.layoutMind(S.data, { side: sideOf(S), folds, title: S.o.title || '' }); S.Ld = S.data; S.Lk = k;
    return S.L;
  }
  const boxes = (S, L) => art.boxesOf(L, S.data, { units: maps.units });
  // The part of the stage nothing covers: under the Map / Outline and Weak spots buttons, over the idea bar or the test's panel.
  function areaOf(S) {
    const W = S.W, H = S.H;
    if (S.o.phone) return { x: 0, y: 0, w: W, h: H - (S.sel && !S.test ? 200 : S.test ? 220 : 0) };
    const bottom = S.test ? 210 : S.sel ? 150 : 0;
    return { x: 0, y: 56, w: W, h: Math.max(160, H - 56 - bottom) };
  }
  function fitCam(S) {
    const L = layoutFor(S), B = boxes(S, L);
    // (never below 80% on a computer, testing or not (§5.1): a map too big for that is fitted at 80% and the camera follows the idea asked)
    return S.o.phone ? art.fitIn(B, { x: 0, y: 0, w: S.W, h: S.H }, { inset: 16, zmin: 1.04, zmax: 1.25 }) : art.fitIn(B, areaOf(S), { inset: 24, zmin: 0.8, zmax: 1 });
  }
  function frameIds(S, ids, z) {
    const L = layoutFor(S), B = boxes(S, L);
    return art.frame({ nodes: B }, ids, areaOf(S), { inset: S.o.phone ? 16 : 24, zmin: S.o.phone ? 0.92 : 0.6, zmax: S.o.phone ? 1.25 : 1.2, z: z || (S.cam ? Math.max(S.cam.z, S.o.phone ? 1.04 : 0.8) : 1), pad: 8 });
  }
  // A box fully on screen (in the part nothing covers), or the camera that brings it there.
  function inView(S, id, cam) {
    const L = layoutFor(S), n = boxes(S, L).find(x => x.id === id), c = cam || S.cam, A = areaOf(S);
    if (!n || !c) return true;
    const x0 = c.x + c.z * n.x, y0 = c.y + c.z * n.y, x1 = x0 + c.z * n.w, y1 = y0 + c.z * n.h;
    return x0 >= A.x + 8 && y0 >= A.y + 8 && x1 <= A.x + A.w - 8 && y1 <= A.y + A.h - 8;
  }
  // A remembered camera still shows the map: the topic wholly on the stage (24 px in from its edges), and at least half of the
  // map's ideas on it too.
  function onStage(S, id) {
    const B = boxes(S, layoutFor(S)), c = S.cam, M = 24;
    if (!c || !B.length) return false;
    const inside = n => { const x0 = c.x + c.z * n.x, y0 = c.y + c.z * n.y; return x0 >= M && y0 >= M && x0 + c.z * n.w <= S.W - M && y0 + c.z * n.h <= S.H - M; };
    const n = B.find(x => x.id === id);
    return !!n && inside(n) && B.filter(inside).length * 2 >= B.length;
  }
  const branchIds = (S, id, sibs) => art.branchOf(layoutFor(S), id, sibs);
  function zoomAt(S, px, py, z) {
    const c = S.cam; if (!c) return;
    const lo = S.o.phone ? 0.5 : 0.4, hi = S.o.phone ? 2.5 : 2, nz = Math.max(lo, Math.min(hi, z));
    S.cam = { z: nz, x: px - (px - c.x) * nz / c.z, y: py - (py - c.y) * nz / c.z };
    applyCam(S); settleSoon(S);
  }
  function glideCam(S, to) {
    cancelAnimationFrame(S.camRaf);
    if (!S.cam || still() || !S.wrap) { S.cam = to; applyCam(S); return settle(S); }
    const from = { ...S.cam }, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / CAM), e = ease(k);
      S.cam = { z: from.z + (to.z - from.z) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
      applyCam(S);
      if (k < 1) S.camRaf = requestAnimationFrame(step); else { S.cam = to; settle(S); }
    };
    S.camRaf = requestAnimationFrame(step);
  }
  function applyCam(S) {
    const g = S.svg && S.svg.firstElementChild, c = S.cam;
    if (g && c) g.setAttribute('transform', 'translate(' + r1(c.x) + ' ' + r1(c.y) + ') scale(' + Math.round(c.z * 1000) / 1000 + ')');
    placeEdit(S);
  }
  function settleSoon(S) { clearTimeout(S.settleT); S.settleT = setTimeout(() => settle(S), 140); }
  function settle(S) { paint(S); keep(S); S.o && S.o.rerender && S.o.rerender(); }

  // What the drawing shows (computed by model, drawn here at the camera).
  function paint(S) {
    if (!S.wrap || !S.L || !S.cam || !S.W) return;
    const c = S.cam, A = S.art || {}, small = S.o.phone ? 12.5 : Math.max(10, r1(11 / c.z)), chip = S.o.phone ? 12.5 : Math.max(11, r1(11 / c.z));
    const html = art.draw(S.L, S.data, { ...A, W: S.W, H: S.H, z: Math.round(c.z * 1000) / 1000, x: r1(c.x), y: r1(c.y), small, chip });
    if (html !== S.sig) {
      S.sig = html;
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const svg = tpl.content.firstElementChild;
      if (S.svg) S.wrap.replaceChild(svg, S.svg); else S.wrap.insertBefore(svg, S.wrap.firstChild);
      S.svg = svg;
      // (boxes glide from where they were; a new one comes out of its parent)
      const pos = new Map(), relaid = S.paintedL && S.paintedL !== S.L, by = new Map(S.L.nodes.map(n => [n.id, n]));
      for (const g of svg.querySelectorAll('g[data-id]')) {
        const id = g.getAttribute('data-id'), m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform') || '');
        if (!m) continue;
        const to = [+m[1], +m[2]];
        pos.set(id, to);
        if (!relaid || still() || typeof g.animate !== 'function') continue;
        const was = S.pos.get(id), n = by.get(id), from = was || (n && n.parent && S.pos.get(n.parent));
        if (from && (from[0] !== to[0] || from[1] !== to[1])) g.animate([{ transform: 'translate(' + from[0] + 'px, ' + from[1] + 'px)', opacity: was ? 1 : 0 }, { transform: 'translate(' + to[0] + 'px, ' + to[1] + 'px)', opacity: 1 }], { duration: GLIDE, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      S.pos = pos;
      S.paintedL = S.L;
    }
    placeEdit(S);
  }
  function redraw(S) { if (S.o && S.o.rerender) S.o.rerender(); }
  // The field over a box while its label is typed (the box is drawn without its words under it).
  function placeEdit(S) {
    const inp = S.input, ed = S.editing;
    if (!inp) return;
    const n = ed && ed.where === 'map' && S.L ? S.L.nodes.find(x => x.id === ed.id) : null;
    if (!n || !S.cam) { if (inp.style.display !== 'none') inp.style.display = 'none'; return; }
    const z = S.cam.z, lv = Math.min(n.level, 2), t = S.o.t || {}, CH = [8.6, 7.4, 6.9];
    const w = Math.max(n.w, Math.ceil(maps.units(ed.text) * CH[lv]) + 2 * PAD_X + 6), fill = n.level === 0 ? t.inv : n.level === 1 ? t.surf2 : t.bg;
    Object.assign(inp.style, { display: 'block', left: r1(S.cam.x + z * (n.side < 0 ? n.x + n.w - w : n.x)) + 'px', top: r1(S.cam.y + z * n.y) + 'px', width: r1(z * w) + 'px', height: r1(z * n.h) + 'px',
      background: w > n.w ? fill : 'transparent', borderRadius: r1((n.level === 0 ? Math.min(16, n.h / 2) : 10) * z) + 'px',
      padding: '0 ' + r1(PAD_X * z) + 'px', fontSize: r1(SIZE[lv] * z) + 'px', fontWeight: String(WEIGHT[lv]), color: n.level === 0 ? t.invText : t.text, caretColor: n.level === 0 ? t.invText : t.text });
    if (inp.value !== ed.text) inp.value = ed.text;
    if (S.focusEdit) { S.focusEdit = false; inp.focus({ preventScroll: true }); const e = inp.value.length; try { inp.setSelectionRange(e, e); } catch (x) { /* not a text field */ } }
  }

  // The stage's element, the first time it is drawn (and again when Outline gave it back).
  function setup(S, el) {
    if (S.ro) S.ro.disconnect();
    // (a fresh start: the size is measured again and everything drawn anew, whatever the stage was before)
    S.el = el; el.textContent = ''; S.W = 0; S.H = 0; S.sig = ''; S.pos = new Map(); S.paintedL = null;
    const wrap = document.createElement('div');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('role', 'application');
    wrap.setAttribute('aria-roledescription', 'mind map');
    wrap.className = 'mv-wrap';
    Object.assign(wrap.style, { position: 'absolute', inset: '0', outline: 'none', cursor: 'grab', touchAction: 'none', overflow: 'hidden' });
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'mv-edit'; inp.setAttribute('aria-label', 'Idea'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('spellcheck', 'false');
    Object.assign(inp.style, { position: 'absolute', display: 'none', boxSizing: 'border-box', border: '0', outline: '0', margin: '0', background: 'transparent', font: 'inherit', textAlign: 'left', zIndex: '2' });
    const live = document.createElement('div');
    live.setAttribute('aria-live', 'polite');
    Object.assign(live.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' });
    wrap.append(inp, live);
    el.appendChild(wrap);
    S.wrap = wrap; S.input = inp; S.liveEl = live; S.svg = null; S.sig = '';
    // (the page redraws by reusing elements: once the Outline takes the stage's place, this element may be the outline's now, and
    // its events are no longer the map's)
    const ours = () => S.wrap === wrap && wrap.classList.contains('mv-wrap');
    inp.addEventListener('input', () => { if (S.input === inp && inp.className === 'mv-edit') typed(S, inp.value); });
    inp.addEventListener('keydown', e => {
      if (S.input !== inp || inp.className !== 'mv-edit') return;
      e.stopPropagation();
      if (e.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(S, 'enter'); }
      else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); commitEdit(S, 'tab'); }
      else if (e.key === 'Tab') { e.preventDefault(); const id = S.editing && S.editing.id; move(S, id, { op: 'outdent', id }); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(S); wrap.focus({ preventScroll: true }); }
    });
    inp.addEventListener('blur', () => { if (S.input === inp && inp.className === 'mv-edit' && S.editing && S.editing.where === 'map' && document.activeElement !== inp) setTimeout(() => { if (S.editing && S.editing.where === 'map' && document.activeElement !== inp) commitEdit(S); }, 0); });
    // (pan: drag anywhere; pinch: two fingers; a press without a drag selects)
    const pts = new Map();
    wrap.addEventListener('pointerdown', e => {
      if (!ours()) return;
      if (e.target === inp || (e.button && e.pointerType === 'mouse')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; S.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.cam ? S.cam.z : 1 }; S.drag = null; return; }
      const g = e.target.closest && e.target.closest('[data-id]');
      S.drag = { x: e.clientX, y: e.clientY, cx: S.cam ? S.cam.x : 0, cy: S.cam ? S.cam.y : 0, moved: false, id: g ? g.getAttribute('data-id') : '' };
      // (the idea under the press: a double-click's own target is the wrap, which holds the pointer)
      S.pressId = S.drag.id;
      try { wrap.setPointerCapture(e.pointerId); } catch (x) { /* already gone */ }
    });
    wrap.addEventListener('pointermove', e => {
      if (!ours()) return;
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (S.pinch && pts.size === 2) {
        const [a, b] = [...pts.values()], r = wrap.getBoundingClientRect();
        zoomAt(S, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, S.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / (S.pinch.d || 1));
        return;
      }
      const d = S.drag; if (!d || !S.cam) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 4) { d.moved = true; wrap.style.cursor = 'grabbing'; }
      if (d.moved) { S.cam = { ...S.cam, x: d.cx + dx, y: d.cy + dy }; applyCam(S); }
    });
    const up = e => {
      if (!ours()) return;
      pts.delete(e.pointerId);
      if (S.pinch) { if (pts.size < 2) { S.pinch = null; settle(S); } return; }
      const d = S.drag; S.drag = null; wrap.style.cursor = 'grab';
      if (!d) return;
      if (d.moved) return settle(S);
      if (e.type === 'pointerup') press(S, d.id, e);
    };
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', up);
    wrap.addEventListener('dblclick', e => {
      if (!ours()) return;
      const g = e.target.closest && e.target.closest('[data-id]'), id = g ? g.getAttribute('data-id') : S.pressId || '';
      if (S.test) return;
      if (!id) return glideCam(S, fitCam(S));
      if (S.o.editable) beginEdit(S, id, { where: 'map' });
      else glideCam(S, frameIds(S, branchIds(S, id, false)));
    });
    wrap.addEventListener('wheel', e => {
      if (!S.cam || !ours()) return;
      e.preventDefault();
      const r = wrap.getBoundingClientRect(), k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      if (e.ctrlKey || e.metaKey) zoomAt(S, e.clientX - r.left, e.clientY - r.top, S.cam.z * Math.exp(-e.deltaY * k * 0.01));
      else { S.cam = { ...S.cam, x: S.cam.x - e.deltaX * k, y: S.cam.y - e.deltaY * k }; applyCam(S); settleSoon(S); }
    }, { passive: false });
    // (Safari's pinch on a trackpad)
    let gz = 1;
    wrap.addEventListener('gesturestart', e => { if (!ours()) return; e.preventDefault(); gz = S.cam ? S.cam.z : 1; });
    wrap.addEventListener('gesturechange', e => { if (!ours()) return; e.preventDefault(); const r = wrap.getBoundingClientRect(); zoomAt(S, e.clientX - r.left, e.clientY - r.top, gz * e.scale); });
    wrap.addEventListener('keydown', e => { if (ours()) key(S, e); });
    S.ro = new ResizeObserver(() => size(S, true));
    S.ro.observe(el);
  }
  function size(S, again) {
    const el = S.el; if (!el) return;
    // (an element that stopped being the stage, its wrap gone to the Outline: its size isn't the map's)
    if (!el.isConnected || !el.hasAttribute('data-sc-own') || !S.wrap || S.wrap.parentNode !== el) return;
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H || (W === S.W && H === S.H)) return;
    const side = sideOf(S);
    S.W = W; S.H = H;
    // (a camera this device remembered is kept only while the topic is on the stage; otherwise the map opens fitted)
    if (!S.camChecked) { S.camChecked = true; if (S.cam && !S.focus && !onStage(S, index(S.data).root)) S.cam = null; }
    if (!S.cam) S.cam = S.focus ? frameIds(S, branchIds(S, S.focus, false)) : fitCam(S);
    if (again) { if (sideOf(S) !== side) S.cam = fitCam(S); redraw(S); }
  }

  // A press on the map: on an idea it selects it (on its "+N", it opens; with Alt, it folds or opens everything under it); in a test, on
  // the idea being asked it shows it; on empty space it lets go of what's selected and closes what's open over the map.
  function press(S, id, e) {
    if (S.editing && S.editing.where === 'map') commitEdit(S);
    const T = S.test;
    if (T) {
      if (id && id === current(T)) reveal(S);
      else if (id && !T.marks.has(id) && T.ids.includes(id)) {
        // (another hidden idea whose parent shows: it is asked next)
        const I = index(S.data), p = I.by.get(id) && I.by.get(id).parent;
        if (!p || !T.ids.includes(p) || T.marks.has(p)) { T.ids = [id, ...T.ids.filter(x => x !== id)].sort((a, b) => (T.marks.has(a) ? -1 : 0) - (T.marks.has(b) ? -1 : 0)); T.shown = true; S.sel = id; refresh(S); }
      }
      S.wrap && S.wrap.focus({ preventScroll: true });
      return;
    }
    if (id) {
      const n = S.L && S.L.nodes.find(x => x.id === id);
      if (n && n.kids > 0 && S.cam) {
        const r = S.wrap.getBoundingClientRect(), mx = (e.clientX - r.left - S.cam.x) / S.cam.z - n.x;
        const onChip = n.folded && (n.side < 0 ? mx <= CHIP : mx >= n.w - CHIP);
        if (onChip || e.altKey) { toggleFold(S, id, e.altKey); return; }
      }
      if (S.sel !== id) { S.cards = false; S.more = false; S.note = false; }
      S.sel = id;
      announce(S);
    } else { S.sel = ''; S.cards = false; S.more = false; S.note = false; }
    S.wrap && S.wrap.focus({ preventScroll: true });
    refresh(S);
  }
  function announce(S) {
    if (!S.liveEl || !S.sel) return;
    const I = index(S.data, S.o.title), x = I.by.get(S.sel); if (!x) return;
    const sibs = x.parent ? I.by.get(x.parent).kids : [S.sel], tn = tones(S.data, S.o.cards, S.o.marks).get(S.sel), nc = (x.n.cardIds || []).length;
    S.liveEl.textContent = [label(I, S.sel, S.o.title), 'level ' + (x.level + 1), (sibs.indexOf(S.sel) + 1) + ' of ' + sibs.length, nc ? plural(nc, 'card') : '', tn === 'weak' ? 'weak' : '', foldOf(S, I, S.sel) ? 'folded' : ''].filter(Boolean).join(', ');
  }
  // The keys (§5.4), with the map focused (the outline has the same editing keys).
  function key(S, e) {
    if (e.target === S.input || e.isComposing) return;
    const I = index(S.data, S.o.title), sel = S.sel, x = sel ? I.by.get(sel) : null, mod = e.metaKey || e.ctrlKey, k = e.key;
    const done = () => { e.preventDefault(); e.stopPropagation(); };
    if (mod && (k === 'z' || k === 'Z')) { done(); return restore(S, null, !e.shiftKey); }
    if (mod && (k === 'y')) { done(); return restore(S, null, false); }
    if (mod) return;
    if (S.test) {
      if (k === ' ' || k === 'Enter') { done(); return S.test.shown ? null : reveal(S); }
      if (k === '1') { done(); return mark(S, false); }
      if (k === '2') { done(); return mark(S, true); }
      if (k === 'Escape') { done(); return endTest(S); }
      return;
    }
    if (k === 'Escape') { done(); if (S.cards || S.more || S.sheet || S.note) { S.cards = S.more = S.sheet = S.note = false; } else S.sel = ''; return refresh(S); }
    if (!x) {
      if (/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter|Tab|F2| )$/.test(k)) { done(); S.sel = I.root; announce(S); return refresh(S); }
      const c = k.toLowerCase();
      if (c === 'f') { done(); return glideCam(S, fitCam(S)); }
      if (c === 't') { done(); S.sheet = true; return refresh(S); }
      if (c === 'w') { done(); S.weak = !S.weak; keep(S); return refresh(S); }
      if (c === 'o') { done(); S.outline = !S.outline; keep(S); return refresh(S); }
      return;
    }
    const L = layoutFor(S), node = L.nodes.find(n => n.id === sel), left = node && node.side < 0;
    const go = id => { if (!id) return; S.sel = id; announce(S); refresh(S); if (!inView(S, id)) glideCam(S, frameIds(S, [id])); };
    const vis = id => L.nodes.some(n => n.id === id);
    const sibs = x.parent ? I.by.get(x.parent).kids.filter(vis) : [];
    if (e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) { done(); return move(S, sel, { op: 'move', id: sel, by: k === 'ArrowUp' ? -1 : 1 }); }
    switch (k) {
      case 'ArrowLeft': case 'ArrowRight': {
        done();
        const toKid = (k === 'ArrowRight') !== !!left;
        if (x.level === 0) { const want = k === 'ArrowRight' ? 1 : -1; return go((L.nodes.find(n => n.parent === sel && (n.side === want || (want === 1 && n.side === 0))) || {}).id); }
        if (toKid) return go(x.kids.find(vis)); return go(x.parent);
      }
      case 'ArrowUp': case 'ArrowDown': { done(); const i = sibs.indexOf(sel); return go(sibs[i + (k === 'ArrowUp' ? -1 : 1)]); }
      case 'Enter': done(); return S.o.editable ? addIdea(S, x.level === 0 ? sel : x.parent, x.level === 0 ? null : sel) : null;
      case 'Tab': done(); if (!S.o.editable) return; return e.shiftKey ? move(S, sel, { op: 'outdent', id: sel }) : addIdea(S, sel, null);
      case ' ': done(); return toggleFold(S, sel, false);
      case 'F2': done(); return beginEdit(S, sel, { where: 'map' });
      case 'Delete': case 'Backspace': done(); return remove(S, sel);
      default:
        if (k.length === 1 && !e.altKey && S.o.editable && /\S/.test(k)) { done(); return beginEdit(S, sel, { where: 'map', text: k }); }
    }
  }

  // After a change: the page draws again (the board's values), and the stage with it.
  function refresh(S) { redraw(S); }

  // ---------- the board's values ----------
  function model(o) {
    const S = stateOf(o.key);
    S.o = o;
    adopt(S, o);
    const t = o.t, phone = !!o.phone, title = o.title || '', data = S.data, I = index(data, title), editable = !!o.editable;
    // (opened from a link: ?idea= centred on that idea and selected; ?test=weak Test me on the weak ones)
    if (S.fresh) {
      S.fresh = false;
      const qy = o.query || {};
      if (qy.idea && I.by.has(qy.idea)) { S.sel = qy.idea; S.focus = qy.idea; S.cam = null; }
      if (qy.test) { S.sheet = true; S.hide = qy.test === 'weak' ? 'weak' : qy.test === 'branch' && S.sel ? 'branch' : 'all'; }
      if (!S.folds) { S.folds = {}; if (I.order.length > 40) for (const [id, x] of I.by) if (x.level === 2 && x.kids.length) S.folds[id] = true; }
      // (a new map: the topic is selected, ready to be typed)
      if (editable && !data.root.label && !(data.root.children || []).length) { S.sel = data.root.id; S.startEdit = true; }
    }
    if (S.sel && !I.by.has(S.sel)) S.sel = '';
    const L = layoutFor(S), tn = tones(data, o.cards, o.marks), T = S.test, testing = !!T;
    const cur = current(T), weakN = [...tn.values()].filter(x => x === 'weak').length;
    // The test's hidden ideas and marks.
    const hidden = new Set(), marks = new Map();
    if (T) { for (const id of T.ids) { if (T.marks.has(id)) marks.set(id, T.marks.get(id)); else if (!(id === cur && T.shown)) hidden.add(id); } }
    // (behind the Done sheet, the boxes keep the marks just made until it closes)
    else if (S.done && S.done.marks) for (const [id, m] of S.done.marks) if (I.by.has(id)) marks.set(id, m);
    const weakIn = new Map();
    if (S.weak) for (const n of L.nodes) if (n.folded) { let k = 0; for (const [id] of I.by) if (tn.get(id) === 'weak' && under(I, id, n.id)) k++; if (k) weakIn.set(n.id, k); }
    const editingMap = S.editing && S.editing.where === 'map' && !S.outline ? S.editing : null;
    S.art = { t, tones: S.weak ? tn : null, sel: S.sel, hidden, marks, changed: S.changed, weakIn, units: maps.units, title, editing: editingMap ? { id: editingMap.id, text: '', bare: true } : null };
    // (the camera follows the test, and an idea asked for by a link)
    // (the Cards popover sits at the stage's edge on the idea's side; the map moves only as far as it must to keep the idea beside it,
    // and that move is the popover's, not a camera this device remembers: closing it glides back)
    if (S.W && S.cam && S.camTo === 'cards' && S.sel) {
      S.camTo = '';
      const n = L.nodes.find(x => x.id === S.sel), side = n && n.side < 0 ? -1 : 1, A = side > 0 ? { x: 0, y: 56, w: S.W - POPW - 32, h: S.H - 56 - 150 } : { x: POPW + 32, y: 56, w: S.W - POPW - 32, h: S.H - 56 - 150 };
      const cam = S.cam, hang0 = n && !(n.kids > 0 && !n.folded) ? 44 : 0, b = n && { x0: cam.x + cam.z * (n.x - (side < 0 ? hang0 : 0)), x1: cam.x + cam.z * (n.x + n.w + (side > 0 ? hang0 : 0)), y0: cam.y + cam.z * n.y, y1: cam.y + cam.z * (n.y + n.h) };
      if (b) {
        const dx = b.x1 > A.x + A.w - 16 ? A.x + A.w - 16 - b.x1 : b.x0 < A.x + 16 ? A.x + 16 - b.x0 : 0, dy = b.y1 > A.y + A.h - 16 ? A.y + A.h - 16 - b.y1 : b.y0 < A.y + 16 ? A.y + 16 - b.y0 : 0;
        if (dx || dy) { const want = { z: cam.z, x: cam.x + dx, y: cam.y + dy }; S.camBefore = S.camBefore || { ...cam }; S.camPan = want; setTimeout(() => glideCam(S, want), 0); }
      }
    }
    if (!S.cards && S.camBefore) {
      // (the popover closed: the map glides back to where it was, unless it was moved meanwhile)
      const back = S.camBefore, p = S.camPan, c0 = S.cam, moved = !p || !c0 || Math.abs(c0.x - p.x) > 1 || Math.abs(c0.y - p.y) > 1 || Math.abs(c0.z - p.z) > 0.001;
      S.camBefore = null; S.camPan = null;
      if (!moved && S.W && !T) setTimeout(() => glideCam(S, back), 0);
    }
    if (S.W && S.cam && S.camTo === 'fit' && !S.outline) {
      S.camTo = ''; let want = fitCam(S);
      // (a test on the map: when the whole map doesn't fit at 80%, the idea asked first is brought into view at that zoom)
      if (T && cur && !inView(S, cur, want)) want = frameIds(S, [cur], want.z);
      setTimeout(() => glideCam(S, want), 0);
    }
    if (S.W && S.cam && S.camTo === 'sel' && S.sel && !S.outline) { S.camTo = ''; if (!inView(S, S.sel)) { const want = frameIds(S, [S.sel]); setTimeout(() => glideCam(S, want), 0); } }
    if (S.W && S.cam && S.camTo === 'test' && cur) { S.camTo = ''; const want = T.mode === 'one' ? frameIds(S, branchIds(S, cur, true), phone ? 1.25 : 1.2) : inView(S, cur) ? null : frameIds(S, [cur]); if (want) setTimeout(() => glideCam(S, want), 0); }
    const c = S.cam || { z: phone ? 1.04 : 1, x: 0, y: 0 };
    const B = boxes(S, L);
    const R = id => { const n = B.find(x => x.id === id); return n ? { x: r1(c.x + c.z * n.x), y: r1(c.y + c.z * n.y), w: r1(c.z * n.w), h: r1(c.z * n.h), side: n.side } : { x: 0, y: 0, w: 0, h: 0, side: 1 }; };
    const W = S.W || (phone ? 390 : 1200), H = S.H || (phone ? 608 : 772);
    const selX = I.by.get(S.sel), selNode = selX ? selX.n : null, lNode = L.nodes.find(n => n.id === S.sel);
    const tone = new Map((o.cards || []).map(x => [x.id, x.tone])), cardBy = new Map((o.cards || []).map(x => [x.id, x]));
    const selCards = selNode && selNode.cardIds ? selNode.cardIds : [], selWeak = selCards.filter(id => tone.get(id) === 'weak').length;
    const isNew = !data.root.label && !(data.root.children || []).length;
    const barOpen = !!selNode && !S.outline && !testing && !o.making && !isNew && !(phone && (S.cards || S.sheet));
    const te = art.raisedOf(t), dark = (() => { const m = /^#([0-9a-f]{6})$/i.exec(String(t.bg)); if (!m) return false; const v = parseInt(m[1], 16); return (v >> 16 & 255) * 0.299 + (v >> 8 & 255) * 0.587 + (v & 255) * 0.114 < 128; })();
    const PILL = (on, lab) => ({ label: lab, pressed: on ? 'true' : 'false', bg: on ? t.inv : 'transparent', fg: on ? t.invText : t.muted });
    const set = (k, v) => () => { S[k] = typeof v === 'function' ? v() : v; if (k === 'outline' || k === 'weak') keep(S); refresh(S); };
    const focusMap = () => setTimeout(() => S.wrap && S.wrap.focus({ preventScroll: true }), 0);
    // The Cards popover: the idea's cards (each can be unlinked), Link a card (the deck's best matches for its words, or for what's typed
    // in the search; no AI) and Study them.
    const qWords = S.query.trim();
    const linked = selCards.map(id => { const x = cardBy.get(id); return { front: x ? x.front : 'A card that isn’t in this deck', back: x ? x.back : '', weak: !!x && x.tone === 'weak', unlink: () => { apply(S, { op: 'unlink', id: S.sel, cardId: id }); refresh(S); } }; });
    const ranked = selNode ? maps.matchCards(qWords || selNode.label || title, o.cards || []).filter(id => !selCards.includes(id)) : [];
    const matches = (ranked.length || qWords ? ranked : (o.cards || []).map(x => x.id).filter(id => !selCards.includes(id))).slice(0, qWords ? 5 : 3).map(id => cardBy.get(id)).filter(Boolean)
      .map(x => ({ front: x.front, back: x.back, weak: x.tone === 'weak', link: () => { if (!editable) return; if (apply(S, { op: 'link', id: S.sel, cardId: x.id })) { S.query = ''; refresh(S); } else o.onToast && o.onToast('An idea holds up to 8 cards.'); } }));
    const sr = S.sel ? R(S.sel) : { x: 0, y: 0, w: 0, h: 0, side: 1 };
    const hang = selNode && ((selNode.cardIds || []).length || selNode.note) && lNode && !(lNode.kids > 0 && !lNode.folded) ? 44 * c.z : 0;
    const popX = sr.side >= 0 ? W - POPW - 40 : 40;
    const popY = Math.max(64, Math.min(H - 180 - POPH, sr.y + sr.h / 2 - 120));
    // The weak spots' legend (over every idea, not only the ones showing).
    const count = k => { let n = 0; for (const x of tn.values()) if (x === k) n++; return n; };
    const legend = [['Weak', 'weak', true], ['Getting there', 'getting'], ['Solid', 'solid'], ['Not studied', 'new']].map(([lab, k, dot]) => { const m = k === 'new' ? null : art.markOf(t, k); return { label: lab, n: String(count(k)), sw: m ? m.fill : t.bg, dot: !!dot, ring: m ? m.stroke : t.line }; });
    // Test me's choices.
    const hideK = S.hide || 'all', showK = S.show || (phone ? 'one' : 'map');
    const choice = (lab, on, off, go) => ({ label: lab, on: on ? 'true' : 'false', bg: on ? t.inv : te.surf, fg: on ? t.invText : off ? t.muted : t.text, off: off ? 'true' : 'false', mark: on, pick: off ? noop : go });
    const hide = [['all', 'Everything'], ['weak', 'Weak ones (' + weakN + ')'], ['branch', selNode ? 'This branch: ' + (selNode.label || title) : 'This branch']].map(([k, lab]) => choice(lab, hideK === k && !(k === 'branch' && !selNode), k === 'branch' && !selNode, () => { S.hide = k; refresh(S); }));
    const show = [['map', 'On the map'], ['one', 'One at a time']].map(([k, lab]) => choice(lab, showK === k, false, () => { S.show = k; refresh(S); }));
    // The test's progress, the reveal and the marks.
    const testN = T ? T.ids.length : 0, doneN = T ? T.marks.size : 0, missedN = T ? [...T.marks.values()].filter(x => x === 'missed').length : 0;
    const curX = cur ? I.by.get(cur) : null, shown = !!(T && T.shown);
    const crumbs = curX ? curX.path.concat(shown ? label(I, cur, title) : '?').join(' › ') : '';
    // The Done sheet.
    const D = S.done, missedIds = D ? D.missed.filter(id => I.by.has(id)) : [];
    // (the cards the review set opens: every card in the missed ideas' branches, page:<page>:<ids>, that is in the deck)
    const missedCards = missedIds.length ? maps.reviewIds(data, missedIds).filter(id => cardBy.has(id)) : [];
    const makeFrom = id => {
      const x = I.by.get(id); if (!x || !o.onMakeCard) return;
      const n = x.n, kids = (n.children || []).map(k => '- ' + (k.label || '')).join('\n');
      o.onMakeCard({ front: n.label || title, back: kids || n.note || '', nodeId: id, label: n.label || title });
    };
    // The outline: one row per idea, bound to its id (the ids themselves never show). It is a tree the keys work in.
    const rows = [];
    (function walk(n, level, setsize, pos) {
      const kids = Array.isArray(n.children) ? n.children : [], f = foldOf(S, I, n.id), ed = S.editing && S.editing.id === n.id && S.outline;
      rows.push({ id: n.id, label: n.label || title, level: String(level + 1), pad: (phone ? 12 : 16) + level * (phone ? 22 : 26) + 'px', root: level === 0, hasKids: kids.length > 0, open: kids.length > 0 && !f, turn: f ? '0deg' : '90deg', expanded: kids.length ? (f ? 'false' : 'true') : null,
        hasNote: !!n.note, note: n.note || '', cards: (n.cardIds || []).length ? plural(n.cardIds.length, 'card') : '', hasCards: !!(n.cardIds || []).length, folded: f, inside: f ? plural(kids.length, 'idea') + ' inside' : '',
        bg: n.id === S.sel ? t.surf : 'transparent', selected: n.id === S.sel ? 'true' : 'false', size: level === 0 ? (phone ? '20px' : '22px') : level === 1 ? '16px' : '15px', weight: level < 2 ? 600 : 400,
        setsize: String(setsize), posinset: String(pos), editing: !!ed, shows: !ed, field: ed ? S.editing.text : '',
        pick: e => { if (e && e.target && e.target.closest && e.target.closest('input')) return; if (S.editing && S.editing.id !== n.id) commitEdit(S); S.sel = n.id; S.focusTree = true; refresh(S); },
        toggle: e => { if (e) e.stopPropagation(); toggleFold(S, n.id, !!(e && e.altKey)); } });
      if (!f) kids.forEach((k, i) => walk(k, level + 1, kids.length, i + 1));
    })(data.root, 0, 1, 1);
    // (the outline's keys: the same as the map's, with ↑ ↓ going row by row and Tab indenting)
    const treeKey = e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      const k = e.key, mod = e.metaKey || e.ctrlKey, i = rows.findIndex(r => r.id === S.sel), r = rows[i];
      const done = () => { e.preventDefault(); e.stopPropagation(); S.focusTree = true; };
      if (mod && (k === 'z' || k === 'Z')) { done(); return restore(S, null, !e.shiftKey); }
      if (mod) return;
      if (!r) { if (/^Arrow/.test(k)) { done(); S.sel = rows[0].id; refresh(S); } return; }
      if (e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) { done(); return move(S, r.id, { op: 'move', id: r.id, by: k === 'ArrowUp' ? -1 : 1 }); }
      if (k === 'ArrowDown' || k === 'ArrowUp') { done(); const to = rows[i + (k === 'ArrowUp' ? -1 : 1)]; if (to) { S.sel = to.id; announce(S); refresh(S); } return; }
      if (k === 'ArrowRight' || k === 'ArrowLeft') { done(); const x = I.by.get(r.id); if (k === 'ArrowRight' && x.kids.length && foldOf(S, I, r.id)) return toggleFold(S, r.id); if (k === 'ArrowLeft' && x.kids.length && !foldOf(S, I, r.id)) return toggleFold(S, r.id); const to = k === 'ArrowLeft' ? x.parent : x.kids[0]; if (to) { S.sel = to; refresh(S); } return; }
      if (k === 'Enter') { done(); const x = I.by.get(r.id); return editable ? addIdea(S, x.level === 0 ? r.id : x.parent, x.level === 0 ? null : r.id) : null; }
      if (k === 'Tab') { done(); return move(S, r.id, { op: e.shiftKey ? 'outdent' : 'indent', id: r.id }); }
      if (k === 'F2') { done(); return beginEdit(S, r.id, { where: 'outline' }); }
      if (k === ' ') { done(); return toggleFold(S, r.id); }
      if (k === 'Delete' || k === 'Backspace') { done(); return remove(S, r.id); }
      if (k === 'Escape') { done(); S.sel = ''; return refresh(S); }
      if (k.length === 1 && !e.altKey && editable && /\S/.test(k)) { done(); return beginEdit(S, r.id, { where: 'outline', text: k }); }
    };
    const rowKey = e => {
      const k = e.key; if (e.isComposing) return;
      e.stopPropagation();
      const ed = S.editing; if (!ed) return;
      const x = I.by.get(ed.id);
      if (k === 'Enter') { e.preventDefault(); commitEdit(S, 'enter'); }
      else if (k === 'Tab') { e.preventDefault(); move(S, ed.id, { op: e.shiftKey ? 'outdent' : 'indent', id: ed.id }); }
      else if (k === 'Escape') { e.preventDefault(); cancelEdit(S); S.focusTree = true; }
      else if (k === 'Backspace' && !e.target.value && x && x.level > 0) {
        // (an empty row goes, and the row above takes the cursor)
        e.preventDefault(); const i = rows.findIndex(r => r.id === ed.id), above = rows[i - 1];
        S.editing = null; S.coalesce = false; apply(S, { op: 'remove', id: ed.id });
        if (above) beginEdit(S, above.id, { where: 'outline' }); else refresh(S);
      } else if (e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); move(S, ed.id, { op: 'move', id: ed.id, by: k === 'ArrowUp' ? -1 : 1 }); }
    };
    // (pasting an indented list into a row adds those ideas under it)
    const rowPaste = e => {
      const text = e.clipboardData && e.clipboardData.getData('text/plain');
      if (!text || !/\n/.test(text.trim()) || !S.editing) return;
      e.preventDefault();
      const at = S.editing.id; commitEdit(S);
      const got = maps.mindmapFromText(text, null, { title: 'x' }).data, add = (n, parent) => { const id = newId(index(S.data)); if (apply(S, { op: 'add', id, parent, label: n.label })) for (const k of n.children || []) add(k, id); };
      for (const n of got.root.label === 'x' ? got.root.children || [] : [got.root]) add(n, at);
      refresh(S);
    };
    const live = o.conflict ? { line: (o.conflict.by || 'Someone') + ' changed this map while you were editing (v' + o.conflict.theirs + '). Both are kept: yours is on top, in v' + o.conflict.mine + '.', conflict: true } : S.live;
    const rr = R(data.root.id);
    // (the line at the top stays clear of the Map / Outline and Weak spots buttons at the stage's top right: centred while it fits
    // beside them, wrapped onto two lines when it doesn't, and under them on a narrow stage)
    const room = (isNew ? 160 : 300) + 16, liveW = live ? Math.min(640, maps.units(live.line) * 7.4 + 150) : 0;
    const liveTop = W / 2 + liveW / 2 <= W - room || W - 2 * room >= 360 ? 16 : 64, liveMax = liveTop === 16 ? Math.min(640, W / 2 + liveW / 2 <= W - room ? 640 : W - 2 * room) : Math.min(640, W - 32);
    const tog = on => ({ bg: on ? (dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)') : t.surf, ring: on ? t.text : 'transparent', check: on, pressed: on ? 'true' : 'false' });
    const ideaMore = !!S.more && barOpen;
    const editingBar = S.editing && S.editing.where === 'bar';
    const field = S.editing && S.editing.id === S.sel ? S.editing.text : selNode ? selNode.label : '';
    // (only the stage itself: the page redraws by reusing elements, so a part of the Outline that once was the stage can still carry its
    // old ref; and the stage is set up again unless our own wrap is its child)
    const stageRef = el => { if (!el || !el.hasAttribute('data-sc-own')) return; if (S.el !== el || !S.wrap || S.wrap.parentNode !== el || !S.wrap.classList.contains('mv-wrap')) setup(S, el); size(S); if (!S.cam && S.W) S.cam = fitCam(S); paint(S);
      if (S.wrap && (!document.activeElement || document.activeElement === document.body) && !S.startEdit) S.wrap.focus({ preventScroll: true });
      // (a new map: its topic is typed into at once)
      if (S.startEdit && S.wrap) { S.startEdit = false; setTimeout(() => beginEdit(S, data.root.id, { where: 'map' }), 0); } if (S.focusTree) S.focusTree = false; };
    const treeRef = el => { if (el && S.focusTree) { S.focusTree = false; el.focus({ preventScroll: true }); } };
    const editRef = el => { if (el) el.onpaste = rowPaste; if (el && S.focusEdit) { S.focusEdit = false; el.focus(); const e = el.value.length; try { el.setSelectionRange(e, e); } catch (x) { /* not a text field */ } } };
    const zoomBy = f => () => { if (!S.cam) return; const z = S.cam.z * f, A = { x: W / 2, y: H / 2 }; const lo = phone ? 0.5 : 0.4, hi = phone ? 2.5 : 2, nz = Math.max(lo, Math.min(hi, z)); glideCam(S, { z: nz, x: A.x - (A.x - S.cam.x) * nz / S.cam.z, y: A.y - (A.y - S.cam.y) * nz / S.cam.z }); };
    return {
      on: true, page: { title, version: o.version, by: o.by, ai: !!o.ai, kind: 'mindmap' }, make: null, te,
      mapRef: stageRef, showMap: !S.outline || testing, showOutline: !!S.outline && !testing, stageW: '100%', stageH: '100%', mapLabel: 'Mind map: ' + (data.root.label || title),
      seg: [{ ...PILL(!S.outline, 'Map'), pick: () => { S.outline = false; keep(S); refresh(S); focusMap(); } }, { ...PILL(S.outline, 'Outline'), pick: () => { if (S.editing) commitEdit(S); S.outline = true; S.focusTree = true; keep(S); refresh(S); } }],
      hasWeak: !isNew, weakLabel: 'Weak spots · ' + weakN, weakPressed: S.weak ? 'true' : 'false', weakBg: S.weak ? t.inv : t.bg, weakFg: S.weak ? t.invText : t.text, toggleWeak: set('weak', () => !S.weak),
      weakTog: tog(S.weak), outlineTog: tog(S.outline), toggleOutline: () => { if (S.editing) commitEdit(S); S.outline = !S.outline; S.focusTree = S.outline; keep(S); refresh(S); }, outlinePressed: S.outline ? 'true' : 'false',
      zoom: Math.round(c.z * 100) + '%', showZoom: !S.outline && !(D && !phone), noop, hasTest: !isNew, testBg: S.sheet ? t.surf : t.inv, testFg: S.sheet ? t.text : t.invText, testExpanded: S.sheet ? 'true' : 'false',
      openTest: () => { if (S.test) return endTest(S); S.sheet = !S.sheet; S.cards = false; S.more = false; refresh(S); },
      zoomIn: zoomBy(1.25), zoomOut: zoomBy(0.8), fit: () => glideCam(S, fitCam(S)),
      addIdea: () => { const at = S.sel || data.root.id, x = I.by.get(at); if (!x) return; addIdea(S, at, null); },
      treeKey, treeRef, editRef, editKey: rowKey, editPaste: rowPaste, editInput: e => typed(S, e && e.target ? e.target.value : ''), editBlur: () => setTimeout(() => { if (S.editing && S.editing.where === 'outline' && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('[role="tree"] input'))) commitEdit(S); }, 0),
      // the idea bar, and its ⋯ (Start folded, Test this branch, Delete)
      bar: { open: barOpen, label: selNode ? selNode.label || title : '', hasNote: !!(selNode && selNode.note) && !S.note, note: selNode && selNode.note ? selNode.note : '', addNote: !(selNode && selNode.note) && editable && !S.note, noteEditing: !!S.note && editable,
        cardsLine: selCards.length ? plural(selCards.length, 'card') + (selWeak ? ' · ' + selWeak + ' weak' : '') : 'No cards yet', cardsWeak: selWeak > 0,
        canFold: !!lNode && lNode.kids > 0, foldLabel: lNode && lNode.folded ? 'Unfold' : 'Fold', keyboard: phone && !!S.editing, idle: !(phone && S.editing), field, editable, readOnly: !editable,
        openCards: () => { S.cards = !S.cards; S.more = false; S.query = ''; if (S.cards && !phone) S.camTo = 'cards'; refresh(S); }, deselect: () => { if (S.editing) commitEdit(S); S.sel = ''; S.more = false; refresh(S); }, more: () => { S.more = !S.more; refresh(S); }, moreExpanded: ideaMore ? 'true' : 'false',
        addIdea: () => S.sel && addIdea(S, S.sel, null), makeCard: () => S.sel && makeFrom(S.sel), fold: () => S.sel && toggleFold(S, S.sel, false),
        setLabel: e => { const v = e && e.target ? e.target.value : ''; if (!S.editing || S.editing.id !== S.sel) { S.editing = { id: S.sel, text: v, was: selNode ? selNode.label || '' : '', fresh: false, where: 'bar' }; S.coalesce = false; } typed(S, v); },
        labelKey: e => { if (e.isComposing) return; if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); if (e.key === 'Escape' && editingBar) cancelEdit(S); else commitEdit(S); focusMap(); } },
        labelBlur: () => { if (S.editing && S.editing.where === 'bar') commitEdit(S); },
        editNote: () => { if (!editable) return; S.note = true; S.focusNote = true; refresh(S); },
        setNote: e => { const v = e && e.target ? e.target.value : ''; if (!S.noting) { S.noting = true; S.coalesce = false; } apply(S, { op: 'set', id: S.sel, note: v }, { quiet: true }); refresh(S); },
        noteBlur: () => { S.note = false; S.noting = false; S.coalesce = false; release(S); refresh(S); },
        noteRef: el => { if (el && S.focusNote) { S.focusNote = false; el.focus(); const e = el.value.length; try { el.setSelectionRange(e, e); } catch (x) { /* not a text field */ } } },
        keyOutdent: () => S.sel && move(S, S.sel, { op: 'outdent', id: S.sel }), keyIndent: () => S.sel && move(S, S.sel, { op: 'indent', id: S.sel }),
        keyUp: () => S.sel && move(S, S.sel, { op: 'move', id: S.sel, by: -1 }), keyDown: () => S.sel && move(S, S.sel, { op: 'move', id: S.sel, by: 1 }), keyDone: () => { commitEdit(S); } },
      ideaMenu: { open: ideaMore, title: selNode ? selNode.label || title : '', startsFolded: !!(selNode && selNode.folded), foldedAttr: selNode && selNode.folded ? 'true' : 'false', canFold: !!lNode && lNode.kids > 0, close: () => { S.more = false; refresh(S); },
        testBranch: () => { S.more = false; S.sheet = true; S.hide = 'branch'; refresh(S); },
        toggleFolded: () => { if (!editable || !selNode) return; S.more = false; apply(S, { op: 'set', id: S.sel, folded: !selNode.folded }); refresh(S); },
        remove: () => { S.more = false; remove(S, S.sel); }, canRemove: editable && !!selX && selX.level > 0, undo: () => { S.more = false; restore(S, null, true); } },
      fresh: { open: isNew && editable && !testing, x: r1(Math.max(16, rr.x + rr.w / 2 - 230)) + 'px', y: r1(rr.y + rr.h + 22) + 'px', fromCards: () => o.onFromCards && o.onFromCards(), aiLeft: o.aiLeft || 'Lucida AI' },
      cardsPop: { open: !!selNode && S.cards && !testing, x: r1(popX) + 'px', y: r1(popY) + 'px', title: selNode ? selNode.label || title : '', linked, hasLinked: linked.length > 0, matches, none: !matches.length, canStudy: selCards.length > 0, canLink: editable,
        matchLabel: qWords ? 'Cards with those words' : 'Best matches in ' + (o.deckName || 'this deck'), studyLabel: selCards.length === 1 ? 'Study this card' : 'Study these ' + selCards.length + ' cards',
        search: e => { S.query = e && e.target ? e.target.value : ''; refresh(S); }, study: () => o.onStudy && o.onStudy('page:' + o.key + ':' + S.sel), close: () => { S.cards = false; refresh(S); focusMap(); } },
      legend: { open: S.weak && !S.outline && !testing, rows: legend, test: () => startTest(S, 'weak', S.show) },
      sheet: { open: !!S.sheet && !testing, hide, show, start: () => startTest(S, hideK === 'branch' && !selNode ? 'all' : hideK, showK), close: () => { S.sheet = false; refresh(S); } },
      progress: { line: doneN + ' of ' + testN + ' · ' + missedN + ' missed' },
      endTest: () => endTest(S),
      mark: { missed: () => mark(S, false), knew: () => mark(S, true) },
      markBar: { open: testing && T.mode === 'map' && !phone, label: shown ? label(I, cur, title) : crumbs, shown, hidden: !shown, show: () => reveal(S), hint: shown ? 'Did you know it? 1 is Missed, 2 Knew it.' : 'Say it to yourself, then show it (Space, or press it).' },
      one: { open: testing && T.mode === 'one', crumbs, shown, hidden: !shown, show: () => reveal(S), again: () => mark(S, false) },
      testBar: { open: phone && testing && T.mode === 'map' },
      done: { open: !!D, title: 'You knew ' + (D ? D.n - D.missed.length : 0) + ' of ' + (D ? D.n : 0), hasMissed: missedIds.length > 0,
        missed: missedIds.map(id => { const x = I.by.get(id); return { label: x.n.label || title, path: x.path.join(' › '), noCard: editable && !(x.n.cardIds || []).length, addCard: () => { S.done = null; refresh(S); makeFrom(id); } }; }),
        again: 'Test the ' + missedIds.length + ' again', retest: () => { const ids = missedIds.slice(); S.done = null; startTest(S, ids, S.show); }, hasAgain: missedIds.length > 0,
        study: 'Study their ' + plural(missedCards.length, 'card'), hasStudy: missedCards.length > 0, hasNone: !missedIds.length, studyCards: () => { S.done = null; o.onStudy && o.onStudy('page:' + o.key + ':' + missedIds.join(',')); },
        close: () => { S.done = null; refresh(S); focusMap(); } },
      toast: { open: !!S.toast && !testing, bottom: barOpen ? '168px' : '16px', line: S.toast ? S.toast.line : '', undo: () => { S.toast = null; clearTimeout(S.toastT); restore(S, null, true); focusMap(); }, close: () => { S.toast = null; clearTimeout(S.toastT); refresh(S); } },
      live: { open: !!live && !S.liveOff, line: live ? live.line : '', top: liveTop + 'px', maxW: Math.round(liveMax) + 'px', dismiss: () => { if (o.conflict && o.clearConflict) o.clearConflict(); S.live = null; refresh(S); }, versions: () => o.onVersions && o.onVersions() },
      rows, foldAll: L.nodes.some(n => n.folded) ? 'Unfold all' : 'Fold to main ideas', foldAllDo: () => { o.onDone && o.onDone(); foldAll(S); }, makeAgain: () => { o.onDone && o.onDone(); o.onFromCards && o.onFromCards(); },
      bottom: phone && !barOpen && !testing, kbPanel: dark ? te.surf : t.surf2, kbKey: dark ? te.surf2 : t.bg,
      ideas: I.order.length, weak: weakN, editable, editing: S.editing ? S.editing.id : '',
      check: { overlaps: 0, clashes: 0 }
    };
  }
  // The page closed: what was open over it goes (the folds, the overlay and the camera stay).
  function leave(key) {
    const S = views.get(key); if (!S) return;
    if (S.editing) commitEdit(S);
    if (S.noting) { S.noting = false; release(S); }
    if (S.test) endTest(S);
    if (S.ro) S.ro.disconnect();
    clearTimeout(S.toastT);
    Object.assign(S, { toast: null, sel: '', cards: false, sheet: false, more: false, note: false, done: null, test: null, live: null, el: null, wrap: null, svg: null, input: null, sig: '', fresh: true, W: 0, H: 0, focus: '', camChecked: false, camBefore: null });
  }
  // A card made from an idea (+ Card) is linked to it, as one version.
  function link(key, id, cardId, summary) {
    const S = views.get(key); if (!S || !S.data) return;
    S.coalesce = false;
    apply(S, { op: 'link', id, cardId }, { summary });
    refresh(S);
  }
  return { model, leave, link, tones };
}
export default makeMapView;
