// Turns the design canvas boards (canvas/project/*.dc.html) into screens for the web app (web/screens/*.js).
// Each screen keeps its board's markup, styles, and logic as they are, so the app looks and works like the canvas.
// Web boards (1440 x 900) are stretched to fill the browser window, and so are the phone pages the app shows on a phone;
// the others keep their size.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';

const SRC = new URL('./canvas/project/', import.meta.url);
const OUT = new URL('../web/screens/', import.meta.url);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const list = [];
for (const file of readdirSync(SRC).filter(f => f.endsWith('.dc.html')).sort()) {
  const src = readFileSync(new URL(file, SRC), 'utf8');
  const name = file.replace('.dc.html', '');
  const title = src.match(/<title>([^<]*)<\/title>/)[1];
  const body = src.split('<x-dc>')[1].split('</x-dc>')[0];
  const css = (body.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1].trim();
  const raw = JSON.parse(src.match(/data-props='([^']*)'/)[1]);
  const { width: w, height: h } = raw.$preview;
  const props = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== '$preview').map(([k, v]) => [k, v.default]));
  const logic = src.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0].trim();
  let template = body.replace(/<helmet>[\s\S]*?<\/helmet>/, '').trim();
  // Phone pages fill the phone's screen. Sign-in and Learn mode grow with what's on them; the app's other pages are the
  // screen's height and scroll inside (like the iPhone app), so the tab bar, sheets, and anything pinned to the bottom
  // stay on screen. Inside another board (a page behind a sheet, or the dark and other versions on /b), a page takes
  // that board's height instead.
  const grow = ['PhoneSignIn', 'PhoneSignInCode', 'PhoneQuizStart', 'PhoneQuizUpgrade', 'PhoneQuiz', 'PhoneQuizMatch', 'PhoneQuizType', 'PhoneQuizDone'];
  const phoneFill = [...grow, 'PhoneToday', 'PhoneTodayNew', 'PhoneDeck', 'PhoneDeckEmpty', 'PhoneEditor', 'PhoneReview', 'PhoneDone', 'PhoneDonePiles',
    'PhoneStats', 'PhoneStatsEmpty', 'PhoneConnect', 'PhoneSettings', 'PhoneNewDeck', 'PhoneLibrary', 'PhoneDecksEmpty'].includes(name), fill = (w === 1440 && h === 900) || phoneFill;
  if (phoneFill) template = template.replace(/width: 390px; height: \d+px;/, grow.includes(name) ? 'width: 100%; min-height: 100vh; min-height: 100dvh;' : 'width: 100%; height: 100vh; height: 100dvh; min-height: 100%; max-height: 100%;');
  else if (fill) {
    template = template.replace('width: 1440px; height: 900px;', 'width: 100%; height: 100vh;');
    template = template.replace(/<main style="/g, '<main style="overflow-y: auto; ');
  }
  const imports = [...new Set([...template.matchAll(/<dc-import\s+name="([^"]+)"/g)].map(m => m[1]))];
  writeFileSync(new URL(name + '.js', OUT), `// Made from design/canvas/project/${file} by design/to-web.mjs. Change the design, not this file.
export default {
  name: ${JSON.stringify(name)}, title: ${JSON.stringify(title)}, w: ${w}, h: ${h}, fill: ${fill},
  props: ${JSON.stringify(props)},
  imports: ${JSON.stringify(imports)},
  css: ${JSON.stringify(css)},
  template: ${JSON.stringify(template)},
  Logic: DCLogic => {
${logic}
return Component;
  }
};
`);
  list.push({ name, title, w, h });
}
writeFileSync(new URL('index.js', OUT), `// Every screen, for the screen list at /b. Made by design/to-web.mjs.\nexport default ${JSON.stringify(list, null, 1)};\n`);
console.log(list.length, 'screens');
