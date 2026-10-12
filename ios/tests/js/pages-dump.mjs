// What node answers for the iPhone's Pages check (ios/tests/pages-check.sh): Markdown read into a Note's blocks and written back (web/pageblocks.js), with the
// ids kept from a previous note; and web/pagesclient.js's own merge (taken out of the file as it is) on the cases a 409 meets.
//   node ios/tests/js/pages-dump.mjs <out folder>     writes <out>/pages-cases.json
import { readFileSync, writeFileSync } from 'node:fs';
import { markdownToNote, noteToMarkdown } from '../../../web/pageblocks.js';
import maps from '../../../web/maps.js';

const out = process.argv[2];
const src = readFileSync(new URL('../../../web/pagesclient.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('  function merge('), src.indexOf('  async function flush('));
const merge = new Function(body + '\nreturn merge;')();

const NOTE = readFileSync(new URL('../../../ios/Lucida/Data/Pages.swift', import.meta.url), 'utf8').match(/static let md = "((?:[^"\\]|\\.)*)"/)[1];
const md = JSON.parse('"' + NOTE + '"');
const mds = [md, '', 'Just a line.', '# A title\n\nWords with **bold**, *italic*, `code` and [a link](https://lucida.cards).\n\n- one\n- two\n  - three\n\n1. first\n2. second\n\n- [ ] to do\n- [x] done\n\n> A quote\n\n---\n\n```js\nlet a = 1;\n```\n',
  ':::trap A title\nInside the **trap**.\n\n- a list in it\n:::\n\n:::chain\nA\nB\nC\n:::\n\n::card c1\n\n::page p1\n'];
const round = mds.map(m => { const n = markdownToNote(m); return { md: m, note: n, back: noteToMarkdown(n) }; });
// ids kept: the previous note's blocks whose content didn't change keep their ids
const prev = markdownToNote(md), edited = md.replace('three stages', 'three steps') + '\nA new last line.\n';
const kept = { md: edited, previous: prev, note: markdownToNote(edited, prev) };

const b = (id, text) => ({ id, type: 'text', text });
const base = { blocks: [b('a', 'A'), b('b', 'B'), b('c', 'C'), b('d', 'D')] };
const merges = [
  // I changed b, they changed c: both
  { base, mine: { blocks: [b('a', 'A'), b('b', 'B mine'), b('c', 'C'), b('d', 'D')] }, theirs: { blocks: [b('a', 'A'), b('b', 'B'), b('c', 'C theirs'), b('d', 'D')] } },
  // both changed b: mine wins
  { base, mine: { blocks: [b('a', 'A'), b('b', 'B mine'), b('c', 'C'), b('d', 'D')] }, theirs: { blocks: [b('a', 'A'), b('b', 'B theirs'), b('c', 'C'), b('d', 'D')] } },
  // I took out c (they left it): gone; they took out d: gone; they added e at the end
  { base, mine: { blocks: [b('a', 'A'), b('b', 'B'), b('d', 'D')] }, theirs: { blocks: [b('a', 'A'), b('b', 'B'), b('c', 'C'), b('e', 'E')] } },
  // I took out c but they changed it: theirs stays
  { base, mine: { blocks: [b('a', 'A'), b('b', 'B'), b('d', 'D')] }, theirs: { blocks: [b('a', 'A'), b('b', 'B'), b('c', 'C theirs'), b('d', 'D')] } },
  // I added x after b and y first; they moved d to the top
  { base, mine: { blocks: [b('y', 'Y'), b('a', 'A'), b('b', 'B'), b('x', 'X'), b('c', 'C'), b('d', 'D')] }, theirs: { blocks: [b('d', 'D'), b('a', 'A'), b('b', 'B'), b('c', 'C')] } },
  // I added x after a block they took out: it goes first
  { base, mine: { blocks: [b('a', 'A'), b('b', 'B'), b('c', 'C'), b('x', 'X'), b('d', 'D')] }, theirs: { blocks: [b('a', 'A'), b('b', 'B'), b('d', 'D')] } },
  // nothing to start from
  { base: { blocks: [] }, mine: { blocks: [b('m', 'M')] }, theirs: { blocks: [b('t', 'T')] } }
].map(c => ({ ...c, out: merge(c.base, c.mine, c.theirs) }));
// A Mind map's 409 merge goes by its kind (PageMerge.of('mindmap') runs web/maps.js merge in JavaScriptCore): the same answer as node's.
const mm = { root: { id: 'cell', label: 'The cell', children: [{ id: 'mito', label: 'Mitochondria', children: [{ id: 'krebs', label: 'Krebs cycle' }] }, { id: 'nuc', label: 'Nucleus' }] } };
const ed = (d, op) => maps.edit('mindmap', d, op).data;
const mapMerges = [
  [ed(mm, { op: 'set', id: 'krebs', label: 'Krebs cycle in the matrix' }), ed(mm, { op: 'add', id: 'etc', parent: 'mito', label: 'Electron transport' })],
  [ed(mm, { op: 'set', id: 'nuc', label: 'Mine' }), ed(mm, { op: 'set', id: 'nuc', label: 'Theirs' })],
  [ed(mm, { op: 'remove', id: 'mito' }), ed(mm, { op: 'set', id: 'krebs', label: 'Changed there' })],
  [ed(mm, { op: 'move', id: 'krebs', parent: 'nuc' }), ed(mm, { op: 'link', id: 'krebs', cardId: 'c1' })]
].map(([mine, theirs]) => ({ base: mm, mine, theirs, out: maps.merge('mindmap', mm, mine, theirs, { prefer: 'mine' }).data }));
// A 409 merged while more was typed: web/pagesclient.js itself (a pretend server) puts what was typed meanwhile on top of the merged page
// (PageMerge.rebase does the same on the iPhone), so the save after it keeps the other writer's change.
globalThis.addEventListener = globalThis.addEventListener || (() => {});
const { createPages } = await import('../../../web/pagesclient.js');
await new Promise(r => setTimeout(r, 50));   // (its maps.js import settles)
async function rebaseCase(kind, base, sent, theirs, waiting) {
  let page = { id: 'pg1', kind, title: 'T', version: 1, by: 'you', data: base }, saves = [], client;
  globalThis.fetch = async (url, o) => {
    const ok = j => ({ ok: true, status: 200, json: async () => j });
    if (!o || !o.method) return ok(page);
    const b = JSON.parse(o.body); saves.push(b);
    if (saves.length === 1) { page = { ...page, version: 2, by: 'Claude', ai: true, data: theirs }; return { ok: false, status: 409, json: async () => ({ error: 'Changed', code: 'conflict', current: page }) }; }
    if (saves.length === 2) client.edit('pg1', { data: waiting });   // typed while the merged save is out
    page = { ...page, version: page.version + 1, by: 'you', ai: false, data: b.data }; return ok(page);
  };
  client = createPages({ changed() {}, say() {} });
  client.page('pg1'); for (let i = 0; i < 100 && !client.page('pg1'); i++) await new Promise(r => setTimeout(r, 5));
  client.edit('pg1', { data: sent });
  await client.flush('pg1');
  for (let i = 0; i < 200 && saves.length < 3; i++) await new Promise(r => setTimeout(r, 5));
  return { kind, sent, waiting, merged: saves[1] && saves[1].data, out: saves[2] && saves[2].data };
}
const nb = { blocks: [b('a', 'A'), b('b', 'B')] };
const rebases = [
  await rebaseCase('note', nb, { blocks: [b('a', 'A'), b('b', 'B mine')] }, { blocks: [b('a', 'A by Claude'), b('b', 'B')] }, { blocks: [b('a', 'A'), b('b', 'B mine, more')] }),
  await rebaseCase('mindmap', mm, ed(mm, { op: 'set', id: 'nuc', label: 'Nucleus, mine' }), ed(mm, { op: 'add', id: 'etc', parent: 'mito', label: 'Electron transport' }), ed(mm, { op: 'set', id: 'nuc', label: 'Nucleus, mine and more' }))
];
for (const r of rebases) {
  const s = JSON.stringify(r.out || null);
  if (!(r.out && (r.kind === 'note' ? s.includes('A by Claude') && s.includes('B mine, more') : s.includes('"etc"') && s.includes('Nucleus, mine and more')))) { console.log('pagesclient.js lost the other writer’s change after a merge (' + r.kind + '): ' + s); process.exit(1); }
}
writeFileSync(out + '/pages-cases.json', JSON.stringify({ round, kept, merges, mapMerges, rebases }));
console.log('pages cases:', round.length, 'round trips,', merges.length, 'merges');
