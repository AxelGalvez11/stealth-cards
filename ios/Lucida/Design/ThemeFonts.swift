// The type a theme sets its flashcards in. The words on a card stay the app's own, so the fonts have to be on the phone:
// like the web page, the app asks Google Fonts for the theme's families (the list is the theme's own: its `fonts`), keeps the
// font files, and registers them. Nothing ships with the app. Until a family is here, words are set in Geist.
import SwiftUI
import CoreText

@MainActor
final class ThemeFonts: ObservableObject {
  static let shared = ThemeFonts()
  /// Goes up when a family arrives (or gives up), so words are set again.
  @Published private(set) var tick = 0

  /// A font of a family: its PostScript name, weight, slant, and the file it's kept in.
  struct Face: Codable { var ps: String; var weight: Int; var italic: Bool; var file: String }
  enum State { case loading, ready, failed }

  /// The families that are here (read from anywhere, when words are set).
  private nonisolated let faces = FontTable()
  private var states: [String: State] = [:]
  private var registered: Set<String> = []
  private let dir: URL = {
    let d = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("lucida-fonts", isDirectory: true)
    try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
    return d
  }()

  // ---------- asking ----------
  /// Whether a family is here: `nil` for one that needs nothing (Geist is the app's own, and the system's fonts are there).
  func state(_ family: String, spec: String) -> State {
    if family.isEmpty || family == "Geist" || UIFont.familyNames.contains(family) && faces[family] == nil { return .ready }
    if let s = states[family] { return s }
    // kept from before?
    if let kept = readKept(family), register(family, kept) { states[family] = .ready; return .ready }
    states[family] = .loading
    Task { await fetch(family, spec: spec) }
    return .loading
  }

  /// A family's font at a weight (400 to 900), or nil (the words stay in Geist). `slanted`: it has no italic of its own, so the
  /// words lean the way a browser leans them.
  nonisolated func uiFont(_ family: String, weight: Int, size: CGFloat, italic: Bool) -> (font: UIFont, slanted: Bool)? {
    guard let list = faces[family], !list.isEmpty else { return nil }
    // the closest weight, preferring the right slant
    let pick = list.min { a, b in
      let da = abs(a.weight - weight) + (a.italic == italic ? 0 : 1000), db = abs(b.weight - weight) + (b.italic == italic ? 0 : 1000)
      return da != db ? da < db : a.weight > b.weight
    }!
    guard let f = UIFont(name: pick.ps, size: size) else { return nil }
    return (f, italic && !pick.italic)
  }

  // ---------- fetching ----------
  private func fetch(_ family: String, spec: String) async {
    // Only this family's part of the theme's list (Google's API takes them one at a time or together).
    let want = family.replacingOccurrences(of: " ", with: "+")
    let part = spec.split(separator: "&").first { $0.hasPrefix("family=" + want) || $0.replacingOccurrences(of: "+", with: " ").hasPrefix("family=" + family) }
    guard let part, let url = URL(string: "https://fonts.googleapis.com/css2?" + part + "&display=swap") else { finish(family, nil); return }
    // A browser that doesn't know web fonts of the newer kind is given plain TrueType files, which the phone can register.
    var r = URLRequest(url: url); r.timeoutInterval = 15
    r.setValue("Mozilla/5.0 (Linux; U; Android 4.0.3; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30", forHTTPHeaderField: "User-Agent")
    guard let (data, resp) = try? await URLSession.shared.data(for: r), (resp as? HTTPURLResponse)?.statusCode == 200, let css = String(data: data, encoding: .utf8) else { finish(family, nil); return }
    var got: [(url: URL, weight: Int, italic: Bool)] = []
    for block in css.components(separatedBy: "@font-face").dropFirst() {
      guard let u = block.range(of: #"url\(([^)]+\.ttf)\)"#, options: .regularExpression) else { continue }
      let src = String(block[u].dropFirst(4).dropLast(1))
      let w = block.range(of: #"font-weight:\s*(\d+)"#, options: .regularExpression).flatMap { Int(block[$0].filter(\.isNumber)) } ?? 400
      let stretch = block.range(of: #"font-stretch:\s*([a-z-]+)"#, options: .regularExpression).map { String(block[$0]) } ?? ""
      // (a width other than the normal one isn't asked for by a card)
      if stretch.contains("condensed") { continue }
      got.append((URL(string: src)!, w, block.contains("font-style: italic")))
    }
    var list: [Face] = []
    for g in got {
      let file = dir.appendingPathComponent(String(g.url.lastPathComponent))
      if !FileManager.default.fileExists(atPath: file.path) {
        guard let (bytes, r) = try? await URLSession.shared.data(from: g.url), (r as? HTTPURLResponse)?.statusCode == 200 else { continue }
        try? bytes.write(to: file, options: .atomic)
      }
      if let ps = Self.postScriptName(file) { list.append(Face(ps: ps, weight: g.weight, italic: g.italic, file: file.lastPathComponent)) }
    }
    finish(family, list.isEmpty ? nil : list)
  }

  private func finish(_ family: String, _ list: [Face]?) {
    if let list, register(family, list) { keep(family, list); states[family] = .ready } else { states[family] = .failed }
    tick += 1
    ThemeArt.shared.bump()
  }

  /// Puts a family's kept files to use (the phone knows them from now on, in this run).
  private func register(_ family: String, _ list: [Face]) -> Bool {
    if registered.contains(family) { return true }
    var any = false
    for f in list {
      var err: Unmanaged<CFError>?
      // (already registered is fine)
      if CTFontManagerRegisterFontsForURL(dir.appendingPathComponent(f.file) as CFURL, .process, &err) || UIFont(name: f.ps, size: 12) != nil { any = true }
    }
    if any { faces[family] = list; registered.insert(family) }
    return any
  }
  private static func postScriptName(_ file: URL) -> String? {
    guard let ds = CTFontManagerCreateFontDescriptorsFromURL(file as CFURL) as? [CTFontDescriptor], let d = ds.first else { return nil }
    return CTFontDescriptorCopyAttribute(d, kCTFontNameAttribute) as? String
  }

  private func keep(_ family: String, _ list: [Face]) {
    if let d = try? JSONEncoder().encode(list) { try? d.write(to: dir.appendingPathComponent(Self.safe(family) + ".json"), options: .atomic) }
  }
  private func readKept(_ family: String) -> [Face]? {
    guard let d = try? Data(contentsOf: dir.appendingPathComponent(Self.safe(family) + ".json")) else { return nil }
    return try? JSONDecoder().decode([Face].self, from: d)
  }
  private static func safe(_ s: String) -> String { s.filter { $0.isLetter || $0.isNumber } }
}

/// What's registered, by family (with a lock, since words are set from anywhere).
final class FontTable: @unchecked Sendable {
  private var d: [String: [ThemeFonts.Face]] = [:]
  private let lock = NSLock()
  subscript(family: String) -> [ThemeFonts.Face]? {
    get { lock.lock(); defer { lock.unlock() }; return d[family] }
    set { lock.lock(); defer { lock.unlock() }; d[family] = newValue }
  }
}
