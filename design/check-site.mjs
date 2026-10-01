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
import { pageSet, KINDS, FIXED, PRICE, ORIGIN, APP, EMAIL, SOCIALS, CATEGORIES, STYLES, GRAD_NAMES, categoryOf, pictureOf, ogFingerprint, plain, DATA_DIR } from './site.mjs';
import { readPng, thumb, distance } from './png.mjs';
import { LIGHT, DARK, SCHEME_CSS } from './scheme.mjs';
import { allPages, AI_BOTS, OG, crumbUrl } from './seo.mjs';
import { checkJsonLd } from './schema-check.mjs';
import { route } from './vercel-routes.mjs';

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
  for (const href of [link('icon'), '/icons/icon-192.png', link('apple-touch-icon')]) ok(href && existsSync(join(WEB, href.replace(/^\//, ''))), 'icon ' + href + ' exists');
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
    ok(!imgs.some(x => /-dark\.png/.test(x.attrs.src || '')) && !t.some(x => x.tag === 'source' && !x.close) && !t.some(x => x.tag === 'picture' && !x.close), 'the pictures are the same in a dark screen: no -dark file, no <picture> source');
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
      const sections = p.sections.filter(x => x.h2).length + (p.table ? 1 : 0) + (p.kind === 'faq' ? new Set(p.faq.map(f => f.group || '')).size : p.faq.length ? 1 : 0);
      ok(tocs.length === 1 && top.length >= 2 && top.length === sections, '"On this page" is a tree of the page’s sections', [tocs.length, top.length, sections]);
      ok(/<details class="sp-tocd"><summary>[\s\S]*?On this page/.test(body), 'a phone’s "On this page" is a closed row under the lead');
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
for (const path of ['/sign-in', '/discover', '/@maria', '/@maria/cell-biology', '/d/sabc123', '/class/ABCDEF', '/join', '/join/123456', '/play', '/live/123456', '/deck/x/import', '/library/cards', '/settings/theme/aero', '/review', '/learn/x', '/stats', '/welcome', '/you', '/activity', '/suggestions', '/decks/new', '/verify', '/admin', '/api/state', '/auth/callback', '/mcp', '/mcp/lk_abc', '/media/m1.png', '/pro']) {
  const r = via('lucida.cards', path); ok(r.type === 'redirect' && r.to === APP + path && r.status === 307, 'lucida.cards' + path + ' still goes to the app', r);
}
// lucida.cards/connect is the Connect Lucida guide (the app's own Connect AI page stays at app.lucida.cards/connect).
{ const g = via('lucida.cards', '/connect'); ok(g.type === 'file' && /connect-guide\.html$/.test(g.file || ''), 'lucida.cards/connect shows the Connect Lucida guide', g); }
ok(via('lucida.cards', '/landing.html').to === '/' && via('lucida.cards', '/pricing.html').to === '/pricing', 'the old .html addresses go to the clean ones');
ok(file('app.lucida.cards', '/pricing', 'pricing.html') && file('app.lucida.cards', '/zzz', 'app.html') && via('app.lucida.cards', '/@maria').type === 'function' && via('app.lucida.cards', '/d/sabc').type === 'function' && via('app.lucida.cards', '/api/state').type === 'function', 'app.lucida.cards: pages, the app, /@…, /d/… and /api unchanged');
ok(via('app.lucida.cards', '/vs/anki').rewritten === '/app.html' && via('app.lucida.cards', '/compare').rewritten === '/app.html', 'app.lucida.cards doesn’t serve the site’s pages');

console.log('Link-preview pictures, icons, boards');
let manifest = {}; try { manifest = JSON.parse(read('og/manifest.json')); } catch {}
const og = readFileSync(join(ROOT, 'design/canvas/project/SiteOg.dc.html'), 'utf8'), art = (og.match(/og-art: ([0-9a-f]+)/) || [])[1];
ok(art && manifest._art === art, 'the pictures were drawn by the current SiteOg drawing (node design/og.mjs)', [manifest._art, art]);
for (const p of list) {
  const m = manifest[p.slug || 'home'];
  ok(m && m.file === p.og && m.dark === undefined && m.fingerprint === ogFingerprint(p), 'the picture for ' + (p.slug || '/') + ' was drawn for its current title, scene and palette', m);
  ok(existsSync(join(WEB, p.og)) && JSON.stringify(png(p.og)) === JSON.stringify([OG.width, OG.height]), 'the picture for ' + (p.slug || '/') + ' exists and is 1200 × 630', p.og);
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
