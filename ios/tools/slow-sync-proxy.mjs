// A stand-in for a slow server, for checking that the iPhone app opens without waiting on it: everything goes through to
// the real server (a copy of web/server.mjs on this Mac), except the library *with the sync* (GET /api/state?sync=1), which
// is held for HOLD milliseconds (12 seconds) before it goes through, the way a server busy bringing decks you study up to
// date would hold it. The app gives up on that after 8 seconds and asks for the plain library (/api/state), which goes
// straight through. GET /__proxy/log says what came in and when, and what time it is now for the proxy (for the test to
// check: { now, log: [{ at, method, path, held, done }] }, all in milliseconds since the proxy started).
//   node ios/tools/slow-sync-proxy.mjs      (PORT=3846 TARGET=http://127.0.0.1:3844 HOLD=12000)
import http from 'node:http';

const PORT = +(process.env.PORT || 3846), TARGET = new URL(process.env.TARGET || 'http://127.0.0.1:3844'), HOLD = +(process.env.HOLD || 12000);
if (+TARGET.port === PORT) { console.error('The stand-in would forward to itself (TARGET is on its own port ' + PORT + ').'); process.exit(1); }
const log = [];          // { at: ms since the proxy started, path, held: ms it was held, done: ms it was answered at }
const t0 = Date.now();
const send = (req, res, body) => {
  const out = http.request({ host: TARGET.hostname, port: TARGET.port, path: req.url, method: req.method, headers: { ...req.headers, host: TARGET.host } }, r => {
    res.writeHead(r.statusCode, r.headers); r.pipe(res);
  });
  out.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  out.end(body);
};

http.createServer((req, res) => {
  if (req.url === '/__proxy/log') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ now: Date.now() - t0, log })); return; }
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks), slow = req.method === 'GET' && req.url === '/api/state?sync=1';
    const entry = { at: Date.now() - t0, method: req.method, path: req.url, held: slow ? HOLD : 0, done: 0 };
    log.push(entry);
    res.on('close', () => { entry.done = Date.now() - t0; });
    if (slow) setTimeout(() => send(req, res, body), HOLD); else send(req, res, body);
  });
}).listen(PORT, '127.0.0.1', () => console.log('Slow-sync proxy on http://127.0.0.1:' + PORT + ' → ' + TARGET.origin + ' (holding /api/state?sync=1 for ' + HOLD / 1000 + ' s)'));
