// Tune to you (Pro): fits FSRS's 19 parameters (fsrs.js) to one person's own reviews, so the gaps match how fast they
// really forget. It replays every card's reviews the way the scheduler does, predicts how likely each review was to be
// remembered, and moves the parameters to make those predictions fit what happened (the log loss). Plain JavaScript,
// no packages: the app runs it in a worker (tune-worker.js), so studying never waits for it, and the checks run it in
// Node. Like FSRS's own optimizer, it first fits a new card's stability from each first grade, then refines everything
// with Adam, within the same limits (fsrs.js BOUNDS) and pulled gently toward the standard parameters when there's
// little to go on.
import { W, BOUNDS, FACTOR, cleanW } from './fsrs.js';

const DAY = 86400000, P = 19;
// Enough to tune: this many graded reviews, of which this many were reviews of cards you'd already learned.
export const TUNE_MIN = 400, TUNE_ITEMS = 100;
// How far each parameter usually sits from the standard one across many people (FSRS's own figures). A bigger spread
// lets a parameter move more freely.
const SPREAD = [6.61, 9.52, 17.69, 27.74, 0.55, 0.28, 0.67, 0.12, 0.4, 0.18, 0.34, 0.27, 0.08, 0.14, 0.57, 0.25, 1.03, 0.27, 0.39];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Every card's graded reviews, in order, from decks FSRS schedules: [{ g: grade, was: its state before, t: days since
// the review before }]. A card whose history doesn't start from new (it was reset, or reviewed while FSRS was off) is
// left out, since its memory can't be replayed.
export function histories(S) {
  const on = new Set(S.decks.filter(d => d.grading !== 'piles').map(d => d.id));
  const byCard = new Map();
  for (const l of S.logs) {
    if (!l.rating || l.kind || !on.has(l.deckId)) continue;
    (byCard.get(l.cardId) || byCard.set(l.cardId, []).get(l.cardId)).push(l);
  }
  const data = [];
  let reviews = 0, items = 0;
  for (const logs of byCard.values()) {
    logs.sort((a, b) => a.at - b.at);
    if (logs[0].was !== 'new' || logs.slice(1).some(l => l.was === 'new' || !['learning', 'review', 'relearning'].includes(l.was))) continue;
    const card = logs.map((l, i) => {
      const last = i ? (l.prev && l.prev.last) || logs[i - 1].at : l.at;
      return { g: Math.min(4, Math.max(1, Math.round(l.rating))), was: l.was, t: Math.max(0, (l.at - last) / DAY) };
    });
    reviews += card.length;
    items += card.filter(r => r.was === 'review' && r.t >= 1).length;
    data.push(card);
  }
  return { data, reviews, items };
}

// The summed log loss of `w` over every review of a learned card (the ones the scheduler predicts), and, given `grad`
// (19 zeros), its gradient, worked out alongside (forward mode: each value carries how it moves with every parameter).
export function loss(data, w, grad) {
  const dS = new Float64Array(P), dD = new Float64Array(P), nS = new Float64Array(P), nD = new Float64Array(P), dR = new Float64Array(P);
  const d04raw = w[4] - Math.exp(3 * w[5]) + 1, d04 = clamp(d04raw, 1, 10), d04in = d04raw > 1 && d04raw < 10, e3 = Math.exp(3 * w[5]);
  let sum = 0, n = 0;
  for (const card of data) {
    let S = 0.1, D = 5;
    dS.fill(0); dD.fill(0);
    for (const r of card) {
      const g = r.g;
      if (r.was === 'new') {
        // A new card: stability from its first grade, difficulty from the grade too.
        S = Math.max(w[g - 1], 0.1); dS.fill(0); if (w[g - 1] > 0.1) dS[g - 1] = 1;
        const e = Math.exp(w[5] * (g - 1)), x = w[4] - e + 1;
        D = clamp(x, 1, 10); dD.fill(0);
        if (x > 1 && x < 10) { dD[4] = 1; dD[5] = -(g - 1) * e; }
        continue;
      }
      if (r.was === 'review' && r.t >= 1) {
        // A review of a learned card: how likely it was to be remembered, then its new stability.
        const base = 1 + FACTOR * r.t / S, R = Math.pow(base, -0.5), dRdS = 0.5 * FACTOR * r.t / (S * S) * Math.pow(base, -1.5);
        for (let k = 0; k < P; k++) dR[k] = dRdS * dS[k];
        const p = clamp(R, 1e-6, 1 - 1e-6), y = g > 1;
        sum -= y ? Math.log(p) : Math.log(1 - p); n++;
        if (grad && p === R) { const dL = y ? -1 / p : 1 / (1 - p); for (let k = 0; k < P; k++) grad[k] += dL * dR[k]; }
        if (g === 1) {
          // Forgotten: stability starts again lower, never above what it was.
          const a = w[11], bD = Math.pow(D, -w[12]), sp = Math.pow(S + 1, w[13]), c = sp - 1, e = Math.exp(w[14] * (1 - R)), F = a * bD * c * e;
          if (F < S) {
            for (let k = 0; k < P; k++) {
              const dbD = bD * (-w[12] * dD[k] / D), dc = sp * (w[13] * dS[k] / (S + 1)), de = e * (-w[14] * dR[k]);
              nS[k] = a * (dbD * c * e + bD * dc * e + bD * c * de);
            }
            nS[11] += bD * c * e; nS[12] += a * bD * (-Math.log(D)) * c * e; nS[13] += a * bD * sp * Math.log(S + 1) * e; nS[14] += a * bD * c * e * (1 - R);
            S = F; dS.set(nS);
          }
        } else {
          // Remembered: stability grows, more when it was harder to remember, less for a stable or difficult card.
          const h = g === 2 ? w[15] : 1, b = g === 4 ? w[16] : 1, E8 = Math.exp(w[8]), A0 = E8 * (11 - D) * Math.pow(S, -w[9]), e10 = Math.exp(w[10] * (1 - R));
          const A = A0 * (e10 - 1), inc = A * h * b, lnS = Math.log(S);
          for (let k = 0; k < P; k++) {
            const dA0 = A0 * (-dD[k] / (11 - D) - w[9] * dS[k] / S), dA = dA0 * (e10 - 1) + A0 * e10 * (-w[10] * dR[k]);
            nS[k] = dS[k] * (1 + inc) + S * dA * h * b;
          }
          nS[8] += S * A * h * b; nS[9] += S * A0 * (-lnS) * (e10 - 1) * h * b; nS[10] += S * A0 * e10 * (1 - R) * h * b;
          if (g === 2) nS[15] += S * A * b;
          if (g === 4) nS[16] += S * A * h;
          S = S * (1 + inc); dS.set(nS);
        }
      } else {
        // A learning step, or a second look the same day: short-term stability.
        const x = g - 3 + w[18], e = Math.exp(w[17] * x);
        for (let k = 0; k < P; k++) nS[k] = dS[k] * e;
        nS[17] += S * e * x; nS[18] += S * e * w[17];
        S = S * e; dS.set(nS);
      }
      // Difficulty after any grade but a card's first: nudged by the grade, drawn back a little toward an easy card's.
      const q = (g - 3) / 9, X = D - w[6] * q * (10 - D), Y = w[7] * d04 + (1 - w[7]) * X;
      for (let k = 0; k < P; k++) nD[k] = (1 - w[7]) * dD[k] * (1 + w[6] * q);
      nD[6] += (1 - w[7]) * (-q * (10 - D)); nD[7] += d04 - X;
      if (d04in) { nD[4] += w[7]; nD[5] += w[7] * -3 * e3; }
      D = clamp(Y, 1, 10);
      if (Y > 1 && Y < 10) dD.set(nD); else dD.fill(0);
    }
  }
  return { sum, n };
}
// The average log loss of `w` (lower fits better), for comparing parameters.
export const logLoss = (data, w) => { const r = loss(data, w); return r.n ? r.sum / r.n : null; };

// A new card's stability after each first grade: the gap at which the reviews after it were remembered at the rate
// they were. Grades with too few cards keep the standard value; the four stay in order (Forgot ≤ Hard ≤ Good ≤ Easy).
function pretrain(data, w) {
  const out = w.slice(0, 4), seen = [[], [], [], []];
  for (const card of data) {
    if (card[0].was !== 'new') continue;
    let m = 1;
    for (const r of card.slice(1)) {
      if (r.was === 'review' && r.t >= 1) { seen[card[0].g - 1].push([r.t, m, r.g > 1 ? 1 : 0]); break; }
      if (r.was !== 'learning') break;
      m *= Math.exp(w[17] * (r.g - 3 + w[18]));
    }
  }
  seen.forEach((list, i) => {
    if (list.length < 20) return;
    // The stability with the lowest log loss, found by narrowing in on it (the loss has one low point).
    const f = ls => { const s = Math.exp(ls); let L = 0; for (const [t, m, y] of list) { const p = clamp(Math.pow(1 + FACTOR * t / (s * m), -0.5), 1e-6, 1 - 1e-6); L -= y ? Math.log(p) : Math.log(1 - p); }
      // A light pull toward the standard value, worth a few cards.
      return L + 2 * Math.pow(ls - Math.log(w[i]), 2); };
    let a = Math.log(BOUNDS[i][0]), b = Math.log(BOUNDS[i][1]);
    const k = (Math.sqrt(5) - 1) / 2;
    for (let it = 0; it < 80; it++) { const c = b - k * (b - a), d = a + k * (b - a); if (f(c) < f(d)) b = d; else a = c; }
    out[i] = clamp(Math.exp((a + b) / 2), BOUNDS[i][0], BOUNDS[i][1]);
  });
  for (let i = 1; i < 4; i++) out[i] = Math.max(out[i], out[i - 1]);
  return out;
}

// Adam from the standard parameters `w0` (a new card's stabilities fitted first), with the step size easing off as it
// goes and a pull toward the standard parameters that matters less the more reviews there are. Gives the best point.
function adam(data, w0, steps, gamma, progress) {
  const w = w0.slice();
  pretrain(data, w0).forEach((s, i) => { w[i] = s; });
  const n = loss(data, w).n;
  if (!n) return w0.slice();
  const m = new Float64Array(P), v = new Float64Array(P), pull = gamma / n;
  let best = w.slice(), bestJ = Infinity, calm = 0;
  for (let it = 1; it <= steps; it++) {
    const grad = new Float64Array(P), r = loss(data, w, grad);
    let J = r.sum / n;
    for (let k = 0; k < P; k++) { const z = (w[k] - w0[k]) / SPREAD[k]; J += pull * z * z; grad[k] = grad[k] / n + 2 * pull * z / SPREAD[k]; }
    if (J < bestJ - 1e-7) { bestJ = J; best = w.slice(); calm = 0; } else if (++calm > 40) break;
    const lr = 0.004 + 0.036 * (1 + Math.cos(Math.PI * it / steps)) / 2;
    for (let k = 0; k < P; k++) {
      m[k] = 0.9 * m[k] + 0.1 * grad[k]; v[k] = 0.999 * v[k] + 0.001 * grad[k] * grad[k];
      const mh = m[k] / (1 - Math.pow(0.9, it)), vh = v[k] / (1 - Math.pow(0.999, it));
      w[k] = clamp(w[k] - lr * mh / (Math.sqrt(vh) + 1e-8), BOUNDS[k][0], BOUNDS[k][1]);
    }
    if (it % 10 === 0) progress(it / steps);
  }
  return cleanW(best);
}

// The fit: { w (the tuned parameters), loss (their log loss), base (the standard ones'), gain (how much better they
// predicted reviews they weren't fitted on), n (reviews of learned cards), reviews, items }. It checks itself first:
// fitted on all but a fifth of the cards at a time, the parameters have to predict the fifth left out better than the
// standard ones do; if they don't, a few hundred reviews were too few to tell, and the standard parameters stay.
// opt: { w: the standard parameters, steps: most Adam steps, gamma: the pull toward them, folds, progress: 0 to 1 }.
export function fit(input, opt = {}) {
  const { data, reviews, items } = Array.isArray(input) ? { data: input, reviews: input.reduce((n, c) => n + c.length, 0), items: 0 } : input;
  const w0 = (cleanW(opt.w) || W).slice(), steps = opt.steps || 300, gamma = opt.gamma ?? 2, K = opt.folds ?? 5, progress = opt.progress || (() => {});
  const all = loss(data, w0), base = all.n ? all.sum / all.n : null;
  if (!all.n) return { w: w0, loss: base, base, gain: 0, n: 0, reviews, items };
  let std = 0, tuned = 0;
  for (let f = 0; f < K; f++) {
    const train = data.filter((_, i) => i % K !== f), test = data.filter((_, i) => i % K === f);
    const w = adam(train, w0, steps, gamma, p => progress((f + p) / (K + 1)));
    std += loss(test, w0).sum; tuned += loss(test, w).sum;
  }
  const gain = (std - tuned) / all.n;
  if (!(gain > 0)) { progress(1); return { w: w0, loss: base, base, gain, n: all.n, reviews, items }; }
  const w = adam(data, w0, steps, gamma, p => progress((K + p) / (K + 1))), after = logLoss(data, w);
  progress(1);
  return { w, loss: after, base, gain, n: all.n, reviews, items };
}
