import { A, R, di, face, photoAssets, photoCss, photo, photoBg, photoScrim, photoAvatar, ringFrame } from './kit.js';

// Liminal space · Empty room: photos of quiet carpeted rooms, corridors, and offices with nobody in them.
const F = "'IBM Plex Sans', system-ui, sans-serif";
const PLACES = ['Room', 'Level 0', 'Office', 'Hotel', 'School', 'Mall'];
export default {
  key: 'liminalroom', board: 'LiminalRoom', name: 'Liminal · Empty room', short: 'Liminal room', dark: false, fonts: 'family=IBM+Plex+Sans:wght@400;500;600&',
  line: 'Real photos of empty carpeted rooms and hallways in warm, dim light.',
  assets: photoAssets('lmr'), css: photoCss('lmr'),
  bg: (w, h) => photoBg('lmr', w, h),
  face(w, h, o) {
    const r = Math.min(o.r, R(Math.min(w, h) * 0.06));
    // The paper's fibers come from the lx-paper class (on the layer behind the words, since the face's own class is the app's).
    return face(`border-radius: ${r}px; background-color: #FBF8F2; color: #2A241D; font-family: ${F}; box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 1px 2px rgba(60,40,20,.12), 0 ${R(h * 0.05)}px ${R(h * 0.14)}px ${-R(h * 0.05)}px rgba(60,40,15,.5);`,
      () => `<span class="lx-paper" style="position: absolute; inset: 0; border-radius: ${r}px; background-color: #FBF8F2;"></span>` + A(`inset: 0; border-radius: ${r}px; background: radial-gradient(ellipse 70% 60% at 88% 0%, rgba(255,214,150,.22), rgba(255,214,150,0) 70%);`),
      { q: 'color: #7A6E60; font-weight: 500;', a: 'font-weight: 600; letter-spacing: -.015em;' }, { ink: '#2A241D', paper: '#FBF8F2', muted: '#7A6E60' });
  },
  cover(d, o) {
    const i = di(d);
    return {
      bg: '#3A2E20', ink: 'light', name: PLACES[i],
      title: `font-family: ${F}; font-weight: 600; letter-spacing: -.01em; text-shadow: 0 1px 12px rgba(0,0,0,.4);`,
      shadow: '0 1px 2px rgba(40,25,10,.2), 0 16px 30px -14px rgba(40,25,10,.5)',
      draw: () => photo(`lmr-c${i}`) + photoScrim('30,22,12', o),
    };
  },
  avatar: (s, ch) => photoAvatar('lmr-c0', s, ch, F, 'rgba(255,248,236,.95)', '40,26,10'),
  frame: s => ringFrame(s, 'rgba(255,248,236,.95)', '40,26,10'),
};
