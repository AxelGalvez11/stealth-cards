// The noise behind the canvas's gradient cards: SVG's feTurbulence, as the SVG spec's reference code computes it, and
// its Gaussian blur (three box blurs). Plain Foundation, so a Mac tool can use it too (the grain picture is made once).
import Foundation

/// feTurbulence for one seed.
struct Turbulence {
  private static let B = 0x100, BM = 0xff, N = 0x1000
  private var lattice = [Int](repeating: 0, count: 0x100 + 0x100 + 2)
  /// [channel][index][x or y], flattened.
  private var grad = [Double](repeating: 0, count: 4 * (0x100 + 0x100 + 2) * 2)

  init(seed: Int) {
    let m = 2147483647, a = 16807, q = 127773, r = 2836
    var s = seed
    if s <= 0 { s = -(s % (m - 1)) + 1 }
    if s > m - 1 { s = m - 1 }
    func next() -> Int { var v = a * (s % q) - r * (s / q); if v <= 0 { v += m }; s = v; return v }
    let B = Turbulence.B, stride = (B + B + 2) * 2
    for k in 0..<4 {
      for i in 0..<B {
        lattice[i] = i
        for j in 0..<2 { grad[k * stride + i * 2 + j] = Double((next() % (B + B)) - B) / Double(B) }
        let gx = grad[k * stride + i * 2], gy = grad[k * stride + i * 2 + 1], len = (gx * gx + gy * gy).squareRoot()
        if len > 0 { grad[k * stride + i * 2] = gx / len; grad[k * stride + i * 2 + 1] = gy / len }
      }
    }
    var i = B
    while true {
      i -= 1
      if i == 0 { break }
      let k = lattice[i], j = next() % B
      lattice[i] = lattice[j]; lattice[j] = k
    }
    for i in 0..<(B + 2) {
      lattice[B + i] = lattice[i]
      for k in 0..<4 { for j in 0..<2 { grad[k * stride + (B + i) * 2 + j] = grad[k * stride + i * 2 + j] } }
    }
  }

  struct Stitch { var width: Int, height: Int, wrapX: Int, wrapY: Int }

  private func noise2(_ ch: Int, _ vx: Double, _ vy: Double, _ st: Stitch?) -> Double {
    let BM = Turbulence.BM, N = Double(Turbulence.N), stride = (Turbulence.B + Turbulence.B + 2) * 2
    var t = vx + N
    var bx0 = Int(t) & BM, bx1 = (bx0 + 1) & BM
    let rx0 = t - Double(Int(t)), rx1 = rx0 - 1
    t = vy + N
    var by0 = Int(t) & BM, by1 = (by0 + 1) & BM
    let ry0 = t - Double(Int(t)), ry1 = ry0 - 1
    if let st {
      // Stitching works on the unmasked lattice values, as in the spec.
      var ux0 = Int(vx + N), ux1 = ux0 + 1, uy0 = Int(vy + N), uy1 = uy0 + 1
      if ux0 >= st.wrapX { ux0 -= st.width }
      if ux1 >= st.wrapX { ux1 -= st.width }
      if uy0 >= st.wrapY { uy0 -= st.height }
      if uy1 >= st.wrapY { uy1 -= st.height }
      bx0 = ux0 & BM; bx1 = ux1 & BM; by0 = uy0 & BM; by1 = uy1 & BM
    }
    let i = lattice[bx0], j = lattice[bx1]
    let b00 = lattice[i + by0], b10 = lattice[j + by0], b01 = lattice[i + by1], b11 = lattice[j + by1]
    let sx = rx0 * rx0 * (3 - 2 * rx0), sy = ry0 * ry0 * (3 - 2 * ry0)
    let base = ch * stride
    var u = rx0 * grad[base + b00 * 2] + ry0 * grad[base + b00 * 2 + 1]
    var v = rx1 * grad[base + b10 * 2] + ry0 * grad[base + b10 * 2 + 1]
    let a = u + sx * (v - u)
    u = rx0 * grad[base + b01 * 2] + ry1 * grad[base + b01 * 2 + 1]
    v = rx1 * grad[base + b11 * 2] + ry1 * grad[base + b11 * 2 + 1]
    let b = u + sx * (v - u)
    return a + sy * (b - a)
  }

  /// fractalNoise (or turbulence) for one channel at a point, 0...1 like the filter's output.
  func value(_ ch: Int, x: Double, y: Double, freq fx0: Double, _ fy0: Double, octaves: Int, fractal: Bool = true,
             stitchTile: (x: Double, y: Double, w: Double, h: Double)? = nil) -> Double {
    var fx = fx0, fy = fy0, st: Stitch? = nil
    if let tile = stitchTile {
      if fx != 0 { let lo = floor(tile.w * fx) / tile.w, hi = ceil(tile.w * fx) / tile.w; fx = fx / lo < hi / fx ? lo : hi }
      if fy != 0 { let lo = floor(tile.h * fy) / tile.h, hi = ceil(tile.h * fy) / tile.h; fy = fy / lo < hi / fy ? lo : hi }
      let w = Int(tile.w * fx + 0.5), h = Int(tile.h * fy + 0.5)
      st = Stitch(width: w, height: h, wrapX: Int(tile.x * fx + Double(Turbulence.N)) + w, wrapY: Int(tile.y * fy + Double(Turbulence.N)) + h)
    }
    var sum = 0.0, vx = x * fx, vy = y * fy, ratio = 1.0
    for _ in 0..<octaves {
      let n = noise2(ch, vx, vy, st)
      sum += (fractal ? n : abs(n)) / ratio
      vx *= 2; vy *= 2; ratio *= 2
      if st != nil {
        st!.width *= 2; st!.wrapX = 2 * st!.wrapX - Turbulence.N
        st!.height *= 2; st!.wrapY = 2 * st!.wrapY - Turbulence.N
      }
    }
    let c = fractal ? (sum + 1) / 2 : sum
    return min(1, max(0, c))
  }
}

/// Premultiplied RGBA floats, row by row (4 per pixel).
enum Pixels {
  /// Gaussian blur as SVG does it: three box blurs each way (the spec's sizes, even ones included).
  static func blur(_ p: inout [Float], w: Int, h: Int, sigma: Double) {
    guard sigma > 0 else { return }
    let d = Int((sigma * 3 * (2 * Double.pi).squareRoot() / 4 + 0.5).rounded(.down))
    guard d > 1 else { return }
    let passes: [(Int, Int)] = d % 2 == 1
      ? Array(repeating: (-(d - 1) / 2, (d - 1) / 2), count: 3)
      : [(-d / 2, d / 2 - 1), (-d / 2 + 1, d / 2), (-d / 2, d / 2)]
    var tmp = [Float](repeating: 0, count: p.count)
    for (lo, hi) in passes { box(&p, &tmp, w: w, h: h, lo: lo, hi: hi, horizontal: true) }
    for (lo, hi) in passes { box(&p, &tmp, w: w, h: h, lo: lo, hi: hi, horizontal: false) }
  }

  /// One box blur over [x + lo, x + hi]; outside the picture is transparent.
  private static func box(_ p: inout [Float], _ tmp: inout [Float], w: Int, h: Int, lo: Int, hi: Int, horizontal: Bool) {
    let size = Float(hi - lo + 1), lines = horizontal ? h : w, len = horizontal ? w : h
    p.withUnsafeMutableBufferPointer { src in
      tmp.withUnsafeMutableBufferPointer { dst in
        for line in 0..<lines {
          let at = { (k: Int) -> Int in (horizontal ? line * w + k : k * w + line) * 4 }
          var s0: Float = 0, s1: Float = 0, s2: Float = 0, s3: Float = 0
          // Window for position 0.
          for k in lo...hi where k >= 0 && k < len { let o = at(k); s0 += src[o]; s1 += src[o + 1]; s2 += src[o + 2]; s3 += src[o + 3] }
          for k in 0..<len {
            let o = at(k)
            dst[o] = s0 / size; dst[o + 1] = s1 / size; dst[o + 2] = s2 / size; dst[o + 3] = s3 / size
            let out = k + lo, inn = k + hi + 1
            if out >= 0 && out < len { let q = at(out); s0 -= src[q]; s1 -= src[q + 1]; s2 -= src[q + 2]; s3 -= src[q + 3] }
            if inn >= 0 && inn < len { let q = at(inn); s0 += src[q]; s1 += src[q + 1]; s2 += src[q + 2]; s3 += src[q + 3] }
          }
        }
        for i in 0..<src.count { src[i] = dst[i] }
      }
    }
  }

  /// The canvas's film grain as one tile that repeats: gray fractal noise (freq .85 per point, 3 octaves, stitched),
  /// desaturated and pushed to high contrast (slope 3.4), with the noise's own alpha. Premultiplied RGBA bytes.
  static func grainTile(points: Int, scale: Int) -> [UInt8] {
    let t = Turbulence(seed: 0), n = points * scale, size = Double(points)
    var out = [UInt8](repeating: 0, count: n * n * 4)
    for y in 0..<n {
      for x in 0..<n {
        let px = (Double(x) + 0.5) / Double(scale), py = (Double(y) + 0.5) / Double(scale)
        let tile = (x: 0.0, y: 0.0, w: size, h: size)
        let r = t.value(0, x: px, y: py, freq: 0.85, 0.85, octaves: 3, stitchTile: tile)
        let g = t.value(1, x: px, y: py, freq: 0.85, 0.85, octaves: 3, stitchTile: tile)
        let b = t.value(2, x: px, y: py, freq: 0.85, 0.85, octaves: 3, stitchTile: tile)
        let a = t.value(3, x: px, y: py, freq: 0.85, 0.85, octaves: 3, stitchTile: tile)
        let gray = min(1, max(0, 3.4 * (0.2126 * r + 0.7152 * g + 0.0722 * b) - 1.2))
        let o = (y * n + x) * 4
        let v = UInt8((gray * a * 255).rounded()), al = UInt8((a * 255).rounded())
        out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = al
      }
    }
    return out
  }
}
