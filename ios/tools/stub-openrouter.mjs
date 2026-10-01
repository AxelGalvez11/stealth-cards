// A pretend OpenRouter for the quiz checks (web/quizai.mjs): it answers /api/v1/chat/completions the way DeepSeek would answer the
// quiz request, with one question for each numbered card in the prompt, and keeps every request it gets. Words in a card's front
// make it misbehave, so a check can see what gets dropped:
//   ZZ-DUP (the wrong answers repeat)   ZZ-NOANS (no right answer)   ZZ-SAME (a wrong answer is the right one)   ZZ-OMIT (the card is left out)
//   ZZ-TOOFEW (two wrong answers)   ZZ-NOBLANK (a fill-in-the-blank question without a blank)   ZZ-LEAK (the blank's answer is in the sentence)
//   ZZ-TFBAD (a true-or-false answer of "maybe")   ZZ-SLOW (this request takes 2 seconds)
// Control while it runs:  POST /__stub {fail, delayMs, onlyPlain, types}   (types: 'multiple_choice' | 'true_false' | 'fill_blank' for every card, or null for the rotation)   GET /__stub/log   POST /__stub/reset
//   fail: 'http' (500) | 'empty' | 'garbage' | 'think' (only thinking) | 'fence' (JSON in a code fence, after thinking) | null
//   onlyPlain: the careful request (the one with `provider`) is turned away with 404, so only the plain retry answers
// node stub-openrouter.mjs   (STUB_PORT, default 3946)   or  import { startStub } from './stub-openrouter.mjs'
import http from 'node:http';
import { pathToFileURL } from 'node:url';

function cardsIn(prompt) {
  const out = []; let cur = null;
  for (const line of String(prompt).split('\n')) {
    const m = /^Card (\d+)$/.exec(line);
    if (m) { cur = { n: +m[1], front: '', back: '', note: '' }; out.push(cur); continue; }
    if (!cur) continue;
    const f = /^(Front|Back|Note): (.*)$/.exec(line);
    if (f) cur[f[1].toLowerCase()] = f[2];
  }
  return out;
}
// The question this card gets: the type rotates with the number (1 multiple choice, 2 true or false, 3 fill in the blank).
function questionFor(c, only) {
  const f = c.front, b = c.back, why = 'Because the card says ' + b + '.';
  const kind = only || ['multiple_choice', 'true_false', 'fill_blank'][(c.n - 1) % 3];
  if (kind === 'true_false') {
    const truth = c.n % 2 === 0;
    return { card: c.n, type: /ZZ-TFBAD/.test(f) ? 'true_false' : 'true_false', question: truth ? f + ' ' + b : f + ' not ' + b, answer: /ZZ-TFBAD/.test(f) ? 'maybe' : truth ? 'true' : 'false', wrong: [], why };
  }
  let wrong = ['Not ' + b + ' (1)', 'Not ' + b + ' (2)', 'Not ' + b + ' (3)'];
  if (/ZZ-DUP/.test(f)) wrong = [wrong[0], wrong[0].toUpperCase(), wrong[1]];
  if (/ZZ-SAME/.test(f)) wrong = [b, wrong[1], wrong[2]];
  if (/ZZ-TOOFEW/.test(f)) wrong = wrong.slice(0, 2);
  if (kind === 'fill_blank') {
    // A fill-in-the-blank card already has its blank; any other gets a sentence made around its front.
    let q = f.includes('____') ? f : 'The answer to "' + f + '" is ____ .';
    if (/ZZ-NOBLANK/.test(f)) q = 'The answer to "' + f + '" is missing.';
    if (/ZZ-LEAK/.test(f)) q = 'The ' + b + ' is ____ and the ' + b + ' is known.';
    return { card: c.n, type: kind, question: q, answer: b, wrong, why };
  }
  return { card: c.n, type: kind, question: f, answer: /ZZ-NOANS/.test(f) ? '' : b, wrong, why };
}

export function startStub({ port = 0 } = {}) {
  const S = { log: [], fail: null, delayMs: 0, onlyPlain: false, types: null };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', d => { raw += d; });
    req.on('end', async () => {
      const json = (code, o) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
      if (req.url === '/__stub/log') return json(200, { requests: S.log });
      if (req.url === '/__stub/reset') { S.log = []; return json(200, {}); }
      if (req.url === '/__stub') { Object.assign(S, JSON.parse(raw || '{}')); return json(200, { fail: S.fail, delayMs: S.delayMs, onlyPlain: S.onlyPlain, types: S.types }); }
      if (!/\/chat\/completions$/.test(req.url)) return json(404, { error: { message: 'No such thing' } });
      let body; try { body = JSON.parse(raw); } catch { return json(400, { error: { message: 'Bad JSON' } }); }
      S.log.push({ body, auth: req.headers.authorization || '', at: Date.now() });
      const prompt = ((body.messages || []).find(m => m.role === 'user') || {}).content || '';
      const cards = cardsIn(prompt);
      if (S.delayMs || cards.some(c => /ZZ-SLOW/.test(c.front))) await new Promise(r => setTimeout(r, S.delayMs || 2000));
      if (S.fail === 'http' || (S.onlyPlain && body.provider)) return json(S.onlyPlain && body.provider ? 404 : 500, { error: { message: 'No endpoints found' } });
      const qs = cards.filter(c => !/ZZ-OMIT/.test(c.front)).map(c => questionFor(c, S.types));
      const content = S.fail === 'empty' ? '' : S.fail === 'garbage' ? 'Sorry, I can not do that.' : S.fail === 'think' ? '<think>The user wants questions about' :
        S.fail === 'fence' ? '<think>Planning the questions.</think>\n```json\n' + JSON.stringify({ questions: qs }) + '\n```' : JSON.stringify({ questions: qs });
      return json(200, { choices: [{ message: { content } }] });
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => {
    const p = server.address().port;
    resolve({ port: p, url: 'http://127.0.0.1:' + p + '/api/v1', server, state: S, close: () => new Promise(r => server.close(r)) });
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = await startStub({ port: +process.env.STUB_PORT || 3946 });
  console.log('pretend OpenRouter on ' + s.url);
}
