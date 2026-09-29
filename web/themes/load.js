// The app's side of themes: a theme's module loads the first time a screen needs it, its fonts and pictures go on the
// page, and the app draws again. Until you pick one, nothing here loads (the default look stays as fast as ever).
// (On the design canvas, the Theme boards carry their theme's code with them instead; see design/themes.mjs.)
import { make, KIT_CSS, KIT_ASSETS } from './kit.js';

const loading = {};
const picture = file => '/themes/img/' + file;
function addCss(id, css, assets) {
  if (!css || document.querySelector('style[data-theme="' + id + '"]')) return;
  const el = document.createElement('style');
  el.dataset.theme = id;
  el.textContent = css.replace(/%%([a-z0-9-]+)%%/g, (_, k) => picture(assets[k] || KIT_ASSETS[k] || k));
  document.head.appendChild(el);
}
function addFonts(id, fonts) {
  if (!fonts || document.querySelector('link[data-theme="' + id + '"]')) return;
  const el = document.createElement('link');
  el.rel = 'stylesheet';
  el.href = 'https://fonts.googleapis.com/css2?' + fonts + 'display=swap';
  el.dataset.theme = id;
  document.head.appendChild(el);
}
// Resolves once the theme is ready to draw (it's in globalThis.LucidaThemes, where the screens look for it).
export function loadTheme(key, done = () => {}) {
  const T = globalThis.LucidaThemes || (globalThis.LucidaThemes = {});
  if (T[key]) return Promise.resolve(T[key]);
  if (!/^[a-z]+$/.test(key)) return Promise.resolve(null);
  loading[key] ||= import('./' + key + '.js').then(m => {
    const t = m.default;
    addCss('kit', KIT_CSS, KIT_ASSETS);
    addCss(key, t.css, t.assets || {});
    addFonts(key, t.fonts);
    T[key] = make(t);
    done();
    return T[key];
  }).catch(() => { delete loading[key]; return null; });
  return loading[key];
}
