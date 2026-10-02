// Nothing the browser, Google or iOS draws itself (the owner, 2026-10-01: "all buttons and actions need to have ui? i dont want anything that has ios or
// google default ui"). Every button, action, menu, dialog, picker, message and loading state is Lucida's own (design/ui.mjs on the web and the canvas,
// ios/Lucida/Design/Question.swift, Toast.swift, DatePicker.swift, Menus and Camera.swift on the iPhone). This reads the code and says where one slipped back in:
//   web:    confirm(), alert(), prompt(), <select>, a date / time / number / range / color / checkbox / radio <input>, <audio controls>, <video controls>,
//           and a title="" tooltip (a tooltip is data-tip, drawn by web/tip.js).
//   iPhone: .alert, .confirmationDialog, UIAlertController, a system Menu, Picker, DatePicker, Stepper, ProgressView, Toggle, Form, List, .toolbar items,
//           UIImagePickerController, .refreshable, .contextMenu, .popover and a keyboard toolbar.
// What stays (Apple and Google require these, or a custom one would be worse): the permission questions (camera, microphone, photos, notifications), Sign in
// with Apple's sheet and Google's account window, the App Store's purchase sheet, the keyboard (and the text editing menu), the computer's file chooser and the
// iPhone's Files picker and photo library picker, the share sheet, and the browser's own leave-the-page question.
// `node design/check-own-ui.mjs` (no arguments) checks the boards, the web app, the iPhone app and the tests' stand-ins; it exits 1 when it finds one.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readBoard } from './slim.mjs';

// Comments say what they replaced; they are not code.
const strip = s => s.replace(/(^|\s)\/\/\s.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, ' ');
const WEB = [
  [/\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/, 'the browser’s confirm(), alert() or prompt()'],
  [/<select\b/i, 'a <select>'],
  [/<input\b[^>]*\stype=["'](?:date|time|datetime-local|month|week|color|range|number|checkbox|radio)["']/i, 'a browser form control (date, time, number, range, color, checkbox or radio)'],
  [/<(?:audio|video)\b[^>]*\scontrols\b/i, 'a browser player (controls)'],
  [/<(?!title\b)[a-z][^<>]*\stitle=/i, 'a title="" tooltip (use data-tip)']
];
export const webProblems = text => { const t = strip(text); return WEB.filter(([re]) => re.test(t)).map(([, what]) => what); };

const SWIFT = [
  [/\.alert\s*\(/, 'a system .alert'], [/\.confirmationDialog\s*\(/, 'a system .confirmationDialog'], [/\bUIAlertController\b/, 'UIAlertController'],
  [/(?<![A-Za-z.])Menu\s*[({]/, 'a system Menu'], [/(?<![A-Za-z.])Picker\s*\(/, 'a system Picker'], [/\bDatePicker\s*\(/, 'a system DatePicker'], [/(?<![A-Za-z.])Stepper\s*\(/, 'a system Stepper'],
  [/\bProgressView\b/, 'the system ProgressView'], [/(?<![A-Za-z.])Toggle\s*[({]/, 'a system Toggle'], [/(?<![A-Za-z.])(?:Form|List)\s*\{/, 'a system Form or List'],
  [/\.toolbar\s*\{/, 'system toolbar items'], [/\bToolbarItem(?:Group)?\b/, 'system toolbar items'], [/\bUIImagePickerController\b/, 'UIImagePickerController (the system camera)'],
  [/\.refreshable\b/, 'the system pull to refresh'], [/\.contextMenu\b/, 'a system context menu'], [/\.popover\s*\(/, 'a system popover'], [/\binputAccessoryView\b/, 'a keyboard toolbar'],
  [/\.navigationTitle\s*\(/, 'a system navigation title'], [/\.searchable\s*\(/, 'the system search field'], [/\bColorPicker\b/, 'ColorPicker'], [/\bUIDatePicker\b/, 'UIDatePicker'], [/\bUIMenu\b/, 'UIMenu']
];
export const swiftProblems = text => { const t = strip(text); return SWIFT.filter(([re]) => re.test(t)).map(([, what]) => what); };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url), at = p => fileURLToPath(new URL(p, root));
  let bad = 0;
  const say = (where, what) => { bad++; console.log(where + ': ' + what.join(', ')); };
  // The canvas's boards, with the code they share put back.
  const boards = new URL('./canvas/project/', import.meta.url);
  for (const f of readdirSync(boards).filter(f => f.endsWith('.dc.html')).sort()) { const p = webProblems(readBoard(boards, f)); if (p.length) say('design/canvas/project/' + f, p); }
  // The web app's code, and the code that makes the boards and the site.
  for (const dir of ['web', 'design']) {
    for (const f of readdirSync(at(dir)).filter(f => /\.(js|mjs)$/.test(f) && !/^check/.test(f) && !/^(?:snapshot|screens|art|og|site-measure)\.mjs$/.test(f))) {
      const p = webProblems(readFileSync(at(dir + '/' + f), 'utf8')); if (p.length) say(dir + '/' + f, p);
    }
  }
  for (const f of ['web/app.html', 'web/handler.mjs']) if (existsSync(at(f))) { const p = webProblems(readFileSync(at(f), 'utf8')); if (p.length) say(f, p); }
  // The iPhone app.
  const swift = d => readdirSync(at(d), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? swift(d + '/' + e.name) : /\.swift$/.test(e.name) ? [d + '/' + e.name] : []));
  for (const f of swift('ios/Lucida')) { const p = swiftProblems(readFileSync(at(f), 'utf8')); if (p.length) say(f, p); }
  console.log(bad ? bad + ' places still use what the browser or the phone draws itself' : 'nothing the browser or the phone draws itself');
  process.exit(bad ? 1 : 0);
}
