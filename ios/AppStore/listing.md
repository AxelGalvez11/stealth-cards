# Lucida on the App Store: the listing

Everything App Store Connect asks for in words, ready to paste. The limits are Apple's; each count is checked in the lines below.
Plain words, true to what the app does, and no "AI generated" labels anywhere.

## Name and short lines

| Field | Text | Limit |
| --- | --- | --- |
| Name | `Lucida Flashcards` | 30 (17) |
| Subtitle | `Flashcards your AI can make` | 30 (27) |
| Promotional text | `Ask your AI to turn a lecture into flashcards. Lucida plans every review, so each card comes back right before you’d forget it. Free to start.` | 170 (142) |
| Keywords | `study,spaced repetition,quiz,exam,memorize,learn,decks,fsrs,college,vocabulary,school,test prep` | 100 (95) |
| Support URL | https://lucida.cards/faq | |
| Privacy Policy URL | https://lucida.cards/privacy | |
| Marketing URL | https://lucida.cards | |
| Terms of Use (EULA) | https://lucida.cards/terms (it is also in the description, which Apple wants for subscriptions) | |
| Category | Education (primary), Productivity (secondary) | |
| What's New (1.0) | `The first Lucida for iPhone.` | 4000 |

The keywords leave out the words already in the name and subtitle (flashcards, AI, make), because Apple counts those anyway, and
leave out other apps' and exams' names.

## Description

(Under 4000 characters, 1768 used. Paste as it is; the capital-letter lines are plain text headings.)

```
Lucida is a flashcard app that remembers for you.

Make cards the way you like. Type them, bring them in from a spreadsheet or an Anki export, or ask your AI. Connect Claude, ChatGPT, Cursor or any app that speaks MCP, and it can add cards, make quizzes and put them in your decks.

Lucida plans every review with FSRS, a spaced repetition method. Cards you forget come back sooner. Cards you know come back later. A few minutes a day is enough.

LEARN MODE
Quiz yourself with multiple choice, true or false, and fill in the blank.

SEE HOW YOU'RE DOING
Your streak, how much you remember, the days you studied, and the cards due each day ahead.

SHARE DECKS
Share a deck with a link or with everyone. Find decks other people made, follow them, study them or copy them. Suggest a change to a deck you study, and take or skip the changes people suggest to yours.

CLASSES
Teachers make a class, add decks, assign them and see who is done. Students join with a code.

LUCIDA PRO
Lucida is free: unlimited decks and cards, Learn mode and sharing. Pro adds exam dates, stats on what you're weak at, the hardest cards on decks you share, themes for your cards, covers and profile, photo covers and your own colors, unlimited pictures and sounds, and more AI explanations.

Pro is a subscription, monthly or yearly. Payment is charged to your Apple Account when you confirm the purchase. The subscription renews automatically unless you cancel it at least 24 hours before the end of the current period, and your account is charged for renewal within 24 hours before the period ends. Manage or cancel it in Settings on your iPhone: tap your name, then Subscriptions.

No ads. No tracking.

Terms of Use: https://lucida.cards/terms
Privacy Policy: https://lucida.cards/privacy
```

What each line stands on, so nothing here goes further than the app does: cards typed, imported (a spreadsheet, or an Anki export, from the
welcome) or made by an AI app through Connect AI (Claude, ChatGPT, Cursor, any MCP app); FSRS scheduling; Learn mode (multiple choice, true or
false, fill in the blank); Stats; sharing, Discover, following, saving, copying and Suggest a change; classes; the Pro list is the pricing page's
(`PLAN_PRO` in design/site.mjs) less the one line the iPhone app doesn't have yet (natural voices for sound cards; the app reads audio cards
with the phone's own voice). Live games and export are on the web only, so they aren't here. No ads and no tracking: `PrivacyInfo.xcprivacy` says the same.

## The two subscriptions (App Store Connect → Subscriptions)

One group, "Lucida Pro". The app reads the prices from the App Store itself; it never writes one.

| Reference name | Product ID | Duration | Price (US) | Display name | Description |
| --- | --- | --- | --- | --- | --- |
| Lucida Pro Monthly | `cards.lucida.pro.monthly` | 1 month | $5.99 | Lucida Pro, monthly | Exam dates, deeper stats, themes and more |
| Lucida Pro Yearly | `cards.lucida.pro.yearly` | 1 year | $49.99 | Lucida Pro, yearly | Exam dates, deeper stats, themes and more |

The same ids are in `ios/Lucida/Lucida.storekit` (what the tests buy with) and `web/apple.mjs` (what the server accepts). The review
screenshot for each subscription can be `screenshots/` picture 8, the Go Pro sheet.

## App Review notes

(Paste into "Notes" under App Review Information. The two lines marked FILL IN are the owner's: the reviewer account is made on the
real service by the owner, who types its password; nobody else does.)

```
Signing in
Lucida signs in with Apple, Google, an email code, or a password. App Review can't get an email code, so please use the password:
on the sign-in screen tap "Use a password" (under the Email field) and type
  Email:    FILL IN (the reviewer account's email)
  Password: FILL IN (its password)
The account has four small decks of cards in it, so every screen has something on it.

Subscriptions (Pro)
Settings (the gear on the Profile tab) > Plan > Go Pro. Lucida Pro is sold monthly and yearly with in-app purchase; the prices are the App Store's.
"Restore purchases" is at the bottom of that sheet. For someone who has Pro, Settings has "Manage plan" and "Cancel Pro", which open Apple's
subscriptions screen. Pro someone bought on our website says "Billed on the web" and has no buy button in the app.

Delete account
Settings > Account > Delete account. It asks first and says what it removes (the library, the profile, the decks you shared, the sign-in
itself), then signs out and returns to the sign-in screen. For a subscription bought with Apple it says how to stop paying (iPhone Settings > your name > Subscriptions).

Report and Block (user-generated content)
- Report: the Report button on a shared deck's page; on someone's profile, the ... button next to Share > Report; on a suggestion someone
  made to your deck (open it) > Report. Reports go to the Lucida team's review page.
- Block: on someone's profile, ... > Block; on a suggestion, open it > Block. A blocked person can't follow you or suggest changes to your
  decks, nothing from them reaches your News, and you don't see their decks. Settings > Account > Blocked people lists them with Unblock.

Connect AI (optional)
Settings > Connect AI lets people add Lucida to their AI app (Claude, ChatGPT and others) so it can make cards. "Apps you allowed" on that page
lists the apps that signed in, each with Disconnect. Nothing in the app needs it.

Everything else works with the account above. The app needs a network connection. It uses no camera, location or contacts, and does no
tracking. It asks for the microphone only when someone records a sound for a card, and the photos on cards and profiles are only ones
the person picks (with the system's own picker).
```

Check before submitting: the reviewer account is Free (so Go Pro shows), has the four decks of `samples/reviewer-library.txt` (Welcome >
Bring your cards > Anki, or Library), and its password works at "Use a password" on a fresh install.

## App Privacy (the questions App Store Connect asks)

These match `ios/Lucida/PrivacyInfo.xcprivacy`. Nothing is used for tracking and nothing is sold. Everything below is "linked to the
person" and used for "App functionality".

| Data type | Why |
| --- | --- |
| Email address | to sign in |
| Name | the name on your profile and on decks you share |
| User ID | your handle and account id |
| Photos or videos | the pictures a person puts on cards, covers and their profile |
| Audio data | the recordings a person puts on cards |
| Other user content | decks, cards, reviews, suggestions, reports |
| Purchase history | which Lucida Pro someone bought with Apple (the signed purchase goes to Lucida's server, which turns Pro on) |

## Screenshots

6.9-inch (1320 x 2868), real screens with the app's sample data and no text on top, in `screenshots/`. See `screenshots/README.md` for what
each one is and how to make them again.
