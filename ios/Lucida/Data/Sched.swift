// Lucida's scheduling rules on top of FSRS (web/sched.js, ported), the same in the app, on the server, and in AI apps, so
// all of them agree on what comes up: cards you paused never do, cards you keep forgetting get marked, an exam date
// brings cards up early, and every deck is held to the same memory goal.
import Foundation

enum Sched {
  // A deck's longest gap (its gapIdx picks one), in days. Decks no longer choose one, but old data keeps its gapIdx.
  static let GAPS = [30, 90, 180, 365, 730, 1825, 3650]
  // Every deck is held to a 90% chance of remembering, with a year at most between reviews: there's nothing to set (the owner, 2026-10-02:
  // "remove all of this… for all screens in iphone and web"). A deck's stored goal and gapIdx are ignored (sched.js GOAL, MAX_DAYS).
  static let GOAL = 0.9, MAX_DAYS = 365
  /// FSRS picks when a deck's cards come back, unless it grades with piles or has FSRS turned off.
  /// FSRS always schedules 4 grades and ✓ / ✗; piles only sort cards. A deck's old `fsrs: false` no longer turns it off (the owner, 2026-10-02).
  static func scheduled(_ d: Deck?) -> Bool { d != nil && d!.grading != "piles" }

  // ---------- cards you keep forgetting ----------
  // After this many forgets a card is marked (Anki calls them leeches), and gets the Leech tag or is paused, as its deck
  // says, then again every half that many forgets. Only forgetting a card you'd learned counts.
  static let LEECH_AT = 8, LEECH_TAG = "Leech"
  static func leechAt(_ d: Deck?) -> Int { let n = Int(FSRS.jsRound(Double(d?.leechAt ?? 0))); return n != 0 ? n : LEECH_AT }
  static func leechAct(_ d: Deck?) -> String { d?.leechAct == "pause" ? "pause" : "tag" }
  static func isLeech(_ c: Card, _ d: Deck?) -> Bool { scheduled(d) && c.srs.lapses >= leechAt(d) }

  // ---------- memory ----------
  /// How likely you are to remember a card at time `t` (1 right after a review), or nil before its first review.
  static func recallAt(_ c: Card, _ t: Double) -> Double? {
    c.srs.state == "new" || !(c.srs.s > 0) ? nil : FSRS.recall(max(0, (t - (c.srs.last != 0 ? c.srs.last : t)) / DAY), c.srs.s)
  }

  // ---------- exam date ----------
  // A deck can have an exam day ("2026-10-12"). From EXAM_DAYS before it, cards come up as soon as your memory of them
  // slips under a goal that rises from the deck's own to EXAM_GOAL on the day, so the cards you'd forget by then come up
  // early and the whole deck is fresh for the exam. Only what comes up changes: each of those reviews is a normal one,
  // so once the day has passed the deck's schedule simply carries on.
  static let EXAM_DAYS = 30.0, EXAM_GOAL = 0.95
  /// The exam's day as local midnight, or nil for none.
  static func examDay(_ d: Deck?) -> Double? {
    guard let s = d?.exam else { return nil }
    let p = s.split(separator: "-", omittingEmptySubsequences: false)
    guard p.count == 3, p[0].count == 4, p[1].count == 2, p[2].count == 2, let y = Int(p[0]), let m = Int(p[1]), let dd = Int(p[2]) else { return nil }
    var c = DateComponents(); c.year = y; c.month = m; c.day = dd
    return Calendar.current.date(from: c).map { $0.timeIntervalSince1970 * 1000 }
  }
  /// Whole days from `now` to the exam (0 on the day, less after it), or nil without one.
  static func examIn(_ d: Deck?, _ now: Double) -> Int? { examDay(d).map { Int(FSRS.jsRound(($0 - dayAt(now)) / DAY)) } }
  /// The goal a card is held to `n` days before the exam.
  static func examGoal(_ d: Deck?, _ n: Int?) -> Double {
    let g = GOAL, top = max(g, EXAM_GOAL)
    guard let n, n >= 0, Double(n) <= EXAM_DAYS else { return g }
    return g + (top - g) * (1 - Double(n) / EXAM_DAYS)
  }
  /// Whether an exam brings this card up at `now` (a card you've learned, whose memory slipped under the exam's goal).
  static func examBrings(_ c: Card, _ d: Deck?, _ now: Double) -> Bool {
    if c.srs.state != "review" || !scheduled(d) { return false }
    guard let n = examIn(d, now), n >= 0, Double(n) <= EXAM_DAYS else { return false }
    guard let r = recallAt(c, now) else { return false }
    return r < examGoal(d, n)
  }
  /// Whether a card comes up now in a deck FSRS schedules: it's due, or an exam brings it up early. Paused cards and AI
  /// cards still waiting for your OK never do.
  static func isDue(_ c: Card, _ d: Deck?, _ now: Double) -> Bool {
    !c.pending && !c.paused && c.srs.state != "new" && (c.srs.due <= now || examBrings(c, d, now))
  }
  /// Which day (0 today, 1 tomorrow…) a card comes up on, with the exam's early reviews: for the forecasts.
  static func dueDay(_ c: Card, _ d: Deck?, _ now: Double) -> Int {
    let today = dayAt(now), normal = Int(FSRS.jsRound((dayAt(c.srs.due) - today) / DAY))
    if c.srs.due <= now { return 0 }
    guard let n = examIn(d, now), c.srs.state == "review", scheduled(d), n >= 0 else { return normal }
    let lo = max(0, n - Int(EXAM_DAYS)), hi = min(n, normal)
    if lo <= hi {
      for i in lo...hi {
        let at = i != 0 ? dayAt(now, i) : now
        if let r = recallAt(c, at), r < examGoal(d, n - i) { return i }
      }
    }
    return normal
  }

  /// An exam's numbers for a deck's cards: days to go, the cards to review before it (you'd remember them less than the
  /// exam's goal on the day), and how ready the deck is: cards seen, cards learned, and how much of it you'd remember on
  /// the day if you stopped studying now. Nil without an exam, or once it's over.
  struct ExamStatus: Equatable {
    var days: Int, date: String, total: Int, seen: Int, learned: Int, toReview: Int, likely: Double
  }
  static func examStatus(_ cards: [Card], _ d: Deck, _ now: Double) -> ExamStatus? {
    guard let n = examIn(d, now), n >= 0, let dayMs = examDay(d) else { return nil }
    let day = dayMs + 12 * 3_600_000, goal = examGoal(d, 0)
    var total = 0, seen = 0, learned = 0, likely = 0.0, toReview = 0
    for c in cards {
      if c.pending || c.paused { continue }
      total += 1
      if c.srs.state == "new" { continue }
      seen += 1
      if c.srs.state == "review" { learned += 1 }
      guard let r = recallAt(c, max(day, now)) else { continue }
      likely += r
      if r < goal { toReview += 1 }
    }
    return ExamStatus(days: n, date: d.exam ?? "", total: total, seen: seen, learned: learned, toReview: toReview, likely: total > 0 ? likely / Double(total) : 0)
  }

  // ---------- what a memory goal costs ----------
  /// About how many reviews a day a memory goal means for a deck, from its cards as they are now: each card you've studied
  /// comes back about once per gap (the gap at which your memory of it falls to the goal, up to the deck's longest gap),
  /// a forgotten one about once more, and the deck's new cards a day start on top. It's the steady rate, cheap enough to
  /// work out again at every step of the goal.
  static func workload(_ cards: [Card], _ d: Deck, _ goal: Double) -> Double {
    let maxDays = Double(MAX_DAYS)
    var rate = 0.0, left = 0
    for c in cards {
      if c.pending || c.paused { continue }
      if c.srs.state == "new" { left += 1; continue }
      if !(c.srs.s > 0) { continue }
      rate += 1 / min(maxDays, max(1, FSRS.gapOf(c.srs.s, goal)))
    }
    return rate * (2 - goal) + Double(min(d.perDay, left))
  }
}
