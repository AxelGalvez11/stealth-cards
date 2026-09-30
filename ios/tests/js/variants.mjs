// Many made-up variations of the seeded library (exam dates near and far, goals, piles, FSRS off, paused and waiting cards,
// due dates around now) to check the ports agree on all of them: node variants.mjs state.json outDir count
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const [file, dir, countArg, nowArg] = process.argv.slice(2), N = +(countArg || 12);
const base = JSON.parse(readFileSync(file, 'utf8')), NOW0 = +nowArg;
mkdirSync(dir, { recursive: true });
const DAY = 86400000;
for (let v = 0; v < N; v++) {
  let seed = 1234 + v * 7919; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const S = JSON.parse(JSON.stringify(base));
  const now = NOW0 + Math.floor((rnd() - .5) * 20 * 3600e3);
  const iso = n => { const d = new Date(now + n * DAY); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  S.decks.forEach((d, i) => {
    d.exam = pick([null, iso(0), iso(1), iso(3), iso(12), iso(29), iso(30), iso(31), iso(60), iso(-1), iso(7)]);
    d.goal = pick([70, 85, 90, 93, 95, 97, 72]); d.gapIdx = Math.floor(rnd() * 7); d.perDay = pick([0, 5, 12, 20, 30]);
    d.leechAt = pick([3, 5, 8, 12, 30]); d.leechAct = pick(['tag', 'pause']);
    if (rnd() < .2) d.grading = 'piles';
    else if (rnd() < .2) d.fsrs = false;
    if (rnd() < .15) d.paused = true;
    d.steps = pick([['1m', '10m'], ['1m'], ['10m', '1h'], ['1m', '10m', '1h', '1d']]);
  });
  for (const c of S.cards) {
    if (rnd() < .05) c.paused = true;
    if (rnd() < .03) c.pending = true;
    if (c.srs.state !== 'new' && rnd() < .3) { const shift = (rnd() - .5) * 40 * DAY; c.srs = { ...c.srs, due: c.srs.due + shift }; }
    if (c.srs.state !== 'new' && rnd() < .05) c.srs = { ...c.srs, state: pick(['learning', 'relearning']), step: 0, due: now + (rnd() - .5) * 3600e3 };
    if (rnd() < .05) c.pile = pick(['Know it', 'Almost', 'No clue', null]);
  }
  S.settings.goal = pick([85, 90, 95]);
  writeFileSync(dir + '/v' + v + '.json', JSON.stringify(S));
  writeFileSync(dir + '/v' + v + '.now', String(now));
}
console.log('made', N, 'variants in', dir);
