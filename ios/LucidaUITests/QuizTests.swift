// Lucida's own Learn mode questions in the iPhone app, end to end, against a copy of the server on this Mac with a pretend OpenRouter (ios/tools/e2e-quiz.sh
// starts both, and a second server with no AI key) and made-up people (the lc_dev cookie, which the debug-only `-dev <name>` launch argument sets):
//   1  Learn mode starts at once with its builders' questions while the AI is still writing (nobody waits); 20 cards are asked for as it starts;
//      the questions are saved on the cards, marked as Lucida's; and a written question comes up, with its own wrong answers and its why.
//   2  A Free person whose day's three batches are used: Learn mode goes on with its builders, nothing is asked of the AI, and no alert shows.
//   3  A server with no AI: Learn mode starts and asks as always, and nothing is asked of anyone.
// Run it with ios/tools/e2e-quiz.sh. It only runs when LUCIDA_QUIZ is set, so the other scripts keep running their own checks alone.
import XCTest

final class QuizTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3944"
  static let stub = ProcessInfo.processInfo.environment["LUCIDA_STUB"] ?? "http://127.0.0.1:3945"
  static let off = ProcessInfo.processInfo.environment["LUCIDA_OFF"] ?? "http://127.0.0.1:3946"
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_QUIZ"] != nil, "Run with ios/tools/e2e-quiz.sh")
  }
  override class func tearDown() { print("Quiz: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else { Self.failed += 1; print("  FAIL " + name); XCTFail(name); snap("quiz-fail-\(Self.failed)") }
  }
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 12) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  @discardableResult
  private func api(_ base: String, _ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: base + path)!)
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
    _ = done.wait(timeout: .now() + 30)
    return out
  }
  @discardableResult
  private func act(_ base: String, _ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(base, who, "POST", "/api/action", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  private func cards(_ base: String, _ who: String) -> [[String: Any]] { ((api(base, who, "GET", "/api/state").json as? [String: Any])?["cards"] as? [[String: Any]]) ?? [] }
  private func eventually(_ s: TimeInterval = 20, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
  }
  /// The pretend OpenRouter: the requests it has had (how many cards each asked about), and what it should do next.
  private func stubRequests() -> [Int] {
    ((api(Self.stub, "", "GET", "/__stub/log").json as? [String: Any])?["requests"] as? [[String: Any]] ?? []).map { r in
      let msgs = (r["body"] as? [String: Any])?["messages"] as? [[String: Any]] ?? []
      let user = msgs.first { $0["role"] as? String == "user" }?["content"] as? String ?? ""
      return user.components(separatedBy: "\n").filter { $0.range(of: "^Card [0-9]+$", options: .regularExpression) != nil }.count
    }
  }
  private func stubSet(_ o: [String: Any]) {
    api(Self.stub, "", "POST", "/__stub/reset")
    var b: [String: Any] = ["fail": NSNull(), "delayMs": 0, "onlyPlain": false, "types": NSNull()]
    for (k, v) in o { b[k] = v }
    api(Self.stub, "", "POST", "/__stub", b)
  }
  private func deck(_ base: String, _ who: String, _ name: String, _ n: Int) -> [String] {
    let id = act(base, who, "deck.add", ["name": name])["id"] as? String ?? ""
    var ids: [String] = []
    for i in 0..<n { ids.append((act(base, who, "card.add", ["deckId": id, "kind": "basic", "front": "Question number \(i)", "back": "Answer number \(i)"])["ids"] as? [String])?.first ?? "") }
    return ids
  }

  private func launch(_ base: String, as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", base, "-dev", who] + extra
    app.launch()
    return app
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool { e.waitForExistence(timeout: s) }
  /// The answers of the question on screen (every option has "Answer number" in it, a written question's wrong ones "Not Answer number").
  private func options(_ app: XCUIApplication) -> [String] {
    app.buttons.matching(NSPredicate(format: "label CONTAINS 'Answer number'")).allElementsBoundByIndex.map(\.label)
  }
  /// Learn mode on the deck of this name, with only multiple choice turned on (so each question is one a tap can answer).
  private func startLearn(_ app: XCUIApplication) {
    tap(app.buttons["deck.study"].firstMatch, "Study")
    tap(app.otherElements.matching(NSPredicate(format: "identifier BEGINSWITH %@", "menu.")).buttons.matching(NSPredicate(format: "label == %@", "Learn")).firstMatch, "Study › Learn")
    check(wait(button(app, "Start learning")), "Learn mode’s start sheet opens")
    for k in ["Matching", "True or false", "Fill in the blank"] { tap(button(app, k), k) }
    tap(button(app, "Start learning"), "Start learning")
    check(wait(button(app, "Stop for now")), "Learn mode starts")
  }
  /// Answers the question on screen (the first answer) and goes on; gives the answers it had, and whether the page said why (a written
  /// question brings its why: "Because the card says ...").
  private func answerOne(_ app: XCUIApplication) -> (options: [String], why: Bool)? {
    let labels = options(app)
    guard let first = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Answer number'")).allElementsBoundByIndex.first else { return nil }
    first.tap()
    let next = button(app, "Next question")
    guard next.waitForExistence(timeout: 10) else { return (labels, false) }
    let why = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Because the card says'")).count > 0
    next.tap()
    return (labels, why)
  }

  // ---------- 1: Learn mode starts at once and the AI's questions come in ----------
  func test1WrittenQuestionsComeIn() throws {
    let who = "qza" + run, name = "Cell Biology " + run
    _ = deck(Self.server, who, name, 30)
    stubSet(["types": "multiple_choice", "delayMs": 4000])
    let app = launch(Self.server, as: who, ["-open", "deck:" + name])
    check(wait(app.buttons["deck.study"].firstMatch), "the deck page is open")
    startLearn(app)
    check(wait(app.buttons.matching(NSPredicate(format: "label CONTAINS 'Answer number'")).firstMatch), "the first question is there at once, from the builders (the AI is still writing)")
    let first = options(app)
    check(first.count >= 2 && first.allSatisfy { !$0.contains("Not Answer number") }, "its answers are other cards’ answers, not written ones")
    snap("quiz-first")
    check(eventually(15) { stubRequests().count >= 1 } && stubRequests() == [20], "as Learn mode started, 20 cards were asked about, in one request (\(stubRequests()))")
    check(eventually(25) { cards(Self.server, who).filter { (($0["quiz"] as? [[String: Any]]) ?? []).count == 1 }.count == 20 }, "20 cards were given a question, saved on the cards")
    let q = cards(Self.server, who).compactMap { ($0["quiz"] as? [[String: Any]])?.first }
    check(q.count == 20 && q.allSatisfy { $0["by"] as? String == "Lucida" && $0["kind"] as? String == "choice" }, "each marked as written by Lucida, a multiple choice")
    var sawWritten = false, why = false
    for _ in 0..<40 where !sawWritten {
      // (a picture of the written question while it is on screen)
      if options(app).contains(where: { $0.contains("Not Answer number") }) { snap("quiz-written"); sawWritten = true }
      guard let r = answerOne(app) else { break }
      if sawWritten { why = r.why }
    }
    check(sawWritten, "then a written question comes up, with its own wrong answers")
    check(why, "and it says why")
    check(app.alerts.count == 0, "no alerts along the way")
    let asked = stubRequests().count
    check(asked <= 2, "and no more than two requests so far (the next 20 only when the first are about to run out): \(stubRequests())")
  }

  // ---------- 2: a Free person's three batches are used ----------
  func test2FreeBatchesUsed() throws {
    let who = "freeqza" + run, name = "Free " + run
    let ids = deck(Self.server, who, name, 80)
    stubSet(["types": "multiple_choice"])
    for i in 0..<3 { api(Self.server, who, "POST", "/api/quiz", ["cardIds": Array(ids[(i * 20)..<(i * 20 + 20)])]) }
    check(stubRequests() == [20, 20, 20], "the day’s three batches are used (\(stubRequests()))")
    let app = launch(Self.server, as: who, ["-open", "deck:" + name])
    check(wait(app.buttons["deck.study"].firstMatch), "the deck page is open")
    startLearn(app)
    check(wait(app.buttons.matching(NSPredicate(format: "label CONTAINS 'Answer number'")).firstMatch), "Learn mode asks its first question")
    var n = 0
    for _ in 0..<10 { if answerOne(app) != nil { n += 1 } }
    check(n >= 8, "and goes on with its builders: \(n) questions")
    Thread.sleep(forTimeInterval: 2)
    check(stubRequests().count == 3, "nothing more was asked of the AI (\(stubRequests().count) requests)")
    check(app.alerts.count == 0, "and no alert shows")
    snap("quiz-free")
  }

  // ---------- 3: a server with no AI ----------
  func test3NoAI() throws {
    let who = "qzo" + run, name = "No AI " + run
    _ = deck(Self.off, who, name, 10)
    stubSet([:])
    let app = launch(Self.off, as: who, ["-open", "deck:" + name])
    check(wait(app.buttons["deck.study"].firstMatch), "the deck page is open")
    startLearn(app)
    check(wait(app.buttons.matching(NSPredicate(format: "label CONTAINS 'Answer number'")).firstMatch), "Learn mode asks its first question")
    var n = 0
    for _ in 0..<6 { if answerOne(app) != nil { n += 1 } }
    check(n >= 5 && app.alerts.count == 0, "and goes on as always: \(n) questions, no alert")
    check(stubRequests().isEmpty, "nothing was asked of anyone")
  }
}
