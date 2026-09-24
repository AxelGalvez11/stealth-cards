// Silk: a white sheet with soft folds and grain (the owner's references: a grainy dark fold, "but white, and subtle").
// Each design is a few folds, ridges that run along a curve, lit from the top left. They're drawn as a small smooth
// picture (PNG), and the page stretches it and lays film grain over it (surfaces.mjs). Sizes are in units of the
// picture's height; a curve's x values are fractions of its width, and its ends lie off the picture, so no seam shows.
import { deflateSync, crc32 } from 'node:zlib';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const bell = x => Math.exp(-x * x);
// A fold along a cubic curve: the side to its left (walking the curve) rises gently to the crest (wl wide), and the
// right side falls away steeply (wr), into shadow.
const fold = ({ p, wl, wr, A }) => a => {
  const P = p.map(([x, y]) => [x * a, y]), pts = [], N = 96;
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

export const SILK = {
  // Wide pages: one big fold rises from the bottom left under the answers, crests right of center, and falls back down
  // into the bottom right; a lower one lies along the bottom left, and a faint broad one crosses the top.
  wide: [
    fold({ p: [[0.1, 1.35], [0.45, 0.72], [0.72, 0.18], [1.02, 1.3]], wl: 0.34, wr: 0.16, A: 0.2 }),
    fold({ p: [[-0.3, 0.84], [0.2, 0.84], [0.35, 1.0], [0.55, 1.45]], wl: 0.2, wr: 0.1, A: 0.08 }),
    fold({ p: [[-0.3, 0.62], [0.25, 0.3], [0.7, 0.02], [1.3, -0.25]], wl: 0.3, wr: 0.16, A: 0.05 }),
    wave({ kx: 0.18, ky: -0.3, A: 0.05, ph: 0.6 })
  ],
  // Phones: two folds rise from the bottom left into the open space under the answers and crest at the right edge, the
  // lower one catching the light again under the first one's shadow; a faint, broad one runs behind the question.
  tall: [
    fold({ p: [[-0.6, 1.2], [0.2, 0.78], [0.9, 0.52], [1.9, 0.86]], wl: 0.2, wr: 0.1, A: 0.12 }),
    fold({ p: [[-0.6, 1.42], [0.25, 1.02], [0.9, 0.8], [1.9, 1.1]], wl: 0.14, wr: 0.08, A: 0.07 }),
    fold({ p: [[-0.8, 0.52], [0.3, 0.42], [0.8, 0.3], [1.8, 0.12]], wl: 0.24, wr: 0.14, A: 0.05 }),
    wave({ kx: 0.4, ky: -0.2, A: 0.03, ph: 0.2 })
  ]
};

// The picture as PNG bytes. Light comes from the top left; `b` is how much a spot gets next to flat cloth (1). Brighter
// spots fade toward white, darker ones ease toward `tmax` of the shadow color without clipping, so every edge stays soft.
export function silkPng(design, w, h, o = {}) {
  o = { t0: 0.16, tmax: 0.85, k1: 2.2, k2: 3, deep: [203, 208, 220], light: [-0.55, -0.5, 0.67], warp: 0.03, ...o };
  const a = w / h, parts = SILK[design].map(f => f(a)), z = new Float64Array(w * h);
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
