// Lucida Pro bought with Apple's in-app purchase (StoreKit 2 on the iPhone), checked here without any Apple secret.
// Two things arrive, both JWS (three base64url parts: a header, a payload, a signature):
//   * POST /api/iap: the iPhone app sends what the person just bought (or all they have, for Restore purchases), a signed
//     transaction, and the server turns it into Pro for that person, like Stripe's webhook does (billing.mjs);
//   * POST /api/apple: Apple's own server sends every renewal, expiry, refund, and revocation (App Store Server
//     Notifications V2), and the row follows.
// Nothing needs a secret because Apple signs them with a certificate chain that any server can check: the JWS header's x5c
// holds three certificates (Apple's signing certificate, Apple's Worldwide Developer Relations intermediate, and Apple Root
// CA - G3). The root is built in below (its fingerprint is checked when this file loads); the other two must lead up to it.
// The checks follow Apple's own reference verifier (github.com/apple/app-store-server-library-node, jws_verification.ts):
//   * exactly three certificates; the second is issued by the trusted root, the first by the second, the second is a CA;
//   * the first has Apple's receipt-signing marker (1.2.840.113635.100.6.11.1) and the second Apple's intermediate marker
//     (1.2.840.113635.100.6.2.1). Those markers matter: Apple issues other certificates under the same chain (to every app
//     developer), and only these two say "this certificate signs App Store receipts";
//   * every certificate was valid when Apple signed the data (its signedDate; a minute of slack);
//   * the signature (ES256) is the first certificate's;
//   * then the data itself: our bundle (cards.lucida.app), a Lucida Pro product, and the Production or Sandbox App Store
//     (Xcode's local testing isn't signed by Apple and is never accepted).
// Revocation (OCSP) isn't checked, which is what Apple's verifier does with its online checks off.
import { X509Certificate, createHash, verify as cryptoVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rest, val, cloud } from './supa.mjs';

export const BUNDLE_ID = 'cards.lucida.app';
// App Store Connect → Subscriptions: $5.99 a month and $49.99 a year, in one subscription group.
export const PRODUCTS = { 'cards.lucida.pro.monthly': 'month', 'cards.lucida.pro.yearly': 'year' };
// Where an Apple subscription is changed or cancelled (Settings' Manage plan opens it).
export const MANAGE = 'https://apps.apple.com/account/subscriptions';

// Apple Root CA - G3 (https://www.apple.com/certificateauthority/, AppleRootCA-G3.cer; also in macOS's own list of roots).
// Valid 2014-04-30 to 2039-04-30. Its SHA-256 fingerprint is pinned below, so a changed letter here stops the server.
const ROOT_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;
const ROOT_SHA256 = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';
export const APPLE_ROOT = new X509Certificate(ROOT_PEM);
if (APPLE_ROOT.fingerprint256.replace(/:/g, '').toLowerCase() !== ROOT_SHA256) throw new Error('web/apple.mjs: the built-in Apple Root CA - G3 isn’t Apple’s.');
const OID_SIGNING = '1.2.840.113635.100.6.11.1', OID_INTERMEDIATE = '1.2.840.113635.100.6.2.1';

// Something in what Apple (or someone pretending to be Apple) sent is wrong. `code` says what, for the app; `status` is the
// HTTP answer; the words are plain.
export class AppleError extends Error {
  constructor(code, message = 'That purchase couldn’t be checked.', status = 400) { super(message); this.code = code; this.status = status; }
}
const bad = (code, message, status) => new AppleError(code, message, status);

// ---------- the certificates ----------
// Node's X509Certificate doesn't list extensions by their OID, so this reads just enough DER to find them.
function der(buf, at, limit) {
  if (at + 2 > limit) throw new Error('short');
  const tag = buf[at]; let n = buf[at + 1], pos = at + 2;
  if (n & 0x80) { const k = n & 0x7f; if (!k || k > 3 || pos + k > limit) throw new Error('length'); n = 0; for (let i = 0; i < k; i++) n = n * 256 + buf[pos++]; }
  if (pos + n > limit) throw new Error('long');
  return { tag, start: pos, end: pos + n };
}
const oidText = b => { const out = [Math.floor(b[0] / 40), b[0] % 40]; let v = 0; for (const x of b.subarray(1)) { v = v * 128 + (x & 0x7f); if (!(x & 0x80)) { out.push(v); v = 0; } } return out.join('.'); };
export function extensionOids(raw) {
  const top = der(raw, 0, raw.length), tbs = der(raw, top.start, top.end), out = [];
  if (top.tag !== 0x30 || tbs.tag !== 0x30) throw new Error('not a certificate');
  for (let p = tbs.start; p < tbs.end;) {
    const e = der(raw, p, tbs.end);
    if (e.tag === 0xa3) {
      const list = der(raw, e.start, e.end);
      for (let q = list.start; q < list.end;) { const x = der(raw, q, list.end), id = der(raw, x.start, x.end); if (id.tag === 0x06) out.push(oidText(raw.subarray(id.start, id.end))); q = x.end; }
    }
    p = e.end;
  }
  return out;
}
// On this computer (never online) a test can add its own root: LUCIDA_APPLE_TEST_ROOT is a PEM file. Online only Apple's counts.
let extra = null;
const roots = () => {
  if (cloud() || !process.env.LUCIDA_APPLE_TEST_ROOT) return [APPLE_ROOT];
  if (!extra || extra.file !== process.env.LUCIDA_APPLE_TEST_ROOT) extra = { file: process.env.LUCIDA_APPLE_TEST_ROOT, cert: new X509Certificate(readFileSync(process.env.LUCIDA_APPLE_TEST_ROOT)) };
  return [APPLE_ROOT, extra.cert];
};
const SLACK = 60000;
const validAt = (c, at) => new Date(c.validFrom).getTime() - SLACK <= at && at <= new Date(c.validTo).getTime() + SLACK;
const signedBy = (c, issuer) => { try { return c.verify(issuer.publicKey) && c.issuer === issuer.subject; } catch { return false; } };
// The public key of the certificate that signed this JWS, once its chain leads up to a trusted root (or throws).
function trustedKey(header, trusted, at) {
  const x5c = header.x5c;
  if (!Array.isArray(x5c) || x5c.length !== 3 || !x5c.every(c => typeof c === 'string' && c.length < 6000)) throw bad('chain', 'That purchase couldn’t be checked.');
  let leaf, mid;
  try { [leaf, mid] = x5c.slice(0, 2).map(c => new X509Certificate(Buffer.from(c, 'base64'))); } catch { throw bad('chain'); }
  const root = trusted.find(r => signedBy(mid, r));
  if (!root || !signedBy(leaf, mid) || !mid.ca) throw bad('not_apple');
  let marks;
  try { marks = [extensionOids(leaf.raw), extensionOids(mid.raw)]; } catch { throw bad('chain'); }
  if (!marks[0].includes(OID_SIGNING) || !marks[1].includes(OID_INTERMEDIATE)) throw bad('not_apple');
  if (![leaf, mid, root].every(c => validAt(c, at))) throw bad('expired_certificate');
  return leaf.publicKey;
}

// ---------- a JWS ----------
const b64 = s => Buffer.from(s, 'base64url');
// Checks a JWS and gives back what it says. `roots` and `now` are for tests.
export function verifyJws(jws, { roots: trusted = roots(), now = Date.now() } = {}) {
  if (typeof jws !== 'string' || jws.length > 30000) throw bad('form');
  const parts = jws.split('.');
  if (parts.length !== 3 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) throw bad('form');
  let header, payload;
  try { header = JSON.parse(b64(parts[0]).toString()); payload = JSON.parse(b64(parts[1]).toString()); } catch { throw bad('form'); }
  if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object' || Array.isArray(header) || Array.isArray(payload)) throw bad('form');
  // Apple signs with ES256 and nothing else (so "none" and shared-secret algorithms are never accepted).
  if (header.alg !== 'ES256') throw bad('algorithm');
  // The certificates had to be valid when Apple signed it (what Apple's verifier does without its online checks).
  const at = Number.isFinite(+payload.signedDate) && +payload.signedDate > 0 ? +payload.signedDate : now;
  if (at > now + 5 * 60000) throw bad('from_the_future');
  const key = trustedKey(header, trusted, at);
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails.namedCurve !== 'prime256v1') throw bad('not_apple');
  let signed = false;
  try { signed = cryptoVerify('sha256', Buffer.from(parts[0] + '.' + parts[1]), { key, dsaEncoding: 'ieee-p1363' }, b64(parts[2])); } catch { /* not a signature */ }
  if (!signed) throw bad('signature');
  return { header, payload };
}

// Whether Sandbox purchases count. App Review and TestFlight buy in the Sandbox against the real server, so they do unless
// LUCIDA_APPLE_SANDBOX=0 says otherwise.
const sandboxOn = () => !/^(0|off|false|no)$/i.test(process.env.LUCIDA_APPLE_SANDBOX || '');
// A verified transaction (JWSTransactionDecodedPayload) that's ours: our app, a Lucida Pro subscription, and a real App Store.
export function checkTransaction(tx, { sandbox = sandboxOn() } = {}) {
  if (tx.bundleId !== BUNDLE_ID) throw bad('wrong_app');
  if (tx.environment !== 'Production' && !(tx.environment === 'Sandbox' && sandbox)) throw bad('wrong_environment');
  if (!Object.hasOwn(PRODUCTS, String(tx.productId)) || tx.type !== 'Auto-Renewable Subscription') throw bad('wrong_product');
  if (!/^\d{1,30}$/.test(String(tx.originalTransactionId || '')) || !/^\d{1,30}$/.test(String(tx.transactionId || '')) || !Number.isFinite(+tx.expiresDate) || +tx.expiresDate <= 0) throw bad('form');
  return tx;
}
const transactionOf = jws => checkTransaction(verifyJws(jws).payload);
// Renewal info (JWSRenewalInfoDecodedPayload) says whether it will renew, and until when a failed payment is still being retried.
const renewalOf = (jws, tx) => {
  const r = verifyJws(jws).payload;
  if (String(r.originalTransactionId) !== String(tx.originalTransactionId) || r.environment !== tx.environment) throw bad('form');
  return r;
};

// ---------- whose purchase ----------
// The appAccountToken the app buys with: the person's id, which is a UUID online. A made-up person on this computer has no
// UUID, so theirs comes from their name.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const tokenOf = uid => {
  if (UUID.test(String(uid))) return String(uid).toLowerCase();
  const h = createHash('sha256').update('lucida:' + uid).digest('hex');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-8' + h.slice(17, 20) + '-' + h.slice(20, 32);
};

// ---------- the rows (supabase/appstore.sql apple_purchases) ----------
const COLS = 'original_transaction_id,user_id,product_id,plan,status,period_end,ending,environment,transaction_id,signed_at,rev';
const iso = ms => new Date(ms).toISOString();
const ms = t => (t ? Date.parse(t) || 0 : 0);
const rowOf = async id => ((await rest('/apple_purchases?original_transaction_id=eq.' + val(id) + '&select=' + COLS)) || [])[0] || null;
// Writes one row: a new one (false if another request made it first), or a change to the row as it was read (false if
// another request changed it first), so the caller reads again and decides again.
async function save(next, was) {
  if (!was) {
    try { await rest('/apple_purchases', { method: 'POST', body: { ...next, rev: 1 } }); return true; }
    catch (e) { if (e.status === 409) return false; throw e; }
  }
  const { original_transaction_id, user_id, ...change } = next;
  const back = await rest('/apple_purchases?original_transaction_id=eq.' + val(original_transaction_id) + '&rev=eq.' + was.rev, { method: 'PATCH', prefer: 'return=representation', body: { ...change, rev: was.rev + 1, updated_at: iso(Date.now()) } });
  return Array.isArray(back) && back.length === 1;
}
async function update(id, decide) {
  for (let i = 0; i < 6; i++) {
    const was = await rowOf(id), next = decide(was);
    if (!next || await save(next, was)) return next;
  }
  throw new Error('Apple purchase ' + id + ' kept changing');
}

// What a transaction says about its subscription: the plan, the newest period, and how it was signed.
const factsOf = (tx, renewal) => ({ original_transaction_id: String(tx.originalTransactionId), product_id: tx.productId, plan: PRODUCTS[tx.productId], environment: tx.environment,
  transaction_id: String(tx.transactionId), period_end: iso(+tx.expiresDate), signed_at: iso(+tx.signedDate || Date.now()),
  // Whether it renews, when the renewal info says (autoRenewStatus: 1 on, 0 off).
  ...(renewal && renewal.autoRenewStatus != null ? { ending: +renewal.autoRenewStatus === 0 } : {}) });

// The app sends a transaction it holds for this person (POST /api/iap): the first one makes the row, a newer period
// extends it, and an older one changes nothing (only Apple's news can shorten or end a subscription, see onNotification). The
// purchase has to be this person's: its appAccountToken is their id. A purchase without a token (a redeemed offer code
// starts without one) goes to whoever sends it first, and is theirs from then on.
export async function record(uid, signedTransaction, signedRenewalInfo) {
  const tx = transactionOf(signedTransaction), renewal = signedRenewalInfo ? renewalOf(signedRenewalInfo, tx) : null;
  const token = String(tx.appAccountToken || '').toLowerCase();
  if (token && token !== tokenOf(uid)) throw bad('other_account', 'This purchase belongs to another Lucida account.', 403);
  const now = Date.now(), facts = factsOf(tx, renewal), revoked = !!tx.revocationDate;
  return update(facts.original_transaction_id, was => {
    if (was && was.user_id !== uid) throw bad('other_account', 'This purchase belongs to another Lucida account.', 403);
    if (!was) return { ...facts, user_id: uid, ending: facts.ending ?? false, status: revoked ? 'revoked' : +tx.expiresDate > now ? 'active' : 'expired' };
    // The same transaction again: what it adds is a refund (revocationDate) and, with renewal info, whether it renews.
    if (facts.transaction_id === was.transaction_id) {
      const status = revoked ? 'revoked' : was.status, ending = facts.ending ?? was.ending;
      return status === was.status && ending === was.ending ? null : { ...was, status, ending };
    }
    // A newer period (a renewal, or a new subscription after one ended or was refunded) extends it; an older one is ignored.
    if (ms(facts.period_end) <= ms(was.period_end)) return null;
    return { ...facts, user_id: uid, ending: facts.ending ?? was.ending, status: revoked ? 'revoked' : +tx.expiresDate > now ? 'active' : 'expired', signed_at: ms(facts.signed_at) > ms(was.signed_at) ? facts.signed_at : was.signed_at };
  });
}

// ---------- Apple's news (App Store Server Notifications V2) ----------
// What a notification makes of the subscription. Most carry the newest transaction, and the dates in it say whether the
// person has paid until later; some say more: an expiry or a refund ends it now, a grace period (payment failing, still
// retrying) keeps it on until the grace period ends, and a reversed refund gives it back.
const ENDS = new Set(['EXPIRED', 'GRACE_PERIOD_EXPIRED']), REVOKES = new Set(['REFUND', 'REVOKE']);
function judge(n, tx, renewal, now) {
  const type = String(n.notificationType || ''), sub = String(n.subtype || '');
  let until = +tx.expiresDate;
  // Payment failed and Apple is still trying: access goes on until the grace period ends.
  if (renewal && +renewal.gracePeriodExpiresDate > now && !ENDS.has(type)) until = Math.max(until, +renewal.gracePeriodExpiresDate);
  const revoked = type === 'REFUND_REVERSED' ? false : REVOKES.has(type) || !!tx.revocationDate;
  const status = revoked ? 'revoked' : ENDS.has(type) ? 'expired' : until > now ? 'active' : 'expired';
  let ending;
  if (sub === 'AUTO_RENEW_DISABLED') ending = true; else if (sub === 'AUTO_RENEW_ENABLED') ending = false;
  else if (renewal && renewal.autoRenewStatus != null) ending = +renewal.autoRenewStatus === 0;
  return { status, period_end: iso(until), ...(ending === undefined ? {} : { ending }) };
}
// A notification (its signedPayload), checked and applied. Gives back what happened; throws AppleError when it isn't Apple's
// or isn't for Lucida. News about a subscription no one has told us about yet (the app hasn't sent it) waits for the app's
// own transaction, which carries the same facts.
export async function onNotification(signedPayload) {
  const { payload: n } = verifyJws(signedPayload), d = n.data;
  const type = String(n.notificationType || ''), subtype = String(n.subtype || '');
  // Some notifications are about something else (a test, an extension summary, consent, external purchases): nothing to do.
  if (!d || typeof d !== 'object' || !d.signedTransactionInfo) return { type, subtype, applied: false, why: 'nothing about a purchase' };
  if (d.bundleId !== BUNDLE_ID) throw bad('wrong_app');
  if (d.environment === 'Production' && process.env.LUCIDA_APPLE_APP_ID && String(d.appAppleId) !== String(process.env.LUCIDA_APPLE_APP_ID)) throw bad('wrong_app');
  const tx = transactionOf(d.signedTransactionInfo), renewal = d.signedRenewalInfo ? renewalOf(d.signedRenewalInfo, tx) : null;
  const at = +n.signedDate > 0 ? +n.signedDate : Date.now(), now = Date.now();
  let uid = null, applied = false, why = '';
  const out = await update(String(tx.originalTransactionId), was => {
    if (!was) { why = 'no such purchase yet'; return null; }
    uid = was.user_id;
    // Older news than what's there (Apple can deliver out of order, and sends some twice) changes nothing.
    if (at < ms(was.signed_at)) { why = 'older than what’s there'; return null; }
    return { ...factsOf(tx, renewal), ...judge(n, tx, renewal, now), signed_at: iso(at), original_transaction_id: was.original_transaction_id, user_id: was.user_id };
  });
  applied = !!out;
  return { type, subtype, applied, why: applied ? '' : why, uid, status: out ? out.status : undefined };
}

// ---------- Pro ----------
// Someone's Apple subscriptions, and the plan they make: the one that lasts longest of those paid for and not refunded. The
// shape is the one billing.mjs gives for Stripe, plus `by`.
export const purchasesOf = async uid => (await rest('/apple_purchases?user_id=eq.' + val(uid) + '&select=original_transaction_id,plan,status,period_end,ending&limit=50')) || [];
export function activePlan(rows, now = Date.now()) {
  const on = rows.filter(r => r.status === 'active' && ms(r.period_end) > now).sort((a, b) => ms(b.period_end) - ms(a.period_end))[0];
  return on ? { pro: true, every: on.plan, until: iso(ms(on.period_end)), ending: !!on.ending, by: 'apple' } : null;
}
export const applePlan = async uid => activePlan(await purchasesOf(uid));
// Delete account: their purchases go (Apple keeps billing until they cancel in iPhone Settings → Subscriptions).
export const erase = uid => rest('/apple_purchases?user_id=eq.' + val(uid), { method: 'DELETE' });
