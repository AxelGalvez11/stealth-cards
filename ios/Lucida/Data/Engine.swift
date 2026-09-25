// What the screens show, worked out from your library the way the web app does it (web/db.js, ported): what's due,
// streaks, the review queue, forecasts, and stats. Times are milliseconds, like the server's.
import Foundation

let DAY: Double = 86_400_000, MIN: Double = 60_000
let GAPS = [30, 90, 180, 365, 730, 1825, 3650]
let DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
let MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
let KIND_LABEL = ["basic": "Basic", "cloze": "Fill in the blank", "image": "Image", "audio": "Audio"]
let KIND_ICON = ["basic": "text", "cloze": "blank", "image": "image", "audio": "audio"]

func plural(_ n: Int, _ w: String) -> String { "\(n) \(w)\(n == 1 ? "" : "s")" }
/// 1280 as "1,280".
func grouped(_ n: Int) -> String {
  let f = NumberFormatter(); f.numberStyle = .decimal; f.locale = Locale(identifier: "en_US"); return f.string(from: NSNumber(value: n)) ?? String(n)
}
func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }

/// Local midnight `n` days after `t` (review cards come due at the start of their day).
func dayAt(_ t: Double, _ n: Int = 0) -> Double {
  let cal = Calendar.current, start = cal.startOfDay(for: Date(timeIntervalSince1970: t / 1000))
  return (cal.date(byAdding: .day, value: n, to: start) ?? start).timeIntervalSince1970 * 1000
}
func weekday(_ t: Double) -> Int { Calendar.current.component(.weekday, from: Date(timeIntervalSince1970: t / 1000)) - 1 }

struct DeckStat { var due = 0, overdue = 0, fresh = 0; var soon: Int?; var next = Double.infinity; var total = 0, aiCount = 0; var ret: Int? }

/// One deck with its numbers (db.js deckRow).
struct DeckInfo: Identifiable {
  var id: String, name: String, tags: [String], seed: String, style: String?, round: Int, image: String?, paused: Bool, folder: String?
  var total: Int, due: Int, overdue: Int, soon: Int?, fresh: Int, ret: Int?, aiCount: Int
  var totalLabel: String { grouped(total) }
  var mesh: Mesh { Mesh.deck(seed: seed, round: round, style: style) }
}

struct Forecast { var vals: [Int]; var labels: [String]; var tops: [String]?; var names: [String] }
struct QueueItem { var card: Card; var deck: Deck; var lane: String }

struct Engine {
  let S: Library
  var now = nowMs()

  func deck(_ id: String?) -> Deck? { S.decks.first { $0.id == id } }
  func cards(of id: String) -> [Card] { S.cards.filter { $0.deckId == id } }
  static func isLearn(_ c: Card) -> Bool { c.srs.state == "learning" || c.srs.state == "relearning" }
  static func scheduled(_ d: Deck) -> Bool { d.fsrs && d.grading != "piles" }
  static func byAI(_ c: Card) -> Bool { c.source != "you" && c.source != "import" && !c.source.isEmpty }

  func seenToday(_ id: String) -> Set<String> {
    let t0 = dayAt(now)
    return Set(S.logs.filter { $0.deckId == id && $0.at >= t0 }.map(\.cardId))
  }
  static func rememberedPct(_ logs: [ReviewLog]) -> Int? {
    let r = logs.filter { $0.rating != nil && $0.was == "review" }
    guard !r.isEmpty else { return nil }
    return Int((Double(r.filter { ($0.rating ?? 0) > 1 }.count) / Double(r.count) * 100).rounded())
  }

  func stat(_ d: Deck) -> DeckStat {
    let today = dayAt(now), all = cards(of: d.id), cs = all.filter { !$0.pending }
    let newToday = S.logs.filter { $0.deckId == d.id && $0.at >= today && $0.was == "new" }.count
    var st = DeckStat()
    if d.grading == "piles" { st.due = cs.filter { $0.pile == nil }.count }
    else if !Engine.scheduled(d) { let seen = seenToday(d.id); st.due = cs.filter { !seen.contains($0.id) }.count }
    else {
      for c in cs where c.srs.state != "new" {
        if c.srs.due <= now { st.due += 1; if c.srs.state == "review" && c.srs.due < today { st.overdue += 1 } }
        else { st.next = min(st.next, c.srs.due) }
      }
      st.fresh = max(0, min(cs.filter { $0.srs.state == "new" }.count, d.perDay - newToday))
    }
    st.soon = st.due > 0 ? 0 : st.next < .infinity ? max(1, Int(((dayAt(st.next) - today) / DAY).rounded())) : nil
    st.total = all.count
    st.aiCount = all.filter(Engine.byAI).count
    st.ret = Engine.rememberedPct(S.logs.filter { $0.deckId == d.id && $0.at >= now - 30 * DAY })
    return st
  }

  func info(_ d: Deck) -> DeckInfo {
    let st = stat(d)
    return DeckInfo(id: d.id, name: d.name, tags: d.tags, seed: d.cover.seed ?? d.name, style: d.cover.style, round: d.cover.round, image: d.cover.image, paused: d.paused, folder: d.folder,
                    total: st.total, due: st.due, overdue: st.overdue, soon: st.soon, fresh: st.fresh, ret: st.ret, aiCount: st.aiCount)
  }
  var decks: [DeckInfo] { S.decks.map(info) }

  /// How many review cards come due each day ahead (1 = tomorrow).
  func forecast(_ n: Int, _ decks: [Deck], long: Bool = false) -> Forecast {
    var vals = Array(repeating: 0, count: n)
    let ids = Set(decks.map(\.id)), today = dayAt(now)
    for c in S.cards where ids.contains(c.deckId) && !c.pending && c.srs.state != "new" && c.srs.due > now {
      let i = Int(((dayAt(c.srs.due) - today) / DAY).rounded())
      if i >= 1 && i <= n { vals[i - 1] += 1 }
    }
    let day = { (i: Int) in dayAt(now, i + 1) }
    let cal = Calendar.current
    let labels = (0..<n).map { i in long ? String(cal.component(.day, from: Date(timeIntervalSince1970: day(i) / 1000))) : String(DAYS[weekday(day(i))].prefix(3)) }
    let tops = long ? (0..<n).map { String(DAYS[weekday(day($0))].prefix(1)) } : nil
    let thisMonth = cal.component(.month, from: Date(timeIntervalSince1970: now / 1000))
    let names = (0..<n).map { i -> String in
      let d = Date(timeIntervalSince1970: day(i) / 1000), wd = DAYS[weekday(day(i))], dd = cal.component(.day, from: d), mm = cal.component(.month, from: d)
      if i == 0 { return "tomorrow" }
      if !long { return wd }
      return mm == thisMonth ? "\(wd.prefix(3)) \(dd)" : "\(wd.prefix(3)), \(MONTHS[mm - 1].prefix(3)) \(dd)"
    }
    return Forecast(vals: vals, labels: labels, tops: tops, names: names)
  }

  struct Streaks { var streak: Int; var best: Int; var days: Set<Double> }
  var streaks: Streaks {
    let days = Set(S.logs.map { dayAt($0.at) }), sorted = days.sorted()
    var streak = 0, t = dayAt(now)
    if !days.contains(t) { t = dayAt(t, -1) }
    while days.contains(t) { streak += 1; t = dayAt(t, -1) }
    var best = 0, run = 0, prev: Double? = nil
    for d in sorted { run = prev != nil && dayAt(prev!, 1) == d ? run + 1 : 1; best = max(best, run); prev = d }
    return Streaks(streak: streak, best: best, days: days)
  }

  /// What's up next: cards still learning first, then reviews, then today's new cards. Going over one pile: the cards in
  /// it not sorted again yet this time (`done`).
  func queue(_ id: String?, pile: String? = nil, done: Set<String> = []) -> [QueueItem] {
    let decks = id != nil ? [deck(id)].compactMap { $0 } : S.decks.filter { !$0.paused }
    if let pile {
      return decks.flatMap { d in cards(of: d.id).filter { !$0.pending && $0.pile == pile && !done.contains($0.id) }.map { QueueItem(card: $0, deck: d, lane: "rev") } }
    }
    var learn: [QueueItem] = [], rev: [QueueItem] = [], fresh: [QueueItem] = []
    for d in decks {
      let cs = cards(of: d.id).filter { !$0.pending }
      if d.grading == "piles" { cs.filter { $0.pile == nil }.forEach { rev.append(QueueItem(card: $0, deck: d, lane: "rev")) }; continue }
      if !Engine.scheduled(d) { let seen = seenToday(d.id); cs.filter { !seen.contains($0.id) }.forEach { rev.append(QueueItem(card: $0, deck: d, lane: "rev")) }; continue }
      for c in cs where c.srs.state != "new" && c.srs.due <= now {
        if Engine.isLearn(c) { learn.append(QueueItem(card: c, deck: d, lane: "learn")) } else { rev.append(QueueItem(card: c, deck: d, lane: "rev")) }
      }
      cs.filter { $0.srs.state == "new" }.prefix(stat(d).fresh).forEach { fresh.append(QueueItem(card: $0, deck: d, lane: "new")) }
    }
    let byDue = { (a: QueueItem, b: QueueItem) in a.card.srs.due < b.card.srs.due }
    let q = learn.sorted(by: byDue) + rev.sorted(by: byDue) + fresh
    if !q.isEmpty { return q }
    // Nothing due: a card still being learned can come up to 20 minutes early.
    return Array(decks.filter(Engine.scheduled).flatMap { d in cards(of: d.id).filter { !$0.pending && Engine.isLearn($0) && $0.srs.due <= now + 20 * MIN }.map { QueueItem(card: $0, deck: d, lane: "learn") } }.sorted(by: byDue).prefix(1))
  }

  func nextLabel(_ c: Card) -> String {
    if c.pending { return "Waiting for you" }
    if c.srs.state == "new" { return "New" }
    if c.srs.due <= now { return "Due now" }
    if Engine.isLearn(c) { return "In " + FSRS.waitLabel(c.srs, now) }
    let days = Int(((dayAt(c.srs.due) - dayAt(now)) / DAY).rounded())
    return days <= 1 ? "Tomorrow" : days < 60 ? "In \(days) days" : "In \(Int((Double(days) / 30.4).rounded())) months"
  }

  struct NextDue { var day: String; var short: String; var n: Int }
  var nextDue: NextDue? {
    let ups = S.cards.filter { !$0.pending && $0.srs.state != "new" && $0.srs.due > now }
    guard let first = ups.map(\.srs.due).min() else { return nil }
    let day = dayAt(first), n = ups.filter { dayAt($0.srs.due) == day }.count, gap = Int(((day - dayAt(now)) / DAY).rounded())
    let name = DAYS[weekday(day)]
    return NextDue(day: gap == 0 ? "later today" : gap == 1 ? "tomorrow" : gap < 7 ? "on " + name : "in \(gap) days",
                   short: gap == 0 ? "Later today" : gap == 1 ? "Tomorrow" : gap < 7 ? name : "In \(gap) days", n: n)
  }

  struct Today { var date: String; var streak: Int; var best: Int; var due: Int; var minutes: Int; var fresh: Int; var next: NextDue?; var week: [(d: String, done: Bool, today: Bool)] }
  var today: Today {
    let live = S.decks.filter { !$0.paused }, stats = live.map(stat)
    let due = stats.reduce(0) { $0 + $1.due }, fresh = stats.reduce(0) { $0 + $1.fresh }, st = streaks
    let wd = weekday(now), monday = dayAt(now, -((wd + 6) % 7)), today = dayAt(now)
    let cal = Calendar.current, d = Date(timeIntervalSince1970: now / 1000)
    return Today(date: DAYS[wd] + ", " + MONTHS[cal.component(.month, from: d) - 1] + " \(cal.component(.day, from: d))", streak: st.streak, best: st.best, due: due,
                 minutes: max(1, Int((Double(due) * 10 / 60).rounded())), fresh: fresh, next: nextDue,
                 week: ["M", "T", "W", "T", "F", "S", "S"].enumerated().map { i, l in (l, st.days.contains(dayAt(monday, i)), dayAt(monday, i) == today) })
  }

  /// Every tag in use.
  var tags: [String] { Array(NSOrderedSet(array: S.decks.flatMap(\.tags) + S.cards.flatMap(\.tags))) as? [String] ?? [] }
}
