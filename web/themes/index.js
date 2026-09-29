// Lucida's themes (Pro), in the order Settings › Theme shows them. Lucida is the app's own look (no theme), for everyone.
// `board`: the name of the theme's boards on the design canvas (Theme<board>, Theme<board>Library, …). Each theme's
// drawing is its own module in this folder (key + '.js'); the server reads just this list, to check a setting.
export const THEMES = [
  { key: 'lucida', name: 'Lucida', short: 'Lucida' },
  { key: 'hose', board: 'Rubber', name: 'Rubber hose', short: 'Rubber hose' },
  { key: 'chrome', board: 'Chrome', name: 'Liquid chrome', short: 'Liquid chrome' },
  { key: 'aero', board: 'Aero', name: 'Frutiger Aero', short: 'Frutiger Aero' },
  { key: 'liminal', board: 'Liminal', name: 'Liminal · Flooded hall', short: 'Liminal hall' },
  { key: 'liminalroom', board: 'LiminalRoom', name: 'Liminal · Empty room', short: 'Liminal room' },
  { key: 'dreamcore', board: 'Dreamcore', name: 'Dreamcore', short: 'Dreamcore' },
  { key: 'vaporwave', board: 'Vaporwave', name: 'Vaporwave · Poolside', short: 'Vapor pool' },
  { key: 'vapordolphins', board: 'VaporDolphins', name: 'Vaporwave · Dolphins', short: 'Vapor dolphins' },
  { key: 'terminal', board: 'Terminal', name: 'Terminal', short: 'Terminal' },
  { key: 'zine', board: 'Zine', name: 'Zine collage', short: 'Zine collage' },
  { key: 'glass', board: 'Glass', name: 'Frosted glass', short: 'Frosted glass' },
  { key: 'topo', board: 'Topo', name: 'Topographic', short: 'Topographic' },
  { key: 'riso', board: 'Riso', name: 'Risograph', short: 'Risograph' },
  { key: 'swiss', board: 'Swiss', name: 'Swiss poster', short: 'Swiss poster' },
];
export const THEME_KEYS = THEMES.map(t => t.key);
export const themeName = key => (THEMES.find(t => t.key === key) || THEMES[0]).name;
