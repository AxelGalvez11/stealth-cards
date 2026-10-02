// What web/guide.js answers (in node) to every call ios/tests/guide-check.sh makes, so the iPhone's engine (the same file, in JavaScriptCore) can be
// compared with it. Writes three files:
//   calls.txt     one call a line: the function, a tab, its arguments as JSON text (an array)
//   expected.txt  one line for each of those: the answer as JSON text (or "__throws")
//   sigs.txt      one line for each of the table's 341 texts: its tree flattened to one line (to compare with the Swift tree the app draws)
// The calls: the table's 341 texts through parse, render, plain and headings; each of them through every toolbar button with three selections (and
// Enter and Tab at a few places); and every call the web's own test of the engine makes (ios/tests/fixtures/guide-cases.json, made by guide-record.mjs).
//   node ios/tests/js/guide-dump.mjs <out folder>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const out = process.argv[2];
if (!out) { console.error('usage: node guide-dump.mjs <out folder>'); process.exit(2); }
mkdirSync(out, { recursive: true });
const guide = (await import(pathToFileURL(fileURLToPath(new URL('../../../web/guide.js', import.meta.url))).href)).default;
const fx = JSON.parse(readFileSync(fileURLToPath(new URL('../fixtures/guide-cases.json', import.meta.url)), 'utf8'));

const calls = [];
for (const [, md] of fx.cases) {
  calls.push(['parse', md], ['render', md], ['plain', md], ['plain', md, 20], ['headings', md]);
  const n = md.length;
  for (const [a, b] of [[0, 0], [0, n], [n >> 1, n]]) {
    for (const f of ['bold', 'italic', 'strike', 'code', 'bullets', 'numbers', 'tasks', 'quote', 'codeBlock', 'table', 'rule']) calls.push([f, md, a, b]);
    calls.push(['heading', md, a, b, 2], ['heading', md, a, b, 1], ['link', md, a, b, 'https://x.com/a b'], ['image', md, a, b, '/media/x-1.png', ''], ['indent', md, a, b, false], ['indent', md, a, b, true]);
  }
  for (const p of [0, n >> 1, n]) calls.push(['continueList', md, p]);
}
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
  }
  return '?';
}
const sigs = fx.cases.map(([, md]) => JSON.stringify(sigBs(guide.parse(md))));

writeFileSync(out + '/calls.txt', lines.join('\n') + '\n');
writeFileSync(out + '/expected.txt', expected.join('\n') + '\n');
writeFileSync(out + '/sigs.txt', sigs.join('\n') + '\n');
console.log(calls.length + ' calls, ' + sigs.length + ' trees');
