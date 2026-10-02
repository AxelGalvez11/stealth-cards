// A deck's Guide and Sources, end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its lc_dev cookie, which the debug-only
// `-dev <name>` launch argument sets) and the AI stood in for (tests/stub-ai.mjs): the same story as the web's own tests (guide-ui, sources-ui, deck-tabs-ui), in flows that
// each set up their own people. The Sources come from ios/tests/js/guide-seed.mjs, which makes them with the server's own make steps (a PDF, a recording kept as thirteen
// files that is almost two hours long, a video, pictures, pasted text, a topic).
//   01  a deck with no Guide offers "Add a guide"; the deck page opens on Cards with its tabs and counts; the editor saves what is typed by itself; Done lands on Notes
//   02  each toolbar button's result (on the whole text selected), Enter in a list, Preview and Write keep the words
//   03  Preview draws the heading, table, task list and quote, and does not run or show a script, an onerror picture, a javascript: link or an outside picture
//   04  History lists the older versions; Restore brings one back and keeps what it replaced
//   05  extra pages: add, rename, write, switch, delete (asks first), and at ten pages Add page goes away
//   06  Make cards from the Guide opens the maker with its words (and with a selection, just that), for this deck
//   07  the Guide on the deck page: Show more and Show less, a link to a heading scrolls up to it, page tabs, the owner's Edit opens that page, Done comes back to Notes
//   08  a deck you only study shows the Guide with no editing, has no Sources tab, and has no editor
//   09  the Sources list, each kind's viewer, a recording of thirteen files plays the part that covers the card's time, a PDF opens at its page, a video opens at the time
//   10  the "Made from" line in the card editor opens the source at that spot (Sources, viewer open); More cards from a source; Delete (asks first: the file goes, the cards stay,
//       the line turns to plain words)
//   11  a shared deck's page shows the Guide and "Made from 2 sources", with no names
//   12  the Add cards menu on the deck's cover; dark mode; nothing says "AI generated"
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
  /// A confirmation dialog (iOS 26) is a small card with its one button and no Cancel: a touch outside it closes it.
  private func dismissDialog(_ app: XCUIApplication) {
    let outside = app.otherElements["PopoverDismissRegion"].firstMatch
    guard outside.waitForExistence(timeout: 8 * Self.slow) else { check(false, "found the dialog to close"); return }
    outside.coordinate(withNormalizedOffset: CGVector(dx: 0.04, dy: 0.5)).tap()
  }
  /// The dialog's own button (the page behind it has buttons of the same name).
  private func dialogButton(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.popovers.buttons[label].firstMatch }
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

  // ---------- the editor ----------
  private func field(_ app: XCUIApplication) -> XCUIElement { app.textViews["Guide, in Markdown"] }
  private func value(_ app: XCUIApplication) -> String { field(app).value as? String ?? "" }
  /// Puts words in the editor, replacing what's there (select everything with the keyboard, then type).
  private func write(_ app: XCUIApplication, _ words: String) {
    let f = field(app)
    guard wait(f) else { check(false, "found the editor to type in"); return }
    f.tap()
    f.typeKey("a", modifierFlags: .command)
    // (Typing over the selection replaces it; with nothing to type, the delete key does.)
    if words.isEmpty { f.typeText(XCUIKeyboardKey.delete.rawValue) } else { f.typeText(words) }
  }
  private func selectAll(_ app: XCUIApplication) { field(app).typeKey("a", modifierFlags: .command) }
  /// The toolbar: a button, found even where the bar has to scroll sideways to show it.
  private func tool(_ app: XCUIApplication, _ label: String) {
    let b = app.buttons[label].firstMatch
    guard wait(b, 6) else { check(false, "found the toolbar button " + label); return }
    if !b.isHittable { app.otherElements["Formatting"].firstMatch.swipeLeft() }
    b.tap()
  }
  private func openEditor(_ who: String, deck name: String, page: String = "", extra: [String] = []) -> XCUIApplication {
    let app = launch(as: who, ["-open", "guide:" + name + (page.isEmpty ? "" : ":" + page)] + extra)
    check(wait(field(app), 15), "the editor opens")
    return app
  }
  private func done(_ app: XCUIApplication) { tap(app.buttons["doneButton"], "Done") }

  // ---------- 01: no Guide, "Add a guide", the editor saves as it's typed ----------
  func test01NoGuide() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdn" + run, name = "Plain deck " + run
    let id = person(who, deck: name, cards: 2)
    let app = launch(as: who, ["-open", "deck:" + name])
    check(wait(buttonStarting(app, "Cards 2")), "the deck page has a Cards tab with the number of cards")
    check(selected(buttonStarting(app, "Cards")) && !selected(buttonStarting(app, "Notes")) && !selected(buttonStarting(app, "Sources")), "it opens on Cards")
    check(button(app, "Notes").exists && button(app, "Sources").exists, "with Notes and Sources beside it (a deck of your own)")
    check(textHas(app, "Question 1 of").exists && !text(app, "GUIDE").exists && !text(app, "SOURCES").exists, "the cards show, and no Guide or Sources in the way")
    tap(button(app, "Notes"), "Notes")
    check(wait(text(app, "GUIDE")) && button(app, "Add a guide").exists && button(app, "Write").exists, "Notes with no Guide says “Add a guide”, with Write")
    check(!button(app, "Edit").exists && !textHas(app, "Question 1 of").exists, "(no Edit yet, and the cards give way)")
    snap("guide-empty")
    tap(button(app, "Add a guide"), "Add a guide")
    check(wait(field(app)), "it opens the editor")
    check(button(app, "Write").exists && button(app, "Preview").exists && button(app, "History").exists && button(app, "Add a page").exists && button(app, "Make cards").exists && app.buttons["doneButton"].exists, "with Write, Preview, History, Add a page, Make cards and Done")
    check(text(app, "Guide").exists && text(app, name).exists, "and the Guide’s name and the deck’s")
    noLabel(app, "the editor")
    // typing saves by itself
    let words = "# Cell Biology: Exam 1\n\nEverything for the first exam."
    write(app, words)
    check(eventually { self.guide(who, id).text == words }, "what is typed is saved a moment later, with no button")
    check(wait(app.staticTexts["saveLabel"]) && eventually(4) { (app.staticTexts["saveLabel"].label) == "Saved" }, "the editor says Saved")
    check(value(app) == words, "and the words stay in the field")
    // Done lands on Notes
    done(app)
    check(wait(text(app, "Cell Biology: Exam 1")) && text(app, "GUIDE").exists, "Done goes back to the deck’s Notes, which draw the Guide")
    check(selected(button(app, "Notes")) && button(app, "Edit").exists && button(app, "Make cards").exists, "with Edit and Make cards now")
    noLabel(app, "the Notes")
    // a tab that isn't there opens Cards
    let app2 = launch(as: who, ["-open", "deck:" + name, "-deckTab", "diagrams"])
    check(wait(buttonStarting(app2, "Cards 2")) && selected(buttonStarting(app2, "Cards")) && !selected(button(app2, "Notes")), "a tab that isn’t there (diagrams) opens Cards")
    // a deck with no cards but a Guide keeps its page, and says so on Cards
    let bare = "Only a guide " + run, bid = person(who, deck: bare, cards: 0)
    act(who, "guide.save", ["deckId": bid, "text": "# Plan\n\nWrite the cards later."])
    let app3 = launch(as: who, ["-open", "deck:" + bare])
    check(wait(buttonStarting(app3, "Cards 0")) && button(app3, "Notes").exists && wait(text(app3, "No cards in this deck yet. Add some from the Add cards menu.")), "a deck with no cards but a Guide keeps its tabs, and says so on Cards")
    tap(button(app3, "Notes"), "Notes")
    check(wait(text(app3, "Plan")) && textHas(app3, "Write the cards later.").exists, "and its Notes show the Guide")
  }

  // ---------- 02: the toolbar ----------
  func test02Toolbar() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdt" + run, name = "Toolbar deck " + run
    person(who, deck: name)
    let app = openEditor(who, deck: name)
    // with the keyboard up the page keeps its place: the header under the status bar, the text field with room, Make cards and Done above the keyboard
    field(app).tap()
    Thread.sleep(forTimeInterval: 1.5)
    let kb = app.keyboards.firstMatch, back = app.buttons["backButton"], done = app.buttons["doneButton"]
    check(kb.exists && back.frame.minY >= 62, "the header stays under the status bar while the keyboard is up (the back button is \(pt(back.frame.minY)) points down)")
    check(kb.exists && done.frame.maxY <= kb.frame.minY && field(app).frame.height > 100, "and Make cards and Done sit above the keyboard, with the text field still tall (\(pt(field(app).frame.height)) points)")
    func press(_ label: String, on start: String, expect: String, exact: Bool = true) {
      write(app, start); selectAll(app); tool(app, label)
      let v = value(app)
      check(exact ? v == expect : v.range(of: expect, options: .regularExpression) != nil, label + " on “" + start.replacingOccurrences(of: "\n", with: "\\n") + "”: " + v.replacingOccurrences(of: "\n", with: "\\n"))
    }
    press("Bold", on: "hello world", expect: "**hello world**")
    press("Italic", on: "hello world", expect: "*hello world*")
    press("Code", on: "hello world", expect: "`hello world`")
    press("Heading", on: "hello world", expect: "## hello world")
    press("Bulleted list", on: "one\ntwo", expect: "- one\n- two")
    press("Numbered list", on: "one\ntwo", expect: "1. one\n2. two")
    press("Task list", on: "one", expect: "- [ ] one")
    press("Quote", on: "one", expect: "> one")
    press("Link", on: "see world now", expect: #"^\[see world now\]\([^)]*\)$"#, exact: false)
    write(app, ""); tool(app, "Table")
    check(value(app) == "| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |\n", "Table inserts a table: " + value(app).replacingOccurrences(of: "\n", with: "\\n"))
    // pressing a button again takes it off
    write(app, "pick bold"); selectAll(app); tool(app, "Bold"); selectAll(app); tool(app, "Bold")
    check(value(app) == "pick bold", "pressing Bold again takes it off: " + value(app))
    // with nothing selected, the marks go in with the caret between them
    write(app, ""); tool(app, "Bold"); field(app).typeText("x")
    check(value(app) == "**x**", "Bold with nothing selected puts the marks in with the caret between: " + value(app))
    // Enter carries a list on, and ends it on an empty item
    write(app, "- one")
    field(app).typeText("\n")
    check(value(app) == "- one\n- ", "Enter in a list starts the next item: " + value(app).replacingOccurrences(of: "\n", with: "\\n"))
    field(app).typeText("\n")
    check(!value(app).hasSuffix("- "), "Enter on an empty item ends the list: " + value(app).replacingOccurrences(of: "\n", with: "\\n"))
    write(app, "1. a")
    field(app).typeText("\n")
    check(value(app) == "1. a\n2. ", "and a numbered list goes on counting: " + value(app).replacingOccurrences(of: "\n", with: "\\n"))
    write(app, "- [ ] task")
    field(app).typeText("\n")
    check(value(app) == "- [ ] task\n- [ ] ", "a task list goes on with an unchecked box: " + value(app).replacingOccurrences(of: "\n", with: "\\n"))
    write(app, "plain")
    field(app).typeText("\nnext")
    check(value(app) == "plain\nnext", "Enter outside a list is an ordinary new line: " + value(app).replacingOccurrences(of: "\n", with: "\\n"))
    // the words are Markdown as typed: no curly quotes, no long dashes
    write(app, "a \"b\" -- c")
    check(value(app) == "a \"b\" -- c", "no curly quotes or long dashes are put in: " + value(app))
    snap("guide-toolbar")
  }

  // ---------- 03: Preview, and nothing in a Guide can run ----------
  func test03Preview() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdp" + run, name = "Preview deck " + run
    let id = person(who, deck: name)
    // a picture of its own (the app's storage), and the hostile words
    let png = FileManager.default.contents(atPath: fx("a.png")) ?? Data()
    let mine = ((api(who, "POST", "/api/media", raw: png, type: "image/png").json as? [String: Any])?["url"] as? String) ?? "/media/none.png"
    let HOSTILE = "# A heading\n\nSome **bold** words and `code`.\n\n- [x] done\n- [ ] todo\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n> a quote\n\n<script>window.__pwn = 2</script>\n\n<img src=x onerror=\"window.__pwn = 1\">\n\n[click me](javascript:window.__pwn=3)\n\n[fine](https://example.com/page)\n\n![remote](http://evil.example/p.png)\n\n![mine](\(mine))"
    act(who, "guide.save", ["deckId": id, "text": HOSTILE])
    let app = openEditor(who, deck: name)
    check(value(app) == HOSTILE, "the editor shows the words as saved")
    tap(button(app, "Preview"), "Preview")
    check(wait(text(app, "A heading")), "Preview draws the heading")
    check(app.staticTexts["A heading"].firstMatch.exists && textHas(app, "Some bold words and code.").exists, "and the paragraph with its bold and code")
    check(text(app, "a").exists && text(app, "b").exists && text(app, "1").exists && text(app, "2").exists, "the table’s cells")
    check(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Done")).count >= 1 && app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Not done")).count >= 1, "the task list’s boxes (one done, one not)")
    check(text(app, "a quote").exists && text(app, "todo").exists, "the quote and the task’s words")
    snap("guide-preview")
    // nothing ran, nothing is a script or a picture it shouldn't be
    check(textHas(app, "<script>window.__pwn = 2</script>").exists, "a script is shown as plain words, not run")
    check(textHas(app, "<img src=x onerror=").exists && app.webViews.count == 0, "so is an onerror picture (and there is no web page at all)")
    check(text(app, "click me").exists && !anyValue(app, "click me ->").exists, "a javascript: link is not a link: its words are plain")
    check(anyValue(app, "fine -> https://example.com/page").exists, "a normal link is one, to its address")
    check(!app.images["remote"].exists && text(app, "remote").exists, "an outside picture is not shown: its description is")
    let pic = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@ AND elementType != %d", "mine", XCUIElement.ElementType.staticText.rawValue)).firstMatch
    check(wait(pic, 15), "only the app’s own pictures show (\(mine))")
    // going back to Write brings the same words
    tap(button(app, "Write"), "Write")
    check(wait(field(app)) && value(app) == HOSTILE, "going back to Write brings the same text")
  }

  // ---------- 04: History ----------
  func test04History() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdh" + run, name = "History deck " + run
    let id = person(who, deck: name)
    for t in ["First draft", "Second draft", "Third draft"] { act(who, "guide.save", ["deckId": id, "text": t, "snapshot": true]) }
    let app = openEditor(who, deck: name)
    tap(button(app, "History"), "History")
    check(wait(textHas(app, "Older versions of the Guide.")), "History says what it lists")
    check(wait(textHas(app, "First draft")) && textHas(app, "Second draft").exists && !textHas(app, "There are no older versions yet").exists, "the older versions, with their words")
    snap("guide-history")
    let restores = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Restore"))
    check(restores.count >= 2, "each has a Restore (\(restores.count))")
    check(text(app, "11 characters").exists || textHas(app, " characters").exists, "and says how long it was")
    // The newest is the Second draft; the First draft is under it.
    restores.element(boundBy: 1).tap()
    check(eventually { self.guide(who, id).text == "First draft" }, "Restore brings that version back")
    check(wait(field(app)) && eventually { self.value(app) == "First draft" }, "and the editor shows it")
    check(history(who, id).contains("Third draft"), "what it replaced is kept as a version, so it can be undone")
    tap(button(app, "History"), "History")
    check(wait(button(app, "Back to writing")), "History opens again")
    tap(button(app, "Back to writing"), "Back to writing")
    check(wait(button(app, "Preview")) && field(app).exists, "Back to writing closes it")
    noLabel(app, "History")
  }

  // ---------- 05: extra pages ----------
  func test05Pages() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdg" + run, name = "Pages deck " + run
    let id = person(who, deck: name)
    act(who, "guide.save", ["deckId": id, "text": "First draft"])
    let app = openEditor(who, deck: name)
    check(button(app, "Guide").exists && button(app, "Add a page").exists && !app.textFields["Page name"].exists, "the Guide has a tab and Add page, and no page name")
    tap(button(app, "Add a page"), "Add a page")
    check(eventually { self.guide(who, id).pages.count == 1 }, "Add page makes one")
    check(wait(app.textFields["Page name"]) && button(app, "Delete page").exists, "with a name field and Delete page")
    let name1 = app.textFields["Page name"]
    // (To replace a name, a tap at the far right puts the caret at its end; then the words are deleted.)
    name1.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
    name1.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (name1.value as? String ?? "").count) + "Mnemonics")
    check(eventually { (self.guide(who, id).pages.first?["title"] as? String) == "Mnemonics" }, "renaming a page saves (the name is now “\(self.guide(who, id).pages.first?["title"] as? String ?? "?")”, the field says “\(name1.value as? String ?? "?")”)")
    check(wait(button(app, "Mnemonics")), "and its tab says so")
    write(app, "## Remember\n\nP-M-A-T")
    check(eventually { (self.guide(who, id).pages.first?["text"] as? String) == "## Remember\n\nP-M-A-T" }, "a page has its own words, saved as they are typed")
    check(guide(who, id).text == "First draft", "and the Guide’s own words are untouched")
    tap(button(app, "Guide"), "the Guide tab")
    check(wait(field(app)) && eventually { self.value(app) == "First draft" }, "the Guide tab shows the Guide: " + value(app))
    tap(button(app, "Mnemonics"), "the Mnemonics tab")
    check(eventually { self.value(app) == "## Remember\n\nP-M-A-T" }, "the page tab shows the page: " + value(app))
    snap("guide-page")
    // delete asks first
    tap(button(app, "Delete page"), "Delete page")
    check(wait(any(app, "Delete the page “Mnemonics”?")), "Delete page asks first, with the page’s name")
    dismissDialog(app)
    check(gone(any(app, "Delete the page “Mnemonics”?")) && guide(who, id).pages.count == 1, "closing it keeps the page")
    tap(button(app, "Delete page"), "Delete page")
    check(wait(any(app, "Delete the page “Mnemonics”?")), "it asks again")
    tap(dialogButton(app, "Delete"), "Delete")
    check(eventually { self.guide(who, id).pages.isEmpty }, "Delete removes the page")
    check(wait(field(app)) && eventually { self.value(app) == "First draft" } && !app.textFields["Page name"].exists, "and the Guide shows again")
    // a page can be named like a source, however long its name
    let long = "Lecture 3 slides, with every term the first exam asks for and then some more besides"
    let again = openEditor(who, deck: name)
    check(wait(button(again, "Guide")), "the editor opens again")
    act(who, "guide.page.add", ["deckId": id, "title": long])
    let again2 = openEditor(who, deck: name)
    // (The server keeps the first 80 letters of a page's name.)
    check(wait(button(again2, String(long.prefix(80)).trimmingCharacters(in: .whitespaces))), "a page named like a source, and as long as that, has its tab (its first 80 letters)")
    snap("guide-long-page-name")
    // a name still being typed is sent when the page is left (Done right after the last key)
    let temp = act(who, "guide.page.add", ["deckId": id, "title": "Temp"])["id"] as? String ?? ""
    let app3 = openEditor(who, deck: name, page: temp)
    let tempName = app3.textFields["Page name"]
    if wait(tempName) {
      tempName.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
      tempName.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 4) + "Quick")
      done(app3)
      check(eventually { (self.guide(who, id).pages.first { $0["id"] as? String == temp }?["title"] as? String) == "Quick" }, "a name that is still being typed is sent when Done is tapped")
    } else { check(false, "found the page’s name to type in") }
    // at ten pages Add page goes away
    for i in 0..<10 { act(who, "guide.page.add", ["deckId": id, "title": "P\(i)"]) }
    let app2 = openEditor(who, deck: name)
    check(wait(button(app2, "Guide")) && !button(app2, "Add a page").exists, "at ten pages, Add page goes away")
  }

  // ---------- 06: Make cards from the Guide ----------
  func test06MakeFromGuide() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdm" + run, name = "Maker deck " + run
    let id = person(who, deck: name)
    let GUIDE = "The mitochondrion makes most of the cell’s ATP from sugar and oxygen. The nucleus stores the cell’s DNA and steers what the cell does."
    act(who, "guide.save", ["deckId": id, "text": GUIDE])
    var app = openEditor(who, deck: name)
    tap(button(app, "Make cards"), "Make cards")
    check(wait(app.textViews["Text to make cards from"]) && (app.textViews["Text to make cards from"].value as? String) == GUIDE, "Make cards opens the maker with the whole Guide as the text")
    check(text(app, name).exists || any(app, name).exists, "and the cards go to this deck")
    tap(button(app, "Close"), "Close")
    // just what is selected
    act(who, "guide.save", ["deckId": id, "text": "alpha beta gamma delta\nsecond line here"])
    app = openEditor(who, deck: name)
    let maker = app.textViews["Text to make cards from"]
    // (The keys that select can get lost when the Mac is busy: if the maker shows the whole page, close it and select again.)
    var cut = false
    for _ in 0..<3 where !cut {
      let f = field(app)
      f.tap()
      Thread.sleep(forTimeInterval: 1)   // (the keyboard comes up first)
      f.typeKey(XCUIKeyboardKey.upArrow.rawValue, modifierFlags: .command)
      f.typeKey(XCUIKeyboardKey.rightArrow.rawValue, modifierFlags: [.command, .shift])
      Thread.sleep(forTimeInterval: 0.6)
      tap(button(app, "Make cards"), "Make cards")
      cut = wait(maker) && eventually(5) { (maker.value as? String) == "alpha beta gamma delta" }
      if !cut { tap(button(app, "Close"), "Close"); _ = wait(field(app)) }
    }
    check(cut, "with a selection it makes cards from just that: " + (maker.value as? String ?? ""))
  }

  // ---------- 07: the Guide on the deck page ----------
  func test07DeckGuide() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = S("owner"), deckId = S("deckId")
    let n = cards(who, in: deckId).count
    let app = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "notes"])
    check(wait(text(app, "Cell Biology: Exam 1")), "Notes draw the Guide (the heading, the first words)")
    check(buttonStarting(app, "Cards \(n)").exists && selected(button(app, "Notes")) && buttonStarting(app, "Sources \(sourceCount)").exists, "the tabs say how many cards and Sources (Cards \(n), Sources \(sourceCount)), and Notes is the one on show")
    check(textHas(app, "Everything for the first exam").exists && !textHas(app, "Question 1 of").exists, "the Guide shows, the cards don’t")
    check(button(app, "Show more").exists && button(app, "Guide").exists && button(app, "Lecture 3 summary").exists && button(app, "Mnemonics").exists, "a long Guide is cut short with Show more, and the pages have tabs")
    // (How far down the page the button is says how long the card is: the card's own frame in the accessibility tree also holds the words that are cut off.)
    let cut = button(app, "Show more").frame.minY
    snap("deck-guide-long")
    tap(button(app, "Show more"), "Show more")
    check(wait(button(app, "Show less")) && eventually(4) { self.button(app, "Show less").frame.minY > cut + 100 }, "Show more opens it all, and says Show less (the button moved from \(pt(cut)) to \(pt(self.button(app, "Show less").frame.minY)) points down)")
    app.swipeUp()
    check(textHas(app, "Questions? Ask in office hours.").exists, "its last line is there")
    check(anyValue(app, "office hours -> https://example.edu/office-hours").exists, "its link goes to its address")
    // a link inside the Guide to one of its headings scrolls the page up to it
    // (A link in a paragraph is an element of its own, a Link, inside it.)
    let top = text(app, "Cell Biology: Exam 1"), back = app.links["Back to the top"].firstMatch
    check(anyValue(app, "Back to the top -> #g-cell-biology-exam-1").exists && !top.isHittable, "a link to a heading is a jump within the page, and the heading is far above, out of sight")
    Thread.sleep(forTimeInterval: 1.2)
    tap(back, "Back to the top")
    check(eventually(8) { top.exists && top.frame.minY > 40 && top.frame.maxY < 400 && top.isHittable }, "tapping it scrolls up to that heading (now at \(pt(top.frame.minY)))")
    app.swipeUp(); Thread.sleep(forTimeInterval: 1.2)
    tap(button(app, "Show less"), "Show less")
    check(wait(button(app, "Show more")), "Show less folds it again")
    app.swipeDown(); app.swipeDown()
    tap(button(app, "Lecture 3 summary"), "the page tab")
    check(wait(text(app, "Lecture 3")) && textHas(app, "NADH gives up its electrons.").exists, "a page tab shows that page (its heading and its list)")
    check(text(app, "1.").exists && text(app, "3.").exists, "with its numbers")
    tap(button(app, "Mnemonics"), "the other page tab")
    check(wait(textHas(app, "PMAT for the phases of mitosis")), "the other shows its bullets")
    tap(button(app, "Edit"), "Edit")
    check(wait(field(app)) && eventually { self.value(app).hasPrefix("- **PMAT**") }, "Edit opens that page: " + value(app))
    check(button(app, "Mnemonics").exists, "its tab is the one lit")
    done(app)
    check(wait(button(app, "Show more")) || wait(text(app, "Cell Biology: Exam 1"), 4) || wait(textHas(app, "PMAT")), "Done comes back to Notes")
    check(selected(button(app, "Notes")), "with Notes the section on show")
    noLabel(app, "the deck’s Notes")
  }

  // ---------- 08: a deck you only study ----------
  func test08Studied() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = S("studier")
    var app = launch(as: who, ["-open", "deck:Cell Biology"])
    check(wait(button(app, "Suggest a change")), "the deck page is the one you study")
    check(buttonStarting(app, "Cards").exists && button(app, "Notes").exists && !button(app, "Sources").exists && !buttonStarting(app, "Sources").exists, "it has Cards and Notes, and no Sources tab")
    check(!button(app, "Add cards").exists, "and no Add cards")
    tap(button(app, "Notes"), "Notes")
    check(wait(text(app, "Cell Biology: Exam 1")) && text(app, "GUIDE").exists, "the Guide shows")
    check(!button(app, "Edit").exists && !button(app, "Write").exists && !button(app, "Make cards").exists && !button(app, "Add a guide").exists, "with no Edit, Write, Make cards or Add a guide")
    check(button(app, "Lecture 3 summary").exists && button(app, "Mnemonics").exists, "and its pages")
    // an address for a tab that isn't there falls back to Cards
    app = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources"])
    check(wait(buttonStarting(app, "Cards")) && selected(buttonStarting(app, "Cards")) && !text(app, "SOURCES").exists, "asking for Sources lands on Cards")
    // and there is no editor
    app = launch(as: who, ["-open", "guide:Cell Biology"])
    check(wait(button(app, "Notes")) && !field(app).exists, "a deck someone else shares has no editor (it stays on the deck page)")
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
    tap(row("The Krebs cycle"), "The Krebs cycle")
    check(wait(button(app, "Close")) && button(app, "More cards").exists && button(app, "Delete").exists && !button(app, "Open the file").exists, "a topic opens with More cards and Delete (nothing to open)")
    check(app.staticTexts.matching(NSPredicate(format: "label == %@", "The Krebs cycle")).count >= 2, "and its words")
    tap(button(app, "Close"), "Close")
    check(gone(button(app, "More cards")), "Close closes it")
    // pictures
    tap(row("Whiteboard"), "Whiteboard")
    check(wait(app.buttons["IMG_1.png"]) && app.buttons["IMG_2.jpg"].exists, "photos open as pictures")
    app.buttons["IMG_1.png"].tap()
    check(wait(button(app, "Close the photo")), "a picture opens full screen")
    tap(button(app, "Close the photo"), "Close the photo")
    tap(button(app, "Close"), "Close")
    // a video
    tap(row("Mitochondria explained"), "the video")
    check(wait(button(app, "Open the video")), "a video opens with Open the video")
    check((button(app, "Open the video").value as? String ?? "") == "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "which goes to the video’s own page: " + (button(app, "Open the video").value as? String ?? ""))
    check(wait(textHas(app, "Welcome to the lecture on enzymes today")) && textHas(app, "The active site binds the substrate").exists, "and what was said, with the times")
    check(text(app, "0:00").exists || textHas(app, "0:00").exists, "(the time of each part)")
    tap(button(app, "Close"), "Close")
    // a PDF
    tap(row("Lecture 3 slides"), "the file")
    check(wait(button(app, "Open the file")) && button(app, "More cards").exists, "a file opens with Open the file and More cards")
    check(textHas(app, "3 pages. The cards from it say which page they came from.").exists, "and says how many pages it has, and where its cards say they came from")
    tap(button(app, "Close"), "Close")
    // the recording of thirteen files
    tap(row("Lecture 4 recording"), "the recording")
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
    // a Word file opens in Quick Look
    let appD = launch(as: who, ["-open", "deck:Cell Biology", "-deckTab", "sources", "-deckSource", sid("doc")])
    tap(button(appD, "Open the file"), "Open the file (a Word file)")
    check(wait(button(appD, "Close the file"), 25), "a Word file opens full screen in Quick Look")
    snap("quicklook")
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
    check(wait(any(app, "Delete “Lecture 3 slides”? Its file goes, and the \(n) card\(n == 1 ? "" : "s") made from it stay in the deck.")), "Delete asks first, in the web’s words")
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
    check(buttonStarting(app, "Sources \(sourceCount - 1)").exists, "the tab counts one less now")
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
    check(wait(text(app, "GUIDE")) && textHas(app, "A short Guide anyone can read.").exists, "it draws the Guide for anyone")
    check(wait(textHas(app, "Made from 2 sources")), "and says how many sources the deck was made from, nothing more")
    check(!any(app, "Secret source name").exists && !any(app, "Another private source").exists, "no source names")
    check(!button(app, "Edit").exists && !button(app, "Write").exists, "and nothing to edit")
    snap("public-guide")
    noLabel(app, "the shared deck’s page")
  }

  // ---------- 12: the Add cards menu, dark mode ----------
  func test12MenuAndDark() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "gdd" + run, name = "Dark deck " + run
    let id = person(who, deck: name, cards: 2)
    act(who, "guide.save", ["deckId": id, "text": "# Dark heading\n\n- [x] done\n- [ ] todo\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n> a quote\n\nSome `code` here."])
    act(who, "settings.update", ["patch": ["look": "dark"]])
    let app = launch(as: who, ["-open", "deck:" + name])
    check(wait(button(app, "Add cards")), "the deck’s cover has an Add cards button")
    tap(button(app, "Add cards"), "Add cards")
    check(wait(button(app, "New card")) && button(app, "From a file, photo, video or topic").exists && button(app, "Import cards").exists, "it opens New card, From a file, photo, video or topic, and Import cards")
    tap(button(app, "New card"), "New card")
    check(wait(text(app, "New card")) && (app.textViews.count > 0 || app.textFields.count > 0), "New card opens the card editor")
    tap(button(app, "Cancel"), "Cancel")
    tap(button(app, "Add cards"), "Add cards")
    tap(button(app, "From a file, photo, video or topic"), "the Make cards row")
    check(wait(text(app, "Upload")) || wait(button(app, "Make cards")), "the second row opens the maker")
    tap(button(app, "Close"), "Close")
    // dark
    tap(button(app, "Notes"), "Notes")
    check(wait(text(app, "Dark heading")), "in dark mode the Guide shows")
    snap("dark-notes")
    tap(button(app, "Edit"), "Edit")
    check(wait(field(app)), "and the editor opens")
    tap(button(app, "Preview"), "Preview")
    check(wait(text(app, "Dark heading")) && text(app, "a quote").exists, "its Preview draws too")
    snap("dark-preview")
    noLabel(app, "dark mode")
  }
}
