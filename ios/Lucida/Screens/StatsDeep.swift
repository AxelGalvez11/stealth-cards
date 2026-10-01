// iPhone · Stats, Pro's deep tabs (PhoneStatsMemory, PhoneStatsWeak, PhoneStatsPace, PhoneStatsUpgrade): what you remember
// (week by week, by tag, this month against last), what you're weak at (weakest tags and hardest cards, each with a way to
// study just those; the cards you keep forgetting; how hard your cards are), and your pace (time per card, what's coming,
// how your gaps grow, exams). On Free, the tabs show a Go Pro card.
import SwiftUI

/// The numbers the deep tabs show, worked out like the board does (its renderVals).
struct DeepStyle {
  let t: Theme
  let goal: Int
  /// Green at your goal, amber within 5 points of it, red under; a color for the bar and one for the words.
  func bar(_ v: Int?) -> Color { v == nil ? .clear : v! >= goal ? Color(hex: 0x30A46C) : v! >= goal - 5 ? Color(hex: 0xF5A524) : Color(hex: 0xE5484D) }
  func ink(_ v: Int?) -> Color { v == nil ? t.muted : v! >= goal ? t.good : v! >= goal - 5 ? t.hard : t.again }
  /// Periwinkle by load, from the heat map's family: the busiest gets the darkest bar (the lightest, in dark mode).
  var scale: [Color] { (t.dark ? [0x2A3374, 0x3A4BB0, 0x5569E4, 0x8C9AFC] : [0xC9CFFC, 0x9DA9F8, 0x7282F0, 0x4353E0]).map { Color(hex: UInt32($0)) } }
  func shade(_ v: Double, _ top: Double) -> Color { scale[top == 0 ? 0 : v >= top ? 3 : v >= top * 0.66 ? 2 : v >= top * 0.33 ? 1 : 0] }
  func num(_ n: Int) -> String { grouped(n) }
  /// "8.2 s", "12 s".
  func secs(_ v: Double?) -> String { v == nil ? "—" : FSRS.trim(v! < 10 ? FSRS.jsRound(v! * 10) / 10 : FSRS.jsRound(v!)) + " s" }
  /// "Aug 3" (month and day), and week labels that name the month only where it changes.
  static func dayName(_ ts: Double) -> String {
    let c = Calendar.current.dateComponents([.month, .day], from: Date(timeIntervalSince1970: ts / 1000))
    return SHORT_MONTHS[c.month! - 1] + " \(c.day!)"
  }
  static func monthName(_ ts: Double) -> String { SHORT_MONTHS[Calendar.current.component(.month, from: Date(timeIntervalSince1970: ts / 1000)) - 1] }
  static func weekName(_ starts: [Double], _ i: Int) -> String {
    let cal = Calendar.current, d = Date(timeIntervalSince1970: starts[i] / 1000)
    if i == 0 { return dayName(starts[i]) }
    let was = Date(timeIntervalSince1970: starts[i - 1] / 1000)
    return cal.component(.month, from: was) != cal.component(.month, from: d) ? dayName(starts[i]) : String(cal.component(.day, from: d))
  }
}

/// Words that wrap the way a browser wraps them (SwiftUI's Text moves a lone last word down to the line above; this doesn't).
struct WebText: View {
  @Environment(\.theme) private var t
  let text: String
  let size: CGFloat
  var weight: Font.Weight = .regular
  /// The line height, a multiple of the size (1.3 is CSS "normal").
  var lh: CGFloat = GEIST_LINE
  var color: Color? = nil
  var body: some View {
    LabelText(text: Rich.nsText([Rich.Run(t: text, m: "")], size: size, weight: weight, lh: lh, color: UIColor(color ?? t.text), dark: t.dark))
  }
}

/// A card on the Stats page: a title (and a line under it), then what it holds (deepCard).
struct StatsCard<Content: View>: View {
  @Environment(\.theme) private var t
  let title: String
  var sub: String? = nil
  @ViewBuilder var content: Content
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        Text(title).css(15, .semibold)
        if let sub { Text(sub).css(12).foregroundStyle(t.muted) }
      }
      content
    }
    .padding(18)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.surf))
  }
}

/// What a card says when it has nothing to show yet.
struct StatsEmpty: View {
  @Environment(\.theme) private var t
  let line: String
  var body: some View {
    Text(line).css(14, lh: 1.45).foregroundStyle(t.muted).multilineTextAlignment(.center)
      .padding(.horizontal, 16).padding(.vertical, 8).frame(maxWidth: .infinity, minHeight: 72)
  }
}

/// A bar that grows up from its base as it comes in (sc-grow).
struct GrowBar: View {
  let color: Color
  let height: CGFloat
  var radius: CGFloat = 6
  var index = 0
  @State private var grown = false
  var body: some View {
    RoundedRectangle(cornerRadius: radius, style: .continuous).fill(color).frame(height: height)
      .scaleEffect(y: grown ? 1 : 0, anchor: .bottom)
      .animation(.out(0.6).delay(0.04 * Double(index + 1)), value: grown)
      .onAppear { grown = true }
  }
}

/// Bars with their numbers on top and labels under, side by side (the memory and pace charts).
struct BarChart: View {
  @Environment(\.theme) private var t
  struct Col { var v: String, h: CGFloat, c: Color, label: String, strong: Bool }
  let cols: [Col]
  let height: CGFloat
  /// A dashed line across the bars this far from the bottom (the memory goal), if any.
  var line: CGFloat? = nil
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(alignment: .bottom, spacing: 6) {
        ForEach(Array(cols.enumerated()), id: \.offset) { i, b in
          VStack(spacing: 4) {
            Text(b.v).css(11, .semibold, mono: true).foregroundStyle(b.strong ? t.text : t.muted).lineLimit(1).fixedSize()
            GrowBar(color: b.c, height: b.h, index: i)
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
      }
      .frame(height: height)
      .overlay(alignment: .bottom) {
        if let line { DashedLine().stroke(t.text, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])).frame(height: 1.5).opacity(0.28).offset(y: -line) }
      }
      HStack(spacing: 6) {
        ForEach(Array(cols.enumerated()), id: \.offset) { _, b in
          Text(b.label).css(11, b.strong ? .semibold : .regular).foregroundStyle(b.strong ? t.text : t.muted).lineLimit(1).frame(maxWidth: .infinity)
        }
      }
    }
  }
}
struct DashedLine: Shape {
  func path(in r: CGRect) -> Path { var p = Path(); p.move(to: CGPoint(x: r.minX, y: r.midY)); p.addLine(to: CGPoint(x: r.maxX, y: r.midY)); return p }
}

/// A tag's dot, name, bar against your goal, and score (the memory by tag rows), with a Study button on the weak spots.
struct TagRow: View {
  @Environment(\.theme) private var t
  let g: InsightsData.TagStat
  let style: DeepStyle
  var study: (() -> Void)? = nil
  var body: some View {
    HStack(spacing: 10) {
      HStack(spacing: 8) {
        Circle().fill(Tags.color(g.tag).color).frame(width: 8, height: 8)
        Text(g.tag).css(14).lineLimit(1).truncationMode(.tail)
      }
      .frame(width: 96, alignment: .leading)
      GeometryReader { p in
        ZStack(alignment: .leading) {
          Capsule().fill(t.surf2).frame(height: 8)
          Capsule().fill(style.bar(g.pct)).frame(width: p.size.width * CGFloat(g.pct ?? 0) / 100, height: 8)
          RoundedRectangle(cornerRadius: 1).fill(t.text).opacity(0.35).frame(width: 2, height: 16).offset(x: p.size.width * CGFloat(style.goal) / 100 - 1)
        }
        .frame(maxHeight: .infinity)
      }
      .frame(height: 16)
      Text(g.pct.map { "\($0)%" } ?? "—").css(13, .semibold, mono: true).foregroundStyle(style.ink(g.pct)).frame(width: 40, alignment: .trailing)
      if let study {
        Button(action: study) { Text("Study").css(12, .semibold).foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(t.bg)) }
          .buttonStyle(.press).accessibilityLabel("Study \(g.tag)")
      }
    }
    .frame(minHeight: 40)
  }
}

/// A small pill button under a card's list (Study these, See all).
struct StatsPill: View {
  @Environment(\.theme) private var t
  let label: String
  var solid = false
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(label).css(13, .semibold).foregroundStyle(solid ? t.invText : t.text).lineLimit(1).fixedSize()
        .padding(.horizontal, 14).frame(height: 32).background(Capsule().fill(solid ? t.inv : t.bg))
    }
    .buttonStyle(.press)
  }
}

/// A big number with a line beside it (the forgetting cards and Forgotten often cards).
struct BigNumber: View {
  @Environment(\.theme) private var t
  let big: String, sub: String
  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      Text(big).css(34, .semibold, ls: -0.035).lineLimit(1).lineBox(34)
      Text(sub).css(13).foregroundStyle(t.muted).lineLimit(1).truncationMode(.tail)
    }
  }
}

struct DeepStats: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let tab: String
  let goal: Int

  var body: some View {
    let x = store.insights(), style = DeepStyle(t: t, goal: goal)
    switch tab {
    case "Memory": memory(x, style)
    case "Weak spots": weak(x, style)
    default: pace(x, style)
    }
  }

  /// The decks the cards you keep forgetting are in, the most cards first (three at most); decks with as many keep the order
  /// they first show up in.
  private func leechDecks(_ leeches: [InsightsData.Leech]) -> [(name: String, n: Int)] {
    var order: [String] = [], count: [String: Int] = [:]
    for c in leeches { if count[c.deck] == nil { order.append(c.deck) }; count[c.deck, default: 0] += 1 }
    let all = order.enumerated().map { (i: $0.offset, name: $0.element, n: count[$0.element] ?? 0) }
    return all.sorted { $0.n != $1.n ? $0.n > $1.n : $0.i < $1.i }.prefix(3).map { (name: $0.name, n: $0.n) }
  }
  private func studySet(_ set: String) { store.startReview(nil, set: set); nav.study(set: set) }
  private func showCards(_ filter: String) { nav.libFilter = filter; nav.libCards = true; nav.pick(.library) }

  /// Four numbers in two columns (the tiles at the top of Memory and Pace).
  private func tiles(_ list: [(label: String, value: String, sub: String, color: Color)]) -> some View {
    LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
      ForEach(Array(list.enumerated()), id: \.offset) { _, k in
        VStack(alignment: .leading, spacing: 2) {
          Text(k.label).css(12).foregroundStyle(t.muted).lineLimit(1)
          Text(k.value).css(26, .bold, ls: -0.035, lh: 1.05).foregroundStyle(k.color).lineLimit(1)
          Text(k.sub).css(12).foregroundStyle(t.muted).lineLimit(1)
        }
        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
      }
    }
  }

  // ---------- Memory ----------
  @ViewBuilder private func memory(_ x: InsightsData, _ s: DeepStyle) -> some View {
    let m = x.memory
    tiles([("Remembered", m.retention.pct.map { "\($0)%" } ?? "—", "Goal: \(goal)%", s.ink(m.retention.pct)),
           ("Reviews of learned cards", s.num(m.retention.n), "This month", t.text),
           ("Flashcards", m.modes.cards.pct.map { "\($0)%" } ?? "—", m.modes.cards.n > 0 ? "Right · \(s.num(m.modes.cards.n)) answers" : "No answers yet", t.text),
           ("Learn mode", m.modes.learn.pct.map { "\($0)%" } ?? "—", m.modes.learn.n > 0 ? "Right · \(s.num(m.modes.learn.n)) answers" : "No answers yet", t.text)])
    let tr = Array(m.trend.suffix(8)), vis = tr.compactMap(\.pct)
    let lo = vis.isEmpty ? 50 : max(0, min(70, Int((Double(vis.min()! - 8) / 10).rounded(.down)) * 10)), H = 100.0
    StatsCard(title: m.byMonth ? "Remembered, month by month" : "Remembered, week by week", sub: m.byMonth ? "The last 8 months" : "The last 8 weeks") {
      if vis.isEmpty { StatsEmpty(line: "This fills in as you review cards you’ve learned.") }
      else {
        BarChart(cols: tr.enumerated().map { i, b in
          .init(v: b.pct.map { "\($0)%" } ?? "", h: b.pct == nil ? 0 : max(6, CGFloat(FSRS.jsRound(Double(b.pct! - lo) / Double(100 - lo) * H))), c: s.bar(b.pct),
                label: m.byMonth ? DeepStyle.monthName(b.start) : DeepStyle.weekName(tr.map(\.start), i), strong: i == tr.count - 1)
        }, height: 118, line: max(0, CGFloat(FSRS.jsRound(Double(goal - lo) / Double(100 - lo) * H))))
      }
    }
    StatsCard(title: "Remembered, by tag", sub: "The line marks your \(goal)% goal") {
      if m.byTag.isEmpty { StatsEmpty(line: "Tag your cards to see which topics you remember best.") }
      VStack(spacing: 0) { ForEach(Array(m.byTag.prefix(5).enumerated()), id: \.offset) { _, g in TagRow(g: g, style: s) } }
    }
    StatsCard(title: "This month against last", sub: "By tag") {
      if m.improved.isEmpty && m.slipping.isEmpty { StatsEmpty(line: "Shows up after two months of reviews on the same tags.") }
      else {
        VStack(alignment: .leading, spacing: 14) {
          moves("Most improved", t.good, m.improved)
          moves("Slipping", t.again, m.slipping)
        }
      }
    }
  }

  private func moves(_ title: String, _ color: Color, _ list: [InsightsData.Move]) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(title).css(13, .semibold).foregroundStyle(color)
      ForEach(Array(list.enumerated()), id: \.offset) { _, m in
        HStack(spacing: 8) {
          Circle().fill(Tags.color(m.tag).color).frame(width: 8, height: 8)
          Text(m.tag).css(14).lineLimit(1).truncationMode(.tail).frame(maxWidth: .infinity, alignment: .leading)
          Text("\(m.before ?? 0) → \(m.after ?? 0)%").css(12, mono: true).foregroundStyle(t.muted).lineLimit(1).fixedSize()
          Text((m.delta > 0 ? "+" : "−") + "\(abs(m.delta))").css(12, .semibold, mono: true).foregroundStyle(color).frame(width: 36, alignment: .trailing)
        }
        .frame(minHeight: 32)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  // ---------- Weak spots ----------
  @ViewBuilder private func weak(_ x: InsightsData, _ s: DeepStyle) -> some View {
    let w = x.weak
    StatsCard(title: "Weakest tags", sub: "Remembered least") {
      if w.weakTags.isEmpty { StatsEmpty(line: "Tag your cards to see which topics are weakest.") }
      VStack(spacing: 0) { ForEach(Array(w.weakTags.prefix(5).enumerated()), id: \.offset) { _, g in TagRow(g: g, style: s, study: { studySet("tag:" + g.tag) }) } }
    }
    StatsCard(title: "Hardest cards") {
      if w.hardest.isEmpty { StatsEmpty(line: "None yet. Cards show up here once you forget them.") }
      VStack(spacing: 0) {
        ForEach(Array(w.hardest.prefix(4).enumerated()), id: \.offset) { _, h in
          Button { nav.newCard(deckId: h.deckId, cardId: store.demo ? nil : h.id) } label: {
            VStack(alignment: .leading, spacing: 2) {
              Text(h.front).css(14, .medium).foregroundStyle(t.text).lineLimit(1).truncationMode(.tail)
              Text(h.deck + " · " + (h.lapses > 0 ? "forgot \(h.lapses) " + (h.lapses == 1 ? "time" : "times") : "difficulty \(FSRS.trim(h.d))")).css(12).foregroundStyle(t.muted).lineLimit(1).truncationMode(.tail)
            }
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
            .padding(.top, 1)
            .overlay(alignment: .top) { Rectangle().fill(t.line).frame(height: 1) }
            .contentShape(Rectangle())
          }
          .buttonStyle(.flat)
        }
      }
      if !w.hardest.isEmpty {
        HStack(spacing: 8) {
          StatsPill(label: "Study these", solid: true) { studySet("hard") }
          StatsPill(label: "See all") { showCards("hard") }
        }
      }
    }
    let paused = w.leeches.filter(\.paused).count
    StatsCard(title: "Cards you keep forgetting") {
      BigNumber(big: s.num(w.leeches.count), sub: w.leeches.isEmpty ? "None right now" : paused > 0 ? "\(paused) paused" : "")
      if !w.leeches.isEmpty {
        // The decks they're in, most first.
        VStack(spacing: 0) {
          ForEach(Array(leechDecks(w.leeches).enumerated()), id: \.offset) { _, x in
            HStack(spacing: 12) {
              Text(x.name).css(14).lineLimit(1).truncationMode(.tail).frame(maxWidth: .infinity, alignment: .leading)
              Text("\(x.n)").css(13, .semibold, mono: true)
            }
            .frame(minHeight: 34).padding(.top, 1).overlay(alignment: .top) { Rectangle().fill(t.line).frame(height: 1) }
          }
        }
        HStack(spacing: 8) {
          if w.leeches.contains(where: { !$0.paused }) { StatsPill(label: "Study them", solid: true) { studySet("leech") } }
          StatsPill(label: "See them") { showCards("leech") }
        }
      }
    }
    StatsCard(title: "Forgotten often") {
      if w.forgot.of == 0 { StatsEmpty(line: "Shows up once you review cards you’ve learned.") }
      else {
        BigNumber(big: w.forgot.pct.map { "\($0)%" } ?? "—", sub: "of \(s.num(w.forgot.of)) reviews")
        let mx = Double(max(1, w.lapseDist.map(\.n).max() ?? 1))
        MiniBars(cols: w.lapseDist.map { ($0.label, max(3, CGFloat(FSRS.jsRound(Double($0.n) / mx * 60))), $0.label == "0" ? t.surf2 : s.shade(Double($0.n), mx)) }, height: 60)
        Text("Cards by times forgotten").css(12).foregroundStyle(t.muted)
      }
    }
    StatsCard(title: "How hard your cards are") {
      if w.studied == 0 { StatsEmpty(line: "Shows up once you’ve studied some cards.") }
      else {
        let mx = Double(max(1, w.diffDist.map(\.n).max() ?? 1))
        MiniBars(cols: w.diffDist.map { ($0.label, max(3, CGFloat(FSRS.jsRound(Double($0.n) / mx * 70))), s.shade(Double($0.n), mx)) }, height: 70)
        HStack { Text("Easy"); Spacer(); Text("Hard") }.css(12).foregroundStyle(t.muted)
      }
    }
  }

  // ---------- Pace ----------
  @ViewBuilder private func pace(_ x: InsightsData, _ s: DeepStyle) -> some View {
    let p = x.pace, tm = p.time, timed = tm.n >= 5
    tiles([("Time per card", timed ? s.secs(tm.perCard) : "—", timed ? s.num(tm.n) + " cards timed" : "Starts with your next review", t.text),
           ("Per right answer", timed ? s.secs(tm.perRight) : "—", timed ? s.num(Int(FSRS.jsRound(tm.minutes))) + " minutes in all" : "", t.text),
           ("Right answers a minute", timed && tm.rightPerMin != nil ? FSRS.trim(FSRS.jsRound(tm.rightPerMin! * 10) / 10) : "—", "This month", t.text),
           ("Learn mode", tm.learnN > 0 ? s.secs(tm.perQuestion) : "—", tm.learnN > 0 ? "A question" : "No answers yet", t.text)])
    let amax = Double(max(1, p.ahead.map(\.n).max() ?? 1))
    StatsCard(title: "Reviews coming up", sub: s.num(p.ahead.reduce(0) { $0 + $1.n }) + " in the next 8 weeks") {
      if !p.ahead.contains(where: { $0.n > 0 }) { StatsEmpty(line: "Nothing coming up yet.") }
      else {
        BarChart(cols: p.ahead.enumerated().map { i, b in
          .init(v: s.num(b.n), h: max(4, CGFloat(FSRS.jsRound(Double(b.n) / amax * 90))), c: s.shade(Double(b.n), amax), label: i > 0 ? DeepStyle.weekName(p.ahead.map(\.start), i) : "Now", strong: i == 0)
        }, height: 108)
      }
    }
    let gs = Array(p.gaps.suffix(8)), gv = gs.compactMap(\.days), gmax = max(1, gv.max() ?? 1)
    StatsCard(title: "How your gaps are growing", sub: "The typical wait before a review") {
      if gv.isEmpty { StatsEmpty(line: "This fills in as you review cards you’ve learned.") }
      else {
        BarChart(cols: gs.enumerated().map { i, b in
          .init(v: b.days.map { "\(Int(FSRS.jsRound($0)))d" } ?? "", h: b.days == nil ? 0 : max(4, CGFloat(FSRS.jsRound(b.days! / gmax * 90))), c: b.days == nil ? .clear : s.shade(b.days!, gmax),
                label: x.memory.byMonth ? DeepStyle.monthName(b.start) : DeepStyle.weekName(gs.map(\.start), i), strong: i == gs.count - 1)
        }, height: 108)
      }
    }
    StatsCard(title: "Exams") {
      if p.exams.isEmpty { StatsEmpty(line: "No exams coming up. Add an exam date in a deck’s settings.") }
      ForEach(Array(p.exams.enumerated()), id: \.offset) { _, e in
        VStack(alignment: .leading, spacing: 10) {
          VStack(alignment: .leading, spacing: 2) {
            Text(e.name).css(15, .semibold)
            Text(e.line).css(13).foregroundStyle(t.muted)
          }
          ForEach([("Seen", e.total > 0 ? Double(e.seen) / Double(e.total) : 0), ("Learned", e.total > 0 ? Double(e.learned) / Double(e.total) : 0), ("Likely to remember", e.likely)], id: \.0) { label, v in
            let pct = Int(FSRS.jsRound(v * 100))
            VStack(alignment: .leading, spacing: 6) {
              HStack(spacing: 8) { Text(label).css(13).foregroundStyle(t.muted); Spacer(minLength: 0); Text("\(pct)%").css(13, .semibold, mono: true) }
              GeometryReader { g in
                ZStack(alignment: .leading) {
                  Capsule().fill(t.surf2)
                  Capsule().fill(label == "Likely to remember" ? s.bar(pct) : Color(hex: 0x7282F0)).frame(width: g.size.width * CGFloat(pct) / 100)
                }
              }
              .frame(height: 8)
            }
          }
        }
        .padding(.top, 4)
      }
    }
  }
}

/// A row of small bars with a label under each (the forgotten-often and difficulty charts).
struct MiniBars: View {
  @Environment(\.theme) private var t
  let cols: [(label: String, h: CGFloat, c: Color)]
  let height: CGFloat
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(alignment: .bottom, spacing: 4) {
        ForEach(Array(cols.enumerated()), id: \.offset) { i, b in GrowBar(color: b.c, height: b.h, radius: 4, index: i).frame(maxWidth: .infinity) }
      }
      .frame(height: height, alignment: .bottom)
      HStack(spacing: 4) {
        ForEach(Array(cols.enumerated()), id: \.offset) { _, b in Text(b.label).css(10, mono: true).foregroundStyle(t.muted).lineLimit(1).frame(maxWidth: .infinity) }
      }
    }
  }
}

/// On Free, the deep tabs are this: a sky with three sample cards, what Pro adds, and the price (statsUpgrade).
struct StatsUpgrade: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  @EnvironmentObject private var store: Store
  var body: some View {
    // (The canvas shows its sample prices; the app shows the App Store's own, once it has them, and Go Pro until then.)
    let shop = store.shop, offers = store.demo ? [] : shop.offers.sorted { $0.id == "monthly" && $1.id != "monthly" }
    let sky = t.gray ? (top: 0x1B2A48, mid: 0x1F2B45, low: 0x212637) : t.dark ? (top: 0x081733, mid: 0x0D2148, low: 0x0A1530) : (top: 0x86BDF3, mid: 0xC9E2FB, low: 0xEDF5FE)
    let stops: [Gradient.Stop] = [.init(color: Color(hex: UInt32(sky.top)), location: 0), .init(color: Color(hex: UInt32(sky.mid)), location: 0.58),
                                  .init(color: Color(hex: UInt32(sky.low)), location: 0.82), .init(color: t.bg, location: 1)]
    VStack(spacing: 0) {
      LinearGradient(stops: stops, startPoint: .top, endPoint: .bottom)
        .frame(height: 170)
        .overlay { samples.scaleEffect(0.66).offset(y: 170 * 0.04) }
        .clipped().accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 18) {
        VStack(alignment: .leading, spacing: 8) {
          HStack(spacing: 10) { Text("See what you’re weak at").css(22, .semibold, ls: -0.03).lineLimit(1).fixedSize(); ProBadge() }
          WebText(text: "What you remember, what you’re weak at and why, and what to study next.", size: 15, lh: 1.5, color: t.muted)
        }
        VStack(alignment: .leading, spacing: 10) {
          ForEach(["Memory by deck, tag, and week", "Your weakest tags and hardest cards", "Time per card and exam readiness"], id: \.self) { x in
            HStack(spacing: 10) {
              Icon("check", 13, 2.6).foregroundStyle(.white).frame(width: 22, height: 22)
                .background(Circle().fill(LinearGradient(colors: [Color(hex: 0x7E94FB), Color(hex: 0x2CB2EA)], startPoint: .topLeading, endPoint: .bottomTrailing)))
              Text(x).css(15)
            }
          }
        }
        let line = store.demo ? "Yearly works out to $4.17 a month. Cancel anytime." : shop.yearlyLine
        if !line.isEmpty { WebText(text: line, size: 14, color: t.muted) }
        // Each price is its own button, so paying never picks yearly for you (it opens Go Pro with that one picked).
        HStack(spacing: 10) {
          if store.demo || offers.count > 1 {
            ForEach(store.demo ? [("monthly", "$5.99 a month"), ("yearly", "$49.99 a year")] : offers.map { ($0.id, $0.price + " " + $0.per) }, id: \.0) { id, label in
              Button { shop.pick = id; nav.goPro() } label: {
                Text(label).css(15, .semibold).foregroundStyle(id == "yearly" ? t.invText : t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(id == "yearly" ? t.inv : t.surf))
              }.buttonStyle(.press)
            }
          } else {
            Button { nav.goPro() } label: {
              Text("Go Pro").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
            }.buttonStyle(.press)
          }
        }
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.bottom, 20).padding(.top, -6)
    }
    .background(t.bg)
    .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 32, style: .continuous).strokeBorder(t.line, lineWidth: 1))
  }

  /// Three sample cards, a little tilted: a weak tag, a chart, and the time a card takes.
  private var samples: some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 8) {
        Text("Reactions").css(13, .semibold)
        ZStack(alignment: .leading) { Capsule().fill(Color(hex: 0xEDEDED)); GeometryReader { g in Capsule().fill(Color(hex: 0xE5484D)).frame(width: g.size.width * 0.71) } }.frame(height: 7)
        Text("71%").css(12, .semibold, mono: true).foregroundStyle(Color(hex: 0xD92D20))
      }
      .padding(.horizontal, 16).padding(.vertical, 14).frame(width: 150, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.white).boxShadow(Color(hex: 0x14165A, opacity: 0.45), y: 16, blur: 32, spread: -16, radius: 18))
      .rotationEffect(.degrees(-5))
      HStack(alignment: .bottom, spacing: 6) {
        ForEach([0.40, 0.58, 0.50, 0.72, 0.88], id: \.self) { f in RoundedRectangle(cornerRadius: 4, style: .continuous).fill(Color(hex: 0x7282F0)).frame(maxWidth: .infinity).frame(height: 68 * f) }
      }
      .padding(14).frame(width: 120, height: 96)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.white).boxShadow(Color(hex: 0x14165A, opacity: 0.45), y: 16, blur: 32, spread: -16, radius: 18))
      VStack(alignment: .leading, spacing: 2) {
        Text("8.2 s").css(26, .semibold, ls: -0.03)
        Text("a card").css(12).foregroundStyle(Color(hex: 0x666666))
      }
      .padding(.horizontal, 16).padding(.vertical, 14).frame(width: 120, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.white).boxShadow(Color(hex: 0x14165A, opacity: 0.45), y: 16, blur: 32, spread: -16, radius: 18))
      .rotationEffect(.degrees(5))
    }
    .foregroundStyle(Color.black)
    .fixedSize()
  }
}
