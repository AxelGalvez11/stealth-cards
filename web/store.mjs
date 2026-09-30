// Your decks, cards, and reviews, saved in data/stealth-cards.json next to the app (images and audio in data/media).
// Online (on Vercel) each person's library lives in Supabase instead (see supa.mjs): withLibrary() runs one request
// against the signed-in person's newest copy and saves it once at the end. The web app and connected AI apps (over
// MCP) both change data through apply(), so every change is saved the same way.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { readFile, writeFile, access } from 'node:fs/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { cloud, library, files } from './supa.mjs';
import { newLink } from './auth.mjs';
import { FREE_MEDIA } from './plans.mjs';
import { grade as fsrsGrade, newCard, cleanW } from './fsrs.js';
import { GAPS, LEECH_AT, LEECH_TAG, leechAt, leechAct, scheduled } from './sched.js';
import R from './rich.js';
import { placeBefore, cardBefore, cardToDeck } from './order.js';
import { THEME_KEYS } from './themes/index.js';

export const DATA = process.env.STEALTH_DATA || fileURLToPath(new URL('../data/', import.meta.url));
export const MEDIA = join(DATA, 'media');
const FILE = join(DATA, 'stealth-cards.json');

const fresh = () => ({
  version: 1, rev: 1,
  settings: { name: '', color: 0, look: 'system', darkMode: 'black', grads: 'mix', prog: 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, reminder: '9:00 AM', photo: '', yourPhoto: null, welcomed: false, tune: null,
    // Settings › Theme (Pro): a theme from web/themes/index.js ('lucida' is the app's own look), and whether your
    // public profile and decks show it to visitors.
    theme: 'lucida', themeProfile: true },
  ai: { perms: { read: true, text: true, media: true, edit: true, check: false, del: false }, clients: {} },
  folders: [], decks: [], cards: [], logs: []
});
// Saved data from an older version gets any settings added since. The welcome after your first sign-in (`welcomed`)
// counts as seen for anyone who already has decks or cards.
// Decks get the settings added since too (no exam date, and the usual rule for cards you keep forgetting).
const upgrade = d => { const f = fresh(), was = { welcomed: !!((d.decks || []).length || (d.cards || []).length) };
  return { ...f, ...d, settings: { ...f.settings, ...was, ...d.settings }, ai: { ...f.ai, ...d.ai, perms: { ...f.ai.perms, ...(d.ai || {}).perms } },
    decks: (d.decks || f.decks).map(x => ({ ...DECK_NEW, ...x })) }; };
const DECK_NEW = { exam: null, leechAt: LEECH_AT, leechAct: 'tag' };
// The library a request works on: this computer's one, or (online) a copy of the signed-in person's, one per request,
// so two requests running at once never share a copy. `later` is work to finish before saving; `touched` is the decks
// a request changed, for sharing their new cards once the save is done (see onSaved).
// LUCIDA_PLAN=free shows this computer's app as it is on Free (everything is Pro here otherwise), for checking the Free
// screens; online, `pro` comes from the person's plan.
const here = { uid: null, S: fresh(), base: null, dirty: false, later: [], after: [], touched: new Map(), file: FILE, pro: !cloud() && process.env.LUCIDA_PLAN === 'free' ? false : undefined };
const current = new AsyncLocalStorage();
const lib = () => current.getStore() || here;
// On this computer, a made-up person (web/handler.mjs: /dev/as/<name>, only on localhost) has a library of their own in
// data/users/, so sharing, suggestions and follows can be tried with several people at once. Their ids start "dev_".
export const isDev = uid => typeof uid === 'string' && /^dev_[a-z0-9]{1,24}$/.test(uid);
const devLibs = new Map();
function devLib(uid) {
  if (!devLibs.has(uid)) {
    const file = join(DATA, 'users', uid.slice(4) + '.json');
    let S = fresh();
    try { if (existsSync(file)) S = upgrade(JSON.parse(readFileSync(file, 'utf8'))); } catch { /* a broken file starts over */ }
    devLibs.set(uid, { uid, S, base: null, dirty: false, later: [], after: [], touched: new Map(), file });
  }
  return devLibs.get(uid);
}
// Work that runs once a request's changes are made, just before its library is saved: social.mjs shares a changed
// deck's new cards this way, and what it shared is saved with the library. If the save loses a race, the request runs
// again from the newer copy, and sharing the same cards again changes nothing.
const saveHooks = [];
export const onSave = fn => { saveHooks.push(fn); };
async function beforeSave(L) {
  if (!L.touched.size) return;
  for (const fn of saveHooks) await fn(L);
  L.touched = new Map();
}
// Work that must happen only once the library really saved (a suggestion marked as taken, news sent), since a save
// that loses a race runs the whole request again from the newer copy.
export const afterSaving = fn => { lib().after.push(fn); };
// Reviews of a card from someone else's deck: its owner sees, without names, which cards people miss most
// (social.mjs counts them). Each call has this learner's totals for the card, so counting it again changes nothing.
const reviewHooks = [];
export const onReviewed = fn => { reviewHooks.push(fn); };
async function afterSave(L) { const list = L.after; L.after = []; for (const fn of list) await fn(); }
export function load() {
  if (cloud()) return here.S;
  mkdirSync(MEDIA, { recursive: true });
  if (existsSync(FILE)) here.S = upgrade(JSON.parse(readFileSync(FILE, 'utf8')));
  return here.S;
}
// Online: loads uid's newest copy, runs fn, and saves once. False means another request saved first, so the caller
// should run it again. A first visit makes the library (and its personal MCP link), unless `existing` says it must
// already be there (an AI app's link can't make one). `pro`: whether they have Pro (false means Free).
export async function withLibrary(uid, fn, { existing = false, pro } = {}) {
  if (!cloud()) {
    const L = isDev(uid) ? devLib(uid) : here;
    if (isDev(uid)) L.pro = pro;   // a made-up person has the plan the server gave them (names starting with free are on Free)
    return current.run(L, async () => { L.touched = new Map(); L.later = []; L.after = []; await fn(); await Promise.all(L.later); await beforeSave(L); await afterSave(L); return true; });
  }
  const L = { uid, S: null, base: null, dirty: false, later: [], after: [], touched: new Map(), pro };
  return current.run(L, async () => {
    const row = await library.load(uid);
    if (!row && existing) throw Object.assign(new Error('No such library'), { status: 401 });
    L.S = row ? upgrade(row.state) : fresh(); L.base = row ? row.rev : null; L.dirty = !row;
    if (!L.S.ai.key) makeLink(L);
    await fn();
    await Promise.all(L.later);
    await beforeSave(L);
    const ok = !L.dirty || (L.base == null ? await library.create(uid, L.S) : await library.update(uid, L.S, L.base));
    if (ok) await afterSave(L);
    return ok;
  });
}
// The rev of uid's library without loading it (the app asks every few seconds whether anything changed).
export const revOf = async uid => (cloud() ? (await library.rev(uid)) ?? 0 : isDev(uid) ? devLib(uid).S.rev : here.S.rev);
// Whose library this request works on (null on this computer, unless it's a made-up person).
export const uidOf = () => lib().uid;
function makeLink(L) { L.S.ai.key = newLink(L.uid); L.dirty = true; }
const save = () => {
  const L = lib();
  L.S.rev++;
  if (cloud()) { L.dirty = true; return; }
  const file = L.file || FILE, tmp = file + '.tmp';
  mkdirSync(dirname(file), { recursive: true }); writeFileSync(tmp, JSON.stringify(L.S)); renameSync(tmp, file);
};
// For changes made outside apply() (social.mjs: studying or copying a shared deck, its updates arriving): saves them
// like any other change.
export const saved = () => save();
// Pictures and sound for cards: in data/media here, in the person's folder of the Supabase bucket online. An account has
// room for so many files and megabytes, kept as a running count in its library (Delete my data clears the files and starts
// the count over). Free's room is modest and Pro's large; neither is unlimited. LUCIDA_MEDIA_FILES and LUCIDA_MEDIA_MB set
// it lower, for checks.
export const UPLOAD_FULL = 'Your account has no room for more pictures and sounds.';
export const mediaRoom = () => ({ files: +process.env.LUCIDA_MEDIA_FILES || (isPro() ? 5000 : 500), bytes: (+process.env.LUCIDA_MEDIA_MB || (isPro() ? 5000 : 500)) * 1e6 });
// The same file again (a request that runs twice, an AI app trying again after a bad link, the same picture on two cards) is the
// same file, since files are named after what is in them, so it is counted once: the count keeps a 16-letter key for each file.
const keyOf = name => String(name).replace(/\.\w+$/, '').slice(1, 17);
// Room for one more file of `bytes`, counted now (the count is saved with the library); throws when there is none.
export function reserveMedia(name, bytes) {
  const L = lib(), used = L.S.uploads || { n: 0, bytes: 0, names: '' }, room = mediaRoom(), key = keyOf(name);
  if (key && (' ' + (used.names || '') + ' ').includes(' ' + key + ' ')) return;
  if (used.n + 1 > room.files || used.bytes + bytes > room.bytes) throw Object.assign(new Error(UPLOAD_FULL), { full: true });
  L.S.uploads = { n: used.n + 1, bytes: used.bytes + bytes, names: ((used.names || '') + ' ' + key).trim() }; save();
}
const writeMedia = (name, buf, type) => (cloud() ? files.put(lib().uid, name, buf, type) : writeFile(join(MEDIA, name), buf));
// A picture or sound an AI app brings: counted, then stored.
export async function putMedia(name, buf, type) { reserveMedia(name, buf.length); await writeMedia(name, buf, type); }
// The app's own upload: counted now, but stored only once the library (with its count) has really saved. A request that loses
// a race to another change runs again from the newer copy, and only the run that wins stores anything, so a burst of uploads at
// once can't leave files behind that were never counted.
export function putMediaLater(name, buf, type) { reserveMedia(name, buf.length); afterSaving(() => writeMedia(name, buf, type)); }
export const readMedia = name => (cloud() ? files.get(lib().uid, name) : readFile(join(MEDIA, name)).catch(() => null));
export const hasMedia = name => (cloud() ? files.has(lib().uid, name) : access(join(MEDIA, name)).then(() => true, () => false));
export const mediaLink = (name, uid) => (cloud() ? files.link(uid, name) : Promise.resolve(null));
export const state = () => lib().S;
// Pro's scheduling tools (an exam date, tuning, the rule for cards you keep forgetting) and deep stats: on for Pro and on
// this computer, off on Free.
export const isPro = () => lib().pro !== false;
const PRO_ONLY = ' part of Lucida Pro: lucida.cards/pricing';
const needPro = what => { if (!isPro()) throw new Error(what + PRO_ONLY); };
// On Free, up to FREE_MEDIA cards can have a picture or a sound (Pro has no limit, and neither does this computer).
export const MEDIA_FULL = 'Free includes up to ' + FREE_MEDIA + ' pictures and sounds. Go Pro for as many as you like: lucida.cards/pricing';
// Only pictures and sound they uploaded count: a shared deck's are the owner's (they come as public links).
const own = x => typeof x === 'string' && !/^https?:/.test(x);
// A picture with hidden parts is one picture, however many boxes (cards) it has.
export const mediaLeft = () => {
  if (lib().pro !== false) return Infinity;
  const seen = new Set();
  for (const c of state().cards) if (own(c.image) || own(c.audio)) seen.add(c.box != null && c.group ? c.group : c.id);
  return Math.max(0, FREE_MEDIA - seen.size);
};
// Your own FSRS parameters, when you've tuned them and they're on (Pro); otherwise the standard ones (undefined).
export const tunedW = () => { const t = state().settings.tune; return t && t.on && t.w && isPro() ? t.w : undefined; };
const id = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const newId = id;
const clean = (x, n = 5000) => String(x ?? '').slice(0, n);
const cleanTags = t => (Array.isArray(t) ? [...new Set(t.map(x => clean(x, 40).trim()).filter(Boolean))].slice(0, 50) : []);
const findDeck = x => state().decks.find(d => d.id === x) || state().decks.find(d => d.name.toLowerCase() === String(x || '').toLowerCase());
const deckOf = c => state().decks.find(d => d.id === c.deckId);
// Folders hold decks (one level, no folders inside folders). A deck names its folder by id; null is the library itself.
const folderOf = x => { const F = state().folders; return (F.find(f => f.id === x) || F.find(f => f.name.toLowerCase() === String(x || '').trim().toLowerCase()) || {}).id || null; };
// What Learn mode, flashcards, and Live show behind a deck: its own colors, faint (the default), a plain page, the sky,
// the sunset, or a photo.
export const BG_KINDS = ['deck', 'plain', 'sky', 'sunset', 'photo'];
const cleanBg = (was, o) => { const b = { kind: 'deck', image: null, ...was, ...pick(o, ['kind', 'image']) }; return { kind: BG_KINDS.includes(b.kind) ? b.kind : 'deck', image: b.image ? clean(b.image, 300) : null }; };
// A card's sound, drawn as a waveform (web/sound.js): its length in seconds, and one letter per peak.
const cleanWave = w => (w && typeof w === 'object' && typeof w.p === 'string' && /^[\w-]{8,256}$/.test(w.p) ? { d: Math.min(36000, Math.max(0, Math.round(+w.d * 100) / 100 || 0)), p: w.p } : null);
// The words hidden in a fill-in-the-blank card's [[blanks]] (read the same way the app draws them).
export const blanks = text => R.blanks(text);
// Image occlusion: boxes over an image card's picture, each hiding one part, with what's under it (its label). Each box
// is its own card, like each blank of a fill-in-the-blank card. A box's place and size are fractions of the picture
// (0 to 1), so it fits the picture at any size; its id keeps the right card with it when boxes change.
export const MAX_BOXES = 30;
const unit = v => Math.min(1, Math.max(0, Number.isFinite(+v) ? +v : 0));
const round4 = v => Math.round(v * 10000) / 10000;
export function cleanBoxes(list) {
  const ids = new Set();
  return (Array.isArray(list) ? list : []).slice(0, MAX_BOXES).map(b => {
    if (!b || typeof b !== 'object') return null;
    const x = unit(b.x), y = unit(b.y), w = Math.min(unit(b.w), 1 - x), h = Math.min(unit(b.h), 1 - y);
    if (w < .005 || h < .005) return null;
    let bid = /^[A-Za-z0-9_-]{1,24}$/.test(String(b.id || '')) ? String(b.id) : id('b');
    if (ids.has(bid)) bid = id('b');
    ids.add(bid);
    return { id: bid, x: round4(x), y: round4(y), w: round4(w), h: round4(h), label: clean(b.label, 200).replace(/\s+/g, ' ').trim() };
  }).filter(Boolean);
}
const occMode = m => (m === 'all' ? 'all' : 'one');

export function makeDeck(o = {}) {
  const S = state(), st = S.settings;
  const d = { id: id('d'), name: clean(o.name, 120).trim() || 'Untitled deck', tags: cleanTags(o.tags), created: Date.now(),
    cover: { style: o.style || st.grads || 'mix', round: +o.round || 0, image: o.image || null, seed: clean(o.name, 120).trim() || 'Untitled deck' }, paused: false,
    grading: ['four', 'binary', 'piles'].includes(o.grading) ? o.grading : st.grading, fsrs: o.fsrs ?? st.fsrs,
    goal: Math.min(97, Math.max(70, +o.goal || st.goal)), gapIdx: 3, steps: ['1m', '10m'],
    perDay: Math.min(999, Math.max(0, Math.round(o.perDay ?? st.perDay) || 0)), piles: [{ name: 'Know it' }, { name: 'Almost' }, { name: 'No clue' }],
    folder: folderOf(o.folder), bg: cleanBg(null, o.bg), ...DECK_NEW };
  S.decks.push(d);
  return d;
}
// One card, or one per blank for fill-in-the-blank text when asked.
function makeCards(deck, o, source = 'you') {
  const S = state();
  const kind = ['basic', 'cloze', 'image', 'audio'].includes(o.kind) ? o.kind : 'basic';
  const base = { deckId: deck.id, kind, front: clean(o.front), back: clean(o.back), note: clean(o.note, 2000), text: clean(o.text),
    tags: cleanTags(o.tags), image: o.image || null, audio: o.audio || null, wave: o.audio ? cleanWave(o.wave) : null, speak: clean(o.speak, 500), lang: clean(o.lang, 20), auto: o.auto !== false,
    source: clean(source, 60), pending: !!o.pending, created: Date.now(), srs: newCard(), pile: null, trail: [] };
  trailStep(base, source === 'import' ? 'imported' : 'made', source);
  const n = kind === 'cloze' ? blanks(base.text).length : 0;
  // An image card with boxes: one card per box, each asking its own box.
  const boxes = kind === 'image' ? cleanBoxes(o.boxes) : [];
  if (kind === 'image') { base.boxes = boxes; base.occ = occMode(o.occ); }
  const list = kind === 'cloze' && o.clozeMode !== 'one' && n > 1 ? Array.from({ length: n }, (_, i) => ({ ...base, cloze: i }))
    : boxes.length ? boxes.map(b => ({ ...base, cloze: null, box: b.id })) : [{ ...base, cloze: kind === 'cloze' ? (o.clozeMode === 'one' ? -1 : 0) : null }];
  const group = kind === 'cloze' || boxes.length ? id('g') : null;
  const cards = list.map(c => ({ ...c, id: id('c'), group, trail: (c.trail || []).map(x => ({ ...x })) }));
  S.cards.push(...cards);
  return cards;
}
const DECK_KEYS = ['name', 'tags', 'cover', 'paused', 'grading', 'fsrs', 'goal', 'gapIdx', 'steps', 'perDay', 'piles', 'folder', 'bg', 'exam', 'leechAt', 'leechAct'];
// An exam day is a real calendar day, written 2026-10-12.
const cleanDay = x => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x || '')); if (!m) return null; const t = new Date(+m[1], +m[2] - 1, +m[3]); return t.getMonth() === +m[2] - 1 && t.getDate() === +m[3] ? m[0] : null; };
// Tuned parameters as they're saved (tune.js made them): { on, w, n (reviews they came from), at, loss, base }.
const cleanTune = (was, t) => {
  if (t == null) return null;
  const x = { ...(was || {}), ...pick(t, ['on', 'w', 'n', 'reviews', 'at', 'loss', 'base', 'gain']) };
  const w = x.w == null ? null : cleanW(x.w);
  if (x.w != null && !w) throw new Error('Those tuned settings don’t look right.');
  const num = v => (Number.isFinite(+v) ? +v : null);
  return { on: !!x.on && !!w, w, n: Math.max(0, Math.round(+x.n) || 0), reviews: Math.max(0, Math.round(+x.reviews) || 0), at: num(x.at) || Date.now(), loss: num(x.loss), base: num(x.base), gain: num(x.gain) };
};
const CARD_KEYS = ['kind', 'front', 'back', 'note', 'text', 'tags', 'image', 'audio', 'wave', 'speak', 'lang', 'auto', 'pending', 'cloze', 'boxes', 'occ'];
// What every card of one picture with boxes shares (everything but which box it asks, and its reviews).
const SHARED_KEYS = ['kind', 'front', 'back', 'note', 'tags', 'image', 'lang', 'pending', 'boxes', 'occ'];
// Keeps a picture's cards in step with its boxes: a new box gets a card, a box that's gone takes its card with it, and
// every other card keeps its reviews. A plain image card that gets boxes becomes the first box's card; one whose boxes
// are all gone is a plain image card again.
function syncBoxes(c, p, before) {
  const S = state(), boxes = c.boxes || [], had = new Map((before || []).map(b => [b.id, b.label])), occ = c.box != null && !!c.group;
  const sibs = occ ? S.cards.filter(x => x.group === c.group && x.kind === 'image' && x.box != null) : [c];
  if (!sibs.includes(c)) sibs.push(c);
  const shared = pick(p, SHARED_KEYS);
  for (const x of sibs) Object.assign(x, shared);
  const keep = new Map();
  for (const x of sibs) if (x.box != null && boxes.some(b => b.id === x.box) && !keep.has(x.box)) keep.set(x.box, x);
  const spare = sibs.filter(x => x.box == null && ![...keep.values()].includes(x));
  if (!boxes.length) {
    const drop = new Set(sibs.filter(x => x !== c).map(x => x.id));
    S.cards = S.cards.filter(x => !drop.has(x.id));
    c.box = null; c.group = null; c.boxes = [];
    return;
  }
  const group = occ ? c.group : id('g');
  for (const b of boxes) {
    let x = keep.get(b.id);
    if (!x && spare.length) { x = spare.shift(); x.box = b.id; }
    if (!x) { x = { ...c, id: id('c'), box: b.id, srs: newCard(), pile: null, created: Date.now() }; delete x.explain; delete x.quiz; S.cards.push(x); }
    x.group = group; x.cloze = null;
    keep.set(b.id, x);
    // A box that says something new needs a new explanation.
    if (had.has(b.id) && had.get(b.id) !== b.label) { delete x.explain; delete x.quiz; }
  }
  const kept = new Set([...keep.values()].map(x => x.id));
  S.cards = S.cards.filter(x => !sibs.includes(x) || kept.has(x.id));
}
const pick = (o, keys) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => keys.includes(k)));

// AI explanations (ai.mjs, handler.mjs): how many were written today, and saving one on its card. Only the server
// changes these, so they aren't actions the app can send.
export const aiLeft = (day, limit) => { const u = state().ai.used; return Math.max(0, limit - (u && u.day === day ? u.n : 0)); };
export function useAi(day, limit) {
  const S = state(), n = S.ai.used && S.ai.used.day === day ? S.ai.used.n : 0;
  if (n >= limit) return false;
  S.ai.used = { day, n: n + 1 }; save(); return true;
}
export function refundAi(day) { const S = state(); if (S.ai.used && S.ai.used.day === day && S.ai.used.n > 0) { S.ai.used = { day, n: S.ai.used.n - 1 }; save(); } }
export function saveExplain(cardId, text, by) {
  const c = state().cards.find(x => x.id === cardId); if (!c) return false;
  // A fill-in-the-blank text shares one explanation; each box of a picture has its own answer, so its own explanation.
  const sibs = c.group && c.kind === 'cloze' ? state().cards.filter(x => x.group === c.group) : [c];
  sibs.forEach(x => { x.explain = { text: clean(text, 2000), by: clean(by, 60), at: Date.now() }; });
  save(); return true;
}

// A deck someone else shares, which you study as it is (social.mjs): its cards follow the owner's, so you can't change
// them here; you suggest a change instead. Only your own study settings for it are yours to change. A copy
// (link.mode 'copy') is yours to change, and so is a deck its owner stopped sharing (link.gone).
const readOnly = d => !!(d && d.link && d.link.mode === 'study' && !d.link.gone);
const LOCAL_DECK_KEYS = ['paused', 'grading', 'fsrs', 'goal', 'gapIdx', 'steps', 'perDay', 'piles', 'folder', 'bg'];
const notYours = d => new Error('This deck is ' + ((d.link.owner && d.link.owner.name) || 'someone else') + '’s. Suggest a change instead.');
// What a request changed, deck by deck, and who to credit (an AI app, or the person whose suggestion the owner took),
// for sharing the new cards after the save (onSaved).
function touch(deckId, who) {
  const L = lib();
  if (!deckId || L.touched.has(deckId)) return;
  L.touched.set(deckId, { ai: who && !['you', 'import'].includes(who) ? clean(who, 60) : '', credit: L.credit || null });
}
// How a card came to be, newest last, a few steps long: made (by you, your AI, or an import), checked (you kept a card
// your AI made), edited, or taken from someone's suggestion. Public decks show it ("Added by Claude · Edited by Maria").
const trailStep = (c, what, who) => {
  const credit = lib().credit, step = { w: what, at: Date.now() };
  if (credit) { step.by = credit.name; if (credit.ai) step.ai = credit.ai; }
  else if (who && !['you', 'import'].includes(who)) step.ai = clean(who, 60);
  const last = (c.trail || [])[(c.trail || []).length - 1];
  // Editing the same card again and again is one step.
  if (last && last.w === what && what === 'edited' && last.by === step.by && last.ai === step.ai) { last.at = step.at; return; }
  c.trail = [...(c.trail || []), step].slice(-8);
};
// Credit for changes made on someone's behalf (social.mjs takes a suggestion this way): who they came from.
export async function withCredit(credit, fn) { const L = lib(), was = L.credit; L.credit = credit; try { return await fn(); } finally { L.credit = was; } }

// Every change goes through here. Returns what the action made (ids), or throws with a message people can read.
export function apply(a, who = 'you') {
  const out = run(a, who);
  save();
  return out;
}
function run(a, who) {
  const L = lib(), S = L.S;
  switch (a.type) {
    case 'deck.add': if (a.image) needPro('Photo covers are'); return { id: makeDeck(a).id };
    case 'deck.update': {
      const d = findDeck(a.id); if (!d) throw new Error('No such deck');
      const p = pick(a.patch, readOnly(d) ? LOCAL_DECK_KEYS : DECK_KEYS);
      if (['name', 'tags', 'cover'].some(k => k in p)) touch(d.id, who);
      if ('name' in p) p.name = clean(p.name, 120);
      if ('tags' in p) p.tags = cleanTags(p.tags);
      if ('goal' in p) p.goal = Math.min(97, Math.max(70, +p.goal || 90));
      if ('perDay' in p) p.perDay = Math.min(999, Math.max(0, Math.round(+p.perDay) || 0));
      if ('gapIdx' in p) p.gapIdx = Math.min(GAPS.length - 1, Math.max(0, +p.gapIdx || 0));
      // Photo covers are Pro: a cover picture already there can stay (or come off), but another can't be set.
      if ('cover' in p) { const img = pick(p.cover, ['image']).image; if (img && img !== d.cover.image) needPro('Photo covers are'); p.cover = { ...d.cover, ...pick(p.cover, ['style', 'round', 'image']) }; }
      if ('folder' in p) { const f = p.folder ? folderOf(p.folder) : null; if (p.folder && !f) throw new Error('No such folder'); p.folder = f; }
      if ('bg' in p) p.bg = cleanBg(d.bg, p.bg);
      // Pro: an exam date, and what happens to cards you keep forgetting. Taking an exam date off works on any plan.
      if ('exam' in p) { if (p.exam) needPro('Exam dates are'); p.exam = p.exam ? cleanDay(p.exam) : null; if (a.patch.exam && !p.exam) throw new Error('That isn’t a date.'); }
      if ('leechAt' in p) { needPro('Changing when a card counts as forgotten too often is'); p.leechAt = Math.min(30, Math.max(3, Math.round(+p.leechAt) || LEECH_AT)); }
      if ('leechAct' in p) { needPro('Changing what happens to cards you keep forgetting is'); p.leechAct = p.leechAct === 'pause' ? 'pause' : 'tag'; }
      Object.assign(d, p);
      return { id: d.id };
    }
    // Dragging a deck in the Library: to another spot (just before the deck `before`, or last when it's null), and into
    // or out of a folder (`folder`: a folder id, or null for none). The Library lists decks in this order (see order.js).
    case 'deck.move': {
      const d = findDeck(a.id); if (!d) throw new Error('No such deck');
      if ('folder' in a) { const f = a.folder ? folderOf(a.folder) : null; if (a.folder && !f) throw new Error('No such folder'); d.folder = f; }
      if ('before' in a) {
        const b = a.before == null ? null : S.decks.find(x => x.id === a.before); if (a.before != null && !b) throw new Error('No such deck');
        placeBefore(S.decks, d, b);
      }
      return { id: d.id };
    }
    case 'folder.add': {
      const f = { id: id('f'), name: clean(a.name, 80).trim() || 'New folder', created: Date.now() };
      S.folders.push(f);
      return { id: f.id };
    }
    case 'folder.update': {
      const f = S.folders.find(x => x.id === a.id); if (!f) throw new Error('No such folder');
      if (a.patch && 'name' in a.patch) f.name = clean(a.patch.name, 80).trim() || f.name;
      return { id: f.id };
    }
    // A folder goes; its decks stay, back in the library.
    case 'folder.delete': {
      const f = S.folders.find(x => x.id === a.id); if (!f) throw new Error('No such folder');
      S.folders = S.folders.filter(x => x !== f);
      S.decks.forEach(d => { if (d.folder === f.id) d.folder = null; });
      return { id: f.id };
    }
    case 'deck.delete': {
      const d = findDeck(a.id); if (!d) throw new Error('No such deck');
      S.decks = S.decks.filter(x => x !== d); S.cards = S.cards.filter(c => c.deckId !== d.id); S.logs = S.logs.filter(l => l.deckId !== d.id);
      // A shared deck stops being shared when it goes (people who copied it keep their copies), and one you studied or
      // copied from someone stops counting you.
      if (d.share) L.touched.set(d.id, { gone: d.share.id });
      else if (d.link && !d.link.gone) L.touched.set(d.id, { left: d.link.id });
      return { id: d.id };
    }
    case 'card.add': {
      if ((a.image || a.audio) && mediaLeft() < 1) throw new Error(MEDIA_FULL);
      const d = findDeck(a.deckId) || (a.deckName ? makeDeck({ name: a.deckName }) : null); if (!d) throw new Error('No such deck');
      if (readOnly(d)) throw notYours(d);
      touch(d.id, who);
      return { ids: makeCards(d, a, who).map(c => c.id), deckId: d.id };
    }
    case 'card.update': {
      const c = S.cards.find(x => x.id === a.id); if (!c) throw new Error('No such card');
      // A shared deck's card only takes the shape of its sound, measured on this device (web/db.js).
      if (readOnly(deckOf(c)) && Object.keys(a.patch || {}).some(k => k !== 'wave')) throw notYours(deckOf(c));
      const p = pick(a.patch, CARD_KEYS);
      const kept = c.pending && p.pending === false;
      if ((p.image || p.audio) && !(c.image || c.audio) && mediaLeft() < 1) throw new Error(MEDIA_FULL);
      for (const k of ['front', 'back', 'text']) if (k in p) p[k] = clean(p[k]);
      if ('speak' in p) p.speak = clean(p.speak, 500);
      if ('lang' in p) p.lang = clean(p.lang, 20);
      // A new sound file brings its own waveform; without one, the old waveform goes (the app measures the new sound).
      if ('wave' in p) p.wave = cleanWave(p.wave);
      else if ('audio' in p && p.audio !== c.audio) p.wave = null;
      if ('tags' in p) p.tags = cleanTags(p.tags);
      if ('boxes' in p) p.boxes = cleanBoxes(p.boxes);
      if ('occ' in p) p.occ = occMode(p.occ);
      const mode = a.patch && a.patch.clozeMode;
      delete p.cloze;
      const stale = ['front', 'back', 'text'].some(k => k in p && p[k] !== c[k]), before = c.boxes;
      const edited = ['kind', 'front', 'back', 'note', 'text', 'image', 'audio', 'speak', 'boxes', 'occ'].some(k => k in p && JSON.stringify(p[k]) !== JSON.stringify(c[k]));
      Object.assign(c, p);
      if (kept) trailStep(c, 'checked', who);
      if (edited) trailStep(c, 'edited', who);
      if (kept || edited || 'tags' in p) touch(c.deckId, who);
      if (stale) for (const x of c.group ? S.cards.filter(y => y.group === c.group) : [c]) { delete x.explain; delete x.quiz; }
      // A card that stops being an image card leaves its picture, and takes its box with it (as if deleted).
      if (c.kind !== 'image' && c.box != null) {
        for (const x of S.cards) if (x !== c && c.group && x.group === c.group && x.boxes) x.boxes = x.boxes.filter(b => b.id !== c.box);
        c.box = null; c.group = null; delete c.boxes; delete c.occ;
      }
      // Fill in the blank: every card from the same text changes together, one card per blank (or one for all).
      if (c.kind === 'cloze') {
        const sibs = c.group ? S.cards.filter(x => x.group === c.group) : [c];
        sibs.forEach(x => Object.assign(x, p));
        const n = blanks(c.text).length, want = mode === 'one' || n < 2 ? 1 : n;
        if (mode) {
          sibs.sort((x, y) => (x.cloze ?? 0) - (y.cloze ?? 0));
          const keep = sibs.slice(0, want);
          keep.forEach((x, i) => { x.cloze = want === 1 ? (mode === 'one' ? -1 : 0) : i; x.group = c.group || (c.group = id('g')); });
          const drop = new Set(sibs.slice(want).map(x => x.id));
          S.cards = S.cards.filter(x => !drop.has(x.id));
          for (let i = keep.length; i < want; i++) S.cards.push({ ...c, id: id('c'), cloze: i, srs: newCard(), group: c.group, created: Date.now() });
        }
      }
      // A picture with boxes: every card of it changes together, one card per box.
      if (c.kind === 'image' && (c.box != null || (c.boxes || []).length)) syncBoxes(c, p, before);
      return { id: c.id };
    }
    // An AI's change to one of your cards, waiting for you ("Let me check AI cards and changes first"): new words, or
    // taking it out. Keeping it makes the change (card.proposal with take); tossing it leaves the card as it was.
    case 'card.propose': {
      const c = S.cards.find(x => x.id === a.id); if (!c) throw new Error('No such card');
      c.proposal = a.remove ? { remove: true, ai: clean(who, 60), at: Date.now() } : { patch: pick(a.patch, CARD_KEYS.filter(k => k !== 'pending')), ai: clean(who, 60), at: Date.now() };
      return { id: c.id };
    }
    case 'card.proposal': {
      const c = S.cards.find(x => x.id === a.id); if (!c || !c.proposal) throw new Error('That change is gone');
      const p = c.proposal; delete c.proposal;
      if (!a.take) return { id: c.id };
      if (p.remove) return run({ type: 'card.delete', id: c.id }, p.ai || who);
      return run({ type: 'card.update', id: c.id, patch: p.patch }, p.ai || who);
    }
    // Learn mode questions for cards, written by the learner's own AI app (mcp.mjs): multiple choice with plausible wrong
    // answers, or true-or-false statements, each with a why. An app can also leave an explanation for Explain.
    case 'card.quiz': {
      let n = 0;
      for (const q of (Array.isArray(a.quizzes) ? a.quizzes : []).slice(0, 500)) {
        const c = S.cards.find(x => x.id === q.card); if (!c) continue;
        const list = (Array.isArray(q.questions) ? q.questions : []).map(x => {
          const kind = x.kind === 'true_false' ? 'true_false' : 'choice', question = clean(x.question, 600).trim(), why = clean(x.why, 600).trim();
          if (kind === 'true_false') { const t = String(x.answer).trim().toLowerCase(); return question && (t === 'true' || t === 'false') ? { kind, question, answer: t, why } : null; }
          const answer = clean(x.answer, 300).trim(), wrong = [...new Set((Array.isArray(x.wrong) ? x.wrong : []).map(w => clean(w, 300).trim()).filter(w => w && w !== answer))].slice(0, 3);
          return question && answer && wrong.length ? { kind, question, answer, wrong, why } : null;
        }).filter(Boolean).slice(0, 5);
        if (list.length) { c.quiz = list; n += list.length; }
        if (q.explanation) c.explain = { text: clean(q.explanation, 2000).trim(), by: clean(who, 60), at: Date.now() };
        if (list.length || q.explanation) touch(c.deckId, who);
      }
      return { questions: n };
    }
    // Keeping cards your AI made that waited for you (Suggestions), several in one save.
    case 'card.keep': {
      const ids = new Set(a.ids || [a.id]);
      for (const c of S.cards) if (ids.has(c.id) && c.pending) { if (readOnly(deckOf(c))) throw notYours(deckOf(c)); c.pending = false; trailStep(c, 'checked', who); touch(c.deckId, who); }
      return { ids: [...ids] };
    }
    case 'card.delete': {
      const ids = new Set(a.ids || [a.id]);
      for (const c of S.cards) if (ids.has(c.id)) { if (readOnly(deckOf(c))) throw notYours(deckOf(c)); touch(c.deckId, who); }
      // A box's card going takes its box off the picture, so the picture's other cards stop hiding it.
      for (const c of S.cards) if (ids.has(c.id) && c.box != null && c.group) {
        for (const x of S.cards) if (x.group === c.group && !ids.has(x.id) && x.boxes) x.boxes = x.boxes.filter(b => b.id !== c.box);
      }
      S.cards = S.cards.filter(c => !ids.has(c.id)); S.logs = S.logs.filter(l => !ids.has(l.cardId));
      return { ids: [...ids] };
    }
    // Pausing cards: they never come up (flashcards, Learn mode, AI apps' due cards) until they're unpaused. Their
    // memory stays as it was.
    case 'card.pause': {
      const ids = new Set(Array.isArray(a.ids) ? a.ids : [a.id]);
      let n = 0;
      for (const c of S.cards) if (ids.has(c.id)) { c.paused = !!a.on; n++; }
      if (!n) throw new Error('No such card');
      return { n };
    }
    // Dragging a card on its deck's page (just before the card `before`, or last when it's null), or onto another deck
    // (`deckId`).
    case 'card.move': {
      const c = S.cards.find(x => x.id === a.id); if (!c) throw new Error('No such card');
      if (readOnly(deckOf(c)) || ('deckId' in a && readOnly(findDeck(a.deckId)))) throw notYours(readOnly(deckOf(c)) ? deckOf(c) : findDeck(a.deckId));
      touch(c.deckId, who); if ('deckId' in a) touch((findDeck(a.deckId) || {}).id, who);
      if ('deckId' in a) { const d = findDeck(a.deckId); if (!d) throw new Error('No such deck'); if (d.id !== c.deckId) cardToDeck(S, c, d.id); }
      if ('before' in a) {
        const b = a.before == null ? null : S.cards.find(x => x.id === a.before && x.deckId === c.deckId); if (a.before != null && !b) throw new Error('No such card');
        cardBefore(deckOf(c), S.cards, c, b && b.id);
      }
      return { id: c.id, deckId: c.deckId };
    }
    // A grade: the card's next review (FSRS, with your own tuned parameters on Pro), and a log of it, with how long the
    // card was on screen (`ms`, up to 3 minutes, for the time stats). A card forgotten once too often gets the Leech tag,
    // or is paused, as its deck says (`leech` on the log, so Undo puts it back).
    case 'review.grade': {
      const c = S.cards.find(x => x.id === a.cardId); if (!c) throw new Error('No such card');
      const d = deckOf(c), now = Date.now(), log = { id: id('l'), cardId: c.id, deckId: c.deckId, at: now, prev: c.srs, prevPile: c.pile, was: c.srs.state };
      if (Number.isFinite(+a.ms) && +a.ms > 0) log.ms = Math.min(180000, Math.round(+a.ms));
      if (a.pile != null) { c.pile = clean(a.pile, 60); log.pile = c.pile; }
      else {
        const g = Math.min(4, Math.max(1, Math.round(+a.rating || 3)));
        log.rating = g;
        if (scheduled(d)) c.srs = fsrsGrade(c.srs, g, now, { goal: d.goal / 100, maxDays: GAPS[d.gapIdx ?? 3], steps: d.steps, w: tunedW() });
        else c.srs = { ...c.srs, reps: (c.srs.reps || 0) + 1, last: now };
        // Like Anki: at the rule's count, and again every half of it after (so a card unpaused, or one already past a
        // lowered count, is caught at its next few forgets).
        const at = leechAt(d), n = c.srs.lapses || 0;
        if (scheduled(d) && n > (log.prev.lapses || 0) && n >= at && (n - at) % Math.ceil(at / 2) === 0) {
          if (leechAct(d) === 'pause') { if (!c.paused) { c.paused = true; log.leech = 'pause'; } }
          else if (!c.tags.includes(LEECH_TAG)) { c.tags = cleanTags([...c.tags, LEECH_TAG]); log.leech = 'tag'; }
        }
      }
      S.logs.push(log);
      if (d.link && c.origin && log.rating && reviewHooks.length) {
        const mine = S.logs.filter(l => l.cardId === c.id && l.rating), r = { sharedId: d.link.id, card: c.origin, reviews: mine.length, misses: mine.filter(l => l.rating === 1).length };
        afterSaving(() => Promise.all(reviewHooks.map(f => f(r))).catch(() => {}));
      }
      return { logId: log.id };
    }
    case 'review.undo': {
      const log = a.logId ? S.logs.find(l => l.id === a.logId) : S.logs.filter(l => !l.kind).pop(); if (!log) throw new Error('Nothing to undo');
      const c = S.cards.find(x => x.id === log.cardId);
      if (c) {
        c.srs = log.prev; c.pile = log.prevPile ?? null;
        if (log.leech === 'pause') c.paused = false;
        if (log.leech === 'tag') c.tags = c.tags.filter(g => g !== LEECH_TAG);
      }
      S.logs = S.logs.filter(l => l !== log);
      return { cardId: log.cardId };
    }
    // A Learn mode answer, for the stats (right or wrong, which kind of question, how long it took). It doesn't change
    // when the card comes back; learning a new card does, once the session is done.
    case 'learn.log': {
      const c = S.cards.find(x => x.id === a.cardId); if (!c) throw new Error('No such card');
      const log = { id: id('l'), cardId: c.id, deckId: c.deckId, at: Date.now(), kind: 'learn', q: ['mc', 'tf', 'blank', 'match', 'type'].includes(a.q) ? a.q : 'mc', ok: !!a.ok };
      if (Number.isFinite(+a.ms) && +a.ms > 0) log.ms = Math.min(180000, Math.round(+a.ms));
      S.logs.push(log);
      return { logId: log.id };
    }
    case 'settings.update': {
      const p = pick(a.patch, Object.keys(fresh().settings));
      if ('perDay' in p) p.perDay = Math.min(999, Math.max(0, Math.round(+p.perDay) || 0));
      if ('color' in p) p.color = Math.min(5, Math.max(0, Math.round(+p.color) || 0));
      // Profile picture: the Google photo, your own, or your initial on your color ('' until you pick, which shows the
      // Google photo if there is one). Your own is a picture you uploaded to Lucida, so it's always a /media/… path.
      if ('photo' in p && !['', 'google', 'yours', 'color'].includes(p.photo)) throw new Error('No such profile picture');
      if ('welcomed' in p) p.welcomed = !!p.welcomed;
      // Tune to you (Pro): the parameters fitted to your reviews, and whether they're in use. Going back to the standard
      // parameters works on any plan.
      if ('tune' in p) { if (p.tune && (p.tune.on || p.tune.w)) needPro('Tuning to your reviews is'); p.tune = cleanTune(S.settings.tune, p.tune); }
      if ('themeProfile' in p) p.themeProfile = !!p.themeProfile;
      // Themes are part of Pro (Lucida's own look is for everyone). Online the plan is known (L.pro); here everything is on.
      if ('theme' in p) {
        if (!THEME_KEYS.includes(p.theme)) throw new Error('No such theme');
        if (p.theme !== 'lucida' && L.pro === false) throw new Error('Themes are part of Pro. Go Pro at lucida.cards/pricing');
      }
      if ('yourPhoto' in p && p.yourPhoto !== null && !/^\/media\/[\w-]+\.(png|jpg|gif|webp)$/.test(String(p.yourPhoto))) throw new Error('Your photo has to be a picture you uploaded.');
      Object.assign(S.settings, p); return {};
    }
    case 'ai.perm': { if (a.id in S.ai.perms) S.ai.perms[a.id] = !!a.on; return {}; }
    case 'ai.client': { const n = clean(a.name, 80) || 'MCP app'; S.ai.clients[n] = { name: n, version: clean(a.version, 40), seen: Date.now() }; return {}; }
    case 'data.import': {
      const list = (a.cards || []).slice(0, 5000).filter(x => x && (x.front || x.text));
      // Free's limit on pictures and sound counts imported cards too (before anything is made).
      if (list.filter(x => own(x.image) || own(x.audio)).length > mediaLeft()) throw new Error(MEDIA_FULL);
      const d = findDeck(a.deckId) || makeDeck({ name: a.deckName || 'Imported cards' });
      if (readOnly(d)) throw notYours(d);
      touch(d.id, 'import');
      list.forEach(x => makeCards(d, x, 'import'));
      return { deckId: d.id, count: list.length };
    }
    case 'data.reset': {
      // Shared decks stop being shared (copies people made keep working).
      for (const d of S.decks) if (d.share) L.touched.set(d.id, { gone: d.share.id });
      // The rev keeps counting up, so every copy of the app sees the reset as the newest data.
      // The day's AI explanations used stay counted, so deleting your data doesn't give them back.
      const next = fresh(); next.ai.clients = S.ai.clients; next.ai.key = S.ai.key; next.ai.used = S.ai.used; next.rev = S.rev; next.settings.welcomed = true; L.S = next;
      if (cloud()) L.later.push(files.clear(L.uid)); else { rmSync(MEDIA, { recursive: true, force: true }); mkdirSync(MEDIA, { recursive: true }); }
      return {};
    }
    // A new personal MCP link; the old one stops working.
    case 'ai.link': {
      if (!cloud()) throw new Error('This copy of Lucida has no personal link; AI apps on this computer use /mcp.');
      makeLink(L);
      return {};
    }
    default: throw new Error('Unknown action ' + a.type);
  }
}
