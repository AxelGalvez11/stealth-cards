// Lucida's scheduling rules on top of FSRS (fsrs.js), shared by the app (db.js), the server (store.mjs), and AI apps
// (mcp.mjs), so all three agree on what comes up: cards you paused never do, cards you keep forgetting get marked, an
// exam date brings cards up early, and a memory goal has a price in reviews a day.
import { recall, gapOf, dayAt } from './fsrs.js';

const DAY = 86400000;
// A deck's longest gap (its gapIdx picks one), in days.
export const GAPS = [30, 90, 180, 365, 730, 1825, 3650];
// FSRS picks when a deck's cards come back, unless it grades with piles or has FSRS turned off.
export const scheduled = d => !!d && d.fsrs !== false && d.grading !== 'piles';

// ---------- cards you keep forgetting ----------
// After this many forgets a card is marked (Anki calls them leeches), and gets the Leech tag or is paused, as its deck
// says. Only forgetting a card you'd learned counts (not a slip while it's still being learned).
export const LEECH_AT = 8, LEECH_TAG = 'Leech';
export const leechAt = d => Math.round((d && +d.leechAt) || LEECH_AT);
export const leechAct = d => (d && d.leechAct === 'pause' ? 'pause' : 'tag');
export const isLeech = (c, d) => scheduled(d) && (c.srs.lapses || 0) >= leechAt(d);

// ---------- memory ----------
// How likely you are to remember a card at time `t`: 1 for a card you haven't forgotten yet today, null before its
// first review.
export const recallAt = (c, t) => (c.srs.state === 'new' || !(c.srs.s > 0) ? null : recall(Math.max(0, (t - (c.srs.last || t)) / DAY), c.srs.s));

// ---------- exam date ----------
// A deck can have an exam day ('2026-10-12'). From EXAM_DAYS before it, cards come up as soon as your memory of them
// slips under a goal that rises from the deck's own to EXAM_GOAL on the day, so the cards you'd forget by then come up
// early and the whole deck is fresh for the exam. Only what comes up changes: each of those reviews is a normal one,
// so once the day has passed the deck's schedule simply carries on.
export const EXAM_DAYS = 30, EXAM_GOAL = 0.95;
export const examDay = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((d && d.exam) || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null; };
// Whole days from `now` to the exam (0 on the day, less after it), or null without one.
export const examIn = (d, now) => { const t = examDay(d); return t == null ? null : Math.round((t - dayAt(now)) / DAY); };
// The goal a card is held to `n` days before the exam.
export const examGoal = (d, n) => {
  const g = ((d && d.goal) || 90) / 100, top = Math.max(g, EXAM_GOAL);
  return n == null || n < 0 || n > EXAM_DAYS ? g : g + (top - g) * (1 - n / EXAM_DAYS);
};
// Whether an exam brings this card up at `now` (a card you've learned, whose memory slipped under the exam's goal).
export function examBrings(c, d, now) {
  if (c.srs.state !== 'review' || !scheduled(d)) return false;
  const n = examIn(d, now);
  if (n == null || n < 0 || n > EXAM_DAYS) return false;
  const r = recallAt(c, now);
  return r != null && r < examGoal(d, n);
}
// Whether a card comes up now in a deck FSRS schedules: it's due, or an exam brings it up early. Paused cards and AI
// cards still waiting for your OK never do.
export const isDue = (c, d, now) => !c.pending && !c.paused && c.srs.state !== 'new' && (c.srs.due <= now || examBrings(c, d, now));
// Which day (0 today, 1 tomorrow…) a card comes up on, with the exam's early reviews: for the forecasts.
export function dueDay(c, d, now) {
  const today = dayAt(now), normal = Math.round((dayAt(c.srs.due) - today) / DAY);
  if (c.srs.due <= now) return 0;
  const n = examIn(d, now);
  if (c.srs.state !== 'review' || !scheduled(d) || n == null || n < 0) return normal;
  for (let i = Math.max(0, n - EXAM_DAYS); i <= Math.min(n, normal); i++) {
    const at = i ? dayAt(now, i) : now, r = recallAt(c, at);
    if (r != null && r < examGoal(d, n - i)) return i;
  }
  return normal;
}
// An exam's numbers for a deck's cards: days to go, the cards to review before it (you'd remember them less than the
// exam's goal on the day), and how ready the deck is: cards seen, cards learned, and how much of it you'd remember on
// the day if you stopped studying now. Null without an exam, or once it's over.
export function examStatus(cards, d, now) {
  const n = examIn(d, now);
  if (n == null || n < 0) return null;
  const day = examDay(d) + 12 * 3600000, goal = examGoal(d, 0);
  let total = 0, seen = 0, learned = 0, likely = 0, toReview = 0;
  for (const c of cards) {
    if (c.pending || c.paused) continue;
    total++;
    if (c.srs.state === 'new') continue;
    seen++;
    if (c.srs.state === 'review') learned++;
    const r = recallAt(c, Math.max(day, now));
    if (r == null) continue;
    likely += r;
    if (r < goal) toReview++;
  }
  return { days: n, date: d.exam, total, seen, learned, toReview, likely: total ? likely / total : 0 };
}

// ---------- what a memory goal costs ----------
// About how many reviews a day a memory goal means for a deck, from its cards as they are now: each card you've studied
// comes back about once per gap (the gap at which your memory of it falls to the goal, up to the deck's longest gap),
// a forgotten one about once more, and the deck's new cards a day start on top. It's the steady rate, cheap enough to
// work out again at every step of the goal.
export function workload(cards, d, goal, now) {
  const maxDays = GAPS[d.gapIdx ?? 3];
  let rate = 0, left = 0;
  for (const c of cards) {
    if (c.pending || c.paused) continue;
    if (c.srs.state === 'new') { left++; continue; }
    if (!(c.srs.s > 0)) continue;
    rate += 1 / Math.min(maxDays, Math.max(1, gapOf(c.srs.s, goal)));
  }
  return rate * (2 - goal) + Math.min(d.perDay || 0, left);
}
// Three goals to compare, each with its reviews a day.
export const PRESETS = [['relaxed', 'Relaxed', 85], ['balanced', 'Balanced', 90], ['intense', 'Intense', 95]];
