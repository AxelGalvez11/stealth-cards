// The MCP link: Claude, Cursor, or any app that speaks MCP can read and add cards. On this computer it's
// http://localhost:3000/mcp; online each person has their own link (see handler.mjs), so an AI only sees their cards.
// What an AI may do is set on the Connect AI page; tools it isn't allowed to use aren't offered.
import { apply, state, blanks, mediaLeft, MEDIA_FULL, BG_KINDS, isPro, tunedW } from './store.mjs';
import * as social from './social.mjs';
import { LEVELS, SUBJECTS, levelWords, subjectWords } from './school.js';
import { dayAt } from './fsrs.js';
import { isDue, scheduled, examStatus } from './sched.js';
import { insights, history } from './insights.js';
import { fetchMedia, speechFile } from './media.mjs';
import R from './rich.js';
import { SCOPES, challenge } from './oauth.mjs';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
// Which AI app each session is, and the last one each person connected (for sessions that don't say).
const sessions = new Map(), lastClient = new Map();
const text = s => ({ content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] });
const fail = s => ({ content: [{ type: 'text', text: s }], isError: true });
const deckBy = x => state().decks.find(d => d.id === x) || state().decks.find(d => d.name.toLowerCase() === String(x || '').trim().toLowerCase());
// Due now, the way the app sees it: paused cards never are, and an exam date brings cards up early (sched.js).
const dueNow = c => { const d = deckBy(c.deckId); return scheduled(d) ? isDue(c, d, Date.now()) : false; };
const isNew = c => c.srs.state === 'new' && !c.paused && !c.pending;
// Pro's deeper tools answer this on Free.
const PRO_TOOL = 'This is part of Lucida Pro. The learner can go Pro at lucida.cards/pricing to get it.';
const day = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const examOut = d => { const x = d.exam && examStatus(state().cards.filter(c => c.deckId === d.id), d, Date.now()); return x ? { date: d.exam, days_left: x.days, cards_to_review_first: x.toReview, not_studied_yet: x.total - x.seen } : undefined; };
const TEST_WORDS = { mc: 'multiple choice', tf: 'true or false', blank: 'fill in the blank', match: 'matching', type: 'written' };
const forgotten = c => ((c.srs.lapses || 0) ? c.srs.lapses : undefined);
const cardOut = c => ({ id: c.id, deck: (deckBy(c.deckId) || {}).name, kind: c.kind === 'cloze' ? 'fill in the blank' : c.kind, front: c.front || undefined, back: c.back || undefined,
  text: c.text || undefined, note: c.note || undefined, image: c.image || undefined, audio: c.audio || undefined, speak: c.speak || undefined, lang: c.lang || undefined,
  hidden_part: c.kind === 'image' && c.box != null ? (b => b && { box: c.boxes.indexOf(b) + 1, of: c.boxes.length, answer: b.label || undefined })((c.boxes || []).find(b => b.id === c.box)) || undefined : undefined,
  tags: c.tags.length ? c.tags : undefined, waiting_for_review: c.pending || undefined, paused: c.paused || undefined, quiz_questions: (c.quiz || []).length || undefined, has_explanation: c.explain ? true : undefined,
  next_review: c.srs.state === 'new' ? 'new' : new Date(c.srs.due).toISOString().slice(0, 10) });
// Card text is short markdown; the app shows it formatted (see rich.js).
const FORMAT = 'Can use **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, ==highlight==, $math$ in LaTeX (like $x^2$ or $\\frac{a}{b}$), and lines that start with "# " (a heading; ## and ### are smaller), "- " (a bullet), or "1. " (a numbered list).';
// Pictures and sound: a link, an uploaded file ("file:N" from `files`), or a path on this computer (see media.mjs).
const SOURCE = 'A link (https://…), "file:0" for the first file in "files" (a file the learner uploaded in this chat), "file:1" for the second, and so on, a data URL with the file itself ("data:image/png;base64,…", for a picture or sound you made), or the full path of a file on this computer (only for AI apps running on the same computer as Lucida).';
const MEDIA_PROPS = {
  image: { type: 'string', description: 'The picture for an image card (PNG, JPEG, GIF, or WebP). ' + SOURCE },
  audio: { type: 'string', description: 'A sound file for an audio card (MP3, M4A, WAV, OGG, or WebM), if you have one. Usually leave this out and use "speak". ' + SOURCE },
  speak: { type: 'string', description: 'For audio cards: the words the learner hears. Lucida turns them into speech.' },
  lang: { type: 'string', description: 'The language of "speak", like "es", "fr", or "ja", so it sounds right.' } };
const FILES = { type: 'array', description: 'Files the learner uploaded in this chat (pictures or sound). A card uses them with "file:0", "file:1", and so on.',
  items: { type: 'object', properties: { download_url: { type: 'string' }, file_id: { type: 'string' }, mime_type: { type: 'string' }, file_name: { type: 'string' } }, required: ['download_url', 'file_id'] } };
const CARD = { type: 'object', properties: {
  kind: { type: 'string', enum: ['basic', 'cloze', 'image', 'audio'], description: 'basic: question on the front, answer on the back. cloze: fill in the blank, with the hidden words in [[double brackets]] inside "text". image: a picture ("image") with an optional question in "front" and the answer on the back. audio: the learner hears "speak" read aloud (or the "audio" file) and the answer is on the back; good for languages and pronunciation.' },
  front: { type: 'string', description: FORMAT }, back: { type: 'string', description: FORMAT }, text: { type: 'string', description: 'For cloze cards, e.g. "The [[mitochondrion]] makes most of the cell’s **ATP**." ' + FORMAT },
  note: { type: 'string', description: 'Optional extra shown after the answer.' }, tags: { type: 'array', items: { type: 'string' } }, ...MEDIA_PROPS } };
// A card with a picture is an image card, and one with sound is an audio card, whatever kind was asked for.
const kindOf = c => { const k = ['basic', 'cloze', 'image', 'audio'].includes(c.kind) ? c.kind : 'basic'; return { ...c, kind: k === 'basic' && c.image ? 'image' : k === 'basic' && (c.speak || c.audio) ? 'audio' : k }; };
const problem = c => c.kind === 'cloze' ? (blanks(c.text).length ? '' : 'a cloze card needs [[blanks]] in its text')
  : c.kind === 'image' ? (!c.image ? 'an image card needs "image"' : !c.back ? 'an image card needs a back' : '')
  : c.kind === 'audio' ? (!(c.speak || c.audio) ? 'an audio card needs "speak" (or a sound file in "audio")' : !c.back ? 'an audio card needs a back' : '')
  : c.front && c.back ? '' : 'a basic card needs a front and a back';
const NO_MEDIA = 'The learner turned off image and audio cards on the Connect AI page.';
const FOLDER = { type: 'string', description: 'A folder to put it in (by name), made if there isn’t one yet.' };
const COVER = { type: 'string', description: 'A cover picture for the deck. ' + SOURCE };
const folderName = d => (state().folders.find(f => f.id === d.folder) || {}).name || undefined;
// The id of the folder with this name, made if needed.
const folderFor = (name, who) => (state().folders.find(f => f.name.toLowerCase() === String(name).trim().toLowerCase()) || { id: apply({ type: 'folder.add', name }, who).id }).id;
const DEVICE_VOICE = 'No voice key is set up, so the app reads audio cards aloud with the device’s voice.';
// Natural voices for sound cards are Pro; on Free the app reads the words aloud with the device's voice. Photo covers are Pro too.
const FREE_VOICE = 'Natural voices are part of Lucida Pro, so the app reads these aloud with the device’s voice.';
const FREE_COVER = 'Photo covers are part of Lucida Pro. The learner can go Pro at lucida.cards/pricing to get them.';
// Free's limit on pictures and sound is counted before each one is fetched or spoken (`room.left`), so nothing is fetched, or
// paid for, past it. Pro has no limit (Infinity).
const take = room => { if (room.left < 1) throw Object.assign(new Error(MEDIA_FULL), { full: true }); room.left--; };
// Fetches a card's picture and sound (or makes its speech) and keeps only the fields a card has.
async function withMedia(c, files, ctx, notes, room) {
  const card = { kind: c.kind, front: c.front, back: c.back, text: c.text, note: c.note, tags: c.tags, speak: c.speak, lang: c.lang };
  try {
    if (c.kind === 'image') { take(room); card.image = await fetchMedia(c.image, 'image', { files, local: ctx.local }); }
    if (c.kind === 'audio') { if (c.audio) { take(room); card.audio = await fetchMedia(c.audio, 'audio', { files, local: ctx.local }); } else card.audio = await speakFile(c.speak, c.lang, notes, room); }
  } catch (e) { throw e.full ? e : new Error('Card “' + String(c.front || c.back || c.speak || c.text || '').slice(0, 40) + '”: ' + e.message); }
  return card;
}
async function speakFile(words, lang, notes, room) {
  if (!isPro()) { notes.add(FREE_VOICE); return null; }
  try { if (room) take(room); const url = await speechFile(R.plain(words, { join: ' ', math: 'show' }), lang); if (!url) notes.add(DEVICE_VOICE); return url; }
  catch (e) { if (e.full) throw e; notes.add(e.message + ' Those cards use the device’s voice for now.'); return null; }
}

const CHECK_GUIDE = 'The learner asked to check AI changes first, and a Guide can’t wait for that check. Show them the text in the chat so they can paste it into the Guide themselves.';
// A deck's Guide as a list of pages: the Guide itself ("main") first, then its extra pages.
const guidePages = d => { const g = d.guide || { text: '', pages: [] }; return [{ id: 'main', title: 'Guide', characters: (g.text || '').length }, ...(g.pages || []).map(p => ({ id: p.id, title: p.title, characters: (p.text || '').length }))]; };

const TOOLS = [
  { name: 'list_decks', perm: 'read', description: 'List the learner’s decks, each with its id, folder, tags, how many cards it has, how many are due and new, its exam date, and whether it is shared or came from someone else. Use it first: the other tools take a deck’s name or id.', inputSchema: { type: 'object', properties: {} },
    run: () => text(state().decks.map(d => { const cs = state().cards.filter(c => c.deckId === d.id), paused = cs.filter(c => c.paused).length;
      return { id: d.id, name: d.name, folder: folderName(d), tags: d.tags, cards: cs.length, due: cs.filter(dueNow).length, new: cs.filter(isNew).length, paused: paused || undefined, exam: examOut(d),
        shared: d.share && d.share.vis !== 'private' ? (d.share.vis === 'public' ? 'public' : 'link only') : undefined,
        from: d.link && !d.link.gone ? { owner: d.link.owner && d.link.owner.name, as: d.link.mode === 'study' ? 'studied as it is (suggest changes with suggest_changes)' : 'the learner’s own copy' } : undefined }; })) },
  { name: 'list_cards', perm: 'read', description: 'List or search the cards in one deck, or in every deck when none is given. Each card comes with its id, deck, kind, text, tags and next review date (up to 500 cards, 50 by default). Use it to find a card’s id before changing or deleting it.', inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id. Leave out for every deck.' }, search: { type: 'string' }, limit: { type: 'number', description: 'Up to 500. Default 50.' } } },
    run: a => { const d = a.deck ? deckBy(a.deck) : null; if (a.deck && !d) return fail('No deck called ' + a.deck);
      const q = String(a.search || '').toLowerCase();
      const cs = state().cards.filter(c => (!d || c.deckId === d.id) && (!q || [c.front, c.back, c.text, c.note, ...c.tags].join(' ').toLowerCase().includes(q)));
      return text({ total: cs.length, cards: cs.slice(0, Math.min(500, a.limit || 50)).map(cardOut) }); } },
  { name: 'get_due_cards', perm: 'read', description: 'Get the cards that are due for review now, for quizzing the learner (20 by default). Paused cards are never due, and before a deck’s exam date the cards the learner would forget by then count as due early.', inputSchema: { type: 'object', properties: { deck: { type: 'string' }, limit: { type: 'number' } } },
    run: a => { const d = a.deck ? deckBy(a.deck) : null; const cs = state().cards.filter(c => (!d || c.deckId === d.id) && dueNow(c)); return text({ due: cs.length, cards: cs.slice(0, a.limit || 20).map(cardOut) }); } },
  { name: 'get_stats', perm: 'read', description: 'Get how studying is going: reviews in the last 30 days, how much is remembered, the streak, and totals. With Lucida Pro it also says how often cards are forgotten, the time per card, cards forgotten too often, exam readiness, and whether scheduling is tuned to the learner.', inputSchema: { type: 'object', properties: {} },
    run: () => { const S = state(), since = Date.now() - 30 * 86400000, logs = S.logs.filter(l => l.at >= since && l.rating && l.was === 'review' && !l.kind);
      const days = new Set(S.logs.map(l => dayAt(l.at)));
      let streak = 0, t = dayAt(Date.now());
      if (!days.has(t)) t = dayAt(t, -1);
      while (days.has(t)) { streak++; t = dayAt(t, -1); }
      const out = { decks: S.decks.length, cards: S.cards.length, reviews_last_30_days: S.logs.filter(l => l.at >= since && !l.kind).length,
        remembered_last_30_days: logs.length ? Math.round(logs.filter(l => l.rating > 1).length / logs.length * 100) + '%' : 'no reviews yet', streak_days: streak,
        paused_cards: S.cards.filter(c => c.paused).length };
      if (!isPro()) return text(out);
      const x = insights(S, { days: 30 }), tm = x.pace.time, tune = S.settings.tune;
      return text({ ...out, forgot_last_30_days: x.weak.forgot.of ? x.weak.forgot.pct + '% of reviews of learned cards' : 'no reviews yet',
        seconds_per_card: tm.perCard == null ? undefined : Math.round(tm.perCard * 10) / 10, right_answers_per_minute: tm.rightPerMin == null ? undefined : Math.round(tm.rightPerMin * 10) / 10,
        learn_mode_right: x.memory.modes.learn.n ? x.memory.modes.learn.pct + '% of ' + x.memory.modes.learn.n + ' answers' : undefined,
        cards_forgotten_too_often: x.weak.leeches.length, typical_gap_days: x.pace.gapNow == null ? undefined : Math.round(x.pace.gapNow),
        reviews_next_7_days: x.pace.ahead[0].n, exams: x.pace.exams.length ? x.pace.exams.map(e => ({ deck: e.name, date: e.date, days_left: e.days, cards_to_review_first: e.toReview, seen: e.seen + ' of ' + e.total, likely_to_remember: Math.round(e.likely * 100) + '%' })) : undefined,
        scheduling: tunedW() ? 'tuned to the learner’s ' + (tune.reviews || tune.n) + ' reviews' : 'standard FSRS parameters' }); } },
  { name: 'get_weak_spots', perm: 'read', pro: true, description: 'Find what the learner is weakest at: the tags remembered least, the hardest cards (forgotten most, most difficult), and cards forgotten so often they may need rewording (some may be paused). Every card comes with its id. Part of Lucida Pro.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id. Leave out for every deck.' }, days: { type: 'number', description: 'How far back to look at reviews for the tags, 7 to 365. Default 90.' }, limit: { type: 'number', description: 'Cards in each list, up to 50. Default 10.' } } },
    run: a => {
      const d = a.deck ? deckBy(a.deck) : null; if (a.deck && !d) return fail('No deck called ' + a.deck);
      const S = state(), n = Math.min(50, Math.max(1, Math.round(a.limit || 10))), x = insights(S, { days: Math.min(365, Math.max(7, Math.round(a.days || 90))), deckId: d && d.id });
      const cardBy = id => S.cards.find(c => c.id === id);
      return text({ forgot: x.weak.forgot.of ? x.weak.forgot.pct + '% of ' + x.weak.forgot.of + ' reviews of learned cards' : 'no reviews of learned cards yet',
        weakest_tags: x.weak.weakTags.map(g => ({ tag: g.tag, remembered: g.pct + '%', reviews: g.n, cards: g.cards })),
        hardest_cards: x.weak.hardest.slice(0, n).map(h => ({ ...cardOut(cardBy(h.id)), forgotten: h.lapses, difficulty: h.d, remember_now: h.recall == null ? undefined : Math.round(h.recall * 100) + '%' })),
        leeches: x.weak.leeches.slice(0, n).map(h => ({ ...cardOut(cardBy(h.id)), forgotten: h.lapses })), leech_count: x.weak.leeches.length }); } },
  { name: 'get_review_history', perm: 'read', pro: true, description: 'Get the learner’s recent reviews summed up day by day and deck by deck: reviews, percent right, minutes, new cards learned, and Learn mode answers. Part of Lucida Pro.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id. Leave out for every deck.' }, days: { type: 'number', description: 'How many days back, 1 to 365. Default 30.' } } },
    run: a => {
      const d = a.deck ? deckBy(a.deck) : null; if (a.deck && !d) return fail('No deck called ' + a.deck);
      const h = history(state(), { days: a.days || 30, deckId: d && d.id }), name = id => (deckBy(id) || {}).name || 'A deleted deck';
      return text({ total: h.total, by_day: h.days.map(x => ({ date: day(x.day), ...x, day: undefined })), by_deck: h.decks.map(x => ({ deck: name(x.deckId), ...x, deckId: undefined })) }); } },
  { name: 'create_deck', perm: 'text', description: 'Make a new deck, optionally in a folder and with a cover picture (a picture cover is part of Lucida Pro). It fails if a deck with that name already exists. Use add_cards to fill it.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, folder: FOLDER, cover_image: COVER, files: FILES }, required: ['name'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      if (deckBy(a.name)) return fail('There is already a deck called ' + a.name);
      if (a.cover_image && !state().ai.perms.media) return fail(NO_MEDIA);
      if (a.cover_image && !isPro()) return fail(FREE_COVER);
      let image = null;
      try { if (a.cover_image) image = await fetchMedia(a.cover_image, 'image', { files: a.files, local: ctx.local }); } catch (e) { return fail(e.message); }
      return text(apply({ type: 'deck.add', name: a.name, tags: a.tags, folder: a.folder ? folderFor(a.folder, who) : null, image }, who));
    } },
  { name: 'update_deck', perm: 'edit', description: 'Change a deck: rename it, retag it, move it into or out of a folder, give it a cover picture (part of Lucida Pro), or change the background it shows in Learn mode, flashcards, and Live. The values you give replace the old ones.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, name: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } },
      folder: { type: 'string', description: 'A folder name, made if there isn’t one yet. An empty string takes the deck out of its folder.' },
      cover_image: { type: 'string', description: 'The deck’s cover picture. ' + SOURCE + ' An empty string goes back to the deck’s own gradient.' },
      background: { type: 'string', enum: BG_KINDS, description: 'Behind Learn mode, flashcards, and Live: deck (the deck’s own colors, faint; the default), plain, sky, sunset, or photo (needs background_image, or uses the cover picture).' },
      background_image: { type: 'string', description: 'A picture for the background (sets background to photo). ' + SOURCE }, files: FILES }, required: ['deck'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      if ((a.cover_image || a.background_image) && !state().ai.perms.media) return fail(NO_MEDIA);
      if (a.cover_image && !isPro()) return fail(FREE_COVER);
      const patch = {};
      if (a.name !== undefined) { const other = deckBy(a.name); if (other && other !== d) return fail('There is already a deck called ' + a.name); patch.name = a.name; }
      if (a.tags !== undefined) patch.tags = a.tags;
      if (a.folder !== undefined) patch.folder = a.folder ? folderFor(a.folder, who) : null;
      try {
        if (a.cover_image !== undefined) patch.cover = { image: a.cover_image ? await fetchMedia(a.cover_image, 'image', { files: a.files, local: ctx.local }) : null };
        if (a.background_image) patch.bg = { kind: 'photo', image: await fetchMedia(a.background_image, 'image', { files: a.files, local: ctx.local }) };
      } catch (e) { return fail(e.message); }
      if (a.background !== undefined && !patch.bg) {
        if (!BG_KINDS.includes(a.background)) return fail('The background is one of: ' + BG_KINDS.join(', '));
        const image = a.background === 'photo' ? (d.bg && d.bg.image) || (patch.cover ? patch.cover.image : d.cover.image) : undefined;
        if (a.background === 'photo' && !image) return fail('A photo background needs background_image (or a cover picture on the deck).');
        patch.bg = image ? { kind: 'photo', image } : { kind: a.background };
      }
      apply({ type: 'deck.update', id: d.id, patch }, who);
      return text('Updated ' + (patch.name || d.name) + '.');
    } },
  { name: 'add_cards', perm: 'text', description: 'Add flashcards to a deck, making the deck if it doesn’t exist yet. Takes up to 500 cards of four kinds: basic (a question and its answer), fill in the blank, image, and audio. When the learner asked to check AI cards first, the new cards wait in the deck until they keep them.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, cards: { type: 'array', items: CARD, minItems: 1 }, files: FILES }, required: ['deck', 'cards'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const list = (Array.isArray(a.cards) ? a.cards : []).slice(0, 500).map(kindOf); if (!list.length) return fail('No cards given');
      const bad = list.find(problem);
      if (bad) return fail('Can’t add these cards: ' + problem(bad) + ': ' + JSON.stringify(bad));
      if (list.some(c => c.image || c.audio || c.kind === 'audio') && !state().ai.perms.media) return fail(NO_MEDIA);
      // Free's limit on pictures and sound: what these cards would use is checked before anything is fetched or spoken, and each one
      // is counted again as it is made. Spoken words only become a file on Pro (on Free the device reads them aloud).
      const needFile = list.filter(c => c.kind === 'image' || (c.kind === 'audio' && (c.audio || isPro())));
      if (needFile.length > mediaLeft()) return fail(MEDIA_FULL);
      // Pictures and sound first, so a bad link doesn't leave half the cards made.
      const notes = new Set(), ready = [], room = { left: mediaLeft() };
      try { for (const c of list) ready.push(await withMedia(c, a.files, ctx, notes, room)); } catch (e) { return fail(e.message); }
      const check = state().ai.perms.check;
      let d = deckBy(a.deck), made = 0;
      for (const c of ready) { const r = apply({ type: 'card.add', deckId: d ? d.id : null, deckName: d ? null : a.deck, ...c, pending: check }, who); d = deckBy(r.deckId); made += r.ids.length; }
      return text('Added ' + made + ' card' + (made === 1 ? '' : 's') + ' to ' + d.name + (check ? '. They wait in the deck until the learner keeps them.' : '.') + [...notes].map(n => ' ' + n).join(''));
    } },
  { name: 'update_card', perm: 'edit', description: 'Change a card: fix typos, give a better answer, change its tags, or give it a picture or sound. The fields you give replace the old ones. On a deck the learner studies from someone else, use suggest_changes instead.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, front: { type: 'string' }, back: { type: 'string' }, text: { type: 'string' }, note: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, ...MEDIA_PROPS, files: FILES }, required: ['id'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const c = state().cards.find(x => x.id === a.id); if (!c) return fail('There’s no card with id ' + a.id);
      const dk = deckBy(c.deckId);
      if (dk && dk.link && dk.link.mode === 'study' && !dk.link.gone) return fail('This deck is ' + dk.link.owner.name + '’s: use suggest_changes to suggest the fix.');
      const patch = {};
      for (const k of ['front', 'back', 'text', 'note', 'tags', 'speak', 'lang']) if (a[k] !== undefined) patch[k] = a[k];
      // A basic card becomes an image card with a picture, or an audio card with sound.
      const sound = a.audio || (a.speak && c.kind === 'basic') || (c.kind === 'audio' && (a.speak !== undefined || a.lang !== undefined));
      if (a.image || sound) {
        if (!state().ai.perms.media) return fail(NO_MEDIA);
        if (a.image && sound) return fail('A card can have a picture or a sound, not both.');
        if (a.image && !['basic', 'image'].includes(c.kind)) return fail('Only basic and image cards can have a picture.');
        if (sound && !['basic', 'audio'].includes(c.kind)) return fail('Only basic and audio cards can have sound.');
        // Free's limit is counted before the picture or sound is fetched or spoken (a card that has one already needs no new place).
        if ((a.image || a.audio || (sound && isPro())) && !(c.image || c.audio) && mediaLeft() < 1) return fail(MEDIA_FULL);
        const notes = new Set();
        try {
          if (a.image) { patch.image = await fetchMedia(a.image, 'image', { files: a.files, local: ctx.local }); patch.kind = 'image'; }
          else { patch.audio = a.audio ? await fetchMedia(a.audio, 'audio', { files: a.files, local: ctx.local }) : await speakFile(patch.speak ?? c.speak, patch.lang ?? c.lang, notes); patch.kind = 'audio'; }
        } catch (e) { return fail(e.message); }
        apply({ type: 'card.update', id: a.id, patch }, who);
        return text('Updated the card.' + [...notes].map(n => ' ' + n).join(''));
      }
      // "Let me check AI cards and changes first": the change waits on the card until the learner keeps it.
      if (state().ai.perms.check && !c.pending) { apply({ type: 'card.propose', id: a.id, patch }, who); return text('The change waits for the learner to keep it.'); }
      apply({ type: 'card.update', id: a.id, patch }, who);
      return text('Updated the card.');
    } },
  { name: 'add_quiz', perm: 'text', description: 'Save Learn mode questions on cards, one to three per card: multiple choice (a question, the right answer and three wrong ones) or true or false, each with a short reason. It can also save a short explanation of a card’s answer, shown when the learner taps Explain. New questions replace the card’s old ones. Use list_cards for card ids; its quiz_questions count shows which cards have questions already.',
    inputSchema: { type: 'object', properties: { quizzes: { type: 'array', minItems: 1, items: { type: 'object', properties: {
      card: { type: 'string', description: 'The card id.' },
      questions: { type: 'array', items: { type: 'object', properties: {
        kind: { type: 'string', enum: ['choice', 'true_false'] },
        question: { type: 'string', description: 'For choice, the question. For true_false, a statement that is true or false.' },
        answer: { type: 'string', description: 'For choice, the right answer (short). For true_false, "true" or "false".' },
        wrong: { type: 'array', items: { type: 'string' }, description: 'For choice: three plausible wrong answers, about as long as the right one.' },
        why: { type: 'string', description: 'One or two sentences on why the answer is right.' } }, required: ['kind', 'question', 'answer'] } },
      explanation: { type: 'string', description: 'Optional: two to four plain sentences explaining the card’s answer.' } }, required: ['card'] } } }, required: ['quizzes'] },
    run: (a, who) => { const r = apply({ type: 'card.quiz', quizzes: a.quizzes }, who); return r.questions || (a.quizzes || []).some(q => q.explanation) ? text('Saved ' + r.questions + ' question' + (r.questions === 1 ? '' : 's') + '. Learn mode uses them next time.') : fail('None of those questions could be used. Check the card ids, and give each choice question three wrong answers.'); } },
  { name: 'get_test_results', perm: 'read', description: 'Get the learner’s practice test results, newest first: for each test its date, deck (or folder), score, time taken, and the questions they missed, each with the learner’s answer, the right answer and the card’s id. Use it to see what the learner doesn’t know yet, then quiz them or fix those cards. Practice tests never change when cards come back for review. Takes a deck or folder name (or id), or none for every test, and how many tests to give (5 by default, up to 50).',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck or folder name, or id. Leave out for every test.' }, limit: { type: 'number', description: 'How many tests, up to 50. Default 5.' } } },
    run: a => {
      const S = state(), d = a.deck ? deckBy(a.deck) : null, f = a.deck && !d ? S.folders.find(x => x.id === a.deck || x.name.toLowerCase() === String(a.deck).trim().toLowerCase()) : null;
      if (a.deck && !d && !f) return fail('No deck or folder called ' + a.deck);
      const mine = (S.tests || []).filter(t => (!d || t.deckId === d.id) && (!f || t.folderId === f.id)), n = Math.min(50, Math.max(1, Math.round(a.limit || 5)));
      const missed = it => it.k === 'match'
        ? { kind: TEST_WORDS.match, pairs_missed: (it.pairs || []).filter(p => !p.ok).map(p => ({ card: p.card, term: p.q, learner_matched: p.a || 'no answer', right_answer: p.r })) }
        : { card: it.card, kind: TEST_WORDS[it.k], question: it.claim ? it.q + ' (true or false: ' + it.claim + ')' : it.q, learner_answered: it.a || 'no answer', right_answer: it.r };
      return text({ total: mine.length, tests: mine.slice(0, n).map(t => ({ date: day(t.at), deck: t.name, questions: t.n, right: t.right, percent: t.pct, time_taken: Math.floor(t.took / 60) + ':' + String(t.took % 60).padStart(2, '0'),
        time_limit_minutes: t.limit || undefined, time_ran_out: t.timeUp || undefined, missed: t.items ? t.items.filter(x => !x.ok).map(missed) : 'not kept for older tests' })) });
    } },
  { name: 'delete_cards', perm: 'del', description: 'Delete cards for good, with every review of them. When the learner asked to check AI changes first, a delete waits for them to agree. Use list_cards to find card ids.', inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } }, required: ['ids'] },
    run: (a, who) => {
      const cs = (a.ids || []).map(id => state().cards.find(c => c.id === id)).filter(Boolean), theirs = cs.map(c => deckBy(c.deckId)).find(d => d && d.link && d.link.mode === 'study' && !d.link.gone);
      if (theirs) return fail('Those cards are in ' + theirs.link.owner.name + '’s deck: use suggest_changes to suggest removing them.');
      if (state().ai.perms.check) { const kept = cs.filter(c => !c.pending); for (const c of kept) apply({ type: 'card.propose', id: c.id, remove: true }, who); const rest = cs.filter(c => c.pending).map(c => c.id); if (rest.length) apply({ type: 'card.delete', ids: rest }, who); return text((kept.length ? kept.length + ' wait for the learner to agree. ' : '') + (rest.length ? 'Deleted ' + rest.length + '.' : '')); }
      return text(apply({ type: 'card.delete', ids: a.ids }, who));
    } },
  // A deck's Guide: a Markdown page like a README, with extra pages beside it (store.mjs "A deck's Guide").
  { name: 'list_guide_pages', perm: 'read', description: 'List a deck’s Guide pages: the Guide itself (its main page) and any extra pages, each with its id, title and length. The Guide is a Markdown page the learner keeps about the deck, like a README.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' } }, required: ['deck'] },
    run: a => { const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck); return text(guidePages(d)); } },
  { name: 'get_guide', perm: 'read', description: 'Read a deck’s Guide (the notes page the learner keeps about the deck), or one of its extra pages. It is Markdown, plus toggles: a line ":::toggle Its title", what opens under it (any Markdown, even more toggles), and a line ":::" that closes it. Use list_guide_pages to see the extra pages.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, page: { type: 'string', description: 'An extra page’s id or title. Leave out for the Guide itself.' } }, required: ['deck'] },
    run: a => {
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      const pages = guidePages(d), p = a.page ? pages.find(x => x.id === a.page) || pages.find(x => x.title.toLowerCase() === String(a.page).trim().toLowerCase()) : pages[0];
      if (!p) return fail('There is no page called ' + a.page + ' in ' + d.name + '.');
      const g = p.id === 'main' ? d.guide : (d.guide.pages || []).find(x => x.id === p.id);
      return text({ deck: d.name, page: { id: p.id, title: p.title }, text: (g && g.text) || '', updated: g && g.at ? new Date(g.at).toISOString() : undefined, pages: pages.map(x => ({ id: x.id, title: x.title, characters: x.characters })) });
    } },
  { name: 'update_guide', perm: 'edit', description: 'Save a deck’s Guide (the notes page about the deck, in Markdown: headings, lists, task lists, links, tables, code and quotes) or one of its extra pages. Toggles fold what is under them: write a line ":::toggle Its title" (the key idea), what it holds on the lines after (any Markdown, even more toggles), and a line ":::" to close it; the learner opens and closes them. Notes read best as a ## heading for each topic with its points as toggles under it. A heading folds what is under it too. By default the text replaces what is there; the old words are kept as an older version the learner can bring back. With mode "append" the text goes after what is there. If the deck is shared, its Guide is shown on its public page, so keep it fit to be seen. Up to 40,000 characters.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, text: { type: 'string', description: 'The Markdown to write.' }, page: { type: 'string', description: 'An extra page’s id or title. Leave out for the Guide itself.' }, mode: { type: 'string', enum: ['replace', 'append'] } }, required: ['deck', 'text'] },
    run: (a, who) => {
      // A Guide can't wait for a check the way new cards do, so with "check AI cards and changes first" on, the learner writes it.
      if (state().ai.perms.check) return fail(CHECK_GUIDE);
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      const pages = guidePages(d), p = a.page ? pages.find(x => x.id === a.page) || pages.find(x => x.title.toLowerCase() === String(a.page).trim().toLowerCase()) : pages[0];
      if (!p) return fail('There is no page called ' + a.page + ' in ' + d.name + '. Use add_guide_page to make one.');
      const was = p.id === 'main' ? (d.guide && d.guide.text) || '' : ((d.guide.pages || []).find(x => x.id === p.id) || {}).text || '';
      const body = String(a.text ?? ''), next = a.mode === 'append' ? was + (was && !was.endsWith('\n') ? '\n\n' : '') + body : body;
      apply({ type: 'guide.save', deckId: d.id, page: p.id, text: next, snapshot: true }, who);
      return text('Wrote ' + (p.id === 'main' ? 'the Guide' : 'the page “' + p.title + '”') + ' of ' + d.name + '. The old words are kept as an older version.');
    } },
  { name: 'add_guide_page', perm: 'text', description: 'Add an extra page beside a deck’s Guide, like a page of a small wiki ("Lecture 3 summary", "Mnemonics"). A deck can have up to 10. Give it Markdown text now (toggles too, as update_guide says), or fill it in later with update_guide.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, title: { type: 'string' }, text: { type: 'string', description: 'The page’s Markdown.' } }, required: ['deck', 'title'] },
    run: (a, who) => {
      if (state().ai.perms.check) return fail(CHECK_GUIDE);
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      const r = apply({ type: 'guide.page.add', deckId: d.id, title: a.title }, who);
      if (a.text) apply({ type: 'guide.save', deckId: d.id, page: r.id, text: String(a.text) }, who);
      return text('Added the page “' + String(a.title).trim().slice(0, 80) + '” to ' + d.name + '. Its id is ' + r.id + '.');
    } },
  // The study network (social.mjs): decks other people share. The learner can study one as it is, or copy it; on a deck
  // from someone else, an AI can only suggest changes, which the owner takes or skips.
  { name: 'search_shared_decks', perm: 'read', description: 'Find decks other people share publicly on Lucida, by words, by topic (a tag), or narrowed by level, subject and school. With none of these it lists popular ones. Each deck comes with its id, name, author, card count, labels and link. Use study_shared_deck to add one to the learner’s library.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, topic: { type: 'string', description: 'A topic (a tag), like "MCAT" or "Spanish".' },
      level: { type: 'string', enum: LEVELS.map(l => l[1]), description: 'Only decks for this level of study.' },
      subject: { type: 'string', enum: SUBJECTS.map(l => l[1]), description: 'Only decks about this subject.' },
      school: { type: 'string', description: 'Only decks labeled with this college or university, like "University of Michigan" or "UCLA".' } } },
    run: async (a, who, ctx) => {
      const narrow = { level: a.level, subject: a.subject, school: a.school };
      const r = a.query ? await social.search(a.query, ctx.uid, narrow) : await social.discover(ctx.uid, { tag: a.topic || '', ...narrow });
      const list = a.query ? r.decks : (r.sections.find(s => s.id === 'popular' || s.id === 'results') || { decks: [] }).decks;
      return text(list.map(d => ({ id: d.id, name: d.name, by: d.owner ? d.owner.name + ' (@' + d.owner.handle + ')' : undefined, cards: d.cards, saves: d.stars, studying: d.learners, checked_by_a_teacher: !!d.checked || undefined, about: d.description || undefined,
        level: levelWords(d.level) || undefined, subject: subjectWords(d.subject) || undefined, school: d.school || undefined, link: 'https://lucida.cards' + d.url })));
    } },
  { name: 'get_shared_deck', perm: 'read', description: 'Read a shared deck: who made it, its version, its first 100 cards, and whether the learner already studies or copied it. Takes the deck’s id (from search_shared_decks) or its link.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Its id, or its link (lucida.cards/@name/deck).' } }, required: ['id'] },
    run: async (a, who, ctx) => {
      const m = /@([a-z0-9_.]{3,30})\/([a-z0-9-]{1,60})/i.exec(String(a.id)), id = (/\b(s[a-z0-9]{6,40})\b/.exec(String(a.id)) || [])[1];
      const p = await social.deckPage(m ? { handle: m[1], slug: m[2] } : { id: id || a.id }, ctx.uid);
      if (!p) return fail('That deck isn’t shared.');
      return text({ id: p.id, name: p.name, by: p.owner && p.owner.name, about: p.description || undefined, level: levelWords(p.level) || undefined, subject: subjectWords(p.subject) || undefined, school: p.school || undefined, cards: p.cards, version: p.version, learner: p.me ? { studying: !!p.me.studying, copied: !!p.me.copied, saved: p.me.starred } : undefined,
        sample: p.cardsList.slice(0, 100).map(c => ({ id: c.id, kind: c.kind === 'cloze' ? 'fill in the blank' : c.kind, front: c.front || undefined, back: c.back || undefined, text: c.text || undefined })) });
    } },
  { name: 'study_shared_deck', perm: 'text', description: 'Add a shared deck to the learner’s library. By default they study it as it is, and its cards follow the owner’s changes; with copy: true it becomes the learner’s own copy to change.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The shared deck’s id (from search_shared_decks).' }, copy: { type: 'boolean' }, name: { type: 'string', description: 'A name for a copy.' } }, required: ['id'] },
    run: async (a, who, ctx) => { const r = await social.addShared(ctx.uid, null, a.id, { copy: !!a.copy, name: a.name || '', updates: true }); return text((a.copy ? 'Copied it into the library' : 'Added it to the library') + '. Deck id: ' + r.deckId + '.'); } },
  { name: 'suggest_changes', perm: 'text', description: 'Suggest changes to a deck the learner studies or copied from someone else (list_decks shows "from" on it): fix a card, add cards, or take one out. The deck’s owner gets the suggestion, and nothing changes until they take it. "message" says why.',
    inputSchema: { type: 'object', properties: {
      deck: { type: 'string', description: 'The deck’s name or id in the learner’s library.' }, message: { type: 'string' },
      changes: { type: 'array', minItems: 1, items: { type: 'object', properties: { card: { type: 'string', description: 'The card’s id (from list_cards). Leave out to add a new card.' }, remove: { type: 'boolean', description: 'true to suggest taking the card out.' },
        kind: { type: 'string', enum: ['basic', 'cloze'] }, front: { type: 'string' }, back: { type: 'string' }, text: { type: 'string', description: 'For fill in the blank, with [[blanks]].' }, note: { type: 'string' } } } } }, required: ['deck', 'changes'] },
    run: async (a, who, ctx) => {
      const d = deckBy(a.deck);
      if (!d) return fail('No deck called ' + a.deck);
      if (!d.link || d.link.gone) return fail('This is the learner’s own deck: change it directly (update_card, add_cards).');
      const changes = (a.changes || []).map(c => {
        const mine = c.card && state().cards.find(x => x.id === c.card && x.deckId === d.id), after = {};
        for (const k of ['kind', 'front', 'back', 'text', 'note']) if (c[k] != null) after[k] = c[k];
        return c.card ? (mine && mine.origin ? { op: c.remove ? 'remove' : 'edit', card: mine.origin, after } : null) : { op: 'add', after };
      }).filter(Boolean);
      if (!changes.length) return fail('None of those cards are in ' + d.name + '.');
      const r = await social.suggest(ctx.uid, null, d.link.id, { message: a.message || '', changes }, who);
      return text(r.taken ? 'The learner helps keep this deck, so the changes went straight in.' : 'Sent to ' + d.link.owner.name + '. Nothing changes until they take it.');
    } }
];
// What each tool is, for the AI app's permission prompts and for the directories' checks (Claude's and ChatGPT's both turn
// a tool down without a title and explicit hints). `ro`: it only reads. `destructive`: it may overwrite or delete what the
// learner has (changing a card or a deck replaces what was there; adding things doesn't). `open`: it reaches beyond the
// learner's own library (other people's shared decks, and messages to their owners). `idem`: calling it again with the same
// words changes nothing more. `scope`: what a signed-in app needs (oauth.mjs). A new tool needs a row here; web tests fail without one.
const META = {
  list_decks: { title: 'List decks', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  list_cards: { title: 'List or search cards', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_due_cards: { title: 'Get cards due for review', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_stats: { title: 'Get study stats', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_weak_spots: { title: 'Find weak spots', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_review_history: { title: 'Get review history', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_test_results: { title: 'Get practice test results', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  create_deck: { title: 'Create a deck', scope: 'cards:write', ro: false, destructive: false, open: false, idem: false },
  update_deck: { title: 'Change a deck', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  add_cards: { title: 'Add cards', scope: 'cards:write', ro: false, destructive: false, open: false, idem: false },
  update_card: { title: 'Change a card', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  add_quiz: { title: 'Save Learn mode questions', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  delete_cards: { title: 'Delete cards', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  list_guide_pages: { title: 'List a deck’s Guide pages', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_guide: { title: 'Read a deck’s Guide', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  update_guide: { title: 'Write a deck’s Guide', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  add_guide_page: { title: 'Add a Guide page', scope: 'cards:write', ro: false, destructive: false, open: false, idem: false },
  search_shared_decks: { title: 'Search shared decks', scope: 'cards:read', ro: true, destructive: false, open: true, idem: true },
  get_shared_deck: { title: 'Read a shared deck', scope: 'cards:read', ro: true, destructive: false, open: true, idem: true },
  study_shared_deck: { title: 'Add a shared deck to the library', scope: 'cards:write', ro: false, destructive: false, open: true, idem: false },
  suggest_changes: { title: 'Suggest changes to a shared deck', scope: 'cards:write', ro: false, destructive: false, open: true, idem: false }
};
// A tool as tools/list shows it. An app that signed in through Lucida (not a secret link) is also told which scope each tool needs.
const listed = (t, oauth) => {
  const m = META[t.name], schemes = m && oauth ? [{ type: 'oauth2', scopes: [m.scope] }] : null, extra = { ...(t.meta || {}), ...(schemes ? { securitySchemes: schemes } : {}) };
  return { name: t.name, ...(m ? { title: m.title } : {}), description: t.description, inputSchema: t.inputSchema,
    ...(m ? { annotations: { title: m.title, readOnlyHint: m.ro, destructiveHint: m.destructive, idempotentHint: m.idem, openWorldHint: m.open } } : {}),
    ...(schemes ? { securitySchemes: schemes } : {}), ...(Object.keys(extra).length ? { _meta: extra } : {}) };
};
export const toolNames = () => TOOLS.map(t => t.name);
const allowed = () => TOOLS.filter(t => state().ai.perms[t.perm]);
const nameOf = info => { const n = String((info && info.name) || 'MCP app').replace(/\s+/g, ' ').trim().slice(0, 60) || 'MCP app'; return /claude/i.test(n) ? 'Claude' : /openai|chatgpt/i.test(n) ? 'ChatGPT' : /cursor/i.test(n) ? 'Cursor' : n; };

async function handle(m, sid, ctx) {
  if (m.id === undefined || m.id === null) return null; // notifications need no answer
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => ({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    switch (m.method) {
      case 'initialize': {
        const info = (m.params || {}).clientInfo || {};
        if (sessions.size > 10000) sessions.clear();
        sessions.set(sid, nameOf(info)); lastClient.set(ctx.uid || '', nameOf(info));
        apply({ type: 'ai.client', name: nameOf(info), version: info.version });
        const asked = (m.params || {}).protocolVersion;
        return ok({ protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0], capabilities: { tools: {} },
          serverInfo: { name: 'lucida', title: 'Lucida', version: '1.0.0', websiteUrl: 'https://lucida.cards' },
          instructions: 'Lucida holds the learner’s flashcards. Use list_decks first. Make clear, short cards with one idea each; use cloze cards with [[blanks]] for facts inside sentences. ' + FORMAT +
            ' Image cards show a picture: a link, a file the learner uploaded in the chat, or a file on this computer. Audio cards read words aloud (put them in "speak" and the language in "lang"); use them for languages and pronunciation.' +
            ' Learn mode quizzes the learner on a deck: add_quiz gives cards better questions (multiple choice with plausible wrong answers, or true or false) and an explanation. Decks can sit in folders and have a cover picture and a background (update_deck).' +
            ' A deck can have a Guide, its notes page in Markdown with toggles (":::toggle Its title" ... ":::"; get_guide, update_guide, and extra pages with list_guide_pages and add_guide_page); a shared deck shows it on its public page.' +
            ' To help with what the learner finds hard, get_weak_spots lists their weakest tags and hardest cards (with ids to quiz them or fix the cards), and get_review_history sums up their recent reviews. get_test_results shows their practice tests: the scores and the questions they missed.' });
      }
      case 'ping': return ok({});
      case 'tools/list': return ok({ tools: allowed().map(t => listed(t, ctx.oauth)) });
      case 'tools/call': {
        const p = m.params || {}, t = allowed().find(x => x.name === p.name);
        if (!t) return ok(fail(TOOLS.some(x => x.name === p.name) ? 'The learner turned this off on the Connect AI page.' : 'Unknown tool ' + p.name));
        if (t.pro && !isPro()) return ok(fail(PRO_TOOL));
        return ok(await t.run(p.arguments || {}, sessions.get(sid) || lastClient.get(ctx.uid || '') || 'AI', ctx));
      }
      default: return err(-32601, 'Method not found: ' + m.method);
    }
  } catch (e) { return m.method === 'tools/call' ? ok(fail(e.message)) : err(-32603, e.message); }
}

// `auth` is set when the app signed in through Lucida (oauth.mjs): { scopes, origin }. A secret link has none, and may do everything
// the Connect AI page allows.
export async function mcp(req, res, body, uid, auth = null) {
  if (req.method !== 'POST') { res.writeHead(req.method === 'DELETE' ? 200 : 405, { allow: 'POST' }).end(); return; }
  let msg;
  try { msg = JSON.parse(body); } catch { res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })); return; }
  let sid = req.headers['mcp-session-id'];
  const list = Array.isArray(msg) ? msg : [msg];
  if (!sid && list.some(x => x && x.method === 'initialize')) sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  // A connection that was only allowed to read can't call a tool that changes things: 403, asking the app to sign in again with more.
  if (auth) {
    const short = [...new Set(list.map(x => (x && x.method === 'tools/call' ? META[(x.params || {}).name] : null)).filter(m => m && !auth.scopes.has(m.scope)).map(m => m.scope))];
    if (short.length) {
      const scope = [...new Set([...auth.scopes].filter(x => x in SCOPES).concat(short))].join(' '), what = 'This connection may only read. Connect the app again and allow it to change cards.';
      res.writeHead(403, { 'content-type': 'application/json', 'www-authenticate': challenge(auth.origin, { error: 'insufficient_scope', scope, description: what }) }).end(JSON.stringify({ error: 'insufficient_scope', error_description: what }));
      return;
    }
  }
  // Files on this computer are only for AI apps running here: not through a tunnel or proxy, which adds these headers.
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !['x-forwarded-for', 'forwarded', 'x-real-ip', 'cf-connecting-ip'].some(h => req.headers[h]);
  const out = (await Promise.all(list.map(x => handle(x || {}, sid, { local, uid, oauth: !!auth })))).filter(Boolean);
  const head = { 'content-type': 'application/json', ...(sid ? { 'mcp-session-id': sid } : {}) };
  if (!out.length) { res.writeHead(202, head).end(); return; }
  res.writeHead(200, head).end(JSON.stringify(Array.isArray(msg) ? out : out[0]));
}
