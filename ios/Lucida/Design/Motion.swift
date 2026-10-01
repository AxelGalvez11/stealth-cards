// The iPhone app's motion for components: menus, pop-ups, dropdowns, toasts, sheets, switches, and a segmented control's
// pill (the owner, 2026-10-01: "add slide in animations to app components, like menu popup, button toggle etc."). Quick,
// eased out, a short slide plus a fade, and nothing bounces. The numbers are the web app's too: design/motion.mjs makes them,
// design/to-ios.mjs copies them into Generated.motion, and design/build.mjs makes the boards' CSS from the same ones.
// Reduce Motion turns the slides and fades off (the screen just changes).
import SwiftUI

struct MotionTimings {
  /// cubic-bezier(x1, y1, x2, y2): starts fast, settles gently, and never overshoots.
  let ease: (Double, Double, Double, Double)
  /// How far a menu, pop-up or toast slides in (points), and how long each kind of motion takes (seconds).
  let slide, pop, sheet, leave, knob, fade: Double
}

enum Motion {
  static let timings = Generated.motion

  /// Reduce Motion is on (the phone's own setting; debug builds also take `-still 1`, so a test can ask for it).
  static var still: Bool {
    #if DEBUG
    if Board.arg("-still") == "1" { return true }
    #endif
    return UIAccessibility.isReduceMotionEnabled
  }

  /// The one curve, over `seconds`.
  static func ease(_ seconds: Double) -> Animation {
    let e = timings.ease
    return .timingCurve(e.0, e.1, e.2, e.3, duration: seconds)
  }
  /// A menu, pop-up, dropdown or toast comes in (`nil` with Reduce Motion, so it just appears).
  static var pop: Animation? { still ? nil : ease(timings.pop) }
  /// A sheet or a full screen slides in.
  static var sheet: Animation? { still ? nil : ease(timings.sheet) }
  /// Something goes away: quicker, and eased in (the web's `sc-gone`).
  static var leave: Animation? { still ? nil : .timingCurve(0.4, 0, 1, 1, duration: timings.leave) }
  /// A switch's knob and a segmented control's pill slide.
  static var knob: Animation? { still ? nil : ease(timings.knob) }
  /// A backdrop fades.
  static var fade: Animation? { still ? nil : .easeOut(duration: timings.fade) }
  /// How far a menu slides.
  static var slide: CGFloat { CGFloat(timings.slide) }
}

/// A menu, pop-up or dropdown that slides up a little and fades in as it appears, and fades away. Put it on what's shown
/// inside an `if`, and animate the condition with `.animation(Motion.pop, value: …)` (or `withAnimation(Motion.pop)`).
private struct PopTransition: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var reduced
  func body(content: Content) -> some View {
    content.transition(reduced || Motion.still ? .identity : .asymmetric(insertion: .opacity.combined(with: .offset(y: Motion.slide)), removal: .opacity))
  }
}

/// A sheet or a full screen that slides up from the bottom (nothing with Reduce Motion).
private struct SheetTransition: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var reduced
  func body(content: Content) -> some View {
    content.transition(reduced || Motion.still ? .identity : .move(edge: .bottom))
  }
}

extension View {
  func popTransition() -> some View { modifier(PopTransition()) }
  func sheetTransition() -> some View { modifier(SheetTransition()) }
}
