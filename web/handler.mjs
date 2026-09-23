// Every request to Lucida's server: the web app's data (/api), the MCP link for AI apps (/mcp), pictures and
// sound (/media), and the app's own files. The same code runs on your computer (server.mjs) and on Vercel
// (api/index.js), where the pages are static files and only /api, /mcp, and /media reach this.
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { state, apply, begin, finish, putMedia, mediaLink, MEDIA } from './store.mjs';
import { mcp } from './mcp.mjs';
import { EXT } from './media.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webm': 'audio/webm' };

const inside = (root, file) => file === root || file.startsWith(root.endsWith(sep) ? root : root + sep);
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = (req, limit) => new Promise((ok, bad) => {
  const parts = []; let n = 0;
  req.on('data', b => { n += b.length; if (n > limit) { bad(new Error('Too big')); req.destroy(); } else parts.push(b); });
  req.on('end', () => ok(Buffer.concat(parts))); req.on('error', bad);
});
// Pages from this site (or this computer) may change data; other websites can't send requests here.
const sameSite = req => {
  const o = req.headers.origin;
  if (!o || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return true;
  try { return new URL(o).host === (req.headers['x-forwarded-host'] || req.headers.host); } catch { return false; }
};
// Holds the answer until the data is saved, so a request that has to run again still sends just one answer.
const held = () => {
  let head = [200, {}], body = '';
  return { writeHead(code, h) { head = [code, h || {}]; return this; }, end(b) { body = b ?? ''; return this; }, sendTo(res) { res.writeHead(head[0], head[1]); res.end(body); } };
};

async function api(req, res, path, body) {
  if (path === '/api/state' && req.method === 'GET') return send(res, 200, state());
  if (path === '/api/rev' && req.method === 'GET') return send(res, 200, { rev: state().rev });
  if (path === '/api/action' && req.method === 'POST') {
    try { const result = apply(JSON.parse(body)); return send(res, 200, { result, state: state() }); }
    catch (e) { return send(res, 400, { error: e.message }); }
  }
  if (path === '/api/media' && req.method === 'POST') {
    const type = String(req.headers['content-type'] || '').split(';')[0], ext = EXT[type];
    if (!ext) return send(res, 415, { error: 'Only images and audio' });
    const name = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + ext;
    await putMedia(name, body, type);
    return send(res, 200, { url: '/media/' + name });
  }
  return send(res, 404, { error: 'Not found' });
}

// Online, pictures and sound load straight from storage through a short-lived link.
async function media(req, res, name) {
  if (!/^[\w-]+\.\w+$/.test(name)) return send(res, 404, 'Not found', 'text/plain');
  const link = await mediaLink(name);
  if (link) { res.writeHead(302, { location: link, 'cache-control': 'private, max-age=600' }); return res.end(); }
  return files(req, res, name, MEDIA);
}

async function files(req, res, path, root) {
  let file = join(root, path);
  if (!inside(root, file)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    if (extname(path) || root !== ROOT) return send(res, 404, 'Not found', 'text/plain');
    file = join(ROOT, 'index.html');
  }
  try { send(res, 200, await readFile(file), TYPES[extname(file)] || 'application/octet-stream'); }
  catch { send(res, 404, 'Not found', 'text/plain'); }
}

export async function handle(req, res) {
  let path;
  try { path = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { return send(res, 400, 'Bad request', 'text/plain'); }
  try {
    if (path === '/mcp' || path.startsWith('/api/')) {
      if (!sameSite(req)) return send(res, 403, { error: 'Forbidden' });
      const body = req.method === 'POST' ? await readBody(req, path === '/api/media' ? 20e6 : 5e6) : null;
      // Online, another request can save first; then this one runs again from the newer copy.
      for (let attempt = 0; attempt < 3; attempt++) {
        await begin();
        const out = held();
        if (path === '/mcp') await mcp(req, out, String(body || '')); else await api(req, out, path, body);
        if (await finish()) return out.sendTo(res);
      }
      return send(res, 409, { error: 'Your cards changed somewhere else at the same moment. Try again.' });
    }
    if (path.startsWith('/media/')) return await media(req, res, path.slice(7));
    return await files(req, res, path, ROOT);
  } catch (e) { send(res, /Too big/.test(e.message) ? 413 : 500, { error: e.message }); }
}
