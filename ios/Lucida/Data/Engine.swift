// What the screens show, worked out from your library the way the web app does it (web/db.js, ported): what's due,
// streaks, the review queue, forecasts, and stats. Times are milliseconds, like the server's.
import Foundation

let DAY: Double = 86_400_000, MIN: Double = 60_000
let GAPS = Sched.GAPS
let DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
let MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
let SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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

/// A deck's exam, for its page, its settings, and Today: "Exam in 12 days · 84 cards to review first" (db.js examOf).
struct ExamInfo: Equatable {
  var status: Sched.ExamStatus
  /// "Oct 4" (with the year when it isn't this one), "Exam in 12 days", and the whole line.
  var day: String, when: String, line: String
}

struct DeckStat { var due = 0, overdue = 0, fresh = 0; var soon: Int?; var next = Double.infinity; var total = 0, aiCount = 0; var ret: Int?; var exam: ExamInfo? }

/// One deck with its numbers (db.js deckRow).
struct DeckInfo: Identifiable {
  var id: String, name: String, tags: [String], seed: String, style: String?, round: Int, image: String?, paused: Bool, folder: String?
  var total: Int, due: Int, overdue: Int, soon: Int?, fresh: Int, ret: Int?, aiCount: Int
  var exam: ExamInfo?
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
  static func scheduled(_ d: Deck) -> Bool { Sched.scheduled(d) }
  static func byAI(_ c: Card) -> Bool { c.source != "you" && c.source != "import" && !c.source.isEmpty }
  /// A card that can come up: not paused, and not an AI card waiting for your OK.
  static func studyable(_ c: Card) -> Bool { !c.pending && !c.paused }
  /// Lucida Pro: from the server (Stripe), and on your own computer's server, on unless it runs as the Free app.
  var isPro: Bool { S.pro && (S.me == nil || S.me!.plan.pro) }
  /// Your own FSRS parameters (Pro's Tune to you), when they're on.
  var tunedW: [Double]? { let t = S.settings.tune; return isPro && t?.on == true && t!.w.count == FSRS.W.count ? t!.w : nil }

  /// Cards you graded today in a deck (Learn mode answers don't count).
  func seenToday(_ id: String) -> Set<String> {
    let t0 = dayAt(now)
    return Set(S.logs.filter { $0.deckId == id && $0.at >= t0 && ($0.kind ?? "").isEmpty }.map(\.cardId))
  }
  static func rememberedPct(_ logs: [ReviewLog]) -> Int? {
    let r = logs.filter { ($0.rating ?? 0) != 0 && $0.was == "review" }
    guard !r.isEmpty else { return nil }
    return Int(FSRS.jsRound(Double(r.filter { ($0.rating ?? 0) > 1 }.count) / Double(r.count) * 100))
  }

  /// A deck's exam line (db.js examOf); nil without an exam, and once the day has passed.
  func examOf(_ d: Deck, _ cs: [Card]) -> ExamInfo? {
    guard let exam = d.exam, !exam.isEmpty, let x = Sched.examStatus(cs, d, now) else { return nil }
    let when = x.days == 0 ? "Exam today" : x.days == 1 ? "Exam tomorrow" : "Exam in " + plural(x.days, "day")
    let line = when + (x.toReview > 0 ? " · " + plural(x.toReview, "card") + " to review first" : x.total - x.seen > 0 ? " · " + plural(x.total - x.seen, "card") + " not studied yet" : " · all fresh")
    return ExamInfo(status: x, day: Engine.shortDay(exam, now), when: when, line: line)
  }
  /// "Oct 4", or "Oct 4, 2027" when it isn't this year.
  static func shortDay(_ iso: String, _ now: Double) -> String {
    let p = iso.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3, (1...12).contains(p[1]) else { return iso }
    let year = Calendar.current.component(.year, from: Date(timeIntervalSince1970: now / 1000))
    return SHORT_MONTHS[p[1] - 1] + " \(p[2])" + (p[0] != year ? ", \(p[0])" : "")
  }

  func stat(_ d: Deck) -> DeckStat {
    let today = dayAt(now), all = cards(of: d.id), cs = all.filter { !$0.pending }
    let newToday = S.logs.filter { $0.deckId == d.id && $0.at >= today && $0.was == "new" }.count
    var st = DeckStat()
    if d.grading == "piles" { st.due = cs.filter { $0.pile == nil && !$0.paused }.count }
    else if !Engine.scheduled(d) { let seen = seenToday(d.id); st.due = cs.filter { !seen.contains($0.id) && !$0.paused }.count }
    else {
      let hasExam = !(d.exam ?? "").isEmpty
      for c in cs where c.srs.state != "new" && !c.paused {
        if Sched.isDue(c, d, now) { st.due += 1; if c.srs.state == "review" && c.srs.due < today { st.overdue += 1 } }
        // Before an exam a card can come up sooner than its own date (sched.js).
        else { let i = hasExam ? Sched.dueDay(c, d, now) : 0; st.next = min(st.next, i != 0 ? dayAt(now, i) : c.srs.due) }
      }
      st.fresh = max(0, min(cs.filter { $0.srs.state == "new" && !$0.paused }.count, d.perDay - newToday))
    }
    st.soon = st.due > 0 ? 0 : st.next < .infinity ? max(1, Int(FSRS.jsRound((dayAt(st.next) - today) / DAY))) : nil
    st.total = all.count
    st.aiCount = all.filter(Engine.byAI).count
    st.ret = Engine.rememberedPct(S.logs.filter { $0.deckId == d.id && $0.at >= now - 30 * DAY })
    st.exam = examOf(d, cs)
    return st
  }

  func info(_ d: Deck) -> DeckInfo {
    let st = stat(d)
    return DeckInfo(id: d.id, name: d.name, tags: d.tags, seed: d.cover.seed ?? d.name, style: d.cover.style, round: d.cover.round, image: d.cover.image, paused: d.paused, folder: d.folder,
                    total: st.total, due: st.due, overdue: st.overdue, soon: st.soon, fresh: st.fresh, ret: st.ret, aiCount: st.aiCount, exam: st.exam)
  }
  var decks: [DeckInfo] { S.decks.map(info) }

  /// How many review cards come due each day ahead (1 = tomorrow), with an exam's early reviews.
  func forecast(_ n: Int, _ decks: [Deck], long: Bool = false) -> Forecast {
    var vals = Array(repeating: 0, count: n)
    let byId = Dictionary(decks.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    for c in S.cards where Engine.studyable(c) && c.srs.state != "new" && c.srs.due > now {
      guard let d = byId[c.deckId] else { continue }
      let i = Sched.dueDay(c, d, now)
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

  /// What's up next for review: cards still learning first, then reviews (with any an exam brings up early), then
  /// today's new cards. Paused cards never come up. Going over one pile: the cards in it you haven't sorted again yet this
  /// time (`done`). A set from the Stats page ("hard", "leech", or "tag:Organelles"): its cards you haven't graded yet
  /// this time, across decks, least remembered first.
  func queue(_ id: String?, pile: String? = nil, set: String? = nil, done: Set<String> = []) -> [QueueItem] {
    let decks = id != nil ? [deck(id)].compactMap { $0 } : S.decks.filter { !$0.paused }
    if let pile {
      return decks.flatMap { d in cards(of: d.id).filter { Engine.studyable($0) && $0.pile == pile && !done.contains($0.id) }.map { QueueItem(card: $0, deck: d, lane: "rev") } }
    }
    if let set {
      return setCards(set).filter { !done.contains($0.id) }.compactMap { c in deck(c.deckId).map { QueueItem(card: c, deck: $0, lane: "rev") } }
    }
    var learn: [QueueItem] = [], rev: [QueueItem] = [], fresh: [QueueItem] = []
    for d in decks {
      let cs = cards(of: d.id).filter(Engine.studyable)
      if d.grading == "piles" { cs.filter { $0.pile == nil }.forEach { rev.append(QueueItem(card: $0, deck: d, lane: "rev")) }; continue }
      if !Engine.scheduled(d) { let seen = seenToday(d.id); cs.filter { !seen.contains($0.id) }.forEach { rev.append(QueueItem(card: $0, deck: d, lane: "rev")) }; continue }
      for c in cs where c.srs.state != "new" && Sched.isDue(c, d, now) {
        if Engine.isLearn(c) { learn.append(QueueItem(card: c, deck: d, lane: "learn")) } else { rev.append(QueueItem(card: c, deck: d, lane: "rev")) }
      }
      cs.filter { $0.srs.state == "new" }.prefix(stat(d).fresh).forEach { fresh.append(QueueItem(card: $0, deck: d, lane: "new")) }
    }
    // A stable sort by when each is due, like the web's.
    func byDue(_ xs: [QueueItem]) -> [QueueItem] { xs.enumerated().sorted { $0.element.card.srs.due != $1.element.card.srs.due ? $0.element.card.srs.due < $1.element.card.srs.due : $0.offset < $1.offset }.map(\.element) }
    let q = byDue(learn) + byDue(rev) + fresh
    if !q.isEmpty { return q }
    // Nothing due: a card still being learned can come up to 20 minutes early.
    return Array(byDue(decks.filter(Engine.scheduled).flatMap { d in cards(of: d.id).filter { Engine.studyable($0) && Engine.isLearn($0) && $0.srs.due <= now + 20 * MIN }.map { QueueItem(card: $0, deck: d, lane: "learn") } }).prefix(1))
  }

  /// The cards of a set from the Stats page, least remembered first (up to 50 at a time): your hardest cards, the ones you
  /// keep forgetting, or a tag's cards you've studied.
  func setCards(_ set: String) -> [Card] {
    let byId = Dictionary(S.decks.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    var last: [String: Int] = [:]
    if set == "hard" { for l in S.logs { if let r = l.rating, r != 0 { last[l.cardId] = r } } }
    func pick(_ c: Card) -> Bool {
      if set == "hard" { return c.srs.state != "new" && difficulty(c, deck: byId[c.deckId], last: last[c.id]) == "hard" }
      if set == "leech" { return Sched.isLeech(c, byId[c.deckId]) }
      if set.hasPrefix("tag:") { return c.srs.state != "new" && c.tags.contains(String(set.dropFirst(4))) }
      return false
    }
    let cs = S.cards.filter { Engine.studyable($0) && byId[$0.deckId] != nil && pick($0) }
    let by = { (c: Card) in Sched.recallAt(c, now) ?? 1 }
    return Array(cs.enumerated().sorted { by($0.element) != by($1.element) ? by($0.element) < by($1.element) : $0.offset < $1.offset }.map(\.element).prefix(50))
  }
  static func setName(_ set: String?) -> String {
    guard let set else { return "" }
    return set == "hard" ? "Hardest cards" : set == "leech" ? "Cards you keep forgetting" : set.hasPrefix("tag:") ? String(set.dropFirst(4)) : ""
  }

  func isHard(_ c: Card) -> Bool { c.srs.lapses > 0 || c.srs.state == "relearning" || (c.srs.state == "review" && c.srs.d >= 7) }
  /// How hard a card is for you (db.js difficulty): new (never studied), easy, medium, or hard (the "hard" Learn mode uses).
  /// Spaced repetition knows each card's difficulty; decks without it go by the card's last answer, and piles by which pile
  /// the card is in (the first pile is easy, the last is hard).
  func difficulty(_ c: Card, deck: Deck?, last: Int?) -> String {
    if let d = deck, d.grading == "piles" {
      let P = d.piles.map(\.name)
      guard let pile = c.pile, let i = P.firstIndex(of: pile) else { return "new" }
      return i == 0 ? "easy" : i == P.count - 1 ? "hard" : "medium"
    }
    if c.srs.state == "new" && c.srs.reps == 0 { return "new" }
    if isHard(c) || c.srs.d >= 7 { return "hard" }
    if c.srs.d != 0 { return c.srs.d <= 4 ? "easy" : "medium" }
    guard let r = last else { return "new" }
    return r == 1 ? "hard" : r == 2 ? "medium" : "easy"
  }

  func nextLabel(_ c: Card) -> String {
    if c.pending { return "Waiting for you" }
    if c.paused { return "Paused" }
    if c.srs.state == "new" { return "New" }
    if c.srs.due <= now { return "Due now" }
    if Engine.isLearn(c) { return "In " + FSRS.waitLabel(c.srs, now) }
    let days = Int(FSRS.jsRound((dayAt(c.srs.due) - dayAt(now)) / DAY))
    return days <= 1 ? "Tomorrow" : days < 60 ? "In \(days) days" : "In \(Int(FSRS.jsRound(Double(days) / 30.4))) months"
  }

  struct NextDue { var day: String; var short: String; var n: Int }
  /// The next day something comes up, and how many cards then (an exam can bring some up sooner than their own date).
  var nextDue: NextDue? {
    let byId = Dictionary(S.decks.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    var ups: [Double] = []
    for c in S.cards where Engine.studyable(c) && c.srs.state != "new" && c.srs.due > now {
      guard let d = byId[c.deckId], !Sched.isDue(c, d, now) else { continue }
      ups.append(!(d.exam ?? "").isEmpty ? dayAt(now, Sched.dueDay(c, d, now)) : dayAt(c.srs.due))
    }
    guard let day = ups.min() else { return nil }
    let n = ups.filter { $0 == day }.count, gap = Int(FSRS.jsRound((day - dayAt(now)) / DAY))
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
                 minutes: max(1, Int(FSRS.jsRound(Double(due) * 10 / 60))), fresh: fresh, next: nextDue,
                 week: ["M", "T", "W", "T", "F", "S", "S"].enumerated().map { i, l in (l, st.days.contains(dayAt(monday, i)), dayAt(monday, i) == today) })
  }

  /// About how many reviews a day a memory goal (a percent) means for a deck (sched.js workload).
  func workload(_ id: String, _ goal: Int) -> Double { deck(id).map { Sched.workload(cards(of: id), $0, Double(goal) / 100) } ?? 0 }

  /// Every tag in use.
  var tags: [String] { Array(NSOrderedSet(array: S.decks.flatMap(\.tags) + S.cards.flatMap(\.tags))) as? [String] ?? [] }
}
