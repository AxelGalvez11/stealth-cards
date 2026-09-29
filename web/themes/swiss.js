import { A, R, f, KEYS, di, mo, motifName, lay, face, banner, bannerSpot } from './kit.js';

// Swiss poster (International Typographic Style): a strict grid, flush-left bold grotesk, big numerals,
// circles, bars, arcs, and diagonals in signal red, black, and off-white, plus one accent per deck.
const SW = "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const RED = '#E2231A', INK = '#141414', PAPER = '#F1EEE7', SHEET = '#FCFBF8', MUTE = '#6E6A62';

// ---------- drawing ----------
const svg = (w, h, inner) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="position: absolute; left: 0; top: 0; display: block; overflow: hidden;">${inner}</svg>`;
const circ = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
// hairlines keep their pixel width however the group is scaled
const HL = 'vector-effect="non-scaling-stroke"';
const ring = (cx, cy, r, c, sw, hair = false) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${c}" stroke-width="${f(sw)}" ${hair ? HL : ''}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, c, sw, hair = false) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="${f(sw)}" ${hair ? HL : ''}/>`;
const text = (x, y, fs, t, fill, w = 800, ls = -0.04, anchor = 'start') => `<text x="${f(x)}" y="${f(y)}" font-family="${SW}" font-size="${f(fs)}" font-weight="${w}" letter-spacing="${f(fs * ls)}" text-anchor="${anchor}" fill="${fill}">${t}</text>`;
// a femur from the hip end P1 to the knee end P2: shaft, neck, head, trochanter, two condyles
function femur(P1, P2, fill) {
  const dx = P2[0] - P1[0], dy = P2[1] - P1[1], L = Math.hypot(dx, dy), u = [dx / L, dy / L], n = [u[1], -u[0]];
  const at = (p, a, b) => [p[0] + u[0] * a + n[0] * b, p[1] + u[1] * a + n[1] * b];
  const A = at(P1, 5, 0), B = at(P2, -5, 0), H = at(P1, -2, 6.5), T = at(P1, 4, -5.5), C1 = at(P2, 1, 5), C2 = at(P2, 1, -5);
  const bar = (p, q, sw) => `<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="${fill}" stroke-width="${sw}"/>`;
  return bar(A, B, 8.4) + bar(P1, H, 6.4) + circ(H[0], H[1], 8.2, fill) + circ(T[0], T[1], 5.6, fill) + circ(C1[0], C1[1], 6.4, fill) + circ(C2[0], C2[1], 6.4, fill);
}
// the construction grid: square fields with gutters, as hairlines from edge to edge
function grid(w, h, n, m, g, c) {
  const M = (w - 2 * m + g) / n, rows = Math.max(1, Math.floor((h - 2 * m + g) / M)), y0 = (h - (rows * M - g)) / 2;
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) xs.push(m + i * M, m + i * M + M - g);
  for (let j = 0; j < rows; j++) ys.push(y0 + j * M, y0 + j * M + M - g);
  const px = v => Math.round(v) + 0.5;
  return `<g stroke="${c}" stroke-width="1" shape-rendering="crispEdges">${xs.map(x => `<line x1="${px(x)}" y1="0" x2="${px(x)}" y2="${h}"/>`).join('')}${ys.map(y => `<line x1="0" y1="${px(y)}" x2="${w}" y2="${px(y)}"/>`).join('')}</g>`;
}
const GRID_INK = 'rgba(20,20,20,.07)';
// a small caption block, flush left: rows of [text, weight]
const caption = (x, y, fs, rows, color = INK) => A(`left: ${R(x)}px; top: ${R(y)}px; font-family: ${SW}; font-size: ${f(fs)}px; line-height: 1.3; color: ${color}; white-space: nowrap;`, rows.map(([t, w = 500]) => `<span style="display: block; font-weight: ${w};">${t}</span>`).join(''));
// a numbered list: 01 Recall / 02 Space / 03 Repeat
const list = (x, y, fs, items) => A(`left: ${R(x)}px; top: ${R(y)}px; font-family: ${SW}; font-size: ${f(fs)}px; line-height: 1.3; color: ${INK}; white-space: nowrap; font-variant-numeric: tabular-nums;`, items.map((t, k) => `<span style="display: flex;"><span style="width: ${R(fs * 2.1)}px; font-weight: 500; color: ${RED};">0${k + 1}</span><span style="font-weight: 600;">${t}</span></span>`).join(''));
const paper = `<div class="lx-paper" style="position: absolute; inset: 0; background-color: ${PAPER};"></div>`;

// ---------- study background ----------
// A poster around the card: a big red circle with a thin ring and a diagonal on the right, a type column framed by
// two black bars on the left, all on a hairline grid. The middle stays empty for the card.
function studyBg(w, h) {
  const L = lay(w, h), t60 = Math.tan(Math.PI / 3);
  const diag = (cx, cy, y0, y1, sw) => line(cx - (y1 - cy) / t60, y1, cx - (y0 - cy) / t60, y0, INK, sw);
  if (L === 'wide') {
    const cx = 1404, cy = 350, r = 240;
    const art = circ(cx, cy, r, RED) + ring(cx, cy, r + 38, INK, 1.5) + diag(cx, cy, 0, 900, 2)
      + rect(48, 177, 204, 20, INK) + rect(48, 740, 204, 20, INK);
    return paper + svg(w, h, grid(w, h, 12, 48, 24, GRID_INK) + art)
      + caption(48, 215, 13, [['Lucida', 700], ['Study session'], ['Spaced repetition']])
      + list(48, 660, 13, ['Recall', 'Space', 'Repeat']);
  }
  if (L === 'mid') {
    const cx = 588, cy = 30, r = 132;
    const art = circ(cx, cy, r, RED) + ring(cx, cy, r + 24, INK, 1.25) + diag(cx, cy, -10, 700, 1.5)
      + rect(34, 64, 180, 14, INK) + rect(34, 622, 180, 14, INK);
    return paper + svg(w, h, grid(w, h, 6, 34, 16, GRID_INK) + art)
      + caption(34, 92, 11, [['Lucida', 700], ['Study session'], ['Spaced repetition']])
      + list(34, 556, 11, ['Recall', 'Space', 'Repeat']);
  }
  if (L === 'tall') {
    const cx = 350, cy = 664, r = 106;
    return paper + svg(w, h, grid(w, h, 4, 16, 12, GRID_INK) + circ(cx, cy, r, RED) + ring(cx, cy, r + 20, INK, 1.25));
  }
  const cr = w * 0.28;
  return paper + svg(w, h, grid(w, h, 4, R(w * 0.05), R(w * 0.03), GRID_INK) + circ(w * 0.97, h * 0.54, cr, RED) + ring(w * 0.97, h * 0.54, cr * 1.17, INK, 1) + rect(w * 0.05, h * 0.6, w * 0.2, Math.max(3, R(w * 0.028)), INK));
}

// ---------- flashcard ----------
// White sheet, a thick rule and a hairline around a small label row with a red dot, the words flush left.
function cardFace(w, h, o) {
  const [pt, pr = pt] = String(o.pad).split(' ').map(parseFloat), sm = Math.min(w, h), tiny = w < 200;
  const r = Math.max(2, R(o.r * 0.14));
  const base = `border-radius: ${r}px; background: ${SHEET}; font-family: ${SW}; color: ${INK}; text-align: left;`;
  if (tiny) return face(`${base} box-shadow: 0 1px 1px rgba(20,20,20,.1), 0 6px 14px -8px rgba(40,30,20,.4); padding-top: ${pt + 3}px;`,
    () => A(`left: ${pr}px; right: ${pr}px; top: ${R(pt * 0.7)}px; height: 2px; background: ${INK};`) + A(`right: ${pr}px; bottom: ${R(pt * 0.8)}px; width: 6px; height: 6px; border-radius: 50%; background: ${RED};`),
    { q: `font-weight: 500; color: ${MUTE};`, a: 'font-weight: 700; letter-spacing: -.012em;', fs: 1, lh: 1.12 }, { ink: INK, paper: SHEET, muted: MUTE });
  const big = w > 400, lf = Math.max(9, R(sm * 0.026)), rule = big ? 3 : 2;
  const t0 = R(pt * 0.6), t1 = t0 + rule + R(lf * 0.75), t2 = t1 + lf + R(lf * 0.75), dot = R(lf * 1.05);
  return face(`${base} box-shadow: 0 1px 1px rgba(20,20,20,.08), 0 ${R(h * 0.05)}px ${R(h * 0.12)}px ${-R(h * 0.06)}px rgba(40,30,20,.32); padding-top: ${Math.max(pt, t2 + R(lf * 1.2))}px;`,
    () => A(`left: ${pr}px; right: ${pr}px; top: ${t0}px; height: ${rule}px; background: ${INK};`)
      + A(`left: ${pr}px; right: ${pr}px; top: ${t1}px; height: ${lf}px; display: flex; align-items: center; font-family: ${SW}; font-size: ${lf}px; line-height: 1; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: ${INK};`,
        `<span>${o.side === 'back' ? 'Answer' : 'Question'}</span><span style="flex-grow: 1;"></span><span style="width: ${dot}px; height: ${dot}px; border-radius: 50%; background: ${RED};"></span>`)
      + A(`left: ${pr}px; right: ${pr}px; top: ${t2}px; height: 1px; background: rgba(20,20,20,.16);`)
      + A(`left: ${pr}px; right: ${pr}px; bottom: ${t0}px; height: 1px; background: rgba(20,20,20,.16);`),
    { q: `font-weight: 500; color: ${MUTE}; letter-spacing: -.005em;`, qs: 0.46, a: 'font-weight: 700; letter-spacing: -.018em;', fs: o.side === 'back' ? 1.18 : 1.08, lh: 1.1 }, { ink: INK, paper: SHEET, muted: MUTE });
}

// ---------- deck covers ----------
// Each deck is its own poster, drawn once in a unit space (100 wide; the picture lives in y 0–70, so two-line deck
// names fit below it). 'tall' covers show it at full width, the wide Library card puts it on the right half above
// the app's text, and the square thumbnail shows its middle. Six fields alternate paper / color in the Library grid.
const PAL = [
  { name: 'Zürich', bg: PAPER, ink: 'dark', acc: '#2352C8' },
  { name: 'Basel', bg: '#1E4CB3', ink: 'light', acc: '#1E4CB3' },
  { name: 'Bern', bg: PAPER, ink: 'dark', acc: '#A9A398' },
  { name: 'Luzern', bg: INK, ink: 'light', acc: '#F5C300' },
  { name: 'Genève', bg: PAPER, ink: 'dark', acc: '#1F2F6B' },
  { name: 'Lugano', bg: RED, ink: 'light', acc: '#F7B9BC' },
];
const COMP = [
  // Cell: a red cell, a blue nucleus printed over its edge, a thin membrane ring
  () => circ(60, 35, 33, RED) + ring(60, 35, 39, INK, 1, true) + circ(36, 52, 14, PAL[0].acc, 'style="mix-blend-mode: multiply;"'),
  // Cloud: a white cloud over a rack of server fields, one red, one black
  () => {
    const W = '#FFFFFF', yb = 40;
    let rack = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rack += rect(19 + c * 14, 47 + r * 8.4, 12, 6.4, r === 0 && c === 2 ? RED : r === 2 && c === 0 ? INK : W);
    return circ(28, yb - 12, 12, W) + circ(46, yb - 19, 19, W) + circ(64, yb - 10, 10, W) + rect(28, yb - 12, 36, 12, W) + line(46, yb, 46, 47, W, 1, true) + rack;
  },
  // Torii: a red sun behind two black beams and two posts
  () => circ(50, 36, 23, RED) + rect(-5, 10, 110, 6.5, INK) + rect(15, 27, 70, 4, PAL[2].acc) + rect(27, 10, 6, 60, INK) + rect(67, 10, 6, 60, INK),
  // Benzene: a yellow hexagon, a red aromatic circle, a white bond, the formula
  () => {
    const cx = 56, cy = 36, R0 = 30, pts = [0, 1, 2, 3, 4, 5].map(k => { const a = (k * 60 - 90) * Math.PI / 180; return f(cx + R0 * Math.cos(a)) + ',' + f(cy + R0 * Math.sin(a)); }).join(' ');
    return line(cx, -10, cx, cy - R0, '#FFFFFF', 1.2, true) + `<polygon points="${pts}" fill="none" stroke="${PAL[3].acc}" stroke-width="6" stroke-linejoin="miter"/>` + circ(cx, cy, 12, RED) + text(94, 66, 7, 'C₆H₆', '#FFFFFF', 700, -0.01, 'end');
  },
  // Quill: 1776, under a canton and four stripes
  () => rect(9.6, 6, 27, 27, PAL[4].acc) + [0, 1, 2, 3].map(k => rect(41, 6 + k * 7.73, 64, 3.8, RED)).join('') + text(8.3, 64, 33, '1776', INK, 800, -0.05),
  // Bone: a femur across a black disc (the joint), a pale ring around it
  () => ring(62, 30, 35.5, PAL[5].acc, 1, true) + circ(62, 30, 30, INK) + femur([70, 12], [36, 60], PAPER),
];
// A deck about something else gets its letter as the poster, in its cover's colors.
const letterOf = (d, k) => (k[0] === '#' ? k.slice(1) : (String(d.name || '').trim().match(/[\p{L}\p{N}]/u) || ['L'])[0].toUpperCase()).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const letterPoster = (ch, P) => { const on = P.ink === 'light' ? '#FFFFFF' : INK, dot = P.bg === RED ? INK : RED;
  return circ(72, 24, 19, dot) + ring(72, 24, 24.5, on, 1, true) + rect(6, 4, 28, 3.2, on) + text(3, 69, 74, ch, on, 800, -0.06); };
// where the unit poster goes on each cover shape: [x, y, scale] (wide y-shift per deck keeps the ⋯ button clear)
const WIDE_DY = [2, 8, 22, 2, 34, 34];
function place(i, w, h, s, top, o) {
  // (a phone deck page's header: under its buttons, on the right)
  if (s === 'wide' && top) { const rem = h - top, sc = (rem * 0.84) / 70; return [w - 100 * sc - w * 0.02, top + (rem - 70 * sc) / 2, sc]; }
  if (s === 'wide' && w / h > 2.2) { const B = bannerSpot(o), sc = (B.s * 1.2) / 70; return [B.cx - 50 * sc, B.cy - 35 * sc, sc]; }
  if (s === 'wide') return [w * 0.42, 10 + WIDE_DY[i], (w * 0.58) / 100];
  if (s === 'square') return [-w * 0.13, w * 0.06, w / 76];
  return [0, 0, w / 100];
}

// A deck whose subject has a poster gets it, in that poster's colors; any other deck gets its letter, in the colors of
// its cover (Shuffle moves it through the six).
function cover(d, o) {
  // (the quill's poster is 1776, so it's only for American history)
  const k = mo(d), known = KEYS.includes(k) && (k !== 'quill' || /\bus\b|u\.s\.|americ|united states|usa|apush/i.test(d.name || '')), i = known ? KEYS.indexOf(k) : di(d), P = PAL[i], w = o.w, h = o.h, s = o.shape, tiny = w < 100 || s === 'square';
  return {
    bg: P.bg, ink: P.ink, name: `${P.name} · ${motifName(k)}`,
    title: `font-family: ${SW}; font-weight: 800; letter-spacing: -.02em; color: ${P.ink === 'light' ? '#FFFFFF' : INK};`, ts: 1.08,
    shadow: '0 1px 1px rgba(20,20,20,.12), 0 10px 24px -14px rgba(20,20,20,.45)',
    draw() {
      const [x, y, sc] = place(i, w, h, s, o.top, o);
      const g = tiny ? '' : grid(w, h, s === 'wide' ? 6 : 4, R(s === 'wide' ? 24 : w * 0.096), R(w * 0.03), P.ink === 'light' ? 'rgba(255,255,255,.08)' : GRID_INK);
      return `<span class="lx-paper" style="position: absolute; inset: 0; background-color: ${P.bg};"></span>${svg(w, h, g + `<g transform="translate(${f(x)} ${f(y)}) scale(${sc.toFixed(4)})">${known ? COMP[i]() : letterPoster(letterOf(d, k), P)}</g>`)}`;
    },
  };
}

// ---------- profile picture ----------
const avatar = (s, ch) => `<span style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; box-sizing: border-box; border-radius: 50%; background: ${RED}; display: flex; align-items: center; justify-content: center; overflow: hidden;"><span style="position: absolute; inset: ${f(s * 0.085)}px; border-radius: 50%; box-shadow: inset 0 0 0 ${f(Math.max(1, s / 60))}px ${INK};"></span><span style="position: relative; font-family: ${SW}; font-size: ${R(s * 0.44)}px; font-weight: 800; line-height: 1; letter-spacing: -.02em; color: #FFFFFF; transform: translate(${f(-s * 0.015)}px, ${f(s * 0.01)}px);">${ch}</span></span>`;

export default {
  key: 'swiss', board: 'Swiss', name: 'Swiss poster', dark: false, headArt: true,
  fonts: 'family=Inter+Tight:wght@500;600;700;800&',
  line: '1950s Swiss posters: a strict grid, bold grotesk type, red circles, and black bars.',
  bg: studyBg, face: cardFace, cover, avatar,
  // around your photo: a red ring with a black hairline inside it
  frame: s => `<span style="position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 ${Math.max(2, R(s / 18))}px ${RED}, inset 0 0 0 ${f(Math.max(1, s / 60))}px ${INK}; pointer-events: none;"></span>`,
};
