// A shared deck's pages end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its
// lc_dev cookie, which the debug-only `-dev <name>` launch argument sets). The same story as the web app's own test, in
// flows that each set up their own people (so any one can run alone):
//   1  Maria opens the page from Discover, saves it, gets its updates, and studies it.
//   2  Maria makes a copy (a folder, a name), and a link opens Make a copy.
//   3  Maria suggests changes (the sheet, and a card of the deck she studies).
//   4  Alex opens Suggestions, takes one change, skips one, takes the rest; Maria's decks get the changes and she sees the
//      new version; Alex goes back to a version on History, and someone else sees History without Go back.
//   5  The local person keeps and tosses cards their AI made (over MCP) on Suggestions.
//   6  The pages' other states: a deck that isn't shared, the lasting link.
//   7  Every link that used to open Safari: a profile's tile, the Sharing tab, News, the suggestions you sent.
//
// Run it with ios/tools/e2e-pages.sh (it starts a fresh server on port 3721).
import XCTest

final class SharedDeckPagesTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3721"
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUp() { continueAfterFailure = true }
  override class func tearDown() { print("Shared deck pages: \(passed) passed, \(failed) failed") }

  /// One flow's people and deck: Alex shares a deck of five cards; Maria and Lee are learners.
  private struct World {
    let alex: String, maria: String, lee: String, deckName: String, folderName: String
    var deck = "", sharedId = "", slug = "", AH = "", MH = "", path = ""
  }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else {
      Self.failed += 1; print("  FAIL " + name); XCTFail(name)
      snap("pages-fail-\(Self.failed)")
    }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  /// Taps something once it's there; if it never is, that's a failed check (a missing element would end the whole test).
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 6) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  /// A request as one of the made-up people ("": the person on this computer); the answer's JSON.
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
  private func state(_ who: String, sync: Bool = false) -> [String: Any] { api(who, "GET", "/api/state" + (sync ? "?sync=1" : "")).json as? [String: Any] ?? [:] }
  private func handle(_ who: String) -> String { (state(who)["profile"] as? [String: Any])?["handle"] as? String ?? "" }
  private func get(_ who: String, _ path: String) -> [String: Any] { api(who, "GET", path).json as? [String: Any] ?? [:] }
  private func decks(_ who: String) -> [[String: Any]] { state(who)["decks"] as? [[String: Any]] ?? [] }
  private func cards(_ who: String, in deck: String) -> [[String: Any]] { (state(who)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deck } }
  /// What the AI app's tool call answers (the local server's MCP, as the web's test does it).
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

  /// Alex makes a deck (five cards) and shares it publicly; Maria has a folder; everyone has a name and has been welcomed.
  private func world(_ tag: String) -> World {
    var w = World(alex: "pga" + tag + run, maria: "pgm" + tag + run, lee: "pgl" + tag + run, deckName: "Cell Biology " + tag + run, folderName: "Year 1 " + tag + run)
    act(w.alex, "settings.update", ["patch": ["name": "Alex Kim", "welcomed": true]])
    act(w.maria, "settings.update", ["patch": ["name": "Maria Santos", "welcomed": true]])
    act(w.lee, "settings.update", ["patch": ["name": "Lee Park", "welcomed": true]])
    w.deck = act(w.alex, "deck.add", ["name": w.deckName, "tags": ["Biology"]])["id"] as? String ?? ""
    for (f, b) in [("What is ATP?", "Energy currency"), ("Where does glycolysis happen?", "In the mitochondria")] { act(w.alex, "card.add", ["deckId": w.deck, "kind": "basic", "front": f, "back": b]) }
    act(w.alex, "card.add", ["deckId": w.deck, "kind": "cloze", "text": "The [[mitochondrion]] is the powerhouse of the cell."])
    act(w.alex, "card.add", ["deckId": w.deck, "kind": "basic", "front": "A card to remove", "back": "Old"])
    act(w.alex, "card.add", ["deckId": w.deck, "kind": "basic", "front": "Which organelle makes ribosomes?", "back": "Nucleolus"])
    let sh = social(w.alex, "deck.share", ["deckId": w.deck, "visibility": "public", "description": "For BIO 201"])
    w.sharedId = sh["id"] as? String ?? ""; w.slug = sh["slug"] as? String ?? ""
    w.AH = handle(w.alex); w.MH = social(w.maria, "profile.ensure")["handle"] as? String ?? ""
    w.path = "/@" + w.AH + "/" + w.slug
    act(w.maria, "folder.add", ["name": w.folderName])
    return w
  }
  /// Maria's two suggestions to Alex's deck, sent through the server (what the sheet makes: an answer, two new cards, and a
  /// card taken out, with a line why; and a fix to one card).
  private func suggestAsMaria(_ w: World) {
    let list = get(w.maria, "/api/public/deck?id=" + w.sharedId)["cardsList"] as? [[String: Any]] ?? []
    let id = { (words: String) in list.first { (($0["front"] as? String) ?? "").contains(words) || (($0["text"] as? String) ?? "").contains(words) }?["id"] as? String ?? "" }
    social(w.maria, "suggestion.send", ["id": w.sharedId, "message": "From my TA’s review", "changes": [
      ["op": "edit", "card": id("glycolysis"), "after": ["back": "In the cytoplasm"]],
      ["op": "add", "after": ["kind": "basic", "front": "What activates PFK-1?", "back": "AMP"]],
      ["op": "add", "after": ["kind": "cloze", "text": "[[Glycolysis]] makes 2 ATP."]],
      ["op": "remove", "card": id("A card to remove")]]])
    social(w.maria, "suggestion.send", ["id": w.sharedId, "message": "", "changes": [
      ["op": "edit", "card": id("powerhouse"), "after": ["text": "The [[mitochondrion]] is the powerhouse of every cell."]]]])
  }

  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    // ("": the person on this computer, who has no cookie: the app keeps the last person's, so it's cleared.)
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
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
  /// The button with this label in the sheet that's up (the page under it has cards with the same words).
  private func inSheet(_ app: XCUIApplication, _ label: String, starting: Bool = false) -> XCUIElement {
    let sheet = ["suggest-sheet", "copy-sheet"].map { app.otherElements[$0] }.first { $0.exists }
    let q = (sheet?.buttons ?? app.buttons).matching(NSPredicate(format: starting ? "label BEGINSWITH %@" : "label == %@", label))
    return q.firstMatch
  }
  /// The lowest button with this label on screen (in a sheet or on a pushed page, not the page under it).
  private func lowest(_ app: XCUIApplication, _ label: String, starting: Bool = false) -> XCUIElement {
    let all = app.buttons.matching(NSPredicate(format: starting ? "label BEGINSWITH %@" : "label == %@", label)).allElementsBoundByIndex
    return all.max { $0.frame.minY < $1.frame.minY } ?? app.buttons[label].firstMatch
  }
  private func text(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.staticTexts[label].firstMatch }
  /// A field by its label: a one-line field, or a box of several lines.
  private func field(_ app: XCUIApplication, _ label: String) -> XCUIElement {
    let one = app.textFields[label].firstMatch
    return one.exists ? one : app.textViews[label].firstMatch
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool { e.waitForExistence(timeout: s) }
  /// Waits until something's gone.
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  /// Types into a field, first taking what's there out.
  private func setText(_ f: XCUIElement, _ text: String) {
    guard f.waitForExistence(timeout: 6) else { check(false, "found a field to type “" + text + "” in"); return }
    f.tap()
    f.tap(withNumberOfTaps: 3, numberOfTouches: 1)
    f.typeText(text)
  }
  private func typeInto(_ f: XCUIElement, _ text: String) {
    guard f.waitForExistence(timeout: 6) else { check(false, "found a field to type “" + text + "” in"); return }
    f.tap(); f.typeText(text)
  }

  // ---------- 1: Maria opens the page from Discover, saves it, gets its updates, and studies it ----------
  func test1OpenSaveStudy() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("1")
    print("Flow 1, people: \(w.alex), \(w.maria) (@\(w.AH))")
    var app = launch(as: w.maria)
    tap(button(app, "Discover"))
    let search = app.textFields["Search decks and people"].firstMatch
    check(wait(search), "Discover has its search")
    typeInto(search, w.deckName)
    let tile = buttonStarting(app, w.deckName)
    check(wait(tile), "the shared deck is in Discover")
    tap(tile)
    check(wait(text(app, w.deckName)), "a deck tile opens the deck's page, with its name")
    check(wait(any(app, "Kept up by Alex")), "with “Kept up by Alex”")
    check(button(app, "Study").exists && button(app, "Make a copy").exists && button(app, "Save").exists && button(app, "Suggest a change").exists && button(app, "Get updates").exists,
          "and Study, Make a copy, Save, Suggest a change, Get updates")
    check(button(app, "Back").exists && button(app, "Share").exists, "the cover has Back and Share")
    check(any(app, "5 cards").exists && ((button(app, "Cards").value as? String) ?? "").isEmpty, "the cards are listed, with how many on the cover (its tab has no count: 5d27d04e)")
    check(buttonStarting(app, "Where does glycolysis happen?").exists, "each card shows its question")
    tap(buttonStarting(app, "Where does glycolysis happen?"))
    check(wait(text(app, "In the mitochondria")), "pressing a card shows its answer")
    check(lowest(app, "Suggest a change").exists, "with Suggest a change on it")
    tap(buttonStarting(app, "Where does glycolysis happen?"))
    tap(button(app, "History"))
    check(wait(any(app, "Alex Kim made it")), "the History tab lists how it was made")
    tap(button(app, "People"))
    check(wait(any(app, "Alex Kim, @" + w.AH + ", Owner")), "the People tab lists its owner")
    tap(button(app, "Cards"))
    tap(button(app, "Share"))
    let sheet = app.otherElements["ActivityListView"].firstMatch
    check(wait(sheet, 6) || wait(app.buttons["Copy"].firstMatch, 2), "Share opens the phone's share sheet")
    if app.buttons["Close"].firstMatch.exists { app.buttons["Close"].firstMatch.tap() } else { app.swipeDown() }
    check(gone(sheet, 6), "and it closes again")

    // Saving and getting updates show as you press them, and stay.
    tap(button(app, "Save"))
    Thread.sleep(forTimeInterval: 0.5)
    check(button(app, "Save").isSelected, "Save shows saved at once")
    tap(button(app, "Get updates"))
    check(wait(button(app, "Getting updates")), "Get updates shows Getting updates")
    Thread.sleep(forTimeInterval: 1.5)
    let pub = get(w.maria, "/api/public/deck?h=" + w.AH + "&s=" + w.slug), me = pub["me"] as? [String: Any] ?? [:]
    check(me["starred"] as? Bool == true && me["watching"] as? Bool == true && pub["stars"] as? Int == 1, "the server has the save and the updates")
    app.terminate()
    app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Getting updates")) && button(app, "Save").isSelected, "both are still on after opening it again")

    // Study: the deck joins her library as it is, and opens there.
    tap(button(app, "Study"))
    check(wait(button(app, "From Alex Kim"), 12), "Study adds it to her library and opens it (From Alex Kim)")
    let studied = decks(w.maria).first { ($0["link"] as? [String: Any])?["id"] as? String == w.sharedId }
    check((studied?["link"] as? [String: Any])?["mode"] as? String == "study", "the deck is studied as it is")
    tap(button(app, "From Alex Kim"))
    check(wait(button(app, "Studying")), "the page now says Studying")
    check(!button(app, "Getting updates").exists && !button(app, "Get updates").exists, "and has no Get updates (a deck you study stays up to date)")
    tap(button(app, "Studying"))
    check(wait(button(app, "From Alex Kim")) && wait(button(app, "Deck settings")), "Studying opens her deck")
  }

  // ---------- 2: Maria makes a copy; links open Make a copy ----------
  func test2MakeACopy() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("2")
    print("Flow 2, people: \(w.alex), \(w.maria), \(w.lee)")
    var app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    tap(button(app, "Make a copy"))
    check(wait(text(app, "Copy to your library")), "Make a copy opens the copy sheet")
    check(text(app, "5 cards from Alex Kim").exists, "and says how many cards and whose")
    let cpName = "My Cell Bio " + run
    setText(app.textFields["Name"].firstMatch, cpName)
    tap(button(app, "Folder: Library"))
    check(wait(button(app, w.folderName)), "the Folder button lists her folders")
    tap(button(app, w.folderName))
    check(wait(button(app, "Folder: " + w.folderName)), "a folder can be picked")
    tap(button(app, "Copy deck"))
    check(wait(button(app, "From Alex Kim"), 12), "Copy deck makes her own copy and opens it")
    let s = state(w.maria)
    let fold = (s["folders"] as? [[String: Any]] ?? []).first { $0["name"] as? String == w.folderName }
    let mc = (s["decks"] as? [[String: Any]] ?? []).first { $0["name"] as? String == cpName }, link = mc?["link"] as? [String: Any]
    // (If not, it says what it found.)
    let named = link?["mode"] as? String == "copy" && link?["updates"] as? Bool == true && mc?["folder"] as? String == fold?["id"] as? String
    let found = mc == nil ? "no deck named " + cpName : "mode \(link?["mode"] ?? "none"), updates \(link?["updates"] ?? "none"), folder \(mc?["folder"] ?? "none"), hers \(fold?["id"] ?? "none")"
    check(named, "it's named, in the folder, with updates on" + (named ? "" : " (" + found + ")"))
    tap(button(app, "From Alex Kim"))
    check(wait(button(app, "Your copy")), "the page now says Your copy")
    // A link that asks for Make a copy opens it; Cancel closes it.
    app.terminate()
    app = launch(as: w.maria, ["-open", "deckpage:" + w.path + "?copy=1"])
    check(wait(text(app, "Copy to your library")), "?copy=1 opens the copy sheet")
    tap(button(app, "Cancel"))
    check(gone(text(app, "Copy to your library")), "Cancel closes it")
    // Return in the name copies it.
    app.terminate()
    app = launch(as: w.lee, ["-open", "deckpage:" + w.path + "?copy=1"])
    check(wait(app.textFields["Name"].firstMatch), "a link can open Make a copy for someone else too")
    setText(app.textFields["Name"].firstMatch, "Lee’s cells")
    app.textFields["Name"].firstMatch.typeText("\n")
    check(wait(button(app, "From Alex Kim"), 12), "Return in the name copies it")
    check(decks(w.lee).contains { $0["name"] as? String == "Lee’s cells" && ($0["link"] as? [String: Any])?["mode"] as? String == "copy" }, "and the server has Lee’s copy")
  }

  // ---------- 3: Maria suggests changes ----------
  func test3SuggestChanges() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("3")
    print("Flow 3, people: \(w.alex), \(w.maria) (@\(w.AH))")
    social(w.maria, "deck.study", ["id": w.sharedId])
    var app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    tap(button(app, "Suggest a change"))
    check(wait(app.textFields["Find a card to fix"].firstMatch), "Suggest a change opens its sheet")
    typeInto(app.textFields["Find a card to fix"].firstMatch, "glycolysis")
    let pick = inSheet(app, "Where does glycolysis happen?", starting: true)
    check(wait(pick), "searching finds a card")
    tap(pick)
    check(wait(field(app, "Back")), "picking a card shows its words")
    check(!button(app, "Add this change").isEnabled, "there's nothing to add until something changes")
    setText(field(app, "Back"), "In the cytoplasm")
    check(button(app, "Add this change").isEnabled, "changing a word lets you add it")
    tap(button(app, "Add this change"))
    check(wait(text(app, "Your changes · 1")), "the change is listed")
    tap(button(app, "New card"))
    typeInto(field(app, "Front"), "What activates PFK-1?")
    typeInto(field(app, "Back"), "AMP")
    tap(button(app, "Add this card"))
    tap(button(app, "New card"))
    tap(button(app, "Fill in the blank"))
    typeInto(field(app, "Text"), "No blanks here")
    check(!button(app, "Add this card").isEnabled, "a text with blanks needs a [[blank]]")
    setText(field(app, "Text"), "[[Glycolysis]] makes 2 ATP.")
    check(button(app, "Add this card").isEnabled, "with one, it can be added")
    tap(button(app, "Add this card"))
    typeInto(app.textFields["Find a card to fix"].firstMatch, "remove")
    let rm = inSheet(app, "A card to remove", starting: true)
    check(wait(rm), "searching finds the card to take out")
    tap(rm)
    tap(button(app, "Remove this card"))
    check(wait(text(app, "Your changes · 3")) && button(app, "Add this change").isEnabled, "three changes are listed, and a card is marked to go")
    typeInto(app.textFields["Why?"].firstMatch, "From my TA’s review")
    tap(button(app, "Send to Alex"))
    check(wait(text(app, "Sent. Alex will see it.")), "sending says “Sent. Alex will see it.”")
    Thread.sleep(forTimeInterval: 1)
    let inbox = api(w.alex, "GET", "/api/social/suggestions?id=" + w.sharedId).json as? [[String: Any]] ?? []
    let s1 = inbox.first { $0["message"] as? String == "From my TA’s review" }
    let kinds = (s1?["changes"] as? [[String: Any]] ?? []).compactMap { $0["kind"] as? String }.joined(separator: ",")
    check(kinds == "answer,new,new,remove", "Alex got one suggestion: an answer, two new cards, a removal")
    check((s1?["person"] as? [String: Any])?["handle"] as? String == w.MH && s1?["author"] == nil && s1?["owner"] == nil && (s1?["deck"] as? [String: Any])?["name"] as? String == w.deckName,
          "it says who sent it and which deck, without account ids")
    tap(button(app, "Done"))
    check(gone(text(app, "Sent. Alex will see it.")), "Done closes the sheet")

    // A card of the deck she studies opens Suggest a change on it.
    app.terminate()
    app = launch(as: w.maria, ["-open", "deck:" + w.deckName])
    check(wait(button(app, "Suggest a change")), "the deck she studies has Suggest a change on its cover")
    tap(buttonStarting(app, "The ____ is the powerhouse"))
    check(wait(field(app, "Text")), "a card of it opens Suggest a change on that card")
    check((field(app, "Text").value as? String)?.contains("[[mitochondrion]]") == true, "with the card's words")
    setText(field(app, "Text"), "The [[mitochondrion]] is the powerhouse of every cell.")
    tap(button(app, "Send to Alex"))
    check(wait(text(app, "Sent. Alex will see it.")), "it sends the fix (the change being written counts)")
    tap(button(app, "Done"))
    tap(button(app, "Back"))
    tap(buttonStarting(app, "Which organelle makes ribosomes?"))
    check(wait(field(app, "Front")) && (field(app, "Front").value as? String) == "Which organelle makes ribosomes?", "her own card opens the shared card it came from")
    tap(button(app, "Cancel"))
    tap(button(app, "Back"))
    tap(button(app, "Suggest a change"))
    check(wait(app.textFields["Find a card to fix"].firstMatch), "the cover's Suggest a change opens the page with the sheet")
    tap(button(app, "Cancel"))
    check(gone(app.textFields["Find a card to fix"].firstMatch), "Cancel closes it")
    // A link to a card (?suggest=<card id>) opens the sheet on that card.
    let listed = get(w.maria, "/api/public/deck?id=" + w.sharedId)["cardsList"] as? [[String: Any]] ?? []
    let powerhouse = listed.first { ($0["text"] as? String)?.contains("powerhouse") == true }?["id"] as? String ?? ""
    app.terminate()
    app = launch(as: w.maria, ["-open", "deckpage:" + w.path + "?suggest=" + powerhouse])
    check(wait(field(app, "Text")) && (field(app, "Text").value as? String)?.contains("[[mitochondrion]]") == true, "?suggest=<card> opens the sheet on that card")
    check(app.alerts.count == 0, "no alerts along the way")
  }

  // ---------- 4: Alex decides; Maria's decks get the changes; History ----------
  func test4OwnerDecidesAndHistory() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("4")
    print("Flow 4, people: \(w.alex), \(w.maria) (@\(w.AH))")
    let studyId = social(w.maria, "deck.study", ["id": w.sharedId])["deckId"] as? String ?? ""
    let copyId = social(w.maria, "deck.copy", ["id": w.sharedId, "name": "My copy", "updates": true])["deckId"] as? String ?? ""
    suggestAsMaria(w)
    let inbox = api(w.alex, "GET", "/api/social/suggestions?id=" + w.sharedId).json as? [[String: Any]] ?? []
    let s1 = inbox.first { $0["message"] as? String == "From my TA’s review" }
    check(inbox.count == 2 && s1 != nil, "Alex has two suggestions waiting")

    var app = launch(as: w.alex, ["-open", "deck:" + w.deckName])
    check(wait(button(app, "Public")), "his deck's page has its own button (Public)")
    tap(button(app, "Public"))
    check(wait(button(app, "Edit")) && button(app, "Suggestions").exists && button(app, "Share settings").exists, "he sees his own page: Edit, Suggestions, Share settings")
    check((button(app, "Suggestions").value as? String) == "2 waiting", "Suggestions says 2 wait")
    // Press a card: Edit opens the card in the editor. Share settings opens his deck's settings.
    tap(buttonStarting(app, "Where does glycolysis happen?"))
    tap(lowest(app, "Edit"))
    check(wait(button(app, "Delete card")), "Edit on a card opens the card editor on it")
    tap(button(app, "Cancel"))
    check(gone(button(app, "Delete card")), "Cancel closes it")
    tap(button(app, "Share settings"))
    check(wait(lowest(app, "Sharing")) && button(app, "Deck settings").exists, "Share settings opens his deck (its settings up)")
    tap(button(app, "Done"))
    tap(button(app, "Public"))
    check(wait(button(app, "Share settings")), "and Public is back to the page")
    tap(buttonStarting(app, "Where does glycolysis happen?"))
    tap(button(app, "Edit"))
    check(wait(button(app, "Deck settings")) && !button(app, "Share settings").exists, "Edit opens his deck in the library")
    tap(button(app, "Public"))
    check(wait(button(app, "Share settings")), "and Public opens the page again")
    tap(button(app, "Suggestions"))
    check(wait(buttonStarting(app, "Maria Santos, 4 changes")) && buttonStarting(app, "Maria Santos, 1 change").exists, "both of Maria’s suggestions are listed")
    tap(buttonStarting(app, "Maria Santos, 4 changes"))
    check(wait(text(app, "Maria Santos suggested 4 changes")) && text(app, "“From my TA’s review”").exists, "the picked one shows who, how many, and why")
    tap(button(app, "Take it"))
    check(wait(text(app, "Taken")), "Take it takes one")
    tap(button(app, "Skip"))
    check(wait(text(app, "Skipped")), "Skip skips one")
    check(wait(button(app, "Take all 2")), "Take all counts what’s left")
    tap(button(app, "Take all 2"))
    check(wait(text(app, "Took 3 changes from Maria Santos.")), "taking the rest says what it took")
    check(gone(buttonStarting(app, "Maria Santos, 4 changes")), "and the suggestion leaves the list")
    tap(buttonStarting(app, "Maria Santos, 1 change"))
    check(wait(text(app, "Maria Santos suggested 1 change")), "the other one opens")
    tap(button(app, "Take it"))
    check(wait(text(app, "No suggestions right now")), "with nothing left: “No suggestions right now”")
    Thread.sleep(forTimeInterval: 1)
    let aCards = cards(w.alex, in: w.deck)
    let has = { (k: String, v: String) in aCards.contains { ($0[k] as? String)?.contains(v) == true } }
    check(has("back", "In the cytoplasm") && has("text", "[[Glycolysis]]") && !has("front", "A card to remove") && !has("front", "What activates PFK-1?") && has("text", "every cell"),
          "his deck has the answer, the blank card, the removal, and the phone fix, but not the skipped card")
    let all = api(w.alex, "GET", "/api/social/suggestions?id=" + w.sharedId + "&all=1").json as? [[String: Any]] ?? []
    let first = all.first { $0["id"] as? String == s1?["id"] as? String }
    check((first?["changes"] as? [[String: Any]] ?? []).compactMap { $0["status"] as? String }.joined(separator: ",") == "taken,skipped,taken,taken", "the server kept each decision")

    // Maria's decks get the changes.
    let ms = state(w.maria, sync: true)
    let mStudy = (ms["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == studyId }
    let mCopy = (ms["decks"] as? [[String: Any]] ?? []).first { $0["id"] as? String == copyId }
    let hasM = { (k: String, v: String) in mStudy.contains { ($0[k] as? String)?.contains(v) == true } }
    check(hasM("back", "In the cytoplasm") && !hasM("front", "A card to remove") && hasM("text", "Glycolysis"), "the deck she studies has them")
    check(((mCopy?["link"] as? [String: Any])?["pending"] as? [Any])?.count ?? 0 >= 3, "her copy has them waiting to take or skip")
    app.terminate()
    app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    check(wait(any(app, "v2")), "the page shows the new version (v2)")
    tap(button(app, "History"))
    check(wait(any(app, "Took 4 changes from Maria Santos")), "its History tab lists the versions (what Alex took from Maria in one sitting is one version)")

    // Alex goes back to a version on History.
    app.terminate()
    app = launch(as: w.alex, ["-open", "history:" + w.path])
    check(wait(text(app, "History")) && wait(any(app, "Took 4 changes from Maria Santos")) && any(app, "Alex Kim made it").exists, "History lists every version")
    check(wait(text(app, w.deckName + " · 2 people get these updates")), "and how many people get its updates")
    tap(button(app, "See changes"))
    check(wait(text(app, "Remove")) && text(app, "In the cytoplasm").exists, "See changes lists what changed")
    tap(button(app, "Go back to this version"))
    check(wait(text(app, "Go back to version 1?")), "going back asks first, in the page")
    tap(button(app, "Go back"))
    check(wait(text(app, "Went back to version 1.")), "and says it went back")
    Thread.sleep(forTimeInterval: 1.5)
    check(wait(any(app, "Went back to version 1")), "going back is a new version")
    let back = cards(w.alex, in: w.deck)
    let hasB = { (k: String, v: String) in back.contains { ($0[k] as? String)?.contains(v) == true } }
    check(hasB("back", "In the mitochondria") && hasB("front", "A card to remove") && !hasB("text", "Glycolysis") && back.count == 5, "the deck is as it was at version 1")

    // Someone else sees History without Go back.
    app.terminate()
    app = launch(as: w.maria, ["-open", "history:" + w.path])
    check(wait(any(app, "Went back to version 1")) && !button(app, "Go back to this version").exists, "someone else sees History without Go back")
    check(app.alerts.count == 0, "no alerts along the way")
  }

  // ---------- 5: your AI's cards wait for you on Suggestions ----------
  func test5AICards() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    act("", "ai.perm", ["id": "check", "on": true])
    let chem = "Chemistry " + run
    let deck = act("", "deck.add", ["name": chem])["id"] as? String ?? ""
    let ini = mcp(["jsonrpc": "2.0", "id": 1, "method": "initialize", "params": ["protocolVersion": "2025-06-18", "capabilities": [String: Any](), "clientInfo": ["name": "Claude", "version": "1"]]])
    let added = mcp(["jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": ["name": "add_cards", "arguments": ["deck": chem, "cards": [
      ["front": "What is a mole?", "back": "6.022×10²³ particles"], ["front": "What is pH?", "back": "The negative log of H⁺"], ["front": "A bad AI card", "back": "Wrong"],
      ["kind": "cloze", "text": "An [[acid]] gives away H⁺; a [[base]] takes it."]]]]], ini.sid)
    check(added.text.contains("wait in the deck"), "the AI’s cards wait for the learner")
    var app = launch(as: "", ["-open", "suggestions:" + chem])
    check(wait(buttonStarting(app, "Claude, through your link, 4 new cards"), 12), "Suggestions shows “Claude, through your link · 4 new cards” first (a text with two blanks is one)")
    tap(buttonStarting(app, "Claude, through your link"))
    check(wait(text(app, "Claude added 4 cards")), "and opens on them")
    let bad = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "A bad AI card")).firstMatch
    check(wait(bad), "its cards are listed")
    let toss = app.buttons.matching(NSPredicate(format: "label == 'Toss'")).allElementsBoundByIndex.filter { $0.frame.minY > bad.frame.maxY }.min { $0.frame.minY < $1.frame.minY }
    if let toss { toss.tap() } else { check(false, "found the Toss button of the bad card") }
    check(wait(button(app, "Keep all 3")), "Toss takes one out")
    tap(button(app, "Keep all 3"))
    check(wait(text(app, "No suggestions right now")), "Keep all keeps the rest")
    Thread.sleep(forTimeInterval: 1)
    let lc = cards("", in: deck)
    check(lc.count == 4 && lc.allSatisfy { $0["pending"] as? Bool != true } && lc.filter { $0["kind"] as? String == "cloze" }.count == 2, "the kept cards joined the deck (both blanks of the text); the tossed one is gone")
    app.terminate()
    app = launch(as: "", ["-open", "suggestions"])
    check(wait(text(app, "No suggestions right now")), "every deck’s Suggestions is empty now too")
  }

  // ---------- 6: the pages' other states ----------
  func test6OtherStates() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("6")
    var app = launch(as: w.maria, ["-open", "deckpage:/@" + w.AH + "/no-such-deck"])
    check(wait(text(app, "This deck isn’t here")) && button(app, "Discover decks").exists, "a deck that isn’t shared shows “This deck isn't here”")
    tap(button(app, "Discover decks"))
    check(wait(app.textFields["Search decks and people"].firstMatch), "Discover decks goes to Discover")
    app.terminate()
    app = launch(as: w.maria, ["-open", "deckpage:/d/" + w.sharedId])
    check(wait(text(app, w.deckName)), "the lasting link /d/<id> opens the same page")
    app.terminate()
    // The owner stops sharing while the page is open: Study says so, in the server's words, on the page; so does the copy sheet.
    app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    check(wait(button(app, "Study")), "the page is open")
    social(w.alex, "deck.share", ["deckId": w.deck, "visibility": "private"])
    tap(button(app, "Study"))
    check(wait(text(app, "This deck isn’t shared anymore.")), "Study on a deck that stopped being shared says so, on the page")
    tap(button(app, "Make a copy"))
    check(wait(text(app, "Copy to your library")), "Make a copy still opens its sheet")
    tap(button(app, "Copy deck"))
    check(wait(text(app, "This deck isn’t shared anymore.")) && button(app, "Copy deck").exists, "and Copy deck says so in the sheet, which stays")
    app.terminate()
    // Opening it again: it isn't there.
    app = launch(as: w.maria, ["-open", "deckpage:" + w.path])
    check(wait(text(app, "This deck isn’t here")), "a deck its owner made private isn’t there anymore")
  }

  // ---------- 7: every link that used to open Safari ----------
  func test7Links() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let w = world("7")
    print("Flow 7, people: \(w.alex), \(w.maria) (@\(w.AH))")
    social(w.maria, "deck.study", ["id": w.sharedId])
    suggestAsMaria(w)
    var app = launch(as: w.maria, ["-open", "profile:" + w.AH])
    let profileTile = buttonStarting(app, w.deckName)
    check(wait(profileTile), "a profile lists the deck")
    tap(profileTile)
    check(wait(text(app, w.deckName)) && wait(button(app, "Studying")), "a profile’s deck tile opens its page")
    app.terminate()
    // The deck page's own links (Alex's deck): its page, its suggestions, its History.
    app = launch(as: w.alex, ["-open", "deck:" + w.deckName])
    tap(button(app, "Deck settings"))
    tap(lowest(app, "Sharing"))
    check(wait(button(app, "Its page")), "Sharing has Its page, Suggestions, and History")
    tap(button(app, "Its page"))
    check(wait(button(app, "Edit")) && wait(button(app, "Share settings")), "Its page opens the page (with the settings sheet closed)")
    tap(button(app, "Back"))
    tap(button(app, "Deck settings"))
    tap(lowest(app, "Sharing"))
    tap(buttonStarting(app, "2 suggestions"))
    check(wait(buttonStarting(app, "Maria Santos, 4 changes")) && wait(text(app, w.deckName)), "Suggestions opens this deck’s suggestions")
    tap(button(app, "Back"))
    tap(button(app, "Deck settings"))
    tap(lowest(app, "Sharing"))
    tap(button(app, "History"))
    check(wait(text(app, "History")) && wait(any(app, "Alex Kim made it")), "History opens this deck’s History")
    app.terminate()
    // A deck she studies: its Sharing tab says whose it is, and Suggest a change opens the page with the sheet.
    app = launch(as: w.maria, ["-open", "deck:" + w.deckName])
    tap(button(app, "Deck settings"))
    tap(lowest(app, "Sharing"))
    check(wait(button(app, "Suggest a change")), "a studied deck’s Sharing says whose it is, with Suggest a change")
    tap(lowest(app, "Suggest a change"))
    check(wait(app.textFields["Find a card to fix"].firstMatch), "its Suggest a change opens the page with the sheet")
    tap(button(app, "Cancel"))
    app.terminate()
    // News: a suggestion on his deck opens its suggestions.
    app = launch(as: w.alex)
    tap(button(app, "Discover"))
    tap(buttonStarting(app, "Notifications"))
    let news = buttonStarting(app, "Maria Santos suggested")
    check(wait(news, 10), "News has Maria’s suggestions")
    tap(news)
    check(wait(text(app, "Suggestions")) && wait(text(app, w.deckName)), "a suggestion in News opens the deck’s suggestions")
    app.terminate()
    // Her profile: the suggestions she sent, each opening its deck's page.
    app = launch(as: w.maria, ["-open", "profile"])
    tap(button(app, "Suggestions"))
    check(wait(buttonStarting(app, w.deckName)), "her profile lists the suggestions she sent")
    tap(buttonStarting(app, w.deckName))
    check(wait(text(app, w.deckName)) && wait(any(app, "Kept up by Alex")), "a suggestion she sent opens its deck’s page")
  }
}
