// Import cards on the iPhone (Screens/Import.swift, the web's Import page one for one), end to end against a copy of the server on this Mac with
// made-up people. Each flow sets up its own people, so any one can run alone, and none ever sees a system alert:
//   1  The Library's +: Import cards opens the sheet (the box, Choose a file, the deck, Cancel and Import), Cancel closes it; cards pasted with
//      tabs say how many, Import goes into a new deck named in the field, and that deck's page opens with them (as the server has them).
//   2  The count and a deck you have: words that aren't cards say how to write them (and Import does nothing), a comma line counts; a deck's
//      chip picks it, and Import adds the cards to that deck (no new deck), whose page opens.
//   3  A brand-new account's Import cards: no decks to pick, and Import with no name makes "Imported cards".
//   4  An empty deck: its page has no More (the Library makes no cards and an empty deck has no row, the owner, 2026-10-02); the Library's +
//      Import cards and the deck's chip put the cards into it.
//   5  Files (`-importFile`, as if chosen in the Files picker): UTF-16 with its mark, Latin-1, an Anki export with its headers, HTML and a
//      blank, and 2,500 cards (sent a thousand at a time); a file that isn't text says so in the line; Choose a file opens the Files picker.
//   6  The quiet line: a save that fails (a stand-in in front of the server) says so in the sheet, which stays; Import again goes on, with no card
//      twice. A deck you only study says the server's words ("This deck is …’s").
//   7  (With SHOTS=<folder> only) pictures of the sheet empty, pasted, with a file chosen, and the deck after Import, in light and dark.
// Run it with ios/tools/e2e-import.sh. It only runs when LUCIDA_IMPORT is set.
import XCTest

final class ImportTests: AppCase {
  override class var label: String { "Import" }
  override class var switchName: String { "LUCIDA_IMPORT" }
  static let env = ProcessInfo.processInfo.environment
  /// The test's files (made by the script) and the stand-in that fails saves while its flag file is there.
  static let files = env["LUCIDA_IMPORT_FILES"] ?? ""
  static let proxy = env["LUCIDA_PROXY"] ?? "", flag = env["LUCIDA_FAIL_FLAG"] ?? ""

  // ---------- helpers ----------
  /// Someone welcomed, with decks of `n` cards each: their ids by name.
  @discardableResult
  private func person(_ who: String, decks: [(String, Int)] = []) -> [String: String] {
    act(who, "settings.update", ["patch": ["welcomed": true]])
    var ids: [String: String] = [:]
    for (name, n) in decks {
      let id = act(who, "deck.add", ["name": name])["id"] as? String ?? ""
      for i in 0..<n { act(who, "card.add", ["deckId": id, "kind": "basic", "front": "\(name) question \(i + 1)", "back": "Answer \(i + 1)"]) }
      ids[name] = id
    }
    return ids
  }
  private func decks(_ who: String) -> [[String: Any]] { state(who)["decks"] as? [[String: Any]] ?? [] }
  private func deckId(_ who: String, _ name: String) -> String? { decks(who).first { $0["name"] as? String == name }?["id"] as? String }
  private func cards(_ who: String, _ deck: String) -> [[String: Any]] { (state(who)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deck } }
  /// The fronts and backs of a deck's cards (a fill-in-the-blank card's text and note), in the order they were made.
  private func faces(_ who: String, _ deck: String) -> [String] {
    cards(who, deck).map { c in (c["kind"] as? String) == "cloze" ? "cloze:" + (c["text"] as? String ?? "") : (c["front"] as? String ?? "") + " | " + (c["back"] as? String ?? "") }
  }
  private func box(_ app: XCUIApplication) -> XCUIElement { app.textViews["importText"] }
  /// The line beside Choose a file ("" when it says nothing: an empty line isn't on screen to read).
  private func found(_ app: XCUIApplication) -> String { let e = app.staticTexts["importFound"].firstMatch; return e.exists ? e.label : "" }
  private func go(_ app: XCUIApplication) -> XCUIElement { app.buttons["importGo"] }
  private func deckField(_ app: XCUIApplication) -> XCUIElement { app.textFields["importDeck"] }
  private func errorLine(_ app: XCUIApplication) -> XCUIElement { app.staticTexts["importError"].firstMatch }
  private func isOpen(_ app: XCUIApplication) -> Bool { wait(app.staticTexts["Import cards"].firstMatch, 12) && wait(box(app), 4) }
  private func noAlert(_ app: XCUIApplication, _ when: String) { check(app.alerts.count == 0, "no system alert (" + when + ")") }
  /// Waits until the line under the box says this.
  private func says(_ app: XCUIApplication, _ words: String, _ s: TimeInterval = 6) -> Bool { eventually(s) { self.found(app) == words } }
  /// Pastes into the box with the text editing menu, from the phone's pasteboard (what a person does with cards copied from Quizlet).
  private func paste(_ app: XCUIApplication, _ words: String) -> Bool {
    UIPasteboard.general.string = words
    let b = box(app)
    guard wait(b) else { return false }
    for attempt in 0..<3 {
      if attempt == 0 { b.tap(); Thread.sleep(forTimeInterval: 0.8) }
      b.press(forDuration: 1.1)
      let item = app.menuItems["Paste"].firstMatch
      if item.waitForExistence(timeout: 3) { item.tap(); return true }
      app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.04)).tap()
    }
    return false
  }
  /// Brings something in the sheet's middle wholly into view (with the keyboard up the middle is shorter and scrolls; `isHittable` says yes to a
  /// field whose middle is under the middle's bottom edge, where a tap lands beside it).
  private func reach(_ app: XCUIApplication, _ e: XCUIElement) {
    let s = app.scrollViews.containing(.textView, identifier: "importText").firstMatch
    var n = 0
    while e.exists && s.exists && e.frame.maxY > s.frame.maxY - 1 && n < 6 { s.swipeUp(velocity: .slow); Thread.sleep(forTimeInterval: 0.7); n += 1 }
  }
  private func typeDeck(_ app: XCUIApplication, _ name: String) {
    let f = deckField(app)
    guard wait(f) else { check(false, "found the deck's name field"); return }
    reach(app, f)
    f.tap()
    // (A tap while the page still moves only stops it: tap again until the field has the keyboard.)
    for _ in 0..<3 where !((f.value(forKey: "hasKeyboardFocus") as? Bool) ?? false) { Thread.sleep(forTimeInterval: 0.5); f.tap() }
    if let v = f.value as? String, !v.isEmpty, v != "New deck name" { f.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: v.count)) }
    f.typeText(name)
    let done = app.keyboards.buttons.matching(NSPredicate(format: "label IN {'Done','done','return','Return'}")).firstMatch
    if done.exists { done.tap(); Thread.sleep(forTimeInterval: 0.5) }
  }
  /// Import, then the deck's page (its name on it) with the sheet gone.
  private func importAndOpen(_ app: XCUIApplication, _ deck: String) -> Bool {
    tap(go(app), "Import")
    return gone(box(app), 20) && wait(text(app, deck), 10)
  }

  // ---------- 1: the Library's + ----------
  func test1LibraryPlus() throws {
    let who = "ipa" + run, name = "Spanish " + run
    person(who, decks: [("Biology", 2)])
    let app = launch(as: who)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "Import cards"), "its Import cards")
    check(isOpen(app), "the Library's + → Import cards opens Import cards")
    check(button(app, "Choose a file").exists && deckField(app).exists && button(app, "Cancel").exists && go(app).exists, "with the box, Choose a file, the deck's name, Cancel and Import")
    check(found(app).isEmpty && go(app).label == "Import cards", "nothing found yet, and Import says “Import cards”")
    check(button(app, "Biology").exists && !button(app, "Biology").isSelected, "your decks are chips, none picked")
    noAlert(app, "the sheet open")
    snap("import-empty")
    tap(button(app, "Cancel"), "Cancel")
    check(gone(box(app), 6) && wait(button(app, "Add")), "Cancel closes it")
    tap(button(app, "Add"), "the Library's + again")
    tap(button(app, "Import cards"), "Import cards again")
    check(isOpen(app), "it opens again")
    check(paste(app, "hola\thello\nadiós\tgoodbye\ngracias\tthank you"), "cards copied from Quizlet are pasted into the box")
    check(says(app, "3 cards found"), "“3 cards found” (\(found(app)))")
    check(go(app).label == "Import 3 cards", "Import says “Import 3 cards” (\(go(app).label))")
    snap("import-pasted")
    typeDeck(app, name)
    check((deckField(app).value as? String) == name, "a new deck's name is typed")
    noAlert(app, "pasted")
    check(importAndOpen(app, name), "Import opens the new deck's page")
    let id = deckId(who, name) ?? ""
    check(faces(who, id) == ["hola | hello", "adiós | goodbye", "gracias | thank you"], "the deck has the three cards, front and back: \(faces(who, id))")
    check(decks(who).count == 2, "and it's the only new deck")
    snap("import-after")
    noAlert(app, "after the import")
  }

  // ---------- 2: the count, and a deck you have ----------
  func test2MoreAndChip() throws {
    let who = "ipb" + run
    let ids = person(who, decks: [("Biology", 2), ("History", 1)])
    let app = launch(as: who)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "Import cards"), "its Import cards")
    check(isOpen(app), "+ → Import cards opens Import cards")
    let b = box(app)
    b.tap()
    b.typeText("Notes from class")
    check(says(app, "No cards yet. Put the front and back on one line, split by a tab or comma."), "words that aren't cards say how to write them (\(found(app)))")
    check(go(app).label == "Import cards", "and Import says “Import cards”")
    go(app).tap()
    Thread.sleep(forTimeInterval: 1)
    check(box(app).exists && decks(who).count == 2, "which does nothing yet")
    // (Back in the box, after its words.)
    b.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.9)).tap()
    b.typeText("\nmitosis,cell division")
    check(says(app, "1 card found"), "a front and back split by a comma counts: “1 card found” (\(found(app)))")
    b.typeText("\nmeiosis,makes gametes")
    check(says(app, "2 cards found") && go(app).label == "Import 2 cards", "a line more: “2 cards found”, “Import 2 cards”")
    noAlert(app, "typing")
    reach(app, button(app, "History"))
    tap(button(app, "History"), "the History chip")
    check(eventually(4) { (self.deckField(app).value as? String) == "History" && self.button(app, "History").isSelected }, "a chip puts its deck in the field and is picked")
    snap("import-chip")
    check(importAndOpen(app, "History"), "Import opens History's page")
    check(faces(who, ids["History"] ?? "") == ["History question 1 | Answer 1", "mitosis | cell division", "meiosis | makes gametes"], "the cards went into History: \(faces(who, ids["History"] ?? ""))")
    check(decks(who).count == 2, "and no new deck was made")
    noAlert(app, "after the import")
  }

  // ---------- 3: a brand-new account ----------
  func test3NewAccount() throws {
    let who = "ipc" + run
    person(who)
    let app = launch(as: who)
    let tile = buttonStarting(app, "Import cards")
    check(wait(tile), "a brand-new account's Library has Import cards")
    tile.tap()
    check(isOpen(app), "which opens Import cards")
    check(app.buttons.matching(identifier: "importChip").count == 0 && deckField(app).exists, "with no decks to pick, just the name")
    check(paste(app, "Capital of Peru, Lima\nLargest ocean, Pacific"), "cards pasted")
    check(says(app, "2 cards found"), "“2 cards found”")
    check(importAndOpen(app, "Imported cards"), "Import with no name makes “Imported cards” and opens it")
    let id = deckId(who, "Imported cards") ?? ""
    check(faces(who, id) == ["Capital of Peru | Lima", "Largest ocean | Pacific"], "with the cards: \(faces(who, id))")
    noAlert(app, "after the import")
  }

  // ---------- 4: an empty deck ----------
  func test4EmptyDeck() throws {
    let who = "ipd" + run, empty = "Empty " + run
    let ids = person(who, decks: [("Biology", 1), (empty, 0)])
    var app = launch(as: who, ["-open", "deck:" + empty])
    check(wait(text(app, "No cards yet")) && wait(button(app, "Make cards")), "the empty deck's page, with Make cards on its cover")
    check(!button(app, "More").exists && !button(app, "Import cards").exists, "and no More under it (no Make box row)")
    app.terminate()
    app = launch(as: who)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "Import cards"), "its Import cards")
    check(isOpen(app), "+ → Import cards opens Import cards")
    reach(app, button(app, empty))
    tap(button(app, empty), "the empty deck's chip")
    check(eventually(4) { (self.deckField(app).value as? String) == empty && self.button(app, empty).isSelected }, "its chip puts the empty deck in the field, picked")
    snap("import-deck")
    let b = box(app)
    b.tap()
    b.typeText("osteon,bone unit\nfemur,thigh bone")
    check(says(app, "2 cards found"), "“2 cards found”")
    check(importAndOpen(app, empty), "Import opens the deck")
    check(faces(who, ids[empty] ?? "") == ["osteon | bone unit", "femur | thigh bone"], "the cards are in it: \(faces(who, ids[empty] ?? ""))")
    check(decks(who).count == 2, "(no new deck)")
    check(wait(any(app, "osteon")), "and its page shows them")
    noAlert(app, "after the import")
  }

  // ---------- 5: files ----------
  func test5Files() throws {
    try XCTSkipIf(Self.files.isEmpty, "Run with ios/tools/e2e-import.sh (it makes the files)")
    let who = "ipe" + run
    person(who, decks: [("Biology", 1)])
    func file(_ name: String, deck: String, count: Int, shows: String) -> String {
      let app = launch(as: who, ["-importFile", Self.files + "/" + name])
      check(isOpen(app), name + " opens Import cards with the file")
      check(eventually(6) { (self.box(app).value as? String ?? "").contains(shows) }, name + ": its words are in the box")
      check(says(app, Self.plural(count) + " found", 15), name + ": “\(Self.plural(count)) found” (\(found(app)))")
      typeDeck(app, deck)
      check(importAndOpen(app, deck), name + ": Import opens the new deck")
      noAlert(app, name)
      app.terminate()
      return deckId(who, deck) ?? ""
    }
    let a = file("utf16.tsv", deck: "UTF-16 " + run, count: 3, shows: "café")
    check(faces(who, a) == ["café | coffee", "naïve | innocent", "日本 | Japan"], "UTF-16 with its mark reads right: \(faces(who, a))")
    let b = file("latin1.csv", deck: "Latin " + run, count: 2, shows: "été")
    check(faces(who, b) == ["été | summer", "hiver | winter"], "Latin-1 reads right: \(faces(who, b))")
    let c = file("anki.txt", deck: "Anki " + run, count: 2, shows: "#separator:tab")
    check(faces(who, c) == ["**Mitochondria** | the powerhouse", "cloze:The [[nucleus]] holds the DNA"], "an Anki export: its headers read, HTML as card text, a blank as a fill-in-the-blank card: \(faces(who, c))")
    let d = file("big.tsv", deck: "Big " + run, count: 2500, shows: "front 1\t")
    let big = cards(who, d)
    check(big.count == 2500 && (big.first?["front"] as? String) == "front 1" && (big.last?["back"] as? String) == "back 2500", "2,500 cards all go in, in order (\(big.count))")
    // A file that isn't text says so, quietly.
    let app = launch(as: who, ["-importFile", Self.files + "/picture.txt"])
    check(isOpen(app), "a picture named .txt opens Import cards")
    check(wait(errorLine(app), 6) && errorLine(app).label == "That file couldn’t be read.", "and says “That file couldn’t be read.” in the sheet (\(errorLine(app).label))")
    check((box(app).value as? String ?? "") == "" || (box(app).value as? String) == "One card per line: front, then back", "the box stays empty")
    noAlert(app, "a file that isn't text")
    snap("import-file-error")
    // Choose a file is the phone's Files picker (one of the system's own things that stay).
    tap(button(app, "Choose a file"), "Choose a file")
    let picker = app.otherElements.matching(NSPredicate(format: "identifier CONTAINS[c] 'DocumentPicker' OR identifier CONTAINS[c] 'Browser'")).firstMatch
    let cancels = app.buttons.matching(NSPredicate(format: "label == 'Cancel'"))
    check(eventually(8) { picker.exists || cancels.count > 1 || app.buttons["Browse"].exists || app.buttons["Recents"].exists }, "Choose a file opens the Files picker")
    snap("import-files-picker")
    noAlert(app, "the Files picker")
    // (The picker's own close button; or it's pulled down by its top.)
    if let x = app.buttons.matching(NSPredicate(format: "label IN {'Cancel','Close','Done'}")).allElementsBoundByIndex.first(where: { $0.isHittable && !$0.identifier.hasPrefix("import") && $0.frame.minY < 300 }) { x.tap() }
    else { app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95))) }
    check(eventually(8) { self.box(app).isHittable }, "closing it leaves the sheet as it was")
  }
  static func plural(_ n: Int) -> String { "\(n) card" + (n == 1 ? "" : "s") }

  // ---------- 6: the quiet line ----------
  func test6ErrorLine() throws {
    try XCTSkipIf(Self.proxy.isEmpty || Self.flag.isEmpty, "Run with ios/tools/e2e-import.sh (it starts the stand-in that fails saves)")
    let who = "ipf" + run, deck = "Retry " + run
    person(who, decks: [("Biology", 1)])
    try? FileManager.default.removeItem(atPath: Self.flag)
    var app = launch(as: who, server: Self.proxy)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "Import cards"), "Import cards")
    check(isOpen(app), "Import cards is open")
    let b = box(app)
    b.tap()
    b.typeText("one,uno\ntwo,dos")
    check(says(app, "2 cards found"), "“2 cards found”")
    typeDeck(app, deck)
    // From now on every save fails.
    FileManager.default.createFile(atPath: Self.flag, contents: Data())
    tap(go(app), "Import")
    check(wait(errorLine(app), 10) && errorLine(app).label == "That didn’t save. Try again.", "a save that fails says so in a quiet line in the sheet (\(errorLine(app).label))")
    check(box(app).exists && found(app) == "2 cards found", "the sheet stays, with the cards")
    check(!app.buttons["toast"].exists, "(in the sheet, not the page's message)")
    noAlert(app, "a save that failed")
    check(deckId(who, deck) == nil, "nothing was saved")
    snap("import-error")
    try? FileManager.default.removeItem(atPath: Self.flag)
    check(importAndOpen(app, deck), "Import again goes in and opens the deck")
    let id = deckId(who, deck) ?? ""
    check(faces(who, id) == ["one | uno", "two | dos"], "with each card once: \(faces(who, id))")
    noAlert(app, "after the import")
    app.terminate()
    // A deck you only study is its owner's: the server's own words say so.
    let owner = "ipg" + run
    name(owner, "Maria Owner")
    let shared = shareDeck(owner, "Owner deck " + run, n: 2)
    social(who, "deck.study", ["id": shared.id])
    app = launch(as: who)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "Import cards"), "Import cards")
    check(isOpen(app), "Import cards is open")
    box(app).tap()
    box(app).typeText("three,tres")
    reach(app, button(app, "Owner deck " + run))
    tap(button(app, "Owner deck " + run), "the studied deck's chip")
    tap(go(app), "Import")
    check(wait(errorLine(app), 10) && errorLine(app).label.hasPrefix("This deck is Maria Owner"), "a deck you only study says the server's words (\(errorLine(app).label))")
    noAlert(app, "the server said no")
    check(cards(who, deckId(who, "Owner deck " + run) ?? "").count == 2, "and it has no new card")
  }

  // ---------- 7: pictures ----------
  func test7Pictures() throws {
    try XCTSkipIf(ProcessInfo.processInfo.environment["SHOTS"] == nil || Self.files.isEmpty, "Only for pictures (SHOTS=<folder>, with ios/tools/e2e-import.sh)")
    let who = "iph" + run
    person(who, decks: [("Biology", 3), ("Japanese · JLPT N4", 2), ("Organic Chemistry", 1), ("US History", 1)])
    for look in ["light", "dark"] {
      act(who, "settings.update", ["patch": ["look": look]])
      var app = launch(as: who)
      tap(button(app, "Add"), "the Library's +")
      tap(button(app, "Import cards"), "Import cards")
      check(isOpen(app), "Import cards is open (\(look))")
      Thread.sleep(forTimeInterval: 0.8)
      snap("pic-empty-" + look)
      check(paste(app, "でんしゃ\ttrain\nねこ\tcat\nみず\twater"), "cards pasted (\(look))")
      check(says(app, "3 cards found"), "“3 cards found” (\(look))")
      app.scrollViews.firstMatch.swipeDown(velocity: .slow)
      Thread.sleep(forTimeInterval: 0.8)
      snap("pic-pasted-" + look)
      app.terminate()
      app = launch(as: who, ["-importFile", Self.files + "/cells.txt"])
      check(isOpen(app) && says(app, "12 cards found", 10), "a file chosen: “12 cards found” (\(look))")
      Thread.sleep(forTimeInterval: 0.6)
      snap("pic-file-" + look)
      typeDeck(app, "Cell Biology " + look)
      check(importAndOpen(app, "Cell Biology " + look), "Import opens the deck (\(look))")
      Thread.sleep(forTimeInterval: 1.2)
      snap("pic-after-" + look)
      noAlert(app, look)
      app.terminate()
    }
    act(who, "settings.update", ["patch": ["look": "system"]])
  }
}
