// Makes the made-up people the Diagrams test (LucidaUITests/DiagramsTests.swift) taps through, on a running copy of the server, through the server's own acts and its make steps with the
// stand-in AI (so a diagram is exactly what a make or Make diagram leaves, not something written by hand). Several owners each have the same deck, "Cell biology": eight cards (the
// first four tagged cell), the lecture the cards were made from (slides with diagrams: the make finds three, the stand-in AI reads each one's words and their boxes from its size),
// a table and a mind map made from the cards, and an uploaded picture. One more owner shares a deck with a table and a mind map (and a lecture picture and an upload, which a shared
// deck never carries) and someone studies it. Writes what the test needs to know (names, ids) as JSON.
//   SERVER=http://127.0.0.1:3908 STUB=http://127.0.0.1:3909 node diagrams-seed.mjs <out.json> [tag] [owners]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SERVER = process.env.SERVER || 'http://127.0.0.1:3908', STUB = process.env.STUB || 'http://127.0.0.1:3909';
const FIX = process.env.FIXTURES || fileURLToPath(new URL('../fixtures/', import.meta.url));
const [out, tag = Date.now().toString(36).slice(-4), count = '7'] = process.argv.slice(2);
if (!out) { console.error('usage: node diagrams-seed.mjs <out.json> [tag] [owners]'); process.exit(2); }
const fx = name => readFileSync(FIX + '/' + name);

// A made-up person's client: acts, social acts, and a whole make (upload, start, the steps, the pictures looked at, finish) the way the app does it.
const as = who => {
  const j = async (url, o = {}) => {
    const r = await fetch(SERVER + url, { ...o, headers: { cookie: 'lc_dev=' + who, ...(o.body && typeof o.body === 'string' ? { 'content-type': 'application/json' } : {}), ...(o.headers || {}) } });
    const t = await r.text(); let body; try { body = JSON.parse(t); } catch { body = t; }
    return { status: r.status, body };
  };
  const me = {
    who,
    state: () => j('/api/state').then(r => r.body),
    act: async (type, o = {}) => { const r = await j('/api/action', { method: 'POST', body: JSON.stringify({ type, ...o }) }); if (r.status !== 200) throw new Error(type + ': ' + (r.body.error || r.status)); return r.body.result; },
    soc: async (type, o = {}) => { const r = await j('/api/social', { method: 'POST', body: JSON.stringify({ type, ...o }) }); if (r.status !== 200) throw new Error(type + ': ' + (r.body.error || r.status)); return r.body.result; },
    post: (url, body) => j(url, { method: 'POST', body: JSON.stringify(body || {}) }),
    upload: async f => {
      const r = await me.post('/api/make/upload', { name: f.name, type: f.type, size: f.buf.length });
      if (r.status !== 200) throw new Error('upload: ' + JSON.stringify(r.body));
      const p = r.body.put, put = p.url.startsWith('http') ? await fetch(p.url, { method: 'PUT', body: f.buf, headers: p.headers }) : await j(p.url, { method: 'PUT', body: f.buf, headers: { 'content-type': f.type || 'application/octet-stream' } });
      if (put.status !== 200) throw new Error('put: ' + put.status);
      return r.body.id;
    },
    // Everything a make does, then Add: the cards go into the deck as made from this source, and the diagrams found go to its Diagrams.
    make: async (deckId, source, files, options = {}) => {
      const ids = []; for (const f of files) ids.push(await me.upload(f));
      const s = await me.post('/api/make/start', { ...source, uploads: ids, options: { count: 10, kinds: ['basic'], deckId, ...options } });
      if (s.status !== 200) throw new Error('start: ' + JSON.stringify(s.body));
      const job = s.body.job;
      const run = async (phase, n) => { let i = 0; await Promise.all(Array.from({ length: Math.min(3, n) }, async () => { while (i < n) { const k = i++; const r = await me.post('/api/make/step', { job, phase, i: k }); if (r.status !== 200) throw new Error(phase + ': ' + JSON.stringify(r.body)); } })); };
      let parts = s.body.parts;
      if (s.body.phase === 'read') { await run('read', s.body.read); const p = await me.post('/api/make/plan', { job }); if (p.status !== 200) throw new Error('plan: ' + JSON.stringify(p.body)); parts = p.body.parts; }
      await run('write', parts);
      if (s.body.see) await run('see', s.body.see);
      const f = await me.post('/api/make/finish', { job }); if (f.status !== 200) throw new Error('finish: ' + JSON.stringify(f.body));
      const sv = await me.post('/api/make/save', { job, deck: { id: deckId }, cards: f.body.cards });
      if (sv.status !== 200) throw new Error('save: ' + JSON.stringify(sv.body));
      return { sourceId: sv.body.sourceId, cards: f.body.cards.length, figures: f.body.figures };
    }
  };
  return me;
};

await fetch(STUB + '/__reset', { method: 'POST' });

/** An owner with the deck, its lecture, a table, a mind map and an uploaded picture. */
async function owner(name, deckName, { shared = false } = {}) {
  const me = as(name);
  await me.act('settings.update', { patch: { welcomed: true } });
  const { id: deckId } = await me.act('deck.add', { name: deckName });
  for (let i = 0; i < 8; i++) await me.act('card.add', { deckId, kind: 'basic', front: 'What does part ' + (i + 1) + ' do?', back: 'It does job ' + (i + 1), tags: i < 4 ? ['cell'] : [] });
  const slides = await me.make(deckId, { kind: 'file', title: 'Lecture 3 slides' }, [{ name: 'Lecture 3 slides.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buf: fx('lecture-diagrams.pptx') }]);
  const t = await me.post('/api/diagrams/make', { deckId, type: 'table' }), m = await me.post('/api/diagrams/make', { deckId, type: 'mindmap', scope: { kind: 'tag', value: 'cell' } });
  if (t.status !== 200 || m.status !== 200) throw new Error('Make diagram: ' + JSON.stringify([t.body, m.body]));
  const up = await me.upload({ name: 'Whiteboard.png', type: 'image/png', buf: fx('whiteboard-map.png') });
  const k = await me.post('/api/diagrams/keep', { deckId, upload: up, name: 'Whiteboard map' });
  if (k.status !== 200) throw new Error('keep: ' + JSON.stringify(k.body));
  const st = await me.state(), deck = st.decks.find(d => d.id === deckId);
  return { name, deckId, deckName, table: t.body.id, map: m.body.id, upload: k.body.id, figures: slides.figures, diagrams: (deck.diagrams || []).map(g => ({ id: g.id, kind: g.kind, name: g.name, labels: Array.isArray(g.labels) ? g.labels.length : null })), cards: st.cards.filter(c => c.deckId === deckId).length };
}

const owners = [];
for (let i = 1; i <= +count; i++) owners.push(await owner('dg' + i + tag, 'Cell biology ' + tag));

// ---------- a shared deck, and someone who studies it ----------
const sharer = await owner('dgshare' + tag, 'Shared cell biology ' + tag);
const sh = await as(sharer.name).soc('deck.share', { deckId: sharer.deckId, visibility: 'public' });
const studierName = 'dgstudy' + tag, studier = as(studierName);
await studier.act('settings.update', { patch: { welcomed: true } });
await studier.soc('deck.study', { id: sh.id });
const studied = (await studier.state()).decks.find(d => d.name === sharer.deckName);
// someone with nothing: for the empty tab
const empty = 'dgempty' + tag, ee = as(empty);
await ee.act('settings.update', { patch: { welcomed: true } });
const { id: emptyDeck } = await ee.act('deck.add', { name: 'Empty deck ' + tag });
for (let i = 0; i < 4; i++) await ee.act('card.add', { deckId: emptyDeck, kind: 'basic', front: 'Question ' + (i + 1) + '?', back: 'Answer ' + (i + 1) });
const newcomer = 'dgnew' + tag; await as(newcomer).act('settings.update', { patch: { welcomed: true } });
await fetch(STUB + '/__reset', { method: 'POST' });

writeFileSync(out, JSON.stringify({ tag, owners, sharer, sharedId: sh.id, studier: studierName, studiedDeckId: studied && studied.id, studiedDeckName: sharer.deckName, empty, emptyDeck, emptyDeckName: 'Empty deck ' + tag, newcomer }, null, 1));
console.log('seeded ' + owners.length + ' owners (' + owners[0].name + ': ' + owners[0].diagrams.length + ' diagrams), ' + sharer.name + ' sharing ' + sh.id + ', ' + studierName + ' studying it → ' + out);
