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
// The tables are Supabase's (supabase/social.sql), reached through supa.mjs rest(); on this computer the same calls go
// to data/social.json (localrest.mjs). A person's own decks and cards stay in their library (store.mjs); a shared deck
// is a copy of the deck's cards in shared_cards, refreshed each time the owner's changes are saved.
import { rest, val, qval, inList, like, publicMedia, cloud } from './supa.mjs';
import { state, saved, onSave, onReviewed, afterSaving, withLibrary, withCredit, apply, uidOf, makeDeck, newId, isDev } from './store.mjs';
import { deckCards } from './order.js';
import { newCard } from './fsrs.js';
import { createHash } from 'node:crypto';

const MIN = 60000, DAY = 86400000;
const nowIso = () => new Date().toISOString();
const clean = (x, n = 5000) => String(x ?? '').slice(0, n);
const oneLine = (x, n) => clean(x, n * 2).replace(/\s+/g, ' ').trim().slice(0, n);
const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const plural = (n, w, ws = w + 's') => n + ' ' + (n === 1 ? w : ws);
const hash = x => createHash('sha1').update(JSON.stringify(x)).digest('base64url').slice(0, 12);
const err = (msg, status = 400) => Object.assign(new Error(msg), { status });

// Who someone is on the network: their user id online; on this computer "local", or a made-up person's dev_ id.
export const socialId = uid => uid || 'local';

// ---------- profiles ----------
// A handle is how people find you (lucida.cards/@alexkim): 3 to 30 lowercase letters, numbers, dots and underscores.
export const HANDLE_RE = /^[a-z0-9_.]{3,30}$/;
const TAKEN = new Set(['admin', 'lucida', 'support', 'help', 'team', 'settings', 'discover', 'library', 'stats', 'connect', 'about', 'api', 'app', 'www', 'mcp', 'pro', 'join', 'live', 'you', 'me', 'official', 'staff', 'root', 'null', 'undefined']);
const handleFrom = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_.]+/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, 24);
export async function profileOf(uid) { const r = await rest('/profiles?id=eq.' + val(uid) + '&select=*'); return (r && r[0]) || null; }
export async function profileByHandle(h) { const x = String(h || '').toLowerCase(); if (!HANDLE_RE.test(x)) return null; const r = await rest('/profiles?handle=eq.' + val(x) + '&select=*'); return (r && r[0]) || null; }
// What a profile shows of someone before they fill it in: their name (Settings, then their account), their picture
// (the one they picked in Settings, made public), and their color.
async function seedOf(uid, me, S) {
  const st = (S && S.settings) || {};
  const name = oneLine(st.name || (me && me.name) || (me && me.email ? me.email.split('@')[0] : '') || (isDev(uid) ? uid.slice(4) : 'You'), 60);
  const ph = st.photo, google = me && me.picture;
  let avatar = null;
  if ((ph === 'google' || (!ph && google)) && google) avatar = google;
  else if (ph === 'yours' && st.yourPhoto) {
    const file = String(st.yourPhoto).replace(/^\/media\//, '');
    avatar = publicMedia.on() && !isDev(uid) && uid !== 'local' ? await publicMedia.publish(uid, file).catch(() => null) : st.yourPhoto;
  }
  return { name, avatar, color: Math.min(5, Math.max(0, +st.color || 0)), base: handleFrom(st.name || (me && me.name)) || handleFrom(me && me.email && me.email.split('@')[0]) || handleFrom(isDev(uid) ? uid.slice(4) : '') || 'learner' };
}
// Makes someone's profile the first time it's needed (sharing a deck, following, saving, suggesting), and keeps its
// name, picture, and color in step with Settings after that.
export async function ensureProfile(uid, me, S) {
  uid = socialId(uid);
  let p = await profileOf(uid);
  const seed = await seedOf(uid, me, S || state());
  if (!p) {
    for (let i = 0; i < 30 && !p; i++) {
      let handle = (seed.base.length >= 3 ? seed.base : seed.base + 'learner').slice(0, 24) + (i ? String(i < 10 ? i + 1 : Math.floor(Math.random() * 9000) + 1000) : '');
      if (TAKEN.has(handle)) continue;
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
// Editing your profile (Settings and your profile page): your handle, a short bio, and your school and subject.
export async function updateProfile(uid, me, patch) {
  const p = await ensureProfile(uid, me);
  const next = {};
  if ('handle' in patch) {
    const h = String(patch.handle || '').trim().replace(/^@/, '').toLowerCase();
    if (!HANDLE_RE.test(h)) throw err('Use 3 to 30 letters, numbers, dots, or underscores.');
    if (TAKEN.has(h)) throw err('That name is taken. Try another.');
    if (h !== p.handle) next.handle = h;
  }
  if ('bio' in patch) next.bio = clean(patch.bio, 160).replace(/\s+\n/g, '\n').trim();
  if ('school' in patch) next.school = oneLine(patch.school, 60);
  if ('subject' in patch) next.subject = oneLine(patch.subject, 60);
  if ('featured' in patch) next.featured = (Array.isArray(patch.featured) ? patch.featured : []).map(x => clean(x, 40)).slice(0, 3);
  if (!Object.keys(next).length) return p;
  next.updated_at = nowIso();
  try { await rest('/profiles?id=eq.' + val(p.id), { method: 'PATCH', body: next }); }
  catch (e) { if (e.status === 409) throw err('That name is taken. Try another.'); throw e; }
  Object.assign(p, next);
  if (next.handle) { state().profile = { handle: p.handle }; saved(); }
  return p;
}
const personOf = p => (p ? { id: p.id, handle: p.handle, name: p.name, avatar: p.avatar || null, color: p.color || 0, verified: p.verified || '', kind: p.kind || 'person' } : null);
// What pages get of a person: never their account id.
const face = p => { if (!p) return null; const { id, ...rest } = personOf(p); return rest; };

// ---------- sharing a deck ----------
// What a shared deck's page shows of a card: its content and how it was made. Never its schedule or your answers.
const CONTENT = ['kind', 'front', 'back', 'text', 'note', 'image', 'audio', 'wave', 'speak', 'lang', 'auto', 'boxes', 'occ', 'cloze', 'box', 'group', 'tags'];
const contentOf = c => Object.fromEntries(CONTENT.map(k => [k, c[k] ?? null]));
// Pictures and sound on shared cards are links anyone can open (supa.mjs publicMedia).
async function mediaFor(uid, sh, c) {
  const out = {};
  for (const k of ['image', 'audio']) {
    const v = c[k];
    if (typeof v !== 'string' || !v.startsWith('/media/') || !publicMedia.on() || isDev(uid) || uid === 'local') continue;
    const name = v.slice(7);
    out[k] = publicMedia.url(uid, name);
    if (!sh.media.includes(name)) { await publicMedia.publish(uid, name); sh.media.push(name); sh.mediaDirty = true; }
  }
  return out;
}
const coverOf = d => ({ style: d.cover.style || 'mix', round: d.cover.round || 0, seed: d.cover.seed || d.name, image: d.cover.image && !String(d.cover.image).startsWith('/media/') ? d.cover.image : null, $local: d.cover.image || null });
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'deck';

// Changes between two versions of a card, sorted into what they mean for the people studying it: a new card, a new
// answer (they'll learn it again), a new question, or a small fix (their schedule stays).
const lev = (a, b) => { if (a === b) return 0; if (Math.abs(a.length - b.length) > 8) return 99; const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };
const small = (a, b) => { a = String(a || ''); b = String(b || ''); if (a === b) return true; const x = a.toLowerCase().replace(/\s+/g, ' ').trim(), y = b.toLowerCase().replace(/\s+/g, ' ').trim(); return x === y || lev(x, y) <= Math.max(2, Math.floor(Math.max(x.length, y.length) * 0.08)); };
const answerOf = d => (d.kind === 'cloze' ? (String(d.text || '').match(/\[\[([^\]]+)\]\]/g) || []).join('|') : d.box != null ? ((d.boxes || []).find(b => b.id === d.box) || {}).label || '' : d.back || '');
const questionOf = d => (d.kind === 'cloze' ? String(d.text || '').replace(/\[\[[^\]]+\]\]/g, '[]') : d.front || '');
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
    await rest('/deck_versions?id=eq.' + val(last.id), { method: 'PATCH', body: { changes: all, summary: words(all) } });
    return last.version;
  }
  for (let n = (last ? last.version : 0) + 1, tries = 0; tries < 5; n++, tries++) {
    try {
      await rest('/deck_versions', { method: 'POST', body: { shared_id: sharedId, version: n, author: by ? by.id : null, author_name: by ? by.name : '', ai, kind, summary: words(changes), changes } });
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
  const meta = { name: d.name, tags: d.tags, cover: coverOf(d) }, metaH = hash(meta);
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
    else await addVersion(sh.id, diffs, { by: owner, ai: info.ai || '', kind: info.ai ? 'ai' : 'edit' });
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
  const extra = {};
  if ('description' in o) extra.description = clean(o.description, 300).trim();
  if ('maintained' in o) extra.maintained = o.maintained === 'community' ? 'community' : 'creator';
  if ('helpers' in o) extra.helpers = await helpersFrom(o.helpers, sid);
  if (!d.share) {
    if (vis === 'private') return { vis };
    // The same deck always gets the same id, so a request that runs again (its save lost a race) reuses it.
    const id = 's' + createHash('sha1').update(sid + ':' + d.id).digest('hex').slice(0, 14), slug = await freeSlug(sid, d.name, id);
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
export const canSee = async (sh, uid) => !!sh && (OPEN.includes(sh.visibility) || sh.owner === uid || (sh.visibility === 'class' && await classSees(sh.id, uid)));
// A shared card, as a card in your library: the owner's content, with your own fresh schedule. `origin` ties it to the
// shared card, and `base` remembers what it said, so a copy can tell your edits from the owner's.
const fromShared = (r, deckId) => {
  const d = r.data || {};
  return { id: newId('c'), deckId, ...Object.fromEntries(CONTENT.map(k => [k, d[k] ?? (k === 'tags' ? [] : ['front', 'back', 'text', 'note', 'speak', 'lang'].includes(k) ? '' : null)])),
    auto: d.auto !== false, tags: Array.isArray(d.tags) ? d.tags : [], source: d.source || 'shared', pending: false, created: Date.now(), srs: newCard(), pile: null,
    trail: d.trail || [], explain: d.explain ? { text: d.explain, by: 'shared' } : undefined, quiz: d.quiz || undefined, origin: r.id, base: hash(contentOf(d)) };
};
async function countFollowing(sharedId) {
  const [learn, copy] = await Promise.all([
    rest('/subscriptions?shared_id=eq.' + val(sharedId) + '&mode=eq.study&select=user_id&limit=1', { count: true }),
    rest('/subscriptions?shared_id=eq.' + val(sharedId) + '&mode=eq.copy&select=user_id&limit=1', { count: true })]);
  const stars = await rest('/stars?shared_id=eq.' + val(sharedId) + '&select=user_id&limit=1', { count: true });
  const n = { learners: learn.total, copies: copy.total, stars: stars.total };
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
  d.link = { id: sharedId, mode: copy ? 'copy' : 'study', rev: sh.rev, slug: sh.slug, owner: { id: sh.owner, handle: owner ? owner.handle : '', name: owner ? owner.name : '' }, updates: copy ? !!updates : true, pending: [] };
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
  const S = state(), linked = S.decks.filter(d => d.link && !d.link.gone && (d.link.mode === 'study' || d.link.updates));
  if (!linked.length) return 0;
  const ids = [...new Set(linked.map(d => d.link.id))];
  const rows = await rest('/shared_decks?id=in.' + inList(ids) + '&select=id,rev,visibility,name,tags,cover,slug,owner');
  // A class's deck stays yours to study while you're in a class it's in; after you leave, it's yours to keep.
  const inClass = new Set();
  for (const r of rows) if (r.visibility === 'class' && await classSees(r.id, socialId(uid))) inClass.add(r.id);
  let n = 0;
  for (const d of linked) {
    const sh = rows.find(r => r.id === d.link.id);
    if (!sh || !(OPEN.includes(sh.visibility) || inClass.has(sh.id))) { d.link.gone = true; d.link.pending = []; n++; continue; }
    if (sh.rev <= d.link.rev) continue;
    const since = d.link.rev, changes = [];
    for (let off = 0; off < 20000; off += 1000) {
      const part = await rest('/shared_cards?shared_id=eq.' + val(sh.id) + '&rev=gt.' + since + '&select=id,pos,data,deleted&order=pos.asc&limit=1000&offset=' + off);
      changes.push(...part);
      if (part.length < 1000) break;
    }
    if (d.link.mode === 'study') applyStudy(S, d, sh, changes);
    else offerCopy(S, d, changes);
    d.link.rev = sh.rev; d.link.slug = sh.slug;
    n++;
  }
  if (n) saved();
  return n;
}
function applyStudy(S, d, sh, changes) {
  d.name = sh.name; d.tags = sh.tags || [];
  d.cover = { ...d.cover, style: (sh.cover && sh.cover.style) || d.cover.style, round: (sh.cover && sh.cover.round) || 0, seed: (sh.cover && sh.cover.seed) || sh.name, image: (sh.cover && sh.cover.image) || null };
  const mine = new Map(S.cards.filter(c => c.deckId === d.id && c.origin).map(c => [c.origin, c]));
  const gone = new Set();
  for (const r of changes) {
    const c = mine.get(r.id);
    if (r.deleted) { if (c) gone.add(c.id); continue; }
    if (!c) { const x = fromShared(r, d.id); S.cards.push(x); mine.set(r.id, x); continue; }
    const before = contentOf(c), kind = kindOf(before, r.data);
    Object.assign(c, fromShared(r, d.id), { id: c.id, srs: kind === 'answer' ? newCard() : c.srs, pile: kind === 'answer' ? null : c.pile, created: c.created });
  }
  if (gone.size) { S.cards = S.cards.filter(c => !gone.has(c.id)); S.logs = S.logs.filter(l => !gone.has(l.cardId)); }
  // The owner's order.
  const pos = new Map(changes.map(r => [r.id, r.pos]));
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
const cleanFields = o => {
  const f = {};
  for (const k of FIELDS) if (o && k in o) f[k] = k === 'tags' ? (Array.isArray(o.tags) ? o.tags.map(x => clean(x, 40)).filter(Boolean).slice(0, 20) : []) : ['boxes'].includes(k) ? o[k] : clean(o[k], k === 'note' ? 2000 : 5000);
  if (f.kind && !['basic', 'cloze', 'image', 'audio'].includes(f.kind)) delete f.kind;
  return f;
};
export async function suggest(uid, me, sharedId, { message = '', changes = [] } = {}, ai = '') {
  const sid = socialId(uid), sh = await sharedRow(sharedId);
  if (!(await canSee(sh, sid))) throw err('This deck isn’t shared anymore.', 404);
  const list = (Array.isArray(changes) ? changes : []).slice(0, 200);
  if (!list.length) throw err('Add a change first.');
  const refs = list.filter(c => c.card).map(c => String(c.card));
  const was = refs.length ? await cardsById(sharedId, refs) : new Map();
  const out = [];
  for (const c of list) {
    const op = ['edit', 'add', 'remove'].includes(c.op) ? c.op : c.card ? 'edit' : 'add';
    const b = c.card && was.get(String(c.card)), before = b && !b.deleted ? b.data : null;
    if (op !== 'add' && !before) continue;
    const after = op === 'remove' ? null : { ...(before || { kind: 'basic', front: '', back: '', text: '', note: '', tags: [] }), ...cleanFields(c.after || c) };
    if (op === 'add' && !(after.front || after.text || after.back)) continue;
    if (op === 'edit' && hash(contentOf(before)) === hash(contentOf(after))) continue;
    out.push({ id: rid('x'), card: op === 'add' ? rid('n') : String(c.card), op, before, after, kind: kindOf(before, after), status: 'open' });
  }
  if (!out.length) throw err('Those changes are already in the deck.');
  const author = await ensureProfile(uid, me);
  if (author.id === sh.owner) throw err('It’s your deck: change it right there.');
  const s = { id: rid('g'), shared_id: sharedId, owner: sh.owner, author: author.id, author_name: author.name, ai: clean(ai, 60), message: oneLine(message, 280), changes: out, status: 'open' };
  await rest('/suggestions', { method: 'POST', body: s });
  // Helpers edit directly: their changes go in now.
  if ((sh.helpers || []).some(h => h.id === author.id)) {
    await inLibraryOf(sh.owner, () => decide(sh.owner, s.id, { $all: 'take' }, { byHelper: true }));
    return { id: s.id, taken: true };
  }
  // The owner hears, and so do the helpers of a deck kept up by the community (they can take it or skip it too).
  const to = [sh.owner, ...(sh.maintained === 'community' ? (sh.helpers || []).map(h => h.id) : [])].filter((id, i, a) => id && id !== author.id && a.indexOf(id) === i);
  await notify(to.map(user_id => ({ user_id, kind: 'suggestion', actor: author.id, actor_name: author.name + (s.ai ? ' (' + s.ai + ')' : ''), shared_id: sharedId, data: { n: out.length, message: s.message, id: s.id } })));
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
  let took = 0, skipped = 0;
  await withCredit(credit, async () => {
    for (const c of s.changes) {
      if (c.status !== 'open') continue;
      const pick = picks[c.id] || picks.$all;
      if (pick === 'skip') { c.status = 'skipped'; skipped++; continue; }
      if (pick !== 'take') continue;
      const card = S.cards.find(x => x.id === c.card && x.deckId === d.id);
      try {
        if (c.op === 'add') apply({ type: 'card.add', deckId: d.id, ...cleanFields(c.after) }, 'suggestion');
        else if (!card) { c.status = 'gone'; continue; }
        else if (c.op === 'remove') apply({ type: 'card.delete', id: card.id }, 'suggestion');
        else apply({ type: 'card.update', id: card.id, patch: cleanFields(c.after) }, 'suggestion');
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
    rest('/shared_decks?id=in.' + inList(decks) + '&select=id,name,slug,owner')]);
  const owners = shared.length ? await rest('/profiles?id=in.' + inList([...new Set(shared.map(d => d.owner))]) + '&select=id,handle') : [];
  return rows.map(({ owner, author, ...r }) => {
    const d = shared.find(x => x.id === r.shared_id), o = d && owners.find(x => x.id === d.owner);
    return { ...r, person: face(people.find(x => x.id === author)) || { name: r.author_name }, deck: d ? { id: d.id, name: d.name, url: o ? urlOf(o.handle, d.slug) : '/d/' + d.id } : null };
  });
}

// ---------- history ----------
export async function versions(sharedId, { limit = 60 } = {}) {
  return rest('/deck_versions?shared_id=eq.' + val(sharedId) + '&select=id,version,author,author_name,ai,kind,summary,changes,created_at&order=version.desc&limit=' + Math.min(200, limit));
}
// A deck's History page: every version, newest first, with who made it and what changed.
export async function historyPage(sharedId, viewer) {
  const vid = viewer ? socialId(viewer) : null, sh = await sharedRow(sharedId, 'id,owner,visibility,learners,copies,name,slug');
  if (!(await canSee(sh, vid))) return null;
  const list = await versions(sharedId, { limit: 200 }), o = await profileOf(sh.owner);
  const ids = [...new Set(list.map(v => v.author).filter(Boolean))], faces = ids.length ? await rest('/profiles?id=in.' + inList(ids) + '&select=id,handle,name,avatar,color,verified') : [];
  return { id: sh.id, name: sh.name, url: o ? urlOf(o.handle, sh.slug) : '/d/' + sh.id, owner: face(o), mine: vid === sh.owner, following: (sh.learners || 0) + (sh.copies || 0),
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
  const sh = await sharedRow(sharedId, 'id,owner,version,visibility');
  if (!(await canSee(sh, p.id))) throw err('No such deck', 404);
  const n = await addVersion(sharedId, [], { by: personOf(p), kind: 'check', summary: p.name + ' checked every card', joinable: false });
  await rest('/shared_decks?id=eq.' + val(sharedId), { method: 'PATCH', body: { checked: { id: p.id, name: p.name, handle: p.handle, version: n, at: nowIso() } } });
  if (sh.owner !== p.id) await notify([{ user_id: sh.owner, kind: 'checked', actor: p.id, actor_name: p.name, shared_id: sharedId, data: {} }]);
  return { version: n };
}

// ---------- saves, follows, updates ----------
export async function star(uid, me, sharedId, on) {
  const p = await ensureProfile(uid, me), sh = await sharedRow(sharedId, 'id,owner,visibility');
  if (!(await canSee(sh, p.id))) throw err('No such deck', 404);
  if (on) await rest('/stars', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { user_id: p.id, shared_id: sharedId } });
  else await rest('/stars?user_id=eq.' + val(p.id) + '&shared_id=eq.' + val(sharedId), { method: 'DELETE' });
  return countFollowing(sharedId);
}
export async function watch(uid, me, sharedId, on) {
  const p = await ensureProfile(uid, me), sh = await sharedRow(sharedId, 'id,owner,visibility');
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
    await rest('/follows', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { follower: p.id, followee: them.id } });
    // Unfollowing and following again stays quiet: they hear about the same person once a week at most.
    const lately = await rest('/notifications?user_id=eq.' + val(them.id) + '&kind=eq.follow&actor=eq.' + val(p.id) + '&created_at=gt.' + val(new Date(Date.now() - 7 * DAY).toISOString()) + '&select=id&limit=1');
    if (!lately.length) await notify([{ user_id: them.id, kind: 'follow', actor: p.id, actor_name: p.name, data: { handle: p.handle } }]);
  } else await rest('/follows?follower=eq.' + val(p.id) + '&followee=eq.' + val(them.id), { method: 'DELETE' });
  await recountPeople(p.id);
  return recountPeople(them.id);
}

// ---------- news ----------
async function notify(list) {
  const rows = list.filter(x => x && x.user_id);
  for (let i = 0; i < rows.length; i += 500) await rest('/notifications', { method: 'POST', body: rows.slice(i, i + 500) });
}
export async function activity(uid) {
  const sid = socialId(uid);
  const [rows, unread] = await Promise.all([
    rest('/notifications?user_id=eq.' + val(sid) + '&select=id,kind,actor,actor_name,shared_id,data,read,created_at&order=created_at.desc&limit=60'),
    rest('/notifications?user_id=eq.' + val(sid) + '&read=is.false&select=id&limit=1', { count: true })]);
  const ids = [...new Set(rows.map(r => r.shared_id).filter(Boolean))], people = [...new Set(rows.map(r => r.actor).filter(Boolean))];
  const [decks, who] = await Promise.all([ids.length ? rest('/shared_decks?id=in.' + inList(ids) + '&select=id,name,slug,owner') : [], people.length ? rest('/profiles?id=in.' + inList(people) + '&select=id,handle,name,avatar,color') : []]);
  const owners = decks.length ? await rest('/profiles?id=in.' + inList([...new Set(decks.map(d => d.owner))]) + '&select=id,handle') : [];
  return { unread: unread.total, items: rows.map(r => {
    const d = decks.find(x => x.id === r.shared_id), o = d && owners.find(x => x.id === d.owner), a = who.find(x => x.id === r.actor);
    return { ...r, deck: d ? { id: d.id, name: d.name, url: o ? '/@' + o.handle + '/' + d.slug : '/d/' + d.id } : null, person: a ? { handle: a.handle, name: a.name, avatar: a.avatar, color: a.color } : null };
  }) };
}
export async function unreadCount(uid) { return (await rest('/notifications?user_id=eq.' + val(socialId(uid)) + '&read=is.false&select=id&limit=1', { count: true })).total; }
export async function markRead(uid, ids) {
  const base = '/notifications?user_id=eq.' + val(socialId(uid)) + '&read=is.false';
  await rest(Array.isArray(ids) && ids.length ? base + '&id=in.' + inList(ids.map(String)) : base, { method: 'PATCH', body: { read: true } });
  return {};
}

// ---------- what public pages show ----------
const urlOf = (handle, slug) => '/@' + handle + '/' + slug;
function card(sh, o) {
  return { id: sh.id, url: o ? urlOf(o.handle, sh.slug) : '/d/' + sh.id, name: sh.name, description: sh.description || '', tags: sh.tags || [], cover: sh.cover || {}, cards: sh.card_count || 0,
    stars: sh.stars || 0, learners: sh.learners || 0, copies: sh.copies || 0, version: sh.version || 1, updated: sh.updated_at, visibility: sh.visibility,
    checked: sh.checked ? { name: sh.checked.name, handle: sh.checked.handle, current: sh.checked.version === sh.version } : null,
    maintained: sh.maintained || 'creator', owner: face(o), theme: (o && o.theme) || '' };
}
export async function withOwners(rows) {
  const ids = [...new Set(rows.map(r => r.owner))];
  const people = ids.length ? await rest('/profiles?id=in.' + inList(ids) + '&select=*') : [];
  return rows.map(r => card(r, people.find(p => p.id === r.owner)));
}
export const LIST = 'id,owner,slug,name,description,tags,cover,card_count,stars,learners,copies,version,updated_at,visibility,checked,maintained';
// A shared deck's page: the deck, its cards (content only), how it was made, who helped, and what you have to do with it.
export async function deckPage({ handle, slug, id }, viewer) {
  let sh = null, o = null;
  if (id) { sh = await sharedRow(id); o = sh && await profileOf(sh.owner); }
  else { o = await profileByHandle(handle); sh = o && (await rest('/shared_decks?owner=eq.' + val(o.id) + '&slug=eq.' + val(String(slug || '').toLowerCase()) + '&select=*'))[0]; }
  const vid = viewer ? socialId(viewer) : null;
  if (!sh || !(await canSee(sh, vid))) return null;
  const [rows, vers, subs, starred] = await Promise.all([
    rest('/shared_cards?shared_id=eq.' + val(sh.id) + '&deleted=is.false&select=id,pos,data&order=pos.asc&limit=500'),
    versions(sh.id, { limit: 40 }),
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
    made: vers.map(v => ({ version: v.version, kind: v.kind, summary: v.summary, ai: v.ai, at: v.created_at, by: face(faces.find(f => f.id === v.author)) || (v.author_name ? { name: v.author_name } : null), n: (v.changes || []).length })),
    me: vid ? { owner, helper, studying: (subs.find(x => x.mode === 'study') || {}).deck_id || '', copied: (subs.find(x => x.mode === 'copy') || {}).deck_id || '', watching: subs.some(x => x.mode === 'watch'), starred: starred.length > 0, open } : null };
}
export async function profilePage(handle, viewer) {
  const p = await profileByHandle(handle);
  if (!p) return null;
  const vid = viewer ? socialId(viewer) : null, self = vid === p.id;
  const [decks, following, saved] = await Promise.all([
    rest('/shared_decks?owner=eq.' + val(p.id) + (self ? '&visibility=in.(link,public)' : '&visibility=eq.public') + '&select=' + LIST + '&order=updated_at.desc&limit=200'),
    vid && !self ? rest('/follows?follower=eq.' + val(vid) + '&followee=eq.' + val(p.id) + '&select=follower') : [],
    self ? rest('/stars?user_id=eq.' + val(p.id) + '&select=shared_id&order=created_at.desc&limit=100') : []]);
  const savedRows = saved.length ? await rest('/shared_decks?id=in.' + inList(saved.map(s => s.shared_id)) + '&visibility=in.(link,public)&select=' + LIST) : [];
  const feat = p.featured || [], list = decks.map(r => card(r, p));
  list.sort((a, b) => (feat.includes(b.id) - feat.includes(a.id)));
  return { ...face(p), bio: p.bio || '', school: p.school || '', subject: p.subject || '', followers: p.followers || 0, following: p.following || 0, contributions: p.contributions || 0,
    featured: feat, decks: list.map(d => ({ ...d, pinned: feat.includes(d.id) })), saved: self ? await withOwners(saved.map(s => savedRows.find(r => r.id === s.shared_id)).filter(Boolean)) : [],
    stars: list.reduce((n, d) => n + d.stars, 0), me: vid ? { self, following: following.length > 0 } : null };
}
// Discover: decks people like this week, decks a teacher checked, new ones, and ones from people you follow, with
// topics to narrow it down. Studying stays in your library; this is only for finding more.
export async function discover(viewer, { tag = '' } = {}) {
  const t = String(tag || '').slice(0, 40), byTag = t ? '&tags=cs.' + encodeURIComponent('{' + qvalRaw(t) + '}') : '';
  const base = '/shared_decks?visibility=eq.public' + byTag + '&select=' + LIST;
  const vid = viewer ? socialId(viewer) : null;
  const follows = vid ? await rest('/follows?follower=eq.' + val(vid) + '&select=followee&limit=500') : [];
  const [popular, checked, fresh, friends, tagRows] = await Promise.all([
    rest(base + '&order=score.desc,updated_at.desc&limit=12'),
    rest(base + '&checked=not.is.null&order=score.desc&limit=8'),
    rest(base + '&order=created_at.desc&limit=12'),
    follows.length ? rest(base + '&owner=in.' + inList(follows.map(f => f.followee)) + '&order=updated_at.desc&limit=12') : [],
    rest('/shared_decks?visibility=eq.public&select=tags&order=score.desc&limit=300')]);
  const count = {};
  for (const r of tagRows) for (const g of r.tags || []) count[g] = (count[g] || 0) + 1;
  const topics = Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b)).slice(0, 10);
  const all = await withOwners([...popular, ...checked, ...fresh, ...friends]), pickOf = rows => rows.map(r => all.find(x => x.id === r.id));
  return { topics, tag: t, sections: [
    { id: 'popular', title: t ? 'Popular in ' + t : 'Popular this week', decks: pickOf(popular) },
    { id: 'friends', title: 'From people you follow', decks: pickOf(friends) },
    { id: 'checked', title: 'Checked by teachers', decks: pickOf(checked) },
    { id: 'new', title: 'New', decks: pickOf(fresh).filter(d => !popular.slice(0, 4).some(p => p.id === d.id)) }].filter(s => s.decks.length) };
}
const qvalRaw = s => (/^[\w-]+$/.test(s) ? s : '"' + String(s).replace(/["\\]/g, '\\$&') + '"');
export async function search(q, viewer) {
  const words = String(q || '').trim().slice(0, 60);
  if (!words) return { q: '', decks: [], people: [] };
  const pat = like(words);
  const [decks, tagged, people] = await Promise.all([
    rest('/shared_decks?visibility=eq.public&or=' + encodeURIComponent('(') + 'name.ilike.' + pat + ',description.ilike.' + pat + encodeURIComponent(')') + '&select=' + LIST + '&order=score.desc&limit=24'),
    rest('/shared_decks?visibility=eq.public&tags=cs.' + encodeURIComponent('{' + qvalRaw(words) + '}') + '&select=' + LIST + '&order=score.desc&limit=12'),
    rest('/profiles?or=' + encodeURIComponent('(') + 'handle.ilike.' + pat + ',name.ilike.' + pat + ',school.ilike.' + pat + ',subject.ilike.' + pat + encodeURIComponent(')') + '&select=*&order=followers.desc&limit=12')]);
  const seen = new Set(), rows = [...decks, ...tagged].filter(r => !seen.has(r.id) && seen.add(r.id));
  return { q: words, decks: await withOwners(rows), people: people.map(p => ({ ...face(p), bio: p.bio || '', school: p.school || '', followers: p.followers || 0 })) };
}
// Your shared decks and the decks you study, for your library's sharing labels and the pages that open them.
// How people do on your shared deck's cards, without names: one row per learner and card with their totals (a learner
// only ever rewrites their own row), added up here. The hardest cards are the ones missed most, once seen 3 times.
onReviewed(r => rest('/card_stats', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { shared_id: r.sharedId, user_id: socialId(uidOf()), card_id: r.card, reviews: r.reviews, misses: r.misses, updated_at: nowIso() } }));
export async function creatorStats(uid, sharedId) {
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
  const rows = p ? await rest('/shared_decks?owner=eq.' + val(sid) + '&select=id,slug,visibility,stars,learners,copies,version,description,maintained,helpers') : [];
  const open = p ? (await rest('/suggestions?owner=eq.' + val(sid) + '&status=eq.open&select=shared_id&limit=500')) : [];
  return { handle: p ? p.handle : '', profile: face(p), decks: rows.map(r => ({ ...r, helpers: (r.helpers || []).map(h => ({ handle: h.handle, name: h.name })), open: open.filter(x => x.shared_id === r.id).length })) };
}
// For search engines and link previews: a public page's title and a line about it.
export async function metaFor(path) {
  const m = /^\/@([a-z0-9_.]{3,30})(?:\/([a-z0-9-]{1,60}))?\/?$/.exec(path.toLowerCase()), d = /^\/d\/(s[a-z0-9]+)$/.exec(path);
  if (!m && !d) return null;
  if (d || m[2]) {
    const page = await deckPage(d ? { id: d[1] } : { handle: m[1], slug: m[2] }, null);
    if (!page) return { status: 404, title: 'Not found · Lucida', description: '' };
    return { title: page.name + ' · ' + (page.owner ? page.owner.name : '') + ' · Lucida', description: plural(page.cards, 'flashcard') + (page.description ? '. ' + page.description : '') + (page.cardsList[0] ? '. ' + (page.cardsList[0].front || page.cardsList[0].text || '').slice(0, 120) : ''),
      noindex: page.visibility !== 'public', url: page.url, cards: page.cardsList.slice(0, 50) };
  }
  const p = await profilePage(m[1], null);
  if (!p) return { status: 404, title: 'Not found · Lucida', description: '' };
  return { title: p.name + ' (@' + p.handle + ') · Lucida', description: (p.bio ? p.bio + ' · ' : '') + plural(p.decks.length, 'public deck'), url: '/@' + p.handle, decks: p.decks.slice(0, 50) };
}
export async function sitemap(origin) {
  const decks = await rest('/shared_decks?visibility=eq.public&select=owner,slug,updated_at&order=updated_at.desc&limit=5000');
  const owners = decks.length ? await rest('/profiles?id=in.' + inList([...new Set(decks.map(d => d.owner))].slice(0, 2000)) + '&select=id,handle') : [];
  const urls = [];
  for (const o of owners) urls.push({ loc: origin + '/@' + o.handle });
  for (const d of decks) { const o = owners.find(x => x.id === d.owner); if (o) urls.push({ loc: origin + urlOf(o.handle, d.slug), lastmod: String(d.updated_at || '').slice(0, 10) }); }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => '<url><loc>' + u.loc.replace(/&/g, '&amp;') + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') + '</url>').join('\n') + '\n</urlset>\n';
}
export { cloud };
