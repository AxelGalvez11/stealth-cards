// Sunset hills: a grainy landscape like the owner's reference (canvas V87): a steel-blue sky fading through mauve to
// pink, and hills against it, the left one in shade (maroon going to near-black green), the right one lit orange by a
// low sun, over a dark olive foreground. It's drawn as a small picture (PNG) at build time; the page stretches it and
// lays strong film grain over it (surfaces.mjs). Sizes are in units of the picture's height; x values given as
// fractions of the width. The colors were sampled from the reference.
import { deflateSync, crc32 } from 'node:zlib';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const smooth = t => t * t * (3 - 2 * t);
// Value noise, the same on every run.
const hash = (x, y) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const noise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
  return mix(mix(hash(xi, yi), hash(xi + 1, yi), u), mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
};
const fbm = (x, y, n = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < n; i++) { s += a * noise(x * f, y * f); f *= 2; a *= 0.5; } return s / (1 - 0.5 ** n); };
// A color ramp: [[at, '#hex'], ...] → t → [r, g, b].
const ramp = stops => {
  const s = stops.map(([t, c]) => [t, hex(c)]);
  return t => {
    if (t <= s[0][0]) return s[0][1];
    for (let i = 1; i < s.length; i++) if (t <= s[i][0]) { const k = smooth((t - s[i - 1][0]) / (s[i][0] - s[i - 1][0])); return s[i][1].map((c, j) => mix(s[i - 1][1][j], c, k)); }
    return s[s.length - 1][1];
  };
};

const SKY = ramp([[0, '#5A86AD'], [0.14, '#5E88AC'], [0.27, '#7C92AB'], [0.4, '#A19EAA'], [0.52, '#BFA6AA'], [0.64, '#DBAAA5'], [0.76, '#E4ACA0'], [1, '#E8AE9A']]);
// A hill: its peak (x as a fraction of the width), how steeply each side falls, how round the top is, how jagged the
// edge is, and its colors from the ridge down (`body`), with `lit` light washing over one flank near the top.
const hill = o => a => {
  const px = o.at[0] * a, body = ramp(o.body), lit = hex(o.lit);
  const ridge = X => {
    const d = X - px, soft = Math.sqrt(d * d + o.round * o.round) - o.round;
    return o.at[1] + (d < 0 ? o.left : o.right) * soft ** (o.bow || 1) + o.jag * (fbm(X * 7 + o.seed, o.seed, 5) - 0.5) + o.jag * 0.35 * (fbm(X * 40 + o.seed, 3.1, 3) - 0.5)
      + (o.roll || 0) * Math.sin(X * 9 + o.seed) + (o.bumps || []).reduce((t, [bx, by, bw]) => t + by * Math.exp(-(((X - bx * a) / bw) ** 2)), 0);
  };
  return (X, Y, h) => {
    const r = ridge(X), depth = Y - r, cover = clamp(depth * h * 0.8 + 0.5);
    if (cover <= 0) return null;
    // Streaks running down the slopes, and a little mottling.
    const streak = fbm(X * 10 + o.seed + 2 * Y, Y * 2.5, 4) - 0.5, mottle = fbm(X * 4 + o.seed, Y * 4 + 9, 3) - 0.5;
    let c = body(clamp((0.65 * (Y - o.at[1]) + 0.35 * depth) / o.fall));
    const side = o.litSide === 'right' ? clamp((X - px) / o.litWidth + 0.35) : clamp((px - X) / o.litWidth + 0.35);
    const glow = o.litAmount * side * Math.exp(-depth / o.litDepth) * (0.8 + 0.5 * streak);
    c = c.map((v, j) => mix(v, lit[j], clamp(glow)) * (1 + 0.1 * streak + 0.14 * mottle));
    return [c, cover];
  };
};

export const SCAPE = {
  // Wide pages: the shaded mountain peaks left of center, with a long shoulder down to the bottom left; the lit one
  // rises on the right, in front of it; a dark foreground rolls along the bottom left and lets the lit hill reach the
  // bottom right corner.
  wide: [
    hill({ at: [0.4, 0.56], left: 0.42, right: 0.62, bow: 0.72, round: 0.045, jag: 0.06, bumps: [[0.27, -0.035, 0.07]], seed: 5, fall: 0.42, body: [[0, '#7A3622'], [0.3, '#63301D'], [0.65, '#3A2211'], [1, '#10130A']], lit: '#C25A2C', litSide: 'right', litWidth: 0.28, litAmount: 0.5, litDepth: 0.14 }),
    hill({ at: [0.94, 0.63], left: 0.3, right: 0.2, bow: 0.7, round: 0.07, jag: 0.035, roll: 0.008, bumps: [[0.72, -0.03, 0.1]], seed: 11, fall: 0.34, body: [[0, '#DC8A3B'], [0.4, '#D67636'], [0.75, '#CC6134'], [1, '#A9542F']], lit: '#E89A46', litSide: 'left', litWidth: 0.4, litAmount: 0.15, litDepth: 0.1 }),
    hill({ at: [0.22, 0.9], left: 0.05, right: 0.16, bow: 1.1, round: 0.3, jag: 0.02, roll: 0.008, seed: 23, fall: 0.12, body: [[0, '#2B2913'], [0.5, '#1C1C0D'], [1, '#0C0F09']], lit: '#5A562B', litSide: 'right', litWidth: 1, litAmount: 0.55, litDepth: 0.06 })
  ],
  // Phones: the same scene, closer, filling the space under the answers.
  tall: [
    hill({ at: [0.36, 0.64], left: 0.5, right: 0.72, bow: 0.72, round: 0.04, jag: 0.045, bumps: [[0.12, -0.03, 0.06]], seed: 5, fall: 0.34, body: [[0, '#7A3622'], [0.3, '#63301D'], [0.65, '#3A2211'], [1, '#10130A']], lit: '#C25A2C', litSide: 'right', litWidth: 0.2, litAmount: 0.5, litDepth: 0.11 }),
    hill({ at: [1.02, 0.71], left: 0.42, right: 0.2, bow: 0.7, round: 0.06, jag: 0.028, roll: 0.006, bumps: [[0.72, -0.025, 0.08]], seed: 11, fall: 0.26, body: [[0, '#DC8A3B'], [0.4, '#D67636'], [0.75, '#CC6134'], [1, '#A9542F']], lit: '#E89A46', litSide: 'left', litWidth: 0.3, litAmount: 0.15, litDepth: 0.08 }),
    hill({ at: [0.12, 0.93], left: 0.06, right: 0.2, bow: 1.1, round: 0.2, jag: 0.015, roll: 0.006, seed: 23, fall: 0.1, body: [[0, '#2B2913'], [0.5, '#1C1C0D'], [1, '#0C0F09']], lit: '#5A562B', litSide: 'right', litWidth: 0.8, litAmount: 0.55, litDepth: 0.05 })
  ]
};



// The picture as PNG bytes: the sky, then each hill over it from back to front, with soft edges.
export function scapePng(w, h) {
  const a = w / h, hills = SCAPE[a >= 1 ? 'wide' : 'tall'].map(f => f(a)), row = w * 3 + 1, raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = x / h, Y = y / h;
      // The sky warms a little toward the low sun on the right.
      let c = SKY(Y), sun = Math.exp(-(((X - 0.95 * a) / 0.7) ** 2) - (((Y - 0.72) / 0.35) ** 2)) * 0.12;
      c = c.map((v, j) => mix(v, [246, 190, 150][j], sun));
      for (const f of hills) { const got = f(X, Y, h); if (got) c = c.map((v, j) => mix(v, got[0][j], got[1])); }
      for (let j = 0; j < 3; j++) raw[y * row + 1 + x * 3 + j] = clamp(Math.round(c[j]), 0, 255);
    }
    raw[y * row] = 1;
    for (let i = y * row + w * 3; i > y * row + 3; i--) raw[i] = (raw[i] - raw[i - 3] + 256) & 255;
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]);
    len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
export const scapeUri = (w, h) => 'data:image/png;base64,' + scapePng(w, h).toString('base64');
