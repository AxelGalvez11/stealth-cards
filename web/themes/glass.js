import { A, R, f, di, mo, motifName, lay, icon, face, grain, banner, bannerSpot, headSpot } from './kit.js';

// Frosted glass: soft orbs of colored light on an airy white, seen through panes of frosted glass (in the spirit of
// visionOS and iOS liquid glass). About color and light, not metal.
const GL_F = "'Plus Jakarta Sans', system-ui, sans-serif";
const INK = '#0D1230';
// Colors of light, as 'r,g,b'. Each orb is a pair: a lit core and its edge.
const C = {
  iris: ['124,136,255', '150,118,255'],
  violet: ['170,128,255', '214,140,255'],
  sky: ['96,190,255', '118,150,255'],
  aqua: ['98,226,214', '96,188,255'],
  mint: ['132,236,196', '92,214,220'],
  pink: ['255,138,196', '232,132,255'],
  rose: ['255,128,168', '255,160,140'],
  peach: ['255,184,128', '255,128,160'],
  butter: ['255,226,128', '255,176,120'],
};
// A ball of colored light: a brighter core up and to the left, and a soft edge (blur grows with size).
const orb = (cx, cy, s, [c1, c2], b = 0.12, op = 1, css = '') => A(`left: ${R(cx - s / 2)}px; top: ${R(cy - s / 2)}px; width: ${R(s)}px; height: ${R(s)}px; border-radius: 50%; background: radial-gradient(circle at 36% 32%, rgb(${c1}) 0%, rgba(${c2},.94) 56%, rgba(${c2},.5) 100%); filter: blur(${f(s * b)}px); opacity: ${op}; ${css}`);
// The rim of a glass pane: a hairline that catches the light at the top left and again at the bottom right.
const rim = (r, w = 1, a = 1) => A(`inset: 0; border-radius: ${r}; padding: ${w}px; background: linear-gradient(145deg, rgba(255,255,255,${a}) 0%, rgba(255,255,255,${f(a * 0.3)}) 26%, rgba(255,255,255,0) 50%, rgba(255,255,255,${f(a * 0.22)}) 74%, rgba(255,255,255,${f(a * 0.85)}) 100%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; pointer-events: none;`);
const blur = (px, sat = 1.5) => `-webkit-backdrop-filter: blur(${px}px) saturate(${sat}); backdrop-filter: blur(${px}px) saturate(${sat});`;

// Study background: orbs on an airy white. They sit around the card's corners, so the glass frosts their edges, and
// leave the middle (where the words are) white. [cx, cy, size, color, blur] per screen. One drifts, very slowly.
const BG = {
  wide: [[300, 200, 600, 'iris', 0.12], [1150, 690, 640, 'peach', 0.12], [1180, 190, 400, 'aqua', 0.13], [230, 720, 440, 'pink', 0.13], [860, 70, 240, 'butter', 0.16, 0.75]],
  tall: [[60, 170, 320, 'iris', 0.12], [360, 380, 230, 'aqua', 0.13], [40, 640, 260, 'pink', 0.13], [340, 760, 340, 'peach', 0.12], [260, 50, 170, 'butter', 0.16, 0.75]],
  mid: [[110, 190, 360, 'iris', 0.12], [560, 560, 380, 'peach', 0.12], [560, 170, 240, 'aqua', 0.13], [90, 560, 260, 'pink', 0.13]],
  tiny: [[190, 30, 150, 'iris', 0.12], [20, 200, 150, 'pink', 0.12], [196, 196, 130, 'peach', 0.12]],
};
// the white at the middle of each screen, behind the words
const CORE = { wide: 'ellipse 34% 30% at 50% 44%', tall: 'ellipse 60% 30% at 50% 50%', mid: 'ellipse 44% 30% at 50% 50%', tiny: 'ellipse 50% 40% at 60% 70%' };

// Six palettes of light for the covers: [name, base tint, orbs A (behind the glass), B, C, shadow].
const GL_C = [
  { name: 'Aurora', base: ['236,252,248', '232,244,255'], a: C.aqua, b: C.violet, c: C.mint, deep: '40,120,150' },
  { name: 'Iris', base: ['238,240,255', '244,238,255'], a: C.iris, b: C.sky, c: C.violet, deep: '70,70,190' },
  { name: 'Blossom', base: ['255,240,246', '248,240,255'], a: C.pink, b: C.peach, c: C.violet, deep: '170,70,140' },
  { name: 'Citrus', base: ['255,248,236', '255,240,240'], a: C.butter, b: C.rose, c: C.peach, deep: '180,100,60' },
  { name: 'Dusk', base: ['244,238,255', '255,240,246'], a: C.violet, b: C.rose, c: C.iris, deep: '110,70,180' },
  { name: 'Tide', base: ['234,246,255', '236,252,250'], a: C.sky, b: C.mint, c: C.iris, deep: '40,100,170' },
];

export default {
  key: 'glass', board: 'Glass', name: 'Frosted glass', dark: false, headArt: true, fonts: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800&',
  line: 'Soft orbs of colored light behind panes of frosted glass. Bright, airy, and clean.',
  css: '@keyframes glass-drift{0%{transform:translate(0,0)}100%{transform:translate(46px,28px)}}',
  bg(w, h) {
    const L = lay(w, h);
    const orbs = BG[L].map(([x, y, s, c, b, op = 1], k) => orb(x, y, s, C[c], b, op, k === 0 && L !== 'tiny' ? 'animation: glass-drift 48s ease-in-out infinite alternate;' : '')).join('');
    return `<div style="position: absolute; inset: 0; background: linear-gradient(180deg, #F7F6FD 0%, #F4F6FC 55%, #F7F5FB 100%);"></div>${orbs}${A(`inset: 0; background: radial-gradient(${CORE[L]}, rgba(255,255,255,.7), rgba(255,255,255,0) 100%);`)}${grain(0.1)}`;
  },
  face(w, h, o) {
    const sm = Math.min(w, h), r = R(o.r * 1.15), bl = Math.max(10, Math.min(28, R(sm * 0.09))), rw = sm > 150 ? 1.5 : 1;
    return face(`border-radius: ${r}px; background: radial-gradient(ellipse 70% 60% at 0% 0%, rgba(255,255,255,.34), rgba(255,255,255,0) 70%), radial-gradient(ellipse 60% 70% at 100% 100%, rgba(255,168,200,.15), rgba(255,168,200,0) 70%), radial-gradient(ellipse 55% 65% at 0% 100%, rgba(150,158,255,.13), rgba(150,158,255,0) 70%), radial-gradient(ellipse 50% 60% at 100% 0%, rgba(110,214,240,.11), rgba(110,214,240,0) 70%), linear-gradient(160deg, rgba(255,255,255,.5) 0%, rgba(255,255,255,.38) 50%, rgba(255,255,255,.34) 100%); ${blur(bl)} box-shadow: inset 0 0 ${R(sm * 0.08)}px rgba(255,255,255,.55), 0 0 0 .5px rgba(40,48,110,.12), 0 1px 2px rgba(40,48,110,.06), 0 ${R(h * 0.05)}px ${R(h * 0.12)}px ${-R(h * 0.03)}px rgba(46,56,140,.16), 0 ${R(h * 0.12)}px ${R(h * 0.3)}px ${-R(h * 0.1)}px rgba(46,56,140,.3); font-family: ${GL_F}; color: ${INK};`,
      () => rim(`${r}px`, rw) + A(`left: ${R(r * 0.9)}px; right: ${R(r * 0.9)}px; top: 0; height: ${rw}px; background: linear-gradient(90deg, rgba(255,255,255,0), #FFFFFF 30%, #FFFFFF 50%, rgba(255,255,255,.3) 90%, rgba(255,255,255,0));`),
      { q: 'color: #535B7E; font-weight: 500;', a: 'font-weight: 700; letter-spacing: -.016em; word-spacing: .04em;' }, { ink: INK, paper: '#F4F5FC', muted: '#535B7E' });
  },
  cover(d, o) {
    const i = di(d), P = GL_C[i], w = o.w, h = o.h, wide = o.shape === 'wide', sq = o.shape === 'square', tiny = w < 100, k = mo(d);
    return {
      bg: `rgb(${P.base[0]})`, ink: 'dark', name: `${P.name} · ${motifName(k)}`,
      title: `font-family: ${GL_F}; font-weight: 700; letter-spacing: -.02em; word-spacing: .05em; color: ${INK};`, ts: 1,
      shadow: `0 1px 2px rgba(${P.deep},.1), 0 16px 32px -16px rgba(${P.deep},.5)`,
      draw() {
        // the glass tile that holds the subject: upper right on the library card, upper middle on portrait covers
        const HS = o.top && headSpot(o);
        const T = HS ? { s: R(HS.s * 0.78), x: R(HS.x + HS.s * 0.12), y: R(HS.y + HS.s * 0.11) } : banner(o) ? (B => { const s = R(B.s * 0.83); return { s, x: R(B.cx - s / 2), y: R(B.cy - s / 2) }; })(bannerSpot(o)) : wide ? { s: R(h * 0.34), x: R(w - 24 - h * 0.34), y: R(h * 0.2) } : sq ? { s: R(w * 0.66), x: R(w * 0.17), y: R(w * 0.17) } : { s: R(w * 0.5), x: R(w * 0.25), y: R(h * (tiny ? 0.14 : 0.2)) };
        const tr = R(T.s * 0.3);
        const orbs = wide
          ? orb(T.x + T.s * 0.18, T.y + T.s * 0.2, h * 0.58, P.a, 0.08) + orb(T.x + T.s * 1.02, T.y + T.s * 1.0, h * 0.4, P.b, 0.09) + orb(w * 0.04, -h * 0.02, h * 0.5, P.c, 0.1, 0.55)
          : orb(T.x + T.s * 0.2, T.y + T.s * 0.22, w * 0.78, P.a, 0.08) + orb(T.x + T.s * 1.0, T.y + T.s * 0.98, w * 0.56, P.b, 0.09) + orb(w * 0.02, h * 0.74, w * 0.6, P.c, 0.1, 0.8);
        const tile = A(`left: ${T.x}px; top: ${T.y}px; width: ${T.s}px; height: ${T.s}px; box-sizing: border-box; border-radius: ${tr}px; border: 1px solid rgba(255,255,255,.55); background: linear-gradient(150deg, rgba(255,255,255,.42), rgba(255,255,255,.16)); ${blur(Math.max(6, R(T.s * 0.14)), 1.6)} box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 0 ${R(T.s * 0.1)}px rgba(255,255,255,.35), 0 ${R(T.s * 0.08)}px ${R(T.s * 0.2)}px ${-R(T.s * 0.06)}px rgba(${P.deep},.4);`,
          rim(`${tr - 1}px`, 1) + A(`left: 24%; top: 24%; width: 52%; filter: drop-shadow(0 1px 1px rgba(${P.deep},.35));`, icon(k, '#FFFFFF', tiny ? 3.4 : 2.6, '', GL_F)));
        const calm = wide
          ? A(`left: 0; right: 0; bottom: 0; height: 58%; ${blur(18, 1.2)} -webkit-mask-image: linear-gradient(to top, #000 55%, transparent); mask-image: linear-gradient(to top, #000 55%, transparent); background: linear-gradient(to top, rgba(255,255,255,.62), rgba(255,255,255,.3) 60%, rgba(255,255,255,0));`)
          : sq ? '' : A(`left: 0; right: 0; bottom: 0; height: 46%; ${blur(12, 1.2)} -webkit-mask-image: linear-gradient(to top, #000 50%, transparent); mask-image: linear-gradient(to top, #000 50%, transparent); background: linear-gradient(to top, rgba(255,255,255,.6), rgba(255,255,255,.25) 60%, rgba(255,255,255,0));`);
        return `<span style="position: absolute; inset: 0; background: linear-gradient(160deg, rgb(${P.base[0]}), rgb(${P.base[1]}));"></span>${orbs}${calm}${tile}${A(`inset: 0; border-radius: ${o.r}px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.55), inset 0 1px 0 rgba(255,255,255,.9);`)}`;
      },
    };
  },
  // a glass circle: a ring of colored light, a frosted lens inside it, and the initial on the lens
  avatar(s, ch) {
    const big = s >= 48;
    const orbs = orb(s * 0.18, s * 0.2, s * 0.96, C.iris, 0.1) + orb(s * 0.92, s * 0.86, s * 0.86, C.peach, 0.1) + orb(s * 0.96, s * 0.08, s * 0.56, C.aqua, 0.1) + orb(s * 0.04, s * 0.98, s * 0.5, C.pink, 0.1);
    const lens = big
      ? A(`inset: ${R(s * 0.1)}px; border-radius: 50%; background: linear-gradient(160deg, rgba(255,255,255,.36), rgba(255,255,255,.08)); ${blur(R(s * 0.08), 1.6)} box-shadow: 0 ${R(s * 0.02)}px ${R(s * 0.06)}px rgba(60,50,160,.2), inset 0 0 ${R(s * 0.06)}px rgba(255,255,255,.4);`, rim('50%', Math.max(1, R(s / 64))))
      : A('inset: 0; border-radius: 50%; background: linear-gradient(160deg, rgba(255,255,255,.34), rgba(255,255,255,.04));');
    return `<span style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; overflow: hidden; background: #EEF0FF; box-shadow: 0 0 0 .5px rgba(60,50,160,.12), 0 ${Math.max(1, R(s / 24))}px ${Math.max(2, R(s / 7))}px rgba(80,70,200,.26); display: flex; align-items: center; justify-content: center;">${orbs}${lens}${rim('50%', Math.max(1, R(s / 48)))}<span style="position: relative; font-family: ${GL_F}; font-size: ${R(s * (big ? 0.4 : 0.44))}px; font-weight: 700; line-height: 1; letter-spacing: -.02em; color: #FFFFFF; text-shadow: 0 ${Math.max(1, R(s / 48))}px ${Math.max(1, R(s / 24))}px rgba(50,40,140,.4);">${ch}</span></span>`;
  },
  // around your photo: the glass rim, catching the light
  frame: s => `<span style="position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 .5px rgba(60,50,160,.12), 0 ${Math.max(1, R(s / 24))}px ${Math.max(2, R(s / 7))}px rgba(80,70,200,.26); pointer-events: none;"></span>${rim('50%', Math.max(1.5, R(s / 30)))}`,
};
