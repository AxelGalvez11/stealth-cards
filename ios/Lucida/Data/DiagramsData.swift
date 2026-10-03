// A deck's Diagrams (web/diagrams.js, ported; the server side is web/diagrams.mjs): the diagrams found in the lecture files its cards were made from, tables and mind maps made from
// its cards and notes, and pictures its owner uploaded. This is what the screens read (`Store.diagramRows`, `DiagramsFlow`) and what they do; the screens are Screens/Diagrams.swift,
// drawn like the canvas's PhoneDeck board (its Diagrams tab, its viewer and the Make diagram sheet). It does exactly the calls the web page does, in the same order:
//   Make diagram   POST api/diagrams/make { deckId, type, scope }  (Redo: { deckId, redo })           one AI step of the day
//   Upload         api/make/upload + the file's bytes, then POST api/diagrams/keep { deckId, upload, name }
//   Make cards     POST api/diagrams/cards { deckId, id } -> the picture as a card's own, and a box over each label: the card editor opens on them
//   Rename, Delete the actions diagram.rename and diagram.delete
// Everything a person sees is Lucida's own (no alert, no confirmation dialog, no system menu): a problem is a line in the sheet or the viewer.
import SwiftUI
import Combine

/// What the Diagrams list shows for one diagram: its name, which group it is in (Made, From your lectures, Uploaded), the line under the name, and its picture's path.
struct DiagramVM: Identifiable, Equatable {
  var info: DiagramInfo
  var id: String { info.id }
  var name: String { info.name.isEmpty ? "Untitled" : info.name }
  var group: String { ["table": "Made", "mindmap": "Made", "lecture": "From your lectures", "upload": "Uploaded"][info.kind] ?? "Made" }
  var picture: String? { info.file.map { "/media/" + $0.name } }
  var line: String { DiagramVM.line(info) }
  static let groups = ["Made", "From your lectures", "Uploaded"]
  static func line(_ g: DiagramInfo) -> String {
    switch g.kind {
    case "table": return "Table · " + plural(g.table?.rows.count ?? 0, "row")
    case "mindmap": return "Mind map · " + plural(g.tree?.count ?? 0, "idea")
    case "lecture":
      let w = [g.src?.at ?? "", g.src?.name ?? ""].filter { !$0.isEmpty }.joined(separator: " · ")
      return w.isEmpty ? "From your lecture" : w
    default:
      guard let f = g.file, f.w > 0 else { return "Uploaded" }
      return "Uploaded · \(f.w) × \(f.h)"
    }
  }
  /// The line over a picture or a made diagram in the viewer ("Slide 4 · Lecture 3 slides · 3 labels").
  var viewerLine: String {
    let base = DiagramVM.line(info)
    guard info.isPicture, let l = info.labels, !l.isEmpty else { return base }
    return base + " · " + plural(l.count, "label")
  }
  /// What the viewer says under the picture or the diagram: where it came from and who sees it.
  func whereLine(can: Bool) -> String {
    switch info.kind {
    case "table", "mindmap":
      guard can else { return "Made from the cards of this deck." }
      var from = "Made from all the cards and notes"
      if let f = info.from, f.kind != "all" { from = "Made from " + (f.kind == "tag" ? "the cards tagged " + f.label : f.label) }
      if info.cards > 0 { return from + " (" + plural(info.cards, "card") + "). Redo writes it again from the cards as they are now." }
      return from + "."
    case "lecture":
      let where_ = [info.src?.name ?? "", info.src?.at ?? ""].filter { !$0.isEmpty }.joined(separator: ", ")
      return "Found in " + where_ + ". Only you see it."
    default: return "Only you see this picture."
    }
  }
  /// The line under a picture's labels: that they are read when cards are made (an uploaded picture), or that none were found.
  var noteLine: String {
    guard info.isPicture else { return "" }
    guard let l = info.labels else { return "Lucida reads the labels in a picture when you make cards from it." }
    return l.isEmpty ? "Lucida couldn’t find any labels in this picture to hide." : ""
  }
}

/// What to make a table or a mind map from: everything, one tag's cards, or one source's.
struct DiagramScope: Equatable { var kind = "all", value = "" }

/// What Make cards prepared for the card editor: the picture as a card's own (a path in the library's storage) and a box over each label.
struct DiagramDraft: Equatable {
  var deckId: String, id: String, image: String, name: String
  var boxes: [OccBox]
}

extension Store {
  /// A deck's diagrams as the list shows them, newest first (a design screen shows the canvas's sample).
  func diagramRows(_ deckId: String) -> [DiagramVM] {
    // (The design screens' empty deck, PhoneDeckEmpty, has none, like its Guide and Sources.)
    (demo ? (props.emptyDeck ? [] : DiagramSample.rows(props.guideState)) : (lib.materials[deckId]?.diagrams ?? []).reversed()).map(DiagramVM.init)
  }
  func diagram(_ deckId: String, _ id: String) -> DiagramVM? { diagramRows(deckId).first { $0.id == id } }
}

@MainActor
final class DiagramsFlow: ObservableObject {
  // ----- Make diagram
  @Published var type = "table"
  @Published var scope = DiagramScope()
  @Published var making = false
  @Published var makeError: MakeErr?
  // ----- the diagram that is open
  /// What is being done to it ("redo", "cards", "rename", "delete"), a line about what went wrong, a rename being typed, a delete being asked, and whether the label boxes show on its picture.
  @Published var busy = ""
  @Published var msg = ""
  @Published var renaming = false
  @Published var draft = ""
  @Published var confirm = false
  @Published var boxes = false
  // ----- Upload
  /// The name of the picture that is going up, and what went wrong with the last one.
  @Published var uploading: String?
  @Published var upError = ""
  /// The deck the upload (or its error) belongs to: another deck's page doesn't show it.
  @Published var upDeck = ""
  /// The deck page's + › Upload diagram: the deck whose Diagrams card asks where the picture is as soon as it shows (the card has the pickers).
  @Published var askUpload = ""
  /// What Make cards prepared, until the card editor takes it.
  var prepared: DiagramDraft?

  private let net = MakeAPI()
  private var run = 0

  /// The sheet always opens on a Table made from everything.
  func openSheet() { type = "table"; scope = DiagramScope(); makeError = nil; making = false }
  /// The Cancel of a sheet that is making: the request goes on (the diagram will be in the list when it is done).
  func closeSheet() { run += 1; making = false; makeError = nil }
  func setScope(_ kind: String, _ value: String) { scope = scope.kind == kind && scope.value == value ? DiagramScope() : DiagramScope(kind: kind, value: value); makeError = nil }
  func resetViewer() { busy = ""; msg = ""; renaming = false; draft = ""; confirm = false; boxes = false }

  private func say(_ e: Error) -> String { ((e as? MakeError)?.message).flatMap { $0.isEmpty ? nil : $0 } ?? ((e as? APIError)?.errorDescription ?? MakeAPI.generic) }
  private func lost(_ s: Store, _ e: Error) -> Bool { if (e as? MakeError)?.signedOut == true || (e as? APIError).map({ if case .signedOut = $0 { return true } else { return false } }) == true { s.phase = .signedOut; return true }; return false }
  private func reload(_ s: Store) async { if let next = try? await s.api.state() { s.accept(next) } }

  /// Makes a table or a mind map. `onDone` gets the new diagram's id (the viewer opens on it).
  func make(_ s: Store, deckId: String, onDone: @escaping (String) -> Void) async {
    guard !making, !s.demo else { return }
    run += 1
    let mine = run
    making = true; makeError = nil
    do {
      let r = try await net.call("api/diagrams/make", ["deckId": deckId, "type": type, "scope": ["kind": scope.kind, "value": scope.value]])
      // (A person who closed the sheet meanwhile still gets the diagram in their list.)
      await reload(s)
      guard mine == run else { return }
      making = false
      Buzz.shared.success("diagram made")
      onDone(r["id"] as? String ?? "")
    } catch {
      if mine != run { await reload(s); return }
      making = false
      if lost(s, error) { return }
      let e = (error as? MakeError) ?? MakeError(message: MakeAPI.generic)
      makeError = MakeErr(message: say(error), pro: e.pro, code: e.code, network: e.network, again: MakeFlow.worthAnotherGo(e))
    }
  }
  /// Redo: the same kind from the same cards, written again (one more AI step of the day).
  func redo(_ s: Store, deckId: String, id: String) async {
    guard busy.isEmpty, !s.demo else { return }
    busy = "redo"; msg = ""
    do { _ = try await net.call("api/diagrams/make", ["deckId": deckId, "redo": id]); await reload(s) }
    catch { if !lost(s, error) { msg = say(error) } }
    busy = ""
  }
  func startRename(_ name: String) { renaming = true; confirm = false; draft = name; msg = "" }
  func cancelRename() { renaming = false; draft = ""; msg = "" }
  func rename(_ s: Store, deckId: String, id: String) async {
    let name = draft.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    guard !s.demo else { return }
    if name.isEmpty { msg = "Give it a name."; return }
    busy = "rename"; msg = ""
    do { try await s.guideAct("diagram.rename", ["deckId": deckId, "id": id, "name": name]); renaming = false; draft = "" }
    catch { if !lost(s, error) { msg = say(error) } }
    busy = ""
  }
  func askDelete() { confirm = true; renaming = false; msg = "" }
  func keep() { confirm = false }
  /// Deletes the diagram (and its picture); true when it is gone, so the viewer can close.
  func remove(_ s: Store, deckId: String, id: String) async -> Bool {
    guard !s.demo else { return false }
    busy = "delete"; msg = ""
    defer { busy = "" }
    do { try await s.guideAct("diagram.delete", ["deckId": deckId, "id": id]); confirm = false; Buzz.shared.light("diagram deleted"); return true }
    catch { if !lost(s, error) { msg = say(error) }; return false }
  }

  /// A picture goes up as a file for making cards does (a small one through the server, a big one straight to storage), then it is kept in the deck. It is made smaller first
  /// (at most 2400 pixels across, so the words in a diagram stay readable), as a JPEG; an iPhone photo (HEIC) is made a JPEG like any other. `name` is what it was called
  /// ("IMG_2058.jpg"; the diagram is named from it). `bytes` reads the picture (off the main thread), nil when it can't.
  func upload(_ s: Store, deckId: String, name: String, bytes: @escaping @Sendable () async -> Data?) async {
    guard uploading == nil, !s.demo else { return }
    uploading = name; upDeck = deckId; upError = ""
    defer { uploading = nil }
    do {
      let jpg = await Task.detached(priority: .userInitiated) { () -> Data? in
        guard let data = await bytes() else { return nil }
        return Upload.jpeg(data, side: Upload.side)
      }.value
      guard let jpg else {
        upError = (name as NSString).pathExtension.lowercased().hasPrefix("hei") ? "That photo is in a format Lucida can’t read (HEIC). Pick a JPEG or PNG picture." : "That isn’t a picture Lucida can show (PNG, JPEG, GIF, or WebP)."
        return
      }
      let base = (name as NSString).deletingPathExtension, file = (base.isEmpty ? "Picture" : base) + ".jpg"
      let to = FileManager.default.temporaryDirectory.appendingPathComponent("lucida-diagram-" + UUID().uuidString + ".jpg")
      try jpg.write(to: to)
      defer { try? FileManager.default.removeItem(at: to) }
      let id = try await net.sendFile(MakeFile(name: file, type: "image/jpeg", size: jpg.count, fam: .image, url: to))
      _ = try await net.call("api/diagrams/keep", ["deckId": deckId, "upload": id, "name": name])
      await reload(s)
      Buzz.shared.light("diagram uploaded")
    } catch { if !lost(s, error) { upError = say(error) } }
  }
  /// A picture picked in Files: read with the permission the picker gave for it.
  func upload(_ s: Store, deckId: String, file url: URL) async {
    await upload(s, deckId: deckId, name: url.lastPathComponent) {
      let ok = url.startAccessingSecurityScopedResource()
      defer { if ok { url.stopAccessingSecurityScopedResource() } }
      return try? Data(contentsOf: url)
    }
  }
  func dismissUploadError() { upError = ""; upDeck = "" }

  /// Make cards: the server makes the picture a card's own and says where each label is (an uploaded picture is read for its labels first); then the card editor opens on
  /// a new Image card with those boxes, to check and move before saving. `open` is called with what was prepared.
  func cards(_ s: Store, deckId: String, id: String, open: @escaping (DiagramDraft) -> Void) async {
    guard busy.isEmpty, !s.demo else { return }
    busy = "cards"; msg = ""
    defer { busy = "" }
    do {
      let r = try await net.call("api/diagrams/cards", ["deckId": deckId, "id": id])
      let boxes = (r["boxes"] as? [[String: Any]] ?? []).compactMap { b -> OccBox? in
        guard let bid = b["id"] as? String else { return nil }
        let n = { (k: String) in (b[k] as? NSNumber)?.doubleValue ?? 0 }
        return OccBox(id: bid, x: n("x"), y: n("y"), w: n("w"), h: n("h"), label: b["label"] as? String ?? "")
      }
      let d = DiagramDraft(deckId: deckId, id: id, image: r["image"] as? String ?? "", name: r["name"] as? String ?? "", boxes: boxes)
      guard !d.image.isEmpty, !boxes.isEmpty else { msg = MakeAPI.generic; return }
      prepared = d
      open(d)
    } catch { if !lost(s, error) { msg = say(error) } }
  }
  /// The editor takes what Make cards prepared (once), for the deck it opens on.
  func takePrepared(_ deckId: String) -> DiagramDraft? { guard let d = prepared, d.deckId == deckId else { return nil }; prepared = nil; return d }
}
