// Haptics (the owner, 2026-10-01: "add haptics to the app"): iOS 17's sensory feedback, which follows the phone's own haptics
// setting. A few, in the right places, and none for a tap on a plain link or row:
//   selection  a tab switch, a segmented control, a switch, a picked answer or option
//   light      flipping a card, a grade button, adding or removing something
//   success    a right answer in Learn mode (which is how a card gets learned), a deck made
//   warning    a wrong answer, and confirming a delete
// (The app has no pull-to-refresh and no Live game to join, which are the other two places the notes list.) Dragging a deck or
// card has its own taps (Drag.swift).
// Every haptic is one `.haptic(kind, on: trigger, "why")` on the view whose change it follows, so `grep "\.haptic("` lists them.
// Debug builds started with `-hapticAudit` also write each one that fires into an invisible element the end-to-end test reads.
import SwiftUI

enum Haptic: String {
  case selection, light, success, warning
  var feedback: SensoryFeedback {
    switch self {
    case .selection: return .selection
    case .light: return .impact(weight: .light)
    case .success: return .success
    case .warning: return .warning
    }
  }
}

extension View {
  /// `kind` when `trigger` changes (and, with `when`, only for the changes it says yes to: old value, new value).
  func haptic<T: Equatable>(_ kind: Haptic, on trigger: T, _ why: String, when: ((T, T) -> Bool)? = nil) -> some View {
    modifier(HapticModifier(kind: kind, trigger: trigger, why: why, when: when))
  }
}

private struct HapticModifier<T: Equatable>: ViewModifier {
  let kind: Haptic, trigger: T, why: String
  let when: ((T, T) -> Bool)?
  func body(content: Content) -> some View {
    let fire: (T, T) -> Bool = when ?? { _, _ in true }
    return content
      .sensoryFeedback(kind.feedback, trigger: trigger, condition: fire)
      #if DEBUG
      .onChange(of: trigger) { old, new in if fire(old, new) { HapticLog.shared.add(kind.rawValue + ":" + why) } }
      #endif
  }
}

/// A haptic for something whose own view goes away as it happens (a sheet that closes when its card is saved, a deck that is
/// deleted): the app's main view plays it (MainView), and `HapticLog` notes it like the others.
@MainActor final class Buzz: ObservableObject {
  static let shared = Buzz()
  @Published private(set) var lights = 0
  @Published private(set) var successes = 0
  @Published private(set) var warnings = 0
  func light(_ why: String) { lights += 1; note(.light, why) }
  func success(_ why: String) { successes += 1; note(.success, why) }
  func warning(_ why: String) { warnings += 1; note(.warning, why) }
  private func note(_ kind: Haptic, _ why: String) {
    #if DEBUG
    HapticLog.shared.add(kind.rawValue + ":" + why)
    #endif
  }
}

#if DEBUG
/// The haptics that have fired this run (`-hapticAudit`), for the end-to-end test.
@MainActor final class HapticLog: ObservableObject {
  static let shared = HapticLog()
  static let on = ProcessInfo.processInfo.arguments.contains("-hapticAudit")
  @Published private(set) var events: [String] = []
  func add(_ e: String) { events.append(e) }
}

/// An invisible element carrying `HapticLog`'s events as its value.
struct HapticAudit: View {
  @ObservedObject private var log = HapticLog.shared
  var body: some View {
    Color.clear.frame(width: 2, height: 2).accessibilityElement().accessibilityIdentifier("hapticAudit").accessibilityValue(log.events.joined(separator: ","))
  }
}
#endif
