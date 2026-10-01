// The design canvas keeps what its boards share once. Every board used to carry the logic all boards have (the theme
// colors, the gradients, the canvas's sample data, the card text helpers), its themes' code, and the CSS every board
// starts with: 52 of the canvas's 65 MB were those copies, and a page of boards loaded all of them. Now a board keeps only
// its own markup, props and logic, and three files beside the boards (design/canvas/project) hold the rest:
//   lucida-logic.js   the logic every board shares. A board's script is `class Component extends LucidaLogic(DCLogic, n)
//                     { its own logic }`, where n adds rich() (1) and drag() (2), as page() does for the boards using them.
//   lucida-themes.js  the themes' code (web/themes), for the boards that draw a theme and the boards that import one:
//                     `static { LucidaCanvasThemes(["aero"]); }` in a board's logic runs what its own copy of it ran.
//   lucida.css        the CSS every board starts with. A board's <style> imports it first, so every rule keeps its place
//                     (in a board that imports others too), and its <head> links it, so it's there from the first paint.
// design/build.mjs writes them (slimBoards). Everything that reads a board (to-web, check, render, snapshot, screens) reads
// it with readBoard(), which puts the shared code back: they get the very text page() made, so the app, the site and the
// checks don't change. slimBoards checks that for every board it writes; a board it can't slim stays whole.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { THEME_KEYS, themeStatic, themeCode } from './themes.mjs';

export const LOGIC_FILE = 'lucida-logic.js', THEMES_FILE = 'lucida-themes.js', CSS_FILE = 'lucida.css';
const SUPPORT = '<script src="./support.js"></script>\n';
const HEAD = `<link rel="stylesheet" href="./${CSS_FILE}">\n<script src="./${LOGIC_FILE}"></script>\n`, HEAD_THEMES = `<script src="./${THEMES_FILE}"></script>\n`;
const IMPORT = `@import url("./${CSS_FILE}");\n`;
const CLASS = '\nclass Component extends DCLogic {\n', SLIM_CLASS = /^\nclass Component extends LucidaLogic\(DCLogic, ([0-3])\) \{\n/;
const THEME_BLOCK = /static \{ \/\* themes for the canvas \*\/[\s\S]*?\/\* end of the themes \*\/ \}/g, THEME_CALL = /static \{ LucidaCanvasThemes\((\[[^\]]*\])\); \}/g;
const themeCall = keys => `static { LucidaCanvasThemes(${JSON.stringify(keys)}); }`;

// Where a board's parts are: the text of its helmet's <style> and of its script.
function partsOf(src) {
  const helmet = src.indexOf('<x-dc>\n<helmet>\n'), style = src.indexOf('<style>\n', helmet) + 8, styleEnd = src.indexOf('</style>', style);
  const open = /<script type="text\/x-dc" data-dc-script data-props='[^']*'>/.exec(src);
  if (helmet < 0 || style < 8 || styleEnd > src.indexOf('</helmet>', helmet) || !open) return null;
  const js = open.index + open[0].length;
  return { style, styleEnd, js, jsEnd: src.indexOf('</script>', js) };
}
const splice = (s, from, to, text) => s.slice(0, from) + text + s.slice(to);

// A board as page() made it, from its slim text and the shared code (`shared` is called only for a slim board).
export function expandBoard(src, shared) {
  const at = src.indexOf(SUPPORT) + SUPPORT.length;
  if (at < SUPPORT.length || !src.startsWith(HEAD, at)) return src;
  let out = splice(src, at, at + HEAD.length + (src.startsWith(HEAD_THEMES, at + HEAD.length) ? HEAD_THEMES.length : 0), '');
  const p = partsOf(out);
  if (!p) return out;
  const s = typeof shared === 'function' ? shared() : shared;
  if (out.startsWith(IMPORT, p.style)) out = splice(out, p.style, p.style + IMPORT.length, s.prefix);
  const q = partsOf(out), js = out.slice(q.js, q.jsEnd), m = SLIM_CLASS.exec(js);
  if (!m) return out;
  const n = +m[1], own = js.slice(m[0].length).replace(THEME_CALL, (_, keys) => themeStatic(JSON.parse(keys), s.code));
  return splice(out, q.js, q.jsEnd, CLASS + s.base + (n & 1 ? s.rich : '') + (n & 2 ? '\n' + s.drag : '') + '\n' + own);
}

// The shared code, from the shared files' text: the parts between their markers.
const chunks = (text, css) => Object.fromEntries([...(text || '').matchAll(css ? /\/\*@@(\w+)\*\/\n([\s\S]*?)\/\*@@end\*\/\n/g : /\/\/@@(\w+)\n([\s\S]*?)\n\/\/@@end\n/g)].map(m => [m[1], m[2]]));
const sharedFrom = read => { const L = chunks(read(LOGIC_FILE)); return { base: L.base, rich: L.rich, drag: L.drag, prefix: chunks(read(CSS_FILE), true).prefix, code: chunks(read(THEMES_FILE)) }; };
const SHARED = new Map();
const dirOf = dir => (dir instanceof URL ? fileURLToPath(dir) : String(dir)).replace(/\/?$/, '/');
// A board's text as page() made it (design/canvas/project, or a saved copy of it with its own shared files).
export function readBoard(dir, file) {
  const d = dirOf(dir);
  return expandBoard(readFileSync(d + file, 'utf8'), () => {
    if (!SHARED.has(d)) SHARED.set(d, sharedFrom(f => { try { return readFileSync(d + f, 'utf8'); } catch { return ''; } }));
    return SHARED.get(d);
  });
}

// The shared files.
const JS_END = '\n//@@end\n', CSS_END = '/*@@end*/\n';
const logicFile = s => `'use strict';
// Made by design/build.mjs (design/slim.mjs). The logic every board of the canvas shares, kept here once instead of in
// each board: a board's script is \`class Component extends LucidaLogic(DCLogic, n) { its own logic }\`, where n adds rich()
// (1) and drag() (2). Each board gets classes of its own, so their static caches are its own, as they were.
globalThis.LucidaLogic = (DCLogic, n) => {
let Component = class extends DCLogic {
//@@base
${s.base}${JS_END}};
if (n & 1) Component = class extends Component {
//@@rich
${s.rich}${JS_END}};
if (n & 2) Component = class extends Component {
//@@drag
${s.drag}${JS_END}};
return Component;
};
`;
const themesFile = code => `'use strict';
// Made by design/build.mjs (design/slim.mjs). The themes' code (web/themes: the kit, then each theme), kept here once for
// the boards that draw a theme: \`static { LucidaCanvasThemes(["aero"]); }\` in a board's logic does what its own copy of the
// code did. It runs the kit, then puts each theme it names in globalThis.LucidaThemes, if it isn't there yet.
globalThis.LucidaCanvasThemes = __keys => {
  const T = globalThis.LucidaThemes || (globalThis.LucidaThemes = {});
  if (__keys.some(k => !T[k])) {
//@@kit
${code.kit}${JS_END}  const __code = {
${THEME_KEYS.map(k => `${JSON.stringify(k)}: () => {\n//@@${k}\n${code[k]}${JS_END}return __theme;\n}`).join(',\n')}
  };
  for (const __k of __keys) if (!T[__k]) T[__k] = make(__code[__k]());
  }
};
`;
const cssFile = prefix => `/* Made by design/build.mjs (design/slim.mjs). The CSS every board starts with, kept here once instead of in each board.
   A board's <style> imports it first, so each rule keeps its place, and the board's <head> links it, so it's there from
   the first paint. */
/*@@prefix*/
${prefix}${CSS_END}`;

// design/build.mjs: [[name, text from page(), its opts]] → { boards: [[name, slim text]], files: { shared file: text } }.
// rich and drag are the two methods page() adds to the boards that use them.
export function slimBoards(list, { rich, drag }) {
  const code = themeCode(), seen = {}, whole = [];
  // The parts every board has in common must really be the same in every board.
  const same = (k, v) => (seen[k] === undefined ? ((seen[k] = v), true) : seen[k] === v);
  const slim = list.map(([name, full, opts]) => {
    const css = opts.css || '', logic = opts.logic || '', p = partsOf(full);
    let text = full, themes = false;
    if (!p) return { name, full, text, themes, imports: [] };
    // The logic: what comes before the board's own logic is the shared class (with rich() and drag() if it uses them).
    const js = full.slice(p.js, p.jsEnd), head = js.slice(0, js.length - logic.length - 3);
    const n = (logic.includes('this.rich(') ? 1 : 0) | (logic.includes('this.drag(') ? 2 : 0), rd = (n & 1 ? rich : '') + (n & 2 ? '\n' + drag : '') + '\n';
    if (js.endsWith('\n' + logic + '\n}\n') && head.startsWith(CLASS) && head.endsWith(rd) && same('base', head.slice(CLASS.length, head.length - rd.length))) {
      const own = logic.replace(THEME_BLOCK, block => {
        const m = /^static \{ \/\* themes for the canvas \*\/\n {2}const T = [^\n]*\n {2}if \(([^)]*)\) \{\n/.exec(block), keys = m ? m[1].split(' || ').map(c => c.slice(3)) : [];
        if (!m || block !== themeStatic(keys, code)) return block;
        themes = true;
        return themeCall(keys);
      });
      text = splice(text, p.js, p.jsEnd, `\nclass Component extends LucidaLogic(DCLogic, ${n}) {\n${own}\n}\n`);
    }
    // The CSS: the helmet's <style> is the shared start, then the board's own.
    const style = full.slice(p.style, p.styleEnd);
    if (style.endsWith(css + '\n') && same('prefix', style.slice(0, style.length - css.length - 1))) text = splice(text, p.style, p.styleEnd - css.length - 1, IMPORT);
    const xdc = full.slice(full.indexOf('<x-dc>'), full.indexOf('</x-dc>'));
    return { name, full, text, themes, imports: [...new Set([...xdc.matchAll(/<dc-import\b[^>]*?\sname="([^"]+)"/g)].map(m => m[1]))] };
  });
  // A board runs the logic of the boards it imports, so it needs the themes' code if any of them does.
  const byName = new Map(slim.map(b => [b.name, b])), memo = new Map();
  const needs = (b, path = new Set()) => {
    if (memo.has(b.name)) return memo.get(b.name);
    if (path.has(b.name)) return false;
    path.add(b.name);
    const v = b.themes || b.imports.some(i => byName.has(i) && needs(byName.get(i), path));
    memo.set(b.name, v);
    return v;
  };
  const s = { base: seen.base, rich, drag, prefix: seen.prefix, code };
  for (const [k, v] of Object.entries({ base: s.base, rich, drag, ...code })) if (v && v.includes(JS_END)) throw new Error('design/slim.mjs: the shared ' + k + ' code holds the end marker ' + JSON.stringify(JS_END));
  if (s.prefix && s.prefix.includes(CSS_END)) throw new Error('design/slim.mjs: the shared CSS holds its end marker');
  const files = { [LOGIC_FILE]: logicFile(s), [THEMES_FILE]: themesFile(code), [CSS_FILE]: cssFile(s.prefix || '') };
  // Read back the way readBoard() reads: every board must come back as page() made it, or it stays whole. A whole board
  // still loads the shared files, for the boards it imports.
  const back = sharedFrom(f => files[f]);
  const boards = slim.map(b => {
    const at = b.full.indexOf(SUPPORT) + SUPPORT.length, head = t => (at < SUPPORT.length ? t : splice(t, at, at, HEAD + (needs(b) ? HEAD_THEMES : '')));
    if (b.text !== b.full && expandBoard(head(b.text), back) === b.full) return [b.name, head(b.text)];
    whole.push(b.name);
    return [b.name, expandBoard(head(b.full), back) === b.full ? head(b.full) : b.full];
  });
  if (whole.length) console.log('design/slim.mjs: ' + whole.length + ' boards kept whole (their shared code could not be taken out):', whole.join(', '));
  return { boards, files };
}
