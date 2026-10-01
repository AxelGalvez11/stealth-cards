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
  enum CodingKeys: String, CodingKey { case on, video, perDay, pages, minutes, photos, fileMB, audioMB, cards, guidePages }
  init() {}
  init(on: Bool, video: Bool, perDay: Int, pages: Int, minutes: Int, photos: Int, fileMB: Int, audioMB: Int = 25, cards: Int = 100, guidePages: Int = 10) {
    self.on = on; self.video = video; self.perDay = perDay; self.pages = pages; self.minutes = minutes; self.photos = photos; self.fileMB = fileMB; self.audioMB = audioMB; self.cards = cards
    self.guidePages = guidePages
  }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    on = c.v(.on, false); video = c.v(.video, false); perDay = c.v(.perDay, 3); pages = c.v(.pages, 30); minutes = c.v(.minutes, 15)
    photos = c.v(.photos, 10); fileMB = c.v(.fileMB, 20); audioMB = c.v(.audioMB, 25); cards = c.v(.cards, 100); guidePages = c.v(.guidePages, 10)
  }
  /// The canvas's Pro person (the design screens' limits), and its Free one.
  static let pro = MakeInfo(on: true, video: true, perDay: 30, pages: 300, minutes: 120, photos: 50, fileMB: 40)
  static let free = MakeInfo(on: true, video: true, perDay: 3, pages: 30, minutes: 15, photos: 10, fileMB: 20)
}

/// What a deck keeps of what it was made from, and of its Guide (web/store.mjs deck.sources and deck.guide): enough to start more cards
/// from a source, or from a Guide page. Read from the library next to the decks, so Deck stays as it is.
struct MakeSourceInfo: Decodable, Equatable {
  var id = "", kind = "", name = ""
  enum CodingKeys: String, CodingKey { case id, kind, name }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); kind = c.v(.kind, ""); name = c.v(.name, "") }
}
struct MakeGuidePage: Decodable, Equatable {
  var id = "", title = "", text = ""
  enum CodingKeys: String, CodingKey { case id, title, text }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); title = c.v(.title, ""); text = c.v(.text, "") }
}
struct MakeGuide: Decodable, Equatable {
  var text = "", pages: [MakeGuidePage] = []
  enum CodingKeys: String, CodingKey { case text, pages }
  init() {}
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); text = c.v(.text, ""); pages = c.v(.pages, []) }
}
struct DeckMaterials: Decodable, Equatable {
  var id = "", sources: [MakeSourceInfo] = [], guide: MakeGuide? = nil
  enum CodingKeys: String, CodingKey { case id, sources, guide }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); sources = c.v(.sources, []); guide = c.v(.guide, nil) }
}
