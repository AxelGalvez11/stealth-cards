// iPhone · Session done (PhoneDone, PhoneDonePiles): how much you remembered on a half ring (or, after sorting into
// piles, how many went in each), the grades, your streak, and when the next review is. Done goes back to the deck's page
// (to Today after reviewing every deck).
import SwiftUI

struct SessionVM {
  var pct = 100, goal = 90, cards = 0, minutes = 0, fresh = 0
  var split = [0, 0, 0, 0]
  var streak = 0
  var next = "Nothing due"
  var sorted = 0
  var onlyPiles = false
  var piles: [(name: String, n: Int, total: Int)] = []
  var deckId: String?
}

extension Store {
  func sessionView() -> SessionVM {
    if demo {
      return SessionVM(pct: 91, goal: 90, cards: 40, minutes: 12, fresh: 3, split: [3, 5, 25, 7], streak: 13, next: "Tomorrow · 32", sorted: 12, onlyPiles: props.onlyPiles,
                       piles: [("Know it", 7, 18), ("Almost", 3, 6), ("No clue", 2, 3)], deckId: "cell")
    }
    let E = engine, g = session?.graded ?? [], rated = g.filter { $0.rating != nil }
    let d = session?.deckId.flatMap { E.deck($0) }
    let piled = g.filter { $0.pile != nil }
    var names = d?.piles.map(\.name) ?? []
    for x in piled where !names.contains(x.pile!) { names.append(x.pile!) }
    let nx = E.nextDue
    return SessionVM(pct: rated.isEmpty ? 100 : Int((Double(rated.filter { ($0.rating ?? 0) > 1 }.count) / Double(rated.count) * 100).rounded()),
                     goal: d?.goal ?? lib.settings.goal, cards: g.count,
                     minutes: session.map { max(1, Int(((nowMs() - $0.started) / MIN).rounded())) } ?? 0,
                     fresh: g.filter { $0.was == "new" }.count, split: (1...4).map { r in rated.filter { $0.rating == r }.count },
                     streak: E.streaks.streak, next: nx.map { $0.short + " · \($0.n)" } ?? "Nothing due",
                     sorted: piled.count, onlyPiles: !piled.isEmpty && rated.isEmpty,
                     piles: names.map { name in (name, piled.filter { $0.pile == name }.count, (d.map { E.cards(of: $0.id) } ?? lib.cards).filter { $0.pile == name }.count) },
                     deckId: session?.deckId)
  }
}

struct DoneScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav

  var body: some View {
    let ss = store.sessionView()
    VStack(spacing: 22) {
      if ss.onlyPiles { piles(ss) } else {
        VStack(spacing: 10) {
          Meter(pct: ss.pct, width: 260, stroke: 20)
          Text(ss.pct > ss.goal ? "Above your \(ss.goal)% goal" : ss.pct == ss.goal ? "Right at your \(ss.goal)% goal" : "Below your \(ss.goal)% goal")
            .css(14, .semibold).foregroundStyle(Color(hex: t.dark ? 0x8C9AFC : 0x4353E0))
        }
      }
      VStack(spacing: 6) {
        Text("Session complete").css(30, .bold, ls: -0.03)
        Text(ss.onlyPiles ? "\(ss.sorted) sorted · \(ss.minutes) min" : plural(ss.cards, "card") + " · \(ss.minutes) min · \(ss.fresh) new learned").css(15).foregroundStyle(t.muted)
      }
      .multilineTextAlignment(.center)
      if !ss.onlyPiles { split(ss) }
      HStack(spacing: 8) {
        tile("Streak", plural(ss.streak, "day"))
        tile("Next", ss.next.components(separatedBy: " · ").first ?? ss.next)
      }
      Spacer(minLength: 0)
      BigButton(label: "Done", height: 58, size: 17) { store.session = nil; nav.leave(to: ss.deckId) }
    }
    .foregroundStyle(t.text)
    .padding(.top, Screen.top(64)).padding(.horizontal, 20).padding(.bottom, 34)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(t.bg)
    .ignoresSafeArea()
  }

  private func split(_ ss: SessionVM) -> some View {
    let total = max(1, ss.split.reduce(0, +)), colors = [t.again, t.hard, t.good, t.easy], names = ["Forgot", "Hard", "Good", "Easy"]
    return VStack(alignment: .leading, spacing: 10) {
      GeometryReader { g in
        let shown = (0..<4).filter { ss.split[$0] > 0 }, gaps = CGFloat(max(0, shown.count - 1)) * 3
        HStack(spacing: 3) {
          ForEach(shown, id: \.self) { i in colors[i].frame(width: max(0, (g.size.width - gaps) * CGFloat(ss.split[i]) / CGFloat(total))) }
        }
      }
      .frame(height: 12)
      .clipShape(Capsule())
      HStack(spacing: 0) {
        ForEach(0..<4, id: \.self) { i in Text("\(names[i]) \(ss.split[i])").css(13).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading) }
      }
    }
  }

  private func tile(_ label: String, _ value: String) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(label).css(12).foregroundStyle(t.muted)
      Text(value).css(20, .bold).lineLimit(1)
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
  }

  // After sorting into piles: each pile's count this time, with a bar for its share (donePiles).
  private func piles(_ ss: SessionVM) -> some View {
    let all = max(1, ss.sorted), ink = t.dark ? [Color(hex: 0x3A4BB0), Color(hex: 0x8C9AFC)] : [Color(hex: 0xB0BAFB), Color(hex: 0x4353E0)]
    return HStack(spacing: 8) {
      ForEach(Array(ss.piles.enumerated()), id: \.offset) { _, p in
        Button { if p.total > 0 { store.startReview(ss.deckId, pile: p.name); nav.study(deckId: ss.deckId, pile: p.name) } } label: {
          VStack(alignment: .leading, spacing: 4) {
            Text("\(p.n)").css(34, .semibold, ls: -0.03).lineBox(34)
            Text(p.name).css(13, .semibold).foregroundStyle(t.muted).lineLimit(1)
            GeometryReader { g in
              ZStack(alignment: .leading) {
                Capsule().fill(t.surf2)
                Capsule().fill(LinearGradient(colors: ink, startPoint: .leading, endPoint: .trailing)).frame(width: g.size.width * CGFloat(p.n) / CGFloat(all))
              }
            }
            .frame(height: 6).padding(.top, 8)
          }
          .foregroundStyle(t.text)
          .padding(.top, 16).padding(.horizontal, 14).padding(.bottom, 14)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
          .overlay(alignment: .topTrailing) {
            Icon("chev", 12, 2.2).foregroundStyle(p.total == 0 ? t.surf2 : t.text).frame(width: 24, height: 24).background(Circle().fill(t.bg)).padding(12)
          }
        }
        .buttonStyle(.press)
        .disabled(p.total == 0)
        .accessibilityLabel("Go over \(p.name)")
      }
    }
  }
}

/// METER: a gray half ring that fills in periwinkle up to the score, with a knob there, and the score under it.
struct Meter: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  let pct: Int
  let width: CGFloat
  let stroke: CGFloat
  @State private var drawn = false
  var body: some View {
    let r = (width - stroke) / 2 - 6, cx = width / 2, cy = r + stroke / 2 + 6, h = ceil(cy + stroke / 2 + 2)
    let ang = Double.pi * (1 - min(0.999, max(0.001, Double(pct) / 100)))
    let kx = cx + r * CGFloat(cos(ang)), ky = cy - r * CGFloat(sin(ang))
    let colors = t.dark ? [Color(hex: 0x3A4BB0), Color(hex: 0x8C9AFC)] : [Color(hex: 0xB0BAFB), Color(hex: 0x4353E0)]
    ZStack(alignment: .bottom) {
      Canvas { ctx, _ in
        var track = Path(); track.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .degrees(180), endAngle: .degrees(360), clockwise: false)
        ctx.stroke(track, with: .color(t.surf2), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
      }
      Path { p in p.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .degrees(180), endAngle: .radians(2 * .pi - ang), clockwise: false) }
        .trim(from: 0, to: drawn ? 1 : 0)
        .stroke(LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
      Circle().fill(t.bg).overlay(Circle().stroke(colors[1], lineWidth: 4)).frame(width: (stroke / 2 + 5) * 2, height: (stroke / 2 + 5) * 2)
        .position(x: kx, y: ky).scaleEffect(drawn ? 1 : 0.3, anchor: .center).opacity(drawn ? 1 : 0)
      VStack(spacing: 2) {
        Text("\(pct)%").css((width / 5).rounded(), .semibold, ls: -0.04).lineBox((width / 5).rounded())
        Text("remembered").css(13).foregroundStyle(t.muted)
      }
    }
    .frame(width: width, height: h)
    .onAppear {
      if still { drawn = true; return }
      withAnimation(.out(0.9)) { drawn = true }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(pct)% remembered")
  }
}
