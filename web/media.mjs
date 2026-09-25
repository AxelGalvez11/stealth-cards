// Pictures and sound that AI apps put on cards, saved next to the ones you add yourself (data/media, or Supabase online).
// A picture or sound can come from a link, from a file the learner uploaded in ChatGPT (it sends a download link),
// or from a file on this computer (only for AI apps running here, like Claude Code). Whatever the source, the file's
// first bytes must show a real picture or sound, so nothing else can end up on a card.
// Audio cards an AI makes get speech from voice.mjs; the same words in the same voice reuse one file.
import { readFile, stat } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { putMedia, readMedia, hasMedia } from './store.mjs';
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

// Links must lead to the open internet, never to this computer or its network.
const privateIp = ip => {
  if (ip.toLowerCase().startsWith('::ffff:')) ip = ip.slice(7);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const x = ip.toLowerCase();
  return x === '::' || x === '::1' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80');
};
async function fromLink(link) {
  let url;
  try { url = new URL(link); } catch { throw new Error('That link isn’t a web address.'); }
  for (let hop = 0; hop < 4; hop++) {
    if (!/^https?:$/.test(url.protocol)) throw new Error('Links must start with https:// or http://.');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addrs = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => { throw new Error('Couldn’t find ' + host + '.'); })).map(a => a.address);
    // LUCIDA_TEST_LOCAL_LINKS lets tests serve files from this computer.
    if (process.env.LUCIDA_TEST_LOCAL_LINKS !== '1' && addrs.some(privateIp)) throw new Error('That link points inside this network, so Lucida won’t open it.');
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Lucida flashcards' } });
    const next = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && next) { url = new URL(next, url); continue; }
    if (!res.ok) throw new Error('The link answered ' + res.status + '.');
    if (+res.headers.get('content-length') > MAX) { res.body?.cancel(); throw new Error(TOO_BIG); }
    const parts = []; let n = 0;
    for await (const chunk of res.body) { n += chunk.length; if (n > MAX) throw new Error(TOO_BIG); parts.push(chunk); }
    return Buffer.concat(parts);
  }
  throw new Error('That link redirects too many times.');
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
    return save(await fromLink(f.download_url), want);
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
  if (/^https?:\/\//i.test(src)) return save(await fromLink(src), want);
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
