// What the Pro study tools add to the store (web/db.js): a memory goal's cost in reviews a day, an exam date, pausing cards,
// Tune to you, and deep stats. Each answers the same question the canvas board's sample answers, so the design screens and
// the app run the same screens.
import SwiftUI

/// Things worked out from the library, kept until it changes (db.js's memo).
final class StudyMemo {
  var insights: InsightsData?
  var hist: Tune.Histories?
  var workload: [String: Double] = [:]
}

/// Tune to you: whether there are enough reviews, whether it's on, and how it's going (db.js tuneInfo).
struct TuneInfo {
  var pro = true, on = true, tuned = true
  var reviews = 0, need = Tune.MIN, can = true, busy = false, progress = 0.0, error = "", n = 0
}

extension Store {
  // ---------- the canvas's sample ----------
  /// The sample's day (design/mock.mjs): Tuesday, September 22, 2026, noon.
  static let sampleNow: Double = {
    var c = DateComponents(); c.year = 2026; c.month = 9; c.day = 22; c.hour = 12
    return (Calendar.current.date(from: c) ?? Date()).timeIntervalSince1970 * 1000
  }()
  /// Cell Biology's sample exam (mock.mjs): Sunday, October 4, 12 days after the sample's Tuesday, with 84 cards to review.
  static let sampleExamDay = "2026-10-04"
  static func demoExam(day: String?) -> ExamInfo? {
    guard let day, let at = Sched.examDay(Deck(examDay: day)) else { return nil }
    let n = Int(FSRS.jsRound((at + 12 * 3_600_000 - sampleNow) / DAY))
    guard n >= 0 else { return nil }
    let when = n == 0 ? "Exam today" : n == 1 ? "Exam tomorrow" : "Exam in \(n) days"
    let status = Sched.ExamStatus(days: n, date: day, total: 412, seen: 380, learned: 334, toReview: 84, likely: 0.74)
    return ExamInfo(status: status, day: Engine.shortDay(day, sampleNow), when: when, line: when + " · 84 cards to review first")
  }

  // ---------- what a memory goal costs ----------
  /// About how many reviews a day a goal (a percent) means for a deck (sched.js workload). The canvas has a formula that
  /// gives Cell Biology's sample numbers: 24, 32, and 56 a day at 85, 90, and 95%.
  func workload(_ id: String, _ goal: Int) -> Double {
    if demo {
      let g = Double(goal) / 100, base: Double = pow(0.9, -2) - 1, here: Double = pow(g, -2) - 1
      let cost: Double = 22 * base / here * (2 - g) / 1.1
      return cost + 10
    }
    let key = id + ":" + String(goal)
    if let hit = studyMemo.workload[key] { return hit }
    let v = engine.workload(id, goal)
    studyMemo.workload[key] = v
    return v
  }

  // ---------- exam date, pausing ----------
  /// An exam day ("2026-10-12"), or none.
  func setExam(_ deckId: String, _ day: String?) { updateDeck(deckId, ["exam": day ?? NSNull()]) }

  /// Pauses cards (or unpauses them): they don't come up until they're unpaused, and aren't counted anywhere.
  func pauseCards(_ ids: [String], _ on: Bool) {
    if demo { for id in ids { demoPaused[id] = on }; return }
    let set = Set(ids)
    saveNow("card.pause", ["ids": ids, "on": on]) { l in for i in l.cards.indices where set.contains(l.cards[i].id) { l.cards[i].paused = on } }
  }
  /// The cards that go with this one: every blank of one text, or every box of one picture (just it, alone).
  func cardGroup(_ id: String) -> [String] {
    guard let c = lib.cards.first(where: { $0.id == id }) else { return [id] }
    guard let g = c.group else { return [id] }
    return lib.cards.filter { $0.group == g }.map(\.id)
  }
  func isPaused(_ id: String) -> Bool { demo ? demoPaused[id] ?? (id == "a10") : lib.cards.first { $0.id == id }?.paused == true }

  // ---------- Tune to you ----------
  func reviewHistories() -> Tune.Histories {
    if let h = studyMemo.hist { return h }
    let h = Tune.histories(lib)
    studyMemo.hist = h
    return h
  }
  func tuneInfo() -> TuneInfo {
    if demo {
      let k = props.tune
      return TuneInfo(pro: isPro, on: k == "on", tuned: k == "on" || k == "off", reviews: k == "few" ? 212 : 1240, need: 400, can: k != "few", busy: k == "busy", progress: 0.4, error: "", n: 1240)
    }
    let t = lib.settings.tune, h = reviewHistories(), has = !(t?.w.isEmpty ?? true)
    return TuneInfo(pro: isPro, on: t?.on == true && has, tuned: has, reviews: h.reviews, need: Tune.MIN, can: h.reviews >= Tune.MIN && h.items >= Tune.ITEMS,
                    busy: tuning != nil, progress: tuning ?? 0, error: tuneError, n: t.map { $0.reviews != 0 ? $0.reviews : $0.n } ?? 0)
  }

  /// Fits FSRS to your reviews in the background (so nothing waits for it), then saves the fit and turns it on.
  func tune() {
    if demo { props.tune = "on"; return }
    guard tuning == nil else { return }
    let h = reviewHistories()
    guard h.reviews >= Tune.MIN, h.items >= Tune.ITEMS else { return }
    tuning = 0; tuneError = ""
    Task.detached(priority: .userInitiated) { [weak self] in
      let fit = Tune.fit(h, w: FSRS.W) { p in Task { @MainActor [weak self] in if self?.tuning != nil { self?.tuning = p } } }
      await self?.saveTuning(fit)
    }
  }
  private func saveTuning(_ f: Tune.Fit) async {
    let tune: [String: Any] = ["on": true, "w": f.w, "n": f.n, "reviews": f.reviews, "loss": f.loss.map { $0 as Any } ?? NSNull(), "base": f.base.map { $0 as Any } ?? NSNull(),
                               "gain": f.gain, "at": nowMs()]
    let ok = await sent("settings.update", ["patch": ["tune": tune]]) != nil
    tuning = nil
    tuneError = ok ? "" : "Couldn’t save the tuning. Try again."
  }
  /// Back to the standard parameters (keeping the fit for later), or on with the fit (tuning first when there's none).
  func useTuned(_ on: Bool) {
    if demo { props.tune = on ? "on" : "off"; return }
    let t = lib.settings.tune
    if on && (t?.w.isEmpty ?? true) { tune(); return }
    saveNow("settings.update", ["patch": ["tune": ["on": on]]]) { $0.settings.tune?.on = on }
  }
  /// Tuned once, it keeps up with you: when a quarter more reviews have come in since, it tunes again quietly.
  func retuneWhenDue() async {
    guard !demo, isPro, let t = lib.settings.tune, t.on, !t.w.isEmpty, tuning == nil else { return }
    let h = reviewHistories()
    if h.reviews >= max(Tune.MIN, Int(FSRS.jsRound(Double(t.reviews) * 1.25))) && h.items >= Tune.ITEMS { tune() }
  }

  // ---------- deep stats ----------
  /// The Stats page's deep numbers for the last month (db.js insights), with each card's words and its deck's name.
  func insights() -> InsightsData {
    if demo { return Store.sampleInsights }
    if let hit = studyMemo.insights { return hit }
    var x = Insights.compute(lib, now: nowMs(), days: 30)
    let E = engine, cardOf = Dictionary(lib.cards.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    let name = { (id: String) in E.deck(id)?.name ?? "" }
    for i in x.weak.hardest.indices { if let c = cardOf[x.weak.hardest[i].id] { x.weak.hardest[i].front = Store.listFront(c); x.weak.hardest[i].back = Store.listBack(c) }; x.weak.hardest[i].deck = name(x.weak.hardest[i].deckId) }
    for i in x.weak.leeches.indices { x.weak.leeches[i].deck = name(x.weak.leeches[i].deckId) }
    for i in x.pace.exams.indices { x.pace.exams[i].line = E.deck(x.pace.exams[i].deckId).flatMap { E.examOf($0, E.cards(of: $0.id)) }?.line ?? "" }
    studyMemo.insights = x
    return x
  }
  /// The canvas's sample for Month (design/mock.mjs SAMPLE_INSIGHTS).
  static let sampleInsights: InsightsData = {
    struct Sample: Decodable { var Month: InsightsData }
    return (try! JSONDecoder().decode(Sample.self, from: Data(Generated.insightsJSON.utf8))).Month
  }()
}

extension Deck {
  /// A deck with just an exam day, for working out the sample exam.
  init(examDay: String) {
    self = try! JSONDecoder().decode(Deck.self, from: Data("{\"exam\":\"\(examDay)\"}".utf8))
  }
}
