// Lays out the trees ios/tests/js/diagram-dump.mjs made with Data/DiagramLayout.swift and compares every box (its place, size, level, branch and lines of words) and every link (its two ends,
// and the path the web draws between them) with what web/diagram.js laid out in node. Exits 1 on the first difference found in any tree (and says where).
//   diagram-parity <folder with trees.json and expect.json>
import Foundation

let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
func load(_ name: String) -> [Any] {
  guard let d = FileManager.default.contents(atPath: dir + "/" + name), let j = try? JSONSerialization.jsonObject(with: d) as? [Any] else { print("could not read " + name); exit(2) }
  return j
}
let trees = load("trees.json"), expect = load("expect.json")
guard trees.count == expect.count else { print("different counts"); exit(2) }

/// JavaScript's way to write a number rounded to a tenth ("12", "12.5"), as web/diagram.js writes a link's path.
func r(_ v: Double) -> String {
  let t = (v * 10).rounded() / 10
  return t == t.rounded() ? String(Int(t)) : String(t)
}
func path(_ l: DiagramLayout.Link) -> String {
  let m = (l.x1 + l.x2) / 2
  return "M" + r(l.x1) + " " + r(l.y1) + " C" + r(m) + " " + r(l.y1) + " " + r(m) + " " + r(l.y2) + " " + r(l.x2) + " " + r(l.y2)
}
func num(_ a: Any?) -> Double { (a as? NSNumber)?.doubleValue ?? .nan }

var bad = 0, boxes = 0, links = 0
for (i, raw) in trees.enumerated() {
  guard let data = try? JSONSerialization.data(withJSONObject: raw), let tree = try? JSONDecoder().decode(DiagramNode.self, from: data), let want = expect[i] as? [String: Any] else { print("tree \(i): could not be read"); bad += 1; continue }
  let g = DiagramLayout(tree)
  var why: [String] = []
  let wn = want["nodes"] as? [[String: Any]] ?? [], wl = want["links"] as? [[String: Any]] ?? []
  if g.nodes.count != wn.count { why.append("\(g.nodes.count) boxes, node says \(wn.count)") }
  for (k, n) in g.nodes.enumerated() where k < wn.count {
    let w = wn[k]
    boxes += 1
    if num(w["id"]) != Double(n.id) || num(w["level"]) != Double(n.level) || num(w["branch"]) != Double(n.branch) { why.append("box \(k): id, level or branch") }
    for (name, mine) in [("x", n.x), ("y", n.y), ("w", n.w), ("h", n.h)] where abs(num(w[name]) - mine) > 1e-9 { why.append("box \(k): \(name) is \(mine), node says \(num(w[name]))") }
    if (w["lines"] as? [String] ?? []) != n.lines { why.append("box \(k): lines \(n.lines) against \(w["lines"] ?? "none")") }
  }
  if g.links.count != wl.count { why.append("\(g.links.count) links, node says \(wl.count)") }
  for (k, l) in g.links.enumerated() where k < wl.count {
    links += 1
    if num(wl[k]["from"]) != Double(l.from) || num(wl[k]["to"]) != Double(l.to) { why.append("link \(k): its ends") }
    if (wl[k]["d"] as? String ?? "") != path(l) { why.append("link \(k): path \(path(l)) against \(wl[k]["d"] ?? "none")") }
  }
  if abs(num(want["width"]) - g.width) > 1e-9 || abs(num(want["height"]) - g.height) > 1e-9 { why.append("size \(g.width) x \(g.height), node says \(num(want["width"])) x \(num(want["height"]))") }
  // (How many ideas, as the Diagrams tab says "13 ideas".)
  let counted = DiagramNode.countCheck(raw)
  if counted != tree.count { why.append("count \(tree.count), node says \(counted)") }
  if !why.isEmpty { bad += 1; if bad <= 8 { print("tree \(i): " + why.prefix(3).joined(separator: "; ")) } }
}
print("Diagram layout: \(trees.count) trees, \(boxes) boxes, \(links) links, \(bad == 0 ? "every one the same as node" : "\(bad) trees differ")")
exit(bad == 0 ? 0 : 1)

extension DiagramNode {
  /// The number of ideas in a tree as the web counts them (the root, plus the same for each child), from the raw JSON.
  static func countCheck(_ raw: Any) -> Int {
    guard let n = raw as? [String: Any] else { return 1 }
    return 1 + ((n["children"] as? [Any]) ?? []).reduce(0) { $0 + countCheck($1) }
  }
}
