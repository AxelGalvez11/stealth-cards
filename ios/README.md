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
`free` is on the Free plan; the app remembers who, and `-dev none` forgets it, so the server's own person is back);
`-check pause|exam|grade|learn|tune|free` runs an end-to-end check against the server and quits (`App/DebugChecks.swift`);
`-scroll <points>` opens a page scrolled that far.

`tests/run.sh parity` checks the ports against the web app's own code on a seeded library and made-up variations of it (no
simulator), and `tests/run.sh e2e` runs the `-check`s in the simulator against a local server (`DEVICE=<simulator id>`).

## Report, Check this deck, and Get verified

Apple's rule for apps where people share things (guideline 1.2) wants a way to report content, and the web app has one: a
quiet **Report** on someone else's shared deck (on its cover, after the bell), on someone else's profile (after Share), and
on a suggestion once it's opened (a person's; not the cards your own AI made). Each opens the Report sheet the classes already
had (`Screens/ClassSheets.swift`: four reasons, a line that Other needs, Send, then "Thanks. We'll take a look."), and the
server's own words when it says no (`web/classes.mjs` sendReport: "It's your deck.", "You have 10 reports waiting.", ...) show
in the sheet. A verified teacher or school (Settings → Profile → **Get verified**, approved by the made-up person `admin` on
a copy of the server) sees **Check this deck** under a shared deck's buttons, on a deck someone else owns whose check isn't
current; it then says "Checked by you" until the owner changes the deck, and the button comes back. Settings says **Verified
teacher** (or school) with the check. News says when you're verified and when a deck of yours was hidden after a report (with
Lucida's mark), and a helper's News row for a suggestion on a community deck opens Suggestions (every deck you own or help
with, like the web's /suggestions). The boards: `PhonePublicDeckReport`, `PhonePublicDeckCheck`, `PhoneProfileReport`,
`PhoneSuggestionsReport`, and `PhoneSettingsVerified` (a board's `-verified "Waiting for review"|Teacher|School` shows the
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

## Classes and schools

The Library's third view (Decks · All cards · Classes): your classes as tiles, Join a class with its 6-letter code, New
class, and a class's own page: as its owner or a helper (assignments with how many who share are done, each member's
progress, "Not shared" for the rest, decks, invite, Get verified, people, Rename, Delete), as a member (what's left for you
on each assignment, whether you share your progress, Leave), or as an invite you haven't taken (Join). Add a deck, Assign
(a deck, a goal, a date), Report, and Get verified are sheets. Today lists what your classes assigned you. The answers
come from the same server as the web app's (`Data/ClassData.swift`, like `web/classes.mjs` and `web/net.js`); your own
progress on a class deck is worked out here from your own cards (a port of `web/progress.js`) and sent to a class only if
you turned sharing on. Universal links aren't set up, so the way into a class is Join with its code; Copy invite link and
Share to Google Classroom share the web app's link. The boards: `PhoneClasses` (and `Dark`, `Empty`, `New`, `Join`),
`PhoneClass` (and `Dark`, `Gray`, `Member`, `New`, `Invite`, `Loading`, `Missing`, `AddDeck`, `Assign`, `Report`, `Verify`), and
`PhoneTodayClass`.

Against a copy of the server, `-open classes` opens Library → Classes and `-open class:<CODE>` opens one class's page
(an invite, if you aren't in it). The whole thing is tested end to end by tapping through the app as five made-up people
(a teacher makes a class, adds and assigns a deck; two students join, one shares progress and one doesn't; they study; Today
lists the assignment; a report; Get verified, approved by the made-up person `admin`; helpers, leaving, taking someone out,
deleting the class; a code no class has):

    ios/tools/e2e-classes.sh <simulator id>

It starts a fresh server on port 3733 and runs `LucidaUITests/ClassesTests` (which only runs when that script asks for it,
so `ios/tools/e2e.sh` keeps running the study network's checks alone).

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
deck page's header, Deck settings' header, New deck's preview) and your picture (Today, Settings, your profile). Free never draws
one, whatever the library says. Boards: `PhoneThemePicker`, `PhoneThemePickerFree`, `PhoneTheme` (`-sheet <key>` for another
theme) and, for each theme, `Theme<Board>ReviewPhone` and `Theme<Board>ProfilePhone`; `-theme <key>` puts any board in a theme.

More launch arguments (debug builds): `-open themes` (Settings › Theme), `-open theme:<key>`, `-open newdeck`, `-open learnq` (a Learn
question); `-themeProbe <key> -probeOut <folder>` paints a few pieces of a theme and saves them; `-themePage <file>` loads another
copy of the painter's page. `tools/e2e-themes.sh <simulator id>` is the end-to-end test (`LucidaUITests/ThemesTests.swift`): a
Pro person picks a theme and sees its card, background, covers and picture, a dark theme, back to Lucida; a Free person can't
pick one, and one whose Pro lapsed never draws it. The app tells the test what it draws through an invisible element
(`ThemeAudit`, debug builds only).

