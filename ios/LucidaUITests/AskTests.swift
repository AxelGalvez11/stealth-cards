// Asking about a card in Explain (the owner, 2026-10-02: "add a chatcomposer so user can ask question"), end to end on the iPhone app: taps
// through it as made-up people (the `lc_dev` cookie that the debug-only `-dev <name>` launch argument sets) against a fresh copy of the server,
// whose AI is the stand-in ios/tools/explain-stub.mjs (it answers a question with "You asked “…”. It comes back to **<answer>**.").
//   1 Review: the composer under the explanation; typing puts it on top of the keyboard (the card steps aside, the grade buttons wait under
//     the keyboard); Return sends; the question is a bubble and its answer comes under it (no ** marks); more questions stack; the keyboard
//     going leaves things as they were; closing the explanation forgets the questions
//   2 Free: each question is one of the day's three explanations, then the composer is the upgrade line (Go Pro), also when opened again later
//   3 the AI failing: the question's answer says so, in Lucida's quiet line
//   4 Learn mode: the same composer under the explanation; Next waits under the keyboard while a question is typed
//   5 the design screens: PhoneReviewExplainAsk, and Learn and the practice test's results with a question asked (-explainOpen -followUp)
// No system alert, sheet or menu in any of them. Run it with ios/tools/e2e-ask.sh; it only runs when LUCIDA_ASK is set.
import XCTest

final class AskTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3976"
  static let ai = ProcessInfo.processInfo.environment["LUCIDA_AI"] ?? "http://127.0.0.1:3977"
  private static var passed = 0, failed = 0
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_ASK"] != nil, "Run with ios/tools/e2e-ask.sh")
  }
  override class func tearDown() { print("Ask: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String, _ extra: String = "") {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else { Self.failed += 1; print("  FAIL " + name + (extra.isEmpty ? "" : "  → " + extra)); XCTFail(name); snap("ask-fail-\(Self.failed)") }
  }
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"], !dir.isEmpty else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  private func tap(_ e: XCUIElement, _ what: String) { if e.waitForExistence(timeout: 12) { e.tap() } else { check(false, "found " + what + " to tap") } }
  @discardableResult
  private func api(_ who: String, _ method: String, _ path: String, _ body: [String: Any]? = nil, base: String = AskTests.server) -> (status: Int, json: Any?) {
    var r = URLRequest(url: URL(string: base + path)!)
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
  @discardableResult
  private func act(_ who: String, _ type: String, _ o: [String: Any] = [:]) -> [String: Any] {
    var b = o; b["type"] = type
    return (api(who, "POST", "/api/action", b).json as? [String: Any])?["result"] as? [String: Any] ?? [:]
  }
  /// How many follow-up questions the stand-in AI has answered so far.
  private func followUps() -> Int { (api("x", "GET", "/__count", base: Self.ai).json as? [String: Any])?["followUps"] as? Int ?? -1 }
  /// A person who has been through the welcome, with one deck of these cards.
  private func person(_ who: String, _ name: String, deck: String, cards: [(String, String)]) {
    act(who, "settings.update", ["patch": ["name": name, "welcomed": true]])
    let id = act(who, "deck.add", ["name": deck])["id"] as? String ?? ""
    for (f, b) in cards { act(who, "card.add", ["deckId": id, "kind": "basic", "front": f, "back": b]) }
  }
  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who] + extra
    app.launch()
    return app
  }
  private func launchBoard(_ board: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-board", board] + extra
    app.launch()
    return app
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 10) -> Bool { e.waitForExistence(timeout: s) }
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 8) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func explanation(_ app: XCUIApplication) -> XCUIElement { app.otherElements["Explanation"].firstMatch }
  private func words(_ app: XCUIApplication, _ w: String) -> XCUIElement { app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", w)).firstMatch }
  private func field(_ app: XCUIApplication) -> XCUIElement { app.descendants(matching: .any).matching(identifier: "askField").firstMatch }
  private func questions(_ app: XCUIApplication) -> [String] { app.descendants(matching: .any).matching(identifier: "askQuestion").allElementsBoundByIndex.map(\.label) }
  private func answers(_ app: XCUIApplication) -> [String] { app.descendants(matching: .any).matching(identifier: "askAnswer").allElementsBoundByIndex.map(\.label) }
  private func limitLine(_ app: XCUIApplication) -> XCUIElement { app.descendants(matching: .any).matching(identifier: "askLimit").firstMatch }
  private func keyboard(_ app: XCUIApplication) -> XCUIElement { app.keyboards.firstMatch }
  /// Where the phone's own keyboard begins: the real one when it shows, or, with a hardware keyboard (the simulators here), the one the app is
  /// told about (-fakeKeyboard 300: the app makes room for a keyboard that tall).
  private func keyboardTop(_ app: XCUIApplication) -> CGFloat {
    let kb = keyboard(app), screen = app.windows.firstMatch.frame.maxY
    return kb.exists && kb.frame.minY < screen - 10 ? kb.frame.minY : screen - 300
  }
  private func hidden(_ e: XCUIElement) -> Bool { !e.exists || !e.isHittable }
  private func flip(_ app: XCUIApplication) -> Bool { tap(button(app, "Flip card"), "the card"); return wait(button(app, "Flip back")) }
  private func noSystemUI(_ app: XCUIApplication, _ where_: String) {
    check(app.alerts.count == 0 && app.sheets.count == 0 && app.popovers.count == 0 && app.menus.count == 0, where_ + ": no system alert, sheet or menu")
  }
  /// Waits until the stand-in has answered `n` questions and the app shows `n` answers (or what went wrong).
  private func answered(_ app: XCUIApplication, _ n: Int, _ s: TimeInterval = 15) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end {
      let done = answers(app).count + app.descendants(matching: .any).matching(identifier: "askError").count
      if done >= n { return true }
      Thread.sleep(forTimeInterval: 0.3)
    }
    return false
  }
  /// Types a question and sends it with the keyboard's Return (or the Send button).
  private func ask(_ app: XCUIApplication, _ q: String, button send: Bool = false) {
    let f = field(app)
    guard wait(f) else { check(false, "found the composer to type in"); return }
    if !typing(app) { f.tap(); Thread.sleep(forTimeInterval: 0.6) }
    if send { f.typeText(q); tap(button(app, "Send"), "Send") } else { f.typeText(q + "\n") }
  }
  /// Puts the keyboard away the way a person does: a drag down on the conversation.
  /// The composer has the cursor (the keyboard is up, or on a hardware keyboard would be).
  private func typing(_ app: XCUIApplication) -> Bool { (field(app).value(forKey: "hasKeyboardFocus") as? Bool) ?? false }
  /// Puts the keyboard away the way a person does in a chat: a tap on the explanation's words.
  private func keyboardDown(_ app: XCUIApplication) {
    let w = words(app, "Because ").exists ? words(app, "Because ") : explanation(app)
    w.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.5)).tap()
    let end = Date().addingTimeInterval(5)
    while Date() < end && typing(app) { Thread.sleep(forTimeInterval: 0.25) }
    Thread.sleep(forTimeInterval: 0.6)
  }

  // ---------- 1: Review ----------
  func test1AskInReview() throws {
    let ann = "ann" + run
    person(ann, "Ann Asks", deck: "Ask Review", cards: [("What does the pump move out of the matrix?", "Protons"), ("What reads mRNA?", "Ribosomes")])
    let app = launch(as: ann, ["-open", "review", "-fakeKeyboard", "300"])
    check(flip(app) && wait(button(app, "Explain")), "a card, turned over, offers Explain")
    let card0 = button(app, "Flip back").frame
    tap(button(app, "Explain"), "Explain")
    check(wait(explanation(app)) && wait(words(app, "Because "), 15), "the explanation opens")
    check(wait(field(app)) && button(app, "Send").exists && !button(app, "Send").isEnabled, "under it: “Ask about this card” and a Send button, pale with nothing to send")
    let panel0 = explanation(app).frame, f0 = field(app).frame
    check(f0.minY > panel0.minY + 40 && f0.maxY <= panel0.maxY && panel0.minY >= button(app, "Flip back").frame.maxY, "the composer is at the bottom of the panel, under the card", "panel \(panel0) field \(f0)")
    // typing: on top of the keyboard
    field(app).tap()
    Thread.sleep(forTimeInterval: 0.6)
    check(typing(app), "a tap on it gives it the cursor (and brings the keyboard up)")
    Thread.sleep(forTimeInterval: 0.8)
    let top = keyboardTop(app), f1 = field(app).frame, send1 = button(app, "Send").frame
    check(max(f1.maxY, send1.maxY) <= top && top - max(f1.maxY, send1.maxY) <= 28, "the composer sits right on top of the keyboard", "keyboard at \(top) field \(f1) send \(send1)")
    let card = button(app, "Flip back")
    check(hidden(card) && hidden(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Good'")).firstMatch), "the card steps aside and the grade buttons wait under the keyboard", card.exists ? "card \(card.frame)" : "")
    snap("ask-review-typing")
    let n0 = followUps()
    ask(app, "Why protons?")
    check(answered(app, 1), "Return sends the question, and its answer comes")
    check(questions(app) == ["Why protons?"], "the question shows as a bubble", "\(questions(app))")
    check(answers(app).first == "You asked “Why protons?”. It comes back to Protons.", "its answer is under it, without ** marks", "\(answers(app))")
    check(followUps() == n0 + 1, "the AI was asked once", "\(n0) then \(followUps())")
    check(typing(app), "the composer keeps the cursor (and the keyboard) for the next question")
    let q = questions(app).count
    ask(app, "And the electrons?", button: true)
    check(answered(app, 2) && questions(app).count == q + 1, "Send sends too, and the questions stack in order", "\(questions(app))")
    ask(app, "One more?"); ask(app, "And the last one?")
    check(answered(app, 4) && questions(app) == ["Why protons?", "And the electrons?", "One more?", "And the last one?"], "Pro: four questions in a row, all answered (no daily limit)", "\(questions(app))")
    check(!limitLine(app).exists && field(app).exists, "and the composer is still there")
    noSystemUI(app, "Review while asking")
    snap("ask-review-asked")
    keyboardDown(app)
    check(!typing(app) && wait(button(app, "Flip back")) && abs(button(app, "Flip back").frame.minY - card0.minY) <= 2, "a tap on the words puts the keyboard away, and the card is back where it was", "\(button(app, "Flip back").frame) \(card0)")
    check(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Good'")).firstMatch.isHittable, "and the grade buttons too")
    // closing forgets the questions; opened again, the explanation alone
    tap(button(app, "Close the explanation"), "Close")
    check(gone(explanation(app)), "the explanation closes")
    tap(button(app, "Explain"), "Explain")
    check(wait(explanation(app), 5) && wait(words(app, "Because "), 5) && questions(app).isEmpty, "opened again: the explanation, and no old questions", "\(questions(app))")
    // the next card starts fresh
    ask(app, "Before the next card?")
    check(answered(app, 1), "a question on this card")
    keyboardDown(app)
    tap(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Good'")).firstMatch, "Good")
    check(flip(app) && wait(button(app, "Explain")), "the next card, turned over")
    tap(button(app, "Explain"), "Explain")
    check(wait(words(app, "Because Ribosomes"), 15) && questions(app).isEmpty, "its explanation has no questions from the last card", "\(questions(app))")
  }

  // ---------- 2: Free ----------
  func test2FreeCountsDownToTheUpgradeLine() throws {
    let fay = "freeask" + run
    person(fay, "Fay Free", deck: "Ask Free", cards: [("What does the pump move out of the matrix?", "Protons")])
    let app = launch(as: fay, ["-open", "review"])
    check(flip(app) && wait(button(app, "Explain")), "Free: a card, turned over")
    tap(button(app, "Explain"), "Explain")
    check(wait(words(app, "2 free explanations left today"), 15), "the explanation is the first of three: 2 left")
    ask(app, "Why protons?")
    check(answered(app, 1) && wait(words(app, "1 free explanation left today"), 6), "a question counts one: 1 left")
    ask(app, "And then?")
    check(answered(app, 2), "the last one is answered")
    check(wait(limitLine(app), 6) && words(app, "That’s today’s 3 free explanations").exists && button(app, "Go Pro").exists && !field(app).exists, "then the composer is the upgrade line, with Go Pro")
    check(!words(app, "free explanations left today").exists && !words(app, "0 free").exists, "(and no “0 left” line)")
    noSystemUI(app, "Free's upgrade line")
    snap("ask-free-limit")
    // opened again later: the upgrade line from the start
    app.terminate()
    let again = launch(as: fay, ["-open", "review"])
    check(flip(again) && wait(button(again, "Explain")), "later: the card again")
    tap(button(again, "Explain"), "Explain")
    check(wait(words(again, "Because Protons"), 10) && wait(limitLine(again), 6) && !field(again).exists, "the saved explanation, and the upgrade line in the composer’s place before anything is typed")
  }

  // ---------- 3: the AI fails ----------
  func test3WhenTheAIFails() throws {
    let bob = "bob" + run
    person(bob, "Bob Broken", deck: "Ask Fail", cards: [("What breaks down waste?", "Lysosomes")])
    let app = launch(as: bob, ["-open", "review"])
    check(flip(app) && wait(button(app, "Explain")), "a card, turned over")
    tap(button(app, "Explain"), "Explain")
    check(wait(words(app, "Because Lysosomes"), 15), "its explanation")
    ask(app, "FAILAI why?")
    let err = app.descendants(matching: .any).matching(identifier: "askError").firstMatch
    check(wait(err, 15) && err.label == "The AI didn’t answer. Try again in a moment.", "the AI failing: the question’s answer says so, in the quiet line", err.label)
    noSystemUI(app, "the AI failing")
    ask(app, "And now?")
    check(answered(app, 2) && answers(app).last?.contains("It comes back to Lysosomes") == true, "asking again works", "\(answers(app))")
  }

  // ---------- 4: Learn mode ----------
  func test4AskInLearnMode() throws {
    let lea = "lea" + run
    person(lea, "Lea Learn", deck: "Ask Learn", cards: [("What does the pump move out?", "Protons"), ("What makes ATP?", "ATP synthase"), ("Where is the DNA?", "The nucleus")])
    let app = launch(as: lea, ["-open", "learn", "-fakeKeyboard", "300"])
    check(wait(button(app, "Start learning"), 15), "Learn mode’s start sheet")
    tap(button(app, "Type the answer"), "Type the answer")
    for kind in ["Multiple choice", "Matching", "True or false", "Fill in the blank"] where button(app, kind).exists && button(app, kind).isSelected { button(app, kind).tap() }
    tap(button(app, "Start learning"), "Start learning")
    let box = app.textFields.firstMatch
    if wait(box, 15) { box.tap(); box.typeText("zzz") } else { check(false, "found the answer box") }
    tap(button(app, "Check"), "Check")
    tap(button(app, "Explain"), "Explain")
    check(wait(explanation(app), 15) && wait(words(app, "Because "), 15) && wait(field(app)), "Learn: the explanation, with the composer at its end")
    field(app).tap()
    Thread.sleep(forTimeInterval: 0.6)
    check(typing(app), "a tap on the composer gives it the cursor")
    Thread.sleep(forTimeInterval: 0.8)
    let top = keyboardTop(app), f = field(app).frame
    check(f.maxY <= top && top - f.maxY <= 40 && hidden(button(app, "Next question")), "the composer sits on top of the keyboard, and Next waits under it", "keyboard at \(top) field \(f)")
    snap("ask-learn-typing")
    ask(app, "What is the catch?")
    check(answered(app, 1) && questions(app) == ["What is the catch?"] && answers(app).first?.hasPrefix("You asked “What is the catch?”. It comes back to ") == true, "asking gets an answer under the question", "\(questions(app)) \(answers(app))")
    noSystemUI(app, "Learn while asking")
    keyboardDown(app)
    check(wait(button(app, "Next question")) && button(app, "Next question").isHittable, "the keyboard gone, Next is back")
    tap(button(app, "Close the explanation"), "Close")
    check(gone(explanation(app)), "Learn: the explanation closes")
    tap(button(app, "Explain"), "Explain")
    check(wait(explanation(app), 5) && wait(words(app, "Because "), 5) && questions(app).isEmpty, "closed and opened again: no old questions", "\(questions(app))")
  }

  // ---------- 5: the design screens ----------
  func test5DesignScreens() throws {
    let r = launchBoard("PhoneReviewExplainAsk")
    check(wait(explanation(r)) && wait(field(r)) && questions(r) == ["Why does it need oxygen at the end?"] && answers(r).first?.hasPrefix("Oxygen is the last stop") == true,
          "PhoneReviewExplainAsk: one question asked and answered, and the composer", "\(questions(r)) \(answers(r))")
    ask(r, "Is it the same in plants?")
    check(answered(r, 2) && questions(r).last == "Is it the same in plants?", "on a design screen a question typed gets the sample answer", "\(questions(r))")
    noSystemUI(r, "PhoneReviewExplainAsk")
    r.terminate()
    let l = launchBoard("PhoneQuizAnswered", ["-explainOpen", "true", "-followUp", "true"])
    check(wait(explanation(l)) && wait(field(l)) && questions(l) == ["Where does the energy go instead?"], "PhoneQuizAnswered with -explainOpen -followUp: the question asked and answered", "\(questions(l))")
    l.terminate()
    let ty = launchBoard("PhoneQuizType", ["-explainOpen", "true", "-followUp", "true"])
    check(wait(explanation(ty)) && wait(field(ty)) && questions(ty) == ["Where do the vesicles go next?"], "PhoneQuizType with -explainOpen -followUp", "\(questions(ty))")
    ty.terminate()
    let t = launchBoard("PhoneTest", ["-screen", "Results", "-explainOpen", "true", "-followUp", "true", "-fakeKeyboard", "300"])
    check(wait(explanation(t)) && wait(field(t)) && questions(t) == ["How does it make the ATP?"], "PhoneTest’s results with -explainOpen -followUp: question 3’s explanation, a question and the composer", "\(questions(t))")
    field(t).tap()
    Thread.sleep(forTimeInterval: 1)
    let top = keyboardTop(t), f = field(t).frame
    check(f.maxY <= top && top - f.maxY <= 60, "the test’s composer is brought up on top of the keyboard", "keyboard at \(top) field \(f)")
    noSystemUI(t, "the test's results")
  }
}
