// The Library is the app's first page (the owner, 2026-10-01: "could we just get rid of the 'today' page"), and it makes no cards itself (the
// owner, 2026-10-02: "remove the library composer, upload buttons, cards due accross all canvas screens", then "remove the 'make cards from
// library'"): cards are made from a deck. End to end in the iPhone app, against a copy of the server on this Mac with made-up people and the AI
// stood in for (stub-ai.mjs: nothing real is asked). Each flow sets up its own people, so any one can run alone:
//   1  The tab bar is Library, Discover, Stats and Profile, and the app opens on the Library: no Make box, no Upload, Paste, YouTube and More row,
//      no line of what's due; its + is New deck and Import cards (no Make cards), and each opens. `-open today` (the old page's name) opens it.
//   2  A deck's page: its cover has Make cards and New card; no Due, New and Remembered tiles, no Practice test, no exam line, and the line under
//      its name says only how many cards; its tabs are Sources, Cards, Notes, Diagrams, right under Flashcards and Learn, open on Cards. Its Make
//      cards opens the maker set to the deck, and the cards go into it (and the line still says only how many).
//   3  An empty deck: its cover ("No cards yet", Make cards and New card) and nothing under it; its Make cards is set to it; New deck opens a new
//      deck there.
//   4  A brand-new account: the welcome, whose end is the Library: three plain tiles side by side, New deck, Import cards and Connect AI, and no
//      other words; each opens its page.
//   5  No Classes (the owner, 2026-10-02: "remove the 'classes' page everywhere"): with a class still on the server (older apps use it), a
//      student in it, one with no deck yet and its teacher see only Decks and All cards, no Assigned and no class words; the teacher's deck
//      that's in it is a plain private deck (no Class mark; its Sharing says Private, "Only you.").
//   6  Notifications is the bell in Discover's header; it opens Notifications, and Back is Discover.
//   7  A folder's page has nothing to make cards either, and keeps its Practice test.
// Run it with ios/tools/e2e-home.sh (a fresh server and the stand-in AI). It only runs when LUCIDA_HOME is set.
import XCTest

final class HomeTests: AppCase {
  override class var label: String { "Home" }
  override class var switchName: String { "LUCIDA_HOME" }
  private let tabs = ["Library", "Discover", "Stats", "Profile"]

  // ---------- helpers ----------
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
  /// Nothing of the Library's old top: no Make box, no row, no line of what's due.
  private func noMaking(_ app: XCUIApplication) -> Bool {
    !app.descendants(matching: .any).matching(identifier: "makeBox").firstMatch.exists && !any(app, "What do you want to study?").exists
      && !["Upload", "Paste", "YouTube", "More"].contains { button(app, $0).exists } && !any(app, "cards due").exists && !any(app, "card due").exists && !button(app, "Review").exists
  }
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
  /// The new account's New deck tile (the title's + is called New deck too: the tile is the lower one).
  private func newDeckTile(_ app: XCUIApplication) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label == 'New deck'")).allElementsBoundByIndex.max { $0.frame.minY < $1.frame.minY } ?? button(app, "New deck")
  }
  /// The deck page's tabs, left to right (their labels, like "Cards 3").
  private func deckTabs(_ app: XCUIApplication) -> [String] {
    ["Sources", "Cards", "Notes", "Diagrams"].map { buttonStarting(app, $0) }.filter(\.exists).sorted { $0.frame.minX < $1.frame.minX }.map(\.label)
  }

  // ---------- 1: the first page ----------
  func test1FirstPage() throws {
    let who = "hma" + run
    _ = person(who, decks: [("Anatomy", 3)], due: true)
    var app = launch(as: who)
    check(wait(button(app, "Library")) && tabs.allSatisfy { button(app, $0).exists } && !button(app, "Today").exists, "the tab bar is Library, Discover, Stats and Profile (no Today)")
    check(litIs(app, "Library"), "the app opens on the Library, lit")
    check(wait(button(app, "Anatomy")) || wait(any(app, "Anatomy")), "with your decks")
    check(noMaking(app), "no Make box, no Upload, Paste, YouTube and More row, no line of what's due (the owner, 2 Oct)")
    check(!any(app, "streak").exists, "and no streak line (that's on Stats)")
    snap("home-library")
    tap(button(app, "Add"), "the Library's +")
    check(wait(button(app, "New deck")) && button(app, "Import cards").exists && !button(app, "Make cards").exists, "its + is New deck and Import cards, with no Make cards")
    check(app.alerts.count == 0 && app.sheets.count == 0, "(Lucida's own menu, no system one)")
    snap("home-plus")
    button(app, "New deck").tap()
    check(wait(button(app, "Create deck")), "+ → New deck opens New deck")
    app.terminate()
    app = launch(as: who)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "Import cards"), "Import cards")
    check(wait(button(app, "Choose a file")), "+ → Import cards opens Import cards")
    app.terminate()
    let calm = "hmb" + run
    _ = person(calm, decks: [("History", 2)])
    let app2 = launch(as: calm, ["-open", "today"])
    check(wait(button(app2, "Add")) && litIs(app2, "Library") && noMaking(app2), "`-open today` opens the Library, the same")
  }

  // ---------- 2: a deck's page ----------
  func test2Deck() throws {
    let who = "hme" + run, topic = "Bones of the leg " + run
    let ids = person(who, decks: [("Anatomy", 3)], due: true)
    let id = ids["Anatomy"] ?? ""
    let exam = ISO8601DateFormatter().string(from: Date().addingTimeInterval(9 * 86400)).prefix(10)
    act(who, "deck.update", ["id": id, "patch": ["exam": String(exam)]])
    var app = launch(as: who, ["-open", "deck:Anatomy"])
    check(wait(button(app, "Make cards")) && button(app, "New card").exists && !button(app, "Add cards").exists, "a deck's cover has Make cards and New card (no Add cards menu)")
    check(wait(text(app, "3 cards")), "the line under its name says only how many cards")
    check(!text(app, "Due").exists && !text(app, "Remembered").exists && !text(app, "New").exists, "no Due, New and Remembered tiles (the owner: \"remove these mini stats\")")
    check(!buttonStarting(app, "Practice test").exists && !text(app, "Practice tests").exists, "no Practice test (the owner: \"remove practice tests\")")
    check(!any(app, "Exam in").exists && !any(app, "cards to review first").exists, "no exam line")
    check(wait(buttonStarting(app, "Flashcards")) && buttonStarting(app, "Flashcards").label.contains("3"), "Flashcards keeps its count of cards due")
    let order = deckTabs(app)
    check(order.map { String($0.split(separator: " ").first ?? "") } == ["Sources", "Cards", "Notes", "Diagrams"], "its tabs are Sources, Cards, Notes and Diagrams, in that order (\(order))")
    check(buttonStarting(app, "Cards").isSelected, "and it opens on Cards")
    let learn = button(app, "Learn"), first = buttonStarting(app, "Sources")
    check(learn.exists && first.exists && first.frame.minY - learn.frame.maxY >= 0 && first.frame.minY - learn.frame.maxY <= 20, "right under Flashcards and Learn (\(Int(first.frame.minY - learn.frame.maxY)) points)")
    snap("home-deck")
    button(app, "Make cards").tap()
    check(wait(button(app, "A topic")) && button(app, "Close").exists, "its Make cards opens the maker")
    button(app, "A topic").tap()
    check(opened(app, "A topic") && wait(button(app, "Anatomy")) && button(app, "Anatomy").isSelected, "set to the deck")
    typeInto(app.textFields["Topic"], topic)
    let saved = makeAndSave(app)
    let n = cardCount(who, id)
    check(saved.hasSuffix(" to Anatomy") && n > 3, "the cards go into the deck: “\(saved)”")
    app.terminate()
    app = launch(as: who, ["-open", "deck:Anatomy"])
    check(wait(text(app, "\(n) cards")) && !any(app, "from your AI").exists, "and the line still says only how many cards, not how many Lucida made (the owner: \"remove the '38 added by ai'\")")
    check(wait(buttonStarting(app, "Sources 1")), "with what they were made from under Sources")
  }

  // ---------- 3: an empty deck, New deck ----------
  func test3EmptyDeck() throws {
    let who = "hmc" + run, empty = "Empty one " + run
    _ = person(who, decks: [("Anatomy", 3)])
    act(who, "deck.add", ["name": empty])
    var app = launch(as: who, ["-open", "deck:" + empty])
    check(wait(text(app, "No cards yet")) && wait(button(app, "Make cards")) && button(app, "New card").exists, "an empty deck's cover has No cards yet, Make cards and New card")
    check(noMaking(app), "and nothing under it: no Make box, no row")
    snap("home-deck-empty")
    button(app, "Make cards").tap()
    check(wait(button(app, "A topic")), "its Make cards opens the maker")
    button(app, "A topic").tap()
    check(opened(app, "A topic") && wait(button(app, empty)) && button(app, empty).isSelected, "set to the deck")
    typeInto(app.textFields["Topic"], "Bones of the arm")
    let saved = makeAndSave(app)
    let eid = deck(who, empty)?["id"] as? String ?? ""
    check(saved.hasSuffix(" to " + empty) && cardCount(who, eid) > 0, "the cards go into that deck: “\(saved)”")
    app.terminate()
    app = launch(as: who)
    tap(button(app, "Add"), "the Library's +")
    tap(button(app, "New deck"), "New deck")
    let name = app.textFields["Deck name"].firstMatch   // (the name is typed on New deck's cover)
    if wait(name, 8) { name.tap(); name.typeText("Fresh " + run) } else { check(false, "found the deck's name field") }
    let done = app.keyboards.buttons.matching(NSPredicate(format: "label IN {'Done','done','return','Return'}")).firstMatch
    if done.exists { done.tap(); Thread.sleep(forTimeInterval: 0.6) }
    tap(button(app, "Create deck"), "Create deck")
    check(wait(text(app, "Fresh " + run)) && wait(text(app, "No cards yet")) && wait(button(app, "Make cards")), "New deck opens the new deck on its empty page, with Make cards")
  }

  // ---------- 4: a brand-new account ----------
  func test4NewAccount() throws {
    let who = "hmf" + run
    var app = launch(as: who)
    check(wait(button(app, "Skip"), 20), "a brand-new account starts with the welcome")
    button(app, "Skip").tap()
    Thread.sleep(forTimeInterval: 1.0)
    tap(button(app, "Skip"), "Skip again")
    check(gone(button(app, "Skip")) && litIs(app, "Library"), "the welcome's end is the Library")
    check(wait(button(app, "Import cards"), 8), "the Library opens")
    let tiles = [newDeckTile(app), button(app, "Import cards"), button(app, "Connect AI")]
    check(tiles.allSatisfy { wait($0, 8) }, "three tiles: New deck, Import cards and Connect AI")
    check(Set(tiles.map { Int($0.frame.minY) }).count == 1 && tiles[0].frame.maxX < tiles[1].frame.minX && tiles[1].frame.maxX < tiles[2].frame.minX, "side by side, in that order")
    check(!any(app, "From Anki").exists && !any(app, "Let Claude").exists && !any(app, "No decks yet").exists && !any(app, "Welcome").exists && noMaking(app), "and no other words: no lines under them, no box, no row")
    snap("home-new")
    tap(button(app, "Connect AI"), "Connect AI")
    check(wait(app.staticTexts["YOUR MCP LINK"]), "Connect AI opens Connect AI")
    app.terminate()
    app = launch(as: who)
    tap(button(app, "Import cards"), "Import cards")
    check(wait(button(app, "Choose a file")), "Import cards opens Import cards")
    app.terminate()
    app = launch(as: who)
    check(wait(button(app, "Import cards"), 8), "the Library opens again")
    tap(newDeckTile(app), "the New deck tile")
    check(wait(button(app, "Create deck")), "New deck opens New deck")
  }


  // ---------- 5: no Classes ----------
  /// Any word of the classes on screen ("Class", "classes", "Assigned").
  private func classWords(_ app: XCUIApplication) -> Bool {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'class' OR label CONTAINS[c] 'assigned'")).firstMatch.exists
  }
  func test5NoClasses() throws {
    let teacher = "hmt" + run, student = "hms" + run, fresh = "hmn" + run, chapter = "Chapter 3 " + run
    let tid = person(teacher, decks: [(chapter, 3)])[chapter] ?? ""
    _ = person(student, decks: [("My own", 1)])
    _ = person(fresh)
    // A class made before (the server still has them, for older apps): the teacher's deck in it, assigned, and two students in it.
    let k = social(teacher, "class.make", ["name": "BIO 201"])
    let code = k["code"] as? String ?? "", cid = k["id"] as? String ?? ""
    social(student, "class.join", ["code": code])
    social(fresh, "class.join", ["code": code])
    let added = social(teacher, "class.addDeck", ["id": cid, "deckId": tid])
    let soon = ISO8601DateFormatter().string(from: Date().addingTimeInterval(5 * 86400)).prefix(10)
    social(teacher, "class.assign", ["id": cid, "sharedId": added["sharedId"] as? String ?? "", "goal": "learn", "due": String(soon)])
    check(!code.isEmpty && !((state(student)["classes"] as? [Any]) ?? []).isEmpty, "the server still keeps the class and its assignment")
    var app = launch(as: student)
    check(wait(button(app, "Decks")) && wait(button(app, "All cards")), "the Library's switch is Decks and All cards")
    check(!button(app, "Classes").exists && !text(app, "ASSIGNED").exists && !any(app, chapter).exists && !any(app, "BIO 201").exists, "no Classes, and nothing a class assigned")
    check(!classWords(app), "no class words on the Library")
    snap("home-no-classes")
    tap(button(app, "All cards"), "All cards")
    check(wait(app.textFields["Search all cards"].firstMatch, 8) || wait(any(app, "Search all cards"), 8), "All cards opens")
    check(!button(app, "Classes").exists && !classWords(app), "and has no Classes either")
    app.terminate()
    app = launch(as: fresh)
    check(wait(button(app, "Import cards")) && !text(app, "ASSIGNED").exists && !any(app, chapter).exists, "a student with no deck yet gets the three tiles, and nothing assigned")
    check(button(app, "Decks").exists && !button(app, "Classes").exists && !classWords(app), "and a switch with no Classes")
    app.terminate()
    app = launch(as: teacher)
    let row = any(app, chapter)
    check(wait(row) && !classWords(app), "the teacher's deck that's in the class is a plain deck: no Class mark")
    row.tap()
    tap(button(app, "Deck settings"), "Deck settings")
    tap(app.buttons["Sharing"].firstMatch, "the Sharing tab")
    check(wait(app.staticTexts["Only you."], 8) && !classWords(app), "its Sharing says Private (Only you.), never your classes")
    snap("home-no-classes-sharing")
  }

  // ---------- 6: News ----------
  func test6NewsOnDiscover() throws {
    let who = "hmg" + run
    _ = person(who, decks: [("Biology", 1)])
    let app = launch(as: who)
    check(wait(button(app, "Add")) && !buttonStarting(app, "Notifications").exists, "the Library has no bell")
    tap(button(app, "Discover"), "Discover")
    let bell = buttonStarting(app, "Notifications")
    check(wait(bell) && bell.frame.minY < 140, "Discover's header has the bell")
    snap("home-discover")
    bell.tap()
    check(wait(app.staticTexts["Notifications"]) && wait(button(app, "Back")), "it opens Notifications")
    button(app, "Back").tap()
    check(wait(buttonStarting(app, "Notifications")) && litIs(app, "Discover"), "and Back is Discover")
  }

  // ---------- 7: a folder's page ----------
  func test7Folder() throws {
    let who = "hmh" + run
    let ids = person(who, decks: [("Biology", 2)])
    let fid = act(who, "folder.add", ["name": "Science"])["id"] as? String ?? ""
    act(who, "deck.move", ["id": ids["Biology"] ?? "", "folder": fid])
    let app = launch(as: who, ["-open", "folder:Science"])
    check(wait(button(app, "Rename")) && wait(any(app, "Biology")), "a folder's page opens, with its deck")
    check(noMaking(app) && !button(app, "Make cards").exists, "it has nothing to make cards either")
    check(wait(buttonStarting(app, "Practice test")), "and keeps its Practice test")
    snap("home-folder")
  }
}
