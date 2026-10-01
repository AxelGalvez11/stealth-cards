// A stand-in for Lucida's server that answers /api/make/* the way a real one can go wrong, for checking how the iPhone app's flow
// (Data/MakeData.swift, web/make.js ported) behaves where the simulator's tests can't reach: where a file is put (this server's own path
// with the person's cookie, or the storage's address with the headers it gave and no cookie), three parts at a time, a part tried again
// twice, the server's own words, a 401, and Cancel while it's starting. Which way it goes is named by the lc_dev cookie (the check sends it
// like any person's); GET /__log says what came in, POST /__reset forgets it, POST /__mode {who, mode} changes how a person's parts go.
//   (anyone)   everything works; 9 parts, each held for a quarter of a second so the ones running at once can be counted
//   direct…    a file goes up to the storage's own address (/storage/<id> here), with an x-test header
//   notes…     finish also gives the starter notes (title, overview, two notes with where they come from, and the Markdown), if the make asked for them
//              (options.notes: true, as the real server only drafts them then, and never for more cards from a source)
//   audio…     finish also gives two audio cards (words, es-ES, what they mean), and the notes (if asked for)
//   limit      start says 402: "That's today's 3 free makes…" (code day, pro)
//   out        every answer is 401
//   slowstart  start takes a second and a half
//   modes (for parts): flaky2 (each part fails twice with 500 code ai, then works), flaky3 (every try fails 500 code ai), bad400 (400 code unreadable),
//                      busy429 (each part's first try is 429 with no code), gone (409 code gone)
// Listens on an ephemeral port and writes it to the file named by PORTFILE.
import http from 'node:http';
import { writeFileSync } from 'node:fs';

let log = [], flight = 0, peak = 0, jobs = 0, modes = {}, tries = {}, noted = {};
const PARTS = 9;
let base = '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
http.createServer((req, res) => {
  const chunks = []; req.on('data', c => chunks.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(chunks), who = /lc_dev=([a-z0-9]+)/.exec(req.headers.cookie || '')?.[1] || '', url = new URL(req.url, 'http://x'), path = url.pathname;
    const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    let body = {}; try { body = JSON.parse(raw.toString() || '{}'); } catch { /* not json */ }
    if (path === '/__log') return json(200, { log, peak });
    if (path === '/__reset') { log = []; peak = 0; flight = 0; tries = {}; modes = {}; noted = {}; return json(200, {}); }
    if (path === '/__mode') { modes[body.who] = body.mode; return json(200, {}); }
    const entry = { method: req.method, path, who, cookie: req.headers.cookie || '', type: req.headers['content-type'] || '', test: req.headers['x-test'] || '', bytes: raw.length, body: req.method === 'POST' ? body : undefined, at: Date.now() };
    log.push(entry);
    if (who === 'out') return json(401, { error: 'Sign in.' });
    if (req.method === 'PUT' && (path.startsWith('/api/make/put/') || path.startsWith('/storage/'))) return json(200, { ok: true });
    if (path === '/api/make/upload') {
      const id = 'u' + Math.random().toString(16).slice(2, 12);
      if (who.startsWith('direct')) return json(200, { id, put: { url: base + '/storage/' + id, method: 'PUT', headers: { 'x-test': 'yes', 'content-type': body.type }, direct: true } });
      return json(200, { id, put: { url: '/api/make/put/' + id, method: 'PUT', headers: { 'content-type': body.type }, direct: false } });
    }
    if (path === '/api/make/start') {
      if (who === 'limit') return json(402, { error: 'That’s today’s 3 free makes. Go Pro for 30 a day.', code: 'day', pro: true });
      if (who === 'slowstart') await sleep(1500);
      const job = 'j' + (++jobs).toString().padStart(8, '0');
      entry.job = job;
      noted[job] = !body.fromSource && body.options?.notes === true;       // (only a make that asked for notes gets them)
      return json(200, { job, kind: body.kind === 'text' ? 'text' : body.kind || 'file', name: 'Sample ' + (body.kind || 'file'), phase: 'write', read: 0, parts: PARTS, pages: 1, seconds: 0, photos: 0, target: 10 });
    }
    if (path === '/api/make/step') {
      const mode = modes[who] || '', key = who + ':' + body.job + ':' + body.phase + body.i, n = tries[key] = (tries[key] || 0) + 1;
      entry.attempt = n;
      flight++; peak = Math.max(peak, flight);
      await sleep(250);
      flight--;
      if (mode === 'flaky3' || (mode === 'flaky2' && n <= 2)) return json(500, { error: 'The AI didn’t answer. Try again in a moment.', code: 'ai' });
      if (mode === 'bad400') return json(400, { error: 'Lucida couldn’t read that. Try a different file.', code: 'unreadable' });
      if (mode === 'busy429' && n <= 1) return json(429, { error: 'That’s a lot at once. Wait a moment, then try again.' });
      if (mode === 'gone') return json(409, { error: 'That make was cancelled.', code: 'gone' });
      return json(200, { ok: true, phase: body.phase, i: body.i, n: PARTS, items: 3 });
    }
    if (path === '/api/make/plan') return json(200, { parts: PARTS });
    if (path === '/api/make/finish') {
      const cards = [1, 2, 3].map(k => ({ k, kind: 'basic', front: 'Question ' + k + '?', back: 'Answer ' + k, text: '', at: 'p. ' + k }));
      cards.push({ k: 4, kind: 'cloze', front: '', back: '', text: 'The [[answer]] is four.', at: '' });
      // A person whose name starts with "audio" gets audio cards too (the way the server answers for a language that is set).
      if (who.startsWith('audio')) cards.push({ k: 5, kind: 'audio', front: '', back: 'the house', text: '', speak: 'la casa', lang: 'es-ES', at: '' }, { k: 6, kind: 'audio', front: '', back: 'good morning', text: '', speak: 'buenos días', lang: 'es-ES', at: '' });
      // One whose name starts with "notes" (or "audio") gets the starter notes beside the cards, as the server drafts them.
      const notes = (who.startsWith('notes') || who.startsWith('audio')) && noted[body.job]
        ? { title: 'Sample', overview: 'What the sample is about.', sections: [{ heading: 'First idea', at: 'p. 1', text: 'The **first** idea.' }, { heading: 'Second idea', at: 'p. 3', text: '- one\n- two' }], text: '# Sample\n\nWhat the sample is about.\n\n## First idea (p. 1)\n\nThe **first** idea.\n\n## Second idea (p. 3)\n\n- one\n- two\n' } : null;
      return json(200, { ready: true, name: 'Sample', kind: 'topic', cards, notes });
    }
    if (path === '/api/make/save') return json(200, { deckId: 'dk1', deckName: 'Deck', added: (body.cards || []).length, sourceId: 'x1' });
    if (path === '/api/make/cancel') return json(200, { ok: true });
    if (path === '/api/make/job') return json(200, { job: log.filter(e => e.job).slice(-1)[0]?.job || '', phase: 'write', read: 0, parts: PARTS });
    json(404, { error: 'stub: no ' + path });
  });
}).listen(0, '127.0.0.1', function () { base = 'http://127.0.0.1:' + this.address().port; writeFileSync(process.env.PORTFILE, String(this.address().port)); });
