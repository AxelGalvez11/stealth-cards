// The study network in the app (the server side is web/social.mjs): shared decks, profiles, Discover, search, a deck's
// History, suggestions, and news. Screens ask for what they show while they draw; the first time, the answer isn't
// here yet (undefined), so the screen shows its loading look, and it draws again when the answer arrives. Answers are
// kept for a little while, and anything you change drops them so the next look is fresh.
const enc = encodeURIComponent;
export function createNet({ accept = () => {}, changed = () => {}, signedOut = false, go = () => {} } = {}) {
  const cache = new Map();
  function get(url, ttl = 20000) {
    const e = cache.get(url);
    if (e && (e.busy || Date.now() - e.at < ttl)) return e.data;
    const entry = { data: e ? e.data : undefined, at: 0, busy: true };
    cache.set(url, entry);
    fetch(url, { cache: 'no-store' })
      .then(async r => { const j = await r.json().catch(() => null); entry.data = r.ok ? j : { missing: true, status: r.status, error: (j && j.error) || '' }; })
      .catch(() => { if (entry.data === undefined) entry.data = { offline: true }; })
      .finally(() => { entry.busy = false; entry.at = Date.now(); changed(); });
    return entry.data;
  }
  const drop = () => { cache.clear(); };
  // A change (sharing, studying, following…). Signed out, it goes to signing in first, then back to this page.
  async function act(type, payload = {}) {
    if (signedOut) { go('/sign-in?next=' + enc(location.pathname)); return null; }
    const r = await fetch('/api/social', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, ...payload }) });
    if (r.status === 401) { location.assign('/sign-in?next=' + enc(location.pathname)); throw new Error('Signed out'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong. Try again.'), { status: r.status });
    if (j.state) accept(j.state);
    drop(); changed();
    return j.result;
  }
  return {
    signedOut,
    deck: (h, s) => get('/api/public/deck?h=' + enc(h || '') + '&s=' + enc(s || '')),
    deckById: id => get('/api/public/deck?id=' + enc(id || '')),
    profile: h => get('/api/public/profile?h=' + enc(h || '')),
    discover: tag => get('/api/public/discover?tag=' + enc(tag || '')),
    search: q => (String(q || '').trim() ? get('/api/public/search?q=' + enc(String(q).trim()), 60000) : { q: '', decks: [], people: [] }),
    history: id => get('/api/public/history?id=' + enc(id || '')),
    activity: () => (signedOut ? { unread: 0, items: [] } : get('/api/social/activity', 15000)),
    suggestions: id => (signedOut ? [] : get('/api/social/suggestions?id=' + enc(id || ''))),
    inbox: () => (signedOut ? [] : get('/api/social/suggestions')),
    sent: () => (signedOut ? [] : get('/api/social/suggestions?mine=1')),
    mine: () => (signedOut ? null : get('/api/social/mine', 30000)),
    act, drop
  };
}
