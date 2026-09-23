// Every request to Lucida's server: the web app's data (/api), signing in (/api/auth, /auth), the MCP link for AI
// apps (/mcp), pictures and sound (/media), and the app's own files. The same code runs on your computer (server.mjs)
// and on Vercel (api/index.js), where the pages are static files and only /api, /auth, /mcp, and /media reach this.
// Online, everything but signing in needs a signed-in person, and each person only ever sees their own library.
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { state, apply, withLibrary, revOf, putMedia, mediaLink, MEDIA } from './store.mjs';
import { mcp } from './mcp.mjs';
import { EXT } from './media.mjs';
import { cloud, auth } from './supa.mjs';
import { who, forget, accessToken, sessionCookies, clearCookies, pkce, verifier, clearPkce, linkOwner, sameLink } from './auth.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webm': 'audio/webm' };

const inside = (root, file) => file === root || file.startsWith(root.endsWith(sep) ? root : root + sep);
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const go = (res, to) => { res.writeHead(302, { location: to, 'cache-control': 'no-store' }); res.end(); };
const readBody = (req, limit) => new Promise((ok, bad) => {
  const parts = []; let n = 0;
  req.on('data', b => { n += b.length; if (n > limit) { bad(new Error('Too big')); req.destroy(); } else parts.push(b); });
  req.on('end', () => ok(Buffer.concat(parts))); req.on('error', bad);
});
const jsonOf = body => { try { return JSON.parse(String(body || '{}')) || {}; } catch { return {}; } };
// Pages from this site (or this computer) may change data; other websites can't send requests here.
const sameSite = req => {
  const o = req.headers.origin;
  if (!o || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return true;
  try { return new URL(o).host === (req.headers['x-forwarded-host'] || req.headers.host); } catch { return false; }
};
const originOf = req => ((req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || (req.socket.encrypted ? 'https' : 'http')) + '://' + (req.headers['x-forwarded-host'] || req.headers.host);
// Holds the answer until the data is saved, so a request that has to run again still sends just one answer.
const held = () => {
  let head = [200, {}], body = '';
  return { writeHead(code, h) { head = [code, h || {}]; return this; }, end(b) { body = b ?? ''; return this; }, sendTo(res) { res.writeHead(head[0], head[1]); res.end(body); } };
};
// What the app gets: the library, plus who is signed in (online).
const view = me => ({ ...state(), me });

async function api(req, res, path, body, me) {
  if (path === '/api/state' && req.method === 'GET') return send(res, 200, view(me));
  if (path === '/api/action' && req.method === 'POST') {
    try { const result = apply(JSON.parse(body)); return send(res, 200, { result, state: view(me) }); }
    catch (e) { return send(res, 400, { error: e.message }); }
  }
  if (path === '/api/media' && req.method === 'POST') {
    const type = String(req.headers['content-type'] || '').split(';')[0], ext = EXT[type];
    if (!ext) return send(res, 415, { error: 'Only images and audio' });
    const name = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + ext;
    await putMedia(name, body, type);
    return send(res, 200, { url: '/media/' + name });
  }
  return send(res, 404, { error: 'Not found' });
}

// Signing in. The email code and the session never touch the page's scripts: the session lives in cookies they can't read.
const TRY_AGAIN = 'That didn’t work. Try again in a minute.';
async function signIn(req, res, path) {
  if (path === '/api/auth/code' && req.method === 'POST') {
    const email = String(jsonOf(await readBody(req, 1e4)).email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return send(res, 400, { error: 'Type your email address.' });
    const p = pkce(req);
    try { await auth.sendCode(email, originOf(req) + '/auth/callback', p.challenge); res.setHeader('set-cookie', p.set); return send(res, 200, { ok: true }); }
    catch (e) { return send(res, e.status === 429 ? 429 : 400, { error: e.status === 429 ? 'Too many codes for now. Wait a minute, then try again.' : TRY_AGAIN }); }
  }
  if (path === '/api/auth/verify' && req.method === 'POST') {
    const b = jsonOf(await readBody(req, 1e4)), email = String(b.email || '').trim().toLowerCase(), code = String(b.code || '').replace(/\D/g, '');
    if (!email || code.length !== 6) return send(res, 400, { error: 'Type the 6-digit code from the email.' });
    try {
      const s = await auth.verify(email, code);
      res.setHeader('set-cookie', sessionCookies(req, s));
      return send(res, 200, { ok: true });
    } catch (e) { return send(res, 400, { error: e.status === 429 ? 'Too many tries for now. Wait a minute, then try again.' : 'That code didn’t work. Check the newest email, or send a new code.' }); }
  }
  if (path === '/api/auth/signout' && req.method === 'POST') {
    const token = accessToken(req);
    if (token) { forget(token); await auth.signOut(token).catch(() => {}); }
    res.setHeader('set-cookie', clearCookies(req));
    return send(res, 200, { ok: true });
  }
  // Google and Apple go through Supabase and come back to /auth/callback.
  const provider = /^\/auth\/(google|apple)$/.exec(path);
  if (provider && req.method === 'GET') {
    const on = await auth.providers().catch(() => ({}));
    if (!on[provider[1]]) return go(res, '/sign-in?off=' + provider[1]);
    const p = pkce(req);
    res.setHeader('set-cookie', p.set);
    return go(res, auth.startUrl(provider[1], originOf(req) + '/auth/callback', p.challenge));
  }
  if (path === '/auth/callback' && req.method === 'GET') {
    const code = new URL(req.url, 'http://x').searchParams.get('code'), v = verifier(req);
    if (!code || !v) return go(res, '/sign-in?failed=1');
    try {
      const s = await auth.exchange(code, v);
      res.setHeader('set-cookie', [...sessionCookies(req, s), clearPkce(req)]);
      return go(res, '/');
    } catch { res.setHeader('set-cookie', clearPkce(req)); return go(res, '/sign-in?failed=1'); }
  }
  return null;
}

// Online, pictures and sound load straight from the person's own storage folder through a short-lived link.
async function media(req, res, name, uid) {
  if (!/^[\w-]+\.\w+$/.test(name)) return send(res, 404, 'Not found', 'text/plain');
  if (cloud() && !uid) return send(res, 401, 'Sign in', 'text/plain');
  const link = await mediaLink(name, uid);
  if (link) { res.writeHead(302, { location: link, 'cache-control': 'private, max-age=600' }); return res.end(); }
  return files(req, res, name, MEDIA);
}

async function files(req, res, path, root) {
  let file = join(root, path);
  if (!inside(root, file)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    if (extname(path) || root !== ROOT) return send(res, 404, 'Not found', 'text/plain');
    file = join(ROOT, 'index.html');
  }
  try { send(res, 200, await readFile(file), TYPES[extname(file)] || 'application/octet-stream'); }
  catch { send(res, 404, 'Not found', 'text/plain'); }
}

// Runs a request against one library, again from the newer copy if another request saved first (after a short,
// growing wait, so a burst of changes from the same person all get their turn).
async function run(res, uid, work, opts) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, Math.random() * 40 * attempt));
    const out = held();
    if (await withLibrary(uid, () => work(out), opts)) return out.sendTo(res);
  }
  return send(res, 409, { error: 'Your cards changed somewhere else at the same moment. Try again.' });
}

export async function handle(req, res) {
  let path;
  try { path = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { return send(res, 400, 'Bad request', 'text/plain'); }
  try {
    const isApi = path.startsWith('/api/'), isMcp = path === '/mcp' || path.startsWith('/mcp/'), isAuth = path.startsWith('/api/auth/') || path.startsWith('/auth/');
    if ((isApi || isMcp) && !sameSite(req)) return send(res, 403, { error: 'Forbidden' });
    // On Vercel, saving needs the Supabase database; until it's linked, say so instead of losing changes.
    if (process.env.VERCEL && !cloud() && (isApi || isMcp || isAuth)) return send(res, 503, { error: 'Lucida isn’t connected to its database yet, so nothing can be saved.' });

    if (isAuth) {
      if (!cloud()) return send(res, 404, { error: 'Nobody signs in to Lucida on this computer.' });
      const done = await signIn(req, res, path);
      return done === null ? send(res, 404, { error: 'Not found' }) : done;
    }

    // AI apps: on this computer at /mcp; online at the person's own link, /mcp/lk_…, which opens only their library.
    if (isMcp) {
      const body = req.method === 'POST' ? String(await readBody(req, 5e6)) : '';
      if (!cloud()) return run(res, null, out => mcp(req, out, body, null));
      const key = path.slice(5), uid = linkOwner(key);
      const denied = () => send(res, 401, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'This Lucida link doesn’t work anymore. Copy the link again from the Connect AI page.' } });
      if (!uid) return denied();
      try {
        return await run(res, uid, async out => {
          if (!sameLink(state().ai.key, key)) { out.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'This Lucida link doesn’t work anymore. Copy the link again from the Connect AI page.' } })); return; }
          await mcp(req, out, body, uid);
        }, { existing: true });
      } catch (e) { if (e.status === 401) return denied(); throw e; }
    }

    if (isApi || path.startsWith('/media/')) {
      let uid = null, me = null;
      if (cloud()) {
        const w = await who(req);
        if (w.set.length) res.setHeader('set-cookie', w.set);
        if (!w.user) return send(res, 401, { error: 'Sign in to Lucida.', signIn: true });
        uid = w.user.id; me = { email: w.user.email, provider: w.user.provider, name: w.user.name };
      }
      if (path.startsWith('/media/')) return await media(req, res, path.slice(7), uid);
      if (path === '/api/rev' && req.method === 'GET') return send(res, 200, { rev: await revOf(uid) });
      const body = req.method === 'POST' ? await readBody(req, path === '/api/media' ? 20e6 : 5e6) : null;
      return await run(res, uid, out => api(req, out, path, body, me));
    }
    return await files(req, res, path, ROOT);
  } catch (e) { send(res, /Too big/.test(e.message) ? 413 : 500, { error: /Too big/.test(e.message) ? 'That file is too big.' : 'Something went wrong. Try again.' }); console.error(e); }
}
