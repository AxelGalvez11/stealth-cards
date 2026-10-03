// Nothing the phone draws itself (the owner, 2026-10-01: "i dont want anything that has ios or google default ui"), end to end in the iPhone app against a
// copy of the server on this Mac with made-up people (the `lc_dev` cookie that the debug-only `-dev <name>` launch argument sets). Each flow makes its own
// people, so any one can run alone (ONLY=OwnUITests/test4Camera ios/tools/e2e-ownui.sh):
//   1  The questions that ask before something is deleted or left are Lucida's own sheet (a title, a line, Cancel and the answer, red when it deletes):
//      Remove folder, Delete deck, Delete card and Sign out; Cancel and a tap outside keep everything; no system alert, confirmation dialog or sheet.
//   2  Settings' lists (New cards a day, Daily reminder) and the language of made cards open Lucida's list sheet: no system menu, a pick saves.
//   3  A deck's exam date opens Lucida's calendar (no system date picker): a day is picked, saved, and taken off again.
//   4  Take a photo opens Lucida's own camera screen (a simulator has no camera: `-fakeCamera` gives it a picture to take): shutter, Retake, Use photo, the
//      flash and the switch between the cameras; the picture goes into Make cards as a file.
//   5  A save that fails says so in a quiet message (a stand-in in front of the server fails every save while a file exists), never in a system alert.
//   6  No page ever shows the system's navigation bar, a toolbar, an alert, a date picker or a menu: the five tabs, Settings, Connect AI, a deck and a folder.
// The recording's player, deleting a source or a Guide page, and an AI app's Disconnect are checked in GuideTests and AccountTests, which ask the
// same way. Run it with ios/tools/e2e-ownui.sh (it starts a fresh server on port 3993). It only runs when LUCIDA_OWNUI is set.
import XCTest

final class OwnUITests: AppCase {
  override class var label: String { "Own UI" }
  override class var switchName: String { "LUCIDA_OWNUI" }

  // ---------- helpers ----------
  /// Nothing the system draws is on screen.
  private func noSystemUI(_ app: XCUIApplication, _ what: String) {
    let n = (alerts: app.alerts.count, sheets: app.sheets.count, popovers: app.popovers.count, dates: app.datePickers.count, wheels: app.pickerWheels.count, menus: app.menus.count, bars: app.navigationBars.count, toolbars: app.toolbars.count)
    check(n.alerts == 0 && n.sheets == 0 && n.popovers == 0 && n.dates == 0 && n.wheels == 0 && n.menus == 0 && n.bars == 0 && n.toolbars == 0,
          what + ": nothing the system draws (no alert, sheet, popover, date picker, wheel, menu, navigation bar or toolbar) \(n)")
  }
  private func go(_ app: XCUIApplication) -> XCUIElement { app.buttons["question.go"] }
  private func cancel(_ app: XCUIApplication) -> XCUIElement { app.buttons["question.cancel"] }
  /// A person who has been through the welcome.
  private func person(_ who: String, _ display: String) { name(who, display) }
  private func deckId(_ who: String, _ deckName: String, cards n: Int = 3) -> String {
    let id = act(who, "deck.add", ["name": deckName])["id"] as? String ?? ""
    for i in 1...n { act(who, "card.add", ["deckId": id, "kind": "basic", "front": deckName + " question \(i)", "back": "Answer \(i)"]) }
    return id
  }
  private func decks(_ who: String) -> [[String: Any]] { state(who)["decks"] as? [[String: Any]] ?? [] }
  private func cards(_ who: String) -> [[String: Any]] { state(who)["cards"] as? [[String: Any]] ?? [] }
  private func settings(_ who: String) -> [String: Any] { state(who)["settings"] as? [String: Any] ?? [:] }
  /// The last day of this month ("2026-10-31"): never before today, so the calendar offers it.
  private func lastDayOfMonth() -> String {
    let c = Calendar(identifier: .gregorian), now = Date(), n = c.range(of: .day, in: .month, for: now)?.count ?? 28, p = c.dateComponents([.year, .month], from: now)
    return String(format: "%04d-%02d-%02d", p.year ?? 2026, p.month ?? 1, n)
  }

  // ---------- 1: the questions ----------
  func test1QuestionsAreLucidas() throws {
    // Remove folder (the folder's page).
    let f = "ownf" + run
    person(f, "Fay Folder")
    let folder = act(f, "folder.add", ["name": "Question folder"])["id"] as? String ?? ""
    _ = deckId(f, "Fay’s deck", cards: 2)
    var app = launch(as: f, ["-open", "folder:Question folder"])
    tap(button(app, "Remove folder"), "Remove folder")
    check(wait(any(app, "Remove the folder “Question folder”?")) && any(app, "Its decks stay in your library.").exists, "Remove folder asks first, in plain words")
    check(wait(go(app)) && wait(cancel(app)), "with Cancel and the answer")
    noSystemUI(app, "Remove folder’s question")
    snap("ownui-question-folder")
    tap(cancel(app), "Cancel")
    check(gone(any(app, "Remove the folder “Question folder”?")) && ((state(f)["folders"] as? [[String: Any]]) ?? []).contains { $0["id"] as? String == folder }, "Cancel closes it and keeps the folder")
    tap(button(app, "Remove folder"), "Remove folder")
    check(wait(any(app, "Remove the folder “Question folder”?")), "it asks again")
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.08)).tap()
    check(gone(any(app, "Remove the folder “Question folder”?")) && ((state(f)["folders"] as? [[String: Any]]) ?? []).contains { $0["id"] as? String == folder }, "a tap on the dimmed page closes it too, and keeps the folder")
    tap(button(app, "Remove folder"), "Remove folder")
    tap(go(app), "the answer")
    check(eventually { !(((self.state(f)["folders"] as? [[String: Any]]) ?? []).contains { $0["id"] as? String == folder }) }, "the answer removes the folder")
    check(wait(button(app, "New folder")), "and the page goes back to the Library")

    // Delete deck (Deck settings), and its Cancel.
    let d = "ownd" + run
    person(d, "Dee Deck")
    let deck = deckId(d, "Question deck", cards: 3)
    app = launch(as: d, ["-open", "deck"])
    tap(button(app, "Deck settings"), "Deck settings")
    tap(button(app, "Delete deck"), "Delete deck")
    check(wait(any(app, "Delete “Question deck”?")) && any(app, "Its 3 cards go too. This can’t be undone.").exists, "Delete deck asks first: what goes, and that it can’t be undone")
    noSystemUI(app, "Delete deck’s question")
    snap("ownui-question-deck")
    tap(cancel(app), "Cancel")
    check(gone(any(app, "Delete “Question deck”?")) && decks(d).contains { $0["id"] as? String == deck }, "Cancel keeps the deck")
    tap(button(app, "Delete deck"), "Delete deck")
    check(wait(any(app, "Delete “Question deck”?")), "it asks again")
    tap(go(app), "the red Delete deck")
    check(eventually { !self.decks(d).contains { $0["id"] as? String == deck } }, "the answer deletes the deck")

    // Delete card (the card's editor).
    let c = "ownc" + run
    person(c, "Cy Card")
    let cdeck = deckId(c, "Card deck", cards: 3)
    app = launch(as: c, ["-open", "deck"])
    let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Card deck question 2")).firstMatch
    tap(row, "a card’s row")
    tap(button(app, "Delete card"), "Delete card")
    check(wait(any(app, "Delete this card?")), "Delete card asks first")
    noSystemUI(app, "Delete card’s question")
    tap(cancel(app), "Cancel")
    check(gone(any(app, "Delete this card?")) && cards(c).filter { $0["deckId"] as? String == cdeck }.count == 3, "Cancel keeps all three cards")
    tap(button(app, "Delete card"), "Delete card")
    check(wait(any(app, "Delete this card?")), "it asks again")
    tap(go(app), "the answer")
    check(eventually { self.cards(c).filter { $0["deckId"] as? String == cdeck }.count == 2 }, "the answer deletes that card")

    // Sign out (Settings).
    let s = "owns" + run
    person(s, "Sid Sign")
    app = launch(as: s, ["-open", "settings"])
    let account = buttonStarting(app, "Your account")
    tap(account, "Your account")
    check(wait(any(app, "Sign out of Lucida?")) && wait(go(app)) && go(app).label == "Sign out", "Your account asks “Sign out of Lucida?”, with Sign out for the answer")
    noSystemUI(app, "Sign out’s question")
    tap(cancel(app), "Cancel")
    check(gone(any(app, "Sign out of Lucida?")) && wait(text(app, "Settings")), "Cancel keeps him in")
    tap(account, "Your account")
    tap(go(app), "Sign out")
    check(wait(text(app, "Sign in to Lucida"), 20), "the answer signs out, to the sign-in screen")
  }

  // ---------- 2: lists ----------
  func test2Lists() throws {
    let who = "ownl" + run
    person(who, "Lena List")
    var app = launch(as: who, ["-open", "settings"])
    for (label, option, key, want) in [("New cards a day", "10", "perDay", 10)] {
      let row = buttonStarting(app, label)
      scrollTo(app, row)
      tap(row, label)
      check(wait(button(app, option)) && button(app, "Off").exists == false, label + " opens Lucida’s own list (a row for each choice, a Close button)")
      noSystemUI(app, label + "’s list")
      if label == "New cards a day" { snap("ownui-list") }
      button(app, option).tap()
      check(gone(button(app, option), 6), "a pick closes the list")
      check(eventually { (self.settings(who)[key] as? Int) == want }, label + " is saved: \(want)")
    }
    let reminder = buttonStarting(app, "Daily reminder")
    scrollTo(app, reminder)
    tap(reminder, "Daily reminder")
    check(wait(button(app, "Off")) && button(app, "7:00 AM").exists && button(app, "9:00 PM").exists, "Daily reminder lists Off and each time")
    noSystemUI(app, "Daily reminder’s list")
    tap(button(app, "Close"), "Close")
    check(gone(button(app, "7:00 AM"), 6), "Close puts the list away")

    // The language of the cards in Make cards.
    app = launch(as: who, ["-makeTopic", "The Krebs cycle"])
    let lang = app.buttons["Language of the cards"].firstMatch
    scrollTo(app, lang)
    tap(lang, "the Language button")
    check(wait(button(app, "Spanish")) && button(app, "Same as the material").exists, "the language opens Lucida’s list: Same as the material, then each language")
    noSystemUI(app, "the language list")
    button(app, "Spanish").tap()
    check(gone(button(app, "Spanish"), 6) && (lang.value as? String) == "Spanish", "a pick closes it, and the button says Spanish")
    check(wait(button(app, "Audio")), "(and Audio is offered once a language is set)")
  }

  // ---------- 3: the calendar ----------
  func test3Calendar() throws {
    let who = "owncal" + run
    person(who, "Cal Day")
    let deck = deckId(who, "Exam deck", cards: 3)
    let app = launch(as: who, ["-open", "deck"])
    tap(button(app, "Deck settings"), "Deck settings")
    tap(app.buttons["Studying"].firstMatch, "the Studying tab")
    tap(button(app, "Add an exam date"), "Add a date")
    let day = lastDayOfMonth()
    check(wait(app.buttons["day-" + day]), "Add a date opens Lucida’s calendar (a button for each day)")
    noSystemUI(app, "the exam calendar")
    snap("ownui-calendar")
    check(app.buttons["Earlier month"].exists && app.buttons["Later month"].exists, "with the month’s arrows")
    let month = String(day.prefix(8))
    check((1...Int(day.suffix(2))!).allSatisfy { app.buttons["day-" + month + String(format: "%02d", $0)].exists }, "and every day of the month, from the 1st to the last")
    app.buttons["day-" + day].tap()
    check(gone(app.buttons["day-" + day], 6), "a day closes it")
    check(eventually { (self.decks(who).first { $0["id"] as? String == deck }?["exam"] as? String) == day }, "the day is the deck’s exam date: " + day)
    check(wait(buttonStarting(app, "Exam date, ")) && button(app, "Remove the exam date").exists, "the pill says the day, with a button to take it off")
    tap(button(app, "Remove the exam date"), "Remove the exam date")
    check(eventually { (self.decks(who).first { $0["id"] as? String == deck }?["exam"] as? String ?? "") == "" }, "taking it off clears it")
    tap(button(app, "Add an exam date"), "Add a date again")
    check(wait(app.buttons["day-" + day]), "it opens again")
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).tap()
    check(gone(app.buttons["day-" + day], 6), "a tap outside closes it without picking")
    check(((self.decks(who).first { $0["id"] as? String == deck }?["exam"] as? String) ?? "") == "", "and picks nothing")
  }

  // ---------- 4: the camera ----------
  func test4Camera() throws {
    let who = "owncam" + run
    person(who, "Cam Era")
    let app = launch(as: who, ["-open", "make", "-fakeCamera"])
    tap(button(app, "Photo"), "Photo")
    tap(button(app, "Take a photo"), "Take a photo")
    check(wait(app.buttons["camera.shutter"]), "Take a photo opens Lucida’s own camera screen (a shutter)")
    noSystemUI(app, "the camera")
    check(app.buttons["camera.close"].exists && app.buttons["camera.flash"].exists && app.buttons["camera.flip"].exists, "with Close, the flash and the switch between the cameras")
    snap("ownui-camera")
    // The flash goes Off, Auto, On, Off.
    let flash = app.buttons["camera.flash"]
    check(flash.label == "Flash, off", "the flash starts off (" + flash.label + ")")
    flash.tap(); check(app.buttons["camera.flash"].label == "Flash, auto", "a tap makes it auto")
    app.buttons["camera.flash"].tap(); check(app.buttons["camera.flash"].label == "Flash, on", "then on")
    app.buttons["camera.flash"].tap(); check(app.buttons["camera.flash"].label == "Flash, off", "then off again")
    app.buttons["camera.flip"].tap()
    check(app.buttons["camera.shutter"].exists, "the switch keeps the camera up")
    app.buttons["camera.shutter"].tap()
    check(wait(app.buttons["camera.retake"]) && app.buttons["camera.use"].exists && !app.buttons["camera.shutter"].exists, "the shutter shows the picture, with Retake and Use photo")
    snap("ownui-camera-photo")
    app.buttons["camera.retake"].tap()
    check(wait(app.buttons["camera.shutter"]) && !app.buttons["camera.use"].exists, "Retake goes back to the camera")
    app.buttons["camera.shutter"].tap()
    tap(app.buttons["camera.use"], "Use photo")
    check(gone(app.buttons["camera.shutter"], 8), "Use photo closes the camera")
    check(wait(text(app, "Photo 1.jpg")) || wait(any(app, "Photo 1.jpg")), "and the picture is a file in Make cards")
    noSystemUI(app, "Make cards after the photo")
    // Close with no picture.
    tap(button(app, "Take a photo"), "Take a photo")
    check(wait(app.buttons["camera.close"]), "the camera opens again")
    app.buttons["camera.close"].tap()
    check(gone(app.buttons["camera.shutter"], 8), "Close puts it away")
  }

  // ---------- 5: a message for a failed save ----------
  func test5Message() throws {
    let proxy = ProcessInfo.processInfo.environment["LUCIDA_PROXY"] ?? "http://127.0.0.1:3995", flag = ProcessInfo.processInfo.environment["LUCIDA_FAIL_FLAG"] ?? ""
    try XCTSkipIf(flag.isEmpty, "Run with ios/tools/e2e-ownui.sh (it starts the stand-in that fails saves)")
    let who = "ownm" + run
    person(who, "Mo Message")
    _ = deckId(who, "Message deck", cards: 2)
    try? FileManager.default.removeItem(atPath: flag)
    let app = launch(as: who, ["-open", "deck"], server: proxy)
    tap(button(app, "Deck settings"), "Deck settings")
    check(wait(button(app, "Delete deck")), "the settings are up")
    // From now on every save fails.
    FileManager.default.createFile(atPath: flag, contents: Data())
    tap(app.switches.firstMatch.exists ? app.switches.firstMatch : button(app, "Pause this deck"), "Pause this deck")
    let say = any(app, "That didn’t save. Try again.")
    check(wait(say, 10), "a save that fails says so, in a quiet message")
    check(app.alerts.count == 0 && app.sheets.count == 0, "not in a system alert")
    check(app.buttons["toast"].exists, "it is Lucida’s own pill (the toast)")
    snap("ownui-toast")
    app.buttons["toast"].tap()
    check(gone(app.buttons["toast"], 4), "a tap puts it away")
    tap(app.switches.firstMatch.exists ? app.switches.firstMatch : button(app, "Pause this deck"), "Pause this deck again")
    check(wait(app.buttons["toast"], 10), "another failure shows it again")
    check(gone(app.buttons["toast"], 9), "and it goes by itself after a few seconds")
    try? FileManager.default.removeItem(atPath: flag)
  }

  // ---------- 6: no system chrome on any page ----------
  func test6NoSystemChrome() throws {
    let who = "ownn" + run
    person(who, "Nan Nav")
    _ = deckId(who, "Nav deck", cards: 2)
    _ = act(who, "folder.add", ["name": "Nav folder"])
    var app = launch(as: who)
    for tab in ["Library", "Discover", "Stats", "Profile"] {
      tap(button(app, tab), tab)
      Thread.sleep(forTimeInterval: 0.9)
      noSystemUI(app, "the " + tab + " tab")
    }
    for open in ["settings", "connect", "deck", "folder:Nav folder", "library"] {
      app = launch(as: who, ["-open", open])
      Thread.sleep(forTimeInterval: 2)
      noSystemUI(app, "-open " + open)
    }
  }
}
