// Tune to you (Pro), ported from web/tune.js: fits FSRS's 19 parameters (FSRS.swift) to one person's own reviews, so the
// gaps match how fast they really forget. It replays every card's reviews the way the scheduler does, predicts how likely
// each review was to be remembered, and moves the parameters to make those predictions fit what happened (the log loss).
// Like FSRS's own optimizer, it first fits a new card's stability from each first grade, then refines everything with
// Adam, within the same limits (FSRS.BOUNDS) and pulled gently toward the standard parameters when there's little to go
// on. The same steps in the same order as the web's, so the same reviews give (nearly) the same fit.
import Foundation

enum Tune {
  static let P = 19
  /// Enough to tune: this many graded reviews, of which this many were reviews of cards you'd already learned.
  static let MIN = 400, ITEMS = 100
  /// How far each parameter usually sits from the standard one across many people (FSRS's own figures). A bigger spread
  /// lets a parameter move more freely.
  static let SPREAD = [6.61, 9.52, 17.69, 27.74, 0.55, 0.28, 0.67, 0.12, 0.4, 0.18, 0.34, 0.27, 0.08, 0.14, 0.57, 0.25, 1.03, 0.27, 0.39]

  /// One graded review of a card: its grade (1 to 4), the state the card was in, and days since the review before.
  struct Rev { var g: Int; var was: UInt8; var t: Double }
  static let NEW: UInt8 = 0, LEARNING: UInt8 = 1, REVIEW: UInt8 = 2, RELEARNING: UInt8 = 3
  static func stateCode(_ s: String?) -> UInt8? { switch s { case "new": return NEW; case "learning": return LEARNING; case "review": return REVIEW; case "relearning": return RELEARNING; default: return nil } }

  struct Histories { var data: [[Rev]] = [], reviews = 0, items = 0 }
  struct Fit { var w: [Double], loss: Double?, base: Double?, gain: Double, n: Int, reviews: Int, items: Int }

  /// Every card's graded reviews, in order, from decks FSRS schedules. A card whose history doesn't start from new (it was
  /// reset, or reviewed while FSRS was off) is left out, since its memory can't be replayed.
  @_optimize(speed)
  static func histories(_ lib: Library) -> Histories {
    let on = Set(lib.decks.filter { $0.grading != "piles" }.map(\.id))
    var order: [String] = [], byCard: [String: [ReviewLog]] = [:]
    for l in lib.logs {
      guard let r = l.rating, r != 0, l.kind == nil || l.kind == "", on.contains(l.deckId) else { continue }
      if byCard[l.cardId] == nil { order.append(l.cardId); byCard[l.cardId] = [] }
      byCard[l.cardId]!.append(l)
    }
    var out = Histories()
    for id in order {
      // A stable sort by time, like the web's.
      let logs = byCard[id]!.enumerated().sorted { $0.element.at != $1.element.at ? $0.element.at < $1.element.at : $0.offset < $1.offset }.map(\.element)
      guard logs[0].was == "new", !logs.dropFirst().contains(where: { $0.was == "new" || stateCode($0.was) == nil }) else { continue }
      var card: [Rev] = []
      for (i, l) in logs.enumerated() {
        var last = l.at
        if i > 0 { last = (l.prevLast ?? 0) != 0 ? l.prevLast! : logs[i - 1].at }
        card.append(Rev(g: Int(min(4, max(1, FSRS.jsRound(Double(l.rating ?? 0))))), was: stateCode(l.was) ?? NEW, t: max(0, (l.at - last) / DAY)))
      }
      out.reviews += card.count
      out.items += card.filter { $0.was == REVIEW && $0.t >= 1 }.count
      out.data.append(card)
    }
    return out
  }

  /// Reviews laid out flat for the fit's inner loop: every card's reviews one after another (`start` says where each card's
  /// begin), so the loop reads plain memory. (The same numbers as [[Rev]].)
  struct Flat {
    var g: [Int] = [], was: [UInt8] = [], t: [Double] = [], start: [Int] = [0]
    var cards: Int { start.count - 1 }
    init(_ data: [[Rev]]) {
      for c in data { for r in c { g.append(r.g); was.append(r.was); t.append(r.t) }; start.append(g.count) }
    }
  }

  /// The summed log loss of `w` over every review of a learned card (the ones the scheduler predicts), and, given `grad`
  /// (19 zeros), its gradient, worked out alongside (forward mode: each value carries how it moves with every parameter).
  /// It reads through pointers and counts with plain loops, so it stays quick in a build without optimizing too.
  static func loss(_ data: [[Rev]], _ w: [Double], grad: UnsafeMutablePointer<Double>? = nil) -> (sum: Double, n: Int) { loss(Flat(data), w, grad: grad) }
  @_optimize(speed)
  static func loss(_ d: Flat, _ w: [Double], grad: UnsafeMutablePointer<Double>? = nil) -> (sum: Double, n: Int) {
    let P = Tune.P, FACTOR = FSRS.FACTOR
    let mem = UnsafeMutablePointer<Double>.allocate(capacity: P * 5)
    defer { mem.deallocate() }
    let dS = mem, dD = mem + P, nS = mem + 2 * P, nD = mem + 3 * P, dR = mem + 4 * P
    for k in 0..<(P * 5) { mem[k] = 0 }
    var sum = 0.0, n = 0
    w.withUnsafeBufferPointer { w in
    d.g.withUnsafeBufferPointer { gs in d.was.withUnsafeBufferPointer { was in d.t.withUnsafeBufferPointer { ts in d.start.withUnsafeBufferPointer { start in
      let d04raw = w[4] - exp(3 * w[5]) + 1, d04 = FSRS.clamp(d04raw, 1, 10), d04in = d04raw > 1 && d04raw < 10, e3 = exp(3 * w[5])
      let w7 = w[7], w6 = w[6]
      var ci = 0
      while ci < start.count - 1 {
        var S = 0.1, D = 5.0
        var k = 0
        while k < P { dS[k] = 0; dD[k] = 0; k += 1 }
        var ri = start[ci]
        let end = start[ci + 1]
        ci += 1
        while ri < end {
          let g = gs[ri], state = was[ri], rt = ts[ri]
          ri += 1
          if state == NEW {
            // A new card: stability from its first grade, difficulty from the grade too.
            S = max(w[g - 1], 0.1); k = 0; while k < P { dS[k] = 0; k += 1 }; if w[g - 1] > 0.1 { dS[g - 1] = 1 }
            let e = exp(w[5] * Double(g - 1)), x = w[4] - e + 1
            D = FSRS.clamp(x, 1, 10); k = 0; while k < P { dD[k] = 0; k += 1 }
            if x > 1 && x < 10 { dD[4] = 1; dD[5] = -Double(g - 1) * e }
            continue
          }
          if state == REVIEW && rt >= 1 {
            // A review of a learned card: how likely it was to be remembered, then its new stability.
            let base = 1 + FACTOR * rt / S, R = pow(base, -0.5), dRdS = 0.5 * FACTOR * rt / (S * S) * pow(base, -1.5)
            k = 0; while k < P { dR[k] = dRdS * dS[k]; k += 1 }
            let p = FSRS.clamp(R, 1e-6, 1 - 1e-6), y = g > 1
            sum -= y ? log(p) : log(1 - p); n += 1
            if let grad, p == R { let dL = y ? -1 / p : 1 / (1 - p); k = 0; while k < P { grad[k] += dL * dR[k]; k += 1 } }
            if g == 1 {
              // Forgotten: stability starts again lower, never above what it was.
              let a = w[11], bD = pow(D, -w[12]), sp = pow(S + 1, w[13]), c = sp - 1, e = exp(w[14] * (1 - R)), F = a * bD * c * e
              if F < S {
                k = 0
                while k < P {
                  let dbD = bD * (-w[12] * dD[k] / D), dc = sp * (w[13] * dS[k] / (S + 1)), de = e * (-w[14] * dR[k])
                  nS[k] = a * (dbD * c * e + bD * dc * e + bD * c * de)
                  k += 1
                }
                nS[11] += bD * c * e; nS[12] += a * bD * (-log(D)) * c * e; nS[13] += a * bD * sp * log(S + 1) * e; nS[14] += a * bD * c * e * (1 - R)
                S = F; k = 0; while k < P { dS[k] = nS[k]; k += 1 }
              }
            } else {
              // Remembered: stability grows, more when it was harder to remember, less for a stable or difficult card.
              let h = g == 2 ? w[15] : 1, b = g == 4 ? w[16] : 1, E8 = exp(w[8]), A0 = E8 * (11 - D) * pow(S, -w[9]), e10 = exp(w[10] * (1 - R))
              let A = A0 * (e10 - 1), inc = A * h * b, lnS = log(S)
              k = 0
              while k < P {
                let dA0 = A0 * (-dD[k] / (11 - D) - w[9] * dS[k] / S), dA = dA0 * (e10 - 1) + A0 * e10 * (-w[10] * dR[k])
                nS[k] = dS[k] * (1 + inc) + S * dA * h * b
                k += 1
              }
              nS[8] += S * A * h * b; nS[9] += S * A0 * (-lnS) * (e10 - 1) * h * b; nS[10] += S * A0 * e10 * (1 - R) * h * b
              if g == 2 { nS[15] += S * A * b }
              if g == 4 { nS[16] += S * A * h }
              S = S * (1 + inc); k = 0; while k < P { dS[k] = nS[k]; k += 1 }
            }
          } else {
            // A learning step, or a second look the same day: short-term stability.
            let x = Double(g - 3) + w[18], e = exp(w[17] * x)
            k = 0; while k < P { nS[k] = dS[k] * e; k += 1 }
            nS[17] += S * e * x; nS[18] += S * e * w[17]
            S = S * e; k = 0; while k < P { dS[k] = nS[k]; k += 1 }
          }
          // Difficulty after any grade but a card's first: nudged by the grade, drawn back a little toward an easy card's.
          let q = Double(g - 3) / 9, X = D - w6 * q * (10 - D), Y = w7 * d04 + (1 - w7) * X
          k = 0; while k < P { nD[k] = (1 - w7) * dD[k] * (1 + w6 * q); k += 1 }
          nD[6] += (1 - w7) * (-q * (10 - D)); nD[7] += d04 - X
          if d04in { nD[4] += w7; nD[5] += w7 * -3 * e3 }
          D = FSRS.clamp(Y, 1, 10)
          if Y > 1 && Y < 10 { k = 0; while k < P { dD[k] = nD[k]; k += 1 } } else { k = 0; while k < P { dD[k] = 0; k += 1 } }
        }
      }
    } } } } }
    return (sum, n)
  }
  /// The average log loss of `w` (lower fits better), for comparing parameters.
  static func logLoss(_ data: [[Rev]], _ w: [Double]) -> Double? { let r = loss(data, w); return r.n > 0 ? r.sum / Double(r.n) : nil }

  /// A new card's stability after each first grade: the gap at which the reviews after it were remembered at the rate
  /// they were. Grades with too few cards keep the standard value; the four stay in order (Forgot ≤ Hard ≤ Good ≤ Easy).
  @_optimize(speed)
  static func pretrain(_ data: [[Rev]], _ w: [Double]) -> [Double] {
    var out = Array(w[0..<4])
    var seen: [[(t: Double, m: Double, y: Double)]] = [[], [], [], []]
    for card in data {
      guard card[0].was == NEW else { continue }
      var m = 1.0
      for r in card.dropFirst() {
        if r.was == REVIEW && r.t >= 1 { seen[card[0].g - 1].append((r.t, m, r.g > 1 ? 1 : 0)); break }
        if r.was != LEARNING { break }
        m *= exp(w[17] * (Double(r.g - 3) + w[18]))
      }
    }
    for (i, list) in seen.enumerated() {
      if list.count < 20 { continue }
      // The stability with the lowest log loss, found by narrowing in on it (the loss has one low point).
      func f(_ ls: Double) -> Double {
        let s = exp(ls)
        var L = 0.0
        for (t, m, y) in list { let p = FSRS.clamp(pow(1 + FSRS.FACTOR * t / (s * m), -0.5), 1e-6, 1 - 1e-6); L -= y != 0 ? log(p) : log(1 - p) }
        // A light pull toward the standard value, worth a few cards.
        return L + 2 * pow(ls - log(w[i]), 2)
      }
      var a = log(FSRS.BOUNDS[i].0), b = log(FSRS.BOUNDS[i].1)
      let k = (5.0.squareRoot() - 1) / 2
      for _ in 0..<80 { let c = b - k * (b - a), d = a + k * (b - a); if f(c) < f(d) { b = d } else { a = c } }
      out[i] = FSRS.clamp(exp((a + b) / 2), FSRS.BOUNDS[i].0, FSRS.BOUNDS[i].1)
    }
    for i in 1..<4 { out[i] = max(out[i], out[i - 1]) }
    return out
  }

  /// Adam from the standard parameters `w0` (a new card's stabilities fitted first), with the step size easing off as it
  /// goes and a pull toward the standard parameters that matters less the more reviews there are. Gives the best point.
  @_optimize(speed)
  static func adam(_ data: [[Rev]], _ w0: [Double], _ steps: Int, _ gamma: Double, _ progress: (Double) -> Void) -> [Double] {
    let P = Tune.P
    var w = w0
    for (i, s) in pretrain(data, w0).enumerated() { w[i] = s }
    let flat = Flat(data), n = loss(flat, w).n
    if n == 0 { return w0 }
    var m = [Double](repeating: 0, count: P), v = [Double](repeating: 0, count: P)
    let pull = gamma / Double(n)
    var best = w, bestJ = Double.infinity, calm = 0
    let grad = UnsafeMutablePointer<Double>.allocate(capacity: P)
    defer { grad.deallocate() }
    var it = 1
    while it <= steps {
      for k in 0..<P { grad[k] = 0 }
      let r = loss(flat, w, grad: grad)
      var J = r.sum / Double(n)
      for k in 0..<P {
        let z = (w[k] - w0[k]) / SPREAD[k]
        J += pull * z * z; grad[k] = grad[k] / Double(n) + 2 * pull * z / SPREAD[k]
      }
      if J < bestJ - 1e-7 { bestJ = J; best = w; calm = 0 } else { calm += 1; if calm > 40 { break } }
      let lr = 0.004 + 0.036 * (1 + cos(Double.pi * Double(it) / Double(steps))) / 2
      for k in 0..<P {
        m[k] = 0.9 * m[k] + 0.1 * grad[k]; v[k] = 0.999 * v[k] + 0.001 * grad[k] * grad[k]
        let mh = m[k] / (1 - pow(0.9, Double(it))), vh = v[k] / (1 - pow(0.999, Double(it)))
        w[k] = FSRS.clamp(w[k] - lr * mh / (vh.squareRoot() + 1e-8), FSRS.BOUNDS[k].0, FSRS.BOUNDS[k].1)
      }
      if it % 10 == 0 { progress(Double(it) / Double(steps)) }
      it += 1
    }
    return FSRS.cleanW(best) ?? w0
  }

  /// The fit. It checks itself first: fitted on all but a fifth of the cards at a time, the parameters have to predict the
  /// fifth left out better than the standard ones do; if they don't, a few hundred reviews were too few to tell, and the
  /// standard parameters stay. `w`: the standard parameters, `steps`: most Adam steps, `gamma`: the pull toward them,
  /// `folds`; `progress` gets 0 to 1.
  @_optimize(speed)
  static func fit(_ input: Histories, w: [Double]? = nil, steps: Int = 300, gamma: Double = 2, folds K: Int = 5, progress: (Double) -> Void = { _ in }) -> Fit {
    let data = input.data, w0 = FSRS.cleanW(w) ?? FSRS.W
    let all = loss(data, w0), base: Double? = all.n > 0 ? all.sum / Double(all.n) : nil
    if all.n == 0 { return Fit(w: w0, loss: base, base: base, gain: 0, n: 0, reviews: input.reviews, items: input.items) }
    var std = 0.0, tuned = 0.0
    for f in 0..<K {
      let train = data.enumerated().filter { $0.offset % K != f }.map(\.element), test = data.enumerated().filter { $0.offset % K == f }.map(\.element)
      let wf = adam(train, w0, steps, gamma) { p in progress((Double(f) + p) / Double(K + 1)) }
      std += loss(test, w0).sum; tuned += loss(test, wf).sum
    }
    let gain = (std - tuned) / Double(all.n)
    if !(gain > 0) { progress(1); return Fit(w: w0, loss: base, base: base, gain: gain, n: all.n, reviews: input.reviews, items: input.items) }
    let wt = adam(data, w0, steps, gamma) { p in progress((Double(K) + p) / Double(K + 1)) }, after = logLoss(data, wt)
    progress(1)
    return Fit(w: wt, loss: after, base: base, gain: gain, n: all.n, reviews: input.reviews, items: input.items)
  }
}
