import { R, di, face, photoAssets, photoCss, photo, photoBg, photoScrim, photoAvatar, ringFrame } from './kit.js';

// Vaporwave · Poolside: flat 1980s city-pop paintings (navy night sky, palms, pastel buildings, pools) and a flat pastel
// card with a hard shadow, like the buildings in them.
const F = "Jost, 'Futura', system-ui, sans-serif";
const NAMES = ['Villa', 'Motel', 'Moon pool', 'Dusk', 'Court', 'Seaside'];
export default {
  key: 'vaporwave', board: 'Vaporwave', name: 'Vaporwave · Poolside', short: 'Vapor pool', dark: true, fonts: 'family=Jost:wght@400;500;600&',
  line: 'Flat 1980s city-pop paintings: a navy night sky, palm trees, pastel buildings, and pools.',
  assets: photoAssets('vpa'), css: photoCss('vpa'),
  bg: (w, h) => photoBg('vpa', w, h),
  face(w, h, o) {
    const r = Math.max(3, R(Math.min(w, h) * 0.014)), sh = Math.max(3, R(Math.min(w, h) * 0.03));
    return face(`border-radius: ${r}px; background: #FBE1E8; color: #10235E; font-family: ${F}; box-shadow: ${-sh}px ${sh}px 0 rgba(6,14,58,.5), 0 ${R(h * 0.08)}px ${R(h * 0.2)}px ${-R(h * 0.08)}px rgba(6,14,58,.5);`,
      '', { q: 'color: #5A6BA0; font-weight: 500;', a: 'font-weight: 600; letter-spacing: -.005em;' }, { ink: '#10235E', paper: '#FBE1E8', muted: '#5A6BA0' });
  },
  cover(d, o) {
    const i = di(d);
    return {
      bg: '#0F1E5C', ink: 'light', name: NAMES[i],
      title: `font-family: ${F}; font-weight: 600; letter-spacing: .01em; text-shadow: 0 1px 10px rgba(6,14,58,.45);`,
      shadow: '0 1px 2px rgba(6,14,58,.25), 0 16px 30px -14px rgba(6,14,58,.6)',
      draw: () => photo(`vpa-c${i}`) + photoScrim('8,16,62', o, 0.3, 0.7),
    };
  },
  avatar: (s, ch) => photoAvatar('vpa-c0', s, ch, F, '#FBE1E8', '6,14,58'),
  frame: s => ringFrame(s, '#FBE1E8', '6,14,58'),
};
