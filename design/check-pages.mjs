// Opens every page of the site in headless Chrome, as a phone (390 wide) and as a computer (1440 wide), in a light and in a dark
// system, and checks what only a browser can tell:  node design/check-pages.mjs [--quick] [slug …]
//   - the page never scrolls sideways, and nothing in <main> is past the window's edge;
//   - the pictures load, and are the same in a dark system as in a light one (no -dark picture), each with the app's film grain laid
//     over it: a span.sc-grain exactly over the picture, soft-light, at .7, that doesn't catch clicks;
//   - every piece of text reads against what is behind it: contrast of at least 4.5 to 1 (3 to 1 for large text), measured from a
//     picture of the page with its text taken out;
//   - reading text is at least 16 px with a line height of at least 1.5, and a page has one h1;
//   - the pages' own controls work: a question opens and closes, "Show all" shows the rest, "On this page" opens on a phone and marks the
//     section being read on a wide screen, the blog's tabs and search filter its cards;
//   - the colors a page shows are the ones design/scheme.mjs says, light and dark;
//   - an article's diagrams fit (none taller than 440 px on a phone, apart from the ones that hold the page's own bullets), its screens are
//     the phone's on a phone, the dark ones in the dark, and its "Test yourself" cards scroll sideways on a phone (never the page) and turn at once;
//   - one header on every page: the same links in the same order, on a computer in the bar and on a phone behind one menu button that opens at
//     once, in the same place on every page; no card shows a pill with its category;
//   - the article column is centered (equal margins within 1 px, at 390 and 1440, with the contents tree in the left margin and never over the
//     column); a table keeps its real columns, sits in the column and scrolls inside its own box; a hub's crumbs, title, lead, featured page, cards,
//     table, headings and lists start at one left edge (the blog's too);
//   - the flashcards are the app's: radius, line, shadow, padding and type in the app card's ratios, in light and in dark, and a test card turns
//     to its answer on the same card (its size does not change);
//   - the motion: only the clouds and the gradient that ends a page move, slowly, and only when the system allows motion; nothing moves the layout.
// --quick checks only a few pages (the pages with something special) and skips the contrast. Needs Chrome (design/chrome.mjs).
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withChrome } from './chrome.mjs';
import { pageSet, FIXED } from './site.mjs';
import { route } from './vercel-routes.mjs';
import { readPng } from './png.mjs';
import { LIGHT, DARK, EXTRA_LIGHT, EXTRA_DARK } from './scheme.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)), WEB = join(ROOT, 'web'), args = process.argv.slice(2), quick = args.includes('--quick');
const only = args.filter(a => !a.startsWith('--'));
const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

// The built site, served the way Vercel routes it (design/vercel-routes.mjs), on a port of its own.
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname), r = route(config, WEB, { host: 'lucida.cards', path });
  const send = (file, status = 200) => { res.writeHead(status, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(readFileSync(file)); };
  if (r.type === 'file') return send(r.file);
  if (r.type === 'notfound' && r.page) return send(r.page, 404);
  res.writeHead(404); res.end('not found');
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const base = 'http://127.0.0.1:' + server.address().port;

const { pages } = pageSet();
const all = [...FIXED.map(f => ({ slug: f.slug, kind: f.kind })), ...pages.filter(p => !p.sample).map(p => ({ slug: p.slug, kind: p.kind })), { slug: '404-page', kind: 'notfound' }];
const SPECIAL = ['blog', 'vs/quizlet', 'faq', 'features/spaced-repetition', 'compare', '404-page', 'privacy', 'connect'];
const list = only.length ? all.filter(p => only.includes(p.slug)) : quick ? all.filter(p => SPECIAL.includes(p.slug)) : all;

let pass = 0, fail = 0;
const ok = (cond, name, detail = '') => { if (cond) pass++; else { fail++; console.log('  FAIL ' + name + (detail ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } return !!cond; };

// ---------- contrast, as WCAG measures it ----------
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));

// What the page tells us: every piece of text with its box and color, the pictures, and the page's size.
const PROBE = `(() => {
  const out = { vw: innerWidth, sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, h1: [...document.querySelectorAll('h1')].filter(h => h.getBoundingClientRect().width > 0 && getComputedStyle(h).display !== 'none').length, pics: [], text: [], past: [], body: [] };
  for (const img of document.images) {
    const r = img.getBoundingClientRect(), g = img.nextElementSibling, gr = g ? g.getBoundingClientRect() : null, gs = g ? getComputedStyle(g) : null;
    out.pics.push({ src: img.currentSrc.replace(location.origin, ''), ok: img.complete && img.naturalWidth > 0, w: img.naturalWidth, shown: r.width > 0, cls: img.className, alt: img.getAttribute('alt'),
      grain: !g || !g.classList.contains('sc-grain') ? null : { same: Math.abs(gr.left - r.left) < 1 && Math.abs(gr.top - r.top) < 1 && Math.abs(gr.width - r.width) < 1 && Math.abs(gr.height - r.height) < 1, blend: gs.mixBlendMode, opacity: gs.opacity, events: gs.pointerEvents, tile: gs.backgroundImage.includes('data:image/svg+xml') } });
  }
  out.figs = [...document.querySelectorAll('figure.sp-fig')].map(f => { const r = f.getBoundingClientRect(), c = f.querySelector('figcaption'), ch = c ? c.getBoundingClientRect().height + parseFloat(getComputedStyle(c).marginTop) : 0; return { kind: f.className.split(' ')[1].replace('sp-f-', ''), h: r.height - ch, w: r.width, sw: f.scrollWidth, cw: f.clientWidth, shown: r.height > 0 }; });
  out.shots = [...document.querySelectorAll('img.sp-shot')].map(i => { const r = i.getBoundingClientRect(); return { src: i.currentSrc.replace(location.origin, ''), ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight, boxw: r.width, boxh: r.height, alt: i.getAttribute('alt') }; });
  const tcs = document.querySelector('.sp-tcs'); out.tests = tcs ? { n: tcs.querySelectorAll('details.sp-tc').length, sw: tcs.scrollWidth, cw: tcs.clientWidth, ox: getComputedStyle(tcs).overflowX } : null;
  const main = document.querySelector('main');
  if (main) for (const el of main.querySelectorAll('*')) {
    if (el.closest('[aria-hidden="true"]') || el.closest('.sp-sr') || el.closest('thead') && getComputedStyle(el.closest('thead')).position === 'absolute' || el.closest('.sp-tabs') || el.closest('.sp-toc') || el.closest('.sp-tcs') || (el.parentElement && el.parentElement.closest('.sp-tsc'))) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.right > innerWidth + 1 || r.left < -1)) out.past.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 30) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const text = n.nodeValue.replace(/\\s+/g, ' ').trim(), el = n.parentElement;
    if (!text || !el || el.closest('script,style,svg,noscript,[aria-hidden="true"],.sp-sr') || el.closest('[hidden]')) continue;
    const box = el.closest('details'); if (box && !box.open && !el.closest('summary')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1); if (!rects.length) continue;
    // Text in a row that scrolls sideways (the test cards on a phone) and is out of the window now is looked at when it scrolls in.
    if (rects.every(r => r.left >= innerWidth || r.right <= 0)) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
    const fill = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
    out.text.push({ t: text.slice(0, 40), color: fill, op, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight), lh: cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), cls: String(el.className).slice(0, 24), tag: el.tagName.toLowerCase(),
      rects: rects.slice(0, 3).map(r => [r.left + scrollX, r.top + scrollY, r.width, r.height]), grad: !!el.closest('.sp-grad'), body: !!el.closest('.sp-p,.sp-ul,.sp-table td,.sp-qa p,.sp-lead,.sp-pk-body,.sp-chk-t,.sp-t2 td,.sp-fk-u,.sp-ta') });
  }
  return out;
})()`;
// How the page is laid out, for the checks of the header, the column, the tables, the hubs and the flashcards.
const LAYOUT = `(() => {
  const W = document.documentElement.clientWidth, R = e => { const r = e.getBoundingClientRect(); return { l: +r.left.toFixed(2), r: +(W - r.right).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), t: +(r.top + scrollY).toFixed(2) }; };
  const shown = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const out = {}, head = [...document.querySelectorAll('header.sp-head')].find(shown);
  if (head) {
    const nav = head.querySelector('.sp-hnav'), menu = head.querySelector('.sp-menu'), go = head.querySelector('.sp-hgo'), logo = head.querySelector('.sp-hlogo'), sum = menu && menu.querySelector('summary');
    out.head = { h: R(head).h, logo: R(logo), go: R(go), goText: go.textContent.trim(), goHref: go.getAttribute('href'), homeHref: logo.getAttribute('href'),
      nav: nav && shown(nav) ? [...nav.querySelectorAll('a')].map(a => [a.textContent.trim(), a.getAttribute('href'), Math.round(a.getBoundingClientRect().height)]) : null,
      menu: menu && shown(menu) ? { w: Math.round(R(sum).w), h: Math.round(R(sum).h), links: [...menu.querySelectorAll('.sp-mpanel a')].map(a => [a.textContent.trim(), a.getAttribute('href')]) } : null };
  }
  const main = document.querySelector('.sp-main'); if (main && shown(main)) out.main = R(main);
  const toc = document.querySelector('.sp-toc'); if (toc && shown(toc)) out.toc = R(toc);
  const hub = !!document.querySelector('.sp-art.sp-hub'), blog = !!document.querySelector('.sp-blog'), lefts = {};
  const first = (k, sel) => { const e = [...document.querySelectorAll(sel)].find(shown); if (e) lefts[k] = +e.getBoundingClientRect().left.toFixed(2); };
  if (hub) { for (const [k, sel] of [['crumbs', '.sp-crumbs'], ['h1', '.sp-h1'], ['lead', '.sp-lead'], ['feat', '.sp-feat'], ['cards', '.sp-cards'], ['table', '.sp-table'], ['ul', '.sp-ul'], ['p', '.sp-p'], ['cta', '.sp-cta'], ['qcard', '.sp-qcard'], ['src', '.sp-src']]) first(k, sel); lefts.h2 = [...document.querySelectorAll('.sp-sec > .sp-h2')].filter(shown).map(e => +e.getBoundingClientRect().left.toFixed(2)); }
  if (blog) { for (const [k, sel] of [['h1', '.sp-bh1'], ['lead', '.sp-blead'], ['feat', '.sp-feat']]) first(k, sel); lefts.h2 = [...document.querySelectorAll('.sp-bsec .sp-h2')].filter(shown).map(e => +e.getBoundingClientRect().left.toFixed(2)); lefts.cards = [...document.querySelectorAll('.sp-cards')].filter(shown).map(e => +e.getBoundingClientRect().left.toFixed(2)); }
  out.hub = hub || blog; out.lefts = lefts;
  out.tables = [...document.querySelectorAll('.sp-tsc')].filter(shown).map(e => { const th = [...e.querySelectorAll('thead th')], row = e.querySelector('tbody tr'), cells = row ? [...row.children] : [], c1 = cells[1] || cells[0];
    return { l: R(e).l, r: R(e).r, sw: e.scrollWidth, cw: e.clientWidth, ox: getComputedStyle(e).overflowX, cols: th.length, side: cells.length > 1 && cells.every(c => Math.abs(c.getBoundingClientRect().top - cells[0].getBoundingClientRect().top) < 4), disp: c1 ? getComputedStyle(c1).display : '', size: c1 ? parseFloat(getComputedStyle(c1).fontSize) : 0, tabindex: e.getAttribute('tabindex'), role: e.getAttribute('role') }; });
  out.pills = document.querySelectorAll('.sp-card-chip,.sp-kchip').length;
  out.picText = [...document.querySelectorAll('.sp-card-pic,.sp-feat-pic')].map(e => e.innerText.trim()).filter(Boolean);
  out.fc = [...document.querySelectorAll('.sp-fc')].filter(shown).map(e => { const cs = getComputedStyle(e), face = e.matches('.sp-tc') ? getComputedStyle(e.querySelector('.sp-tq')) : cs, txt = e.querySelector('.sp-tf,.sp-pk-name,.sp-exc-t,.sp-wt') || e;
    return { cls: e.className.split(' ')[0], fs: parseFloat(cs.fontSize), radius: parseFloat(cs.borderTopLeftRadius), padL: parseFloat(face.paddingLeft), padT: parseFloat(face.paddingTop), bw: parseFloat(cs.borderTopWidth), bg: cs.backgroundColor, bc: cs.borderTopColor, shadow: cs.boxShadow, align: cs.textAlign, weight: +cs.fontWeight, ls: parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize), tw: +getComputedStyle(txt).fontWeight }; });
  return out;
})()`;
const HIDE = `(() => { const s = document.createElement('style'); s.id = 'hide-text'; s.textContent = '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important;caret-color:transparent!important;animation:none!important;transition:none!important}input::placeholder{color:transparent!important}'; document.head.appendChild(s); })()`;
const SETTLE = `(async () => {
  document.documentElement.style.scrollBehavior = 'auto';
  for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
  window.scrollTo(0, 0);
  await Promise.race([Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 8000))]);
  await document.fonts.ready; await new Promise(r => setTimeout(r, 120));
})()`;

// What a reader can do on a page (run in the open page; `chrome` is the browser).
const wait = ms => new Promise(r => setTimeout(r, ms));
const controlsOf = chrome => async (pg, width, tag) => {
  const run = x => chrome.run(x), frame = () => run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  // A phone's menu button opens the menu at once (its links, each 44 px or more tall, inside the window) and closes it again.
  if (width < 761) {
    const mm = await run(`(() => { const head = [...document.querySelectorAll('header.sp-head')].find(h => h.getBoundingClientRect().height > 0), d = head.querySelector('.sp-menu'), s = d.querySelector('summary'), p = d.querySelector('.sp-mpanel'); const was = d.open; s.click(); const open = d.open, r = p.getBoundingClientRect(), links = [...p.querySelectorAll('a')].map(a => [a.textContent.trim(), a.getAttribute('href'), Math.round(a.getBoundingClientRect().height)]); s.click(); return { was, open, shown: r.height > 0, inside: r.left >= 0 && r.right <= innerWidth, links, closed: !d.open }; })()`);
    ok(mm.was === false && mm.open && mm.shown && mm.inside && JSON.stringify(mm.links.map(x => [x[0], x[1]])) === JSON.stringify(NAV) && mm.links.every(x => x[2] >= 44) && mm.closed, tag + ': the menu button opens the menu at once, with the five links, and closes it again', mm);
  }
  // A question opens (its answer shows) and closes again, at once.
  const q = await run(`(() => { const d = document.querySelector('details.sp-qd'); if (!d) return null; const s = d.querySelector('summary'), a = d.querySelector('.sp-qa'); const was = d.open; s.click(); const open = d.open, shown = a.getBoundingClientRect().height > 0; s.click(); return { was, open, shown, closed: !d.open }; })()`);
  if (q) ok(q.was === false && q.open && q.shown && q.closed, tag + ': a question opens and closes', q);
  // A test card opens (its answer shows) and closes again, at once.
  const tc = await run(`(() => { const d = document.querySelector('details.sp-tc'); if (!d) return null; const s = d.querySelector('summary'), a = d.querySelector('.sp-ta'), f = d.querySelector('.sp-tf'), h0 = d.getBoundingClientRect().height, was = d.open, front = f.getBoundingClientRect().height > 0; s.click(); const open = d.open, shown = a.getBoundingClientRect().height > 0, gone = f.getBoundingClientRect().height === 0, h1 = d.getBoundingClientRect().height; s.click(); return { was, front, open, shown, gone, same: Math.abs(h0 - h1) <= 1 && Math.abs(h0 - d.getBoundingClientRect().height) <= 1, closed: !d.open }; })()`);
  if (tc) ok(tc.was === false && tc.front && tc.open && tc.shown && tc.gone && tc.same && tc.closed, tag + ': a test card turns from its question to its answer on the same card, at once (its size does not change), and back', tc);
  // "Show all N" shows the rest of a table, and "Show fewer" hides it again.
  const more = await run(`(() => { const d = document.querySelector('.sp-more'); if (!d || getComputedStyle(d).display === 'none') return null; const rows = [...document.querySelectorAll('tr.sp-x')], vis = () => rows.length && getComputedStyle(rows[0]).display !== 'none'; const before = vis(); d.querySelector('summary').click(); const after = vis(); d.querySelector('summary').click(); return { rows: rows.length, before, after, again: vis() }; })()`);
  if (more) ok(more.rows > 0 && !more.before && more.after && !more.again, tag + ': "Show all" shows the rest of the table and "Show fewer" hides it', more);
  // A phone's "On this page": a closed row that opens to the whole tree. A wide screen's: the section being read is marked.
  if (width < 1100) {
    const t = await run(`(() => { const d = document.querySelector('details.sp-tocd'); if (!d) return null; const was = d.open; d.querySelector('summary').click(); const links = [...d.querySelectorAll('a')], shown = links.length > 0 && links.every(a => a.getBoundingClientRect().height > 0); const tops = d.querySelectorAll(':scope > nav > ol > li').length; d.querySelector('summary').click(); return { was, opened: shown, links: links.length, tops, closed: !d.open }; })()`);
    if (t) ok(t.was === false && t.opened && t.tops >= 2 && t.closed, tag + ': "On this page" is a closed row that opens to the whole tree', t);
  } else {
    const toc = await run(`(() => { const t = document.querySelector('.sp-toc'); if (!t || getComputedStyle(t).display === 'none') return null; return { links: [...t.querySelectorAll('a')].map(a => a.getAttribute('href').slice(1)), tops: t.querySelectorAll(':scope > ol > li').length, cur: (t.querySelector('a[aria-current="location"]') || {}).hash }; })()`);
    if (toc) {
      ok(toc.cur === '#' + toc.links[0], tag + ': "On this page" starts on the first section', toc.cur);
      const topLinks = await run(`[...document.querySelectorAll('.sp-toc > ol > li > a')].map(a => a.getAttribute('href').slice(1))`), target = topLinks[Math.min(2, topLinks.length - 1)];
      await run(`(() => { const el = document.getElementById(${JSON.stringify(target)}); const y = el.getBoundingClientRect().top + scrollY - 120; document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, y); })()`); await wait(250); await frame();
      const now = await run(`(() => { const a = document.querySelector('.sp-toc a[aria-current="location"]'), li = a && a.closest('.sp-toc > ol > li'); return { cur: a && a.hash, open: [...document.querySelectorAll('.sp-toc > ol > li.sp-open')].length, inBranch: !!li && li.classList.contains('sp-open'), y: scrollY }; })()`);
      ok(now.cur === '#' + target || (now.y > 0 && now.cur && now.cur !== '#' + toc.links[0]), tag + ': "On this page" marks the section being read as the page scrolls', [target, now]);
      ok(now.open === 1 && now.inBranch, tag + ': only the branch being read is open', now);
      await run('window.scrollTo(0, 0)');
    }
  }
  // The blog: a tab shows one category, the search filters cards as you type, and everything comes back.
  if (pg.slug === 'blog') {
    const state = `(() => { const vis = el => !el.hidden && getComputedStyle(el).display !== 'none'; return { secs: [...document.querySelectorAll('[data-cat]')].filter(vis).map(e => e.dataset.cat), cards: [...document.querySelectorAll('.sp-card')].filter(e => vis(e) && vis(e.closest('[data-cat]'))).length, feat: [...document.querySelectorAll('.sp-feat')].some(vis), none: vis(document.querySelector('.sp-none')), search: vis(document.querySelector('.sp-search')) }; })()`;
    const all = await run(state);
    ok(all.search && all.secs.length === 4 && all.feat && !all.none, tag + ': the blog shows everything, and its search box, once its script has run', all);
    await run(`document.querySelector('.sp-tab[data-tab="features"]').click()`); const feats = await run(state);
    ok(JSON.stringify(feats.secs) === '["features"]' && !feats.feat && feats.cards > 0 && feats.cards < all.cards, tag + ': the Features tab shows only the features', feats);
    ok(await run(`document.querySelector('.sp-tab[data-tab="features"]').getAttribute('aria-current') === 'true' && document.querySelector('.sp-tab[data-tab="all"]').getAttribute('aria-current') === null`), tag + ': the tab says it is the one shown');
    await run(`document.querySelector('.sp-tab[data-tab="all"]').click()`);
    await run(`(() => { const i = document.querySelector('.sp-search input'); i.value = 'quizlet'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`); const found = await run(state);
    const texts = await run(`[...document.querySelectorAll('.sp-card')].filter(e => !e.hidden && !e.closest('[hidden]')).map(e => e.dataset.s)`);
    ok(found.cards > 0 && found.cards < all.cards && texts.every(t => t.includes('quizlet')), tag + ': the search keeps only the cards about Quizlet', [found.cards, texts.length]);
    await run(`(() => { const i = document.querySelector('.sp-search input'); i.value = 'zzzzqx'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`); const none = await run(state);
    ok(none.cards === 0 && none.none, tag + ': a search with no answer says so', none);
    await run(`(() => { const i = document.querySelector('.sp-search input'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); })()`); const back = await run(state);
    ok(back.cards === all.cards && back.secs.length === 4 && !back.none, tag + ': clearing the search brings every card back', back);
  }
};

// What the header looks like on the first page of each width: every other page's must be the same (the same place, the same size).
const headSeen = {}, NAV = [['Blog', '/blog'], ['Compare', '/compare'], ['Features', '/features'], ['Pricing', '/pricing'], ['Sign in', 'https://app.lucida.cards/sign-in']];
const rgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(h => parseInt(h, 16)).join(', ') + ')';
console.log('Pages in a browser (' + (quick ? 'quick' : 'all') + '), ' + list.length + ' pages × 390 and 1440 wide × light and dark');
await withChrome(async chrome => {
  const controls = controlsOf(chrome);
  for (const pg of list) {
    const url = base + '/' + (pg.slug === '404-page' ? 'no-such-page' : pg.slug);
    const follows = true;
    for (const width of [390, 1440]) for (const scheme of follows ? ['light', 'dark'] : ['light']) {
      const tag = (pg.slug || '/') + ' ' + width + ' ' + scheme;
      await chrome.scheme(scheme); await chrome.size(width, 900);
      await chrome.open(url); await chrome.run(`(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(s); })()`); await chrome.run(`document.fonts.ready.then(() => 1)`); await chrome.run(SETTLE);
      let height = await chrome.run('Math.ceil(document.documentElement.scrollHeight)');
      await chrome.size(width, Math.min(height, 16000)); await chrome.run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      const m = await chrome.run(PROBE);
      console.log(tag.padEnd(40) + 'h=' + m.h);
      ok(m.sw <= m.vw, tag + ': no sideways scrolling', [m.sw, m.vw]);
      ok(!m.past.length, tag + ': nothing in <main> past the window’s edge', m.past.slice(0, 4));
      ok(m.h1 === 1, tag + ': one h1', m.h1);
      ok(m.pics.every(p => p.ok) && (m.pics.length > 0 || !['compare', 'alternative', 'hub', 'feature', 'use', 'faq', 'notfound'].includes(pg.kind)), tag + ': the pictures load', m.pics.filter(p => !p.ok).map(p => p.src));
      // The same picture in either scheme (the big one, hero or featured, and every card), each under the app's grain.
      const wrong = m.pics.filter(p => /^\/og\//.test(p.src) && /-dark\.png$/.test(p.src));
      ok(!wrong.length, tag + ': the pictures are the same in ' + scheme + ' (no -dark picture)', wrong.map(p => p.src).slice(0, 3));
      const ungrained = m.pics.filter(p => /^\/og\//.test(p.src) && !(p.grain && p.grain.same && p.grain.blend === 'soft-light' && p.grain.opacity === '0.7' && p.grain.events === 'none' && p.grain.tile));
      ok(!ungrained.length, tag + ': every picture wears the app’s grain (soft-light, .7, exactly over it)', ungrained.map(p => [p.src, p.grain]).slice(0, 3));
      // ---- the header, the pills, the column, the tables, the hubs and the flashcards ----
      {
        const L = await chrome.run(LAYOUT), phone = width < 761;
        if (ok(!!L.head, tag + ': the page has a header', null)) {
          const h = L.head, geo = [h.h, h.logo.l, h.logo.w, h.go.r, h.go.w, h.go.h];
          ok(h.homeHref === '/' && h.goText === 'Get started' && h.goHref === 'https://app.lucida.cards/', tag + ': the header has the logo (home) and Get started (the app)', [h.homeHref, h.goText, h.goHref]);
          if (!phone) ok(h.nav && JSON.stringify(h.nav.map(x => [x[0], x[1]])) === JSON.stringify(NAV) && h.nav.every(x => x[2] >= 36) && !h.menu && h.h === 76, tag + ': a computer’s header is the logo, Blog, Compare, Features, Pricing, Sign in and Get started, in that order, with no menu button', h);
          else ok(!h.nav && h.menu && h.menu.w >= 44 && h.menu.h >= 44 && h.h === 64, tag + ': a phone’s header is the logo, Get started and one menu button (44 px or more) in place of the links', h);
          const first = headSeen[width] || (headSeen[width] = geo);
          ok(geo.every((v, i) => Math.abs(v - first[i]) <= 1), tag + ': the header is in the same place, at the same size, as on every other page', [geo, first]);
        }
        ok(L.pills === 0 && !L.picText.length, tag + ': no card shows a pill with its category, or any words over its picture', [L.pills, L.picText]);
        if (L.main) {
          ok(Math.abs(L.main.l - L.main.r) <= 1, tag + ': the ' + (L.hub ? 'page’s container' : 'article column') + ' is centered (its margins are equal)', L.main);
          if (L.toc) ok(L.toc.l >= 0 && L.toc.l + L.toc.w <= L.main.l - 16, tag + ': "On this page" stands in the left margin, clear of the column', [L.toc, L.main]);
        }
        for (const t of L.tables) {
          ok(t.cols >= 2 && t.side && t.disp === 'table-cell' && t.size >= 16, tag + ': a table keeps its real columns and its 16 px text', t);
          ok(!L.main || (Math.abs(t.l - L.main.l) <= 1 && Math.abs(t.r - L.main.r) <= 1), tag + ': a table sits in the column, centered with it', [t, L.main]);
          ok((t.sw <= t.cw + 1 || /auto|scroll/.test(t.ox)) && t.tabindex === '0' && t.role === 'region', tag + ': a table wider than its box scrolls sideways inside it (a focusable region)', t);
          if (phone && t.cols >= 3) ok(t.sw > t.cw + 1, tag + ': a table of three or more columns scrolls inside its box on a phone', t);
        }
        if (L.hub) { const all = Object.values(L.lefts).flat(); ok(all.length >= 4 && Math.max(...all) - Math.min(...all) <= 1, tag + ': the title, lead, featured page, headings, cards, table and lists share one left edge', L.lefts); }
        const X = scheme === 'dark' ? EXTRA_DARK : EXTRA_LIGHT, card = rgb(X.fcard), line = rgb(X.fedge);
        // The app's card is WebReview's (radius 36 and padding 56 at a type of 38 px) on a computer and PhoneReview's (36 and 22 at 28 px) on a phone.
        const rad = phone ? 36 / 28 : 36 / 38, padX = phone ? 22 / 28 : 56 / 38;
        const badCard = L.fc.filter(c => !(Math.abs(c.radius / c.fs - rad) < 0.04 && c.bw === 1 && c.bg === card && c.bc === line && Math.abs(c.padL / c.fs - padX) < 0.05 && (c.align === 'left' || c.align === 'start') && c.tw === 500 && Math.abs(c.ls + 0.02) < 0.004 && (scheme === 'dark' ? /0px 0px 0px 0px/.test(c.shadow) : /rgba\(0, 0, 0, 0\.18\)/.test(c.shadow))));
        ok(!badCard.length, tag + ': every flashcard is the app’s card (radius, line, shadow, padding, type, and the ' + scheme + ' colors)', badCard.slice(0, 2));
      }
      // The diagrams, the app's screens and the test cards of an article.
      const text = new Set(['pick', 'checklist', 'fork']);
      if (m.figs.length) {
        const tall = m.figs.filter(f => width < 500 && !text.has(f.kind) && f.h > 440), wide = m.figs.filter(f => f.sw > f.cw + 1);
        ok(!tall.length, tag + ': no diagram or screen is taller than 440 px on a phone', tall.map(f => [f.kind, Math.round(f.h)]));
        ok(!wide.length, tag + ': every diagram fits its box', wide.map(f => [f.kind, f.sw, f.cw]));
        const bad = m.shots.filter(i => !i.ok || (i.alt || '').length < 30 || (width < 500) !== /-phone/.test(i.src) || (scheme === 'dark') !== /-dark\.webp$/.test(i.src) || (width < 500 && i.boxh > 422) || i.boxw < 150);
        ok(!bad.length, tag + ': the screens load, are the phone’s on a phone and the dark ones in the dark, and have alt text', bad.map(i => [i.src, i.ok, Math.round(i.boxw) + 'x' + Math.round(i.boxh)]));
        if (m.tests) ok(m.tests.n >= 3 && (width < 500 ? m.tests.ox === 'auto' && m.tests.sw > m.tests.cw : m.tests.sw <= m.tests.cw + 1), tag + ': the test cards scroll sideways on a phone (the page does not) and sit two across on a computer', m.tests);
      }
      // Text.
      const small = m.text.filter(x => x.body && (x.size < 16 || x.lh < 1.5));
      ok(!small.length, tag + ': reading text is 16 px or more with a line height of 1.5 or more', small.slice(0, 3).map(x => [x.t, x.size, x.lh]));
      if (!quick) {
        // Contrast, from a picture of the page without its text.
        await chrome.run(HIDE); await chrome.run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
        const shot = readPng(await chrome.shot({ clip: { x: 0, y: 0, width, height: Math.min(height, 16000) }, beyond: true })), bad = [];
        const px = (x, y) => { const i = (Math.min(shot.height - 1, Math.max(0, Math.round(y))) * shot.width + Math.min(shot.width - 1, Math.max(0, Math.round(x)))) * 3; return [shot.rgb[i], shot.rgb[i + 1], shot.rgb[i + 2]]; };
        for (const x of m.text) {
          const c = /rgba?\(([^)]+)\)/.exec(x.color); if (!c) continue;
          const [r, g, b, a = 1] = c[1].split(/[ ,\/]+/).map(Number), alpha = a * x.op; if (alpha === 0) continue;
          let worst = 99, at = null;
          for (const [rx, ry, rw, rh] of x.rects) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
            const bg = px(rx + rw * (i + 0.5) / 4, ry + rh * (j + 0.5) / 2), k = ratio(over([r, g, b], alpha, bg), bg);
            if (k < worst) { worst = k; at = bg; }
          }
          const large = x.size >= 24 || (x.size >= 18.66 && x.weight >= 700);
          if (worst < (large ? 3 : 4.5)) bad.push([x.t, worst.toFixed(2), x.color, at && at.map(Math.round).join(','), x.size]);
        }
        ok(!bad.length, tag + ': text reads against what is behind it (4.5 to 1, large text 3 to 1)', bad.slice(0, 4));
        await chrome.run(`document.getElementById('hide-text').remove()`);
      }
      // The colors: the page's background is the scheme's.
      if (follows) { const bg = await chrome.run(`getComputedStyle(document.body).backgroundColor`), want = (scheme === 'dark' ? DARK : LIGHT).bg; const hex = want.slice(1).match(/../g).map(h => parseInt(h, 16)); ok(bg === 'rgb(' + hex.join(', ') + ')', tag + ': the page is ' + scheme + ' (its background is design/scheme.mjs’s)', [bg, want]); }
      // Controls, once on a phone and once on a computer, in light.
      if (scheme === 'light') await controls(pg, width, tag);
    }
  }
});
// ---------- the motion ----------
// The clouds in the sky and the gradient that ends a page drift slowly, and on the pages of the blog nothing else moves; when the system asks for
// less motion nothing moves at all; and the layout never moves. (The pages above were looked at with animations off, so this opens them again.)
console.log('Motion');
await withChrome(async chrome => {
  const look = ['vs/quizlet', 'blog', 'compare', 'faq', '404-page', '', 'pricing'].filter(x => !only.length || only.includes(x));
  const read = () => chrome.run(`(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.getBoundingClientRect().width > 0).map(a => [a.animationName || '', a.playState, getComputedStyle(a.effect.target).transform]))()`);
  const geo = () => chrome.run(`(() => [document.documentElement.scrollHeight, ...['.sp-main', 'h1', '.sp-cta', 'header'].map(s => { const e = document.querySelector(s); if (!e) return 0; const r = e.getBoundingClientRect(); return [Math.round((r.top + scrollY) * 10), Math.round(r.height * 10), Math.round(r.left * 10)]; })])()`);
  const tx = m => { const x = /matrix\(([^)]+)\)/.exec(m); return x ? x[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0]; };
  for (const slug of look) for (const width of [1440, 390]) for (const reduce of [false, true]) {
    const tag = (slug || '/') + ' ' + width + ' ' + (reduce ? 'reduced motion' : 'motion allowed'), site = !['', 'pricing'].includes(slug);
    await chrome.media([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }]); await chrome.size(width, 900);
    await chrome.open(base + '/' + (slug === '404-page' ? 'no-such-page' : slug)); await chrome.run('document.fonts.ready.then(() => 1)'); await wait(400);
    const a = await read(), g0 = await geo(); await wait(1500); const b = await read(), g1 = await geo();
    const names = {}; for (const x of b) names[x[0]] = (names[x[0]] || 0) + 1;
    // (The landing page's own card wall and demos are the app's older motion, and they run on; the clouds and the closing gradient must not.)
    if (reduce) { const mine = site ? b : b.filter(x => ['scCloud', 'scDrift'].includes(x[0])); ok(mine.length === 0, tag + ': ' + (site ? 'nothing moves' : 'the clouds and the closing gradient stand still'), names); continue; }
    const clouds = b.filter(x => x[0] === 'scCloud'), moved = b.filter((x, i) => a[i] && a[i][2] !== x[2]), far = b.filter((x, i) => a[i] && Math.abs(tx(a[i][2])[4] - tx(x[2])[4]) > 0.2 || Math.abs(tx(a[i][2])[0] - tx(x[2])[0]) > 0.0005);
    ok(clouds.length >= 3 && clouds.every(x => x[1] === 'running') && far.some(x => x[0] === 'scCloud'), tag + ': the clouds drift', [clouds.length, moved.length]);
    if (site) ok(Object.keys(names).every(n => ['scCloud', 'scDrift'].includes(n)), tag + ': only the clouds and the closing gradient move', names);
    if (site && slug !== 'blog') ok(names.scDrift === 1, tag + ': the gradient that ends the page flows', names);
    ok(JSON.stringify(g0) === JSON.stringify(g1), tag + ': the motion does not move the layout', [g0, g1]);
  }
});
server.close();

console.log(pass + ' checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
