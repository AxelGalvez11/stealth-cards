// The web app's database: your real decks, cards, and reviews, saved on this computer by the local server
// (web/store.mjs), or online in your own library once you sign in. Every screen asks it the same questions the
// canvas's sample data answers (design/mock.mjs), so the same screens run on both: sample data on the canvas,
// your data here.
import { preview, waitLabel, dayAt, W } from './fsrs.js';
import { scheduled, isDue, dueDay, examStatus, workload, isLeech, leechAt, leechAct, recallAt, GOAL, MAX_DAYS } from './sched.js';
import { insights, isGrade } from './insights.js';
import { histories, TUNE_MIN, TUNE_ITEMS } from './tune.js';
import R from './rich.js';
import { placeBefore, deckCards, cardBefore, cardToDeck } from './order.js';
import { createSound } from './sound.js';
import { sniff } from './sniff.js';
import { createNet } from './net.js';
import { createConnect } from './connect.js';
import { createLive } from './live.js';
import { createMake } from './make.js';
import { createDiagrams } from './diagrams.js';
import { loadTheme } from './themes/load.js';
import { schoolSearch } from './school.js';
import { sideView, readSide, writeSide, SIDE_KEY } from './side.js';

const DAY = 86400000, MIN = 60000, GAPS = [30, 90, 180, 365, 730, 1825, 3650];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLORS = ['linear-gradient(135deg, #8C9AFC 0%, #4F60E6 100%)', 'linear-gradient(135deg, #FFC857 0%, #EE5A36 100%)', 'linear-gradient(135deg, #7EE0B0 0%, #1F8F5F 100%)',
  'linear-gradient(135deg, #F9A8D4 0%, #D6336C 100%)', 'linear-gradient(135deg, #7DE3F0 0%, #0E8A9E 100%)', 'linear-gradient(135deg, #C4A7FF 0%, #7C3AED 100%)'];
const KIND = { basic: 'Basic', cloze: 'Fill in the blank', image: 'Image', audio: 'Audio' };
const ICON = { basic: 'text', cloze: 'blank', image: 'image', audio: 'audio' };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
// Cards your AI made. Cards from someone else's deck (studied or copied: they have an origin) are theirs, whoever made them.
const byAI = c => c.source && c.source !== 'you' && c.source !== 'import' && c.source !== 'shared' && !c.origin;
// A picture with parts hidden (image occlusion): each box is its own card, which asks one box. Null for other cards.
const occOf = c => {
  if (!c || c.kind !== 'image' || c.box == null || !Array.isArray(c.boxes)) return null;
  const i = c.boxes.findIndex(b => b.id === c.box);
  return i < 0 ? null : { boxes: c.boxes, i, n: i + 1, label: String(c.boxes[i].label || '').trim(), mode: c.occ === 'all' ? 'all' : 'one' };
};

// Playing Live on a phone (web/live.js): join a game with its code and a name, and tap answers. It needs no account.
const playerActs = (p, go) => ({ joinCode: v => p.setCode(v), joinName: v => p.setName(v), joinLive: () => p.join(), liveAnswer: i => p.answer(i), joinAgain: () => { p.reset(); go('/join'); } });
// Online, nobody is signed in yet: only the sign-in pages work, and Live's pages for players. The email waits in this
// tab while you get the code.
function signedOut(go, onChange = () => {}) {
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
  const next = localPath(q.get('next'));
  if (next) try { keep.setItem('lucida.next', next); } catch {}
  const auth = {
    email: () => email,
    error: () => off ? (off === 'apple' ? 'Apple' : 'Google') + ' sign-in isn’t set up yet. Use your email for now.' : q.get('failed') ? 'That didn’t work. Try again.' : '',
    sendCode: async e => { await post('/api/auth/code', { email: e }); email = e; try { keep.setItem('lucida.email', e); } catch {} },
    verify: code => post('/api/auth/verify', { email, code }),
    // A password instead of a code (Settings → Account → Password sets one). `remember` keeps the email typed so far while the
    // page switches between the two (each is its own address).
    password: (e, password) => post('/api/auth/password', { email: e, password }),
    remember: e => { email = e; try { keep.setItem('lucida.email', e); } catch {} },
    done: () => { try { keep.removeItem('lucida.email'); } catch {} location.assign(afterSignIn() || '/'); },
    go
  };
  // Signed out, the pages anyone can open (a shared deck, a profile, Discover) still work; anything that changes something
  // signs you in first and comes back.
  const net = createNet({ signedOut: true, go, changed: onChange });
  const live = createLive({ onChange, go, signedOut: true }).player;
  // The sidebar's rail (web/side.js) works for these pages too.
  let side = readSide();
  const toggleSide = () => { side = !side; writeSide(side); onChange(); };
  if (typeof addEventListener === 'function') addEventListener('storage', e => { if (e.key === SIDE_KEY) { side = readSide(); onChange(); } });
  return { signedOut: true, mock: false, ask: async () => false, say: () => {}, auth, net, schools: createSchools(onChange), settings: () => ({ look: 'system' }), me: () => null, decks: () => [], folders: () => [],
    chrome: () => ({ nav: { news: '', hasNews: false, ...sideView(side, toggleSide) }, me: { bg: COLORS[0], initial: '', color: true, photo: '', href: '/sign-in' } }),
    join: () => live.view(), joinAt: (kind, code) => live.at(kind, code), act: { go, ...playerActs(live, go) } };
}
// The school list (web/schools.json, about 4,000 colleges and universities): fetched the first time a picker searches it, and kept; the
// page draws again when it arrives. `find` gives the schools some typed words find (rows of [id, name, city, state, other names]).
function createSchools(changed) {
  let rows = null, asked = false;
  return { find: (q, limit = 30) => {
    // (If it doesn't come, the next try is ten seconds later.)
    if (!asked) { asked = true; fetch('/schools.json').then(r => r.json()).then(j => { rows = Array.isArray(j.rows) ? j.rows : []; changed(); }).catch(() => { setTimeout(() => { asked = false; }, 10000); }); }
    return rows ? schoolSearch(rows, q, limit) : [];
  } };
}
// A path on Lucida (like /pro?plan=yearly), or '' for anything else. A browser drops tabs and line breaks inside an address, so
// "/<tab>/evil.com" would mean "//evil.com", another site: those go first, and what's left must still be an address on this
// site (the same check the browser will make).
export function localPath(next) {
  const s = String(next || '').replace(/[\t\n\r]/g, '');
  if (!/^\/(?![\/\\])/.test(s)) return '';
  try { return new URL(s, location.origin).origin === location.origin ? s : ''; } catch { return ''; }
}
// The page to open once you're signed in, if signing in started somewhere (asked once, then forgotten).
export function afterSignIn() {
  let next = ''; try { next = sessionStorage.getItem('lucida.next') || ''; sessionStorage.removeItem('lucida.next'); } catch {}
  return localPath(next);
}
// A request that finds you signed out (your session ended) goes back to signing in. An AI app's request to connect
// (/oauth/…) comes back after, so it isn't lost. A page already on its way to signing in (Use another account) is left to it:
// the checks every few seconds see the sign-out too, and their plain /sign-in would forget where it was going.
const toSignIn = () => {
  if (globalThis.__lucidaLeaving) return;
  const at = location.pathname + location.search;
  location.assign(location.pathname.startsWith('/oauth/') ? '/sign-in?next=' + encodeURIComponent(at) : '/sign-in');
};

// The library (/api/state). With `sync`, decks you study from other people also take their owners' newest changes first
// (?sync=1), which asks the server for more. That must never keep the app from opening: if it fails or takes too long, the
// library comes without it (the app checks again every few seconds, so whatever the server finishes later still arrives).
const SYNC_WAIT = 8000;
async function readState(sync) {
  const ask = async (url, wait) => {
    const stop = new AbortController(), timer = wait ? setTimeout(() => stop.abort(), wait) : 0;
    try { const r = await fetch(url, { cache: 'no-store', signal: stop.signal }); return { status: r.status, data: r.ok ? await r.json() : null }; }
    finally { clearTimeout(timer); }
  };
  if (sync) { try { const r = await ask('/api/state?sync=1', SYNC_WAIT); if (r.data || r.status === 401) return r; } catch { /* too slow, or the connection dropped: without the sync, then */ } }
  return ask('/api/state', 0);
}

// `ask({ title, line, action, danger })` puts a question to the person in Lucida's own dialog and answers true or false, and `say('words')` shows
// a quiet message (web/ui.js, given by web/app.js): never the browser's confirm() and alert().
export async function createDb({ onChange, go, ask = async () => false, say = () => {} }) {
  const get = async url => { const r = await fetch(url, { cache: 'no-store' }); if (r.status === 401) { toSignIn(); throw new Error('Signed out'); } return r.json(); };
  // Opening the app also brings decks you study from other people up to date (their owners' newest changes).
  const first = await readState(true);
  if (first.status === 401) return signedOut(go, onChange);
  if (!first.data) throw new Error('Lucida couldn’t open your library. Try again in a minute.');
  let S = first.data;
  // Back from paying for Pro: Stripe's news can land a moment after you do, so ask again for a little while.
  if (new URLSearchParams(location.search).get('welcome') === 'pro' && S.me && !(S.me.plan && S.me.plan.pro)) {
    let tries = 0;
    const again = setInterval(async () => {
      try { const next = await get('/api/state'); if (next.me && next.me.plan && next.me.plan.pro) { clearInterval(again); S = { ...S, me: next.me }; changed(); } } catch {}
      if (++tries >= 15) clearInterval(again);
    }, 2000);
  }
  let session = null; // the review in progress: { key, deckId, pile, set, started, graded: [{ cardId, rating, pile, was, logId }] }
  // The card on screen in a review, and when it came up: how long you took to answer it goes with its grade.
  let shown = null;
  const shownFor = id => (shown && shown.id === id ? now() - shown.at : undefined);
  let memo = {};
  const changed = () => { memo = {}; onChange(); };
  // The sidebar's rail (web/side.js), kept on this device and shared with the other tabs of it.
  let side = readSide();
  const toggleSide = () => { side = !side; writeSide(side); changed(); };
  if (typeof addEventListener === 'function') addEventListener('storage', e => { if (e.key === SIDE_KEY) { side = readSide(); changed(); } });
  // Your theme (Pro, Settings › Theme): its key while it applies (you have Pro; on this computer everything is on), or ''
  // for Lucida's own look. Its code loads the first time a screen needs it (web/themes/load.js), and the screens draw
  // again once it's here; a theme you already use loads before the first page, so it doesn't flash in.
  // Pro: the server says (S.pro, false on Free or LUCIDA_PLAN=free), and online the person's plan.
  const isPro = () => S.pro !== false && (!S.me || !!(S.me.plan && S.me.plan.pro));
  const theme = () => (isPro() && S.settings.theme && S.settings.theme !== 'lucida' ? S.settings.theme : '');
  const skinNow = () => { const k = theme(), T = k && globalThis.LucidaThemes && globalThis.LucidaThemes[k]; if (k && !T) loadTheme(k, changed); return T || null; };
  if (theme()) await Promise.race([loadTheme(theme(), () => {}), new Promise(r => setTimeout(r, 600))]);
  // Changes shown before the server has them (see saveNow): each stays on top of any newer copy until it's saved.
  let mine = [], line = Promise.resolve();
  const accept = next => { if (next && next.rev >= S.rev) { S = next; mine.forEach(f => f(S)); changed(); } };
  // `keep`: the save still goes out if the page is closing (the cards screen saving as you leave).
  // `quiet`: for a page that shows the error itself (Suggestions, keeping or tossing your AI's cards): no message, and the
  // rejection's message is a plain sentence for the page to show.
  async function send(type, payload = {}, keep = false, quiet = false) {
    let r;
    try { r = await fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, ...payload }), keepalive: keep }); }
    catch (e) { throw quiet ? new Error('Couldn’t reach Lucida. Check your connection and try again.') : e; }
    if (r.status === 401) { toSignIn(); throw new Error('Signed out'); }
    const j = quiet ? await r.json().catch(() => ({})) : await r.json();
    if (!r.ok) { if (!quiet) say(j.error || 'Something went wrong.'); throw new Error(j.error || (quiet ? 'Something went wrong. Try again.' : '')); }
    accept(j.state);
    return j.result;
  }
  // Dragging shows its result right away and saves it after; if saving fails, the app goes back to what's saved.
  const saveMove = (type, payload) => send(type, payload).catch(async () => { try { S = await get('/api/state'); changed(); } catch { /* offline */ } });
  // Switches, settings, and a deck's options work the same way (the owner: "could you add toggle switch animation"; the
  // switch looked dead while the live site took up to a second to answer, then jumped): `local` makes the change here
  // at once, and the saves go out one at a time, in order. If one fails, the app goes back to what's saved; offline, it
  // takes the server's copy at the next check.
  const saveNow = (type, payload, local) => {
    mine.push(local); local(S); changed();
    const out = line.then(() => send(type, payload));
    line = out.catch(() => {});
    return out.finally(() => { mine = mine.filter(f => f !== local); }).catch(async () => {
      try { S = await get('/api/state'); mine.forEach(f => f(S)); changed(); } catch { S.rev = 0; }
    });
  };
  // The study network (web/net.js): shared decks, profiles, Discover, suggestions, History, news.
  const net = createNet({ accept, changed, go });
  const schools = createSchools(changed);
  // AI apps (web/connect.js): the apps that signed in to Lucida, the page where an app asks to connect, and the password.
  const connect = createConnect({ changed, go, question: ask, say });
  const handle = () => (S.profile && S.profile.handle) || '';
  // Live: hosting a game from this page, and playing one.
  const live = createLive({ onChange: () => changed(), go });
  const patchDeck = (id, patch) => s => { const d = s.decks.find(x => x.id === id); if (d) Object.assign(d, patch, patch.cover ? { cover: { ...d.cover, ...patch.cover } } : {}, patch.bg ? { bg: { kind: 'deck', image: null, ...d.bg, ...patch.bg } } : {}); };
  // Cards your AI adds over MCP show up without a reload.
  setInterval(async () => {
    if (document.hidden) return;
    try { const { rev } = await get('/api/rev'); if (rev > S.rev) accept(await get('/api/state')); } catch { /* the server is restarting */ }
  }, 2000);
  // Back after ten minutes or more away: decks you study from other people get their owners' newest changes.
  let away = 0;
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { away = Date.now(); return; }
    if (away && Date.now() - away > 10 * MIN) { away = 0; try { const r = await readState(true); if (r.status === 401) return toSignIn(); accept(r.data); net.drop(); changed(); } catch { /* offline */ } }
  });

  const now = () => Date.now();
  const deckById = id => S.decks.find(d => d.id === id);
  // A review of one deck or all of them; of one pile; or of a set of cards picked on the Stats page (`set`: 'hard',
  // 'leech', or 'tag:Organelles'), across decks.
  const keyOf = (id, pile, set) => (id || 'all') + (pile ? '|' + pile : '') + (set ? '#' + set : '');
  const reviewHref = (id, pile, set) => (id ? '/review/' + id : '/review') + (pile ? '?pile=' + encodeURIComponent(pile) : set ? '?set=' + encodeURIComponent(set) : '');
  const cardsOf = id => S.cards.filter(c => c.deckId === id);
  // Cards by id, and by the text or picture they were made from, until the next change (the cards screen looks up
  // every card of a deck each time you type).
  const cardIndex = () => memo.cards || (memo.cards = new Map(S.cards.map(c => [c.id, c])));
  const groupIndex = () => { if (memo.groups) return memo.groups; const m = memo.groups = new Map(); for (const c of S.cards) if (c.group) (m.get(c.group) || m.set(c.group, []).get(c.group)).push(c); return m; };
  const isLearn = c => c.srs.state === 'learning' || c.srs.state === 'relearning';
  // A card that can come up: not paused, and not an AI card waiting for your OK.
  const studyable = c => !c.pending && !c.paused;
  const seenToday = id => { const t0 = dayAt(now()); return new Set(S.logs.filter(l => l.deckId === id && l.at >= t0 && !l.kind).map(l => l.cardId)); };
  // Lucida Pro: online, from Stripe (the server's `me.plan`); on this computer everything is on (unless the server was
  // started with LUCIDA_PLAN=free, to check the Free app).
  // Your own FSRS parameters (Pro's Tune to you), when they're on.
  const wOf = () => { const t = S.settings.tune; return t && t.on && t.w && isPro() ? t.w : undefined; };
  const rememberedPct = logs => { const r = logs.filter(l => l.rating && l.was === 'review'); return r.length ? Math.round(r.filter(l => l.rating > 1).length / r.length * 100) : null; };

  function deckStat(d) {
    if (memo['s' + d.id]) return memo['s' + d.id];
    const t = now(), today = dayAt(t), all = cardsOf(d.id), cs = all.filter(c => !c.pending);
    const newToday = S.logs.filter(l => l.deckId === d.id && l.at >= today && l.was === 'new').length;
    let due = 0, overdue = 0, fresh = 0, next = Infinity;
    if (d.grading === 'piles') due = cs.filter(c => !c.pile && !c.paused).length;
    else if (!scheduled(d)) { const seen = seenToday(d.id); due = cs.filter(c => !seen.has(c.id) && !c.paused).length; }
    else {
      for (const c of cs) {
        if (c.srs.state === 'new' || c.paused) continue;
        if (isDue(c, d, t)) { due++; if (c.srs.state === 'review' && c.srs.due < today) overdue++; }
        // Before an exam a card can come up sooner than its own date (sched.js).
        else { const i = d.exam ? dueDay(c, d, t) : 0; next = Math.min(next, i ? dayAt(t, i) : c.srs.due); }
      }
      fresh = Math.max(0, Math.min(cs.filter(c => c.srs.state === 'new' && !c.paused).length, d.perDay - newToday));
    }
    const soon = due ? 0 : next < Infinity ? Math.max(1, Math.round((dayAt(next) - today) / DAY)) : null;
    return (memo['s' + d.id] = { due, overdue, fresh, soon, next, total: all.length, aiCount: all.filter(byAI).length,
      ret: rememberedPct(S.logs.filter(l => l.deckId === d.id && l.at >= t - 30 * DAY)), exam: examOf(d, cs) });
  }
  // A deck's exam, for its page and its settings: "Exam in 12 days · 84 cards to review first". Null without one,
  // and once the day has passed.
  const shortDay = iso => { const [y, m, dd] = iso.split('-').map(Number); return SHORT_MONTHS[m - 1] + ' ' + dd + (y !== new Date(now()).getFullYear() ? ', ' + y : ''); };
  function examOf(d, cs) {
    const x = d.exam && examStatus(cs, d, now());
    if (!x) return null;
    const when = x.days === 0 ? 'Exam today' : x.days === 1 ? 'Exam tomorrow' : 'Exam in ' + plural(x.days, 'day');
    return { ...x, day: shortDay(d.exam), when, line: when + (x.toReview ? ' · ' + plural(x.toReview, 'card') + ' to review first' : x.total - x.seen ? ' · ' + plural(x.total - x.seen, 'card') + ' not studied yet' : ' · all fresh') };
  }
  // Sharing, on a deck of yours: who can see it (Link only or Public) and its page. On a deck from someone else: whose it
  // is, whether you study it as it is (readOnly: its cards follow theirs) or made a copy, and the owner's changes waiting.
  // A public deck's page is at its owner's name and its own; every other deck's only at its lasting link, /d/<id> (the server
  // opens a Link only deck nowhere else, so that link is the one to share).
  const shareOf = d => {
    // (A deck someone put in a class before the app stopped showing classes is shared as 'class', web/classes.mjs: here it's private.)
    const sh = d.share && d.share.vis !== 'private' && d.share.vis !== 'class' ? { vis: d.share.vis, id: d.share.id, url: handle() && d.share.vis === 'public' ? '/@' + handle() + '/' + d.share.slug : '/d/' + d.share.id, label: d.share.vis === 'public' ? 'Public' : 'Link only' } : null;
    const k = d.link ? { mode: d.link.mode, gone: !!d.link.gone, id: d.link.id, owner: d.link.owner || { name: '', handle: '' }, url: d.link.vis === 'public' && d.link.owner && d.link.owner.handle ? '/@' + d.link.owner.handle + '/' + d.link.slug : '/d/' + d.link.id,
      pending: d.link.gone ? 0 : (d.link.pending || []).length, updates: !!d.link.updates } : null;
    return { shared: sh, link: k, readOnly: !!(k && k.mode === 'study' && !k.gone) };
  };
  // A card of a deck you study as it is: fixing it means suggesting the fix to its owner, on the deck's page.
  const suggestHref = (d, c) => shareOf(d).link.url + '?suggest=' + encodeURIComponent((c && c.origin) || '1');
  const deckRow = d => {
    const st = deckStat(d);
    return { id: d.id, name: d.name, tags: d.tags, seed: d.cover.seed || d.name, style: d.cover.style, round: d.cover.round, image: d.cover.image, paused: d.paused,
      folder: d.folder || null, bg: d.bg || { kind: 'deck', image: null },
      total: st.total, totalLabel: st.total.toLocaleString('en-US'), due: st.due, overdue: st.overdue, soon: st.soon, fresh: st.fresh, ret: st.ret, aiCount: st.aiCount, exam: st.exam,
      href: '/deck/' + d.id, studyHref: '/review/' + d.id, settingsHref: '/deck/' + d.id + '?settings=1', newCardHref: '/deck/' + d.id + '/card',
      // Whether it has a Guide (words, or extra pages) and Sources, for the deck page and the Library.
      hasGuide: !!(d.guide && ((d.guide.text || '').trim() || (d.guide.pages || []).length)), hasSources: !!(d.sources || []).length, hasDiagrams: (d.diagrams || []).length > 0, ...shareOf(d) };
  };

  // Days ahead: how many review cards come due each day (1 = tomorrow).
  function forecast(n, decks, long) {
    const t = now(), vals = Array(n).fill(0), ids = new Set(decks.map(d => d.id));
    for (const c of S.cards) {
      if (!ids.has(c.deckId) || !studyable(c) || c.srs.state === 'new' || c.srs.due <= t) continue;
      const i = dueDay(c, deckById(c.deckId), t);
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
  // What's up next for review: cards still learning first, then reviews (with any an exam brings up early), then
  // today's new cards. Paused cards never come up.
  // Going over one pile: the cards in it you haven't sorted again yet this time. A set from the Stats page: its cards you
  // haven't graded yet this time.
  function queue(id, pile, set) {
    const t = now(), decks = id ? [deckById(id)].filter(Boolean) : S.decks.filter(d => !d.paused);
    const done = () => new Set(session && session.key === keyOf(id, pile, set) ? session.graded.map(x => x.cardId) : []);
    if (pile) {
      const had = done();
      return decks.flatMap(d => cardsOf(d.id).filter(c => studyable(c) && c.pile === pile && !had.has(c.id)).map(c => ({ card: c, deck: d, lane: 'rev' })));
    }
    if (set) { const had = done(); return setCards(set).filter(c => !had.has(c.id)).map(c => ({ card: c, deck: deckById(c.deckId), lane: 'rev' })); }
    const learn = [], rev = [], fresh = [];
    for (const d of decks) {
      const cs = cardsOf(d.id).filter(studyable);
      if (d.grading === 'piles') { cs.filter(c => !c.pile).forEach(c => rev.push({ card: c, deck: d, lane: 'rev' })); continue; }
      if (!scheduled(d)) { const seen = seenToday(d.id); cs.filter(c => !seen.has(c.id)).forEach(c => rev.push({ card: c, deck: d, lane: 'rev' })); continue; }
      for (const c of cs) if (c.srs.state !== 'new' && isDue(c, d, t)) (isLearn(c) ? learn : rev).push({ card: c, deck: d, lane: isLearn(c) ? 'learn' : 'rev' });
      cs.filter(c => c.srs.state === 'new').slice(0, deckStat(d).fresh).forEach(c => fresh.push({ card: c, deck: d, lane: 'new' }));
    }
    const byDue = (a, b) => a.card.srs.due - b.card.srs.due;
    const q = [...learn.sort(byDue), ...rev.sort(byDue), ...fresh];
    if (q.length) return q;
    // Nothing due: a card still being learned can come up to 20 minutes early.
    return decks.filter(scheduled).flatMap(d => cardsOf(d.id).filter(c => studyable(c) && isLearn(c) && c.srs.due <= t + 20 * MIN).map(c => ({ card: c, deck: d, lane: 'learn' }))).sort(byDue).slice(0, 1);
  }
  // The cards of a set from the Stats page, least remembered first (up to 50 at a time): your hardest cards, the ones you
  // keep forgetting, or a tag's cards you've studied.
  function setCards(set) {
    const t = now(), by = c => recallAt(c, t) ?? 1;
    const pickOf = set === 'hard' ? c => c.srs.state !== 'new' && difficulty(c) === 'hard' : set === 'leech' ? c => isLeech(c, deckById(c.deckId)) : set.startsWith('tag:') ? c => c.srs.state !== 'new' && c.tags.includes(set.slice(4)) : () => false;
    return S.cards.filter(c => studyable(c) && deckById(c.deckId) && pickOf(c)).sort((a, b) => by(a) - by(b)).slice(0, 50);
  }
  const setName = set => (set === 'hard' ? 'Hardest cards' : set === 'leech' ? 'Cards you keep forgetting' : set && set.startsWith('tag:') ? set.slice(4) : '');
  // A card as review shows it. Text stays as written (see rich.js); the screen draws the formatting.
  // A fill-in-the-blank card asks one blank (cloze is its number) or all of them (-1).
  function face(c) {
    if (c.kind === 'cloze') {
      const bl = R.blanks(c.text), ask = c.cloze == null ? -1 : c.cloze;
      return { id: c.id, kind: 'cloze', text: c.text || '', cloze: ask, back: (ask < 0 ? bl : bl.slice(ask, ask + 1)).join(', '), note: c.note };
    }
    // A picture with boxes brings its boxes, which one it asks, and whether the others stay hidden.
    const o = occOf(c);
    return { id: c.id, kind: c.kind, front: c.front || (c.kind === 'audio' ? 'What do you hear?' : ''), back: o ? o.label : c.back, note: c.note, image: c.image, audio: c.audio, wave: c.wave || null, speak: c.speak, lang: c.lang || '',
      backLabel: c.back, backBig: c.back, backSub: c.note || '', ...(o ? { boxes: o.boxes, box: c.box, occ: o.mode } : {}) };
  }
  // AI explanations (Lucida's own AI, a few free a day on Free): asked for from a card once it's answered, and saved on
  // the card, so it's written once. `on`: the server has AI set up, or this card already has one.
  // Questions about the card (Explain's composer, design/chat.mjs): `chats` holds each card's conversation while its explanation is open
  // ([{ q, a, busy, error }], never saved), and `limit` is what shows in the composer's place once the day's explanations are used up (the
  // server's words: S.explainLimit, from /api/state and each answer).
  const explaining = {}, explainErr = {}, explainPro = {}, chats = {};
  let aiLeftToday = null;
  const explainOf = c => { if (!c) return { on: false }; const text = c.explain ? String(c.explain.text || '').replace(/\*\*/g, '') : '';
    return { on: !!S.aiOn || !!text, text, busy: !!explaining[c.id], error: explainErr[c.id] || '', goPro: !!explainPro[c.id],
      note: text && aiLeftToday != null ? (aiLeftToday === 1 ? '1 free explanation left today' : aiLeftToday + ' free explanations left today') : '',
      turns: chats[c.id] || [], limit: S.explainLimit || null }; };
  // Deck lists and search use the words without the formatting.
  const flat = md => R.plain(md, { join: ' ', math: 'show' });
  // A box's card: its prompt (or "What's under box 2?") and the box's label.
  const boxAsk = (c, o) => (flat(c.front) ? flat(c.front) + ' (box ' + o.n + ')' : 'What’s under box ' + o.n + '?');
  const listFront = c => { const o = occOf(c); return o ? boxAsk(c, o) : c.kind === 'cloze' ? R.plain(c.text, { cloze: true, blank: '____', join: ' ', math: 'show' }) : flat(c.front) || (c.kind === 'audio' ? flat(c.speak) || 'Audio card' : 'Image card'); };
  const listBack = c => { const o = occOf(c); return o ? o.label || '—' : c.kind === 'cloze' ? R.blanks(c.text, { math: 'show' }).join(', ') : flat(c.back); };
  // Search finds a formula by what it shows (π) or how it was typed (\pi).
  const words = c => [c.front, c.back, c.note, c.speak, (occOf(c) || {}).label].map(x => R.plain(x, { join: ' ' }) + ' ' + flat(x)).join(' ') + ' ' + R.plain(c.text, { cloze: true, join: ' ' }) + ' ' + R.plain(c.text, { cloze: true, join: ' ', math: 'show' });
  function nextLabel(c) {
    if (c.pending) return 'Waiting for you';
    if (c.paused) return 'Paused';
    if (c.srs.state === 'new') return 'New';
    const t = now();
    if (c.srs.due <= t) return 'Due now';
    if (isLearn(c)) return 'In ' + waitLabel(c.srs, t);
    const days = Math.round((dayAt(c.srs.due) - dayAt(t)) / DAY);
    return days <= 1 ? 'Tomorrow' : days < 60 ? 'In ' + days + ' days' : 'In ' + Math.round(days / 30.4) + ' months';
  }
  let spoken = null;
  const autoplay = c => { if (c.kind !== 'audio' || c.auto === false || spoken === c.id) return; spoken = c.id; setTimeout(() => sound.play({ audio: c.audio, speak: c.speak, lang: c.lang, wave: c.wave }, true), 350); };
  // The next day something comes up, and how many cards then (an exam can bring some up sooner than their own date).
  const nextDue = () => {
    const t = now(), ups = [];
    for (const c of S.cards) { const d = studyable(c) && c.srs.state !== 'new' && c.srs.due > t && deckById(c.deckId); if (d && !isDue(c, d, t)) ups.push(d.exam ? dayAt(t, dueDay(c, d, t)) : dayAt(c.srs.due)); }
    if (!ups.length) return null;
    const day = Math.min(...ups), n = ups.filter(x => x === day).length;
    const gap = Math.round((day - dayAt(t)) / DAY);
    return { day: gap === 0 ? 'later today' : gap === 1 ? 'tomorrow' : gap < 7 ? 'on ' + DAYS[new Date(day).getDay()] : 'in ' + gap + ' days', short: gap === 0 ? 'Later today' : gap === 1 ? 'Tomorrow' : gap < 7 ? DAYS[new Date(day).getDay()] : 'In ' + gap + ' days', n };
  };
  const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  // The file picker. Its input waits in the page until you pick (a phone can lose the answer of one that isn't).
  const choose = accept => new Promise(ok => {
    const i = document.createElement('input'), done = f => { i.remove(); ok(f); };
    i.type = 'file'; i.accept = accept; i.hidden = true;
    i.onchange = () => done(i.files[0] || null); i.addEventListener('cancel', () => done(null)); document.body.appendChild(i); i.click();
  });
  // Uploading a picture or sound. Online a request can't be over 4.5 MB (Vercel's limit), so a big picture is made
  // smaller here first (at most 2400 px across, or `side`), an iPhone photo (HEIC) becomes a JPEG where this browser can
  // open one, and a file still over 4 MB is turned away with a plain message instead of failing on the way.
  const LIMIT = 4 * 1024 * 1024, OVER = 'That file is over 4 MB. Try a smaller or shorter one.';
  const NOT = { image: 'That isn’t a picture Lucida can show (PNG, JPEG, GIF, or WebP).', audio: 'That isn’t a sound Lucida can play (MP3, M4A, WAV, OGG, or WebM).' };
  const HEIC = 'That’s an iPhone photo (HEIC), which this browser can’t open. Use a JPEG or PNG instead.';
  const toBlob = (c, type, q) => new Promise(ok => c.toBlob(ok, type, q));
  // A picture goes as it is when it's already small (a GIF keeps moving, a PNG its see-through parts), else it's drawn
  // again: a picture with see-through parts as a PNG (or a WebP when that's too big), anything else as a JPEG.
  async function picture(f, type, side) {
    const src = URL.createObjectURL(f), img = new Image();
    img.src = src;
    try { await img.decode(); } catch { return null; } finally { setTimeout(() => URL.revokeObjectURL(src), 0); }
    const w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, side / Math.max(w, h, 1)), same = /^image\/(png|jpeg|gif|webp)$/.test(type) && k === 1;
    if (same && f.size <= 2e6) return new Blob([f], { type });
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    g.drawImage(img, 0, 0, c.width, c.height);
    let clear = false;
    if (!/jpeg|heic/.test(type)) { const d = g.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length && !clear; i += 4) clear = d[i] < 255; }
    if (same && f.size <= LIMIT && (clear || type === 'image/gif')) return new Blob([f], { type });
    if (clear) {
      for (const [t, q] of [['image/png'], ['image/webp', .86]]) { const b = await toBlob(c, t, q); if (b && b.type === t && b.size <= LIMIT) return b; }
      g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
    }
    const b = await toBlob(c, 'image/jpeg', .86);
    return b && b.size > LIMIT ? toBlob(c, 'image/jpeg', .6) : b;
  }
  // What goes up: labeled by what the file really is (web/sniff.js), since a name can be wrong.
  async function fit(f, want, side) {
    const type = sniff(new Uint8Array(await f.slice(0, 16).arrayBuffer()));
    const heic = type === 'image/heic' || /^image\/hei[cf]$/.test(f.type) || /\.hei[cf]$/i.test(f.name || '');
    if ((heic ? 'image' : (type || f.type).split('/')[0]) !== want) { say(NOT[want]); return null; }
    if (want === 'image') { f = await picture(f, heic ? 'image/heic' : type, side || 2400); if (!f) { say(heic ? HEIC : NOT.image); return null; } }
    else if (!type) { say(NOT.audio); return null; }
    else f = new Blob([f], { type });
    if (f.size > LIMIT) { say(OVER); return null; }
    return f;
  }
  const upload = async (blob, want, side) => {
    let f = null, r = null;
    try { f = await fit(blob, want, side); } catch { say('Couldn’t read that file. Try another one.'); }
    if (!f) return null;
    try { r = await fetch('/api/media', { method: 'POST', headers: { 'content-type': f.type }, body: f }); } catch { say('Couldn’t reach Lucida. Check your connection and try again.'); return null; }
    if (r.status === 401) { toSignIn(); return null; }
    // An error from Vercel itself (like a file that's too big for it) is a page, not JSON.
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) { say(r.status === 413 ? OVER : j.error || 'That didn’t upload. Try again in a minute.'); return null; }
    return j.url;
  };
  let typing = {}, typingTimer = null;
  // Recording, playing, and the waveforms of sound (sound.js). A clip's shape measured on this device is saved with the
  // cards that play it, quietly (if that fails, it's measured again next time).
  const sound = createSound({ onChange: () => changed(), say, upload: b => upload(b, 'audio'), measured: (url, wave) => {
    for (const c of S.cards) {
      if (c.audio !== url || c.wave) continue;
      c.wave = wave;
      fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'card.update', id: c.id, patch: { wave } }) })
        .then(r => (r.ok ? r.json() : null)).then(j => j && accept(j.state)).catch(() => {});
    }
  }, known: url => (S.cards.find(c => c.audio === url && c.wave) || {}).wave });

  // Making cards from files, photos, recordings, videos, text and topics (web/make.js): the flow's memory and what it does. A picture sent to
  // be read is made smaller first (at most 1600 px across), like the ones on cards.
  const make = createMake({ state: () => S, reload: async () => { accept(await get('/api/state')); }, changed, go, sniff,
    shrink: async f => {
      const type = sniff(new Uint8Array(await f.slice(0, 16).arrayBuffer())) || f.type, heic = type === 'image/heic' || /^image\/hei[cf]$/.test(f.type) || /\.hei[cf]$/i.test(f.name || '');
      const b = await picture(f, heic ? 'image/heic' : type, 1600);
      return b ? new File([b], f.name || 'photo', { type: b.type }) : null;
    } });
  // A deck's Diagrams (web/diagrams.js): tables and mind maps made from its cards, the diagrams of its lectures, and pictures people upload. A picture goes up as big as 2400 px across
  // (the labels in a diagram have to stay readable), through the make flow's upload.
  const diagrams = createDiagrams({ state: () => S, reload: async () => { accept(await get('/api/state')); }, changed, go, choose, act: (type, payload) => send(type, payload, false, true),
    shrink: async f => {
      const type = sniff(new Uint8Array(await f.slice(0, 16).arrayBuffer())) || f.type, heic = type === 'image/heic' || /^image\/hei[cf]$/.test(f.type) || /\.hei[cf]$/i.test(f.name || '');
      if (!heic && !/^image\/(png|jpeg|gif|webp)$/.test(type)) return null;
      const b = await picture(f, heic ? 'image/heic' : type, 2400);
      return b ? new File([b], f.name || 'picture', { type: b.type }) : null;
    } });
  // A deck's Guide (like a README) and its Sources (what its cards were made from). The Guide saves as it is typed (a moment after the last
  // key), one save at a time and in order; what the screen shows meanwhile is the typing, kept by the screen itself.
  const guideOf = d => d.guide || { text: '', at: 0, pages: [] };
  const fileHref = x => (x.files && x.files[0] ? '/media/' + x.files[0].name : '');
  const sourceRow = x => ({ id: x.id, kind: x.kind, name: x.name, cards: x.cards || 0, at: x.at || 0, url: x.url || '', text: x.text || '', textName: x.textFile ? x.textFile.name : '', seconds: x.seconds || 0, pages: x.pages || 0,
    files: (x.files || []).map(f => ({ name: f.name, href: '/media/' + f.name, type: f.type, size: f.size, file: f.file || '', seconds: f.seconds || 0 })), href: fileHref(x) });
  let sourceTexts = {};
  const guideSaves = {};

  // ---------- Learn mode ----------
  // Learn a set of cards until you know every one. Each card is asked in different ways: pick from a few answers, true
  // or false, match it with others, fill in its blank, or type it. It's learned after two right answers in a row, asked
  // two ways, and a card you miss comes back a few questions later. Up to 7 cards are in play at a time. The session
  // keeps itself on this device, so you can stop and pick up later; when every card is learned, the ones that were new
  // get their first review, so spaced repetition takes over.
  const LEARN_KEY = 'lucida.learn', PLAY = 7, KIND_NAME = { mc: 'Multiple choice', tf: 'True or false', blank: 'Fill in the blank', match: 'Matching', type: 'Type the answer' };
  const cardById = id => S.cards.find(c => c.id === id);
  // A box's card asks what's under its box (the picture shows the box); a box with no label has no answer to check,
  // so Learn leaves it out.
  const learnText = c => { const o = occOf(c); return (o ? flat(c.front) || 'What’s under box ' + o.n + '?' : c.kind === 'cloze' ? R.plain(c.text, { cloze: true, blank: '____', join: ' ', math: 'show' }) : flat(c.front)).trim(); };
  const answerOf = c => { const o = occOf(c); return (o ? o.label : c.kind === 'cloze' ? R.blanks(c.text, { math: 'show' }).join(', ') : flat(c.back)).trim(); };
  const learnable = c => studyable(c) && c.kind !== 'audio' && !!answerOf(c) && (c.kind === 'image' ? !!c.image : !!learnText(c));
  const isHard = c => (c.srs.lapses || 0) > 0 || c.srs.state === 'relearning' || (c.srs.state === 'review' && (c.srs.d || 0) >= 7);
  // How hard a card is for you (the Library's filter): new (never studied), easy, medium, or hard (the "hard" Learn mode
  // uses). Spaced repetition knows each card's difficulty; decks without it go by the card's last answer, and piles by
  // which pile the card is in (the first pile is easy, the last is hard).
  const lastAnswer = id => { if (!memo.last) { memo.last = {}; for (const l of S.logs) if (l.rating) memo.last[l.cardId] = l.rating; } return memo.last[id]; };
  const difficulty = c => {
    const d = deckById(c.deckId) || {};
    if (d.grading === 'piles') { const P = (d.piles || []).map(p => p.name), i = P.indexOf(c.pile); return i < 0 ? 'new' : i === 0 ? 'easy' : i === P.length - 1 ? 'hard' : 'medium'; }
    if (c.srs.state === 'new' && !c.srs.reps) return 'new';
    if (isHard(c) || (c.srs.d || 0) >= 7) return 'hard';
    if (c.srs.d) return c.srs.d <= 4 ? 'easy' : 'medium';
    const r = lastAnswer(c.id);
    return !r ? 'new' : r === 1 ? 'hard' : r === 2 ? 'medium' : 'easy';
  };
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
  // A box of a picture gets the picture's other labels first.
  // A deck's cards that can be asked (until the next change), with their answers.
  const learnIn = id => memo['l' + id] || (memo['l' + id] = cardsOf(id).filter(learnable).map(c => ({ c, a: answerOf(c) })));
  function distractors(c, n) {
    const right = answerOf(c).toLowerCase(), deck = learnIn(c.deckId).filter(x => x.c.id !== c.id), same = deck.filter(x => x.c.kind === c.kind);
    const o = occOf(c), near = o ? [...new Set(o.boxes.map(b => String(b.label || '').trim()))].filter(a => a && a.toLowerCase() !== right) : [];
    let pool = [...new Set((same.length > n ? same : deck).map(x => x.a))].filter(a => a && a.toLowerCase() !== right && !near.includes(a));
    pool.sort((a, b) => Math.abs(a.length - right.length) - Math.abs(b.length - right.length));
    return [...shuffle(near), ...shuffle(pool.slice(0, n * 2))].slice(0, n);
  }
  const short = c => c.kind !== 'image' && learnText(c).length <= 70 && answerOf(c).length <= 60;
  // Which kind of question a card gets: a choice first; once it's right, typing it (or another kind of choice).
  function kindFor(s, c, play) {
    const on = k => learning.kinds.includes(k), fits = {
      mc: distractors(c, 3).length >= 1 || aiQuiz(c, 'choice').length > 0, tf: distractors(c, 1).length >= 1 || aiQuiz(c, 'true_false').length > 0, blank: (c.kind === 'cloze' && distractors(c, 3).length >= 1) || aiQuiz(c, 'blank').length > 0,
      match: short(c) && play.filter(x => learning.st[x].streak === 0 && short(cardById(x))).length >= 4, type: answerOf(c).length <= 40 };
    const pickFrom = ks => ks.filter(k => on(k) && fits[k]);
    const choice = pickFrom(['mc', 'tf', 'blank', 'match']), recall = pickFrom(['type']);
    if (s.streak === 1) { const r = recall.length ? recall : choice.filter(k => k !== s.lastKind); if (r.length) return oneOf(r); }
    return oneOf(choice.length ? choice : recall.length ? recall : ['mc']);
  }
  // Questions written for a card (the learner's AI app over MCP, add_quiz, or Lucida's own AI, below), of one kind.
  const aiQuiz = (c, kind) => (c.quiz || []).filter(x => x.kind === kind);
  // Lucida's own questions (quizai.mjs, POST /api/quiz): when the cards coming up in Learn mode have no question yet, up to 20 are written at once
  // and saved on the cards, where Learn mode finds them. Nobody waits: until they arrive the question builders ask as
  // always, and when the AI is off or the day's batches are used up nothing is asked and nothing is shown. About 5 questions from the end of
  // the ones written, the next 20 are asked for.
  let quizBusy = false, quizOff = false, quizRetryAt = 0;
  const hasQuiz = c => (c.quiz || []).length > 0;
  function wantQuiz() {
    const L = learning;
    if (!S.aiOn || S.quizLeft === 0 || quizOff || quizBusy || !L || L.done || now() < quizRetryAt || !L.kinds.some(k => k === 'mc' || k === 'tf' || k === 'blank')) return;
    const open = L.queue.filter(x => !L.st[x].learned).map(cardById).filter(Boolean);
    let ahead = 0;
    for (const c of open) { if (hasQuiz(c)) ahead++; else if (!c.quizTried) break; }
    if (ahead > 5) return;
    const want = open.filter(c => !hasQuiz(c) && !c.quizTried && (c.kind === 'basic' || c.kind === 'cloze')).slice(0, 20);
    if (!want.length) return;
    quizBusy = true;
    fetch('/api/quiz', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cardIds: want.map(c => c.id) }) })
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (r.ok) {
          if (typeof j.left === 'number') S.quizLeft = j.left;
          for (const [id, list] of Object.entries(j.questions || {})) { const c = cardById(id); if (c && !hasQuiz(c)) c.quiz = list; }
          for (const id of j.tried || []) { const c = cardById(id); if (c && !hasQuiz(c)) c.quizTried = now(); }
        } else if (r.status === 402 || r.status === 503) quizOff = true;
        else quizRetryAt = now() + 60000;
      })
      .catch(() => { quizRetryAt = now() + 60000; })
      .finally(() => { quizBusy = false; });
  }
  // Moves a card a few places later among the cards still to learn, so something else comes first.
  function later(cid, k) {
    const q = learning.queue; q.splice(q.indexOf(cid), 1);
    const open = q.filter(x => !learning.st[x].learned), after = open[Math.min(k, open.length) - 1];
    q.splice(after ? q.indexOf(after) + 1 : q.length, 0, cid);
  }
  // Sends the answers given since the last question (see mark).
  function sendAnswers() {
    const L = learning, list = (L && L.answers) || [];
    if (!list.length) return;
    L.answers = [];
    for (const x of list) send('learn.log', x).catch(() => {});
  }
  function nextQuestion() {
    sendAnswers(); wantQuiz();
    const L = learning, open = L.queue.filter(x => !L.st[x].learned);
    L.qAt = now();
    if (!open.length) { L.q = null; L.done = true; L.ended = now(); finishLearn(); return; }
    const play = open.slice(0, PLAY), cid = play.find(x => x !== L.lastCard) || play[0], c = cardById(cid), s = L.st[cid], kind = kindFor(s, c, play);
    L.asked++; L.justLearned = 0; L.lastCard = cid;
    if (kind === 'match') {
      const group = [cid, ...play.filter(x => x !== cid && L.st[x].streak === 0 && short(cardById(x)))].slice(0, 5);
      L.q = { type: 'match', ids: group, left: shuffle(group), right: shuffle(group), done: [], sel: null, wrong: null };
      return;
    }
    if (kind === 'type') { L.q = { type: 'type', kind, id: cid, typed: '', checked: false, ok: false }; return; }
    L.q = choiceQuestion(c, kind, learning.kinds.includes('blank'));
  }
  // A choice question for a card (multiple choice or true or false): an AI-written one when the card has one of this kind (most of
  // the time; now and then the card's own words), else the card's words with other cards' answers. A fill-in-the-blank card is a
  // "blank" question when `blank` is on.
  function choiceQuestion(c, kind, blank) {
    const cid = c.id, ai = kind === 'tf' ? aiQuiz(c, 'true_false') : kind === 'mc' ? aiQuiz(c, 'choice') : kind === 'blank' ? aiQuiz(c, 'blank') : [];
    // (A blank that isn't a fill-in-the-blank card exists only as the written question, so that is always the one asked.)
    if (ai.length && (Math.random() < .8 || !distractors(c, 1).length || (kind === 'blank' && c.kind !== 'cloze'))) {
      const x = oneOf(ai);
      if (kind === 'tf') return { type: 'choice', kind, id: cid, text: 'True or false?', claim: x.question, options: ['True', 'False'], right: x.answer === 'true' ? 0 : 1, pick: null, why: x.why, ai: true };
      const options = shuffle([x.answer, ...x.wrong]);
      return { type: 'choice', kind, id: cid, text: x.question, options, right: options.indexOf(x.answer), pick: null, why: x.why, ai: true };
    }
    if (kind === 'tf') {
      const truth = Math.random() < .5, claim = truth ? answerOf(c) : distractors(c, 1)[0];
      return { type: 'choice', kind, id: cid, claim, options: ['True', 'False'], right: truth ? 0 : 1, pick: null };
    }
    const options = shuffle([answerOf(c), ...distractors(c, 3)]);
    return { type: 'choice', kind: c.kind === 'cloze' && blank ? 'blank' : kind, id: cid, options, right: options.indexOf(answerOf(c)), pick: null };
  }
  function mark(cid, ok, kind) {
    const L = learning, s = L.st[cid], t = now();
    // Each answer is saved for the stats (right or wrong, the kind of question, and how long it took), once you move on.
    (L.answers || (L.answers = [])).push({ cardId: cid, q: kind, ok, ms: t - Math.max(L.qAt || t, L.markAt || 0) });
    L.markAt = t;
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
  // ---------- Live ----------
  // A card plays live when it can make a fair question: it has an answer, and there are wrong answers to go with it
  // (other cards' answers, or ones the learner's AI wrote). Sound cards don't play (a room can't all hear one phone).
  // The deck's different answers are counted once, since setting up asks about every card.
  const answersIn = id => memo['a' + id] || (memo['a' + id] = new Set(cardsOf(id).filter(learnable).map(c => answerOf(c).toLowerCase())));
  const liveable = c => learnable(c) && (aiQuiz(c, 'choice').length > 0 || aiQuiz(c, 'true_false').length > 0 || answersIn(c.deckId).size > 1);
  // One question per card: most of the time the AI's own question when the card has one, else the card's words with up
  // to three other answers from the deck. A picture shows on the big screen, with its box.
  function liveQuestion(c) {
    const o = occOf(c), pic = c.kind === 'image' && c.image ? { image: c.image, occ: o ? { boxes: o.boxes, ask: o.i, mode: o.mode } : null } : { image: '', occ: null };
    const ai = aiQuiz(c, 'choice'), tf = aiQuiz(c, 'true_false'), own = distractors(c, 3);
    if (ai.length && (Math.random() < .8 || !own.length)) { const x = oneOf(ai), options = shuffle([x.answer, ...x.wrong.slice(0, 3)]); return { text: x.question, options, right: options.indexOf(x.answer), ...pic }; }
    if (!own.length && tf.length) { const x = oneOf(tf); return { text: x.question, options: ['True', 'False'], right: x.answer === 'true' ? 0 : 1, ...pic }; }
    const options = shuffle([answerOf(c), ...own]);
    // A box says which box it asks, since phones don't show the picture.
    return { text: o ? boxAsk(c, o) : learnText(c) || 'What’s in the picture?', options, right: options.indexOf(answerOf(c)), ...pic };
  }
  const liveQuestions = (id, set, count) => shuffle(learnSet(id, set).filter(liveable)).slice(0, count).map(liveQuestion);
  // Live from a topic: the questions are written first (make.quiz), then the room opens like any other. `word` says what's happening in
  // the setup window meanwhile, `error` what went wrong, `saving` that "Save as a deck" is working. `liveRun` tells an old try from a new one.
  const liveTopic = { busy: false, word: '', error: '', saving: false };
  let liveRun = 0;
  // A topic's question as the game plays it: its four answers in a new order and where the right one landed. `why` stays for saving.
  const topicQuestion = c => { const x = c.quiz || {}, options = shuffle([x.answer, ...(x.wrong || [])]); return { text: x.question, options, right: options.indexOf(x.answer), image: '', occ: null, why: x.why || '' }; };
  // Play again with the same questions of a topic: in a new order, with each one's answers in a new order too.
  const topicAgain = qs => shuffle(qs.map(q => { const a = q.options[q.right], options = shuffle(q.options); return { ...q, options, right: options.indexOf(a) }; }));
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
    const o = occOf(c);
    const common = { ...base, id: q.id, text: learnText(c), image: c.kind === 'image' ? c.image : '', answer: answerOf(c), note: flat(c.note || ''), streak: s.streak, learnedNow: s.learned, ex: explainOf(c),
      occ: o ? { boxes: o.boxes, ask: o.i, mode: o.mode } : null };
    if (q.type === 'type') return { ...common, type: 'type', kind: KIND_NAME.type, typed: q.typed, checked: q.checked, ok: q.ok };
    return { ...common, text: q.text || common.text, cardText: common.text, type: 'choice', kind: KIND_NAME[q.kind], claim: q.claim || '', options: q.options, right: q.right, pick: q.pick,
      why: q.why || '', aiAnswer: q.ai ? q.options[q.right] : '' };
  }

  // Your profile picture: what you picked in Settings (your Google photo, your own photo, or your color), and until you
  // pick, the Google photo if you signed in with Google (the owner: "the user profile should show their google account
  // profile pic or allow user to change the profile pic image with upload").
  const photoOf = () => {
    const g = !!(S.me && S.me.picture), p = S.settings.photo;
    return p === 'google' && g ? 'google' : p === 'yours' && S.settings.yourPhoto ? 'yours' : p === 'color' || !g ? 'color' : 'google';
  };
  // Tune to you in progress ({ p: 0 to 1 }), and what went wrong the last time, if anything.
  let tuning = null, tuneError = '';
  const act = {
    addDeck: async o => { const r = await send('deck.add', o); go('/deck/' + r.id); },
    // While you type a name it saves a moment after you stop.
    updateDeck: (id, patch, soft) => {
      // A direct change wins over typing that hasn't saved yet (type 45, then press + right away).
      if (!soft) { if (typing[id]) for (const k of Object.keys(patch)) delete typing[id][k]; return saveNow('deck.update', { id, patch }, patchDeck(id, patch)); }
      const d = deckById(id); if (d) Object.assign(d, patch); changed();
      typing[id] = { ...(typing[id] || {}), ...patch };
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { const all = typing; typing = {}; for (const [k, p] of Object.entries(all)) send('deck.update', { id: k, patch: p }); }, 400);
    },
    deleteDeck: async id => { const d = deckById(id); if (!d) return;
      const n = cardsOf(id).length, q = d.link && !d.link.gone ? { title: 'Remove “' + d.name + '” from your library?', line: 'Your progress on it goes too.', action: 'Remove' }
        : { title: 'Delete “' + d.name + '”?', line: n ? (n === 1 ? 'Its card goes too. ' : 'Its ' + n + ' cards go too. ') + 'This can’t be undone.' : 'This can’t be undone.', action: 'Delete deck' };
      if (!(await ask({ ...q, danger: true }))) return; await send('deck.delete', { id }); go('/library'); },
    // Folders: make one (optionally putting a deck in it), rename one, or remove one (its decks go back to the library).
    newFolder: async (name, deckId) => { const r = await send('folder.add', { name }); if (deckId) await send('deck.update', { id: deckId, patch: { folder: r.id } }); return r.id; },
    renameFolder: (id, name) => send('folder.update', { id, patch: { name } }),
    deleteFolder: async id => { const f = S.folders.find(x => x.id === id); if (!f || !(await ask({ title: 'Remove the folder “' + f.name + '”?', line: 'Its decks stay in your library.', action: 'Remove folder', danger: true }))) return; await send('folder.delete', { id }); go('/library'); },
    // Into a folder (or out, with none): it goes last there. Dragging also puts a deck before another (or last).
    moveDeck: (id, folder) => { const d = deckById(id); if (!d || (d.folder || null) === (folder || null)) return; d.folder = folder || null; placeBefore(S.decks, d, null); changed(); return saveMove('deck.move', { id, folder: folder || null, before: null }); },
    reorderDeck: (id, before) => { const d = deckById(id); if (!d) return; placeBefore(S.decks, d, before ? deckById(before) : null); changed(); return saveMove('deck.move', { id, before: before || null }); },
    // A card dragged on its deck's page, or onto another deck.
    reorderCard: (id, before) => { const c = S.cards.find(x => x.id === id), d = c && deckById(c.deckId); if (!d) return; cardBefore(d, S.cards, c, before || null); changed(); return saveMove('card.move', { id, before: before || null }); },
    moveCard: (id, deckId) => { const c = S.cards.find(x => x.id === id); if (!c || !deckById(deckId) || c.deckId === deckId) return; cardToDeck(S, c, deckId); changed(); return saveMove('card.move', { id, deckId }); },
    // What Learn mode, flashcards, and Live show behind a deck; a photo is uploaded here. A pick is `chosen`; `chosen: false`
    // puts the deck back to the default (a plain page, or the theme's own: a theme's tile).
    setBg: (id, kind, chosen = true) => act.updateDeck(id, { bg: { kind, chosen } }),
    pickBg: async id => { const url = await act.pickFile('image'); if (url) await send('deck.update', { id, patch: { bg: { kind: 'photo', image: url, chosen: true } } }); },
    exportDeck: id => {
      const d = deckById(id), q = x => '"' + String(x ?? '').replace(/"/g, '""') + '"';
      const rows = [['front', 'back', 'kind', 'text', 'note', 'tags'].join(',')].concat(cardsOf(id).map(c => [c.front, occOf(c) ? occOf(c).label : c.back, c.kind, c.text, c.note, c.tags.join(' ')].map(q).join(',')));
      download(d.name.replace(/[^\w\- ]+/g, '').trim() + '.csv', rows.join('\n'), 'text/csv');
    },
    pickCover: async id => { const url = await act.pickFile('image'); if (url) await send('deck.update', { id, patch: { cover: { image: url } } }); },
    saveCard: async (id, deckId, o, back) => { if (id) await send('card.update', { id, patch: { ...o, pending: false } }); else await send('card.add', { deckId, ...o }); go(back); },
    deleteCard: async (id, back) => { if (!(await ask({ title: 'Delete this card?', action: 'Delete card', danger: true }))) return; await send('card.delete', { id }); go(back); },
    // The cards screen (a deck's cards down the left, the one you pick on the right) saves as you type: one save at a
    // time, in order (`leaving`: the page is closing, so it goes out now). Adding and deleting stay on the screen.
    updateCard: (id, patch, leaving) => {
      if (leaving) return send('card.update', { id, patch: { ...patch, pending: false } }, true);
      const out = line.then(() => send('card.update', { id, patch: { ...patch, pending: false } }));
      line = out.catch(() => {});
      return out;
    },
    addCard: (deckId, o) => send('card.add', { deckId, ...o }),
    removeCards: ids => send('card.delete', { ids }),
    // Cards your AI made that wait for you (Suggestions): keep them (they join the deck) or toss them, a few at once. If it
    // fails, the page says so where you are, not in an alert.
    keepCards: ids => send('card.keep', { ids }, false, true),
    tossCards: ids => send('card.delete', { ids }, false, true),
    grade: async (cardId, rating) => {
      const c = S.cards.find(x => x.id === cardId); if (!c || !session) return;
      const entry = { cardId, rating, was: c.srs.state };
      session.graded.push(entry);
      entry.logId = (await send('review.grade', { cardId, rating, ms: shownFor(cardId) })).logId;
      if (!queue(session.deckId, session.pile, session.set).length) go('/review/done');
    },
    pile: async (cardId, name) => {
      if (!session) return;
      const entry = { cardId, pile: name, was: 'pile' };
      session.graded.push(entry);
      entry.logId = (await send('review.grade', { cardId, pile: name, ms: shownFor(cardId) })).logId;
      if (!queue(session.deckId, session.pile, session.set).length) go('/review/done');
    },
    addPile: (id, name) => { const d = deckById(id); if (d) act.updateDeck(id, { piles: [...(d.piles || []), { name }] }); },
    undo: async () => { const e = session && session.graded[session.graded.length - 1]; if (!e || !e.logId) return; session.graded.pop(); await send('review.undo', { logId: e.logId }); },
    setSettings: patch => saveNow('settings.update', { patch }, s => { Object.assign(s.settings, patch); }),
    // Your profile picture: a photo you upload (kept small, since it only ever shows small), or back to the one before.
    pickPhoto: async () => { const url = await act.pickFile('image', 512); if (url) await act.setSettings({ photo: 'yours', yourPhoto: url }); },
    removePhoto: () => act.setSettings({ photo: '', yourPhoto: null }),
    setPerm: (id, on) => saveNow('ai.perm', { id, on }, s => { if (id in s.ai.perms) s.ai.perms[id] = !!on; }),
    copy: text => navigator.clipboard && navigator.clipboard.writeText(text),
    pickFile: async (kind, side) => { const f = await choose(kind === 'audio' ? 'audio/*' : 'image/*'); return f ? upload(f, kind === 'audio' ? 'audio' : 'image', side) : null; },
    pickText: async () => { const f = await choose('.csv,.tsv,.txt,text/plain,text/csv'); return f ? f.text() : null; },
    chooseText: () => choose('.csv,.tsv,.txt,text/plain,text/csv'),
    // Sound (sound.js). record() starts recording and gives back { url, wave } once it's stopped (a second call stops it).
    record: () => sound.record(),
    stopRecording: discard => sound.stopRecording(discard),
    // A sound file over the limit is turned away before it's measured.
    pickSound: () => sound.pick(accept => choose(accept).then(f => (f && f.size > LIMIT ? (say(OVER), null) : f))),
    // A clip is a card's sound: { audio, wave } for a file, or { speak, lang } for words the device reads aloud (lang, like
    // "es", picks a voice that speaks the card's language). playSound plays it, or pauses it if it's playing.
    playSound: c => sound.play(c),
    seekSound: (c, f, dragging) => sound.seek(c, f, dragging),
    watchSound: (el, key, fn) => sound.watch(el, key, fn),
    watchMic: (el, fn) => sound.watchMic(el, fn),
    speak: (text, lang) => sound.play({ speak: text, lang }, true),
    play: url => { if (url) sound.play({ audio: url }, true); },
    importCards: async o => { const r = await send('data.import', o); go('/deck/' + r.deckId); },
    // The same, staying on the page (the onboarding): gives back the deck's id.
    addCards: async o => (await send('data.import', o)).deckId,
    // Learn mode (see above).
    startLearn: (id, set, kinds) => {
      sendAnswers();
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
      const last = (L.answers || []).filter(x => x.cardId === q.id).pop(); if (last) last.ok = true;
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
    resetAll: async () => { if (!(await ask({ title: 'Delete all your data?', line: 'Every deck, card and review goes' + (S.me ? ', and your profile and shared decks' : ' on this computer') + '. This can’t be undone.', action: 'Delete my data', danger: true }))) return; await send('data.reset'); session = null; go('/'); },
    signOut: async () => { await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {}); toSignIn(); },
    // Delete account (Settings › Account; Apple asks for it inside the app): everything of yours goes, on the server too, and you're
    // signed out. A failure (like Pro that has to be cancelled first) comes back in plain words for the question to show.
    deleteAccount: async () => {
      let r;
      try { r = await fetch('/api/account/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }) }); }
      catch { throw new Error('Couldn’t reach Lucida. Check your connection and try again.'); }
      if (r.status === 401) { toSignIn(); throw new Error('Signed out'); }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again.');
      toSignIn();
      return j;
    },
    // Explain a card with AI; `question` is how Learn mode asked it, if it did.
    explain: async (cardId, question) => {
      const c = S.cards.find(x => x.id === cardId); if (!c || explaining[cardId]) return;
      explaining[cardId] = true; explainErr[cardId] = ''; explainPro[cardId] = false; changed();
      try {
        const r = await fetch('/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cardId, question: question || '' }) }), j = await r.json().catch(() => ({}));
        if (r.ok) { (c.group && c.kind === 'cloze' ? S.cards.filter(x => x.group === c.group) : [c]).forEach(x => { x.explain = { text: j.text, by: 'Lucida' }; }); aiLeftToday = j.free ? j.left : null; if ('limit' in j) S.explainLimit = j.limit || null; }
        else { explainErr[cardId] = j.error || 'Something went wrong. Try again.'; explainPro[cardId] = !!j.pro; if (r.status === 402) S.explainLimit = { text: explainErr[cardId], goPro: !!j.pro }; }
      } catch { explainErr[cardId] = 'Couldn’t reach Lucida. Try again.'; }
      explaining[cardId] = false; changed();
    },
    // A question about a card in Explain (`question`: how Learn mode asked the card). It shows at once, waiting for its answer;
    // the answer, or what went wrong, comes in under it. Each one is one of the day's explanations; when they're used up the question goes
    // and the composer shows the server's words instead. The conversation so far goes with it, and nothing is kept: closing Explain clears it.
    followUp: async (cardId, q, question) => {
      const c = S.cards.find(x => x.id === cardId), words = String(q || '').trim().slice(0, 500);
      if (!c || !words || (chats[cardId] || []).some(t => t.busy)) return;
      const turns = (chats[cardId] || []).filter(t => t.a).map(t => ({ q: t.q, a: t.a })), turn = { q: words, a: '', busy: true, error: '' };
      chats[cardId] = [...(chats[cardId] || []), turn]; changed();
      let r = null, j = {};
      try { r = await fetch('/api/explain/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cardId, q: words, turns, question: question || '' }) }); j = await r.json().catch(() => ({})); }
      catch { r = null; }
      // (closed meanwhile: the answer has nowhere to go)
      if (!(chats[cardId] || []).includes(turn)) return;
      if (r && r.ok && j.text) { turn.a = String(j.text); aiLeftToday = j.free ? j.left : null; if ('limit' in j) S.explainLimit = j.limit || null; }
      else if (r && r.status === 402) { chats[cardId] = chats[cardId].filter(t => t !== turn); S.explainLimit = { text: j.error || 'That’s today’s free explanations.', goPro: !!j.pro }; }
      else turn.error = r ? j.error || 'Something went wrong. Try again.' : 'Couldn’t reach Lucida. Try again.';
      turn.busy = false; chats[cardId] = [...chats[cardId]]; changed();
    },
    // Closing Explain (or the next card coming up) forgets its conversation.
    followUpClear: cardId => { if (!chats[cardId]) return; delete chats[cardId]; changed(); },
    // Goes to a page of the app (a screen that finishes something, like the Guide's Done).
    go: (path, replace) => go(path, replace),
    // The Guide: saved as it's typed (the screen holds the typing; `quiet` so a failed save shows in the page, not as an alert), its extra pages, and
    // older versions coming back. Sources: deleting one removes its files and keeps the cards.
    saveGuide: (deckId, page, text) => {
      const d = deckById(deckId); if (!d) return Promise.resolve();
      const key = deckId + '|' + (page || 'main'), out = (guideSaves[key] || Promise.resolve()).then(() => send('guide.save', { deckId, page: page || 'main', text }, false, true));
      guideSaves[key] = out.catch(() => {});
      return out;
    },
    addGuidePage: async (deckId, title, parent = '') => { const r = await send('guide.page.add', { deckId, title, parent }, false, true); return r.id; },
    renameGuidePage: (deckId, page, title) => send('guide.page.rename', { deckId, page, title }, false, true),
    deleteGuidePage: (deckId, page) => send('guide.page.delete', { deckId, page }, false, true),
    restoreGuide: (deckId, page, at) => send('guide.restore', { deckId, page: page || 'main', at }, false, true),
    deleteSource: async (deckId, id) => { const d = deckById(deckId), x = d && (d.sources || []).find(y => y.id === id); if (!x) return;
      if (!(await ask({ title: 'Delete “' + x.name + '”?', line: 'Its file goes. The ' + plural(x.cards || 0, 'card') + ' made from it stay in the deck.', action: 'Delete', danger: true }))) return;
      try { await send('source.delete', { deckId, id }, false, true); } catch (e) { say(e.message); } },
    // A new link for AI apps; the old one stops working (for a link that got out).
    newLink: () => send('ai.link'),
    // AI apps that signed in (web/connect.js): Allow or Cancel on their page, Disconnect, switching account, and a password.
    ...connect.act,
    // The study network (see web/social.mjs). Each gives back what the server said, and the screens redraw.
    shareDeck: (deckId, o) => net.act('deck.share', { deckId, ...o }),
    study: async id => { const r = await net.act('deck.study', { id }); if (r && r.deckId) go('/deck/' + r.deckId); return r; },
    copyDeck: async (id, o = {}) => { const r = await net.act('deck.copy', { id, ...o }); if (r && r.deckId) go('/deck/' + r.deckId); return r; },
    detach: deckId => net.act('deck.detach', { deckId }),
    takeUpdates: (deckId, picks) => net.act('deck.updates', { deckId, picks }),
    copyUpdates: (deckId, on) => net.act('deck.copyUpdates', { deckId, on }),
    // Keep or toss a change your AI wants to make to a card.
    decideProposal: (id, take) => send('card.proposal', { id, take: !!take }),
    star: (id, on) => net.act('deck.star', { id, on }),
    watch: (id, on) => net.act('deck.watch', { id, on }),
    checkDeck: id => net.act('deck.check', { id }),
    follow: (h, on) => net.act('user.follow', { handle: h, on }),
    // Block someone (or unblock them): they can't follow you or suggest to your decks, and you stop seeing them.
    block: (h, on) => net.act('user.block', { handle: h, on }),
    suggest: (id, changes, message) => net.act('suggestion.send', { id, changes, message }),
    decide: (id, picks) => net.act('suggestion.decide', { id, picks }),
    restore: (id, version) => net.act('version.restore', { id, version }),
    readNews: ids => net.act('news.read', { ids }),
    updateProfile: patch => net.act('profile.update', { patch }),
    ensureProfile: () => net.act('profile.ensure'),
    // Live: open a room for a deck's cards (`set` as in Learn mode, up to `count` questions, `time` seconds each), then
    // run the game from the big screen.
    openLive: async (id, set, count, time) => {
      const d = deckById(id), qs = d ? liveQuestions(id, set, count) : [];
      if (!qs.length) return;
      try { await live.host.open({ deckId: id, deck: { name: d.name, seed: d.cover.seed || d.name, style: d.cover.style || 'mix', round: d.cover.round || 0, bg: d.bg || { kind: 'deck', image: null } }, qs, set, count, time }); }
      catch (e) { say(e.message || 'Couldn’t open a room. Try again.'); }
    },
    // Live from a topic: the maker writes the questions (counting as one of today's makes), then the room opens. `cancelLiveTopic` stops it.
    openLiveTopic: async (topic, count, time) => {
      topic = String(topic || '').replace(/\s+/g, ' ').trim();
      if (liveTopic.busy || topic.length < 2) return;
      const mine = ++liveRun;
      Object.assign(liveTopic, { busy: true, word: 'Thinking about your topic…', error: '' }); changed();
      try {
        const r = await make.quiz(topic, count, w => { if (mine === liveRun) { liveTopic.word = w; changed(); } });
        if (!r || mine !== liveRun) return;
        // Someone who closed the window (the X) while it was writing doesn't get a room opened under them.
        if (typeof location !== 'undefined' && !/\/live\/new$|\/live$/.test(location.pathname)) return;
        const qs = r.cards.filter(c => c.quiz).map(topicQuestion).filter(q => q.text && q.right >= 0);
        if (qs.length < 2) throw new Error('Lucida couldn’t write enough questions about that. Try a different topic.');
        await live.host.open({ deckId: '', deck: { name: r.name, seed: r.name, style: 'mix', round: 0, bg: { kind: 'deck', image: null } }, qs, set: 'topic', count, time, topic: { name: r.name, job: r.job } });
      } catch (e) { if (mine === liveRun) liveTopic.error = e.message || 'Couldn’t open a room. Try again.'; }
      finally { if (mine === liveRun) { liveTopic.busy = false; liveTopic.word = ''; changed(); } }
    },
    cancelLiveTopic: () => { liveRun++; make.cancelQuiz(); Object.assign(liveTopic, { busy: false, word: '', error: '' }); changed(); },
    // After a game made from a topic: keep its questions as a deck.
    saveLiveTopic: async () => {
      const G = live.host.game();
      if (!G || !G.topic || G.topic.saved || liveTopic.saving) return;
      Object.assign(liveTopic, { saving: true, error: '' }); changed();
      try {
        const cards = G.qs.map(q => ({ kind: 'basic', front: q.text, back: q.options[q.right], text: '', at: '', quiz: { question: q.text, answer: q.options[q.right], wrong: q.options.filter((_, i) => i !== q.right), why: q.why || '' } }));
        live.host.note({ saved: await make.saveQuiz(G.topic.job, G.topic.name, cards) });
      } catch (e) { liveTopic.error = e.message || 'Couldn’t save the deck. Try again.'; }
      liveTopic.saving = false; changed();
    },
    liveStart: () => live.host.start(),
    liveNext: () => live.host.next(),
    liveAgain: () => { const G = live.host.game(); if (G) live.host.again(G.topic ? topicAgain(G.qs) : liveQuestions(G.deckId, G.set, G.count)); },
    liveClose: () => live.host.close(),
    ...playerActs(live.player, go),
    // Pausing cards (every card of a text or a picture together): they don't come up until they're unpaused.
    pauseCards: (ids, on) => saveNow('card.pause', { ids, on: !!on }, s => { for (const c of s.cards) if (ids.includes(c.id)) c.paused = !!on; }),
    // An exam date ('2026-10-12'), or none.
    setExam: (id, day) => act.updateDeck(id, { exam: day || null }),
    // Tune to you (Pro): fits FSRS to your reviews in a worker (tune-worker.js), so nothing waits for it, then saves the
    // fit. `useTuned(false)` goes back to the standard parameters and keeps the fit for later.
    tune: () => {
      if (tuning) return;
      const input = memo.hist || histories(S);
      if (input.reviews < TUNE_MIN || input.items < TUNE_ITEMS) return;
      let wk;
      try { wk = new Worker(new URL('./tune-worker.js', import.meta.url), { type: 'module' }); } catch { tuneError = 'Tuning doesn’t work in this browser.'; changed(); return; }
      tuning = { p: 0 }; tuneError = ''; changed();
      const stop = msg => { wk.terminate(); tuning = null; tuneError = msg || ''; changed(); };
      wk.onerror = () => stop('Tuning didn’t work this time. Try again.');
      wk.onmessage = async e => {
        if (e.data.progress != null) { if (tuning) tuning.p = e.data.progress; onChange(); return; }
        if (e.data.error) return stop('Tuning didn’t work this time. Try again.');
        const r = e.data.result;
        try { await send('settings.update', { patch: { tune: { on: true, w: r.w, n: r.n, reviews: r.reviews, loss: r.loss, base: r.base, gain: r.gain, at: Date.now() } } }); stop(); }
        catch { stop('Couldn’t save the tuning. Try again.'); }
      };
      wk.postMessage({ input: { data: input.data, reviews: input.reviews, items: input.items }, w: W });
    },
    useTuned: on => {
      const t = S.settings.tune;
      if (on && !(t && t.w)) return act.tune();
      return saveNow('settings.update', { patch: { tune: { on: !!on } } }, s => { if (s.settings.tune) s.settings.tune = { ...s.settings.tune, on: !!on }; });
    },
    // Get verified (Settings › Account), a report (a deck, a person or a suggestion), and the admin page's decisions (web/classes.mjs). Each gives back
    // what the server said, like the network's actions (the pages show its errors).
    askVerify: o => net.act('verify.ask', o),
    report: o => net.act('report.send', o),
    adminVerify: (id, pick) => net.act('admin.verify', { id, pick }),
    adminReport: (id, pick) => net.act('admin.report', { id, pick }),
    go
  };
  // Tuned once, it keeps up with you: when a quarter more reviews have come in since, it tunes again quietly.
  setTimeout(() => {
    const t = S.settings.tune;
    if (!t || !t.on || !t.w || !isPro() || tuning) return;
    const h = memo.hist || (memo.hist = histories(S));
    if (h.reviews >= Math.max(TUNE_MIN, Math.round((t.reviews || 0) * 1.25)) && h.items >= TUNE_ITEMS) act.tune();
  }, 5000);

  return {
    mock: false, act, net, schools,
    // Lucida's own question and message, for a screen's logic to use (never the browser's confirm() or alert()).
    ask, say,
    raw: () => S,
    // You on the study network: your handle and your profile's page (once you have one).
    me: () => ({ handle: handle(), url: handle() ? '/@' + handle() : '', name: S.settings.name || (S.me && S.me.name) || 'You' }),
    // A clip's waveform and where it's at (sound.js), and the recording under way, if there is one.
    sound: c => sound.view(c),
    recording: () => sound.recording(),
    // Your picture wherever it shows (the sidebar, the iPhone's tab bar, Settings): your photo, your Google photo, or your initial on your color.
    // With a theme on, the theme draws the circle and your initial (or a ring around your photo): skinned, art.
    chrome: () => {
      const ph = photoOf(), T = skinNow(), color = ph === 'color';
      const initial = (((S.settings.name || (S.me && S.me.name) || '').trim() || 'You')[0]).toUpperCase();
      const news = net.unread();
      return { nav: { news: news ? String(news > 99 ? '99+' : news) : '', hasNews: news > 0, ...sideView(side, toggleSide) }, me: { bg: T && color ? 'transparent' : COLORS[S.settings.color] || COLORS[0], initial,
        color: color && !T, photo: ph === 'google' ? S.me.picture : ph === 'yours' ? S.settings.yourPhoto : '', href: '/you', skinned: !!T, art: T ? T.me(initial, !color) : null } };
    },
    settings: () => ({ ...S.settings, name: S.settings.name || (S.me && S.me.name) || 'You', sub: S.me ? S.me.email : 'Saved on this computer', signedIn: !!S.me,
      google: !!(S.me && S.me.picture), photo: photoOf(), check: !!S.ai.perms.check }),
    // Lucida Pro: online, from Stripe (the server's `me.plan`); on this computer everything is on.
    pro: isPro,
    theme,
    loadTheme: key => loadTheme(key, changed),
    plan: () => (S.me ? { ...(S.me.plan || { pro: false }), manage: S.me.manage || '' } : null),
    // Every tag on your cards, for the card editor's Add tag (only cards have tags; a deck's old ones aren't offered).
    tags: () => [...new Set(S.cards.flatMap(c => c.tags))],
    decks: () => S.decks.map(deckRow),
    folders: () => S.folders.map(f => { const ds = S.decks.filter(d => d.folder === f.id).map(deckRow);
      return { id: f.id, name: f.name, n: ds.length, due: ds.filter(d => !d.paused).reduce((n, d) => n + d.due, 0), decks: ds, href: '/library/folder/' + f.id }; }),
    // Every card you've kept, with its deck and how hard it is (for the Library's All cards).
    allCards: () => S.cards.filter(c => !c.pending).slice().reverse().map(c => { const d = deckById(c.deckId) || {};
      return { id: c.id, kind: KIND[c.kind], icon: ICON[c.kind], front: listFront(c), back: listBack(c), tags: c.tags, next: nextLabel(c), level: difficulty(c), paused: !!c.paused, leech: isLeech(c, d),
        deckId: d.id, deckName: d.name, seed: (d.cover && d.cover.seed) || d.name, style: d.cover && d.cover.style, round: d.cover && d.cover.round, folder: d.folder || null,
        href: '/deck/' + d.id + '/card/' + c.id + '?from=library' }; }),
    searchDecks: q => S.decks.filter(d => d.name.toLowerCase().includes(q) || d.tags.some(g => g.toLowerCase().includes(q))
      || cardsOf(d.id).some(c => (words(c) + ' ' + c.tags.join(' ')).toLowerCase().includes(q))).map(d => d.id),
    deck: id => {
      const d = deckById(id) || S.decks[0];
      if (!d) return { id: '', name: '', tags: [], seed: '', cover: { style: 'mix', round: 0, image: null }, paused: false, grading: S.settings.grading, fsrs: true, goal: 90, gapIdx: 3, steps: ['1m', '10m'], perDay: 20,
        total: 0, totalLabel: '0', due: 0, fresh: 0, ret: null, aiCount: 0, forecast: Array(7).fill(0), piles: [], folder: null, bg: { kind: 'deck', image: null }, href: '/library', studyHref: '/review', settingsHref: '/library', newCardHref: '/decks/new',
        exam: null, examDay: '', leechAt: 8, leechAct: 'tag' };
      return { ...deckRow(d), cover: d.cover, grading: d.grading, fsrs: d.grading !== 'piles', goal: d.goal, gapIdx: d.gapIdx ?? 3, steps: d.steps, perDay: d.perDay,
        examDay: d.exam || '', leechAt: leechAt(d), leechAct: leechAct(d),
        forecast: forecast(7, [d]).vals, piles: (d.piles || []).map(p => ({ name: p.name, n: cardsOf(d.id).filter(c => c.pile === p.name).length })) };
    },
    // `pending`: a card your AI made that waits for you to keep it (Settings → Check AI cards first).
    cards: id => { const d = deckById(id), ro = d && shareOf(d).readOnly;
      return deckCards(d, S.cards).map(c => ({ id: c.id, kind: KIND[c.kind], icon: ICON[c.kind], front: listFront(c), back: listBack(c), tags: c.tags, next: nextLabel(c), paused: !!c.paused,
        ai: byAI(c) && c.source !== 'shared' ? c.source : '', href: ro ? suggestHref(d, c) : '/deck/' + id + '/card/' + c.id, group: c.group || null, pending: !!c.pending, created: c.created || 0 })); },
    // Changes your AI wants to make to your cards, waiting for your OK (Settings: check AI cards and changes first).
    proposals: id => S.cards.filter(c => c.proposal && (!id || c.deckId === id)).map(c => { const p = c.proposal, after = p.remove ? null : { ...c, ...p.patch };
      return { id: c.id, deckId: c.deckId, deckName: (deckById(c.deckId) || {}).name || '', ai: p.ai || 'AI', remove: !!p.remove, before: { q: listFront(c), a: listBack(c) }, after: after ? { q: listFront(after), a: listBack(after) } : null }; }),
    // A copy's waiting changes from the deck it came from (see social.mjs sync), as the updates panel lists them.
    updatesOf: id => { const d = deckById(id); if (!d || !d.link || d.link.gone) return [];
      const words = x => (x ? (x.kind === 'cloze' ? R.plain(x.text, { cloze: true, blank: '____', join: ' ', math: 'show' }) : flat(x.front)) : '');
      const ans = x => (x ? (x.kind === 'cloze' ? R.blanks(x.text, { math: 'show' }).join(', ') : flat(x.back)) : '');
      return (d.link.pending || []).map(p => ({ card: p.card, op: p.op, kind: p.kind, mine: !!p.mine, before: p.before ? { q: words(p.before), a: ans(p.before) } : null, after: p.after ? { q: words(p.after), a: ans(p.after) } : null })); },
    card: id => { const c = cardIndex().get(id); return c ? { ...c, clozeMode: c.cloze === -1 ? 'one' : 'each' } : null; },
    // The cards made together with this one: every blank of one text, or every box of one picture (just it, alone).
    group: id => { const c = cardIndex().get(id); return !c ? [] : c.group ? groupIndex().get(c.group) : [c]; },
    draft: type => ({ kind: { Basic: 'basic', Blank: 'cloze', Image: 'image', Audio: 'audio' }[type] || 'basic', front: '', back: '', text: '', note: '', tags: [], image: null, audio: null, speak: '', auto: true, boxes: [], occ: 'one' }),
    // What's due across your decks (Stats' forecast; the iPhone app's engine gives the same, ios/tests checks they agree), and where a new card goes.
    today: () => {
      const t = new Date(), live = S.decks.filter(d => !d.paused), sum = k => live.reduce((n, d) => n + deckStat(d)[k], 0);
      const due = sum('due'), fresh = sum('fresh'), { streak, best, days } = streaks(), monday = dayAt(t, -((t.getDay() + 6) % 7)), today = dayAt(t);
      return { date: DAYS[t.getDay()] + ', ' + MONTHS[t.getMonth()] + ' ' + t.getDate(), streak, best, due, minutes: Math.max(1, Math.round(due * 10 / 60)), fresh, next: nextDue(),
        week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => ({ d, done: days.has(dayAt(monday, i)), today: dayAt(monday, i) === today })),
        forecast: forecast(7, live), newCardHref: S.decks[0] ? '/deck/' + S.decks[0].id + '/card' : '/decks/new', studyHref: '/review' };
    },
    review: (id, pile, set) => {
      const key = keyOf(id, pile, set);
      if (!session || session.key !== key) session = { key, deckId: id || null, pile: pile || null, set: set || null, started: now(), graded: [] };
      const q = queue(id, pile, set), cur = q[0], done = session.graded.length;
      // When the card on screen came up, for how long it takes you to answer (saved with its grade).
      if (cur && (!shown || shown.id !== cur.card.id)) shown = { id: cur.card.id, at: now() };
      const counts = { new: q.filter(x => x.lane === 'new').length, learn: q.filter(x => x.lane === 'learn').length, rev: q.filter(x => x.lane === 'rev').length };
      const d = cur ? cur.deck : deckById(id) || S.decks[0] || { grading: 'four', piles: [] };
      // X goes straight back to the deck's page, or to the Library from its review of every deck (the owner: "clicking 'x' on
      // flashcards or learn should take one back to decks not to the finish screen"). Every grade is saved already.
      const base = { deckId: d.id, done, left: q.length, total: done + q.length, counts, mode: d.grading, prog: S.settings.prog, piles: (d.piles || []).map(p => ({ name: p.name, n: cardsOf(d.id).filter(c => c.pile === p.name).length })),
        endHref: set ? '/stats' : id ? '/deck/' + id : '/library', setName: setName(set) };
      if (!cur) return { ...base, empty: true, card: null, queue: 'rev', iv: { again: '', hard: '', good: '', easy: '' }, fsrsOn: false, editHref: '' };
      const c = cur.card, t = now(), pv = scheduled(d) ? preview(c.srs, t, { goal: GOAL, maxDays: MAX_DAYS, steps: d.steps, w: wOf() }) : null;
      autoplay(c);
      const ro = shareOf(d).readOnly;
      return { ...base, empty: false, card: face(c), ex: explainOf(c), queue: cur.lane, fsrsOn: !!pv, editHref: ro ? suggestHref(d, c) : '/deck/' + d.id + '/card/' + c.id + '?from=review', editLabel: ro ? 'Suggest a fix' : 'Edit',
        iv: pv ? { again: waitLabel(pv[1], t), hard: waitLabel(pv[2], t), good: waitLabel(pv[3], t), easy: waitLabel(pv[4], t) } : { again: '', hard: '', good: '', easy: '' } };
    },
    hasQueue: (id, pile, set) => queue(id, pile, set).length > 0,
    learn: learnView,
    learnSets: id => {
      const cs = cardsOf(id).filter(learnable), uses = {};
      cs.forEach(c => c.tags.forEach(g => { uses[g] = (uses[g] || 0) + 1; }));
      const tag = Object.keys(uses).sort((a, b) => uses[b] - uses[a])[0];
      return [['new', 'New', cs.filter(c => c.srs.state === 'new').length], ['hard', 'Hard', cs.filter(isHard).length], ...(tag ? [['tag:' + tag, tag, uses[tag]]] : []), ['all', 'All', cs.length]]
        .filter(([k, , n]) => n > 0 || k === 'all').map(([k, label, n]) => ({ id: k, label, n }));
    },
    learnOn: id => !!(learnOk() && learning.deckId === id && !learning.done),
    // Live: the cards a deck can play live (like learnSets), the big screen's game, and a phone's.
    liveSets: id => {
      const cs = cardsOf(id).filter(liveable), uses = {};
      cs.forEach(c => c.tags.forEach(g => { uses[g] = (uses[g] || 0) + 1; }));
      const tag = Object.keys(uses).sort((a, b) => uses[b] - uses[a])[0];
      return [['new', 'New', cs.filter(c => c.srs.state === 'new').length], ['hard', 'Hard', cs.filter(isHard).length], ...(tag ? [['tag:' + tag, tag, uses[tag]]] : []), ['all', 'All', cs.length]]
        .filter(([k, , n]) => n > 0 || k === 'all').map(([k, label, n]) => ({ id: k, label, n }));
    },
    live: () => live.host.view(),
    liveTopic: () => ({ ...liveTopic }),
    join: () => live.player.view(),
    joinAt: (kind, code) => live.player.at(kind, code),
    startReview: (id, pile, set) => { session = { key: keyOf(id, pile, set), deckId: id || null, pile: pile || null, set: set || null, started: now(), graded: [] }; },
    session: () => {
      const g = session ? session.graded : [], rated = g.filter(x => x.rating);
      const split = [1, 2, 3, 4].map(r => rated.filter(x => x.rating === r).length);
      const d = session && session.deckId ? deckById(session.deckId) : null, left = session ? queue(session.deckId, session.pile, session.set).length : 0, nx = nextDue();
      // Cards sorted into piles this session, pile by pile (the deck's piles, plus any others you used).
      const piled = g.filter(x => x.pile), names = d ? (d.piles || []).map(p => p.name) : [];
      piled.forEach(x => { if (!names.includes(x.pile)) names.push(x.pile); });
      return { pct: rated.length ? Math.round(rated.filter(x => x.rating > 1).length / rated.length * 100) : 100, goal: Math.round(GOAL * 100),
        cards: g.length, minutes: session ? Math.max(1, Math.round((now() - session.started) / MIN)) : 0, fresh: g.filter(x => x.was === 'new').length, split,
        streak: streaks().streak, next: nx ? nx.short + ' · ' + nx.n : 'Nothing due',
        moreHref: left ? reviewHref(session.deckId, session.pile, session.set) : session && session.set ? '/stats' : d ? '/deck/' + d.id + '/card' : '/library', moreLabel: left ? 'Keep going · ' + left + ' left' : session && session.set ? 'Back to stats' : 'Add cards',
        // Done goes back to the deck the session was from (the owner: "finishing a deck takes one back to 'today' page and
        // not deck page"), or to the Library after reviewing every deck.
        doneHref: session && session.set ? '/stats' : d ? '/deck/' + d.id : '/library',
        // Each pile: how many cards went in this time, how many are in it now, and a link to go over it.
        sorted: piled.length, onlyPiles: piled.length > 0 && !rated.length,
        piles: names.map(name => ({ name, n: piled.filter(x => x.pile === name).length, total: (d ? cardsOf(d.id) : S.cards).filter(c => c.pile === name).length, href: reviewHref(session && session.deckId, name) })) };
    },
    hasReviews: () => S.logs.length > 0,
    // About how many reviews a day a memory goal (a percent) means for a deck (sched.js).
    workload: (id, goal) => { const d = deckById(id), k = 'wl' + id + ':' + goal; return !d ? 0 : memo[k] ?? (memo[k] = workload(cardsOf(id), d, goal / 100)); },
    // Tune to you: whether there are enough reviews, whether it's on, and how it's going.
    tuneInfo: () => {
      const t = S.settings.tune, h = memo.hist || (memo.hist = histories(S));
      return { pro: isPro(), on: !!(t && t.on && t.w), tuned: !!(t && t.w), reviews: h.reviews, need: TUNE_MIN, can: h.reviews >= TUNE_MIN && h.items >= TUNE_ITEMS,
        busy: !!tuning, progress: tuning ? tuning.p : 0, error: tuneError, n: t ? t.reviews || t.n || 0 : 0 };
    },
    // Deep stats (Pro): insights.js's numbers, with each card's words and deck.
    insights: range => {
      const k = 'ins' + range;
      if (memo[k]) return memo[k];
      const x = insights(S, { days: { Week: 7, Month: 30, Year: 365 }[range] || 30, now: now() }), name = id => (deckById(id) || {}).name || '';
      const row = h => { const c = cardIndex().get(h.id); return { ...h, front: listFront(c), back: listBack(c), deck: name(h.deckId), href: '/deck/' + h.deckId + '/card/' + h.id + '?from=stats' }; };
      return (memo[k] = { ...x, weak: { ...x.weak, hardest: x.weak.hardest.map(row), leeches: x.weak.leeches.map(row) },
        pace: { ...x.pace, exams: x.pace.exams.map(e => ({ ...e, line: ((deckById(e.deckId) && deckStat(deckById(e.deckId)).exam) || {}).line || '' })) } });
    },
    stats: range => {
      const t = now(), logs = S.logs.filter(l => l.at >= t - { Week: 7, Month: 30, Year: 365 }[range] * DAY && isGrade(l));
      const { streak, best } = streaks(), counts = {};
      S.logs.forEach(l => { const k = dayAt(l.at); counts[k] = (counts[k] || 0) + 1; });
      const monday = dayAt(t, -((new Date(t).getDay() + 6) % 7)), start = dayAt(monday, -37 * 7);
      // Study days: darker for busier days, compared with your busiest day.
      const vals = Array.from({ length: 38 * 7 }, (_, i) => counts[dayAt(start, i)] || 0), top = Math.max(1, ...vals);
      const heat = vals.map(v => (!v ? 0 : Math.min(4, 1 + Math.floor(3.999 * v / top))));
      return { streak, best, reviews: logs.length.toLocaleString('en-US'), cards: S.cards.length.toLocaleString('en-US'), ai: S.cards.filter(byAI).length,
        remembered: rememberedPct(logs), goal: Math.round(GOAL * 100), heat, forecast: forecast(14, S.decks, true), byDeck: S.decks.map(d => ({ name: d.name, ret: deckStat(d).ret })) };
    },
    // The AI apps: the ones that called Lucida (S.ai.clients) and the ones that signed in to Lucida (`apps`, each with an id and what it is
    // called; Disconnect ends one). `url` is the address every app is given, with no secret in it (an app signs in there); `privateUrl` is the
    // person's own link, for the apps that can't sign in (online only: on this computer /mcp needs no sign-in).
    ai: () => {
      const apps = connect.apps(), names = [...new Set([...Object.keys(S.ai.clients), ...apps.map(a => a.name)])], has = n => names.includes(n);
      return { url: location.origin + '/mcp', privateUrl: S.me && S.ai.key ? location.origin + '/mcp/' + S.ai.key : '', perms: S.ai.perms, connected: names.length ? names.join(', ') : 'None yet', apps,
        clients: { claude: has('Claude'), openai: has('ChatGPT'), cursor: has('Cursor'), mcp: names.some(n => !['Claude', 'ChatGPT', 'Cursor'].includes(n)) } };
    },
    // Making cards (web/make.js), a deck's Guide, its Sources, and its Diagrams (web/diagrams.js).
    make, diagrams,
    guide: id => { const d = deckById(id); if (!d) return { deckId: '', text: '', at: 0, pages: [], can: false, studying: false };
      const g = guideOf(d), ro = shareOf(d).readOnly;
      return { deckId: d.id, text: g.text || '', at: g.at || 0, pages: (g.pages || []).map(p => ({ id: p.id, parent: p.parent || '', title: p.title, text: p.text || '', at: p.at || 0 })), can: !ro, studying: ro }; },
    guideHistory: async (id, page) => { try { const r = await fetch('/api/guide/history?deck=' + encodeURIComponent(id) + '&page=' + encodeURIComponent(page || 'main'), { cache: 'no-store' }); return r.ok ? (await r.json()).versions || [] : []; } catch { return []; } },
    sources: id => { const d = deckById(id); return d ? (d.sources || []).slice().reverse().map(sourceRow) : []; },
    sourceText: name => { if (!name) return ''; if (sourceTexts[name] === undefined) { sourceTexts[name] = null; fetch('/media/' + encodeURIComponent(name), { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).then(t => { sourceTexts[name] = t; changed(); }).catch(() => { sourceTexts[name] = ''; }); } return sourceTexts[name]; },
    // The page where an AI app asks to connect (/oauth/authorize).
    consent: connect.consent,
    href: (kind, id) => ({ decks: '/library', library: '/library', cards: '/library/cards', newDeck: '/decks/new', import: id ? '/deck/' + id + '/import' : '/decks/import', make: '/make' + (id ? '?deck=' + id : ''), guide: '/deck/' + id + '/guide', connect: '/connect', today: '/library', done: '/review/done', stats: '/stats',
      review: id ? '/review/' + id : '/review', deck: '/deck/' + id })[kind] || '/'
  };
}
