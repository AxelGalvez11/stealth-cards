// The web app's database: your real decks, cards, and reviews, saved on this computer by the local server
// (web/store.mjs), or online in your own library once you sign in. Every screen asks it the same questions the
// canvas's sample data answers (design/mock.mjs), so the same screens run on both: sample data on the canvas,
// your data here.
import { preview, waitLabel, dayAt, W } from './fsrs.js';
import { scheduled, isDue, dueDay, examStatus, workload, isLeech, leechAt, leechAct, recallAt } from './sched.js';
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
import { progressOf, doneOf } from './progress.js';
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
  return { signedOut: true, mock: false, auth, net, schools: createSchools(onChange), settings: () => ({ look: 'system' }), me: () => null, decks: () => [], folders: () => [],
    chrome: () => ({ nav: { today: '', news: '', hasNews: false, ...sideView(side, toggleSide) }, me: { bg: COLORS[0], initial: '', color: true, photo: '', href: '/sign-in' } }),
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

export async function createDb({ onChange, go }) {
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
  // `quiet`: for a page that shows the error itself (Suggestions, keeping or tossing your AI's cards): no alert, and the
  // rejection's message is a plain sentence for the page to show.
  async function send(type, payload = {}, keep = false, quiet = false) {
    let r;
    try { r = await fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, ...payload }), keepalive: keep }); }
    catch (e) { throw quiet ? new Error('Couldn’t reach Lucida. Check your connection and try again.') : e; }
    if (r.status === 401) { toSignIn(); throw new Error('Signed out'); }
    const j = quiet ? await r.json().catch(() => ({})) : await r.json();
    if (!r.ok) { if (!quiet) alert(j.error || 'Something went wrong.'); throw new Error(j.error || (quiet ? 'Something went wrong. Try again.' : '')); }
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
  const connect = createConnect({ changed, go });
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
  // A deck's exam, for its page, its settings, and Today: "Exam in 12 days · 84 cards to review first". Null without one,
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
    const sh = d.share && d.share.vis !== 'private' ? { vis: d.share.vis, id: d.share.id, url: handle() && d.share.vis === 'public' ? '/@' + handle() + '/' + d.share.slug : '/d/' + d.share.id, label: { public: 'Public', link: 'Link only', class: 'Class' }[d.share.vis] || 'Link only' } : null;
    const k = d.link ? { mode: d.link.mode, gone: !!d.link.gone, id: d.link.id, owner: d.link.owner || { name: '', handle: '' }, url: d.link.vis === 'public' && d.link.owner && d.link.owner.handle ? '/@' + d.link.owner.handle + '/' + d.link.slug : '/d/' + d.link.id,
      pending: d.link.gone ? 0 : (d.link.pending || []).length, updates: !!d.link.updates } : null;
    return { shared: sh, link: k, readOnly: !!(k && k.mode === 'study' && !k.gone) };
  };
  // A card of a deck you study as it is: fixing it means suggesting the fix to its owner, on the deck's page.
  const suggestHref = (d, c) => shareOf(d).link.url + '?suggest=' + encodeURIComponent((c && c.origin) || '1');
  // Classes (web/classes.mjs). The classes you're in come with your library (S.classes, brought up to date when the app
  // opens), so Today shows your assignments right away; your progress on each is worked out here, from your own cards
  // (web/progress.js), the same way the server sends it to a class you share it with.
  const classDeck = sharedId => S.decks.find(d => d.link && d.link.id === sharedId && !d.link.gone);
  const classProgress = sharedId => { const d = classDeck(sharedId); return d ? { deckId: d.id, ...progressOf(d, S.cards, S.logs) } : null; };
  // After a study session, a class you share your progress with hears how far you got, without waiting for the app to
  // open again.
  const classSync = () => { if ((S.classes || []).some(k => k.role === 'member' && k.share && k.assignments.length))
    fetch('/api/social', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'class.sync' }) }).catch(() => {}); };
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
    // 'cards:<ids>': cards picked by their ids (the ones missed in a practice test), up to 100.
    const ids = set.startsWith('cards:') ? new Set(set.slice(6).split(',')) : null;
    const pickOf = ids ? c => ids.has(c.id) : set === 'hard' ? c => c.srs.state !== 'new' && difficulty(c) === 'hard' : set === 'leech' ? c => isLeech(c, deckById(c.deckId)) : set.startsWith('tag:') ? c => c.srs.state !== 'new' && c.tags.includes(set.slice(4)) : () => false;
    return S.cards.filter(c => studyable(c) && deckById(c.deckId) && pickOf(c)).sort((a, b) => by(a) - by(b)).slice(0, ids ? 100 : 50);
  }
  const setName = set => (set === 'hard' ? 'Hardest cards' : set === 'leech' ? 'Cards you keep forgetting' : set && set.startsWith('tag:') ? set.slice(4) : set && set.startsWith('cards:') ? 'Missed in the test' : '');
  // Where a review of a set ends: the Stats page, or (the cards missed in a test) back to the test's results.
  const setBack = set => (set && set.startsWith('cards:') ? (testing && testOk() ? (testing.phase === 'results' ? scopeHere(testing) : scopeBack(testing)) : '/library') : '/stats');
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
  const explaining = {}, explainErr = {}, explainPro = {};
  let aiLeftToday = null;
  const explainOf = c => { if (!c) return { on: false }; const text = c.explain ? String(c.explain.text || '').replace(/\*\*/g, '') : '';
    return { on: !!S.aiOn || !!text, text, busy: !!explaining[c.id], error: explainErr[c.id] || '', goPro: !!explainPro[c.id],
      note: text && aiLeftToday != null ? (aiLeftToday === 1 ? '1 free explanation left today' : aiLeftToday + ' free explanations left today') : '' }; };
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
    if ((heic ? 'image' : (type || f.type).split('/')[0]) !== want) { alert(NOT[want]); return null; }
    if (want === 'image') { f = await picture(f, heic ? 'image/heic' : type, side || 2400); if (!f) { alert(heic ? HEIC : NOT.image); return null; } }
    else if (!type) { alert(NOT.audio); return null; }
    else f = new Blob([f], { type });
    if (f.size > LIMIT) { alert(OVER); return null; }
    return f;
  }
  const upload = async (blob, want, side) => {
    let f = null, r = null;
    try { f = await fit(blob, want, side); } catch { alert('Couldn’t read that file. Try another one.'); }
    if (!f) return null;
    try { r = await fetch('/api/media', { method: 'POST', headers: { 'content-type': f.type }, body: f }); } catch { alert('Couldn’t reach Lucida. Check your connection and try again.'); return null; }
    if (r.status === 401) { toSignIn(); return null; }
    // An error from Vercel itself (like a file that's too big for it) is a page, not JSON.
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) { alert(r.status === 413 ? OVER : j.error || 'That didn’t upload. Try again in a minute.'); return null; }
    return j.url;
  };
  let typing = {}, typingTimer = null;
  // Recording, playing, and the waveforms of sound (sound.js). A clip's shape measured on this device is saved with the
  // cards that play it, quietly (if that fails, it's measured again next time).
  const sound = createSound({ onChange: () => changed(), upload: b => upload(b, 'audio'), measured: (url, wave) => {
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
  // A deck's cards that can be asked (until the next change), with their answers: building many questions at once (a test) asks
  // for these again and again. `cap`: of a long list of other answers, only this many (picked at random) are looked through.
  const learnIn = id => memo['l' + id] || (memo['l' + id] = cardsOf(id).filter(learnable).map(c => ({ c, a: answerOf(c) })));
  function distractors(c, n, cap = Infinity) {
    const right = answerOf(c).toLowerCase(), deck = learnIn(c.deckId).filter(x => x.c.id !== c.id), same = deck.filter(x => x.c.kind === c.kind);
    const o = occOf(c), near = o ? [...new Set(o.boxes.map(b => String(b.label || '').trim()))].filter(a => a && a.toLowerCase() !== right) : [];
    let pool = [...new Set((same.length > n ? same : deck).map(x => x.a))].filter(a => a && a.toLowerCase() !== right && !near.includes(a));
    if (pool.length > cap) pool = shuffle(pool).slice(0, cap);
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
  // and saved on the cards, where Learn mode and the practice test find them. Nobody waits: until they arrive the question builders ask as
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
  // "blank" question when `blank` is on. Learn mode and the practice test both ask this way.
  function choiceQuestion(c, kind, blank, cap) {
    const cid = c.id, ai = kind === 'tf' ? aiQuiz(c, 'true_false') : kind === 'mc' ? aiQuiz(c, 'choice') : kind === 'blank' ? aiQuiz(c, 'blank') : [];
    // (A blank that isn't a fill-in-the-blank card exists only as the written question, so that is always the one asked.)
    if (ai.length && (Math.random() < .8 || !distractors(c, 1, cap).length || (kind === 'blank' && c.kind !== 'cloze'))) {
      const x = oneOf(ai);
      if (kind === 'tf') return { type: 'choice', kind, id: cid, text: 'True or false?', claim: x.question, options: ['True', 'False'], right: x.answer === 'true' ? 0 : 1, pick: null, why: x.why, ai: true };
      const options = shuffle([x.answer, ...x.wrong]);
      return { type: 'choice', kind, id: cid, text: x.question, options, right: options.indexOf(x.answer), pick: null, why: x.why, ai: true };
    }
    if (kind === 'tf') {
      const truth = Math.random() < .5, claim = truth ? answerOf(c) : distractors(c, 1, cap)[0];
      return { type: 'choice', kind, id: cid, claim, options: ['True', 'False'], right: truth ? 0 : 1, pick: null };
    }
    const options = shuffle([answerOf(c), ...distractors(c, 3, cap)]);
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
    classSync();
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
  // ---------- Practice test ----------
  // A calm test of a deck's cards (or of every deck in a folder), like an exam: numbered questions you can go back through and flag, a
  // quiet timer when you asked for one, nothing said about right or wrong until you submit, then your score with every question and its
  // right answer. The questions are Learn mode's (choiceQuestion, and the ones your AI wrote for the cards), and a written answer gets
  // Learn's spelling check. A test never changes when a card comes back for review (it logs no review). The test in progress keeps
  // itself on this device, so a reload picks it up where it was; a finished one is saved with the library (test.save), where the deck's
  // page lists it and AI apps can read it.
  const TEST_KEY = 'lucida.test', TEST_ORDER = ['mc', 'tf', 'blank', 'match', 'type'], LETTERS = 'ABCDEFGH', TEST_CAP = 300;
  const TEST_NAME = { mc: 'Multiple choice', tf: 'True or false', blank: 'Fill in the blank', match: 'Matching', type: 'Written' };
  const TEST_CHIPS = [['mc', 'Multiple choice'], ['tf', 'True or false'], ['type', 'Written'], ['match', 'Matching'], ['blank', 'Fill in the blank']];
  let testing = (() => { try { const x = JSON.parse(localStorage.getItem(TEST_KEY) || 'null'); return x && x.v === 1 ? x : null; } catch { return null; } })();
  let testSaving = null, testClock = '', testBeat = 0;
  const saveTest = () => { try { if (testing) localStorage.setItem(TEST_KEY, JSON.stringify(testing)); else localStorage.removeItem(TEST_KEY); } catch { /* private window */ } };
  // What a test is of: a deck, or every deck in a folder (not the ones you paused).
  const scopeOf = s => (s && s.folderId ? { folderId: s.folderId } : { deckId: (s && s.deckId) || '' });
  const scopeDecks = s => (s.folderId ? S.decks.filter(d => d.folder === s.folderId && !d.paused) : [deckById(s.deckId)].filter(Boolean));
  const scopeName = s => (s.folderId ? (S.folders.find(f => f.id === s.folderId) || {}).name : (deckById(s.deckId) || {}).name) || '';
  const scopeBack = s => (s.folderId ? '/library/folder/' + s.folderId : '/deck/' + s.deckId);
  const scopeHere = s => '/test/' + (s.folderId ? 'folder/' + s.folderId : s.deckId);
  const sameScope = (a, b) => (a.folderId || '') === (b.folderId || '') && (a.deckId || '') === (b.deckId || '');
  const testOk = () => !!testing && (testing.folderId ? S.folders.some(f => f.id === testing.folderId) : !!deckById(testing.deckId));
  // The cards a test can ask (with their words and answers, see learnIn), and how many different answers a deck has.
  const testPool = s => scopeDecks(s).flatMap(d => learnIn(d.id).map(x => ({ ...x, q: learnText(x.c) })));
  const answersN = id => memo['n' + id] || (memo['n' + id] = new Set(learnIn(id).map(x => x.a.toLowerCase())).size);
  const shortE = e => e.c.kind !== 'image' && e.q.length <= 70 && e.a.length <= 60;
  const testScore = items => { const right = items.filter(x => x.ok).length; return { n: items.length, right, pct: items.length ? Math.round(right / items.length * 100) : 0 }; };
  const clock = sec => { const s = Math.max(0, Math.round(sec)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };
  const dayLabel = t => { const d = new Date(t); return SHORT_MONTHS[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== new Date(now()).getFullYear() ? ', ' + d.getFullYear() : ''); };
  // The kinds a card can be asked in, quickly: a choice or a true-or-false needs another answer in its deck (or a question your AI wrote),
  // a blank is a fill-in-the-blank card, writing needs a short answer, matching short words. A fill-in-the-blank card is a "blank" question
  // when blanks are on, not a plain choice.
  function testKinds(e, on, matchOk) {
    const c = e.c, more = answersN(c.deckId) >= 2, ks = [];
    if (on('mc') && !(c.kind === 'cloze' && on('blank')) && (more || aiQuiz(c, 'choice').length)) ks.push('mc');
    if (on('tf') && (more || aiQuiz(c, 'true_false').length)) ks.push('tf');
    if (on('blank') && ((c.kind === 'cloze' && more) || aiQuiz(c, 'blank').length)) ks.push('blank');
    if (on('type') && e.a.length <= 40) ks.push('type');
    if (matchOk && shortE(e)) ks.push('match');
    return ks;
  }
  // Which cards go in a test of these kinds, shuffled: each with the kinds it fits. Only matching fits: groups of its own (matchOnly).
  function testTargets(pool, kinds) {
    const on = k => kinds.includes(k), shorts = pool.filter(shortE), matchOk = on('match') && shorts.length >= 4;
    const all = shuffle(pool).map(e => ({ e, ks: testKinds(e, on, matchOk) })).filter(x => x.ks.length);
    return { targets: all, shorts, matchOk, matchOnly: matchOk && all.every(x => x.ks.length === 1 && x.ks[0] === 'match') };
  }
  // Four or five cards with different answers, out of `rest` (they leave it).
  function takeGroup(rest, size) {
    const seen = new Set(), got = [];
    for (const e of rest) { const a = e.a.toLowerCase(); if (!seen.has(a)) { seen.add(a); got.push(e); if (got.length >= size) break; } }
    if (got.length < 4) return [];
    got.forEach(e => rest.splice(rest.indexOf(e), 1));
    return got;
  }
  const groupSize = left => (left >= 10 ? 5 : left >= 8 ? 4 : Math.min(5, left));
  function matchGroups(shorts, want) {
    const rest = shuffle(shorts), groups = [];
    while (rest.length >= 4 && (!want || groups.length < want)) { const g = takeGroup(rest, groupSize(rest.length)); if (!g.length) break; groups.push(g); }
    return groups;
  }
  const pictureOf = c => { const o = occOf(c); return { image: c.kind === 'image' && c.image ? c.image : '', occ: o ? { boxes: o.boxes, ask: o.i, mode: o.mode } : null }; };
  const matchQuestion = group => {
    const terms = shuffle(group).map(e => ({ id: e.c.id, label: e.q, answer: e.a }));
    return { type: 'match', kind: 'match', id: group[0].c.id, terms, defs: shuffle(terms.map(t => ({ id: t.id, label: t.answer }))) };
  };
  // One question of one kind for a card, or null when it can't be made fairly (then the card gets another kind).
  function testQuestion(e, kind, shorts) {
    const c = e.c;
    if (kind === 'type') return { type: 'type', kind, id: c.id, text: e.q, answer: e.a, ...pictureOf(c) };
    if (kind === 'match') {
      const near = shorts.filter(x => x.c.id !== c.id && x.c.deckId === c.deckId), from = (near.length >= 3 ? near : shorts.filter(x => x.c.id !== c.id)), seen = new Set([e.a.toLowerCase()]), group = [e];
      for (const x of shuffle(from)) { const a = x.a.toLowerCase(); if (seen.has(a)) continue; seen.add(a); group.push(x); if (group.length >= 5) break; }
      return group.length >= 4 ? matchQuestion(group) : null;
    }
    const q = choiceQuestion(c, kind, kind === 'blank', 300);
    if (q.options.length < 2 || q.right < 0 || (q.kind === 'tf' && !q.claim)) return null;
    delete q.pick;
    return { ...q, text: q.text || e.q, ...pictureOf(c) };
  }
  // The questions of a new test. `want`: how many (0 for every card, up to TEST_CAP). Each question has a card of its own; a matching
  // question has four or five pairs (its card and others from the deck) and is one question. The kinds are balanced, and each kind is
  // a section (multiple choice, true or false, fill in the blank, matching, written) with its questions in random order.
  function testQuestions(pool, kinds, want) {
    const on = k => kinds.includes(k), { targets, shorts, matchOk, matchOnly } = testTargets(pool, kinds), cap = Math.min(want || TEST_CAP, TEST_CAP);
    if (matchOnly) return matchGroups(shorts, cap).map(matchQuestion);
    const picks = targets.slice(0, cap), count = {}, bump = k => { count[k] = (count[k] || 0) + 1; };
    // About one matching question in (kinds + 3); a card that fits nothing else is matching whether or not it's in that count.
    let m = matchOk ? Math.min(picks.filter(x => x.ks.includes('match')).length, Math.max(1, Math.round(picks.length / (kinds.length + 3)))) : 0;
    for (const x of picks) if (m > 0 && x.ks.includes('match')) { x.kind = 'match'; m--; bump('match'); }
    for (const x of picks) {
      if (x.kind) continue;
      const ks = x.ks.filter(k => k !== 'match'), low = ks.length ? Math.min(...ks.map(k => count[k] || 0)) : 0;
      x.kind = ks.length ? oneOf(ks.filter(k => (count[k] || 0) === low)) : 'match'; bump(x.kind);
    }
    const qs = [];
    for (const x of picks) {
      let q = null;
      for (const k of [x.kind, ...x.ks.filter(k => k !== x.kind && k !== 'match')]) { q = testQuestion(x.e, k, shorts); if (q) break; }
      if (q) qs.push(q);
    }
    return TEST_ORDER.flatMap(k => shuffle(qs.filter(q => q.kind === k)));
  }
  // How many questions a test of these kinds can have (the set-up screen offers 10, 20 and 30 up to this, and All).
  function testAvailable(pool, kinds) {
    const { targets, shorts, matchOnly } = testTargets(pool, kinds);
    return matchOnly ? matchGroups(shorts, 0).length : Math.min(targets.length, TEST_CAP);
  }
  // The same questions again with their answers in another order (Retake the ones I missed).
  const reshuffled = q => {
    if (q.type === 'match') return { ...q, terms: shuffle(q.terms), defs: shuffle(q.defs) };
    if (q.type !== 'choice' || q.kind === 'tf') return q;
    const right = q.options[q.right], options = shuffle(q.options);
    return { ...q, options, right: options.indexOf(right) };
  };
  // Has this question got an answer? (Matching: every one of its words.)
  const answered = (q, a) => (q.type === 'choice' ? a != null : q.type === 'type' ? String(a || '').trim() !== '' : !!a && q.terms.every(t => a[t.id]));
  // The score of a test: each question's answer, graded. Choices and matching are exact (a matching question is right only when every pair
  // is); written answers forgive case, accents, and small typos (closeEnough, Learn's check).
  function testItems(T) {
    return T.questions.map((q, i) => {
      const a = T.answers[i], n = i + 1;
      if (q.type === 'match') {
        const pairs = q.terms.map(t => { const d = a && a[t.id] ? q.defs.find(x => x.id === a[t.id]) : null; return { card: t.id, q: t.label, a: d ? d.label : '', r: t.answer, ok: !!a && a[t.id] === t.id }; });
        return { n, k: 'match', card: q.id, q: 'Match each one to its answer.', a: '', r: '', ok: pairs.every(p => p.ok), pairs };
      }
      if (q.type === 'type') { const typed = String(a || '').trim(); return { n, k: q.kind, card: q.id, q: q.text, a: typed, r: q.answer, ok: !!typed && closeEnough(typed, q.answer) }; }
      return { n, k: q.kind, card: q.id, q: q.text, ...(q.claim ? { claim: q.claim } : {}), a: a == null ? '' : q.options[a], r: q.options[q.right], ok: a === q.right };
    });
  }
  // Time spent counts only while the test is open and showing; a gap (the tab hidden, the computer asleep) isn't counted.
  function tickTest() {
    const T = testing; if (!T || T.phase !== 'taking') return;
    const t = now(); if (!document.hidden) T.spent += Math.min(Math.max(0, t - T.tick), 2500); T.tick = t;
  }
  const testLeft = T => (T.limit ? Math.max(0, T.limit * 60 - Math.floor(T.spent / 1000)) : null);
  function submitTest(timeUp) {
    const T = testing; if (!T || T.phase !== 'taking') return;
    tickTest();
    const items = testItems(T), took = Math.round((T.limit ? Math.min(T.spent, T.limit * 60000) : T.spent) / 1000);
    T.phase = 'results'; T.result = { items, took, timeUp: !!timeUp, ...testScore(items) };
    saveTest(); changed();
    testSaving = send('test.save', { test: { ...scopeOf(T), took, limit: T.limit, timeUp: !!timeUp, kinds: T.kinds, items } }, false, true)
      .then(r => { if (testing === T && T.result) { T.result.savedId = r.id; saveTest(); } return r; }).catch(() => null);
  }
  setInterval(() => {
    const T = testing; if (!T || T.phase !== 'taking' || !testOk()) return;
    tickTest();
    if (T.limit && T.spent >= T.limit * 60000) return submitTest(true);
    const shown = T.limit ? clock(testLeft(T)) : '';
    if (shown !== testClock) { testClock = shown; onChange(); }
    if (++testBeat % 5 === 0) saveTest();
  }, 1000);
  // The test is saved as the page goes (a reload, a closed tab). (Where db.js runs in Node, as in the iPhone parity oracle, there's no bare addEventListener.)
  const keep = () => { tickTest(); saveTest(); };
  if (typeof addEventListener === 'function') addEventListener('pagehide', keep);
  document.addEventListener('visibilitychange', () => { if (document.hidden) keep(); });
  // What the screen shows: the question you're on and your place in the test, or the results once it's submitted.
  function testView() {
    if (!testing || !testOk()) return null;
    const T = testing, n = T.questions.length, base = { deckId: T.deckId || '', folderId: T.folderId || '', name: T.name, back: T.back, here: scopeHere(T), n, limit: T.limit };
    if (T.phase === 'results') {
      const R = T.result;
      return { ...base, phase: 'results', pct: R.pct, right: R.right, took: R.took, tookLabel: clock(R.took), timeUp: !!R.timeUp, missed: R.items.filter(x => !x.ok).length,
        rows: R.items.map(x => { const c = cardById(x.card); return { ...x, kindLabel: TEST_NAME[x.k], notAnswered: x.k !== 'match' && !x.a, canCount: x.k === 'type' && !x.ok && !!x.a, ex: c ? explainOf(c) : { on: false } }; }) };
    }
    const i = T.at, q = T.questions[i], a = T.answers[i], done = T.questions.map((x, j) => answered(x, T.answers[j]));
    const view = { type: q.type, kind: q.kind, kindLabel: TEST_NAME[q.kind], text: q.text || 'Match each one to its answer.', claim: q.claim || '', image: q.image || '', occ: q.occ || null };
    if (q.type === 'choice') view.options = q.options.map((label, j) => ({ label, picked: a === j }));
    else if (q.type === 'type') view.typed = String(a || '');
    else {
      const asked = a || {};
      view.defs = q.defs.map((d, j) => ({ id: d.id, letter: LETTERS[j], label: d.label, by: q.terms.findIndex(t => asked[t.id] === d.id) + 1 }));
      view.terms = q.terms.map((t, j) => ({ id: t.id, n: j + 1, label: t.label, picked: asked[t.id] ? LETTERS[q.defs.findIndex(d => d.id === asked[t.id])] : '', chips: q.defs.map((d, k) => ({ id: d.id, letter: LETTERS[k], on: asked[t.id] === d.id })) }));
    }
    return { ...base, phase: 'taking', i, number: i + 1, q: view, flagged: !!T.flags[i], answered: done.filter(Boolean).length, flags: Object.values(T.flags).filter(Boolean).length,
      unanswered: done.filter(x => !x).length, canBack: i > 0, last: i === n - 1, left: testLeft(T), clock: T.limit ? clock(testLeft(T)) : '',
      nav: T.questions.map((x, j) => ({ n: j + 1, answered: done[j], flagged: !!T.flags[j], current: j === i })) };
  }
  // The Practice tests on a deck's page (or a folder's): when, how it went, newest first.
  const pastTests = s => (S.tests || []).filter(t => (s.folderId ? t.folderId === s.folderId : t.deckId === s.deckId)).slice(0, 5).map(t => ({ id: t.id, at: t.at, day: dayLabel(t.at), n: t.n, right: t.right, pct: t.pct, line: t.right + ' of ' + t.n }));
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
      const ask = d.link && !d.link.gone ? 'Remove “' + d.name + '” from your library? Your progress on it goes too.' : 'Delete “' + d.name + '” and its ' + plural(cardsOf(id).length, 'card') + '? This can’t be undone.';
      if (!confirm(ask)) return; await send('deck.delete', { id }); go('/library'); },
    // Folders: make one (optionally putting a deck in it), rename one, or remove one (its decks go back to the library).
    newFolder: async (name, deckId) => { const r = await send('folder.add', { name }); if (deckId) await send('deck.update', { id: deckId, patch: { folder: r.id } }); return r.id; },
    renameFolder: (id, name) => send('folder.update', { id, patch: { name } }),
    deleteFolder: async id => { const f = S.folders.find(x => x.id === id); if (!f || !confirm('Remove the folder “' + f.name + '”? Its decks stay in your library.')) return; await send('folder.delete', { id }); go('/library'); },
    // Into a folder (or out, with none): it goes last there. Dragging also puts a deck before another (or last).
    moveDeck: (id, folder) => { const d = deckById(id); if (!d || (d.folder || null) === (folder || null)) return; d.folder = folder || null; placeBefore(S.decks, d, null); changed(); return saveMove('deck.move', { id, folder: folder || null, before: null }); },
    reorderDeck: (id, before) => { const d = deckById(id); if (!d) return; placeBefore(S.decks, d, before ? deckById(before) : null); changed(); return saveMove('deck.move', { id, before: before || null }); },
    // A card dragged on its deck's page, or onto another deck.
    reorderCard: (id, before) => { const c = S.cards.find(x => x.id === id), d = c && deckById(c.deckId); if (!d) return; cardBefore(d, S.cards, c, before || null); changed(); return saveMove('card.move', { id, before: before || null }); },
    moveCard: (id, deckId) => { const c = S.cards.find(x => x.id === id); if (!c || !deckById(deckId) || c.deckId === deckId) return; cardToDeck(S, c, deckId); changed(); return saveMove('card.move', { id, deckId }); },
    // What Learn mode, flashcards, and Live show behind a deck; a photo is uploaded here.
    setBg: (id, kind) => act.updateDeck(id, { bg: { kind } }),
    pickBg: async id => { const url = await act.pickFile('image'); if (url) await send('deck.update', { id, patch: { bg: { kind: 'photo', image: url } } }); },
    exportDeck: id => {
      const d = deckById(id), q = x => '"' + String(x ?? '').replace(/"/g, '""') + '"';
      const rows = [['front', 'back', 'kind', 'text', 'note', 'tags'].join(',')].concat(cardsOf(id).map(c => [c.front, occOf(c) ? occOf(c).label : c.back, c.kind, c.text, c.note, c.tags.join(' ')].map(q).join(',')));
      download(d.name.replace(/[^\w\- ]+/g, '').trim() + '.csv', rows.join('\n'), 'text/csv');
    },
    pickCover: async id => { const url = await act.pickFile('image'); if (url) await send('deck.update', { id, patch: { cover: { image: url } } }); },
    saveCard: async (id, deckId, o, back) => { if (id) await send('card.update', { id, patch: { ...o, pending: false } }); else await send('card.add', { deckId, ...o }); go(back); },
    deleteCard: async (id, back) => { if (!confirm('Delete this card?')) return; await send('card.delete', { id }); go(back); },
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
      if (!queue(session.deckId, session.pile, session.set).length) { classSync(); go('/review/done'); }
    },
    pile: async (cardId, name) => {
      if (!session) return;
      const entry = { cardId, pile: name, was: 'pile' };
      session.graded.push(entry);
      entry.logId = (await send('review.grade', { cardId, pile: name, ms: shownFor(cardId) })).logId;
      if (!queue(session.deckId, session.pile, session.set).length) { classSync(); go('/review/done'); }
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
    pickSound: () => sound.pick(accept => choose(accept).then(f => (f && f.size > LIMIT ? (alert(OVER), null) : f))),
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
    // Practice test (see above): start one from a deck or a folder (`s`: { deckId } or { folderId }) with `o`: { count (a number, or 0 for
    // every card), kinds, limit (minutes, 0 for none) }; answer, move about, flag; submit; and what to do with the results.
    startTest: (s, o = {}) => {
      const sc = scopeOf(s), pool = testPool(sc), kinds = TEST_ORDER.filter(k => (o.kinds || []).includes(k));
      const qs = pool.length && kinds.length ? testQuestions(pool, kinds, +o.count || 0) : [];
      if (!qs.length) return false;
      const t = now();
      testing = { v: 1, ...sc, name: scopeName(sc), back: scopeBack(sc), count: +o.count || 0, kinds, limit: [10, 20, 30].includes(+o.limit) ? +o.limit : 0, questions: qs, answers: {}, flags: {}, at: 0, started: t, spent: 0, tick: t, phase: 'taking', result: null };
      testClock = ''; saveTest(); go(scopeHere(sc));
      return true;
    },
    testChoose: j => { const T = testing, q = T && T.phase === 'taking' && T.questions[T.at]; if (!q || q.type !== 'choice' || !(j >= 0 && j < q.options.length)) return; T.answers[T.at] = j; saveTest(); changed(); },
    // One word of a matching question gets a letter (the same letter again takes it back; a letter someone else had moves to this word).
    testMatch: (term, def) => {
      const T = testing, q = T && T.phase === 'taking' && T.questions[T.at];
      if (!q || q.type !== 'match' || !q.terms.some(t => t.id === term) || !q.defs.some(d => d.id === def)) return;
      const a = T.answers[T.at] = { ...(T.answers[T.at] || {}) };
      if (a[term] === def) delete a[term];
      else { for (const k of Object.keys(a)) if (a[k] === def) delete a[k]; a[term] = def; }
      saveTest(); changed();
    },
    testType: text => { const T = testing, q = T && T.phase === 'taking' && T.questions[T.at]; if (!q || q.type !== 'type') return; T.answers[T.at] = String(text || '').slice(0, 300); saveTest(); onChange(); },
    testGo: i => { const T = testing; if (!T || T.phase !== 'taking' || !(i >= 0 && i < T.questions.length)) return; tickTest(); T.at = i; saveTest(); changed(); },
    testFlag: () => { const T = testing; if (!T || T.phase !== 'taking') return; if (T.flags[T.at]) delete T.flags[T.at]; else T.flags[T.at] = true; saveTest(); changed(); },
    testSubmit: () => submitTest(false),
    // Leaving a test, or Done on its results: it's gone from this device (a finished test is saved already).
    testLeave: () => { testing = null; testSaving = null; saveTest(); changed(); },
    // The spelling check missed a written answer (another word for the same thing): count it as right after all, and save that.
    testCount: async n => {
      const T = testing, R = T && T.result, it = R && R.items.find(x => x.n === n);
      if (!it || it.ok || it.k !== 'type' || !it.a) return;
      it.ok = true; it.counted = true; Object.assign(R, testScore(R.items)); saveTest(); changed();
      const id = R.savedId || ((await testSaving) || {}).id;
      if (id) send('test.fix', { id, n }, false, true).catch(() => {});
    },
    // The questions that were missed (all over again, with their answers in another order), as a new test.
    testRetake: () => {
      const T = testing, R = T && T.result; if (!R) return;
      const bad = new Set(R.items.filter(x => !x.ok).map(x => x.n - 1)), qs = T.questions.filter((_, i) => bad.has(i)).map(reshuffled);
      if (!qs.length) return;
      const t = now();
      testing = { ...T, questions: qs, answers: {}, flags: {}, at: 0, started: t, spent: 0, tick: t, phase: 'taking', result: null };
      testClock = ''; testSaving = null; saveTest(); changed();
    },
    // The cards that were missed (the wrong pairs of a matching question), as a review of just those: grading counts, like any review.
    testStudy: () => {
      const T = testing, R = T && T.result; if (!R) return;
      const ids = [...new Set(R.items.filter(x => !x.ok).flatMap(x => (x.k === 'match' ? x.pairs.filter(p => !p.ok).map(p => p.card) : [x.card])))].filter(id => { const c = cardById(id); return c && studyable(c); });
      if (ids.length) go('/review?set=' + encodeURIComponent('cards:' + ids.join(',')));
    },
    exportAll: () => download('lucida.json', JSON.stringify({ decks: S.decks, cards: S.cards, logs: S.logs }, null, 1), 'application/json'),
    resetAll: async () => { if (!confirm('Delete every deck, card, and review' + (S.me ? ', and your profile and shared decks' : ' on this computer') + '? This can’t be undone.')) return; await send('data.reset'); session = null; go('/'); },
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
        if (r.ok) { (c.group && c.kind === 'cloze' ? S.cards.filter(x => x.group === c.group) : [c]).forEach(x => { x.explain = { text: j.text, by: 'Lucida' }; }); aiLeftToday = j.free ? j.left : null; }
        else { explainErr[cardId] = j.error || 'Something went wrong. Try again.'; explainPro[cardId] = !!j.pro; }
      } catch { explainErr[cardId] = 'Couldn’t reach Lucida. Try again.'; }
      explaining[cardId] = false; changed();
    },
    // Goes to a page of the app (a screen that finishes something, like the Guide's Done).
    go: path => go(path),
    // The Guide: saved as it's typed (the screen holds the typing; `quiet` so a failed save shows in the page, not as an alert), its extra pages, and
    // older versions coming back. Sources: deleting one removes its files and keeps the cards.
    saveGuide: (deckId, page, text) => {
      const d = deckById(deckId); if (!d) return Promise.resolve();
      const key = deckId + '|' + (page || 'main'), out = (guideSaves[key] || Promise.resolve()).then(() => send('guide.save', { deckId, page: page || 'main', text }, false, true));
      guideSaves[key] = out.catch(() => {});
      return out;
    },
    addGuidePage: async (deckId, title) => { const r = await send('guide.page.add', { deckId, title }, false, true); return r.id; },
    renameGuidePage: (deckId, page, title) => send('guide.page.rename', { deckId, page, title }, false, true),
    deleteGuidePage: (deckId, page) => send('guide.page.delete', { deckId, page }, false, true),
    restoreGuide: (deckId, page, at) => send('guide.restore', { deckId, page: page || 'main', at }, false, true),
    deleteSource: async (deckId, id) => { const d = deckById(deckId), x = d && (d.sources || []).find(y => y.id === id); if (!x) return;
      if (!confirm('Delete “' + x.name + '”? Its file goes, and the ' + plural(x.cards || 0, 'card') + ' made from it stay in the deck.')) return;
      try { await send('source.delete', { deckId, id }, false, true); } catch (e) { alert(e.message); } },
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
      catch (e) { alert(e.message || 'Couldn’t open a room. Try again.'); }
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
    // Classes (web/classes.mjs). Like the network's actions, each gives back what the server said (the pages show its
    // errors); making or joining a class goes to it, and leaving or deleting one goes back to your classes.
    makeClass: async o => { const r = await net.act('class.make', o); if (r && r.code) go('/class/' + r.code); return r; },
    joinClass: async code => { const r = await net.act('class.join', { code }); if (r && r.code) go('/class/' + r.code); return r; },
    leaveClass: async (id, name) => { if (!confirm('Leave “' + name + '”? The decks you study from it stay in your library.')) return null; const r = await net.act('class.leave', { id }); go('/library/classes'); return r; },
    deleteClass: async (id, name) => { if (!confirm('Delete “' + name + '”? Everyone in it keeps the decks they study.')) return null; const r = await net.act('class.delete', { id }); go('/library/classes'); return r; },
    updateClass: (id, patch) => net.act('class.update', { id, patch }),
    setMember: (id, handle, o) => (o && o.remove && o.name && !confirm('Take ' + o.name + ' out of the class?') ? Promise.resolve(null) : net.act('class.member', { id, handle, role: o && o.role, remove: !!(o && o.remove) })),
    shareProgress: (id, on) => net.act('class.share', { id, on }),
    addClassDeck: (id, deckId) => net.act('class.addDeck', { id, deckId }),
    removeClassDeck: (id, sharedId) => net.act('class.removeDeck', { id, sharedId }),
    assign: (id, o) => net.act('class.assign', { id, ...o }),
    unassign: (id, assignment) => net.act('class.unassign', { id, assignment }),
    askVerify: o => net.act('verify.ask', o),
    report: o => net.act('report.send', o),
    adminVerify: (id, pick) => net.act('admin.verify', { id, pick }),
    adminReport: (id, pick) => net.act('admin.report', { id, pick }),
    // Google Classroom's own share page, in a new tab: a class's invite link, or a class deck's page.
    classroom: (url, title) => window.open('https://classroom.google.com/share?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title || ''), '_blank', 'noopener'),
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
    raw: () => S,
    // Your classes as your library has them; your progress on a class's deck (null until you study it); and what Today
    // lists: the assignments of the classes you're a member of, soonest first. A done one stays until its date passes,
    // one that isn't done until two weeks after.
    classes: () => S.classes || [],
    classProgress,
    assignments: () => {
      const t0 = dayAt(now());
      return (S.classes || []).filter(k => k.role === 'member').flatMap(k => k.assignments.map(a => {
        const [y, mo, dd] = String(a.due).split('-').map(Number), at = new Date(y, (mo || 1) - 1, dd || 1).getTime(), p = classProgress(a.sharedId);
        return { ...a, classId: k.id, className: k.name, code: k.code, progress: p, done: doneOf(a.goal, p), at };
      })).filter(a => a.at >= t0 || (!a.done && a.at >= t0 - 14 * DAY)).sort((x, y) => x.at - y.at);
    },
    // You on the study network: your handle and your profile's page (once you have one).
    me: () => ({ handle: handle(), url: handle() ? '/@' + handle() : '', name: S.settings.name || (S.me && S.me.name) || 'You' }),
    // A clip's waveform and where it's at (sound.js), and the recording under way, if there is one.
    sound: c => sound.view(c),
    recording: () => sound.recording(),
    // Your picture wherever it shows (the sidebar, Today on a phone, Settings): your photo, your Google photo, or your
    // initial on your color.
    // With a theme on, the theme draws the circle and your initial (or a ring around your photo): skinned, art.
    chrome: () => {
      const due = S.decks.filter(d => !d.paused).reduce((n, d) => n + deckStat(d).due, 0), ph = photoOf(), T = skinNow(), color = ph === 'color';
      const initial = (((S.settings.name || (S.me && S.me.name) || '').trim() || 'You')[0]).toUpperCase();
      const news = net.unread();
      return { nav: { today: due ? String(due) : '', news: news ? String(news > 99 ? '99+' : news) : '', hasNews: news > 0, ...sideView(side, toggleSide) }, me: { bg: T && color ? 'transparent' : COLORS[S.settings.color] || COLORS[0], initial,
        color: color && !T, photo: ph === 'google' ? S.me.picture : ph === 'yours' ? S.settings.yourPhoto : '', href: '/you', skinned: !!T, art: T ? T.me(initial, !color) : null } };
    },
    settings: () => ({ ...S.settings, name: S.settings.name || (S.me && S.me.name) || 'You', sub: S.me ? S.me.email : 'Saved on this computer', signedIn: !!S.me,
      google: !!(S.me && S.me.picture), photo: photoOf(), check: !!S.ai.perms.check }),
    // Lucida Pro: online, from Stripe (the server's `me.plan`); on this computer everything is on.
    pro: isPro,
    theme,
    loadTheme: key => loadTheme(key, changed),
    plan: () => (S.me ? { ...(S.me.plan || { pro: false }), manage: S.me.manage || '' } : null),
    tags: () => [...new Set([...S.decks.flatMap(d => d.tags), ...S.cards.flatMap(c => c.tags)])],
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
      return { ...deckRow(d), cover: d.cover, grading: d.grading, fsrs: d.fsrs !== false, goal: d.goal, gapIdx: d.gapIdx ?? 3, steps: d.steps, perDay: d.perDay,
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
      // X goes straight back to the deck's page, or to Today from Today's review of every deck (the owner: "clicking 'x' on
      // flashcards or learn should take one back to decks not to the finish screen"). Every grade is saved already.
      const base = { deckId: d.id, done, left: q.length, total: done + q.length, counts, mode: d.grading, prog: S.settings.prog, piles: (d.piles || []).map(p => ({ name: p.name, n: cardsOf(d.id).filter(c => c.pile === p.name).length })),
        endHref: set ? setBack(set) : id ? '/deck/' + id : '/', setName: setName(set) };
      if (!cur) return { ...base, empty: true, card: null, queue: 'rev', iv: { again: '', hard: '', good: '', easy: '' }, fsrsOn: false, editHref: '' };
      const c = cur.card, t = now(), pv = scheduled(d) ? preview(c.srs, t, { goal: d.goal / 100, maxDays: GAPS[d.gapIdx ?? 3], steps: d.steps, w: wOf() }) : null;
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
    // Practice test: the one in progress (or its results), the setup's numbers for a deck or folder (`s`: { deckId } or { folderId }) and the
    // kinds turned on, and a deck's or folder's past results.
    test: testView,
    testPlan: (s, kinds) => { const sc = scopeOf(s), pool = testPool(sc); return { name: scopeName(sc), cards: pool.length, available: testAvailable(pool, kinds) }; },
    testKinds: () => TEST_CHIPS,
    tests: s => pastTests(scopeOf(s)),
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
      return { pct: rated.length ? Math.round(rated.filter(x => x.rating > 1).length / rated.length * 100) : 100, goal: d ? d.goal : S.settings.goal,
        cards: g.length, minutes: session ? Math.max(1, Math.round((now() - session.started) / MIN)) : 0, fresh: g.filter(x => x.was === 'new').length, split,
        streak: streaks().streak, next: nx ? nx.short + ' · ' + nx.n : 'Nothing due',
        moreHref: left ? reviewHref(session.deckId, session.pile, session.set) : session && session.set ? setBack(session.set) : d ? '/deck/' + d.id + '/card' : '/library', moreLabel: left ? 'Keep going · ' + left + ' left' : session && session.set ? (session.set.startsWith('cards:') ? 'Back to the test' : 'Back to stats') : 'Add cards',
        // Done goes back to the deck the session was from (the owner: "finishing a deck takes one back to 'today' page and
        // not deck page"), or to Today after reviewing every deck.
        doneHref: session && session.set ? setBack(session.set) : d ? '/deck/' + d.id : '/',
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
        remembered: rememberedPct(logs), goal: S.settings.goal, heat, forecast: forecast(14, S.decks, true), byDeck: S.decks.map(d => ({ name: d.name, ret: deckStat(d).ret })) };
    },
    // The AI apps: the ones that called the personal link (S.ai.clients) and the ones that signed in to Lucida (`apps`, each with an id
    // and what it is called; Disconnect ends one).
    ai: () => {
      const apps = connect.apps(), names = [...new Set([...Object.keys(S.ai.clients), ...apps.map(a => a.name)])], has = n => names.includes(n);
      return { url: location.origin + (S.me && S.ai.key ? '/mcp/' + S.ai.key : '/mcp'), perms: S.ai.perms, connected: names.length ? names.join(', ') : 'None yet', apps,
        clients: { claude: has('Claude'), openai: has('ChatGPT'), cursor: has('Cursor'), mcp: names.some(n => !['Claude', 'ChatGPT', 'Cursor'].includes(n)) } };
    },
    // Making cards (web/make.js), a deck's Guide, its Sources, and its Diagrams (web/diagrams.js).
    make, diagrams,
    guide: id => { const d = deckById(id); if (!d) return { deckId: '', text: '', at: 0, pages: [], can: false, studying: false };
      const g = guideOf(d), ro = shareOf(d).readOnly;
      return { deckId: d.id, text: g.text || '', at: g.at || 0, pages: (g.pages || []).map(p => ({ id: p.id, title: p.title, text: p.text || '', at: p.at || 0 })), can: !ro, studying: ro }; },
    guideHistory: async (id, page) => { try { const r = await fetch('/api/guide/history?deck=' + encodeURIComponent(id) + '&page=' + encodeURIComponent(page || 'main'), { cache: 'no-store' }); return r.ok ? (await r.json()).versions || [] : []; } catch { return []; } },
    sources: id => { const d = deckById(id); return d ? (d.sources || []).slice().reverse().map(sourceRow) : []; },
    sourceText: name => { if (!name) return ''; if (sourceTexts[name] === undefined) { sourceTexts[name] = null; fetch('/media/' + encodeURIComponent(name), { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).then(t => { sourceTexts[name] = t; changed(); }).catch(() => { sourceTexts[name] = ''; }); } return sourceTexts[name]; },
    // The page where an AI app asks to connect (/oauth/authorize).
    consent: connect.consent,
    href: (kind, id) => ({ decks: '/library', library: '/library', cards: '/library/cards', newDeck: '/decks/new', import: id ? '/deck/' + id + '/import' : '/decks/import', make: '/make' + (id ? '?deck=' + id : ''), guide: '/deck/' + id + '/guide', connect: '/connect', today: '/', done: '/review/done', stats: '/stats',
      review: id ? '/review/' + id : '/review', deck: '/deck/' + id })[kind] || '/'
  };
}
