// Every request to Lucida's server: the web app's data (/api), signing in (/api/auth, /auth), the MCP link for AI
// apps (/mcp), pictures and sound (/media), going Pro (/pro, and Stripe's webhook at /api/stripe), and the app's own files. The same code runs on your computer (server.mjs)
// and on Vercel (api/index.js), where the pages are static files and only /api, /auth, /mcp, and /media reach this.
// Online, everything but signing in needs a signed-in person, and each person only ever sees their own library.
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { state, apply, withLibrary, revOf, putMedia, mediaLink, MEDIA, aiLeft, useAi, refundAi, saveExplain } from './store.mjs';
import { aiReady, explain } from './ai.mjs';
import { FREE_EXPLAINS, PRO_EXPLAINS } from './plans.mjs';
import { mcp } from './mcp.mjs';
import { EXT, HEIC, sniff } from './media.mjs';
import { cloud, auth } from './supa.mjs';
import { who, forget, accessToken, sessionCookies, clearCookies, pkce, verifier, clearPkce, linkOwner, sameLink,
  GOOGLE_ID, APPLE_ID, oauthStart, oauthNonce, oauthDone, googleUrl, appleUrl, appleName } from './auth.mjs';
import { planOf, checkoutUrl, portalUrl, signedBy, onEvent } from './billing.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webm': 'audio/webm' };

const inside = (root, file) => file === root || file.startsWith(root.endsWith(sep) ? root : root + sep);
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const go = (res, to, code = 302) => { res.writeHead(code, { location: to, 'cache-control': 'no-store' }); res.end(); };
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
const view = me => ({ ...state(), me, aiOn: aiReady() });

async function api(req, res, path, body, me) {
  if (path === '/api/state' && req.method === 'GET') return send(res, 200, view(me));
  if (path === '/api/action' && req.method === 'POST') {
    try { const result = apply(JSON.parse(body)); return send(res, 200, { result, state: view(me) }); }
    catch (e) { return send(res, 400, { error: e.message }); }
  }
  if (path === '/api/media' && req.method === 'POST') {
    const type = String(req.headers['content-type'] || '').split(';')[0], ext = EXT[type], real = sniff(body);
    if (!ext) return send(res, 415, { error: 'Only images and audio' });
    // The file must really be what it's labeled (its first bytes say), so nothing else is ever saved as a picture or sound.
    if (real !== type && !(type === 'audio/x-m4a' && real === 'audio/mp4')) return send(res, 415, { error: real === 'image/heic' ? HEIC : 'That file isn’t a picture or sound Lucida can use.' });
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
    catch (e) {
      // Until Lucida has its own email service, Supabase only mails the project's team, and says so.
      if (/email_address_not_authorized|signup_disabled/.test(e.body || '')) return send(res, 403, { error: 'Sign-ups aren’t open yet. Check back soon.' });
      return send(res, e.status === 429 ? 429 : 400, { error: e.status === 429 ? 'Too many codes for now. Wait a minute, then try again.' : TRY_AGAIN });
    }
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
  // Google and Apple: off to their own sign-in page (auth.mjs), unless they aren't set up yet.
  const provider = /^\/auth\/(google|apple)$/.exec(path);
  if (provider && req.method === 'GET') {
    const p = provider[1], on = await auth.providers().catch(() => ({}));
    if (!(p === 'google' ? GOOGLE_ID : APPLE_ID) || !on[p]) return go(res, '/sign-in?off=' + p);
    const o = oauthStart(req);
    res.setHeader('set-cookie', o.set);
    return go(res, (p === 'google' ? googleUrl : appleUrl)(originOf(req), o));
  }
  // Google comes back to this page. Its token is after the # in the address, so only the page's script sees it (never a
  // server log), and the script hands it to /api/auth/token.
  if (path === '/auth/google/back' && req.method === 'GET') return send(res, 200, GOOGLE_BACK, 'text/html; charset=utf-8');
  // Apple posts its answer here from its own site.
  if (path === '/auth/apple/back' && req.method === 'POST') {
    const f = new URLSearchParams(String(await readBody(req, 1e5))), nonce = oauthNonce(req, f.get('state'));
    if (!nonce || !f.get('id_token')) { res.setHeader('set-cookie', oauthDone(req)); return go(res, f.get('error') === 'user_cancelled_authorize' ? '/sign-in' : '/sign-in?failed=1', 303); }
    try {
      const s = await auth.idToken('apple', f.get('id_token'), nonce), name = appleName(f.get('user'));
      if (name) await auth.setName(s.access_token, name).catch(() => {});
      res.setHeader('set-cookie', [...sessionCookies(req, s), oauthDone(req)]);
      return go(res, '/', 303);
    } catch { res.setHeader('set-cookie', oauthDone(req)); return go(res, '/sign-in?failed=1', 303); }
  }
  // An ID token from Google's page above (checked against this browser's state), or from the iPhone app, which signs in
  // with Apple and Google itself and sends the nonce it made.
  if (path === '/api/auth/token' && req.method === 'POST') {
    const b = jsonOf(await readBody(req, 3e4)), p = b.provider, nonce = b.state ? oauthNonce(req, String(b.state)) : String(b.nonce || '');
    if (!['google', 'apple'].includes(p) || typeof b.token !== 'string' || !nonce) return send(res, 400, { error: TRY_AGAIN });
    try {
      const s = await auth.idToken(p, b.token, nonce), name = String(b.name || '').trim().slice(0, 80);
      if (name) await auth.setName(s.access_token, name).catch(() => {});
      res.setHeader('set-cookie', [...sessionCookies(req, s), oauthDone(req)]);
      return send(res, 200, { ok: true });
    } catch { res.setHeader('set-cookie', oauthDone(req)); return send(res, 400, { error: TRY_AGAIN }); }
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

const GOOGLE_BACK = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Signing in · Lucida</title>
<body style="margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; font: 15px Geist, -apple-system, system-ui, sans-serif; color: #8A8F98; color-scheme: light dark;">Signing in…
<script>
const p = new URLSearchParams(location.hash.slice(1)), fail = () => location.replace(p.get('error') === 'access_denied' ? '/sign-in' : '/sign-in?failed=1');
history.replaceState(null, '', location.pathname);
if (!p.get('id_token')) fail();
else fetch('/api/auth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'google', token: p.get('id_token'), state: p.get('state') }) })
  .then(r => (r.ok ? location.replace('/') : fail()), fail);
</script></body></html>`;

// Going Pro: Stripe's checkout, told who is paying. Signed out, sign in first and come back; already Pro, see Settings.
// On this computer nobody signs in and everything is on, so there's nothing to buy.
async function upgrade(req, res) {
  const every = new URL(req.url, 'http://x').searchParams.get('plan') === 'monthly' ? 'month' : 'year';
  if (!cloud()) return go(res, '/settings');
  const w = await who(req);
  if (w.set.length) res.setHeader('set-cookie', w.set);
  if (!w.user) return go(res, '/sign-in?next=' + encodeURIComponent('/pro?plan=' + (every === 'month' ? 'monthly' : 'yearly')));
  if ((await planOf(w.user.id, w.user.email, true)).pro) return go(res, '/settings');
  return go(res, checkoutUrl(every, w.user));
}
// Stripe's webhook (billing.mjs): signed by Stripe with the endpoint's secret, not by a signed-in person. An error
// answers 500, so Stripe sends the event again later.
async function stripe(req, res) {
  const raw = await readBody(req, 1e6);
  if (!signedBy(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) return send(res, 400, { error: 'Bad signature' });
  let e; try { e = JSON.parse(String(raw)); } catch { return send(res, 400, { error: 'Bad event' }); }
  await onEvent(e);
  return send(res, 200, { received: true });
}
// Who's signed in, for the app: their plan, and Stripe's page for changing or cancelling it.
const meOf = async (user, fresh) => {
  const plan = await planOf(user.id, user.email, fresh);
  return { email: user.email, provider: user.provider, name: user.name, plan, manage: plan.pro ? portalUrl(user.email) : '' };
};

// Online, pictures and sound load straight from the person's own storage folder through a short-lived link.
async function media(req, res, name, uid) {
  if (!/^[\w-]+\.\w+$/.test(name)) return send(res, 404, 'Not found', 'text/plain');
  if (cloud() && !uid) return send(res, 401, 'Sign in', 'text/plain');
  const link = await mediaLink(name, uid);
  if (link) { res.writeHead(302, { location: link, 'cache-control': 'private, max-age=600' }); return res.end(); }
  return files(req, res, name, MEDIA);
}

// The app's page is app.html, not index.html: on Vercel an index.html would answer lucida.cards before its landing page.
async function files(req, res, path, root) {
  let file = join(root, path);
  if (!inside(root, file)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'app.html');
  } catch {
    if (extname(path) || root !== ROOT) return send(res, 404, 'Not found', 'text/plain');
    // A page of the site (/privacy is privacy.html); anything else is a page of the app.
    file = await stat(file + '.html').then(() => file + '.html', () => join(ROOT, 'app.html'));
  }
  let body;
  try { body = await readFile(file); } catch { return send(res, 404, 'Not found', 'text/plain'); }
  const type = TYPES[extname(file)] || 'application/octet-stream', n = body.length;
  // A sound can be played from any point: the browser asks for the part it needs. Without this, it can't jump around
  // in a clip (a tap on a waveform would start it over).
  const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (r && (r[1] || r[2])) {
    const start = r[1] ? +r[1] : Math.max(0, n - +r[2]), end = r[1] && r[2] ? Math.min(+r[2], n - 1) : n - 1;
    if (start >= n || start > end) { res.writeHead(416, { 'content-range': 'bytes */' + n }); return res.end(); }
    res.writeHead(206, { 'content-type': type, 'content-range': 'bytes ' + start + '-' + end + '/' + n, 'content-length': end - start + 1, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
    return res.end(body.subarray(start, end + 1));
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
  res.end(body);
}

// Runs fn against one library and gives back what it returned, again from the newer copy if another request saved
// first (like run, below, for work that happens in steps).
async function inLibrary(uid, fn, opts) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, Math.random() * 40 * attempt));
    let result;
    if (await withLibrary(uid, async () => { result = await fn(); }, opts)) return result;
  }
  throw new Error('Your cards changed somewhere else at the same moment. Try again.');
}
// Explain a card with AI (ai.mjs). It's written once and saved on the card, so showing it again costs nothing. Free
// gets FREE_EXPLAINS a day, Pro PRO_EXPLAINS. The AI is asked between two saves, so it's never asked twice when
// another change lands at the same moment, and a failed answer gives the day's count back.
async function explainReq(res, uid, me, a) {
  if (!aiReady()) return send(res, 503, { error: 'AI explanations aren’t set up yet.' });
  const pro = !me || !!me.plan.pro, limit = pro ? PRO_EXPLAINS : FREE_EXPLAINS, day = new Date().toISOString().slice(0, 10), opts = { pro: me ? me.plan.pro : undefined };
  const first = await inLibrary(uid, () => {
    const c = state().cards.find(x => x.id === a.cardId);
    if (!c) return { code: 404, error: 'There’s no card like that.' };
    if (c.explain && c.explain.text) return { text: c.explain.text, left: aiLeft(day, limit) };
    if (!useAi(day, limit)) return { code: 402, pro: !pro, error: pro ? 'That’s a lot of explanations for one day. More tomorrow.' : 'That’s today’s ' + FREE_EXPLAINS + ' free explanations. Go Pro for as many as you like.' };
    return { card: JSON.parse(JSON.stringify(c)), deck: (state().decks.find(d => d.id === c.deckId) || {}).name || '' };
  }, opts);
  if (!first.card) return send(res, first.code || 200, first);
  let text;
  try { text = await explain(first.card, { deck: first.deck, question: String(a.question || '').slice(0, 500) }); }
  catch (e) { await inLibrary(uid, () => refundAi(day), opts); return send(res, 502, { error: e.message }); }
  const left = await inLibrary(uid, () => { saveExplain(first.card.id, text, 'Lucida'); return aiLeft(day, limit); }, opts);
  return send(res, 200, { text, left, free: !pro });
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
    // On Vercel, saving needs the Supabase database; until it's linked, say so instead of losing changes.
    if (process.env.VERCEL && !cloud() && (isApi || isMcp || isAuth)) return send(res, 503, { error: 'Lucida isn’t connected to its database yet, so nothing can be saved.' });
    if (path === '/api/stripe' && req.method === 'POST') return await stripe(req, res);
    if (path === '/pro' && req.method === 'GET') return await upgrade(req, res);
    if ((isApi || isMcp) && !sameSite(req)) return send(res, 403, { error: 'Forbidden' });

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
      // Free has a limit on pictures and sound (store.mjs); a link only knows whose it is, so Pro is looked up by id.
      const { pro } = await planOf(uid, '');
      try {
        return await run(res, uid, async out => {
          if (!sameLink(state().ai.key, key)) { out.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'This Lucida link doesn’t work anymore. Copy the link again from the Connect AI page.' } })); return; }
          await mcp(req, out, body, uid);
        }, { existing: true, pro });
      } catch (e) { if (e.status === 401) return denied(); throw e; }
    }

    if (isApi || path.startsWith('/media/')) {
      let uid = null, me = null, user = null;
      if (cloud()) {
        const w = await who(req);
        if (w.set.length) res.setHeader('set-cookie', w.set);
        if (!w.user) return send(res, 401, { error: 'Sign in to Lucida.', signIn: true });
        user = w.user; uid = user.id;
      }
      if (path.startsWith('/media/')) return await media(req, res, path.slice(7), uid);
      if (path === '/api/rev' && req.method === 'GET') return send(res, 200, { rev: await revOf(uid) });
      // The app's first load asks Stripe's news afresh, so Pro shows right after paying.
      if (user) me = await meOf(user, path === '/api/state');
      const body = req.method === 'POST' ? await readBody(req, path === '/api/media' ? 20e6 : 5e6) : null;
      if (path === '/api/explain' && req.method === 'POST') return await explainReq(res, uid, me, jsonOf(body));
      return await run(res, uid, out => api(req, out, path, body, me), { pro: me ? me.plan.pro : undefined });
    }
    return await files(req, res, path, ROOT);
  } catch (e) { send(res, /Too big/.test(e.message) ? 413 : 500, { error: /Too big/.test(e.message) ? 'That file is too big.' : 'Something went wrong. Try again.' }); console.error(e); }
}
