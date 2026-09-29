import { A, R, di, face, photoAssets, photoCss, photo, photoBg, photoScrim, photoAvatar, ringFrame } from './kit.js';

// Vaporwave · Dolphins: dreamy pink-sky photo collages (clouds, dolphins, a marble bust, a lavender sea) and a pearly
// card with a holographic edge.
const F = "'Space Grotesk', system-ui, sans-serif";
const WIDE = "Unbounded, 'Space Grotesk', system-ui, sans-serif";
const NAMES = ['Dolphin', 'Clouds', 'Statue', 'Sunset', 'Palms', 'Moon'];
export default {
  key: 'vapordolphins', board: 'VaporDolphins', name: 'Vaporwave · Dolphins', short: 'Vapor dolphins', dark: false, fonts: 'family=Space+Grotesk:wght@400;500;600&family=Unbounded:wght@500&',
  line: 'Dreamy pink skies, flying dolphins, and a lavender sea.',
  assets: photoAssets('vpd'), css: photoCss('vpd'),
  bg: (w, h) => photoBg('vpd', w, h),
  face(w, h, o) {
    const r = o.r, b = w > 400 ? 2 : 1.5;
    return face(`border-radius: ${r}px; border: ${b}px solid transparent; background: linear-gradient(160deg, rgba(255,255,255,.95), rgba(255,244,251,.9)) padding-box, linear-gradient(120deg, #FFB3E6, #C9B6FF 35%, #9EE7FF 65%, #FFD6F0) border-box; -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); color: #3A1E5C; font-family: ${F}; box-shadow: 0 0 ${R(w * 0.06)}px rgba(255,160,220,.35), 0 ${R(h * 0.05)}px ${R(h * 0.14)}px ${-R(h * 0.05)}px rgba(90,40,120,.45);`,
      () => A(`inset: 0; border-radius: ${r}px; background: linear-gradient(115deg, rgba(255,190,235,.16), rgba(200,185,255,0) 40%, rgba(160,230,255,.14) 80%, rgba(255,214,240,0));`),
      { q: 'color: #8A6FA8; font-weight: 500;', a: 'font-weight: 600; letter-spacing: -.01em;' }, { ink: '#3A1E5C', paper: '#FFF4FB', muted: '#8A6FA8' });
  },
  cover(d, o) {
    const i = di(d);
    return {
      bg: '#B98AC9', ink: 'light', name: NAMES[i], ts: 0.86,
      title: `font-family: ${WIDE}; font-weight: 500; letter-spacing: .01em; line-height: 1.15; text-shadow: 0 1px 12px rgba(70,20,100,.45);`,
      shadow: '0 1px 2px rgba(80,30,110,.2), 0 16px 30px -14px rgba(80,30,110,.5)',
      draw: () => photo(`vpd-c${i}`) + photoScrim('62,24,92', o, 0.24, 0.6),
    };
  },
  avatar: (s, ch) => photoAvatar('vpd-c0', s, ch, WIDE, 'rgba(255,255,255,.95)', '80,30,110'),
  frame: s => ringFrame(s, 'rgba(255,255,255,.95)', '80,30,110'),
};
