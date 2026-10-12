// The web app's Mind map view (web/mapview.js), run in this process on a pretend page (a few lines of DOM below, no browser), with the
// approved sample map (design/maps.mjs MAP_SAMPLE) drawn by the boards' own drawing:
//   - the stage after the Outline gives it back is the map's again, at the stage's size (a part of the Outline that still carries the
//     stage's old ref is not taken for it);
//   - a double-click on an idea starts writing in it (the wrap holds the pointer, so the event's own target is the wrap);
//   - while a label is typed nothing is saved (`hold`), and closing the field saves it once; Esc on a new idea leaves the map as it was;
//   - a blank map's topic, once named, names the page;
//   - the Done sheet's "Study their N cards" counts the cards the review set opens (every card in the missed ideas' branches);
//   - Test me on the map never opens below 80%; a delete's toast has Undo; the Cards popover sits at the stage's right edge;
//   - a remembered camera that no longer shows the map is fitted again; the line about another writer stays clear of the top-right
//     buttons.
//   node tests/mapview.mjs            (prints each failure, then "mapview: N passed, M failed"; exits 1 on a failure)
import maps from '../web/maps.js';
import { makeMapView } from '../web/mapview.js';
import { mapArt, MAP_SAMPLE, MAP_CARDS } from '../design/maps.mjs';

let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++;
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? '  →  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); }
}
const J = x => JSON.stringify(x);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- a pretend page: just what the view touches ----------
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.attrs = {}; this.style = {}; this.children = []; this.parentNode = null; this.on = {}; this.className = ''; this.w = 0; this.h = 0; this.value = ''; }
  get classList() { return { contains: c => this.className.split(/\s+/).includes(c) }; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  get firstChild() { return this.children[0] || null; }
  get firstElementChild() { return this.children[0] || null; }
  get isConnected() { return true; }
  get clientWidth() { return this.w; }
  get clientHeight() { return this.h; }
  set textContent(v) { for (const c of this.children) c.parentNode = null; this.children = []; }
  append(...k) { for (const c of k) this.appendChild(c); }
  appendChild(c) { if (c.parentNode) c.parentNode.children = c.parentNode.children.filter(x => x !== c); c.parentNode = this; this.children.push(c); return c; }
  insertBefore(c, ref) { if (!ref) return this.appendChild(c); c.parentNode = this; this.children.splice(this.children.indexOf(ref), 0, c); return c; }
  replaceChild(c, old) { const i = this.children.indexOf(old); old.parentNode = null; c.parentNode = this; this.children[i] = c; return old; }
  contains(x) { for (let n = x; n; n = n.parentNode) if (n === this) return true; return false; }
  addEventListener(t, fn) { (this.on[t] = this.on[t] || []).push(fn); }
  fire(t, e) { for (const fn of this.on[t] || []) fn({ preventDefault() {}, stopPropagation() {}, target: this, ...e }); }
  focus() { globalThis.document.activeElement = this; }
  setPointerCapture() {}
  setSelectionRange() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.w, height: this.h }; }
  querySelectorAll() { return []; }
  closest(sel) { return sel === '[data-id]' && this.attrs['data-id'] ? this : null; }
}
class Svg extends El { constructor(html) { super('svg'); this.html = html; this.children = [new El('g')]; } }
const body = new El('body');
globalThis.document = {
  activeElement: body, body,
  createElement: tag => tag === 'template' ? { set innerHTML(h) { this.content = { firstElementChild: new Svg(h) }; } } : new El(tag)
};
globalThis.window = { addEventListener() {} };
const ros = [];
globalThis.ResizeObserver = class { constructor(fn) { this.fn = fn; ros.push(this); } observe(el) { this.el = el; } disconnect() { this.el = null; } };
globalThis.cancelAnimationFrame = () => {};
globalThis.matchMedia = () => ({ matches: true });   // (Reduce Motion: the camera moves at once)
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
const fireRO = () => { for (const r of ros) if (r.el) r.fn([]); };

const T = { bg: '#ffffff', surf: '#f2f2f2', surf2: '#e6e6e6', line: '#e0e0e0', text: '#000000', muted: '#6b6b6b', inv: '#000000', invText: '#ffffff', again: '#d92d20', againTint: '#fde8e7', hardTint: '#fff4d6', goodTint: '#e3f6e8' };
const svgSize = el => { const w = el.children.find(c => c.classList.contains('mv-wrap')); const s = w && w.children.find(c => c instanceof Svg); const m = s && /<svg[^>]*\swidth="(\d+)"[^>]*\sheight="(\d+)"/.exec(s.html); return m ? [+m[1], +m[2]] : null; };

// One page of the view: its values (re-made on every rerender, as the board does), and the edits it handed on.
function open(key, over = {}) {
  const V = over.view || makeMapView(maps, mapArt), edits = [];
  const P = { key, mp: null, edits, V };
  const o = { key, data: JSON.parse(J(MAP_SAMPLE.data)), version: 3, by: 'You', title: MAP_SAMPLE.title, editable: true, phone: false, t: T, cards: MAP_CARDS, marks: {}, deckName: 'Cell Biology',
    conflict: null, clearConflict() {}, query: {}, aiLeft: 'Lucida AI', rerender: () => { P.mp = V.model(o); },
    // (as the board does: what the view hands on is the page's data from then on, web/pagesclient.js)
    onEdit: (data, summary, own, x) => { o.data = data; if (x && x.title) o.title = x.title; edits.push({ data, summary, own, hold: !!(x && x.hold), title: (x && x.title) || '' }); }, onMakeCard() {}, onStudy() {}, onTest() {}, onToast() {}, onVersions() {}, onFromCards() {}, onDone() {}, ...over };
  P.o = o;
  P.mp = V.model(o);
  return P;
}
function stage(P, w = 1200, h = 684) { const el = new El('div'); el.setAttribute('data-sc-own', ''); el.w = w; el.h = h; P.mp.mapRef(el); P.mp = P.V.model(P.o); return el; }
const wrapOf = el => el.children.find(c => c.classList.contains('mv-wrap'));
const g = id => { const e = new El('g'); e.setAttribute('data-id', id); return e; };
function press(el, id, n = 1) { const w = wrapOf(el); for (let i = 0; i < n; i++) { w.fire('pointerdown', { target: id ? g(id) : w, pointerId: 1, button: 0, pointerType: 'mouse', clientX: 10, clientY: 10 }); w.fire('pointerup', { type: 'pointerup', target: w, pointerId: 1, clientX: 10, clientY: 10 }); } }
const inputOf = el => wrapOf(el).children.find(c => c.tagName === 'INPUT');
const ids = d => { const out = []; (function w(n) { out.push(n.id + ':' + n.label); (n.children || []).forEach(w); })(d.root); return out; };

// ---------- the stage, after the Outline ----------
{
  const P = open('pg-outline'), A = stage(P);
  check('the map is drawn at the stage size', J(svgSize(A)) === J([1200, 684]), svgSize(A));
  // (Outline: the page morphs the stage into the Outline's box, and our wrap into its tree, 760 wide and short)
  const old = wrapOf(A);
  A.removeAttribute('data-sc-own'); old.className = ''; old.w = 760; old.h = 152; old.setAttribute('data-ref', '7');
  fireRO();
  // (Map again: the box is the stage once more, still holding the old wrap; both it and the old wrap are handed the stage's ref)
  A.setAttribute('data-sc-own', '');
  P.mp.mapRef(A); P.mp.mapRef(old); P.mp = P.V.model(P.o);
  fireRO();
  check('back on the map, it is drawn at the stage size again', J(svgSize(A)) === J([1200, 684]), svgSize(A));
  check('the stage holds one wrap, the map’s', A.children.filter(c => c.classList.contains('mv-wrap')).length === 1 && !A.children.includes(old));
}

// ---------- a double-click writes in the idea ----------
{
  const P = open('pg-dbl'), A = stage(P);
  press(A, 'mito', 2);
  wrapOf(A).fire('dblclick', { target: wrapOf(A) });   // (the wrap holds the pointer: the event is its own)
  check('a double-click on an idea starts writing in it', P.mp.editing === 'mito', P.mp.editing);
  check('a double-click never saves', P.edits.length === 0, P.edits.length);
}

// ---------- typing is held until the field closes ----------
{
  const P = open('pg-hold'), A = stage(P), before = J(P.o.data);
  press(A, 'lysosomes');
  P.mp.bar.addIdea();
  const inp = inputOf(A);
  for (const v of ['A', 'Aut', 'Autoph']) { inp.value = v; inp.fire('input', {}); }
  check('a new idea and its typing are held', P.edits.length > 0 && P.edits.every(e => e.hold), P.edits.map(e => e.hold));
  inp.fire('keydown', { key: 'Escape' });
  const last = P.edits[P.edits.length - 1];
  check('Esc on a new idea hands on the map as it was, not held', !last.hold && J(last.data) === before, ids(last.data).slice(-3));
  P.edits.length = 0;
  press(A, 'lysosomes');
  P.mp.bar.addIdea();
  inp.value = 'Autophagy'; inp.fire('input', {});
  inp.fire('keydown', { key: 'Enter' });   // (done, and a sibling next)
  const sent = P.edits.filter(e => !e.hold);
  check('closing the field hands on the typed label once', sent.length === 1 && ids(sent[0].data).includes(sent[0].data.root.children.find(c => c.id === 'lysosomes').children.slice(-1)[0].id + ':Autophagy'), sent.map(e => ids(e.data).slice(-2)));
  check('the sibling after Enter is held again', P.edits[P.edits.length - 1].hold === true);
}

// ---------- a blank map's topic names the page ----------
{
  const P = open('pg-blank', { data: { root: { id: 'r1', label: '' } }, title: '', version: 1 }), A = stage(P);
  P.mp.rows[0].pick();
  P.mp = P.V.model(P.o);
  P.mp.bar.setLabel({ target: { value: 'Membrane transport' } });
  P.mp.bar.labelBlur();
  const last = P.edits[P.edits.length - 1];
  check('the topic, once named, names a page with no title', last && last.title === 'Membrane transport' && !last.hold, last && { title: last.title, hold: last.hold });
  const Q = open('pg-titled', { data: { root: { id: 'r1', label: '' } }, title: 'Already named', version: 1 }); stage(Q);
  Q.mp.rows[0].pick(); Q.mp = Q.V.model(Q.o);
  Q.mp.bar.setLabel({ target: { value: 'Topic' } }); Q.mp.bar.labelBlur();
  check('a page with a title keeps it', Q.edits.every(e => !e.title));
}

// ---------- Test me ----------
{
  const P = open('pg-test'), A = stage(P);
  P.mp.sheet.start();
  await sleep(5);
  check('Test me on the map opens at 80% or more', parseInt(P.mp.zoom, 10) >= 80, P.mp.zoom);
  // nucleus missed, its three knew, mito missed, then End
  P.mp.mark.missed(); P.mp.mark.knew(); P.mp.mark.knew(); P.mp.mark.knew(); P.mp.mark.missed();
  P.mp.endTest();
  const want = maps.reviewIds(P.o.data, ['nucleus', 'mito']).filter(id => MAP_CARDS.some(c => c.id === id)).length;
  check('the Done sheet counts the cards its review set opens', P.mp.done.open && P.mp.done.study === 'Study their ' + want + ' cards' && want === 4, P.mp.done.study);
  check('a test never saves the map', P.edits.length === 0, P.edits.length);
}

// ---------- a delete's toast has Undo; the Cards popover is at the right edge ----------
{
  const P = open('pg-del'), A = stage(P), before = J(P.o.data);
  press(A, 'mito');
  P.mp.ideaMenu.remove();
  check('a delete shows the map’s toast', P.mp.toast.open && /Mitochondria/.test(P.mp.toast.line), P.mp.toast);
  P.mp.toast.undo();
  const last = P.edits[P.edits.length - 1];
  check('its Undo puts the idea back', J(last.data) === before && !P.mp.toast.open);
  press(A, 'etc');
  P.mp.bar.openCards();
  check('the Cards popover sits at the stage’s right edge', P.mp.cardsPop.open && P.mp.cardsPop.x === (1200 - 360 - 40) + 'px', P.mp.cardsPop.x);
}

// ---------- a remembered camera ----------
{
  mem.set('lucida.maps.view', J({ 'pg-cam': { folds: {}, outline: false, weak: false, cam: { z: 1.7, x: -3000, y: -3000 } } }));
  const P = open('pg-cam'); stage(P);
  check('a remembered camera that shows nothing of the map is fitted again', P.mp.zoom !== '170%', P.mp.zoom);
  mem.set('lucida.maps.view', J({ 'pg-cam2': { folds: {}, outline: false, weak: false, cam: { z: 1, x: 40, y: 120 } } }));
  const Q = open('pg-cam2'); stage(Q);
  const R = open('pg-cam3'); stage(R);
  check('a remembered camera that shows the map is kept', Q.mp.zoom === '100%', Q.mp.zoom);
}

// ---------- the line about another writer ----------
{
  const P = open('pg-live', { conflict: { by: 'Claude', theirs: 12, mine: 13 } }); stage(P);
  const room = 300 + 16, max = parseInt(P.mp.live.maxW, 10);
  check('the line is clear of the top-right buttons', P.mp.live.open && P.mp.live.top === '16px' && 1200 / 2 + max / 2 <= 1200 - room, P.mp.live);
  const N = open('pg-live-narrow', { conflict: { by: 'Claude', theirs: 12, mine: 13 } }); stage(N, 700, 600);
  check('on a narrow stage it goes under them', N.mp.live.top === '64px', N.mp.live);
}

console.log('mapview: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
