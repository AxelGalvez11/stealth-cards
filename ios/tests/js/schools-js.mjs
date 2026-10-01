// The school search as the web app does it (web/school.js), for the iPhone app's copy to be checked against.
//   node schools-js.mjs make <queries.json>              makes queries out of the list: names' beginnings, other names, places, odd ones
//   node schools-js.mjs <queries.json> <out.json>        what the web finds for each (the ids of the first thirty, in order)
import { readFileSync, writeFileSync } from 'node:fs';
import { schoolSearch } from '../../../web/school.js';
const rows = JSON.parse(readFileSync(new URL('../../../web/schools.json', import.meta.url), 'utf8')).rows;
if (process.argv[2] === 'make') {
  // A fixed shuffle, so every run asks the same.
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = a => a[Math.floor(rnd() * a.length)], out = ['ucla', 'mit', 'tex aus', 'uc davis', 'stanford', 'university of michigan', 'cambridge ma', 'new york', 'st', 'a', 'the', 'of', 'college', 'u of m', 'cal state', 'harvard university', 'San José', 'é', '&', 'a&m', 'texas a m', '  spaced   out  ', 'zzzz', '', '12', '110644', 'ca', 'saint marys', 'st marys', 'cc', 'D&E', 'david elkins'];
  for (let i = 0; i < 400; i++) {
    const r = pick(rows), name = r[1].split(/[^A-Za-z0-9]+/).filter(Boolean), kind = i % 5;
    out.push(kind === 0 ? r[1].slice(0, 3 + Math.floor(rnd() * 8)) : kind === 1 ? name.slice(0, 2).join(' ') : kind === 2 ? (r[4] || r[2]).split('|')[0] : kind === 3 ? r[2] + ' ' + r[3] : name.map(w => w.slice(0, 1 + Math.floor(rnd() * 4))).join(' '));
  }
  writeFileSync(process.argv[3], JSON.stringify(out));
} else {
  const queries = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  writeFileSync(process.argv[3], JSON.stringify(queries.map(q => schoolSearch(rows, q, 30).map(r => r[0]))));
}
