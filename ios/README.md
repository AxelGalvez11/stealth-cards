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

## The study network

Discover (its own tab), profiles (yours from your picture on Today, whose gear opens Settings; anyone's from their name),
Edit profile, pins, News (the bell on Today), Settings → Profile, whose each deck is in the Library, and a deck's sharing:
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
