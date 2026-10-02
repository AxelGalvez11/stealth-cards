// The daily reminder (Settings › Studying › Daily reminder, PhoneSettings): one notice a day at the time you pick, saying "Time to review
// your cards". The phone schedules it itself (a local notification: UNUserNotificationCenter), so nothing about it goes anywhere but
// the time you chose, which is saved with your settings. Picking a time turns it on, and the phone asks to send notices then, never
// when the app opens; picking another time sets it again; Off removes it. If you say no to notices the row stays Off and says how to
// allow them in iPhone Settings. What the row says comes from the phone's own list of scheduled notices, so it is always what will
// really happen (a notice that was turned off in iPhone Settings, or a phone that was reset, shows as Off). Tapping the notice opens the
// Library (ReminderTap), where the cards due wait with Review.
import SwiftUI
import UserNotifications

@MainActor
final class Reminder: ObservableObject {
  static let shared = Reminder()
  /// The times the row offers (the board's REMINDER_TIMES).
  static let times = ["7:00 AM", "8:00 AM", "9:00 AM", "12:00 PM", "6:00 PM", "8:00 PM", "9:00 PM"]
  static let id = "lucida.daily-reminder"
  static let words = "Time to review your cards"
  /// How the row says there is no notice.
  static let off = "Off"
  /// The line under the row when notices are off for Lucida in iPhone Settings.
  static let refusedLine = "Allow notifications for Lucida in iPhone Settings."

  /// What the row says: "Off", or the time a notice is set for.
  @Published private(set) var value = Reminder.off
  /// Notices are off for Lucida in iPhone Settings (a no to the question, or turned off later).
  @Published private(set) var refused = false
  /// For the end-to-end test (debug builds, `-reminderAudit`): what is scheduled, in words.
  @Published private(set) var audit = "none"

  fileprivate let center = UNUserNotificationCenter.current()

  /// "9:00 AM" → 9 and 0; "6:00 PM" → 18 and 0.
  static func parse(_ time: String) -> DateComponents? {
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "h:mm a"
    guard let d = f.date(from: time) else { return nil }
    let c = Calendar(identifier: .gregorian).dateComponents([.hour, .minute], from: d)
    return DateComponents(hour: c.hour, minute: c.minute)
  }
  /// 18 and 0 → "6:00 PM".
  static func text(_ c: DateComponents) -> String {
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "h:mm a"
    guard let d = Calendar(identifier: .gregorian).date(from: DateComponents(year: 2000, month: 1, day: 1, hour: c.hour ?? 0, minute: c.minute ?? 0)) else { return Reminder.off }
    return f.string(from: d)
  }

  /// Looks at the phone: whether notices are allowed, and which one is scheduled. A notice left scheduled after notices were turned off
  /// in iPhone Settings is cleared, so the row says Off and the line says how to allow them.
  func refresh() async {
    let settings = await center.notificationSettings()
    let mine = await center.pendingNotificationRequests().filter { $0.identifier == Self.id }
    let allowed = [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus)
    refused = settings.authorizationStatus == .denied
    if !allowed, !mine.isEmpty { center.removePendingNotificationRequests(withIdentifiers: [Self.id]) }
    if allowed, let first = mine.first, let t = first.trigger as? UNCalendarNotificationTrigger { value = Self.text(t.dateComponents) } else { value = Self.off }
    audit = await summary()
  }

  /// A pick from the row's list: Off, or a time. A time asks to send notices first if it hasn't been asked (the phone only asks once),
  /// then sets the one daily notice (replacing the old one). True when a notice is set at that time.
  @discardableResult
  func choose(_ pick: String) async -> Bool {
    if pick == Self.off { center.removePendingNotificationRequests(withIdentifiers: [Self.id]); await refresh(); return false }
    guard let when = Self.parse(pick) else { return false }
    var settings = await center.notificationSettings()
    if settings.authorizationStatus == .notDetermined {
      _ = try? await center.requestAuthorization(options: [.alert, .sound])
      settings = await center.notificationSettings()
    }
    guard [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus) else {
      center.removePendingNotificationRequests(withIdentifiers: [Self.id]); await refresh(); return false
    }
    let content = UNMutableNotificationContent()
    content.body = Self.words
    content.sound = .default
    let request = UNNotificationRequest(identifier: Self.id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: when, repeats: true))
    center.removePendingNotificationRequests(withIdentifiers: [Self.id])
    do { try await center.add(request) } catch { await refresh(); return false }
    await refresh()
    return true
  }

  /// Signed out or the account deleted: nothing of the last person's is left to go off on this phone.
  func remove() {
    center.removePendingNotificationRequests(withIdentifiers: [Self.id])
    value = Self.off
    audit = "none"
  }

  private func summary() async -> String {
    let all = await center.pendingNotificationRequests()
    if all.isEmpty { return "none" }
    return all.map { r -> String in
      let t = r.trigger as? UNCalendarNotificationTrigger
      return "\(r.identifier == Self.id ? "daily" : r.identifier) \(t.map { Self.text($0.dateComponents) } ?? "?") \(t?.repeats == true ? "every day" : "once") “\(r.content.body)”"
    }.joined(separator: "; ")
  }
}

/// Tapping the daily notice opens the Library's first page (it opened Today until there was no Today, 2026-10-01), where the cards due wait
/// with Review: the tab that was showing goes back to the Library and its decks. What was over the page (a sheet, a review) stays as it was.
final class ReminderTap: NSObject, UNUserNotificationCenterDelegate {
  static let shared = ReminderTap()
  /// What a tap does (the app sets it as it starts).
  var open: () -> Void = {}
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler done: @escaping () -> Void) {
    let mine = response.notification.request.identifier.hasPrefix(Reminder.id)
    DispatchQueue.main.async { if mine { self.open() }; done() }
  }
}

#if DEBUG
extension Reminder {
  /// Debug builds, `-reminderIn <seconds>`: the same notice, once, that many seconds from now (after the phone's question, if it hasn't
  /// asked), so the end-to-end test can tap a real one.
  func soon(_ seconds: Double) async {
    var settings = await center.notificationSettings()
    if settings.authorizationStatus == .notDetermined { _ = try? await center.requestAuthorization(options: [.alert, .sound]); settings = await center.notificationSettings() }
    guard [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus) else { return }
    let content = UNMutableNotificationContent()
    content.body = Self.words
    content.sound = .default
    try? await center.add(UNNotificationRequest(identifier: Self.id + ".soon", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: max(1, seconds), repeats: false)))
  }
}
#endif

extension Store {
  /// What the Daily reminder row says: the board's value on a design screen, otherwise what the phone has scheduled.
  var reminderValue: String { demo ? props.reminder : Reminder.shared.value }
  /// Whether the row shows the line about allowing notifications.
  var reminderRefused: Bool { demo ? props.reminderNote : Reminder.shared.refused }
}

#if DEBUG
/// Debug builds, with `-reminderAudit`: what is scheduled, as an invisible element named reminderAudit for the end-to-end test
/// (ReminderTests) to read. It looks at the phone when it appears and every second after, which keeps the test's taps honest.
struct ReminderAuditView: View {
  @ObservedObject private var reminder = Reminder.shared
  var body: some View {
    Color.clear.frame(width: 2, height: 2).accessibilityElement().accessibilityIdentifier("reminderAudit").accessibilityValue(reminder.audit)
      .task { while !Task.isCancelled { await reminder.refresh(); try? await Task.sleep(nanoseconds: 1_000_000_000) } }
  }
}
#endif
