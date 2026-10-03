// Builds the site and checks everything search engines and AI answers see of it:  node design/check-site.mjs
//   --no-build  check what's in web/ without building first
//   --strict    a page that links to a page that doesn't exist yet (design/site "related") is a failure, not a note
//   --online    also ask every outside link whether it still answers (needs the internet)
// For every page: the title and description (length, unique), one h1, the canonical address, the link-preview picture (exists,
// 1200 × 630), the structured data (parses, is schema.org, has the types the page should have), landmarks, headings, tables,
// pictures, every link (inside the site, to the app, to an address outside). For the site: the sitemap lists every page once
// with its date, robots.txt names every crawler, llms.txt and llms-full.txt link and quote every page, each link-preview
// picture is for its page's current title, and the two hosts route as they should. The host rules (vercel.json) are run
// through design/vercel-routes.mjs, which reads them the way Vercel does, since the local server has only one host.
// And for the page files themselves (design/site/*.json): the shape design/site.mjs only reads, enforced here.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { pageSet, KINDS, FIXED, PRICE, ORIGIN, APP, EMAIL, SOCIALS, CATEGORIES, STYLES, GRAD_NAMES, categoryOf, pictureOf, ogFingerprint, plain, DATA_DIR, VISUALS } from './site.mjs';
import { KINDS as FIG_KINDS, SCREENS, CONNECT_FIGS } from './visuals.mjs';
import { wanted as screenPictures } from './screens.mjs';
import { readPng, thumb, distance, labDistance } from './png.mjs';
import { LIGHT, DARK, SCHEME_CSS } from './scheme.mjs';
import { allPages, AI_BOTS, OG, crumbUrl, ICON_LINKS } from './seo.mjs';
import { readIco } from './ico.mjs';
import { checkJsonLd } from './schema-check.mjs';
import { route, headersFor } from './vercel-routes.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)), WEB = join(ROOT, 'web'), args = new Set(process.argv.slice(2));
if (!args.has('--no-build')) for (const s of ['build.mjs', 'check.mjs', 'to-web.mjs', 'to-site.mjs']) execFileSync('node', [join(ROOT, 'design', s)], { stdio: ['ignore', 'pipe', 'inherit'] });

let pass = 0, fail = 0; const notes = [];
const ok = (cond, name, detail = '') => { if (cond) pass++; else { fail++; console.log('  FAIL ' + name + (detail ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } return !!cond; };
const note = msg => notes.push(msg);
const read = f => readFileSync(join(WEB, f), 'utf8');
const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const via = (host, path) => route(config, WEB, { host, path });
const { pages, problems } = pageSet();
const list = allPages(pages), by = new Map(list.map(p => [p.slug, p]));
const pathOf = p => '/' + p.slug;

// ---------- a small reader for our own HTML ----------
const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const attrsOf = s => { const o = {}; for (const m of s.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''; return o; };
const tags = html => { const out = []; for (const m of html.matchAll(TAG)) out.push({ tag: m[2].toLowerCase(), close: !!m[1], attrs: attrsOf(m[3]), at: m.index, end: m.index + m[0].length }); return out; };
const un = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, '\'').replace(/&amp;/g, '&');
const textOf = html => un(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
// A hole of the boards' templates left unfilled looks like {{name}} (Anki's {{c1::cloze}} is text a page may quote).
const HOLE = /\{\{\s*[\w.$]+\s*\}\}/;
const png = f => { const b = readFileSync(join(WEB, f)); return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };

// ---------- the page files ----------
console.log('Page files (design/site)');
ok(!problems.length, 'every page file reads', problems);
{
  const raws = [];
  const walk = d => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json') && !e.name.startsWith('_')) { try { const r = JSON.parse(readFileSync(p, 'utf8')); if (r && r.slug !== undefined) raws.push([p.slice(DATA_DIR.length), r]); } catch {} } } };
  if (existsSync(DATA_DIR)) walk(DATA_DIR);
  const date = /^\d{4}-\d{2}-\d{2}$/, sentences = t => (t.match(/[.!?](?:\s+[A-Z“"(]|$)/g) || []).length;
  for (const [file, r] of raws) {
    const at = 'design/site/' + file;
    ok(typeof r.slug === 'string' && KINDS[r.kind] && KINDS[r.kind].slug.test(r.slug.replace(/^\/+|\/+$/g, '')), at + ': slug fits its kind', [r.slug, r.kind]);
    for (const k of ['title', 'description', 'h1', 'lead']) ok(typeof r[k] === 'string' && r[k].trim(), at + ': has ' + k);
    ok(date.test(r.updated || ''), at + ': "updated" is a date like 2026-09-30', r.updated);
    if (r.lead) { if (sentences(r.lead) > 2) note(at + ': the lead has ' + sentences(r.lead) + ' sentences (the brief asks for two)'); ok(!/^\s*$/.test(r.lead), at + ': lead isn’t empty'); }
    if (r.table) { ok(Array.isArray(r.table.columns) && r.table.columns.length >= 2 && Array.isArray(r.table.rows) && r.table.rows.length, at + ': the table has columns and rows'); for (const [i, row] of (r.table.rows || []).entries()) { ok(Array.isArray(row) && row.length === (r.table.columns || []).length && row.every(c => typeof c === 'string'), at + ': table row ' + (i + 1) + ' has a cell for every column', row); if (Array.isArray(row) && row.some(c => !String(c).trim())) note(at + ': table row ' + (i + 1) + ' has an empty cell'); } }
    for (const [i, s] of (r.sections || []).entries()) ok(s && typeof s.h2 === 'string' && (Array.isArray(s.paras) || Array.isArray(s.bullets)), at + ': section ' + (i + 1) + ' has an h2 and paras or bullets');
    for (const [i, f] of (r.faq || []).entries()) ok(f && f.q && f.a, at + ': question ' + (i + 1) + ' has q and a');
    const sources = r.sources || [];
    if (r.kind === 'compare' || r.kind === 'alternative') ok(sources.length >= 2, at + ': a comparison lists its sources', sources.length);
    for (const [i, s] of sources.entries()) ok(/^https:\/\/[^\s]+$/.test(s.url || '') && date.test(s.checked || '') && s.label, at + ': source ' + (i + 1) + ' has a label, an https link and a checked date', s);
    const text = JSON.stringify(r);
    ok(!/AI[- ]generated|madewithai|generated by AI|\[object Object\]/i.test(text) && !HOLE.test(text), at + ': no AI-generated label and no stray markup');
    // Prices are dated: the page says which month and year they're from ("as of September 2026", or "Price (September 2026)").
    if (/\$\d/.test(text) && (r.kind === 'compare' || r.kind === 'alternative' || r.kind === 'hub')) ok(/(january|february|march|april|may|june|july|august|september|october|november|december) 20\d\d/i.test(text), at + ': prices are dated (a month and a year)');
    const p = by.get(String(r.slug).replace(/^\/+|\/+$/g, ''));
    for (const s of (p && p.relatedMissing) || []) (args.has('--strict') ? ok(false, at + ': related page "' + s + '" doesn’t exist') : note(at + ': related page "' + s + '" doesn’t exist yet, so it isn’t linked'));
  }
  const slugs = raws.map(([, r]) => String(r.slug).replace(/^\/+|\/+$/g, '')); ok(new Set(slugs).size === slugs.length, 'no two page files share a slug');
}

// ---------- every page ----------
const seen = { title: new Map(), description: new Map(), canonical: new Map() };
const pageFiles = [...list.map(p => [p, p.file]), [{ slug: '404', kind: 'notfound', title: 'Page not found · Lucida', url: ORIGIN + '/404', og: 'og/home.png', h1: 'This page doesn’t exist', faq: [] }, '404.html']];
const htmlOf = new Map();
for (const [p, file] of pageFiles) {
  console.log((p.slug === '' ? '/' : '/' + p.slug) + '  (' + file + ')');
  if (!ok(existsSync(join(WEB, file)), 'the file exists')) continue;
  const html = read(file); htmlOf.set(p.slug, html);
  const head = html.slice(0, html.indexOf('</head>')), body = html.slice(html.indexOf('<body'));
  const meta = (k, v) => { const m = tags(head).find(t => t.tag === 'meta' && t.attrs[k] === v); return m ? m.attrs.content : undefined; };
  const link = rel => { const m = tags(head).find(t => t.tag === 'link' && t.attrs.rel === rel); return m ? m.attrs.href : undefined; };
  const notFound = p.kind === 'notfound';
  // One header on every page (the landing page and Pricing hold two copies, for a computer and for a phone): the logo, then Blog, Compare, Features,
  // Pricing and Sign in, and Get started; the same five links again in the menu a narrow page opens (a <details>), in the same order.
  {
    const headers = [...body.matchAll(/<header class="sp-head">([\s\S]*?)<\/header>/g)].map(m => m[1]);
    const links = h => [...(h || '').matchAll(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(m => [m[2], m[1]]);
    const want = [['Blog', '/blog'], ['Compare', '/compare'], ['Features', '/features'], ['Pricing', '/pricing'], ['Sign in', APP + '/sign-in']];
    const copies = p.slug === '' || p.slug === 'pricing' ? 2 : 1;
    ok(headers.length === copies, 'the page has ' + (copies === 2 ? 'a header for a computer and one for a phone' : 'one header'), headers.length);
    for (const h of headers) {
      const nav = (h.match(/<nav class="sp-hnav"[^>]*>([\s\S]*?)<\/nav>/) || [])[1], menu = (h.match(/<nav class="sp-mpanel"[^>]*>([\s\S]*?)<\/nav>/) || [])[1];
      ok(JSON.stringify(links(nav)) === JSON.stringify(want), 'the header links are Blog, Compare, Features, Pricing, Sign in, in that order', links(nav));
      ok(JSON.stringify(links(menu)) === JSON.stringify(want), 'the menu a narrow page opens holds the same five links in the same order', links(menu));
      ok(/<a class="sp-hlogo" href="\/" aria-label="Lucida home">/.test(h) && h.includes('<a class="sp-hgo" href="' + APP + '/">Get started</a>'), 'the header has the logo (home) and Get started (the app)');
      ok(/<details class="sp-menu"><summary aria-label="Menu">/.test(h) && !/<header[^>]*>[\s\S]*How it works/.test(h), 'the header has a menu button and no page-only links (How it works, Card types)');
    }
  }
  ok(/^<!doctype html>\s*<html lang="en">/i.test(html), '<html lang="en"> after the doctype');
  ok(/<meta name="viewport" content="width=device-width, initial-scale=1">/.test(head), 'viewport');
  // title and description
  const title = un((head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''), desc = un(meta('name', 'description') || '');
  ok(title.length >= 10 && title.length <= 60, 'title is 10 to 60 characters', title.length + ': ' + title);
  ok(desc.length >= 50 && desc.length <= 155, 'description is 50 to 155 characters', desc.length + ': ' + desc);
  if (!notFound) {
    for (const [k, v] of [['title', title], ['description', desc]]) { ok(!seen[k].has(v), k + ' is unique', 'same as ' + seen[k].get(v)); seen[k].set(v, p.slug || '/'); }
    ok(title === p.title && desc === p.description, 'title and description are the page’s own words');
  }
  // canonical
  const canonical = link('canonical');
  ok(canonical === p.url, 'canonical is the page’s own address', [canonical, p.url]);
  if (!notFound) { ok(!seen.canonical.has(canonical), 'canonical is unique'); seen.canonical.set(canonical, p.slug); }
  ok(notFound ? /noindex/.test(meta('name', 'robots') || '') : !/noindex/.test(meta('name', 'robots') || ''), notFound ? 'the 404 page is noindex' : 'the page can be indexed');
  ok(/^#[0-9A-Fa-f]{6}$/.test(meta('name', 'theme-color') || ''), 'theme-color');
  // Dark mode: the pages of the blog, the 404 page, Privacy, Terms and Connect follow the system's light or dark look (their colors are
  // variables, design/scheme.mjs, with a light set and a dark set; the browser picks).
  {
    ok(head.includes(SCHEME_CSS) && /<meta name="color-scheme" content="light dark">/.test(head), 'the page has its light and its dark colors (prefers-color-scheme)');
    const themes = tags(head).filter(x => x.tag === 'meta' && x.attrs.name === 'theme-color');
    ok(themes.length === 2 && themes.some(x => x.attrs.media === '(prefers-color-scheme: light)' && x.attrs.content === LIGHT.bg) && themes.some(x => x.attrs.media === '(prefers-color-scheme: dark)' && x.attrs.content === DARK.bg), 'the browser’s bar follows too: a theme-color for light and for dark', themes.map(x => x.attrs));
    ok(!/#(?:FFFFFF|000000)\b/i.test(body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/background: #FFFFFF; color: #000000;/g, '').replace(/color: #FFFFFF/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '')) || p.kind === 'legal' || p.kind === 'guide', 'no color is written into the markup (they are all variables)');
  }
  // link previews
  const img = meta('property', 'og:image');
  ok(img === ORIGIN + '/' + p.og, 'og:image is the page’s picture', [img, p.og]);
  ok(existsSync(join(WEB, p.og)) && JSON.stringify(png(p.og)) === JSON.stringify([OG.width, OG.height]), 'that picture exists and is 1200 × 630', p.og);
  ok(un(meta('property', 'og:title') || '') === title, 'og:title matches the title');
  ok(un(meta('property', 'og:description') || '') === desc && meta('property', 'og:url') === p.url && meta('property', 'og:site_name') === 'Lucida' && meta('property', 'og:image:width') === '1200' && meta('property', 'og:image:height') === '630', 'og:description, url, site name and picture size');
  ok(meta('name', 'twitter:card') === 'summary_large_image' && meta('name', 'twitter:image') === img && un(meta('name', 'twitter:title') || '') === title, 'Twitter card: large image, same picture and title');
  ok(!!meta('property', 'og:image:alt') && !!meta('name', 'twitter:image:alt'), 'the picture has alt text');
  // Icons: every page names the same four in its <head> (design/seo.mjs, ICON_LINKS); the files themselves are checked once, in "Icons" below.
  ok(head.includes(ICON_LINKS), 'the page names the four icons: favicon.ico, the SVG, the 192-pixel PNG and the apple-touch-icon');
  ok(/rel="preconnect" href="https:\/\/fonts.gstatic.com" crossorigin/.test(head) && /display=swap/.test(head) && /rel="preload" href="https:\/\/fonts\.gstatic\.com\/s\/geist\/[^"]+\.woff2" as="font" type="font\/woff2" crossorigin/.test(head), 'fonts: preconnect, preload of the main file, display=swap');
  // body: one h1 (per copy, on the pages that hold a computer and a phone copy), landmarks, headings
  const t = tags(body), dual = body.indexOf('<div class="phone">');
  const copies = dual > 0 ? [[t.filter(x => x.at < dual), 'computer copy'], [t.filter(x => x.at >= dual), 'phone copy']] : [[t, 'page']];
  for (const [ts, where] of copies) {
    const count = name => ts.filter(x => x.tag === name && !x.close).length;
    ok(count('h1') === 1, 'one h1 in the ' + where, count('h1'));
    ok(count('main') === 1 && count('header') === 1 && count('footer') === 1 && count('nav') >= 2, 'header, main, footer and navs in the ' + where, ['header', 'main', 'footer', 'nav'].map(n => n + ':' + count(n)));
    const levels = ts.filter(x => /^h[1-6]$/.test(x.tag) && !x.close).map(x => +x.tag[1]);
    ok(levels[0] === 1 && levels.every((l, i) => i === 0 || l <= levels[i - 1] + 1), 'headings never skip a level in the ' + where, levels.join(''));
    ok(count('h2') >= (notFound ? 1 : 2), 'h2s mark the sections in the ' + where, count('h2'));
    for (const x of ts.filter(x => x.tag === 'img' && !x.close)) ok(x.attrs.alt !== undefined && x.attrs.width && x.attrs.height, 'a picture has alt, width and height', x.attrs);
    if (count('table')) ok(ts.filter(x => x.tag === 'th' && !x.close && x.attrs.scope === 'col').length > 0 && ts.filter(x => x.tag === 'th' && x.attrs.scope === 'row').length > 0, 'the table has column and row headers in the ' + where);
  }
  ok(!HOLE.test(body.replace(/<script[\s\S]*?<\/script>/g, '')) && !/\[object Object\]|>undefined<|>null</.test(body), 'no unfilled holes in the page');
  // The pages of the blog (every data page) read like articles. Their pictures: the page's own picture is the hero (or, on a hub and the
  // blog, the featured page's is the big one), loaded first; every other picture is a card, loaded lazily. A picture is the same on a light
  // screen and a dark one (no <picture>, no -dark file), and wears the app's film grain: its <img> sits in a span.sp-pw with a span.sc-grain
  // right after it (web/fast.css draws it, soft-light, at .7). The chips under the title say the day it was updated and the minutes to read (its words at about
  // 230 a minute, at least 1). The 404 page has no hero.
  if (KINDS[p.kind]) {
    const imgs = t.filter(x => x.tag === 'img' && !x.close), has = (x, c) => (' ' + (x.attrs.class || '') + ' ').includes(' ' + c + ' ');
    const heroes = imgs.filter(x => has(x, 'sp-hero')), feats = imgs.filter(x => has(x, 'sp-feat-img')), cards = imgs.filter(x => has(x, 'sp-card-img'));
    // The picture's own file (not a -dark one) is 1200 × 630, and it wears the grain: inside span.sp-pw, with span.sc-grain (aria-hidden, .7) next.
    const same = img => { const f = (img.attrs.src || '').slice(1), at = t.findIndex(x => x === img), wrap = t[at - 1], grain = t[at + 1];
      return /^og\/[\w-]+\.png$/.test(f) && !/-dark\.png$/.test(f) && existsSync(join(WEB, f)) && JSON.stringify(png(f)) === JSON.stringify([OG.width, OG.height])
        && !!wrap && wrap.tag === 'span' && has(wrap, 'sp-pw') && !!grain && grain.tag === 'span' && has(grain, 'sc-grain') && grain.attrs['aria-hidden'] === 'true' && /opacity: 0\.7;?$/.test(grain.attrs.style || ''); };
    ok(!imgs.some(x => /-dark\.png/.test(x.attrs.src || '')) && !t.some(x => x.tag === 'source' && /\/og\//.test(x.attrs.srcset || '')), 'the gradient pictures are the same in a dark screen: no -dark file, no <picture> source for them');
    const isHub = p.kind === 'hub', big = isHub ? feats : heroes;
    ok(big.length === 1 && (isHub ? !heroes.length : !feats.length), isHub ? 'a hub has a featured page and no hero' : 'one hero picture', [heroes.length, feats.length]);
    const hero = (big[0] || { attrs: {} }).attrs;
    if (isHub) ok(list.some(q => '/' + q.og === hero.src), 'the featured page’s picture is a page’s own', hero.src);
    else ok(hero.src === '/' + p.og, 'the hero is the page’s own picture', [hero.src, p.og]);
    ok(hero.width === '1200' && hero.height === '630' && hero.fetchpriority === 'high' && (isHub || !!(hero.alt || '').trim()), 'the big picture is 1200 × 630, with alt text, loaded first', hero);
    ok(big.every(same), 'the big picture is the page’s one picture (1200 × 630), with the app’s grain over it', hero.src);
    ok(cards.every(x => x.attrs.loading === 'lazy' && x.attrs.alt === '' && x.attrs.width === '1200' && x.attrs.height === '630' && /^\/og\/[\w-]+\.png$/.test(x.attrs.src || '') && existsSync(join(WEB, (x.attrs.src || '').slice(1))) && same(x)), 'the cards’ pictures are the site’s own, loaded lazily, each with the app’s grain over it', cards.map(x => x.attrs.src));
    ok(isHub || cards.length <= 3, 'at most three related pages as cards', cards.length);
    if (!isHub) {
      const words = [p.lead, ...(p.table ? [...p.table.columns, ...p.table.rows.flat()] : []), ...p.sections.flatMap(s => [s.h2, ...s.paras, ...s.bullets]), ...p.faq.flatMap(f => [f.q, f.a])].reduce((n, s) => n + plain(s).split(/\s+/).filter(Boolean).length, 0), minutes = Math.max(1, Math.round(words / 230));
      ok(body.includes('>' + minutes + ' min read<'), 'the minutes to read come from the page’s words', [words, minutes]);
      ok(body.includes('<time datetime="' + p.updated + '"'), 'the date chip is the page’s "updated"');
    }
    // The breadcrumb starts at the blog (Blog › its category › the page), and its data says the same. (The blog's front page has none to show.)
    const crumbs = (body.match(/<ol class="sp-crumbs">([\s\S]*?)<\/ol>/) || ['', ''])[1], names = [...crumbs.matchAll(/<(?:a|span)[^>]*>([^<]*)<\/(?:a|span)>/g)].map(m => un(m[1]));
    ok(p.slug === 'blog' ? JSON.stringify(p.crumbs.map(c => c.label)) === '["Blog"]' : JSON.stringify(names) === JSON.stringify(p.crumbs.map(c => c.label)) && names[0] === 'Blog', 'the breadcrumb starts at Blog and is the data’s', [names, p.crumbs.map(c => c.label)]);
    const links = [...crumbs.matchAll(/<a href="([^"]*)"/g)].map(m => m[1]);
    ok(p.slug === 'blog' || JSON.stringify(links) === JSON.stringify(p.crumbs.slice(0, -1).map(c => crumbUrl(c).replace(ORIGIN, ''))), 'the breadcrumb’s links are the data’s addresses', [links, p.crumbs.map(c => crumbUrl(c))]);
    if (!isHub) {
      // Questions: one card of closed rows, each question an h3 in a <summary>; the sources: one closed row, "Sources (N)".
      const qd = t.filter(x => x.tag === 'details' && !x.close && has(x, 'sp-qd')), qsum = [...body.matchAll(/<summary class="sp-qs"><h3 class="sp-qt">([\s\S]*?)<\/h3>/g)].map(m => un(m[1]));
      ok(qd.length === p.faq.length && qsum.length === p.faq.length && p.faq.every(f => qsum.includes(plain(f.q))) && qd.every(x => !('open' in x.attrs)), 'every question is a closed row: a <summary> with the question as an h3', [qd.length, p.faq.length]);
      const src = (body.match(/<details class="sp-src"><summary><span>([^<]*)<\/span>/) || [])[1];
      ok(p.sources.length ? src === 'Sources (' + p.sources.length + ')' && (body.match(/<details class="sp-src">[\s\S]*?<\/details>/)[0].match(/<a /g) || []).length === p.sources.length : src === undefined, 'the sources are one closed row, "Sources (N)", with every source in it', [src, p.sources.length]);
      // The table: at most six rows show; the rest wait behind "Show all N" (all of them are in the page).
      if (p.table) { const rows = (body.match(/<tbody>[\s\S]*?<\/tbody>/) || [''])[0].match(/<tr[\s>]/g) || [], more = body.includes('<details class="sp-more">'); ok(rows.length === p.table.rows.length && more === (rows.length > 6) && (!more || body.includes('Show all ' + rows.length)), 'a table past six rows has "Show all N", and every row is in the page', [rows.length, more]); }
      // "On this page": a tree (every address in it exists: the link check below), once for a wide screen and once, closed, for a phone.
      const tocs = body.match(/<nav class="sp-toc"[\s\S]*?<\/nav>/g) || [], top = tocs.length ? [...tocs[0].matchAll(/<li class="[^"]*"><a href="#([^"]+)"/g)].map(m => m[1]) : [];
      const sections = p.sections.filter(x => x.h2).length + (p.table ? 1 : 0) + ((p.visuals && (p.visuals.test || []).length >= 3) ? 1 : 0) + (p.kind === 'faq' ? new Set(p.faq.map(f => f.group || '')).size : p.faq.length ? 1 : 0);
      ok(tocs.length === 1 && top.length >= 2 && top.length === sections, '"On this page" is a tree of the page’s sections', [tocs.length, top.length, sections]);
      ok(/<details class="sp-tocd"><summary>[\s\S]*?On this page/.test(body), 'a phone’s "On this page" is a closed row under the lead');
      // Visuals (design/visuals.mjs, design/site/_visuals.json): every article has two or more (diagrams and the app's screens), a "Test yourself"
      // set of three or four flashcards before "Questions", tables made from the bullets that were already a table, and nothing in them but the
      // page's own words.
      if (['compare', 'alternative', 'feature', 'use'].includes(p.kind)) {
        const V = p.visuals || {}, figs = [...body.matchAll(/<figure class="sp-fig sp-f-([a-z]+)">([\s\S]*?)<\/figure>/g)];
        ok(figs.length >= 2, p.slug + ' has two or more visuals', figs.length);
        ok(figs.length === (V.figs || []).length && figs.every((f, i) => FIG_KINDS.includes(f[1])), 'every visual of ' + p.slug + ' is drawn, and every drawing is one of the known kinds', [figs.length, (V.figs || []).length]);
        ok(figs.every(f => /<figcaption class="sp-fcap">[^<]+<\/figcaption>/.test(f[2])), 'every visual of ' + p.slug + ' has a caption');
        const cards = body.match(/<details class="sp-tc sp-fc"[^>]*>/g) || [], tsec = (body.match(/<section class="sp-sec sp-test" id="test-yourself">[\s\S]*?<\/section>/) || [''])[0];
        ok(cards.length >= 3 && cards.length <= 4 && cards.length === (V.test || []).length, p.slug + ' has a "Test yourself" set of three or four cards', cards.length);
        ok(cards.every(c => !/\bopen\b/.test(c)) && /<a class="sp-u" href="https:\/\/app\.lucida\.cards\/">Make your own cards free<\/a>/.test(tsec), 'the cards are closed (a tap shows the answer), and "Make your own cards free" goes to the app');
        // Each card is the app's card (class sp-fc): the question on its front, the answer on its back (a tap turns it, on the same card), and a chip in
        // the corner that says what a tap does.
        ok([...tsec.matchAll(/<details class="sp-tc sp-fc"[^>]*><summary class="sp-tq"><span class="sp-fc-chip"><span class="sp-tca">Show the answer<\/span><span class="sp-tcq">Show the question<\/span><\/span><span class="sp-tt sp-tf">([^<]+)<\/span><span class="sp-tt sp-ta">([^<]+)<\/span><span class="sp-tn" aria-hidden="true">([^<]+)<\/span><\/summary><\/details>/g)].length === cards.length, 'each test card is the app’s card: a question on its front, an answer on its back (the question again as its faint note line), and a chip in the corner');
        ok(body.indexOf('id="test-yourself"') > 0 && body.indexOf('id="test-yourself"') < body.indexOf('id="questions"'), '"Test yourself" comes before "Questions"');
        ok(top.includes('test-yourself'), '"On this page" lists "Test yourself"', top);
        // The screens: a picture for a computer and for a phone, light and dark, each with its size and a real alt text.
        for (const f of figs.filter(x => x[1] === 'screen')) {
          const srcs = [...f[2].matchAll(/<source media="([^"]*)" srcset="([^"]*)" width="(\d+)" height="(\d+)">/g)], im = (f[2].match(/<img class="sp-shot" src="([^"]*)" alt="([^"]*)" width="(\d+)" height="(\d+)" loading="lazy"/) || []);
          const files = [...srcs.map(x => x[2]), im[1]];
          ok(srcs.length === 3 && im.length > 0 && /^\(max-width: 760px\) and \(prefers-color-scheme: dark\)$/.test(srcs[0][1]) && srcs[1][1] === '(max-width: 760px)' && srcs[2][1] === '(prefers-color-scheme: dark)', 'a screen picture has sources for a phone (dark, light) and a dark computer, then the light computer', srcs.map(x => x[1]));
          ok(files.every(x => /^\/shots\/[a-z-]+\.webp$/.test(x || '') && existsSync(join(WEB, (x || '').slice(1)))), 'every picture of a screen exists in web/shots', files);
          ok(files.every(x => !/phone/.test(x) === /^\/shots\/[a-z]+(-dark)?\.webp$/.test(x)) && files[0].includes('-phone-dark') && files[3] && !/phone|dark/.test(files[3]), 'the phone’s pictures are the phone ones, and the light computer’s is the plain one', files);
          ok((im[2] || '').trim().length >= 30 && srcs.every(x => +x[3] > 0 && +x[4] > 0) && +im[3] > 0 && +im[4] > 0, 'a screen picture has a real alt text and a width and height (nothing jumps)', im[2]);
        }
        // Tables made from bullets say what the bullets said.
        const norm = x => plain(x).toLowerCase().replace(/[^a-z0-9]+/g, ''), t2 = [...body.matchAll(/<table class="sp-t2">([\s\S]*?)<\/table>/g)];
        ok(t2.length === (V.tables || []).length, p.slug + ' has the tables it asks for', [t2.length, (V.tables || []).length]);
        (V.tables || []).forEach((tb, i) => {
          const sec = p.sections.find(x => x.h2 === tb.at), want = sec ? sec.bullets.filter(b => /^\*\*[^*]+\*\*/.test(b)).map(norm) : [], got = t2[i] ? [...t2[i][1].matchAll(/<tr[^>]*><th scope="row">([\s\S]*?)<\/th><td>([\s\S]*?)<\/td><\/tr>/g)].map(m => norm(un(m[1].replace(/<[^>]+>/g, '')) + ' ' + un(m[2].replace(/<[^>]+>/g, '')))) : [];
          ok(want.length >= 2 && JSON.stringify(want) === JSON.stringify(got), 'a table of "' + tb.at + '" has its bullets’ words, in their order', [want.length, got.length]);
        });
        // A "pick" card or a checklist row, and a fork's lines, are the bullets' own words.
        for (const f of figs.filter(x => ['pick', 'checklist'].includes(x[1]))) {
          const spec = V.figs.find(x => x.kind === f[1]), sec = p.sections.find(x => x.h2 === spec.at), text = norm(un(f[2].replace(/<[^>]+>/g, ' ')));
          ok(sec && sec.bullets.every(b => text.includes(norm(b))), 'the ' + f[1] + ' of ' + p.slug + ' holds every bullet’s words', spec.at);
        }
      }
    }
  }
  // The hubs: the featured page and the cards, each page once. The blog: tabs, a search box, a section for each category.
  if (p.kind === 'hub') {
    const hrefs = [...body.matchAll(/<a class="sp-(?:card|feat sp-wide)" href="([^"]*)"/g)].map(m => m[1]), once = new Set(hrefs);
    ok(once.size === hrefs.length && hrefs.length >= 6, 'every page shows once on ' + p.slug, hrefs.length);
    if (p.slug === 'blog') {
      const want = list.filter(q => categoryOf(q)).map(q => '/' + q.slug).sort(), got = hrefs.slice().sort();
      ok(JSON.stringify(got) === JSON.stringify(want), 'the blog links every page of its categories once, and nothing else', [got.length, want.length, want.filter(x => !got.includes(x)), got.filter(x => !want.includes(x))]);
      const tabs = [...body.matchAll(/<a class="sp-tab" href="#([^"]*)" data-tab="([^"]*)"/g)].map(m => m[2]), secs = [...body.matchAll(/<section class="sp-bsec" id="([^"]*)" data-cat="([^"]*)"/g)].map(m => m[2]);
      ok(JSON.stringify(tabs) === JSON.stringify(['all', ...CATEGORIES.map(c => c.id)]) && JSON.stringify(secs) === JSON.stringify(CATEGORIES.map(c => c.id)), 'the blog has a tab and a section for each category', [tabs, secs]);
      ok(/<form class="sp-search sp-nojs" role="search"[^>]*><svg[\s\S]*?<input type="search"/.test(body) && body.includes('<script>'), 'the blog has a search box (shown by its script) and every card shows without the script');
      ok((body.match(/data-s="[^"]+"/g) || []).length === hrefs.length, 'every card says what the search looks in', hrefs.length);
    }
  }
  ok(!/\.dc\.html/.test(body), 'no links to canvas boards');
  // No card shows a pill with the kind of page (Comparison, Feature, Guide, Help, Overview): the section headings already say it. And a table sits in a box
  // that scrolls sideways when it must (a focusable region), keeping its real columns.
  ok(!/sp-card-chip|sp-kchip/.test(html), 'no card shows a pill with its category (no sp-card-chip or sp-kchip anywhere)');
  for (const t of body.matchAll(/<div class="sp-table">([\s\S]*?)<\/table>/g)) ok(/^\s*<div class="sp-tsc" role="region" aria-label="Table, scrolls sideways" tabindex="0"><table style="--f: \d+px; --cols: \d+;">/.test(t[1]), 'a table sits in a box that scrolls sideways (a focusable region) and says how wide its columns are');
  ok(html.length < (dual > 0 ? 420 : 140) * 1024, 'the page is small', Math.round(html.length / 1024) + ' KB');
  // the footer links to the hub, features (when there are any), FAQ, pricing, privacy and terms
  const foot = (body.match(/<nav aria-label="Footer"[\s\S]*?<\/nav>/) || [''])[0], footLinks = [...foot.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
  const want = ['/blog', '/compare', ...(by.has('features') ? ['/features'] : []), ...(by.has('faq') ? ['/faq'] : []), '/pricing', '/privacy', '/terms'];
  ok(want.every(w => footLinks.includes(w)), 'the footer links ' + want.join(', '), footLinks);
  // structured data
  const blocks = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (notFound) { ok(!blocks.length, 'the 404 page has no structured data'); continue; }
  if (!ok(blocks.length === 1, 'one structured-data block', blocks.length)) continue;
  let data; try { data = JSON.parse(blocks[0][1]); } catch (e) { ok(false, 'the structured data parses', e.message); continue; }
  ok(true, 'the structured data parses');
  const bad = checkJsonLd(data); ok(!bad.length, 'the structured data is valid schema.org', bad);
  const graph = data['@graph'] || [], types = graph.flatMap(n => [].concat(n['@type'])), has = x => types.includes(x);
  ok(has('Organization') && has('WebSite'), 'Organization and WebSite');
  const org = graph.find(n => n['@type'] === 'Organization');
  ok(org && org.name === 'Lucida' && org.url === ORIGIN + '/' && org.email === EMAIL && JSON.stringify(org.sameAs) === JSON.stringify(SOCIALS.map(s => s[2])) && /^https:\/\/lucida\.cards\/icons\/icon-512\.png$/.test(org.logo.url) && existsSync(join(WEB, 'icons/icon-512.png')), 'the organization: name, url, logo, email and the socials');
  ok(has('SoftwareApplication') === ['home', 'pricing'].includes(p.kind), 'the app is described on the landing page and on pricing, not elsewhere');
  ok(has('BreadcrumbList') === (p.slug !== ''), 'a breadcrumb on every inner page');
  ok(has('Article') === ['compare', 'alternative'].includes(p.kind), 'an Article on comparison pages only');
  const wantFaq = (p.faq || []).length > 0 || p.kind === 'faq';
  ok(has('FAQPage') === wantFaq, 'FAQPage where the page has questions');
  if (has('Article')) { const a = graph.find(n => n['@type'] === 'Article'); ok(a.dateModified === p.updated && /^\d{4}-\d{2}-\d{2}$/.test(a.dateModified), 'the article’s dateModified is the page’s "updated"'); }
  if (wantFaq) {
    const qs = graph.find(n => n['@type'] === 'FAQPage').mainEntity.map(q => q.name), visible = textOf(body);
    ok(qs.length === (p.faq || []).length && qs.every(q => visible.includes(q.slice(0, 40))), 'every question in the data is on the page, and the other way round', qs.length + ' of ' + (p.faq || []).length);
  }
  if (has('SoftwareApplication')) {
    const app = graph.find(n => [].concat(n['@type']).includes('SoftwareApplication'));
    ok(app.applicationCategory === 'EducationalApplication' && app.operatingSystem === 'Web', 'the app: EducationalApplication, Web');
    const off = Object.fromEntries(app.offers.map(o => [o.name, o]));
    ok(off['Free'] && off['Free'].price === '0' && off['Free'].priceCurrency === 'USD' && off['Pro, monthly'].price === PRICE.monthly && off['Pro, yearly'].price === PRICE.yearly && off['Pro, monthly'].priceCurrency === 'USD', 'offers: Free 0, Pro ' + PRICE.monthly + ' a month, ' + PRICE.yearly + ' a year, in USD');
    if (p.kind === 'pricing') ok(body.includes('$' + PRICE.monthly) && body.includes('$' + PRICE.yearly), 'the prices in the data are the ones on the pricing page');
  }
  // links
  const anchors = t.filter(x => x.tag === 'a' && !x.close), ids = new Set(t.map(x => x.attrs.id).filter(Boolean));
  const hosts = {}; let n = 0;
  for (const a of anchors) {
    const href = un(a.attrs.href || ''); n++;
    if (!href) { ok(false, 'a link has no address'); continue; }
    if (href.startsWith('#')) { ok(href === '#' || ids.has(href.slice(1)), 'the link ' + href + ' goes to something on the page'); continue; }
    if (href.startsWith('mailto:')) { ok(href === 'mailto:' + EMAIL, 'the email link is the support address', href); continue; }
    let u; try { u = new URL(href, ORIGIN + pathOf(p)); } catch { ok(false, 'the link ' + href + ' is an address'); continue; }
    if (u.origin === ORIGIN) { const r = via('lucida.cards', u.pathname); ok(r.type === 'file', 'the link ' + href + ' reaches a page of the site', r.type + (r.to ? ' → ' + r.to : '')); if (r.type === 'file' && u.pathname !== '/') ok(existsSync(r.file), 'its file exists'); continue; }
    if (u.origin === APP) { const r = via('app.lucida.cards', u.pathname); ok(r.type === 'file' || r.type === 'function', 'the link ' + href + ' reaches the app', r.type); continue; }
    ok(u.protocol === 'https:', 'the outside link ' + href + ' is https'); (hosts[u.hostname] = hosts[u.hostname] || new Set()).add(u.href);
    if (a.attrs.target === '_blank') ok(/noopener/.test(a.attrs.rel || ''), 'an outside link that opens a new tab has rel="noopener"', href);
  }
  ok(n >= 8, 'the page links onward', n);
  p.outside = [...new Set(Object.values(hosts).flatMap(s => [...s]))];
}

// ---------- the sitemap, robots.txt, llms.txt, llms-full.txt, and the routes of the two hosts ----------
console.log('Sitemap, robots.txt, llms.txt, llms-full.txt');
const sm = read('site/sitemap.xml'), locs = [...sm.matchAll(/<url><loc>([^<]*)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?<\/url>/g)];
ok(/^<\?xml version="1.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/.test(sm) && sm.trim().endsWith('</urlset>'), 'sitemap.xml is a urlset');
ok(locs.length === list.length && list.every(p => locs.filter(l => l[1] === p.url).length === 1), 'the sitemap lists every page once, and nothing else', [locs.length, list.length]);
ok(locs.every(l => /^\d{4}-\d{2}-\d{2}$/.test(l[2] || '')) && list.every(p => (locs.find(l => l[1] === p.url) || [])[2] === p.updated), 'every page has its own lastmod');
const robots = read('site/robots.txt');
ok(/User-agent: \*\nAllow: \//.test(robots), 'robots.txt allows everyone');
for (const b of AI_BOTS) ok(new RegExp('User-agent: ' + b + '\\nAllow: /').test(robots), 'robots.txt names ' + b);
ok(!/^Disallow:/m.test(robots) && robots.includes('Sitemap: ' + ORIGIN + '/sitemap.xml') && robots.includes('Sitemap: ' + APP + '/sitemap.xml'), 'robots.txt blocks nothing and names both sitemaps');
const llms = read('site/llms.txt'), full = read('site/llms-full.txt');
ok(/^# Lucida\n\n> [^\n]+\n/.test(llms), 'llms.txt starts with the name and a one-paragraph summary');
ok(list.every(p => llms.includes('](' + p.url + ')')), 'llms.txt links every page');
ok(/^## Product$/m.test(llms) && /^## Comparisons$/m.test(llms) && /^## FAQ$/m.test(llms) && /^## Support$/m.test(llms) && (!list.some(p => ['feature', 'use'].includes(p.kind)) || /^## Features and guides$/m.test(llms)), 'llms.txt has its sections: product, comparisons, features, FAQ, support');
ok(/mailto:team@lucida\.cards/.test(llms), 'llms.txt gives the support address');
ok(list.every(p => full.includes('URL: ' + p.url)), 'llms-full.txt holds every page');
for (const p of list.filter(p => p.faq && p.faq.length)) ok(p.faq.every(f => full.includes(plain(f.q))), 'llms-full.txt has every question of ' + (p.slug || '/'));
ok(!HOLE.test(full) && !/\[object Object\]|<div|<span/.test(full) && full.length > 3000, 'llms-full.txt is plain markdown');
ok(/^## Free: \$0/m.test(full) && full.includes('$' + PRICE.monthly + ' a month') && full.includes('$' + PRICE.yearly + ' a year'), 'llms-full.txt has the prices');

console.log('Hosts (vercel.json, as Vercel reads it)');
const file = (host, path, name) => { const r = via(host, path); return r.type === 'file' && r.file.endsWith('/' + name); };
ok(file('lucida.cards', '/', 'landing.html') && file('lucida.cards', '/pricing', 'pricing.html') && file('lucida.cards', '/privacy', 'privacy.html') && file('lucida.cards', '/terms', 'terms.html'), 'lucida.cards: /, /pricing, /privacy and /terms are their pages');
for (const p of list.filter(p => !FIXED.some(f => f.slug === p.slug))) ok(file('lucida.cards', pathOf(p), p.slug.split('/').pop() + '.html') && via('lucida.cards', pathOf(p)).rewritten === '/site/' + p.slug + '.html', 'lucida.cards' + pathOf(p) + ' is its page');
for (const [path, name] of [['/robots.txt', 'robots.txt'], ['/sitemap.xml', 'sitemap.xml'], ['/llms.txt', 'llms.txt'], ['/llms-full.txt', 'llms-full.txt']]) ok(via('lucida.cards', path).rewritten === '/site/' + name && file('lucida.cards', path, name), 'lucida.cards' + path + ' is the site’s own file, not the app’s');
ok(file('app.lucida.cards', '/robots.txt', 'robots-app.txt') && /Disallow: \/api\//.test(read('robots-app.txt')) && via('app.lucida.cards', '/sitemap.xml').type === 'function', 'app.lucida.cards keeps its own robots.txt and its sitemap from the function');
ok(via('lucida.cards', '/definitely-not-a-page').type === 'notfound' && via('lucida.cards', '/definitely/not/a-page').type === 'notfound' && via('lucida.cards', '/nope.png').type === 'notfound' && via('lucida.cards', '/vs/nothing').type === 'notfound' && !!via('lucida.cards', '/nothing').page, 'lucida.cards: an unknown address is a 404 (and web/404.html is the page for it)');
ok(existsSync(join(WEB, '404.html')), 'web/404.html exists');
for (const path of ['/sign-in', '/discover', '/@maria', '/@maria/cell-biology', '/@maria/cell-biology/suggest', '/d/sabc123', '/d/sabc123/suggest', '/class/ABCDEF', '/join', '/join/123456', '/play', '/live/123456', '/deck/x/import', '/library/cards', '/settings/theme/aero', '/review', '/learn/x', '/stats', '/welcome', '/you', '/activity', '/suggestions', '/decks/new', '/verify', '/admin', '/api/state', '/auth/callback', '/mcp', '/mcp/lk_abc', '/media/m1.png', '/pro']) {
  const r = via('lucida.cards', path); ok(r.type === 'redirect' && r.to === APP + path && r.status === 307, 'lucida.cards' + path + ' still goes to the app', r);
}
// lucida.cards/connect is the Connect Lucida guide (the app's own Connect AI page stays at app.lucida.cards/connect).
{ const g = via('lucida.cards', '/connect'); ok(g.type === 'file' && /connect-guide\.html$/.test(g.file || ''), 'lucida.cards/connect shows the Connect Lucida guide', g); }
ok(via('lucida.cards', '/landing.html').to === '/' && via('lucida.cards', '/pricing.html').to === '/pricing', 'the old .html addresses go to the clean ones');
ok(file('app.lucida.cards', '/pricing', 'pricing.html') && file('app.lucida.cards', '/zzz', 'app.html') && via('app.lucida.cards', '/@maria').type === 'function' && via('app.lucida.cards', '/d/sabc').type === 'function' && via('app.lucida.cards', '/api/state').type === 'function', 'app.lucida.cards: pages, the app, /@…, /d/… and /api unchanged');
ok(via('app.lucida.cards', '/vs/anki').rewritten === '/app.html' && via('app.lucida.cards', '/compare').rewritten === '/app.html', 'app.lucida.cards doesn’t serve the site’s pages');
// Suggest a change: the card editor's suggest mode, at a shared deck page's address and /suggest, is the app's own page.
ok(file('app.lucida.cards', '/@maria/cell-biology/suggest', 'app.html') && file('app.lucida.cards', '/d/sabc123/suggest', 'app.html'), 'app.lucida.cards: a shared deck’s /suggest is the app');

console.log('Icons (the tab icon and the home-screen icons, on both hosts)');
{
  // The four links, as the pages write them (design/seo.mjs): what each says it is, and what its file really is.
  const linked = [...ICON_LINKS.matchAll(/<link rel="([^"]+)" href="([^"]+)"([^>]*)>/g)].map(m => ({ rel: m[1], href: m[2], type: (/type="([^"]+)"/.exec(m[3]) || [])[1], sizes: (/sizes="(\d+)x(\d+)"/.exec(m[3]) || []).slice(1).map(Number) }));
  ok(linked.length === 4 && linked.map(l => l.href).join() === '/favicon.ico,/icon.svg,/icons/icon-192.png,/apple-touch-icon.png', 'the icons every page names are favicon.ico, icon.svg, icons/icon-192.png and apple-touch-icon.png', linked.map(l => l.href));
  const file = href => join(WEB, href.replace(/^\//, ''));
  for (const l of linked) ok(existsSync(file(l.href)), 'icon ' + l.href + ' exists');
  // /favicon.ico: an .ico of 16, 32 and 48 pixels, each a PNG of that size (a browser or Google takes the one that fits)
  const ico = existsSync(file('/favicon.ico')) ? readIco(readFileSync(file('/favicon.ico'))) : [];
  ok(ico.map(f => f.width).join() === '16,32,48' && ico.every(f => f.isPng && f.pngWidth === f.width && f.pngHeight === f.height), '/favicon.ico holds the tab icon at 16, 32 and 48 pixels, each a PNG of that size', ico.map(f => [f.width, f.height, f.pngWidth]));
  const fav = linked.find(l => l.href === '/favicon.ico');
  ok(fav.sizes.join('x') === '32x32' && ico.some(f => f.width === 32), 'the link to favicon.ico says 32x32 (so Chrome and Edge take the SVG over it) and the file has that size');
  // /icon.svg: the tab icon, white dots on a black tile, in a 32-pixel box (the picture the .ico is drawn from)
  const svg = existsSync(file('/icon.svg')) ? readFileSync(file('/icon.svg'), 'utf8') : '';
  ok(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32">/.test(svg) && /\.tile\{fill:#000/.test(svg) && (svg.match(/<circle /g) || []).length === 3 && /<g fill="#fff"/.test(svg), '/icon.svg is the tab icon: three white dots on a black rounded tile');
  // the PNGs: the sizes the links say
  for (const l of linked.filter(x => x.type === 'image/png')) ok(JSON.stringify(png(l.href.replace(/^\//, ''))) === JSON.stringify(l.sizes), l.href + ' is a PNG of ' + l.sizes.join(' × '), png(l.href.replace(/^\//, '')));
  ok(JSON.stringify(png('apple-touch-icon.png')) === JSON.stringify([180, 180]) && JSON.stringify(png('apple-touch-icon-precomposed.png')) === JSON.stringify([180, 180]), 'the apple-touch-icon at the root, and the older -precomposed name, are 180 × 180');
  const bytes = f => readFileSync(join(WEB, f));
  ok(bytes('apple-touch-icon.png').equals(bytes('icons/apple-touch-icon.png')) && bytes('apple-touch-icon-precomposed.png').equals(bytes('icons/apple-touch-icon.png')), 'both root apple-touch icons are the same picture as icons/apple-touch-icon.png');
  // Both hosts hand out every icon, from the root, as a file with its own type and a day of cache: a browser and Google ask for these by default.
  const TYPES_OF = { '/favicon.ico': /^image\/(x-icon|vnd\.microsoft\.icon)$/, '/apple-touch-icon.png': /^image\/png$/, '/apple-touch-icon-precomposed.png': /^image\/png$/, '/icon.svg': /^image\/svg\+xml$/, '/icons/icon-192.png': null, '/icons/apple-touch-icon.png': null };
  for (const host of ['lucida.cards', 'app.lucida.cards']) for (const [path, type] of Object.entries(TYPES_OF)) {
    const r = via(host, path), h = headersFor(config, path);
    ok(r.type === 'file' && r.file === file(path) && (!type || type.test(h['content-type'] || '')) && /public, max-age=86400/.test(h['cache-control'] || ''), host + path + ' is the icon file (not a 404 page), with the right type and a day of cache', [r.type, h['content-type'], h['cache-control']]);
  }
  // robots.txt doesn't keep Google or anyone from them
  const disallowed = txt => [...txt.matchAll(/^Disallow:\s*(\S*)/gim)].map(m => m[1]).filter(Boolean);
  for (const [who, txt] of [['lucida.cards', read('site/robots.txt')], ['app.lucida.cards', read('robots-app.txt')]]) ok(Object.keys(TYPES_OF).every(path => !disallowed(txt).some(d => path.startsWith(d))), who + '’s robots.txt doesn’t block any icon', disallowed(txt));
  // The app's own pages: its page (and so every public deck page and profile, which are that page with their words put in), and the one page it
  // writes itself, name the same four icons; and its local server knows what an .ico and an .svg are.
  const appHead = read('app.html'), handler = readFileSync(join(WEB, 'handler.mjs'), 'utf8');
  ok(appHead.slice(0, appHead.indexOf('</head>')).includes(ICON_LINKS), 'web/app.html (the app, public decks, profiles) names the four icons');
  ok(handler.includes('const GOOGLE_BACK = `<!doctype html>') && handler.slice(handler.indexOf('const GOOGLE_BACK')).split('<body')[0].includes(ICON_LINKS), 'the app’s sign-in page (GOOGLE_BACK in web/handler.mjs) names the four icons');
  ok(/html = html\.replace\(\/<title>\[\^<\]\*<\\\/title>\/, \(\) => head\)/.test(handler), 'a public deck page changes only the <title> of web/app.html, so it keeps the icons');
  ok(/'\.ico': 'image\/x-icon'/.test(handler) && /'\.svg': 'image\/svg\+xml'/.test(handler), 'the app’s own server gives an .ico and an .svg their types');
}

console.log('Visuals (design/site/_visuals.json, design/visuals.mjs, web/shots)');
{
  // The data: every entry is an article page; every figure, table and card says where it goes and what it needs; the test cards say only what
  // the page says (the numbers and names in an answer are on the page, and nearly all of its longer words).
  const articles = pages.filter(p => ['compare', 'alternative', 'feature', 'use'].includes(p.kind) && !p.sample && !p.synthetic);
  ok(articles.every(p => VISUALS[p.slug]), 'every article page has visuals', articles.filter(p => !VISUALS[p.slug]).map(p => p.slug));
  ok(Object.keys(VISUALS).every(k => articles.some(p => p.slug === k)), '_visuals.json has only article pages', Object.keys(VISUALS).filter(k => !articles.some(p => p.slug === k)));
  const text = p => plain([p.lead, ...(p.table ? [...p.table.columns, ...p.table.rows.flat()] : []), ...p.sections.flatMap(x => [x.h2, ...x.paras, ...x.bullets]), ...p.faq.flatMap(f => [f.q, f.a])].join(' ')).toLowerCase().replace(/[‘’]/g, '\'').replace(/[“”]/g, '"');
  for (const p of articles) {
    const V = VISUALS[p.slug] || {}, h2s = p.sections.map(x => x.h2), txt = text(p), words = new Set(txt.match(/[a-z0-9]+/g));
    for (const f of V.figs || []) {
      ok(FIG_KINDS.includes(f.kind) && h2s.includes(f.at), p.slug + ': a ' + f.kind + ' figure goes in a section the page has', [f.kind, f.at]);
      if (f.kind === 'screen') ok(!!SCREENS[f.id], p.slug + ': the screen "' + f.id + '" is in the table of screens', f.id);
      if (f.kind === 'pick') ok(p.sections.find(x => x.h2 === f.at).bullets.length === 2 && p.sections.find(x => x.h2 === f.at).bullets.every(b => /^\*\*Pick [^*]+\*\*/.test(b)), p.slug + ': a pick figure takes two "Pick X if …" bullets');
      if (f.kind === 'steps' && f.auto) ok(p.sections.find(x => x.h2 === f.at).bullets.filter(b => /^\*\*\d+\./.test(b)).length >= 3, p.slug + ': an automatic steps figure takes three or more numbered steps');
      if (f.kind === 'steps' && !f.auto) ok((f.steps || []).length >= 3 && f.steps.length <= 4, p.slug + ': a steps figure has three or four step cards', (f.steps || []).length);
      // A step card's words are the section's own: its title and its line are made of words the section says.
      if (f.kind === 'steps' && !f.auto) { const sec = text({ lead: '', table: null, sections: [p.sections.find(x => x.h2 === f.at)], faq: [] }); const miss = (f.steps || []).flatMap(x => (x.t + ' ' + (x.d || '')).toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !sec.includes(w.replace(/s$/, ''))); ok(!miss.length, p.slug + ': a step card says only what its section says', miss); }
    }
    for (const tb of V.tables || []) { const sec = p.sections.find(x => x.h2 === tb.at); ok(sec && sec.bullets.filter(b => /^\*\*[^*]+\*\*/.test(b)).length >= 2 && (tb.columns || []).length === 2, p.slug + ': a table is made from a section with two or more bullets that begin with a bold lead-in', tb.at); }
    const cards = V.test || [];
    ok(cards.length >= 3 && cards.length <= 4, p.slug + ' has three or four test cards', cards.length);
    const seen = new Set();
    cards.forEach((c, i) => {
      const tag = p.slug + ' test card ' + (i + 1), q = plain(c.q || ''), a = plain(c.a || '');
      ok(q.split(/\s+/).length <= 14 && /\?$/.test(q) && a.split(/\s+/).length <= 24 && !seen.has(q.toLowerCase()), tag + ': the question is short and ends in ?, the answer short, and no question twice', [q, a]);
      seen.add(q.toLowerCase());
      const al = a.toLowerCase().replace(/[‘’]/g, '\'');
      const nums = (al.match(/\d[\d,.]*%?/g) || []).map(n => n.replace(/[.,]+$/, '')).filter(n => !txt.includes(n) && !txt.replace(/,/g, '').includes(n.replace(/,/g, '')));
      const caps = a.split(/\s+/).slice(1).map(w => w.replace(/[^A-Za-z0-9’']/g, '')).filter(w => /^[A-Z]/.test(w) && !txt.includes(w.toLowerCase().replace(/[‘’]/g, '\'')) && !words.has(w.toLowerCase().replace(/[’']s$/, '')));
      const long = al.match(/[a-z]{5,}/g) || [], missing = long.filter(w => !words.has(w) && !words.has(w.replace(/s$/, '')) && !words.has(w + 's') && !txt.includes(w.slice(0, -3)));
      ok(!nums.length && !caps.length && (!long.length || missing.length / long.length <= 0.3), tag + ': the answer says only what the page says', { numbers: nums, names: caps, words: missing });
    });
  }
  // The pictures of the app's screens: every one is drawn (web/shots), from the boards as they are now (a note when a board has changed since).
  let man = {}; try { man = JSON.parse(read('shots/manifest.json')); } catch {}
  const want = screenPictures();
  ok(want.every(w => existsSync(join(WEB, 'shots', w.file)) && man[w.file]), 'every screen picture is in web/shots (node design/screens.mjs)', want.filter(w => !existsSync(join(WEB, 'shots', w.file))).map(w => w.file));
  const old = want.filter(w => man[w.file] && man[w.file].hash !== w.hash).map(w => w.file);
  if (old.length) note('web/shots: ' + old.length + ' screen pictures were drawn from older boards or crops than the current ones (node design/screens.mjs redraws them)');
  ok(Object.keys(man).length === want.length && existsSync(join(WEB, 'shots')) && readdirSync(join(WEB, 'shots')).filter(f => f.endsWith('.webp')).length === want.length, 'web/shots has the screen pictures and no others', readdirSync(join(WEB, 'shots')).length + ' files vs ' + want.length);
  // The canvas boards draw each screen with the app's own board (a dc-import) and each article's figures from the same markup.
  for (const name of ['SiteCompare', 'SiteFeature']) for (const suffix of ['', 'Phone']) {
    const src = readFileSync(join(ROOT, 'design/canvas/project', name + suffix + '.dc.html'), 'utf8'), boards = [...new Set(Object.values(SCREENS).flatMap(x => [x.desk.board, x.phone.board]))];
    ok(boards.every(b => src.includes('<dc-import name="' + b + '" dark="{{dark}}"')) && src.includes('class="sp-fig sp-f-{{f.kind}}"') && src.includes('id="test-yourself"'), name + suffix + ' draws the screens with the app’s boards, the figures, and the test cards');
  }
  { const src = readFileSync(join(ROOT, 'design/canvas/project/SiteConnect.dc.html'), 'utf8'); ok(src.includes('class="sp-fig sp-f-{{f.kind}}"') && src.includes('<dc-import name="WebConnectConsent"') && CONNECT_FIGS.length === 2, 'the Connect guide board has its steps and the consent screen'); }
  { const html = read('connect-guide.html'); ok((html.match(/<figure class="sp-fig sp-f-/g) || []).length === 2 && /<ol class="sp-steps sp-n4">/.test(html) && html.includes('/shots/consent.webp'), 'the Connect guide has its four steps as cards and the screen where an AI app asks to use your decks'); }
}

console.log('Link-preview pictures, icons, boards');
let manifest = {}; try { manifest = JSON.parse(read('og/manifest.json')); } catch {}
const og = readFileSync(join(ROOT, 'design/canvas/project/SiteOg.dc.html'), 'utf8'), art = (og.match(/og-art: ([0-9a-f]+)/) || [])[1];
ok(art && manifest._art === art, 'the pictures were drawn by the current SiteOg drawing (node design/og.mjs)', [manifest._art, art]);
for (const p of list) {
  const m = manifest[p.slug || 'home'];
  ok(m && m.file === p.og && m.dark === undefined && m.fingerprint === ogFingerprint(p), 'the picture for ' + (p.slug || '/') + ' was drawn for its current title, scene and palette', m);
  ok(existsSync(join(WEB, p.og)) && JSON.stringify(png(p.og)) === JSON.stringify([OG.width, OG.height]), 'the picture for ' + (p.slug || '/') + ' exists and is 1200 × 630', p.og);
}
// A picture carries no web address, nowhere on it: not under its title, not in a scene (design/og.mjs writes every word a picture shows into its manifest).
{
  const url = /lucida\.cards|app\.lucida|https?:|www\.|\.(com|cards|app|io|org)\b/i, texts = list.map(p => [p.slug || 'home', (manifest[p.slug || 'home'] || {}).text]);
  ok(texts.every(([, t]) => Array.isArray(t) && t.length >= 2), 'the pictures’ words are in the manifest (node design/og.mjs)', texts.filter(([, t]) => !Array.isArray(t) || t.length < 2).map(x => x[0]));
  ok(texts.every(([, t]) => (t || []).every(x => !url.test(x))), 'no picture shows a web address', texts.flatMap(([k, t]) => (t || []).filter(x => url.test(x)).map(x => k + ': ' + x)));
  ok(!/\{\{url\}\}|lucida\.cards/.test(og.split('<x-dc>')[1].split('</x-dc>')[0].replace(/<helmet>[\s\S]*?<\/helmet>/, '')), 'the SiteOg board’s drawing has no address in it');
}
ok(readdirSync(join(WEB, 'og')).filter(f => /-dark\./.test(f)).length === 0, 'web/og has no -dark pictures (the gradients look the same in dark mode)', readdirSync(join(WEB, 'og')).filter(f => /-dark\./.test(f)));
ok(readdirSync(join(WEB, 'og')).filter(f => f.endsWith('.png')).length === list.length, 'web/og has one picture for every page and no others', readdirSync(join(WEB, 'og')).length + ' files vs ' + list.length);
ok(Object.keys(manifest).filter(k => !k.startsWith('_')).length === list.length, 'no pictures for pages that aren’t there', Object.keys(manifest).length + ' vs ' + list.length);
// Every two pages' pictures differ clearly: no two share a gradient style and a palette, pages that share a style have palettes of their own,
// and the pictures themselves (as a grid of colors, light) are at least 6 apart (mean difference of 0 to 255) from every other. On the
// blog's grid, no two neighbors (left and right, above and below, and one after another on a phone) share a style.
{
  const keys = list.map(p => { const k = pictureOf(p); return { slug: p.slug || 'home', style: k.style, grad: k.grad }; });
  ok(new Set(keys.map(k => k.style + '/' + k.grad)).size === keys.length, 'no two pages have the same gradient style in the same palette', keys.filter((k, i) => keys.findIndex(o => o.style === k.style && o.grad === k.grad) !== i).map(k => k.slug));
  ok(keys.every(k => STYLES.includes(k.style) && GRAD_NAMES.includes(k.grad)), 'every page’s gradient style and palette exist (design/site.mjs)', keys.filter(k => !STYLES.includes(k.style) || !GRAD_NAMES.includes(k.grad)).map(k => k.slug));
  const grids = list.map(p => { try { return thumb(readPng(readFileSync(join(WEB, p.og)))); } catch (e) { return null; } });
  const near = [];
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) if (grids[a] && grids[b]) { const d = distance(grids[a], grids[b]); if (d < 6) near.push((list[a].slug || 'home') + ' / ' + (list[b].slug || 'home') + ' ' + d.toFixed(1)); }
  ok(grids.every(Boolean) && !near.length, 'every two pages’ pictures differ clearly', grids.every(Boolean) ? near : 'a picture couldn’t be read');
  const blog = htmlOf.get('blog') || '', style = href => { const q = list.find(x => '/' + x.slug === href); return q ? pictureOf(q).style : '?'; };
  const order = [(blog.match(/<a class="sp-feat sp-wide" href="([^"]*)"/) || [])[1], ...[...blog.matchAll(/<section class="sp-bsec"[\s\S]*?<\/section>/g)].flatMap(m => [...m[0].matchAll(/<a class="sp-card" href="([^"]*)"/g)].map(x => x[1]))].filter(Boolean);
  const clash = [];
  for (const m of blog.matchAll(/<section class="sp-bsec"[\s\S]*?<\/section>/g)) { const cards = [...m[0].matchAll(/<a class="sp-card" href="([^"]*)"/g)].map(x => x[1]); cards.forEach((c, i) => { if (i % 3 < 2 && cards[i + 1] && style(c) === style(cards[i + 1])) clash.push(c + ' | ' + cards[i + 1]); if (cards[i + 3] && style(c) === style(cards[i + 3])) clash.push(c + ' / ' + cards[i + 3]); }); }
  order.forEach((c, i) => { if (order[i + 1] && style(c) === style(order[i + 1])) clash.push(c + ' > ' + order[i + 1]); });
  ok(order.length >= 20 && !clash.length, 'no two neighbors on the blog’s grid share a gradient style', clash);
}
// The gradients themselves, as people see them: design/og.mjs draws each picture's gradient alone (no words, no veil under them, no scene) as a
// grid of 32 × 17 colors (design/og-bg.json), and the grids are compared in CIELAB (the mean over the 544 cells of how far apart a cell's two
// colors are; about 2 is the least a person notices). No two pictures on the site may be closer than 30 (the blog's first palettes had a pair at 14),
// and pictures that sit next to each other (beside, above or after one another on the blog, a hub or in Keep reading) not closer than 60.
{
  const ANY = 30, NEXT = 60;
  let bgd = null; try { bgd = JSON.parse(readFileSync(join(ROOT, 'design/og-bg.json'), 'utf8')); } catch {}
  ok(bgd && bgd._art === art, 'the pictures’ gradients (design/og-bg.json) were drawn by the current SiteOg drawing (node design/og.mjs)', bgd && [bgd._art, art]);
  const keys = list.map(p => p.slug || 'home'), grid = k => Uint8Array.from(Buffer.from(((bgd || {}).bg || {})[k] || '', 'base64'));
  ok(keys.every(k => grid(k).length === 32 * 17 * 3), 'every picture has its gradient as a grid of 32 × 17 colors', keys.filter(k => grid(k).length !== 32 * 17 * 3));
  if (keys.every(k => grid(k).length === 32 * 17 * 3)) {
    const d = {}, dist = (a, b) => { const k = a < b ? a + '|' + b : b + '|' + a; return d[k] ?? (d[k] = labDistance(grid(a), grid(b))); };
    const close = [];
    for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) { const x = dist(keys[a], keys[b]); if (x < ANY) close.push(keys[a] + ' / ' + keys[b] + ' ' + x.toFixed(1)); }
    ok(!close.length, 'no two pictures have gradients that look alike (every two at least ' + ANY + ' apart)', close);
    // Who is next to whom.
    const slugOf = h => h.replace(/^\//, '') || 'home', next = new Map(), add = (a, b, where) => { if (a !== b && keys.includes(a) && keys.includes(b)) next.set(a < b ? a + '|' + b : b + '|' + a, where); };
    for (const [slug, html] of htmlOf) {
      const order = [...html.matchAll(/<a class="sp-(?:card|feat sp-wide)" href="([^"]*)"/g)].map(m => slugOf(m[1]));
      order.forEach((c, i) => { if (order[i + 1]) add(c, order[i + 1], slug + ' (one after another)'); });
      for (const m of html.matchAll(/<div class="sp-cards sp-wide">([\s\S]*?)<\/div>/g)) { const cards = [...m[1].matchAll(/<a class="sp-card" href="([^"]*)"/g)].map(x => slugOf(x[1])); cards.forEach((c, i) => { if (i % 3 < 2 && cards[i + 1]) add(c, cards[i + 1], slug + ' (beside)'); if (cards[i + 3]) add(c, cards[i + 3], slug + ' (below)'); }); }
      const feat = (html.match(/<a class="sp-feat sp-wide" href="([^"]*)"/) || [])[1];
      if (feat) for (const x of [...html.matchAll(/<a class="sp-card" href="([^"]*)"/g)].slice(0, 3)) add(slugOf(feat), slugOf(x[1]), slug + ' (featured, above)');
    }
    const tooNear = [...next].map(([k, where]) => { const [a, b] = k.split('|'); return [dist(a, b), a, b, where]; }).filter(x => x[0] < NEXT).map(x => x[1] + ' / ' + x[2] + ' ' + x[0].toFixed(1) + ' on ' + x[3]);
    ok(next.size >= 60 && !tooNear.length, 'neighbors (' + next.size + ' pairs on the blog, the hubs and Keep reading) have gradients at least ' + NEXT + ' apart', tooNear.length ? tooNear : next.size);
  }
}
for (const [f, s] of [['icons/icon-192.png', 192], ['icons/icon-512.png', 512], ['icons/apple-touch-icon.png', 180]]) ok(JSON.stringify(png(f)) === JSON.stringify([s, s]), f + ' is ' + s + ' × ' + s);
for (const f of ['SiteCompare', 'SiteCompare', 'SiteFeature', 'SiteFaq']) for (const suffix of ['', 'Phone']) ok(existsSync(join(ROOT, 'design/canvas/project', f + suffix + '.dc.html')), f + suffix + ' board exists');
ok(existsSync(join(ROOT, 'design/canvas/project/SiteOg.dc.html')), 'SiteOg board exists');
const heights = JSON.parse(readFileSync(join(ROOT, 'design/site-heights.json'), 'utf8'));
for (const name of ['SiteCompare', 'SiteFeature', 'SiteFaq']) for (const [i, suffix] of ['', 'Phone'].entries()) {
  const src = readFileSync(join(ROOT, 'design/canvas/project', name + suffix + '.dc.html'), 'utf8'), h = +src.match(/"\$preview":\{"width":\d+,"height":(\d+)\}/)[1];
  ok(h === heights[name][i], name + suffix + ' board is as tall as its tallest page (design/site-measure.mjs)', [h, heights[name][i]]);
  // On the canvas the hero and the cards' pictures are the SiteOg board itself (a dc-import), scaled to the column.
  ok(src.includes('<dc-import name="SiteOg" page="{{pic.key}}"') && src.includes('<dc-import name="SiteOg" page="{{k.key}}"'), name + suffix + ' draws its pictures with the SiteOg board on the canvas');
  // The board always draws SiteOg in its one look (no Dark passed on: only the page around it turns dark), with the app's grain (GRAIN_LAYER,
  // soft-light, the board's grain) drawn at the screen's pixels right over each import.
  { const imports = src.match(/<dc-import name="SiteOg"/g) || [], grained = src.match(/<dc-import name="SiteOg"[^>]*><\/dc-import><\/div><svg aria-hidden="true" width="100%" height="100%" style="position: absolute; inset: 0; mix-blend-mode: soft-light; opacity: \{\{grain\}\};/g) || [];
    ok(imports.length >= 3 && !/<dc-import name="SiteOg"[^>]*\bdark=/.test(src) && grained.length === imports.length, name + suffix + ' draws SiteOg in its one look, each under the app’s grain', [imports.length, grained.length]); }
}
{
  // One header on every canvas board that draws a page of lucida.cards (the landing page and Pricing for a computer and for a phone, Privacy, Terms,
  // Connect and the Site boards): the same markup, from the same code, and its styles (the bar, the menu button and the menu) in the board.
  const names = ['Landing', 'LandingPhone', 'Pricing', 'PricingPhone', 'Privacy', 'Terms', 'SiteConnect', 'SiteCompare', 'SiteComparePhone', 'SiteFeature', 'SiteFeaturePhone', 'SiteFaq', 'SiteFaqPhone'];
  const srcs = names.map(n => readFileSync(join(ROOT, 'design/canvas/project', n + '.dc.html'), 'utf8')), heads = srcs.map(x => (x.match(/<header class="sp-head">[\s\S]*?<\/header>/) || [''])[0]);
  ok(heads.every(h => h && h === heads[0]), 'the canvas boards (landing page, Pricing, Privacy, Terms, Connect and the Site boards, computer and phone) all draw the same header', names.filter((n, i) => heads[i] !== heads[0]));
  ok(/\{\{hd\.nav\}\}/.test(heads[0]) && /\{\{hd\.signIn\}\}/.test(heads[0]) && /\{\{hd\.start\}\}/.test(heads[0]) && heads[0].includes('<details class="sp-menu">'), 'that header has the links from the page’s own logic and a menu button');
  ok(srcs.every(x => x.includes('.sp-menu summary') && x.includes('.sp-mpanel') && x.includes('@container (max-width: 760px){.sp-head{height:64px}')), 'every one of those boards carries the header’s styles', names.filter((n, i) => !srcs[i].includes('.sp-mpanel')));
}
{
  // SiteOg must know every page's key, or a picture on the canvas would quietly be another page's.
  const og = readFileSync(join(ROOT, 'design/canvas/project/SiteOg.dc.html'), 'utf8'), options = JSON.parse(og.match(/data-props='([^']*)'/)[1]).page.options;
  ok(list.every(p => options.includes(p.slug || 'home')), 'the SiteOg board can draw the picture of every page', list.filter(p => !options.includes(p.slug || 'home')).map(p => p.slug));
}

// ---------- outside links ----------
if (args.has('--online')) {
  console.log('Outside links');
  // The accounts in the footer are asked about by hand (social sites turn robots away); the pages cited as sources are asked here.
  const urls = [...new Set(list.flatMap(p => p.outside || []))].filter(u => !SOCIALS.some(x => u === x[2]));
  const ask = async u => {
    for (const method of ['HEAD', 'GET']) {
      try { const r = await fetch(u, { method, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) LucidaLinkCheck' }, signal: AbortSignal.timeout(30000) }); if (r.status === 405 || (method === 'HEAD' && r.status >= 400)) continue; return r.status; } catch (e) { if (method === 'GET') return e.name; }
    }
  };
  for (let i = 0; i < urls.length; i += 8) await Promise.all(urls.slice(i, i + 8).map(async u => {
    const status = await ask(u);
    // RemNote's Privacy Hub shows its page in a browser and answers robots with 404 (an app that draws its own pages).
    if (u === 'https://www.remnote.com/privacy-hub') note(u + ' answers 404 to robots but shows its page in a browser');
    else if ([401, 403, 429, 999].includes(status)) note(u + ' turns robots away (' + status + '): check it by hand');
    else ok(typeof status === 'number' && status < 400, u + ' answers', status);
  }));
  console.log('  ' + urls.length + ' outside addresses asked');
}
for (const n of notes) console.log('  note ' + n);
console.log(pass + ' checks passed, ' + fail + ' failed' + (notes.length ? ', ' + notes.length + ' notes' : ''));
process.exit(fail ? 1 : 0);
