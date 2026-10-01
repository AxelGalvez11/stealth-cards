// Practice tests end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its lc_dev cookie,
// which the debug-only `-dev <name>` launch argument sets). `-testAudit` makes the app tell this test, through an invisible
// element, which answer is right for the question on screen, and `-testSpent <ms>` sets how long the test in progress has been
// open (to check the clock without waiting). The same story as the web app's own test (full/practice/tests/test-ui.mjs), in
// flows that each set up their own people and decks (so any one can run alone):
//   1  The set-up (lengths, kinds, time limit, and no tip lines), taking a test of choices and true-or-false:
//      numbers, going back, flags, the list of questions, Submit asking when some are unanswered, the results (the score, the
//      time, every question), Retake the ones I missed, and the past results on the deck page.
//   2  Written answers (case, accents, a missing "the" and small typos are forgiven; a wrong one offers Count it as right,
//      which is saved), and Study the missed cards now: a real review of those cards, then back to the results.
//   3  Matching: one letter for each word, exact grading, and the pairs that were wrong.
//   4  The clock and leaving: a timed test shows it, a test is open again where it was after the app closed, runs out by itself
//      ("The time ran out."), and leaving asks first.
//   5  A folder: a Practice test over all its decks, and how the last one went on the folder's page.
//   6  Fill in the blank (a fill-in-the-blank card asked as a blank).
// Every test leaves the cards' schedules alone and logs no review.
//
// Run it with ios/tools/e2e-test.sh (it starts a fresh server on port 3947). It only runs when LUCIDA_PRACTICE is set, so
// ios/tools/e2e.sh keeps running the study network's checks alone.
import XCTest

final class PracticeTestTests: XCTestCase {
  static let server = ProcessInfo.processInfo.environment["LUCIDA_SERVER"] ?? "http://127.0.0.1:3947"
  private static var passed = 0, failed = 0
  // A run's own people (lc_dev names are letters and numbers), so the test can run again on the same server.
  private let run = String(Int(Date().timeIntervalSince1970) % 100000, radix: 36)

  override func setUpWithError() throws {
    continueAfterFailure = true
    try XCTSkipUnless(ProcessInfo.processInfo.environment["LUCIDA_PRACTICE"] != nil, "Run with ios/tools/e2e-test.sh")
  }
  override class func tearDown() { print("Practice test: \(passed) passed, \(failed) failed") }

  // ---------- helpers ----------
  private func check(_ ok: Bool, _ name: String) {
    if ok { Self.passed += 1; print("  ok   " + name) }
    else { Self.failed += 1; print("  FAIL " + name); XCTFail(name); snap("practice-fail-\(Self.failed)") }
  }
  /// A picture of what's on screen (when asked for with SHOTS=<folder>).
  private func snap(_ name: String) {
    guard let dir = ProcessInfo.processInfo.environment["SHOTS"] else { return }
    try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir + "/" + name + ".png"))
  }
  /// Taps something once it's there; if it never is, that's a failed check (a missing element would end the whole test).
  private func tap(_ e: XCUIElement, _ what: String = "") {
    if e.waitForExistence(timeout: 12) { e.tap() } else { check(false, "found " + (what.isEmpty ? e.description : what) + " to tap") }
  }
  /// A request as one of the made-up people; the answer's JSON.
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
  private func state(_ who: String) -> [String: Any] { api(who, "GET", "/api/state").json as? [String: Any] ?? [:] }
  /// Waits for a condition on the server (a save that goes out a moment after a tap).
  private func eventually(_ s: TimeInterval = 12, _ cond: () -> Bool) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if cond() { return true }; Thread.sleep(forTimeInterval: 0.4) }
    return cond()
  }
  /// The cards' schedules as the server has them (a test must leave them alone), and how many reviews are logged.
  private func schedule(_ who: String) -> String {
    (state(who)["cards"] as? [[String: Any]] ?? []).map { c -> String in
      let s = (try? JSONSerialization.data(withJSONObject: c["srs"] ?? [:], options: [.sortedKeys])).flatMap { String(data: $0, encoding: .utf8) } ?? ""
      return (c["id"] as? String ?? "") + s
    }.sorted().joined()
  }
  private func logs(_ who: String) -> Int { (state(who)["logs"] as? [Any])?.count ?? 0 }
  private func tests(_ who: String) -> [[String: Any]] { state(who)["tests"] as? [[String: Any]] ?? [] }

  private func launch(as who: String, _ extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-server", Self.server, "-dev", who, "-testAudit"] + extra
    app.launch()
    return app
  }
  /// Anything on screen whose label has these words.
  private func any(_ app: XCUIApplication, _ words: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch
  }
  private func button(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.buttons[label].firstMatch }
  private func buttonStarting(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", words)).firstMatch }
  private func text(_ app: XCUIApplication, _ label: String) -> XCUIElement { app.staticTexts[label].firstMatch }
  private func count(_ app: XCUIApplication, _ label: String) -> Int { app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).count }
  private func wait(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool { e.waitForExistence(timeout: s) }
  private func gone(_ e: XCUIElement, _ s: TimeInterval = 12) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if !e.exists { return true }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  /// True when the element never shows up in `s` seconds.
  private func neverShows(_ e: XCUIElement, _ s: TimeInterval = 3) -> Bool {
    let end = Date().addingTimeInterval(s)
    while Date() < end { if e.exists { return false }; Thread.sleep(forTimeInterval: 0.25) }
    return !e.exists
  }
  private func matches(_ s: String, _ pattern: String) -> Bool { s.range(of: pattern, options: .regularExpression) != nil }

  /// What the app says about the test on screen (TestAudit): the question's kind, its right answer, and so on.
  private func audit(_ app: XCUIApplication) -> [String: Any] {
    let e = app.descendants(matching: .any)["testAudit"].firstMatch
    guard e.waitForExistence(timeout: 8), let v = e.value as? String, let j = (try? JSONSerialization.jsonObject(with: Data(v.utf8))) as? [String: Any] else { return [:] }
    return j
  }
  /// The audit once the question (or the phase) has changed from `was` (the app takes a moment to draw the next question).
  private func auditAfter(_ app: XCUIApplication, _ was: [String: Any]) -> [String: Any] {
    let end = Date().addingTimeInterval(8)
    while Date() < end {
      let a = audit(app)
      if (a["at"] as? Int) != (was["at"] as? Int) || (a["phase"] as? String) != (was["phase"] as? String) { return a }
      Thread.sleep(forTimeInterval: 0.2)
    }
    return audit(app)
  }
  /// "3 of 10": where the test is.
  private func position(_ app: XCUIApplication) -> String { (app.buttons["All the questions"].firstMatch.value as? String) ?? "" }
  private func clock(_ app: XCUIApplication) -> String { (app.descendants(matching: .any)["Time left"].firstMatch.value as? String) ?? "" }

  /// A deck of facts (front, back): its id.
  @discardableResult
  private func deck(_ who: String, _ name: String, _ facts: [(String, String)], folder: String? = nil) -> String {
    var o: [String: Any] = ["name": name]
    if let folder { o["folder"] = folder }
    let id = act(who, "deck.add", o)["id"] as? String ?? ""
    for (f, b) in facts { act(who, "card.add", ["deckId": id, "kind": "basic", "front": f, "back": b]) }
    return id
  }
  private let capitals: [(String, String)] = [("France", "Paris"), ("Spain", "Madrid"), ("Italy", "Rome"), ("Japan", "Tokyo"), ("Egypt", "Cairo"), ("Peru", "Lima"),
                                              ("Kenya", "Nairobi"), ("Chile", "Santiago"), ("Norway", "Oslo"), ("Greece", "Athens"), ("Cuba", "Havana"), ("Austria", "Vienna")]
    .map { ("Capital of " + $0.0, $0.1) }

  /// Opens the page of the deck of this name.
  private func openDeck(_ who: String, _ name: String, _ extra: [String] = []) -> XCUIApplication {
    let app = launch(as: who, ["-open", "deck:" + name] + extra)
    check(wait(buttonStarting(app, "Flashcards")), "the page of " + name + " is open")
    return app
  }
  /// Practice test, the kinds in `off` turned off, a length and a time limit picked, then Start test.
  private func start(_ app: XCUIApplication, count: String? = nil, off: [String] = [], limit: String? = nil) {
    tap(button(app, "Practice test"), "Practice test")
    check(wait(button(app, "Start test")), "the set-up is open")
    for k in off { tap(button(app, k), k) }
    if let count { tap(button(app, count), count) }
    if let limit { tap(button(app, limit), limit) }
    tap(button(app, "Start test"), "Start test")
  }
  /// Answers the question on screen right, or wrong (`right: false`), or with a typed word. (Matching: a wrong answer swaps the
  /// first two words' letters.)
  private func answer(_ app: XCUIApplication, right: Bool = true, typed: String? = nil) {
    let a = audit(app), type = a["type"] as? String ?? ""
    if a.isEmpty { check(false, "the test told which question is on screen"); return }
    if type == "choice" {
      let opts = a["options"] as? [String] ?? [], r = a["right"] as? Int ?? 0
      let pick = right ? r : (opts.indices.first { $0 != r } ?? 0)
      if pick < opts.count { tap(app.buttons[opts[pick]].firstMatch, opts[pick]) }
    } else if type == "type" {
      let f = app.textFields["Your answer"].firstMatch
      if wait(f) { f.tap(); f.typeText(typed ?? (right ? (a["answer"] as? String ?? "") : "zzz")) }
    } else if type == "match" {
      let terms = a["terms"] as? [[String: String]] ?? []
      for (i, t) in terms.enumerated() {
        var letter = t["letter"] ?? "A"
        if !right, terms.count > 1, i < 2 { letter = terms[1 - i]["letter"] ?? letter }
        tap(button(app, "Answer \(letter) for \(t["label"] ?? "")"), "Answer \(letter) for \(t["label"] ?? "")")
      }
    }
  }
  /// Answers the question on screen, then Next; waits for the next question to be drawn.
  private func answerAndNext(_ app: XCUIApplication, right: Bool = true, typed: String? = nil) {
    let was = audit(app)
    answer(app, right: right, typed: typed)
    tap(button(app, "Next"), "Next")
    _ = auditAfter(app, was)
  }
  private func openList(_ app: XCUIApplication) {
    tap(app.buttons["All the questions"].firstMatch, "the list of questions")
    check(wait(text(app, "Questions")), "the list of questions opens")
  }
  /// The list of questions, and a number in it.
  private func jump(_ app: XCUIApplication, _ label: String) {
    openList(app)
    tap(button(app, label), label)
    _ = gone(text(app, "Questions"))
  }

  // ---------- 1: set up, take, submit, results, retake, past results ----------
  func test1TakeATest() throws {
    let who = "pta" + run, name = "Capitals " + run
    deck(who, name, capitals)
    let before = schedule(who), logsBefore = logs(who)
    var app = openDeck(who, name)
    check(button(app, "Practice test").exists && button(app, "Learn").exists, "the deck page has Practice test next to Learn")
    check(!any(app, "Practice tests").exists, "with no tests taken there is no list of past results")
    tap(button(app, "Practice test"), "Practice test")
    check(wait(button(app, "Start test")), "Practice test opens the set-up")
    check(button(app, "10").exists && button(app, "All · 12").exists && !button(app, "20").exists, "lengths: 10 and All with its number (12 cards, so no 20 or 30)")
    check(!any(app, "Tests don’t change your review schedule.").exists && !any(app, "Answer questions from " + name + ", then see how you did.").exists, "no tip lines on the set-up (the owner: no tips)")
    check(["Multiple choice", "True or false", "Written", "Matching", "Fill in the blank"].allSatisfy { button(app, $0).exists && button(app, $0).isSelected }, "all five kinds are on to begin with")
    check(["Off", "10 min", "20 min", "30 min"].allSatisfy { button(app, $0).exists }, "time limit: Off, 10, 20 or 30 minutes")
    for k in ["Written", "Matching", "Fill in the blank", "True or false"] { tap(button(app, k), k) }
    check(!button(app, "Written").isSelected && button(app, "Multiple choice").isSelected, "a kind can be turned off")
    tap(button(app, "Multiple choice"), "Multiple choice")
    check(button(app, "Multiple choice").isSelected, "the last kind can’t be turned off")
    tap(button(app, "True or false"), "True or false")
    tap(button(app, "10"), "10")
    tap(button(app, "Start test"), "Start test")
    check(wait(app.buttons["All the questions"].firstMatch), "Start opens the test")
    check(position(app) == "1 of 10", "numbered: “1 of 10”")
    check(!any(app, "Right answer").exists && !any(app, "Your score").exists, "no score and no right or wrong while taking it")
    check(!any(app, "Time left").exists, "and no clock when there is no time limit")
    var a = audit(app)
    check(a["phase"] as? String == "taking" && a["n"] as? Int == 10 && ["mc", "tf"].contains(a["kind"] as? String ?? ""), "10 questions, of the kinds chosen")
    let first = a, firstRight = (a["options"] as? [String] ?? [])[a["right"] as? Int ?? 0]
    answer(app)
    check(button(app, firstRight).isSelected, "picking an answer marks it")
    tap(button(app, "Next"), "Next")
    a = auditAfter(app, first)
    check(position(app) == "2 of 10" && button(app, "Previous question").exists, "Next goes to question 2, and there is a way back")
    tap(button(app, "Previous question"), "Previous question")
    check(wait(app.buttons["All the questions"].firstMatch) && position(app) == "1 of 10" && button(app, firstRight).isSelected, "Back returns to 1, with its answer kept")
    tap(button(app, "Flag"), "Flag")
    check(wait(button(app, "Flagged")), "Flag marks the question")
    openList(app)
    check(wait(button(app, "Question 1, answered, flagged")) && button(app, "Question 2, not answered").exists, "the list says which are answered and flagged")
    check(any(app, "1 answered · 1 flagged").exists, "with how many are answered and flagged")
    tap(button(app, "Question 7, not answered"), "Question 7")
    check(gone(text(app, "Questions")) && position(app) == "7 of 10", "a number jumps to that question and closes the list")
    jump(app, "Question 1, answered, flagged")
    check(position(app) == "1 of 10", "and back to 1")
    // 1 is right already; 2, 3, 4, 6 and 7 right; 5 and 9 left alone; 8 and 10 wrong. So 6 right, and 2 not answered.
    for n in 1...10 {
      let was = audit(app)
      switch n {
      case 5, 9: break
      case 8, 10: answer(app, right: false)
      case 1: break
      default: answer(app)
      }
      if n < 10 { tap(button(app, "Next"), "Next"); _ = auditAfter(app, was) }
    }
    check(position(app) == "10 of 10" && button(app, "Submit").exists && !button(app, "Next").exists, "on the last question the button says Submit")
    tap(button(app, "Submit"), "Submit")
    check(wait(text(app, "Submit your test?")) && any(app, "You haven’t answered 2 questions.").exists, "Submit with some unanswered asks first, and says how many")
    check(any(app, "1 is flagged.").exists, "and how many are flagged")
    snap("practice-submit-asks")
    tap(button(app, "Keep going"), "Keep going")
    check(gone(text(app, "Submit your test?")) && audit(app)["phase"] as? String == "taking", "Keep going goes back to the test")
    // Answer the two that were left, right: 8 of 10. With every question answered, Submit goes straight through.
    jump(app, "Question 5, not answered"); answer(app)
    jump(app, "Question 9, not answered"); answer(app)
    jump(app, "Question 10, answered")
    check(position(app) == "10 of 10", "back on the last question")
    tap(button(app, "Submit"), "Submit")
    check(wait(text(app, "Your score")), "with every question answered, Submit goes straight to the results")
    let r = audit(app)
    check(r["phase"] as? String == "results" && r["right"] as? Int == 8 && r["pct"] as? Int == 80, "the score: 8 of 10, 80%")
    check(text(app, "80%").exists && any(app, "8 of 10").exists, "shown as a percent and “8 of 10”")
    check(app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "[0-9]+:[0-9][0-9]")).count >= 1, "and the time taken")
    check((1...10).allSatisfy { app.descendants(matching: .any)["testRow\($0)"].exists }, "every question is listed, with the answer given and the right one")
    check(button(app, "Retake the ones I missed").exists && button(app, "Study the missed cards now").exists, "Retake the ones I missed, and Study the missed cards now")
    snap("practice-results")
    check(eventually { tests(who).count == 1 && tests(who).first?["right"] as? Int == 8 }, "the result is saved with the library")
    check(schedule(who) == before && logs(who) == logsBefore, "the test changed no card’s schedule and logged no review")
    tap(button(app, "Missed 2"), "Missed 2")
    check(gone(app.descendants(matching: .any)["testRow1"], 4) && app.descendants(matching: .any)["testRow8"].exists, "Missed shows only the missed questions")
    tap(button(app, "Retake the ones I missed"), "Retake the ones I missed")
    check(wait(app.buttons["All the questions"].firstMatch) && position(app) == "1 of 2", "a new test of just those two")
    answerAndNext(app)
    answer(app)
    tap(button(app, "Submit"), "Submit")
    check(wait(text(app, "Your score")) && text(app, "100%").exists && any(app, "2 of 2").exists, "right this time: 100%, 2 of 2")
    check(!button(app, "Retake the ones I missed").exists && any(app, "Every question was right.").exists, "with nothing missed there is nothing to retake")
    check(eventually { tests(who).count == 2 }, "the retake is its own saved result")
    tap(button(app, "Done"), "Done")
    check(wait(any(app, "Practice tests")), "Done goes back to the deck, and its page lists past results")
    check(any(app, "2 of 2").exists && any(app, "8 of 10").exists && any(app, "100%").exists, "as dates and scores")
    snap("practice-deck-past")
    check(schedule(who) == before && logs(who) == logsBefore, "still no change to any schedule")
    app.terminate()
    app = openDeck(who, name)
    check(wait(any(app, "Practice tests")) && neverShows(app.buttons["All the questions"].firstMatch, 2), "after the app closes and opens again, no test is open and the past results are still there")
  }

  // ---------- 2: written answers, Count it as right, Study the missed cards ----------
  func test2Written() throws {
    let who = "ptw" + run, name = "Typos " + run
    deck(who, name, [("Capital of France", "Paris"), ("Capital of Spain", "Madrid"), ("Café in French", "café"), ("Largest ocean", "The Pacific Ocean"),
                     ("Longest river", "Amazon river"), ("Short one", "Cat"), ("Tallest", "Mount Everest"), ("Largest planet", "Jupiter")])
    let before = schedule(who)
    let app = openDeck(who, name)
    start(app, count: "All · 8", off: ["Multiple choice", "True or false", "Matching", "Fill in the blank"])
    check(wait(app.buttons["All the questions"].firstMatch) && position(app) == "1 of 8", "a written test of all 8 cards")
    check(audit(app)["type"] as? String == "type" && wait(app.textFields["Your answer"].firstMatch), "each question has a box to write in")
    let say = ["Capital of France": "PARIS", "Capital of Spain": "madrod", "Café in French": "cafe", "Largest ocean": "pacific ocean", "Longest river": "amazon",
               "Short one": "cut", "Tallest": "mount everst", "Largest planet": "jupiter"]
    for n in 1...8 {
      let was = audit(app), q = was["text"] as? String ?? ""
      answer(app, typed: say[q] ?? "?")
      if n == 1 { snap("practice-typing"); check(button(app, "Next").isHittable, "with the keyboard up, Next is still there to tap") }
      if n < 8 { tap(button(app, "Next"), "Next"); _ = auditAfter(app, was) }
    }
    tap(button(app, "Submit"), "Submit")
    check(wait(text(app, "Your score")), "all answered: Submit goes straight to the results")
    check(audit(app)["right"] as? Int == 6 && text(app, "75%").exists && any(app, "6 of 8").exists,
          "written answers forgive case, accents, a missing “the” and a small typo, but not a different word or half an answer: 6 of 8, 75%")
    let counts = app.buttons.matching(NSPredicate(format: "label == %@", "Count it as right"))
    check(counts.count == 2, "each wrong written answer offers Count it as right")
    snap("practice-written-results")
    tap(counts.firstMatch, "Count it as right")
    check(wait(text(app, "88%")) && any(app, "7 of 8").exists && counts.count == 1, "counted: 7 of 8, 88%, and one fewer button")
    check(eventually { (tests(who).first?["right"] as? Int) == 7 && (tests(who).first?["pct"] as? Int) == 88 }, "and it is saved that way")
    check(schedule(who) == before, "still no change to any schedule")
    // Study the missed card: a real review of just that one.
    let logsBefore = logs(who)
    tap(button(app, "Study the missed cards now"), "Study the missed cards now")
    check(wait(button(app, "Flip card")), "it opens a review of just the missed card")
    if wait(button(app, "Flip card")) { button(app, "Flip card").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.08)).tap() }
    let good = buttonStarting(app, "Good")
    check(wait(good), "the card turns over to the grades")
    tap(good, "Good")
    check(eventually { logs(who) == logsBefore + 1 }, "grading there is a normal review: it logs the grade")
    tap(button(app, "Done"), "Done")
    check(wait(text(app, "Your score")) && text(app, "88%").exists, "the review’s Done goes back to the test’s results")
    tap(button(app, "Done"), "Done")
    check(wait(any(app, "Practice tests")), "and Done there goes back to the deck")
  }

  // ---------- 3: matching ----------
  func test3Matching() throws {
    let who = "ptm" + run, name = "Matching " + run
    deck(who, name, [("Mitochondrion", "Makes ATP"), ("Ribosome", "Builds proteins"), ("Golgi", "Ships proteins"), ("Nucleus", "Holds DNA"), ("Lysosome", "Breaks down waste"),
                     ("Vacuole", "Stores water"), ("Chloroplast", "Makes sugar"), ("Membrane", "Outer layer")])
    let app = openDeck(who, name)
    start(app, count: "All · 2", off: ["Multiple choice", "True or false", "Written", "Fill in the blank"])
    check(wait(app.buttons["All the questions"].firstMatch), "a test of matching alone starts")
    var a = audit(app)
    let n = a["n"] as? Int ?? 0
    check(a["kind"] as? String == "match" && (a["terms"] as? [[String: String]] ?? []).count >= 4, "its question has four or five words, each with a letter to pick")
    check(n == 2, "matching alone makes groups of its own (8 cards, 2 questions)")
    check(any(app, "Answers").exists, "the answers are listed with their letters")
    // The first question right, the second with two letters swapped.
    for i in 1...n {
      a = audit(app)
      answer(app, right: i == 1)
      if i < n { tap(button(app, "Next"), "Next"); _ = auditAfter(app, a) }
    }
    tap(button(app, "Submit"), "Submit")
    check(wait(text(app, "Your score")), "Submit shows the results")
    let r = audit(app)
    check(r["right"] as? Int == n - 1 && text(app, "50%").exists, "a matching question is exact: right only when every pair is (\(r["right"] ?? "?") of \(n))")
    check(any(app, "Right answer:").exists, "the question with two pairs swapped says which pairs were wrong, with the right answers")
    check(eventually { (((tests(who).first?["items"] as? [[String: Any]])?.first?["pairs"] as? [Any])?.count ?? 0) >= 4 }, "the saved result keeps the pairs")
  }

  // ---------- 4: the clock, a test open again after the app closed, and leaving ----------
  func test4ClockAndLeave() throws {
    let who = "ptc" + run, name = "Clock " + run
    deck(who, name, capitals)
    var app = openDeck(who, name)
    start(app, count: "10", off: ["Written", "Matching", "Fill in the blank"], limit: "10 min")
    check(wait(app.buttons["All the questions"].firstMatch), "a 10 minute test starts")
    check(wait(app.descendants(matching: .any)["Time left"].firstMatch) && matches(clock(app), "^(10:00|9:[0-5][0-9])$"), "a quiet clock counts down from 10:00 (\(clock(app)))")
    answerAndNext(app)
    let second = audit(app), rightLabel = (second["options"] as? [String] ?? [])[second["right"] as? Int ?? 0]
    answer(app)
    check(position(app) == "2 of 10" && button(app, rightLabel).isSelected, "two questions in, the second answered")
    // The app closes and opens again, 8 minutes in: the test is open where it was, with 2 minutes left.
    app.terminate()
    app = launch(as: who, ["-testSpent", "480000"])
    check(wait(app.buttons["All the questions"].firstMatch), "after the app closes and opens again, the test is open")
    check(position(app) == "2 of 10" && button(app, rightLabel).isSelected, "on the same question, with its answer")
    check(matches(clock(app), "^(2:00|1:[0-5][0-9]|0:[0-5][0-9])$"), "and its clock, with about 2 minutes left (\(clock(app)))")
    snap("practice-clock-low")
    // And with a second left, it runs out by itself.
    app.terminate()
    app = launch(as: who, ["-testSpent", "599000"])
    check(wait(text(app, "Your score"), 30), "when the time runs out the test is submitted by itself")
    check(any(app, "The time ran out.").exists && text(app, "10:00").exists, "with “The time ran out.” and the full 10:00")
    check(eventually { tests(who).count == 1 && (tests(who).first?["timeUp"] as? Bool) == true && (tests(who).first?["limit"] as? Int) == 10 }, "and the result is saved as timed out")
    tap(button(app, "Done"), "Done")
    check(wait(buttonStarting(app, "Flashcards")) && wait(any(app, "Practice tests")), "Done goes back to the deck")
    // Leaving asks first.
    start(app, count: "10", off: ["Written", "Matching", "Fill in the blank"])
    check(wait(app.buttons["All the questions"].firstMatch), "a test to leave")
    answer(app)
    tap(button(app, "Leave the test"), "Leave the test")
    check(wait(text(app, "Leave this test?")) && any(app, "Your answers won’t be saved.").exists, "X asks before leaving")
    tap(button(app, "Keep going"), "Keep going")
    check(gone(text(app, "Leave this test?")) && audit(app)["phase"] as? String == "taking", "Keep going stays in the test")
    tap(button(app, "Leave the test"), "Leave the test")
    check(wait(text(app, "Leave this test?")), "X asks again")
    tap(button(app, "Leave"), "Leave")
    check(wait(buttonStarting(app, "Flashcards")) && neverShows(app.buttons["All the questions"].firstMatch, 2), "Leave goes back to the deck")
    check(tests(who).count == 1, "a test that was left isn’t saved (only the one that ran out is)")
    app.terminate()
    app = launch(as: who)
    check(wait(button(app, "Library")) && neverShows(app.buttons["All the questions"].firstMatch, 4), "and it isn’t open again when the app opens")
  }

  // ---------- 5: a folder ----------
  func test5Folder() throws {
    let who = "ptf" + run, fname = "Science " + run
    let folder = act(who, "folder.add", ["name": fname])["id"] as? String ?? ""
    deck(who, "Geography " + run, capitals, folder: folder)
    deck(who, "Chemistry " + run, [("Symbol for water", "H2O"), ("Symbol for salt", "NaCl"), ("Symbol for gold", "Au"), ("Symbol for iron", "Fe")], folder: folder)
    var app = launch(as: who, ["-open", "folder:" + fname])
    check(wait(button(app, "Practice test")), "a folder’s page has a Practice test button")
    check(!any(app, "Last practice test").exists, "and no line about a last test yet")
    tap(button(app, "Practice test"), "Practice test")
    check(wait(button(app, "Start test")) && button(app, "All · 16").exists, "it is a test of all its decks (12 + 4 cards)")
    for k in ["Written", "Matching", "Fill in the blank"] { tap(button(app, k), k) }
    tap(button(app, "All · 16"), "All")
    tap(button(app, "Start test"), "Start test")
    check(wait(app.buttons["All the questions"].firstMatch) && position(app) == "1 of 16", "Start opens the test: 16 questions")
    for _ in 1...15 { answerAndNext(app) }
    answer(app)
    tap(button(app, "Submit"), "Submit")
    check(wait(text(app, "Your score")) && text(app, "100%").exists && any(app, "16 of 16").exists, "every answer right: 16 of 16, 100%")
    check(eventually { tests(who).first?["folderId"] as? String == folder && (tests(who).first?["name"] as? String) == fname }, "the result is saved with the folder")
    tap(button(app, "Done"), "Done")
    check(wait(any(app, "Last practice test:")) && any(app, "16 of 16").exists && any(app, "100%").exists, "Done goes back to the folder, which says how the last test went")
    app.terminate()
    app = launch(as: who, ["-open", "folder:" + fname])
    check(wait(any(app, "Last practice test:")), "and it still does after the app opens again")
  }

  // ---------- 6: fill in the blank ----------
  func test6Blank() throws {
    let who = "ptb" + run, name = "Blanks " + run
    let id = act(who, "deck.add", ["name": name])["id"] as? String ?? ""
    for t in ["The [[mitochondrion]] is the powerhouse of the cell.", "DNA is copied in the [[nucleus]].", "The [[ribosome]] builds proteins.", "The [[Golgi apparatus]] ships proteins out.", "[[Lysosomes]] break down waste."] {
      act(who, "card.add", ["deckId": id, "kind": "cloze", "text": t, "clozeMode": "each"])
    }
    let app = openDeck(who, name)
    start(app, count: "All · 5", off: ["Multiple choice", "True or false", "Written", "Matching"])
    check(wait(app.buttons["All the questions"].firstMatch) && position(app) == "1 of 5", "a test of fill in the blank asks the five blank cards")
    let a = audit(app)
    check(a["kind"] as? String == "blank" && (a["text"] as? String ?? "").contains("____"), "each is a blank question, with its blank in the words")
    check(text(app, "Fill in the blank").exists, "labelled Fill in the blank")
    for _ in 1...4 { answerAndNext(app) }
    answer(app)
    tap(button(app, "Submit"), "Submit")
    check(wait(text(app, "Your score")) && text(app, "100%").exists, "all five right: 100%")
  }
}
