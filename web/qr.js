// QR codes, drawn here so there's nothing to install: Live's lobby shows one that opens the join page. Byte mode, error
// correction level M (a code still scans with 15% of it smudged or covered), versions 1 to 10 (up to 213 bytes; a join
// link is about 35). The steps are the standard's (ISO/IEC 18004): the bytes, Reed-Solomon error correction, the fixed
// patterns, the bits in their zigzag, and the mask that leaves the fewest shapes a camera could misread.

// Level M, by version: error correction codewords per block, and how many blocks.
const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
// Modules left for data and error correction once the fixed patterns are drawn.
const rawModules = v => {
  let n = (16 * v + 128) * v + 64;
  if (v >= 2) { const a = Math.floor(v / 7) + 2; n -= (25 * a - 10) * a - 55; if (v >= 7) n -= 36; }
  return n;
};
const dataCodewords = v => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];

// Reed-Solomon over GF(256) (x^8 + x^4 + x^3 + x^2 + 1): the divisor for `deg` codewords, and the remainder of the data.
const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
function divisor(deg) {
  const r = Array(deg).fill(0); r[deg - 1] = 1;
  for (let i = 0, root = 1; i < deg; i++, root = mul(root, 2)) for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
  return r;
}
function remainder(data, div) {
  const r = div.map(() => 0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); }
  return r;
}
// Where the small alignment squares go (their centers, on both axes).
function alignments(v) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, out = [6];
  for (let pos = v * 4 + 10; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

// The code's modules: rows of true (dark) and false (light).
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(String(text))];
  let v = 1;
  while (v <= 10 && 4 + (v < 10 ? 8 : 16) + bytes.length * 8 > dataCodewords(v) * 8) v++;
  if (v > 10) throw new Error('Too long for a QR code');
  // The bits: byte mode, the length, the bytes, then the end marker and padding.
  const bits = [], put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  const cap = dataCodewords(v) * 8;
  put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // Split into blocks, give each its error correction, and interleave them.
  const nb = BLOCKS[v], ecc = ECC[v], raw = Math.floor(rawModules(v) / 8), short = nb - raw % nb, len = Math.floor(raw / nb), div = divisor(ecc), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = data.slice(k, k + len - ecc + (i < short ? 0 : 1)); k += d.length;
    const e = remainder(d, div);
    if (i < short) d.push(0);
    blocks.push(d.concat(e));
  }
  const words = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== len - ecc || j >= short) words.push(b[i]); });

  const size = v * 4 + 17, m = Array.from({ length: size }, () => Array(size).fill(false)), fixed = m.map(r => r.map(() => false));
  const set = (x, y, dark) => { m[y][x] = dark; fixed[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = alignments(v), na = al.length;
  for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // Format bits (level M, then the mask) twice, and the dark module; version bits from version 7 on.
  const format = mask => {
    const d = mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  format(0);
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const dark = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, dark); set(c, a, dark); }
  }
  // The bits, two columns at a time from the bottom right, up then down, skipping the timing column.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if (!fixed[y][x] && i < words.length * 8) { m[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  const flip = mask => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (fixed[y][x]) continue;
      const k = [(x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2, x * y % 2 + x * y % 3, (x * y % 2 + x * y % 3) % 2, ((x + y) % 2 + x * y % 3) % 2][mask];
      if (k === 0) m[y][x] = !m[y][x];
    }
  };
  // Try all eight masks and keep the one with the lowest penalty.
  let best = 0, low = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    flip(mask); format(mask);
    const p = penalty(m);
    if (p < low) { low = p; best = mask; }
    flip(mask);
  }
  flip(best); format(best);
  return m;
}

// The standard's penalty: long runs of one color, 2 x 2 blocks, shapes like the corner squares, and too much of one color.
function penalty(m) {
  const n = m.length; let p = 0, dark = 0;
  const lines = [...m, ...m[0].map((_, x) => m.map(r => r[x]))];
  for (const line of lines) {
    for (let i = 0; i < n;) { let j = i; while (j < n && line[j] === line[i]) j++; if (j - i >= 5) p += 3 + (j - i - 5); i = j; }
    const pad = [0, 0, 0, 0, ...line.map(Number), 0, 0, 0, 0].join('');
    for (let k = pad.indexOf('10111010000'); k >= 0; k = pad.indexOf('10111010000', k + 1)) p += 40;
    for (let k = pad.indexOf('00001011101'); k >= 0; k = pad.indexOf('00001011101', k + 1)) p += 40;
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
  for (const r of m) for (const c of r) if (c) dark++;
  return p + (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
}

// The code as a picture (SVG), with a quiet `margin` of light modules around it.
export function qrSvg(text, margin = 2) {
  const m = qrMatrix(text), n = m.length, s = n + margin * 2;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n;) {
    if (!m[y][x]) { x++; continue; }
    let w = 1; while (x + w < n && m[y][x + w]) w++;
    d += 'M' + (x + margin) + ' ' + (y + margin) + 'h' + w + 'v1h-' + w + 'z'; x += w;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="#FFFFFF"/><path d="${d}" fill="#000000"/></svg>`;
}
// The same, ready for an <img src>.
export const qrSrc = (text, margin) => 'data:image/svg+xml,' + encodeURIComponent(qrSvg(text, margin));
