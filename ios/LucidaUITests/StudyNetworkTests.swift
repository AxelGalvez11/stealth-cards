// The study network end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its
// lc_dev cookie, which the debug-only `-dev <name>` launch argument sets): one person shares a deck publicly; another
// finds it in Discover and in search, opens the owner's profile, follows them, studies the deck (it shows in the Library
// with "From …") and sees Suggest a change; a third copies it, the owner changes two cards, and the copy shows the
// banner and takes one change and skips the other; the owner sees News of the follow, pins the deck, shares the
// profile, and switches who can see the deck; and Edit profile turns down a handle someone has and takes a free one.
//
// Run it with ios/tools/e2e.sh (it starts a fresh server on port 3677). Studying and copying happen through the server,
// as the web's shared deck page does them: the iPhone app doesn't have that page yet.
import XCTest

final class StudyNetworkTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3677"
  private var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)
  private var owner: String { "own" + run }
  private var learner: String { "lrn" + run }
  private var copier: String { "cpy" + run }

  override func setUp() { continueAfterFailure = true }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { passed += 1; print("  ok   " + name) } else { failed += 1; print("  FAIL " + name); XCTFail(name) }
  }
  /// A request as one of the made-up people; the answer's JSON.
  @discardableResult
  private func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: Self.server + path)!)
    r.httpMethod = method
    r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie")
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
  private func profile(_ h: String) -> [String: Any] { api(owner, "GET", "/api/public/profile?h=" + h).json as? [String: Any] ?? [:] }

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
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  /// A button whose label starts with these words (a row's label has its value after it).
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch
  }
  /// The lowest button with this label on screen (in a sheet or on a pushed page, not the page under it).
  private func lowest(_ app: XCUIApplication, _ label: String, starting: Bool = false) -> XCUIElement {
    let all = app.buttons.matching(NSPredicate(format: starting ? "label BEGINSWITH %@" : "label == %@", label)).allElementsBoundByIndex
    return all.max { $0.frame.minY < $1.frame.minY } ?? app.buttons[label].firstMatch
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool { e.waitForExistence(timeout: s) }
  /// Waits until something's gone.
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func typeInto(_ field: XCUIElement, _ text: String, clear: Int = 0) {
    // At the end of what's there, so clearing takes all of it.
    if clear > 0 { field.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap() } else { field.tap() }
    if clear > 0 { field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: clear)) }
    field.typeText(text)
  }

  // ---------- the test ----------
  func testStudyNetwork() throws {
    print("Study network, people: \(owner), \(learner), \(copier)")
    // Setting up: three people; the owner makes a deck and shares it publicly.
    act(owner, "settings.update", ["patch": ["name": "Maria Santos", "welcomed": true]])
    act(learner, "settings.update", ["patch": ["name": "Bob Stone", "welcomed": true]])
    act(copier, "settings.update", ["patch": ["name": "Cam Diaz", "welcomed": true]])
    let deckId = act(owner, "deck.add", ["name": "MCAT Biochemistry", "tags": ["MCAT"]])["id"] as? String ?? ""
    act(owner, "card.add", ["deckId": deckId, "kind": "basic", "front": "Which enzyme is the rate-limiting step of glycolysis?", "back": "Hexokinase"])
    act(owner, "card.add", ["deckId": deckId, "kind": "basic", "front": "What does ATP synthase make?", "back": "ATP"])
    act(owner, "card.add", ["deckId": deckId, "kind": "basic", "front": "Where does the citric acid cycle happen?", "back": "In the cytoplasm"])
    let shared = social(owner, "deck.share", ["deckId": deckId, "visibility": "public", "description": "Every enzyme the exam asks."])
    let sharedId = shared["id"] as? String ?? ""
    let ownerHandle = (state(owner)["profile"] as? [String: Any])?["handle"] as? String ?? ""
    check(!sharedId.isEmpty && !ownerHandle.isEmpty, "the owner shares a deck publicly (@\(ownerHandle))")

    // ---------- the learner: Discover, search, the owner's profile, Follow ----------
    var app = launch(as: learner)
    for tab in ["Today", "Library", "Discover", "Stats", "Connect"] { check(wait(button(app, tab)), "the tab bar has \(tab)") }
    button(app, "Discover").tap()
    check(wait(any(app, "Popular this week")), "Discover shows its sections")
    check(wait(any(app, "MCAT Biochemistry")), "the shared deck is in Discover")
    check(wait(button(app, "Maria Santos")), "with whose it is under it")
    let search = app.textFields["Search decks and people"].firstMatch
    check(wait(search), "Discover has its search")
    typeInto(search, "MCAT Bio")
    check(wait(app.staticTexts["Decks"]), "searching lists decks")
    check(wait(any(app, "MCAT Biochemistry")), "and finds the shared deck")
    typeInto(search, ownerHandle, clear: 8)
    let person = button(app, "Maria Santos, @" + ownerHandle)
    check(wait(person), "search finds its owner under People")
    person.tap()
    check(wait(app.staticTexts["@" + ownerHandle]), "the owner's profile opens")
    let follow = button(app, "Follow")
    check(wait(follow), "with Follow")
    follow.tap()
    check(wait(button(app, "Following")), "Follow turns into Following at once")
    Thread.sleep(forTimeInterval: 1.5)
    check((profile(ownerHandle)["followers"] as? Int) == 1, "the server counts the follower")
    check(wait(any(app, "MCAT Biochemistry")), "the owner's profile lists the deck")

    // The learner studies the deck (the deck page's Study, through the server): it's in the Library, from the owner.
    let studied = social(learner, "deck.study", ["id": sharedId])["deckId"] as? String ?? ""
    check(!studied.isEmpty, "studying the deck adds it to the learner's library")
    button(app, "Library").tap()
    let row = any(app, "From Maria Santos")
    check(wait(row, 12), "the Library says whose it is (From Maria Santos)")
    check(any(app, "3 cards").exists, "with its cards")
    row.tap()
    check(wait(button(app, "Suggest a change")), "the studied deck has Suggest a change")
    check(!button(app, "New card").exists, "and no New card")
    check(wait(button(app, "From Maria Santos")), "its page says whose it is")
    button(app, "Deck settings").tap()
    check(wait(button(app, "Remove from library")), "its settings say Remove from library")
    check(!app.staticTexts["Name"].exists, "and hide its name")
    lowest(app, "Sharing").tap()
    check(wait(app.staticTexts["You study it as it is."]), "Sharing says you study it as it is")
    check(button(app, "Make it my own").exists, "with Make it my own")
    button(app, "Done").tap()

    // ---------- the copier: the owner's changes wait on the copy ----------
    let copy = social(copier, "deck.copy", ["id": sharedId, "updates": true])["deckId"] as? String ?? ""
    check(!copy.isEmpty, "a third person copies the deck")
    let ownerCards = (state(owner)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deckId }
    let first = ownerCards.first { ($0["front"] as? String)?.hasPrefix("Which enzyme") == true }?["id"] as? String ?? ""
    let third = ownerCards.first { ($0["front"] as? String)?.hasPrefix("Where does") == true }?["id"] as? String ?? ""
    act(owner, "card.update", ["id": first, "patch": ["back": "Phosphofructokinase-1"]])
    act(owner, "card.update", ["id": third, "patch": ["back": "In the mitochondrial matrix"]])
    app = launch(as: copier, ["-open", "deck:MCAT Biochemistry"])
    let banner = any(app, "Maria Santos changed 2 cards")
    check(wait(banner, 12), "the copy shows the owner's changes (Maria Santos changed 2 cards)")
    check(button(app, "New card").exists && !button(app, "Suggest a change").exists, "a copy is yours to edit")
    banner.tap()
    check(wait(app.staticTexts["Changes from Maria Santos"]), "See changes opens the changes")
    check(button(app, "Take all 2").exists, "with Take all 2")
    // The changes come in the deck's order (the newest card first): the first is taken, the other skipped.
    let top = { (w: String) in app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", w)).allElementsBoundByIndex.map(\.frame.minY).min() ?? .infinity }
    let enzymeFirst = top("Which enzyme") < top("Where does")
    app.buttons["Take it"].firstMatch.tap()
    // Only once the first is taken (one left: Take all 1) is the Skip on screen the other change's.
    check(wait(button(app, "Take all 1")), "one change taken, one left")
    app.buttons["Skip"].firstMatch.tap()
    check(gone(app.staticTexts["Changes from Maria Santos"]), "skipping the last one closes the changes")
    check(gone(any(app, "changed 1 card")), "and the banner goes")
    Thread.sleep(forTimeInterval: 1)
    let copyCards = (state(copier)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == copy }
    let has = { (back: String) in copyCards.contains { $0["back"] as? String == back } }
    check(enzymeFirst ? has("Phosphofructokinase-1") : has("In the mitochondrial matrix"), "the taken change is on the copy")
    check(enzymeFirst ? has("In the cytoplasm") : has("Hexokinase"), "the skipped one isn't")

    // ---------- the owner: News of the follow, a pin, Share, who can see the deck ----------
    app = launch(as: owner)
    let bell = button(app, "News, 1 new")
    check(wait(bell, 10), "the bell on Today counts the news")
    bell.tap()
    let news = any(app, "Bob Stone followed you")
    check(wait(news, 10), "News says Bob Stone followed you")
    Thread.sleep(forTimeInterval: 2.5)
    news.tap()
    let learnerAt = (state(learner)["profile"] as? [String: Any])?["handle"] as? String ?? ""
    check(wait(app.staticTexts["@" + learnerAt]), "a follow opens the follower's profile")
    button(app, "Back").tap()
    button(app, "Back").tap()
    check(wait(button(app, "News"), 10), "News is read a moment after opening it (the count goes)")
    button(app, "Your profile").tap()
    check(wait(app.staticTexts["@" + ownerHandle]), "your picture on Today opens your profile")
    let more = button(app, "More for MCAT Biochemistry")
    check(wait(more), "your decks have ⋯")
    more.tap()
    let pin = button(app, "Pin to profile")
    check(wait(pin), "⋯ has Pin to profile")
    pin.tap()
    check(wait(any(app, "Pinned")), "the deck says Pinned")
    Thread.sleep(forTimeInterval: 1.5)
    check((profile(ownerHandle)["featured"] as? [String])?.contains(sharedId) == true, "the pin is saved")
    button(app, "Share profile").tap()
    check(wait(button(app, "Link copied")), "Share says Link copied")
    button(app, "Library").tap()
    check(wait(any(app, "Public · 3 cards"), 10), "the Library marks the deck Public")
    any(app, "Public · 3 cards").tap()
    check(wait(button(app, "Public")), "a deck you share has its page's button")
    button(app, "Deck settings").tap()
    lowest(app, "Sharing").tap()
    check(wait(button(app, "Copy link")), "Sharing has its link with Copy link")
    check(wait(any(app, "1 studying · 1 copy")), "and how many study and copy it")
    lowest(app, "Link only").tap()
    Thread.sleep(forTimeInterval: 1.5)
    let vis = ((state(owner)["decks"] as? [[String: Any]])?.first { $0["id"] as? String == deckId }?["share"] as? [String: Any])?["vis"] as? String
    check(vis == "link", "Link only saves")
    check(wait(app.staticTexts["Anyone with the link."]), "and says who can see it")
    lowest(app, "Public").tap()
    Thread.sleep(forTimeInterval: 1.5)
    let vis2 = ((state(owner)["decks"] as? [[String: Any]])?.first { $0["id"] as? String == deckId }?["share"] as? [String: Any])?["vis"] as? String
    check(vis2 == "public", "and back to Public")
    button(app, "Done").tap()

    // ---------- the learner: Edit profile, a handle someone has, then a free one ----------
    app = launch(as: learner)
    button(app, "Your profile").tap()
    let learnerHandle = (state(learner)["profile"] as? [String: Any])?["handle"] as? String ?? ""
    check(wait(app.staticTexts["@" + learnerHandle]), "the learner's own profile opens (@\(learnerHandle))")
    button(app, "Edit profile").tap()
    let field = app.textFields["Handle"].firstMatch
    check(wait(field), "Edit profile opens")
    typeInto(field, "b", clear: 30)
    check(wait(app.staticTexts["Use 3 to 30 letters, numbers, dots, or underscores."]), "a handle that isn't one says so as you type")
    typeInto(field, ownerHandle, clear: 5)
    let taken = app.staticTexts["That name is taken. Try another."]
    check(wait(taken), "a handle someone has says so as you type: That name is taken. Try another.")
    button(app, "Save").tap()
    Thread.sleep(forTimeInterval: 1)
    check(taken.exists && button(app, "Cancel").exists, "and Save doesn't take it (the server says the same)")
    let fresh = "bob.studies" + run
    typeInto(field, fresh, clear: ownerHandle.count + 2)
    button(app, "Save").tap()
    check(gone(button(app, "Cancel"), 10), "a free handle saves, and the sheet closes")
    check(wait(app.staticTexts["@" + fresh], 10), "the profile shows the new handle")
    check((state(learner)["profile"] as? [String: Any])?["handle"] as? String == fresh, "the server has it")
    button(app, "Settings").tap()
    check(wait(buttonStarting(app, "@" + fresh)), "Settings → Profile shows @\(fresh)")
    // Settings' own row (the profile's Edit profile button is still there under the page, higher up).
    lowest(app, "Edit profile", starting: true).tap()
    check(wait(button(app, "Cancel")), "Settings → Edit profile opens the editor")
    button(app, "Cancel").tap()
    check(gone(button(app, "Cancel")), "Cancel closes it")

    // The learner takes the studied deck out of the library (Deck settings: Remove from library, then its confirm).
    button(app, "Library").tap()
    let studiedRow = any(app, "From Maria Santos")
    check(wait(studiedRow), "the studied deck is in the Library")
    studiedRow.tap()
    button(app, "Deck settings").tap()
    button(app, "Remove from library").tap()
    check(wait(app.staticTexts["Remove “MCAT Biochemistry” from your library? Your progress on it goes too."]), "Remove from library asks first, in plain words")
    lowest(app, "Remove from library").tap()
    check(gone(any(app, "From Maria Santos"), 10), "and the deck leaves the Library")
    check(!((state(learner)["decks"] as? [[String: Any]]) ?? []).contains { $0["id"] as? String == studied }, "the server has it gone too")

    print("Study network: \(passed) passed, \(failed) failed")
  }
}
