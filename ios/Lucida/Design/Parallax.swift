// A deck's cover, behind its header (the owner, 2026-10-01: "add parallax effect to deck covers when inside the deck"): scrolling
// up, the cover drifts at half the page's speed while the title and buttons go at full speed; pulled down past the top, it
// stretches to fill the gap. Reduce Motion keeps it still. Only transforms: nothing about the layout changes.
// (The web does the same in CSS: a scroll-linked animation on `.sc-parallax`, design/build.mjs; web/motion.js where a browser
// can't.) Debug builds started with `-parallaxAudit` write the numbers into an invisible element for the end-to-end test.
import SwiftUI

enum Parallax {
  /// How far down the cover is moved inside its header when the page has scrolled up by -y (y: where the header's top is, in
  /// the scroll view: 0 at rest, negative scrolled up, positive pulled down). Half of the scroll.
  static func offset(_ y: CGFloat) -> CGFloat { y < 0 ? -y / 2 : 0 }
  /// How much the cover is stretched (about its bottom) when the page is pulled down by y over a header `h` tall.
  static func stretch(_ y: CGFloat, height h: CGFloat) -> CGFloat { y > 0 ? (h + y) / max(1, h) : 1 }
}

extension View {
  /// The cover layer of a header at the top of a ScrollView: it moves as the header scrolls (see Parallax).
  func coverParallax(still reduced: Bool) -> some View {
    // (Reduce Motion as the page sees it, or as a debug build is asked for it with `-still 1`.)
    let still = reduced || Motion.still
    return visualEffect { [still] content, proxy in
      let y = still ? 0 : proxy.frame(in: .scrollView(axis: .vertical)).minY, h = max(1, proxy.size.height)
      return content
        .scaleEffect(Parallax.stretch(y, height: h), anchor: .bottom)
        .offset(y: Parallax.offset(y))
    }
    #if DEBUG
    .background { if ParallaxAudit.on { ParallaxProbe(still: still) } }
    #endif
  }
}

#if DEBUG
/// What the cover does right now, for the end-to-end test: `scroll=<how far the header has scrolled up> cover=<how far the cover
/// has moved down inside it> pull=<how far the page is pulled down past the top> still=<1 with Reduce Motion>`.
@MainActor final class ParallaxAudit: ObservableObject {
  static let shared = ParallaxAudit()
  static let on = ProcessInfo.processInfo.arguments.contains("-parallaxAudit")
  @Published var y: CGFloat = 0
  @Published var still = false
}
private struct ParallaxProbe: View {
  let still: Bool
  var body: some View {
    GeometryReader { _ in Color.clear }
      .onGeometryChange(for: CGFloat.self) { $0.frame(in: .scrollView(axis: .vertical)).minY } action: { ParallaxAudit.shared.y = $0; ParallaxAudit.shared.still = still }
  }
}
/// The invisible element carrying it.
struct ParallaxReadout: View {
  @ObservedObject private var a = ParallaxAudit.shared
  var body: some View {
    // (what the page has scrolled, and what the cover does about it: with Reduce Motion, nothing)
    let y = a.y, moving = !a.still
    Color.clear.frame(width: 2, height: 2).accessibilityElement().accessibilityIdentifier("parallaxAudit")
      .accessibilityValue(String(format: "scroll=%.1f cover=%.1f pull=%.1f still=%d", max(0, -y), moving ? Parallax.offset(y) : 0, moving ? max(0, y) : 0, a.still ? 1 : 0))
  }
}
#endif
