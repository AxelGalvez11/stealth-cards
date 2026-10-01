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

`-open` goes straight to `deck`, `review`, `stats`, `connect` (Settings › Connect AI), `settings`, `learn`, `library`, or
`cards` (the Library's All cards). Give that server `OPENROUTER_API_KEY` (and `OPENROUTER_BASE` pointing at a stand-in, for testing) to try Explain.

## The study network

The tab bar is Today, Library, Discover, Stats, and Profile (your own picture is its icon). Connect AI is a page inside Settings
(its row there, a back button, no tab bar; `Nav.openConnect()` opens it from the empty states and Today's start tile).
Discover (its own tab), profiles (yours is the Profile tab, which your picture on Today opens too, and its gear opens Settings;
anyone's, from their name, is a page that lights no tab),
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


## Settings

Settings is one native list, its rows grouped into seven sections with the same names, in the same order, as the web's Settings page: Account (your profile, Edit
profile, Get verified, Profile picture, Password, Delete account), Plan, Studying (Daily reminder, New cards a day, Remember goal, Schedule with FSRS, Flip
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
each flow so the phone has never been asked.

**Flip animation** (Settings › Studying, `settings.flip`, on unless turned off; `Store.flipOn`, `Design/Theme.swift` `\.flipsOn`; boards `PhoneSettings` and `WebSettings`
with their switch, `-flip Off` on a design screen). Off, the card's other side just appears in Review and Cards to check: no 3D turn, no blank's pop,
no note or box fade (and the welcome's card doesn't turn between steps). It is one of the person's study settings on the server, so the web app and every
phone follow the same choice; the web app's Review reads it the same way (`flipTrans` in the Review boards). Reduce Motion changes nothing about it.
`ios/tools/e2e-flip.sh <simulator id>` is the end-to-end test (`LucidaUITests/FlipTests`, reading what the card does through `-flipAudit`'s invisible element, and checking the seven sections).

**Sign in with Apple** sends the token Apple made for this app (audience `cards.lucida.app`) and its nonce to `/api/auth/token`; the server
forwards both to Supabase, which accepts the audiences in the Apple provider's "Client IDs". That list already holds both the app's and the
web's (`cards.lucida.web,cards.lucida.app`, read in the Supabase dashboard on 2026-10-01), so nothing is left to set there. `ios/tests/run.sh
signin` shows the server's part against a pretend Supabase.

**The listing and the screenshots** are in `AppStore/`: `listing.md` (name, subtitle, description, keywords, URLs, the two subscriptions, App
Review notes, App Privacy answers) and `screenshots/` (1320 x 2868, made by `AppStore/screenshots.sh`). `Lucida/PrivacyInfo.xcprivacy` declares
what the app keeps: email, name, user id, photos, audio, other content, and purchase history, none of it for tracking.
