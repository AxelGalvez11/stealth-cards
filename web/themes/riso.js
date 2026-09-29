import { A, R, f, di, mo, motifName, lay, icon, face, grain, banner, bannerSpot, headSpot } from './kit.js';

// Risograph
// Two or three spot inks on off-white paper. Inks overprint (multiply), one plate sits a little out of register,
// solids are grainy, and tones are halftone dots.
const RD = "'Bricolage Grotesque', 'Archivo Black', system-ui, sans-serif";
const RT = "'Instrument Sans', 'Helvetica Neue', system-ui, sans-serif";
const PAPER = '#F3EEE3', STOCK = '#FBF8F1';
const K = { pink: '#FF48B0', blue: '#0078BF', yellow: '#FFE800', teal: '#00838A', orange: '#FF6C2F', purple: '#765BA7', green: '#00A95C', red: '#F15060', federal: '#3D5588', aqua: '#5EC8E5', burgundy: '#914E72' };
const hexRgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
// the color two inks make where they overprint
const over = (...cs) => '#' + cs.map(hexRgb).reduce((a, b) => a.map((v, k) => v * b[k] / 255)).map(v => R(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const MUL = 'mix-blend-mode: multiply;';
const box = (x, y, w, h) => `left: ${R(x)}px; top: ${R(y)}px; width: ${R(w)}px; height: ${R(h)}px;`;
const dbox = (cx, cy, d) => `${box(cx - d / 2, cy - d / 2, d, d)} border-radius: 50%;`;
// a disc for halftone: clip-path cuts the finished dots (border-radius would leave a thin ink ring at the edge)
const cbox = (cx, cy, d) => `${box(cx - d / 2, cy - d / 2, d, d)} clip-path: circle(50% at 50% 50%);`;
const ink = (css, c, inner = '') => A(`${css} background: ${c}; ${MUL}`, inner);
const disc = (cx, cy, d, c, css = '') => ink(`${dbox(cx, cy, d)} ${css}`, c);
// sunset bands over the lower part of a disc, thicker toward the bottom
const SUNSET = [[0.55, 0.585], [0.64, 0.685], [0.74, 0.8], [0.855, 0.93], [0.975, 1.2]];
const sunset = (c, st = SUNSET) => `linear-gradient(180deg, transparent 0%, ${st.map(([a, b]) => `transparent ${f(a * 100)}%, ${c} ${f(a * 100)}%, ${c} ${f(b * 100)}%, transparent ${f(b * 100)}%`).join(', ')})`;
const bands = (css, c, band, gap, a = 180) => A(`${css} background: repeating-linear-gradient(${a}deg, ${c} 0 ${f(band)}px, transparent ${f(band)}px ${f(band + gap)}px); ${MUL}`);
// halftone: dots of ink c whose size follows g, a gradient from #FFF (no ink) to #737373 (solid); p = dot pitch, a = screen angle
const HT = t => { const v = R(255 - t * 140); return `rgb(${v},${v},${v})`; };
// (the dot layer bleeds 3px past the ink and clip-path cuts the finished print, so no edge of bare ink shows, even rotated)
const tone = (css, c, p, g, a = 15) => A(`${css} ${css.includes('clip-path') ? '' : 'clip-path: inset(0);'} isolation: isolate; background: ${c}; ${MUL}`,
  A('inset: -3px; isolation: isolate; filter: contrast(24); mix-blend-mode: screen;',
    A(`inset: 3px; background: ${g};`) + A(`inset: -50%; transform: rotate(${a}deg); background: radial-gradient(circle closest-side, #888, #FFF) 0 0/${f(p)}px ${f(p)}px; ${MUL}`)));
// radial tone: densest at (x%, y%), fading out by `to`%
const rt = (x, y, t0 = 1, mid = 0.5, to = 76, shape = 'circle') => `radial-gradient(${shape} at ${x}% ${y}%, ${HT(t0)} 0%, ${HT(mid)} ${R(to / 2)}%, ${HT(0)} ${to}%)`;
// the colophon, set small up the left edge like on a printed poster
const colophon = (x, y, fs, txt) => A(`left: ${x}px; top: ${y}px; transform: rotate(-90deg); transform-origin: 0 0; white-space: nowrap; font-family: ${RD}; font-size: ${fs}px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; color: ${K.blue}; ${MUL}`, txt);
// the print: paper, every ink multiplied onto it (the paper must be inside the isolated group), then speckle and grain
const print = (inks, { g = 0.7, sp = 1, c = PAPER } = {}) => `<span style="position: absolute; inset: 0; isolation: isolate;"><span class="lx-paper" style="position: absolute; inset: 0; background-color: ${c};"></span>${inks}</span>${sp ? `<span class="riso-speck" style="opacity: ${sp};"></span>` : ''}${grain(g)}`;
// uneven ink: soft patches of bare paper color lift the solids a little (invisible on the paper itself)
const mottle = spots => A(`inset: 0; background: ${spots.map(([x, y, rx, ry, a]) => `radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%, rgba(243,238,227,${a}), rgba(243,238,227,0))`).join(', ')};`);

export default {
  key: 'riso', board: 'Riso', name: 'Risograph', dark: false, headArt: true,
  fonts: 'family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:wght@400..700&',
  line: 'Spot inks on off-white paper: overprinted shapes, halftone dots, and plates a little out of register.',
  css: `.riso-speck{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle at 23% 31%,${PAPER} 0 .45px,transparent 1px),radial-gradient(circle at 71% 64%,${PAPER} 0 .4px,transparent .9px),radial-gradient(circle at 42% 83%,${PAPER} 0 .6px,transparent 1.15px),radial-gradient(circle at 88% 12%,${PAPER} 0 .35px,transparent .85px),radial-gradient(circle at 12% 70%,${PAPER} 0 .5px,transparent 1.05px);background-size:17px 19px,23px 29px,31px 37px,41px 13px,47px 53px}`,
  bg(w, h) {
    const L = lay(w, h), P = K.pink, B = K.blue, Y = K.yellow;
    // the sun: a pink disc, with blue sea bands printed from a plate that sits a few px off
    const sun = (cx, cy, d, o) => disc(cx, cy, d, P) + A(`${dbox(cx + o, cy + o * 0.6, d)} background: ${sunset(B)}; ${MUL}`);
    // a blue moon with a pink halftone disc printed over its shoulder
    const moon = (cx, cy, d, dx, dy, dd, p) => disc(cx, cy, d, B) + tone(cbox(dx, dy, dd), P, p, rt(66, 44, 1, 0.5, 78), 75);
    // a light tone of blue dots rising from a corner
    const field = (x, y, fw, fh, p, cx, cy) => tone(box(x, y, fw, fh), B, p, rt(cx, cy, 0.6, 0.22, 80, 'ellipse 100% 100%'), 15);
    // a small yellow sun, its blue outline printed off register
    const ring = (cx, cy, d, o, t) => disc(cx, cy, d, Y) + A(`${dbox(cx + o, cy + o * 0.7, d)} box-shadow: inset 0 0 0 ${t}px ${B}; ${MUL}`);
    const bits = {
      wide: () => sun(52, 48, 470, 7) + moon(1484, 540, 440, 1266, 456, 236, 9) + field(0, 580, 360, 320, 9, 0, 100) + ring(1292, 150, 100, 7, 3) + colophon(22, 668, 10, 'Lucida Press · Fluo pink / Blue / Yellow') +
        mottle([[3, 8, 12, 14, 0.2], [14, 22, 8, 10, 0.14], [96, 60, 6, 12, 0.16]]),
      tall: () => sun(-8, 12, 206, 3) + moon(410, 812, 250, 294, 750, 166, 7) + field(0, 710, 200, 134, 7, 0, 100) + mottle([[6, 2, 22, 7, 0.2]]),
      mid: () => sun(34, 40, 290, 4) + moon(660, 522, 250, 550, 598, 146, 6.5) + field(0, 490, 230, 210, 7, 0, 100) + ring(574, 108, 62, 4, 2) + colophon(12, 548, 8, 'Lucida Press · Pink / Blue / Yellow'),
      tiny: () => sun(22, 192, 150, 2) + moon(222, 96, 96, 158, 76, 52, 3.4),
    }[L]();
    return print(bits, { g: L === 'tiny' ? 0.5 : 0.75, sp: L === 'tiny' ? 0 : 1 });
  },

  // Stock paper with a pink quarter-sun in the corner (blue halftone printed over its edge), and Q or A in two inks.
  face(w, h, o) {
    const sm = Math.min(w, h), tiny = w < 200, r = R(o.r * 0.5), off = Math.max(1, R(sm * 0.005));
    const cs = sm * (tiny ? 0.5 : 0.3);
    return face(`border-radius: ${r}px; background-color: ${STOCK}; overflow: hidden; isolation: isolate; font-family: ${RT}; color: ${over(K.blue, K.pink)}; box-shadow: 0 0 0 1px rgba(90,70,40,.08), 0 1px 2px rgba(90,70,40,.14), 0 ${R(h * 0.05)}px ${R(h * 0.12)}px ${-R(h * 0.05)}px rgba(90,60,30,.34);`,
      () => {
        const corner = disc(w - cs * 0.08, cs * 0.08, cs * 1.5, K.pink) +
          (tiny ? '' : tone(cbox(w - cs * 0.7 + off, cs * 0.58 + off, cs * 0.66), K.blue, Math.max(4, sm * 0.017), rt(64, 36, 1, 0.55, 80), 15));
        const ls = R(sm * 0.085), lab = tiny ? '' : [K.pink, K.blue].map((c, k) => A(`left: ${R(sm * 0.075 + k * off * 1.6)}px; top: ${R(sm * 0.06 + k * off)}px; font-family: ${RD}; font-size: ${ls}px; font-weight: 800; line-height: 1; letter-spacing: -.02em; color: ${c}; ${MUL}`, o.side === 'back' ? 'A' : 'Q')).join('');
        return `<span class="lx-paper" style="position: absolute; inset: 0; background-color: ${STOCK};"></span>` + corner + lab;
      },
      { q: `color: ${K.blue}; font-weight: 500;`, a: `color: ${over(K.blue, K.pink)}; font-weight: 600; letter-spacing: -.01em;`, lh: 1.22 },
      { ink: over(K.blue, K.pink), paper: STOCK, muted: K.blue });
  },

  cover(d, o) {
    const i = di(d), P = RC[i], w = o.w, h = o.h, wide = o.shape === 'wide', sq = o.shape === 'square', tiny = w < 100, k = mo(d);
    const fr = f(Math.max(0.75, Math.min(1.2, w / 290)));
    return {
      bg: PAPER, ink: 'dark', name: `${P.name} · ${motifName(k)}`, ts: 1.04,
      title: `font-family: ${RD}; font-weight: 800; letter-spacing: -.025em; color: ${P.t || P.b}; text-shadow: ${fr}px ${fr}px 0 ${P.fr || P.a}; ${MUL}`,
      shadow: '0 0 0 1px rgba(90,70,40,.08), 0 1px 2px rgba(90,70,40,.16), 0 14px 26px -16px rgba(90,60,30,.45)',
      draw() {
        // the picture square: upper right on the wide Library card (bleeding off the corner), upper middle on portrait covers
        const HS = o.top && headSpot(o);
        const F = HS ? { cx: HS.x + HS.s / 2, cy: HS.y + HS.s / 2, s: HS.s } : banner(o) ? bannerSpot(o) : wide ? { cx: w - h * 0.31, cy: h * 0.26, s: h * 0.5 } : sq ? { cx: w * 0.5, cy: w * 0.5, s: w * 0.9 } : { cx: w * 0.54, cy: h * 0.33, s: w * 0.7 };
        const u = F.s, X = q => F.cx + q * u, Y = q => F.cy + q * u, off = Math.max(1, u * 0.022), p = Math.max(3.2, u * 0.052);
        const G = { X, Y, u, off, p, wide, a: P.a, b: P.b };
        const [ix, iy, is] = (wide && P.icw) || P.ic;
        const ic = sq ? '' : A(`${box(X(ix) - u * is / 2 + off, Y(iy) - u * is / 2 + off * 0.7, u * is, u * is)} ${MUL}`, icon(k, P.icc || P.b, tiny ? 3.4 : 2.7, '', RD));
        return print(P.art(G) + ic + (tiny || sq ? '' : mottle([[P.m[0], P.m[1], 22, 16, 0.2]])), { g: 0.7, sp: tiny || sq ? 0 : 0.85 });
      },
    };
  },

  avatar(s, ch) {
    const o = Math.max(1, s * 0.06);
    return `<span class="lx-paper" style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; overflow: hidden; isolation: isolate; background-color: ${PAPER}; display: flex; align-items: center; justify-content: center;">${A(`inset: 0; border-radius: 50%; background: ${K.pink}; transform: translate(${f(-o)}px, ${f(-o * 0.8)}px); ${MUL}`)}${A(`inset: 0; border-radius: 50%; background: ${K.blue}; transform: translate(${f(o)}px, ${f(o * 0.8)}px); ${MUL}`)}<span style="position: relative; font-family: ${RD}; font-size: ${R(s * 0.52)}px; font-weight: 800; line-height: 1; color: ${STOCK}; text-shadow: ${f(Math.max(0.6, s / 40))}px ${f(Math.max(0.5, s / 50))}px 0 ${K.pink}; transform: translateY(${f(-s * 0.02)}px);">${ch}</span>${s >= 34 ? '' + grain(0.6) + '' : ''}</span>`;
  },
  // around your photo: the pink and blue plates, printed a little out of register
  frame: s => { const o = Math.max(1, s * 0.05), b = Math.max(1.5, R(s / 22)); return A(`inset: 0; border-radius: 50%; box-shadow: 0 0 0 ${b}px ${K.pink}; transform: translate(${f(-o)}px, ${f(-o * 0.8)}px); ${MUL}`) + A(`inset: 0; border-radius: 50%; box-shadow: 0 0 0 ${b}px ${K.blue}; transform: translate(${f(o)}px, ${f(o * 0.8)}px); ${MUL}`); },
};

// Six decks, six ink pairs: a = the bright ink, b = the key ink (icon and deck name); t = name color if not b.
// ic / icw = [x, y, size] of the subject icon on portrait / wide covers, in units of the picture square from its center.
// m = where the ink is a little thin (percent of the cover).
const RC = [
  { name: 'Pink / Blue', a: K.pink, b: K.blue, ic: [0.1, -0.1, 0.46], icw: [0.06, 0.02, 0.42], m: [70, 12],
    art: ({ X, Y, u, p, wide, a, b }) => disc(X(0.08), Y(-0.1), u * 1.2, a) + (wide ? tone(cbox(X(-0.58), Y(0.26), u * 0.66), b, p, rt(66, 38, 1, 0.5, 80), 15) : tone(cbox(X(-0.44), Y(0.2), u * 0.74), b, p, rt(66, 36, 1, 0.5, 80), 15)) },
  { name: 'Yellow / Teal', a: K.yellow, b: K.teal, ic: [0.06, -0.3, 0.42], icw: [-0.08, -0.26, 0.38], m: [60, 18],
    art: ({ X, Y, u, off, a, b }) => disc(X(0.06), Y(-0.08), u * 1.2, a) + A(`${dbox(X(0.06) + off * 2, Y(-0.08) + off, u * 1.2)} background: ${sunset(b)}; ${MUL}`) },
  { name: 'Orange / Purple', a: K.orange, b: K.purple, ic: [0.04, -0.14, 0.46], icw: [-0.02, -0.12, 0.42], m: [64, 10],
    art: ({ X, Y, u, p, wide, a, b }) => disc(X(0.04), Y(-0.06), u * 1.12, a) + (wide ? tone(box(X(-0.66), Y(0.12), u * 1.6, u * 0.5), b, p, `linear-gradient(180deg, ${HT(0)} 0%, ${HT(0.74)} 58%, ${HT(0.62)} 74%, ${HT(0)} 100%)`, 45) : tone(box(X(-1.1), Y(0.1), u * 2.3, u * 0.58), b, p, `linear-gradient(180deg, ${HT(0)} 0%, ${HT(0.78)} 58%, ${HT(0.66)} 74%, ${HT(0)} 100%)`, 45)) },
  { name: 'Green / Pink', a: K.green, b: K.pink, t: over(K.green, K.pink), ic: [0.02, -0.1, 0.44], icw: [0, -0.02, 0.4], m: [72, 14],
    art: ({ X, Y, u, wide, a, b }) => ink(`${box(X(-0.56), Y(-0.66), u * 1.12, u * 1.1)} border-radius: 58% 42% 55% 45% / 46% 56% 44% 54%;`, a) + bands(wide ? dbox(X(-0.6), Y(0.36), u * 0.62) : dbox(X(-0.4), Y(0.3), u * 0.64), b, u * 0.045, u * 0.04, 135) },
  { name: 'Red / Navy', a: K.red, b: K.federal, ic: [0.02, -0.3, 0.42], icw: [0.02, -0.28, 0.38], m: [58, 8],
    art: ({ X, Y, u, off, a, b }) => ink(`${box(X(-0.64), Y(-0.66), u * 1.28, u * 0.64)} border-radius: ${R(u * 0.64)}px ${R(u * 0.64)}px 0 0;`, a) + bands(box(X(-0.64) + off * 2, Y(0.03) + off, u * 1.28, u * 0.44), b, u * 0.055, u * 0.048) },
  { name: 'Aqua / Wine', a: K.aqua, b: K.burgundy, ic: [-0.02, -0.34, 0.4], icw: [-0.06, -0.2, 0.38], m: [62, 20],
    art: ({ X, Y, u, a, b }) => ink(`${box(X(-0.36), Y(-0.7), u * 0.72, u * 1.3)} border-radius: ${R(u * 0.36)}px;`, a) + disc(X(0.3), Y(0.18), u * 0.66, b) },
];
