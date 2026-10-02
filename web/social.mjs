// Lucida's study network (the owner's note: "GitHub + Instagram for study material"): public profiles, decks you share,
// studying or copying someone's deck, suggesting changes, the owner taking or skipping them, every change kept as a
// version, follows, saves, and news. The rules, as the canvas's "How sharing works" board puts them:
// - The cards are shared; your progress never is. Everyone keeps their own schedule, streak, and scores.
// - Every deck starts private: Private, Link only (anyone with the link), or Public (your profile, Discover, and search
//   engines).
// - Study a deck as it is (it follows the owner's changes) or make a copy (yours to change; it remembers where it came
//   from and, if you like, offers you the owner's changes to take or skip).
// - Anyone can suggest a change; nothing changes until the owner takes it. Helpers the owner picks edit directly.
// - An AI app works for one person: on your own deck it edits like you do; on someone else's it can only suggest.
// - Every change is a version in History, with who made it; you can go back to any version.
// - A class (classes.mjs) sees the decks added to it, even ones that are otherwise private.
// The tables are Supabase's (supabase/social.sql, and supabase/hardening.sql for what the security fixes added), reached
// through supa.mjs rest(); on this computer the same calls go
// to data/social.json (localrest.mjs). A person's own decks and cards stay in their library (store.mjs); a shared deck
// is a copy of the deck's cards in shared_cards, refreshed each time the owner's changes are saved.
import { rest, val, qval, inList, like, publicMedia, cloud } from './supa.mjs';
import { state, saved, onSave, onReviewed, afterSaving, withLibrary, withCredit, apply, uidOf, makeDeck, newId, isDev, isPro, cleanBoxes } from './store.mjs';
import { deckCards } from './order.js';
import { newCard } from './fsrs.js';
import { levelOf, subjectOf, yearOf } from './school.js';
import { schoolById, findSchools } from './schools.mjs';
import { createHash } from 'node:crypto';
import guide from './guide.js';
import { sharedDiagram, diagramsCopy } from './diagrams.mjs';

const MIN = 60000, DAY = 86400000;
const nowIso = () => new Date().toISOString();
const clean = (x, n = 5000) => String(x ?? '').slice(0, n);
const oneLine = (x, n) => clean(x, n * 2).replace(/\s+/g, ' ').trim().slice(0, n);
const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const plural = (n, w, ws = w + 's') => n + ' ' + (n === 1 ? w : ws);
const hash = x => createHash('sha1').update(JSON.stringify(x)).digest('base64url').slice(0, 12);
const err = (msg, status = 400) => Object.assign(new Error(msg), { status });
// What one app open (sync) may do for the decks you study: a time budget (what's left waits for the next open), and how many
// changed cards it copies, per deck and in all. A deck that changed more than that catches up over a few opens.
export const LIMITS = { syncMs: 6000, syncPage: 200, syncDeck: 1500, syncAll: 3000 };
// How many suggestions one person can have waiting on one deck (open reports have a limit too, in classes.mjs).
const OPEN_SUGGESTIONS = 5;

// Who someone is on the network: their user id online; on this computer "local", or a made-up person's dev_ id.
export const socialId = uid => uid || 'local';

// ---------- profiles ----------
// A handle is how people find you (lucida.cards/@alexkim): 3 to 30 lowercase letters, numbers, dots and underscores.
export const HANDLE_RE = /^[a-z0-9_.]{3,30}$/;
const TAKEN = new Set(['admin', 'lucida', 'support', 'help', 'team', 'settings', 'discover', 'library', 'stats', 'connect', 'about', 'api', 'app', 'www', 'mcp', 'pro', 'join', 'live', 'you', 'me', 'official', 'staff', 'root', 'null', 'undefined']);
// A handle that says it's Lucida, its team, or its support is taken too, even with dots, underscores, or numbers standing in
// for letters (lucida_team, adm1n, supp0rt).
const LOOKS_OFFICIAL = /lucida|admin|support|official|team/;
export const reservedHandle = h => {
  const x = String(h || '').toLowerCase();
  if (TAKEN.has(x)) return true;
  const plain = x.replace(/[._]/g, ''), letters = plain.replace(/0/g, 'o').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
  return [plain, letters, letters.replace(/1/g, 'i'), letters.replace(/1/g, 'l')].some(y => LOOKS_OFFICIAL.test(y));
};
const handleFrom = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_.]+/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, 24);
export async function profileOf(uid) { const r = await rest('/profiles?id=eq.' + val(uid) + '&select=*'); return (r && r[0]) || null; }
export async function profileByHandle(h) { const x = String(h || '').toLowerCase(); if (!HANDLE_RE.test(x)) return null; const r = await rest('/profiles?handle=eq.' + val(x) + '&select=*'); return (r && r[0]) || null; }
// What a profile shows of someone before they fill it in: their name (Settings, then their account), their picture
// (the one they picked in Settings, made public), and their color. Never their email address, not in the name and not in
// the handle: anyone can read both.
async function seedOf(uid, me, S) {
  const st = (S && S.settings) || {};
  const name = oneLine(st.name || (me && me.name) || (isDev(uid) ? uid.slice(4) : cloud() ? 'Learner' : 'You'), 60);
  const ph = st.photo, google = me && me.picture;
  let avatar = null;
  if ((ph === 'google' || (!ph && google)) && google) avatar = google;
  else if (ph === 'yours' && st.yourPhoto) {
    const file = String(st.yourPhoto).replace(/^\/media\//, '');
    avatar = publicMedia.on() && !isDev(uid) && uid !== 'local' ? await publicMedia.publish(uid, file).catch(() => null) : st.yourPhoto;
  }
  return { name, avatar, color: Math.min(5, Math.max(0, +st.color || 0)), base: handleFrom(st.name || (me && me.name)) || handleFrom(isDev(uid) ? uid.slice(4) : '') || 'learner' };
}
// Makes someone's profile the first time it's needed (sharing a deck, following, saving, suggesting), and keeps its
// name, picture, and color in step with Settings after that.
export async function ensureProfile(uid, me, S) {
  uid = socialId(uid);
  let p = await profileOf(uid);
  const seed = await seedOf(uid, me, S || state());
  if (!p) {
    const base = reservedHandle(seed.base) ? 'learner' : seed.base;
    for (let i = 0; i < 30 && !p; i++) {
      let handle = (base.length >= 3 ? base : base + 'learner').slice(0, 24) + (i ? String(i < 10 ? i + 1 : Math.floor(Math.random() * 9000) + 1000) : '');
      if (reservedHandle(handle)) continue;
      try { p = (await rest('/profiles', { method: 'POST', body: { id: uid, handle, name: seed.name, avatar: seed.avatar, color: seed.color }, prefer: 'return=representation' }))[0]; }
      catch (e) { if (e.status !== 409) throw e; p = await profileOf(uid); }
    }
    if (!p) throw err('Couldn’t make your profile. Try again.', 500);
  } else {
    const patch = {};
    if (p.name !== seed.name) patch.name = seed.name;
    if ((p.avatar || null) !== (seed.avatar || null)) patch.avatar = seed.avatar;
    if (p.color !== seed.color) patch.color = seed.color;
    if (Object.keys(patch).length) { patch.updated_at = nowIso(); await rest('/profiles?id=eq.' + val(uid), { method: 'PATCH', body: patch }); Object.assign(p, patch); }
  }
  // The library keeps its handle, so the app can make links to your profile and decks without asking.
  const L = state();
  if (L && (!L.profile || L.profile.handle !== p.handle)) { L.profile = { handle: p.handle }; saved(); }
  return p;
}
// A person's school, level and year, and whether they show on their profile (Profile → Edit). The school is picked from the list
// (`schoolId`: its name comes from the list), or typed ("Other": `school`); a high school student has a level and nothing else, since
// there is no list of high schools and they may be minors. Nothing here is public until `showSchool` is on, and none of it makes a
// profile findable.
async function schoolPatch(patch, was) {
  const next = {};
  if ('level' in patch) next.level = levelOf(patch.level);
  if ('year' in patch) next.year = yearOf(patch.year);
  if ('showSchool' in patch) next.school_show = patch.showSchool === true;
  if ('schoolId' in patch || 'school' in patch) {
    const id = 'schoolId' in patch ? String(patch.schoolId ?? '').trim() : '';
    if (id) {
      const row = await schoolById(id);
      if (!row) throw err('Pick a school from the list.');
      next.school_id = row[0]; next.school = row[1];
    } else { next.school_id = ''; next.school = oneLine(patch.school, 60); }
  }
  if (('level' in next ? next.level : was.level) === 'highschool') { next.school_id = ''; next.school = ''; }
  return next;
}
// Editing your profile (Settings and your profile page): your handle, a short bio, your subject, and your school.
export async function updateProfile(uid, me, patch) {
  const p = await ensureProfile(uid, me);
  const next = {};
  if ('handle' in patch) {
    const h = String(patch.handle || '').trim().replace(/^@/, '').toLowerCase();
    if (!HANDLE_RE.test(h)) throw err('Use 3 to 30 letters, numbers, dots, or underscores.');
    if (h !== p.handle) { if (reservedHandle(h)) throw err('That name is taken. Try another.'); next.handle = h; }
  }
  if ('bio' in patch) next.bio = clean(patch.bio, 160).replace(/\s+\n/g, '\n').trim();
  if ('subject' in patch) next.subject = oneLine(patch.subject, 60);
  if ('featured' in patch) next.featured = (Array.isArray(patch.featured) ? patch.featured : []).map(x => clean(x, 40)).slice(0, 3);
  // Editing your profile is choosing to be found: it shows in search from now on. (Your school isn't that: it stays yours until you
  // switch it on, and even then it's on your profile, never a list.)
  const visible = Object.keys(next).length > 0;
  Object.assign(next, await schoolPatch(patch, p));
  if (!Object.keys(next).length) return p;
  next.updated_at = nowIso();
  if (visible) next.listed = true;
  try { await rest('/profiles?id=eq.' + val(p.id), { method: 'PATCH', body: next }); }
  catch (e) { if (e.status === 409) throw err('That name is taken. Try another.'); throw e; }
  Object.assign(p, next);
  if (next.handle) { state().profile = { handle: p.handle }; saved(); }
  if (['school_show', 'school_id', 'school', 'level'].some(k => k in next)) await dropOwnSchool(p);
  return p;
}
// A deck's school that started as its owner's (not one they picked for the deck) goes when they stop showing their school, take it
// off, change it, or become a high school student: "Only you can see it unless this is on" stays true of what was copied from it.
async function dropOwnSchool(p) {
  const keep = p.school_show && p.school && p.level !== 'highschool';
  await rest('/shared_decks?owner=eq.' + val(p.id) + '&school_auto=is.true' + (keep ? '&school=neq.' + exact(p.school) : ''), { method: 'PATCH', body: { school_id: '', school: '', school_auto: false } });
}
const personOf = p => (p ? { id: p.id, handle: p.handle, name: p.name, avatar: p.avatar || null, color: p.color || 0, verified: p.verified || '', kind: p.kind || 'person' } : null);
// What pages get of a person: never their account id.
const face = p => { if (!p) return null; const { id, ...rest } = personOf(p); return rest; };

// ---------- sharing a deck ----------
// What a shared deck's page shows of a card: its content and how it was made. Never its schedule or your answers.
const CONTENT = ['kind', 'front', 'back', 'text', 'note', 'image', 'audio', 'wave', 'speak', 'lang', 'auto', 'boxes', 'occ', 'cloze', 'box', 'group', 'tags'];
const contentOf = c => Object.fromEntries(CONTENT.map(k => [k, c[k] ?? null]));
// Pictures and sound on shared cards are links anyone can open (supa.mjs publicMedia). Only a file name Lucida made
// (letters, numbers, - and _, then an extension) is ever copied into storage; anything else on a card is left out.
const MEDIA_NAME = /^[\w-]+\.\w+$/;
async function mediaFor(uid, sh, c) {
  const out = {};
  for (const k of ['image', 'audio']) {
    const v = c[k];
    if (typeof v !== 'string' || !v.startsWith('/media/') || !publicMedia.on() || isDev(uid) || uid === 'local') continue;
    const name = v.slice(7);
    if (!MEDIA_NAME.test(name)) { out[k] = null; continue; }
    out[k] = publicMedia.url(uid, name);
    if (!sh.media.includes(name)) { await publicMedia.publish(uid, name); sh.media.push(name); sh.mediaDirty = true; }
  }
  return out;
}
// A deck's Guide (and its extra pages) as it is shared: the words, with the pictures in them made public like a card's (the
// Markdown's /media/<name> links become links anyone can open), and how many Sources the deck was made from (just the number:
// the files and their names stay private, since they may be someone else's work). Null while the deck has neither.
async function guideFor(uid, sh, d) {
  const g = d.guide || {}, n = (d.sources || []).length, made = (d.diagrams || []).map(sharedDiagram).filter(Boolean);
  const pages = [{ id: 'main', title: 'Guide', text: g.text || '' }, ...(g.pages || []).map(p => ({ id: p.id, title: p.title, text: p.text || '' }))];
  if (!pages.some(p => p.text.trim()) && !n && !made.length) return null;
  for (const p of pages) {
    const names = [...p.text.matchAll(/\]\(\/media\/([\w-]+\.\w+)(?=[\s)"'])/g)].map(m => m[1]);
    if (!names.length || !publicMedia.on() || isDev(uid) || uid === 'local') continue;
    for (const name of new Set(names)) {
      if (!sh.media.includes(name)) { await publicMedia.publish(uid, name); sh.media.push(name); sh.mediaDirty = true; }
      p.text = p.text.split('/media/' + name).join(publicMedia.url(uid, name));
    }
  }
  // The tables and mind maps made from the deck's cards go with it (diagrams.mjs sharedDiagram); the pictures of its lectures and the ones uploaded never do.
  return { pages, sources: n, ...(made.length ? { diagrams: made } : {}) };
}
// A shared deck's Guide as the guide of a deck in someone's library (studying it, or a copy of it).
const guideCopy = g => {
  const pages = (g && Array.isArray(g.pages) ? g.pages : []).filter(p => p && typeof p.text === 'string'), t = Date.now();
  if (!pages.length) return undefined;
  const main = pages.find(p => p.id === 'main') || { text: '' };
  return { text: clean(main.text, 40000), at: t, pages: pages.filter(p => p.id !== 'main').slice(0, 10).map(p => ({ id: clean(p.id, 30), title: clean(p.title, 80), text: clean(p.text, 40000), at: t })) };
};
// The pictures a public Guide may show: ones this app made public (its public storage), or, on this computer, its own /media.
const publicImage = src => {
  if (/^\/media\/[\w-]+\.(png|jpe?g|gif|webp)$/i.test(src)) return publicMedia.on() ? '' : src;
  try { const u = new URL(src), base = new URL(publicMedia.url('00000000-0000-0000-0000-000000000000', 'x.png')); return u.origin === base.origin && u.pathname.startsWith('/storage/v1/object/public/shared/') && /\.(png|jpe?g|gif|webp)$/i.test(u.pathname) ? src : ''; } catch { return ''; }
};
// A deck's address. A public deck is at its owner's name and its own (lucida.cards/@maria/cell-biology); every other deck
// (Link only, or a class's) only at its lasting link, /d/<id>, which nobody can guess.
const urlOf = (handle, slug) => '/@' + handle + '/' + slug;
const deckUrl = (sh, o) => (sh.visibility === 'public' && o ? urlOf(o.handle, sh.slug) : '/d/' + sh.id);
const coverOf = d => ({ style: d.cover.style || 'mix', round: d.cover.round || 0, seed: d.cover.seed || d.name, image: d.cover.image && !String(d.cover.image).startsWith('/media/') ? d.cover.image : null, $local: d.cover.image || null });
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'deck';

// Changes between two versions of a card, sorted into what they mean for the people studying it: a new card, a new
// answer (they'll learn it again), a new question, or a small fix (their schedule stays).
const lev = (a, b) => { if (a === b) return 0; if (Math.abs(a.length - b.length) > 8) return 99; const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };
// Comparing two texts letter by letter takes time in proportion to their lengths multiplied, so a text longer than this isn't
// compared at all: if it differs, it counts as changed. (A deck owner could otherwise rewrite thousands of long cards and
// make every studier's app open crawl.)
const BIG = 300;
const small = (a, b) => {
  a = String(a || ''); b = String(b || '');
  if (a === b) return true;
  const x = a.toLowerCase().replace(/\s+/g, ' ').trim(), y = b.toLowerCase().replace(/\s+/g, ' ').trim();
  if (x === y) return true;
  if (x.length > BIG || y.length > BIG) return false;
  return lev(x, y) <= Math.max(2, Math.floor(Math.max(x.length, y.length) * 0.08));
};
// The [[blanks]] of a fill-in-the-blank text (where each starts and ends), found in one pass. (A regular expression for
// them takes time in proportion to the square of the text's length when the text has many "[[" and no "]".)
const blankSpans = text => {
  const t = String(text || ''), out = [];
  for (let i = t.indexOf('[['); i >= 0;) {
    const j = t.indexOf(']', i + 2);
    if (j < 0) break;
    if (j > i + 2 && t[j + 1] === ']') { out.push([i, j + 2]); i = t.indexOf('[[', j + 2); } else i = t.indexOf('[[', j + 1);
  }
  return out;
};
export const answerOf = d => {
  if (d.kind === 'cloze') { const t = String(d.text || ''); return blankSpans(t).map(([a, b]) => t.slice(a, b)).join('|'); }
  return d.box != null ? ((d.boxes || []).find(b => b.id === d.box) || {}).label || '' : d.back || '';
};
export const questionOf = d => {
  if (d.kind !== 'cloze') return d.front || '';
  const t = String(d.text || '');
  let out = '', at = 0;
  for (const [a, b] of blankSpans(t)) { out += t.slice(at, a) + '[]'; at = b; }
  return out + t.slice(at);
};
export function kindOf(before, after) {
  if (!before) return 'new';
  if (!after) return 'remove';
  if (before.kind !== after.kind) return 'answer';
  const a0 = answerOf(before), a1 = answerOf(after), q0 = questionOf(before), q1 = questionOf(after);
  if (a0 !== a1 && !small(a0, a1)) return 'answer';
  if (q0 !== q1 && !small(q0, q1)) return 'question';
  if (a0 !== a1 || q0 !== q1) return 'typo';
  if (before.image !== after.image || before.audio !== after.audio) return 'media';
  return 'edit';
}
const WORDS = { new: ['new card', 'new cards'], answer: ['answer fixed', 'answers fixed'], question: ['question reworded', 'questions reworded'], typo: ['small fix', 'small fixes'], media: ['new picture or sound', 'new pictures or sounds'], edit: ['note or tag changed', 'notes or tags changed'], remove: ['card removed', 'cards removed'] };
export function summaryOf(changes) {
  const n = {};
  for (const c of changes) n[c.kind] = (n[c.kind] || 0) + 1;
  return Object.keys(WORDS).filter(k => n[k]).map(k => n[k] + ' ' + WORDS[k][n[k] === 1 ? 0 : 1]).join(', ');
}
// One version's changes to the same card fold into one: an added card edited again stays "new" with its newest words,
// and one added then removed was never there.
function merge(list, more) {
  const by = new Map(list.map(c => [c.card, { ...c }]));
  for (const c of more) {
    const was = by.get(c.card);
    if (!was) { by.set(c.card, c); continue; }
    const before = was.before || null, after = c.after || null;
    if (!before && !after) { by.delete(c.card); continue; }
    by.set(c.card, { card: c.card, op: !before ? 'add' : !after ? 'remove' : 'edit', before, after, kind: kindOf(before, after) });
  }
  return [...by.values()].filter(c => c.op !== 'edit' || hash(contentOf(c.before)) !== hash(contentOf(c.after)));
}

async function sharedRow(id, cols = '*') { const r = await rest('/shared_decks?id=eq.' + val(id) + '&select=' + cols); return (r && r[0]) || null; }
async function allCards(sharedId) {
  const out = [];
  for (let off = 0; off < 20000; off += 1000) {
    const rows = await rest('/shared_cards?shared_id=eq.' + val(sharedId) + '&deleted=is.false&select=id,pos,data&order=pos.asc&limit=1000&offset=' + off);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
async function cardsById(sharedId, ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const rows = await rest('/shared_cards?shared_id=eq.' + val(sharedId) + '&id=in.' + inList(ids.slice(i, i + 200)) + '&select=id,data,deleted');
    for (const r of rows) out.set(r.id, r);
  }
  return out;
}
// A new version in the deck's History: who made it (and through which AI app), what changed, in plain words. Quick
// edits by the same person run together as one version, so typing doesn't fill History with steps, and so do the
// changes the owner takes from one person in one sitting (Take it, then Take all), one version crediting them.
// `summary` can be a function of how many changes the version has.
async function addVersion(sharedId, changes, { by, ai = '', kind = 'edit', summary = '', joinable = true }) {
  ai = clean(ai, 60);
  const last = (await rest('/deck_versions?shared_id=eq.' + val(sharedId) + '&select=id,version,author,ai,kind,changes,created_at&order=version.desc&limit=1'))[0];
  const words = list => (typeof summary === 'function' ? summary(list.length) : summary || summaryOf(list));
  if (joinable && last && last.kind === kind && ['edit', 'ai', 'suggestion'].includes(kind) && last.author === (by && by.id) && last.ai === ai && Date.now() - Date.parse(last.created_at) < 30 * MIN) {
    const all = merge(last.changes || [], changes);
    // Changes that undid each other (a typo made and fixed again) leave no version at all.
    if (!all.length) {
      await rest('/deck_versions?id=eq.' + val(last.id), { method: 'DELETE' });
      await rest('/shared_decks?id=eq.' + val(sharedId), { method: 'PATCH', body: { version: last.version - 1 } });
      return last.version - 1;
    }
    await rest('/deck_versions?id=eq.' + val(last.id), { method: 'PATCH', body: { changes: all, n_changes: all.length, summary: words(all) } });
    return last.version;
  }
  for (let n = (last ? last.version : 0) + 1, tries = 0; tries < 5; n++, tries++) {
    try {
      await rest('/deck_versions', { method: 'POST', body: { shared_id: sharedId, version: n, author: by ? by.id : null, author_name: by ? by.name : '', ai, kind, summary: words(changes), changes, n_changes: changes.length } });
      await rest('/shared_decks?id=eq.' + val(sharedId), { method: 'PATCH', body: { version: n } });
      return n;
    } catch (e) { if (e.status !== 409) throw e; }
  }
  throw err('Couldn’t save this version. Try again.', 500);
}

// Shares one deck's newest cards: every card that changed since the last time goes up (the library remembers each
// shared card's fingerprint in deck.share.pub), with a version saying what changed. Runs just before the owner's
// library saves (store.mjs onSave), for every shared deck a request changed.
async function publish(uid, d, info = {}) {
  const S = state(), sh = d.share;
  const row = await sharedRow(sh.id, 'id,rev,media,visibility');
  if (!row) { delete d.share; saved(); return; }
  const box = { media: row.media || [], mediaDirty: false };
  const cards = deckCards(d, S.cards).filter(c => !c.pending);
  const pub = sh.pub || {}, next = {}, changed = [];
  for (const [i, c] of cards.entries()) {
    const data = { ...contentOf(c), ...(await mediaFor(uid, box, c)), source: c.source === 'you' ? '' : c.source || '', trail: c.trail || [], explain: c.explain ? clean(c.explain.text, 2000) : '', quiz: c.quiz || null };
    const h = hash([data, i]);
    next[c.id] = h;
    if (pub[c.id] !== h) changed.push({ id: c.id, pos: i, data });
  }
  const removed = Object.keys(pub).filter(id => !(id in next));
  const meta = { name: d.name, tags: d.tags, cover: coverOf(d), guide: await guideFor(uid, box, d) }, metaH = hash(meta);
  if (!changed.length && !removed.length && sh.meta === metaH) return;
  const rev = (row.rev || 0) + 1;
  // What those cards said before, for the version's before-and-after.
  const was = changed.length || removed.length ? await cardsById(sh.id, [...changed.map(x => x.id), ...removed]) : new Map();
  for (let i = 0; i < changed.length; i += 200) {
    await rest('/shared_cards?on_conflict=shared_id,id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: changed.slice(i, i + 200).map(x => ({ shared_id: sh.id, id: x.id, pos: x.pos, data: x.data, deleted: false, rev, updated_at: nowIso() })) });
  }
  for (let i = 0; i < removed.length; i += 200) await rest('/shared_cards?shared_id=eq.' + val(sh.id) + '&id=in.' + inList(removed.slice(i, i + 200)), { method: 'PATCH', body: { deleted: true, rev, updated_at: nowIso() } });
  const patch = { rev, card_count: cards.length, ...meta, updated_at: nowIso() };
  if (box.mediaDirty) patch.media = box.media;
  await rest('/shared_decks?id=eq.' + val(sh.id), { method: 'PATCH', body: patch });
  // Only real changes to what cards say make a version (moving cards around, or AI extras like explanations, don't).
  const diffs = [];
  for (const x of changed) {
    const b = was.get(x.id), before = b && !b.deleted ? b.data : null;
    if (before && hash(contentOf(before)) === hash(contentOf(x.data))) continue;
    diffs.push({ card: x.id, op: before ? 'edit' : 'add', before, after: x.data, kind: kindOf(before, x.data) });
  }
  for (const id of removed) { const b = was.get(id); if (b && !b.deleted) diffs.push({ card: id, op: 'remove', before: b.data, after: null, kind: 'remove' }); }
  if (diffs.length && !info.first) {
    const credit = info.credit, owner = info.owner || personOf(await profileOf(uid));
    if (credit && credit.suggestion) await addVersion(sh.id, diffs, { by: credit, kind: 'suggestion', summary: n => 'Took ' + plural(n, 'change') + ' from ' + credit.name });
    else if (credit && credit.restore) await addVersion(sh.id, diffs, { by: owner, kind: 'restore', summary: 'Went back to version ' + credit.restore, joinable: false });
    else await addVersion(sh.id, diffs, { by: owner, ai: clean(info.ai, 60), kind: info.ai ? 'ai' : 'edit' });
    if (!credit || !credit.quiet) await tellFollowers(sh.id, uid, owner, diffs);
  }
  sh.pub = next; sh.meta = metaH; sh.rev = rev;
  saved();
}
// Everyone who asked for this deck's updates hears about a new version (people studying it get the changes
// themselves, so they aren't told).
async function tellFollowers(sharedId, ownerId, owner, diffs) {
  const subs = await rest('/subscriptions?shared_id=eq.' + val(sharedId) + '&or=' + encodeURIComponent('(mode.eq.watch,and(mode.eq.copy,updates.is.true))') + '&select=user_id&limit=2000');
  const users = [...new Set(subs.map(s => s.user_id))].filter(u => u !== ownerId);
  if (!users.length) return;
  const recent = await rest('/notifications?shared_id=eq.' + val(sharedId) + '&kind=eq.update&read=is.false&created_at=gt.' + val(new Date(Date.now() - 6 * 3600000).toISOString()) + '&select=user_id');
  const told = new Set(recent.map(r => r.user_id));
  await notify(users.filter(u => !told.has(u)).map(u => ({ user_id: u, kind: 'update', actor: ownerId, actor_name: owner ? owner.name : '', shared_id: sharedId, data: { summary: summaryOf(diffs), n: diffs.length } })));
}
onSave(async L => {
  const S = L.S, uid = socialId(L.uid);
  for (const [deckId, info] of L.touched) {
    if (info.gone) { await unshare(info.gone).catch(e => console.error('unshare', e)); continue; }
    if (info.left) { const sharedId = info.left; afterSaving(async () => { await rest('/subscriptions?user_id=eq.' + val(uid) + '&shared_id=eq.' + val(sharedId) + '&deck_id=eq.' + val(deckId), { method: 'DELETE' }).catch(() => {}); await countFollowing(sharedId).catch(() => {}); }); continue; }
    const d = S.decks.find(x => x.id === deckId);
    if (d && d.share && d.share.vis !== 'private') await publish(uid, d, info);
  }
});
async function unshare(sharedId) {
  // People who study it keep their cards (their deck becomes their own); the deck's page and History go.
  await rest('/shared_decks?id=eq.' + val(sharedId), { method: 'DELETE' });
}
async function freeSlug(owner, name, except) {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const slug = base + (i ? '-' + (i + 1) : '');
    const hit = await rest('/shared_decks?owner=eq.' + val(owner) + '&slug=eq.' + val(slug) + '&select=id');
    if (!hit.length || hit[0].id === except) return slug;
  }
  return base + '-' + Date.now().toString(36);
}
// Deck settings → Sharing: who can see the deck, a line about it, who helps keep it up, and whether helpers can take
// suggestions too (a community deck). Runs in the owner's library.
export async function shareDeck(uid, me, deckId, o = {}) {
  const S = state(), d = S.decks.find(x => x.id === deckId);
  if (!d) throw err('No such deck');
  if (d.link && d.link.mode === 'study' && !d.link.gone) throw err('This deck is ' + d.link.owner.name + '’s. Make a copy to share your own version.');
  const owner = await ensureProfile(uid, me, S), sid = owner.id;
  let vis = ['private', 'link', 'public', 'class'].includes(o.visibility) ? o.visibility : d.share ? d.share.vis : 'link';
  // A deck in a class (classes.mjs) stays seen by its classes when it's otherwise private: that's visibility 'class'.
  if (vis === 'private' && d.share && (await rest('/class_decks?shared_id=eq.' + val(d.share.id) + '&select=class_id&limit=1')).length) vis = 'class';
  // A deck hidden after a report stays hidden: its owner can't share it again.
  const sharedId = d.share ? d.share.id : sharedIdOf(sid, d);
  if (vis !== 'private') { const row = await sharedRow(sharedId, 'id,hidden'); if (row && row.hidden) throw err('This deck was hidden after a report.', 403); }
  // Sharing a deck publicly is choosing to be found: the profile shows in search from then on.
  if (vis === 'public' && !owner.listed) { await rest('/profiles?id=eq.' + val(sid), { method: 'PATCH', body: { listed: true } }); owner.listed = true; }
  const extra = {};
  if ('description' in o) extra.description = clean(o.description, 300).trim();
  if ('maintained' in o) extra.maintained = o.maintained === 'community' ? 'community' : 'creator';
  if ('helpers' in o) extra.helpers = await helpersFrom(o.helpers, sid);
  // A public deck's labels (level, subject, school), which Discover narrows by. Making a deck public the first time gives it its
  // owner's school, if they show it; the owner can clear it, and it stays cleared.
  const was = d.share ? await sharedRow(d.share.id, 'id,level,labeled') : null;
  Object.assign(extra, await deckLabels(o, was, vis === 'public' && (!d.share || d.share.vis !== 'public') && !(was && was.labeled) ? owner : null));
  if (!d.share) {
    if (vis === 'private') return { vis };
    // The same deck always gets the same id, so a request that runs again (its save lost a race) reuses it.
    const id = sharedId, slug = await freeSlug(sid, d.name, id);
    await rest('/shared_decks?on_conflict=id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { id, owner: sid, deck_id: d.id, slug, visibility: vis, name: d.name, tags: d.tags, cover: coverOf(d), card_count: 0, rev: 0, ...extra } });
    await rest('/shared_cards?shared_id=eq.' + val(id), { method: 'DELETE' });
    d.share = { id, vis, slug, pub: {}, rev: 0 };
    await publish(sid, d, { first: true });
    await addVersion(id, [], { by: personOf(owner), kind: 'made', summary: 'Shared ' + plural(S.cards.filter(c => c.deckId === d.id && !c.pending).length, 'card'), joinable: false });
    saved();
    return { id, vis, slug };
  }
  const patch = { visibility: vis, updated_at: nowIso(), ...extra };
  // A renamed deck keeps its old link working until it's shared under a new name.
  await rest('/shared_decks?id=eq.' + val(d.share.id), { method: 'PATCH', body: patch });
  d.share.vis = vis;
  // Changes made while it was private go up now.
  if (vis !== 'private') await publish(sid, d, {});
  saved();
  return { id: d.share.id, vis, slug: d.share.slug };
}
// The labels a deck's sharing settings send: `level`, `subject`, and the school (`schoolId` from the list, or `school` typed). A school
// typed on a high school deck is left out, like a person's (no high school names), and a high school deck doesn't start with its owner's
// college. `start` is the owner's profile when this is the first time the deck goes public: its school becomes the deck's, if they
// show it (`school_auto`: it was copied, not picked; it follows their profile until they pick one for the deck themselves).
async function deckLabels(o, was, start) {
  const out = {};
  if ('level' in o) out.level = levelOf(o.level);
  if ('subject' in o) out.subject = subjectOf(o.subject);
  const school = 'schoolId' in o || 'school' in o;
  if (school) {
    const id = 'schoolId' in o ? String(o.schoolId ?? '').trim() : '';
    if (id) {
      const row = await schoolById(id);
      if (!row) throw err('Pick a school from the list.');
      out.school_id = row[0]; out.school = row[1];
    } else { out.school_id = ''; out.school = oneLine(o.school, 60); }
    if (!out.school_id && ('level' in out ? out.level : was && was.level) === 'highschool') out.school = '';
    out.school_auto = false;
  } else if (start && start.school_show && start.school && start.level !== 'highschool' && ('level' in out ? out.level : was && was.level) !== 'highschool') Object.assign(out, { school_id: start.school_id || '', school: start.school, school_auto: true });
  if (Object.keys(out).length) out.labeled = true;
  return out;
}
const sharedIdOf = (owner, d) => 's' + createHash('sha1').update(owner + ':' + d.id).digest('hex').slice(0, 14);
async function helpersFrom(list, owner) {
  const handles = [...new Set((Array.isArray(list) ? list : []).map(h => String(h || '').trim().replace(/^@/, '').toLowerCase()).filter(h => HANDLE_RE.test(h)))].slice(0, 20);
  if (!handles.length) return [];
  const rows = await rest('/profiles?handle=in.' + inList(handles) + '&select=id,handle,name');
  const missing = handles.filter(h => !rows.some(r => r.handle === h));
  if (missing.length) throw err('No one is called @' + missing[0] + ' yet.');
  return rows.filter(r => r.id !== owner).map(r => ({ id: r.id, handle: r.handle, name: r.name }));
}

// ---------- studying and copying ----------
const OPEN = ['link', 'public'];
// A deck shared with a class (visibility 'class', see classes.mjs) is seen only by the people in a class it's in.
export async function classSees(sharedId, uid) {
  if (!uid) return false;
  const rows = await rest('/class_decks?shared_id=eq.' + val(sharedId) + '&select=class_id&limit=500');
  if (!rows.length) return false;
  return (await rest('/class_members?user_id=eq.' + val(uid) + '&class_id=in.' + inList(rows.map(r => r.class_id)) + '&select=class_id&limit=1')).length > 0;
}
// A deck hidden after a report is seen only by its owner, whatever its visibility says.
export const canSee = async (sh, uid) => !!sh && (sh.owner === uid || (!sh.hidden && (OPEN.includes(sh.visibility) || (sh.visibility === 'class' && await classSees(sh.id, uid)))));
// A shared card, as a card in your library: the owner's content, with your own fresh schedule. `origin` ties it to the
// shared card, and `base` remembers what it said, so a copy can tell your edits from the owner's.
const fromShared = (r, deckId) => {
  const d = r.data || {};
  return { id: newId('c'), deckId, ...Object.fromEntries(CONTENT.map(k => [k, d[k] ?? (k === 'tags' ? [] : ['front', 'back', 'text', 'note', 'speak', 'lang'].includes(k) ? '' : null)])),
    auto: d.auto !== false, tags: Array.isArray(d.tags) ? d.tags : [], source: d.source || 'shared', pending: false, created: Date.now(), srs: newCard(), pile: null,
    trail: d.trail || [], explain: d.explain ? { text: d.explain, by: 'shared' } : undefined, quiz: d.quiz || undefined, origin: r.id, base: hash(contentOf(d)) };
};
// How many different people study or copy a deck (the deck_people view, supabase/hardening.sql): someone who copies it 25
// times is one person, so no one can push a deck up Discover by copying it again and again. Without the view (before the
// SQL ran) it falls back to counting rows.
async function peopleOf(sharedId) {
  try {
    const r = (await rest('/deck_people?shared_id=eq.' + val(sharedId) + '&select=learners,copies'))[0];
    return { learners: r ? r.learners : 0, copies: r ? r.copies : 0 };
  } catch (e) {
    console.error('deck_people', e.message);
    const [learn, copy] = await Promise.all([
      rest('/subscriptions?shared_id=eq.' + val(sharedId) + '&mode=eq.study&select=user_id&limit=1', { count: true }),
      rest('/subscriptions?shared_id=eq.' + val(sharedId) + '&mode=eq.copy&select=user_id&limit=1', { count: true })]);
    return { learners: learn.total, copies: copy.total };
  }
}
async function countFollowing(sharedId) {
  const [people, stars] = await Promise.all([peopleOf(sharedId), rest('/stars?shared_id=eq.' + val(sharedId) + '&select=user_id&limit=1', { count: true })]);
  const n = { learners: people.learners, copies: people.copies, stars: stars.total };
  await rest('/shared_decks?id=eq.' + val(sharedId), { method: 'PATCH', body: { ...n, score: n.stars * 3 + n.learners * 2 + n.copies * 2 } });
  return n;
}
// "Study": the deck joins your library as it is, and follows the owner's changes. `copy`: your own deck to change,
// with where it came from, and (if `updates`) the owner's later changes offered to you. Runs in your library.
export async function addShared(uid, me, sharedId, { copy = false, name = '', folder = null, updates = true } = {}) {
  const sid = socialId(uid), S = state();
  const sh = await sharedRow(sharedId);
  if (!(await canSee(sh, sid))) throw err('This deck isn’t shared anymore.', 404);
  if (sh.owner === sid) throw err('It’s already your deck.');
  const had = S.decks.find(d => d.link && d.link.id === sharedId && d.link.mode === (copy ? 'copy' : 'study') && !d.link.gone);
  if (had && !copy) return { deckId: had.id };
  const [owner, rows] = await Promise.all([profileOf(sh.owner), allCards(sharedId)]);
  await ensureProfile(uid, me, S);
  const d = makeDeck({ name: copy && name ? name : sh.name, tags: sh.tags, folder });
  d.cover = { style: (sh.cover && sh.cover.style) || 'mix', round: (sh.cover && sh.cover.round) || 0, image: (sh.cover && sh.cover.image) || null, seed: (sh.cover && sh.cover.seed) || sh.name };
  const g = guideCopy(sh.guide); if (g) d.guide = g;
  const dg = diagramsCopy(sh.guide); if (dg.length) d.diagrams = dg;
  d.link = { id: sharedId, mode: copy ? 'copy' : 'study', rev: sh.rev, slug: sh.slug, vis: sh.visibility, owner: { handle: owner ? owner.handle : '', name: owner ? owner.name : '' }, updates: copy ? !!updates : true, pending: [] };
  const cards = rows.map(r => fromShared(r, d.id));
  S.cards.push(...cards);
  d.cardOrder = cards.map(c => c.id);
  saved();
  afterSaving(async () => {
    await rest('/subscriptions?on_conflict=user_id,shared_id,deck_id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { user_id: sid, shared_id: sharedId, deck_id: d.id, mode: copy ? 'copy' : 'study', updates: copy ? !!updates : true, last_seen: nowIso() } });
    await countFollowing(sharedId);
  });
  return { deckId: d.id };
}
// Your shared decks that changed since you last looked (asked when the app opens): a deck you study takes the owner's
// changes (a small fix keeps your schedule for that card; a new answer brings it back as new, so you learn the right
// thing), and a copy gets them waiting in `link.pending` for you to take or skip. A deck that stopped being shared
// becomes yours ("from Maria Santos").
export async function sync(uid) {
  const S = state(), t0 = Date.now();
  let n = 0;
  // Account ids stay on the server: a library from before that still holds each owner's.
  for (const d of S.decks) if (d.link && d.link.owner && 'id' in d.link.owner) { delete d.link.owner.id; n++; }
  const linked = S.decks.filter(d => d.link && !d.link.gone && (d.link.mode === 'study' || d.link.updates));
  if (!linked.length) { if (n) saved(); return n; }
  const ids = [...new Set(linked.map(d => d.link.id))];
  const rows = await rest('/shared_decks?id=in.' + inList(ids) + '&select=id,rev,visibility,hidden,name,tags,cover,slug,owner');
  // A class's deck stays yours to study while you're in a class it's in; after you leave, it's yours to keep.
  const inClass = new Set();
  for (const r of rows) if (r.visibility === 'class' && !r.hidden && await classSees(r.id, socialId(uid))) inClass.add(r.id);
  let room = LIMITS.syncAll;
  for (const d of linked) {
    const sh = rows.find(r => r.id === d.link.id);
    if (!sh || sh.hidden || !(OPEN.includes(sh.visibility) || inClass.has(sh.id))) { d.link.gone = true; d.link.pending = []; delete d.link.cur; n++; continue; }
    // Whether its deck is public decides how the app links to it (by its owner's name, or at /d/<id>).
    if (d.link.vis !== sh.visibility) { d.link.vis = sh.visibility; n++; }
    if (sh.rev <= d.link.rev) continue;
    // Out of time, or already copied a lot: what's left waits for the next open.
    if (room <= 0 || Date.now() - t0 > LIMITS.syncMs) break;
    room -= (await copyChanges(S, d, sh, Math.min(room, LIMITS.syncDeck), t0)).took;
    n++;
  }
  if (n) saved();
  return n;
}
// Copies a deck's newest changes into your library, oldest first, a page at a time, from where the last open stopped
// (`link.cur`: the last change copied), for at most `cap` cards and until the time is up. When all of them are copied the
// deck is up to date (`link.rev`); otherwise the rest waits for the next open.
async function copyChanges(S, d, sh, cap, t0) {
  const link = d.link, since = link.rev, study = link.mode === 'study', pos = new Map();
  let cur = link.cur && typeof link.cur.id === 'string' && link.cur.rev >= since ? link.cur : null, took = 0, done = false;
  if (study) {
    applyMeta(d, sh);
    const row = ((await sharedRow(sh.id, 'guide')) || {}).guide, g = guideCopy(row), dg = diagramsCopy(row);
    if (g) d.guide = g; else delete d.guide;
    if (dg.length) d.diagrams = dg; else delete d.diagrams;
  }
  while (true) {
    const size = Math.min(LIMITS.syncPage, cap - took);
    if (size <= 0 || Date.now() - t0 > LIMITS.syncMs) break;
    const after = cur ? '&or=' + encodeURIComponent('(rev.gt.' + cur.rev + ',and(rev.eq.' + cur.rev + ',id.gt.' + qvalRaw(cur.id) + '))') : '';
    const part = await rest('/shared_cards?shared_id=eq.' + val(sh.id) + '&rev=gt.' + since + after + '&select=id,pos,data,deleted,rev&order=rev.asc,id.asc&limit=' + size);
    if (study) applyCards(S, d, part, pos); else offerCopy(S, d, part);
    took += part.length;
    if (part.length) { const last = part[part.length - 1]; cur = { rev: last.rev, id: last.id }; }
    if (part.length < size) { done = true; break; }
  }
  if (study) orderLike(S, d, pos);
  link.slug = sh.slug;
  if (done) { link.rev = sh.rev; delete link.cur; } else if (cur) link.cur = cur;
  return { took, done };
}
function applyMeta(d, sh) {
  d.name = sh.name; d.tags = sh.tags || [];
  d.cover = { ...d.cover, style: (sh.cover && sh.cover.style) || d.cover.style, round: (sh.cover && sh.cover.round) || 0, seed: (sh.cover && sh.cover.seed) || sh.name, image: (sh.cover && sh.cover.image) || null };
}
function applyCards(S, d, changes, pos) {
  const mine = new Map(S.cards.filter(c => c.deckId === d.id && c.origin).map(c => [c.origin, c]));
  const gone = new Set();
  for (const r of changes) {
    pos.set(r.id, r.pos);
    const c = mine.get(r.id);
    if (r.deleted) { if (c) gone.add(c.id); continue; }
    if (!c) { const x = fromShared(r, d.id); S.cards.push(x); mine.set(r.id, x); continue; }
    const before = contentOf(c), kind = kindOf(before, r.data);
    Object.assign(c, fromShared(r, d.id), { id: c.id, srs: kind === 'answer' ? newCard() : c.srs, pile: kind === 'answer' ? null : c.pile, created: c.created });
  }
  if (gone.size) { S.cards = S.cards.filter(c => !gone.has(c.id)); S.logs = S.logs.filter(l => !gone.has(l.cardId)); }
}
// The owner's order.
function orderLike(S, d, pos) {
  if (pos.size) { const all = S.cards.filter(c => c.deckId === d.id); d.cardOrder = all.slice().sort((a, b) => (pos.get(a.origin) ?? 1e9) - (pos.get(b.origin) ?? 1e9)).map(c => c.id); }
}
function offerCopy(S, d, changes) {
  const mine = new Map(S.cards.filter(c => c.deckId === d.id && c.origin).map(c => [c.origin, c]));
  const waiting = new Map((d.link.pending || []).map(p => [p.card, p]));
  for (const r of changes) {
    const c = mine.get(r.id), before = c ? contentOf(c) : null;
    if (r.deleted) { if (c) waiting.set(r.id, { card: r.id, op: 'remove', before, after: null, kind: 'remove', mine: hash(before) !== c.base }); continue; }
    if (!c) { waiting.set(r.id, { card: r.id, op: 'add', before: null, after: r.data, kind: 'new' }); continue; }
    if (hash(contentOf(r.data)) === c.base) continue;
    waiting.set(r.id, { card: r.id, op: 'edit', before, after: r.data, kind: kindOf(before, r.data), mine: hash(before) !== c.base });
  }
  d.link.pending = [...waiting.values()].slice(0, 500);
}
// A copy taking (or skipping) the owner's changes. For a card you changed too: keep yours, or take theirs.
export function takeUpdates(deckId, picks = {}) {
  const S = state(), d = S.decks.find(x => x.id === deckId);
  if (!d || !d.link || d.link.mode !== 'copy') throw err('No such deck');
  const left = [];
  for (const p of d.link.pending || []) {
    const pick = picks[p.card] || picks.$all;
    if (pick !== 'take' && pick !== 'skip') { left.push(p); continue; }
    const c = S.cards.find(x => x.deckId === d.id && x.origin === p.card);
    if (pick === 'skip') { if (c && p.after) c.base = hash(contentOf(p.after)); continue; }
    if (p.op === 'remove') { if (c) { S.cards = S.cards.filter(x => x !== c); S.logs = S.logs.filter(l => l.cardId !== c.id); } continue; }
    if (!c) { S.cards.push(fromShared({ id: p.card, data: p.after }, d.id)); continue; }
    Object.assign(c, fromShared({ id: p.card, data: p.after }, d.id), { id: c.id, srs: p.kind === 'answer' ? newCard() : c.srs, pile: p.kind === 'answer' ? null : c.pile, created: c.created });
  }
  d.link.pending = left;
  saved();
  return { left: left.length };
}
// A copy getting the owner's later changes to take or skip (or not).
export async function setUpdates(uid, deckId, on) {
  const S = state(), d = S.decks.find(x => x.id === deckId);
  if (!d || !d.link || d.link.mode !== 'copy') throw err('No such deck');
  d.link.updates = !!on;
  if (!on) d.link.pending = [];
  saved();
  afterSaving(() => rest('/subscriptions?user_id=eq.' + val(socialId(uid)) + '&shared_id=eq.' + val(d.link.id) + '&deck_id=eq.' + val(d.id), { method: 'PATCH', body: { updates: !!on } }).catch(() => {}));
  return { on: !!on };
}
// Stop following a shared deck: it stays in your library as your own deck ("from Maria Santos").
export async function detach(uid, deckId) {
  const S = state(), d = S.decks.find(x => x.id === deckId);
  if (!d || !d.link) throw err('No such deck');
  d.link.gone = true; d.link.pending = [];
  saved();
  afterSaving(async () => {
    await rest('/subscriptions?user_id=eq.' + val(socialId(uid)) + '&shared_id=eq.' + val(d.link.id) + '&deck_id=eq.' + val(d.id), { method: 'DELETE' }).catch(() => {});
    await countFollowing(d.link.id).catch(() => {});
  });
  return {};
}

// ---------- suggestions ----------
// Anyone who can see a deck can suggest changes to it: fix a card, add cards, or take one out, with a line saying why.
// The owner sees each change and takes it or skips it. A helper's suggestions go straight in.
const FIELDS = ['kind', 'front', 'back', 'text', 'note', 'tags', 'image', 'audio', 'speak', 'lang', 'boxes', 'occ'];
// `media`: the pictures and sounds a deck already has. Given, a picture or sound that isn't one of them is left out (a
// suggestion never brings in a link from somewhere else); without it (going back to an earlier version of your own deck),
// all are kept.
const cleanFields = (o, media) => {
  const f = {};
  for (const k of FIELDS) if (o && k in o) f[k] = k === 'tags' ? (Array.isArray(o.tags) ? o.tags.map(x => clean(x, 40)).filter(Boolean).slice(0, 20) : []) : k === 'boxes' ? cleanBoxes(o[k]) : clean(o[k], k === 'note' ? 2000 : 5000);
  if (f.kind && !['basic', 'cloze', 'image', 'audio'].includes(f.kind)) delete f.kind;
  if (media) for (const k of ['image', 'audio']) if (k in f && !media.has(f[k])) delete f[k];
  return f;
};
// Every picture and sound in a shared deck, as its cards hold them.
async function deckMedia(sharedId) {
  const out = new Set();
  for (const r of await allCards(sharedId)) for (const k of ['image', 'audio']) { const v = r.data && r.data[k]; if (typeof v === 'string' && v) out.add(v); }
  return out;
}
export async function suggest(uid, me, sharedId, { message = '', changes = [] } = {}, ai = '') {
  const sid = socialId(uid), sh = await sharedRow(sharedId);
  if (!(await canSee(sh, sid))) throw err('This deck isn’t shared anymore.', 404);
  const list = (Array.isArray(changes) ? changes : []).slice(0, 200);
  if (!list.length) throw err('Add a change first.');
  const refs = list.filter(c => c.card).map(c => String(c.card));
  const was = refs.length ? await cardsById(sharedId, refs) : new Map();
  // Only pictures and sounds the deck already has can come along.
  const brings = v => typeof v === 'string' && v !== '';
  const media = list.some(c => { const a = (c && (c.after || c)) || {}; return brings(a.image) || brings(a.audio); }) ? await deckMedia(sharedId) : new Set();
  const out = [];
  for (const c of list) {
    const op = ['edit', 'add', 'remove'].includes(c.op) ? c.op : c.card ? 'edit' : 'add';
    const b = c.card && was.get(String(c.card)), before = b && !b.deleted ? b.data : null;
    if (op !== 'add' && !before) continue;
    const after = op === 'remove' ? null : { ...(before || { kind: 'basic', front: '', back: '', text: '', note: '', tags: [] }), ...cleanFields(c.after || c, media) };
    if (op === 'add' && !(after.front || after.text || after.back)) continue;
    if (op === 'edit' && hash(contentOf(before)) === hash(contentOf(after))) continue;
    out.push({ id: rid('x'), card: op === 'add' ? rid('n') : String(c.card), op, before, after, kind: kindOf(before, after), status: 'open' });
  }
  if (!out.length) throw err('Those changes are already in the deck.');
  const author = await ensureProfile(uid, me);
  if (author.id === sh.owner) throw err('It’s your deck: change it right there.');
  // Someone the deck's owner blocked can't suggest to it (and you can't suggest to someone you blocked).
  if (await hasBlocked(sh.owner, author.id)) throw err('You can’t suggest changes to this deck.', 403);
  if (await hasBlocked(author.id, sh.owner)) throw err('You blocked this deck’s owner. Unblock them first.', 403);
  // A few at a time: the owner answers these before more come.
  const waiting = await rest('/suggestions?shared_id=eq.' + val(sharedId) + '&author=eq.' + val(author.id) + '&status=eq.open&select=id&limit=1', { count: true });
  if (waiting.total >= OPEN_SUGGESTIONS) throw err('You have ' + OPEN_SUGGESTIONS + ' suggestions waiting on this deck.', 429);
  const s = { id: rid('g'), shared_id: sharedId, owner: sh.owner, author: author.id, author_name: author.name, ai: clean(ai, 60), message: oneLine(message, 280), changes: out, status: 'open' };
  await rest('/suggestions', { method: 'POST', body: s });
  // Helpers edit directly: their changes go in now.
  if ((sh.helpers || []).some(h => h.id === author.id)) {
    await inLibraryOf(sh.owner, () => decide(sh.owner, s.id, { $all: 'take' }, { byHelper: true }));
    return { id: s.id, taken: true };
  }
  // The owner hears, and so do the helpers of a deck kept up by the community (they can take it or skip it too).
  const to = [sh.owner, ...(sh.maintained === 'community' ? (sh.helpers || []).map(h => h.id) : [])].filter((id, i, a) => id && id !== author.id && a.indexOf(id) === i);
  // One line of news for all of a person's suggestions on a deck, until it's read.
  const name = author.name + (s.ai ? ' (' + s.ai + ')' : ''), fresh = [];
  for (const user_id of to) {
    const last = (await rest('/notifications?user_id=eq.' + val(user_id) + '&kind=eq.suggestion&actor=eq.' + val(author.id) + '&shared_id=eq.' + val(sharedId) + '&read=is.false&select=id,data&order=created_at.desc&limit=1'))[0];
    if (last) await rest('/notifications?id=eq.' + val(last.id), { method: 'PATCH', body: { actor_name: name, data: { ...(last.data || {}), n: ((last.data || {}).n || 0) + out.length, message: s.message || (last.data || {}).message || '', id: s.id }, created_at: nowIso() } });
    else fresh.push({ user_id, kind: 'suggestion', actor: author.id, actor_name: name, shared_id: sharedId, data: { n: out.length, message: s.message, id: s.id } });
  }
  await notify(fresh);
  return { id: s.id, taken: false };
}
// Runs fn in someone else's library (a helper's change going into the owner's deck), again from the newer copy if the
// owner's library changed at the same moment.
export async function inLibraryOf(uid, fn) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, Math.random() * 40 * attempt));
    let out;
    if (await withLibrary(uid, async () => { out = await fn(); }, { existing: !!cloud() && !isDev(uid) && uid !== 'local' })) return out;
  }
  throw err('That deck changed at the same moment. Try again.', 409);
}
async function suggestionRow(id) { const r = await rest('/suggestions?id=eq.' + val(id) + '&select=*'); return (r && r[0]) || null; }
// The owner (or, on a community deck, a helper) takes or skips each change; `$all` does every open one. Taking one
// changes the owner's deck, credits the person in a new version, and everyone studying the deck gets it. Runs in the
// owner's library.
export async function decide(uid, id, picks = {}, { byHelper = false } = {}) {
  const sid = socialId(uid), s = await suggestionRow(id);
  if (!s) throw err('That suggestion is gone.', 404);
  const sh = await sharedRow(s.shared_id);
  if (!sh) throw err('This deck isn’t shared anymore.', 404);
  const helper = (sh.helpers || []).some(h => h.id === sid) && sh.maintained === 'community';
  if (sh.owner !== sid && !helper && !byHelper) throw err('Only the deck’s owner can take changes.', 403);
  // A helper deciding works on the owner's library.
  if (sh.owner !== sid && !byHelper) return inLibraryOf(sh.owner, () => decide(sh.owner, id, picks, { byHelper: true }));
  const S = state(), d = S.decks.find(x => x.share && x.share.id === s.shared_id);
  if (!d) throw err('This deck isn’t shared anymore.', 404);
  const author = await profileOf(s.author);
  const credit = { id: s.author, name: s.author_name || (author && author.name) || 'Someone', handle: author ? author.handle : '', ai: s.ai || '', suggestion: s.id };
  let took = 0, skipped = 0, known = null;
  // What a suggestion changes on a card. A picture or sound is only ever one the deck already has (a suggestion made before
  // that rule could carry a link from somewhere else), and one that didn't change is left as the card has it.
  const patchOf = async c => {
    const f = cleanFields(c.after);
    for (const k of ['image', 'audio']) {
      if (!(k in f)) continue;
      if (c.before && f[k] === c.before[k]) delete f[k];
      else if (!(known ||= await deckMedia(s.shared_id)).has(f[k])) delete f[k];
    }
    return f;
  };
  await withCredit(credit, async () => {
    for (const c of s.changes) {
      if (c.status !== 'open') continue;
      const pick = picks[c.id] || picks.$all;
      if (pick === 'skip') { c.status = 'skipped'; skipped++; continue; }
      if (pick !== 'take') continue;
      const card = S.cards.find(x => x.id === c.card && x.deckId === d.id);
      try {
        if (c.op === 'add') apply({ type: 'card.add', deckId: d.id, ...(await patchOf(c)) }, 'suggestion');
        else if (!card) { c.status = 'gone'; continue; }
        else if (c.op === 'remove') apply({ type: 'card.delete', id: card.id }, 'suggestion');
        else apply({ type: 'card.update', id: card.id, patch: await patchOf(c) }, 'suggestion');
        c.status = 'taken'; took++;
      } catch (e) { c.status = 'gone'; }
    }
  });
  const open = s.changes.some(c => c.status === 'open');
  afterSaving(async () => {
    await rest('/suggestions?id=eq.' + val(s.id), { method: 'PATCH', body: { changes: s.changes, status: open ? 'open' : 'done', decided_at: open ? null : nowIso() } });
    if (took) {
      const people = (sh.contributors || []).filter(p => p.id !== s.author), me = (sh.contributors || []).find(p => p.id === s.author);
      people.unshift({ id: s.author, name: credit.name, handle: credit.handle, n: ((me && me.n) || 0) + took });
      await rest('/shared_decks?id=eq.' + val(sh.id), { method: 'PATCH', body: { contributors: people.slice(0, 50) } });
      if (author) await rest('/profiles?id=eq.' + val(author.id), { method: 'PATCH', body: { contributions: (author.contributions || 0) + took } });
    }
    if ((took || skipped) && s.author !== sh.owner) await notify([{ user_id: s.author, kind: 'decided', actor: sh.owner, actor_name: ((await profileOf(sh.owner)) || {}).name || '', shared_id: sh.id, data: { took, skipped, id: s.id } }]);
  });
  return { took, skipped, open };
}
// The suggestions waiting on your decks (or a deck), newest first, and the ones you sent.
export async function suggestionsFor(uid, { sharedId = '', mine = false, all = false } = {}) {
  const sid = socialId(uid);
  if (mine) return withSenders(await rest('/suggestions?author=eq.' + val(sid) + '&select=*&order=created_at.desc&limit=100'));
  if (sharedId) {
    const sh = await sharedRow(sharedId, 'id,owner,helpers,maintained');
    if (!sh) throw err('No such deck', 404);
    const helper = (sh.helpers || []).some(h => h.id === sid);
    if (sh.owner !== sid && !helper) throw err('Only the deck’s owner sees its suggestions.', 403);
    return withSenders(await rest('/suggestions?shared_id=eq.' + val(sharedId) + (all ? '' : '&status=eq.open') + '&select=*&order=created_at.desc&limit=100'));
  }
  // Every deck's: the ones on your decks, and on community decks where you're a helper (their owners let helpers take or
  // skip suggestions, see decide()).
  const helped = (await rest('/shared_decks?maintained=eq.community&helpers=cs.' + encodeURIComponent(JSON.stringify([{ id: sid }])) + '&select=id&limit=200')).map(x => x.id);
  const whose = helped.length ? 'or=' + encodeURIComponent('(owner.eq.' + qvalRaw(sid) + ',shared_id.in.(' + helped.map(qvalRaw).join(',') + '))') : 'owner=eq.' + val(sid);
  return withSenders(await rest('/suggestions?' + whose + (all ? '' : '&status=eq.open') + '&select=*&order=created_at.desc&limit=100'));
}
// Who sent each suggestion (their picture, and their name linking to their profile) and which deck it's for, without
// anyone's account id.
async function withSenders(rows) {
  if (!rows.length) return rows;
  const ids = [...new Set(rows.map(r => r.author).filter(Boolean))], decks = [...new Set(rows.map(r => r.shared_id))];
  const [people, shared] = await Promise.all([ids.length ? rest('/profiles?id=in.' + inList(ids) + '&select=id,handle,name,avatar,color,verified,kind') : [],
    rest('/shared_decks?id=in.' + inList(decks) + '&select=id,name,slug,owner,visibility')]);
  const owners = shared.length ? await rest('/profiles?id=in.' + inList([...new Set(shared.map(d => d.owner))]) + '&select=id,handle') : [];
  return rows.map(({ owner, author, ...r }) => {
    const d = shared.find(x => x.id === r.shared_id), o = d && owners.find(x => x.id === d.owner);
    return { ...r, person: face(people.find(x => x.id === author)) || { name: r.author_name }, deck: d ? { id: d.id, name: d.name, url: deckUrl(d, o) } : null };
  });
}

// ---------- history ----------
// A deck's newest versions (at most 50). Their changes are only read when the page shows them (History); a deck's own page
// just needs how many each one has.
export async function versions(sharedId, { limit = 50, changes = true } = {}) {
  return rest('/deck_versions?shared_id=eq.' + val(sharedId) + '&select=id,version,author,author_name,ai,kind,summary,n_changes,created_at' + (changes ? ',changes' : '') + '&order=version.desc&limit=' + Math.min(50, limit));
}
// A deck's History page: every version, newest first, with who made it and what changed.
export async function historyPage(sharedId, viewer) {
  const vid = viewer ? socialId(viewer) : null, sh = await sharedRow(sharedId, 'id,owner,visibility,hidden,learners,copies,name,slug');
  if (!(await canSee(sh, vid))) return null;
  const list = await versions(sharedId, { limit: 50 }), o = await profileOf(sh.owner);
  const ids = [...new Set(list.map(v => v.author).filter(Boolean))], faces = ids.length ? await rest('/profiles?id=in.' + inList(ids) + '&select=id,handle,name,avatar,color,verified') : [];
  return { id: sh.id, name: sh.name, url: deckUrl(sh, o), owner: face(o), mine: vid === sh.owner, following: (sh.learners || 0) + (sh.copies || 0),
    versions: list.map(v => ({ version: v.version, kind: v.kind, summary: v.summary, ai: v.ai, at: v.created_at, by: face(faces.find(f => f.id === v.author)) || (v.author_name ? { name: v.author_name } : null), changes: v.changes || [] })) };
}
// Going back to a version: every change since then is undone (cards added since go, cards removed since come back),
// as a new version, so going back can itself be undone. Runs in the owner's library.
export async function restore(uid, sharedId, version) {
  const sid = socialId(uid), sh = await sharedRow(sharedId, 'id,owner');
  if (!sh || sh.owner !== sid) throw err('Only the deck’s owner can go back to a version.', 403);
  const S = state(), d = S.decks.find(x => x.share && x.share.id === sharedId);
  if (!d) throw err('No such deck', 404);
  const later = await rest('/deck_versions?shared_id=eq.' + val(sharedId) + '&version=gt.' + (+version || 0) + '&select=version,changes&order=version.desc&limit=500');
  const target = new Map();
  for (const v of later) for (const c of v.changes || []) target.set(c.card, c.before || null);
  if (!target.size) throw err('That’s already how the deck is.');
  const back = new Set();
  await withCredit({ restore: +version, quiet: true }, async () => {
    for (const [cardId, before] of target) {
      const card = S.cards.find(x => x.id === cardId && x.deckId === d.id);
      if (!before) { if (card) apply({ type: 'card.delete', id: card.id }); continue; }
      if (card) { apply({ type: 'card.update', id: card.id, patch: cleanFields(before) }); continue; }
      // A text with blanks (or a picture with boxes) is several cards made together: it comes back once, whole.
      const g = before.group;
      if (g && (back.has(g) || S.cards.some(x => x.group === g && x.deckId === d.id))) continue;
      if (g) back.add(g);
      apply({ type: 'card.add', deckId: d.id, ...cleanFields(before) });
    }
  });
  return { changes: target.size };
}
// A verified teacher checking a public deck: a version that says so, and a "Checked by" badge until the deck changes.
export async function check(uid, me, sharedId) {
  const p = await ensureProfile(uid, me);
  if (p.verified !== 'teacher' && p.verified !== 'school') throw err('Only verified teachers can check decks.', 403);
  const sh = await sharedRow(sharedId, 'id,owner,version,visibility,hidden,checked');
  if (!(await canSee(sh, p.id))) throw err('No such deck', 404);
  if (sh.owner === p.id) throw err('You can’t check your own deck.');
  // Once for each version: a deck already checked as it is now has nothing new to say (no version, no news).
  if (sh.checked && sh.checked.version === sh.version) return { version: sh.version };
  const n = await addVersion(sharedId, [], { by: personOf(p), kind: 'check', summary: p.name + ' checked every card', joinable: false });
  await rest('/shared_decks?id=eq.' + val(sharedId), { method: 'PATCH', body: { checked: { id: p.id, name: p.name, handle: p.handle, version: n, at: nowIso() } } });
  if (sh.owner !== p.id) await notify([{ user_id: sh.owner, kind: 'checked', actor: p.id, actor_name: p.name, shared_id: sharedId, data: {} }]);
  return { version: n };
}

// ---------- saves, follows, updates ----------
export async function star(uid, me, sharedId, on) {
  const p = await ensureProfile(uid, me), sh = await sharedRow(sharedId, 'id,owner,visibility,hidden');
  if (!(await canSee(sh, p.id))) throw err('No such deck', 404);
  if (on) await rest('/stars', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { user_id: p.id, shared_id: sharedId } });
  else await rest('/stars?user_id=eq.' + val(p.id) + '&shared_id=eq.' + val(sharedId), { method: 'DELETE' });
  return countFollowing(sharedId);
}
export async function watch(uid, me, sharedId, on) {
  const p = await ensureProfile(uid, me), sh = await sharedRow(sharedId, 'id,owner,visibility,hidden');
  if (!(await canSee(sh, p.id))) throw err('No such deck', 404);
  if (on) await rest('/subscriptions?on_conflict=user_id,shared_id,deck_id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { user_id: p.id, shared_id: sharedId, deck_id: '', mode: 'watch', last_seen: nowIso() } });
  else await rest('/subscriptions?user_id=eq.' + val(p.id) + '&shared_id=eq.' + val(sharedId) + '&mode=eq.watch', { method: 'DELETE' });
  return { on: !!on };
}
async function recountPeople(id) {
  const [a, b] = await Promise.all([rest('/follows?followee=eq.' + val(id) + '&select=follower&limit=1', { count: true }), rest('/follows?follower=eq.' + val(id) + '&select=followee&limit=1', { count: true })]);
  await rest('/profiles?id=eq.' + val(id), { method: 'PATCH', body: { followers: a.total, following: b.total } });
  return { followers: a.total, following: b.total };
}
export async function follow(uid, me, handle, on) {
  const p = await ensureProfile(uid, me), them = await profileByHandle(handle);
  if (!them) throw err('No such person', 404);
  if (them.id === p.id) throw err('That’s you.');
  if (on) {
    // Someone you blocked isn't followed, and someone who blocked you can't follow.
    if (await hasBlocked(p.id, them.id)) throw err('You blocked this person. Unblock them first.', 403);
    if (await hasBlocked(them.id, p.id)) throw err('You can’t follow this person.', 403);
    await rest('/follows', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { follower: p.id, followee: them.id } });
    // Unfollowing and following again stays quiet: they hear about the same person once a week at most.
    const lately = await rest('/notifications?user_id=eq.' + val(them.id) + '&kind=eq.follow&actor=eq.' + val(p.id) + '&created_at=gt.' + val(new Date(Date.now() - 7 * DAY).toISOString()) + '&select=id&limit=1');
    if (!lately.length) await notify([{ user_id: them.id, kind: 'follow', actor: p.id, actor_name: p.name, data: { handle: p.handle } }]);
  } else await rest('/follows?follower=eq.' + val(p.id) + '&followee=eq.' + val(them.id), { method: 'DELETE' });
  await recountPeople(p.id);
  return recountPeople(them.id);
}

// ---------- blocks ----------
// Blocking someone (a profile's ⋯, a suggestion, or Settings → Account → Blocked people): they can't follow you or suggest
// changes to your decks, nothing from them reaches your News, and their decks stay out of your Discover, search, and their own
// profile page. Unblocking brings none of it back but what they do from then on. A lookup that fails (before supabase/appstore.sql
// has run) counts as nobody blocked, so the rest of the app keeps working.
const blockedBy = async id => { try { return (await rest('/blocks?blocker=eq.' + val(id) + '&select=blocked&order=created_at.desc&limit=2000')).map(r => r.blocked); } catch (e) { console.error('blocks', e.message); return []; } };
const hasBlocked = async (blocker, who) => { try { return (await rest('/blocks?blocker=eq.' + val(blocker) + '&blocked=eq.' + val(who) + '&select=blocker&limit=1')).length > 0; } catch (e) { console.error('blocks', e.message); return false; } };
// A filter that leaves out these people's decks (or, with `col` = 'id', their profiles): the first hundred in the address, the
// rest by the caller filtering what comes back.
const without = (col, ids) => (ids.length ? '&' + col + '=not.in.' + inList(ids.slice(0, 100)) : '');
export async function block(uid, me, handle, on) {
  const p = await ensureProfile(uid, me), them = await profileByHandle(handle);
  if (!them) throw err('No such person', 404);
  if (them.id === p.id) throw err('That’s you.');
  if (!on) { await rest('/blocks?blocker=eq.' + val(p.id) + '&blocked=eq.' + val(them.id), { method: 'DELETE' }); return { blocked: false }; }
  await rest('/blocks', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { blocker: p.id, blocked: them.id } });
  // They're out of your follows (and you're out of theirs) and your News, and what they suggested to your decks is gone.
  await rest('/follows?follower=eq.' + val(p.id) + '&followee=eq.' + val(them.id), { method: 'DELETE' });
  await rest('/follows?follower=eq.' + val(them.id) + '&followee=eq.' + val(p.id), { method: 'DELETE' });
  await rest('/notifications?user_id=eq.' + val(p.id) + '&actor=eq.' + val(them.id), { method: 'DELETE' });
  await rest('/suggestions?owner=eq.' + val(p.id) + '&author=eq.' + val(them.id) + '&status=eq.open', { method: 'DELETE' });
  await recountPeople(p.id); await recountPeople(them.id);
  return { blocked: true };
}
// The people you blocked, newest first, for Settings → Account → Blocked people (names and handles, never account ids).
export async function blockedPeople(uid) {
  const rows = await rest('/blocks?blocker=eq.' + val(socialId(uid)) + '&select=blocked&order=created_at.desc&limit=500');
  const faces = rows.length ? await rest('/profiles?id=in.' + inList(rows.map(r => r.blocked)) + '&select=id,handle,name,avatar,color,verified,kind') : [];
  return { people: rows.map(r => face(faces.find(f => f.id === r.blocked))).filter(Boolean) };
}

// ---------- news ----------
async function notify(list) {
  let rows = list.filter(x => x && x.user_id);
  // Nothing from someone the person blocked.
  const actors = [...new Set(rows.map(r => r.actor).filter(Boolean))];
  if (actors.length) {
    const pairs = new Set();
    try { for (const ids of chunk(actors, 50)) for (const b of await rest('/blocks?blocked=in.' + inList(ids) + '&select=blocker,blocked&limit=5000')) pairs.add(b.blocker + '>' + b.blocked); } catch (e) { console.error('blocks', e.message); }
    rows = rows.filter(r => !r.actor || !pairs.has(r.user_id + '>' + r.actor));
  }
  for (let i = 0; i < rows.length; i += 500) await rest('/notifications', { method: 'POST', body: rows.slice(i, i + 500) });
}
export async function activity(uid) {
  const sid = socialId(uid);
  const [rows, unread] = await Promise.all([
    rest('/notifications?user_id=eq.' + val(sid) + '&select=id,kind,actor,actor_name,shared_id,data,read,created_at&order=created_at.desc&limit=60'),
    rest('/notifications?user_id=eq.' + val(sid) + '&read=is.false&select=id&limit=1', { count: true })]);
  const ids = [...new Set(rows.map(r => r.shared_id).filter(Boolean))], people = [...new Set(rows.map(r => r.actor).filter(Boolean))];
  const [decks, who] = await Promise.all([ids.length ? rest('/shared_decks?id=in.' + inList(ids) + '&select=id,name,slug,owner,visibility') : [], people.length ? rest('/profiles?id=in.' + inList(people) + '&select=id,handle,name,avatar,color') : []]);
  const owners = decks.length ? await rest('/profiles?id=in.' + inList([...new Set(decks.map(d => d.owner))]) + '&select=id,handle') : [];
  // Who did each thing comes as their name and handle, never their account id.
  return { unread: unread.total, items: rows.map(({ actor, ...r }) => {
    const d = decks.find(x => x.id === r.shared_id), o = d && owners.find(x => x.id === d.owner), a = who.find(x => x.id === actor);
    return { ...r, deck: d ? { id: d.id, name: d.name, url: deckUrl(d, o) } : null, person: a ? { handle: a.handle, name: a.name, avatar: a.avatar, color: a.color } : null };
  }) };
}
export async function unreadCount(uid) { return (await rest('/notifications?user_id=eq.' + val(socialId(uid)) + '&read=is.false&select=id&limit=1', { count: true })).total; }
export async function markRead(uid, ids) {
  const base = '/notifications?user_id=eq.' + val(socialId(uid)) + '&read=is.false';
  await rest(Array.isArray(ids) && ids.length ? base + '&id=in.' + inList(ids.map(String)) : base, { method: 'PATCH', body: { read: true } });
  return {};
}

// ---------- what public pages show ----------
function card(sh, o) {
  return { id: sh.id, url: deckUrl(sh, o), name: sh.name, description: sh.description || '', tags: sh.tags || [], cover: sh.cover || {}, cards: sh.card_count || 0,
    stars: sh.stars || 0, learners: sh.learners || 0, copies: sh.copies || 0, version: sh.version || 1, updated: sh.updated_at, visibility: sh.visibility,
    checked: sh.checked ? { name: sh.checked.name, handle: sh.checked.handle, current: sh.checked.version === sh.version } : null,
    maintained: sh.maintained || 'creator', level: sh.level || '', subject: sh.subject || '', school: sh.school || '', schoolId: sh.school_id || '', owner: face(o), theme: (o && o.theme) || '' };
}
export async function withOwners(rows) {
  const ids = [...new Set(rows.map(r => r.owner))];
  const people = ids.length ? await rest('/profiles?id=in.' + inList(ids) + '&select=*') : [];
  return rows.map(r => card(r, people.find(p => p.id === r.owner)));
}
export const LIST = 'id,owner,slug,name,description,tags,cover,card_count,stars,learners,copies,version,updated_at,visibility,hidden,checked,maintained,level,subject,school_id,school';
// A shared deck's page: the deck, its cards (content only), how it was made, who helped, and what you have to do with it.
export async function deckPage({ handle, slug, id }, viewer) {
  let sh = null, o = null;
  if (id) { sh = await sharedRow(id); o = sh && await profileOf(sh.owner); }
  // A deck is found by its owner's name and its own only when it's public; Link only and class decks open at /d/<id> alone.
  else { o = await profileByHandle(handle); sh = o && (await rest('/shared_decks?owner=eq.' + val(o.id) + '&slug=eq.' + val(String(slug || '').toLowerCase()) + '&visibility=eq.public&select=*'))[0]; }
  const vid = viewer ? socialId(viewer) : null;
  if (!sh || !(await canSee(sh, vid))) return null;
  const [rows, vers, subs, starred] = await Promise.all([
    rest('/shared_cards?shared_id=eq.' + val(sh.id) + '&deleted=is.false&select=id,pos,data&order=pos.asc&limit=500'),
    versions(sh.id, { limit: 40, changes: false }),
    vid ? rest('/subscriptions?user_id=eq.' + val(vid) + '&shared_id=eq.' + val(sh.id) + '&select=deck_id,mode,updates') : [],
    vid ? rest('/stars?user_id=eq.' + val(vid) + '&shared_id=eq.' + val(sh.id) + '&select=user_id') : []]);
  const owner = vid === sh.owner, helper = (sh.helpers || []).some(h => h.id === vid);
  const open = owner || helper ? (await rest('/suggestions?shared_id=eq.' + val(sh.id) + '&status=eq.open&select=id&limit=1', { count: true })).total : 0;
  const people = [...new Set([sh.owner, ...vers.map(v => v.author).filter(Boolean)])];
  const faces = people.length ? await rest('/profiles?id=in.' + inList(people) + '&select=id,handle,name,avatar,color,verified') : [];
  return { ...card(sh, o), helpers: (sh.helpers || []).map(h => ({ handle: h.handle, name: h.name })), contributors: (sh.contributors || []).map(h => ({ handle: h.handle, name: h.name, n: h.n })),
    people: faces.map(face),
    cardsList: rows.map(r => ({ id: r.id, kind: r.data.kind, front: r.data.front, back: r.data.back, text: r.data.text, image: r.data.image, box: r.data.box, boxes: r.data.boxes, cloze: r.data.cloze, tags: r.data.tags || [], source: r.data.source || '', trail: r.data.trail || [] })),
    moreCards: Math.max(0, (sh.card_count || 0) - rows.length),
    // The Guide (Markdown pages, the first the Guide itself) and how many Sources the deck was made from (a number only).
    guide: sh.guide && Array.isArray(sh.guide.pages) ? { pages: sh.guide.pages.map(p => ({ id: p.id, title: p.title, text: p.text })), sources: sh.guide.sources || 0, diagrams: diagramsCopy(sh.guide) } : null,
    made: vers.map(v => ({ version: v.version, kind: v.kind, summary: v.summary, ai: v.ai, at: v.created_at, by: face(faces.find(f => f.id === v.author)) || (v.author_name ? { name: v.author_name } : null), n: v.n_changes || 0 })),
    me: vid ? { owner, helper, studying: (subs.find(x => x.mode === 'study') || {}).deck_id || '', copied: (subs.find(x => x.mode === 'copy') || {}).deck_id || '', watching: subs.some(x => x.mode === 'watch'), starred: starred.length > 0, open } : null };
}
export async function profilePage(handle, viewer) {
  const p = await profileByHandle(handle);
  if (!p) return null;
  const vid = viewer ? socialId(viewer) : null, self = vid === p.id;
  // Someone you blocked: their page says so (and offers Unblock), without their decks.
  const blocked = !!vid && !self && await hasBlocked(vid, p.id);
  const [decks, following, saved] = await Promise.all([
    blocked ? [] : rest('/shared_decks?owner=eq.' + val(p.id) + (self ? '&visibility=in.(link,public)' : '&visibility=eq.public') + '&hidden=is.false&select=' + LIST + '&order=updated_at.desc&limit=200'),
    vid && !self ? rest('/follows?follower=eq.' + val(vid) + '&followee=eq.' + val(p.id) + '&select=follower') : [],
    self ? rest('/stars?user_id=eq.' + val(p.id) + '&select=shared_id&order=created_at.desc&limit=100') : []]);
  const savedRows = saved.length ? await rest('/shared_decks?id=in.' + inList(saved.map(s => s.shared_id)) + '&visibility=in.(link,public)&hidden=is.false&select=' + LIST) : [];
  const feat = p.featured || [], list = decks.map(r => card(r, p));
  list.sort((a, b) => (feat.includes(b.id) - feat.includes(a.id)));
  // Someone's school, level and year are on their page only if they switched it on (their own page always has them, with the switch, so
  // Edit can show them). A school's own account is an organization, so its name is always on its page.
  const open = self || p.school_show || p.kind === 'school', own = self ? { showSchool: !!p.school_show, schoolId: p.school_id || '' } : {};
  return { ...face(p), bio: p.bio || '', school: open ? p.school || '' : '', level: open ? p.level || '' : '', year: open ? p.year || '' : '', ...own, subject: p.subject || '', followers: p.followers || 0, following: p.following || 0, contributions: p.contributions || 0,
    featured: feat, decks: list.map(d => ({ ...d, pinned: feat.includes(d.id) })), saved: self ? await withOwners(saved.map(s => savedRows.find(r => r.id === s.shared_id)).filter(Boolean)) : [],
    stars: list.reduce((n, d) => n + d.stars, 0), me: vid ? { self, following: following.length > 0, blocked } : null };
}
// The School filter: a school's id from the list, or words that find one ("Stanford", "UCLA"). A name nobody picked from the list (a
// school typed as "Other") matches the decks labeled with those words.
async function schoolFilter(x) {
  const w = String(x ?? '').trim().slice(0, 60);
  if (!w) return null;
  const row = /^\d{1,8}$/.test(w) ? await schoolById(w) : (await findSchools(w, 1))[0];
  return row ? { q: '&school_id=eq.' + val(row[0]), id: row[0], name: row[1] } : { q: '&school=ilike.' + like(w), id: '', name: w };
}
// Level, subject and school as the query and the answer's echo: `on` is whether any is set (then Discover lists decks instead of
// sections), and `q` what narrows a decks query.
async function filtersOf({ level = '', subject = '', school = '' } = {}) {
  const lv = levelOf(level), sj = subjectOf(subject), sc = await schoolFilter(school);
  const q = (lv ? '&level=eq.' + val(lv) : '') + (sj ? '&subject=eq.' + val(sj) : '') + (sc ? sc.q : '');
  return { on: !!q, q, level: lv, subject: sj, school: sc ? { id: sc.id, name: sc.name } : null };
}
// A school written exactly (a typed one), without letting the words add wildcards of their own.
const exact = s => encodeURIComponent('"' + String(s ?? '').replace(/[*%,()"\\]/g, ' ').replace(/\s+/g, ' ').trim() + '"');
// Discover: decks people like this week, decks a teacher checked, new ones, and ones from people you follow, with
// topics to narrow it down; for someone who set their school, the decks labeled with it come first. Narrowed by level, subject or
// school (as well as a topic), it's one list of decks, best first. Studying stays in your library; this is only for finding more.
export async function discover(viewer, { tag = '', level = '', subject = '', school = '' } = {}) {
  const t = String(tag || '').slice(0, 40), byTag = t ? '&tags=cs.' + encodeURIComponent('{' + qvalRaw(t) + '}') : '';
  const vid = viewer ? socialId(viewer) : null, narrow = await filtersOf({ level, subject, school });
  // Decks of people you blocked aren't here.
  const skip = vid ? await blockedBy(vid) : [], gone = new Set(skip), hide = without('owner', skip);
  const base = '/shared_decks?visibility=eq.public&hidden=is.false' + byTag + narrow.q + hide + '&select=' + LIST, best = '&order=score.desc,updated_at.desc';
  const topicsOf = rows => {
    const count = {};
    for (const r of rows) for (const g of r.tags || []) count[g] = (count[g] || 0) + 1;
    return Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b)).slice(0, 10);
  };
  const tagsQ = rest('/shared_decks?visibility=eq.public&hidden=is.false' + hide + '&select=tags,owner&order=score.desc&limit=300');
  const echo = { tag: t, level: narrow.level, subject: narrow.subject, school: narrow.school, filtered: narrow.on };
  if (narrow.on) {
    const [rows, tagRows] = (await Promise.all([rest(base + best + '&limit=24'), tagsQ])).map(rows => rows.filter(r => !gone.has(r.owner)));
    const decks = await withOwners(rows);
    return { topics: topicsOf(tagRows), ...echo, sections: decks.length ? [{ id: 'results', title: 'Decks', decks }] : [] };
  }
  const follows = vid ? await rest('/follows?follower=eq.' + val(vid) + '&select=followee&limit=500') : [];
  // The decks labeled with your school (the one you set, shown on your profile or not), if you set one.
  const me = vid ? await profileOf(vid) : null, home = me && me.level !== 'highschool' && (me.school_id ? '&school_id=eq.' + val(me.school_id) : me.school ? '&school=ilike.' + exact(me.school) : '');
  const [popular, checked, fresh, friends, tagRows, atSchool] = (await Promise.all([
    rest(base + best + '&limit=12'),
    rest(base + '&checked=not.is.null&order=score.desc&limit=8'),
    rest(base + '&order=created_at.desc&limit=12'),
    follows.length ? rest(base + '&owner=in.' + inList(follows.map(f => f.followee)) + '&order=updated_at.desc&limit=12') : [],
    tagsQ,
    home ? rest(base + home + best + '&limit=12') : []])).map(rows => rows.filter(r => !gone.has(r.owner)));
  const all = await withOwners([...popular, ...checked, ...fresh, ...friends, ...atSchool]), pickOf = rows => rows.map(r => all.find(x => x.id === r.id));
  return { topics: topicsOf(tagRows), ...echo, sections: [
    { id: 'school', title: me && me.school ? 'Popular at ' + me.school : '', decks: pickOf(atSchool) },
    { id: 'popular', title: t ? 'Popular in ' + t : 'Popular this week', decks: pickOf(popular) },
    { id: 'friends', title: 'From people you follow', decks: pickOf(friends) },
    { id: 'checked', title: 'Checked by teachers', decks: pickOf(checked) },
    { id: 'new', title: 'New', decks: pickOf(fresh).filter(d => !popular.slice(0, 4).some(p => p.id === d.id)) }].filter(s => s.decks.length) };
}
const qvalRaw = s => (/^[\w-]+$/.test(s) ? s : '"' + String(s).replace(/["\\]/g, '\\$&') + '"');
// Search: decks (by name, about line, or topic) and people (by name, handle, or subject), narrowed by level, subject or school. People
// aren't narrowed that way (nothing lists the people at a school), so with any of those set only decks come back.
export async function search(q, viewer, filters = {}) {
  const words = String(q || '').trim().slice(0, 60), f = await filtersOf(filters);
  if (!words) return { q: '', decks: [], people: [] };
  const pat = like(words);
  // Decks and profiles of people you blocked aren't found.
  const skip = viewer ? await blockedBy(socialId(viewer)) : [], gone = new Set(skip), narrow = f.q + without('owner', skip);
  const [decks, tagged, people] = await Promise.all([
    rest('/shared_decks?visibility=eq.public&hidden=is.false' + narrow + '&or=' + encodeURIComponent('(') + 'name.ilike.' + pat + ',description.ilike.' + pat + encodeURIComponent(')') + '&select=' + LIST + '&order=score.desc&limit=24'),
    rest('/shared_decks?visibility=eq.public&hidden=is.false' + narrow + '&tags=cs.' + encodeURIComponent('{' + qvalRaw(words) + '}') + '&select=' + LIST + '&order=score.desc&limit=12'),
    f.on ? [] : rest('/profiles?listed=is.true' + without('id', skip) + '&or=' + encodeURIComponent('(') + 'handle.ilike.' + pat + ',name.ilike.' + pat + ',subject.ilike.' + pat + encodeURIComponent(')') + '&select=*&order=followers.desc&limit=12')])
    .then(([d, t, pe]) => [d.filter(r => !gone.has(r.owner)), t.filter(r => !gone.has(r.owner)), pe.filter(r => !gone.has(r.id))]);
  const seen = new Set(), rows = [...decks, ...tagged].filter(r => !seen.has(r.id) && seen.add(r.id));
  return { q: words, level: f.level, subject: f.subject, school: f.school, filtered: f.on, decks: await withOwners(rows), people: people.map(p => ({ ...face(p), bio: p.bio || '', followers: p.followers || 0 })) };
}
// Your shared decks and the decks you study, for your library's sharing labels and the pages that open them.
// How people do on your shared deck's cards, without names: one row per learner and card with their totals (a learner
// only ever rewrites their own row), added up here. The hardest cards are the ones missed most, once seen 3 times.
onReviewed(r => rest('/card_stats', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { shared_id: r.sharedId, user_id: socialId(uidOf()), card_id: r.card, reviews: r.reviews, misses: r.misses, updated_at: nowIso() } }));
export async function creatorStats(uid, sharedId) {
  // Hardest cards are part of Lucida Pro, like the rest of Pro (store.mjs isPro).
  if (!isPro()) throw err('Hardest cards are part of Lucida Pro: lucida.cards/pricing', 402);
  const sh = await sharedRow(sharedId, 'id,owner,helpers');
  const sid = socialId(uid);
  if (!sh || (sh.owner !== sid && !(sh.helpers || []).some(h => h.id === sid))) throw Object.assign(new Error('Only its owner sees this.'), { status: 403 });
  const rows = await rest('/card_stats?shared_id=eq.' + val(sharedId) + '&select=user_id,card_id,reviews,misses&limit=50000');
  const by = new Map(), people = new Set();
  for (const r of rows) { people.add(r.user_id); const t = by.get(r.card_id) || { reviews: 0, misses: 0 }; t.reviews += r.reviews; t.misses += r.misses; by.set(r.card_id, t); }
  const top = [...by].filter(([, t]) => t.reviews >= 3 && t.misses).sort((a, b) => b[1].misses / b[1].reviews - a[1].misses / a[1].reviews || b[1].reviews - a[1].reviews).slice(0, 5);
  const cards = top.length ? await cardsById(sharedId, top.map(([id]) => id)) : new Map();
  const text = d => String(d.front || d.text || '').replace(/\[\[(.+?)\]\]/g, '___').replace(/<[^>]+>/g, '').trim() || 'A card';
  return { learners: people.size, reviews: rows.reduce((n, r) => n + r.reviews, 0),
    hardest: top.map(([id, t]) => { const c = cards.get(id); return c && !c.deleted ? { card: id, text: text(c.data || {}), missed: Math.round(100 * t.misses / t.reviews), reviews: t.reviews } : null; }).filter(Boolean) };
}
export async function mine(uid) {
  const sid = socialId(uid);
  const p = await profileOf(sid);
  const rows = p ? await rest('/shared_decks?owner=eq.' + val(sid) + '&select=id,slug,visibility,stars,learners,copies,version,description,maintained,helpers,level,subject,school_id,school') : [];
  const open = p ? (await rest('/suggestions?owner=eq.' + val(sid) + '&status=eq.open&select=shared_id&limit=500')) : [];
  return { handle: p ? p.handle : '', profile: face(p), decks: rows.map(({ school_id, ...r }) => ({ ...r, schoolId: school_id || '', helpers: (r.helpers || []).map(h => ({ handle: h.handle, name: h.name })), open: open.filter(x => x.shared_id === r.id).length })) };
}
// For search engines and link previews: a public page's title and a line about it.
export async function metaFor(path) {
  const m = /^\/@([a-z0-9_.]{3,30})(?:\/([a-z0-9-]{1,60}))?\/?$/.exec(path.toLowerCase()), d = /^\/d\/(s[a-z0-9]+)$/.exec(path);
  if (!m && !d) return null;
  if (d || m[2]) {
    const page = await deckPage(d ? { id: d[1] } : { handle: m[1], slug: m[2] }, null);
    if (!page) return { status: 404, title: 'Not found · Lucida', description: '' };
    // The Guide, drawn safely (there is no raw HTML in it, and links say nofollow ugc), is part of the page's words for search engines.
    const gp = (page.guide ? page.guide.pages : []).filter(p => p.text.trim()), about = page.description || (gp[0] ? guide.plain(gp[0].text, 140).replace(/\s+/g, ' ').trim() : '');
    const guideHtml = gp.map(p => (p.id === 'main' ? '' : '<h2>' + String(p.title).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</h2>') + guide.render(p.text, { image: publicImage })).join('');
    return { title: page.name + ' · ' + (page.owner ? page.owner.name : '') + ' · Lucida', description: plural(page.cards, 'flashcard') + (about ? '. ' + about : '') + (page.cardsList[0] ? '. ' + (page.cardsList[0].front || page.cardsList[0].text || '').slice(0, 120) : ''),
      noindex: page.visibility !== 'public', url: page.url, cards: page.cardsList.slice(0, 50), guideHtml,
      // The facts for the page's structured data (web/jsonld.mjs).
      ld: { kind: 'deck', name: page.name, description: page.description, cards: page.cards, updated: page.updated, tags: page.tags, owner: page.owner } };
  }
  const p = await profilePage(m[1], null);
  if (!p) return { status: 404, title: 'Not found · Lucida', description: '' };
  // A profile nobody chose to list (see `listed`) stays out of search engines too.
  const row = await profileByHandle(m[1]);
  return { title: p.name + ' (@' + p.handle + ') · Lucida', description: (p.bio ? p.bio + ' · ' : '') + plural(p.decks.length, 'public deck'), url: '/@' + p.handle, decks: p.decks.slice(0, 50), noindex: !(row && row.listed),
    ld: { kind: 'profile', name: p.name, handle: p.handle, bio: p.bio, school: p.school, subject: p.subject, org: p.kind === 'school', updated: p.decks[0] && p.decks[0].updated } };
}
export async function sitemap(origin) {
  const decks = await rest('/shared_decks?visibility=eq.public&hidden=is.false&select=owner,slug,updated_at&order=updated_at.desc&limit=5000');
  const owners = decks.length ? await rest('/profiles?id=in.' + inList([...new Set(decks.map(d => d.owner))].slice(0, 2000)) + '&select=id,handle,listed') : [];
  const urls = [];
  // A profile is in the sitemap only if it's listed (an unlisted one is noindex), dated by its newest public deck.
  for (const o of owners) if (o.listed) urls.push({ loc: origin + '/@' + o.handle, lastmod: String(decks.find(d => d.owner === o.id).updated_at || '').slice(0, 10) });
  for (const d of decks) { const o = owners.find(x => x.id === d.owner); if (o) urls.push({ loc: origin + urlOf(o.handle, d.slug), lastmod: String(d.updated_at || '').slice(0, 10) }); }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => '<url><loc>' + u.loc.replace(/&/g, '&amp;') + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') + '</url>').join('\n') + '\n</urlset>\n';
}

// ---------- "Delete my data" ----------
// Everything the study network holds about someone goes: their profile, follows (both ways), saves, subscriptions, news,
// suggestions, and places in classes. Their decks stop being shared (people who studied or copied one keep their cards, "from
// <name>"), and the pictures and sounds they made public are deleted. store.mjs's data.reset calls this. Safe to run again if
// it stopped halfway (it finds everything by the person's id). Supabase would chain most of these deletes from the profile's;
// this computer's stand-in doesn't, so they're all done here.
const chunk = (list, n = 100) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
export async function forget(uid) {
  const sid = socialId(uid), me = val(sid), del = (table, filter) => rest('/' + table + '?' + filter, { method: 'DELETE' });
  const decks = (await rest('/shared_decks?owner=eq.' + me + '&select=id&limit=10000')).map(r => r.id);
  const owned = (await rest('/classes?owner=eq.' + me + '&select=id&limit=1000')).map(r => r.id);
  // Suggestions of theirs, and on their decks: reports about them go too (they name the person).
  const sugs = new Set((await rest('/suggestions?author=eq.' + me + '&select=id&limit=100000')).map(s => s.id));
  for (const ids of chunk(decks)) for (const s of await rest('/suggestions?shared_id=in.' + inList(ids) + '&select=id&limit=100000')) sugs.add(s.id);
  // Their decks, with everything that hangs on them.
  for (const ids of chunk(decks)) {
    const list = inList(ids), assigned = (await rest('/assignments?shared_id=in.' + list + '&select=id&limit=10000')).map(a => a.id);
    for (const a of chunk(assigned)) await del('class_progress', 'assignment_id=in.' + inList(a));
    await del('assignments', 'shared_id=in.' + list);
    await del('class_decks', 'shared_id=in.' + list);
    for (const t of ['shared_cards', 'deck_versions', 'suggestions', 'stars', 'subscriptions', 'card_stats', 'notifications']) await del(t, 'shared_id=in.' + list);
    await del('reports', 'kind=eq.deck&target=in.' + list);
    await del('shared_decks', 'id=in.' + list);
  }
  // Their classes go with their people, decks, assignments, and progress; a deck of someone else's that was only in one is private again.
  for (const ids of chunk(owned)) {
    const list = inList(ids), inThem = [...new Set((await rest('/class_decks?class_id=in.' + list + '&select=shared_id&limit=10000')).map(x => x.shared_id))];
    for (const t of ['class_progress', 'assignments', 'class_decks', 'class_members']) await del(t, 'class_id=in.' + list);
    await del('classes', 'id=in.' + list);
    for (const sharedId of inThem) if (!(await rest('/class_decks?shared_id=eq.' + val(sharedId) + '&select=class_id&limit=1')).length) await rest('/shared_decks?id=eq.' + val(sharedId) + '&visibility=eq.class', { method: 'PATCH', body: { visibility: 'private', updated_at: nowIso() } });
  }
  // What they did on other people's decks and in their classes.
  const onDecks = new Set([...(await rest('/stars?user_id=eq.' + me + '&select=shared_id&limit=100000')), ...(await rest('/subscriptions?user_id=eq.' + me + '&select=shared_id&limit=100000'))].map(r => r.shared_id));
  const follows = await rest('/follows?or=' + encodeURIComponent('(follower.eq.' + qvalRaw(sid) + ',followee.eq.' + qvalRaw(sid) + ')') + '&select=follower,followee&limit=100000');
  const people = new Set(follows.flatMap(f => [f.follower, f.followee]).filter(x => x !== sid));
  for (const t of ['stars', 'subscriptions', 'card_stats', 'suggestions']) await del(t, (t === 'suggestions' ? 'author' : 'user_id') + '=eq.' + me);
  await del('follows', 'follower=eq.' + me); await del('follows', 'followee=eq.' + me);
  await del('notifications', 'user_id=eq.' + me); await del('notifications', 'actor=eq.' + me);
  // The people they blocked are theirs to forget. Blocks against them stay: starting over doesn't lift a block.
  await del('blocks', 'blocker=eq.' + me).catch(e => console.error('blocks', e.message));
  for (const t of ['class_progress', 'class_members', 'verify_requests']) await del(t, 'user_id=eq.' + me);
  // Reports they sent stay for Lucida's team, without them; reports about them (their profile, their suggestions) go.
  await rest('/reports?reporter=eq.' + me, { method: 'PATCH', body: { reporter: null } });
  await del('reports', 'kind=eq.profile&target=eq.' + me);
  for (const ids of chunk([...sugs])) await del('reports', 'kind=eq.suggestion&target=in.' + inList(ids));
  // Where they're only named on someone else's deck: an assignment or deck they added, a version they made, a helper or
  // contributor, a teacher's check.
  await rest('/assignments?created_by=eq.' + me, { method: 'PATCH', body: { created_by: null } });
  await rest('/class_decks?added_by=eq.' + me, { method: 'PATCH', body: { added_by: null } });
  await rest('/deck_versions?author=eq.' + me, { method: 'PATCH', body: { author: null } });
  for (const col of ['helpers', 'contributors']) {
    for (const r of await rest('/shared_decks?' + col + '=cs.' + encodeURIComponent(JSON.stringify([{ id: sid }])) + '&select=id,' + col + '&limit=1000')) await rest('/shared_decks?id=eq.' + val(r.id), { method: 'PATCH', body: { [col]: (r[col] || []).filter(x => x.id !== sid) } });
  }
  for (const r of await rest('/shared_decks?checked=not.is.null&select=id,checked&limit=5000')) if (r.checked && r.checked.id === sid) await rest('/shared_decks?id=eq.' + val(r.id), { method: 'PATCH', body: { checked: null } });
  await del('profiles', 'id=eq.' + me);
  // The numbers other people see (saves, studying, copies, followers) drop by them.
  for (const sharedId of onDecks) await countFollowing(sharedId).catch(() => {});
  for (const id of people) await recountPeople(id).catch(() => {});
  if (publicMedia.on() && !isDev(sid) && sid !== 'local') await publicMedia.clear(sid);
  return {};
}
export { cloud };
