// Pieces the iPhone boards share, sized as on the canvas (design/build.mjs, "iPhone" section).
import SwiftUI

/// Where a board's content starts. The boards are drawn for a 390 x 844 phone with a 47-point status bar; phones with a
/// taller one (the Dynamic Island) move everything down by the difference, so the gap under the status bar stays the same.
struct Screen {
  static var safeTop: CGFloat {
    #if DEBUG
    // `-safeTop 47` lays everything out for the boards' own 47-point status bar, whatever this phone has (to set a screen beside its board).
    if let v = Board.arg("-safeTop"), let n = Double(v) { return CGFloat(n) }
    #endif
    let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
    return scene?.windows.first?.safeAreaInsets.top ?? 47
  }
  static func top(_ board: CGFloat) -> CGFloat { board + max(0, safeTop - 47) }
}

/// pTitle: a page title, 34px bold, with something on the right.
struct PageTitle<Right: View>: View {
  @Environment(\.theme) private var t
  let text: String
  let right: Right
  init(_ text: String, @ViewBuilder right: () -> Right) { self.text = text; self.right = right() }
  var body: some View {
    HStack(spacing: 0) {
      Text(text).css(34, .bold, ls: -0.03).foregroundStyle(t.text).accessibilityAddTraits(.isHeader)
      Spacer(minLength: 8)
      right
    }
    .frame(height: 44)
  }
}
extension PageTitle where Right == EmptyView { init(_ text: String) { self.text = text; self.right = EmptyView() } }

/// roundBtn: 44 x 44, gray circle, an 18px icon.
struct RoundButton: View {
  @Environment(\.theme) private var t
  let icon: String, label: String
  var bg: Color? = nil, fg: Color? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Icon(icon, 18, 2)
        .foregroundStyle(fg ?? t.text)
        .frame(width: 44, height: 44)
        .background(Circle().fill(bg ?? t.surf))
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
  }
}

/// coverRound: the round buttons on a deck's header (frosted white, in dark mode too); its page and Suggest a change
/// are a little smaller (40).
struct CoverButton: View {
  let icon: String, label: String
  var size: CGFloat = 44
  /// The icon drawn filled (a bell that's on).
  var filled = false
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Icon(icon, 18, 2, filled: filled)
        .foregroundStyle(Color.black)
        .frame(width: size, height: size)
        .background(Circle().fill(.ultraThinMaterial).environment(\.colorScheme, .light))
        .background(Circle().fill(Color.white.opacity(0.62)))
        .overlay(Circle().strokeBorder(Color.black.opacity(0.08), lineWidth: 1))
        .clipShape(Circle())
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
  }
}

/// Small uppercase label over a list ("DECKS").
struct Eyebrow: View {
  @Environment(\.theme) private var t
  let text: String
  var size: CGFloat = 13
  var body: some View {
    Text(text.uppercased()).css(size, .semibold, ls: 0.06).foregroundStyle(t.muted)
  }
}

/// The tabs (NAV_P). The Library was called Decks (it keeps the Decks icon). Profile's icon is your own picture.
enum Tab: String, CaseIterable { case today = "Today", library = "Library", discover = "Discover", stats = "Stats", profile = "Profile" }

/// The floating tab bar: a gray pill, 64 tall, 16 in from the sides and 28 up from the bottom; the current tab is a
/// black pill that slides to the tab you pick (none on someone else's profile).
struct TabBar: View {
  @Environment(\.theme) private var t
  @Namespace private var pill
  let active: Tab?
  let pick: (Tab) -> Void
  private let icons: [Tab: String] = [.today: "today", .library: "decks", .discover: "compass", .stats: "stats"]
  var body: some View {
    HStack(spacing: 4) {
      ForEach(Tab.allCases, id: \.self) { tab in
        let on = tab == active
        Button { pick(tab) } label: {
          VStack(spacing: 2) {
            // Your own circle, 22 wide in a 20 box so its name sits level with the others' (NAV_P's 'me').
            if let icon = icons[tab] { Icon(icon, 20, 2) } else { MyAvatar(size: 22).frame(width: 20, height: 20) }
            Text(tab.rawValue).css(11, .semibold)
          }
          .foregroundStyle(on ? t.invText : t.muted)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background { if on { Capsule().fill(t.inv).matchedGeometryEffect(id: "pill", in: pill) } }
          .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.rawValue)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
    .animation(Motion.knob, value: active)
    .padding(6)
    .frame(height: 64)
    .background(Capsule().fill(t.surf))
    .padding(.horizontal, 16)
    .padding(.bottom, 28)
  }
}

/// A full-width pill button (height 52-60, 16-17px semibold): black when `inv`, gray otherwise.
struct BigButton: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var height: CGFloat = 52
  var size: CGFloat = 16
  var inv = true
  var action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 8) {
        if let icon { Icon(icon, 17, 2) }
        Text(label).css(size, .semibold)
      }
      .foregroundStyle(inv ? t.invText : t.text)
      .frame(maxWidth: .infinity)
      .frame(height: height)
      .background(Capsule().fill(inv ? t.inv : t.surf))
    }
    .buttonStyle(.press)
  }
}

/// A gradient card: the mesh fill clipped to a rounded rectangle, with its text color.
struct MeshCard<Content: View>: View {
  let mesh: Mesh
  var radius: CGFloat
  var grain: Double = 0.7
  @ViewBuilder var content: Content
  var body: some View {
    content
      .foregroundStyle(mesh.inkColor)
      .shadow(color: .black.opacity(mesh.shadow), radius: mesh.shadow > 0 ? 7 : 0, x: 0, y: mesh.shadow > 0 ? 1 : 0)
      .background(MeshFill(mesh: mesh, grain: grain))
      .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
  }
}

/// The on/off switch (48 x 28; black when on). It flips the moment it's tapped (the change saves after, Store.saveNow):
/// the knob slides across (design/motion.mjs: 200 ms, eased out, no bounce) while the colors fade, like the canvas's sc-sw.
/// With Reduce Motion the knob doesn't slide; the colors still fade. A tap gives a selection haptic.
struct Toggle48: View {
  @Environment(\.theme) private var t
  let on: Bool
  var enabled = true
  let label: String
  let action: () -> Void
  /// The colors and the knob's place, each changed in its own animation when `on` does.
  @State private var lit: Bool
  @State private var knob: Bool
  @State private var taps = 0
  init(on: Bool, enabled: Bool = true, label: String, action: @escaping () -> Void) {
    self.on = on; self.enabled = enabled; self.label = label; self.action = action
    _lit = State(initialValue: on); _knob = State(initialValue: on)
  }
  var body: some View {
    Button { taps += 1; action() } label: {
      ZStack(alignment: .leading) {
        Capsule().fill(lit ? t.inv : t.surf2)
        Circle().fill(lit ? t.invText : t.bg).frame(width: 22, height: 22).padding(3).offset(x: knob ? 20 : 0)
      }
      .frame(width: 48, height: 28)
      .opacity(enabled ? 1 : 0.4)
    }
    .buttonStyle(.press)
    .disabled(!enabled)
    .onChange(of: on) { _, v in
      withAnimation(.easeOut(duration: Motion.timings.knob)) { lit = v }
      withAnimation(Motion.knob) { knob = v }
    }
    .haptic(.selection, on: taps, "toggle")
    .accessibilityLabel(label)
    .accessibilityValue(on ? "On" : "Off")
    .accessibilityAddTraits(.isButton)
  }
}

/// A row of choices on a gray track; the chosen one is white with a soft shadow (or black, `inverted`). The pill slides to the
/// choice you tap (design/motion.mjs), and a tap gives a selection haptic.
struct Segmented: View {
  @Environment(\.theme) private var t
  @Namespace private var pill
  @State private var taps = 0
  let options: [(id: String, label: String)]
  let current: String
  var height: CGFloat = 34
  var size: CGFloat = 13
  var weight: Font.Weight = .semibold
  var inverted = false
  var equal = true
  var track: Color? = nil
  var pad: CGFloat = 4
  var gap: CGFloat = 4
  var hPad: CGFloat = 10
  let pick: (String) -> Void
  var body: some View {
    HStack(spacing: gap) {
      ForEach(options, id: \.id) { o in
        let on = o.id == current
        Button { if !on { taps += 1 }; pick(o.id) } label: {
          Text(o.label).css(size, weight).lineLimit(1)
            .foregroundStyle(on ? (inverted ? t.invText : t.text) : t.muted)
            .padding(.horizontal, hPad)
            .frame(maxWidth: equal ? .infinity : nil)
            .frame(height: height)
            .background {
              if on { Capsule().fill(inverted ? t.inv : t.bg).shadow(color: .black.opacity(inverted ? 0 : 0.14), radius: 1.5, x: 0, y: 1).matchedGeometryEffect(id: "pill", in: pill) }
            }
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
    .animation(Motion.knob, value: current)
    .padding(pad)
    .background(Capsule().fill(track ?? t.surf))
    .haptic(.selection, on: taps, "segmented")
  }
}

/// A dimmed page with a sheet sliding up from the bottom, the way the boards draw their sheets.
struct SheetOverlay<Content: View>: View {
  @Environment(\.theme) private var t
  var top: CGFloat? = 56
  var radius: CGFloat = 32
  let close: () -> Void
  @ViewBuilder var content: Content
  @State private var drag: CGFloat = 0
  var body: some View {
    ZStack(alignment: .bottom) {
      t.dim.ignoresSafeArea().onTapGesture(perform: close).transition(.opacity)
      VStack(spacing: 0) { content }
        .frame(maxWidth: .infinity, maxHeight: top == nil ? nil : .infinity, alignment: .top)
        .background(t.bg)
        .clipShape(UnevenRoundedRectangle(topLeadingRadius: radius, topTrailingRadius: radius, style: .continuous))
        .padding(.top, top.map { Screen.top($0) } ?? 0)
        .offset(y: max(0, drag))
        .gesture(DragGesture().onChanged { drag = $0.translation.height }.onEnded { v in
          if v.translation.height > 120 || v.predictedEndTranslation.height > 300 { close() }
          withAnimation(.out(0.3)) { drag = 0 }
        })
        .sheetTransition()
    }
    .ignoresSafeArea()
  }
}

/// The small grab handle on top of a sheet (40 x 5).
struct Grabber: View {
  @Environment(\.theme) private var t
  var color: Color? = nil
  var body: some View { Capsule().fill(color ?? t.surf2).frame(width: 40, height: 5) }
}

/// A row like CSS flex with flex-grow: each child gets its own width, then the space left over is shared by its grow
/// factor (`.grow(2)`; 1 by default). A child with `.basis0()` starts from nothing instead (flex: 1 1 0).
struct FlexRow: Layout {
  var spacing: CGFloat = 10
  struct Grow: LayoutValueKey { static let defaultValue: CGFloat = 1 }
  struct Zero: LayoutValueKey { static let defaultValue = false }
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
    let w = sizes.reduce(0) { $0 + $1.width } + spacing * CGFloat(max(0, subviews.count - 1))
    return CGSize(width: proposal.width ?? w, height: sizes.map(\.height).max() ?? 0)
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let bases = subviews.map { $0[Zero.self] ? 0 : $0.sizeThatFits(.unspecified).width }
    let grows = subviews.map { $0[Grow.self] }, total = max(0.0001, grows.reduce(0, +))
    let extra = max(0, bounds.width - bases.reduce(0, +) - spacing * CGFloat(max(0, subviews.count - 1)))
    var x = bounds.minX
    for (i, v) in subviews.enumerated() {
      let w = bases[i] + extra * grows[i] / total
      v.place(at: CGPoint(x: x, y: bounds.midY), anchor: .leading, proposal: ProposedViewSize(width: w, height: bounds.height))
      x += w + spacing
    }
  }
}
extension View {
  func grow(_ g: CGFloat) -> some View { layoutValue(key: FlexRow.Grow.self, value: g) }
  func basis0() -> some View { layoutValue(key: FlexRow.Zero.self, value: true) }
}
