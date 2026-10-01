// Cutting a long recording into parts, in the page, with nothing decoded or re-encoded: every part is a whole, playable file of its own, and what is
// heard in it is what was recorded. The speech service takes one file at a time (25 MB, and it gives up after a minute of working), so a recording
// of two hours goes to it as a dozen parts of ten minutes, and the times of the words are put back together afterwards (the parts' `offset`s).
//
//   splitAudio(source, { bytes, seconds })  ->  { kind, ext, mime, seconds, size, whole, parts: [{ i, offset, seconds, bytes, blob() }] }
//   fromBlob(file) / fromBytes(bytes)       ->  a `source`: { size, read(from, to) -> Promise<Uint8Array>, slice(from, to, type) -> Blob }
//
// Where a part can be cut, by kind (all of them are found by reading the headers, a megabyte at a time: no file is ever held whole):
//   MP3 and AAC (ADTS)  between two frames. A part is a stretch of the file as it is, so no bytes are touched. (The Xing/Info frame that says how long the
//                       whole file is stays out, and so do the tags at the ends.)
//   WAV                 between two sample frames, with a new header in front.
//   Ogg (Opus, Vorbis)  between two pages, where no sound is carried over from the page before. Each part gets the file's header pages, its pages
//                       numbered again, the positions counted from its own start, and a new checksum on every page.
//   M4A (AAC, ALAC)     between two samples of the track, with a new movie header (its tables cut to the part) in front of the sound.
// Anything else (FLAC, WebM, a video, an MP4 that comes in fragments) can't be cut here: it throws an AudioSplitError with the code "unsupported".
// A part is at most `bytes` and `seconds` (so long as one frame, page or sample fits), and the parts are as even as can be: ten minutes and two
// minutes become two of six. `whole` is true when no cutting was needed (one part, the file itself).
export const PART_BYTES = 18e6;       // the speech service's file limit is 25 MB, and it is sent the sound written in base64, a third bigger
export const PART_SECONDS = 600;      // it gives up after a minute, and a part is read at 10 times the speed of speech or better
export const KINDS = { mp3: ['mp3', 'audio/mpeg'], aac: ['aac', 'audio/aac'], wav: ['wav', 'audio/wav'], ogg: ['ogg', 'audio/ogg'], m4a: ['m4a', 'audio/mp4'] };

export class AudioSplitError extends Error { constructor(message, code) { super(message); this.name = 'AudioSplitError'; this.code = code; } }
const unsupported = what => new AudioSplitError('This kind of recording can’t be cut into parts' + (what ? ' (' + what + ')' : '') + '.', 'unsupported');
const broken = () => new AudioSplitError('That recording can’t be read.', 'broken');

// ---------- sources ----------
export const fromBlob = blob => ({ size: blob.size, read: async (a, b) => new Uint8Array(await blob.slice(a, b).arrayBuffer()), slice: (a, b, type) => blob.slice(a, b, type || '') });
export const fromBytes = bytes => {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return { size: u.length, read: async (a, b) => u.subarray(a, Math.min(b, u.length)), slice: (a, b, type) => new Blob([u.subarray(a, b)], { type: type || '' }) };
};

// A window on the file: bytes are read a megabyte at a time, and only what is asked for stays.
class Reader {
  constructor(src, chunk = 1 << 20) { this.src = src; this.size = src.size; this.chunk = chunk; this.at = 0; this.buf = new Uint8Array(0); }
  has(p, n) { return p >= this.at && Math.min(p + n, this.size) <= this.at + this.buf.length; }
  async fill(p, n) { const len = Math.min(this.size - p, Math.max(this.chunk, n)); this.buf = len > 0 ? await this.src.read(p, p + len) : new Uint8Array(0); this.at = p; }
  async need(p, n) { if (!this.has(p, n)) { await this.fill(p, n); if (!this.has(p, n)) throw broken(); } }
  u8(p) { return this.buf[p - this.at]; }
  u16(p) { const o = p - this.at; return this.buf[o] | (this.buf[o + 1] << 8); }
  u32(p) { const o = p - this.at; return (this.buf[o] | (this.buf[o + 1] << 8) | (this.buf[o + 2] << 16) | (this.buf[o + 3] << 24)) >>> 0; }
  u32be(p) { const o = p - this.at; return ((this.buf[o] << 24) | (this.buf[o + 1] << 16) | (this.buf[o + 2] << 8) | this.buf[o + 3]) >>> 0; }
  str(p, n) { let s = ''; const o = p - this.at; for (let i = 0; i < n; i++) s += String.fromCharCode(this.buf[o + i]); return s; }
  async copy(p, n) { await this.need(p, n); return this.buf.slice(p - this.at, p - this.at + n); }
}
// Where each unit (a frame, a page, a sample of a track) is, how long it plays, and whether a part may start with it.
class Seq {
  constructor() { this.n = 0; this.pos = new Float64Array(1024); this.secs = new Float64Array(1024); this.cut = new Uint8Array(1024); this.size = null; this.end = 0; }
  push(pos, secs, cut = 1, size = -1) {
    if (this.n === this.pos.length) {
      const m = this.n * 2, p = new Float64Array(m), s = new Float64Array(m), c = new Uint8Array(m);
      p.set(this.pos); s.set(this.secs); c.set(this.cut); this.pos = p; this.secs = s; this.cut = c;
      if (this.size) { const z = new Float64Array(m); z.set(this.size); this.size = z; }
    }
    if (size >= 0 && !this.size) this.size = new Float64Array(this.pos.length);
    this.pos[this.n] = pos; this.secs[this.n] = secs; this.cut[this.n] = cut; if (this.size) this.size[this.n] = size; this.n++;
  }
  // how many bytes a unit takes: its own size when it was given (a unit of a track), else the way to the next one
  bytes(i) { return this.size ? this.size[i] : (i + 1 < this.n ? this.pos[i + 1] : this.end) - this.pos[i]; }
}

// The fewest parts that each fit, as even as can be: where the parts start (indexes of units). First the fewest: fill each part as far as it will go (up to
// the limits scaled by `f`, and ending only where a part may end), which with f = 1 gives the smallest number of parts. Then the smallest f that still gives that
// number: the parts come out as even as the sound allows (a recording that is light for twenty minutes and then ten times heavier is not cut by one measure alone).
function fill(S, lim, f) {
  const cuts = [], B = lim.bytes * f, T = lim.seconds * f;
  let start = 0, b = 0, s = 0, last = -1;
  for (let i = 0; i < S.n; i++) {
    if (i > start && (b + S.bytes(i) > B || s + S.secs[i] > T)) {
      let at = -1;
      if (S.cut[i]) at = i; else if (last > start) at = last;              // this unit starts a part, or the latest one that could
      if (at > 0) { cuts.push(at); start = at; b = 0; s = 0; last = -1; for (let k = at; k < i; k++) { b += S.bytes(k); s += S.secs[k]; if (k > at && S.cut[k]) last = k; } }
    }
    b += S.bytes(i); s += S.secs[i];
    if (i > start && S.cut[i]) last = i;
  }
  return cuts;
}
function balance(S, lim) {
  const most = fill(S, lim, 1).length;
  if (!most) return [];
  let totalB = 0, totalS = 0; for (let i = 0; i < S.n; i++) { totalB += S.bytes(i); totalS += S.secs[i]; }
  let lo = Math.max(totalB / ((most + 1) * lim.bytes), totalS / ((most + 1) * lim.seconds)), hi = 1, best = null;
  for (let k = 0; k < 24 && hi - lo > 0.0005; k++) {
    const mid = (lo + hi) / 2, cuts = fill(S, lim, mid);
    if (cuts.length <= most) { best = cuts; hi = mid; } else lo = mid;
  }
  return best || fill(S, lim, 1);
}
// The result for units that are cut as they are (bytes straight from the file).
function stretches(R, S, lim, mime, make) {
  const cuts = balance(S, lim), bounds = [0, ...cuts, S.n], parts = []; let offset = 0, total = 0;
  for (let k = 0; k + 1 < bounds.length; k++) {
    const a = bounds[k], b = bounds[k + 1], from = S.pos[a], to = b < S.n ? S.pos[b] : S.end;
    let secs = 0; for (let i = a; i < b; i++) secs += S.secs[i];
    parts.push({ i: k, offset, seconds: secs, bytes: to - from, from, to, blob: make ? make(a, b, from, to) : async () => R.src.slice(from, to, mime) });
    offset += secs; total += secs;
  }
  return { seconds: total, parts };
}

// ---------- what a file is ----------
async function id3End(R) {
  let o = 0;
  for (;;) {
    if (o + 10 > R.size) return Math.min(o, R.size);
    await R.need(o, 10);
    if (R.str(o, 3) !== 'ID3' || R.u8(o + 3) === 0xff || R.u8(o + 6) >= 0x80) return o;
    o += 10 + ((R.u8(o + 6) << 21) | (R.u8(o + 7) << 14) | (R.u8(o + 8) << 7) | R.u8(o + 9)) + (R.u8(o + 5) & 0x10 ? 10 : 0);
  }
}
async function kindOf(R) {
  if (R.size < 12) return '';
  await R.need(0, 12);
  const a = R.str(0, 4);
  if (a === 'RIFF' && R.str(8, 4) === 'WAVE') return 'wav';
  if (a === 'RF64' || a === 'BW64') return 'rf64';
  if (a === 'OggS') return 'ogg';
  if (R.str(4, 4) === 'ftyp') return 'm4a';
  if (a === 'fLaC') return 'flac';
  if (R.u8(0) === 0x1a && R.u8(1) === 0x45 && R.u8(2) === 0xdf && R.u8(3) === 0xa3) return 'webm';
  const o = await id3End(R);
  if (o + 4 > R.size) return '';
  await R.need(o, 4);
  if (R.str(o, 4) === 'fLaC') return 'flac';
  if (R.u8(o) === 0xff && (R.u8(o + 1) & 0xf6) === 0xf0) return 'aac';
  return 'mp3';
}

// ---------- MP3 and AAC: frames ----------
const MP3_RATES = { 1: [[], [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]],
  2: [[], [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]] };
// A frame header at b[o]: { len, secs, key } (key: what must stay the same from frame to frame), or null.
function mp3Parse(b, o, avail) {
  if (avail < 4 || b[o] !== 0xff || (b[o + 1] & 0xe0) !== 0xe0) return null;
  const vbits = (b[o + 1] >> 3) & 3, lbits = (b[o + 1] >> 1) & 3, bri = b[o + 2] >> 4, sri = (b[o + 2] >> 2) & 3;
  if (vbits === 1 || lbits === 0 || bri === 0 || bri === 15 || sri === 3) return null;
  const v = vbits === 3 ? 1 : 2, layer = 4 - lbits, sr = [44100, 48000, 32000][sri] / (vbits === 3 ? 1 : vbits === 2 ? 2 : 4);
  const br = MP3_RATES[v][layer][bri] * 1000, pad = (b[o + 2] >> 1) & 1, big = layer === 3 && v === 2;
  const len = layer === 1 ? (Math.floor(12 * br / sr) + pad) * 4 : Math.floor((big ? 72 : 144) * br / sr) + pad;
  return { len, secs: (layer === 1 ? 384 : big ? 576 : 1152) / sr, key: v + ':' + layer + ':' + sr, v, mono: (b[o + 3] >> 6) === 3, crc: !(b[o + 1] & 1) };
}
const ADTS_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
function adtsParse(b, o, avail) {
  if (avail < 7 || b[o] !== 0xff || (b[o + 1] & 0xf6) !== 0xf0) return null;
  const sri = (b[o + 2] >> 2) & 15, rate = ADTS_RATES[sri]; if (!rate) return null;
  const len = ((b[o + 3] & 3) << 11) | (b[o + 4] << 3) | (b[o + 5] >> 5);
  if (len < (b[o + 1] & 1 ? 7 : 9)) return null;
  return { len, secs: 1024 * ((b[o + 6] & 3) + 1) / rate, key: sri + ':' + (((b[o + 2] & 1) << 2) | (b[o + 3] >> 6)) };
}
// Every frame of an MP3 or AAC stream from `from`: where it is and how long it plays. Junk between frames (a tag in the middle, a bad patch) is skipped; the tags at the
// end and a frame that is cut off are left out. A frame counts only when two more of the same kind follow it (or the file ends), so a stray 0xFF in junk is not one.
async function walkFrames(R, from, parse, skipInfo) {
  const S = new Seq(); let ref = null;
  const at = async p => { if (!R.has(p, 12)) await R.fill(p, 12); return parse(R.buf, p - R.at, R.size - p); };
  const find = async (p, to) => {
    for (const end = Math.min(R.size - 4, to); p < end; p++) {
      if (!R.has(p, 4)) await R.fill(p, 4);
      if (R.u8(p) !== 0xff) continue;
      const h = await at(p); if (!h || (ref && h.key !== ref.key)) continue;
      let q = p + h.len, ok = q <= R.size;
      for (let i = 0; ok && i < 2 && q + 4 <= R.size; i++) { const g = await at(q); if (!g || g.key !== h.key) ok = false; else q += g.len; }
      if (ok) return p;
    }
    return -1;
  };
  let pos = await find(from, from + (1 << 20));
  if (pos < 0) return null;
  ref = await at(pos);
  if (skipInfo) {                                  // the frame that says how long the whole file is (Xing, Info, VBRI) isn't sound
    await R.need(pos, 4 + 2 + 32 + 8);
    const x = pos + 4 + (ref.crc ? 2 : 0) + (ref.v === 1 ? (ref.mono ? 17 : 32) : (ref.mono ? 9 : 17)), tag = R.str(x, 4);
    if (tag === 'Xing' || tag === 'Info' || R.str(pos + 36, 4) === 'VBRI') pos += ref.len;
  }
  while (pos + 4 <= R.size) {
    const h = R.has(pos, 12) ? parse(R.buf, pos - R.at, R.size - pos) : await at(pos);
    if (h && h.key === ref.key) { if (pos + h.len > R.size) break; S.push(pos, h.secs); pos += h.len; continue; }
    await R.need(pos, 12);
    const tag = R.str(pos, 3);
    if (tag === 'ID3' && R.u8(pos + 6) < 0x80 && pos + 10 <= R.size) { pos += 10 + ((R.u8(pos + 6) << 21) | (R.u8(pos + 7) << 14) | (R.u8(pos + 8) << 7) | R.u8(pos + 9)) + (R.u8(pos + 5) & 0x10 ? 10 : 0); continue; }
    if ((tag === 'TAG' && pos + 128 >= R.size) || R.str(pos, 8) === 'APETAGEX') break;
    const next = await find(pos + 1, R.size);
    if (next < 0) break;
    pos = next;
  }
  S.end = pos;
  return S.n ? S : null;
}
async function scanMp3(R, lim) { const S = await walkFrames(R, await id3End(R), mp3Parse, true); if (!S) throw broken(); return stretches(R, S, lim, 'audio/mpeg'); }
async function scanAac(R, lim) { const S = await walkFrames(R, await id3End(R), adtsParse, false); if (!S) throw broken(); return stretches(R, S, lim, 'audio/aac'); }

// ---------- WAV: sample frames ----------
async function scanWav(R, lim) {
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= R.size) {
    await R.need(pos, 8);
    const id = R.str(pos, 4), size = R.u32(pos + 4), body = pos + 8;
    if (id === 'fmt ') { if (size < 16 || size > 512 || body + size > R.size) throw broken(); fmt = await R.copy(body, size); }
    else if (id === 'data') { data = { at: body, size: size === 0 || size === 0xffffffff || body + size > R.size ? R.size - body : size }; break; }
    pos = body + size + (size & 1);
  }
  if (!fmt || !data) throw broken();
  const dv = new DataView(fmt.buffer, fmt.byteOffset, fmt.byteLength);
  let tag = dv.getUint16(0, true);
  const channels = dv.getUint16(2, true), rate = dv.getUint32(4, true), align = dv.getUint16(12, true);
  if (tag === 0xfffe && fmt.length >= 26) tag = dv.getUint16(24, true);                // the real format, inside an "extensible" header
  if (![1, 3, 6, 7].includes(tag) || !rate || !align || !channels) throw unsupported('this kind of WAV');
  const frames = Math.floor(data.size / align), fact = tag === 1 ? 0 : 12, head = 12 + 8 + fmt.length + (fmt.length & 1) + fact + 8;
  if (frames < 1) throw broken();
  const most = Math.max(1, Math.floor(Math.min(lim.bytes - head - 1, lim.seconds * rate * align) / align));
  const n = Math.max(1, Math.ceil(frames / most)), per = Math.ceil(frames / n), parts = [];
  for (let k = 0; k < n; k++) {
    const a = k * per, b = Math.min(frames, a + per), count = b - a, dataSize = count * align, pad = dataSize & 1;
    if (count < 1) break;
    parts.push({ i: k, offset: a / rate, seconds: count / rate, bytes: head + dataSize + pad, blob: async () => {
      const h = new Uint8Array(head), v = new DataView(h.buffer), put = (o, s) => { for (let i = 0; i < s.length; i++) h[o + i] = s.charCodeAt(i); };
      put(0, 'RIFF'); v.setUint32(4, head - 8 + dataSize + pad, true); put(8, 'WAVEfmt '); v.setUint32(16, fmt.length, true); h.set(fmt, 20);
      let o = 20 + fmt.length + (fmt.length & 1);
      if (fact) { put(o, 'fact'); v.setUint32(o + 4, 4, true); v.setUint32(o + 8, count, true); o += 12; }
      put(o, 'data'); v.setUint32(o + 4, dataSize, true);
      return new Blob([h, R.src.slice(data.at + a * align, data.at + b * align), ...(pad ? [new Uint8Array(1)] : [])], { type: 'audio/wav' });
    } });
  }
  return { seconds: frames / rate, parts };
}

// ---------- Ogg (Opus, Vorbis): pages ----------
const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; } return t; })();
// Writes a page's number, position, flags and (so it is right) checksum, in place. `g` is a whole number of samples, or -1 for "no packet ends on this page".
function oggPatch(b, o, len, seq, g, flags) {
  const v = new DataView(b.buffer, b.byteOffset + o, len);
  v.setUint8(5, flags); v.setUint32(18, seq, true);
  if (g < 0) { v.setUint32(6, 0xffffffff, true); v.setUint32(10, 0xffffffff, true); } else { v.setUint32(6, g % 4294967296, true); v.setUint32(10, Math.floor(g / 4294967296), true); }
  v.setUint32(22, 0, true);
  let c = 0; for (let i = o, e = o + len; i < e; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ b[i]) & 0xff]) >>> 0;
  v.setUint32(22, c, true);
}
async function scanOgg(R, lim) {
  const heads = [], pages = [];
  let pos = 0, serial = -1, codec = '', rate = 0, pre = 0, needed = 0, got = 0;
  const find = async p => {                                      // the next place that is a page header followed by another one (or the end)
    for (; p + 27 <= R.size; p++) {
      if (!R.has(p, 27 + 255)) await R.fill(p, 27 + 255);
      if (R.u8(p) !== 0x4f || R.str(p, 4) !== 'OggS' || R.u8(p + 4) !== 0) continue;
      const nseg = R.u8(p + 26); let len = 27 + nseg; for (let k = 0; k < nseg; k++) len += R.u8(p + 27 + k);
      if (p + len === R.size) return p;
      if (p + len + 4 <= R.size) { await R.need(p + len, 5); if (R.str(p + len, 4) === 'OggS' && R.u8(p + len + 4) === 0) return p; }
    }
    return -1;
  };
  while (pos + 27 <= R.size) {
    await R.need(pos, 27 + 255);
    if (R.str(pos, 4) !== 'OggS' || R.u8(pos + 4) !== 0) { pos = await find(pos + 1); if (pos < 0) break; continue; }
    const flags = R.u8(pos + 5), lo = R.u32(pos + 6), hi = R.u32(pos + 10), ser = R.u32(pos + 14), nseg = R.u8(pos + 26);
    let body = 0, done = 0;
    for (let k = 0; k < nseg; k++) { const l = R.u8(pos + 27 + k); body += l; if (l < 255) done++; }
    const len = 27 + nseg + body; if (pos + len > R.size) break;
    const g = lo === 0xffffffff && hi === 0xffffffff ? -1 : hi * 4294967296 + lo;
    if (serial >= 0 && (flags & 2)) throw unsupported('an Ogg with more than one stream in it');
    if (serial < 0) {                                           // the first page says which codec this is
      if (!(flags & 2) || nseg < 1) throw broken();
      const p0 = pos + 27 + nseg; await R.need(p0, 20);
      if (R.str(p0, 8) === 'OpusHead') { codec = 'opus'; rate = 48000; pre = R.u16(p0 + 10); needed = 2; }
      else if (R.u8(p0) === 1 && R.str(p0 + 1, 6) === 'vorbis') { codec = 'vorbis'; rate = R.u32(p0 + 12); needed = 3; }
      else throw unsupported('this kind of Ogg');
      if (!rate) throw broken();
      serial = ser;
    } else if (ser !== serial) throw unsupported('an Ogg with more than one stream in it');
    if (got < needed) { heads.push({ off: pos, len }); got += done; if (got > needed) throw broken(); }
    else pages.push({ off: pos, len, g, cont: !!(flags & 1) });
    pos += len;
  }
  if (got < needed || !pages.length) throw broken();
  // A page is a place to cut when the page before it ended a packet (it has a position) and this page doesn't carry one on from it. Seconds count from the
  // first sound (an Opus stream's pre-skip is not sound), so a part's offset is where it was cut from the whole.
  const S = new Seq(); let last = codec === 'opus' ? pre : 0;
  pages.forEach((p, i) => {
    S.push(p.off, p.g > last ? (p.g - last) / rate : 0, i > 0 && !p.cont && pages[i - 1].g >= 0 ? 1 : 0);
    if (p.g >= 0) last = Math.max(last, p.g);
  });
  S.end = pages[pages.length - 1].off + pages[pages.length - 1].len;
  const headEnd = heads[heads.length - 1].off + heads[heads.length - 1].len, headLen = headEnd - heads[0].off;
  const r = stretches(R, S, { ...lim, bytes: lim.bytes - headLen }, 'audio/ogg', (a, b) => async () => {
    const first = pages[a].off, end = pages[b - 1].off + pages[b - 1].len;
    const [head, body] = await Promise.all([R.src.read(heads[0].off, headEnd), R.src.read(first, end)]);
    let size = headLen; for (let i = a; i < b; i++) size += pages[i].len;
    const out = new Uint8Array(size); out.set(head.subarray(0, headLen), 0);
    const base = a === 0 ? 0 : pages[a - 1].g, lift = a > 0 && codec === 'opus' ? pre : 0;
    let o = headLen, seq = heads.length;
    for (let i = a; i < b; i++, seq++) {
      const p = pages[i]; out.set(body.subarray(p.off - first, p.off - first + p.len), o);
      oggPatch(out, o, p.len, seq, p.g < 0 ? -1 : Math.max(0, p.g - base + lift), (out[o + 5] & ~4) | (i === b - 1 ? 4 : 0));
      o += p.len;
    }
    return new Blob([out], { type: 'audio/ogg' });
  });
  for (const part of r.parts) part.bytes += headLen;
  return r;
}

// ---------- M4A (and audio-only MP4): samples of the track ----------
const be32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const be64 = (b, o) => be32(b, o) * 4294967296 + be32(b, o + 4);
const fourcc = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const set32 = (b, o, v) => { b[o] = v >>> 24; b[o + 1] = (v >>> 16) & 255; b[o + 2] = (v >>> 8) & 255; b[o + 3] = v & 255; };
function* boxesOf(b, start, end) {                       // the boxes inside b[start, end): { type, start, body, end }
  for (let p = start; p + 8 <= end;) {
    let size = be32(b, p), hdr = 8;
    if (size === 1) { if (p + 16 > end) return; size = be64(b, p + 8); hdr = 16; } else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) return;
    yield { type: fourcc(b, p + 4), start: p, body: p + hdr, end: p + size };
    p += size;
  }
}
function box(type, ...kids) {
  let n = 8; for (const k of kids) n += k.length;
  const b = new Uint8Array(n); set32(b, 0, n); for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i);
  let o = 8; for (const k of kids) { b.set(k, o); o += k.length; }
  return b;
}
const words = v => { const b = new Uint8Array(v.length * 4); v.forEach((x, i) => set32(b, i * 4, x)); return b; };
// A copy of a movie, track or media header box with its duration (in its own ticks) changed. Layouts: mvhd and mdhd have the duration after the timescale,
// tkhd after the track's number; version 1 has 64-bit times.
function withDuration(b, m, kind, ticks) {
  const out = b.slice(m.start, m.end), v = out[8], at = kind === 'tkhd' ? (v === 1 ? 8 + 28 : 8 + 20) : (v === 1 ? 8 + 24 : 8 + 16);
  if (v === 1) { set32(out, at, Math.floor(ticks / 4294967296)); set32(out, at + 4, ticks % 4294967296); } else set32(out, at, Math.min(ticks, 0xffffffff));
  return out;
}
async function scanM4a(R, lim) {
  let pos = 0, ftyp = null, moov = null;
  while (pos + 8 <= R.size) {
    await R.need(pos, 16);
    let size = R.u32be(pos), hdr = 8; const type = R.str(pos + 4, 4);
    if (size === 1) { size = R.u32be(pos + 8) * 4294967296 + R.u32be(pos + 12); hdr = 16; } else if (size === 0) size = R.size - pos;
    if (size < hdr) throw broken();
    if (pos + size > R.size) { if (type !== 'mdat') throw broken(); size = R.size - pos; }
    if (type === 'ftyp' && size < 4096) ftyp = await R.copy(pos, size);
    else if (type === 'moov') { if (size > 1 << 27) throw broken(); moov = await R.copy(pos, size); }
    else if (type === 'moof') throw unsupported('an MP4 that comes in fragments');
    pos += size;
  }
  if (!ftyp || !moov) throw broken();
  // the movie: its header, and the track that is sound (a file with a picture is not a recording)
  let mvhd = null, trak = null;
  for (const m of boxesOf(moov, 8, moov.length)) {
    if (m.type === 'mvhd') mvhd = m; else if (m.type === 'mvex') throw unsupported('an MP4 that comes in fragments');
    else if (m.type === 'trak') {
      let kind = '';
      for (const x of boxesOf(moov, m.body, m.end)) if (x.type === 'mdia') for (const y of boxesOf(moov, x.body, x.end)) if (y.type === 'hdlr' && y.body + 12 <= y.end) kind = fourcc(moov, y.body + 8);
      if (kind === 'vide') throw unsupported('a video');
      if (kind === 'soun' && !trak) trak = m;
    }
  }
  if (!mvhd || !trak) throw broken();
  let tkhd = null, mdia = null, mdhd = null, minf = null, stbl = null; const mdiaKids = [], minfKids = [], st = {};
  for (const x of boxesOf(moov, trak.body, trak.end)) { if (x.type === 'tkhd') tkhd = x; else if (x.type === 'mdia') mdia = x; }
  if (!tkhd || !mdia) throw broken();
  for (const y of boxesOf(moov, mdia.body, mdia.end)) { mdiaKids.push(y); if (y.type === 'mdhd') mdhd = y; else if (y.type === 'minf') minf = y; }
  if (!mdhd || !minf) throw broken();
  for (const z of boxesOf(moov, minf.body, minf.end)) { if (z.type === 'stbl') stbl = z; else minfKids.push(z); }
  if (!stbl) throw broken();
  for (const t of boxesOf(moov, stbl.body, stbl.end)) st[t.type] = t;
  if (st.stz2 || !st.stsd || !st.stts || !st.stsc || !st.stsz || !(st.stco || st.co64)) throw st.stz2 ? unsupported('this kind of MP4') : broken();
  const timescale = be32(moov, mdhd.body + (moov[mdhd.body] === 1 ? 20 : 12)), movieScale = be32(moov, mvhd.body + (moov[mvhd.body] === 1 ? 20 : 12));
  if (!timescale || !movieScale) throw broken();
  // the tables: how big each sample is, how long it lasts, and where it is in the file
  const sz = st.stsz, fixed = be32(moov, sz.body + 4), count = be32(moov, sz.body + 8);
  if (!count || (!fixed && sz.body + 12 + count * 4 > sz.end)) throw broken();
  const size = new Uint32Array(count); for (let i = 0; i < count; i++) size[i] = fixed || be32(moov, sz.body + 12 + i * 4);
  const delta = new Uint32Array(count), tt = st.stts, runsN = be32(moov, tt.body + 4);
  if (tt.body + 8 + runsN * 8 > tt.end) throw broken();
  for (let r = 0, i = 0; r < runsN && i < count; r++) { const c = be32(moov, tt.body + 8 + r * 8), d = be32(moov, tt.body + 12 + r * 8); for (let k = 0; k < c && i < count; k++) delta[i++] = d; }
  const co = st.stco || st.co64, big = !st.stco, chunks = be32(moov, co.body + 4);
  if (co.body + 8 + chunks * (big ? 8 : 4) > co.end) throw broken();
  const chunkAt = c => (big ? be64(moov, co.body + 8 + c * 8) : be32(moov, co.body + 8 + c * 4));
  const sc = st.stsc, scN = be32(moov, sc.body + 4);
  if (sc.body + 8 + scN * 12 > sc.end) throw broken();
  const S = new Seq(); let at = 0;
  for (let r = 0; r < scN; r++) {
    const first = be32(moov, sc.body + 8 + r * 12), per = be32(moov, sc.body + 12 + r * 12), index = be32(moov, sc.body + 16 + r * 12);
    const to = r + 1 < scN ? be32(moov, sc.body + 8 + (r + 1) * 12) : chunks + 1;
    if (index !== 1) throw unsupported('this kind of MP4');
    for (let c = first; c < to && c <= chunks; c++) { let off = chunkAt(c - 1); for (let k = 0; k < per && at < count; k++, at++) { S.push(off, delta[at] / timescale, 1, size[at] + 4); off += size[at]; } }
  }
  if (at < count) throw broken();
  S.end = R.size;
  // the movie of one part: the original's headers (durations changed), the sample description, and tables of just its samples, all in one chunk
  const movie = (a, b, offset) => {
    let ticks = 0; for (let i = a; i < b; i++) ticks += delta[i];
    const runs = []; for (let i = a; i < b; i++) { const last = runs[runs.length - 1]; if (last && last[1] === delta[i]) last[0]++; else runs.push([1, delta[i]]); }
    const sizes = new Uint8Array((b - a) * 4); for (let i = a; i < b; i++) set32(sizes, (i - a) * 4, size[i]);
    const stbl2 = box('stbl', moov.slice(st.stsd.start, st.stsd.end), box('stts', words([0, runs.length, ...runs.flat()])), box('stsc', words([0, 1, 1, b - a, 1])),
      box('stsz', words([0, 0, b - a]), sizes), box('stco', words([0, 1, offset])));
    const minf2 = box('minf', ...minfKids.map(k => moov.slice(k.start, k.end)), stbl2);
    const mdia2 = box('mdia', ...mdiaKids.map(k => (k.type === 'mdhd' ? withDuration(moov, k, 'mdhd', ticks) : k.type === 'minf' ? minf2 : moov.slice(k.start, k.end))));
    const movieTicks = Math.round(ticks / timescale * movieScale);
    const trak2 = box('trak', withDuration(moov, tkhd, 'tkhd', movieTicks), mdia2);
    return box('moov', withDuration(moov, mvhd, 'mvhd', movieTicks), trak2);
  };
  // (an edit list that skips the encoder's first samples is left out: a part starts where its first sample does)
  const r = stretches(R, S, { ...lim, bytes: lim.bytes - ftyp.length - 4096 }, 'audio/mp4', (a, b) => {
    const head = movie(a, b, 0), pre = ftyp.length + head.length + 8;
    const final = movie(a, b, pre), runs = []; let payload = 0;
    for (let i = a; i < b; i++) { payload += size[i]; const last = runs[runs.length - 1]; if (last && last[1] === S.pos[i]) last[1] += size[i]; else runs.push([S.pos[i], S.pos[i] + size[i]]); }
    const mdat = new Uint8Array(8); set32(mdat, 0, 8 + payload); mdat.set([0x6d, 0x64, 0x61, 0x74], 4);
    const blob = async () => new Blob([ftyp, final, mdat, ...runs.map(([x, y]) => R.src.slice(x, y))], { type: 'audio/mp4' });
    blob.bytes = pre + payload;
    return blob;
  });
  for (const part of r.parts) part.bytes = part.blob.bytes;
  return r;
}

// ---------- the entry ----------
const SCANNERS = { mp3: scanMp3, aac: scanAac, wav: scanWav, ogg: scanOgg, m4a: scanM4a };
export async function splitAudio(src, { bytes = PART_BYTES, seconds = PART_SECONDS } = {}) {
  const R = new Reader(src), kind = await kindOf(R), scan = SCANNERS[kind];
  if (!scan) throw unsupported(kind === 'flac' ? 'FLAC' : kind === 'webm' ? 'WebM' : '');
  const lim = { bytes: bytes - Math.min(70000, Math.floor(bytes / 10)), seconds: seconds - Math.min(2, seconds / 10) };
  const r = await scan(R, lim), [ext, mime] = KINDS[kind], whole = r.parts.length === 1;
  if (whole) r.parts[0].blob = async () => src.slice(0, src.size, mime);
  return { kind, ext, mime, whole, size: src.size, ...r };
}
