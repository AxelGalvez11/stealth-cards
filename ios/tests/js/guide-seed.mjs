// Makes the made-up people the Guide test (LucidaUITests/GuideTests.swift) taps through, on a running copy of the server, through the server's own acts and its
// make steps with the stand-in AI (so a Source is exactly what a make leaves, not something written by hand): an owner with a deck, "Cell Biology", that has a Guide with
// two extra pages and one of every kind of Source (a PDF and a Word file, a recording kept as thirteen files that is almost two hours long, a video, two pictures, pasted text, a topic),
// a deck with two Sources that is shared (a shared page says "Made from 2 sources"), and someone who studies the first deck once it's shared. Writes what the test needs to
// know (ids, names, the places in the Sources some cards point at) as JSON.
//   SERVER=http://127.0.0.1:3934 STUB=http://127.0.0.1:3939 node guide-seed.mjs <out.json> [tag]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SERVER = process.env.SERVER || 'http://127.0.0.1:3934', STUB = process.env.STUB || 'http://127.0.0.1:3939';
const FIX = process.env.FIXTURES || fileURLToPath(new URL('../fixtures/', import.meta.url));
const [out, tag = Date.now().toString(36).slice(-4)] = process.argv.slice(2);
if (!out) { console.error('usage: node guide-seed.mjs <out.json> [tag]'); process.exit(2); }

// A made-up person's client: acts, social acts, and a whole make (upload, start, the steps, finish) the way the page does it.
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
    // Everything a make does, then Add: the cards go into the deck as made from this source. Gives back the source's id and the cards' places in it.
    make: async (deckId, source, files = [], count = 6) => {
      const ids = []; for (const f of files) ids.push(await me.upload(f));
      const s = await me.post('/api/make/start', { ...source, uploads: ids, options: { count, deckId } });
      if (s.status !== 200) throw new Error('start: ' + JSON.stringify(s.body));
      const job = s.body.job;
      const run = async (phase, n) => { let i = 0; await Promise.all(Array.from({ length: Math.min(3, n) }, async () => { while (i < n) { const k = i++; const r = await me.post('/api/make/step', { job, phase, i: k }); if (r.status !== 200) throw new Error(phase + ' ' + k + ': ' + JSON.stringify(r.body)); } })); };
      let parts = s.body.parts;
      if (s.body.phase === 'read') { await run('read', s.body.read); const p = await me.post('/api/make/plan', { job }); if (p.status !== 200) throw new Error('plan: ' + JSON.stringify(p.body)); parts = p.body.parts; }
      await run('write', parts);
      const f = await me.post('/api/make/finish', { job }); if (f.status !== 200) throw new Error('finish: ' + JSON.stringify(f.body));
      const sv = await me.post('/api/make/save', { job, deck: { id: deckId }, cards: f.body.cards });
      if (sv.status !== 200) throw new Error('save: ' + JSON.stringify(sv.body));
      return { id: sv.body.sourceId, cards: f.body.cards.length };
    }
  };
  return me;
};
// A recording of `seconds` of quiet as a WAV (8-bit, mono, at `rate` samples a second: 500 keeps a long one small; the server reads its length from the header).
const wav = (seconds, rate = 500) => {
  const data = Buffer.alloc(Math.round(seconds * rate), 0x80), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate, 28);
  h.writeUInt16LE(1, 32); h.writeUInt16LE(8, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
};
const fx = name => readFileSync(FIX + '/' + name);

await fetch(STUB + '/__reset', { method: 'POST' });
await fetch(STUB + '/__flags', { method: 'POST', body: JSON.stringify({ realLength: true }) });

const ownerName = 'gdown' + tag, studierName = 'gdstudy' + tag, other = 'gdnew' + tag;
const owner = as(ownerName);
for (const w of [ownerName, studierName, other]) await as(w).act('settings.update', { patch: { welcomed: true } });
const SENT = ['The mitochondrion makes most of the cell’s ATP from sugar and oxygen.', 'The nucleus stores the cell’s DNA and steers what the cell does.', 'Ribosomes build proteins from amino acids using instructions from RNA.',
  'The Golgi apparatus packs proteins into vesicles and sends them to where they are needed.', 'Lysosomes break down waste and old parts of the cell with strong enzymes.'];

// ---------- the main deck: Cell Biology, with a Guide and every kind of Source ----------
const { id: deckId } = await owner.act('deck.add', { name: 'Cell Biology' });
await owner.act('card.add', { deckId, kind: 'basic', front: 'What is ATP?', back: 'The cell’s energy' });
const GUIDE = ['# Cell Biology: Exam 1', '', 'Everything for the first exam, in the order we covered it. Start with the checklist, then the mnemonics.', '', '## Checklist', '- [x] Organelles and what each one does',
  '- [x] The electron transport chain', '- [ ] Glycolysis, step by step', '- [ ] Mitosis versus meiosis', '', '## Mnemonics', '| Phase | Remember it as |', '| --- | --- |', '| Prophase | **P**ut your chromosomes in **P**lace |',
  '| Metaphase | **M**iddle of the cell |', '| Anaphase | **A**part they go |', '| Telophase | **T**wo new cells |', '', '> The mitochondrion makes most of the cell’s ATP.', '', '[Back to the top](#cell-biology-exam-1)', '', 'Questions? Ask in [office hours](https://example.edu/office-hours).'].join('\n');
await owner.act('guide.save', { deckId, text: GUIDE });
const g1 = (await owner.act('guide.page.add', { deckId, title: 'Lecture 3 summary' })).id, g2 = (await owner.act('guide.page.add', { deckId, title: 'Mnemonics' })).id;
await owner.act('guide.save', { deckId, page: g1, text: '## Lecture 3\n\nThe **electron transport chain** pumps protons across the inner membrane.\n\n1. NADH gives up its electrons.\n2. Protons are pumped out of the matrix.\n3. ATP synthase lets them flow back and makes ATP.' });
await owner.act('guide.save', { deckId, page: g2, text: '- **PMAT** for the phases of mitosis\n- *Please Do Not Throw Sausage Pizza Away* for the layers' });

const src = {};
src.pdf = await owner.make(deckId, { kind: 'file', title: 'Lecture 3 slides' }, [{ name: 'cups.pdf', type: 'application/pdf', buf: fx('cups.pdf') }]);
// (a Word file opens in the document viewer, not in the PDF viewer)
src.doc = await owner.make(deckId, { kind: 'file', title: 'Lecture 2 handout' }, [{ name: 'tu.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buf: fx('tu.docx') }]);
// A two-hour recording of thirteen files of 550 seconds each (the page cuts a long one into parts like these): a card from 1:30:00 is in the tenth, 7 and a half minutes in.
const PARTS = 13, PART = 550;
src.recording = await owner.make(deckId, { kind: 'recording', title: 'Lecture 4 recording' },
  Array.from({ length: PARTS }, (_, i) => ({ name: 'Lecture 4 (part ' + (i + 1) + ' of ' + PARTS + ').wav', type: 'audio/wav', buf: wav(PART) })), 40);
src.video = await owner.make(deckId, { kind: 'video', title: 'Mitochondria explained', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  text: ['0:00', 'Welcome to the lecture on enzymes today', '0:30', 'An enzyme lowers the activation energy of a reaction', '1:00', 'The active site binds the substrate', '1:30', 'Inhibitors slow an enzyme down'].join('\n') });
src.photo = await owner.make(deckId, { kind: 'photo', title: 'Whiteboard' }, [{ name: 'IMG_1.png', type: 'image/png', buf: fx('a.png') }, { name: 'IMG_2.jpg', type: 'image/jpeg', buf: fx('a.jpg') }]);
src.text = await owner.make(deckId, { kind: 'text', title: 'Study notes', text: SENT.join('\n\n') });
src.topic = await owner.make(deckId, { kind: 'topic', title: 'The Krebs cycle', topic: 'The Krebs cycle' });

const st = await owner.state(), deck = st.decks.find(d => d.id === deckId), cards = st.cards.filter(c => c.deckId === deckId);
const place = id => { const c = cards.find(c => c.src && c.src.id === id && c.src.at) || cards.find(c => c.src && c.src.id === id); return c ? { card: c.id, at: (c.src.at || ''), front: c.front || c.text || '' } : null; };
const sources = Object.fromEntries(deck.sources.map(s => [s.kind === 'file' && /\.docx$/i.test((s.files[0] || {}).file || '') ? 'doc' : s.kind, { id: s.id, name: s.name, cards: s.cards, files: (s.files || []).map(f => ({ name: f.name, seconds: f.seconds })), pages: s.pages || 0, seconds: s.seconds || 0, at: place(s.id) }]));

// ---------- a shared deck with two Sources (its page says how many, and nothing else) ----------
const { id: sharedDeck } = await owner.act('deck.add', { name: 'Shared Cells' });
await owner.act('guide.save', { deckId: sharedDeck, text: '# Shared Cells\n\nA short Guide anyone can read.\n\n- one\n- two' });
await owner.make(sharedDeck, { kind: 'text', title: 'Secret source name', text: SENT.join('\n\n') });
await owner.make(sharedDeck, { kind: 'topic', title: 'Another private source', topic: 'Cells again' });
const shared = await owner.soc('deck.share', { deckId: sharedDeck, visibility: 'public' });

// ---------- someone who studies Cell Biology once it's shared ----------
const share = await owner.soc('deck.share', { deckId, visibility: 'public' });
const studier = as(studierName);
await studier.state();
await studier.soc('deck.study', { id: share.id });
const studied = (await studier.state()).decks.find(d => d.name === 'Cell Biology');

writeFileSync(out, JSON.stringify({ tag, owner: ownerName, studier: studierName, newcomer: other, deckId, deckName: 'Cell Biology', guide: GUIDE, pages: { g1, g2 }, sources, parts: { n: PARTS, seconds: PART },
  sourceCount: deck.sources.length, sharedDeckId: sharedDeck, sharedId: shared.id, shareId: share.id, studiedDeckId: studied && studied.id }, null, 1));
console.log('seeded ' + ownerName + ' (deck ' + deckId + ', ' + Object.keys(sources).length + ' sources, ' + cards.length + ' cards), ' + studierName + ', shared ' + shared.id + ' → ' + out);
