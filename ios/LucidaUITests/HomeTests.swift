// The Library is the app's first page and where decks are made (the owner, 2026-10-01: "could we just get rid of the 'today' page so users
// just focus on the library and deck creation in there?"), end to end in the iPhone app, against a copy of the server on this Mac with made-up
// people and the AI stood in for (stub-ai.mjs: nothing real is asked). Each flow sets up its own people, so any one can run alone:
//   1  The tab bar is Library, Discover, Stats and Profile, and the app opens on the Library: the Make box ("What do you want to study?") and its
//      row on top, then what's due, with Review: the review of every deck, whose X comes back to the Library. With nothing due there's no line,
//      and `-open today` (the old page's name) opens the Library.
//   2  Every way in: the box's + is Upload; Upload, Paste and YouTube open their kind; More is Lucida's own menu (Photos, Record a lecture,
//      A topic, Import cards, New deck), and each kind in it opens.
//   3  Words in the box: a topic and Return open A topic with them in, and the cards go into a new deck named for it; the box's Make cards does
//      the same; a YouTube link and Return open YouTube with it; a link pasted into the box opens YouTube at once, and a long text opens Paste.
//   4  A deck takes material too: its cover has Make cards and New card; an empty deck has the box and the row, set to it (its More has no New
//      deck, and what the box makes goes into it); New deck opens the new deck there.
//   5  A brand-new account: the welcome, whose end is the Library: the Make box, then Import cards and Connect AI (no other welcome).
//   6  Assigned: a student's Library lists what the class assigned (so does one with no deck yet), and a row opens the class; the teacher's has none.
//   7  News is the bell in Discover's header; it opens News, and Back is Discover.
//   8  A folder's page has the box, and what it makes goes into a new deck in the folder.
// Run it with ios/tools/e2e-home.sh (a fresh server and the stand-in AI). It only runs when LUCIDA_HOME is set.
import XCTest

final class HomeTests: AppCase {
  override class var label: String { "Home" }
  override class var switchName: String { "LUCIDA_HOME" }
  private let tabs = ["Library", "Discover", "Stats", "Profile"]
  private let more = ["Photos", "Record a lecture", "A topic", "Import cards"]

  // ---------- helpers ----------
  /// The Make box's field (a text view: it can hold more than one line).
  private func box(_ app: XCUIApplication) -> XCUIElement { app.descendants(matching: .any).matching(identifier: "makeBox").firstMatch }
  private func lit(_ app: XCUIApplication) -> String? { tabs.first { app.buttons[$0].exists && app.buttons[$0].isSelected } }
  private func litIs(_ app: XCUIApplication, _ tab: String) -> Bool { eventually(8) { self.lit(app) == tab } }
  /// A person who has been welcomed, with decks: [name: [(front, back)]] (`due`: decks that don't schedule, so every card is due).
  private func person(_ who: String, decks: [(String, Int)] = [], due: Bool = false) -> [String: String] {
    act(who, "settings.update", ["patch": ["welcomed": true]])
    var ids: [String: String] = [:]
    for (name, n) in decks {
      let id = act(who, "deck.add", ["name": name, "fsrs": !due])["id"] as? String ?? ""
      for i in 0..<n { act(who, "card.add", ["deckId": id, "kind": "basic", "front": "\(name) question \(i + 1)?", "back": "Answer \(i + 1)"]) }
      ids[name] = id
    }
    return ids
  }
  private func decks(_ who: String) -> [[String: Any]] { state(who)["decks"] as? [[String: Any]] ?? [] }
  private func deck(_ who: String, _ name: String) -> [String: Any]? { decks(who).first { $0["name"] as? String == name } }
  private func cardCount(_ who: String, _ deckId: String) -> Int { (state(who)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deckId }.count }
  /// The Make sheet is open on this kind (its title).
  private func opened(_ app: XCUIApplication, _ title: String) -> Bool { wait(app.staticTexts[title].firstMatch, 12) && button(app, "Close").exists }
  private func close(_ app: XCUIApplication) { tap(button(app, "Close"), "Close"); _ = gone(button(app, "Close"), 6) }
  /// Makes the cards in the open sheet and saves them: the save button's words ("Add 5 cards to …"), "" when it never came.
  private func makeAndSave(_ app: XCUIApplication) -> String {
    tap(button(app, "Make cards"), "the sheet's Make cards")
    guard wait(text(app, "Check your cards"), 60) else { check(false, "the cards are made and shown to check"); return "" }
    let b = buttonStarting(app, "Add ")
    guard wait(b) else { return "" }
    let label = b.label
    b.tap()
    _ = gone(text(app, "Check your cards"), 15)
    return label
  }
  /// Types into the Make box (Return as "\n").
  private func typeBox(_ app: XCUIApplication, _ words: String) {
    let b = box(app)
    guard wait(b) else { check(false, "found the Make box"); return }
    b.tap()
    Thread.sleep(forTimeInterval: 0.6)
    b.typeText(words)
  }
  /// Pastes into the Make box with the text editing menu (what a person does), from the phone's pasteboard.
  private func pasteBox(_ app: XCUIApplication, _ words: String) -> Bool {
    UIPasteboard.general.string = words
    let b = box(app)
    guard wait(b) else { return false }
    for attempt in 0..<3 {
      if attempt == 0 { b.tap(); Thread.sleep(forTimeInterval: 0.8) }
      b.press(forDuration: 1.1)
      let item = app.menuItems["Paste"].firstMatch
      if item.waitForExistence(timeout: 3) { item.tap(); return true }
      app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.06)).tap()
    }
    return false
  }

  // ---------- 1: the first page ----------
  func test1FirstPage() throws {
    let who = "hma" + run
    _ = person(who, decks: [("Anatomy", 3)], due: true)
    let app = launch(as: who)
    check(wait(button(app, "Library")) && tabs.allSatisfy { button(app, $0).exists } && !button(app, "Today").exists, "the tab bar is Library, Discover, Stats and Profile (no Today)")
    check(litIs(app, "Library"), "the app opens on the Library, lit")
    check(wait(box(app)) && any(app, "What do you want to study?").exists, "its top is the Make box: “What do you want to study?”")
    check(["Upload", "Paste", "YouTube", "More"].allSatisfy { button(app, $0).exists }, "and its row: Upload, Paste, YouTube, More")
    let due = any(app, "3 cards due · About 1 min")
    check(wait(due), "then what's due: “3 cards due · About 1 min”")
    check(due.frame.minY > box(app).frame.maxY, "under the box")
    check(!any(app, "streak").exists, "with no streak line (that's on Stats)")
    snap("home-library")
    tap(button(app, "Review"), "Review")
    check(wait(button(app, "End review")) && wait(any(app, "Anatomy question")), "Review starts the review of every deck")
    button(app, "End review").tap()
    check(gone(button(app, "End review")) && wait(box(app)) && litIs(app, "Library"), "its X comes back to the Library")
    app.terminate()
    let calm = "hmb" + run
    _ = person(calm, decks: [("History", 2)])
    let app2 = launch(as: calm, ["-open", "today"])
    check(wait(box(app2)) && litIs(app2, "Library"), "`-open today` opens the Library")
    check(!any(app2, "cards due").exists && !any(app2, "card due").exists && !button(app2, "Review").exists, "with nothing due there is no due line")
  }

  // ---------- 2: every way in ----------
  func test2EveryWayIn() throws {
    let who = "hmc" + run
    _ = person(who, decks: [("Biology", 2)])
    let app = launch(as: who)
    check(wait(box(app)), "the Library opens")
    tap(button(app, "Upload"), "the box's + (Upload)")
    check(opened(app, "Upload") && wait(button(app, "Choose a file")), "the box's + opens Upload")
    close(app)
    // (The row's Upload is the second button called Upload: the box's + is the first.)
    let ups = app.buttons.matching(NSPredicate(format: "label == 'Upload'")).allElementsBoundByIndex
    check(ups.count == 2, "the box's + and the row both say Upload (\(ups.count))")
    if let row = ups.max(by: { $0.frame.minY < $1.frame.minY }) { row.tap() }
    check(opened(app, "Upload"), "the row's Upload opens Upload")
    close(app)
    tap(button(app, "Paste"), "Paste")
    check(opened(app, "Paste") && wait(app.textViews["Text to make cards from"]), "Paste opens Paste")
    close(app)
    tap(button(app, "YouTube"), "YouTube")
    check(opened(app, "YouTube") && wait(app.textFields["Link to the video"]), "YouTube opens YouTube")
    close(app)
    tap(button(app, "More"), "More")
    check(wait(button(app, "Photos")) && (more + ["New deck"]).allSatisfy { button(app, $0).exists }, "More is Lucida's own menu: Photos, Record a lecture, A topic, Import cards, New deck")
    check(app.alerts.count == 0 && app.sheets.count == 0, "(no system menu or sheet)")
    snap("home-more")
    button(app, "Photos").tap()
    check(opened(app, "Photos") && wait(button(app, "Choose photos")), "More → Photos opens Photos")
    close(app)
    tap(button(app, "More"), "More")
    tap(button(app, "Record a lecture"), "Record a lecture")
    check(opened(app, "Record a lecture") && wait(button(app, "Start recording")), "More → Record a lecture opens the recorder")
    close(app)
    tap(button(app, "More"), "More")
    tap(button(app, "A topic"), "A topic")
    check(opened(app, "A topic") && wait(app.textFields["Topic"]), "More → A topic opens A topic")
    close(app)
    tap(button(app, "More"), "More")
    tap(button(app, "New deck"), "New deck")
    check(wait(button(app, "Create deck")), "More → New deck opens New deck")
  }

  // ---------- 3: words in the box ----------
  func test3WordsInTheBox() throws {
    let who = "hmd" + run, topic = "Krebs cycle " + run
    _ = person(who, decks: [("Biology", 2)])
    var app = launch(as: who)
    typeBox(app, topic + "\n")
    check(opened(app, "A topic") && (app.textFields["Topic"].value as? String) == topic, "a topic and Return open A topic with the words in")
    let saved = makeAndSave(app)
    check(saved.hasSuffix(" to " + topic), "the cards go into a new deck named for the topic: “\(saved)”")
    let d = deck(who, topic)
    check(d != nil && cardCount(who, d?["id"] as? String ?? "") > 0 && ((d?["sources"] as? [[String: Any]])?.first?["kind"] as? String) == "topic", "the deck has the cards, made from the topic")
    check(wait(text(app, topic)), "and its page opens")
    app.terminate()
    app = launch(as: who)
    typeBox(app, "Photosynthesis")
    tap(button(app, "Make cards"), "the box's Make cards")
    check(opened(app, "A topic") && (app.textFields["Topic"].value as? String) == "Photosynthesis", "the box's Make cards does the same")
    close(app)
    typeBox(app, "https://youtu.be/dQw4w9WgXcQ\n")
    check(opened(app, "YouTube") && (app.textFields["Link to the video"].value as? String) == "https://youtu.be/dQw4w9WgXcQ", "a YouTube link and Return open YouTube with the link in")
    close(app)
    app.terminate()
    app = launch(as: who)
    if pasteBox(app, "https://www.youtube.com/watch?v=dQw4w9WgXcQ") {
      check(opened(app, "YouTube") && (app.textFields["Link to the video"].value as? String) == "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "a pasted YouTube link opens YouTube at once, with the link in")
      close(app)
      let long = "The mitochondrion makes most of the cell’s ATP from sugar and oxygen.\nThe nucleus stores the cell’s DNA.\nRibosomes build proteins from amino acids."
      if pasteBox(app, long) {
        check(opened(app, "Paste") && (app.textViews["Text to make cards from"].value as? String) == long, "a long paste opens Paste with the text in")
        let s2 = makeAndSave(app)
        check(!s2.isEmpty, "and makes cards from it: “\(s2)”")
      } else { check(false, "pasted the long text into the box") }
    } else { check(false, "found the text editing menu's Paste") }
  }

  // ---------- 4: decks take material too ----------
  func test4Decks() throws {
    let who = "hme" + run, empty = "Empty one " + run
    let ids = person(who, decks: [("Anatomy", 3)])
    act(who, "deck.add", ["name": empty])
    var app = launch(as: who, ["-open", "deck:Anatomy"])
    check(wait(button(app, "Make cards")) && button(app, "New card").exists && !button(app, "Add cards").exists, "a deck's cover has Make cards and New card (no Add cards menu)")
    button(app, "Make cards").tap()
    check(wait(button(app, "A topic")) && button(app, "Close").exists, "its Make cards opens the maker")
    close(app)
    app.terminate()
    app = launch(as: who, ["-open", "deck:" + empty])
    check(wait(text(app, "No cards yet")) && wait(box(app)) && ["Paste", "YouTube", "More"].allSatisfy { button(app, $0).exists }, "an empty deck has the Make box and its row")
    snap("home-deck-empty")
    tap(button(app, "More"), "More")
    check(wait(button(app, "Photos")) && more.allSatisfy { button(app, $0).exists } && !button(app, "New deck").exists, "its More has Photos, Record a lecture, A topic, Import cards (no New deck)")
    button(app, "A topic").tap()
    check(opened(app, "A topic") && wait(button(app, empty)) && button(app, empty).isSelected, "a kind from it is set to the deck")
    close(app)
    typeBox(app, "Bones of the arm\n")
    check(opened(app, "A topic") && wait(button(app, empty)) && button(app, empty).isSelected, "and so are words in its box")
    let saved = makeAndSave(app)
    let eid = deck(who, empty)?["id"] as? String ?? ""
    check(saved.hasSuffix(" to " + empty) && cardCount(who, eid) > 0, "the cards go into that deck: “\(saved)”")
    app.terminate()
    _ = ids
    app = launch(as: who)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "New deck"), "New deck")
    let name = app.textFields["Deck name"].firstMatch   // (the name is typed on New deck's cover)
    if wait(name, 8) { name.tap(); name.typeText("Fresh " + run) } else { check(false, "found the deck's name field") }
    let done = app.keyboards.buttons.matching(NSPredicate(format: "label IN {'Done','done','return','Return'}")).firstMatch
    if done.exists { done.tap(); Thread.sleep(forTimeInterval: 0.6) }
    tap(button(app, "Create deck"), "Create deck")
    check(wait(text(app, "Fresh " + run)) && wait(text(app, "No cards yet")) && wait(box(app)), "New deck opens the new deck on its empty page, ready for material")
  }

  // ---------- 5: a brand-new account ----------
  func test5NewAccount() throws {
    let who = "hmf" + run
    let app = launch(as: who)
    check(wait(button(app, "Skip"), 20), "a brand-new account starts with the welcome")
    button(app, "Skip").tap()
    Thread.sleep(forTimeInterval: 1.0)
    tap(button(app, "Skip"), "Skip again")
    check(gone(button(app, "Skip")) && litIs(app, "Library"), "the welcome's end is the Library")
    check(wait(box(app)) && wait(buttonStarting(app, "Import cards")) && buttonStarting(app, "Connect AI").exists, "the Make box, then Import cards and Connect AI")
    check(box(app).frame.maxY < buttonStarting(app, "Import cards").frame.minY, "the box comes first")
    check(!any(app, "No decks yet").exists && !any(app, "Welcome").exists, "and no other welcome")
    snap("home-new")
    tap(buttonStarting(app, "Connect AI"), "Connect AI")
    check(wait(app.staticTexts["YOUR MCP LINK"]), "Connect AI opens Connect AI")
  }

  // ---------- 6: Assigned ----------
  func test6Assigned() throws {
    let teacher = "hmt" + run, student = "hms" + run, fresh = "hmn" + run, chapter = "Chapter 3 " + run
    let tid = person(teacher, decks: [(chapter, 3)])[chapter] ?? ""
    _ = person(student, decks: [("My own", 1)])
    _ = person(fresh)
    let k = social(teacher, "class.make", ["name": "BIO 201"])
    let code = k["code"] as? String ?? "", cid = k["id"] as? String ?? ""
    social(student, "class.join", ["code": code])
    social(fresh, "class.join", ["code": code])
    let added = social(teacher, "class.addDeck", ["id": cid, "deckId": tid])
    let soon = ISO8601DateFormatter().string(from: Date().addingTimeInterval(5 * 86400)).prefix(10)
    social(teacher, "class.assign", ["id": cid, "sharedId": added["sharedId"] as? String ?? "", "goal": "learn", "due": String(soon)])
    var app = launch(as: student)
    let row = any(app, chapter)
    check(wait(text(app, "ASSIGNED")) && wait(row) && any(app, "BIO 201").exists, "a student's Library lists what the class assigned")
    snap("home-assigned")
    row.tap()
    check(wait(button(app, "Join")) || wait(any(app, "BIO 201")), "a row opens the class")
    app.terminate()
    app = launch(as: fresh)
    check(wait(box(app)) && wait(text(app, "ASSIGNED")) && wait(any(app, chapter)), "a student with no deck yet sees it too")
    app.terminate()
    app = launch(as: teacher)
    check(wait(box(app)) && gone(text(app, "ASSIGNED"), 3), "the teacher's Library has no Assigned")
  }

  // ---------- 7: News ----------
  func test7NewsOnDiscover() throws {
    let who = "hmg" + run
    _ = person(who, decks: [("Biology", 1)])
    let app = launch(as: who)
    check(wait(box(app)) && !buttonStarting(app, "News").exists, "the Library has no bell")
    tap(button(app, "Discover"), "Discover")
    let bell = buttonStarting(app, "News")
    check(wait(bell) && bell.frame.minY < 140, "Discover's header has the bell")
    snap("home-discover")
    bell.tap()
    check(wait(app.staticTexts["News"]) && wait(button(app, "Back")), "it opens News")
    button(app, "Back").tap()
    check(wait(buttonStarting(app, "News")) && litIs(app, "Discover"), "and Back is Discover")
  }

  // ---------- 8: a folder's page ----------
  func test8Folder() throws {
    let who = "hmh" + run, topic = "Cell organelles " + run
    _ = person(who, decks: [("Biology", 1)])
    let fid = act(who, "folder.add", ["name": "Science"])["id"] as? String ?? ""
    let app = launch(as: who, ["-open", "folder:Science"])
    check(wait(button(app, "Rename")) && wait(box(app)), "a folder's page has the Make box")
    check(!button(app, "Review").exists, "(but not the due line: that's the Library's)")
    typeBox(app, topic + "\n")
    check(opened(app, "A topic"), "its words open A topic")
    let saved = makeAndSave(app)
    check(saved.hasSuffix(" to " + topic) && eventually(8) { (self.deck(who, topic)?["folder"] as? String) == fid }, "the new deck goes in the folder")
  }
}
