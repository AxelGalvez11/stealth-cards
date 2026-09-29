// Live: a deck played with friends, like a quiz show. The host's computer shows each question on the big screen;
// friends join on their phones with the room's 6-digit code and a name (no account), tap an answer, and get points for
// right and fast answers. The host's page runs the game: it asks the questions, keeps the time, and adds up the points.
// A phone only says what was tapped, and the host tells every phone what to show.
// The messages travel over Supabase Realtime online (a WebSocket, browser to browser) and through this computer's
// server otherwise (web/rooms.mjs). connect() hides which, so the game plays the same both ways.
import { qrSrc } from './qr.js';

const MAX_PLAYERS = 60, NAME_MAX = 20;
// A phone waits this long for a host who left (a reload is back in a few seconds) before it says the game ended.
const HOST_GONE = 30000;
const HOST_KEY = 'lucida.live.host', DEVICE_KEY = 'lucida.live.device', ROOM_KEY = 'lucida.live.room', NAME_KEY = 'lucida.live.name';
const store = kind => { try { return kind === 'session' ? sessionStorage : localStorage; } catch { return null; } };
const read = (s, k) => { try { return s ? JSON.parse(s.getItem(k) || 'null') : null; } catch { return null; } };
const write = (s, k, v) => { try { if (s) { if (v == null) s.removeItem(k); else s.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } } catch { /* a private window */ } };
const rid = p => p + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
const later = (fn, ms) => setTimeout(fn, ms);
export const cleanName = s => String(s || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
// Everyone sees the same order: most points, then most right, then who joined first.
export const standings = players => players.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score || b.p.right - a.p.right || a.i - b.i).map(x => x.p);
// Points for a right answer: 500, and up to 500 more the faster it came (rounded to tens).
export const pointsFor = (leftMs, durMs) => Math.round((500 + 500 * Math.max(0, Math.min(1, leftMs / durMs))) / 10) * 10;

async function api(method, url, body) {
  const r = await fetch(url, { method, cache: 'no-store', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong. Try again.'), { status: r.status });
  return j;
}
// A room's name and how to reach it (null when there's no such game).
const lookup = code => api('GET', '/api/live/' + code).catch(e => { if (e.status === 404) return null; throw e; });

// ---------- the line between the host and the phones ----------
// connect(code, { host, key }, rt, on): the host hears the phones and speaks to all of them; a phone hears the host and
// speaks to it. `key` names this device in the room (the host is "host"). on.open() runs each time the line is up
// (again after a drop, so each side says where it's at), on.presence(keys) with the keys connected now, on.message
// (event, payload), and on.status('reconnecting' or '').
export function connect(code, me, rt, on) { return rt ? realtime(code, me, rt, on) : relay(code, me, on); }

// Supabase Realtime, spoken directly (Phoenix channels, protocol 1.0.0), so there's no package to load. The host joins
// the room's channel (it speaks there, and every phone's presence shows there) and the room's inbox; phones join the
// room's channel and send to the inbox through Realtime's REST API, so no phone gets everyone else's taps.
function realtime(code, me, rt, on) {
  const room = 'live-' + code, inbox = room + '-in', topics = me.host ? [room, inbox] : [room];
  let ws = null, ref = 0, beat = null, again = null, tries = 0, closed = false, ready = 0, heard = 0, joins = {}, roomRef = null;
  const metas = new Map();
  const keys = () => [...metas].filter(([, s]) => s.size).map(([k]) => k);
  const push = (topic, event, payload, joinRef) => {
    if (!ws || ws.readyState !== 1) return false;
    ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref), join_ref: joinRef }));
    return true;
  };
  const presence = (add, gone) => {
    for (const [k, v] of Object.entries(add || {})) { const s = metas.get(k) || new Set(); for (const x of v.metas || []) s.add(x.phx_ref); metas.set(k, s); }
    for (const [k, v] of Object.entries(gone || {})) { const s = metas.get(k); if (s) for (const x of v.metas || []) s.delete(x.phx_ref); }
    on.presence(keys());
  };
  const drop = () => {
    clearInterval(beat); ready = 0; roomRef = null;
    if (ws) { const w = ws; ws = null; w.onopen = w.onclose = w.onerror = w.onmessage = null; try { w.close(); } catch { /* already closed */ } }
  };
  const retry = () => {
    drop();
    if (closed) return;
    on.status('reconnecting');
    clearTimeout(again);
    again = later(open, Math.min(8000, 400 * 2 ** tries++));
  };
  function open() {
    if (closed) return;
    drop();
    let sock;
    try { sock = new WebSocket(rt.ws + '?apikey=' + encodeURIComponent(rt.key) + '&vsn=1.0.0'); } catch { return retry(); }
    ws = sock; heard = Date.now(); metas.clear();
    const lost = () => { if (ws === sock) retry(); };
    sock.onopen = () => {
      joins = {};
      for (const t of topics) {
        joins[String(ref + 1)] = t;
        push('realtime:' + t, 'phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: t === room ? me.key : '', enabled: t === room }, private: false } }, String(ref + 1));
      }
    };
    sock.onmessage = e => {
      heard = Date.now();
      let d; try { d = JSON.parse(e.data); } catch { return; }
      const topic = String(d.topic || '').replace(/^realtime:/, '');
      if (d.event === 'phx_reply' && joins[d.ref]) {
        if (!d.payload || d.payload.status !== 'ok') return lost();
        delete joins[d.ref];
        if (topic === room) { roomRef = d.ref; push('realtime:' + room, 'presence', { type: 'presence', event: 'track', payload: { at: Date.now() } }, roomRef); }
        if (++ready === topics.length) { tries = 0; on.status(''); on.open(); }
        return;
      }
      if (d.event === 'phx_error' || d.event === 'phx_close') return lost();
      if (topic !== room && topic !== inbox) return;
      if (d.event === 'presence_state' && topic === room) { metas.clear(); return presence(d.payload, null); }
      if (d.event === 'presence_diff' && topic === room) return presence(d.payload && d.payload.joins, d.payload && d.payload.leaves);
      if (d.event === 'broadcast' && d.payload && topic === (me.host ? inbox : room)) on.message(d.payload.event, d.payload.payload || {});
    };
    sock.onclose = sock.onerror = lost;
    // Realtime closes a quiet line, so it hears from us every 25 seconds; a line that hasn't answered in a minute is dead.
    beat = setInterval(() => { if (Date.now() - heard > 60000) return lost(); push('phoenix', 'heartbeat', {}, null); }, 25000);
  }
  // A phone that slept, or came back online, reconnects at once.
  const wake = () => { if (closed) return; if (!ws || ws.readyState > 1 || Date.now() - heard > 40000) { tries = 0; open(); } };
  const seen = () => { if (typeof document !== 'undefined' && !document.hidden) wake(); };
  if (typeof addEventListener === 'function') addEventListener('online', wake);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', seen);
  open();
  return {
    send(event, payload) {
      if (me.host) return push('realtime:' + room, 'broadcast', { type: 'broadcast', event, payload }, roomRef);
      const body = JSON.stringify({ messages: [{ topic: inbox, event, payload }] });
      // An older key is a JWT, which Realtime also wants as the bearer.
      const headers = { apikey: rt.key, 'content-type': 'application/json', ...(rt.key.startsWith('eyJ') ? { authorization: 'Bearer ' + rt.key } : {}) };
      const post = n => fetch(rt.rest, { method: 'POST', headers, body })
        .then(r => { if (r.status >= 500) throw new Error('Realtime ' + r.status); }).catch(() => { if (n && !closed) later(() => post(n - 1), 700); });
      post(2);
      return true;
    },
    close() {
      closed = true; clearTimeout(again); drop();
      if (typeof removeEventListener === 'function') removeEventListener('online', wake);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', seen);
    }
  };
}
// On this computer: the local server passes messages along (web/rooms.mjs), streaming them down with Server-Sent Events.
function relay(code, me, on) {
  const url = '/api/live/' + code, role = me.host ? 'host' : 'player';
  const es = new EventSource(url + '/events?role=' + role + '&key=' + encodeURIComponent(me.key));
  es.onopen = () => { on.status(''); on.open(); };
  es.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch { return; } if (Array.isArray(d.presence)) on.presence(d.presence); else if (d.event) on.message(d.event, d.payload || {}); };
  // The browser tries again by itself.
  es.onerror = () => on.status('reconnecting');
  return {
    send: (event, payload) => { fetch(url + '/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, key: me.key, event, payload }) }).catch(() => {}); return true; },
    close: () => es.close()
  };
}

// ---------- the host: the game itself ----------
// The game is kept in this tab (sessionStorage), so a reload picks up where it was, even mid-question. Phases: the
// lobby (people join), a question, its answer, the leaderboard, and the end (the podium). `since` is the first question
// a player can answer (someone who joins mid-game waits for the next one); `keys` are the phones that have been them.
function createHost({ onChange, go }) {
  const ss = store('session');
  let G = read(ss, HOST_KEY);
  if (!G || G.v !== 1 || !/^\d{6}$/.test(G.code)) G = null;
  let link = null, here = new Set(), status = '', tick = null, soon = null, shown = '';
  const ring = {}, qrs = {};
  const save = () => write(ss, HOST_KEY, G);
  const origin = () => (typeof location !== 'undefined' ? location.origin : '');
  // The big screen says where to go: lucida.cards/join online (it opens the app), this address elsewhere.
  const joinText = () => { const h = typeof location !== 'undefined' ? location.host : ''; return h === 'app.lucida.cards' ? 'lucida.cards/join' : h + '/join'; };
  const byKey = key => G.players.find(p => p.keys.includes(key));
  const present = p => p.keys.some(k => here.has(k));
  const playing = () => G.players.filter(p => p.since <= G.qi);
  // Everyone still here has answered (so the answer shows now, instead of when the time is up).
  const everyone = () => { const on = playing().filter(present); return on.length > 0 && on.every(p => G.answers[p.id]); };

  // What every phone is told: the phase, the question (without its answer until it's shown), and everyone's points.
  function state() {
    const q = G.qs[G.qi], asking = G.phase === 'question', after = G.phase === 'reveal' || G.phase === 'board';
    return { v: 1, game: G.game, phase: G.phase, n: G.qi + 1, of: G.qs.length, time: G.time,
      deck: { name: G.deck.name, seed: G.deck.seed, style: G.deck.style, round: G.deck.round, bg: { kind: (G.deck.bg && G.deck.bg.kind) || 'deck' } },
      q: q && (asking || after) ? { text: q.text, options: q.options } : null, right: q && after ? q.right : null,
      left: asking ? Math.max(0, G.deadline - Date.now()) : 0, answered: asking ? Object.keys(G.answers) : [],
      players: G.players.map(p => ({ id: p.id, name: p.name, color: p.color, score: p.score, streak: p.streak, right: p.right, gained: p.gained, pick: p.pick, since: p.since })) };
  }
  const tell = () => { clearTimeout(soon); soon = null; if (link && G) link.send('state', state()); };
  // Joins come in bunches; one message covers a bunch.
  const tellSoon = () => { if (!soon) soon = later(tell, 250); };
  const changed = () => onChange();
  const run = () => {
    if (G && G.phase === 'question') { if (!tick) tick = setInterval(step, 200); }
    else { clearInterval(tick); tick = null; }
  };
  function step() {
    if (!G || G.phase !== 'question') return run();
    const left = G.deadline - Date.now();
    if (left <= 0) return reveal();
    const s = String(Math.ceil(left / 1000));
    if (s !== shown) { shown = s; changed(); }
  }
  function attach() {
    if (link) link.close();
    here = new Set();
    link = connect(G.code, { host: true, key: 'host' }, G.rt, {
      open: () => { status = ''; tell(); changed(); },
      status: s => { if (s !== status) { status = s; changed(); } },
      presence: keys => { here = new Set(keys); changed(); if (G && G.phase === 'question' && everyone()) reveal(); },
      message: (event, m) => { if (!G || !m || typeof m !== 'object') return; if (event === 'hello') hello(m); else if (event === 'answer') answer(m); }
    });
    run();
  }
  // A phone asks to join (or rejoin): the same phone, or the same name on a phone that's gone, gets its points back;
  // a name someone here is using is turned away.
  function hello(m) {
    const key = String(m.key || ''), name = cleanName(m.name);
    if (!/^[\w-]{4,40}$/.test(key) || !name) return;
    const same = n => G.players.find(x => x.name.toLowerCase() === n.toLowerCase());
    let p = byKey(key);
    if (!p) {
      const q = same(name);
      if (q && present(q)) return link.send('reject', { to: key, why: 'taken' });
      if (q) { q.keys.push(key); p = q; }
    }
    if (!p) {
      if (G.phase === 'end') return link.send('reject', { to: key, why: 'over' });
      if (G.players.length >= MAX_PLAYERS) return link.send('reject', { to: key, why: 'full' });
      p = { id: key, name, color: G.players.length % 5, keys: [key], score: 0, streak: 0, right: 0, gained: 0, pick: -1, since: G.phase === 'lobby' ? 0 : G.qi + 1 };
      G.players.push(p);
    } else if (p.name !== name && !same(name)) p.name = name;
    save(); changed();
    link.send('welcome', { to: key, player: p.id, name: p.name });
    tellSoon();
  }
  function answer(m) {
    const p = byKey(String(m.key || '')), q = G.qs[G.qi], pick = Math.floor(+m.pick);
    if (!p || G.phase !== 'question' || m.game !== G.game || m.n !== G.qi + 1 || p.since > G.qi || G.answers[p.id] || !(pick >= 0 && pick < q.options.length)) return;
    G.answers[p.id] = { pick, at: Date.now() };
    save(); changed();
    if (everyone()) reveal();
  }
  function ask(i) {
    // Where everyone stood before this question, for the leaderboard's arrows.
    G.prev = i ? Object.fromEntries(standings(G.players).map((p, r) => [p.id, r])) : null;
    Object.assign(G, { qi: i, phase: 'question', start: Date.now(), deadline: Date.now() + G.time * 1000, answers: {}, counts: null });
    shown = ''; save(); tell(); changed(); run();
  }
  function reveal() {
    const q = G.qs[G.qi], dur = G.time * 1000;
    G.counts = q.options.map(() => 0);
    for (const p of G.players) {
      const a = G.answers[p.id];
      p.pick = -1; p.gained = 0;
      if (p.since > G.qi) continue;
      if (!a) { p.streak = 0; continue; }
      const ok = a.pick === q.right;
      G.counts[a.pick]++;
      p.pick = a.pick; p.gained = ok ? pointsFor(G.deadline - a.at, dur) : 0;
      p.score += p.gained; p.streak = ok ? p.streak + 1 : 0; p.right += ok ? 1 : 0;
    }
    G.phase = 'reveal'; save(); tell(); changed(); run();
  }
  function close(stay) {
    if (!G) return;
    const was = G;
    if (link) { link.send('closed', { game: was.game }); link.close(); link = null; }
    api('DELETE', '/api/live/' + was.code).catch(() => {});
    G = null; save(); run(); clearTimeout(soon); soon = null;
    if (!stay) go('/deck/' + was.deckId);
    else changed();
  }
  if (G) attach();

  return {
    // The big screen's view (null when there's no game here).
    view() {
      if (!G) return null;
      const q = G.qs[G.qi], now = Date.now(), asking = G.phase === 'question', left = asking ? Math.max(0, G.deadline - now) : 0, on = playing();
      // The timer ring draws itself from the moment the question started (also after a reload), so its delay is set
      // once per question.
      const k = G.game + ':' + G.qi;
      if (asking && ring[k] == null) ring[k] = -Math.round(Math.min(G.time, (now - G.start) / 1000) * 100) / 100;
      return {
        code: G.code, codeShown: G.code.slice(0, 3) + ' ' + G.code.slice(3), deckId: G.deckId, deck: G.deck, phase: G.phase, status,
        joinText: joinText(), qr: qrs[G.code] || (qrs[G.code] = qrSrc(origin() + '/join/' + G.code)),
        people: G.players.map(p => ({ id: p.id, name: p.name, color: p.color })), here: G.players.filter(present).length,
        n: G.qi + 1, of: G.qs.length,
        q: q ? { text: q.text, options: q.options, right: asking ? null : q.right, counts: asking ? null : G.counts, image: q.image || '', occ: q.occ || null } : null,
        answered: asking ? Object.keys(G.answers).length : 0, playing: on.length, got: q && !asking ? on.filter(p => p.pick === q.right).length : 0,
        timer: { left: Math.ceil(left / 1000), dur: G.time, delay: ring[k] || 0, frac: asking ? Math.round((1 - left / (G.time * 1000)) * 1000) / 1000 : 1 },
        board: standings(G.players).map((p, r) => ({ id: p.id, name: p.name, color: p.color, score: p.score, move: G.prev && G.prev[p.id] != null ? G.prev[p.id] - r : null })),
        last: G.qi >= G.qs.length - 1
      };
    },
    game: () => G,
    // A new room for a deck: its code comes from the server, then the lobby opens. An open game closes first.
    async open({ deckId, deck, qs, set, count, time }) {
      const r = await api('POST', '/api/live', { deck: deck.name });
      if (G) close(true);
      G = { v: 1, code: r.code, rt: r.rt || null, deckId, deck, set, count, time, game: rid('g'), qs, phase: 'lobby', qi: -1, start: 0, deadline: 0, players: [], answers: {}, counts: null, prev: null };
      save(); attach(); changed(); go('/live/' + G.code);
    },
    start() { if (G && G.phase === 'lobby' && G.players.length) ask(0); },
    // On from the answer to the leaderboard (or the podium after the last question), and on to the next question.
    next() {
      if (!G) return;
      if (G.phase === 'question') return reveal();
      if (G.phase === 'reveal') { G.phase = G.qi >= G.qs.length - 1 ? 'end' : 'board'; save(); tell(); changed(); return; }
      if (G.phase === 'board') ask(G.qi + 1);
    },
    // Play again: the same room and people, new questions, everyone back to 0.
    again(qs) {
      if (!G || !qs.length) return;
      Object.assign(G, { qs, game: rid('g'), phase: 'lobby', qi: -1, answers: {}, counts: null, prev: null });
      for (const p of G.players) Object.assign(p, { score: 0, streak: 0, right: 0, gained: 0, pick: -1, since: 0 });
      save(); tell(); changed();
      // The room's code stays good for a few more hours.
      api('POST', '/api/live', { deck: G.deck.name, code: G.code }).catch(() => {});
    },
    // Done: the room closes (phones still on the final leaderboard keep it) and it's back to the deck.
    close: () => close(false)
  };
}

// ---------- a player's phone ----------
// This phone has one id for Live (localStorage), so the host knows it again after a reload, and it remembers the game
// it's in and its name. It follows the host's messages: `S` is the last state the host sent.
function createPlayer({ onChange, go, signedOut }) {
  const ls = store('local');
  let key = ls && ls.getItem(DEVICE_KEY);
  if (!/^d[a-z0-9]{8,30}$/.test(key || '')) { key = rid('d'); write(ls, DEVICE_KEY, key); }
  const saved = read(ls, ROOM_KEY) || {};
  const form = { code: '', name: cleanName(saved.name || (ls && ls.getItem(NAME_KEY)) || ''), error: '', busy: false };
  let where = '', code = '', link = null, S = null, got = 0, me = null, pick = null, ended = false, gone = null, waiting = null, tick = null, shown = '', typed = false, checking = '';
  const bars = {};
  const changed = () => onChange();
  const remember = () => write(ls, ROOM_KEY, code && me ? { code, name: form.name, player: me, pick } : null);
  const say = event => link && link.send(event, event === 'hello' ? { key, name: form.name } : { key, game: pick.game, n: pick.n, pick: pick.i });
  const mine = () => (S && me ? S.players.find(p => p.id === me) : null);
  const deadline = () => got + ((S && S.left) || 0) - 300;
  const run = () => {
    if (S && S.phase === 'question' && !ended) { if (!tick) tick = setInterval(step, 250); }
    else { clearInterval(tick); tick = null; }
  };
  function step() {
    const s = String(Math.max(0, Math.ceil((deadline() - Date.now()) / 1000)));
    if (s !== shown) { shown = s; changed(); }
    if (s === '0') { clearInterval(tick); tick = null; }
  }
  const stopWaiting = () => { clearInterval(waiting); waiting = null; };
  function end() {
    ended = true; stopWaiting(); clearTimeout(gone); gone = null;
    if (link) { link.close(); link = null; }
    write(ls, ROOM_KEY, null); run(); changed();
  }
  function connectTo(c, rt) {
    if (link) link.close();
    code = c; S = null; ended = false;
    link = connect(c, { host: false, key }, rt, {
      open: () => say('hello'),
      status: () => {},
      presence: keys => {
        if (keys.includes('host')) { clearTimeout(gone); gone = null; if (!mine()) say('hello'); }
        else if (!gone && !ended) gone = later(() => { gone = null; if (!S || S.phase !== 'end') end(); }, HOST_GONE);
      },
      message: (event, m) => {
        if (!m || typeof m !== 'object' || ended) return;
        if (event === 'welcome' && m.to === key) {
          me = String(m.player); form.name = cleanName(m.name) || form.name; form.busy = false; form.error = '';
          stopWaiting(); remember(); write(ls, NAME_KEY, form.name);
          if (where === 'join') go('/play/' + code); else changed();
        } else if (event === 'reject' && m.to === key) {
          form.busy = false; stopWaiting();
          form.error = { taken: 'Someone here has that name. Try another.', over: 'This game is over.', full: 'This game is full.' }[m.why] || 'That didn’t work. Try again.';
          const c = code; me = null; code = ''; if (link) { link.close(); link = null; }
          write(ls, ROOM_KEY, null);
          if (where === 'play') go('/join/' + c); else changed();
        } else if (event === 'state') {
          if (typeof m.phase !== 'string' || !Array.isArray(m.players) || !Array.isArray(m.answered)) return;
          S = m; got = Date.now(); shown = '';
          if (pick && pick.game !== S.game) { pick = null; remember(); }
          // The host doesn't know this phone (it started over): join again.
          if (!mine()) say('hello');
          // An answer the host never got (its line dropped): send it again.
          else if (S.phase === 'question' && pick && pick.n === S.n && !S.answered.includes(me)) say('answer');
          run(); changed();
        } else if (event === 'closed' && (!S || S.phase !== 'end')) end();
      }
    });
  }
  // Back in a game after a reload (or after scanning the code again): this phone's place in it.
  function resume(c) {
    if (code === c && (link || ended)) return true;
    const s = read(ls, ROOM_KEY);
    if (!s || s.code !== c) return false;
    code = c; me = s.player; form.name = cleanName(s.name) || form.name; form.code = c; pick = s.pick || null; ended = false; S = null;
    lookup(c).then(r => { if (code !== c || link) return; if (!r) return end(); connectTo(c, r.rt); }, () => later(() => { if (code === c && !link && !ended) { code = ''; resume(c); } }, 3000));
    return true;
  }
  // Six digits typed (or opened from the QR code): is there such a game?
  function check(c) {
    if (checking === c) return;
    checking = c;
    lookup(c).then(r => { if (form.code === c && !r) { form.error = 'No game with that code'; changed(); } }, () => {});
  }
  const view = () => {
    const p = mine(), rows = S ? standings(S.players) : [], left = S && S.phase === 'question' ? Math.max(0, deadline() - Date.now()) : 0, dur = (S && S.time) || 20;
    const phase = ended ? 'ended' : !S || !p || S.phase === 'lobby' ? 'waiting' : S.phase === 'end' ? 'final' : p.since > S.n - 1 ? 'late' : S.phase === 'question' ? 'answer' : 'result';
    const k = S ? S.game + ':' + S.n : '';
    if (phase === 'answer' && bars[k] == null) bars[k] = -Math.round(Math.max(0, dur - left / 1000) * 100) / 100;
    // A deck's own photo can't show on other people's phones, so they get its colors.
    const deck = S ? { ...S.deck, bg: S.deck && S.deck.bg && S.deck.bg.kind !== 'photo' ? S.deck.bg : { kind: 'deck', image: null } } : { name: '', seed: 'Lucida', style: 'mix', round: 0, bg: { kind: 'deck', image: null } };
    const opts = S && S.q ? S.q.options : [];
    return {
      form: { ...form }, phase, deck, n: S ? S.n : 0, of: S ? S.of : 0, promo: !!signedOut,
      me: p ? { id: p.id, name: p.name, color: p.color, score: p.score, streak: p.streak, rank: rows.indexOf(p) + 1, right: p.right, played: Math.max(0, S.of - p.since) } : { id: me || '', name: form.name, color: 0, score: 0, streak: 0, rank: 0, right: 0, played: 0 },
      q: { text: S && S.q ? S.q.text : '', options: opts, right: S ? S.right : null },
      pick: pick && S && pick.game === S.game && pick.n === S.n ? pick.i : null,
      timer: { left: Math.ceil(left / 1000), dur, delay: bars[k] || 0, frac: phase === 'answer' ? Math.round(left / (dur * 1000) * 1000) / 1000 : 0 },
      result: p && S.right != null ? { ok: p.pick === S.right, timeUp: p.pick < 0, pick: p.pick >= 0 ? opts[p.pick] || '' : '', answer: opts[S.right] || '', gained: p.gained, streak: p.streak }
        : { ok: false, timeUp: true, pick: '', answer: '', gained: 0, streak: 0 },
      standings: rows.map(x => ({ id: x.id, name: x.name, color: x.color, score: x.score }))
    };
  };
  return {
    // The page a phone is on: the join page (with the code from the QR code), or a game's. For a game this phone isn't
    // in, it's null (the join page comes first).
    at(kind, c) {
      where = kind;
      if (kind === 'join') { if (c && !typed && form.code !== c) { form.code = c; form.error = ''; check(c); } return view(); }
      return resume(c) ? view() : null;
    },
    view,
    setCode(v) {
      const c = String(v || '').replace(/\D/g, '').slice(0, 6);
      typed = true;
      if (c === form.code) return;
      form.code = c; form.error = '';
      if (c.length === 6) check(c); else checking = '';
      changed();
    },
    setName(v) { form.name = String(v || '').slice(0, NAME_MAX); if (form.error && !form.busy) form.error = ''; changed(); },
    async join() {
      if (form.busy) return;
      const c = form.code, name = cleanName(form.name);
      if (!/^\d{6}$/.test(c)) { form.error = 'Type the 6-digit code.'; return changed(); }
      if (!name) { form.error = 'Type your name.'; return changed(); }
      form.name = name; form.busy = true; form.error = ''; changed();
      let r;
      try { r = await lookup(c); } catch { form.busy = false; form.error = 'Couldn’t reach Lucida. Check your connection.'; return changed(); }
      if (!r) { form.busy = false; form.error = 'No game with that code'; return changed(); }
      if (code !== c || !link || ended) { me = null; pick = null; connectTo(c, r.rt); } else say('hello');
      // The host should answer within a few seconds; ask again meanwhile, then say so.
      stopWaiting();
      let tries = 0;
      waiting = setInterval(() => {
        if (me && mine()) return stopWaiting();
        if (++tries < 5) return say('hello');
        stopWaiting(); form.busy = false; form.error = 'The game isn’t answering. Try again.'; changed();
      }, 2500);
    },
    answer(i) {
      const p = mine();
      if (!p || S.phase !== 'question' || p.since > S.n - 1 || (pick && pick.game === S.game && pick.n === S.n) || Date.now() > deadline() || !(i >= 0 && i < S.q.options.length)) return;
      pick = { game: S.game, n: S.n, i };
      remember(); say('answer'); changed();
    },
    // Joining another game: back to an empty form.
    reset() {
      if (link) { link.close(); link = null; }
      stopWaiting(); clearTimeout(gone); gone = null;
      code = ''; me = null; S = null; pick = null; ended = false; typed = false; checking = '';
      Object.assign(form, { code: '', error: '', busy: false });
      write(ls, ROOM_KEY, null); run();
    }
  };
}

// Signed in, this page can host; anyone can play.
export function createLive({ onChange, go, signedOut = false }) {
  return { host: signedOut ? null : createHost({ onChange, go }), player: createPlayer({ onChange, go, signedOut }) };
}
