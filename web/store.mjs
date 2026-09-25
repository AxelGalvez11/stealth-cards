// Your decks, cards, and reviews, saved in data/stealth-cards.json next to the app (images and audio in data/media).
// Online (on Vercel) each person's library lives in Supabase instead (see supa.mjs): withLibrary() runs one request
// against the signed-in person's newest copy and saves it once at the end. The web app and connected AI apps (over
// MCP) both change data through apply(), so every change is saved the same way.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { readFile, writeFile, access } from 'node:fs/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { cloud, library, files } from './supa.mjs';
import { newLink } from './auth.mjs';
import { FREE_MEDIA } from './plans.mjs';
import { grade as fsrsGrade, newCard } from './fsrs.js';
import R from './rich.js';
import { placeBefore, cardBefore, cardToDeck } from './order.js';

export const DATA = process.env.STEALTH_DATA || fileURLToPath(new URL('../data/', import.meta.url));
export const MEDIA = join(DATA, 'media');
const FILE = join(DATA, 'stealth-cards.json');
const GAPS = [30, 90, 180, 365, 730, 1825, 3650];

const fresh = () => ({
  version: 1, rev: 1,
  settings: { name: '', color: 0, look: 'system', grads: 'mix', prog: 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, reminder: '9:00 AM' },
  ai: { perms: { read: true, text: true, media: true, edit: true, check: false, del: false }, clients: {} },
  folders: [], decks: [], cards: [], logs: []
});
// Saved data from an older version gets any settings added since.
const upgrade = d => { const f = fresh(); return { ...f, ...d, settings: { ...f.settings, ...d.settings }, ai: { ...f.ai, ...d.ai, perms: { ...f.ai.perms, ...(d.ai || {}).perms } } }; };
// The library a request works on: this computer's one, or (online) a copy of the signed-in person's, one per request,
// so two requests running at once never share a copy. `later` is work to finish before saving.
const here = { uid: null, S: fresh(), base: null, dirty: false, later: [] };
const current = new AsyncLocalStorage();
const lib = () => current.getStore() || here;
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
  if (!cloud()) { await fn(); return true; }
  const L = { uid, S: null, base: null, dirty: false, later: [], pro };
  return current.run(L, async () => {
    const row = await library.load(uid);
    if (!row && existing) throw Object.assign(new Error('No such library'), { status: 401 });
    L.S = row ? upgrade(row.state) : fresh(); L.base = row ? row.rev : null; L.dirty = !row;
    if (!L.S.ai.key) makeLink(L);
    await fn();
    await Promise.all(L.later);
    if (!L.dirty) return true;
    return L.base == null ? library.create(uid, L.S) : library.update(uid, L.S, L.base);
  });
}
// The rev of uid's library without loading it (the app asks every few seconds whether anything changed).
export const revOf = async uid => (cloud() ? (await library.rev(uid)) ?? 0 : here.S.rev);
function makeLink(L) { L.S.ai.key = newLink(L.uid); L.dirty = true; }
const save = () => {
  const L = lib();
  L.S.rev++;
  if (cloud()) { L.dirty = true; return; }
  const tmp = FILE + '.tmp'; writeFileSync(tmp, JSON.stringify(L.S)); renameSync(tmp, FILE);
};
// Pictures and sound for cards: in data/media here, in the person's folder of the Supabase bucket online.
export const putMedia = (name, buf, type) => (cloud() ? files.put(lib().uid, name, buf, type) : writeFile(join(MEDIA, name), buf));
export const readMedia = name => (cloud() ? files.get(lib().uid, name) : readFile(join(MEDIA, name)).catch(() => null));
export const hasMedia = name => (cloud() ? files.has(lib().uid, name) : access(join(MEDIA, name)).then(() => true, () => false));
export const mediaLink = (name, uid) => (cloud() ? files.link(uid, name) : Promise.resolve(null));
export const state = () => lib().S;
// On Free, up to FREE_MEDIA cards can have a picture or a sound (Pro has no limit, and neither does this computer).
export const MEDIA_FULL = 'Free includes up to ' + FREE_MEDIA + ' pictures and sounds. Go Pro for as many as you like: lucida.cards/pricing';
export const mediaLeft = () => (lib().pro === false ? Math.max(0, FREE_MEDIA - state().cards.filter(c => c.image || c.audio).length) : Infinity);
const id = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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
// The words hidden in a fill-in-the-blank card's [[blanks]] (read the same way the app draws them).
export const blanks = text => R.blanks(text);

function makeDeck(o = {}) {
  const S = state(), st = S.settings;
  const d = { id: id('d'), name: clean(o.name, 120).trim() || 'Untitled deck', tags: cleanTags(o.tags), created: Date.now(),
    cover: { style: o.style || st.grads || 'mix', round: +o.round || 0, image: o.image || null, seed: clean(o.name, 120).trim() || 'Untitled deck' }, paused: false,
    grading: ['four', 'binary', 'piles'].includes(o.grading) ? o.grading : st.grading, fsrs: o.fsrs ?? st.fsrs,
    goal: Math.min(97, Math.max(70, +o.goal || st.goal)), gapIdx: 3, steps: ['1m', '10m'],
    perDay: Math.min(999, Math.max(0, Math.round(o.perDay ?? st.perDay) || 0)), piles: [{ name: 'Know it' }, { name: 'Almost' }, { name: 'No clue' }],
    folder: folderOf(o.folder), bg: cleanBg(null, o.bg) };
  S.decks.push(d);
  return d;
}
// One card, or one per blank for fill-in-the-blank text when asked.
function makeCards(deck, o, source = 'you') {
  const S = state();
  const kind = ['basic', 'cloze', 'image', 'audio'].includes(o.kind) ? o.kind : 'basic';
  const base = { deckId: deck.id, kind, front: clean(o.front), back: clean(o.back), note: clean(o.note, 2000), text: clean(o.text),
    tags: cleanTags(o.tags), image: o.image || null, audio: o.audio || null, speak: clean(o.speak, 500), lang: clean(o.lang, 20), auto: o.auto !== false,
    source: clean(source, 60), pending: !!o.pending, created: Date.now(), srs: newCard(), pile: null };
  const n = kind === 'cloze' ? blanks(base.text).length : 0;
  const list = kind === 'cloze' && o.clozeMode !== 'one' && n > 1 ? Array.from({ length: n }, (_, i) => ({ ...base, cloze: i })) : [{ ...base, cloze: kind === 'cloze' ? (o.clozeMode === 'one' ? -1 : 0) : null }];
  const group = kind === 'cloze' ? id('g') : null;
  const cards = list.map(c => ({ ...c, id: id('c'), group }));
  S.cards.push(...cards);
  return cards;
}
const DECK_KEYS = ['name', 'tags', 'cover', 'paused', 'grading', 'fsrs', 'goal', 'gapIdx', 'steps', 'perDay', 'piles', 'folder', 'bg'];
const CARD_KEYS = ['kind', 'front', 'back', 'note', 'text', 'tags', 'image', 'audio', 'speak', 'lang', 'auto', 'pending', 'cloze'];
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
  const sibs = c.group ? state().cards.filter(x => x.group === c.group) : [c];
  sibs.forEach(x => { x.explain = { text: clean(text, 2000), by: clean(by, 60), at: Date.now() }; });
  save(); return true;
}

// Every change goes through here. Returns what the action made (ids), or throws with a message people can read.
export function apply(a, who = 'you') {
  const out = run(a, who);
  save();
  return out;
}
function run(a, who) {
  const L = lib(), S = L.S;
  switch (a.type) {
    case 'deck.add': return { id: makeDeck(a).id };
    case 'deck.update': {
      const d = findDeck(a.id); if (!d) throw new Error('No such deck');
      const p = pick(a.patch, DECK_KEYS);
      if ('name' in p) p.name = clean(p.name, 120);
      if ('tags' in p) p.tags = cleanTags(p.tags);
      if ('goal' in p) p.goal = Math.min(97, Math.max(70, +p.goal || 90));
      if ('perDay' in p) p.perDay = Math.min(999, Math.max(0, Math.round(+p.perDay) || 0));
      if ('gapIdx' in p) p.gapIdx = Math.min(GAPS.length - 1, Math.max(0, +p.gapIdx || 0));
      if ('cover' in p) p.cover = { ...d.cover, ...pick(p.cover, ['style', 'round', 'image']) };
      if ('folder' in p) { const f = p.folder ? folderOf(p.folder) : null; if (p.folder && !f) throw new Error('No such folder'); p.folder = f; }
      if ('bg' in p) p.bg = cleanBg(d.bg, p.bg);
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
      return { id: d.id };
    }
    case 'card.add': {
      if ((a.image || a.audio) && mediaLeft() < 1) throw new Error(MEDIA_FULL);
      const d = findDeck(a.deckId) || (a.deckName ? makeDeck({ name: a.deckName }) : null); if (!d) throw new Error('No such deck');
      return { ids: makeCards(d, a, who).map(c => c.id), deckId: d.id };
    }
    case 'card.update': {
      const c = S.cards.find(x => x.id === a.id); if (!c) throw new Error('No such card');
      const p = pick(a.patch, CARD_KEYS);
      if ((p.image || p.audio) && !(c.image || c.audio) && mediaLeft() < 1) throw new Error(MEDIA_FULL);
      for (const k of ['front', 'back', 'text']) if (k in p) p[k] = clean(p[k]);
      if ('speak' in p) p.speak = clean(p.speak, 500);
      if ('lang' in p) p.lang = clean(p.lang, 20);
      if ('tags' in p) p.tags = cleanTags(p.tags);
      const mode = a.patch && a.patch.clozeMode;
      delete p.cloze;
      const stale = ['front', 'back', 'text'].some(k => k in p && p[k] !== c[k]);
      Object.assign(c, p);
      if (stale) for (const x of c.group ? S.cards.filter(y => y.group === c.group) : [c]) { delete x.explain; delete x.quiz; }
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
      return { id: c.id };
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
      }
      return { questions: n };
    }
    case 'card.delete': {
      const ids = new Set(a.ids || [a.id]);
      S.cards = S.cards.filter(c => !ids.has(c.id)); S.logs = S.logs.filter(l => !ids.has(l.cardId));
      return { ids: [...ids] };
    }
    // Dragging a card on its deck's page (just before the card `before`, or last when it's null), or onto another deck
    // (`deckId`).
    case 'card.move': {
      const c = S.cards.find(x => x.id === a.id); if (!c) throw new Error('No such card');
      if ('deckId' in a) { const d = findDeck(a.deckId); if (!d) throw new Error('No such deck'); if (d.id !== c.deckId) cardToDeck(S, c, d.id); }
      if ('before' in a) {
        const b = a.before == null ? null : S.cards.find(x => x.id === a.before && x.deckId === c.deckId); if (a.before != null && !b) throw new Error('No such card');
        cardBefore(deckOf(c), S.cards, c, b && b.id);
      }
      return { id: c.id, deckId: c.deckId };
    }
    case 'review.grade': {
      const c = S.cards.find(x => x.id === a.cardId); if (!c) throw new Error('No such card');
      const d = deckOf(c), now = Date.now(), log = { id: id('l'), cardId: c.id, deckId: c.deckId, at: now, prev: c.srs, prevPile: c.pile, was: c.srs.state };
      if (a.pile != null) { c.pile = clean(a.pile, 60); log.pile = c.pile; }
      else {
        const g = Math.min(4, Math.max(1, Math.round(+a.rating || 3)));
        log.rating = g;
        if (d.fsrs !== false && d.grading !== 'piles') c.srs = fsrsGrade(c.srs, g, now, { goal: d.goal / 100, maxDays: GAPS[d.gapIdx ?? 3], steps: d.steps });
        else c.srs = { ...c.srs, reps: (c.srs.reps || 0) + 1, last: now };
      }
      S.logs.push(log);
      return { logId: log.id };
    }
    case 'review.undo': {
      const log = a.logId ? S.logs.find(l => l.id === a.logId) : S.logs[S.logs.length - 1]; if (!log) throw new Error('Nothing to undo');
      const c = S.cards.find(x => x.id === log.cardId);
      if (c) { c.srs = log.prev; c.pile = log.prevPile ?? null; }
      S.logs = S.logs.filter(l => l !== log);
      return { cardId: log.cardId };
    }
    case 'settings.update': {
      const p = pick(a.patch, Object.keys(fresh().settings));
      if ('perDay' in p) p.perDay = Math.min(999, Math.max(0, Math.round(+p.perDay) || 0));
      Object.assign(S.settings, p); return {};
    }
    case 'ai.perm': { if (a.id in S.ai.perms) S.ai.perms[a.id] = !!a.on; return {}; }
    case 'ai.client': { const n = clean(a.name, 80) || 'MCP app'; S.ai.clients[n] = { name: n, version: clean(a.version, 40), seen: Date.now() }; return {}; }
    case 'data.import': {
      const d = findDeck(a.deckId) || makeDeck({ name: a.deckName || 'Imported cards' });
      const list = (a.cards || []).slice(0, 5000).filter(x => x && (x.front || x.text));
      list.forEach(x => makeCards(d, x, 'import'));
      return { deckId: d.id, count: list.length };
    }
    case 'data.reset': {
      // The rev keeps counting up, so every copy of the app sees the reset as the newest data.
      const next = fresh(); next.ai.clients = S.ai.clients; next.ai.key = S.ai.key; next.rev = S.rev; L.S = next;
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
