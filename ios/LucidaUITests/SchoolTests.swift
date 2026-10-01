// Finding decks by school, level, and subject in the iPhone app, end to end, against a copy of the server on this Mac with made-up
// people (its lc_dev cookie, which the debug-only `-dev <name>` launch argument sets). The same story as the web app's own test
// (school-ui), in flows that each set up their own people (so any one can run alone):
//   1  Edit profile: a level, a school searched in the list (or typed as Other, or None), a year, and the switch for showing them on
//      your profile (off to start with); a high school student has no School row. What the server has, and what others see.
//   2  A public deck's labels in Deck settings → Sharing: level, subject, school (it starts as the owner's, who shows it); a Link
//      only deck has none to show.
//   3  Discover: Level, Subject, and School filters (a school is searched as you type), the "Popular at" row for someone with a
//      school, Clear, and what a filter nothing matches says; search narrowed too.
//
// Run it with ios/tools/e2e-school.sh (it starts a fresh server on port 3955). It only runs when LUCIDA_SCHOOL is set, so the
// other scripts keep running their own checks alone.
import XCTest

final class SchoolTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3955"
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)
  private let STANFORD = "243744", DAVIS = "110644"

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_SCHOOL"] != nil, "Run with ios/tools/e2e-school.sh")
  }
  override class func tearDown() { print("School: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else { Self.failed += 1; print("  FAIL " + name); XCTFail(name); snap("school-fail-\(Self.failed)") }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 12) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  @discardableResult
  private func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: Self.server + path)!)
    r.httpMethod = method
    if !who.isEmpty { r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie") }
    r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let body { r.httpBody = try? JSONSerialization.data(withJSONObject: body) }
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
  private func act(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/action", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  @discardableResult
  private func social(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/social", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  private func get(_ who: String, _ path: String) -> [String: Any] { api(who, "GET", path).json as? [String: Any] ?? [:] }
  private func handle(_ who: String) -> String { social(who, "profile.ensure")["handle"] as? String ?? "" }
  /// Waits for a condition on the server (a save that goes out a moment after a tap).
  private func eventually(_ s: TimeInterval = 12, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
  }
  private func name(_ who: String, _ n: String) { act(who, "settings.update", ["patch": ["name": n, "welcomed": true]]) }
  /// Shares a deck of `n` basic cards as `who` (public unless told otherwise, with the labels in `o`): its deck id, shared id.
  private func shareDeck(_ who: String, _ deckName: String, n: Int = 3, _ o: [String: Any] = [:]) -> (deck: String, id: String) {
    let deck = act(who, "deck.add", ["name": deckName])["id"] as? String ?? ""
    for i in 1...n { act(who, "card.add", ["deckId": deck, "kind": "basic", "front": deckName + " question \(i)", "back": "Answer \(i)"]) }
    var p: [String: Any] = ["deckId": deck, "visibility": "public"]
    for (k, v) in o { p[k] = v }
    return (deck, social(who, "deck.share", p)["id"] as? String ?? "")
  }

  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  private func any(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func text(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.staticTexts[label].firstMatch }
  /// The lowest button with this label on screen (in a sheet or on a pushed page, not the page under it).
  private func lowest(_ app: XCUIApplication, _ label: String) -> XCUIElement {
    let all = app.buttons.matching(NSPredicate(format: "label == %@", label)).allElementsBoundByIndex
    return all.max { $0.frame.minY < $1.frame.minY } ?? app.buttons[label].firstMatch
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool { e.waitForExistence(timeout: s) }
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func typeInto(_ field: XCUIElement, _ text: String) {
    guard wait(field, 10) else { check(false, "found the field to type “\(text)” in"); return }
    field.tap(); field.typeText(text)
  }
  /// A row's value (its accessibility value), like a School row's school.
  private func value(_ e: XCUIElement) -> String { e.value as? String ?? "" }

  // ---------- 1: Edit profile ----------
  func test1EditProfile() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let ann = "scn" + run, bob = "scb" + run
    name(ann, "Ann Lee"); name(bob, "Bob Stone")
    let annH = handle(ann); _ = handle(bob)
    var app = launch(as: ann, ["-open", "profile"])
    tap(button(app, "Edit profile"), "Edit profile")
    check(wait(button(app, "Save")) && wait(text(app, "Level")) && wait(text(app, "Year")), "Edit profile asks for a level, a school, and a year")
    check(button(app, "School").exists && any(app, "Show my school on my profile").exists, "with a School row and the switch")
    check(wait(any(app, "Only you can see it unless this is on.")), "and says what it means in a line")
    check(value(button(app, "Show my school on my profile")) == "Off", "the switch starts off")
    tap(button(app, "College"), "College")
    check(button(app, "College").isSelected, "a level is picked with a tap")
    tap(button(app, "School"), "School")
    check(wait(text(app, "School")) && wait(app.textFields["Search schools"]), "the School row opens a search")
    typeInto(app.textFields["Search schools"], "stanford")
    let row = button(app, "Stanford University, Stanford, CA")
    check(wait(row), "typing finds Stanford University, with its city and state")
    row.tap()
    check(gone(app.textFields["Search schools"]) && value(button(app, "School")) == "Stanford University", "picking it closes the search, and the School row says it")
    tap(button(app, "3rd"), "3rd")
    check(button(app, "3rd").isSelected, "a year is picked")
    tap(button(app, "Save"), "Save")
    check(gone(button(app, "Save")), "Save closes the sheet")
    check(eventually { (self.get(ann, "/api/public/profile?h=" + annH)["schoolId"] as? String) == self.STANFORD }, "saved: the school by its id")
    var p = get(ann, "/api/public/profile?h=" + annH)
    check(p["school"] as? String == "Stanford University" && p["level"] as? String == "college" && p["year"] as? String == "3" && p["showSchool"] as? Bool == false, "with the level and the year, and the switch still off")
    let bp = get(bob, "/api/public/profile?h=" + annH)
    check((bp["school"] as? String ?? "x").isEmpty && (bp["level"] as? String ?? "x").isEmpty && (bp["year"] as? String ?? "x").isEmpty, "someone else sees none of it while it's off")
    check(!any(app, "Stanford University").exists, "and with it off, your own page doesn't show the school")
    // Open again: what you chose is there. Turn the switch on.
    tap(button(app, "Edit profile"), "Edit profile")
    check(wait(button(app, "Save")) && button(app, "College").isSelected && button(app, "3rd").isSelected && value(button(app, "School")) == "Stanford University", "Edit profile opens with what you chose")
    tap(button(app, "Show my school on my profile"), "the switch")
    tap(button(app, "Save"), "Save")
    check(wait(any(app, "Stanford University · College · 3rd year")), "on, your page shows “Stanford University · College · 3rd year”")
    check(eventually { (self.get(bob, "/api/public/profile?h=" + annH)["school"] as? String) == "Stanford University" }, "and so does anyone else's view of it")
    p = get(bob, "/api/public/profile?h=" + annH)
    check(p["level"] as? String == "college" && p["year"] as? String == "3", "its level and year too")
    // Other: a school typed in words
    tap(button(app, "Edit profile"), "Edit profile")
    tap(button(app, "School"), "School")
    typeInto(app.textFields["Search schools"], "Tiny Hill College")
    check(wait(text(app, "No school matches")) && wait(button(app, "Other: “Tiny Hill College”")), "a school that isn't on the list says so, and offers what was typed as “Other”")
    button(app, "Other: “Tiny Hill College”").tap()
    check(gone(app.textFields["Search schools"]) && value(button(app, "School")) == "Tiny Hill College", "which becomes the school")
    tap(button(app, "Save"), "Save")
    check(eventually { (self.get(ann, "/api/public/profile?h=" + annH)["school"] as? String) == "Tiny Hill College" }, "saved as typed words")
    check((get(ann, "/api/public/profile?h=" + annH)["schoolId"] as? String ?? "x").isEmpty, "with no id")
    // None
    tap(button(app, "Edit profile"), "Edit profile")
    tap(button(app, "School"), "School")
    tap(button(app, "None"), "None")
    check(gone(app.textFields["Search schools"]) && (value(button(app, "School")).isEmpty || value(button(app, "School")) == "Add"), "None takes the school off")
    tap(button(app, "Save"), "Save")
    check(eventually { (self.get(ann, "/api/public/profile?h=" + annH)["school"] as? String ?? "x").isEmpty }, "saved")
    check(get(ann, "/api/public/profile?h=" + annH)["level"] as? String == "college", "with the level kept")
    // High school: a level and no school
    tap(button(app, "Edit profile"), "Edit profile")
    tap(button(app, "High school"), "High school")
    check(gone(button(app, "School")), "picking High school takes the School row away: there is no list of high schools")
    tap(button(app, "Save"), "Save")
    check(eventually { (self.get(ann, "/api/public/profile?h=" + annH)["level"] as? String) == "highschool" }, "saved with the level only")
    check(wait(any(app, "High school · 3rd year")), "and the page says “High school · 3rd year”")
    app.terminate()
    // Someone else's page shows it too, when it's on
    app = launch(as: bob, ["-open", "profile:" + annH])
    check(wait(any(app, "High school · 3rd year")), "Bob sees it on Ann's page")
  }

  // ---------- 2: a deck's labels ----------
  func test2DeckLabels() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let dan = "scd" + run
    name(dan, "Dan Ruiz")
    social(dan, "profile.update", ["patch": ["schoolId": STANFORD, "level": "college", "showSchool": true]])
    let deck = act(dan, "deck.add", ["name": "Neurons " + run])["id"] as? String ?? ""
    act(dan, "card.add", ["deckId": deck, "kind": "basic", "front": "What is a neuron?", "back": "A nerve cell"])
    func mine() -> [String: Any]? { ((get(dan, "/api/social/mine")["decks"] as? [[String: Any]]) ?? []).first }
    let app = launch(as: dan, ["-open", "deck:Neurons " + run])
    tap(button(app, "Deck settings"), "Deck settings")
    tap(lowest(app, "Sharing"), "Sharing")
    check(wait(text(app, "Who can see it")) && !any(app, "People can find your deck by these.").exists, "a private deck has no labels")
    tap(lowest(app, "Public"), "Public")
    check(wait(any(app, "People can find your deck by these.")), "public, it has Labels: “People can find your deck by these.”")
    check(button(app, "Level").exists && button(app, "Subject").exists && button(app, "School").exists, "Level, Subject, and School")
    check(eventually { (mine()?["school"] as? String) == "Stanford University" } && value(button(app, "School")) == "Stanford University", "the school starts as yours, because you show it")
    tap(button(app, "Level"), "Level")
    check(wait(button(app, "Medical or professional")) && button(app, "None").exists, "Level has the five levels, and None")
    button(app, "College").tap()
    check(eventually { (mine()?["level"] as? String) == "college" }, "College is saved on the deck")
    check(wait(app.buttons["Level"]) && value(button(app, "Level")) == "College", "and the row says it")
    tap(button(app, "Subject"), "Subject")
    check(wait(button(app, "Biology")) && wait(button(app, "Art and design")), "Subject has the subjects")
    button(app, "Biology").tap()
    check(eventually { (mine()?["subject"] as? String) == "biology" }, "Biology is saved")
    tap(button(app, "School"), "School")
    tap(button(app, "None"), "None")
    check(eventually { (mine()?["school"] as? String ?? "x").isEmpty }, "None clears the school")
    tap(button(app, "School"), "School")
    typeInto(app.textFields["Search schools"], "davis")
    let davis = button(app, "University of California-Davis, Davis, CA")
    check(wait(davis), "searching finds a school")
    davis.tap()
    check(eventually { (mine()?["schoolId"] as? String) == self.DAVIS }, "and picking it labels the deck with it")
    tap(lowest(app, "Link only"), "Link only")
    check(gone(any(app, "People can find your deck by these.")), "Link only has no labels to show (they're for public decks)")
  }

  // ---------- 3: Discover ----------
  func test3Discover() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let dee = "scy" + run, ann = "scz" + run, vic = "scv" + run
    name(dee, "Dee Park"); name(ann, "Ann Lee"); name(vic, "Vic Stone")
    social(dee, "profile.update", ["patch": ["schoolId": DAVIS, "level": "college", "showSchool": true]])
    social(vic, "profile.update", ["patch": ["schoolId": DAVIS, "level": "college"]])
    _ = shareDeck(dee, "Genetics " + run, ["level": "college", "subject": "biology", "schoolId": DAVIS])
    _ = shareDeck(dee, "Poetry " + run, ["level": "highschool", "subject": "english"])
    _ = shareDeck(ann, "Brains " + run, ["level": "college", "subject": "biology", "schoolId": STANFORD])
    let app = launch(as: vic, ["-open", "discover"])
    check(wait(button(app, "Level")) && button(app, "Subject").exists && button(app, "School").exists, "Discover has Level, Subject, and School filters")
    check(wait(any(app, "Popular at University of California-Davis")), "and a “Popular at University of California-Davis” row for someone with that school")
    check(wait(any(app, "Genetics " + run)), "with a deck labeled with it")
    tap(button(app, "Level"), "Level")
    check(wait(button(app, "Any level")) && button(app, "High school").exists, "Level opens its choices, with “Any level”")
    button(app, "College").tap()
    check(wait(button(app, "College")) && gone(any(app, "Popular at University of California-Davis")), "the pill says College, and it's one list now, not the sections")
    check(wait(any(app, "Genetics " + run)) && any(app, "Brains " + run).exists && !any(app, "Poetry " + run).exists, "the decks are the college ones")
    check(button(app, "Clear").exists, "with Clear")
    tap(button(app, "Subject"), "Subject")
    tap(button(app, "Biology"), "Biology")
    tap(button(app, "School"), "School")
    typeInto(app.textFields["Search schools"], "stanford")
    let stan = button(app, "Stanford University, Stanford, CA")
    check(wait(stan), "a school is searched as you type")
    stan.tap()
    check(wait(button(app, "Stanford University")), "a school filter says its name")
    check(wait(any(app, "Brains " + run)) && gone(any(app, "Genetics " + run)), "all three together: only the Stanford deck")
    tap(button(app, "Clear"), "Clear")
    check(wait(any(app, "Popular at University of California-Davis")), "Clear brings the sections back")
    tap(button(app, "Level"), "Level")
    button(app, "Graduate").tap()
    check(wait(text(app, "No decks match.")), "a filter nothing matches says “No decks match.”")
    // Search, narrowed (the pill says Graduate now)
    tap(button(app, "Graduate"), "the Level pill")
    tap(button(app, "College"), "College")
    let search = app.textFields["Search decks and people"].firstMatch
    typeInto(search, run)
    check(wait(any(app, "Genetics " + run)) && !any(app, "Poetry " + run).exists, "a search with a level finds the decks of that level")
    check(!text(app, "People").exists, "and no people (nothing lists people by school or level)")
  }
}
