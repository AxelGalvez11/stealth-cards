// Deep stats (Pro), ported from web/insights.js: what you remember, what you're weak at and why, and what's coming. Worked
// out from a library's cards and review logs, the same way as the web's Stats page. Plain numbers and ids; the Stats page
// puts words to them. It also reads the canvas's sample (design/mock.mjs SAMPLE_INSIGHTS) for the design screens.
import Foundation

struct InsightsData: Codable {
  struct Trend: Codable { var start: Double, n: Int, pct: Int? }
  struct TagStat: Codable { var tag: String, n: Int, pct: Int?, cards: Int }
  struct Move: Codable { var tag: String, before: Int?, after: Int?, n: Int, delta: Int }
  struct Mode: Codable { var n: Int, pct: Int? }
  struct Memory: Codable {
    var retention: Mode, trend: [Trend], byMonth: Bool, byTag: [TagStat], improved: [Move], slipping: [Move], modes: Modes
    struct Modes: Codable { var cards: Mode, learn: Mode }
  }
  /// A card you've forgotten most: how many times, how difficult it is (1 to 10), and how likely you'd remember it now.
  /// `front`, `back`, and `deck` are filled in by the Stats page (a card's words and its deck's name).
  struct Hard: Codable {
    var id: String, deckId: String, lapses: Int, d: Double, recall: Double?, reps: Int
    var front = "", back = "", deck = ""
    enum CodingKeys: String, CodingKey { case id, deckId, lapses, d, recall, reps, front, back, deck }
    init(id: String, deckId: String, lapses: Int, d: Double, recall: Double?, reps: Int) { self.id = id; self.deckId = deckId; self.lapses = lapses; self.d = d; self.recall = recall; self.reps = reps }
    init(from dec: Decoder) throws {
      let c = try dec.container(keyedBy: CodingKeys.self)
      id = c.v(.id, ""); deckId = c.v(.deckId, ""); lapses = c.v(.lapses, 0); d = c.v(.d, 0); recall = c.v(.recall, nil); reps = c.v(.reps, 0)
      front = c.v(.front, ""); back = c.v(.back, ""); deck = c.v(.deck, "")
    }
  }
  struct Leech: Codable {
    var id: String, deckId: String, lapses: Int, paused: Bool
    var front = "", back = "", deck = ""
    enum CodingKeys: String, CodingKey { case id, deckId, lapses, paused, front, back, deck }
    init(id: String, deckId: String, lapses: Int, paused: Bool) { self.id = id; self.deckId = deckId; self.lapses = lapses; self.paused = paused }
    init(from dec: Decoder) throws {
      let c = try dec.container(keyedBy: CodingKeys.self)
      id = c.v(.id, ""); deckId = c.v(.deckId, ""); lapses = c.v(.lapses, 0); paused = c.v(.paused, false)
      front = c.v(.front, ""); back = c.v(.back, ""); deck = c.v(.deck, "")
    }
  }
  struct Dist: Codable { var label: String, n: Int }
  struct Forgot: Codable { var n: Int, of: Int, pct: Int? }
  struct Weak: Codable {
    var weakTags: [TagStat], hardest: [Hard], leeches: [Leech], forgot: Forgot, lapseDist: [Dist], diffDist: [Dist], studied: Int
  }
  struct Time: Codable { var n: Int, perCard: Double?, perRight: Double?, rightPerMin: Double?, minutes: Double, learnN: Int, perQuestion: Double? }
  struct Gap: Codable { var start: Double, n: Int, days: Double? }
  struct Ahead: Codable { var start: Double, n: Int }
  struct Exam: Codable {
    var deckId: String, name: String, days: Int, date: String, total: Int, seen: Int, learned: Int, toReview: Int, likely: Double
    /// "Exam in 12 days · 84 cards to review first" (filled in by the Stats page).
    var line = ""
    enum CodingKeys: String, CodingKey { case deckId, name, days, date, total, seen, learned, toReview, likely, line }
    init(deckId: String, name: String, status s: Sched.ExamStatus) {
      self.deckId = deckId; self.name = name; days = s.days; date = s.date; total = s.total; seen = s.seen; learned = s.learned; toReview = s.toReview; likely = s.likely
    }
    init(from dec: Decoder) throws {
      let c = try dec.container(keyedBy: CodingKeys.self)
      deckId = c.v(.deckId, ""); name = c.v(.name, ""); days = c.v(.days, 0); date = c.v(.date, ""); total = c.v(.total, 0); seen = c.v(.seen, 0)
      learned = c.v(.learned, 0); toReview = c.v(.toReview, 0); likely = c.v(.likely, 0); line = c.v(.line, "")
    }
  }
  struct Pace: Codable { var time: Time, gaps: [Gap], gapNow: Double?, ahead: [Ahead], exams: [Exam] }
  var days: Int, reviews: Int, memory: Memory, weak: Weak, pace: Pace
}

enum Insights {
  // A flashcards grade (a Learn mode answer is `kind: "learn"`), and one that says right or wrong (not a pile).
  private static func isLearnLog(_ l: ReviewLog) -> Bool { l.kind != nil && l.kind != "" }
  static func isGrade(_ l: ReviewLog) -> Bool { !isLearnLog(l) && ((l.rating ?? 0) != 0 || l.pile != nil) }
  private static func rated(_ l: ReviewLog) -> Bool { !isLearnLog(l) && (l.rating ?? 0) != 0 }
  /// True retention: reviews of cards you'd already learned (not new cards, not learning steps), where anything but Forgot
  /// means you remembered.
  private static func learned(_ l: ReviewLog) -> Bool { rated(l) && l.was == "review" }
  static func pct(_ a: Int, _ n: Int) -> Int? { n != 0 ? Int(FSRS.jsRound(Double(a) / Double(n) * 100)) : nil }
  private static func median(_ xs: [Double]) -> Double? {
    if xs.isEmpty { return nil }
    let s = xs.sorted(), m = s.count >> 1
    return s.count % 2 == 1 ? s[m] : (s[m - 1] + s[m]) / 2
  }
  private static func date(_ t: Double) -> Date { Date(timeIntervalSince1970: t / 1000) }
  private static func mondayOf(_ t: Double) -> Double { dayAt(t, -((weekday(t) + 6) % 7)) }
  private static func monthStart(_ y: Int, _ m: Int) -> Double {
    var c = DateComponents(); c.year = y; c.month = m; c.day = 1
    return (Calendar.current.date(from: c) ?? Date(timeIntervalSince1970: 0)).timeIntervalSince1970 * 1000
  }
  private static func monthOf(_ t: Double) -> Double { let c = Calendar.current.dateComponents([.year, .month], from: date(t)); return monthStart(c.year!, c.month!) }
  private static func monthAfter(_ t: Double) -> Double { let c = Calendar.current.dateComponents([.year, .month], from: date(t)); return monthStart(c.year!, c.month! + 1) }
  /// Twelve weeks, or twelve months for a year: when each starts, oldest first.
  private static func buckets(_ now: Double, _ byMonth: Bool) -> [Double] {
    var out: [Double] = [], t = byMonth ? monthOf(now) : mondayOf(now)
    for _ in 0..<12 { out.insert(t, at: 0); t = byMonth ? monthOf(t - DAY) : dayAt(t, -7) }
    return out
  }
  /// JavaScript's localeCompare, near enough for tag names.
  private static func before(_ a: String, _ b: String) -> Bool { a.compare(b, options: [], range: nil, locale: Locale(identifier: "en_US")) == .orderedAscending }
  /// A stable sort (equal items keep their order), like JavaScript's.
  private static func stable<T>(_ xs: [T], _ less: (T, T) -> Bool) -> [T] {
    xs.enumerated().sorted { a, b in less(a.element, b.element) ? true : less(b.element, a.element) ? false : a.offset < b.offset }.map(\.element)
  }

  /// The numbers for the last `days` (7, 30, or 365) up to `now`, of every deck or one (`deckId`).
  static func compute(_ S: Library, now: Double = nowMs(), days: Int = 30, deckId only: String? = nil) -> InsightsData {
    let since = now - Double(days) * DAY
    let deckOf = Dictionary(S.decks.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a }), cardOf = Dictionary(S.cards.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    let logs = S.logs.filter { only == nil || $0.deckId == only }, cards = S.cards.filter { (only == nil || $0.deckId == only) && !$0.pending }
    let inRange = logs.filter { $0.at >= since }
    let mature = inRange.filter(learned)
    func right(_ list: [ReviewLog]) -> Int { list.filter { ($0.rating ?? 0) > 1 }.count }

    // ---------- memory ----------
    // Remembered week by week (month by month for a year), and by tag.
    let byMonth = days > 60, starts = buckets(now, byMonth)
    let ends = starts.enumerated().map { i, t in i + 1 < starts.count ? starts[i + 1] : (byMonth ? monthAfter(t) : dayAt(t, 7)) }
    let allMature = logs.filter(learned)
    func inBucket(_ l: ReviewLog, _ i: Int) -> Bool { l.at >= starts[i] && l.at < ends[i] }
    let trend = starts.enumerated().map { i, start -> InsightsData.Trend in
      let b = allMature.filter { inBucket($0, i) }
      return .init(start: start, n: b.count, pct: pct(right(b), b.count))
    }
    // Topics are your own tags (the Leech tag marks cards you keep forgetting, so it isn't one).
    func tagsOf(_ l: ReviewLog) -> [String] { (cardOf[l.cardId]?.tags ?? []).filter { $0 != Sched.LEECH_TAG } }
    // Tags in the order they first show up (like a JavaScript Map), each with reviews and right ones.
    func tagStat(_ list: [ReviewLog]) -> (order: [String], stat: [String: (n: Int, ok: Int)]) {
      var order: [String] = [], m: [String: (n: Int, ok: Int)] = [:]
      for l in list { for g in tagsOf(l) {
        if m[g] == nil { order.append(g); m[g] = (0, 0) }
        m[g]!.n += 1; if (l.rating ?? 0) > 1 { m[g]!.ok += 1 }
      } }
      return (order, m)
    }
    var cardsWith: [String: Int] = [:]
    for c in cards { for g in c.tags where g != Sched.LEECH_TAG { cardsWith[g, default: 0] += 1 } }
    let ts = tagStat(mature)
    let byTag = stable(ts.order.map { g -> InsightsData.TagStat in let x = ts.stat[g]!; return .init(tag: g, n: x.n, pct: pct(x.ok, x.n), cards: cardsWith[g] ?? 0) }) { a, b in
      a.n != b.n ? a.n > b.n : before(a.tag, b.tag)
    }
    // Most improved and slipping: each tag's last 30 days against the 30 before, with a few reviews in each.
    let cut = now - 30 * DAY
    let recent = tagStat(allMature.filter { $0.at >= cut }), prior = tagStat(allMature.filter { $0.at >= cut - 30 * DAY && $0.at < cut })
    let moves = recent.order.compactMap { g -> InsightsData.Move? in
      let x = recent.stat[g]!
      guard x.n >= 5, let b = prior.stat[g], b.n >= 5 else { return nil }
      let bp = pct(b.ok, b.n)!, ap = pct(x.ok, x.n)!
      return .init(tag: g, before: bp, after: ap, n: x.n + b.n, delta: ap - bp)
    }
    let improved = Array(stable(moves.filter { $0.delta > 0 }) { $0.delta > $1.delta }.prefix(3))
    let slipping = Array(stable(moves.filter { $0.delta < 0 }) { $0.delta < $1.delta }.prefix(3))
    // Flashcards against Learn mode: how often each was right.
    let graded = inRange.filter(rated), learnt = inRange.filter { $0.kind == "learn" }
    let modes = InsightsData.Memory.Modes(cards: .init(n: graded.count, pct: pct(right(graded), graded.count)),
                                          learn: .init(n: learnt.count, pct: pct(learnt.filter { $0.ok == true }.count, learnt.count)))

    // ---------- weak spots ----------
    let weakTags = Array(stable(byTag.filter { $0.n >= 8 }) { a, b in a.pct! != b.pct! ? a.pct! < b.pct! : a.n > b.n }.prefix(6))
    // Cards you've studied, in decks FSRS schedules.
    let studied = cards.filter { $0.srs.state != "new" && Sched.scheduled(deckOf[$0.deckId]) }
    // The hardest: forgotten most, then the most difficult, then the least remembered right now.
    let hardAll = studied.filter { !$0.paused && ($0.srs.lapses > 0 || $0.srs.d >= 7) }.map { c in
      InsightsData.Hard(id: c.id, deckId: c.deckId, lapses: c.srs.lapses, d: FSRS.jsRound(c.srs.d * 10) / 10, recall: Sched.recallAt(c, now), reps: c.srs.reps)
    }
    let hardest = Array(stable(hardAll) { a, b in
      a.lapses != b.lapses ? a.lapses > b.lapses : a.d != b.d ? a.d > b.d : (a.recall ?? 1) < (b.recall ?? 1)
    }.prefix(20))
    let leeches = stable(studied.filter { Sched.isLeech($0, deckOf[$0.deckId]) }.map { InsightsData.Leech(id: $0.id, deckId: $0.deckId, lapses: $0.srs.lapses, paused: $0.paused) }) { $0.lapses > $1.lapses }
    let forgotN = mature.count - right(mature)
    let forgot = InsightsData.Forgot(n: forgotN, of: mature.count, pct: pct(forgotN, mature.count))
    // How often cards were forgotten (0, 1, 2, 3–4, 5–7, 8 or more times), and how difficult they are (1 to 10).
    let LAPSES: [(Int, Int, String)] = [(0, 0, "0"), (1, 1, "1"), (2, 2, "2"), (3, 4, "3–4"), (5, 7, "5–7"), (8, Int.max, "8+")]
    let lapseDist = LAPSES.map { a, b, label in InsightsData.Dist(label: label, n: studied.filter { $0.srs.lapses >= a && $0.srs.lapses <= b }.count) }
    let diffDist = (0..<9).map { i in
      InsightsData.Dist(label: String(i + 1), n: studied.filter { c in
        let d = c.srs.d != 0 ? c.srs.d : 1
        return Int(min(9, max(1, d.rounded(.down)))) == i + 1
      }.count)
    }

    // ---------- pace ----------
    // Time on each card (from showing it to grading it), per right answer, and right answers a minute.
    let timed = inRange.filter { isGrade($0) && ($0.ms ?? 0) > 0 }, ms = timed.reduce(0.0) { $0 + ($1.ms ?? 0) }, ok = right(timed)
    let learnTimed = learnt.filter { ($0.ms ?? 0) > 0 }
    let time = InsightsData.Time(n: timed.count, perCard: timed.isEmpty ? nil : ms / Double(timed.count) / 1000, perRight: ok > 0 ? ms / Double(ok) / 1000 : nil,
                                 rightPerMin: ms != 0 ? Double(ok) / (ms / 60000) : nil, minutes: ms / 60000, learnN: learnTimed.count,
                                 perQuestion: learnTimed.isEmpty ? nil : learnTimed.reduce(0.0) { $0 + ($1.ms ?? 0) } / Double(learnTimed.count) / 1000)
    // How your gaps grow: the typical gap before each review of a learned card, week by week; and the gap cards wait now.
    func gapOf(_ l: ReviewLog) -> Double? { (l.prevLast ?? 0) != 0 ? (l.at - l.prevLast!) / DAY : nil }
    let gaps = starts.enumerated().map { i, start -> InsightsData.Gap in
      let g = allMature.filter { inBucket($0, i) }.compactMap(gapOf)
      return .init(start: start, n: g.count, days: median(g))
    }
    let waiting = studied.filter { $0.srs.state == "review" && !$0.paused && $0.srs.due > $0.srs.last }.map { ($0.srs.due - $0.srs.last) / DAY }
    let gapNow = median(waiting)
    // Reviews coming up, week by week for 8 weeks (the first week has what's due now), with an exam's early reviews.
    var ahead = (0..<8).map { InsightsData.Ahead(start: dayAt(now, $0 * 7), n: 0) }
    for c in studied where !c.paused {
      let i = Int((Double(max(0, Sched.dueDay(c, deckOf[c.deckId], now))) / 7).rounded(.down))
      if i < 8 { ahead[i].n += 1 }
    }
    // Decks with an exam coming: how ready each is.
    let exams = S.decks.filter { (only == nil || $0.id == only) && $0.exam != nil && $0.exam != "" }.compactMap { d -> InsightsData.Exam? in
      Sched.examStatus(S.cards.filter { $0.deckId == d.id }, d, now).map { .init(deckId: d.id, name: d.name, status: $0) }
    }

    return InsightsData(days: days, reviews: inRange.filter(isGrade).count,
                        memory: .init(retention: .init(n: mature.count, pct: pct(right(mature), mature.count)), trend: trend, byMonth: byMonth, byTag: byTag, improved: improved, slipping: slipping, modes: modes),
                        weak: .init(weakTags: weakTags, hardest: hardest, leeches: leeches, forgot: forgot, lapseDist: lapseDist, diffDist: diffDist, studied: studied.count),
                        pace: .init(time: time, gaps: gaps, gapNow: gapNow, ahead: ahead, exams: exams))
  }
}
