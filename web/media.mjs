// Pictures and sound that AI apps put on cards, saved next to the ones you add yourself (data/media, or Supabase online).
// A picture or sound can come from a link, from a file the learner uploaded in ChatGPT (it sends a download link),
// or from a file on this computer (only for AI apps running here, like Claude Code). Whatever the source, the file's
// first bytes must show a real picture or sound, so nothing else can end up on a card.
// Audio cards an AI makes get speech from voice.mjs; the same words in the same voice reuse one file.
import { readFile, stat } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { putMedia, readMedia, hasMedia, isPro } from './store.mjs';
import { speech, voiceId } from './voice.mjs';
import { sniff } from './sniff.js';
export { sniff };

export const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/wav': '.wav', 'audio/ogg': '.ogg', 'audio/webm': '.webm' };
const MAX = 20e6;
const TOO_BIG = 'That file is over 20 MB.';
export const HEIC = 'That picture is HEIC (an iPhone photo), which browsers can’t show. Send it as a JPEG or PNG.';

async function save(buf, want) {
  const type = sniff(buf);
  if (type === 'image/heic') throw new Error(HEIC);
  if (!type || !type.startsWith(want + '/')) throw new Error(want === 'image' ? 'That isn’t a picture Lucida can show (PNG, JPEG, GIF, or WebP).' : 'That isn’t a sound Lucida can play (MP3, M4A, WAV, OGG, or WebM).');
  const name = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + EXT[type];
  await putMedia(name, buf, type);
  return '/media/' + name;
}

// Links must lead to the open internet, never to this computer or its network. An address is judged the way the network
// would see it: an IPv4 address written inside an IPv6 one (::ffff:127.0.0.1, ::ffff:7f00:1) is the IPv4 address.
const v4 = s => { const p = String(s).split('.'); return p.length === 4 && p.every(x => /^\d{1,3}$/.test(x) && +x < 256) ? p.reduce((n, x) => n * 256 + +x, 0) : null; };
// An IPv6 address as eight numbers (a dotted IPv4 tail counts as two), or null when it isn't one.
function v6(text) {
  let s = String(text).replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (tail) { const n = v4(tail[1]); if (n == null) return null; s = s.slice(0, -tail[1].length) + Math.floor(n / 65536).toString(16) + ':' + (n % 65536).toString(16); }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const side = h => (h === '' ? [] : h.split(':'));
  const head = side(halves[0]), rest = halves.length === 2 ? side(halves[1]) : [];
  const gap = 8 - head.length - rest.length;
  if (halves.length === 1 ? gap !== 0 : gap < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? gap : 0).fill('0'), ...rest];
  return groups.every(g => /^[0-9a-f]{1,4}$/i.test(g)) ? groups.map(g => parseInt(g, 16)) : null;
}
const parseIp = ip => {
  const s = String(ip).trim().toLowerCase();
  if (isIP(s) === 4) return { n: v4(s) };
  const g = v6(s);
  if (!g) return null;
  return g.slice(0, 5).every(x => x === 0) && g[5] === 0xffff ? { n: g[6] * 65536 + g[7] } : { g };
};
// Every IPv4 block that isn't the open internet (IANA's special-purpose list): this network and computer, private
// networks, shared (carrier) space, link-local (which holds the cloud's own address for its secrets, 169.254.169.254),
// protocol, test and benchmark space, multicast, and the reserved rest (up to 255.255.255.255).
const V4_BLOCKS = [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]].map(([a, len]) => [Math.floor(v4(a) / 2 ** (32 - len)), 32 - len]);
// IPv6: only global unicast (2000::/3) is the open internet. That leaves out this computer (::1), the unspecified address,
// the IPv4 stand-ins (::/96, NAT64 64:ff9b::/96), private (fc00::/7), link-local (fe80::/10), multicast (ff00::/8) and
// the rest; and inside 2000::/3 the special blocks: 2001::/23 (Teredo, benchmarking, ORCHID), documentation
// (2001:db8::/32, 3fff::/20) and 6to4 (2002::/16).
const reservedV6 = g => (g[0] & 0xe000) !== 0x2000 || (g[0] === 0x2001 && (g[1] < 0x0200 || g[1] === 0x0db8)) || g[0] === 0x2002 || (g[0] === 0x3fff && g[1] < 0x1000);
export function reservedAddress(ip) {
  const a = parseIp(ip);
  if (!a) return true; // anything that isn't an address is refused
  return a.n != null ? V4_BLOCKS.some(([base, bits]) => Math.floor(a.n / 2 ** bits) === base) : reservedV6(a.g);
}
const loopback = ip => { const a = parseIp(ip); return !!a && (a.n != null ? Math.floor(a.n / 2 ** 24) === 127 : a.g.slice(0, 7).every(x => x === 0) && a.g[7] === 1); };
// One plain sentence for every way a link can fail (a refusal, a name that doesn't exist, a page that isn't there), so what
// comes back says nothing about what is on this network.
const gone = want => new Error('Lucida couldn’t get that ' + (want === 'audio' ? 'sound' : 'picture') + '.');
const within = (p, signal) => new Promise((ok, no) => { signal.aborted ? no(new Error('slow')) : signal.addEventListener('abort', () => no(new Error('slow')), { once: true }); p.then(ok, no); });
// The link's host is looked up once and every address it gives is checked. The connection is then made to those addresses
// only (the lookup handed to the request answers with them and asks nobody), so a name that answers something else the second
// time (DNS rebinding) changes nothing. LUCIDA_TEST_LOCAL_LINKS lets tests serve files from this computer (loopback only).
async function reach(url, stop) {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const found = isIP(host) ? [{ address: host, family: isIP(host) }] : await within(lookup(host, { all: true }), stop);
  const testing = process.env.LUCIDA_TEST_LOCAL_LINKS === '1';
  if (!found.length || found.some(a => reservedAddress(a.address) && !(testing && loopback(a.address)))) throw new Error('refused');
  return new Promise((ok, no) => {
    const req = (url.protocol === 'https:' ? https : http).request(url, {
      agent: false, signal: stop, headers: { 'user-agent': 'Lucida flashcards', accept: '*/*' },
      lookup: (name, o, cb) => {
        const fam = o && (o.family === 'IPv4' ? 4 : o.family === 'IPv6' ? 6 : +o.family || 0), from = fam ? found.filter(a => a.family === fam) : found;
        if (!from.length) return cb(Object.assign(new Error('no address'), { code: 'ENOTFOUND' }));
        return o && o.all ? cb(null, from.map(a => ({ address: a.address, family: a.family }))) : cb(null, from[0].address, from[0].family);
      }
    }, ok);
    req.on('error', no); req.end();
  });
}
async function fromLink(link, want) {
  let url;
  try { url = new URL(link); } catch { throw gone(want); }
  const stop = AbortSignal.timeout(20000), big = new Error(TOO_BIG);
  for (let hop = 0; hop < 4; hop++) {
    if (!/^https?:$/.test(url.protocol)) throw gone(want);
    let res;
    try { res = await reach(url, stop); } catch { throw gone(want); }
    const next = res.headers.location;
    if (res.statusCode >= 300 && res.statusCode < 400 && next) { res.resume(); try { url = new URL(next, url); } catch { throw gone(want); } continue; }
    if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); throw gone(want); }
    if (+res.headers['content-length'] > MAX) { res.destroy(); throw big; }
    const parts = []; let n = 0;
    try { for await (const chunk of res) { n += chunk.length; if (n > MAX) { res.destroy(); throw big; } parts.push(chunk); } }
    catch (e) { throw e === big ? e : gone(want); }
    return Buffer.concat(parts);
  }
  throw gone(want);
}

async function fromPath(p) {
  const file = resolve(p.replace(/^~(?=$|\/)/, homedir()));
  const s = await stat(file).catch(() => null);
  if (!s || !s.isFile()) throw new Error('There’s no file at ' + p + '.');
  if (s.size > MAX) throw new Error(TOO_BIG);
  return readFile(file);
}

// src is a link, "file:N" (the Nth file the learner uploaded, from `files`), "/media/…" (already in Lucida),
// or a full path on this computer. `local` says the AI app runs on this computer, so paths are allowed.
export async function fetchMedia(src, want, { files = [], local = false } = {}) {
  src = String(src || '').trim();
  let m;
  if ((m = src.match(/^file:(\d+)$/))) {
    const f = Array.isArray(files) ? files[+m[1]] : null;
    if (!f || !f.download_url) throw new Error('There’s no uploaded file number ' + m[1] + '.');
    return save(await fromLink(f.download_url, want), want);
  }
  if ((m = src.match(/^\/media\/([\w-]+\.\w+)$/))) {
    const buf = await readMedia(m[1]);
    if (!buf) throw new Error('There’s no saved file ' + src + '.');
    if (!(sniff(buf) || '').startsWith(want + '/')) throw new Error(src + ' isn’t ' + (want === 'image' ? 'a picture.' : 'a sound.'));
    return src;
  }
  if ((m = src.match(/^data:[\w/+.-]*;base64,(.+)$/s))) {
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > MAX) throw new Error(TOO_BIG);
    return save(buf, want);
  }
  if (/^https?:\/\//i.test(src)) return save(await fromLink(src, want), want);
  if (/^(file:\/\/|\/|~)/.test(src)) {
    if (!local) throw new Error('A file on a computer only works for AI apps running on the same computer as Lucida. Send a link or upload the file instead.');
    return save(await fromPath(src.startsWith('file://') ? fileURLToPath(src) : src), want);
  }
  throw new Error('Give a link (https://…), an uploaded file ("file:0"), or the full path of a file on this computer.');
}

// Speech for an audio card, or null when no voice key is set (then the app reads the words aloud itself).
export async function speechFile(text, lang) {
  text = String(text || '').trim().slice(0, 2500);
  if (!text || !voiceId()) return null;
  const name = 'v' + createHash('sha256').update(voiceId() + '\n' + (lang || '') + '\n' + text).digest('hex').slice(0, 20) + '.mp3';
  if (await hasMedia(name)) return '/media/' + name;
  const buf = await speech(text, lang);
  if (sniff(buf) !== 'audio/mpeg') throw new Error('The voice service didn’t send back audio.');
  await putMedia(name, buf, 'audio/mpeg');
  return '/media/' + name;
}
