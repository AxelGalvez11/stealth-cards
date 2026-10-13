// The MCP link: Claude, Cursor, or any app that speaks MCP can read and add cards. On this computer it's
// http://localhost:3000/mcp; online each person has their own link (see handler.mjs), so an AI only sees their cards.
// What an AI may do is set on the Connect AI page; tools it isn't allowed to use aren't offered.
import { apply, state, blanks, mediaLeft, MEDIA_FULL, BG_KINDS, isPro, tunedW, pageScope, uidOf, touchDeck, marksOf } from './store.mjs';
import * as pages from './pages.mjs';
import { moveGuide } from './guidemove.mjs';
import { moveMaps } from './mapmove.mjs';
import maps from './maps.js';
import { noteToMarkdown } from './pageblocks.js';
import * as social from './social.mjs';
import { LEVELS, SUBJECTS, levelWords, subjectWords } from './school.js';
import { dayAt } from './fsrs.js';
import { isDue, scheduled, examStatus, toneOf } from './sched.js';
import { insights, history } from './insights.js';
import { fetchMedia, speechFile } from './media.mjs';
import R from './rich.js';
import { SCOPES, challenge } from './oauth.mjs';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
// Which AI app each session is, and the last one each person connected (for sessions that don't say).
const sessions = new Map(), lastClient = new Map();
const text = s => ({ content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] });
const fail = s => ({ content: [{ type: 'text', text: s }], isError: true });
const deckBy = x => state().decks.find(d => d.id === x) || state().decks.find(d => d.name.toLowerCase() === String(x || '').trim().toLowerCase());
// Due now, the way the app sees it: paused cards never are, and an exam date brings cards up early (sched.js).
const dueNow = c => { const d = deckBy(c.deckId); return scheduled(d) ? isDue(c, d, Date.now()) : false; };
const isNew = c => c.srs.state === 'new' && !c.paused && !c.pending;
const day = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const examOut = d => { const x = d.exam && examStatus(state().cards.filter(c => c.deckId === d.id), d, Date.now()); return x ? { date: d.exam, days_left: x.days, cards_to_review_first: x.toReview, not_studied_yet: x.total - x.seen } : undefined; };
const forgotten = c => ((c.srs.lapses || 0) ? c.srs.lapses : undefined);
const cardOut = c => ({ id: c.id, deck: (deckBy(c.deckId) || {}).name, kind: c.kind === 'cloze' ? 'fill in the blank' : c.kind, front: c.front || undefined, back: c.back || undefined,
  text: c.text || undefined, note: c.note || undefined, image: c.image || undefined, audio: c.audio || undefined, speak: c.speak || undefined, lang: c.lang || undefined,
  hidden_part: c.kind === 'image' && c.box != null ? (b => b && { box: c.boxes.indexOf(b) + 1, of: c.boxes.length, answer: b.label || undefined })((c.boxes || []).find(b => b.id === c.box)) || undefined : undefined,
  tags: c.tags.length ? c.tags : undefined, waiting_for_review: c.pending || undefined, paused: c.paused || undefined, quiz_questions: (c.quiz || []).length || undefined, has_explanation: c.explain ? true : undefined,
  next_review: c.srs.state === 'new' ? 'new' : new Date(c.srs.due).toISOString().slice(0, 10) });
// Card text is short markdown; the app shows it formatted (see rich.js).
const FORMAT = 'Can use **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, ==highlight==, $math$ in LaTeX (like $x^2$ or $\\frac{a}{b}$), and lines that start with "# " (a heading; ## and ### are smaller), "- " (a bullet), or "1. " (a numbered list).';
// Pictures and sound: a link, an uploaded file ("file:N" from `files`), or a path on this computer (see media.mjs).
const SOURCE = 'A link (https://…), "file:0" for the first file in "files" (a file the learner uploaded in this chat), "file:1" for the second, and so on, a data URL with the file itself ("data:image/png;base64,…", for a picture or sound you made), or the full path of a file on this computer (only for AI apps running on the same computer as Lucida).';
const MEDIA_PROPS = {
  image: { type: 'string', description: 'The picture for an image card (PNG, JPEG, GIF, or WebP). ' + SOURCE },
  audio: { type: 'string', description: 'A sound file for an audio card (MP3, M4A, WAV, OGG, or WebM), if you have one. Usually leave this out and use "speak". ' + SOURCE },
  speak: { type: 'string', description: 'For audio cards: the words the learner hears. Lucida turns them into speech.' },
  lang: { type: 'string', description: 'The language of "speak", like "es", "fr", or "ja", so it sounds right.' } };
const FILES = { type: 'array', description: 'Files the learner uploaded in this chat (pictures or sound). A card uses them with "file:0", "file:1", and so on.',
  items: { type: 'object', properties: { download_url: { type: 'string' }, file_id: { type: 'string' }, mime_type: { type: 'string' }, file_name: { type: 'string' } }, required: ['download_url', 'file_id'] } };
const CARD = { type: 'object', properties: {
  kind: { type: 'string', enum: ['basic', 'cloze', 'image', 'audio'], description: 'basic: question on the front, answer on the back. cloze: fill in the blank, with the hidden words in [[double brackets]] inside "text". image: a picture ("image") with an optional question in "front" and the answer on the back. audio: the learner hears "speak" read aloud (or the "audio" file) and the answer is on the back; good for languages and pronunciation.' },
  front: { type: 'string', description: FORMAT }, back: { type: 'string', description: FORMAT }, text: { type: 'string', description: 'For cloze cards, e.g. "The [[mitochondrion]] makes most of the cell’s **ATP**." ' + FORMAT },
  note: { type: 'string', description: 'Optional extra shown after the answer.' }, tags: { type: 'array', items: { type: 'string' } }, ...MEDIA_PROPS } };
// A card with a picture is an image card, and one with sound is an audio card, whatever kind was asked for.
const kindOf = c => { const k = ['basic', 'cloze', 'image', 'audio'].includes(c.kind) ? c.kind : 'basic'; return { ...c, kind: k === 'basic' && c.image ? 'image' : k === 'basic' && (c.speak || c.audio) ? 'audio' : k }; };
const problem = c => c.kind === 'cloze' ? (blanks(c.text).length ? '' : 'a cloze card needs [[blanks]] in its text')
  : c.kind === 'image' ? (!c.image ? 'an image card needs "image"' : !c.back ? 'an image card needs a back' : '')
  : c.kind === 'audio' ? (!(c.speak || c.audio) ? 'an audio card needs "speak" (or a sound file in "audio")' : !c.back ? 'an audio card needs a back' : '')
  : c.front && c.back ? '' : 'a basic card needs a front and a back';
const NO_MEDIA = 'The learner turned off image and audio cards on the Connect AI page.';
const FOLDER = { type: 'string', description: 'A folder to put it in (by name), made if there isn’t one yet.' };
const COVER = { type: 'string', description: 'A cover picture for the deck. ' + SOURCE };
const folderName = d => (state().folders.find(f => f.id === d.folder) || {}).name || undefined;
// The id of the folder with this name, made if needed.
const folderFor = (name, who) => (state().folders.find(f => f.name.toLowerCase() === String(name).trim().toLowerCase()) || { id: apply({ type: 'folder.add', name }, who).id }).id;
const DEVICE_VOICE = 'No voice key is set up, so the app reads audio cards aloud with the device’s voice.';
// Natural voices for sound cards are Pro; on Free the app reads the words aloud with the device's voice. Photo covers are free.
const FREE_VOICE = 'Natural voices are part of Lucida Pro, so the app reads these aloud with the device’s voice.';
// Free's limit on pictures and sound is counted before each one is fetched or spoken (`room.left`), so nothing is fetched, or
// paid for, past it. Pro has no limit (Infinity).
const take = room => { if (room.left < 1) throw Object.assign(new Error(MEDIA_FULL), { full: true }); room.left--; };
// Fetches a card's picture and sound (or makes its speech) and keeps only the fields a card has.
async function withMedia(c, files, ctx, notes, room) {
  const card = { kind: c.kind, front: c.front, back: c.back, text: c.text, note: c.note, tags: c.tags, speak: c.speak, lang: c.lang };
  try {
    if (c.kind === 'image') { take(room); card.image = await fetchMedia(c.image, 'image', { files, local: ctx.local }); }
    if (c.kind === 'audio') { if (c.audio) { take(room); card.audio = await fetchMedia(c.audio, 'audio', { files, local: ctx.local }); } else card.audio = await speakFile(c.speak, c.lang, notes, room); }
  } catch (e) { throw e.full ? e : new Error('Card “' + String(c.front || c.back || c.speak || c.text || '').slice(0, 40) + '”: ' + e.message); }
  return card;
}
async function speakFile(words, lang, notes, room) {
  if (!isPro()) { notes.add(FREE_VOICE); return null; }
  try { if (room) take(room); const url = await speechFile(R.plain(words, { join: ' ', math: 'show' }), lang); if (!url) notes.add(DEVICE_VOICE); return url; }
  catch (e) { if (e.full) throw e; notes.add(e.message + ' Those cards use the device’s voice for now.'); return null; }
}

// Pages (pages.mjs).
const CHECK_PAGE = 'The learner asked to check AI changes first, and a page can’t wait for that check. Show them what you would write in the chat instead.';
const notReady = pages.notReady;
// What is said about pages follows PAGE_READY (pages.mjs): a kind's help is in the tools only once the apps can show it, so these
// are worked out each time the tools are listed (a test may make a kind ready for a while).
const ready = k => pages.PAGE_READY.has(k);
const MAP_ORDER = ['mindmap', 'diagram'];
const mapKinds = () => MAP_ORDER.filter(ready);
const mapsOn = () => mapKinds().length > 0;
const orWords = list => (list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' or ' + list[list.length - 1]);
const andWords = list => (list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]);
// "a Mind map or a Diagram", "a mind map or a diagram"
const mapNames = (lower = false) => orWords(mapKinds().map(k => 'a ' + (lower ? pages.KIND_NAMES[k].toLowerCase() : pages.KIND_NAMES[k])));
const PLURAL = { note: 'notes', slides: 'presentations', mindmap: 'mind maps', diagram: 'diagrams', canvas: 'canvases', doc: 'docs' };
const coming = () => andWords(pages.KINDS.filter(k => !ready(k)).map(k => PLURAL[k]));
// What the AI app reads about Note blocks (create_page, and update_page while Notes are the only kind).
const NOTE_HELP_HEAD = 'A Note’s blocks, each an object with a type (keep an existing block’s id when you change it; new ones get one): ' +
  '{type:"heading", level:1|2|3, text} · {type:"text", text} · {type:"list", style:"bullet"|"number"|"todo", items:[{text, checked?, items?}]} · ' +
  '{type:"callout", style:"trap"|"pearl"|"mnemonic"|"note", title?, text} (a trap: a mistake students make; a pearl: a high-yield fact; a mnemonic: a memory aid) · ' +
  '{type:"chain", steps:["Glycolysis","Pyruvate","Krebs cycle"]} (a → b → c sequence) · {type:"toggle", title, blocks:[...]} (folds; put answers and details inside) · ' +
  '{type:"table", header:["Stage","Where"], rows:[["Glycolysis","Cytoplasm"]]} · {type:"quote", text} · {type:"code", lang, text} · {type:"image", src, alt} · {type:"divider"} · ' +
  '{type:"card", cardId} (shows one of the deck’s cards; list_cards gives ids) · {type:"embed", pageId} ';
const NOTE_HELP_TAIL = '. text, title, steps and cells are Markdown inside a line (**bold**, *italic*, `code`, [links](https://…)). In Markdown instead: ":::trap", ":::pearl", ":::mnemonic", ":::note" or ":::toggle Title" then lines then ":::", ":::chain" then one step a line then ":::", and "::card <id>" or "::page <id>" on a line. ' +
  'Example: [{"type":"heading","level":1,"text":"Cellular respiration"},{"type":"chain","steps":["Glycolysis","Krebs cycle","Electron transport"]},{"type":"callout","style":"trap","text":"Glycolysis needs no oxygen."}]';
const noteHelp = () => NOTE_HELP_HEAD + (mapsOn() ? '(shows another page inside; ' + mapNames(true) + ' shows as its live picture)' : '(shows another page inside)') + NOTE_HELP_TAIL;
// Each map kind's help, written once (create_page), from design/specs/step4-maps.md §3.2.
const MINDMAP_HELP = 'MIND MAP (kind "mindmap"): one topic in the middle, broken into its ideas (a tree). Lucida lays it out and colors it by how well the learner knows each idea, so never send positions or colors. Easiest as text: an indented list, the topic on the first line, two spaces a level; "{#id}" at the end of a line keeps that idea’s id ("{#id folded}" also starts it folded, so the learner guesses what is under it before opening it; "{#id cards:c1,c2}" links the deck’s cards that test it), and a "> " line under an idea is its note: "The cell {#cell}\n- Mitochondria {#mito cards:c1}\n  > Most ATP is made on the inner membrane.\n  - Krebs cycle in the matrix\n  - Electron transport on the inner membrane\n- Nucleus\n  - Holds the DNA". Or as data: {"root":{"id":"cell","label":"The cell","children":[{"id":"mito","label":"Mitochondria","note":"Most ATP is made on the inner membrane.","cardIds":["c1"],"children":[{"label":"Krebs cycle in the matrix"}]}]}}. An idea has a label (the one thing to recall: a term or a few words, never a sentence; up to 80 characters) and may have an id (letters, digits, - and _, up to 40; Lucida makes one when you leave it out), a note (the explanation, up to 600 characters), cardIds (up to 8 of the deck’s cards; list_cards gives ids), folded (true) and children. Up to 200 ideas, 6 levels under the topic and 20 under one idea; best is 3 to 7 main ideas with 2 to 6 under each.';
const mindmapHelp = () => MINDMAP_HELP + (ready('diagram') ? ' Steps, causes and links across branches belong in a Diagram.' : '');
const DIAGRAM_HELP = 'DIAGRAM (kind "diagram"): boxes and the labelled arrows between them, for steps, pathways, cycles and causes (a topic and its parts is a Mind map). Lucida lays it out in rows (a single loop as a circle) and colors it by how well the learner knows each part, so never send positions or colors. Easiest as text, one arrow a line, "A -> B : what the arrow does": "direction down\nglc(Glucose) -> pyr[Pyruvate] : is split into\npyr -> acoa[Acetyl-CoA] : is oxidized to\nacoa -> krebs[Krebs cycle] : enters\nc4[Complex IV] {cards:c7}\n> Cyanide and carbon monoxide block it.\ncn[Cyanide] -.-> c4 : blocks". Name a box once with its id touching a bracket: id[Words] (a box), id(Words) (round: a start, an end, a molecule) or id{Words} (a diamond: a question or a choice); after that, use its id. -.-> is a dashed arrow (indirect, or only sometimes). A line with only a box adds it, and " {cards:…}" at its end links the deck’s cards; a "> " line is the note of the last box on the line above. "direction right" lays it out across. Mermaid flowchart lines work too (A[Glucose] -->|is split into| B[Pyruvate]); subgraphs and styles are skipped. Words that name no box make a new box. Or as data: {"direction":"down","nodes":[{"id":"glc","label":"Glucose","shape":"round"},{"id":"pyr","label":"Pyruvate","cardIds":["c2"]}],"edges":[{"from":"glc","to":"pyr","label":"is split into"}]}. A box: id, label (up to 60 characters), shape ("box", "round" or "diamond"), note (up to 600), cardIds (up to 8). An arrow: from and to (box ids), label (a verb, up to 40 characters: "produces", "inhibits", "is converted to"; never "relates to": the learner is tested on the sentence), dashed (true). One arrow per pair of boxes and direction. Up to 80 boxes and 160 arrows.';
const fixHelp = () => 'Lucida fixes what it can (a repeated id, ' + (ready('diagram') ? 'an arrow to a box that isn’t there, ' : '') + 'a label too long, too many ideas, card ids that aren’t the deck’s) and lists what it changed in warnings; the answer gives the page as saved, as text with every id.';
const kindWords = () => orWords(['note', ...MAP_ORDER].filter(ready).map(k => '"' + k + '" (' + { note: 'explanations', mindmap: 'a topic broken into its ideas', diagram: 'how things lead to each other' }[k] + ')'));

const LIST_PAGES_HELP = () => 'List the pages beside a deck’s (or a folder’s) cards: ' + andWords(pages.KINDS.filter(ready).map(k => PLURAL[k])) + ' (' + coming() + ' are coming). Each comes with its id, kind, title, version, who changed it last and when, and the id of the page it sits inside (pages nest)' +
  (mapsOn() ? '; ' + mapNames(true) + ' also says when the learner last tested themselves on it' : '') + '. With no deck or folder it lists every page the learner has. Read one with get_page.';
const GET_PAGE_HELP = () => !mapsOn()
  ? 'Read one page: its kind, title, version (send it back as baseVersion when you change the page) and its content. A Note comes as blocks (see create_page for their shapes), or as Markdown with format "markdown". The cards a Note links to come with how the learner is doing on them (weak: they keep forgetting it), so you can tutor from the page: explain what they miss, add a trap or a pearl, or link the weak cards in. A Note lists the pages it shows inside (embeds).'
  : 'Read one page: its kind, title, version (send it back as baseVersion when you change the page) and its content. A Note comes as blocks, or as Markdown with format "markdown". ' +
    (ready('mindmap') ? 'A Mind map comes as text (the indented list, every idea with its {#id})' + (ready('diagram') ? '; a Diagram' : '') : 'A Diagram') + (ready('diagram') ? ' as text (its arrow lines, with ids) and as statements, one sentence an arrow ("Glucose —is split into→ Pyruvate")' : '') + '; format "json" adds the data. ' +
    'Every page comes with how the learner is doing on it: cards (the deck’s cards it links to, each with the ideas it tests; weak: they keep forgetting it) and, on ' + mapNames(true) + ', study: what they missed when they last hid the words and tested themselves (each with its path), what no test or card covers yet, and the weakest branches. Tutor from that: quiz them on what they missed, explain an idea in its note, add the missing step, or make a card (add_cards) and link it (update_page). A Note lists the pages it shows inside (embeds).';
const CREATE_PAGE_HELP = () => 'Make a page beside a deck’s (or a folder’s) cards, like an artifact the learner keeps and studies from. kind is ' + kindWords() + '; ' + coming() + ' are coming. Give the content one way: a Note as blocks or markdown' +
  (mapsOn() ? '; ' + mapNames() + ' as text (simplest) or data. The learner tests themselves on ' + mapNames(true) + ' by hiding its words, so make each label the one thing worth recalling, and link the deck’s cards that test it. ' : '. ') +
  noteHelp() + (ready('mindmap') ? ' ' + mindmapHelp() : '') + (ready('diagram') ? ' ' + DIAGRAM_HELP : '') + (mapsOn() ? ' ' + fixHelp() : '') +
  ' A deck holds up to 25 pages on Free, 500 on Pro. Put the page inside another with inside (its id).' + (mapsOn() ? ' To show ' + mapNames(true) + ' inside a Note, put {type:"embed", pageId} in the Note: it shows a live picture of it.' : '');
const UPDATE_PAGE_HELP = () => {
  if (!mapsOn()) return 'Change a page: its title and/or its content (a Note’s `blocks` or `markdown`, the whole page as it should be now). Send baseVersion, the version you read with get_page: if the page changed since (the learner wrote in it, or another app did), nothing is saved and you get the page as it is now; merge your change into that and send it again with its version. Every save is a new version, and the learner can restore any older one. Keep the ids of blocks you didn’t change. ' + noteHelp();
  const dg = ready('diagram'), mm = ready('mindmap');
  const whose = orWords(mapKinds().map(k => 'a ' + pages.KIND_NAMES[k] + '’s'));
  const things = andWords([mm && 'idea', dg && 'box', 'block'].filter(Boolean));
  return 'Change a page: its title and/or its content, the whole content as it should be now (a Note’s blocks or markdown; ' + whose + ' text or data, as create_page describes). Send baseVersion, the version you read with get_page: if the page changed since (the learner wrote in it, or another app did), nothing is saved and you get the page as it is now; make your change on that and send it with its version. ' +
    'Keep the id of every ' + things + ' you didn’t change: the learner’s test results and card links hang on them (one sent without an id is matched to the old one with the same words). ' +
    'On ' + mapNames() + ', ' + (dg && mm ? 'an idea or box you leave out is deleted (an idea with everything under it)' : mm ? 'an idea you leave out is deleted with everything under it' : 'a box you leave out is deleted') +
    ', but a note or cardIds you leave out of one you keep stays as it was' + (dg ? ', and so does where the learner put a box' : '') + '; send null or [] in data (in text, a lone ">" line or an empty cards:) to clear it. ' +
    'Every save is a version the learner can restore; say what you changed in summary (Lucida writes one if you don’t). ' + fixHelp();
};
// The server instructions' sentence about pages.
const PAGES_SAY = () => !mapsOn()
  ? ' Beside a deck’s cards, the learner keeps pages you can make and change, like artifacts for studying: notes with traps, pearls, mnemonics, chains, tables, toggles and the deck’s own cards (list_pages, get_page, create_page, update_page with the baseVersion you read, delete_page). Every save is a version the learner can restore. When you tutor, read the page and the weak spots, then improve the page.'
  : ' Beside a deck’s cards the learner keeps pages you can make and change, like artifacts for studying: ' + andWords(['notes', ready('mindmap') && 'mind maps (a topic and its ideas, each linked to the cards that test it)', ready('diagram') && 'diagrams (boxes and labelled arrows: processes, pathways, cycles)'].filter(Boolean)) +
    ', which Lucida lays out itself (list_pages, get_page, create_page, update_page with the baseVersion you read, delete_page). The learner tests themselves on a map by hiding its words; when you tutor, read the page’s study block, quiz them on what they missed, then improve the page. Every save is a version the learner can restore.';
// One meaning of weak everywhere (sched.js toneOf, the owner's answer to §13 Q2).
const WEAK_SAY = ' A weak card is one whose recall is low now, not one ever forgotten.';

// The old Guide tools work on the deck's Note pages once its Guide moved into them (guidemove.mjs); a deck you study keeps its owner's Guide (null).
async function guideNotes(d, ctx) {
  const moved = await moveGuide(d, ctx.once); if (!moved) return null;
  return { main: moved.main, list: (await pages.list(uidOf(), 'deck', d.id)).filter(p => p.kind === 'note') };
}
const findNote = (G, x) => (!x || x === 'main' ? G.list.find(p => p.id === G.main) : G.list.find(p => p.id === x) || G.list.find(p => p.title.toLowerCase() === String(x).trim().toLowerCase()));
// A page's content as the AI app sent it: exactly one of blocks, markdown, text (a map's outline or arrow lines; a Note's Markdown) or
// data (a map's JSON). What pages.mjs cleanData reads for any kind: {blocks}, a string (Markdown or a map's text), or a map's data.
const TWO_CONTENTS = 'Send the content one way: text or data (a Note: blocks or markdown), not both. Nothing was saved.';
// A Note takes blocks or markdown (or Markdown as text), never a map's data: data that isn't {blocks} or {markdown} is refused, so it can't
// save an empty Note over the learner's.
const NOTE_DATA = 'This page is a Note: send its content as blocks or markdown. Nothing was saved.';
const noteData = a => { const x = a.data; return x === undefined || x === null || (typeof x === 'object' && !Array.isArray(x) && (Array.isArray(x.blocks) || typeof x.markdown === 'string')); };
function contentIn(a) {
  const given = ['blocks', 'markdown', 'text', 'data'].filter(k => a[k] !== undefined && a[k] !== null);
  if (given.length > 1) throw new Error(TWO_CONTENTS);
  const k = given[0];
  if (!k) return undefined;
  if (k === 'blocks') return { blocks: Array.isArray(a.blocks) ? a.blocks : [] };
  if (k === 'data') return a.data;
  return String(a[k]);
}
const scopeNames = () => { const S = state(); return { deck: new Map(S.decks.map(d => [d.id, d.name])), folder: new Map(S.folders.map(f => [f.id, f.name])) }; };
// When the learner last tested themselves on a map page (store.mjs Test me marks).
const testedOn = p => { if (!pages.MAP_KINDS.has(p.kind)) return undefined; const m = marksOf(p.id); return m && m.n.size ? day(m.at) : undefined; };
const pageLine = (p, names) => ({ id: p.id, kind: p.kind, title: p.title, version: p.version, [p.scope]: (names[p.scope] && names[p.scope].get(p.scopeId)) || p.scopeId, inside: p.parent || undefined, changed_by: p.by, changed: new Date(p.updated).toISOString(), tested: testedOn(p) });
const pageLink = p => 'https://lucida.cards/page/' + p.id;
// The cards a page links to (at most 100), each with how the learner is doing on it and, on a map, the ideas it tests (`on`). `ids` is
// a Map of card id -> [idea ids] (empty for a Note's cards). weak follows sched.js toneOf, the one meaning of weak.
function cardsFor(ids) {
  const byId = new Map(state().cards.map(c => [c.id, c])), out = {};
  let n = 0;
  for (const [id, on] of ids) {
    if (n++ >= 100) break;
    const c = byId.get(id), o = on && on.length ? { on: on.slice(0, 20) } : {};
    out[id] = c ? { ...o, front: String(c.front || c.text || '').slice(0, 300), back: String(c.back || '').slice(0, 300), reviews: c.srs.reps || 0, lapses: c.srs.lapses || 0, weak: toneOf(c) === 'weak' } : { ...o, missing: true };
  }
  return out;
}
// A mind map's ideas in outline order (the topic first), each with its level, its main idea and its path from the topic.
function ideasOf(p) {
  const root = p.data && p.data.root;
  if (!root) return [];
  const out = [], st = [[root, 0, null, '']];
  while (st.length) {
    const [n, level, main, pre] = st.pop(), label = String(n.label || (level ? '' : p.title || 'Untitled'));
    const path = pre ? pre + ' › ' + label : label, me = { id: n.id, label, level, main: level === 1 ? n.id : main, path, cardIds: n.cardIds || [], kids: (n.children || []).length };
    out.push(me);
    const k = n.children || [];
    for (let i = k.length - 1; i >= 0; i--) st.push([k[i], level + 1, me.main, path]);
  }
  return out;
}
// How the learner is doing on a map (get_page's study block, §3.6): what they missed when they last tested themselves (worst first,
// at most 30: missed last time, then ideas whose cards are weak, then the most misses), the weakest main ideas (at most 5), and how
// many ideas no test and no card covers yet.
function studyOf(p, ideas) {
  const marks = marksOf(p.id), byId = new Map(state().cards.map(c => [c.id, c])), list = ideas.filter(x => x.level > 0);
  let tests = 0;
  const rows = list.map((x, i) => {
    const m = marks ? marks.n.get(x.id) : null, tones = x.cardIds.map(id => byId.get(id)).filter(Boolean).map(c => toneOf(c));
    if (m) tests = Math.max(tests, m[0] + m[1]);
    return { x, i, m, tone: maps.ideaTone(tones, m), weakCards: tones.includes('weak') };
  });
  const weak = rows.filter(r => r.tone === 'weak').sort((a, b) => ((b.m && b.m[2] === 0) - (a.m && a.m[2] === 0)) || (b.weakCards - a.weakCards) || ((b.m ? b.m[1] : 0) - (a.m ? a.m[1] : 0)) || (a.i - b.i));
  const perMain = new Map();
  for (const r of weak) if (r.x.main) perMain.set(r.x.main, (perMain.get(r.x.main) || 0) + 1);
  const mains = list.filter(x => x.level === 1 && perMain.get(x.id)).map((x, i) => ({ x, i, n: perMain.get(x.id) })).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 5);
  return {
    last_tested: marks && marks.n.size ? day(marks.at) : undefined, tests,
    weak: weak.slice(0, 30).map(r => ({ id: r.x.id, label: r.x.label, path: r.x.path, missed: r.m ? r.m[1] : 0, knew: r.m ? r.m[0] : 0, cards: r.x.cardIds.length ? r.x.cardIds : undefined })),
    weak_branches: mains.map(r => ({ id: r.x.id, label: r.x.label, weak: r.n })),
    not_tested: list.filter(x => !(marks && marks.n.has(x.id))).length,
    no_cards: list.filter(x => !x.cardIds.length).length
  };
}
// A page's embedded pages (a Note's {type:"embed", pageId} blocks), as {id: {title, kind}}.
async function embedsOf(blocks) {
  const ids = [], walk = list => { for (const b of list || []) { if (b && b.type === 'embed' && b.pageId && !ids.includes(b.pageId)) ids.push(b.pageId); if (b && b.blocks) walk(b.blocks); } };
  walk(blocks);
  if (!ids.length) return null;
  const all = new Map((await pages.list(uidOf())).map(p => [p.id, p])), out = {};
  for (const id of ids.slice(0, 50)) { const p = all.get(id); out[id] = p ? { title: p.title, kind: p.kind } : { missing: true }; }
  return out;
}
// A page for the AI app (§3.6): a Note's blocks (or Markdown) and the pages it shows inside; a map's text with every id, its study
// block; and for every kind the cards it links to, with how the learner is doing on them.
async function pageOut(p, format) {
  const out = { ...pageLine(p, scopeNames()), link: pageLink(p) };
  if (p.kind === 'mindmap' && p.data && p.data.root) {
    const ideas = ideasOf(p), on = new Map();
    for (const x of ideas) for (const c of x.cardIds) { if (!on.has(c)) on.set(c, []); on.get(c).push(x.id); }
    return { ...out, text: maps.textOf('mindmap', p.data), ideas: ideas.length, study: studyOf(p, ideas), ...(on.size ? { cards: cardsFor(on) } : {}),
      ...(format === 'json' ? { data: p.data } : {}), to_change: 'update_page with baseVersion ' + p.version + ' and the whole map as text or data.' };
  }
  if (p.kind !== 'note') return { ...out, data: p.data };
  const blocks = (p.data && p.data.blocks) || [], ids = new Map(), walk = list => { for (const b of list || []) { if (b.type === 'card' && b.cardId) ids.set(b.cardId, []); if (b.blocks) walk(b.blocks); } };
  walk(blocks);
  const embeds = await embedsOf(blocks);
  return { ...out, ...(format === 'markdown' || format === 'text' ? { markdown: noteToMarkdown(p.data) } : { blocks }), ...(ids.size ? { cards: cardsFor(ids) } : {}), ...(embeds ? { embeds } : {}) };
}
// The deck's (or the folder's decks') card ids a map may link to; ids that aren't among them are left out of what an AI app wrote,
// with a warning (§2.1 cardIds). An idea's card ids it had before (`prev`: the learner's, which the AI-keep rule carries over when the AI
// app leaves them out) are never checked: only what the AI app added. Gives the data back cleaned, and the warning.
function checkCards(scope, scopeId, data, prev) {
  const decks = scope === 'folder' ? new Set(state().decks.filter(d => d.folder === scopeId).map(d => d.id)) : new Set([scopeId]);
  const mine = new Set(state().cards.filter(c => decks.has(c.deckId)).map(c => c.id)), gone = [], had = new Map();
  for (const st = prev && prev.root ? [prev.root] : []; st.length;) { const n = st.pop(); if (n && Array.isArray(n.cardIds)) had.set(n.id, new Set(n.cardIds)); for (const k of (n && n.children) || []) st.push(k); }
  const st = data && data.root ? [data.root] : [];
  while (st.length) {
    const n = st.pop();
    if (Array.isArray(n.cardIds)) { const was = had.get(n.id); const keep = n.cardIds.filter(id => mine.has(id) || (was && was.has(id)) || (gone.includes(id) ? false : (gone.push(id), false))); if (keep.length) n.cardIds = keep; else delete n.cardIds; }
    for (const k of n.children || []) st.push(k);
  }
  return gone.length ? 'Left out ' + gone.length + ' card id' + (gone.length === 1 ? '' : 's') + ' that ' + (gone.length === 1 ? 'isn’t' : 'aren’t') + ' this ' + scope + '’s cards: ' + gone.slice(0, 3).join(', ') + (gone.length > 3 ? ' and ' + (gone.length - 3) + ' more' : '') + '.' : '';
}
// A map's content from an AI app, cleaned before it is saved, so its card ids can be checked: {data, warnings}. Throws the
// refusal's words (a Note's blocks, something that isn't that kind). Other kinds go to pages.mjs as they came.
function mapIn(kind, content, prev, title, scope, scopeId) {
  if (!pages.MAP_KINDS.has(kind) || content === undefined) return null;
  let r;
  try { r = maps.normalize(kind, content, prev, { ai: true, title }); }
  catch (e) { if (e.code === 'kind') return null; throw e; }
  const data = JSON.parse(JSON.stringify(r.data)), w = checkCards(scope, scopeId, data, prev);
  return { data, warnings: [...(r.warnings || []), ...(w ? [w] : [])] };
}
const merged = (a, b) => { const out = [...(a || [])]; for (const w of b || []) if (!out.includes(w)) out.push(w); return out; };
// What a write answers (§3.5): the page as saved, its text with every id on a map, what was repaired, and where it is.
const writeOut = (key, p, warnings, note) => ({ [key]: pageLine(p, scopeNames()), ...(p.kind === 'mindmap' && p.data && p.data.root ? { text: maps.textOf('mindmap', p.data) } : {}), ...(warnings && warnings.length ? { warnings } : {}), link: pageLink(p), note });
const CHECK_GUIDE = 'The learner asked to check AI changes first, and a Guide can’t wait for that check. Show them the text in the chat so they can paste it into the Guide themselves.';
// A deck's Guide as a list of pages: the Guide itself ("main") first, then its extra pages.
const guidePages = d => { const g = d.guide || { text: '', pages: [] }; return [{ id: 'main', title: 'Guide', characters: (g.text || '').length }, ...(g.pages || []).map(p => ({ id: p.id, title: p.title, inside: p.parent || undefined, characters: (p.text || '').length }))]; };

const TOOLS = [
  { name: 'list_decks', perm: 'read', description: 'List the learner’s decks, each with its id, folder, tags, how many cards it has, how many are due and new, its exam date, and whether it is shared or came from someone else. Use it first: the other tools take a deck’s name or id.', inputSchema: { type: 'object', properties: {} },
    run: () => text(state().decks.map(d => { const cs = state().cards.filter(c => c.deckId === d.id), paused = cs.filter(c => c.paused).length;
      return { id: d.id, name: d.name, folder: folderName(d), tags: d.tags, cards: cs.length, due: cs.filter(dueNow).length, new: cs.filter(isNew).length, paused: paused || undefined, exam: examOut(d),
        shared: d.share && d.share.vis !== 'private' ? (d.share.vis === 'public' ? 'public' : 'link only') : undefined,
        from: d.link && !d.link.gone ? { owner: d.link.owner && d.link.owner.name, as: d.link.mode === 'study' ? 'studied as it is (suggest changes with suggest_changes)' : 'the learner’s own copy' } : undefined }; })) },
  { name: 'list_cards', perm: 'read', description: 'List or search the cards in one deck, or in every deck when none is given. Each card comes with its id, deck, kind, text, tags and next review date (up to 500 cards, 50 by default). Use it to find a card’s id before changing or deleting it.', inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id. Leave out for every deck.' }, search: { type: 'string' }, limit: { type: 'number', description: 'Up to 500. Default 50.' } } },
    run: a => { const d = a.deck ? deckBy(a.deck) : null; if (a.deck && !d) return fail('No deck called ' + a.deck);
      const q = String(a.search || '').toLowerCase();
      const cs = state().cards.filter(c => (!d || c.deckId === d.id) && (!q || [c.front, c.back, c.text, c.note, ...c.tags].join(' ').toLowerCase().includes(q)));
      return text({ total: cs.length, cards: cs.slice(0, Math.min(500, a.limit || 50)).map(cardOut) }); } },
  { name: 'get_due_cards', perm: 'read', description: 'Get the cards that are due for review now, for quizzing the learner (20 by default). Paused cards are never due, and before a deck’s exam date the cards the learner would forget by then count as due early.', inputSchema: { type: 'object', properties: { deck: { type: 'string' }, limit: { type: 'number' } } },
    run: a => { const d = a.deck ? deckBy(a.deck) : null; const cs = state().cards.filter(c => (!d || c.deckId === d.id) && dueNow(c)); return text({ due: cs.length, cards: cs.slice(0, a.limit || 20).map(cardOut) }); } },
  { name: 'get_stats', perm: 'read', description: 'Get how studying is going: reviews in the last 30 days, how much is remembered, the streak and totals, how often cards are forgotten, the time per card, cards forgotten too often, exam readiness, and whether scheduling is tuned to the learner.', inputSchema: { type: 'object', properties: {} },
    run: () => { const S = state(), since = Date.now() - 30 * 86400000, logs = S.logs.filter(l => l.at >= since && l.rating && l.was === 'review' && !l.kind);
      const days = new Set(S.logs.map(l => dayAt(l.at)));
      let streak = 0, t = dayAt(Date.now());
      if (!days.has(t)) t = dayAt(t, -1);
      while (days.has(t)) { streak++; t = dayAt(t, -1); }
      const out = { decks: S.decks.length, cards: S.cards.length, reviews_last_30_days: S.logs.filter(l => l.at >= since && !l.kind).length,
        remembered_last_30_days: logs.length ? Math.round(logs.filter(l => l.rating > 1).length / logs.length * 100) + '%' : 'no reviews yet', streak_days: streak,
        paused_cards: S.cards.filter(c => c.paused).length };
      const x = insights(S, { days: 30 }), tm = x.pace.time, tune = S.settings.tune;
      return text({ ...out, forgot_last_30_days: x.weak.forgot.of ? x.weak.forgot.pct + '% of reviews of learned cards' : 'no reviews yet',
        seconds_per_card: tm.perCard == null ? undefined : Math.round(tm.perCard * 10) / 10, right_answers_per_minute: tm.rightPerMin == null ? undefined : Math.round(tm.rightPerMin * 10) / 10,
        learn_mode_right: x.memory.modes.learn.n ? x.memory.modes.learn.pct + '% of ' + x.memory.modes.learn.n + ' answers' : undefined,
        cards_forgotten_too_often: x.weak.leeches.length, typical_gap_days: x.pace.gapNow == null ? undefined : Math.round(x.pace.gapNow),
        reviews_next_7_days: x.pace.ahead[0].n, exams: x.pace.exams.length ? x.pace.exams.map(e => ({ deck: e.name, date: e.date, days_left: e.days, cards_to_review_first: e.toReview, seen: e.seen + ' of ' + e.total, likely_to_remember: Math.round(e.likely * 100) + '%' })) : undefined,
        scheduling: tunedW() ? 'tuned to the learner’s ' + (tune.reviews || tune.n) + ' reviews' : 'standard FSRS parameters' }); } },
  { name: 'get_weak_spots', perm: 'read', description: 'Find what the learner is weakest at: the tags remembered least, the hardest cards (forgotten most, most difficult), and cards forgotten so often they may need rewording (some may be paused). Every card comes with its id.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id. Leave out for every deck.' }, days: { type: 'number', description: 'How far back to look at reviews for the tags, 7 to 365. Default 90.' }, limit: { type: 'number', description: 'Cards in each list, up to 50. Default 10.' } } },
    run: a => {
      const d = a.deck ? deckBy(a.deck) : null; if (a.deck && !d) return fail('No deck called ' + a.deck);
      const S = state(), n = Math.min(50, Math.max(1, Math.round(a.limit || 10))), x = insights(S, { days: Math.min(365, Math.max(7, Math.round(a.days || 90))), deckId: d && d.id });
      const cardBy = id => S.cards.find(c => c.id === id);
      return text({ forgot: x.weak.forgot.of ? x.weak.forgot.pct + '% of ' + x.weak.forgot.of + ' reviews of learned cards' : 'no reviews of learned cards yet',
        weakest_tags: x.weak.weakTags.map(g => ({ tag: g.tag, remembered: g.pct + '%', reviews: g.n, cards: g.cards })),
        hardest_cards: x.weak.hardest.slice(0, n).map(h => ({ ...cardOut(cardBy(h.id)), forgotten: h.lapses, difficulty: h.d, remember_now: h.recall == null ? undefined : Math.round(h.recall * 100) + '%' })),
        leeches: x.weak.leeches.slice(0, n).map(h => ({ ...cardOut(cardBy(h.id)), forgotten: h.lapses })), leech_count: x.weak.leeches.length }); } },
  { name: 'get_review_history', perm: 'read', description: 'Get the learner’s recent reviews summed up day by day and deck by deck: reviews, percent right, minutes, new cards learned, and Learn mode answers.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id. Leave out for every deck.' }, days: { type: 'number', description: 'How many days back, 1 to 365. Default 30.' } } },
    run: a => {
      const d = a.deck ? deckBy(a.deck) : null; if (a.deck && !d) return fail('No deck called ' + a.deck);
      const h = history(state(), { days: a.days || 30, deckId: d && d.id }), name = id => (deckBy(id) || {}).name || 'A deleted deck';
      return text({ total: h.total, by_day: h.days.map(x => ({ date: day(x.day), ...x, day: undefined })), by_deck: h.decks.map(x => ({ deck: name(x.deckId), ...x, deckId: undefined })) }); } },
  { name: 'create_deck', perm: 'text', description: 'Make a new deck, optionally in a folder and with a cover picture (free on every plan). It fails if a deck with that name already exists. Use add_cards to fill it.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, folder: FOLDER, cover_image: COVER, files: FILES }, required: ['name'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      if (deckBy(a.name)) return fail('There is already a deck called ' + a.name);
      if (a.cover_image && !state().ai.perms.media) return fail(NO_MEDIA);
      let image = null;
      try { if (a.cover_image) image = await fetchMedia(a.cover_image, 'image', { files: a.files, local: ctx.local }); } catch (e) { return fail(e.message); }
      return text(apply({ type: 'deck.add', name: a.name, tags: a.tags, folder: a.folder ? folderFor(a.folder, who) : null, image }, who));
    } },
  { name: 'update_deck', perm: 'edit', description: 'Change a deck: rename it, retag it, move it into or out of a folder, give it a cover picture (free on every plan), or change the background it shows in Learn mode, flashcards, and Live. The values you give replace the old ones.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, name: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } },
      folder: { type: 'string', description: 'A folder name, made if there isn’t one yet. An empty string takes the deck out of its folder.' },
      cover_image: { type: 'string', description: 'The deck’s cover picture. ' + SOURCE + ' An empty string goes back to the deck’s own gradient.' },
      background: { type: 'string', enum: BG_KINDS, description: 'Behind Learn mode, flashcards, and Live: deck (the deck’s own colors, faint), plain (what a deck shows until one is picked), sky, sunset, or photo (needs background_image, or uses the cover picture).' },
      background_image: { type: 'string', description: 'A picture for the background (sets background to photo). ' + SOURCE }, files: FILES }, required: ['deck'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      if ((a.cover_image || a.background_image) && !state().ai.perms.media) return fail(NO_MEDIA);
      const patch = {};
      if (a.name !== undefined) { const other = deckBy(a.name); if (other && other !== d) return fail('There is already a deck called ' + a.name); patch.name = a.name; }
      if (a.tags !== undefined) patch.tags = a.tags;
      if (a.folder !== undefined) patch.folder = a.folder ? folderFor(a.folder, who) : null;
      try {
        if (a.cover_image !== undefined) patch.cover = { image: a.cover_image ? await fetchMedia(a.cover_image, 'image', { files: a.files, local: ctx.local }) : null };
        if (a.background_image) patch.bg = { kind: 'photo', image: await fetchMedia(a.background_image, 'image', { files: a.files, local: ctx.local }) };
      } catch (e) { return fail(e.message); }
      if (a.background !== undefined && !patch.bg) {
        if (!BG_KINDS.includes(a.background)) return fail('The background is one of: ' + BG_KINDS.join(', '));
        const image = a.background === 'photo' ? (d.bg && d.bg.image) || (patch.cover ? patch.cover.image : d.cover.image) : undefined;
        if (a.background === 'photo' && !image) return fail('A photo background needs background_image (or a cover picture on the deck).');
        patch.bg = image ? { kind: 'photo', image } : { kind: a.background };
      }
      apply({ type: 'deck.update', id: d.id, patch }, who);
      return text('Updated ' + (patch.name || d.name) + '.');
    } },
  { name: 'add_cards', perm: 'text', description: 'Add flashcards to a deck, making the deck if it doesn’t exist yet. Takes up to 500 cards of four kinds: basic (a question and its answer), fill in the blank, image, and audio. When the learner asked to check AI cards first, the new cards wait in the deck until they keep them.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, cards: { type: 'array', items: CARD, minItems: 1 }, files: FILES }, required: ['deck', 'cards'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const list = (Array.isArray(a.cards) ? a.cards : []).slice(0, 500).map(kindOf); if (!list.length) return fail('No cards given');
      const bad = list.find(problem);
      if (bad) return fail('Can’t add these cards: ' + problem(bad) + ': ' + JSON.stringify(bad));
      if (list.some(c => c.image || c.audio || c.kind === 'audio') && !state().ai.perms.media) return fail(NO_MEDIA);
      // Free's limit on pictures and sound: what these cards would use is checked before anything is fetched or spoken, and each one
      // is counted again as it is made. Spoken words only become a file on Pro (on Free the device reads them aloud).
      const needFile = list.filter(c => c.kind === 'image' || (c.kind === 'audio' && (c.audio || isPro())));
      if (needFile.length > mediaLeft()) return fail(MEDIA_FULL);
      // Pictures and sound first, so a bad link doesn't leave half the cards made.
      const notes = new Set(), ready = [], room = { left: mediaLeft() };
      try { for (const c of list) ready.push(await withMedia(c, a.files, ctx, notes, room)); } catch (e) { return fail(e.message); }
      const check = state().ai.perms.check;
      let d = deckBy(a.deck);
      const ids = [];
      for (const c of ready) { const r = apply({ type: 'card.add', deckId: d ? d.id : null, deckName: d ? null : a.deck, ...c, pending: check }, who); d = deckBy(r.deckId); ids.push(...r.ids); }
      // (the new cards' ids, so an AI app can link them to a page's ideas: step 4 §6.1 row 10)
      const made = ids.length, its = made === 1 ? ' Its id: ' : ' Their ids: ';
      return text('Added ' + made + ' card' + (made === 1 ? '' : 's') + ' to ' + d.name + '.' + its + ids.join(', ') + (mapsOn() ? ' (link ' + (made === 1 ? 'it' : 'them') + ' to a page’s ideas with update_page).' : '.') + (check ? (made === 1 ? ' It waits' : ' They wait') + ' in the deck until the learner keeps ' + (made === 1 ? 'it.' : 'them.') : '') + [...notes].map(n => ' ' + n).join(''));
    } },
  { name: 'update_card', perm: 'edit', description: 'Change a card: fix typos, give a better answer, change its tags, or give it a picture or sound. The fields you give replace the old ones. On a deck the learner studies from someone else, use suggest_changes instead.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, front: { type: 'string' }, back: { type: 'string' }, text: { type: 'string' }, note: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, ...MEDIA_PROPS, files: FILES }, required: ['id'] },
    meta: { 'openai/fileParams': ['files'] },
    run: async (a, who, ctx) => {
      const c = state().cards.find(x => x.id === a.id); if (!c) return fail('There’s no card with id ' + a.id);
      const dk = deckBy(c.deckId);
      if (dk && dk.link && dk.link.mode === 'study' && !dk.link.gone) return fail('This deck is ' + dk.link.owner.name + '’s: use suggest_changes to suggest the fix.');
      const patch = {};
      for (const k of ['front', 'back', 'text', 'note', 'tags', 'speak', 'lang']) if (a[k] !== undefined) patch[k] = a[k];
      // A basic card becomes an image card with a picture, or an audio card with sound.
      const sound = a.audio || (a.speak && c.kind === 'basic') || (c.kind === 'audio' && (a.speak !== undefined || a.lang !== undefined));
      if (a.image || sound) {
        if (!state().ai.perms.media) return fail(NO_MEDIA);
        if (a.image && sound) return fail('A card can have a picture or a sound, not both.');
        if (a.image && !['basic', 'image'].includes(c.kind)) return fail('Only basic and image cards can have a picture.');
        if (sound && !['basic', 'audio'].includes(c.kind)) return fail('Only basic and audio cards can have sound.');
        // Free's limit is counted before the picture or sound is fetched or spoken (a card that has one already needs no new place).
        if ((a.image || a.audio || (sound && isPro())) && !(c.image || c.audio) && mediaLeft() < 1) return fail(MEDIA_FULL);
        const notes = new Set();
        try {
          if (a.image) { patch.image = await fetchMedia(a.image, 'image', { files: a.files, local: ctx.local }); patch.kind = 'image'; }
          else { patch.audio = a.audio ? await fetchMedia(a.audio, 'audio', { files: a.files, local: ctx.local }) : await speakFile(patch.speak ?? c.speak, patch.lang ?? c.lang, notes); patch.kind = 'audio'; }
        } catch (e) { return fail(e.message); }
        apply({ type: 'card.update', id: a.id, patch }, who);
        return text('Updated the card.' + [...notes].map(n => ' ' + n).join(''));
      }
      // "Let me check AI cards and changes first": the change waits on the card until the learner keeps it.
      if (state().ai.perms.check && !c.pending) { apply({ type: 'card.propose', id: a.id, patch }, who); return text('The change waits for the learner to keep it.'); }
      apply({ type: 'card.update', id: a.id, patch }, who);
      return text('Updated the card.');
    } },
  { name: 'add_quiz', perm: 'text', description: 'Save Learn mode questions on cards, one to three per card: multiple choice (a question, the right answer and three wrong ones) or true or false, each with a short reason. It can also save a short explanation of a card’s answer, shown when the learner taps Explain. New questions replace the card’s old ones. Use list_cards for card ids; its quiz_questions count shows which cards have questions already.',
    inputSchema: { type: 'object', properties: { quizzes: { type: 'array', minItems: 1, items: { type: 'object', properties: {
      card: { type: 'string', description: 'The card id.' },
      questions: { type: 'array', items: { type: 'object', properties: {
        kind: { type: 'string', enum: ['choice', 'true_false'] },
        question: { type: 'string', description: 'For choice, the question. For true_false, a statement that is true or false.' },
        answer: { type: 'string', description: 'For choice, the right answer (short). For true_false, "true" or "false".' },
        wrong: { type: 'array', items: { type: 'string' }, description: 'For choice: three plausible wrong answers, about as long as the right one.' },
        why: { type: 'string', description: 'One or two sentences on why the answer is right.' } }, required: ['kind', 'question', 'answer'] } },
      explanation: { type: 'string', description: 'Optional: two to four plain sentences explaining the card’s answer.' } }, required: ['card'] } } }, required: ['quizzes'] },
    run: (a, who) => { const r = apply({ type: 'card.quiz', quizzes: a.quizzes }, who); return r.questions || (a.quizzes || []).some(q => q.explanation) ? text('Saved ' + r.questions + ' question' + (r.questions === 1 ? '' : 's') + '. Learn mode uses them next time.') : fail('None of those questions could be used. Check the card ids, and give each choice question three wrong answers.'); } },
  { name: 'delete_cards', perm: 'del', description: 'Delete cards for good, with every review of them. When the learner asked to check AI changes first, a delete waits for them to agree. Use list_cards to find card ids.', inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } }, required: ['ids'] },
    run: (a, who) => {
      const cs = (a.ids || []).map(id => state().cards.find(c => c.id === id)).filter(Boolean), theirs = cs.map(c => deckBy(c.deckId)).find(d => d && d.link && d.link.mode === 'study' && !d.link.gone);
      if (theirs) return fail('Those cards are in ' + theirs.link.owner.name + '’s deck: use suggest_changes to suggest removing them.');
      if (state().ai.perms.check) { const kept = cs.filter(c => !c.pending); for (const c of kept) apply({ type: 'card.propose', id: c.id, remove: true }, who); const rest = cs.filter(c => c.pending).map(c => c.id); if (rest.length) apply({ type: 'card.delete', ids: rest }, who); return text((kept.length ? kept.length + ' wait for the learner to agree. ' : '') + (rest.length ? 'Deleted ' + rest.length + '.' : '')); }
      return text(apply({ type: 'card.delete', ids: a.ids }, who));
    } },
  // A deck's Guide: a Markdown page like a README, with extra pages beside it (store.mjs "A deck's Guide").
  { name: 'list_guide_pages', perm: 'read', description: 'List a deck’s Guide pages: the Guide itself (its main page) and any extra pages, each with its id, title and length, and the id of the page it sits inside (inside: "main" is the Guide), as Notion’s pages nest. The Guide is a Markdown page the learner keeps about the deck, like a README.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' } }, required: ['deck'] },
    run: async (a, who, ctx) => {
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      const G = await guideNotes(d, ctx); if (!G) return text(guidePages(d));
      return text(G.list.map(p => ({ id: p.id === G.main ? 'main' : p.id, title: p.id === G.main ? 'Guide' : p.title, inside: p.parent ? (p.parent === G.main ? 'main' : p.parent) : undefined, kind: p.kind, version: p.version })));
    } },
  { name: 'get_guide', perm: 'read', description: 'Read a deck’s Guide (the notes page the learner keeps about the deck), or one of its extra pages. It is Markdown, plus toggles: a line ":::toggle Its title", what opens under it (any Markdown, even more toggles), and a line ":::" that closes it. Use list_guide_pages to see the extra pages.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, page: { type: 'string', description: 'An extra page’s id or title. Leave out for the Guide itself.' } }, required: ['deck'] },
    run: async (a, who, ctx) => {
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      const G = await guideNotes(d, ctx);
      if (G) {
        const n = findNote(G, a.page); if (!n) return a.page ? fail('There is no page called ' + a.page + ' in ' + d.name + '.') : text({ deck: d.name, page: { id: 'main', title: 'Guide' }, text: '', pages: [] });
        const full = await pages.get(uidOf(), n.id);
        return text({ deck: d.name, page: { id: n.id === G.main ? 'main' : n.id, title: n.id === G.main ? 'Guide' : n.title, version: full.version }, text: full.kind === 'note' ? noteToMarkdown(full.data) : '', updated: new Date(full.updated).toISOString(), pages: G.list.map(x => ({ id: x.id === G.main ? 'main' : x.id, title: x.title })), note: 'The Guide is the deck’s Note pages now: get_page and update_page do more (blocks, versions).' });
      }
      const gps = guidePages(d), p = a.page ? gps.find(x => x.id === a.page) || gps.find(x => x.title.toLowerCase() === String(a.page).trim().toLowerCase()) : gps[0];
      if (!p) return fail('There is no page called ' + a.page + ' in ' + d.name + '.');
      const g = p.id === 'main' ? d.guide : (d.guide.pages || []).find(x => x.id === p.id);
      return text({ deck: d.name, page: { id: p.id, title: p.title }, text: (g && g.text) || '', updated: g && g.at ? new Date(g.at).toISOString() : undefined, pages: gps.map(x => ({ id: x.id, title: x.title, characters: x.characters })) });
    } },
  { name: 'update_guide', perm: 'edit', description: 'Save a deck’s Guide (the notes page about the deck, in Markdown: headings, lists, task lists, links, tables, code and quotes) or one of its extra pages. Toggles fold what is under them: write a line ":::toggle Its title" (the key idea), what it holds on the lines after (any Markdown, even more toggles), and a line ":::" to close it; the learner opens and closes them. Notes read best as a ## heading for each topic with its points as toggles under it. A heading folds what is under it too. By default the text replaces what is there; the old words are kept as an older version the learner can bring back. With mode "append" the text goes after what is there. If the deck is shared, its Guide is shown on its public page, so keep it fit to be seen. Up to 40,000 characters.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, text: { type: 'string', description: 'The Markdown to write.' }, page: { type: 'string', description: 'An extra page’s id or title. Leave out for the Guide itself.' }, mode: { type: 'string', enum: ['replace', 'append'] } }, required: ['deck', 'text'] },
    run: async (a, who, ctx) => {
      // A Guide can't wait for a check the way new cards do, so with "check AI cards and changes first" on, the learner writes it.
      if (state().ai.perms.check) return fail(CHECK_GUIDE);
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      const G = await guideNotes(d, ctx);
      if (G) {
        try {
          const done = await ctx.once('update_guide', async () => {
            let n = findNote(G, a.page);
            if (!n && a.page) throw new Error('There is no page called ' + a.page + ' in ' + d.name + '. Use add_guide_page to make one.');
            if (!n) { const made = await pages.create(uidOf(), { scope: 'deck', scopeId: d.id, kind: 'note', title: 'Guide', data: { markdown: String(a.text ?? '') }, who, ai: true, summary: 'Wrote the Guide', pro: isPro() }); apply({ type: 'guide.moved', deckId: d.id, main: made.id, map: {} }, who); return made; }
            const full = await pages.get(uidOf(), n.id), was = full.kind === 'note' ? noteToMarkdown(full.data) : '', body = String(a.text ?? '');
            const next = a.mode === 'append' ? was + (was && !was.endsWith('\n') ? '\n\n' : '') + body : body;
            return pages.update(uidOf(), n.id, { baseVersion: full.version, data: { markdown: next }, who, ai: true, summary: a.mode === 'append' ? 'Added to the page' : 'Rewrote the page', pro: isPro() });
          });
          return text('Wrote the page “' + (done.id === (d.guideMoved || {}).main ? 'Guide' : done.title) + '” of ' + d.name + ' (version ' + done.version + '). The old words are kept as an older version.');
        } catch (e) { return fail(e.message); }
      }
      const gps = guidePages(d), p = a.page ? gps.find(x => x.id === a.page) || gps.find(x => x.title.toLowerCase() === String(a.page).trim().toLowerCase()) : gps[0];
      if (!p) return fail('There is no page called ' + a.page + ' in ' + d.name + '. Use add_guide_page to make one.');
      const was = p.id === 'main' ? (d.guide && d.guide.text) || '' : ((d.guide.pages || []).find(x => x.id === p.id) || {}).text || '';
      const body = String(a.text ?? ''), next = a.mode === 'append' ? was + (was && !was.endsWith('\n') ? '\n\n' : '') + body : body;
      apply({ type: 'guide.save', deckId: d.id, page: p.id, text: next, snapshot: true }, who);
      return text('Wrote ' + (p.id === 'main' ? 'the Guide' : 'the page “' + p.title + '”') + ' of ' + d.name + '. The old words are kept as an older version.');
    } },
  { name: 'add_guide_page', perm: 'text', description: 'Add an extra page beside a deck’s Guide, like a page of a small wiki ("Lecture 3 summary", "Mnemonics"). A deck can have up to 10. Give it Markdown text now (toggles too, as update_guide says), or fill it in later with update_guide. Put it inside another page with `inside` (that page’s id or title, or "main" for the Guide); leave it out for a page at the top.',
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, title: { type: 'string' }, text: { type: 'string', description: 'The page’s Markdown.' }, inside: { type: 'string', description: 'The page it goes inside: its id or title, or "main" for the Guide. Leave out for the top.' } }, required: ['deck', 'title'] },
    run: async (a, who, ctx) => {
      if (state().ai.perms.check) return fail(CHECK_GUIDE);
      const d = deckBy(a.deck); if (!d) return fail('No deck called ' + a.deck);
      const G = await guideNotes(d, ctx);
      if (G) {
        const wanted = String(a.inside || '').trim(), under = wanted ? findNote(G, wanted) : null;
        if (wanted && !under) return fail('There is no page called ' + a.inside + ' in ' + d.name + ' to put it inside.');
        try {
          const made = await ctx.once('add_guide_page', () => pages.create(uidOf(), { scope: 'deck', scopeId: d.id, kind: 'note', title: a.title, data: { markdown: String(a.text || '') }, parent: under ? under.id : '', who, ai: true, summary: 'Made the page', pro: isPro() }));
          return text('Added the page “' + made.title + '” to ' + d.name + '. Its id is ' + made.id + '.');
        } catch (e) { return fail(e.message); }
      }
      const gps = guidePages(d), wanted = String(a.inside || '').trim(), under = !wanted ? null : gps.find(x => x.id === wanted) || gps.find(x => x.title.toLowerCase() === wanted.toLowerCase());
      if (wanted && !under) return fail('There is no page called ' + a.inside + ' in ' + d.name + ' to put it inside.');
      const r = apply({ type: 'guide.page.add', deckId: d.id, title: a.title, parent: under ? under.id : '' }, who);
      if (a.text) apply({ type: 'guide.save', deckId: d.id, page: r.id, text: String(a.text) }, who);
      return text('Added the page “' + String(a.title).trim().slice(0, 80) + '” to ' + d.name + '. Its id is ' + r.id + '.');
    } },
  // Pages (pages.mjs): what a deck or a folder holds beside its cards, each of a kind, versioned, written by the learner and by AI apps.
  { name: 'list_pages', perm: 'read', description: LIST_PAGES_HELP,
    inputSchema: { type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, folder: { type: 'string', description: 'Folder name or id (instead of a deck).' } } },
    run: async (a, who, ctx) => {
      let sc = null;
      try { if (a.deck || a.folder) sc = pageScope(a.folder ? 'folder' : 'deck', a.folder || a.deck, { read: true }); } catch (e) { return fail(e.message); }
      // a deck's Guide, and the mind maps made from its cards, move into its Pages the first time they're asked for
      if (sc && sc.scope === 'deck') { const d = deckBy(sc.id); await moveGuide(d, ctx.once); await moveMaps(d, ctx.once); }
      const names = scopeNames(), list = await pages.list(uidOf(), sc && sc.scope, sc && sc.id);
      return text({ pages: list.map(p => pageLine(p, names)), kinds_you_can_make: [...pages.PAGE_READY] });
    } },
  { name: 'get_page', perm: 'read', description: GET_PAGE_HELP,
    inputSchema: { type: 'object', properties: { page: { type: 'string', description: 'The page’s id (from list_pages).' }, format: { type: 'string', enum: ['blocks', 'markdown', 'text', 'json'], description: 'How the content comes back. A Note: blocks (the default, each block with its id) or markdown (text is the same as markdown, json as blocks). A map always comes as text with its ids; json adds its data.' } }, required: ['page'] },
    run: async (a, who, ctx) => {
      const p = await pages.get(uidOf(), a.page); if (!p) return fail('No page ' + a.page + '. list_pages gives the ids.');
      // (the deck's made mind maps move into its Pages on get_page too, §7.1)
      if (p.scope === 'deck') { const d = deckBy(p.scopeId); if (d) await moveMaps(d, ctx.once); }
      return text(await pageOut(p, a.format));
    } },
  { name: 'create_page', perm: 'text', description: CREATE_PAGE_HELP,
    inputSchema: () => ({ type: 'object', properties: { deck: { type: 'string', description: 'Deck name or id.' }, folder: { type: 'string', description: 'Folder name or id (instead of a deck).' }, kind: { type: 'string', enum: pages.KINDS.filter(ready) }, title: { type: 'string' },
      inside: { type: 'string', description: 'The id of the page it goes inside. Leave out for the top.' },
      blocks: { type: 'array', items: { type: 'object' }, description: 'The Note’s blocks, in order.' }, markdown: { type: 'string', description: 'The Note as Markdown instead of blocks.' },
      ...(mapsOn() ? { text: { type: 'string', description: (ready('mindmap') && ready('diagram') ? 'A Mind map as an indented list, or a Diagram as arrow lines' : ready('mindmap') ? 'A Mind map as an indented list' : 'A Diagram as arrow lines') + ' (see above). A Note’s Markdown works here too.' },
        data: { type: 'object', description: (ready('mindmap') && ready('diagram') ? 'A Mind map’s {root} or a Diagram’s {direction, nodes, edges}.' : ready('mindmap') ? 'A Mind map’s {root}.' : 'A Diagram’s {direction, nodes, edges}.') } } : {}) }, required: ['kind', 'title'] }),
    run: async (a, who, ctx) => {
      if (state().ai.perms.check) return fail(CHECK_PAGE);
      if (!pages.PAGE_READY.has(a.kind)) return fail(notReady(a.kind));
      let sc; try { sc = pageScope(a.folder ? 'folder' : 'deck', a.folder || a.deck); } catch (e) { return fail(a.deck || a.folder ? e.message : 'Say which deck (or folder) the page goes in.'); }
      try {
        let content = contentIn(a), warnings = [];
        if (a.kind === 'note' && !noteData(a)) return fail(NOTE_DATA);
        if (content === undefined && a.kind === 'note') content = { blocks: [] };
        const m = mapIn(a.kind, content, undefined, a.title, sc.scope, sc.id);
        if (m) { content = m.data; warnings = m.warnings; }
        const p = await ctx.once('create_page', () => pages.create(uidOf(), { scope: sc.scope, scopeId: sc.id, kind: a.kind, title: a.title, data: content, parent: a.inside || '', who, ai: true, pro: isPro(), ready: true, cleaned: !!m }));
        if (p.scope === 'deck') touchDeck(p.scopeId, who);
        return text(writeOut('made', p, merged(warnings, p.warnings), 'The learner sees it in ' + sc.name + ' › Pages now. Change it with update_page and baseVersion ' + p.version + '.'));
      } catch (e) { return fail(e.message); }
    } },
  { name: 'update_page', perm: 'edit', description: UPDATE_PAGE_HELP,
    inputSchema: () => ({ type: 'object', properties: { page: { type: 'string', description: 'The page’s id.' }, baseVersion: { type: 'integer', description: 'The version you read (get_page’s version).' }, title: { type: 'string' },
      summary: { type: 'string', description: 'What you changed, in a few words (the learner sees it beside the version).' },
      blocks: { type: 'array', items: { type: 'object' } }, markdown: { type: 'string' },
      ...(mapsOn() ? { text: { type: 'string', description: 'The whole ' + (ready('mindmap') && ready('diagram') ? 'Mind map as an indented list, or the whole Diagram as arrow lines' : ready('mindmap') ? 'Mind map as an indented list' : 'Diagram as arrow lines') + ', with the ids you read.' },
        data: { type: 'object', description: 'The whole ' + (ready('mindmap') && ready('diagram') ? 'Mind map’s {root} or Diagram’s {direction, nodes, edges}.' : ready('mindmap') ? 'Mind map’s {root}.' : 'Diagram’s {direction, nodes, edges}.') } } : {}) }, required: ['page', 'baseVersion'] }),
    run: async (a, who, ctx) => {
      if (state().ai.perms.check) return fail(CHECK_PAGE);
      try {
        let content = contentIn(a), warnings = [];
        const cur = await pages.get(uidOf(), a.page);
        if (!cur) return fail('No page ' + a.page + '. list_pages gives the ids.');
        if (!pages.PAGE_READY.has(cur.kind)) return fail(notReady(cur.kind));
        if (cur.kind === 'note' && !noteData(a)) return fail(NOTE_DATA);
        // (a map is cleaned against the page as it is now, so its card ids can be checked; a stale baseVersion is still refused below)
        const m = Number(a.baseVersion) === cur.version ? mapIn(cur.kind, content, cur.data, a.title ?? cur.title, cur.scope, cur.scopeId) : null;
        if (m) { content = m.data; warnings = m.warnings; }
        const p = await ctx.once('update_page', () => pages.update(uidOf(), a.page, { baseVersion: a.baseVersion, title: a.title, data: content, who, ai: true, summary: a.summary, pro: isPro(), ready: true, cleaned: !!m }));
        if (p.scope === 'deck') touchDeck(p.scopeId, who);
        return text(writeOut('saved', p, merged(warnings, p.warnings), 'Saved as version ' + p.version + '.'));
      } catch (e) {
        if (e.code === 'conflict') return { content: [{ type: 'text', text: e.message }, { type: 'text', text: JSON.stringify(await pageOut(e.current), null, 2) }], isError: true };
        return fail(e.message);
      }
    } },
  { name: 'delete_page', perm: 'del', description: 'Delete a page. Pages inside it move up to where it was. Ask the learner first.',
    inputSchema: { type: 'object', properties: { page: { type: 'string', description: 'The page’s id.' } }, required: ['page'] },
    run: async (a, who, ctx) => {
      try {
        const m = await ctx.once('delete_page', () => pages.remove(uidOf(), a.page));
        if (m && m.scope === 'deck') touchDeck(m.scopeId, who);
        // (a map page's Test me marks go with it, and the old Figures mind map it was moved from: store.mjs page.gone)
        if (m) apply({ type: 'page.gone', pageId: m.id }, who);
        return text('Deleted the page.');
      } catch (e) { return fail(e.message); }
    } },
  // The study network (social.mjs): decks other people share. The learner can study one as it is, or copy it; on a deck
  // from someone else, an AI can only suggest changes, which the owner takes or skips.
  { name: 'search_shared_decks', perm: 'read', description: 'Find decks other people share publicly on Lucida, by words, by topic (a tag), or narrowed by level, subject and school. With none of these it lists popular ones. Each deck comes with its id, name, author, card count, labels and link. Use study_shared_deck to add one to the learner’s library.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, topic: { type: 'string', description: 'A topic (a tag), like "MCAT" or "Spanish".' },
      level: { type: 'string', enum: LEVELS.map(l => l[1]), description: 'Only decks for this level of study.' },
      subject: { type: 'string', enum: SUBJECTS.map(l => l[1]), description: 'Only decks about this subject.' },
      school: { type: 'string', description: 'Only decks labeled with this college or university, like "University of Michigan" or "UCLA".' } } },
    run: async (a, who, ctx) => {
      const narrow = { level: a.level, subject: a.subject, school: a.school };
      const r = a.query ? await social.search(a.query, ctx.uid, narrow) : await social.discover(ctx.uid, { tag: a.topic || '', ...narrow });
      const list = a.query ? r.decks : (r.sections.find(s => s.id === 'popular' || s.id === 'results') || { decks: [] }).decks;
      return text(list.map(d => ({ id: d.id, name: d.name, by: d.owner ? d.owner.name + ' (@' + d.owner.handle + ')' : undefined, cards: d.cards, saves: d.stars, studying: d.learners, checked_by_a_teacher: !!d.checked || undefined, about: d.description || undefined,
        level: levelWords(d.level) || undefined, subject: subjectWords(d.subject) || undefined, school: d.school || undefined, link: 'https://lucida.cards' + d.url })));
    } },
  { name: 'get_shared_deck', perm: 'read', description: 'Read a shared deck: who made it, its version, its first 100 cards, and whether the learner already studies or copied it. Takes the deck’s id (from search_shared_decks) or its link.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Its id, or its link (lucida.cards/@name/deck).' } }, required: ['id'] },
    run: async (a, who, ctx) => {
      const m = /@([a-z0-9_.]{3,30})\/([a-z0-9-]{1,60})/i.exec(String(a.id)), id = (/\b(s[a-z0-9]{6,40})\b/.exec(String(a.id)) || [])[1];
      const p = await social.deckPage(m ? { handle: m[1], slug: m[2] } : { id: id || a.id }, ctx.uid);
      if (!p) return fail('That deck isn’t shared.');
      return text({ id: p.id, name: p.name, by: p.owner && p.owner.name, about: p.description || undefined, level: levelWords(p.level) || undefined, subject: subjectWords(p.subject) || undefined, school: p.school || undefined, cards: p.cards, version: p.version, learner: p.me ? { studying: !!p.me.studying, copied: !!p.me.copied, saved: p.me.starred } : undefined,
        sample: p.cardsList.slice(0, 100).map(c => ({ id: c.id, kind: c.kind === 'cloze' ? 'fill in the blank' : c.kind, front: c.front || undefined, back: c.back || undefined, text: c.text || undefined })) });
    } },
  { name: 'study_shared_deck', perm: 'text', description: 'Add a shared deck to the learner’s library. By default they study it as it is, and its cards follow the owner’s changes; with copy: true it becomes the learner’s own copy to change.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The shared deck’s id (from search_shared_decks).' }, copy: { type: 'boolean' }, name: { type: 'string', description: 'A name for a copy.' } }, required: ['id'] },
    run: async (a, who, ctx) => { const r = await social.addShared(ctx.uid, null, a.id, { copy: !!a.copy, name: a.name || '', updates: true }); return text((a.copy ? 'Copied it into the library' : 'Added it to the library') + '. Deck id: ' + r.deckId + '.'); } },
  { name: 'suggest_changes', perm: 'text', description: 'Suggest changes to a deck the learner studies or copied from someone else (list_decks shows "from" on it): fix a card, add cards, or take one out. The deck’s owner gets the suggestion, and nothing changes until they take it. "message" says why.',
    inputSchema: { type: 'object', properties: {
      deck: { type: 'string', description: 'The deck’s name or id in the learner’s library.' }, message: { type: 'string' },
      changes: { type: 'array', minItems: 1, items: { type: 'object', properties: { card: { type: 'string', description: 'The card’s id (from list_cards). Leave out to add a new card.' }, remove: { type: 'boolean', description: 'true to suggest taking the card out.' },
        kind: { type: 'string', enum: ['basic', 'cloze'] }, front: { type: 'string' }, back: { type: 'string' }, text: { type: 'string', description: 'For fill in the blank, with [[blanks]].' }, note: { type: 'string' } } } } }, required: ['deck', 'changes'] },
    run: async (a, who, ctx) => {
      const d = deckBy(a.deck);
      if (!d) return fail('No deck called ' + a.deck);
      if (!d.link || d.link.gone) return fail('This is the learner’s own deck: change it directly (update_card, add_cards).');
      const changes = (a.changes || []).map(c => {
        const mine = c.card && state().cards.find(x => x.id === c.card && x.deckId === d.id), after = {};
        for (const k of ['kind', 'front', 'back', 'text', 'note']) if (c[k] != null) after[k] = c[k];
        return c.card ? (mine && mine.origin ? { op: c.remove ? 'remove' : 'edit', card: mine.origin, after } : null) : { op: 'add', after };
      }).filter(Boolean);
      if (!changes.length) return fail('None of those cards are in ' + d.name + '.');
      const r = await social.suggest(ctx.uid, null, d.link.id, { message: a.message || '', changes }, who);
      return text(r.taken ? 'The learner helps keep this deck, so the changes went straight in.' : 'Sent to ' + d.link.owner.name + '. Nothing changes until they take it.');
    } }
];
// What each tool is, for the AI app's permission prompts and for the directories' checks (Claude's and ChatGPT's both turn
// a tool down without a title and explicit hints). `ro`: it only reads. `destructive`: it may overwrite or delete what the
// learner has (changing a card or a deck replaces what was there; adding things doesn't). `open`: it reaches beyond the
// learner's own library (other people's shared decks, and messages to their owners). `idem`: calling it again with the same
// words changes nothing more. `scope`: what a signed-in app needs (oauth.mjs). A new tool needs a row here; web tests fail without one.
const META = {
  list_decks: { title: 'List decks', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  list_cards: { title: 'List or search cards', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_due_cards: { title: 'Get cards due for review', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_stats: { title: 'Get study stats', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_weak_spots: { title: 'Find weak spots', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_review_history: { title: 'Get review history', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  create_deck: { title: 'Create a deck', scope: 'cards:write', ro: false, destructive: false, open: false, idem: false },
  update_deck: { title: 'Change a deck', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  add_cards: { title: 'Add cards', scope: 'cards:write', ro: false, destructive: false, open: false, idem: false },
  update_card: { title: 'Change a card', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  add_quiz: { title: 'Save Learn mode questions', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  delete_cards: { title: 'Delete cards', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  list_guide_pages: { title: 'List a deck’s Guide pages', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_guide: { title: 'Read a deck’s Guide', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  update_guide: { title: 'Write a deck’s Guide', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  add_guide_page: { title: 'Add a Guide page', scope: 'cards:write', ro: false, destructive: false, open: false, idem: false },
  list_pages: { title: 'List pages', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  get_page: { title: 'Read a page', scope: 'cards:read', ro: true, destructive: false, open: false, idem: true },
  create_page: { title: 'Make a page', scope: 'cards:write', ro: false, destructive: false, open: false, idem: false },
  update_page: { title: 'Change a page', scope: 'cards:write', ro: false, destructive: true, open: false, idem: false },
  delete_page: { title: 'Delete a page', scope: 'cards:write', ro: false, destructive: true, open: false, idem: true },
  search_shared_decks: { title: 'Search shared decks', scope: 'cards:read', ro: true, destructive: false, open: true, idem: true },
  get_shared_deck: { title: 'Read a shared deck', scope: 'cards:read', ro: true, destructive: false, open: true, idem: true },
  study_shared_deck: { title: 'Add a shared deck to the library', scope: 'cards:write', ro: false, destructive: false, open: true, idem: false },
  suggest_changes: { title: 'Suggest changes to a shared deck', scope: 'cards:write', ro: false, destructive: false, open: true, idem: false }
};
// A tool as tools/list shows it. An app that signed in through Lucida (not a secret link) is also told which scope each tool needs.
const listed = (t, oauth) => {
  const m = META[t.name], schemes = m && oauth ? [{ type: 'oauth2', scopes: [m.scope] }] : null, extra = { ...(t.meta || {}), ...(schemes ? { securitySchemes: schemes } : {}) };
  const now = v => (typeof v === 'function' ? v() : v);
  return { name: t.name, ...(m ? { title: m.title } : {}), description: now(t.description), inputSchema: now(t.inputSchema),
    ...(m ? { annotations: { title: m.title, readOnlyHint: m.ro, destructiveHint: m.destructive, idempotentHint: m.idem, openWorldHint: m.open } } : {}),
    ...(schemes ? { securitySchemes: schemes } : {}), ...(Object.keys(extra).length ? { _meta: extra } : {}) };
};
export const toolNames = () => TOOLS.map(t => t.name);
const allowed = () => TOOLS.filter(t => state().ai.perms[t.perm]);
const nameOf = info => { const n = String((info && info.name) || 'MCP app').replace(/\s+/g, ' ').trim().slice(0, 60) || 'MCP app'; return /claude/i.test(n) ? 'Claude' : /openai|chatgpt/i.test(n) ? 'ChatGPT' : /cursor/i.test(n) ? 'Cursor' : n; };

async function handle(m, sid, ctx) {
  if (m.id === undefined || m.id === null) return null; // notifications need no answer
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => ({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    switch (m.method) {
      case 'initialize': {
        const info = (m.params || {}).clientInfo || {};
        if (sessions.size > 10000) sessions.clear();
        sessions.set(sid, nameOf(info)); lastClient.set(ctx.uid || '', nameOf(info));
        apply({ type: 'ai.client', name: nameOf(info), version: info.version });
        const asked = (m.params || {}).protocolVersion;
        return ok({ protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0], capabilities: { tools: {} },
          serverInfo: { name: 'lucida', title: 'Lucida', version: '1.0.0', websiteUrl: 'https://lucida.cards' },
          instructions: 'Lucida holds the learner’s flashcards. Use list_decks first. Make clear, short cards with one idea each; use cloze cards with [[blanks]] for facts inside sentences. ' + FORMAT +
            ' Image cards show a picture: a link, a file the learner uploaded in the chat, or a file on this computer. Audio cards read words aloud (put them in "speak" and the language in "lang"); use them for languages and pronunciation.' +
            ' Learn mode quizzes the learner on a deck: add_quiz gives cards better questions (multiple choice with plausible wrong answers, or true or false) and an explanation. Decks can sit in folders and have a cover picture and a background (update_deck).' +
            ' A deck can have a Guide, its notes page in Markdown with toggles (":::toggle Its title" ... ":::"; get_guide, update_guide, and extra pages with list_guide_pages and add_guide_page); a shared deck shows it on its public page.' +
            ' To help with what the learner finds hard, get_weak_spots lists their weakest tags and hardest cards (with ids to quiz them or fix the cards), and get_review_history sums up their recent reviews.' +
            PAGES_SAY() + WEAK_SAY });
      }
      case 'ping': return ok({});
      case 'tools/list': return ok({ tools: allowed().map(t => listed(t, ctx.oauth)) });
      case 'tools/call': {
        const p = m.params || {}, t = allowed().find(x => x.name === p.name);
        if (!t) return ok(fail(TOOLS.some(x => x.name === p.name) ? 'The learner turned this off on the Connect AI page.' : 'Unknown tool ' + p.name));
        return ok(await t.run(p.arguments || {}, sessions.get(sid) || lastClient.get(ctx.uid || '') || 'AI', ctx));
      }
      default: return err(-32601, 'Method not found: ' + m.method);
    }
  } catch (e) { return m.method === 'tools/call' ? ok(fail(e.message)) : err(-32603, e.message); }
}

// `auth` is set when the app signed in through Lucida (oauth.mjs): { scopes, origin }. A secret link has none, and may do everything
// the Connect AI page allows.
export async function mcp(req, res, body, uid, auth = null) {
  if (req.method !== 'POST') { res.writeHead(req.method === 'DELETE' ? 200 : 405, { allow: 'POST' }).end(); return; }
  let msg;
  try { msg = JSON.parse(body); } catch { res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })); return; }
  let sid = req.headers['mcp-session-id'];
  const list = Array.isArray(msg) ? msg : [msg];
  if (!sid && list.some(x => x && x.method === 'initialize')) sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  // A connection that was only allowed to read can't call a tool that changes things: 403, asking the app to sign in again with more.
  if (auth) {
    const short = [...new Set(list.map(x => (x && x.method === 'tools/call' ? META[(x.params || {}).name] : null)).filter(m => m && !auth.scopes.has(m.scope)).map(m => m.scope))];
    if (short.length) {
      const scope = [...new Set([...auth.scopes].filter(x => x in SCOPES).concat(short))].join(' '), what = 'This connection may only read. Connect the app again and allow it to change cards.';
      res.writeHead(403, { 'content-type': 'application/json', 'www-authenticate': challenge(auth.origin, { error: 'insufficient_scope', scope, description: what }) }).end(JSON.stringify({ error: 'insufficient_scope', error_description: what }));
      return;
    }
  }
  // Files on this computer are only for AI apps running here: not through a tunnel or proxy, which adds these headers.
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !['x-forwarded-for', 'forwarded', 'x-real-ip', 'cf-connecting-ip'].some(h => req.headers[h]);
  const once = pages.onceFor(req), out = (await Promise.all(list.map(x => handle(x || {}, sid, { local, uid, oauth: !!auth, once: (k, fn) => once((x && x.id) + ':' + k, fn) })))).filter(Boolean);
  const head = { 'content-type': 'application/json', ...(sid ? { 'mcp-session-id': sid } : {}) };
  if (!out.length) { res.writeHead(202, head).end(); return; }
  res.writeHead(200, head).end(JSON.stringify(Array.isArray(msg) ? out : out[0]));
}
