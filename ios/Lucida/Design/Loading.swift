// Lucida's own loading mark (the system's spinner never shows): the logo's three dots, rising and fading one after another, slowly. With Reduce Motion
// they are still. Where a page waits for something small (a picture on its way).
import SwiftUI

struct LoadingMark: View {
  @Environment(\.theme) private var t
  /// The dots' color; the text's muted color unless a picture's black asks for white.
  var color: Color? = nil
  var size: CGFloat = 6
  @State private var on = false
  var body: some View {
    HStack(spacing: size) {
      ForEach(0..<3, id: \.self) { i in
        Circle().fill(color ?? t.muted).frame(width: size, height: size)
          .opacity(Motion.still ? 0.7 : on ? 1 : 0.3)
          .offset(y: Motion.still ? 0 : on ? -size / 3 : 0)
          .animation(Motion.still ? nil : .easeInOut(duration: 0.7).repeatForever(autoreverses: true).delay(Double(i) * 0.16), value: on)
      }
    }
    .onAppear { on = true }
    .accessibilityElement().accessibilityLabel("Loading")
  }
}
