import { A, R, f, di, mo, motifName, lay, focal, icon, face, grain } from './kit.js';

// Topographic
// Contour maps drawn in code: a seeded height field (summed hills + gradient noise, domain-warped) is traced with
// marching squares, simplified, and written as compact SVG paths. Every 5th line is an index contour. Each map is
// computed once per run (cached by size and seed).
const TP_F = "Barlow, 'Helvetica Neue', system-ui, sans-serif";
const TP_M = "'DM Mono', ui-monospace, monospace";
const PAPER = '#F3EFE5', INK = '#3A342C', UMBER = '#86653F', WATER = '#5D8DB0';

// ---------- height field ----------
const hash = (x, y, s) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(s, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function noise(x, y, s) { // gradient noise, about -0.7..0.7
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const g = (i, j, dx, dy) => { const a = hash(ix + i, iy + j, s) * 6.2831853; return Math.cos(a) * dx + Math.sin(a) * dy; };
  const a = g(0, 0, fx, fy), b = g(1, 0, fx - 1, fy), c = g(0, 1, fx, fy - 1), d = g(1, 1, fx - 1, fy - 1), u = fade(fx), v = fade(fy);
  return a + u * (b - a) + v * (c - a + u * (a - b - c + d));
}
const fbm = (x, y, s, o = 4) => { let t = 0, a = 0.5, q = 1; for (let k = 0; k < o; k++, a *= 0.5, q *= 2.03) t += a * noise(x * q + k * 17.1, y * q - k * 9.7, s + k * 31); return t; };
const ridged = (x, y, s, o = 4) => { let t = 0, a = 0.5, q = 1; for (let k = 0; k < o; k++, a *= 0.5, q *= 2.1) { const n = 1 - Math.abs(noise(x * q + k * 5.3, y * q + k * 3.1, s + k * 17) * 1.5); t += a * n * n; } return t; };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// T = { seed, ns: noise size in px, amp, warp, ridge, hills: [[x, y, r, h, aspect = 1, angle = 0, kind = 0]] }
// kind 0 = rounded hill, 1 = mesa (flat top, cliff rim), 2 = volcano (cone, crater, radial gullies)
function field(T) {
  const H = T.hills.map(([x, y, r, h, ax = 1, an = 0, kind = 0]) => ({ x, y, r, h, ax, c: Math.cos(an), s: Math.sin(an), kind }));
  const ns = T.ns, sd = T.seed, wp = T.warp || 0;
  return (x, y) => {
    const u = x / ns, v = y / ns;
    const wx = x + wp * ns * fbm(u + 5.2, v + 1.3, sd + 7, 3), wy = y + wp * ns * fbm(u - 3.7, v + 8.1, sd + 13, 3);
    let z = 0;
    for (const p of H) {
      const dx = wx - p.x, dy = wy - p.y, qx = (dx * p.c + dy * p.s) / (p.r * p.ax), qy = (dy * p.c - dx * p.s) / p.r, d2 = qx * qx + qy * qy;
      if (p.kind === 1) { const g = Math.exp(-d2 / 2); z += p.h * (0.8 * sstep(0.3, 0.46, g) + 0.2 * g); }
      else if (p.kind === 2) { const d = Math.sqrt(d2) + 1e-9, dc = 0.45, rim = Math.exp(-1.3 * dc); z += p.h * ((d > dc ? Math.exp(-1.3 * d) : rim - 0.09 * (1 - (d / dc) ** 2)) + 0.04 * noise(qx / d * 2.6 + 9, qy / d * 2.6 + d * 1.5, sd + 3) * Math.min(1, d * 3)); }
      else z += p.h * Math.exp(-d2 / 2);
    }
    return z + (T.amp || 0) * fbm(wx / ns, wy / ns, sd, T.oct || 4) + (T.ridge ? T.ridge * ridged(wx / ns, wy / ns, sd + 5) : 0);
  };
}

// ---------- marching squares ----------
// The grid runs one cell past every edge, so lines that leave the picture close outside it (and can be filled).
function grid(F, w, h, cs) {
  const x0 = -cs, y0 = -cs, nx = Math.ceil((w + 2 * cs) / cs), ny = Math.ceil((h + 2 * cs) / cs), S = nx + 1, v = new Float64Array(S * (ny + 1));
  let lo = Infinity, hi = -Infinity;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const z = F(x0 + i * cs, y0 + j * cs); v[j * S + i] = z; if (z < lo) lo = z; if (z > hi) hi = z; }
  for (let q = 0; q < v.length; q++) v[q] = (v[q] - lo) / (hi - lo);
  return { v, nx, ny, S, cs, x0, y0 };
}
const withV = (G, fn) => ({ ...G, v: G.v.map((z, q) => fn(z, G.x0 + (q % G.S) * G.cs, G.y0 + Math.floor(q / G.S) * G.cs)) });
const at = (G, x, y) => { // bilinear read of the grid
  const gx = Math.min(G.nx - 1e-6, Math.max(0, (x - G.x0) / G.cs)), gy = Math.min(G.ny - 1e-6, Math.max(0, (y - G.y0) / G.cs)), i = Math.floor(gx), j = Math.floor(gy), u = gx - i, t = gy - j, S = G.S, v = G.v;
  return (v[j * S + i] * (1 - u) + v[j * S + i + 1] * u) * (1 - t) + (v[j * S + S + i] * (1 - u) + v[j * S + S + i + 1] * u) * t;
};
// edges: 0 top, 1 right, 2 bottom, 3 left; corners a (top-left) b c d, clockwise
const SEG = { 1: [[2, 3]], 2: [[1, 2]], 3: [[3, 1]], 4: [[0, 1]], 6: [[0, 2]], 7: [[3, 0]], 8: [[3, 0]], 9: [[0, 2]], 11: [[0, 1]], 12: [[3, 1]], 13: [[1, 2]], 14: [[2, 3]] };
// Lines at level L, as chains with the higher side on the right (so every outline winds the same way).
function iso(G, L) {
  const { v, nx, ny, S, cs, x0, y0 } = G, P = new Map(), nxt = new Map(), inc = new Set();
  const X = i => x0 + i * cs, Y = j => y0 + j * cs;
  const hk = (i, j) => { const k = 2 * (j * S + i); if (!P.has(k)) { const a = v[j * S + i], b = v[j * S + i + 1]; P.set(k, [X(i) + cs * (L - a) / (b - a), Y(j)]); } return k; };
  const vk = (i, j) => { const k = 2 * (j * S + i) + 1; if (!P.has(k)) { const a = v[j * S + i], b = v[j * S + S + i]; P.set(k, [X(i), Y(j) + cs * (L - a) / (b - a)]); } return k; };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = v[j * S + i], b = v[j * S + i + 1], c = v[j * S + S + i + 1], d = v[j * S + S + i];
    const id = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
    if (id === 0 || id === 15) continue;
    const m = (a + b + c + d) / 4 > L;
    const segs = SEG[id] || (id === 10 ? (m ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]]) : (m ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]]));
    for (const [e1, e2] of segs) {
      const ek = e => (e === 0 ? hk(i, j) : e === 1 ? vk(i + 1, j) : e === 2 ? hk(i, j + 1) : vk(i, j));
      let k1 = ek(e1), k2 = ek(e2);
      const q = e1 === 0 ? (a > L ? [X(i), Y(j)] : [X(i + 1), Y(j)]) : e1 === 1 ? (b > L ? [X(i + 1), Y(j)] : [X(i + 1), Y(j + 1)]) : e1 === 2 ? (d > L ? [X(i), Y(j + 1)] : [X(i + 1), Y(j + 1)]) : (a > L ? [X(i), Y(j)] : [X(i), Y(j + 1)]);
      const p1 = P.get(k1), p2 = P.get(k2);
      if ((p2[0] - p1[0]) * (q[1] - p1[1]) - (p2[1] - p1[1]) * (q[0] - p1[0]) < 0) [k1, k2] = [k2, k1];
      nxt.set(k1, k2); inc.add(k2);
    }
  }
  const PW = nx * cs, PH = ny * cs;
  const per = (k, [x, y]) => { const n = k >> 1, i = n % S, j = (n - i) / S; return k & 1 ? (i === 0 ? 2 * PW + PH + (y0 + PH - y) : PW + (y - y0)) : (j === 0 ? x - x0 : PW + PH + (x0 + PW - x)); };
  const walk = k => { const c = [P.get(k)]; let cur = k; while (nxt.has(cur)) { const n = nxt.get(cur); nxt.delete(cur); c.push(P.get(n)); cur = n; } return [c, cur]; };
  const out = [];
  for (const k of [...nxt.keys()]) if (!inc.has(k) && nxt.has(k)) { const [c, k1] = walk(k); out.push({ open: true, pts: c, s0: per(k, c[0]), s1: per(k1, c[c.length - 1]) }); }
  for (const k of [...nxt.keys()]) if (nxt.has(k)) out.push({ open: false, pts: walk(k)[0] });
  return out;
}
// The area above L as closed outlines: open chains are joined clockwise along the (hidden) grid border.
function region(G, chains, L) {
  const { nx, ny, cs, x0, y0 } = G, PW = nx * cs, PH = ny * cs, PER = 2 * (PW + PH);
  const CR = [[0, [x0, y0]], [PW, [x0 + PW, y0]], [PW + PH, [x0 + PW, y0 + PH]], [2 * PW + PH, [x0, y0 + PH]]];
  const dist = (a, b) => ((b - a) % PER + PER) % PER, open = chains.filter(c => c.open), used = new Set(), loops = [];
  for (const c0 of open) {
    if (used.has(c0)) continue;
    const loop = [];
    for (let c = c0, g = 0; c && g < 500; g++) {
      used.add(c); loop.push(...c.pts);
      let nb = null, bd = Infinity;
      for (const o of open) { const dd = dist(c.s1, o.s0); if (dd < bd) { bd = dd; nb = o; } }
      for (const [s, p] of CR.map(([s, p]) => [dist(c.s1, s), p]).sort((x, y) => x[0] - y[0])) if (s > 0 && s < bd) loop.push(p);
      if (nb === c0) break;
      c = nb;
    }
    loops.push(loop);
  }
  if (!open.length && G.v[0] > L) loops.push(CR.map(c => c[1]));
  for (const c of chains) if (!c.open) loops.push(c.pts);
  return loops;
}
function simplify(P, tol) { // Douglas-Peucker
  if (P.length < 3) return P;
  const keep = new Uint8Array(P.length), st = [[0, P.length - 1]];
  keep[0] = keep[P.length - 1] = 1;
  while (st.length) {
    const [a, b] = st.pop(), [ax, ay] = P[a], [bx, by] = P[b], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy);
    let md = 0, mi = -1;
    for (let k = a + 1; k < b; k++) { const d = l ? Math.abs(dx * (ay - P[k][1]) - dy * (ax - P[k][0])) / l : Math.hypot(P[k][0] - ax, P[k][1] - ay); if (d > md) { md = d; mi = k; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return P.filter((_, k) => keep[k]);
}
const chaikin = (P, it = 2) => { for (let k = 0; k < it; k++) { const Q = [P[0]]; for (let q = 0; q < P.length - 1; q++) { const [a, b] = [P[q], P[q + 1]]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } Q.push(P[P.length - 1]); P = Q; } return P; };
const chaikinC = (P, it = 3) => { for (let k = 0; k < it; k++) { const Q = [], n = P.length; for (let q = 0; q < n; q++) { const a = P[q], b = P[(q + 1) % n]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } P = Q; } return P; };
// compact path data: rounded to 0.1, relative moves after the first point
const num = t => { const s = String(t / 10); return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? '-' + s.slice(2) : s; };
const sep = s => (s[0] === '-' ? s : ' ' + s);
function poly(P, closed) {
  let n = P.length;
  if (closed && n > 2 && Math.abs(P[0][0] - P[n - 1][0]) < 0.05 && Math.abs(P[0][1] - P[n - 1][1]) < 0.05) n--;
  let s = '', X0 = 0, Y0 = 0, first = true;
  for (let q = 0; q < n; q++) {
    const X = Math.round(P[q][0] * 10), Y = Math.round(P[q][1] * 10);
    if (q === 0) s = 'M' + num(X) + sep(num(Y));
    else { const dx = X - X0, dy = Y - Y0; if (!dx && !dy) continue; s += (first ? 'l' + num(dx) : sep(num(dx))) + sep(num(dy)); first = false; }
    X0 = X; Y0 = Y;
  }
  return s + (closed ? 'z' : '');
}
const lines = cs => cs.map(c => poly(c.pts, !c.open)).join('');
const loopsD = ls => ls.map(l => poly(l, true)).join('');

const MEMO = new Map();
const memo = (k, fn) => { if (!MEMO.has(k)) MEMO.set(k, fn()); return MEMO.get(k); };
// A contour map: n intervals over the height range, simplified with tolerance tol (px).
const plen = P => P.reduce((t, p, q) => (q ? t + Math.hypot(p[0] - P[q - 1][0], p[1] - P[q - 1][1]) : 0), 0);
function contour(T, w, h, { cs = 6, n = 24, tol = 0.35, edit, minLoop = 16 } = {}) {
  let G = grid(field(T), w, h, cs);
  if (edit) G = edit(G);
  const lv = [];
  for (let k = 1; k < n; k++) {
    const chains = iso(G, k / n).map(c => ({ ...c, pts: simplify(c.pts, tol) })).filter(c => c.open || (c.pts.length > 3 && plen(c.pts) > minLoop)); // no tiny blips
    lv.push({ k, idx: k % 5 === 0, chains });
  }
  return { G, lv, n };
}
// fill the area above level L (0..1) of grid G
const fillAbove = (G, L, tol = 0.4) => loopsD(region(G, iso(G, L).map(c => ({ ...c, pts: simplify(c.pts, tol) })), L));
const svgWrap = (w, h, inner, css = '') => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0; display: block; overflow: hidden; ${css}">${inner}</svg>`;
// s = { c: line color, sw, op, isw, iop }
function strokes(M, s, keep = () => true) {
  const reg = M.lv.filter(l => !l.idx), ix = M.lv.filter(l => l.idx), pick = ls => ls.map(l => lines(l.chains.filter(c => keep(c, l)))).join('');
  return `<g fill="none" stroke="${s.c}" stroke-linejoin="round" stroke-linecap="round"><path d="${pick(reg)}" stroke-width="${s.sw}" stroke-opacity="${s.op}"/><path d="${pick(ix)}" stroke-width="${s.isw}" stroke-opacity="${s.iop}"/></g>`;
}
// local highest points of the grid (for spot heights and summit markers)
function peaks(G, r = 6, min = 0.5) {
  const { v, nx, ny, S, cs, x0, y0 } = G, out = [];
  for (let j = r; j <= ny - r; j++) for (let i = r; i <= nx - r; i++) {
    const z = v[j * S + i]; if (z < min) continue;
    let top = true;
    for (let b = -r; b <= r && top; b++) for (let a = -r; a <= r; a++) if ((a || b) && v[(j + b) * S + i + a] >= z) { top = false; break; }
    if (top) out.push({ x: x0 + i * cs, y: y0 + j * cs, z });
  }
  return out.sort((p, q) => q.z - p.z);
}
const peakNear = (G, cx, cy, rad) => { let b = null; for (let q = 0; q < G.v.length; q++) { const x = G.x0 + (q % G.S) * G.cs, y = G.y0 + Math.floor(q / G.S) * G.cs; if (Math.hypot(x - cx, y - cy) < rad && (!b || G.v[q] > b.z)) b = { x, y, z: G.v[q] }; } return b; };
// places along index lines for elevation numbers: straight enough, inside ok(), spread out
function labelSpots(M, ok, { gap = 150, max = 8, len = 26, seed = 1 } = {}) {
  const cand = [];
  for (const l of M.lv) if (l.idx) for (const c of l.chains) {
    const P = c.pts, cum = [0];
    for (let q = 1; q < P.length; q++) cum.push(cum[q - 1] + Math.hypot(P[q][0] - P[q - 1][0], P[q][1] - P[q - 1][1]));
    const pos = s => { let q = 1; while (q < P.length - 1 && cum[q] < s) q++; const t = (s - cum[q - 1]) / (cum[q] - cum[q - 1] || 1); return [P[q - 1][0] + (P[q][0] - P[q - 1][0]) * t, P[q - 1][1] + (P[q][1] - P[q - 1][1]) * t]; };
    for (let s = len; s < cum[cum.length - 1] - len; s += 18) {
      const p = pos(s), a = pos(s - len / 2), b = pos(s + len / 2), cx = b[0] - a[0], cy = b[1] - a[1], cl = Math.hypot(cx, cy);
      if (!cl || Math.abs(cx * (a[1] - p[1]) - cy * (a[0] - p[0])) / cl > 0.9 || !ok(p[0], p[1])) continue;
      let ang = Math.atan2(cy, cx) * 57.29578; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      cand.push({ x: p[0], y: p[1], ang, k: l.k, r: hash(R(p[0]), R(p[1]), seed) });
    }
  }
  const out = [];
  for (const c of cand.sort((p, q) => p.r - q.r)) { if (out.some(o => Math.hypot(o.x - c.x, o.y - c.y) < gap)) continue; out.push(c); if (out.length >= max) break; }
  return out;
}
const halo = (fill, bg, fs, fam = TP_M) => `font-family="${fam}" font-size="${fs}" fill="${fill}" stroke="${bg}" stroke-width="${f(fs * 0.36)}" stroke-linejoin="round" paint-order="stroke"`;

// ---------- map furniture ----------
// a small compass rose: long north-south points, short east-west, each split light and dark
const rose = (c = INK, bg = PAPER) => `<svg width="100%" viewBox="0 0 48 66" aria-hidden="true" style="display: block; overflow: visible;"><text x="24" y="9" text-anchor="middle" font-family="${TP_F}" font-weight="600" font-size="10.5" fill="${c}">N</text><circle cx="24" cy="40" r="15" fill="none" stroke="${c}" stroke-width=".7" stroke-opacity=".55"/><circle cx="24" cy="40" r="12.6" fill="none" stroke="${c}" stroke-width=".5" stroke-opacity=".35" stroke-dasharray=".6 1.6"/><g stroke="${c}" stroke-width=".7" stroke-linejoin="round"><path d="M24 15L27.2 40H24z" fill="${bg}"/><path d="M24 15L20.8 40H24z" fill="${c}"/><path d="M24 65L20.8 40H24z" fill="${bg}"/><path d="M24 65L27.2 40H24z" fill="${c}"/><path d="M36 40L24 37.6V40z" fill="${c}"/><path d="M36 40L24 42.4V40z" fill="${bg}"/><path d="M12 40L24 42.4V40z" fill="${c}"/><path d="M12 40L24 37.6V40z" fill="${bg}"/></g></svg>`;
// a scale bar: 0 500 1000 m
const scaleBar = (c = INK, bg = PAPER) => `<svg width="100%" viewBox="0 0 132 24" aria-hidden="true" style="display: block; overflow: visible;"><g font-family="${TP_M}" font-size="7.5" fill="${c}" fill-opacity=".8" text-anchor="middle"><text x="4" y="8">0</text><text x="64" y="8">500</text><text x="124" y="8">1000 m</text></g><g stroke="${c}" stroke-width=".7"><path d="M4 12h30v3.6H4z" fill="${c}"/><path d="M34 12h30v3.6H34z" fill="${bg}"/><path d="M64 12h30v3.6H64z" fill="${c}"/><path d="M94 12h30v3.6H94z" fill="${bg}"/></g></svg>`;
const DEG = (d, m, h) => `${d}°${String(m).padStart(2, '0')}′${h}`;

// ---------- study background: a printed map, paper and ink ----------
// The study card sits in the middle, so the high ground is at the edges and the valley floor is under the card.
const BG = {
  wide: (w, h) => ({ T: { seed: 11, ns: 420, amp: 0.55, warp: 0.55, hills: [[0.05 * w, 0.2 * h, 0.3 * h, 1.05, 1.2, 0.5], [0.13 * w, 0.95 * h, 0.24 * h, 0.7, 1.5, -0.3], [0.95 * w, 0.18 * h, 0.34 * h, 1.15, 1.1, -0.6], [0.99 * w, 0.8 * h, 0.22 * h, 0.8], [0.5 * w, -0.14 * h, 0.2 * h, 0.55, 3.2], [0.62 * w, 1.13 * h, 0.2 * h, 0.5, 3.4], [0.16 * w, 0.56 * h, 0.07 * h, -0.35], [0.5 * w, 0.5 * h, 0.3 * h, -0.2, 1.8]] },
    n: 30, cs: 7, lake: [0.16 * w, 0.56 * h, 120], card: [300, 140, 1140, 770], label: 10, grid: 180, rose: [46, 706, 54], sb: [112, 770, 132], sw: 0.75, isw: 1.35 }),
  mid: (w, h) => ({ T: { seed: 23, ns: 300, amp: 0.55, warp: 0.6, hills: [[0.06 * w, 0.08 * h, 0.26 * h, 1.05, 1.3, 0.4], [0.97 * w, 0.93 * h, 0.28 * h, 1.1, 1.2, 0.8], [0.93 * w, 0.06 * h, 0.2 * h, 0.75], [0.04 * w, 0.95 * h, 0.2 * h, 0.6], [0.74 * w, 0.14 * h, 0.06 * h, -0.3], [0.5 * w, 0.5 * h, 0.3 * h, -0.2, 1.4]] },
    n: 26, cs: 5, lake: [0.74 * w, 0.14 * h, 70], card: [70, 180, 570, 520], label: 6, grid: 160, rose: [28, 588, 44], sb: [86, 646, 116], sw: 0.7, isw: 1.25 }),
  tall: (w, h) => ({ T: { seed: 37, ns: 260, amp: 0.6, warp: 0.6, hills: [[0.1 * w, 0.04 * h, 0.2 * h, 1.0, 1.4, 0.3], [0.95 * w, 0.97 * h, 0.2 * h, 1.05, 1.2], [0.9 * w, 0.12 * h, 0.12 * h, 0.7], [0.05 * w, 0.9 * h, 0.14 * h, 0.7]] },
    n: 28, cs: 5, sw: 0.7, isw: 1.25 }),
  tiny: (w, h) => ({ T: { seed: 41, ns: 150, amp: 0.55, warp: 0.6, hills: [[0.15 * w, 0.2 * h, 0.35 * h, 1.0], [0.95 * w, 0.9 * h, 0.4 * h, 1.0], [0.8 * w, 0.1 * h, 0.2 * h, 0.5]] },
    n: 16, cs: 4, sw: 0.6, isw: 1.05 }),
};
function studyMap(w, h) {
  const L = lay(w, h), D = BG[L](w, h), [lx, ly, lr] = D.lake || [0, 0, 0];
  let lw = 0;
  const M = contour(D.T, w, h, {
    cs: D.cs, n: D.n, tol: 0.3,
    // the lake: flat water up to a level between two lines, so no lines are drawn in it
    edit: D.lake ? G => { let mn = 1; for (let q = 0; q < G.v.length; q++) { const x = G.x0 + (q % G.S) * G.cs, y = G.y0 + Math.floor(q / G.S) * G.cs; if (Math.hypot(x - lx, y - ly) < lr * 0.5) mn = Math.min(mn, G.v[q]); } lw = (Math.ceil(mn * D.n - 0.12) + 0.62) / D.n; D.raw = G; return withV(G, (z, x, y) => (Math.hypot(x - lx, y - ly) < lr ? Math.max(z, lw) : z)); } : null,
  });
  const G = M.G, n = D.n, e = k => 1600 + k * 40;
  let fills = '', water = '', marks = '', txt = '';
  // woodland (pale green) below the tree line, and faint snow on the highest ground
  const veg = withV(G, (z, x, y) => Math.min(fbm(x / (D.T.ns * 0.5), y / (D.T.ns * 0.5), 77, 3) - 0.02, (0.44 - z) * 0.6));
  fills += `<path d="${fillAbove(veg, 0, 0.5)}" fill="#CCDBBB" fill-opacity=".42"/>`;
  fills += `<path d="${fillAbove(G, 0.86, 0.4)}" fill="#FFFFFF" fill-opacity=".5"/>`;
  if (D.lake) {
    const lake = withV(D.raw, (z, x, y) => (Math.hypot(x - lx, y - ly) < lr ? lw - z : -1));
    const shore = region(lake, iso(lake, 0), 0).map(l => simplify(chaikinC(l.slice(0, -1)), 0.2)); // rounded shoreline
    water += `<path d="${loopsD(shore)}" fill="#CFE0E8" stroke="${WATER}" stroke-width="${f(D.sw * 1.1)}" stroke-opacity=".75"/>`;
    const bot = Math.max(...shore.flat().map(p => p[1]));
    txt += `<text x="${f(lx)}" y="${f(bot + (L === 'wide' ? 15 : 13))}" text-anchor="middle" ${halo(WATER, PAPER, L === 'wide' ? 10.5 : 9.5, TP_F)} font-style="italic" font-weight="500" letter-spacing=".03em">Lucida Lake</text>`;
  }
  // streams: follow the slope down from a few springs until the water, the edge, or a hollow
  const springs = { wide: [[0.06, 0.34], [0.9, 0.42], [0.3, 0.9], [0.82, 0.08]], mid: [[0.92, 0.3], [0.1, 0.35], [0.4, 0.95]], tall: [[0.2, 0.1], [0.8, 0.88]], tiny: [] }[L];
  for (const [sx, sy] of springs) {
    let x = sx * w, y = sy * h, ux = 0, uy = 0; const pts = [[x, y]], zs = [];
    for (let s = 0; s < 500; s++) {
      const e2 = 2, gx = at(G, x + e2, y) - at(G, x - e2, y), gy = at(G, x, y + e2) - at(G, x, y - e2), gl = Math.hypot(gx, gy);
      if (gl < 1e-6 || x < -6 || y < -6 || x > w + 6 || y > h + 6) break;
      let mx = -gx / gl, my = -gy / gl;
      if (s) { mx = ux * 0.7 + mx * 0.3; my = uy * 0.7 + my * 0.3; const ml = Math.hypot(mx, my); mx /= ml; my /= ml; }
      ux = mx; uy = my; x += mx * 3; y += my * 3; pts.push([x, y]); zs.push(at(G, x, y));
      if (s > 30 && zs[s] > zs[s - 24] - 0.002) break;
      if (D.lake && Math.hypot(x - lx, y - ly) < lr && at(G, x, y) <= lw + 0.001) break;
    }
    if (pts.length > 14) water += `<path d="${poly(simplify(chaikin(pts), 0.45), false)}" fill="none" stroke="${WATER}" stroke-width="${f(D.sw * 1.15)}" stroke-opacity=".7" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const inBox = (x, y, [x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1;
  const noGo = D.rose ? [[D.rose[0] - 30, D.rose[1] - 24, D.sb[0] + D.sb[2] + 30, D.sb[1] + 40]] : [];
  const ok = D.card ? (x, y) => x > 76 && y > 100 && x < w - 76 && y < h - 70 && !inBox(x, y, D.card) && !noGo.some(b => inBox(x, y, b)) : () => false;
  // elevation numbers on the index lines, spot heights on the tops
  const spots = D.card ? labelSpots(M, ok, { gap: L === 'wide' ? 170 : 130, max: D.label, seed: 3 }) : [];
  const tops = D.card ? peaks(G, 7, 0.62).filter(p => ok(p.x, p.y) && !spots.some(s => Math.hypot(s.x - p.x, s.y - p.y) < 70)).slice(0, L === 'wide' ? 4 : 2) : [];
  const skip = (c, l) => !(D.lake && l.k / n < lw + 0.02 && !c.open && c.pts.every(([x, y]) => Math.hypot(x - lx, y - ly) < lr));
  const lab = spots.map(s => `<text transform="translate(${f(s.x)} ${f(s.y)}) rotate(${f(s.ang)})" text-anchor="middle" dy=".34em">${e(s.k)}</text>`).join('');
  txt += lab ? `<g ${halo(UMBER, PAPER, L === 'wide' ? 9 : 8)} fill-opacity=".95" letter-spacing=".02em">${lab}</g>` : '';
  txt += tops.map(p => `<path d="M${f(p.x)} ${f(p.y - 3.2)}l3.3 5.6h-6.6z" fill="${INK}" fill-opacity=".75"/><text x="${f(p.x + 6)}" y="${f(p.y + 2.4)}" ${halo(INK, PAPER, L === 'wide' ? 9 : 8)} fill-opacity=".8">${R(1600 + p.z * n * 40)}</text>`).join('');
  // a faint survey grid: crosses at the grid corners, ticks and coordinates at the edges
  if (D.grid) {
    const gs = D.grid, cols = [], rows = [];
    for (let x = gs; x < w - 20; x += gs) cols.push(x);
    for (let y = gs / 2; y < h - 20; y += gs) rows.push(y);
    let cr = '';
    for (const x of cols) for (const y of rows) if (!(D.card && x > D.card[0] - 10 && x < D.card[2] + 10 && y > D.card[1] - 10 && y < D.card[3] + 10)) cr += `M${x - 5} ${y}h10M${x} ${y - 5}v10`;
    const tk = cols.map(x => `M${x} 0v7M${x} ${h}v-7`).join('') + rows.map(y => `M0 ${y}h7M${w} ${y}h-7`).join('');
    marks += `<path d="${cr}${tk}" fill="none" stroke="${INK}" stroke-width=".7" stroke-opacity=".32"/>`;
    const fs = L === 'wide' ? 8.5 : 7.5;
    txt += `<g ${halo(INK, PAPER, fs)} fill-opacity=".62" letter-spacing=".04em">` + rows.map((y, r) => `<text x="10" y="${y - 4}">${DEG(38, 35 - r, 'N')}</text><text x="${w - 10}" y="${y - 4}" text-anchor="end">${DEG(38, 35 - r, 'N')}</text>`).join('') +
      cols.filter(x => L !== 'wide' || x < 480 || x > 960).map((x, c) => `<text x="${x + 4}" y="${h - 9}">${DEG(119, 52 - cols.indexOf(x), 'W')}</text>`).join('') + '</g>';
  }
  const svg = svgWrap(w, h, fills + strokes(M, { c: UMBER, sw: D.sw, op: 0.36, isw: D.isw, iop: 0.6 }, skip) + water + marks + txt);
  const furn = D.rose ? A(`left: ${D.rose[0]}px; top: ${D.rose[1]}px; width: ${D.rose[2]}px; opacity: .78;`, rose()) + A(`left: ${D.sb[0]}px; top: ${D.sb[1]}px; width: ${D.sb[2]}px; opacity: .75;`, scaleBar()) : '';
  return svg + furn;
}

// ---------- deck covers: six terrains, one palette each ----------
const TP_C = [
  { name: 'Forest', bg: '#EDE9DA', hi: '#F7F4EA', c: '#2E5A3D', title: '#1C3827', ink: 'dark', paper: 1, e0: 900, de: 20 },
  { name: 'Desert', bg: '#EBD5B7', hi: '#F4E6D1', c: '#A64E2C', title: '#62250F', ink: 'dark', paper: 1, e0: 1320, de: 20 },
  { name: 'Glacier', bg: '#F3F7FA', hi: '#FFFFFF', c: '#2D6DA6', title: '#123C64', ink: 'dark', paper: 1, e0: 3100, de: 40 },
  { name: 'Midnight', bg: '#12213A', hi: '#1D3456', c: '#D8B566', title: '#F3E2B0', ink: 'light', paper: 0, e0: 2200, de: 40 },
  { name: 'Alpine', bg: '#44525E', hi: '#56666F', c: '#E4EBEF', title: '#FFFFFF', ink: 'light', paper: 0, e0: 2600, de: 40 },
  { name: 'Volcanic', bg: '#7A2517', hi: '#99331F', c: '#FFB598', title: '#FFEDE5', ink: 'light', paper: 0, e0: 1900, de: 40 },
];
function coverTerrain(i, w, h, cx, cy, s, wide) {
  const S = Math.max(w, h), sd = 100 + i * 17;
  return [
    { seed: sd, ns: S * 0.5, amp: 0.36, warp: 0.6, hills: [[cx, cy, s * 0.4, 1], [cx - w * 0.55, cy + h * 0.3, s * 0.55, 0.55], [w * 0.95, h * 1.05, s * 0.5, 0.35]] },
    { seed: sd, ns: S * 0.5, amp: 0.14, warp: 0.35, hills: [[cx, cy, s * 0.5, 1, 1.35, 0.5, 1], [cx - w * (wide ? 0.42 : 0.3), cy + h * 0.34, s * 0.22, 0.55, 1.2, -0.2, 1], [w * 0.1, h * 0.1, s * 0.3, 0.25]] },
    { seed: sd, ns: S * 0.42, amp: 0.2, ridge: 0.3, warp: 0.45, hills: [[cx, cy, s * 0.36, 1.2], [cx - s * 0.55, cy + s * 0.3, s * 0.3, 0.55, 2.2, 0.7], [cx + s * 0.2, cy + s * 0.6, s * 0.28, 0.45, 2, -0.9]] },
    { seed: sd, ns: S * 0.45, amp: 0.3, warp: 0.6, hills: [[cx, cy, s * 0.36, 1], [cx - s * 0.7, cy + s * 0.15, s * 0.3, 0.7, 1.8, 0.3], [cx - s * 1.4, cy + s * 0.5, s * 0.34, 0.5, 1.6, 0.2]] },
    { seed: sd, ns: S * 0.4, amp: 0.14, ridge: 0.42, warp: 0.4, hills: [[cx, cy, s * 0.34, 1.1], [cx - s * 0.6, cy + s * 0.1, s * 0.26, 0.7, 2.4, 0.2], [cx + s * 0.35, cy + s * 0.55, s * 0.3, 0.5]] },
    { seed: sd, ns: S * 0.5, amp: 0.07, warp: 0.08, hills: [[cx, cy, s * 0.62, 1, 1, 0, 2], [cx - w * 0.6, cy + h * 0.5, s * 0.5, 0.18]] },
  ][i];
}
function coverMap(i, o) {
  const P = TP_C[i], w = o.w, h = o.h, wide = o.shape === 'wide', F = focal(o), cx = F.x + F.s / 2, cy = o.top || (wide && w / h > 2.2) ? F.y + F.s / 2 : wide ? h * 0.34 : F.y + F.s / 2 + F.s * 0.04, small = w < 100;
  const n = small ? 12 : wide ? 22 : 18, cs = small ? 3 : w > 250 ? 5 : 4;
  const M = contour(coverTerrain(i, w, h, cx, cy, F.s, wide), w, h, { cs, n, tol: small ? 0.3 : 0.35 });
  const top = i === 5 ? { x: cx, y: cy, z: at(M.G, cx, cy) } : peakNear(M.G, cx, cy, F.s * 0.26) || { x: cx, y: cy, z: 1 };
  const k = w / 356, sw = f(Math.max(0.55, Math.min(0.85, 0.6 + k * 0.2))), isw = f(Math.max(0.9, Math.min(1.45, 1 + k * 0.4)));
  let fills = '';
  if (i === 2) for (const L of [0.72, 0.84]) fills += `<path d="${fillAbove(M.G, L)}" fill="#DCEBF5" fill-opacity=".6"/>`; // glacier ice
  if (i === 4) for (const L of [0.7, 0.8, 0.9]) fills += `<path d="${fillAbove(M.G, L)}" fill="#FFFFFF" fill-opacity=".22"/>`; // snow
  if (i === 5) { // the crater: a darker bowl inside the rim
    const rr = F.s * 0.62 * 0.45, rim = peakNear(M.G, cx, cy, rr * 1.25).z;
    fills += `<path d="${fillAbove(withV(M.G, (z, x, y) => (Math.hypot(x - cx, y - cy) < rr * 1.3 ? rim - 0.012 - z : -1)), 0, 0.3)}" fill="#3E0B05" fill-opacity=".42"/>`;
  }
  return { M, top, svg: svgWrap(w, h, fills + strokes(M, { c: P.c, sw, op: P.ink === 'dark' ? 0.5 : 0.42, isw, iop: P.ink === 'dark' ? 0.82 : 0.75 })) };
}

export default {
  key: 'topo', board: 'Topo', name: 'Topographic', dark: false, headArt: true,
  fonts: 'family=Barlow:ital,wght@0,400;0,500;0,600;0,700;1,500&family=DM+Mono:wght@400;500&',
  line: 'Contour lines in quiet ink, like a finely printed trail map.',
  bg(w, h) {
    return memo(`bg${w}x${h}`, () => `<div class="lx-paper" style="position: absolute; inset: 0; background-color: ${PAPER};"></div>${A('inset: 0; background: radial-gradient(ellipse 70% 60% at 18% 8%, rgba(255,255,255,.4), rgba(255,255,255,0) 70%), radial-gradient(ellipse 90% 80% at 50% 50%, rgba(120,90,50,0) 60%, rgba(120,90,50,.07) 100%);')}${studyMap(w, h)}`);
  },
  // A sheet of map paper with a double neat line and small map labels on its edge.
  face(w, h, o) {
    const sm = Math.min(w, h), m = Math.max(5, R(sm * 0.028)), r = R(o.r * 0.34), lf = Math.max(7.5, Math.min(10, sm * 0.021));
    const label = (css, t) => A(`${css} transform: translateY(-50%); padding: 0 ${R(lf * 0.7)}px; background: #FBF9F3; font-family: ${TP_M}; font-size: ${f(lf)}px; line-height: 1; letter-spacing: .06em; color: rgba(58,52,44,.62); white-space: nowrap;`, t);
    return face(`border-radius: ${r}px; background-color: #FBF9F3; box-shadow: 0 0 0 1px rgba(80,62,38,.12), 0 1px 2px rgba(80,62,38,.12), 0 ${R(h * 0.05)}px ${R(h * 0.11)}px ${-R(h * 0.05)}px rgba(80,62,38,.42); font-family: ${TP_F}; color: #1F1A15;`,
      () => `<span class="lx-paper" style="position: absolute; inset: 0; border-radius: ${r}px; background-color: #FBF9F3;"></span>` + A(`inset: ${m}px; border: 1px solid rgba(58,52,44,.5); border-radius: ${Math.max(2, r - m + 2)}px;`) +
        (w >= 200 ? A(`inset: ${m + 3}px; border: .6px solid rgba(58,52,44,.28); border-radius: ${Math.max(1, r - m)}px;`) : '') +
        (w >= 300 ? label(`left: ${m + R(sm * 0.05)}px; top: ${m}px;`, '38°32′N&nbsp;&nbsp;119°48′W') : '') +
        (w >= 440 ? label(`right: ${m + R(sm * 0.05)}px; top: ${m}px;`, '▲ 2431 M') : ''),
      { q: 'color: #7A6A57; font-weight: 500;', a: 'font-weight: 600; letter-spacing: -.005em;', lh: 1.18 }, { ink: '#1F1A15', paper: '#FBF9F3', muted: '#7A6A57' });
  },
  cover(d, o) {
    const i = di(d), P = TP_C[i], w = o.w, h = o.h, wide = o.shape === 'wide', sq = o.shape === 'square', small = w < 100, k = mo(d), dark = P.ink === 'light';
    return {
      bg: P.bg, cls: P.paper ? 'lx-paper' : '', ink: P.ink, name: `${P.name} · ${motifName(k)}`, ts: 1.05,
      title: `font-family: ${TP_F}; font-weight: 600; letter-spacing: -.005em; color: ${P.title};`,
      shadow: dark ? '0 1px 2px rgba(10,20,30,.25), 0 14px 28px -14px rgba(10,20,30,.55)' : '0 1px 2px rgba(70,55,30,.16), 0 14px 28px -16px rgba(70,55,30,.5)',
      draw: () => memo(`cv${i}${k}${o.shape}${w}x${h}`, () => {
        const C = coverMap(i, o), tp = C.top;
        const bs = sq ? 0 : R(wide ? h * 0.15 : w * (small ? 0.26 : 0.22)), el = R(P.e0 + tp.z * C.M.n * P.de);
        const badge = bs ? A(`left: ${R(tp.x - bs / 2)}px; top: ${R(tp.y - bs / 2)}px; width: ${bs}px; height: ${bs}px; box-sizing: border-box; border-radius: 50%; background: ${P.hi}; box-shadow: 0 0 0 ${f(Math.max(1, bs * 0.03))}px ${P.c}, 0 0 0 ${f(Math.max(2.5, bs * 0.1))}px ${P.bg}; display: flex; align-items: center; justify-content: center;`, `<span style="width: 58%; display: block;">${icon(k, P.c, small ? 3.4 : 2.6, '', TP_F)}</span>`) : '';
        const lf = wide ? 9 : Math.max(7, R(w * 0.05));
        const elev = bs && !small ? A(`left: ${R(tp.x - 40)}px; width: 80px; top: ${R(tp.y + bs / 2 + bs * 0.18)}px; text-align: center; font-family: ${TP_M}; font-size: ${lf}px; line-height: 1; letter-spacing: .05em; color: ${P.c}; opacity: .9; text-shadow: 0 0 3px ${P.bg}, 0 0 3px ${P.bg};`, `${el} M`) : '';
        const coord = !small && !sq && !wide ? A(`right: ${R(w * 0.07)}px; top: ${R(h * 0.055)}px; font-family: ${TP_M}; font-size: ${Math.max(7, R(w * 0.045))}px; line-height: 1; letter-spacing: .05em; color: ${P.c}; opacity: .75;`, DEG(38 + i, 12 + i * 7, 'N')) : '';
        const scr = sq || small ? '' : wide ? A(`left: 0; right: 0; bottom: 0; height: 58%; background: linear-gradient(to top, ${P.bg} 0%, ${P.bg}E6 38%, ${P.bg}00 100%);`) : A(`left: 0; right: 0; bottom: 0; height: 46%; background: linear-gradient(to top, ${P.bg} 0%, ${P.bg}D9 42%, ${P.bg}00 100%);`);
        return `${A(`inset: 0; background: radial-gradient(circle at ${R(tp.x)}px ${R(tp.y)}px, ${P.hi}, ${P.hi}00 ${R(Math.max(w, h) * 0.6)}px);`)}${C.svg}${scr}${badge}${elev}${coord}${dark ? grain(0.35) : ''}${A(`inset: 0; border-radius: ${o.r}px; box-shadow: inset 0 0 0 1px ${dark ? 'rgba(255,255,255,.08)' : 'rgba(60,45,25,.08)'};`)}`;
      }),
    };
  },
  avatar(s, ch) {
    const lo = s < 50;
    const map = memo(`av${lo}`, () => {
      const M = contour({ seed: 5, ns: 70, amp: 0.3, warp: 0.5, hills: [[50, 50, 26, 1, 1.15, 0.6], [92, 88, 22, 0.45], [4, 90, 18, 0.3]] }, 100, 100, { cs: 2.5, n: lo ? 7 : 12, tol: 0.25 });
      return M;
    });
    const sw = f(Math.min(2.6, 100 / s * (lo ? 0.9 : 0.75))), isw = f(Math.min(4, 100 / s * (lo ? 1.3 : 1.25)));
    const svg = `<svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true" style="position: absolute; inset: 0; display: block; -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 25%, #000 38%); mask-image: radial-gradient(circle at 50% 50%, transparent 25%, #000 38%);">${strokes(map, { c: '#D9E6C8', sw, op: 0.5, isw, iop: 0.8 })}</svg>`;
    return `<span style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 40% 34%, #36583F, #213D2A 72%); box-shadow: inset 0 0 0 ${f(Math.max(1, s / 36))}px rgba(255,255,255,.1), 0 1px 2px rgba(20,40,25,.28); display: flex; align-items: center; justify-content: center;">${svg}<span style="position: relative; font-family: ${TP_F}; font-size: ${R(s * 0.42)}px; font-weight: 600; line-height: 1; color: #F3EFE5;">${ch}</span></span>`;
  },
  // around your photo: a thin ring of forest green with a paler contour inside it
  frame: s => `<span style="position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 ${Math.max(1.5, R(s / 26))}px #2E5A3D, inset 0 0 0 ${Math.max(1, R(s / 40))}px rgba(217,230,200,.8), 0 1px 2px rgba(20,40,25,.28); pointer-events: none;"></span>`,
};
