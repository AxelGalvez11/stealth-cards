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
const person = u => ({ id: u.id, email: u.email || '', provider: (u.app_metadata && u.app_metadata.provider) || 'email', name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '' });

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

// Google and Apple: Supabase sends the visitor back to /auth/callback with a code, which only this browser can
// exchange, because the secret half (the verifier) waits in a cookie for up to ten minutes.
export function pkce(req) {
  const verifier = randomBytes(32).toString('base64url');
  return { challenge: createHash('sha256').update(verifier).digest('base64url'), set: cookie(req, PKCE, verifier, 600) };
}
export const verifier = req => cookies(req)[PKCE] || '';
export const clearPkce = req => cookie(req, PKCE, '', 0);

// Personal MCP links (/mcp/lk_…): the person's user id, then 32 random characters that only their library knows.
export const newLink = uid => 'lk_' + String(uid).replace(/-/g, '') + randomBytes(24).toString('base64url');
export const linkOwner = key => {
  const m = /^lk_([0-9a-f]{32})[A-Za-z0-9_-]{32}$/.exec(String(key));
  return m ? m[1].replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5') : null;
};
export const sameLink = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
