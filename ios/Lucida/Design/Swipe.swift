// Swiping to change pages (the owner, 2026-10-01: "allow ios users to swipe to change pages").
//   - Back: a swipe from the left edge goes back on every pushed page, the way it does in any iPhone app. The pages hide the
//     navigation bar and draw their own Back button, which switches UIKit's own gesture off; BackSwipe turns it on again.
//   - Between tabs: a swipe left or right on a tab's first page (Library, Discover, Stats, Profile) moves to the next
//     or the one before. The page follows the finger and settles at once, with no bounce, and the tab bar's choice follows.
//     A swipe that starts on something that scrolls sideways (a row of decks, chips) is left to it. At either end nothing moves,
//     but the swipe is still taken, so it never taps the row it lifts off. With Reduce Motion the page doesn't follow: a swipe
//     that goes far enough just changes tab.
import SwiftUI
import UIKit

// ---------- Back ----------
/// Gives the stack's own edge-swipe back to pages that hide the navigation bar. Put it on the stack's first page and on every
/// page that is pushed (a page that is already there when the app starts has no first page showing to find the stack from).
struct BackSwipe: UIViewRepresentable {
  /// False while something else is on top (a sheet, a full screen, a dragged deck), so the edge doesn't pop a page behind it.
  let canPop: () -> Bool
  func makeCoordinator() -> Pop { Pop() }
  func makeUIView(context: Context) -> Finder { let v = Finder(); v.pop = context.coordinator; return v }
  func updateUIView(_ v: Finder, context: Context) {
    context.coordinator.canPop = canPop
    // (the stack may have given its own delegate back while a page came or went)
    if let nav = context.coordinator.nav, nav.interactivePopGestureRecognizer?.delegate !== context.coordinator { nav.interactivePopGestureRecognizer?.delegate = context.coordinator }
  }

  final class Pop: NSObject, UIGestureRecognizerDelegate {
    var canPop: () -> Bool = { true }
    weak var nav: UINavigationController?
    func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
      // Something to go back to, nothing on top of the page, and not while a page is still coming in or going out (the check
      // UIKit's own delegate makes, which this one replaced).
      guard let nav, nav.viewControllers.count > 1, nav.transitionCoordinator == nil else {
        #if DEBUG
        PopAudit.shared.note("no: pages=\(self.nav?.viewControllers.count ?? -1) busy=\(self.nav?.transitionCoordinator != nil)")
        #endif
        return false
      }
      let yes = canPop()
      #if DEBUG
      PopAudit.shared.note(yes ? "yes" : "no: something is over the page")
      #endif
      return yes
    }
  }
  /// Finds the navigation controller the stack lives in once it's on screen, and takes over its edge gesture's delegate.
  final class Finder: UIView {
    var pop: Pop?
    override init(frame: CGRect) { super.init(frame: frame); isUserInteractionEnabled = false; isHidden = true }
    required init?(coder: NSCoder) { fatalError() }
    override func didMoveToWindow() {
      super.didMoveToWindow()
      guard window != nil else { return }
      DispatchQueue.main.async { [weak self] in
        var r: UIResponder? = self
        while let n = r {
          if let nav = (n as? UIViewController)?.navigationController ?? n as? UINavigationController, let g = nav.interactivePopGestureRecognizer {
            self?.pop?.nav = nav; g.delegate = self?.pop; g.isEnabled = true
            return
          }
          r = n.next
        }
      }
    }
  }
}

#if DEBUG
/// What the edge swipe has decided so far (`-popAudit`), for the end-to-end test.
@MainActor final class PopAudit: ObservableObject {
  static let shared = PopAudit()
  static let on = ProcessInfo.processInfo.arguments.contains("-popAudit")
  @Published private(set) var notes: [String] = []
  func note(_ s: String) { notes.append(s) }
}
struct PopReadout: View {
  @ObservedObject private var a = PopAudit.shared
  var body: some View {
    Color.clear.frame(width: 2, height: 2).accessibilityElement().accessibilityIdentifier("popAudit").accessibilityValue(a.notes.joined(separator: ","))
  }
}
#endif

// ---------- Between tabs ----------
/// What a swipe between tabs needs to know, and tells.
struct TabSwipe: UIGestureRecognizerRepresentable {
  /// Whether a swipe can start at all (a tab's first page is showing, nothing is over it).
  let enabled: Bool
  let moved: (CGFloat) -> Void
  let ended: (_ dx: CGFloat, _ vx: CGFloat) -> Void
  let cancelled: () -> Void

  func makeCoordinator(converter: CoordinateSpaceConverter) -> Coordinator { Coordinator() }
  func makeUIGestureRecognizer(context: Context) -> UIPanGestureRecognizer {
    let g = UIPanGestureRecognizer()
    g.maximumNumberOfTouches = 1
    g.delegate = context.coordinator
    context.coordinator.recognizer = g
    return g
  }
  func updateUIGestureRecognizer(_ g: UIPanGestureRecognizer, context: Context) {
    context.coordinator.enabled = enabled
    g.isEnabled = enabled
  }
  func handleUIGestureRecognizerAction(_ g: UIPanGestureRecognizer, context: Context) {
    let dx = g.translation(in: g.view).x
    switch g.state {
    case .began, .changed: moved(dx)
    case .ended: ended(dx, g.velocity(in: g.view).x)
    case .cancelled, .failed: cancelled()
    default: break
    }
  }

  final class Coordinator: NSObject, UIGestureRecognizerDelegate {
    weak var recognizer: UIPanGestureRecognizer?
    var enabled = true
    func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
      guard enabled, let pan = g as? UIPanGestureRecognizer, let view = pan.view else { return false }
      // Mostly sideways. (Also at either end, where it moves nothing: a swipe there must not tap the row under the finger when it
      // lifts, as it would if nothing took the swipe.)
      let t = pan.translation(in: view)
      guard abs(t.x) > abs(t.y) * 1.4 else { return false }
      // Not something that scrolls sideways (a row of decks, chips), or a field being typed in: it keeps its own swipe.
      var hit = view.hitTest(pan.location(in: view), with: nil)
      while let v = hit, v !== view {
        if let s = v as? UIScrollView, s.isScrollEnabled, s.contentSize.width > s.bounds.width + 1 { return false }
        if v is UITextField || v is UITextView { return false }
        hit = v.superview
      }
      return true
    }
    func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { false }
  }
}

/// A tab's first page, with the tab before it and the one after it a swipe away. Only the page showing is drawn (and, during a
/// swipe, the one it moves to), so a tab keeps coming up fresh the way it did when only the tab bar chose.
struct TabPager<Page: View>: View {
  @Binding var tab: Tab
  /// A swipe can start (the tab's first page is showing, and nothing is over it).
  let enabled: Bool
  /// The user changed tab by swiping.
  let changed: () -> Void
  @ViewBuilder let page: (Tab) -> Page
  /// How far the finger has moved the page, and the tab that is coming in beside it.
  @State private var dx: CGFloat = 0
  @State private var coming: Tab? = nil
  @State private var settling = false

  private func neighbor(_ t: Tab, _ step: Int) -> Tab? {
    let all = Tab.allCases
    guard let i = all.firstIndex(of: t), all.indices.contains(i + step) else { return nil }
    return all[i + step]
  }

  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      let shown: [Tab] = coming.map { [tab, $0] } ?? [tab]
      ZStack {
        ForEach(shown, id: \.self) { t in
          page(t).frame(width: w, height: g.size.height).offset(x: t == tab ? dx : dx + (coming == neighbor(tab, 1) ? w : -w))
        }
      }
      .frame(width: w, height: g.size.height, alignment: .topLeading)
      .gesture(TabSwipe(enabled: enabled && !settling, moved: { x in follow(x, width: w) },
                        ended: { x, v in release(x, v, width: w) }, cancelled: { settle(to: nil, width: w) }))
    }
  }

  /// The finger moves: the page goes with it, and the tab on that side comes in beside it.
  private func follow(_ x: CGFloat, width w: CGFloat) {
    guard !Motion.still, let next = neighbor(tab, x < 0 ? 1 : -1) else { return }
    if coming != next { var tx = Transaction(); tx.disablesAnimations = true; withTransaction(tx) { coming = next } }
    var tx = Transaction(); tx.disablesAnimations = true
    withTransaction(tx) { dx = min(w, max(-w, x)) }
  }

  /// The finger lets go: far enough, or flicked, goes to that tab; otherwise the page goes back.
  private func release(_ x: CGFloat, _ v: CGFloat, width w: CGFloat) {
    let step = x < 0 ? 1 : -1
    let far = abs(x) > w * 0.28 || abs(v) > 600 && (v < 0) == (x < 0) && abs(x) > 24
    guard let next = neighbor(tab, step), far else { settle(to: nil, width: w); return }
    if Motion.still { tab = next; changed(); dx = 0; coming = nil; return }
    settle(to: next, width: w)
  }

  /// Slides to where it's going (no bounce), then makes it the page: the tab it came from is gone, and the one that came in
  /// is the same view, so nothing redraws.
  private func settle(to next: Tab?, width w: CGFloat) {
    let target: CGFloat = next == nil ? 0 : (next == neighbor(tab, 1) ? -w : w)
    let finish = {
      var tx = Transaction(); tx.disablesAnimations = true
      withTransaction(tx) {
        if let next { tab = next; changed() }
        dx = 0; coming = nil; settling = false
      }
    }
    // Nothing moved (or Reduce Motion): just put things right.
    guard !Motion.still, abs(dx - target) > 0.5 else { finish(); return }
    settling = true
    withAnimation(Motion.sheet) { dx = target } completion: { finish() }
  }
}
