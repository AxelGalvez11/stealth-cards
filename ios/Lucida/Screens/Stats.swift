// iPhone · Stats (PhoneStats, PhoneStatsEmpty): your streak and numbers, the days you studied, and the cards due
// each day ahead.
import SwiftUI

struct StatsVM {
  var empty = false
  var streak = "", remembered = "", reviews = "", cards = ""
  /// Study days, oldest week first, 7 a column: 0 (none) to 4 (busiest).
  var heat: [Int] = []
  var forecast = Forecast(vals: [], labels: [], tops: nil, names: [])
}

extension Store {
  func stats() -> StatsVM {
    if demo {
      if props.noStats { return StatsVM(empty: true, streak: "0 days", remembered: "—", reviews: "0", cards: "0") }
      let heat = (0..<(17 * 7)).map { i -> Int in let v = (i * 37 + (i % 7) * 11) % 13; return v < 3 ? 0 : v < 6 ? 1 : v < 9 ? 2 : v < 11 ? 3 : 4 }
      let X = Sample.shared.DUE_7
      return StatsVM(streak: "12 days", remembered: "90%", reviews: "1,284", cards: "2,470", heat: heat, forecast: Forecast(vals: X.vals, labels: X.labels, tops: nil, names: X.names))
    }
    let E = engine, st = E.streaks, now = nowMs()
    let logs = lib.logs.filter { $0.at >= now - 30 * DAY }, pct = Engine.rememberedPct(logs)
    if lib.logs.isEmpty { return StatsVM(empty: true, streak: "0 days", remembered: "—", reviews: "0", cards: grouped(lib.cards.count)) }
    // 17 weeks ending this week, Monday first; busier days are darker, compared with your busiest day.
    var counts: [Double: Int] = [:]
    for l in lib.logs { counts[dayAt(l.at), default: 0] += 1 }
    let monday = dayAt(now, -((weekday(now) + 6) % 7)), start = dayAt(monday, -16 * 7)
    let vals = (0..<(17 * 7)).map { counts[dayAt(start, $0)] ?? 0 }, top = max(1, vals.max() ?? 1)
    return StatsVM(streak: plural(st.streak, "day"), remembered: pct.map { "\($0)%" } ?? "—", reviews: grouped(logs.count), cards: grouped(lib.cards.count),
                   heat: vals.map { $0 == 0 ? 0 : min(4, 1 + Int(3.999 * Double($0) / Double(top))) }, forecast: E.forecast(7, lib.decks))
  }
}

struct StatsScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav

  var body: some View {
    let s = store.stats()
    let page = VStack(alignment: .leading, spacing: 14) {
      PageTitle("Stats")
      LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
        kpi("Streak", s.streak, s.empty); kpi("Remembered", s.remembered, s.empty); kpi("Reviews", s.reviews, s.empty); kpi("Cards", s.cards, s.empty)
      }
      if s.empty { empty } else {
        studyDays(s)
        VStack(alignment: .leading, spacing: 12) { DueChart(fc: s.forecast, span: "Next 7 days", maxH: 60, gap: 6, radius: 6) }
          .padding(18).background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.surf))
      }
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    Group {
      // No reviews yet: the page fills the screen, with the empty card taking the rest.
      if s.empty { page.frame(maxHeight: .infinity, alignment: .top) }
      else { ScrollView(showsIndicators: false) { page } }
    }
    .ignoresSafeArea()
  }

  private func kpi(_ label: String, _ value: String, _ empty: Bool) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(label).css(12).foregroundStyle(t.muted)
      if empty { Text(value).css(28, .bold, ls: -0.035).foregroundStyle(t.muted).lineLimit(1).lineBox(29.4) }
      else { Text(value).css(28, .bold, ls: -0.03).foregroundStyle(t.text).lineLimit(1) }
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }

  private var scale: [Color] { (t.dark ? [0x0B0B0F, 0x1E2452, 0x2F3D9A, 0x4C5FDB, 0x8C9AFC] : [0xFFFFFF, 0xDCE0FD, 0xB0BAFB, 0x7F8DF6, 0x4F60E6]).map { Color(hex: UInt32($0)) } }
  private func cell(_ lv: Int, _ size: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 4, style: .continuous).fill(scale[lv]).frame(width: size, height: size)
      .overlay(RoundedRectangle(cornerRadius: 4, style: .continuous).strokeBorder(lv == 0 ? t.line : .clear, lineWidth: 1))
  }

  private func studyDays(_ s: StatsVM) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text("Study days").css(15, .semibold)
        Spacer()
        HStack(spacing: 5) { Text("Less"); ForEach(0..<5, id: \.self) { cell($0, 12) }; Text("More") }.css(12).foregroundStyle(t.muted)
      }
      HStack(alignment: .top, spacing: 4) {
        ForEach(0..<(s.heat.count / 7), id: \.self) { w in
          VStack(spacing: 4) { ForEach(0..<7, id: \.self) { d in cell(s.heat[w * 7 + d], 14) } }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .clipped()
    }
    .padding(18)
    .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.surf))
  }

  private var empty: some View {
    EmptyBlock(art: 130, icon: "stats", title: "No stats yet", line: "Your streak, study days, and how much you remember show up after your first review.") {
      Button { nav.newDeck() } label: {
        HStack(spacing: 8) { Icon("plus", 16, 2); Text("Make a deck").css(15, .semibold) }
          .foregroundStyle(t.invText).padding(.horizontal, 22).frame(height: 48).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
    .padding(20)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.surf))
  }
}

/// Cards due each day: the count on each bar, darker periwinkle for busier days, and the busiest called out.
struct DueChart: View {
  @Environment(\.theme) private var t
  let fc: Forecast
  let span: String
  var maxH: CGFloat = 60
  var gap: CGFloat = 6
  var radius: CGFloat = 6
  @State private var grown = false
  var body: some View {
    let peak = fc.vals.max() ?? 0, mx = max(1, peak), top = fc.vals.firstIndex(of: peak) ?? 0
    let fcScale = (t.dark ? [0x2A3374, 0x3A4BB0, 0x5569E4, 0x8C9AFC] : [0xC9CFFC, 0x9DA9F8, 0x7282F0, 0x4353E0]).map { Color(hex: UInt32($0)) }
    let color = { (n: Int) in fcScale[n == mx ? 3 : Double(n) >= Double(mx) * 0.75 ? 2 : Double(n) >= Double(mx) * 0.4 ? 1 : 0] }
    VStack(alignment: .leading, spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Cards due each day").css(15, .semibold)
        Text("\(span) · \(fc.vals.reduce(0, +)) cards in all").css(12).foregroundStyle(t.muted)
      }
      HStack(alignment: .bottom, spacing: gap) {
        ForEach(Array(fc.vals.enumerated()), id: \.offset) { i, n in
          VStack(spacing: 5) {
            Text("\(n)").css(11, .semibold, mono: true).foregroundStyle(i == top ? t.text : t.muted)
            RoundedRectangle(cornerRadius: radius, style: .continuous).fill(color(n))
              .frame(height: max(6, (CGFloat(n) / CGFloat(mx) * maxH).rounded()))
              .scaleEffect(y: grown ? 1 : 0, anchor: .bottom)
              .animation(.out(0.6).delay(0.04 * Double(i + 1)), value: grown)
            Text(i < fc.labels.count ? fc.labels[i] : "").css(11, i == top ? .semibold : .regular, lh: 1.3).foregroundStyle(i == top ? t.text : t.muted).lineLimit(1).fixedSize()
          }
          .frame(maxWidth: .infinity)
        }
      }
      HStack(spacing: 8) {
        RoundedRectangle(cornerRadius: 3).fill(fcScale[3]).frame(width: 10, height: 10)
        Text(peak > 0 ? "Busiest: \(fc.names[top]), \(mx) cards" : "Nothing due yet").css(12).foregroundStyle(t.muted)
      }
    }
    .onAppear { grown = true }
  }
}
