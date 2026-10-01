// Caption files (.srt and .vtt): what Zoom, Panopto, Canvas and YouTube export for a lecture. The words of every cue with the time they start, joined into units
// about a minute long, each labelled with its start time (m:ss, and h:mm:ss from an hour on): the shape a pasted YouTube transcript gets (`transcriptUnits` in
// make.mjs), so they go through the same steps as any text with times in it. No AI is needed to read them.
//
//   readCaptions(input)       ->  { units: [{ at: '12:40', text }], seconds, truncated? }    (input: a Buffer, a Uint8Array or a string)
//   looksLikeCaptions(input)  ->  true for text that starts like a WebVTT file or an SRT file (a file's name can say anything)
//
// What is taken out: the cue numbers and ids, the settings after the times (align:start position:0%), the tags (<c.colorE5E5E5>, <i>, <v Roger>, <00:00:01.500>,
// {\an8}), sound notes in square brackets ([Music], [Applause]), lines that are only a note (a song's ♪, (applause)), and the lines an automatic caption says twice.
// Those come in two kinds: a cue shows the line before and then a new one (so every line is said in two cues), and a line grows a few words at a time (each cue
// has the line so far). A line is dropped when it is the same as, or only the start of, one from the last few seconds, and the line before is replaced when this
// one is that line with more words after it. A line's time is when it first showed, and `seconds` is where the last cue ends. A file with no words in any cue
// is an error: "There are no captions in that file." (code "empty"). Written from the formats' own descriptions; nothing here is copied from a caption tool.
import { ExtractError } from './extract.mjs';

const MAX_CUES = 200000, MAX_CHARS = 4e6, UNIT_SECONDS = 60, UNIT_CHARS = 1500;
const RECENT = 4;                // how many lines back a repeat is looked for
const SAME_WITHIN = 8;           // seconds: a line shown again after being off screen longer than this is a new line, not a repeat
const TIME = /(?:^|[^\d:])(?:(\d{1,3}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?[ \t]*-->[ \t]*(?:(\d{1,3}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/;
const secs = (h, m, s, f) => (+h || 0) * 3600 + +m * 60 + +s + (f ? +(f + '00').slice(0, 3) / 1000 : 0);
const clock = t => { t = Math.max(0, Math.floor(t)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };

// The text of the file as one string: UTF-8 (with or without a byte order mark), UTF-16 with one, else Windows-1252 when it isn't clean UTF-8.
function decode(input) {
  if (typeof input === 'string') return input;
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder('utf-8').decode(b.subarray(3));
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch { return new TextDecoder('windows-1252').decode(b); }
}
const withoutMark = t => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', lrm: '', rlm: '', zwnj: '', shy: '' };
const entities = s => s.replace(/&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]{2,6}));/gi, (m, d, x, n) => {
  if (n) return n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m;
  const c = d ? +d : parseInt(x, 16);
  return c > 0 && c < 0x110000 && !(c >= 0xd800 && c <= 0xdfff) ? String.fromCodePoint(c) : '';
});
// Control characters and the invisible marks (zero-width spaces, direction marks, the byte order mark) are not words.
const invisible = c => c < 9 || c === 11 || (c > 13 && c < 32) || c === 127 || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || c === 0x2060 || c === 0xfeff;
const plain = s => { let o = ''; for (const ch of s) if (!invisible(ch.codePointAt(0))) o += ch; return o; };
const TAGS = /<\/?[a-z][^>]*>|<\d{1,3}:\d{2}(?::\d{2})?[.,]\d{1,3}>/gi;
const NOTE = /^[♪\s]*[[(][^\])]*[\])][♪\s]*$/;              // [Music]   (applause)   ♪ [Music] ♪
// One line of a cue's words, cleaned; '' when nothing real is left.
function clean(line) {
  let t = entities(line.replace(/\{\\[^}]*\}/g, '').replace(TAGS, ''));
  t = plain(t).replace(/\[[^\]]{1,30}\]/g, ' ').replace(/\s+/g, ' ').trim();     // [Music], [Applause], [Roger] inside a line
  if (/^[♪\s]*$/.test(t) || NOTE.test(t)) return '';
  return t;
}
// What two lines are compared by: their words, in lower case, without punctuation (a, b: such keys).
const key = t => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const NOSPACE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]$/u;
// Whether b is a and more words after it (a whole word, or a character in a script written without spaces).
const grows = (a, b) => b.length > a.length && b.startsWith(a) && (b[a.length] === ' ' || NOSPACE.test(a));

export function looksLikeCaptions(input) {
  try {
    const head = withoutMark(decode(typeof input === 'string' ? input.slice(0, 4000) : (input instanceof Uint8Array ? input : new Uint8Array(input)).subarray(0, 4000)));
    return /^WEBVTT(?:[ \t\n\r]|$)/.test(head) || /^\s*\d{1,6}[ \t]*\r?\n[ \t]*(?:\d{1,3}:)?\d{1,2}:\d{2}[.,]\d{1,3}[ \t]*-->[ \t]*(?:\d{1,3}:)?\d{1,2}:\d{2}[.,]\d{1,3}/.test(head);
  } catch { return false; }
}

export function readCaptions(input) {
  const lines = withoutMark(decode(input)).replace(/\r\n?/g, '\n').split('\n');
  // 1. The cues, in the order they come: when each starts and ends, and the words on its lines. A time line starts a cue; an empty line ends it (a line of only
  // spaces doesn't: an automatic caption has one in every cue); a number on a line of its own just before a time is an SRT cue number.
  const cues = []; let cur = null, truncated = false, lastFrom = 0, maxTo = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], m = TIME.exec(line);
    if (m) {
      const from = secs(m[1], m[2], m[3], m[4]), to = secs(m[5], m[6], m[7], m[8]);
      cur = { from, to: Math.max(from, to), lines: [] }; cues.push(cur); lastFrom = Math.max(lastFrom, from); maxTo = Math.max(maxTo, cur.to);
      if (cues.length >= MAX_CUES) { truncated = true; break; }
      continue;
    }
    if (!cur) continue;                                                      // a header, a NOTE, a STYLE, a cue id: no words
    if (line === '') { cur = null; continue; }
    if (/^\s*\d{1,6}\s*$/.test(line) && TIME.test(lines[i + 1] || '')) { cur = null; continue; }
    const words = clean(line); if (words) cur.lines.push(words);
  }
  // 2. The lines, each once, with when its cue started and when it was last on screen.
  const out = []; let size = 0;
  const near = (x, c) => c.from - x.seen <= SAME_WITHIN;
  for (const c of cues) {
    for (const line of c.lines) {
      const k = key(line); if (!k) continue;
      const last = out[out.length - 1];
      if (last && near(last, c)) {
        if (k === last.k || grows(k, last.k)) { last.seen = Math.max(last.seen, c.to); continue; }              // the same line again, or only the start of it
        if (grows(last.k, k)) { size += line.length - last.text.length; last.text = line; last.k = k; last.seen = Math.max(last.seen, c.to); continue; }   // the line, grown
      }
      let hit = null;                                                          // a line from a moment ago, shown again beside the next one
      for (let j = out.length - 2; j >= 0 && j >= out.length - RECENT && !hit; j--) if (out[j].k === k && near(out[j], c)) hit = out[j];
      if (hit) { hit.seen = Math.max(hit.seen, c.to); continue; }
      out.push({ t: c.from, seen: c.to, text: line, k }); size += line.length + 1;
    }
    if (size > MAX_CHARS) { truncated = true; break; }
  }
  if (!out.length) throw new ExtractError('There are no captions in that file.', 'empty');
  // 3. Units about a minute long, labelled with when they start.
  const units = []; let unit = null;
  for (const l of out) {
    if (!unit || l.t - unit.t >= UNIT_SECONDS || unit.text.length + l.text.length > UNIT_CHARS) { unit = { t: l.t, at: clock(l.t), text: '' }; units.push(unit); }
    unit.text += (unit.text ? ' ' : '') + l.text;
  }
  // (A last cue that claims to run for hours, a file's way of saying "to the end", doesn't make the recording longer than its last words.)
  const seconds = Math.round(Math.min(maxTo, lastFrom + 60) * 10) / 10;
  const res = { units: units.map(u => ({ at: u.at, text: u.text })), seconds };
  if (truncated) res.truncated = true;
  return res;
}
