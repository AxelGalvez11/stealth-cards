// A deck's Notes (the Guide and its pages) and Sources, end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its lc_dev cookie,
// which the debug-only `-dev <name>` launch argument sets) and the AI stood in for (tests/stub-ai.mjs): the same story as the web's own tests (notes-ui, notes-editor,
// sources-ui, deck-tabs-ui), in flows that each set up their own people. The Sources come from ios/tests/js/guide-seed.mjs, which makes them with the server's own make
// steps (a PDF, a recording kept as thirteen files that is almost two hours long, a video, pictures, pasted text, a topic).
//   01  a deck with no notes says No notes yet on Notes, with New note, which opens the Notes page (the Guide); what is typed is saved by itself; Done lands on
//       Notes, which list the note
//   02  writing: the shortcuts (# - [] 1. ---), Enter and Backspace, Aa (Heading, Text), To-do and Bullets, Bold on selected words, a link, the keyboard-down button,
//       the bar above the keyboard and the header staying put
//   03  the page drawn (opened from the Notes list): the heading, table, boxes and quote, and nothing in a page can run: a script, an onerror picture, a javascript:
//       link, an outside picture
//   04  Older versions (⋯) lists them; Restore brings one back and keeps what it replaced
//   05  pages nest (V176, V185): Add a page inside (under the note, and in ⋯) makes one inside the open page, named by its first heading; the page's path;
//       Pages inside; the deck's Notes as a tree (further in, an arrow that hides and shows, + on a row, New note); Rename page and Delete page (asks first;
//       what was inside moves up); at ten pages Add a page inside goes away
//   06  Make cards (⋯) from the page, or from just what is selected
//   07  the deck page's Notes list the notes (V176); each opens its Notes page, where toggles open and close (and this phone remembers), a section folds, and a
//       tap on the words puts the caret there; Done comes back to Notes
//   08  a deck you only study lists its notes (no New note, no +) and opens its Notes page to read (no ⋯, no Add a page inside), and has no Sources tab
//   09  the Sources list, each kind's viewer, a recording of thirteen files plays the part that covers the card's time, a PDF opens at its page, a video opens at the time
//   10  the "Made from" line in the card editor opens the source at that spot (Sources, viewer open); More cards from a source; Delete (asks first: the file goes, the cards stay,
//       the line turns to plain words)
//   11  a shared deck's page shows its Notes (a toggle anyone can open) and "Made from 2 sources", with no names
//   12  the deck's + menu (New card, Make cards, Notes; no Add cards menu); dark mode; nothing says "AI generated"
//   13  a toggle and a section: "> " makes a toggle, Enter writes inside it, it closes and opens, a heading's ▸ folds its section; none of that changes the words saved,
//       and this phone remembers it (opened again, and from the deck page's Notes)
//   14  the outline: the rail of the headings at the Notes page's right; a tap opens their tree in Lucida's own sheet (the current one selected); a heading scrolls
//       there and closes it (a closed toggle's heading opens it, a folded section's subheading unfolds it); a heading typed joins it; no rail while a line is written;
//       none on the deck page's Notes tab; a shared deck's, once shown in full, staying in view as the page scrolls
// Run it with ios/tools/e2e-guide.sh (it starts a fresh server on port 3934 and the stand-in AI on 3939). It only runs when LUCIDA_GUIDE is set, so the other scripts keep running
// their own checks alone.
import XCTest

final class GuideTests: XCTestCase {
  static let env = ProcessInfo.processInfo.environment
  static let server = env["LUCIDA_SERVER"] ?? "http://127.0.0.1:3934"
  static let fixtures = env["LUCIDA_FIXTURES"] ?? ""
  /// How much longer to wait than usual (a busy Mac answers slowly; a wait only lasts its whole time when what it waits for isn't there).
  static let slow = Double(env["LUCIDA_SLOW"] ?? "") ?? 2
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_GUIDE"] != nil, "Run with ios/tools/e2e-guide.sh")
  }
  override class func tearDown() { print("Guide: \(passed) passed, \(failed) failed") }

  // ---------- the people the seed made ----------
  private lazy var seed: [String: Any] = {
    guard let path = Self.env["LUCIDA_SEED"], let d = FileManager.default.contents(atPath: path) else { return [:] }
    return (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] ?? [:]
  }()
  private func S(_ key: String) -> String { seed[key] as? String ?? "" }
  private func src(_ kind: String) -> [String: Any] { (seed["sources"] as? [String: Any])?[kind] as? [String: Any] ?? [:] }
  private func sid(_ kind: String) -> String { src(kind == "pdf" ? "file" : kind)["id"] as? String ?? "" }
  /// How many Sources the main deck was made with.
  private var sourceCount: Int { seed["sourceCount"] as? Int ?? 7 }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else { Self.failed += 1; print("  FAIL " + name); XCTFail(name); snap("guide-fail-\(Self.failed)") }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
    // (and what is on screen, as the accessibility tree has it, for a failure)
    if name.hasPrefix("guide-fail") { try? XCUIApplication().debugDescription.write(toFile: dir + "/" + name + ".txt", atomically: true, encoding: .utf8) }
  }
  private func fx(_ name: String) -> String { Self.fixtures + "/" + name }
  /// A request as one of the made-up people ("": nobody); the answer's JSON and its status.
  @discardableResult
  private func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil, raw: Data? = nil, type: String = "application/json") -> (status: Int, json: Any?, data: Data?) {
    var r = URLRequest(url: URL(string: Self.server + path)!)
    r.httpMethod = method
    if !who.isEmpty { r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie") }
    r.setValue(type, forHTTPHeaderField: "Content-Type")
    if let raw { r.httpBody = raw } else if let body { r.httpBody = try? JSONSerialization.data(withJSONObject: body) }
    let done = DispatchSemaphore(value: 0)
    var out: (Int, Any?, Data?) = (0, nil, nil)
    URLSession.shared.dataTask(with: r) { data, resp, _ in
      out = ((resp as? HTTPURLResponse)?.statusCode ?? 0, data.flatMap { try? JSONSerialization.jsonObject(with: $0) }, data)
      done.signal()
    }.resume()
    _ = done.wait(timeout: .now() + 30)
    return out
  }
  @discardableResult
  private func act(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/action", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  private func state(_ who: String) -> [String: Any] { api(who, "GET", "/api/state").json as? [String: Any] ?? [:] }
  private func decks(_ who: String) -> [[String: Any]] { state(who)["decks"] as? [[String: Any]] ?? [] }
  private func deck(_ who: String, _ name: String) -> [String: Any]? { decks(who).first { $0["name"] as? String == name } }
  private func cards(_ who: String, in deckId: String) -> [[String: Any]] { (state(who)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deckId } }
  /// A deck's Guide as the server keeps it: its words, and its pages.
  private func guide(_ who: String, _ deckId: String) -> (text: String, pages: [[String: Any]]) {
    let g = decks(who).first { $0["id"] as? String == deckId }?["guide"] as? [String: Any]
    return (g?["text"] as? String ?? "", g?["pages"] as? [[String: Any]] ?? [])
  }
  private func history(_ who: String, _ deckId: String, page: String = "main") -> [String] {
    ((api(who, "GET", "/api/guide/history?deck=\(deckId)&page=\(page)").json as? [String: Any])?["versions"] as? [[String: Any]] ?? []).compactMap { $0["text"] as? String }
  }
  /// A made-up person with a deck (and its cards), ready to open.
  @discardableResult
  private func person(_ who: String, deck name: String, cards n: Int = 1) -> String {
    act(who, "settings.update", ["patch": ["welcomed": true]])
    let id = act(who, "deck.add", ["name": name])["id"] as? String ?? ""
    for i in 0..<n { act(who, "card.add", ["deckId": id, "kind": "basic", "front": "Question \(i + 1) of \(name)?", "back": "Answer \(i + 1)"]) }
    return id
  }
  /// Waits for a condition on the server (a save that goes out a moment after a tap).
  private func eventually(_ s: TimeInterval = 12, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s * Self.slow)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
  }
  private func media(_ who: String, _ name: String) -> Int {
    var r = URLRequest(url: URL(string: Self.server + "/media/" + name)!)
    r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie")
    let done = DispatchSemaphore(value: 0)
    var status = 0
    URLSession.shared.dataTask(with: r) { _, resp, _ in status = (resp as? HTTPURLResponse)?.statusCode ?? 0; done.signal() }.resume()
    _ = done.wait(timeout: .now() + 30)
    return status
  }
  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  /// Anything on screen whose label has these words.
  private func any(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  /// Anything on screen whose label or value has these words (a paragraph of a Guide says where its links go in its value).
  private func anyValue(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@ OR value CONTAINS %@", words, words)).firstMatch
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch }
  /// How many Make cards buttons show: the deck's cover has one (your own deck), and the Notes their own when there is something to make cards from.
  private func makeButtons(_ app: XCUIApplication) -> Int { app.buttons.matching(NSPredicate(format: "label == %@", "Make cards")).count }
  /// A row of the deck cover's + (Lucida's own menu: New card, Make cards, Source, Notes, Upload diagram, Make diagram).
  private func fromDeckMenu(_ app: XCUIApplication, _ row: String) {
    let r = app.otherElements.matching(NSPredicate(format: "identifier BEGINSWITH %@", "menu.")).buttons.matching(NSPredicate(format: "label == %@", row)).firstMatch   // (a row of the open menu: the page has a Notes tab too)
    if !(r.exists && r.isHittable) { tap(app.buttons["deck.add"].firstMatch, "the deck’s +") }
    tap(r, "+ › " + row)
  }
  private func text(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.staticTexts.matching(NSPredicate(format: "label == %@", label)).firstMatch }
  private func textHas(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool { e.waitForExistence(timeout: s * Self.slow) }
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool {
    let end = Date().addingTimeInterval(s * Self.slow)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  /// Taps something once it's there; if it never is, that's a failed check (a missing element would end the whole test).
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 12 * Self.slow) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  private func selected(_ e: XCUIElement) -> Bool { e.isSelected }
  /// A position for a message (an element that isn't there has an infinite one).
  private func pt(_ v: CGFloat) -> Int { v.isFinite ? Int(v) : -1 }
  /// A question is Lucida's own sheet from the bottom, over a dimmed page: a touch on the dimmed part (the top of the screen) closes it, as Cancel does.
  private func dismissDialog(_ app: XCUIApplication) {
    guard app.buttons["question.cancel"].waitForExistence(timeout: 8 * Self.slow) else { check(false, "found the question to close"); return }
    check(app.alerts.count == 0 && app.sheets.count == 0 && app.popovers.count == 0, "(it is Lucida’s own question, not the system’s)")
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.08)).tap()
  }
  /// The question's own answer (the page behind it has buttons of the same name).
  private func dialogButton(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons["question.go"].firstMatch }
  /// A card's row on the deck page, brought to the middle of the screen and left to settle: the page keeps moving a moment after it is scrolled, and a touch that
  /// lands on a moving page only stops it (a tap is not a tap then).
  private func cardRow(_ app: XCUIApplication, _ front: String) -> XCUIElement {
    let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", front)).firstMatch
    guard row.waitForExistence(timeout: 12 * Self.slow) else { return row }
    var tries = 0
    while tries < 14 && !(row.frame.minY > 150 && row.frame.maxY < 720) {
      if row.frame.minY >= 720 { app.swipeUp(velocity: .slow) } else { app.swipeDown(velocity: .slow) }
      Thread.sleep(forTimeInterval: 1.3)
      tries += 1
    }
    Thread.sleep(forTimeInterval: 1)
    return row
  }
  /// Nothing on screen says anything is "AI generated": the owner doesn't want that label anywhere.
  private func noLabel(_ app: XCUIApplication, _ where_: String) {
    let bad = app.descendants(matching: .any).matching(NSPredicate(format: "label MATCHES[c] %@", ".*(ai[- ]generated|generated (by|with) ai|made with ai|madewithai|aigc).*")).count
    check(bad == 0, where_ + ": nothing says “AI generated”")
  }

  // ---------- the Notes page ----------
  /// A line of the page, by its words (a line is a text field of its own, whether it's being written in or read).
  private func line(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.textViews.matching(NSPredicate(format: "value == %@", words)).firstMatch }
  private func lineHas(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.textViews.matching(NSPredicate(format: "value CONTAINS %@", words)).firstMatch }
  /// The line being written in.
  private func focused(_ app: XCUIApplication) -> XCUIElement { app.textViews.matching(NSPredicate(format: "hasKeyboardFocus == true")).firstMatch }
  private func focusedValue(_ app: XCUIApplication) -> String { focused(app).value as? String ?? "" }
  /// The Notes page is on screen (its back button, and a line to write in).
  private func onPage(_ app: XCUIApplication, _ s: TimeInterval = 15) -> Bool { wait(app.buttons["backButton"], s) && wait(app.textViews.firstMatch, s) }
  private func openPage(_ who: String, deck name: String, page: String = "", extra: [String] = []) -> XCUIApplication {
    let app = launch(as: who, ["-open", "guide:" + name + (page.isEmpty ? "" : ":" + page)] + extra)
    check(onPage(app), "the Notes page opens")
    return app
  }
  /// Words typed where the caret is (Enter goes separately: the caret moves to another line, and the next words wait for it to be there).
  private func type(_ app: XCUIApplication, _ words: String) {
    let parts = words.components(separatedBy: "\n")
    for (i, p) in parts.enumerated() {
      if !p.isEmpty { app.typeText(p) }
      if i < parts.count - 1 { let before = focused(app).frame; app.typeText("\n"); _ = eventually(3) { self.focused(app).frame != before }; Thread.sleep(forTimeInterval: 0.3) }
    }
  }
  /// The caret at the end of a line (a tap at its far right).
  private func tapEnd(_ e: XCUIElement) { e.coordinate(withNormalizedOffset: CGVector(dx: 0.99, dy: 0.5)).tap(); Thread.sleep(forTimeInterval: 0.6) }
  private func key(_ app: XCUIApplication, _ label: String) { tap(app.buttons[label].firstMatch, label) }
  /// The last word of a line (the caret at its end) selected: ⌥⇧← first; with the phone's own keyboard up a hardware key may not reach the field, so then a
  /// double tap on the word (Geist at 16 points is about 7.6 points a letter).
  private func selectLastWord(_ app: XCUIApplication, _ e: XCUIElement, _ text: String) {
    app.typeKey(XCUIKeyboardKey.leftArrow.rawValue, modifierFlags: [.option, .shift])
    if app.buttons["Bold"].waitForExistence(timeout: 2) { return }
    let last = CGFloat(text.components(separatedBy: " ").last?.count ?? 1), x = (CGFloat(text.count) - last / 2) * 7.6
    e.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5)).withOffset(CGVector(dx: x, dy: 0)).doubleTap()
    Thread.sleep(forTimeInterval: 0.6)
  }
  /// ⋯, then one of its rows.
  /// (the menu's row: Add a page inside is also a button under the note, which carries an identifier; the menu's rows carry none)
  private func more(_ app: XCUIApplication, _ row: String) {
    tap(app.buttons["More"].firstMatch, "More")
    tap(app.buttons.matching(NSPredicate(format: "label == %@ AND NOT (identifier BEGINSWITH %@)", row, "notes.")).firstMatch, row)
  }
  /// A note in the deck's Notes list (V176), and a page's place in a page's path.
  private func noteRow(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.row", words)).firstMatch }
  private func done(_ app: XCUIApplication) { tap(app.buttons["backButton"], "Done") }
  private func saved(_ who: String, _ id: String, page: String = "") -> String { page.isEmpty ? guide(who, id).text : (guide(who, id).pages.first { $0["id"] as? String == page }?["text"] as? String ?? "") }
  private func shown(_ e: XCUIElement) -> Bool { e.exists && e.frame.height > 1 && e.isHittable }

  // ---------- 01: no Guide: a blank note; a tap opens the Notes page, which saves as it's typed ----------
  func test01NoGuide() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdn" + run, name = "Plain deck " + run
    let id = person(who, deck: name, cards: 2)
    let app = launch(as: who, ["-open", "deck:" + name])
    check(wait(button(app, "Cards")) && selected(button(app, "Cards")) && !selected(button(app, "Notes")) && !selected(button(app, "Sources")), "the deck page opens on Cards")
    check(button(app, "Notes").exists && button(app, "Diagrams").exists && button(app, "Sources").exists, "with Sources, Notes and Diagrams beside it (a deck of your own; no counts)")
    check(textHas(app, "Question 1 of").exists && !line(app, "Title").exists, "the cards show, and no Notes in the way")
    tap(button(app, "Notes"), "Notes")
    // (V176: the Notes tab is a list of notes, like the Cards tab)
    check(wait(text(app, "No notes yet")) && app.buttons["notes.new"].exists && app.textViews.count == 0, "Notes with nothing written says No notes yet, with New note (no page of notes in the tab)")
    snap("guide-empty")
    tap(app.buttons["notes.new"], "New note")
    check(onPage(app) && eventually(5) { self.focusedValue(app) == "Title" }, "New note opens the Notes page (the Guide itself, while it has no words) with the caret in its title")
    check(guide(who, id).pages.isEmpty, "(and makes no page: the Guide is the first note)")
    check(wait(app.buttons["Text style"]) && app.buttons["To-do"].exists && app.buttons["Bullets"].exists && app.buttons["Toggle"].exists && app.buttons["Hide the keyboard"].exists,
          "Lucida's own bar is above the keyboard: Aa, To-do, Bullets, Toggle, the keyboard-down button")
    check(app.buttons["More"].exists && app.buttons["notes.addPage"].exists && text(app, name).exists && app.descendants(matching: .any)["notes.path"].exists, "with ⋯, Add a page inside, the deck's name and the page's path")
    check(!button(app, "Write").exists && !button(app, "Preview").exists, "and no Write or Preview: the page is always formatted")
    noLabel(app, "the Notes page")
    type(app, "Cell Biology: Exam 1\nEverything for the first exam.")
    check(eventually { self.guide(who, id).text == "# Cell Biology: Exam 1\n\nEverything for the first exam.\n" }, "what is typed is saved a moment later as Markdown, with no button (" + guide(who, id).text.replacingOccurrences(of: "\n", with: "\\n") + ")")
    check(wait(app.staticTexts["saveLabel"]) && eventually(4) { app.staticTexts["saveLabel"].label == "Saved" }, "the page says Saved")
    check(line(app, "Cell Biology: Exam 1").exists && (line(app, "Cell Biology: Exam 1").label == "Heading"), "the title is a heading")
    done(app)
    let row = app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.row", "Cell Biology: Exam 1")).firstMatch
    check(wait(row) && selected(button(app, "Notes")) && (row.value as? String ?? "").contains("Everything for the first exam."), "Done goes back to the deck's Notes, which list the note by its title, with its first words")
    noLabel(app, "the Notes")
    // a tab that isn't there opens Cards
    let app2 = launch(as: who, ["-open", "deck:" + name, "-deckTab", "nowhere"])
    check(wait(button(app2, "Cards")) && selected(button(app2, "Cards")) && !selected(button(app2, "Notes")), "a tab that isn’t there opens Cards")
    // a deck with no cards but a Guide keeps its page, and says so on Cards
    let bare = "Only a guide " + run, bid = person(who, deck: bare, cards: 0)
    act(who, "guide.save", ["deckId": bid, "text": "# Plan\n\nWrite the cards later."])
    let app3 = launch(as: who, ["-open", "deck:" + bare])
    check(wait(button(app3, "Cards")) && button(app3, "Notes").exists && wait(text(app3, "No cards yet")) && button(app3, "New card").exists && button(app3, "Make cards").exists,
          "a deck with no cards but a Guide keeps its tabs, and says so on Cards (No cards yet, with New card and Make cards)")
    tap(button(app3, "Notes"), "Notes")
    check(wait(app3.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.row", "Plan")).firstMatch), "and its Notes list the Guide")
  }

  // ---------- 02: writing ----------
  func test02Writing() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdw" + run, name = "Writing deck " + run
    let id = person(who, deck: name)
    let app = openPage(who, deck: name)
    // an empty Guide opens with the caret in its title, the keyboard up, and the bar right above it
    check(eventually(6) { self.focusedValue(app) == "Title" }, "an empty Guide opens on its title, ready to type")
    let kb = app.keyboards.firstMatch, back = app.buttons["backButton"], top = back.frame.minY
    check(wait(app.buttons["Text style"]), "the bar is up while a line is written in")
    Thread.sleep(forTimeInterval: 1.5)   // (the keyboard has come up)
    // (with the phone's own keyboard the bar sits right on it; with a hardware keyboard, at the bottom of the screen above the home indicator)
    let screen = app.windows.firstMatch.frame.maxY, up = kb.exists && kb.frame.minY < screen - 10
    let barBottom = app.buttons["Text style"].frame.maxY, floor = up ? kb.frame.minY : screen - 34
    // (the keyboard's own frame here starts below its row of suggestions, which the bar sits on)
    check(barBottom <= floor + 1 && floor - barBottom < (up ? 56 : 14), "the bar sits right on top of the " + (up ? "keyboard" : "home indicator (a hardware keyboard)") + " (\(pt(barBottom)) and \(pt(floor)))")
    check(top > 40 && abs(back.frame.minY - top) <= 1, "and the header stays under the status bar")
    type(app, "Plan\n- one\ntwo\n\nthree\n[] milk\n\n1. first\n\n## Part two\n---")
    check(eventually { self.saved(who, id) == "# Plan\n\n- one\n- two\n\nthree\n\n- [ ] milk\n\n1. first\n\n## Part two\n\n---\n" },
          "the shortcuts make blocks (“- ” a bullet, “[] ” a to-do, “1. ” a numbered item, “## ” a subheading, “---” a divider), Enter goes on with the same kind, and Enter on an empty item makes text: " + saved(who, id).replacingOccurrences(of: "\n", with: "\\n"))
    check(line(app, "one").label == "List" && line(app, "milk").label == "To-do" && line(app, "Part two").label == "Subheading", "each line is its kind, with no marks to see")
    check(!lineHas(app, "- one").exists && !lineHas(app, "[]").exists && !lineHas(app, "##").exists, "(the marks are gone once typed)")
    snap("guide-writing")
    // Backspace at the start of a line makes it text (with its words kept: ios/tests/swift/notes and the web's own tests check that part)
    type(app, "- ")
    check(eventually(4) { self.focused(app).label == "List" }, "“- ” makes a bullet")
    app.typeText(XCUIKeyboardKey.delete.rawValue)
    check(eventually(4) { self.focused(app).label == "Text" }, "Backspace at the start of an item makes it text")
    type(app, "gone")
    // Aa: Heading, then Text; To-do and Bullets
    key(app, "Text style")
    check(wait(app.buttons["Heading"]) && app.buttons["Subheading"].exists && app.buttons["Text"].exists, "Aa shows Heading, Subheading and Text")
    key(app, "Heading")
    check(eventually(4) { self.focused(app).label == "Heading" } && gone(app.buttons["Subheading"], 4), "Heading makes the line a heading (and Aa's choices close)")
    key(app, "Text style"); key(app, "Text")
    check(eventually(4) { self.focused(app).label == "Text" }, "and Text makes it text again")
    key(app, "Text style"); key(app, "Close")
    check(gone(app.buttons["Subheading"], 4) && app.buttons["To-do"].exists, "✕ closes Aa's choices")
    key(app, "To-do")
    check(eventually(4) { self.focused(app).label == "To-do" }, "To-do makes it a to-do")
    key(app, "Bullets")
    check(eventually(4) { self.focused(app).label == "List" }, "Bullets makes it a bullet")
    key(app, "Bullets")
    check(eventually(4) { self.focused(app).label == "Text" }, "and Bullets again makes it text")
    // a box is checked with a tap, and saved
    let box = app.descendants(matching: .any).matching(identifier: "notes.box").firstMatch
    tap(box, "the to-do's box")
    check(eventually { self.saved(who, id).contains("- [x] milk") }, "a tap on a to-do's box checks it, and that is saved")
    // Bold on what is selected, and a link
    tapEnd(focused(app))
    type(app, "\nmake this bold")
    selectLastWord(app, line(app, "make this bold"), "make this bold")
    check(wait(app.buttons["Bold"], 6) && app.buttons["Italic"].exists && app.buttons["Strikethrough"].exists && app.buttons["Code"].exists && app.buttons["Link"].exists,
          "with words selected the bar has Bold, Italic, Strikethrough, Code and Link")
    snap("guide-format")
    key(app, "Bold")
    check(eventually { self.saved(who, id).contains("make this **bold**") }, "Bold makes them bold: " + saved(who, id).components(separatedBy: "\n").filter { $0.contains("make this") }.joined())
    check(app.buttons["Bold"].isSelected, "and Bold says it's on")
    tapEnd(line(app, "make this bold"))
    type(app, "\nread the plan here")
    selectLastWord(app, line(app, "read the plan here"), "read the plan here")
    key(app, "Link")
    let field = app.textFields["Link"]
    check(wait(field), "Link asks for the address, in the bar")
    field.typeText("example.com/plan")
    key(app, "Add the link")
    check(eventually { self.saved(who, id).contains("read the plan [here](https://example.com/plan)") }, "and puts it on the words (example.com/plan is https://example.com/plan)")
    // the keyboard goes down with its button (once nothing is selected: with words selected the bar is Bold and the rest, as on the web)
    tapEnd(line(app, "read the plan here"))
    key(app, "Hide the keyboard")
    check(gone(app.keyboards.firstMatch, 6) && gone(app.buttons["Text style"], 4), "the keyboard-down button puts the keyboard and the bar away")
    noLabel(app, "writing")
  }

  // ---------- 03: reading, and nothing in a page can run ----------
  func test03Reading() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdp" + run, name = "Reading deck " + run
    let id = person(who, deck: name)
    // a picture of its own (the app's storage), and the hostile words
    let png = FileManager.default.contents(atPath: fx("a.png")) ?? Data()
    let mine = ((api(who, "POST", "/api/media", raw: png, type: "image/png").json as? [String: Any])?["url"] as? String) ?? "/media/none.png"
    let HOSTILE = "# A heading\n\nSome **bold** words and `code`.\n\n- [x] done\n- [ ] todo\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n> a quote\n\n<script>window.__pwn = 2</script>\n\n<img src=x onerror=\"window.__pwn = 1\">\n\n[click me](javascript:window.__pwn=3)\n\n[fine](https://example.com/page)\n\n![remote](http://evil.example/p.png)\n\n![mine](\(mine))"
    act(who, "guide.save", ["deckId": id, "text": HOSTILE])
    let app = launch(as: who, ["-open", "deck:" + name, "-deckTab", "notes"])
    // (V176: the Notes tab lists the note; its page draws it)
    let row = noteRow(app, "A heading")
    check(wait(row), "the Notes tab lists the note by its heading")
    tap(row, "the note")
    check(onPage(app) && wait(line(app, "A heading")) && line(app, "A heading").label == "Heading", "its Notes page draws the heading as a heading")
    check(line(app, "Some bold words and code.").exists, "the paragraph, its marks drawn (no stars or backticks)")
    check(line(app, "a").exists && line(app, "b").exists && line(app, "1").exists && line(app, "2").exists, "the table's cells")
    check(app.descendants(matching: .any).matching(identifier: "notes.box").count == 2 && app.descendants(matching: .any)["Done"].exists && app.descendants(matching: .any)["Not done"].exists,
          "the to-dos' boxes (one done, one not)")
    check(line(app, "a quote").label == "Quote" && line(app, "todo").exists, "the quote and the to-do's words")
    snap("guide-reading")
    check(lineHas(app, "<script>window.__pwn = 2</script>").exists, "a script is shown as plain words, not run")
    check(lineHas(app, "<img src=x onerror=").exists && app.webViews.count == 0, "so is an onerror picture (and there is no web page at all)")
    check(line(app, "click me").exists && line(app, "click me").identifier.isEmpty, "a javascript: link is not a link: its words are plain")
    check(line(app, "fine").identifier == "links: fine -> https://example.com/page", "a normal link is one, to its address")
    check(!app.images["remote"].exists && app.staticTexts["remote"].exists, "an outside picture is not shown: its description is")
    check(wait(app.images["mine"], 15), "only the app’s own pictures show (\(mine))")
    check(saved(who, id) == HOSTILE, "and opening it changes nothing that's saved")
  }

  // ---------- 04: Older versions ----------
  func test04History() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdh" + run, name = "History deck " + run
    let id = person(who, deck: name)
    for t in ["First draft", "Second draft", "Third draft"] { act(who, "guide.save", ["deckId": id, "text": t, "snapshot": true]) }
    let app = openPage(who, deck: name)
    more(app, "Older versions")
    check(wait(textHas(app, "Older versions of the Guide")), "Older versions (in ⋯) says what it lists")
    check(wait(textHas(app, "First draft")) && textHas(app, "Second draft").exists && !textHas(app, "There are no older versions yet").exists, "the older versions, with their words")
    snap("guide-history")
    let restores = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Restore"))
    check(restores.count >= 2, "each has a Restore (\(restores.count))")
    check(textHas(app, " characters").exists, "and says how long it was")
    // The newest is the Second draft; the First draft is under it.
    restores.element(boundBy: 1).tap()
    check(eventually { self.guide(who, id).text == "First draft" }, "Restore brings that version back")
    check(wait(line(app, "First draft")), "and the page shows it")
    check(history(who, id).contains("Third draft"), "what it replaced is kept as a version, so it can be undone")
    more(app, "Older versions")
    check(wait(button(app, "Back to the page")), "Older versions opens again")
    tap(button(app, "Back to the page"), "Back to the page")
    check(wait(line(app, "First draft")) && !textHas(app, "Older versions of").exists, "Back to the page closes it")
    noLabel(app, "Older versions")
  }

  // ---------- 05: pages ----------
  func test05Pages() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdg" + run, name = "Pages deck " + run
    let id = person(who, deck: name)
    act(who, "guide.save", ["deckId": id, "text": "First draft"])
    func crumb(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.descendants(matching: .any)["notes.path"].buttons[words] }
    func inside(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.inside", words)).firstMatch }
    func row(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.row", words)).firstMatch }
    func pageId(_ title: String) -> String { guide(who, id).pages.first { $0["title"] as? String == title }?["id"] as? String ?? "" }
    func parentOf(_ title: String) -> String { guide(who, id).pages.first { $0["title"] as? String == title }?["parent"] as? String ?? "?" }
    var app = openPage(who, deck: name)
    // (V176: the page pills are the page's path; pages nest like Notion's)
    check(crumb(app, "Guide").exists && app.buttons["notes.addPage"].exists, "the Guide's path is just the Guide, and Add a page inside is under the note")
    tap(app.buttons["notes.addPage"], "Add a page inside")
    check(eventually { self.guide(who, id).pages.count == 1 }, "Add a page inside makes one")
    check(eventually { (self.guide(who, id).pages.first?["parent"] as? String) == "main" }, "inside the Guide")
    check(wait(crumb(app, "New page")) && crumb(app, "Guide").exists && eventually(6) { self.focusedValue(app) == "Title" }, "it opens as a blank note with the caret in its title, its path Guide / New page")
    type(app, "Mnemonics\nP-M-A-T")
    let pid = guide(who, id).pages.first?["id"] as? String ?? ""
    check(eventually { self.saved(who, id, page: pid) == "# Mnemonics\n\nP-M-A-T\n" }, "a page has its own words, saved as they are typed")
    check(eventually { (self.guide(who, id).pages.first?["title"] as? String) == "Mnemonics" } && wait(crumb(app, "Mnemonics")), "and a new page is called by its first heading")
    check(guide(who, id).text == "First draft", "the Guide's own words are untouched")
    tap(crumb(app, "Guide"), "the Guide in the path")
    check(wait(line(app, "First draft")) && wait(inside(app, "Mnemonics")), "the path goes back to the Guide, which lists the page inside it")
    tap(inside(app, "Mnemonics"), "Mnemonics, inside the Guide")
    check(wait(line(app, "P-M-A-T")), "and a tap opens it")
    snap("guide-page")
    // a page inside a page: ⋯ › Add a page inside
    more(app, "Add a page inside")
    check(eventually { self.guide(who, id).pages.count == 2 }, "⋯ › Add a page inside makes another")
    check(eventually(6) { self.focusedValue(app) == "Title" }, "(a blank note)")
    type(app, "Mitosis phases\nProphase first.")
    check(eventually { parentOf("Mitosis phases") == pid } && wait(crumb(app, "Mitosis phases")) && crumb(app, "Mnemonics").exists && crumb(app, "Guide").exists, "inside the page that was open: its path is Guide / Mnemonics / Mitosis phases")
    snap("guide-nested")
    // Rename page, from ⋯
    tap(crumb(app, "Mnemonics"), "Mnemonics in the path")
    check(wait(inside(app, "Mitosis phases")), "(the page lists the one inside it)")
    more(app, "Rename page")
    let nameField = app.textFields["Page name"]
    check(wait(nameField) && (nameField.value as? String) == "Mnemonics", "Rename page shows the page's name in a field")
    nameField.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
    nameField.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 9) + "Memory aids\n")
    check(eventually { (self.guide(who, id).pages.first?["title"] as? String) == "Memory aids" } && wait(crumb(app, "Memory aids")), "and saves the new name (the path says it)")
    // the deck's Notes: a tree (V185)
    done(app)
    check(wait(row(app, "Guide")) && row(app, "Memory aids").exists && row(app, "Mitosis phases").exists, "the deck's Notes are a tree of the notes and the pages inside them")
    check(row(app, "Memory aids").frame.minX > row(app, "Guide").frame.minX && row(app, "Mitosis phases").frame.minX > row(app, "Memory aids").frame.minX, "each page further in under the one it is inside")
    let hide = app.buttons["Hide the pages inside Memory aids"]
    check(hide.exists, "a note with pages inside has an arrow")
    tap(hide, "the arrow")
    check(gone(row(app, "Mitosis phases"), 4) && (row(app, "Memory aids").value as? String ?? "").contains("1 page inside"), "it hides them (and says how many are inside)")
    tap(app.buttons["Show the pages inside Memory aids"], "the arrow again")
    check(wait(row(app, "Mitosis phases")), "and shows them again")
    snap("notes-tree")
    tap(app.buttons["Add a page inside Mitosis phases"], "the + on Mitosis phases")
    check(onPage(app) && eventually { self.guide(who, id).pages.count == 3 } && eventually { self.guide(who, id).pages.contains { $0["parent"] as? String == pageId("Mitosis phases") } }, "+ on a row makes a page inside that note")
    check(eventually(6) { self.focusedValue(app) == "Title" }, "and opens it, ready to name")
    done(app)
    tap(app.buttons["notes.new"], "New note")
    check(onPage(app) && eventually { self.guide(who, id).pages.count == 4 } && eventually { self.guide(who, id).pages.contains { ($0["parent"] as? String ?? "?") == "" } }, "New note, with words in the Guide, makes a note at the top")
    done(app)
    // Delete page asks first; the pages inside it move up to where it was
    tap(row(app, "Memory aids"), "Memory aids")
    more(app, "Delete page")
    check(wait(any(app, "Delete the page “Memory aids”?")), "Delete page asks first, with the page’s name")
    dismissDialog(app)
    check(gone(any(app, "Delete the page “Memory aids”?")) && guide(who, id).pages.count == 4, "closing it keeps the page")
    more(app, "Delete page")
    check(wait(any(app, "Delete the page “Memory aids”?")), "it asks again")
    tap(dialogButton(app, "Delete"), "Delete")
    check(eventually { self.guide(who, id).pages.count == 3 } && eventually { parentOf("Mitosis phases") == "main" }, "Delete removes the page, and the page inside it moves up to the Guide")
    check(wait(line(app, "First draft")), "and the Guide shows again")
    // a page named like a source, however long its name
    let long = "Lecture 3 slides, with every term the first exam asks for and then some more besides"
    act(who, "guide.page.add", ["deckId": id, "title": long])
    app = launch(as: who, ["-open", "deck:" + name, "-deckTab", "notes"])
    check(wait(row(app, String(long.prefix(80)).trimmingCharacters(in: .whitespaces))), "a page named like a source, and as long as that, is in the Notes (its first 80 letters)")
    // at ten pages Add a page inside goes away
    for i in 0..<10 { act(who, "guide.page.add", ["deckId": id, "title": "P\(i)"]) }
    let app2 = openPage(who, deck: name)
    check(wait(crumb(app2, "Guide")) && !app2.buttons["notes.addPage"].exists, "at ten pages, Add a page inside goes away")
    tap(app2.buttons["More"].firstMatch, "More")
    check(wait(app2.buttons["Older versions"]) && !app2.buttons["Add a page inside"].exists, "(⋯ too)")
  }

  // ---------- 06: Make cards from the page ----------
  func test06MakeFromGuide() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdm" + run, name = "Maker deck " + run
    let id = person(who, deck: name)
    let GUIDE = "The mitochondrion makes most of the cell’s ATP from sugar and oxygen. The nucleus stores the cell’s DNA and steers what the cell does."
    act(who, "guide.save", ["deckId": id, "text": GUIDE])
    var app = openPage(who, deck: name)
    more(app, "Make cards from this guide")
    let maker = app.textViews["Text to make cards from"]
    check(wait(maker) && (maker.value as? String) == GUIDE, "Make cards (in ⋯) opens the maker with the whole Guide as the text")
    check(text(app, name).exists || any(app, name).exists, "and the cards go to this deck")
    tap(button(app, "Close"), "Close")
    // just what is selected
    act(who, "guide.save", ["deckId": id, "text": "alpha beta gamma delta\n\nsecond line here"])
    app = openPage(who, deck: name)
    var cut = false
    for _ in 0..<3 where !cut {
      tapEnd(line(app, "alpha beta gamma delta"))
      selectLastWord(app, line(app, "alpha beta gamma delta"), "alpha beta gamma delta")
      Thread.sleep(forTimeInterval: 0.6)
      more(app, "Make cards from this guide")
      cut = wait(maker) && eventually(5) { (maker.value as? String) == "delta" }
      if !cut { tap(button(app, "Close"), "Close"); _ = onPage(app) }
    }
    check(cut, "with words selected it makes cards from just those: " + (maker.value as? String ?? ""))
  }

  // ---------- 07: the deck page's Notes ----------
  func test07DeckGuide() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = S("owner"), deckId = S("deckId")
    var app = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "notes"])
    // (V176: the Notes tab lists the notes; each opens as its own page)
    let main = noteRow(app, "Cell Biology: Exam 1")
    check(wait(main) && (main.value as? String ?? "").contains("Everything for the first exam"), "Notes list the Guide by its title, with its first words")
    check(selected(button(app, "Notes")) && button(app, "Cards").exists && button(app, "Sources").exists, "Notes is the tab on show, beside Cards and Sources (no counts)")
    check(noteRow(app, "Lecture 3 summary").exists && noteRow(app, "Mnemonics").exists && !textHas(app, "Question 1 of").exists && app.textViews.count == 0, "and its pages, not the cards (and no page of notes in the tab)")
    tap(main, "the Guide in the list")
    check(onPage(app) && wait(line(app, "Cell Biology: Exam 1")), "a tap opens its Notes page")
    // toggles: closed at first on this phone; opened, and remembered
    let idea = line(app, "The mitochondrion makes most of the cell’s ATP"), inside = line(app, "It has two membranes. The inner one folds into cristae.")
    check(idea.exists && !inside.exists, "a toggle shows its line, and what it holds is hidden")
    let opens = app.buttons.matching(identifier: "notes.toggle")
    check(opens.count == 2 && opens.element(boundBy: 0).label == "Open", "each toggle has its ▸ (Open)")
    opens.element(boundBy: 0).tap()
    check(wait(inside) && opens.element(boundBy: 0).label == "Close", "a tap on ▸ opens it")
    snap("deck-notes-toggle-open")
    app = launch(as: who, ["-open", "guide:Cell Biology"])
    check(wait(line(app, "It has two membranes. The inner one folds into cristae.")), "this phone remembers it's open")
    app.buttons.matching(identifier: "notes.toggle").element(boundBy: 0).tap()
    check(gone(line(app, "It has two membranes. The inner one folds into cristae.")), "and another tap closes it")
    // a section folds
    let fold = app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.fold", "Fold this section")).element(boundBy: 1)
    check(fold.exists, "a heading has its ▸ in the margin")
    fold.tap()
    check(gone(line(app, "Glycolysis, step by step")) && line(app, "Mnemonics").exists, "a tap folds its section (the Checklist's items go; the next section's heading stays)")
    check(saved(who, deckId) == S("guide"), "folding is how this phone shows the page, not a change to it")
    app.buttons["Show this section"].firstMatch.tap()
    check(wait(line(app, "Glycolysis, step by step")), "and it unfolds")
    // the pages: each a note of its own in the list
    done(app)
    tap(noteRow(app, "Lecture 3 summary"), "Lecture 3 summary in the list")
    check(onPage(app) && wait(line(app, "Lecture 3")) && line(app, "NADH gives up its electrons.").exists, "a page opens as its own (its heading and its list)")
    check(line(app, "NADH gives up its electrons.").label == "List", "with its numbered items")
    check(app.descendants(matching: .any)["notes.path"].buttons["Lecture 3 summary"].exists, "its path is itself (a note at the top)")
    done(app)
    tap(noteRow(app, "Mnemonics"), "Mnemonics in the list")
    check(wait(line(app, "PMAT for the phases of mitosis")), "the other shows its bullets")
    // a tap on the words puts the caret there
    tapEnd(line(app, "PMAT for the phases of mitosis"))
    check(eventually(6) { self.focusedValue(app) == "PMAT for the phases of mitosis" }, "a tap on the words puts the caret in that line")
    type(app, "!")
    let g2 = (seed["pages"] as? [String: String])?["g2"] ?? ""
    check(eventually { self.saved(who, deckId, page: g2).contains("- **PMAT** for the phases of mitosis!") }, "what is typed goes where it was tapped: " + saved(who, deckId, page: g2).replacingOccurrences(of: "\n", with: "\\n"))
    app.typeText(XCUIKeyboardKey.delete.rawValue)
    check(eventually { self.saved(who, deckId, page: g2).hasPrefix("- **PMAT** for the phases of mitosis\n") }, "(and taken out again)")
    done(app)
    check(wait(noteRow(app, "Mnemonics")) && selected(button(app, "Notes")), "Done comes back to Notes")
    noLabel(app, "the deck’s Notes")
  }

  // ---------- 08: a deck you only study ----------
  func test08Studied() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = S("studier")
    var app = launch(as: who, ["-open", "deck:Cell Biology"])
    check(wait(button(app, "Suggest a change")), "the deck page is the one you study")
    check(buttonStarting(app, "Cards").exists && button(app, "Notes").exists && !button(app, "Sources").exists && !buttonStarting(app, "Sources").exists, "it has Cards and Notes, and no Sources tab")
    check(!button(app, "Add cards").exists && !app.buttons["deck.add"].exists && app.buttons["deck.study"].exists, "and no Add cards or + (Study stays)")
    tap(button(app, "Notes"), "Notes")
    // (V176: the Notes tab is a list of notes; a deck you only study opens its Notes page to read)
    let note = app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.row", "Cell Biology: Exam 1")).firstMatch
    check(wait(note), "the Notes tab lists its notes")
    check(!app.buttons["notes.new"].exists && !app.buttons.matching(identifier: "notes.addInside").firstMatch.exists, "with no New note and no + on its rows")
    tap(note, "the note")
    check(onPage(app) && wait(line(app, "Cell Biology: Exam 1")), "a tap opens its Notes page, to read")
    check(!app.buttons["More"].exists && !app.buttons["notes.addPage"].exists, "with no ⋯ and no Add a page inside")
    app.buttons.matching(identifier: "notes.toggle").element(boundBy: 0).tap()
    check(wait(line(app, "It has two membranes. The inner one folds into cristae.")), "its toggles open for someone studying it too")
    // a link to a heading jumps up to it (a page being read)
    app.swipeUp(); app.swipeUp()
    let back = lineHas(app, "Back to the top"), top = line(app, "Cell Biology: Exam 1")
    check(wait(back) && back.identifier.contains("Back to the top -> #cell-biology-exam-1"), "a link to a heading is kept as it was written")
    back.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.5)).tap()
    check(eventually(8) { top.exists && top.frame.minY > 40 && top.frame.maxY < 500 }, "a tap on it scrolls up to that heading (now at \(pt(top.frame.minY)))")
    tap(line(app, "Cell Biology: Exam 1"), "the words")
    Thread.sleep(forTimeInterval: 1)
    check(!focused(app).exists && !app.buttons["Hide the keyboard"].exists, "a tap on the words writes nothing (no caret, no keyboard)")
    done(app)
    check(wait(note), "Done comes back to the list")
    // an address for a tab that isn't there falls back to Cards
    app = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources"])
    check(wait(buttonStarting(app, "Cards")) && selected(buttonStarting(app, "Cards")) && !text(app, "SOURCES").exists, "asking for Sources lands on Cards")
    // its Notes page opened straight away reads too
    app = launch(as: who, ["-open", "guide:Cell Biology"])
    check(onPage(app) && wait(line(app, "Cell Biology: Exam 1")) && !app.buttons["More"].exists, "a deck someone else shares opens its Notes page to read, with nothing to change")
    // the deck a studier has no Guide for: Notes isn't there at all
    let plain = "Studied plain " + run
    let owner = "gdo2" + run, id = person(owner, deck: plain, cards: 1)
    let sh = (api(owner, "POST", "/api/social", ["type": "deck.share", "deckId": id, "visibility": "public"]).json as? [String: Any])?["result"] as? [String: Any]
    let st = "gds2" + run
    act(st, "settings.update", ["patch": ["welcomed": true]])
    _ = api(st, "POST", "/api/social", ["type": "deck.study", "id": sh?["id"] as? String ?? ""])
    app = launch(as: st, ["-open", "deck:" + plain])
    check(wait(button(app, "Suggest a change")) && !button(app, "Notes").exists && !buttonStarting(app, "Sources").exists, "a studied deck with no Guide has only its cards (no tabs at all)")
  }

  // ---------- 09: the Sources ----------
  func test09Sources() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = S("owner"), deckId = S("deckId")
    let when = { (ms: Double) -> String in let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "MMM d"; return f.string(from: Date(timeIntervalSince1970: ms / 1000)) }
    let live = (decks(who).first { $0["id"] as? String == deckId }?["sources"] as? [[String: Any]]) ?? []
    func at(_ key: String) -> String { when(live.first { $0["id"] as? String == sid(key) }?["at"] as? Double ?? 0) }
    let app = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources"])
    check(wait(text(app, "SOURCES")) && selected(buttonStarting(app, "Sources")), "?tab=sources opens the Sources tab")
    check(button(app, "Make cards").exists, "with a Make cards button")
    func row(_ name: String) -> XCUIElement { app.buttons["Open " + name] }
    // A row is tapped once it's clear of the floating tab bar: under it, the tap would land on a tab (on a shorter phone the
    // list sits that low once the page is back at its top).
    func open(_ name: String, _ what: String) {
      let r = row(name), bottom = app.windows.firstMatch.frame.maxY - 150
      for _ in 0..<4 where !(r.exists && r.frame.maxY < bottom) { app.swipeUp(); Thread.sleep(forTimeInterval: 0.4) }
      tap(r, what)
    }
    for (key, name) in [("doc", "Lecture 2 handout"), ("pdf", "Lecture 3 slides"), ("recording", "Lecture 4 recording"), ("video", "Mitochondria explained"), ("photo", "Whiteboard"), ("text", "Study notes"), ("topic", "The Krebs cycle")] {
      let s = src(key == "pdf" ? "file" : key), cs = s["cards"] as? Int ?? 0, pages = s["pages"] as? Int ?? 0
      let n = "\(cs) card\(cs == 1 ? "" : "s")"
      let want: String
      switch key {
      case "doc", "pdf": want = "File" + (pages > 0 ? " · \(pages) page\(pages == 1 ? "" : "s")" : "") + " · \(n) · " + at(key == "pdf" ? "file" : key)
      case "recording": want = "Recording · \(max(1, Int(((s["seconds"] as? Double ?? 0) / 60).rounded()))) min · \(n) · " + at(key)
      case "video": want = "YouTube · \(n) · " + at(key)
      case "photo": want = "Photos · \(n) · " + at(key)
      case "text": want = "Text · \(n) · " + at(key)
      default: want = "Topic · \(n) · " + at(key)
      }
      let r = row(name)
      if !r.isHittable { app.swipeUp() }
      check(wait(r, 6) && (r.value as? String) == want, "the list has “\(name)” with its line: \(want) (\(r.value as? String ?? "?"))")
    }
    snap("sources")
    app.swipeDown(); app.swipeDown()
    // a topic: its words
    open("The Krebs cycle", "The Krebs cycle")
    check(wait(button(app, "Close")) && button(app, "More cards").exists && button(app, "Delete").exists && !button(app, "Open the file").exists, "a topic opens with More cards and Delete (nothing to open)")
    check(app.staticTexts.matching(NSPredicate(format: "label == %@", "The Krebs cycle")).count >= 2, "and its words")
    tap(button(app, "Close"), "Close")
    check(gone(button(app, "More cards")), "Close closes it")
    // pictures
    open("Whiteboard", "Whiteboard")
    check(wait(app.buttons["IMG_1.png"]) && app.buttons["IMG_2.jpg"].exists, "photos open as pictures")
    app.buttons["IMG_1.png"].tap()
    check(wait(button(app, "Close the photo")), "a picture opens full screen")
    tap(button(app, "Close the photo"), "Close the photo")
    tap(button(app, "Close"), "Close")
    // a video
    open("Mitochondria explained", "the video")
    check(wait(button(app, "Open the video")), "a video opens with Open the video")
    check((button(app, "Open the video").value as? String ?? "") == "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "which goes to the video’s own page: " + (button(app, "Open the video").value as? String ?? ""))
    check(wait(textHas(app, "Welcome to the lecture on enzymes today")) && textHas(app, "The active site binds the substrate").exists, "and what was said, with the times")
    check(text(app, "0:00").exists || textHas(app, "0:00").exists, "(the time of each part)")
    tap(button(app, "Close"), "Close")
    // a PDF
    open("Lecture 3 slides", "the file")
    check(wait(button(app, "Open the file")) && button(app, "More cards").exists, "a file opens with Open the file and More cards")
    check(textHas(app, "3 pages. The cards from it say which page they came from.").exists, "and says how many pages it has, and where its cards say they came from")
    tap(button(app, "Close"), "Close")
    // the recording of thirteen files
    open("Lecture 4 recording", "the recording")
    let player = app.otherElements["recordingPlayer"]
    check(wait(player) && wait(button(app, "Open the recording")), "a recording opens with its player and Open the recording")
    check((player.value as? String ?? "").hasPrefix("part 1 of 13"), "and with no card it starts at the beginning of the first part: " + (player.value as? String ?? ""))
    check(wait(textHas(app, "Segment 1 says that the powerhouse")), "with what was said")
    tap(button(app, "Close"), "Close")
    // a card from 1:30:00 is in the tenth part, 7:30 in
    let app2 = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources", "-deckSource", sid("recording"), "-deckAt", "1:30:00"])
    let p2 = app2.otherElements["recordingPlayer"]
    check(wait(p2, 20) && eventually { (p2.value as? String ?? "").hasPrefix("part 10 of 13") }, "at 1:30:00 the recording opens at part 10 of 13: " + (p2.value as? String ?? ""))
    check((p2.value as? String ?? "") == "part 10 of 13, at 7:30", "7 minutes 30 seconds into it (1:30:00 less the nine parts before it): " + (p2.value as? String ?? ""))
    tap(button(app2, "Open the recording"), "Open the recording")
    check(wait(button(app2, "Pause"), 15), "Open the recording plays it from there")
    // a PDF at its page
    let app3 = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources", "-deckSource", sid("file"), "-deckAt", "p. 3"])
    tap(button(app3, "Open the file"), "Open the file")
    let pdf = app3.otherElements["pdfView"]
    check(wait(pdf, 20) && eventually { (pdf.value as? String ?? "").hasPrefix("page 3") }, "a card from p. 3 opens the PDF at page 3: " + (pdf.value as? String ?? ""))
    tap(button(app3, "Close the file"), "Close the file")
    // a Word file opens full screen in Lucida's own viewer (the phone's web engine draws it; Quick Look's bar, share button and spinner are the system's)
    let appD = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources", "-deckSource", sid("doc")])
    tap(button(appD, "Open the file"), "Open the file (a Word file)")
    check(wait(button(appD, "Close the file"), 25), "a Word file opens full screen")
    check(wait(appD.webViews.firstMatch, 25), "drawn by the document viewer (a web view), not by Quick Look")
    check(eventually(20) { !self.any(appD, "Loading").exists }, "and Lucida’s loading mark has gone once it is drawn")
    check(appD.navigationBars.count == 0 && appD.toolbars.count == 0 && appD.alerts.count == 0 && appD.sheets.count == 0, "with none of the system’s bars or sheets around it")
    snap("document-word")
    tap(button(appD, "Close the file"), "Close the file")
    // a video at the time
    let app4 = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources", "-deckSource", sid("video"), "-deckAt", "1:30"])
    let ov = app4.buttons["Open the video"]
    check(wait(ov) && (ov.value as? String ?? "") == "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s", "a card from 1:30 of a video opens the video at the time (&t=90s): " + (ov.value as? String ?? ""))
    check(textHas(app4, "Inhibitors slow an enzyme down").exists, "and its part")
  }

  // ---------- 10: "Made from", More cards, Delete ----------
  func test10MadeFromAndDelete() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = S("owner"), deckId = S("deckId")
    let pdfPlace = src("file")["at"] as? [String: Any] ?? [:], topicPlace = src("topic")["at"] as? [String: Any] ?? [:]
    let pdfCard = pdfPlace["card"] as? String ?? "", pdfAt = pdfPlace["at"] as? String ?? ""
    let front = (cards(who, in: deckId).first { $0["id"] as? String == pdfCard }?["front"] as? String) ?? ""
    var app = launch(as: who, ["-open", "deck:Cell Biology"])
    // open that card
    let rowText = front
    tap(cardRow(app, rowText), "the card made from the PDF")
    let line = "Made from Lecture 3 slides" + (pdfAt.isEmpty ? "" : " · " + pdfAt)
    check(wait(button(app, line)), "the card editor says where the card came from: “\(line)”")
    snap("editor-made-from")
    tap(button(app, line), line)
    check(wait(text(app, "SOURCES")) && selected(buttonStarting(app, "Sources")), "the line opens the deck’s Sources")
    check(wait(button(app, "Open the file")) && textHas(app, "Lecture 3 slides").exists, "with that source open")
    tap(button(app, "Close"), "Close")
    // a card from a topic has no place in it
    let tfront = (cards(who, in: deckId).first { $0["id"] as? String == topicPlace["card"] as? String }?["front"] as? String) ?? ""
    app = launch(as: who, ["-open", "deck:Cell Biology"])
    tap(cardRow(app, tfront), "the card made from the topic")
    check(wait(button(app, "Made from The Krebs cycle")), "a card from a topic says so, with no place in it")
    tap(button(app, "Cancel"), "Cancel") // (the card editor's way out; leaves nothing open)
    // More cards from a source opens the maker on it
    app = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources", "-deckSource", sid("text")])
    tap(button(app, "More cards"), "More cards")
    check(wait(text(app, "Study notes")) && button(app, "Make cards").exists, "More cards opens the maker on that source (it names it)")
    tap(button(app, "Close"), "Close")
    // Delete asks first, then the file goes and the cards stay
    let file = ((src("file")["files"] as? [[String: Any]])?.first?["name"] as? String) ?? ""
    let before = cards(who, in: deckId).count
    check(media(who, file) == 200, "the kept file is there")
    app = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources", "-deckSource", sid("file")])
    tap(button(app, "Delete"), "Delete")
    let n = src("file")["cards"] as? Int ?? 0
    check(wait(any(app, "Delete “Lecture 3 slides”?")) && any(app, "Its file goes. The \(n) card\(n == 1 ? "" : "s") made from it stay in the deck.").exists, "Delete asks first, in the web’s words")
    dismissDialog(app)
    Thread.sleep(forTimeInterval: 1)
    check(gone(any(app, "Delete “Lecture 3 slides”?")) && ((decks(who).first { $0["id"] as? String == deckId }?["sources"] as? [[String: Any]]) ?? []).contains { $0["id"] as? String == sid("file") }, "closing it keeps the source")
    tap(button(app, "Delete"), "Delete")
    check(wait(any(app, "Delete “Lecture 3 slides”?")), "it asks again")
    tap(dialogButton(app, "Delete"), "Delete")
    check(eventually { !(((self.decks(who).first { $0["id"] as? String == deckId }?["sources"] as? [[String: Any]]) ?? []).contains { $0["id"] as? String == self.sid("file") }) }, "the source is gone")
    check(eventually { self.media(who, file) == 404 }, "and its file is gone")
    check(cards(who, in: deckId).count == before, "the cards stay")
    check(gone(button(app, "More cards")) && gone(app.buttons["Open Lecture 3 slides"]), "the viewer closes and the list lost it")
    check(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Open ")).count == sourceCount - 1, "the list has one less now (tabs show no counts)")
    // the card still says where it came from, in plain words
    app = launch(as: who, ["-open", "deck:Cell Biology"])
    tap(cardRow(app, rowText), "the card made from the PDF")
    check(wait(any(app, line)) && !button(app, line).exists, "the card still says where it came from, but the line is no longer a link (there is nothing to open)")
    snap("editor-made-from-gone")
  }

  // ---------- 11: a shared deck's page ----------
  func test11SharedPage() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let app = launch(as: S("newcomer"), ["-open", "deckpage:/d/" + S("sharedId")])
    check(wait(text(app, "Shared Cells"), 20), "the shared deck’s page opens")
    check(wait(text(app, "NOTES")) && line(app, "A short Guide anyone can read.").exists, "it reads its Notes for anyone")
    check(line(app, "Open me").exists && !line(app, "Hidden until it is opened.").exists, "a toggle shows its line")
    app.buttons.matching(identifier: "notes.toggle").firstMatch.tap()
    check(wait(line(app, "Hidden until it is opened.")), "and anyone can open it")
    check(wait(textHas(app, "Made from 2 sources")), "and says how many sources the deck was made from, nothing more")
    check(!any(app, "Secret source name").exists && !any(app, "Another private source").exists, "no source names")
    check(!button(app, "Edit").exists && !button(app, "Make cards").exists, "and nothing to edit")
    snap("public-guide")
    noLabel(app, "the shared deck’s page")
  }

  // ---------- 12: the cover's + (New card, Make cards, Notes), dark mode ----------
  func test12MenuAndDark() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdd" + run, name = "Dark deck " + run
    let id = person(who, deck: name, cards: 2)
    act(who, "guide.save", ["deckId": id, "text": "# Dark heading\n\n- [x] done\n- [ ] todo\n\n:::toggle A toggle\nInside it.\n:::\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n> a quote\n\nSome `code` here."])
    act(who, "settings.update", ["patch": ["look": "dark"]])
    let app = launch(as: who, ["-open", "deck:" + name])
    check(wait(app.buttons["deck.add"]) && !button(app, "New card").exists && !button(app, "Make cards").exists && !button(app, "Add cards").exists, "the deck’s cover has its + (no sparkle, New card or Add cards)")
    fromDeckMenu(app, "New card")
    check(wait(text(app, "New card")) && (app.textViews.count > 0 || app.textFields.count > 0), "+ › New card opens the card editor")
    tap(button(app, "Cancel"), "Cancel")
    fromDeckMenu(app, "Make cards")
    check(wait(button(app, "A topic")) && button(app, "Upload").exists, "+ › Make cards opens the maker")
    tap(button(app, "Close"), "Close")
    _ = gone(button(app, "Close"))
    // + › Notes: the Notes page, with the caret at the end of what is written
    fromDeckMenu(app, "Notes")
    check(onPage(app) && line(app, "Dark heading").exists, "+ › Notes opens the Notes page")
    check(eventually(6) { self.focusedValue(app).hasSuffix("here.") }, "ready to type at the end of the Guide (“\(focusedValue(app))”)")
    tap(app.buttons["backButton"], "Done")
    check(wait(button(app, "Notes")), "and Done comes back to the deck")
    // dark
    tap(app.buttons.matching(NSPredicate(format: "label == %@ AND NOT (identifier BEGINSWITH %@)", "Notes", "notes.")).firstMatch, "Notes")
    check(wait(noteRow(app, "Dark heading")), "in dark mode the Notes list the note")
    snap("dark-notes")
    tap(noteRow(app, "Dark heading"), "the note")
    check(onPage(app) && wait(line(app, "Dark heading")) && line(app, "a quote").exists, "and its Notes page opens and reads")
    snap("dark-page")
    noLabel(app, "dark mode")
  }

  // ---------- 13: a toggle and a section ----------
  func test13ToggleAndSection() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdt" + run, name = "Toggle deck " + run
    let id = person(who, deck: name)
    var app = openPage(who, deck: name)
    check(eventually(6) { self.focusedValue(app) == "Title" }, "the caret starts in the title")
    type(app, "Toggles\n> Key idea\nWhy it matters.")
    snap("guide-typed-toggle")
    check(wait(line(app, "Key idea"), 4) && line(app, "Key idea").label == "Toggle" && line(app, "Why it matters.").exists, "“> ” makes a toggle, and Enter at its end writes inside it")
    // a section: two headings with words under them
    tap(app.buttons.matching(identifier: "notes.toggle").firstMatch, "the toggle's ▸")
    check(gone(line(app, "Why it matters.")), "a tap on ▸ closes the toggle: what it holds goes")
    tapEnd(line(app, "Key idea"))
    type(app, "\n")
    // (Enter at the end of a closed toggle makes the next toggle; Backspace turns it back into text)
    app.typeText(XCUIKeyboardKey.delete.rawValue)
    type(app, "## Part one\nFirst words.\n## Part two\nSecond words.")
    let want = "# Toggles\n\n:::toggle Key idea\nWhy it matters.\n:::\n\n## Part one\n\nFirst words.\n\n## Part two\n\nSecond words.\n"
    check(eventually { self.saved(who, id) == want }, "it all is saved as Markdown, the toggle as :::toggle … ::: — " + saved(who, id).replacingOccurrences(of: "\n", with: "\\n"))
    snap("guide-toggle-closed")
    // fold Part one
    let fold = app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.fold", "Fold this section")).element(boundBy: 1)
    tap(fold, "Part one's ▸")
    check(gone(line(app, "First words.")) && line(app, "Part two").exists && line(app, "Second words.").exists, "a heading's ▸ folds its section, up to the next heading of its level")
    check(app.buttons["Show this section"].exists, "and says it can be shown again")
    snap("guide-section-folded")
    Thread.sleep(forTimeInterval: 2)
    check(saved(who, id) == want, "folding and closing change nothing that's saved")
    // this phone remembers, on the Notes page and on the deck page
    app = openPage(who, deck: name)
    check(wait(line(app, "Part two")) && !line(app, "First words.").exists && !line(app, "Why it matters.").exists, "opened again, the section is still folded and the toggle still closed")
    tap(app.buttons.matching(identifier: "notes.toggle").firstMatch, "the toggle's ▸")
    check(wait(line(app, "Why it matters.")), "the toggle opens again")
    snap("guide-toggle-open")
    // (V176: the deck page's Notes list the note; it opens again the same way)
    done(app)
    tap(noteRow(app, "Toggles"), "the note in the list")
    check(onPage(app) && wait(line(app, "Key idea")) && line(app, "Why it matters.").exists && !line(app, "First words.").exists && app.buttons["Show this section"].exists,
          "opened from the deck page's Notes it shows the same way (the toggle open, the section folded)")
    app.buttons["Show this section"].firstMatch.tap()
    check(wait(line(app, "First words.")), "and unfolds")
  }

  // ---------- 14: the outline (the owner: "add that thing notion has where it shows a rail tree of sections") ----------
  func test14Outline() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdo" + run, name = "Outline deck " + run
    let id = person(who, deck: name)
    func fill(_ n: Int, _ what: String) -> String { (1...n).map { "A line about \(what), number \($0)." }.joined(separator: "\n\n") }
    let md = ["# Outline test", "", fill(3, "the start"), "", "## Checklist", "", "- [ ] Glycolysis", "", fill(12, "the checklist"), "", "## The mitochondrion", "", fill(10, "the mitochondrion"),
              "", "### Its two membranes", "", fill(10, "membranes"), "", ":::toggle More about it", "## Hidden in a toggle", "", "Words inside it.", ":::", "", "## Mnemonics", "", fill(20, "mnemonics"), ""].joined(separator: "\n")
    act(who, "guide.save", ["deckId": id, "text": md])
    let names = ["Outline test", "Checklist", "The mitochondrion", "Its two membranes", "Hidden in a toggle", "Mnemonics"]
    var app = openPage(who, deck: name)
    let rail = app.buttons["notes.outline"]
    check(wait(rail) && rail.label == "Outline" && rail.frame.height > 1, "the Notes page has the outline’s rail")
    let W = app.windows.firstMatch.frame.width
    check(rail.frame.maxX > W - 30 && rail.frame.minY < 260, "at its right, near the top (at \(pt(rail.frame.minX)), \(pt(rail.frame.minY)))")
    snap("outline-rail")
    // the sheet: the tree, the one being read selected
    func sheet() { tap(app.buttons["notes.outline"], "the rail"); _ = wait(text(app, "Outline"), 6) }
    func row(_ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label == %@", words)).firstMatch }
    // (by its frame: asking whether a line is hittable while the page still moves can stop the test)
    func near(_ words: String) -> Bool { eventually(6) { let l = self.line(app, words); return l.exists && l.frame.height > 1 && l.frame.minY > 60 && l.frame.minY < 300 } }
    sheet()
    check(text(app, "Outline").exists && names.allSatisfy { row($0).exists }, "a tap opens Lucida’s own sheet with every heading’s name")
    check(row("Outline test").isSelected && !row("Mnemonics").isSelected, "the one being read is the one picked")
    check(app.alerts.count == 0 && app.sheets.count == 0 && app.popovers.count == 0 && app.menus.count == 0, "(Lucida’s own sheet, not the system’s)")
    snap("outline-sheet")
    tap(row("Mnemonics"), "Mnemonics in the sheet")
    check(gone(text(app, "Outline"), 4) && near("Mnemonics"), "a heading scrolls there and closes the sheet (\(pt(line(app, "Mnemonics").frame.minY)))")
    sheet()
    check(row("Mnemonics").isSelected, "and it is now the one being read")
    // a heading inside a closed toggle: going to it opens the toggle
    check(!line(app, "Words inside it.").exists, "(the toggle is closed)")
    tap(row("Hidden in a toggle"), "the heading in the toggle")
    check(near("Hidden in a toggle") && line(app, "Words inside it.").exists, "a heading inside a closed toggle: it opens, and the page goes there")
    // a folded section: its subheading is still in the tree, and going to it unfolds the section
    app.swipeDown(); app.swipeDown(); app.swipeDown(); app.swipeDown(); app.swipeDown()
    sheet(); tap(row("The mitochondrion"), "The mitochondrion")
    _ = near("The mitochondrion")
    let fold = app.buttons.matching(NSPredicate(format: "identifier == %@ AND label == %@", "notes.fold", "Fold this section")).element(boundBy: 2)
    tap(fold, "The mitochondrion's ▸")
    check(gone(line(app, "Its two membranes"), 4), "(its section folds: the subheading goes)")
    sheet()
    check(row("Its two membranes").exists, "a subheading folded away is still in the tree")
    tap(row("Its two membranes"), "the folded subheading")
    check(near("Its two membranes") && !app.buttons["Show this section"].exists, "going to it unfolds the section, as its ▸ does")
    Thread.sleep(forTimeInterval: 1)
    check(saved(who, id) == md, "none of that changes the note")
    // writing: no rail while a line is written (the keyboard up); a heading typed joins the outline
    let last = line(app, "A line about mnemonics, number 20.")
    app.swipeUp(); app.swipeUp(); app.swipeUp(); app.swipeUp(); app.swipeUp(); app.swipeUp()
    tapEnd(last)
    check(eventually(6) { self.focusedValue(app) == "A line about mnemonics, number 20." }, "(the caret in the last line)")
    check(gone(app.buttons["notes.outline"], 4), "while a line is written, the rail is hidden so it never covers what is written")
    snap("outline-writing")
    type(app, "\n## At the very end")
    check(eventually { self.saved(who, id).hasSuffix("## At the very end\n") }, "(the new heading is saved)")
    key(app, "Hide the keyboard")
    check(wait(app.buttons["notes.outline"], 6), "the keyboard goes, the rail is back")
    sheet()
    check(row("At the very end").exists, "and the heading just typed is in the tree")
    tap(button(app, "Close"), "Close")
    // the deck page's Notes tab: no rail (it becomes a list of notes)
    done(app)
    check(wait(noteRow(app, "Outline test")) && selected(button(app, "Notes")), "back on the deck page’s Notes (the list)")
    check(!app.buttons["notes.outline"].exists, "the deck page’s Notes tab has no rail (only the Notes page and a shared deck’s Notes do)")
    // a shared deck's page: cut short there is no rail; Show more, and there is
    let sh = (api(who, "POST", "/api/social", ["type": "deck.share", "deckId": id, "visibility": "public"]).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
    let sid = sh["id"] as? String ?? ""
    check(!sid.isEmpty, "(the deck is shared)")
    app = launch(as: S("newcomer"), ["-open", "deckpage:/d/" + sid])
    check(wait(text(app, "NOTES"), 20) && wait(line(app, "Outline test")), "a shared deck’s page reads its Notes")
    check(!app.buttons["notes.outline"].exists, "cut short (Show more), no rail: what is cut off can’t be scrolled to")
    let showMore = button(app, "Show more")
    if wait(showMore, 6) && showMore.frame.maxY > app.windows.firstMatch.frame.height - 40 { app.swipeUp(); Thread.sleep(forTimeInterval: 1) }
    tap(showMore, "Show more")
    check(wait(app.buttons["notes.outline"], 6), "shown in full, the rail is there")
    tap(app.buttons["notes.outline"], "the shared page's rail")
    tap(row("Hidden in a toggle"), "the heading in the toggle")
    check(eventually(6) { let l = self.line(app, "Hidden in a toggle"); return l.exists && l.frame.minY > 40 && l.frame.minY < 300 } && line(app, "Words inside it.").exists, "and a reader can go to any heading (a closed toggle’s too)")
    let srail = app.buttons["notes.outline"]
    check(eventually(4) { srail.exists && srail.frame.height > 1 && srail.frame.minY > 40 && srail.frame.minY < 200 }, "and the rail stays in view near the top as the page scrolls (at \(pt(srail.frame.minY)))")
    snap("outline-shared")
    noLabel(app, "the outline")
  }
}
