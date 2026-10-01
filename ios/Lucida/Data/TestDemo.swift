// The practice test on a design screen: the canvas's sample test (design/test-boards.mjs TEST_SAMPLE), drawn the way the
// board draws it, and moving like the board does (a pick marks an answer, Next goes through the kinds, Submit shows the
// results). Nothing is saved.
import Foundation

struct TestSample {
  struct Row { let kind: String, q: String, claim: String, a: String, r: String; let pairs: [(q: String, a: String, r: String)]? }
  let name: String, cards: Int, n: Int
  let answered: [Int], flagged: [Int], wrong: [Int]
  let at: [String: Int]
  let mc: (text: String, options: [String]), blank: (text: String, options: [String]), tf: (text: String, claim: String)
  let type: String
  let terms: [String], defs: [String]
  let rows: [Row]
  let explain: String
  let past: [(day: String, line: String, pct: Int)]

  static let shared = TestSample()
  private init() {
    let j = (try? JSONSerialization.jsonObject(with: Data(Generated.testSampleJSON.utf8))) as? [String: Any] ?? [:]
    func strs(_ v: Any?) -> [String] { v as? [String] ?? [] }
    func ints(_ v: Any?) -> [Int] { (v as? [NSNumber])?.map(\.intValue) ?? [] }
    name = j["name"] as? String ?? ""; cards = j["cards"] as? Int ?? 0; n = j["n"] as? Int ?? 0
    answered = ints(j["answered"]); flagged = ints(j["flagged"]); wrong = ints(j["wrong"])
    at = (j["at"] as? [String: Int]) ?? [:]
    let mcA = j["mc"] as? [Any] ?? [], blankA = j["blank"] as? [Any] ?? [], tfA = j["tf"] as? [Any] ?? []
    mc = (mcA.first as? String ?? "", strs(mcA.last)); blank = (blankA.first as? String ?? "", strs(blankA.last)); tf = (tfA.first as? String ?? "", tfA.last as? String ?? "")
    type = j["type"] as? String ?? ""
    let m = j["match"] as? [Any] ?? []
    terms = strs(m.first); defs = strs(m.last)
    rows = (j["rows"] as? [[Any]] ?? []).map { r in
      Row(kind: r[0] as? String ?? "", q: r[1] as? String ?? "", claim: r[2] as? String ?? "", a: r[3] as? String ?? "", r: r[4] as? String ?? "",
          pairs: r.count > 5 ? (r[5] as? [[String]])?.map { ($0[0], $0[1], $0[2]) } : nil)
    }
    explain = j["explain"] as? String ?? ""
    past = (j["past"] as? [[Any]] ?? []).map { ($0[0] as? String ?? "", $0[1] as? String ?? "", ($0[2] as? NSNumber)?.intValue ?? 0) }
  }
}

/// What a design screen has changed: the screen the board's picker shows, answers, a flag, written answers counted, and so on.
struct DemoTest {
  var screen = "Set up"
  var mc: Int? = 0, tf: Int? = 1, blank: Int? = 0, typed = "protons", match: [Int: Int] = [0: 1, 1: 3, 2: 4]
  var flag: Bool? = nil
  var counted: Set<Int> = []
  var exOn: Set<Int> = []
  var only: String? = nil
}

extension Store {
  static let demoFlow = ["Multiple choice", "True or false", "Fill in the blank", "Matching", "Written"]
  private static let demoKind = ["Multiple choice": "mc", "True or false": "tf", "Fill in the blank": "blank", "Written": "type", "Matching": "match", "Submit": "type", "Leave": "mc"]

  /// A design screen's test (the board's Tweaks: screen, and the timer).
  func demoTestView() -> TestView? {
    let X = TestSample.shared, d = demoTest
    if d.screen.hasPrefix("Results") {
      var v = TestView(name: X.name, n: 20, limit: 20)
      v.phase = "results"
      v.rows = X.rows.enumerated().map { i, r in
        let n = i + 1, bad = X.wrong.contains(n) && !d.counted.contains(n)
        return TestRowView(n: n, kind: r.kind, kindLabel: Store.testName[r.kind] ?? "", q: r.q, claim: r.claim, a: r.a, r: r.r, card: "", ok: !bad, counted: d.counted.contains(n), notAnswered: r.pairs == nil && r.a.isEmpty,
                           canCount: r.kind == "type" && bad && !r.a.isEmpty,
                           pairs: r.pairs?.map { TestPair(card: "", q: $0.q, a: $0.a, r: $0.r, ok: $0.a == $0.r) })
      }
      v.right = v.rows.filter(\.ok).count; v.pct = Int((Double(v.right) / 20 * 100).rounded()); v.missed = 20 - v.right; v.tookLabel = "14:32"
      return v
    }
    let kind = Store.demoKind[d.screen] ?? "mc", submit = d.screen == "Submit", at = submit ? X.at["submit"] ?? 20 : X.at[kind] ?? 3
    var q = TestQView(type: "choice", kind: kind, kindLabel: Store.testName[kind] ?? "", text: "")
    var done = false
    switch kind {
    case "mc", "blank":
      let s = kind == "mc" ? X.mc : X.blank, pick = kind == "mc" ? d.mc : d.blank
      q.text = s.text; q.options = s.options.enumerated().map { ($1, pick == $0) }; done = pick != nil
    case "tf":
      q.text = X.tf.text; q.claim = X.tf.claim; q.options = ["True", "False"].enumerated().map { ($1, d.tf == $0) }; done = d.tf != nil
    case "type":
      q.type = "type"; q.text = X.type; q.typed = d.typed; done = !d.typed.trimmingCharacters(in: .whitespaces).isEmpty
    default:
      q.type = "match"; q.text = "Match each one to its answer."
      q.defs = X.defs.enumerated().map { j, l in TestDefView(id: "d\(j)", letter: Store.letters[j], label: l, by: (d.match.first { $0.value == j }?.key).map { $0 + 1 } ?? 0) }
      q.terms = X.terms.enumerated().map { i, l in
        TestTermView(id: "t\(i)", n: i + 1, label: l, picked: d.match[i].map { Store.letters[$0] } ?? "", chips: X.defs.indices.map { k in ("d\(k)", Store.letters[k], d.match[i] == k) })
      }
      done = d.match.count == 5
    }
    let flagged = d.flag ?? X.flagged.contains(at)
    let answeredSet = X.answered.filter { $0 != at } + (done ? [at] : []), flagSet = X.flagged.filter { $0 != at } + (flagged ? [at] : [])
    var v = TestView(name: X.name, n: X.n, limit: props.testTimed ? 20 : 0)
    v.phase = "taking"; v.i = at - 1; v.number = at; v.q = q; v.flagged = flagged; v.answered = answeredSet.count; v.flags = flagSet.count; v.unanswered = X.n - answeredSet.count
    v.canBack = at > 1; v.last = submit; v.left = props.testTimed ? 872 : nil; v.clock = props.testTimed ? "14:32" : ""
    v.nav = (1...X.n).map { ($0, answeredSet.contains($0), flagSet.contains($0), $0 == at) }
    return v
  }

  // The design screens' moves, like the board's.
  func demoTestChoose(_ j: Int) {
    switch Store.demoKind[demoTest.screen] ?? "mc" {
    case "mc": demoTest.mc = j
    case "tf": demoTest.tf = j
    case "blank": demoTest.blank = j
    default: break
    }
  }
  func demoTestMatch(_ term: Int, _ def: Int) {
    if demoTest.match[term] == def { demoTest.match[term] = nil }
    else { for (k, v) in demoTest.match where v == def { demoTest.match[k] = nil }; demoTest.match[term] = def }
  }
  /// The number of the sample question each screen shows.
  private var demoAt: Int { let X = TestSample.shared; return demoTest.screen == "Submit" ? X.at["submit"] ?? 20 : X.at[Store.demoKind[demoTest.screen] ?? "mc"] ?? 3 }
  func demoTestFlag() { demoTest.flag = !(demoTest.flag ?? TestSample.shared.flagged.contains(demoAt)) }
  func demoTestStep(_ d: Int) {
    let i = Store.demoFlow.firstIndex(of: demoTest.screen) ?? 0
    if d < 0 { demoTest.screen = Store.demoFlow[max(0, i - 1)] }
    else if i >= Store.demoFlow.count - 1 { demoTest.screen = "Submit" } else { demoTest.screen = Store.demoFlow[i + 1] }
    demoTest.flag = nil
  }
}
