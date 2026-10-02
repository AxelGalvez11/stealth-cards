// Makes ios/tests/fixtures/guide-cases.json from the web's own test of web/guide.js (tests/guide.mjs): the 341 cases of its table (a name and the
// Markdown) and every call that test makes on the engine (parse, render, plain, headings, and the toolbar's helpers, with their arguments), which are
// the inputs ios/tests/guide-check.sh feeds to node and to the engine in JavaScriptCore. Run it again when that test gains cases:
//   node ios/tests/js/guide-record.mjs <path to tests/guide.mjs> [out.json]
// (It runs that test with a recording wrapper in place of the engine, so nothing in it changes. Calls with an argument that is not plain data (a
// function, NaN), or a text longer than 6,000 characters (the speed tests), are left out.)
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const testFile = process.argv[2], out = process.argv[3] || fileURLToPath(new URL('../fixtures/guide-cases.json', import.meta.url));
if (!testFile) { console.error('usage: node guide-record.mjs <tests/guide.mjs> [out.json]'); process.exit(2); }
const realGuide = fileURLToPath(new URL('../../../web/guide.js', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'guide-rec-'));
const wrapper = join(tmp, 'rec.mjs'), dump = join(tmp, 'calls.json');
writeFileSync(wrapper, `
import real from ${JSON.stringify(pathToFileURL(realGuide).href)};
import { writeFileSync } from 'node:fs';
const FNS = ['parse', 'render', 'plain', 'headings', 'bold', 'italic', 'strike', 'code', 'heading', 'bullets', 'numbers', 'tasks', 'quote', 'link', 'codeBlock', 'table', 'rule', 'image', 'continueList', 'indent'];
const calls = [], seen = new Set();
const tooBig = a => JSON.stringify(a).length > 6000;
const rec = new Proxy(real, { get(t, k) {
  const v = t[k];
  if (typeof k === 'string' && FNS.includes(k) && typeof v === 'function') return (...args) => {
    try { const j = JSON.stringify(args); if (j !== undefined && JSON.stringify(JSON.parse(j)) === j && !args.some(x => typeof x === 'function' || typeof x === 'number' && !Number.isFinite(x)) && !tooBig(args)) { const key = k + '\\t' + j; if (!seen.has(key)) { seen.add(key); calls.push([k, ...args]); } } } catch {}
    return v.apply(t, args);
  };
  return v;
} });
process.on('exit', () => writeFileSync(${JSON.stringify(dump)}, JSON.stringify(calls)));
export default rec;
`);
const r = spawnSync('node', [testFile], { env: { ...process.env, GUIDE_JS: wrapper }, encoding: 'utf8', maxBuffer: 1 << 28 });
const lines = r.stdout.trim().split('\n'), tail = lines.slice(-1)[0];
// (The test's last section reads the engine's own file to check it can be pasted into the boards: with the recording wrapper in its place, those
// few checks, and the crash that follows them, are expected. Anything else failing is a real failure.)
const bad = lines.filter(l => /^  FAIL /.test(l) && !/^  FAIL (boards: |the test run crashed)/.test(l));
if (bad.length) { console.error('the test failed:', bad.slice(0, 5).join('\n')); process.exit(1); }
// the table of cases
const src = readFileSync(testFile, 'utf8'), from = src.indexOf('const CASES = ['), to = src.indexOf("];\ncheck('table has at least 120 cases'");
const cases = (0, eval)(src.slice(from + 'const CASES = '.length, to + 1)).map(c => [c[0], c[1]]);
// (At most 450 calls of each function, the first ones, which are the test's own cases: the later ones are its random texts, which add size, not
// kinds of input. The table's 341 texts go through every function in the check anyway.)
const per = {}, calls = JSON.parse(readFileSync(dump, 'utf8')).filter(c => (per[c[0]] = (per[c[0]] || 0) + 1) <= 450);
writeFileSync(out, JSON.stringify({ about: 'Inputs for ios/tests/guide-check.sh, recorded from ' + testFile.split('/').slice(-1)[0] + ' (' + lines.filter(l => /^  ok /.test(l)).length + ' of its checks passed). cases: [name, markdown]; calls: [function, ...arguments].', cases, calls }));
console.log('wrote', out, cases.length, 'cases,', calls.length, 'calls');
