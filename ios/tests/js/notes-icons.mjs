// The Notes page's own icons on the iPhone (Design/NotesViews.swift NotesIcons) are web/notes.js's (and its bin is design/materials.mjs's): the same SVG, letter for letter.
//   node ios/tests/js/notes-icons.mjs <repo>
import { readFileSync } from 'node:fs';
const repo = process.argv[2] || '.';
const js = readFileSync(repo + '/web/notes.js', 'utf8'), mats = readFileSync(repo + '/design/materials.mjs', 'utf8'), swift = readFileSync(repo + '/ios/Lucida/Design/NotesViews.swift', 'utf8');
const web = Function('return (' + /const SVG = (\{[\s\S]*?\n  \});/.exec(js)[1] + ')')();
web.bin = Function('return (' + /const EXTRA = (\{[\s\S]*?\});/.exec(mats)[1] + ')')().bin;
const body = /static let svg: \[String: String\] = \[([\s\S]*?)\]\n/.exec(swift)[1], ios = {};
for (const m of body.matchAll(/"(\w+)": "((?:[^"\\]|\\.)*)"/g)) ios[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const names = Object.keys(ios), bad = names.filter(n => ios[n] !== web[n]);
console.log(bad.length ? 'notes icons: these differ from the web’s: ' + bad.join(', ') : 'notes icons: the iPhone’s ' + names.length + ' are the web’s');
process.exit(bad.length || names.length < 14 ? 1 : 0);
