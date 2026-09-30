// Sets two JSON files side by side (the web's answers and the iPhone ports'): node compare.mjs js.json swift.json [tolerance]
// Numbers may differ by a tiny relative amount; a missing key equals null; keys the page adds afterwards (a card's words, a
// deck's name, links) are left out.
import { readFileSync } from 'node:fs';
const [a, b, tolArg] = process.argv.slice(2), TOL = +(tolArg || 1e-9);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const SKIP = new Set(['front', 'back', 'deck', 'href', 'line', 'seconds', 'progress']);
let same = 0, bad = 0; const diffs = [];
const note = (p, x, y) => { bad++; if (diffs.length < 40) diffs.push(p + ': web ' + JSON.stringify(x) + ' vs iPhone ' + JSON.stringify(y)); };
function walk(x, y, p) {
  if (x == null && y == null) { same++; return; }
  if (typeof x === 'number' && typeof y === 'number') { if (Math.abs(x - y) <= TOL * Math.max(1, Math.abs(x), Math.abs(y))) same++; else note(p, x, y); return; }
  if (Array.isArray(x) && Array.isArray(y)) {
    if (x.length !== y.length) { note(p + '.length', x.length, y.length); }
    for (let i = 0; i < Math.min(x.length, y.length); i++) walk(x[i], y[i], p + '[' + i + ']');
    return;
  }
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (!SKIP.has(k)) walk(x[k], y[k], p + '.' + k);
    return;
  }
  if (x === y) same++; else note(p, x, y);
}
walk(A, B, '');
console.log(same + ' values match, ' + bad + ' differ');
for (const d of diffs) console.log('  ' + d);
process.exit(bad ? 1 : 0);
