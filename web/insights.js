// Deep stats (Pro): what you remember, what you're weak at and why, and what's coming. Worked out from a library's cards
// and review logs, the same way for the Stats page (db.js) and for AI apps (mcp.mjs get_weak_spots, get_review_history,
// get_stats). Plain numbers and ids; the page and the AI tools put words to them.
import { dayAt } from './fsrs.js';
import { scheduled, recallAt, isLeech, dueDay, examStatus, LEECH_TAG } from './sched.js';

const DAY = 86400000;
// A flashcards grade (a Learn mode answer is `kind: 'learn'`), and one that says right or wrong (not a pile).
export const isGrade = l => !l.kind && (l.rating || l.pile != null);
const rated = l => !l.kind && l.rating;
// True retention: reviews of cards you'd already learned (not new cards, not learning steps), where anything but Forgot
// means you remembered.
const learned = l => rated(l) && l.was === 'review';
export const pct = (a, n) => (n ? Math.round(a / n * 100) : null);
const median = xs => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mondayOf = t => { const d = new Date(t); return dayAt(t, -((d.getDay() + 6) % 7)); };
const monthOf = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const monthAfter = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); };
// Twelve weeks, or twelve months for a year: when each starts, oldest first.
function buckets(now, byMonth) {
  const out = [];
  let t = byMonth ? monthOf(now) : mondayOf(now);
  for (let i = 0; i < 12; i++) { out.unshift(t); t = byMonth ? monthOf(t - DAY) : dayAt(t, -7); }
  return out;
}

// opt: { now, days (the range: 7, 30, or 365), deckId (one deck only) }.
export function insights(S, opt = {}) {
  const now = opt.now || Date.now(), days = opt.days || 30, since = now - days * DAY;
  const deckOf = new Map(S.decks.map(d => [d.id, d])), cardOf = new Map(S.cards.map(c => [c.id, c]));
  const only = opt.deckId || null, mine = x => !only || x.deckId === only;
  const logs = S.logs.filter(mine), cards = S.cards.filter(c => mine(c) && !c.pending);
  const inRange = logs.filter(l => l.at >= since);
  const mature = inRange.filter(learned);
  const right = list => list.filter(l => l.rating > 1).length;

  // ---------- memory ----------
  // Remembered week by week (month by month for a year), and by tag.
  const byMonth = days > 60, starts = buckets(now, byMonth), ends = starts.map((t, i) => starts[i + 1] || (byMonth ? monthAfter(t) : dayAt(t, 7)));
  const allMature = logs.filter(learned), inBucket = (l, i) => l.at >= starts[i] && l.at < ends[i];
  const trend = starts.map((start, i) => { const b = allMature.filter(l => inBucket(l, i)); return { start, n: b.length, pct: pct(right(b), b.length) }; });
  // Topics are your own tags (the Leech tag marks cards you keep forgetting, so it isn't one).
  const tagsOf = l => (cardOf.get(l.cardId) || { tags: [] }).tags.filter(g => g !== LEECH_TAG);
  const tagStat = list => { const m = new Map(); for (const l of list) for (const g of tagsOf(l)) { const x = m.get(g) || m.set(g, { n: 0, ok: 0 }).get(g); x.n++; if (l.rating > 1) x.ok++; } return m; };
  const cardsWith = new Map(); for (const c of cards) for (const g of c.tags) if (g !== LEECH_TAG) cardsWith.set(g, (cardsWith.get(g) || 0) + 1);
  const byTag = [...tagStat(mature)].map(([tag, x]) => ({ tag, n: x.n, pct: pct(x.ok, x.n), cards: cardsWith.get(tag) || 0 })).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
  // Most improved and slipping: each tag's last 30 days against the 30 before, with a few reviews in each.
  const cut = now - 30 * DAY, recent = tagStat(allMature.filter(l => l.at >= cut)), before = tagStat(allMature.filter(l => l.at >= cut - 30 * DAY && l.at < cut));
  const moves = [...recent].filter(([g, x]) => x.n >= 5 && (before.get(g) || { n: 0 }).n >= 5)
    .map(([tag, x]) => { const b = before.get(tag); return { tag, before: pct(b.ok, b.n), after: pct(x.ok, x.n), n: x.n + b.n }; }).map(m => ({ ...m, delta: m.after - m.before }));
  const improved = moves.filter(m => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3), slipping = moves.filter(m => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  // Flashcards against Learn mode: how often each was right.
  const graded = inRange.filter(rated), learnt = inRange.filter(l => l.kind === 'learn');
  const modes = { cards: { n: graded.length, pct: pct(right(graded), graded.length) }, learn: { n: learnt.length, pct: pct(learnt.filter(l => l.ok).length, learnt.length) } };

  // ---------- weak spots ----------
  const weakTags = byTag.filter(x => x.n >= 8).sort((a, b) => a.pct - b.pct || b.n - a.n).slice(0, 6);
  // Cards you've studied, in decks FSRS schedules.
  const studied = cards.filter(c => c.srs.state !== 'new' && scheduled(deckOf.get(c.deckId)));
  // The hardest: forgotten most, then the most difficult, then the least remembered right now.
  const hardest = studied.filter(c => !c.paused && ((c.srs.lapses || 0) > 0 || (c.srs.d || 0) >= 7))
    .map(c => ({ id: c.id, deckId: c.deckId, lapses: c.srs.lapses || 0, d: Math.round((c.srs.d || 0) * 10) / 10, recall: recallAt(c, now), reps: c.srs.reps || 0 }))
    .sort((a, b) => b.lapses - a.lapses || b.d - a.d || (a.recall ?? 1) - (b.recall ?? 1)).slice(0, 20);
  const leeches = studied.filter(c => isLeech(c, deckOf.get(c.deckId))).map(c => ({ id: c.id, deckId: c.deckId, lapses: c.srs.lapses || 0, paused: !!c.paused })).sort((a, b) => b.lapses - a.lapses);
  const forgot = { n: mature.length - right(mature), of: mature.length, pct: pct(mature.length - right(mature), mature.length) };
  // How often cards were forgotten (0, 1, 2, 3–4, 5–7, 8 or more times), and how difficult they are (1 to 10).
  const LAPSES = [[0, 0, '0'], [1, 1, '1'], [2, 2, '2'], [3, 4, '3–4'], [5, 7, '5–7'], [8, Infinity, '8+']];
  const lapseDist = LAPSES.map(([a, b, label]) => ({ label, n: studied.filter(c => (c.srs.lapses || 0) >= a && (c.srs.lapses || 0) <= b).length }));
  const diffDist = Array.from({ length: 9 }, (_, i) => ({ label: String(i + 1), n: studied.filter(c => Math.min(9, Math.max(1, Math.floor(c.srs.d || 1))) === i + 1).length }));

  // ---------- pace ----------
  // Time on each card (from showing it to grading it), per right answer, and right answers a minute.
  const timed = inRange.filter(l => isGrade(l) && l.ms > 0), ms = timed.reduce((a, l) => a + l.ms, 0), ok = right(timed);
  const learnTimed = learnt.filter(l => l.ms > 0);
  const time = { n: timed.length, perCard: timed.length ? ms / timed.length / 1000 : null, perRight: ok ? ms / ok / 1000 : null, rightPerMin: ms ? ok / (ms / 60000) : null,
    minutes: ms / 60000, learnN: learnTimed.length, perQuestion: learnTimed.length ? learnTimed.reduce((a, l) => a + l.ms, 0) / learnTimed.length / 1000 : null };
  // How your gaps grow: the typical gap before each review of a learned card, week by week; and the gap cards wait now.
  const gapOf = l => (l.prev && l.prev.last ? (l.at - l.prev.last) / DAY : null);
  const gaps = starts.map((start, i) => { const g = allMature.filter(l => inBucket(l, i)).map(gapOf).filter(x => x != null); return { start, n: g.length, days: median(g) }; });
  const waiting = studied.filter(c => c.srs.state === 'review' && !c.paused && c.srs.due > c.srs.last).map(c => (c.srs.due - c.srs.last) / DAY);
  const gapNow = median(waiting);
  // Reviews coming up, week by week for 8 weeks (the first week has what's due now), with an exam's early reviews.
  const ahead = Array.from({ length: 8 }, (_, i) => ({ start: dayAt(now, i * 7), n: 0 }));
  for (const c of studied) {
    if (c.paused) continue;
    const i = Math.floor(Math.max(0, dueDay(c, deckOf.get(c.deckId), now)) / 7);
    if (i < 8) ahead[i].n++;
  }
  // Decks with an exam coming: how ready each is.
  const exams = S.decks.filter(d => (!only || d.id === only) && d.exam).map(d => ({ deckId: d.id, name: d.name, ...examStatus(S.cards.filter(c => c.deckId === d.id), d, now) })).filter(x => x.days != null);

  return {
    days, reviews: inRange.filter(isGrade).length,
    memory: { retention: { n: mature.length, pct: pct(right(mature), mature.length) }, trend, byMonth, byTag, improved, slipping, modes },
    weak: { weakTags, hardest, leeches, forgot, lapseDist, diffDist, studied: studied.length },
    pace: { time, gaps, gapNow, ahead, exams }
  };
}

// Recent reviews, day by day (most recent first), for AI apps: how many, how many right, minutes, new cards, and Learn
// mode answers; and the same per deck. opt: { now, days (7 to 365), deckId }.
export function history(S, opt = {}) {
  const now = opt.now || Date.now(), days = Math.min(365, Math.max(1, Math.round(opt.days || 30))), since = dayAt(now, -(days - 1));
  const logs = S.logs.filter(l => l.at >= since && (!opt.deckId || l.deckId === opt.deckId));
  const blank = () => ({ reviews: 0, right: 0, rated: 0, ms: 0, fresh: 0, learn: 0, learnRight: 0 });
  const add = (x, l) => {
    if (l.kind === 'learn') { x.learn++; if (l.ok) x.learnRight++; }
    else if (isGrade(l)) { x.reviews++; if (l.rating) { x.rated++; if (l.rating > 1) x.right++; } if (l.was === 'new') x.fresh++; }
    if (l.ms > 0) x.ms += l.ms;
  };
  const byDay = new Map(), byDeck = new Map();
  for (const l of logs) {
    const k = dayAt(l.at);
    add(byDay.get(k) || byDay.set(k, blank()).get(k), l);
    add(byDeck.get(l.deckId) || byDeck.set(l.deckId, blank()).get(l.deckId), l);
  }
  const out = x => ({ reviews: x.reviews, right: x.rated ? pct(x.right, x.rated) : null, minutes: Math.round(x.ms / 6000) / 10, new_cards: x.fresh, learn_answers: x.learn, learn_right: x.learn ? pct(x.learnRight, x.learn) : null });
  return {
    days: [...byDay].sort((a, b) => b[0] - a[0]).map(([t, x]) => ({ day: t, ...out(x) })),
    decks: [...byDeck].map(([deckId, x]) => ({ deckId, ...out(x) })).sort((a, b) => b.reviews - a.reviews),
    total: out([...byDay.values()].reduce((a, x) => { for (const k in a) a[k] += x[k]; return a; }, blank()))
  };
}
