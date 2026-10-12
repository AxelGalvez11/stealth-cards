// Mind map pages' engine (web/maps.js, step 4a) and the shared meaning of "weak" (web/sched.js toneOf).
//   node tests/maps.mjs            (prints each failure, then "maps: N passed, M failed"; exits 1 on a failure)
// The random cases come from a seeded generator inside this file, so every run checks the same maps.
import maps from '../web/maps.js';
import { toneOf } from '../web/sched.js';
import { FACTOR } from '../web/fsrs.js';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++;
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? '  →  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 600) : '')); }
}
const J = x => JSON.stringify(x);
const throwsOf = f => { try { f(); return null; } catch (e) { return e; } };
const cps = s => Array.from(s).length;
const N = (input, prev, opts) => maps.normalize('mindmap', input, prev, opts);
const ids = d => { const out = []; const st = [d.root]; while (st.length) { const n = st.pop(); out.push(n.id); for (const c of (n.children || []).slice().reverse()) st.push(c); } return out; };
const find = (d, id) => { const st = [d.root]; while (st.length) { const n = st.pop(); if (n.id === id) return n; for (const c of n.children || []) st.push(c); } return null; };
const parentOf = (d, id) => { const st = [[d.root, null]]; while (st.length) { const [n, p] = st.pop(); if (n.id === id) return p ? p.id : null; for (const c of n.children || []) st.push([c, n]); } return undefined; };
// A seeded random number generator (mulberry32): the same cases on every run.
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- the spec's own example (§2.1) ----------
const SPEC_DATA = {"root":{"id":"cell","label":"The cell","children":[
  {"id":"nucleus","label":"Nucleus","children":[
    {"id":"dna","label":"Holds the DNA"},
    {"id":"nucleolus","label":"Nucleolus makes ribosomes","cardIds":["cm3"]}]},
  {"id":"mito","label":"Mitochondria","note":"Most ATP is made on the inner membrane, by ATP synthase.","cardIds":["cm1"],"children":[
    {"id":"krebs","label":"Krebs cycle in the matrix","cardIds":["c1"]},
    {"id":"etc","label":"Electron transport on the inner membrane","cardIds":["cm2"]}]},
  {"id":"er","label":"ER and Golgi","folded":true,"children":[
    {"id":"rough-er","label":"Rough ER makes proteins","cardIds":["cm5"]},
    {"id":"smooth-er","label":"Smooth ER makes lipids"}]}]}};
const SPEC_TEXT = `The cell {#cell}
- Nucleus {#nucleus}
  - Holds the DNA {#dna}
  - Nucleolus makes ribosomes {#nucleolus cards:cm3}
- Mitochondria {#mito cards:cm1}
  > Most ATP is made on the inner membrane, by ATP synthase.
  - Krebs cycle in the matrix {#krebs cards:c1}
  - Electron transport on the inner membrane {#etc cards:cm2}
- ER and Golgi {#er folded}
  - Rough ER makes proteins {#rough-er cards:cm5}
  - Smooth ER makes lipids {#smooth-er}`;
{
  const r = N(SPEC_DATA);
  check('the spec example is already clean', J(r.data) === J(SPEC_DATA) && r.warnings.length === 0, r);
  check('the spec example as text, exactly', maps.textOf('mindmap', SPEC_DATA) === SPEC_TEXT, maps.textOf('mindmap', SPEC_DATA));
  const t = maps.mindmapFromText(SPEC_TEXT);
  check('the spec text read back is the spec data', J(t.data) === J(SPEC_DATA) && t.warnings.length === 0, t);
  check('fromText is mindmapFromText', J(maps.fromText('mindmap', SPEC_TEXT).data) === J(SPEC_DATA));
  check('countOf', maps.countOf('mindmap', SPEC_DATA) === 10);
  const paths = maps.pathsOf(SPEC_DATA);
  check('pathsOf in outline order', paths.length === 10 && paths[0].path === 'The cell' && paths.find(p => p.id === 'etc').path === 'The cell › Mitochondria › Electron transport on the inner membrane', paths);
}

// ---------- cleaning words ----------
{
  check('plain: tags, marks, links, addresses', maps.plain('<b>Krebs</b> **cycle** [in the](http://x.org) `matrix` https://y.com/z ok', 80) === 'Krebs cycle in the matrix ok', maps.plain('<b>Krebs</b> **cycle** [in the](http://x.org) `matrix` https://y.com/z ok', 80));
  check('plain: control and bidi characters', maps.plain('a\u202eb\u0007c\u2066d\u2028e', 80) === 'a b c d e', maps.plain('a\u202eb\u0007c\u2066d\u2028e', 80));
  check('plain: one line', maps.plain('one\n\ntwo\tthree', 80) === 'one two three');
  // plainText's marks (a bullet or a heading's # before a space) go, every one of them so plain(plain(s)) is plain(s); a quote's
  // ">", a "+" and a list number mean something and stay.
  for (const [a, b] of [['- # Topic', 'Topic'], ['- - double', 'double'], ['* x', 'x'], ['• z', 'z'], ['## Heading', 'Heading'], ['-', '-'], ['#', '#'], ['#hashtag', '#hashtag'], ['3.5 billion', '3.5 billion'], ['>x', '>x'],
    ['> 5 mm', '> 5 mm'], ['> quoted', '> quoted'], ['1. Introduction', '1. Introduction'], ['100) Steps', '100) Steps'], ['2) Two', '2) Two'], ['+ ve', '+ ve']])
    check('plain: leading mark ' + J(a), maps.plain(a, 80) === b, maps.plain(a, 80));
  for (const [a, b] of [['~~gone~~ ==hi==', 'gone hi'], ['a == b', 'a == b'], ['x ~~ y', 'x ~~ y'], ['**bold** __u__ `c`', 'bold u c']])
    check('plain: marks in pairs ' + J(a), maps.plain(a, 80) === b, maps.plain(a, 80));
  const nest = '['.repeat(9) + 'ATP' + ']()'.repeat(9);
  check('plain: links nested 9 deep settle in one call', maps.plain(nest, 80) === 'ATP' && maps.plain('![a [b](c) d](e) f', 80) === 'a b d f', [maps.plain(nest, 80), maps.plain('![a [b](c) d](e) f', 80)]);
  const nl = N({ root: { label: nest } });
  check('a label of nested links: one answer, again and through text', nl.data.root.label === 'ATP' && J(N(nl.data).data) === J(nl.data) && J(maps.mindmapFromText(maps.textOf('mindmap', nl.data)).data) === J(nl.data), nl.data);
  const em = maps.plain('😀'.repeat(90), 80);
  check('plain cuts at a code point, never half an emoji', cps(em) === 80 && !/[\ud800-\udbff]$/.test(em));
  check('plain: links in links settle', maps.plain('[[a](b)](c)', 80) === 'a' && maps.plain('<<b>b>x', 80) === 'b>x', [maps.plain('[[a](b)](c)', 80), maps.plain('<<b>b>x', 80)]);
  const rand = rng(7), bits = ['a', 'B', ' ', '  ', '*', '**', '_', '__', '`', '<', '>', '<b>', '</i>', '[', ']', '(', ')', '[x](y)', '](', ')(', '![', 'http://', 'www.', '- ', '# ', '1. ', '+ ', '> ', '\n', '\t', '\u202e', '😀', '日本', 'é', '~~', '==', '~~x~~', '==y==', '{#a}', '•'];
  let stable = true, bad = null;
  for (let i = 0; i < 3000 && stable; i++) {
    let s = ''; const n = 1 + Math.floor(rand() * 14); for (let j = 0; j < n; j++) s += bits[Math.floor(rand() * bits.length)];
    const p = maps.plain(s, 1 + Math.floor(rand() * 30));
    if (maps.plain(p, 200) !== p) { stable = false; bad = [s, p, maps.plain(p, 200)]; }
  }
  check('plain(plain(s)) is plain(s), 3,000 random strings', stable, bad);

  check('units: lower case and digits are 1', maps.units('abc1') === 4);
  check('units: capitals are 1.15', Math.abs(maps.units('ABC') - 3.45) < 1e-9);
  check('units: East Asian wide letters are 1.8', Math.abs(maps.units('細胞한글カナ') - 6 * 1.8) < 1e-9);
  check('units: emoji are 2, combining marks 0', maps.units('😀☀') === 4 && maps.units('e\u0301') === 1);
  const w = maps.wrap('Electron transport on the inner membrane', 18);
  check('wrap breaks at spaces within the width', w.length === 3 && w.every(l => maps.units(l) <= 18) && w.join(' ') === 'Electron transport on the inner membrane', w);
  const cjk = maps.wrap('細胞は生命の基本単位であり、すべての生物は細胞からできている', 18);
  check('wrap breaks a script without spaces anywhere', cjk.length > 1 && cjk.every(l => maps.units(l) <= 18) && cjk.join('') === '細胞は生命の基本単位であり、すべての生物は細胞からできている', cjk);
  const long = maps.wrap('Pneumonoultramicroscopicsilicovolcanoconiosis is long', 18);
  check('wrap cuts a word too long for a line', long.every(l => maps.units(l) <= 18) && long.join('').replace(/ /g, '') === 'Pneumonoultramicroscopicsilicovolcanoconiosisislong', long);
  check('wrap of nothing is one empty line', J(maps.wrap('', 18)) === '[""]');
}

// ---------- what normalize accepts and refuses (§2.1, §3.4, §3.7) ----------
{
  check('the starting value', J(maps.emptyOf('mindmap')) === '{"root":{"id":"root","label":""}}');
  for (const x of [undefined, null, '', '   '])
    check('no content is the starting value: ' + J(x), J(N(x).data) === J(maps.emptyOf('mindmap')));
  const legacy = N({ tree: { text: 'Photosynthesis', children: [{ text: 'Light reactions', children: [{ text: 'Make ATP' }] }, { text: 'Calvin cycle' }] } });
  check('{tree}: the old deck.diagrams shape, text as the label', J(legacy.data) === J({ root: { id: 'photosynthesis', label: 'Photosynthesis', children: [{ id: 'light-reactions', label: 'Light reactions', children: [{ id: 'make-atp', label: 'Make ATP' }] }, { id: 'calvin-cycle', label: 'Calvin cycle' }] } }), legacy);
  check('fromLegacy', J(maps.fromLegacy({ text: 'Photosynthesis', children: [{ text: 'Light reactions', children: [{ text: 'Make ATP' }] }, { text: 'Calvin cycle' }] })) === J(legacy.data));
  check('a bare idea', J(N({ label: 'Cell', children: [{ label: 'Nucleus' }] }).data) === J({ root: { id: 'cell', label: 'Cell', children: [{ id: 'nucleus', label: 'Nucleus' }] } }));
  check('a bare idea with text and string children', J(N({ text: 'Cell', children: ['Nucleus', 7, { text: 'Mito' }] }).data) === J({ root: { id: 'cell', label: 'Cell', children: [{ id: 'nucleus', label: 'Nucleus' }, { id: 'idvxgc6', label: '7' }, { id: 'mito', label: 'Mito' }] } }), N({ text: 'Cell', children: ['Nucleus', 7, { text: 'Mito' }] }).data);
  const al = N({ root: { label: 'Cell', children: [{ label: 'Mito', cards: ['c1', 'c2'] }] } });
  check('cards is read as cardIds, with a warning', J(al.data.root.children[0].cardIds) === '["c1","c2"]' && al.warnings.includes('Read “cards” as cardIds on 1 idea.'), al);
  check('{root: "words"}', J(N({ root: 'Just a topic' }).data) === '{"root":{"id":"just-a-topic","label":"Just a topic"}}');
  check('a JSON string is parsed', J(N(JSON.stringify(SPEC_DATA)).data) === J(SPEC_DATA));
  check('a JSON string of a JSON string is parsed', J(N(JSON.stringify(JSON.stringify(SPEC_DATA))).data) === J(SPEC_DATA));
  check('outline text as {text}', J(N({ text: SPEC_TEXT }).data) === J(SPEC_DATA));
  check('outline text as {markdown}', J(N({ markdown: SPEC_TEXT }).data) === J(SPEC_DATA));
  check('a string that only looks like JSON is outline text', N('[x] Topic\n- a').data.root.label === '[x] Topic');
  const unk = N({ root: { id: 'r', label: 'R', color: 'red', x: 4, children: [{ label: 'A', y: 2, folded: false, note: '' }] }, zoom: 2 });
  check('unknown keys are dropped; empty ones left out; key order fixed', J(unk.data) === '{"root":{"id":"r","label":"R","children":[{"id":"a","label":"A"}]}}', unk);
  check('keys come out in the one order', J(N({ root: { children: [{ folded: true, cardIds: ['c1'], note: 'n', label: 'L', id: 'l', children: [{ label: 'k' }] }], label: 'R', id: 'r' } }).data) === '{"root":{"id":"r","label":"R","children":[{"id":"l","label":"L","note":"n","cardIds":["c1"],"folded":true,"children":[{"id":"k","label":"k"}]}]}}');

  const shape = throwsOf(() => N({ blocks: [{ type: 'text', text: 'x' }] }));
  check('Note blocks are refused (shape)', shape && shape.code === 'shape' && shape.message === 'This page is a Mind map: send its content as text or data (create_page shows both); blocks are a Note’s. Nothing was saved.' && shape.app === 'This page is a Mind map. Update Lucida to change it here.', shape && [shape.code, shape.message, shape.app]);
  const dshape = throwsOf(() => maps.normalize('diagram', { blocks: [] }));
  check('Note blocks on a diagram name a Diagram', dshape && dshape.code === 'shape' && dshape.message.startsWith('This page is a Diagram:') && dshape.app === 'This page is a Diagram. Update Lucida to change it here.', dshape && dshape.message);
  const UNREAD = 'That isn’t a mind map: send text (an indented list, the topic first) or data ({"root": …}). Nothing was saved.';
  for (const x of [[1, 2], 5, true, {}, { foo: 1 }, '[1,2]', { root: 5 }, { tree: 'x' }]) {
    const e = throwsOf(() => N(x));
    check('refused as unreadable: ' + J(x), e && e.code === 'unreadable' && e.message === UNREAD, e && [e.code, e.message]);
  }
  const kind = throwsOf(() => maps.normalize('diagram', { nodes: [] }));
  check('a kind not read yet: notReady’s words', kind && kind.code === 'kind' && kind.message === 'Lucida can’t show Diagram pages yet; make a note, a mind map or a diagram.', kind && kind.message);
  const notKind = throwsOf(() => maps.normalize('constructor', { blocks: [] }));
  check('not a kind at all (even one an object inherits)', notKind && notKind.code === 'kind' && notKind.message === 'A page is a note, a mind map or a diagram.', notKind && notKind.message);
  const bare = throwsOf(() => N([{ type: 'p', text: 'x' }, { type: 'h1', text: 'y' }]));
  check('a bare list of Note blocks is Note-shaped (shape)', bare && bare.code === 'shape', bare && bare.code);
  check('emptyOf: only the kinds', maps.emptyOf('toString') === null && maps.emptyOf('__proto__') === null && maps.emptyOf('diagram').nodes.length === 0);
  check('normalizing twice changes nothing', (r => J(N(r.data).data) === J(r.data) && N(r.data).warnings.length === 0)(N(SPEC_TEXT + '\n- Extra idea\n  > a note')));
}

// ---------- caps (§2.1) and their warnings (§3.7) ----------
{
  const mains = Array.from({ length: 10 }, (_, i) => ({ label: 'M' + (i + 1), children: Array.from({ length: 20 }, (_, j) => ({ label: 'M' + (i + 1) + ' k' + (j + 1) })) }));
  const big = N({ root: { label: 'Organelles', children: mains } });
  check('200 ideas at most, cut from the end of breadth-first order', ids(big.data).length === 200 && find(big.data, 'm10').children.length === 9 && find(big.data, 'm9').children.length === 20, ids(big.data).length);
  check('the warning for ideas past 200', big.warnings.includes('Cut 11 ideas past 200 (the deepest ones under “M10” first).'), big.warnings);
  let chain = { label: 'Level 9' };
  for (let l = 8; l >= 2; l--) chain = { label: 'Level ' + l, children: [chain] };
  const deep = N({ root: { label: 'The cell', children: [{ label: 'Mitochondria', children: [chain] }, { label: 'Nucleus' }] } });
  let depth = 0; for (let n = find(deep.data, 'mitochondria'); n.children; n = n.children[0]) depth++;
  check('6 levels under the topic at most', depth === 5 && !find(deep.data, 'level-7'), depth);
  check('the warning for ideas too deep', deep.warnings.includes('Cut 3 ideas deeper than 6 levels under “Mitochondria”.'), deep.warnings);
  const wide = N({ root: { label: 'Cell', children: [{ label: 'Organelles', children: Array.from({ length: 23 }, (_, i) => ({ label: 'O' + i, children: [{ label: 'under O' + i }] })) }] } });
  check('20 children under one idea at most', find(wide.data, 'organelles').children.length === 20 && !find(wide.data, 'o20') && ids(wide.data).length === 42);
  check('the warning for too many children', wide.warnings.includes('Kept 20 of the 23 ideas under “Organelles”.'), wide.warnings);
  const two = N({ root: { label: 'Cell', children: [{ label: 'A', children: Array.from({ length: 21 }, (_, i) => 'a' + i) }, { label: 'B', children: Array.from({ length: 25 }, (_, i) => 'b' + i) }] } });
  check('too many children under two ideas, one warning', two.warnings.filter(w => w.startsWith('Kept 20')).length === 1 && two.warnings.includes('Kept 20 of the 21 ideas under “A” and 20 of the 25 under “B”.'), two.warnings);
  const longs = N({ root: { label: 'Cell', children: [{ label: 'x'.repeat(100) }, { label: 'y '.repeat(60) }, { label: 'short' }] } });
  check('labels are cut to 80 code points', longs.data.root.children.every(c => cps(c.label) <= 80) && longs.data.root.children[0].label === 'x'.repeat(80));
  check('the warning for long labels', longs.warnings.includes('Shortened 2 labels to 80 characters; put longer text in the note.'), longs.warnings);
  const note = N({ root: { label: 'Cell', note: Array.from({ length: 10 }, (_, i) => 'line ' + i).join('\n\n') } });
  check('a note keeps its lines, at most 8, empty ones gone', note.data.root.note === Array.from({ length: 8 }, (_, i) => 'line ' + i).join('\n') && note.warnings.includes('Shortened 1 note to 600 characters and 8 lines.'), note);
  const note2 = N({ root: { label: 'Cell', note: 'é'.repeat(700) } });
  check('a note is cut at 600 code points', cps(note2.data.root.note) === 600);
  const cards = N({ root: { label: 'Cell', cardIds: ['c1', 'c2', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'bad id'] } });
  check('cardIds: unique, valid, at most 8', J(cards.data.root.cardIds) === J(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']) && cards.warnings.includes('Kept 8 card ids on “Cell”.') && cards.warnings.some(w => w.startsWith('Left out 1 card id')), cards);
  const flat = N({ root: { label: 'R', children: Array.from({ length: 205 }, (_, i) => 'x' + i) } });
  check('children cap applies before the 200 cap', ids(flat.data).length === 21);
}

// ---------- reading a huge tree: breadth first ----------
{
  const huge = { root: { label: 'T', children: Array.from({ length: 30 }, (_, i) => ({ label: 'M' + i, children: Array.from({ length: 200 }, (_, j) => 'm' + i + ' k' + j) })) } };
  const r = N(huge), per = r.data.root.children.map(c => (c.children || []).length);
  check('more than 5,000 ideas: what is kept is the start of breadth-first order', J(per.slice(0, 9)) === J([20, 20, 20, 20, 20, 20, 20, 20, 19]) && per.slice(9).every(x => x === 0), per);
  check('…and the counts it can’t know say “more than”', r.warnings.some(w => w.startsWith('Cut more than ') && w.includes(' past 200')), r.warnings);
}

// ---------- ids (§2.0, §2.1) ----------
{
  check('slug of a label', maps.slug('Krebs cycle in the matrix', 'i') === 'krebs-cycle-in-the-matrix');
  check('slugs are at most 32 characters', (s => s.length <= 32 && !s.endsWith('-'))(maps.slug('Electron transport on the inner mitochondrial membrane', 'i')), maps.slug('Electron transport on the inner mitochondrial membrane', 'i'));
  check('slugs drop accents', maps.slug('Café au lait', 'i') === 'cafe-au-lait');
  const a = maps.slug('細胞', 'i'), b = maps.slug('細胞', 'i'), c = maps.slug('核', 'i');
  check('no Latin letters: i and 6 base-36 characters of a hash', /^i[0-9a-z]{6}$/.test(a) && a === b && a !== c && /^i[0-9a-z]{6}$/.test(maps.slug('2024', 'i')), [a, c]);
  const same = N({ root: { label: 'Cell', children: ['Part', 'Part', 'Part'] } });
  check('the same words make -2, -3', J(same.data.root.children.map(x => x.id)) === '["part","part-2","part-3"]');
  const nonLatin = N({ root: { label: '細胞', children: ['核', 'ミトコンドリア'] } });
  check('non-Latin labels get hash ids', [nonLatin.data.root.id, ...nonLatin.data.root.children.map(x => x.id)].every(i => /^i[0-9a-z]{6}$/.test(i)), nonLatin.data);
  const dup = N({ root: { id: 'r', label: 'Energy', children: [{ id: 'atp', label: 'ATP' }, { id: 'atp', label: 'ATP synthase' }] } });
  check('a repeated id: the first keeps it', dup.data.root.children[0].id === 'atp' && dup.data.root.children[1].id === 'atp-2', dup.data);
  check('the warning for a repeated id', dup.warnings.includes('Two ideas had the id “atp”: the second is now “atp-2”.'), dup.warnings);
  const bad = N({ root: { id: 'my root!', label: 'R', children: [{ id: 'a b', label: 'A' }, { id: '!!!', label: 'Bee' }] } });
  check('bad characters in an id are slugged, not dropped', bad.data.root.id === 'my-root' && bad.data.root.children[0].id === 'a-b' && bad.data.root.children[1].id === 'bee', bad.data);
  check('the warning for slugged ids', bad.warnings.some(w => w.includes('“my root!” is now “my-root”')), bad.warnings);
  check('an id up to 40 characters', N({ root: { id: 'x'.repeat(40), label: 'R' } }).data.root.id === 'x'.repeat(40) && N({ root: { id: 'x'.repeat(41), label: 'R' } }).data.root.id === 'x'.repeat(40));
  check('a number id is read as its digits', N({ root: { id: 12, label: 'R' } }).data.root.id === '12');

  // Matching to the old version by words.
  const re = N('The cell\n- Nucleus\n  - Holds the DNA\n- Mitochondria\n  - Krebs cycle in the matrix', SPEC_DATA, { ai: true });
  check('ideas without ids keep the old ids by their words', J(ids(re.data)) === J(['cell', 'nucleus', 'dna', 'mito', 'krebs']), ids(re.data));
  check('the warning for matching by words (the topic is matched by its words too)', re.warnings.includes('Matched 5 ideas without ids to the old ones by their words.'), re.warnings);
  const one = N('The cell {#cell}\n- Nucleus {#nucleus}\n- mitochondria', SPEC_DATA, { ai: true });
  check('one matched: the singular warning, case ignored', find(one.data, 'mito') && one.warnings.includes('Matched 1 idea without an id to the old one by its words.'), one);
  const prev = { root: { id: 'r', label: 'R', children: [
    { id: 'a', label: 'A', children: [{ id: 'sa', label: 'Structure' }, { id: 'u', label: 'Unique words' }] },
    { id: 'b', label: 'B', children: [{ id: 'sb', label: 'Structure' }] }] } };
  const m = N({ root: { id: 'r', label: 'R', children: [{ id: 'a', label: 'A', children: [{ label: 'Structure' }] }, { label: 'C', children: [{ label: 'Structure' }, { label: 'unique   WORDS' }] }] } }, prev, { ai: true });
  check('(1) the same words under the same parent', find(m.data, 'a').children[0].id === 'sa', m.data);
  check('(2) words two old ideas share, under a new parent: a new id', find(m.data, 'c').children[0].id === 'structure', m.data);
  check('(2) words only one old idea has, anywhere (spacing and case ignored): its id', find(m.data, 'c').children[1].id === 'u', m.data);
  check('ideas left out are gone', !find(m.data, 'b') && !find(m.data, 'sb'));
  const giv = N({ root: { id: 'cell', label: 'The cell', children: [{ label: 'Nucleus' }, { id: 'nucleus', label: 'Nucleus (new)' }] } }, SPEC_DATA, { ai: true });
  check('a given id is never taken by words', giv.data.root.children[1].id === 'nucleus' && giv.data.root.children[0].id !== 'nucleus', giv.data);
  const golgi = N({ root: { id: 'r', label: 'R', children: [{ label: 'Golgi' }] } }, { root: { id: 'r', label: 'R', children: [{ id: 'golgi', label: 'Packaging', note: 'old note' }] } }, { ai: true });
  check('a new id never reuses an old idea’s id (its note and marks stay with it)', golgi.data.root.children[0].id === 'golgi-2' && !golgi.data.root.children[0].note, golgi.data);
  // The topic goes through the same three steps as any idea (§2.1): its id is never carried over to other words.
  const topic = N('Photosynthesis\n- Light reactions\n- Calvin cycle', { root: { id: 'cell', label: 'The cell', note: 'Cells are the unit of life.', cardIds: ['c1'] } }, { ai: true });
  check('a topic sent without an id, with other words: a new id, and the old topic’s note and cards don’t carry over', topic.data.root.id === 'photosynthesis' && !topic.data.root.note && !topic.data.root.cardIds && !topic.warnings.length, topic);
  const sameTopic = N({ root: { label: 'the  CELL', children: [] } }, SPEC_DATA, { ai: true });
  check('a topic sent without an id, with the same words: the old topic’s id', sameTopic.data.root.id === 'cell', sameTopic.data);
  const emptyTopic = N('- A\n- B', { root: { id: 'root', label: '', note: 'kept' } }, { ai: true });
  check('an empty topic is the old empty topic', emptyTopic.data.root.id === 'root' && emptyTopic.data.root.note === 'kept', emptyTopic.data);

  // An id that isn't one is matched by its words first, and only slugged when nothing matches (§2.1).
  const prevMito = { root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria', note: 'Old note', cardIds: ['c1'] }] } };
  const badMito = N({ root: { id: 'cell', label: 'The cell', children: [{ id: 'my mito', label: 'Mitochondria' }] } }, prevMito, { ai: true });
  check('a bad id on an idea with the old words keeps the old id, note and cards', J(badMito.data.root.children) === J([{ id: 'mito', label: 'Mitochondria', note: 'Old note', cardIds: ['c1'] }]) && J(badMito.warnings) === J(['Matched 1 idea without an id to the old one by its words.']), badMito);
  const badNew = N({ root: { id: 'cell', label: 'The cell', children: [{ id: 'my ribo', label: 'Ribosomes' }] } }, prevMito, { ai: true });
  check('a bad id with new words is slugged, with the warning', badNew.data.root.children[0].id === 'my-ribo' && badNew.warnings.some(w => w.includes('“my ribo” is now “my-ribo”')), badNew);

  // Repeated ids: the first in the outline keeps it, whatever its depth.
  const dupOut = N('T {#t}\n- A {#a}\n  - First x {#x}\n- Second x {#x}');
  check('a repeated id: the first in the outline keeps it', find(dupOut.data, 'x').label === 'First x' && find(dupOut.data, 'x-2').label === 'Second x' && dupOut.warnings.includes('Two ideas had the id “x”: the second is now “x-2”.'), dupOut);
  const dupData = N({ root: { id: 'r', label: 'R', children: [{ id: 'a', label: 'A', children: [{ id: 'atp', label: 'Deep ATP' }] }, { id: 'atp', label: 'Later ATP' }] } });
  check('a repeated id in data: the first in data order keeps it', find(dupData.data, 'atp').label === 'Deep ATP' && find(dupData.data, 'atp-2').label === 'Later ATP', dupData.data);

  // Matching: the same words under the same parent before the same words anywhere, whatever the depth.
  const prevAtp = maps.mindmapFromText('Cell {#cell}\n- Mitochondria {#mito}\n  - ATP synthase {#atp cards:c1}\n    > Spins to make ATP.\n- Nucleus {#nucleus}').data;
  const two = N('Cell\n- ATP synthase\n- Mitochondria\n  - ATP synthase\n- Nucleus', prevAtp, { ai: true });
  check('(1) before (2): the idea that stayed under its parent keeps its id, note and cards', parentOf(two.data, 'atp') === 'mito' && find(two.data, 'atp').note === 'Spins to make ATP.' && J(find(two.data, 'atp').cardIds) === '["c1"]' && two.data.root.children[0].id === 'atp-synthase' && !two.data.root.children[0].note, maps.textOf('mindmap', two.data));
  const deeper = N('Cell\n- Energy\n  - ATP synthase\n- Mito\n  - Inner\n    - ATP synthase', maps.mindmapFromText('Cell {#cell}\n- Mito {#mito}\n  - Inner {#inner}\n    - ATP synthase {#atp}').data, { ai: true });
  check('(2) skips an old idea a deeper idea takes under its own parent', parentOf(deeper.data, 'atp') === 'inner', maps.textOf('mindmap', deeper.data));
  const freshId = N('R {#r}\n- Krebs', { root: { id: 'r', label: 'R', children: [{ id: 'krebs', label: 'Old krebs' }] } }, { ai: true });
  check('a new id never takes an id the last version had, even one this write deletes', find(freshId.data, 'krebs-2') && !find(freshId.data, 'krebs'), freshId.data);

  // Words JavaScript keeps for its objects are never ids, so a plain object keyed by id never loses one.
  const proto = N({ root: { id: 'r', label: 'R', children: [{ id: '__proto__', label: 'P' }, { id: 'constructor', label: 'C' }, { label: 'Prototype' }] } });
  const pids = proto.data.root.children.map(c => c.id);
  check('“__proto__”, “constructor” and “prototype” are given new ids, with a warning', J(pids) === '["__proto__-2","constructor-2","prototype-2"]' && proto.warnings.includes('Gave “__proto__” and “constructor” a new id: Lucida keeps those words for itself.'), proto);
  const pf = {}; for (const id of pids) pf[id] = true;
  check('…so folds kept in a plain object all work', maps.layoutMind(proto.data, { folds: pf }).nodes.length === 4);
}

// ---------- the AI-keep rule (§2.1) ----------
{
  const t = N('The cell {#cell}\n- Mitochondria {#mito}\n  - Krebs cycle in the matrix {#krebs}', SPEC_DATA, { ai: true });
  check('an AI write that leaves out a note and cards keeps them', find(t.data, 'mito').note === SPEC_DATA.root.children[1].note && J(find(t.data, 'mito').cardIds) === '["cm1"]' && J(find(t.data, 'krebs').cardIds) === '["c1"]', t.data);
  const d = N({ root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria' }] } }, SPEC_DATA, { ai: true });
  check('the same in data', find(d.data, 'mito').note && J(find(d.data, 'mito').cardIds) === '["cm1"]');
  const app = N({ root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria' }] } }, SPEC_DATA);
  check('an app write is taken exactly as sent', !find(app.data, 'mito').note && !find(app.data, 'mito').cardIds);
  for (const [what, v] of [['null', null], ['""', '']]) {
    const c = N({ root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria', note: v }] } }, SPEC_DATA, { ai: true });
    check('note ' + what + ' clears it', !find(c.data, 'mito').note && J(find(c.data, 'mito').cardIds) === '["cm1"]', c.data);
  }
  for (const [what, v] of [['[]', []], ['null', null]]) {
    const c = N({ root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria', cardIds: v }] } }, SPEC_DATA, { ai: true });
    check('cardIds ' + what + ' clears them', !find(c.data, 'mito').cardIds && find(c.data, 'mito').note, c.data);
  }
  const lone = N('The cell {#cell}\n- Mitochondria {#mito cards:}\n  >', SPEC_DATA, { ai: true });
  check('in text, a lone ">" clears the note and an empty cards: clears the cards', !find(lone.data, 'mito').note && !find(lone.data, 'mito').cardIds, lone.data);
  const later = N('The cell {#cell}\n- Mitochondria {#mito}\n  >\n  > A new note.', SPEC_DATA, { ai: true });
  check('a lone ">" then "> " lines: the new note', find(later.data, 'mito').note === 'A new note.');
  const fold = N('The cell {#cell}\n- ER and Golgi {#er}\n  - Rough ER makes proteins {#rough-er}', SPEC_DATA, { ai: true });
  check('folded and labels are always as sent', !find(fold.data, 'er').folded);
  check('an idea left out goes with everything under it', !find(fold.data, 'smooth-er') && !find(fold.data, 'nucleus') && !find(fold.data, 'dna'));
  const move = N('The cell {#cell}\n- Nucleus {#nucleus}\n  - Krebs cycle in the matrix {#krebs}\n- Mitochondria {#mito}', SPEC_DATA, { ai: true });
  check('an id sent somewhere else is a move: the idea keeps its cards', parentOf(move.data, 'krebs') === 'nucleus' && J(find(move.data, 'krebs').cardIds) === '["c1"]' && !find(move.data, 'etc'), move.data);
  const blank = N({ root: { label: 'Cell', children: [{ label: '', children: [{ label: 'Lifted' }, { label: '  ', children: ['Deeper'] }] }, { label: 'Kept' }] } }, null, { ai: true });
  check('an AI write’s idea with no words goes; its children move up', J(blank.data.root.children.map(c => c.label)) === '["Lifted","Deeper","Kept"]' && blank.warnings.includes('Left out 2 ideas with no words; what was under them moved up.'), blank);
  const appBlank = N({ root: { id: 'r', label: '', children: [{ id: 'n1234567', label: '' }] } });
  check('from the app, an empty label (being typed) and an empty topic stay', appBlank.data.root.label === '' && appBlank.data.root.children[0].label === '' && appBlank.data.root.children[0].id === 'n1234567');
}

// ---------- the outline text form (§2.1) ----------
{
  const base = maps.mindmapFromText('Topic\n- A\n  - A1\n  - A2\n- B').data;
  check('4-space indentation', J(maps.mindmapFromText('Topic\n    - A\n        - A1\n        - A2\n    - B').data) === J(base));
  check('tab indentation', J(maps.mindmapFromText('Topic\n- A\n\t- A1\n\t- A2\n- B').data) === J(base));
  check('no bullets, indentation only', J(maps.mindmapFromText('Topic\n  A\n    A1\n    A2\n  B').data) === J(base));
  check('numbered and * bullets', J(maps.mindmapFromText('Topic\n1. A\n   * A1\n   * A2\n2. B').data) === J(base));
  check('a single bulleted top line is the topic', J(maps.mindmapFromText('- Topic\n  - A\n    - A1\n    - A2\n  - B').data) === J(base));
  check('headings: # topic, ## main ideas, items under them', J(maps.mindmapFromText('# Topic\n## A\n- A1\n- A2\n## B').data) === J(base));
  check('blank lines and code fences are skipped', J(maps.mindmapFromText('```\nTopic\n\n- A\n  - A1\n\n  - A2\n- B\n```').data) === J(base));
  const jump = maps.mindmapFromText('Topic\n- A\n  - A1\n        - A1a');
  check('a jump of several levels counts as one, with a warning', parentOf(jump.data, 'a1a') === 'a1' && jump.warnings.includes('Read 1 line indented more than one level deeper as one level deeper.'), jump);
  const tops = maps.mindmapFromText('Light reactions\n- Make ATP\nCalvin cycle', null, { title: 'Photosynthesis' });
  check('several top-level lines: the page title is the topic', tops.data.root.label === 'Photosynthesis' && J(tops.data.root.children.map(c => c.label)) === '["Light reactions","Calvin cycle"]' && tops.warnings.includes('Made the page title the topic: the text had 2 lines at the top level.'), tops);
  const attrs = maps.mindmapFromText('Topic {#t}\n- X {cards:c1, c2 folded #x}\n  - Y\n- Set {a, b}');
  check('{…} in any order, spaces after commas', J(find(attrs.data, 'x')) === J({ id: 'x', label: 'X', cardIds: ['c1', 'c2'], folded: true, children: [{ id: 'y', label: 'Y' }] }), attrs.data);
  check('braces that aren’t attributes stay in the label', attrs.data.root.children[1].label === 'Set {a, b}');
  check('notes: "> " lines joined with line breaks', maps.mindmapFromText('Topic\n- A\n  > one\n  > two').data.root.children[0].note === 'one\ntwo');
  check('a note under the topic', maps.mindmapFromText('Topic\n> about it\n- A').data.root.note === 'about it');
  const mer = maps.mindmapFromText('mindmap\n  root((The cell))\n    Nucleus\n      [Holds the DNA]\n      ::icon(fa fa-book)\n    Mitochondria:::urgent\n      )Krebs cycle(\n      {{"Electron transport (ETC)"}}');
  check('Mermaid mindmap: shapes stripped, classes and icons skipped', J(mer.data) === J({ root: { id: 'the-cell', label: 'The cell', children: [{ id: 'nucleus', label: 'Nucleus', children: [{ id: 'holds-the-dna', label: 'Holds the DNA' }] }, { id: 'mitochondria', label: 'Mitochondria', children: [{ id: 'krebs-cycle', label: 'Krebs cycle' }, { id: 'electron-transport-etc', label: 'Electron transport (ETC)' }] }] } }), mer.data);
  check('Mermaid: the warning for skipped lines', mer.warnings.includes('Skipped 1 line Lucida doesn’t read (::icon).'), mer.warnings);
  check('(words) stay outside Mermaid', maps.mindmapFromText('Topic\n- (optional) step').data.root.children[0].label === '(optional) step');
  check('an empty topic prints and reads back', (d => maps.textOf('mindmap', d) === '{#root}\n- A {#a}' && J(maps.mindmapFromText(maps.textOf('mindmap', d)).data) === J(d))(N({ root: { id: 'root', label: '', children: [{ id: 'a', label: 'A' }] } }).data));
}

// ---------- the {…} at a line's end, read when written a little loosely ----------
{
  const prev = maps.mindmapFromText('Cell {#cell}\n- Krebs cycle {#krebs cards:c1}\n  > In the matrix.').data;
  const R = t => N('Cell {#cell}\n- Krebs cycle ' + t, prev, { ai: true });
  for (const [t, want] of [['{#krebs cards: c1, c2}', { id: 'krebs', label: 'Krebs cycle', note: 'In the matrix.', cardIds: ['c1', 'c2'] }], ['{#krebs, folded}', { id: 'krebs', label: 'Krebs cycle', note: 'In the matrix.', cardIds: ['c1'], folded: true }],
    ['{# krebs}', { id: 'krebs', label: 'Krebs cycle', note: 'In the matrix.', cardIds: ['c1'] }], ['{id:krebs}', { id: 'krebs', label: 'Krebs cycle', note: 'In the matrix.', cardIds: ['c1'] }],
    ['{cards: folded}', { id: 'krebs', label: 'Krebs cycle', note: 'In the matrix.', folded: true }], ['{#krebs cards:c1,c2 , c3}', { id: 'krebs', label: 'Krebs cycle', note: 'In the matrix.', cardIds: ['c1', 'c2', 'c3'] }]]) {
    const r = R(t);
    check('attributes written loosely: ' + t, J(r.data.root.children[0]) === J(want) && !r.warnings.some(w => w.startsWith('Couldn’t')), r);
  }
  const odd = N('Cell {#cell}\n- Krebs {#krebs color:red}\n- Set {a, b}\n- C# and F# {C#, F#}');
  check('a {…} with #id that can’t be read stays in the words, with a warning (and braces that aren’t attributes, without one)', odd.data.root.children[0].label === 'Krebs {#krebs color:red}' && odd.data.root.children[1].label === 'Set {a, b}' && odd.warnings.includes('Couldn’t read the {…} at the end of 1 line (#id, folded and cards:id,id only); it stayed in the words.'), odd);

  // A topic whose words start with a mark prints as a "# " heading, so the text reads back the same.
  for (const t of ['> 5 mm', '1. Introduction', '100) Steps', '+ ve', '-', '#', '* not a bullet?', '```code', '~~~ wave', 'mindmap']) {
    const d = N({ root: { id: 'r', label: t, note: 'n', children: [{ id: 'a', label: 'A', children: [{ id: 'b', label: '> b' }] }] } }).data;
    const text = maps.textOf('mindmap', d), back = maps.mindmapFromText(text);
    check('a topic ' + J(t) + ' prints and reads back exactly', J(back.data) === J(d) && maps.textOf('mindmap', back.data) === text && !back.warnings.length, [d.root.label, text, back]);
  }
  check('only those topics print as headings', maps.textOf('mindmap', SPEC_DATA).startsWith('The cell {#cell}') && maps.textOf('mindmap', N({ root: { id: 'r', label: '> 5 mm' } }).data) === '# > 5 mm {#r}');

  // Past 5,000 idea lines the rest is only counted.
  const many = maps.mindmapFromText('T\n' + Array.from({ length: 6000 }, (_, i) => '- idea ' + i).join('\n'));
  check('an outline of 6,000 lines: 20 kept, the rest counted', many.data.root.children.length === 20 && many.warnings.includes('Kept 20 of the 4999 ideas under “T”.') && many.warnings.includes('Cut 1001 ideas past 200.'), many.warnings);
}

// ---------- random maps: text round trips, idempotence ----------
const WORDS = ['cell', 'Nucleus', 'ATP', 'Krebs', 'cycle', 'in', 'the', 'matrix', 'électron', 'H⁺', 'FADH₂', '細胞', 'ミトコンドリア', '한글', '😀', '🧬', 'x'.repeat(30), 'Ωmega', '(a)', '[b]', '{c}', 'd:e', '#f', '- g', '> h', 'i*j', '1.', '2)', '{#k}', 'folded', 'cards:x'];
function label(rand, max) { let s = ''; const n = 1 + Math.floor(rand() * (max || 5)); for (let i = 0; i < n; i++) s += (i ? ' ' : '') + WORDS[Math.floor(rand() * WORDS.length)]; return s; }
let idn = 0;
function randomMap(rand, size, opts) {
  const o = opts || {}, root = { id: 'r' + (idn++), label: label(rand, 3) }, all = [[root, 0]];
  for (let i = 1; i < size; i++) {
    let p;
    for (let t = 0; t < 6; t++) { p = all[Math.floor(rand() * all.length)]; if (p[1] < 6 && (!p[0].children || p[0].children.length < 20)) break; p = null; }
    if (!p) p = [root, 0];
    if (p[1] >= 6 || (p[0].children && p[0].children.length >= 20)) continue;
    const n = { id: 'n' + (idn++), label: label(rand, o.long ? 14 : 5) };
    if (rand() < 0.2) n.note = label(rand, 8) + (rand() < 0.3 ? '\n' + label(rand, 4) : '');
    if (rand() < 0.2) n.cardIds = ['c' + Math.floor(rand() * 9), 'cm' + Math.floor(rand() * 9)].filter((v, i, a) => a.indexOf(v) === i);
    if (rand() < 0.1) n.folded = true;
    (p[0].children || (p[0].children = [])).push(n);
    all.push([n, p[1] + 1]);
  }
  return maps.normalize('mindmap', { root }).data;
}
{
  const rand = rng(42);
  let rt = true, rtBad = null, idem = true, idemBad = null;
  for (let i = 0; i < 400; i++) {
    const d = randomMap(rand, 1 + Math.floor(rand() * 60));
    const t = maps.textOf('mindmap', d), back = maps.mindmapFromText(t);
    if (rt && (J(back.data) !== J(d) || maps.textOf('mindmap', back.data) !== t || back.warnings.length)) { rt = false; rtBad = [t, maps.textOf('mindmap', back.data), back.warnings]; }
    const again = N(d);
    if (idem && (J(again.data) !== J(d) || again.warnings.length)) { idem = false; idemBad = [d, again]; }
  }
  check('text -> data -> text is exact, 400 random maps', rt, rtBad);
  check('normalizing a normalized map changes nothing, 400 random maps', idem, idemBad);
  let idem2 = true, bad2 = null;
  for (let i = 0; i < 300 && idem2; i++) {
    const raw = { root: { label: label(rand, 20), children: Array.from({ length: Math.floor(rand() * 30) }, () => (rand() < 0.3 ? label(rand, 30) : { label: label(rand, 30), id: rand() < 0.5 ? label(rand, 2) : undefined, note: rand() < 0.5 ? label(rand, 200) : undefined, cards: rand() < 0.3 ? [label(rand, 1), 'c1'] : undefined, children: rand() < 0.5 ? [label(rand, 3), { text: '' }] : undefined })) } };
    const a = N(raw, null, { ai: rand() < 0.5 }), b = N(a.data);
    if (J(a.data) !== J(b.data) || b.warnings.length) { idem2 = false; bad2 = [raw, a.data, b]; }
  }
  check('normalize is idempotent on messy input, 300 cases', idem2, bad2);
}

// ---------- layout (§4.3, §4.6) ----------
function overlaps(L) {
  const n = L.nodes;
  for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) {
    const a = n[i], b = n[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return [a.id, b.id, a, b];
  }
  return null;
}
const tenth = v => Math.round(v * 10) / 10 === v;
{
  const L = maps.layoutMind(SPEC_DATA, { side: 'both' });
  check('layout: the same input gives byte-identical output', J(L) === J(maps.layoutMind(JSON.parse(J(SPEC_DATA)), { side: 'both' })));
  check('layout: visible ideas in outline order, folded ER closed', J(L.nodes.map(n => n.id)) === J(['cell', 'nucleus', 'dna', 'nucleolus', 'mito', 'krebs', 'etc', 'er']), L.nodes.map(n => n.id));
  const er = L.nodes.find(n => n.id === 'er');
  check('layout: a folded idea counts what it hides and is a chip wider', er.folded && er.hidden === 2 && er.kids === 2, er);
  const open = maps.layoutMind(SPEC_DATA, { side: 'both', folds: new Map([['er', false]]) }).nodes.find(n => n.id === 'er');
  check('layout: a fold on this device wins over folded', !open.folded && open.hidden === 0 && Math.abs(er.w - open.w - 26) < 0.11, [er.w, open.w]);
  check('layout: folds as a plain object work too', maps.layoutMind(SPEC_DATA, { folds: { er: false, mito: true } }).nodes.find(n => n.id === 'mito').hidden === 2);
  check('layout: 3 main ideas split across both sides', L.nodes.some(n => n.side === -1) && L.nodes.some(n => n.side === 1));
  const root = L.nodes[0];
  check('layout: the left side ends before the topic, the right starts after it', L.nodes.every(n => n.side === 0 || (n.side < 0 ? n.x + n.w <= root.x : n.x >= root.x + root.w)));
  check('layout: the smallest x and y are the margin', Math.min(...L.nodes.map(n => n.x)) === 24 && Math.min(...L.nodes.map(n => n.y)) === 24);
  check('layout: width and height hold everything', L.nodes.every(n => n.x + n.w <= L.width - 24 + 0.11 && n.y + n.h <= L.height - 24 + 0.11), [L.width, L.height]);
  check('layout: numbers rounded to 0.1', L.nodes.every(n => [n.x, n.y, n.w, n.h].every(tenth)) && L.links.every(l => l.c.every(tenth)));
  const R = maps.layoutMind(SPEC_DATA, { side: 'right' });
  check('layout: right puts everything after the topic', R.nodes.every(n => n.side >= 0) && R.nodes[0].x === 24);
  const twoMains = { root: { id: 'r', label: 'R', children: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] } };
  check('layout: fewer than 3 main ideas is one-sided even when both is asked', maps.layoutMind(twoMains, { side: 'both' }).nodes.every(n => n.side >= 0));
  // Links: from the parent's outer edge to the child's inner edge, both at their middles.
  const byId = new Map(L.nodes.map(n => [n.id, n]));
  check('layout: links meet the boxes’ edges', L.links.every(l => {
    const p = byId.get(l.from), c = byId.get(l.to), right = c.side > 0;
    return Math.abs(l.c[0] - (right ? p.x + p.w : p.x)) < 0.11 && Math.abs(l.c[1] - (p.y + p.h / 2)) < 0.11 && Math.abs(l.c[6] - (right ? c.x : c.x + c.w)) < 0.11 && Math.abs(l.c[7] - (c.y + c.h / 2)) < 0.11 && l.d === 'M' + l.c[0] + ' ' + l.c[1] + ' C' + l.c.slice(2).join(' ').replace(/^(\S+ \S+ \S+ \S+) /, '$1 ');
  }), L.links[0]);
  // The topic sits in the middle of the taller side.
  const mid = l => (l[0].y + l[0].h / 2 + l[l.length - 1].y + l[l.length - 1].h / 2) / 2;
  const rs = L.nodes.filter(n => n.level === 1 && n.side > 0), ls = L.nodes.filter(n => n.level === 1 && n.side < 0);
  check('layout: the topic is centred between its main ideas on both sides', Math.abs(root.y + root.h / 2 - mid(rs)) < 0.2 && Math.abs(root.y + root.h / 2 - mid(ls)) < 0.2, [root.y + root.h / 2, mid(rs), mid(ls)]);
  // Sides are picked as if every branch were open: folding never moves a branch across.
  const sides = l => J(l.nodes.filter(n => n.level === 1).map(n => [n.id, n.side]));
  check('layout: folding never moves a branch to the other side', sides(maps.layoutMind(SPEC_DATA, { folds: { nucleus: true, mito: true } })) === sides(maps.layoutMind(SPEC_DATA, { folds: { er: false } })));
  const folded = maps.layoutMind(SPEC_DATA, { folds: { cell: true } });
  check('layout: a folded topic shows alone with "+9"', folded.nodes.length === 1 && folded.nodes[0].hidden === 9 && folded.links.length === 0);
  const untitled = maps.layoutMind({ root: { id: 'root', label: '' } }, { title: 'Cellular respiration' });
  check('layout: an empty topic shows the page title', untitled.nodes[0].lines.join(' ') === 'Cellular respiration', untitled.nodes[0].lines);
  const big = maps.layoutMind(SPEC_DATA, { scale: 1.3 }), small = maps.layoutMind(SPEC_DATA, { scale: 1 });
  check('layout: a bigger text scale makes bigger boxes', big.nodes.every((n, i) => n.h > small.nodes[i].h && n.w >= small.nodes[i].w));
  check('layout: wrap widths per level', small.nodes.find(n => n.id === 'etc').lines.every(l => maps.units(l) <= 24));
  // h = lines·17·scale + 18 (+6 on the topic); at any scale a line fits its box (a renderer squeezes at most 8%, §4.2).
  const hOf = sc => maps.layoutMind({ root: { id: 'r', label: 'Topic' } }, { scale: sc }).nodes[0].h;
  check('layout: box height is lines·17·scale + 18, plus 6 on the topic', hOf(1) === 41 && hOf(1.3) === 46.1, [hOf(1), hOf(1.3)]);
  let worst = 0;
  for (const sc of [1, 1.15, 1.3]) for (const lbl of ['abcdefghijk mnopqrstuvwx abcdefghijk mnopqrstuvwx', 'Pneumonoultramicroscopicsilicovolcanoconiosis', 'WWWWWWWW WWWWWWWW WWWWWWWW', '細胞は生命の基本単位であり細胞からできている']) {
    const L = maps.layoutMind({ root: { id: 'r', label: lbl, children: [{ id: 'a', label: lbl, children: [{ id: 'b', label: lbl }] }] } }, { scale: sc });
    for (const n of L.nodes) { const lv = Math.min(n.level, 2), need = Math.max(...n.lines.map(l => maps.units(l))) * maps.M.char[lv] * sc, room = n.w - 2 * maps.M.padX - (n.folded ? maps.M.chip : 0); worst = Math.max(worst, need / room - 1); }
  }
  check('layout: no line needs more than its box at any text scale (' + (worst * 100).toFixed(1) + '%)', worst <= 0.08, worst);
  check('layout: kind dispatch', J(maps.layout('mindmap', SPEC_DATA, { side: 'both' })) === J(L));

  const rand = rng(1234);
  let ok = true, bad = null, det = true, detBad = null, cnt = 0;
  for (let i = 0; i < 300 && ok; i++) {
    const d = randomMap(rand, 2 + Math.floor(rand() * 199), { long: rand() < 0.5 });
    const folds = new Map();
    for (const id of ids(d)) if (rand() < 0.08) folds.set(id, rand() < 0.8);
    for (const side of ['both', 'right']) for (const scale of [1, 1.3]) {
      const lay = maps.layoutMind(d, { side, folds, scale });
      cnt++;
      const o = overlaps(lay);
      if (o) { ok = false; bad = { side, scale, o }; break; }
      if (!lay.nodes.every(n => [n.x, n.y, n.w, n.h].every(tenth) && n.x >= 24 && n.y >= 24)) { ok = false; bad = 'rounding or margin'; break; }
      if (det && J(lay) !== J(maps.layoutMind(JSON.parse(J(d)), { side, folds: new Map(folds), scale }))) { det = false; detBad = d; }
    }
  }
  check('layout: no two idea boxes overlap, ' + cnt + ' random layouts (both sides, right, folds, text scale)', ok, bad);
  check('layout: deterministic on random maps', det, detBad);

  // Budget (§4.6): 200 ideas in V8 within 3 ms.
  const cap = randomMap(rng(9), 400, { long: true });
  const capN = ids(cap).length;
  for (let i = 0; i < 30; i++) maps.layoutMind(cap, { side: 'both' });
  let t0 = performance.now(), runs = 200;
  for (let i = 0; i < runs; i++) maps.layoutMind(cap, { side: 'both' });
  const per = (performance.now() - t0) / runs;
  check('budget: layout of ' + capN + ' ideas under 3 ms in node (' + per.toFixed(3) + ' ms)', capN === 200 && per <= 3, per);
  t0 = performance.now();
  for (let i = 0; i < 50; i++) maps.normalize('mindmap', cap, cap, { ai: true });
  const perN = (performance.now() - t0) / 50;
  check('budget: normalize of 200 ideas with a previous version is quick (' + perN.toFixed(3) + ' ms)', perN < 10, perN);
  console.log('  (layout ' + per.toFixed(3) + ' ms, normalize ' + perN.toFixed(3) + ' ms for 200 ideas)');
}

// ---------- long and odd input takes time in proportion to its size ----------
{
  const time = f => { const t0 = performance.now(); f(); return performance.now() - t0; };
  const cases = [
    ['a 1 MB line of spaces', () => N('a' + ' '.repeat(1e6) + 'b')],
    ['a 1 MB line of spaces before a {', () => N('T\n- a' + ' '.repeat(1e6) + '{#x}')],
    ['50 lines of 20,000 spaces', () => N('T\n' + Array.from({ length: 50 }, () => '- a' + ' '.repeat(20000) + 'b').join('\n'))],
    ['60 labels of 20,000 "["', () => N({ root: { label: 'r', children: Array.from({ length: 60 }, () => '['.repeat(20000)) } })],
    ['60 labels of "[a](" 5,000 times', () => N({ root: { label: 'r', children: Array.from({ length: 60 }, () => '[a]('.repeat(5000)) } })],
    ['a label of "a ==x" 5,000 times', () => N({ root: { label: 'a ==x'.repeat(5000) } })],
    ['an id of 100,000 dashes', () => N({ root: { id: '-'.repeat(100000) + '!a', label: 'R' } })],
    ['a heading line of spaces with a line separator', () => N('#' + ' '.repeat(200000) + 'a b')],
    ['a Mermaid line of spaces', () => N('mindmap\n  root((T))\n    a' + ' '.repeat(200000) + ':::x')],
    ['an attribute block of 200,000 spaces and commas', () => N('T\n- a {' + ' , '.repeat(70000) + '#x}')]
  ];
  for (const [what, f] of cases) { f(); const ms = time(f); check('quick: ' + what + ' (' + ms.toFixed(1) + ' ms)', ms < 100, ms); }
}

// ---------- previews for a map inside a Note (§9.1) ----------
{
  const big = randomMap(rng(5), 120, { long: true });
  for (const [w, h] of [[640, 150], [340, 120]]) {
    const p = maps.previewOf('mindmap', big, { w, h, tones: { [big.root.children[0].id]: 'weak' } });
    check('preview ' + w + 'x' + h + ': fits, never above 100%', p.w === w && p.h === h && p.scale <= 1 && p.nodes.every(n => n.x >= -0.1 && n.y >= -0.1 && n.x + n.w <= w + 0.2 && n.y + n.h <= h + 0.2), p.scale);
    check('preview ' + w + ': at most 2 lines of 40 characters', p.nodes.every(n => n.lines.length <= 2 && n.lines.every(l => cps(l) <= 40)));
    check('preview ' + w + ': folded to level 2', p.nodes.every(n => n.level <= 2));
    check('preview ' + w + ': links are plain path data', p.links.length === p.nodes.length - 1 && p.links.every(d => /^[MCLZ0-9 .,\-]+$/.test(d)), p.links[0]);
    check('preview ' + w + ': tones', p.nodes.find(n => n.id === big.root.children[0].id).tone === 'weak' && p.nodes.filter(n => n.tone).length === 1);
  }
  const sideOfBig = p => { const r = p.nodes[0]; return p.nodes.some(n => n.x + n.w <= r.x); };
  check('preview 640: two-sided, 340: one-sided', sideOfBig(maps.previewOf('mindmap', big, { w: 640, h: 150 })) && !sideOfBig(maps.previewOf('mindmap', big, { w: 340, h: 120 })));
  const phone = maps.previewOf('mindmap', SPEC_DATA, { w: 340, h: 120 }), web = maps.previewOf('mindmap', SPEC_DATA, { w: 640, h: 150 });
  const sideOf = p => { const r = p.nodes[0]; return p.nodes.some(n => n.x + n.w <= r.x); };
  check('preview: two-sided at 480 or wider, one-sided under it', sideOf(web) && !sideOf(phone));
  const tiny = maps.previewOf('mindmap', { root: { id: 'r', label: 'Only a topic' } }, { w: 640, h: 150 });
  check('preview: a small map is not blown up', tiny.scale === 1 && tiny.nodes[0].w < 200);
}

// ---------- the picture as SVG ----------
{
  const C = { text: 'var(--text)', muted: 'var(--muted)', line: 'var(--line)', bg: 'var(--bg)', surf: 'var(--surf)', surf2: 'var(--surf2)', inv: 'var(--inv)', invText: 'var(--inv-text)', again: 'var(--again)', againTint: 'var(--again-tint)', hardTint: 'var(--hard-tint)', goodTint: 'var(--good-tint)' };
  const evil = { root: { id: 'r', label: 'A <script>alert(1)</script> & "q"', children: [{ id: 'a', label: 'x" onload="y', cardIds: ['c1'] }, { id: 'b', label: 'B', folded: true, children: [{ id: 'b1', label: 'B1' }] }, { id: 'c', label: 'C' }] } };
  const d = evil, L = maps.layoutMind(d);
  const svg = maps.svgOf('mindmap', L, C, { title: 'The <map>', data: d, tones: { a: 'weak', c: 'solid' } });
  check('svg: no colors of its own (theme tokens only)', !/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/.test(svg) && svg.includes('var(--inv)') && svg.includes('var(--again-tint)') && svg.includes('var(--good-tint)'), svg.slice(0, 300));
  check('svg: words are escaped', !svg.includes('<script>') && !svg.includes('onload="') && svg.includes('&lt;script&gt;') && svg.includes('aria-label="The &lt;map&gt;"'));
  check('svg: the picture is hidden from screen readers, the list is not', svg.includes('aria-hidden="true"') && svg.includes('<div class="dg-sr"><p>A &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;</p><ul><li>x&quot; onload=&quot;y</li><li>B<ul><li>B1</li></ul></li><li>C</li></ul></div>'), svg.slice(svg.indexOf('dg-sr')));
  check('svg: a folded idea shows +N, a weak one a dot', svg.includes('>+1</text>') && svg.includes('var(--again)"/>'));
  const topicData = { root: { id: 'cell', label: 'Cell', cardIds: ['c1'], children: [{ id: 'a', label: 'A' }] } };
  const topicSvg = maps.svgOf('mindmap', maps.layoutMind(topicData), C, { data: topicData, tones: [['cell', 'weak'], ['a', 'weak']] });
  check('svg: the topic shows its tone too (tint, dot) and its cards', (topicSvg.match(/fill="var\(--again-tint\)"/g) || []).length === 2 && (topicSvg.match(/var\(--again\)"\/>/g) || []).length === 2 && topicSvg.includes('fill="var(--text)" font-size="15"') && />1<\/text>/.test(topicSvg), topicSvg.slice(0, 600));
  const plainTopic = maps.svgOf('mindmap', maps.layoutMind(topicData), C, { data: topicData });
  check('svg: an untoned topic is inverted, its card count in invText', plainTopic.includes('fill="var(--inv)"') && plainTopic.includes('fill="var(--inv-text)">1</text>'));
  const plain = maps.svgOf('mindmap', maps.layoutMind(SPEC_DATA, { side: 'right' }), C);
  check('svg: without data, the list is what shows', plain.includes('<li>Mitochondria<ul><li>Krebs cycle in the matrix</li>') && plain.includes('<li>ER and Golgi</li></ul>'));
  check('svg: no colors given, currentColor', !/#[0-9a-f]{3,6}/i.test(maps.svgOf('mindmap', L, null)));
}

// ---------- edits (the editors' operations) ----------
const freeze = x => { if (x && typeof x === 'object') { Object.freeze(x); for (const v of Object.values(x)) freeze(v); } return x; };
{
  const snap = J(SPEC_DATA);
  freeze(SPEC_DATA);
  const E = (d, op) => maps.edit('mindmap', d, op);
  let r = E(SPEC_DATA, { op: 'add', id: 'n1234567', parent: 'mito', label: 'Cristae fold the inner membrane' });
  check('edit add: last under its parent', find(r.data, 'mito').children[2].id === 'n1234567' && r.summary === 'Added “Cristae fold the inner membrane” under “Mitochondria”', r.summary);
  r = E(SPEC_DATA, { op: 'add', id: 'n1', parent: 'mito', label: '', after: 'krebs' });
  check('edit add: after a sibling, empty while typed', find(r.data, 'mito').children[1].id === 'n1' && find(r.data, 'n1').label === '' && r.summary === 'Added an idea under “Mitochondria”');
  check('edit add: an id already used does nothing', E(SPEC_DATA, { op: 'add', id: 'krebs', parent: 'mito' }).summary === '');
  r = E(SPEC_DATA, { op: 'set', id: 'etc', label: 'Electron transport' });
  check('edit set: rename', find(r.data, 'etc').label === 'Electron transport' && r.summary === 'Renamed “Electron transport on the inner membrane” to “Electron transport”', r.summary);
  r = E(SPEC_DATA, { op: 'set', id: 'mito', note: null, folded: true });
  check('edit set: note and folded', !find(r.data, 'mito').note && find(r.data, 'mito').folded && r.summary === 'Changed the note on “Mitochondria”; Set “Mitochondria” to start folded', r.summary);
  r = E(SPEC_DATA, { op: 'remove', id: 'mito' });
  check('edit remove: the idea and its branch', !find(r.data, 'mito') && !find(r.data, 'krebs') && r.summary === 'Deleted “Mitochondria” and 2 ideas under it', r.summary);
  check('edit remove: never the topic', E(SPEC_DATA, { op: 'remove', id: 'cell' }).summary === '');
  r = E(SPEC_DATA, { op: 'move', id: 'mito', by: -1 });
  check('edit move up among siblings', J(r.data.root.children.map(c => c.id)) === '["mito","nucleus","er"]' && r.summary === 'Moved “Mitochondria”');
  check('edit move past the end does nothing', E(SPEC_DATA, { op: 'move', id: 'er', by: 1 }).summary === '');
  r = E(SPEC_DATA, { op: 'move', id: 'krebs', parent: 'nucleus', index: 0 });
  check('edit move to another parent', find(r.data, 'nucleus').children[0].id === 'krebs');
  check('edit move into its own branch does nothing', E(SPEC_DATA, { op: 'move', id: 'mito', parent: 'krebs' }).summary === '');
  r = E(SPEC_DATA, { op: 'indent', id: 'mito' });
  check('edit indent: under the sibling above, last', parentOf(r.data, 'mito') === 'nucleus' && find(r.data, 'nucleus').children[2].id === 'mito');
  r = E(SPEC_DATA, { op: 'outdent', id: 'krebs' });
  check('edit outdent: right after its parent', J(r.data.root.children.map(c => c.id)) === '["nucleus","mito","krebs","er"]');
  check('edit indent the first child does nothing', E(SPEC_DATA, { op: 'indent', id: 'nucleus' }).summary === '');
  r = E(SPEC_DATA, { op: 'link', id: 'krebs', cardId: 'c9' });
  check('edit link', J(find(r.data, 'krebs').cardIds) === '["c1","c9"]' && r.summary === 'Linked a card to “Krebs cycle in the matrix”');
  r = E(SPEC_DATA, { op: 'unlink', id: 'krebs', cardId: 'c1' });
  check('edit unlink', !find(r.data, 'krebs').cardIds && r.summary === 'Unlinked a card from “Krebs cycle in the matrix”');
  check('edit: an unknown operation does nothing', E(SPEC_DATA, { op: 'explode', id: 'mito' }).data === SPEC_DATA);
  check('edit never changes what it was given', J(SPEC_DATA) === snap);

  // The caps are checked before an edit: one past a cap does nothing, and nothing that is there is cut.
  const kids = (n, p) => Array.from({ length: n }, (_, i) => ({ id: p + i, label: p + ' ' + i }));
  const wide = { root: { id: 'r', label: 'T', children: [{ id: 'p', label: 'P', children: kids(20, 'k') }, { id: 'x', label: 'X' }] } };
  check('edit add under an idea with 20 children does nothing', E(wide, { op: 'add', id: 'nnew', parent: 'p', label: 'New', index: 0 }).summary === '');
  check('edit move into an idea with 20 children does nothing', E(wide, { op: 'move', id: 'x', parent: 'p', index: 0 }).summary === '');
  check('edit indent under an idea with 20 children does nothing', E({ root: { id: 'r', label: 'T', children: [{ id: 'p', label: 'P', children: kids(20, 'k') }, { id: 'x', label: 'X' }] } }, { op: 'indent', id: 'x' }).summary === '');
  const top20 = { root: { id: 'r', label: 'T', children: [{ id: 'p', label: 'P', children: [{ id: 'q', label: 'Q' }] }, ...kids(19, 'm')] } };
  check('edit add under a topic with 20 children does nothing', E(top20, { op: 'add', id: 'nnew', parent: 'r', label: 'New', index: 0 }).summary === '');
  check('edit outdent into a topic with 20 children does nothing', E(top20, { op: 'outdent', id: 'q' }).summary === '');
  check('edit reorder inside an idea with 20 children still works', E(wide, { op: 'move', id: 'k3', by: -1 }).summary === 'Moved “k 3”');
  let chain = { id: 'l6', label: 'L6' };
  for (let l = 5; l >= 1; l--) chain = { id: 'l' + l, label: 'L' + l, children: [chain] };
  const deep = { root: { id: 'r', label: 'T', children: [chain, { id: 'sib', label: 'Sib', children: [{ id: 'sc', label: 'Sc' }] }] } };
  check('edit add under an idea at level 6 does nothing', E(deep, { op: 'add', id: 'ndeep', parent: 'l6', label: 'Deep' }).summary === '');
  check('edit add under an idea at level 5 works', find(E(deep, { op: 'add', id: 'ndeep', parent: 'l5', label: 'Deep' }).data, 'ndeep'));
  check('edit move a branch where it would go past 6 levels does nothing', E(deep, { op: 'move', id: 'sib', parent: 'l5' }).summary === '' && E(deep, { op: 'move', id: 'sib', parent: 'l4' }).summary === 'Moved “Sib”');
  const deep2 = { root: { id: 'r', label: 'T', children: [{ id: 'a1', label: 'A1', children: [{ id: 'a2', label: 'A2', children: [{ id: 'a3', label: 'A3', children: [{ id: 'a4', label: 'A4', children: [{ id: 'a5', label: 'A5' }, { id: 's5', label: 'S5', children: [{ id: 's6', label: 'S6' }] }] }] }] }] }] } };
  check('edit indent a branch past 6 levels does nothing (its idea under it is never cut)', E(deep2, { op: 'indent', id: 's5' }).summary === '');
  const cap = { root: { id: 'r', label: 'T', children: Array.from({ length: 10 }, (_, i) => ({ id: 'm' + i, label: 'M' + i, children: kids(i < 9 ? 20 : 9, 'c' + i + '_') })) } };
  check('edit add at 200 ideas does nothing', ids(cap).length === 200 && E(cap, { op: 'add', id: 'nnew', parent: 'm9', label: 'New' }).summary === '');
}

// ---------- what changed (diff, summaryOf) ----------
{
  const D = (a, b, who) => maps.summaryOf(maps.diff('mindmap', a, b), { who });
  const added = maps.edit('mindmap', maps.edit('mindmap', maps.edit('mindmap', SPEC_DATA, { op: 'add', id: 'x1', parent: 'mito', label: 'Cristae' }).data, { op: 'add', id: 'x2', parent: 'mito', label: 'Own DNA' }).data, { op: 'add', id: 'x3', parent: 'mito', label: 'Matrix' }).data;
  check('summary: added under one idea', D(SPEC_DATA, added) === 'Added 3 ideas under Mitochondria', D(SPEC_DATA, added));
  check('summary: with who', D(SPEC_DATA, added, 'Claude') === 'Claude added 3 ideas under Mitochondria');
  const ren = maps.edit('mindmap', SPEC_DATA, { op: 'set', id: 'etc', label: 'ETC' }).data;
  check('summary: renamed', D(ren, SPEC_DATA) === 'Renamed “ETC” to “Electron transport on the inner membrane”');
  const sw = maps.edit('mindmap', SPEC_DATA, { op: 'move', id: 'krebs', by: 1 }).data;
  check('summary: a swap of two is one move', D(SPEC_DATA, sw) === 'Moved Krebs cycle in the matrix', D(SPEC_DATA, sw));
  const ln = maps.edit('mindmap', SPEC_DATA, { op: 'link', id: 'krebs', cardId: 'c9' }).data;
  check('summary: linked', D(SPEC_DATA, ln) === 'Linked a card to “Krebs cycle in the matrix”');
  const del = maps.edit('mindmap', SPEC_DATA, { op: 'remove', id: 'mito' }).data;
  check('summary: deleted with what was under it', D(SPEC_DATA, del) === 'Deleted “Mitochondria” and 2 ideas under it');
  const several = maps.edit('mindmap', ren, { op: 'add', id: 'x1', parent: 'cell', label: 'Ribosomes' }).data;
  check('summary: several kinds of change', D(SPEC_DATA, several) === 'Added “Ribosomes” under The cell and renamed “Electron transport on the inner membrane” to “ETC”', D(SPEC_DATA, several));
  check('summary: nothing', D(SPEC_DATA, SPEC_DATA) === 'No changes');
  const dd = maps.diff('mindmap', SPEC_DATA, added);
  check('diff lists the added ideas with their parent', dd.added.length === 3 && dd.added.every(a => a.parent === 'mito') && !dd.removed.length && !dd.moved.length);
}

// ---------- merge (§8.3) ----------
{
  const E = (d, op) => maps.edit('mindmap', d, op).data;
  const M = (b, m, t, prefer) => maps.merge('mindmap', b, m, t, { prefer });
  const base = SPEC_DATA;
  let r = M(base, E(base, { op: 'set', id: 'etc', label: 'ETC' }), E(base, { op: 'set', id: 'krebs', label: 'Krebs' }));
  check('merge: each side’s rename kept', find(r.data, 'etc').label === 'ETC' && find(r.data, 'krebs').label === 'Krebs' && !r.clashes.length, r);
  r = M(base, E(base, { op: 'set', id: 'etc', label: 'Mine' }), E(base, { op: 'set', id: 'etc', label: 'Theirs' }));
  check('merge: both renamed: a clash, mine preferred', find(r.data, 'etc').label === 'Mine' && J(r.clashes) === J([{ id: 'etc', what: 'label', yours: 'Mine', theirs: 'Theirs' }]), r.clashes);
  check('merge: prefer theirs', find(M(base, E(base, { op: 'set', id: 'etc', label: 'Mine' }), E(base, { op: 'set', id: 'etc', label: 'Theirs' }), 'theirs').data, 'etc').label === 'Theirs');
  r = M(base, E(base, { op: 'link', id: 'krebs', cardId: 'm1' }), E(E(base, { op: 'link', id: 'krebs', cardId: 't1' }), { op: 'unlink', id: 'krebs', cardId: 'c1' }));
  check('merge: cards as sets', J(find(r.data, 'krebs').cardIds) === '["t1","m1"]', find(r.data, 'krebs'));
  r = M(base, E(base, { op: 'remove', id: 'mito' }), E(base, { op: 'set', id: 'mito', label: 'Mitochondrion' }));
  check('merge: an edit beats a delete', find(r.data, 'mito') && find(r.data, 'mito').label === 'Mitochondrion' && r.clashes.some(c => c.id === 'mito' && c.what === 'deleted'), r);
  check('merge: ... but the unchanged ideas under it go', !find(r.data, 'krebs') && !find(r.data, 'etc'));
  r = M(base, E(base, { op: 'remove', id: 'mito' }), E(base, { op: 'add', id: 'n9', parent: 'mito', label: 'Theirs new' }));
  check('merge: a delete removes what theirs left alone; what they added under it moves up', !find(r.data, 'mito') && parentOf(r.data, 'n9') === 'cell', r.data);
  r = M(base, E(base, { op: 'set', id: 'krebs', label: 'Krebs (mine)' }), E(base, { op: 'remove', id: 'mito' }));
  check('merge: deleted by theirs, changed by mine: it comes back under the nearest idea left', find(r.data, 'krebs') && parentOf(r.data, 'krebs') === 'cell' && !find(r.data, 'etc'), r.data);
  r = M(base, E(base, { op: 'add', id: 'n8', parent: 'krebs', label: 'Mine new' }), E(base, { op: 'remove', id: 'mito' }));
  check('merge: added by mine under what theirs deleted: under the nearest idea left', parentOf(r.data, 'n8') === 'cell', r.data);
  r = M(base, E(base, { op: 'move', id: 'nucleus', parent: 'mito' }), E(base, { op: 'move', id: 'mito', parent: 'nucleus' }));
  check('merge: two moves that make a loop: the one closing it keeps theirs', parentOf(r.data, 'mito') === 'nucleus' && parentOf(r.data, 'nucleus') === 'cell' && r.clashes.some(c => c.what === 'move'), [r.data, r.clashes]);
  r = M(base, E(base, { op: 'move', id: 'krebs', parent: 'nucleus' }), E(base, { op: 'set', id: 'krebs', label: 'K' }));
  check('merge: mine moved, theirs renamed: both', parentOf(r.data, 'krebs') === 'nucleus' && find(r.data, 'krebs').label === 'K');
  r = M(base, E(base, { op: 'move', id: 'er', by: -1 }), E(base, { op: 'add', id: 'n7', parent: 'cell', label: 'Ribosomes' }));
  check('merge: mine reordered, theirs added: both', J(r.data.root.children.map(c => c.id)) === '["nucleus","er","mito","n7"]', r.data.root.children.map(c => c.id));
  check('merge: kind first is optional', J(maps.merge(base, base, SPEC_DATA).data) === J(SPEC_DATA));

  // Places (§8.3 steps 4 and 5): each side's reorder survives the other's, and an idea goes after the one before it.
  const T4 = (...k) => ({ root: { id: 'r', label: 'R', children: k.map(id => ({ id, label: id })) } });
  const order = d => d.root.children.map(c => c.id).join('');
  for (const [what, b, m, t, want] of [
    ['both reorder different ideas', 'ABCD', 'BACD', 'ABDC', 'BADC'],
    ['mine moves D first, theirs A last', 'ABCD', 'DABC', 'BCDA', 'DBCA'],
    ['mine adds X after A, theirs moves B last', 'ABC', 'AXBC', 'ACB', 'AXCB'],
    ['mine adds X at the end, theirs deletes B: after the nearest idea before it that is left', 'AB', 'ABX', 'A', 'AX'],
    ['theirs adds at the start, mine reverses', 'ABC', 'CBA', 'YABC', 'YCBA']]) {
    const r = M(T4(...b), T4(...m), T4(...t));
    check('merge places: ' + what, order(r.data) === want && !r.clashes.length, [order(r.data), r.clashes]);
  }
  r = M(T4(...'ABCD'), T4(...'BCAD'), T4(...'BACD'));
  check('merge places: both moved the same idea to different places: an order clash, mine preferred', order(r.data) === 'BCAD' && J(r.clashes) === J([{ id: 'A', what: 'order', yours: 'C', theirs: 'B' }]), [order(r.data), r.clashes]);
  check('merge places: … theirs preferred', order(M(T4(...'ABCD'), T4(...'BCAD'), T4(...'BACD'), 'theirs').data) === 'BACD');

  // Caps: two sides' additions together past 20 children or 200 ideas: an addition goes (the other side's first), never an idea
  // all three had, and it is said.
  const kids = (n, p) => Array.from({ length: n }, (_, i) => ({ id: p + i, label: p + ' ' + i }));
  const b19 = { root: { id: 'r', label: 'T', children: [{ id: 'p', label: 'P', children: kids(19, 'k') }] } };
  r = M(b19, E(b19, { op: 'add', id: 'nmine01', parent: 'p', label: 'Mine', index: 0 }), E(b19, { op: 'add', id: 'ntheir1', parent: 'p', label: 'Theirs', index: 0 }));
  check('merge caps: 20 children, theirs’ addition goes and nothing old', find(r.data, 'p').children.length === 20 && find(r.data, 'nmine01') && !find(r.data, 'ntheir1') && ['k18', 'k0'].every(id => find(r.data, id)) && J(r.clashes) === J([{ id: 'ntheir1', what: 'cut', yours: null, theirs: 'Theirs' }]), r.clashes);
  r = M(b19, E(b19, { op: 'add', id: 'nmine01', parent: 'p', label: 'Mine', index: 0 }), E(b19, { op: 'add', id: 'ntheir1', parent: 'p', label: 'Theirs', index: 0 }), 'theirs');
  check('merge caps: … theirs preferred, mine’s goes', find(r.data, 'ntheir1') && !find(r.data, 'nmine01') && r.clashes.some(c => c.id === 'nmine01' && c.what === 'cut'));
  const b199 = { root: { id: 'r', label: 'T', children: Array.from({ length: 10 }, (_, i) => ({ id: 'm' + i, label: 'M' + i, children: kids(i === 9 ? 17 : 19, 'c' + i + '_') })) } };
  r = M(b199, E(b199, { op: 'add', id: 'nmine02', parent: 'r', label: 'Mine' }), E(b199, { op: 'add', id: 'nthr002', parent: 'm0', label: 'Theirs' }));
  check('merge caps: 200 ideas, theirs’ addition goes and nothing old', ids(b199).length === 199 && ids(r.data).length === 200 && ids(b199).every(id => find(r.data, id)) && find(r.data, 'nmine02') && J(r.clashes) === J([{ id: 'nthr002', what: 'cut', yours: null, theirs: 'Theirs' }]), r.clashes);
  const b20 = { root: { id: 'r', label: 'T', children: [{ id: 'p', label: 'P', children: kids(19, 'k') }, { id: 'q', label: 'Q', children: [{ id: 'x', label: 'X' }] }] } };
  for (const prefer of ['mine', 'theirs']) {
    r = M(b20, E(b20, { op: 'move', id: 'x', parent: 'p' }), E(b20, { op: 'add', id: 'ntheir1', parent: 'p', label: 'Theirs' }), prefer);
    check('merge caps (' + prefer + ' preferred): an old idea only mine moved into a full idea goes back where theirs has it, a move clash, and nothing goes', parentOf(r.data, 'x') === 'q' && find(r.data, 'ntheir1') && find(r.data, 'p').children.length === 20 && J(r.clashes) === J([{ id: 'x', what: 'move', yours: 'p', theirs: 'q' }]), [r.data, r.clashes]);
  }

  // 2,000 random cases: the properties in §8.6.
  const rand = rng(2026);
  let n = 0;
  const fails = {};
  const bad = (k, info) => { if (!fails[k]) fails[k] = info; };
  const flat = d => { const m = new Map(); const st = [[d.root, null]]; while (st.length) { const [x, p] = st.pop(); m.set(x.id, { label: x.label, note: x.note || '', folded: !!x.folded, cards: J(x.cardIds || []), parent: p }); for (const c of x.children || []) st.push([c, x.id]); } return m; };
  function mutate(d, k) {
    for (let i = 0; i < k; i++) {
      const all = ids(d), pick = () => all[Math.floor(rand() * all.length)], x = rand();
      let op;
      if (x < 0.25) op = { op: 'add', id: 'n' + (idn++), parent: pick(), label: label(rand, 3) };
      else if (x < 0.4) op = { op: 'remove', id: pick() };
      else if (x < 0.55) op = { op: 'set', id: pick(), label: label(rand, 3) };
      else if (x < 0.62) op = { op: 'set', id: pick(), note: rand() < 0.3 ? null : label(rand, 6) };
      else if (x < 0.67) op = { op: 'set', id: pick(), folded: rand() < 0.5 };
      else if (x < 0.75) op = { op: 'link', id: pick(), cardId: 'k' + Math.floor(rand() * 6) };
      else if (x < 0.8) op = { op: 'unlink', id: pick(), cardId: 'c' + Math.floor(rand() * 9) };
      else if (x < 0.9) op = { op: 'move', id: pick(), parent: pick(), index: Math.floor(rand() * 4) };
      else op = { op: rand() < 0.5 ? 'indent' : rand() < 0.5 ? 'outdent' : 'move', id: pick(), by: rand() < 0.5 ? -1 : 1 };
      d = maps.edit('mindmap', d, op).data;
    }
    return d;
  }
  let loops = 0;
  const kidsIn = (d, p) => { const x = p == null ? null : find(d, p); return x ? (x.children || []).map(c => c.id) : []; };
  for (let i = 0; i < 2000; i++) {
    const b = randomMap(rand, 2 + Math.floor(rand() * 40));
    let m = mutate(b, Math.floor(rand() * 6)), t = mutate(b, Math.floor(rand() * 6));
    // One case in five: from the base, mine moves A under B while theirs moves B under A (a loop if both were taken).
    let loop = null;
    if (i % 5 === 0) {
      const all = ids(b).slice(1), a = all[Math.floor(rand() * all.length)], c = all[Math.floor(rand() * all.length)];
      const ma = a && c && a !== c && maps.edit('mindmap', b, { op: 'move', id: a, parent: c }), tc = ma && maps.edit('mindmap', b, { op: 'move', id: c, parent: a });
      if (ma && ma.summary && tc.summary) { m = ma.data; t = tc.data; loop = [a, c]; }
    }
    const prefer = rand() < 0.8 ? 'mine' : 'theirs';
    const r1 = maps.merge('mindmap', b, m, t, { prefer }), r2 = maps.merge('mindmap', b, m, t, { prefer });
    n++;
    if (J(r1) !== J(r2)) bad('deterministic', [b, m, t]);
    const again = N(r1.data);
    if (J(again.data) !== J(r1.data) || again.warnings.length) bad('the result is a valid normalized map', [b, m, t, r1.data, again.warnings]);
    const all = ids(r1.data);
    if (new Set(all).size !== all.length || all.length > 200) bad('unique ids, within the caps', r1.data);
    if (J(maps.merge('mindmap', b, b, t).data) !== J(t)) bad('merge(b, b, t) = t', [b, t, maps.merge('mindmap', b, b, t).data]);
    if (J(maps.merge('mindmap', b, m, b).data) !== J(m)) bad('merge(b, m, b) = m', [b, m, maps.merge('mindmap', b, m, b).data]);
    const B = flat(b), Mi = flat(m), T = flat(t), Rr = flat(r1.data);
    for (const [id, x] of Mi) if (!B.has(id) && !Rr.has(id)) bad('nothing mine added is lost', [id, b, m, t, r1.data]);
    for (const [id, x] of T) if (!B.has(id) && !Rr.has(id)) bad('nothing theirs added is lost', [id, b, m, t, r1.data]);
    for (const [id, x] of T) if (B.has(id) && Mi.has(id) && !Rr.has(id)) bad('theirs’ ideas mine didn’t delete are kept', [id, b, m, t, r1.data]);
    for (const [id, x] of Mi) if (B.has(id) && T.has(id) && !Rr.has(id)) bad('mine’s ideas theirs didn’t delete are kept', [id, b, m, t, r1.data]);
    // A change made by one side only survives (words, notes, folded, and the parent, unless a loop or a delete moved it).
    for (const [id, bx] of B) {
      const mx = Mi.get(id), tx = T.get(id), rx = Rr.get(id);
      if (!rx) continue;
      for (const f of ['label', 'note', 'folded']) {
        if (mx && tx && mx[f] !== bx[f] && tx[f] === bx[f] && rx[f] !== mx[f]) bad('mine’s change to ' + f + ' survives', [id, f, b, m, t, r1.data]);
        if (mx && tx && tx[f] !== bx[f] && mx[f] === bx[f] && rx[f] !== tx[f]) bad('theirs’ change to ' + f + ' survives', [id, f, b, m, t, r1.data]);
      }
      if (mx && tx && mx.cards !== bx.cards && tx.cards === bx.cards && rx.cards !== mx.cards) bad('mine’s cards survive', [id, b, m, t, r1.data]);
      if (mx && tx && tx.cards !== bx.cards && mx.cards === bx.cards && rx.cards !== tx.cards) bad('theirs’ cards survive', [id, b, m, t, r1.data]);
      if (mx && tx && tx.parent === bx.parent && mx.parent !== bx.parent && Rr.has(mx.parent) && rx.parent !== mx.parent && !r1.clashes.some(c => c.id === id)) bad('mine’s move survives', [id, b, m, t, r1.data]);
      if (mx && tx && mx.parent === bx.parent && tx.parent !== bx.parent && Rr.has(tx.parent) && rx.parent !== tx.parent && !r1.clashes.some(c => c.id === id)) bad('theirs’ move survives', [id, b, m, t, r1.data]);
    }
    // Sibling order: the ideas all four versions have under a parent keep the order of the one side that changed it.
    for (const p of B.keys()) {
      if (!Rr.has(p) || !Mi.has(p) || !T.has(p)) continue;
      const lists = [b, m, t, r1.data].map(d => kidsIn(d, p));
      const common = lists[0].filter(id => lists.every(l => l.includes(id)));
      const [bo, mo, to, ro] = lists.map(l => J(l.filter(id => common.includes(id))));
      if (mo !== bo && to === bo && ro !== mo) bad('a reorder by one side only survives', [p, b, m, t, r1.data]);
      if (to !== bo && mo === bo && ro !== to) bad('a reorder by one side only survives', [p, b, m, t, r1.data]);
    }
    // Whatever goes that a side added, or that all three versions had, is a 'cut' clash.
    for (const id of new Set([...Mi.keys(), ...T.keys()])) {
      if (Rr.has(id) || (B.has(id) && !(Mi.has(id) && T.has(id)))) continue;
      if (!r1.clashes.some(c => c.id === id && c.what === 'cut')) bad('a cut is said', [id, b, m, t, r1]);
    }
    if (loop && (!r1.clashes.some(c => c.what === 'move' && loop.includes(c.id)) || parentOf(r1.data, loop[0]) === undefined || parentOf(r1.data, loop[1]) === undefined)) bad('two moves that make a loop: still a tree, a move clash', [loop, b, m, t, r1]);
    if (loop) loops++;
  }
  check('merge fuzz: the loop cases ran (' + loops + ')', loops > 150, loops);
  // 300 more near the caps: big maps, wide ideas, many additions on both sides.
  let capCuts = 0;
  for (let i = 0; i < 300; i++) {
    const b = randomMap(rand, 150 + Math.floor(rand() * 50));
    const grow = d => { for (let k = 0; k < 12; k++) { const all = ids(d); d = maps.edit('mindmap', d, { op: 'add', id: 'n' + (idn++), parent: all[Math.floor(rand() * Math.min(all.length, 6))], label: label(rand, 2) }).data; } return mutate(d, 2); };
    const m = grow(b), t = grow(b), prefer = rand() < 0.7 ? 'mine' : 'theirs';
    const r1 = maps.merge('mindmap', b, m, t, { prefer });
    n++;
    const again = N(r1.data);
    if (J(again.data) !== J(r1.data) || again.warnings.length) bad('the result is a valid normalized map', [b, m, t, r1.data, again.warnings]);
    const all = ids(r1.data);
    if (new Set(all).size !== all.length || all.length > 200) bad('unique ids, within the caps', r1.data);
    const B = flat(b), Mi = flat(m), T = flat(t), Rr = flat(r1.data);
    for (const id of new Set([...Mi.keys(), ...T.keys()])) {
      if (Rr.has(id) || (B.has(id) && !(Mi.has(id) && T.has(id)))) continue;
      if (!r1.clashes.some(c => c.id === id && c.what === 'cut')) bad('a cut is said', [id, b, m, t, r1]);
      if (B.has(id)) bad('theirs’ ideas mine didn’t delete are kept', [id, b, m, t, r1.data]);
    }
    capCuts += r1.clashes.filter(c => c.what === 'cut').length;
  }
  check('merge fuzz near the caps: cuts happened (' + capCuts + ')', capCuts > 50, capCuts);
  const LIST = ['deterministic', 'the result is a valid normalized map', 'unique ids, within the caps', 'merge(b, b, t) = t', 'merge(b, m, b) = m', 'nothing mine added is lost', 'nothing theirs added is lost', 'theirs’ ideas mine didn’t delete are kept', 'mine’s ideas theirs didn’t delete are kept',
    'mine’s change to label survives', 'mine’s change to note survives', 'mine’s change to folded survives', 'theirs’ change to label survives', 'theirs’ change to note survives', 'theirs’ change to folded survives', 'mine’s cards survive', 'theirs’ cards survive',
    'mine’s move survives', 'theirs’ move survives', 'a reorder by one side only survives', 'a cut is said', 'two moves that make a loop: still a tree, a move clash'];
  for (const k of LIST) check('merge fuzz (' + n + ' cases): ' + k, !fails[k], fails[k]);
  for (const k of Object.keys(fails)) if (!LIST.includes(k)) check('merge fuzz: ' + k, false, fails[k]);
}

// ---------- study helpers (§6.1) ----------
{
  check('ideaTone: missed last time is weak, whatever the cards', maps.ideaTone(['solid'], [3, 1, 0, 1]) === 'weak' && maps.ideaTone([], { knew: 1, missed: 1, last: 0 }) === 'weak');
  check('ideaTone: otherwise the worst card', maps.ideaTone(['solid', 'getting', 'new'], [1, 0, 1, 1]) === 'getting' && maps.ideaTone(['solid', 'weak'], null) === 'weak');
  check('ideaTone: no studied cards, knew it last time: solid', maps.ideaTone([], [1, 0, 1, 1]) === 'solid' && maps.ideaTone(['new'], [1, 0, 1, 1]) === 'solid');
  check('ideaTone: otherwise not studied', maps.ideaTone([], null) === 'new' && maps.ideaTone(['new'], undefined) === 'new');
  const cards = [{ id: 'c1', front: 'Where does the Krebs cycle happen?', back: 'The mitochondrial matrix' }, { id: 'cm1', front: 'Which organelle makes most of the ATP?', back: 'The mitochondrion' },
    { id: 'cm2', front: 'Where does electron transport happen?', back: 'The inner mitochondrial membrane' }, { id: 'cm3', front: 'What does the nucleolus make?', back: 'Ribosomes' }];
  check('matchCards: the card sharing the words first', maps.matchCards('Krebs cycle in the matrix', cards)[0] === 'c1', maps.matchCards('Krebs cycle in the matrix', cards));
  check('matchCards: word starts count (mitochondria / mitochondrion)', J(maps.matchCards('Mitochondria', cards)) === '["c1","cm1","cm2"]', maps.matchCards('Mitochondria', cards));
  check('matchCards: front before back, then the deck’s order', J(maps.matchCards('Electron transport on the inner membrane', cards)) === '["cm2"]');
  check('matchCards: nothing shared, nothing', J(maps.matchCards('Golgi', cards)) === '[]' && J(maps.matchCards('', cards)) === '[]');
  check('reviewIds: a branch', J(maps.reviewIds(SPEC_DATA, 'mito')) === '["cm1","c1","cm2"]');
  check('reviewIds: several branches', J(maps.reviewIds(SPEC_DATA, ['er', 'nucleus'])) === '["cm3","cm5"]');
  check('reviewIds: the whole map', J(maps.reviewIds(SPEC_DATA)) === '["cm3","cm1","c1","cm2","cm5"]');
  check('testOrder: every idea but the topic, outline order', J(maps.testOrder(SPEC_DATA)) === J(['nucleus', 'dna', 'nucleolus', 'mito', 'krebs', 'etc', 'er', 'rough-er', 'smooth-er']));
  check('testOrder: the hidden ones only', J(maps.testOrder(SPEC_DATA, null, ['etc', 'dna', 'cell'])) === '["dna","etc"]');
  check('testOrder: only what the layout shows', J(maps.testOrder(SPEC_DATA, maps.layoutMind(SPEC_DATA))) === J(['nucleus', 'dna', 'nucleolus', 'mito', 'krebs', 'etc', 'er']));
  // The order on the map matches the outline on both sides: right side top to bottom, then left side top to bottom.
  const L = maps.layoutMind(SPEC_DATA, { side: 'both', folds: { er: false } }), mains = L.nodes.filter(n => n.level === 1);
  check('testOrder: one order for the map and the outline', J(mains.filter(n => n.side > 0).map(n => n.id).concat(mains.filter(n => n.side < 0).map(n => n.id))) === J(['nucleus', 'mito', 'er']) && mains.filter(n => n.side < 0).every((n, i, l) => !i || n.y > l[i - 1].y));
}

// ---------- sched.toneOf (§13 Q2) ----------
{
  const DAY = 86400000, now = Date.UTC(2026, 9, 11, 12);
  // A card last reviewed long enough ago that its recall now is r (FSRS: r = (1 + FACTOR t / s)^-0.5).
  const card = (state, r, lapses, s = 10) => ({ srs: { state, s, d: 5, reps: 5, lapses: lapses || 0, last: r == null ? now : now - (s * (1 / (r * r) - 1) / FACTOR) * DAY, due: now } });
  const rows = [
    ['never reviewed', { srs: { state: 'new', s: 0, lapses: 0, reps: 0 } }, 'new'],
    ['no memory at all', {}, 'new'],
    ['relearning', card('relearning', 0.99), 'weak'],
    ['recall now 65%', card('review', 0.65), 'weak'],
    ['recall 69.9%', card('review', 0.699), 'weak'],
    ['recall 70.1%', card('review', 0.701), 'getting'],
    ['forgotten twice, recall 80%', card('review', 0.8, 2), 'weak'],
    ['forgotten twice, recall 86%', card('review', 0.86, 2), 'getting'],
    ['forgotten once, recall 80%', card('review', 0.8, 1), 'getting'],
    ['forgotten once ever, recall 95% (no longer weak forever)', card('review', 0.95, 1), 'solid'],
    ['still learning, recall 99%', card('learning', 0.99), 'getting'],
    ['recall 88%', card('review', 0.88), 'getting'],
    ['recall 90.5%', card('review', 0.905), 'solid'],
    ['just reviewed', card('review', null), 'solid'],
    ['forgotten 5 times, recall 92%', card('review', 0.92, 5), 'solid']
  ];
  for (const [what, c, want] of rows) check('toneOf: ' + what + ' is ' + want, toneOf(c, now) === want, toneOf(c, now));
}

// ---------- JavaScriptCore (the iPhone): the same answers byte for byte, and the layout budget without a JIT (§4.6, §11) ----------
// Runs the system's jsc (macOS) on maps.js sliced the way MapEngine slices it, with the JIT off as on the phone; skipped where
// there is no jsc. JSC=/path/to/jsc picks another one.
{
  const JSC = process.env.JSC || '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc';
  if (!existsSync(JSC)) console.log('  (no JavaScriptCore here: parity and its budget skipped)');
  else {
    const src = readFileSync(new URL('../web/maps.js', import.meta.url), 'utf8');
    const slice = src.slice(src.indexOf('function makeMaps'), src.lastIndexOf('export default')).trim();
    const C = { text: 'var(--text)', muted: 'var(--muted)', line: 'var(--line)', bg: 'var(--bg)', surf: 'var(--surf)', surf2: 'var(--surf2)', inv: 'var(--inv)', invText: 'var(--inv-text)', again: 'var(--again)', againTint: 'var(--again-tint)', hardTint: 'var(--hard-tint)', goodTint: 'var(--good-tint)' };
    const rand = rng(4242), E = (d, op) => maps.edit('mindmap', d, op).data;
    const pick = d => { const l = ids(d); return l[Math.floor(rand() * l.length)]; };
    const change = d => { for (let k = 0; k < 4; k++) { const x = rand(); d = E(d, x < 0.4 ? { op: 'add', id: 'n' + (idn++), parent: pick(d), label: label(rand, 3) } : x < 0.6 ? { op: 'set', id: pick(d), label: label(rand, 2) } : x < 0.8 ? { op: 'move', id: pick(d), parent: pick(d), index: 0 } : { op: 'remove', id: pick(d) }); } return d; };
    const cjk = N({ root: { label: '細胞 🧬', children: Array.from({ length: 12 }, (_, i) => ({ label: 'ミトコンドリア 한글 ' + i + ' 👩‍🔬🇫🇷', children: Array.from({ length: 6 }, (_, j) => 'ﬁ ǅ İstanbul straße ' + '😀'.repeat(j) + ' é') })) } }).data;
    const fixtures = [SPEC_DATA, randomMap(rng(77), 400, { long: true }), cjk];
    for (let i = 0; i < 60; i++) fixtures.push(randomMap(rand, 2 + Math.floor(rand() * 200), { long: rand() < 0.5 }));
    const calls = [];
    for (const d of fixtures) {
      const folds = ids(d).filter(() => rand() < 0.1).map(id => [id, rand() < 0.8]), tones = ids(d).filter(() => rand() < 0.3).map(id => [id, ['new', 'weak', 'getting', 'solid'][Math.floor(rand() * 4)]]);
      const text = maps.textOf('mindmap', d), m = change(d), t = change(d);
      calls.push(['normalize', ['mindmap', d, d, { ai: true }]], ['normalize', ['mindmap', text.replace(/ \{#[^}]*\}/g, ''), d, { ai: true, title: 'T' }]], ['textOf', ['mindmap', d]], ['mindmapFromText', [text]],
        ['layoutMind', [d, { side: 'both', folds, scale: 1 }]], ['layoutMind', [d, { side: 'right', folds, scale: 1.3 }]], ['previewOf', ['mindmap', d, { w: 640, h: 150, tones }]], ['previewOf', ['mindmap', d, { w: 340, h: 120, tones }]],
        ['svgOf', ['mindmap', maps.layoutMind(d, { side: 'both' }), C, { data: d, tones, title: 'T' }]], ['merge', ['mindmap', d, m, t, { prefer: rand() < 0.5 ? 'mine' : 'theirs' }]], ['diff', ['mindmap', d, m]],
        ['edit', ['mindmap', d, { op: 'indent', id: pick(d) }]], ['reviewIds', [d, pick(d)]], ['testOrder', [d, maps.layoutMind(d), null]], ['plain', [label(rand, 9) + ' [x](y) **b** ==h== > 1', 30]], ['wrap', [label(rand, 12), 18 + Math.floor(rand() * 8)]]);
    }
    calls.push(['summaryOf', [maps.diff('mindmap', fixtures[0], change(fixtures[0])), { who: 'Claude' }]], ['normalize', ['diagram', {}]], ['normalize', ['mindmap', { blocks: [] }]], ['ideaTone', [['constructor', 'weak'], null]], ['emptyOf', ['__proto__']]);
    const answer = (f, a) => { try { return JSON.stringify(maps[f](...a)); } catch (e) { return 'THROW ' + e.code + ' ' + e.message; } };
    const want = calls.map(([f, a]) => answer(f, a));
    // The budget's maps (§4.6): 200 ideas wide (20 main ideas of 9), bushy and 6 deep, and in East Asian letters and emoji.
    const wide = N({ root: { label: 'Wide', children: Array.from({ length: 20 }, (_, i) => ({ label: 'Main idea number ' + i + ' with long words in it', children: Array.from({ length: 9 }, (_, j) => 'Detail ' + j + ' of main idea ' + i + ', also quite a long label to wrap') })) } }).data;
    const bush = (() => { let k = 0; const mk = l => ({ label: 'Idea ' + (k++) + ' at level ' + l, children: l < 6 ? Array.from({ length: l ? 2 : 3 }, () => mk(l + 1)) : [] }); return N({ root: mk(0) }).data; })();
    const shapes = { wide, bushy: bush, cjk: N({ root: { label: '細胞', children: Array.from({ length: 20 }, (_, i) => ({ label: '細胞は生命の基本単位 ' + i + ' 🧬', children: Array.from({ length: 9 }, () => 'すべての生物は細胞からできている 😀👩‍🔬') })) } }).data };
    const dir = mkdtempSync(join(tmpdir(), 'maps-jsc-'));
    try {
      writeFileSync(join(dir, 'maps.js'), 'var __maps = (' + slice + ')();\n');
      writeFileSync(join(dir, 'calls.json'), JSON.stringify(calls));
      writeFileSync(join(dir, 'want.json'), JSON.stringify(want));
      writeFileSync(join(dir, 'shapes.json'), JSON.stringify(shapes));
      writeFileSync(join(dir, 'run.js'), [
        "load('maps.js');",
        "var calls = JSON.parse(readFile('calls.json')), want = JSON.parse(readFile('want.json')), differ = [];",
        "for (var i = 0; i < calls.length; i++) { var got; try { got = JSON.stringify(__maps[calls[i][0]].apply(__maps, calls[i][1])); } catch (e) { got = 'THROW ' + e.code + ' ' + e.message; } if (got !== want[i]) differ.push(i); }",
        "print('PARITY ' + JSON.stringify({ calls: calls.length, differ: differ.slice(0, 5) }));",
        "var S = JSON.parse(readFile('shapes.json')), out = {};",
        "for (var k in S) { var ts = []; for (var j = 0; j < 25; j++) { var t0 = preciseTime(); __maps.layoutMind(S[k], j % 2 ? { side: 'right', scale: 1.3 } : { side: 'both' }); ts.push((preciseTime() - t0) * 1000); } ts.sort(function (a, b) { return a - b; }); out[k] = [__maps.countOf('mindmap', S[k]), ts[12], ts[24]]; }",
        "print('BUDGET ' + JSON.stringify(out));"].join('\n'));
      const r = spawnSync(JSC, ['--useJIT=false', '--useRegExpJIT=false', 'run.js'], { cwd: dir, encoding: 'utf8', timeout: 300000 });
      const line = k => { const l = (r.stdout || '').split('\n').find(x => x.startsWith(k + ' ')); return l ? JSON.parse(l.slice(k.length + 1)) : null; };
      const par = line('PARITY'), bud = line('BUDGET');
      check('JavaScriptCore (no JIT) gives node’s answers byte for byte: ' + calls.length + ' calls on ' + fixtures.length + ' maps', par && par.calls === calls.length && !par.differ.length, par ? par.differ.map(i => [calls[i][0], want[i].slice(0, 200)]) : (r.stderr || r.error || '').toString().slice(0, 400));
      if (bud) console.log('  (JavaScriptCore without a JIT, layout of 200 ideas, median / slowest ms: ' + Object.keys(bud).map(k => k + ' ' + bud[k][1].toFixed(1) + ' / ' + bud[k][2].toFixed(1)).join(', ') + ')');
      check('JavaScriptCore without a JIT lays out 200 ideas within the 25 ms budget (median; a phone runs slower than this Mac, so DebugChecks.swift still checks it on a device)', bud && Object.keys(bud).every(k => bud[k][0] >= 180 && bud[k][1] <= 25), bud);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
}

console.log('maps: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
