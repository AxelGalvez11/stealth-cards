// Lucida's own calendar (design/ui.mjs dateMarkup, DATE_JS), never the system's DatePicker: a small popover under what opens it, for one day (a deck's
// exam date, a class's due date): the month and its arrows, the days of the week, the days of the month (today has a ring, the day picked is filled,
// days before `min` are dimmed and can't be picked). A tap on a day picks it and closes the calendar; a tap outside closes it.
import SwiftUI

/// What opens a calendar: where its button is on the screen (the calendar sits under it, or over it when there is no room below), the day now
/// picked and the earliest that can be ("YYYY-MM-DD", "" for none), what today is, and what picking does.
struct CalendarRequest: Identifiable {
  let id = UUID()
  /// The button's box on the screen.
  var anchor: CGRect
  /// The popover's right edge is the button's (a pill at the end of a row), or its left edge is (a row that spans the width).
  var trailing = true
  var title = "Pick a day"
  var value = ""
  var min = ""
  var today = ""
  let choose: (String) -> Void
}

/// Days as the web writes them, "2026-10-05", worked out in the Gregorian calendar with Sunday first (the web's calendar).
enum CalDay {
  static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.firstWeekday = 1; c.timeZone = .current; return c }
  static let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  static func parse(_ s: String) -> (y: Int, m: Int, d: Int)? {
    let p = s.split(separator: "-").compactMap { Int($0) }
    return p.count == 3 ? (p[0], p[1] - 1, p[2]) : nil
  }
  static func iso(_ y: Int, _ m: Int, _ d: Int) -> String { String(format: "%04d-%02d-%02d", y, m + 1, d) }
  static func date(_ y: Int, _ m: Int, _ d: Int) -> Date { cal.date(from: DateComponents(year: y, month: m + 1, day: d, hour: 12)) ?? Date() }
  static func iso(of date: Date) -> String { let c = cal.dateComponents([.year, .month, .day], from: date); return iso(c.year ?? 0, (c.month ?? 1) - 1, c.day ?? 1) }
  static func today() -> String { iso(of: Date()) }
  /// "Mon, Oct 5": a day, short, for the button that opens the calendar.
  static func short(_ s: String) -> String {
    guard let p = parse(s) else { return "" }
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US"); f.calendar = cal; f.dateFormat = "EEE, MMM d"
    return f.string(from: date(p.y, p.m, p.d))
  }
  /// "October 5, 2026", for the day's own name (VoiceOver).
  static func long(_ y: Int, _ m: Int, _ d: Int) -> String { "\(months[m]) \(d), \(y)" }
}

struct CalendarHost: View {
  @EnvironmentObject private var nav: Nav
  let request: CalendarRequest
  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .topLeading) {
        // A tap anywhere else closes it.
        Color.black.opacity(0.001).ignoresSafeArea().contentShape(Rectangle()).onTapGesture { nav.closeCalendar() }.accessibilityHidden(true)
        CalendarPopup(request: request, close: { nav.closeCalendar() })
          .frame(width: Self.width)
          .position(at(g))
          .popTransition()
      }
    }
    .ignoresSafeArea()
  }
  static let width: CGFloat = 308, height: CGFloat = 340
  /// Under the button with its edge on the button's, kept inside the screen; over it when there is no room below.
  private func at(_ g: GeometryProxy) -> CGPoint {
    let a = request.anchor, w = Self.width, h = Self.height, bounds = g.size
    var x = request.trailing ? a.maxX - w : a.minX
    x = max(16, min(x, bounds.width - 16 - w))
    var y = a.maxY + 8
    if y + h > bounds.height - 16 { y = max(16 + g.safeAreaInsets.top, a.minY - 8 - h) }
    return CGPoint(x: x + w / 2, y: y + h / 2)
  }
}

struct CalendarPopup: View {
  @Environment(\.theme) private var t
  let request: CalendarRequest
  let close: () -> Void
  @State private var year = 2026
  @State private var month = 0
  @State private var ready = false
  private var minDay: (y: Int, m: Int, d: Int)? { CalDay.parse(request.min) }

  var body: some View {
    let today = request.today.isEmpty ? CalDay.today() : request.today
    let first = CalDay.cal.component(.weekday, from: CalDay.date(year, month, 1)) - 1
    let count = CalDay.cal.range(of: .day, in: .month, for: CalDay.date(year, month, 1))?.count ?? 30
    let canPrev = minDay.map { year > $0.y || (year == $0.y && month > $0.m) } ?? true
    VStack(spacing: 10) {
      HStack {
        arrow("back", "Earlier month", enabled: canPrev) { go(-1) }
        Text("\(CalDay.months[month]) \(String(year))").css(15, .semibold, ls: -0.01).frame(maxWidth: .infinity).accessibilityAddTraits(.isHeader)
        arrow("chev", "Later month", enabled: true) { go(1) }
      }
      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 2) {
        ForEach(Array(["S", "M", "T", "W", "T", "F", "S"].enumerated()), id: \.offset) { _, d in
          Text(d).css(12, .semibold).foregroundStyle(t.muted).frame(height: 24).accessibilityHidden(true)
        }
        ForEach(0..<first, id: \.self) { _ in Color.clear.frame(height: 36).accessibilityHidden(true) }
        ForEach(1...count, id: \.self) { d in day(d, today: today) }
      }
    }
    .foregroundStyle(t.text)
    .padding(14)
    .modifier(PopBox())
    .accessibilityElement(children: .contain).accessibilityLabel(request.title)
    .onAppear {
      guard !ready else { return }
      ready = true
      let base = CalDay.parse(request.value) ?? minDay ?? CalDay.parse(today) ?? (2026, 0, 1)
      year = base.y; month = base.m
    }
  }

  private func go(_ by: Int) {
    var m = month + by, y = year
    if m < 0 { m = 11; y -= 1 } else if m > 11 { m = 0; y += 1 }
    withAnimation(Motion.fade) { year = y; month = m }
  }

  private func arrow(_ icon: String, _ label: String, enabled: Bool, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Icon(icon, 15, 2.2).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.surf)).opacity(enabled ? 1 : 0.3)
    }
    .buttonStyle(.press).disabled(!enabled).accessibilityLabel(label)
  }

  private func day(_ d: Int, today: String) -> some View {
    let s = CalDay.iso(year, month, d), on = s == request.value, off = !request.min.isEmpty && s < request.min, isToday = s == today
    return Button { close(); request.choose(s) } label: {
      Text(String(d)).css(14, on || isToday ? .semibold : .regular).monospacedDigit()
        .foregroundStyle(on ? t.invText : t.text)
        .frame(maxWidth: .infinity).frame(height: 36)
        .background(Capsule().fill(on ? t.inv : Color.clear))
        .overlay(Capsule().strokeBorder(isToday && !on ? t.muted : Color.clear, lineWidth: 1.5))
        .opacity(off ? 0.3 : 1)
        .contentShape(Rectangle())
    }
    .buttonStyle(.flat).disabled(off)
    .accessibilityLabel(CalDay.long(year, month, d) + (isToday ? ", today" : ""))
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    .accessibilityIdentifier("day-" + s)
  }
}

extension View {
  /// Reports where this view is on the screen (a calendar opens under it).
  func screenFrame(_ frame: Binding<CGRect>) -> some View {
    onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { frame.wrappedValue = $0 }
  }
}

extension Nav {
  func openCalendar(_ r: CalendarRequest) { withAnimation(Motion.pop) { calendar = r } }
  func closeCalendar() { withAnimation(Motion.leave) { calendar = nil } }
}
