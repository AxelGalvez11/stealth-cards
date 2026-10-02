// How far you are on one deck, for a class's assignments: the server sends it to the class when you share your progress
// (web/classes.mjs), and the app shows your own on Today and on the class page (web/db.js). It's only these numbers,
// never your answers: cards learned (studied until they come back days later; on a deck sorted into piles, any card in a
// pile), cards due now, how often you remembered a card when it came back (the last 30 days), and when you last studied.
const DAY = 86400000;
export function progressOf(d, cards, logs, now = Date.now()) {
  const cs = cards.filter(c => c.deckId === d.id && !c.pending), piles = d.grading === 'piles', timed = !piles;
  const learned = cs.filter(c => (piles ? !!c.pile : timed ? c.srs.state === 'review' || c.srs.state === 'relearning' : (c.srs.reps || 0) > 0)).length;
  const due = timed ? cs.filter(c => c.srs.state !== 'new' && c.srs.due <= now).length : 0;
  const mine = logs.filter(l => l.deckId === d.id), back = mine.filter(l => l.at >= now - 30 * DAY && l.rating && l.was === 'review');
  return { learned, total: cs.length, due, remembered: back.length ? Math.round(back.filter(l => l.rating > 1).length / back.length * 100) : null,
    last: mine.reduce((m, l) => Math.max(m, l.at), 0) || null };
}
// An assignment is done when every card is learned (Learn every card), or, for Review what's due, once you've started
// and nothing is due right now.
export const doneOf = (goal, p) => !!p && (goal === 'daily' ? p.learned > 0 && p.due === 0 : p.total > 0 && p.learned >= p.total);
