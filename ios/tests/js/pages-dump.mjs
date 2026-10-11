// What node answers for the iPhone's Pages check (ios/tests/pages-check.sh): Markdown read into a Note's blocks and written back (web/pageblocks.js), with the
// ids kept from a previous note; and web/pagesclient.js's own merge (taken out of the file as it is) on the cases a 409 meets.
//   node ios/tests/js/pages-dump.mjs <out folder>     writes <out>/pages-cases.json
import { readFileSync, writeFileSync } from 'node:fs';
import { markdownToNote, noteToMarkdown } from '../../../web/pageblocks.js';

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
writeFileSync(out + '/pages-cases.json', JSON.stringify({ round, kept, merges }));
console.log('pages cases:', round.length, 'round trips,', merges.length, 'merges');
