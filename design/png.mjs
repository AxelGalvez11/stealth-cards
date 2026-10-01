// A small PNG reader (8-bit gray, RGB, palette and RGBA, no interlacing: what Chrome and ImageMagick write here), for the checks that
// compare pictures. Returns { width, height, rgb } with rgb a Uint8Array of width × height × 3 (transparency is laid over white).
import { inflateSync } from 'node:zlib';

export function readPng(buf) {
  if (buf.slice(1, 4).toString() !== 'PNG') throw new Error('not a PNG');
  let at = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0, palette = null, trns = null;
  const data = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at), name = buf.slice(at + 4, at + 8).toString(), body = buf.slice(at + 8, at + 8 + len);
    if (name === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (name === 'PLTE') palette = body;
    else if (name === 'tRNS') trns = body;
    else if (name === 'IDAT') data.push(body);
    else if (name === 'IEND') break;
    at += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error('only 8-bit PNGs without interlacing');
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!bpp) throw new Error('PNG color type ' + type);
  const raw = inflateSync(Buffer.concat(data)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0, b = y ? out[dst - stride + x] : 0, c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, al = 255;
    if (type === 3) { const k = out[i]; r = palette[k * 3]; g = palette[k * 3 + 1]; b = palette[k * 3 + 2]; if (trns && k < trns.length) al = trns[k]; }
    else if (type === 0) r = g = b = out[i];
    else if (type === 4) { r = g = b = out[i * 2]; al = out[i * 2 + 1]; }
    else { r = out[i * bpp]; g = out[i * bpp + 1]; b = out[i * bpp + 2]; if (type === 6) al = out[i * 4 + 3]; }
    rgb[i * 3] = (r * al + 255 * (255 - al)) / 255; rgb[i * 3 + 1] = (g * al + 255 * (255 - al)) / 255; rgb[i * 3 + 2] = (b * al + 255 * (255 - al)) / 255;
  }
  return { width: w, height: h, rgb };
}

// A picture as a small grid of colors (cols × rows block averages), to compare it with another: `distance` is the mean difference of
// their cells, from 0 (the same) to 255.
export function thumb({ width, height, rgb }, cols = 48, rows = 25) {
  const out = new Float32Array(cols * rows * 3);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const x0 = Math.floor(cx * width / cols), x1 = Math.floor((cx + 1) * width / cols), y0 = Math.floor(cy * height / rows), y1 = Math.floor((cy + 1) * height / rows);
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * width + x) * 3; r += rgb[i]; g += rgb[i + 1]; b += rgb[i + 2]; n++; }
    const o = (cy * cols + cx) * 3; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
  }
  return out;
}
export const distance = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };

// How far apart two pictures' colors are, as people see colors: the grids of `thumb` turned to CIELAB (sRGB, D65), and the mean over their cells
// of the distance between the two colors of a cell (ΔE76: about 2.3 is the least a person notices, 50 is an entirely different color).
const lab = (r, g, b) => {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }, R = lin(r), G = lin(g), B = lin(b);
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047), fy = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B), fz = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
export const labDistance = (a, b) => {
  let d = 0; const n = a.length / 3;
  for (let i = 0; i < a.length; i += 3) { const p = lab(a[i], a[i + 1], a[i + 2]), q = lab(b[i], b[i + 1], b[i + 2]); d += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
  return d / n;
};
