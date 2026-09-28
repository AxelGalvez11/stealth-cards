// The onboarding's page: soft folds of light that drift and change shape, a fade at the edges, and fine film grain that
// jumps a little ten times a second, like film (design/build.mjs obAura, OB_AURA, and OB_FRAG). The folds are the
// canvas's WebGL shader in Metal, drawn like the canvas draws it: on a 195 x 422 picture (half the board; the folds are
// soft, so it looks the same for a quarter of the work) stretched over the page, about 30 times a second. With Reduce
// Motion they hold still, and so does the grain. The shader is compiled when the app first needs it, so building the
// app doesn't need Xcode's separate Metal toolchain.
import SwiftUI
import MetalKit

/// The background's colors and grain for one mode (Generated.auraLight / auraDark, from OB_AURA), and the shadow of the
/// card that sits on it.
struct Aura {
  let base, lit, deep: RGBA
  let vig, grain: Double
  /// The grain multiplies (light mode) or overlays (dark mode).
  let multiply: Bool
  let slope, intercept: Double
  let card: [Shadow]
  static func of(_ t: Theme) -> Aura { t.dark ? Generated.auraDark : Generated.auraLight }
}

struct AuraBackground: View {
  let aura: Aura
  /// Just the folds, held still at 24 s (for checking them against the canvas).
  var bare = false
  @Environment(\.accessibilityReduceMotion) private var reduce
  private var still: Bool { reduce || bare }
  @State private var start = Date()
  /// The grain's jumps (the canvas's obGrain keyframes), one every tenth of a second.
  private static let jumps: [CGSize] = [.init(width: 0, height: 0), .init(width: -24, height: 16), .init(width: 18, height: -28), .init(width: -12, height: -20),
                                        .init(width: 28, height: 12), .init(width: -30, height: -6), .init(width: 8, height: 26), .init(width: -18, height: 30)]

  var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .topLeading) {
        aura.base.color
        AuraFolds(aura: aura, still: still)
        if !bare, let g = AuraGrain.image(aura) {
          TimelineView(.animation(minimumInterval: 0.1, paused: still)) { tl in
            let jump = still ? .zero : AuraBackground.jumps[Int(tl.date.timeIntervalSince(start) * 10) % 8]
            Image(decorative: g, scale: 3).resizable(resizingMode: .tile)
              .frame(width: geo.size.width + 96, height: geo.size.height + 96)
              .offset(x: -48 + jump.width, y: -48 + jump.height)
          }
          .blendMode(aura.multiply ? .multiply : .overlay)
          .opacity(aura.grain)
        }
      }
      .frame(width: geo.size.width, height: geo.size.height)
      .clipped()
    }
    .ignoresSafeArea()
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// The grain for the onboarding: the app's grain tile (gray noise pushed to 3.4 L - 1.2, with the noise's own alpha)
/// turned into the canvas's grain here, `slope` L + `intercept` (much brighter in light mode). The tile's clipped ends
/// stand for the middle of the tails they cut off.
enum AuraGrain {
  private static var made: [Double: CGImage] = [:]
  static func image(_ a: Aura) -> CGImage? {
    if let hit = made[a.slope * 100 + a.intercept] { return hit }
    guard let src = Grain.image else { return nil }
    let w = src.width, h = src.height
    var px = [UInt8](repeating: 0, count: w * h * 4)
    let ok: Bool = px.withUnsafeMutableBytes { buf in
      guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { return false }
      ctx.draw(src, in: CGRect(x: 0, y: 0, width: w, height: h))
      return true
    }
    guard ok else { return nil }
    for i in stride(from: 0, to: px.count, by: 4) {
      let al = Double(px[i + 3]) / 255
      guard al > 0 else { continue }
      let g = min(1, Double(px[i]) / 255 / al)
      let L = g <= 0.004 ? 0.33 : g >= 0.996 ? 0.67 : (g + 1.2) / 3.4
      let v = UInt8((min(1, max(0, a.slope * L + a.intercept)) * al * 255).rounded())
      px[i] = v; px[i + 1] = v; px[i + 2] = v
    }
    let img = FlowArt.makeImage(px, w, h)
    made[a.slope * 100 + a.intercept] = img
    return img
  }
}

/// The folds (OB_FRAG): gradient noise in three layers (fbm), stretched and leaned across the page, bent by more of
/// itself (domain warping), then turned into broad bands of light with a sine; the edges fade to the page color.
struct AuraFolds: UIViewRepresentable {
  let aura: Aura
  let still: Bool

  func makeCoordinator() -> Renderer { Renderer() }
  func makeUIView(context: Context) -> MTKView {
    let v = MTKView(frame: .zero, device: Renderer.device)
    v.isOpaque = false
    v.backgroundColor = .clear
    v.colorPixelFormat = .bgra8Unorm
    // The canvas's picture size, stretched over the page (the layer smooths it, like the browser does).
    v.autoResizeDrawable = false
    v.drawableSize = CGSize(width: 195, height: 422)
    v.contentMode = .scaleToFill
    (v.layer as? CAMetalLayer)?.colorspace = CGColorSpace(name: CGColorSpace.sRGB)
    v.preferredFramesPerSecond = 30
    v.delegate = context.coordinator
    v.isUserInteractionEnabled = false
    update(v, context.coordinator)
    return v
  }
  func updateUIView(_ v: MTKView, context: Context) { update(v, context.coordinator) }
  private func update(_ v: MTKView, _ r: Renderer) {
    r.aura = aura; r.still = still
    // Held still: drawn once (and again when the colors change).
    v.isPaused = still
    v.enableSetNeedsDisplay = still
    if still { v.setNeedsDisplay() }
  }

  final class Renderer: NSObject, MTKViewDelegate {
    static let device = MTLCreateSystemDefaultDevice()
    private static let pipeline: MTLRenderPipelineState? = {
      guard let device else { return nil }
      let opts = MTLCompileOptions()
      opts.mathMode = .safe
      guard let lib = try? device.makeLibrary(source: SOURCE, options: opts) else { return nil }
      let d = MTLRenderPipelineDescriptor()
      d.vertexFunction = lib.makeFunction(name: "auraVertex")
      d.fragmentFunction = lib.makeFunction(name: "auraFragment")
      d.colorAttachments[0].pixelFormat = .bgra8Unorm
      return try? device.makeRenderPipelineState(descriptor: d)
    }()
    private lazy var queue = Renderer.device?.makeCommandQueue()
    var aura = Generated.auraLight
    var still = false
    /// It starts 24 s in, so the first frame already has folds.
    private let t0 = CACurrentMediaTime() - 24

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}
    func draw(in view: MTKView) {
      guard let pipe = Renderer.pipeline, let queue, let pass = view.currentRenderPassDescriptor, let drawable = view.currentDrawable,
            let buf = queue.makeCommandBuffer(), let enc = buf.makeRenderCommandEncoder(descriptor: pass) else { return }
      let a = aura, s = view.drawableSize
      var u: [Float] = [Float(s.width), Float(s.height), Float(still ? 24 : CACurrentMediaTime() - t0), Float(a.vig),
                        Float(a.base.r), Float(a.base.g), Float(a.base.b), 0, Float(a.lit.r), Float(a.lit.g), Float(a.lit.b), 0, Float(a.deep.r), Float(a.deep.g), Float(a.deep.b), 0]
      enc.setRenderPipelineState(pipe)
      enc.setFragmentBytes(&u, length: u.count * 4, index: 0)
      enc.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
      enc.endEncoding()
      buf.present(drawable)
      buf.commit()
    }
  }
}

/// OB_FRAG in Metal. The picture's y goes down where WebGL's goes up, so it's flipped to match.
private let SOURCE = """
#include <metal_stdlib>
using namespace metal;
struct U { float2 R; float t; float V; float4 B; float4 H; float4 D; };
vertex float4 auraVertex(uint i [[vertex_id]]) {
  float2 p[3] = { float2(-1.0, -1.0), float2(3.0, -1.0), float2(-1.0, 3.0) };
  return float4(p[i], 0.0, 1.0);
}
static float2 h2(float2 p) {
  p = float2(dot(p, float2(127.1, 311.7)), dot(p, float2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
static float gn(float2 p) {
  float2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(h2(i), f), dot(h2(i + float2(1.0, 0.0)), f - float2(1.0, 0.0)), u.x),
             mix(dot(h2(i + float2(0.0, 1.0)), f - float2(0.0, 1.0)), dot(h2(i + 1.0), f - 1.0), u.x), u.y);
}
static float fbm(float2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * gn(p); p = float2x2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
  return s;
}
fragment float4 auraFragment(float4 pos [[position]], constant U &u [[buffer(0)]]) {
  float2 R = u.R, fc = float2(pos.x, R.y - pos.y);
  float2 uv = fc / R, p = (fc - 0.5 * R) / R.y;
  float T = u.t * 0.07;
  float2 q = float2x2(0.87, 0.5, -0.5, 0.87) * p * float2(0.55, 1.3);
  float2 w = float2(fbm(q * 1.2 + float2(0.8 * T, 0.3 * T)), fbm(q * 1.2 + float2(4.1, 2.7) - float2(0.5 * T, 0.7 * T)));
  float f = fbm(q + 1.5 * w + float2(0.0, 0.4 * T));
  float band = 0.5 + 0.5 * sin(7.0 * f + 3.6 * q.y + T);
  float L = smoothstep(0.12, 0.95, band);
  L = L * L * (3.0 - 2.0 * L);
  float3 c = mix(u.D.xyz, u.H.xyz, L);
  float v = smoothstep(1.15, 0.15, length((uv - 0.5) * float2(1.2, 1.0)));
  return float4(mix(u.B.xyz, c, mix(1.0, v, u.V)), 1.0);
}
"""

extension View {
  /// CSS box-shadows (every layer, the first on top) under a rounded rectangle, like the boards' `cardShadow`.
  func shadows(_ layers: [Shadow], radius r: CGFloat) -> some View {
    background {
      GeometryReader { g in
        ZStack {
          // A layer whose negative spread is bigger than the box has nothing left to draw (like CSS).
          ForEach(Array(layers.enumerated().reversed()).filter { g.size.width + 2 * $0.element.spread > 0 && g.size.height + 2 * $0.element.spread > 0 }, id: \.offset) { _, s in
            RoundedRectangle(cornerRadius: max(0, r + s.spread), style: .continuous).fill(s.color.color)
              .frame(width: g.size.width + 2 * s.spread, height: g.size.height + 2 * s.spread)
              .blur(radius: s.blur / 2).offset(x: s.x, y: s.y)
          }
        }
        .frame(width: g.size.width, height: g.size.height)
      }
    }
  }
}
