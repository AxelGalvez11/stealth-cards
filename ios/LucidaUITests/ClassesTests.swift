// Classes and schools end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its lc_dev
// cookie, which the debug-only `-dev <name>` launch argument sets). A teacher makes a class in the app (a name, a school),
// adds a deck of hers and assigns it (learn every card, by a date); one student joins with the class's code (a wrong code
// says so first) and shares her progress, studies through the app, and the teacher sees how far she is; another student
// opens the invite link and joins but doesn't share, so the teacher sees "Not shared" and nothing of hers; Today lists
// the assignment for each of them; a student reports the class's deck; the teacher asks to be verified (a request that
// isn't an email or a link says so first) and the made-up person "admin" approves it; then helpers, renaming, leaving,
// taking someone out, and deleting the class; and the class a code doesn't have.
//
// Run it with ios/tools/e2e-classes.sh (it starts a fresh server on port 3733). It only runs when LUCIDA_CLASSES is set,
// so ios/tools/e2e.sh keeps running the study network's checks alone.
import XCTest

final class ClassesTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3733"
  private var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)
  private var teacher: String { "tch" + run }
  private var ana: String { "ana" + run }
  private var ben: String { "ben" + run }
  private var cy: String { "cyd" + run }

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_CLASSES"] != nil, "Run with ios/tools/e2e-classes.sh")
  }

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
  private func state(_ who: String, sync: Bool = false) -> [String: Any] { api(who, "GET", "/api/state" + (sync ? "?sync=1" : "")).json as? [String: Any] ?? [:] }
  private func handle(_ who: String) -> String { (state(who)["profile"] as? [String: Any])?["handle"] as? String ?? "" }
  private func classPage(_ who: String, _ code: String) -> [String: Any] { api(who, "GET", "/api/public/class?code=" + code).json as? [String: Any] ?? [:] }
  /// Someone's progress on the class's first assignment, as the owner's page has it (nil: none is there).
  private func progress(_ code: String, of h: String) -> [String: Any]? {
    let a = (classPage(teacher, code)["assignments"] as? [[String: Any]])?.first
    return (a?["progress"] as? [String: Any])?[h] as? [String: Any]
  }
  /// Waits for a condition on the server (a save or a sync that goes out a moment after a tap).
  private func eventually(_ s: TimeInterval = 8, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
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
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch
  }
  /// The button with this label that a finger can reach now (a dialog's, not the one it covers).
  private func reachable(_ app: XCUIApplication, _ label: String) -> XCUIElement {
    let all = app.buttons.matching(NSPredicate(format: "label == %@", label)).allElementsBoundByIndex
    return all.last { $0.isHittable } ?? app.buttons[label].firstMatch
  }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool { e.waitForExistence(timeout: s) }
  /// Waits until something's gone.
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func typeInto(_ field: XCUIElement, _ text: String, clear: Int = 0) {
    // A missing field is a failed check, not the end of the run.
    guard wait(field, 5) else { check(false, "the field to type in is there (typing \(text))"); return }
    if clear > 0 { field.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap() } else { field.tap() }
    if clear > 0 { field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: clear)) }
    field.typeText(text)
  }
  /// Taps something on a long page after scrolling it clear of the floating tab bar (`below`: how much room it needs under
  /// it, for a menu that opens there). A finger on something half hidden behind the bar would land on the bar.
  private func tapClear(_ app: XCUIApplication, _ e: XCUIElement, below: CGFloat = 130) {
    let screen = app.frame.height
    for _ in 0..<10 {
      guard wait(e, 5) else { break }
      let f = e.frame
      if e.isHittable && f.maxY < screen - below && f.minY > 100 { break }
      if f.minY <= 100 { app.swipeDown(velocity: .slow) } else { app.swipeUp(velocity: .slow) }
    }
    e.tap()
  }
  /// Library → Classes.
  private func toClasses(_ app: XCUIApplication) {
    button(app, "Library").tap()
    _ = wait(button(app, "Classes"))
    button(app, "Classes").tap()
  }
  /// The class page's invite code (six capitals), as the page shows it.
  private func shownCode(_ app: XCUIApplication) -> String {
    let code = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "[A-Z]{6}")).firstMatch
    _ = wait(code)
    return code.exists ? code.label : ""
  }
  /// Flips the card on screen and grades it Easy (a new card then comes back days later: it counts as learned).
  private func gradeEasy(_ app: XCUIApplication) -> Bool {
    let flip = button(app, "Flip card")
    guard wait(flip) else { return false }
    flip.tap()
    let easy = buttonStarting(app, "Easy")
    guard wait(easy) else { return false }
    easy.tap()
    return true
  }
  private func dayText(_ d: Date) -> String {
    let m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], c = Calendar.current
    return m[c.component(.month, from: d) - 1] + " \(c.component(.day, from: d))"
  }

  // ---------- the test ----------
  func testClasses() throws {
    print("Classes, people: \(teacher), \(ana), \(ben), \(cy)")
    // Setting up: four people, and the teacher's deck of six cards.
    act(teacher, "settings.update", ["patch": ["name": "Dr. Okafor", "welcomed": true]])
    act(ana, "settings.update", ["patch": ["name": "Maria Santos", "welcomed": true]])
    act(ben, "settings.update", ["patch": ["name": "Jordan Lee", "welcomed": true]])
    act(cy, "settings.update", ["patch": ["name": "Cy Diaz", "welcomed": true]])
    let deckId = act(teacher, "deck.add", ["name": "Chapter 3"])["id"] as? String ?? ""
    for (f, b) in [("What is a cell?", "The smallest unit of life"), ("What holds the DNA?", "The nucleus"), ("What makes ATP?", "The mitochondria"),
                   ("What makes proteins?", "Ribosomes"), ("What surrounds the cell?", "The membrane"), ("What packages proteins?", "The Golgi apparatus")] {
      act(teacher, "card.add", ["deckId": deckId, "kind": "basic", "front": f, "back": b])
    }
    check(!deckId.isEmpty && (state(teacher)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deckId }.count == 6, "the teacher has a deck of six cards")

    // ---------- the teacher makes a class ----------
    var app = launch(as: teacher)
    for tab in ["Today", "Library", "Discover", "Stats", "Connect"] { check(wait(button(app, tab)), "the tab bar has \(tab)") }
    button(app, "Library").tap()
    check(wait(button(app, "Classes")) && button(app, "Decks").exists && button(app, "All cards").exists, "the Library has Decks, All cards, and Classes")
    button(app, "Classes").tap()
    check(wait(app.staticTexts["No classes yet"]), "Classes says No classes yet")
    check(button(app, "Join a class").exists && button(app, "New class").exists, "with Join a class and New class")
    button(app, "New class").tap()
    let nameField = app.textFields["Class name"]
    check(wait(nameField) && app.textFields["School"].exists, "New class asks for a name and a school")
    check(app.staticTexts["New class"].exists, "its popup is titled New class")
    typeInto(nameField, "BIO 201")
    typeInto(app.textFields["School"], "UC Davis")
    button(app, "Create").tap()
    check(wait(app.staticTexts["BIO 201"], 10) && wait(app.staticTexts["Nothing assigned yet."]), "Create opens the new class, with nothing assigned yet")
    check(app.staticTexts["No decks in this class yet."].exists, "and no decks")
    let code = shownCode(app)
    check(code.range(of: "^[A-C,D-H,J,K,M-Z]{6}$", options: .regularExpression) != nil, "it has a six-letter code (\(code))")
    let rows = api(teacher, "GET", "/api/classes").json as? [[String: Any]] ?? []
    check(rows.count == 1 && rows[0]["code"] as? String == code && rows[0]["role"] as? String == "owner" && rows[0]["name"] as? String == "BIO 201" && rows[0]["school"] as? String == "UC Davis", "the server has the class, with the teacher as its owner")
    check(wait(any(app, "/class/" + code)), "the page shows the invite link")
    tapClear(app, button(app, "Copy invite link"))
    check(wait(button(app, "Copied")), "Copy invite link says Copied")

    // Adding a deck, and assigning it.
    let add = button(app, "Add a deck")
    check(add.exists, "the class has Add a deck")
    add.tap()
    check(wait(app.staticTexts["Add a deck"]) && wait(button(app, "Add Chapter 3")), "Add a deck lists the teacher's deck")
    button(app, "Add Chapter 3").tap()
    check(wait(app.staticTexts["Added"]), "Add says Added")
    let sharedVis = ((state(teacher)["decks"] as? [[String: Any]])?.first { $0["id"] as? String == deckId }?["share"] as? [String: Any])?["vis"] as? String
    check(sharedVis == "class", "the deck is shared with the class alone")
    let sharedId = (((state(teacher)["decks"] as? [[String: Any]])?.first { $0["id"] as? String == deckId }?["share"]) as? [String: Any])?["id"] as? String ?? ""
    button(app, "Close").tap()
    check(wait(any(app, "Chapter 3, 0 saves, 6 cards")), "the deck is in the class's Decks")
    check(gone(app.staticTexts["Add a deck"]), "and the sheet closes")
    Thread.sleep(forTimeInterval: 0.6)
    button(app, "Assign").tap()
    check(wait(app.staticTexts["Assign a deck"]), "Assign opens its sheet")
    check(wait(any(app, "Chapter 3, 6 cards")) && buttonStarting(app, "Chapter 3, 6 cards").isSelected, "with the class's deck picked")
    check(button(app, "Learn every card").exists && button(app, "Review what’s due").exists, "and the two goals")
    for chip in ["Tomorrow", "Friday", "In a week", "In 2 weeks"] { check(button(app, chip).exists, "a date: \(chip)") }
    button(app, "In a week").tap()
    check(buttonStarting(app, "In a week").isSelected, "In a week is the one picked")
    button(app, "Assign").tap()
    let week = dayText(Date().addingTimeInterval(7 * 86400))
    check(wait(any(app, "Chapter 3, Learn every card · due \(week)")), "the assignment is listed: Learn every card · due \(week)")
    check(gone(app.staticTexts["Assign a deck"]), "and the sheet closes")
    let asgServer = (classPage(teacher, code)["assignments"] as? [[String: Any]]) ?? []
    check(asgServer.count == 1 && asgServer[0]["goal"] as? String == "learn" && asgServer[0]["sharedId"] as? String == sharedId, "the server has the assignment")
    check(!any(app, " done").exists, "with nobody's progress yet (no one has joined)")

    // ---------- Maria joins with the code: a wrong one first ----------
    app = launch(as: ana)
    toClasses(app)
    check(wait(app.staticTexts["No classes yet"]), "a student has no classes yet")
    button(app, "Join a class").tap()
    let codeField = app.textFields["Class code"]
    check(wait(codeField) && app.staticTexts["Join a class"].exists, "Join a class asks for the code")
    typeInto(codeField, "zzzzzz")
    check(app.textFields["Class code"].value as? String == "ZZZZZZ", "the code types in capitals")
    button(app, "Join").tap()
    check(wait(app.staticTexts["No class has that code. Check it and try again."]), "a code no class has says so, in its own words")
    typeInto(codeField, code, clear: 6)
    button(app, "Join").tap()
    check(wait(app.staticTexts["BIO 201"], 10), "the right code joins: the class page opens")
    let ask = app.staticTexts["Share your progress with Dr. Okafor?"]
    check(wait(ask), "the class asks once: Share your progress with Dr. Okafor?")
    check(any(app, "How far you are and when you studied. Never your answers.").exists, "in plain words: never your answers")
    check(button(app, "Not now").exists && button(app, "Share").exists, "with Not now and Share")
    check(!button(app, "Add a deck").exists && !button(app, "Assign").exists, "a member can't add or assign")
    button(app, "Share").tap()
    check(gone(ask), "Share answers the question, and the card goes")
    let me = handle(ana)
    check(eventually { (classPage(self.ana, code)["me"] as? [String: Any])?["share"] as? Bool == true }, "the server has her sharing on")
    check(app.buttons["Share my progress"].firstMatch.exists, "the page has the Share my progress switch")
    check((app.buttons["Share my progress"].firstMatch.value as? String) == "On", "and it's on")
    check(wait(any(app, "Chapter 3, Learn every card · due \(week), 6 cards")) && !any(app, "6 cards left").exists, "her assignment says 6 cards (not studied yet)")
    check(button(app, "Leave class").exists && !button(app, "Delete class").exists && !button(app, "Rename").exists, "she can leave the class, not delete or rename it")
    check(!button(app, "Get verified").exists, "and only the owner and helpers get Get verified")

    // She studies: the assignment's Study button adds the deck to her library and opens it.
    let study = button(app, "Study Chapter 3")
    check(wait(study), "her assignment has a Study button")
    study.tap()
    check(wait(app.staticTexts["Chapter 3"]) && wait(any(app, "From Dr. Okafor")), "Study adds the deck to her library, from Dr. Okafor")
    check(eventually { (state(self.ana)["decks"] as? [[String: Any]] ?? []).contains { ($0["link"] as? [String: Any])?["id"] as? String == sharedId } }, "the server has it in her library")
    button(app, "Back").tap()
    check(wait(app.staticTexts["BIO 201"]), "back on the class")
    let study2 = button(app, "Study Chapter 3")
    check(wait(study2), "the class page lists the assignment")
    study2.tap()
    var graded = 0
    for _ in 0..<3 { if gradeEasy(app) { graded += 1 } }
    check(graded == 3, "she studies three cards (Flip card, Easy)")
    button(app, "End review").tap()
    Thread.sleep(forTimeInterval: 1.5)

    // Opening the app tells the class how far she is (she shares it); Today and Classes show it too.
    app = launch(as: ana)
    check(wait(any(app, "Chapter 3, due \(week) · BIO 201, 3 cards left"), 12), "Today lists her assignment: Chapter 3, due \(week) · BIO 201, 3 cards left")
    check(eventually(10) { self.progress(code, of: me)?["learned"] as? Int == 3 }, "the teacher's page has her progress: 3 learned")
    let p3 = progress(code, of: me)
    check(p3?["total"] as? Int == 6 && p3?["last"] != nil, "of 6 cards, and when she last studied")
    toClasses(app)
    let mTile = buttonStarting(app, "BIO 201, 1 assignment")
    check(wait(mTile), "Classes marks her class with what waits: 1 assignment")
    check(mTile.label.contains("UC Davis · 2 people"), "and its school and 2 people")
    mTile.tap()
    check(wait(any(app, "Chapter 3, Learn every card · due \(week), 3 cards left")), "the class page says 3 cards left")
    check(app.alerts.count == 0, "no error came up")

    // ---------- Jordan opens the invite link, and doesn't share ----------
    app = launch(as: ben, ["-open", "class:" + code])
    check(wait(app.staticTexts["BIO 201"], 10) && wait(button(app, "Join")), "the invite link shows the class with Join")
    check(any(app, "Dr. Okafor").exists && any(app, "2 people · 1 deck").exists, "and whose it is, how many people and decks")
    check(!any(app, "Nothing assigned yet.").exists, "an invite shows no assignments")
    button(app, "Join").tap()
    let ask2 = app.staticTexts["Share your progress with Dr. Okafor?"]
    check(wait(ask2), "Join takes him into the class, which asks about sharing")
    button(app, "Not now").tap()
    check(gone(ask2), "Not now answers it")
    check(eventually { (classPage(self.ben, code)["me"] as? [String: Any])?["asked"] as? Bool == true }, "the server has it answered")
    check((classPage(ben, code)["me"] as? [String: Any])?["share"] as? Bool == false, "with his progress not shared")
    check((app.buttons["Share my progress"].firstMatch.value as? String) == "Off", "the switch is off")
    // He studies two cards (through the server, as the web's Study and grades do).
    let benDeck = social(ben, "deck.study", ["id": sharedId])["deckId"] as? String ?? ""
    let benCards = (state(ben)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == benDeck }
    for c in benCards.prefix(2) { act(ben, "review.grade", ["cardId": c["id"] as? String ?? "", "rating": 4]) }
    _ = state(ben, sync: true)
    check(benCards.count == 6, "he studies the class's deck (2 of 6 cards)")
    let benHandle = handle(ben)
    check(progress(code, of: benHandle) == nil, "the teacher's page has nothing of his")

    // ---------- the teacher, half way: what's shared, and what isn't ----------
    app = launch(as: teacher)
    check(wait(button(app, "Today")) && gone(app.staticTexts["ASSIGNMENTS"], 3), "a teacher's Today has no assignments (they're for the students)")
    toClasses(app)
    let half = buttonStarting(app, "BIO 201, Yours")
    check(wait(half), "the teacher's Classes has BIO 201, marked Yours")
    check(half.label.contains("UC Davis · 3 people") && !half.label.contains("assignment"), "with its school and 3 people, and nothing waiting for her")
    half.tap()
    check(wait(app.staticTexts["Progress"]), "the class page has Progress for its owner")
    check(wait(buttonStarting(app, "Maria Santos, 3 of 6")), "Maria Santos: 3 of 6")
    check(wait(buttonStarting(app, "Jordan Lee, Not shared")), "Jordan Lee: Not shared")
    check(wait(any(app, "Chapter 3, Learn every card · due \(week), 0 of 1 done")), "the assignment: 0 of 1 done")

    // ---------- Maria finishes the deck: the last card tells the class ----------
    app = launch(as: ana, ["-open", "class:" + code])
    check(wait(button(app, "Study Chapter 3")), "Maria's class page still has Study")
    button(app, "Study Chapter 3").tap()
    var more = 0
    for _ in 0..<3 { if gradeEasy(app) { more += 1 } }
    check(more == 3, "she studies the other three cards")
    check(wait(button(app, "Done"), 10), "the session ends on its summary")
    check(eventually(10) { self.progress(code, of: me)?["learned"] as? Int == 6 }, "the last card tells the class at once: 6 learned")
    button(app, "Done").tap()

    // ---------- the teacher sees who shares ----------
    app = launch(as: teacher, ["-open", "class:" + code])
    check(wait(app.staticTexts["BIO 201"]) && wait(app.staticTexts["Progress"]), "the teacher opens the class")
    check(wait(any(app, "Chapter 3, Learn every card · due \(week), 1 of 1 done")), "the assignment says 1 of 1 done (one shares, and she's done)")
    check(wait(buttonStarting(app, "Maria Santos, 6 of 6")), "Progress: Maria Santos, 6 of 6")
    check(any(app, "Maria Santos, 6 of 6, ").exists, "with when she last studied")
    check(wait(buttonStarting(app, "Jordan Lee, Not shared")), "and Jordan Lee: Not shared")
    check(!any(app, "Jordan Lee, 2 of 6").exists, "with none of his numbers")
    let raw = String(data: (try? JSONSerialization.data(withJSONObject: classPage(teacher, code))) ?? Data(), encoding: .utf8) ?? ""
    check(!raw.contains("\"rating\"") && !raw.contains("\"srs\"") && !raw.contains("\"logs\""), "no answers or schedules leave anyone's library")
    check(button(app, "Get verified").exists, "the owner has Get verified")
    check(button(app, "Rename").exists && button(app, "Delete class").exists && !button(app, "Leave class").exists, "and Rename and Delete class (the owner can't leave)")
    check(app.staticTexts["People"].exists && app.staticTexts["3"].exists, "the page lists its 3 people")
    check(button(app, "More for Maria Santos").exists && button(app, "More for Jordan Lee").exists, "each member has ⋯")

    // ---------- Today lists the assignment ----------
    app = launch(as: ana)
    check(wait(any(app, "Chapter 3, due \(week) · BIO 201, Done"), 12), "Today lists Maria's assignment as Done")
    check(app.staticTexts["ASSIGNMENTS"].exists, "under Assignments")
    app = launch(as: ben)
    let row = any(app, "Chapter 3, due \(week) · BIO 201, 4 cards left")
    check(wait(row, 12), "and Jordan's: Chapter 3, due \(week) · BIO 201, 4 cards left")
    row.tap()
    check(wait(app.staticTexts["Chapter 3"]) && wait(any(app, "From Dr. Okafor")), "the row opens the deck")

    // ---------- the teacher asks to be verified ----------
    app = launch(as: teacher, ["-open", "class:" + code])
    check(wait(button(app, "Get verified")), "the teacher's class has Get verified")
    tapClear(app, button(app, "Get verified"))
    check(wait(app.staticTexts["Get verified"]) && wait(button(app, "I’m a teacher")) && button(app, "We’re a school").exists, "Get verified: I’m a teacher, We’re a school")
    let contact = app.textFields["School email or link"]
    check(wait(contact) && app.textFields["School"].exists, "it asks for the school, and an email or a link")
    typeInto(app.textFields["School"], "UC Davis")
    check((app.textFields["School"].value as? String)?.contains("UC Davis") == true, "the school is typed")
    typeInto(contact, "not an email")
    button(app, "Send").tap()
    check(wait(app.staticTexts["Type a school email, or a link that shows you there."]), "something that isn't an email or a link says so, in the server's words")
    typeInto(contact, "okafor@ucdavis.edu", clear: 12)
    button(app, "Send").tap()
    check(wait(any(app, "Waiting for review")) && any(app, "We’ll let you know.").exists, "a good one: Waiting for review, We’ll let you know")
    button(app, "Done").tap()
    check(wait(button(app, "Waiting for review")), "the class page says Waiting for review")
    let vs = api(teacher, "GET", "/api/verify").json as? [String: Any] ?? [:]
    check(vs["open"] as? Bool == true && (vs["verified"] as? String ?? "") == "", "the server has the request open")
    let ad = api("admin", "GET", "/api/admin").json as? [String: Any] ?? [:]
    let myHandle = handle(teacher)
    let req = (ad["requests"] as? [[String: Any]] ?? []).first { ($0["person"] as? [String: Any])?["handle"] as? String == myHandle }
    check(req?["school"] as? String == "UC Davis" && req?["contact"] as? String == "okafor@ucdavis.edu" && req?["role"] as? String == "teacher", "the admin sees it")
    social("admin", "admin.verify", ["id": req?["id"] as? String ?? "", "pick": "approve"])
    app = launch(as: teacher, ["-open", "class:" + code])
    check(wait(app.staticTexts["BIO 201"]), "the teacher opens the class again")
    check(gone(button(app, "Get verified")) && gone(button(app, "Waiting for review")), "approved: Get verified is gone")
    check(any(app, "Verified").exists, "and the teacher's name has its check")

    // ---------- Jordan becomes a helper and adds a deck; the verified teacher checks it ----------
    let benMore = button(app, "More for Jordan Lee")
    check(wait(benMore), "the owner can open ⋯ on a member")
    tapClear(app, benMore, below: 260)
    check(wait(button(app, "Make a helper")) && button(app, "Take out of class").exists, "it has Make a helper and Take out of class")
    button(app, "Make a helper").tap()
    func roleOf(_ h: String) -> String? { ((classPage(self.teacher, code)["members"] as? [[String: Any]])?.first { $0["handle"] as? String == h })?["role"] as? String }
    check(eventually { roleOf(benHandle) == "helper" }, "Make a helper saves")
    check(wait(button(app, "Jordan Lee, Helper")), "the page marks him Helper")
    let classId = classPage(teacher, code)["id"] as? String ?? ""
    let bonusId = act(ben, "deck.add", ["name": "Bonus"])["id"] as? String ?? ""
    act(ben, "card.add", ["deckId": bonusId, "kind": "basic", "front": "What is osmosis?", "back": "Water moving across a membrane"])
    let bonusShared = social(ben, "class.addDeck", ["id": classId, "deckId": bonusId])["sharedId"] as? String ?? ""
    check(!bonusShared.isEmpty, "a helper adds a deck of his own")
    app = launch(as: ben, ["-open", "class:" + code])
    check(wait(app.staticTexts["BIO 201"]) && wait(button(app, "Add a deck")) && button(app, "Assign").exists, "a helper has Add a deck and Assign")
    check(app.staticTexts["Progress"].exists && wait(buttonStarting(app, "Maria Santos, 6 of 6")), "and sees everyone's progress")
    check(!button(app, "Rename").exists && !button(app, "Delete class").exists && button(app, "Leave class").exists, "but can't rename or delete the class")
    check(button(app, "Get verified").exists, "and has Get verified too")
    app = launch(as: teacher, ["-open", "class:" + code])
    let bonusMore = button(app, "More for Bonus")
    check(wait(bonusMore), "the teacher's class lists Jordan's deck")
    tapClear(app, bonusMore, below: 260)
    check(wait(button(app, "Check this deck")) && button(app, "Take out of class").exists && button(app, "Report").exists, "its ⋯ has Check this deck, Take out of class, and Report")
    button(app, "Check this deck").tap()
    check(wait(any(app, "Bonus, Checked")), "Check this deck: the deck says Checked")
    check(eventually { (self.api(self.teacher, "GET", "/api/public/deck?id=" + bonusShared).json as? [String: Any])?["checked"] is [String: Any] }, "the server has the check")
    tapClear(app, button(app, "More for Bonus"), below: 260)
    check(wait(button(app, "Take out of class")) && !button(app, "Check this deck").exists, "a checked deck has no Check this deck")
    button(app, "Take out of class").tap()
    check(gone(any(app, "Bonus, Checked")), "Take out of class takes Jordan's deck out")
    check(eventually { (self.classPage(self.teacher, code)["deckList"] as? [[String: Any]] ?? []).count == 1 }, "the server has just Chapter 3 left")
    tapClear(app, button(app, "More for Jordan Lee"), below: 260)
    check(wait(button(app, "Make a member")), "a helper's ⋯ has Make a member")
    button(app, "Make a member").tap()
    check(eventually { roleOf(benHandle) == "member" }, "Make a member saves")
    check(wait(buttonStarting(app, "Jordan Lee, Not shared")) && gone(button(app, "Jordan Lee, Helper")), "and he's a learner again (his progress isn't shared)")

    // ---------- Jordan reports the class's deck; the admin hides it ----------
    app = launch(as: ben, ["-open", "class:" + code])
    let deckMore = button(app, "More for Chapter 3")
    check(wait(deckMore), "a class deck has ⋯")
    tapClear(app, deckMore, below: 260)
    check(wait(button(app, "Report")) && button(app, "Share to Google Classroom").exists && !button(app, "Take out of class").exists, "its menu has Report and Share to Google Classroom (a student can't take it out)")
    button(app, "Report").tap()
    check(wait(app.staticTexts["Report this deck"]) && any(app, "Chapter 3").exists, "Report opens: Report this deck, and its name")
    check(button(app, "Wrong or harmful").exists && button(app, "Spam").exists && button(app, "Someone else’s work").exists && button(app, "Other").exists, "with four reasons")
    button(app, "Other").tap()
    button(app, "Send").tap()
    Thread.sleep(forTimeInterval: 0.6)
    check(!any(app, "Thanks. We’ll take a look.").exists, "Other needs a line: Send waits")
    typeInto(app.textFields["A line about it"], "The third answer is wrong")
    button(app, "Send").tap()
    check(wait(any(app, "Thanks. We’ll take a look.")), "with a line, Send says thanks")
    button(app, "Done").tap()
    let admin = api("admin", "GET", "/api/admin").json as? [String: Any] ?? [:]
    let rep = (admin["reports"] as? [[String: Any]] ?? []).first { ($0["deck"] as? [String: Any])?["id"] as? String == sharedId }
    check((rep?["reports"] as? [[String: Any]])?.first?["reason"] as? String == "other" && (rep?["reports"] as? [[String: Any]])?.first?["note"] as? String == "The third answer is wrong", "the admin page has the report, with the line")
    social("admin", "admin.report", ["id": rep?["id"] as? String ?? "", "pick": "hide"])
    app = launch(as: ana, ["-open", "class:" + code])
    check(wait(app.staticTexts["No decks in this class yet."], 10) && wait(app.staticTexts["Nothing assigned yet."]), "hidden: the class no longer shows the deck or its assignment")

    // ---------- renaming; Jordan leaves; the teacher takes Maria out and deletes the class ----------
    app = launch(as: teacher, ["-open", "class:" + code])
    tapClear(app, button(app, "Rename"))
    let renameField = app.textFields["Class name"]
    check(wait(renameField) && app.staticTexts["Rename class"].exists, "Rename opens its popup")
    check((renameField.value as? String) == "BIO 201" && (app.textFields["School"].value as? String) == "UC Davis", "with the class's name and school in it")
    typeInto(renameField, " (fall)")
    button(app, "Save").tap()
    check(wait(app.staticTexts["BIO 201 (fall)"]), "Save renames the class")
    check(eventually { classPage(self.teacher, code)["name"] as? String == "BIO 201 (fall)" }, "the server has the new name")

    app = launch(as: ben, ["-open", "class:" + code])
    check(wait(button(app, "Leave class")), "Jordan can Leave class")
    tapClear(app, button(app, "Leave class"))
    check(wait(app.staticTexts["Leave “BIO 201 (fall)”?"]) && wait(any(app, "The decks you study from it stay in your library.")), "it asks first, in plain words")
    reachable(app, "Leave class").tap()
    check(wait(button(app, "Join a class")) || wait(app.staticTexts["No classes yet"]), "leaving goes back to his classes")
    check(eventually { (state(self.ben)["classes"] as? [[String: Any]] ?? []).isEmpty }, "the class is gone from his library")
    let kept = (state(ben)["decks"] as? [[String: Any]] ?? []).first { $0["id"] as? String == benDeck }
    check((kept?["link"] as? [String: Any])?["gone"] as? Bool == true && (state(ben)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == benDeck }.count == 6, "the deck he studied is his to keep, with its cards")

    app = launch(as: teacher, ["-open", "class:" + code])
    check(wait(button(app, "More for Maria Santos")), "the teacher's page lists Maria")
    check(!button(app, "More for Jordan Lee").exists, "and not Jordan anymore")
    tapClear(app, button(app, "More for Maria Santos"), below: 260)
    button(app, "Take out of class").tap()
    check(wait(app.staticTexts["Take Maria Santos out of the class?"]), "Take out of class asks first")
    reachable(app, "Take out of class").tap()
    check(eventually { (classPage(self.teacher, code)["members"] as? [[String: Any]] ?? []).count == 1 }, "she's out (only the owner is left)")
    check(classPage(ana, code)["invite"] as? Bool == true, "and she sees only the invite now")

    tapClear(app, button(app, "Delete class"))
    check(wait(app.staticTexts["Delete “BIO 201 (fall)”?"]) && wait(any(app, "Everyone in it keeps the decks they study.")), "Delete class asks first, in plain words")
    reachable(app, "Delete class").tap()
    check(wait(app.staticTexts["No classes yet"], 10) || wait(button(app, "Join a class")), "deleting goes back to Classes, with none left")
    check(eventually { (api(self.teacher, "GET", "/api/classes").json as? [Any] ?? []).isEmpty }, "the server has none left")
    check(api(teacher, "GET", "/api/public/class?code=" + code).status == 404, "and no class has that code anymore")
    check(app.alerts.count == 0, "no error came up")

    // ---------- a code no class has ----------
    app = launch(as: cy, ["-open", "class:" + code])
    check(wait(app.staticTexts["No class has that code"], 10), "an invite to a class that's gone says No class has that code")
    check(any(app, "Check the link, or ask for a new one.").exists && button(app, "Your classes").exists, "with what to do, and Your classes")
    button(app, "Your classes").tap()
    check(wait(button(app, "Classes")) || wait(app.staticTexts["Library"]), "Your classes goes back")

    print("Classes: \(passed) passed, \(failed) failed")
  }
}
