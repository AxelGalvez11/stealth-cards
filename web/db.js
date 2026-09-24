// The web app's database: your real decks, cards, and reviews, saved on this computer by the local server
// (web/store.mjs), or online in your own library once you sign in. Every screen asks it the same questions the
// canvas's sample data answers (design/mock.mjs), so the same screens run on both: sample data on the canvas,
// your data here.
import { preview, waitLabel, dayAt } from './fsrs.js';
import R from './rich.js';

const DAY = 86400000, MIN = 60000, GAPS = [30, 90, 180, 365, 730, 1825, 3650];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLORS = ['linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', 'linear-gradient(135deg, #FFC857 0%, #EE5A36 100%)', 'linear-gradient(135deg, #7EE0B0 0%, #1F8F5F 100%)',
  'linear-gradient(135deg, #F9A8D4 0%, #D6336C 100%)', 'linear-gradient(135deg, #7DE3F0 0%, #0E8A9E 100%)', 'linear-gradient(135deg, #C4A7FF 0%, #7C3AED 100%)'];
const KIND = { basic: 'Basic', cloze: 'Fill in the blank', image: 'Image', audio: 'Audio' };
const ICON = { basic: 'text', cloze: 'blank', image: 'image', audio: 'audio' };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const byAI = c => c.source && c.source !== 'you' && c.source !== 'import';

// Online, nobody is signed in yet: only the sign-in pages work. The email waits in this tab while you get the code.
function signedOut(go) {
  const q = new URLSearchParams(location.search), keep = sessionStorage;
  let email = ''; try { email = keep.getItem('lucida.email') || ''; } catch {}
  const post = async (url, body) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'That didn’t work. Try again in a minute.');
    return j;
  };
  const off = q.get('off');
  // Where to go once signed in (going Pro signs you in first): a page of this site only.
  const next = q.get('next') || '';
  if (/^\/(?![\/\\])/.test(next)) try { keep.setItem('lucida.next', next); } catch {}
  const auth = {
    email: () => email,
    error: () => off ? (off === 'apple' ? 'Apple' : 'Google') + ' sign-in isn’t set up yet. Use your email for now.' : q.get('failed') ? 'That didn’t work. Try again.' : '',
    sendCode: async e => { await post('/api/auth/code', { email: e }); email = e; try { keep.setItem('lucida.email', e); } catch {} },
    verify: code => post('/api/auth/verify', { email, code }),
    done: () => { try { keep.removeItem('lucida.email'); } catch {} location.assign(afterSignIn() || '/'); },
    go
  };
  return { signedOut: true, mock: false, auth, settings: () => ({ look: 'system' }), act: { go } };
}
// The page to open once you're signed in, if signing in started somewhere (asked once, then forgotten).
export function afterSignIn() {
  let next = ''; try { next = sessionStorage.getItem('lucida.next') || ''; sessionStorage.removeItem('lucida.next'); } catch {}
  return /^\/(?![\/\\])/.test(next) ? next : '';
}
// A request that finds you signed out (your session ended) goes back to signing in.
const toSignIn = () => location.assign('/sign-in');

export async function createDb({ onChange, go }) {
  const get = async url => { const r = await fetch(url, { cache: 'no-store' }); if (r.status === 401) { toSignIn(); throw new Error('Signed out'); } return r.json(); };
  const first = await fetch('/api/state', { cache: 'no-store' });
  if (first.status === 401) return signedOut(go);
  let S = await first.json();
  // Back from paying for Pro: Stripe's news can land a moment after you do, so ask again for a little while.
  if (new URLSearchParams(location.search).get('welcome') === 'pro' && S.me && !(S.me.plan && S.me.plan.pro)) {
    let tries = 0;
    const again = setInterval(async () => {
      try { const next = await get('/api/state'); if (next.me && next.me.plan && next.me.plan.pro) { clearInterval(again); S = { ...S, me: next.me }; changed(); } } catch {}
      if (++tries >= 15) clearInterval(again);
    }, 2000);
  }
  let session = null; // the review in progress: { key, deckId, pile, started, graded: [{ cardId, rating, pile, was, logId }] }
  let memo = {};
  const changed = () => { memo = {}; onChange(); };
  const accept = next => { if (next && next.rev >= S.rev) { S = next; changed(); } };
  async function send(type, payload = {}) {
    const r = await fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, ...payload }) });
    if (r.status === 401) { toSignIn(); throw new Error('Signed out'); }
    const j = await r.json();
    if (!r.ok) { alert(j.error || 'Something went wrong.'); throw new Error(j.error); }
    accept(j.state);
    return j.result;
  }
  // Cards your AI adds over MCP show up without a reload.
  setInterval(async () => {
    if (document.hidden) return;
    try { const { rev } = await get('/api/rev'); if (rev > S.rev) accept(await get('/api/state')); } catch { /* the server is restarting */ }
  }, 2000);

  const now = () => Date.now();
  const deckById = id => S.decks.find(d => d.id === id);
  const keyOf = (id, pile) => (id || 'all') + (pile ? '|' + pile : '');
  const reviewHref = (id, pile) => (id ? '/review/' + id : '/review') + (pile ? '?pile=' + encodeURIComponent(pile) : '');
  const cardsOf = id => S.cards.filter(c => c.deckId === id);
  const isLearn = c => c.srs.state === 'learning' || c.srs.state === 'relearning';
  const scheduled = d => d.fsrs !== false && d.grading !== 'piles';
  const seenToday = id => { const t0 = dayAt(now()); return new Set(S.logs.filter(l => l.deckId === id && l.at >= t0).map(l => l.cardId)); };
  const rememberedPct = logs => { const r = logs.filter(l => l.rating && l.was === 'review'); return r.length ? Math.round(r.filter(l => l.rating > 1).length / r.length * 100) : null; };

  function deckStat(d) {
    if (memo['s' + d.id]) return memo['s' + d.id];
    const t = now(), today = dayAt(t), all = cardsOf(d.id), cs = all.filter(c => !c.pending);
    const newToday = S.logs.filter(l => l.deckId === d.id && l.at >= today && l.was === 'new').length;
    let due = 0, overdue = 0, fresh = 0, next = Infinity;
    if (d.grading === 'piles') due = cs.filter(c => !c.pile).length;
    else if (!scheduled(d)) { const seen = seenToday(d.id); due = cs.filter(c => !seen.has(c.id)).length; }
    else {
      for (const c of cs) {
        if (c.srs.state === 'new') continue;
        if (c.srs.due <= t) { due++; if (c.srs.state === 'review' && c.srs.due < today) overdue++; }
        else next = Math.min(next, c.srs.due);
      }
      fresh = Math.max(0, Math.min(cs.filter(c => c.srs.state === 'new').length, d.perDay - newToday));
    }
    const soon = due ? 0 : next < Infinity ? Math.max(1, Math.round((dayAt(next) - today) / DAY)) : null;
    return (memo['s' + d.id] = { due, overdue, fresh, soon, next, total: all.length, aiCount: all.filter(byAI).length,
      ret: rememberedPct(S.logs.filter(l => l.deckId === d.id && l.at >= t - 30 * DAY)) });
  }
  const deckRow = d => {
    const st = deckStat(d);
    return { id: d.id, name: d.name, tags: d.tags, seed: d.cover.seed || d.name, style: d.cover.style, round: d.cover.round, image: d.cover.image, paused: d.paused,
      total: st.total, totalLabel: st.total.toLocaleString('en-US'), due: st.due, overdue: st.overdue, soon: st.soon, fresh: st.fresh, ret: st.ret, aiCount: st.aiCount,
      href: '/deck/' + d.id, studyHref: '/review/' + d.id, settingsHref: '/deck/' + d.id + '?settings=1', newCardHref: '/deck/' + d.id + '/card' };
  };

  // Days ahead: how many review cards come due each day (1 = tomorrow).
  function forecast(n, decks, long) {
    const t = now(), vals = Array(n).fill(0), ids = new Set(decks.map(d => d.id));
    for (const c of S.cards) {
      if (!ids.has(c.deckId) || c.pending || c.srs.state === 'new' || c.srs.due <= t) continue;
      const i = Math.round((dayAt(c.srs.due) - dayAt(t)) / DAY);
      if (i >= 1 && i <= n) vals[i - 1]++;
    }
    const day = i => new Date(dayAt(t, i + 1));
    const labels = vals.map((_, i) => (long ? String(day(i).getDate()) : DAYS[day(i).getDay()].slice(0, 3)));
    const tops = long ? vals.map((_, i) => DAYS[day(i).getDay()][0]) : null;
    const names = vals.map((_, i) => { const d = day(i); if (i === 0) return 'tomorrow'; if (!long) return DAYS[d.getDay()];
      return d.getMonth() === new Date(t).getMonth() ? DAYS[d.getDay()].slice(0, 3) + ' ' + d.getDate() : DAYS[d.getDay()].slice(0, 3) + ', ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate(); });
    return { vals, labels, tops, names };
  }
  function streaks() {
    if (memo.streaks) return memo.streaks;
    const days = new Set(S.logs.map(l => dayAt(l.at))), sorted = [...days].sort((a, b) => a - b);
    let streak = 0, t = dayAt(now());
    if (!days.has(t)) t = dayAt(t, -1);
    while (days.has(t)) { streak++; t = dayAt(t, -1); }
    let best = 0, run = 0, prev = null;
    for (const d of sorted) { run = prev != null && dayAt(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    return (memo.streaks = { streak, best, days });
  }
  // What's up next for review: cards still learning first, then reviews, then today's new cards.
  // Going over one pile: the cards in it you haven't sorted again yet this time.
  function queue(id, pile) {
    const t = now(), decks = id ? [deckById(id)].filter(Boolean) : S.decks.filter(d => !d.paused);
    if (pile) {
      const done = new Set(session && session.key === keyOf(id, pile) ? session.graded.map(x => x.cardId) : []);
      return decks.flatMap(d => cardsOf(d.id).filter(c => !c.pending && c.pile === pile && !done.has(c.id)).map(c => ({ card: c, deck: d, lane: 'rev' })));
    }
    const learn = [], rev = [], fresh = [];
    for (const d of decks) {
      const cs = cardsOf(d.id).filter(c => !c.pending);
      if (d.grading === 'piles') { cs.filter(c => !c.pile).forEach(c => rev.push({ card: c, deck: d, lane: 'rev' })); continue; }
      if (!scheduled(d)) { const seen = seenToday(d.id); cs.filter(c => !seen.has(c.id)).forEach(c => rev.push({ card: c, deck: d, lane: 'rev' })); continue; }
      for (const c of cs) if (c.srs.state !== 'new' && c.srs.due <= t) (isLearn(c) ? learn : rev).push({ card: c, deck: d, lane: isLearn(c) ? 'learn' : 'rev' });
      cs.filter(c => c.srs.state === 'new').slice(0, deckStat(d).fresh).forEach(c => fresh.push({ card: c, deck: d, lane: 'new' }));
    }
    const byDue = (a, b) => a.card.srs.due - b.card.srs.due;
    const q = [...learn.sort(byDue), ...rev.sort(byDue), ...fresh];
    if (q.length) return q;
    // Nothing due: a card still being learned can come up to 20 minutes early.
    return decks.filter(scheduled).flatMap(d => cardsOf(d.id).filter(c => !c.pending && isLearn(c) && c.srs.due <= t + 20 * MIN).map(c => ({ card: c, deck: d, lane: 'learn' }))).sort(byDue).slice(0, 1);
  }
  // A card as review shows it. Text stays as written (see rich.js); the screen draws the formatting.
  // A fill-in-the-blank card asks one blank (cloze is its number) or all of them (-1).
  function face(c) {
    if (c.kind === 'cloze') {
      const bl = R.blanks(c.text), ask = c.cloze == null ? -1 : c.cloze;
      return { id: c.id, kind: 'cloze', text: c.text || '', cloze: ask, back: (ask < 0 ? bl : bl.slice(ask, ask + 1)).join(', '), note: c.note };
    }
    return { id: c.id, kind: c.kind, front: c.front || (c.kind === 'audio' ? 'What do you hear?' : ''), back: c.back, note: c.note, image: c.image, audio: c.audio, speak: c.speak, lang: c.lang || '',
      backLabel: c.back, backBig: c.back, backSub: c.note || '' };
  }
  // Deck lists and search use the words without the formatting.
  const flat = md => R.plain(md, { join: ' ', math: 'show' });
  const listFront = c => (c.kind === 'cloze' ? R.plain(c.text, { cloze: true, blank: '____', join: ' ', math: 'show' }) : flat(c.front) || (c.kind === 'audio' ? flat(c.speak) || 'Audio card' : 'Image card'));
  const listBack = c => (c.kind === 'cloze' ? R.blanks(c.text, { math: 'show' }).join(', ') : flat(c.back));
  // Search finds a formula by what it shows (π) or how it was typed (\pi).
  const words = c => [c.front, c.back, c.note, c.speak].map(x => R.plain(x, { join: ' ' }) + ' ' + flat(x)).join(' ') + ' ' + R.plain(c.text, { cloze: true, join: ' ' }) + ' ' + R.plain(c.text, { cloze: true, join: ' ', math: 'show' });
  function nextLabel(c) {
    if (c.pending) return 'Waiting for you';
    if (c.srs.state === 'new') return 'New';
    const t = now();
    if (c.srs.due <= t) return 'Due now';
    if (isLearn(c)) return 'In ' + waitLabel(c.srs, t);
    const days = Math.round((dayAt(c.srs.due) - dayAt(t)) / DAY);
    return days <= 1 ? 'Tomorrow' : days < 60 ? 'In ' + days + ' days' : 'In ' + Math.round(days / 30.4) + ' months';
  }
  let spoken = null;
  const autoplay = c => { if (c.kind !== 'audio' || c.auto === false || spoken === c.id) return; spoken = c.id; setTimeout(() => (c.audio ? act.play(c.audio) : act.speak(c.speak, c.lang)), 350); };
  const nextDue = () => {
    const t = now(), ups = S.cards.filter(c => !c.pending && c.srs.state !== 'new' && c.srs.due > t);
    if (!ups.length) return null;
    const first = Math.min(...ups.map(c => c.srs.due)), day = dayAt(first), n = ups.filter(c => dayAt(c.srs.due) === day).length;
    const gap = Math.round((day - dayAt(t)) / DAY);
    return { day: gap === 0 ? 'later today' : gap === 1 ? 'tomorrow' : gap < 7 ? 'on ' + DAYS[new Date(day).getDay()] : 'in ' + gap + ' days', short: gap === 0 ? 'Later today' : gap === 1 ? 'Tomorrow' : gap < 7 ? DAYS[new Date(day).getDay()] : 'In ' + gap + ' days', n };
  };
  const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const choose = accept => new Promise(ok => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    i.onchange = () => ok(i.files[0] || null); i.addEventListener('cancel', () => ok(null)); i.click();
  });
  const upload = async blob => { const r = await fetch('/api/media', { method: 'POST', headers: { 'content-type': blob.type }, body: blob }); const j = await r.json(); if (!r.ok) { alert(j.error); return null; } return j.url; };
  let recorder = null, typing = {}, typingTimer = null;

  // ---------- Learn mode ----------
  // Learn a set of cards until you know every one. Each card is asked in different ways: pick from a few answers, true
  // or false, match it with others, fill in its blank, or type it. It's learned after two right answers in a row, asked
  // two ways, and a card you miss comes back a few questions later. Up to 7 cards are in play at a time. The session
  // keeps itself on this device, so you can stop and pick up later; when every card is learned, the ones that were new
  // get their first review, so spaced repetition takes over.
  const LEARN_KEY = 'lucida.learn', PLAY = 7, KIND_NAME = { mc: 'Multiple choice', tf: 'True or false', blank: 'Fill in the blank', match: 'Matching', type: 'Type the answer' };
  const cardById = id => S.cards.find(c => c.id === id);
  const learnText = c => (c.kind === 'cloze' ? R.plain(c.text, { cloze: true, blank: '____', join: ' ', math: 'show' }) : flat(c.front)).trim();
  const answerOf = c => (c.kind === 'cloze' ? R.blanks(c.text, { math: 'show' }).join(', ') : flat(c.back)).trim();
  const learnable = c => !c.pending && c.kind !== 'audio' && !!answerOf(c) && (c.kind === 'image' ? !!c.image : !!learnText(c));
  const isHard = c => (c.srs.lapses || 0) > 0 || c.srs.state === 'relearning' || (c.srs.state === 'review' && (c.srs.d || 0) >= 7);
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const oneOf = a => a[Math.floor(Math.random() * a.length)];
  let learning = (() => { try { const x = JSON.parse(localStorage.getItem(LEARN_KEY) || 'null'); return x && x.v === 1 ? x : null; } catch { return null; } })();
  // A saved session only counts while its deck and cards are still here (and belong to whoever is signed in).
  const learnOk = () => learning && deckById(learning.deckId) && learning.ids.every(cardById);
  const saveLearn = () => { try { if (learning) localStorage.setItem(LEARN_KEY, JSON.stringify(learning)); else localStorage.removeItem(LEARN_KEY); } catch { /* private window */ } };
  function learnSet(id, set) {
    const cs = cardsOf(id).filter(learnable);
    if (set === 'new') return cs.filter(c => c.srs.state === 'new');
    if (set === 'hard') return cs.filter(isHard);
    if (set.startsWith('tag:')) return cs.filter(c => c.tags.includes(set.slice(4)));
    return cs;
  }
  // Wrong answers that look like the right one: other cards' answers of about the same length, from the same deck.
  function distractors(c, n) {
    const right = answerOf(c).toLowerCase(), deck = cardsOf(c.deckId).filter(x => x.id !== c.id && learnable(x)), same = deck.filter(x => x.kind === c.kind);
    const pool = [...new Set((same.length > n ? same : deck).map(answerOf))].filter(a => a && a.toLowerCase() !== right);
    pool.sort((a, b) => Math.abs(a.length - right.length) - Math.abs(b.length - right.length));
    return shuffle(pool.slice(0, n * 2)).slice(0, n);
  }
  const short = c => c.kind !== 'image' && learnText(c).length <= 70 && answerOf(c).length <= 60;
  // Which kind of question a card gets: a choice first; once it's right, typing it (or another kind of choice).
  function kindFor(s, c, play) {
    const on = k => learning.kinds.includes(k), fits = {
      mc: distractors(c, 3).length >= 1, tf: distractors(c, 1).length >= 1, blank: c.kind === 'cloze' && distractors(c, 3).length >= 1,
      match: short(c) && play.filter(x => learning.st[x].streak === 0 && short(cardById(x))).length >= 4, type: answerOf(c).length <= 40 };
    const pickFrom = ks => ks.filter(k => on(k) && fits[k]);
    const choice = pickFrom(['mc', 'tf', 'blank', 'match']), recall = pickFrom(['type']);
    if (s.streak === 1) { const r = recall.length ? recall : choice.filter(k => k !== s.lastKind); if (r.length) return oneOf(r); }
    return oneOf(choice.length ? choice : recall.length ? recall : ['mc']);
  }
  // Moves a card a few places later among the cards still to learn, so something else comes first.
  function later(cid, k) {
    const q = learning.queue; q.splice(q.indexOf(cid), 1);
    const open = q.filter(x => !learning.st[x].learned), after = open[Math.min(k, open.length) - 1];
    q.splice(after ? q.indexOf(after) + 1 : q.length, 0, cid);
  }
  function nextQuestion() {
    const L = learning, open = L.queue.filter(x => !L.st[x].learned);
    if (!open.length) { L.q = null; L.done = true; L.ended = now(); finishLearn(); return; }
    const play = open.slice(0, PLAY), cid = play.find(x => x !== L.lastCard) || play[0], c = cardById(cid), s = L.st[cid], kind = kindFor(s, c, play);
    L.asked++; L.justLearned = 0; L.lastCard = cid;
    if (kind === 'match') {
      const group = [cid, ...play.filter(x => x !== cid && L.st[x].streak === 0 && short(cardById(x)))].slice(0, 5);
      L.q = { type: 'match', ids: group, left: shuffle(group), right: shuffle(group), done: [], sel: null, wrong: null };
      return;
    }
    if (kind === 'type') { L.q = { type: 'type', kind, id: cid, typed: '', checked: false, ok: false }; return; }
    if (kind === 'tf') {
      const truth = Math.random() < .5, claim = truth ? answerOf(c) : distractors(c, 1)[0];
      L.q = { type: 'choice', kind, id: cid, claim, options: ['True', 'False'], right: truth ? 0 : 1, pick: null };
      return;
    }
    const options = shuffle([answerOf(c), ...distractors(c, 3)]);
    L.q = { type: 'choice', kind: c.kind === 'cloze' && learning.kinds.includes('blank') ? 'blank' : kind, id: cid, options, right: options.indexOf(answerOf(c)), pick: null };
  }
  function mark(cid, ok, kind) {
    const L = learning, s = L.st[cid];
    s.tries++;
    if (!s.seen) { s.seen = true; if (ok) L.firstRight++; }
    s.lastKind = kind;
    if (ok) { s.streak++; if (s.streak >= 2) { s.learned = true; L.justLearned++; } else later(cid, 3); }
    else { s.streak = 0; s.misses++; later(cid, 2); }
  }
  // Every card learned: the new ones start their reviews (Good, or Hard if they took misses).
  async function finishLearn() {
    const L = learning;
    if (L.graded) return;
    L.graded = true; saveLearn();
    for (const cid of L.ids) { const c = cardById(cid); if (c && c.srs.state === 'new') { try { await send('review.grade', { cardId: cid, rating: L.st[cid].misses ? 2 : 3 }); } catch { /* shown already */ } } }
  }
  // Spelling that's close enough counts: case, accents, a missing "the", and a typo or two in a longer word.
  const norm = x => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const lev = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };
  function closeEnough(typed, answer) {
    const t = norm(typed);
    if (!t) return false;
    const inParens = (String(answer).match(/\(([^)]*)\)/) || [])[1];
    const parts = [answer, ...String(answer).split(/[,;/]|\bor\b/), inParens].filter(Boolean).map(norm).filter(Boolean);
    return parts.some(p => p === t || lev(p, t) <= Math.max(p.length > 4 ? 1 : 0, Math.floor(p.length / 7)));
  }
  const learnDeckLabel = L => (L.set.startsWith('tag:') ? L.set.slice(4) : { new: 'New cards', hard: 'Hard cards', all: 'All cards' }[L.set]);
  function learnView() {
    if (!learnOk()) return null;
    const L = learning, total = L.ids.length, learned = L.ids.filter(x => L.st[x].learned).length;
    const base = { deckId: L.deckId, setName: learnDeckLabel(L), total, learned, learning: L.ids.filter(x => !L.st[x].learned && L.st[x].seen).length, justLearned: L.justLearned, n: L.asked };
    if (L.done) {
      const tries = L.ids.map(x => ({ c: cardById(x), n: L.st[x].tries })).filter(x => x.n > 2).sort((a, b) => b.n - a.n).slice(0, 3);
      return { ...base, done: true, minutes: Math.max(1, Math.round((L.ended - L.started) / MIN)), firstPct: Math.round(L.firstRight / total * 100),
        tries: tries.map(x => ({ front: learnText(x.c), back: answerOf(x.c), n: x.n + ' tries' })) };
    }
    const q = L.q;
    if (q.type === 'match') return { ...base, type: 'match', kind: KIND_NAME.match, left: q.left.map(id => ({ id, label: learnText(cardById(id)) })), right: q.right.map(id => ({ id, label: answerOf(cardById(id)) })), matched: q.done, sel: q.sel, wrong: q.wrong, all: q.done.length === q.ids.length };
    const c = cardById(q.id), s = L.st[q.id];
    const common = { ...base, id: q.id, text: learnText(c), image: c.kind === 'image' ? c.image : '', answer: answerOf(c), note: flat(c.note || ''), streak: s.streak, learnedNow: s.learned };
    if (q.type === 'type') return { ...common, type: 'type', kind: KIND_NAME.type, typed: q.typed, checked: q.checked, ok: q.ok };
    return { ...common, type: 'choice', kind: KIND_NAME[q.kind], claim: q.claim || '', options: q.options, right: q.right, pick: q.pick };
  }

  const act = {
    addDeck: async o => { const r = await send('deck.add', o); go('/deck/' + r.id); },
    // While you type a name it saves a moment after you stop.
    updateDeck: (id, patch, soft) => {
      // A direct change wins over typing that hasn't saved yet (type 45, then press + right away).
      if (!soft) { if (typing[id]) for (const k of Object.keys(patch)) delete typing[id][k]; return send('deck.update', { id, patch }); }
      const d = deckById(id); if (d) Object.assign(d, patch); changed();
      typing[id] = { ...(typing[id] || {}), ...patch };
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { const all = typing; typing = {}; for (const [k, p] of Object.entries(all)) send('deck.update', { id: k, patch: p }); }, 400);
    },
    deleteDeck: async id => { const d = deckById(id); if (!d || !confirm('Delete “' + d.name + '” and its ' + plural(cardsOf(id).length, 'card') + '? This can’t be undone.')) return; await send('deck.delete', { id }); go('/decks'); },
    exportDeck: id => {
      const d = deckById(id), q = x => '"' + String(x ?? '').replace(/"/g, '""') + '"';
      const rows = [['front', 'back', 'kind', 'text', 'note', 'tags'].join(',')].concat(cardsOf(id).map(c => [c.front, c.back, c.kind, c.text, c.note, c.tags.join(' ')].map(q).join(',')));
      download(d.name.replace(/[^\w\- ]+/g, '').trim() + '.csv', rows.join('\n'), 'text/csv');
    },
    pickCover: async id => { const url = await act.pickFile('image'); if (url) await send('deck.update', { id, patch: { cover: { image: url } } }); },
    saveCard: async (id, deckId, o, back) => { if (id) await send('card.update', { id, patch: { ...o, pending: false } }); else await send('card.add', { deckId, ...o }); go(back); },
    deleteCard: async (id, back) => { if (!confirm('Delete this card?')) return; await send('card.delete', { id }); go(back); },
    grade: async (cardId, rating) => {
      const c = S.cards.find(x => x.id === cardId); if (!c || !session) return;
      const entry = { cardId, rating, was: c.srs.state };
      session.graded.push(entry);
      entry.logId = (await send('review.grade', { cardId, rating })).logId;
      if (!queue(session.deckId, session.pile).length) go('/review/done');
    },
    pile: async (cardId, name) => {
      if (!session) return;
      const entry = { cardId, pile: name, was: 'pile' };
      session.graded.push(entry);
      entry.logId = (await send('review.grade', { cardId, pile: name })).logId;
      if (!queue(session.deckId, session.pile).length) go('/review/done');
    },
    addPile: (id, name) => { const d = deckById(id); if (d) send('deck.update', { id, patch: { piles: [...(d.piles || []), { name }] } }); },
    undo: async () => { const e = session && session.graded[session.graded.length - 1]; if (!e || !e.logId) return; session.graded.pop(); await send('review.undo', { logId: e.logId }); },
    setSettings: patch => send('settings.update', { patch }),
    setPerm: (id, on) => send('ai.perm', { id, on }),
    copy: text => navigator.clipboard && navigator.clipboard.writeText(text),
    pickFile: async kind => { const f = await choose(kind === 'audio' ? 'audio/*' : 'image/*'); return f ? upload(f) : null; },
    pickText: async () => { const f = await choose('.csv,.tsv,.txt,text/plain,text/csv'); return f ? f.text() : null; },
    record: () => {
      if (recorder) { recorder.stop(); return Promise.resolve(null); }
      return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => new Promise(ok => {
        const chunks = [], r = new MediaRecorder(stream);
        recorder = r;
        r.ondataavailable = e => chunks.push(e.data);
        r.onstop = async () => { stream.getTracks().forEach(x => x.stop()); recorder = null; ok(await upload(new Blob(chunks, { type: (r.mimeType || 'audio/webm').split(';')[0] }))); };
        r.start();
      })).catch(() => { alert('Your browser didn’t allow the microphone.'); return null; });
    },
    // lang (like "es") picks a voice that speaks the card's language.
    speak: (text, lang) => { text = R.plain(text, { join: ' ', math: 'show' }).trim(); if (!text || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (lang) u.lang = lang; speechSynthesis.speak(u); },
    play: url => { if (url) new Audio(url).play(); },
    importCards: async o => { const r = await send('data.import', o); go('/deck/' + r.deckId); },
    // Learn mode (see above).
    startLearn: (id, set, kinds) => {
      const cs = learnSet(id, set);
      if (!cs.length) return;
      const ids = shuffle(cs.map(c => c.id));
      learning = { v: 1, deckId: id, set, kinds: kinds.length ? kinds : ['mc'], ids, queue: ids.slice(), asked: 0, firstRight: 0, justLearned: 0, started: now(), q: null, done: false, graded: false,
        st: Object.fromEntries(ids.map(x => [x, { streak: 0, tries: 0, misses: 0, lastKind: null, learned: false, seen: false }])) };
      nextQuestion(); saveLearn(); go('/learn/' + id);
    },
    learnAnswer: j => { const q = learning && learning.q; if (!q || q.type !== 'choice' || q.pick != null) return; q.pick = j; mark(q.id, j === q.right, q.kind); saveLearn(); changed(); },
    learnPick: (side, cid) => {
      const q = learning && learning.q;
      if (!q || q.type !== 'match' || q.done.includes(cid)) return;
      if (side === 'left') { q.sel = cid; q.wrong = null; changed(); return; }
      if (q.sel == null) return;
      if (cid === q.sel) { q.done.push(cid); mark(cid, true, 'match'); q.sel = null; }
      else { const a = q.sel; mark(a, false, 'match'); q.wrong = [a, cid]; q.sel = null; setTimeout(() => { if (learning && learning.q === q) { q.wrong = null; changed(); } }, 700); }
      saveLearn(); changed();
    },
    learnType: typed => {
      const q = learning && learning.q;
      if (!q || q.type !== 'type' || q.checked || !String(typed || '').trim()) return;
      const s = learning.st[q.id];
      q.before = { streak: s.streak, seen: s.seen }; q.typed = String(typed); q.checked = true; q.ok = closeEnough(typed, answerOf(cardById(q.id)));
      mark(q.id, q.ok, 'type'); saveLearn(); changed();
    },
    // The spelling check missed it (another word for the same thing): count it as right after all.
    learnOverride: () => {
      const L = learning, q = L && L.q;
      if (!q || q.type !== 'type' || !q.checked || q.ok) return;
      const s = L.st[q.id];
      q.ok = true; s.misses = Math.max(0, s.misses - 1); s.streak = q.before.streak + 1;
      if (!q.before.seen) L.firstRight++;
      if (s.streak >= 2) { s.learned = true; L.justLearned++; }
      saveLearn(); changed();
    },
    learnNext: () => {
      const L = learning, q = L && L.q;
      if (!L || L.done || !q) return;
      if ((q.type === 'choice' && q.pick == null) || (q.type === 'type' && !q.checked) || (q.type === 'match' && q.done.length < q.ids.length)) return;
      nextQuestion(); saveLearn(); changed();
    },
    exportAll: () => download('lucida.json', JSON.stringify({ decks: S.decks, cards: S.cards, logs: S.logs }, null, 1), 'application/json'),
    resetAll: async () => { if (!confirm('Delete every deck, card, and review' + (S.me ? '' : ' on this computer') + '? This can’t be undone.')) return; await send('data.reset'); session = null; go('/'); },
    signOut: async () => { await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {}); toSignIn(); },
    // A new link for AI apps; the old one stops working (for a link that got out).
    newLink: () => send('ai.link'),
    go
  };

  return {
    mock: false, act,
    raw: () => S,
    chrome: () => {
      const due = S.decks.filter(d => !d.paused).reduce((n, d) => n + deckStat(d).due, 0);
      return { nav: { today: due ? String(due) : '' }, me: { bg: COLORS[S.settings.color] || COLORS[0], initial: (S.settings.name || 'You').trim()[0].toUpperCase() } };
    },
    settings: () => ({ ...S.settings, name: S.settings.name || (S.me && S.me.name) || 'You', sub: S.me ? S.me.email : 'Saved on this computer', signedIn: !!S.me,
      google: false, photo: 'color', check: !!S.ai.perms.check }),
    // Lucida Pro: online, from Stripe (the server's `me.plan`); on this computer everything is on.
    pro: () => !S.me || !!(S.me.plan && S.me.plan.pro),
    plan: () => (S.me ? { ...(S.me.plan || { pro: false }), manage: S.me.manage || '' } : null),
    tags: () => [...new Set([...S.decks.flatMap(d => d.tags), ...S.cards.flatMap(c => c.tags)])],
    decks: () => S.decks.map(deckRow),
    searchDecks: q => S.decks.filter(d => d.name.toLowerCase().includes(q) || d.tags.some(g => g.toLowerCase().includes(q))
      || cardsOf(d.id).some(c => (words(c) + ' ' + c.tags.join(' ')).toLowerCase().includes(q))).map(d => d.id),
    deck: id => {
      const d = deckById(id) || S.decks[0];
      if (!d) return { id: '', name: '', tags: [], seed: '', cover: { style: 'mix', round: 0, image: null }, paused: false, grading: S.settings.grading, fsrs: true, goal: 90, gapIdx: 3, steps: ['1m', '10m'], perDay: 20,
        total: 0, totalLabel: '0', due: 0, fresh: 0, ret: null, aiCount: 0, forecast: Array(7).fill(0), piles: [], href: '/decks', studyHref: '/review', settingsHref: '/decks', newCardHref: '/decks/new' };
      return { ...deckRow(d), cover: d.cover, grading: d.grading, fsrs: d.fsrs !== false, goal: d.goal, gapIdx: d.gapIdx ?? 3, steps: d.steps, perDay: d.perDay,
        forecast: forecast(7, [d]).vals, piles: (d.piles || []).map(p => ({ name: p.name, n: cardsOf(d.id).filter(c => c.pile === p.name).length })) };
    },
    cards: id => cardsOf(id).slice().reverse().map(c => ({ id: c.id, kind: KIND[c.kind], icon: ICON[c.kind], front: listFront(c), back: listBack(c), tags: c.tags, next: nextLabel(c),
      ai: byAI(c) ? c.source : '', href: '/deck/' + id + '/card/' + c.id })),
    card: id => { const c = S.cards.find(x => x.id === id); return c ? { ...c, clozeMode: c.cloze === -1 ? 'one' : 'each' } : null; },
    draft: type => ({ kind: { Basic: 'basic', Blank: 'cloze', Image: 'image', Audio: 'audio' }[type] || 'basic', front: '', back: '', text: '', note: '', tags: [], image: null, audio: null, speak: '', auto: true }),
    today: () => {
      const t = new Date(), live = S.decks.filter(d => !d.paused), sum = k => live.reduce((n, d) => n + deckStat(d)[k], 0);
      const due = sum('due'), fresh = sum('fresh'), { streak, best, days } = streaks(), monday = dayAt(t, -((t.getDay() + 6) % 7)), today = dayAt(t);
      return { date: DAYS[t.getDay()] + ', ' + MONTHS[t.getMonth()] + ' ' + t.getDate(), streak, best, due, minutes: Math.max(1, Math.round(due * 10 / 60)), fresh, next: nextDue(),
        week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => ({ d, done: days.has(dayAt(monday, i)), today: dayAt(monday, i) === today })),
        forecast: forecast(7, live), newCardHref: S.decks[0] ? '/deck/' + S.decks[0].id + '/card' : '/decks/new', studyHref: '/review' };
    },
    review: (id, pile) => {
      const key = keyOf(id, pile);
      if (!session || session.key !== key) session = { key, deckId: id || null, pile: pile || null, started: now(), graded: [] };
      const q = queue(id, pile), cur = q[0], done = session.graded.length;
      const counts = { new: q.filter(x => x.lane === 'new').length, learn: q.filter(x => x.lane === 'learn').length, rev: q.filter(x => x.lane === 'rev').length };
      const d = cur ? cur.deck : deckById(id) || S.decks[0] || { grading: 'four', piles: [] };
      const base = { deckId: d.id, done, left: q.length, total: done + q.length, counts, mode: d.grading, prog: S.settings.prog, piles: (d.piles || []).map(p => ({ name: p.name, n: cardsOf(d.id).filter(c => c.pile === p.name).length })) };
      if (!cur) return { ...base, empty: true, card: null, queue: 'rev', iv: { again: '', hard: '', good: '', easy: '' }, fsrsOn: false, editHref: '' };
      const c = cur.card, t = now(), pv = scheduled(d) ? preview(c.srs, t, { goal: d.goal / 100, maxDays: GAPS[d.gapIdx ?? 3], steps: d.steps }) : null;
      autoplay(c);
      return { ...base, empty: false, card: face(c), queue: cur.lane, fsrsOn: !!pv, editHref: '/deck/' + d.id + '/card/' + c.id + '?from=review',
        iv: pv ? { again: waitLabel(pv[1], t), hard: waitLabel(pv[2], t), good: waitLabel(pv[3], t), easy: waitLabel(pv[4], t) } : { again: '', hard: '', good: '', easy: '' } };
    },
    hasQueue: (id, pile) => queue(id, pile).length > 0,
    learn: learnView,
    learnSets: id => {
      const cs = cardsOf(id).filter(learnable), uses = {};
      cs.forEach(c => c.tags.forEach(g => { uses[g] = (uses[g] || 0) + 1; }));
      const tag = Object.keys(uses).sort((a, b) => uses[b] - uses[a])[0];
      return [['new', 'New', cs.filter(c => c.srs.state === 'new').length], ['hard', 'Hard', cs.filter(isHard).length], ...(tag ? [['tag:' + tag, tag, uses[tag]]] : []), ['all', 'All', cs.length]]
        .filter(([k, , n]) => n > 0 || k === 'all').map(([k, label, n]) => ({ id: k, label, n }));
    },
    learnOn: id => !!(learnOk() && learning.deckId === id && !learning.done),
    startReview: (id, pile) => { session = { key: keyOf(id, pile), deckId: id || null, pile: pile || null, started: now(), graded: [] }; },
    session: () => {
      const g = session ? session.graded : [], rated = g.filter(x => x.rating);
      const split = [1, 2, 3, 4].map(r => rated.filter(x => x.rating === r).length);
      const d = session && session.deckId ? deckById(session.deckId) : null, left = session ? queue(session.deckId, session.pile).length : 0, nx = nextDue();
      // Cards sorted into piles this session, pile by pile (the deck's piles, plus any others you used).
      const piled = g.filter(x => x.pile), names = d ? (d.piles || []).map(p => p.name) : [];
      piled.forEach(x => { if (!names.includes(x.pile)) names.push(x.pile); });
      return { pct: rated.length ? Math.round(rated.filter(x => x.rating > 1).length / rated.length * 100) : 100, goal: d ? d.goal : S.settings.goal,
        cards: g.length, minutes: session ? Math.max(1, Math.round((now() - session.started) / MIN)) : 0, fresh: g.filter(x => x.was === 'new').length, split,
        streak: streaks().streak, next: nx ? nx.short + ' · ' + nx.n : 'Nothing due',
        moreHref: left ? reviewHref(session.deckId, session.pile) : d ? '/deck/' + d.id + '/card' : '/decks', moreLabel: left ? 'Keep going · ' + left + ' left' : 'Add cards',
        // Each pile: how many cards went in this time, how many are in it now, and a link to go over it.
        sorted: piled.length, onlyPiles: piled.length > 0 && !rated.length,
        piles: names.map(name => ({ name, n: piled.filter(x => x.pile === name).length, total: (d ? cardsOf(d.id) : S.cards).filter(c => c.pile === name).length, href: reviewHref(session && session.deckId, name) })) };
    },
    hasReviews: () => S.logs.length > 0,
    stats: range => {
      const t = now(), logs = S.logs.filter(l => l.at >= t - { Week: 7, Month: 30, Year: 365 }[range] * DAY);
      const { streak, best } = streaks(), counts = {};
      S.logs.forEach(l => { const k = dayAt(l.at); counts[k] = (counts[k] || 0) + 1; });
      const monday = dayAt(t, -((new Date(t).getDay() + 6) % 7)), start = dayAt(monday, -37 * 7);
      // Study days: darker for busier days, compared with your busiest day.
      const vals = Array.from({ length: 38 * 7 }, (_, i) => counts[dayAt(start, i)] || 0), top = Math.max(1, ...vals);
      const heat = vals.map(v => (!v ? 0 : Math.min(4, 1 + Math.floor(3.999 * v / top))));
      return { streak, best, reviews: logs.length.toLocaleString('en-US'), cards: S.cards.length.toLocaleString('en-US'), ai: S.cards.filter(byAI).length,
        remembered: rememberedPct(logs), goal: S.settings.goal, heat, forecast: forecast(14, S.decks, true), byDeck: S.decks.map(d => ({ name: d.name, ret: deckStat(d).ret })) };
    },
    ai: () => {
      const names = Object.keys(S.ai.clients), has = n => names.includes(n);
      return { url: location.origin + (S.me && S.ai.key ? '/mcp/' + S.ai.key : '/mcp'), perms: S.ai.perms, connected: names.length ? names.join(', ') : 'None yet',
        clients: { claude: has('Claude'), openai: has('ChatGPT'), cursor: has('Cursor'), mcp: names.some(n => !['Claude', 'ChatGPT', 'Cursor'].includes(n)) } };
    },
    href: (kind, id) => ({ decks: '/decks', newDeck: '/decks/new', import: id ? '/deck/' + id + '/import' : '/decks/import', connect: '/connect', today: '/', done: '/review/done',
      review: id ? '/review/' + id : '/review', deck: '/deck/' + id })[kind] || '/'
  };
}
