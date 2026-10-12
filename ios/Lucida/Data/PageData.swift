// A deck's (or a folder's) Pages as the server keeps them (web/pages.mjs, /api/pages): a page's row in a list, a page with its data, an older version, and
// the merge web/pagesclient.js makes when a page changed on the server while it was being written (a 409). Nothing here needs the app: ios/tests/pages-check.sh
// runs it on the Mac. The store that fetches and saves them is Data/Pages.swift; a Note's data is read and written by web/pageblocks.js (GuideEngine).
import Foundation

/// A page as a list has it (no data), or with its data (`data`, JSON text: a Note's is { blocks: [...] }).
struct PageInfo: Equatable, Identifiable {
  var id = "", scope = "deck", scopeId = "", parent = "", kind = "note", title = ""
  var version = 0, by = "you", ai = false
  var updated: Double = 0
  /// The page's data as JSON text ("" in a list).
  var data = ""

  /// From the server's JSON (a list's row or GET /api/pages/<id>).
  init(json j: [String: Any]) {
    id = j["id"] as? String ?? ""; scope = j["scope"] as? String ?? "deck"; scopeId = j["scopeId"] as? String ?? ""
    parent = j["parent"] as? String ?? ""; kind = j["kind"] as? String ?? "note"; title = j["title"] as? String ?? ""
    version = PageInfo.int(j["version"]); by = j["by"] as? String ?? "you"; ai = j["ai"] as? Bool ?? false
    updated = (j["updated"] as? NSNumber)?.doubleValue ?? 0
    if let d = j["data"], !(d is NSNull) { data = PageJSON.text(d) }
  }
  init(id: String, kind: String = "note", title: String = "", version: Int = 1, by: String = "you", ai: Bool = false, updated: Double = 0, parent: String = "", data: String = "") {
    self.id = id; self.kind = kind; self.title = title; self.version = version; self.by = by; self.ai = ai; self.updated = updated; self.parent = parent; self.data = data
  }
  static func int(_ v: Any?) -> Int { (v as? NSNumber)?.intValue ?? 0 }
}

/// An older version (GET /api/pages/<id>/versions): its number, title, who saved it (and whether an AI app did), what changed, and when.
struct PageVersion: Equatable, Identifiable {
  var version = 0, title = "", by = "you", ai = false, summary = ""
  var at: Double = 0
  var id: Int { version }
  init(json j: [String: Any]) {
    version = PageInfo.int(j["version"]); title = j["title"] as? String ?? ""; by = j["by"] as? String ?? "you"; ai = j["ai"] as? Bool ?? false
    summary = j["summary"] as? String ?? ""; at = (j["at"] as? NSNumber)?.doubleValue ?? 0
  }
  init(version: Int, by: String, ai: Bool, at: Double, summary: String) { self.version = version; self.by = by; self.ai = ai; self.at = at; self.summary = summary }
}

/// The kinds of page, in the order New page lists them (design/pages.mjs PAGE_KINDS), and which ones the app can make and show yet.
enum PageKind {
  struct K: Identifiable { let kind, name, icon, line: String; var id: String { kind } }
  static let all: [K] = [
    K(kind: "note", name: "Note", icon: "text", line: "Headings, callouts, chains, tables, toggles and cards"),
    K(kind: "slides", name: "Presentation", icon: "play", line: "Slides to present, or save as a PDF"),
    K(kind: "mindmap", name: "Mind map", icon: "mindmap", line: "One idea in the middle, branches you can fold"),
    K(kind: "diagram", name: "Diagram", icon: "share", line: "Boxes and arrows, laid out for you"),
    K(kind: "canvas", name: "Canvas", icon: "grid", line: "A board to pin notes, cards and pictures on"),
    K(kind: "doc", name: "Doc", icon: "file", line: "A PDF to read beside the cards")]
  /// The kinds this build can show and write (web/pages.mjs PAGE_READY when it was built: Generated.pageReady, which the app sets here as it starts).
  /// A page of any other kind, a kind that came after this build too, shows "Needs an update" and is never opened or saved from here.
  static var ready: Set<String> = ["note"]
  static func canShow(_ kind: String) -> Bool { ready.contains(kind) }
  static func name(_ kind: String) -> String { all.first { $0.kind == kind }?.name ?? "Page" }
  static func icon(_ kind: String) -> String { all.first { $0.kind == kind }?.icon ?? "file" }
}

/// JSON text in and out (sorted keys, so two blocks with the same content are the same text, whatever order their keys came in).
enum PageJSON {
  static func text(_ v: Any) -> String {
    guard JSONSerialization.isValidJSONObject(v) || v is String || v is NSNumber,
          let d = try? JSONSerialization.data(withJSONObject: v, options: [.fragmentsAllowed, .sortedKeys, .withoutEscapingSlashes]) else { return "" }
    return String(data: d, encoding: .utf8) ?? ""
  }
  static func object(_ s: String) -> Any? { s.isEmpty ? nil : try? JSONSerialization.jsonObject(with: Data(s.utf8), options: [.fragmentsAllowed]) }
  /// A Note's top-level blocks.
  static func blocks(_ s: String) -> [[String: Any]] { ((object(s) as? [String: Any])?["blocks"] as? [Any])?.compactMap { $0 as? [String: Any] } ?? [] }
}

/// A page's data when there's none, by kind (web/maps.js emptyOf): never a Note's blocks on a page of another kind.
enum PageEmpty {
  static func of(_ kind: String) -> [String: Any] {
    switch kind {
    case "note": return ["blocks": [Any]()]
    case "mindmap": return ["root": ["id": "root", "label": ""]]
    case "diagram": return ["direction": "down", "nodes": [Any](), "edges": [Any]()]
    default: return [:]
    }
  }
}

/// When a save finds the page changed since the version it was written from (409): web/pagesclient.js merge, block by block (top-level blocks, by id).
/// `base` is the version the screen started from, `mine` what it has now, `theirs` the newer saved one. A block this person changed (or added) since `base`
/// is theirs no more: theirs is kept everywhere else; a block taken out here and left alone there goes; a block added here goes after the block it follows
/// here (or first).
enum PageMerge {
  /// The merge for a kind (pagesclient's MERGE): a Note's is here; the map kinds' come with MapEngine (web/maps.js). A kind with none never sends what was
  /// written here over the other's (Data/Pages.swift keeps theirs). The merge answers nil when it couldn't merge: that is the same as no merge (theirs
  /// stays and the saving line says this change wasn't saved, as pagesclient.js does), never theirs passed off as both.
  static func of(_ kind: String) -> ((String, String, String) -> String?)? {
    if kind == "note" { return { merge(base: $0, mine: $1, theirs: $2) } }
    // A Mind map: web/maps.js's own merge (§8.3), the same as the web's, through MapEngine.
    if kind == "mindmap" && MapEngine.shared.ok { return { base, mine, theirs in MapEngine.shared.merge("mindmap", base: base, mine: mine, theirs: theirs)?.data } }
    return nil
  }
  /// What was written here while a merged save was going out was made from what that save sent (`sent`), not from the merged page the server now holds:
  /// it goes on top of the merged one the same way (sent is the base, the waiting change is mine, the merged page theirs), so the next save, which no
  /// longer meets a conflict, doesn't take the other writer's change back out. nil when the kind has no merge or it failed.
  static func rebase(_ kind: String, sent: String, waiting: String, merged: String) -> String? { of(kind).flatMap { $0(sent, waiting, merged) } }
  static func merge(base: String, mine: String, theirs: String) -> String {
    let B = Dictionary(PageJSON.blocks(base).map { (id($0), PageJSON.text($0)) }, uniquingKeysWith: { a, _ in a })
    let M = PageJSON.blocks(mine), T = PageJSON.blocks(theirs)
    let mineBy = Dictionary(M.map { (id($0), $0) }, uniquingKeysWith: { a, _ in a })
    func mineChanged(_ b: [String: Any]) -> Bool { B[id(b)] == nil || B[id(b)] != PageJSON.text(b) }
    var out: [[String: Any]] = []
    for b in T {
      let k = id(b)
      if let was = B[k], mineBy[k] == nil, was == PageJSON.text(b) { continue }   // taken out here, untouched there
      if let m = mineBy[k], mineChanged(m) { out.append(m) } else { out.append(b) }
    }
    for (i, b) in M.enumerated() {
      let k = id(b)
      if B[k] != nil || out.contains(where: { id($0) == k }) { continue }
      let prev = i > 0 ? id(M[i - 1]) : nil, at = prev.flatMap { p in out.firstIndex { id($0) == p } } ?? -1
      out.insert(b, at: at + 1)
    }
    return PageJSON.text(["blocks": out])
  }
  private static func id(_ b: [String: Any]) -> String { b["id"] as? String ?? "" }
}

/// How the Pages screens say when something was changed ("just now", "5 min ago", "3 h ago", "Oct 9"), as design/pages.mjs ago().
enum PageAgo {
  static func of(_ ms: Double, now: Date = Date()) -> String {
    let m = Int((now.timeIntervalSince1970 * 1000 - ms) / 60000 + 0.5)
    if m < 1 { return "just now" }
    if m < 60 { return "\(m) min ago" }
    if m < 1440 { return "\(Int(Double(m) / 60 + 0.5)) h ago" }
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US"); f.dateFormat = "MMM d"
    return f.string(from: Date(timeIntervalSince1970: ms / 1000))
  }
  /// Who: "You" for this person, else the AI app's (or person's) name.
  static func who(_ by: String) -> String { by.isEmpty || by == "you" ? "You" : by }
}
