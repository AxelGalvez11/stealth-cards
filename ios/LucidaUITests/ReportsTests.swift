// Report, Check this deck, and Get verified end to end in the iPhone app, against a copy of the server on this Mac with
// made-up people (its lc_dev cookie, which the debug-only `-dev <name>` launch argument sets). The same story as the web
// app's own tests (followups: report-ui, check-ui, settings-news-ui, helpers-ui), in flows that each set up their own people
// (so any one can run alone):
//   1  Maria reports a deck (a reason, a line for Other, the thanks); its owner has no Report; the server's words when it
//      says no (your own deck, and too many reports waiting).
//   2  Maria reports a person; your own profile and one that isn't there have no Report; the server's words for yourself.
//   3  Alex reports a suggestion on his deck (the cards his own AI made have no Report).
//   4  A teacher asks to be verified in Settings (what the server says to a bad email first), the made-up person "admin"
//      approves it, Settings says Verified teacher and News says so, and the teacher checks someone else's deck ("Checked
//      by you"); not on their own deck, not for someone who isn't verified, and once the owner changes the deck the
//      button is back. A school is Verified school.
//   5  A helper of a community deck opens a suggestion's News row and lands on Suggestions with that deck in it, and can
//      report it too.
//   6  The library still opens when the sync is slow: a small stand-in server holds /api/state?sync=1 for 12 seconds.
//
// Run it with ios/tools/e2e-reports.sh (it starts a fresh server on port 3844 and the stand-in on 3846). It only runs when
// LUCIDA_REPORTS is set, so ios/tools/e2e.sh keeps running the study network's checks alone.
import XCTest

final class ReportsTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3844"
  static let slow = ProcessInfo.processInfo.environment["LUCIDA_SLOW"] ?? "http://127.0.0.1:3846"
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_REPORTS"] != nil, "Run with ios/tools/e2e-reports.sh")
  }
  override class func tearDown() { print("Reports: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else {
      Self.failed += 1; print("  FAIL " + name); XCTFail(name)
      snap("reports-fail-\(Self.failed)")
    }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  /// Taps something once it's there; if it never is, that's a failed check (a missing element would end the whole test).
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 8) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  /// A request as one of the made-up people ("": the person on this computer); the answer's JSON.
  @discardableResult
  private func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil, base: String? = nil) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: (base ?? Self.server) + path)!)
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
  private func state(_ who: String) -> [String: Any] { api(who, "GET", "/api/state").json as? [String: Any] ?? [:] }
  private func handle(_ who: String) -> String { (state(who)["profile"] as? [String: Any])?["handle"] as? String ?? "" }
  private func get(_ who: String, _ path: String) -> [String: Any] { api(who, "GET", path).json as? [String: Any] ?? [:] }
  /// Waits for a condition on the server (a save that goes out a moment after a tap).
  private func eventually(_ s: TimeInterval = 8, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
  }
  /// What the admin page has: the report about something (its deck, person, or suggestion), or nil.
  private func adminReport(_ pick: ([String: Any]) -> Bool) -> [String: Any]? {
    ((api("admin", "GET", "/api/admin").json as? [String: Any])?["reports"] as? [[String: Any]])?.first(where: pick)
  }
  private func first(_ rep: [String: Any]?) -> [String: Any]? { (rep?["reports"] as? [[String: Any]])?.first }
  /// A shared deck's check as its page has it (nil: nobody checked it).
  private func checkOf(_ who: String, _ sharedId: String) -> [String: Any]? { get(who, "/api/public/deck?id=" + sharedId)["checked"] as? [String: Any] }
  /// Everyone reports to the made-up admin's page; it says which reports a person sent.
  private func reportsBy(_ h: String) -> [[String: Any]] {
    ((api("admin", "GET", "/api/admin").json as? [String: Any])?["reports"] as? [[String: Any]] ?? []).filter { g in
      (g["reports"] as? [[String: Any]] ?? []).contains { (($0["by"] as? [String: Any])?["handle"] as? String) == h }
    }
  }
  /// Someone becomes a verified teacher or school the way the web's tests do it: they ask, and "admin" approves.
  private func verify(_ who: String, role: String = "teacher", school: String = "UC Davis") {
    social(who, "verify.ask", ["role": role, "school": school, "contact": who + "@ucdavis.edu"])
    approve(who)
  }
  private func approve(_ who: String) {
    let mine = handle(who)
    let req = ((api("admin", "GET", "/api/admin").json as? [String: Any])?["requests"] as? [[String: Any]] ?? []).first { ($0["person"] as? [String: Any])?["handle"] as? String == mine }
    social("admin", "admin.verify", ["id": req?["id"] as? String ?? "", "pick": "approve"])
  }

  /// One flow's people and deck: Alex shares a deck of three cards; Maria is someone else.
  private struct World {
    let alex: String, maria: String, deckName: String
    var deck = "", sharedId = "", slug = "", AH = "", MH = "", path = ""
  }
  private func name(_ who: String, _ n: String) { act(who, "settings.update", ["patch": ["name": n, "welcomed": true]]) }
  /// Shares a deck of `n` basic cards as `who`: its id, its shared id and address.
  private func shareDeck(_ who: String, _ deckName: String, n: Int = 3, _ o: [String: Any] = [:]) -> (deck: String, id: String, slug: String) {
    let deck = act(who, "deck.add", ["name": deckName])["id"] as? String ?? ""
    for i in 1...n { act(who, "card.add", ["deckId": deck, "kind": "basic", "front": deckName + " question \(i)", "back": "Answer \(i)"]) }
    var p: [String: Any] = ["deckId": deck, "visibility": "public"]
    for (k, v) in o { p[k] = v }
    let sh = social(who, "deck.share", p)
    return (deck, sh["id"] as? String ?? "", sh["slug"] as? String ?? "")
  }
  private func world(_ tag: String) -> World {
    var w = World(alex: "rpa" + tag + run, maria: "rpm" + tag + run, deckName: "Cell Biology " + tag + run)
    name(w.alex, "Alex Kim"); name(w.maria, "Maria Santos")
    let d = shareDeck(w.alex, w.deckName)
    w.deck = d.deck; w.sharedId = d.id; w.slug = d.slug
    w.AH = handle(w.alex); w.MH = social(w.maria, "profile.ensure")["handle"] as? String ?? ""
    w.path = "/@" + w.AH + "/" + w.slug
    return w
  }

  private func launch(as who: String, _ extra: [String] = [], server: String? = nil) -> XCUIApplication {
    let app = XCUIApplication()
    // ("": the person on this computer, who has no cookie: the app keeps the last person's, so it's cleared.)
    app.launchArguments = ["-server", server ?? Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  /// Anything on screen whose label has these words.
  private func any(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch
  }
  private func text(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.staticTexts[label].firstMatch }
  /// How many things on screen have exactly this label (a name on a page, and again on the sheet over it).
  private func count(_ app: XCUIApplication, _ label: String) -> Int {
    app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).count
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool { e.waitForExistence(timeout: s) }
  /// Waits until something's gone.
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func typeInto(_ field: XCUIElement, _ text: String, clear: Int = 0) {
    guard wait(field, 6) else { check(false, "found the field to type “\(text)” in"); return }
    if clear > 0 { field.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap() } else { field.tap() }
    if clear > 0 { field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: clear)) }
    field.typeText(text)
  }
  private let thanks = "Thanks. We’ll take a look."
  /// What the Report sheet does once it's open: the title and the name on it, four reasons, and Send waits for one.
  private func openedReport(_ app: XCUIApplication, _ title: String, named: String, before: Int) -> Bool {
    wait(text(app, title)) && count(app, named) > before && ["Wrong or harmful", "Spam", "Someone else’s work", "Other"].allSatisfy { button(app, $0).exists }
  }
  /// Picks a reason (and a line), sends, and checks the thanks; Done closes it.
  private func sendReport(_ app: XCUIApplication, _ where_: String, reason: String, line: String = "") {
    tap(button(app, reason), reason)
    check(button(app, reason).isSelected, where_ + ": the reason picked is marked")
    if !line.isEmpty { typeInto(app.textFields["A line about it"], line) }
    tap(button(app, "Send"), "Send")
    check(wait(any(app, thanks)), where_ + ": Send says “" + thanks + "”")
    tap(button(app, "Done"), "Done")
    check(gone(any(app, thanks)), where_ + ": Done closes the sheet")
  }

  // ---------- 1: reporting a deck ----------
  func test1ReportADeck() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("1")
    print("Flow 1, people: \(w.alex) (@\(w.AH)), \(w.maria) (@\(w.MH))")
    var app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Study")), "Maria opens Alex's deck page")
    check(wait(button(app, "Report")), "a shared deck's page has a Report button for someone else's deck")
    let r = button(app, "Report")
    check(r.frame.width < 120 && r.frame.height <= 44, "it's quiet: a few words, not a box")
    check(!button(app, "Check this deck").exists, "someone who isn't verified has no Check this deck")
    let named = count(app, w.deckName)
    r.tap()
    check(openedReport(app, "Report this deck", named: w.deckName, before: named), "Report opens the sheet “Report this deck”, naming the deck, with four reasons")
    check(button(app, "Send").exists && button(app, "Cancel").exists, "with Cancel and Send")
    button(app, "Send").tap()
    Thread.sleep(forTimeInterval: 0.6)
    check(!any(app, thanks).exists, "Send waits for a reason")
    tap(button(app, "Close"), "Close")
    check(gone(text(app, "Report this deck")), "the X closes it")
    tap(button(app, "Report"), "Report")
    check(wait(text(app, "Report this deck")), "Report opens it again")
    tap(button(app, "Cancel"), "Cancel")
    check(gone(text(app, "Report this deck")), "and Cancel closes it")
    tap(button(app, "Report"), "Report")
    tap(button(app, "Other"), "Other")
    check(wait(app.textFields["A line about it"]), "Other asks for a line")
    button(app, "Send").tap()
    Thread.sleep(forTimeInterval: 0.8)
    check(!any(app, thanks).exists && adminReport { ($0["deck"] as? [String: Any])?["id"] as? String == w.sharedId } == nil, "Other needs a line: nothing is sent without it")
    sendReport(app, "deck", reason: "Someone else’s work", line: "These are my class notes")
    let rep = adminReport { ($0["deck"] as? [String: Any])?["id"] as? String == w.sharedId }
    let mine = first(rep)
    check(rep?["kind"] as? String == "deck" && (rep?["reports"] as? [[String: Any]])?.count == 1 && mine?["reason"] as? String == "stolen" && mine?["note"] as? String == "These are my class notes", "the admin page has it, with the reason and the line")
    check((mine?["by"] as? [String: Any])?["handle"] as? String == w.MH, "and who sent it")
    check(button(app, "Study").exists && button(app, "Report").exists, "what the page shows after it's sent: the same page, still there")

    app.terminate()
    app = launch(as: w.alex, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Edit")), "Alex opens his own deck page")
    check(!button(app, "Report").exists && !button(app, "Study").exists, "its owner has no Report on their own deck")

    // ---------- the server's words when it says no ----------
    app.terminate()
    // A page wouldn't offer Report on your own deck, so this opens the sheet the way a debug build can.
    app = launch(as: w.alex, ["-open", "report:deck:" + w.sharedId + ":" + w.deckName])
    check(wait(text(app, "Report this deck")), "the Report sheet for his own deck")
    tap(button(app, "Spam"), "Spam")
    tap(button(app, "Send"), "Send")
    check(wait(any(app, "It’s your deck.")), "reporting your own deck: the sheet says “It’s your deck.”")
    check(text(app, "Report this deck").exists && !any(app, thanks).exists, "it stays open, with no thanks")
    check(reportsBy(w.AH).isEmpty, "and nothing was sent")
    tap(button(app, "Wrong or harmful"), "Wrong or harmful")
    check(gone(any(app, "It’s your deck.")), "picking another reason clears it")
    app.terminate()

    // Too many waiting: Dan has ten reports open, so the eleventh says so.
    let dan = "rpd1" + run
    name(dan, "Dan Ruiz")
    let decks = (1...11).map { shareDeck(w.alex, "Cap deck \($0) " + run, n: 1) }
    for d in decks.prefix(10) { social(dan, "report.send", ["kind": "deck", "id": d.id, "reason": "spam", "note": ""]) }
    let DH = handle(dan).isEmpty ? (social(dan, "profile.ensure")["handle"] as? String ?? "") : handle(dan)
    check(reportsBy(DH).count == 10, "Dan has ten reports waiting")
    app = launch(as: dan, ["-open", "deckpage:/@" + w.AH + "/" + decks[10].slug])
    tap(button(app, "Report"), "Report")
    tap(button(app, "Spam"), "Spam")
    tap(button(app, "Send"), "Send")
    check(wait(any(app, "You have 10 reports waiting.")), "with ten reports waiting, the eleventh says “You have 10 reports waiting.” in the sheet")
    check(text(app, "Report this deck").exists && !any(app, thanks).exists && reportsBy(DH).count == 10, "it stays open, and nothing more was sent")
    tap(button(app, "Cancel"), "Cancel")
    check(gone(text(app, "Report this deck")), "Cancel closes it")
    check(app.alerts.count == 0, "no alert came up")

    // The owner stops sharing the deck while its page is open: Report says so, in the server's words.
    let gone_ = shareDeck(w.alex, "Soon private " + run, n: 1)
    app.terminate()
    app = launch(as: w.maria, ["-open", "deckpage:/@" + w.AH + "/" + gone_.slug])
    check(wait(button(app, "Study")), "Maria opens another of Alex's decks")
    social(w.alex, "deck.share", ["deckId": gone_.deck, "visibility": "private"])
    tap(button(app, "Report"), "Report")
    tap(button(app, "Spam"), "Spam")
    tap(button(app, "Send"), "Send")
    check(wait(any(app, "That deck isn’t shared anymore.")) && !any(app, thanks).exists, "a deck that stopped being shared: the sheet says “That deck isn’t shared anymore.”")
  }

  // ---------- 2: reporting a person ----------
  func test2ReportAPerson() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("2")
    print("Flow 2, people: \(w.alex) (@\(w.AH)), \(w.maria) (@\(w.MH))")
    var app = launch(as: w.maria, ["-open", "profile:" + w.AH])
    check(wait(button(app, "Follow")), "Maria opens Alex's profile")
    check(wait(button(app, "Report")), "someone else's profile has Report")
    let r = button(app, "Report")
    check(r.frame.width < 120 && r.frame.height <= 44, "it's quiet: a few words, not a box")
    let named = count(app, "Alex Kim")
    r.tap()
    check(openedReport(app, "Report this person", named: "Alex Kim", before: named), "Report opens “Report this person”, naming him, with four reasons")
    sendReport(app, "person", reason: "Spam", line: "Every deck links to a shop")
    let rep = adminReport { ($0["person"] as? [String: Any])?["handle"] as? String == w.AH }
    check(rep?["kind"] as? String == "profile" && first(rep)?["reason"] as? String == "spam" && first(rep)?["note"] as? String == "Every deck links to a shop", "the admin page has it, with the reason and the line")
    check(((first(rep)?["by"]) as? [String: Any])?["handle"] as? String == w.MH, "and who sent it")
    check(button(app, "Follow").exists && button(app, "Report").exists, "what the page shows after it's sent: the same page, still there")

    app.terminate()
    app = launch(as: w.alex, ["-open", "profile"])
    check(wait(button(app, "Edit profile")) && any(app, "@" + w.AH).exists, "Alex opens his own profile")
    check(!button(app, "Report").exists, "your own profile has no Report")
    app.terminate()
    app = launch(as: w.maria, ["-open", "profile:nobodyhere" + run])
    check(wait(text(app, "No one has that name")), "a profile that isn't there says so")
    Thread.sleep(forTimeInterval: 0.5)
    check(!button(app, "Report").exists, "and has no Report")
    app.terminate()
    app = launch(as: w.alex, ["-open", "report:profile:" + w.AH + ":Alex Kim"])
    check(wait(text(app, "Report this person")), "the Report sheet for himself")
    tap(button(app, "Spam"), "Spam")
    tap(button(app, "Send"), "Send")
    check(wait(any(app, "That’s you.")) && !any(app, thanks).exists, "reporting yourself: the sheet says “That’s you.”")
  }

  // ---------- 3: reporting a suggestion ----------
  func test3ReportASuggestion() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("3")
    print("Flow 3, people: \(w.alex) (@\(w.AH)), \(w.maria) (@\(w.MH))")
    let sg = social(w.maria, "suggestion.send", ["id": w.sharedId, "message": "Buy my answers", "changes": [["op": "add", "after": ["kind": "basic", "front": "Spam question", "back": "Yes"]]]])
    check(!(sg["id"] as? String ?? "").isEmpty, "Maria suggests a change to Alex's deck")
    var app = launch(as: w.alex, ["-open", "suggestions"])
    let row = buttonStarting(app, "Maria Santos")
    check(wait(row), "Alex's Suggestions list it")
    check(!button(app, "Report").exists, "the list has no Report (it's on a suggestion once it's opened)")
    row.tap()
    check(wait(text(app, "Maria Santos suggested 1 change")), "opening it shows what she suggested")
    check(wait(button(app, "Report")), "it has Report")
    let r = button(app, "Report")
    check(r.frame.width < 120 && r.frame.height <= 44, "it's quiet: a few words, not a box")
    let named = count(app, "Maria Santos")
    r.tap()
    check(openedReport(app, "Report this suggestion", named: "Maria Santos", before: named), "Report opens “Report this suggestion”, naming her, with four reasons")
    sendReport(app, "suggestion", reason: "Wrong or harmful")
    let rep = adminReport { ($0["suggestion"] as? [String: Any])?["message"] as? String == "Buy my answers" }
    check(rep?["kind"] as? String == "suggestion" && first(rep)?["reason"] as? String == "wrong" && ((first(rep)?["by"]) as? [String: Any])?["handle"] as? String == w.AH, "the admin page has it, from the deck's owner")
    check(text(app, "Maria Santos suggested 1 change").exists && button(app, "Take it").exists && button(app, "Skip").exists, "what the page shows after it's sent: the suggestion, still there to take or skip")

    // The cards your own AI made aren't someone's suggestion: no Report on them.
    app.terminate()
    act("", "ai.perm", ["id": "check", "on": true])
    let chem = "Chemistry " + run
    let cdeck = act("", "deck.add", ["name": chem])["id"] as? String ?? ""
    let init_ = mcp(["jsonrpc": "2.0", "id": 1, "method": "initialize", "params": ["protocolVersion": "2025-06-18", "capabilities": [String: Any](), "clientInfo": ["name": "Claude", "version": "1"]]])
    let added = mcp(["jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": ["name": "add_cards", "arguments": ["deck": chem, "cards": [["front": "What is a mole?", "back": "A count"]]]]], init_.sid)
    check(!cdeck.isEmpty && added.text.contains("wait in the deck"), "the local person's AI adds a card that waits for them")
    app = launch(as: "", ["-open", "suggestions:" + chem])
    let ai = buttonStarting(app, "Claude, through your link")
    check(wait(ai, 12), "their Suggestions list Claude's card")
    ai.tap()
    check(wait(text(app, "Claude added 1 card")), "and open on it")
    check(button(app, "Keep all 1").exists || button(app, "Keep").exists, "with Keep and Toss")
    check(!button(app, "Report").exists, "the cards your own AI made have no Report")
  }

  /// What the AI app's tool call answers (the local server's MCP, as the other tests do it).
  private func mcp(_ body: [String: Any], _ sid: String? = nil) -> (sid: String?, text: String) {
    var r = URLRequest(url: URL(string: Self.server + "/mcp")!)
    r.httpMethod = "POST"
    r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    r.setValue("application/json, text/event-stream", forHTTPHeaderField: "Accept")
    if let sid { r.setValue(sid, forHTTPHeaderField: "mcp-session-id") }
    r.httpBody = try? JSONSerialization.data(withJSONObject: body)
    let done = DispatchSemaphore(value: 0)
    var out: (String?, String) = (nil, "")
    URLSession.shared.dataTask(with: r) { data, resp, _ in
      out = ((resp as? HTTPURLResponse)?.value(forHTTPHeaderField: "mcp-session-id"), data.flatMap { String(data: $0, encoding: .utf8) } ?? "")
      done.signal()
    }.resume()
    _ = done.wait(timeout: .now() + 20)
    return out
  }

  // ---------- 4: a teacher gets verified, and checks a deck ----------
  func test4GetVerifiedAndCheck() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("4")
    let teach = "rpt4" + run, teach2 = "rpu4" + run, school = "rps4" + run
    name(teach, "Dr. Okafor"); name(teach2, "Dr. Lee"); name(school, "Davis High")
    for p in [teach, teach2, school] { social(p, "profile.ensure") }
    let TH = handle(teach)
    print("Flow 4, people: \(w.alex) (@\(w.AH)), \(w.maria), \(teach) (@\(TH)), \(teach2)")

    // ---------- Settings: Get verified ----------
    var app = launch(as: teach, ["-open", "settings"])
    check(wait(buttonStarting(app, "Get verified")), "Settings → Profile has a Get verified row")
    check(buttonStarting(app, "Edit profile").exists && buttonStarting(app, "@" + TH).exists, "beside the profile row and Edit profile")
    buttonStarting(app, "Get verified").tap()
    check(wait(button(app, "I’m a teacher")) && button(app, "We’re a school").exists, "it opens Get verified: I’m a teacher, We’re a school")
    let contact = app.textFields["School email or link"]
    check(wait(contact) && app.textFields["School"].exists, "it asks for the school, and an email or a link")
    typeInto(app.textFields["School"], "UC Davis")
    typeInto(contact, "not an email")
    tap(button(app, "Send"), "Send")
    check(wait(app.staticTexts["Type a school email, or a link that shows you there."]), "something that isn't an email or a link says so, in the server's words")
    typeInto(contact, teach + "@ucdavis.edu", clear: 12)
    tap(button(app, "Send"), "Send")
    check(wait(any(app, "Waiting for review")) && any(app, "We’ll let you know.").exists, "a good one: Waiting for review, We’ll let you know")
    tap(button(app, "Done"), "Done")
    check(wait(buttonStarting(app, "Get verified")) && wait(any(app, "Waiting for review")), "Settings says Waiting for review, still a row you can open")
    let vs = get(teach, "/api/verify")
    check(vs["open"] as? Bool == true && (vs["verified"] as? String ?? "") == "", "the server has the request open")
    let req = ((api("admin", "GET", "/api/admin").json as? [String: Any])?["requests"] as? [[String: Any]] ?? []).first { ($0["person"] as? [String: Any])?["handle"] as? String == TH }
    check(req?["school"] as? String == "UC Davis" && req?["contact"] as? String == teach + "@ucdavis.edu" && req?["role"] as? String == "teacher", "the admin sees it")
    social("admin", "admin.verify", ["id": req?["id"] as? String ?? "", "pick": "approve"])

    app.terminate()
    app = launch(as: teach, ["-open", "settings"])
    check(wait(any(app, "Verified teacher")), "approved: Settings says Verified teacher")
    check(!buttonStarting(app, "Get verified").exists && !buttonStarting(app, "Verified teacher").exists, "with no link (it isn't a button, and Get verified is gone)")
    app.terminate()
    app = launch(as: teach, ["-open", "news"])
    let news = buttonStarting(app, "You’re verified as a teacher")
    check(wait(news), "News says “You’re verified as a teacher”")
    news.tap()
    check(wait(button(app, "Edit profile")) && wait(any(app, "@" + TH)), "it opens your profile")
    check(get(teach, "/api/public/profile?h=" + TH)["verified"] as? String == "teacher", "which has the check (a verified teacher)")

    // ---------- a school ----------
    verify(school, role: "school", school: "Davis High")
    app.terminate()
    app = launch(as: school, ["-open", "settings"])
    check(wait(any(app, "Verified school")), "a school's Settings says Verified school")
    app.terminate()
    app = launch(as: school, ["-open", "news"])
    check(wait(buttonStarting(app, "You’re verified as a school")), "and its News says “as a school”")

    // ---------- Check this deck ----------
    let TN = "Dr. Okafor"
    app.terminate()
    app = launch(as: teach, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Check this deck")) && button(app, "Study").exists, "a verified teacher sees Check this deck on someone else's deck")
    check(!any(app, "Checked by you").exists, "and not Checked by you yet")
    check(checkOf(teach, w.sharedId) == nil, "the deck has no check yet")
    button(app, "Check this deck").tap()
    check(wait(any(app, "Checked by you")), "pressing it says “Checked by you”")
    check(gone(button(app, "Check this deck")), "and the button is gone")
    check(eventually { self.checkOf(teach, w.sharedId)?["current"] as? Bool == true }, "the deck is checked, up to date")
    check(wait(any(app, "Checked by " + TN)), "and its cover says “Checked by \(TN)”")
    let v0 = (get(teach, "/api/public/deck?id=" + w.sharedId)["made"] as? [[String: Any]])?.first
    check(v0?["kind"] as? String == "check", "History has a version for it")
    app.terminate()
    app = launch(as: teach, ["-open", "deckpage:" + w.path])
    check(wait(any(app, "Checked by you")) && !button(app, "Check this deck").exists, "after opening it again it still says “Checked by you”")

    // Someone who isn't verified, and another teacher (the check is current, so there's nothing for them to do).
    app.terminate()
    app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Study")) && !button(app, "Check this deck").exists && !any(app, "Checked by you").exists, "someone who isn't verified sees neither")
    app.terminate()
    verify(teach2)
    app = launch(as: teach2, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Study")) && !button(app, "Check this deck").exists && !any(app, "Checked by you").exists, "another verified teacher sees neither: it's already checked")

    // The owner changes the deck: the check is old, and the button is back.
    act(w.alex, "card.add", ["deckId": w.deck, "kind": "basic", "front": "A newer card", "back": "x"])
    check(eventually { self.checkOf(teach, w.sharedId)?["current"] as? Bool == false }, "the owner adds a card: the check is old now")
    app.terminate()
    app = launch(as: teach, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Check this deck")) && !any(app, "Checked by you").exists, "so Check this deck is back for the teacher")
    check(wait(any(app, "Checked by " + TN + " at version")), "and the cover says which version was checked")
    app.terminate()
    app = launch(as: teach2, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Check this deck")), "and for another verified teacher")

    // Not on your own deck, even as a teacher.
    let own = shareDeck(teach, "Teacher's own deck " + run, n: 2)
    app.terminate()
    app = launch(as: teach, ["-open", "deckpage:/@" + TH + "/" + own.slug])
    check(wait(button(app, "Edit")) && !button(app, "Check this deck").exists, "a verified teacher doesn't see Check this deck on their own deck")
    // The owner hears about the check.
    app.terminate()
    app = launch(as: w.alex, ["-open", "news"])
    check(wait(buttonStarting(app, TN + " checked")), "the owner's News says Dr. Okafor checked the deck")

    // The owner stops sharing a deck while the teacher has its page open: Check this deck says so, on the page.
    let soon = shareDeck(w.alex, "Soon private " + run, n: 1)
    app.terminate()
    app = launch(as: teach, ["-open", "deckpage:/@" + w.AH + "/" + soon.slug])
    check(wait(button(app, "Check this deck")), "the teacher opens another of Alex's decks")
    social(w.alex, "deck.share", ["deckId": soon.deck, "visibility": "private"])
    button(app, "Check this deck").tap()
    check(wait(any(app, "No such deck")), "a deck that stopped being shared: the page says so, in the server's words")
    check(button(app, "Check this deck").exists && !any(app, "Checked by you").exists, "and the button is still there")
    check(app.alerts.count == 0, "with no alert")
  }

  // ---------- 5: a helper opens a suggestion from News ----------
  func test5HelperNews() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let own = "rph5" + run, help = "rpe5" + run, third = "rpt5" + run, stranger = "rpx5" + run
    name(own, "Olive Owner"); name(help, "Hugo Helper"); name(third, "Maria Santos"); name(stranger, "Sam Stranger")
    let HH = social(help, "profile.ensure")["handle"] as? String ?? ""
    for p in [own, third, stranger] { social(p, "profile.ensure") }
    let TH = handle(third)
    let cName = "Community " + run, kName = "Kept alone " + run
    let C = shareDeck(own, cName, n: 3, ["maintained": "community", "helpers": [HH]])
    let K = shareDeck(own, kName, n: 2, ["helpers": [HH]])
    let cPub = get(third, "/api/public/deck?id=" + C.id), kPub = get(third, "/api/public/deck?id=" + K.id)
    let cCards = cPub["cardsList"] as? [[String: Any]] ?? [], kCards = kPub["cardsList"] as? [[String: Any]] ?? []
    social(third, "suggestion.send", ["id": K.id, "message": "On the deck kept alone", "changes": [["op": "edit", "card": kCards.first?["id"] as? String ?? "", "after": ["back": "Changed by third"]]]])
    let sg = social(third, "suggestion.send", ["id": C.id, "message": "Two fixes", "changes": [["op": "edit", "card": cCards.first?["id"] as? String ?? "", "after": ["back": "A better answer"]], ["op": "add", "after": ["kind": "basic", "front": "New card", "back": "Yes"]]]])
    print("Flow 5, people: \(own), \(help) (@\(HH)), \(third) (@\(TH))")
    check(!(sg["id"] as? String ?? "").isEmpty, "someone suggests two changes to a community deck the helper helps with")
    let newsRows = (api(help, "GET", "/api/social/activity").json as? [String: Any])?["items"] as? [[String: Any]] ?? []
    check(newsRows.contains { $0["kind"] as? String == "suggestion" && ($0["deck"] as? [String: Any])?["id"] as? String == C.id }, "the helper has news of it")
    check(!(state(help)["decks"] as? [[String: Any]] ?? []).contains { ($0["share"] as? [String: Any])?["id"] as? String == C.id }, "and the deck isn't in the helper's library (it isn't theirs)")

    var app = launch(as: help, ["-open", "news"])
    let row = buttonStarting(app, "Maria Santos suggested 2 changes to " + cName)
    check(wait(row), "the helper's News has “Maria Santos suggested 2 changes to \(cName)”")
    row.tap()
    check(wait(text(app, "Suggestions")), "tapping it opens Suggestions")
    let item = buttonStarting(app, "Maria Santos, 2 changes · " + cName)
    check(wait(item), "with the suggestion listed, labeled with the deck's name")
    check(!any(app, "On the deck kept alone").exists && !any(app, kName).exists, "and nothing from the deck its owner keeps up alone")
    item.tap()
    check(wait(text(app, "Maria Santos suggested 2 changes")) && wait(any(app, "Two fixes")), "it opens with what she said")
    check(button(app, "Take all 2").exists && button(app, "Skip all").exists, "the helper can take or skip, like the owner")
    check(wait(button(app, "Report")), "and Report")
    let named = count(app, "Maria Santos")
    button(app, "Report").tap()
    check(openedReport(app, "Report this suggestion", named: "Maria Santos", before: named), "a helper's Report opens the sheet")
    sendReport(app, "helper", reason: "Spam")
    let rep = adminReport { ($0["suggestion"] as? [String: Any])?["message"] as? String == "Two fixes" }
    check(rep?["kind"] as? String == "suggestion" && ((first(rep)?["by"]) as? [String: Any])?["handle"] as? String == HH, "the admin page has it, from the helper")

    // Someone who isn't a helper has nothing to open.
    app.terminate()
    app = launch(as: stranger, ["-open", "suggestions"])
    check(wait(text(app, "No suggestions right now")), "someone who isn't a helper sees no suggestions")
  }

  // ---------- 6: the library opens when the sync is slow ----------
  func test6SlowSync() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    try XCTSkipIf(api("x", "GET", "/__proxy/log", nil, base: Self.slow).status != 200, "No stand-in server at " + Self.slow)
    let who = "rps6" + run, deckName = "Slow sync deck " + run
    name(who, "Sam Slow")
    let deck = act(who, "deck.add", ["name": deckName])["id"] as? String ?? ""
    for i in 1...3 { act(who, "card.add", ["deckId": deck, "kind": "basic", "front": "Question \(i)", "back": "Answer \(i)"]) }
    print("Flow 6, person: \(who)")
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.slow, "-dev", who]
    app.launch()
    // The tab bar is there once the library is (the app shows nothing until then).
    let opened = wait(button(app, "Library"), 14)
    // When the stand-in first heard of it, and what it has heard since: the held sync, then the plain library.
    let seen = api("x", "GET", "/__proxy/log", nil, base: Self.slow).json as? [String: Any] ?? [:]
    let now = seen["now"] as? Double ?? 0, log = seen["log"] as? [[String: Any]] ?? []
    let sync = log.first { $0["path"] as? String == "/api/state?sync=1" }, plain = log.first { $0["path"] as? String == "/api/state" }
    let syncAt = sync?["at"] as? Double ?? 0, plainAt = plain?["at"] as? Double ?? 0
    check(sync != nil && (sync?["held"] as? Double ?? 0) >= 12000, "the app asked for the library with the sync, which the stand-in holds for 12 seconds")
    check(plain != nil && plainAt - syncAt > 7_000 && plainAt - syncAt < 10_500, "after about 8 seconds it gave up on that and asked for the plain library (\(Int(plainAt - syncAt)) ms later)")
    check(opened && now - syncAt < 11_500, "the library opened before the held sync could answer (\(Int(now - syncAt)) ms after asking)")
    check(app.alerts.count == 0, "with no error")
    button(app, "Library").tap()
    check(wait(any(app, deckName)), "and it shows the person's deck")
  }
}
