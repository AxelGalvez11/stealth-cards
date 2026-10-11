# Lucida Step 4 spec: Mind map and Diagram pages ("Recall Maps")

Base design: **Recall Maps (study-first)**, the highest total score (23 of 30). It adds the ideas the judges said to take from the other two designs (agent-first: safety sequencing, write replies that echo ids, the text forms, row/order slots; Quiet Maps: the single idea bar, the MapLayouts gallery, the ring layout, the `folded` setting an agent can use, help text written once). It fixes every blocking issue the judges raised. Code facts were checked in `/Users/axelgalvez/Desktop/stealth-cards-ai-pages`.

Code facts checked:
- `web/pages.mjs` cleanData (lines 36-49) accepts any object for kinds other than note.
- `update` passes `prev` only for notes.
- `READY = new Set(['note'])`.
- `web/pagesclient.js` flush merges only when `cur.kind === 'note'`. `ios/Lucida/Data/Pages.swift:165` does the same, and its fallback is `["blocks": []]`.
- `ios/Lucida/Screens/Page.swift` `pageArea` always mounts `NotesView`.
- The handler's `restore` goes through `update` with `ai` false.
- `notes.js` `lookup()` cuts a page down to `{title, kind}`. Its header carries a SAFE rule.
- `add_cards` does not return card ids.
- Theme tokens include `againTint`, `hardTint` and `goodTint`, and no `easyTint`.
- `BackSwipe.canPop` exists (`Design/Swipe.swift`).
- The iOS deployment target is 18.0.
- `check-own-ui` forbids `inputAccessoryView`, `.contextMenu`, `.popover`, `Menu`, `List`, `Toggle`, `<select>`, checkbox inputs and `title=`.

---

## 1. Summary

1. Mind map pages (`{root}` tree) and Diagram pages (`{direction, nodes, edges}`) are JSON where every idea, box and arrow has a stable id. One new pure engine, **`web/maps.js`**, draws them, and the same file runs on the server, in the web app, on the canvas boards and on the iPhone (through JavaScriptCore). The picture is the same everywhere, and no layout is ported to Swift.
2. They are study pages first. Test me hides the words; the learner reveals each one and marks it "Knew it" or "Missed". Those results are private study data (`S.mapMarks`) and never create a page version. On a map, color only ever means memory strength.
3. Editing uses one **idea bar**, the same on web and iPhone. Next to it is an id-keyed Outline (mind map) or Statements view (diagram), which is also the screen-reader surface and the fast way to type on a phone. Diagram boxes move by snapping to **row/order slots**, never to x/y positions.
4. Agents write `text` (an indented list, or arrow lines, carrying ids) or `data`. The server repairs what it can and warns. When an AI write leaves out learner-owned fields, they are kept. Card ids are checked. Every write answers with the page as saved, text with ids included. `get_page` returns text plus a study block to tutor from.
5. Order of shipping:
   - **First, safety:** the server refuses Note-shaped data on map pages, older iPhone builds show "Update Lucida", and conflicts merge by kind.
   - **4a:** the Mind map, end to end.
   - **4b:** the Diagram.
   - Mind maps made from cards move out of `deck.diagrams` into pages. Tables and pictures stay where they are.

---

## 2. Data schemas

### 2.0 Rules shared by both kinds

- **One function per kind does the cleaning.** `maps.normalize(kind, input, prev, {ai, title})` returns `{data, warnings}`. `web/pages.mjs` `cleanData` calls it on every create and update, whether the write comes from the app, MCP, Lucida's AI, the migration or a restore. It repairs what it can and refuses only input that isn't that kind at all.
- **When the AI-keep rule applies.** `ai: true` is set for MCP writes and Lucida's AI. `ai: false` (the default) is set for app saves and Restore, which are taken exactly as sent.
- **Ids.** An id matches `/^[A-Za-z0-9_-]{1,40}$/` and is unique within the page. Every id lookup uses `Map` objects or arrays, never object keys: an id like `"12"` would change the order of plain-object keys.
- **Labels.** `maps.plain(s, max)` cleans every label. It uses the same rules as `diagrams.mjs` `plainText` (which will then call it): HTML tags, Markdown marks, URLs, control and bidi characters are removed, whitespace is collapsed to one line, and the result is cut at a code point boundary.
- **Notes.** A note is cleaned the same way, but line breaks are kept. The limit is 600 code points and 8 lines.
- **Key order is fixed** and empty optional fields are left out, so two versions can be compared as JSON text. Unknown keys are dropped.
- **Never stored:** colors (color on a map means memory strength), zoom, camera, which side of the root a branch sits on, the learner's fold state on a device, Test me results, and any x/y.
- **Size.** `PAGES.bytes` (400 KB) still applies. A 200-idea map is about 20 KB.
- **Plans.** The caps are technical and the same on Free and Pro. Every page kind is free. Free's limits of 25 pages per deck and 25 versions per page apply to map pages too.
- **Wrong shape.** Note-shaped data (a `blocks` array) sent to a map kind is refused with `PageError` code `'shape'` (see §3.7). This is the protection against old apps.

### 2.1 Mind map (`kind: "mindmap"`)

```
{ "root": Idea }
Idea = { "id": string, "label": string, "note"?: string, "cardIds"?: [string], "folded"?: true, "children"?: [Idea] }
```

| Field | Rule |
|---|---|
| `id` | See §2.0. When an id is missing or invalid, the idea is matched to the previous version in this order: (1) same label, ignoring case and spacing, under the same parent id; (2) same label anywhere, if exactly one idea has it; (3) otherwise a new id. New ids are made as follows: when the server writes, a slug of the label (`"Krebs cycle in the matrix"` → `krebs-cycle-in-the-matrix`, at most 32 characters; a label with no Latin letters gets `i` + 6 base-36 characters of an FNV-1a hash), with `-2`, `-3` added to keep it unique. When the app writes, `n` + 7 random base-36 characters, made in `mapview.js` or Swift and never in `maps.js`. Bad characters are slugged, not dropped. With duplicate ids, the first idea keeps the id and later ones go through steps 1-3, with a warning. |
| `label` | One line, at most **80** code points. Only the root may be `""`, in which case the map shows the page title. From the app, `""` is allowed while a new idea is being typed. From an AI write, an empty idea below the root is dropped and its children move up to its parent. |
| `note` | The explanation, at most 600 code points and 8 lines. It shows in the idea bar and becomes the back of a card made from the idea. It is never drawn on the map. |
| `cardIds` | At most **8** per idea, unique, same pattern as ids. On MCP writes, ids that aren't cards in this deck (or, for a folder page, in one of the folder's decks) are dropped with a warning. |
| `folded` | Only `true` is stored. It means "starts folded", so the learner guesses what is underneath first. Set by an agent, or by the owner through idea bar ⋯ › Start folded. Folding during study is per device and never saved. |
| `children` | Kept in order. |

**Caps:**
- 200 ideas including the root.
- 6 levels under the root.
- 20 children under one idea.

Ideas are kept in breadth-first order and cut from the end, so the deepest ideas of the last branches go first and the topic and main ideas always survive. Each kind of cut produces one warning.

**AI-keep rule (`ai: true`).** When an AI write keeps an idea (by id, or by the matching above) but leaves out `note` or `cardIds`, the saved value stays. To clear them:
- in data, send `"note": null` / `""` or `"cardIds": []`;
- in text, a lone `>` line clears the note and an empty `cards:` clears the cards.

An idea that is absent is deleted along with its subtree, unless its id appears elsewhere in the write, which makes it a move. `label`, `folded` and the structure are always taken as sent.

**Accepted input:**
- `{root}` (the stored shape).
- `{tree}` (the old `deck.diagrams` shape).
- A bare Idea.
- `text` as another name for `label`.
- `cards` as another name for `cardIds`, with a warning.
- A child given as a plain string.
- Outline text (below), sent as a string, `{text}` or `{markdown}`.
- Any of the above as a JSON string, which is parsed.

**Refused:** `{blocks:[…]}`, arrays, numbers, and anything with no `root`, `tree`, `label` or `text`.

**Starting value** (a new page, or no content sent): `{"root":{"id":"root","label":""}}`.

**Outline text** (`maps.mindmapFromText(text, prev, {title})` and `maps.textOf('mindmap', data)`):
- One idea per line. A bullet is optional: `- `, `* `, `+ ` or `1. `.
- Depth comes from indentation. Any consistent step works (2 spaces, 4 spaces or a tab), judged against the nearest shallower line. A jump of more than one level counts as one level, with a warning.
- `# X` is the topic. `## X` is a main idea, and list items under a heading nest under it.
- The first, shallowest line is the topic. If there are several top-level lines, the page title becomes the topic and those lines become its branches, with a warning.
- An optional `{…}` block at the end of a line holds `#id`, `folded` and `cards:id,id` in any order, for example `{#mito folded cards:c1,cm2}`.
- A line starting with `> ` belongs to the nearest idea line above it and adds to that idea's note. Several such lines are joined with line breaks. A lone `>` clears the note.
- Mermaid mindmap input also works:
  - A first line `mindmap` is skipped.
  - The shape wrappers `root((x))`, `((x))`, `(x)`, `[x]`, `{{x}}`, `))x((` and `)x(` are stripped.
  - `::icon(…)` and `:::class` lines are skipped, with a warning.
- When printing, the topic has no bullet. Items use `- ` and 2 spaces per level. Every line carries `{#id}`, plus `folded` and `cards:` when they are set. Notes print as `> ` lines at the children's indentation.
- Text → data → text gives back exactly the same text.

**Example (data):**
```json
{"root":{"id":"cell","label":"The cell","children":[
  {"id":"nucleus","label":"Nucleus","children":[
    {"id":"dna","label":"Holds the DNA"},
    {"id":"nucleolus","label":"Nucleolus makes ribosomes","cardIds":["cm3"]}]},
  {"id":"mito","label":"Mitochondria","note":"Most ATP is made on the inner membrane, by ATP synthase.","cardIds":["cm1"],"children":[
    {"id":"krebs","label":"Krebs cycle in the matrix","cardIds":["c1"]},
    {"id":"etc","label":"Electron transport on the inner membrane","cardIds":["cm2"]}]},
  {"id":"er","label":"ER and Golgi","folded":true,"children":[
    {"id":"rough-er","label":"Rough ER makes proteins","cardIds":["cm5"]},
    {"id":"smooth-er","label":"Smooth ER makes lipids"}]}]}}
```

**The same map as text:**
```
The cell {#cell}
- Nucleus {#nucleus}
  - Holds the DNA {#dna}
  - Nucleolus makes ribosomes {#nucleolus cards:cm3}
- Mitochondria {#mito cards:cm1}
  > Most ATP is made on the inner membrane, by ATP synthase.
  - Krebs cycle in the matrix {#krebs cards:c1}
  - Electron transport on the inner membrane {#etc cards:cm2}
- ER and Golgi {#er folded}
  - Rough ER makes proteins {#rough-er cards:cm5}
  - Smooth ER makes lipids {#smooth-er}
```

### 2.2 Diagram (`kind: "diagram"`)

```
{ "direction": "down" | "right", "nodes": [Box], "edges": [Arrow] }
Box   = { "id", "label", "shape"?: "round" | "diamond", "note"?, "cardIds"?: [string], "row"?: int, "order"?: int }
Arrow = { "from": boxId, "to": boxId, "label"?: string, "dashed"?: true }
```

| Field | Rule |
|---|---|
| `direction` | Always stored. `down` is the default. `TB`, `TD` and `vertical` mean down; `LR` and `horizontal` mean right. `BT` becomes down and `RL` becomes right, with a warning that flipped directions aren't drawn. |
| Box `id`, `label` | Ids follow the mind map rules; when the server makes them, they are slugs (`b`-prefixed when the label has no Latin letters). Labels are at most **60** code points. A box with no label is dropped. |
| `shape` | `box` is the default and is left out. `round` is a start, an end, a molecule or a state. `diamond` is a question or a choice. Accepted names: `pill`, `rounded`, `stadium`, `circle`, `oval`, `start`, `end` and `terminal` mean round; `rhombus`, `decision`, `question` and `condition` mean diamond; `rect`, `rectangle` and `process` mean box. Anything else becomes box, with a warning. |
| `note`, `cardIds` | As on a mind map (600 code points; at most 8 card ids, checked over MCP). |
| `row`, `order` | The learner's **slot**: the row (layer) from the top, or from the left when the diagram goes right, 0-39; and the place in that row, 0-79. Only the app's editor writes them, through the place operation. When an AI write sends them, they are ignored with a warning. When an AI write leaves them out, they are kept. Tidy up clears every slot in one save. |
| Arrow key | `from>to`. There are no arrow ids. **One arrow per ordered pair**: a second `from>to` is merged into the first (it adds its label if the first had none), with a warning. `A>B` and `B>A` can both exist. An arrow from a box to itself is allowed and is drawn as a loop. |
| `from`, `to` | Box ids. In data, an unknown end is matched to the box whose label it equals (ignoring case, one match only), with a warning; failing that, the arrow is dropped, with a warning. In text, words that name no box make a new box, with a warning. |
| Arrow `label` | A verb phrase, at most **40** code points. On AI writes, `label` and `dashed` follow the AI-keep rule: when the key is absent, the saved value stays. |

**Caps:** 80 boxes and 160 arrows. The extras at the end are dropped with warnings; arrows to a dropped box go too.

**AI-keep rule.** When a kept box leaves out `note` or `cardIds`, they stay. `row` and `order` always stay on AI writes. An absent box is deleted along with its arrows, and an absent arrow is deleted.

**Starting value:** `{"direction":"down","nodes":[],"edges":[]}`.

**Arrow-line text** (`maps.diagramFromText(text, prev)` and `maps.textOf('diagram', data)`). Lines are read one at a time, and parsing never fails as a whole.
- Header (optional): `direction down` or `direction right`; Mermaid's `flowchart TD|TB|LR|BT|RL` and `graph …` also work.
- Declaring a box: the bracket must touch the id (`/^[A-Za-z0-9_-]{1,40}[\[\(\{]/`). `id[Words]` is a box; `id(Words)`, `id([Words])` and `id((Words))` are round; `id{Words}` is a diamond. Quotes around the words are removed, so `"…"` lets a label contain brackets. A line that only declares a box (or is only plain words) adds a box with no arrows. ` {cards:c1,c2}` at the end of such a line links cards.
- Arrows:
  - `X -> Y`, `X --> Y`, `X → Y` and `X ==> Y` are all a solid arrow.
  - `X -.-> Y` and `X ..> Y` are dashed. This stays compatible with Mermaid, where `-->` is solid.
  - Labels can be written `X -> Y : words`, `X -->|words| Y` or `X -- words --> Y`.
  - Chains such as `A -> B -> C : words` work; the label goes on the last arrow.
  - Each end may be an id, an inline declaration, or plain words.
- A `> ` line is the note of the last box named on the line above. A lone `>` clears the note.
- Skipped with one warning: `%%` comments and whole lines that start with `subgraph`, `end`, `style`, `classDef`, `class`, `click` or `linkStyle`. `end` inside an arrow line is just a word.
- Printing writes `direction …`, then every box as a declaration with its `{cards:…}` and `> ` notes, then every arrow by id. Text → data → text gives back exactly the same text.
- **Statements** (`maps.statementsOf`) are read-only, for agents and screen readers. Examples: `Glucose —is split into→ Pyruvate`, `Cyanide —blocks (dashed)→ Complex IV`, `Coenzyme Q → Complex III`. They end with `Alone: X, Y` for boxes that have no arrows.

**Example (sample page "Electron transport chain", ps4):**
```json
{"direction":"down",
 "nodes":[
  {"id":"nadh","label":"NADH","shape":"round"},
  {"id":"fadh","label":"FADH₂","shape":"round"},
  {"id":"c1","label":"Complex I"},
  {"id":"c2","label":"Complex II"},
  {"id":"q","label":"Coenzyme Q"},
  {"id":"c3","label":"Complex III"},
  {"id":"cytc","label":"Cytochrome c"},
  {"id":"c4","label":"Complex IV","note":"Cyanide and carbon monoxide block it.","cardIds":["cm6"]},
  {"id":"o2","label":"O₂ becomes H₂O","shape":"round","cardIds":["cm7"]},
  {"id":"grad","label":"H⁺ gradient","note":"Pumped into the space between the membranes."},
  {"id":"atps","label":"ATP synthase"},
  {"id":"atp","label":"ATP","shape":"round"},
  {"id":"cn","label":"Cyanide"}],
 "edges":[
  {"from":"nadh","to":"c1","label":"gives electrons to"},
  {"from":"fadh","to":"c2","label":"gives electrons to"},
  {"from":"c1","to":"q","label":"passes electrons to"},
  {"from":"c2","to":"q","label":"passes electrons to"},
  {"from":"q","to":"c3","label":"passes electrons to"},
  {"from":"c3","to":"cytc","label":"passes electrons to"},
  {"from":"cytc","to":"c4","label":"passes electrons to"},
  {"from":"c4","to":"o2","label":"reduces"},
  {"from":"c1","to":"grad","label":"pumps H⁺ into"},
  {"from":"c3","to":"grad","label":"pumps H⁺ into"},
  {"from":"c4","to":"grad","label":"pumps H⁺ into"},
  {"from":"grad","to":"atps","label":"drives"},
  {"from":"atps","to":"atp","label":"makes"},
  {"from":"cn","to":"c4","label":"blocks","dashed":true}]}
```

**The same diagram as text (first lines):**
```
direction down
nadh(NADH)
fadh(FADH₂)
c1[Complex I]
c4[Complex IV] {cards:cm6}
> Cyanide and carbon monoxide block it.
nadh -> c1 : gives electrons to
cn -.-> c4 : blocks
```

---

## 3. Agent authoring (MCP, `web/mcp.mjs`)

### 3.1 Decisions

- What is stored is the JSON above. Agents write **`text`** (the simplest form, and the one models get right most often) or **`data`**. There is a single `text` parameter: for a mind map it is the outline, for a diagram the arrow lines. `markdown` is accepted as another name for `text` on map kinds.
- Mermaid is accepted only as the line-by-line subsets above. There is no full Mermaid parser.
- **Not in step 4:** the `ops` argument, the server merging stale agent writes itself, and a `mark_ideas` tool. A stale write still gets a 409 with the current page as text with ids, so the agent's retry is cheap. This keeps one documented contract for every kind.
- Each kind's help is written **once**, in `create_page`. `update_page` refers to it.
- Help for a kind is included only once that kind is in `PAGE_READY`. The wording below is the final version, after 4b.
- The `kind` enum is narrowed to `[...pages.READY]`.

### 3.2 Strings to paste (house voice; agent-facing, in English)

```js
const MINDMAP_HELP = 'MIND MAP (kind "mindmap"): one topic in the middle, broken into its ideas (a tree). Lucida lays it out and colors it by how well the learner knows each idea, so never send positions or colors. Easiest as text: an indented list, the topic on the first line, two spaces a level; "{#id}" at the end of a line keeps that idea’s id ("{#id folded}" also starts it folded, so the learner guesses what is under it before opening it; "{#id cards:c1,c2}" links the deck’s cards that test it), and a "> " line under an idea is its note: "The cell {#cell}\n- Mitochondria {#mito cards:c1}\n  > Most ATP is made on the inner membrane.\n  - Krebs cycle in the matrix\n  - Electron transport on the inner membrane\n- Nucleus\n  - Holds the DNA". Or as data: {"root":{"id":"cell","label":"The cell","children":[{"id":"mito","label":"Mitochondria","note":"Most ATP is made on the inner membrane.","cardIds":["c1"],"children":[{"label":"Krebs cycle in the matrix"}]}]}}. An idea has a label (the one thing to recall: a term or a few words, never a sentence; up to 80 characters) and may have an id (letters, digits, - and _, up to 40; Lucida makes one when you leave it out), a note (the explanation, up to 600 characters), cardIds (up to 8 of the deck’s cards; list_cards gives ids), folded (true) and children. Up to 200 ideas, 6 levels under the topic and 20 under one idea; best is 3 to 7 main ideas with 2 to 6 under each. Steps, causes and links across branches belong in a Diagram.';

const DIAGRAM_HELP = 'DIAGRAM (kind "diagram"): boxes and the labelled arrows between them, for steps, pathways, cycles and causes (a topic and its parts is a Mind map). Lucida lays it out in rows (a single loop as a circle) and colors it by how well the learner knows each part, so never send positions or colors. Easiest as text, one arrow a line, "A -> B : what the arrow does": "direction down\nglc(Glucose) -> pyr[Pyruvate] : is split into\npyr -> acoa[Acetyl-CoA] : is oxidized to\nacoa -> krebs[Krebs cycle] : enters\nc4[Complex IV] {cards:c7}\n> Cyanide and carbon monoxide block it.\ncn[Cyanide] -.-> c4 : blocks". Name a box once with its id touching a bracket: id[Words] (a box), id(Words) (round: a start, an end, a molecule) or id{Words} (a diamond: a question or a choice); after that, use its id. -.-> is a dashed arrow (indirect, or only sometimes). A line with only a box adds it, and " {cards:…}" at its end links the deck’s cards; a "> " line is the note of the last box on the line above. "direction right" lays it out across. Mermaid flowchart lines work too (A[Glucose] -->|is split into| B[Pyruvate]); subgraphs and styles are skipped. Words that name no box make a new box. Or as data: {"direction":"down","nodes":[{"id":"glc","label":"Glucose","shape":"round"},{"id":"pyr","label":"Pyruvate","cardIds":["c2"]}],"edges":[{"from":"glc","to":"pyr","label":"is split into"}]}. A box: id, label (up to 60 characters), shape ("box", "round" or "diamond"), note (up to 600), cardIds (up to 8). An arrow: from and to (box ids), label (a verb, up to 40 characters: "produces", "inhibits", "is converted to"; never "relates to": the learner is tested on the sentence), dashed (true). One arrow per pair of boxes and direction. Up to 80 boxes and 160 arrows.';

const FIX_HELP = 'Lucida fixes what it can (a repeated id, an arrow to a box that isn’t there, a label too long, too many ideas, card ids that aren’t the deck’s) and lists what it changed in warnings; the answer gives the page as saved, as text with every id.';
```

**`list_pages`:**
> 'List the pages beside a deck’s (or a folder’s) cards: notes, mind maps and diagrams (presentations, canvases and docs are coming). Each comes with its id, kind, title, version, who changed it last and when, and the id of the page it sits inside (pages nest); a mind map or a diagram also says when the learner last tested themselves on it. With no deck or folder it lists every page the learner has. Read one with get_page.'

`pageLine` gains `tested: 'YYYY-MM-DD'` for map kinds that have marks.

**`get_page`:**
> 'Read one page: its kind, title, version (send it back as baseVersion when you change the page) and its content. A Note comes as blocks, or as Markdown with format "markdown". A Mind map comes as text (the indented list, every idea with its {#id}); a Diagram as text (its arrow lines, with ids) and as statements, one sentence an arrow ("Glucose —is split into→ Pyruvate"); format "json" adds the data. Every page comes with how the learner is doing on it: cards (the deck’s cards it links to, each with the ideas it tests; weak: they keep forgetting it) and, on a mind map or a diagram, study: what they missed when they last hid the words and tested themselves (each with its path), what no test or card covers yet, and the weakest branches. Tutor from that: quiz them on what they missed, explain an idea in its note, add the missing step, or make a card (add_cards) and link it (update_page). A Note lists the pages it shows inside (embeds).'

The format enum is `['blocks','markdown','text','json']`. For a Note, `text` is the same as markdown and `json` the same as blocks.

**`create_page`:**
> 'Make a page beside a deck’s (or a folder’s) cards, like an artifact the learner keeps and studies from. kind is "note" (explanations), "mindmap" (a topic broken into its ideas) or "diagram" (how things lead to each other); presentations, canvases and docs are coming. Give the content one way: a Note as blocks or markdown; a Mind map or a Diagram as text (simplest) or data. The learner tests themselves on a mind map or a diagram by hiding its words, so make each label the one thing worth recalling, and link the deck’s cards that test it. ' + NOTE_HELP + ' ' + MINDMAP_HELP + ' ' + DIAGRAM_HELP + ' ' + FIX_HELP + ' A deck holds up to 25 pages on Free, 500 on Pro. Put the page inside another with inside (its id). To show a mind map or a diagram inside a Note, put {type:"embed", pageId} in the Note: it shows a live picture of it.'

**`update_page`** (the helps are no longer repeated here):
> 'Change a page: its title and/or its content, the whole content as it should be now (a Note’s blocks or markdown; a Mind map’s or a Diagram’s text or data, as create_page describes). Send baseVersion, the version you read with get_page: if the page changed since (the learner wrote in it, or another app did), nothing is saved and you get the page as it is now; make your change on that and send it with its version. Keep the id of every idea, box and block you didn’t change: the learner’s test results and card links hang on them (one sent without an id is matched to the old one with the same words). On a Mind map or a Diagram, an idea or box you leave out is deleted (an idea with everything under it), but a note or cardIds you leave out of one you keep stays as it was, and so does where the learner put a box; send null or [] in data (in text, a lone ">" line or an empty cards:) to clear it. Every save is a version the learner can restore; say what you changed in summary (Lucida writes one if you don’t). ' + FIX_HELP

**`NOTE_HELP` change:** the embed entry becomes `{type:"embed", pageId} (shows another page inside; a mind map or a diagram shows as its live picture)`.

**`notReady(kind)`:**
> 'Lucida can’t show ' + NAME + ' pages yet; make a note, a mind map or a diagram.'

For a kind that doesn't exist: 'A page is a note, a mind map or a diagram (the others are coming).' Both lists are built from `PAGE_READY`.

**`add_cards` reply** gains the new ids: `… Their ids: c…, c… (link them to a page’s ideas with update_page).`

**Server instructions** (the pages sentence in `mcp.mjs` around line 492):
> 'Beside a deck’s cards the learner keeps pages you can make and change, like artifacts for studying: notes, mind maps (a topic and its ideas, each linked to the cards that test it) and diagrams (boxes and labelled arrows: processes, pathways, cycles), which Lucida lays out itself (list_pages, get_page, create_page, update_page with the baseVersion you read, delete_page). The learner tests themselves on a map by hiding its words; when you tutor, read the page’s study block, quiz them on what they missed, then improve the page. Every save is a version the learner can restore.'

If Axel approves Q2 (§13), add: 'A weak card is one whose recall is low now, not one ever forgotten.'

### 3.3 Input schemas

| Tool | Properties |
|---|---|
| `create_page` | `deck`, `folder`, `kind {enum: [...READY]}`, `title`, `inside`, `blocks`, `markdown`, `text {type:'string', description:'A Mind map as an indented list, or a Diagram as arrow lines (see above). A Note’s Markdown works here too.'}`, `data {type:'object', description:'A Mind map’s {root} or a Diagram’s {direction, nodes, edges}.'}` |
| `update_page` | `page`, `baseVersion`, `title`, `summary`, `blocks`, `markdown`, `text`, `data` |

- `noteIn(a)` becomes `contentIn(a)`, which returns exactly one of `{blocks}`, `{markdown}`, `{text}` or `{data}`. More than one is refused (§3.7).
- `pages.update` knows `cur.kind`, so `cleanData(kind, …)` refuses a wrong shape there.
- Only MCP checks `cardIds` against the deck (`checkCards(sc, data)`, warnings). App writes come from the card picker.

### 3.4 Accepted inputs

| Kind | Accepted | Refused |
|---|---|---|
| note | `blocks`, `markdown` (`text` is treated as markdown) | — |
| mindmap | `text`/`markdown` (outline, including the Mermaid mindmap subset); `data` = `{root}`, `{tree}`, a bare Idea, `text` as another name for label, `cards` as another name for cardIds, string children, a JSON string | `blocks`, anything unrecognizable |
| diagram | `text`/`markdown` (arrow lines, including the Mermaid flowchart subset); `data` = `{direction, nodes, edges}` with the shape, direction and endpoint aliases above, a JSON string | `blocks`, anything unrecognizable |

### 3.5 Write replies

```json
{ "made": {"id":"p8k2a9xq1b","kind":"mindmap","title":"The cell at a glance","version":1,"deck":"Cell Biology","changed_by":"Claude","changed":"2026-10-11T09:12:00.000Z"},
  "text": "The cell {#cell}\n- Nucleus {#nucleus}\n  - Holds the DNA {#holds-the-dna}\n…",
  "warnings": ["Matched 4 ideas without ids to the old ones by their words."],
  "link": "https://lucida.cards/page/p8k2a9xq1b",
  "note": "The learner sees it in Cell Biology › Pages now. Change it with update_page and baseVersion 1." }
```

`update_page` returns `{saved, text, warnings?, link, note: 'Saved as version 4.'}`. Warnings are not stored. `cleanData` returns them, and `pages.create`/`pages.update` attach them to the page object they return. Warnings from Note normalizing (which are thrown away today) come back too.

### 3.6 What `get_page` returns (`pageOut` per kind, through shared helpers `cardsFor(ids)` and `studyOf(page)`)

**Mind map:**
```json
{ "id":"p8k2a9xq1b","kind":"mindmap","title":"The cell at a glance","version":3,"deck":"Cell Biology",
  "changed_by":"Claude","changed":"2026-10-10T18:02:00.000Z","tested":"2026-10-10",
  "link":"https://lucida.cards/page/p8k2a9xq1b",
  "text":"The cell {#cell}\n- Nucleus {#nucleus}\n  - Holds the DNA {#dna}\n  - Nucleolus makes ribosomes {#nucleolus cards:cm3}\n- Mitochondria {#mito cards:cm1}\n  > Most ATP is made on the inner membrane, by ATP synthase.\n  - Krebs cycle in the matrix {#krebs cards:c1}\n  - Electron transport on the inner membrane {#etc cards:cm2}\n…",
  "ideas":23,
  "study":{ "last_tested":"2026-10-10","tests":2,
    "weak":[{"id":"etc","label":"Electron transport on the inner membrane","path":"The cell › Mitochondria › Electron transport on the inner membrane","missed":2,"knew":0,"cards":["cm2"]},
            {"id":"krebs","label":"Krebs cycle in the matrix","path":"The cell › Mitochondria › Krebs cycle in the matrix","missed":0,"knew":1,"cards":["c1"]}],
    "weak_branches":[{"id":"mito","label":"Mitochondria","weak":2},{"id":"er","label":"ER and Golgi","weak":1}],
    "not_tested":5,"no_cards":14 },
  "cards":{ "cm2":{"on":["etc"],"front":"Where does electron transport happen?","back":"The inner mitochondrial membrane","reviews":9,"lapses":3,"weak":true},
            "c1":{"on":["krebs"],"front":"Where does the Krebs cycle happen?","back":"The mitochondrial matrix","reviews":6,"lapses":2,"weak":true} },
  "to_change":"update_page with baseVersion 3 and the whole map as text or data." }
```

- `study.weak` holds at most 30 entries, worst first: missed last time first, then ideas with weak linked cards, then the most misses. `weak_branches` holds at most 5 main ideas.
- `cards` holds at most 100 entries. A card id that isn't found comes back as `{missing:true}`.
- The `weak` flag follows the shared rule (Q2).

**Diagram:** the same fields, plus:
- `statements: ["NADH —gives electrons to→ Complex I", …, "Cyanide —blocks (dashed)→ Complex IV"]`
- `boxes`, `arrows`, `starts: ["NADH","FADH₂","Cyanide"]`, `ends: ["O₂ becomes H₂O","ATP"]`
- `study.weak` entries can be a box `{id,label,…}` or an arrow `{arrow:"cn>c4", statement:"Cyanide —?→ Complex IV", missed:1, knew:0}`.

**Note:** as today, plus `embeds: {"p8k2a9xq1b":{"title":"The cell at a glance","kind":"mindmap"}}`.

`format: "json"` adds `data`. On a 409 the reply is the conflict message plus `pageOut(e.current)`, so it is right for every kind.

### 3.7 Errors and warnings (exact text)

**Errors (nothing saved):**

| When | Message |
|---|---|
| Shape, over MCP | 'This page is a Mind map: send its content as text or data (create_page shows both); blocks are a Note’s. Nothing was saved.' (or "a Diagram") |
| Shape, from the app (old apps see this in the "Not saved:" line) | 'This page is a Mind map. Update Lucida to change it here.' (code `'shape'`) |
| Unreadable mind map | 'That isn’t a mind map: send text (an indented list, the topic first) or data ({"root": …}). Nothing was saved.' |
| Unreadable diagram | 'That isn’t a diagram: send text (one arrow a line, "A -> B : words") or data ({"nodes": […], "edges": […]}). Nothing was saved.' |
| Two contents | 'Send the content one way: text or data (a Note: blocks or markdown), not both. Nothing was saved.' |
| Not ready | `notReady` above |
| Too big, conflict, "check AI changes first" | Unchanged |

**Warnings** (one per kind of repair, naming the first three items):
- 'Two ideas had the id “atp”: the second is now “atp-2”.'
- 'Matched 4 ideas without ids to the old ones by their words.'
- 'Cut 14 ideas past 200 (the deepest ones under “Organelles” first).'
- 'Cut 3 ideas deeper than 6 levels under “Mitochondria”.'
- 'Kept 20 of the 23 ideas under “Organelles”.'
- 'Shortened 2 labels to 80 characters; put longer text in the note.'
- 'Left out 2 card ids that aren’t this deck’s cards: c99, c100.'
- 'Left out an arrow to “pyruvat”: no box has that id or those words.'
- 'Made a box “Pyruvat” for an arrow: no box had those words.'
- 'Kept one arrow from “Complex I” to “Coenzyme Q” (one arrow per pair and direction).'
- 'Skipped 3 lines Lucida doesn’t read (subgraph, style).'
- 'Ignored row and order on 2 boxes: where boxes sit is the learner’s.'
- 'Read “TB” as direction down.'

---

## 4. Layout

### 4.1 Modules and packaging

**`web/maps.js`** is one function, `makeMaps()`, with no imports and no DOM, followed by `export default makeMaps();`. It uses the guide.js and pageblocks.js pattern, and the same file runs in four places:
- node: `pages.mjs`, `mcp.mjs`, `social.mjs`, `diagrams.mjs`, `mapmove.mjs` and the tests;
- the browser;
- the boards, where `design/build.mjs` injects `MAPS_METHOD` as `this.maps()` when a board's logic calls `this.maps(` (sliced from `function makeMaps` to `export default`, like `DIAGRAM_METHOD`);
- iOS JavaScriptCore.

Exports:
- `LIMITS`, `units`, `wrap`, `plain`
- `normalize(kind,…)`, `normalizeMindmap`, `normalizeDiagram`, `emptyOf(kind)`, `fromLegacy(tree)`
- `mindmapFromText`, `diagramFromText`, `textOf(kind,data)`, `statementsOf`, `pathsOf`
- `edit(kind, data, op)` returns `{data, summary}`. Operations: add, set, remove, move, indent, outdent, link, unlink, place, tidy, reverse. The web and iPhone editors both edit through these, so they behave the same. They are not exposed over MCP in step 4.
- `merge(kind, base, mine, theirs, {prefer})` returns `{data, clashes}`
- `diff(kind, a, b)`, `summaryOf(diff)`
- `layoutMind`, `layoutGraph`, `layout(kind, …)`, `previewOf(kind, data, {w,h,side})`, `svgOf(kind, layout, colors, {title})` (an escaped string with a `.dg-sr` screen-reader list, used by the public deck and static boards)
- `ideaTone(cardTones, mark)`, `matchCards(label, cards)`, `reviewIds(data, ids)`, `testOrder(data, layout, hidden)`, `countOf`

**`web/mapview.js`** holds `makeMapView(maps)`, the DOM side: drawing, pan and zoom, selection, the idea bar, the outline and statements views, Test me, its own popovers and the keyboard. It is web only and injected as `this.mapview()`, like `NOTES_METHOD`. Its `mount(el, opts)` is idempotent and keeps its state on `host.__mv`; `update(opts)` compares the new options with the old ones (the notes.js pattern).

### 4.2 Text measuring (no font is ever measured)

`units(s)` counts per code point:

| Characters | Units |
|---|---|
| Combining marks | 0 |
| Latin lower case, digits, punctuation, Greek, Cyrillic | 1 |
| A-Z | 1.15 |
| East Asian wide/fullwidth, Hangul, kana | 1.8 |
| Emoji and pictographs (surrogate pairs, U+2600-27BF) | 2 |

- `wrap(s, maxUnits)` breaks at spaces. Text in a script without spaces may break between any two characters, and a word that is too long is cut.
- Width = `ceil(maxLineUnits × char[level] × scale) + 2·padX`, clamped between minW and maxW.
- `scale` is the text scale: 1 on the web, `min(1.3, Dynamic Type ratio)` on iOS. Layout runs again when it changes.
- Line breaks are computed in JS, so they never differ between platforms. The renderer may squeeze a line horizontally by up to 8% (SVG `textLength` / a Canvas scale) when it measures wider than its box.

### 4.3 Mind map: `layoutMind(data, {side, folds, scale})`

This is today's `layoutTree`, generalized. It runs in O(n).

1. **Visible tree.** An idea is folded when `folds[id] ?? idea.folded ?? false`. A folded idea's children are skipped, and it records `hidden`, the number of descendants folded away. There is no limit beyond the data caps (the `slice(0,12)` goes).
2. **Sizes.** The constants are `M = {lineH:17, padX:14, padY:9, rootPad:6, gapX:48, gapY:10, char:[8.6,7.4,6.9], wrap:[18,22,24], minW:64, rootMinW:96, maxW:220, chip:26, margin:24}`. `char` and `wrap` are indexed by `min(level,2)`.
   - h = lines·17 + 18, plus 6 on the root.
   - A folded idea gets `chip` (26) more width for its "+N".
   - A hidden idea during a test keeps its real size, so revealing it never re-lays the map.
   - Fonts (Geist): 15/600, 13.5/600, 12.5/500.
3. **Sides.**
   - `side:'right'` puts the root at the left, with columns per level.
   - `side:'both'` needs at least 3 main ideas; with fewer it acts as `'right'`. The main ideas split in order: the first k go on the right, the rest on the left. k minimizes |spanRight − spanLeft|, with **spans computed as if every branch were open**, so folding never moves a branch to the other side. Ties put more on the right.
   - Both sides read top to bottom, so the map, the outline and Test me's "one at a time" share one order.
4. **Each side.**
   - `span(n) = max(h, Σ child spans + gapY·(k−1))`.
   - A leaf is centered in its span; a parent sits at the midpoint between its first and last child.
   - Each depth is one column: x = previous column's x + its widest box + gapX.
   - The left side mirrors around the root, and its boxes are right-aligned in their column so links meet the near edge.
5. The root is centered vertically on the taller side. Everything then shifts so the smallest x and y equal the margin.
6. **Links.** A cubic S runs from the middle of the parent's outer edge to the middle of the child's inner edge, both control points at the horizontal midpoint. Each link is returned as `c:[x1,y1,cx1,cy1,cx2,cy2,x2,y2]` and as `d`.
7. **Output:** `{nodes:[{id,level,side:-1|0|1,parent,x,y,w,h,lines,folded,hidden,kids}], links:[{from,to,c,d}], width, height}`, rounded to 0.1.

**Which side, by stage width (the same rule on both platforms):**
- A stage at least **700 pt** wide uses `'both'`, so PAGE_KINDS' "One idea in the middle" holds on a computer, an iPad and iPhone landscape.
- A narrower stage uses `'right'` (iPhone portrait).
- Embed previews use `'both'` at 480 pt or wider.
- There is no circular radial layout (see Q4 for the phone).

### 4.4 Diagram: `layoutGraph(data, {scale})`

**Constants.** `G = {wrap:22, char:7.3, padX:14, padY:10, minW:88, maxW:200, lineH:17, labelWrap:18, labelChar:6.6, chipPad:6, nodeSep:28, dummySep:12, rankSep:56, margin:24}`.
- A round box's rx is h/2.
- A diamond is the box plus 28 wide and 20 tall, drawn as a rhombus.

**0. Ring check.** When there are **no slots** set and the graph is one directed cycle of 3-12 boxes, the ring layout is used. In such a cycle, every ring box has exactly one ring arrow in and one out. Up to 6 **tail** boxes may hang off it, each joined by exactly one arrow to exactly one ring box and to nothing else (for example, Acetyl-CoA into Citrate, or Malate → NADH).
- Ring boxes go clockwise from 12 o'clock in cycle order, starting from the ring box that comes first in the data.
- Their positions come from **constant tables in `maps.js`**: `RING[N][k]` unit vectors to 4 decimals and `ARC[N]` Bézier factors, for N = 3 to 12. There is **no trig at runtime**.
- Radius: R = max(90, (Σ ring box widths + N·28) / 6.2832).
- A tail sits outward along its ring box's unit vector at R + 70 + w/2. A second tail on the same ring box is offset by ±(h+12) along the perpendicular (−y, x).
- Each ring arrow is a cubic between where the chord leaves one box and enters the next, bowed outward along the chord midpoint's radial direction (only arithmetic and `Math.sqrt`).

**Otherwise, the layered layout** (Sugiyama style):
1. **Index.** Boxes and arrows are kept in data order. Self-loops are set aside.
2. **Break cycles.** A depth-first search starts from the sources (boxes with nothing coming in) in data order, then from the remaining boxes in data order, following arrows in data order. Back arrows are reversed for layout only (`rev:true`) and are drawn pointing the original way.
3. **Ranks.**
   - A box with a slot takes `rank = row` exactly.
   - A free box takes rank = max over its predecessors of (rank + 1); a source takes 0.
   - Each free source is then pulled down to (its nearest successor's rank − 1), so Cyanide sits beside Complex IV rather than at the top.
   - An arrow whose source ends up on or below its target's rank is drawn as a back arrow.
   - Empty ranks are removed, except that ranks up to the largest set `row` are kept, so a box with a slot lands exactly in the row it was dropped on.
4. **Dummy points.** An arrow spanning more than one rank gets one dummy point per rank it crosses. A labelled arrow's label sits on its middle dummy, which takes the label's size. When an arrow spans one rank, its label chip sits at the curve's midpoint, and the gap between the ranks grows to fit the tallest label in it (down) or the widest label plus 24 (right). Chips in the same gap that overlap are pushed apart along the rank.
5. **Order within a rank.**
   - Start from depth-first discovery order.
   - Run 12 sweeps, alternating down and up. Each sorts by the barycenter of its neighbors in the fixed rank, with ties broken by previous index, then data index. A box with no neighbors there keeps its place.
   - After each sweep, boxes with a slot move to index `min(order, len−1)`.
   - Crossings are counted pairwise for each pair of adjacent ranks, and the order with the fewest is kept (ties keep the earliest).
   - Finally, one transpose pass makes adjacent swaps that reduce crossings, never moving a box with a slot.
6. **Coordinates.**
   - Across a rank: pack left to right (28 between boxes, 12 involving a dummy).
   - Then 4 passes, alternating down and up, move each node toward the median of its neighbors' centers. Dummies go first, then nodes by degree.
   - Overlaps are fixed left to right and right to left, and the two results are averaged.
   - Each rank is centered on the widest rank.
   - Along the flow: the cumulative rank thickness plus each gap.
7. **Arrows.**
   - Ports are at the bottom and top middle (down) or right and left middle (right). Several arrows leaving the same side spread across its middle half, ordered by where their target sits.
   - Each segment is a cubic with tangents along the flow.
   - The arrowhead is returned as three points (8×6), from the last segment's direction normalized with `sqrt`.
   - A self-loop is a fixed arc of 24 on the outer side.
   - Two opposite arrows between the same boxes are offset ±6.
   - A dashed arrow is drawn `5 4`.
8. **Right** is computed as down with w and h swapped, then transposed.
9. **Output:** `{nodes:[{id,x,y,w,h,lines,shape,rank,order,slot}], edges:[{key,from,to,c:[…],d,head:[6 numbers],rev,dashed,label:{x,y,w,h,lines}|null}], width, height, ring}`.

### 4.5 Manual positions

- **A mind map has none.** Structure (parent and order) is the data.
- **A diagram stores slots only** (`row`, `order`).
  - **During a drag**, the box and the arrows touching it follow the pointer. The editor redraws them as direct S curves between ports, without running layout. A ghost shows the target slot: a row band plus an insertion bar.
  - **The slot under the pointer:** the row is the nearest rank band along the flow axis. The order is the number of boxes in that rank whose center lies before the pointer on the cross axis.
  - **On drop:** `edit('place', {id,row,order})` makes one save. Layout runs once, and boxes glide to their new places.
  - **Tidy up** (page ⋯, shown when any box has a slot) clears every slot in one version.
  - **Overlaps:** because slots aren't coordinates, a box an agent adds later can never overlap a placed box.

### 4.6 Determinism and performance

- **Determinism.**
  - Layout uses only `+ − × ÷`, `Math.min/max/abs/floor/ceil/round` and `Math.sqrt` (correctly rounded under IEEE 754). There is no trig, `pow`, `random` or `Date`; ring angles come from tables.
  - Every sort has a complete tie-break on data index.
  - Ids are kept in `Map` objects, never as object keys.
  - Results are rounded to 0.1 at the end.
  - `normalize`, `merge`, `textOf` and `diff` are deterministic too.
  - **The parity test** (§11) requires byte-identical JSON from V8 and JavaScriptCore.
- **Budgets at the caps** (200 ideas; 80 boxes and 160 arrows):

  | Engine | Mind map | Diagram |
  |---|---|---|
  | V8 (web, node) | ≤ 3 ms | ≤ 10 ms |
  | JavaScriptCore without the JIT, iPhone 12 class | ≤ 25 ms | ≤ 60 ms |

  `App/DebugChecks.swift` enforces the JavaScriptCore budgets. **If the diagram budget fails, the cap drops to 60 boxes and 120 arrows for everyone.** The algorithm never forks per platform.
- **Caching.**
  - Layout runs only when the data version, the folds, the side or the scale changes. It is cached by `(pageId, version, foldKey, side, scale)`.
  - Pan, zoom and glides only change a transform: one `<g>` on the web, a `CGAffineTransform` on iOS.
  - On iOS, layout runs on MapEngine's serial queue, and the previous layout stays on screen until the new one arrives.

### 4.7 iOS: no port

- `Data/MapEngine.swift` runs `Resources/maps.js` in **its own** `JSContext`, separate from GuideEngine's, so map layouts and guide parsing don't wait on one lock.
  - It slices from `function makeMaps` to `export default` and has one entry point, `__mcall(fn, argsJSON)`.
  - It uses a serial `DispatchQueue`, an `NSCache` of layouts, and a `failure` string.
  - Typed wrappers: `normalize`, `layout` (returns a Decodable `MapLayout`), `previewOf`, `merge`, `edit`, `textOf`, `fromText`, `statementsOf`, `diff`, `ideaTone`, `matchCards`, `reviewIds`, `testOrder`, `emptyOf`.
- **If the engine fails,** the page shows a plain Swift outline built from the JSON and the line 'Can’t draw this page right now'. Editing is off in that state; nothing is lost.
- Swift only draws the numbers and pre-wrapped lines, and handles gestures. `DiagramLayout.swift` and `diagram-check.sh` stay as they are for the old viewer until it retires (§7).

### 4.8 Drawing and color (theme tokens only; light, dark, gray)

| Element | Fill | Stroke / text |
|---|---|---|
| Topic (root) | `inv` | `invText` |
| Main idea (level 1) | `surf2` | `text` |
| Deeper idea, diagram box | `bg` | `line` 1.5; `text` |
| Round box | `surf2` | `text` |
| Diamond | `surf` | `line` 1.5 |
| Links and arrows | — | `line` 1.5 (dashed `5 4`) |
| Arrow label chip | `bg` | `line` 1; `muted` text |
| Fold chip "+N" | `surf` | `muted` |
| Selection ring | — | `text`, 2 |
| Weak spots: weak / getting there / solid / not studied | `againTint` plus a 7 pt `again` dot / `hardTint` / `goodTint` / unchanged | — |
| Test: hidden idea | `surf` | dashed `line` border; a `muted` "?" |
| Test: missed / knew | — | `again` / `good` 2 pt ring |
| Changed by the other writer | — | `text` ring at 35% opacity, fading over 4 s |
| Linked cards | — | small count badge in `muted` at the bottom right |

The hand-drawn hex thumbnails are not used by any new screen.

---

## 5. Interactions

### 5.1 The page (WebPage / PhonePage, one board each, switching on `pg.kind`)

- **By kind:**
  - `note`: Notes, unchanged.
  - `mindmap` / `diagram`: the map body.
  - **any kind not in `PAGE_READY`**: the **"Needs an update"** state, with the copy 'This Mind map needs a newer Lucida. Update to open it.' and Back. Notes is never mounted for a page that isn't a Note.
- **Kept from today:** the back pill, the saving line, the version pill and the Versions aside, ⋯, the title field, the conflict banner and Delete.
- **New:** an inverted **Test me** pill, in the web header (on iPhone it is in the bottom bar).
- **The stage** is `<div ref="{{mapRef}}" data-sc-own>` and fills the space under the title. The page itself doesn't scroll.
- **Mount options:** `this.mapview().mount(el, {kind, data, version, editable, phone, key, colors, card(id), tones, marks, demo, onEdit(data, summary), onOpenCard, onStudy(set), onMakeCard({front, back, nodeId}), onTest(results), onToast})`.
- **Page ⋯ adds:**
  - Fold to main ideas / Unfold all (mind map);
  - Tidy up (diagram, when any box has a slot);
  - Make again from the cards (mind map; Lucida AI);
  - then Versions and Delete page, as today.
- **Opening a page:**
  - It opens fitted to the stage, but **never below 80%**. If the map doesn't fit at 80%, it opens at 100%, centered on the topic or the top rank.
  - A map with more than 40 ideas opens folded to level 2 the first time on a device.
  - `?test=weak` opens the Test me sheet with "Weak ones" chosen. `#<ideaId>` opens centered on that idea, selected.
- **What each device remembers:** fold overrides, Map or Outline, the overlay on or off, and the camera.
  - Web: localStorage `lucida.maps.view`, keyed by page id. Every access is in try/catch.
  - iOS: UserDefaults `lucida.maps.view.<pageId>`.
  - Folding never saves.

### 5.2 Web

**Chrome:**
- Top right of the stage: `[Map | Outline]` (`[Map | Statements]` on a diagram) and `[Weak spots · 5]`. The count shows even when the overlay is off.
- Bottom right: `[− | Fit | +]`.
- Bottom center: the **idea bar**, only while something is selected.
- Tooltips use `data-tip`.

**Pan and zoom:**
- Dragging empty space pans (grab cursor); the wheel or trackpad pans.
- ⌘/Ctrl + wheel, a trackpad pinch, or Safari gesture events zoom around the pointer, from 40% to 200%.
- Double-clicking empty space fits.
- `touch-action:none` is set on the stage only.

**Select:**
- A click selects: a ring appears at once and the idea bar pops in (`[data-sc-pop]`). Clicking empty space deselects.
- **Double-clicking an idea zooms to its branch** (the camera moves over 0.25 s). This replaces a separate Focus mode.

**Fold (mind map):**
- A folded idea shows a "+N" chip on its outer edge; clicking it unfolds.
- A selected or hovered idea with children shows a "−" knob that folds it.
- Space folds or unfolds; Alt-click folds or unfolds everything below.

**The idea bar** (up to 560 px wide, the only editing surface):
- **Mind map:**
  - The label field.
  - Two muted lines of note ('Add a note' for the owner); clicking grows the bar into a note textarea.
  - '2 cards · 1 weak'.
  - Actions: **+ Idea** (a child), **Cards**, **+ Card**, **Fold**, **⋯** (Start folded, Test this branch, Delete).
- **Diagram box:** the same fields. Actions: **+ Box** (the next box, joined by an arrow), **Connect**, **Cards**, **+ Card**, **⋯** (Shape: Box/Round/Diamond pills, Delete).
- **Diagram arrow** (click its line or label): the label field (placeholder 'What does it do? e.g. produces'), **Dashed** (an on/off pill), **Turn around**, **Delete**.

**Typing a label:**
- Typing a letter, F2, Enter or a double-click on the label puts an input over the box. Enter commits; Esc cancels.
- The map lays out again live, with a glide.
- On a mind map, Enter commits and adds a sibling, and Tab adds a child; either way you are typing the new label at once.
- On a diagram, Enter adds the next box joined by an arrow, so "Glycolysis ⏎ Pyruvate ⏎ Acetyl-CoA" builds a chain. Tab adds a loose box beside the selected one.
- A new idea left empty is removed on blur.

**Remove:** Delete removes the idea and its branch, or the box and its arrows. A toast says 'Deleted “Mitochondria” and 4 ideas under it · Undo'.

**Move (mind map):** Alt+↑/↓ moves an idea among its siblings, Tab indents and Shift+Tab outdents, both on the map and in the Outline. There is no drag-to-reparent in step 4.

**Move (diagram):** press and drag any box; the drag starts after 6 px (the `drag.mjs` thresholds). Positions are divided by the canvas zoom factor `k`, pointer capture is on `documentElement`, and the click after a drag is blocked. The box snaps to a slot on drop (§4.5). Alt+arrow keys move a box one slot.

**Connect:** Connect shows 'Click the box it points to · Cancel'. Clicking a box makes the arrow, selects it and focuses its label.

**Cards** (Lucida's own popover):
- The linked cards (front, back, and a "Weak spot" mark), each with × to unlink.
- A **Link a card** search field over the deck's cards, best `maps.matchCards` matches first.
- **Study these 3 cards** (primary) opens `/review?set=page:<pid>:<ideaId>`.

**+ Card** opens the page's existing Make-a-card sheet, prefilled:
- Mind map idea with children: the label on the front, the children as a list on the back.
- Leaf with a note: the label on the front, the note on the back.
- Leaf without a note: the label on the front, an empty focused back.
- Diagram box: the label on the front, its arrows as sentences on the back.
- Diagram arrow: 'Glucose —?→ Pyruvate' on the front and 'is split into' on the back.

On Add, the new card's id (`card.add` returns `{ids}`) is added to that node's `cardIds` in one version: 'Made a card from “Krebs cycle in the matrix” and linked it'.

**Outline view (mind map).** An editable list, `role=tree`, where each row is bound to an idea id.
- Enter adds a sibling; Tab and Shift+Tab indent and outdent; Alt+↑/↓ move; ↑/↓ move between rows.
- Backspace on an empty row deletes it and goes to the previous row.
- ▸ folds.
- Pasting an indented list adds those ideas under the current row.
- This is the editor for long maps and the screen-reader surface.

**Statements view (diagram).** One row per arrow: `[from box] —[words]→ [to box]`, editable in place. Renaming a box from a row renames it by id. Then come the boxes with no arrows, then an add row that reads `A -> B : words` and makes any boxes it needs.

**Undo:** ⌘Z and ⇧⌘Z use 50 in-memory snapshots on this screen; each undo is an ordinary edit.

**When an AI changes the page (live):** see §8.

### 5.3 iPhone (both kinds; mirrors PhonePage one for one)

- **Layout:**
  - The header: back pill, version and ⋯, with the title on one line under it.
  - The stage is edge to edge, outside any ScrollView, and uses one SwiftUI `Canvas` (§4.7).
  - The bottom bar has `[Test me]` (inverted), `[Weak spots]`, `[Outline]` and `[+]`.
- **Gestures:**
  - One finger pans; a pinch zooms from 50% to 250%, anchored between the fingers. `MagnifyGesture` runs together with a `DragGesture`.
  - A double tap on empty space fits; a double tap on an idea zooms to its branch.
  - A tap selects, and hit-testing goes through the inverse transform.
- **Back swipe:** `BackSwipe.canPop` refuses touches that start inside the stage more than 24 pt from the left edge. iOS 26's full-width content back swipe is off on this screen, and the Back pill stays.
- **The idea bar** replaces the bottom bar while something is selected. It is full width, rides on the keyboard, and has the same fields and actions as the web.
  - Editing a label happens in the bar's field, not on the canvas. Return adds a sibling and keeps the keyboard up, so a list can be typed in one go.
  - Above the keyboard there is a Lucida key row (a view, like `NotesKeys`, not `inputAccessoryView`): ⇤ outdent · ⇥ indent · ↑ move up · ↓ move down · Done.
- **Diagram moving:** drag a box that is already selected, or long-press any box for 0.35 s (light haptic), then drag. Dragging an unselected box pans the stage, so panning never grabs a box by accident. The box snaps to a slot on release.
- **Connect:** 'Tap the box it points to'.
- **Cards, Test me, Test done and Make a card** are Lucida's own bottom sheets (Components, PickSheet), never `Menu`, `.contextMenu`, `.popover` or `Toggle`.
- **Outline and Statements** are full screen, built from rows in a ScrollView with LazyVStack (no List), with disclosure triangles and the same key row. They are the main editors on a phone.
- **Targets:** at least 44 pt. The whole box is tappable, and fold chips and arrow labels have 44 pt hit areas.
- **Text size:** never below 13 pt at the opening zoom.
- **Haptics:** a selection tick on select, light on fold and on drop, soft on reveal, success when a test is done.

### 5.4 Keyboard (web, map focused; the Outline has the same editing keys)

| Key | Mind map | Diagram |
|---|---|---|
| ← / → | Parent / first child (mirrored on the left side) | Nearest box in that direction |
| ↑ / ↓ | Previous / next sibling | Nearest box in that direction |
| Enter | Add a sibling and type | Add the next box with an arrow and type |
| Tab / Shift+Tab | Add a child / outdent | Add a box beside |
| Alt+↑ / Alt+↓ | Move among siblings | Move one slot |
| Space | Fold / unfold | — |
| F2, a letter, double-click | Edit the label | Edit the label |
| Delete / Backspace | Delete, with an Undo toast | Delete, with an Undo toast |
| ⌘Z / ⇧⌘Z | Undo / redo | Undo / redo |
| F · T · W · O | Fit · Test me · Weak spots · Outline | Fit · Test me · Weak spots · Statements |
| Esc | Deselect, leave a mode, or end a test (marks so far are kept) | same |

### 5.5 Accessibility

- **Web:** the SVG and the canvas are hidden from assistive tech (`aria-hidden`).
  - Focus lives in the Outline or Statements: a `role=tree` with `aria-level`, `aria-expanded`, `aria-selected`, `aria-setsize` and `aria-posinset`. It is visually hidden when Map is showing, and the picture follows its selection.
  - A polite live region announces the selection, for example 'Electron transport on the inner membrane, level 3, 2 of 2, 1 card, weak'.
- **iOS:** `.accessibilityRepresentation` gives the outline (or statements) as Lucida buttons, with the custom actions Fold/Unfold, Rename, Reveal, Knew it and Missed.
- **Testing** works entirely from the outline. A hidden idea reads 'Hidden idea, level 3. Double tap to show.'
- **Color is never the only signal:** weak ideas also carry a dot, and the legend names each color with its count.
- **Dynamic Type:** labels scale up to 1.3× and layout runs again; Outline and Statements follow Dynamic Type fully.

### 5.6 Motion (design/motion.mjs only)

| Change | Timing |
|---|---|
| Fold, unfold, re-layout, a box dropping into a slot | Boxes glide from old to new place over `MOTION.reveal` (0.16 s) with ease `.2,.8,.2,1`. New ideas fade in out of their parent; folded ones slide into it. The tapped idea stays still, and the camera compensates. |
| Camera: fit, zoom to a branch, the next idea in "one at a time" | `MOTION.sheet` (0.25 s) |
| Idea bar, popovers, toasts | `pop` (0.22 s) with the 10 pt slide |
| A label revealed in a test | Cross-fades in over 0.16 s |
| A new arrow | Draws in with `.sc-draw` |
| Selection ring | Instant |

Never `.sc-knob` (it overshoots); nothing bounces. **Reduce Motion** (`prefers-reduced-motion` on the web, `Motion.*` returning nil on iOS) makes everything instant, rings included. iOS glides use `TimelineView(.animation)` with `UnitCurve.bezier(0.2,0.8,0.2,1)`.

---

## 6. Study features

### 6.1 In step 4

| # | Feature | Details |
|---|---|---|
| 1 | **Test me** | Hiding words and recalling them is the research-backed mode. It opens a small sheet. **Hide:** Everything (the default), Weak ones (n), or This branch (when an idea is selected); on a diagram, Boxes (the default), Arrow words, or Both. **Show:** On the map (the web default) or One at a time (the iPhone default). The root always shows. A hidden idea keeps its real size, with a dashed border and a "?". A hidden idea's children stay hidden until it is revealed, so recall goes top-down. A tap or Space reveals; then the learner presses 1 or taps Missed (again), or 2 or Knew it (good), and red or green rings show the marks. "One at a time" goes through ideas in outline order, with the camera moving and a breadcrumb such as 'The cell › Mitochondria › ?', and big Show, then Missed / Knew it, buttons. Progress reads '6 of 18 · 1 missed'. The **Done sheet** shows 'You knew 14 of 18', the missed ideas with their paths, **Test the 4 again** (primary), **Study their 5 cards** (when there are any), and **+ Card** on each missed idea that has none. |
| 2 | **Recall marks** | `S.mapMarks[pageId] = {deck, at, n: Map-like {key: [knew, missed, last(1/0), at]}}`, where the key is an idea id or `e:from>to`. Actions: `mapmarks.save {pageId, deckId, results:[{id, ok}], ids}` (it prunes keys not in `ids`) and `mapmarks.drop {pageId}`, sent on page delete from the app or MCP. Caps: 100 pages and 300 entries per page. `deck.delete` drops them. They sync like reviews and never make a version. |
| 3 | **Weak spots overlay** | The tints and dot from §4.8, a legend with counts, a '3 weak' chip on a folded branch, and the legend's **Test the weak ones**. `maps.ideaTone(cardTones, mark)`: missed last time → weak; otherwise the worst tone of the linked cards; no cards and knew it last time → solid; otherwise not studied. Card tone comes from `sched.toneOf(card)`; its meaning is Q2. |
| 4 | **Link ideas to cards** | `cardIds`, the Cards popover/sheet, Link a card (`matchCards` ranking, no AI), and the MCP check. |
| 5 | **Study this branch** | A review set `page:<pageId>:<ideaId>[,<ideaId>…]` in `db.js` `setCards`, beside `hard`, `leech` and `tag:`. It holds every `cardId` in those subtrees (`maps.reviewIds`), weakest recall first, new cards included. It reads `db.pages.page(pid)`; while that is still loading, the review screen shows 'One moment…' and redraws when it arrives. It is mirrored in iOS `Engine.swift`. |
| 6 | **+ Card from an idea, box or arrow** | Prefilled and auto-linked (§5.2). |
| 7 | **Fold as a study tool** | `folded` "starts folded" set by an agent or the owner; Fold to main ideas; zooming to a branch. |
| 8 | **Outline and Statements** | Reading and typing on a phone, and VoiceOver. |
| 9 | **Lucida AI: a mind map from the deck's cards** | §7.3. The map arrives already linked to cards, so Weak spots works the first time it is opened. |
| 10 | **Tutoring over MCP** | The study block in `get_page`, and add_cards returning ids. |
| 11 | **Pages tab rows** | 'Mind map · tested Tue' or 'Diagram · not tested yet', from `S.mapMarks` (no page fetch). |
| 12 | **Seeing AI changes** | Rings plus a line such as 'Claude added 4 ideas · v9 · Versions' (§8). |

### 6.2 Later (in value order)

1. Rebuild from memory: only the root shows, with hints like '4 main ideas'. The learner types them, a local fuzzy match marks what matches, and Lucida AI can grade the rest from the allowance.
2. Make cards from a whole branch (template drafts sheet).
3. A bulk Suggest links sheet.
4. A `mark_ideas` MCP tool, so a quiz run in chat feeds the marks.
5. An `ops` argument on update_page.
6. The server merging stale agent writes itself.
7. Spaced map tests ("Test due"), "New since your last test", and a "A few at random" test choice.
8. Lucida AI on one idea: Explain, Quiz me, Expand this branch.
9. A diagram made from cards by Lucida AI.
10. Learn mode for the `page:` set.
11. Test me for visitors on the public deck page.
12. Dragging an idea onto another on the map to re-parent it.
13. Groups (containers) in diagrams, a radial overview, thumbnails on Pages rows, and PNG/PDF export.
14. Retiring the old renderer.

---

## 7. Existing `deck.diagrams`

**Decision:**
- Everything new draws with `maps.js`.
- **Mind maps made from cards move into Mind map pages, once per deck.**
- **Tables, and lecture and uploaded pictures, stay** in `deck.diagrams` and the Diagrams tab. Pictures are private, backed by files, and feed image-occlusion cards.
- The old records stay where they are, so older iPhone builds and old shared records keep working.

### 7.1 Migration (`web/mapmove.mjs`, the guidemove.mjs pattern)

- **What it is:** `moveMaps(d, once)`.
- **When it runs:** beside `moveGuide` — on the app's `/api/pages` list, on MCP `list_pages` and `get_page` for a deck, and in the Diagrams routes.
- **When it is skipped:** if there is no deck, if `d.diagramsMoved` is set, if the deck is studied from someone, or if the deck has no made mind maps.
- **Guards:** `once('map-move:' + d.id)`, with `MOVER = 'Lucida'`.
- **For each made `kind:'mindmap'` entry,** oldest first:
  - It takes up a page that Lucida already made with the same title and kind.
  - Otherwise it calls `pages.create`, with:
    - `kind:'mindmap'` and `title: g.name`;
    - `data: maps.normalizeMindmap({tree: g.tree}).data` (`text` becomes `label`; ids are slugs);
    - `who:'Lucida'`, `ai:true`;
    - `summary:'Moved from Diagrams (made from 42 cards: All cards, Oct 3)'`;
    - `pro:true`, so a move never fails on the Free page limit.
- **Afterwards:** `apply({type:'diagrams.moved', deckId, map:{gId: pageId}})` sets `d.diagramsMoved = {at, map}`.

### 7.2 The Diagrams tab

- Moved maps show as rows reading 'Mind map · in Pages', which open the page. An old `?diagram=<gId>` link redirects to the page.
- `roomFor` stops counting moved entries toward `DIAGRAMS.keep`.
- "A mind map open" is still the viewer for decks studied from someone. It now draws through `maps.fromLegacy` and `maps.svgOf` (`side 'right'`), using theme tokens.

### 7.3 Making with Lucida AI

- **"Make diagram › Mind map"** (`web/diagrams.mjs` `makeReq`):
  - It keeps `useDg`/`refundDg` (`DIAGRAMS.perDay`: 3 on Free, 30 on Pro), the 8-a-minute rate limit, the scope chips and the run token.
  - It then **creates a Mind map page** (`who:'Lucida'`, `ai:true`, `summary:'Made from 42 cards: All cards'`) and returns `{pageId}`; the sheet opens the page.
  - With `page: <id>`, it saves a new version of that page instead ("Make again from the cards"). The new tree is normalized with `prev`, so matched ideas keep their notes and card links.
- **`MAP_SCHEMA`** stays strict and 3 levels deep. Each branch and leaf gains `cards: integer[]`, the material line numbers the idea came from.
  - `material()` keeps the card id beside each line.
  - `tidyTree` turns the indexes into `cardIds` (checked in range, de-duplicated, at most 4 per idea).
- **`material()`** becomes async and **reads the deck's Note pages** once `d.guideMoved` is set (`pages.list` and `get`, then `noteToMarkdown`, then `guideText.plain`, up to `MATERIAL.notes`). It falls back to `d.guide` for decks that haven't moved. This ships before AI-made maps.
- **New page › Mind map** gets a second step: 'Blank map', or 'From this deck’s cards · Lucida AI (2 left today)', which opens the existing Make sheet with Mind map chosen.
- "Make diagram › Table" doesn't change.

### 7.4 Sharing

- `social.mjs` adds `mapPagesOf(uid, d)` beside `notePagesOf`, which stays notes-only. The shared Guide record gains `maps: [{id, kind, title, from?, data}]`:
  - at most 20 pages;
  - `data` normalized again;
  - `cardIds` translated to the shared record's card references (dropped when there is no match);
  - `from` is the legacy `gId` for moved maps.
- The data is normalized again on copy, study sync and the public payload, the way `diagramsCopy` does today.
- **Public deck and studied decks:** they show the map pages read-only (pan, fold) through `svgOf`/MapCanvas. New clients hide legacy diagram entries whose id matches a `maps[].from`, so nothing shows twice. Old clients still get the legacy entries.
- **A copy** turns the shared maps into its own pages (made by Lucida, once, on the first Pages list), remapping `cardIds` through `card.origin`.

### 7.5 Renderers

- `web/diagram.js` (`tableHtml`, `layoutTree`, `mapSvg`), `DIAGRAM_METHOD`, iOS `DiagramLayout.swift`/`DiagramMapView` and `diagram-check.sh` stay unchanged in step 4.
- They retire once no supported app reads unmigrated trees.

---

## 8. Concurrent edits and versions

### 8.1 What lives where

| State | Where | Versioned | Can it conflict? |
|---|---|---|---|
| Content: structure, labels, notes, `cardIds`, `folded` default, shape, direction, slots | The page row | Yes | Yes (merge below) |
| View: folds, zoom/camera, side, Map or Outline, overlay | Each device (localStorage / UserDefaults) | No | No |
| Study: Test me marks | `S.mapMarks` in the library, through store actions | No | No |

### 8.2 Saving

- Every edit goes through `maps.edit`, then `db.pages.edit(id, {data})` (iOS: `pages.edit(id, data:)`). The screen updates at once, the save goes out 700 ms after the last change, and it carries `baseVersion`.
- A drag commits once, on drop. Folding and testing never save. A burst of typing is one version.
- Summaries: at flush, `pagesclient` writes `maps.summaryOf(maps.diff(baseData, data))`, for example 'Added 3 ideas under Mitochondria', 'Renamed “ETC” to “Electron transport”', 'Moved Cyanide', 'Linked a card to “Krebs cycle in the matrix”', 'Tidied up'. The server writes the same kind of summary for AI writes that leave `summary` out.
- `pages.update` passes `prev = cur.data` for **every** kind, plus `{ai}`.

### 8.3 The app's 409 merge (fixes `pagesclient.js` flush and `Pages.swift:165`)

The merge is chosen by kind: `MERGE = {note: blockMerge, mindmap: maps.merge, diagram: maps.merge}`, with `prefer:'mine'`. iOS calls the same `maps.merge` through MapEngine. **A kind with no merge never overwrites the other writer**: it reloads theirs and says 'Your change wasn’t saved: <who> changed this page (vN).' The fallbacks become `maps.emptyOf(kind)`, never `["blocks": []]`.

**`maps.merge('mindmap', base, mine, theirs)`**:
1. Flatten each version to `id → {label, note, cardIds, folded, parent, after}`, where `after` is the previous sibling. Start from theirs.
2. **For label, note and folded:**
   - if mine equals base, take theirs;
   - if theirs equals base, take mine;
   - if they are equal, take that;
   - otherwise it is a clash, and the preferred side wins.
3. **`cardIds`** merge as sets: theirs, plus what mine added since base, minus what mine removed.
4. **Moves:**
   - Mine moved and theirs didn't: mine's parent and place.
   - Both moved differently: a clash, and the preferred side wins.
   - If two moves make a cycle, the idea whose move closes it keeps theirs (a 'move' clash).
   - An idea is placed after its `after` sibling when that sibling survives, otherwise first.
5. **Added by mine:** placed under mine's parent (or the nearest surviving ancestor, or the root), after its `after` sibling.
6. **Deleted by mine:** removed if theirs left it unchanged. Children theirs added under it move up to its parent. If theirs changed it, it is kept, because an edit beats a delete (a 'deleted' clash).
7. **Deleted by theirs but changed by mine:** it comes back under the nearest surviving ancestor.
8. The result goes through `normalizeMindmap` again. The function returns `{data, clashes:[{id, what, yours, theirs}]}`.

**`maps.merge('diagram', …)`**:
- Boxes merge by id: the same rule for label, note and shape; `row` and `order` as one field (mine wins if mine placed the box); `cardIds` as sets.
- Arrows merge by `from>to`: added, removed, and changed `label`/`dashed`, by the same three-way rule.
- Arrows to a box that is gone are dropped.
- `direction` uses the three-way rule. The result is normalized.

**After a merge:**
- The save is retried once with `cur.version`, and the existing banner reads: '<Who> changed this map while you were editing (v8). Both are kept: what you did is on top of it, in v9.' with Versions and ×.
- Ideas the other side added or changed get the 4 s ring.

### 8.4 Agents

- They are unchanged: a stale `baseVersion` gets a 409 with `pageOut(current)`, the text with ids.
- `normalize` with `prev` and `ai:true` keeps ids the agent left out (matched by words) and the learner's notes, `cardIds` and slots, so a full rewrite of the tree is safe.
- Nothing merges on the server in step 4.

### 8.5 Live viewing

- When `/api/rev` moves and nothing of this page is waiting to save, the page is fetched again.
- The map glides to the new layout: new boxes fade in, new arrows draw in, and ideas that changed are ringed for 4 s.
- A line reads 'Claude added 4 ideas · v9 · Versions', built from `diff`.
- A drag or a field being typed in holds the save queue (the existing rule), and the merge above handles the rest.

### 8.6 Versions

- Every save is a `page_versions` row. Free keeps 25 and Pro 200.
- Restore is exact (`ai:false`), so it really brings back an older version's notes, links and slots.

**Tests** (`tests/maps.mjs`, 2,000 seeded cases):
- `merge(b,b,t)=t` and `merge(b,m,b)=m`.
- The result is always valid: unique ids, no cycles, within the caps.
- Every change made by only one side survives.
- Nothing either side added is lost.
- The output is deterministic.

---

## 9. Embeds and list previews

### 9.1 A map inside a Note (`{type:'embed', pageId}` / `::page <id>`; no change in pageblocks.js)

- **The host's answer.** `page(id)` (design/pages.mjs `pageInfo`) returns `{title, kind, version, preview, study}`:
  - `preview = maps.previewOf(kind, data, {w: 640 (phone 340), h: 150 (phone 120)})`. It is a **layout model, not HTML**: `{w, h, nodes:[{x,y,w,h,lines (at most 2, each at most 40 characters), level, shape, tone}], links:[d]}`.
    - A mind map is folded to level 2, plus whatever `folded` closes, with side `'both'` at 480 pt or wider.
    - A diagram is shown whole.
    - Either is scaled to fit and never above 100%.
  - `study = {ideas: 23, weak: 5}`.
- **`notes.js` `lookup()`** lets `version`, `preview` and `study` through, after checking them: numbers only, string lengths capped, and every `d` must match `/^[MCLZ0-9 .,\-]+$/`. `sigOf` already includes `lookup(b)`, so a new version redraws only that row.
- **`refEl`** draws a 150 px (phone 120) preview area above today's row.
  - It uses `createElementNS` and `textContent` only, so the **SAFE rule holds**: notes.js still inserts only what it builds.
  - The colors come from the notes CSS variables. Add `--gd-inv`, `--gd-inv-text`, `--gd-surf2` and the three tints to `NOTES_VARS` if they are missing.
  - Weak tints show; knobs, rings and test blanks don't. It uses `pointer-events:none`, with no pan, so scrolling the Note is never captured.
- **Footer:** 'Mind map · 23 ideas · 5 weak · Test me'. The weak count is in `again`, and **Test me** is its own button opening `/page/<id>?test=weak`. The rest of the box opens the page (`openRef`).
- **Loading and missing** keep today's 'One moment…' and 'Page not found' rows.
- **Host keys:** `refs` (design/pages.mjs) is keyed on title plus `version`, and `pageInfo` gets the data from `db.pages.page(pid)`.
- **iOS:**
  - `NotePageRef.page(title:kind:preview:study:)`, with the preview decoded from `MapEngine.previewOf` and cached by id, version and width.
  - `NoteRef.box` (NotesViews.swift around lines 877-895) draws `MapCanvas(.preview)` and the footer.
  - `Page.swift` `refs()` is keyed on the version.
- **Agents:** `get_page` on a Note lists its `embeds`.

### 9.2 The deck's Pages list

- Rows stay text, so the list never fetches page data.
- Mind map and Diagram lose "Soon" as each kind ships.
- The second line reads 'Mind map · tested Tue' or 'Diagram · not tested yet'.
- The Diagram kind gets its own **`flow`** icon (two boxes and an arrow) in place of `share`, added to build.mjs `I` and the generated icons. Its path data: `<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M10 7h4a2 2 0 0 1 2 2v5"/><path d="M13.5 11.5 16 14l2.5-2.5"/>`.
- No thumbnails in step 4.

---

## 10. Boards to draw for approval

### 10.1 Sample content (`design/maps.mjs`; to-ios writes the same JSON into Generated)

- **Deck:** Cell Biology (`cell`).
- **Mind map ps2, "The cell at a glance"** (v3, by Claude), 23 ideas, laid out two-sided on the web and one-sided on the phone:
  - The cell:
    - Nucleus: Holds the DNA; Nucleolus makes ribosomes; Nuclear pores let mRNA out.
    - Mitochondria (note: 'Most ATP is made on the inner membrane, by ATP synthase.'): Krebs cycle in the matrix; Electron transport on the inner membrane; Cristae fold the inner membrane; Has its own DNA.
    - ER and Golgi (folded on this device, "+3"): Rough ER makes proteins; Smooth ER makes lipids; Golgi packs and ships.
    - Cell membrane: Phospholipid bilayer; Channels and pumps; Fluid mosaic.
    - Ribosomes: Make proteins; Free or on the rough ER.
    - Lysosomes: Break down waste.
  - Links: mito→cm1, krebs→c1, etc→cm2, nucleolus→cm3, pumps→cm4, rough-er→cm5.
  - Marks from yesterday: etc missed twice, smooth-er missed once, nucleolus missed once; 14 others known.
- **Diagram ps4, "Electron transport chain"** (v5, by Claude): the data in §2.2, direction down.
- **Krebs cycle** (gallery and 'Diagram · a cycle'):
  - The ring: Citrate → Isocitrate → α-Ketoglutarate → Succinyl-CoA → Succinate → Fumarate → Malate → Oxaloacetate → Citrate.
  - Tails: Acetyl-CoA → Citrate ('joins oxaloacetate to make'), Succinyl-CoA → GTP ('makes'), Succinate → FADH₂ ('makes'), Malate → NADH ('makes').
- **Cards:**

  | Id | Front | Back | State |
  |---|---|---|---|
  | c1 | 'Where does the Krebs cycle happen?' | 'The mitochondrial matrix' | Weak, 2 lapses (as the Note sample) |
  | cm1 | 'Which organelle makes most of the ATP?' | 'The mitochondrion' | Solid |
  | cm2 | 'Where does electron transport happen?' | 'The inner mitochondrial membrane' | Weak, relearning |
  | cm3 | 'What does the nucleolus make?' | 'Ribosomes' | Getting there |
  | cm4 | 'What moves ions against their gradient?' | 'Pumps' | Solid |
  | cm5 | 'Which ER makes proteins?' | 'The rough ER' | New |
  | cm6 | 'What does cyanide block?' | 'Complex IV' | Weak |
  | cm7 | 'What is the last electron acceptor?' | 'Oxygen' | Solid |

- **Note ps1, "Cellular respiration":** `NOTE_SAMPLE_MD` gains `## The whole picture\n\n::page ps2\n\n::page ps4\n` before "From your cards". This matches the Note's existing points: oxygen is the last electron acceptor, and cyanide blocks complex IV.

### 10.2 The view lists (`design/maps.mjs`, pushed into `PAGE_VIEWS`, which iOS `PageSampleView.all` reads from Generated)

```
MINDMAP_VIEWS = ['Mind map', 'Mind map · an idea selected', 'Mind map · writing an idea', 'Mind map · cards of an idea',
  'Mind map · make a card', 'Mind map · outline', 'Mind map · weak spots', 'Mind map · test me', 'Mind map · testing',
  'Mind map · one at a time', 'Mind map · test done', 'Mind map · changed by your AI', 'Mind map · new']
DIAGRAM_VIEWS = ['Diagram', 'Diagram · across', 'Diagram · a cycle', 'Diagram · a box selected', 'Diagram · an arrow selected',
  'Diagram · moving a box', 'Diagram · connecting', 'Diagram · statements', 'Diagram · weak spots', 'Diagram · testing',
  'Diagram · test done', 'Diagram · changed by your AI', 'Diagram · new']
PAGE_VIEWS = ['Writing', 'Versions', 'Changed by your AI', 'Make a card', 'Needs an update', ...MINDMAP_VIEWS, ...DIAGRAM_VIEWS]
```

### 10.3 The boards

| Board | Platform | States | What it shows |
|---|---|---|---|
| **WebPageMindmap** and **WebPageMindmapDark** (`attrOf('WebPage', …, 'view="Mind map"')`, `darkOf`) | web 1440×900 | All `MINDMAP_VIEWS` | See "Mind map states" below. |
| **PhonePageMindmap** and **PhonePageMindmapDark** | iPhone 390×844 | All `MINDMAP_VIEWS` | One-sided (topic at the left), folded to level 2, nothing under 13 pt. The bottom bar: Test me (inverted), Weak spots, Outline, +. The idea bar full width on the keyboard with the key row (⇤ ⇥ ↑ ↓ Done). Cards and Test me as bottom sheets. "One at a time" with a centered hidden idea, the breadcrumb and big Show / Missed / Knew it buttons. A full-screen Outline. The Back pill visible. 44 pt targets. |
| **WebPageDiagram** and **WebPageDiagramDark** | web 1440×900 | All `DIAGRAM_VIEWS` | See "Diagram states" below. |
| **PhonePageDiagram** and **PhonePageDiagramDark** | iPhone 390×844 | All `DIAGRAM_VIEWS` | The ETC diagram fitted at 80% or larger. 'Drag to move' on the selected box. A box lifted by a long press with a haptic note. 'Tap the box it points to'. A full-screen Statements view. The test is one at a time. All sheets are Lucida's own. |
| **WebPage / PhonePage** (existing; gray through `grayOf`) | web + iPhone | Adds **'Needs an update'** | A page of a kind the app can't show: 'This Mind map needs a newer Lucida. Update to open it.' with Back; never an empty Note. Plus every state above, in gray once per kind. |
| **MapLayouts** (gallery, not a screen; a `dark` prop) | web, light and dark | 'Mind maps', 'Diagrams', 'Cycles', 'Stress' | Real engine output for fixtures. Mind maps: The cell ('both' and 'right'); a 200-idea map folded to level 2; a lopsided 6-level map; Japanese and emoji labels; 80-character labels. Diagrams: the ETC down and right; glycolysis right; a signalling cascade with a feedback arrow (a broken cycle); a food web (crossings); one diagram before and after placing 2 boxes and after Tidy up. Cycles: the Krebs cycle (ring with tails), the cell cycle (a pure ring), a cycle with too many tails (falls back to layers). Stress: 80 boxes and 160 arrows. **Axel approves the look of the layouts here before any app work.** |
| **NoteWeb / NotePhone** (and WebPage 'Writing') | web + iPhone | 'Reading' (updated), new **'A map inside'** | The hand-drawn SVG (design/pages.mjs:136-138) is replaced by real `previewOf` previews of ps2 and ps4 (150 px on the web, 120 on the phone), with the footer 'Mind map · 23 ideas · 3 weak · Test me'. 'A map inside' scrolls to both embeds, and also shows the loading skeleton and 'Page not found'. |
| **PagesWeb / PagesPhone** and the deck's Pages block | web + iPhone | 'List', 'New page menu', new **'New mind map'**, 'Empty deck' | Mind map and Diagram enabled (Presentation, Canvas and Doc still 'Soon') with the new `flow` icon. Rows read 'Mind map · tested yesterday' and 'Diagram · not tested yet'. 'New mind map' is the second step: Blank map, or From this deck’s cards · Lucida AI (2 left today). The empty deck's line invites 'Make a mind map of this deck in Lucida.' |
| **WebDeckDiagrams / PhoneDeckDiagrams** (`DIAGRAM_STATES`) | web + iPhone | 'Diagrams' (updated), 'Make diagram' (updated), 'Diagrams (studying)' | Moved maps as rows reading 'Mind map · in Pages'. The Make sheet's Mind map option reads 'Makes a Mind map page you can test yourself on'. The tab title shown both ways ('Diagrams' / 'Figures') for Q1. |
| **WebPublicDeck / PhonePublicDeck** | web + iPhone | New **'With map pages'** | A shared deck with ps2 and ps4 drawn read-only (pan, fold), no duplicate legacy map. |
| **Motion** (existing board) | web | New: 'Fold and unfold', 'Reveal in a test', 'Camera to the next hidden idea', 'A box drops into a slot' | At their real timings (0.16 s / 0.25 s, ease `.2,.8,.2,1`), each next to its instant Reduce Motion version. |

**Mind map states (web):**
- The ps2 map two-sided: the "+3" chip on ER and Golgi, a note dot on Mitochondria, card badges. The header has the Test me pill and v3; the stage has `[Map | Outline]`, `[Weak spots · 3]` and the `[− | Fit | +]` cluster.
- **an idea selected:** Mitochondria ringed, the idea bar with its note lines, '1 card', + Idea, Cards, + Card, Fold, ⋯.
- **writing an idea:** an input over a new child under Mitochondria.
- **cards of an idea:** the Cards popover on Electron transport, with cm2 marked "Weak spot", Link a card search results, and Study these cards.
- **make a card:** the Make-a-card sheet prefilled from Mitochondria (its children as a list).
- **outline:** the `role=tree` outline with `{#id}` hidden from view.
- **weak spots:** the tints, dots, legend with counts, and a '1 weak' chip on the folded ER branch.
- **test me:** the choices sheet.
- **testing:** dashed "?" boxes, 2 revealed with red and green rings, '6 of 18 · 1 missed'.
- **one at a time:** the web version of that mode.
- **test done:** 'You knew 14 of 18', 4 missed with their paths, Test the 4 again, Study their 3 cards, + Card on Smooth ER.
- **changed by your AI:** the banner, 4 ringed new ideas, and the 'Claude added 4 ideas · v4' line.
- **new:** a blank topic showing the title, the hint 'Type the topic, then Tab adds an idea under it. Or ask your AI: “Make a mind map of this deck in Lucida.”', and 'From this deck’s cards · Lucida AI (2 left today)'.

**Diagram states (web):**
- ps4 laid out down: round NADH, FADH₂, O₂ becomes H₂O and ATP; verb labels on chips; dashed Cyanide → Complex IV beside it; a card badge on Complex IV.
- **across:** direction right.
- **a cycle:** the Krebs ring.
- **a box selected:** the box bar (+ Box, Connect, Cards, + Card, ⋯ with the Shape pills).
- **an arrow selected:** the arrow bar (words, Dashed, Turn around, Delete).
- **moving a box:** Cyanide mid-drag, its arrows following, the slot ghost, and Tidy up in ⋯.
- **connecting:** 'Click the box it points to'.
- **statements:** rows plus the add row 'A -> B : words'.
- **weak spots:** Complex IV and the missed words of 'cn>c4' tinted.
- **testing:** boxes blanked, arrow words kept.
- **test done:** the results, including arrow statements.
- **changed by your AI:** the banner and rings.
- **new:** 'Add a box, or ask your AI: “Draw the electron transport chain as a diagram in Lucida.”'

**Checks:** `check.mjs` pushes every `PAGE_VIEWS` state for WebPage/PhonePage in light and dark (gray through `grayOf` once per kind), plus the MapLayouts states. `check-own-ui` must pass.

---

## 11. Files to add or change

### Server (`web/`)

| File | Change |
|---|---|
| `plans.mjs` | **`PAGE_READY`**, the single list: `['note']` → `['note','mindmap']` (4a) → `['note','mindmap','diagram']` (4b). |
| `pages.mjs` | `READY = new Set(PAGE_READY)`. `cleanData(kind, data, prev, {ai, title})` calls `maps.normalize` for map kinds, refuses Note-shaped data (code `'shape'`) and returns `warnings`. `prev` for every kind. Warnings attached to the returned page. An automatic summary for AI writes without one. Starting values from `emptyOf`. |
| `handler.mjs` | Refuse creating a kind that isn't in `READY` (today only MCP checks). Pass warnings through. |
| `mcp.mjs` | Everything in §3: the helps, descriptions, schemas, `contentIn`, `pageOut` per kind, `cardsFor`, `studyOf`, `checkCards`, write replies with `text` and `link`, the `notReady` wording, the instructions, `add_cards` ids, `delete_page` sending `mapmarks.drop`, and `moveMaps` beside `moveGuide`. |
| `store.mjs` | `S.mapMarks`; the actions `mapmarks.save`, `mapmarks.drop` and `diagrams.moved`; `deck.delete` drops marks; `roomFor` ignores moved diagrams. |
| `sched.js` | `toneOf(card)` (new, weak, getting there, solid; the rule depends on Q2). |
| `db.js` | The `page:` review set in `setCards` and `setName`; `db.mapMarks(pid)`; `db.diagrams` make returning `{pageId}`. |
| `diagrams.mjs` | `plainText` calls `maps.plain`. `MAP_SCHEMA` gains `cards` indexes. `material()` becomes async and reads Note pages. `makeReq` creates or updates a page. `roomFor` subtracts moved maps. |
| `diagrams.js` | Rows for moved maps open the page; the make result opens the page. |
| `social.mjs` | `mapPagesOf`, the `maps` field in the Guide record, de-duplication by `from`, normalizing again on copy, study sync and the public payload, and making pages for copies. |
| **`maps.js`** (new) | The engine (§4.1). |
| **`mapview.js`** (new) | The DOM viewer and editor (§5). |
| **`mapmove.mjs`** (new) | The migration (§7.1). |
| `notes.js` | `lookup` keeps and checks `version`, `preview` and `study`; `refEl` draws the preview and the footer's Test me button; the header documents `page(id)`'s new shape. |
| `pagesclient.js` | The `MERGE` table by kind; never sending mine over theirs for an unknown kind; `emptyOf` fallbacks; diff-based summaries at flush. |

### Design (`design/`)

| File | Change |
|---|---|
| **`maps.mjs`** (new) | `MINDMAP_VIEWS`, `DIAGRAM_VIEWS`, the samples (ps2, ps4, Krebs, cards, marks), `MAP_CSS` (tints, the dashed border of hidden ideas, the glide, Reduce Motion overrides), the MapLayouts board, the Motion sample states. |
| `pages.mjs` | Import `PAGE_READY` from `../web/plans.mjs` (the hardcoded `READY = ['note']` goes). Extended `PAGE_VIEWS`. `pageBoards` switches on kind (`mapRef` with `this.mapview()`, 'Needs an update'). The mock page follows the view. `pageInfo` and `refs` carry version, preview and study. The New page second step. The Note sample's `::page` embeds. |
| `build.mjs` | `MAPS_METHOD` and `MAPVIEW_METHOD` injection (sliced like `DIAGRAM_METHOD`, with fallback stubs). Register the Mindmap/Diagram variants, their Dark twins and MapLayouts. The `flow` icon. |
| `diagrams.mjs` | Moved rows, the Make sheet copy, the studied viewer through `this.maps()`; `dgThumb` on tokens. |
| `check.mjs` | `PROP_SETS` for the new views (light, dark, gray). A maps sanity step: every sample and fixture lays out without throwing, with no overlapping boxes. |
| `to-ios.mjs` | Copy `web/maps.js` to `ios/Lucida/Resources/maps.js`. Write `Generated.pageReady`, `Generated.pageViews` and the sample JSON. |
| `to-web.mjs` | No change (PhonePage is already in `phoneFill`). |

### iOS (`ios/Lucida/`)

| File | Change |
|---|---|
| `Data/MapEngine.swift` (new) | §4.7. |
| `Data/MapData.swift` (new) | `MapLayout` and `MapPreview` (Decodable), view memory in UserDefaults, the `mapMarks` model. |
| `Data/PageData.swift` | `PageKind.ready = Generated.pageReady`; the Diagram icon becomes `flow`; `PageMerge` dispatch by kind (notes stay in Swift; maps go through MapEngine). |
| `Data/Pages.swift` | The 409 path by kind; `emptyOf` fallbacks; `markdown()` only for notes. |
| `Screens/Page.swift` | `pageArea` switches on kind; 'Needs an update' for kinds not ready (**shipped first**, in the safety release); reacts to version and data, not only `n.md`; `PageSampleView.all = Generated.pageViews`; `refs()` keyed on version. |
| `Screens/MapPage.swift` (new) | The map body, bottom bar, idea bar, Test me flow, key row. |
| `Design/MapCanvas.swift` (new) | One-Canvas drawing, gestures, glides; `.page` and `.preview` modes. |
| `Design/MapOutline.swift` (new) | The Outline and Statements editors, and the accessibility representation. |
| `Design/MapSheets.swift` (new) | The Test me, Test done, Cards (with Link a card search) and Make a card prefill sheets. |
| `Design/NotesViews.swift` | `NotePageRef.page(title:kind:preview:study:)`; `NoteRef.box` draws the preview. |
| `Design/Swipe.swift` | Use `BackSwipe.canPop` with the 24 pt edge rule on map screens, and turn off the content back swipe. |
| Store and `Data/Engine.swift` | `mapmarks.*` actions, the `page:` review set, `Sched.toneOf`. |
| `Screens/Deck.swift`, `Screens/Diagrams.swift`, `Data/DiagramsData.swift` | The New mind map second step; make → `nav.page(pageId)`; moved rows. |
| `App/DebugChecks.swift` | MapEngine loads; the JavaScriptCore budgets (§4.6). |

### Tests

| Path | What it covers |
|---|---|
| `tests/maps.mjs` | Normalizing (caps, id rules, AI-keep, refusals, idempotence: normalizing twice changes nothing); text round trips for both kinds, including the Mermaid subsets; layout determinism, no overlaps, ring and slot cases; merge fuzz (2,000 cases, the properties in §8.6); performance in node. |
| `tests/mcp-pages.mjs` | Create, update, conflict, warnings, the shape refusal, card id checks, `get_page` readouts, a page in a folder. |
| `tests/fixtures/agent-maps/` | 60+ outputs captured from Claude, ChatGPT and DeepSeek given only the final help strings, each with its expected data and warnings. Captured again whenever a help string changes. |
| `tests/pages-safety.mjs` | `{blocks}` to a map page gives 400 `shape`; the app's 409 on an unknown kind doesn't overwrite. |
| `ios/tests/maps-check.sh` + `ios/tests/js/maps-dump.mjs` + `ios/tests/swift/maps/main.swift` | Fails when `Resources/maps.js` differs from `web/maps.js`; compares node with JavaScriptCore **byte for byte** on 500 seeded maps and diagrams plus edge cases (an empty map, the caps, depth 6, CJK and emoji, cycles, self-loops, slots, rings), covering normalize, layout, merge and text. |
| `ios/tools/e2e-pages.sh` | Makes a map and a diagram over the API, opens them, renames an idea, makes a concurrent API write and sees both changes plus the banner; runs Test me and checks the marks were saved; screenshots every new state against the boards. |

---

## 12. Build order with checkpoints

**0. Safety release.** Before any map page can exist.
- Work:
  - `PAGE_READY` as the single source, still `['note']`.
  - `cleanData` refuses Note-shaped data for non-note kinds.
  - `prev` passed for every kind.
  - The handler refuses kinds that aren't ready.
  - The `MERGE` table in `pagesclient.js` and `Pages.swift` never overwrites the other writer.
  - An iPhone release with 'Needs an update' and kind-shaped fallbacks.
- Checkpoint: `tests/pages-safety.mjs` green; a seeded mindmap row shows 'Needs an update' on TestFlight; that iPhone release is submitted to the App Store.

**1. Engine, mind map half.** `maps.js` (normalize, text, layoutMind, previewOf, svgOf, merge, diff, edit, ideaTone, matchCards, reviewIds, testOrder) and `sched.toneOf`.
- Checkpoint: `tests/maps.mjs` green, including the merge fuzz and the node budgets.

**2. Boards for 4a.**
- Work: `design/maps.mjs`; the MapLayouts mind map gallery; WebPageMindmap and PhonePageMindmap with their Dark twins; 'Needs an update'; the Note embeds; the New mind map step; the Diagrams-tab states; the Motion samples.
- Checkpoint (the gate for Axel): `node design/build.mjs && node design/check.mjs` and `check-own-ui` green. **Axel approves the boards and answers §13.**

**3. Server and MCP for the mind map.** `READY` is still note; the tests override it.
- Checkpoint: `tests/mcp-pages.mjs` and the agent fixtures green with the final help strings.

**4. Web app.**
- Work: `mapview.js` (view, fold, select, idea bar, edit, outline, keys, undo), `to-web`, the merge by kind, embeds, deep links.
- Checkpoint: running locally, an API write while typing shows the banner and both changes; the embed redraws on a new version.

**5. Study.**
- Work: `mapmarks` actions, Test me, the overlay, the Cards popover and Link a card, the `page:` set, + Card linking, the Pages row line, the MCP study block.
- Checkpoint: store, review-set and MCP tests green; Test me works from the outline alone with a screen reader.

**6. iPhone 4a.**
- Work: MapEngine with `maps-check.sh`; MapCanvas read-only, then fold and select, then Test me, then editing (idea bar, sheets, outline), then the merge, then embeds, then marks and the review set.
- Checkpoint: byte parity on 500 cases; DebugChecks budgets met on an iPhone 12-class device; `e2e-pages.sh` green; screenshots match the boards one for one.

**7. Flip `READY` to include `'mindmap'`.** Done on the server and web, and in Generated for the iPhone release that carries maps.
- Preconditions: step 0 has been live in the App Store for at least one release; steps 3-6 have passed.
- Checkpoint: end to end — create through MCP, open on web and iPhone, concurrent edits, and the safety build showing 'Needs an update'.

**8. Lucida AI, migration and sharing.**
- Work: `material()` reads Note pages (first); `MAP_SCHEMA` indexes; `makeReq` makes pages; the New page second step; `mapmove.mjs`; the Diagrams tab; `mapPagesOf`, public and studied views, and copies.
- Checkpoint: the migration is idempotent, runs only for owners, ignores the Free cap and takes up earlier pages; the public deck shows moved maps once; old clients still see the legacy maps.

**9. 4b Diagram.**
- Work: `normalizeDiagram`, arrow-line text, `layoutGraph` with rings and slots, the diagram merge and `statementsOf`; the MapLayouts diagram gallery and DiagramWeb/Phone (**gate for Axel**); `DIAGRAM_HELP` and statements; the web diagram mode (drag to slot, Connect, statements, Tidy up, arrow tests); iPhone (long press or select-then-drag, Connect); the `flow` icon; flip `READY` to include `'diagram'`.
- Checkpoint: as in steps 1-7, plus the diagram JavaScriptCore budget, or else the cap drops to 60/120.

**10. Hardening.**
- Work: performance at the caps on the oldest supported iPhone; VoiceOver and keyboard passes; Dynamic Type; View as Free (page and version limits); e2e on both kinds.
- Checkpoint: all suites green, and Axel signs off on a real device.

---

## 13. Risks and open questions for Axel

### Risks

| Risk | Mitigation |
|---|---|
| Installed apps damage map pages: today's iPhone opens every kind as a Note and saves `{blocks}`. | Step 0 ships first (the server refusal plus 'Needs an update'). READY flips only after that. |
| Scope: the biggest step so far. | 4a (mind map) before 4b (diagram). One engine and one page board. No AI in the study features except making a map. A clear Later list. |
| Estimated text widths overflow (wide letters, emoji, other scripts). | Units per code point, maxW, an 8% squeeze in the renderer, and gallery fixtures with the widest strings. The parity test keeps web and iPhone identical, even where the estimate is off. |
| JavaScriptCore without the JIT is slow at the caps. | Cached, off the main thread, transforms only during gestures; the DebugChecks budget; the fallback cap of 60/120; a Swift outline if the engine fails. |
| The layered layout looks tangled on dense real diagrams. | The MapLayouts gate before app work, the caps, rings, slots plus Tidy up. Network simplex or Brandes–Köpf later, only if the gallery shows the need. |
| Merge bugs (moves, deleted parents). | Normalizing after every merge, the property fuzz in both node and JavaScriptCore, and Versions as the safety net. |
| Gesture traps on the iPhone. | The edge-only back swipe, select-then-drag or long press, static embeds, 44 pt targets. Needs real-device testing. |
| Agents write poor maps (sentence labels, "relates to", lost ids). | The help sets the rules; the server repairs and warns; replies echo the ids; matching by words; the fixture corpus. |
| `S.mapMarks` makes the library bigger. | 100 pages × 300 entries, pruned on save, dropped with the deck. Watch it against the reload every few seconds. |
| Tool descriptions grow (about 4 KB, once, in `create_page`). | Single-line examples, `update_page` points to `create_page`, and a token budget checked in `tests/mcp-pages.mjs`. |

### Open questions (each with a recommended default)

1. **Rename the deck's "Diagrams" tab to "Figures"?** After step 4, that tab holds only tables and pictures, while "Diagram" becomes a page kind. **Default: yes, rename it.** If not, every label says "Mind map page" and "Diagram page" in full.
2. **One meaning of "weak" everywhere?** Today a card is weak forever after one lapse (lapses > 0, or relearning), which would tint much of every map red. The proposed shared rule, `sched.toneOf`:

   | Tone | When |
   |---|---|
   | weak | Relearning, or recall now under 70%, or forgotten twice or more with recall under 85% |
   | getting there | Still learning, or recall under 90% |
   | solid | Anything else |
   | new | Never reviewed |

   It would also change Note card blocks and the `weak` flag MCP sends. **Default: yes, adopt it in one release together with the overlay**, with the sentence added to the MCP instructions. If not, maps use today's rule.
3. **Move made mind maps from Diagrams into Mind map pages automatically, once per deck?** The old record is kept for old apps, the move is exempt from the Free page limit, and rows in the Diagrams tab open the page. **Default: yes.**
4. **On a phone held upright, show maps one-sided (topic at the left, folded to level 2) instead of the topic in the middle?** This keeps text at 13 pt or larger. A computer, an iPad and a phone held sideways still get the topic in the middle, as the New page menu promises. **Default: yes.** It is one constant (700 pt) if you want "middle" everywhere.
---

## 14. Axel's answers (2026-10-11)

1. Rename the deck's Diagrams tab to **Figures**: yes.
2. One meaning of "weak" (`sched.toneOf`, the table in §13 Q2) everywhere (maps, Note card blocks, MCP `weak`): yes.
3. Move made mind maps from Diagrams into Mind map pages automatically, once per deck: yes.
4. Upright phone: topic at the left, branches to the right, folded to level 2: yes.

Note on step 0: Pages has not shipped to the App Store yet (it lives on branch lucida-ai-native-pages), so the "Needs an update" safety goes into the first Pages iPhone release itself; no separate earlier release is needed. Server refusal of Note-shaped data on map kinds and the per-kind merge still come first.
