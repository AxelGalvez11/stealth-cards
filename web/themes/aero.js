import { A, R, di, face, photoAssets, photoCss, photo, photoBg, photoScrim, photoAvatar, ringFrame } from './kit.js';

// Frutiger Aero: glossy photos of blue sky, green grass, clear water, and bubbles, with a glassy card.
const F = "Mukta, 'Segoe UI', system-ui, sans-serif";
const NAMES = ['Lagoon', 'Sky', 'Meadow', 'Splash', 'Leaf', 'Bubbles'];
const bubble = (x, y, s) => A(`left: ${R(x)}px; top: ${R(y)}px; width: ${R(s)}px; height: ${R(s)}px; border-radius: 50%; background: radial-gradient(circle at 31% 27%, rgba(255,255,255,.98) 0 6%, rgba(255,255,255,.35) 15%, rgba(190,236,255,.08) 52%, rgba(255,255,255,.42) 88%, rgba(255,255,255,.8) 100%); box-shadow: inset 0 0 ${R(s / 7)}px rgba(255,255,255,.5), inset ${-R(s / 12)}px ${-R(s / 10)}px ${R(s / 6)}px rgba(110,205,255,.3);`);
export default {
  key: 'aero', board: 'Aero', name: 'Frutiger Aero', dark: false, fonts: 'family=Mukta:wght@400;500;600;700&',
  line: 'Mid-2000s optimism in real photos: blue sky, green grass, clear water, and bubbles.',
  assets: photoAssets('aero'), css: photoCss('aero'),
  bg: (w, h) => photoBg('aero', w, h),
  face(w, h, o) {
    const r = o.r, sm = Math.min(w, h);
    return face(`border-radius: ${r}px; background: linear-gradient(180deg, rgba(255,255,255,.97) 0%, rgba(244,252,255,.94) 48%, rgba(222,244,255,.92) 100%); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); box-shadow: inset 0 0 0 1px rgba(255,255,255,.95), inset 0 -3px 0 rgba(140,215,255,.35), 0 0 0 1px rgba(30,130,210,.24), 0 ${R(h * 0.04)}px ${R(h * 0.1)}px ${-R(h * 0.03)}px rgba(0,80,160,.45); color: #0A3656; font-family: ${F}; overflow: hidden;`,
      () => A(`left: 0; right: 0; top: 0; height: 46%; border-radius: ${r}px ${r}px 50% 50% / ${r}px ${r}px ${R(h * 0.1)}px ${R(h * 0.1)}px; background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,0));`) + (w >= 300 ? bubble(w - sm * 0.2, sm * 0.07, sm * 0.12) + bubble(w - sm * 0.1, sm * 0.2, sm * 0.05) : ''),
      { q: 'color: #3E7597; font-weight: 500;', a: 'color: #0A3656; font-weight: 700; letter-spacing: -.005em;' }, { ink: '#0A3656', paper: '#F4FCFF', muted: '#3E7597' });
  },
  cover(d, o) {
    const i = di(d);
    return {
      bg: '#1470DA', ink: 'light', name: NAMES[i],
      title: `font-family: ${F}; font-weight: 700; letter-spacing: -.01em; text-shadow: 0 1px 3px rgba(0,40,90,.5);`,
      shadow: '0 1px 2px rgba(0,60,120,.18), 0 16px 30px -14px rgba(0,70,140,.5)',
      draw: () => photo(`aero-c${i}`) + photoScrim('0,42,96', o, 0.28, 0.66) + A('left: 0; right: 0; top: 0; height: 44%; background: linear-gradient(180deg, rgba(255,255,255,.3), rgba(255,255,255,0));') + A(`inset: 0; border-radius: ${o.r}px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.5), inset 0 1px 0 rgba(255,255,255,.8);`),
    };
  },
  avatar: (s, ch) => photoAvatar('aero-c1', s, ch, F, 'rgba(255,255,255,.95)', '0,50,110'),
  frame: s => ringFrame(s, 'rgba(255,255,255,.95)', '0,50,110'),
};
