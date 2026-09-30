// A stand-in for how Vercel routes a request to this project, read from vercel.json, so the rules for the two hosts
// (lucida.cards: the site; app.lucida.cards: the app) can be tested without deploying. The local server can't do it:
// it has one host, and it serves the app for any page that isn't a file.
//
// The order is Vercel's (vercel.com/docs/project-configuration, "rewrites" and "redirects"): redirects first, then the
// files in the output folder (a file wins over a rewrite with the same path, so a rewrite's source should never be a
// file), then rewrites in the order written (the first that matches wins; its destination is a file, the function, or
// nothing), and whatever is left is a 404 (web/404.html, if there is one, is its page). `source` patterns follow
// path-to-regexp: :name, :name(regex), :name*, and (regex); a trailing slash is allowed.
// Used by design/check-site.mjs, and by a small server that puts a page in front of a browser under both host names.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// "/vs/:name" → { re, names }. Only what this project's rules use.
export function compile(source) {
  let re = '', names = [], i = 0, unnamed = 0;
  const group = () => { // reads "(...)" at i (nested brackets and escapes allowed) and leaves i after it
    let depth = 0, start = i;
    for (; i < source.length; i++) {
      if (source[i] === '\\') { i++; continue; }
      if (source[i] === '(') depth++;
      if (source[i] === ')' && --depth === 0) { i++; return source.slice(start + 1, i - 1); }
    }
    throw new Error('Unclosed ( in ' + source);
  };
  while (i < source.length) {
    const c = source[i];
    if (c === ':' && /[A-Za-z_]/.test(source[i + 1] || '')) {
      const name = /^:(\w+)/.exec(source.slice(i))[1]; i += 1 + name.length;
      const custom = source[i] === '(' ? group() : '', mod = /^[*+?]/.test(source[i] || '') ? source[i++] : '';
      const piece = custom || '[^/#?]+?';
      names.push(name);
      if (mod && re.endsWith('\\/')) re = re.slice(0, -2); // "/:path*" is one optional piece, with its slash
      re += mod === '*' ? `(?:/(${custom || piece + '(?:/' + piece + ')*'}))?` : mod === '+' ? `/(${custom || piece + '(?:/' + piece + ')*'})` : mod === '?' ? `(?:/(${piece}))?` : `(${piece})`;
    } else if (c === '(') { names.push(String(unnamed++)); re += '(' + group() + ')'; }
    else { re += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); i++; }
  }
  return { re: new RegExp('^' + re + '/?$'), names };
}

// Whether a rule's has / missing conditions hold for this request (host is what the rules here use).
const holds = (list, req, want) => (list || []).every(c => {
  if (c.type !== 'host') throw new Error('vercel-routes.mjs only knows "host" conditions, not "' + c.type + '"');
  const hit = c.value === undefined ? true : new RegExp('^(?:' + c.value + ')$', 'i').test(req.host);
  return hit === want;
});
const fill = (text, params) => text.replace(/:(\w+)\*?/g, (m, n) => (n in params ? params[n] ?? '' : m));

// Decides what happens to { host, path } (path without the query). Returns
//   { type: 'redirect', status, to } | { type: 'file', file } | { type: 'function' } | { type: 'notfound', page }
// `rule` says which rule decided (for test messages).
export function route(config, webDir, req) {
  const path = req.path;
  const match = rule => {
    const { re, names } = compile(rule.source);
    const m = re.exec(path);
    if (!m || !holds(rule.has, req, true) || !holds(rule.missing, req, false)) return null;
    return Object.fromEntries(names.map((n, i) => [n, m[i + 1]]));
  };
  for (const rule of config.redirects || []) {
    const params = match(rule);
    if (params) return { type: 'redirect', status: rule.permanent === false ? 307 : 308, to: fill(rule.destination, params), rule: rule.source };
  }
  const at = p => { const f = join(webDir, p); return existsSync(f) && statSync(f).isFile() ? f : null; };
  const direct = path !== '/' && at(decodeURIComponent(path));
  if (direct) return { type: 'file', file: direct, rule: 'file' };
  for (const rule of config.rewrites || []) {
    const params = match(rule);
    if (!params) continue;
    const dest = fill(rule.destination, params).split('?')[0];
    if (/^\/api\/index$/.test(dest)) return { type: 'function', rule: rule.source };
    const file = at(dest);
    return file ? { type: 'file', file, rewritten: dest, rule: rule.source } : { type: 'notfound', page: at('/404.html'), rule: rule.source };
  }
  return { type: 'notfound', page: at('/404.html'), rule: 'none' };
}
