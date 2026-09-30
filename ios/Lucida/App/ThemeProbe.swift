// Debug builds only: `-themeProbe <theme> -probeOut <folder>` paints a few pieces of a theme in the offscreen web view and
// saves each as a picture, printing how long it took ("PROBE …"), then quits. For checking the painter without a screen.
#if DEBUG
import SwiftUI

@MainActor
enum ThemeProbe {
  static var requested: String? { Board.arg("-themeProbe") }

  static func run(_ key: String) async {
    let out = URL(fileURLWithPath: Board.arg("-probeOut") ?? NSTemporaryDirectory() + "themeprobe")
    try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    let deck: [String: Any] = ["name": "Cell Biology", "seed": "Cell Biology", "round": 0, "tags": ["Biology"]]
    let cp: [String: Any] = ["card": "#FFFFFF", "line": "#EBEBEB", "shadow": "0 1px 2px rgba(0,0,0,.04), 0 18px 44px -18px rgba(0,0,0,.18)", "text": "#000000"]
    // `-probeKind <kind>`: just that one job (with the deck and sizes above), for trying a piece of the page.
    if let kind = Board.arg("-probeKind") {
      do { let m = try await ThemeRenderer.shared.make(ThemeJob(theme: key, kind: kind)); if let d = m.image?.pngData() { try d.write(to: out.appendingPathComponent("\(key)-\(kind).png")) }; print("PROBE ok \(kind)") }
      catch { print("PROBE FAIL \(kind): \(error)") }
      print("PROBE DONE"); try? await Task.sleep(nanoseconds: 300_000_000); exit(0)
    }
    let jobs: [(String, ThemeJob)] = [
      ("spec", ThemeJob(theme: key, kind: "spec")),
      ("bg", ThemeJob(theme: key, kind: "bg", fields: ["w": 390, "h": 844, "base": "#FFFFFF"])),
      ("face", ThemeJob(theme: key, kind: "face", fields: ["side": "front", "at": "phone", "w": 358, "h": 600, "radius": 32, "basePad": "26px 22px", "cp": cp, "pad": ["t": 100, "r": 16, "b": 120, "l": 16]])),
      ("faceback", ThemeJob(theme: key, kind: "face", fields: ["side": "back", "at": "phone", "w": 358, "h": 600, "radius": 32, "basePad": "26px 22px", "cp": cp, "pad": ["t": 100, "r": 16, "b": 120, "l": 16]])),
      ("head", ThemeJob(theme: key, kind: "cover", fields: ["d": deck, "shape": "head", "fs": 34, "w": 390, "h": 232, "r": 20])),
      ("thumb", ThemeJob(theme: key, kind: "cover", fields: ["d": deck, "shape": "square", "cs": "wide", "fs": 19, "cr": 20, "w": 48, "h": 48, "r": 14])),
      ("avatar", ThemeJob(theme: key, kind: "avatar", fields: ["size": 44, "ch": "A"])),
      ("tile", ThemeJob(theme: key, kind: "tile", fields: ["w": 110, "h": 146, "r": 11, "ch": "A"])),
    ]
    for (name, job) in jobs {
      let t0 = Date()
      do {
        let m = try await ThemeRenderer.shared.make(job, picture: name != "spec")
        var line = "PROBE ok \(name) \(Int(Date().timeIntervalSince(t0) * 1000))ms"
        if let img = m.image, let data = img.pngData() {
          try data.write(to: out.appendingPathComponent("\(key)-\(name).png"))
          line += " image \(Int(img.size.width))x\(Int(img.size.height)) @\(img.scale)x"
        }
        print(line, m.info.isEmpty ? "" : String(describing: m.info).prefix(200))
      } catch { print("PROBE FAIL \(name): \(error)") }
    }
    print("PROBE DONE")
    try? await Task.sleep(nanoseconds: 300_000_000)
    exit(0)
  }
}
#endif
