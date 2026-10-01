#!/usr/bin/env node
// A stand-in for two things Lucida's server does online and a copy on this Mac can't: asking you to sign in, and signing you in with
// an email and a password. It sits in front of web/server.mjs (which lets anyone in as one made-up person) for the app's account tests:
//   * a request to /api/... with nobody signed in (no lc_dev cookie) is answered 401 "Sign in to Lucida.", as online, so the app shows
//     its sign-in screen instead of opening as the person on this computer;
//   * POST /api/auth/password/set (a made-up person saves a password: 8 to 72 characters) and POST /api/auth/password (an email and
//     a password: the person's lc_dev cookie comes back, or "That email and password don’t match.") answer with the words the real
//     server uses (web/handler.mjs); a made-up person's email is <name>@dev.local, like on the server;
//   * everything else goes straight through to the server.
// Nothing here knows how to talk to the internet: it only listens on this Mac and talks to the server on this Mac.
//   node ios/tools/password-proxy.mjs <port to listen on> <port of the server>
import http from 'node:http';

const [listen, target] = [+process.argv[2], +process.argv[3]];
if (!listen || !target) { console.error('Usage: password-proxy.mjs <port to listen on> <port of the server>'); process.exit(2); }

/** email → password, from the people who saved one. */
const passwords = new Map();
const cookieOf = (req, name) => (String(req.headers.cookie || '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === name) || [])[1] || '';
const emailOf = name => name + '@dev.local';
const send = (res, status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }); res.end(JSON.stringify(body)); };
const readJson = req => new Promise(done => {
  let raw = ''; req.on('data', c => { raw += c; if (raw.length > 1e5) req.destroy(); });
  req.on('end', () => { try { done(JSON.parse(raw || '{}')); } catch { done({}); } });
});

http.createServer(async (req, res) => {
  const path = (req.url || '').split('?')[0], who = cookieOf(req, 'lc_dev');
  if (path === '/api/auth/password/set' && req.method === 'POST') {
    const b = await readJson(req);
    if (!who) return send(res, 401, { error: 'Sign in to Lucida.', signIn: true });
    const password = String(b.password || '');
    if (password.length < 8 || password.length > 72) return send(res, 400, { error: 'Use 8 to 72 characters.' });
    passwords.set(emailOf(who), password);
    return send(res, 200, { ok: true });
  }
  if (path === '/api/auth/password' && req.method === 'POST') {
    const b = await readJson(req), email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return send(res, 400, { error: 'Type your email and password.' });
    if (passwords.get(email) !== password || !email.endsWith('@dev.local')) return send(res, 400, { error: 'That email and password don’t match.' });
    return send(res, 200, { ok: true }, { 'set-cookie': 'lc_dev=' + email.slice(0, -'@dev.local'.length) + '; Path=/; HttpOnly; SameSite=Lax' });
  }
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/') && !who) return send(res, 401, { error: 'Sign in to Lucida.', signIn: true });
  const up = http.request({ host: '127.0.0.1', port: target, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); });
  up.on('error', () => send(res, 502, { error: 'The server isn’t answering.' }));
  req.pipe(up);
}).listen(listen, '127.0.0.1', () => console.log('password stand-in on ' + listen + ' → ' + target));
