# Lucida for iPhone

A native SwiftUI app. Every screen is one of the design canvas's iPhone boards, drawn at the same sizes, and it uses
the same server as the web app (app.lucida.cards): the library comes from `/api/state`, every change goes through
`/api/action`, and signing in is the same 6-digit email code.

Open `Lucida.xcodeproj` in Xcode 26 and run it on an iPhone or a simulator (iOS 18 or later).

## What's shared with the canvas

`design/to-ios.mjs` copies what the app shares with the canvas into `Lucida/Design/Generated.swift`: the theme
colors, icons, gradient palettes, tag colors, the sign-in wall's cards, logos, and the canvas's sample data. Run it
after changing any of those:

    node design/to-ios.mjs

Deck gradients come from the deck's name the same way as on the web (`Mesh.gen`, a port of `design/generator.mjs`),
so a deck looks the same everywhere. The film grain is one tile (`Lucida/Resources/grain.png`, made by
`tools/grain`). Geist and Geist Mono ship with the app (SIL Open Font License).

## Design screens

A debug build opens any canvas board with the canvas's sample data (nothing is saved):

    xcrun simctl launch booted cards.lucida.app -board PhoneLibrary

Every iPhone board works, like `PhoneReviewFour`, `PhoneDeckSettings`, `PhoneQuizMatch`, `PhoneLibraryCards`,
`PhoneLibraryNewFolder`, `PhoneDeckMoveTray`, or `PhoneSignIn` (add `Dark` to the name for its dark-mode twin, or `Gray`
for dark mode's gray look). Decks and cards can be dragged on the design screens too (hold one for a third of a second).

## Testing with your own server

A debug build can use another copy of the server, like the one in `web/server.mjs` running on your Mac (it saves
to its own folder and needs no sign-in):

    STEALTH_DATA=/tmp/lucida-test/ PORT=3194 node web/server.mjs
    xcrun simctl launch booted cards.lucida.app -server http://127.0.0.1:3194 -open deck

A new library (not welcomed yet, no decks) opens on the welcome after sign-in (connect your AI, bring your cards;
`Screens/Welcome.swift`). Its boards are `PhoneWelcome`, `PhoneWelcomeClaude`, `PhoneWelcomeConnected`, `PhoneWelcomeImport`,
`PhoneWelcomeAnki`, `PhoneWelcomeFound`, and `PhoneWelcomeDone` (and their Dark and Gray twins). Against a server, `-open welcome`
opens it even on a library that has seen it; `-welcomeAI claude` starts on that AI's steps; `-welcomeFile <path>` reads
that file as if it was picked (a .csv as a spreadsheet, anything else as an Anki export), and `-welcomeImport` then
imports it. `-auraOnly` (with a board) shows only its moving background, held still, for comparing with the canvas.
The background's shader is compiled when the app first shows it (Design/Aura.swift), so building needs no Metal toolchain.

`-open` goes straight to `deck`, `review`, `stats`, `connect` (Settings › Connect AI), `settings`, `learn`, `library` (or `today`, the old page's name for it), or
`cards` (the Library's All cards). Give that server `OPENROUTER_API_KEY` (and `OPENROUTER_BASE` pointing at a stand-in, for testing) to try Explain.

## The Library: the first page, where decks are made

There is no Today page (the owner, 2026-10-01: "could we just get rid of the 'today' page so users just focus on the library and deck creation in there?").
The tab bar is Library, Discover, Stats and Profile, the app opens on the Library, and everything that went to Today goes there: the welcome's end, a
review of every deck's X and Done, a practice test opened again, `-open today`, and the daily reminder's notice.

The Library makes no cards itself (the owner, 2026-10-02: "remove the library composer, upload buttons, cards due accross all canvas screens", then
"remove the 'make cards from library'"): no Make box, no Upload, Paste, YouTube and More row, no line of what's due, and its + is New deck and Import
cards. Its switch is Decks and All cards (no Classes: the owner took them out on 2026-10-02). A brand-new account's Library is three plain tiles
side by side, New deck, Import cards and Connect AI, with no other words (`StartTiles`, `Screens/LibraryTop.swift`). Cards are made from a
deck: its cover's Make cards and New card (an empty deck, where New deck opens, is its cover and nothing under it). News is the bell in Discover's
header. While a sheet covers the page (Make cards, a source, a diagram, Make diagram), the page under it is hidden from VoiceOver, so only the
sheet's buttons are found. Boards: `PhoneLibrary` (`-caughtUp`, `-menu open`), `PhoneLibraryFolder`, `PhoneDecksEmpty`, `PhoneDeckEmpty`,
`PhoneDiscover`.

    ios/tools/e2e-home.sh <simulator id>

starts a fresh server on port 3953 and the stand-in AI on 3954, and runs `LucidaUITests/HomeTests`: the first page (no box, row or due line, the +
menu), a deck's Make cards and New card, an empty deck, a brand-new account's three tiles, no Classes (a class still on the server shows
nothing), and News on Discover.

## Import cards

The Library's + and a brand-new account's Import cards open Import cards
(`Screens/Import.swift`, `nav.importCards(deckId:)`): the web's Import page (WebImport) one for one, as a sheet. A box to paste cards into (Geist
Mono, eight lines, a tab as wide as eight spaces, as in the browser's textarea), Choose a file (the phone's Files picker: a .txt, .csv or .tsv),
what was found ("3 cards found", or "No cards yet. Put the front and back on one line, split by a tab or comma."), Into deck (a name, and chips
of your first six decks), Cancel and Import. The cards are read as the web reads them (`Data/ReadCards.swift`, design/build.mjs READ_CARDS_JS
ported: Anki's and Quizlet's text exports and CSV, Anki's header lines, HTML through a port of what the browser's DOMParser does, `{{c1::…}}`
blanks), a long text off the main thread. A file is read as UTF-8, then UTF-16 (by its mark, or by its zero bytes), then Windows-1252 or
Latin-1 (`ReadCards.text`). Import sends `data.import` a thousand cards at a time (a send that stopped part way goes on from there), into the
deck with that name (the one it opened with first) or a new one ("Imported cards" when there's no name), then that deck's page opens. What
goes wrong is a quiet line in the sheet (the server's own words, "Couldn’t reach Lucida. Check your connection and try again.", or "That file
couldn’t be read."), never an alert.

The board is `PhoneImport` (and `PhoneImportDark`, `PhoneImportGray`) with its `-state`: `"Deck chosen"` (when it's left out), `Empty`,
`Pasted`, `"A file picked"`, `"No cards"`, `Importing` or `Error`. Debug builds also take `-open import` (over the Library), `-open
import:<deck name>` (over that deck, with it chosen) and `-importFile <path>` (that file, read as if it was chosen).

    ios/tests/import-check.sh
    ios/tools/e2e-import.sh <simulator id>

The first gives the app's reader and the web's (taken from the built WebImport board and run with web/rich.js in Chrome, so HTML is read by
the browser's own parser) the same 1,237 texts (the web's samples, quotes, empty lines, a BOM, CRLF, tabs inside quotes, Anki's headers, HTML,
1,200 made up; `IMPORT_FUZZ` and `IMPORT_SEED` make more) and compares every deck and card, then reads a text file written 13 ways; it is part
of `tests/run.sh parity` too. The second starts a fresh server on port 3971 and `ios/tools/fail-proxy.mjs` on 3972, makes its files, and runs
`LucidaUITests/ImportTests` in six flows: every way in, pasting and typing (the count and the line), into a new deck and one of yours, files
(UTF-16, Latin-1, an Anki export, 2,500 cards, one that isn't text) and the Files picker, a save that fails and goes on when tried again, and a
deck you only study; no system alert in any of them.

## The study network

The tab bar is Library, Discover, Stats, and Profile (your own picture is its icon), and the app opens on the Library (there is no Today: see
above). Connect AI is a page inside Settings (its row there, a back button, no tab bar; `Nav.openConnect()` opens it from the new account's Library).
Discover (its own tab), profiles (yours is the Profile tab, and its gear opens Settings;
anyone's, from their name, is a page that lights no tab),
Edit profile, pins, News (the bell in Discover's header), Settings → Profile, whose each deck is in the Library, and a deck's sharing:
the Sharing tab of Deck settings, a deck you study from someone (Suggest a change instead of New card), and your copy of
one with the owner's changes to take or skip. The answers come from the same server as the web app's (`Data/Net.swift`,
like `web/net.js`). The boards: `PhoneDiscover`, `PhoneDiscoverSearch`, `PhoneProfile` (and `Other`, `Following`, `Edit`,
`Saved`, `Suggestions`, `Empty`, `Loading`, `Missing`), `PhoneActivity` (and `Empty`), `PhoneDeckStudied`, `PhoneDeckCopy`,
`PhoneDeckUpdates`, and `PhoneDeckSettingsShare`, with their Dark and Gray twins.

A shared deck's pages are drawn natively too (`Screens/PublicDeck.swift`, `SuggestSheet.swift`, `Suggestions.swift`,
`History.swift`; their data and words are in `Data/NetPages.swift`, like web/social.mjs deckPage, historyPage, and
suggestionsFor): the deck's page (`PhonePublicDeck`, and `Studying`, `Owner`, `Copy` for its Make a copy sheet, `Suggest` and
`SuggestNew` for its Suggest a change sheet), a deck's `PhoneSuggestions` (`Open`, `Empty`), and its `PhoneHistory` (`Open`),
with their Dark and Gray twins. Every deck tile, profile, From row, Sharing link, and News row opens them (nothing opens
Safari). A debug build opens them against a server with `-open deckpage:/@maria/mcat-biochemistry` (add `?copy=1` or
`?suggest=<card id>` like the web's links), `-open history:/@maria/mcat-biochemistry`, `-open suggestions` (every deck of
yours), and `-open suggestions:<deck name>`.

Against a copy of the server, `-dev <name>` signs in as one of its made-up people (like `/dev/as/<name>` on the web), and
`-open` also takes `discover`, `news`, `profile` (yours), `profile:<handle>`, and `deck:<name>`. The whole thing is tested
end to end by tapping through the app as three people (one shares a deck; another finds, follows, and studies it; a third
copies it and takes and skips the owner's changes; then News, pins, Sharing, and Edit profile):

    ios/tools/e2e.sh <simulator id>

It starts a fresh server on port 3677 and runs `LucidaUITests/StudyNetworkTests`. The shared deck's pages have their own,
in seven flows (Discover to the page, Save, Study, Make a copy, Suggest a change, the owner taking and skipping changes,
History and Go back, your AI's cards, the pages' other states, and every link that opens them):

    ios/tools/e2e-pages.sh <simulator id>

It starts a fresh server on port 3721 and runs `LucidaUITests/SharedDeckPagesTests` (`TEST_RUNNER_SHOTS=<folder> ios/tools/e2e-pages.sh` saves
a picture of the screen whenever a check fails).

## Pro study tools

The scheduling rules are ports of the web app's: `Data/FSRS.swift` (with a person's tuned parameters), `Sched.swift` (paused
cards, exam dates, cards you keep forgetting, what a goal costs), `Tune.swift` (Tune to you: the same fit as web/tune.js),
and `Insights.swift` (Stats' Memory, Weak spots, and Pace). `Screens/StudyPlan.swift` is Deck settings → Studying's Pro
part, `StatsDeep.swift` the deep tabs, `TuneRow.swift` Settings' Tune to you. Boards: `PhoneDeckSettingsStudy`,
`PhoneDeckSettingsStudyFree`, `PhoneStatsMemory`, `PhoneStatsWeak`, `PhoneStatsPace`,
`PhoneStatsUpgrade`, `PhoneEditorPaused`, `PhoneSettingsFree` (a board's `-tune Off|"Not enough
reviews"|Tuning` shows the other states of Tune to you).

More launch arguments (debug builds): `-open statsdeep -tab Memory` (or `Weak spots`, `Pace`) opens Stats on that tab;
`-dev <name>` signs in as a made-up person on a local test server (like the web's /dev/as/<name>; a name that starts with
`free` is on the Free plan; the app remembers who, and `-dev none` forgets it, so the server's own person is back);
`-check pause|exam|grade|learn|tune|free` runs an end-to-end check against the server and quits (`App/DebugChecks.swift`);
`-scroll <points>` opens a page scrolled that far.

`tests/run.sh parity` checks the ports against the web app's own code on a seeded library and made-up variations of it (no
simulator), and `tests/run.sh e2e` runs the `-check`s in the simulator against a local server (`DEVICE=<simulator id>`).

## Practice test

**Practice test** is on a folder's page (every deck in it that isn't paused); a deck's page has none (the owner, 2026-10-02: "remove practice
tests"). It opens
a sheet (how many questions, which kinds, a time limit, and "Tests don’t change your review schedule."), then the test: numbered
questions you can go back through and flag, a list of all the questions, a quiet clock when you asked for one, and nothing about right or
wrong until Submit (which asks first when some are unanswered). The results show the score, the time, every question with your answer
and the right one, Explain where the card has it, **Count it as right** on a written answer the spelling check missed, **Retake the ones I
missed**, and **Study the missed cards now** (a normal review of just those cards, then back to the results). `Data/TestEngine.swift` is a
port of the web's engine (`web/db.js`, "Practice test": Learn's `choiceQuestion`, a card of its own for each question, matching as four
or five pairs, the kinds in sections); `Data/TestDemo.swift` is the design screens' sample test; `Screens/PracticeTest.swift` has the
pieces (`TestStartButton`, `TestFolderBits`, `TestStartSheet`, `TestScreen`). A test never changes a schedule or logs a
review. The test in progress is kept on the phone (`UserDefaults`, `lucida.test`) and is open again, where it was, when the app opens; its
clock counts only while it shows. A finished test is saved with the library (`test.save`, and `test.fix` for Count it as right), and the
folder's page says how its last one went.

The board is `PhoneTest` (the folder's pieces are states of `PhoneLibrary`); with it, `-screen "Set up"`,
`Multiple choice`, `True or false`, `Fill in the blank`, `Written`, `Matching`, `Submit`, `Leave`, `Results` or `"Results · missed"` picks the
screen and `-timed false` takes the clock off. More launch arguments (debug builds): `-open folder:<name>` (the folder with that name),
`-testAudit` (an invisible element tells the end-to-end test which answer is right for the question on screen) and `-testSpent <ms>` (the
test in progress has already been open that long, to check the clock without waiting).

    ios/tools/e2e-test.sh <simulator id>

It starts a fresh server on port 3947 and runs `LucidaUITests/PracticeTestTests` (which only runs when that script asks for it): the
set-up, a test of choices and true-or-false (numbers, back, flags, the list, Submit asking, the results, Retake the ones I missed, past
results on the deck page), written answers with typos, Count it as right and Study the missed cards now, matching, the clock (the test
open again after the app closes, running out by itself, leaving), a folder's test, and fill in the blank; a test changes no schedule.

## Questions Lucida writes for Learn mode

When Learn mode starts and the next cards have no question yet, the app asks the server's Lucida AI for 20 at once (`Store.wantQuiz` in `Data/LearnEngine.swift`, `API.quizBatch`, `POST /api/quiz`, like the web's), and again about 5 questions from the end;
the questions are saved on the cards (marked `by: "Lucida"`; a fill-in-the-blank one is `kind: "blank"`) and Learn mode and the practice test use them with the card's own words. Nobody waits: until
they arrive Learn mode asks with its builders, and when the AI is off or the day's batches are used (Free 3, Pro 30) it goes on with them without a word. `tools/e2e-quiz.sh <simulator id>` is the
end-to-end test (`LucidaUITests/QuizTests.swift`), with a pretend OpenRouter (`tools/stub-openrouter.mjs`) and a second server that has no AI.

## Report, Check this deck, and Get verified

Apple's rule for apps where people share things (guideline 1.2) wants a way to report content, and the web app has one: a
quiet **Report** on someone else's shared deck (on its cover, after the bell), on someone else's profile (after Share), and
on a suggestion once it's opened (a person's; not the cards your own AI made). Each opens the Report sheet
(`Screens/ReportSheets.swift`: four reasons, a line that Other needs, Send, then "Thanks. We'll take a look."), and the
server's own words when it says no (`web/classes.mjs` sendReport: "It's your deck.", "You have 10 reports waiting.", ...) show
in the sheet. A verified teacher or school (Settings → Account → **Get verified**, its sheet in `ReportSheets.swift`, approved by the made-up person `admin` on
a copy of the server) sees **Check this deck** under a shared deck's buttons, on a deck someone else owns whose check isn't
current; it then says "Checked by you" until the owner changes the deck, and the button comes back. Settings says **Verified
teacher** (or school) with the check. News says when you're verified and when a deck of yours was hidden after a report (with
Lucida's mark), and a helper's News row for a suggestion on a community deck opens Suggestions (every deck you own or help
with, like the web's /suggestions). The boards: `PhonePublicDeckReport`, `PhonePublicDeckCheck`, `PhoneProfileReport`,
`PhoneSuggestionsReport`, `PhoneSettingsGetVerified` (the sheet over Settings; `-open verify` against a server), and `PhoneSettingsVerified` (a board's `-verified "Waiting for review"|Teacher|School` shows the
other states of Get verified). `-open report:<deck|profile|suggestion>:<id>[:<name>]` opens the Report sheet for a deck (its
shared id), a person (their handle), or a suggestion, even where its page wouldn't offer Report (your own deck, say, to see
what the server answers).

Opening the app doesn't wait on a slow server: the library with the decks you study brought up to date (`/api/state?sync=1`)
gets 8 seconds, then the app shows the library as it is (`API.syncedState`, like the web's `readState`).

    ios/tools/e2e-reports.sh <simulator id>

It starts a fresh server on port 3844 and a small stand-in on 3846 that holds the sync for 12 seconds
(`ios/tools/slow-sync-proxy.mjs`), and runs `LucidaUITests/ReportsTests` (which only runs when that script asks for it):
Maria reports a deck, a person and a suggestion (and sees the server's words when it says no), a teacher gets verified in
Settings and checks someone's deck, a helper opens a suggestion from News, and the library opens although the sync is held.
`ios/tests/sync-check.sh` asks the app's own code for its library (`API.syncedState`) against a stand-in server that is slow,
trickles, errors, drops the connection, or says signed out, and checks what comes back and how soon (no simulator).

## Make cards

Cards from anything: a file (PDF, slides, a Word file, text, caption files (.srt and .vtt), pictures, audio), pictures from the library or the
camera, a lecture recorded with the microphone, pasted text, a YouTube link, or a topic in words. The same make also drafts starter notes for the
deck, and, for a language that is set, can write audio cards. `Screens/Make.swift` draws the canvas's `PhoneMake` board, a sheet over
the page it came from: pick a source, add it (with the options under it: Into deck, How many cards, Kinds, Language), watch it work (and
Cancel), check the new cards (edit, remove, or keep each one), and Add them to a deck, which then opens. What it does is `Data/MakeData.swift`,
a port of `web/make.js` (the same calls in the same order: `upload`, the file's bytes, `start`, `step` for each part three at a time with two
retries, `plan`, `finish`, `save`, `cancel`, `job`); `Data/MakeRecorder.swift` is the recorder (AAC .m4a, mono, 22.05 kHz, about 24 kbps, a new
file every 10 minutes, Pause and Resume, a stop of its own at the plan's minutes). `/api/state` carries `make` (the plan's limits), which the
library reads (`Library.make`). A file goes where `upload` says: a path on this server (with the session cookie) or the storage's own address
(with the headers it gives and no cookie). Pictures are made at most 1600 pixels across and sent as JPEG (the iPhone camera's HEIC included).
The speech service takes an audio file of at most 25 MB, and a make can be two hours, so a long recording goes up as several files: the recorder's
files are ten minutes each, and a recording picked from Files that is over 18 MB or longer than ten minutes (the web's own numbers) is cut into even
parts of at most ten minutes before it goes (`Data/MakeSplit.swift`: one `AVAssetExportSession`, `AVAssetExportPresetAppleM4A`, for each part's time range, to files in a
folder of the flow's own that go when the flow ends; the recording is never held in memory). Its row stays one row ("57 MB · 12 parts"), the
parts go up one after another in the same make ("Lecture (part 3 of 12).m4a", with the make named for the recording itself), and the server adds
each one's length to the next one's times. A recording longer than the plan makes from is turned away at once with the server's own words (nothing
is cut or sent); one that can't be cut and is over 25 MB says so. Take a photo shows only on a phone with a camera (the iOS 26 simulator says it can use the camera but has none).

It opens from a deck cover's Make cards (an empty deck's too), a source's More cards, a Guide's Make cards and a diagram's Make cards. Any screen
opens it with `nav.make(kind:deckId:from:guide:page:text:title:)`, like the web's `/make?source=&deck=&from=&guide=&page=`: `kind` (file, photo,
record, paste, video, topic, or none), the deck the cards go to, a kept source's id to make more cards from, a deck's id (and its page) to make
cards from its Guide, and words already in hand (a Guide's selection, which gets no notes).

**Notes.** `/api/make/finish` also answers `notes` (null, or a title, an overview, a note for each part of the material with where it comes from,
and the whole draft as Markdown). The review shows a "Notes for the deck" panel above the cards: how many ("6 notes · p. 4 to p. 9 · saved with the
cards"), a switch (on) that keeps them, and "Read the notes" / "Hide the notes", which unfolds the draft as the Notes page will read it (a section for
each part, each note a toggle that opens there too: `MakeNotesPage` in `Screens/Make.swift`, the Notes page's own view). The server drafts notes only when asked: every make sends `options.notes: true`, except a make from a Guide
page or from a selection of one (`nav.make(guide:page:)`, `nav.make(text:)`), which says `options.notes: false` and shows no panel, and more cards from
a source, which says nothing (its notes were drafted when it was made). Saving sends `notes: true|false` (only when finish gave notes), and the server
makes them the deck's Guide, or a new Guide page when the deck has one. When the deck the cards go into already has every page a Guide can have (the
library's `make.guidePages`, 10; `MakeFlow.notesFull`), the panel says "This deck has every page a Guide can have, so these notes can’t be added. Delete
a page in its Guide to make room.", its switch is off and out of reach (the notes can still be read), and saving sends `notes: false`. Nothing in this
flow writes or offers quiz questions.

**Audio cards.** With a Language chosen, the options offer an Audio kind beside Basic and Fill in the blank (off until turned on, with a line about
what it does); at least one kind always stays on, and clearing the language turns Audio off (and gives the other two back if Audio was the only one).
It goes to the server as `options.kinds` containing "audio", only with `options.lang`. Cards that come back with kind "audio" carry `speak` (the
words), `lang` (a BCP 47 code like es-ES) and `back` (what they mean); the review shows the words with a small speaker button (`Data/MakeSpeech.swift`:
AVSpeechSynthesizer, in the card's language), "Read aloud · es-ES", and two fields to edit ("Words to say", "What it means"); saving sends `speak` and
`lang` with each audio card.

The boards: `PhoneMake` (and `PhoneMakeDark`, `PhoneMakeGray`); `-state <the canvas's step>` shows any of its 24 states (`Pick`, `Upload`,
`Upload (a file added)`, `Photos`, `Record`, `Recording`, `Paused`, `Paste`, `Paste (a language set)`, `YouTube`, `YouTube transcript`, `Topic`,
`More from a source`, `Making`, `Making a recording`, `Review`, `Review (notes open)`, `Review (notes off)`, `Review (no room for notes)`, `Review (audio cards)`,
`Review (editing a card)`, `Limit reached`, `File too big`, `Error`), with the sample in `Design/MakeSample.swift`. Also changed: `PhoneLibrary` (its + menu; `-menu open` opens it) and `PhoneDeckEmpty` (its cover's Make cards).

More launch arguments (debug builds): `-makeFile <path>`, `-makePhoto <path>` (several: paths with commas between), `-makeRecording <path>` (a
file for the microphone, which the simulator doesn't have: the timer, Pause, Resume and Stop run as they do for real, and Stop uses that file;
`-makeSpeed <n>` runs its clock n times faster), `-makeTopic <words>`, `-makeText <path>` (a text file's words), `-makeVideo <link>` (with
`-makeText`: the link's transcript) open the flow with that already picked or typed; `-makeRoute "source=&deck=&from=&guide=&page="` opens it the
way the web's link does; `-open make` opens the list; `-safeTop 47` lays a screen out for the boards' own 47-point status bar (to set it beside
its board on a phone with a Dynamic Island).

    ios/tools/e2e-make.sh <simulator id>

taps through the app as made-up people, on a fresh copy of the server on port 3934 and the stand-in AI (`stub-ai.mjs`: it answers what
OpenRouter and Gemini would and logs every question; nothing real is asked) on port 3939, in 21 flows (every source, check and save, Cancel,
the Free plan's three a day, a file over the plan's size, pictures as JPEG, the recorder and its limits, Try again, the + menus, the web's
link, the pickers, a 70 minute recording cut into seven parts, caption files, the starter notes and a deck with no room for them, audio cards). It makes the long recording itself (ffmpeg, or afconvert) in a
temporary folder. `ios/tests/make-check.sh` runs the flow's own code on the Mac against a stand-in server that goes wrong on purpose (parts
three at a time and tried again twice, a bad file not tried again, the server's words, a 401, Cancel while it's starting, a direct upload
with no cookie, what can be picked, a long recording cut into parts and sent in order, the recorder's ten-minute files); no simulator.

## A deck's Guide and Sources

Every deck can have **Notes** (the Guide: a page like Apple Notes, with extra pages and a short history of versions) and **Sources** (what its cards were made from:
a file, pictures, a recording, a video, pasted text, a topic). The deck page has tabs right under Flashcards and Learn, **Sources | Cards | Notes | Diagrams** (the owner, 2026-10-02;
`Screens/DeckMaterials.swift` `DeckTabs`: plain underlined tabs, a small count on Sources, Cards and Diagrams; the page still opens on Cards): Sources only shows on a deck of yours (a deck you only study has Cards, and Notes when it has a Guide, read only; an address
for a tab that isn't there falls back to Cards). The cover has **Make cards** (the Make flow, into this deck) and **New card**, plainly, and
the line under the deck's name says how many cards ("412 cards"). The page has no numbers of its own (the Flashcards button keeps its count) and no exam line (the exam date is in
Deck settings → Studying).

**The page** (`Design/NotesViews.swift`; its memory and rules are `NotesPage` in `Data/Notes.swift`; web/notes.js on the web) is always formatted: a row for each block
(text, Heading, Subheading, bullets, numbers, a to-do with Lucida's own box, a toggle, a quote, a divider, code, a picture, a table), each line's words a text field of its own
(a UITextView on the older text system, its words' marks kept as attributes). A heading's ▸ (always there on a phone) folds its section, up to the next heading of the same or a
higher level; a toggle's ▸ opens what it holds; which are folded and open is how this phone shows the page (`UserDefaults` `lucida.notes.view`, by deck, page and each one's
words, the same shape as the web's), not part of the note. Enter makes a line of the same kind (an empty item turns into text), Backspace at the start of a line turns it into text,
then out a level, then joins it to the line above, Tab and Shift+Tab nest (a hardware keyboard), and `# ` `## ` `- ` `1. ` `[] ` `> ` (a toggle) `---` make blocks as they're typed.
Lucida's own bar sits above the keyboard (`NotesKeys`): Aa (Heading, Subheading, Text), To-do, Bullets, Toggle, Picture and keyboard down; while words are selected, Bold, Italic,
Strikethrough, Code and Link (its address in the bar). Reading (the deck page's Notes, a shared deck's page, the maker's starter notes) is the same rows without the editing: a
reader opens toggles and folds sections too, a link to one of the page's headings scrolls to it, and on your own deck a tap on the words opens the Notes page with the caret there.

**What is saved is Markdown, read and written by `web/guide.js` itself**, run in JavaScriptCore (`Data/GuideEngine.swift`; `design/to-ios.mjs` copies the file to
`Resources/guide.js`): `blocks()` turns the Markdown into the page's blocks and `markdown()` writes them back, so the iPhone keeps exactly what the web keeps and what AI apps
write (a toggle is `:::toggle Its title` … `:::`). The same safety (nothing in a Guide can run: raw HTML is shown as words, links are only http(s), mailto and in-page, a picture
only from the app's own `/media/` storage, a shared deck's also from its public storage). `ios/tests/guide-check.sh` (also part of `ios/tests/run.sh parity`) feeds the web test's
table and every call the web's own test makes to both node and the engine and compares the answers (31,000 checks, the blocks decoded into Swift and written back included),
checks the app's `guide.js` is the same file as `web/guide.js`, runs the page's saving logic against a stand-in server, and the page's rules (`ios/tests/swift/notes`: a blank
note, the shortcuts, Enter, Backspace, Tab, Aa, the marks, links, pasting, toggles and folds and what this Mac remembers, and what is saved: 101 checks), and that its icons are web/notes.js's.

**The Notes page** (`Screens/Guide.swift`, the canvas's `PhoneGuide`; opened by a tap on the deck page's Notes, `Route.guide` with `nav.guideAt` for the caret): back, the deck's name,
the quiet saving line and ⋯ (Make cards from this page or what is selected, Older versions, Rename page, Delete page, which asks first), the pages as pills and + for a new one
(a new page is called by its first heading until it's renamed). It saves as it is typed (`Data/GuideEditor.swift`: 700 ms after the last key, one save after another, Saving… and
Saved at the top, what went wrong in the same place, "This page is full." over 40,000 characters). Pictures go up like a card's.

**The outline** (`NotesRail` and `NotesOutline` in `Design/NotesViews.swift`; web/notes.js's `outline` on the web; the owner, 2026-10-02: "add that thing notion has where it shows a
rail tree of sections"): with two headings or more, a quiet rail of short lines sits at the page's right (12, 9 and 6 points wide by level, 2 tall, 6 apart; the section being read
in the words' color), 12 points under the top of the Notes page as it scrolls. A tap opens the headings as a tree in Lucida's own sheet (PickSheet's `tree`: a row further in by
its level, the one being read in bold); a heading scrolls there (`GuideAnchors.bring`, at once with Reduce Motion) and closes it, opening a folded section or closed toggle it is
in, as its ▸ does. The headings come from the page's own blocks (`NotesPage.outline`), so a heading typed joins it at once; each heading's line registers itself with the outline
(`NotesLine`, by its block), which finds the one being read and scrolls to one. The rail is hidden while the keyboard is up. A shared deck's Notes (`GuideCard` with `shared`)
have it once they show in full, staying a little under the top of the screen as the page scrolls by; the deck page's Notes tab has none.

**Sources** (`Data/GuideData.swift`, `Screens/DeckMaterials.swift`): the list (name, kind, pages or minutes, cards, date, newest first) and a source opened as a sheet: a recording
plays at the card's time (a long one is kept as several files: the viewer walks their seconds, as the web does, and plays the part that covers the time at the second inside it:
a card from 1:30:00 of thirteen parts of 550 seconds opens part 10 at 7:30), a PDF opens in PDFKit at its page, slides and Word files in Lucida's own document viewer (`Design/DocumentView.swift`: the phone's web engine draws them, Lucida's loading mark shows meanwhile, and plain text and captions are drawn as text; Quick Look is not used, since its bar, share button and spinner are the system's), a video opens its
YouTube link at the time (`&t=90s`), photos full screen, a topic its words, what was said in parts with the one a card pointed at marked. More cards makes more from it, Delete asks
first ("Delete “<name>”? Its file goes, and the 6 cards made from it stay in the deck."). A card the maker made says "Made from <source> · p. 4" in the card editor, which opens that
source at that place (the deck's Sources, viewer open; plain words once the source is deleted). A shared deck's page shows its Guide and "Made from 2 sources" (a number only).

Library data: each deck's `guide` and `sources` and each card's `src` come with `/api/state` and are all optional (`MakeModels.swift`), so an older library still opens. The acts are
`guide.save`, `guide.page.add`, `.rename`, `.delete`, `guide.restore`, `source.delete` (`Store.guide*`); History is `GET /api/guide/history`. The boards: `PhoneGuide` (and Dark, Gray;
`-state Writing|"Block menu"|"Format bar"|"Toggle open"|"Toggle closed"|"Section folded"|"Blank note"|"Reading on a shared deck"|"Older versions"|"A new page"|"Outline open"`;
`PhoneGuideOutline` is the last, the outline's sheet open), `PhoneDeck` (`-state Cards|Notes|Sources` or `-state "Guide and sources"|"Guide pages"|"Long guide"|"A source
open"|"No guide yet"|"Studying (read only)"`; or `-section`, `-guide`, `-sourceOpen <id>`, `-sourceAt "p. 4"`), `PhonePublicDeck` (`-state` is the Guide setting) and `PhoneEditor`
(`-madeFrom no` leaves the line out), with the sample in `Design/GuideSample.swift`. More launch arguments (debug builds): `-open guide[:<deck name>[:<page id>]]` opens the Notes page, and
`-deckTab notes|sources` (with `-deckSource <id>` and `-deckAt "1:30:00"`) asks the open deck page for a section, and a source open at that place (like the web's `?tab=&source=&at=`).

    ios/tools/e2e-guide.sh <simulator id>

starts a fresh server on port 3934 and the stand-in AI on 3939, makes the Sources with the server's own make steps (`ios/tests/js/guide-seed.mjs`: a PDF, a recording of thirteen files, a
video, pictures, text, a topic, under a Guide with sections, toggles and two pages), and runs `LucidaUITests/GuideTests` in fourteen flows (no Guide and the blank note, writing: the
shortcuts, Enter, Backspace, Aa, To-do, Bullets, Bold and a link from the bar; reading and the hostile text, Older versions and Restore, pages, Make cards from the page, the Notes
on the deck page (toggles, folds, a link to a heading, a tap that opens the page there), a deck you only study, the Sources and each viewer, "Made from", More cards and Delete, a
shared deck's page, the Add cards menu and dark mode, a toggle and a section folding, remembered and never saved into the note, and the outline: its rail, its sheet, going to a
heading (in a closed toggle, in a folded section), a heading typed, no rail while writing, and a shared deck's once shown in full). Ports and the simulator: `PORT=3960
STUB_PORT=3969 ios/tools/e2e-guide.sh <simulator id>` runs it beside other servers.

Two things worth knowing when writing flows like these: a tap on a card row right after the page was scrolled is ignored on purpose (`HoldOrTap` fails a touch that lands on a
page that is still moving, like a button's), so `GuideTests.cardRow` brings the row to the middle and lets the page settle first; and a question is Lucida's own sheet (no
system dialog), so a flow answers it with `app.buttons["question.go"]` (or `question.cancel`), and closes it with a touch on the dimmed top of the screen.

## A deck's Diagrams

The deck page's fourth tab, **Sources | Cards | Notes | Diagrams** (`Screens/Diagrams.swift`, `Data/DiagramsData.swift`; the web's `web/diagrams.js` and `web/diagram.js` ported; the canvas's PhoneDeck draws the same
pieces). It is there for the deck's owner, and for anyone when the deck has made diagrams (a deck you only study has the tables and mind maps that came with it, read only; an address
for a tab that isn't there still falls back to Cards). The tab's card has Make diagram and Upload (for the owner) and the diagrams in three groups, two tiles across: **Made** (tables and
mind maps), **From your lectures** (pictures a make found in the slides, PDFs, Word files and photos the cards were made from) and **Uploaded**.

A diagram opens as a sheet (`DiagramViewer`): a picture with a Show boxes switch (a box over each label, drawn from the labels' fractions as a card's boxes are) and the labels as chips; a
table (`DiagramTableView`: headings in small capitals, the first column naming each row, sideways scrolling when it is wider than the phone); a mind map (`DiagramMapView`, laid out by
`Data/DiagramLayout.swift` with the web's numbers, scrolling sideways). Make cards (a picture) asks the server to make the picture a card's own and to say where each label is (an
uploaded picture is read first), then opens the card editor on a new Image card with a box and an answer for each label (`Store.diagrams.takePrepared`, in `EditorSheet.load`). Redo
(made ones), Rename (a field in the viewer) and Delete (asked in the viewer: "Delete “<name>”?" with Keep it and Delete) are the web's, in the same words. **Make diagram** is a sheet
(`MakeDiagramSheet`): Table or Mind map, from everything or one tag or one source, "Writing your table" with a calm bar and Cancel while it is made, and what went wrong in plain words
with Back, Go Pro (a limit) or Try again. **Upload** asks Photo library or Files in a sheet of Lucida's own (`PickRequest`), and the phone's picker for that place comes after; the
picture is made at most 2400 pixels across as a JPEG (a HEIC photo too) and goes up like a file for making cards, then `POST api/diagrams/keep`.

Nothing here is the phone's own dialog, alert, menu or picker of choices: a question sits in the viewer, a problem is a line in the sheet or the viewer, and the choices are Lucida's own
buttons (the Photos and Files pickers themselves are the phone's way to choose a file, as everywhere else in the app). The Make flow has the **Image** kind (`MakeOpts.image`, offered by
`MakeFlow.canImage`; the `see` phase after the writing; the review's picture cards with their thumbnails and "3 diagrams found. They are kept in the deck's Diagrams tab."), a shared deck's
page shows its tables and mind maps (`PublicDiagramsCard`, a read-only sheet) and never its owner's pictures.

Library data: each deck's `diagrams` come with `/api/state` and are optional (`MakeModels.swift`), as a shared deck's `guide.diagrams`. The boards: `PhoneDeck` (`-state Diagrams|"Diagrams (none yet)"|
"A picture open"|"An uploaded picture open"|"A table open"|"A mind map open"|"Renaming a diagram"|"Delete asked"|"Uploading a picture"|"Upload didn’t work"|"Make diagram"|"Making a diagram"|
"Make diagram (it didn’t work)"|"Diagrams (studying)"`, with `-scrollTo tabs` to start the page at its tabs), `PhonePublicDeck` (`-state "A table open"|"A mind map open"`) and `PhoneMake`
(`-state "Upload (picture cards on)"|"Review (picture cards)"`), with the sample in `Design/DiagramSample.swift` (three small drawings in `Resources/demo-*.png`). Debug builds also take
`-diagramUpload <picture>` (sends a picture as an Upload would, on the open deck) beside `-deckTab diagrams`.

    ios/tests/diagram-check.sh
    ios/tools/e2e-diagrams.sh <simulator id>

The first lays out mind maps of every shape in node and in Swift and compares every box and link (no simulator). The second starts a fresh server on port 3908 and the stand-in AI on 3909 (it needs
the Diagrams answers: `STUB_AI=<stub-ai.mjs>`), makes seven owners with their lectures, tables, maps and uploads, a shared deck and someone who studies it (`ios/tests/js/diagrams-seed.mjs`),
and runs `LucidaUITests/DiagramsTests` in nine flows (the tab, a picture and Make cards, Rename and Delete, Make diagram, the Free limit, Upload, the Image kind, a shared and a studied deck, dark mode).


## Classes (taken out)

The owner took Classes out of the app on 2026-10-02 ("remove the 'classes' page everywhere, because i dont think we need that right now, its a
social thing"): no Classes in the Library's switch, no Assigned, no class pages or sheets, and `-open classes` and `-open class:<CODE>` are gone. A
deck that was only in a class is Private in Deck settings › Sharing. The server keeps its classes and `web/classes.mjs`'s endpoints for the builds
already on TestFlight; verification and reports (`Data/VerifyData.swift`) stay. HomeTests' fifth flow checks that a class still on the server
shows nothing.

## Themes

Pro's 14 themes (Settings › Theme; Lucida's own look is for everyone) are drawn by the web app's own theme code, not ported: an
offscreen web view (`Design/ThemeRender.swift`, its page `Resources/ThemePage.html`) loads `/themes/load.js`, `kit.js` and the
theme's module from the app's server, has the theme draw one piece (a study background, a card's face, a deck's cover, a deck's
name, a profile picture, a Settings tile) and the app takes a picture of it. `Design/ThemeArt.swift` keeps the pictures (memory
and `Caches/lucida-themes`, keyed by theme, piece, size, and a fingerprint of the theme's code, so a change on the web paints
again) and asks for the ones a screen needs; until one is kept a screen shows Lucida's own look, and a theme in use is warmed
up at launch. The words on a card stay the app's own, set in the theme's type: `Design/ThemeFonts.swift` asks Google Fonts for
the families the theme names (as the web page does) and registers them; nothing ships with the app. What the theme says about
its card (padding, ink, weight, spacing, ...) is read from the theme's own styles (`ThemeFace.swift`).

A theme changes only the flashcard, the study background (Review and Learn), deck covers (Library thumbnails and folder fans, the
deck page's header, Deck settings' header, New deck's preview) and your picture (the tab bar, Settings, your profile). Free never draws
one, whatever the library says. Boards: `PhoneThemePicker`, `PhoneThemePickerFree`, `PhoneTheme` (`-sheet <key>` for another
theme) and, for each theme, `Theme<Board>ReviewPhone` and `Theme<Board>ProfilePhone`; `-theme <key>` puts any board in a theme.

More launch arguments (debug builds): `-open themes` (Settings › Theme), `-open theme:<key>`, `-open newdeck`, `-open learnq` (a Learn
question); `-themeProbe <key> -probeOut <folder>` paints a few pieces of a theme and saves them; `-themePage <file>` loads another
copy of the painter's page. `tools/e2e-themes.sh <simulator id>` is the end-to-end test (`LucidaUITests/ThemesTests.swift`): a
Pro person picks a theme and sees its card, background, covers and picture, a dark theme, back to Lucida; a Free person can't
pick one, and one whose Pro lapsed never draws it. The app tells the test what it draws through an invisible element
(`ThemeAudit`, debug builds only).


## Settings

Settings is one native list, its rows grouped into seven sections with the same names, in the same order, as the web's Settings page: Account (your profile, Edit
profile, Get verified, Profile picture, Password, Delete account), Plan, Studying (Daily reminder, New cards a day, Schedule with FSRS, Flip
animation, Tune to you), Appearance (Appearance, Dark mode, Theme, Card gradients), Connect AI (Connect AI, Check AI cards first, Cards to check), Privacy
(Blocked people) and Help & legal (Help, Terms of Service, Privacy Policy, which open lucida.cards in the browser). The board is `PhoneSettings` (its `section`
Tweak is `All`; the web app's narrow screens use its `List` and section states).

## For the App Store

What App Review asks of an app like this one is inside the app, drawn from boards like every other screen.

**Go Pro** (`Screens/GoPro.swift`, `Data/Purchases.swift`; boards `PhoneGoPro` and `PhoneGoProSoon`, and Settings' plan in `PhoneSettings`
with `-plan "Pro, billed by Apple"` or `"Pro, billed on the web"`). Pro is bought with StoreKit 2: `cards.lucida.pro.monthly` and
`cards.lucida.pro.yearly`, with the pricing page's Pro list less natural voices, which only the web has (`PLAN_PRO_PHONE` in design/site.mjs; the web's list is `PLAN_PRO`), Terms and Privacy, and Restore purchases. Every price on screen is the App
Store's own (`displayPrice`, and the yearly price divided by twelve for "That's $4.17 a month", worked out in its currency); nothing is
typed in the app. Buying uses the person's id as the purchase's `appAccountToken` (`me.appAccountToken`), the signed transaction goes to
`POST /api/iap`, and `Transaction.updates` sends renewals and purchases made elsewhere the same way. Pro itself comes back from the server
(`me.plan`), as on the web, and a purchase is finished only after the server has it. With no products on the App Store yet (they aren't
approved, or aren't set up) the sheet says "Pro isn't available on iPhone yet". Pro bought on the web says "Billed on the web" and has
nothing to press (the app never opens Stripe: `ios/tools/e2e-store.sh` greps for it). Every Go Pro (Settings, Stats' weak spots, Themes,
Deck settings, Explain) opens this one sheet. `-open gopro` opens it over the page you're on.

**Testing it.** `Lucida/Lucida.storekit` has both products. The `Lucida` scheme uses it for runs from Xcode. The UI tests can't use the scheme's
file (Xcode doesn't hand it to an app a test launches), so a Debug build in the simulator starts its own StoreKit test session when asked
(`-storekit <file>`, `-storekitReset`, `-storekitBuy <product id>`: `App/StoreKitTesting.swift`; it needs the `get-task-allow` entitlement in
`LucidaDebug.entitlements`, and the test hands the app its `DYLD_FRAMEWORK_PATH`). Nothing of this exists in a Release build or on a device.
The test store signs purchases with its own self-signed certificate (`environment: "Xcode"`), which `web/apple.mjs` takes only on a computer
told `LUCIDA_APPLE_TEST_XCODE=1` and never online. `ios/tools/e2e-store.sh <simulator id>` is the end-to-end test
(`LucidaUITests/StoreTests`): buying monthly turns Pro on through the local server (Settings says Billed by Apple, with Manage plan), Restore
purchases, Pro bought on the web, no products, and every Go Pro. `ios/tests/run.sh xcode` tests the server's side of the test store.

**Delete account, Block, password, and the apps you allowed** (`Screens/AccountSheets.swift`, `Data/AccountData.swift`, Settings' Account and Privacy groups,
Profile's ⋯, Suggestions, SignIn, Connect; boards `PhoneSettingsDelete`, `PhoneProfileBlock`, `PhoneProfileBlocked`, the Account and Privacy groups of
`PhoneSettings`, `PhoneSignIn` with `-passwordMode`, and `PhoneConnect`). Delete account asks first, then the server removes the library, the
profile, the shared decks and the sign-in itself, and the app goes back to the sign-in screen (for Apple billing the question says to stop it in
iPhone Settings). Block is on a profile's ⋯ and on a suggestion; Settings › Privacy › Blocked people lists them with Unblock. Settings ›
Account › Password sets one, and the sign-in screen has "Use a password" (App Review can't get an email code). Connect AI lists the apps you
allowed, each with Disconnect. `ios/tools/e2e-account.sh <simulator id>` is the end-to-end test (`LucidaUITests/AccountTests`); it starts the
server and, in front of it, `ios/tools/password-proxy.mjs`, which asks for a sign-in when nobody is signed in and takes passwords, as the real
server does online and a copy on a computer can't. A debug build can open any of these states on a board (`-deleteOpen Asking|Deleting|Failed`,
`-passwordOpen`, `-noBlocks`, `-noApps`, `-moreOpen`, `-blockOpen`, `-blocked`).

**Daily reminder** (`Data/Reminder.swift`; the row in Settings › Studying, board `PhoneSettings` with its `reminder` and `reminderNote` Tweaks, or `-reminder Off|"6:00 PM"`
and `-reminderNote` on a design screen). Off, or a time. Picking a time turns it on and the phone is asked then, never when the app opens, to
send notifications; it then schedules one local notification a day at that time (UNUserNotificationCenter), "Time to review your cards". Another
time sets it again, Off removes it, and signing out removes it. If notifications are refused the row stays Off and says how to allow them in
iPhone Settings. The row says what the phone has scheduled (not a saved setting), so it is always what will happen; the time is also kept with
the settings. Local notifications need no entitlement, no Info.plist text and no privacy declaration. `ios/tools/e2e-reminder.sh <simulator id>`
is the end-to-end test (`LucidaUITests/ReminderTests`, reading what is scheduled through `-reminderAudit`); it takes the app off the simulator before
each flow so the phone has never been asked. Tapping the notice opens the Library (`ReminderTap`, the notification center's delegate, set as the app starts,
so a cold start counts too); the third flow lets a real notice come (`-reminderIn <seconds>`, debug builds) and taps it on the home screen.

**Flip animation** (Settings › Studying, `settings.flip`, on unless turned off; `Store.flipOn`, `Design/Theme.swift` `\.flipsOn`; boards `PhoneSettings` and `WebSettings`
with their switch, `-flip Off` on a design screen). Off, the card's other side just appears in Review and Cards to check: no 3D turn, no blank's pop,
no note or box fade (and the welcome's card doesn't turn between steps). It is one of the person's study settings on the server, so the web app and every
phone follow the same choice; the web app's Review reads it the same way (`flipTrans` in the Review boards). Reduce Motion changes nothing about it.
Review settings (the review's sheet, `PhoneReviewSettings`) has the same switch (the owner, 2026-10-02: "add a way for user to toggle flaschard flip animation on or off").
`ios/tools/e2e-flip.sh <simulator id>` is the end-to-end test (`LucidaUITests/FlipTests`, reading what the card does through `-flipAudit`'s invisible element, checking the seven sections, and the review sheet's switch).

**Sign in with Apple** sends the token Apple made for this app (audience `cards.lucida.app`) and its nonce to `/api/auth/token`; the server
forwards both to Supabase, which accepts the audiences in the Apple provider's "Client IDs". That list already holds both the app's and the
web's (`cards.lucida.web,cards.lucida.app`, read in the Supabase dashboard on 2026-10-01), so nothing is left to set there. `ios/tests/run.sh
signin` shows the server's part against a pretend Supabase.

**The listing and the screenshots** are in `AppStore/`: `listing.md` (name, subtitle, description, keywords, URLs, the two subscriptions, App
Review notes, App Privacy answers) and `screenshots/` (1320 x 2868, made by `AppStore/screenshots.sh`). `Lucida/PrivacyInfo.xcprivacy` declares
what the app keeps: email, name, user id, photos, audio, other content, and purchase history, none of it for tracking.
## Schools

Discover has Level, Subject, and School filters (a pill each; a sheet of choices, and for School a search of the bundled list as you type), "Popular at <your school>" as its first row when you set one, and Clear. Edit profile has Level, School (a search; None; or what you typed as "Other"), Year, and the switch "Show my school on my profile" (off to start with; a high school student has no School row); a public deck's Sharing settings have Labels (Level, Subject, School). The list is `Resources/schools.json` (`web/schools.json`: the US Department of Education's IPEDS list of 4,049 colleges and universities, no high schools), searched by `Data/Schools.swift` with the web app's rules (`ios/tests/schools.sh` asks both the same 432 questions); the levels, years, and subjects are in `Generated.swift`. The sheets are one view (`Design/PickSheet.swift`, opened through `nav.picker`). Boards: `PhoneDiscover` (a board's `-level College`, `-subject Biology`, `-school "University of California-Davis"`, `-pick Level|Subject|School` with `-pickQ davis`, and `-mySchool false`), `PhoneProfileEdit` and `PhoneDeckSettingsShare` (`-pick`). `ios/tools/e2e-school.sh <simulator id>` starts a server on port 3955 and runs `LucidaUITests/SchoolTests`: Edit profile, a deck's labels, and Discover's filters.

## Lucida's own UI (nothing the phone draws itself)

The owner, 2026-10-01: "i dont want anything that has ios or google default ui". Every button, action, menu, dialog, picker, message and loading state is Lucida's
own, with the app's themes and the motion of `Generated.motion`; the same things the web app and the canvas show (`design/ui.mjs`, README.md). `node design/check-own-ui.mjs`
fails on a system `.alert`, `.confirmationDialog`, `Menu`, `Picker`, `DatePicker`, `Stepper`, `ProgressView`, `Toggle`, toolbar item, `UIImagePickerController`, `.refreshable`,
`.contextMenu` or `.popover` in `ios/Lucida`.

- **A question** (`nav.ask(title, line:, action:, danger:) { … }`, `Design/Question.swift`): a sheet from the bottom over the dimmed page, with a grabber, a title, at most one short
  line, Cancel (`question.cancel`) and the answer (`question.go`; red when it deletes). A tap on the dimmed part is Cancel. It asks for Delete deck / Remove from library (Deck settings),
  Remove folder, Delete card (the editor), Delete source (a source's page), Delete page (the Guide's editor), Disconnect (Connect AI), and Sign out
  (Settings' account card). The words are the web's (`AskSample` has the canvas's, for `-ask "Delete deck"` on a design screen).
- **A message** (`ToastHost`, in `RootView`): `store.error` (a save that failed, a picture that couldn't be used) is a quiet pill near the bottom for about five seconds, or until it is
  tapped; VoiceOver says it when it comes. It replaces the system alert.
- **Lists** open Lucida's list sheet (`Design/PickSheet.swift`, `nav.picker`): Settings' New cards a day and Daily reminder, and the language of made cards in Make cards.
  `-dropdown "Daily reminder"` (or `"New cards a day"`) opens one on Settings' design screen; `-board PhoneMake -state "Paste (language list)"` the language list.
- **A calendar** (`Design/CalendarPicker.swift`, `nav.openCalendar`): a deck's exam date opens a small popover under the button, like the web's: the month and its arrows, the
  days (today ringed, the day picked filled, days before today dimmed), a tap on a day picks it and closes it. `-calendar "Exam date"` (Deck settings → Studying).
- **The recording's player** (`SourcePlayerView`): a round Play and Pause button, the time, a thin track to touch or drag (and VoiceOver's adjust), the length, and a speed button (1×, 1.25×, 1.5×, 2×, .75×).
  A photo's page has Lucida's dots; **the loading mark** (`Design/Loading.swift`, three dots rising one after another, still with Reduce Motion) replaces the system spinner.
- **The camera** (`Screens/Camera.swift`, `nav.openCamera`): Take a photo in Make cards opens a full screen over everything with the camera's picture (AVFoundation), a close button, the flash (Off, Auto,
  On), the switch between the cameras and the shutter, then Retake and Use photo; a phone with no camera, or one told no, says so in a few plain words (the phone asks for the camera once, in its own question).
  The simulator has no camera: `-fakeCamera` gives it a picture to take, and `-board PhoneMake -state Camera` shows the screen.
- **Task boxes** in a Guide are Lucida's own check (`GuideCheckbox`), like the web's `.gd-box`. No system navigation bar shows on any page.
- `ios/tools/e2e-ownui.sh [simulator id]` is the end-to-end test (`LucidaUITests/OwnUITests.swift`, a fresh server on port 3993 and `ios/tools/fail-proxy.mjs` on 3995, which fails every save while a file exists): the
  questions (Remove folder, Delete deck, Delete card, Sign out), the lists, the calendar, the camera, the message, and no system navigation bar, toolbar, alert, sheet, date picker, wheel or menu on any page.
- **A keyboard still up** is put away when a question, a calendar, a list without a search of its own or the camera opens (`Keyboard.hide()`): Lucida's sheets are not above the keyboard the way a system alert is.
- **What stays**: the permission questions, Sign in with Apple's sheet and Google's account window, the App Store's purchase sheet, the keyboard and the text editing menu, the Files picker and Apple's photo
  library picker, and the share sheet.

## Motion, swiping, haptics and sharing

The owner's first TestFlight notes (2026-10-01), end to end in `LucidaUITests/PolishTests.swift`; `ios/tools/e2e-polish.sh <simulator id>`
runs it on a fresh server on port 3914 (`ONLY=PolishTests/test4SwipeToChangePages` runs one flow, `SHOTS=<folder>` saves a picture
when a check fails) and then lists every haptic in the app.

- **No profile picture on the first page** (the Library; the Profile tab is the way to your profile).
- **Remove from folder**, not "No folder": a deck's ⋯ menu in the Library and Deck settings' Folder chips offer it only for a deck that is
  in a folder, first, above the folders. Making a copy of someone's deck starts in "Library" (the top level).
- **Share opens the phone's share sheet** (`ShareSheet.present`, `Design/PageViews.swift`): Share profile (both buttons), a deck's Share link,
  and a shared deck's share button. Connect AI's link is for pasting into another app, so it still copies.
- **Swiping** (`Design/Swipe.swift`): from the left edge goes back on every pushed page (`BackSwipe`: the pages hide the navigation bar,
  which turns UIKit's own swipe off; this turns it back on, and still isn't allowed while something is over the page or a page is
  moving), and a swipe on a tab's first page moves to the next tab or the one before (`TabPager`: the page follows the finger and
  settles without a bounce; the tab bar follows). A row of decks or chips that scrolls sideways keeps its own swipe; study cards and
  Learn are full screens, so a swipe there does nothing to the tabs; at either end the swipe is still taken (so it can't tap the row
  it lifts off) but nothing moves.
- **Haptics** (`Design/Haptics.swift`, iOS 17's `.sensoryFeedback`, which follows the phone's own setting): selection for a tab, a
  segmented control, a switch and a picked answer or option; light for flipping a card, a grade button, and adding or removing
  something; success for a right answer in Learn mode and a deck made; warning for a wrong answer and confirming a delete. Plain links
  and rows give none. Each is one `.haptic(kind, on: trigger, "why")`, so `grep "\.haptic("` lists them; a debug build started with
  `-hapticAudit` writes each one that fires into an invisible element (`hapticAudit`) that the test reads.
- **Motion** (`Design/Motion.swift`, timings from `design/motion.mjs` through `Generated.motion`, the same ones the web's CSS uses):
  menus, pop-ups, toasts, sheets and full screens slide in 10 points while they fade (220 to 250 ms, one ease-out curve, no bounce),
  go away a little faster, and a switch's knob and a segmented control's or the tab bar's pill slide to the new choice. Reduce
  Motion turns the slides off (debug builds also take `-still 1`).
- **Explain opens under the card** (`Screens/Review.swift`, `Screens/Learn.swift`, `Screens/Explain.swift`): once a flashcard is turned over (or a Learn
  question answered), Explain offers the AI's explanation of the answer. On a flashcard it opens UNDER the card, never over it: the card gets a
  little shorter (60% of the room, at least 250 pt; a theme's face is drawn for that height too, `ThemeLayout.reviewCardOpen`) and the explanation
  takes what is left, scrolling inside itself when it is longer. In Learn mode it opens under the answers and the line that says why, and comes into
  view without sliding. A short fade, none with Reduce Motion. (The web app does the same on a phone; on a computer it opens beside the card.) On a
  flashcard its button is round, in the top bar just left of Review settings and the same size (the owner, 2026-10-02: "move it upper right similar
  shape to the flashcard settings"): it shows once the card is turned over (its place is kept meanwhile, so the progress bar doesn't move), is
  pressed while the explanation is open, and closes it when pressed again. Learn mode has the same round button, just after its gear (`Screens/Learn.swift`);
  the practice test's results keep the small `ExplainButton` on each question.
- **The study screen** (the owner's comments, 2026-10-02): behind flashcards and Learn mode a deck shows a plain page (white, black at night) until a
  background is picked for it (`Store.bgKind` in `Design/StudyBackground.swift`, like the web's `bgKindOf`: the server marks a pick `bg.chosen`,
  `DeckBg.chosen`, since every deck is made with kind "deck"); with a theme on the default is the theme's own, and its tile in `BgChooser` puts a deck
  back to the default. The boxes over a picture are yellow (`Generated.occ`, from design/build.mjs `OCC`: #FFD60A with black numbers) in review, Cards to
  check, Learn, the practice test and the card editor (`Design/Occlusion.swift`); the asked box has an edge in the outline color, which stays when its
  yellow fades. The boxes that only mark where a card's boxes go (Make's picture-card thumbnails, a diagram's Show boxes) are see-through yellow with a black
  edge. PolishTests' ninth flow reads the yellow from screenshots.
- **The deck cover's parallax** (`Design/Parallax.swift`): scrolling up, the cover on a deck's page and on a shared deck's page moves at
  half the page's speed; pulled down it stretches. Reduce Motion keeps it still. `-parallaxAudit` writes the numbers the test reads.

`-popAudit` (debug builds) writes what the edge swipe decided into an invisible element, for the swipe test.

`ios/tools/e2e-polish.sh` also starts `ios/tools/explain-stub.mjs` (on `AIPORT`, 3916), a stand-in for the AI that writes explanations, and tells the
server about it (`OPENROUTER_API_KEY`, `OPENROUTER_BASE`), so flows 7 and 8 can ask for explanations: a card whose front says FAILAI makes the AI fail.
