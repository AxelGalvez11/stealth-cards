// Turns the site's boards into static pages: the landing page (Landing, LandingPhone) into web/landing.html, the page at
// lucida.cards, Pricing (Pricing, PricingPhone) into web/pricing.html, and Privacy and Terms into web/privacy.html and
// web/terms.html. The landing and pricing pages hold both boards, with their links pointing at the app; phones see the
// phone board, everything else the computer one. Gradient cards come from pictures (web/art, design/art.mjs). Run after
// design/build.mjs (Vercel runs it when it builds the site).
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('./canvas/project/', import.meta.url);
const get = (o, p) => p.trim().split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function board(name, props) {
  const src = readFileSync(new URL(name + '.dc.html', SRC), 'utf8');
  const raw = JSON.parse(src.match(/data-props='([^']*)'/)[1]);
  const defaults = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== '$preview').map(([k, v]) => [k, v.default]));
  const logic = src.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  const C = new Function('DCLogic', logic + ';return Component')(class { constructor(p) { this.props = p || {}; this.state = {}; } setState() {} });
  const body = src.split('<x-dc>')[1].split('</x-dc>')[0];
  const css = (body.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
  const fill = (s, sc) => s.replace(/\s(on[A-Z][a-zA-Z]*|ref)="\{\{[^}]+\}\}"/g, '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => {
    if (p === 'true') return 'true'; if (p === 'false') return '';
    const v = get(sc, p); return v == null || typeof v === 'function' ? '' : esc(v);
  });
  const render = (str, sc) => {
    let out = '', i = 0;
    for (;;) {
      const re = /<(sc-if|sc-for)\b/g; re.lastIndex = i; const hit = re.exec(str);
      if (!hit) return out + fill(str.slice(i), sc);
      out += fill(str.slice(i, hit.index), sc);
      const tag = hit[1], k = str.indexOf('>', hit.index), open = str.slice(hit.index, k + 1);
      const cre = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g'); cre.lastIndex = k + 1; let depth = 1, close;
      while (depth) { close = cre.exec(str); depth += close[0].startsWith('</') ? -1 : 1; }
      const inner = str.slice(k + 1, close.index), hole = a => (open.match(new RegExp('\\s' + a + '="\\{\\{([^}]+)\\}\\}"')) || [])[1];
      if (tag === 'sc-if') { if (get(sc, hole('value'))) out += render(inner, sc); }
      else { const as = open.match(/\sas="(\w+)"/)[1]; (get(sc, hole('list')) || []).forEach(it => { out += render(inner, { ...sc, [as]: it }); }); }
      i = close.index + close[0].length;
    }
  };
  const html = render(body.replace(/<helmet>[\s\S]*?<\/helmet>/, '').trim(), new C({ ...defaults, ...props }).renderVals());
  // The board's frame size becomes the page's width; its height follows the content.
  return { css, html: html.replace(/width: \d+px; height: \d+px;/, 'width: 100%;') };
}

const web = board('Landing', { site: true, dark: false });
const phone = board('LandingPhone', { site: true, dark: false });
// The phone copy gets its own ids, so its links and its gradients' filters never point into the hidden computer copy.
phone.html = phone.html.replace(/\sid="([^"]+)"/g, ' id="$1-m"').replace(/url\(#([^)]+)\)/g, 'url(#$1-m)').replace(/href="#(how|cards)"/g, 'href="#$1-m"');

const MARK = '<circle cx="7" cy="7" r="7"/><circle cx="26" cy="7" r="7"/><circle cx="16.5" cy="23.45" r="7"/>';
// The tab icon, as web/icon.svg: three small white dots on a black rounded tile, which shows on light and dark tab
// strips alike (in dark mode a faint edge keeps the tile apart from the strip).
const ICON = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.tile{fill:#000;stroke:none}@media (prefers-color-scheme:dark){.tile{stroke:#5A5A5E}}</style><rect class="tile" x="2.5" y="2.5" width="27" height="27" rx="7.5" stroke-width="1.5"/><g fill="#fff" transform="translate(8.41 9) scale(.46)">${MARK}</g></svg>`);
// Every page shares the same head: title, description, link previews, the dots icon, and the fonts.
const head = (title, desc, url, css) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Lucida">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(desc)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${ICON}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
html, body { margin: 0; background: #FFFFFF; }
body { font-family: Geist, -apple-system, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
a:hover { opacity: .8; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
${css}
</style>
</head>`;
const write = (file, html) => { writeFileSync(new URL('../web/' + file, import.meta.url), html); console.log(file + ':', Math.round(html.length / 1024) + ' KB'); };

write('landing.html', head('Lucida · Flashcards your AI can make', 'Ask Claude or ChatGPT to turn a lecture into flashcards. Lucida keeps them in your decks and brings each one back right before you’d forget it.', 'https://lucida.cards/', `/* Phones get the phone board. */
.phone { display: none; }
@media (max-width: 760px) { .computer { display: none; } .phone { display: block; } }
${web.css.includes(phone.css) ? web.css : web.css + '\n' + phone.css}
${readFileSync(new URL('../web/fast.css', import.meta.url), 'utf8').trim()}
/* The card wall, the sky and the demos stop while they're off screen (and start over when they're back), so a phone
   only keeps layers for what's in view. */
.sc-off, .sc-off * { animation: none !important; }`) + `
<body>
<div class="computer">${web.html}</div>
<div class="phone">${phone.html}</div>
<script>
// Phones only animate what's on screen: the wall, the sky and the demos stop when you scroll past them.
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(seen => seen.forEach(e => e.target.classList.toggle('sc-off', !e.isIntersecting)), { rootMargin: '120px 0px' });
  document.querySelectorAll('.sc-demo').forEach(el => io.observe(el));
}
</script>
</body>
</html>
`);

// Pricing at lucida.cards/pricing: like the landing page, both boards, phones seeing the phone one.
{
  const pw = board('Pricing', { site: true, dark: false }), pp = board('PricingPhone', { site: true, dark: false });
  pp.html = pp.html.replace(/\sid="([^"]+)"/g, ' id="$1-m"').replace(/url\(#([^)]+)\)/g, 'url(#$1-m)');
  write('pricing.html', head('Pricing · Lucida', 'Lucida is free, with unlimited decks and cards. Pro adds Learn mode, photo covers, your own colors, and unlimited pictures and sounds.', 'https://lucida.cards/pricing', `/* Phones get the phone board. */
.phone { display: none; }
@media (max-width: 760px) { .computer { display: none; } .phone { display: block; } }
${pw.css.includes(pp.css) ? pw.css : pw.css + '\n' + pp.css}
${readFileSync(new URL('../web/fast.css', import.meta.url), 'utf8').trim()}
/* The sky's clouds stop while they're off screen. */
.sc-off, .sc-off * { animation: none !important; }`) + `
<body>
<div class="computer">${pw.html}</div>
<div class="phone">${pp.html}</div>
<script>
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(seen => seen.forEach(e => e.target.classList.toggle('sc-off', !e.isIntersecting)), { rootMargin: '120px 0px' });
  document.querySelectorAll('.sc-demo').forEach(el => io.observe(el));
}
</script>
</body>
</html>
`);
}

// Privacy and Terms: one column of text, the same on every screen.
for (const [name, file, title, desc] of [['Privacy', 'privacy', 'Privacy Policy', 'What Lucida keeps, why, and what you can do about it.'], ['Terms', 'terms', 'Terms of Service', 'The terms for using Lucida.']]) {
  const b = board(name, { site: true, dark: false });
  write(file + '.html', head(title + ' · Lucida', desc, 'https://lucida.cards/' + file, b.css) + `\n<body>\n${b.html}\n</body>\n</html>\n`);
}
