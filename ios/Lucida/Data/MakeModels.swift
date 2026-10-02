// What the library says about making cards (web/make.mjs makeInfo, and what a deck keeps of what it was made from and of its Guide, web/store.mjs
// deck.sources and deck.guide): plain data, read from /api/state by Library (Models.swift). Data/MakeData.swift is the flow itself. These sit in a
// file of their own because Models.swift needs them, and the checks in ios/tests that compile Models.swift on its own (parity, sync-check) have no
// room for the flow's client, the recorder, and the rest of what it needs.
import Foundation

// ---------- what the library says ----------
/// What making cards can do for this person (the library's `make`, web/make.mjs makeInfo): the limits of their plan.
struct MakeInfo: Decodable, Equatable {
  var on = false, video = false
  var perDay = 3, pages = 30, minutes = 15, photos = 10, fileMB = 20, audioMB = 25, cards = 100
  /// How many extra pages a deck's Guide may have (web/plans.mjs GUIDE.pages): a deck that has them all has no room for the notes drafted with new cards.
  var guidePages = 10
  /// Diagrams (web/plans.mjs DIAGRAMS): how many pictures of a file the AI looks at in one make, how many tables, mind maps and picture readings it does in a day, how many
  /// diagrams a deck keeps, and how many picture cards one make offers.
  var figures = 8, diagrams = 3, diagramsKeep = 30, imageCards = 60
  enum CodingKeys: String, CodingKey { case on, video, perDay, pages, minutes, photos, fileMB, audioMB, cards, guidePages, figures, diagrams, diagramsKeep, imageCards }
  init() {}
  init(on: Bool, video: Bool, perDay: Int, pages: Int, minutes: Int, photos: Int, fileMB: Int, audioMB: Int = 25, cards: Int = 100, guidePages: Int = 10, figures: Int = 8, diagrams: Int = 3, diagramsKeep: Int = 30, imageCards: Int = 60) {
    self.on = on; self.video = video; self.perDay = perDay; self.pages = pages; self.minutes = minutes; self.photos = photos; self.fileMB = fileMB; self.audioMB = audioMB; self.cards = cards
    self.guidePages = guidePages; self.figures = figures; self.diagrams = diagrams; self.diagramsKeep = diagramsKeep; self.imageCards = imageCards
  }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    on = c.v(.on, false); video = c.v(.video, false); perDay = c.v(.perDay, 3); pages = c.v(.pages, 30); minutes = c.v(.minutes, 15)
    photos = c.v(.photos, 10); fileMB = c.v(.fileMB, 20); audioMB = c.v(.audioMB, 25); cards = c.v(.cards, 100); guidePages = c.v(.guidePages, 10)
    figures = c.v(.figures, 8); diagrams = c.v(.diagrams, 3); diagramsKeep = c.v(.diagramsKeep, 30); imageCards = c.v(.imageCards, 60)
  }
  /// The canvas's Pro person (the design screens' limits), and its Free one.
  static let pro = MakeInfo(on: true, video: true, perDay: 30, pages: 300, minutes: 120, photos: 50, fileMB: 40, figures: 40, diagrams: 30, diagramsKeep: 200)
  static let free = MakeInfo(on: true, video: true, perDay: 3, pages: 30, minutes: 15, photos: 10, fileMB: 20)
}

/// What a deck keeps of what it was made from, and of its Guide (web/store.mjs deck.sources and deck.guide), as /api/state gives them with the decks:
/// enough to make more cards from a source or a Guide page, and to show them (the deck page's Notes and Sources, the source viewer). Read from the
/// library next to the decks, so Deck stays as it is. Every field is optional: an older library has none of this.
/// One file kept with a source: its name on the server (it opens at /media/<name>), its type and size, what it was called, and for a recording how
/// long it is (a recording can be several files: a long one is cut into parts of at most ten minutes, and the microphone makes a file every ten).
struct SourceFile: Decodable, Equatable {
  var name = "", type = "", file = "", ext = ""
  var size = 0
  var seconds: Double = 0
  enum CodingKeys: String, CodingKey { case name, type, file, ext, size, seconds }
  init(name: String = "", type: String = "", file: String = "", ext: String = "", size: Int = 0, seconds: Double = 0) {
    self.name = name; self.type = type; self.file = file; self.ext = ext; self.size = size; self.seconds = seconds
  }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    name = c.v(.name, ""); type = c.v(.type, ""); file = c.v(.file, ""); ext = c.v(.ext, ""); size = c.v(.size, 0); seconds = c.v(.seconds, 0)
  }
}
/// A Source of a deck: what its cards were made from. `kind` is file, photo, recording, video, text or topic; `textName` is the kept text's file
/// (the words of a recording or a video, with the time of each part), `url` a video's address, `text` a topic's words.
struct MakeSourceInfo: Decodable, Equatable, Identifiable {
  var id = "", kind = "", name = ""
  var cards = 0, pages = 0
  var at: Double = 0, seconds: Double = 0
  var url = "", text = "", textName = ""
  var files: [SourceFile] = []
  enum CodingKeys: String, CodingKey { case id, kind, name, cards, pages, at, seconds, url, text, textFile, files }
  private enum TextKeys: String, CodingKey { case name }
  init(id: String = "", kind: String = "", name: String = "", cards: Int = 0, pages: Int = 0, at: Double = 0, seconds: Double = 0, url: String = "", text: String = "", textName: String = "", files: [SourceFile] = []) {
    self.id = id; self.kind = kind; self.name = name; self.cards = cards; self.pages = pages; self.at = at; self.seconds = seconds
    self.url = url; self.text = text; self.textName = textName; self.files = files
  }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); kind = c.v(.kind, ""); name = c.v(.name, ""); cards = c.v(.cards, 0); pages = c.v(.pages, 0)
    at = c.v(.at, 0); seconds = c.v(.seconds, 0); url = c.v(.url, ""); text = c.v(.text, ""); files = c.v(.files, [])
    textName = (try? c.nestedContainer(keyedBy: TextKeys.self, forKey: .textFile)).flatMap { $0.v(.name, "") } ?? ""
  }
}
/// A Guide's extra page (its own words, and when they were last saved); the Guide itself is `MakeGuide.text`.
struct MakeGuidePage: Decodable, Equatable, Identifiable {
  var id = "", title = "", text = ""
  var at: Double = 0
  enum CodingKeys: String, CodingKey { case id, title, text, at }
  init(id: String = "", title: String = "", text: String = "", at: Double = 0) { self.id = id; self.title = title; self.text = text; self.at = at }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); title = c.v(.title, ""); text = c.v(.text, ""); at = c.v(.at, 0) }
}
struct MakeGuide: Decodable, Equatable {
  var text = "", pages: [MakeGuidePage] = []
  var at: Double = 0
  enum CodingKeys: String, CodingKey { case text, pages, at }
  init() {}
  init(text: String, pages: [MakeGuidePage] = [], at: Double = 0) { self.text = text; self.pages = pages; self.at = at }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); text = c.v(.text, ""); pages = c.v(.pages, []); at = c.v(.at, 0) }
}
/// One file kept with a diagram (a picture): its name on the server (it opens at /media/<name>), its type, size and size in pixels, and what it was called.
struct DiagramFile: Decodable, Equatable {
  var name = "", type = "", file = ""
  var size = 0, w = 0, h = 0
  enum CodingKeys: String, CodingKey { case name, type, file, size, w, h }
  init(name: String = "", type: String = "", file: String = "", size: Int = 0, w: Int = 0, h: Int = 0) { self.name = name; self.type = type; self.file = file; self.size = size; self.w = w; self.h = h }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); name = c.v(.name, ""); type = c.v(.type, ""); file = c.v(.file, ""); size = c.v(.size, 0); w = c.v(.w, 0); h = c.v(.h, 0) }
}
/// What a table or a mind map was made from: all the cards and notes, one tag's cards, or one source's.
struct DiagramFrom: Decodable, Equatable {
  var kind = "all", value = "", label = ""
  enum CodingKeys: String, CodingKey { case kind, value, label }
  init(kind: String = "all", value: String = "", label: String = "") { self.kind = kind; self.value = value; self.label = label }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); kind = c.v(.kind, "all"); value = c.v(.value, ""); label = c.v(.label, "") }
}
struct DiagramTable: Decodable, Equatable {
  var columns: [String] = [], rows: [[String]] = []
  enum CodingKeys: String, CodingKey { case columns, rows }
  init(columns: [String] = [], rows: [[String]] = []) { self.columns = columns; self.rows = rows }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); columns = c.v(.columns, []); rows = c.v(.rows, []) }
}
/// A diagram of a deck (web/store.mjs deck.diagrams), as /api/state gives it: `kind` is lecture (a picture found in a file a make read: `src` says which source and
/// where), upload (a picture the person added), table or mindmap (made from the deck's cards; these two are shared with the deck). A picture has its `file` and its `labels`
/// (boxes over the words written in it, like a card's boxes; nil until an uploaded picture has been read). Every field is optional: an older library has none of this.
struct DiagramInfo: Decodable, Equatable, Identifiable {
  var id = "", kind = "", name = ""
  var at: Double = 0
  var file: DiagramFile?
  var src: CardSource?
  var labels: [OccBox]?
  var figure = ""
  var table: DiagramTable?
  var tree: DiagramNode?
  var from: DiagramFrom?
  var cards = 0
  var named = false
  var isPicture: Bool { file != nil }
  var isMade: Bool { kind == "table" || kind == "mindmap" }
  enum CodingKeys: String, CodingKey { case id, kind, name, at, file, src, labels, figure, table, tree, from, cards, named }
  init(id: String = "", kind: String = "", name: String = "", at: Double = 0, file: DiagramFile? = nil, src: CardSource? = nil, labels: [OccBox]? = nil, figure: String = "", table: DiagramTable? = nil,
       tree: DiagramNode? = nil, from: DiagramFrom? = nil, cards: Int = 0) {
    self.id = id; self.kind = kind; self.name = name; self.at = at; self.file = file; self.src = src; self.labels = labels; self.figure = figure; self.table = table; self.tree = tree; self.from = from; self.cards = cards
  }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); kind = c.v(.kind, ""); name = c.v(.name, ""); at = c.v(.at, 0); file = c.v(.file, nil); src = c.v(.src, nil); labels = c.v(.labels, nil)
    figure = c.v(.figure, ""); table = c.v(.table, nil); tree = c.v(.tree, nil); from = c.v(.from, nil); cards = c.v(.cards, 0); named = c.v(.named, false)
  }
}
struct DeckMaterials: Decodable, Equatable {
  var id = "", sources: [MakeSourceInfo] = [], guide: MakeGuide? = nil, diagrams: [DiagramInfo] = []
  enum CodingKeys: String, CodingKey { case id, sources, guide, diagrams }
  init() {}
  init(id: String, sources: [MakeSourceInfo] = [], guide: MakeGuide? = nil, diagrams: [DiagramInfo] = []) { self.id = id; self.sources = sources; self.guide = guide; self.diagrams = diagrams }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); sources = c.v(.sources, []); guide = c.v(.guide, nil); diagrams = c.v(.diagrams, []) }
}

/// Where a card came from (web/store.mjs card.src): the source's id and name, and where in it ("p. 4", "Slide 3", or a time like "12:40").
struct CardSource: Decodable, Equatable {
  var id = "", name = "", at = ""
  enum CodingKeys: String, CodingKey { case id, name, at }
  init(id: String = "", name: String = "", at: String = "") { self.id = id; self.name = name; self.at = at }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); name = c.v(.name, ""); at = c.v(.at, "") }
}
