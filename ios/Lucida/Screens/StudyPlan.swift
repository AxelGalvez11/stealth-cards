// iPhone · Deck settings → Studying, Pro's part (PhoneDeckSettingsStudy, PhoneDeckSettingsGoal, PhoneDeckSettingsStudyFree):
// three memory goals to compare with the reviews a day each one means, an exam date, and what happens to cards you keep
// forgetting. On Free, a "Plan your reviews" card with Go Pro instead.
import SwiftUI

/// The pill on a Pro tool's Go Pro card and elsewhere: "Pro" on a periwinkle-to-sky gradient.
/// (ProBadge, in Settings, is the same one.)

/// Relaxed 85%, Balanced 90%, Intense 95%: each with its reviews a day, the chosen one in black.
struct GoalPresets: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  let d: DeckVM
  var body: some View {
    HStack(spacing: 8) {
      ForEach([("Relaxed", 85), ("Balanced", 90), ("Intense", 95)], id: \.1) { label, g in
        let on = d.goal == g
        Button { store.updateDeck(d.id, ["goal": g]) } label: {
          VStack(alignment: .leading, spacing: 2) {
            Text(label).css(13, .semibold).lineLimit(1)
            Text("\(g)% · \(Int(FSRS.jsRound(store.workload(d.id, g)))) a day").css(12).opacity(0.72).lineLimit(1).truncationMode(.tail)
          }
          .foregroundStyle(on ? t.invText : t.text)
          .padding(.horizontal, 12).padding(.vertical, 10)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(on ? t.inv : t.surf))
        }
        .buttonStyle(.press)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
  }
}

/// "About 32 reviews a day", and beside it how much that changed since the settings opened ("+24 a day").
struct WorkloadLine: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  let d: DeckVM
  /// The goal the settings opened with.
  let from: Int
  var body: some View {
    let now = Int(FSRS.jsRound(store.workload(d.id, d.goal))), change = now - Int(FSRS.jsRound(store.workload(d.id, from)))
    HStack(spacing: 8) {
      Text(store.workload(d.id, d.goal) < 0.5 ? "Under 1 review a day" : "About " + plural(now, "review") + " a day").css(13)
      if d.goal != from && change != 0 {
        Text((change > 0 ? "+" : "−") + "\(abs(change)) a day").css(12, .semibold).monospacedDigit().foregroundStyle(t.muted)
          .padding(.horizontal, 9).frame(height: 22).background(Capsule().fill(t.surf))
      }
    }
    .frame(minHeight: 24, alignment: .leading)
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }
}

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
      WebText(text: "See how many reviews a day each goal means, set an exam date, and choose what happens to cards you keep forgetting.", size: 13, lh: 1.45, color: t.muted)
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
  let d: DeckVM
  @State private var picking = false
  @State private var picked = Date()

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
    .sheet(isPresented: $picking) { calendar }
    #if DEBUG
    // `-popover exam` opens the calendar as soon as the settings are up (for looking at it).
    .task { if Board.arg("-popover") == "exam" && pro { try? await Task.sleep(nanoseconds: 1_500_000_000); picked = Store.examDate(d.examDay, demo: store.demo) ?? Store.examMin(demo: store.demo); picking = true } }
    #endif
  }

  /// Pick the day (it's set, and the calendar closes): from today on.
  private var calendar: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack { Text("Exam date").css(18, .semibold, ls: -0.01); Spacer(); SheetDone { picking = false } }
      DatePicker("", selection: $picked, in: Store.examMin(demo: store.demo)..., displayedComponents: .date)
        .datePickerStyle(.graphical).labelsHidden().tint(t.text)
        .onChange(of: picked) { _, day in
          store.setExam(d.id, Store.examIso(day))
          Task { try? await Task.sleep(nanoseconds: 250_000_000); picking = false }
        }
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 20).padding(.top, 20).padding(.bottom, 12)
    .frame(maxHeight: .infinity, alignment: .top)
    .background(t.bg.ignoresSafeArea())
    .presentationDetents([.height(480)])
    .presentationDragIndicator(.visible)
    .presentationBackground(t.bg)
    .environment(\.theme, t)
  }

  private func label(_ text: String) -> some View {
    HStack(spacing: 6) { Icon("calendar", 14, 2); Text(text).css(13, .semibold).lineLimit(1).fixedSize() }
      .foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.surf))
  }
  /// The pill that opens the calendar.
  private func pill(_ text: String) -> some View {
    Button { picked = Store.examDate(d.examDay, demo: store.demo) ?? Store.examMin(demo: store.demo); picking = true } label: { label(text) }
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
