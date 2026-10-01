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
//     the phone's on a phone, the dark ones in the dark, and its "Test yourself" cards scroll sideways on a phone (never the page) and open at once.
// --quick checks only a few pages (the pages with something special) and skips the contrast. Needs Chrome (design/chrome.mjs).
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withChrome } from './chrome.mjs';
import { pageSet, FIXED } from './site.mjs';
import { route } from './vercel-routes.mjs';
import { readPng } from './png.mjs';
import { LIGHT, DARK } from './scheme.mjs';

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
    if (el.closest('[aria-hidden="true"]') || el.closest('.sp-sr') || el.closest('thead') && getComputedStyle(el.closest('thead')).position === 'absolute' || el.closest('.sp-tabs') || el.closest('.sp-toc') || el.closest('.sp-tcs')) continue;
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
  // A question opens (its answer shows) and closes again, at once.
  const q = await run(`(() => { const d = document.querySelector('details.sp-qd'); if (!d) return null; const s = d.querySelector('summary'), a = d.querySelector('.sp-qa'); const was = d.open; s.click(); const open = d.open, shown = a.getBoundingClientRect().height > 0; s.click(); return { was, open, shown, closed: !d.open }; })()`);
  if (q) ok(q.was === false && q.open && q.shown && q.closed, tag + ': a question opens and closes', q);
  // A test card opens (its answer shows) and closes again, at once.
  const tc = await run(`(() => { const d = document.querySelector('details.sp-tc'); if (!d) return null; const s = d.querySelector('summary'), a = d.querySelector('.sp-ta'), was = d.open; s.click(); const open = d.open, shown = a.getBoundingClientRect().height > 0; s.click(); return { was, open, shown, closed: !d.open }; })()`);
  if (tc) ok(tc.was === false && tc.open && tc.shown && tc.closed, tag + ': a test card opens to its answer and closes again', tc);
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
      // The diagrams, the app's screens and the test cards of an article.
      const text = new Set(['pick', 'checklist', 'fork']);
      if (m.figs.length) {
        const tall = m.figs.filter(f => width < 500 && !text.has(f.kind) && f.h > 440), wide = m.figs.filter(f => f.sw > f.cw + 1);
        ok(!tall.length, tag + ': no diagram or screen is taller than 440 px on a phone', tall.map(f => [f.kind, Math.round(f.h)]));
        ok(!wide.length, tag + ': every diagram fits its box', wide.map(f => [f.kind, f.sw, f.cw]));
        const bad = m.shots.filter(i => !i.ok || (i.alt || '').length < 30 || (width < 500) !== /-phone/.test(i.src) || (scheme === 'dark') !== /-dark\.webp$/.test(i.src) || (width < 500 && i.boxh > 422) || i.boxw < 150);
        ok(!bad.length, tag + ': the screens load, are the phone’s on a phone and the dark ones in the dark, and have alt text', bad.map(i => [i.src, i.ok, Math.round(i.boxw) + 'x' + Math.round(i.boxh)]));
        if (m.tests) ok(m.tests.n >= 3 && (width < 500 ? m.tests.ox === 'auto' && m.tests.sw > m.tests.cw : m.tests.sw <= m.tests.cw + 1), tag + ': the test cards scroll sideways on a phone (the page does not) and sit in a row on a computer', m.tests);
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
server.close();

console.log(pass + ' checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
