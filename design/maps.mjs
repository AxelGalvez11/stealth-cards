// Mind map pages (step 4a of "Recall Maps", design/specs/step4-maps.md §10): the sample the boards draw, the states of a Mind map
// page, the MapLayouts gallery and the Motion board's map samples. Every map here is laid out by the real engine, web/maps.js
// (the one the server, the web app and the iPhone use), never drawn by hand: the boards get it as `this.maps()` (build.mjs puts
// MAPS_METHOD in a board whose logic calls it), and draw its numbers with `this.mapArt()` below (boxes, links, folds, the weak-spots
// tints, Test me's hidden ideas and marks, rings), in the theme's own colors. The web app's real map view (web/mapview.js) comes
// later and draws the same numbers the same way.
//   - WebPage / PhonePage (design/pages.mjs) switch on the page's kind: a Mind map shows its stage here (MINDMAP_VIEWS are its states
//     on the canvas); a kind the app can't show yet shows "Needs an update", never an empty Note.
//   - NoteWeb / NotePhone show a map inside a Note (previewOf), PagesWeb / PagesPhone the New mind map step.
//   - MapLayouts is the gallery of layouts the owner approves before any app work (real engine output for every fixture).
// The Diagram (step 4b) adds its own views, samples and gallery states here later.
import maps from '../web/maps.js';
import { readFileSync } from 'node:fs';
import { MOTION, EASE } from './motion.mjs';

export const MINDMAP_VIEWS = ['Mind map', 'Mind map · an idea selected', 'Mind map · writing an idea', 'Mind map · cards of an idea',
  'Mind map · make a card', 'Mind map · outline', 'Mind map · weak spots', 'Mind map · test me', 'Mind map · testing',
  'Mind map · one at a time', 'Mind map · test done', 'Mind map · changed by your AI', 'Mind map · new'];
export const MAP_LAYOUT_VIEWS = ['Mind maps', 'Stress'];

// ---------- the sample (§10.1): the deck Cell Biology, its Mind map ps2 "The cell at a glance" (v3, by Claude) ----------
const idea = (id, label, children, more = {}) => ({ id, label, ...more, ...(children ? { children } : {}) });
const CELL = { root: idea('cell', 'The cell', [
  idea('nucleus', 'Nucleus', [idea('dna', 'Holds the DNA'), idea('nucleolus', 'Nucleolus makes ribosomes', null, { cardIds: ['cm3'] }), idea('pores', 'Nuclear pores let mRNA out')]),
  idea('mito', 'Mitochondria', [idea('krebs', 'Krebs cycle in the matrix', null, { cardIds: ['c1'] }), idea('etc', 'Electron transport on the inner membrane', null, { cardIds: ['cm2'] }),
    idea('cristae', 'Cristae fold the inner membrane'), idea('mtdna', 'Has its own DNA')], { note: 'Most ATP is made on the inner membrane, by ATP synthase.', cardIds: ['cm1'] }),
  idea('er', 'ER and Golgi', [idea('rough-er', 'Rough ER makes proteins', null, { cardIds: ['cm5'] }), idea('smooth-er', 'Smooth ER makes lipids'), idea('golgi', 'Golgi packs and ships')]),
  idea('membrane', 'Cell membrane', [idea('bilayer', 'Phospholipid bilayer'), idea('pumps', 'Channels and pumps', null, { cardIds: ['cm4'] }), idea('mosaic', 'Fluid mosaic')]),
  idea('ribosomes', 'Ribosomes', [idea('make-proteins', 'Make proteins'), idea('free-or-rough', 'Free or on the rough ER')]),
  idea('lysosomes', 'Lysosomes', [idea('waste', 'Break down waste')])]) };
// The deck's cards, with each one's tone as sched.toneOf gives it (new, weak, getting there, solid).
export const MAP_CARDS = [
  { id: 'c1', front: 'Where does the Krebs cycle happen?', back: 'The mitochondrial matrix', tone: 'weak' },
  { id: 'cm1', front: 'Which organelle makes most of the ATP?', back: 'The mitochondrion', tone: 'solid' },
  { id: 'cm2', front: 'Where does electron transport happen?', back: 'The inner mitochondrial membrane', tone: 'weak' },
  { id: 'cm3', front: 'What does the nucleolus make?', back: 'Ribosomes', tone: 'getting' },
  { id: 'cm4', front: 'What moves ions against their gradient?', back: 'Pumps', tone: 'solid' },
  { id: 'cm5', front: 'Which ER makes proteins?', back: 'The rough ER', tone: 'new' },
  { id: 'cm6', front: 'What does cyanide block?', back: 'Complex IV', tone: 'weak' },
  { id: 'cm7', front: 'What is the last electron acceptor?', back: 'Oxygen', tone: 'solid' }
];
// Yesterday's Test me marks ([knew, missed, last (1 knew, 0 missed), at]): Electron transport missed twice, Smooth ER once, the
// Nucleolus once (known since); 14 others known. Five ideas were never tested.
const YESTERDAY = Date.UTC(2026, 9, 10, 18);
const MARKS = Object.fromEntries([
  ...['nucleus', 'dna', 'pores', 'mito', 'krebs', 'cristae', 'mtdna', 'er', 'membrane', 'bilayer', 'pumps', 'ribosomes', 'make-proteins', 'lysosomes'].map(id => [id, [1, 0, 1, YESTERDAY]]),
  ['etc', [0, 2, 0, YESTERDAY]], ['smooth-er', [0, 1, 0, YESTERDAY]], ['nucleolus', [1, 1, 1, YESTERDAY]]]);
// What Claude added while the page was open (v4): a new main idea and three under it.
const CHANGED = JSON.parse(JSON.stringify(CELL));
CHANGED.root.children.push(idea('cytoskeleton', 'Cytoskeleton', [idea('microtubules', 'Microtubules move things'), idea('actin', 'Actin filaments'), idea('shape', 'Holds the cell’s shape')]));
export const MINDMAP_SAMPLE = maps.normalize('mindmap', CELL).data;
export const MAP_SAMPLE = { title: 'The cell at a glance', deck: 'Cell Biology', data: MINDMAP_SAMPLE, changed: maps.normalize('mindmap', CHANGED).data, cards: MAP_CARDS, marks: MARKS };
// The same, as JSON for the iPhone's Generated (design/to-ios.mjs).
export const MAP_SAMPLE_JSON = JSON.stringify(MAP_SAMPLE);

// ---------- the gallery's fixtures (MapLayouts; design/check.mjs lays every one out and looks for overlapping boxes) ----------
const PHYS = ['Heart', 'Lungs', 'Kidneys', 'Liver', 'Brain', 'Muscles', 'Bones', 'Blood', 'Skin', 'Gut'];
const PARTS = ['How it is built', 'What it does', 'How it is controlled', 'When it goes wrong'];
// 200 ideas: a topic, 10 main ideas, 4 under each, and 3 or 4 facts under those.
function physiology() {
  let n = 1;
  const root = idea('body', 'Human physiology', []);
  PHYS.forEach((m, i) => {
    const main = idea('m' + i, m, []); root.children.push(main); n++;
    PARTS.forEach((p, j) => {
      const sub = idea('m' + i + 's' + j, p, []); main.children.push(sub); n++;
      for (let k = 0; k < 4 && n < 200; k++) { if (k === 3 && (i + j) % 4 === 0) break; sub.children.push(idea('m' + i + 's' + j + 'f' + k, ['A first fact', 'A second fact', 'One more fact', 'A last fact'][k] + ' about the ' + m.toLowerCase())); n++; }
    });
  });
  return maps.normalize('mindmap', { root }).data;
}
const fold2 = data => { const f = {}; const walk = (x, l) => { if (l === 2 && (x.children || []).length) f[x.id] = true; for (const c of x.children || []) walk(c, l + 1); }; walk(data.root, 0); return f; };
// A lopsided map: one branch 6 levels deep, the others short.
const LOPSIDED = maps.normalize('mindmap', { root: idea('evo', 'Evolution', [
  idea('sel', 'Natural selection', [idea('var', 'Variation', [idea('mut', 'Mutation', [idea('point', 'Point mutations', [idea('sub', 'Substitutions', [idea('silent', 'Silent'), idea('missense', 'Missense'), idea('nonsense', 'Nonsense')]), idea('indel', 'Insertions and deletions')]), idea('chrom', 'Chromosome changes')]), idea('recomb', 'Recombination')]), idea('fit', 'Fitness')]),
  idea('drift', 'Genetic drift'), idea('flow', 'Gene flow', [idea('mig', 'Migration')])]) }).data;
// Japanese and emoji labels (wide characters count 1.8 units, emoji 2: §4.2).
const WIDE = maps.normalize('mindmap', { root: idea('saibou', '細胞のつくり 🧬', [
  idea('kaku', '核 🧠', [idea('dna-ja', 'DNAをしまう'), idea('jin', '核小体はリボソームをつくる')]),
  idea('mito-ja', 'ミトコンドリア ⚡️', [idea('atp', 'ATPの大部分をつくる 🔋'), idea('kure', 'クエン酸回路はマトリックスで')]),
  idea('maku', '細胞膜', [idea('lipid', 'リン脂質の二重層'), idea('pump-ja', 'ポンプとチャネル 🚪')]),
  idea('ribo-ja', 'リボソーム 🧩', [idea('tanpaku', 'タンパク質を合成する')])]) }).data;
// Labels at the 80 code point cap (cut at a word, with an ellipsis, as a writer would end one there).
const L80 = s => { const full = s + ' and then some more words to reach the cap'; if (full.length <= 80) return full; const cut = full.slice(0, 79); return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:]+$/, '') + '…'; };
const LONG = maps.normalize('mindmap', { root: idea('long', L80('A topic whose name runs on far longer than any topic should, to test wrapping'), [
  idea('l1', L80('The first main idea is written as a full sentence, the way an agent might write it'), [idea('l1a', L80('A detail under it that is also far too long for one line in a box of 220'))]),
  idea('l2', L80('A second main idea, just as long, so both sides of the topic carry long boxes'), [idea('l2a', 'Short')]),
  idea('l3', L80('Pneumonoultramicroscopicsilicovolcanoconiosis is one word that is too long to fit')),
  idea('l4', 'Short main idea', [idea('l4a', L80('Another long leaf, to see how the columns line up when one box is wide'))])]) }).data;
// 20 children under one idea (the cap), each a short leaf.
const WIDEST = maps.normalize('mindmap', { root: idea('aa', 'Amino acids', [idea('ess', 'Essential', ['Histidine', 'Isoleucine', 'Leucine', 'Lysine', 'Methionine', 'Phenylalanine', 'Threonine', 'Tryptophan', 'Valine'].map((x, i) => idea('e' + i, x))),
  idea('non', 'Non-essential', ['Alanine', 'Arginine', 'Asparagine', 'Aspartate', 'Cysteine', 'Glutamate', 'Glutamine', 'Glycine', 'Proline', 'Serine', 'Tyrosine', 'Selenocysteine', 'Pyrrolysine', 'Ornithine', 'Citrulline', 'Taurine', 'Carnitine', 'Hydroxyproline', 'Hydroxylysine', 'GABA'].map((x, i) => idea('n' + i, x))),
  idea('side', 'By side chain', [idea('pol', 'Polar'), idea('nonpol', 'Nonpolar'), idea('acid', 'Acidic'), idea('base', 'Basic')])]) }).data;
const BIG = physiology();
// The gallery's cards: [title, data, layout options, columns it spans, drawing height].
export const MAP_FIXTURES = {
  'Mind maps': [
    ['The cell · topic in the middle (a computer, an iPad, a phone held sideways)', MINDMAP_SAMPLE, { side: 'both', folds: { er: true } }, 2, 470],
    ['The cell · topic at the left (a phone held upright)', MINDMAP_SAMPLE, { side: 'right', folds: { er: true } }, 1, 560],
    ['200 ideas, folded to level 2 (it opens this way the first time)', BIG, { side: 'both', folds: fold2(BIG) }, 1, 560],
    ['A lopsided map, 6 levels deep', LOPSIDED, { side: 'both' }, 2, 400],
    ['Japanese and emoji labels', WIDE, { side: 'both' }, 2, 300],
    ['Labels at the 80-character cap', LONG, { side: 'both' }, 2, 300]
  ],
  Stress: [
    ['200 ideas, all open, topic in the middle', BIG, { side: 'both' }, 2, 900],
    ['200 ideas, all open, topic at the left (its top, at 60%)', BIG, { side: 'right', zoom: 0.6 }, 1, 700],
    ['20 ideas under one (the cap)', WIDEST, { side: 'right' }, 1, 700]
  ]
};

// ---------- the engine and its drawing, in a board's logic ----------
const ENGINE = (() => { try { return readFileSync(new URL('../web/maps.js', import.meta.url), 'utf8'); } catch { return ''; } })();
// The app's map (web/mapview.js), in the boards that call this.mapview(): it runs the stage and gives the page its values.
const VIEW = (() => { try { return readFileSync(new URL('../web/mapview.js', import.meta.url), 'utf8'); } catch { return ''; } })();
export const MAPVIEW_METHOD = VIEW ? `mapview() { return Component._mv || (Component._mv = (${VIEW.slice(VIEW.indexOf('function makeMapView'), VIEW.lastIndexOf('export default')).trim()})(this.maps(), this.mapArt())); }`
  : `mapview() { return { model: () => ({ on: false }), leave: () => {}, link: () => {}, tones: () => new Map() }; }`;
export const MAPS_METHOD = ENGINE ? `maps() { return Component._maps || (Component._maps = (${ENGINE.slice(ENGINE.indexOf('function makeMaps'), ENGINE.lastIndexOf('export default')).trim()})()); }`
  : `maps() { return { layoutMind: () => ({ nodes: [], links: [], width: 0, height: 0 }), previewOf: () => ({ w: 0, h: 0, nodes: [], links: [] }), normalize: (k, d) => ({ data: d, warnings: [] }), edit: (k, d) => ({ data: d, summary: '' }), diff: () => null, summaryOf: () => '', ideaTone: () => 'new', matchCards: () => [], testOrder: () => [], countOf: () => 0 }; }`;

// The stage a map page draws in: under the title, beside the sidebar on a computer, between the title and the bottom bar on a phone.
export const STAGE = { web: { W: 1200, H: 772 }, phone: { W: 390, H: 608 } };

// What draws a map's numbers (layoutMind / previewOf) as SVG, and the Mind map page's state for each of MINDMAP_VIEWS. Written as one
// function with no imports so it runs in node (design/check.mjs) and inside a board (MAP_ART_METHOD): S is the sample above.
function makeMapArt(S) {
  const SIZE = [15, 13.5, 12.5], WEIGHT = [600, 600, 500], PAD_X = 14, PAD_Y = 9, CHIP = 26;
  const STAGES = { web: { W: 1200, H: 772 }, phone: { W: 390, H: 608 } };
  const TINT = { weak: 'againTint', getting: 'hardTint', solid: 'goodTint' };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const r1 = v => Math.round(v * 10) / 10;
  // Colors made from the theme's own: a token as r, g, b, whether the theme is dark, and a token see-through.
  const rgbOf = c => { const s = String(c || ''), h = /^#([0-9a-f]{6})$/i.exec(s); if (h) { const v = parseInt(h[1], 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; } const m = /rgba?\(([^)]+)\)/.exec(s); return m ? m[1].split(',').slice(0, 3).map(x => +x || 0) : [128, 128, 128]; };
  const isDark = t => { const [r, g, b] = rgbOf(t.bg); return r * 0.299 + g * 0.587 + b * 0.114 < 128; };
  const alpha = (c, a) => 'rgba(' + rgbOf(c).join(', ') + ', ' + a + ')';
  // How a box is marked: a weak-spots tone, a Test me mark, or an idea the other writer just added. Each is a tint and a border of the
  // same color, drawn on the box itself (never a ring outside it): in the light the theme's tints, in the dark the accent at 26%, so
  // each reads lighter than the black canvas and apart from the others.
  const ACCENT = { weak: 'again', getting: 'hard', solid: 'good', missed: 'again', knew: 'good', fresh: 'easy' };
  function markOf(t, kind) {
    const acc = t[ACCENT[kind]] || (kind === 'getting' ? t.again : t.text), dark = isDark(t);
    const fill = dark ? alpha(acc, kind === 'fresh' ? 0.22 : 0.26) : kind === 'fresh' ? alpha(acc, 0.1) : t[TINT[kind === 'missed' ? 'weak' : kind === 'knew' ? 'solid' : kind]] || alpha(acc, 0.12);
    return { fill, stroke: alpha(acc, dark ? 0.9 : 0.6), ink: acc, width: kind === 'missed' || kind === 'knew' ? 2 : 1.5 };
  }
  // A label's lines, balanced: the same number of lines, broken where the longest is shortest (so no word is left on a line of its
  // own). A script without spaces keeps the engine's lines.
  function balanced(lines, units) {
    if (lines.length < 2 || !units) return lines;
    const words = lines.join(' ').split(' ').filter(Boolean), n = lines.length;
    if (words.length < n || words.length > 24) return lines;
    let best = null, bestU = Infinity;
    const go = (from, left, acc) => {
      if (left === 1) { const l = acc.concat(words.slice(from).join(' ')), u = Math.max(...l.map(units)); if (u < bestU) { bestU = u; best = l; } return; }
      for (let i = from + 1; i <= words.length - left + 1; i++) go(i, left - 1, acc.concat(words.slice(from, i).join(' ')));
    };
    go(0, n, []);
    return best || lines;
  }
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  // Every idea by id: its idea, level, parent id and the labels on the way to it.
  function index(data) {
    const by = new Map(), st = [[data && data.root, 0, null, []]];
    while (st.length) {
      const [n, level, parent, path] = st.pop();
      if (!n || typeof n !== 'object') continue;
      by.set(n.id, { n, level, parent, path });
      const k = Array.isArray(n.children) ? n.children : [];
      for (let i = k.length - 1; i >= 0; i--) st.push([k[i], level + 1, n.id, path.concat(n.label || '')]);
    }
    return by;
  }
  // The weak-spots tone of every idea (maps.ideaTone, from its cards' tones and its last Test me mark).
  function tonesOf(maps, data, cards, marks) {
    const tone = new Map(cards.map(c => [c.id, c.tone])), out = new Map();
    for (const [id, x] of index(data)) if (x.level > 0) out.set(id, maps.ideaTone((x.n.cardIds || []).map(c => tone.get(c)).filter(Boolean), marks[id]));
    return out;
  }
  // Where the camera is: a zoom z and the stage point (x, y) the map's origin sits at. Fit: the whole map, never under zmin (80% on a
  // computer; 104% on a phone, so no word is under 13 pt) nor over zmax; a map that doesn't fit at zmin opens at that zoom centred
  // on the topic (a one-sided map: the topic and its main ideas centred across, the topic centred down). The gallery's cards use this.
  function cam(L, SW, SH, o) {
    const zmin = o.zmin || 0.8, zmax = o.zmax || 1;
    SH -= o.bottom || 0;
    const fit = Math.min(SW / L.width, SH / L.height);
    if (fit < zmin) {
      const z = zmin, n = L.nodes[0], one = L.nodes.every(x => x.side >= 0) && L.nodes.length > 1;
      const mains = L.nodes.filter(x => x.level <= 1), x1 = Math.max(...mains.map(x => x.x + x.w)), cx = one ? (n.x + x1) / 2 : n.x + n.w / 2;
      return { z, x: r1(SW / 2 - z * cx), y: r1(SH / 2 - z * (n.y + n.h / 2)) };
    }
    const z = Math.min(zmax, fit);
    return { z, x: r1((SW - L.width * z) / 2), y: r1((SH - L.height * z) / 2) };
  }
  // The camera that shows the ideas `ids` inside `area` (the part of the stage no panel, sheet or line covers: {x, y, w, h}), `inset`
  // from its edges, at most at z (zmax) and never under zmin. When they don't fit at zmin, the first of them (the idea in focus) is
  // kept whole inside the area. `pad` makes room around each box for what hangs off it (its badge, the selection ring).
  function frame(L, ids, area, o) {
    const want = new Set(ids), ns = L.nodes.filter(n => want.has(n.id)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (!ns.length) ns.push(L.nodes[0]);
    const pad = o.pad == null ? 8 : o.pad, i = o.inset == null ? 24 : o.inset, zmin = o.zmin || 0.8, zmax = o.zmax || 1;
    const x0 = Math.min(...ns.map(n => n.x)) - pad, y0 = Math.min(...ns.map(n => n.y)) - pad, x1 = Math.max(...ns.map(n => n.x + n.w)) + pad, y1 = Math.max(...ns.map(n => n.y + n.h)) + pad;
    const z = Math.max(zmin, Math.min(o.z || zmax, zmax, (area.w - 2 * i) / (x1 - x0), (area.h - 2 * i) / (y1 - y0)));
    let x = area.x + area.w / 2 - z * (x0 + x1) / 2, y = area.y + area.h / 2 - z * (y0 + y1) / 2;
    // (the idea in focus whole: its left and top edges win over its right and bottom ones)
    const f = ns[0], R = area.x + area.w - i, B = area.y + area.h - i;
    if (x + z * (f.x + f.w + pad) > R) x = R - z * (f.x + f.w + pad);
    if (x + z * (f.x - pad) < area.x + i) x = area.x + i - z * (f.x - pad);
    if (y + z * (f.y + f.h + pad) > B) y = B - z * (f.y + f.h + pad);
    if (y + z * (f.y - pad) < area.y + i) y = area.y + i - z * (f.y - pad);
    return { z: Math.round(z * 1000) / 1000, x: r1(x), y: r1(y) };
  }
  // An idea and what's around it on the map: its parent, its children and (with sibs) its brothers and sisters, the idea first.
  function branchOf(L, id, sibs) {
    const n = L.nodes.find(x => x.id === id);
    if (!n) return [L.nodes[0].id];
    const out = [id];
    if (n.parent) out.push(n.parent);
    for (const x of L.nodes) if (x.parent === id || (sibs && x.parent && x.parent === n.parent && x.id !== id)) out.push(x.id);
    return out;
  }
  const rectOf = (L, c, id) => { const n = L.nodes.find(x => x.id === id); return n ? { x: r1(c.x + c.z * n.x), y: r1(c.y + c.z * n.y), w: r1(c.z * n.w), h: r1(c.z * n.h) } : { x: 0, y: 0, w: 0, h: 0 }; };
  // Pairs of boxes that overlap (none, for every layout the engine makes).
  function overlaps(L) {
    let n = 0;
    for (let i = 0; i < L.nodes.length; i++) for (let j = i + 1; j < L.nodes.length; j++) {
      const a = L.nodes[i], b = L.nodes[j];
      if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) n++;
    }
    return n;
  }
  // The boxes as they are drawn: each label's lines balanced, and a box with nothing drawn past its outer edge (a leaf, or a folded
  // idea) as wide as its balanced lines need, its inner edge (where its link comes in) kept where the engine put it.
  function boxesOf(L, data, o) {
    const by = index(data), char = [8.6, 7.4, 6.9];
    return L.nodes.map(n => {
      const lv = Math.min(n.level, 2), lines = balanced(n.lines, o.units), x = by.get(n.id), label = x ? x.n.label || '' : '';
      const open = n.kids > 0 && !n.folded;
      let w = n.w, dx = 0;
      if (!open && n.level > 0 && o.units && lines !== n.lines) {
        const need = Math.max(64, Math.ceil(Math.max(...lines.map(o.units)) * char[lv]) + 2 * PAD_X) + (n.folded ? CHIP : 0);
        if (need < w) { if (n.side < 0) dx = w - need; w = need; }
      }
      return { ...n, x: r1(n.x + dx), w, lines, label, open };
    });
  }
  // What hangs off a box, in one row: '✦ New' (the other writer just added it), its note and cards (a badge) and, on a folded idea,
  // how many weak ideas it hides. The row goes where it touches no other box and no other row: past the box's outer edge when
  // nothing is drawn there, else under or over it at the outer end, else (no room) across its bottom or top border.
  function extrasOf(B, data, o) {
    const t = o.t, by = index(data), out = new Map(), placed = [];
    const fs = o.small || 10, k = fs / 10, h = r1(fs + 6), fz = o.chip || 11, hw = r1(fz + 6);
    const hits = (r, self) => B.some(m => m.id !== self && r.x < m.x + m.w + 3 && m.x - 3 < r.x + r.w && r.y < m.y + m.h + 3 && m.y - 3 < r.y + r.h)
      || placed.some(p => r.x < p.x + p.w + 2 && p.x - 2 < r.x + r.w && r.y < p.y + p.h + 2 && p.y - 2 < r.y + r.h);
    for (const n of B) {
      const x = by.get(n.id), d = x ? x.n : {}, hidden = o.hidden && o.hidden.has(n.id), items = [];
      if (hidden || (o.editing && o.editing.id === n.id)) continue;
      if (o.changed && o.changed.has(n.id) && o.newTag !== false) {
        const m = markOf(t, 'fresh'), w = r1(3.3 * fz + 10);
        items.push({ w, h: hw, svg: (x0, y0) => '<rect x="' + r1(x0) + '" y="' + r1(y0) + '" width="' + w + '" height="' + hw + '" rx="' + r1(hw / 2) + '" fill="' + (isDark(t) ? alpha(m.ink, 0.3) : t.bg) + '" stroke="' + m.stroke + '"/><text x="' + r1(x0 + w / 2) + '" y="' + r1(y0 + hw / 2 + fz * 0.36) + '" text-anchor="middle" font-size="' + fz + '" font-weight="600" fill="' + m.ink + '">✦ New</text>' });
      }
      const nc = Array.isArray(d.cardIds) ? d.cardIds.length : 0, hasNote = !!d.note;
      if (nc || hasNote) {
        const gw = 7 * k, cw = nc ? 6.5 * k + 3 * k + String(nc).length * 6.2 * k : 0, w = r1(10 * k + (hasNote ? gw : 0) + (hasNote && nc ? 5 * k : 0) + cw);
        items.push({ w, h, svg: (x0, y0) => {
          const cy = y0 + h / 2; let b = '<rect x="' + r1(x0) + '" y="' + r1(y0) + '" width="' + w + '" height="' + h + '" rx="' + r1(h / 2) + '" fill="' + t.bg + '" stroke="' + t.line + '"/>', xx = x0 + 5 * k;
          if (hasNote) { b += '<path d="M' + r1(xx) + ' ' + r1(cy - 2 * k) + 'h' + r1(gw) + 'M' + r1(xx) + ' ' + r1(cy + 1.5 * k) + 'h' + r1(gw * 0.65) + '" stroke="' + t.muted + '" stroke-width="' + r1(1.3 * k) + '" stroke-linecap="round"/>'; xx += gw + 5 * k; }
          if (nc) b += '<rect x="' + r1(xx) + '" y="' + r1(cy - 4.2 * k) + '" width="' + r1(6.5 * k) + '" height="' + r1(8.4 * k) + '" rx="' + r1(1.5 * k) + '" fill="none" stroke="' + t.muted + '" stroke-width="' + r1(1.2 * k) + '"/><text x="' + r1(xx + 9.5 * k) + '" y="' + r1(cy + fs * 0.36) + '" font-size="' + fs + '" font-weight="600" fill="' + t.muted + '">' + nc + '</text>';
          return b; } });
      }
      const inside = o.weakIn && o.weakIn.get(n.id);
      if (inside) {
        const label = inside + ' weak', m = markOf(t, 'weak'), w = r1(12 + label.length * fz * 0.58);
        items.push({ w, h: hw, svg: (x0, y0) => '<rect x="' + r1(x0) + '" y="' + r1(y0) + '" width="' + w + '" height="' + hw + '" rx="' + r1(hw / 2) + '" fill="' + m.fill + '" stroke="' + m.stroke + '"/><text x="' + r1(x0 + w / 2) + '" y="' + r1(y0 + hw / 2 + fz * 0.36) + '" text-anchor="middle" font-size="' + fz + '" font-weight="600" fill="' + m.ink + '">' + label + '</text>' });
      }
      if (!items.length) continue;
      const W = items.reduce((s, it) => s + it.w, 0) + 4 * (items.length - 1), H = Math.max(...items.map(it => it.h)), right = n.side >= 0;
      const end = right ? n.w - 6 - W - (n.folded ? CHIP : 0) : 6 + (n.folded ? CHIP : 0);
      // (clear of the selection ring, 4 outside the box, whichever idea is selected: a row never jumps when its box is)
      const tries = [...(!n.open ? [[right ? n.w + 7 : -7 - W, n.h / 2 - H / 2]] : []), [end, n.h + 7], [end, -H - 7], [end, n.h - H / 2], [end, -H / 2]];
      let at = tries[0];
      for (const p of tries) { if (!hits({ x: n.x + p[0], y: n.y + p[1], w: W, h: H }, n.id)) { at = p; break; } }
      const r = { x: r1(n.x + at[0]), y: r1(n.y + at[1]), w: r1(W), h: r1(H) };
      placed.push(r);
      let cx = at[0], svg = '';
      for (const it of items) { svg += it.svg(cx, at[1] + (H - it.h) / 2); cx += it.w + 4; }
      out.set(n.id, { ...r, svg });
    }
    return out;
  }
  // How many of those rows touch a box other than their own, or each other (none: design/check.mjs counts them on every state).
  function clashes(L, data, o) {
    const B = boxesOf(L, data, o), E = [...extrasOf(B, data, o).entries()];
    let n = 0;
    for (const [id, r] of E) {
      for (const m of B) if (m.id !== id && r.x < m.x + m.w - 0.5 && m.x < r.x + r.w - 0.5 && r.y < m.y + m.h - 0.5 && m.y < r.y + r.h - 0.5) n++;
      for (const [id2, q] of E) if (id2 > id && r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h) n++;
    }
    return n;
  }
  // The map, drawn at a camera. o: t (the theme), z/x/y (the camera), W/H (the stage), tones (a Map of weak-spots tones, when the
  // overlay is on), sel (the selected idea: the one ring drawn outside a box), hidden (a Set: Test me's hidden ideas), marks (a Map:
  // 'knew' or 'missed'), changed (a Set: ideas the other writer added), editing ({id, text}: the label being typed), weakIn (a Map:
  // weak ideas inside a folded branch), units (maps.units), small / chip (the badge's and the chips' text size), faded (ids drawn
  // pale: what isn't in the test).
  function draw(L, data, o) {
    const t = o.t, hid = o.hidden || new Set(), mk = o.marks || new Map(), ch = o.changed || new Set(), tones = o.tones || null;
    const B = boxesOf(L, data, o), X = extrasOf(B, data, o);
    const links = L.links.map(l => '<path d="' + esc(l.d) + '"/>').join('');
    const nodes = B.map(n => {
      const lv = Math.min(n.level, 2), hidden = hid.has(n.id), tone = tones ? tones.get(n.id) : null, left = n.side < 0;
      const m = hidden ? null : mk.get(n.id) ? markOf(t, mk.get(n.id)) : TINT[tone] ? markOf(t, tone) : ch.has(n.id) ? markOf(t, 'fresh') : null;
      const inv = n.level === 0 && !m && !hidden, rx = n.level === 0 ? Math.min(16, r1(n.h / 2)) : 10;
      const fill = hidden ? t.surf : m ? m.fill : inv ? t.inv : n.level === 1 ? t.surf2 : t.bg, ink = inv ? t.invText : t.text;
      // (a colored border sits inside the box, so the box keeps the size the engine spaced)
      const sw = hidden ? 1.5 : m ? m.width : n.level >= 2 ? 1.5 : 0, ins = m ? sw / 2 : 0;
      const stroke = hidden ? ' stroke="' + t.line + '" stroke-width="1.5" stroke-dasharray="5 4"' : m ? ' stroke="' + m.stroke + '" stroke-width="' + sw + '"' : sw ? ' stroke="' + t.line + '" stroke-width="1.5"' : '';
      let out = '<title>' + esc(n.label || (n.level === 0 ? o.title || '' : '')) + '</title><rect x="' + ins + '" y="' + ins + '" width="' + r1(n.w - 2 * ins) + '" height="' + r1(n.h - 2 * ins) + '" rx="' + r1(rx - ins) + '" fill="' + fill + '"' + stroke + '/>';
      const tw = n.folded ? n.w - CHIP : n.w, tx = n.folded && left ? CHIP + tw / 2 : tw / 2;
      if (hidden) out += '<text x="' + r1(tx) + '" y="' + r1(n.h / 2 + 5.5) + '" text-anchor="middle" font-size="16" font-weight="600" fill="' + t.muted + '">?</text>';
      else if (o.editing && o.editing.id === n.id && o.editing.bare) { /* (the app's own field is over the box: web/mapview.js) */ }
      else if (o.editing && o.editing.id === n.id) {
        const text = o.editing.text || '', w = o.units ? o.units(text) * [8.6, 7.4, 6.9][lv] : text.length * 7;
        out += '<text x="' + PAD_X + '" y="' + r1(n.h / 2 + SIZE[lv] * 0.36) + '" font-size="' + SIZE[lv] + '" font-weight="' + WEIGHT[lv] + '" fill="' + ink + '">' + esc(text) + '</text>'
          + '<rect x="' + r1(PAD_X + w + 1.5) + '" y="' + r1(n.h / 2 - 9) + '" width="1.6" height="18" rx=".8" fill="' + ink + '"/>';
      } else {
        const lh = (n.h - 2 * PAD_Y - (n.level === 0 ? 6 : 0)) / Math.max(1, n.lines.length), top = n.h / 2 - ((n.lines.length - 1) * lh) / 2;
        out += '<text text-anchor="middle" fill="' + ink + '" font-size="' + SIZE[lv] + '" font-weight="' + WEIGHT[lv] + '">' + n.lines.map((s, i) => '<tspan x="' + r1(tx) + '" y="' + r1(top + i * lh + SIZE[lv] * 0.36) + '">' + esc(s) + '</tspan>').join('') + '</text>';
      }
      if (n.folded) {
        const cx = left ? 4 : n.w - CHIP + 2;
        out += '<rect x="' + r1(cx) + '" y="' + r1(n.h / 2 - 9) + '" width="' + (CHIP - 6) + '" height="18" rx="9" fill="' + (m ? t.bg : t.surf) + '"/><text x="' + r1(cx + (CHIP - 6) / 2) + '" y="' + r1(n.h / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="600" fill="' + t.muted + '">+' + n.hidden + '</text>';
      }
      if (!hidden && tone === 'weak') out += '<circle cx="' + r1(n.w - 9) + '" cy="9" r="3.5" fill="' + t.again + '"/>';
      if (o.sel === n.id) out += '<rect x="-4" y="-4" width="' + r1(n.w + 8) + '" height="' + r1(n.h + 8) + '" rx="' + (n.level === 0 ? Math.min(20, r1(n.h / 2 + 4)) : 13) + '" fill="none" stroke="' + t.text + '" stroke-width="2"/>';
      const fade = o.faded && o.faded.has(n.id) ? ' opacity=".45"' : '';
      return '<g data-id="' + esc(n.id) + '" transform="translate(' + n.x + ' ' + n.y + ')"' + fade + ' style="cursor: pointer;">' + out + '</g>';
    }).join('');
    // (what hangs off the boxes goes over all of them)
    const extraSvg = B.filter(n => X.has(n.id)).map(n => '<g transform="translate(' + n.x + ' ' + n.y + ')">' + X.get(n.id).svg + '</g>').join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + o.W + '" height="' + o.H + '" viewBox="0 0 ' + o.W + ' ' + o.H + '" aria-hidden="true" focusable="false" style="display: block; font-family: inherit; user-select: none;">'
      + '<g transform="translate(' + o.x + ' ' + o.y + ') scale(' + o.z + ')"><g fill="none" stroke="' + t.line + '" stroke-width="1.5" stroke-linecap="round">' + links + '</g>' + nodes + extraSvg + '</g></svg>';
  }
  // A map inside a Note (§9.1), as the boards draw it: the topic and its main ideas (each folded, with its "+N"), scaled to fit but
  // never so small that a main idea's words are under `least` px (11 on the web, 12 pt on an iPhone); a map still too big is cut
  // around its topic, and its cut edges fade. Its numbers are previewOf's kind of model ({w, h, scale, nodes, links, cut}).
  function previewModel(maps, data, o) {
    const folds = {};
    for (const c of (data.root.children || [])) if ((c.children || []).length) folds[c.id] = true;
    const L = maps.layoutMind(data, { side: o.side || 'both', folds, title: o.title }), w = o.w, h = o.h, least = o.least || 11;
    const fit = Math.min(1, w / L.width, h / L.height), s = Math.min(1, Math.max(fit, least / SIZE[1])), root = L.nodes[0];
    // (centred; when cut, centred on the topic and kept inside the drawing where it can be)
    let ox = (w - L.width * s) / 2, oy = (h - L.height * s) / 2;
    if (L.width * s > w) ox = Math.min(0, Math.max(w - L.width * s, w / 2 - s * (root.x + root.w / 2)));
    if (L.height * s > h) oy = Math.min(0, Math.max(h - L.height * s, h / 2 - s * (root.y + root.h / 2)));
    const X = v => r1(ox + v * s), Y = v => r1(oy + v * s), S = v => r1(v * s), tones = o.tones || new Map();
    const nodes = L.nodes.map(n => ({ id: n.id, x: X(n.x), y: Y(n.y), w: S(n.w), h: S(n.h), lines: n.lines.slice(0, 2), level: n.level, side: n.side, tone: tones.get(n.id) || null, folded: n.folded, hidden: n.hidden }));
    const links = L.links.map(l => 'M' + X(l.c[0]) + ' ' + Y(l.c[1]) + ' C' + X(l.c[2]) + ' ' + Y(l.c[3]) + ' ' + X(l.c[4]) + ' ' + Y(l.c[5]) + ' ' + X(l.c[6]) + ' ' + Y(l.c[7]));
    return { w, h, scale: Math.round(s * 1000) / 1000, nodes, links, cut: { left: ox < -1, right: ox + L.width * s > w + 1, top: oy < -1, bottom: oy + L.height * s > h + 1 } };
  }
  // A map inside a Note: that model, with the weak-spots tints; no rings, knobs or blanks. bg: the box's own color (the cut edges
  // fade into it).
  function preview(P, t, bg) {
    const s = P.scale || 1, links = P.links.map(d => '<path d="' + esc(d) + '"/>').join('');
    const nodes = P.nodes.map(n => {
      const lv = Math.min(n.level, 2), m = TINT[n.tone] ? markOf(t, n.tone) : null, inv = n.level === 0 && !m, fs = r1(SIZE[lv] * s * 10) / 10, left = n.side < 0;
      const fill = m ? m.fill : inv ? t.inv : n.level === 1 ? t.surf2 : t.bg, ink = inv ? t.invText : t.text;
      const stroke = m ? ' stroke="' + m.stroke + '" stroke-width="' + r1(1.5 * s) + '"' : n.level >= 2 ? ' stroke="' + t.line + '" stroke-width="' + r1(1.5 * Math.max(s, 0.6) * 10) / 10 + '"' : '';
      const cw = CHIP * s, tw = n.folded ? n.w - cw : n.w, tx = n.folded && left ? cw + tw / 2 : tw / 2;
      const lh = n.lines.length ? (n.h - 2 * PAD_Y * s - (n.level === 0 ? 6 * s : 0)) / n.lines.length : 0, top = n.h / 2 - ((n.lines.length - 1) * lh) / 2;
      let out = '<rect width="' + n.w + '" height="' + n.h + '" rx="' + r1((n.level === 0 ? Math.min(16, n.h / s / 2) : 10) * s) + '" fill="' + fill + '"' + stroke + '/>'
        + '<text text-anchor="middle" fill="' + ink + '" font-size="' + fs + '" font-weight="' + WEIGHT[lv] + '">' + n.lines.map((l, i) => '<tspan x="' + r1(tx) + '" y="' + r1(top + i * lh + fs * 0.36) + '">' + esc(l) + '</tspan>').join('') + '</text>';
      if (n.folded) { const cx = left ? 4 * s : n.w - cw + 2 * s; out += '<rect x="' + r1(cx) + '" y="' + r1(n.h / 2 - 9 * s) + '" width="' + r1((CHIP - 6) * s) + '" height="' + r1(18 * s) + '" rx="' + r1(9 * s) + '" fill="' + t.surf + '"/><text x="' + r1(cx + (CHIP - 6) * s / 2) + '" y="' + r1(n.h / 2 + 4 * s) + '" text-anchor="middle" font-size="' + r1(11 * s) + '" font-weight="600" fill="' + t.muted + '">+' + n.hidden + '</text>'; }
      if (n.tone === 'weak') out += '<circle cx="' + r1(n.w - 9 * s) + '" cy="' + r1(9 * s) + '" r="' + r1(3.5 * Math.max(s, 0.7)) + '" fill="' + t.again + '"/>';
      return '<g transform="translate(' + n.x + ' ' + n.y + ')">' + out + '</g>';
    }).join('');
    // (a cut edge fades into the box)
    const c = P.cut || {}, B = bg || t.surf, F = 36;
    const fade = (id, x1, y1, x2, y2, x, y, w, h) => '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"><stop offset="0" stop-color="' + B + '"/><stop offset="1" stop-color="' + B + '" stop-opacity="0"/></linearGradient><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/>';
    const fades = (c.left ? fade('pvl', 0, 0, 1, 0, 0, 0, F, P.h) : '') + (c.right ? fade('pvr', 1, 0, 0, 0, P.w - F, 0, F, P.h) : '') + (c.top ? fade('pvt', 0, 0, 0, 1, 0, 0, P.w, 28) : '') + (c.bottom ? fade('pvb', 0, 1, 0, 0, 0, P.h - 28, P.w, 28) : '');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="' + P.h + '" viewBox="0 0 ' + P.w + ' ' + P.h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" style="display: block; font-family: inherit;"><g fill="none" stroke="' + t.line + '" stroke-width="' + r1(1.5 * Math.max(s, 0.6) * 10) / 10 + '" stroke-linecap="round">' + links + '</g>' + nodes + fades + '</svg>';
  }
  // A ref that puts a drawing in its element only when it changed.
  const sum = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  const refOf = (html, onClick) => el => { if (!el) return; const k = html.length + ':' + sum(html); if (el.getAttribute('data-k') !== k) { el.innerHTML = html; el.setAttribute('data-k', k); } el.onclick = onClick || null; };
  // The map's summary for a Note's box and the Pages list: ideas, and how many are weak.
  function studyOf(maps, data) { const tones = tonesOf(maps, data, S.cards, S.marks); let weak = 0; for (const v of tones.values()) if (v === 'weak') weak++; return { ideas: maps.countOf('mindmap', data), weak, tones }; }

  // ---------- the Mind map page, in each of its states (MINDMAP_VIEWS) ----------
  // A token lighter, toward white (the dark theme's raised surfaces).
  const lighter = (c, a) => '#' + rgbOf(c).map(v => Math.round(v + (255 - v) * a).toString(16).padStart(2, '0')).join('');
  // The colors of what's raised over the page (popovers, sheets, the idea bar): the page's own in the light; in the dark a gray a
  // step above the black page (iOS's raised sheets), with controls a step above that.
  const raisedOf = t => (isDark(t) ? { bg: lighter(t.bg, 0.1), surf: lighter(t.bg, 0.19), surf2: lighter(t.bg, 0.26), line: lighter(t.bg, 0.2) } : { bg: t.bg, surf: t.surf, surf2: t.surf2, line: t.line });
  // Every box's rectangle and the whole map's, as drawn.
  const bounds = list => { const x0 = Math.min(...list.map(n => n.x)), y0 = Math.min(...list.map(n => n.y)); return { x: x0, y: y0, w: Math.max(...list.map(n => n.x + n.w)) - x0, h: Math.max(...list.map(n => n.y + n.h)) - y0 }; };
  // The whole map inside an area: fitted (from zmin to zmax) or, when it can't fit at zmin, at zmin centred on the topic (a
  // one-sided map: the topic and its main ideas centred across, the topic centred down).
  function fitIn(B, area, o) {
    const i = o.inset == null ? 24 : o.inset, b = bounds(B), zmin = o.zmin || 0.8, zmax = o.zmax || 1, root = B[0];
    const fit = Math.min((area.w - 2 * i) / (b.w + 16), (area.h - 2 * i) / (b.h + 16));
    if (fit >= zmin) { const z = Math.min(zmax, fit); return { z: Math.round(z * 1000) / 1000, x: r1(area.x + area.w / 2 - z * (b.x + b.w / 2)), y: r1(area.y + area.h / 2 - z * (b.y + b.h / 2)) }; }
    const z = zmin, one = B.every(n => n.side >= 0), top = bounds(B.filter(n => n.level <= 1));
    const cx = one ? top.x + top.w / 2 : root.x + root.w / 2;
    let x = area.x + area.w / 2 - z * cx;
    if (one && z * (top.w + 16) > area.w - 2 * i) x = area.x + i - z * (root.x - 8);
    return { z, x: r1(x), y: r1(area.y + area.h / 2 - z * (root.y + root.h / 2)) };
  }
  // a: view, phone, dark, t (the theme), st (the board's own state: what was pressed on the canvas), set (to change it).
  function model(maps, a) {
    const view = String(a.view || 'Mind map'), v = view.replace(/^Mind map( · )?/, '') || 'map', phone = !!a.phone, t = a.t, st = a.st || {}, set = a.set || (() => {});
    const G = phone ? STAGES.phone : STAGES.web, noop = () => {}, dark = isDark(t), te = raisedOf(t);
    // What the page holds in this state.
    let data = S.data, title = S.title, version = 3, by = 'Claude', ai = true, when = 'yesterday';
    if (v === 'changed by your AI') { data = S.changed; version = 4; when = 'just now'; }
    if (v === 'new') { data = { root: { id: 'root', label: '' } }; title = 'Membrane transport'; version = 1; by = 'You'; ai = false; when = 'just now'; }
    const NEW_ID = 'nq3k8z2a';
    if (v === 'writing an idea') data = maps.edit('mindmap', data, { op: 'add', id: NEW_ID, parent: 'mito', label: 'ATP synth' }).data;
    const by0 = index(data), label = id => (by0.get(id) ? by0.get(id).n.label || title : '');
    const testing = v === 'testing' || v === 'one at a time' || v === 'test done';
    // What's folded on this device: ER and Golgi, and (the first time, on any device) every idea at level 2 that has ideas under it
    // (§5.1: "folded to level 2" keeps levels 0 to 2 showing; the sample has none to fold). A test opens everything.
    const folds = {};
    if (!testing) { folds.er = true; for (const [id, x] of by0) if (x.level === 2 && (x.n.children || []).length) folds[id] = true; }
    Object.assign(folds, st.folds || {});
    const L = maps.layoutMind(data, { side: phone ? 'right' : 'both', folds, title });
    // Test me: Everything, in outline order; six marked so far, then Electron transport.
    const order = testing ? maps.testOrder(data, L) : [], MISSED = ['nucleolus', 'etc', 'rough-er', 'smooth-er'];
    const marks = new Map(), hidden = new Set();
    let current = '', shown = !!st.shown;
    if (v === 'testing' || v === 'one at a time') {
      order.slice(0, 6).forEach(id => marks.set(id, id === 'nucleolus' ? 'missed' : 'knew'));
      current = order[6];
      for (const id of order.slice(v === 'testing' ? 7 : 6)) hidden.add(id);
      if (v === 'testing') shown = true;
      if (shown) hidden.delete(current);
    }
    if (v === 'test done') for (const id of order) marks.set(id, MISSED.includes(id) ? 'missed' : 'knew');
    const testN = order.length, doneN = v === 'test done' ? testN : marks.size, missedN = [...marks.values()].filter(x => x === 'missed').length;
    // The overlay, the outline, the selection and what's open (the state's own, unless something on the canvas was pressed).
    const outline = st.outline !== undefined ? st.outline : v === 'outline';
    const weakOn = st.weak !== undefined ? st.weak : v === 'weak spots';
    const SEL = { 'an idea selected': 'mito', 'writing an idea': NEW_ID, 'cards of an idea': 'etc', 'make a card': 'mito', new: 'root' };
    const sel = st.sel !== undefined ? st.sel : v === 'one at a time' || v === 'testing' ? current : SEL[v] || '';
    const sheetOpen = st.sheet !== undefined ? st.sheet : v === 'test me';
    const cardsOpen = st.cards !== undefined ? st.cards : v === 'cards of an idea';
    const study = studyOf(maps, data), tones = study.tones;
    const weakIn = new Map();
    if (weakOn) for (const n of L.nodes) if (n.folded) { let k = 0; for (const [id, x] of by0) if (x.path.length > n.level && tones.get(id) === 'weak' && (function under() { for (let p = x.parent; p; p = by0.get(p).parent) if (p === n.id) return true; return false; })()) k++; if (k) weakIn.set(n.id, k); }
    const changed = new Set(), added = v === 'changed by your AI' ? maps.diff('mindmap', S.data, S.changed).added : [];
    for (const x of added) changed.add(x.id);
    // What the drawing needs, and the boxes as drawn (the camera frames those).
    const small = phone ? 12.5 : 10, chip = phone ? 12.5 : 11;
    const art = { t, tones: weakOn ? tones : null, sel, hidden, marks, changed, weakIn, units: maps.units, title,
      editing: v === 'writing an idea' && !phone ? { id: NEW_ID, text: 'ATP synth' } : null };
    const B = boxesOf(L, data, art);
    // (what the camera frames: each box with what hangs off it, so a badge is never cut by the stage's edge)
    const XB = extrasOf(B, data, { ...art, small: phone ? 12.5 : 11, chip: phone ? 12.5 : 11 }), BX = B.map(n => { const r = XB.get(n.id); if (!r) return n; const x0 = Math.min(n.x, r.x), y0 = Math.min(n.y, r.y); return { ...n, x: x0, y: y0, w: Math.max(n.x + n.w, r.x + r.w) - x0, h: Math.max(n.y + n.h, r.y + r.h) - y0 }; });
    // The camera: the part of the stage nothing covers (the bars, panels, sheets and lines of each state), and what it frames there.
    const make = v === 'make a card';
    let c;
    if (!phone) {
      const W = G.W, H = G.H, ALL = { inset: 24, zmin: 0.74, zmax: 1 };
      const AREA = { 'an idea selected': { x: 0, y: 56, w: W, h: 547 }, 'writing an idea': { x: 0, y: 56, w: W, h: 547 }, 'cards of an idea': { x: 0, y: 56, w: W - 392, h: 547 },
        'make a card': { x: 0, y: 56, w: 780, h: H - 56 }, 'weak spots': { x: 0, y: 56, w: W - 268, h: H - 56 }, 'test me': { x: 0, y: 0, w: W - 432, h: H },
        testing: { x: 0, y: 56, w: W, h: 500 }, 'one at a time': { x: 0, y: 56, w: W, h: 500 }, 'changed by your AI': { x: 0, y: 66, w: W, h: H - 66 } };
      c = fitIn(BX, AREA[v] || { x: 0, y: 56, w: W, h: H - 56 }, { ...ALL, zmax: v === 'one at a time' ? 1.2 : 1 });
    } else {
      const W = G.W, H = G.H, P = { inset: 16, zmin: 0.92, zmax: 1.25, pad: 6 };
      // (a branch on an upright phone, in groups: the idea, then its children, its parent, its brothers and sisters; as many whole
      // groups as fit with no word under 13 pt (104%), else as many as fit at 92% or more (12 pt and up for an idea's words, 11.5 for a
      // leaf's), else the idea on its own)
      // (boxes only: a badge may run off the stage's edge where it has to, the words never do)
      const shot = (groups, area, z) => {
        const tries = [], nodes = B;
        for (let k = groups.length; k >= 2; k--) tries.push(frame({ nodes }, [].concat(...groups.slice(0, k)), area, { ...P, zmin: 0.01, z }));
        return tries.find(f => f.z >= 1.04) || tries.find(f => f.z >= 0.92) || frame({ nodes }, groups[0], area, { ...P, z });
      };
      const kidsOf = id => B.filter(n => n.parent === id).map(n => n.id), sibsOf = id => { const p = (B.find(n => n.id === id) || {}).parent; return B.filter(n => n.parent === p && n.id !== id).map(n => n.id); };
      const parentOf = id => (B.find(n => n.id === id) || {}).parent || id;
      const F = {
        'an idea selected': () => shot([['mito'], kidsOf('mito'), ['cell']], { x: 0, y: 0, w: W, h: 468 }, 1.1),
        'writing an idea': () => shot([[NEW_ID], ['mito']], { x: 0, y: 0, w: W, h: 234 }, 1.1),
        'cards of an idea': () => shot([['etc'], ['mito']], { x: 0, y: 0, w: W, h: 124 }, 1.1),
        'make a card': () => shot([['mito'], kidsOf('mito')], { x: 0, y: 0, w: W, h: 316 }, 1.1),
        testing: () => shot([[current], [parentOf(current)], sibsOf(current)], { x: 0, y: 0, w: W, h: 542 }, 1.1),
        'one at a time': () => shot([[current], [parentOf(current)], sibsOf(current)], { x: 0, y: 0, w: W, h: 532 }, 1.25),
        'test done': () => shot([['mito'], kidsOf('mito')], { x: 0, y: 0, w: W, h: 300 }, 1.04),
        'changed by your AI': () => shot([['cytoskeleton'], kidsOf('cytoskeleton')], { x: 0, y: 76, w: W, h: H - 76 }, 1.1)
      };
      c = F[v] ? F[v]() : fitIn(BX, { x: 0, y: 0, w: W, h: weakOn ? 470 : H }, { inset: 16, zmin: 1.04, zmax: 1.25 });
    }
    const R = id => { const n = B.find(x => x.id === id); return n ? { x: r1(c.x + c.z * n.x), y: r1(c.y + c.z * n.y), w: r1(c.z * n.w), h: r1(c.z * n.h), side: n.side } : { x: 0, y: 0, w: 0, h: 0, side: 1 }; };
    // (badges and chips read at 11 px or more on a computer whatever the zoom)
    const svg = draw(L, data, { ...art, W: G.W, H: G.H, z: c.z, x: c.x, y: c.y, small: phone ? small : Math.max(small, r1(11 / c.z)), chip: phone ? chip : Math.max(chip, r1(11 / c.z)) });
    const pick = e => { const g = e && e.target && e.target.closest ? e.target.closest('[data-id]') : null; set({ sel: g ? g.getAttribute('data-id') : '', ideaMore: false }); };
    // The selected idea's bar.
    const S_ = by0.get(sel), selNode = S_ ? S_.n : null, tone = new Map(S.cards.map(x => [x.id, x.tone]));
    const selCards = selNode && selNode.cardIds ? selNode.cardIds : [], selWeak = selCards.filter(id => tone.get(id) === 'weak').length;
    const lNode = L.nodes.find(n => n.id === sel);
    const barOpen = !!selNode && !outline && !testing && v !== 'new' && !make && !(phone && (cardsOpen || sheetOpen));
    const PILL = (on, lab) => ({ label: lab, pressed: on ? 'true' : 'false', bg: on ? t.inv : 'transparent', fg: on ? t.invText : t.muted });
    // The Cards popover (a sheet on a phone): the linked cards, Link a card (best matches first, no AI) and Study. On a computer it
    // opens beside the idea, on its outer side, from the idea's middle.
    const linked = selCards.map(id => S.cards.find(x => x.id === id)).filter(Boolean).map(x => ({ front: x.front, back: x.back, weak: x.tone === 'weak', unlink: noop }));
    const matches = selNode ? maps.matchCards(selNode.label, S.cards).filter(id => !selCards.includes(id)).slice(0, 3).map(id => S.cards.find(x => x.id === id)).map(x => ({ front: x.front, back: x.back, weak: x.tone === 'weak', link: noop })) : [];
    const sr = sel ? R(sel) : { x: 0, y: 0, w: 0, h: 0, side: 1 }, POPW = 360, POPH = 476;
    const hang = selNode && ((selNode.cardIds || []).length || selNode.note) && lNode && !(lNode.kids > 0 && !lNode.folded) ? 44 * c.z : 0;
    const popX = sr.side >= 0 ? Math.min(G.W - POPW - 16, sr.x + sr.w + hang + 16) : Math.max(16, sr.x - hang - POPW - 16);
    const popY = Math.max(16, Math.min(G.H - 180 - POPH, sr.y + sr.h / 2 - 120));
    // The weak spots' legend (over every idea, not only the ones showing), in the tints the map uses.
    const count = k => { let n = 0; for (const x of tones.values()) if (x === k) n++; return n; };
    const legend = [['Weak', 'weak', true], ['Getting there', 'getting'], ['Solid', 'solid'], ['Not studied', 'new']].map(([lab, k, dot]) => { const m = k === 'new' ? null : markOf(t, k); return { label: lab, n: String(count(k)), sw: m ? m.fill : t.bg, dot: !!dot, ring: m ? m.stroke : t.line }; });
    // Test me's choices: what to hide (This branch only with an idea selected) and how to show it.
    const hideK = st.hide || 'all', showK = st.show || (phone ? 'one' : 'map');
    const choice = (key, lab, on, off, go) => ({ label: lab, on: on ? 'true' : 'false', bg: on ? t.inv : te.surf, fg: on ? t.invText : off ? t.muted : t.text, off: off ? 'true' : 'false', mark: on, pick: off ? noop : go });
    const hide = [['all', 'Everything'], ['weak', 'Weak ones (' + study.weak + ')'], ['branch', selNode ? 'This branch: ' + selNode.label : 'This branch']].map(([k, lab]) => choice(k, lab, hideK === k && !(k === 'branch' && !selNode), k === 'branch' && !selNode, () => set({ hide: k })));
    const show = [['map', 'On the map'], ['one', 'One at a time']].map(([k, lab]) => choice(k, lab, showK === k, false, () => set({ show: k })));
    // The test's progress, the reveal and the marks.
    const crumbs = current && by0.get(current) ? by0.get(current).path.concat(shown ? label(current) : '?').join(' › ') : '';
    const missedList = v === 'test done' ? MISSED.map(id => { const x = by0.get(id); return { label: x.n.label, path: x.path.join(' › '), noCard: !(x.n.cardIds || []).length, addCard: noop }; }) : [];
    const missedCards = MISSED.reduce((n, id) => n + ((by0.get(id) || { n: {} }).n.cardIds || []).length, 0);
    // The outline: one row per idea, bound to its id (the ids themselves never show).
    const rows = [];
    (function walk(n, level, setsize, pos) {
      const kids = Array.isArray(n.children) ? n.children : [], f = folds[n.id] !== undefined && folds[n.id] !== null ? !!folds[n.id] : !!n.folded;
      rows.push({ id: n.id, label: n.label || title, level: String(level + 1), pad: (phone ? 12 : 16) + level * (phone ? 22 : 26) + 'px', root: level === 0, hasKids: kids.length > 0, open: kids.length > 0 && !f, turn: f ? '0deg' : '90deg', expanded: kids.length ? (f ? 'false' : 'true') : null,
        hasNote: !!n.note, note: n.note || '', cards: (n.cardIds || []).length ? plural(n.cardIds.length, 'card') : '', hasCards: !!(n.cardIds || []).length, folded: f, inside: f ? plural(kids.length, 'idea') + ' inside' : '',
        bg: n.id === sel ? t.surf : 'transparent', selected: n.id === sel ? 'true' : 'false', size: level === 0 ? (phone ? '20px' : '22px') : level === 1 ? '16px' : '15px', weight: level < 2 ? 600 : 400,
        setsize: String(setsize), posinset: String(pos), shows: true, editing: false, field: '', pick: noop, toggle: noop });
      if (!f) kids.forEach((k, i) => walk(k, level + 1, kids.length, i + 1));
    })(data.root, 0, 1, 1);
    const rr = R(data.root.id);
    const toggle = k => () => set({ [k]: !(k === 'outline' ? outline : k === 'weak' ? weakOn : k === 'sheet' ? sheetOpen : st[k]) });
    const card = sel && selNode ? { front: selNode.label, back: (selNode.children || []).map(x => '- ' + x.label).join('\n') || selNode.note || '' } : null;
    // The phone's two toggles (Weak spots, Outline): gray when off, a darker gray with a ring and a check when on.
    const tog = on => ({ bg: on ? alpha(t.text, dark ? 0.2 : 0.1) : t.surf, ring: on ? t.text : 'transparent', check: on, pressed: on ? 'true' : 'false' });
    const ideaMore = !!st.ideaMore && barOpen;
    return {
      on: true, page: { title, version, by, ai, when, kind: 'mindmap' }, make: make && card ? card : null, te,
      mapRef: refOf(svg, pick), showMap: !outline, showOutline: outline, stageW: G.W + 'px', stageH: G.H + 'px', mapLabel: 'Mind map: ' + (data.root.label || title),
      seg: [{ ...PILL(!outline, 'Map'), pick: () => set({ outline: false }) }, { ...PILL(outline, 'Outline'), pick: () => set({ outline: true }) }],
      hasWeak: v !== 'new', weakLabel: 'Weak spots · ' + study.weak, weakPressed: weakOn ? 'true' : 'false', weakBg: weakOn ? t.inv : t.bg, weakFg: weakOn ? t.invText : t.text, toggleWeak: toggle('weak'),
      weakTog: tog(weakOn), outlineTog: tog(outline), toggleOutline: toggle('outline'), outlinePressed: outline ? 'true' : 'false',
      zoomIn: noop, zoomOut: noop, fit: noop, addIdea: noop, endTest: noop, treeKey: noop, treeRef: noop, editRef: noop, editKey: noop, editInput: noop, editBlur: noop, foldAllDo: noop, makeAgain: noop,
      mark: { missed: () => set({ shown: false }), knew: () => set({ shown: false }) },
      zoom: Math.round(c.z * 100) + '%', showZoom: !outline && !make && !(v === 'test done' && st.done !== false), noop, hasTest: v !== 'new', testBg: sheetOpen ? t.surf : t.inv, testFg: sheetOpen ? t.text : t.invText, openTest: toggle('sheet'), testExpanded: sheetOpen ? 'true' : 'false',
      // the idea bar, and its ⋯ (Start folded, Test this branch, Delete)
      bar: { open: barOpen, label: selNode ? selNode.label : '', hasNote: !!(selNode && selNode.note), note: selNode && selNode.note ? selNode.note : '', addNote: !(selNode && selNode.note),
        cardsLine: selCards.length ? plural(selCards.length, 'card') + (selWeak ? ' · ' + selWeak + ' weak' : '') : 'No cards yet', cardsWeak: selWeak > 0,
        canFold: !!lNode && lNode.kids > 0, foldLabel: lNode && lNode.folded ? 'Unfold' : 'Fold', keyboard: phone && v === 'writing an idea', idle: !(phone && v === 'writing an idea'), field: v === 'writing an idea' ? 'ATP synth' : selNode ? selNode.label : '',
        openCards: () => set({ cards: true }), deselect: () => set({ sel: '', ideaMore: false }), more: () => set({ ideaMore: !st.ideaMore }), moreExpanded: ideaMore ? 'true' : 'false',
        noteEditing: false, editable: true, setLabel: noop, labelKey: noop, labelBlur: noop, editNote: noop, setNote: noop, noteBlur: noop, noteRef: noop, addIdea: noop, makeCard: noop, fold: noop, keyOutdent: noop, keyIndent: noop, keyUp: noop, keyDown: noop, keyDone: noop },
      ideaMenu: { open: ideaMore, title: selNode ? selNode.label : '', startsFolded: !!(selNode && selNode.folded), foldedAttr: selNode && selNode.folded ? 'true' : 'false', canFold: !!lNode && lNode.kids > 0, close: () => set({ ideaMore: false }),
        testBranch: () => set({ ideaMore: false, sheet: true, hide: 'branch' }), toggleFolded: noop, remove: noop },
      fresh: { fromCards: noop, aiLeft: 'Lucida AI (2 left today)', open: v === 'new', x: r1(Math.max(16, rr.x + rr.w / 2 - 230)) + 'px', y: r1(rr.y + rr.h + 22) + 'px' },
      cardsPop: { open: !!selNode && cardsOpen, x: r1(popX) + 'px', y: r1(popY) + 'px', title: selNode ? selNode.label : '', linked, hasLinked: linked.length > 0, matches, studyLabel: selCards.length === 1 ? 'Study this card' : 'Study these ' + selCards.length + ' cards', close: () => set({ cards: false }),
        matchLabel: 'Best matches in Cell Biology', none: false, canStudy: true, search: noop, study: noop },
      legend: { open: weakOn && !outline, rows: legend, test: noop },
      sheet: { open: sheetOpen, hide, show, start: () => set({ sheet: false }), close: () => set({ sheet: false }) },
      progress: { line: doneN + ' of ' + testN + ' · ' + plural(missedN, 'missed', 'missed') },
      markBar: { open: v === 'testing' && !phone, label: current ? label(current) : '', hint: 'Did you know it? 1 is Missed, 2 Knew it.', shown: true, hidden: false, show: noop },
      one: { open: v === 'one at a time', crumbs, shown, hidden: !shown, show: () => set({ shown: true }), again: () => set({ shown: false }) },
      testBar: { open: phone && v === 'testing' },
      done: { open: v === 'test done' && st.done !== false, title: 'You knew ' + (testN - MISSED.length) + ' of ' + testN, missed: missedList, again: 'Test the ' + MISSED.length + ' again', study: 'Study their ' + plural(missedCards, 'card'), close: () => set({ done: false }),
        hasMissed: true, hasAgain: true, hasStudy: true, hasNone: false, retest: noop, studyCards: noop },
      live: { open: v === 'changed by your AI' && st.live !== false, line: by + ' added ' + plural(added.length, 'idea') + ' · v' + version, dismiss: () => set({ live: false }), versions: noop, top: '16px', maxW: '640px' },
      toast: { open: false, line: '', undo: noop, close: noop, bottom: '16px' },
      rows, foldAll: (L.nodes.some(n => n.folded) ? 'Unfold all' : 'Fold to main ideas'),
      bottom: phone && !barOpen && v !== 'testing' && v !== 'one at a time', kbPanel: dark ? te.surf : t.surf2, kbKey: dark ? te.surf2 : t.bg,
      ideas: study.ideas, weak: study.weak,
      // (for design/check.mjs: boxes that overlap, and what hangs off a box touching another box or row)
      check: { overlaps: overlaps(L), clashes: clashes(L, data, { ...art, small: phone ? small : Math.max(small, r1(11 / c.z)), chip: phone ? chip : Math.max(chip, r1(11 / c.z)) }) }
    };
  }
  return { draw, preview, previewModel, overlaps, clashes, cam, frame, fitIn, tonesOf, studyOf, index, model, refOf, markOf, raisedOf, boxesOf, extrasOf, branchOf, stages: STAGES };
}
export const mapArt = makeMapArt(MAP_SAMPLE);
export const MAP_ART_METHOD = `mapArt() { return Component._mapArt || (Component._mapArt = (${makeMapArt.toString()})(${JSON.stringify(MAP_SAMPLE)})); }`;

// The boards' CSS for maps: the stage never selects text or scrolls the page, and with Reduce Motion nothing on it moves.
export const MAP_CSS = [
  '.mp-stage{touch-action:none;user-select:none;-webkit-user-select:none}.mp-stage svg text{font-family:inherit}',
  `.mp-glide g[data-id]{transition:transform ${MOTION.reveal}s ${EASE}}`,
  '@media (prefers-reduced-motion:reduce){.mp-glide g[data-id]{transition:none}}'
].join('');

// ---------- the Mind map page's markup, for design/pages.mjs (one stage on a computer, the phone's own bars on an iPhone) ----------
// H: svg and I from build.mjs. Everything here is under `mp` in the page's values (see model above), shown only for a map page.
export const MAP_ICONS = {
  bin: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  fold: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  test: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  minus: '<path d="M5 12h14"/>',
  card: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 10h8M8 14h5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  outdent: '<path d="M21 6H11M21 12H11M21 18H11M7 9l-3 3 3 3"/>',
  indent: '<path d="M21 6H11M21 12H11M21 18H11M4 9l3 3-3 3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  update: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  ideaAdd: '<rect x="3" y="9" width="8" height="6" rx="2"/><path d="M11 12h3M18 9v6M15 12h6"/>'
};
export function mapPage(H, phone) {
  const { svg, I } = H;
  const icon = (name, size = 16, w = 2) => svg(I[name] || MAP_ICONS[name], size, w);
  const PILL = 'flex-shrink: 0; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap;';
  // (popovers, sheets and the idea bar sit on a raised surface, mp.te: the page's own colors in the light, a gray a step above the
  // black page in the dark, with a hairline edge; a phone's sheet has its grabber)
  const raise = s => s.replace(/\{\{t\.(bg|surf|surf2|line)\}\}/g, '{{mp.te.$1}}');
  const POP = 'box-sizing: border-box; border-radius: 20px; background: {{mp.te.bg}}; color: {{t.text}}; box-shadow: 0 0 0 1px {{mp.te.line}}, 0 18px 44px rgba(0,0,0,.22);';
  const SHEET = 'position: absolute; left: 0; right: 0; bottom: 0; z-index: 61; box-sizing: border-box; padding: 18px 16px 34px; border-radius: 28px 28px 0 0; background: {{mp.te.bg}}; color: {{t.text}}; box-shadow: inset 0 1px 0 {{mp.te.line}}; display: flex; flex-direction: column; gap: 14px;';
  const GRAB = '<span aria-hidden="true" style="align-self: center; flex-shrink: 0; width: 36px; height: 5px; margin: -8px 0 -2px; border-radius: 3px; background: {{mp.te.line}};"></span>';
  const T = phone ? 44 : 34, FS = phone ? 15 : 13;
  // (small parts)
  const segBtn = `<div role="group" aria-label="Show as" style="display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{mp.seg}}" as="o" hint-placeholder-count="2"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.pressed}}" style="${PILL} height: ${T - 6}px; padding: 0 14px; font-size: ${FS}px; background: {{o.bg}}; color: {{o.fg}};">{{o.label}}</button></sc-for></div>`;
  const weakBtn = `<sc-if value="{{mp.hasWeak}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{mp.toggleWeak}}" aria-pressed="{{mp.weakPressed}}" style="${PILL} height: ${T}px; padding: 0 14px; font-size: ${FS}px; background: {{mp.weakBg}}; color: {{mp.weakFg}}; box-shadow: 0 0 0 1px {{t.line}};"><span aria-hidden="true" style="width: 8px; height: 8px; border-radius: 4px; background: {{t.again}};"></span>{{mp.weakLabel}}</button></sc-if>`;
  const linkedCard = `<div style="padding: 12px 14px; border-radius: 16px; background: {{mp.te.surf}}; display: flex; align-items: flex-start; gap: 10px;"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;"><span style="font-size: ${phone ? 15 : 14}px; font-weight: 600; line-height: 1.35;">{{c.front}}</span><span style="font-size: ${phone ? 14 : 13}px; line-height: 1.4; color: {{t.muted}};">{{c.back}}</span><sc-if value="{{c.weak}}" hint-placeholder-val="{{ false }}"><span style="align-self: flex-start; margin-top: 4px; height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 11px; background: {{t.againTint}}; color: {{t.again}}; font-size: ${phone ? 13 : 12}px; font-weight: 600;">Weak spot</span></sc-if></span><button type="button" onClick="{{c.unlink}}" aria-label="Unlink this card" data-tip="Unlink" style="${PILL} width: ${phone ? 44 : 30}px; height: ${phone ? 44 : 30}px; margin: ${phone ? '-8px -8px 0 0' : '0'}; background: transparent; color: {{t.muted}};">${icon('close', 14, 2)}</button></div>`;
  const matchRow = `<div style="min-height: ${phone ? 56 : 48}px; padding: 6px 4px 6px 12px; display: flex; align-items: center; gap: 10px; border-top: 1px solid {{mp.te.line}};"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;"><span style="font-size: ${phone ? 15 : 14}px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{c.front}}</span><span style="font-size: 13px; color: {{t.muted}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{c.back}}</span></span><button type="button" onClick="{{c.link}}" class="sc-press" style="${PILL} height: ${phone ? 44 : 30}px; padding: 0 12px; font-size: 13px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('plus', 12, 2.4)}Link</button></div>`;
  const cardsBody = `<div style="display: flex; align-items: flex-start; gap: 10px;"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 13px; font-weight: 600; color: {{t.muted}};">Cards of this idea</span><span style="font-size: ${phone ? 17 : 15}px; font-weight: 600; line-height: 1.35;">{{mp.cardsPop.title}}</span></span><button type="button" onClick="{{mp.cardsPop.close}}" aria-label="Close" style="${PILL} width: ${phone ? 44 : 32}px; height: ${phone ? 44 : 32}px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('close', 14, 2)}</button></div>
      <sc-for list="{{mp.cardsPop.linked}}" as="c" hint-placeholder-count="1">${linkedCard}</sc-for>
      <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Link a card</span><label style="height: ${phone ? 44 : 38}px; box-sizing: border-box; padding: 0 12px; border-radius: 12px; background: {{mp.te.surf}}; display: flex; align-items: center; gap: 8px; color: {{t.muted}};">${icon('search', 15, 2)}<input type="text" onChange="{{mp.cardsPop.search}}" aria-label="Search this deck’s cards" placeholder="Search this deck’s cards" autocomplete="off" style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: ${phone ? 16 : 14}px;"></label>
        <span style="font-size: 13px; color: {{t.muted}};">{{mp.cardsPop.matchLabel}}</span><div style="display: flex; flex-direction: column;"><sc-for list="{{mp.cardsPop.matches}}" as="c" hint-placeholder-count="3">${matchRow}</sc-for><sc-if value="{{mp.cardsPop.none}}" hint-placeholder-val="{{ false }}"><span style="padding: 10px 12px; font-size: 13px; color: {{t.muted}}; border-top: 1px solid {{mp.te.line}};">No cards with those words.</span></sc-if></div></div>
      <sc-if value="{{mp.cardsPop.canStudy}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{mp.cardsPop.study}}" class="sc-press" style="${PILL} height: ${phone ? 52 : 42}px; padding: 0 18px; font-size: 15px; background: {{t.inv}}; color: {{t.invText}};">${icon('play', 14, 2.2)}{{mp.cardsPop.studyLabel}}</button></sc-if>`;
  const choice = list => `<div style="display: flex; flex-direction: ${phone ? 'column' : 'row'}; flex-wrap: wrap; gap: ${phone ? 6 : 6}px;"><sc-for list="{{${list}}}" as="o" hint-placeholder-count="3"><button type="button" onClick="{{o.pick}}" aria-pressed="{{o.on}}" aria-disabled="{{o.off}}" style="${PILL} ${phone ? 'width: 100%; justify-content: flex-start; height: 48px; padding: 0 16px; border-radius: 14px; font-size: 15px;' : 'height: 34px; padding: 0 14px; font-size: 13px;'} background: {{o.bg}}; color: {{o.fg}};"><span style="flex-grow: ${phone ? 1 : 0}; text-align: left;">{{o.label}}</span><sc-if value="{{o.mark}}" hint-placeholder-val="{{ false }}">${phone ? icon('check', 16, 2.4) : ''}</sc-if></button></sc-for></div>`;
  const sheetBody = `<div style="display: flex; align-items: center; gap: 10px;"><span style="flex-grow: 1; font-size: ${phone ? 20 : 17}px; font-weight: 600; letter-spacing: -.01em;">Test me</span><button type="button" onClick="{{mp.sheet.close}}" aria-label="Close" style="${PILL} width: ${phone ? 44 : 32}px; height: ${phone ? 44 : 32}px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('close', 14, 2)}</button></div>
      <span style="font-size: ${phone ? 15 : 14}px; line-height: 1.45; color: {{t.muted}};">The words go; say each one before you show it. Lucida keeps what you knew and missed.</span>
      <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Hide</span>${choice('mp.sheet.hide')}</div>
      <div style="display: flex; flex-direction: column; gap: 8px;"><span style="font-size: 13px; font-weight: 600;">Show</span>${choice('mp.sheet.show')}</div>
      <div style="display: flex; gap: 8px; ${phone ? '' : 'justify-content: flex-end;'}"><button type="button" onClick="{{mp.sheet.close}}" class="sc-press" style="${PILL} ${phone ? 'flex: 1 1 0; height: 52px;' : 'height: 38px;'} padding: 0 18px; font-size: 15px; background: {{mp.te.surf}}; color: {{t.text}};">Cancel</button><button type="button" onClick="{{mp.sheet.start}}" class="sc-press" style="${PILL} ${phone ? 'flex: 2 1 0; height: 52px;' : 'height: 38px;'} padding: 0 22px; font-size: 15px; background: {{t.inv}}; color: {{t.invText}};">Start</button></div>`;
  const doneBody = `<div style="display: flex; align-items: flex-start; gap: 10px;"><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 4px;"><span style="font-size: ${phone ? 24 : 26}px; font-weight: 600; letter-spacing: -.02em;">{{mp.done.title}}</span><span style="font-size: ${phone ? 15 : 14}px; color: {{t.muted}};">Saved for this map. The ones you missed show in Weak spots.</span></span><button type="button" onClick="{{mp.done.close}}" aria-label="Close" style="${PILL} width: ${phone ? 44 : 32}px; height: ${phone ? 44 : 32}px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('close', 14, 2)}</button></div>
      <sc-if value="{{mp.done.hasMissed}}" hint-placeholder-val="{{ true }}"><div style="display: flex; flex-direction: column;"><span style="padding-bottom: 6px; font-size: 13px; font-weight: 600;">Missed</span><sc-for list="{{mp.done.missed}}" as="m" hint-placeholder-count="4"><div style="min-height: ${phone ? 56 : 50}px; padding: 6px 0; display: flex; align-items: center; gap: 10px; border-top: 1px solid {{mp.te.line}};"><span aria-hidden="true" style="width: 10px; height: 10px; flex-shrink: 0; box-sizing: border-box; border-radius: 5px; border: 2px solid {{t.again}};"></span><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;"><span style="font-size: ${phone ? 15 : 14}px; font-weight: 600;">{{m.label}}</span><span style="font-size: 13px; color: {{t.muted}};">{{m.path}}</span></span><sc-if value="{{m.noCard}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{m.addCard}}" class="sc-press" style="${PILL} height: ${phone ? 44 : 30}px; padding: 0 12px; font-size: 13px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('plus', 12, 2.4)}Card</button></sc-if></div></sc-for></div></sc-if>
      <div style="display: flex; flex-direction: ${phone ? 'column' : 'row'}; gap: 8px;"><sc-if value="{{mp.done.hasAgain}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{mp.done.retest}}" class="sc-press" style="${PILL} ${phone ? 'height: 52px;' : 'flex: 1 1 0; height: 44px;'} padding: 0 18px; font-size: 15px; background: {{t.inv}}; color: {{t.invText}};">{{mp.done.again}}</button></sc-if><sc-if value="{{mp.done.hasStudy}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{mp.done.studyCards}}" class="sc-press" style="${PILL} ${phone ? 'height: 52px;' : 'flex: 1 1 0; height: 44px;'} padding: 0 18px; font-size: 15px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('play', 13, 2.2)}{{mp.done.study}}</button></sc-if><sc-if value="{{mp.done.hasNone}}" hint-placeholder-val="{{ false }}"><button type="button" onClick="{{mp.done.close}}" class="sc-press" style="${PILL} ${phone ? 'height: 52px;' : 'flex: 1 1 0; height: 44px;'} padding: 0 18px; font-size: 15px; background: {{t.inv}}; color: {{t.invText}};">Done</button></sc-if></div>`;
  const legend = `<sc-if value="{{mp.legend.open}}" hint-placeholder-val="{{ false }}"><div role="group" aria-label="Weak spots" class="sc-pop" style="${POP} ${phone ? 'position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 12px 14px;' : 'position: absolute; right: 16px; top: 60px; width: 236px; padding: 14px;'} z-index: 20; display: flex; flex-direction: ${phone ? 'column' : 'column'}; gap: ${phone ? 10 : 8}px;">
      <div style="display: ${phone ? 'grid' : 'flex'}; ${phone ? 'grid-template-columns: 1fr 1fr; gap: 6px 12px;' : 'flex-direction: column; gap: 6px;'}"><sc-for list="{{mp.legend.rows}}" as="r" hint-placeholder-count="4"><div style="display: flex; align-items: center; gap: 8px; font-size: ${phone ? 14 : 13}px;"><span aria-hidden="true" style="position: relative; width: 22px; height: 14px; flex-shrink: 0; box-sizing: border-box; border-radius: 5px; background: {{r.sw}}; box-shadow: inset 0 0 0 1.5px {{r.ring}};"><sc-if value="{{r.dot}}" hint-placeholder-val="{{ false }}"><span style="position: absolute; right: 2px; top: 2px; width: 5px; height: 5px; border-radius: 3px; background: {{t.again}};"></span></sc-if></span><span style="flex-grow: 1;">{{r.label}}</span><span style="font-weight: 600;">{{r.n}}</span></div></sc-for></div>
      <button type="button" onClick="{{mp.legend.test}}" class="sc-press" style="${PILL} height: ${phone ? 44 : 34}px; padding: 0 14px; font-size: ${phone ? 15 : 13}px; background: {{t.inv}}; color: {{t.invText}};">Test the weak ones</button>
    </div></sc-if>`;
  const live = `<sc-if value="{{mp.live.open}}" hint-placeholder-val="{{ false }}"><div role="status" class="sc-pop" style="${POP} position: absolute; ${phone ? 'left: 12px; right: 12px; top: 10px; border-radius: 22px;' : 'left: 0; right: 0; top: {{mp.live.top}}; margin: 0 auto; width: fit-content; max-width: {{mp.live.maxW}}; border-radius: 22px;'} z-index: 22; padding: 6px 6px 6px 14px; display: flex; align-items: center; gap: 8px; font-size: 14px;"><span style="display: flex; flex-shrink: 0;">${icon('sparkle', 14, 2)}</span><span style="flex-grow: 1; min-width: 0; line-height: 1.35;">{{mp.live.line}}</span><button type="button" onClick="{{mp.live.versions}}" class="sc-press" style="${PILL} height: ${phone ? 44 : 30}px; padding: 0 12px; font-size: 13px; background: {{mp.te.surf}}; color: {{t.text}};">Versions</button><button type="button" onClick="{{mp.live.dismiss}}" aria-label="Dismiss" style="${PILL} width: ${phone ? 44 : 30}px; height: ${phone ? 44 : 30}px; background: transparent; color: {{t.muted}};">${icon('close', 13, 2)}</button></div></sc-if>`;
  // (the map's own toast, a delete's, with its Undo: over the idea bar on a computer, at the top on a phone)
  const toast = `<sc-if value="{{mp.toast.open}}" hint-placeholder-val="{{ false }}"><div role="status" class="sc-pop" style="${POP} position: absolute; ${phone ? 'left: 12px; right: 12px; top: 10px;' : 'left: 0; right: 0; bottom: {{mp.toast.bottom}}; margin: 0 auto; width: fit-content; max-width: min(560px, calc(100% - 32px));'} border-radius: 22px; z-index: 23; padding: 6px 6px 6px 16px; display: flex; align-items: center; gap: 8px; font-size: 14px;"><span style="flex-grow: 1; min-width: 0; line-height: 1.35;">{{mp.toast.line}}</span><button type="button" onClick="{{mp.toast.undo}}" class="sc-press" style="${PILL} height: ${phone ? 44 : 30}px; padding: 0 14px; font-size: 13px; background: {{mp.te.surf}}; color: {{t.text}};">Undo</button><button type="button" onClick="{{mp.toast.close}}" aria-label="Dismiss" style="${PILL} width: ${phone ? 44 : 30}px; height: ${phone ? 44 : 30}px; background: transparent; color: {{t.muted}};">${icon('close', 13, 2)}</button></div></sc-if>`;
  const bigBtn = (label, handler, bg, fg, attrs = '') => `<button type="button" onClick="{{${handler}}}" ${attrs} class="sc-press" style="${PILL} flex: 1 1 0; height: ${phone ? 56 : 52}px; padding: 0 22px; font-size: 16px; background: ${bg}; color: ${fg};">${label}</button>`;
  const markBtns = () => `${bigBtn('Missed', 'mp.mark.missed', '{{t.againTint}}', '{{t.again}}', 'data-key="1"')}${bigBtn('Knew it', 'mp.mark.knew', '{{t.goodTint}}', '{{t.good}}', 'data-key="2"')}`;
  // (a test's progress and End, at the top of its bottom panel, the same in both ways of showing it)
  const testTop = `<div style="display: flex; align-items: center; gap: 8px; min-height: ${phone ? 44 : 30}px;"><span role="status" style="flex-grow: 1; font-size: ${phone ? 15 : 14}px; font-weight: 600;">{{mp.progress.line}}</span><button type="button" onClick="{{mp.endTest}}" class="sc-press" style="${PILL} height: ${phone ? 44 : 30}px; padding: 0 ${phone ? 16 : 12}px; font-size: ${phone ? 14 : 13}px; background: {{t.surf}}; color: {{t.text}};">End</button></div>`;
  const onePanel = `<sc-if value="{{mp.one.open}}" hint-placeholder-val="{{ false }}"><div style="${phone ? 'position: absolute; left: 0; right: 0; bottom: 0; z-index: 30; padding: 14px 16px 34px; border-radius: 28px 28px 0 0; box-shadow: 0 -1px 0 {{mp.te.line}};' : POP + ' position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 30; width: 440px; padding: 14px;'} box-sizing: border-box; background: {{mp.te.bg}}; display: flex; flex-direction: column; gap: 10px;">
      ${testTop}
      <span style="text-align: center; font-size: ${phone ? 16 : 15}px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{mp.one.crumbs}}</span>
      <span style="text-align: center; font-size: 13px; color: {{t.muted}};">${phone ? 'Say it, then show it.' : 'Say it to yourself, then show it (Space).'}</span>
      <sc-if value="{{mp.one.hidden}}" hint-placeholder-val="{{ true }}"><div style="display: flex;">${bigBtn('Show', 'mp.one.show', '{{t.inv}}', '{{t.invText}}', 'data-key="space"')}</div></sc-if>
      <sc-if value="{{mp.one.shown}}" hint-placeholder-val="{{ false }}"><div style="display: flex; gap: 8px;">${markBtns()}</div></sc-if>
    </div></sc-if>`;
  const fresh = `<sc-if value="{{mp.fresh.open}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; ${phone ? 'left: 16px; right: 16px;' : 'left: {{mp.fresh.x}}; width: 460px;'} top: {{mp.fresh.y}}; z-index: 20; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;">
      <span style="font-size: ${phone ? 15 : 14}px; line-height: 1.5; color: {{t.muted}}; text-wrap: balance;">Type the topic, then Tab adds an idea under it. Or ask your AI: “Make a mind map of this deck in Lucida.”</span>
      <button type="button" onClick="{{mp.fresh.fromCards}}" class="sc-press" style="${PILL} max-width: 100%; min-height: ${phone ? 52 : 44}px; padding: 6px 20px 6px 16px; gap: 10px; font-size: 14px; line-height: 1.3; white-space: normal; background: {{t.surf}}; color: {{t.text}};">${icon('sparkle', 15, 2)}<span style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;"><span>From this deck’s cards</span><span style="font-size: 13px; font-weight: 500; color: {{t.muted}};">{{mp.fresh.aiLeft}}</span></span></button>
    </div></sc-if>`;
  const outline = `<sc-if value="{{mp.showOutline}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; overflow-y: auto; scrollbar-width: none;"><div role="tree" tabindex="0" onKeyDown="{{mp.treeKey}}" ref="{{mp.treeRef}}" aria-label="Outline of {{mp.mapLabel}}" style="${phone ? 'padding: 8px 8px 120px;' : 'max-width: 760px; margin: 0 auto; padding: 72px 24px 80px;'} box-sizing: border-box; display: flex; flex-direction: column; gap: 2px; outline: none;">
      <sc-for list="{{mp.rows}}" as="r" hint-placeholder-count="8"><div role="treeitem" onClick="{{r.pick}}" aria-level="{{r.level}}" aria-setsize="{{r.setsize}}" aria-posinset="{{r.posinset}}" aria-expanded="{{r.expanded}}" aria-selected="{{r.selected}}" style="min-height: ${phone ? 48 : 40}px; box-sizing: border-box; padding: ${phone ? 4 : 6}px 10px ${phone ? 4 : 6}px {{r.pad}}; border-radius: 12px; background: {{r.bg}}; display: flex; align-items: flex-start; gap: 6px;">
        <span aria-hidden="true" onClick="{{r.toggle}}" style="width: ${phone ? 40 : 24}px; height: ${phone ? 40 : 28}px; flex-shrink: 0; margin-left: ${phone ? -10 : -4}px; display: flex; align-items: center; justify-content: center; color: {{t.muted}}; cursor: pointer;"><sc-if value="{{r.hasKids}}" hint-placeholder-val="{{ true }}"><span style="display: flex; transform: rotate({{r.turn}});">${icon('chev', 13, 2.4)}</span></sc-if></span>
        <span style="flex-grow: 1; min-width: 0; padding-top: ${phone ? 9 : 3}px; display: flex; flex-direction: column; gap: 3px;"><span style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;"><sc-if value="{{r.shows}}" hint-placeholder-val="{{ true }}"><span style="font-size: {{r.size}}; font-weight: {{r.weight}}; line-height: 1.35;">{{r.label}}</span></sc-if><sc-if value="{{r.editing}}" hint-placeholder-val="{{ false }}"><input type="text" value="{{r.field}}" onChange="{{mp.editInput}}" onKeyDown="{{mp.editKey}}" onBlur="{{mp.editBlur}}" ref="{{mp.editRef}}" aria-label="Idea" autocomplete="off" style="min-width: 200px; flex-grow: 1; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: {{r.size}}; font-weight: {{r.weight}}; line-height: 1.35;"></sc-if><sc-if value="{{r.folded}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; color: {{t.muted}};">{{r.inside}}</span></sc-if><sc-if value="{{r.hasCards}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px; color: {{t.muted}};">{{r.cards}}</span></sc-if></span><sc-if value="{{r.hasNote}}" hint-placeholder-val="{{ false }}"><span style="font-size: 14px; line-height: 1.45; color: {{t.muted}};">{{r.note}}</span></sc-if></span>
      </div></sc-for>
    </div></div></sc-if>`;
  // The idea's ⋯ (Start folded, Test this branch, Delete): a menu over the bar on a computer, a sheet on an iPhone.
  const ideaItem = (handler, ic, label, role = 'menuitem', check = false, danger = false) => `<button type="button" role="${role}" onClick="{{${handler}}}"${check ? ' aria-checked="{{mp.ideaMenu.foldedAttr}}"' : ''} style="min-height: ${phone ? 52 : 40}px; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 12px; background: transparent; color: ${danger ? '{{t.again}}' : '{{t.text}}'}; font: inherit; font-size: ${phone ? 16 : 14}px; font-weight: 500; text-align: left; cursor: pointer;">${icon(ic, 16, 2)}<span style="flex-grow: 1;">${label}</span>${check ? `<sc-if value="{{mp.ideaMenu.startsFolded}}" hint-placeholder-val="{{ false }}">${icon('check', 15, 2.4)}</sc-if>` : ''}</button>`;
  const map = `<sc-if value="{{mp.showMap}}" hint-placeholder-val="{{ true }}"><div ref="{{mp.mapRef}}" data-sc-own class="mp-stage" style="position: absolute; left: 0; top: 0; width: {{mp.stageW}}; height: {{mp.stageH}};"></div></sc-if>`;

  if (!phone) {
    // ---------- a computer ----------
    const barBtn = (label, ic, handler = 'mp.noop') => `<button type="button" onClick="{{${handler}}}" class="sc-press" style="${PILL} height: 34px; padding: 0 12px; font-size: 13px; background: {{mp.te.surf}}; color: {{t.text}};">${ic ? icon(ic, 14, 2.2) : ''}${label}</button>`;
    const menuItems = ideaItem('mp.ideaMenu.toggleFolded', 'fold', 'Start folded', 'menuitemcheckbox', true) + ideaItem('mp.ideaMenu.testBranch', 'test', 'Test this branch') + ideaItem('mp.ideaMenu.remove', 'bin', 'Delete', 'menuitem', false, true);
    const bar = `<sc-if value="{{mp.bar.open}}" hint-placeholder-val="{{ false }}"><div role="group" aria-label="This idea" data-sc-pop style="${POP} position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 25; width: 560px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
        <input type="text" value="{{mp.bar.field}}" onChange="{{mp.bar.setLabel}}" onKeyDown="{{mp.bar.labelKey}}" onBlur="{{mp.bar.labelBlur}}" aria-label="Idea" autocomplete="off" style="width: 100%; box-sizing: border-box; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 17px; font-weight: 600;">
        <sc-if value="{{mp.bar.hasNote}}" hint-placeholder-val="{{ true }}"><span onClick="{{mp.bar.editNote}}" style="font-size: 14px; line-height: 1.45; color: {{t.muted}}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{mp.bar.note}}</span></sc-if>
        <sc-if value="{{mp.bar.addNote}}" hint-placeholder-val="{{ false }}"><span onClick="{{mp.bar.editNote}}" style="font-size: 14px; color: {{t.muted}}; cursor: text;">Add a note</span></sc-if>
        <sc-if value="{{mp.bar.noteEditing}}" hint-placeholder-val="{{ false }}"><textarea rows="4" onChange="{{mp.bar.setNote}}" onBlur="{{mp.bar.noteBlur}}" ref="{{mp.bar.noteRef}}" aria-label="Note" placeholder="What to remember about it" style="width: 100%; box-sizing: border-box; padding: 0; border: 0; outline: 0; resize: none; background: transparent; color: {{t.text}}; font: inherit; font-size: 14px; line-height: 1.45;">{{mp.bar.note}}</textarea></sc-if>
        <div style="display: flex; align-items: center; gap: 6px; padding-top: 4px;"><span style="flex-grow: 1; font-size: 13px; color: {{t.muted}};">{{mp.bar.cardsLine}}</span><sc-if value="{{mp.bar.editable}}" hint-placeholder-val="{{ true }}">${barBtn('Idea', 'plus', 'mp.bar.addIdea')}</sc-if>${barBtn('Cards', 'card', 'mp.bar.openCards')}<sc-if value="{{mp.bar.editable}}" hint-placeholder-val="{{ true }}">${barBtn('Card', 'plus', 'mp.bar.makeCard')}</sc-if><sc-if value="{{mp.bar.canFold}}" hint-placeholder-val="{{ true }}">${barBtn('{{mp.bar.foldLabel}}', 'fold', 'mp.bar.fold')}</sc-if><button type="button" onClick="{{mp.bar.more}}" aria-label="More for this idea" aria-haspopup="menu" aria-expanded="{{mp.bar.moreExpanded}}" data-tip="More" style="${PILL} width: 34px; height: 34px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('more', 16, 2)}</button></div>
        <sc-if value="{{mp.ideaMenu.open}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="More for this idea" data-sc-pop style="${POP} position: absolute; right: 8px; bottom: calc(100% + 8px); z-index: 2; width: 240px; padding: 6px; border-radius: 18px; display: flex; flex-direction: column; gap: 2px;">${menuItems}</div></sc-if>
      </div></sc-if>`;
    // (opened from the idea bar's Cards, so it sits over the bar's right end)
    const cardsPop = `<sc-if value="{{mp.cardsPop.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Cards of this idea" data-sc-pop style="${POP} position: absolute; left: {{mp.cardsPop.x}}; top: {{mp.cardsPop.y}}; z-index: 30; width: 360px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">${cardsBody}</div></sc-if>`;
    const sheet = `<sc-if value="{{mp.sheet.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Test me" data-sc-pop style="${POP} position: absolute; right: 16px; top: 12px; z-index: 40; width: 400px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">${sheetBody}</div></sc-if>`;
    const done = `<sc-if value="{{mp.done.open}}" hint-placeholder-val="{{ false }}"><div style="position: absolute; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center;"><div class="sc-fade" onClick="{{mp.done.close}}" style="position: absolute; inset: 0; background: {{t.dim}};"></div><div role="dialog" aria-modal="true" aria-label="Test done" class="sc-pop" style="${POP} position: relative; width: 480px; padding: 22px; border-radius: 28px; display: flex; flex-direction: column; gap: 16px;">${doneBody}</div></div></sc-if>`;
    // A revealed idea waits for its mark: Missed (1) or Knew it (2), at the bottom like "one at a time".
    const markBar = `<sc-if value="{{mp.markBar.open}}" hint-placeholder-val="{{ false }}"><div role="group" aria-label="Did you know it?" class="sc-pop" style="${POP} position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 30; width: 440px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">${testTop}<span style="text-align: center; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{mp.markBar.label}}</span><span style="text-align: center; font-size: 13px; color: {{t.muted}};">{{mp.markBar.hint}}</span><sc-if value="{{mp.markBar.hidden}}" hint-placeholder-val="{{ false }}"><div style="display: flex;">${bigBtn('Show', 'mp.markBar.show', '{{t.inv}}', '{{t.invText}}', 'data-key="space"')}</div></sc-if><sc-if value="{{mp.markBar.shown}}" hint-placeholder-val="{{ true }}"><div style="display: flex; gap: 8px;">${markBtns()}</div></sc-if></div></sc-if>`;
    const zoom = `<sc-if value="{{mp.showZoom}}" hint-placeholder-val="{{ true }}"><div role="group" aria-label="Zoom" style="position: absolute; right: 16px; bottom: 16px; z-index: 20; display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 999px; background: {{t.bg}}; box-shadow: 0 0 0 1px {{t.line}};"><button type="button" onClick="{{mp.zoomOut}}" aria-label="Zoom out" data-tip="Zoom out" style="${PILL} width: 30px; height: 30px; background: transparent; color: {{t.text}};">${icon('minus', 14, 2.2)}</button><button type="button" onClick="{{mp.fit}}" data-tip="Fit (F)" style="${PILL} height: 30px; padding: 0 10px; font-size: 12px; background: transparent; color: {{t.text}};">{{mp.zoom}}</button><button type="button" onClick="{{mp.zoomIn}}" aria-label="Zoom in" data-tip="Zoom in" style="${PILL} width: 30px; height: 30px; background: transparent; color: {{t.text}};">${icon('plus', 14, 2.2)}</button></div></sc-if>`;
    return {
      testPill: `<sc-if value="{{mp.hasTest}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{mp.openTest}}" aria-haspopup="dialog" aria-expanded="{{mp.testExpanded}}" data-tip="Test me (T)" class="sc-press" style="${PILL} height: 36px; padding: 0 16px; font-size: 13px; background: {{mp.testBg}}; color: {{mp.testFg}};">${icon('test', 15, 2)}Test me</button></sc-if>`,
      body: `<div style="height: 64px; flex-shrink: 0; box-sizing: border-box; padding: 0 28px; display: flex; align-items: center;"><input type="text" value="{{title}}" onChange="{{setTitle}}" aria-label="Page title" placeholder="Untitled" autocomplete="off" style="width: 100%; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 26px; font-weight: 600; letter-spacing: -.02em;"></div>
      <div role="region" aria-label="{{mp.mapLabel}}" style="position: relative; flex-grow: 1; min-height: 0; overflow: hidden; border-top: 1px solid {{t.line}};">
        ${map}${outline}
        <div style="position: absolute; right: 16px; top: 16px; z-index: 21; display: flex; align-items: center; gap: 8px;">${segBtn}${weakBtn}</div>
        ${legend}${live}${toast}${fresh}${zoom}${bar}${markBar}${cardsPop}${sheet}${onePanel}
      </div>`,
      over: done
    };
  }
  // ---------- an iPhone ----------
  const togBtn = (label, handler, k) => `<button type="button" onClick="{{${handler}}}" aria-pressed="{{mp.${k}.pressed}}" class="sc-press" style="${PILL} gap: 4px; height: 44px; padding: 0 12px; font-size: 14px; background: {{mp.${k}.bg}}; color: {{t.text}}; box-shadow: inset 0 0 0 1.5px {{mp.${k}.ring}};"><sc-if value="{{mp.${k}.check}}" hint-placeholder-val="{{ false }}">${icon('check', 13, 2.6)}</sc-if>${label}</button>`;
  const bottom = `<sc-if value="{{mp.bottom}}" hint-placeholder-val="{{ true }}"><div style="flex-shrink: 0; box-sizing: border-box; height: 88px; padding: 8px 12px 36px; display: flex; gap: 6px; border-top: 1px solid {{t.line}}; background: {{t.bg}};">
      <sc-if value="{{mp.hasTest}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{mp.openTest}}" aria-haspopup="dialog" aria-expanded="{{mp.testExpanded}}" class="sc-press" style="${PILL} flex: 1 0 auto; height: 44px; padding: 0 14px; font-size: 14px; background: {{t.inv}}; color: {{t.invText}};">${icon('test', 15, 2)}Test me</button></sc-if>
      <sc-if value="{{mp.hasWeak}}" hint-placeholder-val="{{ true }}">${togBtn('Weak spots', 'mp.toggleWeak', 'weakTog')}</sc-if>
      ${togBtn('Outline', 'mp.toggleOutline', 'outlineTog')}<span style="flex-grow: 1;"></span>
      <button type="button" onClick="{{mp.addIdea}}" aria-label="Add an idea" class="sc-press" style="${PILL} width: 44px; height: 44px; background: {{t.surf}}; color: {{t.text}};">${icon('plus', 18, 2.2)}</button>
    </div></sc-if>`;
  const act = (label, ic, handler = 'mp.noop') => `<button type="button" onClick="{{${handler}}}" style="${PILL} flex: 1 1 0; min-width: 0; height: 56px; flex-direction: column; gap: 3px; border-radius: 14px; font-size: 13px; font-weight: 500; background: transparent; color: {{t.text}};">${icon(ic, 19, 2)}<span>${label}</span></button>`;
  const kbKey = '<span style="flex: 1 1 0; height: 42px; border-radius: 7px; background: {{mp.kbKey}};"></span>';
  const kbRow = (n, pad = 0) => `<div style="display: flex; gap: 6px; padding: 0 ${pad}px;">${kbKey.repeat(n)}</div>`;
  const keyBtn = (label, ic, handler) => `<button type="button" onClick="{{${handler}}}" aria-label="${label}" style="${PILL} flex: 1 1 0; height: 44px; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font-size: 15px;">${ic ? icon(ic, 18, 2) : label}</button>`;
  const bar = `<sc-if value="{{mp.bar.open}}" hint-placeholder-val="{{ false }}"><div role="group" aria-label="This idea" class="sc-sheet" style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 40; box-sizing: border-box; background: {{mp.te.bg}}; border-radius: 24px 24px 0 0; box-shadow: inset 0 1px 0 {{mp.te.line}}, 0 -12px 32px -16px rgba(0,0,0,.2); display: flex; flex-direction: column;">
      <div style="padding: 14px 16px 6px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 8px;"><input type="text" value="{{mp.bar.field}}" onChange="{{mp.bar.setLabel}}" onKeyDown="{{mp.bar.labelKey}}" onBlur="{{mp.bar.labelBlur}}" aria-label="Idea" autocomplete="off" style="flex-grow: 1; min-width: 0; height: 44px; box-sizing: border-box; padding: 0 12px; border: 0; outline: 0; border-radius: 12px; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 17px; font-weight: 600;"><button type="button" onClick="{{mp.bar.deselect}}" aria-label="Done with this idea" style="${PILL} width: 44px; height: 44px; background: transparent; color: {{t.muted}};">${icon('close', 16, 2)}</button></div>
        <sc-if value="{{mp.bar.hasNote}}" hint-placeholder-val="{{ true }}"><span onClick="{{mp.bar.editNote}}" style="padding: 0 4px; font-size: 15px; line-height: 1.45; color: {{t.muted}}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{mp.bar.note}}</span></sc-if>
        <sc-if value="{{mp.bar.addNote}}" hint-placeholder-val="{{ false }}"><span onClick="{{mp.bar.editNote}}" style="padding: 0 4px; font-size: 15px; color: {{t.muted}};">Add a note</span></sc-if>
        <sc-if value="{{mp.bar.noteEditing}}" hint-placeholder-val="{{ false }}"><textarea rows="3" onChange="{{mp.bar.setNote}}" onBlur="{{mp.bar.noteBlur}}" ref="{{mp.bar.noteRef}}" aria-label="Note" placeholder="What to remember about it" style="box-sizing: border-box; padding: 8px 12px; border: 0; outline: 0; border-radius: 12px; resize: none; background: {{t.surf}}; color: {{t.text}}; font: inherit; font-size: 16px; line-height: 1.45;">{{mp.bar.note}}</textarea></sc-if>
        <span style="padding: 0 4px; font-size: 13px; color: {{t.muted}};">{{mp.bar.cardsLine}}</span>
      </div>
      <sc-if value="{{mp.bar.keyboard}}" hint-placeholder-val="{{ false }}"><div role="toolbar" aria-label="Move this idea" style="padding: 6px 12px 8px; display: flex; gap: 6px;">${keyBtn('Outdent', 'outdent', 'mp.bar.keyOutdent')}${keyBtn('Indent', 'indent', 'mp.bar.keyIndent')}${keyBtn('Move up', 'up', 'mp.bar.keyUp')}${keyBtn('Move down', 'down', 'mp.bar.keyDown')}<button type="button" onClick="{{mp.bar.keyDone}}" style="${PILL} flex: 1.3 1 0; height: 44px; border-radius: 12px; background: {{t.inv}}; color: {{t.invText}}; font-size: 15px;">Done</button></div>
        <div aria-hidden="true" style="height: 266px; box-sizing: border-box; padding: 10px 3px 0; display: flex; flex-direction: column; gap: 12px; background: {{mp.kbPanel}};">${kbRow(10)}${kbRow(9, 16)}${kbRow(9)}${kbRow(3, 40)}</div></sc-if>
      <sc-if value="{{mp.bar.idle}}" hint-placeholder-val="{{ true }}"><div style="padding: 0 8px 34px; display: flex;"><sc-if value="{{mp.bar.editable}}" hint-placeholder-val="{{ true }}">${act('Idea', 'ideaAdd', 'mp.bar.addIdea')}</sc-if>${act('Cards', 'card', 'mp.bar.openCards')}<sc-if value="{{mp.bar.editable}}" hint-placeholder-val="{{ true }}">${act('Card', 'plus', 'mp.bar.makeCard')}</sc-if><sc-if value="{{mp.bar.canFold}}" hint-placeholder-val="{{ true }}">${act('{{mp.bar.foldLabel}}', 'fold', 'mp.bar.fold')}</sc-if>${act('More', 'more', 'mp.bar.more')}</div></sc-if>
    </div></sc-if>`;
  const scrim = open => `<sc-if value="{{${open}}}" hint-placeholder-val="{{ false }}"><div class="sc-scrim" style="position: absolute; inset: 0; z-index: 60; background: {{t.dim}};"></div></sc-if>`;
  const cards = `${scrim('mp.cardsPop.open')}<sc-if value="{{mp.cardsPop.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Cards of this idea" class="sc-sheet" style="${SHEET}">${GRAB}${cardsBody}</div></sc-if>`;
  const sheet = `${scrim('mp.sheet.open')}<sc-if value="{{mp.sheet.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Test me" class="sc-sheet" style="${SHEET}">${GRAB}${sheetBody}</div></sc-if>`;
  const done = `${scrim('mp.done.open')}<sc-if value="{{mp.done.open}}" hint-placeholder-val="{{ false }}"><div role="dialog" aria-label="Test done" class="sc-sheet" style="${SHEET}">${GRAB}${doneBody}</div></sc-if>`;
  const menu = `${scrim('mp.ideaMenu.open')}<sc-if value="{{mp.ideaMenu.open}}" hint-placeholder-val="{{ false }}"><div role="menu" aria-label="More for this idea" class="sc-sheet" style="${SHEET} gap: 4px;">${GRAB}<div style="display: flex; align-items: center; gap: 10px; padding: 4px 4px 8px;"><span style="flex-grow: 1; min-width: 0; font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{mp.ideaMenu.title}}</span><button type="button" onClick="{{mp.ideaMenu.close}}" aria-label="Close" style="${PILL} width: 44px; height: 44px; background: {{mp.te.surf}}; color: {{t.text}};">${icon('close', 14, 2)}</button></div>${ideaItem('mp.ideaMenu.toggleFolded', 'fold', 'Start folded', 'menuitemcheckbox', true)}${ideaItem('mp.ideaMenu.testBranch', 'test', 'Test this branch')}${ideaItem('mp.ideaMenu.remove', 'bin', 'Delete', 'menuitem', false, true)}</div></sc-if>`;
  // The Outline, full screen (the phone's main editor): its own header, with Map to go back.
  const outlineFull = `<sc-if value="{{mp.showOutline}}" hint-placeholder-val="{{ false }}"><div role="region" aria-label="Outline" class="sc-sheet" style="position: absolute; left: 0; right: 0; top: 52px; bottom: 0; z-index: 45; box-sizing: border-box; background: {{t.bg}}; display: flex; flex-direction: column;">
      <div style="height: 52px; flex-shrink: 0; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid {{t.line}};"><button type="button" onClick="{{mp.toggleOutline}}" class="sc-press" style="${PILL} height: 36px; padding: 0 14px 0 10px; font-size: 14px; background: {{t.surf}}; color: {{t.text}};">${icon('back', 14, 2.2)}Map</button><span style="flex-grow: 1; text-align: center; font-size: 17px; font-weight: 600;">Outline</span><button type="button" onClick="{{mp.addIdea}}" aria-label="Add an idea" style="${PILL} width: 44px; height: 44px; background: transparent; color: {{t.text}};">${icon('plus', 18, 2.2)}</button></div>
      <div style="position: relative; flex-grow: 1; min-height: 0;">${outline}</div></div></sc-if>`;
  const testBar = `<sc-if value="{{mp.testBar.open}}" hint-placeholder-val="{{ false }}"><div role="group" aria-label="Did you know it?" style="flex-shrink: 0; box-sizing: border-box; padding: 10px 16px 34px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid {{t.line}}; background: {{t.bg}};"><div style="display: flex; align-items: center; gap: 8px;"><span style="flex-grow: 1; font-size: 15px; font-weight: 600;">{{mp.progress.line}}</span><button type="button" onClick="{{mp.endTest}}" class="sc-press" style="${PILL} height: 44px; padding: 0 16px; font-size: 14px; background: {{t.surf}}; color: {{t.text}};">End</button></div><div style="display: flex; gap: 8px;">${markBtns()}</div></div></sc-if>`;
  return {
    body: `<div style="height: 44px; flex-shrink: 0; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center;"><input type="text" value="{{title}}" onChange="{{setTitle}}" aria-label="Page title" placeholder="Untitled" autocomplete="off" style="width: 100%; padding: 0; border: 0; outline: 0; background: transparent; color: {{t.text}}; font: inherit; font-size: 22px; font-weight: 600; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
      <div role="region" aria-label="{{mp.mapLabel}}" style="position: relative; flex-grow: 1; min-height: 0; overflow: hidden; border-top: 1px solid {{t.line}};">${map}${legend}${live}${toast}${fresh}</div>
      ${bottom}${testBar}`,
    over: `${bar}${onePanel}${cards}${sheet}${done}${menu}${outlineFull}`
  };
}

// ---------- MapLayouts: the gallery of real layouts (§10.3), light and dark, for the owner to approve before any app work ----------
export function mapLayoutsBoard(H) {
  const { FONT, MONO, T, DARK, W } = H;
  const LH = 2800;
  const FIX = Object.fromEntries(Object.entries(MAP_FIXTURES).map(([k, list]) => [k, list.map(([title, data, opts, span, h]) => ({ title, data, opts, span, h }))]));
  // (a card may show its map at a set zoom from the top left, where the whole of it would be too small to read)
  const html = `<div style="width: ${W}px; height: ${LH}px; box-sizing: border-box; padding: 48px 56px; display: flex; flex-direction: column; gap: 24px; overflow: hidden; font-family: ${FONT}; background: {{t.bg}}; color: {{t.text}};">
  <div style="display: flex; align-items: flex-end; gap: 24px;"><div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px;"><h1 style="margin: 0; font-size: 40px; font-weight: 600; letter-spacing: -.035em;">Map layouts</h1><p style="margin: 0; max-width: 820px; font-size: 16px; line-height: 1.5; color: {{t.muted}};">What web/maps.js lays out, drawn as the app draws it: the same numbers on the web and the iPhone. Each says how big it came out and whether any two boxes touch.</p></div>
    <div role="tablist" aria-label="Gallery" style="display: flex; gap: 4px; padding: 3px; border-radius: 999px; background: {{t.surf}};"><sc-for list="{{tabs}}" as="x" hint-placeholder-count="2"><button type="button" role="tab" aria-selected="{{x.on}}" onClick="{{x.pick}}" style="height: 34px; padding: 0 16px; border: 0; border-radius: 999px; background: {{x.bg}}; color: {{x.fg}}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;">{{x.label}}</button></sc-for></div></div>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;"><sc-for list="{{cards}}" as="c" hint-placeholder-count="6"><figure style="grid-column: span {{c.span}}; margin: 0; padding: 18px 20px 20px; border-radius: 24px; background: {{t.surf}}; display: flex; flex-direction: column; gap: 12px;">
    <figcaption style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px;"><span style="flex: 1 0 100%; font-size: 16px; font-weight: 600;">{{c.title}}</span><span style="flex-grow: 1; font-family: ${MONO}; font-size: 12px; color: {{t.muted}}; white-space: nowrap;">{{c.meta}}</span><span style="height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 11px; background: {{c.okBg}}; color: {{c.okFg}}; font-size: 12px; font-weight: 600; white-space: nowrap;">{{c.ok}}</span></figcaption>
    <div ref="{{c.ref}}" data-sc-own style="height: {{c.h}}; border-radius: 16px; background: {{t.bg}}; overflow: hidden;"></div>
  </figure></sc-for></div>
</div>`;
  const logic = `
constructor(props) { super(props); this.state = { view: null }; }
renderVals() {
  ${T}
  const M = this.maps(), A = this.mapArt(), FIX = ${JSON.stringify(FIX)}, view = this.state.view || this.props.view || 'Mind maps', list = FIX[view] || FIX['Mind maps'];
  const cards = list.map(f => {
    const L = M.layoutMind(f.data, f.opts), W = f.span === 2 ? 1288 : 616, H = f.h, c = f.opts.zoom ? { z: f.opts.zoom, x: 0, y: 0 } : A.cam(L, W - 24, H - 24, { zmin: 0.05, zmax: 1 }), bad = A.overlaps(L) + A.clashes(L, f.data, { t, units: M.units });
    const html = A.draw(L, f.data, { t, W, H, z: c.z, x: c.x + 12, y: c.y + 12, units: M.units });
    return { title: f.title, span: String(f.span), h: H + 'px', meta: M.countOf('mindmap', f.data) + ' ideas · ' + L.nodes.length + ' showing · ' + (f.opts.side || 'both') + ' · ' + Math.round(L.width) + ' × ' + Math.round(L.height) + ' · ' + Math.round(c.z * 100) + '%',
      ok: bad ? bad + ' overlap' + (bad === 1 ? '' : 's') : 'No boxes touch', okBg: bad ? t.againTint : t.goodTint, okFg: bad ? t.again : t.good, ref: A.refOf(html) };
  });
  return { t, cards, tabs: ${JSON.stringify(MAP_LAYOUT_VIEWS)}.map(x => ({ label: x, on: x === view ? 'true' : 'false', bg: x === view ? t.bg : 'transparent', fg: x === view ? t.text : t.muted, pick: () => this.setState({ view: x }) })) };
}`;
  return { MapLayouts: ['Map layouts (real engine output; approve before app work)', html, { props: { ...DARK, view: { editor: 'enum', default: 'Mind maps', options: MAP_LAYOUT_VIEWS } }, logic, css: MAP_CSS, w: W, h: LH }] };
}

// ---------- the Motion board's map samples (§5.6): each one demo, played with motion and then as Reduce Motion plays it (instant) ----------
// The positions are the engine's: a branch open and folded, a hidden idea revealed, the camera moving to the next hidden idea in
// "one at a time", and a selection. Each tile shows one demo at a size its words read at (12 px or more): it plays once with motion,
// then once as Reduce Motion plays it, and the line under it says which.
export function mapMotion() {
  const t = { bg: '#FFFFFF', surf: '#F4F4F4', surf2: '#E8E8E8', line: '#EBEBEB', text: '#000000', muted: '#666666', inv: '#000000', invText: '#FFFFFF', good: '#067647', again: '#D92D20', againTint: '#FDECEA', goodTint: '#E6F4EC', hardTint: '#FDF1E3' };
  const branch = { root: { id: 'nuc', label: 'Nucleus', children: [{ id: 'd', label: 'DNA' }, { id: 'n', label: 'Nucleolus' }, { id: 'p', label: 'Pores' }] } };
  const open = maps.layoutMind(branch, { side: 'right' }), shut = maps.layoutMind(branch, { side: 'right', folds: { nuc: true } });
  const pc = (sec, L) => +(100 * sec / L).toFixed(2), s = n => n + 's';
  const R = MOTION.reveal, CAM = MOTION.sheet, SW = 248;
  // Fold and unfold: the ideas slide into their parent and fade; the "+3" fades in (and back).
  const P = open.nodes[0], kids = open.nodes.slice(1), L1 = 3.2;
  const box = (n, fill, stroke, size, weight, ink) => `<rect width="${n.w}" height="${n.h}" rx="${n.level ? 10 : Math.min(16, n.h / 2)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1.5"` : ''}/><text x="${n.w / 2}" y="${n.h / 2 + size * 0.36}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${ink}">${n.lines.join(' ')}</text>`;
  const foldSvg = cls => {
    const sx = shut.nodes[0];
    const parts = kids.map((n, i) => `<g class="${cls}-k" style="--dx: ${(P.x + P.w / 2 - (n.x + n.w / 2)).toFixed(1)}px; --dy: ${(P.y + P.h / 2 - (n.y + n.h / 2)).toFixed(1)}px;"><path d="${open.links[i].d}" fill="none" stroke="${t.line}" stroke-width="1.5"/><g transform="translate(${n.x} ${n.y})">${box(n, t.bg, t.line, 13, 500, t.text)}</g></g>`).join('');
    return `<svg width="${SW}" height="${Math.round(SW * open.height / open.width)}" viewBox="0 0 ${open.width} ${open.height}" style="display: block; font-family: inherit;">${parts}<g transform="translate(${P.x} ${P.y})"><rect width="${sx.w}" height="${P.h}" rx="${Math.min(16, P.h / 2)}" fill="${t.inv}"/><text x="${P.w / 2}" y="${P.h / 2 + 5.4}" text-anchor="middle" font-size="15" font-weight="600" fill="${t.invText}">Nucleus</text><g class="${cls}-chip"><rect x="${sx.w - 24}" y="${P.h / 2 - 9}" width="20" height="18" rx="9" fill="${t.surf}"/><text x="${sx.w - 14}" y="${P.h / 2 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="${t.muted}">+3</text></g></g></svg>`;
  };
  // Reveal in a test: the "?" cross-fades to the words over 0.16 s, then Knew it's green border and tint (at once).
  const n0 = open.nodes[2], L2 = 2.8;
  const revealSvg = cls => `<svg width="${Math.round((n0.w + 16) * 1.25)}" height="${Math.round((n0.h + 16) * 1.25)}" viewBox="-8 -8 ${n0.w + 16} ${n0.h + 16}" style="display: block; font-family: inherit;"><g class="${cls}-q"><rect width="${n0.w}" height="${n0.h}" rx="10" fill="${t.surf}" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${n0.w / 2}" y="${n0.h / 2 + 5.5}" text-anchor="middle" font-size="16" font-weight="600" fill="${t.muted}">?</text></g><g class="${cls}-a">${box(n0, t.bg, t.line, 12.5, 500, t.text)}</g><g class="${cls}-ring"><rect x="1" y="1" width="${n0.w - 2}" height="${n0.h - 2}" rx="9" fill="${t.goodTint}" stroke="${t.good}" stroke-width="2"/><text x="${n0.w / 2}" y="${n0.h / 2 + 4.5}" text-anchor="middle" font-size="12.5" font-weight="500" fill="${t.text}">${n0.lines.join(' ')}</text></g></svg>`;
  // The camera to the next hidden idea: the map moves (0.25 s) so the next one is in the middle; the ring moves with it at once.
  const cell = maps.layoutMind(MINDMAP_SAMPLE, { side: 'right', folds: { nucleus: true, er: true, membrane: true, ribosomes: true, lysosomes: true } });
  const a = cell.nodes.find(n => n.id === 'krebs'), b = cell.nodes.find(n => n.id === 'etc'), L3 = 3, VW = 250, VH = 170;
  const camSvg = cls => {
    const nodes = cell.nodes.map(n => `<g transform="translate(${n.x} ${n.y})">${n.level === 0 ? box(n, t.inv, '', 15, 600, t.invText) : n.level === 1 ? box(n, t.surf2, '', 13.5, 600, t.text) : `<rect width="${n.w}" height="${n.h}" rx="10" fill="${t.surf}" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${n.w / 2}" y="${n.h / 2 + 5.5}" text-anchor="middle" font-size="16" font-weight="600" fill="${t.muted}">?</text>`}</g>`).join('');
    const links = cell.links.map(l => `<path d="${l.d}"/>`).join('');
    const ring = n => `<rect x="${n.x - 4}" y="${n.y - 4}" width="${n.w + 8}" height="${n.h + 8}" rx="13" fill="none" stroke="${t.text}" stroke-width="2"/>`;
    return `<svg width="${SW}" height="${Math.round(SW * VH / VW)}" viewBox="0 0 ${VW} ${VH}" style="display: block; font-family: inherit; overflow: hidden; border-radius: 12px; box-shadow: inset 0 0 0 1px ${t.line};"><g class="${cls}-cam" style="--ax: ${(VW / 2 - (a.x + a.w / 2)).toFixed(1)}px; --ay: ${(VH / 2 - (a.y + a.h / 2)).toFixed(1)}px; --bx: ${(VW / 2 - (b.x + b.w / 2)).toFixed(1)}px; --by: ${(VH / 2 - (b.y + b.h / 2)).toFixed(1)}px;"><g fill="none" stroke="${t.line}" stroke-width="1.5">${links}</g>${nodes}<g class="${cls}-ra">${ring(a)}</g><g class="${cls}-rb">${ring(b)}</g></g></svg>`;
  };
  // Selecting an idea: its ring shows at once (never animated).
  const selSvg = cls => `<svg width="${Math.round((n0.w + 16) * 1.25)}" height="${Math.round((n0.h + 16) * 1.25)}" viewBox="-8 -8 ${n0.w + 16} ${n0.h + 16}" style="display: block; font-family: inherit;">${box(n0, t.bg, t.line, 12.5, 500, t.text)}<rect class="${cls}" x="-4" y="-4" width="${n0.w + 8}" height="${n0.h + 8}" rx="13" fill="none" stroke="${t.text}" stroke-width="2"/></svg>`;
  // (one demo in the middle: the motion one, then the Reduce Motion one in the same place; the line under it, at the same height in
  // every tile, says which is playing)
  const pair = (a1, b1, loop) => `<div style="position: absolute; left: 12px; right: 12px; top: 12px; bottom: 48px; display: grid; place-items: center;"><div class="mm-a" style="grid-area: 1 / 1; animation-duration: ${s(2 * loop)};">${a1}</div><div class="mm-b" style="grid-area: 1 / 1; animation-duration: ${s(2 * loop)};">${b1}</div></div>
    <div style="position: absolute; left: 12px; right: 12px; bottom: 14px; height: 24px; display: flex; justify-content: center; gap: 6px; font-size: 12px; font-weight: 600;"><span class="mm-la" style="height: 24px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 12px; animation-duration: ${s(2 * loop)};">Motion</span><span class="mm-lb" style="height: 24px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 12px; animation-duration: ${s(2 * loop)};">Reduce Motion (instant)</span></div>`;
  const tiles = [
    ['Mind map · fold and unfold', `${Math.round(R * 1000)} ms · ease ${MOTION.ease.join(',')} · ideas slide into the parent`, pair(foldSvg('mf'), foldSvg('mfr'), L1)],
    ['Mind map · reveal in a test', `the words cross-fade in ${Math.round(R * 1000)} ms · the mark at once`, pair(revealSvg('mr'), revealSvg('mrr'), L2)],
    ['Mind map · camera to the next one', `${Math.round(CAM * 1000)} ms · ease ${MOTION.ease.join(',')} · one at a time`, pair(camSvg('mc'), camSvg('mcr'), L3)],
    ['Mind map · select an idea', 'the ring shows at once, with or without Reduce Motion', pair(selSvg('ms'), selSvg('ms'), 2.4)]
  ];
  // Each loop: open, fold (R), folded, unfold (R). Reduce Motion: the same moments, no glide (step-end).
  const f1 = pc(0.9, L1), f2 = pc(0.9 + R, L1), f3 = pc(2.2, L1), f4 = pc(2.2 + R, L1);
  const r1 = pc(0.8, L2), r2 = pc(0.8 + R, L2), r3 = pc(1.3, L2), r4 = pc(2.4, L2), r5 = pc(2.4 + R, L2);
  const c1 = pc(1, L3), c2 = pc(1 + CAM, L3), c3 = pc(2.4, L3), c4 = pc(2.4 + CAM, L3);
  const css = `
@keyframes mmA{0%,49.9%{opacity:1}50%,100%{opacity:0}}@keyframes mmB{0%,49.9%{opacity:0}50%,100%{opacity:1}}
@keyframes mmLa{0%,49.9%{background:#000000;color:#FFFFFF}50%,100%{background:transparent;color:#666666}}@keyframes mmLb{0%,49.9%{background:transparent;color:#666666}50%,100%{background:#000000;color:#FFFFFF}}
.mm-a{animation:mmA 1s step-end infinite}.mm-b{animation:mmB 1s step-end infinite}.mm-la{animation:mmLa 1s step-end infinite}.mm-lb{animation:mmLb 1s step-end infinite}
@keyframes mfK{0%,${f1}%{transform:none;opacity:1}${f2}%,${f3}%{transform:translate(var(--dx),var(--dy)) scale(.4);opacity:0}${f4}%,100%{transform:none;opacity:1}}
@keyframes mfC{0%,${f1}%{opacity:0}${f2}%,${f3}%{opacity:1}${f4}%,100%{opacity:0}}
.mf-k,.mfr-k{transform-box:fill-box;transform-origin:center;animation:mfK ${s(L1)} ${EASE} infinite}.mf-chip,.mfr-chip{animation:mfC ${s(L1)} ${EASE} infinite}
@keyframes mrQ{0%,${r1}%{opacity:1}${r2}%,${r4}%{opacity:0}${r5}%,100%{opacity:1}}@keyframes mrA{0%,${r1}%{opacity:0}${r2}%,${r4}%{opacity:1}${r5}%,100%{opacity:0}}
@keyframes mrRing{0%,${r3}%{opacity:0}${(r3 + 0.01).toFixed(2)}%,${r4}%{opacity:1}${(r4 + 0.01).toFixed(2)}%,100%{opacity:0}}
.mr-q,.mrr-q{animation:mrQ ${s(L2)} ease-out infinite}.mr-a,.mrr-a{animation:mrA ${s(L2)} ease-out infinite}.mr-ring,.mrr-ring{animation:mrRing ${s(L2)} step-end infinite}
@keyframes mcCam{0%,${c1}%{transform:translate(var(--ax),var(--ay))}${c2}%,${c3}%{transform:translate(var(--bx),var(--by))}${c4}%,100%{transform:translate(var(--ax),var(--ay))}}
@keyframes mcA{0%,${c1}%{opacity:1}${(c1 + 0.01).toFixed(2)}%,${c3}%{opacity:0}${(c3 + 0.01).toFixed(2)}%,100%{opacity:1}}@keyframes mcB{0%,${c1}%{opacity:0}${(c1 + 0.01).toFixed(2)}%,${c3}%{opacity:1}${(c3 + 0.01).toFixed(2)}%,100%{opacity:0}}
.mc-cam,.mcr-cam{animation:mcCam ${s(L3)} ${EASE} infinite}.mc-ra,.mcr-ra{animation:mcA ${s(L3)} step-end infinite}.mc-rb,.mcr-rb{animation:mcB ${s(L3)} step-end infinite}
@keyframes msR{0%,40%{opacity:0}40.01%,85%{opacity:1}85.01%,100%{opacity:0}}.ms{animation:msR 2.4s step-end infinite}
.mfr-k,.mfr-chip,.mrr-q,.mrr-a,.mcr-cam{animation-timing-function:step-end}
`;
  return { tiles, css };
}
