// AI apps in the app (the server side is web/oauth.mjs): the apps a person signed in to Lucida (Settings → Connect AI, with
// Disconnect), the page where an app asks to connect (/oauth/authorize: what it is, Allow or Cancel), and the password
// (Settings → Account). Like the study network's answers (net.js), what a screen asks for isn't here the first time, so it shows
// its loading look and draws again when the answer comes.
export function createConnect({ changed = () => {}, go = () => {}, question = async () => false, say = () => {} } = {}) {
  const here = () => location.pathname + location.search;
  const signInFirst = () => location.assign('/sign-in?next=' + encodeURIComponent(here()));

  // The apps that signed in: asked for when a screen first wants them, and again after a minute (a person may have connected
  // one in another tab); a change (Disconnect) brings the new list with its answer.
  let apps = null, appsAt = 0, appsBusy = false;
  async function loadApps() {
    appsBusy = true;
    try { const r = await fetch('/api/oauth/apps', { cache: 'no-store' }); apps = r.ok ? (await r.json()).apps || [] : apps || []; }
    catch { apps = apps || []; }
    appsAt = Date.now(); appsBusy = false; changed();
  }
  const listApps = () => { if (!appsBusy && (apps === null || Date.now() - appsAt > 60000)) loadApps(); return apps || []; };

  // The page where an app asks to connect: the server reads the request (the address's query), and says who is asking, or that
  // it can't be trusted, or (for a request that is wrong in a way the app should hear about) where to send the person.
  let ask = null, deciding = false, decideError = '';
  function consent() {
    const key = location.search;
    if (!ask || ask.key !== key) {
      const mine = ask = { key, state: { loading: true } };
      decideError = '';
      fetch('/api/oauth/request' + key, { cache: 'no-store' })
        .then(async r => {
          if (r.status === 401) return signInFirst();
          const j = await r.json().catch(() => ({}));
          if (j.redirect) return location.replace(j.redirect);
          mine.state = r.ok ? { ok: true, ...j } : { error: j.error || 'That link didn’t work.' };
        })
        .catch(() => { mine.state = { error: 'Couldn’t reach Lucida. Check your connection and try again.' }; })
        .finally(changed);
    }
    return { ...ask.state, busy: deciding, decideError };
  }
  // Allow or Cancel: the server answers with where to send the person (back to the app, with a code or with "access_denied").
  async function connectApp(allow) {
    if (deciding) return;
    deciding = true; decideError = ''; changed();
    try {
      const r = await fetch('/api/oauth/decision', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: location.search.slice(1), allow: !!allow }) });
      if (r.status === 401) return signInFirst();
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.redirect) throw new Error(j.error || 'That didn’t work. Try again.');
      location.assign(j.redirect); // the page goes away from here; it stays busy until it does
    } catch (e) { deciding = false; decideError = e.message; changed(); }
  }
  // Signed in as the wrong person: sign out, sign in again, and come back to this same request.
  async function switchAccount() {
    const back = here();
    globalThis.__lucidaLeaving = true;   // the app's own checks would see the sign-out and send you to a plain /sign-in (db.js toSignIn)
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
    location.assign('/sign-in?next=' + encodeURIComponent(back));
  }

  // Disconnect an app (it asks first); the list comes back without it.
  async function disconnectApp(id, name) {
    if (!(await question({ title: 'Disconnect ' + (name || 'this app') + '?', line: 'It can’t use your decks until you connect it again.', action: 'Disconnect' }))) return;
    try {
      const r = await fetch('/api/oauth/disconnect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
      if (r.status === 401) return signInFirst();
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.apps) { apps = j.apps; appsAt = Date.now(); changed(); } else throw new Error(j.error || 'That didn’t work. Try again.');
    } catch (e) { say(e.message); }
  }

  // A new password for signing in (8 to 72 characters). Rejected with the server's own plain sentence.
  async function setPassword(password) {
    let r;
    try { r = await fetch('/api/auth/password/set', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) }); }
    catch { throw new Error('Couldn’t reach Lucida. Check your connection and try again.'); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { signInFirst(); throw new Error('Sign in again first.'); }
    if (!r.ok) throw new Error(j.error || 'That didn’t work. Try again in a minute.');
    return true;
  }

  return { apps: listApps, appsReady: () => apps !== null, consent, act: { connectApp, switchAccount, disconnectApp, setPassword } };
}
