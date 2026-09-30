// Every request to Lucida's server: the web app's data (/api), signing in (/api/auth, /auth), the MCP link for AI
// apps (/mcp), pictures and sound (/media), going Pro (/pro, and Stripe's webhook at /api/stripe), and the app's own files. The same code runs on your computer (server.mjs)
// and on Vercel (api/index.js), where the pages are static files and only /api, /auth, /mcp, and /media reach this.
// Online, everything but signing in needs a signed-in person, and each person only ever sees their own library.
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { state, apply, withLibrary, revOf, putMediaLater, mediaLink, MEDIA, aiLeft, useAi, refundAi, saveExplain, isPro } from './store.mjs';
import { aiReady, explain } from './ai.mjs';
import { FREE_EXPLAINS, PRO_EXPLAINS } from './plans.mjs';
import { mcp } from './mcp.mjs';
import * as oauth from './oauth.mjs';
import { EXT, HEIC, sniff } from './media.mjs';
import { cloud, auth } from './supa.mjs';
import { who, forget, accessToken, sessionCookies, clearCookies, pkce, verifier, clearPkce, linkOwner, sameLink,
  GOOGLE_ID, APPLE_ID, oauthStart, oauthNonce, oauthDone, googleUrl, appleUrl, appleName } from './auth.mjs';
import { planOf, checkoutUrl, portalUrl, signedBy, onEvent } from './billing.mjs';
import * as social from './social.mjs';
import * as classes from './classes.mjs';
import { cookies } from './auth.mjs';
import { isDev, afterSaving } from './store.mjs';
import { reserve, lookup, release, rtOf, listen, pass } from './rooms.mjs';

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
// What the app gets: the library, plus who is signed in (online), and whether Pro is on (so this computer can show the
// Free app too, with LUCIDA_PLAN=free; see store.mjs).
const view = me => ({ ...state(), me, aiOn: aiReady(), pro: isPro() });
// The study network's actions (see social.mjs), each run in the signed-in person's library.
const SOCIAL = {
  'profile.ensure': (uid, me) => social.ensureProfile(uid, me).then(p => ({ handle: p.handle })),
  'profile.update': (uid, me, a) => social.updateProfile(uid, me, a.patch || {}).then(p => ({ handle: p.handle })),
  'deck.share': (uid, me, a) => social.shareDeck(uid, me, a.deckId, a),
  'deck.study': (uid, me, a) => social.addShared(uid, me, a.id),
  'deck.copy': (uid, me, a) => social.addShared(uid, me, a.id, { copy: true, name: a.name, folder: a.folder, updates: a.updates !== false }),
  'deck.detach': (uid, me, a) => social.detach(uid, a.deckId),
  'deck.updates': (uid, me, a) => social.takeUpdates(a.deckId, a.picks || {}),
  'deck.copyUpdates': (uid, me, a) => social.setUpdates(uid, a.deckId, !!a.on),
  'deck.star': (uid, me, a) => social.star(uid, me, a.id, !!a.on),
  'deck.watch': (uid, me, a) => social.watch(uid, me, a.id, !!a.on),
  'deck.check': (uid, me, a) => social.check(uid, me, a.id),
  'user.follow': (uid, me, a) => social.follow(uid, me, a.handle, !!a.on),
  'suggestion.send': (uid, me, a) => social.suggest(uid, me, a.id, { message: a.message, changes: a.changes }),
  'suggestion.decide': (uid, me, a) => social.decide(uid, a.id, a.picks || {}),
  'version.restore': (uid, me, a) => social.restore(uid, a.id, a.version),
  'news.read': (uid, me, a) => social.markRead(uid, a.ids)
};
// Pages anyone can open, signed in or not: a shared deck, a profile, a deck's History, Discover, and search. Signed in,
// they also say what you've done with them (studying, saved, following).
async function publicApi(req, res, path, viewer) {
  const q = new URL(req.url, 'http://x').searchParams;
  const out = (data, none) => (data ? send(res, 200, data) : send(res, 404, { error: none }));
  if (path === '/api/public/deck') return out(await social.deckPage({ handle: q.get('h'), slug: q.get('s'), id: q.get('id') }, viewer), 'This deck isn’t shared.');
  if (path === '/api/public/profile') return out(await social.profilePage(q.get('h'), viewer), 'No one has that name.');
  if (path === '/api/public/history') return out(await social.historyPage(q.get('id'), viewer), 'This deck isn’t shared.');
  if (path === '/api/public/discover') return send(res, 200, await social.discover(viewer, { tag: q.get('tag') || '' }));
  if (path === '/api/public/search') return send(res, 200, await social.search(q.get('q') || '', viewer));
  // A class (classes.mjs): what an invite shows to anyone, and the whole class to the people in it.
  if (path === '/api/public/class') return out(await classes.page(q.get('code'), viewer), 'No class has that code.');
  return send(res, 404, { error: 'Not found' });
}
// A made-up person on this computer (the lc_dev cookie; /dev/as/<name> sets it), for trying the study network with
// several people at once. Never online, and only for this computer's own address.
const LOCAL_HOST = req => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(req.headers.host || ''));
const devOf = req => { const n = cookies(req).lc_dev; return !cloud() && LOCAL_HOST(req) && n && isDev('dev_' + n) ? 'dev_' + n : null; };
// Made-up people have Pro, except those whose name starts with "free" (for trying the Free plan).
const devMe = uid => ({ email: uid.slice(4) + '@dev.local', provider: 'dev', name: uid.slice(4, 5).toUpperCase() + uid.slice(5), picture: '', plan: { pro: !uid.startsWith('dev_free') }, manage: '', dev: true });
// A public page (a deck or a profile) is the app's own page, told what it's about, so search engines and link previews
// read the deck's name and cards even before the app draws them.
const escHtml = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function publicPage(req, res, path) {
  const m = await (path.startsWith('/class/') ? classes.metaFor(path) : social.metaFor(path)).catch(e => { console.error('meta', e); return null; });
  let html = await readFile(join(ROOT, 'app.html'), 'utf8').catch(() => null);
  if (!html) return send(res, 404, 'Not found', 'text/plain');
  if (m) {
    const origin = originOf(req), url = origin + (m.url || path);
    const head = `<title>${escHtml(m.title)}</title>\n<meta name="description" content="${escHtml(m.description)}">\n<link rel="canonical" href="${escHtml(url)}">\n<meta property="og:title" content="${escHtml(m.title)}">\n<meta property="og:description" content="${escHtml(m.description)}">\n<meta property="og:url" content="${escHtml(url)}">\n<meta property="og:type" content="website">${m.noindex || m.status === 404 ? '\n<meta name="robots" content="noindex">' : ''}`;
    // A function gives the text as it is: a deck named "$&" or "$'" must not be read as one of replace()'s own patterns.
    html = html.replace(/<title>[^<]*<\/title>/, () => head);
    // What the page is, in plain HTML, for anything that doesn't run the app (it's replaced as soon as the app starts).
    const list = m.cards ? '<ol>' + m.cards.map(c => '<li>' + escHtml(String(c.front || c.text || '').replace(/\[\[|\]\]/g, '')) + (c.back ? ' — ' + escHtml(c.back) : '') + '</li>').join('') + '</ol>'
      : m.decks ? '<ul>' + m.decks.map(d => '<li><a href="' + escHtml(d.url) + '">' + escHtml(d.name) + '</a> · ' + d.cards + ' cards</li>').join('') + '</ul>' : '';
    html = html.replace('<div id="app"', () => '<noscript><h1>' + escHtml(m.title) + '</h1><p>' + escHtml(m.description) + '</p>' + list + '</noscript><div id="app"');
  }
  res.writeHead(m && m.status === 404 ? 404 : 200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(html);
}

async function api(req, res, path, body, me, uid) {
  if (path === '/api/state' && req.method === 'GET') {
    // Decks you study from someone else take the owner's newest changes when the app opens (and comes back to the front).
    if (new URL(req.url, 'http://x').searchParams.get('sync') === '1') {
      await social.sync(uid).catch(e => console.error('sync', e));
      // Your classes and their assignments, and (if you share it) your progress on them (classes.mjs).
      await classes.sync(uid).catch(e => console.error('class sync', e));
    }
    return send(res, 200, view(me));
  }
  // The study network (social.mjs): sharing, studying and copying decks, suggestions, follows, saves, news. Changes to
  // your library come back with it, like /api/action.
  if (path === '/api/social' && req.method === 'POST') {
    const a = jsonOf(body), fn = SOCIAL[a.type] || classes.ACTIONS[a.type];
    if (!fn) return send(res, 400, { error: 'Unknown action ' + a.type });
    try { const result = await fn(uid, me, a); return send(res, 200, { result, state: view(me) }); }
    catch (e) { if (e.status >= 500 || !e.status && !/^[A-Z]/.test(e.message)) console.error(e); return send(res, e.status && e.status < 500 ? e.status : 400, { error: e.message }); }
  }
  if (path === '/api/social/activity' && req.method === 'GET') return send(res, 200, await social.activity(uid));
  if (path === '/api/social/mine' && req.method === 'GET') return send(res, 200, await social.mine(uid));
  if (path === '/api/social/stats' && req.method === 'GET') {
    try { return send(res, 200, await social.creatorStats(uid, new URL(req.url, 'http://x').searchParams.get('id') || '')); }
    catch (e) { return send(res, e.status || 400, { error: e.message }); }
  }
  if (path === '/api/social/unread' && req.method === 'GET') return send(res, 200, { unread: await social.unreadCount(uid).catch(() => 0) });
  // Classes (classes.mjs): yours, whether you're verified (or waiting), and the admin page (only for admins).
  if (path === '/api/classes' && req.method === 'GET') return send(res, 200, await classes.mine(uid));
  if (path === '/api/verify' && req.method === 'GET') return send(res, 200, await classes.verifyStatus(uid));
  if (path === '/api/admin' && req.method === 'GET') {
    try { return send(res, 200, await classes.adminPage(uid, me)); } catch (e) { return send(res, e.status || 400, { error: e.message }); }
  }
  if (path === '/api/social/suggestions' && req.method === 'GET') {
    const q = new URL(req.url, 'http://x').searchParams;
    try { return send(res, 200, await social.suggestionsFor(uid, { sharedId: q.get('id') || '', mine: q.get('mine') === '1', all: q.get('all') === '1' })); }
    catch (e) { return send(res, e.status || 400, { error: e.message }); }
  }
  if (path === '/api/action' && req.method === 'POST') {
    try {
      const a = JSON.parse(body), result = apply(a);
      // Delete my data takes you off the study network too: profile, follows, saves, News, suggestions, classes, shared decks.
      if (a && a.type === 'data.reset') afterSaving(() => social.forget(uid));
      return send(res, 200, { result, state: view(me) });
    }
    catch (e) { return send(res, 400, { error: e.message }); }
  }
  if (path === '/api/media' && req.method === 'POST') {
    const type = String(req.headers['content-type'] || '').split(';')[0], ext = EXT[type], real = sniff(body);
    if (!ext) return send(res, 415, { error: 'Only images and audio' });
    // The file must really be what it's labeled (its first bytes say), so nothing else is ever saved as a picture or sound.
    if (real !== type && !(type === 'audio/x-m4a' && real === 'audio/mp4')) return send(res, 415, { error: real === 'image/heic' ? HEIC : 'That file isn’t a picture or sound Lucida can use.' });
    // Named after what's in it, so uploading the same file again is the same file, not another.
    const name = 'm' + createHash('sha256').update(body).digest('hex').slice(0, 24) + ext;
    // An account has room for so many pictures and sounds (store.mjs); past it, the answer says so.
    try { putMediaLater(name, body, type); } catch (e) { if (e.full) return send(res, 403, { error: e.message }); throw e; }
    return send(res, 200, { url: '/media/' + name });
  }
  return send(res, 404, { error: 'Not found' });
}

// Guessing passwords is slowed, best effort (in this server's memory; the real limit belongs in Vercel's firewall): six wrong tries for
// one email from one address in ten minutes, and a ceiling on all tries from one address. Supabase sees this server's address, not the
// person's, so its own limit would otherwise be shared by everyone.
const tries = new Map();
const recent = (key, ms) => {
  const now = Date.now(), list = (tries.get(key) || []).filter(t => now - t < ms);
  tries.set(key, list);
  if (tries.size > 5000) for (const [k, v] of tries) if (!v.length || now - v[v.length - 1] > ms) tries.delete(k);
  return list;
};
const ipOf = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
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
  // A password, for people who set one (Settings → Account → Password). Directory reviewers can't get an email code, so this is how
  // they sign in. The same plain answer whether the email is unknown or the password is wrong.
  if (path === '/api/auth/password' && req.method === 'POST') {
    const b = jsonOf(await readBody(req, 1e4)), email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 200) return send(res, 400, { error: 'Type your email and password.' });
    const ip = ipOf(req), WINDOW = 10 * 60000, mine = 'pw:' + ip + '|' + email;
    if (recent('pw-ip:' + ip, WINDOW).length >= 120 || recent(mine, WINDOW).length >= 6) return send(res, 429, { error: 'Too many tries for now. Wait a few minutes, then try again.' });
    recent('pw-ip:' + ip, WINDOW).push(Date.now());
    try { const s = await auth.password(email, password); tries.delete(mine); res.setHeader('set-cookie', sessionCookies(req, s)); return send(res, 200, { ok: true }); }
    catch (e) { if (e.status >= 400 && e.status < 500) recent(mine, WINDOW).push(Date.now()); return send(res, e.status === 429 ? 429 : 400, { error: e.status === 429 ? 'Too many tries for now. Wait a minute, then try again.' : e.status >= 500 || !e.status ? TRY_AGAIN : 'That email and password don’t match.' }); }
  }
  if (path === '/api/auth/password/set' && req.method === 'POST') {
    const w = await who(req);
    if (w.set.length) res.setHeader('set-cookie', w.set);
    if (!w.user) return send(res, 401, { error: 'Sign in to Lucida.', signIn: true });
    const password = String(jsonOf(await readBody(req, 1e4)).password || '');
    if (password.length < 8 || password.length > 72) return send(res, 400, { error: 'Use 8 to 72 characters.' });
    try { await auth.setPassword(w.token, password); return send(res, 200, { ok: true }); }
    catch (e) {
      const why = String(e.body || '');
      if (/reauth/i.test(why)) return send(res, 400, { error: 'For safety, sign out and sign in again, then set your password.' });
      if (/same_password|different from the old/i.test(why)) return send(res, 400, { error: 'That’s the password you have now. Pick a new one.' });
      if (/weak_password|too weak|should contain|Password should/i.test(why)) return send(res, 400, { error: 'That password is too easy to guess. Try a longer one.' });
      return send(res, e.status === 429 ? 429 : 400, { error: e.status === 429 ? 'Too many tries for now. Wait a minute, then try again.' : TRY_AGAIN });
    }
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
  return { email: user.email, emailConfirmed: user.emailConfirmed, provider: user.provider, name: user.name, picture: user.picture, plan, manage: plan.pro ? portalUrl(user.email) : '' };
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

// Live (rooms.mjs, web/live.js). Anyone with a game's code may look it up, since players join without an account; on
// this computer the relay's two routes are open too, like everything here. Opening and closing a room is the host's.
const LIVE = /^\/api\/live(?:\/(\d{6})(?:\/(events|send))?)?$/;
const livePublic = (req, m) => !!m && ((req.method === 'GET' && m[1] && !m[2]) || (!cloud() && m[2]));
async function liveApi(req, res, m, uid) {
  const [, code, sub] = m;
  // Online the messages go over Realtime; the relay is only for this computer.
  if (sub && cloud()) return send(res, 404, { error: 'Not found' });
  if (sub === 'events' && req.method === 'GET') {
    const q = new URL(req.url, 'http://x').searchParams, role = q.get('role'), key = String(q.get('key') || '');
    if (!['host', 'player'].includes(role) || !/^[\w-]{1,40}$/.test(key)) return send(res, 400, { error: 'Bad request' });
    return listen(req, res, code, role, key);
  }
  if (sub === 'send' && req.method === 'POST') {
    const b = jsonOf(await readBody(req, 64e3));
    if (!['host', 'player'].includes(b.role) || !/^[a-z]{1,20}$/.test(String(b.event || ''))) return send(res, 400, { error: 'Bad request' });
    pass(code, b.role, b.event, b.payload && typeof b.payload === 'object' ? b.payload : {});
    return send(res, 200, { ok: true });
  }
  if (code && !sub && req.method === 'GET') {
    const r = await lookup(code);
    return r ? send(res, 200, { deck: r.deck, rt: rtOf() }) : send(res, 404, { error: 'No game with that code' });
  }
  if (!code && req.method === 'POST') {
    const b = jsonOf(await readBody(req, 1e4));
    return send(res, 200, { code: await reserve(uid, b.deck, b.code), rt: rtOf() });
  }
  if (code && !sub && req.method === 'DELETE') { await release(uid, code); return send(res, 200, { ok: true }); }
  return send(res, 404, { error: 'Not found' });
}

// AI apps at /mcp. On this computer it is open (the one local library). Online it opens the signed-in person's own library, for
//   - the old way: the person's own secret link, /mcp/lk_… (every link that was ever given out keeps working), or
//   - a token from signing in to Lucida (oauth.mjs), sent as `Authorization: Bearer …` to /mcp.
// With neither, the answer is 401 pointing at how to sign in (never a 200), which is what starts the sign-in in Claude and ChatGPT.
async function mcpRoute(req, res, path) {
  const origin = oauth.canonical(req), from = oauth.mcpOrigin(req);
  // A web page may only ask from this site, an AI app's own site, or an app on this computer.
  if (!from.ok) return send(res, 403, { error: 'Forbidden' });
  if (from.cors) for (const [k, v] of Object.entries(from.cors)) res.setHeader(k, v);
  if (req.method === 'OPTIONS') {
    res.writeHead(from.cors ? 204 : 404, { 'access-control-allow-methods': 'POST, GET, DELETE, OPTIONS', 'access-control-allow-headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version, accept, last-event-id', 'access-control-max-age': '600' });
    return res.end();
  }
  const key = path.slice(5), bearer = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || ''));
  const read = async () => (req.method === 'POST' ? String(await readBody(req, 5e6)) : '');
  const unauthorized = (error = '', description = '') => {
    res.writeHead(401, { 'content-type': 'application/json', 'cache-control': 'no-store', 'www-authenticate': oauth.challenge(origin, { error, description }) });
    res.end(JSON.stringify({ error: error || 'unauthorized', error_description: description || 'Sign in to Lucida to use this.' }));
  };
  // This computer doesn't ask apps to sign in (Claude Code just connects), unless LUCIDA_MCP_LOGIN=1 asks for what happens online.
  const asks = cloud() || process.env.LUCIDA_MCP_LOGIN === '1';
  if (!asks && !bearer) { const body = await read(); return run(res, null, out => mcp(req, out, body, null)); }
  // The person's own link (the address itself says which library, so a token sent along with it isn't looked at). Free has a limit on
  // pictures and sound (store.mjs); a link only knows whose it is, so Pro is looked up by id.
  if (cloud() && key) {
    const uid = linkOwner(key);
    const denied = () => send(res, 401, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'This Lucida link doesn’t work anymore. Copy the link again from the Connect AI page.' } });
    if (!uid) return denied();
    const { pro } = await planOf(uid, ''), body = await read();
    try {
      return await run(res, uid, async out => {
        if (!sameLink(state().ai.key, key)) { out.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'This Lucida link doesn’t work anymore. Copy the link again from the Connect AI page.' } })); return; }
        await mcp(req, out, body, uid);
      }, { existing: true, pro });
    } catch (e) { if (e.status === 401) return denied(); throw e; }
  }
  if (!bearer) return unauthorized();
  const t = await oauth.verify(bearer[1], origin), ended = 'That sign-in has ended. Connect the app to Lucida again.';
  if (!t) return unauthorized('invalid_token', ended);
  const lib = t.uid === 'local' ? null : t.uid, body = await read();
  // A made-up person on this computer has the plan their name says (names starting with free are on Free); online it's looked up by id.
  const pro = cloud() ? (await planOf(lib, '')).pro : isDev(lib) ? !lib.startsWith('dev_free') : undefined;
  try { return await run(res, lib, out => mcp(req, out, body, lib, { scopes: t.scopes, origin }), { existing: cloud(), pro }); }
  catch (e) { if (e.status === 401) return unauthorized('invalid_token', ended); throw e; }
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
    const isApi = path.startsWith('/api/'), isMcp = path === '/mcp' || path.startsWith('/mcp/'), isAuth = path.startsWith('/api/auth/') || path.startsWith('/auth/'), isOauth = path.startsWith('/oauth/') || path.startsWith('/.well-known/oauth-');
    // On Vercel, saving needs the Supabase database; until it's linked, say so instead of losing changes.
    if (process.env.VERCEL && !cloud() && (isApi || isMcp || isAuth || isOauth)) return send(res, 503, { error: 'Lucida isn’t connected to its database yet, so nothing can be saved.' });
    if (path === '/api/stripe' && req.method === 'POST') return await stripe(req, res);
    if (path === '/pro' && req.method === 'GET') return await upgrade(req, res);
    // Trying the study network on this computer as someone else: /dev/as/maria (and /dev/as/ to be yourself again).
    if (path.startsWith('/dev/as') && req.method === 'GET') {
      if (cloud() || !LOCAL_HOST(req)) return send(res, 404, 'Not found', 'text/plain');
      const n = path.slice(8).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
      res.writeHead(302, { location: '/', 'set-cookie': 'lc_dev=' + n + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (n ? 86400 * 30 : 0), 'cache-control': 'no-store' });
      return res.end();
    }
    if (req.method === 'GET' && (/^\/@[A-Za-z0-9_.]{3,30}(\/[A-Za-z0-9-]{1,60})?\/?$/.test(path) || /^\/d\/s[a-z0-9]{4,40}$/.test(path) || /^\/class\/[A-Za-z]{6}\/?$/.test(path))) return await publicPage(req, res, path);
    if (path === '/sitemap.xml' && req.method === 'GET') { res.writeHead(200, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }); return res.end(await social.sitemap(originOf(req))); }
    if (path.startsWith('/api/public/') && req.method === 'GET') {
      let viewer = devOf(req);
      if (cloud()) { const w = await who(req).catch(() => ({ user: null, set: [] })); if (w.set.length) res.setHeader('set-cookie', w.set); viewer = w.user ? w.user.id : null; }
      else if (!viewer) viewer = 'local';
      try { return await publicApi(req, res, path, viewer); } catch (e) { console.error(e); return send(res, 500, { error: 'Something went wrong. Try again.' }); }
    }
    // AI apps signing in (oauth.mjs): the discovery documents, registering, and the token calls answer to anyone; the page where the
    // person says Allow is the app's own (a board), which asks /api/oauth/request. Signed out, they sign in first and come back.
    if (isOauth) {
      if (path === '/oauth/authorize' && req.method === 'GET') {
        const p = await oauth.personOf(req);
        if (p.set.length) res.setHeader('set-cookie', p.set);
        if (!p.id) return go(res, '/sign-in?next=' + encodeURIComponent(req.url));
        res.setHeader('x-frame-options', 'DENY'); res.setHeader('content-security-policy', "frame-ancestors 'none'");
        return await files(req, res, path, ROOT);
      }
      if (await oauth.route(req, res, path, { readBody })) return;
      return send(res, 404, { error: 'Not found' });
    }
    if (isApi && !sameSite(req)) return send(res, 403, { error: 'Forbidden' });

    if (isAuth) {
      if (!cloud()) return send(res, 404, { error: 'Nobody signs in to Lucida on this computer.' });
      const done = await signIn(req, res, path);
      return done === null ? send(res, 404, { error: 'Not found' }) : done;
    }

    // AI apps (see mcpRoute).
    if (isMcp) return await mcpRoute(req, res, path);

    // Live's public routes, before the sign-in check (players have no account).
    const live = isApi && LIVE.exec(path);
    if (livePublic(req, live)) return await liveApi(req, res, live, null);

    if (isApi || path.startsWith('/media/')) {
      let uid = null, me = null, user = null;
      if (cloud()) {
        const w = await who(req);
        if (w.set.length) res.setHeader('set-cookie', w.set);
        if (!w.user) return send(res, 401, { error: 'Sign in to Lucida.', signIn: true });
        user = w.user; uid = user.id;
      } else if (devOf(req)) { uid = devOf(req); me = devMe(uid); }
      if (path.startsWith('/media/')) return await media(req, res, path.slice(7), uid);
      if (live) return await liveApi(req, res, live, uid);
      if (path === '/api/rev' && req.method === 'GET') return send(res, 200, { rev: await revOf(uid) });
      // The app's first load asks Stripe's news afresh, so Pro shows right after paying.
      if (user) me = await meOf(user, path === '/api/state');
      const body = req.method === 'POST' ? await readBody(req, path === '/api/media' ? 20e6 : 5e6) : null;
      if (path.startsWith('/api/oauth/')) return await oauth.api(req, res, path, body, { uid: uid || 'local', email: (me && me.email) || '' });
      if (path === '/api/explain' && req.method === 'POST') return await explainReq(res, uid, me, jsonOf(body));
      return await run(res, uid, out => api(req, out, path, body, me, uid), { pro: me ? me.plan.pro : undefined });
    }
    return await files(req, res, path, ROOT);
  } catch (e) { send(res, /Too big/.test(e.message) ? 413 : 500, { error: /Too big/.test(e.message) ? 'That file is too big.' : 'Something went wrong. Try again.' }); console.error(e); }
}
