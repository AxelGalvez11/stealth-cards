// What the end-to-end tests for the App Store pieces (StoreTests, AccountTests) share: made-up people on a copy of the server on this
// Mac (the lc_dev cookie, which the debug-only `-dev <name>` launch argument sets), requests as one of them, ways to find things on
// screen, and the counting of checks (each printed as `  ok   …` or `  FAIL …`, and `<Name>: N passed, M failed` at the end).
import XCTest

class AppCase: XCTestCase {
  /// The server (LUCIDA_SERVER, from the script that starts it).
  static var server: String { ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3850" }
  /// Checks passed and failed, by test class; the line that ends the run.
  nonisolated(unsafe) static var tally: [String: (passed: Int, failed: Int)] = [:]
  /// What this class calls itself in that last line, and the variable that turns it on (so no other script runs it).
  class var label: String { "Tests" }
  class var switchName: String { "LUCIDA_E2E" }
  /// A run's own people (lc_dev names are letters and numbers), so a test can run again on the same server.
  let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment[Self.switchName] != nil, "Run it with its script in ios/tools")
  }
  override class func tearDown() {
    let t = tally[label] ?? (0, 0)
    print("\(label): \(t.passed) passed, \(t.failed) failed")
  }

  // ---------- counting ----------
  func check(_ ok: Bool, _ name: String) {
    var t = Self.tally[Self.label] ?? (0, 0)
    if ok { t.passed += 1; Self.tally[Self.label] = t; print("  ok   " + name) }
    else {
      t.failed += 1; Self.tally[Self.label] = t
      print("  FAIL " + name); XCTFail(name)
      snap("\(Self.label.lowercased())-fail-\(t.failed)")
    }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }

  // ---------- the server, as made-up people ----------
  /// A request as one of the made-up people ("": nobody); the answer's JSON. `base` is another address (a stand-in in front of the server).
  @discardableResult
  func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil, base: String? = nil, form: String? = nil) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: (base ?? Self.server) + path)!)
    r.httpMethod = method
    if !who.isEmpty { r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie") }
    if let form { r.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type"); r.httpBody = Data(form.utf8) }
    else { r.setValue("application/json", forHTTPHeaderField: "Content-Type"); if let body { r.httpBody = try? JSONSerialization.data(withJSONObject: body) } }
    let done = DispatchSemaphore(value: 0)
    var out: (Int, Any?) = (0, nil)
    URLSession.shared.dataTask(with: r) { data, resp, _ in
      out = ((resp as? HTTPURLResponse)?.statusCode ?? 0, data.flatMap { try? JSONSerialization.jsonObject(with: $0) })
      done.signal()
    }.resume()
    _ = done.wait(timeout: .now() + 20)
    return out
  }
  @discardableResult
  func act(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/action", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  @discardableResult
  func social(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/social", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  func state(_ who: String) -> [String: Any] { api(who, "GET", "/api/state").json as? [String: Any] ?? [:] }
  func plan(_ who: String) -> [String: Any] { (state(who)["me"] as? [String: Any])?["plan"] as? [String: Any] ?? [:] }
  func handle(_ who: String) -> String { (state(who)["profile"] as? [String: Any])?["handle"] as? String ?? "" }
  func get(_ who: String, _ path: String) -> [String: Any] { api(who, "GET", path).json as? [String: Any] ?? [:] }
  /// Waits for a condition on the server (a save that goes out a moment after a tap).
  func eventually(_ s: TimeInterval = 12, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
  }
  func name(_ who: String, _ n: String) { act(who, "settings.update", ["patch": ["name": n, "welcomed": true]]) }
  /// Shares a deck of `n` basic cards as `who`: its id, its shared id and address.
  func shareDeck(_ who: String, _ deckName: String, n: Int = 3) -> (deck: String, id: String, slug: String) {
    let deck = act(who, "deck.add", ["name": deckName])["id"] as? String ?? ""
    for i in 1...n { act(who, "card.add", ["deckId": deck, "kind": "basic", "front": deckName + " question \(i)", "back": "Answer \(i)"]) }
    let sh = social(who, "deck.share", ["deckId": deck, "visibility": "public"])
    return (deck, sh["id"] as? String ?? "", sh["slug"] as? String ?? "")
  }

  // ---------- the app ----------
  /// Starts the app as one of the made-up people ("": the person on this computer). `env` is for the launch's environment.
  func launch(as who: String, _ extra: [String] = [], server: String? = nil, env: [String: String] = [:]) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", server ?? Self.server, "-dev", who] + extra
    for (k, v) in env { app.launchEnvironment[k] = v }
    app.launch()
    return app
  }
  /// Anything on screen whose label has these words.
  func any(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch }
  func text(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.staticTexts[label].firstMatch }
  /// How many things on screen have exactly this label.
  func count(_ app: XCUIApplication, _ label: String) -> Int {
    app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).count
  }
  func wait(_ e: XCUIElement, _ s: TimeInterval = 20) -> Bool { e.waitForExistence(timeout: s) }
  /// Waits until something's gone.
  func gone(_ e: XCUIElement, _ s: TimeInterval = 20) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  /// Taps something once it's there; if it never is, that's a failed check (a missing element would end the whole test).
  func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 20) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  func typeInto(_ field: XCUIElement, _ text: String, clear: Int = 0) {
    guard wait(field, 10) else { check(false, "found the field to type “\(text)” in"); return }
    // (To delete what's there, the tap goes near the end of the text: the field's own padding is a few points, so not quite at the edge.)
    if clear > 0 { field.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap() } else { field.tap() }
    if clear > 0 { field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: clear)) }
    field.typeText(text)
  }
  /// Scrolls until something is on screen (a long page's lower rows).
  func scrollTo(_ app: XCUIApplication, _ e: XCUIElement, max: Int = 8) {
    var n = 0
    while !(e.exists && e.isHittable) && n < max { app.swipeUp(velocity: .slow); n += 1 }
  }

  // ---------- a deck page's two menus (the owner, 2026-10-02) ----------
  /// Study (Flashcards, Learn) and + (New card, Make cards, Source, Notes, Upload diagram, Make diagram): Lucida's own menu (Screens/AddMenu.swift),
  /// opened by the buttons `deck.study` (under the cover) and `deck.add` (the cover's round +). A row is `menu.<its name>` (the page has a Notes tab too).
  func deckButton(_ app: XCUIApplication, _ which: String) -> XCUIElement { app.buttons[which == "Add" ? "deck.add" : "deck.study"].firstMatch }
  func menuRow(_ app: XCUIApplication, _ name: String) -> XCUIElement {
    app.otherElements.matching(NSPredicate(format: "identifier BEGINSWITH %@", "menu.")).buttons.matching(NSPredicate(format: "label == %@", name)).firstMatch
  }
  /// Opens one (unless it is open: its first row shows); false when its button isn't there.
  @discardableResult func openDeckMenu(_ app: XCUIApplication, _ which: String) -> Bool {
    let first = menuRow(app, which == "Add" ? "New card" : "Flashcards")
    if first.exists && first.isHittable { return true }
    let b = deckButton(app, which)
    guard wait(b, 15) else { check(false, "found the deck's " + (which == "Add" ? "+" : "Study") + " button"); return false }
    b.tap()
    return wait(first, 5)
  }
  /// Presses one of a deck menu's rows, opening the menu first.
  func fromDeckMenu(_ app: XCUIApplication, _ which: String, _ row: String) {
    openDeckMenu(app, which)
    tap(menuRow(app, row), (which == "Add" ? "+" : "Study") + " › " + row)
  }
  /// Closes an open deck menu (a touch outside it, near the bottom of the screen).
  func closeDeckMenu(_ app: XCUIApplication) {
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)).tap()
    Thread.sleep(forTimeInterval: 0.4)
  }
}
