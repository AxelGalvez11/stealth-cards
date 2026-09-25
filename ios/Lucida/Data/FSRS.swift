// FSRS-5 with Anki-style learning steps (web/fsrs.js, ported). The server grades cards; the app uses this to show each
// grade's next gap on the buttons ("1m", "10m", "4d", "9d").
import Foundation

enum FSRS {
  static let W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]
  static let DECAY = -0.5, FACTOR = 19.0 / 81

  static func clamp(_ x: Double, _ a: Double, _ b: Double) -> Double { min(b, max(a, x)) }
  static func recall(_ days: Double, _ s: Double) -> Double { pow(1 + FACTOR * days / s, DECAY) }
  static func gapDays(_ s: Double, _ goal: Double, _ maxDays: Int) -> Int { Int(clamp((s / FACTOR * (pow(goal, 1 / DECAY) - 1)).rounded(), 1, Double(maxDays))) }
  static func s0(_ g: Int) -> Double { max(W[g - 1], 0.1) }
  static func d0(_ g: Int) -> Double { clamp(W[4] - exp(W[5] * Double(g - 1)) + 1, 1, 10) }
  static func nextD(_ d: Double, _ g: Int) -> Double { clamp(W[7] * d0(4) + (1 - W[7]) * (d - W[6] * Double(g - 3) * (10 - d) / 9), 1, 10) }
  static func recallS(_ d: Double, _ s: Double, _ r: Double, _ g: Int) -> Double {
    s * (1 + exp(W[8]) * (11 - d) * pow(s, -W[9]) * (exp(W[10] * (1 - r)) - 1) * (g == 2 ? W[15] : 1) * (g == 4 ? W[16] : 1))
  }
  static func forgetS(_ d: Double, _ s: Double, _ r: Double) -> Double { min(s, W[11] * pow(d, -W[12]) * (pow(s + 1, W[13]) - 1) * exp(W[14] * (1 - r))) }
  static func sameDayS(_ s: Double, _ g: Int) -> Double { s * exp(W[17] * (Double(g) - 3 + W[18])) }
  /// "1m", "10m", "1h", "1d" as minutes.
  static func stepMinutes(_ x: String) -> Double {
    let t = x.trimmingCharacters(in: .whitespaces)
    guard let unit = t.last, let n = Double(t.dropLast().trimmingCharacters(in: .whitespaces)) else { return 1 }
    return n * (unit == "h" ? 60 : unit == "d" ? 1440 : 1)
  }

  /// Every grade's result for a card. goal: how much to remember; maxDays: the longest gap; steps: learning steps.
  static func preview(_ card: SRS, now: Double, goal g0: Double = 0.9, maxDays: Int = 36500, steps st: [String] = ["1m", "10m"], relearn rl: [String] = ["10m"]) -> [Int: SRS] {
    let goal = clamp(g0, 0.7, 0.99), steps = st.map(stepMinutes), relearn = rl.map(stepMinutes)
    let c = card
    var base = c; base.reps = c.reps + 1; base.last = now
    func learn(_ n: SRS, _ list: [Double], _ i: Int) -> SRS {
      var o = n; o.state = c.state == "review" || c.state == "relearning" ? "relearning" : "learning"; o.step = i; o.due = now + list[i] * MIN; return o
    }
    func hardWait(_ list: [Double], _ i: Int) -> Double { i == 0 ? (list.count > 1 ? (list[0] + list[1]) / 2 : list[0] * 1.5) : list[i] }
    func graduate(_ n: SRS, _ days: Int) -> SRS { var o = n; o.state = "review"; o.step = 0; o.days = days; o.due = dayAt(now, days); return o }
    var out: [Int: SRS] = [:]
    if c.state == "new" || c.state == "learning" || c.state == "relearning" {
      let list = c.state == "relearning" ? relearn : steps, i = c.state == "new" ? 0 : min(c.step, max(list.count - 1, 0))
      for g in 1...4 {
        var n = base
        n.s = c.state == "new" ? s0(g) : sameDayS(c.s, g); n.d = c.state == "new" ? d0(g) : nextD(c.d, g)
        if c.state == "relearning" && g == 1 { n.lapses = c.lapses }
        let nextStep = c.state == "new" ? (g == 3 ? 1 : 0) : i + 1
        if list.isEmpty || g == 4 || (g == 3 && nextStep >= list.count) { out[g] = graduate(n, gapDays(n.s, goal, maxDays)) }
        else if g == 1 { out[g] = learn(n, list, 0) }
        else if g == 2 { var o = learn(n, list, i); o.due = now + hardWait(list, i) * MIN; out[g] = o }
        else { out[g] = learn(n, list, nextStep) }
      }
      // Graduating with Easy always waits longer than graduating with Good.
      if out[3]!.state == "review", let e = out[4]?.days, let g3 = out[3]?.days, e <= g3 { out[4] = graduate(out[4]!, min(maxDays, g3 + 1)) }
      return out
    }
    let days = max(0, (now - c.last) / DAY), r = recall(days, c.s), sameDay = days < 1
    func ns(_ g: Int) -> Double { sameDay ? sameDayS(c.s, g) : recallS(c.d, c.s, r, g) }
    var hard = gapDays(ns(2), goal, maxDays), good = gapDays(ns(3), goal, maxDays), easy = gapDays(ns(4), goal, maxDays)
    hard = min(hard, good); good = max(good, hard + 1); easy = max(easy, good + 1)
    var lapse = base; lapse.lapses = c.lapses + 1; lapse.s = sameDay ? sameDayS(c.s, 1) : forgetS(c.d, c.s, r); lapse.d = nextD(c.d, 1)
    out[1] = relearn.isEmpty ? graduate(lapse, gapDays(lapse.s, goal, maxDays)) : learn(lapse, relearn, 0)
    var h = base; h.s = ns(2); h.d = nextD(c.d, 2); out[2] = graduate(h, min(hard, maxDays))
    var gd = base; gd.s = ns(3); gd.d = nextD(c.d, 3); out[3] = graduate(gd, min(good, maxDays))
    var ez = base; ez.s = ns(4); ez.d = nextD(c.d, 4); out[4] = graduate(ez, min(easy, maxDays))
    return out
  }

  /// A wait as a short label: 1m, 10m, 1h, 4d, 3mo, 1.2y.
  static func waitLabel(_ card: SRS, _ now: Double) -> String {
    if card.state == "review" {
      let d = card.days ?? max(1, Int(((card.due - now) / DAY).rounded()))
      return d < 30 ? "\(d)d" : d < 365 ? "\(Int((Double(d) / 30.4).rounded()))mo" : "\(trim((Double(d) / 36.5).rounded() / 10))y"
    }
    let m = max(1, Int(((card.due - now) / MIN).rounded()))
    return m < 60 ? "\(m)m" : m < 1440 ? "\(Int((Double(m) / 60).rounded()))h" : "\(Int((Double(m) / 1440).rounded()))d"
  }
  /// 1.0 as "1", 1.2 as "1.2" (like JavaScript numbers print).
  static func trim(_ x: Double) -> String { x == x.rounded() ? String(Int(x)) : String(x) }
}
