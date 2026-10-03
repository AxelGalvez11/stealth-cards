// iPhone · Deck settings → Studying, Pro's part (PhoneDeckSettingsStudy, PhoneDeckSettingsStudyFree): an exam date, and what happens
// to cards you keep forgetting. On Free, a "Plan your reviews" card with Go Pro instead. (No memory goal: every deck is held to 90%.)
import SwiftUI

/// The pill on a Pro tool's Go Pro card and elsewhere: "Pro" on a periwinkle-to-sky gradient.
/// (ProBadge, in Settings, is the same one.)

/// Pro's part of Studying, under New cards a day: the exam date and the rule for cards you keep forgetting; on Free, an
/// old exam date to take off (or the card that says what Pro adds).
struct StudyPro: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let d: DeckVM
  var body: some View {
    if store.isPro {
      VStack(alignment: .leading, spacing: 16) { ExamRow(d: d); leech }
    } else if !d.examDay.isEmpty {
      ExamRow(d: d)
    } else {
      teaser
    }
  }

  /// Cards you keep forgetting: after how many forgets, and what happens to them.
  private var leech: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Cards you keep forgetting").css(14, .semibold)
      HStack(spacing: 10) {
        Text("After").css(13).foregroundStyle(t.muted)
        HStack(spacing: 10) {
          round("−", "Less") { store.updateDeck(d.id, ["leechAt": max(3, d.leechAt - 1)]) }
          Text("\(d.leechAt)").css(15, .semibold).frame(minWidth: 40)
          round("+", "More") { store.updateDeck(d.id, ["leechAt": min(30, d.leechAt + 1)]) }
        }
        Text("forgets").css(13).foregroundStyle(t.muted)
      }
      Segmented(options: [("tag", "Tag it “Leech”"), ("pause", "Pause it")], current: d.leechAct) { store.updateDeck(d.id, ["leechAct": $0]) }
    }
  }
  private func round(_ s: String, _ label: String, _ a: @escaping () -> Void) -> some View {
    Button(action: a) { Text(s).css(17, .semibold).foregroundStyle(t.text).frame(width: 30, height: 30).background(Circle().fill(t.surf)) }
      .buttonStyle(.press).accessibilityLabel(label)
  }

  /// On Free: what Pro adds, and a way to it.
  private var teaser: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) { Text("Plan your reviews").css(15, .semibold); ProBadge() }
      WebText(text: "Set an exam date, and choose what happens to cards you keep forgetting.", size: 13, lh: 1.45, color: t.muted)
      Button { nav.goPro() } label: {
        Text("Go Pro").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
      .padding(.top, 4)
    }
    .padding(.horizontal, 18).padding(.vertical, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
  }
}

/// Exam date: a pill with the day (or "Add a date") that opens a calendar, and a button to take it off, then the exam's line.
/// From 30 days out, cards you'd forget by the day come up early; the line says how many.
struct ExamRow: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let d: DeckVM
  /// Where the pill is on the screen: the calendar opens under it.
  @State private var frame = CGRect.zero

  var body: some View {
    let on = !d.examDay.isEmpty, pro = store.isPro
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 8) {
        Text("Exam date").css(14, .semibold).frame(maxWidth: .infinity, alignment: .leading)
        if !on { pill("Add a date") }
        else {
          if pro { pill(d.exam?.day ?? Engine.shortDay(d.examDay, store.demo ? Store.sampleNow : nowMs())) }
          else { chip(d.exam?.day ?? Engine.shortDay(d.examDay, store.demo ? Store.sampleNow : nowMs())) }
          Button { store.setExam(d.id, nil) } label: { Icon("close", 12, 2.4).foregroundStyle(t.text).frame(width: 34, height: 34).background(Circle().fill(t.surf)) }
            .buttonStyle(.press).accessibilityLabel("Remove the exam date")
        }
      }
      .frame(minHeight: 36)
      if on { Text(d.exam?.line ?? "This exam has passed").css(12, lh: 1.4).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true) }
    }
    #if DEBUG
    // `-calendar "Exam date"` (or `-popover exam`) opens the calendar as soon as the settings are up (a board's Calendar Tweak, for looking at it).
    .task { if (Board.arg("-calendar") == "Exam date" || Board.arg("-popover") == "exam") && pro { try? await Task.sleep(nanoseconds: 1_500_000_000); open() } }
    #endif
  }

  /// Lucida's calendar under the pill: from today on, the day picked is the exam's.
  private func open() {
    let min = CalDay.iso(of: Store.examMin(demo: store.demo))
    nav.openCalendar(CalendarRequest(anchor: frame, trailing: true, title: "Exam date", value: d.examDay, min: min, today: min) { iso in store.setExam(d.id, iso) })
  }

  private func label(_ text: String) -> some View {
    HStack(spacing: 6) { Icon("calendar", 14, 2); Text(text).css(13, .semibold).lineLimit(1).fixedSize() }
      .foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.surf))
  }
  /// The pill that opens the calendar.
  private func pill(_ text: String) -> some View {
    Button { open() } label: { label(text).screenFrame($frame) }
      .buttonStyle(.press)
      .accessibilityLabel(text == "Add a date" ? "Add an exam date" : "Exam date, \(text)")
  }
  /// With no way to change it (Free, on a date from before): just the day.
  private func chip(_ text: String) -> some View { label(text) }
}

extension Store {
  /// The earliest exam day you can pick: today (on a design screen, the sample's Tuesday).
  static func examMin(demo: Bool) -> Date { Calendar.current.startOfDay(for: Date(timeIntervalSince1970: (demo ? sampleNow : nowMs()) / 1000)) }
  /// "2026-10-12", from a day picked.
  static func examIso(_ d: Date) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }
  static func examDate(_ iso: String, demo: Bool) -> Date? {
    let p = iso.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3 else { return nil }
    var c = DateComponents(); c.year = p[0]; c.month = p[1]; c.day = p[2]
    return Calendar.current.date(from: c)
  }
}
