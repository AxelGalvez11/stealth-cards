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

    xcrun simctl launch booted cards.lucida.app -board PhoneToday

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

`-open` goes straight to `deck`, `review`, `stats`, `connect`, `settings`, `learn`, `library`, or `cards` (the Library's All
cards). Give that server `OPENROUTER_API_KEY` (and `OPENROUTER_BASE` pointing at a stand-in, for testing) to try Explain.

## Pro study tools

The scheduling rules are ports of the web app's: `Data/FSRS.swift` (with a person's tuned parameters), `Sched.swift` (paused
cards, exam dates, cards you keep forgetting, what a goal costs), `Tune.swift` (Tune to you: the same fit as web/tune.js),
and `Insights.swift` (Stats' Memory, Weak spots, and Pace). `Screens/StudyPlan.swift` is Deck settings → Studying's Pro
part, `StatsDeep.swift` the deep tabs, `TuneRow.swift` Settings' Tune to you. Boards: `PhoneDeckSettingsStudy`,
`PhoneDeckSettingsGoal`, `PhoneDeckSettingsStudyFree`, `PhoneStatsMemory`, `PhoneStatsWeak`, `PhoneStatsPace`,
`PhoneStatsUpgrade`, `PhoneLibraryLeeches`, `PhoneEditorPaused`, `PhoneSettingsFree` (a board's `-tune Off|"Not enough
reviews"|Tuning` shows the other states of Tune to you).

More launch arguments (debug builds): `-open statsdeep -tab Memory` (or `Weak spots`, `Pace`) opens Stats on that tab;
`-dev <name>` signs in as a made-up person on a local test server (like the web's /dev/as/<name>; a name that starts with
`free` is on the Free plan); `-check pause|exam|grade|learn|tune|free` runs an end-to-end check against the server and quits
(`App/DebugChecks.swift`); `-scroll <points>` opens a page scrolled that far.

`tests/run.sh parity` checks the ports against the web app's own code on a seeded library and made-up variations of it (no
simulator), and `tests/run.sh e2e` runs the `-check`s in the simulator against a local server (`DEVICE=<simulator id>`).

