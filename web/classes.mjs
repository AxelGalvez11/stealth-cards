// Classes (the owner's note: "Schools / organizations"): a study group that a teacher can also run. Anyone signed in
// makes one (a name, and a school if they like). It gets a 6-letter code and an invite link (lucida.cards/class/CODE),
// and joining is one tap. The owner picks helpers (co-teachers) from the people in it; the owner and helpers add their
// own decks to it and assign them (learn every card, or review what's due each day, by a date). Everyone in a class
// studies its decks like any shared deck (social.mjs: the same Study, suggestions, History, and updates); a deck added
// to a class and nowhere else is seen only by the class (visibility 'class').
// Everything else in Lucida follows "the cards are shared, your progress never is". A class is the one place progress
// can be shared, and only if each member turns it on: then the class's owner and helpers see how far that member is on
// each assignment and when they last studied (web/progress.js), never their answers.
// Also here: asking to be verified as a teacher or a school, reporting a deck, a profile, or a suggestion, and the admin
// page that decides both (only for the emails in LUCIDA_ADMINS; on this computer, the made-up person "admin").
// The tables are in supabase/classes.sql, and supabase/hardening.sql for a deck's `hidden` (localrest.mjs on this computer).
import { createHash, randomInt } from 'node:crypto';
import { rest, val, inList, cloud } from './supa.mjs';
import { state, saved } from './store.mjs';
import { socialId, ensureProfile, profileOf, profileByHandle, shareDeck, sync as syncShared, inLibraryOf, canSee, withOwners, LIST } from './social.mjs';
import { progressOf } from './progress.js';

const DAY = 86400000;
const nowIso = () => new Date().toISOString();
const clean = (x, n = 5000) => String(x ?? '').slice(0, n);
const oneLine = (x, n) => clean(x, n * 2).replace(/\s+/g, ' ').trim().slice(0, n);
const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const hash = x => createHash('sha1').update(String(x)).digest('hex').slice(0, 14);
const err = (msg, status = 400) => Object.assign(new Error(msg), { status });
const plural = (n, w, ws = w + 's') => n + ' ' + (n === 1 ? w : ws);
// What pages get of a person: never their account id.
const face = p => (p ? { handle: p.handle, name: p.name, avatar: p.avatar || null, color: p.color || 0, verified: p.verified || '', kind: p.kind || 'person' } : null);
const official = p => !!p && (p.verified === 'school' || p.kind === 'school');
const profilesOf = async ids => ([...new Set(ids.filter(Boolean))].length ? rest('/profiles?id=in.' + inList([...new Set(ids.filter(Boolean))]) + '&select=*') : []);

// ---------- codes ----------
// Six capital letters, without I, L, and O (they read like 1 and 0), so a code said out loud or copied off a board
// comes out right: BIOKTZ. The invite link is /class/<code>; Live mode's rooms use six digits (/join/482913).
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_RE = /^[A-Z]{6}$/;
const codeOf = c => String(c || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
const codeFor = (seed, i) => { const h = createHash('sha256').update(seed + ':' + i).digest(); return Array.from({ length: 6 }, (_, j) => LETTERS[h[j] % LETTERS.length]).join(''); };

// ---------- rows ----------
async function classById(id) { const r = await rest('/classes?id=eq.' + val(id) + '&select=*'); return r[0] || null; }
async function classByCode(code) { const c = codeOf(code); if (!CODE_RE.test(c)) return null; const r = await rest('/classes?code=eq.' + val(c) + '&select=*'); return r[0] || null; }
async function memberOf(classId, uid) { const r = await rest('/class_members?class_id=eq.' + val(classId) + '&user_id=eq.' + val(uid) + '&select=*'); return r[0] || null; }
// The class and your place in it, if your role is one of `roles`.
async function roleIn(classId, uid, roles = ['owner', 'helper', 'member'], no = 'Only the class’s owner and helpers can do that.') {
  const k = await classById(classId);
  if (!k) throw err('That class is gone.', 404);
  const m = await memberOf(k.id, uid);
  if (!m) throw err('You’re not in this class.', 403);
  if (!roles.includes(m.role)) throw err(no, 403);
  return { k, m };
}
const STAFF = ['owner', 'helper'];
// A deck that's only in classes stops being seen by anyone but its owner once it's in none (private again).
async function privateIfNoClass(sharedId) {
  if ((await rest('/class_decks?shared_id=eq.' + val(sharedId) + '&select=class_id&limit=1')).length) return;
  await rest('/shared_decks?id=eq.' + val(sharedId) + '&visibility=eq.class', { method: 'PATCH', body: { visibility: 'private', updated_at: nowIso() } });
}
async function dropAssignments(ids) {
  if (!ids.length) return;
  await rest('/class_progress?assignment_id=in.' + inList(ids), { method: 'DELETE' });
  await rest('/assignments?id=in.' + inList(ids), { method: 'DELETE' });
}

// ---------- your classes, in your library ----------
// The classes you're in live in your library too (like your profile's handle), with their assignments, so the Library's
// Assigned shows what's due without asking the server each time. They're brought up to date when the app opens and after anything you
// do in a class.
async function keep(uid) {
  const sid = socialId(uid);
  const mem = await rest('/class_members?user_id=eq.' + val(sid) + '&select=class_id,role,share_progress,joined_at&order=joined_at.asc&limit=200');
  const ids = mem.map(m => m.class_id);
  const [ks, as] = ids.length ? await Promise.all([rest('/classes?id=in.' + inList(ids) + '&select=id,code,name,school,owner'),
    rest('/assignments?class_id=in.' + inList(ids) + '&select=id,class_id,shared_id,goal,due&order=due.asc&limit=500')]) : [[], []];
  const [decks, owners] = await Promise.all([as.length ? rest('/shared_decks?id=in.' + inList([...new Set(as.map(a => a.shared_id))]) + '&select=id,name,card_count,cover,visibility') : [], profilesOf(ks.map(k => k.owner))]);
  const list = mem.map(m => ks.find(k => k.id === m.class_id)).filter(Boolean).map(k => {
    const m = mem.find(x => x.class_id === k.id);
    return { id: k.id, code: k.code, name: k.name, school: k.school, role: m.role, share: !!m.share_progress, owner: (owners.find(o => o.id === k.owner) || {}).name || '',
      assignments: as.filter(a => a.class_id === k.id).map(a => { const d = decks.find(x => x.id === a.shared_id && x.visibility !== 'private');
        return d ? { id: a.id, sharedId: a.shared_id, name: d.name, cards: d.card_count || 0, cover: d.cover || {}, goal: a.goal, due: String(a.due).slice(0, 10) } : null; }).filter(Boolean) };
  });
  const S = state();
  if (JSON.stringify(S.classes || []) !== JSON.stringify(list)) { S.classes = list; saved(); }
  return list;
}
// What a member who shares their progress sends each class: a few numbers per assignment (web/progress.js), worked out
// from their own library. A deck they haven't added yet counts as not started.
async function sendProgress(uid, list) {
  const sid = socialId(uid), S = state(), rows = [];
  for (const k of list) {
    if (k.role !== 'member' || !k.share) continue;
    for (const a of k.assignments) {
      const d = S.decks.find(x => x.link && x.link.id === a.sharedId && !x.link.gone);
      const p = d ? progressOf(d, S.cards, S.logs) : { learned: 0, total: a.cards, due: 0, remembered: null, last: null };
      rows.push({ assignment_id: a.id, user_id: sid, class_id: k.id, learned: p.learned, total: p.total, due: p.due, remembered: p.remembered, last_at: p.last ? new Date(p.last).toISOString() : null, updated_at: nowIso() });
    }
  }
  for (let i = 0; i < rows.length; i += 200) await rest('/class_progress?on_conflict=assignment_id,user_id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: rows.slice(i, i + 200) });
  return rows.length;
}
// When the app opens (/api/state?sync=1), after a study session, and when you open your classes.
export async function sync(uid) { const list = await keep(uid); return { sent: await sendProgress(uid, list) }; }

// ---------- making, joining, leaving ----------
export async function make(uid, me, o = {}) {
  const p = await ensureProfile(uid, me), name = oneLine(o.name, 60), school = oneLine(o.school, 60);
  if (!name) throw err('Give it a name.');
  // The same request (run again after its save lost a race, or a double click) makes the same class, not two.
  const id = 'k' + hash(p.id + ':' + name + ':' + Math.floor(Date.now() / 60000));
  let k = await classById(id);
  for (let i = 0; i < 30 && !k; i++) {
    try { await rest('/classes', { method: 'POST', body: { id, code: codeFor(id, i), owner: p.id, name, school } }); k = await classById(id); }
    catch (e) { if (e.status !== 409) throw e; k = await classById(id); }
  }
  if (!k) throw err('Couldn’t make the class. Try again.', 500);
  await rest('/class_members?on_conflict=class_id,user_id', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { class_id: k.id, user_id: p.id, role: 'owner', asked: true } });
  await keep(uid);
  return { id: k.id, code: k.code };
}
// Joining takes nothing but a tap. Sharing your progress stays off until you say so (the class page asks once).
export async function join(uid, me, code) {
  const k = await classByCode(code);
  if (!k) throw err('No class has that code. Check it and try again.', 404);
  const p = await ensureProfile(uid, me);
  await rest('/class_members?on_conflict=class_id,user_id', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { class_id: k.id, user_id: p.id, role: 'member', share_progress: false, asked: false } });
  await keep(uid);
  return { id: k.id, code: k.code };
}
// Leaving: the class's decks you study stay in your library, now yours to keep (they stop getting its updates).
export async function leave(uid, classId) {
  const sid = socialId(uid), { k, m } = await roleIn(classId, sid);
  if (m.role === 'owner') throw err('You made this class. Delete it instead.');
  await rest('/class_members?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(sid), { method: 'DELETE' });
  await rest('/class_progress?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(sid), { method: 'DELETE' });
  await keep(uid);
  await syncShared(uid);
  return {};
}
export async function update(uid, classId, o = {}) {
  const { k } = await roleIn(classId, socialId(uid), ['owner'], 'Only the class’s owner can rename it.');
  const patch = {};
  if ('name' in o) { patch.name = oneLine(o.name, 60); if (!patch.name) throw err('Give it a name.'); }
  if ('school' in o) patch.school = oneLine(o.school, 60);
  if (Object.keys(patch).length) await rest('/classes?id=eq.' + val(k.id), { method: 'PATCH', body: { ...patch, updated_at: nowIso() } });
  await keep(uid);
  return {};
}
// Deleting a class: its people, decks, assignments, and progress go (Supabase would chain it; this computer's stand-in
// doesn't, so it's done here). Decks that were only in it are private again; people who studied them keep them.
export async function remove(uid, classId) {
  const { k } = await roleIn(classId, socialId(uid), ['owner'], 'Only the class’s owner can delete it.');
  const decks = await rest('/class_decks?class_id=eq.' + val(k.id) + '&select=shared_id');
  for (const t of ['class_progress', 'assignments', 'class_decks', 'class_members']) await rest('/' + t + '?class_id=eq.' + val(k.id), { method: 'DELETE' });
  await rest('/classes?id=eq.' + val(k.id), { method: 'DELETE' });
  for (const d of decks) await privateIfNoClass(d.shared_id);
  await keep(uid);
  return {};
}
// The owner makes someone a helper (or a member again); the owner and helpers can take a member out of the class.
export async function member(uid, classId, handle, o = {}) {
  const sid = socialId(uid), { k, m } = await roleIn(classId, sid, STAFF);
  const them = await profileByHandle(String(handle || '').replace(/^@/, ''));
  const tm = them && await memberOf(k.id, them.id);
  if (!tm) throw err('They’re not in this class.', 404);
  if (tm.role === 'owner') throw err('That’s the class’s owner.');
  if (o.remove) {
    if (m.role !== 'owner' && tm.role === 'helper') throw err('Only the class’s owner can take out a helper.', 403);
    await rest('/class_members?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(them.id), { method: 'DELETE' });
    await rest('/class_progress?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(them.id), { method: 'DELETE' });
    return { removed: true };
  }
  if (m.role !== 'owner') throw err('Only the class’s owner picks helpers.', 403);
  const role = o.role === 'helper' ? 'helper' : 'member';
  await rest('/class_members?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(them.id), { method: 'PATCH', body: { role } });
  // Helpers see everyone's progress; theirs isn't part of it.
  if (role === 'helper') await rest('/class_progress?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(them.id), { method: 'DELETE' });
  return { role };
}
// Sharing your progress with the class (off until you turn it on), and answering the one-time question either way.
export async function share(uid, classId, on) {
  const sid = socialId(uid), { k } = await roleIn(classId, sid);
  await rest('/class_members?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(sid), { method: 'PATCH', body: { share_progress: !!on, asked: true } });
  // Turned off, nothing of it stays behind.
  if (!on) await rest('/class_progress?class_id=eq.' + val(k.id) + '&user_id=eq.' + val(sid), { method: 'DELETE' });
  const list = await keep(uid);
  if (on) await sendProgress(uid, list.filter(x => x.id === k.id));
  return { on: !!on };
}

// ---------- the class's decks and assignments ----------
// The owner or a helper adds a deck of their own. A deck that isn't Link only or Public is shared with the class alone.
export async function addDeck(uid, me, classId, deckId) {
  const sid = socialId(uid), { k } = await roleIn(classId, sid, STAFF, 'Only the class’s owner and helpers add decks.');
  const d = state().decks.find(x => x.id === deckId);
  if (!d) throw err('No such deck');
  if (d.link && d.link.mode === 'study' && !d.link.gone) throw err('This deck is ' + (d.link.owner.name || 'someone else') + '’s. Add a deck of your own, or make a copy of it first.');
  const sharedId = d.share && ['link', 'public'].includes(d.share.vis) ? d.share.id : (await shareDeck(uid, me, d.id, { visibility: 'class' })).id;
  await rest('/class_decks?on_conflict=class_id,shared_id', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { class_id: k.id, shared_id: sharedId, added_by: sid } });
  return { sharedId };
}
// Taking a deck out takes its assignments with it. The owner takes out any; a helper, the ones they added.
export async function removeDeck(uid, classId, sharedId) {
  const sid = socialId(uid), { k, m } = await roleIn(classId, sid, STAFF);
  const row = (await rest('/class_decks?class_id=eq.' + val(k.id) + '&shared_id=eq.' + val(sharedId) + '&select=*'))[0];
  if (!row) throw err('That deck isn’t in this class.', 404);
  if (m.role !== 'owner' && row.added_by !== sid) throw err('Only the class’s owner can take out a deck someone else added.', 403);
  await dropAssignments((await rest('/assignments?class_id=eq.' + val(k.id) + '&shared_id=eq.' + val(sharedId) + '&select=id')).map(a => a.id));
  await rest('/class_decks?class_id=eq.' + val(k.id) + '&shared_id=eq.' + val(sharedId), { method: 'DELETE' });
  await privateIfNoClass(sharedId);
  await keep(uid);
  return {};
}
// Assigning a class deck: learn every card, or review what's due each day, by a date (YYYY-MM-DD).
export async function assign(uid, classId, o = {}) {
  const sid = socialId(uid), { k } = await roleIn(classId, sid, STAFF, 'Only the class’s owner and helpers assign decks.');
  const sharedId = String(o.sharedId || '');
  if (!sharedId || !(await rest('/class_decks?class_id=eq.' + val(k.id) + '&shared_id=eq.' + val(sharedId) + '&select=shared_id')).length) throw err('Pick one of the class’s decks.');
  const goal = o.goal === 'daily' ? 'daily' : 'learn', due = String(o.due || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || isNaN(Date.parse(due))) throw err('Pick a date.');
  // A day of slack either way, for time zones.
  if (Date.parse(due + 'T23:59:59Z') < Date.now() - DAY) throw err('Pick a date that hasn’t passed.');
  // The same deck, goal, and date is the same assignment (a double click makes one).
  const id = 'a' + hash(k.id + ':' + sharedId + ':' + goal + ':' + due);
  await rest('/assignments?on_conflict=id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { id, class_id: k.id, shared_id: sharedId, goal, due, created_by: sid } });
  await keep(uid);
  return { id };
}
export async function unassign(uid, classId, id) {
  const { k } = await roleIn(classId, socialId(uid), STAFF);
  const a = (await rest('/assignments?id=eq.' + val(id) + '&class_id=eq.' + val(k.id) + '&select=id'))[0];
  if (!a) throw err('That assignment is gone.', 404);
  await dropAssignments([a.id]);
  await keep(uid);
  return {};
}

// ---------- what pages show ----------
// Your classes (Library → Classes).
export async function mine(uid) {
  const list = await keep(uid);
  if (!list.length) return [];
  const ids = list.map(k => k.id);
  const [people, decks, ks] = await Promise.all([rest('/class_members?class_id=in.' + inList(ids) + '&select=class_id&limit=10000'), rest('/class_decks?class_id=in.' + inList(ids) + '&select=class_id&limit=5000'),
    rest('/classes?id=in.' + inList(ids) + '&select=id,owner')]);
  const owners = await profilesOf(ks.map(k => k.owner));
  return list.map(k => { const o = owners.find(p => p.id === (ks.find(x => x.id === k.id) || {}).owner);
    return { id: k.id, code: k.code, name: k.name, school: k.school, role: k.role, share: k.share, owner: face(o), official: official(o),
      people: people.filter(x => x.class_id === k.id).length, decks: decks.filter(x => x.class_id === k.id).length, assignments: k.assignments.length }; });
}
// A class's page (/class/<code>). Someone who isn't in it (or isn't signed in) gets what an invite shows: its name,
// whose it is, and how many people and decks. People in it get its decks, assignments, and people; the owner and
// helpers also get the progress of every member who shares it ("Not shared" for the others).
export async function page(code, viewer) {
  const k = await classByCode(code);
  if (!k) return null;
  const vid = viewer ? socialId(viewer) : null, m = vid ? await memberOf(k.id, vid) : null;
  const [owner, people, links] = await Promise.all([profileOf(k.owner), rest('/class_members?class_id=eq.' + val(k.id) + '&select=user_id,role,share_progress,joined_at&order=joined_at.asc&limit=5000'),
    rest('/class_decks?class_id=eq.' + val(k.id) + '&select=shared_id,added_by,created_at&order=created_at.asc&limit=500')]);
  const base = { id: k.id, code: k.code, name: k.name, school: k.school, owner: face(owner), official: official(owner), people: people.length, decks: links.length };
  if (!m) return { ...base, invite: true };
  const staff = STAFF.includes(m.role);
  const [faces, rows, as, prog] = await Promise.all([profilesOf(people.map(x => x.user_id)), links.length ? rest('/shared_decks?id=in.' + inList(links.map(x => x.shared_id)) + '&select=' + LIST) : [],
    rest('/assignments?class_id=eq.' + val(k.id) + '&select=id,shared_id,goal,due,created_at&order=due.asc&limit=500'), staff ? rest('/class_progress?class_id=eq.' + val(k.id) + '&select=*&limit=20000') : []]);
  // A deck hidden after a report (private again) isn't shown, even to the class.
  const cards = await withOwners(rows.filter(r => r.visibility !== 'private' && !r.hidden));
  const who = id => faces.find(p => p.id === id), handleOf = id => (who(id) || {}).handle || '';
  const decks = links.map(l => { const c = cards.find(x => x.id === l.shared_id); return c ? { ...c, addedBy: handleOf(l.added_by), mine: l.added_by === vid } : null; }).filter(Boolean);
  const members = people.map(x => ({ ...face(who(x.user_id)), role: x.role, ...(staff ? { share: !!x.share_progress } : {}), joined: x.joined_at, you: x.user_id === vid })).filter(x => x.handle);
  return { ...base, decks: decks.length,
    me: { role: m.role, share: !!m.share_progress, asked: !!m.asked },
    // For "Share your progress with Dr. Okafor and Dev?": the people who'd see it.
    helpers: members.filter(x => x.role === 'helper').map(x => x.name),
    members, deckList: decks,
    assignments: as.map(a => { const d = decks.find(x => x.id === a.shared_id); if (!d) return null;
      const out = { id: a.id, sharedId: a.shared_id, goal: a.goal, due: String(a.due).slice(0, 10), deck: { name: d.name, cover: d.cover, cards: d.cards, url: d.url } };
      if (staff) out.progress = Object.fromEntries(prog.filter(p => p.assignment_id === a.id && handleOf(p.user_id)).map(p => [handleOf(p.user_id), { learned: p.learned, total: p.total, due: p.due, remembered: p.remembered, last: p.last_at, at: p.updated_at }]));
      return out; }).filter(Boolean) };
}
// Link previews for an invite ("Join BIO 201 · Lucida"). Invites stay out of search engines.
export async function metaFor(path) {
  const m = /^\/class\/([A-Za-z]{6})\/?$/.exec(path);
  if (!m) return null;
  const k = await classByCode(m[1]);
  if (!k) return { status: 404, title: 'Not found · Lucida', description: '', noindex: true };
  const [o, n] = await Promise.all([profileOf(k.owner), rest('/class_members?class_id=eq.' + val(k.id) + '&select=user_id&limit=1', { count: true })]);
  return { title: 'Join ' + k.name + ' · Lucida', description: [o ? o.name + '’s class' : '', k.school, plural(n.total, 'person', 'people')].filter(Boolean).join(' · '), noindex: true, url: '/class/' + k.code };
}

// ---------- verified teachers and schools ----------
// A short request: teacher or school, which school, and a school email or a link to a page that shows you there.
// The admin page approves it (the profile gets its check) or turns it down.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, LINK = /^https?:\/\/\S+\.\S+$/i;
export async function askVerify(uid, me, o = {}) {
  const p = await ensureProfile(uid, me);
  if (p.verified) throw err('You’re verified already.');
  const role = o.role === 'school' ? 'school' : 'teacher', school = oneLine(o.school, 80), contact = oneLine(o.contact, 200);
  if (school.length < 2) throw err('Type your school’s name.');
  if (!EMAIL.test(contact) && !LINK.test(contact)) throw err('Type a school email, or a link that shows you there.');
  const open = (await rest('/verify_requests?user_id=eq.' + val(p.id) + '&status=eq.open&select=id'))[0];
  if (open) { await rest('/verify_requests?id=eq.' + val(open.id), { method: 'PATCH', body: { role, school, contact, created_at: nowIso() } }); return { id: open.id }; }
  const id = rid('v');
  await rest('/verify_requests', { method: 'POST', body: { id, user_id: p.id, role, school, contact } });
  return { id };
}
// Whether you're verified, or waiting (for the Get verified sheet).
export async function verifyStatus(uid) {
  const sid = socialId(uid), p = await profileOf(sid);
  const last = p ? (await rest('/verify_requests?user_id=eq.' + val(sid) + '&select=status,role,school&order=created_at.desc&limit=1'))[0] : null;
  return { verified: (p && p.verified) || '', open: !!(last && last.status === 'open'), declined: !!(last && last.status === 'declined'), role: last ? last.role : '', school: last ? last.school : (p && p.school) || '' };
}

// ---------- reports ----------
// Anyone signed in can report a deck, a profile, or a suggestion (on their own deck): wrong or harmful, spam, someone
// else's work, or other (with a line). One open report per person per thing, and no more than OPEN_REPORTS open at a time
// (so the admin page can't be buried); the admin page decides.
const REASONS = ['wrong', 'spam', 'stolen', 'other'], OPEN_REPORTS = 10;
export async function sendReport(uid, me, o = {}) {
  const p = await ensureProfile(uid, me);
  const kind = ['deck', 'profile', 'suggestion'].includes(o.kind) ? o.kind : '';
  if (!kind) throw err('What are you reporting?');
  const reason = REASONS.includes(o.reason) ? o.reason : '';
  if (!reason) throw err('Pick a reason.');
  const note = oneLine(o.note, 280);
  if (reason === 'other' && !note) throw err('Say what’s wrong.');
  let target = '', name = '';
  if (kind === 'deck') {
    const sh = (await rest('/shared_decks?id=eq.' + val(o.id) + '&select=id,owner,name,visibility,hidden'))[0];
    if (!sh || !(await canSee(sh, p.id))) throw err('That deck isn’t shared anymore.', 404);
    if (sh.owner === p.id) throw err('It’s your deck.');
    target = sh.id; name = sh.name;
  } else if (kind === 'profile') {
    const them = await profileByHandle(String(o.handle || o.id || '').replace(/^@/, ''));
    if (!them) throw err('No one has that name.', 404);
    if (them.id === p.id) throw err('That’s you.');
    target = them.id; name = them.name + ' (@' + them.handle + ')';
  } else {
    const s = (await rest('/suggestions?id=eq.' + val(o.id) + '&select=id,owner,shared_id,author_name,message'))[0];
    const sh = s && (await rest('/shared_decks?id=eq.' + val(s.shared_id) + '&select=helpers'))[0];
    if (!s || (s.owner !== p.id && !((sh && sh.helpers) || []).some(h => h.id === p.id))) throw err('That suggestion is gone.', 404);
    target = s.id; name = s.author_name + (s.message ? ': ' + s.message : '');
  }
  const had = (await rest('/reports?reporter=eq.' + val(p.id) + '&kind=eq.' + kind + '&target=eq.' + val(target) + '&status=eq.open&select=id'))[0];
  if (had) { await rest('/reports?id=eq.' + val(had.id), { method: 'PATCH', body: { reason, note, created_at: nowIso() } }); return { id: had.id }; }
  const waiting = await rest('/reports?reporter=eq.' + val(p.id) + '&status=eq.open&select=id&limit=1', { count: true });
  if (waiting.total >= OPEN_REPORTS) throw err('You have ' + OPEN_REPORTS + ' reports waiting.', 429);
  const id = rid('r');
  await rest('/reports', { method: 'POST', body: { id, kind, target, target_name: clean(name, 200), reason, note, reporter: p.id } });
  return { id };
}

// ---------- the admin page ----------
// LUCIDA_ADMINS lists account ids and emails. An email counts only for an account whose email is confirmed (Supabase's
// email_confirmed_at), so nobody becomes an admin by putting a team address on their own account.
const ADMINS = () => String(process.env.LUCIDA_ADMINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
export const isAdmin = (uid, me) => {
  if (!cloud() && uid === 'dev_admin') return true;
  const list = ADMINS();
  if (uid && list.includes(String(uid).toLowerCase())) return true;
  return !!(me && me.emailConfirmed && me.email && list.includes(String(me.email).toLowerCase()));
};
const mustAdmin = (uid, me) => { if (!isAdmin(uid, me)) throw err('Only Lucida’s team can open this.', 403); };
// Verification requests waiting, and reports waiting, one row per thing reported (with every report about it).
export async function adminPage(uid, me) {
  mustAdmin(uid, me);
  // Newest first, so a pile of old ones never keeps the new ones off the page.
  const [reqs, reps] = await Promise.all([rest('/verify_requests?status=eq.open&select=*&order=created_at.desc&limit=200'), rest('/reports?status=eq.open&select=*&order=created_at.desc&limit=1000')]);
  const people = await profilesOf([...reqs.map(r => r.user_id), ...reps.map(r => r.reporter), ...reps.filter(r => r.kind === 'profile').map(r => r.target)]);
  const deckIds = [...new Set(reps.filter(r => r.kind === 'deck').map(r => r.target))], sugIds = [...new Set(reps.filter(r => r.kind === 'suggestion').map(r => r.target))];
  const [decks, sugs] = await Promise.all([deckIds.length ? rest('/shared_decks?id=in.' + inList(deckIds) + '&select=' + LIST).then(withOwners) : [], sugIds.length ? rest('/suggestions?id=in.' + inList(sugIds) + '&select=id,author,author_name,message,changes,status') : []]);
  const who = id => face(people.find(p => p.id === id));
  const groups = new Map();
  for (const r of reps) {
    const key = r.kind + ':' + r.target;
    if (!groups.has(key)) groups.set(key, { id: r.id, kind: r.kind, name: r.target_name, reports: [] });
    groups.get(key).reports.push({ reason: r.reason, note: r.note, by: who(r.reporter), at: r.created_at });
  }
  const first = s => { const c = (s.changes || [])[0], x = c && (c.after || c.before); return x ? String(x.front || x.text || '').slice(0, 140) + (x.back ? ' — ' + String(x.back).slice(0, 140) : '') : ''; };
  return {
    requests: reqs.map(r => ({ id: r.id, role: r.role, school: r.school, contact: r.contact, at: r.created_at, person: who(r.user_id) })).filter(r => r.person),
    reports: [...groups.entries()].map(([key, g]) => {
      const target = key.slice(key.indexOf(':') + 1), s = g.kind === 'suggestion' ? sugs.find(x => x.id === target) : null;
      return { ...g, deck: g.kind === 'deck' ? decks.find(d => d.id === target) || null : null, person: g.kind === 'profile' ? who(target) : null,
        suggestion: s ? { author: s.author_name, message: s.message, n: (s.changes || []).length, first: first(s), open: s.status === 'open' } : null };
    })
  };
}
export async function adminVerify(uid, me, o = {}) {
  mustAdmin(uid, me);
  const r = (await rest('/verify_requests?id=eq.' + val(o.id) + '&select=*'))[0];
  if (!r || r.status !== 'open') throw err('That request was decided already.', 404);
  const ok = o.pick === 'approve';
  if (ok) {
    const p = await profileOf(r.user_id);
    if (!p) throw err('That person is gone.', 404);
    // A school's account is the school's own profile: its decks say "Official · <school>". A verified profile is one its person
    // asked to make public, so it shows in search too (asking alone doesn't list anyone).
    await rest('/profiles?id=eq.' + val(p.id), { method: 'PATCH', body: { verified: r.role, listed: true, ...(r.role === 'school' ? { kind: 'school' } : {}), ...(!p.school ? { school: r.school } : {}), updated_at: nowIso() } });
    await rest('/notifications', { method: 'POST', body: [{ user_id: p.id, kind: 'verified', actor: null, actor_name: 'Lucida', data: { role: r.role } }] });
  }
  await rest('/verify_requests?id=eq.' + val(r.id), { method: 'PATCH', body: { status: ok ? 'approved' : 'declined', decided_at: nowIso(), decided_by: (me && me.email) || socialId(uid) } });
  return { status: ok ? 'approved' : 'declined' };
}
// Hiding a deck makes it private again (its owner's Sharing says so too, and they hear why), and it stays hidden: `hidden`
// is what stops its owner sharing it again (social.mjs shareDeck) and anyone else seeing it (canSee). People who study it
// keep their cards, the way they do when an owner stops sharing.
async function hideDeck(sharedId) {
  const sh = (await rest('/shared_decks?id=eq.' + val(sharedId) + '&select=id,owner,name,visibility,hidden'))[0];
  if (!sh || sh.hidden) return false;
  await rest('/shared_decks?id=eq.' + val(sh.id), { method: 'PATCH', body: { visibility: 'private', hidden: true, updated_at: nowIso() } });
  await inLibraryOf(sh.owner, async () => { const d = state().decks.find(x => x.share && x.share.id === sh.id); if (d) { d.share.vis = 'private'; saved(); } }).catch(e => console.error('hide', e));
  await rest('/notifications', { method: 'POST', body: [{ user_id: sh.owner, kind: 'hidden', actor: null, actor_name: 'Lucida', shared_id: sh.id, data: { name: sh.name } }] });
  return true;
}
// A report's answer: hide the deck, hide every deck a profile shares, take a suggestion away, or dismiss. It closes every
// open report about the same thing.
export async function adminReport(uid, me, o = {}) {
  mustAdmin(uid, me);
  const r = (await rest('/reports?id=eq.' + val(o.id) + '&select=*'))[0];
  if (!r || r.status !== 'open') throw err('That report was decided already.', 404);
  let status = 'dismissed', n = 0;
  if (o.pick === 'hide' && r.kind === 'deck') { n = +(await hideDeck(r.target)); status = 'hidden'; }
  else if (o.pick === 'hide' && r.kind === 'profile') {
    for (const d of await rest('/shared_decks?owner=eq.' + val(r.target) + '&visibility=in.(link,public,class)&select=id')) n += +(await hideDeck(d.id));
    status = 'hidden';
  } else if (o.pick === 'remove' && r.kind === 'suggestion') {
    const s = (await rest('/suggestions?id=eq.' + val(r.target) + '&select=id,changes'))[0];
    if (s) await rest('/suggestions?id=eq.' + val(s.id), { method: 'PATCH', body: { status: 'done', decided_at: nowIso(), changes: (s.changes || []).map(c => (c.status === 'open' ? { ...c, status: 'skipped' } : c)) } });
    status = 'removed';
  } else if (o.pick !== 'dismiss') throw err('Pick what to do.');
  await rest('/reports?kind=eq.' + r.kind + '&target=eq.' + val(r.target) + '&status=eq.open', { method: 'PATCH', body: { status, decided_at: nowIso() } });
  return { status, hidden: n };
}

// The actions the app sends to /api/social (web/handler.mjs), each run in the signed-in person's library.
export const ACTIONS = {
  'class.make': (uid, me, a) => make(uid, me, a),
  'class.join': (uid, me, a) => join(uid, me, a.code),
  'class.leave': (uid, me, a) => leave(uid, a.id),
  'class.update': (uid, me, a) => update(uid, a.id, a.patch || {}),
  'class.delete': (uid, me, a) => remove(uid, a.id),
  'class.member': (uid, me, a) => member(uid, a.id, a.handle, a),
  'class.share': (uid, me, a) => share(uid, a.id, !!a.on),
  'class.addDeck': (uid, me, a) => addDeck(uid, me, a.id, a.deckId),
  'class.removeDeck': (uid, me, a) => removeDeck(uid, a.id, a.sharedId),
  'class.assign': (uid, me, a) => assign(uid, a.id, a),
  'class.unassign': (uid, me, a) => unassign(uid, a.id, a.assignment),
  'class.sync': uid => sync(uid),
  'verify.ask': (uid, me, a) => askVerify(uid, me, a),
  'report.send': (uid, me, a) => sendReport(uid, me, a),
  'admin.verify': (uid, me, a) => adminVerify(uid, me, a),
  'admin.report': (uid, me, a) => adminReport(uid, me, a)
};
