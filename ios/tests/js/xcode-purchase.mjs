// A local server taking purchases from Xcode's StoreKit test store, and only when told to: node xcode-purchase.mjs [first port]
// The iPhone app's UI tests buy with StoreKit's test store (Lucida.storekit), which signs what it sells with one self-signed
// certificate of its own ("StoreKit Testing in Xcode", `environment: "Xcode"`), like the one captured from a real test run. Nothing
// Apple signed looks like that, so web/apple.mjs refuses it, unless the computer it runs on says LUCIDA_APPLE_TEST_XCODE=1, and
// never online. This builds a purchase shaped like Xcode's and checks, on the module and over HTTP against two local servers
// (one told to, one not), that it counts only where it should and that nothing else slips through the same door.
import { generateKeyPairSync, sign } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = fileURLToPath(new URL('../../../', import.meta.url)), PORT = +(process.argv[2] || 3905);
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { if (c) pass++; else fail++; console.log((c ? '  ok   ' : '  FAIL ') + name + (c || extra === '' ? '' : '  -> ' + String(typeof extra === 'string' ? extra : JSON.stringify(extra)).slice(0, 300))); };

// ---------- a little DER, enough for one self-signed certificate (the way Part 2's tests make their chains) ----------
const len = n => (n < 128 ? Buffer.from([n]) : n < 256 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 255]));
const tlv = (tag, ...parts) => { const body = Buffer.concat(parts); return Buffer.concat([Buffer.from([tag]), len(body.length), body]); };
const seq = (...p) => tlv(0x30, ...p), set = (...p) => tlv(0x31, ...p);
const int = n => { let h = n.toString(16); if (h.length % 2) h = '0' + h; let b = Buffer.from(h, 'hex'); if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]); return tlv(0x02, b); };
const oid = s => { const a = s.split('.').map(Number), out = [a[0] * 40 + a[1]]; for (const n of a.slice(2)) { const e = [n & 0x7f]; let v = Math.floor(n / 128); while (v) { e.unshift((v & 0x7f) | 0x80); v = Math.floor(v / 128); } out.push(...e); } return tlv(0x06, Buffer.from(out)); };
const utf8 = s => tlv(0x0c, Buffer.from(s)), bits = b => tlv(0x03, Buffer.concat([Buffer.from([0]), b])), octets = b => tlv(0x04, b), bool = v => tlv(0x01, Buffer.from([v ? 0xff : 0]));
const utc = d => tlv(0x17, Buffer.from(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'));
const name = cn => seq(set(seq(oid('2.5.4.3'), utf8(cn))));
const DAY = 86400000;
function selfSigned(cn, key, { from = new Date(Date.now() - 3600000), to = new Date(Date.now() + 365 * DAY) } = {}) {
  const exts = [seq(oid('2.5.29.19'), bool(true), octets(seq(bool(true), int(0))))];
  const tbs = seq(tlv(0xa0, int(2)), int(1), seq(oid('1.2.840.10045.4.3.2')), name(cn), seq(utc(from), utc(to)), name(cn), key.publicKey.export({ type: 'spki', format: 'der' }), tlv(0xa3, seq(...exts)));
  return seq(tbs, seq(oid('1.2.840.10045.4.3.2')), bits(sign('sha256', tbs, { key: key.privateKey, dsaEncoding: 'der' }))).toString('base64');
}
const b64 = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const ec = () => generateKeyPairSync('ec', { namedCurve: 'P-256' });
// A purchase as the test store signs it (the fields are the ones a real run sent).
const xcode = { key: ec(), cn: 'StoreKit Testing in Xcode' };
xcode.cert = selfSigned(xcode.cn, xcode.key);
const payload = (o = {}) => ({ appAccountToken: '00000000-0000-4000-8000-000000000000', appTransactionId: '0', bundleId: 'cards.lucida.app', currency: 'USD', environment: 'Xcode',
  expiresDate: Date.now() + 30 * DAY, inAppOwnershipType: 'PURCHASED', isUpgraded: false, originalPurchaseDate: Date.now(), originalTransactionId: '0', price: 5990,
  productId: 'cards.lucida.pro.monthly', purchaseDate: Date.now(), quantity: 1, signedDate: Date.now(), storefront: 'USA', storefrontId: '143441', subscriptionGroupIdentifier: '21000000',
  transactionId: '0', transactionReason: 'PURCHASE', type: 'Auto-Renewable Subscription', webOrderLineItemId: '0', ...o });
const jws = (p, { key = xcode.key, cert = xcode.cert, header = {} } = {}) => {
  const h = b64({ alg: 'ES256', kid: 'Apple_Xcode_Key', typ: 'JWT', x5c: [cert], ...header }), body = b64(p);
  return h + '.' + body + '.' + sign('sha256', Buffer.from(h + '.' + body), { key: key.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
};

// ---------- the module ----------
const apple = await import(pathToFileURL(REPO + 'web/apple.mjs').href);
const outcome = (j, o) => { try { const { payload: p } = apple.verifyJws(j); apple.checkTransaction(p, o); return 'accepted'; } catch (e) { return e.code || e.message; } };
const keep = { flag: process.env.LUCIDA_APPLE_TEST_XCODE, url: process.env.SUPABASE_URL, secret: process.env.SUPABASE_SECRET_KEY };
console.log('Without the flag');
delete process.env.LUCIDA_APPLE_TEST_XCODE;
ok(outcome(jws(payload())) === 'not_apple', 'a purchase from the test store is refused, like anything Apple didn’t sign', outcome(jws(payload())));
ok(apple.xcodeOn() === false, 'test mode is off');
console.log('With LUCIDA_APPLE_TEST_XCODE=1');
process.env.LUCIDA_APPLE_TEST_XCODE = '1';
ok(apple.xcodeOn() === true, 'test mode is on');
ok(outcome(jws(payload())) === 'accepted', 'a purchase from the test store counts');
ok(outcome(jws(payload({ productId: 'cards.lucida.pro.yearly' }))) === 'accepted', 'the yearly one too');
ok(outcome(jws(payload({ productId: 'cards.lucida.pro.weekly' }))) === 'wrong_product', 'another product doesn’t');
ok(outcome(jws(payload({ bundleId: 'com.example.app' }))) === 'wrong_app', 'another app doesn’t');
ok(outcome(jws(payload({ environment: 'Production' }))) === 'chain', 'the test store’s key can’t vouch for the real App Store (Production)', outcome(jws(payload({ environment: 'Production' }))));
ok(outcome(jws(payload({ environment: 'Sandbox' }))) === 'chain', 'nor the Sandbox');
const other = ec();
ok(outcome(jws(payload(), { key: other })) === 'signature', 'a signature that isn’t the certificate’s doesn’t count');
{ const [h, , s] = jws(payload()).split('.'); ok(outcome(h + '.' + b64(payload({ productId: 'cards.lucida.pro.yearly', price: 1 })) + '.' + s) === 'signature', 'neither does changing what was signed'); }
ok(outcome(jws(payload(), { key: other, cert: selfSigned('Somebody Else', other) })) === 'not_apple', 'a self-signed certificate with another name doesn’t count');
ok(outcome(jws(payload(), { key: other, cert: selfSigned('StoreKit Testing in Xcode', other, { from: new Date(Date.now() - 400 * DAY), to: new Date(Date.now() - 200 * DAY) }) })) === 'expired_certificate', 'a certificate that wasn’t valid when it signed doesn’t count');
ok(outcome(jws(payload({ signedDate: Date.now() + 3600000 }))) === 'from_the_future', 'a purchase signed in the future doesn’t count');
ok(outcome(jws(payload(), { header: { x5c: [xcode.cert, xcode.cert] } })) === 'chain', 'a chain of two doesn’t count (the test store sends one certificate)');
ok(outcome(jws(payload(), { header: { alg: 'none' } })) === 'algorithm', 'only ES256');
ok(outcome(jws(payload({ originalTransactionId: 'x' }))) === 'form', 'an id that isn’t a number is refused as before');
// The test store numbers its first purchase 0, which is a real id to the server.
ok(outcome(jws(payload({ transactionId: '0', originalTransactionId: '0' }))) === 'accepted', 'the id 0 is fine');
console.log('Online (a database is set)');
process.env.SUPABASE_URL = 'http://127.0.0.1:9'; process.env.SUPABASE_SECRET_KEY = 'secret';
ok(apple.xcodeOn() === false, 'test mode never turns on online, even when asked');
ok(outcome(jws(payload())) === 'not_apple', 'so a purchase from the test store is refused', outcome(jws(payload())));
if (keep.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = keep.url;
if (keep.secret === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = keep.secret;
if (keep.flag === undefined) delete process.env.LUCIDA_APPLE_TEST_XCODE; else process.env.LUCIDA_APPLE_TEST_XCODE = keep.flag;

// ---------- two servers over HTTP ----------
const folders = [], kids = [];
async function server(port, flag) {
  const data = mkdtempSync(join(tmpdir(), 'lucida-xcode-')); folders.push(data);
  const env = { ...process.env, STEALTH_DATA: data + '/', PORT: String(port) }; delete env.SUPABASE_URL; delete env.SUPABASE_SECRET_KEY; delete env.LUCIDA_APPLE_TEST_XCODE;
  if (flag) env.LUCIDA_APPLE_TEST_XCODE = '1';
  const kid = spawn('node', ['web/server.mjs'], { cwd: REPO, env, stdio: 'ignore' }); kids.push(kid);
  for (let i = 0; i < 60; i++) { try { await fetch('http://127.0.0.1:' + port + '/api/rev'); return 'http://127.0.0.1:' + port; } catch { await new Promise(r => setTimeout(r, 150)); } }
  throw new Error('no server on ' + port);
}
const as = (base, who) => async (url, o = {}) => { const r = await fetch(base + url, { ...o, headers: { cookie: 'lc_dev=' + who, 'content-type': 'application/json', ...(o.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
try {
  const on = await server(PORT, true), off = await server(PORT + 1, false);
  console.log('A server told to take them (the iPhone’s purchase, as the app sends it)');
  const ann = as(on, 'freeann'), me = (await ann('/api/state')).body.me;
  ok(me.plan.pro === false && /^[0-9a-f-]{36}$/.test(me.appAccountToken), 'a Free person has a token to buy with', me);
  const mine = jws(payload({ appAccountToken: me.appAccountToken }));
  let r = await ann('/api/iap', { method: 'POST', body: JSON.stringify({ signedTransaction: mine }) });
  ok(r.status === 200 && r.body.ok && r.body.plan.pro && r.body.plan.by === 'apple' && r.body.plan.every === 'month', 'POST /api/iap turns Pro on, billed by Apple', r);
  ok((await ann('/api/state')).body.me.plan.by === 'apple', 'and the library says so');
  const bob = as(on, 'freebob'), meB = (await bob('/api/state')).body.me;
  r = await bob('/api/iap', { method: 'POST', body: JSON.stringify({ signedTransaction: mine }) });
  ok(r.status === 403 && r.body.code === 'other_account', 'another person can’t take that purchase', r);
  ok((await bob('/api/state')).body.me.plan.pro === false, 'and stays Free');
  r = await bob('/api/iap', { method: 'POST', body: JSON.stringify({ signedTransaction: jws(payload({ appAccountToken: meB.appAccountToken, originalTransactionId: '1', transactionId: '1', productId: 'cards.lucida.pro.yearly', expiresDate: Date.now() + 365 * DAY })) }) });
  ok(r.status === 200 && r.body.plan.every === 'year', 'their own purchase, the next one the test store numbers, counts (yearly)', r);
  r = await ann('/api/iap', { method: 'POST', body: JSON.stringify({ signedTransactions: [mine, mine] }) });
  ok(r.status === 200, 'Restore purchases (a list) is fine, even with the same one twice', r);
  console.log('A server that wasn’t told to');
  const cy = as(off, 'freecy'), meC = (await cy('/api/state')).body.me;
  r = await cy('/api/iap', { method: 'POST', body: JSON.stringify({ signedTransaction: jws(payload({ appAccountToken: meC.appAccountToken })) }) });
  ok(r.status === 400 && r.body.code === 'not_apple', 'refuses the same purchase', r);
  ok((await cy('/api/state')).body.me.plan.pro === false, 'and the person stays Free');
} finally {
  for (const k of kids) k.kill();
  for (const f of folders) rmSync(f, { recursive: true, force: true });
}
console.log(`\nXcode purchases: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
