// Lucida web app. Every screen comes from a board on the design canvas (see design/to-web.mjs):
// a template with {{holes}}, <sc-if>, <sc-for> and <dc-import>, plus the board's own logic class.
// This file renders those screens with your data (web/db.js), keeps them updated, and moves between them.
// /b/<Board> shows any canvas board with the canvas's sample data instead.
import { createDb } from './db.js';

// ---------- pages ----------
// Which board shows for a page. Some depend on your data: no decks yet shows the new-user Today, and so on.
// /b (every canvas board with sample data) is for working on the design, so it only opens on your own computer.
const DESIGN = ['localhost', '127.0.0.1'].includes(location.hostname);
// Phones sign in on the phone sign-in pages, which fill the screen (design/to-web.mjs).
const narrow = matchMedia('(max-width: 760px)');
function resolve(path, q) {
  if (path.startsWith('/b/')) return DESIGN ? { name: decodeURIComponent(path.slice(3)), design: true } : { redirect: '/' };
  // Online and signed out: only the sign-in pages (and the code page once a code is on its way).
  if (db.signedOut) { const p = narrow.matches ? 'Phone' : 'Web'; return path === '/sign-in/code' && db.auth.email() ? { name: p + 'SignInCode' } : path === '/sign-in' ? { name: p + 'SignIn' } : { redirect: '/sign-in' }; }
  if (path.startsWith('/sign-in')) return { redirect: '/' };
  const deck = /^\/deck\/([^/]+)(\/card(?:\/([^/]+))?|\/import|\/learn)?$/.exec(path);
  if (path === '/') return { name: db.decks().length ? 'Main' : 'WebTodayNew' };
  if (path === '/decks') return { name: db.decks().length ? 'WebDecks' : 'WebDecksEmpty' };
  if (path === '/decks/new') return { name: 'WebNewDeck' };
  if (path === '/decks/import') return { name: 'WebImport' };
  if (deck) {
    const id = deck[1];
    if (!db.raw().decks.some(d => d.id === id)) return { redirect: '/decks' };
    if (deck[2] === '/import') return { name: 'WebImport', props: { deckId: id } };
    // Learn mode starts from a sheet over the deck (phones get the phone boards, which fill the screen).
    if (deck[2] === '/learn') return { name: (narrow.matches ? 'Phone' : 'Web') + 'QuizStart', props: { deckId: id } };
    if (deck[2]) return { name: 'WebEditor', props: { deckId: id, cardId: deck[3] || '', from: q.get('from') || '' } };
    // An empty deck shows its empty page, unless you opened its settings.
    return { name: db.cards(id).length || q.get('settings') === '1' ? 'WebDeck' : 'WebDeckEmpty', props: { deckId: id, settingsOpen: q.get('settings') === '1' } };
  }
  // A Learn mode session: the board for its current question, or the end once every card is learned.
  const ln = /^\/learn\/([^/]+)$/.exec(path);
  if (ln) {
    const L = db.learn();
    if (!L || L.deckId !== ln[1]) return { redirect: '/deck/' + ln[1] + '/learn' };
    return { name: (narrow.matches ? 'Phone' : 'Web') + (L.done === true ? 'QuizDone' : { match: 'QuizMatch', type: 'QuizType' }[L.type] || 'Quiz'), props: { deckId: ln[1] } };
  }
  const rv = /^\/review(?:\/([^/]+))?$/.exec(path);
  if (rv && rv[1] !== 'done') {
    const id = rv[1] || '', pile = q.get('pile') || '';
    if (id && !db.raw().decks.some(d => d.id === id)) return { redirect: '/decks' };
    if (!db.hasQueue(id, pile)) return { redirect: db.session().cards ? '/review/done' : id ? '/deck/' + id : '/' };
    return { name: 'WebReview', props: { deckId: id, pile } };
  }
  // Sorting into piles doesn't grade, so that session ends on its own page.
  if (path === '/review/done') return { name: db.session().onlyPiles ? 'WebDonePiles' : 'WebDone' };
  if (path === '/stats') return { name: db.hasReviews() ? 'WebStats' : 'WebStatsEmpty' };
  if (path === '/connect') return { name: 'WebConnect' };
  if (path === '/settings') return { name: 'WebSettings' };
  return { redirect: '/' };
}
// Links between boards: in the app they go to the matching page (for the deck you're on); on /b they stay on /b.
function linkFor(name) {
  if (current && current.design) return '/b/' + name;
  const id = current && current.props.deckId;
  const pages = { Main: '/', WebTodayNew: '/', WebTodayCaughtUp: '/', WebDecks: '/decks', WebDecksEmpty: '/decks', WebDecksList: '/decks', WebNewDeck: '/decks/new',
    WebImport: id ? '/deck/' + id + '/import' : '/decks/import', WebDeck: id ? '/deck/' + id : '/decks', WebDeckSettings: id ? '/deck/' + id + '?settings=1' : '/decks',
    WebEditor: id ? '/deck/' + id + '/card' : db.signedOut ? '/' : db.today().newCardHref, WebReview: id ? '/review/' + id : '/review', WebDone: '/review/done', WebDonePiles: '/review/done',
    WebQuizStart: id ? '/deck/' + id + '/learn' : '/decks', PhoneQuizStart: id ? '/deck/' + id + '/learn' : '/decks', PhoneDeck: id ? '/deck/' + id : '/decks', Pricing: 'https://lucida.cards/pricing', PricingPhone: 'https://lucida.cards/pricing',
    WebStats: '/stats', WebStatsEmpty: '/stats', WebConnect: '/connect', WebSettings: '/settings', WebSignIn: '/sign-in', WebSignInCode: '/sign-in/code', PhoneSignIn: '/sign-in', PhoneSignInCode: '/sign-in/code', PhoneToday: '/', Privacy: '/privacy', Terms: '/terms' };
  return pages[name] || '/b/' + name;
}

// ---------- screens ----------
const loaded = {}, pending = {};
async function load(name) {
  if (!loaded[name]) { pending[name] ||= import('./screens/' + name + '.js').then(m => { loaded[name] = m.default; }); await pending[name]; }
  await Promise.all(loaded[name].imports.map(load));
  return loaded[name];
}
function useCss(s) {
  if (!s.css || document.querySelector('style[data-screen="' + s.name + '"]')) return;
  const el = document.createElement('style');
  el.dataset.screen = s.name;
  el.textContent = s.css;
  document.head.appendChild(el);
}

// ---------- logic ----------
// Boards get what they get on the canvas: props, state, setState, forceUpdate, refs, and
// componentDidMount / componentDidUpdate / componentWillUnmount.
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(u) { this.state = { ...this.state, ...(typeof u === 'function' ? u(this.state, this.props) : u) }; schedule(); }
  forceUpdate() { schedule(); }
}
const classes = new Map(), instances = new Map(), mounted = new WeakSet();
let drawn = [];
function instance(s, key, props) {
  if (!classes.has(s.name)) classes.set(s.name, s.Logic(DCLogic));
  let c = instances.get(key);
  if (!c) { c = new (classes.get(s.name))(props); instances.set(key, c); } else c.props = props;
  drawn.push(c);
  return c;
}

// ---------- templates ----------
let handlers = [], refs = [];
const get = (o, p) => p.trim().split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function fill(str, sc) {
  // ref="{{fn}}" hands the element to fn once it's on the page.
  str = str.replace(/\sref="\{\{\s*([^}]+?)\s*\}\}"/g, (_, p) => {
    const fn = get(sc, p);
    if (typeof fn !== 'function') return '';
    refs.push(fn);
    return ' data-ref="' + (refs.length - 1) + '"';
  });
  str = str.replace(/\son([A-Z][a-zA-Z]*)="\{\{\s*([^}]+?)\s*\}\}"/g, (_, ev, p) => {
    const fn = get(sc, p);
    if (typeof fn !== 'function') return '';
    handlers.push(fn);
    return ' data-on-' + ev.toLowerCase() + '="' + (handlers.length - 1) + '"';
  });
  return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => {
    if (p === 'true') return 'true';
    if (p === 'false') return '';
    const v = get(sc, p);
    return v == null || typeof v === 'function' ? '' : esc(v);
  });
}
const holeOf = (open, a) => { const m = open.match(new RegExp('\\s' + a + '="\\{\\{([^}]+)\\}\\}"')); return m ? m[1].trim() : ''; };
function render(str, sc, key) {
  let out = '', i = 0;
  const re = /<(sc-if|sc-for|dc-import)\b/g;
  for (;;) {
    re.lastIndex = i;
    const hit = re.exec(str);
    if (!hit) return out + fill(str.slice(i), sc);
    out += fill(str.slice(i, hit.index), sc);
    const tag = hit[1], k = str.indexOf('>', hit.index), open = str.slice(hit.index, k + 1);
    const cre = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g');
    cre.lastIndex = k + 1;
    let depth = 1, close;
    while (depth) { close = cre.exec(str); depth += close[0].startsWith('</') ? -1 : 1; }
    const inner = str.slice(k + 1, close.index);
    if (tag === 'sc-if') { if (get(sc, holeOf(open, 'value'))) out += render(inner, sc, key); }
    else if (tag === 'sc-for') {
      const list = get(sc, holeOf(open, 'list')) || [], as = open.match(/\sas="(\w+)"/)[1];
      list.forEach((it, n) => { out += render(inner, { ...sc, [as]: it }, key + '.' + n); });
    } else out += importScreen(open, sc, key + '/' + hit.index);
    i = close.index + close[0].length;
  }
}
function importScreen(open, sc, key) {
  const s = loaded[open.match(/\sname="([^"]+)"/)[1]];
  const props = { ...s.props, ...base() };
  for (const [, a, v] of open.matchAll(/\s([a-z][a-z0-9-]*)="([^"]*)"/g)) {
    if (a === 'name' || a.startsWith('hint-')) continue;
    const h = v.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    props[a.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = h ? (h[1] === 'true' ? true : h[1] === 'false' ? false : get(sc, h[1])) : v;
  }
  return renderScreen(s, key + ':' + s.name, props);
}
function renderScreen(s, key, props) {
  useCss(s);
  return render(s.template, instance(s, key, props).renderVals(), key);
}

// ---------- updating the page in place (so transitions like the card flip still play) ----------
function morph(from, to) {
  // An input method (Japanese, accents) is typing in this field: leave it be until it's done.
  if (from.hasAttribute('data-composing')) return;
  for (const a of [...from.attributes]) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
  for (const a of [...to.attributes]) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
  // Typed text stays put while you type; anything else the screen changes shows up.
  if (document.activeElement !== from) {
    if (from.tagName === 'INPUT' && to.hasAttribute('value') && from.value !== to.getAttribute('value')) from.value = to.getAttribute('value');
    if (from.tagName === 'TEXTAREA' && from.value !== to.textContent) from.value = to.textContent;
  }
  morphChildren(from, to);
}
function morphChildren(from, to) {
  const a = [...from.childNodes], b = [...to.childNodes];
  b.forEach((n, i) => {
    const o = a[i];
    if (!o) from.appendChild(document.importNode(n, true));
    else if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) from.replaceChild(document.importNode(n, true), o);
    else if (o.nodeType === 1) morph(o, n);
    else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
  });
  for (let i = a.length - 1; i >= b.length; i--) from.removeChild(a[i]);
}

// ---------- the app ----------
const app = document.getElementById('app');
const dark = matchMedia('(prefers-color-scheme: dark)');
let db = null, current = null, queued = false, navs = 0, lastPath = '';
// Props every app screen gets: the database and dark mode (from Settings: System, Light, or Dark).
const base = () => {
  if (current && current.design) return current.query.has('dark') ? { dark: true } : {};
  const look = db.settings().look;
  return { db, dark: look === 'dark' || (look === 'system' && dark.matches) };
};
function schedule() { if (!queued) { queued = true; queueMicrotask(() => { queued = false; paint(); }); } }
function paint() {
  if (!current) return;
  // Data can change which board a page shows (your first deck, a deck's first card, AI cards arriving).
  if (!current.design) {
    const r = resolve(current.path, current.query);
    if (r.redirect) return go(r.redirect, false, true);
    if (r.name !== current.name) return go(current.path + current.search, false, true);
  }
  handlers = []; refs = []; drawn = [];
  const s = loaded[current.name], props = { ...s.props, ...current.props, ...base() };
  document.body.style.background = props.dark ? '#000000' : '#FFFFFF';
  const tpl = document.createElement('template');
  tpl.innerHTML = renderScreen(s, current.key, props).replace(/href="([A-Za-z0-9]+)\.dc\.html"/g, (_, n) => 'href="' + linkFor(n) + '"');
  morphChildren(app, tpl.content);
  const fns = refs, done = drawn;
  app.querySelectorAll('[data-ref]').forEach(el => fns[el.getAttribute('data-ref')]?.(el));
  for (const c of done) {
    if (mounted.has(c)) c.componentDidUpdate?.();
    else { mounted.add(c); c.componentDidMount?.(); }
  }
}
async function go(path, push, replace) {
  const url = new URL(path, location.origin);
  if (url.pathname === '/b' && DESIGN) return screenList(push, url);
  // A review started from somewhere else is a new session (coming back from editing a card keeps it),
  // and so is going over a pile from the Session done page.
  const rvm = /^\/review(?:\/([^/]+))?$/.exec(url.pathname), pile = url.searchParams.get('pile') || '';
  if (rvm && rvm[1] !== 'done' && !/from=review/.test(lastPath) && (!/^\/review/.test(lastPath) || (pile && lastPath.startsWith('/review/done')))) db.startReview(rvm[1] || '', pile);
  const r = resolve(url.pathname, url.searchParams);
  if (r.redirect) return go(r.redirect, false, true);
  try { await load(r.name); } catch { return go('/', false, true); }
  if (push) history.pushState(null, '', url.pathname + url.search);
  else if (replace) history.replaceState(null, '', url.pathname + url.search);
  lastPath = url.pathname + url.search;
  const s = loaded[r.name];
  current = { name: r.name, path: url.pathname, search: url.search, query: url.searchParams, design: !!r.design, key: 'r' + (++navs), props: r.props || {} };
  for (const c of instances.values()) c.componentWillUnmount?.();
  instances.clear();
  app.className = s.fill ? '' : 'fixed';
  app.textContent = '';
  const deck = current.props.deckId && !db.signedOut && db.raw().decks.find(d => d.id === current.props.deckId);
  document.title = (r.name === 'Main' ? 'Today' : deck && r.name.startsWith('WebDeck') ? deck.name : s.title.replace(/^(Web|iPhone) · /, '').replace(/ page$/, '').replace(/ · .*$/, '')) + ' · Lucida';
  paint();
  scrollTo(0, 0);
}

// Every board on the canvas, grouped, with the canvas's sample data (empty decks, settings open, dark, and so on).
async function screenList(push, url) {
  if (push) history.pushState(null, '', url.pathname);
  current = null;
  const list = (await import('./screens/index.js')).default;
  const group = (label, items) => `<section><h2>${label}</h2><ul>${items.map(s => `<li><a href="/b/${encodeURIComponent(s.name)}">${esc(s.title)}</a></li>`).join('')}</ul></section>`;
  app.className = 'list';
  document.body.style.background = '#FFFFFF';
  document.title = 'All screens · Lucida';
  app.innerHTML = `<h1>All screens</h1><p>Every board on the design canvas, with its sample data. <a href="/">Back to the app</a></p>${group('Web', list.filter(s => s.w === 1440))}${group('iPhone', list.filter(s => s.w === 390))}${group('Other', list.filter(s => s.w !== 1440 && s.w !== 390))}`;
}

app.addEventListener('click', e => {
  for (let el = e.target; el && el !== app; el = el.parentElement) {
    const i = el.getAttribute && el.getAttribute('data-on-click');
    if (i != null && handlers[i]) { handlers[i](e); if (e.cancelBubble) break; }
  }
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  const url = new URL(a.href, location.href);
  // Signing in with Google or Apple leaves the app for a moment, and Privacy and Terms are pages of the site, so those
  // links load for real.
  if (url.origin !== location.origin || url.pathname.startsWith('/auth/') || /^\/(privacy|terms)$/.test(url.pathname)) return;
  e.preventDefault();
  go(url.pathname + url.search, true);
});
app.addEventListener('mousedown', e => {
  for (let el = e.target; el && el !== app; el = el.parentElement) {
    const i = el.getAttribute && el.getAttribute('data-on-mousedown');
    if (i != null && handlers[i]) { handlers[i](e); if (e.cancelBubble) break; }
  }
});
app.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-on-change]');
  if (el) handlers[el.getAttribute('data-on-change')]?.(e);
});
// onFocus, onBlur, and onKeyDown on a field, like on the canvas.
for (const [type, attr] of [['focusin', 'data-on-focus'], ['focusout', 'data-on-blur'], ['keydown', 'data-on-keydown']]) {
  app.addEventListener(type, e => {
    const el = e.target.closest && e.target.closest('[' + attr + ']');
    if (el) handlers[el.getAttribute(attr)]?.(e);
  });
}
// Keys: boards mark buttons with data-key (Space, 1-4, E, Z, and ⌘↵ to save); pressing the key presses that button.
addEventListener('keydown', e => {
  if (e.altKey || e.repeat) return;
  const t = e.target, mod = e.metaKey || e.ctrlKey;
  const key = (mod ? 'mod+' : '') + (e.key === ' ' ? 'space' : e.key.toLowerCase());
  if (!mod && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (!mod && (key === 'space' || key === 'enter') && t.closest && t.closest('button, a')) return;
  const el = [...app.querySelectorAll('[data-key]')].find(x => x.getAttribute('data-key').toLowerCase() === key && x.getClientRects().length);
  if (el) { e.preventDefault(); el.click(); }
});
addEventListener('popstate', () => go(location.pathname + location.search, false));
dark.addEventListener('change', schedule);
narrow.addEventListener('change', schedule);

db = await createDb({ onChange: schedule, go: path => go(path, true) });
go(location.pathname + location.search, false);
