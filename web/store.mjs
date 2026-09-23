// Your decks, cards, and reviews, saved in data/stealth-cards.json next to the app (images and audio in data/media).
// Online (on Vercel) they live in Supabase instead (see supa.mjs): each request starts from the latest copy with
// begin() and saves once with finish(). The web app and connected AI apps (over MCP) both change data through
// apply(), so every change is saved the same way.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { cloud, library, files } from './supa.mjs';
import { grade as fsrsGrade, newCard } from './fsrs.js';
import R from './rich.js';

export const DATA = process.env.STEALTH_DATA || fileURLToPath(new URL('../data/', import.meta.url));
export const MEDIA = join(DATA, 'media');
const FILE = join(DATA, 'stealth-cards.json');
const GAPS = [30, 90, 180, 365, 730, 1825, 3650];

const fresh = () => ({
  version: 1, rev: 1,
  settings: { name: '', color: 0, look: 'system', grads: 'mix', prog: 'bar', perDay: 20, goal: 90, grading: 'four', fsrs: true, reminder: '9:00 AM' },
  ai: { perms: { read: true, text: true, media: true, edit: true, check: false, del: false }, clients: {} },
  decks: [], cards: [], logs: []
});
let S = fresh();
// Saved data from an older version gets any settings added since.
const upgrade = d => { const f = fresh(); return { ...f, ...d, settings: { ...f.settings, ...d.settings }, ai: { ...f.ai, ...d.ai, perms: { ...f.ai.perms, ...(d.ai || {}).perms } } }; };
export function load() {
  if (cloud()) return S;
  mkdirSync(MEDIA, { recursive: true });
  if (existsSync(FILE)) S = upgrade(JSON.parse(readFileSync(FILE, 'utf8')));
  return S;
}
// Online: the copy this request started from (its rev), whether it changed, and work to finish before saving.
let base = null, loaded = false, dirty = false, later = [];
export async function begin() {
  if (!cloud()) return;
  later = [];
  const rev = await library.rev();
  if (loaded && rev === base && !dirty) return;
  const row = rev == null ? null : await library.load();
  S = row ? upgrade(row.state) : fresh(); base = row ? row.rev : null; loaded = true; dirty = !row;
}
// Saves this request's changes; false means someone else saved first, so the request should run again.
export async function finish() {
  if (!cloud()) return true;
  await Promise.all(later); later = [];
  if (!dirty) return true;
  const ok = base == null ? await library.create(S) : await library.update(S, base);
  if (ok) { base = S.rev; dirty = false; } else loaded = false;
  return ok;
}
const save = () => {
  S.rev++;
  if (cloud()) { dirty = true; return; }
  const tmp = FILE + '.tmp'; writeFileSync(tmp, JSON.stringify(S)); renameSync(tmp, FILE);
};
// Pictures and sound for cards: in data/media here, in the Supabase bucket online.
export const putMedia = (name, buf, type) => (cloud() ? files.put(name, buf, type) : writeFile(join(MEDIA, name), buf));
export const readMedia = name => (cloud() ? files.get(name) : readFile(join(MEDIA, name)).catch(() => null));
export const hasMedia = name => (cloud() ? files.has(name) : access(join(MEDIA, name)).then(() => true, () => false));
export const mediaLink = name => (cloud() ? files.link(name) : Promise.resolve(null));
export const state = () => S;
const id = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clean = (x, n = 5000) => String(x ?? '').slice(0, n);
const cleanTags = t => (Array.isArray(t) ? [...new Set(t.map(x => clean(x, 40).trim()).filter(Boolean))].slice(0, 50) : []);
const findDeck = x => S.decks.find(d => d.id === x) || S.decks.find(d => d.name.toLowerCase() === String(x || '').toLowerCase());
const deckOf = c => S.decks.find(d => d.id === c.deckId);
// The words hidden in a fill-in-the-blank card's [[blanks]] (read the same way the app draws them).
export const blanks = text => R.blanks(text);

function makeDeck(o = {}) {
  const st = S.settings;
  const d = { id: id('d'), name: clean(o.name, 120).trim() || 'Untitled deck', tags: cleanTags(o.tags), created: Date.now(),
    cover: { style: o.style || st.grads || 'mix', round: +o.round || 0, image: o.image || null, seed: clean(o.name, 120).trim() || 'Untitled deck' }, paused: false,
    grading: ['four', 'binary', 'piles'].includes(o.grading) ? o.grading : st.grading, fsrs: o.fsrs ?? st.fsrs,
    goal: Math.min(97, Math.max(70, +o.goal || st.goal)), gapIdx: 3, steps: ['1m', '10m'],
    perDay: Math.min(999, Math.max(0, Math.round(o.perDay ?? st.perDay) || 0)), piles: [{ name: 'Know it' }, { name: 'Almost' }, { name: 'No clue' }] };
  S.decks.push(d);
  return d;
}
// One card, or one per blank for fill-in-the-blank text when asked.
function makeCards(deck, o, source = 'you') {
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
const DECK_KEYS = ['name', 'tags', 'cover', 'paused', 'grading', 'fsrs', 'goal', 'gapIdx', 'steps', 'perDay', 'piles'];
const CARD_KEYS = ['kind', 'front', 'back', 'note', 'text', 'tags', 'image', 'audio', 'speak', 'lang', 'auto', 'pending', 'cloze'];
const pick = (o, keys) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => keys.includes(k)));

// Every change goes through here. Returns what the action made (ids), or throws with a message people can read.
export function apply(a, who = 'you') {
  let out;
  // Online, a change that fails halfway makes the next request start again from the saved copy.
  try { out = run(a, who); } catch (e) { if (cloud()) loaded = false; throw e; }
  save();
  return out;
}
function run(a, who) {
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
      Object.assign(d, p);
      return { id: d.id };
    }
    case 'deck.delete': {
      const d = findDeck(a.id); if (!d) throw new Error('No such deck');
      S.decks = S.decks.filter(x => x !== d); S.cards = S.cards.filter(c => c.deckId !== d.id); S.logs = S.logs.filter(l => l.deckId !== d.id);
      return { id: d.id };
    }
    case 'card.add': {
      const d = findDeck(a.deckId) || (a.deckName ? makeDeck({ name: a.deckName }) : null); if (!d) throw new Error('No such deck');
      return { ids: makeCards(d, a, who).map(c => c.id), deckId: d.id };
    }
    case 'card.update': {
      const c = S.cards.find(x => x.id === a.id); if (!c) throw new Error('No such card');
      const p = pick(a.patch, CARD_KEYS);
      for (const k of ['front', 'back', 'text']) if (k in p) p[k] = clean(p[k]);
      if ('speak' in p) p.speak = clean(p.speak, 500);
      if ('lang' in p) p.lang = clean(p.lang, 20);
      if ('tags' in p) p.tags = cleanTags(p.tags);
      const mode = a.patch && a.patch.clozeMode;
      delete p.cloze;
      Object.assign(c, p);
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
    case 'card.delete': {
      const ids = new Set(a.ids || [a.id]);
      S.cards = S.cards.filter(c => !ids.has(c.id)); S.logs = S.logs.filter(l => !ids.has(l.cardId));
      return { ids: [...ids] };
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
      const keep = S.ai.clients, rev = S.rev; S = fresh(); S.ai.clients = keep; S.rev = rev;
      if (cloud()) later.push(files.clear()); else { rmSync(MEDIA, { recursive: true, force: true }); mkdirSync(MEDIA, { recursive: true }); }
      return {};
    }
    default: throw new Error('Unknown action ' + a.type);
  }
}
