import { A, R, di, face, photoAssets, photoCss, photo, photoBg, photoScrim, photoAvatar, ringFrame } from './kit.js';

// Liminal space · Flooded hall: photos of empty tiled passages and pools at night, lit pink and violet.
const F = "'IBM Plex Sans', system-ui, sans-serif";
const PLACES = ['Pool hall', 'Platform', 'Stairway', 'Bathhouse', 'Corridor', 'Water slide'];
export default {
  key: 'liminal', board: 'Liminal', name: 'Liminal · Flooded hall', short: 'Liminal hall', dark: true, fonts: 'family=IBM+Plex+Sans:wght@400;500;600&',
  line: 'Real photos of empty tiled passages at night, flooded and lit pink and violet.',
  assets: photoAssets('lmf'), css: photoCss('lmf'),
  bg: (w, h) => photoBg('lmf', w, h) + A('inset: 0; background: rgba(18,6,28,.12);'),
  face(w, h, o) {
    const r = Math.min(o.r, R(Math.min(w, h) * 0.08));
    return face(`border-radius: ${r}px; background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(247,243,251,.92)); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); color: #1C1622; font-family: ${F}; box-shadow: inset 0 1px 0 #FFFFFF, inset 0 0 0 1px rgba(255,255,255,.6), 0 0 0 1px rgba(255,120,220,.16), 0 ${R(h * 0.06)}px ${R(h * 0.16)}px ${-R(h * 0.05)}px rgba(30,0,40,.6), 0 0 ${R(w * 0.08)}px rgba(255,110,210,.2);`,
      () => A(`left: 10%; right: 10%; top: 0; height: ${Math.max(1, R(h * 0.006))}px; background: linear-gradient(90deg, rgba(255,120,220,0), rgba(255,130,225,.95), rgba(255,120,220,0)); box-shadow: 0 0 ${Math.max(2, R(h * 0.03))}px rgba(255,120,220,.85);`),
      { q: 'color: #6E6278; font-weight: 500;', a: 'font-weight: 600; letter-spacing: -.015em;' }, { ink: '#1C1622', paper: '#F7F3FB', muted: '#6E6278' });
  },
  cover(d, o) {
    const i = di(d);
    return {
      bg: '#1A1024', ink: 'light', name: PLACES[i],
      title: `font-family: ${F}; font-weight: 600; letter-spacing: -.01em; text-shadow: 0 1px 12px rgba(0,0,0,.4);`,
      shadow: '0 1px 2px rgba(0,0,0,.2), 0 16px 30px -14px rgba(20,0,40,.55)',
      draw: () => photo(`lmf-c${i}`) + photoScrim('14,6,22', o),
    };
  },
  avatar: (s, ch) => photoAvatar('lmf-c0', s, ch, F, 'rgba(255,170,235,.9)', '20,0,30'),
  frame: s => ringFrame(s, 'rgba(255,170,235,.9)', '20,0,30'),
};
