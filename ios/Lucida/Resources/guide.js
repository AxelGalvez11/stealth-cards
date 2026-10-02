// A deck's Guide: the Markdown its owner writes about the deck, shown like the README under a repository's files.
// The deck page, the public deck pages (web and iPhone), the AI link and the editor's toolbar all use this one file.
// design/build.mjs can copy the whole function into the canvas boards, so the canvas draws what the app draws
// (the file is one self-contained function with no imports, like rich.js).
//
// SAFE BY CONSTRUCTION. Anyone can open a public deck and search engines read it, so the text of a Guide is never trusted.
// There is no raw HTML at all: a "<" is shown as text. The output is built only from the tags and attributes listed where
// the HTML is made ("showing", below), and every piece of text and every attribute value is escaped. Nothing is "cleaned up afterwards": a javascript:
// link or an onerror= attribute cannot be written in the first place.
//   - Links keep only http, https, mailto and in-page "#..." addresses. Anything else (javascript:, data:, vbscript:, file:,
//     blob:, relative paths, "//host", and tricks with tabs, line breaks, entities, control characters or capital letters)
//     is not a link: its words are shown as plain text. An address is percent-encoded, so it holds only letters, digits and
//     URL punctuation (never a quote, an angle bracket, a space or a backslash), and "javascript:" never appears in one.
//   - Every link gets rel="nofollow ugc noopener", and target="_blank" unless it only jumps within the page.
//   - A picture shows only if the caller allows it (opts.image). By default only our own /media/name.png files.
//   - Work is bounded, so nobody can make the server or a browser spend long on a Guide: the text is cut at MAX characters,
//     lists and quotes nest at most 12 deep, bold/italic/strike/links at most 20 deep (deeper ones lose their marks but keep
//     their words), scans for the end of a link, label or address have a budget, and one Guide shows at most 100 pictures
//     and uses at most 200,000 characters of addresses (a [ref] used again counts again).
//   - Nothing throws. null and undefined are "", anything else is turned into a string. A lone half of an emoji becomes U+FFFD.
//
// WHAT IT READS. CommonMark plus the usual GitHub extras: # headings (and === / --- under a line), paragraphs (a single
// line break is a space; two spaces or a backslash at the end of a line is a line break), *italic* _italic_ **bold**
// ***both*** ~~strike~~ (also ~one tilde~) `code` (also with several backticks), \ escapes, entities (&amp; &copy; &#8217;
// ... a safe list, shown as text), fenced (``` or ~~~) and indented code, > quotes (nested, lazy), - * + and 1. 1) lists
// (nested by indentation, loose or tight), - [ ] task lists, --- thematic breaks, | pipe | tables |, [links](url "title"),
// [text][ref] with [ref]: url definitions, <https://autolinks>, bare http(s):// addresses (a trailing . , ! ? : ; ' " ] and
// an unmatched ) are left out), and ![pictures](src). A link to (#some-heading) points at that heading's id.
// Not supported, and shown as text: raw HTML, HTML blocks and comments, footnotes, math, emoji :shortcodes:, bare www.
// and email addresses, named entities outside the safe list.
//
// HOW IT READS (commonmark.js's design; the iPhone port follows the same steps).
//   1. Blocks. Each line is matched against the open containers (quote, list item), then against the starts of new blocks
//      (quote, # heading, fence, setext underline, rule, list item, table delimiter row, indented code), and what is left
//      is text for a paragraph, a code block or a table row. Tabs move to the next multiple of 4 columns. [x]: definitions
//      are taken off the start of paragraphs. A list is loose when a blank line sits between its items or their blocks.
//   2. Inline. Each paragraph, heading and table cell is read left to right. * _ ~ runs and [ ![ go on two stacks and are
//      paired when a closer comes (the CommonMark "flanking" and "rule of 3" rules; ~ needs equal runs of 1 or 2). Code
//      spans, escapes, entities, <autolinks> and bare addresses are read as they come. Punctuation counts the Unicode
//      P and S classes, so an emoji is punctuation to the emphasis rules.
//   3. The tree is made, heading ids are given (github-slugger: lower case, letters/numbers/-/_, spaces become -, repeats get
//      -1, -2; none left gives "section"), and in-page links are matched to them.
//
// THE TREE parse() returns is plain data (JSON-safe). The iPhone app mirrors it, so it stays simple:
//   A document is an array of blocks. A block is one of
//     { t:'h',     level:1-6, inline:[...], id:'g-slug' }       heading; id is unique in the document
//     { t:'p',     inline:[...] }                                paragraph
//     { t:'code',  lang:'js'|'', text:'a\nb' }                   code block; text has no final line break
//     { t:'quote', blocks:[...] }                                quote
//     { t:'ul',    tight:bool, items:[{ checked:null|true|false, blocks:[...] }] }
//     { t:'ol',    start:1, tight:bool, items:[{ checked:null|true|false, blocks:[...] }] }
//     { t:'hr' }
//     { t:'table', align:['left'|'right'|'center'|''], head:[[inline]], rows:[[[inline]]] }   a cell is an array of inline
//   checked is null for an ordinary item and true/false for a task item ("- [x] done"). In a tight list the paragraphs of an
//   item are drawn without paragraph spacing.
//   Inline nodes (what is inside a heading, paragraph or table cell) are
//     { t:'text', v }   { t:'b'|'i'|'s', c:[...] }  bold, italic, strikethrough   { t:'code', v }
//     { t:'a', href, title, c:[...] }  (href is always allowed and percent-encoded; title is '' when there is none)
//     { t:'img', src, alt, title }     (src is an http(s) or /root-relative address; whether to show it is up to render)
//     { t:'br' }                       a hard line break
//   Two adjacent text nodes never occur, and a text node is never empty.
//
// THE FUNCTIONS (all take plain strings; positions a..b are a selection in a text field, a > b is fine):
//   parse(md) -> blocks            render(md, opts) -> html          plain(md, n) -> text          headings(md) -> outline
//   bold italic strike code (text, a, b)     heading(text, a, b, level)     bullets numbers tasks quote (text, a, b)
//   link(text, a, b, url)   image(text, a, b, src, alt)   codeBlock table rule (text, a, b)   -> { text, a, b }
//   continueList(text, pos) -> { text, pos } | null (Enter in a list)      indent(text, a, b, out) (Tab / Shift+Tab)
//   MAX (60000), and errors (how many unexpected errors were caught and hidden; 0 unless there is a bug).
export function makeGuide() {
  // ---------- limits ----------
  const MAX = 60000;         // characters read; the rest of a longer text is ignored
  const MAX_NEST = 12;       // lists and quotes inside lists and quotes; a deeper one is shown as text
  const MAX_MARKS = 20;      // bold, italic, strike and links inside each other; a deeper one loses its marks
  const MAX_URL_CHARS = 200000; // all link and picture addresses of one document together (a [ref] used again counts again)
  const MAX_IMAGES = 100;    // pictures shown in one document
  let errors = 0;            // unexpected errors caught (a bug if it is ever not 0)
  let lastScan = 0;          // how many characters the last link scan read, for the inline work budget

  // ---------- characters and text ----------
  const isSp = c => c === 32 || c === 9;
  const isDigit = c => c >= 48 && c <= 57;
  const isAlpha = c => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  const isAlnum = c => isDigit(c) || isAlpha(c);
  const isHex = c => isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
  // ASCII punctuation: the characters a backslash can escape.
  const isPunct = c => (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
  const str = v => { try { return v == null ? '' : String(v); } catch (e) { return ''; } };
  // The text as read: at most MAX characters, one kind of line break, no NUL and no half emoji (a lone surrogate).
  function clean(v) {
    let s = str(v);
    if (s.length > MAX) { s = s.slice(0, MAX); const c = s.charCodeAt(MAX - 1); if (c >= 0xd800 && c <= 0xdbff) s = s.slice(0, -1); }
    return s.replace(/\r\n?/g, '\n').replace(/\0/g, '\uFFFD').replace(/[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g, m => (m.length === 2 ? m : '\uFFFD'));
  }
  // Spaces, tabs and line breaks off both ends.
  function trimWS(s) {
    let a = 0, b = s.length;
    while (a < b && (isSp(s.charCodeAt(a)) || s.charCodeAt(a) === 10)) a++;
    while (b > a && (isSp(s.charCodeAt(b - 1)) || s.charCodeAt(b - 1) === 10)) b--;
    return s.slice(a, b);
  }
  const blankFrom = (s, i) => { for (; i < s.length; i++) { const c = s.charCodeAt(i); if (!isSp(c) && c !== 10 && c !== 13 && c !== 12 && c !== 11) return false; } return true; };
  const AMP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => s.replace(/[&<>]/g, c => AMP[c]);              // text between tags
  const escA = s => s.replace(/[&<>"']/g, c => AMP[c]);           // an attribute value
  // Punctuation and whitespace as the emphasis rules see them: 0 whitespace, 1 punctuation or symbol, 2 anything else.
  const RE_WS = /[\p{Zs}\t\n\f\r]/u, RE_PUNCT = /[\p{P}\p{S}]/u;
  function cls(cp) {
    if (cp < 128) return cp === 32 || (cp >= 9 && cp <= 13 && cp !== 11) ? 0 : isPunct(cp) ? 1 : 2;
    const ch = String.fromCodePoint(cp);
    return RE_WS.test(ch) ? 0 : RE_PUNCT.test(ch) ? 1 : 2;
  }
  function cpBefore(s, i) {
    if (i <= 0) return 10;
    const c = s.charCodeAt(i - 1);
    if (c >= 0xdc00 && c <= 0xdfff && i >= 2) { const h = s.charCodeAt(i - 2); if (h >= 0xd800 && h <= 0xdbff) return ((h - 0xd800) << 10) + (c - 0xdc00) + 0x10000; }
    return c;
  }
  const cpAfter = (s, i) => (i >= s.length ? 10 : s.codePointAt(i));

  // ---------- entities ----------
  // Only a safe list of named entities is read; anything else stays as typed. Numbers are read when they are a real
  // printable character (a control character, a lone surrogate or a non-character becomes U+FFFD).
  const NAMED = Object.create(null);
  NAMED.amp = '&'; NAMED.lt = '<'; NAMED.gt = '>'; NAMED.quot = '"'; NAMED.apos = "'"; NAMED.nbsp = '\u00A0';
  ('copy:© reg:® trade:™ hellip:… mdash:— ndash:– lsquo:‘ rsquo:’ ldquo:“ rdquo:” sbquo:‚ bdquo:„ laquo:« raquo:» lsaquo:‹ rsaquo:› bull:• middot:· deg:° plusmn:± times:× divide:÷ ' +
    'frac12:½ frac14:¼ frac34:¾ euro:€ pound:£ yen:¥ cent:¢ curren:¤ sect:§ para:¶ dagger:† Dagger:‡ permil:‰ prime:′ Prime:″ larr:← rarr:→ uarr:↑ darr:↓ harr:↔ lArr:⇐ rArr:⇒ uArr:⇑ dArr:⇓ hArr:⇔ ' +
    'minus:− lowast:∗ radic:√ infin:∞ ne:≠ le:≤ ge:≥ asymp:≈ equiv:≡ sum:∑ prod:∏ int:∫ part:∂ nabla:∇ isin:∈ notin:∉ cap:∩ cup:∪ sub:⊂ sup:⊃ and:∧ or:∨ not:¬ forall:∀ exist:∃ empty:∅ ' +
    'sup1:¹ sup2:² sup3:³ micro:µ ordf:ª ordm:º iexcl:¡ iquest:¿ hearts:♥ spades:♠ clubs:♣ diams:♦ check:✓ star:☆ starf:★ phone:☎ ' +
    'alpha:α beta:β gamma:γ delta:δ epsilon:ε zeta:ζ eta:η theta:θ iota:ι kappa:κ lambda:λ mu:μ nu:ν xi:ξ omicron:ο pi:π rho:ρ sigma:σ tau:τ upsilon:υ phi:φ chi:χ psi:ψ omega:ω ' +
    'Alpha:Α Beta:Β Gamma:Γ Delta:Δ Theta:Θ Lambda:Λ Pi:Π Sigma:Σ Phi:Φ Psi:Ψ Omega:Ω ' +
    'Agrave:À Aacute:Á Acirc:Â Atilde:Ã Auml:Ä Aring:Å AElig:Æ Ccedil:Ç Egrave:È Eacute:É Ecirc:Ê Euml:Ë Igrave:Ì Iacute:Í Icirc:Î Iuml:Ï Ntilde:Ñ Ograve:Ò Oacute:Ó Ocirc:Ô Otilde:Õ Ouml:Ö Oslash:Ø ' +
    'Ugrave:Ù Uacute:Ú Ucirc:Û Uuml:Ü Yacute:Ý szlig:ß agrave:à aacute:á acirc:â atilde:ã auml:ä aring:å aelig:æ ccedil:ç egrave:è eacute:é ecirc:ê euml:ë igrave:ì iacute:í icirc:î iuml:ï ntilde:ñ ' +
    'ograve:ò oacute:ó ocirc:ô otilde:õ ouml:ö oslash:ø ugrave:ù uacute:ú ucirc:û uuml:ü yacute:ý yuml:ÿ').split(' ').forEach(p => { NAMED[p.slice(0, p.indexOf(':'))] = p.slice(p.indexOf(':') + 1); });
  function safeChar(cp) {
    if (cp === 9 || cp === 10 || cp === 13) return ' ';
    if (cp < 32 || (cp >= 127 && cp < 160) || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) || (cp & 0xfffe) === 0xfffe || (cp >= 0xfdd0 && cp <= 0xfdef)) return '\uFFFD';
    return String.fromCodePoint(cp);
  }
  // The entity starting at s[i] (which is "&"): [the text it stands for, its length], or null.
  function entityAt(s, i) {
    let j = i + 1;
    const c = s.charCodeAt(j);
    if (c === 35) {
      j++;
      const hex = s.charCodeAt(j) === 120 || s.charCodeAt(j) === 88;
      if (hex) j++;
      const from = j;
      let n = 0;
      while (j - from < 9) { const d = s.charCodeAt(j); if (!(hex ? isHex(d) : isDigit(d))) break; n = n * (hex ? 16 : 10) + parseInt(s[j], 16); j++; }
      if (j === from || j - from > (hex ? 6 : 7) || s.charCodeAt(j) !== 59) return null;
      return [safeChar(n), j + 1 - i];
    }
    if (!isAlpha(c)) return null;
    while (j - i < 34 && isAlnum(s.charCodeAt(j))) j++;
    if (s.charCodeAt(j) !== 59 || j - i < 3) return null;
    const v = NAMED[s.slice(i + 1, j)];
    return v === undefined ? null : [v, j + 1 - i];
  }
  // Backslash escapes and entities turned into the characters they stand for (for addresses, titles and code languages).
  function unescapeStr(s) {
    if (s.indexOf('\\') < 0 && s.indexOf('&') < 0) return s;
    let out = '';
    for (let i = 0; i < s.length;) {
      const c = s.charCodeAt(i);
      if (c === 92 && isPunct(s.charCodeAt(i + 1))) { out += s[i + 1]; i += 2; }
      else if (c === 38) { const e = entityAt(s, i); if (e) { out += e[0]; i += e[1]; } else { out += '&'; i++; } }
      else { out += s[i]; i++; }
    }
    return out;
  }

  // ---------- addresses ----------
  // An address is percent-encoded: afterwards it has only letters, digits and URL punctuation, never a quote, angle
  // bracket, space, backslash or control character. A valid %XX stays as it is. "javascript:" and "vbscript:" never
  // appear in one (the colon is written %3A), so an address that hides one in its path still cannot be mistaken for a script.
  const URL_OK = new Uint8Array(128);
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~!$&'()*+,;=:@/?#") URL_OK[ch.charCodeAt(0)] = 1;
  const pct = c => (c < 16 ? '%0' : '%') + c.toString(16).toUpperCase();
  function encodeUrl(u) {
    let out = '';
    for (let i = 0; i < u.length; i++) {
      const c = u.charCodeAt(i);
      if (c < 128) out += URL_OK[c] || (c === 37 && isHex(u.charCodeAt(i + 1)) && isHex(u.charCodeAt(i + 2))) ? u[i] : pct(c);
      else {
        const cp = u.codePointAt(i);
        if (cp >= 0xd800 && cp <= 0xdfff) out += '%EF%BF%BD';
        else { out += encodeURIComponent(String.fromCodePoint(cp)); if (cp > 0xffff) i++; }
      }
    }
    return out.replace(/((?:java|vb)script):/gi, '$1%3A');       // not even inside a path: no scanner should ever see "javascript:" in an address
  }
  // Which (already encoded) addresses may be a link, and which a picture.
  const linkOk = u => u.charCodeAt(0) === 35 || /^(?:https?:\/\/[^\/?#]|mailto:.)/i.test(u);
  const imgOk = u => /^(?:https?:\/\/[^\/?#]|\/(?!\/))/i.test(u);
  const ownImg = u => /^\/media\/[\w-]+\.(?:png|jpe?g|gif|webp)$/i.test(u);

  // ---------- link syntax: label, address, title (shared by [text](...) and [ref]: ... ) ----------
  // Each scanner reads a bounded number of characters and notes in lastScan how many it read.
  // The text of a [label] starting at p: the index after its "]", or -1. No brackets inside, at most 999 characters.
  function labelEnd(s, p) {
    const lim = Math.min(s.length, p + 1002);
    let j = p + 1;
    while (j < lim) {
      const c = s.charCodeAt(j);
      if (c === 92) { j += 2; continue; }
      if (c === 91) { lastScan = j - p; return -1; }
      if (c === 93) { lastScan = j - p; return j + 1; }
      j++;
    }
    lastScan = j - p;
    return -1;
  }
  // An address at p, either <...> or characters up to a space with balanced parentheses: { end, raw } or null.
  function scanDest(s, p) {
    const lim = Math.min(s.length, p + 2002);
    let j = p;
    if (s.charCodeAt(p) === 60) {
      j = p + 1;
      while (j < lim) {
        const c = s.charCodeAt(j);
        if (c === 62) { lastScan = j - p; return { end: j + 1, raw: s.slice(p + 1, j) }; }
        if (c === 10 || c === 60) break;
        j += c === 92 && isPunct(s.charCodeAt(j + 1)) ? 2 : 1;
      }
      lastScan = j - p;
      return null;
    }
    let depth = 0;
    while (j < lim) {
      const c = s.charCodeAt(j);
      if (c === 92 && isPunct(s.charCodeAt(j + 1))) { j += 2; continue; }
      if (c === 40) { if (++depth > 32) break; j++; continue; }
      if (c === 41) { if (depth === 0) break; depth--; j++; continue; }
      if (c <= 32 || c === 127) break;
      j++;
    }
    lastScan = j - p;
    if (j >= lim && j < s.length) return null;                  // longer than we read
    if (depth !== 0 || (j === p && s.charCodeAt(j) !== 41)) return null;
    return { end: j, raw: s.slice(p, j) };
  }
  // A title at p, in "...", '...' or (...): { end, raw } or null.
  function scanTitle(s, p) {
    const q = s.charCodeAt(p), close = q === 34 ? 34 : q === 39 ? 39 : q === 40 ? 41 : 0;
    if (!close) return null;
    const lim = Math.min(s.length, p + 1002);
    let j = p + 1;
    while (j < lim) {
      const c = s.charCodeAt(j);
      if (c === 92 && isPunct(s.charCodeAt(j + 1))) { j += 2; continue; }
      if (c === close) { lastScan = j - p; return { end: j + 1, raw: s.slice(p + 1, j) }; }
      if (q === 40 && c === 40) break;
      j++;
    }
    lastScan = j - p;
    return null;
  }
  // Spaces, at most one line break, and more spaces.
  function spnl(s, p) {
    while (isSp(s.charCodeAt(p))) p++;
    if (s.charCodeAt(p) === 10) { p++; while (isSp(s.charCodeAt(p))) p++; }
    return p;
  }
  const normLabel = raw => trimWS(raw).replace(/[ \t\n]+/g, ' ').toLowerCase().toUpperCase();
  // After spaces, the end of the line: the index after the line break, or -1 when something else comes first.
  function eol(s, p) {
    while (isSp(s.charCodeAt(p))) p++;
    if (p >= s.length) return s.length;
    return s.charCodeAt(p) === 10 ? p + 1 : -1;
  }
  // "[label]: address "title"" at the start of s[p0...]: the index after it, or -1. The first definition of a label wins.
  function parseRefDef(s, p0, refs) {
    const le = labelEnd(s, p0);
    if (le < 0 || s.charCodeAt(le) !== 58) return -1;
    const label = normLabel(s.slice(p0 + 1, le - 1));
    if (!label) return -1;
    const D = scanDest(s, spnl(s, le + 1));
    if (!D) return -1;
    let q = spnl(s, D.end), title = null, e = -1;
    if (q > D.end) { const T = scanTitle(s, q); if (T) { title = unescapeStr(T.raw); e = eol(s, T.end); } }
    if (e < 0) { title = null; e = eol(s, D.end); }
    if (e < 0) return -1;
    if (!refs.has(label)) refs.set(label, { dest: encodeUrl(unescapeStr(D.raw)), title: title || '' });
    return e;
  }

  // ---------- inline: text -> nodes ----------
  // The nodes while reading are a linked list per parent: { t, v, p (previous), n (next), fc, lc (first, last child), par }.
  const N = (t, v) => ({ t, v: v === undefined ? '' : v, p: null, n: null, fc: null, lc: null, par: null, dest: '', title: '' });
  function unlink(x) {
    if (x.p) x.p.n = x.n; else if (x.par) x.par.fc = x.n;
    if (x.n) x.n.p = x.p; else if (x.par) x.par.lc = x.p;
    x.par = x.p = x.n = null;
  }
  function appendChild(par, x) {
    x.par = par; x.p = par.lc; x.n = null;
    if (par.lc) par.lc.n = x; else par.fc = x;
    par.lc = x;
  }
  function insertAfter(a, x) {
    x.par = a.par; x.p = a; x.n = a.n;
    if (a.n) a.n.p = x; else if (a.par) a.par.lc = x;
    a.n = x;
  }
  const SPECIAL = new Uint8Array(128);
  for (const ch of '\n\\`*_~[]!<&hH') SPECIAL[ch.charCodeAt(0)] = 1;
  function schemeEnd(b) {
    if (!isAlpha(b.charCodeAt(0))) return -1;
    let i = 1;
    while (i < 33) { const c = b.charCodeAt(i); if (isAlnum(c) || c === 43 || c === 46 || c === 45) i++; else break; }
    return i >= 2 && b.charCodeAt(i) === 58 ? i : -1;
  }
  const EMAIL_CH = "!#$%&'*+/=?^_`{|}~-.";
  function isEmail(b) {
    const at = b.indexOf('@');
    if (at < 1) return false;
    for (let i = 0; i < at; i++) { const c = b.charCodeAt(i); if (!isAlnum(c) && EMAIL_CH.indexOf(b[i]) < 0) return false; }
    const labels = b.slice(at + 1).split('.');
    return labels.every(l => l.length >= 1 && l.length <= 63 && isAlnum(l.charCodeAt(0)) && isAlnum(l.charCodeAt(l.length - 1)) && [...l].every(ch => isAlnum(ch.charCodeAt(0)) || ch === '-'));
  }

  // Reads one paragraph, heading or table cell. Returns a root node whose children are the inline nodes.
  // This is the CommonMark way: scan left to right, push * _ ~ and [ ![ on two stacks, and when a closer shows up look
  // back for its opener. Every loop that could be slow on hostile text is bounded (see the work budget).
  function inlineParse(s, refs) {
    const root = N('root'), len = s.length;
    let pos = 0, delims = null, brackets = null, work = 0, tickIdx = null;
    const cap = 20 * len + 2000;                   // the work budget: scans past it stop making links and emphasis
    const text = v => N('text', v);
    const add = x => appendChild(root, x);
    const removeDelim = d => { if (d.prev) d.prev.next = d.next; if (!d.next) delims = d.prev; else d.next.prev = d.prev; };

    // Code spans: the closing run of backticks of the same length is found with an index built once, so a long text of
    // unmatched backtick runs is still read in one pass.
    function findTicks(L, from) {
      if (!tickIdx) {
        tickIdx = new Map();
        for (let i = s.indexOf('`'); i >= 0 && i < len;) {
          let j = i; while (s.charCodeAt(j) === 96) j++;
          let a = tickIdx.get(j - i); if (!a) tickIdx.set(j - i, a = { p: [], k: 0 });
          a.p.push(i);
          i = s.indexOf('`', j);
        }
      }
      const a = tickIdx.get(L);
      if (!a) return -1;
      while (a.k < a.p.length && a.p[a.k] < from) a.k++;
      return a.k < a.p.length ? a.p[a.k] : -1;
    }
    function backticks() {
      let j = pos; while (s.charCodeAt(j) === 96) j++;
      const L = j - pos, at = findTicks(L, j);
      if (at < 0) { add(text(s.slice(pos, j))); pos = j; return; }
      let v = s.slice(j, at).replace(/\n/g, ' ');
      if (v.length > 0 && v.charCodeAt(0) === 32 && v.charCodeAt(v.length - 1) === 32 && /[^ ]/.test(v)) v = v.slice(1, -1);
      add(N('code', v));
      pos = at + L;
    }
    function backslash() {
      pos++;
      const c = s.charCodeAt(pos);
      if (c === 10) { pos++; add(N('br')); }
      else if (isPunct(c)) { add(text(s[pos])); pos++; }
      else add(text('\\'));
    }
    function newline() {
      pos++;
      const l = root.lc;
      if (l && l.t === 'text' && l.v.charCodeAt(l.v.length - 1) === 32) {
        const hard = l.v.charCodeAt(l.v.length - 2) === 32;
        let e = l.v.length; while (e > 0 && l.v.charCodeAt(e - 1) === 32) e--;
        l.v = l.v.slice(0, e);
        add(N(hard ? 'br' : 'soft'));
      } else add(N('soft'));
      while (s.charCodeAt(pos) === 32) pos++;
    }
    function entity() {
      const e = entityAt(s, pos);
      if (e) { add(text(e[0])); pos += e[1]; } else { add(text('&')); pos++; }
    }
    // <https://...> and <me@mail.com>. Other schemes are not links: the whole <...> stays as typed.
    function angle() {
      let e = pos + 1;
      const lim = Math.min(len, pos + 2100);
      while (e < lim) { const c = s.charCodeAt(e); if (c === 62) break; if (c <= 32 || c === 60 || c === 127) { e = -1; break; } e++; }
      work += (e < 0 ? 1 : e - pos);
      if (e < 0 || e >= len || s.charCodeAt(e) !== 62) { add(text('<')); pos++; return; }
      const body = s.slice(pos + 1, e), colon = schemeEnd(body);
      let href = '';
      if (colon > 0) { const sch = body.slice(0, colon).toLowerCase(); if (sch === 'http' || sch === 'https' || sch === 'mailto') href = encodeUrl(body); else { add(text(s.slice(pos, e + 1))); pos = e + 1; return; } }
      else if (isEmail(body)) href = 'mailto:' + encodeUrl(body);
      else { add(text('<')); pos++; return; }
      const a = N('link'); a.dest = href;
      appendChild(a, text(body)); add(a);
      pos = e + 1;
    }
    // A bare http:// or https:// address (GitHub style). It starts after anything but a letter; the domain may not have
    // an underscore in its last two parts; a trailing . , : ; ! ? * _ ~ ' " ] and an unmatched ) are not part of it.
    function urlAt(j) {
      if (j > 0 && isAlpha(s.charCodeAt(j - 1))) return false;
      if ((s.charCodeAt(j + 1) | 32) !== 116 || (s.charCodeAt(j + 2) | 32) !== 116 || (s.charCodeAt(j + 3) | 32) !== 112) return false;
      let k = j + 4; if ((s.charCodeAt(k) | 32) === 115) k++;
      return s.charCodeAt(k) === 58 && s.charCodeAt(k + 1) === 47 && s.charCodeAt(k + 2) === 47;
    }
    const wsAt = e => { const c = s.charCodeAt(e); return c <= 32 || c === 127 || (c >= 128 && RE_WS.test(s[e])); };
    function autoEnd(j) {
      let k = j + 4; if ((s.charCodeAt(k) | 32) === 115) k++;
      k += 3;
      const ds = k;
      if (k >= len || s.charCodeAt(k) < 33 || cls(s.codePointAt(k)) !== 2) return -1;
      let e = k;
      while (e < len && e - j < 2100) {
        if (wsAt(e) || s.charCodeAt(e) === 60) break;
        if (s.charCodeAt(e) === 93) { const d = s.charCodeAt(e + 1); if (e + 1 >= len || d === 40 || d === 91 || wsAt(e + 1)) break; }
        e++;
      }
      work += e - j;
      if (e - j >= 2100) return -1;
      let open = 0, close = 0;
      for (let i = j; i < e; i++) { const c = s.charCodeAt(i); if (c === 40) open++; else if (c === 41) close++; }
      let end = e;
      while (end > ds) {
        const c = s.charCodeAt(end - 1);
        if (c === 63 || c === 33 || c === 46 || c === 44 || c === 58 || c === 42 || c === 95 || c === 126 || c === 39 || c === 34 || c === 93) end--;
        else if (c === 59) { let q = end - 2; while (q > ds && isAlpha(s.charCodeAt(q))) q--; end = q < end - 2 && s.charCodeAt(q) === 38 ? q : end - 1; }
        else if (c === 41 && close > open) { close--; end--; }
        else break;
      }
      let seen = false, under = false, underBefore = false;
      for (let d = ds; d < end;) {
        const cp = s.codePointAt(d);
        if (cp === 46) { underBefore = under; under = false; d++; continue; }
        if (cp === 95) { under = true; d++; continue; }
        if (cp !== 45 && cls(cp) !== 2) break;
        seen = true; d += cp > 0xffff ? 2 : 1;
      }
      return under || underBefore || !seen ? -1 : end;
    }
    // * _ and ~ runs. Whether a run can open or close emphasis follows the CommonMark "flanking" rules.
    function delim(c) {
      let j = pos; while (s.charCodeAt(j) === c) j++;
      const n = j - pos;
      if (c === 126 && n > 2) { add(text(s.slice(pos, j))); pos = j; return; }
      const before = cls(cpBefore(s, pos)), after = cls(cpAfter(s, j));
      const left = after !== 0 && (after !== 1 || before !== 2), right = before !== 0 && (before !== 1 || after !== 2);
      let open = left, close = right;
      if (c === 95) { open = left && (!right || before === 1); close = right && (!left || after === 1); }
      const node = text(s.slice(pos, j)); add(node);
      pos = j;
      if (open || close) { delims = { cc: c, n, orig: n, node, prev: delims, next: null, open, close }; if (delims.prev) delims.prev.next = delims; }
    }
    // Pair every closer above `bottom` with the nearest opener below it. A closer with no opener is plain text.
    function processEmphasis(bottom) {
      const ob = new Array(14).fill(bottom);                      // per kind of closer: no opener to find below here
      let closer = delims;
      while (closer && closer.prev !== bottom) closer = closer.prev;
      while (closer && work <= cap) {
        if (!closer.close) { closer = closer.next; continue; }
        const cc = closer.cc, idx = cc === 95 ? (closer.open ? 3 : 0) + closer.orig % 3 : cc === 42 ? 6 + (closer.open ? 3 : 0) + closer.orig % 3 : 12 + (closer.n === 2 ? 1 : 0);
        let opener = closer.prev, found = false;
        while (opener && opener !== bottom && opener !== ob[idx]) {
          if (++work > cap) break;
          if (opener.cc === cc && opener.open) {
            if (cc === 126) { if (opener.n === closer.n) { found = true; break; } }
            else if (!((closer.open || opener.close) && closer.orig % 3 !== 0 && (opener.orig + closer.orig) % 3 === 0)) { found = true; break; }
          }
          opener = opener.prev;
        }
        const old = closer;
        if (!found) {
          closer = closer.next;
          ob[idx] = old.prev;
          if (!old.open) removeDelim(old);
          continue;
        }
        const use = cc === 126 ? closer.n : closer.n >= 2 && opener.n >= 2 ? 2 : 1;
        const oi = opener.node, ci = closer.node;
        opener.n -= use; closer.n -= use;
        oi.v = oi.v.slice(0, oi.v.length - use); ci.v = ci.v.slice(0, ci.v.length - use);
        const em = N(cc === 126 ? 's' : use === 1 ? 'i' : 'b');
        for (let t = oi.n; t && t !== ci;) { const nx = t.n; unlink(t); appendChild(em, t); t = nx; work++; }
        insertAfter(oi, em);
        if (opener.next !== closer) { opener.next = closer; closer.prev = opener; }
        if (opener.n === 0) { unlink(oi); removeDelim(opener); }
        if (closer.n === 0) { unlink(ci); const nx = closer.next; removeDelim(closer); closer = nx; }
      }
      while (delims && delims !== bottom) removeDelim(delims);
    }
    function openBracket(image) {
      const index = image ? pos + 1 : pos;
      add(text(image ? '![' : '['));
      pos += image ? 2 : 1;
      if (brackets) brackets.after = true;
      brackets = { node: root.lc, prev: brackets, prevDelim: delims, index, image, active: true, after: false };
    }
    // The tail of an inline link: "(address "title")" at p. { end, dest, title } or null.
    function inlineTail(p) {
      const start = p;
      p = spnl(s, p + 1);
      const D = scanDest(s, p); work += lastScan;
      if (!D) return null;
      let q = spnl(s, D.end), title = '';
      if (q > D.end) { const T = scanTitle(s, q); work += lastScan; if (T) { title = unescapeStr(T.raw); q = spnl(s, T.end); } }
      if (s.charCodeAt(q) !== 41) return null;
      work += q - start;
      return { end: q + 1, dest: encodeUrl(unescapeStr(D.raw)), title };
    }
    function closeBracket() {
      pos++;
      const startpos = pos, op = brackets;
      if (!op) { add(text(']')); return; }
      if (!op.active) { add(text(']')); brackets = op.prev; return; }
      let dest = '', title = '', matched = false;
      if (s.charCodeAt(pos) === 40 && work <= cap) { const r = inlineTail(pos); if (r) { dest = r.dest; title = r.title; pos = r.end; matched = true; } }
      if (!matched && work <= cap) {
        let n = 0;
        if (s.charCodeAt(pos) === 91) { const le = labelEnd(s, pos); work += lastScan; n = le < 0 ? 0 : le - pos; }
        let raw = null;
        if (n > 2) raw = s.slice(pos + 1, pos + n - 1);
        else if (!op.after && startpos - op.index <= 1001) raw = s.slice(op.index + 1, startpos - 1);
        const ref = raw === null ? null : refs.get(normLabel(raw));
        if (ref) { dest = ref.dest; title = ref.title; matched = true; pos += n; }
      }
      if (!matched) { brackets = op.prev; pos = startpos; add(text(']')); return; }
      const node = N(op.image ? 'image' : 'link'); node.dest = dest; node.title = title;
      for (let t = op.node.n; t;) { const nx = t.n; unlink(t); appendChild(node, t); t = nx; work++; }
      add(node);
      processEmphasis(op.prevDelim);
      brackets = op.prev;
      unlink(op.node);
      if (!op.image) for (let b = brackets; b; b = b.prev) { if (b.image) continue; if (!b.active) break; b.active = false; }
    }

    while (pos < len) {
      const c = s.charCodeAt(pos);
      if (c === 10) newline();
      else if (c === 92) backslash();
      else if (c === 96) backticks();
      else if (c === 42 || c === 95 || c === 126) delim(c);
      else if (c === 91) openBracket(false);
      else if (c === 33) { if (s.charCodeAt(pos + 1) === 91) openBracket(true); else { add(text('!')); pos++; } }
      else if (c === 93) closeBracket();
      else if (c === 60) angle();
      else if (c === 38) entity();
      else if ((c === 104 || c === 72) && !brackets && urlAt(pos) && work <= cap) {
        const e = autoEnd(pos);
        if (e > 0) { const url = s.slice(pos, e), a = N('link'); a.dest = encodeUrl(url); appendChild(a, text(url)); add(a); pos = e; }
        else { add(text(s[pos])); pos++; }
      } else {
        let j = pos + 1;
        while (j < len) { const d = s.charCodeAt(j); if (d < 128 && SPECIAL[d] && !((d === 104 || d === 72) && !urlAt(j))) break; j++; }
        add(text(s.slice(pos, j)));
        pos = j;
      }
    }
    processEmphasis(null);
    return root;
  }

  // The plain text inside a picture's [description]: all the text and code in it, line breaks as spaces.
  function altOf(x) {
    let out = '', cur = x.fc;
    const up = [];
    for (;;) {
      if (!cur) { if (!up.length) break; cur = up.pop(); continue; }
      const nd = cur;
      if (nd.fc) { up.push(nd.n); cur = nd.fc; continue; }
      if (nd.t === 'text' || nd.t === 'code') out += nd.v; else if (nd.t === 'soft' || nd.t === 'br') out += ' ';
      cur = nd.n;
    }
    return out;
  }
  function pushText(out, v) {
    if (!v) return;
    const l = out[out.length - 1];
    if (l && l.t === 'text') l.v += v; else out.push({ t: 'text', v });
  }
  // Linked nodes -> the tree. No recursion (a hostile text can nest very deep), and marks nested deeper than MAX_MARKS
  // are dropped but their text stays. Links inside links are dropped the same way.
  function toInline(root, ctx) {
    const out = [], stack = [];
    let f = { cur: root.fc, out, inA: false, depth: 0 };
    for (;;) {
      const x = f.cur;
      if (!x) { if (!stack.length) break; f = stack.pop(); continue; }
      f.cur = x.n;
      switch (x.t) {
        case 'text': pushText(f.out, x.v); break;
        case 'soft': pushText(f.out, ' '); break;
        case 'br': f.out.push({ t: 'br' }); break;
        case 'code': if (x.v) f.out.push({ t: 'code', v: x.v }); break;
        case 'image': {
          const alt = altOf(x), cost = x.dest.length + x.title.length;
          if (!imgOk(x.dest) || ctx.urls + cost > MAX_URL_CHARS) pushText(f.out, alt);
          else { ctx.urls += cost; f.out.push({ t: 'img', src: x.dest, alt, title: x.title }); }
          break;
        }
        default: {                                                 // b, i, s, link
          const isA = x.t === 'link', cost = x.dest.length + x.title.length;
          let wrap = null;
          if (f.depth < MAX_MARKS) {
            if (!isA) wrap = { t: x.t, c: [] };
            else if (!f.inA && linkOk(x.dest) && ctx.urls + cost <= MAX_URL_CHARS) { ctx.urls += cost; wrap = { t: 'a', href: x.dest, title: x.title, c: [] }; ctx.links.push(wrap); }
          }
          if (wrap) f.out.push(wrap);
          stack.push(f);
          f = { cur: x.fc, out: wrap ? wrap.c : f.out, inA: f.inA || (isA && !!wrap), depth: f.depth + (wrap ? 1 : 0) };
        }
      }
    }
    return out;
  }
  const inlineOf = (content, refs, ctx) => toInline(inlineParse(trimWS(content), refs), ctx);

  // ---------- blocks: lines -> a tree of containers and leaves ----------
  // This is the CommonMark way (and commonmark.js's): each line is matched against the open containers (quote, list item),
  // then against the starts of new blocks, and what is left is text for a paragraph, a code block or a table row.
  // Tabs count as moving to the next multiple of 4 columns, as the spec says.
  function parseBlocks(src, refs) {
    const mk = (type, depth) => ({ type, kids: [], parent: null, open: true, content: '', depth, line: 0, blankEnd: false, seen: false, ld: null });
    const doc = mk('doc', 0);
    let tip = doc, oldtip = doc, lastMatched = doc, allClosed = true;
    let ln = '', lineNo = 0, offset = 0, column = 0, nextNonspace = 0, nextCol = 0, indent = 0, indented = false, blank = false, partialTab = false;
    const canContain = (p, t) => (p === 'doc' || p === 'quote' || p === 'item' ? t !== 'item' : p === 'list' ? t === 'item' : false);

    function findNextNonspace() {
      let i = offset, cols = column;
      for (; i < ln.length; i++) {
        const c = ln.charCodeAt(i);
        if (c === 32) cols++; else if (c === 9) cols += 4 - (cols % 4); else break;
      }
      blank = i >= ln.length;
      nextNonspace = i; nextCol = cols; indent = cols - column; indented = indent >= 4;
    }
    function advanceNextNonspace() { offset = nextNonspace; column = nextCol; partialTab = false; }
    function advanceOffset(count, columns) {
      while (count > 0 && offset < ln.length) {
        if (ln.charCodeAt(offset) === 9) {
          const toTab = 4 - (column % 4);
          if (columns) {
            partialTab = toTab > count;
            const adv = partialTab ? count : toTab;
            column += adv; offset += partialTab ? 0 : 1; count -= adv;
          } else { partialTab = false; column += toTab; offset += 1; count -= 1; }
        } else { partialTab = false; offset += 1; column += 1; count -= 1; }
      }
    }
    function addLine() {
      if (partialTab) { offset += 1; tip.content += ' '.repeat(4 - (column % 4)); }
      tip.content += ln.slice(offset) + '\n';
    }
    function addChild(type) {
      while (!canContain(tip.type, type)) finalize(tip);
      const n = mk(type, tip.depth + (type === 'quote' || type === 'item' ? 1 : 0));
      n.parent = tip; n.line = lineNo;
      tip.kids.push(n);
      tip = n;
      return n;
    }
    function closeUnmatched() {
      if (allClosed) return;
      while (oldtip !== lastMatched) { const parent = oldtip.parent; finalize(oldtip); oldtip = parent; }
      allClosed = true;
    }
    function endsBlank(b) {
      while (b) {
        if (b.blankEnd) return true;
        if (!b.seen && (b.type === 'list' || b.type === 'item')) { b.seen = true; b = b.kids[b.kids.length - 1]; } else { b.seen = true; break; }
      }
      return false;
    }
    function finalize(b) {
      const above = b.parent;
      b.open = false;
      if (b.type === 'para') {
        let p = 0, defs = false;
        while (b.content.charCodeAt(p) === 91) { const e = parseRefDef(b.content, p, refs); if (e < 0) break; p = e; defs = true; }
        if (defs) b.content = b.content.slice(p);
        if (blankFrom(b.content, 0)) { const i = above.kids.lastIndexOf(b); if (i >= 0) above.kids.splice(i, 1); }
      } else if (b.type === 'list') {
        const items = b.kids;
        for (let i = 0; i < items.length && b.ld.tight; i++) {
          if (endsBlank(items[i]) && i < items.length - 1) { b.ld.tight = false; break; }
          const sub = items[i].kids;
          for (let j = 0; j < sub.length; j++) if (endsBlank(sub[j]) && (i < items.length - 1 || j < sub.length - 1)) { b.ld.tight = false; break; }
        }
      } else if (b.type === 'code') {
        if (b.fenced) { const nl = b.content.indexOf('\n'); b.info = unescapeStr(trimWS(b.content.slice(0, nl))); b.literal = b.content.slice(nl + 1); }
        else {
          let end = b.content.length;                              // drop blank lines at the end, keep one line break
          for (;;) {
            const ls = end < 2 ? 0 : b.content.lastIndexOf('\n', end - 2) + 1;
            let allSp = true; for (let i = ls; i < end - 1; i++) if (b.content.charCodeAt(i) !== 32) { allSp = false; break; }
            if (allSp && ls > 0 && ls < end) end = ls; else break;
          }
          b.literal = b.content.slice(0, end);
        }
        b.content = '';
      }
      tip = above;
    }

    // --- table helpers ---
    // A row's cells. Pipes at the ends are optional, "\|" is a pipe in the text.
    function splitCells(s) {
      let i = 0, n = s.length;
      while (i < n && isSp(s.charCodeAt(i))) i++;
      while (n > i && isSp(s.charCodeAt(n - 1))) n--;
      if (i < n && s.charCodeAt(i) === 124) i++;
      if (n > i && s.charCodeAt(n - 1) === 124) { let bs = 0; for (let k = n - 2; k >= i && s.charCodeAt(k) === 92; k--) bs++; if (bs % 2 === 0) n--; }
      const cells = [];
      let start = i;
      for (let j = i; j < n; j++) {
        const c = s.charCodeAt(j);
        if (c === 92) j++;
        else if (c === 124) { cells.push(s.slice(start, j)); start = j + 1; }
      }
      cells.push(s.slice(start, n));
      return cells.map(c => trimWS(c).replace(/\\\|/g, '|'));
    }
    // "| --- | :-: |" -> ['', 'center']; null when the line is not a delimiter row.
    function delimRow(s) {
      for (let j = 0; j < s.length; j++) { const c = s.charCodeAt(j); if (c !== 32 && c !== 9 && c !== 124 && c !== 58 && c !== 45) return null; }
      const aligns = [];
      for (const cell of splitCells(s)) {
        const l = cell.charCodeAt(0) === 58, r = cell.charCodeAt(cell.length - 1) === 58 && cell.length > 1;
        const dashes = cell.slice(l ? 1 : 0, r ? -1 : undefined);
        if (!dashes || dashes.replace(/-/g, '') !== '') return null;
        aligns.push(l && r ? 'center' : l ? 'left' : r ? 'right' : '');
      }
      return aligns.length ? aligns : null;
    }

    // --- how each open container takes the next line: 0 it continues, 1 it does not, 2 the line was consumed ---
    function cont(c) {
      switch (c.type) {
        case 'quote':
          if (!indented && ln.charCodeAt(nextNonspace) === 62) {
            advanceNextNonspace(); advanceOffset(1, false);
            if (isSp(ln.charCodeAt(offset))) advanceOffset(1, true);
            return 0;
          }
          return 1;
        case 'item':
          if (blank) { if (!c.kids.length) return 1; advanceNextNonspace(); }
          else if (indent >= c.ld.markerOffset + c.ld.padding) advanceOffset(c.ld.markerOffset + c.ld.padding, true);
          else return 1;
          return 0;
        case 'heading': case 'hr': return 1;
        case 'para': case 'table': return blank ? 1 : 0;
        case 'code':
          if (c.fenced) {
            if (indent <= 3 && ln.charCodeAt(nextNonspace) === c.fenceChar) {
              let j = nextNonspace; while (ln.charCodeAt(j) === c.fenceChar) j++;
              if (j - nextNonspace >= c.fenceLen && blankFrom(ln, j)) { finalize(c); return 2; }
            }
            for (let i = c.fenceOffset; i > 0 && isSp(ln.charCodeAt(offset)); i--) advanceOffset(1, true);
          } else if (indent >= 4) advanceOffset(4, true);
          else if (blank) advanceNextNonspace();
          else return 1;
          return 0;
        default: return 0;
      }
    }

    // --- the starts of new blocks: 0 no, 1 a container was opened (keep looking), 2 a leaf was opened ---
    function quoteStart(container) {
      if (indented || ln.charCodeAt(nextNonspace) !== 62 || container.depth >= MAX_NEST) return 0;
      advanceNextNonspace(); advanceOffset(1, false);
      if (isSp(ln.charCodeAt(offset))) advanceOffset(1, true);
      closeUnmatched();
      addChild('quote');
      return 1;
    }
    function atxStart() {
      if (indented) return 0;
      let j = nextNonspace;
      while (ln.charCodeAt(j) === 35) j++;
      const n = j - nextNonspace;
      if (n < 1 || n > 6 || !(j >= ln.length || isSp(ln.charCodeAt(j)))) return 0;
      advanceNextNonspace(); advanceOffset(n, false);
      while (isSp(ln.charCodeAt(offset))) advanceOffset(1, false);
      closeUnmatched();
      const h = addChild('heading');
      h.level = n;
      const rest = ln.slice(offset);
      let e = rest.length; while (e > 0 && isSp(rest.charCodeAt(e - 1))) e--;
      let k = e; while (k > 0 && rest.charCodeAt(k - 1) === 35) k--;
      if (k < e) { if (k === 0) e = 0; else if (isSp(rest.charCodeAt(k - 1))) { e = k - 1; while (e > 0 && isSp(rest.charCodeAt(e - 1))) e--; } }
      h.content = rest.slice(0, e);
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function fenceStart() {
      if (indented) return 0;
      const c = ln.charCodeAt(nextNonspace);
      if (c !== 96 && c !== 126) return 0;
      let j = nextNonspace; while (ln.charCodeAt(j) === c) j++;
      const n = j - nextNonspace;
      if (n < 3 || (c === 96 && ln.indexOf('`', j) >= 0)) return 0;
      closeUnmatched();
      const b = addChild('code');
      b.fenced = true; b.fenceLen = n; b.fenceChar = c; b.fenceOffset = indent;
      advanceNextNonspace(); advanceOffset(n, false);
      return 2;
    }
    function setextStart(container) {
      if (indented || container.type !== 'para') return 0;
      const c = ln.charCodeAt(nextNonspace);
      if (c !== 61 && c !== 45) return 0;
      let j = nextNonspace; while (ln.charCodeAt(j) === c) j++;
      if (!blankFrom(ln, j)) return 0;
      closeUnmatched();
      let p = 0;
      while (container.content.charCodeAt(p) === 91) { const e = parseRefDef(container.content, p, refs); if (e < 0) break; p = e; }
      container.content = container.content.slice(p);
      if (!container.content.length) return 0;
      const h = mk('heading', container.depth);
      h.level = c === 61 ? 1 : 2; h.content = container.content; h.parent = container.parent; h.line = lineNo;
      container.parent.kids[container.parent.kids.lastIndexOf(container)] = h;
      container.open = false;
      tip = h;
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function hrStart() {
      if (indented) return 0;
      const c = ln.charCodeAt(nextNonspace);
      if (c !== 42 && c !== 45 && c !== 95) return 0;
      let n = 0;
      for (let j = nextNonspace; j < ln.length; j++) { const d = ln.charCodeAt(j); if (d === c) n++; else if (!isSp(d)) return 0; }
      if (n < 3) return 0;
      closeUnmatched();
      addChild('hr');
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function listMarker(container) {
      if (indent >= 4) return null;
      const c = ln.charCodeAt(nextNonspace);
      const ld = { type: '', tight: true, bullet: '', start: 0, delim: '', padding: 0, markerOffset: indent };
      let mlen;
      if (c === 42 || c === 43 || c === 45) { ld.type = 'bullet'; ld.bullet = ln[nextNonspace]; mlen = 1; }
      else if (isDigit(c)) {
        let j = nextNonspace; while (j - nextNonspace < 10 && isDigit(ln.charCodeAt(j))) j++;
        const dn = j - nextNonspace, d = ln.charCodeAt(j);
        if (dn > 9 || (d !== 46 && d !== 41)) return null;
        if (container.type === 'para' && !(dn === 1 && c === 49)) return null;
        ld.type = 'ordered'; ld.start = parseInt(ln.substr(nextNonspace, dn), 10); ld.delim = ln[j]; mlen = dn + 1;
      } else return null;
      const nc = ln.charCodeAt(nextNonspace + mlen);
      if (!(nextNonspace + mlen >= ln.length || nc === 9 || nc === 32)) return null;
      if (container.type === 'para' && blankFrom(ln, nextNonspace + mlen)) return null;
      advanceNextNonspace(); advanceOffset(mlen, true);
      const spCol = column, spOff = offset;
      do { advanceOffset(1, true); } while (column - spCol < 5 && isSp(ln.charCodeAt(offset)));
      const blankItem = offset >= ln.length, after = column - spCol;
      if (after >= 5 || after < 1 || blankItem) {
        ld.padding = mlen + 1; column = spCol; offset = spOff;
        if (isSp(ln.charCodeAt(offset))) advanceOffset(1, true);
      } else ld.padding = mlen + after;
      return ld;
    }
    function itemStart(container) {
      if ((indented && container.type !== 'list') || container.depth >= MAX_NEST) return 0;
      const ld = listMarker(container);
      if (!ld) return 0;
      closeUnmatched();
      if (tip.type !== 'list' || !container.ld || container.ld.type !== ld.type || container.ld.delim !== ld.delim || container.ld.bullet !== ld.bullet) addChild('list').ld = ld;
      addChild('item').ld = ld;
      return 1;
    }
    // A line of delimiters under a line of text makes a table (the text line is the header; earlier lines stay a paragraph).
    function tableStart(container) {
      if (indented || container.type !== 'para') return 0;
      const c0 = ln.charCodeAt(nextNonspace);
      if (c0 !== 124 && c0 !== 58 && c0 !== 45) return 0;
      const aligns = delimRow(ln.slice(nextNonspace));
      if (!aligns) return 0;
      const c = container.content;
      if (c.length < 2) return 0;
      const nl = c.lastIndexOf('\n', c.length - 2), row = c.slice(nl + 1, c.length - 1), head = splitCells(row);
      if (head.length !== aligns.length || trimWS(row) === '|') return 0;       // a lone | is not a row
      closeUnmatched();
      container.content = c.slice(0, nl + 1);
      finalize(container);
      const t = addChild('table');
      t.align = aligns; t.head = head; t.rows = [];
      advanceOffset(ln.length - offset, false);
      return 2;
    }
    function codeStart() {
      if (!(indented && tip.type !== 'para' && !blank)) return 0;
      advanceOffset(4, true); closeUnmatched();
      addChild('code').fenced = false;
      return 2;
    }
    const STARTS = [quoteStart, atxStart, fenceStart, setextStart, hrStart, itemStart, tableStart, codeStart];
    const special = c => (c >= 48 && c <= 58) || c === 35 || c === 96 || c === 126 || c === 42 || c === 43 || c === 95 || c === 61 || c === 62 || c === 45 || c === 124;

    function incorporateLine(line) {
      let container = doc;
      oldtip = tip; offset = 0; column = 0; blank = false; partialTab = false; lineNo++;
      ln = line;
      for (let last; (last = container.kids[container.kids.length - 1]) && last.open;) {
        container = last;
        findNextNonspace();
        const r = cont(container);
        if (r === 1) { container = container.parent; break; }
        if (r === 2) return;
      }
      allClosed = container === oldtip;
      lastMatched = container;
      let leaf = container.type === 'code';
      while (!leaf) {
        findNextNonspace();
        if (!indented && !special(ln.charCodeAt(nextNonspace))) { advanceNextNonspace(); break; }
        let i = 0;
        for (; i < STARTS.length; i++) {
          const res = STARTS[i](container);
          if (res === 1) { container = tip; break; }
          if (res === 2) { container = tip; leaf = true; break; }
        }
        if (i === STARTS.length) { advanceNextNonspace(); break; }
      }
      if (!allClosed && !blank && tip.type === 'para') { addLine(); return; }
      closeUnmatched();
      if (blank && container.kids.length) container.kids[container.kids.length - 1].blankEnd = true;
      const t = container.type;
      const lastBlank = blank && !(t === 'quote' || (t === 'code' && container.fenced) || (t === 'item' && !container.kids.length && container.line === lineNo));
      for (let c = container; c; c = c.parent) c.blankEnd = lastBlank;
      if (t === 'code' || t === 'para') addLine();
      else if (offset < ln.length && !blank) {
        if (t === 'table') {
          const cells = splitCells(ln.slice(offset)), n = container.align.length;
          while (cells.length < n) cells.push('');
          container.rows.push(cells.slice(0, n));
        } else { addChild('para'); advanceNextNonspace(); addLine(); }
      }
    }

    for (let i = 0, nl; i <= src.length; i = nl + 1) {
      nl = src.indexOf('\n', i); if (nl < 0) nl = src.length;
      if (nl === src.length && i === nl && i > 0) break;           // the text ended with a line break
      incorporateLine(src.slice(i, nl));
    }
    while (tip) finalize(tip);
    return doc;
  }

  // A task item's first paragraph starts with [ ], [x] or [X], then a space, then more text: { on, len } (len = what to cut off), else null.
  const taskMark = c => {
    if (c.charCodeAt(0) !== 91 || c.charCodeAt(2) !== 93 || !(c[1] === ' ' || c[1] === 'x' || c[1] === 'X')) return null;
    const w = c.charCodeAt(3);
    if (!(isSp(w) || w === 10)) return null;
    let k = 4; while (k < c.length && (isSp(c.charCodeAt(k)) || c.charCodeAt(k) === 10)) k++;
    return k >= c.length ? null : { on: c[1] !== ' ', len: k };
  };
  // Containers and leaves -> blocks of the tree.
  function build(node, refs, ctx) {
    const out = [];
    for (const k of node.kids) {
      switch (k.type) {
        case 'para': { const inline = inlineOf(k.content, refs, ctx); if (inline.length) out.push({ t: 'p', inline }); break; }
        case 'heading': { const h = { t: 'h', level: k.level, inline: inlineOf(k.content, refs, ctx), id: '' }; ctx.heads.push(h); out.push(h); break; }
        case 'hr': out.push({ t: 'hr' }); break;
        case 'code': { const lit = k.literal || '';           // the language is the first word of a fence's info string
          out.push({ t: 'code', lang: k.fenced ? k.info.split(/[ \t]/, 1)[0] : '', text: lit.endsWith('\n') ? lit.slice(0, -1) : lit }); break; }
        case 'quote': out.push({ t: 'quote', blocks: build(k, refs, ctx) }); break;
        case 'list': {
          const items = k.kids.map(it => {
            let checked = null;
            const f = it.kids[0];
            if (f && f.type === 'para' && f.line === it.line) { const m = taskMark(f.content); if (m) { checked = m.on; f.content = f.content.slice(m.len); } }
            return { checked, blocks: build(it, refs, ctx) };
          });
          out.push(k.ld.type === 'ordered' ? { t: 'ol', start: k.ld.start, tight: k.ld.tight, items } : { t: 'ul', tight: k.ld.tight, items });
          break;
        }
        case 'table': { const cell = c => inlineOf(c, refs, ctx); out.push({ t: 'table', align: k.align, head: k.head.map(cell), rows: k.rows.map(r => r.map(cell)) }); break; }
        default: break;
      }
    }
    return out;
  }
  // The text of inline nodes without any marks.
  function textOf(nodes) {
    let s = '';
    for (const x of nodes) {
      if (x.t === 'text' || x.t === 'code') s += x.v;
      else if (x.t === 'img') s += x.alt;
      else if (x.t === 'br') s += ' ';
      else if (x.c) s += textOf(x.c);
    }
    return s;
  }
  // GitHub-style ids: lower case, letters, numbers, - and _ only, spaces become -, a repeat gets -1, -2. In the text,
  // a link to (#some-heading) points at that heading's id.
  const slugify = t => t.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-') || 'section';
  function assignIds(heads, links) {
    const used = new Set(), counts = new Map();
    for (const h of heads) {
      const base = slugify(textOf(h.inline));
      let id = base;
      if (used.has(id)) { let n = counts.get(base) || 0; do { n++; id = base + '-' + n; } while (used.has(id)); counts.set(base, n); }
      used.add(id);
      h.id = 'g-' + id;
    }
    for (const a of links) {
      if (a.href.charCodeAt(0) !== 35) continue;
      let f = a.href.slice(1);
      try { f = decodeURIComponent(f); } catch (e) { /* stays as written */ }
      f = f.toLowerCase();
      if (used.has(f)) a.href = encodeUrl('#g-' + f);
    }
  }
  function parse(md) {
    const src = clean(md);
    try {
      const refs = new Map(), ctx = { urls: 0, links: [], heads: [] };
      const blocks = build(parseBlocks(src, refs), refs, ctx);
      assignIds(ctx.heads, ctx.links);
      return blocks;
    } catch (e) {
      errors++;
      return src ? [{ t: 'p', inline: [{ t: 'text', v: src.slice(0, 5000) }] }] : [];
    }
  }

  // ---------- showing: the tree -> HTML ----------
  // Only these tags are ever written: div h1-h6 p br strong em del code pre blockquote ul ol li input hr table thead
  // tbody tr th td a img. And only these attributes: class (gd, gd-task, language-x), id (on headings), href title rel
  // target (a), src alt title loading decoding (img), start (ol), type disabled checked (input), style="text-align:x" (th, td).
  // No line breaks between tags (only inside pre), so the same text always gives the same HTML.
  // opts.image(src) says whether a picture may show: it returns the address to use or '' to refuse.
  const LANG = /^[A-Za-z0-9_+#-]{1,20}$/;
  function renderer(opts) {
    const custom = opts && typeof opts.image === 'function' ? opts.image : null;
    let pictures = 0;
    function picture(src) {
      if (pictures >= MAX_IMAGES) return '';
      let u = src;
      if (custom) {
        try { u = custom(src); } catch (e) { u = ''; }
        u = typeof u === 'string' && u ? encodeUrl(u) : '';
        if (!imgOk(u)) u = '';
      } else if (!ownImg(src)) u = '';
      if (u) pictures++;
      return u;
    }
    function inline(nodes) {
      let h = '';
      for (const x of nodes) {
        switch (x.t) {
          case 'text': h += esc(x.v); break;
          case 'b': h += '<strong>' + inline(x.c) + '</strong>'; break;
          case 'i': h += '<em>' + inline(x.c) + '</em>'; break;
          case 's': h += '<del>' + inline(x.c) + '</del>'; break;
          case 'code': h += '<code>' + esc(x.v) + '</code>'; break;
          case 'br': h += '<br>'; break;
          case 'a':
            h += linkOk(x.href)
              ? '<a href="' + escA(x.href) + '"' + (x.title ? ' title="' + escA(x.title) + '"' : '') + ' rel="nofollow ugc noopener"' + (x.href.charCodeAt(0) === 35 ? '' : ' target="_blank"') + '>' + inline(x.c) + '</a>'
              : inline(x.c);
            break;
          case 'img': {
            const u = picture(x.src);
            h += u ? '<img src="' + escA(u) + '" alt="' + escA(x.alt) + '"' + (x.title ? ' title="' + escA(x.title) + '"' : '') + ' loading="lazy" decoding="async">' : esc(x.alt);
            break;
          }
          default: break;
        }
      }
      return h;
    }
    function item(it, tight) {
      const task = it.checked === true || it.checked === false;
      const box = '<input type="checkbox" disabled' + (it.checked ? ' checked' : '') + '>';
      let h = '';
      it.blocks.forEach((b, i) => {
        if (b.t === 'p' && i === 0 && task) h += tight ? box + ' ' + inline(b.inline) : '<p>' + box + ' ' + inline(b.inline) + '</p>';
        else if (b.t === 'p' && tight) h += inline(b.inline);
        else h += (i === 0 && task ? box : '') + block(b, tight);
      });
      if (task && !it.blocks.length) h = box;
      return '<li' + (task ? ' class="gd-task"' : '') + '>' + h + '</li>';
    }
    function block(b) {
      switch (b.t) {
        case 'h': { const n = Math.max(1, Math.min(6, b.level | 0)); return '<h' + n + ' id="' + escA(b.id) + '">' + inline(b.inline) + '</h' + n + '>'; }
        case 'p': { const h = inline(b.inline); return h ? '<p>' + h + '</p>' : ''; }
        case 'code': return '<pre><code' + (LANG.test(b.lang) ? ' class="language-' + escA(b.lang) + '"' : '') + '>' + esc(b.text) + (b.text ? '\n' : '') + '</code></pre>';
        case 'quote': return '<blockquote>' + b.blocks.map(block).join('') + '</blockquote>';
        case 'hr': return '<hr>';
        case 'ul': return '<ul>' + b.items.map(it => item(it, b.tight)).join('') + '</ul>';
        case 'ol': return (b.start !== 1 ? '<ol start="' + (b.start | 0) + '">' : '<ol>') + b.items.map(it => item(it, b.tight)).join('') + '</ol>';
        case 'table': {
          const al = i => (b.align[i] === 'left' || b.align[i] === 'right' || b.align[i] === 'center' ? ' style="text-align:' + b.align[i] + '"' : '');
          return '<table><thead><tr>' + b.head.map((c, i) => '<th' + al(i) + '>' + inline(c) + '</th>').join('') + '</tr></thead>'
            + (b.rows.length ? '<tbody>' + b.rows.map(r => '<tr>' + r.map((c, i) => '<td' + al(i) + '>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody>' : '') + '</table>';
        }
        default: return '';
      }
    }
    return block;
  }
  function render(md, opts) {
    try {
      const block = renderer(opts);
      return '<div class="gd">' + parse(md).map(block).join('') + '</div>';
    } catch (e) {
      errors++;
      return '<div class="gd"><p>' + esc(clean(md).slice(0, 5000)) + '</p></div>';
    }
  }

  // ---------- plain text and outline ----------
  // The words without any marks: a heading, a paragraph, a list item, a code line, a table row each on its own line.
  function plainLines(blocks, out) {
    for (const b of blocks) {
      switch (b.t) {
        case 'h': case 'p': { const t = textOf(b.inline); if (t) out.push(t); break; }
        case 'code': for (const l of b.text.split('\n')) if (l) out.push(l); break;
        case 'quote': plainLines(b.blocks, out); break;
        case 'ul': case 'ol': for (const it of b.items) plainLines(it.blocks, out); break;
        case 'table': for (const r of [b.head, ...b.rows]) { const t = r.map(textOf).filter(Boolean).join(' '); if (t) out.push(t); } break;
        default: break;
      }
    }
    return out;
  }
  function plain(md, n) {
    try {
      let t = plainLines(parse(md), []).join('\n');
      if (typeof n === 'number' && n >= 0 && t.length > n) {
        t = t.slice(0, Math.floor(n));
        const c = t.charCodeAt(t.length - 1);
        if (c >= 0xd800 && c <= 0xdbff) t = t.slice(0, -1);
        t = t.trimEnd();
      }
      return t;
    } catch (e) { errors++; return ''; }
  }
  function headings(md) {
    const out = [];
    const walk = blocks => {
      for (const b of blocks) {
        if (b.t === 'h') out.push({ level: b.level, text: textOf(b.inline), id: b.id });
        else if (b.t === 'quote') walk(b.blocks);
        else if (b.t === 'ul' || b.t === 'ol') b.items.forEach(it => walk(it.blocks));
      }
    };
    try { walk(parse(md)); } catch (e) { errors++; }
    return out;
  }

  // ---------- the toolbar: editing a text field's text ----------
  // Every helper takes the text and the selection (a..b, either way round) and returns { text, a, b }: the new text and
  // the new selection. Nothing here changes anything else, so the page just puts the result back into the field.
  const num = (v, n, d) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(Math.floor(v), n)) : d);
  function range(text, a, b) { const n = text.length, x = num(a, n, n), y = num(b, n, x); return x <= y ? [x, y] : [y, x]; }
  const lineStart = (t, i) => (i <= 0 ? 0 : t.lastIndexOf('\n', i - 1) + 1);
  const lineEnd = (t, i) => { const j = t.indexOf('\n', i); return j < 0 ? t.length : j; };
  const runLen = (t, i, ch, dir) => { let k = 0; while (dir < 0 ? i - 1 - k >= 0 && t[i - 1 - k] === ch : i + k < t.length && t[i + k] === ch) k++; return k; };

  // --- bold, italic, strike, code: wrap the selection, or unwrap it when it is wrapped already ---
  const MARKS = { b: ['**', '*'], i: ['*', '*'], s: ['~~', '~'], c: ['`', '`'] };
  // How many mark characters sit on each side of t[x..y]; 0 when it is not wrapped.
  function around(t, x, y, kind) {
    const ch = MARKS[kind][1], rb = runLen(t, x, ch, -1), ra = runLen(t, y, ch, 1);
    if (kind === 'b' || kind === 's') return rb >= 2 && ra >= 2 ? 2 : 0;
    if (kind === 'i') return rb % 2 === 1 && ra % 2 === 1 ? 1 : 0;
    return rb >= 1 && rb === ra ? rb : 0;
  }
  // How many mark characters t[x..y] itself starts and ends with.
  function inner(seg, kind) {
    const ch = MARKS[kind][1], m = MARKS[kind][0].length;
    let l = 0, r = 0;
    while (l < seg.length && seg[l] === ch) l++;
    while (r < seg.length - l && seg[seg.length - 1 - r] === ch) r++;
    if (kind === 'b' || kind === 's') return l >= 2 && r >= 2 && seg.length >= 2 * m ? 2 : 0;
    if (kind === 'i') return l % 2 === 1 && r % 2 === 1 ? 1 : 0;
    return l >= 1 && l === r ? l : 0;
  }
  // Where a list marker, heading marker or quote marker ends at the start of a line (for wrapping text on each line).
  function prefixEnd(line) {
    let i = 0;
    for (;;) {
      let j = i; while (j < line.length && j - i < 3 && isSp(line.charCodeAt(j))) j++;
      if (line.charCodeAt(j) === 62) { i = j + 1; if (isSp(line.charCodeAt(i))) i++; continue; }
      break;
    }
    const rest = line.slice(i), li = listInfo(rest);
    if (li) return i + li.end;
    const m = /^ {0,3}#{1,6}[ \t]+/.exec(rest);
    return m ? i + m[0].length : i;
  }
  // The pieces of the selection to mark: one per line, without list/heading/quote markers or edge spaces.
  function pieces(t, s, e) {
    const nl = t.indexOf('\n', s), multi = nl >= 0 && nl < e, out = [];
    for (let ls = lineStart(t, s); ls <= e;) {
      const le = lineEnd(t, ls);
      let x = Math.max(ls, s), y = Math.min(le, e);
      if (multi && x === ls) x = Math.min(y, ls + prefixEnd(t.slice(ls, le)));
      while (x < y && isSp(t.charCodeAt(x))) x++;
      while (y > x && isSp(t.charCodeAt(y - 1))) y--;
      if (x < y) out.push([x, y]);
      if (le >= e) break;
      ls = le + 1;
    }
    return out.length ? out : [[s, e]];
  }
  function mark(text, a, b, kind) {
    const t = str(text), [s, e] = range(t, a, b), [open, ch] = MARKS[kind];
    if (s === e) {
      const k = around(t, s, s, kind);
      if (k) return { text: t.slice(0, s - k) + t.slice(s + k), a: s - k, b: s - k };
      return { text: t.slice(0, s) + open + open + t.slice(s), a: s + open.length, b: s + open.length };
    }
    const segs = pieces(t, s, e).map(([x, y]) => ({ x, y, ko: around(t, x, y, kind), ki: inner(t.slice(x, y), kind) }));
    const un = segs.every(g => g.ko || g.ki);
    let out = '', last = 0;
    const spans = [];
    for (const g of segs) {
      let cutStart = g.x, content = t.slice(g.x, g.y), cutEnd = g.y, pre = '', post = '';
      if (un) {
        if (g.ko) { cutStart = g.x - g.ko; cutEnd = g.y + g.ko; } else content = content.slice(g.ki, content.length - g.ki);
      } else if (!g.ko && !g.ki) {
        let f = open;
        if (kind === 'c') {
          let longest = 0; for (let i = 0, r = 0; i < content.length; i++) { r = content[i] === '`' ? r + 1 : 0; if (r > longest) longest = r; }
          f = '`'.repeat(longest + 1);
          if (content[0] === '`' || content[content.length - 1] === '`') { pre = f + ' '; post = ' ' + f; } else { pre = f; post = f; }
        } else { pre = open; post = open; }
      }
      out += t.slice(last, cutStart);
      const o0 = out.length; out += pre;
      const c0 = out.length; out += content;
      const c1 = out.length; out += post;
      spans.push([o0, c0, c1, out.length]);
      last = cutEnd;
    }
    out += t.slice(last);
    // One piece: its words stay selected. Several lines: they are selected whole, marks included, so the same button takes the marks off again.
    const whole = segs.length > 1 && !un, f = spans[0], z = spans[spans.length - 1];
    return { text: out, a: whole ? f[0] : f[1], b: whole ? z[3] : z[2] };
  }
  const bold = (t, a, b) => mark(t, a, b, 'b');
  const italic = (t, a, b) => mark(t, a, b, 'i');
  const strike = (t, a, b) => mark(t, a, b, 's');
  const code = (t, a, b) => mark(t, a, b, 'c');

  // --- line by line: headings, lists, quotes, indenting ---
  // Runs fn on the selected lines (an array of lines). fn answers, for each line, null (no change) or { keep, cut, ins }: keep the
  // first `keep` characters, replace the next `cut` by `ins`, keep the rest. (Or null for "nothing to do at all".) The selection
  // stays on the same words: a position moves with the text on its line, a caret in or at the changed part ends up after the new
  // part, and the start of a selection stays in front of it, so the marks are selected too.
  function applyLines(t, a, b, fn) {
    const [s, e] = range(t, a, b);
    const ls = lineStart(t, s), le = lineEnd(t, e > s && t.charCodeAt(e - 1) === 10 ? e - 1 : e);
    const old = t.slice(ls, le).split('\n'), ch = fn(old);
    if (!ch) return { text: t, a: s, b: e };
    const info = [], out = [];
    let os = ls, ns = ls;
    old.forEach((o, i) => {
      const c = ch[i] || { keep: 0, cut: 0, ins: '' }, n = o.slice(0, c.keep) + c.ins + o.slice(c.keep + c.cut);
      out.push(n);
      info.push({ os, ns, ol: o.length, c });
      os += o.length + 1; ns += n.length + 1;
    });
    const delta = ns - os, caret = s === e;
    const map = p => {
      if (p < ls) return p;
      if (p > le) return p + delta;
      for (const g of info) {
        if (p > g.os + g.ol) continue;
        const col = p - g.os, { keep, cut, ins } = g.c;
        if (col < keep) return g.ns + col;
        if (col <= keep + cut) return g.ns + (caret || col > keep ? keep + ins.length : col);
        return g.ns + col + ins.length - cut;
      }
      return p + delta;
    };
    return { text: t.slice(0, ls) + out.join('\n') + t.slice(le), a: map(s), b: map(e) };
  }
  // Which of the lines a toggle applies to: the ones with text; blank ones too when it is the only line.
  const activeLines = lines => { const act = lines.map(l => l.trim() !== ''); return act.some(Boolean) ? act : lines.map(() => true); };
  const indentLen = l => { let i = 0; while (i < l.length && isSp(l.charCodeAt(i))) i++; return i; };
  // A list line: { indent, kind: 'bullet'|'number', marker, delim, task: null|false|true, end } where end is where the text starts.
  function listInfo(line) {
    const i = indentLen(line), c = line.charCodeAt(i);
    let kind, marker, delim = '', j;
    if (c === 45 || c === 42 || c === 43) { kind = 'bullet'; marker = line[i]; j = i + 1; }
    else if (isDigit(c)) {
      j = i; while (j < line.length && j - i < 10 && isDigit(line.charCodeAt(j))) j++;
      const d = line.charCodeAt(j);
      if (j - i > 9 || (d !== 46 && d !== 41)) return null;
      kind = 'number'; marker = line.slice(i, j); delim = line[j]; j++;
    } else return null;
    if (j < line.length && !isSp(line.charCodeAt(j))) return null;
    let k = j; while (k < line.length && isSp(line.charCodeAt(k))) k++;
    let task = null;
    if (line.charCodeAt(k) === 91 && line.charCodeAt(k + 2) === 93 && (line[k + 1] === ' ' || line[k + 1] === 'x' || line[k + 1] === 'X') && (k + 3 >= line.length || isSp(line.charCodeAt(k + 3)))) {
      task = line[k + 1] !== ' ';
      k += 3; while (k < line.length && isSp(line.charCodeAt(k))) k++;
    }
    return { indent: i, kind, marker, delim, task, end: k };
  }
  const headMark = l => { const m = /^ {0,3}(#{1,6})(?:[ \t]+|$)/.exec(l); return m ? { len: m[0].length, n: m[1].length } : { len: 0, n: 0 }; };
  function heading(text, a, b, level) {
    const t = str(text), lv = Math.max(1, Math.min(6, Math.floor(+level) || 1));
    return applyLines(t, a, b, lines => {
      const act = activeLines(lines), on = lines.every((l, i) => !act[i] || headMark(l).n === lv);
      return lines.map((l, i) => (act[i] ? { keep: 0, cut: headMark(l).len, ins: on ? '' : '#'.repeat(lv) + ' ' } : null));
    });
  }
  function listOp(text, a, b, kind) {
    return applyLines(str(text), a, b, lines => {
      const act = activeLines(lines), infos = lines.map((l, i) => (act[i] ? listInfo(l) : null));
      const fits = g => !!g && (kind === 'bullet' ? g.kind === 'bullet' && g.task === null : kind === 'number' ? g.kind === 'number' : g.kind === 'bullet' && g.task !== null);
      const on = lines.every((l, i) => !act[i] || fits(infos[i]));
      let n = 0;
      return lines.map((l, i) => {
        if (!act[i]) return null;
        const g = infos[i], keep = g ? g.indent : indentLen(l), cut = g ? g.end - g.indent : 0;
        if (on) return { keep, cut, ins: '' };
        n++;
        if (kind === 'bullet') return { keep, cut, ins: '- ' };
        if (kind === 'number') return { keep, cut, ins: n + '. ' };
        return g && g.kind === 'bullet' && g.task !== null ? null : { keep, cut, ins: '- [ ] ' };
      });
    });
  }
  const bullets = (t, a, b) => listOp(t, a, b, 'bullet');
  const numbers = (t, a, b) => listOp(t, a, b, 'number');
  const tasks = (t, a, b) => listOp(t, a, b, 'task');
  function quote(text, a, b) {
    return applyLines(str(text), a, b, lines => {
      const q = l => /^ {0,3}>/.test(l), on = lines.every(q);
      return lines.map(l => {
        if (on) { const m = /^( {0,3})> ?/.exec(l); return { keep: m[1].length, cut: m[0].length - m[1].length, ins: '' }; }
        return q(l) ? null : { keep: 0, cut: 0, ins: l.trim() === '' && lines.length > 1 ? '>' : '> ' };
      });
    });
  }
  // Tab and Shift+Tab on list lines: two spaces in or out. Nothing changes when no selected line is a list line.
  function indentLines(text, a, b, out) {
    return applyLines(str(text), a, b, lines => {
      if (!lines.some(l => listInfo(l))) return null;
      return lines.map(l => {
        if (!l.trim()) return null;
        if (!out) return { keep: 0, cut: 0, ins: '  ' };
        const m = /^(?: {1,2}|\t)/.exec(l);
        return m ? { keep: 0, cut: m[0].length, ins: '' } : null;
      });
    });
  }
  // Enter at pos (a caret) in a list: the next item starts (bullets, numbers going up, tasks unchecked); Enter on an empty
  // item ends the list. null means "do nothing special" (not in a list, caret before the marker, or inside a code block).
  function inFence(t, upto) {
    let fence = null;
    for (let ls = 0; ls < upto;) {
      const le = lineEnd(t, ls), line = t.slice(ls, le);
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fence) { if (m && m[1][0] === fence.ch && m[1].length >= fence.len && line.slice(m[0].length).trim() === '') fence = null; }
      else if (m && !(m[1][0] === '`' && line.indexOf('`', m[0].length) >= 0)) fence = { ch: m[1][0], len: m[1].length };
      ls = le + 1;
    }
    return !!fence;
  }
  function continueList(text, pos) {
    try {
      const t = str(text), p = num(pos, t.length, t.length);
      const ls = lineStart(t, p), le = lineEnd(t, p), line = t.slice(ls, le), g = listInfo(line);
      if (!g || p - ls < g.end || inFence(t, ls)) return null;
      const markLen = g.kind === 'bullet' ? 1 : g.marker.length + 1;
      if (!isSp(line.charCodeAt(g.indent + markLen))) return null;     // a lone "-" is not an item yet
      if (line.slice(g.end).trim() === '') return { text: t.slice(0, ls) + t.slice(le), pos: ls };
      const mk = g.kind === 'bullet' ? g.marker : (parseInt(g.marker, 10) + 1) + g.delim;
      const ins = '\n' + line.slice(0, g.indent) + mk + ' ' + (g.task !== null ? '[ ] ' : '');
      return { text: t.slice(0, p) + ins + t.slice(p), pos: p + ins.length };
    } catch (e) { errors++; return null; }
  }
  // A link or picture address typed into the toolbar, made safe to put between ( and ).
  const inParens = u => str(u).trim().replace(/[ \t\n\r]/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/</g, '%3C').replace(/>/g, '%3E');
  function link(text, a, b, url) {
    const t = str(text), [s, e] = range(t, a, b), u = inParens(url);
    if (s === e) { const ins = '[text](' + u + ')'; return { text: t.slice(0, s) + ins + t.slice(e), a: s + 1, b: s + 5 }; }
    const ins = '[' + t.slice(s, e) + '](' + u + ')', end = s + ins.length;
    return { text: t.slice(0, s) + ins + t.slice(e), a: u ? end : end - 1, b: u ? end : end - 1 };
  }
  function image(text, a, b, src, alt) {
    const t = str(text), [s, e] = range(t, a, b);
    const label = (alt !== undefined && alt !== null && str(alt) !== '' ? str(alt) : e > s ? t.slice(s, e) : 'image').replace(/\s+/g, ' ').replace(/[\\\[\]]/g, '\\$&');
    const ins = '![' + label + '](' + inParens(src) + ')';
    return { text: t.slice(0, s) + ins + t.slice(e), a: s + ins.length, b: s + ins.length };
  }
  // A block of text put in with blank lines around it, at the end of the selection.
  function insertBlock(t, p, blk) {
    const before = t.slice(0, p), after = t.slice(p);
    const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = !after ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    return { text: before + lead + blk + trail + after, at: p + lead.length, end: p + lead.length + blk.length + trail.length };
  }
  const TABLE = '| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |';
  function table(text, a, b) {
    const t = str(text), [, e] = range(t, a, b), r = insertBlock(t, e, TABLE);
    return { text: r.text, a: r.at + 2, b: r.at + 10 };
  }
  function rule(text, a, b) {
    const t = str(text), [, e] = range(t, a, b), r = insertBlock(t, e, '---');
    return { text: r.text, a: r.end, b: r.end };
  }
  function codeBlock(text, a, b) {
    const t = str(text), [s, e] = range(t, a, b);
    const ls = lineStart(t, s), le = lineEnd(t, e > s && t.charCodeAt(e - 1) === 10 ? e - 1 : e), body = t.slice(ls, le), lines = body.split('\n');
    const isFence = l => /^ {0,3}(`{3,}|~{3,})/.test(l);
    // already fenced (the fences are in the selection, or just around it): take them off
    if (lines.length >= 2 && isFence(lines[0]) && isFence(lines[lines.length - 1])) {
      const inside = lines.slice(1, -1).join('\n');
      return { text: t.slice(0, ls) + inside + t.slice(le), a: ls, b: ls + inside.length };
    }
    const pl = ls > 0 ? lineStart(t, ls - 1) : -1, nl = le < t.length ? lineEnd(t, le + 1) : -1;
    if (pl >= 0 && nl >= 0 && isFence(t.slice(pl, ls - 1)) && isFence(t.slice(le + 1, nl)) && inFence(t, ls)) {
      return { text: t.slice(0, pl) + body + t.slice(nl), a: pl, b: pl + body.length };
    }
    let longest = 0;
    for (let i = 0, r = 0; i < body.length; i++) { r = body[i] === '`' ? r + 1 : 0; if (r > longest) longest = r; }
    const f = '`'.repeat(Math.max(3, longest + 1));
    return { text: t.slice(0, ls) + f + '\n' + body + '\n' + f + t.slice(le), a: ls + f.length + 1, b: ls + f.length + 1 + body.length };
  }

  return {
    MAX, parse, render, plain, headings,
    bold, italic, strike, code, heading, bullets, numbers, tasks, quote, link, codeBlock, table, rule, image, continueList, indent: indentLines,
    // How many unexpected errors were caught and hidden (always 0 unless there is a bug).
    get errors() { return errors; }
  };
}
export default makeGuide();
