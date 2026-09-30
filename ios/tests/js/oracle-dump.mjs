// What the web app's database (web/db.js) says about a library, as JSON: node oracle-dump.mjs <state.json> <now> <out.json>.
// swift/main.swift writes the same shape from the iPhone app's ports; compare.mjs sets them side by side.
import { readFileSync, writeFileSync } from 'node:fs';
import { openDb } from './oracle-env.mjs';
const WT = process.env.WT || new URL('../../..', import.meta.url).pathname.replace(/\/$/, ''), [file, nowArg, out] = process.argv.slice(2), NOW = +nowArg;
const state = JSON.parse(readFileSync(file, 'utf8'));
const { db } = await openDb(WT, state, NOW);
const S = db.raw();
const round = x => x;
const dump = { now: NOW };
dump.decks = db.decks().map(d => ({ id: d.id, name: d.name, due: d.due, overdue: d.overdue, fresh: d.fresh, soon: d.soon, total: d.total, aiCount: d.aiCount, ret: d.ret,
  exam: d.exam ? { days: d.exam.days, day: d.exam.day, when: d.exam.when, line: d.exam.line, toReview: d.exam.toReview, total: d.exam.total, seen: d.exam.seen, learned: d.exam.learned, likely: d.exam.likely } : null }));
const td = db.today();
dump.today = { due: td.due, fresh: td.fresh, minutes: td.minutes, streak: td.streak, best: td.best, next: td.next, week: td.week.map(w => w.done), forecast: { vals: td.forecast.vals, labels: td.forecast.labels, names: td.forecast.names } };
const st = db.stats('Month');
dump.stats = { streak: st.streak, best: st.best, reviews: st.reviews, cards: st.cards, remembered: st.remembered, heat: st.heat, forecast14: st.forecast };
const ids = q => q.map(x => x.card.id);
dump.queue = { all: ids(db.__queue(null)), perDeck: Object.fromEntries(S.decks.map(d => [d.id, ids(db.__queue(d.id))])), sets: {} };
const tags = [...new Set(S.cards.flatMap(c => c.tags))].filter(t => t !== 'Leech');
for (const set of ['hard', 'leech', ...tags.map(t => 'tag:' + t)]) dump.queue.sets[set] = ids(db.__queue(null, null, set));
dump.allCards = db.allCards().map(c => ({ id: c.id, next: c.next, level: c.level, leech: c.leech, paused: c.paused }));
dump.workload = Object.fromEntries(S.decks.map(d => [d.id, Object.fromEntries([70, 80, 85, 90, 95, 97].map(g => [g, db.workload(d.id, g)]))]));
dump.insights = Object.fromEntries(['Week', 'Month', 'Year'].map(r => [r, db.insights(r)]));
const ti = db.tuneInfo(); dump.tuneInfo = { reviews: ti.reviews, can: ti.can, on: ti.on, tuned: ti.tuned, n: ti.n };
const h = db.__histories(); dump.histories = { reviews: h.reviews, items: h.items, cards: h.data.length, first: h.data.slice(0, 3), last: h.data.slice(-2) };
// Each deck's page numbers.
dump.deckPage = Object.fromEntries(S.decks.map(d => { const x = db.deck(d.id); return [d.id, { goal: x.goal, exam: x.exam ? x.exam.line : null, examDay: x.examDay, leechAt: x.leechAt, leechAct: x.leechAct, forecast: x.forecast }]; }));
writeFileSync(out, JSON.stringify(dump));
console.log('wrote', out, JSON.stringify(dump).length, 'bytes');
process.exit(0);
