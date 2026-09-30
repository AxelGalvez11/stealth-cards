// Tune to you on the web's side: the fit web/tune.js makes from a library's reviews. node tune-js.mjs state.json out.json
import { readFileSync, writeFileSync } from 'node:fs';
const WT = process.env.WT || new URL('../../..', import.meta.url).pathname.replace(/\/$/, ''), [file, out] = process.argv.slice(2);
const { histories, fit } = await import(WT + '/web/tune.js'), { W } = await import(WT + '/web/fsrs.js');
const S = JSON.parse(readFileSync(file, 'utf8'));
const h = histories(S), t0 = Date.now();
const f = fit(h, { w: W });
writeFileSync(out, JSON.stringify({ w: f.w, loss: f.loss, base: f.base, gain: f.gain, n: f.n, reviews: f.reviews, items: f.items, seconds: (Date.now() - t0) / 1000 }));
console.log('tuned in', (Date.now() - t0) / 1000, 's: loss', f.loss, 'base', f.base, 'gain', f.gain, 'n', f.n);
