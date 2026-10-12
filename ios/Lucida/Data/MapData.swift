// What a Mind map page is made of on the iPhone, apart from drawing it: the numbers web/maps.js lays a map out as (MapLayout, and MapPreview
// for a map shown inside a Note), the map's ideas as a tree to look things up in (MapTree), the learner's Test me marks (S.mapMarks, from the
// library), and what this phone remembers about each map (its folds, Map or Outline, the overlay: never saved to the page). Foundation only,
// so ios/tests/maps-check.sh builds it on the Mac with Data/MapEngine.swift.
import Foundation

// ---------- the numbers to draw ----------
/// maps.layoutMind's answer (§4.3): every box showing, with its lines already broken, and the links between them, in map points.
struct MapLayout: Decodable, Equatable {
  var nodes: [MapNode] = []
  var links: [MapLink] = []
  var width: Double = 0, height: Double = 0
  init() {}
  init(nodes: [MapNode], links: [MapLink], width: Double, height: Double) { self.nodes = nodes; self.links = links; self.width = width; self.height = height }
  func node(_ id: String) -> MapNode? { nodes.first { $0.id == id } }
}
/// A box: its idea's id and level, its side of the topic (1 right, -1 left, 0 the topic), its parent's id, where it is, its lines, whether it's
/// folded (and how many ideas that hides), and how many children its idea has.
struct MapNode: Decodable, Equatable {
  var id: String, level: Int, side: Int, parent: String?
  var x: Double, y: Double, w: Double, h: Double
  var lines: [String]
  var folded: Bool, hidden: Int, kids: Int
}
/// A link: from the parent's outer edge to the child's inner edge, a cubic (x1, y1, cx1, cy1, cx2, cy2, x2, y2).
struct MapLink: Decodable, Equatable { var from: String, to: String, c: [Double] }

/// A map inside a Note (§9.1): maps.previewOf's answer, or the boards' own model of it (`MapPreview.model`, design/maps.mjs previewModel: the
/// topic and its main ideas, each folded, never so small that a main idea's words are under 12 pt, cut around the topic where it doesn't fit,
/// its cut edges fading). Already scaled to its box, with each box's weak-spots tone.
struct MapPreview: Decodable, Equatable {
  struct Node: Decodable, Equatable {
    var id: String, x: Double, y: Double, w: Double, h: Double, lines: [String], level: Int, tone: String?, folded: Bool, hidden: Int
    var side = 0
    enum CodingKeys: String, CodingKey { case id, x, y, w, h, lines, level, tone, folded, hidden, side }
    init(id: String, x: Double, y: Double, w: Double, h: Double, lines: [String], level: Int, tone: String?, folded: Bool, hidden: Int, side: Int) {
      self.id = id; self.x = x; self.y = y; self.w = w; self.h = h; self.lines = lines; self.level = level; self.tone = tone; self.folded = folded; self.hidden = hidden; self.side = side
    }
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      id = try c.decode(String.self, forKey: .id); x = try c.decode(Double.self, forKey: .x); y = try c.decode(Double.self, forKey: .y)
      w = try c.decode(Double.self, forKey: .w); h = try c.decode(Double.self, forKey: .h); lines = try c.decode([String].self, forKey: .lines)
      level = try c.decode(Int.self, forKey: .level); tone = try c.decodeIfPresent(String.self, forKey: .tone)
      folded = (try? c.decode(Bool.self, forKey: .folded)) ?? false; hidden = (try? c.decode(Int.self, forKey: .hidden)) ?? 0; side = (try? c.decode(Int.self, forKey: .side)) ?? 0
    }
  }
  /// Which edges are cut (they fade into the box).
  struct Cut: Equatable { var left = false, right = false, top = false, bottom = false }
  var w: Double, h: Double, scale: Double
  var nodes: [Node]
  /// Each link's path ("M x y C x y x y x y").
  var links: [String]
  var cut = Cut()
  enum CodingKeys: String, CodingKey { case w, h, scale, nodes, links }
  init(w: Double, h: Double, scale: Double, nodes: [Node], links: [String], cut: Cut) { self.w = w; self.h = h; self.scale = scale; self.nodes = nodes; self.links = links; self.cut = cut }
  /// The links as numbers (x1, y1, cx1, cy1, cx2, cy2, x2, y2).
  var curves: [[Double]] { links.map { $0.split(whereSeparator: { $0 == " " || $0 == "M" || $0 == "C" }).compactMap { Double($0) } }.filter { $0.count == 8 } }

  /// The boards' model of a map inside a Note (design/maps.mjs previewModel), from its layout with every main idea folded (side 'both').
  static func model(_ L: MapLayout, w: Double, h: Double, least: Double, tones: [String: String]) -> MapPreview {
    let r1 = { (v: Double) in (v * 10).rounded() / 10 }
    let fit = min(1, w / max(1, L.width), h / max(1, L.height)), s = min(1, max(fit, least / 13.5))
    let root = L.nodes.first
    var ox = (w - L.width * s) / 2, oy = (h - L.height * s) / 2
    if let root, L.width * s > w { ox = min(0, max(w - L.width * s, w / 2 - s * (root.x + root.w / 2))) }
    if let root, L.height * s > h { oy = min(0, max(h - L.height * s, h / 2 - s * (root.y + root.h / 2))) }
    let X = { (v: Double) in r1(ox + v * s) }, Y = { (v: Double) in r1(oy + v * s) }, S = { (v: Double) in r1(v * s) }
    let nodes = L.nodes.map { n in Node(id: n.id, x: X(n.x), y: Y(n.y), w: S(n.w), h: S(n.h), lines: Array(n.lines.prefix(2)), level: n.level, tone: tones[n.id], folded: n.folded, hidden: n.hidden, side: n.side) }
    let links = L.links.map { l -> String in let c = l.c; return "M\(X(c[0])) \(Y(c[1])) C\(X(c[2])) \(Y(c[3])) \(X(c[4])) \(Y(c[5])) \(X(c[6])) \(Y(c[7]))" }
    return MapPreview(w: w, h: h, scale: (s * 1000).rounded() / 1000, nodes: nodes, links: links,
                      cut: Cut(left: ox < -1, right: ox + L.width * s > w + 1, top: oy < -1, bottom: oy + L.height * s > h + 1))
  }
  /// The folds that model is laid out with: every main idea that has ideas under it.
  static func folds(_ t: MapTree) -> [String: Bool] {
    var f: [String: Bool] = [:]
    for id in t.by[t.root]?.children ?? [] where !(t.by[id]?.children.isEmpty ?? true) { f[id] = true }
    return f
  }
}

// ---------- the map's ideas ----------
/// A map's data (JSON text) as a tree: each idea by id, with its level, its parent, its children in order and the labels on the way to it.
struct MapTree {
  struct Idea {
    var id = "", label = "", note = ""
    var cardIds: [String] = []
    var folded = false
    var children: [String] = []
    var parent: String? = nil
    var level = 0
    /// The labels of the ideas above it, the topic first.
    var path: [String] = []
  }
  var root = ""
  var by: [String: Idea] = [:]
  /// Every idea in outline order (depth first), the topic first.
  var order: [String] = []

  init(_ json: String) {
    guard let o = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any], let r = o["root"] as? [String: Any] else { return }
    var st: [([String: Any], String?, Int, [String])] = [(r, nil, 0, [])]
    while let (n, parent, level, path) = st.popLast() {
      let id = n["id"] as? String ?? ""
      guard by[id] == nil else { continue }
      let kids = (n["children"] as? [Any] ?? []).compactMap { $0 as? [String: Any] }
      var i = Idea()
      i.id = id; i.label = n["label"] as? String ?? ""; i.note = n["note"] as? String ?? ""
      i.cardIds = n["cardIds"] as? [String] ?? []; i.folded = n["folded"] as? Bool ?? false
      i.children = kids.map { $0["id"] as? String ?? "" }; i.parent = parent; i.level = level; i.path = path
      by[id] = i; order.append(id)
      if level == 0 { root = id }
      for k in kids.reversed() { st.append((k, id, level + 1, path + [i.label])) }
    }
  }
  subscript(_ id: String) -> Idea? { by[id] }
  /// The words an idea shows (the topic with no words shows the page's title).
  func label(_ id: String, title: String) -> String { let l = by[id]?.label ?? ""; return l.isEmpty && id == root ? title : l }
  /// Every idea under `id`, in outline order.
  func under(_ id: String) -> [String] {
    var out: [String] = [], st = (by[id]?.children ?? []).reversed().map { $0 }
    while let x = st.popLast() { out.append(x); st.append(contentsOf: (by[x]?.children ?? []).reversed()) }
    return out
  }
  /// Whether `a` is inside `b`'s branch.
  func isUnder(_ a: String, _ b: String) -> Bool { var p = by[a]?.parent; while let x = p { if x == b { return true }; p = by[x]?.parent }; return false }
  /// "The cell › Mitochondria", the labels above an idea.
  func pathLine(_ id: String, title: String) -> String { (by[id]?.path ?? []).enumerated().map { $0.offset == 0 && $0.element.isEmpty ? title : $0.element }.joined(separator: " › ") }
}

// ---------- a Mind map's review set ("page:<page>:<idea>[,<idea>…]", Study this branch) ----------
enum MapSet {
  /// The set's cards in review order (web/db.js setCards): the least remembered first and new cards last, ties in the branches' outline order
  /// (the order they come in), 100 at most.
  static func order<C>(_ cs: [C], isNew: (C) -> Bool, recall: (C) -> Double?) -> [C] {
    var rows: [(i: Int, c: C, at: Double)] = []
    for (i, c) in cs.enumerated() { rows.append((i, c, isNew(c) ? 2 : recall(c) ?? 1)) }
    rows.sort { a, b in a.at != b.at ? a.at < b.at : a.i < b.i }
    return Array(rows.prefix(100).map { $0.c })
  }
  /// What the review calls the set (web/db.js setName): one idea's words; for more, "The cell at a glance · 3 ideas"; for none, the page's title.
  /// `title` nil: the page isn't here yet ("One moment…"), or not any more (`gone`).
  static func name(data: String?, title: String?, ideas: [String]?, gone: Bool) -> String {
    guard let title else { return gone ? "A page that isn’t here any more" : "One moment…" }
    let t = title.isEmpty ? "Untitled" : title, tree = MapTree(data ?? "")
    let names = (ideas ?? []).compactMap { id in tree[id].map { $0.label.isEmpty ? t : $0.label } }
    return names.count == 1 ? names[0] : names.isEmpty ? t : t + " · \(names.count) ideas"
  }
}

// ---------- how wide words read (web/maps.js units, §4.2: no font is measured) ----------
enum MapText {
  static func cpUnits(_ c: UInt32) -> Double {
    if (0x300...0x36f).contains(c) || (0x1ab0...0x1aff).contains(c) || (0x1dc0...0x1dff).contains(c) || (0x20d0...0x20ff).contains(c)
      || (0xfe00...0xfe0f).contains(c) || (0xfe20...0xfe2f).contains(c) || c == 0x200d || (0xe0100...0xe01ef).contains(c) { return 0 }
    if (65...90).contains(c) { return 1.15 }
    if (0x1100...0x115f).contains(c) || (0x2e80...0x303e).contains(c) || (0x3041...0x33ff).contains(c) || (0x3400...0x4dbf).contains(c)
      || (0x4e00...0x9fff).contains(c) || (0xa000...0xa4cf).contains(c) || (0xac00...0xd7a3).contains(c) || (0xf900...0xfaff).contains(c)
      || (0xfe30...0xfe4f).contains(c) || (0xff00...0xff60).contains(c) || (0xffe0...0xffe6).contains(c) || (0x20000...0x3fffd).contains(c) { return 1.8 }
    if c > 0xffff || (0x2600...0x27bf).contains(c) { return 2 }
    return 1
  }
  static func units(_ s: String) -> Double { s.unicodeScalars.reduce(0) { $0 + cpUnits($1.value) } }
}

// ---------- Test me marks (S.mapMarks, spec §6.1 #2) ----------
/// A map's marks from the library: its deck, when it was last tested, and each idea's [knew, missed, last (1 knew, 0 missed), at].
struct MapMarks: Decodable, Equatable {
  var deck = "", at: Double = 0
  var n: [String: [Double]] = [:]
  enum CodingKeys: String, CodingKey { case deck, at, n }
  init() {}
  init(deck: String, at: Double, n: [String: [Double]]) { self.deck = deck; self.at = at; self.n = n }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    deck = (try? c.decodeIfPresent(String.self, forKey: .deck)) ?? ""
    at = (try? c.decodeIfPresent(Double.self, forKey: .at)) ?? 0
    n = (try? c.decodeIfPresent([String: [Double]].self, forKey: .n)) ?? [:]
  }
  /// What an idea's mark adds up to, after a test with these results ([id: knew it]) at `now`: the new marks for `mapmarks.save`.
  func after(_ results: [(id: String, ok: Bool)], now: Double) -> MapMarks {
    var m = self
    for r in results {
      var e = m.n[r.id] ?? [0, 0, 0, 0]
      if e.count < 4 { e += Array(repeating: 0, count: 4 - e.count) }
      if r.ok { e[0] += 1 } else { e[1] += 1 }
      e[2] = r.ok ? 1 : 0; e[3] = now
      m.n[r.id] = e
    }
    if !results.isEmpty { m.at = now }
    return m
  }
}

// ---------- what this phone remembers about a map (never saved to the page) ----------
/// Its folds, whether the Outline or the weak spots were showing, and whether it was opened before (a big map opens folded to level 2 the first
/// time on a device): UserDefaults lucida.maps.view.<pageId>.
struct MapDevice: Codable, Equatable {
  var folds: [String: Bool] = [:]
  var outline = false
  var weak = false
  var seen = false
  static func key(_ pageId: String) -> String { "lucida.maps.view." + pageId }
  static func load(_ pageId: String, _ d: UserDefaults = .standard) -> MapDevice {
    d.data(forKey: key(pageId)).flatMap { try? JSONDecoder().decode(MapDevice.self, from: $0) } ?? MapDevice()
  }
  func save(_ pageId: String, _ d: UserDefaults = .standard) { if let data = try? JSONEncoder().encode(self) { d.set(data, forKey: MapDevice.key(pageId)) } }
}

/// A new idea's id when the app adds one (spec §2.1): 'n' and 7 base-36 characters, made here and never in maps.js.
enum MapIds {
  static func make(_ taken: Set<String> = []) -> String {
    let abc = Array("0123456789abcdefghijklmnopqrstuvwxyz")
    while true { let id = "n" + String((0..<7).map { _ in abc.randomElement()! }); if !taken.contains(id) { return id } }
  }
}
