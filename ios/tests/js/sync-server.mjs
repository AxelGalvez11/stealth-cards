// A stand-in for Lucida's server that answers /api/state?sync=1 and /api/state in the ways a real one can go wrong, for
// checking how the app opens (API.syncedState: the library with the sync gets 8 seconds, then the plain library; a 401 means
// signed out). Which way it goes is named by the lc_dev cookie (the app sends it like any person's):
//   fast           the sync answers at once (rev 3); the plain library is rev 2
//   slow           the sync is held for 12 seconds
//   dribble        the sync answers its headers at once and then a space every second for 12 seconds (so a request's own
//                  timeout, which only counts the quiet stretches, would never fire)
//   broken         the sync answers 500
//   dropped        the sync's connection is cut
//   signedout      both answer 401
//   plainsignedout the sync is held for 12 seconds, and the plain library answers 401
// GET /__log says what came in. Listens on an ephemeral port and writes it to the file named by PORTFILE.
import http from 'node:http';
import { writeFileSync } from 'node:fs';

const log = [], t0 = Date.now();
const lib = rev => JSON.stringify({ rev });
http.createServer((req, res) => {
  const who = /lc_dev=([a-z0-9]+)/.exec(req.headers.cookie || '')?.[1] || '';
  const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(body); };
  if (req.url === '/__log') return json(200, JSON.stringify(log));
  log.push({ who, url: req.url, at: Date.now() - t0 });
  const sync = req.url === '/api/state?sync=1';
  if (!sync && req.url !== '/api/state') return json(404, '{}');
  if (who === 'signedout') return json(401, JSON.stringify({ error: 'Sign in.' }));
  if (!sync) return who === 'plainsignedout' ? json(401, JSON.stringify({ error: 'Sign in.' })) : json(200, lib(2));
  if (who === 'fast') return json(200, lib(3));
  if (who === 'slow' || who === 'plainsignedout') return void setTimeout(() => json(200, lib(3)), 12000);
  if (who === 'broken') return json(500, JSON.stringify({ error: 'That didn’t work.' }));
  if (who === 'dropped') return void req.socket.destroy();
  if (who === 'dribble') {
    res.writeHead(200, { 'content-type': 'application/json' });
    let n = 0; const tick = setInterval(() => { if (++n >= 12) { clearInterval(tick); res.end(lib(3)); } else res.write(' '); }, 1000);
    res.on('close', () => clearInterval(tick));
    return;
  }
  json(200, lib(3));
}).listen(0, '127.0.0.1', function () { writeFileSync(process.env.PORTFILE, String(this.address().port)); });
