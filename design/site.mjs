// What lucida.cards says, as data, so the boards, the pages, the sitemap, robots.txt, llms.txt and the checks all read
// the same thing.
//
// The four pages made from their own boards (the landing page, Pricing, Privacy, Terms) are in FIXED. Every other page
// is one JSON file under design/site/ (one file per page, in any folder; the page's own "slug" says where it lives):
//   { "slug": "vs/anki", "kind": "compare",
//     "title": "≤ 60 characters", "description": "≤ 155 characters", "h1": "Lucida vs Anki", "lead": "Two sentences that answer the page's question.",
//     "updated": "2026-09-30",
//     "table": { "columns": ["", "Lucida", "Anki"], "rows": [["Price", "…", "…"]] },      (optional)
//     "sections": [{ "h2": "…", "paras": ["…"], "bullets": ["…"] }],                       (optional)
//     "faq": [{ "q": "…", "a": "…" }],                                                     (optional)
//     "sources": [{ "label": "…", "url": "https://…", "checked": "2026-09-30" }],          (optional)
//     "related": ["vs/quizlet", "features/spaced-repetition"] }                             (optional)
// Kinds and where they live: compare (vs/<name>), alternative (<name>-alternative), hub (compare, features), feature
// (features/<name>), use (for/<who>), faq (faq). In any text, [words](https://link) is a link and **words** is bold.
// Fields this file doesn't know (a keyword list, say) are ignored, and a page that's a little off the shape still draws:
// design/check-site.mjs is where the shape is enforced.
//
// A few pages always exist, so links never break: the comparison hub (compare), the FAQ (faq) and, once there are
// feature pages, the features index (features). A file with that slug replaces the made-up page.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { CONTACT, UPDATED as LEGAL_UPDATED } from './legal.mjs';

export const ORIGIN = 'https://lucida.cards', APP = 'https://app.lucida.cards', NAME = 'Lucida', EMAIL = CONTACT;
// Where the page files are. LUCIDA_SITE_DIR points somewhere else (to try pages without touching the real ones).
export const DATA_DIR = process.env.LUCIDA_SITE_DIR || fileURLToPath(new URL('./site/', import.meta.url));

// Lucida's accounts, as the footer's icons show them (name for the icon, label, address).
export const SOCIALS = [['tiktok', 'TikTok', 'https://www.tiktok.com/@lucidacards'], ['youtube', 'YouTube', 'https://www.youtube.com/@lucidacards'], ['instagram', 'Instagram', 'https://www.instagram.com/lucidacards/'], ['facebook', 'Facebook', 'https://www.facebook.com/61594547618098']];

// Pro's prices in dollars (the pricing board draws the same numbers), and what each plan holds.
export const PRICE = { monthly: '5.99', yearly: '49.99', currency: 'USD' };
export const PLAN_FREE = ['Unlimited decks and cards', 'Your AI makes cards and quizzes for you', 'Reviews planned by spaced repetition', 'Learn mode', 'Share decks and study anyone’s', 'Live games with friends', 'Up to 100 pictures and sounds', 'Import and export anytime'];
export const PLAN_PRO = ['Exam dates: ready in time for the test', 'Stats on what you’re weak at', 'Unlimited pictures and sounds', 'Themes for cards, covers and your profile', 'The hardest cards on decks you share', 'Photo covers and your own colors', 'Natural voices for sound cards', 'More AI explanations'];
export const PRICING_FAQ = [
  ['Do I need Pro for my AI to make cards?', 'No. On Free, your AI can make as many cards as you want.'],
  ['What happens to my cards if I stop Pro?', 'Nothing. Every deck and card stays yours. Only the Pro extras switch off.'],
  ['Can I cancel anytime?', 'Yes, from Settings. Pro stays on until the end of the time you paid for.'],
  ['What counts toward the 100 pictures and sounds?', 'Each picture or sound on a card. Text cards never count.']
];

// What Lucida is, in one paragraph: the top of llms.txt, and the description of the organization and the site in the
// structured data. Only what's true today (the iPhone app isn't in the App Store yet).
export const ABOUT = 'Lucida is a flashcard app that runs in the browser at app.lucida.cards, on phones and computers. It plans every review with FSRS spaced repetition, and your own AI (Claude, ChatGPT, Cursor or any app that supports MCP) can make and edit your cards through your personal Lucida link. Free: unlimited decks and cards, Learn mode, shared decks and live games with friends. Pro costs $' + PRICE.monthly + ' a month or $' + PRICE.yearly + ' a year.';

const iso = label => { const d = new Date(label + ' 12:00 UTC'); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };

// The pages that come from their own boards. `board` is the computer board; the phone one has "Phone" after its name.
export const FIXED = [
  { slug: '', kind: 'home', board: 'Landing', file: 'landing.html', updated: '2026-09-29', crumb: 'Home', h1: 'Flashcards your AI can make.',
    title: 'Lucida · Flashcards your AI can make', description: 'Ask Claude or ChatGPT to turn a lecture into flashcards. Lucida keeps them in your decks and brings each one back right before you’d forget it.' },
  { slug: 'pricing', kind: 'pricing', board: 'Pricing', file: 'pricing.html', updated: '2026-09-29', crumb: 'Pricing', h1: 'Simple pricing.',
    title: 'Lucida pricing: free, or Pro at $' + PRICE.monthly + ' a month', description: 'Lucida is free: unlimited decks and cards, Learn mode and sharing. Pro adds exam dates, weak-spot stats, themes and unlimited pictures and sounds.' },
  { slug: 'privacy', kind: 'legal', board: 'Privacy', file: 'privacy.html', updated: iso(LEGAL_UPDATED), crumb: 'Privacy', h1: 'Privacy Policy',
    title: 'Privacy Policy · Lucida', description: 'What Lucida keeps, why we keep it, who helps us run it, and how you can export or delete your data.' },
  { slug: 'terms', kind: 'legal', board: 'Terms', file: 'terms.html', updated: iso(LEGAL_UPDATED), crumb: 'Terms', h1: 'Terms of Service',
    title: 'Terms of Service · Lucida', description: 'The terms for using Lucida, on the website at lucida.cards and in the app at app.lucida.cards: your account, your cards and fair use.' }
];

// The kinds of page. `board` draws it (and its Phone twin); `parent` is the hub its breadcrumb goes through. Three boards
// draw every page (the canvas has room for few): SiteCompare (comparisons, alternatives, the hubs and the 404 page),
// SiteFeature (features and who it's for) and SiteFaq, each with a page picker; a fourth, SiteOg, draws the link-preview
// picture of any page.
export const KINDS = {
  compare: { board: 'SiteCompare', label: 'Comparison', slug: /^vs\/[a-z0-9]+(?:-[a-z0-9]+)*$/, parent: 'compare' },
  alternative: { board: 'SiteCompare', label: 'Alternative', slug: /^[a-z0-9]+(?:-[a-z0-9]+)*-alternative$/, parent: 'compare' },
  hub: { board: 'SiteCompare', label: 'Hub', slug: /^(?:compare|features)$/, parent: null },
  feature: { board: 'SiteFeature', label: 'Feature', slug: /^features\/[a-z0-9]+(?:-[a-z0-9]+)*$/, parent: 'features' },
  use: { board: 'SiteFeature', label: 'Made for', slug: /^for\/[a-z0-9]+(?:-[a-z0-9]+)*$/, parent: 'features' },
  faq: { board: 'SiteFaq', label: 'FAQ', slug: /^faq$/, parent: null }
};
export const BOARDS = ['SiteCompare', 'SiteFeature', 'SiteFaq'];
const ORDER = ['hub', 'compare', 'alternative', 'feature', 'use', 'faq'];

// The page nobody meant to visit (web/404.html), drawn by SiteCompare as its "404" page. Its links are filled in by the
// board from the pages that exist.
export const NOT_FOUND = { slug: '404', kind: 'notfound', title: 'Page not found · Lucida', h1: 'This page doesn’t exist', updated: '',
  description: 'There is no page at this address. Lucida is a flashcard app: start from the home page, or see how it compares with other apps.',
  lead: 'The address may have changed, or it may have a typo. These pages are a good place to start.',
  table: null, sections: [], faq: [], sources: [], related: [], keywords: [], published: '', url: ORIGIN + '/404', updatedLabel: '', crumbs: [{ label: 'Home', slug: '' }, { label: 'Page not found', slug: '404' }] };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dateLabel = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? MONTHS[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1] : d || ''; };

// A text with [words](link) and **bold** in it, as pieces for a board to draw: { text, href, plain, bold }. (Self-contained,
// because the boards carry a copy of this function.)
export const partsOf = text => {
  const s = String(text ?? ''), out = [], re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let i = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > i) out.push({ text: s.slice(i, m.index), href: '', plain: true, bold: false });
    out.push(m[1] ? { text: m[1], href: m[2], plain: false, bold: false } : { text: m[3], href: '', plain: false, bold: true });
    i = m.index + m[0].length;
  }
  if (i < s.length || !out.length) out.push({ text: s.slice(i), href: '', plain: true, bold: false });
  return out;
};
// The same text with the marks taken out (for the structured data, llms.txt's summaries, the checks).
export const plain = text => partsOf(text).map(p => p.text).join('');

const str = v => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const strs = v => (Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : []);
const clean = slug => str(slug).replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');

export const urlOf = slug => ORIGIN + (slug ? '/' + slug : '/');
export const ogFile = slug => 'og/' + (slug ? slug.replace(/\//g, '-') : 'home') + '.png';
export const fileOf = slug => 'site/' + slug + '.html';

// One page as the boards, the pages and the checks use it. Anything missing becomes empty; nothing is invented.
export function normalize(raw) {
  const slug = clean(raw.slug), kind = str(raw.kind), title = str(raw.title);
  const cols = raw.table && Array.isArray(raw.table.columns) ? raw.table.columns.map(str) : [];
  const rows = raw.table && Array.isArray(raw.table.rows) ? raw.table.rows.filter(Array.isArray).map(r => cols.map((_, i) => str(r[i]))) : [];
  const page = {
    slug, kind, title, description: str(raw.description), h1: str(raw.h1) || title, lead: str(raw.lead),
    updated: str(raw.updated), published: str(raw.published),
    table: cols.length && rows.length ? { columns: cols, rows } : null,
    sections: (Array.isArray(raw.sections) ? raw.sections : []).map(s => ({ h2: str(s && s.h2), paras: strs(s && s.paras), bullets: strs(s && s.bullets) })).filter(s => s.h2 || s.paras.length || s.bullets.length),
    faq: (Array.isArray(raw.faq) ? raw.faq : []).map(f => ({ q: str(f && f.q), a: str(f && f.a) })).filter(f => f.q && f.a),
    sources: (Array.isArray(raw.sources) ? raw.sources : []).map(s => ({ label: str(s && s.label), url: str(s && s.url), checked: str(s && s.checked) })).filter(s => s.url),
    related: strs(raw.related).map(clean).filter(Boolean),
    keywords: Array.isArray(raw.keywords) ? strs(raw.keywords) : str(raw.keywords).split(/\s*,\s*/).filter(Boolean)
  };
  return page;
}

// Reads every page file under a folder (subfolders too). Files without a slug, and names starting with _ or ., are not pages.
export function readPages(dir = DATA_DIR) {
  const pages = [], problems = [];
  const walk = d => {
    let list;
    try { list = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of list.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(d, e.name), where = relative(dir, path);
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      if (e.isDirectory()) { walk(path); continue; }
      if (!e.name.endsWith('.json')) continue;
      let raw;
      try { raw = JSON.parse(readFileSync(path, 'utf8')); } catch (err) { problems.push(where + ': ' + err.message); continue; }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.slug === undefined) continue;
      pages.push({ ...normalize(raw), source: where });
    }
  };
  walk(dir);
  return { pages, problems };
}

// Pages that exist so links never break, made from what the site already says (a page file with the same slug replaces them).
function fallbacks(map) {
  const of = (...kinds) => [...map.values()].filter(p => kinds.includes(p.kind));
  const newest = list => list.map(p => p.updated).filter(Boolean).sort().pop() || FIXED[0].updated;
  const out = [];
  if (!map.has('compare')) {
    const list = of('compare', 'alternative');
    out.push({ slug: 'compare', kind: 'hub', title: 'Compare Lucida with other flashcard apps', h1: 'Lucida compared with other flashcard apps',
      description: 'See how Lucida compares with other flashcard apps on price, spaced repetition, AI, importing and sharing, with sources for every fact.',
      lead: 'Pick an app below to see how it compares with Lucida. Each page says plainly where the other app is better, and lists its sources with the date they were checked.', updated: newest(list) });
  }
  if (!map.has('features') && of('feature', 'use').length) {
    out.push({ slug: 'features', kind: 'hub', title: 'Lucida features and who it’s for', h1: 'Everything Lucida does',
      description: 'What Lucida does, from spaced repetition and Learn mode to shared decks and live games, and how students, teachers and language learners use it.',
      lead: 'Lucida is a flashcard app that plans your reviews and lets your own AI make the cards. These pages explain each part, and who it helps.', updated: newest(of('feature', 'use')) });
  }
  if (!map.has('faq')) {
    const seen = new Set(), faq = [];
    for (const [q, a] of [...PRICING_FAQ, ...of('compare', 'alternative', 'feature', 'use').flatMap(p => p.faq.map(f => [f.q, f.a]))]) if (!seen.has(q.toLowerCase())) { seen.add(q.toLowerCase()); faq.push({ q, a }); }
    out.push({ slug: 'faq', kind: 'faq', title: 'Lucida FAQ: questions and answers', h1: 'Questions about Lucida',
      description: 'Short answers to common questions about Lucida: what it costs, what Pro adds, and how it compares with other flashcard apps.',
      lead: 'Short answers to the questions people ask most. If yours isn’t here, write to ' + EMAIL + '.', updated: newest(of('compare', 'alternative', 'feature', 'use')), faq });
  }
  return out.map(p => ({ table: null, sections: [], faq: [], sources: [], related: [], keywords: [], published: '', ...p, synthetic: true }));
}

// A page from each kind that has none yet, only so a board has something to draw on the canvas (the site never gets them).
// It says only what the landing page and the pricing page already say.
const SAMPLES = [
  { slug: 'features/spaced-repetition', kind: 'feature', title: 'Spaced repetition in Lucida', h1: 'Spaced repetition', updated: '2026-09-29',
    description: 'Lucida plans every review with FSRS, so the cards you forget come back sooner and the ones you know come back later.',
    lead: 'Lucida plans every review with FSRS, an open-source scheduler. Cards you forgot come back soon, and cards you knew come back much later.',
    sections: [{ h2: 'Flip, rate, remember', paras: ['Tap a card to see the answer, then say how well you knew it. Lucida picks the day it comes back: soon if you forgot, much later if it was easy.'], bullets: [] },
      { h2: 'A few minutes a day', paras: ['Today shows what’s due, how long it takes, and your streak.'], bullets: ['Hard cards come back sooner.', 'Easy cards wait longer.'] }],
    faq: [{ q: 'Do I need Pro for spaced repetition?', a: 'No. Reviews planned by spaced repetition are free.' }] },
  { slug: 'for/students', kind: 'use', title: 'Lucida for students', h1: 'Lucida for students', updated: '2026-09-29',
    description: 'Ask your AI to turn a lecture into flashcards, then review them a few minutes a day. Free to start.',
    lead: 'Share a lecture or your notes with Claude or ChatGPT and ask for flashcards. They land in your decks in Lucida, ready to study.',
    sections: [{ h2: 'Cards from your lecture', paras: ['Paste your Lucida link into your AI once. Then share a lecture and ask for flashcards.'], bullets: [] }],
    faq: [{ q: 'Is Lucida free?', a: 'Yes. Unlimited decks and cards are free. Pro adds exam tools, stats and themes.' }] }
].map(p => ({ table: null, sections: [], faq: [], sources: [], related: [], keywords: [], published: '', ...p, sample: true }));

// Every page of the site that has data: the files, then the made-up ones, in a steady order, each with its address,
// its breadcrumb, and the pages it links to. `problems` lists what couldn't be read (a check turns those into failures).
export function pageSet(dir = DATA_DIR) {
  const { pages, problems } = readPages(dir), map = new Map();
  for (const p of pages) { if (map.has(p.slug)) problems.push(p.source + ': the page "' + p.slug + '" is also in ' + map.get(p.slug).source); else map.set(p.slug, p); }
  for (const p of fallbacks(map)) map.set(p.slug, p);
  const list = [...map.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.slug.localeCompare(b.slug));
  for (const p of list) {
    p.url = urlOf(p.slug); p.file = fileOf(p.slug); p.og = ogFile(p.slug); p.updatedLabel = dateLabel(p.updated);
    p.sources = p.sources.map(s => ({ ...s, checkedLabel: dateLabel(s.checked) }));
  }
  const by = new Map(list.map(p => [p.slug, p]));
  for (const p of list) {
    const parent = KINDS[p.kind] && KINDS[p.kind].parent && by.get(KINDS[p.kind].parent);
    p.crumbs = [{ label: 'Home', slug: '' }, ...(parent ? [{ label: parent.slug === 'compare' ? 'Compare' : 'Features', slug: parent.slug }] : []), { label: p.kind === 'hub' || p.kind === 'faq' ? (p.slug === 'faq' ? 'FAQ' : p.slug === 'compare' ? 'Compare' : 'Features') : p.h1, slug: p.slug }]
      .filter((c, i, all) => !(i && c.slug === all[i - 1].slug));
    const missing = p.related.filter(s => !by.has(s) && !FIXED.some(f => f.slug === s));
    p.relatedMissing = missing;
    p.related = p.related.filter(s => by.has(s) || FIXED.some(f => f.slug === s));
  }
  return { pages: list, problems };
}

// One line about every page, for links to it (boards, llms.txt): title and words to show for a link, and where it goes.
export const indexOf = pages => [...FIXED.map(f => ({ slug: f.slug, kind: f.kind, title: f.title, h1: f.h1, label: f.kind === 'home' ? NAME : f.crumb, description: f.description })),
  ...pages.filter(p => !p.sample).map(p => ({ slug: p.slug, kind: p.kind, title: p.title, h1: p.h1, label: p.h1, description: p.description }))];

// The links at the bottom of every site page, and the ones in the header of the pages made here. A page that doesn't exist
// isn't linked.
export function footerLinks(pages) {
  const has = s => pages.some(p => p.slug === s && !p.sample);
  return [['Compare', 'compare'], ['Features', 'features'], ['FAQ', 'faq'], ['Pricing', 'pricing'], ['Privacy', 'privacy'], ['Terms', 'terms']].filter(([, s]) => FIXED.some(f => f.slug === s) || has(s)).map(([label, slug]) => ({ label, slug }));
}
export const headerLinks = pages => footerLinks(pages).filter(l => ['compare', 'features', 'pricing'].includes(l.slug));

// What a board carries for the pages it draws: the pages themselves (a sample when its kinds have none), the one-line
// index, the footer links, and a fingerprint so a page file that changed without the boards being rebuilt is caught.
export function boardData(board, pages) {
  const kinds = Object.keys(KINDS).filter(k => KINDS[k].board === board);
  let mine = pages.filter(p => kinds.includes(p.kind));
  if (board === 'SiteCompare') mine = [...mine, NOT_FOUND];
  if (!mine.length) mine = SAMPLES.filter(p => kinds.includes(p.kind)).map(p => ({ ...p, url: urlOf(p.slug), updatedLabel: dateLabel(p.updated), crumbs: [{ label: 'Home', slug: '' }, { label: 'Features', slug: 'features' }, { label: p.h1, slug: p.slug }] }));
  const data = { pages: mine, index: indexOf(pages), footer: footerLinks(pages), header: headerLinks(pages) };
  return { ...data, hash: createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 12) };
}
