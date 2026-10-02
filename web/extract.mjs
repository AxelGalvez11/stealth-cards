// What people upload (a PDF, a PowerPoint, a Word file, a text file) turned into plain text on the server, so Lucida can make
// flashcards from it, plus the length of a sound and the size of a picture read from the file's own first bytes.
// Everything here is pure: bytes in, plain data out. No files, no network, no packages (zlib comes with Node).
// Text always comes in pieces, `units`, each with `at`: where the piece came from ("p. 12", "Slide 4", a heading). A flashcard
// made from a piece can say where it came from. unitsToText/textToUnits keep the places in one string so they can be saved,
// and chunkUnits cuts them into pieces small enough to send to an AI, keeping the places.
// The files are not trusted. Every loop is bounded by the size of its input, a zip entry or a PDF stream is inflated with a
// size limit (checked while inflating, never by the size a header claims), total work and memory are capped, and whatever
// goes wrong inside a reader comes out as a short ExtractError a person can read (never a stack trace, never a hang).
import { inflateSync, inflateRawSync, constants as Z } from 'node:zlib';
import { createHash, createDecipheriv, createCipheriv } from 'node:crypto';

// What a person sees. `code` says what happened: 'encrypted' (locked with a password), 'broken' (can't be opened),
// 'empty' (opened, but there is no text) or 'toolarge' (more than Lucida will read).
export class ExtractError extends Error {
  constructor(message, code) { super(message); this.name = 'ExtractError'; this.code = code; }
}
const SAY = {
  encrypted: 'This PDF is locked with a password, so Lucida can’t read it.',
  broken: 'Lucida can’t open that file. It may be damaged.',
  empty: 'There is no text in that file.',
  toolarge: 'That file is too big for Lucida to read.'
};
const LOCKED_FILE = 'This file is locked with a password, so Lucida can’t read it.';
const fail = code => { throw new ExtractError(SAY[code], code); };
// Whatever comes in becomes a Buffer (a Buffer, another kind of byte array, or an ArrayBuffer), without copying.
function asBuffer(x) {
  if (Buffer.isBuffer(x)) return x;
  if (x instanceof Uint8Array) return Buffer.from(x.buffer, x.byteOffset, x.byteLength);
  if (x instanceof ArrayBuffer) return Buffer.from(x);
  return fail('broken');
}
const ascii = (b, from, to) => b.toString('latin1', from, to);
// Most text we hand back is cut off here (about 1.2 million words), so nothing a file contains can fill the server's memory.
const MAX_CHARS = 5e6;
// Cuts a string to n characters without splitting an emoji (a surrogate pair) in half.
function cutTo(s, n) { if (s.length <= n) return s; const c = s.charCodeAt(n - 1); return s.slice(0, c >= 0xd800 && c <= 0xdbff ? n - 1 : n); }
// Whole blank lines taken off the start of a text (the spaces of the first line with text stay), and newlines off both ends.
// These are loops, not regular expressions: a pattern like /\s+$/ is slow (quadratic) on a long run of spaces in the middle.
function dropBlankStart(s) {
  let lineStart = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c === 10) lineStart = i + 1; else if (c !== 32 && c !== 9 && c !== 13) return lineStart ? s.slice(lineStart) : s; }
  return '';
}
function trimNewlines(s) { let a = 0, b = s.length; while (a < b && s.charCodeAt(a) === 10) a++; while (b > a && s.charCodeAt(b - 1) === 10) b--; return a || b < s.length ? s.slice(a, b) : s; }
// Spaces off the end of every line, and blank lines off both ends.
const trimLines = s => trimNewlines(s.split('\n').map(l => l.trimEnd()).join('\n'));

// ---------------------------------------------------------------------------------------------------------------------
// ZIP. A .docx and a .pptx are zip files. This reads the central directory (the list at the end that always has the true
// sizes, even for files written as a stream where the entry itself says "size follows"), so it works for zips made by
// anything: stored (no compression) and deflate entries, data descriptors, zip64 sizes and offsets, a comment, and junk in
// front of the zip (a self-extracting program). Encrypted entries are refused. Sizes written in the headers are never
// believed: every entry is inflated with a limit on how big it may get (the entry's, and what's left of the total), so a
// zip bomb (a few KB that becomes a gigabyte) is refused after a few hundred MB at most, and one that claims honestly to be
// huge is refused before any work. `only` is an optional (name) => boolean: entries it rejects are never inflated.
const SIG_EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
export function unzip(input, { maxEntries = 5000, maxTotal = 300e6, maxEntry = 150e6, only = null } = {}) {
  const buf = asBuffer(input), out = new Map();
  const end = findEnd(buf);
  if (!end) fail('broken');
  if (end.total > maxEntries && end.total < 0xffff) fail('toolarge');
  // The directory sits right before the end record, so where it starts is also cdEnd - size. When a program is glued in
  // front of the zip, the offsets inside are counted from the zip's own start, and the difference is the shift.
  const hasSig = p => p >= 0 && p + 4 <= buf.length && buf.readUInt32LE(p) === 0x02014b50;
  let pos = end.cdOff, shift = 0;
  if (!hasSig(pos)) { const guess = end.end - end.cdSize; if (!hasSig(guess)) fail('broken'); shift = guess - end.cdOff; pos = guess; }
  const dirEnd = Math.min(buf.length, pos + (end.cdSize > 0 ? end.cdSize : buf.length)), want = end.total;
  let used = 0, count = 0;
  while (pos + 46 <= dirEnd && buf.readUInt32LE(pos) === 0x02014b50) {
    if (++count > maxEntries) fail('toolarge');
    const flags = buf.readUInt16LE(pos + 8), method = buf.readUInt16LE(pos + 10);
    let comp = buf.readUInt32LE(pos + 20), size = buf.readUInt32LE(pos + 24), local = buf.readUInt32LE(pos + 42);
    const nameLen = buf.readUInt16LE(pos + 28), extraLen = buf.readUInt16LE(pos + 30), commentLen = buf.readUInt16LE(pos + 32);
    if (pos + 46 + nameLen + extraLen + commentLen > buf.length) fail('broken');
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen).replace(/\\/g, '/');
    if (comp === 0xffffffff || size === 0xffffffff || local === 0xffffffff) {      // zip64: the real numbers are in an extra field
      for (let e = pos + 46 + nameLen, eEnd = e + extraLen; e + 4 <= eEnd; e += 4 + buf.readUInt16LE(e + 2)) {
        if (buf.readUInt16LE(e) !== 1) continue;
        let q = e + 4;
        if (size === 0xffffffff && q + 8 <= eEnd) { size = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (comp === 0xffffffff && q + 8 <= eEnd) { comp = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (local === 0xffffffff && q + 8 <= eEnd) { local = Number(buf.readBigUInt64LE(q)); q += 8; }
        break;
      }
    }
    pos += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/') || (only && !only(name))) continue;
    if (flags & 1 || method === 99) throw new ExtractError(LOCKED_FILE, 'encrypted');
    const lo = local + shift;
    if (!(lo >= 0) || lo + 30 > buf.length || buf.readUInt32LE(lo) !== 0x04034b50) fail('broken');
    const start = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28);
    if (!(comp >= 0) || start + comp > buf.length) fail('broken');
    const room = Math.min(maxEntry, maxTotal - used);
    let data;
    if (method === 0) {
      if (comp > room) fail('toolarge');
      data = buf.subarray(start, start + comp);
    } else if (method === 8) {
      if (size > room) fail('toolarge');                                          // an honest header that says "huge"
      if (comp === 0) data = Buffer.alloc(0);
      else {
        try { data = inflateRawSync(buf.subarray(start, start + comp), { maxOutputLength: Math.max(1, room), chunkSize: Math.min(Math.max(size || 0, 16384), 1 << 22) }); }
        catch (e) { fail(e && e.code === 'ERR_BUFFER_TOO_LARGE' ? 'toolarge' : 'broken'); }   // the limit, or damaged data
      }
    } else fail('broken');
    used += data.length;
    if (used > maxTotal || data.length > maxEntry) fail('toolarge');
    out.set(name, data);
  }
  if (count < want && want < 0xffff) fail('broken');                                // the directory is shorter than it says: cut off or damaged
  return out;
}
// Finds the end-of-central-directory record: the last "PK\5\6" in the final 64 KB (a comment can follow it). Returns the
// entry count, the directory's size and offset (from the zip64 record when this one says "see zip64"), and where the
// directory should end.
function findEnd(buf) {
  if (buf.length < 22) return null;
  const low = Math.max(0, buf.length - 22 - 0xffff);
  for (let p = buf.lastIndexOf(SIG_EOCD, buf.length - 22); p >= low; p = p > 0 ? buf.lastIndexOf(SIG_EOCD, p - 1) : -1) {
    if (p + 22 + buf.readUInt16LE(p + 20) > buf.length) continue;
    let total = buf.readUInt16LE(p + 10), cdSize = buf.readUInt32LE(p + 12), cdOff = buf.readUInt32LE(p + 16), at = p;
    if (total === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {
      const loc = p - 20;
      if (loc >= 0 && buf.readUInt32LE(loc) === 0x07064b50) {
        const rec = Number(buf.readBigUInt64LE(loc + 8));
        if (rec >= 0 && rec + 56 <= buf.length && buf.readUInt32LE(rec) === 0x06064b50) {
          total = Number(buf.readBigUInt64LE(rec + 32)); cdSize = Number(buf.readBigUInt64LE(rec + 40)); cdOff = Number(buf.readBigUInt64LE(rec + 48)); at = rec;
        }
      }
    }
    return { total, cdSize, cdOff, end: at };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// XML, just enough for Office files (no DOM library). It makes a small tree: { n: name without its prefix ("w:p" is "p"),
// a: attributes (full names, or null), k: children (nodes and strings) }. Entities are decoded in text and attributes;
// comments, processing instructions, doctypes and CDATA are handled; nothing is ever fetched or expanded (no custom
// entities), so a hostile file can only cost time in proportion to its size. Nesting deeper than 250 or more than 4 million
// elements is refused.
function xmlDecode(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(?:#x([0-9a-fA-F]{1,6})|#(\d{1,7})|(amp|lt|gt|quot|apos));/g, (m, hex, dec, name) => {
    if (name) return { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' }[name];
    const n = hex ? parseInt(hex, 16) : parseInt(dec, 10);
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
  });
}
const localName = n => { const c = n.lastIndexOf(':'); return c < 0 ? n : n.slice(c + 1); };
function parseXml(s) {
  const root = { n: '', a: null, k: [] }, stack = [root], len = s.length;
  let i = 0, nodes = 0;
  while (i < len) {
    const lt = s.indexOf('<', i), top = stack[stack.length - 1];
    if (lt < 0) { top.k.push(xmlDecode(s.slice(i))); break; }
    if (lt > i) top.k.push(xmlDecode(s.slice(i, lt)));
    const c1 = s.charCodeAt(lt + 1);
    if (c1 === 33) {                                                               // <!-- --> <![CDATA[ ]]> <!DOCTYPE>
      if (s.startsWith('<!--', lt)) { const e = s.indexOf('-->', lt + 4); i = e < 0 ? len : e + 3; }
      else if (s.startsWith('<![CDATA[', lt)) { const e = s.indexOf(']]>', lt + 9); top.k.push(s.slice(lt + 9, e < 0 ? len : e)); i = e < 0 ? len : e + 3; }
      else { let j = lt + 2, depth = 0; while (j < len) { const c = s.charCodeAt(j); if (c === 91) depth++; else if (c === 93) depth--; else if (c === 62 && depth <= 0) break; j++; } i = j + 1; }
      continue;
    }
    if (c1 === 63) { const e = s.indexOf('?>', lt + 2); i = e < 0 ? len : e + 2; continue; }
    let j = lt + 1, q = 0;                                                          // the end of the tag, skipping a ">" inside quotes
    while (j < len) { const c = s.charCodeAt(j); if (q) { if (c === q) q = 0; } else if (c === 34 || c === 39) q = c; else if (c === 62) break; j++; }
    if (j >= len) break;
    let inner = s.slice(lt + 1, j); i = j + 1;
    if (c1 === 47) {                                                                // a closing tag: close back to the element with that name
      const name = localName(inner.slice(1).trim());
      for (let d = stack.length - 1; d > 0; d--) if (stack[d].n === name) { stack.length = d; break; }
      continue;
    }
    const selfClosing = inner.charCodeAt(inner.length - 1) === 47;
    if (selfClosing) inner = inner.slice(0, -1);
    const sp = inner.search(/\s/), node = { n: localName(sp < 0 ? inner : inner.slice(0, sp)), a: null, k: [] };
    if (sp >= 0) parseAttributes(inner, sp, node);
    if (++nodes > 4e6) fail('toolarge');
    top.k.push(node);
    if (!selfClosing) { if (stack.length > 250) fail('broken'); stack.push(node); }
  }
  return root;
}
// name="value" or name='value' pairs from position `i` of a tag's text. A scanner, not a regular expression (those can take
// time that grows with the square of the length on a hostile tag). Anything that isn't a quoted pair is skipped.
function parseAttributes(s, i, node) {
  const n = s.length, space = c => c === 32 || c === 9 || c === 10 || c === 13 || c === 12;
  while (i < n) {
    while (i < n && space(s.charCodeAt(i))) i++;
    let j = i;
    while (j < n) { const c = s.charCodeAt(j); if (c === 61 || c === 47 || c === 62 || space(c)) break; j++; }
    if (j === i) { i++; continue; }
    const name = s.slice(i, j); i = j;
    while (i < n && space(s.charCodeAt(i))) i++;
    if (s.charCodeAt(i) !== 61) continue;
    i++; while (i < n && space(s.charCodeAt(i))) i++;
    const q = s.charCodeAt(i);
    if (q !== 34 && q !== 39) { while (i < n && !space(s.charCodeAt(i))) i++; continue; }
    const e = s.indexOf(q === 34 ? '"' : '\'', i + 1); if (e < 0) return;
    (node.a || (node.a = {}))[name] = xmlDecode(s.slice(i + 1, e)); i = e + 1;
  }
}
const isNode = x => typeof x !== 'string';
const kid = (node, name) => node.k.find(c => isNode(c) && c.n === name);
const kidsOf = (node, name) => node.k.filter(c => isNode(c) && c.n === name);
// An attribute by its full name, or (when the prefix differs) by its name without the prefix.
const attr = (node, name) => { const a = node.a; if (!a) return undefined; if (name in a) return a[name]; const ln = localName(name); for (const k in a) if (localName(k) === ln) return a[k]; return undefined; };
// Every piece of text below a node, joined.
function allText(node) { let s = ''; for (const c of node.k) s += isNode(c) ? allText(c) : c; return s; }
// Reads part `name` of a zip as xml (a missing part is an empty tree).
const partXml = (zip, name) => zip.has(name) ? parseXml(zip.get(name).toString('utf8')) : null;

// ---------------------------------------------------------------------------------------------------------------------
// Plain text. UTF-8 (with or without a BOM), UTF-16 (a BOM, or the pattern of zero bytes in English text), and anything
// that isn't valid UTF-8 as Windows-1252 (the Windows "ANSI" that is also what most "Latin-1" files really are). A file
// that is UTF-8 apart from a few stray bytes stays UTF-8. Newlines become \n, NULs and other control characters go.
const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
const decode1252 = b => b.toString('latin1').replace(/[\x80-\x9f]/g, c => CP1252[c.charCodeAt(0) - 0x80]);
// 1 for UTF-16 little-endian, 2 for big-endian, 0 for neither, judged by where the zero bytes of mostly-ASCII text fall.
function utf16Guess(b) {
  const n = Math.min(b.length, 4096) & ~1; if (n < 40) return 0;                 // too short to tell
  let even = 0, odd = 0; for (let i = 0; i < n; i += 2) { if (b[i] === 0) even++; if (b[i + 1] === 0) odd++; }
  const pairs = n / 2;
  return odd > pairs * 0.3 && even < pairs * 0.05 ? 1 : even > pairs * 0.3 && odd < pairs * 0.05 ? 2 : 0;
}
function decodeText(b) {
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return b.toString('utf8', 3);
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return b.toString('utf16le', 2, 2 + ((b.length - 2) & ~1));
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return Buffer.from(b.subarray(2, 2 + ((b.length - 2) & ~1))).swap16().toString('utf16le');
  const g = utf16Guess(b);
  if (g === 1) return b.toString('utf16le', 0, b.length & ~1);
  if (g === 2) return Buffer.from(b.subarray(0, b.length & ~1)).swap16().toString('utf16le');
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b); } catch { /* not clean UTF-8 */ }
  const loose = b.toString('utf8');
  let bad = 0, good = 0;
  for (let i = 0; i < loose.length; i++) { const c = loose.charCodeAt(i); if (c === 0xfffd) bad++; else if (c >= 0x80) good++; }
  return bad * 10 <= good ? loose : decode1252(b);
}
// The text of a file as one piece. { units: [{ at: '', text }] }; "There is no text in that file." when it has none.
export function readText(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : asBuffer(input);
  let t = decodeText(buf).replace(/\r\n?|\u2028|\u2029/g, '\n').replace(/\f/g, '\n\n').replace(/[\u0000-\u0008\u000b\u000e-\u001f\u007f-\u009f\ufeff\ufffd]/g, '');
  t = dropBlankStart(t).trimEnd();
  if (!t) fail('empty');
  const res = { units: [{ at: '', text: cutTo(t, MAX_CHARS) }] };
  if (t.length > MAX_CHARS) res.truncated = true;
  return res;
}

// ---------------------------------------------------------------------------------------------------------------------
// Units to one string and back. A unit with a label is written as its own line <<label>>, then its text, with a blank line
// between units; a unit with no label that comes after others is written <<>>, and the first unit with no label has no
// marker at all (so a text with no markers is one unit). A line inside a unit's text that looks like a marker gets one
// backslash in front (and loses it on the way back), so any text round-trips exactly. Labels keep every character except
// line breaks. Blank lines at the start of a unit's text and any whitespace at its end are not kept.
const LABEL_LINE = /^<<([^\n]*)>>$/, LOOKS_LIKE_LABEL = /^\\*<<[^\n]*>>$/;
const normalizeText = t => dropBlankStart(String(t ?? '').replace(/\r\n?/g, '\n')).trimEnd();
function renderUnit(u, needMark) {
  const at = String(u.at ?? '').replace(/[\r\n]+/g, ' ');
  const body = normalizeText(u.text).split('\n').map(l => (LOOKS_LIKE_LABEL.test(l) ? '\\' + l : l)).join('\n');
  return (at ? '<<' + at + '>>\n' : needMark ? '<<>>\n' : '') + body;
}
export function unitsToText(units) {
  const parts = [];
  for (const u of units || []) { if (!u || (!u.at && !normalizeText(u.text))) continue; parts.push(renderUnit(u, parts.length > 0)); }
  return parts.join('\n\n');
}
export function textToUnits(text) {
  const units = []; let cur = null;
  for (const line of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const m = LABEL_LINE.exec(line);
    if (m) { cur = { at: m[1], lines: [] }; units.push(cur); continue; }
    if (!cur) { if (!line.trim()) continue; cur = { at: '', lines: [] }; units.push(cur); }
    cur.lines.push(/^\\+<<[^\n]*>>$/.test(line) ? line.slice(1) : line);
  }
  return units.map(u => ({ at: u.at, text: normalizeText(u.lines.join('\n')) })).filter(u => u.at || u.text);
}

// ---------------------------------------------------------------------------------------------------------------------
// Pieces small enough to send to an AI. Consecutive units are packed into chunks of at most maxChars characters, counting each
// unit's label and text (not the <<>> and line breaks unitsToText adds, a few characters a unit). A unit that is longer is cut into
// several units that each keep its label: at a blank line if there is one, otherwise at the end of a sentence or a line,
// otherwise between words, and only in a word (never inside an emoji) when there is no other choice. A cut is only
// worth making in a tier when it leaves at least a fifth of the room, so a tiny first paragraph doesn't leave a tiny piece.
// Empty units are dropped and there is never an empty chunk.
export function chunkUnits(units, { maxChars = 12000 } = {}) {
  const max = Number.isFinite(maxChars) && maxChars >= 1 ? Math.floor(maxChars) : 12000;
  const pieces = [];
  for (const u of units || []) {
    const at = String((u && u.at) ?? ''), text = normalizeText(u && u.text);
    if (!text) continue;
    const room = Math.max(1, max - at.length);
    if (text.length <= room) pieces.push({ at, text });
    else for (const part of splitLong(text, room)) pieces.push({ at, text: part });
  }
  const chunks = []; let cur = [], size = 0;
  for (const p of pieces) {
    const cost = p.at.length + p.text.length;
    if (cur.length && size + cost > max) { chunks.push(cur); cur = []; size = 0; }
    size += cost; cur.push(p);
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}
function splitLong(text, room) {
  const out = []; let pos = 0;
  while (text.length - pos > room) {
    const win = text.slice(pos, pos + room + 1), cut = cutPoint(win, room);
    const piece = text.slice(pos, pos + cut).trim(); if (piece) out.push(piece);
    pos += cut; while (pos < text.length && /\s/.test(text[pos])) pos++;
  }
  const last = text.slice(pos).trim(); if (last) out.push(last);
  return out;
}
// Where to cut win (room + 1 characters) so the piece is at most `room` long. Returns the length of the piece.
function cutPoint(win, room) {
  const enough = Math.max(1, Math.floor(room / 5));
  let last = -1, m;
  const paragraph = /\n[ \t]*\n/g;
  while ((m = paragraph.exec(win)) && m.index <= room) last = m.index;
  if (last >= enough) return last;
  last = -1;
  const sentence = /[.!?…。！？][)"'’”\]]*(?=\s)|\n/g;
  while ((m = sentence.exec(win))) { const at = m[0] === '\n' ? m.index : m.index + m[0].length; if (at <= room) last = at; else break; }
  if (last >= enough) return last;
  last = -1;
  const space = /\s/g;
  while ((m = space.exec(win)) && m.index <= room) last = m.index;
  if (last >= 1) return last;
  const c = win.charCodeAt(room - 1);
  return c >= 0xd800 && c <= 0xdbff && room > 1 ? room - 1 : room;
}

// ---------------------------------------------------------------------------------------------------------------------
// The size of a picture from its header: PNG (IHDR), JPEG (walk the markers to the first frame header, skipping the
// EXIF and other segments), GIF (the screen descriptor) and WebP (lossy VP8, lossless VP8L, extended VP8X). null when
// it isn't one of those or is cut off before the size. The size is as stored; an EXIF rotation is not applied.
export function imageSize(input) {
  try {
    const b = input instanceof Uint8Array || input instanceof ArrayBuffer ? asBuffer(input) : null;
    if (!b || b.length < 12) return null;
    let w = 0, h = 0;
    if (b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') { if (b.length < 24 || ascii(b, 12, 16) !== 'IHDR') return null; w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
    else if (b[0] === 0xff && b[1] === 0xd8) {
      let p = 2;
      while (p + 4 <= b.length) {
        if (b[p] !== 0xff) { p++; continue; }
        const m = b[p + 1];
        if (m === 0xff) { p++; continue; }                                        // fill bytes
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { p += 2; continue; }     // markers with no length
        if (m === 0xd9 || m === 0xda) return null;                                // end of image or start of scan before any frame header
        const len = b.readUInt16BE(p + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { if (p + 9 > b.length) return null; h = b.readUInt16BE(p + 5); w = b.readUInt16BE(p + 7); break; }
        if (len < 2) return null;
        p += 2 + len;
      }
    } else if (ascii(b, 0, 4) === 'GIF8') { w = b.readUInt16LE(6); h = b.readUInt16LE(8); }
    else if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') {
      const kind = ascii(b, 12, 16);
      if (kind === 'VP8 ' && b.length >= 30 && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
      else if (kind === 'VP8L' && b.length >= 25 && b[20] === 0x2f) { const v = b.readUInt32LE(21); w = (v & 0x3fff) + 1; h = ((v >>> 14) & 0x3fff) + 1; }
      else if (kind === 'VP8X' && b.length >= 30) { w = b.readUIntLE(24, 3) + 1; h = b.readUIntLE(27, 3) + 1; }
    }
    return w > 0 && h > 0 ? { width: w, height: h } : null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------------------------------------------------
// How long a sound is, in seconds, read from the file's own headers (nothing is decoded): WAV and AIFF (the size of the
// sound data over its byte rate), MP3 (a Xing/Info/VBRI header's frame count, else the frames are counted when the bitrate
// varies, else size over bitrate), MP4/M4A (the movie header; for the fragmented kind a browser records, the fragments'
// sample durations), Ogg Opus/Vorbis (the last page's position over the sample rate), WebM (the Duration in Info when it's
// there; a browser recording has none, so the last cluster's time plus the last block's offset), FLAC (STREAMINFO) and AAC
// ADTS (counting frames). null when it can't tell. A file cut short is read as far as it goes. Never throws.
export function audioSeconds(input) {
  try {
    const b = input instanceof Uint8Array || input instanceof ArrayBuffer ? asBuffer(input) : null;
    if (!b || b.length < 8) return null;
    const s = probe(b);
    return typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : null;
  } catch { return null; }
}
const MP4_FIRST = new Set(['ftyp', 'moov', 'mdat', 'free', 'skip', 'wide', 'pnot', 'styp', 'moof']);
function probe(b) {
  const tag = ascii(b, 0, 4);
  if ((tag === 'RIFF' || tag === 'RF64') && ascii(b, 8, 12) === 'WAVE') return wavSeconds(b);
  if (tag === 'FORM' && /^AIF[FC]$/.test(ascii(b, 8, 12))) return aiffSeconds(b);
  if (tag === 'OggS') return oggSeconds(b);
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return webmSeconds(b);
  if (MP4_FIRST.has(ascii(b, 4, 8))) return mp4Seconds(b);
  const o = id3End(b);
  if (ascii(b, o, o + 4) === 'fLaC') return flacSeconds(b, o);
  if (b[o] === 0xff && (b[o + 1] & 0xf6) === 0xf0) return adtsSeconds(b, o);
  return mp3Seconds(b, o);
}
// Where the sound starts after any ID3v2 tags (a tag is 10 bytes, its size, and 10 more when it has a footer).
function id3End(b) {
  let o = 0;
  while (o + 10 <= b.length && ascii(b, o, o + 3) === 'ID3' && b[o + 3] < 0xff && b[o + 6] < 0x80) o += 10 + ((b[o + 6] << 21) | (b[o + 7] << 14) | (b[o + 8] << 7) | b[o + 9]) + (b[o + 5] & 0x10 ? 10 : 0);
  return Math.min(o, b.length);
}
// RIFF chunks: "fmt " says how many bytes a second of sound takes, "data" how many bytes there are. A streamed file says 0 or
// 0xFFFFFFFF for the size, and a cut file has less than it says: both mean "what is there".
function wavSeconds(b) {
  let pos = 12, byteRate = 0, rate = 0, align = 0, format = 1, fact = 0;
  while (pos + 8 <= b.length) {
    const id = ascii(b, pos, pos + 4), size = b.readUInt32LE(pos + 4), body = pos + 8;
    if (id === 'fmt ' && body + 16 <= b.length) { format = b.readUInt16LE(body); rate = b.readUInt32LE(body + 4); byteRate = b.readUInt32LE(body + 8); align = b.readUInt16LE(body + 12); if (!byteRate && rate && align) byteRate = rate * align; }
    else if (id === 'fact' && body + 4 <= b.length) fact = b.readUInt32LE(body);
    else if (id === 'data') {
      const have = b.length - body, n = size === 0 || size === 0xffffffff || size > have ? have : size;
      if (fact && rate && format !== 1 && format !== 3 && format !== 0xfffe) return fact / rate;      // compressed: the "fact" chunk counts the samples
      return byteRate > 0 ? n / byteRate : null;
    }
    pos = nextChunk(b, body, size);
  }
  return null;
}
// Where the next RIFF/IFF chunk starts: after the body and, for an odd size, one pad byte. Some writers forget the pad
// byte; when the padded spot doesn't start with a name but the unpadded one does, that's the one.
function nextChunk(b, body, size) {
  const padded = body + size + (size & 1), plain = body + size, name = p => p + 4 <= b.length && /^[ -~]{4}$/.test(ascii(b, p, p + 4));
  return size & 1 && !name(padded) && name(plain) ? plain : padded;
}
// AIFF: the COMM chunk has the number of sample frames and the sample rate as an 80-bit float.
function aiffSeconds(b) {
  for (let pos = 12; pos + 8 <= b.length;) {
    const id = ascii(b, pos, pos + 4), size = b.readUInt32BE(pos + 4), body = pos + 8;
    if (id === 'COMM' && body + 18 <= b.length) {
      const frames = b.readUInt32BE(body + 2), exp = ((b[body + 8] & 0x7f) << 8) | b[body + 9];
      const rate = (b.readUInt32BE(body + 10) * 4294967296 + b.readUInt32BE(body + 14)) * 2 ** (exp - 16383 - 63);
      return rate > 0 ? frames / rate : null;
    }
    pos = nextChunk(b, body, size);
  }
  return null;
}
// FLAC: the first metadata block is STREAMINFO: a 20-bit sample rate and a 36-bit count of samples (0 means unknown).
function flacSeconds(b, o) {
  for (let p = o + 4, i = 0; i < 64 && p + 4 <= b.length; i++) {
    const h = b[p], len = (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3];
    if ((h & 0x7f) === 0) {
      const d = p + 4; if (len < 34 || d + 18 > b.length) return null;
      const rate = (b[d + 10] << 12) | (b[d + 11] << 4) | (b[d + 12] >> 4), total = (b[d + 13] & 15) * 4294967296 + b.readUInt32BE(d + 14);
      return rate && total ? total / rate : null;
    }
    if (h & 0x80) break;
    p += 4 + len;
  }
  return null;
}
// AAC in ADTS frames: each frame is 1024 samples (times the raw blocks it holds); the sample rate is in the header.
function adtsSeconds(b, o) {
  const RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350], rate = RATES[(b[o + 2] >> 2) & 15];
  if (!rate) return null;
  let frames = 0, p = o;
  while (p + 7 <= b.length) {
    if (b[p] !== 0xff || (b[p + 1] & 0xf6) !== 0xf0) {                          // lost the beat: look a little way ahead
      const lim = Math.min(b.length - 7, p + 4096); let q = p + 1;
      while (q < lim && !(b[q] === 0xff && (b[q + 1] & 0xf6) === 0xf0)) q++;
      if (q >= lim) break;
      p = q; continue;
    }
    const len = ((b[p + 3] & 3) << 11) | (b[p + 4] << 3) | (b[p + 5] >> 5);
    if (len < 7 || p + len > b.length) break;
    frames += (b[p + 6] & 3) + 1; p += len;
  }
  return frames ? frames * 1024 / rate : null;
}
// MP3. A frame header is 4 bytes: sync, version, layer, bitrate, sample rate, padding, channel mode.
const MP3_RATES = { 1: [[], [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]],
  2: [[], [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]] };
function mp3Header(b, p) {
  if (p + 4 > b.length || b[p] !== 0xff || (b[p + 1] & 0xe0) !== 0xe0) return null;
  const vbits = (b[p + 1] >> 3) & 3, lbits = (b[p + 1] >> 1) & 3, bri = b[p + 2] >> 4, sri = (b[p + 2] >> 2) & 3;
  if (vbits === 1 || lbits === 0 || bri === 0 || bri === 15 || sri === 3) return null;
  const v = vbits === 3 ? 1 : 2, layer = 4 - lbits, sr = [44100, 48000, 32000][sri] / (vbits === 3 ? 1 : vbits === 2 ? 2 : 4);
  const br = MP3_RATES[v][layer][bri] * 1000, pad = (b[p + 2] >> 1) & 1, big = layer === 3 && v === 2;
  const len = layer === 1 ? (Math.floor(12 * br / sr) + pad) * 4 : Math.floor((big ? 72 : 144) * br / sr) + pad;
  return { v, layer, br, sr, mono: (b[p + 3] >> 6) === 3, crc: !(b[p + 1] & 1), samples: layer === 1 ? 384 : big ? 576 : 1152, len };
}
function mp3Seconds(b, o) {
  let p = o, h = null; const limit = Math.min(b.length - 4, o + 65536);
  for (; p < limit; p++) {                                                      // the first real frame: another frame (or the end of the file) follows it
    h = mp3Header(b, p); if (!h) continue;
    const next = p + h.len, h2 = next + 4 <= b.length ? mp3Header(b, next) : null;
    if (next + 4 > b.length || (h2 && h2.v === h.v && h2.layer === h.layer && h2.sr === h.sr)) break;
    h = null;
  }
  if (!h) return null;
  const x = p + 4 + (h.crc ? 2 : 0) + (h.v === 1 ? (h.mono ? 17 : 32) : (h.mono ? 9 : 17)), tag = ascii(b, x, x + 4);
  if ((tag === 'Xing' || tag === 'Info') && x + 12 <= b.length && (b.readUInt32BE(x + 4) & 1)) { const frames = b.readUInt32BE(x + 8); if (frames > 0) return frames * h.samples / h.sr; }
  if (ascii(b, p + 36, p + 40) === 'VBRI' && p + 54 <= b.length) { const frames = b.readUInt32BE(p + 50); if (frames > 0) return frames * h.samples / h.sr; }
  let same = true, q = p;                                                        // no header: do the first frames all have one bitrate?
  for (let i = 0; i < 12 && q + 4 <= b.length; i++) { const f = mp3Header(b, q); if (!f) break; if (f.br !== h.br) same = false; q += f.len; }
  if (same) { let end = b.length; if (end - 128 >= p && ascii(b, end - 128, end - 125) === 'TAG') end -= 128; return (end - p) * 8 / h.br; }
  let secs = 0; q = p;                                                           // a variable bitrate with no header: count every frame
  while (q + 4 <= b.length) {
    const f = mp3Header(b, q);
    if (f && q + f.len <= b.length) { secs += f.samples / f.sr; q += f.len; continue; }
    q = b.indexOf(0xff, q + 1); if (q < 0) break;
  }
  return secs;
}
// Ogg: the first page names the codec and its sample rate; the last page that finished a packet has the position (in
// samples) the sound has reached. Opus counts in 48000ths of a second whatever the original rate, and starts `pre-skip` early.
function oggSeconds(b) {
  if (b.length < 28) return null;
  const start = 27 + b[26]; if (start > b.length) return null;
  const d = b.subarray(start, Math.min(b.length, start + 80));
  let rate = 0, skip = 0;
  if (ascii(d, 0, 8) === 'OpusHead' && d.length >= 12) { rate = 48000; skip = d.readUInt16LE(10); }
  else if (d[0] === 1 && ascii(d, 1, 7) === 'vorbis' && d.length >= 16) rate = d.readUInt32LE(12);
  else if (ascii(d, 0, 8) === 'Speex   ' && d.length >= 40) rate = d.readUInt32LE(36);
  else if (d[0] === 0x7f && ascii(d, 1, 5) === 'FLAC' && d.length >= 30) rate = (d[27] << 12) | (d[28] << 4) | (d[29] >> 4);
  if (!rate) return null;
  const OGGS = Buffer.from('OggS');
  for (let from = b.length, tries = 0; tries < 400; tries++) {
    const p = from > 0 ? b.lastIndexOf(OGGS, from - 1) : -1;
    if (p < 0) break;
    from = p;
    if (p + 27 > b.length || b[p + 4] !== 0 || (b[p + 5] & 0xf8) !== 0) continue;
    let end = p + 27 + b[p + 26]; if (end > b.length) { /* a cut page: its header is still good */ } else { for (let i = 0; i < b[p + 26]; i++) end += b[p + 27 + i]; if (end < b.length && ascii(b, end, end + 4) !== 'OggS') continue; }
    const g = b.readBigUInt64LE(p + 6); if (g === 0xffffffffffffffffn) continue;
    return Math.max(0, Number(g) - skip) / rate;
  }
  return null;
}
// WebM/Matroska (EBML). Walks the elements without a tree: the containers that matter (Segment, Info, Cluster, BlockGroup)
// are looked inside, everything else is skipped by its size, so elements of unknown size (a live recording) are fine.
const vintLen = b0 => (b0 === 0 || b0 === undefined ? 0 : Math.clz32(b0) - 23);
function webmSeconds(b) {
  const n = b.length;
  let pos = 0, scale = 1e6, dur = 0, cluster = 0, last = 0, lastBlock = 0, blocks = false;
  while (pos < n) {
    const il = vintLen(b[pos]); if (!il || pos + il > n) break;
    let id = 0; for (let k = 0; k < il; k++) id = id * 256 + b[pos + k];
    const sp = pos + il, sl = vintLen(b[sp]); if (!sl || sp + sl > n) break;
    let size = b[sp] & (0xff >> sl), unknown = size === (0xff >> sl);
    for (let k = 1; k < sl; k++) { size = size * 256 + b[sp + k]; if (b[sp + k] !== 0xff) unknown = false; }
    const data = sp + sl;
    if (id === 0x18538067 || id === 0x1549a966 || id === 0x1f43b675 || id === 0xa0) { pos = data; continue; }
    const have = Math.min(size, n - data);
    if (id === 0x2ad7b1 && have > 0 && have <= 6) { scale = 0; for (let k = 0; k < have; k++) scale = scale * 256 + b[data + k]; }
    else if (id === 0x4489 && size === 4 && have === 4) dur = b.readFloatBE(data);
    else if (id === 0x4489 && size === 8 && have === 8) dur = b.readDoubleBE(data);
    else if (id === 0xe7 && have > 0 && have <= 6) { cluster = 0; for (let k = 0; k < have; k++) cluster = cluster * 256 + b[data + k]; }
    else if ((id === 0xa3 || id === 0xa1) && have >= 4) {
      const tl = vintLen(b[data]);
      if (tl && data + tl + 2 <= n) { lastBlock = cluster + b.readInt16BE(data + tl); last = Math.max(last, lastBlock); blocks = true; }
    } else if (id === 0x9b && have > 0 && have <= 6) { let bd = 0; for (let k = 0; k < have; k++) bd = bd * 256 + b[data + k]; last = Math.max(last, lastBlock + bd); }
    if (unknown) break;
    pos = data + size;
  }
  if (dur > 0 && scale > 0) return dur * scale / 1e9;
  return blocks && scale > 0 ? last * scale / 1e9 : null;
}
// MP4 boxes: size, name, contents. A box whose size runs past the end of the file (a cut file) is read as far as it goes.
function* boxes(b, start, end) {
  for (let p = start; p + 8 <= end;) {
    let size = b.readUInt32BE(p), hdr = 8;
    if (size === 1) { if (p + 16 > end) return; size = Number(b.readBigUInt64BE(p + 8)); hdr = 16; }
    else if (size === 0) size = end - p;
    if (!(size >= hdr)) return;
    yield { type: ascii(b, p + 4, p + 8), body: p + hdr, end: Math.min(p + size, end) };
    p += size;
  }
}
// The movie header has the length (a duration in ticks over a timescale). A browser's recording is fragmented: the movie
// header says 0, and the length is the sum of the sample durations in every fragment (moof), over the track's timescale.
function mp4Seconds(b) {
  let movieScale = 0, movieDur = 0, mehd = 0; const tracks = [], trexDur = new Map(), frag = new Map();
  const unk = v => v === 0xffffffff || v >= 2 ** 63 ? 0 : v;
  const headerTimes = m => {                                                // mvhd and mdhd share a layout: version, then times, timescale, duration
    if (m.body + 4 > m.end) return null;
    if (b[m.body] === 1) return m.body + 32 <= m.end ? { scale: b.readUInt32BE(m.body + 20), dur: unk(Number(b.readBigUInt64BE(m.body + 24))) } : null;
    return m.body + 20 <= m.end ? { scale: b.readUInt32BE(m.body + 12), dur: unk(b.readUInt32BE(m.body + 16)) } : null;
  };
  for (const top of boxes(b, 0, b.length)) {
    if (top.type === 'moov') {
      for (const m of boxes(b, top.body, top.end)) {
        if (m.type === 'mvhd') { const t = headerTimes(m); if (t) { movieScale = t.scale; movieDur = t.dur; } }
        else if (m.type === 'trak') {
          const tr = { id: 0, kind: '', scale: 0, dur: 0 };
          for (const x of boxes(b, m.body, m.end)) {
            if (x.type === 'tkhd' && x.body + 24 <= x.end) tr.id = b.readUInt32BE(x.body + (b[x.body] === 1 ? 20 : 12));
            else if (x.type === 'mdia') for (const y of boxes(b, x.body, x.end)) {
              if (y.type === 'mdhd') { const t = headerTimes(y); if (t) { tr.scale = t.scale; tr.dur = t.dur; } }
              else if (y.type === 'hdlr' && y.body + 12 <= y.end) tr.kind = ascii(b, y.body + 8, y.body + 12);
            }
          }
          tracks.push(tr);
        } else if (m.type === 'mvex') {
          for (const x of boxes(b, m.body, m.end)) {
            if (x.type === 'mehd' && x.body + 8 <= x.end) mehd = b[x.body] === 1 && x.body + 12 <= x.end ? Number(b.readBigUInt64BE(x.body + 4)) : b.readUInt32BE(x.body + 4);
            else if (x.type === 'trex' && x.body + 24 <= x.end) trexDur.set(b.readUInt32BE(x.body + 4), b.readUInt32BE(x.body + 12));
          }
        }
      }
    } else if (top.type === 'moof') {
      for (const traf of boxes(b, top.body, top.end)) {
        if (traf.type !== 'traf') continue;
        let id = 0, def = 0, sum = 0;
        for (const x of boxes(b, traf.body, traf.end)) {
          if (x.type === 'tfhd' && x.body + 8 <= x.end) {
            const flags = b.readUInt32BE(x.body) & 0xffffff; id = b.readUInt32BE(x.body + 4); let q = x.body + 8;
            if (flags & 1) q += 8; if (flags & 2) q += 4;
            def = flags & 8 && q + 4 <= x.end ? b.readUInt32BE(q) : trexDur.get(id) || 0;
          } else if (x.type === 'trun' && x.body + 8 <= x.end) {
            const flags = b.readUInt32BE(x.body) & 0xffffff, count = b.readUInt32BE(x.body + 4); let q = x.body + 8;
            if (flags & 1) q += 4; if (flags & 4) q += 4;
            if (!(flags & 0x100)) { sum += count * (def || trexDur.get(id) || 0); continue; }
            const each = 4 + (flags & 0x200 ? 4 : 0) + (flags & 0x400 ? 4 : 0) + (flags & 0x800 ? 4 : 0);
            for (let i = 0; i < count && q + each <= x.end; i++, q += each) sum += b.readUInt32BE(q);
          }
        }
        if (id) frag.set(id, (frag.get(id) || 0) + sum);
      }
    }
  }
  const audio = tracks.find(t => t.kind === 'soun') || tracks[0];
  if (movieDur > 0 && movieScale > 0) return movieDur / movieScale;
  if (mehd > 0 && movieScale > 0) return mehd / movieScale;
  if (audio && audio.scale && frag.size) { const ticks = frag.get(audio.id) ?? Math.max(...frag.values()); if (ticks > 0) return ticks / audio.scale; }
  return audio && audio.scale && audio.dur ? audio.dur / audio.scale : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 1: reading the file's syntax. A PDF is numbers, names (/Type), strings, arrays, dictionaries and streams.
// Objects are read from a Buffer by a small lexer; the same lexer reads page content (the drawing instructions), which is
// the same syntax with operators in postfix. PDF strings are bytes, so they are kept as strings whose characters are the
// bytes (latin1). Dictionaries have no prototype (a key named __proto__ is just a key).
const WS = new Uint8Array(256), DL = new Uint8Array(256);
for (const c of [0, 9, 10, 12, 13, 32]) WS[c] = 1;
for (const c of '()<>[]{}/%') DL[c.charCodeAt(0)] = 1;
class Name { constructor(name) { this.name = name; } }
class Cmd { constructor(cmd) { this.cmd = cmd; } }
class Ref { constructor(num, gen) { this.num = num; this.gen = gen; } }
class PStr { constructor(s) { this.s = s; } }
class Stream { constructor(dict, start, num = 0, gen = 0) { this.dict = dict; this.start = start; this.num = num; this.gen = gen; } }
const END = Symbol('end'), ARRAY_END = new Cmd(']'), DICT_END = new Cmd('>>');
const STOPPERS = new Set(['endobj', 'stream', 'endstream', 'obj', 'trailer', 'xref', 'startxref']);
const nameCache = new Map(), cmdCache = new Map();
function intern(cache, make, key) { let v = cache.get(key); if (!v) { if (cache.size > 30000) cache.clear(); v = make(key); cache.set(key, v); } return v; }
const mkName = s => intern(nameCache, k => new Name(k), s), mkCmd = s => intern(cmdCache, k => new Cmd(k), s);
const isDict = v => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === null;
const nameOf = v => (v instanceof Name ? v.name : undefined);
const numOf = v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

class Lexer {
  constructor(b, pos = 0, end = b.length) { this.b = b; this.pos = pos; this.end = end; }
  // Skips white space and comments.
  skip() {
    const b = this.b, end = this.end; let p = this.pos;
    for (;;) {
      while (p < end && WS[b[p]]) p++;
      if (p < end && b[p] === 37) { while (p < end && b[p] !== 10 && b[p] !== 13) p++; continue; }
      break;
    }
    this.pos = p;
  }
  // The next object: a number, Name, PStr, array, dictionary, true/false/null, or a Cmd (an operator or keyword); END at the
  // end of the data. With `refs`, "12 0 R" is one Ref. Nesting deeper than 100 gives up on the rest of the data.
  read(refs, depth = 0) {
    this.skip();
    const b = this.b, p = this.pos;
    if (p >= this.end) return END;
    const c = b[p];
    if ((c >= 48 && c <= 57) || c === 43 || c === 45 || c === 46) return this.number(refs);
    switch (c) {
      case 47: return this.name();
      case 40: return this.string();
      case 60: if (b[p + 1] === 60) { this.pos = p + 2; return this.dict(refs, depth); } return this.hex();
      case 62: if (b[p + 1] === 62) { this.pos = p + 2; return DICT_END; } this.pos = p + 1; return mkCmd('>');
      case 91: this.pos = p + 1; return this.array(refs, depth);
      case 93: this.pos = p + 1; return ARRAY_END;
      case 41: case 123: case 125: this.pos = p + 1; return mkCmd(String.fromCharCode(c));
    }
    return this.keyword();
  }
  number(refs) {
    const b = this.b, end = this.end, start = this.pos; let p = start, neg = false, v = 0, digits = 0, dot = false, scale = 1;
    while (p < end && (b[p] === 43 || b[p] === 45)) { if (b[p] === 45) neg = true; p++; }
    for (; p < end; p++) {
      const d = b[p];
      if (d >= 48 && d <= 57) { digits++; if (dot) { scale /= 10; v += (d - 48) * scale; } else v = v * 10 + (d - 48); }
      else if (d === 46 && !dot) dot = true;
      else break;
    }
    if (!digits) { this.pos = Math.max(p, start + 1); return mkCmd(b.toString('latin1', start, this.pos)); }
    this.pos = p;
    if (refs && !dot && !neg && b[start] !== 43) {                                // "12 0 R": a whole number, a space, a whole number, a space, R
      let q = p; while (q < end && WS[b[q]]) q++;
      if (q > p) {
        let g = 0, gd = 0; while (q < end && b[q] >= 48 && b[q] <= 57 && gd < 7) { g = g * 10 + (b[q] - 48); q++; gd++; }
        if (gd) { let r = q; while (r < end && WS[b[r]]) r++; if (r > q && b[r] === 82 && (r + 1 >= end || WS[b[r + 1]] || DL[b[r + 1]])) { this.pos = r + 1; return new Ref(v, g); } }
      }
    }
    return neg ? -v : v;
  }
  name() {
    const b = this.b, end = this.end, st = this.pos + 1; let p = st;
    while (p < end && !WS[b[p]] && !DL[b[p]]) p++;
    let s = b.toString('latin1', st, p);
    if (s.indexOf('#') >= 0) s = s.replace(/#([0-9a-fA-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
    this.pos = p; return mkName(s);
  }
  // A (string): balanced parentheses, escapes \n \r \t \b \f \( \) \\ \ddd and a backslash at a line end; a bare line end is a \n.
  string() {
    const b = this.b, end = this.end, st = this.pos + 1; let p = st, depth = 1, plain = true;
    while (p < end) {
      const c = b[p];
      if (c === 92) { plain = false; p += 2; continue; }
      if (c === 13) plain = false;
      if (c === 40) depth++; else if (c === 41 && --depth === 0) break;
      p++;
    }
    const stop = Math.min(p, end); this.pos = Math.min(p + 1, end);
    if (plain) return new PStr(b.toString('latin1', st, stop));
    const out = Buffer.allocUnsafe(stop - st); let n = 0;
    for (let q = st; q < stop; q++) {
      const c = b[q];
      if (c === 92) {
        const e = b[++q];
        switch (e) {
          case 110: out[n++] = 10; break; case 114: out[n++] = 13; break; case 116: out[n++] = 9; break; case 98: out[n++] = 8; break; case 102: out[n++] = 12; break;
          case 13: if (b[q + 1] === 10) q++; break;
          case 10: break;
          default:
            if (e >= 48 && e <= 55) { let v = e - 48; for (let k = 0; k < 2 && b[q + 1] >= 48 && b[q + 1] <= 55; k++) v = v * 8 + (b[++q] - 48); out[n++] = v & 255; }
            else if (e !== undefined && n < out.length) out[n++] = e;
        }
      } else if (c === 13) { if (b[q + 1] === 10) q++; out[n++] = 10; }
      else out[n++] = c;
    }
    return new PStr(out.toString('latin1', 0, n));
  }
  // A <hex string>: pairs of hex digits, white space ignored, a last lone digit counts as followed by 0.
  hex() {
    const b = this.b, end = this.end, st = this.pos + 1; let p = st;
    while (p < end && b[p] !== 62) p++;
    const stop = p; this.pos = Math.min(p + 1, end);
    const out = Buffer.allocUnsafe(((stop - st) >> 1) + 1); let n = 0, hi = -1;
    for (let q = st; q < stop; q++) {
      const c = b[q], d = c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1;
      if (d < 0) continue;
      if (hi < 0) hi = d; else { out[n++] = hi * 16 + d; hi = -1; }
    }
    if (hi >= 0) out[n++] = hi * 16;
    return new PStr(out.toString('latin1', 0, n));
  }
  array(refs, depth) {
    if (depth > 100) { this.pos = this.end; return []; }
    const out = [];
    for (;;) {
      this.skip(); const before = this.pos;
      const v = this.read(refs, depth + 1);
      if (v === END || v === ARRAY_END) break;
      if (v instanceof Cmd) { if (STOPPERS.has(v.cmd)) { this.pos = before; break; } continue; }
      out.push(v);
    }
    return out;
  }
  dict(refs, depth) {
    const d = Object.create(null);
    if (depth > 100) { this.pos = this.end; return d; }
    for (;;) {
      this.skip(); const before = this.pos;
      const k = this.read(refs, depth + 1);
      if (k === END || k === DICT_END) break;
      if (k instanceof Cmd) { if (STOPPERS.has(k.cmd)) { this.pos = before; break; } continue; }
      if (!(k instanceof Name)) continue;
      this.skip(); const before2 = this.pos;
      const v = this.read(refs, depth + 1);
      if (v === END) break;
      if (v === DICT_END) { d[k.name] = null; break; }
      if (v instanceof Cmd) { if (STOPPERS.has(v.cmd)) { this.pos = before2; break; } continue; }
      d[k.name] = v;
    }
    return d;
  }
  keyword() {
    const b = this.b, end = this.end, st = this.pos; let p = st;
    while (p < end && !WS[b[p]] && !DL[b[p]]) p++;
    if (p === st) p++;
    this.pos = p;
    const s = b.toString('latin1', st, p);
    return s === 'true' ? true : s === 'false' ? false : s === 'null' ? null : mkCmd(s);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 2: stream filters. FlateDecode first with the real zlib; damaged data (a wrong checksum, no header, cut short or
// corrupt in the middle) is salvaged with a small inflater of our own that keeps whatever came out before the damage.
// Also LZWDecode, ASCII85Decode, ASCIIHexDecode and RunLengthDecode, and the PNG and TIFF predictors.
const STREAM_CAP = 50e6;                       // the most one stream may inflate to
const INFLATE_BUDGET = 400e6;                  // the most all the streams of one file may inflate to, together
const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258], LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577], DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
function huffman(lengths) {
  const count = new Uint16Array(16), symbol = new Uint16Array(lengths.length), offs = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) count[lengths[i]]++;
  for (let l = 1; l < 15; l++) offs[l + 1] = offs[l] + count[l];
  for (let s = 0; s < lengths.length; s++) if (lengths[s]) symbol[offs[lengths[s]]++] = s;
  return { count, symbol };
}
let fixedTables = null;
// Inflates as much of a raw deflate stream as can be read, quietly stopping at the first damage, the end of the data or
// `limit` bytes. Slow (a bit at a time), so it is only used for streams the real inflate refused.
function inflateSalvage(src, limit) {
  const BAD = new Error('bad');
  let pos = 0, bitBuf = 0, bitCnt = 0, n = 0, out = new Uint8Array(Math.min(Math.max(src.length * 3, 4096), limit));
  const bits = k => {
    if (k === 0) return 0;
    while (bitCnt < k) { if (pos >= src.length) throw BAD; bitBuf |= src[pos++] << bitCnt; bitCnt += 8; }
    const v = bitBuf & ((1 << k) - 1); bitBuf >>>= k; bitCnt -= k; return v;
  };
  const decode = h => {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len <= 15; len++) { code |= bits(1); const c = h.count[len]; if (code - c < first) return h.symbol[index + (code - first)]; index += c; first += c; first <<= 1; code <<= 1; }
    throw BAD;
  };
  const put = v => { if (n >= out.length) { if (n >= limit) throw BAD; const bigger = new Uint8Array(Math.min(out.length * 2, limit)); bigger.set(out); out = bigger; } out[n++] = v; };
  const codes = (lit, dist) => {
    for (;;) {
      let sym = decode(lit);
      if (sym < 256) put(sym);
      else if (sym === 256) return;
      else {
        sym -= 257; if (sym >= 29) throw BAD;
        const len = LEN_BASE[sym] + bits(LEN_EXTRA[sym]), ds = decode(dist); if (ds >= 30) throw BAD;
        const d = DIST_BASE[ds] + bits(DIST_EXTRA[ds]); if (d > n) throw BAD;
        for (let i = 0; i < len; i++) put(out[n - d]);
      }
    }
  };
  try {
    for (;;) {
      const last = bits(1), type = bits(2);
      if (type === 0) {
        bitBuf = 0; bitCnt = 0; if (pos + 4 > src.length) throw BAD;
        const len = src[pos] | (src[pos + 1] << 8); pos += 4;
        for (let i = 0; i < len; i++) { if (pos >= src.length) throw BAD; put(src[pos++]); }
      } else if (type === 1) {
        if (!fixedTables) { const l = new Uint8Array(288); l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280, 288); fixedTables = [huffman(l), huffman(new Uint8Array(30).fill(5))]; }
        codes(fixedTables[0], fixedTables[1]);
      } else if (type === 2) {
        const nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4;
        if (nlen > 286 || ndist > 30) throw BAD;
        const cl = new Uint8Array(19); for (let i = 0; i < ncode; i++) cl[CODE_ORDER[i]] = bits(3);
        const clh = huffman(cl), all = new Uint8Array(nlen + ndist);
        for (let i = 0; i < nlen + ndist;) {
          const sym = decode(clh);
          if (sym < 16) all[i++] = sym;
          else {
            let rep, val = 0;
            if (sym === 16) { if (i === 0) throw BAD; val = all[i - 1]; rep = 3 + bits(2); } else if (sym === 17) rep = 3 + bits(3); else rep = 11 + bits(7);
            if (i + rep > nlen + ndist) throw BAD;
            while (rep--) all[i++] = val;
          }
        }
        codes(huffman(all.subarray(0, nlen)), huffman(all.subarray(nlen)));
      } else throw BAD;
      if (last) break;
    }
  } catch { /* the damage, the end of the data, or the limit: keep what came out */ }
  return Buffer.from(out.buffer, 0, n);
}
// A byte buffer that grows as needed and never beyond STREAM_CAP.
class Bytes {
  constructor(hint) { this.b = Buffer.allocUnsafe(Math.min(Math.max(hint, 64), STREAM_CAP)); this.n = 0; }
  room(k) {
    if (this.n + k <= this.b.length) return true;
    if (this.n + k > STREAM_CAP) return false;
    const nb = Buffer.allocUnsafe(Math.min(Math.max(this.b.length * 2, this.n + k), STREAM_CAP)); this.b.copy(nb, 0, 0, this.n); this.b = nb; return true;
  }
  push(v) { if (!this.room(1)) return false; this.b[this.n++] = v; return true; }
  fill(v, k) { if (!this.room(k)) return false; this.b.fill(v, this.n, this.n + k); this.n += k; return true; }
  done() { return this.b.subarray(0, this.n); }
}
// LZWDecode (the PDF/TIFF kind): 9 to 12 bit codes, most significant bit first; 256 clears the table, 257 ends the data.
// `early` (EarlyChange, default 1) makes the codes get longer one entry sooner.
function lzwDecode(data, early) {
  const prefix = new Int32Array(4096), suffix = new Uint8Array(4096), first = new Uint8Array(4096), size = new Uint32Array(4096), out = new Bytes(data.length * 4);
  let next = 258, bits = 9, prev = -1, acc = 0, nb = 0, pos = 0;
  const emit = code => {
    const len = code < 256 ? 1 : size[code]; if (!out.room(len)) return false;
    for (let c = code, i = len - 1; i >= 0; i--) { if (c < 256) out.b[out.n + i] = c; else { out.b[out.n + i] = suffix[c]; c = prefix[c]; } }
    out.n += len; return true;
  };
  const add = (p, ch) => { if (next < 4096) { prefix[next] = p; suffix[next] = ch; size[next] = (p < 256 ? 1 : size[p]) + 1; first[next] = p < 256 ? p : first[p]; next++; } };
  for (;;) {
    while (nb < bits) { if (pos >= data.length) return out.done(); acc = ((acc << 8) | data[pos++]) >>> 0; nb += 8; }
    const code = (acc >>> (nb - bits)) & ((1 << bits) - 1); nb -= bits; acc &= (1 << nb) - 1;
    if (code === 256) { next = 258; bits = 9; prev = -1; continue; }
    if (code === 257) break;
    if (prev < 0) { if (code >= 256) break; if (!emit(code)) break; prev = code; continue; }
    if (code < next) { if (!emit(code)) break; add(prev, code < 256 ? code : first[code]); }
    else if (code === next) { add(prev, prev < 256 ? prev : first[prev]); if (!emit(code)) break; }
    else break;
    prev = code;
    const t = next + early; bits = t >= 2048 ? 12 : t >= 1024 ? 11 : t >= 512 ? 10 : 9;
  }
  return out.done();
}
function a85Decode(d) {
  const out = new Bytes(d.length); let group = [], i = 0;
  if (d[0] === 60 && d[1] === 126) i = 2;                                         // some writers start with <~
  const put = (v, k) => { for (let s = 24, j = 0; j < k; j++, s -= 8) out.push(Math.floor(v / 2 ** s) & 255); };
  for (; i < d.length; i++) {
    const c = d[i];
    if (c === 126) break;
    if (WS[c]) continue;
    if (c === 122 && group.length === 0) { if (!out.fill(0, 4)) break; continue; }
    if (c < 33 || c > 117) continue;
    group.push(c - 33);
    if (group.length === 5) { let v = 0; for (const g of group) v = v * 85 + g; put(v, 4); group = []; }
  }
  if (group.length > 1) { const k = group.length; while (group.length < 5) group.push(84); let v = 0; for (const g of group) v = v * 85 + g; put(v, k - 1); }
  return out.done();
}
function hexDecode(d) {
  const out = Buffer.allocUnsafe((d.length >> 1) + 1); let n = 0, hi = -1;
  for (let i = 0; i < d.length; i++) {
    const c = d[i]; if (c === 62) break;
    const v = c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1;
    if (v < 0) continue;
    if (hi < 0) hi = v; else { out[n++] = hi * 16 + v; hi = -1; }
  }
  if (hi >= 0) out[n++] = hi * 16;
  return out.subarray(0, n);
}
function runLengthDecode(d) {
  const out = new Bytes(d.length * 2);
  for (let i = 0; i < d.length;) {
    const n = d[i++]; if (n === 128) break;
    if (n < 128) { const k = Math.min(n + 1, d.length - i); if (!out.room(k)) break; d.copy(out.b, out.n, i, i + k); out.n += k; i += n + 1; }
    else { if (i >= d.length) break; if (!out.fill(d[i++], 257 - n)) break; }
  }
  return out.done();
}
// Undoes the PNG predictors (10 to 15: every row starts with its own filter number) and the TIFF predictor (2: each
// sample is the difference from the one before it in its row), as used by Flate and LZW streams.
function undoPredictor(data, predictor, colors, bpc, columns) {
  if (!(predictor >= 2)) return data;
  const bpp = Math.max(1, (colors * bpc + 7) >> 3), row = (colors * bpc * columns + 7) >> 3;
  if (!(row > 0) || row > 1e8) return data;
  if (predictor === 2) {
    if (bpc !== 8 && bpc !== 16) return data;
    const out = Buffer.from(data);
    for (let r = 0; r + row <= out.length; r += row) {
      if (bpc === 8) for (let i = colors; i < row; i++) out[r + i] = (out[r + i] + out[r + i - colors]) & 255;
      else for (let i = colors * 2; i + 1 < row; i += 2) out.writeUInt16BE((out.readUInt16BE(r + i) + out.readUInt16BE(r + i - colors * 2)) & 0xffff, r + i);
    }
    return out;
  }
  const stride = row + 1, rows = Math.ceil(data.length / stride), out = Buffer.alloc(Math.min(rows * row, data.length));
  let total = 0;
  for (let r = 0; r < rows; r++) {
    const src = r * stride, tag = data[src], have = Math.min(row, data.length - src - 1); if (have <= 0) break;
    const o = r * row, up = r ? o - row : -1;
    for (let i = 0; i < have; i++) {
      const x = data[src + 1 + i], a = i >= bpp ? out[o + i - bpp] : 0, b = up >= 0 ? out[up + i] : 0, c = up >= 0 && i >= bpp ? out[up + i - bpp] : 0;
      let v = x;
      if (tag === 1) v = x + a; else if (tag === 2) v = x + b; else if (tag === 3) v = x + ((a + b) >> 1);
      else if (tag === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      out[o + i] = v & 255;
    }
    total = o + have;
  }
  return out.subarray(0, total);
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 3: from character codes to text. A simple font has one byte per character and an encoding that says which
// glyph (by name) each byte is: WinAnsi (Windows Latin-1), MacRoman, Standard, or the font's own with /Differences on top.
// A glyph name is turned into Unicode with a compact table (the letters with accents, ligatures, punctuation, Greek, the
// usual maths symbols), plus the uniXXXX and uXXXXX forms; names no table knows (g123, cid77) are unreadable. A /ToUnicode
// CMap, when there is one, is better than all of that and wins.
const NAMES_ASCII = 'space exclam quotedbl numbersign dollar percent ampersand quotesingle parenleft parenright asterisk plus comma hyphen period slash zero one two three four five six seven eight nine colon semicolon less equal greater question at A B C D E F G H I J K L M N O P Q R S T U V W X Y Z bracketleft backslash bracketright asciicircum underscore grave a b c d e f g h i j k l m n o p q r s t u v w x y z braceleft bar braceright asciitilde'.split(' ');
const NAMES_80 = 'Euro .notdef quotesinglbase florin quotedblbase ellipsis dagger daggerdbl circumflex perthousand Scaron guilsinglleft OE .notdef Zcaron .notdef .notdef quoteleft quoteright quotedblleft quotedblright bullet endash emdash tilde trademark scaron guilsinglright oe .notdef zcaron Ydieresis'.split(' ');
const NAMES_A0 = 'space exclamdown cent sterling currency yen brokenbar section dieresis copyright ordfeminine guillemotleft logicalnot hyphen registered macron degree plusminus twosuperior threesuperior acute mu paragraph periodcentered cedilla onesuperior ordmasculine guillemotright onequarter onehalf threequarters questiondown Agrave Aacute Acircumflex Atilde Adieresis Aring AE Ccedilla Egrave Eacute Ecircumflex Edieresis Igrave Iacute Icircumflex Idieresis Eth Ntilde Ograve Oacute Ocircumflex Otilde Odieresis multiply Oslash Ugrave Uacute Ucircumflex Udieresis Yacute Thorn germandbls agrave aacute acircumflex atilde adieresis aring ae ccedilla egrave eacute ecircumflex edieresis igrave iacute icircumflex idieresis eth ntilde ograve oacute ocircumflex otilde odieresis divide oslash ugrave uacute ucircumflex udieresis yacute thorn ydieresis'.split(' ');
// Mac OS Roman for codes 0x80-0xFF (0xCA is a no-break space; 0xF0 is the Apple logo, which is no text).
const MAC_HIGH = ('ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…\u00a0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›\ufb01\ufb02‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ\uf8ffÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ').split('');
// StandardEncoding, apart from ASCII (where 0x27 is quoteright and 0x60 is quoteleft).
const STD_HIGH = { 0xa1: '¡', 0xa2: '¢', 0xa3: '£', 0xa4: '⁄', 0xa5: '¥', 0xa6: 'ƒ', 0xa7: '§', 0xa8: '¤', 0xa9: '\'', 0xaa: '“', 0xab: '«', 0xac: '‹', 0xad: '›', 0xae: '\ufb01', 0xaf: '\ufb02', 0xb1: '–', 0xb2: '†', 0xb3: '‡', 0xb4: '·', 0xb6: '¶', 0xb7: '•', 0xb8: '‚', 0xb9: '„', 0xba: '”', 0xbb: '»', 0xbc: '…', 0xbd: '‰', 0xbf: '¿',
  0xc1: '`', 0xc2: '´', 0xc3: 'ˆ', 0xc4: '˜', 0xc5: '¯', 0xc6: '˘', 0xc7: '˙', 0xc8: '¨', 0xca: '˚', 0xcb: '¸', 0xcd: '˝', 0xce: '˛', 0xcf: 'ˇ', 0xd0: '—', 0xe1: 'Æ', 0xe3: 'ª', 0xe8: 'Ł', 0xe9: 'Ø', 0xea: 'Œ', 0xeb: 'º', 0xf1: 'æ', 0xf5: 'ı', 0xf8: 'ł', 0xf9: 'ø', 0xfa: 'œ', 0xfb: 'ß' };
// More glyph names: name=hex code point. Ligatures, the rest of Latin Extended-A that names are used for, spacing accents,
// maths and arrows (TeX fonts and Symbol use these), Greek, Cyrillic, a few spellings.
const EXTRA = 'fi=FB01 fl=FB02 ff=FB00 ffi=FB03 ffl=FB04 st=FB06 longs=017F Lslash=0141 lslash=0142 dotlessi=0131 dotlessj=0237 fraction=2044 minus=2212 breve=02D8 dotaccent=02D9 hungarumlaut=02DD ogonek=02DB ring=02DA caron=02C7 nbspace=00A0 nonbreakingspace=00A0 sfthyphen=00AD softhyphen=00AD middot=00B7 ' +
  'Amacron=0100 amacron=0101 Abreve=0102 abreve=0103 Aogonek=0104 aogonek=0105 Cacute=0106 cacute=0107 Ccaron=010C ccaron=010D Dcaron=010E dcaron=010F Dcroat=0110 dcroat=0111 Emacron=0112 emacron=0113 Edotaccent=0116 edotaccent=0117 Eogonek=0118 eogonek=0119 Ecaron=011A ecaron=011B Gbreve=011E gbreve=011F Idotaccent=0130 Lacute=0139 lacute=013A Lcaron=013D lcaron=013E Nacute=0143 nacute=0144 Ncaron=0147 ncaron=0148 Ohungarumlaut=0150 ohungarumlaut=0151 Racute=0154 racute=0155 Rcaron=0158 rcaron=0159 Sacute=015A sacute=015B Scedilla=015E scedilla=015F Tcaron=0164 tcaron=0165 Uring=016E uring=016F Uhungarumlaut=0170 uhungarumlaut=0171 Zacute=0179 zacute=017A Zdotaccent=017B zdotaccent=017C ' +
  'asteriskmath=2217 circleplus=2295 circlemultiply=2297 lessequal=2264 greaterequal=2265 notequal=2260 approxequal=2248 equivalence=2261 infinity=221E integral=222B summation=2211 product=220F radical=221A partialdiff=2202 gradient=2207 nabla=2207 element=2208 notelement=2209 union=222A intersection=2229 emptyset=2205 arrowright=2192 arrowleft=2190 arrowup=2191 arrowdown=2193 arrowboth=2194 arrowdblright=21D2 arrowdblleft=21D0 arrowdblboth=21D4 arrowdblup=21D1 arrowdbldown=21D3 existential=2203 universal=2200 logicaland=2227 logicalor=2228 propersubset=2282 propersuperset=2283 reflexsubset=2286 reflexsuperset=2287 proportional=221D angle=2220 similar=223C congruent=2245 prime=2032 second=2033 lozenge=25CA club=2663 diamond=2666 heart=2665 spade=2660 aleph=2135 perpendicular=22A5 therefore=2234 star=22C6 suchthat=220B minusplus=2213 ' +
  'Delta=0394 Omega=03A9 Gamma=0393 Theta=0398 Lambda=039B Xi=039E Pi=03A0 Sigma=03A3 Upsilon=03A5 Phi=03A6 Psi=03A8 Alpha=0391 Beta=0392 Epsilon=0395 Zeta=0396 Eta=0397 Iota=0399 Kappa=039A Mu=039C Nu=039D Omicron=039F Rho=03A1 Tau=03A4 Chi=03A7 alpha=03B1 beta=03B2 gamma=03B3 delta=03B4 epsilon=03B5 zeta=03B6 eta=03B7 theta=03B8 iota=03B9 kappa=03BA lambda=03BB nu=03BD xi=03BE omicron=03BF pi=03C0 rho=03C1 sigma=03C3 sigma1=03C2 tau=03C4 upsilon=03C5 phi=03C6 chi=03C7 psi=03C8 omega=03C9 theta1=03D1 phi1=03D5 omega1=03D6 epsilon1=03F5 pi1=03D6 rho1=03F1';
const CP1252_80 = '€•‚ƒ„…†‡ˆ‰Š‹Œ•Ž••‘’“”•–—˜™š›œ•žŸ';
const GLYPH = new Map(), WIN = new Array(256).fill(null), MAC = new Array(256).fill(null), STD = new Array(256).fill(null);
for (let i = 0; i < 95; i++) { const ch = String.fromCharCode(32 + i); GLYPH.set(NAMES_ASCII[i], ch); WIN[32 + i] = MAC[32 + i] = STD[32 + i] = ch; }
STD[0x27] = '’'; STD[0x60] = '‘';
for (let i = 0; i < 32; i++) { WIN[0x80 + i] = CP1252_80[i]; if (NAMES_80[i] !== '.notdef') GLYPH.set(NAMES_80[i], CP1252_80[i]); }
for (let i = 0; i < 96; i++) { const ch = String.fromCharCode(0xa0 + i); WIN[0xa0 + i] = ch; if (!GLYPH.has(NAMES_A0[i])) GLYPH.set(NAMES_A0[i], ch); }
WIN[0x7f] = '•'; WIN[0xa0] = ' '; WIN[0xad] = '-';
for (const t of [WIN, MAC, STD]) t[9] = t[10] = t[12] = t[13] = ' ';                   // a tab or a line end inside a string is white space
for (let i = 0; i < 128; i++) MAC[0x80 + i] = MAC_HIGH[i];
MAC[0xca] = ' '; MAC[0xf0] = null;
for (const [k, v] of Object.entries(STD_HIGH)) STD[+k] = v;
for (const item of EXTRA.split(' ')) { const [n, h] = item.split('='); GLYPH.set(n, String.fromCodePoint(parseInt(h, 16))); }
GLYPH.set('space', ' '); GLYPH.set('hyphen', '-'); GLYPH.set('suppress', ''); GLYPH.set('.notdef', null);
// Cyrillic letters have names afii10017… (capitals, in order) and afii10065… (small letters).
{ const caps = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', small = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'; for (let i = 0; i < 32; i++) { GLYPH.set('afii' + (10017 + i), caps[i]); GLYPH.set('afii' + (10065 + i), small[i]); } GLYPH.set('afii10023', 'Ё'); GLYPH.set('afii10071', 'ё'); }
// Symbol's own encoding (what a font named Symbol has with no /Encoding): Greek letters and the common symbols.
const SYMBOL = new Array(256).fill(null);
{
  for (let c = 0x20; c < 0x7f; c++) SYMBOL[c] = String.fromCharCode(c);
  const upper = 'ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ', lower = 'αβχδεφγηιϕκλμνοπθρστυϖωξψζ';
  for (let i = 0; i < 26; i++) { SYMBOL[0x41 + i] = upper[i]; SYMBOL[0x61 + i] = lower[i]; }
  Object.assign(SYMBOL, { 0x22: '∀', 0x24: '∃', 0x27: '∋', 0x2a: '∗', 0x2d: '−', 0x40: '≅', 0x5c: '∴', 0x5e: '⊥', 0x7e: '∼', 0xa3: '≤', 0xa5: '∞', 0xab: '↔', 0xac: '←', 0xad: '↑', 0xae: '→', 0xaf: '↓', 0xb0: '°', 0xb1: '±', 0xb3: '≥', 0xb4: '×', 0xb5: '∝', 0xb6: '∂', 0xb7: '•', 0xb8: '÷', 0xb9: '≠', 0xba: '≡', 0xbb: '≈', 0xbc: '…', 0xc6: '∅', 0xc7: '∩', 0xc8: '∪', 0xce: '∈', 0xcf: '∉', 0xd1: '∇', 0xd5: '∏', 0xd6: '√', 0xd9: '∧', 0xda: '∨', 0xdb: '⇔', 0xdc: '⇐', 0xde: '⇒', 0xe5: '∑', 0xf2: '∫' });
}
const ZAPF = new Array(256).fill(null); for (let c = 0x21; c < 0xff; c++) ZAPF[c] = '•';
const glyphCache = new Map();
// A glyph name as text, or null when it can't be (an unknown name, .notdef). Suffixes after a dot are dropped (a.sc is a),
// names joined by underscores are the parts joined (f_i), and uniXXXX (one or more groups) and uXXXX…uXXXXXX are code points.
function glyphToUni(name) {
  if (GLYPH.has(name)) return GLYPH.get(name);
  if (glyphCache.has(name)) return glyphCache.get(name);
  let r = null, m; const dot = name.indexOf('.'), n = dot > 0 ? name.slice(0, dot) : name;
  if (dot === 0) r = null;
  else if (dot > 0 && GLYPH.has(n)) r = GLYPH.get(n);
  else if (n.includes('_')) { const parts = n.split('_').map(glyphToUni); r = parts.every(p => typeof p === 'string') ? parts.join('') : null; }
  else if ((m = /^uni((?:[0-9A-Fa-f]{4})+)$/.exec(n))) { r = ''; for (let i = 0; i < m[1].length; i += 4) r += String.fromCharCode(parseInt(m[1].slice(i, i + 4), 16)); }
  else if ((m = /^u([0-9A-Fa-f]{4,6})$/.exec(n))) { const cp = parseInt(m[1], 16); r = cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : null; }
  if (glyphCache.size > 5000) glyphCache.clear();
  glyphCache.set(name, r);
  return r;
}
// What a ToUnicode destination is worth: nothing for NUL, the replacement character, or private-use characters (a symbol
// font mapped to its own private area). Word's bullets (U+F0B7 and friends) are bullets.
function usable(s) {
  if (typeof s !== 'string' || !s) return null;
  if (s === '\uf0b7' || s === '\uf0a7' || s === '\uf076' || s === '\uf0d8') return '•';
  if (s === '\uf0fc') return '✓';
  return /^[\u0000\ufffd\ue000-\uf8ff]+$/.test(s) ? null : s;
}
// Widths (in 1/1000 of the font size) of the 95 printable ASCII characters (32 to 126) in the standard fonts, for PDFs
// that don't say. Courier is 600 for everything.
const W95 = s => s.split(' ').map(Number);
const STD_WIDTHS = {
  helv: W95('278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584'),
  helvb: W95('278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584'),
  times: W95('250 333 408 500 500 833 778 180 333 333 500 564 250 333 250 278 500 500 500 500 500 500 500 500 500 500 278 278 564 564 564 444 921 722 667 667 722 611 556 722 722 333 389 722 611 889 722 722 556 722 667 556 611 722 722 944 722 722 611 333 278 333 469 500 333 444 500 444 500 444 333 500 500 278 278 500 278 778 500 500 500 500 333 389 278 500 500 722 500 500 444 480 200 480 541'),
  timesb: W95('250 333 555 500 500 1000 833 278 333 333 500 570 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500 930 722 667 722 722 667 611 778 778 389 500 778 667 944 722 778 611 778 722 556 667 722 722 1000 722 722 667 333 278 333 581 500 333 500 556 444 556 444 333 500 556 278 333 556 278 833 556 500 556 556 444 389 333 556 500 722 500 500 444 394 220 394 520'),
  timesi: W95('250 333 420 500 500 833 778 214 333 333 500 675 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 675 675 675 500 920 611 611 667 722 611 611 722 722 333 444 667 556 833 667 722 611 722 611 500 556 722 611 833 611 556 556 389 278 389 422 500 333 500 500 444 500 444 278 500 500 278 278 444 278 722 500 500 500 500 389 389 278 500 444 667 444 444 389 400 275 400 541')
};
const SPECIAL_WIDTH = { '–': [556, 500], '—': [1000, 889], '“': [333, 444], '”': [333, 444], '‘': [222, 333], '’': [222, 333], '•': [350, 350], '…': [1000, 1000], 'ß': [611, 500], 'æ': [889, 667], 'œ': [944, 722], '\ufb01': [500, 556], '\ufb02': [500, 556], '€': [556, 500], '©': [737, 760], '®': [737, 760], '™': [1000, 980], '°': [400, 400], '±': [584, 564], '×': [584, 564], '÷': [584, 564] };
// Which standard font a name stands for ('helv', 'helvb', 'times', 'timesb', 'timesi' or 'courier'), and whether it is one of
// the standard 14 (or a plain stand-in for one) so that its widths can be trusted.
function stdFamily(baseFont, flags) {
  const n = String(baseFont).replace(/^[A-Z]{6}\+/, '').toLowerCase().replace(/[\s,_-]/g, '');
  const bold = /bold|black|heavy|demi/.test(n), italic = /italic|oblique/.test(n);
  const exact = /^(helvetica|arial|timesnewroman|times|courier|couriernew|symbol|zapfdingbats)/.test(n);
  if (/courier|mono|consolas|menlo|monaco/.test(n)) return { family: 'courier', exact };
  if (/times|georgia|garamond|palatino|bookman|century|cambria|minion|baskerville|(?<!sans)serif/.test(n)) return { family: bold ? 'timesb' : italic ? 'timesi' : 'times', exact };
  if (/helvetica|arial|verdana|tahoma|calibri|sans|segoe|myriad|frutiger|univers|gill/.test(n)) return { family: bold ? 'helvb' : 'helv', exact };
  return { family: flags & 1 ? 'courier' : flags & 2 ? (bold ? 'timesb' : italic ? 'timesi' : 'times') : bold ? 'helvb' : 'helv', exact: false };
}
function stdWidth(family, ch) {
  if (family === 'courier') return 600;
  if (typeof ch !== 'string' || !ch) return 500;
  const sans = family === 'helv' || family === 'helvb', c = ch.charCodeAt(0);
  if (c >= 32 && c < 127) return STD_WIDTHS[family][c - 32];
  const sp = SPECIAL_WIDTH[ch]; if (sp) return sp[sans ? 0 : 1];
  const base = ch.normalize('NFD').charCodeAt(0);
  return base >= 32 && base < 127 ? STD_WIDTHS[family][base - 32] : sans ? 556 : 500;
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 4: CMaps. A ToUnicode CMap says which text each character code of a font stands for (begincodespacerange: how
// many bytes a code has; beginbfchar: one code, one text; beginbfrange: a run of codes, either counting up from a text or
// each with its own text). An encoding CMap (for a Type0 font) also has cidchar/cidrange: the glyph number of each code.
// Destinations are UTF-16BE: surrogate pairs and several characters (a ligature) are fine. Ranges are limited in size so a
// hostile CMap can't ask for billions of entries.
const codeOf = s => { let v = 0; for (let i = 0; i < s.length; i++) v = v * 256 + s.charCodeAt(i); return v; };
function destText(d) {
  if (d instanceof Name) return glyphToUni(d.name);
  if (!(d instanceof PStr)) return null;
  const s = d.s; if (s.length === 1) return String.fromCharCode(s.charCodeAt(0));
  let r = ''; for (let i = 0; i + 1 < s.length; i += 2) r += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1));
  return r;
}
function parseCMap(data) {
  const lx = new Lexer(data), map = new Map(), spaces = [], cid = []; let wmode = 0;
  for (let guard = 0; guard < 3e6; guard++) {
    const t = lx.read(false);
    if (t === END) break;
    if (t instanceof Name) { if (t.name === 'WMode') { const v = lx.read(false); if (typeof v === 'number') wmode = v; } continue; }
    if (!(t instanceof Cmd)) continue;
    switch (t.cmd) {
      case 'begincodespacerange':
        for (;;) { const a = lx.read(false); if (!(a instanceof PStr)) break; const b = lx.read(false); if (!(b instanceof PStr)) break; if (a.s.length && a.s.length === b.s.length && a.s.length <= 4) spaces.push({ len: a.s.length, lo: [...a.s].map(c => c.charCodeAt(0)), hi: [...b.s].map(c => c.charCodeAt(0)) }); }
        break;
      case 'beginbfchar':
        for (;;) { const a = lx.read(false); if (!(a instanceof PStr)) break; const txt = destText(lx.read(false)); if (txt !== null && map.size < 400000) map.set(codeOf(a.s), txt); }
        break;
      case 'beginbfrange':
        for (;;) {
          const a = lx.read(false); if (!(a instanceof PStr)) break;
          const b = lx.read(false); if (!(b instanceof PStr)) break;
          const d = lx.read(false), lo = codeOf(a.s), hi = Math.min(codeOf(b.s), lo + 65535);
          if (Array.isArray(d)) { for (let c = lo, i = 0; c <= hi && i < d.length; c++, i++) { const txt = destText(d[i]); if (txt !== null) map.set(c, txt); } }
          else if (d instanceof PStr && d.s.length) {
            const base = destText(d); if (base === null || !base.length) continue;
            const head = base.slice(0, -1), tail = base.charCodeAt(base.length - 1);
            for (let c = lo; c <= hi && map.size < 400000; c++) map.set(c, head + String.fromCharCode((tail + c - lo) & 0xffff));
          }
        }
        break;
      case 'begincidrange':
        for (;;) { const a = lx.read(false); if (!(a instanceof PStr)) break; const b = lx.read(false); if (!(b instanceof PStr)) break; const d = lx.read(false); if (typeof d !== 'number') break; if (cid.length < 100000) cid.push([codeOf(a.s), codeOf(b.s), d]); }
        break;
      case 'begincidchar':
        for (;;) { const a = lx.read(false); if (!(a instanceof PStr)) break; const d = lx.read(false); if (typeof d !== 'number') break; if (cid.length < 100000) cid.push([codeOf(a.s), codeOf(a.s), d]); }
        break;
    }
  }
  return { map, spaces, cid, wmode };
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 4b: the encoding built into a CFF font program (what a "Type1C" font file is, and what Ghostscript writes for
// PostScript fonts). A code is looked up in the font's Encoding to a glyph number, the Charset gives that glyph's string id,
// and the id is a name from the standard strings (the first 229 are the Latin glyphs) or the font's own String INDEX.
const CFF_STD = '.notdef space exclam quotedbl numbersign dollar percent ampersand quoteright parenleft parenright asterisk plus comma hyphen period slash zero one two three four five six seven eight nine colon semicolon less equal greater question at A B C D E F G H I J K L M N O P Q R S T U V W X Y Z bracketleft backslash bracketright asciicircum underscore quoteleft a b c d e f g h i j k l m n o p q r s t u v w x y z braceleft bar braceright asciitilde exclamdown cent sterling fraction yen florin section currency quotesingle quotedblleft guillemotleft guilsinglleft guilsinglright fi fl endash dagger daggerdbl periodcentered paragraph bullet quotesinglbase quotedblbase quotedblright guillemotright ellipsis perthousand questiondown grave acute circumflex tilde macron breve dotaccent dieresis ring cedilla hungarumlaut ogonek caron emdash AE ordfeminine Lslash Oslash OE ordmasculine ae dotlessi lslash oslash oe germandbls onesuperior logicalnot mu trademark Eth onehalf plusminus Thorn onequarter divide brokenbar degree thorn threequarters twosuperior registered minus eth multiply threesuperior copyright Aacute Acircumflex Adieresis Agrave Aring Atilde Ccedilla Eacute Ecircumflex Edieresis Egrave Iacute Icircumflex Idieresis Igrave Ntilde Oacute Ocircumflex Odieresis Ograve Otilde Scaron Uacute Ucircumflex Udieresis Ugrave Yacute Ydieresis Zcaron aacute acircumflex adieresis agrave aring atilde ccedilla eacute ecircumflex edieresis egrave iacute icircumflex idieresis igrave ntilde oacute ocircumflex odieresis ograve otilde scaron uacute ucircumflex udieresis ugrave yacute ydieresis zcaron'.split(' ');
// An INDEX: a count, then offsets, then data. Returns { count, item(i) -> [start, end), end } or null when it doesn't fit.
function cffIndex(b, p) {
  if (p + 2 > b.length) return null;
  const count = b.readUInt16BE(p); if (count === 0) return { count: 0, item: () => null, end: p + 2 };
  const size = b[p + 2]; if (size < 1 || size > 4 || p + 3 + (count + 1) * size > b.length) return null;
  const off = i => { let v = 0; for (let k = 0; k < size; k++) v = v * 256 + b[p + 3 + i * size + k]; return v; };
  const base = p + 3 + (count + 1) * size - 1, last = off(count);
  if (base + last > b.length) return null;
  return { count, item: i => (i >= 0 && i < count ? [base + off(i), base + off(i + 1)] : null), end: base + last };
}
// code -> glyph name for a CFF font (an array), or null when it uses a predefined encoding or can't be read.
function cffEncoding(b) {
  try {
    if (b.length < 8 || b[0] !== 1) return null;
    const names = cffIndex(b, b[2]); if (!names) return null;
    const tops = cffIndex(b, names.end); if (!tops || !tops.count) return null;
    const strings = cffIndex(b, tops.end); if (!strings) return null;
    const [t0, t1] = tops.item(0), dict = {}; let stack = [];                      // the Top DICT: operands then an operator
    for (let p = t0; p < t1;) {
      const c = b[p++];
      if (c >= 32 && c <= 246) stack.push(c - 139);
      else if (c >= 247 && c <= 250) stack.push((c - 247) * 256 + b[p++] + 108);
      else if (c >= 251 && c <= 254) stack.push(-(c - 251) * 256 - b[p++] - 108);
      else if (c === 28) { stack.push(b.readInt16BE(p)); p += 2; }
      else if (c === 29) { stack.push(b.readInt32BE(p)); p += 4; }
      else if (c === 30) { while (p < t1) { const n = b[p++]; if ((n & 15) === 15 || (n >> 4) === 15) break; } stack.push(0); }
      else { const op = c === 12 ? 1200 + b[p++] : c; dict[op] = stack; stack = []; }
    }
    const enc = dict[16] && dict[16][0], cs = dict[17] && dict[17][0], cset = dict[15] ? dict[15][0] : 0;
    if (!enc || enc <= 1 || !cs) return null;                                      // 0 and 1 are the predefined encodings
    const chars = cffIndex(b, cs); if (!chars) return null;
    const n = chars.count, sids = new Array(n).fill(0);                            // the charset: the string id of each glyph
    if (cset > 2) {
      let p = cset; const fmt = b[p++];
      if (fmt === 0) { for (let g = 1; g < n && p + 2 <= b.length; g++, p += 2) sids[g] = b.readUInt16BE(p); }
      else { for (let g = 1; g < n && p + 3 <= b.length;) { const first = b.readUInt16BE(p); p += 2; const left = fmt === 1 ? b[p++] : (p += 2, b.readUInt16BE(p - 2)); for (let k = 0; k <= left && g < n; k++, g++) sids[g] = first + k; } }
    } else for (let g = 1; g < n; g++) sids[g] = g;
    const nameOfSid = sid => { if (sid < CFF_STD.length) return CFF_STD[sid]; const it = strings.item(sid - 391); return it ? b.toString('latin1', it[0], it[1]) : null; };
    const out = new Array(256).fill(null); let p = enc; const fmt = b[p++];
    if ((fmt & 0x7f) === 0) { const k = b[p++]; for (let i = 0; i < k && p < b.length; i++) out[b[p++]] = nameOfSid(sids[i + 1]); }
    else if ((fmt & 0x7f) === 1) { const k = b[p++]; let g = 1; for (let i = 0; i < k && p + 2 <= b.length; i++) { const first = b[p++], left = b[p++]; for (let j = 0; j <= left; j++, g++) if (first + j < 256) out[first + j] = nameOfSid(sids[g]); } }
    else return null;
    if (fmt & 0x80) { const k = b[p++]; for (let i = 0; i < k && p + 3 <= b.length; i++, p += 3) out[b[p]] = nameOfSid(b.readUInt16BE(p + 1)); }
    return out;
  } catch { return null; }
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 5: fonts. A Font turns the bytes of a string shown with it into text and says how wide each character is.
// Simple fonts (one byte per character) have `map[code]` (text, or null when it can't be read) and `widths[code]`.
// Composite fonts (Type0, CID) have codes of one or more bytes: they read as text only through a ToUnicode CMap (or when the
// encoding is Unicode already: UniXXX-UCS2/UTF16), and `uni` has that. `approx` says the widths are a guess (no /Widths).
class Font {
  constructor() { this.cid = false; this.map = null; this.widths = null; this.approx = false; this.uni = null; this.unicode = false; this.spaces = null; this.dw = 1000; this.single = null; this.ranges = null; this.cidMap = null; this.n = 1; }
  // The code at s[i] and, in this.n, how many bytes it takes (composite fonts only).
  next(s, i) {
    if (this.unicode) {
      const a = s.charCodeAt(i);
      if (i + 1 >= s.length) { this.n = 1; return a; }
      const hi = (a << 8) | s.charCodeAt(i + 1);
      if (hi >= 0xd800 && hi < 0xdc00 && i + 3 < s.length) { const lo = (s.charCodeAt(i + 2) << 8) | s.charCodeAt(i + 3); if (lo >= 0xdc00 && lo < 0xe000) { this.n = 4; return ((hi - 0xd800) << 10) + (lo - 0xdc00) + 0x10000; } }
      this.n = 2; return hi;
    }
    if (this.spaces) {
      let code = 0;
      for (let len = 1; len <= 4 && i + len <= s.length; len++) {
        code = code * 256 + s.charCodeAt(i + len - 1);
        for (const r of this.spaces) {
          if (r.len !== len) continue;
          let ok = true; for (let k = 0; k < len; k++) { const c = s.charCodeAt(i + k); if (c < r.lo[k] || c > r.hi[k]) { ok = false; break; } }
          if (ok) { this.n = len; return code; }
        }
      }
      this.n = 1; return s.charCodeAt(i);
    }
    if (i + 1 >= s.length) { this.n = 1; return s.charCodeAt(i); }
    this.n = 2; return (s.charCodeAt(i) << 8) | s.charCodeAt(i + 1);
  }
  text(code) {
    if (this.unicode) return code >= 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? usable(String.fromCodePoint(code)) : null;
    const t = this.uni && this.uni.get(code);
    return t === undefined ? null : t;
  }
  width(code) {
    let c = code;
    if (this.cidMap) c = this.cidMap(code);
    if (this.single) { const w = this.single.get(c); if (w !== undefined) return w; }
    if (this.ranges) for (let i = this.ranges.length - 1; i >= 0; i--) { const r = this.ranges[i]; if (c >= r[0] && c <= r[1]) return r[2]; }
    return this.dw;
  }
}
const DEFAULT_FONT = (() => {                                      // what text gets when its font can't be found: bytes as WinAnsi, an average width
  const f = new Font(); f.map = WIN.map(c => c); f.widths = WIN.map(c => stdWidth('helv', c)); f.approx = true; return f;
})();

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 6: the document. The file is read without trusting its cross-reference table (a damaged file has a wrong one,
// and a repaired reading is the only way to read every kind): every "N G obj" in the file is found, the last one for a
// number wins (that is how an incremental update replaces an object), and objects inside object streams (/Type /ObjStm,
// which hold most of the page tree and fonts of a modern PDF) are found by reading each stream's table. Objects are only
// parsed when something asks for them. Page order comes from the page tree (/Root /Pages /Kids), and when that is missing or
// broken, from every /Type /Page object in file order.
const OBJ = Buffer.from('obj'), OBJSTM = Buffer.from('/ObjStm'), XREF = Buffer.from('/XRef'), CATALOG = Buffer.from('/Catalog'), TRAILER = Buffer.from('trailer'), ENDSTREAM = Buffer.from('endstream'), ENCRYPT = Buffer.from('/Encrypt');
const SEARCH_BUDGET = 800e6, MAX_OBJECTS = 1500000, MAX_WALK = 20000, MAX_KIDS = 100000, MAX_PAGES = 2000, MAX_MS = 20000, BODY_BYTES = 64e6;
class PdfDoc {
  constructor(buf) {
    this.buf = buf; this.table = new Map(); this.cache = new Map(); this.stms = new Map(); this.bodies = new Map(); this.bodyBytes = 0; this.inflated = 0;
    this.fonts = new Map(); this.fontsByDict = new WeakMap(); this.cmaps = new Map(); this.forms = new Map(); this.trailers = []; this.nums = []; this.offs = [];
    this.deadline = Date.now() + MAX_MS; this.noEnd = Infinity; this.searched = 0; this.gens = new Map(); this.crypt = null; this.locked = false;
    this.scan();
  }
  // Finds every object. table: number -> the offset of its body in the file (>= 0), or, for an object inside an object
  // stream, -(stream number * 2^20 + index) - 1.
  scan() {
    const b = this.buf, nums = this.nums, offs = this.offs;
    for (let from = 0; ;) {
      const p = b.indexOf(OBJ, from);
      if (p < 0) break;
      from = p + 3;
      if (p < 4 || !WS[b[p - 1]]) continue;
      if (from < b.length && !WS[b[from]] && !DL[b[from]]) continue;
      let q = p - 1;
      while (q >= 0 && WS[b[q]]) q--;
      const gEnd = q;
      while (q >= 0 && b[q] >= 48 && b[q] <= 57) q--;
      if (q === gEnd || q < 0 || !WS[b[q]]) continue;
      const gStart = q + 1;
      while (q >= 0 && WS[b[q]]) q--;
      const nEnd = q;
      while (q >= 0 && b[q] >= 48 && b[q] <= 57) q--;
      if (q === nEnd || nEnd - q > 10) continue;
      if (nums.length >= MAX_OBJECTS) fail('toolarge');
      const num = parseInt(b.toString('latin1', q + 1, nEnd + 1), 10), gen = parseInt(b.toString('latin1', gStart, gEnd + 1), 10);
      nums.push(num); offs.push(from);
      if (gen) this.gens.set(num, gen); else if (this.gens.size) this.gens.delete(num);
    }
    for (let i = 0; i < nums.length; i++) this.table.set(nums[i], offs[i]);                 // the objects in the file; the last copy of a number wins
    this.findTrailers();
    this.cache.clear();
    this.unlock();
    if (this.locked) return;
    const stmAt = new Set();
    for (let h = b.indexOf(OBJSTM, 0); h >= 0 && stmAt.size < 200000; h = b.indexOf(OBJSTM, h + 7)) { const i = this.enclosing(h); if (i >= 0) stmAt.add(i); }
    for (let i = 0; i < nums.length; i++) if (stmAt.has(i) && Date.now() <= this.deadline) this.addObjStm(nums[i], offs[i]);
    this.cache.clear();
  }
  // The trailers: the ones after "trailer", and the dictionaries of cross-reference streams (which are the trailer of a
  // file that has no "trailer"), in file order.
  findTrailers() {
    const b = this.buf, offs = this.offs, found = [];
    for (let p = b.indexOf(TRAILER, 0); p >= 0 && found.length < 5000; p = b.indexOf(TRAILER, p + 7)) { try { const d = new Lexer(b, p + 7).read(true); if (isDict(d)) found.push({ pos: p, dict: d }); } catch { /* skip */ } }
    for (let h = b.indexOf(XREF, 0); h >= 0 && found.length < 10000; h = b.indexOf(XREF, h + 5)) {
      const i = this.enclosing(h); if (i < 0) continue;
      try { const o = this.parseAt(offs[i], this.nums[i]); if (o instanceof Stream && nameOf(o.dict.Type) === 'XRef') found.push({ pos: offs[i], dict: o.dict }); } catch { /* skip */ }
    }
    found.sort((a, c) => a.pos - c.pos);
    this.trailers = found.map(f => f.dict);
  }
  // The index of the object whose body holds file position `pos` (the last one starting at or before it), or -1.
  enclosing(pos) {
    const offs = this.offs; let lo = 0, hi = offs.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (offs[m] <= pos) { r = m; lo = m + 1; } else hi = m - 1; }
    return r;
  }
  numberOf(v) { const x = this.deref(v); return typeof x === 'number' ? x : NaN; }
  // Reads the table at the start of an object stream (pairs of object number and offset) and files every object in it.
  addObjStm(num, off) {
    let st; try { st = this.parseAt(off, num); } catch { return; }
    if (!(st instanceof Stream) || nameOf(st.dict.Type) !== 'ObjStm') return;
    const n = Math.min(this.numberOf(st.dict.N), 1048575), first = this.numberOf(st.dict.First);
    if (!(n > 0) || !(first >= 0)) return;
    const data = this.streamData(st); if (!data) return;
    const lx = new Lexer(data, 0, Math.min(first, data.length)), list = [];
    for (let k = 0; k < n; k++) { const a = lx.read(false), c = lx.read(false); if (typeof a !== 'number' || typeof c !== 'number') break; list.push(a, c); }
    this.stms.set(num, { first, list, off });
    this.keepBody(num, data);
    for (let k = 0; k < list.length; k += 2) {                                      // an object in the stream replaces a copy from before the stream, not one from after it
      const cur = this.table.get(list[k]);
      if (cur === undefined || cur < 0 || cur < off) this.table.set(list[k], -(num * 1048576 + (k >> 1)) - 1);
    }
  }
  // A few inflated object streams are kept (up to BODY_BYTES in all), the oldest dropped first, and inflated again when needed.
  keepBody(num, data) {
    this.bodies.delete(num); this.bodies.set(num, data); this.bodyBytes += data.length;
    while (this.bodyBytes > BODY_BYTES && this.bodies.size > 1) { const [k, v] = this.bodies.entries().next().value; this.bodies.delete(k); this.bodyBytes -= v.length; }
  }
  body(num) {
    const have = this.bodies.get(num); if (have) { this.bodies.delete(num); this.bodies.set(num, have); return have; }
    const h = this.stms.get(num); if (!h) return null;
    const st = this.parseAt(h.off, num), data = st instanceof Stream ? this.streamData(st) : null;
    if (data) this.keepBody(num, data);
    return data;
  }
  // The object whose body starts at `off`: a value, or a Stream (its dictionary and where its data starts).
  parseAt(off, num = 0) {
    const lx = new Lexer(this.buf, off), v = lx.read(true);
    if (v === END || v instanceof Cmd) return null;
    if (isDict(v)) {
      lx.skip(); const b = this.buf, p = lx.pos;
      if (b[p] === 0x73 && b.toString('latin1', p, p + 6) === 'stream') {
        let s = p + 6;
        if (b[s] === 13) { s++; if (b[s] === 10) s++; } else if (b[s] === 10) s++;
        return new Stream(v, s, num, this.gens.get(num) || 0);
      }
    }
    return v;
  }
  get(num) {
    if (this.cache.has(num)) return this.cache.get(num);
    const e = this.table.get(num); let v = null;
    if (e !== undefined) {
      try {
        if (e >= 0) v = this.parseAt(e, num);
        else { const code = -e - 1, stm = Math.floor(code / 1048576), idx = code % 1048576, h = this.stms.get(stm), data = h && h.list[idx * 2] === num ? this.body(stm) : null; v = data ? new Lexer(data, h.first + h.list[idx * 2 + 1]).read(true) : null; }
      } catch { v = null; }
      if (v === END || v instanceof Cmd) v = null;
    }
    if (this.cache.size < 300000) this.cache.set(num, v);
    return v;
  }
  // A value with references followed (a reference to a reference too, but not forever).
  deref(v) { for (let i = 0; i < 16 && v instanceof Ref; i++) v = this.get(v.num); return v instanceof Ref ? null : v === undefined ? null : v; }
  // ---- the bytes of a stream
  rawStream(st) {
    const b = this.buf, start = st.start; let len = st.dict.Length;
    if (len instanceof Ref) len = this.get(len.num);
    if (typeof len === 'number' && len >= 0 && start + len <= b.length) {
      let p = start + len, k = 0; while (k < 4 && (b[p] === 13 || b[p] === 10 || b[p] === 32)) { p++; k++; }
      if (b[p] === 0x65 && b.toString('latin1', p, p + 9) === 'endstream') return b.subarray(start, start + len);
    }
    // a wrong or missing /Length: look for the keyword. The search is remembered (no keyword after here) and budgeted, so a file
    // full of streams with no usable length can't make this take time in proportion to the square of its size.
    let e = -1;
    if (start < this.noEnd) {
      if (this.searched > SEARCH_BUDGET) return Buffer.alloc(0);
      e = b.indexOf(ENDSTREAM, start); this.searched += (e < 0 ? b.length : e) - start;
      if (e < 0) this.noEnd = start;
    }
    if (e < 0) e = b.length;
    if (b[e - 1] === 10) e--; if (b[e - 1] === 13) e--;
    return b.subarray(start, Math.max(start, e));
  }
  // Inflate: the real zlib first, then without the 2-byte header and the checksum, then our own, which keeps what comes out
  // before damage. The output of one stream and of all streams together is limited.
  inflate(data) {
    if (!data.length) return Buffer.alloc(0);
    const left = Math.min(STREAM_CAP, INFLATE_BUDGET - this.inflated);
    if (left <= 0) return null;
    let out;
    try { out = inflateSync(data, { maxOutputLength: left, finishFlush: Z.Z_SYNC_FLUSH }); }
    catch (e) {
      if (e && e.code === 'ERR_BUFFER_TOO_LARGE') { this.inflated += left; return null; }
      const raw = data.length > 2 && (data[0] & 0x0f) === 8 && ((data[0] << 8) | data[1]) % 31 === 0 ? data.subarray(2) : data;
      try { out = inflateRawSync(raw, { maxOutputLength: left, finishFlush: Z.Z_SYNC_FLUSH }); }
      catch (e2) { if (e2 && e2.code === 'ERR_BUFFER_TOO_LARGE') { this.inflated += left; return null; } out = inflateSalvage(raw, left); }
    }
    this.inflated += out.length;
    return out;
  }
  // The decoded data of a stream (every filter applied), or null when a filter can't be undone (a picture's JPEG, say).
  streamData(st) {
    let data = this.rawStream(st);
    if (this.crypt && st.num && nameOf(st.dict.Type) !== 'XRef' && !this.cryptIdentity(st)) data = this.crypt.stream(data, st.num, st.gen);
    const f = this.deref(st.dict.Filter), p = this.deref(st.dict.DecodeParms ?? st.dict.DP);
    const list = f === null || f === undefined ? [] : Array.isArray(f) ? f : [f];
    for (let i = 0; i < list.length; i++) {
      const name = nameOf(this.deref(list[i])); let dp = Array.isArray(p) ? this.deref(p[i]) : i === 0 ? p : null;
      const parm = (k, d) => { const v = isDict(dp) ? this.numberOf(dp[k]) : NaN; return Number.isFinite(v) ? v : d; };
      if (name === 'FlateDecode' || name === 'Fl') { data = this.inflate(data); if (!data) return null; data = undoPredictor(data, parm('Predictor', 1), parm('Colors', 1), parm('BitsPerComponent', 8), parm('Columns', 1)); }
      else if (name === 'LZWDecode' || name === 'LZW') data = undoPredictor(lzwDecode(data, parm('EarlyChange', 1)), parm('Predictor', 1), parm('Colors', 1), parm('BitsPerComponent', 8), parm('Columns', 1));
      else if (name === 'ASCII85Decode' || name === 'A85') data = a85Decode(data);
      else if (name === 'ASCIIHexDecode' || name === 'AHx') data = hexDecode(data);
      else if (name === 'RunLengthDecode' || name === 'RL') data = runLengthDecode(data);
      else if (name === 'Crypt' && !(isDict(dp) && nameOf(dp.Name) && nameOf(dp.Name) !== 'Identity')) continue;
      else return null;
    }
    return data;
  }
  // ---- pages
  // The pages in order. The tree is walked with a stack (a loop in it is cut, a very deep one is fine); a /Resources on
  // a /Pages node goes down to the pages under it. A tree that has a node missing or a loop falls back to every /Type /Page
  // object in file order when that finds more pages.
  pageList() {
    const pages = []; let bad = false;
    const root = this.rootRef(), cat = root ? this.deref(root) : null, top = isDict(cat) ? cat.Pages : null;
    if (top) {
      const seen = new Set(), stack = [{ node: top, res: undefined }];
      while (stack.length && pages.length < MAX_WALK) {
        const { node, res } = stack.pop();
        if (node instanceof Ref) { if (seen.has(node.num)) { bad = true; continue; } seen.add(node.num); if (seen.size > 300000) { bad = true; break; } }
        const d = this.deref(node);
        if (!isDict(d)) { bad = true; continue; }
        const r = d.Resources !== undefined ? d.Resources : res, type = nameOf(this.deref(d.Type)), kids = this.deref(d.Kids);
        if (Array.isArray(kids) && type !== 'Page') { if (kids.length > MAX_KIDS) bad = true; for (let i = Math.min(kids.length, MAX_KIDS) - 1; i >= 0; i--) stack.push({ node: kids[i], res: r }); }
        else if (type === 'Page' || (type === undefined && !('Kids' in d))) pages.push({ dict: d, res: r });
        else bad = true;
      }
    }
    if (!pages.length || bad) { const all = this.everyPage(); if (all.length > pages.length) return all; }
    return pages;
  }
  rootRef() { for (let i = this.trailers.length - 1; i >= 0; i--) { const r = this.trailers[i].Root; if (r instanceof Ref) return r; } return null; }
  // Every /Type /Page object, in the order they stand in the file (an object inside an object stream stands where the stream does).
  everyPage() {
    const order = [];
    for (const [num, e] of this.table) {
      if (e >= 0) order.push([e, 0, num]);
      else { const code = -e - 1, stm = Math.floor(code / 1048576), h = this.stms.get(stm); if (h) order.push([h.off, (code % 1048576) + 1, num]); }
    }
    order.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const pages = [];
    for (const [, , num] of order) {
      if (Date.now() > this.deadline || pages.length >= MAX_WALK) break;
      let d; try { d = this.get(num); } catch { d = null; }
      if (!isDict(d) || nameOf(d.Type) !== 'Page') continue;
      let res = d.Resources, up = d;
      for (let i = 0; i < 32 && res === undefined; i++) { up = this.deref(up.Parent); if (!isDict(up)) break; res = up.Resources; }
      pages.push({ dict: d, res });
    }
    return pages;
  }
  // The drawing instructions of a page: its /Contents stream, or all of the streams of an array, with a space between.
  pageContent(page) {
    const c = this.deref(page.dict.Contents), parts = [], add = x => { const s = this.deref(x); if (s instanceof Stream) { const d = this.streamData(s); if (d) { parts.push(d, SPACE); } } };
    if (Array.isArray(c)) for (let i = 0; i < Math.min(c.length, 5000); i++) add(c[i]); else add(page.dict.Contents);
    return parts.length === 2 ? parts[0] : Buffer.concat(parts);
  }
  // ---- fonts
  cmapOf(st) {
    if (!(st instanceof Stream)) return null;
    if (this.cmaps.has(st.start)) return this.cmaps.get(st.start);
    const data = this.streamData(st), cm = data ? parseCMap(data) : null;
    this.cmaps.set(st.start, cm); return cm;
  }
  fontFor(res, name) {
    const r = this.deref(res), fonts = isDict(r) ? this.deref(r.Font) : null, entry = isDict(fonts) ? fonts[name] : undefined;
    if (entry === undefined) return DEFAULT_FONT;
    const key = entry instanceof Ref ? entry.num : null;
    if (key !== null && this.fonts.has(key)) return this.fonts.get(key);
    const dict = this.deref(entry);
    if (!key && isDict(dict) && this.fontsByDict.has(dict)) return this.fontsByDict.get(dict);
    let font = DEFAULT_FONT;
    if (isDict(dict)) { try { font = this.loadFont(dict); } catch { font = DEFAULT_FONT; } }
    if (key !== null) this.fonts.set(key, font); else if (isDict(dict)) this.fontsByDict.set(dict, font);
    return font;
  }
  loadFont(f) {
    const font = new Font(), sub = nameOf(this.deref(f.Subtype)), tuStream = this.deref(f.ToUnicode), tu = tuStream instanceof Stream ? this.cmapOf(tuStream) : null;
    const clean = m => { if (!m) return null; const out = new Map(); for (const [k, v] of m) { const u = usable(v); if (u !== null) out.set(k, u); } return out; };
    if (sub === 'Type0') {
      font.cid = true;
      const enc = this.deref(f.Encoding), encName = nameOf(enc), embedded = enc instanceof Stream ? this.cmapOf(enc) : null;
      const desc = this.deref((this.deref(f.DescendantFonts) || [])[0]);
      if (isDict(desc)) { const dw = this.numberOf(desc.DW); if (Number.isFinite(dw)) font.dw = dw; this.parseW(font, desc.W); }
      if (encName && /^Uni.*-(UCS2|UTF16)-[HV]$/.test(encName)) font.unicode = true;
      // how many bytes a code has: Identity is two; otherwise what the encoding's own CMap (or, failing that, the ToUnicode) says
      const identity = encName === 'Identity-H' || encName === 'Identity-V', spaces = identity ? null : embedded && embedded.spaces.length ? embedded.spaces : tu && tu.spaces.length ? tu.spaces : null;
      if (!font.unicode && spaces && !(spaces.length === 1 && spaces[0].len === 2)) font.spaces = spaces;
      if (embedded && embedded.cid.length) { const r = embedded.cid.slice().sort((a, b) => a[0] - b[0]); font.cidMap = code => { let lo = 0, hi = r.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (code < r[m][0]) hi = m - 1; else if (code > r[m][1]) lo = m + 1; else return r[m][2] + code - r[m][0]; } return code; }; }
      font.uni = clean(tu && tu.map);
      return font;
    }
    // a simple font
    const baseFont = String(nameOf(this.deref(f.BaseFont)) || ''), fd = this.deref(f.FontDescriptor);
    const flags = isDict(fd) ? this.numberOf(fd.Flags) || 0 : 0, enc = this.deref(f.Encoding);
    let baseName = nameOf(enc), diffs = null;
    if (isDict(enc)) { baseName = nameOf(this.deref(enc.BaseEncoding)); diffs = this.deref(enc.Differences); }
    const plain = baseFont.replace(/^[A-Z]{6}\+/, '');
    let map;
    if (tu && !baseName && !diffs && !/^(symbol|zapfdingbats)/i.test(plain)) map = new Array(256).fill(null);        // codes a subsetting program made up: only the CMap says what they are
    else if (baseName === 'WinAnsiEncoding') map = WIN.slice();
    else if (baseName === 'MacRomanEncoding') map = MAC.slice();
    else if (baseName === 'StandardEncoding' || baseName === 'MacExpertEncoding') map = STD.slice();
    else if (/^symbol/i.test(plain)) map = SYMBOL.slice();
    else if (/^zapfdingbats/i.test(plain)) map = ZAPF.slice();
    else {
      const own = sub === 'Type1' || sub === 'MMType1' ? this.type1Encoding(fd) : null;       // the font's own encoding, read from its font file
      if (Array.isArray(own)) { map = STD.slice(); for (let c = 0; c < 256; c++) if (own[c]) map[c] = glyphToUni(own[c]); }
      else map = sub === 'Type1' || sub === 'MMType1' ? STD.slice() : WIN.slice();
    }
    if (Array.isArray(diffs)) {
      let code = 0;
      for (let i = 0; i < diffs.length && i < 5000; i++) { const v = this.deref(diffs[i]); if (typeof v === 'number') code = v | 0; else if (v instanceof Name) { if (code >= 0 && code < 256) map[code] = glyphToUni(v.name); code++; } }
    }
    if (tu) for (let c = 0; c < 256; c++) { const u = usable(tu.map.get(c)); if (u !== null) map[c] = u; }
    for (let c = 0; c < 32; c++) if (map[c] === undefined) map[c] = null;
    font.map = map;
    // widths
    const widthsArr = this.deref(f.Widths), first = this.numberOf(f.FirstChar), missing = isDict(fd) ? this.numberOf(fd.MissingWidth) || 0 : 0;
    const { family, exact } = stdFamily(baseFont, flags);
    let scale = 1; if (sub === 'Type3') { const fm = this.deref(f.FontMatrix); scale = Array.isArray(fm) && typeof fm[0] === 'number' && fm[0] > 0 ? fm[0] * 1000 : 1; }
    const widths = new Array(256).fill(undefined);
    if (Array.isArray(widthsArr)) {
      for (let i = 0; i < widthsArr.length && i < 256; i++) { const v = this.deref(widthsArr[i]), c = (Number.isFinite(first) ? first : 0) + i; if (c >= 0 && c < 256 && typeof v === 'number') widths[c] = v * scale; }
      for (let c = 0; c < 256; c++) if (widths[c] === undefined) widths[c] = missing;
    } else { font.approx = !exact; for (let c = 0; c < 256; c++) widths[c] = stdWidth(family, map[c]); }
    font.widths = widths;
    return font;
  }
  // /W: [c [w w w] c_first c_last w …] widths of composite font glyphs, by glyph number.
  parseW(font, w) {
    const a = this.deref(w); if (!Array.isArray(a)) return;
    const single = new Map(), ranges = [];
    for (let i = 0; i < a.length && i < 1e6;) {
      const first = numOf(this.deref(a[i])), second = this.deref(a[i + 1]);
      if (first === undefined) { i++; continue; }
      if (Array.isArray(second)) { for (let k = 0; k < second.length && single.size < 200000; k++) { const v = numOf(this.deref(second[k])); if (v !== undefined) single.set(first + k, v); } i += 2; }
      else { const last = numOf(second), v = numOf(this.deref(a[i + 2])); if (last !== undefined && v !== undefined && ranges.length < 100000) ranges.push([first, last, v]); i += 3; }
    }
    font.single = single; font.ranges = ranges;
  }
  // The encoding built into an embedded Type 1 font program (its readable first part lists "dup 12 /fi put"), as an array of
  // glyph names, or 'standard' when it says StandardEncoding, or null.
  type1Encoding(fd) {
    const cff = isDict(fd) ? this.deref(fd.FontFile3) : null;
    if (cff instanceof Stream) { const d = this.streamData(cff), names = d && cffEncoding(d); return names || null; }
    const ff = isDict(fd) ? this.deref(fd.FontFile) : null; if (!(ff instanceof Stream)) return null;
    const data = this.streamData(ff); if (!data) return null;
    let head = data.toString('latin1', 0, Math.min(data.length, 80000)); const cut = head.indexOf('eexec'); if (cut > 0) head = head.slice(0, cut);
    const names = []; const re = /dup\s+(\d+)\s*\/([^\s\/\[\]{}()<>%]+)\s+put/g; let m;
    while ((m = re.exec(head))) { const c = +m[1]; if (c < 256) names[c] = m[2]; }
    return names.length ? names : /\/Encoding\s+StandardEncoding\s+def/.test(head) ? 'standard' : null;
  }
}
const SPACE = Buffer.from(' ');

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 7: reading a page. The drawing instructions are run only as far as it takes to know where each piece of text is
// put: the text matrices (BT, Td, TD, Tm, T*, TL), the font and its size (Tf), spacing (Tc, Tw, Tz, Ts), the current
// transformation (cm, q, Q), and the showing of strings (Tj, TJ, ' and "). Text comes out in the order it is drawn, which for
// nearly every program is the reading order. Between one piece and the next:
//   - a move across the line by more than half the text size is a new line (a smaller one is a superscript or subscript),
//     a move back along the line by more than 2 em is a new line too (a new column), a different direction is a new line;
//   - a gap along the line of more than 0.15 em (0.4 when the font's widths are only a guess) is a space; in a TJ array a
//     number below -150 (thousandths of an em) is a space too;
//   - the same text drawn again in nearly the same place (fake bold) is read once.
// Lines are then joined with a blank line where the gap above is much more than the usual line distance of the page,
// and a word split by a hyphen at a line end is joined when the next line goes on in lower case.
const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];
const isNum6 = a => Array.isArray(a) && a.length >= 6 && a.slice(0, 6).every(x => typeof x === 'number' && Number.isFinite(x));
const TJ_SPACE = 0.15, GAP_KNOWN = 0.15, GAP_GUESS = 0.4, MAX_OPS = 3e6, MAX_FORMS = 20000, MAX_DEPTH = 12, MAX_LINES = 200000;
const RTL = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/;
// The text of an /ActualText string: UTF-16 with a byte order mark, or otherwise one byte a character.
function actualText(s) {
  if (s.charCodeAt(0) === 0xfe && s.charCodeAt(1) === 0xff) { let r = ''; for (let i = 2; i + 1 < s.length; i += 2) r += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1)); return r; }
  if (s.charCodeAt(0) === 0xff && s.charCodeAt(1) === 0xfe) { let r = ''; for (let i = 2; i + 1 < s.length; i += 2) r += String.fromCharCode((s.charCodeAt(i + 1) << 8) | s.charCodeAt(i)); return r; }
  return s;
}
// Hebrew and Arabic drawn from left to right, glyph by glyph (what browsers print), come in the order they are seen, which is
// backwards. A line that is mostly such text is turned round, and the runs that read left to right (Latin letters, digits and
// what is between them) are put back in their own order.
const isRight = c => (c >= 0x590 && c <= 0x8ff) || (c >= 0xfb1d && c <= 0xfdff) || (c >= 0xfe70 && c <= 0xfeff);
function readingOrder(s) {
  let right = 0, letters = 0;
  for (const ch of s) { if (/\p{L}/u.test(ch)) { letters++; if (isRight(ch.codePointAt(0))) right++; } }
  if (right * 2 <= letters) return s;
  const cps = [...s].reverse(), ltr = ch => !isRight(ch.codePointAt(0)) && /[\p{L}\p{N}]/u.test(ch), out = [];
  for (let i = 0; i < cps.length;) {
    if (!ltr(cps[i])) { out.push(cps[i++]); continue; }
    let j = i, last = i;
    while (j < cps.length) { if (ltr(cps[j])) last = j; else if (isRight(cps[j].codePointAt(0))) break; j++; }
    for (let k = last; k >= i; k--) out.push(cps[k]);
    i = last + 1;
  }
  return out.join('');
}
const LIGATURES = { '\ufb00': 'ff', '\ufb01': 'fi', '\ufb02': 'fl', '\ufb03': 'ffi', '\ufb04': 'ffl', '\ufb05': 'st', '\ufb06': 'st' };
class Extractor {
  constructor(doc) {
    this.doc = doc; this.lines = []; this.cur = null; this.prev = null; this.stack = []; this.tm = IDENTITY; this.tlm = IDENTITY;
    this.gs = { ctm: IDENTITY, tc: 0, tw: 0, th: 1, tl: 0, fs: 0, font: null, rise: 0 };
    this.ops = 0; this.forms = 0; this.active = new Set(); this.readable = 0; this.unreadable = 0; this.size = 0; this.full = false; this.marks = []; this.live = -1; this.over = 0;
  }
  // Runs one stream of drawing instructions with the resources (fonts, forms) it can use.
  run(data, res, depth) {
    const lx = new Lexer(data), args = [], n = i => (typeof args[i] === 'number' ? args[i] : 0);
    for (;;) {
      const t = lx.read(false);
      if (t === END) return;
      if (!(t instanceof Cmd)) { if (args.length >= 64) args.length = 0; args.push(t); continue; }
      if (++this.ops > MAX_OPS) return;
      const gs = this.gs;
      switch (t.cmd) {
        case 'q': if (this.stack.length < 128) this.stack.push({ ...gs }); break;
        case 'Q': if (this.stack.length) this.gs = this.stack.pop(); break;
        case 'cm': if (isNum6(args)) gs.ctm = mul(args.slice(0, 6), gs.ctm); break;
        case 'BT': this.tm = IDENTITY; this.tlm = IDENTITY; break;
        case 'Tc': gs.tc = n(0); break;
        case 'Tw': gs.tw = n(0); break;
        case 'Tz': gs.th = n(0) / 100; break;
        case 'TL': gs.tl = n(0); break;
        case 'Ts': gs.rise = n(0); break;
        case 'Tf': if (args[0] instanceof Name) gs.font = this.doc.fontFor(res, args[0].name); gs.fs = n(1); break;
        case 'Td': this.move(n(0), n(1)); break;
        case 'TD': gs.tl = -n(1); this.move(n(0), n(1)); break;
        case 'Tm': if (isNum6(args)) { this.tlm = args.slice(0, 6); this.tm = this.tlm; } break;
        case 'T*': this.move(0, -gs.tl); break;
        case 'Tj': this.show([args[0]]); break;
        case 'TJ': this.show(Array.isArray(args[0]) ? args[0] : []); break;
        case '\'': this.move(0, -gs.tl); this.show([args[0]]); break;
        case '"': gs.tw = n(0); gs.tc = n(1); this.move(0, -gs.tl); this.show([args[2]]); break;
        case 'Do': if (args[0] instanceof Name) this.form(args[0].name, res, depth); break;
        case 'BI': this.skipInline(lx); break;
        case 'BMC': this.mark(null); break;
        case 'BDC': {                                                              // marked content, perhaps with the text it really stands for
          let props = args[1];
          if (props instanceof Name) { const r = this.doc.deref(res), pr = isDict(r) ? this.doc.deref(r.Properties) : null; props = isDict(pr) ? this.doc.deref(pr[props.name]) : null; }
          this.mark(isDict(props) && props.ActualText instanceof PStr ? { text: actualText(props.ActualText.s), g: null, approx: false } : null);
          break;
        }
        case 'EMC': this.unmark(); break;
      }
      args.length = 0;
    }
  }
  // BMC/BDC push an entry (null, or the text a span really stands for); EMC pops it. The outermost entry with a text is the live
  // one: the text shown inside it is replaced by that text, put where the first of it was drawn, when the span ends.
  mark(entry) {
    if (this.marks.length >= 512) { this.over++; return; }
    this.marks.push(entry);
    if (entry && this.live < 0) this.live = this.marks.length - 1;
  }
  unmark() {
    if (this.over) { this.over--; return; }
    if (!this.marks.length) return;
    const entry = this.marks.pop();
    if (entry && this.live === this.marks.length) {
      this.live = -1;
      if (entry.g && entry.text) this.emit(entry.text, entry.g, this.geom(this.tm), entry.approx);
    }
  }
  move(tx, ty) { const m = this.tlm; this.tlm = [m[0], m[1], m[2], m[3], tx * m[0] + ty * m[2] + m[4], tx * m[1] + ty * m[3] + m[5]]; this.tm = this.tlm; }
  // Where the next character goes, in page units: its origin, the direction of the line (a unit vector), the text size
  // (vertical, for deciding about lines) and the size of one em along the line (for deciding about gaps).
  geom(tm) {
    const gs = this.gs, c = gs.ctm, ox = gs.rise * tm[2] + tm[4], oy = gs.rise * tm[3] + tm[5];
    const dx = tm[0] * c[0] + tm[1] * c[2], dy = tm[0] * c[1] + tm[1] * c[3], vx = tm[2] * c[0] + tm[3] * c[2], vy = tm[2] * c[1] + tm[3] * c[3];
    const dl = Math.hypot(dx, dy), fs = Math.abs(gs.fs) || 1;
    const size = Math.max(fs * Math.hypot(vx, vy), 1e-3), hem = Math.max(fs * Math.abs(gs.th || 1) * dl, 1e-3);
    return { x: ox * c[0] + oy * c[2] + c[4], y: ox * c[1] + oy * c[3] + c[5], ux: dl > 1e-9 ? dx / dl : 1, uy: dl > 1e-9 ? dy / dl : 0, size, hem };
  }
  // Shows strings (and, in a TJ array, moves between them) and moves the text position along.
  show(items) {
    const gs = this.gs, font = gs.font || DEFAULT_FONT, fs = gs.fs, th = gs.th, tc = gs.tc, tw = gs.tw, g = this.geom(this.tm), parts = [];
    let tx = 0, lastWs = true;
    const live = this.live >= 0 ? this.marks[this.live] : null;                      // inside marked content that says what its text is: only move along
    if (live) {
      if (!live.g) { live.g = g; live.approx = font.approx; }
      for (const it of items) {
        if (typeof it === 'number') tx += -it / 1000 * fs * th;
        else if (it instanceof PStr) {
          const s = it.s;
          if (font.cid) for (let i = 0; i < s.length;) { const code = font.next(s, i), len = font.n; i += len; tx += ((font.width(code) / 1000) * fs + tc + (len === 1 && code === 32 ? tw : 0)) * th; }
          else for (let i = 0; i < s.length; i++) { const code = s.charCodeAt(i) & 255; tx += ((font.widths[code] / 1000) * fs + tc + (code === 32 ? tw : 0)) * th; }
        }
      }
      const m = this.tm; this.tm = [m[0], m[1], m[2], m[3], tx * m[0] + m[4], tx * m[1] + m[5]];
      return;
    }
    for (const it of items) {
      if (typeof it === 'number') {
        const em = -it / 1000;
        if (em > TJ_SPACE && !lastWs) { parts.push(' '); lastWs = true; }
        tx += em * fs * th;
      } else if (it instanceof PStr) {
        const s = it.s, gapAfter = tc > 0.15 * Math.abs(fs) && s.length <= 4;       // PostScript printers put a word space as spacing after the last letter of a short piece
        if (font.cid) {
          for (let i = 0; i < s.length;) {
            const code = font.next(s, i), len = font.n; i += len;
            const t = font.text(code);
            if (t === null) this.unreadable++; else { parts.push(t); lastWs = t.charCodeAt(t.length - 1) <= 32; if (t !== ' ') this.readable += t.length; }
            tx += ((font.width(code) / 1000) * fs + tc + (len === 1 && code === 32 ? tw : 0)) * th;
            if (gapAfter && i < s.length && !lastWs) { parts.push(' '); lastWs = true; }
          }
        } else {
          const map = font.map, widths = font.widths;
          for (let i = 0; i < s.length; i++) {
            const code = s.charCodeAt(i) & 255, t = map[code];
            if (t === null || t === undefined) this.unreadable++; else { parts.push(t); lastWs = t.length === 0 || t.charCodeAt(t.length - 1) <= 32; if (t !== ' ') this.readable += t.length; }
            tx += ((widths[code] / 1000) * fs + tc + (code === 32 ? tw : 0)) * th;
            if (gapAfter && i + 1 < s.length && !lastWs) { parts.push(' '); lastWs = true; }
          }
        }
      }
    }
    const m = this.tm; this.tm = [m[0], m[1], m[2], m[3], tx * m[0] + m[4], tx * m[1] + m[5]];
    if (parts.length) this.emit(parts.join(''), g, this.geom(this.tm), font.approx);
  }
  // Puts a piece of text on the current line or starts a new one.
  emit(text, g, e, approx) {
    if (this.full) return;
    const pv = this.prev;
    let newLine = !this.cur, gap = 0, space = false, along = 0;
    if (this.cur) {
      const dx = g.x - pv.x, dy = g.y - pv.y, perp = -dx * pv.uy + dy * pv.ux, ref = Math.max(g.size, pv.size), hem = Math.max(g.hem, pv.hem);
      along = dx * pv.ux + dy * pv.uy;
      // the same text drawn again at (nearly) the very same place is fake bold; a letter repeated right after itself (the second l
      // of "cell") starts a whole letter further on, which is far more than that
      if (text === pv.text && Math.hypot(g.x - pv.sx, g.y - pv.sy) < Math.min(0.06 * ref, 0.3 * Math.hypot(pv.x - pv.sx, pv.y - pv.sy))) return;
      if (g.ux * pv.ux + g.uy * pv.uy < 0.9) newLine = true;
      else if (Math.abs(perp) > 0.5 * ref) { newLine = true; gap = Math.abs(perp); }
      else if (!approx && !pv.approx && !pv.rtl && !RTL.test(text) && along < -2 * hem) newLine = true;                 // (right-to-left text moves backwards by nature)
      else if (along > (approx || pv.approx ? GAP_GUESS : GAP_KNOWN) * hem) space = true;
    }
    this.size += text.length;
    if (this.size > MAX_CHARS || this.lines.length >= MAX_LINES) { this.full = true; return; }                  // a page can't hold more than this
    const rtl = RTL.test(text);
    if (newLine) { this.cur = { parts: [text], gap, size: g.size, ws: text.charCodeAt(text.length - 1) <= 32, fwd: 0, back: 0 }; this.lines.push(this.cur); }
    else {
      if (space && !this.cur.ws && text.charCodeAt(0) > 32) this.cur.parts.push(' ');
      this.cur.parts.push(text); this.cur.ws = text.charCodeAt(text.length - 1) <= 32;
      if (rtl) { const step = (g.x - pv.sx) * pv.ux + (g.y - pv.sy) * pv.uy, tol = 0.05 * Math.max(g.hem, pv.hem); if (step < -tol) this.cur.back++; else if (step > tol) this.cur.fwd++; }     // which way right-to-left text was drawn: each piece starts to the right or to the left of the one before
    }
    this.prev = { x: e.x, y: e.y, ux: g.ux, uy: g.uy, size: g.size, hem: g.hem, sx: g.x, sy: g.y, text, approx, rtl };
  }
  // A form XObject (a reusable piece of page): its text is read where it is drawn, with its own resources, once for each time
  // it is drawn. A form that (however indirectly) draws itself, forms nested more than 12 deep and more than 20,000 forms
  // on a page are not followed.
  form(name, res, depth) {
    if (depth >= MAX_DEPTH || ++this.forms > MAX_FORMS) return;
    const doc = this.doc, r = doc.deref(res), xo = isDict(r) ? doc.deref(r.XObject) : null, obj = doc.deref(isDict(xo) ? xo[name] : undefined);
    if (!(obj instanceof Stream) || nameOf(doc.deref(obj.dict.Subtype)) !== 'Form' || this.active.has(obj.start)) return;
    let data = doc.forms.get(obj.start);
    if (data === undefined) { data = doc.streamData(obj); if (doc.forms.size > 200) doc.forms.clear(); doc.forms.set(obj.start, data); }
    if (!data) return;
    const m = doc.deref(obj.dict.Matrix), saved = [this.gs, this.stack, this.tm, this.tlm, this.marks, this.live, this.over];
    this.gs = { ...this.gs }; if (isNum6(m)) this.gs.ctm = mul(m.slice(0, 6), this.gs.ctm);
    this.stack = []; this.marks = []; this.live = -1; this.over = 0; this.active.add(obj.start);
    try { this.run(data, obj.dict.Resources !== undefined ? obj.dict.Resources : res, depth + 1); }
    finally { this.active.delete(obj.start); [this.gs, this.stack, this.tm, this.tlm, this.marks, this.live, this.over] = saved; }
  }
  // After BI (an inline image) comes its settings, then ID and the picture's bytes, then EI. The bytes can look like anything,
  // so skip them by their size when it is known (no filter), otherwise up to an EI that is followed by what looks like text.
  skipInline(lx) {
    const b = lx.b, end = lx.end, d = Object.create(null);
    for (let k = 0; k < 64; k++) {
      const key = lx.read(false); if (key === END) return;
      if (key instanceof Cmd) { if (key.cmd === 'ID') break; continue; }
      if (!(key instanceof Name)) continue;
      const v = lx.read(false); if (v === END) return;
      if (v instanceof Cmd) { if (v.cmd === 'ID') break; continue; }
      d[key.name] = v;
    }
    let p = lx.pos; if (p < end && WS[b[p]]) { p += b[p] === 13 && b[p + 1] === 10 ? 2 : 1; }
    const w = d.W ?? d.Width, h = d.H ?? d.Height, mask = (d.IM ?? d.ImageMask) === true, cs = d.CS ?? d.ColorSpace, csn = nameOf(cs) || '';
    const bpc = mask ? 1 : (d.BPC ?? d.BitsPerComponent), ncomp = /^(RGB|DeviceRGB|CalRGB)$/.test(csn) ? 3 : /^(CMYK|DeviceCMYK)$/.test(csn) ? 4 : /^(G|DeviceGray|CalGray|I|Indexed)$/.test(csn) || mask || Array.isArray(cs) ? 1 : 0;
    if ((d.F ?? d.Filter) === undefined && typeof w === 'number' && typeof h === 'number' && typeof bpc === 'number' && ncomp) {
      const q = p + Math.ceil(w * ncomp * bpc / 8) * h; let e = q;
      if (q >= p && q <= end) { while (e < end && WS[b[e]]) e++; if (b[e] === 0x45 && b[e + 1] === 0x49 && (e + 2 >= end || WS[b[e + 2]] || DL[b[e + 2]])) { lx.pos = e + 2; return; } }
    }
    for (let q = p; q + 2 <= end; q++) {
      if (b[q] === 0x45 && b[q + 1] === 0x49 && (q === p || WS[b[q - 1]]) && (q + 2 >= end || WS[b[q + 2]])) {
        let ok = true; for (let k = q + 2; k < Math.min(end, q + 12); k++) { const c = b[k]; if (c > 127 || (c < 32 && !WS[c])) { ok = false; break; } }
        if (ok) { lx.pos = q + 2; return; }
      }
    }
    lx.pos = end;
  }
  // The page as text: lines, a blank line where the gap above a line is much bigger than the page's usual line distance
  // (the lower median of all the gaps), a hyphen at a line end joined to the lowercase word that goes on, ligature characters
  // spelled out, odd spaces and control characters gone, and composed (NFC) accents. Lines with no text only add their gap.
  finish() {
    const lines = this.lines, gaps = lines.map(l => l.gap).filter(x => x > 0).sort((a, b) => a - b), med = gaps.length ? gaps[(gaps.length - 1) >> 1] : 0;
    const out = []; let carry = 0;
    for (const l of lines) {
      let s = l.parts.join('').replace(/\s+/g, ' ').trim();
      if (!s) { carry += l.gap; continue; }
      if (l.fwd > l.back && RTL.test(s)) s = readingOrder(s);
      const gap = l.gap + carry; carry = 0;
      if (out.length && med > 0 && gap > 1.35 * med) out.push('');
      out.push(s);
    }
    const res = []; let hyphen = false;                                               // word- hyphenated at a line end: joined to the lowercase word that goes on
    for (const line of out) {
      if (hyphen && line !== '' && /^\p{Ll}/u.test(line)) { const a = res[res.length - 1]; a[a.length - 1] = a[a.length - 1].slice(0, -1); a.push(line); }
      else res.push([line]);
      hyphen = line !== '' && /\p{L}[-\u00ad\u2010\u2011]$/u.test(line);
    }
    let text = res.map(a => a.join('')).join('\n');
    text = text.replace(/[\ufb00-\ufb06]/g, c => LIGATURES[c]).replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ').replace(/[\u00ad\u200b-\u200f\u2028-\u202e\u2060\ufeff\ufffd\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
    text = text.split('\n').map(l => l.replace(/ {2,}/g, ' ').trim()).join('\n');
    const before = text.length; text = text.replace(/[\ue000-\uf8ff]/g, ''); this.unreadable += before - text.length;
    return { text: text.normalize('NFC').trim(), readable: this.readable, unreadable: this.unreadable };
  }
}
PdfDoc.prototype.pageText = function (page) {
  const ex = new Extractor(this), data = this.pageContent(page);
  if (data.length) { try { ex.run(data, page.res, 0); } catch { /* keep what was read */ } }
  return ex.finish();
};

// ---------------------------------------------------------------------------------------------------------------------
// readPdf: { pages, units: [{ at: 'p. 3', text }], chars, scanned }. `pages` is how many pages were found; `units` has a unit
// for each page with text (the first 2000 pages are read, within 20 seconds and 5,000,000 characters; `truncated: true`
// when that stopped it early). `scanned` is true when there is too little text to be the document (under 40 characters a
// page on average), or most of the characters could not be read (a font with no way to find its text): the pages are
// pictures and need OCR or vision. A password-protected PDF is refused, a damaged one too.
export function readPdf(input) {
  const buf = asBuffer(input);
  if (buf.length > 120e6) fail('toolarge');
  try { return readPdfBytes(buf); }
  catch (e) { if (e instanceof ExtractError) throw e; throw new ExtractError(SAY.broken, 'broken'); }
}
function readPdfBytes(buf) {
  if (buf.subarray(0, 1024).indexOf('%PDF-') < 0) fail('broken');
  const doc = new PdfDoc(buf);
  if (doc.locked) throw new ExtractError(SAY.encrypted, 'encrypted');
  const pages = doc.pageList();
  if (!pages.length) fail('broken');
  const units = []; let chars = 0, readable = 0, unreadable = 0, read = 0, truncated = false;
  for (let i = 0; i < pages.length; i++) {
    if (i >= MAX_PAGES || chars >= MAX_CHARS || Date.now() > doc.deadline) { truncated = true; break; }
    let r = null; try { r = doc.pageText(pages[i]); } catch { /* an unreadable page has no text */ }
    read++;
    if (!r) continue;
    readable += r.readable; unreadable += r.unreadable;
    if (r.text) {
      let text = r.text; if (chars + text.length > MAX_CHARS) { text = cutTo(text, MAX_CHARS - chars); truncated = true; }
      units.push({ at: 'p. ' + (i + 1), text }); chars += text.length;
    }
  }
  const res = { pages: pages.length, units, chars, scanned: read > 0 && (chars / read < 40 || (unreadable >= 20 && unreadable > readable)) };
  if (truncated) res.truncated = true;
  return res;
}

// ---------------------------------------------------------------------------------------------------------------------
// Office files. A .pptx and a .docx are zips of xml parts. Only the parts that hold text are inflated. An older Word or
// PowerPoint file (.doc, .ppt) or one locked with a password is not a zip but a "compound file" (and a locked new one says
// so inside); Lucida says which.
const OLE_MAGIC = 0xd0cf11e0, OLD_OFFICE = 'Lucida can’t open old Word or PowerPoint files (.doc or .ppt). Save it as .docx or .pptx, or as a PDF, and try again.';
function openOffice(buf, only) {
  if (buf.length >= 8 && buf.readUInt32BE(0) === OLE_MAGIC && buf.readUInt32BE(4) === 0xa1b11ae1) {
    if (buf.indexOf(Buffer.from('EncryptedPackage', 'utf16le')) >= 0) throw new ExtractError(LOCKED_FILE, 'encrypted');
    throw new ExtractError(OLD_OFFICE, 'broken');
  }
  return unzip(buf, { only, maxEntries: 20000, maxTotal: 200e6, maxEntry: 80e6 });
}
const guarded = fn => input => {
  const buf = asBuffer(input);
  try { return fn(buf); } catch (e) { if (e instanceof ExtractError) throw e; throw new ExtractError(SAY.broken, 'broken'); }
};
const rootOf = x => (x ? x.k.find(isNode) || null : null);
// "word/_rels/…" style relationship files: id -> { type, target }.
function relationships(zip, path) {
  const m = new Map(), root = rootOf(partXml(zip, path));
  if (root) for (const r of kidsOf(root, 'Relationship')) m.set(attr(r, 'Id'), { type: attr(r, 'Type') || '', target: attr(r, 'Target') || '' });
  return m;
}
// A part's path from a relationship's target, which is relative to the part that holds the relationship.
function joinPath(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.' && seg !== '') parts.push(seg); }
  return parts.join('/');
}
function findAll(node, name, out = []) { for (const c of node.k) if (isNode(c)) { if (c.n === name) out.push(c); else findAll(c, name, out); } return out; }

// Equations (Office Math, the m: elements of Word and PowerPoint) as plain text: fractions a/b, powers x^2, indexes x_i, roots,
// sums and integrals with their limits, brackets, functions. Single letters and digits need no brackets, anything longer gets them.
function mathText(node) {
  const part = (n, name) => { const c = kid(n, name); return c ? mathText(c) : ''; };
  const wrap = t => (t.length > 1 && !/^[\w.]+$/.test(t) ? '(' + t + ')' : t);
  const chr = (n, pr, name, d) => { const p = kid(n, pr), c = p && kid(p, name); return c ? attr(c, 'val') ?? d : d; };
  let s = '';
  for (const c of node.k) {
    if (!isNode(c)) continue;
    switch (c.n) {
      case 't': s += allText(c); break;
      case 'f': s += wrap(part(c, 'num')) + '/' + wrap(part(c, 'den')); break;
      case 'sSup': s += wrap(part(c, 'e')) + '^' + wrap(part(c, 'sup')); break;
      case 'sSub': s += wrap(part(c, 'e')) + '_' + wrap(part(c, 'sub')); break;
      case 'sSubSup': s += wrap(part(c, 'e')) + '_' + wrap(part(c, 'sub')) + '^' + wrap(part(c, 'sup')); break;
      case 'rad': { const d = part(c, 'deg'); s += (d ? wrap(d) + '-th root of ' : '√') + wrap(part(c, 'e')); break; }
      case 'nary': { const sub = part(c, 'sub'), sup = part(c, 'sup'); s += chr(c, 'naryPr', 'chr', '∫') + (sub ? '_' + wrap(sub) : '') + (sup ? '^' + wrap(sup) : '') + ' ' + part(c, 'e'); break; }
      case 'd': s += chr(c, 'dPr', 'begChr', '(') + kidsOf(c, 'e').map(mathText).join(chr(c, 'dPr', 'sepChr', '|')) + chr(c, 'dPr', 'endChr', ')'); break;
      case 'func': s += part(c, 'fName') + ' ' + part(c, 'e'); break;
      case 'mPr': case 'rPr': case 'ctrlPr': case 'fPr': case 'dPr': case 'naryPr': case 'radPr': break;
      default: s += mathText(c);
    }
  }
  return s;
}

// ---------------------------------------------------------------------------------------------------------------------
// readPptx: { slides, units: [{ at: 'Slide 4', text }] } in the order of the show (presentation.xml lists the slides; the
// file names may be in any order). A slide's text is its title, then the other text (paragraphs, nested bullets indented two
// spaces a level, tables as "a | b" rows), then "Notes: …" for the speaker notes. Footers, dates and slide numbers are
// left out. Slides with no text count in `slides` but have no unit.
const PPTX_PARTS = /^ppt\/(presentation\.xml|_rels\/presentation\.xml\.rels|slides\/|notesSlides\/|diagrams\/data|charts\/chart)/;
export const readPptx = guarded(buf => {
  const zip = openOffice(buf, n => PPTX_PARTS.test(n));
  const rels = relationships(zip, 'ppt/_rels/presentation.xml.rels'), slides = [];
  const pres = rootOf(partXml(zip, 'ppt/presentation.xml')), list = pres && findAll(pres, 'sldId');
  if (list) for (const s of list) { const rel = rels.get(attr(s, 'r:id')), path = rel && joinPath('ppt/presentation.xml', rel.target); if (path && zip.has(path) && !slides.includes(path)) slides.push(path); }
  if (!slides.length) {
    const found = [...zip.keys()].map(k => /^ppt\/slides\/slide(\d+)\.xml$/.exec(k)).filter(Boolean).sort((a, b) => a[1] - b[1]);
    for (const m of found) slides.push(m[0]);
  }
  if (!slides.length) fail('broken');
  const units = []; let chars = 0;
  for (let i = 0; i < slides.length && chars < MAX_CHARS; i++) {
    const text = slideText(zip, slides[i]);
    if (text) { units.push({ at: 'Slide ' + (i + 1), text }); chars += text.length; }
  }
  if (!units.length) fail('empty');
  return { slides: slides.length, units };
});
const SKIP_PLACEHOLDERS = new Set(['hdr', 'ftr', 'dt', 'sldNum', 'sldImg']);
function slideText(zip, path) {
  const root = rootOf(partXml(zip, path)); if (!root) return '';
  const rels = relationships(zip, path.replace(/([^/]+)$/, '_rels/$1.rels')), tree = kid(kid(root, 'cSld') || root, 'spTree'), got = { title: [], body: [] };
  if (tree) shapesText(tree, got, false, { zip, rels, path });
  const lines = [...got.title, ...got.body];
  for (const r of rels.values()) {
    if (!/\/notesSlide$/.test(r.type)) continue;
    const nroot = rootOf(partXml(zip, joinPath(path, r.target))), ntree = nroot && kid(kid(nroot, 'cSld') || nroot, 'spTree');
    if (ntree) { const n = { title: [], body: [] }; shapesText(ntree, n, true); if (n.body.length) lines.push('Notes: ' + n.body.join('\n')); }
    break;
  }
  return trimLines(lines.join('\n'));
}
// Text of the shapes in a shape tree. In a notes page only the notes body counts (not the slide picture or number).
function shapesText(tree, out, notes, ctx) {
  for (const c of tree.k) {
    if (!isNode(c)) continue;
    if (c.n === 'sp') {
      const ph = c.k.find(x => isNode(x) && x.n === 'nvSpPr'), phEl = ph && findAll(ph, 'ph')[0], type = phEl ? attr(phEl, 'type') || 'body' : null;
      if (type && SKIP_PLACEHOLDERS.has(type)) continue;
      if (notes && type !== 'body') continue;
      const tx = kid(c, 'txBody'); if (!tx) continue;
      (type === 'title' || type === 'ctrTitle' ? out.title : out.body).push(...slideParagraphs(tx));
    } else if (c.n === 'grpSp') shapesText(c, out, notes, ctx);
    else if (c.n === 'graphicFrame') {
      for (const tbl of findAll(c, 'tbl')) for (const tr of kidsOf(tbl, 'tr')) {
        const cells = kidsOf(tr, 'tc').map(tc => { const tx = kid(tc, 'txBody'); return tx ? slideParagraphs(tx).map(s => s.trim()).join(' ') : ''; });
        if (cells.some(Boolean)) out.body.push(cells.join(' | '));
      }
      if (ctx) {                                                                  // SmartArt and charts keep their text in parts of their own
        for (const r of findAll(c, 'relIds')) { const rel = ctx.rels.get(attr(r, 'r:dm')), root = rel && rootOf(partXml(ctx.zip, joinPath(ctx.path, rel.target))); if (root) out.body.push(...diagramLines(root)); }
        for (const r of findAll(c, 'chart')) { const rel = ctx.rels.get(attr(r, 'r:id')), root = rel && rootOf(partXml(ctx.zip, joinPath(ctx.path, rel.target))); if (root) out.body.push(...chartLines(root)); }
      }
    } else if (c.n === 'AlternateContent') { const ch = kid(c, 'Choice') || kid(c, 'Fallback'); if (ch) shapesText(ch, out, notes, ctx); }
  }
}
// The text of the boxes of a SmartArt diagram (its data part: every node point that has text), one line each.
function diagramLines(root) {
  const out = [];
  for (const pt of findAll(root, 'pt')) { const type = attr(pt, 'type'); if (type && type !== 'node' && type !== 'asst') continue; const t = kid(pt, 't'); if (t) for (const l of slideParagraphs(t)) out.push(l.trim()); }
  return out;
}
// What a chart says in words: its titles, the names of its series and its categories.
function chartLines(root) {
  const out = [];
  for (const t of findAll(root, 'title')) { const s = allText(t).replace(/\s+/g, ' ').trim(); if (s) out.push(s); }
  const names = tag => findAll(root, tag).flatMap(x => findAll(x, 'v').map(v => allText(v).trim()).filter(Boolean));
  const series = findAll(root, 'ser').flatMap(x => { const tx = kid(x, 'tx'); return tx ? findAll(tx, 'v').map(v => allText(v).trim()).filter(Boolean) : []; }), cats = names('cat').filter(v => !/^-?[\d.,]+$/.test(v));
  if (series.length) out.push('Series: ' + series.join(', '));
  if (cats.length) out.push('Categories: ' + [...new Set(cats)].join(', '));
  return out;
}
// The paragraphs of a text body, one string each (a line break inside a paragraph is a \n); a nested level is indented.
function slideParagraphs(txBody) {
  const out = [];
  const inline = node => {
    let s = '';
    for (const r of node.k) {
      if (!isNode(r)) continue;
      if (r.n === 'r') s += allText(r.k.find(x => isNode(x) && x.n === 't') || { k: [] });
      else if (r.n === 'br') s += '\n';
      else if (r.n === 'fld') { const type = attr(r, 'type') || ''; if (!/^(slidenum|datetime)/.test(type)) s += allText(kid(r, 't') || { k: [] }); }
      else if (r.n === 'm') s += findAll(r, 'oMath').map(mathText).join(' ');
      else if (r.n === 'AlternateContent') { const ch = kid(r, 'Choice') || kid(r, 'Fallback'); if (ch) s += inline(ch); }
    }
    return s;
  };
  for (const p of kidsOf(txBody, 'p')) {
    const s = trimNewlines(inline(p).trimEnd()); if (!s.trim()) continue;
    const ppr = kid(p, 'pPr'), lvl = ppr ? Math.min(+attr(ppr, 'lvl') || 0, 8) : 0;
    out.push('  '.repeat(lvl) + s);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// readDocx: { words, pages (an estimate, 450 words a page), units: [{ at, text }] }. The body becomes blocks: a heading is
// "# " (one # a level), a list item "- " (indented two spaces a level), a table row "a | b | c", anything else a paragraph;
// blocks are separated by a blank line, except list items and table rows which follow each other on the next line. Headings
// are paragraph styles Heading1-9 and Title (by id or by the name in styles.xml), or an outline level; a file with none of
// those (made by a program that only sizes text) gets headings from text that is all bold and bigger than the body. The
// units are the parts under each top-level heading (the text before the first heading has the label ''); with no headings
// at all, pieces of about 3000 characters cut between paragraphs. Footnotes and endnotes come last. Hyperlinks, tracked
// insertions, content controls and text boxes are text; deletions, field codes, hidden text and the copy of a text box that
// is only there for old readers are not.
export const readDocx = guarded(buf => {
  const zip = openOffice(buf, n => /^word\/(document|footnotes|endnotes|styles)\.xml$/.test(n));
  const doc = rootOf(partXml(zip, 'word/document.xml')), body = doc && kid(doc, 'body');
  if (!body) fail('broken');
  const styles = wordStyles(rootOf(partXml(zip, 'word/styles.xml'))), blocks = [];
  wordBlocks(body, blocks, styles);
  if (!blocks.some(b => b.kind === 'h')) inferHeadings(blocks);
  const units = [];
  const heads = blocks.filter(b => b.kind === 'h'), top = heads.length ? Math.min(...heads.map(h => h.level)) : 0;
  if (top) {
    let cur = null;
    for (const b of blocks) {
      if (b.kind === 'h' && b.level === top) { cur = { at: b.text.replace(/\s+/g, ' ').slice(0, 120), blocks: [] }; units.push(cur); }
      else if (!cur) { cur = { at: '', blocks: [] }; units.push(cur); }
      cur.blocks.push(b);
    }
  } else {
    let cur = null, size = 0;
    for (const b of blocks) { if (!cur) { cur = { at: '', blocks: [] }; units.push(cur); size = 0; } cur.blocks.push(b); size += b.text.length; if (size >= 3000) cur = null; }
  }
  const out = []; let chars = 0;
  for (const u of units) { if (chars >= MAX_CHARS) break; const text = renderBlocks(u.blocks); if (text) { out.push({ at: u.at, text: cutTo(text, MAX_CHARS - chars) }); chars += text.length; } }
  for (const [file, label] of [['word/footnotes.xml', 'Footnotes'], ['word/endnotes.xml', 'Endnotes']]) {
    const root = rootOf(partXml(zip, file)); if (!root) continue;
    const notes = []; let n = 0;
    for (const f of findAll(root, 'footnote').concat(findAll(root, 'endnote'))) {
      const type = attr(f, 'type'); if (type && type !== 'normal') continue;
      const tmp = []; wordBlocks(f, tmp, styles);
      const text = tmp.map(b => b.text).join(' ').replace(/\s+/g, ' ').trim(); if (text) notes.push('[' + (++n) + '] ' + text);
    }
    if (notes.length && chars < MAX_CHARS) { out.push({ at: label, text: cutTo(notes.join('\n'), MAX_CHARS - chars) }); chars += notes.join('\n').length; }
  }
  if (!out.length) fail('empty');
  const words = out.reduce((n, u) => n + u.text.split(/\s+/).filter(w => w && !/^(#{1,6}|-|\|)$/.test(w)).length, 0);
  return { words, pages: Math.max(1, Math.ceil(words / 450)), units: out };
});
// Paragraph styles by id: { level (a heading level), list }. Names are matched in any case ("heading 1", "Heading 1", "Title");
// a style based on another has what that one has.
function wordStyles(root) {
  const byId = new Map();
  if (!root) return byId;
  for (const s of kidsOf(root, 'style')) {
    const id = attr(s, 'styleId'); if (!id) continue;
    const nm = kid(s, 'name'), name = nm ? String(attr(nm, 'val') || '').toLowerCase() : '', ppr = kid(s, 'pPr'), based = kid(s, 'basedOn');
    let level = 0; const m = /^heading\s*(\d)$/.exec(name);
    if (m) level = +m[1]; else if (name === 'title') level = 1;
    else if (ppr && kid(ppr, 'outlineLvl')) { const o = +attr(kid(ppr, 'outlineLvl'), 'val'); if (o >= 0 && o < 9) level = o + 1; }
    const num = ppr && kid(ppr, 'numPr'), list = !!(num && kid(num, 'numId') && attr(kid(num, 'numId'), 'val') !== '0') || /^list (bullet|number)/.test(name);
    byId.set(id, { level, list, based: based ? attr(based, 'val') : null });
  }
  for (const s of byId.values()) for (let up = s, i = 0; i < 6 && up.based && byId.has(up.based); i++) { up = byId.get(up.based); if (!s.level && up.level) s.level = up.level; if (!s.list && up.list) s.list = true; }
  return byId;
}
// The blocks of a body (or a footnote, a table cell, a content control): paragraphs, tables, nested content.
function wordBlocks(node, blocks, styles) {
  for (const c of node.k) {
    if (!isNode(c)) continue;
    if (c.n === 'p') wordParagraph(c, blocks, styles);
    else if (c.n === 'tbl') {
      for (const tr of kidsOf(c, 'tr')) {
        const cells = []; for (const tc of tr.k) if (isNode(tc) && (tc.n === 'tc' || tc.n === 'sdt')) { const t = []; wordBlocks(tc.n === 'sdt' ? kid(tc, 'sdtContent') || tc : tc, t, styles); cells.push(t.map(b => b.text).join(' ').replace(/\s+/g, ' ').trim()); }
        if (cells.some(Boolean)) blocks.push({ kind: 'row', text: cells.join(' | ') });
      }
    } else if (c.n === 'sdt') { const sc = kid(c, 'sdtContent'); if (sc) wordBlocks(sc, blocks, styles); }
    else if (c.n === 'sdtContent' || c.n === 'ins' || c.n === 'moveTo' || c.n === 'customXml') wordBlocks(c, blocks, styles);
  }
}
function wordParagraph(p, blocks, styles) {
  const ppr = kid(p, 'pPr'), box = [], runs = { size: 0, chars: 0, bold: true };
  let style = '', numId = null, ilvl = 0, outline = null;
  if (ppr) {
    const ps = kid(ppr, 'pStyle'); if (ps) style = attr(ps, 'val') || '';
    const num = kid(ppr, 'numPr'); if (num) { const id = kid(num, 'numId'), lv = kid(num, 'ilvl'); numId = id ? attr(id, 'val') : null; ilvl = lv ? +attr(lv, 'val') || 0 : 0; }
    const ol = kid(ppr, 'outlineLvl'); if (ol) { const o = +attr(ol, 'val'); if (o >= 0 && o < 9) outline = o + 1; }
  }
  const raw = trimLines(wordText(p, box, runs, styles).replace(/\u00a0/g, ' ')), lead = /^[ \t]*/.exec(raw)[0], text = raw.slice(lead.length);
  if (text) {
    const st = styles.get(style) || { level: 0, list: false };
    const builtin = /^heading\s*(\d)$/i.exec(style), level = outline || st.level || (builtin ? +builtin[1] : /^title$/i.test(style) ? 1 : 0);
    if (level) blocks.push({ kind: 'h', level, text: text.replace(/\s*\n\s*/g, ' ') });
    else if ((numId !== null && numId !== '0') || st.list) blocks.push({ kind: 'li', level: Math.min(ilvl, 8), text });
    else {
      const m = /^(?:[•◦▪‣·●○■□]|\d{1,3}[.)](?=\t))[\t ]+(?=\S)/.exec(text);        // a bullet typed as text (what textutil writes: tab, bullet, tab)
      if (m && (!/^\d/.test(m[0]) || lead.includes('\t'))) blocks.push({ kind: 'li', level: 0, text: text.slice(m[0].length) });
      else blocks.push({ kind: 'p', text, size: runs.chars ? runs.size : 0, bold: runs.chars > 0 && runs.bold });
    }
  }
  for (const t of box) if (t.trim()) blocks.push({ kind: 'p', text: t.trim() });         // text boxes come after the paragraph that holds them
}
// The text of a paragraph (or anything inside one). Also gathers the size of the text (the biggest, in half points) and
// whether all of it is bold, for the guess at headings, and the paragraphs of text boxes, which go in `box`.
function wordText(node, box, runs, styles) {
  let s = '';
  for (const c of node.k) {
    if (!isNode(c)) continue;
    switch (c.n) {
      case 'r': s += wordRun(c, box, runs, styles); break;
      case 'hyperlink': case 'ins': case 'moveTo': case 'smartTag': case 'fldSimple': case 'sdtContent': case 'customXml': case 'bdo': case 'dir': case 'oMathPara': s += wordText(c, box, runs, styles); break;
      case 'oMath': { const t = mathText(c); s += t; runs.chars += t.length; runs.bold = false; break; }
      case 'sdt': { const sc = kid(c, 'sdtContent'); if (sc) s += wordText(sc, box, runs, styles); break; }
      case 'AlternateContent': { const ch = kid(c, 'Choice') || kid(c, 'Fallback'); if (ch) s += wordText(ch, box, runs, styles); break; }
    }
  }
  return s;
}
function wordRun(r, box, runs, styles) {
  const rpr = kid(r, 'rPr');
  if (rpr && kid(rpr, 'vanish')) return '';
  let s = '';
  for (const c of r.k) {
    if (!isNode(c)) continue;
    switch (c.n) {
      case 't': s += allText(c); break;
      case 'tab': s += '\t'; break;
      case 'br': case 'cr': s += '\n'; break;
      case 'noBreakHyphen': s += '-'; break;
      case 'drawing': case 'pict': case 'object': for (const tb of findAll(c, 'txbxContent')) { const t = []; wordBlocks(tb, t, styles); for (const b of t) box.push(b.text); } break;
      case 'AlternateContent': { const ch = kid(c, 'Choice') || kid(c, 'Fallback'); if (ch) s += wordRun(ch, box, runs, styles); break; }
    }
  }
  const text = s.replace(/\s/g, '');
  if (text) {
    runs.chars += text.length;
    const sz = rpr && kid(rpr, 'sz') ? +attr(kid(rpr, 'sz'), 'val') || 0 : 0; runs.size = Math.max(runs.size, sz);
    const b = rpr && kid(rpr, 'b'); if (!b || attr(b, 'val') === '0' || attr(b, 'val') === 'false') runs.bold = false;
  }
  return s;
}
// Headings for a file with none: a paragraph that is all bold, short, and in bigger type than the usual (the body size is
// the size with the most text) is a heading; the biggest size is level 1, the next level 2, and so on.
function inferHeadings(blocks) {
  const bySize = new Map();
  for (const b of blocks) if (b.kind === 'p' && b.size) bySize.set(b.size, (bySize.get(b.size) || 0) + b.text.length);
  let body = 0, best = 0; for (const [sz, n] of bySize) if (n > best) { best = n; body = sz; }
  if (!body) return;
  const sizes = [...new Set(blocks.filter(b => b.kind === 'p' && b.bold && b.size >= body * 1.2 && b.text.length <= 120 && !/\n/.test(b.text)).map(b => b.size))].sort((a, b) => b - a);
  if (!sizes.length) return;
  for (const b of blocks) { if (b.kind === 'p' && b.bold && b.size >= body * 1.2 && b.text.length <= 120 && !/\n/.test(b.text)) { b.kind = 'h'; b.level = Math.min(sizes.indexOf(b.size) + 1, 3); } }
}
function renderBlocks(blocks) {
  let out = '', prev = null;
  for (const b of blocks) {
    const line = b.kind === 'h' ? '#'.repeat(Math.min(b.level, 6)) + ' ' + b.text : b.kind === 'li' ? '  '.repeat(b.level) + '- ' + b.text : b.text;
    if (prev) out += prev.kind === b.kind && (b.kind === 'li' || b.kind === 'row') ? '\n' : '\n\n';
    out += line; prev = b;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF, part 6b: protection. Most "encrypted" PDFs open without a password (their owner only set what may be done with them:
// no editing, no printing, ...); a viewer opens them with the empty password. The same is done here: the key is worked
// out for the empty password by the standard security handler (RC4 40 and 128 bit, AES-128, AES-256), and it is checked
// against the file's own /U entry, so a PDF that needs a real password (or one this can't handle) is refused as locked. A
// PDF whose owner did not allow the text to be copied or extracted is refused too. Only streams are decrypted: text, fonts and
// page structure are all in streams, and the strings in dictionaries aren't needed.
const PAD = Buffer.from('28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a', 'hex');
function rc4(key, data) {
  const S = new Uint8Array(256); for (let i = 0; i < 256; i++) S[i] = i;
  for (let i = 0, j = 0; i < 256; i++) { j = (j + S[i] + key[i % key.length]) & 255; const t = S[i]; S[i] = S[j]; S[j] = t; }
  const out = Buffer.allocUnsafe(data.length);
  for (let k = 0, a = 0, b = 0; k < data.length; k++) { a = (a + 1) & 255; b = (b + S[a]) & 255; const t = S[a]; S[a] = S[b]; S[b] = t; out[k] = data[k] ^ S[(S[a] + S[b]) & 255]; }
  return out;
}
const hash = (alg, ...parts) => { const h = createHash(alg); for (const p of parts) h.update(p); return h.digest(); };
// AES-CBC with the 16-byte starting value in front of the data and PKCS#5 padding at the end (damaged padding is left alone).
function aesDecrypt(key, data) {
  if (data.length < 32) return Buffer.alloc(0);
  const d = createDecipheriv(key.length === 32 ? 'aes-256-cbc' : 'aes-128-cbc', key, data.subarray(0, 16)); d.setAutoPadding(false);
  const out = d.update(data.subarray(16, 16 + ((data.length - 16) & ~15))), pad = out[out.length - 1];
  return pad >= 1 && pad <= 16 && pad <= out.length ? out.subarray(0, out.length - pad) : out;
}
const aesNoPad = (key, iv, data, encrypt) => { const c = (encrypt ? createCipheriv : createDecipheriv)(key.length === 32 ? 'aes-256-cbc' : 'aes-128-cbc', key, iv); c.setAutoPadding(false); return Buffer.concat([c.update(data), c.final()]); };
// The hash of PDF 2.0 (revision 6): rounds of SHA-256/384/512 chosen by an AES-128 encryption of the data so far.
function hash2B(password, salt, user) {
  let k = hash('sha256', password, salt, user), e = Buffer.alloc(1);
  for (let i = 0; i < 64 || e[e.length - 1] > i - 32; i++) {
    const unit = Buffer.concat([password, k, user]), k1 = Buffer.concat(Array(64).fill(unit));
    e = aesNoPad(k.subarray(0, 16), k.subarray(16, 32), k1, true);
    let sum = 0; for (let j = 0; j < 16; j++) sum += e[j];
    k = hash(['sha256', 'sha384', 'sha512'][sum % 3], e);
  }
  return k.subarray(0, 32);
}
// The key for the empty password from an encryption dictionary, or null (a real password is needed, the handler is not one
// we know, the owner does not allow copying, or the dictionary is damaged). Returns { stream(data, num, gen) }.
function makeCrypt(doc, enc, id0) {
  const bytes = v => (v instanceof PStr ? Buffer.from(v.s, 'latin1') : null);
  if (nameOf(doc.deref(enc.Filter)) !== 'Standard') return null;
  const V = doc.numberOf(enc.V) || 0, R = doc.numberOf(enc.R) || 0, O = bytes(doc.deref(enc.O)), U = bytes(doc.deref(enc.U)), P = doc.numberOf(enc.P) | 0;
  if (!O || !U || ![2, 3, 4, 5, 6].includes(R) || ![1, 2, 4, 5].includes(V)) return null;
  if (!((P & 16) || (R >= 3 && (P & 512)))) return null;                       // the owner has not allowed text to be taken out
  const empty = Buffer.alloc(0);
  let method = 'rc4';                                                          // how streams are protected: rc4, aes (128) or aes256, or none
  if (V >= 4) {
    const cf = doc.deref(enc.CF), name = nameOf(doc.deref(enc.StmF)) || 'Identity', f = isDict(cf) && name !== 'Identity' ? doc.deref(cf[name]) : null, cfm = f && isDict(f) ? nameOf(doc.deref(f.CFM)) : 'None';
    method = cfm === 'V2' ? 'rc4' : cfm === 'AESV2' ? 'aes' : cfm === 'AESV3' ? 'aes256' : 'none';
  }
  if (R >= 5) {                                                                // AES-256: the file key is in /UE, locked with a hash of the (empty) password
    const UE = bytes(doc.deref(enc.UE)); if (!UE || U.length < 48 || UE.length < 32) return null;
    const h = R === 5 ? (pw, salt) => hash('sha256', pw, salt) : (pw, salt) => hash2B(pw, salt, empty);
    if (!h(empty, U.subarray(32, 40)).equals(U.subarray(0, 32))) return null;
    const fileKey = aesNoPad(h(empty, U.subarray(40, 48)), Buffer.alloc(16), UE.subarray(0, 32), false);
    return { stream: (data) => (method === 'none' ? data : aesDecrypt(fileKey, data)) };
  }
  const bits = V === 1 ? 40 : V === 4 ? 128 : doc.numberOf(enc.Length) || 40, n = Math.max(5, Math.min(16, bits >> 3));
  const meta = doc.deref(enc.EncryptMetadata), pb = Buffer.alloc(4); pb.writeInt32LE(P);
  let h = hash('md5', PAD, O.subarray(0, 32), pb, id0, R >= 4 && meta === false ? Buffer.from([255, 255, 255, 255]) : empty);
  if (R >= 3) for (let i = 0; i < 50; i++) h = hash('md5', h.subarray(0, n));
  const key = h.subarray(0, R === 2 ? 5 : n);
  let ok;
  if (R === 2) ok = rc4(key, PAD).equals(U.subarray(0, 32));
  else { let x = rc4(key, hash('md5', PAD, id0)); for (let i = 1; i <= 19; i++) x = rc4(Buffer.from(key.map(b => b ^ i)), x); ok = x.equals(U.subarray(0, 16)); }
  if (!ok) return null;
  return {
    stream(data, num, gen) {
      if (method === 'none') return data;
      const tail = Buffer.from([num & 255, (num >> 8) & 255, (num >> 16) & 255, gen & 255, (gen >> 8) & 255]);
      const k = hash('md5', key, tail, method === 'aes' ? Buffer.from('sAlT') : empty).subarray(0, Math.min(key.length + 5, 16));
      return method === 'rc4' ? rc4(k, data) : aesDecrypt(k, data);
    }
  };
}
Object.assign(PdfDoc.prototype, {
  // Called once the trailers are known: opens the file for the empty password when it is protected, or marks it locked.
  unlock() {
    const root = this.rootRef(), cat = root ? this.deref(root) : null;
    if (isDict(cat) && cat.Encrypt !== undefined && cat.Encrypt !== null) { this.locked = true; return; }
    const t = this.trailers.filter(x => x.Encrypt !== undefined && x.Encrypt !== null).pop();
    if (!t) { this.locked = !this.trailers.length && this.buf.lastIndexOf(ENCRYPT) >= Math.max(0, this.buf.length - 65536); return; }
    const enc = this.deref(t.Encrypt); let id0 = Buffer.alloc(0);
    const ids = this.deref(t.ID); if (Array.isArray(ids) && ids[0] instanceof PStr) id0 = Buffer.from(ids[0].s, 'latin1');
    let crypt = null; try { crypt = isDict(enc) ? makeCrypt(this, enc, id0) : null; } catch { crypt = null; }
    if (crypt) this.crypt = crypt; else this.locked = true;
  },
  // A stream marked with the Identity crypt filter is stored as it is even in a protected file.
  cryptIdentity(st) {
    const f = this.deref(st.dict.Filter), list = Array.isArray(f) ? f : [f];
    if (!list.some(x => nameOf(this.deref(x)) === 'Crypt')) return false;
    const p = this.deref(st.dict.DecodeParms), first = Array.isArray(p) ? this.deref(p[0]) : p;
    return !isDict(first) || !nameOf(first.Name) || nameOf(first.Name) === 'Identity';
  }
});
