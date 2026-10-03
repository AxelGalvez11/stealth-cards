// A pretend OpenRouter for testing Explain (the AI that explains a card's answer) without touching anything real. Start it, then
// start web/server.mjs with OPENROUTER_API_KEY=test OPENROUTER_BASE=http://127.0.0.1:<port> and the server asks this instead:
//   STUB_PORT=3916 node ios/tools/explain-stub.mjs
// What the card's front says decides how it answers (the words are in the card, so a test can make each one happen):
//   FAILAI   the AI doesn't answer (the server says so, and gives the day's count back)
//   LONGAI   a long explanation (taller than the card, so the panel has to scroll)
//   SLOWAI   a few seconds' wait (the panel says "Thinking…" meanwhile)
//   anything else: a short one that quotes the answer.
// A question asked about the card in Explain (a follow-up: the explanation comes as the AI's own first answer, then the questions) gets
// "You asked “<question>”. It comes back to <answer>." The words in the QUESTION decide the same way (FAILAI, LONGAI, SLOWAI).
// GET /__count says how many explanations have been asked for so far (a saved one isn't asked for again), how many follow-ups, and what the
// last follow-up was sent (`last`: its messages); POST /__reset forgets them.
import { createServer } from 'node:http';

const PORT = +process.env.STUB_PORT || 3916;
let asked = [], follow = [];
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

createServer((req, res) => {
  const parts = [];
  req.on('data', c => parts.push(c));
  req.on('end', async () => {
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/__count') return json(res, 200, { count: asked.length, asked, followUps: follow.length, last: follow.length ? follow[follow.length - 1].messages : null });
    if (path === '/__reset') { asked = []; follow = []; return json(res, 200, {}); }
    if (path !== '/chat/completions') return json(res, 404, { error: 'no such thing' });
    let body = {};
    try { body = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}'); } catch { /* not json */ }
    const user = ((body.messages || []).find(m => m.role === 'user') || {}).content || '';
    const front = (/^Card: (.*)$/m.exec(user) || [])[1] || '', answer = (/^Answer: (.*)$/m.exec(user) || [])[1] || '';
    const msgs = body.messages || [], last = msgs[msgs.length - 1] || {};
    if (msgs.length > 2 || /\nQuestion: /.test(user)) {
      const q = msgs.length > 2 ? String(last.content || '') : user.split('\nQuestion: ').pop();
      follow.push({ front, q, messages: msgs });
      if (/SLOWAI/.test(q)) await sleep(3000);
      if (/FAILAI/.test(q)) return json(res, 500, { error: 'the stand-in AI was told to fail' });
      const more = ' A good way to keep it is to tie it back to the card each time you see it.';
      return json(res, 200, { choices: [{ message: { content: 'You asked “' + q + '”. It comes back to **' + answer + '**.' + (/LONGAI/.test(q) ? more.repeat(14) : '') } }] });
    }
    asked.push(front);
    if (/SLOWAI/.test(front)) await sleep(3000);
    if (/FAILAI/.test(front)) return json(res, 500, { error: 'the stand-in AI was told to fail' });
    const sentence = 'It works this way because ' + answer + ', and a good way to remember it is to picture the whole thing as one short story. ';
    const text = 'Because ' + answer + '. ' + (/LONGAI/.test(front) ? sentence.repeat(14) : sentence);
    json(res, 200, { choices: [{ message: { content: text } }] });
  });
}).listen(PORT, '127.0.0.1', () => console.log('explain stub on ' + PORT));
