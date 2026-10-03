// Debug builds only: `-check <name>` runs one end-to-end check of the Pro study tools against the server the app is pointed
// at (`-server`), through the app's own code (the same calls the screens make), prints "CHECK <name> PASS" or "FAIL …" for
// each thing it looks at, and quits. The checks change the library they run on: use a copy of the server's data.
#if DEBUG
import SwiftUI

@MainActor
enum DebugChecks {
  static var requested: String? { Board.arg("-check") }
  static var lines: [String] = []

  static func say(_ ok: Bool, _ what: String, _ detail: String = "") {
    let line = "CHECK \(ok ? "PASS" : "FAIL") \(what)" + (detail.isEmpty ? "" : " (\(detail))")
    print(line); lines.append(line)
  }
  /// The server's own copy of the library (not the app's).
  static func server(_ s: Store) async -> Library? { try? await s.api.state() }
  /// Waits (up to `secs`) for the server's copy to satisfy `ok`.
  static func until(_ s: Store, _ secs: Double = 8, _ ok: (Library) -> Bool) async -> Library? {
    let end = Date().addingTimeInterval(secs)
    while Date() < end {
      if let l = await server(s), ok(l) { return l }
      try? await Task.sleep(nanoseconds: 200_000_000)
    }
    return await server(s)
  }
  static func iso(_ day: Double) -> String { Store.examIso(Date(timeIntervalSince1970: day / 1000)) }
  /// The message the app shows when a change is turned away (the first one within `secs`; the alert clears it soon after).
  static func error(_ s: Store, _ secs: Double = 4) async -> String {
    let end = Date().addingTimeInterval(secs)
    while Date() < end { if let e = s.error { s.error = nil; try? await Task.sleep(nanoseconds: 1_200_000_000); return e }; try? await Task.sleep(nanoseconds: 40_000_000) }
    return ""
  }

  static func run(_ name: String, _ s: Store) async {
    switch name {
    case "pause": await pause(s)
    case "exam": await exam(s)
    case "grade": await grade(s)
    case "learn": await learn(s)
    case "tune": await tune(s)
    case "free": await free(s)
    case "all": for n in ["pause", "exam", "grade", "learn", "tune"] { await run(n, s) }
    default: say(false, "unknown check " + name)
    }
    if name != "all" { print("CHECKS DONE \(lines.filter { $0.contains("PASS") }.count) passed, \(lines.filter { $0.contains("FAIL") }.count) failed") }
    if name != "all" { try? await Task.sleep(nanoseconds: 300_000_000); exit(0) }
  }

  /// Pausing a card: it leaves the queue and the due counts; unpausing brings it back.
  static func pause(_ s: Store) async {
    let E = s.engine
    guard let first = E.queue(nil).first(where: { $0.lane == "rev" }) else { say(false, "pause: a due card to pause"); return }
    let id = first.card.id, due = E.today.due, deckDue = E.stat(first.deck).due
    say(E.queue(nil).contains { $0.card.id == id }, "pause: the card is in the queue before")
    s.pauseCards([id], true)
    let l = await until(s) { $0.cards.first { $0.id == id }?.paused == true }
    say(l?.cards.first { $0.id == id }?.paused == true, "pause: the server has the card paused")
    let E2 = s.engine
    say(!E2.queue(nil).contains { $0.card.id == id }, "pause: the card leaves the queue")
    say(E2.today.due == due - 1, "pause: the cards due go down by one", "\(due) to \(E2.today.due)")
    say(E2.stat(first.deck).due == deckDue - 1, "pause: the deck's count goes down by one")
    say(E2.nextLabel(s.lib.cards.first { $0.id == id }!) == "Paused", "pause: the card reads Paused")
    say(!E2.forecast(30, s.lib.decks).vals.isEmpty, "pause: forecasts still work")
    // Its whole group (a text's blanks) pauses together.
    s.pauseCards([id], false)
    _ = await until(s) { $0.cards.first { $0.id == id }?.paused != true }
    let E3 = s.engine
    say(E3.queue(nil).contains { $0.card.id == id }, "pause: unpausing brings it back")
    say(E3.today.due == due, "pause: and the count is what it was")
  }

  /// An exam date: cards you'd forget by then come up early; taking the date off puts things back.
  static func exam(_ s: Store) async {
    let E = s.engine
    guard let d = E.S.decks.first(where: { ($0.exam ?? "").isEmpty && Sched.scheduled($0) && E.cards(of: $0.id).contains { $0.srs.state == "review" } }) else { say(false, "exam: a deck without an exam"); return }
    let before = E.stat(d), queueBefore = E.queue(d.id).count, forecastBefore = E.forecast(7, [d]).vals
    let day = iso(dayAt(nowMs(), 7))
    s.setExam(d.id, day)
    let l = await until(s) { $0.decks.first { $0.id == d.id }?.exam == day }
    say(l?.decks.first { $0.id == d.id }?.exam == day, "exam: the server has the date", day)
    let E2 = s.engine, after = E2.stat(E2.deck(d.id)!)
    say(after.exam != nil, "exam: the deck has an exam line", after.exam?.line ?? "")
    say(after.due > before.due, "exam: more cards come up early", "\(before.due) to \(after.due)")
    say(E2.queue(d.id).count > queueBefore, "exam: and they're in the queue", "\(queueBefore) to \(E2.queue(d.id).count)")
    say(E2.forecast(7, [E2.deck(d.id)!]).vals != forecastBefore || after.due > before.due, "exam: the forecast moves")
    // The Pro settings on the deck round-trip.
    s.updateDeck(d.id, ["leechAt": 12, "leechAct": "pause"])
    let l2 = await until(s) { $0.decks.first { $0.id == d.id }?.leechAt == 12 }
    say(l2?.decks.first { $0.id == d.id }?.leechAt == 12 && l2?.decks.first { $0.id == d.id }?.leechAct == "pause", "exam: the leech rule is saved")
    s.updateDeck(d.id, ["leechAt": 8, "leechAct": "tag"])
    s.setExam(d.id, nil)
    let l3 = await until(s) { ($0.decks.first { $0.id == d.id }?.exam ?? "").isEmpty && $0.decks.first { $0.id == d.id }?.leechAt == 8 }
    say((l3?.decks.first { $0.id == d.id }?.exam ?? "").isEmpty, "exam: taking the date off works")
    let E3 = s.engine
    say(E3.stat(E3.deck(d.id)!).due == before.due, "exam: and the count is what it was", "\(E3.stat(E3.deck(d.id)!).due)")
    // A date that isn't a day is turned away by the server, with its message.
    s.setExam(d.id, "not a day")
    let bad = await error(s)
    say(!bad.isEmpty, "exam: a date that isn't one is turned away", bad)
  }

  /// A grade sends how long the card was on screen.
  static func grade(_ s: Store) async {
    guard let first = s.engine.queue(nil).first else { say(false, "grade: a card to grade"); return }
    let id = first.card.id, logsBefore = (await server(s))?.logs.count ?? 0
    s.startReview(nil)
    _ = s.review(nil, pile: nil)            // the card comes up
    try? await Task.sleep(nanoseconds: 1_600_000_000)
    s.grade(id, 3)
    let l = await until(s) { $0.logs.count > logsBefore }
    let log = l?.logs.last
    say(log?.cardId == id && log?.rating == 3, "grade: the server logged the grade")
    say((log?.ms ?? 0) >= 1500 && (log?.ms ?? 0) < 4000, "grade: with how long the card was on screen", "ms \(Int(log?.ms ?? -1))")
    // A slow answer is capped at three minutes by the server; a second grade of another card gets its own time.
    guard let second = s.engine.queue(nil).first(where: { $0.card.id != id }) else { return }
    _ = s.review(nil, pile: nil)
    try? await Task.sleep(nanoseconds: 700_000_000)
    s.grade(second.card.id, 2)
    let l2 = await until(s) { $0.logs.count > logsBefore + 1 }
    let log2 = l2?.logs.last
    say(log2?.cardId == second.card.id && (log2?.ms ?? 0) >= 600 && (log2?.ms ?? 0) < 3000, "grade: the next card has its own time", "ms \(Int(log2?.ms ?? -1))")
  }

  /// Learn mode's answers are logged (with a time, the kind of question, and right or wrong).
  static func learn(_ s: Store) async {
    guard let d = s.lib.decks.first(where: { s.engine.cards(of: $0.id).filter(s.learnable).count >= 6 }) else { say(false, "learn: a deck to learn"); return }
    let learnBefore = (await server(s))?.logs.filter { $0.kind == "learn" }.count ?? 0
    say(s.startLearn(d.id, set: "all", kinds: ["mc", "tf", "type"]), "learn: a session starts (free for everyone)")
    var answered = 0
    for _ in 0..<4 {
      guard let v = s.learnView(), !v.done else { break }
      try? await Task.sleep(nanoseconds: 700_000_000)
      if v.type == "match" { continue }
      if v.type == "type" { s.learnType(v.answer) } else { s.learnAnswer(v.right) }
      answered += 1
      try? await Task.sleep(nanoseconds: 200_000_000)
      s.learnNext()
    }
    let l = await until(s) { $0.logs.filter { $0.kind == "learn" }.count >= learnBefore + answered - 1 }
    let mine = (l?.logs ?? []).filter { $0.kind == "learn" }.suffix(max(1, answered - 1))
    say(mine.count >= 1 && mine.allSatisfy { $0.ok == true }, "learn: right answers are logged as right", "\(mine.count) logged of \(answered)")
    say(mine.allSatisfy { ($0.ms ?? 0) >= 500 }, "learn: each with how long it took", mine.map { "\(Int($0.ms ?? 0))" }.joined(separator: ","))
    say(mine.allSatisfy { ["mc", "tf", "type", "blank", "match"].contains($0.q ?? "") }, "learn: and the kind of question")
    s.stopLearn()
  }

  /// Tune to you: it needs enough reviews, fits in the background, saves, and turns on; the grade buttons use the fit.
  static func tune(_ s: Store) async {
    let info = s.tuneInfo()
    say(info.can && info.reviews >= 400, "tune: enough reviews", "\(info.reviews)")
    say(!info.on && !info.tuned, "tune: not tuned yet")
    let t0 = Date()
    s.tune()
    say(s.tuning != nil, "tune: it starts")
    while s.tuning != nil && Date().timeIntervalSince(t0) < 120 { try? await Task.sleep(nanoseconds: 200_000_000) }
    say(s.tuning == nil, "tune: it finishes", String(format: "%.1f s", Date().timeIntervalSince(t0)))
    let l = await until(s) { $0.settings.tune?.on == true }
    let fit = l?.settings.tune
    say(fit?.on == true && fit?.w.count == 19, "tune: the server has the fit, on", "\(fit?.w.count ?? 0) numbers")
    say((fit?.reviews ?? 0) >= 400 && (fit?.gain ?? 0) > 0, "tune: and what it came from", "reviews \(fit?.reviews ?? 0), gain \(String(format: "%.4f", fit?.gain ?? 0))")
    // Its numbers are the ones the web's fit makes from the same reviews (checked by the script that runs this).
    if let w = fit?.w { print("TUNE_W " + w.map { String($0) }.joined(separator: ",")) }
    say(s.tuneInfo().on && s.tuneInfo().n == fit?.reviews, "tune: Settings says it's on", "Tuned to your \(s.tuneInfo().n) reviews")
    // The grade buttons' gaps use the fit.
    let E = s.engine
    if let c = E.queue(nil).first(where: { $0.lane == "rev" }), Engine.scheduled(c.deck) {
      let now = nowMs(), std = FSRS.preview(c.card.srs, now: now, goal: GOAL, maxDays: MAX_DAYS, steps: c.deck.steps)
      let tuned = FSRS.preview(c.card.srs, now: now, goal: GOAL, maxDays: MAX_DAYS, steps: c.deck.steps, w: E.tunedW)
      say(E.tunedW?.count == 19, "tune: the app grades with the fit")
      print("GAPS standard \([1, 2, 3, 4].map { FSRS.waitLabel(std[$0]!, now) }) tuned \([1, 2, 3, 4].map { FSRS.waitLabel(tuned[$0]!, now) })")
    }
    // Back to the standard schedule (the fit is kept), then on again.
    s.useTuned(false)
    let l2 = await until(s) { $0.settings.tune?.on == false }
    say(l2?.settings.tune?.on == false && l2?.settings.tune?.w.count == 19, "tune: off keeps the fit")
    say(s.engine.tunedW == nil, "tune: and the app is back to the standard schedule")
    s.useTuned(true)
    let l3 = await until(s) { $0.settings.tune?.on == true }
    say(l3?.settings.tune?.on == true, "tune: on again without fitting again")
  }

  /// On Free the Pro tools are turned away by the server (with its message), and the app shows what Pro adds.
  static func free(_ s: Store) async {
    say(!s.isPro, "free: the app knows it's Free")
    guard let d = s.lib.decks.first(where: { ($0.exam ?? "").isEmpty }) else { say(false, "free: a deck without an exam"); return }
    let before = d.leechAt
    s.setExam(d.id, iso(dayAt(nowMs(), 10)))
    let e1 = await error(s)
    say(e1.contains("Pro"), "free: an exam date is turned away, and says why", e1)
    // (The server's words name the web's pricing page; on iPhone Pro is bought in the app, so the app leaves the page out.)
    say(!e1.contains("pricing") && !e1.contains("lucida.cards"), "free: and doesn't send anyone to a web page to pay", e1)
    say((s.lib.decks.first { $0.id == d.id }?.exam ?? "").isEmpty, "free: and the deck still has none")
    s.updateDeck(d.id, ["leechAt": 12])
    let e2 = await error(s)
    say(e2.contains("Pro"), "free: the leech rule is turned away too", e2)
    say(s.lib.decks.first { $0.id == d.id }?.leechAt == before, "free: and it stays as it was", "\(s.lib.decks.first { $0.id == d.id }?.leechAt ?? -1)")
    // A fit saved back when it was Pro isn't used, and can't be turned on.
    say(s.engine.tunedW == nil, "free: a saved fit isn't used")
    s.useTuned(true)
    let e3 = await error(s)
    say(e3.contains("Pro"), "free: Tune to you can't be turned on", e3)
    say(s.engine.tunedW == nil, "free: the standard schedule stays")
    say(!s.tuneInfo().pro, "free: Settings offers Go Pro instead")
  }
}
#endif
