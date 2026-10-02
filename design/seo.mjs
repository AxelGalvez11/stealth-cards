// What search engines and AI answers read on lucida.cards: each page's <head> (title, description, canonical, link
// previews, icons, structured data), the sitemap, robots.txt, llms.txt and llms-full.txt. Pure functions from the page
// data (design/site.mjs) to text; design/to-site.mjs writes the files and design/check-site.mjs checks them.
import { ORIGIN, APP, NAME, EMAIL, SOCIALS, PRICE, PLAN_FREE, PLAN_PRO, PRICING_FAQ, ABOUT, LLMS, FIXED, KINDS, CATEGORIES, categoryOf, crumbsOf, plain, dateLabel, urlOf, ogFile } from './site.mjs';
import { PRIVACY, TERMS } from './legal.mjs';
import { CONNECT } from './connect-guide.mjs';
import { esc } from './render.mjs';
import { SCHEME_CSS, THEME_COLORS } from './scheme.mjs';

export const OG = { width: 1200, height: 630 };
export const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';
// Geist's main file (Latin letters, every weight: it's one variable font), as Google's stylesheet names it. Asking for it
// early, beside the stylesheet, means text is drawn in Geist from its first paint and doesn't shift when the font arrives.
export const FONT_FILE = 'https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFWNOITd.woff2';
// What every site page starts with (design/og.mjs and design/site-measure.mjs draw pages the same way).
export const BASE_CSS = `html, body { margin: 0; background: var(--t-bg, #FFFFFF); }
body { font-family: Geist, -apple-system, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
a:hover { opacity: .8; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }`;
const ID = { org: ORIGIN + '/#organization', site: ORIGIN + '/#website', app: ORIGIN + '/#app' };

// Every page of the site (the four with their own boards, then the data pages), each as { slug, kind, title, description,
// h1, updated, url, og, crumbs, ... }.
export const allPages = pages => [
  ...FIXED.map(f => ({ ...f, url: urlOf(f.slug), og: ogFile(f.slug), crumbs: crumbsOf(f), faq: f.kind === 'pricing' ? PRICING_FAQ.map(([q, a]) => ({ q, a })) : [] })),
  ...pages.filter(p => !p.sample)
];

// ---------- structured data (JSON-LD) ----------
const org = () => ({ '@type': 'Organization', '@id': ID.org, name: NAME, url: ORIGIN + '/', description: ABOUT, email: EMAIL,
  logo: { '@type': 'ImageObject', url: ORIGIN + '/icons/icon-512.png' }, sameAs: SOCIALS.map(s => s[2]) });
const site = () => ({ '@type': 'WebSite', '@id': ID.site, url: ORIGIN + '/', name: NAME, description: ABOUT, inLanguage: 'en', publisher: { '@id': ID.org } });
// The app: free, and Pro by the month or the year (the same numbers as the pricing page).
const app = () => ({ '@type': ['SoftwareApplication', 'WebApplication'], '@id': ID.app, name: NAME, url: APP + '/', applicationCategory: 'EducationalApplication', operatingSystem: 'Web',
  description: ABOUT, featureList: [...PLAN_FREE, ...PLAN_PRO], publisher: { '@id': ID.org },
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: PRICE.currency, description: 'Unlimited decks and cards, spaced repetition, Learn mode, sharing and live games.', url: ORIGIN + '/pricing' },
    { '@type': 'Offer', name: 'Pro, monthly', price: PRICE.monthly, priceCurrency: PRICE.currency, url: ORIGIN + '/pricing',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: PRICE.monthly, priceCurrency: PRICE.currency, unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } } },
    { '@type': 'Offer', name: 'Pro, yearly', price: PRICE.yearly, priceCurrency: PRICE.currency, url: ORIGIN + '/pricing',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: PRICE.yearly, priceCurrency: PRICE.currency, unitCode: 'ANN', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'ANN' } } }
  ] });
// A crumb for a category with no page of its own points at its section of the blog (/blog#guides).
export const crumbUrl = c => urlOf(c.slug) + (c.hash ? '#' + c.hash : '');
const crumbs = p => ({ '@type': 'BreadcrumbList', '@id': p.url + '#breadcrumb', itemListElement: p.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: crumbUrl(c) })) });

// The graph for one page: the organization and the site on every page, the app on the two that sell it, then what this
// page is (a page, a list of pages, a FAQ), its breadcrumb (inner pages) and, for comparisons, an article with its date.
export function jsonLd(p) {
  const image = { '@type': 'ImageObject', '@id': p.url + '#image', url: ORIGIN + '/' + p.og };
  const faq = p.faq && p.faq.length, questions = () => p.faq.map(f => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } }));
  // The page is a FAQPage when that is what it is for (the FAQ, or a page with questions); a hub with questions keeps its own type and gets a FAQPage beside it.
  const type = p.kind === 'faq' || (faq && p.kind !== 'hub') ? 'FAQPage' : p.kind === 'hub' ? 'CollectionPage' : 'WebPage';
  const page = { '@type': type, '@id': p.url + '#webpage', url: p.url, name: p.title, description: p.description, inLanguage: 'en', isPartOf: { '@id': ID.site },
    about: { '@id': ID.org }, primaryImageOfPage: { '@id': image['@id'] }, image: { '@id': image['@id'] }, ...(p.updated ? { dateModified: p.updated } : {}) };
  if (p.slug) page.breadcrumb = { '@id': p.url + '#breadcrumb' };
  if (type === 'FAQPage') page.mainEntity = questions();
  if (['home', 'pricing'].includes(p.kind)) page.mainEntity = page.mainEntity || { '@id': ID.app };
  const graph = [org(), site(), ...(['home', 'pricing'].includes(p.kind) ? [app()] : []), page, image, ...(p.slug ? [crumbs(p)] : []),
    ...(p.kind === 'hub' && faq ? [{ '@type': 'FAQPage', '@id': p.url + '#faq', url: p.url, name: p.title, isPartOf: { '@id': page['@id'] }, mainEntity: questions() }] : [])];
  if (p.kind === 'compare' || p.kind === 'alternative') {
    graph.push({ '@type': 'Article', '@id': p.url + '#article', headline: p.h1, description: p.description, url: p.url, inLanguage: 'en', mainEntityOfPage: { '@id': p.url + '#webpage' },
      ...(p.published ? { datePublished: p.published } : {}), dateModified: p.updated, author: { '@id': ID.org }, publisher: { '@id': ID.org }, image: { '@id': image['@id'] },
      ...(p.keywords && p.keywords.length ? { keywords: p.keywords.join(', ') } : {}) });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
// JSON for a <script> tag: nothing in it can close the tag.
const inScript = o => JSON.stringify(o).split('<').join('\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

// ---------- <head> ----------
// The icons every page of both hosts names (the same four in design/seo.mjs's pages, web/app.html and the app's own pages; design/check-site.mjs
// checks that they are):
//   - /favicon.ico: the tab icon at 16, 32 and 48 pixels. It is what Safari on a Mac and the older browsers use, and what a browser asks for at the
//     root of a site when a page names none. `sizes="32x32"` is today's advice (Chrome and Edge then take the SVG, which is sharp at any size and has
//     a faint edge on a dark tab strip; without it they may take the .ico over the SVG; Safari on a Mac, which has no SVG tab icons, takes the .ico);
//   - /icon.svg: the tab icon, white dots on a black rounded tile;
//   - /icons/icon-192.png: the home-screen icon for Android, black dots on white (a browser takes it only where it wants a big icon);
//   - /apple-touch-icon.png: the same black dots on white at 180 pixels, for the iPhone's home screen. (Both files stay at the root, where iPhones
//     look when a page names none, and the older /apple-touch-icon-precomposed.png is there too.)
// No manifest: Android Chrome shows the tab icon from these and builds a home-screen icon from the 192-pixel one without it.
export const ICON_LINKS = `<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`;
const ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
// Everything up to and including </head> for one page: its own words, then the shared fonts, icons and styles. `css` is the
// page's stylesheet; `noindex` is for pages that shouldn't be found (the 404); `scheme` is for the pages that follow the system's
// light or dark look (design/scheme.mjs gives them their two sets of colors).
export function head(p, { css, noindex = false, scheme = false } = {}) {
  const h1 = (p.h1 || p.title).replace(/\.$/, '');
  const title = esc(p.title), desc = esc(p.description), url = esc(p.url), img = ORIGIN + '/' + p.og, alt = esc(/^lucida\b/i.test(h1) ? h1 : NAME + ': ' + h1);
  const article = ['compare', 'alternative', 'feature', 'use'].includes(p.kind);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${noindex ? 'noindex, follow' : ROBOTS}">
${scheme ? `<meta name="color-scheme" content="light dark">\n<meta name="theme-color" content="${THEME_COLORS.light}" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="${THEME_COLORS.dark}" media="(prefers-color-scheme: dark)">` : '<meta name="theme-color" content="#FFFFFF">'}
<meta property="og:type" content="${article ? 'article' : 'website'}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${NAME}">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${OG.width}">
<meta property="og:image:height" content="${OG.height}">
<meta property="og:image:alt" content="${alt}">${article && p.updated ? `\n<meta property="article:modified_time" content="${esc(p.updated)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${alt}">
${ICON_LINKS}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="${FONT_FILE}" as="font" type="font/woff2" crossorigin>
<link href="${FONTS}" rel="stylesheet">${noindex ? '' : `\n<script type="application/ld+json">${inScript(jsonLd(p))}</script>`}
<style>
${BASE_CSS}
${scheme ? SCHEME_CSS + '\n' : ''}${css}
</style>
</head>`;
}

// ---------- sitemap, robots, llms ----------
// Every page, with the day it last changed. Order: the home page, pricing, then the rest by kind.
const RANK = { home: 0, pricing: 1, guide: 1.5, hub: 2, compare: 3, alternative: 4, feature: 5, use: 6, faq: 7, legal: 8 };
export const ordered = pages => [...pages].sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.slug.localeCompare(b.slug));
export const sitemap = pages => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ordered(allPages(pages)).map(p => `<url><loc>${esc(p.url)}</loc>${p.updated ? `<lastmod>${p.updated}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;

// Every crawler that reads pages for an AI answer or for training is named and welcome, and so is everyone else.
export const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'Bingbot', 'CCBot'];
export const robots = () => `# lucida.cards: everyone is welcome to read it, search engines and AI crawlers alike.
# The app (app.lucida.cards) has its own robots.txt, and its public decks and profiles their own sitemap.
User-agent: *
Allow: /

${AI_BOTS.map(b => `User-agent: ${b}\nAllow: /\n`).join('\n')}
Sitemap: ${ORIGIN}/sitemap.xml
Sitemap: ${APP}/sitemap.xml
`;

// llms.txt (llmstxt.org): what Lucida is, then links to the pages that explain it, each with a line about it. The intro, the
// names, the lines and the order come from design/site/_llms.json when it's there; a page it doesn't mention is listed after
// the others with its description.
const llmsPage = p => (LLMS && LLMS.pages && LLMS.pages[p.slug]) || {};
const llmsRank = p => { const i = LLMS && LLMS.pages ? Object.keys(LLMS.pages).indexOf(p.slug) : -1; return i < 0 ? 1e6 : i; };
const llmsOrder = list => [...list].sort((a, b) => llmsRank(a) - llmsRank(b) || RANK[a.kind] - RANK[b.kind] || a.slug.localeCompare(b.slug));
const line = p => `- [${llmsPage(p).label || (p.crumb ? (p.kind === 'home' ? NAME : p.crumb) : plain(p.h1 || p.title).replace(/\.$/, ''))}](${p.url}): ${plain(llmsPage(p).line || p.description)}`;
export function llmsTxt(pages) {
  const all = allPages(pages), of = (...k) => llmsOrder(all.filter(p => k.includes(p.kind))), hub = s => all.filter(p => p.kind === 'hub' && p.slug === s);
  const section = (h, list) => (list.length ? `## ${h}\n${list.join('\n')}\n\n` : '');
  return `# ${NAME}

> ${ABOUT}

${LLMS && LLMS.intro ? '' : `Lucida works in the browser on any device. There is no App Store app yet. Your cards are yours: you can export everything, and your AI connects at app.lucida.cards/mcp, signs in, and can be disconnected at any time. Support: ${EMAIL}.

`}` + section('Product', [...llmsOrder([...of('home'), ...of('pricing'), ...hub('blog'), ...of('guide')]).map(line), `- [Open the app](${APP}/): sign in and start making decks`])
    + section('Comparisons', llmsOrder([...hub('compare'), ...of('compare', 'alternative')]).map(line))
    + section('Features and guides', llmsOrder([...hub('features'), ...of('feature')]).map(line))
    + section('Who it’s for', of('use').map(line))
    + section('FAQ', of('faq').map(line))
    + section('Support', [`- [Email ${EMAIL}](mailto:${EMAIL}): questions, feedback, deleting your account`])
    + section('Optional', of('legal').map(line)).replace(/\n\n$/, '\n');
}

// ---------- llms-full.txt: the pages' own words, as markdown ----------
// The landing page has no data of its own, so its words are read from its board's HTML: headings, paragraphs, list
// items and tables, leaving out what is only a picture of the app (aria-hidden) and the header, the footer and scripts.
export function htmlToMarkdown(html) {
  const out = [], stack = [];
  let buf = '', block = '', href = '';
  const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) out.push((block === 'li' ? '- ' : block === 'h1' ? '# ' : block === 'h2' ? '## ' : block === 'h3' ? '### ' : '') + t); buf = ''; block = ''; };
  const un = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&');
  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)([^>]*)>|([^<]+)/gi)) {
    if (m[4] !== undefined) { if (!stack.some(s => s.hide) && block) buf += un(m[4]); continue; }
    const closing = !!m[1], tag = m[2].toLowerCase(), attrs = m[3];
    if (['br', 'img', 'input', 'meta', 'link', 'path', 'circle', 'rect', 'hr', 'source'].includes(tag) || attrs.endsWith('/')) continue;
    if (closing) {
      if (!stack.some(s => s.tag === tag)) continue;
      while (stack.length && stack[stack.length - 1].tag !== tag) stack.pop();
      const top = stack.pop();
      if (top && !top.hide && /^(h[1-6]|p|li)$/.test(tag)) flush();
      continue;
    }
    const hide = stack.some(s => s.hide) || /aria-hidden="true"/.test(attrs) || ['header', 'footer', 'nav', 'script', 'style', 'svg', 'button'].includes(tag);
    stack.push({ tag, hide });
    if (!hide && /^(h[1-6]|p|li)$/.test(tag)) { flush(); block = tag; }
  }
  flush();
  return out.join('\n\n').replace(/\n\n- /g, '\n- ');
}

const table = t => t ? '\n' + ['| ' + t.columns.map((c, i) => c || (i ? '' : ' ')).join(' | ') + ' |', '|' + t.columns.map(() => ' --- ').join('|') + '|', ...t.rows.map(r => '| ' + r.map(c => plain(c).replace(/\|/g, '\\|')).join(' | ') + ' |')].join('\n') + '\n' : '';
const pageMd = (p, all = []) => {
  const parts = [`# ${plain(p.h1)}`, `URL: ${p.url}` + (p.updated ? `\nUpdated: ${p.updated}` : ''), plain(p.lead)];
  // The blog is a list of the site's pages, by category (design/site.mjs CATEGORIES).
  if (p.slug === 'blog') for (const c of CATEGORIES) parts.push(`## ${c.label}\n\n` + all.filter(x => categoryOf(x) && categoryOf(x).id === c.id).map(x => `- [${plain(x.h1)}](${x.url}): ${plain(x.description)}`).join('\n'));
  if (p.table) parts.push('## At a glance' + table(p.table));
  for (const s of p.sections) parts.push((s.h2 ? `## ${s.h2}\n\n` : '') + [...s.paras.map(plain), s.bullets.map(b => '- ' + plain(b)).join('\n')].filter(Boolean).join('\n\n'));
  if (p.faq.length) parts.push('## Questions\n\n' + p.faq.map((f, i) => (f.group && f.group !== (p.faq[i - 1] || {}).group ? `### ${f.group}\n\n` : '') + `${f.group ? '####' : '###'} ${plain(f.q)}\n\n${plain(f.a)}`).join('\n\n'));
  if (p.sources.length) parts.push('## Sources\n\n' + p.sources.map(s => `- [${s.label || s.url}](${s.url})` + (s.checked ? ` (checked ${s.checked})` : '')).join('\n'));
  return parts.filter(Boolean).join('\n\n');
};
// The legal pages and the Connect guide hold a little HTML (bold, a link, the address in a box): as markdown here.
const mdOf = x => String(x).replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<a href="\{\{privacyHref\}\}"[^>]*>(.*?)<\/a>/g, '[$1](' + ORIGIN + '/privacy)').replace(/<[^>]+>/g, '');
const legalMd = (doc, p) => [`# ${doc.title}`, `URL: ${p.url}\nUpdated: ${p.updated}`, mdOf(doc.intro), ...doc.sections.map(s => `## ${s.h}\n\n` + s.body.map(b => (Array.isArray(b) ? b.slice(1).map(x => '- ' + mdOf(x)).join('\n') : mdOf(b))).join('\n\n'))].join('\n\n');
const pricingMd = p => [`# ${p.h1.replace(/\.$/, '')}`, `URL: ${p.url}\nUpdated: ${p.updated}`, 'Your cards are always free. Pro is for making Lucida yours. Prices in US dollars, as of September 2026.',
  `## Free: $0 forever\n\n${PLAN_FREE.map(x => '- ' + x).join('\n')}`,
  `## Pro: $${PRICE.monthly} a month, or $${PRICE.yearly} a year\n\nEverything in Free, plus:\n\n${PLAN_PRO.map(x => '- ' + x).join('\n')}`,
  '## Questions\n\n' + PRICING_FAQ.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')].join('\n\n');
// `homeHtml` is the landing board's computer HTML.
export function llmsFull(pages, homeHtml) {
  const home = FIXED[0];
  const md = llmsOrder(allPages(pages)).map(p => p.kind === 'home' ? htmlToMarkdown(homeHtml).replace(/^# .*\n/, `# ${plain(home.h1).replace(/\.$/, '')}\nURL: ${p.url}\nUpdated: ${p.updated}\n`)
    : p.kind === 'pricing' ? pricingMd(p) : p.kind === 'legal' ? legalMd(p.slug === 'privacy' ? PRIVACY : TERMS, p) : p.kind === 'guide' ? legalMd(CONNECT, p) : pageMd(p, allPages(pages)));
  const facts = LLMS && LLMS.facts && LLMS.facts.length ? '## Quick facts\n\n' + LLMS.facts.map(f => '- ' + f).join('\n') + '\n\n' : '';
  return `# ${NAME}: full text of lucida.cards\n\n> ${ABOUT}\n\n${facts}Every page of the site follows, as plain markdown. The short index is at ${ORIGIN}/llms.txt.\n\n---\n\n` + md.join('\n\n---\n\n') + '\n';
}
