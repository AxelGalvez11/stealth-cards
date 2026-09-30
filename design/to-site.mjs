// Turns the site's boards into static pages, for lucida.cards (Vercel runs this when it builds; the pictures for link
// previews come from design/og.mjs, which needs Chrome and is run by hand):
//   web/landing.html, pricing.html, privacy.html, terms.html: the four pages with their own boards. The landing page and
//     Pricing hold both their boards (computer and phone), links pointing at the app; phones see the phone one.
//   web/site/sitemap.xml, robots.txt, llms.txt and llms-full.txt, all made from the same page data (design/seo.mjs).
// Gradient cards come from pictures (web/art, design/art.mjs). Run after design/build.mjs.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { board } from './render.mjs';
import { pageSet, FIXED, urlOf, ogFile } from './site.mjs';
import { head, allPages, sitemap, robots, llmsTxt, llmsFull } from './seo.mjs';

const WEB = new URL('../web/', import.meta.url);
const FAST = readFileSync(new URL('fast.css', WEB), 'utf8').trim();
const { pages, problems } = pageSet();
if (problems.length) throw new Error('Page files in design/site can\'t be read:\n  ' + problems.join('\n  '));

const web = board('Landing', { site: true, dark: false });
const phone = board('LandingPhone', { site: true, dark: false });
// The phone copy gets its own ids, so its links and its gradients' filters never point into the hidden computer copy.
phone.html = phone.html.replace(/\sid="([^"]+)"/g, ' id="$1-m"').replace(/url\(#([^)]+)\)/g, 'url(#$1-m)').replace(/href="#(how|cards)"/g, 'href="#$1-m"');

const SIZES = [];
const write = (file, text) => {
  const at = new URL(file, WEB);
  mkdirSync(dirname(at.pathname), { recursive: true });
  writeFileSync(at, text);
  SIZES.push(file + ': ' + Math.round(text.length / 1024) + ' KB');
};
const fixed = slug => ({ ...FIXED.find(f => f.slug === slug), url: urlOf(slug), og: ogFile(slug), crumbs: [{ label: 'Home', slug: '' }, ...(slug ? [{ label: FIXED.find(f => f.slug === slug).crumb, slug }] : [])],
  faq: slug === 'pricing' ? allPages(pages).find(p => p.slug === 'pricing').faq : [] });
// Only one of the two boards shows at a time; <main> doesn't move the page's parts in.
const DUAL = `/* Phones get the phone board. */
.phone { display: none; }
@media (max-width: 760px) { .computer { display: none; } .phone { display: block; } }
main > * { animation: none; }`;

write('landing.html', head(fixed(''), { css: `${DUAL}
${web.css.includes(phone.css) ? web.css : web.css + '\n' + phone.css}
${FAST}
/* The card wall, the sky and the demos stop while they're off screen (and start over when they're back), so a phone
   only keeps layers for what's in view. */
.sc-off, .sc-off * { animation: none !important; }` }) + `
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
  write('pricing.html', head(fixed('pricing'), { css: `${DUAL}
${pw.css.includes(pp.css) ? pw.css : pw.css + '\n' + pp.css}
${FAST}
/* The sky's clouds stop while they're off screen. */
.sc-off, .sc-off * { animation: none !important; }` }) + `
<body>
<div class="computer">${pw.html}</div>
<div class="phone">${pp.html}</div>
<script>
// Monthly or Yearly: both prices are on the page, and the switch shows one (on computers and phones alike).
const picks = [...document.querySelectorAll('[data-plan-pick]')], look = b => b && { background: b.style.background, color: b.style.color };
const ON = look(picks.find(b => b.getAttribute('aria-pressed') === 'true')), OFF = look(picks.find(b => b.getAttribute('aria-pressed') !== 'true'));
picks.forEach(b => b.addEventListener('click', () => {
  const plan = b.dataset.planPick;
  picks.forEach(x => { const on = x.dataset.planPick === plan; x.setAttribute('aria-pressed', String(on)); Object.assign(x.style, on ? ON : OFF); });
  document.querySelectorAll('[data-plan]').forEach(el => { el.style.display = el.dataset.plan === plan ? 'flex' : 'none'; });
}));
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
for (const slug of ['privacy', 'terms']) {
  const b = board(FIXED.find(f => f.slug === slug).board, { site: true, dark: false });
  write(slug + '.html', head(fixed(slug), { css: b.css }) + `\n<body>\n${b.html}\n</body>\n</html>\n`);
}

write('site/sitemap.xml', sitemap(pages));
write('site/robots.txt', robots());
write('site/llms.txt', llmsTxt(pages));
write('site/llms-full.txt', llmsFull(pages, web.html));
console.log(SIZES.join('\n'));
