// The MCP link (http://localhost:3000/mcp): Claude, Cursor, or any app that speaks MCP can read and add cards.
// What an AI may do is set on the Connect AI page; tools it isn't allowed to use aren't offered.
import { apply, state, blanks } from './store.mjs';
import { dayAt } from './fsrs.js';
import { fetchMedia, speechFile } from './media.mjs';
import R from './rich.js';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const sessions = new Map();
let lastClient = '';
const text = s => ({ content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] });
const fail = s => ({ content: [{ type: 'text', text: s }], isError: true });
const deckBy = x => state().decks.find(d => d.id === x) || state().decks.find(d => d.name.toLowerCase() === String(x || '').trim().toLowerCase());
const dueNow = c => c.srs.state !== 'new' && c.srs.due <= Date.now();
const cardOut = c => ({ id: c.id, deck: (deckBy(c.deckId) || {}).name, kind: c.kind === 'cloze' ? 'fill in the blank' : c.kind, front: c.front || undefined, back: c.back || undefined,
  text: c.text || undefined, note: c.note || undefined, image: c.image || undefined, audio: c.audio || undefined, speak: c.speak || undefined, lang: c.lang || undefined,
  tags: c.tags.length ? c.tags : undefined, waiting_for_review: c.pending || undefined,
  next_review: c.srs.state === 'new' ? 'new' : new Date(c.srs.due).toISOString().slice(0, 10) });
// Card text is short markdown; the app shows it formatted (see rich.js).
const FORMAT = 'Can use **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, ==highlight==, $math$ in LaTeX (like $x^2$ or $\\frac{a}{b}$), and lines that start with "# " (a heading; ## and ### are smaller), "- " (a bullet), or "1. " (a numbered list).';
// Pictures and sound: a link, an uploaded file ("file:N" from `files`), or a path on this computer (see media.mjs).
const SOURCE = 'A link (https://…), "file:0" for the first file in "files" (a file the learner uploaded in this chat), "file:1" for the second, and so on, or the full path of a file on this computer (only for AI apps running on the same computer as Lucida).';
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
const DEVICE_VOICE = 'No voice key is set up, so the app reads audio cards aloud with the device’s voice.';
// Fetches a card's picture and sound (or makes its speech) and keeps only the fields a card has.
async function withMedia(c, files, ctx, notes) {
  const card = { kind: c.kind, front: c.front, back: c.back, text: c.text, note: c.note, tags: c.tags, speak: c.speak, lang: c.lang };
  try {
    if (c.kind === 'image') card.image = await fetchMedia(c.image, 'image', { files, local: ctx.local });
    if (c.kind === 'audio') card.audio = c.audio ? await fetchMedia(c.audio, 'audio', { files, local: ctx.local }) : await speakFile(c.speak, c.lang, notes);
  } catch (e) { throw new Error('Card “' + String(c.front || c.back || c.speak || c.text || '').slice(0, 40) + '”: ' + e.message); }
  return card;
}
async function speakFile(words, lang, notes) {
  try { const url = await speechFile(R.plain(words, { join: ' ', math: 'show' }), lang); if (!url) notes.add(DEVICE_VOICE); return url; }
  catch (e) { notes.add(e.message + ' Those cards use the device’s voice for now.'); return null; }
}

const TOOLS = [
  { name: 'list_decks', perm: 'read', description: 'List the decks with how many cards each has and how many are due.', inputSchema: { type: 'object', properties: {} },
    run: () => text(state().decks.map(d => { const cs = state().cards.filter(c => c.deckId === d.id); return { id: d.id, name: d.name, tags: d.tags, cards: cs.length, due: cs.filter(dueNow).length, new: cs.filter(c => c.srs.state === 'new').length }; })) },
  { name: 'list_cards', perm: 'read', description: 'List or search the cards in a deck (or in every deck).', inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id. Leave out for every deck.' }, search: { type: 'string' }, limit: { type: 'number', description: 'Up to 500. Default 50.' } } },
    run: a => { const d = a.deck ? deckBy(a.deck) : null; if (a.deck && !d) return fail('No deck called ' + a.deck);
      const q = String(a.search || '').toLowerCase();
      const cs = state().cards.filter(c => (!d || c.deckId === d.id) && (!q || [c.front, c.back, c.text, c.note, ...c.tags].join(' ').toLowerCase().includes(q)));
      return text({ total: cs.length, cards: cs.slice(0, Math.min(500, a.limit || 50)).map(cardOut) }); } },
  { name: 'get_due_cards', perm: 'read', description: 'Cards that are due for review now, to quiz the learner.', inputSchema: { type: 'object', properties: { deck: { type: 'string' }, limit: { type: 'number' } } },
    run: a => { const d = a.deck ? deckBy(a.deck) : null; const cs = state().cards.filter(c => (!d || c.deckId === d.id) && dueNow(c)); return text({ due: cs.length, cards: cs.slice(0, a.limit || 20).map(cardOut) }); } },
  { name: 'get_stats', perm: 'read', description: 'How studying is going: reviews, what is remembered, streak, and totals.', inputSchema: { type: 'object', properties: {} },
    run: () => { const S = state(), since = Date.now() - 30 * 86400000, logs = S.logs.filter(l => l.at >= since && l.rating && l.was === 'review');
      const days = new Set(S.logs.map(l => dayAt(l.at)));
      let streak = 0, t = dayAt(Date.now());
      if (!days.has(t)) t = dayAt(t, -1);
      while (days.has(t)) { streak++; t = dayAt(t, -1); }
      return text({ decks: S.decks.length, cards: S.cards.length, reviews_last_30_days: S.logs.filter(l => l.at >= since).length,
        remembered_last_30_days: logs.length ? Math.round(logs.filter(l => l.rating > 1).length / logs.length * 100) + '%' : 'no reviews yet', streak_days: streak }); } },
  { name: 'create_deck', perm: 'text', description: 'Make a new deck.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['name'] },
    run: (a, who) => { if (deckBy(a.name)) return fail('There is already a deck called ' + a.name); return text(apply({ type: 'deck.add', name: a.name, tags: a.tags }, who)); } },
  { name: 'add_cards', perm: 'text', description: 'Add flashcards to a deck. The deck is made if it doesn’t exist yet. Keep each card to one idea.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, cards: { type: 'array', items: CARD, minItems: 1 }, files: FILES }, required: ['deck', 'cards'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const list = (Array.isArray(a.cards) ? a.cards : []).slice(0, 500).map(kindOf); if (!list.length) return fail('No cards given');
      const bad = list.find(problem);
      if (bad) return fail('Can’t add these cards: ' + problem(bad) + ': ' + JSON.stringify(bad));
      if (list.some(c => c.image || c.audio || c.kind === 'audio') && !state().ai.perms.media) return fail(NO_MEDIA);
      // Pictures and sound first, so a bad link doesn't leave half the cards made.
      const notes = new Set(), ready = [];
      try { for (const c of list) ready.push(await withMedia(c, a.files, ctx, notes)); } catch (e) { return fail(e.message); }
      const check = state().ai.perms.check;
      let d = deckBy(a.deck), made = 0;
      for (const c of ready) { const r = apply({ type: 'card.add', deckId: d ? d.id : null, deckName: d ? null : a.deck, ...c, pending: check }, who); d = deckBy(r.deckId); made += r.ids.length; }
      return text('Added ' + made + ' card' + (made === 1 ? '' : 's') + ' to ' + d.name + (check ? '. They wait in the deck until the learner keeps them.' : '.') + [...notes].map(n => ' ' + n).join(''));
    } },
  { name: 'update_card', perm: 'edit', description: 'Fix or change a card (typos, better answers, tags), or give it a picture or sound.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, front: { type: 'string' }, back: { type: 'string' }, text: { type: 'string' }, note: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, ...MEDIA_PROPS, files: FILES }, required: ['id'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const c = state().cards.find(x => x.id === a.id); if (!c) return fail('There’s no card with id ' + a.id);
      const patch = {};
      for (const k of ['front', 'back', 'text', 'note', 'tags', 'speak', 'lang']) if (a[k] !== undefined) patch[k] = a[k];
      // A basic card becomes an image card with a picture, or an audio card with sound.
      const sound = a.audio || (a.speak && c.kind === 'basic') || (c.kind === 'audio' && (a.speak !== undefined || a.lang !== undefined));
      if (a.image || sound) {
        if (!state().ai.perms.media) return fail(NO_MEDIA);
        if (a.image && sound) return fail('A card can have a picture or a sound, not both.');
        if (a.image && !['basic', 'image'].includes(c.kind)) return fail('Only basic and image cards can have a picture.');
        if (sound && !['basic', 'audio'].includes(c.kind)) return fail('Only basic and audio cards can have sound.');
        const notes = new Set();
        try {
          if (a.image) { patch.image = await fetchMedia(a.image, 'image', { files: a.files, local: ctx.local }); patch.kind = 'image'; }
          else { patch.audio = a.audio ? await fetchMedia(a.audio, 'audio', { files: a.files, local: ctx.local }) : await speakFile(patch.speak ?? c.speak, patch.lang ?? c.lang, notes); patch.kind = 'audio'; }
        } catch (e) { return fail(e.message); }
        apply({ type: 'card.update', id: a.id, patch }, who);
        return text('Updated the card.' + [...notes].map(n => ' ' + n).join(''));
      }
      apply({ type: 'card.update', id: a.id, patch }, who);
      return text('Updated the card.');
    } },
  { name: 'delete_cards', perm: 'del', description: 'Delete cards for good.', inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } }, required: ['ids'] },
    run: (a, who) => text(apply({ type: 'card.delete', ids: a.ids }, who)) }
];
const allowed = () => TOOLS.filter(t => state().ai.perms[t.perm]);
const nameOf = info => { const n = String((info && info.name) || 'MCP app'); return /claude/i.test(n) ? 'Claude' : /openai|chatgpt/i.test(n) ? 'ChatGPT' : /cursor/i.test(n) ? 'Cursor' : n; };

async function handle(m, sid, ctx) {
  if (m.id === undefined || m.id === null) return null; // notifications need no answer
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => ({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    switch (m.method) {
      case 'initialize': {
        const info = (m.params || {}).clientInfo || {};
        sessions.set(sid, nameOf(info)); lastClient = nameOf(info);
        apply({ type: 'ai.client', name: nameOf(info), version: info.version });
        const asked = (m.params || {}).protocolVersion;
        return ok({ protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0], capabilities: { tools: {} },
          serverInfo: { name: 'lucida', title: 'Lucida', version: '0.1.0' },
          instructions: 'Lucida holds the learner’s flashcards. Use list_decks first. Make clear, short cards with one idea each; use cloze cards with [[blanks]] for facts inside sentences. ' + FORMAT +
            ' Image cards show a picture: a link, a file the learner uploaded in the chat, or a file on this computer. Audio cards read words aloud (put them in "speak" and the language in "lang"); use them for languages and pronunciation.' });
      }
      case 'ping': return ok({});
      case 'tools/list': return ok({ tools: allowed().map(({ name, description, inputSchema, meta }) => ({ name, description, inputSchema, ...(meta ? { _meta: meta } : {}) })) });
      case 'tools/call': {
        const p = m.params || {}, t = allowed().find(x => x.name === p.name);
        if (!t) return ok(fail(TOOLS.some(x => x.name === p.name) ? 'The learner turned this off on the Connect AI page.' : 'Unknown tool ' + p.name));
        return ok(await t.run(p.arguments || {}, sessions.get(sid) || lastClient || 'AI', ctx));
      }
      default: return err(-32601, 'Method not found: ' + m.method);
    }
  } catch (e) { return m.method === 'tools/call' ? ok(fail(e.message)) : err(-32603, e.message); }
}

export async function mcp(req, res, body) {
  if (req.method !== 'POST') { res.writeHead(req.method === 'DELETE' ? 200 : 405, { allow: 'POST' }).end(); return; }
  let msg;
  try { msg = JSON.parse(body); } catch { res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })); return; }
  let sid = req.headers['mcp-session-id'];
  const list = Array.isArray(msg) ? msg : [msg];
  if (!sid && list.some(x => x && x.method === 'initialize')) sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  // Files on this computer are only for AI apps running here: not through a tunnel or proxy, which adds these headers.
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !['x-forwarded-for', 'forwarded', 'x-real-ip', 'cf-connecting-ip'].some(h => req.headers[h]);
  const out = (await Promise.all(list.map(x => handle(x || {}, sid, { local })))).filter(Boolean);
  const head = { 'content-type': 'application/json', ...(sid ? { 'mcp-session-id': sid } : {}) };
  if (!out.length) { res.writeHead(202, head).end(); return; }
  res.writeHead(200, head).end(JSON.stringify(Array.isArray(msg) ? out : out[0]));
}
