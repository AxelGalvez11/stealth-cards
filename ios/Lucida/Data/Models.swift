// Your library as the server keeps it (web/store.mjs): settings, decks, cards, and reviews. The app reads it whole from
// /api/state and changes it only through /api/action, like the web app.
import Foundation

extension KeyedDecodingContainer {
  /// A value, or `d` when it's missing, null, or the wrong type (older libraries lack newer fields).
  func v<T: Decodable>(_ key: Key, _ d: T) -> T { (try? decodeIfPresent(T.self, forKey: key)) ?? d }
}

struct Library: Decodable {
  var rev: Int
  var settings: UserSettings
  var ai: AIState
  var folders: [Folder]
  var decks: [Deck]
  var cards: [Card]
  var logs: [ReviewLog]
  var me: Me?
  /// The server has Lucida's own AI set up, so a card can be explained.
  var aiOn: Bool
  enum CodingKeys: String, CodingKey { case rev, settings, ai, folders, decks, cards, logs, me, aiOn }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    rev = c.v(.rev, 0); settings = c.v(.settings, UserSettings()); ai = c.v(.ai, AIState()); folders = c.v(.folders, [])
    decks = c.v(.decks, []); cards = c.v(.cards, []); logs = c.v(.logs, []); me = c.v(.me, nil); aiOn = c.v(.aiOn, false)
  }
  init(rev: Int = 0, settings: UserSettings = UserSettings(), ai: AIState = AIState(), folders: [Folder] = [], decks: [Deck] = [], cards: [Card] = [], logs: [ReviewLog] = [], me: Me? = nil, aiOn: Bool = false) {
    self.rev = rev; self.settings = settings; self.ai = ai; self.folders = folders; self.decks = decks; self.cards = cards; self.logs = logs; self.me = me; self.aiOn = aiOn
  }
}

/// A folder of decks in the Library (one level: no folders inside folders). A deck names its folder by id.
struct Folder: Decodable, Identifiable {
  var id: String, name: String, created: Double
  enum CodingKeys: String, CodingKey { case id, name, created }
  init(id: String, name: String, created: Double = 0) { self.id = id; self.name = name; self.created = created }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, UUID().uuidString); name = c.v(.name, "New folder"); created = c.v(.created, 0)
  }
}

struct Me: Decodable {
  var email = "", provider = "", name = ""
  /// Lucida Pro (the server hears it from Stripe, web/billing.mjs), and Stripe's page for changing or cancelling it.
  var plan = Plan(), manage = ""
  enum CodingKeys: String, CodingKey { case email, provider, name, plan, manage }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    email = c.v(.email, ""); provider = c.v(.provider, ""); name = c.v(.name, ""); plan = c.v(.plan, Plan()); manage = c.v(.manage, "")
  }
}

/// Free or Pro: monthly or yearly ("month"/"year"), until when (ISO date), and whether it's set to end then.
struct Plan: Decodable {
  var pro = false, every = "", until = "", ending = false
  enum CodingKeys: String, CodingKey { case pro, every, until, ending }
  init(pro: Bool = false, every: String = "", until: String = "", ending: Bool = false) { self.pro = pro; self.every = every; self.until = until; self.ending = ending }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    pro = c.v(.pro, false); every = c.v(.every, ""); until = c.v(.until, ""); ending = c.v(.ending, false)
  }
}

struct UserSettings: Decodable {
  var name = "", color = 0, look = "system", grads = "mix", prog = "bar", perDay = 20, goal = 90, grading = "four", fsrs = true, reminder = "9:00 AM"
  enum CodingKeys: String, CodingKey { case name, color, look, grads, prog, perDay, goal, grading, fsrs, reminder }
  init() {}
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    name = c.v(.name, ""); color = c.v(.color, 0); look = c.v(.look, "system"); grads = c.v(.grads, "mix"); prog = c.v(.prog, "bar")
    perDay = c.v(.perDay, 20); goal = c.v(.goal, 90); grading = c.v(.grading, "four"); fsrs = c.v(.fsrs, true); reminder = c.v(.reminder, "9:00 AM")
  }
}

struct AIState: Decodable {
  struct Perms: Decodable {
    var read = true, text = true, media = true, edit = true, check = false, del = false
    enum CodingKeys: String, CodingKey { case read, text, media, edit, check, del }
    init() {}
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      read = c.v(.read, true); text = c.v(.text, true); media = c.v(.media, true); edit = c.v(.edit, true); check = c.v(.check, false); del = c.v(.del, false)
    }
  }
  struct Client: Decodable {
    var name = ""; var version = ""; var seen: Double = 0
    enum CodingKeys: String, CodingKey { case name, version, seen }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); name = c.v(.name, ""); version = c.v(.version, ""); seen = c.v(.seen, 0) }
  }
  var perms = Perms()
  var clients: [String: Client] = [:]
  var key: String?
  enum CodingKeys: String, CodingKey { case perms, clients, key }
  init() {}
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    perms = c.v(.perms, Perms()); clients = c.v(.clients, [:]); key = c.v(.key, nil)
  }
}

struct Cover: Decodable {
  var style: String?; var round: Int = 0; var image: String?; var seed: String?
  enum CodingKeys: String, CodingKey { case style, round, image, seed }
  init(style: String? = "mix", round: Int = 0, image: String? = nil, seed: String? = nil) { self.style = style; self.round = round; self.image = image; self.seed = seed }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    style = c.v(.style, nil); round = c.v(.round, 0); image = c.v(.image, nil); seed = c.v(.seed, nil)
  }
}

struct Pile: Decodable {
  var name: String
  enum CodingKeys: String, CodingKey { case name }
  init(name: String) { self.name = name }
  init(from d: Decoder) throws { name = try d.container(keyedBy: CodingKeys.self).v(.name, "Pile") }
}

/// What Learn mode, flashcards, and Live show behind a deck: its own colors, faint ("deck", the default), a plain page
/// ("plain"), the sky, the sunset, or a photo (its own, or the deck's cover photo when it has none).
struct DeckBg: Decodable, Equatable {
  var kind = "deck"; var image: String?
  enum CodingKeys: String, CodingKey { case kind, image }
  init(kind: String = "deck", image: String? = nil) { self.kind = kind; self.image = image }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    kind = c.v(.kind, "deck"); image = c.v(.image, nil)
  }
}

struct Deck: Decodable, Identifiable {
  var id: String, name: String, tags: [String], created: Double
  var cover: Cover, paused: Bool, grading: String, fsrs: Bool, goal: Int, gapIdx: Int, steps: [String], perDay: Int, piles: [Pile]
  /// Its folder's id (nil: the Library itself), and its study background.
  var folder: String?, bg: DeckBg
  enum CodingKeys: String, CodingKey { case id, name, tags, created, cover, paused, grading, fsrs, goal, gapIdx, steps, perDay, piles, folder, bg }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, UUID().uuidString); name = c.v(.name, "Untitled deck"); tags = c.v(.tags, []); created = c.v(.created, 0)
    cover = c.v(.cover, Cover()); paused = c.v(.paused, false); grading = c.v(.grading, "four"); fsrs = c.v(.fsrs, true)
    goal = c.v(.goal, 90); gapIdx = c.v(.gapIdx, 3); steps = c.v(.steps, ["1m", "10m"]); perDay = c.v(.perDay, 20); piles = c.v(.piles, [])
    folder = c.v(.folder, nil); bg = c.v(.bg, DeckBg())
  }
}

/// A card's memory for FSRS (web/fsrs.js): new, learning, review, or relearning; `due` and `last` are milliseconds.
struct SRS: Decodable, Equatable {
  var state = "new"; var due: Double = 0; var s: Double = 0; var d: Double = 0; var reps = 0; var lapses = 0; var last: Double = 0; var step = 0; var days: Int?
  enum CodingKeys: String, CodingKey { case state, due, s, d, reps, lapses, last, step, days }
  init() {}
  init(from dec: Decoder) throws {
    let c = try dec.container(keyedBy: CodingKeys.self)
    state = c.v(.state, "new"); due = c.v(.due, 0); s = c.v(.s, 0); d = c.v(.d, 0); reps = c.v(.reps, 0); lapses = c.v(.lapses, 0)
    last = c.v(.last, 0); step = c.v(.step, 0); days = c.v(.days, nil)
  }
}

/// An AI's explanation of a card's answer, written once and kept on the card (by: who wrote it).
struct Explanation: Decodable {
  var text = "", by = ""
  enum CodingKeys: String, CodingKey { case text, by }
  init(text: String, by: String) { self.text = text; self.by = by }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); text = c.v(.text, ""); by = c.v(.by, "") }
}

/// A Learn mode question the learner's AI app wrote for a card (web/store.mjs card.quiz): a choice with its wrong answers,
/// or a true-or-false claim (answer "true" or "false"), each with why.
struct QuizQuestion: Decodable, Equatable {
  var kind = "choice", question = "", answer = "", wrong: [String] = [], why = ""
  enum CodingKeys: String, CodingKey { case kind, question, answer, wrong, why }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    kind = c.v(.kind, "choice"); question = c.v(.question, ""); wrong = c.v(.wrong, []); why = c.v(.why, "")
    // A true-or-false answer is "true" or "false" (a plain true or false counts too).
    answer = c.v(.answer, c.v(.answer, Bool?.none).map { $0 ? "true" : "false" } ?? "")
  }
}

/// Image occlusion (web/store.mjs cleanBoxes): a box over part of a picture, hiding what's under it (its label, the
/// answer). Place and size are fractions of the picture (0 to 1), so a box fits the picture at any size.
struct OccBox: Decodable, Equatable, Identifiable {
  var id: String, x: Double, y: Double, w: Double, h: Double, label: String
  enum CodingKeys: String, CodingKey { case id, x, y, w, h, label }
  init(id: String, x: Double, y: Double, w: Double, h: Double, label: String = "") { self.id = id; self.x = x; self.y = y; self.w = w; self.h = h; self.label = label }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, UUID().uuidString); x = c.v(.x, 0); y = c.v(.y, 0); w = c.v(.w, 0); h = c.v(.h, 0); label = c.v(.label, "")
  }
  /// As the server keeps it: four decimals, like the web editor saves them.
  var json: [String: Any] {
    let r = { (v: Double) in (v * 10000).rounded() / 10000 }
    return ["id": id, "x": r(x), "y": r(y), "w": r(w), "h": r(h), "label": label]
  }
}

/// A sound's shape (web/sound.js packWave): its length in seconds, and one letter per peak.
struct Wave: Decodable, Equatable {
  var d: Double, p: String
  enum CodingKeys: String, CodingKey { case d, p }
  init(d: Double, p: String) { self.d = d; self.p = p }
  init(from dec: Decoder) throws { let c = try dec.container(keyedBy: CodingKeys.self); d = c.v(.d, 0); p = c.v(.p, "") }
  var json: [String: Any] { ["d": d, "p": p] }
}

struct Card: Decodable, Identifiable {
  var id: String, deckId: String, kind: String
  var front = "", back = "", note = "", text = ""
  var tags: [String] = []
  var image: String?, audio: String?
  /// The sound's waveform, measured once and kept with the card.
  var wave: Wave?
  var speak = "", lang = "", auto = true, source = "you", pending = false
  var created: Double = 0
  var srs = SRS()
  var pile: String?
  var cloze: Int?
  var group: String?
  /// A picture with parts hidden: every box on it, which one this card asks, and whether the others stay hidden ("all")
  /// or show ("one").
  var boxes: [OccBox] = []
  var box: String?
  var occ = "one"
  /// Its AI explanation, and the Learn mode questions an AI app wrote for it.
  var explain: Explanation?
  var quiz: [QuizQuestion] = []
  enum CodingKeys: String, CodingKey { case id, deckId, kind, front, back, note, text, tags, image, audio, wave, speak, lang, auto, source, pending, created, srs, pile, cloze, group, boxes, box, occ, explain, quiz }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, UUID().uuidString); deckId = c.v(.deckId, ""); kind = c.v(.kind, "basic")
    front = c.v(.front, ""); back = c.v(.back, ""); note = c.v(.note, ""); text = c.v(.text, ""); tags = c.v(.tags, [])
    image = c.v(.image, nil); audio = c.v(.audio, nil); wave = c.v(.wave, nil); speak = c.v(.speak, ""); lang = c.v(.lang, ""); auto = c.v(.auto, true)
    source = c.v(.source, "you"); pending = c.v(.pending, false); created = c.v(.created, 0); srs = c.v(.srs, SRS())
    pile = c.v(.pile, nil); cloze = c.v(.cloze, nil); group = c.v(.group, nil)
    boxes = c.v(.boxes, []); box = c.v(.box, nil); occ = c.v(.occ, "one")
    explain = c.v(.explain, nil); quiz = c.v(.quiz, [])
  }
}

/// A picture with parts hidden (db.js occOf): the card asks box `n` (its `i`th); nil for every other card.
struct Occ {
  let boxes: [OccBox], i: Int, label: String, mode: String
  var n: Int { i + 1 }
  init?(_ c: Card) {
    guard c.kind == "image", let id = c.box, let i = c.boxes.firstIndex(where: { $0.id == id }) else { return nil }
    boxes = c.boxes; self.i = i; label = c.boxes[i].label.trimmingCharacters(in: .whitespacesAndNewlines); mode = c.occ == "all" ? "all" : "one"
  }
}

struct ReviewLog: Decodable, Identifiable {
  var id: String, cardId: String, deckId: String, at: Double
  var was: String?, rating: Int?, pile: String?
  enum CodingKeys: String, CodingKey { case id, cardId, deckId, at, was, rating, pile }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, UUID().uuidString); cardId = c.v(.cardId, ""); deckId = c.v(.deckId, ""); at = c.v(.at, 0)
    was = c.v(.was, nil); rating = c.v(.rating, nil); pile = c.v(.pile, nil)
  }
}
