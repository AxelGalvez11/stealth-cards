import { A, V, R, f, di, mo, motifName, lay, lineOf, face, grain, banner, BANNER_X } from './kit.js';

// Zine collage: a photocopied DIY zine. Off-white copy paper, black toner and a few riso-bright spot colors, cut and
// pasted with torn edges, masking tape, halftone dots, ransom-note letters, staples and marker scribbles.
const TW = "'Special Elite', 'Courier Prime', 'Courier New', monospace";
const CP = "'Courier Prime', 'Courier New', ui-monospace, monospace";
const GRO = "Archivo, 'Arial Black', system-ui, sans-serif";
const FAT = "'Abril Fatface', 'Bodoni 72', Didot, Georgia, serif";
const MK = "'Permanent Marker', 'Marker Felt', 'Comic Sans MS', cursive";
const PAGE = '#EFECE4', SHEET = '#FBFAF5', RIM = '#FFFEFA', INK = '#171615';
const PINK = '#FF4FA3', COBALT = '#2447D6', RED = '#EC3B2E', YELLOW = '#FFE23A', KRAFT = '#C7A276';

// ---------- paper ----------
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const poly = (pts, dec) => `polygon(${pts.map(([x, y]) => (dec ? `${f(x)}px ${f(y)}px` : `${R(x)}px ${R(y)}px`)).join(',')})`;
// A w×h piece of paper as clip-path polygons: torn sides get a rough edge (a wandering inward offset up to amp px),
// the others are scissor-cut (straight, a touch off-square). Returns [face, rim]: the rim is the same edge grown a
// little, for the white fibers that show where printed paper tears.
function tear(w, h, seed, { amp = 3, step = 6, edges = 'trbl', fiber = 1.2, amps = {} } = {}) {
  const r = rng(seed), face = [], rim = [];
  const side = (x0, y0, x1, y1, nx, ny, e) => {
    const len = Math.hypot(x1 - x0, y1 - y0), a = amps[e] ?? amp;
    if (!edges.includes(e)) { const d = fiber + r() * Math.min(a, 2.5) * 0.6; face.push([x0 + nx * d, y0 + ny * d]); rim.push([x0 + nx * d, y0 + ny * d]); return; }
    let t = 0, v = 0; const base = a * (0.25 + r() * 0.3);
    while (t < len - step * 0.4) {
      const u = t / len, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
      v = v * 0.82 + (r() - 0.5) * a * 0.55;
      const d = fiber + Math.max(0, Math.min(a, base + v + r() * a * 0.4)), g = Math.min(d, fiber * (0.5 + r() * 1.1));
      face.push([px + nx * d, py + ny * d]); rim.push([px + nx * (d - g), py + ny * (d - g)]);
      t += step * (0.45 + r() * 1.1);
    }
  };
  side(0, 0, w, 0, 0, 1, 't');
  side(w, 0, w, h, -1, 0, 'r');
  side(w, h, 0, h, 0, -1, 'b');
  side(0, h, 0, 0, 1, 0, 'l');
  const dec = Math.min(w, h) < 120;
  return [poly(face, dec), poly(rim, dec)];
}
// A torn circle filling an s×s box.
function tearDisc(s, seed, amp, fiber) {
  const r = rng(seed), n = Math.max(20, R(Math.PI * s / Math.max(2.2, amp * 1.8))), face = [], rim = [], c = s / 2;
  let v = 0;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI;
    v = v * 0.8 + (r() - 0.5) * amp * 0.6;
    const d = fiber + Math.max(0, Math.min(amp, amp * 0.35 + v + r() * amp * 0.4)), g = Math.min(d, fiber * (0.5 + r() * 1.1));
    face.push([c + (c - d) * Math.cos(a), c + (c - d) * Math.sin(a)]); rim.push([c + (c - d + g) * Math.cos(a), c + (c - d + g) * Math.sin(a)]);
  }
  const dec = s < 120;
  return [poly(face, dec), poly(rim, dec)];
}
const lift = (k = 1) => `filter: drop-shadow(0 ${f(0.6 * k)}px ${f(0.7 * k)}px rgba(40,30,20,.28)) drop-shadow(0 ${f(2.6 * k)}px ${f(5 * k)}px rgba(40,30,20,.1));`;
// A pasted piece of paper (rect or disc) with a fiber rim and a soft contact shadow. inner = what is printed on it.
function scrap(x, y, w, h, o = {}) {
  const { rot = 0, seed = 1, color = SHEET, edges = 'trbl', amp = 3, step = 6, inner = '', rim = RIM, k = 1, disc = false, tex = true } = o;
  const fib = rim ? Math.max(0.7, amp * 0.34) : 0.01;
  const [face, rimP] = disc ? tearDisc(w, seed, amp, fib) : tear(w, h, seed, { amp, step, edges, fiber: fib });
  return A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(w)}px; height: ${R(h)}px; ${rot ? `transform: rotate(${rot}deg);` : ''} ${k ? lift(k) : ''}`,
    (rim ? A(`inset: 0; clip-path: ${rimP}; background: ${rim};`) : '') +
    `<span${tex ? ' class="lx-paper"' : ''} style="position: absolute; inset: 0; clip-path: ${face}; background-color: ${color}; overflow: hidden;">${inner}</span>`);
}
// Halftone: a real dot screen on a 45° grid, dots growing where the tone is dark. tone is a CSS gradient in grays
// (#8C8C8C ≈ solid, #FFFFFF = no dots). ink 'black' multiplies black dots on; 'white' screens white dots on.
const ht = (css, tone, d = 7, ink = 'black') => A(`${css} background: radial-gradient(closest-side, #777, #FFF) 0 0 / ${f(d)}px ${f(d)}px, radial-gradient(closest-side, #777, #FFF) ${f(d / 2)}px ${f(d / 2)}px / ${f(d)}px ${f(d)}px, ${tone}; background-blend-mode: multiply; filter: contrast(18)${ink === 'white' ? ' invert(1)' : ''}; mix-blend-mode: ${ink === 'white' ? 'screen' : 'multiply'};`);
// Masking tape centered on (cx, cy): a translucent beige strip with torn ends.
function tape(cx, cy, len, th, rot, seed, a = 0.74) {
  const [face] = tear(len, th, seed, { amp: Math.max(0.8, th * 0.13), step: Math.max(1.5, th * 0.17), edges: 'lr', fiber: 0.01 });
  return A(`left: ${f(cx - len / 2)}px; top: ${f(cy - th / 2)}px; width: ${f(len)}px; height: ${f(th)}px; transform: rotate(${rot}deg); filter: drop-shadow(0 .5px .6px rgba(60,40,10,.22));`,
    A(`inset: 0; clip-path: ${face}; background: linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,0) 45%, rgba(110,80,30,.08)), repeating-linear-gradient(90deg, rgba(255,255,255,.09) 0 1px, rgba(255,255,255,0) 1px 3px, rgba(120,90,40,.06) 3px 4px), rgba(233,219,184,${a});`));
}
const staple = (cx, cy, len, rot) => A(`left: ${f(cx - len / 2)}px; top: ${f(cy - 1.5)}px; width: ${f(len)}px; height: ${Math.max(2.5, f(len * 0.12))}px; transform: rotate(${rot}deg); border-radius: 1.5px; background: linear-gradient(90deg, rgba(40,40,38,.75) 0 7%, rgba(0,0,0,0) 12% 88%, rgba(40,40,38,.75) 93%), linear-gradient(180deg, #FFFFFF, #C9C9C5 40%, #85857F 78%, #A5A5A0); box-shadow: 0 1px 1.4px rgba(0,0,0,.42), 0 0 0 .5px rgba(0,0,0,.18);`);
// Marker strokes (inline SVG).
const MKP = {
  arrow: ['0 0 140 70', 'M6 60C34 58 74 44 118 15M99 9l20 5-6 20'],
  star: ['0 0 40 40', 'M8.5 36 19.8 3.8 31 36 3.6 15.8h33z'],
  loop: ['0 0 100 60', 'M80 11C58 1 17 6 8 27s27 31 58 27 33-24 15-38C68 7 42 6 29 10'],
  squig: ['0 0 100 20', 'M3 12c8-8 14 6 22 0s14-8 22 0 14 6 22 0 14-8 22 0'],
  under: ['0 0 120 16', 'M4 9c30-5 70-6 112-3M16 14c26-3 54-3 82-1'],
  up: ['0 0 60 90', 'M14 86C4 62 10 34 36 11M20 12l17-3 3 17'],
};
const mk = (k, css, w = 3, color = INK) => A(css, V(MKP[k][0], `<path d="${MKP[k][1]}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>`));
// Ransom-note letters: each one cut from a different page.
const RS = [
  [`font-family: ${FAT};`, '#FFFFFF', INK],
  [`font-family: ${GRO}; font-weight: 900;`, INK, '#FFFFFF'],
  [`font-family: ${TW};`, YELLOW, INK],
  [`font-family: ${FAT};`, COBALT, '#FFFFFF'],
  [`font-family: ${GRO}; font-weight: 900; font-stretch: 75%;`, '#FFFFFF', RED],
  [`font-family: ${CP}; font-weight: 700;`, '#EDE5D2', INK],
];
function ransom(word, size, seed, order) {
  const r = rng(seed);
  return [...word].map((ch, k) => {
    const [font, bg, fg] = RS[order[k % order.length]];
    const fs = size * (0.84 + r() * 0.3), rot = (r() - 0.5) * 13, dy = (r() - 0.5) * size * 0.14, q = () => f(r() * 6);
    return `<span style="display: inline-flex; margin: 0 ${f(size * 0.025)}px; transform: translateY(${f(dy)}px) rotate(${f(rot)}deg);"><span style="display: inline-flex; align-items: center; justify-content: center; min-width: .6em; padding: .12em .14em .08em; font-size: ${R(fs)}px; line-height: 1; ${font} background: ${bg}; color: ${fg}; clip-path: polygon(${q()}% ${q()}%, ${f(100 - r() * 6)}% ${q()}%, ${f(100 - r() * 6)}% ${f(100 - r() * 6)}%, ${q()}% ${f(100 - r() * 6)}%);">${ch}</span></span>`;
  }).join('');
}
// Photocopier toner specks.
function specks(w, h, seed, n) {
  const r = rng(seed);
  let s = '';
  for (let k = 0; k < n; k++) { const x = r() * w, y = r() * h, e = r(); if (x > w * 0.2 && x < w * 0.8 && y > h * 0.15 && y < h * 0.85) continue; s += `<circle cx="${R(x)}" cy="${R(y)}" r="${f(0.4 + e * e * 1.4)}"/>`; }
  return A('inset: 0;', `<svg width="100%" height="100%" viewBox="0 0 ${R(w)} ${R(h)}" aria-hidden="true" style="display: block;"><g fill="${INK}" opacity=".5">${s}</g></svg>`);
}
const ruled = (gap, margin) => A(`inset: 0; background: linear-gradient(90deg, rgba(0,0,0,0) ${margin}px, rgba(226,70,70,.55) ${margin}px ${margin + 1.4}px, rgba(0,0,0,0) ${margin + 1.4}px), repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 ${gap - 1.2}px, rgba(70,120,210,.42) ${gap - 1.2}px ${gap}px);`);
const graph = g => A(`inset: 0; background: linear-gradient(rgba(36,90,210,.26) 1px, rgba(0,0,0,0) 1px) 0 0 / ${g}px ${g}px, linear-gradient(90deg, rgba(36,90,210,.26) 1px, rgba(0,0,0,0) 1px) 0 0 / ${g}px ${g}px;`);
const typed = (txt, fs, css = '') => A(`inset: 0; display: flex; align-items: center; justify-content: center; font-family: ${TW}; font-size: ${fs}px; line-height: 1; color: ${INK}; white-space: nowrap; letter-spacing: .06em; ${css}`, txt);
const hand = (txt, x, y, fs, rot, color = INK) => A(`left: ${R(x)}px; top: ${R(y)}px; font-family: ${MK}; font-size: ${fs}px; line-height: 1; color: ${color}; white-space: nowrap; transform: rotate(${rot}deg); opacity: .92;`, txt);
// A line icon cut out like a sticker (white margin) or drawn in marker.
// (A deck's letter is set in the fat serif; its white margin is the letter's own outline, drawn wide underneath.)
const sticker = (k, w, under = '#FFFFFF', over = INK) => V('0 0 48 48', `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${under}" stroke-width="${f(w * 3.2)}">${lineOf(k, FAT, 400).replace('fill="currentColor" stroke="none"', k[0] === '#' ? `fill="${under}"` : `fill="${under}" stroke="none"`)}</g><g stroke="${over}" stroke-width="${w}">${lineOf(k, FAT, 400).replace('fill="currentColor"', `fill="${over}"`)}</g></g>`);
const marker = (k, w, color = INK) => V('0 0 48 48', `<g fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${lineOf(k, MK, 400).replace('fill="currentColor"', `fill="${color}"`)}</g>`);
const place = (cx, cy, s, rot, inner, css = '') => A(`left: ${f(cx - s / 2)}px; top: ${f(cy - s / 2)}px; width: ${f(s)}px; transform: rotate(${rot}deg); ${css}`, inner);

// ---------- deck covers ----------
const ZC = [
  { name: 'Fluoro pink', hl: 'rgba(255,79,163,.5)' },
  { name: 'Cobalt', hl: 'rgba(36,71,214,.26)' },
  { name: 'Red', hl: 'rgba(236,59,46,.34)' },
  { name: 'Highlighter', hl: 'rgba(255,226,58,.95)' },
  { name: 'Kraft', hl: 'rgba(222,156,76,.5)' },
  { name: 'X-ray', hl: 'rgba(255,79,163,.42)' },
];
const COMP = [
  // Cell · a torn pink disc printed with a halftone sphere, the cell cut out like a sticker, tape.
  c => {
    const s = c.S * 0.94, cx = c.X(0.52), cy = c.Y(0.52);
    return scrap(cx - s / 2, cy - s / 2, s, s, { disc: true, seed: c.seed, color: PINK, amp: c.amp, inner: ht('inset: 0;', 'radial-gradient(circle at 34% 30%, #FFF 0%, #F4F4F4 30%, #A0A0A0 100%)', c.dot) })
      + place(cx, cy, c.S * 0.52, -8, sticker(c.k, 2.2), lift(c.lift * 0.8))
      + (c.tiny ? '' : tape(cx - s * 0.36, cy - s * 0.38, c.S * 0.46, c.S * 0.13, -42, c.seed + 3));
  },
  // Cloud · a cobalt scrap with white halftone over a piece of graph paper, the cloud in white marker, a staple.
  c => {
    const gw = c.B.w * 0.8, gh = c.B.h * 0.74, bw = c.B.w * 0.74, bh = c.B.h * 0.66;
    return scrap(c.X(0.04), c.Y(0.26), gw, gh, { rot: 5, seed: c.seed + 1, color: '#FAFAF7', amp: c.amp * 0.8, inner: graph(Math.max(4, R(c.S * 0.07))) })
      + scrap(c.X(0.2), c.Y(0.1), bw, bh, { rot: -4, seed: c.seed, color: COBALT, amp: c.amp, edges: 'rbl', inner: ht('inset: 0;', 'linear-gradient(200deg, #9A9A9A 0%, #E6E6E6 45%, #FFF 70%)', c.dot, 'white') })
      + place(c.X(0.2) + bw * 0.5, c.Y(0.1) + bh * 0.52, c.S * 0.5, -4, marker(c.k, 2.6, '#FFFFFF'))
      + (c.tiny ? '' : staple(c.X(0.2) + bw * 0.5, c.Y(0.1) + c.S * 0.06, c.S * 0.2, -4));
  },
  // Torii · a red torn sun, the torii drawn over it in black marker, a strip of tape.
  c => {
    const s = c.S * 0.74, cx = c.X(0.6), cy = c.Y(0.42);
    return scrap(cx - s / 2, cy - s / 2, s, s, { disc: true, seed: c.seed, color: RED, amp: c.amp, inner: ht('inset: 0;', 'linear-gradient(180deg, #FFF 55%, #D0D0D0 100%)', c.dot) })
      + place(c.X(0.46), c.Y(0.56), c.S * 0.74, 0, marker(c.k, 3))
      + (c.tiny ? '' : tape(c.X(0.84), c.Y(0.16), c.S * 0.4, c.S * 0.12, 58, c.seed + 3));
  },
  // Benzene · a yellow scrap with a black halftone corner, the ring in marker, circled in pink.
  c => {
    const bw = c.B.w * 0.84, bh = c.B.h * 0.8;
    return scrap(c.X(0.08), c.Y(0.1), bw, bh, { rot: 4, seed: c.seed, color: YELLOW, amp: c.amp, inner: ht('inset: 0;', 'radial-gradient(circle at 0% 0%, #8C8C8C 0%, #D2D2D2 30%, #FFF 55%)', c.dot) })
      + place(c.X(0.5), c.Y(0.5), c.S * 0.56, 8, marker(c.k, 2.8))
      + place(c.X(0.5), c.Y(0.5), c.S * 0.86, -6, V(MKP.loop[0], `<path d="${MKP.loop[1]}" fill="none" stroke="${PINK}" stroke-width="3.4" stroke-linecap="round" opacity=".9"/>`))
      + (c.tiny ? '' : tape(c.X(0.86), c.Y(0.1), c.S * 0.4, c.S * 0.12, 36, c.seed + 3));
  },
  // Quill · kraft paper, a torn strip of ruled notebook paper, the quill cut out, a staple.
  c => {
    const kw = c.B.w * 0.8, kh = c.B.h * 0.82, nw = c.B.w * 0.62, nh = c.B.h * 0.42;
    return scrap(c.X(0.06), c.Y(0.08), kw, kh, { rot: -3, seed: c.seed, color: KRAFT, amp: c.amp, rim: '#E4D2B4' })
      + scrap(c.X(0.34), c.Y(0.44), nw, nh, { rot: 6, seed: c.seed + 1, color: '#FCFCF8', amp: c.amp * 0.8, edges: 'tb', inner: ruled(Math.max(4, R(c.S * 0.085)), Math.max(4, R(c.S * 0.07))) })
      + place(c.X(0.46), c.Y(0.48), c.S * 0.64, -6, sticker(c.k, 2.2), lift(c.lift * 0.8))
      + (c.tiny ? '' : staple(c.X(0.2), c.Y(0.14), c.S * 0.2, -38));
  },
  // Bone · an inverted (black) photocopy with white halftone, the bone in white like an x-ray, tape.
  c => {
    const bw = c.B.w * 0.8, bh = c.B.h * 0.82;
    return scrap(c.X(0.1), c.Y(0.08), bw, bh, { rot: -4, seed: c.seed, color: '#1B1A19', amp: c.amp, inner: ht('inset: 0;', 'linear-gradient(20deg, #9C9C9C 0%, #E8E8E8 32%, #FFF 55%)', c.dot, 'white') + A('inset: 0; background: radial-gradient(ellipse at 52% 48%, rgba(255,255,255,.14), rgba(255,255,255,0) 60%);') })
      + place(c.X(0.5), c.Y(0.5), c.S * 0.66, 0, marker(c.k, 2.4, '#F4F1EA'), 'filter: drop-shadow(0 0 2px rgba(255,255,255,.55));')
      + (c.tiny ? '' : tape(c.X(0.14), c.Y(0.14), c.S * 0.42, c.S * 0.12, -40, c.seed + 3) + tape(c.X(0.86), c.Y(0.84), c.S * 0.42, c.S * 0.12, -40, c.seed + 4));
  },
];

// ---------- study background pieces ----------
const masthead = (x, y, size, seed) => A(`left: ${R(x)}px; top: ${R(y)}px; display: flex; align-items: center; filter: drop-shadow(1px 1.5px 0 rgba(0,0,0,.2));`, ransom('STUDY', size, seed, [0, 1, 2, 4, 3]));

export default {
  key: 'zine', board: 'Zine', name: 'Zine collage', dark: false,
  fonts: 'family=Special+Elite&family=Courier+Prime:wght@400;700&family=Archivo:wdth,wght@75..100,700..900&family=Abril+Fatface&family=Permanent+Marker&',
  line: 'A photocopied DIY zine: torn paper, masking tape, halftone dots, and ransom-note letters.',
  bg(w, h) {
    const L = lay(w, h);
    const bits = {
      wide: () =>
        // top left: the masthead
        scrap(-70, -60, 380, 340, { rot: -4, seed: 11, color: PINK, amp: 5, step: 8, edges: 'rb', k: 1.4, inner: ht('inset: 0;', 'radial-gradient(circle at 8% 10%, #8C8C8C 0%, #BEBEBE 26%, #FFF 60%)', 10) })
        + masthead(40, 146, 50, 3)
        + scrap(52, 222, 226, 34, { rot: -2, seed: 12, amp: 1.4, step: 4, edges: 'lr', inner: typed('zine · issue nº 1 · free', 15) })
        // a note to self, pointing at the card
        + hand('remember this!', 40, 440, 28, -6)
        + mk('arrow', 'left: 196px; top: 358px; width: 132px;', 3.2)
        // bottom left: notebook paper with a halftone clipping taped on
        + scrap(-50, 664, 330, 300, { rot: 5, seed: 15, color: '#FBFBF7', amp: 3.4, edges: 't', inner: ruled(24, 44) })
        + scrap(84, 690, 134, 134, { disc: true, seed: 13, color: '#E4E0D6', amp: 2.6, inner: ht('inset: 0;', 'radial-gradient(circle at 36% 32%, #FFF 0%, #EDEDED 24%, #969696 92%)', 6) })
        + tape(108, 702, 78, 22, -36, 14)
        + scrap(170, 806, 70, 26, { rot: 5, seed: 22, amp: 1, step: 3, edges: 'lr', inner: typed('fig. 1', 13) })
        // top right: cobalt, stapled, with a typed strip pasted over its edge
        + scrap(1150, -50, 350, 250, { rot: 6, seed: 16, color: COBALT, amp: 5, step: 8, edges: 'lb', k: 1.4, inner: ht('inset: 0;', 'radial-gradient(circle at 90% 8%, #8C8C8C 0%, #C6C6C6 30%, #FFF 62%)', 10, 'white') })
        + staple(1232, 148, 34, 6)
        + scrap(1178, 198, 216, 42, { rot: 3, seed: 17, amp: 1.4, step: 4, edges: 'lr', inner: typed('please photocopy &amp; share', 14) })
        + mk('star', 'left: 1352px; top: 252px; width: 40px; transform: rotate(-10deg);', 2.6, PINK)
        // bottom right: highlighter yellow, taped, with a grade on it
        + scrap(1176, 556, 300, 250, { rot: -6, seed: 18, color: YELLOW, amp: 4.4, step: 7, edges: 'tlb', k: 1.2, inner: ht('inset: 0;', 'radial-gradient(circle at 100% 100%, #9A9A9A 0%, #CACACA 30%, #FFF 60%)', 9) })
        + tape(1214, 570, 110, 30, -26, 19)
        + hand('A+', 1250, 628, 64, -8, RED)
        + mk('loop', 'left: 1222px; top: 606px; width: 150px; transform: rotate(-8deg);', 2.6, RED)
        + specks(w, h, 21, 90),
      tall: () =>
        scrap(-40, -44, 180, 124, { rot: -6, seed: 11, color: PINK, amp: 4, step: 7, edges: 'rb', inner: ht('inset: 0;', 'radial-gradient(circle at 10% 10%, #8C8C8C 0%, #C4C4C4 34%, #FFF 70%)', 8) })
        + scrap(292, -36, 140, 112, { rot: 7, seed: 18, color: YELLOW, amp: 3.4, edges: 'lb', inner: ht('inset: 0;', 'radial-gradient(circle at 90% 10%, #9A9A9A 0%, #CACACA 34%, #FFF 70%)', 8) })
        + tape(300, 30, 56, 17, -52, 14)
        + scrap(-34, 790, 160, 110, { rot: -5, seed: 16, color: COBALT, amp: 3.4, edges: 'tr', inner: ht('inset: 0;', 'radial-gradient(circle at 0% 100%, #8C8C8C 0%, #C6C6C6 34%, #FFF 70%)', 8, 'white') })
        + mk('squig', 'left: 262px; top: 816px; width: 96px; transform: rotate(-4deg);', 3.4, PINK)
        + specks(w, h, 21, 30),
      mid: () =>
        scrap(-40, -40, 320, 226, { rot: -4, seed: 11, color: PINK, amp: 4.4, step: 8, edges: 'rb', k: 1.2, inner: ht('inset: 0;', 'radial-gradient(circle at 8% 10%, #8C8C8C 0%, #C0C0C0 28%, #FFF 62%)', 9) })
        + masthead(30, 96, 40, 3)
        + scrap(460, -30, 210, 160, { rot: 7, seed: 16, color: COBALT, amp: 4, edges: 'lb', inner: ht('inset: 0;', 'radial-gradient(circle at 90% 8%, #8C8C8C 0%, #C6C6C6 32%, #FFF 66%)', 9, 'white') })
        + staple(534, 98, 30, 7)
        + scrap(-30, 548, 250, 200, { rot: 4, seed: 15, color: '#FBFBF7', amp: 3, edges: 't', inner: ruled(20, 36) })
        + hand('remember this!', 30, 610, 22, -7)
        + mk('up', 'left: 150px; top: 512px; width: 52px;', 3.4)
        + scrap(470, 540, 220, 200, { rot: -7, seed: 18, color: YELLOW, amp: 3.6, edges: 'tl', inner: ht('inset: 0;', 'radial-gradient(circle at 100% 100%, #9A9A9A 0%, #CACACA 32%, #FFF 62%)', 8) })
        + tape(510, 556, 84, 24, -24, 19)
        + hand('A+', 540, 598, 44, -8, RED)
        + mk('loop', 'left: 518px; top: 582px; width: 104px; transform: rotate(-8deg);', 2.8, RED)
        + specks(w, h, 21, 50),
      tiny: () =>
        scrap(-24, -24, 150, 130, { rot: -6, seed: 11, color: PINK, amp: 3, edges: 'rb', inner: ht('inset: 0;', 'radial-gradient(circle at 10% 10%, #8C8C8C 0%, #C4C4C4 30%, #FFF 64%)', 6) })
        + scrap(-10, 160, 110, 80, { rot: 5, seed: 16, color: COBALT, amp: 2.4, edges: 'tr', inner: ht('inset: 0;', 'radial-gradient(circle at 0% 100%, #8C8C8C 0%, #C6C6C6 34%, #FFF 70%)', 6, 'white') })
        + tape(120, 150, 44, 13, 32, 14),
    }[L]();
    return `<span class="lx-paper" style="position: absolute; inset: 0; background-color: ${PAGE};"></span>${A('inset: 0; background: radial-gradient(ellipse 70% 64% at 50% 48%, rgba(255,255,255,.4), rgba(255,255,255,0) 70%), radial-gradient(ellipse 120% 110% at 50% 50%, rgba(0,0,0,0) 62%, rgba(60,50,40,.07));')}${bits}${grain(0.5)}`;
  },
  // A sheet of copy paper, torn along the top and bottom, taped on, with a ransom-note Q or A. The paper sits a hair
  // off square; the words don't.
  face(w, h, o) {
    const sm = Math.min(w, h), tiny = w < 200, big = sm >= 300;
    const [py, px = py] = String(o.pad).split(' ').map(parseFloat);
    const seed = R(w * 7 + h * 3) + (o.side === 'back' ? 5 : 0);
    const amp = tiny ? 1.4 : Math.min(6.5, Math.max(2.4, sm * 0.013)), side = amp * 0.45;
    const rot = tiny ? -1.5 : w >= 700 ? -0.5 : h > w ? 0.4 : w >= 400 ? -0.9 : o.side === 'back' ? 0.8 : -0.7;
    return face(`background: transparent; box-shadow: none; color: ${INK}; font-family: ${CP};`, () => {
      const [fc, rim] = tear(w, h, seed, { amp, amps: { l: side, r: side }, step: tiny ? 3.2 : 6, fiber: Math.max(0.6, amp * 0.3) });
      const paper = A(`inset: 0; transform: rotate(${rot}deg); filter: drop-shadow(0 1px 1px rgba(40,30,20,.26)) drop-shadow(0 ${R(sm * 0.025) + 1}px ${R(sm * 0.05) + 1}px rgba(40,30,20,.12));`,
        A(`inset: 0; clip-path: ${rim}; background: ${RIM};`) + `<span class="lx-paper" style="position: absolute; inset: 0; clip-path: ${fc}; background-color: ${SHEET};"></span>`);
      const tl = tiny ? 38 : Math.min(150, Math.max(64, sm * 0.3)), tt = tl * 0.27;
      const tapes = tiny ? tape(w * 0.5, 2, tl, tt, -3, seed + 1) : tape(w * 0.5, 3, tl, tt, -2.5, seed + 1) + (sm >= 250 ? tape(w - tl * 0.22, h - tl * 0.2, tl * 0.8, tt, -40, seed + 2) : '');
      const ls = R(Math.max(14, o.fs * (big ? 1.05 : 0.95)));
      const label = tiny ? '' : A(`left: ${R(px * 0.72)}px; top: ${R(py * 0.42)}px; display: flex; filter: drop-shadow(1px 1.2px 0 rgba(0,0,0,.18));`, ransom(o.side === 'back' ? 'A' : 'Q', ls, seed, o.side === 'back' ? [1] : [3]));
      return paper + label + tapes;
    }, { q: `font-family: ${TW}; color: #6A665D;`, qs: 0.5, a: 'font-weight: 700; letter-spacing: -.01em;', lh: 1.24 }, { ink: INK, paper: SHEET, muted: '#6A665D' });
  },
  cover(d, o) {
    const i = di(d), P = ZC[i], w = o.w, h = o.h, wide = o.shape === 'wide', sq = o.shape === 'square', tiny = w < 100;
    const B = banner(o) ? { x: w * BANNER_X - h * 0.6, y: h * 0.12, w: h * 1.2, h: h * 0.78 } : wide ? { x: w * 0.49, y: h * 0.16, w: w * 0.51, h: h * 0.52 } : sq ? { x: 0, y: 0, w, h } : { x: 0, y: 0, w, h: h * 0.64 };
    const S = Math.min(B.w, B.h);
    const c = { B, S, w, h, wide, tiny, sq, X: u => B.x + u * B.w, Y: v => B.y + v * B.h, seed: i * 97 + R(w), amp: tiny ? 1.4 : Math.max(1.6, S * 0.024), dot: Math.max(3, S * 0.055), k: mo(d) };
    c.lift = tiny ? 0.5 : 1;
    return {
      bg: PAGE, ink: 'dark', name: `${P.name} · ${motifName(c.k)}`,
      title: `font-family: ${GRO}; font-weight: 800; font-stretch: 86%; letter-spacing: -.012em; color: ${INK}; text-decoration: underline; text-decoration-color: ${P.hl}; text-decoration-thickness: .5em; text-underline-offset: -.34em; text-decoration-skip-ink: none;`,
      ts: 1.06,
      shadow: '0 1px 1.5px rgba(40,30,20,.22), 0 12px 24px -14px rgba(40,30,20,.45)',
      draw: () => `<span class="lx-paper" style="position: absolute; inset: 0; background-color: ${PAGE};"></span>${COMP[i](c)}${grain(0.45)}`,
    };
  },
  avatar(s, ch) {
    const amp = Math.max(0.5, s * 0.035), fib = Math.max(0.5, amp * 0.4), [face, rim] = tearDisc(s, s * 3 + 1, amp, fib);
    const fs = R(s * (s >= 56 ? 0.46 : 0.58));
    return `<span style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">${A(`inset: 0; ${lift(Math.max(0.5, s / 60))}`, A(`inset: 0; clip-path: ${rim}; background: ${RIM};`) + `<span class="lx-paper" style="position: absolute; inset: 0; clip-path: ${face}; background-color: ${PINK}; overflow: hidden;">${s >= 30 ? ht('inset: 0;', 'radial-gradient(circle at 30% 26%, #FFF 0%, #F2F2F2 30%, #9A9A9A 100%)', Math.max(3, s / 11)) : ''}</span>`)}<span style="position: relative; display: flex; filter: drop-shadow(${f(Math.max(0.5, s / 90))}px ${f(Math.max(0.6, s / 70))}px 0 rgba(0,0,0,.22));">${ransom(ch, fs, 7, [0])}</span>${s >= 56 ? tape(s * 0.82, s * 0.14, s * 0.46, s * 0.13, 38, 9) : ''}</span>`;
  },
  frame(s) {
    const amp = Math.max(0.5, s * 0.03), [fc, rim] = tearDisc(s + 6, s * 5 + 3, amp, Math.max(0.5, amp * 0.4));
    return A(`left: -3px; top: -3px; width: ${s + 6}px; height: ${s + 6}px; ${lift(Math.max(0.5, s / 60))} -webkit-mask: radial-gradient(circle, transparent ${R(s / 2 - 1)}px, #000 ${R(s / 2)}px); mask: radial-gradient(circle, transparent ${R(s / 2 - 1)}px, #000 ${R(s / 2)}px);`, A(`inset: 0; clip-path: ${rim}; background: ${RIM};`) + `<span class="lx-paper" style="position: absolute; inset: 0; clip-path: ${fc}; background-color: ${PINK};"></span>`) + (s >= 56 ? tape(s * 0.82, s * 0.14, s * 0.46, s * 0.13, 38, 9) : '');
  },
};
