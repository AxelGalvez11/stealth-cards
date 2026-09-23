// FSRS-5, the open-source spaced repetition scheduler Anki uses, with Anki-style learning steps.
// The server uses it when a card is graded; the app uses it to show each grade's next gap on the buttons.
// Card memory: { state: 'new' | 'learning' | 'review' | 'relearning', due, s (stability, days), d (difficulty 1-10),
// reps, lapses, last (time of the last review), step }. Grades: 1 Forgot, 2 Hard, 3 Good, 4 Easy.

export const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
const DECAY = -0.5, FACTOR = 19 / 81, MIN = 60000, DAY = 86400000;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Chance you still remember a card `days` after reviewing it, given its stability.
export const recall = (days, s) => Math.pow(1 + FACTOR * days / s, DECAY);
const gapDays = (s, goal, maxDays) => clamp(Math.round(s / FACTOR * (Math.pow(goal, 1 / DECAY) - 1)), 1, maxDays);
const s0 = g => Math.max(W[g - 1], 0.1);
const d0 = g => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
const nextD = (d, g) => clamp(W[7] * d0(4) + (1 - W[7]) * (d - W[6] * (g - 3) * (10 - d) / 9), 1, 10);
const recallS = (d, s, r, g) => s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
const forgetS = (d, s, r) => Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
const sameDayS = (s, g) => s * Math.exp(W[17] * (g - 3 + W[18]));

// '1m', '10m', '1h', '1d' → minutes.
export const stepMinutes = x => { const m = String(x).trim().match(/^(\d+(?:\.\d+)?)\s*([mhd])$/); return m ? +m[1] * { m: 1, h: 60, d: 1440 }[m[2]] : 1; };
// Local midnight `n` days after `t` (review cards come due at the start of their day).
export const dayAt = (t, n = 0) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };
export const newCard = () => ({ state: 'new', due: 0, s: 0, d: 0, reps: 0, lapses: 0, last: 0, step: 0 });

// Every grade's result for a card, so the buttons can show "1m", "10m", "4d", "9d".
// opt: { goal: 0.9 (how much to remember), maxDays: 365 (longest gap), steps: ['1m', '10m'], relearn: ['10m'] }
export function preview(card, now, opt = {}) {
  const goal = clamp(opt.goal || 0.9, 0.7, 0.99), maxDays = opt.maxDays || 36500;
  const steps = (opt.steps || ['1m', '10m']).map(stepMinutes), relearn = (opt.relearn || ['10m']).map(stepMinutes);
  const c = card && card.state ? card : newCard();
  const base = { ...c, reps: (c.reps || 0) + 1, last: now };
  const learn = (n, list, i) => ({ ...n, state: c.state === 'review' || c.state === 'relearning' ? 'relearning' : 'learning', step: i, due: now + list[i] * MIN });
  const hardWait = (list, i) => (i === 0 ? (list.length > 1 ? (list[0] + list[1]) / 2 : list[0] * 1.5) : list[i]);
  const graduate = (n, days) => ({ ...n, state: 'review', step: 0, days, due: dayAt(now, days) });
  const out = {};
  if (c.state === 'new' || c.state === 'learning' || c.state === 'relearning') {
    const list = c.state === 'relearning' ? relearn : steps, i = c.state === 'new' ? 0 : Math.min(c.step || 0, Math.max(list.length - 1, 0));
    for (const g of [1, 2, 3, 4]) {
      const n = { ...base, s: c.state === 'new' ? s0(g) : sameDayS(c.s, g), d: c.state === 'new' ? d0(g) : nextD(c.d, g) };
      if (c.state === 'relearning' && g === 1) n.lapses = c.lapses || 0;
      const nextStep = c.state === 'new' ? (g === 3 ? 1 : 0) : i + 1;
      if (!list.length || g === 4 || (g === 3 && nextStep >= list.length)) out[g] = graduate(n, gapDays(n.s, goal, maxDays));
      else if (g === 1) out[g] = learn(n, list, 0);
      else if (g === 2) out[g] = { ...learn(n, list, i), due: now + hardWait(list, i) * MIN };
      else out[g] = learn(n, list, nextStep);
    }
    // Graduating with Easy always waits longer than graduating with Good.
    if (out[3].state === 'review' && out[4].days <= out[3].days) out[4] = graduate(out[4], Math.min(maxDays, out[3].days + 1));
    return out;
  }
  const days = Math.max(0, (now - c.last) / DAY), r = recall(days, c.s), sameDay = days < 1;
  const ns = g => (sameDay ? sameDayS(c.s, g) : recallS(c.d, c.s, r, g));
  let hard = gapDays(ns(2), goal, maxDays), good = gapDays(ns(3), goal, maxDays), easy = gapDays(ns(4), goal, maxDays);
  hard = Math.min(hard, good); good = Math.max(good, hard + 1); easy = Math.max(easy, good + 1);
  const lapse = { ...base, lapses: (c.lapses || 0) + 1, s: sameDay ? sameDayS(c.s, 1) : forgetS(c.d, c.s, r), d: nextD(c.d, 1) };
  out[1] = relearn.length ? learn(lapse, relearn, 0) : graduate(lapse, gapDays(lapse.s, goal, maxDays));
  out[2] = graduate({ ...base, s: ns(2), d: nextD(c.d, 2) }, Math.min(hard, maxDays));
  out[3] = graduate({ ...base, s: ns(3), d: nextD(c.d, 3) }, Math.min(good, maxDays));
  out[4] = graduate({ ...base, s: ns(4), d: nextD(c.d, 4) }, Math.min(easy, maxDays));
  return out;
}
export const grade = (card, g, now, opt) => preview(card, now, opt)[g];

// A wait as a short label: 1m, 10m, 1h, 4d, 3mo, 1.2y.
export function waitLabel(card, now) {
  if (card.state === 'review') { const d = card.days || Math.max(1, Math.round((card.due - now) / DAY)); return d < 30 ? d + 'd' : d < 365 ? Math.round(d / 30.4) + 'mo' : Math.round(d / 36.5) / 10 + 'y'; }
  const m = Math.max(1, Math.round((card.due - now) / MIN));
  return m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd';
}
