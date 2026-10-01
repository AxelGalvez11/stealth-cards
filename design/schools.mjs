// Makes web/schools.json, the list of colleges and universities that Profile → Edit and a deck's sharing labels pick from, out of
// the US Department of Education's IPEDS directory (NCES, "Institutional Characteristics: Directory information", public domain):
//   curl -O https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip && unzip HD2024.zip       (about 1 MB; hd2024.csv inside is 4 MB)
//   node design/schools.mjs hd2024.csv
// It keeps the institutions that grant degrees and are open (about 4,050: universities, four-year colleges, community colleges),
// and nothing else: no trade schools, and no high schools (there is no list of high schools: they may be minors, so a high school
// student picks a level only). One row each: [IPEDS id, name, city, state, other names people search by (UCLA, MIT, ...)].
// A name two institutions share (Columbia College, in several states) gets its city and state in brackets, so a name is always one
// place. The file goes to web/schools.json (the web app fetches it, the server checks ids against it) and to
// ios/Lucida/Resources/schools.json (bundled in the iPhone app).
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const from = process.argv[2];
if (!from) { console.error('Usage: node design/schools.mjs <hd2024.csv>   (see the top of this file for where to get it)'); process.exit(1); }
const text = readFileSync(from, 'utf8').replace(/^﻿/, '');
// A small CSV reader: quotes, doubled quotes, and line breaks inside quotes.
function parse(t) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const [head, ...data] = parse(text);
const at = n => { const i = head.indexOf(n); if (i < 0) throw new Error('No column ' + n + ' in ' + from); return i; };
const C = Object.fromEntries(['UNITID', 'INSTNM', 'IALIAS', 'CITY', 'STABBR', 'DEGGRANT', 'CYACTIVE', 'ACT'].map(n => [n, at(n)]));
const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();

// Open (active, new, or restructured), degree-granting.
const kept = data.filter(r => r[C.DEGGRANT] === '1' && r[C.CYACTIVE] === '1' && ['A', 'N', 'R'].includes(r[C.ACT]));
const every = kept.map(r => ({ id: tidy(r[C.UNITID]), name: tidy(r[C.INSTNM]), city: tidy(r[C.CITY]), state: tidy(r[C.STABBR]), alias: tidy(r[C.IALIAS]) })).filter(x => x.id && x.name);
// Two campuses with one name in one city (four pairs of small colleges) count as one: the lower id stays.
const place = new Set();
const named = every.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })).filter(x => { const k = (x.name + '|' + x.city + '|' + x.state).toLowerCase(); return place.has(k) ? false : (place.add(k), true); });

// The other names: split at "|" or a run of two spaces, drop what's empty, the name itself, and repeats; at most three, 60 letters each.
const others = x => {
  const seen = new Set([x.name.toLowerCase()]), out = [];
  for (const part of String(x.alias).split(/\||\s{2,}/)) {
    const a = tidy(part);
    if (!a || a === '-2' || a.length > 60 || seen.has(a.toLowerCase())) continue;
    seen.add(a.toLowerCase()); out.push(a);
  }
  return out.slice(0, 3).join('|');
};
// Two institutions with one name: say where each is.
const count = {};
for (const x of named) count[x.name.toLowerCase()] = (count[x.name.toLowerCase()] || 0) + 1;
const rows = named.map(x => [x.id, count[x.name.toLowerCase()] > 1 ? x.name + ' (' + x.city + ', ' + x.state + ')' : x.name, x.city, x.state, others(x)])
  .sort((a, b) => a[1].localeCompare(b[1], 'en', { sensitivity: 'base' }) || a[0].localeCompare(b[0]));
const names = new Set(rows.map(r => r[1].toLowerCase()));
if (names.size !== rows.length) throw new Error('Two schools still share a name: ' + (rows.length - names.size));
const ids = new Set(rows.map(r => r[0]));
if (ids.size !== rows.length) throw new Error('Two schools share an id');

const year = (/HD(\d{4})/i.exec(from) || [])[1] || '';
const out = '{"source":"IPEDS directory ' + year + ' (US Department of Education, NCES; public domain)","count":' + rows.length + ',"rows":[\n'
  + rows.map(r => JSON.stringify(r[4] ? r : r.slice(0, 4))).join(',\n') + '\n]}\n';
const web = new URL('../web/schools.json', import.meta.url), ios = new URL('../ios/Lucida/Resources/schools.json', import.meta.url);
writeFileSync(web, out);
copyFileSync(web, ios);
console.log(rows.length + ' schools (' + kept.length + ' kept of ' + data.length + '), ' + out.length + ' bytes, with ' + rows.filter(r => r[4]).length + ' other names; ' + Object.values(count).filter(n => n > 1).length + ' shared names made unique');
