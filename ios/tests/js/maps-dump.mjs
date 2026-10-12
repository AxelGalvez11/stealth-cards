// What node answers for the iPhone's Mind map check (ios/tests/maps-check.sh): web/maps.js called on many seeded maps and edge cases, each
// call written down as the function's name, its arguments as JSON text (the very bytes JavaScriptCore is given) and node's answer as JSON text
// (or the error it threw). The Swift side (ios/tests/swift/maps/main.swift) makes the same calls through Data/MapEngine.swift and wants the
// same bytes back: normalize, the outline text both ways, layoutMind, previewOf, merge, edit, diff and summaryOf, and the study helpers.
//   node ios/tests/js/maps-dump.mjs <out folder> [maps]     writes <out>/maps-cases.json (500 seeded maps unless told otherwise)
import { writeFileSync } from 'node:fs';
import maps from '../../../web/maps.js';

const out = process.argv[2], N = +(process.argv[3] || 500);
// A seeded random number (mulberry32), so every run makes the same cases.
let seed = 0x5eed4a;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)], int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const WORDS = ['cell', 'nucleus', 'Mitochondria', 'Krebs', 'cycle', 'in', 'the', 'matrix', 'ATP', 'synthase', 'membrane', 'Electron', 'transport', 'ribosome',
  'Golgi', 'packs', 'and', 'ships', 'DNA', 'holds', 'pores', 'let', 'mRNA', 'out', 'lysosome', 'waste', 'fluid', 'mosaic', 'pumps', 'channels',
  'Pneumonoultramicroscopicsilicovolcanoconiosis', 'O₂', 'H⁺', 'FADH₂', 'α-Ketoglutarate', 'naïve', 'café'];
const WIDE = ['細胞', 'ミトコンドリア', '核小体はリボソームをつくる', '세포막', '🧬', '⚡️', '🔋', '👩‍🔬', 'ATPの大部分をつくる 🔋'];
const label = () => {
  const r = rnd();
  if (r < 0.08) return pick(WIDE);
  if (r < 0.11) return '';
  if (r < 0.14) return Array.from({ length: int(14, 22) }, () => pick(WORDS)).join(' ');
  if (r < 0.16) return '**Bold** [a link](https://x.y) <b>tag</b>‮  spaced\nline';
  return Array.from({ length: int(1, 6) }, () => pick(WORDS)).join(' ');
};
const idOf = i => { const r = rnd(); return r < 0.1 ? undefined : r < 0.13 ? 'dup' : r < 0.15 ? '12' : r < 0.16 ? 'bad id!' : 'i' + i; };
// A raw map, as an agent or an old app might send it: ids missing, repeated or odd, notes, card links, starts folded, too deep or too wide.
function rawMap(size, deep) {
  let n = 0;
  const make = depth => {
    const id = idOf(n++), x = { label: label() };
    if (id !== undefined) x.id = id;
    if (rnd() < 0.15) x.note = Array.from({ length: int(3, 30) }, () => pick(WORDS)).join(' ') + (rnd() < 0.2 ? '\nsecond line' : '');
    if (rnd() < 0.2) x.cardIds = Array.from({ length: int(1, rnd() < 0.1 ? 11 : 3) }, () => pick(['c1', 'cm1', 'cm2', 'cm3', 'c' + int(1, 30), 'bad id']));
    if (rnd() < 0.1) x.folded = true;
    if (depth < (deep ? 9 : 4) && n < size) {
      const k = depth === 0 ? int(1, 8) : rnd() < 0.5 ? 0 : int(1, rnd() < 0.05 ? 24 : 5);
      if (k) x.children = [];
      for (let i = 0; i < k && n < size; i++) x.children.push(rnd() < 0.05 ? label() : make(depth + 1));
    }
    return x;
  };
  const root = make(0);
  return rnd() < 0.3 ? { root } : rnd() < 0.5 ? root : { tree: root };
}
const cases = [];
const call = (fn, ...args) => {
  const a = JSON.stringify(args);
  let o;
  try { const r = maps[fn](...JSON.parse(a)); o = JSON.stringify(r === undefined ? null : r); } catch (e) { o = { throws: String(e) }; }
  cases.push(typeof o === 'string' ? { fn, a, out: o } : { fn, a, ...o });
  return typeof o === 'string' ? JSON.parse(o) : null;
};
const ids = d => { const l = []; const w = n => { if (!n) return; l.push(n.id); for (const c of n.children || []) w(c); }; w(d.root); return l; };
// A few edits an editor might make, through maps.edit (what the web and the iPhone both edit with).
function edited(d, k) {
  for (let i = 0; i < k; i++) {
    const all = ids(d), id = pick(all), op = pick(['add', 'add', 'set', 'set', 'remove', 'move', 'indent', 'outdent', 'link', 'unlink']);
    const o = op === 'add' ? { op, id: 'n' + Math.floor(rnd() * 1e7).toString(36), parent: id, label: label(), ...(rnd() < 0.5 ? { index: int(0, 3) } : {}) }
      : op === 'set' ? { op, id, ...(rnd() < 0.6 ? { label: label() } : {}), ...(rnd() < 0.3 ? { note: rnd() < 0.3 ? null : label() } : {}), ...(rnd() < 0.2 ? { folded: rnd() < 0.5 } : {}) }
      : op === 'move' ? { op, id, ...(rnd() < 0.5 ? { by: rnd() < 0.5 ? -1 : 1 } : { parent: pick(all), index: int(0, 4) }) }
      : op === 'link' || op === 'unlink' ? { op, id, cardId: pick(['c1', 'cm2', 'c9', 'c' + int(1, 9)]) }
      : { op, id };
    d = call('edit', 'mindmap', d, o).data;
  }
  return d;
}

for (let m = 0; m < N; m++) {
  const big = m % 25 === 0, raw = rawMap(big ? 260 : int(1, 60), big || m % 7 === 0);
  const title = pick(['The cell at a glance', '', 'Membrane transport', '細胞']);
  const norm = call('normalize', 'mindmap', raw, null, { title });
  if (!norm) continue;
  const d = norm.data;
  // the AI-keep rule: an agent's rewrite against the saved one
  const again = rawMap(int(1, 40), false);
  call('normalize', 'mindmap', again, d, { ai: true, title });
  const text = call('textOf', 'mindmap', d);
  call('fromText', 'mindmap', text, d, { title });
  call('fromText', 'mindmap', text.replace(/ \{#[^}]*\}/g, ''), d, { title, ai: true });
  const folds = {}; for (const id of ids(d)) if (rnd() < 0.15) folds[id] = rnd() < 0.8;
  const L = call('layoutMind', d, { side: pick(['both', 'right']), folds, scale: pick([1, 1, 1.15, 1.3]), title });
  call('layout', 'mindmap', d, { side: 'right', title });
  const tones = {}; for (const id of ids(d)) if (rnd() < 0.3) tones[id] = pick(['weak', 'getting', 'solid', 'new', 'bogus']);
  call('previewOf', 'mindmap', d, { w: pick([340, 350, 620, 640]), h: pick([120, 150]), tones, title });
  call('testOrder', d, rnd() < 0.5 ? L : null, rnd() < 0.5 ? null : ids(d).filter(() => rnd() < 0.4));
  call('reviewIds', d, rnd() < 0.3 ? null : ids(d).filter(() => rnd() < 0.2));
  call('countOf', 'mindmap', d); call('pathsOf', d);
  // two writers from the same version
  const mine = edited(d, int(1, 6)), theirs = edited(d, int(0, 6));
  call('merge', 'mindmap', d, mine, theirs, { prefer: 'mine' });
  if (m % 5 === 0) call('merge', 'mindmap', d, theirs, mine, { prefer: 'theirs' });
  const df = call('diff', 'mindmap', d, mine);
  call('summaryOf', df, rnd() < 0.5 ? { who: 'Claude' } : null);
  if (m % 10 === 0) call('svgOf', 'mindmap', L, { text: '#111', line: '#ddd', inv: '#000', invText: '#fff' }, { title, tones, data: d });
}
// edge cases: empty, the starting value, refusals, the caps, the sample, text with Mermaid
call('emptyOf', 'mindmap'); call('emptyOf', 'diagram'); call('emptyOf', 'nope');
for (const bad of [{ blocks: [] }, [], 5, null, 'just words', '{"root":{"label":"from JSON text"}}', { nothing: 1 }]) call('normalize', 'mindmap', bad, null, {});
call('normalize', 'diagram', { blocks: [] }, null, {});
call('layoutMind', { root: { id: 'root', label: '' } }, { title: 'Membrane transport' });
call('layoutMind', { root: { id: 'root', label: '' } }, {});
call('previewOf', 'mindmap', { root: { id: 'root', label: 'Alone' } }, { w: 340, h: 120 });
call('fromText', 'mindmap', 'mindmap\n  root((The cell))\n    (Nucleus)\n      [Holds DNA]\n    ::icon(fa fa-book)\n    Mitochondria\n', null, {});
call('fromText', 'mindmap', '# The cell\n## Nucleus\n- Holds the DNA\n## Mitochondria\n> Most ATP\n- Krebs {#krebs cards:c1,c2 folded}\n', null, {});
const deep = { root: { id: 'a0', label: 'deep', children: [] } }; let at = deep.root; for (let i = 1; i < 10; i++) { const c = { id: 'a' + i, label: 'level ' + i, children: [] }; at.children.push(c); at = c; }
call('normalize', 'mindmap', deep, null, {});
call('normalize', 'mindmap', { root: { id: 'w', label: 'wide', children: Array.from({ length: 30 }, (_, i) => ({ id: 'w' + i, label: 'child ' + i })) } }, null, {});
for (const s of ['', 'abc', 'ABC', 'Krebs cycle in the matrix', '細胞のつくり 🧬', 'é', '👩‍🔬 lab', 'ﬁ ligature', 'Ω≈ç√']) { call('units', s); call('wrap', s, 7); call('plain', s + ' **x** <i>y</i>', 12); }
for (const [t, mk] of [[[], null], [['weak'], null], [['solid', 'getting'], [1, 0, 1, 5]], [[], [0, 2, 0, 5]], [[], [1, 0, 1, 5]], [['new'], { last: false }], [['bogus'], { last: true }]]) call('ideaTone', t, mk);
const CARDS = [{ id: 'c1', front: 'Where does the Krebs cycle happen?', back: 'The mitochondrial matrix' }, { id: 'cm2', front: 'Where does electron transport happen?', back: 'The inner mitochondrial membrane' },
  { id: 'cm3', front: 'What does the nucleolus make?', back: 'Ribosomes' }, { id: 'bad id', front: 'x' }, { id: 'cm7', front: 'What is the last electron acceptor?', back: 'Oxygen' }];
for (const l of ['Krebs cycle in the matrix', 'Electron transport on the inner membrane', 'Nucleolus makes ribosomes', 'the', '', 'Mitochondrial matrices']) call('matchCards', l, CARDS);
writeFileSync(out + '/maps-cases.json', JSON.stringify(cases));
console.log('maps cases:', cases.length, 'calls on', N, 'seeded maps and the edge cases');
