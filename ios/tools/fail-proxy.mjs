// A stand-in in front of the server for the end-to-end check of Lucida's own message (LucidaUITests/OwnUITests.swift, flow 5): everything goes through as it is,
// except that while the file FAIL_FLAG exists every save (POST /api/action) is answered with a plain sentence and a 400, as a server that can't save would.
//   TARGET=http://127.0.0.1:3993 PORT=3995 FAIL_FLAG=/tmp/fail node ios/tools/fail-proxy.mjs
import { createServer, request } from 'node:http';
import { existsSync } from 'node:fs';

const TARGET = new URL(process.env.TARGET || 'http://127.0.0.1:3993'), PORT = +process.env.PORT || 3995, FLAG = process.env.FAIL_FLAG || '';
createServer((req, res) => {
  if (FLAG && req.method === 'POST' && req.url.startsWith('/api/action') && existsSync(FLAG)) {
    req.resume();
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'That didn’t save. Try again.' }));
    return;
  }
  const up = request({ host: TARGET.hostname, port: TARGET.port, path: req.url, method: req.method, headers: { ...req.headers, host: TARGET.host } }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(up);
}).listen(PORT, '127.0.0.1', () => console.log('fail-proxy on', PORT, '→', TARGET.origin));
