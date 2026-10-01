// Practice test (web/db.js "Practice test", ported): a calm test of a deck's cards (or of every deck in a folder), like an
// exam: numbered questions you can go back through and flag, a quiet timer when you asked for one, nothing said about right or
// wrong until you submit, then your score with every question and its right answer. The questions are Learn mode's
// (choiceQuestion, and the ones your AI wrote for the cards), and a written answer gets Learn's spelling check. A test never
// changes when a card comes back for review (it logs no review). The test in progress keeps itself on this phone, so you can
// pick it up where it was; a finished one is saved with the library (test.save), where the deck's page lists it and AI apps
// can read it.
import Foundation

/// What a test is of: a deck, or every deck in a folder (not the ones you paused).
enum TestScope: Hashable {
  case deck(String), folder(String)
  var deckId: String? { if case .deck(let d) = self { return d }; return nil }
  var folderId: String? { if case .folder(let f) = self { return f }; return nil }
  var key: String { switch self { case .deck(let d): return d; case .folder(let f): return "folder/" + f } }
}

// ---------- what's kept ----------
struct TestOcc: Codable { var boxes: [OccBox]; var ask: Int; var mode: String }
struct TestTerm: Codable { var id: String; var label: String; var answer: String }
struct TestDef: Codable { var id: String; var label: String }
/// One question as asked: a choice (multiple choice, true or false, a blank), a written answer, or matching.
struct TestQuestion: Codable {
  var type: String            // choice, type, match
  var kind: String            // mc, tf, blank, match, type
  var id: String              // the card (the first one, for matching)
  var text = ""
  var claim: String? = nil
  var options: [String]? = nil
  var right: Int? = nil
  var answer: String? = nil
  var image: String? = nil
  var occ: TestOcc? = nil
  var terms: [TestTerm]? = nil
  var defs: [TestDef]? = nil
}
/// What you answered: a choice's number, what you typed, or each word's answer (by their ids).
struct TestAnswer: Codable { var pick: Int? = nil; var typed: String? = nil; var pairs: [String: String]? = nil }
struct TestPair: Codable { var card = "", q = "", a = "", r = "", ok = false }
struct TestItem: Codable {
  var n: Int, k: String, card: String, q: String
  var claim: String? = nil
  var a: String, r: String, ok: Bool
  var counted: Bool? = nil
  var pairs: [TestPair]? = nil
  /// As the server keeps it (store.mjs cleanTest).
  var json: [String: Any] {
    var o: [String: Any] = ["n": n, "k": k, "card": card, "q": q, "a": a, "r": r, "ok": ok]
    if let claim { o["claim"] = claim }
    if counted == true { o["counted"] = true }
    if let pairs { o["pairs"] = pairs.map { ["card": $0.card, "q": $0.q, "a": $0.a, "r": $0.r, "ok": $0.ok] as [String: Any] } }
    return o
  }
}
struct TestResultData: Codable { var items: [TestItem]; var took: Int; var timeUp: Bool; var n: Int; var right: Int; var pct: Int; var savedId: String? = nil }
struct TestSession: Codable {
  var v = 1
  var deckId: String? = nil, folderId: String? = nil
  var name = ""
  var count = 0, kinds: [String] = [], limit = 0
  var questions: [TestQuestion]
  var answers: [String: TestAnswer] = [:]
  var flags: [String: Bool] = [:]
  var at = 0
  var started: Double, spent: Double = 0, tick: Double
  var phase = "taking"        // taking, results
  var result: TestResultData? = nil
  var scope: TestScope { folderId.map { .folder($0) } ?? .deck(deckId ?? "") }
}

/// Where the test in progress is kept in memory (it's saved to the phone's storage every few seconds and at each change).
final class TestBox {
  var session: TestSession? = nil
  var loaded = false
  /// The clock as last shown (the screen redraws when it changes), and how many ticks have gone by since the last save.
  var clock = "", beat = 0
  /// The save of a finished test, so Count it as right can wait for its id.
  var saving: Task<Void, Never>? = nil
}

// ---------- what a screen shows ----------
struct TestTermView: Identifiable { let id: String; let n: Int; let label: String; let picked: String; let chips: [(id: String, letter: String, on: Bool)] }
struct TestDefView: Identifiable { let id: String; let letter: String; let label: String; let by: Int }
struct TestQView {
  var type = "choice", kind = "mc", kindLabel = "", text = "", claim = ""
  var image: String? = nil, occ: TestOcc? = nil
  var options: [(label: String, picked: Bool)] = []
  var typed = ""
  var terms: [TestTermView] = [], defs: [TestDefView] = []
}
struct TestRowView: Identifiable {
  var id: Int { n }
  var n = 0, kind = "mc", kindLabel = "", q = "", claim = "", a = "", r = "", card = ""
  var ok = false, counted = false, notAnswered = false, canCount = false
  var pairs: [TestPair]? = nil
}
struct TestView {
  var phase = "taking"
  var name = "", n = 0, limit = 0
  // taking
  var i = 0, number = 1, q = TestQView(), flagged = false, answered = 0, flags = 0, unanswered = 0, canBack = false, last = false, left: Int? = nil, clock = ""
  var nav: [(n: Int, answered: Bool, flagged: Bool, current: Bool)] = []
  // results
  var pct = 0, right = 0, took = 0, tookLabel = "", timeUp = false, missed = 0, rows: [TestRowView] = []
}
struct PastRow: Identifiable { let id: String; let day: String; let line: String; let pct: Int; let at: Double }

extension Store {
  static let testKey = "lucida.test"
  static let testOrder = ["mc", "tf", "blank", "match", "type"]
  static let testName = ["mc": "Multiple choice", "tf": "True or false", "blank": "Fill in the blank", "match": "Matching", "type": "Written"]
  /// The kinds as the set-up lists them, in the owner's order.
  static let testChips: [(id: String, label: String)] = [("mc", "Multiple choice"), ("tf", "True or false"), ("type", "Written"), ("match", "Matching"), ("blank", "Fill in the blank")]
  static let testCap = 300
  static let letters = Array("ABCDEFGH").map(String.init)

  // ---------- the test in progress ----------
  /// The test in progress, or its results; nil once it's gone, or when its deck or folder is.
  var testing: TestSession? {
    get {
      if !testBox.loaded {
        testBox.loaded = true
        if let data = UserDefaults.standard.data(forKey: Store.testKey), let s = try? JSONDecoder().decode(TestSession.self, from: data), s.v == 1 { testBox.session = s }
        #if DEBUG
        // `-testSpent <milliseconds>`: the test picked up from this phone has already been open that long (to check the clock without waiting).
        if var s = testBox.session, let v = Board.arg("-testSpent"), let ms = Double(v) { s.spent = ms; s.tick = nowMs(); testBox.session = s }
        #endif
      }
      guard let s = testBox.session, testOk(s) else { return nil }
      return s
    }
    set { testBox.session = newValue; testBox.loaded = true; saveTest(); objectWillChange.send() }
  }
  private func testOk(_ s: TestSession) -> Bool { s.folderId.map { f in lib.folders.contains { $0.id == f } } ?? (engine.deck(s.deckId ?? "") != nil) }
  func saveTest() {
    if let s = testBox.session, let data = try? JSONEncoder().encode(s) { UserDefaults.standard.set(data, forKey: Store.testKey) } else { UserDefaults.standard.removeObject(forKey: Store.testKey) }
  }

  // ---------- the cards ----------
  struct TestEntry { let c: Card; let a: String; let q: String }
  private func scopeDecks(_ s: TestScope) -> [Deck] {
    switch s {
    case .deck(let id): return engine.deck(id).map { [$0] } ?? []
    case .folder(let id): return lib.decks.filter { $0.folder == id && !$0.paused }
    }
  }
  func scopeName(_ s: TestScope) -> String {
    switch s {
    case .deck(let id): return engine.deck(id)?.name ?? ""
    case .folder(let id): return lib.folders.first { $0.id == id }?.name ?? ""
    }
  }
  private func testPool(_ s: TestScope) -> [TestEntry] { scopeDecks(s).flatMap { d in learnIn(d.id).map { TestEntry(c: $0.c, a: $0.a, q: learnText($0.c)) } } }
  /// How many different answers a deck has (a choice needs another one).
  private func answersN(_ id: String) -> Int {
    if let n = answerMemo[id] { return n }
    let n = Set(learnIn(id).map { $0.a.lowercased() }).count
    answerMemo[id] = n
    return n
  }
  private func shortE(_ e: TestEntry) -> Bool { e.c.kind != "image" && e.q.count <= 70 && e.a.count <= 60 }

  /// The kinds a card can be asked in, quickly: a choice or a true-or-false needs another answer in its deck (or a question
  /// your AI wrote), a blank is a fill-in-the-blank card, writing needs a short answer, matching short words. A
  /// fill-in-the-blank card is a "blank" question when blanks are on, not a plain choice.
  private func testKinds(_ e: TestEntry, _ on: (String) -> Bool, _ matchOk: Bool) -> [String] {
    let c = e.c, more = answersN(c.deckId) >= 2
    var ks: [String] = []
    if on("mc") && !(c.kind == "cloze" && on("blank")) && (more || !aiQuiz(c, "choice").isEmpty) { ks.append("mc") }
    if on("tf") && (more || !aiQuiz(c, "true_false").isEmpty) { ks.append("tf") }
    if on("blank") && ((c.kind == "cloze" && more) || !aiQuiz(c, "blank").isEmpty) { ks.append("blank") }
    if on("type") && e.a.count <= 40 { ks.append("type") }
    if matchOk && shortE(e) { ks.append("match") }
    return ks
  }
  struct TestTarget { let e: TestEntry; var ks: [String]; var kind = "" }
  /// Which cards go in a test of these kinds, shuffled, each with the kinds it fits. Only matching fits: groups of its own.
  private func testTargets(_ pool: [TestEntry], _ kinds: [String]) -> (targets: [TestTarget], shorts: [TestEntry], matchOk: Bool, matchOnly: Bool) {
    let on = { kinds.contains($0) }, shorts = pool.filter(shortE), matchOk = on("match") && shorts.count >= 4
    let all = pool.shuffled().map { TestTarget(e: $0, ks: testKinds($0, on, matchOk)) }.filter { !$0.ks.isEmpty }
    return (all, shorts, matchOk, matchOk && all.allSatisfy { $0.ks == ["match"] })
  }
  /// Four or five cards with different answers, out of `rest` (they leave it).
  private func takeGroup(_ rest: inout [TestEntry], _ size: Int) -> [TestEntry] {
    var seen = Set<String>(), got: [TestEntry] = []
    for e in rest { if seen.insert(e.a.lowercased()).inserted { got.append(e); if got.count >= size { break } } }
    if got.count < 4 { return [] }
    let ids = Set(got.map { $0.c.id })
    rest.removeAll { ids.contains($0.c.id) }
    return got
  }
  private func groupSize(_ left: Int) -> Int { left >= 10 ? 5 : left >= 8 ? 4 : min(5, left) }
  private func matchGroups(_ shorts: [TestEntry], _ want: Int) -> [[TestEntry]] {
    var rest = shorts.shuffled(), groups: [[TestEntry]] = []
    while rest.count >= 4 && (want == 0 || groups.count < want) {
      let g = takeGroup(&rest, groupSize(rest.count))
      if g.isEmpty { break }
      groups.append(g)
    }
    return groups
  }
  private func pictureOf(_ c: Card) -> (image: String?, occ: TestOcc?) {
    let o = Occ(c)
    return (c.kind == "image" && c.image != nil ? c.image : nil, o.map { TestOcc(boxes: $0.boxes, ask: $0.i, mode: $0.mode) })
  }
  private func matchQuestion(_ group: [TestEntry]) -> TestQuestion {
    let terms = group.shuffled().map { TestTerm(id: $0.c.id, label: $0.q, answer: $0.a) }
    return TestQuestion(type: "match", kind: "match", id: group[0].c.id, terms: terms, defs: terms.map { TestDef(id: $0.id, label: $0.answer) }.shuffled())
  }
  /// One question of one kind for a card, or nil when it can't be made fairly (then the card gets another kind).
  private func testQuestion(_ e: TestEntry, _ kind: String, _ shorts: [TestEntry]) -> TestQuestion? {
    let c = e.c, pic = pictureOf(c)
    if kind == "type" { return TestQuestion(type: "type", kind: "type", id: c.id, text: e.q, answer: e.a, image: pic.image, occ: pic.occ) }
    if kind == "match" {
      let near = shorts.filter { $0.c.id != c.id && $0.c.deckId == c.deckId }, from = near.count >= 3 ? near : shorts.filter { $0.c.id != c.id }
      var seen: Set<String> = [e.a.lowercased()], group = [e]
      for x in from.shuffled() {
        if !seen.insert(x.a.lowercased()).inserted { continue }
        group.append(x)
        if group.count >= 5 { break }
      }
      return group.count >= 4 ? matchQuestion(group) : nil
    }
    let q = choiceQuestion(c, kind: kind, blank: kind == "blank", cap: 300)
    guard let opts = q.options, opts.count >= 2, let r = q.right, r >= 0 else { return nil }
    if q.kind == "tf" && (q.claim ?? "").isEmpty { return nil }
    return TestQuestion(type: "choice", kind: q.kind, id: c.id, text: q.text ?? e.q, claim: q.claim, options: opts, right: r, image: pic.image, occ: pic.occ)
  }
  /// The questions of a new test. `want`: how many (0 for every card, up to testCap). Each question has a card of its own; a
  /// matching question has four or five pairs (its card and others from the deck) and is one question. The kinds are
  /// balanced, and each kind is a section (multiple choice, true or false, fill in the blank, matching, written) with its
  /// questions in random order.
  func testQuestions(_ pool: [TestEntry], _ kinds: [String], _ want: Int) -> [TestQuestion] {
    let t = testTargets(pool, kinds), cap = min(want == 0 ? Store.testCap : want, Store.testCap)
    if t.matchOnly { return matchGroups(t.shorts, cap).map(matchQuestion) }
    var picks = Array(t.targets.prefix(cap)), count: [String: Int] = [:]
    // About one matching question in (kinds + 3); a card that fits nothing else is matching whether or not it's in that count.
    var m = t.matchOk ? min(picks.filter { $0.ks.contains("match") }.count, max(1, Int((Double(picks.count) / Double(kinds.count + 3)).rounded()))) : 0
    for i in picks.indices where m > 0 && picks[i].ks.contains("match") { picks[i].kind = "match"; m -= 1; count["match", default: 0] += 1 }
    for i in picks.indices where picks[i].kind.isEmpty {
      let ks = picks[i].ks.filter { $0 != "match" }, low = ks.map { count[$0] ?? 0 }.min() ?? 0
      picks[i].kind = ks.isEmpty ? "match" : ks.filter { (count[$0] ?? 0) == low }.randomElement()!
      count[picks[i].kind, default: 0] += 1
    }
    var qs: [TestQuestion] = []
    for x in picks {
      var q: TestQuestion? = nil
      for k in [x.kind] + x.ks.filter({ $0 != x.kind && $0 != "match" }) { q = testQuestion(x.e, k, t.shorts); if q != nil { break } }
      if let q { qs.append(q) }
    }
    return Store.testOrder.flatMap { k in qs.filter { $0.kind == k }.shuffled() }
  }
  /// How many questions a test of these kinds can have (the set-up offers 10, 20 and 30 up to this, and All).
  private func testAvailable(_ pool: [TestEntry], _ kinds: [String]) -> Int {
    let t = testTargets(pool, kinds)
    return t.matchOnly ? matchGroups(t.shorts, 0).count : min(t.targets.count, Store.testCap)
  }
  /// The set-up's numbers for a deck or folder and the kinds turned on.
  func testPlan(_ s: TestScope, _ kinds: [String]) -> (name: String, cards: Int, available: Int) {
    if demo { let X = TestSample.shared; return (X.name, X.cards, X.cards) }
    let pool = testPool(s)
    return (scopeName(s), pool.count, testAvailable(pool, kinds))
  }
  /// The same questions again with their answers in another order (Retake the ones I missed).
  private func reshuffled(_ q: TestQuestion) -> TestQuestion {
    var q = q
    if q.type == "match" { q.terms = q.terms?.shuffled(); q.defs = q.defs?.shuffled(); return q }
    guard q.type == "choice", q.kind != "tf", let opts = q.options, let r = q.right else { return q }
    let right = opts[r], options = opts.shuffled()
    q.options = options; q.right = options.firstIndex(of: right)
    return q
  }
  /// Has this question got an answer? (Matching: every one of its words.)
  private func answered(_ q: TestQuestion, _ a: TestAnswer?) -> Bool {
    switch q.type {
    case "choice": return a?.pick != nil
    case "type": return !(a?.typed ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    default: let p = a?.pairs ?? [:]; return (q.terms ?? []).allSatisfy { p[$0.id] != nil }
    }
  }
  private func score(_ items: [TestItem]) -> (n: Int, right: Int, pct: Int) {
    let right = items.filter(\.ok).count
    return (items.count, right, items.isEmpty ? 0 : Int((Double(right) / Double(items.count) * 100).rounded()))
  }
  /// The score of a test: each question's answer, graded. Choices and matching are exact (a matching question is right only
  /// when every pair is); written answers forgive case, accents, and small typos (Store.closeEnough, Learn's check).
  private func testItems(_ T: TestSession) -> [TestItem] {
    T.questions.enumerated().map { i, q in
      let a = T.answers[String(i)], n = i + 1
      if q.type == "match" {
        let given = a?.pairs ?? [:]
        let pairs = (q.terms ?? []).map { t -> TestPair in
          let d = given[t.id].flatMap { id in q.defs?.first { $0.id == id } }
          return TestPair(card: t.id, q: t.label, a: d?.label ?? "", r: t.answer, ok: given[t.id] == t.id)
        }
        return TestItem(n: n, k: "match", card: q.id, q: "Match each one to its answer.", a: "", r: "", ok: pairs.allSatisfy(\.ok), pairs: pairs)
      }
      if q.type == "type" {
        let typed = (a?.typed ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return TestItem(n: n, k: q.kind, card: q.id, q: q.text, a: typed, r: q.answer ?? "", ok: !typed.isEmpty && Store.closeEnough(typed, q.answer ?? ""))
      }
      let opts = q.options ?? []
      return TestItem(n: n, k: q.kind, card: q.id, q: q.text, claim: q.claim?.isEmpty == false ? q.claim : nil, a: a?.pick.map { opts[$0] } ?? "", r: q.right.map { opts[$0] } ?? "", ok: a?.pick == q.right && a?.pick != nil)
    }
  }

  // ---------- starting, answering, and moving about ----------
  /// Starts a test of a deck or folder: `count` questions (0 for every card), the kinds, and a time limit in minutes (0 for none).
  @discardableResult
  func startTest(_ s: TestScope, count: Int, kinds: [String], limit: Int) -> Bool {
    if demo { demoTest.screen = "Multiple choice"; demoTest.flag = nil; return true }
    let pool = testPool(s), ks = Store.testOrder.filter { kinds.contains($0) }
    let qs = !pool.isEmpty && !ks.isEmpty ? testQuestions(pool, ks, count) : []
    guard !qs.isEmpty else { return false }
    let t = nowMs()
    testBox.clock = ""
    testing = TestSession(deckId: s.deckId, folderId: s.folderId, name: scopeName(s), count: count, kinds: ks, limit: [10, 20, 30].contains(limit) ? limit : 0, questions: qs, started: t, tick: t)
    return true
  }
  private func editTest(_ f: (inout TestSession) -> Void) {
    guard var T = testBox.session, T.phase == "taking" else { return }
    f(&T)
    testing = T
  }
  func testChoose(_ j: Int) {
    if demo { demoTestChoose(j); return }
    editTest { T in
      guard let q = Optional(T.questions[T.at]), q.type == "choice", j >= 0, j < (q.options?.count ?? 0) else { return }
      T.answers[String(T.at)] = TestAnswer(pick: j)
    }
  }
  /// One word of a matching question gets a letter (the same letter again takes it back; a letter someone else had moves to this word).
  func testMatch(_ term: String, _ def: String) {
    if demo { if let t = Int(term.dropFirst()), let d = Int(def.dropFirst()) { demoTestMatch(t, d) }; return }
    editTest { T in
      let q = T.questions[T.at]
      guard q.type == "match", (q.terms ?? []).contains(where: { $0.id == term }), (q.defs ?? []).contains(where: { $0.id == def }) else { return }
      var a = T.answers[String(T.at)]?.pairs ?? [:]
      if a[term] == def { a[term] = nil }
      else { for (k, v) in a where v == def { a[k] = nil }; a[term] = def }
      T.answers[String(T.at)] = TestAnswer(pairs: a)
    }
  }
  /// What's written in the box of question `i` (the box tells which question it's for: when it lets go of its words as the next
  /// question comes up, they must not land on that one).
  func testType(_ text: String, at i: Int? = nil) {
    if demo { demoTest.typed = text; return }
    guard var T = testBox.session, T.phase == "taking", i == nil || i == T.at, T.questions[T.at].type == "type" else { return }
    T.answers[String(T.at)] = TestAnswer(typed: String(text.prefix(300)))
    testBox.session = T
    saveTest()
    objectWillChange.send()
  }
  func testGo(_ i: Int) {
    if demo { return }
    guard var T = testBox.session, T.phase == "taking", i >= 0, i < T.questions.count else { return }
    tickTest(&T); T.at = i
    testing = T
  }
  /// A step forward (1) or back (-1) through the questions.
  func testStep(_ d: Int) {
    if demo { demoTestStep(d); return }
    if let T = testBox.session { testGo(T.at + d) }
  }
  func testFlag() {
    if demo { demoTestFlag(); return }
    editTest { T in if T.flags[String(T.at)] == true { T.flags[String(T.at)] = nil } else { T.flags[String(T.at)] = true } }
  }
  // Time spent counts only while the test is open and showing; a gap (the app in the background, the phone asleep) isn't counted.
  private func tickTest(_ T: inout TestSession) {
    let t = nowMs()
    T.spent += min(max(0, t - T.tick), 2500); T.tick = t
  }
  private func testLeft(_ T: TestSession) -> Int? { T.limit > 0 ? max(0, T.limit * 60 - Int(T.spent / 1000)) : nil }
  static func clockLabel(_ sec: Int) -> String {
    let s = max(0, sec), h = s / 3600, m = s % 3600 / 60, r = s % 60
    return (h > 0 ? "\(h):" + String(format: "%02d", m) : "\(m)") + ":" + String(format: "%02d", r)
  }
  /// Once a second while a test is showing: counts the time, and ends a timed test when it's up.
  func testTick() {
    if demo { return }
    guard var T = testBox.session, T.phase == "taking", testOk(T) else { return }
    tickTest(&T)
    if T.limit > 0 && T.spent >= Double(T.limit) * 60000 { testBox.session = T; submitTest(timeUp: true); return }
    testBox.session = T
    let shown = testLeft(T).map(Store.clockLabel) ?? ""
    testBox.beat += 1
    if testBox.beat % 5 == 0 { saveTest() }
    if shown != testBox.clock { testBox.clock = shown; objectWillChange.send() }
  }
  func testSubmit() { if demo { demoTest.screen = "Results"; return }; submitTest(timeUp: false) }
  private func submitTest(timeUp: Bool) {
    guard var T = testBox.session, T.phase == "taking" else { return }
    tickTest(&T)
    let items = testItems(T), took = Int(((T.limit > 0 ? min(T.spent, Double(T.limit) * 60000) : T.spent) / 1000).rounded()), sc = score(items)
    T.phase = "results"; T.result = TestResultData(items: items, took: took, timeUp: timeUp, n: sc.n, right: sc.right, pct: sc.pct)
    testing = T
    guard !demo else { return }
    var payload: [String: Any] = ["took": took, "limit": T.limit, "timeUp": timeUp, "kinds": T.kinds, "items": items.map(\.json)]
    if let d = T.deckId { payload["deckId"] = d }
    if let f = T.folderId { payload["folderId"] = f }
    // Saved quietly (a failed save shows no alert; the results are here already).
    testBox.saving = Task { [weak self] in
      guard let self else { return }
      if let r = try? await self.api.action("test.save", ["test": payload]) {
        self.accept(r.state)
        if let id = r.result["id"] as? String, var now = self.testBox.session, now.phase == "results", now.result != nil, now.started == T.started { now.result?.savedId = id; self.testBox.session = now; self.saveTest() }
      }
    }
  }
  /// Leaving a test, or Done on its results: it's gone from this phone (a finished test is saved already).
  func testLeave() { if demo { demoTest = DemoTest(); return }; testBox.saving = nil; testing = nil }
  /// The spelling check missed a written answer (another word for the same thing): count it as right after all, and save that.
  func testCount(_ n: Int) {
    if demo { if TestSample.shared.wrong.contains(n) { demoTest.counted.insert(n) }; return }
    guard var T = testBox.session, var R = T.result, let i = R.items.firstIndex(where: { $0.n == n }), !R.items[i].ok, R.items[i].k == "type", !R.items[i].a.isEmpty else { return }
    R.items[i].ok = true; R.items[i].counted = true
    let sc = score(R.items); R.right = sc.right; R.pct = sc.pct
    T.result = R
    testing = T
    guard !demo else { return }
    let saving = testBox.saving, known = R.savedId
    Task { [weak self] in
      guard let self else { return }
      var id = known
      if id == nil { await saving?.value; id = self.testBox.session?.result?.savedId }
      if let id, let r = try? await self.api.action("test.fix", ["id": id, "n": n]) { self.accept(r.state) }
    }
  }
  /// The questions that were missed (all over again, with their answers in another order), as a new test.
  func testRetake() {
    if demo { demoTest.screen = "Multiple choice"; demoTest.flag = nil; return }
    guard var T = testBox.session, let R = T.result else { return }
    let bad = Set(R.items.filter { !$0.ok }.map { $0.n - 1 })
    let qs = T.questions.enumerated().filter { bad.contains($0.offset) }.map { reshuffled($0.element) }
    guard !qs.isEmpty else { return }
    let t = nowMs()
    T.questions = qs; T.answers = [:]; T.flags = [:]; T.at = 0; T.started = t; T.spent = 0; T.tick = t; T.phase = "taking"; T.result = nil
    testBox.clock = ""; testBox.saving = nil
    testing = T
  }
  /// The cards that were missed (the wrong pairs of a matching question), as a set for a review of just those.
  func testStudySet() -> String? {
    if demo { return nil }
    guard let R = testBox.session?.result else { return nil }
    var ids: [String] = []
    for x in R.items where !x.ok {
      for id in x.k == "match" ? (x.pairs ?? []).filter({ !$0.ok }).map(\.card) : [x.card] where !ids.contains(id) { ids.append(id) }
    }
    ids = ids.filter { id in lib.cards.first { $0.id == id }.map { Engine.studyable($0) } ?? false }
    return ids.isEmpty ? nil : "cards:" + ids.joined(separator: ",")
  }

  // ---------- what the screen shows ----------
  func testView() -> TestView? {
    if demo { return demoTestView() }
    guard let T = testing else { return nil }
    return view(of: T)
  }
  func view(of T: TestSession) -> TestView {
    let n = T.questions.count
    var v = TestView(name: T.name, n: n, limit: T.limit)
    if T.phase == "results", let R = T.result {
      v.phase = "results"; v.pct = R.pct; v.right = R.right; v.took = R.took; v.tookLabel = Store.clockLabel(R.took); v.timeUp = R.timeUp; v.missed = R.items.filter { !$0.ok }.count
      v.rows = R.items.map { x in
        TestRowView(n: x.n, kind: x.k, kindLabel: Store.testName[x.k] ?? "", q: x.q, claim: x.claim ?? "", a: x.a, r: x.r, card: x.card, ok: x.ok, counted: x.counted == true,
                    notAnswered: x.k != "match" && x.a.isEmpty, canCount: x.k == "type" && !x.ok && !x.a.isEmpty, pairs: x.pairs)
      }
      return v
    }
    let i = T.at, q = T.questions[i], a = T.answers[String(i)]
    let done = T.questions.enumerated().map { j, x in answered(x, T.answers[String(j)]) }
    var qv = TestQView(type: q.type, kind: q.kind, kindLabel: Store.testName[q.kind] ?? "", text: q.text.isEmpty ? "Match each one to its answer." : q.text, claim: q.claim ?? "", image: q.image, occ: q.occ)
    if q.type == "choice" { qv.options = (q.options ?? []).enumerated().map { ($1, a?.pick == $0) } }
    else if q.type == "type" { qv.typed = a?.typed ?? "" }
    else {
      let asked = a?.pairs ?? [:], defs = q.defs ?? []
      qv.defs = defs.enumerated().map { j, d in TestDefView(id: d.id, letter: Store.letters[j], label: d.label, by: (q.terms ?? []).firstIndex { asked[$0.id] == d.id }.map { $0 + 1 } ?? 0) }
      qv.terms = (q.terms ?? []).enumerated().map { j, t in
        TestTermView(id: t.id, n: j + 1, label: t.label, picked: asked[t.id].flatMap { id in defs.firstIndex { $0.id == id } }.map { Store.letters[$0] } ?? "",
                     chips: defs.enumerated().map { k, d in (d.id, Store.letters[k], asked[t.id] == d.id) })
      }
    }
    v.phase = "taking"; v.i = i; v.number = i + 1; v.q = qv; v.flagged = T.flags[String(i)] == true; v.answered = done.filter { $0 }.count; v.flags = T.flags.values.filter { $0 }.count
    v.unanswered = done.filter { !$0 }.count; v.canBack = i > 0; v.last = i == n - 1; v.left = testLeft(T); v.clock = testLeft(T).map(Store.clockLabel) ?? ""
    v.nav = T.questions.indices.map { j in (j + 1, done[j], T.flags[String(j)] == true, j == i) }
    return v
  }

  // ---------- past results ----------
  /// A deck's (or folder's) finished tests: when, how it went, newest first.
  func pastTests(_ s: TestScope) -> [PastRow] {
    if demo { return TestSample.shared.past.enumerated().map { PastRow(id: String($0.offset), day: $0.element.day, line: $0.element.line, pct: $0.element.pct, at: 0) } }
    let mine = lib.tests.filter { s.folderId != nil ? $0.folderId == s.folderId : $0.deckId == s.deckId }
    return mine.prefix(5).map { PastRow(id: $0.id, day: Store.dayLabel($0.at), line: "\($0.right) of \($0.n)", pct: $0.pct, at: $0.at) }
  }
  static func dayLabel(_ at: Double) -> String {
    let d = Date(timeIntervalSince1970: at / 1000), cal = Calendar.current
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    let y = cal.component(.year, from: d)
    return months[cal.component(.month, from: d) - 1] + " \(cal.component(.day, from: d))" + (y != cal.component(.year, from: Date()) ? ", \(y)" : "")
  }
  /// How the last test of a folder went, in a line (nil without one).
  func lastTestLine(_ s: TestScope) -> String? {
    guard let t = pastTests(s).first else { return nil }
    return "Last practice test: \(t.day) · \(t.line) · \(t.pct)%"
  }
}

#if DEBUG
/// `-testAudit`: an invisible element tells the end-to-end test which answer is right for the question on screen (debug builds only).
enum TestAudit {
  static let on = ProcessInfo.processInfo.arguments.contains("-testAudit")
}
extension Store {
  func testAuditValue() -> String {
    guard let T = testBox.session else { return "{}" }
    var o: [String: Any] = ["phase": T.phase, "n": T.questions.count]
    if T.phase == "results", let R = T.result { o["right"] = R.right; o["pct"] = R.pct; o["missed"] = R.items.filter { !$0.ok }.map(\.n) }
    else {
      let q = T.questions[T.at]
      o["at"] = T.at; o["kind"] = q.kind; o["type"] = q.type; o["text"] = q.text
      if let r = q.right, let opts = q.options { o["right"] = r; o["answer"] = opts[r]; o["options"] = opts }
      if let a = q.answer { o["answer"] = a }
      if let terms = q.terms, let defs = q.defs { o["terms"] = terms.map { t in ["label": t.label, "letter": Store.letters[defs.firstIndex { $0.id == t.id } ?? 0]] } }
      o["spent"] = Int(T.spent / 1000)
    }
    return (try? JSONSerialization.data(withJSONObject: o)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
  }
}
#endif
