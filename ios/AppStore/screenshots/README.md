# Screenshots for the App Store (6.9-inch, 1320 x 2868)

Real screens of the app with its sample data (the debug build's `-board` mode, nothing saved), on an iPhone 17 Pro Max simulator with
the status bar at 9:41, full signal and a full battery. No text is put on top of them. Upload them in this order:

| File | Board | What it shows |
| --- | --- | --- |
| `1-library.png` | `PhoneLibrary` | The Library, the first page: folders and decks, each with its cards due |
| `2-study.png` | `PhoneReviewFour` | Studying a card, with Forgot, Hard, Good and Easy and when each brings it back |
| `3-learn.png` | `PhoneQuizAnswered` | Learn mode: a multiple-choice question, what was right, and why |
| `4-deck.png` | `PhoneDeck` | A deck: Flashcards (with what's due) and Learn, its tabs (Sources, Cards, Notes, Diagrams) and its cards |
| `5-stats.png` | `PhoneStatsMemory` | Stats: how much you remember, week by week and by tag (Pro) |
| `6-discover.png` | `PhoneDiscover` | Discover: decks other people shared |
| `7-shared-deck.png` | `PhonePublicDeck` | A shared deck: Study, Copy, Save, and the people who work on it |
| `8-go-pro.png` | `PhoneGoPro` | Go Pro: monthly or yearly, what Pro adds, Restore purchases (also the review picture for the subscriptions) |

The prices on `8-go-pro.png` are the design's sample ($49.99 a year, $5.99 a month), which are what the owner sets in App Store Connect; the
app itself always shows the App Store's own.

To make them again, from the repo's top folder: `ios/AppStore/screenshots.sh [simulator id]`. It builds the debug app, starts an iPhone
Pro Max simulator, opens each board, and checks that each picture is 1320 x 2868. Change a picture by changing its line in `SHOTS` in the
script (a board's name; add `Dark` or `Gray` to its end for dark mode's looks). Don't use the theme boards (`PhoneTheme...`) without
`-server <a copy of the server on this computer>`: they draw with the web app's own theme code, which the app fetches from its server.
