// Files a person keeps outside their library: uploads waiting to be read (names start with "tmp-"), and the files that stay
// with a deck as its Sources (a PDF, a photo, a recording, the text a video or recording was turned into). Online they are
// objects in the person's own folder of the private `media` bucket (supa.mjs files); on this computer a waiting upload is
// in data/tmp/<person>/ and a kept file sits with the pictures and sounds in data/media/, where /media/<name> serves it.
//
// Uploading is two steps, because Vercel won't take a request body over 4.5 MB and a lecture or a PDF is often bigger:
//   sign(): the server says where to put the bytes. Small files (up to SMALL) go to this server's own /api/make/put/<token>
//           (online and here); bigger ones go straight to Supabase Storage on a signed address (online only).
//   The page then sends the bytes there, and calls /api/make/start, which reads them from here.
import { mkdirSync, rmSync, existsSync, readdirSync, statSync, renameSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloud, files as bucket } from './supa.mjs';

// The same folder store.mjs keeps its data in (STEALTH_DATA, or data/ next to web/).
const DATA = () => process.env.STEALTH_DATA || fileURLToPath(new URL('../data/', import.meta.url));
const MEDIA = () => join(DATA(), 'media');
// What this server's own PUT takes: below Vercel's request limit (4.5 MB), with room for the request's other bytes.
export const SMALL = 4 * 1024 * 1024;
// A file name here is letters, digits, dashes and underscores, a dot, and an extension (like the pictures' names).
export const NAME = /^[\w-]+\.\w{1,8}$/;
const who = uid => String(uid || 'local').replace(/[^\w-]/g, '').slice(0, 60) || 'local';
const check = name => { if (!NAME.test(String(name))) throw new Error('That file name isn’t allowed.'); return String(name); };
// Waiting uploads are in a folder per person; kept files are next to the pictures (their names carry a random part, so they never meet).
const place = (uid, name) => (/^tmp-/.test(name) ? join(DATA(), 'tmp', who(uid), name) : join(MEDIA(), name));

export const blobs = {
  put: async (uid, name, buf, type) => {
    check(name);
    if (cloud()) return bucket.put(uid, name, buf, type);
    const file = place(uid, name);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file + '.part', buf); renameSync(file + '.part', file);
  },
  get: async (uid, name) => {
    check(name);
    if (cloud()) return bucket.get(uid, name);
    try { return readFileSync(place(uid, name)); } catch { return null; }
  },
  has: async (uid, name) => (cloud() ? bucket.has(uid, check(name)) : existsSync(place(uid, check(name)))),
  // Deletes files; one that is already gone is fine.
  remove: async (uid, names) => {
    const list = [...new Set((names || []).filter(n => NAME.test(String(n))))];
    if (!list.length) return;
    if (cloud()) return bucket.remove(uid, list);
    for (const n of list) { try { unlinkSync(place(uid, n)); } catch { /* already gone */ } }
  },
  // A waiting upload becomes a kept file (a rename, nothing is copied through this server).
  move: async (uid, from, to) => {
    check(from); check(to);
    if (cloud()) return bucket.move(uid, from, to);
    const a = place(uid, from), b = place(uid, to);
    mkdirSync(join(b, '..'), { recursive: true });
    renameSync(a, b);
  },
  // Waiting uploads nobody used (a page that was closed halfway) go after a while.
  sweep: async (uid, maxAgeMs) => {
    const old = [];
    if (cloud()) {
      for (const o of await bucket.list(uid, 'tmp-', 1000)) if (o.name && /^tmp-/.test(o.name) && Date.now() - Date.parse(o.created_at || o.updated_at || 0) > maxAgeMs) old.push(o.name);
    } else {
      const dir = join(DATA(), 'tmp', who(uid));
      if (existsSync(dir)) for (const n of readdirSync(dir)) { try { if (Date.now() - statSync(join(dir, n)).mtimeMs > maxAgeMs) old.push(n); } catch { /* gone */ } }
    }
    await blobs.remove(uid, old.filter(n => /^tmp-/.test(n)));
    return old.length;
  },
  // Delete my data / Delete account on this computer: everything of theirs that waits. (Online, files.clear removes the whole folder.)
  clear: uid => { if (!cloud()) rmSync(join(DATA(), 'tmp', who(uid)), { recursive: true, force: true }); },
  // Where to put the bytes of a file about to be uploaded: { url, method, headers, direct }. `id` is the upload's own id (make.mjs keeps
  // it in the person's library until the file is used), so this server's /api/make/put/<id> needs nothing but that and the person's sign-in.
  sign: async (uid, id, name, type, size) => {
    check(name);
    if (cloud() && size > SMALL) {
      const url = await bucket.signedUpload(uid, name).catch(() => null);
      if (url) return { url, method: 'PUT', headers: { 'content-type': type, 'x-upsert': 'true' }, direct: true };
    }
    return { url: '/api/make/put/' + id, method: 'PUT', headers: { 'content-type': type }, direct: false };
  }
};
