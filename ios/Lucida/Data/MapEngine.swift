// A Mind map page's engine in the iPhone app: web/maps.js itself, run in JavaScriptCore (spec step4-maps.md §4.7, "no port"). The server, the
// web app, the boards and the iPhone all use that one file (design/to-ios.mjs copies it to Resources/maps.js), so a map is cleaned, laid out,
// merged, compared and edited exactly the same everywhere; ios/tests/maps-check.sh holds node and JavaScriptCore to the same bytes.
//   - Its own JSContext, apart from GuideEngine's, so a map's layout never waits on a Guide's parsing.
//   - One entry point, __mcall(fn, argsJSON): the function's name and its arguments as JSON text in, its answer as JSON text out.
//   - Calls are locked (one at a time); heavy ones (layout) run on `queue`, off the main thread, and are kept in a cache by what they were
//     asked (page, version or data, folds, side, text scale), so a pan or a zoom never lays the map out again.
//   - `failure` says what went wrong as maps.js loaded (missing or broken); it is set once, here, and never changes after, so any thread may
//     read it. The page then shows a plain outline ("Can't draw this page right now") and editing is off, so nothing is lost. An error thrown
//     inside one call (a refusal) is that call's answer (nil, and `lastError`), never the engine failing.
// Swift only draws the numbers and the lines this gives (Design/MapCanvas.swift) and handles the gestures. It builds for the Mac too.
import Foundation
import JavaScriptCore

final class MapEngine {
  private let ctx: JSContext
  private let lock = NSLock()
  /// Where the heavy calls run (a layout of a big map), one after another.
  let queue = DispatchQueue(label: "cards.lucida.maps", qos: .userInitiated)
  /// What went wrong as maps.js loaded; empty when nothing did. Set in init only.
  let failure: String
  /// What the call in progress threw (only touched under `lock`, by the call and the context's exception handler).
  private var thrown: String? = nil
  private let layouts: NSCache<NSString, LayoutBox> = { let c = NSCache<NSString, LayoutBox>(); c.countLimit = 24; return c }()
  private final class LayoutBox { let l: MapLayout; init(_ l: MapLayout) { self.l = l } }

  /// maps.js as the app ships it (Resources/maps.js), loaded once.
  static var shared: MapEngine = {
    let src = Bundle.main.url(forResource: "maps", withExtension: "js").flatMap { try? String(contentsOf: $0, encoding: .utf8) } ?? ""
    return MapEngine(source: src)
  }()

  /// `source` is web/maps.js's text: one function (makeMaps) and the `export default` after it, which is left off, the way design/build.mjs
  /// leaves it off when it puts the engine in a board.
  init(source: String) {
    ctx = JSContext()
    var failed = ""
    ctx.exceptionHandler = { _, e in failed = e?.toString() ?? "error" }
    guard let from = source.range(of: "function makeMaps"), let to = source.range(of: "export default", options: .backwards), from.lowerBound < to.lowerBound else {
      failure = "maps.js is missing"
      return
    }
    let body = source[from.lowerBound..<to.lowerBound].trimmingCharacters(in: .whitespacesAndNewlines)
    ctx.evaluateScript("var __maps = (" + body + ")();")
    ctx.evaluateScript("function __mcall(fn, args) { var r = __maps[fn].apply(__maps, JSON.parse(args)); return JSON.stringify(r === undefined ? null : r); }")
    // (every idea's weak-spots tone in one call, not one call per idea: maps.ideaTone of each [cardTones, mark] by id)
    ctx.evaluateScript("function __mtones(args) { var a = JSON.parse(args), o = {}; for (var k in a) o[k] = __maps.ideaTone(a[k][0], a[k][1]); return JSON.stringify(o); }")
    if ctx.objectForKeyedSubscript("__maps").map({ $0.isUndefined || $0.isNull }) ?? true, failed.isEmpty { failed = "maps.js didn’t load" }
    failure = failed
    ctx.exceptionHandler = { [weak self] _, e in self?.thrown = e?.toString() ?? "error" }
  }
  /// The engine loaded and nothing has gone wrong in it.
  var ok: Bool { failure.isEmpty }

  // ---------- the one entry ----------
  /// Calls maps.js's `fn` with the arguments as JSON text (an array); the answer as JSON text. nil when it threw.
  func callJSON(_ fn: String, _ argsJSON: String) -> String? { run("__mcall", [fn, argsJSON]) }
  /// A function of the context's own (__mcall, __mtones), under the lock; what it threw is this call's alone.
  private func run(_ name: String, _ args: [Any]) -> String? {
    lock.lock(); defer { lock.unlock() }
    guard failure.isEmpty, let f = ctx.objectForKeyedSubscript(name), !f.isUndefined else { return nil }
    thrown = nil
    let r = f.call(withArguments: args)
    // (a refusal maps.js throws, an unreadable map, is the caller's to handle: it isn't the engine failing)
    if let t = thrown { thrown = nil; lastErrorText = t; return nil }
    guard let r, !r.isUndefined, !r.isNull else { return nil }
    return r.toString()
  }
  private var lastErrorText = ""
  /// What the last call that threw said (a refusal's words, like "That isn’t a mind map…").
  var lastError: String { lock.lock(); defer { lock.unlock() }; return lastErrorText }

  /// An argument: JSON text already (a page's data), or a Swift value (strings, numbers, bools, arrays and dictionaries of them, nil).
  enum Arg { case raw(String), val(Any?) }
  static func json(_ v: Any?) -> String {
    guard let v, !(v is NSNull) else { return "null" }
    guard let d = try? JSONSerialization.data(withJSONObject: v, options: [.fragmentsAllowed, .withoutEscapingSlashes]), let s = String(data: d, encoding: .utf8) else { return "null" }
    return s
  }
  func call(_ fn: String, _ args: [Arg]) -> String? {
    callJSON(fn, "[" + args.map { a -> String in
      switch a { case .raw(let s): return s.isEmpty ? "null" : s; case .val(let v): return MapEngine.json(v) }
    }.joined(separator: ",") + "]")
  }
  private func decode<T: Decodable>(_ type: T.Type, _ fn: String, _ args: [Arg]) -> T? {
    call(fn, args).flatMap { try? JSONDecoder().decode(T.self, from: Data($0.utf8)) }
  }
  private func object(_ fn: String, _ args: [Arg]) -> [String: Any]? {
    call(fn, args).flatMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) as? [String: Any] }
  }

  // ---------- cleaning and the text form ----------
  /// The one cleaner every write goes through: the data as saved (JSON text) and what it repaired. nil when it refused (lastError says why).
  func normalize(_ kind: String, _ data: String, prev: String? = nil, ai: Bool = false, title: String = "") -> (data: String, warnings: [String])? {
    guard let o = object("normalize", [.val(kind), .raw(data), .raw(prev ?? "null"), .val(["ai": ai, "title": title])]), let d = o["data"] else { return nil }
    return (MapEngine.json(d), o["warnings"] as? [String] ?? [])
  }
  /// A kind's starting data (JSON text).
  func emptyOf(_ kind: String) -> String { call("emptyOf", [.val(kind)]) ?? (kind == "mindmap" ? #"{"root":{"id":"root","label":""}}"# : "{}") }
  /// The outline text, with every idea's {#id}.
  func textOf(_ kind: String, _ data: String) -> String { decode(String.self, "textOf", [.val(kind), .raw(data)]) ?? "" }
  /// Outline text read into data, ideas matched to `prev`'s ids.
  func fromText(_ kind: String, _ text: String, prev: String? = nil, title: String = "") -> (data: String, warnings: [String])? {
    guard let o = object("fromText", [.val(kind), .val(text), .raw(prev ?? "null"), .val(["title": title])]), let d = o["data"] else { return nil }
    return (MapEngine.json(d), o["warnings"] as? [String] ?? [])
  }
  func countOf(_ kind: String, _ data: String) -> Int { Int(call("countOf", [.val(kind), .raw(data)]) ?? "") ?? 0 }
  /// Each idea's path ("The cell › Mitochondria › Krebs cycle in the matrix").
  func pathsOf(_ data: String) -> [String: String] {
    let rows = (call("pathsOf", [.raw(data)]).flatMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) as? [[String: Any]] }) ?? []
    var out: [String: String] = [:]
    for r in rows { if let id = r["id"] as? String { out[id] = r["path"] as? String ?? "" } }
    return out
  }
  /// How wide a string reads, in units of a lower-case Latin letter (§4.2).
  func units(_ s: String) -> Double { Double(call("units", [.val(s)]) ?? "") ?? Double(s.count) }

  // ---------- edits, merges and what changed ----------
  /// An edit (add, set, remove, move, indent, outdent, link, unlink): the new data and its one-line summary ("" when it did nothing).
  func edit(_ kind: String, _ data: String, _ op: [String: Any]) -> (data: String, summary: String) {
    guard let o = object("edit", [.val(kind), .raw(data), .val(op)]), let d = o["data"] else { return (data, "") }
    return (MapEngine.json(d), o["summary"] as? String ?? "")
  }
  /// The app's 409 merge (§8.3): what was written here on top of theirs, from the version both started from. nil when the engine can't.
  func merge(_ kind: String, base: String, mine: String, theirs: String) -> (data: String, clashes: Int)? {
    guard let o = object("merge", [.val(kind), .raw(base), .raw(mine), .raw(theirs), .val(["prefer": "mine"])]), let d = o["data"] else { return nil }
    return (MapEngine.json(d), (o["clashes"] as? [Any])?.count ?? 0)
  }
  /// What changed from `a` to `b`, as JSON text (maps.diff), and as one line ("Claude added 4 ideas"; with no `who`, "Added 4 ideas").
  func diff(_ kind: String, _ a: String, _ b: String) -> String { call("diff", [.val(kind), .raw(a), .raw(b)]) ?? "null" }
  func summary(_ kind: String, _ a: String, _ b: String, who: String = "") -> String {
    decode(String.self, "summaryOf", [.raw(diff(kind, a, b)), .val(who.isEmpty ? nil : ["who": who])]) ?? ""
  }
  /// The ideas `b` added since `a`.
  func added(_ kind: String, _ a: String, _ b: String) -> [String] {
    let d = (try? JSONSerialization.jsonObject(with: Data(diff(kind, a, b).utf8))) as? [String: Any]
    return ((d?["added"] as? [[String: Any]]) ?? []).compactMap { $0["id"] as? String }
  }

  // ---------- layout ----------
  /// The numbers to draw a map from (§4.3). folds: this device's folds (id -> folded), over each idea's own `folded`.
  func layout(_ kind: String, _ data: String, folds: [String: Bool] = [:], side: String = "right", scale: Double = 1, title: String = "") -> MapLayout? {
    decode(MapLayout.self, "layout", [.val(kind), .raw(data), .val(["folds": folds, "side": side, "scale": scale, "title": title])])
  }
  /// The same, kept by `key` (the page, its version or data, the folds, the side and the text scale).
  func layout(key: String, _ kind: String, _ data: String, folds: [String: Bool], side: String, scale: Double, title: String) -> MapLayout? {
    if let hit = layouts.object(forKey: key as NSString) { return hit.l }
    guard let l = layout(kind, data, folds: folds, side: side, scale: scale, title: title) else { return nil }
    layouts.setObject(LayoutBox(l), forKey: key as NSString)
    return l
  }
  /// A layout kept already (nil when it has to be worked out).
  func cached(_ key: String) -> MapLayout? { layouts.object(forKey: key as NSString)?.l }
  /// The same off the main thread; `done` runs on the main thread with it (nil when the engine failed).
  func layoutAsync(key: String, _ kind: String, _ data: String, folds: [String: Bool], side: String, scale: Double, title: String, done: @escaping (MapLayout?) -> Void) {
    if let hit = cached(key) { done(hit); return }
    queue.async { [self] in
      let l = layout(key: key, kind, data, folds: folds, side: side, scale: scale, title: title)
      DispatchQueue.main.async { done(l) }
    }
  }
  /// A small picture's model for a map shown in a Note (§9.1), kept by `key`.
  private let previews = NSCache<NSString, PreviewBox>()
  private final class PreviewBox { let p: MapPreview; init(_ p: MapPreview) { self.p = p } }
  func previewOf(_ kind: String, _ data: String, w: Double, h: Double, side: String? = nil, tones: [String: String] = [:], title: String = "", key: String? = nil) -> MapPreview? {
    if let key, let hit = previews.object(forKey: key as NSString) { return hit.p }
    var o: [String: Any] = ["w": w, "h": h, "tones": tones, "title": title]
    if let side { o["side"] = side }
    guard let p = decode(MapPreview.self, "previewOf", [.val(kind), .raw(data), .val(o)]) else { return nil }
    if let key { previews.setObject(PreviewBox(p), forKey: key as NSString) }
    return p
  }

  // ---------- study ----------
  /// An idea's weak-spots tone ('new', 'weak', 'getting', 'solid') from its cards' tones and its last Test me mark ([knew, missed, last, at]).
  func ideaTone(_ cardTones: [String], _ mark: [Double]?) -> String { decode(String.self, "ideaTone", [.val(cardTones), .val(mark)]) ?? "new" }
  /// Every idea's tone but the topic's, in one call into maps.js (ideaTone of its linked cards' tones and its last mark).
  /// cards: card id -> its tone (sched.toneOf); marks: idea id -> [knew, missed, last, at].
  func ideaTones(_ tree: MapTree, cards: [String: String], marks: [String: [Double]]) -> [String: String] {
    var args: [String: Any] = [:]
    for id in tree.order where (tree[id]?.level ?? 0) > 0 {
      args[id] = [(tree[id]?.cardIds ?? []).compactMap { cards[$0] }, marks[id].map { $0 as Any } ?? NSNull()]
    }
    if args.isEmpty { return [:] }
    guard let s = run("__mtones", [MapEngine.json(args)]), let o = (try? JSONSerialization.jsonObject(with: Data(s.utf8))) as? [String: String] else { return [:] }
    return o
  }
  /// The deck's cards that best match an idea's words, best first (Link a card; no AI). cards: [{id, front, back}].
  func matchCards(_ label: String, _ cards: [[String: String]]) -> [String] { decode([String].self, "matchCards", [.val(label), .val(cards)]) ?? [] }
  /// The card ids linked in these ideas' branches (nil: the whole map), once each, in outline order.
  func reviewIds(_ data: String, _ ids: [String]?) -> [String] { decode([String].self, "reviewIds", [.raw(data), .val(ids)]) ?? [] }
  /// Test me's order: the hidden ideas (nil: every idea but the topic) in outline order.
  func testOrder(_ data: String, hidden: [String]?) -> [String] { decode([String].self, "testOrder", [.raw(data), .val(nil), .val(hidden)]) ?? [] }
}
