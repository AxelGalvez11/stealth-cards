import { A, V, R, f, di, mo, motifName, lay, focal, scrim, icon, sparkle, star5, face, banner, BANNER_X } from './kit.js';

// Dreamcore: soft pastel dreams, with clouds, a checkerboard floor, and a door to nowhere.
const DR_F = "Quicksand, 'Varela Round', system-ui, sans-serif";
const checker = (top, size, persp, c1, c2 = '#FFFFFF', op = 0.9) => A(`left: -60%; right: -60%; top: ${top}; height: 120%; transform: perspective(${R(persp)}px) rotateX(62deg); transform-origin: 50% 0; background-color: ${c2}; background-image: conic-gradient(${c1} 90deg, ${c2} 90deg 180deg, ${c1} 180deg 270deg, ${c2} 270deg); background-size: ${R(size)}px ${R(size)}px; opacity: ${op};`);
// Clouds drift very slowly (half a minute and more each way); the door floats; covers stay still.
const cloud = (x, y, s, d = 0, move = true) => A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(s)}px; height: ${R(s * 0.5)}px; ${move ? `animation: sk-drift ${34 + d * 4}s ease-in-out ${-d * 5}s infinite alternate;` : ''} filter: blur(${f(Math.max(0.4, s / 60))}px);`,
  A('left: 0; right: 0; bottom: 0; height: 52%; border-radius: 999px; background: #FFFFFF;') + A('left: 16%; bottom: 20%; width: 38%; height: 70%; border-radius: 50%; background: #FFFFFF;') + A('left: 40%; bottom: 26%; width: 44%; height: 82%; border-radius: 50%; background: #FFFFFF;'));
const door = (x, y, dw, move = true) => A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(dw)}px; height: ${R(dw * 1.7)}px; box-sizing: border-box; border-radius: ${R(dw * 0.5)}px ${R(dw * 0.5)}px 2px 2px; background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,214,238,.7)); box-shadow: 0 0 ${R(dw * 0.5)}px rgba(255,255,255,.95), inset 0 0 0 ${Math.max(2, R(dw * 0.07))}px #FFFFFF; ${move ? 'animation: sk-float 14s ease-in-out infinite;' : ''}`, A(`right: 16%; top: 56%; width: ${Math.max(2, R(dw * 0.1))}px; height: ${Math.max(2, R(dw * 0.1))}px; border-radius: 50%; background: #F2A7CF;`));
const moon = (x, y, s) => A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(s)}px; height: ${R(s)}px; border-radius: 50%; box-shadow: ${R(s * 0.2)}px ${-R(s * 0.06)}px 0 0 #FFF6C8; filter: drop-shadow(0 0 ${R(s * 0.2)}px rgba(255,246,200,.9));`);
const stairs = (x, y, s) => A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(s)}px; filter: drop-shadow(0 0 ${R(s * 0.08)}px rgba(255,255,255,.95));`, V('0 0 60 60', '<path d="M4 56h12v-10h12v-10h12v-10h12v-10h4v44H4z" fill="#FFFFFF"/>'));
const rainbow = (x, y, s) => A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(s)}px; height: ${R(s / 2)}px; overflow: hidden; opacity: .85;`, ['#FFB3C7', '#FFD8A8', '#FFF3A8', '#C2F5C8', '#B8DCFF', '#D5C2FF'].map((c, k) => A(`left: ${R(k * s * 0.05)}px; top: ${R(k * s * 0.05)}px; width: ${R(s - k * s * 0.1)}px; height: ${R(s - k * s * 0.1)}px; box-sizing: border-box; border-radius: 50%; border: ${Math.max(2, R(s * 0.05))}px solid ${c};`)).join(''));
const DR_C = [
  { name: 'Morning', sky: 'linear-gradient(180deg, #9EC9FF 0%, #D6C6FF 50%, #FFD1EC 100%)', floor: '#FFB8DC', obj: 'door' },
  { name: 'Cotton', sky: 'linear-gradient(180deg, #FFC2E3 0%, #FFE0F0 55%, #FFFFFF 100%)', floor: '#C9B8FF', obj: 'cloud' },
  { name: 'Lilac', sky: 'linear-gradient(180deg, #B9A2FF 0%, #DCCFFF 50%, #F7F1FF 100%)', floor: '#FFD6A5', obj: 'moon' },
  { name: 'Mint', sky: 'linear-gradient(180deg, #9FE8D6 0%, #CFF7EC 55%, #F6FFFB 100%)', floor: '#FFC2E0', obj: 'stairs' },
  { name: 'Peach', sky: 'linear-gradient(180deg, #FFC4A8 0%, #FFE2D3 55%, #FFF6F0 100%)', floor: '#B8DCFF', obj: 'rainbow' },
  { name: 'Cloud nine', sky: 'linear-gradient(180deg, #8FCBFF 0%, #CFE8FF 55%, #F2F9FF 100%)', floor: '#FFF1A8', obj: 'star' },
];
export default {
  key: 'dreamcore', board: 'Dreamcore', name: 'Dreamcore', dark: false, fonts: 'family=Quicksand:wght@500;600;700&',
  line: 'Soft pastel dreams: clouds, a checkerboard floor, and a door to nowhere.',
  bg(w, h) {
    const L = lay(w, h), hz = { wide: 0.68, tall: 0.84, mid: 0.72, tiny: 0.72 }[L];
    const bits = {
      wide: () => rainbow(60, 70, 300) + cloud(-60, 150, 300, 0) + cloud(1110, 60, 360, 1) + cloud(1180, 430, 220, 2) + cloud(40, 400, 210, 3) + door(1250, 250, 92) + A(`left: 70px; top: 560px; font-family: ${DR_F}; font-size: 20px; font-weight: 600; letter-spacing: .32em; color: rgba(255,255,255,.95); text-shadow: 0 0 14px rgba(255,150,210,.95);`, 'are you awake?') + [[280, 250], [1120, 300], [300, 110], [1380, 160], [180, 760], [1300, 780]].map(([x, y], k) => sparkle(x, y, 22, '#FFFFFF', k * 0.6)).join(''),
      tall: () => cloud(-30, 0, 200, 0) + cloud(230, 20, 180, 2) + sparkle(170, 30, 16, '#FFFFFF', 0) + sparkle(350, 70, 12, '#FFFFFF', 1),
      mid: () => rainbow(20, 30, 200) + cloud(-40, 90, 220, 0) + cloud(420, 30, 260, 1) + door(560, 560, 50) + cloud(-10, 540, 170, 3) + A(`left: 170px; top: 150px; font-family: ${DR_F}; font-size: 14px; font-weight: 600; letter-spacing: .3em; color: rgba(255,255,255,.95); text-shadow: 0 0 12px rgba(255,150,210,.95);`, 'are you awake?') + [[600, 200], [40, 330], [300, 640]].map(([x, y], k) => sparkle(x, y, 18, '#FFFFFF', k * 0.6)).join(''),
      tiny: () => cloud(-20, 20, 110, 0, false) + cloud(80, 110, 80, 2, false) + sparkle(110, 20, 12, '#FFFFFF', 0, false),
    }[L]();
    return `<div style="position: absolute; inset: 0; background: linear-gradient(180deg, #9EC9FF 0%, #D6C6FF 40%, #FFC9E8 ${R(hz * 100)}%, #FFE9F4 100%);"></div>${checker(`${R(hz * 100)}%`, Math.max(24, w * 0.05), Math.max(160, h * 0.4), '#FFB3DA')}${A(`left: 0; right: 0; top: ${R(hz * 100 - 5)}%; height: 10%; background: linear-gradient(180deg, rgba(255,233,244,0), #FFE9F4 50%, rgba(255,233,244,0));`)}${bits}<div style="position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0) 50%, rgba(255,190,225,.45)); pointer-events: none;"></div>`;
  },
  face(w, h, o) {
    const sm = Math.min(w, h);
    return face(`border-radius: ${R(o.r * 1.1)}px; background: rgba(255,255,255,.9); box-shadow: 0 0 0 1px rgba(255,255,255,.95), 0 0 ${R(sm * 0.14)}px ${R(sm * 0.02)}px rgba(255,185,228,.65); color: #684A8E; font-family: ${DR_F}; text-align: center;`,
      () => (w >= 200 ? sparkle(w - sm * 0.12, sm * 0.06, sm * 0.07, '#F7B6DA', 0, false) + sparkle(sm * 0.05, h - sm * 0.13, sm * 0.05, '#C9B6FF', 0, false) : ''),
      { q: 'color: #A58BC4; font-weight: 600;', a: 'color: #684A8E; font-weight: 700;' }, { ink: '#684A8E', paper: '#FFFFFF', muted: '#A58BC4' });
  },
  cover(d, o) {
    const i = di(d), P = DR_C[i], F = focal(o), tiny = o.w < 100, wide = o.shape === 'wide', w = o.w, h = o.h, k = mo(d);
    return {
      bg: '#F2E9FF', ink: 'dark', name: `${P.name} · ${motifName(k)}`,
      title: `font-family: ${DR_F}; font-weight: 700; letter-spacing: -.01em; color: #4A2D73; text-shadow: 0 0 10px rgba(255,255,255,.95), 0 0 2px #FFFFFF;`,
      shadow: '0 0 0 1px rgba(255,255,255,.7), 0 0 28px rgba(255,190,230,.6)',
      draw() {
        const obj = { door: () => door(F.x + F.s * 0.3, F.y + F.s * 0.02, F.s * 0.4, false), cloud: () => cloud(F.x, F.y + F.s * 0.2, F.s, 0, false), moon: () => moon(F.x + F.s * 0.2, F.y + F.s * 0.05, F.s * 0.56), stairs: () => stairs(F.x + F.s * 0.12, F.y + F.s * 0.04, F.s * 0.72), rainbow: () => rainbow(F.x, F.y + F.s * 0.16, F.s), star: () => A(`left: ${R(F.x + F.s * 0.16)}px; top: ${R(F.y + F.s * 0.04)}px; width: ${R(F.s * 0.68)}px; filter: drop-shadow(0 0 ${R(F.s * 0.08)}px rgba(255,246,190,.95));`, V('0 0 40 40', `<path d="${star5(20, 20, 19, 0.5)}" fill="#FFF3A6" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>`)) }[P.obj]();
        const ic = tiny ? '' : A(`left: ${R(banner(o) ? w * BANNER_X - h * 0.5 : wide ? w * 0.4 : w * 0.66)}px; top: ${R(wide ? h * 0.3 : h * 0.34)}px; width: ${R(wide ? h * 0.18 : w * 0.24)}px; filter: drop-shadow(0 1px 2px rgba(106,74,142,.55)) drop-shadow(0 0 ${R(w * 0.02)}px rgba(255,255,255,.95));`, icon(k, '#FFFFFF', 3, '', DR_F));
        // on a banner, clouds and sparkles keep the size they have on a Library card
        const u = banner(o) ? h * 1.49 : w;
        return `<span style="position: absolute; inset: 0; background: ${P.sky};"></span>${checker('60%', Math.max(10, u * 0.12), Math.max(90, h * 0.8), P.floor)}${tiny ? '' : cloud(-u * 0.1, h * 0.04, u * 0.5, 1, false) + cloud(w - u * 0.4, h * 0.46, u * 0.46, 3, false)}${obj}${ic}${tiny ? '' : sparkle(u * 0.08, h * 0.42, u * 0.05, '#FFFFFF', 0, false) + sparkle(banner(o) ? w * 0.5 : w * 0.52, h * 0.14, u * 0.045, '#FFFFFF', 0, false)}${scrim('255,255,255', 0.7, 50)}`;
      },
    };
  },
  avatar: (s, ch) => `<span style="position: relative; width: ${s}px; height: ${s}px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(180deg, #9EC9FF 0%, #D6C6FF 50%, #FFD1EC 100%); box-shadow: 0 0 ${R(s / 4)}px rgba(255,190,230,.8), inset 0 0 0 ${Math.max(2, R(s / 20))}px rgba(255,255,255,.9); overflow: hidden; display: flex; align-items: center; justify-content: center;">${A(`left: 8%; top: 58%; width: 84%; height: 30%; border-radius: 999px; background: #FFFFFF; filter: blur(${f(Math.max(0.5, s / 40))}px);`)}<span style="position: relative; font-family: ${DR_F}; font-size: ${R(s * 0.44)}px; font-weight: 700; line-height: 1; color: #FFFFFF; text-shadow: 0 0 ${R(s / 8)}px rgba(200,120,200,.95);">${ch}</span></span>`,
  // around your photo: a soft pink glow and a white ring
  frame: s => `<span style="position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 ${R(s / 4)}px rgba(255,190,230,.8), inset 0 0 0 ${Math.max(2, R(s / 20))}px rgba(255,255,255,.9); pointer-events: none;"></span>`,
};
