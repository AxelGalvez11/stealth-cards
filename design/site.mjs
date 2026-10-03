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
// Kinds and where they live: compare (vs/<name>), alternative (<name>-alternative), hub (blog, compare, features), feature
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
import { CONTACT, PRIVACY, UPDATED as LEGAL_UPDATED } from './legal.mjs';
import { MAKE } from '../web/plans.mjs';

export const ORIGIN = 'https://lucida.cards', APP = 'https://app.lucida.cards', NAME = 'Lucida', EMAIL = CONTACT;
// Where the page files are. LUCIDA_SITE_DIR points somewhere else (to try pages without touching the real ones).
export const DATA_DIR = process.env.LUCIDA_SITE_DIR || fileURLToPath(new URL('./site/', import.meta.url));

// Lucida's accounts, as the footer's icons show them (name for the icon, label, address).
export const SOCIALS = [['tiktok', 'TikTok', 'https://www.tiktok.com/@lucidacards'], ['youtube', 'YouTube', 'https://www.youtube.com/@lucidacards'], ['instagram', 'Instagram', 'https://www.instagram.com/lucidacards/'], ['facebook', 'Facebook', 'https://www.facebook.com/61594547618098']];

// Pro's prices in dollars (the pricing board draws the same numbers), and what each plan holds.
export const PRICE = { monthly: '5.99', yearly: '49.99', currency: 'USD' };
// How long a make may be, in words (the numbers come from web/plans.mjs, which the apps and the server read, so a change there changes this page).
const LONG = m => (m % 60 === 0 ? m / 60 + (m === 60 ? ' hour' : ' hours') : m + ' minutes');
export const PLAN_FREE = ['Unlimited decks and cards', 'Make cards from files, photos, recordings and links: ' + MAKE.free.perDay + ' a day', 'Your own AI makes cards and quizzes too', 'Reviews planned by spaced repetition', 'Learn mode', 'Share decks and study anyone’s', 'Live games with friends', 'Up to 100 pictures and sounds', 'Import and export anytime'];
export const PLAN_PRO = ['Make cards from bigger sources: ' + MAKE.pro.perDay + ' a day, up to ' + MAKE.pro.pages + ' pages or ' + LONG(MAKE.pro.minutes), 'Exam dates: ready in time for the test', 'Stats: your streak, memory and weak spots', 'Unlimited pictures and sounds', 'Themes for cards, covers and your profile', 'The hardest cards on decks you share', 'Photo covers and your own colors', 'Natural voices for sound cards', 'More AI explanations'];
// What the iPhone app's paywall lists: the same, less what the iPhone app doesn't have yet (natural voices for sound cards, which only the web has).
export const PLAN_PRO_PHONE = PLAN_PRO.filter(x => x !== 'Natural voices for sound cards');
export const PRICING_FAQ = [
  ['What can Lucida make cards from?', 'A PDF, slides, a Word file, caption files, pictures, a recording, a YouTube link, pasted text or a topic you type. You check the new cards before they’re saved, and the deck keeps what they were made from.'],
  ['How much can I make?', 'Free: ' + MAKE.free.perDay + ' makes a day, each up to ' + MAKE.free.pages + ' pages, ' + LONG(MAKE.free.minutes) + ' of recording or video, or ' + MAKE.free.photos + ' pictures. Pro: ' + MAKE.pro.perDay + ' a day, up to ' + MAKE.pro.pages + ' pages, ' + LONG(MAKE.pro.minutes) + ' or ' + MAKE.pro.photos + ' pictures.'],
  ['Do I need Pro for my AI to make cards?', 'No. On Free, your own AI app can make as many cards as you want through your Lucida link. Lucida’s own maker has the daily limits above.'],
  ['What happens to my cards if I stop Pro?', 'Nothing. Every deck and card stays yours. Only the Pro extras switch off.'],
  ['Can I cancel anytime?', 'Yes, from Settings. Pro stays on until the end of the time you paid for.'],
  ['What counts toward the 100 pictures and sounds?', 'Each picture or sound on a card. Text cards never count.']
];

// What llms.txt and llms-full.txt say, written by hand in design/site/_llms.json: an intro paragraph, a name and one line for
// each page (in the order to list them), and quick facts. Without that file they are made from the pages' own words.
export const LLMS = (() => { try { return JSON.parse(readFileSync(join(DATA_DIR, '_llms.json'), 'utf8')); } catch { return null; } })();
// What the articles show besides their words (design/visuals.mjs): diagrams, tables made from bullets, the app's screens, and "Test yourself".
export const VISUALS = (() => { try { return JSON.parse(readFileSync(join(DATA_DIR, '_visuals.json'), 'utf8')); } catch { return {}; } })();
// What Lucida is, in one paragraph: the top of llms.txt, and the description of the organization and the site in the
// structured data. Only what's true today (the iPhone app isn't in the App Store yet).
export const ABOUT = LLMS && LLMS.intro ? LLMS.intro : 'Lucida is a flashcard app that runs in the browser at app.lucida.cards, on phones and computers. It plans every review with FSRS spaced repetition, makes cards from your files, photos, recordings and links, and lets your own AI (Claude, ChatGPT, Cursor or any app that supports MCP) make and edit your cards through your personal Lucida link. Free: unlimited decks and cards, Learn mode, shared decks and live games with friends. Pro costs $' + PRICE.monthly + ' a month or $' + PRICE.yearly + ' a year.';

const iso = label => { const d = new Date(label + ' 12:00 UTC'); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };

// The pages that come from their own boards. `board` is the computer board; the phone one has "Phone" after its name.
export const FIXED = [
  { slug: '', kind: 'home', board: 'Landing', file: 'landing.html', updated: '2026-09-29', crumb: 'Home', h1: 'Flashcards your AI can make.',
    title: 'Lucida · Flashcards your AI can make', description: 'Ask Claude or ChatGPT to turn a lecture into flashcards. Lucida keeps them in your decks and brings each one back right before you’d forget it.' },
  { slug: 'pricing', kind: 'pricing', board: 'Pricing', file: 'pricing.html', updated: '2026-09-29', crumb: 'Pricing', h1: 'Simple pricing.',
    title: 'Lucida pricing: free, or Pro at $' + PRICE.monthly + ' a month', description: 'Lucida is free: unlimited decks and cards, Learn mode and sharing. Pro adds Stats, exam dates, themes and unlimited pictures and sounds.' },
  { slug: 'privacy', kind: 'legal', board: 'Privacy', file: 'privacy.html', updated: iso(PRIVACY.updated || LEGAL_UPDATED), crumb: 'Privacy', h1: 'Privacy Policy',
    title: 'Privacy Policy · Lucida', description: 'What Lucida keeps, why we keep it, who helps us run it, and how you can export or delete your data.' },
  { slug: 'terms', kind: 'legal', board: 'Terms', file: 'terms.html', updated: iso(LEGAL_UPDATED), crumb: 'Terms', h1: 'Terms of Service',
    title: 'Terms of Service · Lucida', description: 'The terms for using Lucida, on the website at lucida.cards and in the app at app.lucida.cards: your account, your cards and fair use.' },
  { slug: 'connect', kind: 'guide', board: 'SiteConnect', file: 'connect-guide.html', updated: '2026-10-02', crumb: 'Connect', h1: 'Connect Lucida to your AI',
    title: 'Connect Lucida to your AI · Lucida', description: 'Add Lucida to Claude, ChatGPT, Grok, Gemini, Perplexity or Mistral with one address, sign in, and your AI can make flashcards and quiz you.' }
];

// The kinds of page. `board` draws it (and its Phone twin); `parent` is the hub its breadcrumb goes through. Three boards
// draw every page (the canvas has room for few): SiteCompare (comparisons, alternatives, the hubs and the 404 page),
// SiteFeature (features and who it's for) and SiteFaq, each with a page picker; a fourth, SiteOg, draws the link-preview
// picture of any page.
export const KINDS = {
  compare: { board: 'SiteCompare', label: 'Comparison', slug: /^vs\/[a-z0-9]+(?:-[a-z0-9]+)*$/, parent: 'compare' },
  alternative: { board: 'SiteCompare', label: 'Alternative', slug: /^[a-z0-9]+(?:-[a-z0-9]+)*-alternative$/, parent: 'compare' },
  hub: { board: 'SiteCompare', label: 'Hub', slug: /^(?:blog|compare|features)$/, parent: null },
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

// "Sep 30, 2026": the day a page was updated, as the chips under a title and the cards show it.
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateShort = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? MON3[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1] : d || ''; };
// The words a page holds (its lead, table, sections and questions), and the minutes to read them: about 230 a minute, at least 1.
const nWords = s => plain(s).split(/\s+/).filter(Boolean).length;
export const wordsOf = p => nWords(p.lead) + (p.table ? [...p.table.columns, ...p.table.rows.flat()].reduce((n, c) => n + nWords(c), 0) : 0)
  + p.sections.reduce((n, s) => n + nWords(s.h2) + [...s.paras, ...s.bullets].reduce((m, x) => m + nWords(x), 0), 0) + p.faq.reduce((n, f) => n + nWords(f.q) + nWords(f.a), 0);
export const minutesOf = p => Math.max(1, Math.round(wordsOf(p) / 230));
// The word on a page's card (over its picture): the kind of page, in the blog's own words.
export const chipOf = p => ({ home: 'Home', pricing: 'Pricing', legal: 'Legal', guide: 'Help', compare: 'Comparison', alternative: 'Alternative', feature: 'Feature', use: 'Guide', faq: 'Help', notfound: '' }[p.kind]
  ?? (p.kind === 'hub' && p.slug !== 'blog' ? 'Overview' : ''));

// The blog (lucida.cards/blog) sorts its pages into four categories, each a tab and a section. A category may have a hub of its own
// (the comparisons' is /compare, the features' is /features); the others are a section of the blog.
export const CATEGORIES = [
  { id: 'comparisons', label: 'Comparisons', kinds: ['compare', 'alternative'], hub: 'compare' },
  { id: 'features', label: 'Features', kinds: ['feature'], hub: 'features' },
  { id: 'guides', label: 'Guides', kinds: ['use'], hub: '' },
  { id: 'help', label: 'Help', kinds: ['faq', 'guide'], hub: '' }
];
export const categoryOf = p => CATEGORIES.find(c => c.kinds.includes(p.kind) || (p.kind === 'hub' && c.hub === p.slug));
// The page each hub (and the blog) features first.
export const FEATURED = { blog: 'vs/quizlet', compare: 'vs/quizlet', features: 'features/spaced-repetition' };
// A page's breadcrumb, which starts at the blog: Blog › its category › the page ({ label, slug, hash }; a category without a hub
// points at its section of the blog). Pages outside the blog (pricing, privacy, terms) start at Home.
export const crumbsOf = p => {
  const cat = categoryOf(p), slug = p.slug || '', name = p.kind === 'faq' ? 'FAQ' : p.kind === 'guide' ? (p.crumb || p.h1) : p.h1;
  if (slug === 'blog') return [{ label: 'Blog', slug: 'blog' }];
  if (!cat) return [{ label: 'Home', slug: '' }, ...(slug ? [{ label: p.crumb || p.h1, slug }] : [])];
  if (p.kind === 'hub') return [{ label: 'Blog', slug: 'blog' }, { label: cat.label, slug }];
  return [{ label: 'Blog', slug: 'blog' }, { label: cat.label, slug: cat.hub || 'blog', ...(cat.hub ? {} : { hash: cat.id }) }, { label: name, slug }];
};

const str = v => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const strs = v => (Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : []);
const clean = slug => str(slug).replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');

export const urlOf = slug => ORIGIN + (slug ? '/' + slug : '/');
export const ogKey = slug => slug || 'home';
export const ogFile = slug => 'og/' + ogKey(slug).replace(/\//g, '-') + '.png';

// What each page's picture draws (SiteOg, design/build.mjs). Three choices a page makes:
//   - a SCENE on the right, drawn from white cards (two cards facing each other for a comparison, a question and its four answers for
//     Learn mode, cards at widening gaps for spaced repetition, ...), with the app's deck gradients as accents; `other` is the other app's
//     name in a comparison (written out, never its logo);
//   - a bold full-bleed gradient behind it, one of STYLES (after Awwwards' "Trendy Gradients in Web Design": irregular mesh, radial ramp,
//     blur, edges, landscape bands, multicolor, retro diagonal rainbow, duotone, tricolor, volume mesh, banding, a liquid swirl, a
//     grainy blur), in one of the GRAD palettes (vivid colors based on the deck covers, with a few neons and pastels). The picture
//     is the same on a dark screen as on a light one;
//   - `v`, which moves the shapes a little, so two pages of one style still differ.
// A page file may say `"picture": { "scene": "…", "style": "…", "grad": "…", "other": "…" }` to choose its own; a page that says
// nothing gets its kind's scene and a style and palette picked from its address. design/check-site.mjs says when two pictures are alike
// and when two neighbors on the blog's grid share a style.
export const SCENES = ['blog', 'cards', 'versus0', 'versus1', 'versus2', 'versus3', 'switch', 'intervals', 'occlusion', 'quiz', 'live', 'shared', 'import', 'chat', 'mcat', 'med', 'words', 'teach', 'week', 'question', 'grid', 'plans', 'lock', 'terms', 'link'];
// A scene drawn in several arrangements (`v` picks one), so pages of the same kind don't look alike.
export const SCENE_ARRANGEMENTS = { versus: 4 };
export const STYLES = ['mesh', 'radial', 'blurred', 'edgy', 'bands', 'multi', 'retro', 'duo', 'tri', 'volume', 'banding', 'swirl', 'grainy'];
// Five colors each: the main one, a second, a third, a light one and a deep one.
export const GRAD = {
  Iris: ['#5B6CFF', '#8E7CFF', '#2CB2EA', '#C9D4FF', '#FF7AD9'], Apricot: ['#FF8A1F', '#FFC857', '#FF4D4D', '#FFE0B5', '#8F5BFF'],
  Lilac: ['#B28BFF', '#FF8FD8', '#7AA2FF', '#FFD9EC', '#5B3DF5'], Mint: ['#19D9A0', '#B8F26B', '#2CB2EA', '#E4FFC2', '#0A8F7A'],
  Aqua: ['#12C2E9', '#5B8CFF', '#7DF3E4', '#DDF8FF', '#7B61FF'], Rose: ['#FF4F81', '#FF9BC0', '#FF7A59', '#FFE0EA', '#C03BFF'],
  Lemon: ['#FFE600', '#FFB000', '#FF6B3D', '#FFF7B0', '#FF4F81'], Dusk: ['#6A4DFF', '#C24DFF', '#FF6A6A', '#FFC7A1', '#241B6E'],
  Grove: ['#1FA24A', '#B6E34A', '#F9D64A', '#DFF5C2', '#0F5D3A'], Ember: ['#FF5A1F', '#FFA24D', '#FF2E63', '#FFE2C9', '#5A1A3C'],
  Ocean: ['#0C8CE9', '#2CD4D9', '#5B6CFF', '#D4F6FF', '#0B2E6B'], Neon: ['#C6FF00', '#FF2E93', '#FFEE00', '#F4FFC2', '#00D1FF'],
  Sunset: ['#FF3D6E', '#FF8A3D', '#FFD23D', '#FFE3D1', '#4B2BA6'], Tropic: ['#00D4B1', '#FFD93D', '#FF5F7E', '#D6FFF3', '#2D6BFF'],
  Candy: ['#FFB3C7', '#C9B6FF', '#B6E3FF', '#FFF0D6', '#FFD08A'], Berry: ['#D4145A', '#FBB03B', '#7B2FF7', '#FFE3F1', '#2A0A5E'],
  // Added so that every page's gradient can be a look of its own (the first sixteen are the ones the blog started with).
  Cobalt: ['#1F4BFF', '#4D8DFF', '#00C6FF', '#D9E6FF', '#0A1F6B'], Magenta: ['#E6007E', '#FF5CA8', '#9B2DFF', '#FFD9EC', '#4A0A5E'],
  Crimson: ['#E0112B', '#FF5A5F', '#FF9A3C', '#FFDAD6', '#5A0A1E'], Teal: ['#00A39A', '#2DD4BF', '#3B82F6', '#D3FAF4', '#064E5B'],
  Violet: ['#7C3AED', '#A78BFA', '#EC4899', '#EDE4FF', '#2E1065'], Lime: ['#B6F500', '#7BE000', '#00D4A0', '#F3FFC8', '#0B6B3A'],
  Plum: ['#8E2DE2', '#FF4E8A', '#FFB347', '#F6E3FF', '#2A0A4A'], Cherry: ['#D6204B', '#FF7096', '#7A5AF8', '#FFE0E8', '#3B0A2E']
};
export const GRAD_NAMES = Object.keys(GRAD);
const PICTURES = {
  // The blog's own order: the featured page, then each category's pages (design/check-site.mjs keeps neighbors from sharing a style).
  'vs/quizlet': { scene: 'versus', v: 1, style: 'mesh', grad: 'Aqua', other: 'Quizlet' },
  compare: { scene: 'grid', style: 'tri', grad: 'Cherry' }, 'vs/anki': { scene: 'versus', v: 0, style: 'volume', grad: 'Neon', other: 'Anki' }, 'vs/knowt': { scene: 'versus', v: 2, style: 'bands', grad: 'Plum', other: 'Knowt' },
  'vs/remnote': { scene: 'versus', v: 3, style: 'retro', grad: 'Neon', other: 'RemNote' }, 'vs/brainscape': { scene: 'versus', v: 3, style: 'edgy', grad: 'Cobalt', other: 'Brainscape' }, 'vs/mochi': { scene: 'versus', v: 0, style: 'multi', grad: 'Teal', other: 'Mochi' },
  'vs/kahoot': { scene: 'versus', v: 1, style: 'radial', grad: 'Magenta', other: 'Kahoot' }, 'vs/gizmo': { scene: 'versus', v: 2, style: 'volume', grad: 'Lemon', other: 'Gizmo' },
  'anki-alternative': { scene: 'switch', style: 'bands', grad: 'Berry', other: 'Anki' }, 'quizlet-alternative': { scene: 'switch', style: 'swirl', grad: 'Apricot', other: 'Quizlet' },
  features: { scene: 'grid', style: 'blurred', grad: 'Lime' }, 'features/spaced-repetition': { scene: 'intervals', style: 'edgy', grad: 'Sunset' }, 'features/ai-flashcards': { scene: 'chat', style: 'swirl', grad: 'Ocean' },
  'features/learn-mode': { scene: 'quiz', style: 'bands', grad: 'Tropic' }, 'features/shared-decks': { scene: 'shared', style: 'swirl', grad: 'Dusk' },
  'features/live-games': { scene: 'live', style: 'volume', grad: 'Crimson' }, 'features/image-occlusion': { scene: 'occlusion', style: 'tri', grad: 'Lime' }, 'features/import': { scene: 'import', style: 'edgy', grad: 'Ember' },
  'for/students': { scene: 'week', style: 'duo', grad: 'Mint' }, 'for/med-school': { scene: 'med', style: 'retro', grad: 'Plum' }, 'for/mcat': { scene: 'mcat', style: 'radial', grad: 'Cobalt' },
  'for/language-learning': { scene: 'words', style: 'multi', grad: 'Cherry' }, 'for/teachers': { scene: 'teach', style: 'blurred', grad: 'Tropic' },
  faq: { scene: 'question', style: 'retro', grad: 'Berry' }, connect: { scene: 'link', style: 'banding', grad: 'Candy' },
  // Pages outside the blog's grid.
  blog: { scene: 'blog', style: 'radial', grad: 'Ember' }, '': { scene: 'cards', style: 'banding', grad: 'Violet' }, pricing: { scene: 'plans', style: 'mesh', grad: 'Sunset' },
  privacy: { scene: 'lock', style: 'multi', grad: 'Apricot' }, terms: { scene: 'terms', style: 'mesh', grad: 'Dusk' }
};
const KIND_SCENE = { compare: 'versus', alternative: 'switch', hub: 'grid', faq: 'question' };
export const pictureOf = p => {
  const slug = p.slug || '', hash = [...slug].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  return { scene: KIND_SCENE[p.kind] || 'cards', v: 0, style: STYLES[hash % STYLES.length], grad: GRAD_NAMES[(hash >>> 4) % GRAD_NAMES.length], other: '', ...(PICTURES[slug] || {}), ...(p.picture || {}) };
};
// What a page's link-preview picture shows (its kind, its h1 and its address); the picture is out of date when this changes.
export const ogFingerprint = item => createHash('sha1').update([item.slug, item.kind, item.h1, JSON.stringify(pictureOf(item))].join('|')).digest('hex').slice(0, 10);
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
    faq: (Array.isArray(raw.faq) ? raw.faq : []).map(f => ({ q: str(f && f.q), a: str(f && f.a), ...(str(f && f.group) ? { group: str(f.group) } : {}) })).filter(f => f.q && f.a),
    sources: (Array.isArray(raw.sources) ? raw.sources : []).map(s => ({ label: str(s && s.label), url: str(s && s.url), checked: str(s && s.checked) })).filter(s => s.url),
    related: strs(raw.related).map(clean).filter(Boolean),
    picture: raw.picture && typeof raw.picture === 'object' ? Object.fromEntries(['scene', 'style', 'grad', 'other'].map(k => [k, str(raw.picture[k])]).filter(([, v]) => v)) : null,
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
  const newest = list => list.map(p => p.updated).filter(Boolean).sort().pop() || FIXED[0].updated, list0 = () => of('compare', 'alternative', 'feature', 'use', 'faq');
  const out = [];
  if (!map.has('blog')) {
    out.push({ slug: 'blog', kind: 'hub', title: 'Lucida blog: flashcard comparisons, guides and answers', h1: 'Everything about studying with flashcards',
      description: 'Comparisons with other flashcard apps, guides to every Lucida feature, and answers, each with its sources and the day it was checked.',
      lead: 'Comparisons with other flashcard apps, guides to what Lucida does, and short answers, each with the day it was checked.', updated: newest(list0()) });
  }
  if (!map.has('compare')) {
    const list = of('compare', 'alternative');
    out.push({ slug: 'compare', kind: 'hub', title: 'Compare Lucida with other flashcard apps', h1: 'Lucida compared with other flashcard apps',
      description: 'See how Lucida compares with other flashcard apps on price, spaced repetition, AI, importing and sharing, with sources for every fact.',
      lead: 'Pick an app below to see how it compares with Lucida. Each page says plainly where the other app is better, and lists its sources with the date they were checked.', updated: newest(list) });
  }
  if (!map.has('features') && of('feature', 'use').length) {
    out.push({ slug: 'features', kind: 'hub', title: 'Lucida features and who it’s for', h1: 'Everything Lucida does',
      description: 'What Lucida does, from spaced repetition and Learn mode to shared decks and live games, and how students, teachers and language learners use it.',
      lead: 'Lucida is a flashcard app that plans your reviews and makes cards from your files, photos, recordings and links, or lets your own AI make them. These pages explain each part, and who it helps.', updated: newest(of('feature', 'use')) });
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
      { h2: 'A few minutes a day', paras: ['Your Library shows what’s due and how long it takes, and Stats (Pro) keeps your streak.'], bullets: ['Hard cards come back sooner.', 'Easy cards wait longer.'] }],
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
  // In the order design/site/_llms.json lists them, when it does, so every list of pages reads the way it was meant to.
  const rank = slug => { const i = LLMS && LLMS.pages ? Object.keys(LLMS.pages).indexOf(slug) : -1; return i < 0 ? 1e6 : i; };
  const list = [...map.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
  for (const p of list) {
    p.url = urlOf(p.slug); p.file = fileOf(p.slug); p.og = ogFile(p.slug); p.updatedLabel = dateLabel(p.updated);
    if (VISUALS[p.slug] && !p.synthetic && !p.sample) p.visuals = VISUALS[p.slug];
    p.sources = p.sources.map(s => ({ ...s, checkedLabel: dateLabel(s.checked) }));
  }
  const by = new Map(list.map(p => [p.slug, p]));
  for (const p of list) {
    p.crumbs = crumbsOf(p);
    const missing = p.related.filter(s => !by.has(s) && !FIXED.some(f => f.slug === s));
    p.relatedMissing = missing;
    p.related = p.related.filter(s => by.has(s) || FIXED.some(f => f.slug === s));
  }
  return { pages: list, problems };
}

// A page's short name (the one _llms.json gives it, else its title), for small places like a hub's grid of cards.
const shortOf = p => ((LLMS && LLMS.pages && LLMS.pages[p.slug]) || {}).label || p.h1;

// One line about every page, for links to it (boards, llms.txt): title and words to show for a link, and where it goes.
export const indexOf = pages => [...FIXED.map(f => ({ slug: f.slug, kind: f.kind, title: f.title, h1: f.h1, label: f.kind === 'home' ? NAME : f.crumb, description: f.description, date: dateShort(f.updated), minutes: 0, chip: chipOf(f), cat: (categoryOf(f) || {}).id || '', short: shortOf(f), picture: pictureOf(f) })),
  ...pages.filter(p => !p.sample).map(p => ({ slug: p.slug, kind: p.kind, title: p.title, h1: p.h1, label: p.h1, description: p.description, date: dateShort(p.updated), minutes: minutesOf(p), chip: chipOf(p), cat: (categoryOf(p) || {}).id || '', short: shortOf(p), picture: pictureOf(p) }))];

// The links at the bottom of every site page, and the ones in the header of the pages made here. A page that doesn't exist
// isn't linked.
export function footerLinks(pages) {
  const has = s => pages.some(p => p.slug === s && !p.sample);
  return [['Blog', 'blog'], ['Compare', 'compare'], ['Features', 'features'], ['FAQ', 'faq'], ['Pricing', 'pricing'], ['Privacy', 'privacy'], ['Terms', 'terms']].filter(([, s]) => FIXED.some(f => f.slug === s) || has(s)).map(([label, slug]) => ({ label, slug }));
}
export const headerLinks = pages => footerLinks(pages).filter(l => ['blog', 'compare', 'features', 'pricing'].includes(l.slug));

// What a board carries for the pages it draws: the pages themselves (a sample when its kinds have none), the one-line
// index, the footer links, and a fingerprint so a page file that changed without the boards being rebuilt is caught.
export function boardData(board, pages) {
  const kinds = Object.keys(KINDS).filter(k => KINDS[k].board === board);
  let mine = pages.filter(p => kinds.includes(p.kind));
  if (board === 'SiteCompare') mine = [...mine, NOT_FOUND];
  if (!mine.length) mine = SAMPLES.filter(p => kinds.includes(p.kind)).map(p => ({ ...p, url: urlOf(p.slug), updatedLabel: dateLabel(p.updated), crumbs: crumbsOf(p) }));
  const data = { pages: mine, index: indexOf(pages), footer: footerLinks(pages), header: headerLinks(pages) };
  return { ...data, hash: createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 12) };
}
