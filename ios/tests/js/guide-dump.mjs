// What web/guide.js answers (in node) to every call ios/tests/guide-check.sh makes, so the iPhone's engine (the same file, in JavaScriptCore) can be
// compared with it. Writes three files:
//   calls.txt     one call a line: the function, a tab, its arguments as JSON text (an array)
//   expected.txt  one line for each of those: the answer as JSON text (or "__throws")
//   sigs.txt      one line for each of the table's 341 texts: its tree flattened to one line (to compare with the Swift tree the app draws)
// The calls: the table's 341 texts (and a few with toggles) through parse, render, plain and headings; each of them through every toolbar button with three
// selections (and Enter and Tab at a few places); each read into the Notes page's blocks and written back as Markdown (blocks, markdown); a few typed link
// addresses (href); and every call the web's own test of the engine makes (ios/tests/fixtures/guide-cases.json, made by guide-record.mjs).
// blocks.txt: for each text, its blocks as JSON, and what they write back as (the Swift side decodes them, encodes them again, and writes them).
//   node ios/tests/js/guide-dump.mjs <out folder>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const out = process.argv[2];
if (!out) { console.error('usage: node guide-dump.mjs <out folder>'); process.exit(2); }
mkdirSync(out, { recursive: true });
const guide = (await import(pathToFileURL(fileURLToPath(new URL('../../../web/guide.js', import.meta.url))).href)).default;
const fx = JSON.parse(readFileSync(fileURLToPath(new URL('../fixtures/guide-cases.json', import.meta.url)), 'utf8'));

// (texts with toggles, the Notes page's own syntax, after the table's: their trees are flattened too)
const TOGGLES = [':::toggle Key **idea**\nWhy it is so.\n:::', ':::toggle A\na\n:::toggle B\nb\n:::\nmore\n:::\nafter', ':::toggle Open\n- a\n- b', '- item\n  :::toggle T\n  in\n  :::\n- next',
  '> :::toggle Q\n> x\n> :::', ':::toggle A\n```\n:::\n```\n:::', '# Notes\n\n## Section (p. 4 to p. 5)\n\n:::toggle The **mitochondrion** makes ATP\nIt has two membranes.\n:::\n\n:::toggle Protons\n1. one\n2. two\n:::\n',
  ':::toggle <script>alert(1)</script> [x](javascript:alert(1))\nhidden\n:::', '&nbsp;\n\n- [ ]\n- &nbsp;\n\n  inside\n'];
const cases = [...fx.cases.map(([, md]) => md), ...TOGGLES];
const calls = [];
for (const md of cases) {
  calls.push(['parse', md], ['render', md], ['plain', md], ['plain', md, 20], ['headings', md]);
  const n = md.length;
  for (const [a, b] of [[0, 0], [0, n], [n >> 1, n]]) {
    for (const f of ['bold', 'italic', 'strike', 'code', 'bullets', 'numbers', 'tasks', 'quote', 'codeBlock', 'table', 'rule']) calls.push([f, md, a, b]);
    calls.push(['heading', md, a, b, 2], ['heading', md, a, b, 1], ['link', md, a, b, 'https://x.com/a b'], ['image', md, a, b, '/media/x-1.png', ''], ['indent', md, a, b, false], ['indent', md, a, b, true]);
  }
  for (const p of [0, n >> 1, n]) calls.push(['continueList', md, p]);
}
for (const md of cases) { calls.push(['blocks', md]); calls.push(['markdown', guide.blocks(md)]); }
for (const u of ['example.com', 'www.x.org/a b', 'https://x.com/(y)', 'javascript:alert(1)', 'me@x.co', '#g-top', '/media/a.png', '']) calls.push(['href', u]);
for (const c of fx.calls) calls.push(c);

const lines = [], expected = [];
for (const [fn, ...args] of calls) {
  lines.push(fn + '\t' + JSON.stringify(args));
  let r;
  try { r = guide[fn](...args); expected.push(JSON.stringify(r === undefined ? null : r)); } catch (e) { expected.push('"__throws"'); }
}

// A tree flattened to one line (the Swift side writes the same thing from the tree it decoded).
const sigI = n => n.t === 'text' ? 'T(' + n.v + ')' : n.t === 'code' ? 'C(' + n.v + ')' : n.t === 'br' ? 'BR' : n.t === 'img' ? 'IMG(' + [n.src, n.alt, n.title].join('|') + ')'
  : n.t === 'a' ? 'A(' + [n.href, n.title].join('|') + ')[' + n.c.map(sigI).join(',') + ']' : n.t.toUpperCase() + '[' + n.c.map(sigI).join(',') + ']';
const sigBs = bs => bs.map(sigB).join(';');
const sigIt = it => (it.checked === null ? '-' : it.checked ? 'x' : 'o') + '{' + sigBs(it.blocks) + '}';
function sigB(b) {
  switch (b.t) {
    case 'h': return 'H' + b.level + '(' + b.id + ')[' + b.inline.map(sigI).join(',') + ']';
    case 'p': return 'P[' + b.inline.map(sigI).join(',') + ']';
    case 'code': return 'CODE(' + b.lang + ')' + JSON.stringify(b.text);
    case 'quote': return 'Q{' + sigBs(b.blocks) + '}';
    case 'ul': return 'UL(' + b.tight + '){' + b.items.map(sigIt).join('') + '}';
    case 'ol': return 'OL(' + b.start + ',' + b.tight + '){' + b.items.map(sigIt).join('') + '}';
    case 'hr': return 'HR';
    case 'table': return 'TABLE(' + b.align.join(',') + ')<' + b.head.map(c => c.map(sigI).join(',')).join('|') + '>' + b.rows.map(r => '<' + r.map(c => c.map(sigI).join(',')).join('|') + '>').join('');
    case 'toggle': return 'TG[' + b.inline.map(sigI).join(',') + ']{' + sigBs(b.blocks) + '}';
  }
  return '?';
}
const sigs = cases.map(md => JSON.stringify(sigBs(guide.parse(md))));
const blockLines = cases.map(md => { const b = guide.blocks(md); return JSON.stringify(b) + '\t' + JSON.stringify(guide.markdown(b)); });

writeFileSync(out + '/calls.txt', lines.join('\n') + '\n');
writeFileSync(out + '/expected.txt', expected.join('\n') + '\n');
writeFileSync(out + '/sigs.txt', sigs.join('\n') + '\n');
writeFileSync(out + '/blocks.txt', blockLines.join('\n') + '\n');
console.log(calls.length + ' calls, ' + sigs.length + ' trees');
