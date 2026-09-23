// The web app's database: your real decks, cards, and reviews, saved on this computer by the local server
// (web/store.mjs). Every screen asks it the same questions the canvas's sample data answers (design/mock.mjs),
// so the same screens run on both: sample data on the canvas, your data here.
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

export async function createDb({ onChange, go }) {
  const get = async url => (await fetch(url, { cache: 'no-store' })).json();
  let S = await get('/api/state');
  let session = null; // the review in progress: { key, deckId, pile, started, graded: [{ cardId, rating, pile, was, logId }] }
  let memo = {};
  const changed = () => { memo = {}; onChange(); };
  const accept = next => { if (next && next.rev >= S.rev) { S = next; changed(); } };
  async function send(type, payload = {}) {
    const r = await fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, ...payload }) });
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
    exportAll: () => download('lucida.json', JSON.stringify({ decks: S.decks, cards: S.cards, logs: S.logs }, null, 1), 'application/json'),
    resetAll: async () => { if (!confirm('Delete every deck, card, and review on this computer? This can’t be undone.')) return; await send('data.reset'); session = null; go('/'); },
    go
  };

  return {
    mock: false, act,
    raw: () => S,
    chrome: () => {
      const due = S.decks.filter(d => !d.paused).reduce((n, d) => n + deckStat(d).due, 0);
      return { nav: { today: due ? String(due) : '' }, me: { bg: COLORS[S.settings.color] || COLORS[0], initial: (S.settings.name || 'You').trim()[0].toUpperCase() } };
    },
    settings: () => ({ ...S.settings, name: S.settings.name || 'You', sub: 'Saved on this computer', signedIn: false, google: false, photo: 'color', check: !!S.ai.perms.check }),
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
      return { url: location.origin + '/mcp', perms: S.ai.perms, connected: names.length ? names.join(', ') : 'None yet',
        clients: { claude: has('Claude'), openai: has('ChatGPT'), cursor: has('Cursor'), mcp: names.some(n => !['Claude', 'ChatGPT', 'Cursor'].includes(n)) } };
    },
    href: (kind, id) => ({ decks: '/decks', newDeck: '/decks/new', import: id ? '/deck/' + id + '/import' : '/decks/import', connect: '/connect', today: '/', done: '/review/done',
      review: id ? '/review/' + id : '/review', deck: '/deck/' + id })[kind] || '/'
  };
}
