// A deck's Diagrams, end to end in the iPhone app, against a copy of the server on this Mac with made-up people (its lc_dev cookie, which the debug-only `-dev <name>` launch argument
// sets) and the AI stood in for (tests/stub-ai.mjs: the seeing model reads each picture's words and their boxes from the picture's size; DeepSeek writes a table or a mind map from the
// cards it is given). The people come from ios/tests/js/diagrams-seed.mjs, which makes them with the server's own make steps: each owner has a deck with eight cards, the lecture they
// were made from (slides with diagrams: the make finds three), a table and a mind map made from the cards, and an uploaded picture.
//   01  the deck page's Diagrams tab: its count, the three groups, each tile's name and line, Make diagram and Upload; a deck with none says "Nothing here yet"
//   02  a lecture picture opens with its labels (Show boxes draws a box over each); Make cards opens the card editor on a new Image card with a box and an answer for each label, and
//       saving makes a card for each box; deleting the diagram leaves those cards their picture
//   03  Rename (an empty name says so, Cancel keeps the old one) and Delete (it asks first, in the viewer; Keep it keeps it; Delete takes the diagram and its file)
//   04  Make diagram: Table or Mind map, from everything or one tag, with the AI asked the way Explain asks; the table or map opens; Redo writes it again; when the AI fails the sheet
//       says so with Try again, and Try again works; a deck with fewer than three cards is told to add some first
//   05  the Free plan's limit says so plainly, with Go Pro and no Try again; Go Pro opens the paywall
//   06  Upload asks where the picture is in a sheet of Lucida's own; a picture uploaded goes into the Uploaded group; Make cards on it reads its labels first, then opens the editor
//   07  the Make flow offers an Image kind for slides: it starts off, Make cards finds the diagrams, the review shows a picture card for each and says where the diagrams are kept, and
//       adding them makes a card for every label and keeps the diagrams in the deck
//   08  a shared deck's page shows its tables and mind maps (and none of its owner's lecture pictures or uploads); a deck you study has the Diagrams tab with only those, read only
//   09  dark mode; nothing says "AI generated"; and no system dialog, alert or menu opens anywhere
//   10  the deck cover's + (the owner, 2026-10-02: "upload diagram"): Make diagram opens its sheet over the Diagrams tab, Upload diagram asks Photo library or Files in Lucida's
//       own sheet with the Diagrams tab shown; an empty deck's + does the same
// Run it with ios/tools/e2e-diagrams.sh (it starts a fresh server on port 3908 and the stand-in AI on 3909). It only runs when LUCIDA_DIAGRAMS is set, so the other scripts keep running
// their own checks alone.
import XCTest

final class DiagramsTests: AppCase {
  override class var label: String { "Diagrams" }
  override class var switchName: String { "LUCIDA_DIAGRAMS" }
  static let env = ProcessInfo.processInfo.environment
  static var stubURL: String { env["LUCIDA_STUB"] ?? "http://127.0.0.1:3909" }
  static var fixtures: String { env["LUCIDA_FIXTURES"] ?? "" }

  // ---------- the people the seed made ----------
  private lazy var seed: [String: Any] = {
    guard let path = Self.env["LUCIDA_SEED"], let d = FileManager.default.contents(atPath: path) else { return [:] }
    return (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] ?? [:]
  }()
  private func S(_ key: String) -> String { seed[key] as? String ?? "" }
  /// The i-th owner: their name, their deck's name and id, and the ids of what they have.
  private func owner(_ i: Int) -> (who: String, deck: String, id: String, table: String, map: String, upload: String) {
    let o = ((seed["owners"] as? [[String: Any]]) ?? [])[i]
    return (o["name"] as? String ?? "", o["deckName"] as? String ?? "", o["deckId"] as? String ?? "", o["table"] as? String ?? "", o["map"] as? String ?? "", o["upload"] as? String ?? "")
  }

  // ---------- helpers ----------
  private func fx(_ name: String) -> String { Self.fixtures + "/" + name }
  private func diagramsOf(_ who: String, _ deckId: String) -> [[String: Any]] {
    ((state(who)["decks"] as? [[String: Any]] ?? []).first { $0["id"] as? String == deckId }?["diagrams"] as? [[String: Any]]) ?? []
  }
  private func diagram(_ who: String, _ deckId: String, named: String) -> [String: Any]? { diagramsOf(who, deckId).first { $0["name"] as? String == named } }
  private func cardsOf(_ who: String, _ deckId: String) -> [[String: Any]] { (state(who)["cards"] as? [[String: Any]] ?? []).filter { $0["deckId"] as? String == deckId } }
  private func media(_ who: String, _ path: String) -> Int {
    var r = URLRequest(url: URL(string: Self.server + (path.hasPrefix("/") ? path : "/media/" + path))!)
    r.setValue("lc_dev=" + who, forHTTPHeaderField: "Cookie")
    let done = DispatchSemaphore(value: 0)
    var status = 0
    URLSession.shared.dataTask(with: r) { _, resp, _ in status = (resp as? HTTPURLResponse)?.statusCode ?? 0; done.signal() }.resume()
    _ = done.wait(timeout: .now() + 30)
    return status
  }
  /// What the stand-in AI was asked, in order (each with what was wrong with the request, if anything).
  private func stubLog() -> [[String: Any]] { (api("", "GET", "/__log", base: Self.stubURL).json as? [[String: Any]]) ?? [] }
  private func stubReset() { api("", "POST", "/__reset", base: Self.stubURL) }
  private func stubFlags(_ f: [String: Any]) { api("", "POST", "/__flags", f, base: Self.stubURL) }
  private func textHas(_ app: XCUIApplication, _ words: String) -> XCUIElement { app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", words)).firstMatch }
  /// A made-up person with a deck of `n` cards.
  @discardableResult
  private func person(_ who: String, deck name: String, cards n: Int = 4) -> String {
    act(who, "settings.update", ["patch": ["welcomed": true]])
    let id = act(who, "deck.add", ["name": name])["id"] as? String ?? ""
    for i in 0..<n { act(who, "card.add", ["deckId": id, "kind": "basic", "front": "Question \(i + 1) of \(name)?", "back": "Answer \(i + 1)", "tags": i < 2 ? ["parts"] : []]) }
    return id
  }
  /// Nothing the phone or Google makes opens: no alert, no confirmation dialog, no action sheet, no menu.
  private func noSystemUI(_ app: XCUIApplication, _ where_: String) {
    check(app.alerts.count == 0 && app.sheets.count == 0 && app.popovers.count == 0 && app.menus.count == 0, where_ + ": no system alert, dialog or menu is open")
  }
  /// Nothing on screen says anything is "AI generated": the owner doesn't want that label anywhere.
  private func noLabel(_ app: XCUIApplication, _ where_: String) {
    let bad = app.descendants(matching: .any).matching(NSPredicate(format: "label MATCHES[c] %@", ".*(ai[- ]generated|generated (by|with) ai|made with ai|madewithai|aigc).*")).count
    check(bad == 0, where_ + ": nothing says “AI generated”")
  }
  private func selected(_ e: XCUIElement) -> Bool { e.isSelected }
  /// Opens a deck on its Diagrams tab.
  private func openTab(_ who: String, _ deck: String, extra: [String] = []) -> XCUIApplication {
    let app = launch(as: who, ["-open", "deck:" + deck, "-deckTab", "diagrams"] + extra)
    check(wait(text(app, "DIAGRAMS")), "the Diagrams tab opens")
    return app
  }
  /// A tile of the list, brought on screen (the page is long).
  private func tile(_ app: XCUIApplication, _ name: String) -> XCUIElement {
    let t = button(app, "Open " + name)
    _ = wait(t, 15)
    scrollTo(app, t, max: 10)
    Thread.sleep(forTimeInterval: 0.8)
    return t
  }
  private func openDiagram(_ app: XCUIApplication, _ name: String) {
    tap(tile(app, name), "the tile " + name)
    check(wait(button(app, "Close")), "“" + name + "” opens")
  }

  // ---------- 01: the tab ----------
  func test01Tab() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let o = owner(0)
    let app = launch(as: o.who, ["-open", "deck:" + o.deck])
    check(wait(button(app, "Diagrams")) && diagramsOf(o.who, o.id).count == 6, "the deck page has a Diagrams tab (no count: the owner, 2026-10-02), for its six diagrams")
    check(button(app, "Notes").exists && buttonStarting(app, "Sources").exists && buttonStarting(app, "Cards").exists, "beside Cards, Notes and Sources")
    check(selected(buttonStarting(app, "Cards")) && !selected(buttonStarting(app, "Diagrams")), "the page opens on Cards")
    tap(buttonStarting(app, "Diagrams"), "Diagrams")
    check(wait(text(app, "DIAGRAMS")) && selected(buttonStarting(app, "Diagrams")), "pressing the tab opens it")
    check(wait(button(app, "Make diagram")) && button(app, "Upload").exists, "its card has Make diagram and Upload")
    check(text(app, "MADE").exists && text(app, "FROM YOUR LECTURES").exists, "the diagrams are in groups: Made, From your lectures")
    snap("diagrams-tab")
    let cell = tile(app, "Animal cell")
    check(cell.exists && (cell.value as? String ?? "") == "Slide 1 · Lecture 3 slides", "a lecture picture is a tile named for the picture, with its slide and file (\(cell.value as? String ?? "?"))")
    check(tile(app, "The Krebs cycle").exists && tile(app, "Enzyme reaction rates").exists, "all three diagrams the make found are there")
    let table = button(app, "Open Stub table of " + o.deck)
    check(table.exists && (table.value as? String ?? "").range(of: #"^Table · \d+ rows$"#, options: .regularExpression) != nil, "a made table says how many rows it has (\(table.value as? String ?? "?"))")
    let map = button(app, "Open Stub map of " + o.deck)
    check(map.exists && (map.value as? String ?? "").range(of: #"^Mind map · \d+ ideas$"#, options: .regularExpression) != nil, "and a mind map how many ideas (\(map.value as? String ?? "?"))")
    let up = button(app, "Open Whiteboard map")
    scrollTo(app, up, max: 10)
    check(text(app, "UPLOADED").exists, "uploaded pictures have their own group")
    check(up.exists && ((up.value as? String) ?? "").hasPrefix("Uploaded · 660 × 440"), "an uploaded picture says its size (\(up.value as? String ?? "?"))")
    noSystemUI(app, "the Diagrams tab")
    noLabel(app, "the Diagrams tab")
    // the tab keeps its number when the deck page is opened again, and a deck with no diagrams says so
    let e = launch(as: S("empty"), ["-open", "deck:" + S("emptyDeckName"), "-deckTab", "diagrams"])
    check(wait(text(e, "Nothing here yet")) && button(e, "Make diagram").exists && button(e, "Upload").exists, "a deck with none says “Nothing here yet”, and its owner can make or upload one")
    // (One plain line and the buttons, no paragraph about what diagrams are for: the owner's rule of no tips.)
    check(selected(buttonStarting(e, "Diagrams")) && !textHas(e, "turn their labels into picture cards").exists && !textHas(e, "kept here").exists, "and nothing more (no paragraph about them)")
    snap("diagrams-none")
  }

  // ---------- 02: a lecture picture, and Make cards ----------
  func test02PictureAndMakeCards() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let o = owner(1)
    let app = openTab(o.who, o.deck)
    openDiagram(app, "Animal cell")
    check(wait(text(app, "Animal cell")) && wait(text(app, "Slide 1 · Lecture 3 slides · 5 labels")), "it opens with its name, where it is from and how many labels it has")
    check(app.images["Animal cell"].exists, "the picture is shown")
    check(text(app, "5 LABELS").exists && text(app, "Nucleus").exists && text(app, "Golgi apparatus").exists, "with the words that are written in it")
    check(any(app, "Found in Lecture 3 slides, Slide 1. Only you see it.").exists, "and says it is only yours")
    check(button(app, "Show boxes").exists && !button(app, "Hide boxes").exists, "the boxes are off to start with")
    tap(button(app, "Show boxes"), "Show boxes")
    check(wait(button(app, "Hide boxes")), "Show boxes turns them on (the button says Hide boxes)")
    snap("diagram-picture")
    check(button(app, "Make cards").exists && button(app, "Rename").exists && button(app, "Delete").exists && !button(app, "Redo").exists, "a picture can be made into cards, renamed or deleted (no Redo: it was not made)")
    let before = cardsOf(o.who, o.id).count
    tap(button(app, "Make cards"), "Make cards")
    check(wait(text(app, "New card"), 30), "Make cards opens the card editor")
    check(selected(button(app, "Image")), "on a new Image card")
    let names = ["Nucleus", "Mitochondrion", "Golgi apparatus"]
    var found = 0
    for i in 1...5 { let f = app.textFields["What’s under box \(i)"]; if f.waitForExistence(timeout: 8), !((f.value as? String) ?? "").isEmpty { found += 1 } }
    check(found == 5, "with a box and an answer for each of the five labels (\(found) answers)")
    check(app.textFields.matching(NSPredicate(format: "value IN %@", names)).count >= 3, "each answer is the label that was written there")
    snap("make-cards-editor")
    tap(button(app, "Save"), "Save")
    check(eventually { self.cardsOf(o.who, o.id).filter { $0["kind"] as? String == "image" }.count == 5 }, "saving makes a card for each box (five Image cards in the deck)")
    check(cardsOf(o.who, o.id).count == before + 5, "and nothing else")
    let image = (cardsOf(o.who, o.id).first { $0["kind"] as? String == "image" }?["image"] as? String) ?? ""
    check(image.hasPrefix("/media/m") && media(o.who, image) == 200, "the cards’ picture is a copy of their own (\(image))")
    // deleting the diagram leaves the cards their picture
    let app2 = openTab(o.who, o.deck)
    openDiagram(app2, "Animal cell")
    tap(button(app2, "Delete"), "Delete")
    tap(app2.buttons["Delete"].firstMatch, "the question’s Delete")
    check(eventually { self.diagram(o.who, o.id, named: "Animal cell") == nil }, "deleting the diagram takes it away")
    check(media(o.who, image) == 200, "and the cards made from it keep their picture")
    noSystemUI(app2, "Make cards and Delete")
  }

  // ---------- 03: Rename and Delete ----------
  func test03RenameAndDelete() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let o = owner(2)
    let app = openTab(o.who, o.deck)
    openDiagram(app, "Enzyme reaction rates")
    tap(button(app, "Rename"), "Rename")
    let name = app.textFields["Name"]
    check(wait(name) && ((name.value as? String) ?? "") == "Enzyme reaction rates" && button(app, "Save").exists && button(app, "Cancel").exists, "Rename shows a field with the name, with Save and Cancel (Lucida’s own, in the viewer)")
    typeInto(name, "Reaction rates, chart", clear: 24)
    snap("diagram-renaming")
    tap(button(app, "Save"), "Save")
    check(wait(text(app, "Reaction rates, chart")), "Save puts the new name on the viewer")
    check(eventually { (self.diagram(o.who, o.id, named: "Reaction rates, chart")?["named"] as? Bool) == true }, "and on the server")
    // an empty name says so, Cancel keeps the old one
    tap(button(app, "Rename"), "Rename")
    typeInto(app.textFields["Name"], "", clear: 30)
    tap(button(app, "Save"), "Save")
    check(wait(text(app, "Give it a name.")), "an empty name says “Give it a name.”")
    tap(button(app, "Cancel"), "Cancel")
    check(gone(app.textFields["Name"]) && text(app, "Reaction rates, chart").exists && diagram(o.who, o.id, named: "Reaction rates, chart") != nil, "Cancel keeps the name it had")
    // Delete asks first, in the viewer
    tap(button(app, "Delete"), "Delete")
    check(wait(text(app, "Delete “Reaction rates, chart”?")) && any(app, "Its picture goes. Cards made from it keep their own picture.").exists, "Delete asks first, in words of its own")
    check(button(app, "Keep it").exists && app.buttons["Delete"].exists && !button(app, "Rename").exists, "with Keep it and Delete (the other buttons give way)")
    snap("diagram-delete-asked")
    tap(button(app, "Keep it"), "Keep it")
    check(gone(text(app, "Delete “Reaction rates, chart”?")) && diagram(o.who, o.id, named: "Reaction rates, chart") != nil && button(app, "Rename").exists, "Keep it keeps the diagram")
    noSystemUI(app, "Delete asking")
    let file = ((diagram(o.who, o.id, named: "Reaction rates, chart")?["file"] as? [String: Any])?["name"] as? String) ?? ""
    check(!file.isEmpty && media(o.who, file) == 200, "its picture is kept (\(file))")
    tap(button(app, "Delete"), "Delete")
    tap(app.buttons["Delete"].firstMatch, "the question’s Delete")
    check(eventually { self.diagram(o.who, o.id, named: "Reaction rates, chart") == nil }, "Delete takes the diagram away")
    check(eventually { self.media(o.who, file) == 404 }, "and its picture")
    check(gone(button(app, "Rename")) && gone(app.buttons["Open Reaction rates, chart"]), "the viewer closes and the list lost it")
    check(wait(buttonStarting(app, "Diagrams 5")), "the tab counts one less (5)")
    noSystemUI(app, "Rename and Delete")
  }

  // ---------- 04: Make diagram ----------
  func test04MakeDiagram() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let o = owner(3)
    stubReset()
    let app = openTab(o.who, o.deck)
    tap(button(app, "Make diagram"), "Make diagram")
    check(wait(text(app, "Make a")) && text(app, "From").exists, "Make diagram opens a sheet: Make a, From")
    check(selected(button(app, "Table")) && !selected(button(app, "Mind map")) && button(app, "Make table").exists, "it starts on Table")
    check(selected(button(app, "All cards and notes")), "made from all the cards and notes")
    check(button(app, "cell").exists && button(app, "Lecture 3 slides").exists, "with a chip for each tag and each source (cell, Lecture 3 slides)")
    check(text(app, "Lucida reads every card and your notes.").exists, "and says what it will read")
    snap("make-diagram-sheet")
    tap(button(app, "Mind map"), "Mind map")
    check(wait(button(app, "Make mind map")) && selected(button(app, "Mind map")), "Mind map changes the button to Make mind map")
    tap(button(app, "cell"), "the tag cell")
    check(wait(text(app, "Only the cards tagged cell.")) && selected(button(app, "cell")) && !selected(button(app, "All cards and notes")), "a tag narrows it to that tag’s cards")
    tap(button(app, "cell"), "the tag cell again")
    check(wait(text(app, "Lucida reads every card and your notes.")) && selected(button(app, "All cards and notes")), "pressing it again goes back to all of them")
    tap(button(app, "Lecture 3 slides"), "the source")
    check(wait(text(app, "Only the cards made from this source.")), "a source narrows it to that source’s cards")
    tap(button(app, "cell"), "the tag cell")
    stubFlags(["delay": 3500])
    tap(button(app, "Make mind map"), "Make mind map")
    check(wait(text(app, "Drawing your mind map")) && button(app, "Cancel").exists, "while it is made the sheet says so, with a way out")
    snap("making-diagram")
    check(wait(button(app, "Redo"), 40) && textHas(app, "Mind map ·").exists, "the mind map opens when it is done")
    stubFlags(["delay": 0])
    let maps = diagramsOf(o.who, o.id).filter { $0["kind"] as? String == "mindmap" }
    check(maps.count == 2 && maps.contains { ($0["from"] as? [String: Any])?["kind"] as? String == "tag" && ($0["from"] as? [String: Any])?["value"] as? String == "cell" }, "the server has it, made from the cell tag (two mind maps now)")
    check(any(app, "Made from the cards tagged cell").exists, "and the viewer says what it was made from")
    snap("diagram-map")
    var asked = stubLog().filter { $0["dg"] as? String == "mindmap" }
    check(asked.count == 1 && (asked.first?["problems"] as? [Any])?.isEmpty == true && asked.first?["careful"] as? Bool == true, "the AI was asked once, with Explain’s settings (\(asked.count) ask, problems: \((asked.first?["problems"] as? [Any])?.count ?? -1))")
    // Redo writes it again
    let id = (maps.first { ($0["from"] as? [String: Any])?["kind"] as? String == "tag" }?["id"] as? String) ?? ""
    tap(button(app, "Redo"), "Redo")
    check(eventually { self.stubLog().filter { $0["dg"] as? String == "mindmap" }.count == 2 }, "Redo asks the AI again")
    asked = stubLog().filter { $0["dg"] as? String == "mindmap" }
    check(diagramsOf(o.who, o.id).filter { $0["kind"] as? String == "mindmap" }.count == 2 && diagramsOf(o.who, o.id).contains { $0["id"] as? String == id }, "and writes it over the same diagram (still two, the same id)")
    check(wait(button(app, "Redo")), "the viewer comes back from “Making it again…”")
    tap(button(app, "Close"), "Close")
    // the AI fails: the sheet says so, Try again works
    stubFlags(["dgFail": 500])
    tap(button(app, "Make diagram"), "Make diagram")
    check(wait(button(app, "Make table")), "the sheet opens fresh (on a Table from everything, not on what was picked last)")
    tap(button(app, "Make table"), "Make table")
    check(wait(button(app, "Try again"), 40) && button(app, "Back").exists && !button(app, "Go Pro").exists, "when the AI fails the sheet says so, with Back and Try again (no Go Pro)")
    snap("make-diagram-error")
    stubFlags(["dgFail": 0])
    tap(button(app, "Try again"), "Try again")
    check(wait(button(app, "Redo"), 40) && textHas(app, "Table ·").exists, "Try again works: the table opens")
    snap("diagram-table")
    check(diagramsOf(o.who, o.id).filter { $0["kind"] as? String == "table" }.count == 2, "and there are two tables")
    // (Every careful ask has Explain's settings; when it gets no answer, V4 Flash is asked plainly, as Explain does, so those asks carry no host settings at all.)
    let all = stubLog().filter { $0["dg"] as? String == "table" || $0["dg"] as? String == "mindmap" }, careful = all.filter { $0["careful"] as? Bool == true }
    check(careful.count >= 4 && careful.allSatisfy { ($0["problems"] as? [Any])?.isEmpty == true }, "every careful ask was in order (\(careful.count) of \(all.count): the model, its fallback, the privacy settings, no thinking, a schema)")
    noSystemUI(app, "Make diagram")
    // a deck with fewer than three cards
    let few = "dgfew" + run
    let deck = person(few, deck: "Tiny deck " + run, cards: 2)
    let app2 = launch(as: few, ["-open", "deck:Tiny deck " + run, "-deckTab", "diagrams"])
    tap(button(app2, "Make diagram"), "Make diagram")
    check(wait(text(app2, "Add a few cards first: Lucida needs something to make a table from.")), "a deck with two cards is told to add a few first")
    tap(button(app2, "Make table"), "Make table")
    Thread.sleep(forTimeInterval: 1.5)
    check(diagramsOf(few, deck).isEmpty && !any(app2, "Writing your table").exists, "and nothing is asked of the AI")
  }

  // ---------- 05: the Free plan's limit ----------
  func test05FreeLimit() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "freedg" + run, name = "Free deck " + run
    let deck = person(who, deck: name, cards: 5)
    for _ in 0..<3 { _ = api(who, "POST", "/api/diagrams/make", ["deckId": deck, "type": "table"]) }
    check(diagramsOf(who, deck).count == 3, "setup: a Free person made their three diagrams of the day")
    let app = launch(as: who, ["-open", "deck:" + name, "-deckTab", "diagrams"])
    tap(button(app, "Make diagram"), "Make diagram")
    tap(button(app, "Make table"), "Make table")
    check(wait(text(app, "That’s today’s 3 free diagrams. Go Pro for 30 a day."), 30), "the fourth says it is today’s three, in plain words")
    check(button(app, "Go Pro").exists && button(app, "Back").exists && !button(app, "Try again").exists, "with Go Pro and Back, and no Try again (it would say the same)")
    snap("make-diagram-limit")
    tap(button(app, "Go Pro"), "Go Pro")
    check(wait(text(app, "Make Lucida yours.")), "Go Pro opens the paywall")
    check(diagramsOf(who, deck).count == 3, "and nothing more was made")
    noSystemUI(app, "the limit")
  }

  // ---------- 06: Upload ----------
  func test06Upload() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let o = owner(4)
    stubReset()
    let app = openTab(o.who, o.deck)
    tap(button(app, "Upload"), "Upload")
    check(wait(text(app, "Upload a picture")) && wait(button(app, "Photo library, A photo or a screenshot")) && button(app, "Files, A picture saved on this iPhone").exists, "Upload asks where the picture is, in a sheet of Lucida’s own (Photo library, Files)")
    snap("upload-chooser")
    noSystemUI(app, "Upload’s sheet")
    tap(button(app, "Close"), "Close")
    check(gone(text(app, "Upload a picture")), "its X closes it")
    // a picture goes up (the simulator has no photos to pick, so the app is handed the file as the picker would hand it)
    let app2 = launch(as: o.who, ["-open", "deck:" + o.deck, "-deckTab", "diagrams", "-diagramUpload", fx("whiteboard-map.png")])
    check(tile(app2, "whiteboard-map").exists, "the picture appears in the list, named for its file")
    check(eventually { self.diagram(o.who, o.id, named: "whiteboard-map") != nil }, "and on the server")
    let g = diagram(o.who, o.id, named: "whiteboard-map")
    check((g?["kind"] as? String) == "upload" && g?["labels"] is NSNull && ((g?["file"] as? [String: Any])?["w"] as? Int) == 660, "as an upload, 660 pixels wide, not read yet")
    check(diagramsOf(o.who, o.id).filter { $0["kind"] as? String == "upload" }.count == 2, "two uploaded pictures now")
    snap("upload-tile")
    check(stubLog().filter { $0["dg"] as? String == "see" }.isEmpty, "nothing was sent to the AI just for uploading")
    tap(tile(app2, "whiteboard-map"), "the new tile")
    check(wait(button(app2, "Close")) && wait(text(app2, "Lucida reads the labels in a picture when you make cards from it.")), "it opens, and says its labels are read when cards are made from it")
    check(button(app2, "Make cards").exists && !button(app2, "Show boxes").exists, "with Make cards")
    snap("upload-open")
    tap(button(app2, "Make cards"), "Make cards")
    check(wait(text(app2, "New card"), 40), "Make cards reads the labels, then opens the card editor")
    check(app2.textFields["What’s under box 3"].waitForExistence(timeout: 8), "with a box for each of the three labels it found")
    check(stubLog().filter { $0["dg"] as? String == "see" }.count == 1, "that was one look at the picture")
    check(eventually { (self.diagram(o.who, o.id, named: "whiteboard-map")?["labels"] as? [Any])?.count == 3 }, "and the diagram keeps its labels now")
    tap(button(app2, "Cancel"), "Cancel")
    noSystemUI(app2, "Upload")
  }

  // ---------- 07: the Image kind in Make cards ----------
  func test07ImageKind() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let who = "dgimg" + run, name = "Image deck " + run
    let deck = person(who, deck: name, cards: 3)
    stubReset()
    let app = launch(as: who, ["-open", "deck:" + name, "-makeFile", fx("lecture-diagrams.pptx"), "-makeRoute", "deck=" + deck])
    check(wait(text(app, "Upload")) && wait(text(app, "lecture-diagrams.pptx")), "Make cards opens with the slides listed")
    check(wait(button(app, "Image")) && button(app, "Basic").exists && button(app, "Fill in the blank").exists, "the Kinds offer Image beside Basic and Fill in the blank")
    check(!selected(button(app, "Image")), "it starts off")
    tap(button(app, "Image"), "Image")
    check(selected(button(app, "Image")) && wait(text(app, "A card for each label of the diagrams in it, with the label hidden.")), "pressing it turns it on, and says what it makes")
    snap("make-image-kind")
    tap(button(app, "Make cards"), "Make cards")
    check(wait(textHas(app, "diagrams found"), 90), "the review says how many diagrams it found")
    check(any(app, "3 diagrams found. They are kept in the deck’s Diagrams tab.").exists, "and where they are kept")
    check(wait(text(app, "Animal cell")) && any(app, "5 cards, one for each label").exists, "a picture card for each diagram, with how many cards it makes")
    check(app.buttons.matching(NSPredicate(format: "label MATCHES %@", #"Add \d+ cards to .*"#)).count == 1, "the Add button counts a card for each label")
    snap("make-image-review")
    let add = app.buttons.matching(NSPredicate(format: "label MATCHES %@", #"Add \d+ cards to .*"#)).firstMatch
    tap(add, "Add")
    check(eventually(30) { self.cardsOf(who, deck).filter { $0["kind"] as? String == "image" }.count == 18 }, "adding makes a card for every label: 5 + 9 + 4 = 18 picture cards")
    check(eventually { self.diagramsOf(who, deck).filter { $0["kind"] as? String == "lecture" }.count == 3 }, "and the three diagrams are kept in the deck")
    check(wait(buttonStarting(app, "Diagrams 3"), 30), "the deck page counts them")
    let log = stubLog().filter { $0["dg"] as? String == "see" }
    check(!log.isEmpty && log.allSatisfy { ($0["problems"] as? [Any])?.isEmpty == true && ($0["model"] as? String ?? "").contains("gemini") }, "the pictures were looked at by the seeing model, and the asks were in order")
    noSystemUI(app, "the Image kind")
  }

  // ---------- 08: a shared deck, and a deck you study ----------
  func test08SharedAndStudied() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let sharer = (seed["sharer"] as? [String: Any]) ?? [:], deckName = sharer["deckName"] as? String ?? ""
    let app = launch(as: S("newcomer"), ["-open", "deckpage:/d/" + S("sharedId")])
    check(wait(text(app, deckName), 20), "the shared deck’s page opens")
    let table = button(app, "Open Stub table of " + deckName), map = button(app, "Open Stub map of " + deckName)
    scrollTo(app, table, max: 10)
    check(wait(text(app, "DIAGRAMS")) && table.exists && map.exists, "it has a Diagrams card with the table and the mind map made from its cards")
    check(!any(app, "Animal cell").exists && !any(app, "Whiteboard map").exists && !any(app, "Lecture 3 slides").exists, "and none of its owner’s lecture pictures, uploads or file names")
    snap("public-diagrams")
    tap(table, "the table")
    check(wait(button(app, "Close")) && wait(any(app, ". Meaning: ")), "the table opens in a sheet (each row reads its heading, “Meaning: …”)")
    check(!button(app, "Rename").exists && !button(app, "Delete").exists && !button(app, "Redo").exists && !button(app, "Make cards").exists, "with nothing to change")
    snap("public-table")
    tap(button(app, "Close"), "Close")
    scrollTo(app, map, max: 10)
    tap(map, "the mind map")
    check(wait(button(app, "Close")) && wait(textHas(app, "Mind map ·")), "the mind map opens too")
    snap("public-map")
    tap(button(app, "Close"), "Close")
    noSystemUI(app, "the shared deck’s page")
    // the person who studies it
    let st = launch(as: S("studier"), ["-open", "deck:" + S("studiedDeckName")])
    check(wait(buttonStarting(st, "Diagrams 2")) && !buttonStarting(st, "Sources").exists, "a deck you study has a Diagrams tab with the two made ones, and no Sources")
    tap(buttonStarting(st, "Diagrams"), "Diagrams")
    check(wait(text(st, "DIAGRAMS")) && !button(st, "Make diagram").exists && !button(st, "Upload").exists, "its card has no Make diagram and no Upload")
    check(button(st, "Open Stub table of " + deckName).exists && button(st, "Open Stub map of " + deckName).exists && !any(st, "Animal cell").exists, "only the table and the map are in it")
    snap("studied-diagrams")
    tap(button(st, "Open Stub table of " + deckName), "the table")
    check(wait(button(st, "Close")) && wait(any(st, ". Meaning: ")), "the table opens")
    check(!button(st, "Rename").exists && !button(st, "Delete").exists && !button(st, "Redo").exists && any(st, "Made from the cards of this deck.").exists, "with nothing to change, and a line saying where it came from")
    noSystemUI(st, "a deck you study")
  }

  // ---------- 09: dark mode ----------
  func test09Dark() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let o = owner(5)
    act(o.who, "settings.update", ["patch": ["look": "dark"]])
    let app = openTab(o.who, o.deck)
    check(wait(button(app, "Make diagram")), "in dark mode the tab shows")
    snap("dark-diagrams")
    openDiagram(app, "Animal cell")
    tap(button(app, "Show boxes"), "Show boxes")
    check(wait(button(app, "Hide boxes")), "and a picture opens with its boxes")
    snap("dark-picture")
    tap(button(app, "Close"), "Close")
    tap(button(app, "Open Stub table of " + o.deck), "the table")
    check(wait(button(app, "Redo")), "and a table")
    snap("dark-table")
    tap(button(app, "Close"), "Close")
    tap(button(app, "Open Stub map of " + o.deck), "the mind map")
    check(wait(button(app, "Redo")), "and a mind map")
    snap("dark-map")
    noLabel(app, "dark mode")
    noSystemUI(app, "dark mode")
  }

  // ---------- 10: the deck cover's + ----------
  func test10DeckPlus() throws {
    try XCTSkipIf(api("x", "GET", "/api/rev").status != 200, "No server at " + Self.server)
    let o = owner(0)
    let app = launch(as: o.who, ["-open", "deck:" + o.deck])
    check(wait(deckButton(app, "Add")) && selected(buttonStarting(app, "Cards")), "the deck page opens on Cards, with its +")
    fromDeckMenu(app, "Add", "Make diagram")
    check(wait(text(app, "Make a")) && text(app, "From").exists && button(app, "Make table").exists, "+ › Make diagram opens the Make diagram sheet")
    noSystemUI(app, "+ › Make diagram")
    snap("deck-plus-make-diagram")
    tap(button(app, "Cancel"), "Cancel")
    check(gone(text(app, "Make a")) && wait(text(app, "DIAGRAMS")) && selected(buttonStarting(app, "Diagrams")), "it is over the Diagrams tab, which stays when it closes")
    tap(buttonStarting(app, "Cards"), "Cards")
    fromDeckMenu(app, "Add", "Upload diagram")
    check(wait(text(app, "Upload a picture")) && wait(button(app, "Photo library, A photo or a screenshot")) && button(app, "Files, A picture saved on this iPhone").exists,
          "+ › Upload diagram asks where the picture is, in Lucida’s own sheet (Photo library, Files)")
    noSystemUI(app, "+ › Upload diagram")
    snap("deck-plus-upload")
    tap(button(app, "Close"), "Close")
    check(gone(text(app, "Upload a picture")) && selected(buttonStarting(app, "Diagrams")), "with the Diagrams tab shown, where the picture goes")
    // an empty deck's + does the same
    let empty = "Nothing yet " + run
    act(o.who, "deck.add", ["name": empty])
    let e = launch(as: o.who, ["-open", "deck:" + empty])
    check(wait(text(e, "No cards yet")) && wait(deckButton(e, "Add")) && !deckButton(e, "Study").exists, "an empty deck: its + and no Study")
    fromDeckMenu(e, "Add", "Upload diagram")
    check(wait(text(e, "Upload a picture")) && wait(button(e, "Photo library, A photo or a screenshot")), "its + › Upload diagram asks where the picture is")
    tap(button(e, "Close"), "Close")
    check(gone(text(e, "Upload a picture")) && wait(text(e, "DIAGRAMS")) && selected(buttonStarting(e, "Diagrams")), "over its Diagrams tab")
    noSystemUI(e, "an empty deck’s +")
  }
}
