// Sign in with Apple from the iPhone app, as the server sees it: node apple-signin.mjs [port]
// The native app asks Apple for an ID token made for its own bundle (the audience cards.lucida.app) and a nonce, and sends both to
// POST /api/auth/token. The web's Sign in with Apple uses another id, the Services ID (cards.lucida.web). The server has no list of
// audiences of its own: it hands the token and the nonce to Supabase (`/auth/v1/token?grant_type=id_token`), and Supabase accepts the
// audiences in its Apple provider's "Client IDs" (Supabase dashboard → Authentication → Sign In / Providers → Apple), checking the
// token's nonce against the raw one. So whether the app can sign in on a real iPhone depends on that list holding cards.lucida.app
// next to cards.lucida.web, which only the owner can see; this test shows the server's part: it forwards what the app sends, lets
// both audiences through when Supabase does, and doesn't make up a yes when Supabase says no. It runs the real server against a
// small pretend Supabase on this Mac whose Apple "Client IDs" list can be set either way (it never touches the real one).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../../', import.meta.url)), PORT = +(process.argv[2] || 3907);
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { if (c) pass++; else fail++; console.log((c ? '  ok   ' : '  FAIL ') + name + (c || extra === '' ? '' : '  -> ' + String(typeof extra === 'string' ? extra : JSON.stringify(extra)).slice(0, 300))); };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const sha = s => createHash('sha256').update(s).digest('hex');

// ---------- a pretend Supabase: only what Sign in with Apple asks of it ----------
let clientIds = ['cards.lucida.web', 'cards.lucida.app'];
const seen = [];
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x'), text = Buffer.concat(chunks).toString(), body = (() => { try { return JSON.parse(text || '{}'); } catch { return {}; } })();
    seen.push({ method: req.method, path: url.pathname + url.search, body, apikey: req.headers.apikey });
    const send = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'id_token') {
      // What Supabase checks for Apple: who made it, who it is for (one of the Client IDs), and that its nonce is the hash of the raw one.
      let claims = {}; try { claims = JSON.parse(Buffer.from(String(body.id_token).split('.')[1], 'base64url').toString()); } catch { /* not a token */ }
      if (body.provider !== 'apple' || claims.iss !== 'https://appleid.apple.com') return send(400, { error_code: 'validation_failed', msg: 'Bad ID token' });
      if (!clientIds.includes(claims.aud)) return send(400, { error_code: 'validation_failed', msg: 'Unacceptable audience in id_token: [' + claims.aud + ']' });
      if (claims.nonce !== sha(String(body.nonce))) return send(400, { error_code: 'validation_failed', msg: 'Nonces mismatch' });
      return send(200, { access_token: 'e30.' + b64({ exp: Math.floor(Date.now() / 1000) + 3600 }) + '.k1', refresh_token: 'rt1', expires_in: 3600, token_type: 'bearer', user: { id: '11111111-1111-4111-8111-111111111111', email: 'a@privaterelay.appleid.com' } });
    }
    if (url.pathname === '/auth/v1/user' && req.method === 'PUT') return send(200, { id: '11111111-1111-4111-8111-111111111111' });
    send(404, { msg: 'not here' });
  });
});
await new Promise(ok2 => fake.listen(PORT + 1, '127.0.0.1', ok2));

// ---------- the real server, online (told Supabase is there), talking to it ----------
const data = mkdtempSync(join(tmpdir(), 'lucida-signin-'));
const server = spawn('node', ['web/server.mjs'], { cwd: REPO, env: { ...process.env, PORT: String(PORT), STEALTH_DATA: data + '/', SUPABASE_URL: 'http://127.0.0.1:' + (PORT + 1), SUPABASE_SECRET_KEY: 'secret', SUPABASE_PUBLISHABLE_KEY: 'public' }, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { await fetch('http://127.0.0.1:' + PORT + '/'); break; } catch { await new Promise(r => setTimeout(r, 200)); } }

// The app's call: Apple's ID token for the raw nonce it made, and the name Apple gave (only the first time).
const idToken = (aud, nonce) => 'e30.' + b64({ iss: 'https://appleid.apple.com', aud, sub: 'apple-user-1', nonce: sha(nonce), email: 'a@privaterelay.appleid.com' }) + '.sig';
const appCalls = async (aud, { nonce = 'raw-nonce-from-the-app', name = '' } = {}) => {
  seen.length = 0;
  const r = await fetch('http://127.0.0.1:' + PORT + '/api/auth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'apple', token: idToken(aud, nonce), nonce, name }) });
  return { status: r.status, json: await r.json().catch(() => ({})), cookies: r.headers.getSetCookie().join('\n') };
};
try {
  let r = await appCalls('cards.lucida.app', { name: 'Ada Lovelace' });
  ok(r.status === 200 && r.json.ok === true, 'the iPhone app’s token (audience cards.lucida.app) signs in when Supabase lists that audience', r);
  ok(/lc_at=/.test(r.cookies) && /lc_rt=/.test(r.cookies), 'and the session cookies come back');
  const call = seen.find(s => s.path === '/auth/v1/token?grant_type=id_token');
  ok(call && call.body.provider === 'apple' && call.body.nonce === 'raw-nonce-from-the-app' && call.body.id_token === idToken('cards.lucida.app', 'raw-nonce-from-the-app'), 'Supabase is asked with the token and the raw nonce exactly as the app sent them', call);
  ok(call && call.apikey === 'public', 'with the public key (Supabase’s limits count it like a call from the app)');
  ok(seen.some(s => s.method === 'PUT' && s.path === '/auth/v1/user' && s.body.data && s.body.data.full_name === 'Ada Lovelace'), 'Apple’s name, given only the first time, is saved to the account');

  r = await appCalls('cards.lucida.web');
  ok(r.status === 200 && r.json.ok === true, 'the web’s Services ID (cards.lucida.web) still works next to it');

  r = await appCalls('cards.lucida.app', { nonce: 'another-nonce' });
  ok(r.status === 200, 'a different nonce each time is fine (the token is made for it)');

  r = await appCalls('cards.lucida.elsewhere');
  ok(r.status === 400 && !/lc_at=/.test(r.cookies), 'a token made for some other app: refused, no session', r);

  // The thing only the owner can check: Supabase's own list. Without cards.lucida.app in it, the iPhone's Apple sign-in fails.
  clientIds = ['cards.lucida.web'];
  r = await appCalls('cards.lucida.app');
  ok(r.status === 400 && /try again/i.test(r.json.error || '') && !/lc_at=/.test(r.cookies), 'if Supabase’s Apple Client IDs lacked cards.lucida.app, the app would get “try again” and no session (so the list must have it)', r);
  clientIds = ['cards.lucida.web', 'cards.lucida.app'];

  r = await (async () => { seen.length = 0; const x = await fetch('http://127.0.0.1:' + PORT + '/api/auth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'apple', token: idToken('cards.lucida.app', 'n') }) }); return { status: x.status, calls: seen.length }; })();
  ok(r.status === 400 && r.calls === 0, 'a call with no nonce never reaches Supabase', r);
} finally {
  server.kill(); fake.close(); rmSync(data, { recursive: true, force: true });
}
console.log('\nsign-in with Apple: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
