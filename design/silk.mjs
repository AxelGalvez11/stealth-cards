// Silk: a white sheet with soft folds or waves and grain (the owner's references: a grainy dark fold, "but white, and
// subtle"; then "make this fainter ... i want a wave pattern"). Each design is lit from the top left and made of folds
// (ridges along a curve), rows of waves, or layers of the same fold. It's drawn as a small smooth picture (PNG), and
// the page stretches it and lays film grain over it (surfaces.mjs). Sizes are in units of the picture's height; a
// curve's x values are fractions of its width, and its ends lie off the picture, so no seam shows.
import { deflateSync, crc32 } from 'node:zlib';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const bell = x => Math.exp(-x * x);
// A fold along a cubic curve: the side to its left (walking the curve) rises gently to the crest (wl wide), and the
// right side falls away steeply (wr), into shadow.
const fold = ({ p, wl, wr, A }) => a => {
  const P = p.map(([x, y]) => [x * a, y]), pts = [], N = 64;
  for (let i = 0; i <= N; i++) {
    const t = i / N, m = 1 - t, c = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t];
    pts.push([0, 1].map(k => c[0] * P[0][k] + c[1] * P[1][k] + c[2] * P[2][k] + c[3] * P[3][k]));
  }
  return (X, Y) => {
    let best = 1e9, side = 1;
    for (let i = 0; i < N; i++) {
      const [ax, ay] = pts[i], ex = pts[i + 1][0] - ax, ey = pts[i + 1][1] - ay;
      const t = clamp(((X - ax) * ex + (Y - ay) * ey) / (ex * ex + ey * ey)), qx = ax + ex * t - X, qy = ay + ey * t - Y, d = qx * qx + qy * qy;
      if (d < best) { best = d; side = ex * (Y - ay) - ey * (X - ax); }
    }
    return A * bell(Math.sqrt(best) / (side < 0 ? wl : wr));
  };
};
const wave = ({ kx, ky, A, ph = 0 }) => () => (X, Y) => A * Math.sin(2 * Math.PI * (kx * X + ky * Y) + ph);
// Waves: a row of parallel folds, like silk rippling. `angle` points across them (90 = they run side to side), `gap` is
// the space between crests, `bend` = [how far, how often, where] they sway, and `fade` = [how much, how often, where]
// each one swells and fades along its length, every fold at its own place.
const waves = ({ angle, gap, wl, wr, A, bend = [0, 0, 0], fade = [0, 0, 0] }) => a => {
  const c = Math.cos(angle * Math.PI / 180), s = Math.sin(angle * Math.PI / 180);
  return (X, Y) => {
    const dx = X - a / 2, dy = Y - 0.5, v = -dx * s + dy * c;
    const u = dx * c + dy * s + bend[0] * Math.sin(2 * Math.PI * bend[1] * v + bend[2]), m = Math.round(u / gap);
    let h = 0;
    for (let k = m - 1; k <= m + 1; k++) {
      const d = u - k * gap, swell = 1 - fade[0] + fade[0] * Math.sin(2 * Math.PI * fade[1] * v + fade[2] + 1.7 * k);
      h += A * swell * bell(d / (d < 0 ? wl : wr));
    }
    return h;
  };
};
// Layers: the same fold repeated, each copy moved by `step` (and its middle bent a little more by `spread`), like
// sheets of silk lying over each other.
const layers = ({ p, step, n, spread = 0, ...o }) => Array.from({ length: n }, (_, i) => {
  const j = i - (n - 1) / 2;
  return fold({ ...o, p: p.map(([x, y], q) => [x + step[0] * j + (q === 1 || q === 2 ? spread * j : 0), y + step[1] * j]) });
});

export const SILK = {
  // The fold (V84): one big fold like the owner's reference.
  fold: {
    // Wide pages: it rises from the bottom left under the answers, crests right of center, and falls back down into
    // the bottom right; a lower one lies along the bottom left, and a faint broad one crosses the top.
    wide: [
      fold({ p: [[0.1, 1.35], [0.45, 0.72], [0.72, 0.18], [1.02, 1.3]], wl: 0.34, wr: 0.16, A: 0.2 }),
      fold({ p: [[-0.3, 0.84], [0.2, 0.84], [0.35, 1.0], [0.55, 1.45]], wl: 0.2, wr: 0.1, A: 0.08 }),
      fold({ p: [[-0.3, 0.62], [0.25, 0.3], [0.7, 0.02], [1.3, -0.25]], wl: 0.3, wr: 0.16, A: 0.05 }),
      wave({ kx: 0.18, ky: -0.3, A: 0.05, ph: 0.6 })
    ],
    // Phones: two folds rise from the bottom left into the open space under the answers and crest at the right edge,
    // the lower one catching the light again under the first one's shadow; a faint, broad one runs behind the question.
    tall: [
      fold({ p: [[-0.6, 1.2], [0.2, 0.78], [0.9, 0.52], [1.9, 0.86]], wl: 0.2, wr: 0.1, A: 0.12 }),
      fold({ p: [[-0.6, 1.42], [0.25, 1.02], [0.9, 0.8], [1.9, 1.1]], wl: 0.14, wr: 0.08, A: 0.07 }),
      fold({ p: [[-0.8, 0.52], [0.3, 0.42], [0.8, 0.3], [1.8, 0.12]], wl: 0.24, wr: 0.14, A: 0.05 }),
      wave({ kx: 0.4, ky: -0.2, A: 0.03, ph: 0.2 })
    ]
  },
  // Swell: a few broad waves rolling side to side, like a calm sea.
  swell: {
    wide: [waves({ angle: 96, gap: 0.34, wl: 0.16, wr: 0.09, A: 0.06, bend: [0.09, 0.45, 1.2], fade: [0.3, 0.3, 0.4] })],
    tall: [waves({ angle: 100, gap: 0.27, wl: 0.13, wr: 0.07, A: 0.05, bend: [0.06, 0.8, 0.2], fade: [0.3, 0.5, 1.3] })]
  },
  // Flow: sheets of silk lying over each other in long S curves, rising from the bottom left to the top right.
  flow: {
    wide: layers({ p: [[-0.1, 1.1], [0.35, 0.35], [0.6, 1.05], [1.15, 0.2]], step: [0, 0.22], n: 6, spread: 0.02, wl: 0.1, wr: 0.05, A: 0.05 }),
    tall: layers({ p: [[-0.2, 1.05], [0.3, 0.55], [0.7, 0.75], [1.2, 0.25]], step: [0, 0.19], n: 7, spread: 0.03, wl: 0.08, wr: 0.04, A: 0.045 })
  },
  // Ripples: many fine waves across the whole page, like satin catching the light.
  ripple: {
    wide: [waves({ angle: 60, gap: 0.13, wl: 0.05, wr: 0.028, A: 0.02, bend: [0.06, 0.6, 0.4], fade: [0.25, 0.35, 0.2] })],
    tall: [waves({ angle: 66, gap: 0.11, wl: 0.042, wr: 0.024, A: 0.018, bend: [0.05, 0.8, 1.1], fade: [0.25, 0.4, 0.6] })]
  }
};


// The picture as PNG bytes. Light comes from the top left; `b` is how much a spot gets next to flat cloth (1). Brighter
// spots fade toward white, darker ones ease toward `tmax` of the shadow color without clipping, so every edge stays soft.
export function silkPng(design, w, h, o = {}) {
  o = { t0: 0.12, tmax: 0.55, k1: 2.2, k2: 3, deep: [203, 208, 220], light: [-0.55, -0.5, 0.67], warp: 0.03, ...o };
  const a = w / h, parts = SILK[design][a >= 1 ? 'wide' : 'tall'].map(f => f(a)), z = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // A slight wobble, so the folds don't look drawn with a ruler.
    const X0 = x / h, Y0 = y / h, X = X0 + o.warp * Math.sin(2.1 * Y0 + 0.5 + 1.3 * X0), Y = Y0 + o.warp * Math.sin(1.7 * X0 + 0.2);
    let s = 0; for (const p of parts) s += p(X, Y);
    z[y * w + x] = s;
  }
  const n = Math.hypot(...o.light), L = o.light.map(v => v / n), row = w * 3 + 1, raw = Buffer.alloc(row * h);
  const at = (x, y) => z[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const zx = (at(x + 1, y) - at(x - 1, y)) * h / 2, zy = (at(x, y + 1) - at(x, y - 1)) * h / 2;
      const b = (-zx * L[0] - zy * L[1] + L[2]) / Math.hypot(zx, zy, 1) / L[2];
      const t = clamp(b >= 1 ? o.t0 * Math.exp(-o.k2 * (b - 1)) : o.t0 + (o.tmax - o.t0) * (1 - Math.exp(-o.k1 * (1 - b))));
      for (let c = 0; c < 3; c++) raw[y * row + 1 + x * 3 + c] = Math.round(255 - (255 - o.deep[c]) * t);
    }
    // PNG's "Sub" filter: each byte kept as the change from the pixel to its left, which a smooth picture squeezes well.
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
export const silkUri = (design, w, h, o) => 'data:image/png;base64,' + silkPng(design, w, h, o).toString('base64');
