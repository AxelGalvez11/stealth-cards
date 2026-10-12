// The iPhone's Mind map engine on the Mac with no simulator (ios/tests/maps-check.sh): web/maps.js in JavaScriptCore (Data/MapEngine.swift)
// against node, byte for byte, on every call ios/tests/js/maps-dump.mjs wrote down; and the Swift side's own readers of its answers
// (MapLayout, MapPreview and MapTree in Data/MapData.swift, and MapText.units against maps.units).
//   maps-check <maps.js> <folder with maps-cases.json>
// Prints the failures as "  FAIL ..." (at most 20), and a last line "Maps: N passed, M failed".
import Foundation

var passed = 0, failed = 0, shown = 0
func check(_ ok: Bool, _ name: @autoclosure () -> String, _ got: @autoclosure () -> String = "") {
  if ok { passed += 1; return }
  failed += 1; shown += 1
  if shown <= 20 { print("  FAIL " + name() + "  → " + String(got().prefix(400)).replacingOccurrences(of: "\n", with: "\\n")) }
}
let a = CommandLine.arguments
let read = { (p: String) in (try? String(contentsOfFile: p, encoding: .utf8)) ?? "" }
let E = MapEngine(source: read(a[1]))
check(E.ok, "maps.js loads in JavaScriptCore", E.failure)
let cases = (try? JSONSerialization.jsonObject(with: Data(read(a[2] + "/maps-cases.json").utf8))) as? [[String: Any]] ?? []
check(cases.count > 1000, "node wrote the cases", "\(cases.count)")

var byFn: [String: Int] = [:]
let t0 = Date()
for (i, c) in cases.enumerated() {
  let fn = c["fn"] as! String, args = c["a"] as! String
  byFn[fn, default: 0] += 1
  let got = E.callJSON(fn, args)
  if let t = c["throws"] as? String {
    check(got == nil && E.lastError == t, "case \(i) \(fn) throws as in node: \(t)", got ?? E.lastError)
  } else {
    let want = c["out"] as! String
    check(got == want, "case \(i) \(fn)(\(args.prefix(160))) is node's answer, byte for byte", got ?? "threw: " + E.lastError)
    // the app's readers of the answers
    if fn == "layoutMind" || fn == "layout", let g = got {
      let L = try? JSONDecoder().decode(MapLayout.self, from: Data(g.utf8))
      check(L != nil && L!.nodes.count >= 1 && L!.links.count == L!.nodes.count - 1, "case \(i) reads as a MapLayout", g)
    }
    if fn == "previewOf", let g = got {
      let P = try? JSONDecoder().decode(MapPreview.self, from: Data(g.utf8))
      check(P != nil && P!.curves.count == P!.links.count, "case \(i) reads as a MapPreview", g)
    }
    if fn == "normalize", let g = got, let o = try? JSONSerialization.jsonObject(with: Data(g.utf8)) as? [String: Any], let d = o["data"] {
      let tree = MapTree(MapEngine.json(d)), count = Int(E.callJSON("countOf", "[\"mindmap\"," + MapEngine.json(d) + "]") ?? "") ?? -1
      check(tree.order.count == count && !tree.root.isEmpty, "case \(i) reads as a MapTree with every idea", "\(tree.order.count) vs \(count)")
    }
    if fn == "units", let s = (try? JSONSerialization.jsonObject(with: Data(args.utf8))) as? [String] {
      check(abs(MapText.units(s[0]) - (Double(want) ?? -1)) < 1e-9, "MapText.units(\(s[0])) is maps.units", "\(MapText.units(s[0])) vs \(want)")
    }
  }
}
let secs = Date().timeIntervalSince(t0)
check(E.ok, "nothing failed inside the engine", E.failure)
// The typed wrappers the screens use, on the sample's own map.
let sample = #"{"root":{"id":"cell","label":"The cell","children":[{"id":"mito","label":"Mitochondria","note":"Most ATP.","cardIds":["cm1"],"children":[{"id":"krebs","label":"Krebs cycle in the matrix","cardIds":["c1"]},{"id":"etc","label":"Electron transport on the inner membrane"}]},{"id":"er","label":"ER and Golgi","folded":true,"children":[{"id":"rough","label":"Rough ER makes proteins"}]}]}}"#
let L = E.layout("mindmap", sample, folds: ["er": true], side: "right", scale: 1, title: "T")
check(L?.nodes.count == 5 && L?.node("er")?.folded == true && L?.node("er")?.hidden == 1, "layout(): the folded idea and its +1", "\(String(describing: L))")
let ed = E.edit("mindmap", sample, ["op": "add", "id": "nabc1234", "parent": "mito", "label": "ATP synthase"])
check(ed.summary == "Added “ATP synthase” under “Mitochondria”" && MapTree(ed.data)["nabc1234"]?.parent == "mito", "edit(): add an idea", ed.summary)
let mg = E.merge("mindmap", base: sample, mine: ed.data, theirs: E.edit("mindmap", sample, ["op": "set", "id": "etc", "label": "ETC"]).data)
check(mg.map { MapTree($0.data)["nabc1234"] != nil && MapTree($0.data)["etc"]?.label == "ETC" } == true, "merge(): both changes kept", mg?.data ?? "nil")
check(E.reviewIds(sample, ["mito"]) == ["cm1", "c1"], "reviewIds(): a branch's cards in outline order", "\(E.reviewIds(sample, ["mito"]))")
check(E.testOrder(sample, hidden: nil) == ["mito", "krebs", "etc", "er", "rough"], "testOrder(): every idea but the topic", "\(E.testOrder(sample, hidden: nil))")
check(E.ideaTone(["solid"], [0, 1, 0, 1]) == "weak" && E.ideaTone([], nil) == "new", "ideaTone()")
check(E.summary("mindmap", sample, ed.data, who: "Claude") == "Claude added “ATP synthase” under Mitochondria", "summary(): who did what", E.summary("mindmap", sample, ed.data, who: "Claude"))
check(E.normalize("mindmap", #"{"blocks":[]}"#) == nil && E.lastError.contains("Mind map"), "normalize(): a Note's blocks are refused", E.lastError)
check(E.ok, "a refusal isn't the engine failing", E.failure)
let P = E.previewOf("mindmap", sample, w: 340, h: 120, tones: ["etc": "weak"])
check(P?.nodes.first { $0.id == "etc" }?.tone == "weak" && P?.nodes.first { $0.id == "rough" } == nil && P?.w == 340, "previewOf(): what it shows, with its tones", "\(String(describing: P))")
// One call for every idea's tone (MapEngine.ideaTones, the weak-spots overlay and the Note's pictures) answers what ideaTone answers idea by idea.
do {
  let tree = MapTree(sample), cards = ["cm1": "getting", "c1": "weak"], marks: [String: [Double]] = ["etc": [0, 1, 0, 1], "rough": [1, 0, 1, 1]]
  let all = E.ideaTones(tree, cards: cards, marks: marks)
  var one: [String: String] = [:]
  for id in tree.order where (tree[id]?.level ?? 0) > 0 { one[id] = E.ideaTone((tree[id]?.cardIds ?? []).compactMap { cards[$0] }, marks[id]) }
  check(all == one && all.count == tree.order.count - 1 && all["mito"] == "getting" && all["krebs"] == "weak" && all["etc"] == "weak" && all["rough"] == "solid" && all["er"] == "new",
        "ideaTones(): one call answers ideaTone for every idea", "\(all) vs \(one)")
  check(E.ideaTones(MapTree(#"{"root":{"id":"r","label":""}}"#), cards: [:], marks: [:]).isEmpty, "ideaTones(): a map with only its topic has none")
}
// A call that throws on another thread never makes the engine read as failed (`ok` is what loading said, and nothing else).
do {
  let g = DispatchGroup(); var sawFailed = false
  DispatchQueue.global().async(group: g) { for _ in 0..<400 { _ = E.normalize("mindmap", #"{"blocks":[]}"#) } }
  for _ in 0..<20000 { if !E.ok { sawFailed = true } }
  g.wait()
  check(!sawFailed && E.ok && E.lastError.contains("Mind map"), "refusals thrown on the layout queue never make the engine read as failed", E.failure)
}
// A Mind map's review set (Study this branch): web/db.js setCards' order and setName's words.
do {
  struct C { var id: String, new: Bool, r: Double? }
  let cs = [C(id: "n1", new: true, r: nil), C(id: "a", new: false, r: 0.9), C(id: "n2", new: true, r: nil), C(id: "b", new: false, r: 0.4), C(id: "x", new: false, r: nil), C(id: "c", new: false, r: 0.4)]
  let o = MapSet.order(cs, isNew: { $0.new }, recall: { $0.r }).map(\.id)
  check(o == ["b", "c", "a", "x", "n1", "n2"], "MapSet.order: least remembered first, new cards last, ties in outline order", "\(o)")
  check(MapSet.order(Array(repeating: C(id: "z", new: false, r: 0.5), count: 130), isNew: { $0.new }, recall: { $0.r }).count == 100, "MapSet.order: 100 at most")
  check(MapSet.name(data: sample, title: "The cell", ideas: ["mito"], gone: false) == "Mitochondria", "MapSet.name: one idea's words")
  check(MapSet.name(data: sample, title: "The cell", ideas: ["mito", "er", "nope"], gone: false) == "The cell · 2 ideas", "MapSet.name: more ideas", MapSet.name(data: sample, title: "The cell", ideas: ["mito", "er", "nope"], gone: false))
  check(MapSet.name(data: sample, title: "", ideas: nil, gone: false) == "Untitled" && MapSet.name(data: #"{"root":{"id":"r","label":""}}"#, title: "Topic", ideas: ["r"], gone: false) == "Topic", "MapSet.name: the page's title, else Untitled")
  check(MapSet.name(data: nil, title: nil, ideas: nil, gone: false) == "One moment…" && MapSet.name(data: nil, title: nil, ideas: nil, gone: true) == "A page that isn’t here any more", "MapSet.name: loading, and gone")
}
print(byFn.sorted { $0.key < $1.key }.map { "\($0.key) \($0.value)" }.joined(separator: ", "))
print(String(format: "JavaScriptCore answered %d calls in %.2f s", cases.count, secs))
print("Maps: \(passed) passed, \(failed) failed")
