// The themes' pictures, kept: what the painter (ThemeRender.swift) made, in memory and on disk, and what a screen asks
// for. A screen asks for a piece; it gets it at once if it's kept, and otherwise gets nothing yet (it shows Lucida's own
// look) while the painter makes it. The pictures are keyed by the theme, the piece, its size, and a stamp of the web app's
// theme code (a fingerprint of /themes/kit.js and the theme's module), so a change to a theme on the web paints again.
import SwiftUI
import CryptoKit

/// What a theme says about itself (web/themes/<key>.js).
struct ThemeSpec: Equatable {
  var key = "", name = "", short = "", line = "", fonts = ""
  /// Whether the study screen's buttons take Lucida's dark look on it (the theme's own darkness, not the app's).
  var dark = false
  /// How wide its lettering runs, and whether its cover has a picture beside the deck's name on a deck page.
  var cw: CGFloat = 0, headArt = false
  init?(_ d: [String: Any]) {
    guard let k = d["key"] as? String else { return nil }
    key = k; name = d["name"] as? String ?? k; short = d["short"] as? String ?? name; line = d["line"] as? String ?? ""; fonts = d["fonts"] as? String ?? ""
    dark = (d["dark"] as? Bool) ?? ((d["dark"] as? NSNumber)?.boolValue ?? false)
    cw = CGFloat((d["cw"] as? NSNumber)?.doubleValue ?? 0); headArt = (d["headArt"] as? NSNumber)?.boolValue ?? false
  }
  var raw: [String: Any] { ["key": key, "name": name, "short": short, "line": line, "fonts": fonts, "dark": dark, "cw": Double(cw), "headArt": headArt] }
}

/// A kept picture and what the painter said about it.
struct ThemePic {
  let image: UIImage
  let info: [String: Any]
  var size: CGSize { image.size }
  /// How far the picture reaches around the box it stands for (a shadow, a ring).
  var pad: UIEdgeInsets {
    let p = info["pad"] as? [String: Any]
    if let p { return UIEdgeInsets(top: p.num("t"), left: p.num("l"), bottom: p.num("b"), right: p.num("r")) }
    let n = info.num("pad")
    return UIEdgeInsets(top: n, left: n, bottom: n, right: n)
  }
  func string(_ k: String) -> String { info[k] as? String ?? "" }
}

extension Dictionary where Key == String, Value == Any {
  func num(_ k: String) -> CGFloat { CGFloat((self[k] as? NSNumber)?.doubleValue ?? 0) }
}

@MainActor
final class ThemeArt: ObservableObject {
  static let shared = ThemeArt()
  /// Goes up whenever something arrives (a screen that draws a theme draws again).
  @Published private(set) var tick = 0

  private var specs: [String: ThemeSpec] = [:]
  private var stamps: [String: String] = [:]
  private var stamping: Set<String> = []
  private var mem = NSCache<NSString, UIImage>()
  private var infos: [String: [String: Any]] = [:]
  private var asked: Set<String> = []
  private var failed: [String: Date] = [:]
  private var queue: [(job: ThemeJob, low: Bool)] = []
  private var worker: Task<Void, Never>?
  private var noWindowTries = 0
  private let dir: URL = {
    let d = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("lucida-themes", isDirectory: true)
    try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
    return d
  }()
  private let defaults = UserDefaults.standard

  init() {
    mem.totalCostLimit = 96 * 1024 * 1024
    let dir = self.dir
    Task.detached(priority: .background) { ThemeArt.prune(dir, keep: 250 * 1024 * 1024) }
  }

  /// The pictures are only pictures: when they come to more than `keep` bytes, the ones of themes not used lately go.
  nonisolated static func prune(_ dir: URL, keep: Int) {
    let fm = FileManager.default
    guard let folders = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey], options: .skipsHiddenFiles) else { return }
    var sized: [(url: URL, bytes: Int, at: Date)] = []
    for f in folders {
      var bytes = 0, at = (try? f.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
      for u in (fm.enumerator(at: f, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey])?.allObjects as? [URL]) ?? [] {
        let v = try? u.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey])
        bytes += v?.fileSize ?? 0
        if let d = v?.contentModificationDate, d > at { at = d }
      }
      sized.append((f, bytes, at))
    }
    var total = sized.reduce(0) { $0 + $1.bytes }
    for x in sized.sorted(by: { $0.at < $1.at }) where total > keep { try? fm.removeItem(at: x.url); total -= x.bytes }
  }
  /// Something a screen draws changed (a font arrived).
  func bump() { tick += 1 }

  // ---------- the stamp of a theme's code ----------
  /// A fingerprint of the web app's theme code for `theme` (kit.js, load.js, and the module): pictures made from other
  /// code are paid no mind. The last one seen is kept, so a theme in use draws at once at launch; the server's is fetched
  /// once per launch, and a change makes the pictures again.
  func stamp(_ theme: String) -> String? {
    if stamps[theme] == nil, let s = defaults.string(forKey: "themeStamp." + theme) { stamps[theme] = s }
    refreshStamp(theme)
    return stamps[theme].map { $0 + painter }
  }
  /// A fingerprint of the painter's own page (a new version of the app that paints differently paints again).
  private let painter: String = {
    guard let url = Bundle.main.url(forResource: "ThemePage", withExtension: "html"), let d = try? Data(contentsOf: url) else { return "" }
    return "-" + SHA256.hash(data: d).prefix(3).map { String(format: "%02x", $0) }.joined()
  }()
  private var refreshed: Set<String> = []
  private var stampTried: [String: Date] = [:]
  private func refreshStamp(_ theme: String) {
    guard !refreshed.contains(theme), !stamping.contains(theme) else { return }
    // (offline, it tries again every so often, not every time a screen draws)
    if let t = stampTried[theme], Date().timeIntervalSince(t) < 15 { return }
    stampTried[theme] = Date()
    stamping.insert(theme)
    Task {
      var h = SHA256()
      var ok = true
      for file in ["kit.js", "load.js", theme + ".js"] {
        var r = URLRequest(url: API.base.appendingPathComponent("themes/" + file))
        r.cachePolicy = .reloadIgnoringLocalCacheData; r.timeoutInterval = 12
        if let (data, resp) = try? await URLSession.shared.data(for: r), (resp as? HTTPURLResponse)?.statusCode == 200 { h.update(data: data) } else { ok = false; break }
      }
      stamping.remove(theme)
      guard ok else { return }
      refreshed.insert(theme)
      let s = h.finalize().prefix(6).map { String(format: "%02x", $0) }.joined()
      if stamps[theme] != s {
        let old = stamps[theme]
        stamps[theme] = s; defaults.set(s, forKey: "themeStamp." + theme)
        if let old { try? FileManager.default.removeItem(at: folder(theme, old + painter)) }
        mem.removeAllObjects(); infos = [:]; specs[theme] = nil
        asked = asked.filter { !$0.contains("#" + theme + "|") }; failed = failed.filter { !$0.key.contains("#" + theme + "|") }
        tick += 1
      }
    }
  }
  private func folder(_ theme: String, _ stamp: String) -> URL { dir.appendingPathComponent(theme + "-" + stamp, isDirectory: true) }

  // ---------- what a theme says about itself ----------
  /// The theme's details, once known (kept on disk; asked of the painter the first time).
  func spec(_ key: String) -> ThemeSpec? {
    if let s = specs[key] { return s }
    let job = ThemeJob(theme: key, kind: "spec")
    if let pic = valueOf(job), let s = ThemeSpec(pic) { specs[key] = s; return s }
    return nil
  }

  // ---------- pictures ----------
  /// A piece of a theme, if it's kept; otherwise it's asked for (`low`: a warm-up, after what a screen needs).
  func picture(_ job: ThemeJob, low: Bool = false) -> ThemePic? {
    guard let stamp = stamp(job.theme) else { return nil }
    let k = stampedKey(job, stamp)
    if let img = mem.object(forKey: k as NSString), let info = infos[k] { return ThemePic(image: img, info: info) }
    if let (img, info) = readDisk(job, stamp) {
      mem.setObject(img, forKey: k as NSString, cost: Int(img.size.width * img.size.height * img.scale * img.scale * 4)); infos[k] = info
      return ThemePic(image: img, info: info)
    }
    ask(job, key: k, stamp: stamp, low: low)
    return nil
  }
  /// The values a job that makes no picture gives (a theme's details, how a card sets its words), if kept.
  func valueOf(_ job: ThemeJob, low: Bool = false) -> [String: Any]? {
    guard let stamp = stamp(job.theme) else { return nil }
    let k = stampedKey(job, stamp)
    if let info = infos[k] { return info }
    if let info = readInfo(job, stamp) { infos[k] = info; return info }
    ask(job, key: k, stamp: stamp, low: low)
    return nil
  }

  private func stampedKey(_ job: ThemeJob, _ stamp: String) -> String { stamp + "#" + job.key }
  private func names(_ job: ThemeJob, _ stamp: String) -> (folder: URL, base: String) {
    let hash = SHA256.hash(data: Data(job.key.utf8)).prefix(12).map { String(format: "%02x", $0) }.joined()
    return (folder(job.theme, stamp), hash)
  }
  private func isOpaque(_ job: ThemeJob) -> Bool { job.kind == "bg" }
  private func readInfo(_ job: ThemeJob, _ stamp: String) -> [String: Any]? {
    let n = names(job, stamp)
    guard let d = try? Data(contentsOf: n.folder.appendingPathComponent(n.base + ".json")) else { return nil }
    return (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
  }
  private func readDisk(_ job: ThemeJob, _ stamp: String) -> (UIImage, [String: Any])? {
    let n = names(job, stamp)
    guard let info = readInfo(job, stamp), let d = try? Data(contentsOf: n.folder.appendingPathComponent(n.base + (isOpaque(job) ? ".jpg" : ".png"))),
          let img = UIImage(data: d, scale: UIScreen.main.scale) else { return nil }
    return (img, info)
  }

  private func ask(_ job: ThemeJob, key: String, stamp: String, low: Bool) {
    if let f = failed[key], Date().timeIntervalSince(f) < 20 { return }
    if asked.contains(key) {
      // Asked again by a screen (not a warm-up): it goes to the front.
      if !low, let i = queue.firstIndex(where: { stampedKey($0.job, stamp) == key }), queue[i].low { queue[i].low = false }
      return
    }
    asked.insert(key)
    // (a newer job for the same slot takes the place of one still waiting)
    if let slot = job.slot { for old in queue where old.job.slot == slot { asked.remove(stampedKey(old.job, stamp)) }; queue.removeAll { $0.job.slot == slot } }
    queue.append((job, low))
    if worker == nil { worker = Task { await work() } }
  }

  private func work() async {
    while let i = queue.firstIndex(where: { !$0.low }) ?? queue.indices.first {
      let item = queue.remove(at: i), job = item.job
      guard let stamp = stamp(job.theme) else { continue }
      let k = stampedKey(job, stamp)
      let wantsPicture = job.kind != "spec" && job.kind != "facespec"
      do {
        let made = try await ThemeRenderer.shared.make(job, picture: wantsPicture)
        guard self.stamp(job.theme) == stamp else { asked.remove(k); continue }
        infos[k] = made.info
        if let img = made.image { mem.setObject(img, forKey: k as NSString, cost: Int(img.size.width * img.size.height * img.scale * img.scale * 4)) }
        save(job, stamp, made)
        tick += 1
      } catch {
        // (the app's window isn't there yet, in the first moments: try again shortly)
        if case ThemeRenderer.Failure.noWindow = error, noWindowTries < 40 {
          noWindowTries += 1
          queue.insert(item, at: 0)
          try? await Task.sleep(nanoseconds: 300_000_000)
          continue
        }
        asked.remove(k); failed[k] = Date()
        #if DEBUG
        print("THEME failed \(job.kind) \(job.theme): \(error)")
        #endif
      }
    }
    worker = nil
  }

  private func save(_ job: ThemeJob, _ stamp: String, _ made: ThemeMade) {
    let n = names(job, stamp), opaque = isOpaque(job)
    let data: Data? = made.image.flatMap { opaque ? $0.jpegData(compressionQuality: 0.9) : $0.pngData() }
    let info = try? JSONSerialization.data(withJSONObject: made.info)
    Task.detached(priority: .utility) {
      try? FileManager.default.createDirectory(at: n.folder, withIntermediateDirectories: true)
      if let data { try? data.write(to: n.folder.appendingPathComponent(n.base + (opaque ? ".jpg" : ".png")), options: .atomic) }
      if let info { try? info.write(to: n.folder.appendingPathComponent(n.base + ".json"), options: .atomic) }
    }
  }

  /// Nothing is kept for a theme any more (a theme picked and dropped again keeps its pictures, which are only pictures).
  func forget(_ theme: String) {
    mem.removeAllObjects(); infos = [:]; asked = []
    if let s = stamp(theme) { try? FileManager.default.removeItem(at: folder(theme, s)) }
  }
}

// ---------- jobs, as the screens ask for them ----------
extension ThemeJob {
  /// The theme's details.
  static func spec(_ theme: String) -> ThemeJob { ThemeJob(theme: theme, kind: "spec") }
  /// The study background at the size of the screen; `base`: the page color under it.
  static func bg(_ theme: String, size: CGSize, base: RGBA) -> ThemeJob {
    ThemeJob(theme: theme, kind: "bg", fields: ["w": Int(size.width.rounded()), "h": Int(size.height.rounded()), "base": base.css])
  }
  /// A deck's cover (its art) at a size; `cs`: the shape its own values are worked out for; `shadow`: with the cover's own.
  static func cover(_ theme: String, deck: [String: Any], shape: String, cs: String? = nil, fs: Int, cr: Int? = nil, size: CGSize, r: Int, shadow: Bool = false, pad: Int = 0) -> ThemeJob {
    var f: [String: Any] = ["d": deck, "shape": shape, "fs": fs, "w": Int(size.width.rounded()), "h": Int(size.height.rounded()), "r": r]
    if let cs { f["cs"] = cs }
    if let cr { f["cr"] = cr }
    if shadow { f["shadow"] = true }
    if pad > 0 { f["pad"] = pad }
    return ThemeJob(theme: theme, kind: "cover", fields: f)
  }
  /// Your profile picture (a theme's circle with your letter, or the ring around your photo) at a size.
  static func avatar(_ theme: String, size: Int, ch: String, photo: Bool) -> ThemeJob {
    ThemeJob(theme: theme, kind: "avatar", fields: ["size": size, "ch": ch, "photo": photo])
  }
}

extension RGBA {
  /// As a CSS color.
  var css: String {
    let c = { (v: Double) in Int((v * 255).rounded()) }
    return a >= 1 ? String(format: "#%02X%02X%02X", c(r), c(g), c(b)) : "rgba(\(c(r)),\(c(g)),\(c(b)),\(a))"
  }
  /// A CSS color as the browser gives it back: #RGB, #RRGGBB, rgb(), or rgba().
  init?(css s: String) {
    let t = s.trimmingCharacters(in: .whitespaces).lowercased()
    if t.hasPrefix("#") {
      var h = String(t.dropFirst())
      if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
      guard h.count == 6 || h.count == 8, let v = UInt64(h, radix: 16) else { return nil }
      if h.count == 6 { self.init(UInt32(v)) } else { self.init(UInt32(v >> 8), a: Double(v & 255) / 255) }
      return
    }
    guard t.hasPrefix("rgb"), let o = t.firstIndex(of: "("), let c = t.lastIndex(of: ")") else { return nil }
    let parts = t[t.index(after: o)..<c].replacingOccurrences(of: "/", with: " ").split(whereSeparator: { $0 == "," || $0 == " " }).compactMap { Double($0.trimmingCharacters(in: CharacterSet(charactersIn: "%"))) }
    guard parts.count >= 3 else { return nil }
    self.init(r: parts[0], g: parts[1], b: parts[2], a: parts.count > 3 ? parts[3] : 1)
  }
}

// ---------- warming up ----------
extension ThemeArt {
  /// Asks, ahead of time, for what the screens will need with `key` in use (its details, the study background, the flashcard's
  /// faces, your picture), after whatever is on screen. A theme picked in Settings, and the one in use at launch.
  func warm(_ key: String, _ store: Store) {
    guard let spec = spec(key) else { Task { try? await Task.sleep(nanoseconds: 400_000_000); if store.skinKey == key { warm(key, store) } }; return }
    let skin = ThemeSkin(key: key, spec: spec), gray = store.appGray
    _ = picture(.studyBg(skin, gray: gray), low: true)
    _ = cardSkin(skin, at: "phone", size: ThemeLayout.reviewCard, basePad: "26px 22px", radius: 32, margins: ThemeLayout.reviewMargins, gray: gray)
    _ = cardSkin(skin, at: "phone", size: ThemeLayout.reviewCardOpen, basePad: "26px 22px", radius: 32, margins: ThemeLayout.reviewMarginsOpen, gray: gray)
    for s in [44, 84, 64] {
      for photo in [false, true] { _ = picture(.avatar(key, size: s, ch: store.avatarLetter, photo: photo), low: true) }
    }
    // The Library's covers (its first decks, and the ones in folders) and the first decks' pages.
    let decks = store.libraryDecks().filter { $0.photo == nil }
    for d in decks.prefix(12) { _ = picture(.thumb(skin, deck: d.look), low: true) }
    for d in decks.filter({ $0.folder != nil }).prefix(9) { _ = picture(.swatch(skin, deck: d.look), low: true) }
    for d in decks.prefix(4) { _ = picture(.head(skin, deck: d.look, size: CGSize(width: ThemeLayout.screen.width, height: Screen.top(232))), low: true) }
  }
}
