// What a Mind map page holds while it's open on the iPhone (Screens/MapPage.swift draws it): the map's data as shown, its layout (worked out
// off the main thread by Data/MapEngine.swift, kept until a new one arrives), the camera, the selection, what this phone remembers (folds, the
// Outline, the weak spots), Test me, and the sheets. Every change to the map goes through maps.edit (the web's editor makes the same ones) and is
// saved by Data/Pages.swift a moment after the last change, as one version; folding and testing never save. Test me's marks go to the library
// (mapmarks.save), never to the page.
import SwiftUI

@MainActor
final class MapModel: ObservableObject {
  enum Sheet: Equatable { case none, test, done, cards, more, make }
  /// Test me as it goes: what's hidden, in what order, how it shows (one at a time, or on the map), what's marked, and the idea it's on.
  struct Test: Equatable {
    var show = "one"
    var order: [String] = []
    var hidden: Set<String> = []
    var marks: [String: String] = [:]
    var index = 0
    var shown = false
    var current = ""
    var missed: Int { marks.values.filter { $0 == "missed" }.count }
  }
  /// What a finished test says: how many were known of how many, and the ones missed (in order).
  struct Done: Equatable { var knew = 0, total = 0; var missed: [String] = [] }

  var pageId = ""
  var title = ""
  /// Where the page is: a deck ("deck") or a folder ("folder"), and its id (Test me's marks go by it). `deckId` is the deck a new card goes to
  /// ("" on a folder's map, as the web's: + Card makes nothing there); the cards to link and test are the deck's, or every deck's in the folder.
  var scope = "deck", scopeId = ""
  var deckId = "", deckName = ""
  var canEdit = false
  var demo = false
  /// The design screen's state ("Mind map · testing"), "" for a real page.
  var demoView = ""
  weak var store: Store?
  weak var pages: PagesStore?
  weak var nav: Nav?

  // ---------- the map ----------
  @Published private(set) var data = ""
  /// The data as the server last had it (what a change from elsewhere is compared with).
  private var seen = ""
  private var seenVersion = 0
  @Published private(set) var tree = MapTree("")
  @Published private(set) var layout: MapLayout? = nil
  @Published private(set) var from: MapLayout? = nil
  /// The boxes as drawn (MapArt.boxes, a balancing search per box), worked out once per layout: never per frame of a pan or a glide.
  private(set) var boxes: [MapBox] = []
  private(set) var fromBoxes: [MapBox]? = nil
  private var layoutStamp = 0
  @Published var glide: Double = 1
  @Published var cam = MapCam()
  /// The camera was moved by hand (so turning the weak spots on doesn't move it).
  var userMoved = false
  /// The stage's size (points), and the text scale (Dynamic Type, up to 1.3).
  var stage = CGSize(width: 390, height: 608)
  /// The keyboard's height while an idea is written (the boards draw one 266 points tall).
  var keyboardH = 266.0
  /// What shows above the idea bar while writing: the stage and the bottom bar's room, less the keyboard and the bar (196).
  var writingH: Double { stage.height + 88 - keyboardH - 196 }
  var scale = 1.0
  /// The engine failed: the page shows a plain outline and can't be edited.
  @Published private(set) var failed = false

  // ---------- this phone, and the screen ----------
  @Published var device = MapDevice()
  @Published var sel = ""
  @Published var sheet: Sheet = .none
  @Published var test: Test? = nil
  @Published var done: Done? = nil
  @Published var testHide = "all"
  @Published var testShow = "one"
  @Published var writing = false
  @Published var field = ""
  @Published var noteField = ""
  @Published var noting = false
  /// Ideas the other writer just added (ringed for 4 s), and the line that says what they did.
  @Published var changed: Set<String> = []
  @Published var live: String? = nil
  /// A quiet message with Undo ("Deleted “Mitochondria” and 4 ideas under it").
  @Published var toast: String? = nil
  @Published var make: (front: String, back: String, idea: String)? = nil
  @Published var cardsQuery = ""
  private var undo: [String] = []
  private var toastUndo: String? = nil
  /// The idea that stays still while the map is laid out again (the one folded or unfolded), and where it was.
  private var anchor: (id: String, x: Double, y: Double)? = nil
  /// A camera to go to once the next layout arrives.
  private var then: ((MapModel) -> Void)? = nil
  private var layoutKey = ""
  private var fresh: Set<String> = []

  // ---------- opening ----------
  func open(_ p: PageInfo, store: Store, pages: PagesStore, nav: Nav, scope: String, scopeId: String, deckName: String, canEdit: Bool, demoView: String, stage: CGSize, scale: Double) {
    self.store = store; self.pages = pages; self.nav = nav
    self.scope = scope == "folder" ? "folder" : "deck"; self.scopeId = scopeId; self.deckId = self.scope == "deck" ? scopeId : ""
    self.deckName = deckName; self.canEdit = canEdit; self.demo = store.demo; self.demoView = demoView
    self.stage = stage; self.scale = scale
    pageId = p.id; title = p.title
    failed = !MapEngine.shared.ok
    var d = p.data.isEmpty ? MapEngine.shared.emptyOf("mindmap") : p.data
    device = demo ? MapDevice() : MapDevice.load(p.id)
    if demo { d = MapDemo.setUp(self, view: demoView); then = { [demoView] m in MapDemo.camera(m, view: demoView) } } else {
      seen = d; seenVersion = p.version
      // (a big map opens folded to level 2 the first time on a phone)
      if !device.seen {
        let t = MapTree(d)
        if t.order.count > 40 { for id in t.order where t[id]?.level == 2 && !(t[id]?.children.isEmpty ?? true) { device.folds[id] = true } }
        device.seen = true; device.save(p.id)
      }
    }
    setData(d)
    if MapModel.openWithTest == p.id {
      MapModel.openWithTest = nil
      then = { m in m.fitNow(animated: false); let w = m.testIds("weak"); m.testHide = w.isEmpty ? "all" : "weak"; m.startTest(w.isEmpty ? nil : w, show: "one") }
    }
    relayout(fit: !demo)
  }
  private func setData(_ d: String) { data = d; tree = MapTree(d) }

  /// The page as the server has it now: a change from somewhere else (an AI app, another device) shows at once, with what changed ringed and
  /// a line saying so; what's being written here waits for its save, which merges (Data/Pages.swift).
  func sync(_ p: PageInfo) {
    guard !demo, p.id == pageId else { return }
    title = p.title
    adoptRebased()
    guard p.version != seenVersion else { return }
    let busy = pages?.saving(pageId).busy ?? false
    defer { seenVersion = p.version }
    guard !busy, !p.data.isEmpty, p.data != data else { seen = p.data; return }
    let before = seen.isEmpty ? data : seen
    seen = p.data
    let mineNow = data == before
    setData(p.data)
    if p.by != "you" || !mineNow {
      let added = MapEngine.shared.added("mindmap", before, p.data)
      changed = Set(added)
      let who = PageAgo.who(p.by), s = MapEngine.shared.summary("mindmap", before, p.data, who: who == "You" ? "" : who)
      if !s.isEmpty && p.by != "you" { live = s + " · v\(p.version)" }
      DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in withAnimation(Motion.fade) { self?.changed = [] } }
      // (the camera frames where they went: the idea they were added under and its children, as the board does)
      if let first = added.first(where: { tree[$0]?.parent.map { !added.contains($0) } ?? true }) {
        let under = tree[first]?.parent ?? first
        then = { m in m.go(MapCamera.shot(m.framedBoxes, [[under], m.boxes.filter { $0.parent == under }.map(\.id)], m.area(76, h: m.stage.height - 76), z: 1.1)) }
      }
    }
    relayout()
  }
  /// What a save's merge left the page with while more was waiting here (Data/Pages.swift put that on top of the merged page): shown, and the
  /// next change is made on it, so the other writer's change isn't taken back out.
  private func adoptRebased() {
    guard !demo, let d = pages?.takeRebased(pageId), d != data else { return }
    setData(d); relayout()
  }
  /// The conflict line after a merge ("Claude changed this map while you were editing (v8). Both are kept…").
  func conflict(_ c: PagesStore.Conflict?) {
    guard let c else { return }
    live = PageAgo.who(c.by) + " changed this map while you were editing (v\(c.theirs)). Both are kept: what you did is on top of it, in v\(c.mine)."
  }

  // ---------- layout ----------
  /// The boxes grown by what hangs off them (what the camera frames).
  var framedBoxes: [MapBox] { art(Theme.light.colors, dark: false).framed(boxes) }
  var side: String { stage.width >= 700 ? "both" : "right" }
  /// The folds the map is laid out with: this phone's, or none during a test (a test opens everything).
  var folds: [String: Bool] { test != nil ? [:] : device.folds }
  func relayout(fit: Bool = false) {
    let f = folds, key = pageId + "|" + String(data.hashValue) + "|" + f.sorted { $0.key < $1.key }.map { $0.key + ($0.value ? "1" : "0") }.joined(separator: ",") + "|" + side + "|\(scale)"
    guard key != layoutKey || layout == nil else { if fit { fitNow(animated: false) }; return }
    layoutKey = key
    MapEngine.shared.layoutAsync(key: key, "mindmap", data, folds: f, side: side, scale: scale, title: title) { [weak self] l in
      guard let self, self.layoutKey == key else { return }
      guard let l else { self.failed = true; return }
      self.arrive(l, fit: fit)
    }
  }
  private func arrive(_ l: MapLayout, fit: Bool) {
    let old = layout
    // (the idea folded or unfolded stays where it was: the camera moves by as much as it did)
    if let a = anchor, let n = l.node(a.id) {
      var tx = Transaction(); tx.disablesAnimations = true
      withTransaction(tx) { cam.x += cam.z * (a.x - n.x); cam.y += cam.z * (a.y - n.y) }
    }
    anchor = nil
    let oldBoxes = boxes
    boxes = MapArt.boxes(l); layoutStamp &+= 1
    if old == nil || Motion.still { from = nil; fromBoxes = nil; layout = l; glide = 1 }
    else {
      var tx = Transaction(); tx.disablesAnimations = true
      fromBoxes = oldBoxes
      withTransaction(tx) { from = old; layout = l; glide = 0 }
      withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: Generated.motion.reveal)) { glide = 1 }
    }
    if fit { fitNow(animated: false) }
    if let go = then { then = nil; go(self) }
  }

  // ---------- the camera ----------
  /// An area of the stage nobody covers: `top` down, `h` tall (the board's heights on a 608-point stage, grown with a taller one).
  func area(_ top: Double = 0, h: Double) -> MapCamera.Area { MapCamera.Area(x: 0, y: top, w: stage.width, h: h + max(0, stage.height - 608)) }
  func go(_ c: MapCam, animated: Bool = true) {
    if animated, !Motion.still { withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: Generated.motion.sheet)) { cam = c } } else { cam = c }
  }
  /// The whole map, as it opens (§5.1 with the boards' zoom: no word under 13 pt).
  func fitNow(animated: Bool) {
    guard layout != nil else { return }
    go(MapCamera.fit(framedBoxes, MapCamera.Area(x: 0, y: 0, w: stage.width, h: device.weak && !demo ? area(h: 470).h : stage.height), inset: 16, zmin: 1.04, zmax: 1.25), animated: animated)
  }
  /// An idea's branch, framed above what covers the stage (the idea bar, a sheet, the test's panel).
  func frameIdea(_ id: String, over h: Double, z: Double = 1.1, kids: Bool = true, sibs: Bool = false) {
    guard layout != nil else { return }
    go(MapCamera.shot(framedBoxes, MapCamera.groups(boxes, id, kids: kids, sibs: sibs), area(h: h), z: z))
  }
  /// Brings an idea into the part of the stage that shows, when it isn't there already.
  func reveal(_ id: String, over h: Double) {
    guard let b = boxes.first(where: { $0.id == id }) else { return }
    let r = CGRect(x: cam.x + cam.z * b.x, y: cam.y + cam.z * b.y, width: cam.z * b.w, height: cam.z * b.h), a = area(h: h)
    if r.minX < 8 || r.minY < 8 || r.maxX > a.w - 8 || r.maxY > a.h - 8 { frameIdea(id, over: h) }
  }

  // ---------- the look ----------
  /// The weak-spots tone of every idea (maps.ideaTone, from its cards' tones, sched.toneOf, and its last Test me mark): one call into maps.js
  /// for the whole map, kept until the map, the library or the marks change (never worked out per frame).
  func tones() -> [String: String] {
    _ = deckCards()
    let key = String(data.hashValue) + "|" + rowsKey + "|" + String(marks.hashValue)
    if key != tonesKey { tonesKey = key; tonesMemo = MapModel.tones(tree, cards: cardTones(), marks: marks) }
    return tonesMemo
  }
  private var tonesKey = "", tonesMemo: [String: String] = [:]
  nonisolated static func tones(_ tree: MapTree, cards: [String: String], marks: [String: [Double]]) -> [String: String] {
    MapEngine.shared.ideaTones(tree, cards: cards, marks: marks)
  }
  /// A page opened from a Note's Test me starts a test of its weak ones (or all, with none weak) once it's laid out.
  static var openWithTest: String? = nil
  /// This map's marks (the sample's on a design screen).
  var marks: [String: [Double]] { demo ? MapDemo.sample.marks : store?.lib.mapMarks[pageId]?.n ?? [:] }
  /// The cards' tones, by id: the deck's (or the folder's decks') cards, as the web's db.mapCards gives them.
  func cardTones() -> [String: String] { Dictionary(deckCards().map { ($0.id, $0.tone) }, uniquingKeysWith: { a, _ in a }) }
  func art(_ t: ThemeColors, dark: Bool) -> MapArt {
    var a = MapArt(t: t, dark: dark)
    a.tree = tree; a.title = title; a.sel = sel; a.changed = changed
    if let x = test { a.hidden = x.hidden; a.marks = x.marks }
    if device.weak && test == nil {
      let tn = tones(); a.tones = tn
      if let L = layout { for n in L.nodes where n.folded { let k = tree.under(n.id).filter { tn[$0] == "weak" }.count; if k > 0 { a.weakIn[n.id] = k } } }
    }
    return a
  }

  /// What hangs off the boxes as drawn (MapArt.extras, checked against every other box), kept until the boxes or what marks them change.
  func extras(_ a: MapArt) -> [String: MapExtra] {
    let key = "\(layoutStamp)|\(data.hashValue)|" + a.changed.sorted().joined(separator: ",") + "|" + a.hidden.sorted().joined(separator: ",")
      + "|" + a.weakIn.sorted { $0.key < $1.key }.map { $0.key + "=\($0.value)" }.joined(separator: ",")
    if key != extrasKey { extrasKey = key; extrasMemo = a.extras(boxes) }
    return extrasMemo
  }
  private var extrasKey = "", extrasMemo: [String: MapExtra] = [:]

  // ---------- edits (maps.edit; saved a moment later, as one version) ----------
  @discardableResult
  func apply(_ op: [String: Any], keepUndo: Bool = true) -> Bool {
    guard canEdit, !failed else { return false }
    adoptRebased()
    let r = MapEngine.shared.edit("mindmap", data, op)
    guard !r.summary.isEmpty else { return false }
    if keepUndo { undo.append(data); if undo.count > 50 { undo.removeFirst() } }
    setData(r.data)
    if !demo { pages?.edit(pageId, data: r.data) }
    relayout()
    return true
  }
  func undoLast() {
    guard let d = toastUndo ?? undo.popLast() else { return }
    toastUndo = nil; toast = nil
    setData(d); if !demo { pages?.edit(pageId, data: d) }
    relayout()
  }
  var taken: Set<String> { Set(tree.order) }
  /// A new idea under `parent` (after `after`, else last), selected and ready to type.
  func addIdea(under parent: String, after: String? = nil) {
    let id = MapIds.make(taken)
    var op: [String: Any] = ["op": "add", "id": id, "parent": parent, "label": ""]
    if let after { op["after"] = after }
    guard apply(op) else { return }
    fresh.insert(id)
    select(id, write: true)
  }
  func select(_ id: String, write: Bool = false) {
    commitWriting()
    sel = id; field = tree[id]?.label ?? ""; noteField = tree[id]?.note ?? ""; noting = false
    writing = write
    then = { m in m.reveal(id, over: write ? m.writingH - max(0, m.stage.height - 608) : 468) }
    if layout?.node(id) != nil { let g = then; then = nil; g?(self) }
  }
  func deselect() { commitWriting(); sel = ""; writing = false; noting = false }
  /// The label typed in the idea bar.
  func typed(_ s: String) {
    guard !sel.isEmpty, s != (tree[sel]?.label ?? "") else { return }
    apply(["op": "set", "id": sel, "label": s], keepUndo: false)
  }
  func typedNote(_ s: String) {
    guard !sel.isEmpty, s != (tree[sel]?.note ?? "") else { return }
    apply(["op": "set", "id": sel, "note": s], keepUndo: false)
  }
  /// Return in the idea bar: a sibling after this idea (a child of the topic), and the keyboard stays.
  func returnKey() {
    guard !sel.isEmpty else { return }
    if let p = tree[sel]?.parent { addIdea(under: p, after: sel) } else { addIdea(under: sel) }
  }
  /// Leaving an idea being written: a new one left empty goes.
  func commitWriting() {
    if !sel.isEmpty, fresh.contains(sel), (tree[sel]?.label ?? "").isEmpty, tree[sel]?.parent != nil {
      apply(["op": "remove", "id": sel], keepUndo: false)
    }
    fresh.remove(sel)
  }
  func doneWriting() { commitWriting(); writing = false; noting = false; if tree[sel] == nil { sel = "" } }
  func move(_ how: String) {
    guard !sel.isEmpty else { return }
    switch how {
    case "up": apply(["op": "move", "id": sel, "by": -1])
    case "down": apply(["op": "move", "id": sel, "by": 1])
    default: apply(["op": how, "id": sel])
    }
  }
  /// Delete an idea and its branch, with Undo.
  func remove(_ id: String) {
    let before = data, label = tree[id]?.label ?? "", under = tree.under(id).count
    guard apply(["op": "remove", "id": id]) else { return }
    sel = ""; writing = false
    toastUndo = before
    withAnimation(Motion.pop) { toast = "Deleted “" + label + "”" + (under > 0 ? " and " + plural(under, "idea") + " under it" : "") }
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in if self?.toastUndo == before { withAnimation(Motion.leave) { self?.toast = nil; self?.toastUndo = nil } } }
  }

  // ---------- folding (this phone only; never saved) ----------
  func isFolded(_ id: String) -> Bool { device.folds[id] ?? tree[id]?.folded ?? false }
  func fold(_ id: String, _ on: Bool? = nil) {
    guard !(tree[id]?.children.isEmpty ?? true) else { return }
    let to = on ?? !isFolded(id)
    if let n = layout?.node(id) { anchor = (id, n.x, n.y) }
    device.folds[id] = to
    if !demo { device.save(pageId) }
    relayout()
  }
  var anyFolded: Bool { layout?.nodes.contains { $0.folded } ?? false }
  /// Page ⋯: Fold to main ideas, or Unfold all.
  func foldAll() {
    if anyFolded { for id in tree.order { device.folds[id] = false } }
    else { for id in tree.order where tree[id]?.level == 1 && !(tree[id]?.children.isEmpty ?? true) { device.folds[id] = true } }
    if !demo { device.save(pageId) }
    then = { m in m.fitNow(animated: true) }
    relayout()
  }
  func toggleWeak() {
    device.weak.toggle(); if !demo { device.save(pageId) }
    if !userMoved { fitNow(animated: true) }
  }
  func toggleOutline() { device.outline.toggle(); if !demo { device.save(pageId) }; if device.outline { writing = false } }

  // ---------- Test me (§6.1) ----------
  /// The ideas a test would hide: everything, the weak ones, or the selected idea's branch.
  func testIds(_ hide: String) -> [String] {
    switch hide {
    case "weak": let tn = tones(); return tree.order.filter { tn[$0] == "weak" }
    case "branch": guard !sel.isEmpty else { return [] }; let u = tree.under(sel); return u.isEmpty ? [sel] : u
    default: return MapEngine.shared.testOrder(data, hidden: nil)
    }
  }
  func openTest(hide: String? = nil) {
    deselectKeepingSel()
    testHide = hide ?? (sel.isEmpty && testHide == "branch" ? "all" : testHide)
    withAnimation(Motion.sheet) { sheet = .test }
  }
  private func deselectKeepingSel() { commitWriting(); writing = false; noting = false }
  func startTest(_ ids: [String]? = nil, show: String? = nil) {
    let order = ids ?? testIds(testHide)
    guard !order.isEmpty else { withAnimation(Motion.leave) { sheet = .none }; return }
    var x = Test(); x.show = show ?? testShow; x.order = order; x.hidden = Set(order)
    if x.show == "one" { x.current = order[0] }
    withAnimation(Motion.leave) { sheet = .none }
    done = nil; writing = false
    // (a test is taken on the map; the Outline comes back after it if it was showing: VoiceOver tests from MapA11y)
    if device.outline { device.outline = false; reopenOutline = true }
    test = x
    sel = x.show == "one" ? x.current : ""
    then = { m in m.followTest() }
    relayout()
  }
  /// The camera on the idea the test is at (one at a time).
  func followTest() {
    guard let x = test else { return }
    if x.show == "one", !x.current.isEmpty { frameIdea(x.current, over: 532, z: 1.25, kids: false, sibs: true) }
    else if !x.current.isEmpty { frameIdea(x.current, over: 542, kids: false, sibs: true) }
    else { fitNow(animated: true) }
  }
  /// Show: the current idea's words come back.
  func showCurrent() {
    guard var x = test, !x.current.isEmpty else { return }
    x.shown = true; x.hidden.remove(x.current)
    withAnimation(Motion.reveal) { test = x }
  }
  /// On the map: a hidden idea tapped (once the ideas above it show) is revealed and waits for its mark.
  func tapInTest(_ id: String) {
    guard var x = test, x.show == "map", x.current.isEmpty || x.marks[x.current] != nil, x.hidden.contains(id) else { return }
    var p = tree[id]?.parent
    while let q = p { if x.hidden.contains(q) { return }; p = tree[q]?.parent }
    x.current = id; x.shown = true; x.hidden.remove(id)
    sel = id
    withAnimation(Motion.reveal) { test = x }
    reveal(id, over: 542)
  }
  /// Missed or Knew it, for the idea the test is at.
  func mark(_ knew: Bool) {
    guard var x = test, !x.current.isEmpty, x.shown else { return }
    x.marks[x.current] = knew ? "knew" : "missed"
    x.index += 1; x.shown = false
    if x.show == "one" {
      if x.index < x.order.count { x.current = x.order[x.index]; sel = x.current } else { x.current = ""; sel = "" }
    } else { x.current = ""; sel = "" }
    test = x
    if x.marks.count >= x.order.count { finishTest(); return }
    if x.show == "one" { followTest() }
  }
  /// The test ends (or End): the marks so far go to the library, and the Done sheet says how it went.
  func finishTest() {
    guard let x = test else { return }
    guard !x.marks.isEmpty else { withAnimation(Motion.leave) { test = nil; sel = "" }; relayout(); return }
    let results = x.order.compactMap { id in x.marks[id].map { (id: id, ok: $0 == "knew") } }
    saveMarks(results)
    var d = Done(); d.total = results.count; d.knew = results.filter(\.ok).count; d.missed = results.filter { !$0.ok }.map(\.id)
    var y = x; y.current = ""; y.hidden = []; test = y; sel = ""
    done = d
    withAnimation(Motion.sheet) { sheet = .done }
  }
  private var reopenOutline = false
  func closeDone() {
    withAnimation(Motion.leave) { sheet = .none; done = nil; test = nil; if reopenOutline { device.outline = true; reopenOutline = false } }
    relayout()
  }
  private func saveMarks(_ results: [(id: String, ok: Bool)]) {
    guard !demo, let store, !scopeId.isEmpty else { return }
    let pid = pageId, ids = tree.order, now = nowMs()
    // (a folder's map keeps its marks by the folder's id, as the web's does: the store takes a deck's or a folder's)
    let payload: [String: Any] = ["pageId": pid, "deckId": scopeId, "results": results.map { ["id": $0.id, "ok": $0.ok] }, "ids": ids]
    let deck = scopeId
    store.saveNow("mapmarks.save", payload) { lib in
      let was = lib.mapMarks[pid] ?? MapMarks(deck: deck, at: 0, n: [:])
      var m = was.after(results, now: now); m.deck = deck
      m.n = m.n.filter { ids.contains($0.key) }
      lib.mapMarks[pid] = m
    }
    UINotificationFeedbackGenerator().notificationOccurred(.success)
  }

  // ---------- cards ----------
  struct CardRow: Identifiable, Equatable {
    var id: String, front: String, back: String, tone: String
    var weak: Bool { tone == "weak" }
  }
  /// The page's cards (web/db.js mapCards): a deck's, or every deck's in the folder, in the library's order, none still waiting for the learner's
  /// review; a fill-in-the-blank card's front with its blanks as ____ and its answers as its back. The sample's on a design screen. Kept until the
  /// library changes (Store.libStamp), so the idea bar and the tones don't work them out again with every frame.
  func deckCards() -> [CardRow] {
    let key = demo ? "demo" : "\(store?.libStamp ?? -1)|" + scope + "|" + scopeId
    if key == rowsKey { return rowsMemo }
    rowsKey = key
    if demo { rowsMemo = MapDemo.sample.cards.map { CardRow(id: $0.id, front: $0.front, back: $0.back, tone: $0.tone) } }
    else if let lib = store?.lib {
      let now = nowMs(), decks = scope == "folder" ? lib.decks.filter { $0.folder == scopeId } : lib.decks.filter { $0.id == scopeId }
      rowsMemo = decks.flatMap { d in lib.cards.filter { $0.deckId == d.id } }.filter { !$0.pending }.map { c in
        let cloze = c.kind == "cloze"
        return CardRow(id: c.id, front: cloze ? Rich.plain(c.text, cloze: true, blank: "____", join: " ", showMath: true) : Rich.plain(c.front, join: " ", showMath: true),
                       back: cloze ? Rich.blanks(c.text, showMath: true).joined(separator: ", ") : Rich.plain(c.back, join: " ", showMath: true), tone: Sched.toneOf(c, now))
      }
    } else { rowsMemo = [] }
    rowsById = Dictionary(rowsMemo.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    return rowsMemo
  }
  private var rowsKey = "", rowsMemo: [CardRow] = [], rowsById: [String: CardRow] = [:]
  func linked(_ id: String) -> [CardRow] { _ = deckCards(); return (tree[id]?.cardIds ?? []).compactMap { rowsById[$0] } }
  /// Link a card: the best matches for what's typed, or for the idea's words (maps.matchCards; no AI).
  func matches(_ id: String) -> [CardRow] {
    let all = deckCards(), have = Set(tree[id]?.cardIds ?? []), q = cardsQuery.trimmingCharacters(in: .whitespaces)
    let ids = MapEngine.shared.matchCards(q.isEmpty ? tree.label(id, title: title) : q, all.map { ["id": $0.id, "front": $0.front, "back": $0.back] })
    var out = ids.filter { !have.contains($0) }.compactMap { rowsById[$0] }
    if !q.isEmpty && out.isEmpty { out = all.filter { !have.contains($0.id) && ($0.front + " " + $0.back).localizedCaseInsensitiveContains(q) } }
    return Array(out.prefix(q.isEmpty ? 3 : 6))
  }
  /// Study these cards: the review set of an idea's branch (or of the ideas given).
  func study(_ ids: [String]) {
    guard !demo, let nav else { return }
    withAnimation(Motion.leave) { sheet = .none }
    nav.full = .reviewSet("page:" + pageId + ":" + ids.joined(separator: ","))
  }
  /// + Card on an idea: the Make a card sheet, its front the idea's words and its back what's under it (or its note).
  func makeCard(_ id: String) {
    guard let i = tree[id] else { return }
    let kids = i.children.compactMap { tree[$0]?.label }.filter { !$0.isEmpty }
    make = (front: tree.label(id, title: title), back: kids.isEmpty ? i.note : kids.map { "- " + $0 }.joined(separator: "\n"), idea: id)
    writing = false
    withAnimation(Motion.sheet) { sheet = .make }
  }
  /// Adds the card to the deck and links it to the idea, in one version.
  func addCard(front: String, back: String) async {
    guard let m = make else { return }
    guard !demo, let store, !deckId.isEmpty else { closeMake(); return }
    guard !front.isEmpty, !back.isEmpty else { store.error = "A card needs a front and a back."; return }
    let r = await store.sent("card.add", ["deckId": deckId, "kind": "basic", "front": front, "back": back])
    guard let ids = r?["ids"] as? [String], let cid = ids.first else { return }
    apply(["op": "link", "id": m.idea, "cardId": cid])
    closeMake()
    store.error = "Made a card from “" + tree.label(m.idea, title: title) + "” and linked it."
  }
  func closeMake() { Keyboard.hide(); withAnimation(Motion.leave) { sheet = .none; make = nil } }
  func closeSheet() { withAnimation(Motion.leave) { sheet = .none }; cardsQuery = "" }
}

// ---------- the design screens' states (design/maps.mjs model, PhonePageMindmap) ----------
enum MapDemo {
  struct Card: Decodable { var id, front, back, tone: String }
  struct Sample: Decodable {
    var title: String, deck: String
    var data: AnyJSON, changed: AnyJSON
    var cards: [Card]
    var marks: [String: [Double]]
  }
  /// Any JSON, kept as its text.
  struct AnyJSON: Decodable {
    var text: String
    init(from d: Decoder) throws {
      let v = try d.singleValueContainer().decode(JSONValue.self)
      text = MapEngine.json(v.any)
    }
  }
  static let sample: Sample = try! JSONDecoder().decode(Sample.self, from: Data(Generated.mapSampleJSON.utf8))
  static let NEW_ID = "nq3k8z2a", MISSED = ["nucleolus", "etc", "rough-er", "smooth-er"]

  /// Puts the page in the board's state; the data it shows.
  @MainActor static func setUp(_ m: MapModel, view: String) -> String {
    let v = view.hasPrefix("Mind map") ? String(view.dropFirst("Mind map".count)).replacingOccurrences(of: " · ", with: "") : "map"
    var data = sample.data.text
    m.title = sample.title
    if v == "changed by your AI" { data = sample.changed.text }
    if v == "new" { data = #"{"root":{"id":"root","label":""}}"#; m.title = "Membrane transport" }
    if v == "writing an idea" { data = MapEngine.shared.edit("mindmap", data, ["op": "add", "id": NEW_ID, "parent": "mito", "label": "ATP synth"]).data }
    let t = MapTree(data)
    let testing = ["testing", "one at a time", "test done"].contains(v)
    if !testing { m.device.folds["er"] = true; for id in t.order where t[id]?.level == 2 && !(t[id]?.children.isEmpty ?? true) { m.device.folds[id] = true } }
    m.device.outline = v == "outline"
    m.device.weak = v == "weak spots"
    m.sel = ["an idea selected": "mito", "writing an idea": NEW_ID, "cards of an idea": "etc", "make a card": "mito", "new": "root"][v] ?? ""
    m.field = t.label(m.sel, title: m.title)
    if v == "writing an idea" { m.writing = true; m.field = "ATP synth" }
    if v == "test me" { m.sheet = .test }
    if v == "cards of an idea" { m.sheet = .cards }
    if v == "make a card", let i = t["mito"] { m.make = (front: i.label, back: i.children.compactMap { t[$0]?.label }.map { "- " + $0 }.joined(separator: "\n"), idea: "mito"); m.sheet = .make }
    if testing {
      let order = MapEngine.shared.testOrder(data, hidden: nil)
      var x = MapModel.Test(); x.order = order; x.show = v == "testing" ? "map" : "one"
      if v == "test done" {
        for id in order { x.marks[id] = MISSED.contains(id) ? "missed" : "knew" }
        m.done = MapModel.Done(knew: order.count - MISSED.count, total: order.count, missed: MISSED); m.sheet = .done
      } else {
        for id in order.prefix(6) { x.marks[id] = id == "nucleolus" ? "missed" : "knew" }
        x.index = 6; x.current = order[6]
        x.hidden = Set(order.dropFirst(v == "testing" ? 7 : 6))
        x.shown = v == "testing"
        m.sel = x.current
      }
      m.test = x
    }
    if v == "changed by your AI" {
      m.changed = Set(MapEngine.shared.added("mindmap", sample.data.text, sample.changed.text))
      m.live = "Claude added \(m.changed.count) ideas · v4"
    }
    return data
  }
  /// The board's camera for the state, once its layout is here (design/maps.mjs F, the phone's).
  @MainActor static func camera(_ m: MapModel, view: String) {
    let v = view.hasPrefix("Mind map") ? String(view.dropFirst("Mind map".count)).replacingOccurrences(of: " · ", with: "") : "map"
    let B = m.boxes, FB = m.framedBoxes, W = m.stage.width, H = m.stage.height
    func kids(_ id: String) -> [String] { B.filter { $0.parent == id }.map(\.id) }
    func parent(_ id: String) -> String { B.first { $0.id == id }?.parent ?? id }
    func sibs(_ id: String) -> [String] { let p = B.first { $0.id == id }?.parent; return B.filter { $0.parent == p && $0.id != id }.map(\.id) }
    let cur = m.test?.current ?? ""
    let A = { (top: Double, h: Double) in MapCamera.Area(x: 0, y: top, w: W, h: h) }
    let c: MapCam
    switch v {
    case "an idea selected": c = MapCamera.shot(B, [["mito"], kids("mito"), ["cell"]], A(0, 468), z: 1.1)
    case "writing an idea": c = MapCamera.shot(B, [[NEW_ID], ["mito"]], A(0, m.writingH), z: 1.1)
    case "cards of an idea": c = MapCamera.shot(B, [["etc"], ["mito"]], A(0, 124), z: 1.1)
    case "make a card": c = MapCamera.shot(B, [["mito"], kids("mito")], A(0, 316), z: 1.1)
    case "testing": c = MapCamera.shot(B, [[cur], [parent(cur)], sibs(cur)], A(0, 542), z: 1.1)
    case "one at a time": c = MapCamera.shot(B, [[cur], [parent(cur)], sibs(cur)], A(0, 532), z: 1.25)
    case "test done": c = MapCamera.shot(B, [["mito"], kids("mito")], A(0, 300), z: 1.04)
    case "changed by your AI": c = MapCamera.shot(B, [["cytoskeleton"], kids("cytoskeleton")], A(76, H - 76), z: 1.1)
    default: c = MapCamera.fit(FB, A(0, m.device.weak ? 470 : H), inset: 16, zmin: 1.04, zmax: 1.25)
    }
    m.cam = c
  }
}

/// A JSON value read with JSONDecoder (for MapDemo's sample), and back as Foundation objects.
enum JSONValue: Decodable {
  case null, bool(Bool), num(Double), str(String), arr([JSONValue]), obj([String: JSONValue])
  init(from d: Decoder) throws {
    let c = try d.singleValueContainer()
    if c.decodeNil() { self = .null } else if let b = try? c.decode(Bool.self) { self = .bool(b) } else if let n = try? c.decode(Double.self) { self = .num(n) }
    else if let s = try? c.decode(String.self) { self = .str(s) } else if let a = try? c.decode([JSONValue].self) { self = .arr(a) } else { self = .obj(try c.decode([String: JSONValue].self)) }
  }
  var any: Any {
    switch self {
    case .null: return NSNull()
    case .bool(let b): return b
    case .num(let n): return n == n.rounded() && abs(n) < 1e15 ? Int(n) as Any : n
    case .str(let s): return s
    case .arr(let a): return a.map(\.any)
    case .obj(let o): return o.mapValues(\.any)
    }
  }
}
