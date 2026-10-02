// The web's card reader for Import cards (design/build.mjs READ_CARDS_JS, taken from the built WebImport board, with web/rich.js), for the
// iPhone app's copy (Data/ReadCards.swift) to be checked against. It runs in Chrome (design/chrome.mjs), as the web app does: a field with
// HTML in it (Anki's <b>, <br>) is read by the browser's own HTML parser there, which node doesn't have.
//   node import-js.mjs make <cases.json>              the texts: the web's own samples, the cases that are easy to get wrong, and made-up ones
//   node import-js.mjs <cases.json> <out.json>        what the web reads from each: [[deck name, cards], ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { withChrome } from '../../../design/chrome.mjs';
import { readBoard } from '../../../design/slim.mjs';

const REPO = new URL('../../../', import.meta.url);

if (process.argv[2] === 'make') {
  const cases = [];
  const add = (name, text, deck = '') => cases.push({ name, text, deck });
  // The web's own samples: the Import board's, the welcome's (Quizlet, pasted text), and the reviewer account's library.
  add('the Import board’s sample', 'でんしゃ\ttrain\nねこ\tcat\nみず\twater');
  add('the welcome’s Quizlet sample', 'hablar\tto speak\ncomer\tto eat\nvivir\tto live\ntener\tto have\nhacer\tto do', 'Spanish verbs');
  add('the welcome’s pasted sample', 'Capital of Peru, Lima\nLargest ocean, Pacific\nH₂O, Water', 'My cards');
  add('samples/reviewer-library.txt', readFileSync(new URL('samples/reviewer-library.txt', REPO), 'utf8'), 'reviewer-library');
  add('Anki notes in plain text: headers, HTML, cloze, a deck column', '#separator:tab\n#html:true\n#guid column:1\n#notetype column:2\n#deck column:3\n#tags column:6\nabc123\tBasic\tBio::Cells\tWhat makes most of the cell’s energy?<br>(one word)\t<b>The mitochondria</b>\ttag1\ndef456\tCloze\tBio::Cells\tThe {{c1::nucleus}} holds the {{c2::DNA}}.\t\tt2\nghi789\tBasic (and reversed card)\tBio::Genetics\tAdenine pairs with\tthymine\t');
  add('a Quizlet copy', 'hablar\tto speak\ncomer\tto eat');
  add('CSV with quotes and commas', 'front,back\n"Capital of Peru, Lima",Lima\n"Hello, world","Hola, mundo"');
  add('an image field from Anki', '#separator:tab\n#html:true\n<img src="cell.jpg">\tCell diagram\nWhat is this?\t[sound:ok.mp3]ok');
  // What is easy to get wrong.
  add('quotes', '"Capital of Peru, Lima",Lima\n"He said ""hi""",a greeting\n"a ""quoted"" word";back\n"never closed, here,back\nfront,"back, with a comma"\n say "hi" , hello \n"",empty front\n""""\t""""');
  add('empty lines', '\n\nfront,back\n\n\n  \n\t\nfront2\tback2\n\n\n');
  add('a BOM', '﻿front\tback\nfoo\tbar');
  add('a BOM before Anki’s headers', '﻿#separator:comma\n#deck column:1\nDeck A,q1,a1\nDeck B,q2,a2');
  add('a BOM inside a field', 'a﻿,﻿b﻿\n﻿\n﻿ ﻿,x');
  add('CRLF', 'a\tb\r\nc\td\r\n\r\ne,f\r\n');
  add('CRLF with Anki’s headers', '#separator:tab\r\n#deck column:3\r\nq\ta\tDeck::Sub\r\nq2\ta2\tOther\r\n');
  add('a lone CR', 'a,b\rc,d\r');
  add('tabs inside quotes, split by tabs', '#separator:tab\n"a\tb"\tc\n"x"\t"y\tz"\n\t"lead"\tx');
  add('tabs inside quotes, no header', '"a\tb",c\n"x\ty"\tz\nq\t"r\ts"');
  add('semicolons', 'one;two\nthree;four;five\n"a;b";c');
  add('a dash', 'chat - cat\nchien - dog - hound\na-b - c');
  add('other separators', '#separator:pipe\na|b|c\n"x|y"|z');
  add('a colon', '#separator:colon\nkey:value\n"a:b":c');
  add('a space', '#separator:space\nword meaning\ntwo  spaces');
  add('Pipe in capitals', '#Separator:Pipe\na|b');
  add('an unknown separator', '#separator:star\na*b\nc,d');
  add('cloze', '{{c1::Paris}} is the capital of France\t\n{{c1::H2O::formula}} is water\ta note\n{{c1::}} is empty\n{{c12::x}} and {{c3::y::hint}}\tn\n{{c1::a}}{{c1::b}}\t');
  add('column numbers', '#deck column: 2\n#tags column:+3\n#notetype column:0\n#guid column:abc\nq\tDeck::Sub\ttag\ta\nq2\t\tt\ta2');
  add('a deck column past the end', '#separator:tab\n#deck column:9\nq\ta');
  add('Unicode spaces', ' front , back \n x ,y\n　a　\t　b　\nz,\u0085y\u0085');
  add('line and paragraph separators', 'a b,c\nd,e \n ');
  add('HTML entities', 'Tom &amp; Jerry,cartoon\nx &lt; y,less\n&nbsp;a,b\n&#233;t&#xe9;,summer\n&quot;q&quot;,quote');
  add('HTML styles and lines', '<b>bold</b> word,<i>it</i>\n<div>line1</div><div>line2</div>,back\n<ul><li>one</li><li>two</li></ul>,list\n<span style="font-weight: bold">B</span>,<u>u</u> <s>s</s>\n<p>para</p><br>,x');
  add('comments and a header row', '# a comment\n#just text\nfront,back\nterm,definition');
  add('marks Lucida reads', '**bold**,*it*\n==hl==,~~s~~\n$x^2$,\\(y\\)\n- a list,1. one');
  add('combining marks and emoji', 'été,summer\n😀,face\n👩‍👩‍👧,family\na,́b\n"́x",y');
  add('a semicolon header', '#separator:semicolon\n#deck column:1\nLangues::Français;bonjour;hello\n;q;a');
  add('lots of cards', Array.from({ length: 3000 }, (_, i) => `front ${i}\tback ${i}`).join('\n'));
  // Made-up texts, from pieces that matter to the reader (a fixed shuffle, so every run asks the same).
  // (IMPORT_FUZZ and IMPORT_SEED make more of them, or others.)
  let seed = +process.env.IMPORT_SEED || 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const PLAIN = ['a', 'b', 'word', 'Zebra', 'é', 'ß', 'ñ', '日本', '😀', 'é', '1', '42', ' ', '  ', '\t', '\t', ',', ',', ';', '"', '""', ' - ', '-', '|', ':', '::', '\n', '\n', '\n', '\r\n', '\r',
    '﻿', ' ', ' ', '\u0085', '　', '#', '*', '**', '$', '\\', '[[', ']]', '{{c1::', '}}', '{{c2::x::hint}}', 'Deck::Sub', '#separator:tab\n', '#separator:comma\n',
    '#separator:semicolon\n', '#separator:pipe\n', '#separator:colon\n', '#separator:space\n', '#deck column:1\n', '#deck column:3\n', '#tags column:2\n', '#notetype column:1\n', '#guid column:2\n', '#html:true\n'];
  const HTML = ['<b>', '</b>', '<br>', '<br/>', '<i>', '</i>', '<u>', '</u>', '&amp;', '&nbsp;', '&lt;', '&#39;', '<div>', '</div>', '<p>', '</p>', '<span style="font-weight:bold">', '<span style="font-style: italic">',
    '</span>', '<mark>', '</mark>', '<ul><li>', '</li><li>', '</li></ul>', '<ol><li>', '</li></ol>', '<h1>', '</h1>', '<font color="red">', '</font>', '<sup>', '</sup>'];
  for (let i = 0; i < (+process.env.IMPORT_FUZZ || 1200); i++) {
    const html = i % 3 === 2, n = 4 + Math.floor(rnd() * 40);
    let t = '';
    for (let j = 0; j < n; j++) t += html && rnd() < 0.3 ? pick(HTML) : pick(PLAIN);
    add('made up ' + (html ? 'with HTML ' : '') + i, t, rnd() < 0.5 ? '' : 'Mine');
  }
  writeFileSync(process.argv[3], JSON.stringify(cases));
} else {
  // The board's own code: from `const splitAt` to the end of readCards, as the web app runs it (web/screens/WebImport.js is made from this board).
  const src = readBoard(new URL('design/canvas/project/', REPO), 'WebImport.dc.html');
  const logic = src.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  const a = logic.indexOf('const splitAt'), b = logic.indexOf('return [...decks];', a);
  if (a < 0 || b < 0) throw new Error('readCards is not in the WebImport board any more');
  const code = logic.slice(a, b) + 'return [...decks];\n  };';
  const rich = readFileSync(new URL('web/rich.js', REPO), 'utf8').replace(/^export default[^\n]*$/m, '').replace(/^export function makeRich/m, 'function makeRich');
  const cases = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const out = await withChrome(page => page.run(`(() => { ${rich}
    const R = makeRich();
    if (typeof DOMParser === 'undefined') throw new Error('no DOMParser');
    const readCards = (function () { ${code}
      return readCards; }).call({ rich: () => R });
    return ${JSON.stringify(cases)}.map(c => readCards(c.text, c.deck));
  })()`));
  writeFileSync(process.argv[3], JSON.stringify(out));
}
