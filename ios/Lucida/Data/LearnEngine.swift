// Learn mode (web/db.js, ported): learn a set of cards until you know every one. Each card is asked in different ways
// (pick from a few answers, true or false, match it with others, fill in its blank, type it). It's learned after two
// right answers in a row, asked two ways, and a card you miss comes back a few questions later. Up to 7 cards are in
// play at a time. The session keeps itself on this phone, so you can stop and pick up later; when every card is
// learned, the ones that were new get their first review, so spaced repetition takes over.
import Foundation

struct LearnCard: Codable { var streak = 0, tries = 0, misses = 0; var lastKind: String? = nil; var learned = false, seen = false }

struct LearnQuestion: Codable {
  var type: String            // choice, match, type
  var kind: String            // mc, tf, blank, match, type
  var id: String? = nil       // the card asked (choice, type)
  // choice (an AI's question has its own words and why)
  var text: String? = nil
  var why: String? = nil
  var ai: Bool? = nil
  var claim: String? = nil
  var options: [String]? = nil
  var right: Int? = nil
  var pick: Int? = nil
  // match
  var ids: [String]? = nil
  var left: [String]? = nil
  var rightIds: [String]? = nil
  var matched: [String]? = nil
  var sel: String? = nil
  var wrong: [String]? = nil
  // type
  var typed: String? = nil
  var checked: Bool? = nil
  var ok: Bool? = nil
  var beforeStreak: Int? = nil
  var beforeSeen: Bool? = nil
}

struct LearnSession: Codable {
  var v = 1
  var deckId: String
  var set: String
  var kinds: [String]
  var ids: [String]
  var queue: [String]
  var asked = 0, firstRight = 0, justLearned = 0
  var started: Double
  var ended: Double? = nil
  var q: LearnQuestion? = nil
  var done = false, graded = false
  var lastCard: String? = nil
  var st: [String: LearnCard]
}

/// What a Learn mode screen shows.
struct LearnView {
  var deckId = "", setName = ""
  var total = 1, learned = 0, learning = 0, justLearned = 0, n = 0
  var done = false
  var type = "choice", kind = ""
  // one card (text is how it's asked; cardText is the card's own words)
  var id = "", text = "", cardText = "", image: String? = nil, answer = "", note = "", streak = 0, learnedNow = false
  var claim = "", options: [String] = [], right = 0, pick: Int? = nil
  // an AI's question: why, and its right option
  var why = "", aiAnswer = ""
  // matching
  var left: [(id: String, label: String)] = [], rightSide: [(id: String, label: String)] = [], matched: [String] = [], sel: String? = nil, wrong: [String]? = nil
  // typing
  var typed = "", checked = false, ok = false
  // the end
  var minutes = 0, firstPct = 0, tries: [(front: String, back: String, n: String)] = []
}

enum LearnKinds {
  static let all: [(id: String, label: String)] = [("mc", "Multiple choice"), ("match", "Matching"), ("tf", "True or false"), ("blank", "Fill in the blank"), ("type", "Type the answer")]
  static let name = ["mc": "Multiple choice", "tf": "True or false", "blank": "Fill in the blank", "match": "Matching", "type": "Type the answer"]
}

extension Store {
  private static let learnKey = "lucida.learn"
  static let learnPlay = 7

  // ---------- the cards ----------
  func learnText(_ c: Card) -> String {
    (c.kind == "cloze" ? Rich.plain(c.text, cloze: true, blank: "____", join: " ", showMath: true) : Rich.plain(c.front, join: " ", showMath: true)).trimmingCharacters(in: .whitespacesAndNewlines)
  }
  func answerOf(_ c: Card) -> String {
    (c.kind == "cloze" ? Rich.blanks(c.text, showMath: true).joined(separator: ", ") : Rich.plain(c.back, join: " ", showMath: true)).trimmingCharacters(in: .whitespacesAndNewlines)
  }
  func learnable(_ c: Card) -> Bool { !c.pending && c.kind != "audio" && !answerOf(c).isEmpty && (c.kind == "image" ? c.image != nil : !learnText(c).isEmpty) }
  func isHard(_ c: Card) -> Bool { c.srs.lapses > 0 || c.srs.state == "relearning" || (c.srs.state == "review" && c.srs.d >= 7) }
  private func card(_ id: String) -> Card? { lib.cards.first { $0.id == id } }

  func learnSetCards(_ id: String, _ set: String) -> [Card] {
    let cs = engine.cards(of: id).filter(learnable)
    if set == "new" { return cs.filter { $0.srs.state == "new" } }
    if set == "hard" { return cs.filter(isHard) }
    if set.hasPrefix("tag:") { let g = String(set.dropFirst(4)); return cs.filter { $0.tags.contains(g) } }
    return cs
  }
  /// The sets to learn: New, Hard, the most used tag, and All (those with cards, and All always).
  func learnSets(_ id: String) -> [(id: String, label: String, n: Int)] {
    if demo { return [("new", "New", 10), ("hard", "Hard", 36), ("tag:Exam 1", "Exam 1", 40), ("all", "All", 412)] }
    let cs = engine.cards(of: id).filter(learnable)
    var uses: [String: Int] = [:]
    for c in cs { for g in c.tags { uses[g, default: 0] += 1 } }
    let tag = uses.keys.sorted { (uses[$0]!, $1) > (uses[$1]!, $0) }.first
    var out: [(String, String, Int)] = [("new", "New", cs.filter { $0.srs.state == "new" }.count), ("hard", "Hard", cs.filter(isHard).count)]
    if let tag { out.append(("tag:" + tag, tag, uses[tag]!)) }
    out.append(("all", "All", cs.count))
    return out.filter { $0.2 > 0 || $0.0 == "all" }
  }

  /// Wrong answers that look like the right one: other cards' answers of about the same length, from the same deck.
  private func distractors(_ c: Card, _ n: Int) -> [String] {
    let right = answerOf(c).lowercased(), deck = engine.cards(of: c.deckId).filter { $0.id != c.id && learnable($0) }, same = deck.filter { $0.kind == c.kind }
    var seen = Set<String>(), pool: [String] = []
    for a in (same.count > n ? same : deck).map(answerOf) where !a.isEmpty && a.lowercased() != right && seen.insert(a).inserted { pool.append(a) }
    pool.sort { abs($0.count - right.count) < abs($1.count - right.count) }
    return Array(Array(pool.prefix(n * 2)).shuffled().prefix(n))
  }
  private func short(_ c: Card) -> Bool { c.kind != "image" && learnText(c).count <= 70 && answerOf(c).count <= 60 }

  // ---------- a session ----------
  var learning: LearnSession? {
    get {
      guard let data = UserDefaults.standard.data(forKey: Store.learnKey), let s = try? JSONDecoder().decode(LearnSession.self, from: data), s.v == 1 else { return nil }
      // A saved session only counts while its deck and cards are still here.
      guard engine.deck(s.deckId) != nil, s.ids.allSatisfy({ card($0) != nil }) else { return nil }
      return s
    }
    set {
      if let s = newValue, let data = try? JSONEncoder().encode(s) { UserDefaults.standard.set(data, forKey: Store.learnKey) } else { UserDefaults.standard.removeObject(forKey: Store.learnKey) }
      objectWillChange.send()
    }
  }
  /// Learn mode is going for this deck (and not finished).
  func learnActive(_ id: String) -> Bool { guard let L = learning else { return false }; return L.deckId == id && !L.done }

  func startLearn(_ id: String, set: String, kinds: [String]) -> Bool {
    let cs = learnSetCards(id, set)
    guard !cs.isEmpty else { return false }
    let ids = cs.map(\.id).shuffled()
    var L = LearnSession(deckId: id, set: set, kinds: kinds.isEmpty ? ["mc"] : kinds, ids: ids, queue: ids, started: nowMs(),
                         st: Dictionary(uniqueKeysWithValues: ids.map { ($0, LearnCard()) }))
    nextQuestion(&L)
    learning = L
    return true
  }

  /// Questions the learner's AI app wrote for a card (MCP add_quiz), of one kind ("choice" or "true_false").
  private func aiQuiz(_ c: Card, _ kind: String) -> [QuizQuestion] { c.quiz.filter { $0.kind == kind } }

  /// Which kind of question a card gets: a choice first; once it's right, typing it (or another kind of choice).
  private func kindFor(_ L: LearnSession, _ s: LearnCard, _ c: Card, _ play: [String]) -> String {
    let fits: [String: Bool] = [
      "mc": distractors(c, 3).count >= 1 || !aiQuiz(c, "choice").isEmpty, "tf": distractors(c, 1).count >= 1 || !aiQuiz(c, "true_false").isEmpty,
      "blank": c.kind == "cloze" && distractors(c, 3).count >= 1,
      "match": short(c) && play.filter { L.st[$0]?.streak == 0 && card($0).map(short) == true }.count >= 4, "type": answerOf(c).count <= 40
    ]
    let pickFrom = { (ks: [String]) in ks.filter { L.kinds.contains($0) && fits[$0] == true } }
    let choice = pickFrom(["mc", "tf", "blank", "match"]), recall = pickFrom(["type"])
    if s.streak == 1 { let r = recall.isEmpty ? choice.filter { $0 != s.lastKind } : recall; if let k = r.randomElement() { return k } }
    return (choice.isEmpty ? (recall.isEmpty ? ["mc"] : recall) : choice).randomElement()!
  }

  /// Moves a card a few places later among the cards still to learn, so something else comes first.
  private func later(_ L: inout LearnSession, _ cid: String, _ k: Int) {
    L.queue.removeAll { $0 == cid }
    let open = L.queue.filter { L.st[$0]?.learned != true }
    let after = open.isEmpty ? nil : open[min(k, open.count) - 1]
    if let after, let at = L.queue.firstIndex(of: after) { L.queue.insert(cid, at: at + 1) } else { L.queue.append(cid) }
  }

  private func nextQuestion(_ L: inout LearnSession) {
    let open = L.queue.filter { L.st[$0]?.learned != true }
    guard !open.isEmpty else { L.q = nil; L.done = true; L.ended = nowMs(); finishLearn(&L); return }
    let play = Array(open.prefix(Store.learnPlay)), cid = play.first { $0 != L.lastCard } ?? play[0]
    guard let c = card(cid), let s = L.st[cid] else { return }
    let kind = kindFor(L, s, c, play)
    L.asked += 1; L.justLearned = 0; L.lastCard = cid
    if kind == "match" {
      let group = Array(([cid] + play.filter { $0 != cid && L.st[$0]?.streak == 0 && card($0).map(short) == true }).prefix(5))
      L.q = LearnQuestion(type: "match", kind: "match", ids: group, left: group.shuffled(), rightIds: group.shuffled(), matched: [])
      return
    }
    if kind == "type" { L.q = LearnQuestion(type: "type", kind: "type", id: cid, typed: "", checked: false, ok: false); return }
    // An AI-written question, when the card has one of this kind (most of the time; now and then the card's own words).
    let ai = kind == "tf" ? aiQuiz(c, "true_false") : kind == "mc" ? aiQuiz(c, "choice") : []
    if let x = ai.randomElement(), Double.random(in: 0..<1) < 0.8 || distractors(c, 1).isEmpty {
      if kind == "tf" {
        L.q = LearnQuestion(type: "choice", kind: "tf", id: cid, text: "True or false?", why: x.why, ai: true, claim: x.question, options: ["True", "False"], right: x.answer == "true" ? 0 : 1)
        return
      }
      let options = ([x.answer] + x.wrong).shuffled()
      L.q = LearnQuestion(type: "choice", kind: kind, id: cid, text: x.question, why: x.why, ai: true, options: options, right: options.firstIndex(of: x.answer))
      return
    }
    if kind == "tf" {
      let truth = Bool.random(), claim = truth ? answerOf(c) : (distractors(c, 1).first ?? answerOf(c))
      L.q = LearnQuestion(type: "choice", kind: "tf", id: cid, claim: claim, options: ["True", "False"], right: truth ? 0 : 1)
      return
    }
    let options = ([answerOf(c)] + distractors(c, 3)).shuffled()
    L.q = LearnQuestion(type: "choice", kind: c.kind == "cloze" && L.kinds.contains("blank") ? "blank" : kind, id: cid, options: options, right: options.firstIndex(of: answerOf(c)))
  }

  private func mark(_ L: inout LearnSession, _ cid: String, _ ok: Bool, _ kind: String) {
    guard var s = L.st[cid] else { return }
    s.tries += 1
    if !s.seen { s.seen = true; if ok { L.firstRight += 1 } }
    s.lastKind = kind
    if ok { s.streak += 1; if s.streak >= 2 { s.learned = true; L.justLearned += 1 } }
    else { s.streak = 0; s.misses += 1 }
    L.st[cid] = s
    if ok && !s.learned { later(&L, cid, 3) } else if !ok { later(&L, cid, 2) }
  }

  /// Every card learned: the new ones start their reviews (Good, or Hard if they took misses).
  private func finishLearn(_ L: inout LearnSession) {
    guard !L.graded else { return }
    L.graded = true
    let grades = L.ids.compactMap { cid -> (String, Int)? in guard card(cid)?.srs.state == "new" else { return nil }; return (cid, (L.st[cid]?.misses ?? 0) > 0 ? 2 : 3) }
    Task { for (cid, g) in grades { await send("review.grade", ["cardId": cid, "rating": g]) } }
  }

  // ---------- answering ----------
  func learnAnswer(_ j: Int) {
    guard var L = learning, var q = L.q, q.type == "choice", q.pick == nil, let id = q.id else { return }
    q.pick = j; L.q = q
    mark(&L, id, j == q.right, q.kind)
    learning = L
  }
  func learnPick(_ side: String, _ cid: String) {
    guard var L = learning, var q = L.q, q.type == "match", !(q.matched ?? []).contains(cid) else { return }
    if side == "left" { q.sel = cid; q.wrong = nil; L.q = q; learning = L; return }
    guard let a = q.sel else { return }
    if cid == a { q.matched = (q.matched ?? []) + [cid]; q.sel = nil; L.q = q; mark(&L, cid, true, "match") }
    else {
      q.wrong = [a, cid]; q.sel = nil; L.q = q; mark(&L, a, false, "match")
      Task { try? await Task.sleep(nanoseconds: 700_000_000); if var L2 = learning, var q2 = L2.q, q2.type == "match", q2.wrong == [a, cid] { q2.wrong = nil; L2.q = q2; learning = L2 } }
    }
    learning = L
  }
  func learnType(_ typed: String) {
    guard var L = learning, var q = L.q, q.type == "type", q.checked != true, let id = q.id, let c = card(id), !typed.trimmingCharacters(in: .whitespaces).isEmpty else { return }
    let s = L.st[id]
    q.beforeStreak = s?.streak; q.beforeSeen = s?.seen; q.typed = typed; q.checked = true; q.ok = Store.closeEnough(typed, answerOf(c)); L.q = q
    mark(&L, id, q.ok == true, "type")
    learning = L
  }
  /// The spelling check missed it (another word for the same thing): count it as right after all.
  func learnOverride() {
    guard var L = learning, var q = L.q, q.type == "type", q.checked == true, q.ok != true, let id = q.id, var s = L.st[id] else { return }
    q.ok = true; s.misses = max(0, s.misses - 1); s.streak = (q.beforeStreak ?? 0) + 1
    if q.beforeSeen != true { L.firstRight += 1 }
    if s.streak >= 2 { s.learned = true; L.justLearned += 1 }
    L.st[id] = s; L.q = q
    learning = L
  }
  func learnNext() {
    guard var L = learning, !L.done, let q = L.q else { return }
    if q.type == "choice" && q.pick == nil { return }
    if q.type == "type" && q.checked != true { return }
    if q.type == "match" && (q.matched ?? []).count < (q.ids ?? []).count { return }
    nextQuestion(&L)
    learning = L
  }
  func stopLearn() { learning = nil }

  // ---------- close enough ----------
  /// Spelling that's close enough counts: case, accents, a missing "the", and a typo or two in a longer word.
  static func closeEnough(_ typed: String, _ answer: String) -> Bool {
    func norm(_ x: String) -> String {
      var s = x.lowercased().folding(options: .diacriticInsensitive, locale: nil)
      s = s.replacingOccurrences(of: #"\([^)]*\)"#, with: " ", options: .regularExpression)
      s = s.replacingOccurrences(of: #"[^\p{L}\p{N}]+"#, with: " ", options: .regularExpression)
      s = s.replacingOccurrences(of: #"\b(the|a|an)\b"#, with: " ", options: .regularExpression)
      return s.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
    }
    func lev(_ a: [Character], _ b: [Character]) -> Int {
      if a.isEmpty { return b.count }
      if b.isEmpty { return a.count }
      var d = Array(0...b.count)
      for i in 1...a.count {
        var p = d[0]; d[0] = i
        for j in 1...b.count { let t = d[j]; d[j] = min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] == b[j - 1] ? 0 : 1)); p = t }
      }
      return d[b.count]
    }
    let t = norm(typed)
    guard !t.isEmpty else { return false }
    let inParens = answer.range(of: #"\(([^)]*)\)"#, options: .regularExpression).map { String(answer[$0].dropFirst().dropLast()) }
    let parts = ([answer] + answer.components(separatedBy: CharacterSet(charactersIn: ",;/")).flatMap { $0.components(separatedBy: " or ") } + [inParens].compactMap { $0 }).map(norm).filter { !$0.isEmpty }
    return parts.contains { p in p == t || lev(Array(p), Array(t)) <= max(p.count > 4 ? 1 : 0, p.count / 7) }
  }

  // ---------- what the screen shows ----------
  func learnView() -> LearnView? {
    guard let L = learning else { return nil }
    let total = L.ids.count, learned = L.ids.filter { L.st[$0]?.learned == true }.count
    var v = LearnView(deckId: L.deckId, setName: L.set.hasPrefix("tag:") ? String(L.set.dropFirst(4)) : ["new": "New cards", "hard": "Hard cards", "all": "All cards"][L.set] ?? "",
                      total: total, learned: learned, learning: L.ids.filter { L.st[$0]?.learned != true && L.st[$0]?.seen == true }.count, justLearned: L.justLearned, n: L.asked)
    if L.done {
      v.done = true
      v.minutes = max(1, Int((((L.ended ?? nowMs()) - L.started) / MIN).rounded()))
      v.firstPct = Int((Double(L.firstRight) / Double(max(1, total)) * 100).rounded())
      v.tries = L.ids.compactMap { id -> (Card, Int)? in guard let c = card(id), let n = L.st[id]?.tries, n > 2 else { return nil }; return (c, n) }
        .sorted { $0.1 > $1.1 }.prefix(3).map { (learnText($0.0), answerOf($0.0), "\($0.1) tries") }
      return v
    }
    guard let q = L.q else { return v }
    v.type = q.type; v.kind = LearnKinds.name[q.kind] ?? ""
    if q.type == "match" {
      v.left = (q.left ?? []).compactMap { id in card(id).map { (id, learnText($0)) } }
      v.rightSide = (q.rightIds ?? []).compactMap { id in card(id).map { (id, answerOf($0)) } }
      v.matched = q.matched ?? []; v.sel = q.sel; v.wrong = q.wrong
      return v
    }
    guard let id = q.id, let c = card(id), let s = L.st[id] else { return v }
    v.id = id; v.text = learnText(c); v.image = c.kind == "image" ? c.image : nil; v.answer = answerOf(c); v.note = Rich.plain(c.note, join: " ", showMath: true)
    v.streak = s.streak; v.learnedNow = s.learned
    if q.type == "type" { v.typed = q.typed ?? ""; v.checked = q.checked == true; v.ok = q.ok == true; return v }
    v.cardText = v.text; v.text = q.text ?? v.text
    v.claim = q.claim ?? ""; v.options = q.options ?? []; v.right = q.right ?? 0; v.pick = q.pick
    v.why = q.why ?? ""; v.aiAnswer = q.ai == true && v.right < v.options.count ? v.options[v.right] : ""
    return v
  }
}
