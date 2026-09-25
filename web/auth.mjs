// Who is using Lucida online. Signing in (see handler.mjs) leaves two cookies the page's scripts can't read: a short-lived
// access token and a refresh token. Each request checks the access token with Supabase (remembered for a few minutes)
// and quietly swaps in a new one shortly before it runs out.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { auth } from './supa.mjs';

const AT = 'lc_at', RT = 'lc_rt', PKCE = 'lc_pkce', DAY = 86400;
const seen = new Map(); // access token → { user, until }

export const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => {
  const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
}));
// Secure cookies need https; on this computer the app runs on plain http://localhost.
const secure = req => (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https' || !!req.socket.encrypted;
const cookie = (req, name, value, maxAge) => name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (secure(req) ? '; Secure' : '');
export const sessionCookies = (req, s) => [cookie(req, AT, s.access_token, Math.max(60, +s.expires_in || 3600)), cookie(req, RT, s.refresh_token, 90 * DAY)];
export const clearCookies = req => [cookie(req, AT, '', 0), cookie(req, RT, '', 0)];

// The token's own expiry time (read, not trusted: Supabase still checks the token itself).
const expiry = token => { try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).exp * 1000; } catch { return 0; } };
// Google sends a link to the person's photo (Apple and email sign-ins have none). Only an https link is kept, asked for
// at 256 px so it stays sharp where the app shows it.
const pictureOf = m => { const p = String((m && (m.avatar_url || m.picture)) || ''); return /^https:\/\/\S{1,2000}$/.test(p) ? p.replace(/(googleusercontent\.com\/.+)=s\d+-c$/, '$1=s256-c') : ''; };
const person = u => ({ id: u.id, email: u.email || '', provider: (u.app_metadata && u.app_metadata.provider) || 'email', name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '',
  picture: pictureOf(u.user_metadata) });

async function check(token) {
  const hit = seen.get(token);
  if (hit && hit.until > Date.now()) return hit.user;
  const user = person(await auth.user(token));
  if (seen.size > 5000) seen.clear();
  seen.set(token, { user, until: Math.min(Date.now() + 5 * 60000, expiry(token)) });
  return user;
}

// The signed-in person for this request, or null, plus any cookies to send back (a refreshed or ended session).
export async function who(req) {
  const c = cookies(req);
  let token = c[AT], set = [];
  if (token && expiry(token) < Date.now() + 60000) token = '';
  if (!token && c[RT]) {
    try { const s = await auth.refresh(c[RT]); token = s.access_token; set = sessionCookies(req, s); }
    catch (e) { if (e.status >= 400 && e.status < 500) set = clearCookies(req); else throw e; }
  }
  if (!token) return { user: null, set };
  try { return { user: await check(token), set }; }
  catch (e) { if (e.status === 401 || e.status === 403) return { user: null, set: clearCookies(req) }; throw e; }
}
export const forget = token => seen.delete(token);
export const accessToken = req => cookies(req)[AT] || '';

// The email's link (when its template has one) comes back to /auth/callback with a code, which only this browser can
// exchange, because the secret half (the verifier) waits in a cookie for up to ten minutes.
export function pkce(req) {
  const verifier = randomBytes(32).toString('base64url');
  return { challenge: createHash('sha256').update(verifier).digest('base64url'), set: cookie(req, PKCE, verifier, 600) };
}
export const verifier = req => cookies(req)[PKCE] || '';
export const clearPkce = req => cookie(req, PKCE, '', 0);

// Google and Apple: the visitor signs in on Google's or Apple's own page, which sends them back here with an ID token
// (a signed note saying who they are), and Supabase checks it (handler.mjs). No secret is needed: these IDs are public.
// The iPhone app signs in with both by itself and sends its token the same way.
// Google Cloud project "Lucida" (lucida-509622) → Google Auth Platform → Clients → "Lucida web".
export const GOOGLE_ID = process.env.LUCIDA_GOOGLE_ID || '274372639474-g5n55o83ad2p60sghkd00d95g6vk4scm.apps.googleusercontent.com';
// Apple Developer (team 27AW3HBC3Z) → Identifiers → Services IDs → "Lucida" (for app.lucida.cards).
export const APPLE_ID = process.env.LUCIDA_APPLE_ID || 'cards.lucida.web';
// A random state and nonce wait in a cookie for ten minutes, so only the browser that started can finish. Google and
// Apple put the nonce's hash in the token, and Supabase checks that it matches. Apple posts its answer from its own
// site, so its cookie has to allow that (SameSite=None, which needs https).
const OA = 'lc_oa';
const oaCookie = (req, value, maxAge) => OA + '=' + value + '; Path=/; HttpOnly; Max-Age=' + maxAge + (secure(req) ? '; SameSite=None; Secure' : '; SameSite=Lax');
export function oauthStart(req) {
  const state = randomBytes(18).toString('base64url'), nonce = randomBytes(18).toString('base64url');
  return { state, hashed: createHash('sha256').update(nonce).digest('hex'), set: oaCookie(req, state + '.' + nonce, 600) };
}
// The nonce, if `state` is the one this browser started with.
export const oauthNonce = (req, state) => { const [s, n] = String(cookies(req)[OA] || '').split('.'); return s && n && state && sameLink(s, state) ? n : ''; };
export const oauthDone = req => oaCookie(req, '', 0);
export const googleUrl = (origin, o) => 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: GOOGLE_ID, redirect_uri: origin + '/auth/google/back', response_type: 'id_token',
  scope: 'openid email profile', nonce: o.hashed, state: o.state, prompt: 'select_account' });
export const appleUrl = (origin, o) => 'https://appleid.apple.com/auth/authorize?' + new URLSearchParams({ client_id: APPLE_ID, redirect_uri: origin + '/auth/apple/back', response_type: 'code id_token',
  scope: 'name email', response_mode: 'form_post', nonce: o.hashed, state: o.state });
// Apple's first sign-in says the person's name: {"name":{"firstName":"Ada","lastName":"Lovelace"}}.
export const appleName = user => { try { const n = JSON.parse(user || '{}').name || {}; return [n.firstName, n.lastName].filter(Boolean).join(' ').trim().slice(0, 80); } catch { return ''; } };

// Personal MCP links (/mcp/lk_…): the person's user id, then 32 random characters that only their library knows.
export const newLink = uid => 'lk_' + String(uid).replace(/-/g, '') + randomBytes(24).toString('base64url');
export const linkOwner = key => {
  const m = /^lk_([0-9a-f]{32})[A-Za-z0-9_-]{32}$/.exec(String(key));
  return m ? m[1].replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5') : null;
};
export const sameLink = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
