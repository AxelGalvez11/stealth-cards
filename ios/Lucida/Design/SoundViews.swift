// Waveforms (design/build.mjs "Sound: waveforms"): every sound shows its waveform, like a voice note. Bars from the
// clip's real peaks, the part already played in the text color and the rest faint; a tap or a drag on it jumps there.
// While a clip plays, only these pieces move, every frame (the screens redraw when it starts, pauses, or ends).
import SwiftUI

extension WaveCode {
  /// n bars from a clip's peaks: the loudest in each stretch, at least 9% tall (in whole percents, as the canvas has them).
  static func bars(_ peaks: [Double], _ n: Int) -> [Double] {
    let P = peaks.isEmpty ? [0] : peaks
    return (0..<n).map { i in
      let a = i * P.count / n, b = max(a + 1, (i + 1) * P.count / n)
      return max(9, ((P[a..<min(b, P.count)].max() ?? 0) * 100).rounded()) / 100
    }
  }
}

/// Numbers that animate one by one (bar heights settling into a clip's shape when it arrives).
struct Heights: VectorArithmetic {
  var v: [Double]
  static var zero: Heights { Heights(v: []) }
  private static func zip(_ a: Heights, _ b: Heights, _ f: (Double, Double) -> Double) -> Heights {
    Heights(v: (0..<max(a.v.count, b.v.count)).map { f($0 < a.v.count ? a.v[$0] : 0, $0 < b.v.count ? b.v[$0] : 0) })
  }
  static func + (a: Heights, b: Heights) -> Heights { zip(a, b, +) }
  static func - (a: Heights, b: Heights) -> Heights { zip(a, b, -) }
  mutating func scale(by k: Double) { v = v.map { $0 * k } }
  var magnitudeSquared: Double { v.reduce(0) { $0 + $1 * $1 } }
}

/// Bars across the width, as tall as their fractions of the height, centered, with round ends (flex: 1 1 0 bars).
struct BarsShape: Shape {
  var heights: Heights
  var gap: CGFloat
  var animatableData: Heights { get { heights } set { heights = newValue } }
  func path(in r: CGRect) -> Path {
    var p = Path()
    let n = heights.v.count
    guard n > 0 else { return p }
    let w = max(0, (r.width - gap * CGFloat(n - 1)) / CGFloat(n))
    for (i, f) in heights.v.enumerated() {
      let h = r.height * CGFloat(max(0, f)), rad = min(2, w / 2, h / 2)
      p.addRoundedRect(in: CGRect(x: r.minX + CGFloat(i) * (w + gap), y: r.midY - h / 2, width: w, height: h), cornerSize: CGSize(width: rad, height: rad))
    }
    return p
  }
}

/// A clip's waveform, and a slider: tap or drag on it to jump there (the waveform follows the finger; letting go moves
/// the sound).
struct WaveRow: View {
  @EnvironmentObject private var store: Store
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  let clip: Clip?
  let vm: SoundVM
  let bars: Int
  var gap: CGFloat = 2
  var seek = true

  var body: some View {
    let hs = Heights(v: WaveCode.bars(vm.peaks, bars))
    GeometryReader { g in
      let at = { (x: CGFloat) in g.size.width > 0 ? min(1, max(0, Double(x / g.size.width))) : 0 }
      ZStack(alignment: .leading) {
        BarsShape(heights: hs, gap: gap).fill(t.text.opacity(0.22))
        BarsShape(heights: hs, gap: gap).fill(t.text)
          .mask(alignment: .leading) { Played(key: vm.key, on: vm.on, width: g.size.width) }
      }
      .contentShape(Rectangle())
      .gesture(DragGesture(minimumDistance: 0)
        .onChanged { store.seekSound(clip, at($0.location.x), dragging: true) }
        .onEnded { store.seekSound(clip, at($0.location.x), dragging: false) }, including: seek && !vm.key.isEmpty ? .all : .none)
    }
    .animation(still ? nil : .out(0.35), value: hs)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Where to play from")
    .accessibilityValue(valueText)
    .accessibilityAdjustableAction { dir in
      let x = store.soundLive(vm.key).frac, step = vm.dur > 0 ? min(0.25, 1 / vm.dur) : 0.05
      store.seekSound(clip, min(1, max(0, dir == .increment ? x + step : x - step)), dragging: false)
    }
    .accessibilityHidden(!seek || vm.key.isEmpty)
  }
  private var valueText: String {
    let f = store.soundLive(vm.key).frac
    return vm.speech ? "\(Int((f * 100).rounded()))%" : WaveCode.clock(f * vm.dur) + " of " + vm.total
  }
}

/// The played part: as wide as the clip is far along, following it every frame while it plays.
private struct Played: View {
  @EnvironmentObject private var store: Store
  @ObservedObject private var sound = Sound.shared
  let key: String, on: Bool, width: CGFloat
  var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: !on)) { _ in
      Rectangle().frame(width: width * CGFloat(store.soundLive(key).frac)).frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

/// A clip's time: where it's at (`at`), or (`time`) how long it is until it has played a little, then where it's at.
struct ClipTime: View {
  @EnvironmentObject private var store: Store
  @ObservedObject private var sound = Sound.shared
  let vm: SoundVM
  var at = false
  var body: some View {
    TimelineView(.animation(minimumInterval: 0.05, paused: !vm.on)) { _ in
      let x = store.soundLive(vm.key)
      Text(at || x.frac > 0 || x.on ? WaveCode.clock(x.frac * vm.dur) : vm.total).monospacedDigit()
    }
  }
}

/// Play, or Pause while it plays: a round button in the inverse color.
struct PlayButton: View {
  @EnvironmentObject private var store: Store
  @Environment(\.theme) private var t
  let clip: Clip?
  let vm: SoundVM
  let size: CGFloat
  let glyph: CGFloat
  var body: some View {
    Button { store.playSound(clip) } label: {
      Icon(vm.on ? "pause" : "play", glyph).foregroundStyle(t.invText).frame(width: size, height: size).background(Circle().fill(t.inv))
    }
    .buttonStyle(.press)
    .accessibilityLabel(vm.on ? "Pause" : "Play the sound")
  }
}

/// The microphone's level while recording: thin bars that slide along, the newest at the right (with Reduce Motion
/// they just show the levels).
struct RecBars: View {
  @EnvironmentObject private var store: Store
  @Environment(\.theme) private var t
  var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: store.demo || store.recSaving)) { _ in
      let r = store.recLive(), ink = t.text
      Canvas { ctx, size in
        let n = 71, pitch: CGFloat = 5, x0 = size.width - (pitch * CGFloat(n) - 2) - 5 * CGFloat(r.slide)
        for i in 0..<n {
          let k = r.levels.count - (n - 1) + i, v = i == n - 1 ? r.level : k >= 0 ? r.levels[k] : 0
          let h = size.height * max(9, (v * 100).rounded()) / 100
          ctx.fill(Path(roundedRect: CGRect(x: x0 + CGFloat(i) * pitch, y: (size.height - h) / 2, width: 3, height: h), cornerRadius: min(1.5, h / 2)), with: .color(ink))
        }
      }
    }
    .accessibilityHidden(true)
  }
}

/// The recording's time, and the red dot beside it that pulses while it records (still with Reduce Motion).
struct RecTime: View {
  @EnvironmentObject private var store: Store
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var dim = false
  var body: some View {
    let saving = store.recSaving
    HStack(spacing: 6) {
      if !saving {
        Circle().fill(t.again).frame(width: 7, height: 7).opacity(dim ? 0.25 : 1)
          .onAppear { if !still { withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) { dim = true } } }
      }
      TimelineView(.periodic(from: .now, by: 0.25)) { _ in
        Text(saving ? "Saving…" : WaveCode.clock(store.recLive().secs)).monospacedDigit()
      }
    }
    .css(12, mono: true)
    .foregroundStyle(saving ? t.muted : t.again)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(saving ? "Saving the recording" : "Recording time")
  }
}
