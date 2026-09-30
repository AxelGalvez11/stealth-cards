// FSRS on the web's side: random cards and options through web/fsrs.js preview. node fsrs-js.mjs inputs.json out.json (or `make inputs.json`)
import { readFileSync, writeFileSync } from 'node:fs';
const WT = process.env.WT || new URL('../../..', import.meta.url).pathname.replace(/\/$/, ''), F = await import(WT + '/web/fsrs.js');
const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'make') {
  let seed = 99; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const pick = x => x[Math.floor(rnd() * x.length)], DAY = 86400000, now = Date.now(), items = [];
  for (let i = 0; i < 4000; i++) {
    const state = pick(['new', 'learning', 'review', 'review', 'review', 'relearning']);
    const s = state === 'new' ? 0 : Math.exp(rnd() * 6 - 1), last = now - Math.floor(rnd() * 300 * DAY * (rnd() < .5 ? .02 : 1));
    const card = { state, s, d: state === 'new' ? 0 : 1 + rnd() * 9, reps: Math.floor(rnd() * 30), lapses: Math.floor(rnd() * 12), last: state === 'new' ? 0 : last, due: state === 'new' ? 0 : last + Math.floor(rnd() * 30 * DAY), step: Math.floor(rnd() * 3) };
    const w = rnd() < .5 ? undefined : F.W.map((x, k) => Math.min(F.BOUNDS[k][1], Math.max(F.BOUNDS[k][0], x * (0.6 + rnd() * .8))));
    const opt = { goal: pick([0.6, 0.7, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.99, 1.2]), maxDays: pick([30, 90, 180, 365, 730, 1825, 3650, 36500]), steps: pick([['1m', '10m'], ['1m'], ['10m', '1h'], ['1m', '10m', '1h', '1d'], []]), relearn: pick([['10m'], [], ['5m', '30m']]), ...(w ? { w } : {}) };
    items.push({ card, now: now + Math.floor(rnd() * 3 * DAY), opt });
  }
  writeFileSync(a, JSON.stringify(items)); console.log('made', items.length);
} else {
  const items = JSON.parse(readFileSync(cmd, 'utf8')), out = [];
  for (const it of items) {
    const pv = F.preview(it.card, it.now, it.opt), row = {};
    for (const g of [1, 2, 3, 4]) { const r = pv[g]; row[g] = { state: r.state, due: r.due, s: r.s, d: r.d, reps: r.reps, lapses: r.lapses, last: r.last, step: r.step, days: r.days ?? null, label: F.waitLabel(r, it.now) }; }
    out.push(row);
  }
  writeFileSync(a, JSON.stringify(out)); console.log('previewed', out.length);
}
