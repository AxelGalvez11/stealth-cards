// Mind maps of every shape, laid out by web/diagram.js (`layoutTree`) in node, for the iPhone's own layout (Data/DiagramLayout.swift) to match: ios/tests/diagram-check.sh runs both and
// compares every box (its place, size and lines of words) and every link. Writes <folder>/trees.json (the trees) and <folder>/expect.json (what node laid out).
//   node diagram-dump.mjs <folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import dg from '../../../web/diagram.js';

const out = process.argv[2];
if (!out) { console.error('usage: node diagram-dump.mjs <folder>'); process.exit(2); }
mkdirSync(out, { recursive: true });

const t = (text, ...children) => (children.length ? { text, children } : { text });
const trees = [];
// ---------- shapes that matter ----------
trees.push(t('Only a topic'));
trees.push(t('Topic', t('One idea')));
trees.push(t('Topic', t('One idea', t('One detail'))));
trees.push(t('The cell', t('Organelles', t('Nucleus'), t('Ribosome'), t('Golgi apparatus')), t('Energy', t('ATP'), t('Glycolysis'), t('Krebs cycle'), t('Electron transport chain')), t('Membrane', t('Phospholipids'), t('Channel proteins'))));
trees.push(t('Full', ...Array.from({ length: 8 }, (_, i) => t('Main idea ' + (i + 1), ...Array.from({ length: 8 }, (_, j) => t('Detail ' + (i + 1) + '.' + (j + 1)))))));
trees.push(t('Twelve', ...Array.from({ length: 12 }, (_, i) => t('Idea ' + i))));
trees.push(t('Thirteen (the last one is not drawn)', ...Array.from({ length: 13 }, (_, i) => t('Idea ' + i, t('Detail')))));
trees.push(t('', t(''), t('   ', t(' '))));
trees.push(t('A'.repeat(60), t('B'.repeat(60), t('C'.repeat(60)))));
trees.push(t('Several short words that go on and on and on until they have to wrap onto lines', t('And so does this main idea, which is longer than it needs to be', t('A detail with many words in it that wraps too, three or four lines of it'))));
trees.push(t('Naïve café 日本語 🙂 ñandú', t('Émile Zola', t('Æsop’s fables')), t('😀😃😄😁😆😅😂🤣🙂🙃😉😊😇', t('日本語のテキストはスペースがありません日本語のテキストはスペースがありません'))));
trees.push(t('Tabs\tand\nnew lines   and  runs', t('a\t\tb'), t('c\n\nd')));
trees.push(t('Deep', t('One', t('Two', t('Three', t('Four', t('Five', t('Six'))))))));
trees.push(t('Lopsided', t('Big', ...Array.from({ length: 12 }, (_, i) => t('Detail number ' + i))), t('Small', t('Just one'))));
// ---------- a lot of random ones ----------
let seed = 20261001;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const WORDS = ['cell', 'membrane', 'energy', 'a', 'the', 'mitochondrion', 'photosynthesis', 'DNA', 'RNA', 'protein', 'glucose', 'electron', 'transport', 'chain', 'ATP', 'Krebs', 'cycle', 'nucleus', 'ribosome', 'Golgi', 'apparatus', 'endoplasmic', 'reticulum', 'lysosome', 'osmosis', 'diffusion', 'concentration', 'gradient', 'phospholipid', 'bilayer', 'supercalifragilisticexpialidocious', 'x', 'résumé', '日本', '🙂'];
const words = () => Array.from({ length: 1 + Math.floor(rnd() * (rnd() < 0.2 ? 12 : 4)) }, () => pick(WORDS)).join(' ');
const node = (depth, max) => { const kids = depth >= max ? 0 : Math.floor(rnd() * (depth === 0 ? 9 : 7)); return kids ? t(words(), ...Array.from({ length: kids }, () => node(depth + 1, max))) : t(words()); };
for (let i = 0; i < 400; i++) trees.push(node(0, 1 + Math.floor(rnd() * 4)));

const expect = trees.map(tree => dg.layoutTree(tree));
writeFileSync(out + '/trees.json', JSON.stringify(trees));
writeFileSync(out + '/expect.json', JSON.stringify(expect));
console.log(trees.length + ' trees, ' + expect.reduce((n, g) => n + g.nodes.length, 0) + ' boxes laid out by web/diagram.js → ' + out);
