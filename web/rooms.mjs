// Live rooms: the 6-digit codes games are joined with, and on this computer the relay a game's messages go through.
// Online a room is a row in Supabase's live_rooms table (supa.mjs), and the messages go over Supabase Realtime straight
// between the browsers (web/live.js): nothing here sees them. On this computer the rooms live in memory, and this
// server passes the messages along the same way (Server-Sent Events down, a POST up).
import { randomInt } from 'node:crypto';
import { cloud, rooms, realtime } from './supa.mjs';

// A code holds for three hours after its game opens (Play again renews it), then it's free for another game.
const HOLD = 3 * 3600e3;
const mine = new Map(); // code → { deck, until }
const fresh = () => String(randomInt(100000, 1000000));
// How the browsers reach each other: Supabase Realtime online (null here: the relay below).
export const rtOf = () => (cloud() || process.env.LUCIDA_LIVE_REALTIME ? realtime() : null);

// A room for a signed-in host's game (`want`: keep this code a while longer, for Play again).
export async function reserve(uid, deck, want) {
  const until = Date.now() + HOLD, name = String(deck || '').slice(0, 120);
  const ok = /^\d{6}$/.test(String(want || ''));
  if (cloud()) {
    if (ok && await rooms.renew(want, uid, until)) return want;
    await rooms.sweep().catch(() => {});
    if (ok && await rooms.add(want, uid, name, until)) return want;
    for (let i = 0; i < 12; i++) { const code = fresh(); if (await rooms.add(code, uid, name, until)) return code; }
    throw new Error('Couldn’t open a room. Try again.');
  }
  for (const [c, r] of mine) if (r.until < Date.now()) mine.delete(c);
  if (ok && (!mine.has(want) || mine.get(want).host === uid)) { mine.set(want, { deck: name, until, host: uid }); return want; }
  for (;;) { const code = fresh(); if (!mine.has(code)) { mine.set(code, { deck: name, until, host: uid }); return code; } }
}
// A room players can join: its deck's name, or null.
export async function lookup(code) {
  if (cloud()) return rooms.get(code);
  const r = mine.get(code);
  return r && r.until > Date.now() ? { deck: r.deck } : null;
}
export async function release(uid, code) {
  if (cloud()) return rooms.remove(code, uid);
  const r = mine.get(code);
  if (r && r.host === uid) mine.delete(code);
}

// ---------- the relay (this computer only) ----------
// Everyone in a room holds one stream open. The host's messages go to every player, a player's go to the host, and
// everyone hears who's connected (like Realtime's presence).
const lines = new Map(); // code → Set of { res, role, key }
const out = (c, msg) => { try { c.res.write('data: ' + JSON.stringify(msg) + '\n\n'); } catch { /* it's closing */ } };
function presence(code) {
  const set = lines.get(code);
  if (!set) return;
  const keys = [...new Set([...set].map(c => c.key))];
  for (const c of set) out(c, { presence: keys });
}
export function listen(req, res, code, role, key) {
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 1000\n\n');
  const c = { res, role, key };
  if (!lines.has(code)) lines.set(code, new Set());
  lines.get(code).add(c);
  presence(code);
  // A comment now and then keeps the stream from looking idle.
  const keep = setInterval(() => { try { res.write(': still here\n\n'); } catch { /* closing */ } }, 15000);
  req.on('close', () => {
    clearInterval(keep);
    const set = lines.get(code);
    if (!set) return;
    set.delete(c);
    if (set.size) presence(code); else lines.delete(code);
  });
}
export function pass(code, role, event, payload) {
  for (const c of lines.get(code) || []) if (c.role !== role) out(c, { event, payload });
}
