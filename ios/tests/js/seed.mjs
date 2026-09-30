// A realistic library for the checks: four decks, 440 cards with tags, about five months of reviews (simulated with
// FSRS the way the server grades, each learner-memory following its own true parameters, some tags much harder),
// review times, Learn mode answers, a few cards forgotten again and again (tagged Leech by the usual rule), a couple of
// paused cards, and an exam date. Writes <dir>/stealth-cards.json. node seed.mjs <dir> [--old] (--old: without the
// settings added since, like a library from before this change).
import { mkdirSync, writeFileSync } from 'node:fs';
const WT = process.env.WT || new URL('../../..', import.meta.url).pathname.replace(/\/$/, ''), F = await import(WT + '/web/fsrs.js');
const [dir, flag] = process.argv.slice(2), old = flag === '--old';
const DAY = 86400000, now = Date.now(), start = F.dayAt(now, -150) + 9 * 3600e3;
let seed = 42; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const id = (p, i) => p + i.toString(36).padStart(5, '0');
const TRUE = F.W.slice(); Object.assign(TRUE, { 8: 1.35, 10: 0.9, 11: 1.7 });
// Deck: name, cards, tags (with how hard each is: a multiplier on how fast it's forgotten), new cards a day.
const DECKS = [['Cell Biology', 160, [['Organelles', 1], ['Energy', .8], ['Mitochondria', 1.4], ['Proteins', 1.2], ['Membranes', 1]], 12],
  ['Organic Chemistry', 120, [['Reactions', 1.9], ['Aromatics', 1.1], ['Alkenes', 1.4], ['Stereo', 1.5]], 10],
  ['Spanish Verbs', 100, [['Irregular', 1.7], ['Regular', .7], ['Subjunctive', 1.5]], 10],
  ['US History', 60, [['Revolution', .9], ['Civil War', 1.1]], 6]];
const decks = [], cards = [], logs = [];
let lid = 0;
DECKS.forEach(([name, n, tags, perDay], di) => {
  const d = { id: id('d', di), name, tags: [], created: start - DAY, cover: { style: 'mix', round: 0, image: null, seed: name }, paused: false, grading: 'four', fsrs: true, goal: 90, gapIdx: 3,
    steps: ['1m', '10m'], perDay, piles: [{ name: 'Know it' }, { name: 'Almost' }, { name: 'No clue' }], folder: null, bg: { kind: 'deck', image: null } };
  if (!old) Object.assign(d, { exam: null, leechAt: 8, leechAct: 'tag' });
  decks.push(d);
  for (let i = 0; i < n; i++) {
    const [tag, hard] = tags[i % tags.length];
    cards.push({ id: id('c' + di, i), deckId: d.id, kind: 'basic', front: name + ' question ' + (i + 1) + ' (' + tag + ')', back: 'Answer ' + (i + 1), note: '', text: '', tags: [tag], image: null, audio: null, wave: null,
      speak: '', lang: '', auto: true, source: i % 5 ? 'you' : 'Claude', pending: false, created: start - DAY, srs: F.newCard(), pile: null, cloze: null, group: null, hard: hard * (0.7 + rnd() * 0.6), truth: F.newCard() });
  }
});
const deckOf = c => decks.find(d => d.id === c.deckId);
const review = (c, g, at) => {
  const d = deckOf(c), log = { id: 'l' + (lid++).toString(36), cardId: c.id, deckId: c.deckId, at, prev: c.srs, prevPile: c.pile, was: c.srs.state, rating: g, ms: Math.round(2500 + rnd() * 9000 + (g === 1 ? 5000 : 0)) };
  c.srs = F.grade(c.srs, g, at, { goal: d.goal / 100, maxDays: 365, steps: d.steps });
  c.truth = F.grade(c.truth, g, at, { goal: 0.9, maxDays: 365, steps: d.steps, w: TRUE });
  if ((log.prev.lapses || 0) < 8 && c.srs.lapses >= 8 && !c.tags.includes('Leech')) { c.tags.push('Leech'); log.leech = 'tag'; }
  logs.push(log);
};
const grade = (c, at) => {
  if (c.srs.state === 'new') { const u = rnd(); return u < .15 * c.hard ? 1 : u < .25 ? 2 : u < .92 ? 3 : 4; }
  const t = c.truth, R = t.state === 'review' ? Math.pow(F.recall(Math.max(0, (at - t.last) / DAY), t.s), c.hard) : 0.9;
  if (rnd() > R) return 1;
  const u = rnd(); return u < .12 ? 2 : u < .9 ? 3 : 4;
};
for (let day = 0; day < 150; day++) {
  const t0 = start + day * DAY;
  if (rnd() < .12) continue;
  let at = t0;
  for (const d of decks) {
    // New cards, except the last 20 of each deck, which stay new.
    const fresh = cards.filter(c => c.deckId === d.id && c.srs.state === 'new').slice(0, d.perDay).filter(c => cards.filter(x => x.deckId === d.id).indexOf(c) < cards.filter(x => x.deckId === d.id).length - 20);
    for (const c of fresh) for (let s = 0; s < 5 && (c.srs.state === 'new' || (c.srs.state !== 'review' && c.srs.due < at + 3600e3)); s++) { at = Math.max(at, c.srs.state === 'new' ? at : c.srs.due) + 15e3; review(c, grade(c, at), at); }
  }
  for (const c of cards.filter(c => c.srs.state !== 'new' && c.srs.due <= t0 + 14 * 3600e3)) {
    at += 12e3 + rnd() * 20e3;
    if (at > now - 60e3) break;
    review(c, grade(c, at), at);
    for (let s = 0; s < 3 && c.srs.state !== 'review'; s++) { at = Math.max(at, c.srs.due) + 5e3; review(c, grade(c, at), at); }
  }
}
// Learn mode answers over the last month.
const studied = cards.filter(c => c.srs.state !== 'new');
for (let i = 0; i < 160; i++) {
  const c = studied[Math.floor(rnd() * studied.length)], at = now - Math.floor(rnd() * 28) * DAY - 4 * 3600e3;
  logs.push({ id: 'l' + (lid++).toString(36), cardId: c.id, deckId: c.deckId, at, kind: 'learn', q: ['mc', 'tf', 'type', 'match'][i % 4], ok: rnd() < .78, ms: Math.round(4000 + rnd() * 12000) });
}
logs.sort((a, b) => a.at - b.at);
// Two paused cards, and the exam: Cell Biology, twelve days from today.
cards.find(c => c.deckId === decks[1].id && c.srs.state === 'review').paused = true;
cards.filter(c => c.deckId === decks[2].id && c.srs.state === 'review')[3].paused = true;
if (!old) { const ex = new Date(F.dayAt(now, 12)); decks[0].exam = ex.getFullYear() + '-' + String(ex.getMonth() + 1).padStart(2, '0') + '-' + String(ex.getDate()).padStart(2, '0'); }
const settings = { name: '', color: 0, look: 'system', darkMode: 'black', grads: 'mix', prog: 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, reminder: '9:00 AM', photo: '', yourPhoto: null, welcomed: true, ...(old ? {} : { tune: null }) };
const lib = { version: 1, rev: 5, settings, ai: { perms: { read: true, text: true, media: true, edit: true, check: false, del: false }, clients: {} }, folders: [], decks,
  cards: cards.map(({ hard, truth, ...c }) => c), logs };
mkdirSync(dir, { recursive: true });
writeFileSync(dir + '/stealth-cards.json', JSON.stringify(lib));
const graded = logs.filter(l => l.rating).length, leeches = cards.filter(c => c.srs.lapses >= 8).length;
console.log('seeded ' + cards.length + ' cards, ' + graded + ' graded reviews, ' + logs.filter(l => l.kind).length + ' Learn answers, ' + leeches + ' leeches, exam ' + (decks[0].exam || 'none') + ' → ' + dir);
